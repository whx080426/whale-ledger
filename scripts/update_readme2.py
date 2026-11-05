"""更新 README：加入可用存款说明。"""
import re

PATH = r"D:\app\README.md"
text = open(PATH, encoding="utf-8").read()

# 计算规则里补一行
old_rule = "- 累计存款 = 期初存款 + 各月实际能攒之和"
new_rule = (
    "- 可用存款 = 期初存款 + **本月之前**各月实际能攒之和（不含本月收入，月内不跳动）\n"
    "- 累计存款 = 期初存款 + 各月实际能攒之和（含本月，即可动用的总资产）"
)
if old_rule in text and "可用存款 = 期初存款" not in text:
    text = text.replace(old_rule, new_rule)

# 已实现里的首页条目
text = re.sub(
    r"- 首页：[^\n]*",
    "- 首页：可用存款 / 累计存款双卡（左右滑动，靛蓝 / 绿色）、今日·本周滑动卡片、本月收支、计划 vs 实际、最近记录",
    text,
    count=1,
)

# 攒钱目标那行提到累计存款
text = text.replace(
    "| 攒钱目标 | 账户里想存到的总额，0 表示暂不设定 |",
    "| 攒钱目标 | 账户里想存到的总额，0 表示暂不设定；两张存款卡各按自己的数字算进度 |",
)

open(PATH, "w", encoding="utf-8").write(text)
print("ok")
