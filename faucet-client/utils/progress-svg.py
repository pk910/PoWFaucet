#!/usr/bin/env python3
"""
Builds static/images/progress.svg from static/images/progress.gif.

The svg draws every frame of the gif as one group, one path per color, and shows the frames
in turn with a css steps() animation at the gif's frame timing, so it is pixel for pixel the
gif. Inlined in the page it costs the browser less than the gif in chromium, and it is a
tenth of the gif's size on the wire.

The classes and keyframes carry a `pf-` prefix: the svg is inlined into the faucet page, which
may be embedded in a host page, and its css must not meet the host's.

    python3 faucet-client/utils/progress-svg.py

Needs Pillow (python3 -m pip install pillow).
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is needed: python3 -m pip install pillow")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
GIF = os.path.join(ROOT, "static", "images", "progress.gif")
SVG = os.path.join(ROOT, "static", "images", "progress.svg")


def frames_of(gif):
    """every frame as rgba pixels plus its delay in ms"""
    image = Image.open(gif)
    frames = []
    try:
        while True:
            delay = image.info.get("duration", 100)
            frames.append((image.convert("RGBA").copy(), delay))
            image.seek(image.tell() + 1)
    except EOFError:
        pass
    return frames


def paths_of(frame):
    """
    one path per color, drawn as rectangles: horizontal runs of a color, merged downwards
    while the row below has the same run (pixel art is blocks, so most runs merge)
    """
    width, height = frame.size
    pixels = frame.load()
    rects = {}      # color -> list of [x, y, w, h]
    open_rects = {} # color -> {(x, w): rect still growing at the row above}
    for y in range(height):
        row_open = {}
        x = 0
        while x < width:
            r, g, b, a = pixels[x, y]
            if a == 0:
                x += 1
                continue
            color = (r, g, b)
            start = x
            while x < width and pixels[x, y][3] != 0 and pixels[x, y][:3] == color:
                x += 1
            run = (start, x - start)
            above = open_rects.get(color, {}).get(run)
            if above and above[1] + above[3] == y:
                above[3] += 1
                rect = above
            else:
                rect = [start, y, x - start, 1]
                rects.setdefault(color, []).append(rect)
            row_open.setdefault(color, {})[run] = rect
        open_rects = row_open
    paths = []
    for color, color_rects in rects.items():
        d = "".join("M%d %dh%dv%dh-%dz" % (x, y, w, h, w) for x, y, w, h in color_rects)
        paths.append((color, d))
    return paths


def main():
    frames = frames_of(GIF)
    width, height = frames[0][0].size
    total = sum(delay for _, delay in frames)

    css = []
    groups = []
    at = 0
    for index, (frame, delay) in enumerate(frames):
        start = at / total * 100
        end = (at + delay) / total * 100
        at += delay
        name = "pf-frame-%d" % index
        if index == 0:
            keyframes = "0%%{opacity:1}%.4f%%{opacity:0}" % end
        else:
            keyframes = "0%%{opacity:0}%.4f%%{opacity:1}%.4f%%{opacity:0}" % (start, end)
        css.append(".%s{animation:%s %dms steps(1,end) infinite}@keyframes %s{%s}" % (name, name, total, name, keyframes))
        paths = "".join('<path fill="#%02x%02x%02x" d="%s"/>' % (color + (d,)) for color, d in paths_of(frame))
        groups.append('<g class="%s">%s</g>' % (name, paths))

    # no motion asked for: the first frame stays
    css.append("@media(prefers-reduced-motion:reduce){.pf-progress g{animation:none!important;opacity:0}.pf-progress .pf-frame-0{opacity:1}}")

    svg = ('<svg xmlns="http://www.w3.org/2000/svg" class="pf-progress" viewBox="0 0 %d %d" width="%d" height="%d" '
           'shape-rendering="crispEdges" role="img" aria-label="mining progress"><style>%s</style>%s</svg>\n'
           % (width, height, width, height, "".join(css), "".join(groups)))
    with open(SVG, "w") as out:
        out.write(svg)
    print("%s: %d frames, %d ms loop, %d bytes" % (os.path.relpath(SVG, ROOT), len(frames), total, len(svg)))


if __name__ == "__main__":
    main()
