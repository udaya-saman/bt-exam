#!/usr/bin/env python3
"""Compile crisp, transparent PNGs from the existing 10 consistent mascot masters.
These PNGs are the only character artwork referenced by the PWA.
SVG masters are retained only as editable development sources.
"""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MASCOT=ROOT/"images"/"mascot"

def render(source:Path,width:int):
    svg=source.read_bytes()
    png=cairosvg.svg2png(bytestring=svg,output_width=width)
    image=Image.open(BytesIO(png)).convert("RGBA")
    # Palette PNG preserves transparency while saving mobile bandwidth.
    palette=image.quantize(colors=240,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
    dest=source.with_suffix(".png")
    palette.save(dest,optimize=True,compress_level=9)
    check=Image.open(dest).convert("RGBA")
    assert check.getextrema()[-1][0] == 0, f"{dest}: background is not transparent"
    assert check.width >= 500, f"{dest}: asset resolution too low"
    print(f"{dest.relative_to(ROOT)} {check.width}×{check.height} · {dest.stat().st_size//1024} KB")
    return dest

for src in sorted(MASCOT.glob("pizza-*.svg")):
    render(src,640)

avatar=ROOT/"images"/"default-avatar.svg"
if avatar.is_file():
    raw=cairosvg.svg2png(bytestring=avatar.read_bytes(),output_width=192,output_height=192)
    image=Image.open(BytesIO(raw)).convert("RGBA")
    assert image.getextrema()[-1][0] == 0
    image.save(avatar.with_suffix(".png"),optimize=True)
    print("images/default-avatar.png")
