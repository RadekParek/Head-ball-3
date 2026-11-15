#!/usr/bin/env python3
"""Generate the launcher icons with pure stdlib (no Pillow, no ImageMagick).

Draws the same big-headed hero as the game at 4x supersampling and downsamples
for clean anti-aliasing. Output is committed so CI needs no image tooling.
"""
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SS = 4


def write_png(path, w, h, rows):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for r, g, b, a in rows[y]:
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    out += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(out)


def hexrgb(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Canvas:
    def __init__(self, size):
        self.s = size
        self.n = size * SS
        self.buf = [[(0, 0, 0, 0)] * self.n for _ in range(self.n)]

    def paint(self, x0, y0, x1, y1, fn):
        n = self.n
        lo_x = max(0, int(x0 * SS)); hi_x = min(n, int(x1 * SS) + 1)
        lo_y = max(0, int(y0 * SS)); hi_y = min(n, int(y1 * SS) + 1)
        for py in range(lo_y, hi_y):
            row = self.buf[py]
            for px in range(lo_x, hi_x):
                col = fn((px + 0.5) / SS, (py + 0.5) / SS)
                if col is not None:
                    row[px] = (col[0], col[1], col[2], 255)

    def rect(self, x, y, w, h, color, radius=0):
        c = hexrgb(color)

        def fn(px, py):
            if px < x or px > x + w or py < y or py > y + h:
                return None
            if radius:
                cx = min(max(px, x + radius), x + w - radius)
                cy = min(max(py, y + radius), y + h - radius)
                if (px - cx) ** 2 + (py - cy) ** 2 > radius ** 2:
                    return None
            return c
        self.paint(x, y, x + w, y + h, fn)

    def gradient_rect(self, x, y, w, h, top, bottom, radius=0):
        a, b = hexrgb(top), hexrgb(bottom)

        def fn(px, py):
            if px < x or px > x + w or py < y or py > y + h:
                return None
            if radius:
                cx = min(max(px, x + radius), x + w - radius)
                cy = min(max(py, y + radius), y + h - radius)
                if (px - cx) ** 2 + (py - cy) ** 2 > radius ** 2:
                    return None
            return lerp(a, b, (py - y) / h)
        self.paint(x, y, x + w, y + h, fn)

    def circle(self, cx, cy, r, color):
        c = hexrgb(color)

        def fn(px, py):
            return c if (px - cx) ** 2 + (py - cy) ** 2 <= r * r else None
        self.paint(cx - r, cy - r, cx + r, cy + r, fn)

    def ellipse(self, cx, cy, rx, ry, color):
        c = hexrgb(color)

        def fn(px, py):
            return c if ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1 else None
        self.paint(cx - rx, cy - ry, cx + rx, cy + ry, fn)

    def ring(self, cx, cy, r, thick, color):
        c = hexrgb(color)

        def fn(px, py):
            d = math.hypot(px - cx, py - cy)
            return c if r - thick <= d <= r else None
        self.paint(cx - r, cy - r, cx + r, cy + r, fn)

    def poly(self, points, color):
        c = hexrgb(color)
        xs = [p[0] for p in points]; ys = [p[1] for p in points]

        def fn(px, py):
            inside = False
            j = len(points) - 1
            for i in range(len(points)):
                xi, yi = points[i]; xj, yj = points[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                    inside = not inside
                j = i
            return c if inside else None
        self.paint(min(xs), min(ys), max(xs), max(ys), fn)

    def stroke(self, points, width, color):
        c = hexrgb(color)
        xs = [p[0] for p in points]; ys = [p[1] for p in points]

        def fn(px, py):
            best = 1e9
            for i in range(len(points) - 1):
                x1, y1 = points[i]; x2, y2 = points[i + 1]
                dx, dy = x2 - x1, y2 - y1
                t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy + 1e-9)))
                best = min(best, math.hypot(px - x1 - t * dx, py - y1 - t * dy))
            return c if best <= width / 2 else None
        self.paint(min(xs) - width, min(ys) - width, max(xs) + width, max(ys) + width, fn)

    def downsample(self):
        s, n, ss = self.s, self.n, SS
        rows = []
        for y in range(s):
            row = []
            for x in range(s):
                sr = sg = sb = sa = 0
                for j in range(ss):
                    src = self.buf[y * ss + j]
                    for i in range(ss):
                        r, g, b, a = src[x * ss + i]
                        sr += r * a; sg += g * a; sb += b * a; sa += a
                if sa:
                    row.append((sr // sa, sg // sa, sb // sa, sa // (ss * ss)))
                else:
                    row.append((0, 0, 0, 0))
            rows.append(row)
        return rows


def draw(size):
    c = Canvas(size)
    S = float(size)
    c.gradient_rect(0, 0, S, S, '#17346a', '#08132c', S * 0.22)
    c.ring(S / 2, S / 2, S * 0.46, S * 0.028, '#ffce4b')
    # halo behind the hero
    c.circle(S * 0.43, S * 0.45, S * 0.315, '#1f6f7d')
    # jersey
    c.poly([(S * 0.31, S * 0.86), (S * 0.35, S * 0.66), (S * 0.51, S * 0.66),
            (S * 0.55, S * 0.86)], '#22c9a6')
    c.poly([(S * 0.38, S * 0.66), (S * 0.43, S * 0.72), (S * 0.48, S * 0.66)], '#f6f9ff')
    # ears + head
    c.ellipse(S * 0.185, S * 0.47, S * 0.045, S * 0.07, '#b9714a')
    c.ellipse(S * 0.675, S * 0.47, S * 0.045, S * 0.07, '#b9714a')
    c.circle(S * 0.43, S * 0.45, S * 0.255, '#101d38')
    c.circle(S * 0.43, S * 0.45, S * 0.235, '#df9665')
    # hair cap clipped to the upper part of the head
    c.ellipse(S * 0.43, S * 0.325, S * 0.245, S * 0.125, '#157a5c')
    c.rect(S * 0.185, S * 0.31, S * 0.49, S * 0.06, '#157a5c')
    # a few spikes
    for i in range(5):
        x = S * (0.24 + i * 0.095)
        c.poly([(x - S * 0.03, S * 0.31), (x, S * 0.235), (x + S * 0.03, S * 0.31)], '#157a5c')
    # eyes
    for ex in (S * 0.35, S * 0.51):
        c.ellipse(ex, S * 0.455, S * 0.052, S * 0.066, '#ffffff')
        c.circle(ex + S * 0.008, S * 0.462, S * 0.026, '#1b2a44')
        c.circle(ex - S * 0.002, S * 0.448, S * 0.009, '#ffffff')
    # nose + smile
    c.ellipse(S * 0.43, S * 0.515, S * 0.018, S * 0.026, '#c47a51')
    arc = []
    for i in range(13):
        a = math.pi + i * math.pi / 12
        arc.append((S * 0.43 + math.cos(a) * S * 0.09, S * 0.55 - math.sin(a) * S * 0.05))
    c.stroke(arc, S * 0.022, '#7c3b3b')
    # football
    bx, by, br = S * 0.755, S * 0.735, S * 0.175
    c.circle(bx, by, br + S * 0.012, '#101d38')
    c.circle(bx, by, br, '#f6f9ff')
    for i in range(5):
        a = i * 2 * math.pi / 5 - math.pi / 2
        px, py = bx + math.cos(a) * br * 0.55, by + math.sin(a) * br * 0.55
        pts = []
        for k in range(5):
            ang = a + k * 2 * math.pi / 5
            pts.append((px + math.cos(ang) * br * 0.2, py + math.sin(ang) * br * 0.2))
        c.poly(pts, '#1b2a44')
    c.circle(bx - br * 0.35, by - br * 0.4, br * 0.18, '#ffffff')
    # star
    sx, sy, sr = S * 0.79, S * 0.21, S * 0.105
    star = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = sr if i % 2 == 0 else sr * 0.45
        star.append((sx + math.cos(a) * rr, sy + math.sin(a) * rr))
    c.poly(star, '#ffce4b')
    return c.downsample()


def main():
    sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for name, size in sizes.items():
        rows = draw(size)
        folder = os.path.join(ROOT, 'android', 'res', 'mipmap-' + name)
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, 'ic_launcher.png')
        write_png(path, size, size, rows)
        print('wrote', os.path.relpath(path, ROOT), os.path.getsize(path), 'B')
    rows = draw(192)
    path = os.path.join(ROOT, 'docs', 'icon.png')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    write_png(path, 192, 192, rows)
    print('wrote', os.path.relpath(path, ROOT))


if __name__ == '__main__':
    main()
