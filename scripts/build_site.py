#!/usr/bin/env python3
"""从 data/*.csv 生成网站用的 data.js。"""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SITE = ROOT / "site"
SITE.mkdir(exist_ok=True)


def main():
    draws = []
    with open(DATA / "draw_analysis.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            draws.append({
                "d": row["draw_date"], "i": row["issue"],
                "f": [int(row[f"f{k}"]) for k in range(1, 6)],
                "b": [int(row["b1"]), int(row["b2"])],
                "fo": [int(row[f"f{k}_omission"]) if row[f"f{k}_omission"] != "" else -1
                       for k in range(1, 6)],
                "bo": [int(row["b1_omission"]) if row["b1_omission"] != "" else -1,
                       int(row["b2_omission"]) if row["b2_omission"] != "" else -1],
                "fs": row["front_struct"], "bs": row["back_struct"],
                "sum": int(row["front_sum"]), "span": int(row["front_span"]),
                "oe": row["front_odd_even"], "bsx": row["front_big_small"],
                "consec": int(row["front_consec_pairs"]),
                "fh": int(row["front_hot"]), "fw": int(row["front_warm"]),
                "fc": int(row["front_cold"]),
                "bh": int(row["back_hot"]), "bw": int(row["back_warm"]),
                "bc": int(row["back_cold"]),
            })
    numbers = []
    with open(DATA / "number_stats.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            numbers.append({
                "z": "f" if row["zone"] == "front" else "b",
                "n": int(row["number"]), "ap": int(row["appearances"]),
                "rate": float(row["appear_rate"]),
                "cur": row["current_omission"],
                "max": row["max_omission"], "avg": row["avg_omission"],
                "cls": row["class"],
            })
    payload = {
        "meta": {"count": len(draws),
                 "newest": draws[0]["i"], "oldest": draws[-1]["i"]},
        "draws": draws, "numbers": numbers,
    }
    out = SITE / "data.js"
    out.write_text("window.DLT = " + json.dumps(payload, ensure_ascii=False,
                                                separators=(",", ":")) + ";",
                   encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size // 1024} KB, "
          f"{len(draws)} draws)")


if __name__ == "__main__":
    main()
