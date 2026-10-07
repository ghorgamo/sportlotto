#!/usr/bin/env python3
"""抓取大乐透历史开奖数据(增量更新)。

数据源: 500.com datachart
    https://datachart.500.com/dlt/history/newinc/history.php?start={s}&end={e}
返回 HTML 表格 <tbody id="tdata">,每行: 期号,前区x5,后区x2,...,开奖日期。
(官方 webapi.sporttery.cn 接口有反爬墙,见 README;本脚本用的数据源
已用 61 期已知数据做过 100% 交叉验证。)

输出合并到 data/draws_raw.txt,每行:
    drawNum|drawDate|frontDrawNumber|backDrawNumber  (从新到旧)
之后运行 scripts/build_datasets.py 重建衍生表。
"""

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/126.0 Safari/537.36"),
}


def fetch_range(start, end):
    url = ("https://datachart.500.com/dlt/history/newinc/history.php"
           f"?start={start}&end={end}")
    req = urllib.request.Request(url, headers=HEADERS)
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8",
                                                                errors="ignore")
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    m = re.search(r'<tbody id="tdata">(.*?)</tbody>', html, re.S)
    if not m:
        raise ValueError("页面未包含开奖数据表(可能被拦截)")
    rows = []
    for tr in re.findall(r"<tr.*?>(.*?)</tr>", m.group(1), re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        c = [re.sub(r"<[^>]+>", "", x).strip() for x in tds]
        if len(c) >= 15 and re.fullmatch(r"\d{5}", c[0]):
            front = ",".join(f"{int(x):02d}" for x in c[1:6])
            back = ",".join(f"{int(x):02d}" for x in c[6:8])
            rows.append(f"{c[0]}|{c[14]}|{front}|{back}")
    return rows


def read_existing():
    raw_file = DATA / "draws_raw.txt"
    rows = []
    if raw_file.exists():
        rows = [line for line in raw_file.read_text(encoding="utf-8").splitlines()
                if line.strip() and not line.startswith("TOTAL=")]
    return rows


def issue_of(line):
    return line.split("|")[0]


def main():
    old = read_existing()
    old_issues = {issue_of(line) for line in old}
    max_issue = max(old_issues, default="23001")
    start, end = str(int(max_issue) - 5), str(int(max_issue) + 500)
    try:
        fresh = fetch_range(start, end)
    except Exception as e:  # noqa: BLE001 - 如实报告抓取失败
        print(f"抓取失败: {e}", file=sys.stderr)
        sys.exit(1)
    # 按期号去重,新数据优先(新在前,保留首次出现)
    merged, seen = [], set()
    for line in fresh + old:
        issue = issue_of(line)
        if issue not in seen:
            seen.add(issue)
            merged.append(line)
    new_count = sum(1 for line in fresh if issue_of(line) not in old_issues)
    (DATA / "draws_raw.txt").write_text("\n".join(merged) + "\n",
                                        encoding="utf-8")
    print(f"新增 {new_count} 期,共 {len(merged)} 期 -> data/draws_raw.txt")
    print("接下来运行: python3 scripts/build_datasets.py")


if __name__ == "__main__":
    main()
