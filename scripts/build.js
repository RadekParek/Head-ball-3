/* Zero-runtime-dependency build: concatenate the source modules in order,
 * minify with terser when available (fallback is a safe comment/indent strip),
 * then emit a self-contained assets folder for the Android WebView. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist', 'assets');

const FILES = [
  'core.js', 'data.js', 'audio.js', 'art.js',
  'match.js', 'ai.js', 'penalty.js',
  'ui.js', 'screens.js', 'app.js'
];

function safeStrip(code) {
  return code.split('\n').map(function (line) {
    const t = line.trim();
    if (!t) return '';
    if (t.indexOf('//') === 0 || t.indexOf('/*') === 0 || t.indexOf('*') === 0) return '';
    return t;
  }).filter(Boolean).join('\n');
}
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function main() {
  let bundle = FILES.map(function (f) {
    const p = path.join(SRC, 'js', f);
    if (!fs.existsSync(p)) throw new Error('Missing source module: ' + p);
    return '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(p, 'utf8');
  }).join('\n');

  let out, method;
  try {
    const terser = require('terser');
    const result = await terser.minify(bundle, {
      compress: { passes: 2, drop_console: true, drop_debugger: true },
      mangle: true,
      format: { comments: false }
    });
    if (!result.code) throw new Error('terser returned no code');
    out = result.code; method = 'terser';
  } catch (e) {
    out = safeStrip(bundle); method = 'safe-strip (terser unavailable: ' + e.message + ')';
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'game.js'), out, 'utf8');
  fs.writeFileSync(path.join(OUT, 'style.css'), minifyCss(fs.readFileSync(path.join(SRC, 'style.css'), 'utf8')), 'utf8');
  fs.writeFileSync(path.join(OUT, 'index.html'), fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), 'utf8');

  const sizes = fs.readdirSync(OUT).map(function (f) { return f + ': ' + fs.statSync(path.join(OUT, f)).size + ' B'; });
  console.log('Built with ' + method);
  console.log('Source: ' + Buffer.byteLength(bundle) + ' B  ->  game.js: ' + Buffer.byteLength(out) + ' B');
  console.log(sizes.join('\n'));
}
main().catch(function (e) { console.error(e); process.exit(1); });
