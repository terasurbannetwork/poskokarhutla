#!/usr/bin/env node
// Hook UserPromptSubmit: bila prompt pemilik meminta fitur, modul, atau sistem baru, ingatkan agent untuk
// langsung merekomendasikan paket dokumen modul (pemilik 1 Nov, dipertegas 10 Nov 2026). Keluaran stdout = konteks tambahan.
import {readFileSync} from "node:fs";

let prompt = "";
try { prompt = JSON.parse(readFileSync(0, "utf8")).prompt || ""; } catch { process.exit(0); }
const POLA = /\b(fitur|modul|sistem|aplikasi|halaman|program)\s+(baru|lain|besar|strategis)\b|\b(bikin|buat|bangun|baut)(kan)?\s+(fitur|modul|sistem|aplikasi|program)\b/i;
if (POLA.test(prompt)) {
  console.log("PENGINGAT PAKET MODUL (pemilik 1 dan 10 Nov 2026, seperti SIPPA): fitur besar disiapkan penuh dari hulu ke hilir SEBELUM kode, di " +
    "data/kajian-bnpb/<modul>/: KEPUTUSAN, RISET (GitHub, praktik lazim, kode repo), PRD, ALUR, ALGORITMA, " +
    "DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET, GLOSARIUM, plus bagian 'baca dulu, baru bangun' " +
    "di AGENTS.md dan agent pengerja. Pertanyaan yang belum dijawab pemilik ditulis, tidak dikarang. Gerbang: tests/agen/gerbang-paket-modul.test.mjs.");
}
