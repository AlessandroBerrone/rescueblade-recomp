"""Unit tests for the Director asset extractor.

Run from the repository root:  python -m unittest discover -s scripts
"""

import struct
import unittest
from io import BytesIO

from PIL import Image

import extract_dir_assets as E


def bitmap_spec(w: int, h: int, bpp: int = 32) -> bytes:
    # bytesPerRow, top, left, bottom, right, (8 unused), regY, regX, flags, bpp, paletteId
    return (
        struct.pack(">Hhhhh", w * 4, 0, 0, h, w)
        + b"\x00" * 8
        + struct.pack(">hh", 0, 0)
        + bytes([0, bpp])
        + struct.pack(">i", -101)
    )


def literal_packbits(data: bytes) -> bytes:
    out = bytearray()
    for i in range(0, len(data), 128):
        chunk = data[i : i + 128]
        out.append(len(chunk) - 1)
        out.extend(chunk)
    return bytes(out)


class DecodeBitmapAlphaTest(unittest.TestCase):
    def _decode(self, w: int, h: int, alpha_rows: list[bytes]):
        jpeg = BytesIO()
        Image.new("RGB", (w, h), (200, 30, 30)).save(jpeg, format="JPEG")
        alfa = literal_packbits(b"".join(alpha_rows))
        img, meta = E.decode_bitmap(bitmap_spec(w, h), jpeg.getvalue(), None, alfa)
        return img, meta

    def test_odd_width_alpha_rows_are_padded_to_even(self):
        # 3 pixels wide: each ALFA row carries one padding byte (0x7f) at the end.
        rows = [bytes([0, 255, 10, 0x7F]), bytes([20, 30, 40, 0x7F])]
        img, meta = self._decode(3, 2, rows)
        self.assertTrue(meta["hasAlpha"])
        self.assertEqual(list(img.getchannel("A").getdata()), [0, 255, 10, 20, 30, 40])

    def test_even_width_alpha_is_unchanged(self):
        rows = [bytes([1, 2]), bytes([3, 4])]
        img, _ = self._decode(2, 2, rows)
        self.assertEqual(list(img.getchannel("A").getdata()), [1, 2, 3, 4])


class DecodeBitmap32Test(unittest.TestCase):
    def test_uncompressed_32bit_is_pixel_interleaved_argb(self):
        # A BITD exactly bytesPerRow*height long is stored raw, one A,R,G,B quad per pixel.
        pixels = [(255, 10, 20, 30), (255, 40, 50, 60), (255, 70, 80, 90), (255, 1, 2, 3)]
        bitd = b"".join(bytes(p) for p in pixels)
        img, _ = E.decode_bitmap(bitmap_spec(2, 2), None, bitd, None)
        self.assertEqual([px[:3] for px in img.getdata()], [p[1:] for p in pixels])

    def test_packbits_32bit_rows_are_channel_planes(self):
        # Compressed rows hold the A plane, then R, G and B planes.
        row = bytes([255, 255, 10, 40, 20, 50, 30, 60])
        img, _ = E.decode_bitmap(bitmap_spec(2, 1), None, literal_packbits(row), None)
        self.assertEqual([px[:3] for px in img.getdata()], [(10, 20, 30), (40, 50, 60)])


if __name__ == "__main__":
    unittest.main()
