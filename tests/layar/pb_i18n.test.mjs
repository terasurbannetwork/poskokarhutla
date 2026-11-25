// PB-64 (F-31, Q8): layar paritas dua bahasa. Teks yang ditulis mesin bersama paritas di public/inti (dipakai laman gempa, cuaca, udara,
// gunung api, kekeringan, pesisir) harus punya padanan Inggris di public/i18n/en.json.
// Penerjemahnya ASLI: public/i18n.js dijalankan di vm dengan ?lang=en dan kamus en.json sungguhan, lalu tiap teks layar dilewatkan ke window.T.
// Teks dicabut dari sumber modul (string, template literal, simpul teks HTML, atribut title/aria-label/placeholder/alt/data-tip).
// Kunci khusus paritas tinggal di en.json bagian "paritas" (digabung ke kamus oleh i18n.js): tidak ada yang hilang, tidak ada yang lebih,
// tidak kembar dengan kamus umum, dan terjemahannya tidak berhuruf kapital semua dan tidak memakai "safe".
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");

/* mesin bersama yang lahir dari paket paritas (TIKET PB-*) dan dimuat laman bencana selain karhutla */
export const MODUL = ["brief", "cari", "kalender", "pilih_tanggal", "unduh_tabel", "pb_titik", "peta_kab", "profil_kab", "renlap", "sinyal", "banding", "timelapse"]
  .map(n => `public/inti/${n}.js`);

/* potongan yang dicabut tetapi tidak pernah jadi simpul teks utuh di layar (alasan di tiap baris) */
const BUKAN_TEKS = new Set([
  "pilih ujung",                                                                         // kalender: kelas CSS
  "Kec. …", "Posko Pusat …", "Posko Menengah …", "Posko …", "BPBD Provinsi …",           // cari: nama diri hasil cari, dari data
  "Lembar", ", data …", "Data …",                                                        // unduh_tabel: isi berkas xlsx/docx/pdf, bukan simpul DOM
  "Citra © Esri, Maxar, Earthstar",                                                      // banding: atribusi peta, dilewati i18n.js
  "NASA GIBS, …",                                                                        // timelapse: label bingkai GIF, nama sumber dan lapisan
]);

/* potongan bersambung -> teks utuh yang benar-benar tampil (isian contoh dari bentuk data asli) */
const LOGBOOK = "persen kejadian berisi di logbook Pusdalops 2011-2026 yang mencatat tindakan ini; pencocokan kata kunci, bisa kurang atau lebih dari kenyataan";
const RENLAP = ["Renlap 2026-11-12 v2, 12 target. Alasan hanya diisi bila tidak didatangi."], DIMINTA = ["Renlap diminta, mesin sedang menyusun.", "Renlap diminta, mesin belum menjawab: antrean penuh"];
/* satuan yang dipasok adaptor laman bencana ke brief dan kalender (grep satuan: di public/<bencana>), plus bawaan mesin */
const SATUAN = ["erupsi", "gempa", "gunung", "gunung api", "kab/kota", "kabupaten/kota", "kabupaten", "kejadian", "peringatan", "perubahan", "provinsi", "situs", "titik rob", "baris", "butir", "data"];
const CONTOH = new Map(Object.entries({
  "dan … … lain": SATUAN.map(u => `dan 3 ${u} lain`),
  "Data per …": ["Data per 16 Nov 2026 10.00 WIB"],
  "Waktu cut-off data: …. Angka diambil dari data yang tampil di halaman saat dicetak.": ["Waktu cut-off data: 16 Nov 2026 10.00 WIB. Angka diambil dari data yang tampil di halaman saat dicetak."],
  ", tidak tersedia": ["12 Okt, tidak tersedia", "12 Okt, 5 kejadian, tidak tersedia", ...SATUAN.map(u => `12 Okt, 5 ${u}`)],
  "Mulai …. Ketuk tanggal akhir, atau ketuk tanggal yang sama untuk satu hari.": ["Mulai 12 Okt. Ketuk tanggal akhir, atau ketuk tanggal yang sama untuk satu hari."],
  "Memuat jumlah ……": SATUAN.map(u => `Memuat jumlah ${u}…`),
  "Gagal menyimpan (kode …": ["Gagal menyimpan (kode 500)."],
  "Tampilkan lagi (…": ["Tampilkan lagi (12 baris)"],
  "…, … per kab/kota…": ["Kejadian, jumlah per kab/kota", "Kejadian, rata-rata per hari per kab/kota"],
  "…, satuan …. Sumber: laporan harian ….…": ["12 Nov 2026, satuan kejadian. Sumber: laporan harian BNPB.", "12 Okt sampai 14 Okt 2026, satuan mm. Sumber: laporan harian BMKG. Hipotesis."],
  "Target …": ["Target 12"],
  "Gagal (kode …": ["Gagal (kode 500)."],
  [LOGBOOK + "…"]: [LOGBOOK, LOGBOOK + "; data dibuat 12 Nov 2026"],
  "; data dibuat …": [LOGBOOK + "; data dibuat 12 Nov 2026"],
  "… kejadian berisi": ["dari 1.234 kejadian berisi"],
  "Renlap …": RENLAP, "… target. Alasan hanya diisi bila tidak didatangi.": RENLAP,
  "Renlap diminta…": DIMINTA, ", mesin belum menjawab: …": DIMINTA, ", mesin sedang menyusun.": DIMINTA,
  "… butir sudah tersimpan)": ["Gagal (kode 500). (3 butir sudah tersimpan)"],
  "… butir tersimpan.…": ["3 butir tersimpan.", "3 butir tersimpan. Renlap ditandai selesai."],
  "Provinsi …": ["Provinsi 99"],
  "Peristiwa padam internet sejak …": ["Peristiwa padam internet sejak 12 Okt 2026"],
  "Tidak ada peristiwa padam internet tercatat untuk … pada rentang data.": ["Tidak ada peristiwa padam internet tercatat untuk Aceh pada rentang data."],
  "… punya kurang dari 20 sel tercatat: angka mengukur kepadatan pengamatan pengguna, bukan jumlah menara.": ["Aceh punya kurang dari 20 sel tercatat: angka mengukur kepadatan pengamatan pengguna, bukan jumlah menara."],
  "NASA GIBS, …, …": ["NASA GIBS, MODIS Terra, 12 Okt"],
  "Citra dan …": ["Citra dan MODIS"],
  "Warna asli dan …, tanggal sama": ["Warna asli dan MODIS Terra, tanggal sama"],
  "…, satu citra per hari (tanggal pengamatan, UTC)": ["Citra: NASA GIBS, MODIS Terra, satu citra per hari (tanggal pengamatan, UTC)"],
  "Mengunduh citra …/…...": ["Mengunduh citra 3/12..."],
  "Area: … (… sampai … LS/LU, … sampai … BT)": ["Area: tampilan peta saat ini (-6.2 sampai 1.5 LS/LU, 95.1 sampai 141 BT)"],
}));

/* nama bulan di larik modul tampil dirangkai angka ("12 Okt", "November 2026"): diuji dalam bentuk rangkaiannya */
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const RAKIT = new Map([...BULAN.map(b => [b, [b + " 2026"]]), ...BULAN.map(b => b.slice(0, 3).replace("Agu", "Agu")).map(b => [b, ["12 " + b]])]);

const S = "\u0001";   // penanda isian ${...} atau sambungan string
/* ---------- pencabut literal: string, template (isian jadi S), regex dan komentar dilewati */
function literal(src) {
  const out = []; let i = 0;
  const regexBoleh = j => { let k = j - 1; while (k >= 0 && /\s/.test(src[k])) k--; if (k < 0) return true;
    if (/[(,=:[!&|?{};+\-*%<>~^]/.test(src[k])) return true; const w = src.slice(Math.max(0, k - 6), k + 1); return /(?:^|\W)(?:return|typeof|case|in|of)$/.test(w); };
  function str(q) { let s = ""; i++; while (i < src.length && src[i] !== q) { if (src[i] === "\\") { s += src[i + 1] === "n" ? " " : src[i + 1]; i += 2; continue; } s += src[i++]; } i++; return s; }
  function tpl() { let s = ""; i++; while (i < src.length && src[i] !== "`") {
      if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") { const a = i + 2; i += 2; kode(true); s += /^\s*(?:IKON|svg\(|ik\b)/.test(src.slice(a, i)) ? "<>" : S; continue; }   // ikon = elemen, bukan isian teks
      s += src[i++]; }
    i++; return s; }
  function kode(dalam) { let d = 0;
    while (i < src.length) { const c = src[i];
      if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 2; if (i < 2) i = src.length; continue; }
      if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) i = src.length; continue; }
      if (c === "/" && regexBoleh(i)) { i++; let kel = false; while (i < src.length && (kel || src[i] !== "/")) { if (src[i] === "\\") i++; else if (src[i] === "[") kel = true; else if (src[i] === "]") kel = false; i++; } i++; continue; }
      if (c === '"' || c === "'") { const awal = i, s = str(c); out.push({s, sebelum: src.slice(Math.max(0, awal - 48), awal), sesudah: src.slice(i, i + 3)}); continue; }
      if (c === "`") { const awal = i, s = tpl(); out.push({s, sebelum: src.slice(Math.max(0, awal - 48), awal), sesudah: src.slice(i, i + 3)}); continue; }
      if (c === "{") d++; else if (c === "}") { if (dalam && d === 0) { i++; return; } d--; }
      i++; }
  }
  kode(false); return out;
}
const ENT = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " "};
const ATR = /\s(?:title|aria-label|placeholder|alt|data-tip)="([^"]*)"/g;
/* literal -> potongan teks layar: simpul teks di antara tag dan nilai atribut yang diterjemahkan i18n.js */
function potong({s, sebelum, sesudah}) {
  if (/(?:console\.\w+|querySelector(?:All)?|closest|matches|EventListener|getElementById|classList\.\w+|setProperty|[gs]etAttribute|hasAttribute|removeAttribute|createElement|fetch|Error|dataset\.\w+\s*===?|\.t\s*===?|\bt\s*===?|includes|startsWith|test|replace|split|join)\(?\s*$/.test(sebelum)) return [];
  if (/^\s*:/.test(sesudah) && /[{,]\s*$/.test(sebelum)) return [];                       // kunci objek
  if (/(?:type:|key\s*===?|className\s*=|el\(\s*"[\w-]+"\s*,)\s*$/.test(sebelum)) return [];   // jenis GeoJSON, tombol papan ketik, kelas CSS
  let t = s;
  if (/\+\s*$/.test(sebelum)) t = S + t;                 // "..." + x  /  x + "..." : sambungan dengan isian
  if (/^\s*\+/.test(sesudah)) t = t + S;
  const hasil = [];
  t = t.replace(/<([a-zA-Z][^>]*)>/g, (_, isi) => { for (const m of isi.matchAll(ATR)) hasil.push(m[1]); return "<>"; }).replace(/<\/?[a-zA-Z!][^>]*>/g, "<>");
  hasil.push(...t.split("<>"));
  return hasil.map(x => x.replace(/&[#\w]+;/g, e => ENT[e] ?? e).replace(/\s+/g, " ").trim()).filter(x => {
    const statis = x.split(S).join(" ");
    if (!/\p{L}{2}/u.test(statis)) return false;
    if (/[{}]|=>|==|\w="|^[.#[]|[a-z-]+:\s*[^;\s]+;\s*[a-z-]+:|\/\/|^\/|\.(?:json|js|css|geojson|gif|png)\b|^[a-z][\w-]*:[^\s]|sans-serif|^rgb\(|^use strict$/.test(statis)) return false;   // kode, CSS, jalur
    if (!/\s/.test(x.replace(new RegExp(S, "g"), " ").trim()) && !/^\p{Lu}\p{Ll}/u.test(x)) return false;          // satu kata kecil: kunci, satuan, kelas
    if (/^[\w-]+(?:\s[\w-]+)*$/.test(statis) && /[_]|[a-z][A-Z]/.test(statis)) return false;                          // pengenal
    return true;
  });
}
export function teksLayar() {
  const r = {};
  for (const f of MODUL) r[f] = [...new Set(literal(baca(f)).flatMap(potong).flatMap(x => RAKIT.get(x) || CONTOH.get(x.split(S).join("…")) || [x]))]
    .filter(x => !BUKAN_TEKS.has(x.split(S).join("…"))).map(t => ({t, dinamis: t.includes(S)}));
  return r;
}

/* ---------- penerjemah asli: public/i18n.js di vm dengan ?lang=en */
export async function penerjemah(EN = JSON.parse(baca("public/i18n/en.json"))) {
  const kosong = () => {}, el = () => ({setAttribute: kosong, removeAttribute: kosong, appendChild: kosong, style: {}, textContent: ""});
  const ctx = {console, setTimeout, clearTimeout, Promise, URL, URLSearchParams, Map, WeakMap, Set, Intl, Number, Date, Object, String, RegExp, JSON, Error, Array, Math};
  ctx.window = ctx; ctx.location = {href: "http://lokal/gempa?lang=en", search: "?lang=en", pathname: "/gempa"};
  ctx.sessionStorage = {getItem: () => null, setItem: kosong}; ctx.history = {replaceState: kosong, pushState: kosong, state: null};
  ctx.document = {currentScript: {src: "http://lokal/i18n.js"}, documentElement: el(), head: el(), body: null, readyState: "loading", createElement: el, addEventListener: kosong, querySelector: () => null};
  ctx.addEventListener = kosong; ctx.MutationObserver = class { observe() {} disconnect() {} };
  ctx.CanvasRenderingContext2D = class {}; ctx.NodeFilter = {};
  ctx.fetch = async u => ({ok: true, json: async () => String(u).includes("/i18n/en.json") ? EN : {}});
  vm.runInContext(baca("public/i18n.js"), vm.createContext(ctx));
  await ctx.T.siap();
  const T = ctx.T;
  /* lolos = penerjemah menemukan padanan (tidak tercatat di T.hilang); isian diuji sebagai angka lalu sebagai kata kamus */
  T.lolos = ({t, dinamis}) => {
    /* isian pola berbentuk "angka satuan" ("5 situs", "12 Okt") juga wajib terjemah dan benar-benar terganti di hasil:
       i18n.js menerjemahkan isian pola diam-diam tanpa mencatat yang hilang */
    const POLA = (EN.pola_paritas || []).map(([re]) => new RegExp(re, "su"));
    const coba = s => { T.hilang.clear(); const h = T(s); if (T.hilang.size) return false;
      const m = POLA.map(re => s.match(re)).find(Boolean), isian = m ? m.slice(1).filter(g => g && /^[\d.,]+ \p{L}\D*$/u.test(g)) : [];
      return isian.every(g => { T.hilang.clear(); const e = T(g); return !T.hilang.size && h.includes(e); }); };
    return dinamis ? coba(t.split(S).join("12")) || coba(t.split(S).join("kejadian")) : coba(t);
  };
  T.EN = EN;
  return T;
}

test("i18n.js menggabung bagian paritas ke kamus", async () => {
  const T = await penerjemah(), [k, v] = Object.entries(T.EN.paritas)[0];
  assert.ok(k && v, "en.json punya bagian paritas"); assert.equal(T(k), v);
});

test("tiap teks layar paritas punya padanan Inggris", async () => {
  const T = await penerjemah(), hilang = [];
  for (const [f, xs] of Object.entries(teksLayar())) for (const x of xs) if (!T.lolos(x)) hilang.push(`${f}: ${x.t.split(S).join("…")}`);
  assert.deepEqual(hilang, [], "tambah ke public/i18n/en.json bagian paritas, atau ke BUKAN_TEKS dengan alasan bila bukan teks layar");
});

test("bagian paritas tidak berisi kunci lebih dan tidak kembar dengan kamus umum", async () => {
  const T = await penerjemah(), P = T.EN.paritas, K = T.EN.kamus;
  const dipakai = new Set(Object.values(teksLayar()).flat().flatMap(({t}) => [T.kunci(t.split(S).join("12")), T.kunci(t.split(S).join("kejadian")), t]));
  const turun = s => s.charAt(0).toLowerCase() + s.slice(1);
  const pakai = new Set([...dipakai, ...MODUL.flatMap(f => literal(baca(f)).map(x => x.s.trim()))].flatMap(s => [s, turun(s)]));
  /* kunci yang tidak cocok secara teks diuji lewat perilaku: tanpa kunci itu, ada teks layar yang jadi tak terjemah */
  const teks = Object.values(teksLayar()).flat(), lebih = [];
  for (const k of Object.keys(P).filter(k => !pakai.has(k))) {
    const EN = structuredClone(T.EN); delete EN.paritas[k]; const T2 = await penerjemah(EN);
    if (teks.every(x => T2.lolos(x))) lebih.push(k);
  }
  assert.deepEqual(lebih, [], "kunci paritas yang tidak dipakai modul mana pun");
  assert.deepEqual(Object.keys(P).filter(k => k in K), [], "kunci paritas yang sudah ada di kamus umum");
  const POLA = T.EN.pola_paritas.map(([re]) => new RegExp(re, "su"));
  /* i18n.js memecah "A; B" dan menerjemahkan isian pola lagi lewat kamus dan pola */
  const semua = Object.values(teksLayar()).flat().flatMap(x => { const t = x.t.split(S).join("12"); return [t, ...t.split("; ")]; });
  semua.push(...semua.flatMap(t => POLA.flatMap(re => (t.match(re) || []).slice(1).filter(Boolean))));
  assert.deepEqual(T.EN.pola_paritas.filter((_, i) => !semua.some(t => POLA[i].test(t))).map(p => p[0]), [], "pola paritas yang tidak mengenai teks layar mana pun");
  const mentah = new Set(MODUL.flatMap(f => literal(baca(f)).flatMap(potong)).map(x => x.split(S).join("…")));
  assert.deepEqual([...BUKAN_TEKS, ...CONTOH.keys()].filter(k => !mentah.has(k)), [], "BUKAN_TEKS atau CONTOH yang potongannya sudah tidak ada di modul");
});

test("terjemahan paritas: tanpa huruf kapital semua, tanpa 'safe', isian {n} utuh", () => {
  const P = JSON.parse(baca("public/i18n/en.json")).paritas;
  for (const [k, v] of Object.entries(P)) {
    assert.equal(typeof v, "string", k); assert.ok(v.trim(), "kosong: " + k);
    const huruf = v.replace(/[^\p{L}]/gu, "");
    assert.ok(!(huruf.length >= 6 && /\s/.test(v.trim()) && v === v.toUpperCase()), "huruf kapital semua: " + v);
    assert.ok(!/\bsafe(?:ty|ly)?\b|\baman\b/i.test(v), "'safe' dilarang: " + v);
    const n = s => (s.match(/\{\d+\}/g) || []).sort().join();
    assert.equal(n(v), n(k), "isian {n} beda: " + k);
  }
});
