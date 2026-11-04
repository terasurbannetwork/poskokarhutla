/* Data saham (/bnpb/saham): cari emiten, lalu panel Info, Grafik, Transaksi, Dividen dari gateway Stellar Data lewat Worker (/api/saham/*).
   Tiap panel memuat dan gagal sendiri; "akses belum dibuka" ditampilkan sebagai keadaan biasa, bukan galat. Chrome kontrol urgent,
   panel berat ditunda satu frame (INP). Tombol dummy (Super Admin) mengisi contoh lokal tanpa memanggil API. Tanpa gaya/skrip inline (CSP). */
import * as H from "/bnpb/saham_hitung.js";
import {CONTOH} from "/bnpb/saham_contoh.js";

const {ikon, h} = window.Wilayah;
const app = document.getElementById("app");
const NS = "http://www.w3.org/2000/svg";
const PERIODE = [["RT_PERIOD_LAST_1_DAY", "1 hari"], ["RT_PERIOD_LAST_7_DAYS", "7 hari"], ["RT_PERIOD_LAST_1_MONTH", "1 bulan"], ["RT_PERIOD_LAST_3_MONTHS", "3 bulan"], ["RT_PERIOD_YEAR_TO_DATE", "Tahun berjalan"], ["RT_PERIOD_LAST_1_YEAR", "1 tahun"]];
const SUMBER = {stockbit: "Sumber: Stockbit via Stellar Data", investing: "Sumber: Investing.com via Stellar Data"};
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
function panel(kunci, judul, ik, lebar) {
  const badan = h("div", {class: "sh-badan"}), kaki = h("p", {class: "sh-sumber"});
  const sek = h("section", {class: "bn-blok" + (lebar ? " sh-lebar" : ""), "data-panel": kunci}, h("h2", {class: "sh-judul"}, ikon(ik), judul), badan, kaki);
  return {sek, badan, kaki, kunci};
}
const kakiTeks = (p, sumber, contoh) => { p.kaki.replaceChildren(...(contoh ? ["Contoh lokal, bukan data penyedia. ", h("span", {class: "sh-contoh", teks: "Data contoh"})] : [`${sumber}. Dimuat ${jam()}`])); };

/* muat satu panel: url (atau contoh), render(data) -> node. Gagal sendiri, tidak menyentuh panel lain. */
async function isiPanel(p, sumber, url, contoh, render) {
  p.badan.replaceChildren(h("p", {class: "sh-p", role: "status", teks: "Memuat…"}));
  let j; const mode = st.dummy;
  if (st.dummy) j = {ok: true, ...contoh}; else { const r = await api(p.kunci, url); if (!r || mode !== st.dummy) return; j = r.j; if (!j.ok) { const g = H.petaGalat(j, r.s); p.badan.replaceChildren(keadaan(g.jenis, g.pesan)); p.kaki.textContent = sumber; return; } }
  if (mode !== st.dummy) return;
  let node; try { node = render(j); } catch (e) { node = null; }
  p.badan.replaceChildren(node || keadaan("kosong", "Bentuk data belum dikenali."));
  kakiTeks(p, sumber, st.dummy);
}

const tabel = ({kolom, baris}, numDari = 0) => h("div", {class: "ad-tabel-wadah sh-tabel-wadah"}, h("table", {class: "ad-tabel"},
  h("thead", null, h("tr", null, kolom.map(k => h("th", {scope: "col", teks: k.replace(/_/g, " ")})))),
  h("tbody", null, baris.map(b => h("tr", null, b.map((c, i) => h("td", {class: i >= numDari && /^-?[\d.]+(,\d+)?%?$/.test(c) ? "sh-num" : null, teks: c})))))));

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
  return h("div", null, svg, (ls => ls ? h("div", {class: "sh-skala"}, h("span", {teks: ls[0]}), h("span", {teks: ls[1]})) : null)(H.labelSkala(d)), h("div", {class: "sh-skala"}, h("span", {teks: `Terendah ${H.rupiah(Math.min(...vs))}`}), h("span", {teks: `Tertinggi ${H.rupiah(Math.max(...vs))}`}), h("span", {teks: `Akhir ${H.rupiah(akhir)}`})));
}
const renderTransaksi = j => { const t = H.uraiTabel(j.data, 50); return t ? tabel(t) : null; };
function renderDividen(j) {
  const r = j.ringkas || {}, riw = Array.isArray(j.riwayat) ? j.riwayat : [];
  const sorot = [["Dividen setahun", H.rupiah(r.annualized_payout)], ["Yield dividen", H.persen(r.dividend_yield)], ["Pertumbuhan 5 tahun", H.persen(r.five_year_dividend_growth)], ["Payout ratio", H.persen(r.payout_ratio)], ["Dividen berikutnya", H.tglId(r.next_dividend_date)]];
  const t = riw.length ? tabel({kolom: ["tanggal", "nilai (Rp)", "jenis", "tanggal bayar", "yield"], baris: riw.map(x => [H.tglId(x.tanggal), H.angka(x.nilai, Number.isInteger(x.nilai) ? 0 : 2), x.jenis || "–", H.tglId(x.bayar), H.persen(x.yield)])}, 1) : keadaan("kosong", "Belum ada riwayat dividen.");
  return h("div", {class: "sh-info"}, h("div", {class: "sh-sorot"}, sorot.map(([n, v]) => h("div", null, h("small", {teks: n}), h("b", {teks: v})))), t);
}

/* ---------- pilih emiten ---------- */
let P = {};
function bangunPanel() {
  P = {info: panel("info", "Info", "daftar"), grafik: panel("grafik", "Grafik harga", "data"), transaksi: panel("transaksi", "Transaksi berjalan", "daftar", true), dividen: panel("dividen", "Dividen", "simpan", true)};
  const seg = h("div", {class: "sh-seg", role: "group", "aria-label": "Periode grafik"}, PERIODE.map(([k, n]) => h("button", {type: "button", "data-periode": k, "aria-pressed": String(k === st.periode), teks: n})));
  seg.addEventListener("click", e => { const b = e.target.closest("[data-periode]"); if (!b || b.dataset.periode === st.periode) return;
    st.periode = b.dataset.periode; seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); nanti(muatGrafik); });
  P.grafik.sek.insertBefore(seg, P.grafik.badan);
  el.panel.replaceChildren(P.info.sek, P.grafik.sek, P.transaksi.sek, P.dividen.sek);
}
const kodeUrl = () => encodeURIComponent(st.pilih.kode);
const muatGrafik = () => isiPanel(P.grafik, SUMBER.stockbit, `/api/saham/${kodeUrl()}/grafik?periode=${st.periode}`, {data: CONTOH.grafik}, renderGrafik);
function muatSemua() {
  el.judulPilih.textContent = `${st.pilih.kode}, ${st.pilih.nama}`; el.judulPilih.hidden = false;
  /* panel berat ditunda satu frame: tombol hasil sudah berubah dulu */
  nanti(() => {
    isiPanel(P.info, SUMBER.stockbit, `/api/saham/${kodeUrl()}/info`, {data: CONTOH.info}, renderInfo);
    muatGrafik();
    isiPanel(P.transaksi, SUMBER.stockbit, `/api/saham/${kodeUrl()}/transaksi?limit=50`, {data: CONTOH.transaksi}, renderTransaksi);
    isiPanel(P.dividen, SUMBER.investing, `/api/saham/dividen?pair_id=${encodeURIComponent(st.pilih.pair_id)}`, CONTOH.dividen, renderDividen);
  });
}
function pilih(x) {
  st.pilih = x; el.hasil.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kode === x.kode && b.dataset.pair === String(x.pair_id))));
  muatSemua();
}
function tampilHasil(daftar) {
  el.hasil.replaceChildren(...daftar.map(x => { const b = h("button", {type: "button", "data-kode": x.kode, "data-pair": String(x.pair_id), "aria-pressed": "false"}, h("b", {teks: x.kode}), h("span", {teks: `${x.nama || ""}${x.bursa ? ", " + x.bursa : ""}`}));
    b.addEventListener("click", () => pilih(x)); return b; }));
}

/* ---------- pencarian ---------- */
async function cari() {
  const q = el.q.value.trim(); el.pesan.textContent = ""; el.pesan.className = "bn-pesan";
  if (q.length < 2) { batal.cari?.abort(); el.hasil.replaceChildren(); return; }
  if (st.dummy) { const ds = CONTOH.hasil.filter(x => (x.kode + x.nama).toLowerCase().includes(q.toLowerCase())); tampilHasil(ds); if (!ds.length) { el.pesan.textContent = "Tidak ada emiten contoh yang cocok."; } return; }
  const r = await api("cari", "/api/saham/cari?q=" + encodeURIComponent(q)); if (!r) return;
  if (r.s === 401 || r.s === 403) return kartuMasuk(r.s);
  if (!r.j.ok) { const g = H.petaGalat(r.j, r.s); el.pesan.textContent = g.pesan; el.pesan.className = "bn-pesan" + (g.jenis === "belum" ? "" : " galat"); el.hasil.replaceChildren(); return; }
  if (!r.j.hasil?.length) { el.hasil.replaceChildren(); el.pesan.textContent = `Tidak ada emiten untuk "${q}".`; return; }
  tampilHasil(r.j.hasil);
}
function kartuMasuk(s) {
  app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
    h("p", {class: "sh-p", teks: s === 403 ? "Akunmu belum berhak membuka halaman ini." : "Data saham hanya untuk staf. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
    h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname), teks: "Masuk staf"})));
}

/* ---------- dummy (Super Admin saja): isi contoh lokal di layar, tidak memanggil API ---------- */
async function tombolDummy(wadah) {
  const r = await api("saya", "/api/akademisi/saya");
  if (!r || r.s !== 200 || !r.j.super) return;
  wadah.append(h("button", {class: "sh-dummy", type: "button", "data-dummy": "isi", title: "Isi semua panel dengan data contoh (tanpa API)", "aria-label": "Isi data dummy"}, "🧪"),
    h("button", {class: "sh-dummy", type: "button", "data-dummy": "hapus", title: "Hapus data contoh", "aria-label": "Hapus data dummy"}, "🧹"));
  wadah.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (!b) return;
    for (const k in batal) batal[k]?.abort();
    if (b.dataset.dummy === "isi") { st.dummy = true; el.q.value = ""; el.pesan.textContent = ""; tampilHasil(CONTOH.hasil); pilih(CONTOH.hasil[0]); }
    else { st.dummy = false; st.pilih = null; el.hasil.replaceChildren(); el.judulPilih.hidden = true; bangunPanel(); } });
}

function mulai() {
  const aksi = h("div", {class: "bn-aksi"});
  el.q = h("input", {type: "search", placeholder: "Cari kode atau nama emiten, mis. BBCA", "aria-label": "Cari saham", autocomplete: "off", inputmode: "search"});
  el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.hasil = h("div", {class: "sh-hasil"}); el.panel = h("div", {class: "sh-panel"});
  el.judulPilih = h("h2", {class: "sh-judul", hidden: true});
  el.q.addEventListener("input", tunda(cari, 300));
  bangunPanel();
  app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Data Saham"}), aksi),
    h("p", {class: "sh-p", teks: "Cari emiten, lalu lihat info, grafik, transaksi, dan dividen. Data dari penyedia luar lewat gateway Stellar Data; sebagian akses belum dibuka."}),
    h("section", {class: "bn-blok"}, h("div", {class: "sh-cari"}, el.q), el.pesan, el.hasil), el.judulPilih, el.panel);
  tombolDummy(aksi);
}
mulai();
