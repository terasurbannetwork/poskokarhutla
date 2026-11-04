#!/usr/bin/env node
// Hook UserPromptSubmit: bila prompt pemilik menyebut slide, PPT, deck, paparan, atau presentasi, wajibkan skill ppt-konsultan
// (pemilik 3 Nov 2026: deck dibuat dari HTML tanpa header/footer BNPB karena skill-nya tidak terdaftar). Keluaran stdout = konteks.
import {readFileSync} from "node:fs";

export const POLA = /\b(ppt|pptx|power ?point|slide|slides|deck|paparan|presentasi|bahan tayang)\b/i;
export const PESAN = "PENGINGAT DECK BNPB (pemilik 3 dan 4 Nov 2026): semua slide/PPT/paparan WAJIB lewat Skill ppt-konsultan " +
  "(~/.claude/skills/ppt-konsultan, mesin bnpb/scripts/deck.py, akar bnpb/assets/proyek-*), satu-satunya pembangun PPT pemilik. " +
  "Skill deck-bnpb dan ppt-format-bnpb di repo ini PENSIUN (salinan mesin lama): jangan dipakai. Format baku: sampul berlogo dengan " +
  "penyaji bernama lengkap (Kepala BNPB: Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)) dan kota-tanggal, " +
  "slide daftar-isi, pembatas-seksi per bagian + penanda bagian di pita atas, footer 'Badan Nasional Penanggulangan Bencana  |  Copyright 2026' " +
  "+ nomor halaman, Roboto, grafik native, anti-AI. Dilarang membangun deck dari HTML/Chrome print-to-pdf. Kirim PPTX + PDF. " +
  "Gerbang: tests/agen/gerbang-skill-deck.test.mjs.";

if (import.meta.url === `file://${process.argv[1]}`) {
  let prompt = "";
  try { prompt = JSON.parse(readFileSync(0, "utf8")).prompt || ""; } catch { process.exit(0); }
  if (POLA.test(prompt)) console.log(PESAN);
}
