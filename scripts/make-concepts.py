"""鲸鱼记账 · 图标概念稿（黑底 + 白 ¥，极简）。"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = r"D:\app\scripts\concepts"
os.makedirs(OUT_DIR, exist_ok=True)
FONT = r"C:\Windows\Fonts\msyh.ttc"

S = 512
BLACK = (8, 8, 10, 255)
WHITE = (255, 255, 255, 255)


def base():
    img = Image.new("RGBA", (S, S), BLACK)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.225), fill=255)
    img.putalpha(mask)
    return img


def draw_yen(draw, cx, cy, h, w, stroke, color=WHITE):
    """用线条画一个几何 ¥。"""
    stroke = int(stroke)
    top = cy - h / 2
    bottom = cy + h / 2
    join = top + h * 0.36
    draw.line([(cx - w / 2, top), (cx, join)], fill=color, width=stroke)
    draw.line([(cx + w / 2, top), (cx, join)], fill=color, width=stroke)
    draw.line([(cx, join), (cx, bottom)], fill=color, width=stroke)
    for ratio in (0.60, 0.74):
        y = top + h * ratio
        draw.line([(cx - w * 0.46, y), (cx + w * 0.46, y)], fill=color, width=stroke)


def round_cap(draw, p, r, color=WHITE):
    draw.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=color)


def add_caps(img, points, r, color=WHITE):
    d = ImageDraw.Draw(img)
    for p in points:
        round_cap(d, p, r, color)


def leaf(size, angle, color=WHITE):
    """一片柳叶，用来拼鲸鱼尾。"""
    size = int(size)
    w, h = size, int(size * 0.42)
    tile = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    ImageDraw.Draw(tile).ellipse((4, 4, 4 + w, 4 + h), fill=color)
    return tile.rotate(angle, expand=True, resample=Image.BICUBIC)


# ---------- A. 纯 ¥ ----------
def concept_a():
    img = base()
    d = ImageDraw.Draw(img)
    h, w, stroke = S * 0.50, S * 0.44, S * 0.075
    draw_yen(d, S / 2, S / 2, h, w, stroke)
    cx, cy = S / 2, S / 2
    top, bottom = cy - h / 2, cy + h / 2
    join = top + h * 0.36
    r = stroke / 2
    add_caps(img, [(cx - w / 2, top), (cx + w / 2, top), (cx, join), (cx, bottom)], r)
    return img


# ---------- B. ¥ + 喷水 ----------
def concept_b():
    img = concept_a()
    d = ImageDraw.Draw(img)
    cx = S / 2
    dots = [(cx, S * 0.235, S * 0.030), (cx - S * 0.048, S * 0.272, S * 0.021), (cx + S * 0.048, S * 0.272, S * 0.021)]
    for x, y, r in dots:
        d.ellipse((x - r, y - r, x + r, y + r), fill=WHITE)
    return img


# ---------- C. ¥ + 鲸尾 ----------
def concept_c():
    img = base()
    d = ImageDraw.Draw(img)
    h, w, stroke = S * 0.42, S * 0.38, S * 0.070
    draw_yen(d, S / 2, S * 0.455, h, w, stroke)
    cx, cy = S / 2, S * 0.455
    top = cy - h / 2
    join = top + h * 0.36
    add_caps(img, [(cx - w / 2, top), (cx + w / 2, top), (cx, join), (cx, cy + h / 2)], stroke / 2)

    # 右下角的鲸尾：左右两片柳叶
    left = leaf(S * 0.20, 38)
    right = leaf(S * 0.20, -38)
    img.alpha_composite(left, (int(S * 0.60), int(S * 0.735)))
    img.alpha_composite(right, (int(S * 0.70), int(S * 0.735)))
    return img


# ---------- D. ¥ + 圆环 ----------
def concept_d():
    img = base()
    d = ImageDraw.Draw(img)
    r = S * 0.335
    w = int(S * 0.026)
    d.ellipse((S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r), outline=WHITE, width=w)
    h, ww, stroke = S * 0.42, S * 0.36, S * 0.066
    draw_yen(d, S / 2, S / 2, h, ww, stroke)
    top = S / 2 - h / 2
    join = top + h * 0.36
    add_caps(img, [(S / 2 - ww / 2, top), (S / 2 + ww / 2, top), (S / 2, join), (S / 2, S / 2 + h / 2)], stroke / 2)
    return img


CONCEPTS = [
    ("A · 纯符号", concept_a()),
    ("B · 喷水", concept_b()),
    ("C · 鲸尾", concept_c()),
    ("D · 圆环", concept_d()),
]

for name, img in CONCEPTS:
    img.save(os.path.join(OUT_DIR, f"concept-{name[0]}.png"))

# ---------- 预览拼图 ----------
CW, CH = 1000, 470
sheet = Image.new("RGBA", (CW, CH), (233, 236, 242, 255))
d = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype(FONT, 20)
small_font = ImageFont.truetype(FONT, 16)

positions = [62, 300, 538, 776]
big = 180

for idx, (name, img) in enumerate(CONCEPTS):
    x = positions[idx]
    big_img = img.resize((big, big), Image.LANCZOS)
    sheet.alpha_composite(big_img, (x, 62))

    small = img.resize((64, 64), Image.LANCZOS)
    sheet.alpha_composite(small, (x + (big - 64) // 2, 300))

    tw = d.textlength(name, font=label_font)
    d.text((x + big / 2 - tw / 2, 262), name, font=label_font, fill=(15, 23, 42, 255))

hint = "黑底 + 白色 ¥ · 512px 与 64px 观感"
tw = d.textlength(hint, font=small_font)
d.text(((CW - tw) / 2, 400), hint, font=small_font, fill=(120, 130, 150, 255))

sheet.convert("RGB").save(r"D:\app\scripts\icon-concepts.png", quality=95)
print("wrote concepts + preview")
