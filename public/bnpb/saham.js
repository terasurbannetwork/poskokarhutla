/* Data saham (/bnpb/saham): cari emiten, lalu panel Info, Grafik, Transaksi, Dividen dari gateway Stellar Data lewat Worker (/api/saham/*).
   Tiap panel memuat dan gagal sendiri; "akses belum dibuka" ditampilkan sebagai keadaan biasa, bukan galat. Chrome kontrol urgent,
   panel berat ditunda satu frame (INP). Tombol dummy (Super Admin) mengisi contoh lokal tanpa memanggil API. Tanpa gaya/skrip inline (CSP). */
import * as H from "/bnpb/saham_hitung.js?v=4";
import {CONTOH, KONSESI, grafikSintetis, infoSintetis} from "/bnpb/saham_contoh.js?v=3";

const {ikon, h} = window.Wilayah;
const app = document.getElementById("app");
/* tertanam = tab Saham di peta utama (index.html, iframe): kepala halaman disembunyikan, peta sudah punya navbar */
const TERTANAM = new URLSearchParams(location.search).has("tertanam");
if (TERTANAM) document.documentElement.classList.add("sh-tertanam");
const NS = "http://www.w3.org/2000/svg";
const PERIODE = [["RT_PERIOD_LAST_1_DAY", "1 hari"], ["RT_PERIOD_LAST_7_DAYS", "7 hari"], ["RT_PERIOD_LAST_1_MONTH", "1 bulan"], ["RT_PERIOD_LAST_3_MONTHS", "3 bulan"], ["RT_PERIOD_YEAR_TO_DATE", "Tahun berjalan"], ["RT_PERIOD_LAST_1_YEAR", "1 tahun"]];
/* sumber dan waktu data di tooltip pil kartu (kartu standar tanpa kaki sumber, pemilik 4 Nov 2026) */
const ASAL = {info: "Stockbit via Stellar Data", grafik: "Stockbit via Stellar Data", transaksi: "Stockbit via Stellar Data", dividen: "Investing.com via Stellar Data"};
const jam = () => new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Jakarta"}).replace(/\./g, ":") + " WIB";
/* INP: dua frame + jaring setTimeout 120 md bila tab tersembunyi (rAF tak jalan) */
const nanti = f => { let jalan = false; const k = () => { if (!jalan) { jalan = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(k)); setTimeout(k, 120); };
const tunda = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

const st = {dummy: false, pilih: null, periode: PERIODE[2][0], super: false};
const el = {};
const batal = {};   // AbortController per kunci (cari, info, grafik, transaksi, dividen)

async function api(kunci, url) {
  batal[kunci]?.abort(); const ac = batal[kunci] = new AbortController();
  try { const r = await fetch(url, {signal: ac.signal}); return {s: r.status, j: await r.json().catch(() => ({}))}; }
  catch (e) { return e.name === "AbortError" ? null : {s: 0, j: {}}; }
}

/* ---------- komponen panel ---------- */
function keadaan(jenis, teks) {
  const ik = jenis === "belum" ? "sinyal" : jenis === "kosong" ? "daftar" : "peringatan";
  return h("div", {class: "sh-kosong", role: "status"}, ikon(ik), teks);
}
const hl = t => h("span", {class: "hl", teks: t});
/* kartu laporan standar .ex-std (public/inti/kartu.css): pil kategori, judul kalimat temuan beraksen .hl, isi; rapat = tabel menempel penuh */
function kartu(kunci, pil, ik, judul, lebar, rapat) {
  const jd = h("h3", null, judul), contoh = h("span", {class: "sh-contoh", hidden: true, teks: "Data contoh"}), badan = h("div", {class: "sh-badan"}), ey = h("span", {class: "ex-ey"}, ikon(ik), pil);
  const bd = h("div", {class: "ex-bd" + (rapat ? " sh-rapat" : "")}, badan);
  const sek = h("section", {class: "ex ex-std" + (lebar ? " sh-lebar" : ""), "data-panel": kunci},
    h("header", {class: "ex-hd"}, h("div", {class: "sh-pil"}, ey, contoh), h("div", {class: "ex-jd"}, jd)), bd);
  return {sek, bd, badan, jd, contoh, ey, kunci};
}

/* muat satu panel: url (atau contoh), render(data) -> node. Gagal sendiri, tidak menyentuh panel lain. */
async function isiPanel(p, url, contoh, render) {
  p.badan.replaceChildren(h("p", {class: "sh-p", role: "status", teks: "Memuat…"}));
  let j; const mode = st.dummy; p.contoh.hidden = !mode;
  if (st.dummy) j = {ok: true, ...contoh}; else { const r = await api(p.kunci, url); if (!r || mode !== st.dummy) return; j = r.j; if (!j.ok) { const g = H.petaGalat(j, r.s); p.badan.replaceChildren(keadaan(g.jenis, g.pesan)); return; } }
  if (mode !== st.dummy) return;
  let node; try { node = render(j); } catch (e) { node = null; }
  p.badan.replaceChildren(node || keadaan("kosong", "Bentuk data belum dikenali."));
  p.ey.title = st.dummy ? "Contoh lokal, bukan data penyedia" : `${ASAL[p.kunci]}, dimuat ${jam()}`;
}

const tabel = ({kolom, baris}, numDari = 0) => h("div", {class: "ad-tabel-wadah ex-tabel sh-tabel-wadah"}, h("table", {class: "ad-tabel"},
  h("thead", null, h("tr", null, kolom.map(k => h("th", {scope: "col", teks: k.replace(/_/g, " ")})))),
  h("tbody", null, baris.map(b => h("tr", null, b.map((c, i) => h("td", {class: i >= numDari && /^-?[\d.]+(,\d+)?%?$/.test(c) ? "sh-num" : null, "data-label": kolom[i]?.replace(/_/g, " ") ?? "", teks: c})))))));

function renderInfo(j) {
  const r = H.ringkasInfo(j.data); if (!r.sorot.length && !r.lain.length) return null;
  return h("div", {class: "sh-info"}, r.sorot.length ? h("div", {class: "sh-sorot"}, r.sorot.map(s => h("div", null, h("small", {teks: s.nama}), h("b", {teks: s.nilai})))) : null,
    r.lain.length ? h("dl", {class: "sh-kv"}, r.lain.flatMap(x => [h("dt", {teks: x.nama}), h("dd", {teks: x.nilai})])) : null);
}
function renderGrafik(j) {
  const d = H.uraiDeret(j.data), pts = H.titikGaris(d); if (!pts) return null;
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 640 200"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("class", "sh-garis"); svg.setAttribute("role", "img");
  const vs = d.map(x => x.v), awal = vs[0], akhir = vs.at(-1);
  svg.setAttribute("aria-label", `Grafik harga, ${d.length} titik, dari ${H.angka(awal, 0)} ke ${H.angka(akhir, 0)}`);
  const pl = document.createElementNS(NS, "polyline"); pl.setAttribute("points", pts); svg.append(pl);
  P.grafik.jd.replaceChildren(`Harga ${st.pilih.kode} terakhir `, hl(H.rupiah(akhir)), `, rentang ${H.rupiah(Math.min(...vs))} sampai ${H.rupiah(Math.max(...vs))}`);
  return h("div", null, svg, (ls => ls ? h("div", {class: "sh-skala"}, h("span", {teks: ls[0]}), h("span", {teks: ls[1]})) : null)(H.labelSkala(d)));
}
const renderTransaksi = j => { const t = H.uraiTabel(j.data, 50); if (!t) return null; P.transaksi.jd.replaceChildren(hl(H.angka(t.baris.length, 0)), ` transaksi terakhir ${st.pilih.kode}`); return tabel(t); };
function renderDividen(j) {
  const r = j.ringkas || {}, riw = Array.isArray(j.riwayat) ? j.riwayat : [];
  if (r.dividend_yield != null) P.dividen.jd.replaceChildren(`Yield dividen ${st.pilih.kode} `, hl(H.persen(r.dividend_yield)));
  const sorot = [["Dividen setahun", H.rupiah(r.annualized_payout)], ["Yield dividen", H.persen(r.dividend_yield)], ["Pertumbuhan 5 tahun", H.persen(r.five_year_dividend_growth)], ["Payout ratio", H.persen(r.payout_ratio)], ["Dividen berikutnya", H.tglId(r.next_dividend_date)]];
  const t = riw.length ? tabel({kolom: ["tanggal", "nilai (Rp)", "jenis", "tanggal bayar", "yield"], baris: riw.map(x => [H.tglId(x.tanggal), H.angka(x.nilai, Number.isInteger(x.nilai) ? 0 : 2), x.jenis || "–", H.tglId(x.bayar), H.persen(x.yield)])}, 1) : keadaan("kosong", "Belum ada riwayat dividen.");
  return h("div", {class: "sh-info"}, h("div", {class: "sh-sorot"}, sorot.map(([n, v]) => h("div", null, h("small", {teks: n}), h("b", {teks: v})))), t);
}

/* ---------- pilih emiten ---------- */
let P = {};
function bangunPanel() {
  P = {info: kartu("info", "Info", "daftar", "Info emiten"), grafik: kartu("grafik", "Grafik harga", "data", "Harga emiten"), transaksi: kartu("transaksi", "Transaksi berjalan", "daftar", "Transaksi terakhir", true, true), dividen: kartu("dividen", "Dividen", "simpan", "Dividen emiten", true)};
  const seg = h("div", {class: "sh-seg", role: "group", "aria-label": "Periode grafik"}, PERIODE.map(([k, n]) => h("button", {type: "button", "data-periode": k, "aria-pressed": String(k === st.periode), teks: n})));
  seg.addEventListener("click", e => { const b = e.target.closest("[data-periode]"); if (!b || b.dataset.periode === st.periode) return;
    st.periode = b.dataset.periode; seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); nanti(muatGrafik); });
  P.grafik.bd.insertBefore(seg, P.grafik.badan);
  el.panel.replaceChildren(P.info.sek, P.grafik.sek, P.transaksi.sek, P.dividen.sek);
}
const kodeUrl = () => encodeURIComponent(st.pilih.kode);
const muatGrafik = () => { P.grafik.jd.textContent = `Harga ${st.pilih.kode}`; return isiPanel(P.grafik, `/api/saham/${kodeUrl()}/grafik?periode=${st.periode}`, {data: CONTOH.grafik}, renderGrafik); };
function muatSemua() {
  /* panel kosong tidak ditampilkan sebelum ada emiten yang dipilih */
  el.panel.hidden = false;
  P.info.jd.textContent = `${st.pilih.kode}, ${st.pilih.nama}`; P.transaksi.jd.textContent = `Transaksi terakhir ${st.pilih.kode}`; P.dividen.jd.textContent = `Dividen ${st.pilih.kode}`;
  /* panel berat ditunda satu frame: tombol hasil sudah berubah dulu */
  nanti(() => {
    isiPanel(P.info, `/api/saham/${kodeUrl()}/info`, {data: CONTOH.info}, renderInfo);
    muatGrafik();
    isiPanel(P.transaksi, `/api/saham/${kodeUrl()}/transaksi?limit=50`, {data: CONTOH.transaksi}, renderTransaksi);
    isiPanel(P.dividen, `/api/saham/dividen?pair_id=${encodeURIComponent(st.pilih.pair_id)}`, CONTOH.dividen, renderDividen);
  });
}
function pilih(x) {
  st.pilih = x; el.hasil.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kode === x.kode && b.dataset.pair === String(x.pair_id))));
  muatSemua();
}
/* logo emiten: Bursa Efek Indonesia dari aset logo Stockbit (CSP img-src saham di src/bnpb.js); bursa lain atau gambar gagal = inisial kode */
function logo(x) {
  const w = h("span", {class: "sh-logo", "aria-hidden": "true", teks: (x.kode || "?").slice(0, 2)});
  if (/jakarta|idx/i.test(x.bursa || "") && /^[A-Z]{4}$/.test(x.kode || "")) {
    const img = h("img", {src: `https://assets.stockbit.com/logos/companies/${x.kode}.png`, alt: "", width: "32", height: "32", decoding: "async"});
    img.addEventListener("load", () => w.replaceChildren(img), {once: true});
  }
  return w;
}
function tampilHasil(daftar) {
  el.hasil.replaceChildren(...daftar.map(x => { const b = h("button", {type: "button", "data-kode": x.kode, "data-pair": String(x.pair_id), "aria-pressed": "false"}, logo(x), h("b", {teks: x.kode}), h("span", {teks: `${x.nama || ""}${x.bursa ? ", " + x.bursa : ""}`}));
    b.addEventListener("click", () => pilih(x)); return b; }));
}

/* ---------- Konsesi dan saham (fokus halaman): titik panas di konsesi emiten + harga per baris + analisa keterkaitan ---------- */
const K = {gen: 0, dgen: 0, antre: [], jalan: 0, io: null, ac: null};
const HUBUNGAN = {langsung: "Langsung", induk: "Induk", rantai_pasok: "Rantai pasok"};
const BELUM_HARGA = "belum tersedia dari penyedia";
const kepala = (k, def) => h("th", {scope: "col", teks: k, title: def[k] || null});
function sparkline(m) {
  const pts = H.titikGaris(m.map((x, i) => ({t: i, v: x.titik})), 90, 24, 2); if (!pts) return h("span", {class: "sh-sub", teks: "–"});
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 90 24"); svg.setAttribute("class", "sh-spark"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Titik panas mingguan, ${m.length} minggu, tertinggi ${H.angka(Math.max(...m.map(x => x.titik)), 0)}`);
  const pl = document.createElementNS(NS, "polyline"); pl.setAttribute("points", pts); svg.append(pl); return svg;
}
function isiHarga(td, v) { td.textContent = v.harga == null ? BELUM_HARGA : `${H.rupiah(v.harga)} (${H.persenTanda(v.persen)})`; td.classList.toggle("sh-redup", v.harga == null); td.classList.toggle("sh-naik", v.persen > 0); td.classList.toggle("sh-turun", v.persen < 0); }
/* antrean harga per baris, paling banyak 3 permintaan sekaligus; usang (gen berubah) dibuang */
function pompa() {
  while (K.jalan < 3 && K.antre.length) {
    const t = K.antre.shift(); if (t.gen !== K.gen) continue; K.jalan++;
    fetch(`/api/saham/${encodeURIComponent(t.kode)}/info`, {signal: K.ac.signal}).then(r => r.json().catch(() => ({}))).then(j => {
      if (t.gen !== K.gen) return; const v = j.ok ? H.hargaInfo(j.data) : {harga: null}; isiHarga(t.td, v);
    }).catch(e => { if (e.name !== "AbortError" && t.gen === K.gen) isiHarga(t.td, {harga: null}); }).finally(() => { K.jalan--; pompa(); });
  }
}
function mintaHarga(e, td) {
  if (!H.adaDiIdx(e.bursa)) { td.textContent = "di luar IDX"; td.classList.add("sh-redup"); return; }
  if (st.dummy) { isiHarga(td, H.hargaInfo(infoSintetis(e.kode))); return; }
  td.textContent = "memuat…"; K.antre.push({kode: e.kode, td, gen: K.gen}); pompa();
}
const svgEl = (tag, att) => { const e = document.createElementNS(NS, tag); for (const k in att) e.setAttribute(k, att[k]); return e; };
/* grafik dua sumbu: batang titik mingguan (sumbu kiri) + garis penutupan mingguan (sumbu kanan, terputus di minggu tanpa harga) */
function grafikGanda(gab) {
  const W = 640, T = 220, pad = 10, n = gab.length, lebar = (W - 2 * pad) / n;
  const tmax = Math.max(1, ...gab.map(x => x.titik)), hs = gab.filter(x => x.harga != null).map(x => x.harga);
  const svg = svgEl("svg", {viewBox: `0 0 ${W} ${T}`, preserveAspectRatio: "none", class: "sh-garis sh-ganda", role: "img",
    "aria-label": `Titik panas mingguan (batang) dan harga penutupan mingguan (garis), ${n} minggu`});
  gab.forEach((x, i) => { const t = x.titik / tmax * (T - 2 * pad); if (t > 0) svg.append(svgEl("rect", {class: "sh-bar", x: (pad + i * lebar + 0.5).toFixed(1), y: (T - pad - t).toFixed(1), width: Math.max(1, lebar - 1).toFixed(1), height: t.toFixed(1)})); });
  if (hs.length >= 2) {
    const h0 = Math.min(...hs), dh = Math.max(...hs) - h0 || 1; let run = [];
    const tutup = () => { if (run.length >= 2) svg.append(svgEl("polyline", {class: "sh-hline", points: run.join(" ")})); run = []; };
    gab.forEach((x, i) => { if (x.harga == null) return tutup(); run.push(`${(pad + (i + 0.5) * lebar).toFixed(1)},${(T - pad - (x.harga - h0) / dh * (T - 2 * pad)).toFixed(1)}`); }); tutup();
  }
  const skala = [`Titik per minggu, tertinggi ${H.angka(tmax, 0)}`, hs.length >= 2 ? `Penutupan mingguan ${H.rupiah(Math.min(...hs))} sampai ${H.rupiah(Math.max(...hs))}` : "Harga belum tersedia dari penyedia"];
  return h("div", null, svg, h("div", {class: "sh-skala"}, h("span", {class: "sh-ket sh-ket-titik", teks: skala[0]}), h("span", {class: "sh-ket sh-ket-harga", teks: skala[1]})),
    h("div", {class: "sh-skala"}, h("span", {teks: H.tglId(gab[0].minggu)}), h("span", {teks: H.tglId(gab.at(-1).minggu)})));
}
function renderAnalisa(a, ketHarga) {
  const rho = a.rho === null ? "–" : H.angka(a.rho, 2), h1 = a.peristiwa.h1;
  return h("div", {class: "sh-analisa"}, h("div", {class: "sh-sorot"},
    [["Korelasi Spearman", rho], ["Minggu berpasangan (n)", H.angka(a.n, 0)], ["Minggu lonjakan", H.angka(a.peristiwa.n, 0)], ["Selisih return 1 minggu", h1 ? H.persenTanda(h1.selisih).replace("%", " poin") : "–"]].map(([n, v]) => h("div", null, h("small", {teks: n}), h("b", {teks: v})))),
    ketHarga ? h("p", {class: "sh-sumber", teks: ketHarga}) : null,
    a.narasi.map((t, i) => h("p", {class: i === a.narasi.length - 1 ? "sh-peringatan" : "sh-p", teks: t})));
}
async function muatDetail(e, gen) {
  const wadah = el.kDetail, mode = st.dummy; let harga = [], ket = "";
  if (!H.adaDiIdx(e.bursa)) ket = "Harga: di luar IDX, tidak dimuat.";
  else if (st.dummy) harga = H.hargaMingguan(grafikSintetis(e.kode).deret);
  else {
    const r = await api("detail", `/api/saham/${encodeURIComponent(e.kode)}/grafik?periode=LAST_1_YEAR`); if (!r || gen !== K.dgen || mode !== st.dummy) return;
    if (r.j.ok) harga = H.hargaMingguan(r.j.data?.deret); if (harga.length < 2) ket = "Harga: belum tersedia dari penyedia.";
  }
  const gab = H.gabungMingguan(e.mingguan, harga), a = H.analisa(e.mingguan, harga);
  wadah.replaceChildren(
    h("p", {class: "sh-p"}, h("b", {teks: "Dasar keterkaitan: "}), e.dasar || "–"),
    h("p", {class: "sh-sumber", teks: `Konsesi: ${H.angka(e.konsesi?.jumlah, 0)} izin, ${H.angka(e.konsesi?.luas_ha, 0)} ha. Grup: ${e.grup || "–"}.`}),
    gab.length >= 2 ? grafikGanda(gab) : keadaan("kosong", "Titik mingguan belum cukup untuk digambar."), renderAnalisa(a, ket));
  el.kDetailKartu.sek.scrollIntoView({block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
}
function pilihKonsesi(e, baris) {
  /* urgent: sorot baris dan judul seketika; panel berat menyusul sesudah satu frame */
  el.kBadan.querySelectorAll("tr[aria-selected]").forEach(r => r.setAttribute("aria-selected", String(r === baris)));
  const gen = ++K.dgen;
  el.kDetailKartu.jd.textContent = `${e.kode}, ${e.nama}`; el.kDetailKartu.sek.hidden = false;
  el.kDetail.replaceChildren(h("p", {class: "sh-p", role: "status", teks: "Memuat…"}));
  nanti(() => muatDetail(e, gen));
}
function tampilKonsesi(j) {
  K.ac?.abort(); K.ac = new AbortController(); K.antre = []; K.io?.disconnect(); K.dgen++; const gen = ++K.gen; el.kDetailKartu.sek.hidden = true; el.kKartu.contoh.hidden = !st.dummy; el.kDetailKartu.contoh.hidden = !st.dummy;
  const em = [...(j.emiten || [])].sort((a, b) => (b.titik?.d30 ?? 0) - (a.titik?.d30 ?? 0));
  /* emiten satu grup berbagi deret titik grup: jumlahkan per GRUP UNIK, jangan per emiten */
  const grupMap = new Map(); for (const x of em) { const k = x.grup || x.kode, g = grupMap.get(k) || {grup: k, kode: [], d30: 0}; g.kode.push(x.kode); g.d30 = Math.max(g.d30, x.titik?.d30 ?? 0); grupMap.set(k, g); }
  const grupUnik = [...grupMap.values()].sort((a, b) => b.d30 - a.d30), jml = grupUnik.reduce((s, g) => s + g.d30, 0);
  const sampai = H.tglId(j.periode?.sampai), teratas = grupUnik[0];
  el.kKartu.ey.title = `Periode ${H.tglId(j.periode?.dari)} sampai ${sampai}. ${(j.sumber || []).join(", ")}. ${j.catatan || ""}`.trim();
  if (em.length) el.kKartu.jd.replaceChildren(hl(H.angka(jml, 0)), ` titik panas 30 hari sampai ${sampai} ada di konsesi `, hl(H.angka(em.length, 0)), " emiten", ...(teratas?.d30 ? [`, terbanyak ${teratas.grup} `, hl(H.angka(teratas.d30, 0)), " titik"] : []));
  if (!em.length) el.kTabel.replaceChildren(keadaan("kosong", "Belum ada emiten yang konsesinya terkena titik panas."));
  else {
    K.io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { K.io.unobserve(x.target); const e = x.target.__e; if (gen === K.gen) mintaHarga(e, x.target.querySelector("[data-harga]")); } }), {rootMargin: "120px"});
    const kol = ["Kode", "Nama", "Grup", "Hubungan", "Bursa", "Titik 7 hari", "Titik 30 hari", "Total 2026", "Tren mingguan", "Harga"];
    const def = {"Hubungan": "Langsung: emiten memegang konsesi. Induk: induk emiten tercatat di luar IDX. Rantai pasok: hanya pemasok.", "Titik 7 hari": `Titik panas VIIRS S-NPP keyakinan nominal dan tinggi di konsesi, 7 hari sampai ${sampai}. Emiten satu grup berbagi deret titik grup.`, "Titik 30 hari": `Titik panas VIIRS S-NPP keyakinan nominal dan tinggi di konsesi, 30 hari sampai ${sampai}. Emiten satu grup berbagi deret titik grup.`, "Total 2026": `Titik panas di konsesi dari ${H.tglId(j.periode?.dari)} sampai ${sampai}.`, "Tren mingguan": "Jumlah titik panas per minggu, minggu mulai Senin WIB.", "Harga": "Harga terakhir dan perubahan harian dari Stockbit lewat Stellar Data."};
    el.kBadan = h("tbody", null, em.map(e => { const tr = h("tr", {"data-kode": e.kode, "aria-selected": "false", class: "sh-baris"},
      h("td", {"data-label": kol[0]}, h("button", {type: "button", class: "sh-kode", teks: e.kode})), h("td", {"data-label": kol[1], teks: e.nama}), h("td", {"data-label": kol[2]}, e.grup || "–", (grupMap.get(e.grup || e.kode)?.kode.length > 1) ? h("small", {class: "sh-sub", teks: " (deret grup bersama)"}) : null), h("td", {"data-label": kol[3], teks: HUBUNGAN[e.hubungan] || "–"}), h("td", {"data-label": kol[4], teks: e.bursa || "–"}),
      h("td", {class: "sh-num", "data-label": kol[5], teks: H.angka(e.titik?.d7, 0)}), h("td", {class: "sh-num", "data-label": kol[6], teks: H.angka(e.titik?.d30, 0)}), h("td", {class: "sh-num", "data-label": kol[7], teks: H.angka(e.titik?.total, 0)}),
      h("td", {"data-label": kol[8]}, sparkline(e.mingguan || [])), h("td", {"data-label": kol[9], "data-harga": "1", class: "sh-num sh-harga", teks: "…"}));
      tr.__e = e; K.io.observe(tr); return tr; }));
    el.kBadan.addEventListener("click", ev => { const tr = ev.target.closest("tr[data-kode]"); if (tr) pilihKonsesi(tr.__e, tr); });
    el.kTabel.replaceChildren(h("div", {class: "ad-tabel-wadah ex-tabel"}, h("table", {class: "ad-tabel"}, h("thead", null, h("tr", null, kol.map(k => kepala(k, def)))), el.kBadan)),
      h("p", {class: "sh-catatan", teks: "Titik panas di areal konsesi bukan bukti pelanggaran atau penyebab kebakaran."}));
  }
  /* grup tanpa emiten: kartu sendiri, isi dilipat; alasan yang sama untuk semua baris cukup jadi keterangan kepala kolom */
  const g = j.grup_tanpa_emiten || [], kg = el.kGrupKartu; kg.sek.hidden = !g.length; kg.badan.hidden = true; kg.contoh.hidden = !st.dummy; el.kGrupBuka.setAttribute("aria-expanded", "false"); el.kGrupBuka.textContent = "Tampilkan";
  if (g.length) {
    const alasan = [...new Set(g.map(x => x.alasan || "–"))], satuAlasan = alasan.length === 1;
    const kolG = ["Grup", ...(satuAlasan ? [] : ["Alasan"]), "Titik 7 hari", "Titik 30 hari", "Total 2026"], defG = satuAlasan ? {Grup: alasan[0]} : {};
    kg.jd.replaceChildren(hl(H.angka(g.length, 0)), " grup pemegang konsesi belum tertaut emiten");
    kg.badan.replaceChildren(h("div", {class: "ad-tabel-wadah ex-tabel"}, h("table", {class: "ad-tabel"}, h("thead", null, h("tr", null, kolG.map(k => kepala(k, defG)))),
      h("tbody", null, g.map(x => h("tr", null, h("td", {"data-label": "Grup", teks: x.grup}), satuAlasan ? null : h("td", {"data-label": "Alasan", teks: x.alasan || "–"}), h("td", {class: "sh-num", "data-label": "Titik 7 hari", teks: H.angka(x.titik?.d7, 0)}),
        h("td", {class: "sh-num", "data-label": "Titik 30 hari", teks: H.angka(x.titik?.d30, 0)}), h("td", {class: "sh-num", "data-label": "Total 2026", teks: H.angka(x.titik?.total, 0)})))))));
  }
}
async function muatKonsesi() {
  const mode = st.dummy; el.kTabel.replaceChildren(h("p", {class: "sh-p", role: "status", teks: "Memuat…"}));
  if (st.dummy) return nanti(() => tampilKonsesi(KONSESI));
  const r = await api("konsesi", "/api/saham/konsesi"); if (!r || mode !== st.dummy) return;
  if ((r.s === 401 || r.s === 403) && r.j.kode !== "akses_belum_dibuka") return kartuMasuk(r.s);
  if (!r.j.ok) { const g = H.petaGalat(r.j, r.s); el.kTabel.replaceChildren(keadaan(g.jenis, g.pesan)); return; }
  nanti(() => { if (mode === st.dummy) tampilKonsesi(r.j); });
}

/* ---------- pencarian ---------- */
async function cari() {
  const q = el.q.value.trim(); el.pesan.textContent = ""; el.pesan.className = "bn-pesan";
  if (q.length < 2) { batal.cari?.abort(); el.hasil.replaceChildren(); return; }
  if (st.dummy) { const ds = CONTOH.hasil.filter(x => (x.kode + x.nama).toLowerCase().includes(q.toLowerCase())); tampilHasil(ds); if (!ds.length) { el.pesan.textContent = "Tidak ada emiten contoh yang cocok."; } return; }
  const r = await api("cari", "/api/saham/cari?q=" + encodeURIComponent(q)); if (!r) return;
  if ((r.s === 401 || r.s === 403) && r.j.kode !== "akses_belum_dibuka") return kartuMasuk(r.s);   // 403 akses_belum_dibuka = penyedia, bukan hak staf
  if (!r.j.ok) { const g = H.petaGalat(r.j, r.s); el.pesan.textContent = g.pesan; el.pesan.className = "bn-pesan" + (g.jenis === "belum" ? "" : " galat"); el.hasil.replaceChildren(); return; }
  if (!r.j.hasil?.length) { el.hasil.replaceChildren(); el.pesan.textContent = `Tidak ada emiten untuk "${q}".`; return; }
  tampilHasil(r.j.hasil);
}
function kartuMasuk(s) {
  app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
    h("p", {class: "sh-p", teks: s === 403 ? "Akunmu belum berhak membuka halaman ini." : "Data saham hanya untuk staf. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
    h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(TERTANAM ? "/saham" : location.pathname), target: TERTANAM ? "_top" : null, teks: "Masuk staf"})));
}

/* ---------- dummy (Super Admin saja): isi contoh lokal di layar, tidak memanggil API ---------- */
async function tombolDummy(wadah) {
  const r = await api("saya", "/api/akademisi/saya");
  if (!r || r.s !== 200 || !r.j.super) return;
  wadah.append(h("button", {class: "sh-dummy", type: "button", "data-dummy": "isi", title: "Isi semua panel dengan data contoh (tanpa API)", "aria-label": "Isi data dummy"}, "🧪"),
    h("button", {class: "sh-dummy", type: "button", "data-dummy": "hapus", title: "Hapus data contoh", "aria-label": "Hapus data dummy"}, "🧹"));
  wadah.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (!b) return;
    for (const k in batal) batal[k]?.abort();
    if (b.dataset.dummy === "isi") { st.dummy = true; el.q.value = ""; el.pesan.textContent = ""; tampilHasil(CONTOH.hasil); pilih(CONTOH.hasil[0]); muatKonsesi(); }
    else { st.dummy = false; st.pilih = null; el.hasil.replaceChildren(); el.panel.hidden = true; bangunPanel(); muatKonsesi(); } });
}

function mulai() {
  const aksi = h("div", {class: "bn-aksi"});
  el.q = h("input", {type: "search", placeholder: "Cari kode atau nama emiten, mis. BBCA", "aria-label": "Cari saham", autocomplete: "off", inputmode: "search"});
  el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.hasil = h("div", {class: "sh-hasil"}); el.panel = h("div", {class: "sh-panel", hidden: true});
  el.q.addEventListener("input", tunda(cari, 300));
  bangunPanel();
  el.kKartu = kartu("konsesi", "Konsesi dan saham", "pin", "Perusahaan tercatat yang konsesinya terkena titik panas", false, true); el.kTabel = el.kKartu.badan;
  el.kDetailKartu = kartu("detail", "Analisa emiten", "data", "Analisa emiten"); el.kDetailKartu.sek.classList.add("sh-detail"); el.kDetailKartu.sek.hidden = true; el.kDetail = el.kDetailKartu.badan;
  el.kGrupKartu = kartu("grup", "Belum tertaut emiten", "daftar", "Grup pemegang konsesi belum tertaut emiten", false, true); el.kGrupKartu.sek.hidden = true;
  el.kGrupBuka = h("button", {type: "button", class: "sh-buka", "aria-expanded": "false", teks: "Tampilkan"});
  el.kGrupBuka.addEventListener("click", () => { const buka = el.kGrupBuka.getAttribute("aria-expanded") !== "true"; el.kGrupBuka.setAttribute("aria-expanded", String(buka)); el.kGrupBuka.textContent = buka ? "Sembunyikan" : "Tampilkan"; nanti(() => { el.kGrupKartu.badan.hidden = !buka; }); });
  el.kGrupKartu.jd.after(el.kGrupBuka);
  const kCari = kartu("cari", "Cari emiten", "daftar", "Cari emiten lain untuk melihat info, grafik, transaksi, dan dividen");
  kCari.badan.append(h("div", {class: "sh-cari"}, el.q), el.pesan, el.hasil);
  app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Data Saham"}), aksi), el.kKartu.sek, el.kDetailKartu.sek, el.kGrupKartu.sek, kCari.sek, el.panel);
  tombolDummy(aksi); muatKonsesi();
}
mulai();
