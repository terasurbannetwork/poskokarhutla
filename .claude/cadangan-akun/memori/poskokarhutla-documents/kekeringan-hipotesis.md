---
name: kekeringan-hipotesis
description: "Owner chose to keep showing drought numbers that fail backtest, with a clear \"hipotesis\" pill, and retune thresholds later in the model block"
metadata:
  node_type: memory
  type: project
  originSessionId: c25baee3-0a11-45d7-9dd6-c23c00a203d6
  modified: 2026-10-19T11:07:50.583Z
---

19 Oct 2026: kekeringan status thresholds (SPI-3 <= -1 Waspada, <= -1.5 Siaga) failed backtest against 288 DIBI drought events 2023-26. POD 22%, FAR 97%, CSI 0.026 vs random 0.012; no period passed the pre-set criteria (POD >= 0.5, FAR <= 0.8, CSI >= 2x random). Despite this, Dampak shows about 195 million people in Siaga/Awas kab, and the hidden Posko tab shows 148 million.

Owner's decision: "Tetap tampilkan angka kekeringan dengan pil hipotesis yang jelas, lalu setel ulang ambangnya di blok model."

**Why:** the owner prefers visible, honestly labelled numbers over hiding the module.

**How to apply:** do not hide kekeringan jiwa or posko numbers. Every number derived from the status carries a clear "hipotesis" pill. Threshold retuning belongs to B3b in docs/multi-bencana/RENCANA-20-JAM-2.md: Opus designs, the worker implements, and validasi-model checks. Drop the pill only when a period-split backtest passes. Related: [[kendali-mutu]], [[aturan-berulang]]
