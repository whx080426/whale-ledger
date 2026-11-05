"""把 README 里「收益日历」一节换成新说明。"""
import re

PATH = r"D:\app\README.md"
NEW = """## 收益日历

明细页标题右边的小圆点可以左右切换「账单明细」↔「收益日历」，也可以直接左右滑动。

右上角两个开关互相独立：

| 开关 | 选项 | 含义 |
|---|---|---|
| 口径 | **净收益** | 记录的收入 − 记录的支出 |
| | **预算** | 日计划花 − 当天支出（负数即超支） |
| 范围 | **日** | 一个月的每一天，一格一天 |
| | **周** | 一个月按自然周（周一起）分组，一行一周 |

- 顶部大数字跟着口径变：净收益模式是「本月净收益」，预算模式是「本月结余 / 超支」
- 汇总行也跟着变：净收益显示收入 / 支出 / 记账天数，预算显示日预算 / 已花 / 超支天数
- 周视图里，首尾周只统计落在本月内的那几天，预算按「日计划花 × 该周在本月的天数」算
- 绿色 = 有结余，红色 = 超支，`—` = 当天（周）没有记录
- `‹ ›` 翻月
"""

text = open(PATH, encoding="utf-8").read()
pattern = re.compile(r"## 收益日历.*?(?=\n## )", re.S)
if pattern.search(text):
    text = pattern.sub(NEW + "\n", text, count=1)
    open(PATH, "w", encoding="utf-8").write(text)
    print("README updated")
else:
    print("section not found")
