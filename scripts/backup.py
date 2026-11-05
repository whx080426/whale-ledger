"""把项目打包成 zip（排除 node_modules 和构建产物），放到桌面。"""
import os
import zipfile

ROOT = r"D:\app"
OUT = r"E:\Desktop\鲸鱼记账-项目备份-20261105.zip"

SKIP_DIRS = {"node_modules", ".git", "dist", "dist-apk", "build", ".vite"}
SKIP_EXT = {".log"}

count = 0
total = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for base, dirs, files in os.walk(ROOT):
        rel_base = os.path.relpath(base, ROOT)
        parts = [] if rel_base == "." else rel_base.split(os.sep)
        if any(p in SKIP_DIRS for p in parts):
            dirs[:] = []
            continue
        # android/build、android/assets/www 也要排除
        rel_posix = "/".join(parts)
        if rel_posix.startswith("android/build") or rel_posix.startswith("android/assets/www"):
            dirs[:] = []
            continue

        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if os.path.splitext(name)[1].lower() in SKIP_EXT:
                continue
            full = os.path.join(base, name)
            arc = os.path.relpath(full, ROOT).replace("\\", "/")
            zf.write(full, arc)
            count += 1
            total += os.path.getsize(full)

size_mb = os.path.getsize(OUT) / (1024 * 1024)
print(f"文件数: {count}")
print(f"原始大小: {total / (1024 * 1024):.1f} MB")
print(f"压缩后: {size_mb:.1f} MB -> {OUT}")
