/* Siklus Bencana F2 (Peta Paparan): rute baca yang mengalirkan berkas R2 siklus/saji/. Kontrak: DESAIN-TEKNIS.md bagian 4 dan 9 butir 6; KEAMANAN-PRIVASI.md.
   Membungkus pola src/bangunan.js (kirim dan PROV dipakai ulang); /api/bangunan/* dan bangunan/* TIDAK disentuh. TIDAK menyentuh env.DB (jejak baca_rinci lewat hak.js).
   Urutan: gerbang peran (src/siklus.js, 401/403 SEBELUM R2) -> masukan (400) -> lingkup BP (404 seragam) -> contoh (SA) -> laju (rinci) -> R2 -> jejak (hanya bila berkas terkirim).
   `contoh=1`: hanya SA, hanya dari siklus/saji/_dummy/paparan/ (kembaran susunan produksi), tidak pernah dicampur data nyata. */
import {gagal} from "./worker.js";
import {tolak} from "./pusdalops_umum.js";
import {kirim, PROV} from "./bangunan.js";
import * as H from "./hak.js";
import {lingkupKab4} from "./siklus_kab.js";
import {masukan, kab4Sah, ujiLaju} from "./siklus_kejadian.js";

const AWAL = "siklus/saji/", AWAL_CONTOH = "siklus/saji/_dummy/paparan/";
const NO = () => gagal(404, "tidak ada");

/* jenis -> kunci R2; contoh memakai awalan _dummy/paparan/ dengan nama yang sama */
const kunci = (jenis, nilai, contoh) => contoh
  ? `${AWAL_CONTOH}${{ringkas: "", kab: "kab/", fasilitas: "fasilitas/", rinci: "rinci/"}[jenis]}${nilai}.json`
  : `${AWAL}${{ringkas: "paparan/", kab: "paparan/kab/", fasilitas: "fasilitas/", rinci: "paparan/rinci/"}[jenis]}${nilai}.json`;

/* contoh=1 hanya SA; nilai lain selain "1" ditolak */
function contohSah(c) {
  const v = c.url.searchParams.get("contoh");
  if (v == null) return {contoh: false};
  if (v !== "1") tolak("contoh harus 1");
  if (!c.h.sa) return {galat: gagal(403, "mode contoh hanya untuk Super Admin")};
  return {contoh: true};
}

function layani(jenis, {param}) {
  return async c => {
    const nilai = masukan(() => {
      const v = c.url.searchParams.get(param);
      if (param === "prov") { if (!PROV.has(v)) tolak("prov harus kode provinsi 2 digit"); return v; }
      return kab4Sah(v ?? "", "kab4");
    });
    const mode = masukan(() => contohSah(c));
    if (mode.galat) return mode.galat;
    if (param === "kab4" && c.h.tipe === "bp" && !lingkupKab4(c.h.akun, nilai)) return NO();
    if (jenis === "rinci") { const lj = await ujiLaju(c, "sk.rinci", 300); if (lj) return lj; }
    const r = await kirim(c.env, kunci(jenis, nilai, mode.contoh), mode.contoh ? "berkas contoh belum dibuat (jalankan scripts/siklus/dummy_saji.py)" : "data paparan belum dibangun");
    if (r.ok && jenis === "rinci" && !mode.contoh) await H.skJejakBacaRinci(c.env, c.h.pelaku, c.h.oleh, nilai, c.kini, c.h.dummy ? 1 : 0);
    return r;
  };
}

export const RUTE_SIKLUS_PAPARAN = {
  "GET /api/siklus/paparan/ringkas": {izin: ["STAF"], f: layani("ringkas", {param: "prov"})},
  "GET /api/siklus/paparan/kab": {izin: ["STAF", "BP"], f: layani("kab", {param: "kab4"})},
  "GET /api/siklus/fasilitas": {izin: ["PDKO", "PM", "BP"], f: layani("fasilitas", {param: "kab4"})},
  "GET /api/siklus/paparan/rinci": {izin: ["PDKO", "BP"], f: layani("rinci", {param: "kab4"})},
};

/* mode contoh hidup bila ada berkas di _dummy/paparan/ (dipakai rute dummy) */
export async function contohAda(env) {
  if (!env.MEDIA) return null;
  return (await env.MEDIA.list({prefix: AWAL_CONTOH, limit: 1})).objects.length > 0;
}
