#!/usr/bin/env node
// Hook UserPromptSubmit: bila prompt pemilik menyebut slide, PPT, deck, paparan, atau presentasi, wajibkan skill deck BNPB
// (pemilik 3 Nov 2026: deck dibuat dari HTML tanpa header/footer BNPB karena skill-nya tidak terdaftar). Keluaran stdout = konteks.
import {readFileSync} from "node:fs";

export const POLA = /\b(ppt|pptx|power ?point|slide|slides|deck|paparan|presentasi|bahan tayang)\b/i;
export const PESAN = "PENGINGAT DECK BNPB (pemilik 3 Nov 2026): semua slide/PPT/paparan WAJIB lewat Skill deck-bnpb " +
  "(.claude/skills/deck-bnpb, mesin data/kajian-bnpb/bangun/pptx/deck.py di templat-bnpb.pptx) dan pedoman " +
  "docs/pedoman-deck/ppt-format-bnpb.md: logo + footer baku 'Badan Nasional Penanggulangan Bencana  |  Copyright 2026' + " +
  "nomor halaman, Roboto, grafik native, anti-AI. Dilarang membangun deck dari HTML/Chrome print-to-pdf. Kirim PPTX + PDF. " +
  "Gerbang: tests/agen/gerbang-skill-deck.test.mjs.";

if (import.meta.url === `file://${process.argv[1]}`) {
  let prompt = "";
  try { prompt = JSON.parse(readFileSync(0, "utf8")).prompt || ""; } catch { process.exit(0); }
  if (POLA.test(prompt)) console.log(PESAN);
}
