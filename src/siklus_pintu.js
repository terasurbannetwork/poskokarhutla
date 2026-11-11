/* Siklus Bencana F6 dan F7: rute masa depan, pintu tunggal, registri sumber. Kontrak: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md 4; ALGORITMA F7.1 dan F7.2; KEAMANAN-PRIVASI 1.
   TIDAK menyentuh env.DB: SQL ada di bagian Siklus src/hak.js. Masa depan dibaca dari R2 (semua hipotesis, dialirkan tanpa diurai); pintu memakai indeks parsial, LIMIT 50, tanpa pindai.
   Pintu dan masa depan berizin "opsional": tamu atau sesi tanpa hak dilayani sebagai WG (kartu dan ringkasan publik). Kartu ke layar yang belum hidup tidak tampil (layar hidup = berkasnya ada di aset).
   Urutan prioritas (kelas, urgensi, nama) adalah rancangan asumsi-kebijakan (ALGORITMA F7.2). */
import {json, gagal} from "./worker.js";
import * as H from "./hak.js";
import {lingkupKab4, daftarKab4} from "./siklus_kab.js";
import {hariAntara, kesegaran, sisa90, pdna} from "./siklus_hitung.js";
import {NO, masukan, kab4Sah, lihat, dalamBP} from "./siklus_kejadian.js";
import {renkonBP, lingRenkon} from "./siklus_renkon.js";
import {tolak} from "./pusdalops_umum.js";

const tglWib = kini => new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
const FILE = {kejadian: "kejadian.js", publik: "publik.html", paparan: "paparan.js", kaji: "kaji.js", pulih: "pulih.js", renkon: "renkon.js", gladi: "gladi.js", masadepan: "masadepan.js", registri: "registri.js", masadepan_publik: "data/masa_depan_ringkas.json"};
let HIDUP = {t: 0, v: null};   // cache per isolat 5 menit
async function layarHidup(env, url, kini) {
  if (HIDUP.v && kini - HIDUP.t < 300e3) return HIDUP.v;
  const cek = await Promise.all(Object.entries(FILE).map(async ([k, f]) => {
    try { const r = await env.ASSETS.fetch(new Request(new URL("/siklus/" + f, url), {method: "HEAD"})); r.body?.cancel?.(); return r.ok ? k : null; } catch (e) { return null; }
  }));
  HIDUP = {t: kini, v: new Set(cek.filter(Boolean))};
  return HIDUP.v;
}
const stream = (o, tipe = "application/json; charset=utf-8") => new Response(o.body, {headers: {"content-type": tipe, "x-content-type-options": "nosniff"}});

/* ================================================================ masa depan (F6) */
async function masaDepan(c) {
  const q = c.url.searchParams, prov = q.get("prov"), kab4 = q.get("kab4"), contoh = q.get("contoh") === "1", jenis = q.get("jenis");
  masukan(() => {
    if (prov != null && !/^\d{2}$/.test(prov)) tolak("prov harus 2 digit");
    if (kab4 != null) kab4Sah(kab4);
    if (jenis != null && jenis !== "tumbuh") tolak("jenis hanya tumbuh");
    if (contoh && prov == null) tolak("contoh=1 butuh prov");
  });
  if (!c.h || (!prov && !contoh)) {   // WG, atau staf tanpa prov: ringkasan publik saja
    const r = await c.env.ASSETS.fetch(new Request(new URL("/siklus/data/masa_depan_ringkas.json", c.url)));
    if (!r.ok) { r.body?.cancel?.(); return gagal(404, "menunggu: ringkasan masa depan belum dibangun"); }
    return stream(r);
  }
  if (contoh && !c.h.sa) return gagal(403, "contoh hanya untuk Super Admin");
  if (c.h.tipe === "bp" && (!kab4 || !kab4.startsWith(prov) || !lingkupKab4(c.h.akun, kab4))) return NO();   // BP: kabupaten di wilayahnya (berkas per provinsi, layar memilih kabupaten)
  if (!c.env.MEDIA) return gagal(503, "penyimpanan belum terpasang");
  const nama = (jenis === "tumbuh" ? "tumbuh_" : "") + prov + ".json";
  const o = await c.env.MEDIA.get(contoh ? `siklus/saji/_dummy/masadepan/${nama}` : `siklus/saji/masa_depan/${nama}`);
  return o ? stream(o) : gagal(404, "menunggu: berkas masa depan provinsi ini belum dibangun");
}

async function registri(c) {
  if (!c.env.MEDIA) return gagal(503, "penyimpanan belum terpasang");
  const o = await c.env.MEDIA.get("siklus/saji/registri.json");
  return o ? stream(o) : gagal(404, "menunggu: registri sumber belum dibangun");
}

/* ================================================================ pintu (F7) */
const peranPintu = h => !h ? "WG" : h.sa ? "SA" : h.tipe === "bp" ? "BP" : h.ko ? "KO" : h.pd ? "PD" : h.pm ? "PM" : "STAF";
const kartu = (kelas, kode, layar, nama, href, ekstra = {}) => ({kelas, kode, layar, nama, href, urgensi: null, ...ekstra});
const urut = (a, b) => a.kelas - b.kelas || (a.urgensi ?? Infinity) - (b.urgensi ?? Infinity) || a.nama.localeCompare(b.nama);

async function pintu(c) {
  const h = c.h, hariIni = tglWib(c.kini), peran = peranPintu(h), hidup = await layarHidup(c.env, c.url, c.kini), p = h?.pelaku ?? H.pelakuSkStaf;
  const K = [], peringatan = [], fase = new Set();
  if (!h) {   // WG: hanya ringkasan resmi dan ringkasan F6 berpil hipotesis
    for (const k of await H.skKejadianPublikDaftar(c.env, H.pelakuSkStaf, 5)) K.push(kartu(1, "kejadian_publik", "publik", `${k.jenis}: ${k.ringkasan_publik}`.slice(0, 160), `/siklus/kejadian/${k.id}`, {publik: true, yakin: k.yakin, urgensi: hariAntara(k.mulai, hariIni)}));
  } else {
    const dummyOk = h.dummyOk, bp = h.tipe === "bp" ? JSON.stringify(daftarKab4(h.akun)) : null, kej = (await H.skKejadianAktif(c.env, p, dummyOk, bp)).filter(k => lihat(c, k) && dalamBP(c, [k.kab4]));
    for (const k of kej) {
      const nama = `${k.jenis}: ${k.nama}`;
      if (k.fase === "pemulihan") { fase.add("pascabencana"); K.push(kartu(3, "pemulihan", "kejadian", nama, `/siklus/kejadian/${k.id}`)); continue; }
      fase.add("tanggap");
      const mulai = k.tanggap_mulai ?? new Date(k.fase_diubah + 7 * 36e5).toISOString().slice(0, 10), lalu = hariAntara(mulai, hariIni);
      K.push(kartu(1, "kejadian", "kejadian", nama, `/siklus/kejadian/${k.id}`, {fase: k.fase, hari_ke: lalu + 1, urgensi: lalu}));
      if (k.fase === "tanggap" && k.tanggap_akhir) {   // F7-06: peringatan menjelang batas PDNA (BNPB 14 hari, BPBD 7 hari sebelum darurat berakhir)
        const w = pdna(k.tanggap_akhir), batas = h.tipe === "bp" ? w.bpbd : w.bnpb, sisa = hariAntara(hariIni, k.tanggap_akhir);
        if (hariIni >= batas && sisa >= 0) { peringatan.push({jenis: "pdna", kejadian_id: k.id, batas_pdna: batas, akhir_darurat: k.tanggap_akhir, sisa_hari: sisa}); K.push(kartu(2, "pdna", "kejadian", `PDNA: ${nama}`, `/siklus/kejadian/${k.id}`, {urgensi: sisa})); }
      }
    }
    for (const r of await H.skR3pAktifBanyak(c.env, p, kej.map(k => k.id), dummyOk, bp)) {
      fase.add("pascabencana");
      const s = sisa90(r.tanggap_mulai, hariIni);
      K.push(kartu(2, "r3p", "pulih", `R3P ${r.status.replace(/_/g, " ")}`, `/siklus/pulih/${r.jitupasna_id}`, {urgensi: s.sisa}));
    }
    const rkBerlaku = (await H.skRenkonBerlaku(c.env, p, dummyOk, lingRenkon(c))).filter(r => lihat(c, r) && renkonBP(c, r)), rkSusun = (await H.skRenkonDisusun(c.env, p, dummyOk, lingRenkon(c))).filter(r => lihat(c, r) && renkonBP(c, r));
    for (const r of rkBerlaku) {
      const s = kesegaran({tgl_sah: r.tgl_sah, reviu_terakhir: r.reviu_terakhir, berlaku_sampai: r.berlaku_sampai, hariIni});
      if (s.status !== "kedaluwarsa") fase.add("kesiapsiagaan");
      if (s.status === "kedaluwarsa" || s.status === "segera_habis") K.push(kartu(2, "renkon", "renkon", `Renkon ${r.status === "berlaku" && s.status === "kedaluwarsa" ? "kedaluwarsa" : "segera habis"}: ${r.judul}`, `/siklus/renkon/${r.id}`, {urgensi: s.sisa, status: s.status}));
      else if (s.status === "perlu_reviu") K.push(kartu(4, "renkon", "renkon", `Renkon perlu reviu: ${r.judul}`, `/siklus/renkon/${r.id}`, {status: s.status}));
    }
    for (const r of rkSusun) { fase.add("kesiapsiagaan"); K.push(kartu(4, "renkon", "renkon", `Renkon disusun (${r.status}): ${r.judul}`, `/siklus/renkon/${r.id}`, {status: r.status})); }
    if (h.tipe !== "bp") for (const g of await H.skGladiRencana(c.env, p, [...rkBerlaku, ...rkSusun].map(r => r.id), dummyOk)) { fase.add("kesiapsiagaan"); K.push(kartu(4, "gladi", "gladi", `Gladi ${g.jenis} ${g.status}`, `/siklus/gladi/${g.id}`)); }
    K.push(kartu(5, "paparan", "paparan", "Peta paparan bangunan", "/siklus/paparan"));
    if (h.tipe === "staf" && (h.pd || h.ko || h.pm || h.sa)) K.push(kartu(5, "registri", "registri", "Registri sumber data", "/siklus/registri"));
  }
  fase.add("pengurangan_risiko");
  K.push(kartu(5, h ? "masadepan" : "masadepan_publik", h ? "masadepan" : "masadepan_publik", "Risiko masa depan (hipotesis, bukan ramalan kejadian)", h ? "/siklus/masa-depan" : "/siklus/data/masa_depan_ringkas.json", {yakin: "hipotesis"}));
  const ORDE = ["tanggap", "pascabencana", "kesiapsiagaan", "pengurangan_risiko"];
  return json({peran, fase_aktif: ORDE.filter(f => fase.has(f)), kartu: K.filter(k => hidup.has(k.layar)).sort(urut), peringatan, dibuat: new Date(c.kini).toISOString()});
}

export const RUTE_SIKLUS_PINTU = {
  "GET /api/siklus/masadepan": {izin: ["opsional"], f: masaDepan},
  "GET /api/siklus/pintu": {izin: ["opsional"], f: pintu},
  "GET /api/siklus/registri": {izin: ["PDKO", "PM", "SA"], f: registri},
};
