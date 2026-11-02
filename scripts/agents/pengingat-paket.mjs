#!/usr/bin/env node
// Hook UserPromptSubmit: bila prompt pemilik meminta fitur, modul, atau sistem baru, ingatkan agent untuk
// langsung merekomendasikan paket dokumen modul (pemilik 1 Nov 2026). Keluaran stdout = konteks tambahan.
import {readFileSync} from "node:fs";

let prompt = "";
try { prompt = JSON.parse(readFileSync(0, "utf8")).prompt || ""; } catch { process.exit(0); }
const POLA = /\b(fitur|modul|sistem|aplikasi|halaman|program)\s+(baru|lain)\b|\b(bikin|buat|bangun|baut)\s+(fitur|modul|sistem|aplikasi|program)\b/i;
if (POLA.test(prompt)) {
  console.log("PENGINGAT PAKET MODUL (pemilik 1 Nov 2026): fitur atau modul baru dimulai dari paket dokumen di " +
    "data/kajian-bnpb/<modul>/ sebelum kode: KEPUTUSAN, RISET (GitHub, praktik lazim, kode repo), PRD, ALUR, ALGORITMA, " +
    "DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET, GLOSARIUM, plus baris 'baca dulu, baru bangun' " +
    "di AGENTS.md dan agent pengerja. Rekomendasikan paketnya tanpa diminta. Gerbang: tests/agen/gerbang-paket-modul.test.mjs.");
}
