"use strict";
/* peta_karhutla.js: hitungan murni kartu "Peta provinsi" di /laporan (tanpa DOM; diuji di tests/agen/peta-karhutla.test.mjs).
   Membaca data/peta_karhutla.json apa adanya (kontrak v1: hari WIB berurutan, deret tiap provinsi sejajar dengan hari);
   di sini hanya penjumlahan periode, pembanding, dan penyusun kontrol, bukan hitung ulang metode data.
   Dipakai dua layar: kartu "Peta provinsi" (laporan.js) dan overlay kabupaten di peta utama (peta_kab.js, data/peta_karhutla_kab.json). */
(function (g) {
const MODE = [["hari", "Hari"], ["minggu", "Minggu"], ["bulan", "Bulan"], ["rentang", "Rentang"], ["tahun", "12 Bulan"]];
/* warna kolom = warna slide deck BNPB (sumber-asli-BNPB-211026.pptx: navy / biru baja / oranye; elemen ke-4 = warna muda satuan di kepala kolom) */
const METRIK = [["hot", "Hotspot", "#051C2C", "#E6ECF3"], ["luas", "Luas terbakar", "#3F5F80", "#E6ECF3"], ["belum", "Belum padam", "#D9600B", "#FFE6D5"]];
const STOK = new Set(["belum"]);   /* belum padam = persediaan pada hari terakhir periode, tidak pernah dijumlah */
/* nama bulan lewat locale id-ID: i18n.js menambal toLocaleDateString jadi en-GB di mode EN, jadi tanggal kartu ikut bahasa halaman.
   Dimemo per (bahasa, bulan, panjang): hanya 24 kemungkinan, tetapi mode Minggu memanggilnya ratusan kali tiap render */
const NB = new Map();
const namaBulan = (m, panjang) => { const k = (window.BAHASA || "id") + m + (panjang ? "p" : "s"); let v = NB.get(k);
  if (v === undefined) NB.set(k, v = new Date(Date.UTC(2001, m, 1)).toLocaleDateString("id-ID", {month: panjang ? "long" : "short", timeZone: "UTC"}));
  return v; };

/* ---------- tanggal ISO (UTC murni, tanpa zona) ---------- */
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const tambah = (s, d) => iso(Date.parse(s + "T00:00:00Z") + d * 864e5);
const senin = s => tambah(s, -((new Date(s + "T00:00:00Z").getUTCDay() + 6) % 7));
const bulanKe = (s, k) => iso(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1 + k, 1));
const tg = s => +s.slice(8), bl = s => namaBulan(+s.slice(5, 7) - 1), th = s => s.slice(0, 4);

/* kontrak v1 dipenuhi? "" = sah, selain itu alasannya; yang tidak sah dibuang kartu (kembali ke laporan.json) */
function cek(J) {
  if (!J || J.versi !== 1 || !Array.isArray(J.hari) || !J.hari.length) return "versi atau hari tidak sah";
  const n = J.hari.length;
  if (!J.hari.every((h, i) => /^\d{4}-\d\d-\d\d$/.test(h) && (!i || tambah(J.hari[i - 1], 1) === h))) return "hari tidak berurutan";
  if (!J.prov || typeof J.prov !== "object" || !Object.keys(J.prov).length) return "prov kosong";
  for (const [k, o] of Object.entries(J.prov)) for (const m of ["hot", "luas", "belum"])
    if (!Array.isArray(o[m]) || o[m].length !== n || !o[m].every(Number.isFinite)) return `prov ${k}.${m} bukan deret angka sepanjang hari`;
  return "";
}

/* data siap pakai: peta hari -> indeks dibuat sekali, tiap klik hanya menjumlah */
function siapkan(J) {
  return {hari: J.hari, n: J.hari.length, idx: new Map(J.hari.map((h, i) => [h, i])), prov: J.prov, kode: Object.keys(J.prov), celah: new Set(J.celah || []),
    /* celah per ukuran bila pipa-data kelak memisahkannya (celah_hot = S-NPP hilang, celah_luas = NOAA-20/21 hilang); selama belum, semua ukuran memakai celah */
    cm: {hot: new Set(J.celah_hot || J.celah || []), luas: new Set(J.celah_luas || J.celah || []), belum: new Set(J.celah_luas || J.celah || [])},
    metode: J.metode || {}, porsi: J.porsi, cutoff: J.cutoff, dibuat: J.dibuat};
}
const ke = (P, s) => s <= P.hari[0] ? 0 : s >= P.hari[P.n - 1] ? P.n - 1 : P.idx.get(s) ?? P.n - 1;

/* batas nominal sebuah periode di sekitar ref (belum dipotong data): minggu Senin-Minggu, bulan kalender, tahun kalender */
function batas(mode, ref, a, b) {
  if (mode === "hari") return {s: ref, e: ref};
  if (mode === "minggu") { const s = senin(ref); return {s, e: tambah(s, 6)}; }
  if (mode === "bulan") { const s = bulanKe(ref, 0); return {s, e: tambah(bulanKe(ref, 1), -1)}; }
  if (mode === "tahun") return {s: th(ref) + "-01-01", e: th(ref) + "-12-31"};
  a = a || ref; b = b || ref;
  return a <= b ? {s: a, e: b} : {s: b, e: a};
}
/* indeks hari yang tercakup (dipotong ke jangkauan data); null = periode sepenuhnya di luar data */
function rentang(P, mode, ref, a, b) {
  const {s, e} = batas(mode, ref, a, b);
  return e < P.hari[0] || s > P.hari[P.n - 1] ? null : {i0: ke(P, s), i1: ke(P, e)};
}
/* tetangga sebelum (-1) / sesudah (+1): ref barunya, ada datanya atau tidak, dan label pendek untuk tombol */
function tetangga(P, mode, ref, arah) {
  const r = mode === "hari" ? tambah(ref, arah) : mode === "minggu" ? tambah(senin(ref), 7 * arah) : mode === "bulan" ? bulanKe(ref, arah) : iso(Date.UTC(+th(ref) + arah, 0, 1));
  const {s, e} = batas(mode, r), t = rentang(P, mode, r);
  return {ref: t ? P.hari[ke(P, r)] : r, ada: !!t, label: t ? label(P, mode, t.i0, t.i1, true) : labelTgl(mode, s, e, true)};   /* tombol memberi nama isi yang benar-benar terbuka (19–20 Okt), bukan batas nominal minggu */
}
/* rentang awal saat pengguna pindah ke mode Rentang: periode yang sedang tampil; satu hari = 7 hari berakhir di hari itu */
function awalRentang(P, mode, ref, a, b) {
  const r = rentang(P, mode, ref, a, b) || {i0: P.n - 1, i1: P.n - 1};
  return r.i0 === r.i1 ? {a: P.hari[Math.max(0, r.i1 - 6)], b: P.hari[r.i1]} : {a: P.hari[r.i0], b: P.hari[r.i1]};
}

/* ---------- label ---------- */
function labelTgl(mode, s, e, pendek) {
  if (mode === "bulan") return `${namaBulan(+s.slice(5, 7) - 1, !pendek)} ${th(s)}`;
  if (mode === "tahun") return th(s);
  if (s === e) return `${tg(s)} ${bl(s)}${pendek ? "" : " " + th(s)}`;
  const x = th(s) !== th(e) ? `${tg(s)} ${bl(s)} ${th(s)} – ${tg(e)} ${bl(e)} ${th(e)}` : bl(s) === bl(e) ? `${tg(s)}–${tg(e)} ${bl(e)}` : `${tg(s)} ${bl(s)} – ${tg(e)} ${bl(e)}`;
  return pendek || th(s) !== th(e) ? x : `${x} ${th(e)}`;
}
/* bulan/tahun yang tidak tercakup penuh (data baru sampai 20 Okt, atau mulai di tengah bulan) diberi nama rentang tercakup ("1–20 Okt 2026"), bukan "Oktober 2026" */
const penuh = (mode, s, e) => { const n = batas(mode, s); return n.s === s && n.e === e; };
const label = (P, mode, i0, i1, pendek) => { const s = P.hari[i0], e = P.hari[i1];
  return labelTgl((mode === "bulan" || mode === "tahun") && !penuh(mode, s, e) ? "rentang" : mode, s, e, pendek); };
/* kata depan + label untuk kalimat judul: persediaan "per <hari terakhir>", aliran "pada" / "selama" / "sepanjang" (dipisah supaya label bisa dibungkus sendiri);
   "sepanjang" hanya untuk tahun penuh */
const waktuBagian = (P, mode, i0, i1, metrik) => STOK.has(metrik) ? ["per", label(P, "hari", i1, i1)]
  : [i0 === i1 ? "pada" : mode === "tahun" && penuh("tahun", P.hari[i0], P.hari[i1]) ? "sepanjang" : "selama", label(P, mode, i0, i1)];
const waktu = (...a) => waktuBagian(...a).join(" ");

/* ---------- angka ---------- */
/* nilai per provinsi: aliran (hotspot, luas) = jumlah harian i0..i1; persediaan (belum padam) = nilai hari i1 */
function agregat(P, metrik, i0, i1) {
  const o = {};
  for (const k of P.kode) {
    const a = P.prov[k][metrik];
    if (STOK.has(metrik)) { o[k] = a[i1]; continue; }
    let s = 0; for (let i = i0; i <= i1; i++) s += a[i];
    o[k] = s;
  }
  return o;
}
/* periode pembanding: sama panjang tepat sebelumnya (Hari: kemarin); persediaan hanya butuh hari pembandingnya (j1). a = awal yang dicek untuk periode sekarang */
const pembanding = (m, i0, i1) => { const n = i1 - i0 + 1, j1 = i1 - n, j0 = STOK.has(m) ? j1 : i0 - n; return {n, j0, j1, ada: j0 >= 0, a: STOK.has(m) ? i1 : i0}; };
/* hari bercelah (data satelit tak lengkap) di dalam periode; metrik = ukuran yang dipakai (celah bisa per ukuran, lihat siapkan) */
const celahDi = (P, i0, i1, metrik) => { const S = (metrik && P.cm[metrik]) || P.celah; return P.hari.slice(i0, i1 + 1).filter(h => S.has(h)); };
/* sebelum = null bila tidak ada pembanding ATAU periode sekarang / pembandingnya memuat hari bercelah (perubahan dari data tak lengkap hanya artefak satelit;
   celah = true di kasus kedua, celahSendiri = celahnya ada di periode sekarang) */
function banding(P, metrik, i0, i1) {
  const {n, j0, j1, ada, a} = pembanding(metrik, i0, i1), cs = celahDi(P, a, i1, metrik).length > 0, cb = ada && celahDi(P, j0, j1, metrik).length > 0;
  return {sekarang: agregat(P, metrik, i0, i1), sebelum: ada && !cs && !cb ? agregat(P, metrik, j0, j1) : null, celah: ada && (cs || cb), celahSendiri: cs,
    nama: n === 1 ? "Hari sebelumnya" : STOK.has(metrik) ? "Per " + label(P, "hari", Math.max(0, j1), Math.max(0, j1), true) : ada ? `Periode sebelumnya (${labelTgl("rentang", P.hari[j0], P.hari[j1], true)})` : ""};
}
function catatanCelah(P, i0, i1, metrik) {
  const c = celahDi(P, i0, i1, metrik), t = s => `${tg(s)} ${bl(s)}`;
  return !c.length ? "" : c.length <= 3 ? `Data satelit tidak lengkap pada ${c.map(t).join(", ")}` : `Data satelit tidak lengkap pada ${c.length} hari, mulai ${t(c[0])}`;
}
/* kalimat kedua catatan celah: kenapa lencana perubahan hilang ("" bila perubahan tampil atau tak ada pembanding) */
function catatanBanding(P, metrik, i0, i1) {
  const b = banding(P, metrik, i0, i1);
  return !b.celah ? "" : b.celahSendiri ? "Perubahan tidak ditampilkan: data satelit periode ini tidak lengkap" : "Perubahan tidak ditampilkan: data satelit pembanding tidak lengkap";
}

/* ---------- pilihan periode untuk <select>: terbaru dulu, ref = hari pertama periode yang ada datanya ---------- */
function pilihan(P, mode) {
  const o = [], akhir = P.hari[P.n - 1];
  if (mode === "tahun") for (let y = +th(P.hari[0]); y <= +th(akhir); y++) o.push(String(y));
  else for (let s = mode === "minggu" ? senin(P.hari[0]) : bulanKe(P.hari[0], 0); s <= akhir; s = mode === "minggu" ? tambah(s, 7) : bulanKe(s, 1)) o.push(s);
  return o.map(s => { const ref = mode === "tahun" ? s + "-01-01" : s, r = rentang(P, mode, ref); return {ref: P.hari[r.i0], label: label(P, mode, r.i0, r.i1)}; }).reverse();
}
const sama = (mode, a, b) => mode === "minggu" ? senin(a) === senin(b) : mode === "bulan" ? a.slice(0, 7) === b.slice(0, 7) : th(a) === th(b);

/* ---------- kontrol: ukuran, jenis periode, pemilih periode, catatan celah (markup untuk ctl kartu) ---------- */
const btn = (k, v, t, on, x = "") => `<button type="button" data-pk="${k}" data-v="${v}" aria-pressed="${on}"${x}>${t}</button>`;
/* ringkas (overlay peta kabupaten di index.html): ukuran dipilih di panel Overlay, jadi tanpa baris ukuran; tanpa lencana perubahan, jadi tanpa catatan banding;
   persediaan (belum padam) hanya bergantung pada hari terakhir periode, jadi hanya celah di hari itu yang dicatat */
function kontrol(P, s, ref, ringkas) {
  const r = rentang(P, s.mode, ref, s.a, s.b) || {i0: P.n - 1, i1: P.n - 1}, lo = P.hari[0], hi = P.hari[P.n - 1], a = P.hari[r.i0], b = P.hari[r.i1];
  const ukuran = ringkas ? "" : `<div class="seg penuh lp-mk" role="group" aria-label="Ukuran peta">${METRIK.map(([k, t, w]) => btn("metrik", k, t, s.metrik === k, ` style="--mk:${w}"`)).join("")}</div>`;
  const jenis = `<div class="seg penuh lp-md" role="group" aria-label="Jenis periode">${MODE.map(([k, t]) => btn("mode", k, t, s.mode === k)).join("")}</div>`;
  const cl = [catatanCelah(P, ringkas && STOK.has(s.metrik) ? r.i1 : r.i0, r.i1, s.metrik), ringkas ? "" : catatanBanding(P, s.metrik, r.i0, r.i1)].filter(Boolean), catatan = cl.length ? `<div class="lp-cl" role="note">${cl.map(x => `<span>${x}</span>`).join("")}</div>` : "";
  if (s.mode === "rentang") return `<div class="lp-pk">${ukuran}${jenis}<div class="lp-pr lp-rg"><label>Dari<input type="date" data-pk="a" value="${a}" min="${lo}" max="${b}"></label>`
    + `<label>Sampai<input type="date" data-pk="b" value="${b}" min="${a}" max="${hi}"></label></div>${catatan}</div>`;
  const nv = arah => { const t = tetangga(P, s.mode, ref, arah);
    return `<button type="button" class="lp-nv" data-pk="geser" data-v="${arah}"${t.ada ? "" : " disabled"} aria-label="${arah < 0 ? "Periode sebelumnya" : "Periode berikutnya"}: ${t.label}">${arah < 0 ? "‹ " : ""}${t.label}${arah > 0 ? " ›" : ""}</button>`; };
  let tengah;
  if (s.mode === "hari") tengah = `<input type="date" data-pk="ref" value="${a}" min="${lo}" max="${hi}" aria-label="Tanggal">`;
  else if (s.mode === "tahun") tengah = `<div class="seg penuh" role="group" aria-label="Tahun">${pilihan(P, "tahun").reverse().map(o => btn("ref", o.ref, o.label, th(o.ref) === th(a))).join("")}</div>`;
  else tengah = `<select data-pk="ref" aria-label="${s.mode === "minggu" ? "Pilih minggu" : "Pilih bulan"}">${pilihan(P, s.mode).map(o => `<option value="${o.ref}"${sama(s.mode, o.ref, a) ? " selected" : ""}>${o.label}</option>`).join("")}</select>`;
  return `<div class="lp-pk">${ukuran}${jenis}<div class="lp-pr">${nv(-1)}<div class="lp-pc">${tengah}</div>${nv(1)}</div>${catatan}</div>`;
}

/* ---------- perubahan keadaan kontrol (data-pk) sebagai fungsi murni: dipakai overlay peta kabupaten; laporan.js masih punya salinan sendiri (petaAtur) ---------- */
/* keadaan s = {metrik, mode, ref, a, b}; kembali keadaan baru, atau null bila masukan tak sah / tak ada tetangga */
function atur(P, s, k, v) {
  const lo = P.hari[0], hi = P.hari[P.n - 1], tepat = x => x < lo ? lo : x > hi ? hi : x, ref = s.ref || hi, tgl = /^\d{4}-\d\d-\d\d$/.test(v), o = {...s};
  if (k === "metrik") o.metrik = v;
  else if (k === "mode") {
    if (v === s.mode) return o;
    if (v === "rentang") Object.assign(o, awalRentang(P, s.mode, ref, s.a, s.b));
    else if (s.mode === "rentang") o.ref = P.hari[(rentang(P, "rentang", ref, s.a, s.b) || {i1: P.n - 1}).i1];
    o.mode = v;
  }
  else if (k === "geser") { const t = tetangga(P, s.mode, ref, +v); if (!t.ada) return null; o.ref = t.ref; }
  else if (k === "ref") { if (!tgl) return null; o.ref = tepat(v); }
  else if (k === "a" || k === "b") { if (!tgl) return null; o[k] = tepat(v); }
  else return null;
  return o;
}

/* ---------- peta kabupaten: overlay "Luas terbakar" / "Belum padam" di index.html (data/peta_karhutla_kab.json, kontrak v1) ----------
   kab: {"<prov>|<kabupaten>": {nama, prov, d: [[i, luas, belum], ...]}}; d jarang (hanya hari bernilai), i = indeks hari yang sama dengan peta_karhutla.json.
   Membaca apa adanya: tidak ada hitung ulang metode, hanya jumlah periode, kelas warna, dan pemeriksaan kontrak. */
/* "" = sah, selain itu alasannya; yang tidak sah dibuang overlay. P (opsional) = data provinsi: bila diberikan, hari harus sama persis.
   Berkas kabupaten membawa hari dan celahnya sendiri (susun_kab menyalinnya dari berkas provinsi), jadi overlay tidak memuat berkas provinsi: dua berkas yang
   di-cache terpisah bisa sesaat berselisih umur tepat sesudah penerbitan */
function cekKab(K, P) {
  if (!K || K.versi !== 1 || !Array.isArray(K.hari) || !K.hari.length || !K.kab || typeof K.kab !== "object") return "versi, hari, atau kab tidak ada";
  if (!K.hari.every((h, i) => /^\d{4}-\d\d-\d\d$/.test(h) && (!i || tambah(K.hari[i - 1], 1) === h))) return "hari tidak berurutan";
  if (K.celah != null && !Array.isArray(K.celah)) return "celah bukan daftar";
  if (P && (K.hari.length !== P.n || !K.hari.every((h, i) => h === P.hari[i]))) return "hari kabupaten tidak sama dengan hari provinsi";
  const n = K.hari.length;
  for (const [k, o] of Object.entries(K.kab)) {
    if (!/^\d+\|/.test(k)) return `kunci ${k} bukan "prov|kabupaten"`;   /* "<prov>|" tanpa nama = deteksi di fitur tanpa nama (danau): sah, tapi layar tak punya bentuknya */
    if (!o || !Array.isArray(o.d)) return `kab ${k}.d bukan daftar`;
    for (const e of o.d) if (!Array.isArray(e) || e.length !== 3 || !Number.isInteger(e[0]) || e[0] < 0 || e[0] >= n || !Number.isInteger(e[1]) || !Number.isInteger(e[2]) || e[1] < 0 || e[2] < 0) return `kab ${k}.d memuat entri tak sah`;
  }
  return "";
}
/* data siap pakai untuk kontrol periode dari berkas kabupaten saja (tanpa deret provinsi): hari, celah, porsi */
const siapkanKab = K => siapkan({hari: K.hari, celah: K.celah, celah_hot: K.celah_hot, celah_luas: K.celah_luas, porsi: K.porsi, cutoff: K.cutoff, dibuat: K.dibuat, prov: {}});
/* nilai per kabupaten yang > 0: luas = jumlah harian i0..i1; belum padam = nilai hari i1 (persediaan, tidak pernah dijumlah). Kabupaten bernilai 0 tidak ikut */
function agregatKab(KB, metrik, i0, i1) {
  const c = metrik === "belum" ? 2 : 1, stok = STOK.has(metrik), o = {};
  for (const k in KB) { let s = 0; for (const e of KB[k].d) if (stok ? e[0] === i1 : e[0] >= i0 && e[0] <= i1) s += e[c]; if (s > 0) o[k] = s; }
  return o;
}
/* bilangan "bulat" 1-2-5 terdekat: batas kelas yang enak dibaca di legenda */
const bulat = x => { const p = 10 ** Math.floor(Math.log10(x)), f = x / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; };
/* batas atas kelas (kecuali kelas terakhir) untuk nilai 1..maks, n kelas berjarak sama pada skala log (data api sangat miring); menaik, tanpa ganda, selalu < maks.
   [] = satu kelas saja (maks <= 1) */
function batasKab(maks, n = 5) {
  const b = []; if (!(maks > 1)) return b;
  for (let k = 1; k < n; k++) { const t = bulat(maks ** (k / n)); if (t >= 1 && t < maks && (!b.length || t > b.at(-1))) b.push(t); }
  return b;
}
/* n warna dari muda ke tua menuju warna sasaran (#rrggbb); kelas pertama tetap terbaca di atas peta dasar terang */
function warnaKab(sasaran, n) {
  const c = [1, 3, 5].map(i => parseInt(sasaran.slice(i, i + 2), 16));
  return Array.from({length: n}, (_, k) => { const t = n === 1 ? 1 : .25 + .75 * k / (n - 1);
    return "#" + c.map(x => Math.round(255 + (x - 255) * t).toString(16).padStart(2, "0")).join(""); });
}
/* kelas satu nilai: indeks 0..b.length (v > 0); sama dengan aturan "step" di gaya peta (nilai bulat, batas b+0,5) */
const kelasKab = (b, v) => b.filter(x => v > x).length;

g.PetaKarhutla = {MODE, METRIK, STOK, cek, siapkan, batas, rentang, tetangga, awalRentang, label, labelTgl, waktu, waktuBagian, agregat, banding, celahDi, catatanCelah, catatanBanding, pilihan, kontrol, senin, tambah,
  atur, cekKab, siapkanKab, agregatKab, batasKab, warnaKab, kelasKab};
})(window);
