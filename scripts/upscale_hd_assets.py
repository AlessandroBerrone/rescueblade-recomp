"""Builds the HD bitmap set used by the "Grafica: HD" mode.

Every extracted bitmap is upscaled 4x with Real-ESRGAN's compact general model
(realesr-general-x4v3, BSD-3-Clause, https://github.com/xinntao/Real-ESRGAN), run on
CPU through onnxruntime. The model is interpolated halfway between its denoising and
non-denoising weights, as Real-ESRGAN's own "denoise strength 0.5" does: full
denoising turns the sea and rock textures into flat paint, no denoising keeps the
original JPEG/dither noise.

Output: extracted/<game>/assets/bitmaps_hd/<same name>.webp, plus hd.json with the
scale of each file. Large images (backgrounds) are stored at 2x so that no side is
over 1024 px; the stage is 512x330, so 2x is already more than a 1080p screen shows.

Not run in CI. Needs: pip install numpy pillow onnx onnxruntime
Run from the repository root:  python scripts/upscale_hd_assets.py [--only rescueblade|bermuda]
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import pickle
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "hd-models"
RELEASE = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/"
MODELS = ("realesr-general-x4v3.pth", "realesr-general-wdn-x4v3.pth")
DENOISE_STRENGTH = 0.5
MAX_SIDE = 1024
WEBP_QUALITY = 90
TILE = 192  # input tile size; keeps memory flat on the 512x330 backgrounds
# Tiny bitmaps that the score blows up far beyond their size (the tornado's beach ball is
# 16x16 and reaches 128x100 on stage): run the model twice, for 16x.
TWO_PASSES = {"bermuda": {"3_342__TORNAD_4"}}


def fetch(name: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dst = CACHE / name
    if not dst.exists():
        print(f"downloading {name}")
        urllib.request.urlretrieve(RELEASE + name, dst)
    return dst


def load_pth(path: Path) -> dict[str, np.ndarray]:
    """Reads a PyTorch state dict without PyTorch (all tensors here are contiguous float32)."""
    z = zipfile.ZipFile(path)
    prefix = z.namelist()[0].split("/")[0]

    class Unpickler(pickle.Unpickler):
        def find_class(self, mod, name):
            if name == "_rebuild_tensor_v2":
                def rebuild(storage, offset, size, stride, *_):
                    n = int(np.prod(size)) if size else 1
                    return storage[offset : offset + n].reshape(size).copy()
                return rebuild
            if name == "OrderedDict":
                return collections.OrderedDict
            if mod.startswith("torch") and name.endswith("Storage"):
                return name
            return super().find_class(mod, name)

        def persistent_load(self, pid):
            key = pid[2]
            return np.frombuffer(z.read(f"{prefix}/data/{key}"), dtype=np.float32)

    sd = Unpickler(z.open(f"{prefix}/data.pkl")).load()
    return sd.get("params", sd)


def build_session():
    import onnx
    import onnxruntime as ort
    from onnx import TensorProto, helper, numpy_helper

    a, b = (load_pth(fetch(m)) for m in MODELS)
    sd = {k: DENOISE_STRENGTH * a[k] + (1 - DENOISE_STRENGTH) * b[k] for k in a}
    layers = sorted({int(k.split(".")[1]) for k in sd})
    nodes, inits, cur = [], [], "x"
    for i in layers:
        w = sd[f"body.{i}.weight"]
        if w.ndim == 4:  # 3x3 conv
            inits += [numpy_helper.from_array(w, f"w{i}"), numpy_helper.from_array(sd[f"body.{i}.bias"], f"b{i}")]
            nodes.append(helper.make_node("Conv", [cur, f"w{i}", f"b{i}"], [f"c{i}"], pads=[1, 1, 1, 1]))
            cur = f"c{i}"
        else:  # PReLU
            inits.append(numpy_helper.from_array(w.reshape(-1, 1, 1), f"p{i}"))
            nodes.append(helper.make_node("PRelu", [cur, f"p{i}"], [f"a{i}"]))
            cur = f"a{i}"
    nodes.append(helper.make_node("DepthToSpace", [cur], ["ps"], blocksize=4, mode="CRD"))
    inits.append(numpy_helper.from_array(np.array([1, 1, 4, 4], np.float32), "scales"))
    nodes.append(helper.make_node("Resize", ["x", "", "scales"], ["up"], mode="nearest"))
    nodes.append(helper.make_node("Add", ["ps", "up"], ["y"]))
    io = lambda n: helper.make_tensor_value_info(n, TensorProto.FLOAT, [1, 3, None, None])  # noqa: E731
    graph = helper.make_graph(nodes, "srvgg", [io("x")], [io("y")], inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    return ort.InferenceSession(model.SerializeToString(), providers=["CPUExecutionProvider"])


def upscale4(sess, rgb: np.ndarray) -> np.ndarray:
    """rgb: HxWx3 float32 in 0..1 -> 4Hx4Wx3, processed in overlapping tiles."""
    h, w, _ = rgb.shape
    pad = 8
    out = np.zeros((h * 4, w * 4, 3), np.float32)
    for y0 in range(0, h, TILE):
        for x0 in range(0, w, TILE):
            y1, x1 = min(h, y0 + TILE), min(w, x0 + TILE)
            ya, xa = max(0, y0 - pad), max(0, x0 - pad)
            yb, xb = min(h, y1 + pad), min(w, x1 + pad)
            tile = rgb[ya:yb, xa:xb].transpose(2, 0, 1)[None]
            res = sess.run(None, {"x": np.ascontiguousarray(tile)})[0][0].transpose(1, 2, 0)
            oy, ox = (y0 - ya) * 4, (x0 - xa) * 4
            out[y0 * 4 : y1 * 4, x0 * 4 : x1 * 4] = res[oy : oy + (y1 - y0) * 4, ox : ox + (x1 - x0) * 4]
    return np.clip(out, 0, 1)


def bleed_colour(img: Image.Image) -> np.ndarray:
    """Fills fully transparent pixels with nearby opaque colour, so the upscaler does not
    smear the (arbitrary, often black) hidden colour into the sprite's edges."""
    arr = np.asarray(img, np.float32) / 255
    rgb, a = arr[..., :3].copy(), arr[..., 3]
    known = a > 0.02
    if known.all() or not known.any():
        return rgb
    acc, wsum = rgb * known[..., None], known.astype(np.float32)
    for _ in range(12):
        if (wsum > 0).all():
            break
        p = np.pad(acc, ((1, 1), (1, 1), (0, 0)), mode="edge")
        q = np.pad(wsum, 1, mode="edge")
        nacc = sum(p[1 + dy : p.shape[0] - 1 + dy, 1 + dx : p.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        nw = sum(q[1 + dy : q.shape[0] - 1 + dy, 1 + dx : q.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        fill = (wsum == 0) & (nw > 0)
        acc[fill] = nacc[fill]
        wsum = np.where(fill, nw, wsum)
    filled = acc / np.maximum(wsum, 1e-6)[..., None]
    return np.where(known[..., None], rgb, filled)


def upscale_rgba(sess, img: Image.Image) -> Image.Image:
    alpha = np.asarray(img.getchannel("A"))
    rgb = upscale4(sess, bleed_colour(img))
    out = Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), "RGB")
    if alpha.min() < 255:
        a3 = np.repeat((alpha.astype(np.float32) / 255)[..., None], 3, axis=2)
        a_up = upscale4(sess, a3).mean(axis=2)
        out.putalpha(Image.fromarray((a_up * 255 + 0.5).astype(np.uint8), "L"))
    else:
        out.putalpha(255)
    return out


def process(sess, src: Path, dst: Path, two_passes: bool = False) -> int:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    scale = 4 if max(w, h) * 4 <= MAX_SIDE else 2
    if two_passes:
        out = upscale_rgba(sess, upscale_rgba(sess, img))
        scale = 16
    elif min(w, h) < 2:
        # Lines and single pixels: nothing for the model to work with.
        out = img.resize((w * scale, h * scale), Image.NEAREST)
    else:
        out = upscale_rgba(sess, img)
        if scale != 4:
            out = out.resize((w * scale, h * scale), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "WEBP", quality=WEBP_QUALITY, method=6, alpha_quality=100)
    return scale


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["rescueblade", "bermuda"])
    ap.add_argument("--files", nargs="*", help="redo only these bitmaps (file stems); keeps the rest of hd.json")
    args = ap.parse_args()
    sess = build_session()
    done: dict[str, tuple[Path, int]] = {}
    for game in ("rescueblade", "bermuda"):
        if args.only and game != args.only:
            continue
        assets = ROOT / "extracted" / game / "assets"
        index = {}
        files = sorted((assets / "bitmaps").glob("*.png"))
        if args.files:
            index = json.loads((assets / "hd.json").read_text())
            files = [f for f in files if f.stem in args.files]
        for n, src in enumerate(files, 1):
            dst = assets / "bitmaps_hd" / (src.stem + ".webp")
            digest = hashlib.sha1(src.read_bytes()).hexdigest()
            if digest in done:  # same bitmap in the other game: reuse the result
                prev, scale = done[digest]
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_bytes(prev.read_bytes())
            else:
                scale = process(sess, src, dst, src.stem in TWO_PASSES.get(game, set()))
                done[digest] = (dst, scale)
            index[f"bitmaps/{src.name}"] = {"file": f"bitmaps_hd/{dst.name}", "scale": scale}
            if n % 50 == 0:
                print(f"{game}: {n}/{len(files)}")
        (assets / "hd.json").write_text(json.dumps(index, indent=1, sort_keys=True) + "\n")
        print(f"{game}: {len(files)} bitmaps")


if __name__ == "__main__":
    main()
