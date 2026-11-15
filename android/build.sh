#!/usr/bin/env bash
# Build a signed, dependency-free Android WebView APK with plain SDK tools.
#
# No Gradle, no AndroidX, no external libraries. The script compiles one Java
# file, dexes it, links resources with aapt2, adds dist/assets as APK assets,
# aligns and signs the result. On CI it uses the SDK installed by setup-android;
# locally set ANDROID_HOME or let sdkmanager install the required packages.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AND="$ROOT/android"
WEB="$ROOT/dist/assets"
BUILD="$AND/build"
OUT="$ROOT/dist/apk"

APK_NAME="${APK_NAME:-HeadBall3.apk}"
MIN_SDK="${MIN_SDK:-21}"
TARGET_SDK="${TARGET_SDK:-35}"
PLATFORM="${ANDROID_PLATFORM:-android-35}"
[[ "$PLATFORM" == android-* ]] || PLATFORM="android-$PLATFORM"
BT_VERSION="${ANDROID_BUILD_TOOLS:-35.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-1.0.0}"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$AND/.sdk}}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 1
  fi
}

find_sdkmanager() {
  local candidates=(
    "$SDK/cmdline-tools/latest/bin/sdkmanager"
    "$SDK/cmdline-tools/bin/sdkmanager"
    "$SDK/tools/bin/sdkmanager"
  )
  local c
  for c in "${candidates[@]}"; do
    if [ -x "$c" ]; then printf '%s\n' "$c"; return 0; fi
  done
  if command -v sdkmanager >/dev/null 2>&1; then command -v sdkmanager; return 0; fi
  return 1
}

BT_DIR=""
AAPT2=""
D8=""
ZIPALIGN=""
APKSIGNER=""
ANDROID_JAR=""

resolve_tools() {
  if [ -n "${ANDROID_BUILD_TOOLS:-}" ] && [ -d "$SDK/build-tools/$ANDROID_BUILD_TOOLS" ]; then
    BT_DIR="$SDK/build-tools/$ANDROID_BUILD_TOOLS"
  elif [ -d "$SDK/build-tools" ]; then
    BT_DIR="$(find "$SDK/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1 || true)"
  fi
  [ -n "$BT_DIR" ] || return 1
  AAPT2="$BT_DIR/aapt2"
  D8="$BT_DIR/d8"
  ZIPALIGN="$BT_DIR/zipalign"
  APKSIGNER="$BT_DIR/apksigner"
  ANDROID_JAR="$SDK/platforms/$PLATFORM/android.jar"
  [ -x "$AAPT2" ] && [ -x "$D8" ] && [ -x "$ZIPALIGN" ] && [ -x "$APKSIGNER" ] && [ -f "$ANDROID_JAR" ]
}

need java
need javac
need keytool
need zip
need unzip

echo "== Head Ball 3 APK =="
echo "SDK:       $SDK"
echo "Platform:  $PLATFORM"
echo "Build tool:$BT_VERSION"
echo "minSdk:    $MIN_SDK   targetSdk: $TARGET_SDK"

if ! resolve_tools; then
  SDKM="$(find_sdkmanager || true)"
  if [ -z "$SDKM" ]; then
    cat >&2 <<'EOF'
Android SDK packages are missing and sdkmanager was not found.
Install Android command-line tools, then either:
  export ANDROID_HOME=/path/to/android/sdk
  npm run apk
or run this workflow, which provisions the SDK automatically.
EOF
    exit 1
  fi
  echo "Installing Android SDK packages with $SDKM..."
  mkdir -p "$SDK"
  yes | "$SDKM" --sdk_root="$SDK" --licenses >/dev/null 2>&1 || true
  "$SDKM" --sdk_root="$SDK" "platforms;$PLATFORM" "build-tools;$BT_VERSION" "platform-tools"
  if ! resolve_tools; then
    echo "SDK install finished, but required tools are still missing." >&2
    exit 1
  fi
fi

echo "Using build-tools: $BT_DIR"

if [ "${FORCE_WEB_BUILD:-0}" = "1" ] || \
   [ ! -f "$WEB/index.html" ] || [ ! -f "$WEB/game.js" ] || [ ! -f "$WEB/style.css" ]; then
  need npm
  echo "Building the web bundle..."
  (cd "$ROOT" && npm run build)
fi

rm -rf "$BUILD"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/compiled" "$BUILD/assets" "$BUILD/gen" "$OUT"
cp -R "$WEB/." "$BUILD/assets/"

echo "Compiling Java..."
JAVA_FILES=()
while IFS= read -r -d '' f; do JAVA_FILES+=("$f"); done < <(find "$AND/java" -name '*.java' -print0)
if [ "${#JAVA_FILES[@]}" -eq 0 ]; then echo "No Java sources found." >&2; exit 1; fi
if javac --help 2>&1 | grep -q -- '--release'; then
  javac --release 8 -Xlint:-options -classpath "$ANDROID_JAR" -d "$BUILD/classes" "${JAVA_FILES[@]}"
else
  javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -d "$BUILD/classes" "${JAVA_FILES[@]}"
fi

echo "Dexing..."
CLASS_FILES=()
while IFS= read -r -d '' f; do CLASS_FILES+=("$f"); done < <(find "$BUILD/classes" -name '*.class' -print0)
"$D8" --lib "$ANDROID_JAR" --min-api "$MIN_SDK" --output "$BUILD/dex" "${CLASS_FILES[@]}"
[ -f "$BUILD/dex/classes.dex" ] || { echo "d8 did not produce classes.dex" >&2; exit 1; }

echo "Linking resources + assets..."
"$AAPT2" compile --dir "$AND/res" -o "$BUILD/compiled"
FLATS=()
while IFS= read -r -d '' f; do FLATS+=("$f"); done < <(find "$BUILD/compiled" -name '*.flat' -print0)
if [ "${#FLATS[@]}" -eq 0 ]; then echo "aapt2 produced no compiled resources." >&2; exit 1; fi
RES_ARGS=()
for f in "${FLATS[@]}"; do RES_ARGS+=("-R" "$f"); done
"$AAPT2" link \
  -o "$BUILD/base.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$AND/AndroidManifest.xml" \
  -A "$BUILD/assets" \
  --java "$BUILD/gen" \
  --min-sdk-version "$MIN_SDK" \
  --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION_NAME" \
  --auto-add-overlay \
  "${RES_ARGS[@]}"

echo "Adding classes.dex..."
zip -q -j "$BUILD/base.apk" "$BUILD/dex/classes.dex"

KEYSTORE=""
if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  KEYSTORE="$BUILD/release.keystore"
  printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$KEYSTORE"
  echo "Using release keystore from ANDROID_KEYSTORE_BASE64."
elif [ -n "${ANDROID_KEYSTORE:-}" ]; then
  KEYSTORE="$ANDROID_KEYSTORE"
  echo "Using release keystore: $KEYSTORE"
else
  KEYSTORE="$BUILD/debug.keystore"
  echo "No release keystore supplied; generating an ephemeral debug key."
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" -storetype PKCS12 \
    -alias headball3 -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass headball3 -keypass headball3 \
    -dname "CN=Head Ball 3, OU=Games, O=Head Ball 3, L=Zilina, ST=Slovakia, C=SK" \
    >/dev/null 2>&1
fi
KEY_ALIAS="${ANDROID_KEY_ALIAS:-headball3}"
KEYSTORE_PASS="${ANDROID_KEYSTORE_PASSWORD:-headball3}"
KEY_PASS="${ANDROID_KEY_PASSWORD:-$KEYSTORE_PASS}"

echo "Aligning + signing..."
"$ZIPALIGN" -f -p 4 "$BUILD/base.apk" "$BUILD/aligned.apk"
"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$KEY_ALIAS" \
  --ks-pass "pass:$KEYSTORE_PASS" \
  --key-pass "pass:$KEY_PASS" \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --min-sdk-version "$MIN_SDK" \
  --out "$OUT/$APK_NAME" \
  "$BUILD/aligned.apk"

"$APKSIGNER" verify --verbose --min-sdk-version "$MIN_SDK" "$OUT/$APK_NAME"

echo "APK contents:"
unzip -l "$OUT/$APK_NAME" | grep -E 'assets/(index.html|game.js|style.css)|classes.dex|AndroidManifest.xml' || true
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT/$APK_NAME" | tee "$OUT/$APK_NAME.sha256"
fi
echo "Built: $OUT/$APK_NAME ($(wc -c < "$OUT/$APK_NAME") bytes)"
