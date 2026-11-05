"""鲸鱼记账 · 桌面观感模拟（图标 + 名称）。"""
import os
from PIL import Image, ImageDraw, ImageFont

ICON = r"D:\app\public\icon-512.png"
OUT = r"D:\app\design\icon-launcher-preview.png"
FONT = r"C:\Windows\Fonts\msyh.ttc"

W, H = 560, 640
canvas = Image.new("RGB", (W, H))

# 深色壁纸渐变
px = canvas.load()
for y in range(H):
    t = y / H
    v = int(28 - 22 * t)
    for x in range(W):
        px[x, y] = (v, v, v + 3)

icon = Image.open(ICON).convert("RGBA")
size = 168
icon = icon.resize((size, size), Image.LANCZOS)

# 圆角裁切（模拟启动器）
mask = Image.new("L", (size, size), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.24), fill=255)
rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
rounded.paste(icon, (0, 0), mask)

# 阴影
shadow = Image.new("RGBA", (size + 40, size + 40), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    (20, 26, 20 + size, 26 + size), radius=int(size * 0.24), fill=(0, 0, 0, 140)
)
for i in range(6):
    blur = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    blur.paste(shadow, (0, 0))

canvas.paste(shadow, (W // 2 - (size + 40) // 2, 150 - 20), shadow)
canvas.paste(rounded, (W // 2 - size // 2, 150), rounded)

d = ImageDraw.Draw(canvas)
name_font = ImageFont.truetype(FONT, 26)
small = ImageFont.truetype(FONT, 17)

label = "鲸鱼记账"
tw = d.textlength(label, font=name_font)
d.text(((W - tw) / 2, 360), label, font=name_font, fill=(245, 246, 248))

hint = "ColorOS 桌面图标观感"
tw = d.textlength(hint, font=small)
d.text(((W - tw) / 2, 404), hint, font=small, fill=(130, 136, 150))

canvas.save(OUT)
print("wrote", OUT)
