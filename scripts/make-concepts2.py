"""鲸鱼记账 · 图标概念稿 v2（黑底 + 白 ¥，极简）。"""
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


def yen(img, cx, cy, h, w, stroke):
    """line 带圆头，比例按真实 ¥ 调整。"""
    stroke = int(stroke)
    d = ImageDraw.Draw(img)
    top = cy - h / 2
    bottom = cy + h / 2
    jy = top + h * 0.38
    r = stroke / 2

    for a, b in [
        ((cx - w / 2, top), (cx, jy)),
        ((cx + w / 2, top), (cx, jy)),
        ((cx, jy), (cx, bottom)),
    ]:
        d.line([a, b], fill=WHITE, width=stroke)

    for ratio in (0.56, 0.78):
        y = top + h * ratio
        d.line([(cx - w * 0.46, y), (cx + w * 0.46, y)], fill=WHITE, width=stroke)

    points = [
        (cx - w / 2, top), (cx + w / 2, top), (cx, jy), (cx, bottom),
        (cx - w * 0.46, top + h * 0.56), (cx + w * 0.46, top + h * 0.56),
        (cx - w * 0.46, top + h * 0.78), (cx + w * 0.46, top + h * 0.78),
    ]
    for p in points:
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=WHITE)


def concept_a():
    img = base()
    yen(img, S / 2, S / 2, S * 0.47, S * 0.40, S * 0.058)
    return img


def concept_b():
    img = base()
    yen(img, S / 2, S * 0.545, S * 0.44, S * 0.375, S * 0.055)
    d = ImageDraw.Draw(img)
    for x, y, r in [
        (S * 0.50, S * 0.175, S * 0.026),
        (S * 0.435, S * 0.235, S * 0.017),
        (S * 0.565, S * 0.235, S * 0.017),
    ]:
        d.ellipse((x - r, y - r, x + r, y + r), fill=WHITE)
    return img


def concept_c():
    """¥ + 右下角鲸尾（倒 V，圆头）。"""
    img = base()
    yen(img, S * 0.475, S * 0.485, S * 0.45, S * 0.375, S * 0.055)
    d = ImageDraw.Draw(img)
    stroke = int(S * 0.052)
    r = stroke / 2
    apex = (S * 0.735, S * 0.80)
    for tip in [(S * 0.665, S * 0.685), (S * 0.825, S * 0.715)]:
        d.line([apex, tip], fill=WHITE, width=stroke)
        d.ellipse((tip[0] - r, tip[1] - r, tip[0] + r, tip[1] + r), fill=WHITE)
    d.ellipse((apex[0] - r, apex[1] - r, apex[0] + r, apex[1] + r), fill=WHITE)
    return img


def concept_d():
    img = base()
    d = ImageDraw.Draw(img)
    r = S * 0.395
    d.ellipse((S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r), outline=WHITE, width=int(S * 0.022))
    yen(img, S / 2, S / 2, S * 0.40, S * 0.345, S * 0.050)
    return img


CONCEPTS = [
    ("A · 纯符号", concept_a()),
    ("B · 喷水", concept_b()),
    ("C · 鲸尾", concept_c()),
    ("D · 圆环", concept_d()),
]

for name, img in CONCEPTS:
    img.save(os.path.join(OUT_DIR, f"concept-{name[0]}.png"))

CW, CH = 1000, 470
sheet = Image.new("RGBA", (CW, CH), (233, 236, 242, 255))
d = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype(FONT, 20)
small_font = ImageFont.truetype(FONT, 16)

positions = [62, 300, 538, 776]
big = 180

for idx, (name, img) in enumerate(CONCEPTS):
    x = positions[idx]
    sheet.alpha_composite(img.resize((big, big), Image.LANCZOS), (x, 62))
    sheet.alpha_composite(img.resize((64, 64), Image.LANCZOS), (x + (big - 64) // 2, 300))
    tw = d.textlength(name, font=label_font)
    d.text((x + big / 2 - tw / 2, 262), name, font=label_font, fill=(15, 23, 42, 255))

hint = "黑底 + 白色 ¥ · 180px 与 64px 观感"
tw = d.textlength(hint, font=small_font)
d.text(((CW - tw) / 2, 400), hint, font=small_font, fill=(120, 130, 150, 255))

sheet.convert("RGB").save(r"D:\app\scripts\icon-concepts.png", quality=95)
print("wrote concepts + preview")
