"""修正 README 里累计/可用存款的口径说明。"""
PATH = r"D:\app\README.md"
text = open(PATH, encoding="utf-8").read()

old = """- 可用存款 = 期初存款 + **本月之前**各月实际能攒之和（不含本月收入，月内不跳动）
- 累计存款 = 期初存款 + 各月实际能攒之和（含本月，即可动用的总资产）"""
new = """- 累计存款 = 期初存款 + Σ(各月收入 − 各月支出)，**本月始终计入**（没记账也算进月收入），即可动用的总资产
- 可用存款 = 累计存款 − **本月计划攒**（支出先花「计划花」，花超了才动「计划攒」）
- 两者关系：可用 + 本月计划攒 = 累计"""

if old in text:
    text = text.replace(old, new)
    open(PATH, "w", encoding="utf-8").write(text)
    print("updated")
else:
    print("pattern not found")
