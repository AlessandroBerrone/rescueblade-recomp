import json
import re
import struct
import wave
from io import BytesIO
from pathlib import Path
from PIL import Image


def mac_system_palette():
    levels = [255, 204, 153, 102, 51, 0]
    pal = []
    for r in levels:
        for g in levels:
            for b in levels:
                pal.append((r, g, b))
    ramp = [238, 221, 187, 170, 136, 119, 85, 68, 34, 17]
    for v in ramp:
        pal.append((v, 0, 0))
    for v in ramp:
        pal.append((0, v, 0))
    for v in ramp:
        pal.append((0, 0, v))
    for v in ramp:
        pal.append((v, v, v))
    pal[255] = (0, 0, 0)
    return pal


MAC_PALETTE = mac_system_palette()


def safe_filename(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s.strip())
    return s.strip("_") or "unnamed"


def unpack_packbits(buf: bytes, expected_len: int) -> bytes:
    out = bytearray()
    i = 0
    n = len(buf)
    while i < n and len(out) < expected_len:
        b = buf[i]
        i += 1
        if b < 128:
            cnt = b + 1
            out.extend(buf[i : i + cnt])
            i += cnt
        elif b > 128:
            cnt = 257 - b
            if i < n:
                out.extend(bytes([buf[i]]) * cnt)
                i += 1
    if len(out) < expected_len:
        out.extend(b"\x00" * (expected_len - len(out)))
    return bytes(out[:expected_len])


def parse_rifx(path: Path):
    data = path.read_bytes()
    magic = data[0:4]
    assert magic == b"XFIR", f"Expected XFIR, got {magic!r}"
    mmap_offset = struct.unpack("<I", data[24:28])[0]
    assert data[mmap_offset : mmap_offset + 4] == b"pamm"
    mmap_len = struct.unpack("<I", data[mmap_offset + 4 : mmap_offset + 8])[0]
    mmap = data[mmap_offset + 8 : mmap_offset + 8 + mmap_len]
    hdr_size, entry_size, max_res, used_res = struct.unpack("<HHII", mmap[:12])
    chunks = {}
    by_tag = {}
    for i in range(used_res):
        off = hdr_size + i * entry_size
        tag = mmap[off : off + 4][::-1].decode("latin1", "replace")
        csize, coff = struct.unpack("<II", mmap[off + 4 : off + 12])
        if tag != "free":
            payload = data[coff + 8 : coff + 8 + csize]
            chunks[i] = (tag, payload)
            by_tag.setdefault(tag, []).append((i, payload))
    return chunks, by_tag


def parse_mcsl(buf: bytes):
    count = struct.unpack(">I", buf[4:8])[0]
    items_per = struct.unpack(">H", buf[8:10])[0]
    num_offs = count * items_per + 1
    tbl_start = 18
    offs = struct.unpack(">" + "I" * num_offs, buf[tbl_start : tbl_start + num_offs * 4])
    base = tbl_start + num_offs * 4
    casts = []
    for c in range(count):
        idx = c * items_per
        name_raw = buf[base + offs[idx] : base + offs[idx + 1]]
        name = name_raw[1 : 1 + name_raw[0]].decode("latin1", "replace") if name_raw else ""
        file_raw = buf[base + offs[idx + 1] : base + offs[idx + 2]]
        filepath = file_raw[1 : 1 + file_raw[0]].decode("latin1", "replace") if file_raw else ""
        meta = buf[base + offs[idx + 3] : base + offs[idx + 4]]
        min_mem, max_mem, cast_id = struct.unpack(">HHI", meta[:8]) if len(meta) >= 8 else (1, 0, 0)
        casts.append({
            "castLib": c + 1,
            "name": name,
            "filePath": filepath,
            "minMember": min_mem,
            "maxMember": max_mem,
            "id": cast_id,
        })
    return casts


def parse_key_table(buf: bytes):
    esize, esize2, ecount, ucount = struct.unpack("<HHII", buf[:12])
    key_map = {}
    for j in range(ucount):
        sec_id, cast_id, fourcc = struct.unpack("<II4s", buf[12 + j * 12 : 24 + j * 12])
        fourcc_s = fourcc[::-1].decode("latin1", "replace")
        key_map.setdefault(cast_id, {})[fourcc_s] = sec_id
    return key_map


def parse_cast_member(buf: bytes):
    ctype, info_len, spec_len = struct.unpack(">III", buf[:12])
    info_raw = buf[12 : 12 + info_len]
    spec_raw = buf[12 + info_len : 12 + info_len + spec_len]
    info = {}
    if len(info_raw) >= 20:
        data_off, u1, u2, flags, script_id = struct.unpack(">IIIII", info_raw[:20])
        info["flags"] = flags
        info["scriptId"] = script_id
        if data_off < len(info_raw):
            cnt = struct.unpack(">H", info_raw[data_off : data_off + 2])[0]
            offs_start = data_off + 2
            if offs_start + (cnt + 1) * 4 <= len(info_raw):
                offs = struct.unpack(">" + "I" * (cnt + 1), info_raw[offs_start : offs_start + (cnt + 1) * 4])
                items_base = offs_start + (cnt + 1) * 4
                src = info_raw[items_base + offs[0] : items_base + offs[1]] if cnt > 0 else b""
                nm = info_raw[items_base + offs[1] : items_base + offs[2]] if cnt > 1 else b""
                info["scriptSrcText"] = src.decode("latin1", "replace") if src else ""
                if nm:
                    info["name"] = nm[1 : 1 + nm[0]].decode("latin1", "replace")
                else:
                    info["name"] = ""
    return ctype, info, spec_raw


def parse_vwlb(buf: bytes):
    cnt = struct.unpack(">H", buf[:2])[0]
    pairs = []
    pos = 2
    for _ in range(cnt):
        fr, soff = struct.unpack(">HH", buf[pos : pos + 4])
        pairs.append((fr, soff))
        pos += 4
    str_base = pos + 4
    str_data = buf[str_base:]
    labels = []
    for idx, (fr, soff) in enumerate(pairs):
        eoff = pairs[idx + 1][1] if idx + 1 < len(pairs) else len(str_data)
        labels.append({"frame": fr, "label": str_data[soff:eoff].decode("latin1", "replace")})
    return labels



def parse_lingo_proplist(raw: str):
    s = raw.strip()
    if not (s.startswith("[") and s.endswith("]")):
        return {"raw": raw}
    inner = s[1:-1].strip()
    if not inner or inner == ":":
        return {}
    # Split top-level commas (outside parens and quotes)
    parts = []
    depth = 0
    in_str = False
    cur = []
    for ch in inner:
        if ch == '"':
            in_str = not in_str
        elif not in_str:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == "," and depth == 0:
                parts.append("".join(cur).strip())
                cur = []
                continue
        cur.append(ch)
    if cur:
        parts.append("".join(cur).strip())

    out = {}
    for p in parts:
        if ":" not in p:
            continue
        k, v = p.split(":", 1)
        key = k.strip().lstrip("#")
        val = v.strip()
        if val.startswith('"') and val.endswith('"'):
            out[key] = val[1:-1]
        elif val.startswith("#"):
            out[key] = val[1:]
        elif val.startswith("point(") and val.endswith(")"):
            coords = [float(x.strip()) for x in val[6:-1].split(",")]
            out[key] = [int(c) if c.is_integer() else c for c in coords]
        elif val.startswith("(member ") and val.endswith(")"):
            m = re.match(r"\(member\s+(\d+)\s+of\s+castLib\s+(\d+)\)", val)
            if m:
                out[key] = {"castLib": int(m.group(2)), "member": int(m.group(1))}
            else:
                out[key] = val
        else:
            try:
                f = float(val)
                out[key] = int(val) if re.fullmatch(r"-?\d+", val) else f
            except ValueError:
                out[key] = val
    return out


def parse_vwsc(buf: bytes):
    total_len, hdr_type, hdr_sz, n1, n2, data_sz = struct.unpack(">IiIIII", buf[:24])
    offs = struct.unpack(">" + "I" * n2, buf[24 : 24 + n2 * 4])
    data_base = 24 + n2 * 4

    def get_entry(idx):
        if idx < 0 or idx >= n1:
            return b""
        s, e = offs[idx], offs[idx + 1]
        return buf[data_base + s : data_base + e] if e > s else b""

    e1 = get_entry(1)
    primary_indices = sorted(
        struct.unpack(">I", e1[k : k + 4])[0] for k in range(0, len(e1), 4)
    )
    next_primary_map = {
        p: (primary_indices[i + 1] if i + 1 < len(primary_indices) else n1)
        for i, p in enumerate(primary_indices)
    }

    def get_behaviors_for_interval(p_idx):
        if p_idx == 0:
            return []
        end_idx = next_primary_map.get(p_idx, p_idx + 16)
        behaviors = []
        k = p_idx + 1
        while k < end_idx:
            ent = get_entry(k)
            # A behavior entry is a list of 8-byte records (castLib, member,
            # params index): sprites with several behaviors attached carry
            # 16/24/... byte entries, so walk every record, not just len == 8.
            for r in range(0, len(ent) - len(ent) % 8, 8):
                clib, mem, pidx = struct.unpack(">HHI", ent[r : r + 8])
                if clib > 0 and mem > 0:
                    b_obj = {"castLib": clib, "member": mem}
                    if 0 < pidx < n1:
                        raw_p = get_entry(pidx).rstrip(b"\x00").decode("latin1", "replace")
                        if raw_p:
                            b_obj["params"] = parse_lingo_proplist(raw_p)
                    behaviors.append(b_obj)
            k += 1
        return behaviors

    fchunk = get_entry(0)
    actual_sz, hdr_sz2, frame_count, ftype, sprite_sz, num_ch = struct.unpack(">IIIHHH", fchunk[:18])
    pos = hdr_sz2
    max_ch = max(num_ch, 1024)
    cbuf = bytearray(max_ch * sprite_sz)
    frames = []

    for fr in range(1, frame_count + 1):
        fl = struct.unpack(">H", fchunk[pos : pos + 2])[0]
        end = pos + fl
        pos += 2
        while pos < end:
            clen, coff = struct.unpack(">HH", fchunk[pos : pos + 4])
            pos += 4
            if coff + clen > len(cbuf):
                cbuf.extend(b"\x00" * (coff + clen - len(cbuf)))
            cbuf[coff : coff + clen] = fchunk[pos : pos + clen]
            pos += clen

        ch0 = cbuf[0:sprite_sz]
        frame_script = None
        if any(ch0):
            clib, mem, p_idx = struct.unpack(">HHI", ch0[0:8])
            if clib > 0 and mem > 0:
                frame_script = {"castLib": clib, "member": mem, "intervalIdx": p_idx}

        sprites = []
        for ch in range(6, max_ch):
            sd = cbuf[ch * sprite_sz : (ch + 1) * sprite_sz]
            if not any(sd):
                continue
            sprite_type = sd[0]
            ink_raw = sd[1]
            fore_color = sd[2]
            back_color = sd[3]
            cast_lib, cast_mem, interval_idx = struct.unpack(">HHI", sd[4:12])
            if sprite_type == 0 and cast_lib == 0 and cast_mem == 0:
                continue
            loc_v, loc_h, height, width = struct.unpack(">hhhh", sd[12:20])
            # D7 sprite channel: 20 colorcode, 21 blend (inverted: 0 = 100%),
            # 22 thickness/flags, 24..27 fore/back RGB extras,
            # 28..31 rotation and 32..35 skew, both in hundredths of a degree.
            blend_byte = sd[21]
            color_code = sd[20]
            rot_raw, skew_raw = struct.unpack(">ii", sd[28:36])
            sprite = {
                "spriteNum": ch - 5,
                "spriteType": sprite_type,
                "ink": ink_raw & 0x3F,
                "inkRaw": ink_raw,
                "trails": bool(ink_raw & 0x40),
                "stretch": bool(ink_raw & 0x80),
                "foreColor": fore_color,
                "backColor": back_color,
                "castLib": cast_lib,
                "member": cast_mem,
                "locH": loc_h,
                "locV": loc_v,
                "width": width,
                "height": height,
                "blendByte": blend_byte,
                "blend": round((255 - blend_byte) * 100 / 255) if blend_byte else 100,
                "rotation": rot_raw / 100,
                "skew": skew_raw / 100,
                "intervalIdx": interval_idx,
                "behaviors": get_behaviors_for_interval(interval_idx),
            }
            # Colour code bit 0x20: the back colour is an RGB value, with red in the
            # palette-index byte and green/blue in bytes 26..27. Background Transparent
            # ink keys out this colour (e.g. the magenta behind the submarine warheads).
            if color_code & 0x20:
                sprite["backColorRGB"] = [back_color, sd[26], sd[27]]
            if color_code & 0x10:
                sprite["foreColorRGB"] = [fore_color, sd[24], sd[25]]
            sprites.append(sprite)

        frames.append({
            "frame": fr,
            "frameScript": frame_script,
            "sprites": sprites,
        })

    return frame_count, frames



def decode_bitmap(spec_raw: bytes, edim_bytes, bitd_bytes, alfa_bytes):
    bpr_raw, top, left, bottom, right = struct.unpack(">Hhhhh", spec_raw[:10])
    reg_y, reg_x = struct.unpack(">hh", spec_raw[18:22])
    flags = spec_raw[22] if len(spec_raw) > 22 else 0
    bpp = spec_raw[23] if len(spec_raw) > 23 else 32
    palette_id = struct.unpack(">i", spec_raw[24:28])[0] if len(spec_raw) >= 28 else 0
    w = right - left
    h = bottom - top
    meta = {
        "width": w,
        "height": h,
        "rect": [left, top, right, bottom],
        "regPoint": [reg_x - left, reg_y - top],
        "regPointRaw": [reg_x, reg_y],
        "bpp": bpp,
        "flags": flags,
        "paletteId": palette_id,
    }
    if w <= 0 or h <= 0:
        return None, meta

    img = None
    if edim_bytes is not None:
        img = Image.open(BytesIO(edim_bytes)).convert("RGBA")
        if img.size != (w, h):
            meta["edimSize"] = list(img.size)
            w, h = img.size
    elif bitd_bytes is not None:
        bpr = bpr_raw & 0x0FFF
        expected = bpr * h
        uncompressed = len(bitd_bytes) == expected
        raw = bitd_bytes if uncompressed else unpack_packbits(bitd_bytes, expected)
        if bpp == 32 and uncompressed:
            # Uncompressed 32-bit BITD is stored pixel by pixel as A,R,G,B, not as the
            # per-row channel planes that PackBits-compressed bitmaps use. Reading it as
            # planes turned small sprites (survivors, warheads) into coloured noise.
            rgba = bytearray(w * h * 4)
            for y in range(h):
                ro = y * bpr
                for x in range(w):
                    si = ro + x * 4
                    oi = (y * w + x) * 4
                    rgba[oi : oi + 3] = raw[si + 1 : si + 4]
                    rgba[oi + 3] = 255
            img = Image.frombytes("RGBA", (w, h), bytes(rgba))
        elif bpp == 32:
            plane_w = bpr // 4
            rgba = bytearray(w * h * 4)
            for y in range(h):
                ro = y * bpr
                pr = raw[ro + plane_w : ro + 2 * plane_w]
                pg = raw[ro + 2 * plane_w : ro + 3 * plane_w]
                pb = raw[ro + 3 * plane_w : ro + 4 * plane_w]
                for x in range(w):
                    oi = (y * w + x) * 4
                    rgba[oi] = pr[x] if x < len(pr) else 0
                    rgba[oi + 1] = pg[x] if x < len(pg) else 0
                    rgba[oi + 2] = pb[x] if x < len(pb) else 0
                    rgba[oi + 3] = 255
            img = Image.frombytes("RGBA", (w, h), bytes(rgba))
        elif bpp == 8:
            rgba = bytearray(w * h * 4)
            is_gray = (palette_id == -2)
            for y in range(h):
                ro = y * bpr
                for x in range(w):
                    idx = raw[ro + x]
                    if is_gray:
                        v = 255 - idx
                        r, g, b = v, v, v
                    else:
                        r, g, b = MAC_PALETTE[idx]
                    oi = (y * w + x) * 4
                    rgba[oi] = r
                    rgba[oi + 1] = g
                    rgba[oi + 2] = b
                    rgba[oi + 3] = 255
            img = Image.frombytes("RGBA", (w, h), bytes(rgba))
        else:
            raise ValueError(f"Unsupported BITD bpp={bpp}")

    if img is not None and alfa_bytes is not None:
        # ALFA rows are padded to an even number of bytes (like BITD rows):
        # for odd widths, reading them as w*h shifts every row by one pixel.
        alpha_stride = w + (w & 1)
        alpha_plane = unpack_packbits(alfa_bytes, alpha_stride * h)
        if alpha_stride != w:
            alpha_plane = b"".join(
                alpha_plane[y * alpha_stride : y * alpha_stride + w] for y in range(h)
            )
        alpha_img = Image.frombytes("L", (w, h), alpha_plane)
        r, g, b, _ = img.split()
        img = Image.merge("RGBA", (r, g, b, alpha_img))
        meta["hasAlpha"] = True
    else:
        meta["hasAlpha"] = False

    return img, meta



def decode_snd_to_wav(snd_bytes: bytes, out_path: Path):
    fmt = struct.unpack(">H", snd_bytes[:2])[0]
    if fmt == 1:
        num_mods = struct.unpack(">H", snd_bytes[2:4])[0]
        cmd_off = 4 + num_mods * 6
        num_cmds = struct.unpack(">H", snd_bytes[cmd_off : cmd_off + 2])[0]
        pos = cmd_off + 2
    elif fmt == 2:
        num_cmds = struct.unpack(">H", snd_bytes[4:6])[0]
        pos = 6
    else:
        raise ValueError(f"Unsupported snd fmt={fmt}")

    hdr_off = None
    for _ in range(num_cmds):
        cmd, p1, p2 = struct.unpack(">HHI", snd_bytes[pos : pos + 8])
        pos += 8
        if (cmd & 0x7FFF) in (0x50, 0x51):
            hdr_off = p2
            break
    if hdr_off is None:
        raise ValueError("No soundCmd/bufferCmd in snd chunk")

    enc = snd_bytes[hdr_off + 20]
    if enc == 0x00:
        length, sr_raw, loop_s, loop_e = struct.unpack(">IIII", snd_bytes[hdr_off + 4 : hdr_off + 20])
        sr = sr_raw >> 16
        channels = 1
        sample_size = 8
        pcm = snd_bytes[hdr_off + 22 : hdr_off + 22 + length]
    elif enc == 0xFF:
        channels = struct.unpack(">I", snd_bytes[hdr_off + 4 : hdr_off + 8])[0]
        sr_raw, loop_s, loop_e = struct.unpack(">III", snd_bytes[hdr_off + 8 : hdr_off + 20])
        sr = sr_raw >> 16
        num_frames = struct.unpack(">I", snd_bytes[hdr_off + 22 : hdr_off + 26])[0]
        sample_size = struct.unpack(">H", snd_bytes[hdr_off + 48 : hdr_off + 50])[0]
        data_start = hdr_off + 64
        byte_len = num_frames * channels * (sample_size // 8)
        raw_pcm = snd_bytes[data_start : data_start + byte_len]
        if sample_size == 16:
            arr = struct.unpack(f">{num_frames * channels}h", raw_pcm)
            pcm = struct.pack(f"<{num_frames * channels}h", *arr)
        else:
            pcm = raw_pcm
    else:
        raise ValueError(f"Unsupported snd encoding 0x{enc:02x}")

    try:
        with wave.open(str(out_path), "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(sample_size // 8)
            wf.setframerate(sr)
            wf.writeframes(pcm)
    except PermissionError:
        if not out_path.exists():
            raise

    nframes = len(pcm) // (channels * (sample_size // 8))
    return {
        "sampleRate": sr,
        "channels": channels,
        "sampleSize": sample_size,
        "numFrames": nframes,
        "loopStart": loop_s,
        "loopEnd": loop_e,
        "durationSec": round(nframes / sr, 4) if sr else 0,
    }


def decode_xmed_text(xmed_bytes: bytes):
    if xmed_bytes.startswith(b"PFR1"):
        return {"kind": "pfr1_font", "bytes": len(xmed_bytes), "raw": xmed_bytes}
    if xmed_bytes.startswith(b"\x00\x00\x03\xeb"):
        return {"kind": "xmed_font_or_style", "bytes": len(xmed_bytes), "rawHex": xmed_bytes[:128].hex()}
    if not xmed_bytes.startswith(b"FFFF00000006"):
        return {"kind": "unknown_xmed", "bytes": len(xmed_bytes), "head": xmed_bytes[:32].hex()}

    idx = xmed_bytes.find(b"\x030002")
    if idx == -1:
        return {"kind": "text_empty", "text": ""}
    after = xmed_bytes[idx + 22 :].lstrip(b"\x00")
    comma = after.find(b",")
    if comma == -1:
        return {"kind": "text_unparsed", "raw": after[:64].hex()}
    tlen = int(after[:comma].decode("ascii"), 16)
    text_raw = after[comma + 1 : comma + 1 + tlen]
    text = text_raw.decode("latin1", "replace").replace("\r", "\n")
    return {"kind": "text", "text": text}



_XMED_HEX = b"0123456789ABCDEF-"


def _xmed_sections(b: bytes) -> dict:
    """XMED sections: \x03 + 4 hex id + 8 hex byte length + 8 hex record count."""
    out = {}
    for m in re.finditer(rb"\x03([0-9A-F]{4})([0-9A-F]{8})([0-9A-F]{8})", b):
        ln = int(m.group(2), 16)
        out.setdefault(m.group(1).decode(), (int(m.group(3), 16), b[m.end() : m.end() + ln]))
    return out


def _xmed_fields(body: bytes) -> list:
    """Flattens a record section into fields. Tokens: \x01/\x02 + hex = a value,
    \x81/\x82 = same as the previous field, \xc1/\xc2 n = n fields unchanged from the
    previous record."""
    out, i = [], 0
    while i < len(body):
        c = body[i]
        if c in (1, 2):
            j = i + 1
            while j < len(body) and body[j] in _XMED_HEX:
                j += 1
            txt = body[i + 1 : j].decode()
            v = int(txt, 16) if txt and txt != "-" else 0
            if v >= 0x80000000:
                v -= 1 << 32
            out.append(("v", v))
            i = j
        elif c in (0x81, 0x82):
            out.append(("prev",))
            i += 1
        elif c in (0xC1, 0xC2) and i + 1 < len(body):
            out += [("keep",)] * body[i + 1]
            i += 2
        else:
            i += 1
    return out


def _xmed_records(body: bytes, count: int, width: int, prelude: int = 0) -> list:
    fields = _xmed_fields(body)[prelude:]
    prev, recs = [0] * width, []
    for r in range(count):
        rec = list(prev)
        for f in range(width):
            k = r * width + f
            if k >= len(fields):
                break
            t = fields[k]
            if t[0] == "v":
                rec[f] = t[1]
            elif t[0] == "prev":
                rec[f] = rec[f - 1] if f else prev[-1]
        recs.append(rec)
        prev = rec
    return recs


def _xmed_pairs(body: bytes) -> list:
    vals = []
    for t in _xmed_fields(body):
        if t[0] == "v":
            vals.append(t[1])
        elif t[0] == "prev":
            vals.append(vals[-1] if vals else 0)
        else:
            vals.append(vals[-2] if len(vals) >= 2 else 0)
    return list(zip(vals[0::2], vals[1::2]))


_XMED_ALIGN = {0: "left", 1: "center", 2: "right", 3: "justify"}


def decode_xmed_styles(xmed_bytes: bytes):
    """Character and paragraph styles of a Director text member.

    0004: (char offset, style) runs; 0006: char styles, 77 fields each after a 1-field
    prelude (0 font index into 0008, 3 ascent, 4 descent, 9-11 16-bit RGB, 18 size in
    16.16); 0005: (char offset, paragraph) runs; 0007: paragraphs, 54 fields each
    (0 alignment, 8 fixed line spacing in px, 0 = automatic); 0008: font names.
    """
    s = _xmed_sections(xmed_bytes)
    if not all(k in s for k in ("0004", "0005", "0006", "0007")):
        return None
    fonts = [f.decode("latin1") for f in re.findall(rb"40,[\x01-\x3f]([A-Za-z][^\x00]*)", s.get("0008", (0, b""))[1])]
    styles = []
    for r in _xmed_records(s["0006"][1], s["0006"][0], 77, 1):
        styles.append({
            "font": fonts[r[0]] if 0 <= r[0] < len(fonts) else "",
            "size": round(r[18] / 65536, 2),
            "ascent": r[3],
            "descent": r[4],
            "color": [(r[9] >> 8) & 255, (r[10] >> 8) & 255, (r[11] >> 8) & 255],
        })
    paras = [{"align": _XMED_ALIGN.get(r[0], "left"), "lineSpacing": r[8]}
             for r in _xmed_records(s["0007"][1], s["0007"][0], 54)]
    runs = [dict(start=o, **styles[i]) for o, i in _xmed_pairs(s["0004"][1]) if 0 <= i < len(styles)]
    pruns = [dict(start=o, **paras[i]) for o, i in _xmed_pairs(s["0005"][1]) if 0 <= i < len(paras)]
    return {"runs": runs, "paras": pruns}


def extract_game(dir_path: Path, pr_movie_dir: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    bmp_dir = out_dir / "bitmaps"
    snd_dir = out_dir / "sounds"
    txt_dir = out_dir / "texts"
    font_dir = out_dir / "fonts"
    for d in (bmp_dir, snd_dir, txt_dir, font_dir):
        d.mkdir(parents=True, exist_ok=True)

    chunks, by_tag = parse_rifx(dir_path)
    drcf_chunk = by_tag["DRCF"][0][1]
    _, _, top, left, bottom, right = struct.unpack(">HHhhhh", drcf_chunk[:12])
    stage_r = drcf_chunk[27]
    stage_g = drcf_chunk[18]
    stage_b = drcf_chunk[19]
    fps = struct.unpack(">H", drcf_chunk[54:56])[0]

    casts = parse_mcsl(by_tag["MCsL"][0][1])
    key_map = parse_key_table(by_tag["KEY*"][0][1])
    frame_labels = parse_vwlb(by_tag["VWLB"][0][1])
    cas_chunks = sorted(by_tag["CAS*"], key=lambda x: x[0])
    casts_pr_dir = pr_movie_dir / "casts"

    cast_members = []
    cast_lookup = {}
    for cast_info, (cas_sec_id, cas_raw) in zip(casts, cas_chunks):
        clib = cast_info["castLib"]
        cname = cast_info["name"]
        mids = struct.unpack(">" + "I" * (len(cas_raw) // 4), cas_raw)
        min_m = cast_info["minMember"]
        for offset_m, ca_sec_id in enumerate(mids):
            mem_num = min_m + offset_m
            if ca_sec_id == 0 or ca_sec_id not in chunks:
                continue
            tag, ca_raw = chunks[ca_sec_id]
            if tag != "CASt":
                continue
            ctype, info, spec_raw = parse_cast_member(ca_raw)
            mname = info.get("name", "")
            assoc = key_map.get(ca_sec_id, {})
            entry = {
                "castLib": clib,
                "castName": cname,
                "member": mem_num,
                "castChunkId": ca_sec_id,
                "type": ctype,
                "name": mname,
                "scriptId": info.get("scriptId", 0),
                "associatedChunks": assoc,
            }

            if ctype == 1:
                edim = chunks[assoc["ediM"]][1] if "ediM" in assoc and assoc["ediM"] in chunks else None
                bitd = chunks[assoc["BITD"]][1] if "BITD" in assoc and assoc["BITD"] in chunks else None
                alfa = chunks[assoc["ALFA"]][1] if "ALFA" in assoc and assoc["ALFA"] in chunks else None
                img, bmp_meta = decode_bitmap(spec_raw, edim, bitd, alfa)
                entry["bitmap"] = bmp_meta
                if img is not None:
                    fname = f"{clib}_{mem_num:03d}__{safe_filename(mname)}.png"
                    try:
                        img.save(bmp_dir / fname)
                    except PermissionError:
                        if not (bmp_dir / fname).exists():
                            raise
                    entry["file"] = f"bitmaps/{fname}"

            elif ctype == 6:
                if "snd " in assoc and assoc["snd "] in chunks:
                    snd_raw = chunks[assoc["snd "]][1]
                    fname = f"{clib}_{mem_num:03d}__{safe_filename(mname)}.wav"
                    snd_meta = decode_snd_to_wav(snd_raw, snd_dir / fname)
                    snd_meta["loop"] = (info.get("flags", 16) & 16) == 0
                    snd_meta["castFlags"] = info.get("flags", 0)
                    entry["sound"] = snd_meta
                    entry["file"] = f"sounds/{fname}"


            elif ctype == 11:
                script_type = struct.unpack(">H", spec_raw[:2])[0] if len(spec_raw) >= 2 else 0
                entry["scriptType"] = script_type
                ls_dir = casts_pr_dir / cname
                matched_ls = None
                if ls_dir.exists():
                    for cand in ls_dir.glob(f"*Script {mem_num}*.ls"):
                        if re.search(rf"Script {mem_num}(?:\s|-|\.)", cand.name):
                            matched_ls = cand
                            break
                if matched_ls:
                    entry["lsFile"] = matched_ls.relative_to(dir_path.parent.parent).as_posix()
                if info.get("scriptSrcText"):
                    entry["hasEmbeddedSource"] = True

            elif ctype == 15:
                if "XMED" in assoc and assoc["XMED"] in chunks:
                    xmed_raw = chunks[assoc["XMED"]][1]
                    xres = decode_xmed_text(xmed_raw)
                    if xres["kind"] == "pfr1_font":
                        fname = f"{clib}_{mem_num:03d}__{safe_filename(mname)}.pfr"
                        (font_dir / fname).write_bytes(xres["raw"])
                        entry["xtra"] = {"kind": "pfr1_font", "bytes": xres["bytes"]}
                        entry["file"] = f"fonts/{fname}"
                    elif xres["kind"] == "text":
                        fname = f"{clib}_{mem_num:03d}__{safe_filename(mname)}.txt"
                        (txt_dir / fname).write_text(xres["text"], encoding="utf-8")
                        entry["xtra"] = {"kind": "text", "text": xres["text"]}
                        styles = decode_xmed_styles(xmed_raw)
                        if styles:
                            entry["xtra"].update(styles)
                        entry["file"] = f"texts/{fname}"
                    else:
                        entry["xtra"] = xres

            cast_members.append(entry)
            cast_lookup[(clib, mem_num)] = entry

    frame_count, frames = parse_vwsc(by_tag["VWSC"][0][1])

    for fobj in frames:
        if fobj["frameScript"]:
            fs = fobj["frameScript"]
            m = cast_lookup.get((fs["castLib"], fs["member"]))
            if m:
                fs["name"] = m["name"]
                if "lsFile" in m:
                    fs["lsFile"] = m["lsFile"]
        for sp in fobj["sprites"]:
            m = cast_lookup.get((sp["castLib"], sp["member"]))
            if m:
                sp["memberName"] = m["name"]
                sp["memberType"] = m["type"]
            for b in sp["behaviors"]:
                bm = cast_lookup.get((b["castLib"], b["member"]))
                if bm:
                    b["name"] = bm["name"]
                    if "lsFile" in bm:
                        b["lsFile"] = bm["lsFile"]

    manifest = {
        "sourceDir": f"dir/{dir_path.name}",
        "stage": {
            "width": right - left,
            "height": bottom - top,
            "frameRate": fps,
            "bgColor": [stage_r, stage_g, stage_b],
        },
        "casts": casts,
        "frameLabels": frame_labels,
        "frameCount": frame_count,
        "members": cast_members,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (out_dir / "score.json").write_text(json.dumps(frames, indent=2), encoding="utf-8")

    counts = {}
    for m in cast_members:
        counts[m["type"]] = counts.get(m["type"], 0) + 1
    print(f"Extracted {dir_path.name} -> {out_dir}")
    print(f"  stage={right-left}x{bottom-top}@{fps}fps bg=({stage_r},{stage_g},{stage_b}) frames={frame_count} labels={len(frame_labels)}")
    print(f"  members by type: {counts} (total={len(cast_members)})")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    extract_game(
        root / "dir" / "rescueblade.dir",
        root / "extracted" / "rescueblade" / "pr_dump" / "rescueblade",
        root / "extracted" / "rescueblade" / "assets",
    )
    extract_game(
        root / "dir" / "RB_BermudaTriangle_081.dir",
        root / "extracted" / "bermuda" / "pr_dump" / "RB_BermudaTriangle_081",
        root / "extracted" / "bermuda" / "assets",
    )

