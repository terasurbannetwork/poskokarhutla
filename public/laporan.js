"use strict";
/* laporan.js: halaman /laporan (Laporan Harian Karhutla). Membaca /data/laporan.json apa adanya (skema: pipa-data, scripts/data/laporan.py);
   tidak menghitung ulang angka pipeline, hanya selisih/persentase tampilan. Butuh inti/format.js, kartu.js, pilih.js, tip.js, tabel.js. */
/* nama tingkat perhatian platform; "Siaga" milik penetapan resmi BMKG/BNPB/SK, jadi tidak dipakai di sini (audit 21 Okt 2026) */
const LEVEL = ["Pencegahan rutin", "Patroli terpadu", "Pemadaman awal", "Prioritas pemadaman"];
const PER = 20;
const st = {prov: new URLSearchParams(location.search).get("prov") || "", hari: null, manual: false, rentang: "b", cari: "", pk: {}, cetak: false,
  p: {urut: "t", turun: true, hal: 0}, k: {urut: "t", turun: true, hal: 0}};
let D = null;

/* kerja berat ditunda: kontrol diperbarui dulu (urgent), render sesudah satu frame */
/* klik beruntun pada kontrol yang sama digabung: fn yang sudah antre tidak diantre lagi (st sudah mutakhir saat fn jalan) */
const antre = new Set();
const nanti = fn => { if (antre.has(fn)) return; antre.add(fn); let ok = false; const go = () => { if (!ok) { ok = true; antre.delete(fn); fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
/* merek per alamat: *.workers.dev = Centurisk97, selain itu Centurisk97 (pemilik, 17 Okt 2026); data laporan.json ikut diganti di tt() */
const MEREK = "Centurisk97";
const tt = s => String(s ?? "").replace(/\s*[—–]\s*/g, ", ").replace(/Centurisk97/g, MEREK);
const tgl = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"});
const tglPanjang = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
const sum = (a, n) => a.slice(0, n + 1).reduce((x, y) => x + (y || 0), 0);
const IK_CETAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5v-7h15v7H17M7 14h10v6.5H7z"/></svg>';
const IK_NAIK = '<path d="M6 14l4-4 3 3 5-6"/>';

/* perubahan: ▲ merah (naik = lebih buruk) / ▼ hijau; tanpa pembanding atau sama-sama nol = "–" */
function ubah(n, p) {
  if (p == null || n == null) return "–";
  if (!p) return n ? '<span class="naik baru">▲ baru</span>' : "–";   /* .baru: abu seperti kolom "baru" slide deck (hanya kartu peta, laporan.css) */
  const v = Math.round((n - p) / p * 100);
  return v > 0 ? `<span class="naik">▲ ${fmt(v)}%</span>` : v < 0 ? `<span class="turun">▼ ${fmt(-v)}%</span>` : "0%";
}
const ubahTeks = (n, p) => { if (!p) return ""; const v = Math.round((n - p) / p * 100); return v > 0 ? `<span class="naik">▲ ${fmt(v)}%</span>` : v < 0 ? `<span class="turun">▼ ${fmt(-v)}%</span>` : "tetap"; };

const idx = () => D.hari.indexOf(st.hari);
const hariQ = new URLSearchParams(location.search).get("hari") || "";
/* mode provinsi (?prov=62,63): satu atau beberapa provinsi; [] = Indonesia (nasional, perilaku lama).
   Pilihan di kepala jadi bawaan semua pemilih kartu; kartu yang pemilihnya diubah sendiri memakai st.pk[kunci] sampai kepala diganti lagi.
   Beberapa provinsi = seri dijumlah per hari. Kartu yang hanya bermakna nasional disembunyikan (NAS); jumlah kab/kota dari baris D.kab. */
const kodeSah = s => [...new Set(String(s || "").split(","))].filter(k => D.prov[k]);
const provKepala = () => kodeSah(st.prov);
const pilih = kunci => st.pk[kunci] != null ? kodeSah(st.pk[kunci]) : provKepala();
const sCache = new Map();
function seri(P = provKepala()) {
  if (!P.length) return D.nasional;
  const kunci = P.join(); if (sCache.get(kunci)?.d === D) return sCache.get(kunci).s;
  const o = P.map(k => D.prov[k]), kb = kabProv(P), jml = f => D.hari.map((_, i) => o.reduce((a, x) => a + (x[f]?.[i] || 0), 0));
  const s = P.length === 1 ? {...o[0]} : {nama: namaWil(P), titik: jml("titik"), luas: jml("luas"), baru: jml("baru"),
    kompleks: o.reduce((a, x) => a + (x.kompleks || 0), 0), luas_kompleks: o.reduce((a, x) => a + (x.luas_kompleks || 0), 0), level: Math.max(...o.map(x => x.level ?? 0))};
  s.kab = D.hari.map((_, i) => kb.filter(x => x.titik[i] > 0).length);
  sCache.set(kunci, {d: D, s}); return s;
}
const provAda = P => P.length ? P.map(k => D.prov[k]) : Object.values(D.prov);
const kabProv = (P = provKepala()) => P.length ? D.kab.filter(o => P.includes(o.prov)) : D.kab;
const NAS = new Set(["luas", "naikp", "riwayat", "tren", "musim", "cuaca", "konsesi"]);
const namaWil = (P = provKepala()) => !P.length ? "Indonesia" : P.length <= 3 ? (n => n.length > 1 ? n.slice(0, -1).join(", ") + " dan " + n.at(-1) : n[0])(P.map(k => D.prov[k].nama)) : fmt(P.length) + " provinsi";
const tglP = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
/* hari terbaru langsung jadi laporan utama dan dianggap final per cut-off data satelit terakhir (pemilik, 17 Okt 2026);
   tidak ada lagi label "sementara/belum final" atau panel hari berjalan terpisah */
const sementara = () => false;
const pilLv = l => `<span class="lp-lv lv${l}">${LEVEL[l] || "–"}</span>`;

/* ---------- baris data ---------- */
function barisDari(o, i, w) {
  const tp = i > 0 ? o.titik[i - 1] : null, lp = i > 0 ? o.luas[i - 1] : null, t = o.titik[i], l = o.luas[i];
  const b = iB();
  return {t, tp, tb: b > 0 && i === b - 1 ? o.titik[b] : null, db: b > 0 && i === b - 1 ? o.titik[b] - t : null, dt: tp == null ? null : t - tp, l, lp, dl: lp == null ? null : l - lp, kum: sum(o.baru, i),
    kompleks: o.kompleks ?? null, lk: o.luas_kompleks ?? null, level: o.level ?? null, ada: sum(o.titik.slice(Math.max(0, i - w + 1)), w) + sum(o.luas.slice(Math.max(0, i - w + 1)), w) };
}
const jendela = () => st.rentang === "b" ? hariGrafik().length : Math.min(st.rentang, 30);
function barisProv(i = idx(), P = provKepala()) {
  const w = jendela();
  return Object.entries(D.prov).filter(([kode]) => !P.length || P.includes(kode)).map(([kode, o]) => ({kode, nama: o.nama, ...barisDari(o, i, w)}))
    .filter(r => r.ada > 0);
}
function barisKab(i = idx(), P = provKepala()) {
  const w = jendela();
  return kabProv(P).map(o => ({kode: o.prov, prov: D.prov[o.prov]?.nama || "", nama: o.nama, ...barisDari(o, i, w), fwi: o.fwi_maks ?? null}))
    .filter(r => r.ada > 0);
}
function urut(a, s) {
  const k = s.urut, teks = k === "nama" || k === "prov";
  return a.slice().sort((x, y) => {
    const c = teks ? String(x[k]).localeCompare(String(y[k]), "id") : (x[k] ?? -Infinity) - (y[k] ?? -Infinity);
    return (s.turun ? -c : c) || String(x.nama).localeCompare(String(y.nama), "id");
  });
}

/* ---------- grafik SVG ---------- */
const WARNA_TOT = "#33507a", WARNA_SEL = "#c9503a";
function batang(hari, vals, sel, satuan) {
  /* slot minimal 64 unit supaya pil angka (lebar ~56) tidak bertabrakan saat hari banyak (sejak tgl 1 = sampai 31 batang) */
  const n = hari.length, W = Math.max(900, n * 64), H = 290, pb = 30, pt = 62, slot = W / n, bw = Math.min(46, slot * .62), mx = Math.max(...vals, 1), gy = v => pt + (H - pt - pb) * (1 - v / mx);
  let s = `<line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" style="stroke:var(--line)" stroke-width="1.5"/>`;
  hari.forEach((h, i) => {
    const v = vals[i] ?? 0, cx = slot * i + slot / 2, y = gy(v), on = h === sel, sm = false, ix = D.hari.indexOf(h);
    const p = ix > 0 ? ubahTeks(v, satuan.arr[ix - 1]) : "";
    const tip = `<b>${tgl(h)}</b><br>${satuan.nama}: ${fmt(v)} ${satuan.u}${p ? `<br>Perubahan: ${p}` : ""}`.replace(/"/g, "&quot;");
    s += `<g data-tip="${tip}"><rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(2, H - pb - y)}" rx="5" style="fill:${on ? WARNA_SEL : WARNA_TOT}" opacity="${sm ? .55 : 1}"/>`
      + Kartu.pil(cx - (String(fmt(v)).length * 6.6 + 16) / 2, y - 25, fmt(v), on ? WARNA_SEL : "#0b2545", "#fff", 11)[0]
      + pilPersen(cx, y - 49, v, ix > 0 ? satuan.arr[ix - 1] : null)
      + `<text class="lp-sb${on ? " on" : ""}" x="${cx}" y="${H - 8}" text-anchor="middle">${tgl(h)}</text></g>`;
  });
  return `<div class="lp-gr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(satuan.nama)} per hari">${s}</svg></div>`;
}
/* sm = panel hari berjalan (batang pudar seperti batang belum final di grafik harian); mx dipakai bersama supaya dua panel sebanding */
function batangMendatar(rows, W = 1300, sm = false, mx = Math.max(...rows.map(r => r.v), 1)) {
  const bh = 26, g = 8, H = rows.length * (bh + g) + 6, x0 = W > 900 ? 250 : 200;
  let s = "";
  rows.forEach((r, i) => {
    const y = i * (bh + g) + 3, w = Math.max(4, (W - x0 - 110) * r.v / mx), nm = r.nama.length > 30 ? r.nama.slice(0, 29) + "…" : r.nama;
    s += `<g data-tip="${esc(`<b>${r.nama}</b>${r.prov ? `<br>Provinsi: ${r.prov}` : ""}<br>Titik: ${fmt(r.t)}<br>Sebelumnya: ${fmt(r.tp)}<br>Perubahan: ▲ ${fmt(r.v)} titik`)}">`
      + `<text x="${x0 - 10}" y="${y + (r.prov ? 11 : 17)}" text-anchor="end" font-size="12" font-weight="700">${esc(nm)}</text>`
      + (r.prov ? `<text x="${x0 - 10}" y="${y + 23}" text-anchor="end" font-size="9.5" font-weight="600" class="lp-gp">${esc(r.prov)}</text>` : "")
      + `<rect x="${x0}" y="${y}" width="${w}" height="${bh}" rx="6" style="fill:${WARNA_TOT}"${sm ? ' opacity=".55"' : ""}/>`
      + Kartu.pil(x0 + w + 8, y + 3, "▲ " + fmt(r.v), WARNA_SEL, "#fff", 12)[0] + "</g>";
  });
  return `<div class="lp-gr${W > 900 ? " lp-gr-h" : ""}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kenaikan titik terbesar">${s}</svg></div>`;
}

/* pil perubahan harian di atas batang: ▲ merah naik, ▼ hijau turun, abu tetap; tanpa pembanding tidak digambar */
function pilPersen(cx, y, v, p) {
  if (p == null) return "";
  const n = !p ? null : Math.round((v - p) / p * 100), t = n == null ? (v ? "▲ baru" : "0%") : n > 0 ? `▲ ${fmt(n)}%` : n < 0 ? `▼ ${fmt(-n)}%` : "0%";
  const bg = n > 0 || (n == null && v) ? "#fbe3de" : n < 0 ? "#dcefed" : "var(--surface)", fg = n > 0 || (n == null && v) ? "#b8392b" : n < 0 ? "#1f6f6a" : "currentColor";
  return Kartu.pil(cx - (t.length * 6 + 16) / 2, y, t, bg, fg, 10)[0];
}
/* batang per provinsi hari terpilih: titik (batang) dan perubahan harian; rincian lengkap di tooltip. Tanpa luas harian per provinsi (audit 21 Okt 2026 §2.2) */
function batangProv(rows, W = 1300, mxG = 0) {
  const bh = 28, g = 8, H = rows.length * (bh + g) + 6, x0 = 230, mx = mxG || Math.max(...rows.map(r => r.t), 1), i = idx();
  const kem = i > 0 ? tgl(D.hari[i - 1]) : "";
  return `<div class="lp-gr lp-gr-h"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Titik panas per provinsi">${rows.map((r, j) => {
    const y = j * (bh + g) + 3, w = Math.max(3, (W - x0 - 330) * r.t / mx), ub = (n, q) => q == null ? "–" : !q ? (n ? "▲ baru" : "–") : (v => v > 0 ? `▲ ${fmt(v)}%` : v < 0 ? `▼ ${fmt(-v)}%` : "0%")(Math.round((n - q) / q * 100));
    const tip = `<b>${r.nama}</b> · ${tgl(st.hari)}<br>Titik panas: ${fmt(r.t)}${kem ? `<br>Titik ${kem}: ${fmt(r.tp)}<br>Perubahan hotspot: ${ub(r.t, r.tp)}` : ""}<br>Kejadian api: ${fmt(r.kompleks)}<br>Tingkat perhatian: ${LEVEL[r.level] || "–"}`;
    let x = x0 + w + 8, o = `<g data-tip="${esc(tip)}"><text x="${x0 - 10}" y="${y + bh / 2 + 4}" text-anchor="end" font-size="12.5" font-weight="600">${esc(r.nama)}</text>`
      + `<rect x="${x0}" y="${y}" width="${w}" height="${bh}" rx="6" style="fill:${WARNA_TOT}"/>`;
    const [a, wa] = Kartu.pil(x, y + 4, fmt(r.t) + " titik", "#0b2545", "#fff", 11.5); o += a; x += wa + 6;
    o += pilPersen(x + (ub(r.t, r.tp).length * 6 + 16) / 2, y + 4, r.t, r.tp); x += ub(r.t, r.tp).length * 6 + 22;
    return o + "</g>"; }).join("")}</svg></div>`;
}
/* ---------- peta sebaran per provinsi: lingkaran sebanding jumlah titik panas, label untuk provinsi terbanyak ---------- */
let LOGO = "";
/* singkatan provinsi untuk label peta (nama penuh ada di tooltip dan daftar peringkat) */
const SINGKAT = {11: "Aceh", 12: "Sumut", 13: "Sumbar", 14: "Riau", 15: "Jambi", 16: "Sumsel", 17: "Bengkulu", 18: "Lampung", 19: "Babel", 21: "Kepri",
  31: "Jakarta", 32: "Jabar", 33: "Jateng", 34: "DIY", 35: "Jatim", 36: "Banten", 51: "Bali", 52: "NTB", 53: "NTT", 61: "Kalbar", 62: "Kalteng",
  63: "Kalsel", 64: "Kaltim", 65: "Kaltara", 71: "Sulut", 72: "Sulteng", 73: "Sulsel", 74: "Sultra", 75: "Gorontalo", 76: "Sulbar", 81: "Maluku",
  82: "Malut", 91: "Papua", 92: "Pabar", 93: "Papsel", 94: "Papteng", 95: "Papeg", 96: "PBD"};
fetch("/img/logo.svg?v=2").then(r => r.text()).then(t => { LOGO = t.replace(/<title>.*?<\/title>/, ""); if (D) semua(); }).catch(() => {});
let GEO = null;   /* {d: {kode: path}, c: {kode: [x, y]}} sekali proyeksi; geo/provinsi.json dimuat malas */
const PW = 1000, PH = 400, PS = PW / 46, pj = ([lo, la]) => [(lo - 95) * PS, (6.5 - la) * PS];
/* satu janji bersama: kartuPeta dipanggil berkali-kali sebelum GEO siap (muat awal, peta_karhutla.json selesai, klik kontrol), file 381 KB tetap diminta sekali;
   gagal = janji dibuang supaya render berikutnya mencoba lagi */
let geoP, geoMenunggu = false;
const muatGeo = () => geoP ||= muatGeoSekali().catch(e => { geoP = null; throw e; });
async function muatGeoSekali() {
  const g = await fetch("/geo/provinsi.json").then(r => r.json()), d = {}, c = {};
  for (const f of g.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let s = "", best = 0;
    for (const p of polys) {
      const pts = p[0].map(pj); let a = 0, cx = 0, cy = 0, lx = -9, ly = -9, seg = "";
      pts.forEach(([x, y], i) => { const j = pts[(i + 1) % pts.length], k = x * j[1] - j[0] * y; a += k; cx += (x + j[0]) * k; cy += (y + j[1]) * k;
        if (Math.abs(x - lx) + Math.abs(y - ly) > .8) { seg += (seg ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); lx = x; ly = y; } });
      if (Math.abs(a) > 4) s += seg + "Z";
      if (Math.abs(a) > best) { best = Math.abs(a); c[f.properties.kode] = [cx / (3 * a), cy / (3 * a)]; }
    }
    d[f.properties.kode] = s;
  }
  GEO = {d, c};
}
/* peta interaktif (pemilik, 21 Okt 2026): ukuran Hotspot / Luas terbakar / Belum padam dan periode (hari, minggu, bulan, rentang, 12 bulan) dari
   data/peta_karhutla.json, dijumlah modul peta_karhutla.js. Warna mengikuti deck BNPB. Tanpa berkas itu kartu memakai laporan.json (modelLama). */
let PKD, PKmuat = false, petaKet = "", petaCetak = "", petaFokus = null;   /* PKD: undefined = belum dimuat, null = tak ada atau rusak, objek = siap */
const pet = {metrik: "hot", mode: "hari", ref: "", a: "", b: ""};
function muatPK() {
  const R = window.PetaKarhutla; if (PKmuat || !R) return; PKmuat = true;
  fetch("/data/peta_karhutla.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
    if (j && !R.cek(j)) { PKD = R.siapkan(j); petaGambar(); } else if (PKD === undefined) PKD = null; });
}
/* jangkar periode: pilihan pengguna, atau hari terakhir data. Sengaja TIDAK mengikuti st.hari: kartu memakai hari kalender WIB (00.00-23.59, metode deck BNPB),
   kartu lain memakai hari laporan s.d. 16.00 WIB; satu tanggal bersama akan menampilkan dua jumlah berbeda (keputusan satu definisi hotspot: pemilik) */
const jangkarPK = () => pet.ref || PKD.hari.at(-1);
/* nm (judul, tooltip, keterangan): luas dan belum padam adalah hitungan dari deteksi, bukan hasil pengecekan regu darat, tetapi tulisan "(perkiraan satelit)" dibuang (pemilik, 22 Okt 2026);
   pil = kepala kolom daftar; jml/ada = legenda; kosong = judul bila tak ada deteksi (tiada deteksi bukan bukti tiada api) */
const INFO_PK = {
  hot: {nm: "Hotspot", pil: "Hotspot", sat: "titik", jml: "jumlah titik panas", ada: "titik panas", kosong: "Tidak ada titik panas"},
  luas: {nm: "Luas terbakar", pil: "Luas terbakar", sat: "ha, satelit", jml: "luas area terbakar", ada: "area terbakar", kosong: "Tidak ada area terbakar terdeteksi satelit"},
  belum: {nm: "Masih terdeteksi (perkiraan satelit)", pil: "Masih terdeteksi", sat: "ha, satelit", jml: "luas deteksi satelit yang bertahan", ada: "deteksi satelit yang bertahan", kosong: "Tidak ada deteksi satelit yang bertahan"}};
function modelPK(P) {
  const R = window.PetaKarhutla, m = pet.metrik, ref = jangkarPK(), I = INFO_PK[m], [, , warna, muda] = R.METRIK.find(x => x[0] === m);
  const r = R.rentang(PKD, pet.mode, ref, pet.a, pet.b) || {i0: PKD.n - 1, i1: PKD.n - 1}, [kw, lw] = R.waktuBagian(PKD, pet.mode, r.i0, r.i1, m);
  const nm = m === "luas" && r.i0 !== r.i1 ? "Jumlah luas harian" : I.nm;   /* luas periode = jumlah harian: area yang sama bisa terhitung di beberapa hari */
  const w = `${kw} <span class="lp-w">${lw}</span>`, wTeks = `${kw} ${lw}`;   /* label tanggal di simpulnya sendiri: kalimat tetap terjemahan tetap, tanggal ikut locale */
  const bd = R.banding(PKD, m, r.i0, r.i1), {sekarang, sebelum, nama} = bd, v = x => m === "hot" ? `${fmt(x)} titik` : `${fmt(x)} ha`, mt = PKD.metode || {};   /* luas satelit: angka persis seperti deck (pilihan pemilik 22 Okt 2026), tanpa tanda plus-minus */
  const rows = PKD.kode.filter(k => !P.length || P.includes(k)).map(k => ({k, nama: PKD.prov[k].nama, t: sekarang[k] || 0, tp: sebelum ? sebelum[k] || 0 : null})).filter(x => x.t > 0).sort((a, c) => c.t - a.t);
  const tot = rows.reduce((a, x) => a + x.t, 0), totNas = PKD.kode.reduce((a, k) => a + (sekarang[k] || 0), 0), top = rows[0];   /* porsi selalu dari total nasional */
  const j = !top ? `${I.kosong} ${w}` : m === "hot" ? `${Kartu.hl(fmt(rows.length))} provinsi mencatat titik panas ${w}, terbanyak ${Kartu.hl(esc(top.nama))} (${Kartu.hl(fmt(top.t))} titik)`
    : `${nm} ${Kartu.hl(fmt(tot) + " ha")} ${w}, terbanyak ${Kartu.hl(esc(top.nama))} (${v(top.t)})`;
  const dari = r.i0 === r.i1 ? "hari sebelumnya" : "periode sebelumnya";
  /* kaki: tiap kalimat di simpulnya sendiri supaya terjemahan EN per kalimat (teks metode dari JSON diterjemahkan per kunci di en.json) */
  const tetap = t => [t, "."];   /* kalimat tetap: titik penutup di luar simpul, supaya kunci en.json tanpa titik */
  const kal = [tetap("NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21); batas wilayah BIG"), PKD.cutoff ? [`Cut-off ${jamWIB(PKD.cutoff)}.`] : null,
    tetap("Hari = kalender WIB 00.00–23.59; kartu lain di halaman ini memakai hari laporan s.d. 16.00 WIB, jadi angka tanggal yang sama bisa berbeda"),
    m === "belum" ? tetap("Luas kejadian api yang masih terdeteksi satelit; bukan status regu dan bukan \"luas belum padam\" BNPB yang dicek regu darat") : null,
    m === "luas" && r.i0 !== r.i1 ? tetap("Luas periode = jumlah perkiraan harian; area yang sama bisa terhitung di beberapa hari") : null,
    m === "luas" ? tetap("Perkiraan satelit per provinsi memakai titik NOAA-20/21 x porsi; tidak sebanding dengan angka resmi BNPB") : null,
    mt[m] ? [I.pil + ":"] : null, mt[m] ? [mt[m]] : null, ...(mt.catatan || []).map(c => [c])].filter(Boolean);
  return {rows, j, ctl: R.kontrol(PKD, pet, ref), pakaiB: false, dft: rows.slice(0, 10), ey: P.length ? "Peta " + namaWil(P) : "Peta provinsi", sat: m === "hot" ? " titik" : " ha",
    kepala: `<div class="lp-rkh"><span>Provinsi · ${R.STOK.has(m) ? "per " + R.label(PKD, "hari", r.i1, r.i1, true) : R.label(PKD, pet.mode, r.i0, r.i1, true)}</span><b style="--mk:${warna};--mu:${muda}">${I.pil} <small>(${I.sat})</small></b></div>`,
    ket: `${nm} ${w}${PKD.cutoff ? ` <span class="lp-co">Cut-off ${jamWIB(PKD.cutoff)}</span>` : ""}`,
    cetak: [PKD.cutoff ? `Cut-off ${jamWIB(PKD.cutoff)}.` : "", mt.catatan?.[0] || ""].filter(Boolean).map(esc).join(" "),   /* cetak: satu baris catatan agar perkiraan tetap tertulis di kertas */
    aria: `Peta ${m === "hot" ? "titik panas" : nm.toLowerCase()} tiap provinsi ${wTeks}`,
    sumber: kal.map(([t, x = ""]) => `<span>${esc(t)}</span>${x}`).join(" "),
    leg: [["#D9600B", `Ukuran lingkaran sebanding ${I.jml}`], ["#051C2C", "Provinsi dengan " + I.ada], ["#DCE1E7", "Tanpa deteksi"],
      ["#D9600B", "naik dari " + dari], ["#2F86D1", "turun dari " + dari]],
    tip: x => `<b>${esc(x.nama)}</b><br>${nm}: ${v(x.t)}${x.tp != null && nama ? `<br>${esc(nama)}: ${v(x.tp)}` : bd.celah ? "<br>Perubahan: tidak ditampilkan (data satelit tidak lengkap)" : ""}<br>Porsi: ${fmt(Math.round(x.t / (totNas || 1) * 100))}%`};
}
/* model dari laporan.json: bawaan lama; dipakai bila peta_karhutla.json belum ada/rusak, dan di mode satu provinsi (butuh baris kab/kota) */
function modelLama(P, K) {
  const b = iB(), pakaiB = st.petaH === "b" && b > 0, i = pakaiB ? b : idx(), h = D.hari[i], S = seri();
  const rows = Object.entries(D.prov).map(([k, o]) => ({k, nama: o.nama, t: o.titik[i] || 0, tp: i > 0 ? o.titik[i - 1] : null})).filter(r => r.t > 0 && (!P.length || P.includes(r.k))).sort((a, c) => c.t - a.t);
  const totNas = Object.values(D.prov).reduce((a, o) => a + (o.titik[i] || 0), 0);   /* porsi selalu dari total nasional */
  const teks = (ix, rs) => K ? `${Kartu.hl(esc(D.prov[K].nama))} mencatat ${Kartu.hl(fmt(S.titik[ix]))} titik panas di ${Kartu.hl(fmt(S.kab[ix]))} kab/kota` : rs.length ? `${Kartu.hl(fmt(rs.length))} provinsi mencatat titik panas, terbanyak ${Kartu.hl(esc(rs[0].nama))} (${Kartu.hl(fmt(rs[0].t))} titik)` : "Tidak ada titik panas tercatat";
  const rowsDi = ix => Object.entries(D.prov).filter(([k]) => !P.length || P.includes(k)).map(([, o]) => ({nama: o.nama, t: o.titik[ix] || 0})).filter(r => r.t > 0).sort((a, c) => c.t - a.t);
  const j = poinBerjalan(teks(idx(), rowsDi(idx())), x => teks(x, rowsDi(x)));
  const ctl = b > 0 ? Kartu.seg("petaH", [["", tgl(st.hari)], ["b", tgl(D.hari[b]) + " (belum final)"]], {petaH: pakaiB ? "b" : ""}) : "";
  const dft = K ? barisKab().filter(r => r.t > 0).sort((a, c) => c.t - a.t).slice(0, 10).map(r => ({nama: r.nama, t: r.t, tp: r.tp})) : rows.slice(0, 10);
  return {rows, j, ctl, pakaiB, dft, kepala: "", ket: "", cetak: "", sat: " titik", ey: P.length ? "Peta " + namaWil(P) : "Peta provinsi", aria: `Peta titik panas tiap provinsi ${tgl(h)}`,
    sumber: "NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21); batas wilayah BIG",
    leg: [["#D9600B", "Ukuran lingkaran sebanding jumlah titik panas"], ["#051C2C", "Provinsi dengan titik panas"], ["#DCE1E7", "Tanpa titik panas"],
      ["#D9600B", "naik dari hari sebelumnya"], ["#2F86D1", "turun dari hari sebelumnya"]],
    tip: r => `<b>${esc(r.nama)}</b><br>Titik panas: ${fmt(r.t)}${r.tp != null ? `<br>Hari sebelumnya: ${fmt(r.tp)}` : ""}<br>Porsi: ${fmt(Math.round(r.t / (totNas || 1) * 100))}%`};
}
/* gambar ulang kartu peta saja (kontrol metrik/periode, atau peta_karhutla.json / geo baru selesai dimuat). sampul() sengaja tidak di sini: ia menyalin
   158 KB SVG ke elemen yang tersembunyi di layar, jadi dikerjakan di beforeprint saja */
function petaGambar() {
  isi("peta", kartuPeta);
  const f = petaFokus; petaFokus = null;
  if (f) requestAnimationFrame(() => { const e = document.querySelector(`[data-ex="peta"] [data-pk="${f[0]}"]${f[1] != null ? `[data-v="${f[1]}"]` : ""}`), t = e && !e.disabled ? e : document.querySelector('[data-ex="peta"] [data-pk="ref"]');
    (t?.closest(".pc")?.querySelector(".pc-btn") || t)?.focus({preventScroll: true}); });
}
function kartuPeta() {
  muatPK();
  const P = provKepala(), K = P.length === 1 ? P[0] : "", M = PKD && !K ? modelPK(P) : modelLama(P, K), rows = M.rows, pakaiB = M.pakaiB;
  petaKet = M.ket; petaCetak = M.cetak;
  if (!GEO) {
    if (!geoMenunggu) { geoMenunggu = true; muatGeo().then(petaGambar).catch(() => {}).finally(() => { geoMenunggu = false; }); }   /* satu penunggu saja, berapa kali pun kartu digambar */
    return Kartu.kartu("Peta provinsi", M.j, '<div class="kosong">Memuat peta…</div>', M.sumber, M.ctl); }
  const mx = Math.max(1, rows[0]?.t || 1), rad = t => 5 + 33 * Math.sqrt(t / mx), ada = new Set(P.length ? P : rows.map(r => r.k));
  let s = Object.entries(GEO.d).map(([k, p]) => `<path d="${p}" class="${ada.has(k) ? "pp-on" : P.length ? "pp pp-d" : "pp"}"/>`).join("");
  /* lingkaran kecil di atas yang besar supaya semuanya terlihat */
  const bul = rows.filter(r => GEO.c[r.k]).map(r => ({...r, x: GEO.c[r.k][0], y: GEO.c[r.k][1], r: rad(r.t)}));
  s += bul.slice().reverse().map(r => `<circle cx="${r.x.toFixed(1)}" cy="${r.y.toFixed(1)}" r="${r.r.toFixed(1)}" class="pc${pakaiB ? " sm" : ""}" data-tip="${esc(M.tip(r))}"/>`).join("");
  /* label: lingkaran besar (r >= 22) memuat angka + singkatan di dalam; lainnya diberi pil putih "Singkatan angka" di luar,
     disambung garis tipis. Posisi pil dicari melingkar (8 arah, 3 jarak) yang tidak menutup pil lain, lingkaran, atau tepi peta */
  s += bul.filter(r => r.r >= 22).map(r => `<text x="${r.x.toFixed(1)}" y="${(r.y + 2).toFixed(1)}" class="pa">${fmt(r.t)}</text>`
    + `<text x="${r.x.toFixed(1)}" y="${(r.y + 14).toFixed(1)}" class="pn">${SINGKAT[r.k] || ""}</text>`).join("");
  const LH = 17, pil = [], kena = (x, y, w) => x < 2 || x + w > PW - 2 || y < 2 || y + LH > PH - 2
    || pil.some(q => x < q[0] + q[2] + 3 && x + w + 3 > q[0] && y < q[1] + LH + 3 && y + LH + 3 > q[1])
    || bul.some(c => { const nx = Math.max(x, Math.min(c.x, x + w)), ny = Math.max(y, Math.min(c.y, y + LH)); return (nx - c.x) ** 2 + (ny - c.y) ** 2 < (c.r + 2) ** 2; });
  let garis = "", label = "";
  for (const r of bul.filter(r => r.r < 22)) {
    const nm = SINGKAT[r.k] || "", n = fmt(r.t) + M.sat, w = nm.length * 5.9 + n.length * 6.6 + 18;   /* pil memuat satuan (titik / ha) */
    let pos = null;
    for (const d of [8, 18, 30, 46, 64]) { for (let a = 0; a < 16 && !pos; a++) { const ang = -Math.PI / 4 - a * Math.PI / 8,
      cx = r.x + Math.cos(ang) * (r.r + d + w / 2), cy = r.y + Math.sin(ang) * (r.r + d + LH / 2), x = cx - w / 2, y = cy - LH / 2;
      if (!kena(x, y, w)) pos = [x, y, cx, cy]; } if (pos) break; }
    if (!pos) continue;
    const [x, y, cx, cy] = pos; pil.push([x, y, w]);
    const dd = Math.hypot(cx - r.x, cy - r.y) || 1, ex = r.x + (cx - r.x) * r.r / dd, ey = r.y + (cy - r.y) * r.r / dd;
    const tx = Math.max(x, Math.min(r.x, x + w)), ty = Math.max(y, Math.min(r.y, y + LH));
    if (Math.hypot(tx - ex, ty - ey) > 3) garis += `<line x1="${ex.toFixed(1)}" y1="${ey.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" class="pl"/>`;
    label += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><rect width="${w.toFixed(1)}" height="${LH}" rx="8.5" class="pk"/>`
      + `<text x="8" y="12" class="pt-t"><tspan class="pt-n">${nm}</tspan> <tspan class="pt-v">${n}</tspan></text></g>`;
  }
  s += garis + label;
  const daftar = M.dft.map((r, n) => `<li><span class="pr">${n + 1}</span><span class="pnm">${esc(r.nama)}</span><b>${fmt(r.t)}</b>${r.tp != null ? `<span class="pub">${ubah(r.t, r.tp)}</span>` : ""}</li>`).join("");
  return Kartu.kartu(M.ey, M.j, `<div class="lp-pt-w"><div class="lp-peta"><svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(M.aria)}">${s}</svg></div><div class="lp-rkw">${M.kepala}<ol class="lp-rk">${daftar}</ol></div></div>`,
    M.sumber, M.ctl, M.leg);
}
function kartuProvGrafik() {
  const P = pilih("provM"), semuaRows = barisProv(idx(), []), rows = semuaRows.filter(r => !P.length || P.includes(r.kode)).sort((a, b) => b.t - a.t);
  const kode = semuaRows.map(r => r.kode).sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
  const naik = rows.filter(r => r.tp != null && r.t > r.tp).length;
  const j = rows.length ? poinBerjalan(`Titik panas naik di ${Kartu.hl(fmt(naik) + " dari " + fmt(rows.length))} provinsi pada ${tgl(st.hari)}${idx() > 0 ? ` dibanding ${tgl(D.hari[idx() - 1])}` : ""}`, b => {
    const rb = barisProv(b, P);
    return `Titik panas naik di ${Kartu.hl(fmt(rb.filter(r => r.tp != null && r.t > r.tp).length) + " dari " + fmt(rb.length))} provinsi pada ${tgl(D.hari[b])} dibanding ${tgl(D.hari[b - 1])}`; }) : "Tidak ada provinsi yang cocok";
  /* kertas: dua kolom selebar setengah halaman supaya huruf tetap terbaca (satu kolom 38 baris menyusut sampai tak terbaca) */
  const h2 = Math.ceil(rows.length / 2), cetak = `<div class="lp-prt">${batangProv(rows.slice(0, h2), 760, rows[0].t || 1)}${rows.length > 1 ? batangProv(rows.slice(h2), 760, rows[0].t || 1) : ""}</div>`;
  /* grafik selalu memakai hari terpilih (tertutup); label harinya ditulis supaya tidak tertukar dengan poin hari berjalan */
  const lbl = `<div class="lp-gh"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><span class="lp-gh-k">Data grafik</span><b>${tglHari(st.hari)}</b>`
    + `<i></i><span>Cut-off ${cutoff(st.hari)}</span>${idx() > 0 ? `<i></i><span>▲▼ dibanding ${tgl(D.hari[idx() - 1])}</span>` : ""}</div>`;
  return Kartu.kartu("Per provinsi", j, rows.length ? lbl + `<div class="lp-scr">${batangProv(rows)}</div>` + cetak : '<div class="kosong">Pilih minimal satu provinsi</div>', tt(D.sumber.titik),
    selPilih("provM", kode));
}

/* tabel harian di bawah grafik: hari terbaru di atas, hari terpilih ditandai; kol = [[judul, (i) => isi sel, angka?]] */
/* baris riwayat per triwulan: judul bagian + satu baris per triwulan yang sudah genap, terbaru di atas.
   Triwulan berjalan tidak ditampilkan (pemilik, 17 Okt 2026): bulan berjalan sudah ada di baris harian di atasnya.
   sel(q, triwulan sebelumnya, indeks) -> isi kolom angka; "" = sel kosong tanpa tanda */
function riwayatTw(sel, snpp = true, tb = D.tahun_berjalan) {
  const tw = (tb?.triwulan || []).slice(0, -1); if (!tw.length) return "";
  const th = tb.sd.slice(0, 4), kolom = sel(tw[0], null, 0).length;
  return `<tr class="lp-twh"><td colspan="${kolom + 1}">Riwayat per triwulan ${th}${snpp ? ' <span class="lp-co">VIIRS S-NPP</span>' : ""}</td></tr>`
    + tw.map((q, i) => `<tr class="lp-tw"><td><b>${q.nama} ${th}</b></td>`
      + sel(q, tw[i - 1], i).map(v => `<td class="n">${v}</td>`).join("") + "</tr>").reverse().join("");
}
/* kertas: grafik dipendekkan sesuai jumlah baris tabel supaya kartu (kepala + grafik + tabel + sumber) muat satu halaman
   A4 mendatar (isi 174 mm, baris ~4,1 mm, sisanya ~46 mm). ponytail: bulan > ~28 baris tetap meluber, grafik berhenti di 22 mm */
const pasCetak = (grafik, tabel) => `<div style="--gr:${Math.max(22, Math.min(48, 128 - (tabel.match(/<tr/g) || []).length * 4.1)).toFixed(0)}mm">${grafik}${tabel}</div>`;
/* tot(ix) = sel baris "Total <rentang>" di bawah baris harian; ix = indeks D.hari yang tampil.
   gt = [label, sel...] baris "Grand total" paling bawah (sesudah riwayat triwulan), latar navy */
function tabelHarian(kol, ekor = "", tot = null, gt = null) {
  const hs = hariGrafik().slice().reverse(), ix = hs.map(h => D.hari.indexOf(h));
  const baris = tot && hs.length > 1 ? `<tr class="lp-tot"><td>Total ${tgl(hs.at(-1))} s.d. ${tgl(hs[0])} ${hs[0].slice(0, 4)}</td>${tot(ix).map(v => `<td class="n">${v}</td>`).join("")}</tr>` : "";
  return `<div class="tw lp-th"><table class="lp-tb"><thead><tr><th>Tanggal</th>${kol.map(k => `<th${k[2] ? ' class="n"' : ""}>${k[0]}</th>`).join("")}</tr></thead><tbody>${hs.map(h => {
    const i = D.hari.indexOf(h);
    return `<tr class="${h === st.hari ? "lp-on" : ""}"><td>${tglPanjang(h)}</td>${kol.map(k => `<td${k[2] ? ' class="n"' : ""}>${k[1](i)}</td>`).join("")}</tr>`; }).join("")}${baris}${ekor}${gt ? `<tr class="lp-gt"><td>${gt[0]}</td>${gt.slice(1).map(v => `<td class="n">${v}</td>`).join("")}</tr>` : ""}</tbody></table></div>`;
}

/* ---------- kartu ---------- */
/* pilihan rentang baru muncul bila arsip sudah lebih dari 7 hari (sebelumnya 7 dan 14 hari tampil sama) */
/* "b" = sejak tanggal 1 bulan hari terakhir (bawaan); riwayat sebelumnya diringkas per triwulan di bawah tabel */
const awalBulan = () => D.hari.at(-1).slice(0, 8) + "01";
/* pemilih provinsi (boleh beberapa): kepala = "prov", kartu = kunci di st.pk yang bawaannya ikut kepala */
const kodeProv = () => Object.keys(D.prov).sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
const selPilih = (kunci, daftar = kodeProv()) => Kartu.selProvMulti(kunci, daftar, k => D.prov[k].nama, {[kunci]: (kunci === "prov" ? provKepala() : pilih(kunci)).join(",")}, "Indonesia");
const segRentang = () => D.hari.length > 7 ? Kartu.seg("rentang", [[7, "7 hari"], [14, "14 hari"], ["b", "Sejak " + tgl(awalBulan())]], st) : "";
const hariGrafik = () => st.rentang === "b" ? D.hari.filter(h => h >= awalBulan()) : D.hari.slice(-st.rentang);

/* tiap poin diawali label harinya, jadi "pada <tanggal>" di kalimat dibuang (sudah tertulis di label) */
const tglHari = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
/* cut-off tiap hari: hari terbaru = data satelit terakhir (ikut tiap pembaruan 3 jam), hari sebelumnya = jam penutupan hari itu */
const cutoff = h => h === D.hari_berjalan ? jamWIB(D.cutoff) : `${tgl(h)} ${D.jadwal.tutup}`;
const iB = () => -1;
function poinBerjalan(j, teks) {
  const b = iB();
  if (b < 0) return j;
  const isi = (h, t) => `<span class="lp-pt-h">${tglHari(h)}:</span> ${t.split(` pada ${tgl(h)}`).join("")} <span class="lp-co">Cut-off ${cutoff(h)}</span>`;
  const a = isi(st.hari, j), c = isi(D.hari[b], teks(b)) + ' <span class="lp-bf">Data belum final</span>';
  /* cetak: huruf sebesar mungkin (maks 16 px) asal tiap poin tetap satu baris; ~7,6 px per huruf pada 16 px, lebar isi ~960 px */
  const n = Math.max(...[a, c].map(x => x.replace(/<[^>]+>/g, "").length)), fs = Math.max(11, Math.min(16, 960 / (n * .475))).toFixed(1);
  return `<span class="lp-pt" style="--fs:${fs}px">${a}</span><span class="lp-pt" style="--fs:${fs}px">${c}</span>`;
}
function kartuRingkasan() {
  const P = pilih("ring"), i = idx(), n = seri(P), K = P.length, h = st.hari, tp = i > 0 ? n.titik[i - 1] : null, lp = i > 0 ? n.luas[i - 1] : null;
  const bdg = i > 0 ? ` dibanding ${tgl(D.hari[i - 1])}` : "";
  const j = poinBerjalan(`${Kartu.hl(fmt(n.titik[i]))} titik panas di ${Kartu.hl(fmt(n.kab[i]))} kab/kota pada ${tgl(h)}${sementara() ? " (sementara)" : ""}${tp != null ? `, ${ubah(n.titik[i], tp)}${bdg} (${fmt(tp)} titik)` : ""}`,
    b => `${Kartu.hl(fmt(n.titik[b]))} titik panas di ${Kartu.hl(fmt(n.kab[b]))} kab/kota pada ${tgl(D.hari[b])}, ${ubah(n.titik[b], n.titik[b - 1])} dibanding ${tgl(D.hari[b - 1])}`);
  const hs = hariGrafik(), semua = D.tahun_berjalan?.titik != null, tk = semua ? "titik" : "titik_snpp";
  return Kartu.kartu("Ringkasan", j, pasCetak(batang(hs, hs.map(x => n.titik[D.hari.indexOf(x)]), h, {nama: "Titik panas", u: "titik", arr: n.titik}), tabelHarian([["Titik panas", i => fmt(n.titik[i]), 1], ["Perubahan hotspot", i => i > 0 ? ubah(n.titik[i], n.titik[i - 1]) : "–", 1],
    ["Kab/kota memiliki hotspot", i => fmt(n.kab[i]), 1], ...(K === 1 ? [] : [["Provinsi memiliki hotspot", i => fmt(provAda(P).filter(o => o.titik[i] > 0).length), 1]])],
    /* riwayat triwulan & grand total: semua satelit seperti baris harian (titik_tahun.json); data lama tanpa "titik" jatuh ke S-NPP berlabel */
    /* ponytail: triwulan & grand total hanya ada nasional di data (tahun_berjalan); per provinsi tidak ditampilkan, bukan dikira-kira */
    K ? "" : riwayatTw((q, p) => [fmt(q[tk]), p ? ubah(q[tk], p[tk]) : "–", "", fmt(q.prov_aktif)], !semua),
    /* total rentang: kab/kota dan provinsi dihitung unik (pernah bertitik di salah satu hari), bukan dijumlah */
    ix => [fmt(ix.reduce((a, i) => a + (n.titik[i] || 0), 0)), "–", fmt(kabProv(P).filter(o => ix.some(i => o.titik[i] > 0)).length),
      ...(K === 1 ? [] : [fmt(provAda(P).filter(o => ix.some(i => o.titik[i] > 0)).length)])],
    !K && D.tahun_berjalan?.ha_titik ? [`Grand total s.d. ${tgl(D.tahun_berjalan.sd)} ${D.tahun_berjalan.sd.slice(0, 4)}${semua ? "" : ' <span class="lp-co">VIIRS S-NPP</span>'}`,
      fmt(semua ? D.tahun_berjalan.titik : Math.round(D.tahun_berjalan.ha / D.tahun_berjalan.ha_titik)), "–", "–",
      fmt(Math.max(Object.values(D.prov).filter(o => o.titik.some(v => v > 0)).length, ...(D.tahun_berjalan.triwulan || []).map(q => q.prov_aktif || 0)))] : null)), tt(D.sumber.titik), selPilih("ring") + segRentang());
}
function kartuLuas() {
  const P = pilih("luas"), i = idx(), n = seri(P), hs = hariGrafik();
  /* perkiraan luas = titik S-NPP x 4,3 ha (kalibrasi seri resmi 2015-2025, lihat scripts/data/laporan.py) */
  /* kumulatif sejak 1 Januari = total tahun berjalan dikurangi luas hari-hari sesudahnya */
  const kum = i => fmt(tb ? tb.ha - n.luas.slice(i + 1).reduce((a, v) => a + v, 0) : sum(P.length ? n.baru : n.luas, i))   /* provinsi: seri "baru" = kolom Kumulatif di tabel kab/kota */;
  const triwulan = () => { let c = 0; const kum = (tb?.triwulan || []).map(q => c += q.ha);
    return riwayatTw((q, p, i) => [fmt(q.ha), p ? ubah(q.ha, p.ha) : "–", fmt(kum[i]), "–"], true, tb); };
  /* hari yang titik S-NPP-nya ditaksir (celah FIRMS atau arsip rumus lama) diberi "~" */
  const lt = i => (D.luas_taksir || []).includes(D.hari[i]) ? `<span title="taksiran">~</span>${fmt(n.luas[i])}` : fmt(n.luas[i]);
  /* tahun berjalan: nasional, atau satu provinsi (laporan.py, luas saja); beberapa provinsi tidak dijumlah */
  const tb = !P.length ? D.tahun_berjalan : P.length === 1 ? D.prov[P[0]].tahun_berjalan || null : null, jt = v => (v / 1e6).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1}), besar = v => v >= 1e6 ? jt(v) + " juta" : fmt(Math.round(v / 100) * 100);
  /* luas terdampak = piksel VIIRS bertitik x 14,06 ha, harian saja (piksel sama terdampak berhari-hari, tidak dijumlah); arsip lama = null */
  const dp = i => n.dampak?.[i] ?? null;
  const j = `Perkiraan luas terbakar ${Kartu.hl(fmt(n.luas[i]))} ha pada ${tgl(st.hari)}${i > 0 ? `, ${ubah(n.luas[i], n.luas[i - 1])}` : ""}`
    + (dp(i) != null ? `; luas terdampak ${Kartu.hl(fmt(dp(i)))} ha` : "")
    + (tb ? `; sepanjang ${st.hari.slice(0, 4)} ~${Kartu.hl(besar(tb.ha))} ha (rentang ${besar(tb.rendah)}–${besar(tb.tinggi)})` : "");
  const j2 = poinBerjalan(j, b => `Perkiraan luas terbakar ${Kartu.hl(fmt(n.luas[b]))} ha pada ${tgl(D.hari[b])}, ${ubah(n.luas[b], n.luas[b - 1])} dibanding ${tgl(D.hari[b - 1])}`);
  return Kartu.kartu("Perkiraan luas terbakar", j2, pasCetak(batang(hs, hs.map(x => n.luas[D.hari.indexOf(x)]), st.hari, {nama: "Perkiraan luas", u: "ha", arr: n.luas}), tabelHarian([["Perkiraan luas (ha)", lt, 1], ["Perubahan luas", i => i > 0 ? ubah(n.luas[i], n.luas[i - 1]) : "–", 1],
    [tb ? `Kumulatif ${st.hari.slice(0, 4)} (ha)` : `Kumulatif sejak ${tgl(D.awal_arsip)} (ha)`, kum, 1], ["Luas terdampak (ha)", i => fmt(dp(i)), 1]], triwulan(), ix => [fmt(ix.reduce((a, i) => a + (n.luas[i] || 0), 0)), "–", "–", "–"],
    tb ? [`Grand total s.d. ${tgl(tb.sd)} ${tb.sd.slice(0, 4)}`, fmt(tb.ha), "–", fmt(tb.ha), "–"] : null)), tt([D.sumber.luas, D.sumber.dampak].filter(Boolean).join("; ")) + ((D.luas_taksir || []).length ? "; ~ = hari dengan titik S-NPP ditaksir" : ""), selPilih("luas") + segRentang());
}

/* teks kepala juga disalin ke span cetak: Chrome tidak menggambar tombol di kepala tabel yang diulang tiap halaman kertas */
const thB = () => { const b = iB(); return b < 0 ? "" : TH("tb", `Titik ${tgl(D.hari[b])} (belum final)`, 1).replace("<th", '<th data-sm'); };
const tdB = v => iB() < 0 ? "" : `<td class="n lp-smc">${fmt(v)}</td>`;
const TH = (k, t, n) => `<th${n ? ' class="n"' : ""}><button type="button" data-k="${k}">${t}<i></i></button><span class="lp-cth">${t}</span></th>`;
function tabelProv() {
  const i = idx(), h = tgl(st.hari), kem = i > 0 ? tgl(D.hari[i - 1]) : "sebelumnya", rows = urut(barisProv(), st.p), n = D.nasional;
  const kol = [TH("nama", "Provinsi"), thB(), TH("t", `Titik ${h}`, 1), TH("tp", `Titik ${kem}`, 1), TH("dt", "Perubahan hotspot", 1),
    TH("kompleks", "Kejadian api", 1), TH("lk", "Luas kejadian api (ha)", 1), TH("level", "Tingkat perhatian")].join("");
  const td = r => `<tr><td>${esc(r.nama)}</td>${tdB(r.tb)}<td class="n">${fmt(r.t)}</td><td class="n">${fmt(r.tp)}</td><td class="n">${ubah(r.t, r.tp)}</td>`
    + `<td class="n">${fmt(r.kompleks)}</td><td class="n">${fmt(r.lk)}</td><td>${r.level == null ? "–" : pilLv(r.level)}</td></tr>`;
  const tot = `<tr><td>Indonesia</td>${tdB(iB() > 0 ? n.titik[iB()] : null)}<td class="n">${fmt(n.titik[i])}</td><td class="n">${fmt(i > 0 ? n.titik[i - 1] : null)}</td><td class="n">${ubah(n.titik[i], i > 0 ? n.titik[i - 1] : null)}</td>`
    + `<td class="n">${fmt(rows.reduce((a, r) => a + (r.kompleks || 0), 0))}</td><td class="n">${fmt(rows.reduce((a, r) => a + (r.lk || 0), 0))}</td><td></td></tr>`;
  return `<div class="tw"><table class="lp-tb"><thead><tr>${kol}</tr></thead><tbody>${rows.map(td).join("") || '<tr><td colspan="8" class="kosong">Tidak ada titik panas pada rentang ini</td></tr>'}</tbody>${provKepala().length ? "" : `<tfoot>${tot}</tfoot>`}</table></div>`;
}
function kartuProv() {
  const i = idx(), rows = barisProv().sort((a, b) => b.t - a.t), top = rows[0], tot = D.nasional.titik[i];
  if (provKepala().length === 1) {
    const r = top, j = r ? `${Kartu.hl(esc(r.nama))}: ${Kartu.hl(fmt(r.t))} titik panas pada ${tgl(st.hari)}${r.tp != null ? `, ${ubah(r.t, r.tp)} dibanding ${tgl(D.hari[i - 1])}` : ""}` : `Tidak ada titik panas tercatat di ${esc(namaWil())} pada ${tgl(st.hari)}`;
    return Kartu.kartu("Status provinsi", j, '<div id="lpProv"></div>', tt([D.sumber.titik, D.sumber.kompleks].filter(Boolean).join("; ")));
  }
  const j = top && top.t ? poinBerjalan(`${Kartu.hl(esc(top.nama))} mencatat titik panas terbanyak pada ${tgl(st.hari)}: ${Kartu.hl(fmt(top.t))} dari ${Kartu.hl(fmt(tot))} titik di seluruh Indonesia (${fmt(Math.round(top.t / tot * 100))}%)`, b => {
    const t2 = barisProv(b).sort((a, c) => c.t - a.t)[0];
    return t2 ? `${Kartu.hl(esc(t2.nama))} terbanyak pada ${tgl(D.hari[b])}: ${Kartu.hl(fmt(t2.t))} titik, ${ubah(t2.t, t2.tp)}` : `Tidak ada titik panas tercatat pada ${tgl(D.hari[b])}`; }) : `Tidak ada titik panas tercatat pada ${tgl(st.hari)}`;
  return Kartu.kartu("Tabel provinsi", j, '<div id="lpProv"></div>', tt([D.sumber.titik, D.sumber.kompleks].filter(Boolean).join("; ")));
}
/* kab/kota dikelompokkan per provinsi: provinsi diurut titik hari terpilih (terbanyak dulu), kab/kota di dalamnya mengikuti urutan kolom.
   Baris kepala provinsi muncul di awal tiap kelompok dan di awal tiap halaman paginasi. Cetak: hanya kab/kota yang punya titik hari itu atau kemarin. */
function tabelKab() {
  const i = idx(), h = tgl(st.hari), kem = i > 0 ? tgl(D.hari[i - 1]) : "sebelumnya", q = st.cari.trim().toLowerCase();
  const pv = k => D.prov[k]?.titik[i] || 0;
  const rows = urut(barisKab(i, pilih("provK")).filter(r => (!q || r.nama.toLowerCase().includes(q)) && (!st.cetak || r.t || r.tp)), st.k)
    .sort((a, b) => a.kode === b.kode ? 0 : pv(b.kode) - pv(a.kode) || a.prov.localeCompare(b.prov, "id"));
  const hal = st.cetak ? 0 : Math.min(st.k.hal, Math.max(0, Math.ceil(rows.length / PER) - 1)); if (!st.cetak) st.k.hal = hal;
  const vis = st.cetak ? rows : rows.slice(hal * PER, hal * PER + PER);
  const kol = [TH("nama", "Kab/kota"), thB(), TH("t", `Titik ${h}`, 1), TH("tp", `Titik ${kem}`, 1), TH("dt", "Perubahan hotspot", 1),
    TH("kompleks", "Kejadian api", 1), TH("lk", "Luas kejadian api (ha)", 1), TH("level", "Tingkat perhatian"), TH("fwi", "FWI tertinggi", 1)].join("");
  const grp = {}; rows.forEach(r => { const g = grp[r.kode] ||= {n: 0, t: 0, tp: 0}; g.n++; g.t += r.t; g.tp += r.tp || 0; });
  const kepala = (k, lanjut) => { const g = grp[k], p = D.prov[k];
    return `<tr class="lp-grp"><td>${esc(p?.nama || k)}${lanjut ? " (lanjutan)" : ""}</td>${tdB(iB() > 0 ? p?.titik[iB()] : null)}<td class="n">${fmt(p?.titik[i])}</td><td class="n">${fmt(i > 0 ? p?.titik[i - 1] : null)}</td><td class="n">${ubah(p?.titik[i], i > 0 ? p?.titik[i - 1] : null)}</td>`
      + `<td class="n">${fmt(p?.kompleks)}</td><td class="n">${fmt(p?.luas_kompleks)}</td><td>${p ? pilLv(p.level) : ""}</td><td class="n">${fmt(g.n)} kab/kota</td></tr>`; };
  const td = r => `<tr><td class="lp-kab">${esc(r.nama)}</td>${tdB(r.tb)}<td class="n">${fmt(r.t)}</td><td class="n">${fmt(r.tp)}</td><td class="n">${ubah(r.t, r.tp)}</td>`
    + `<td class="n">${fmt(r.kompleks)}</td><td class="n">${fmt(r.lk)}</td><td>${r.level == null ? "–" : pilLv(r.level)}</td><td class="n">${fmt(r.fwi)}</td></tr>`;
  const badan = vis.map((r, j) => (j === 0 || vis[j - 1].kode !== r.kode ? kepala(r.kode, j === 0 && hal > 0 && rows[hal * PER - 1]?.kode === r.kode) : "") + td(r)).join("");
  const pg = st.cetak ? `<p class="lp-cetak-n">${fmt(rows.length)} kab/kota dengan titik panas pada ${h} atau ${kem}</p>` : paginasi(hal, rows.length, PER, "kab/kota");
  return `<div class="tw"><table class="lp-tb"><thead><tr>${kol}</tr></thead><tbody>${badan || '<tr><td colspan="9" class="kosong">Tidak ada kab/kota yang cocok</td></tr>'}</tbody></table></div>${pg}`;
}
function kartuKab() {
  const i = idx(), rows = barisKab().sort((a, b) => b.t - a.t), top = rows[0], aktif = rows.filter(r => r.t > 0).length;
  const j = top && top.t ? poinBerjalan(`${Kartu.hl(fmt(aktif))} kab/kota mencatat titik panas pada ${tgl(st.hari)}, terbanyak ${Kartu.hl(esc(top.nama))} (${Kartu.hl(fmt(top.t))} titik)`, b => {
    const rb = barisKab(b).sort((a, c) => c.t - a.t);
    return rb[0]?.t ? `${Kartu.hl(fmt(rb.filter(r => r.t > 0).length))} kab/kota pada ${tgl(D.hari[b])}, terbanyak ${Kartu.hl(esc(rb[0].nama))} (${Kartu.hl(fmt(rb[0].t))} titik)` : `Tidak ada titik panas tercatat pada ${tgl(D.hari[b])}`; }) : `Tidak ada titik panas tercatat pada ${tgl(st.hari)}`;
  const ctl = selPilih("provK")
    + `<input class="lp-cari" id="lpCari" type="search" placeholder="Cari nama kab/kota" autocomplete="off" aria-label="Cari nama kab/kota" value="${esc(st.cari)}">`;
  return Kartu.kartu("Per kab/kota", j, '<div id="lpKab"></div>', tt([D.sumber.titik, D.sumber.kompleks, D.sumber.fwi, D.sumber.wilayah].filter(Boolean).join("; ")), ctl);
}
/* jenis "kab" (bawaan) atau "prov": kartu provinsi berdiri sebelum kartu kab/kota (pemilik, 17 Okt 2026) */
function kartuNaik(jenis = "kab") {
  const baris = jenis === "prov" ? barisProv : barisKab, sat = jenis === "prov" ? "provinsi" : "kab/kota";
  const i = idx();
  if (i < 1) return Kartu.kartu(jenis === "prov" ? "Kenaikan terbesar per provinsi" : "Kenaikan terbesar per kab/kota", "Belum ada hari pembanding", '<div class="kosong">Laporan baru punya satu hari</div>', tt(D.sumber.titik));
  const rows = baris().filter(r => r.dt > 0).sort((a, b) => b.dt - a.dt).slice(0, 10).map(r => ({...r, v: r.dt}));
  const j = poinBerjalan(rows.length ? `${Kartu.hl(esc(rows[0].nama))} naik paling tajam: <span class="naik">▲ ${fmt(rows[0].dt)}</span> titik panas pada ${tgl(st.hari)} dibanding ${tgl(D.hari[i - 1])}` : `Tidak ada ${sat} yang naik pada ${tgl(st.hari)} dibanding ${tgl(D.hari[i - 1])}`, b => {
    const t2 = baris(b).filter(r => r.dt > 0).sort((a, c) => c.dt - a.dt)[0];
    return t2 ? `${Kartu.hl(esc(t2.nama))} naik paling tajam pada ${tgl(D.hari[b])}: <span class="naik">▲ ${fmt(t2.dt)}</span> titik panas` : `Tidak ada ${sat} yang naik pada ${tgl(D.hari[b])}`; });
  /* hari berjalan tersedia: dua panel berdampingan, kiri hari terpilih, kanan hari berjalan (belum final) */
  const b = iB(), rb = b < 0 ? [] : baris().filter(r => r.db > 0).sort((a, c) => c.db - a.db).slice(0, 10).map(r => ({...r, t: r.tb, tp: r.t, v: r.db}));
  const kosong = `<div class="kosong">Semua ${sat} tetap atau turun</div>`;
  if (b < 0) return Kartu.kartu(jenis === "prov" ? "Kenaikan terbesar per provinsi" : "Kenaikan terbesar per kab/kota", j, rows.length ? batangMendatar(rows) : kosong, tt(D.sumber.titik));
  const mx = Math.max(1, ...rows.map(r => r.v), ...rb.map(r => r.v));
  const panel = (h, rs, sm) => `<div class="lp-pn"><div class="lp-pn-h">${tglHari(h)}${sm ? ' <span class="lp-bf">Data belum final</span>' : ""}</div>${rs.length ? batangMendatar(rs, 640, sm, mx) : kosong}</div>`;
  return Kartu.kartu(jenis === "prov" ? "Kenaikan terbesar per provinsi" : "Kenaikan terbesar per kab/kota", j, `<div class="lp-pns">${panel(st.hari, rows, false)}${panel(D.hari[b], rb, true)}</div>`, tt(D.sumber.titik));
}
function kartuSumber() {
  const s = D.sumber, c = D.cutoff, sm = sementara();
  /* teks sumber dari pipeline diawali nama sumbernya; nama itu pindah ke pil sumber, sisanya jadi rincian */
  const rinci = t => tt(t).replace(/^(NASA FIRMS NRT|Kejadian api):\s*/, "").replace(/^(Badan Informasi Geospasial \(BIG\)|KLHK SiPongi),\s*/, "");
  /* kompartemen 1: alur waktu laporan, dari arsip sampai penutupan */
  const tutup = new Date(`${st.hari}T${(D.jadwal.tutup.match(/\d{1,2}[.:]\d{2}/) || ["16.00"])[0].replace(".", ":").padStart(5, "0")}:00+07:00`);
  const waktu = [[new Date(c), "Cut-off data", jamWIB(c)], [new Date(D.dibuat), "Dihitung", jamWIB(D.dibuat)],
    ...(st.hari === D.hari_berjalan ? [] : [[tutup, "Ditutup", `${tgl(st.hari)} ${D.jadwal.tutup}`, "tt"]])].sort((a, b) => a[0] - b[0]);
  const alur = `<div class="lp-km"><div class="lp-km-h"><span>Waktu laporan</span><span class="lp-bf${sm ? "" : " ok"}">${sm ? "Data belum final" : "Final"}</span></div>`
    + `<ol class="lp-alur">${waktu.map(w => `<li${w[3] ? ' class="tt"' : ""}><i></i><b>${esc(w[2])}</b><span>${w[1]}</span></li>`).join("")}</ol></div>`;
  /* kompartemen 2: ubin sumber, satu per data */
  const IK = {titik: '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>', luas: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
    kum: '<path d="M4 17l8 4 8-4M4 12l8 4 8-4M12 3l8 4-8 4-8-4z"/>', kej: '<circle cx="7" cy="8" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="11" cy="16" r="2.5"/>',
    fwi: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>', wil: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>'};
  const baris = [
    ["titik", "Titik panas", "NASA FIRMS", s.titik && rinci(s.titik) + "; dikelompokkan per hari laporan (24 jam s.d. 16.00 WIB menurut waktu akuisisi), bukan tanggal UTC dari NASA"],
    ["luas", "Perkiraan luas tahunan (nasional)", MEREK, s.luas && tt(s.luas) + "; hanya tahunan dan nasional dengan rentang, tidak per hari atau per wilayah"],
    ["kej", "Kejadian api", MEREK, s.kompleks && rinci(s.kompleks)], ["fwi", "FWI", "Open-Meteo", s.fwi && tt(s.fwi)],
    ["wil", "Wilayah", "BIG", s.wilayah && rinci(s.wilayah)]].filter(r => r[3]);
  const ubin = baris.map(r => `<div class="lp-ub"><div class="lp-ub-h"><svg viewBox="0 0 24 24" aria-hidden="true">${IK[r[0]]}</svg><b>${r[1]}</b><span class="lp-src">${esc(r[2])}</span></div><p>${esc(r[3])}</p></div>`).join("");
  const j = `Data satelit masuk sampai ${Kartu.hl(jamWIB(c))}, laporan ${Kartu.hl(tgl(st.hari))} final per cut-off ini, diperbarui otomatis tiap 3 jam`;
  return Kartu.kartu("Cut-off dan sumber data", j, `<div class="lp-kms">${alur}<div class="lp-km"><div class="lp-km-h"><span>Sumber data</span></div><div class="lp-ubs">${ubin}</div></div></div>`,
    "NASA FIRMS, BIG, KLHK SiPongi, olahan " + MEREK);
}

/* ---------- tiga kartu musim & luas (tugas 2): musim_harian.json (dimuat malas, X.mh) + laporan.json luas_banding. Ikut pemilih provinsi kartu (pilih) ---------- */
/* semua teks label metode/sumber di sini supaya gampang diganti (validasi-model bisa mengubahnya) */
const CATATAN_TITIK = "Lokasi unik ± 375 m per hari dari NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21), keyakinan sedang dan tinggi, di dalam batas provinsi, hari WIB; sumber panas tetap (industri, tambang, PLTU) dibuang, gunung api dan lepas pantai tidak disaring.";
const SUMBER_MUSIM = `NASA FIRMS; tahun berjalan dari data harian ${MEREK}`;
const MULAI = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];   /* awal tiap bulan, kalender kabisat (0 = 1 Jan, 59 = 29 Feb) */
const li = h => MULAI[+h.slice(5, 7) - 1] + (+h.slice(8) - 1);
const kabisat = y => +y % 4 === 0;
const doy = h => Math.round((Date.UTC(+h.slice(0, 4), +h.slice(5, 7) - 1, +h.slice(8)) - Date.UTC(+h.slice(0, 4), 0, 1)) / 864e5);
const keAsli = (y, l) => kabisat(y) || l < 59 ? l : l - 1;   /* indeks kabisat -> indeks hari asli tahun y */
const keKabisat = (y, j) => kabisat(y) || j < 59 ? j : j + 1;
/* beberapa provinsi: seri harian dijumlah; undefined bila tak satu pun punya tahun itu */
const mhSeri = (y, P = provKepala()) => { if (!P.length) return X.mh.nasional[y]; const a = P.map(k => X.mh.prov[k]?.[y]).filter(Boolean);
  return a.length ? Array.from({length: Math.max(...a.map(x => x.length))}, (_, i) => a.reduce((s, x) => s + (x[i] || 0), 0)) : undefined; };
const ratio = x => x.toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + "×";

function kartuKurva() {
  const mh = X.mh; if (!mh) return tunggu("Musim kebakaran");
  const P = pilih("kurva"), K = P.length, th = st.hari.slice(0, 4), jN = doy(st.hari), lh = li(st.hari), tahun = Object.keys(mh.nasional).filter(y => y <= th).sort();
  const nm = K ? namaWil(P) : "", ctl = selPilih("kurva");
  if (!tahun.length || !mhSeri(th, P)) return Kartu.kartu("Musim kebakaran", "Belum ada data musim", '<div class="kosong">Data musim belum tersedia</div>', SUMBER_MUSIM, ctl);
  const S = {}; for (const y of tahun) { let c = 0; S[y] = (mhSeri(y, P) || []).map(v => c += v || 0); if (y === th) S[y] = S[y].slice(0, jN + 1); }
  const now = S[th].at(-1) ?? 0, lain = tahun.filter(y => y !== th).filter(y => S[y].length);
  const pd = lain.map(y => [y, S[y][Math.min(keAsli(y, lh), S[y].length - 1)] || 0]).sort((a, b) => b[1] - a[1]);   /* total tiap tahun pada tanggal yang sama */
  const med = pd.length ? (v => (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2)(pd.map(a => a[1]).sort((a, b) => a - b)) : 0;
  const lewat = lain.filter(y => S[y].at(-1) < now).sort((a, b) => S[b].at(-1) - S[a].at(-1))[0];
  const j = (K ? `${Kartu.hl(esc(nm))}: ` : "") + `${Kartu.hl(fmt(now))} titik panas sejak 1 Jan hingga ${tgl(st.hari)}`
    + (med ? `, ${Kartu.hl(ratio(now / med))} median ${tahun[0]}–${lain.at(-1) || tahun[0]} pada tanggal yang sama (${fmt(Math.round(med))} titik)` : "")
    + (pd.length ? (now >= pd[0][1] ? `, tertinggi sejak ${tahun[0]}` : `; tahun terburuk pada tanggal ini ${pd[0][0]} (${fmt(pd[0][1])} titik)`) : "")
    + (lewat ? `, sudah melewati total ${Kartu.hl(lewat)} sepanjang tahun (${fmt(S[lewat].at(-1))} titik)` : "");
  const W = 1000, H = 380, L = 80, R = 185, T = 44, B = 34, pw = W - L - R, ph = H - T - B;
  const mx = Math.max(1, now, ...lain.map(y => S[y].at(-1))), p10 = 10 ** Math.floor(Math.log10(mx / 4)), step = [1, 2, 2.5, 5, 10].map(m => m * p10).find(v => v >= mx / 4), top = Math.ceil(mx / step) * step;
  const X_ = l => L + pw * l / 365, Y_ = v => T + ph * (1 - v / top);
  const warna = y => { const t = lain.length > 1 ? lain.indexOf(y) / (lain.length - 1) : 1, a = [185, 198, 218], b = [51, 80, 122]; return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(",")})`; };
  let g = "";
  for (let v = 0; v <= top + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y_(v)}" y2="${Y_(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${L - 8}" y="${Y_(v) + 4}" text-anchor="end" font-size="11" class="lp-sb">${fmt(v)}</text>`;
  BLN.forEach((b, m) => { g += `<text x="${X_((MULAI[m] + (MULAI[m + 1] ?? 366)) / 2)}" y="${H - 10}" text-anchor="middle" font-size="11.5" class="lp-sb">${b}</text>`; });
  const lbl = [];
  for (const y of [...lain, th]) {
    const on = y === th, d = S[y].map((c, jj) => `${jj ? "L" : "M"}${X_(keKabisat(y, jj)).toFixed(1)} ${Y_(c).toFixed(1)}`).join(""), akhir = S[y].at(-1);
    const tip = esc(`<b>${y}</b>${on ? ` s.d. ${tgl(st.hari)}` : ""}<br>Total: ${fmt(akhir)} titik panas`);
    if (on) g += `<path d="${d}L${X_(keKabisat(y, S[y].length - 1)).toFixed(1)} ${Y_(0)}L${X_(0)} ${Y_(0)}Z" fill="${WARNA_SEL}" opacity=".08"/>`;
    g += `<g data-tip="${tip}"><path d="${d}" fill="none" stroke="${on ? WARNA_SEL : warna(y)}" stroke-width="${on ? 3.6 : 1.8}" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="transparent" stroke-width="12"/></g>`;
    lbl.push({y, on, x0: X_(keKabisat(y, S[y].length - 1)), y0: Y_(akhir), x: X_(keKabisat(y, S[y].length - 1)) + 14, v: Y_(akhir) - 10, t: `${y} · ${fmt(akhir)} titik`});
  }
  /* label akhir garis: saling dijauhkan minimal 21 px vertikal supaya tidak bertumpuk */
  lbl.sort((a, b) => a.v - b.v); lbl.forEach((a, i, r) => { if (i && a.v < r[i - 1].v + 21) a.v = r[i - 1].v + 21; });
  for (let i = lbl.length - 1; i >= 0; i--) { const mxv = i === lbl.length - 1 ? H - B - 12 : lbl[i + 1].v - 21; if (lbl[i].v > mxv) lbl[i].v = mxv; }   /* tak keluar dari bawah sumbu */
  const xs = X_(lh), tg = `Situasi per ${tgl(st.hari)}`, [pg, pw2] = Kartu.pil(0, 0, tg, "#0b2545", "#fff", 11);
  g += `<line x1="${xs}" x2="${xs}" y1="${T - 6}" y2="${H - B}" stroke="currentColor" opacity=".6" stroke-width="1.5" stroke-dasharray="5 4"/>`
    + `<g transform="translate(${Math.max(L, Math.min(xs - pw2 / 2, W - R - pw2))},4)">${pg}</g>`;
  /* titik pada tanggal yang sama tiap tahun lalu: perbandingan yang dibaca kalimat kepala */
  for (const [y, v] of pd) g += `<circle cx="${xs}" cy="${Y_(v)}" r="3.5" fill="${warna(y)}" style="stroke:var(--surface)" stroke-width="1.5" data-tip="${esc(`<b>${y}</b> s.d. ${tgl(st.hari)}<br>${fmt(v)} titik panas`)}"/>`;
  /* label yang tergeser dari ujung garisnya disambung garis penunjuk */
  for (const a of lbl) g += `<path d="M${a.x0 + 2} ${a.y0}H${a.x - 6}L${a.x} ${a.v + 10}" fill="none" stroke="${a.on ? WARNA_SEL : warna(a.y)}" stroke-width="1.2"/>`;
  for (const a of lbl) g += Kartu.pil(a.x, a.v, a.t, a.on ? WARNA_SEL : "var(--surface)", a.on ? "#fff" : "currentColor", 11)[0];
  return Kartu.kartu("Musim kebakaran", j, `<div class="lp-gr lp-gr-h"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kumulatif titik panas per hari ${tahun[0]}–${th}${nm ? " " + esc(nm) : ""}">${g}</svg></div>`,
    `${SUMBER_MUSIM}. ${CATATAN_TITIK}`, ctl);
}

function kepala() {
  const hs = D.hari.slice(-7), sm = sementara();
  const opsi = hs.map(h => [h, tgl(h)]);
  document.title = `Laporan Karhutla ${namaWil()} ${tglP(st.hari)}`;   /* nama berkas bawaan "Simpan sebagai PDF" */
  const fokus = document.activeElement?.closest?.("#lpKepala") ? document.activeElement : null, fk = fokus?.classList.contains("pc-btn") ? ".pc-btn" : "";   /* innerHTML membuang fokus: kembalikan di bawah */
  $("#lpKepala").innerHTML = `<div class="lp-jd"><h1>Laporan Harian Karhutla${provKepala().length ? " · " + esc(namaWil()) : ""}</h1>
    <div class="lp-pils"><span class="lp-pil">${tglPanjang(st.hari)}</span><span class="lp-pil ${sm ? "sm" : "ok"}">Cut-off ${cutoff(st.hari)}</span>${!sm && iB() > 0 ? `<span class="lp-pil sm">Cut-off ${cutoff(D.hari[iB()])}</span>` : ""}</div></div>
    <div class="lp-aksi">${selPilih("prov")}<button class="lp-cetak" type="button" id="lpCetak" aria-label="Cetak atau unduh PDF" title="Cetak atau unduh PDF">${IK_CETAK}</button>${Kartu.seg("hari", opsi, st)}</div>`;
  if (fk) $("#lpKepala").querySelector(fk)?.focus({preventScroll: true});
}

/* ---------- render ---------- */
/* h = teks HTML atau fungsi pembuatnya (tidak dipanggil untuk kartu nasional-saja di mode provinsi) */
const isi = (k, h) => { $(`[data-ex="${k}"]`).innerHTML = provKepala().length && NAS.has(k) ? "" : typeof h === "function" ? h() : h; };
function renderProv() { const e = $("#lpProv"); if (e) { e.innerHTML = tabelProv(); tandai(e, st.p); pengurutKepala(st.p, e.querySelector("thead"), () => nanti(renderProv)); } }
function renderKab() { const e = $("#lpKab"); if (e) { e.innerHTML = tabelKab(); tandai(e, st.k); pengurutKepala(st.k, e.querySelector("thead"), () => nanti(renderKab)); } }
function tandai(e, s) { const b = e.querySelector(`thead [data-k="${s.urut}"] i`); if (b) b.textContent = s.turun ? "↓" : "↑"; }
/* sampul kertas cetak (gaya lembar Pangantara): kepala + angka pokok (sudah ada) + poin Ringkasan dan Luas + peta provinsi
   dengan peringkat. Isinya disalin dari kartu yang sudah dirender, jadi angka dan teksnya selalu sama dengan halaman */
function sampul() {
  const q = s => document.querySelector(s), j = q('[data-ex="peta"] h3'), pt = q('[data-ex="peta"] .lp-pt-w'), cl = q('[data-ex="peta"] .lp-cl');
  const h = st.hari, bf = false;
  /* cetak = kertas tanpa kontrol kartu: catatan celah (.lp-cl) dan satu baris catatan perkiraan (petaCetak) ikut disalin supaya angka satelit tidak tampil tanpa peringatannya */
  $("#lpSampul").innerHTML = (j ? `<div class="lp-sp-p">${j.innerHTML}</div>` : "")
    + (pt ? `<div class="lp-sp-ey">Peta: ${petaKet || `data ${tglHari(h)}${bf ? ' <span class="lp-bf">Data belum final</span>' : ` <span class="lp-co">Cut-off ${cutoff(h)}</span>`}`}</div>${cl ? cl.outerHTML : ""}${pt.outerHTML}${petaCetak ? `<div class="lp-sp-cat">${petaCetak}</div>` : ""}` : "");
}
function semua() {
  kepala(); isi("ring", kartuRingkasan); isi("luas", kartuLuas); isi("kurva", kartuKurva); isi("peta", kartuPeta); isi("provg", kartuProvGrafik); isi("prov", kartuProv); isi("kab", kartuKab); isi("naikp", () => kartuNaik("prov")); isi("naik", kartuNaik); isi("riwayat", kartuRiwayat); isi("tren", kartuTren); isi("musim", kartuMusim); isi("cuaca", kartuCuaca); isi("konsesi", kartuKonsesi); isi("sumber", kartuSumber);
  renderProv(); renderKab(); sampul();
  document.querySelectorAll(".lp-gr,.lp-kep .seg").forEach(e => { e.scrollLeft = e.scrollWidth; });   /* hari terpilih ada di ujung kanan */
  $("#upd").textContent = "Data s.d. " + jamWIB(D.cutoff);
  /* angka pokok untuk kertas cetak (gaya lembar ekspor pangantara: kotak navy 4 lajur, label kecil di atas, nilai besar) */
  { const i = idx(), n = seri(), K = provKepala().length, pv = provAda(provKepala()).filter(o => o.titik[i] > 0).length, ub = (a, b) => i > 0 && b ? (v => (v > 0 ? "▲ " : v < 0 ? "▼ " : "") + fmt(Math.abs(v)) + "%")(Math.round((a - b) / b * 100)) : "–";
    $("#lpPokok").innerHTML = [["Titik panas", fmt(n.titik[i]), ub(n.titik[i], n.titik[i - 1]) + (i > 0 ? " dari " + fmt(n.titik[i - 1]) + " (" + tgl(D.hari[i - 1]) + ")" : "")], ["Kab/kota memiliki hotspot", fmt(n.kab[i]), K === 1 ? "di " + namaWil() : "di " + fmt(pv) + " provinsi"],
      K === 1 ? ["Tingkat perhatian", LEVEL[n.level ?? 0] || "–", "indeks platform, bukan status resmi"] : ["Kejadian api", fmt(Object.values(D.prov).reduce((a, o) => a + (o.kompleks || 0), 0)), "cluster titik panas, posisi laporan"],
      D.tahun_berjalan && !K ? ["Perkiraan luas terbakar " + st.hari.slice(0, 4), "sekitar " + (D.tahun_berjalan.ha / 1e6).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + " juta ha", "rentang " + (D.tahun_berjalan.rendah / 1e6).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + "–" + (D.tahun_berjalan.tinggi / 1e6).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + " juta ha; bukan angka resmi"] : ["Kab/kota memiliki hotspot (7 hari)", fmt(n.kab.slice(Math.max(0, i - 6), i + 1).reduce((a, v) => Math.max(a, v), 0)), "terbanyak dalam sehari"]]
      .map(([l, v, k]) => `<div><span>${l}</span><b>${v}</b><small>${k}</small></div>`).join(""); }
  /* kepala dan kaki kertas cetak: kotak margin @page (menggantikan tanggal/URL bawaan browser), isinya mengikuti hari terpilih */
  const en = window.BAHASA === "en" && typeof window.T === "function", T = t => en ? window.T(t) : t;
  const css = t => '"' + String(T(t)).replace(/["\\]/g, "") + '"', f = "font:600 8.5px Inter,system-ui,sans-serif;color:#5b6b82";
  /* laporan bertanggal hari dicetak (WIB); hari data dan status finalnya ada di kanan */
  const cetak = tglPanjang(new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10));
  /* kop berlogo = kepala tiap halaman (position:fixed di cetak); baris kecilnya: tanggal cetak + cut-off tiap hari laporan */
  const kanan = [st.hari, ...(iB() > 0 ? [D.hari[iB()]] : [])].map(h => `Cut-off ${tgl(h)}: ${cutoff(h).replace(tgl(h) + " ", "")}`).join("  ·  ");
  /* kop tiap halaman = SVG berukuran tetap di kotak margin @page (elemen fixed salah letak di Chrome, gambar tanpa ukuran membesar) */
  const xe = t => String(T(t)).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  /* kiri: logo + nama + judul; kanan: tanggal cetak + pil cut-off tiap hari (hijau = final, oranye = berjalan) */
  const kiri = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="26" viewBox="0 0 340 26">${LOGO.replace("<svg ", '<svg x="0" y="1" width="24" height="24" ')}`
    + `<g font-family="Inter,system-ui,sans-serif" fill="#0b2545"><text x="31" y="11" font-size="10.5" font-weight="800">${MEREK}</text>`
    + `<text x="31" y="22" font-size="8" font-weight="700">${xe("Laporan Harian Kebakaran Hutan dan Lahan")}${provKepala().length ? ` · <tspan fill="#c9503a">${xe(namaWil())}</tspan>` : ""}</text></g></svg>`;
  const pil = [[st.hari, sementara() ? "#d2772c" : "#2b8c86"], ...(iB() > 0 ? [[D.hari[iB()], "#d2772c"]] : [])]
    .map(([h, w]) => [T(`Cut-off ${tgl(h)}: ${cutoff(h).replace(tgl(h) + " ", "")}`), w]);
  if (sementara() || iB() > 0) pil.push([T("Data belum final"), "#c9503a"]);
  let px = 380, pils = "";
  for (const [t, w] of pil.reverse()) { const lw = t.length * 4.3 + 12; px -= lw; pils += `<rect x="${px}" y="13" width="${lw}" height="12" rx="6" fill="${w}"/><text x="${px + lw / 2}" y="21.5" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">${xe(t)}</text>`; px -= 4; }
  const kn = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="26" viewBox="0 0 380 26"><g font-family="Inter,system-ui,sans-serif">`
    + `<text x="380" y="9" font-size="8.5" font-weight="800" fill="#0b2545" text-anchor="end">${xe(cetak)}</text>${pils}</g></svg>`;
  const uri = t => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}")`, garis = "vertical-align:bottom;padding-bottom:2.5mm;border-bottom:1.5px solid #0b2545;margin-bottom:5mm";
  $("#lpHalaman").textContent = `@page{size:A4 landscape;margin:22mm 10mm 14mm;
    @top-left{content:${uri(kiri)};${garis};text-align:left}@top-center{content:" ";${garis}}@top-right{content:${uri(kn)};${garis};text-align:right}
    @bottom-left{content:${css("Sumber: NASA FIRMS, BIG, KLHK SiPongi; olahan " + MEREK)};${f};border-top:1px solid #c9d3e0;vertical-align:top;padding-top:3mm}
    @bottom-right{content:"${en ? "Page" : "Halaman"} " counter(page) " ${en ? "of" : "dari"} " counter(pages);${f};border-top:1px solid #c9d3e0;vertical-align:top;padding-top:3mm}}`;
}
/* hari terpilih = hari terbaru yang sudah ada datanya (titik > 0) = final; belum ada data, mundur ke hari sebelumnya */
const awal = () => D.hari.findLast((h, i) => D.nasional.titik[i] > 0) || D.hari.at(-1);

/* ---------- interaksi ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-set]");
  if (b && b.tagName === "BUTTON") {
    const k = b.dataset.set, v = b.dataset.v;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* chrome urgent */
    st[k] = k === "rentang" ? (v === "b" ? v : +v) : v; if (k === "hari") st.manual = true;
    st.p.hal = st.k.hal = 0; nanti(semua); return;
  }
  const p = e.target.closest("#lpKab .pgn-b[data-h]");
  if (p && !p.disabled) { if (/^\d+$/.test(p.textContent)) p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.classList.toggle("on", x === p)); st.k.hal = +p.dataset.h; nanti(renderKab); return; }
  if (e.target.closest("#lpCetak")) print();
});
document.addEventListener("change", e => {
  const m = e.target.closest("input[data-multi]");
  if (m) { const box = m.closest(".pm-menu"); if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
    const k = m.dataset.multi, v = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean).join(",");
    Kartu._bukaMulti = k; const balik = () => document.querySelector(`input[data-multi="${k}"][value="${m.value}"]`)?.focus({preventScroll: true});   /* menu tetap terbuka, fokus kembali ke kotak yang sama */
    /* kepala: simpan di URL (?prov=62,63, tanpa riwayat baru), semua pemilih kartu kembali ikut kepala */
    if (k === "prov") { st.prov = v; st.pk = {}; st.p.hal = st.k.hal = 0;
      const u = new URL(location.href); v ? u.searchParams.set("prov", v) : u.searchParams.delete("prov"); history.replaceState(null, "", u);
      nanti(() => { semua(); balik(); }); return; }
    st.pk[k] = v; if (k === "provK") st.k.hal = 0;
    nanti(() => { (GAMBAR[k] || semua)(); balik(); }); return; } });
/* kontrol kartu peta (data-pk): ukuran, jenis periode, geser, tanggal/minggu/bulan/tahun, rentang. Chrome (aria-pressed) langsung,
   penjumlahan dan gambar ulang ditunda lewat nanti(); hanya kartu peta yang digambar ulang */
function petaAtur(k, v) {
  const R = window.PetaKarhutla, lo = PKD.hari[0], hi = PKD.hari.at(-1), tepat = s => s < lo ? lo : s > hi ? hi : s, ref = jangkarPK();
  if (k === "metrik") pet.metrik = v;
  else if (k === "mode" && v !== pet.mode) {
    if (v === "rentang") Object.assign(pet, R.awalRentang(PKD, pet.mode, ref, pet.a, pet.b));
    else if (pet.mode === "rentang") pet.ref = PKD.hari[(R.rentang(PKD, "rentang", ref, pet.a, pet.b) || {i1: PKD.n - 1}).i1];
    pet.mode = v;
  }
  else if (k === "geser") { const t = R.tetangga(PKD, pet.mode, ref, +v); if (!t.ada) return; pet.ref = t.ref; }
  else if (k === "ref") { if (!/^\d{4}-\d\d-\d\d$/.test(v)) return; pet.ref = tepat(v); }
  else if (k === "a" || k === "b") { if (!/^\d{4}-\d\d-\d\d$/.test(v)) return; pet[k] = tepat(v); }
  else return;
  petaFokus = [k, k === "metrik" || k === "mode" || k === "geser" || (k === "ref" && pet.mode === "tahun") ? v : null];
  nanti(petaGambar);
}
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-pk]"); if (!b || !PKD || b.disabled) return;
  if (b.dataset.pk !== "geser") b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* chrome urgent */
  petaAtur(b.dataset.pk, b.dataset.v);
});
/* input tanggal memicu change pada tiap segmen yang menghasilkan tanggal sah (mengetik "10" lewat "1" melompat ke Januari lebih dulu) dan render ulang
   merebut fokus dari input yang sedang diketik: komit setelah jeda, seperti pencarian (tunda). Nilai dibaca saat jeda habis; yang belum sah diabaikan petaAtur. */
document.addEventListener("change", e => { const c = e.target.closest("select[data-pk],input[data-pk]"); if (!c || !PKD) return;
  /* penghitung waktu PER INPUT: satu penghitung bersama membuat Sampai (Tab dari Dari, < 600 ms) membatalkan komit Dari */
  if (c.type === "date") { clearTimeout(c._h); c._h = setTimeout(() => PKD && petaAtur(c.dataset.pk, c.value), 600); return; }
  petaAtur(c.dataset.pk, c.value); });
/* pemilih kartu: gambar ulang kartunya saja */
const GAMBAR = {ring: () => isi("ring", kartuRingkasan), luas: () => isi("luas", kartuLuas), kurva: () => isi("kurva", kartuKurva),
  provM: () => isi("provg", kartuProvGrafik), provK: () => { isi("kab", kartuKab); renderKab(); }};
let tunda;
document.addEventListener("input", e => { if (e.target.id !== "lpCari") return; st.cari = e.target.value; st.k.hal = 0; clearTimeout(tunda); tunda = setTimeout(() => nanti(renderKab), 120); });
addEventListener("beforeprint", () => { st.cetak = true; renderKab(); sampul(); });
addEventListener("afterprint", () => { st.cetak = false; renderKab(); });
const gelapSkrg = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
$("#tema").onclick = () => { const t = gelapSkrg() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };

/* ---------- kartu dari Insight beranda (pemilik, 17 Okt 2026): tren 9 provinsi, musim El Niño, cuaca FWI, konsesi & gambut.
   Digambar ulang dari data laporan + musim.json, fwi.json, kompleks_konsesi.json; rupa mengikuti kartu beranda ---------- */
const PRIO = ["14", "15", "16", "61", "62", "63", "64", "53", "93"], nmP = k => D.prov[k]?.nama || k;
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], DAS = i => BLN[Math.floor(i / 3)] + " " + ["awal", "tengah", "akhir"][i % 3];
const X = {};
const muatTambahan = () => Promise.all(["musim", "fwi", "kompleks_konsesi", "factsheet_karhutla", "musim_harian", "sejarah"].map(n => fetch(`/data/${n}.json`).then(r => r.ok ? r.json() : null).catch(() => null)))
  .then(([mu, fwi, ks, fs, mh, sj]) => { Object.assign(X, {mu, fwi, ks, fs, mh, sj}); if (D) { isi("kurva", kartuKurva); isi("riwayat", kartuRiwayat); isi("tren", kartuTren); isi("musim", kartuMusim); isi("cuaca", kartuCuaca); isi("konsesi", kartuKonsesi); } });
const tunggu = ey => Kartu.kartu(ey, "Memuat…", '<div class="kosong">Memuat data…</div>', "");

function kartuTren() {
  const hari = D.hari.slice(-7), L = hari.length, pv = PRIO.filter(k => D.prov[k]);
  const W = 940, cw = W / 3, ch = 118, H = Math.ceil(pv.length / 3) * (ch + 36), HIJAU = "#2b8c86", MERAH = "#c9503a", BANDING = "#f2c49c", LAMA = "#dfe3ea";
  let naik = 0, g = "";
  pv.forEach((k, i) => { const v = hari.map(h => D.prov[k].titik[D.hari.indexOf(h)] || 0), m = Math.max(1, ...v), x0 = (i % 3) * cw, y0 = Math.floor(i / 3) * (ch + 36), bw = (cw - 34) / L;
    const tiga = v.slice(-3).reduce((a, b) => a + b, 0), sblm = v.slice(-6, -3).reduce((a, b) => a + b, 0), d = sblm ? tiga / sblm - 1 : 0, arah = Math.sign(d); if (arah > 0) naik++;
    const wA = arah > 0 ? MERAH : arah < 0 ? HIJAU : "#8a94a6";
    g += `<text x="${x0 + 10}" y="${y0 + 18}" font-size="13.5" font-weight="700">${esc(nmP(k))}</text><text x="${x0 + cw - 26}" y="${y0 + 18}" text-anchor="end" font-size="12.5" font-weight="800" style="fill:${wA}">${arah > 0 ? "▲" : arah < 0 ? "▼" : "•"} ${fmt(Math.abs(Math.round(d * 100)))}%</text>`;
    v.forEach((x, j) => { const h = x / m * (ch - 52), w = j >= L - 3 ? wA : j >= L - 6 ? BANDING : LAMA, cx = x0 + 10 + j * bw + bw / 2, bf = false;
      g += `<rect x="${x0 + 10 + j * bw + bw * .16}" y="${y0 + ch - 18 - h}" width="${bw * .68}" height="${Math.max(2, h)}" rx="4" fill="${w}"/>`
        + `<text x="${cx}" y="${y0 + ch - 22 - Math.max(2, h)}" text-anchor="middle" font-size="10" font-weight="800" opacity=".8">${fmt(x)}</text>`
        + `<text x="${cx}" y="${y0 + ch - 4}" text-anchor="middle" font-size="10" opacity="${bf ? .9 : .55}" font-weight="${bf ? 700 : 400}">${+hari[j].slice(8)}${bf ? "*" : ""}</text>`
        + (j > 0 && v[j - 1] ? (() => { const a = Math.round((x / v[j - 1] - 1) * 100); return `<text x="${cx}" y="${y0 + ch + 10}" text-anchor="middle" font-size="9.5" font-weight="800" style="fill:${a > 0 ? MERAH : a < 0 ? HIJAU : "#8a94a6"}">${a > 0 ? "▲" : a < 0 ? "▼" : "•"}${fmt(Math.abs(a))}%</text>`; })() : ""); }); });
  return Kartu.kartu("Tren harian", `Titik panas naik di ${Kartu.hl(naik + " dari " + pv.length)} provinsi yang sering mengalami karhutla dalam 3 hari terakhir`,
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Titik panas harian per provinsi">${g}</svg>`, "NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21; lokasi unik per hari)", "",
    [[HIJAU, "3 hari terakhir turun"], [MERAH, "3 hari terakhir naik"], [BANDING, "3 hari pembanding"], [LAMA, "hari sebelumnya"], ["#8a94a6", "▲▼% di bawah tanggal = perubahan dari hari sebelumnya"]]);
}

/* riwayat luas terbakar nasional: grafiknya di riwayat_nasional.js, dipakai juga Insight index.html */
function kartuRiwayat() {
  if (!X.fs || !D.tahun_berjalan) return tunggu("Riwayat nasional");
  const r = riwayatNasional(X.fs, D.tahun_berjalan, X.sj, MEREK);
  return Kartu.kartu("Riwayat nasional", r.judul, r.svg, r.sumber, "", r.leg);
}

/* musim: tahun ini El Niño, jadi peluang tahun El Niño saja (tanpa pilihan tahun biasa) */
function kartuMusim() {
  const mu = X.mu; if (!mu) return tunggu("Musim");
  const h = D.hari_berjalan || D.hari.at(-1), kini = (+h.slice(5, 7) - 1) * 3 + Math.min(2, Math.floor((+h.slice(8) - 1) / 10)), n = 7, K = "p_el_nino";
  const idx = Array.from({length: n}, (_, j) => (kini + j) % 36), pv = PRIO.filter(k => mu.prov[k]);
  const W = 940, L = 190, cw = (W - L - 10) / n, rh = 34, T = 28, H = T + pv.length * rh + 6;
  const warna = v => v < .05 ? "var(--surface)" : v >= .5 ? "#b8392b" : `color-mix(in oklch, #c9503a ${Math.round(25 + v * 75)}%, #e3b94e)`;
  let g = idx.map((d, j) => `<text x="${L + j * cw + cw / 2}" y="16" text-anchor="middle" font-size="11.5" font-weight="700" opacity="${j ? .7 : 1}">${DAS(d)}</text>`).join("");
  pv.forEach((k, i) => { const y = T + i * rh, o = mu.prov[k];
    g += `<text x="${L - 10}" y="${y + 21}" text-anchor="end" font-size="13" font-weight="600">${esc(nmP(k))}</text>`;
    idx.forEach((d, j) => { const v = o[K][d];
      g += `<rect style="fill:${warna(v)}" x="${L + j * cw + 2}" y="${y + 3}" width="${cw - 4}" height="${rh - 6}" rx="5"/><text x="${L + j * cw + cw / 2}" y="${y + 22}" text-anchor="middle" font-size="12.5" font-weight="700" style="fill:${v >= .05 ? "#fff" : "currentColor"}">${Math.round(v * 100)}%</text>`; }); });
  const masih = pv.filter(k => idx.slice(0, 3).some(d => mu.prov[k][K][d] >= .3)), akhir = pv.map(k => { const p = mu.prov[k][K]; let j = 0; while (j < n && p[idx[j]] >= .15) j++; return [k, j]; }).sort((a, b) => b[1] - a[1])[0];
  const sampai = akhir[1] ? (d => ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Math.floor(d / 3)] + " " + ["awal", "tengah", "akhir"][d % 3])(idx[akhir[1] - 1]) : "";
  return Kartu.kartu("Musim", `${Kartu.hl(masih.length + " provinsi")} masih harus dalam pantauan 30 hari ke depan karena tahun ini adalah El Niño; berdasarkan tren 2002–2025 berpeluang masuk masa puncak kebakaran${sampai ? `. ${esc(nmP(akhir[0]))} perlu dipantau hingga ${Kartu.hl(sampai)}` : ""}`,
    `<div class="tw" style="border:0;box-shadow:none"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Peluang periode berbahaya tahun El Niño">${g}</svg></div>`,
    `NASA FIRMS MODIS 2002–2025; peluang tahun El Niño (${mu.tahun_el_nino.join(", ")})`, "", [["#e3b94e", "peluang rendah"], ["#d9733f", "sedang"], ["#b8392b", "≥ 50%"]]);
}

function warnaFWI(v) { const s = [[0, [90, 158, 116]], [2, [168, 186, 102]], [7, [227, 185, 78]], [14, [226, 128, 63]], [25, [201, 80, 58]], [40, [122, 43, 63]]];
  for (let k = 1; k < s.length; k++) if (v <= s[k][0]) { const [a, ca] = s[k - 1], [b, cb] = s[k], t = (v - a) / (b - a); return `rgb(${ca.map((c, j) => Math.round(c + (cb[j] - c) * t)).join(",")})`; }
  return `rgb(${s.at(-1)[1].join(",")})`; }
function kartuCuaca() {
  const F = X.fwi; if (!F) return tunggu("Cuaca");
  const G = F.grid, hari = G[0].hari.map(x => x.tgl), i0 = Math.max(0, hari.indexOf(F.hari_ini)), hr = hari.slice(i0, i0 + 4), pv = PRIO.filter(k => G.some(c => c.prov === k));
  const lab = t => { const d = (Date.parse(t) - Date.parse(F.hari_ini)) / 864e5; return ["Hari ini", "Besok", "Lusa"][d] || new Date(t + "T12:00:00Z").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", timeZone: "UTC"}); };
  const sel = (k, t) => G.filter(c => c.prov === k).map(c => c.hari.find(x => x.tgl === t)?.fwi ?? 0).sort((a, b) => a - b);   /* median sel provinsi, bukan maksimum satu sel (audit 21 Okt 2026) */
  const fwi = (k, t) => { const a = sel(k, t); return a.length ? (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2 : 0; };
  const porsi = (k, t) => { const a = sel(k, t); return a.length ? a.filter(v => v >= 14).length / a.length : 0; };
  const W = 940, L = 190, cw = (W - L) / hr.length, rh = 40, T = 30, H = T + pv.length * rh;
  let g = hr.map((t, j) => { const x = L + j * cw + cw / 2;
    return j === 0 ? `<rect x="${x - 34}" y="2" width="68" height="20" rx="10" fill="#0b2545"/><text x="${x}" y="16" text-anchor="middle" font-size="11.5" font-weight="700" style="fill:#fff">${lab(t)}</text>`
      : `<text x="${x}" y="16" text-anchor="middle" font-size="11.5" font-weight="700" opacity=".7">${lab(t)}</text>`; }).join(""), sgt = pv.filter(k => sel(k, hr.at(-1)).length >= 5).map(k => [k, porsi(k, hr.at(-1))]).filter(x => x[1] >= .1).sort((a, b) => b[1] - a[1]);
  pv.forEach((k, i) => { const y = T + i * rh; g += `<text x="${L - 10}" y="${y + 24}" text-anchor="end" font-size="13" font-weight="600">${esc(nmP(k))}</text>`;
    hr.forEach((t, j) => { const v = fwi(k, t);
      g += `<rect x="${L + j * cw + 3}" y="${y + 4}" width="${cw - 6}" height="${rh - 8}" rx="9" fill="${warnaFWI(v)}"/><text x="${L + j * cw + cw / 2}" y="${y + 25}" text-anchor="middle" font-size="13" font-weight="800" style="fill:#fff">${fmt(Math.round(v))}</text>`; }); });
  const sd = new Date(hr.at(-1) + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "long", timeZone: "UTC"});
  const dataF = new Date(F.hari_ini + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "long", timeZone: "UTC"});
  return Kartu.kartu("Cuaca", sgt.length ? `Menurut prakiraan model, Fire Weather Index sangat tinggi (≥ 14) mencakup ${sgt.slice(0, 3).map(([k, p]) => `${Kartu.hl(p >= .9 ? "hampir seluruh" : p >= .65 ? "sekitar tiga perempat" : p >= .4 ? "sekitar separuh" : p >= .2 ? "sekitar seperempat" : "sebagian kecil")} sel grid ${esc(nmP(k))}`).join(", ")} sampai ${sd} (sel grid 0,5° per provinsi, minimal 5 sel; model Open-Meteo, data ${dataF}${(Date.parse(new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10)) - Date.parse(F.hari_ini)) / 864e5 > 2 ? ", belum diperbarui" : ""})`
    : `Menurut prakiraan model, tidak ada provinsi pantauan yang sedikitnya 10% sel grid-nya ber-Fire Weather Index sangat tinggi sampai ${sd} (model Open-Meteo, data ${dataF})`,
    `<div class="tw" style="border:0;box-shadow:none"><svg viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Prakiraan bahaya cuaca kebakaran">${g}</svg></div>`,
    "Open-Meteo (ECMWF/ICON); FWI rumus Kanada (Van Wagner 1987). Kotak = median FWI sel provinsi, bukan maksimum; prakiraan hari ke-3 belum diverifikasi", "", [[warnaFWI(0), "rendah < 2"], [warnaFWI(4), "sedang 2–< 7"], [warnaFWI(10), "tinggi 7–< 14"], [warnaFWI(25), "sangat tinggi ≥ 14"]]);
}

/* konsesi & gambut: porsi titik panas 7 hari di kompleks api per provinsi (kompleks_konsesi.json total.prov / total.gambut) */
function kartuKonsesi() {
  const KK = X.ks; if (!KK) return tunggu("Konsesi");
  const T = KK.total || {}, JN = [["sawit", "Sawit", "#c98a3c"], ["hti", "HTI", "#6b8e3a"], ["hph", "HPH", "#2f6f8f"], ["tambang", "Tambang", "#7a5c99"]];
  const R = Object.fromEntries((KK.jenis || []).map(a => [a.jenis, a])), pct = p => (p < .005 && p > 0 ? "< 1" : Math.round(p * 100)) + "%";
  const W = 940, L = 210, RW = 70, rh = 34, bw = W - L - RW;
  const batang = (rows, segs, kanan) => { let g = ""; rows.forEach(([k, t, o], i) => { const y = 8 + i * rh; let x0 = L;
      g += `<text x="${L - 12}" y="${y + 21}" text-anchor="end" font-size="13" font-weight="600">${esc(nmP(k))}</text>`;
      segs.forEach(([nm, w, f, gelap]) => { const v = f(o, t), lw = t ? v / t * bw : 0; if (lw <= 0) return;
        g += `<rect x="${x0}" y="${y + 7}" width="${lw}" height="${rh - 14}" fill="${w}"/>${lw >= 34 ? `<text x="${x0 + lw / 2}" y="${y + 21.5}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:${gelap ? "#fff" : "#3a4658"}">${pct(v / t)}</text>` : ""}`; x0 += lw; });
      g += `<text x="${W - RW + 10}" y="${y + 21}" font-size="12" font-weight="800">${kanan(o, t)}</text>`; });
    return `<svg viewBox="0 0 ${W} ${14 + rows.length * rh}" role="img">${g}</svg>`; };
  const leg = a => `<div class="ex-leg" style="justify-content:center;font-size:11.5px;margin:4px 0 10px">${a.map(([n, w]) => `<span><i style="background:${w}"></i>${n}</span>`).join("")}</div>`;
  const kep = (a, b) => `<div class="lp-ksh"><b>${a}</b><span>${b}</span></div>`;
  const pv = {}; for (const [j] of JN) for (const [k, n] of Object.entries(R[j]?.prov || {})) (pv[k] ||= {})[j] = n;
  const rk = Object.entries(pv).filter(([k]) => T.prov?.[k]).map(([k, o]) => [k, T.prov[k][0], {...o, _k: T.prov[k][1]}]).sort((a, b) => Object.values(b[2]).reduce((x, y) => x + y, 0) - Object.values(a[2]).reduce((x, y) => x + y, 0)).slice(0, 10);
  const sKons = [...JN.filter(([j]) => R[j]).map(([j, n, w]) => [n, w, o => o[j] || 0, 1]), ["Di luar konsesi", "#cfd8e3", (o, t) => t - Object.entries(o).filter(([j]) => j !== "_k").reduce((a, [, v]) => a + v, 0), 0]];
  const rg = Object.entries(T.gambut || {}).filter(([k]) => T.prov?.[k]?.[0] >= 50).map(([k, gb]) => [k, T.prov[k][0], {gb}]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const badan = (rk.length ? kep("Titik panas di areal konsesi per provinsi", "% di konsesi") + batang(rk, sKons, (o, t) => pct(Math.min(o._k, t) / (t || 1))) + leg(sKons.map(s => [s[0], s[1]])) : "")
    + (rg.length ? kep("Titik panas di lahan gambut per provinsi", "% di gambut") + batang(rg, [["Gambut", "#6b4a2b", o => o.gb, 1], ["Tanah mineral", "#d9c7a8", (o, t) => t - o.gb, 0]], (o, t) => pct(o.gb / (t || 1))) + leg([["Gambut", "#6b4a2b"], ["Tanah mineral", "#d9c7a8"]]) : "");
  return Kartu.kartu("Konsesi", `${Kartu.hl(pct(T.n ? T.konsesi / T.n : 0))} titik panas di cluster 7 hari terakhir (${fmt(T.konsesi)} dari ${fmt(T.n)}) berada di dalam areal konsesi`,
    badan || '<div class="kosong">Data status lahan belum tersedia</div>', "NASA FIRMS VIIRS 375 m (7 hari); batas konsesi: sawit/HPH sekitar 2014, HTI 2020–2022, tambang 2026 (Kemenhut via Global Forest Watch, Trase, Kemenhut PPKH); gambut KLHK. Titik di areal konsesi bukan bukti siapa yang membakar");
}

/* ---------- muat ---------- */
async function muat(ulang) {
  const r = await fetch("/data/laporan.json?t=" + Math.floor(Date.now() / 60000), {cache: "no-cache"});
  if (!r.ok) throw new Error(r.status);
  const d = await r.json();
  if (ulang && D && d.dibuat === D.dibuat && d.cutoff === D.cutoff) return;
  D = d;
  st.prov = kodeSah(st.prov).join(",");   /* ?prov= tak dikenal dibuang; tak tersisa = Indonesia */
  /* ?hari= dari arsip tab Laporan: hari itu dipakai bila datanya ada, dan dihitung sebagai pilihan
     manual supaya muat ulang berkala tidak menariknya kembali ke hari terbaru. */
  if (!st.hari && hariQ && D.hari.includes(hariQ)) { st.hari = hariQ; st.manual = true; }
  if (!st.manual || !D.hari.includes(st.hari)) st.hari = awal();
  if (ulang) PKmuat = false;   /* peta_karhutla.json ikut dimuat ulang pada render berikutnya */
  ulang ? nanti(semua) : semua();
  /* ?cetak=1 dari arsip tab Laporan: dialog cetak dibuka SEKALI sesudah laporan tergambar penuh,
     bukan tiap kali data dimuat ulang. */
  if (!ulang && new URLSearchParams(location.search).get("cetak") === "1") nanti(() => setTimeout(print, 400));
}
pasangTip(); PilihCantik.pasang(); muatTambahan();
muat(false).catch(() => { $("#lpKepala").innerHTML = '<div class="kosong">Laporan belum tersedia. Coba muat ulang beberapa menit lagi.</div>'; $("#upd").textContent = "Data belum tersedia"; });
/* muat ulang dilewati selama kamu mengetik di kotak cari (render ulang akan membuang fokusnya) */
setInterval(() => { if (document.activeElement?.id !== "lpCari") muat(true).catch(() => {}); }, 600000);
