"""拼一张图标预览：普通图标 / 圆形裁切 / 小尺寸。"""
import os
from PIL import Image, ImageDraw, ImageFont

SRC = r"D:\app\public"
OUT = r"D:\app\scripts\icon-preview.png"
FONT = r"C:\Windows\Fonts\msyh.ttc"


def label(text, size=19):
    return ImageFont.truetype(FONT, size)


def rounded(img, size, radius_ratio=0.22):
    img = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=int(size * radius_ratio), fill=255
    )
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def circle(img, size):
    img = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


canvas = Image.new("RGBA", (1000, 430), (233, 236, 242, 255))
draw = ImageDraw.Draw(canvas)
f = label("")

icon = Image.open(os.path.join(SRC, "icon-512.png")).convert("RGBA")
maskable = Image.open(os.path.join(SRC, "icon-maskable-512.png")).convert("RGBA")

items = [
    (rounded(icon, 200), "桌面图标 512", 130),
    (circle(maskable, 200), "圆形裁切（部分机型）", 400),
    (rounded(icon, 96), "小尺寸 96px", 700),
]

for img, caption, x in items:
    y = 200 - img.height // 2 + 20
    canvas.alpha_composite(img, (x, y))
    tw = draw.textlength(caption, font=f)
    draw.text((x + img.width / 2 - tw / 2, 330), caption, font=f, fill=(102, 112, 133, 255))

canvas.convert("RGB").save(OUT, quality=95)
print("wrote", OUT)
