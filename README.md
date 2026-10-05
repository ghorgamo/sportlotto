# 大乐透历史数据 · Daletou History

记录超级大乐透近 500 期开奖数据及衍生分析：开奖日期、期数、号码、
每球开出前遗漏、遗漏结构、热/温/冷分布等。

## 数据文件

| 文件 | 说明 |
|---|---|
| `data/draws.csv` | 基础开奖表：`draw_date, issue, f1..f5, b1..b2`（从新到旧） |
| `data/draw_analysis.csv` | 逐期分析表（从新到旧），见下 |
| `data/number_stats.csv` | 号码统计表：出球数、出球率、当前遗漏、最大/平均遗漏、热/温/冷分类 |
| `data/draws_raw.txt` | 原始抓取行：`期号\|日期\|前区\|后区`（构建脚本的输入） |

### draw_analysis.csv 列说明

- `f1..f5, b1..b2`：本期号码
- `f1_omission..b2_omission`：该球**开出前**的遗漏期数（距离上次开出间隔了几期；0 = 上期开出即重号）
- `front_struct`：前区遗漏结构，如 `重1 短1 中2 偏1 大0`
- `back_struct`：后区遗漏结构，如 `重0 短1 中1 长0`
- `front_sum`：前区和值；`front_span`：前区跨度（最大−最小）
- `front_odd_even`：奇偶比，如 `奇2偶3`；`front_big_small`：大小比（≥18 为大），如 `大2小3`
- `front_consec_pairs`：前区连号对数
- `front_hot/front_warm/front_cold`、`back_hot/back_warm/back_cold`：本期热/温/冷球个数

## 口径定义

**遗漏分档（前区）**：重 = 0，短 = 1–2，中 = 3–5，偏 = 6–10，大 = 11+
**遗漏分档（后区）**：重 = 0，短 = 1–4，中 = 5–8，长 = 9+

**热/温/冷**：按 500 期内出球数排名——前区前 12 为热、中间 11 为温、后 12 为冷；
后区前 4 为热、中间 4 为温、后 4 为冷。排名并列时按号码从小到大顺延。

**边界说明**：数据集最早的若干期，部分号码在数据集内无历史开出记录，
其"开出前遗漏"记为空，在遗漏结构中计入大冷（前区）/长遗漏（后区）档。

## 更新数据

```bash
# 1) 抓取最新(官方 API,有反爬虫,被拦截时用真实浏览器按文件顶部说明操作)
python3 scripts/fetch_history.py

# 2) 重新构建衍生数据集
python3 scripts/build_datasets.py
```

构建脚本只依赖 Python 标准库。

## 数据来源

500.com datachart 历史开奖接口
（`datachart.500.com/dlt/history/newinc/history.php`），已用 61 期已知数据
做过 100% 交叉验证。体彩官方开奖接口（`webapi.sporttery.cn`，gameNo=85）
有反爬墙（Tencent EdgeOne 567 硬拦截，curl 与真实浏览器均不可达），
暂不作为抓取源，仅在 `scripts/fetch_history.py` 顶部注释保留其地址。

数据仅作个人研究记录，不构成任何投注建议。
