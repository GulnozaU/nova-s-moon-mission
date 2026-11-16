#!/usr/bin/env python3
"""
Offline depth maps for public/art backgrounds.

Primary: Depth Anything V2 Small via Hugging Face transformers
  model: depth-anything/Depth-Anything-V2-Small-hf
  license: Apache-2.0 (see REFERENCES.md)

Fallback: geometric depth (vertical gradient + edge emphasis) when torch
is unavailable — still offline, no runtime AI.

Usage:
  .venv-depth/bin/python scripts/generate-depth-maps.py
  .venv-depth/bin/python scripts/generate-depth-maps.py --method geometric
  .venv-depth/bin/python scripts/generate-depth-maps.py --only greenhouse-interior.jpeg
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art"
OUT = ART / "depth"

BACKGROUNDS = [
    "lunar-surface-craters.jpeg",
    "crew-quarters-bunks.jpeg",
    "greenhouse-interior.jpeg",
    "science-lab-nova-notebook.jpeg",
]

# Apache-2.0 — Depth Anything V2 Small (HF transformers port)
DA_V2_SMALL = "depth-anything/Depth-Anything-V2-Small-hf"


def geometric_depth(img: Image.Image) -> Image.Image:
    """Heuristic depth when ML weights are not installed."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = rgb.shape
    # Near = bottom of frame (walkable floor), far = top (sky / back wall)
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    # Luminance: darker lines often closer silhouettes in this art
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    edges = np.asarray(
        img.convert("L").filter(ImageFilter.FIND_EDGES), dtype=np.float32
    ) / 255.0
    # Greenhouse-friendly: path is bright stones mid-bottom → slightly nearer
    depth = 0.55 * yy + 0.25 * (1.0 - lum) + 0.15 * edges
    # Soft center aisle nearer
    aisle = np.exp(-((xx - 0.5) ** 2) / 0.08) * (yy ** 1.2)
    depth = depth + 0.12 * aisle
    depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-6)
    # Invert so white = near (common for displacement: high = toward camera)
    depth = 1.0 - depth
    # Flip convention: white = near (bottom), black = far (top)
    depth = yy * 0.7 + (1.0 - lum) * 0.2 + aisle * 0.15
    depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-6)
    u8 = (depth * 255.0).astype(np.uint8)
    out = Image.fromarray(u8, mode="L")
    return out.filter(ImageFilter.GaussianBlur(radius=1.2))


def da_v2_depth(img: Image.Image):
    import torch
    from transformers import pipeline

    device = 0 if torch.cuda.is_available() else -1
    pipe = pipeline(
        task="depth-estimation",
        model=DA_V2_SMALL,
        device=device,
    )
    result = pipe(img.convert("RGB"))
    depth_img = result["depth"]
    if not isinstance(depth_img, Image.Image):
        arr = np.asarray(depth_img, dtype=np.float32)
        arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-6)
        depth_img = Image.fromarray((arr * 255).astype(np.uint8), mode="L")
    else:
        depth_img = depth_img.convert("L")
    # Resize to source
    depth_img = depth_img.resize(img.size, Image.Resampling.BILINEAR)
    return depth_img


def midas_depth(img: Image.Image):
    import torch
    from transformers import pipeline

    pipe = pipeline(
        task="depth-estimation",
        model="Intel/dpt-hybrid-midas",
        device=0 if torch.cuda.is_available() else -1,
    )
    result = pipe(img.convert("RGB"))
    depth_img = result["depth"].convert("L").resize(img.size, Image.Resampling.BILINEAR)
    return depth_img


def process(name: str, method: str) -> Path:
    src = ART / name
    if not src.exists():
        raise FileNotFoundError(src)
    img = Image.open(src)
    print(f"  {name} {img.size[0]}x{img.size[1]} method={method}")
    if method == "da-v2":
        depth = da_v2_depth(img)
    elif method == "midas":
        depth = midas_depth(img)
    else:
        depth = geometric_depth(img)
    OUT.mkdir(parents=True, exist_ok=True)
    stem = Path(name).stem
    out = OUT / f"{stem}-depth.png"
    depth.save(out)
    meta = OUT / f"{stem}-depth.json"
    meta.write_text(
        "{\n"
        f'  "source": "{name}",\n'
        f'  "width": {img.size[0]},\n'
        f'  "height": {img.size[1]},\n'
        f'  "method": "{method}",\n'
        f'  "model": "{DA_V2_SMALL if method == "da-v2" else ("Intel/dpt-hybrid-midas" if method == "midas" else "geometric-fallback")}",\n'
        f'  "output": "depth/{stem}-depth.png"\n'
        "}\n",
        encoding="utf-8",
    )
    print(f"  → {out.relative_to(ROOT)}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--method",
        choices=("da-v2", "midas", "geometric"),
        default="da-v2",
        help="Depth backend (default: Depth Anything V2 Small)",
    )
    ap.add_argument("--only", default="", help="Single filename in public/art")
    args = ap.parse_args()

    names = [args.only] if args.only else BACKGROUNDS
    method = args.method
    if method in ("da-v2", "midas"):
        try:
            import torch  # noqa: F401
            import transformers  # noqa: F401
        except ImportError:
            print(
                "torch/transformers missing — falling back to geometric.\n"
                "Install: .venv-depth/bin/pip install torch transformers",
                file=sys.stderr,
            )
            method = "geometric"

    for name in names:
        process(name, method)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
