"""鲸鱼记账 · 正式图标（方案 D：微渐变黑底 + 白色 ¥）。"""
import os
from PIL import Image, ImageDraw

OUT = r"D:\app\public"
os.makedirs(OUT, exist_ok=True)

WHITE = (255, 255, 255, 255)

# 渐变端点：中心 #1E1E1E → 边缘 #040406
INNER = 30
OUTER = 4


def background(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    c = size / 2
    for y in range(size):
        for x in range(size):
            dx = (x - c) / c
            dy = (y - c) / c
            d = min(1.0, (dx * dx + dy * dy) ** 0.5 / 1.15)
            v = int(INNER - (INNER - OUTER) * d)
            px[x, y] = (v, v, v + 2, 255)
    return img


def yen(img: Image.Image, size: int, ratio: float, stroke_ratio: float) -> None:
    """按图标边长的比例画一个几何 ¥。"""
    d = ImageDraw.Draw(img)
    h = size * ratio
    w = h * 0.85
    stroke = int(size * stroke_ratio)
    cx, cy = size / 2, size / 2

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

    for ratio_y in (0.56, 0.78):
        y = top + h * ratio_y
        d.line([(cx - w * 0.46, y), (cx + w * 0.46, y)], fill=WHITE, width=stroke)

    for p in [
        (cx - w / 2, top), (cx + w / 2, top), (cx, jy), (cx, bottom),
        (cx - w * 0.46, top + h * 0.56), (cx + w * 0.46, top + h * 0.56),
        (cx - w * 0.46, top + h * 0.78), (cx + w * 0.46, top + h * 0.78),
    ]:
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=WHITE)


def build(size: int, ratio: float, stroke_ratio: float, filename: str) -> None:
    img = background(size)
    yen(img, size, ratio, stroke_ratio)
    img.convert("RGB").save(os.path.join(OUT, filename), optimize=True)
    print("wrote", filename, size)


# 普通图标：¥ 占 53%
build(512, 0.53, 0.064, "icon-512.png")
build(192, 0.53, 0.064, "icon-192.png")

# maskable：内容收进 80% 安全区，留更多边
build(512, 0.44, 0.054, "icon-maskable-512.png")
print("done")
