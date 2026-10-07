#!/usr/bin/env python3
"""大乐透项目共享口径(Python 脚本共用)。

遗漏分档、号码范围、热/温/冷排名截断全部只在这里定义一次,
build_datasets.py 等脚本从这里 import,避免多处硬编码口径漂移。
"""

FRONT_RANGE = range(1, 36)   # 前区 1–35
BACK_RANGE = range(1, 13)    # 后区 1–12

# 遗漏分档边界:(遗漏期数上限, 档名),超出最后一档上限的归入兜底档
FRONT_BUCKETS = [(0, "重"), (2, "短"), (5, "中"), (10, "偏")]
BACK_BUCKETS = [(0, "重"), (4, "短"), (8, "中")]
FRONT_BUCKET_NAMES = ["重", "短", "中", "偏", "大"]   # 兜底档 "大"
BACK_BUCKET_NAMES = ["重", "短", "中", "长"]           # 兜底档 "长"

# 热/温/冷: 按出球数排名,前 N 为热、接下来 M 为温、其余为冷
FRONT_HOT, FRONT_WARM = 12, 11
BACK_HOT, BACK_WARM = 4, 4


def front_bucket(om):
    """前区遗漏分档。om=None 表示数据集内无历史开出记录,计入大冷(见 README)。"""
    if om is None:
        return "大"
    for hi, name in FRONT_BUCKETS:
        if om <= hi:
            return name
    return "大"


def back_bucket(om):
    """后区遗漏分档。om=None 表示数据集内无历史开出记录,计入长遗漏。"""
    if om is None:
        return "长"
    for hi, name in BACK_BUCKETS:
        if om <= hi:
            return name
    return "长"
