"""把 aapt2 产物重新打包成标准 APK。

aapt2 在 Windows 上会把 assets 的路径写成 assets/www\\index.html 这种混合分隔符，
Android 侧 AssetManager 会把反斜杠当成文件名的一部分，导致 www/index.html 打不开。
这里统一转成正斜杠，同时保证 resources.arsc 以 stored 方式写入（Android 11+ 要求）。
"""
import sys
import zipfile

src, dex_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
DATE = (2026, 1, 1, 0, 0, 0)


def normalize(name: str) -> str:
    return name.replace("\\", "/").lstrip("/")


def main() -> None:
    zin = zipfile.ZipFile(src, "r")
    zout = zipfile.ZipFile(out_path, "w")

    renamed = 0
    for info in zin.infolist():
        name = normalize(info.filename)
        if not name or name.endswith("/"):
            continue
        if name != info.filename.replace("/", "/"):
            renamed += 1

        data = zin.read(info)
        entry = zipfile.ZipInfo(name, date_time=DATE)
        entry.external_attr = 0o644 << 16
        # resources.arsc 必须不压缩
        entry.compress_type = (
            zipfile.ZIP_STORED if name == "resources.arsc" else zipfile.ZIP_DEFLATED
        )
        zout.writestr(entry, data)

    with open(dex_path, "rb") as handle:
        dex = handle.read()
    entry = zipfile.ZipInfo("classes.dex", date_time=DATE)
    entry.external_attr = 0o644 << 16
    entry.compress_type = zipfile.ZIP_DEFLATED
    zout.writestr(entry, dex)

    zout.close()
    zin.close()
    print(f"repacked: {out_path} (renamed entries: {renamed})")


if __name__ == "__main__":
    main()
