/* Operasi Lapangan OP-2: pengurai pesan WA satgas udara (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 8, "Pengurai bot").
   urai() MURNI (tanpa D1, tanpa jaringan, tanpa LLM): pesan yang tak terbaca ditahan atau dilewati, TIDAK ditebak. Nama kru tidak pernah dibaca atau disimpan.
   Uji: tests/warga/operasi_wa.test.mjs memakai fikstur 15 pesan nyata 2 Nov 2026 (tests/warga/fixtures/operasi_wa_021126.json). */

/* tanda panggil -> registrasi (seed op_armada). Tanda panggil lain tidak ditebak: pesan tertahan "registrasi". */
export const ALIAS = {BYSON234: "HA-5234", COUGAR17: "H-3217"};
/* base rujukan VOR di teks -> pesawat patroli base itu. ponytail: PNK juga dipakai H-3217 (patroli_wb), pesan tanpa registrasi dianggap PK-FPA; KTG hanya PK-ALE. */
export const VOR_PATROLI = {KTG: "PK-ALE", PNK: "PK-FPA"};
/* tanda tangan operator tanpa registrasi di teks. ponytail: satu pesawat per skadron; ganti bila Skadud 6 menurunkan lebih dari satu. */
export const TANDA_TANGAN = [[/Skadron\s+Udara\s+6/i, "H-3217"]];

const BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
/* RA (Rusia) dan HA (TNI AD) di grup satgas selalu berangka: "HA-KOTA", "HA-DUMAI" (ha = hektare di teks) bukan registrasi (ekspor WA 21 Ags-5 Nov 2026) */
const RE_REG = /\b(?:(?:PK|VH|VN|UR|ZK)-[A-Z0-9]{2,5}|(?:RA|HA)-\d{3,5}|RDPL-?\d{3,6}|H-\d{3,4}|A-\d{3,4}|N[ -]?\d{1,5} ?[A-Z]{0,2})\b/gi;
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

export function koordinat(blok) {
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

/* semua registrasi di teks, urut letak: [[indeks, registrasi]]. Yang tak ada di seed dipakai apa adanya hanya bila bertanda hubung. */
function semuaReg(t, armada) {
  const peta = new Map(armada.map(r => [String(r).toUpperCase().replace(/[^A-Z0-9]/g, ""), r])), cari = [];
  for (const m of t.matchAll(RE_REG)) {
    const r = peta.get(m[0].toUpperCase().replace(/[^A-Z0-9]/g, ""));
    if (r) cari.push([m.index, r]); else if (m[0].includes("-")) cari.push([m.index, m[0].toUpperCase()]);
  }
  for (const m of t.matchAll(RE_ALIAS)) { const r = ALIAS[(m[1] + m[2]).toUpperCase()]; if (r) cari.push([m.index, r]); }
  return cari.sort((a, b) => a[0] - b[0]);
}
const rapikanReg = t => t.replace(/\b(PK|VH|VN|RA|HA|UR|ZK|RDPL)\s*-\s*([A-Z0-9]{2,6})\b/gi, "$1-$2");

/* kesiapan armada dari laporan satgas ("Reg. RA-22729 (serviceable)", "N4875A Unserviceable, karena ...", "Reg. UR-VBC: 2 Sortie") -> [{registrasi, status, alasan?}].
   Per baris, dipotong di tiap registrasi: kata status harus SESUDAH registrasinya. Alasan hanya dari daftar tetap (teks bebas bisa memuat nama kru). Satu registrasi satu status: operasi > tidak_siap > siap. */
const PERINGKAT = {operasi: 3, tidak_siap: 2, siap: 1};
export function statusArmada(teks, armada = []) {
  const per = new Map();
  for (const baris of rapikanReg(String(teks ?? "")).split("\n")) {
    const reg = semuaReg(baris, armada);
    reg.forEach(([i, r], n) => {
      const s = baris.slice(i, reg[n + 1]?.[0] ?? baris.length);
      let st = null, alasan;
      const sortie = s.match(/\b(\d{1,2})\s*(?:x\s*)?sorti(?:e)?s?\b/i);
      if (sortie && +sortie[1] > 0) st = "operasi";
      else if (/\bunserviceable\b|\bU\/S\b|tidak\s+operasional|tidak\s+(?:dapat|bisa)\s+(?:terbang|beroperasi)|\bgrounded\b|\bAOG\b/i.test(s)) {
        st = "tidak_siap";
        alasan = /consecutive/i.test(s) ? "batas 7 hari berturut-turut kru" : /maint|perawatan|pemeliharaan|inspeksi|spare\s*part|crack|rotor|\bwire\b|tali/i.test(s) ? "perawatan atau kerusakan" : "tidak laik operasi";
      }
      else if (/\bserviceable\b|\bstand\s?by\b|\bS\/O\b/i.test(s)) st = "siap";
      if (st && (PERINGKAT[st] > (PERINGKAT[per.get(r)?.status] || 0))) per.set(r, {registrasi: r, status: st, ...(alasan ? {alasan} : {})});
    });
  }
  return [...per.values()];
}

export function registrasi(teks, armada) {
  const t = rapikanReg(teks.replace(/Hasil\s+Patroli[^\n]*/gi, "")), cari = semuaReg(t, armada);
  if (cari.length) return cari[0][1];
  for (const [re, r] of TANDA_TANGAN) if (re.test(t)) return r;
  const v = t.match(/\b(?:VOR|Nm\s+from)\s+([A-Z]{3})\b/i);   // hasil patroli satu titik tanpa registrasi: rujukan VOR/base = pesawat patroli base itu
  return v && VOR_PATROLI[v[1].toUpperCase()] || null;
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
  let t = String(teks ?? "").replace(/[​-‏⁠‪-‮﻿]/g, "").replace(/ /g, " ").replace(/\*\*(?=\d{1,2}\s*[.)])/g, "*\n*");
  /* "*FS Enroute*" di atas judul bernomor = titik itu berstatus fs; penanda dibuang supaya tidak menempel ke blok sebelumnya */
  const enroute = new Set();
  t = t.replace(/^[ \t]*\W*FS[ \t]+Enroute\W*\n(\W{0,3}\d{1,2}\s*[.)][^\n]*)$/gim, (_, j) => { enroute.add(j.trim()); return j; });
  if (!t.trim() || !/^\d{4}-\d\d-\d\d$/.test(tanggal || "")) return hasil;
  const reg = registrasi(t, armada);

  /* laporan hasil water bombing ("After WB", "Water Drop"): satu aksi drop = gerak berangkat misi wb bertanda tindakan "drop" (jam = jam pesan, diisi catatOperasi) */
  if (/\bAfter\s+WB\b|Water\s*Drop\b/i.test(t) && !/Before\s+WB/i.test(t)) {
    hasil.dikenali = "water_drop";
    if (!reg) { hasil.tertahan.push({alasan: "registrasi"}); return hasil; }
    const g = {registrasi: reg, jenis: "berangkat", misi: "wb", tindakan: "drop"}, num = (re, ribu) => { const m = t.match(re); return m ? (ribu ? parseInt(m[1].replace(/[.,]/g, ""), 10) : +m[1].replace(",", ".")) : null; };
    const lm = t.match(/\b(?:LOC|Lokasi(?:\s+FS)?)\s*:\s*\**\s*([^\n]+)/i), lok = lm && judulKasus(lm[1].replace(/[*_]/g, "").replace(/\s*\/\s*/g, ", ")), k = RE_KASAR.test(t) ? koordinat(t) : null;
    if (lok || k) g.target = {...(lok ? {lokasi: lok} : {}), ...(k || {})};
    const dr = num(/(\d+)\s*[xX]\s*WB/), li = num(/([\d.,]+)\s*Liter/i, true), tb = num(/lahan\s+yang\s+terbakar\s*(?:\+-|±|-\+)?\s*(\d+(?:[.,]\d+)?)\s*ha/i), pd = num(/lahan\s+yang\s+dipadamkan\s*(?:\+-|±|-\+)?\s*(\d+(?:[.,]\d+)?)\s*ha/i);
    if (dr != null) g.drops = dr; if (li != null) g.liter = li; if (tb != null) g.luas_terbakar_ha = tb; if (pd != null) g.luas_padam_ha = pd;
    if (/HS\s+Masih\s+Berasap/i.test(t)) g.lapor = "masih_berasap"; else if (/HS\s+(?:Clear|Padam)/i.test(t)) g.lapor = "padam";
    hasil.gerak.push(g);
    const eta = t.match(/ETA[^\n]*?(\d{1,2})[:.](\d{2})\s*Z\b/i);
    if (eta) hasil.gerak.push({registrasi: reg, jenis: "kembali", misi: "wb", jam_utc: jamUtc(tanggal, eta[1], eta[2], false)});
    return hasil;
  }

  const kembali = t.match(/Back\s+To\s+Base\s+Due\s+To\s+(.+?)\s+ETA\s+(\d{1,2})[.:](\d{2})\s*WIB/i);
  const tiba = !kembali && /MOVEMENT\s+ARRIVAL|MVT\s+ARRIVAL|Arr(?:ival)?\s+Mov/i.test(t);
  const berangkat = !tiba && /DEPARTURE\s+MOVEMENT|MVT\s+DEPARTURE|Movement\s+Departure|Departure\s+MVT/i.test(t);
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
      const ft = tiba && t.match(/Flight\s+Time\s*:?\s*\**\s*(\d{1,2}):(\d{2})/i); if (ft && +ft[2] < 60) g.menit_terbang = +ft[1] * 60 + +ft[2];
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
      /* lokasi target = baris bermakna terakhir SEBELUM koordinat pertama (bukan baris pertama sesudah "target": "PLM - TARGET FIRE SPOT- PLM" diikuti jam Eng.Start, pesan Mi-8 3 Nov) */
      const k = koordinat(t), L = t.split("\n"), iK = L.findIndex(l => RE_KASAR.test(l)), i = L.findIndex(l => /target/i.test(l));
      const lok = i >= 0 && iK > i ? L.slice(i + 1, iK).reverse().find(l => l.replace(/[*_\s]/g, "") && !RE_JUNK.test(l) && !/#|:\s*\d/.test(l)) : null;
      const titik = titikRute(t); if (titik.length > 1) g.rute = JSON.stringify(titik);
      if (titik.length) g.target = {...(titik[0].lokasi ? {lokasi: titik[0].lokasi} : {}), lat: titik[0].lat, lon: titik[0].lon};
      else if (k) g.target = {...(lok ? {lokasi: judulKasus(lok)} : {}), ...k}; else if (RE_KASAR.test(t)) hasil.tertahan.push({alasan: "koordinat"});
    }
    hasil.gerak.push(g);
    if (kembali || ((misi === "demobilisasi" || misi === "mobilisasi" || misi === "ferry") && berangkat)) hasil.status.push({registrasi: reg, status: "tidak_siap", alasan: g.alasan});
    if (!tiba) return hasil;   // Arr Mov memuat hasil tiap titik patroli: lanjut membaca temuan di bawah
  }

  const L = t.split("\n"), judul = L.map((l, i) => RE_JUDUL.test(l) ? i : -1).filter(i => i >= 0);
  const blok = judul.length >= 2 ? judul.map((s, n) => L.slice(s, judul[n + 1] ?? L.length)) : [L], lihat = new Map();
  for (const b of blok) {
    const isi = b.join("\n"), st = statusDari(isi) ?? (enroute.has(b[0].trim()) ? "fs" : null);
    if (!st) continue;
    const k = koordinat(isi);
    if (!k && !RE_KASAR.test(isi)) continue;   // status tanpa letak sama sekali (mis. laporan RTB): bukan temuan
    const iK = b.findIndex(l => RE_KASAR.test(l)), depan = b.slice(0, iK < 0 ? b.length : iK), iJ = depan.findLastIndex(l => RE_JUDUL.test(l));
    const lok = judulKasus((iJ >= 0 ? depan.slice(iJ) : depan.filter(l => l.replace(/[*_\s]/g, "") && !RE_JUNK.test(l) && !(registrasi(l, armada) && !/^\W*\d/.test(l))).slice(-3)).map(judulKasus).filter(Boolean).join(", ")).replace(/^New Hs On Route,?\s*/i, "");
    const lu = isi.match(/(?:±|\+-|-\+|luas[^\n\d]{0,30})\s*(\d+(?:[.,]\d+)?)\s*ha\b/i);
    const e = {registrasi: reg, ...(lok ? {lokasi: lok} : {}), ...(k || {}), status: st, ...(lu ? {luas_klaim_ha: +lu[1].replace(",", ".")} : {})};
    hasil.dikenali ||= "temuan";
    if (!k) hasil.tertahan.push({alasan: "koordinat", ...(lok ? {lokasi: lok} : {})});
    else if (!reg) { const {registrasi: _, ...sisa} = e; hasil.tertahan.push({alasan: "registrasi", ...sisa}); }
    else lihat.set(`${reg}|${k.lat}|${k.lon}`, e);   // blok tertempel ganda: yang terakhir menggantikan
  }
  hasil.temuan = [...lihat.values()];
  /* laporan harian satgas per provinsi: kesiapan tiap pesawat */
  hasil.status = statusArmada(t, armada);
  if (hasil.status.length) hasil.dikenali ||= "status_armada";
  if (!hasil.dikenali && /BEFORE\s+WB|Water\s+Source|Water\s+Drop/i.test(t)) hasil.dikenali = "bukti_wb";
  return hasil;
}

/* stempel foto lapangan ("3 Nov 2026 11.17.48 / 1°6'41"S 110°4'46"E / ... / VH-L6T/PT.EDC/OPS", 12 PM dibolehkan) -> {jam_utc, lat, lon, registrasi}; yang tak terbaca = null, tidak ditebak.
   Teks = hasil OCR gateway (macOS Vision), jadi derajat/kutip sering rusak: koordinatStempel lebih toleran daripada koordinat() tetapi tetap wajib belahan N/S/U + E/W/T, menit/detik < 60, batas Indonesia,
   dan HANYA satu pasangan berbeda di seluruh teks (infografis penuh koordinat = null). Detik tunggal yang korup (mis. "2/,564") bisa meleset sampai ~0,014 derajat; menit/derajat yang tak terbaca = null.
   Zona jam stempel = zona lokasi (bujur < 114,5 WIB, < 135 WITA, selain itu WIT); tanpa koordinat dipilih yang paling dekat dengan waktu terima. Stempel > 3 hari dari waktu terima dibuang (jam perangkat salah).
   Jam wajib berdetik ("16.00 WIB" di infografis BMKG bukan stempel). */
const BLN = {jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12};
const KOMPONEN = String.raw`(\d{1,3})[ \t]*[°º:*][ \t]*(\d{1,2})[ \t]*['′’"″”]?[ \t]*(\d{1,2}(?:[ .,/]{1,2}\d{1,3})?)[ \t]*["″”'′’]?[ \t]*[Il|]?[ \t]*`;
const RE_STEMPEL_KOORD = new RegExp(String.raw`(?<![\d.])${KOMPONEN}([NSUnsu])(?![A-Za-z])[ \t]*[,;/]?[ \t]*${KOMPONEN}([EWTewt])(?![A-Za-z])`, "g");
export function koordinatStempel(teks) {
  const ada = new Set(), dd = (d, mn, dt) => { const s = +dt.replace(/[ ,/]+/, "."); return +mn < 60 && s < 60 ? +d + +mn / 60 + s / 3600 : NaN; };
  for (const m of String(teks ?? "").matchAll(RE_STEMPEL_KOORD)) {
    const la = dd(m[1], m[2], m[3]), lo = dd(m[5], m[6], m[7]), lat = bulat(/s/i.test(m[4]) ? -la : la), lon = bulat(/w/i.test(m[8]) ? -lo : lo);
    if (lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5) ada.add(lat + "," + lon); else return null;   // satu pasangan tak sah = teks bukan stempel
  }
  if (ada.size !== 1) return null;   // ambigu = null
  const [lat, lon] = [...ada][0].split(",").map(Number); return {lat, lon};
}
const JAM_STEMPEL = String.raw`(\d{1,2})[.: ](\d{2})[.: ]?(\d{2})\s*(AM|PM)?`, NAMA_BLN = "jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec";
const RE_TGL_A = new RegExp(String.raw`\b(\d{1,2})\s+(${NAMA_BLN})[a-z]*\.?,?\s+(\d{4})\s+${JAM_STEMPEL}`, "i");   // 3 Nov 2026 15.01.55
const RE_TGL_B = new RegExp(String.raw`\b(${NAMA_BLN})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\s+${JAM_STEMPEL}`, "i");   // Nov 3, 2026 15:01:55
export function uraiStempel(teks, {armada = [], diterima = null} = {}) {
  const t = String(teks ?? "").slice(0, 1000).replace(/[ \t]+/g, " ").replace(/[​-‏⁠‪-‮﻿]/g, ""), out = {jam_utc: null, lat: null, lon: null, registrasi: registrasi(t, armada)};
  const k = koordinatStempel(t); if (k) { out.lat = k.lat; out.lon = k.lon; }
  const a = t.match(RE_TGL_A), b = !a && t.match(RE_TGL_B), m = a ? [0, a[1], a[2], a[3], a[4], a[5], a[6], a[7]] : b ? [0, b[2], b[1], b[3], b[4], b[5], b[6], b[7]] : null;
  if (m) {
    let h = +m[4]; const pm = m[7]?.toUpperCase(); if (pm === "PM" && h < 12) h += 12; if (pm === "AM" && h === 12) h = 0;
    if (h < 24 && +m[5] < 60 && +m[6] < 60) {
      const lokal = Date.UTC(+m[3], BLN[m[2].toLowerCase()] - 1, +m[1], h, +m[5], +m[6]), dari = z => lokal - z * 36e5;
      const zona = k && !(diterima && k.lon >= 113.5 && k.lon <= 116.5) ? (k.lon < 114.5 ? 7 : k.lon < 135 ? 8 : 9) : diterima ? [7, 8, 9].reduce((a, z) => Math.abs(dari(z) - diterima) < Math.abs(dari(a) - diterima) ? z : a) : 7;
      const j = dari(zona); if (diterima == null || Math.abs(j - diterima) <= 3 * 864e5) out.jam_utc = j;
    }
  }
  return out;
}
