"""检查 APK 里 assets 的路径分隔符和 resources.arsc 的存储方式。

注意：Windows 上 Python 的 zipfile 会把反斜杠自动转成正斜杠，
所以这里直接扫原始字节，避免被它掩盖问题。
"""
import sys
import zipfile

path = sys.argv[1]
data = open(path, "rb").read()

backslash_assets = data.count(b"assets/www\\")
slash_assets = data.count(b"assets/www/")

print(f"assets/www/ 出现次数: {slash_assets}")
print(f"assets/www\\ 出现次数: {backslash_assets}")
print("分隔符:", "OK（全是正斜杠）" if backslash_assets == 0 else "BAD（仍有反斜杠）")

with zipfile.ZipFile(path) as z:
    arsc = [i for i in z.infolist() if i.filename == "resources.arsc"]
    if not arsc:
        print("resources.arsc: 缺失")
    else:
        print("resources.arsc:", "stored (OK)" if arsc[0].compress_type == 0 else "COMPRESSED (BAD)")
    print("条目数:", len(z.infolist()))
