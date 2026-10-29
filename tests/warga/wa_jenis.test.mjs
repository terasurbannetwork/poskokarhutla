/* Pelacak kedatangan laporan WA (src/wa_jenis.js + GET /api/wa/rekap). Hanya mencatat TIBA atau belum, tidak membaca angka.
   Jalankan: node --test tests/warga/wa_jenis.test.mjs */
import assert from "node:assert/strict";
import {test} from "node:test";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
const {kenali, JENIS_LAPORAN} = await import("../../src/wa_jenis.js");

const REKAP = j => `*Yth. Kepala BNPB*\nCC: Deputi Penanganan Darurat\nMohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal 24/10/2026 pkl 07.00 WIB s.d 25/10/2026 pkl ${j}.00 WIB`;
const BMKG = "Laporan Meteorologi dan Klimatologi (BMKG)\n_Hotspot_ ...";
const CONTOH = {
  rekap_koordalops_24: [REKAP("07"), ""],
  rekap_koordalops_12: [REKAP("19"), ""],
  laphar_pdf: ["", "Laporan Harian Dit. Koordalops 28 Okt 2026.pdf"],
  karhutla_mensesneg: ["Yth. Bapak Mensesneg\n*LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS*", ""],
  satgas: ["*LAPORAN UPAYA PEMADAMAN KARHUTLA OLEH SATGAS DI ENAM PROVINSI PRIORITAS*", ""],
  bmkg_pagi: ["Selamat pagi *Bapak Kepala BNPB*, berikut " + BMKG, ""],
  bmkg_malam: ["Selamat malam *Bapak Kepala BNPB*, berikut " + BMKG + " pukul 19.00 WIB", ""],
  pvmbg_pagi: ["Selamat pagi, laporan aktivitas gunung api PVMBG pukul 07.00 WIB", ""],
  pvmbg_malam: ["Selamat malam, laporan aktivitas gunung api  _PVMBG_ ", ""],
  gelar_armada: ["*GELAR PESAWAT DAN HELIKOPTER*\nPosisi 28 Okt", ""],
  dry_ice_omc: ["LAPORAN PENGGUNAAN DRY ICE OMC", ""],
  hujan_omc: ["*PEMANTAUAN HUJAN PASCA PELAKSANAAN OPERASI MODIFIKASI CUACA*", ""],
  bpbd_kejadian: ["Perkembangan Kejadian Banjir\nPembuat Laporan: Kepala Pelaksana BPBD Provinsi Jawa Timur", ""],
};

test("tiap jenis dikenali dari kepalanya, selain itu null", () => {
  assert.deepEqual(Object.keys(CONTOH), JENIS_LAPORAN.map(j => j.kunci));
  for (const [k, [teks, nama]] of Object.entries(CONTOH)) assert.equal(kenali(teks, nama), k, k);
  assert.equal(kenali("halo selamat siang", null), null);
  assert.equal(kenali(null, null), null);
  assert.deepEqual(JENIS_LAPORAN.filter(j => j.wajib).map(j => j.kunci), ["rekap_koordalops_24", "laphar_pdf", "karhutla_mensesneg", "satgas", "bmkg_pagi", "pvmbg_pagi"]);
});

const uji = berantai();
const U = await siapkan("uji-wa-jenis", {r2: true, ikat: {WA_KUNCI: "kunci-wa", WA_IZIN: "628123"}}), {api} = U;
const kirim = o => api("POST", "/api/wa/fonnte?k=kunci-wa", {sender: "628123", ...o});

uji("rekap: pintu admin, dedupe tempelan ganda, hari kosong tetap ada", async () => {
  for (const o of [{message: `28/10/2026 ${REKAP("07")}`}, {message: `28/10/2026 ${REKAP("07")}`}, {message: "28/10/2026 " + CONTOH.satgas[0]},
    {message: "", url: "", filename: "x"}, {message: "28/10/2026 obrolan biasa"}]) await kirim(o);
  assert.equal((await api("GET", "/api/wa/rekap?sampai=2026-10-29&hari=3")).s, 403);
  assert.equal((await api("GET", "/api/wa/rekap?sampai=salah", undefined, ADMIN)).s, 400);
  const r = await api("GET", "/api/wa/rekap?sampai=2026-10-29&hari=3", undefined, ADMIN);
  assert.equal(r.s, 200, r.t); assert.equal(r.h.get("cache-control"), "no-store");
  assert.equal(r.j.sampai, "2026-10-29"); assert.equal(r.j.hari, 3); assert.equal(r.j.jenis.length, 13);
  assert.deepEqual(r.j.per.map(p => p.tanggal), ["2026-10-29", "2026-10-28", "2026-10-27"]);
  const h = r.j.per[1];
  assert.equal(h.isi.rekap_koordalops_24.n, 1, "tempelan ganda dihitung sekali");
  assert.ok(h.isi.rekap_koordalops_24.terakhir > 1e12); assert.equal(h.isi.satgas.n, 1); assert.equal(h.lain, 1);
  assert.deepEqual(r.j.per[0], {tanggal: "2026-10-29", isi: {}, lain: 0}); assert.deepEqual(r.j.per[2].isi, {});
  assert.equal((await api("GET", "/api/wa/rekap?hari=99", undefined, ADMIN)).j.per.length, 31);
});
