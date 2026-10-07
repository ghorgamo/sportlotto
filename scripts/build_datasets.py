#!/usr/bin/env python3
"""从原始开奖数据构建全部衍生数据集。

输入: data/draws_raw.txt
  每行格式: drawNum|drawDate|frontDrawNumber|backDrawNumber  (从新到旧)
  例如: 26113|2026-10-05|02,04,06,10,11|01,10

输出:
  data/draws.csv          基础开奖表(从新到旧)
  data/draw_analysis.csv  逐期分析表:每球开出前遗漏、遗漏结构、和值/跨度/奇偶/大小/连号、热温冷分布
  data/number_stats.csv   号码统计表:出球数、当前遗漏、最大/平均遗漏、热/温/冷分类

遗漏分档与热温冷截断见 scripts/common.py。数据集开头的号码无历史遗漏可计,
按大冷/长遗漏处理(见 README)。
"""

import csv
from collections import Counter
from pathlib import Path

from common import (
    BACK_BUCKET_NAMES,
    BACK_HOT,
    BACK_RANGE,
    BACK_WARM,
    FRONT_BUCKET_NAMES,
    FRONT_HOT,
    FRONT_RANGE,
    FRONT_WARM,
    back_bucket,
    front_bucket,
)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def parse_raw():
    raw = DATA / "draws_raw.txt"
    draws = []
    for line in raw.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("TOTAL="):
            continue
        parts = [p.strip() for p in line.split("|")]
        issue, date = parts[0], parts[1]
        front = [int(x) for x in parts[2].replace("，", ",").split(",")]
        back = [int(x) for x in parts[3].replace("，", ",").split(",")]
        assert len(front) == 5 and len(back) == 2, f"bad line: {line}"
        draws.append({"issue": issue, "date": date, "front": front, "back": back})
    # 按期号去重(保留第一次出现)
    seen, uniq = set(), []
    for d in draws:
        if d["issue"] not in seen:
            seen.add(d["issue"])
            uniq.append(d)
    return uniq


def classify(count, hot_n, warm_n):
    """按出球数排名分类:前 hot_n 为热、接下来 warm_n 为温、其余为冷。"""
    ranked = sorted(count.items(), key=lambda kv: (-kv[1], kv[0]))
    cls = {}
    for i, (n, _) in enumerate(ranked):
        cls[n] = "热" if i < hot_n else ("温" if i < hot_n + warm_n else "冷")
    return cls


def main():
    draws = parse_raw()
    total = len(draws)
    assert total > 0, "data/draws_raw.txt 为空"
    print(f"draws loaded: {total}")
    chrono = sorted(draws, key=lambda d: d["issue"])  # 从旧到新,用于遗漏计算

    # --- 出球统计 & 遗漏 ---
    f_count, b_count = Counter(), Counter()
    f_gaps = {n: [] for n in FRONT_RANGE}
    b_gaps = {n: [] for n in BACK_RANGE}
    f_last, b_last = {}, {}
    analysis = []  # 逐期记录(从旧到新)

    for idx, d in enumerate(chrono):
        f_oms, b_oms = [], []
        for n in d["front"]:
            om = idx - f_last[n] - 1 if n in f_last else None
            f_oms.append(om)
            if om is not None:
                f_gaps[n].append(om)
            f_count[n] += 1
            f_last[n] = idx
        for n in d["back"]:
            om = idx - b_last[n] - 1 if n in b_last else None
            b_oms.append(om)
            if om is not None:
                b_gaps[n].append(om)
            b_count[n] += 1
            b_last[n] = idx
        analysis.append({"issue": d["issue"], "date": d["date"],
                         "front": d["front"], "back": d["back"],
                         "f_oms": f_oms, "b_oms": b_oms})

    last_idx = total - 1
    cur_f = {n: last_idx - f_last[n] if n in f_last else None
             for n in FRONT_RANGE}
    cur_b = {n: last_idx - b_last[n] if n in b_last else None
             for n in BACK_RANGE}

    f_cls = classify(f_count, FRONT_HOT, FRONT_WARM)
    b_cls = classify(b_count, BACK_HOT, BACK_WARM)

    # --- draws.csv (从新到旧) ---
    with open(DATA / "draws.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["draw_date", "issue", "f1", "f2", "f3", "f4", "f5", "b1", "b2"])
        for d in sorted(draws, key=lambda d: d["issue"], reverse=True):
            w.writerow([d["date"], d["issue"], *d["front"], *d["back"]])

    # --- draw_analysis.csv (从新到旧) ---
    with open(DATA / "draw_analysis.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow([
            "draw_date", "issue",
            "f1", "f2", "f3", "f4", "f5", "b1", "b2",
            "f1_omission", "f2_omission", "f3_omission", "f4_omission", "f5_omission",
            "b1_omission", "b2_omission",
            "front_struct", "back_struct",
            "front_sum", "front_span", "front_odd_even", "front_big_small",
            "front_consec_pairs",
            "front_hot", "front_warm", "front_cold",
            "back_hot", "back_warm", "back_cold",
        ])
        for a in sorted(analysis, key=lambda a: a["issue"], reverse=True):
            fb = Counter(front_bucket(om) for om in a["f_oms"])
            bb = Counter(back_bucket(om) for om in a["b_oms"])
            fs = " ".join(f"{k}{fb[k]}" for k in FRONT_BUCKET_NAMES)
            bs = " ".join(f"{k}{bb[k]}" for k in BACK_BUCKET_NAMES)
            fr = a["front"]
            odd = sum(n % 2 for n in fr)
            big = sum(n >= 18 for n in fr)
            srt = sorted(fr)
            consec = sum(1 for x, y in zip(srt, srt[1:]) if y - x == 1)
            fh = sum(1 for n in fr if f_cls[n] == "热")
            fw = sum(1 for n in fr if f_cls[n] == "温")
            bh = sum(1 for n in a["back"] if b_cls[n] == "热")
            bw = sum(1 for n in a["back"] if b_cls[n] == "温")
            w.writerow([
                a["date"], a["issue"],
                *fr, *a["back"],
                *[("" if om is None else om) for om in a["f_oms"]],
                *[("" if om is None else om) for om in a["b_oms"]],
                fs, bs,
                sum(fr), max(fr) - min(fr),
                f"奇{odd}偶{5 - odd}", f"大{big}小{5 - big}",
                consec,
                fh, fw, 5 - fh - fw,
                bh, bw, 2 - bh - bw,
            ])

    # --- number_stats.csv ---
    def stats_row(zone, n, count, cur, gaps):
        return [zone, n, count[n], round(count[n] / total, 4), cur,
                max(gaps) if gaps else "",
                round(sum(gaps) / len(gaps), 1) if gaps else ""]

    with open(DATA / "number_stats.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["zone", "number", "appearances", "appear_rate",
                    "current_omission", "max_omission", "avg_omission", "class"])
        for n in FRONT_RANGE:
            w.writerow([*stats_row("front", n, f_count, cur_f[n], f_gaps[n]),
                        f_cls[n]])
        for n in BACK_RANGE:
            w.writerow([*stats_row("back", n, b_count, cur_b[n], b_gaps[n]),
                        b_cls[n]])

    print("wrote draws.csv, draw_analysis.csv, number_stats.csv")


if __name__ == "__main__":
    main()
