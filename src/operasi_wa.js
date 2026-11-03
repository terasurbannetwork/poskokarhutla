/* Operasi Lapangan OP-2: pengurai pesan WA satgas udara (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 8, "Pengurai bot").
   urai() MURNI (tanpa D1, tanpa jaringan, tanpa LLM): pesan yang tak terbaca ditahan atau dilewati, TIDAK ditebak. Nama kru tidak pernah dibaca atau disimpan.
   Uji: tests/warga/operasi_wa.test.mjs memakai fikstur 15 pesan nyata 2 Nov 2026 (tests/warga/fixtures/operasi_wa_021126.json). */

/* tanda panggil -> registrasi (seed op_armada). Tanda panggil lain tidak ditebak: pesan tertahan "registrasi". */
export const ALIAS = {BYSON234: "HA-5234", COUGAR17: "H-3217"};
/* tanda tangan operator tanpa registrasi di teks. ponytail: satu pesawat per skadron; ganti bila Skadud 6 menurunkan lebih dari satu. */
export const TANDA_TANGAN = [[/Skadron\s+Udara\s+6/i, "H-3217"]];

const BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const RE_REG = /\b(?:(?:PK|VH|VN|RA|HA|UR|ZK)-[A-Z0-9]{2,5}|RDPL-\d{3,6}|H-\d{3,4}|A-\d{3,4}|N[ -]?\d{1,5} ?[A-Z]{0,2})\b/gi;
const RE_ALIAS = /\b(BYSON|COUGAR)\s?(\d{1,4})\b/gi;
const RE_DMS = /(?:\b([NSEW])[ \t]*:?[ \t]*)?(\d{1,3})(?:[ \t]*[°º][ \t]*|[ \t]+)(\d{1,2})[ \t]*['′’´][ \t]*(\d{1,2}(?:[.,]\d+)?)[ \t]*(?:["″”“]|''|′′|’’)(?:[ \t]*([NSEW])\b)?/gi;
const RE_DESIMAL = /(?:\b([NSEW])[ \t]*:?[ \t]*)?(-?\d{1,3}\.\d{3,})[ \t]*°?(?:[ \t]*([NSEW])\b)?/gi;
const RE_KASAR = /[°º′’″”]|\d[ \t]*['"]|^[ \t]*[NSEW][ \t]*:?[ \t]*\d/im;
const RE_JUDUL = /^\W{0,3}\d{1,2}\s*[.)]\s*\S/;
const RE_JUNK = /DITEMUKAN|enroute|remark|rmks|regards|assalam|mohon|laporkan|target|before wb|patroli|sortie|^\W*(reg|type|loc)\b/i;
const bulat = x => Math.round(x * 1e5) / 1e5;

/* "Senin, 2 November 2026" -> "2026-11-02"; tidak ada/tidak sah -> null */
export function tanggalOperasi(teks) {
  const m = String(teks ?? "").match(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\b/i);
  if (!m) return null;
  const iso = `${m[3]}-${String(BULAN.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`, d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

function koordinat(blok) {
  const it = [];
  for (const m of blok.matchAll(RE_DMS)) {
    const mn = +m[3], dt = +m[4].replace(",", ".");
    if (mn >= 60 || dt >= 60) return null;
    it.push({h: (m[1] || m[5] || "").toUpperCase(), v: +m[2] + mn / 60 + dt / 3600});
  }
  if (!it.length) for (const m of blok.matchAll(RE_DESIMAL)) it.push({h: (m[1] || m[3] || "").toUpperCase(), v: Math.abs(+m[2]), neg: m[2].startsWith("-")});
  if (!it.length) return null;
  if (it.some(x => !x.h) && it.length === 2 && !it.some(x => x.h)) { it[0].h = it[0].neg ? "S" : "N"; it[1].h = it[1].neg ? "W" : "E"; }   // desimal bertanda tanpa belahan
  if (it.some(x => !x.h)) return null;
  const a = it.find(x => x.h === "N" || x.h === "S"), o = it.find(x => x.h === "E" || x.h === "W");
  if (!a || !o) return null;
  const lat = bulat(a.h === "S" ? -a.v : a.v), lon = bulat(o.h === "W" ? -o.v : o.v);
  return lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5 ? {lat, lon} : null;
}

function judulKasus(s) {
  const t = s.replace(/[*_]/g, "").replace(/^\W{0,3}\d{1,2}\s*[.)]\s*/, "").replace(/\s+/g, " ").trim().replace(/[\s.,]+$/, "");
  const h = /[a-z]/.test(t) ? t : t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return h.replace(/,(?=\S)/g, ", ").replace(/\b(Kab|Kec)\.(?=\S)/gi, (_, a) => a[0].toUpperCase() + a.slice(1).toLowerCase() + ". ").replace(/\s+/g, " ");
}

function registrasi(teks, armada) {
  const peta = new Map(armada.map(r => [String(r).toUpperCase().replace(/[^A-Z0-9]/g, ""), r]));
  const t = teks.replace(/Hasil\s+Patroli[^\n]*/gi, "").replace(/\b(PK|VH|VN|RA|HA|UR|ZK|RDPL)\s+-\s*([A-Z0-9]{2,6})\b/gi, "$1-$2"), cari = [];
  for (const m of t.matchAll(RE_REG)) {
    const r = peta.get(m[0].toUpperCase().replace(/[^A-Z0-9]/g, ""));
    if (r) cari.push([m.index, r]); else if (m[0].includes("-")) cari.push([m.index, m[0].toUpperCase()]);
  }
  for (const m of t.matchAll(RE_ALIAS)) { const r = ALIAS[(m[1] + m[2]).toUpperCase()]; if (r) cari.push([m.index, r]); }
  if (cari.length) return cari.sort((a, b) => a[0] - b[0])[0][1];
  for (const [re, r] of TANDA_TANGAN) if (re.test(t)) return r;
  return null;
}

function statusDari(t) {
  if (/berasap\s+tipis/i.test(t)) return "berasap_tipis";
  if (/Target\s+Clear|HS\s+CLEAR/i.test(t)) return "clear";
  if (/FS\s+BERASAP|DITEMUKAN\s+FS/i.test(t)) return "fs";
  if (/berasap/i.test(t)) return "berasap";
  return null;
}

function jamUtc(tanggal, h, m, wib) {
  /* jam Z >= 16 jatuh ke hari UTC sebelumnya: pagi WITA/WIT (mis. 23.05Z = 07.05 WITA) masih tanggal kemarin di UTC. ponytail: malam WIT 00-01 lokal ikut aturan ini, belum ada operasi jam segitu */
  const geser = !wib && +h >= 16 ? -24 : 0;
  const d = new Date(Date.parse(tanggal + "T00:00:00Z") + ((+h - (wib ? 7 : 0) + geser) * 60 + +m) * 60e3);
  return d.toISOString().slice(0, 16) + "Z";
}

/* titik bernomor dalam pesan rencana/keberangkatan -> [{urut, lokasi, lat, lon, sektor?}] (blok tanpa koordinat sah dilewati) */
function titikRute(t) {
  const L = t.split("\n"), awal = L.map((l, i) => RE_JUDUL.test(l) ? i : -1).filter(i => i >= 0), out = [];
  awal.forEach((s, n) => { const b = L.slice(s, awal[n + 1] ?? L.length), k = koordinat(b.join("\n")); if (!k) return;
    const sek = b.join(" ").match(/Sektor\s*(\d{1,2})/i), lok = judulKasus(b[0]);
    out.push({urut: out.length + 1, ...(lok ? {lokasi: lok} : {}), ...k, ...(sek ? {sektor: +sek[1]} : {})}); });
  return out;
}

/* teks: isi pesan. tanggal: YYYY-MM-DD hari operasi (pemanggil: tanggalOperasi(teks) ?? tanggal terima). armada: daftar registrasi seed untuk normalisasi (N814AR -> N-814AR). */
export function urai(teks, {tanggal, armada = []} = {}) {
  const hasil = {dikenali: null, temuan: [], gerak: [], status: [], tertahan: []};
  const t = String(teks ?? "").replace(/[​-‏⁠‪-‮﻿]/g, "").replace(/ /g, " ").replace(/\*\*(?=\d{1,2}\s*[.)])/g, "*\n*");
  if (!t.trim() || !/^\d{4}-\d\d-\d\d$/.test(tanggal || "")) return hasil;
  const reg = registrasi(t, armada);

  const kembali = t.match(/Back\s+To\s+Base\s+Due\s+To\s+(.+?)\s+ETA\s+(\d{1,2})[.:](\d{2})\s*WIB/i);
  const tiba = !kembali && /MOVEMENT\s+ARRIVAL|MVT\s+ARRIVAL/i.test(t);
  const berangkat = !tiba && /DEPARTURE\s+MOVEMENT|MVT\s+DEPARTURE|Movement\s+Departure/i.test(t);
  const rencana = !berangkat && !tiba && /MVT\s+PLAN|rencana\s+penerbangan|Rencana\s+Patroli|Plan\s+Mov/i.test(t);
  /* OMC dan pindah armada diperiksa lebih dulu: pesan OMC sering menyebut "Patroli", pesan demobilisasi menyebut tujuan */
  const misi = /\bOMC\b|Modifikasi\s+Cuaca|Bahan\s+Semai/i.test(t) ? "omc" : /Demobili[sz]ation|Demobilisasi/i.test(t) ? "demobilisasi"
    : /Mobili[sz]ation|Mobilisasi/i.test(t) ? "mobilisasi" : /Ferry\s+Flight/i.test(t) ? "ferry"
    : /Water\s*Bombing|\bWB\b|FIRE\s*SPOT/i.test(t) ? "wb" : /Patrol/i.test(t) ? "patroli" : undefined;
  if (kembali || tiba || berangkat || rencana) {
    hasil.dikenali = kembali || tiba ? "kembali" : berangkat ? "berangkat" : "rencana";
    if (!reg) { hasil.tertahan.push({alasan: "registrasi"}); return hasil; }
    const g = {registrasi: reg, jenis: kembali || tiba ? "kembali" : berangkat ? "berangkat" : "rencana"};
    if (kembali) { g.jam_utc = jamUtc(tanggal, kembali[2], kembali[3], true); }
    else {
      const kode = tiba ? "ATA" : berangkat ? "ATD" : "(?:ETD|ATD)", j = t.match(new RegExp(`${kode}[^\\n]*?(\\d{1,2})[:.](\\d{2})\\s*Z\\b`, "i"));
      const w = !j && t.match(new RegExp(`${kode}[^\\n]*?(\\d{1,2})[:.](\\d{2})\\s*WIB\\b`, "i"));
      if (j) g.jam_utc = jamUtc(tanggal, j[1], j[2], false); else if (w) g.jam_utc = jamUtc(tanggal, w[1], w[2], true);
    }
    if (misi) g.misi = misi;
    if (kembali) g.alasan = kembali[1].trim();
    else if (tiba) { /* kedatangan: cukup jam */ }
    else if (misi === "demobilisasi" || misi === "mobilisasi" || misi === "ferry") {
      const r = t.match(/Route\s*:\s*\**\s*([A-Z]{3,4}(?:\s*[-–]\s*[A-Z]{3,4})+)/i); if (r) g.rute = r[1].replace(/\s+/g, "");
      g.alasan = misi + (g.rute ? " " + g.rute : "");
    }
    else {
      const ru = t.match(/Hasil\s+Patroli[^\n]*?\b((?:PK|VH|VN|HA|UR|ZK|RA)-[A-Z0-9]{2,5})\b/i); if (ru) g.rujukan = ru[1].toUpperCase();
      const k = koordinat(t), L = t.split("\n"), i = L.findIndex(l => /target/i.test(l)), lok = i >= 0 ? L.slice(i + 1).find(l => l.replace(/[*_\s]/g, "") && !RE_KASAR.test(l)) : null;
      const titik = titikRute(t); if (titik.length > 1) g.rute = JSON.stringify(titik);
      if (titik.length) g.target = {...(titik[0].lokasi ? {lokasi: titik[0].lokasi} : {}), lat: titik[0].lat, lon: titik[0].lon};
      else if (k) g.target = {...(lok ? {lokasi: judulKasus(lok)} : {}), ...k}; else if (RE_KASAR.test(t)) hasil.tertahan.push({alasan: "koordinat"});
    }
    hasil.gerak.push(g);
    if (kembali || ((misi === "demobilisasi" || misi === "mobilisasi" || misi === "ferry") && berangkat)) hasil.status.push({registrasi: reg, status: "tidak_siap", alasan: g.alasan});
    return hasil;
  }

  const L = t.split("\n"), judul = L.map((l, i) => RE_JUDUL.test(l) ? i : -1).filter(i => i >= 0);
  const blok = judul.length >= 2 ? judul.map((s, n) => L.slice(s, judul[n + 1] ?? L.length)) : [L], lihat = new Map();
  for (const b of blok) {
    const isi = b.join("\n"), st = statusDari(isi);
    if (!st) continue;
    const k = koordinat(isi);
    if (!k && !RE_KASAR.test(isi)) continue;   // status tanpa letak sama sekali (mis. laporan RTB): bukan temuan
    const iK = b.findIndex(l => RE_KASAR.test(l)), depan = b.slice(0, iK < 0 ? b.length : iK), iJ = depan.findLastIndex(l => RE_JUDUL.test(l));
    const lok = judulKasus((iJ >= 0 ? depan.slice(iJ) : depan.filter(l => l.replace(/[*_\s]/g, "") && !RE_JUNK.test(l) && !(registrasi(l, armada) && !/^\W*\d/.test(l))).slice(-3)).map(judulKasus).filter(Boolean).join(", "));
    const lu = isi.match(/(?:±|\+-|-\+|luas[^\n\d]{0,30})\s*(\d+(?:[.,]\d+)?)\s*ha\b/i);
    const e = {registrasi: reg, ...(lok ? {lokasi: lok} : {}), ...(k || {}), status: st, ...(lu ? {luas_klaim_ha: +lu[1].replace(",", ".")} : {})};
    hasil.dikenali = "temuan";
    if (!k) hasil.tertahan.push({alasan: "koordinat", ...(lok ? {lokasi: lok} : {})});
    else if (!reg) { const {registrasi: _, ...sisa} = e; hasil.tertahan.push({alasan: "registrasi", ...sisa}); }
    else lihat.set(`${reg}|${k.lat}|${k.lon}`, e);   // blok tertempel ganda: yang terakhir menggantikan
  }
  hasil.temuan = [...lihat.values()];
  if (!hasil.dikenali && /BEFORE\s+WB|Water\s+Source|Water\s+Drop/i.test(t)) hasil.dikenali = "bukti_wb";
  return hasil;
}
