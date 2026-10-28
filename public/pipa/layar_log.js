/* SIPPA: layar Rekap time-motion /pipa/log (PRD §9.4.6, DS §4.6). Kontrak router: pasang(akar, konteks) dan lepas().
   Butuh global public/inti: fmt, esc, jamWIB, Kartu, paginasi, pengurutKepala, nanti (dimuat cangkang atau app.js). Logika murni di atas, DOM di bawah. */
import {durasiLog, kuantil, nKecil} from "./hitung.js";
import {memuat, kosong, galat} from "./keadaan.js";
import {tanggalHtml, pasangTanggal} from "./tanggal.js";
import {jalurJejak, jejakTabelHtml, aksiJejak, namaAksi} from "./keputusan.js";
import {bandingSelang, selangHtml} from "./bukti.js";
import {suhuHtml, tekananHtml, uraiCsv, ambilTeks, muatButir, muatGayaLapangan} from "./lapangan_staf.js";

export const RENTANG_JEJAK = [[7, "7 hari terakhir"], [30, "30 hari terakhir"], [90, "90 hari terakhir"]];

const KELAS = ["I", "II", "III"];
/* ambang G3 (PRD §4.4): tiba sampai air mengalir, jam; label asumsi-kebijakan */
export const AMBANG_G3 = {I: {p50: 4, p90: 6}, II: {p50: 8, p90: 12}, III: {p50: 24, p90: 36}};
/* hipotesis Studio untuk Kelas I (batas yang harus dikalahkan, jam) */
const HIPOTESIS_STUDIO = [22, 27];
const JENIS = {karhutla: "Karhutla", banjir: "Banjir", latihan: "Latihan"};
const PER_HAL = 50;

/* SP-124: tugas yang boleh dipilih untuk grafik suhu dan tekanan: satu per tugas_id, terbaru dulu, paling banyak 30 */
export function pilihanTugas(log) {
  const lihat = new Set(), hasil = [];
  for (const l of [...barisKoreksi(log)].sort((a, b) => (b.t_tiba ?? b.waktu_klien ?? 0) - (a.t_tiba ?? a.waktu_klien ?? 0))) {
    if (!l.tugas_id || lihat.has(l.tugas_id)) continue;
    lihat.add(l.tugas_id); hasil.push({id: l.tugas_id, teks: `${l.t_tiba ? new Date(l.t_tiba).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) : "tanpa tanggal"}, ${l.kit_kode ?? l.kit_id ?? "tanpa kit"}, regu ${l.nama_regu ?? "–"}`});
  }
  return hasil.slice(0, 30);
}

/* log tanpa yang sudah punya penerus koreksi (koreksi = baris baru dengan koreksi_dari, jejak utuh). Dummy TIDAK dibuang di klien:
   server sudah menyaringnya per peran (lihatDummy), jadi yang sampai ke sini memang boleh dilihat peran ini. */
export function barisKoreksi(log) {
  const dikoreksi = new Set(log.map(l => l.koreksi_dari).filter(Boolean));
  return log.filter(l => !dikoreksi.has(l.id));
}
/* catatan: barisAktif lama (membuang dummy di klien) dipertahankan karena satu uji lama masih menjaganya; layar memakai barisKoreksi */
/* dummy tidak disaring di klien: GET /api/sippa/log sudah menyaringnya per peran (lihatDummy) */
export const barisAktif = barisKoreksi;

/* baris yang tampil: koreksi dibuang, lalu jenis, provinsi (baris tanpa prov lolos), dan hanya-meleset */
export function pilihBaris(log, st, prov) {
  return barisKoreksi(log).filter(l => st.jenis.has(l.jenis) && (l.prov == null || !prov || l.prov === prov) && (!st.meleset || l.jam_klien_meleset === 1));
}

/* per kelas: n ulangan (yang punya tiba sampai air mengalir), p50 dan p90 dalam jam, kecil = n < 5, meleset = jumlah dengan jam perangkat meleset, titik untuk grafik */
export function rekapKelas(log) {
  const hasil = {};
  for (const k of KELAS) {
    const titik = log.filter(l => l.kelas_medan === k).map(l => ({id: l.id, y: durasiLog(l).tiba_air, meleset: l.jam_klien_meleset === 1})).filter(t => t.y != null);
    const ys = titik.map(t => t.y);
    hasil[k] = {n: ys.length, p50: kuantil(ys, 0.5), p90: kuantil(ys, 0.9), kecil: nKecil(ys.length), meleset: titik.filter(t => t.meleset).length, titik};
  }
  return hasil;
}

/* waktu data = t_tiba terbaru di log aktif (null bila kosong) */
export const perData = log => log.reduce((m, l) => l.t_tiba != null && (m == null || l.t_tiba > m) ? l.t_tiba : m, null);

/* ---------- tampilan ---------- */
const jam = n => n == null ? "–" : `${fmt(n)} jam`;   // p50 dan p90: jam desimal
const durasi = h => h == null ? "–" : fmt.durasi(h * 36e5);   // durasi per baris: "3 jam 24 menit"
const perTeks = ms => ms == null ? "per –" : `per ${jamWIB(ms)}`;
const pil = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;

function kartuKelas(k, r, per) {
  const a = AMBANG_G3[k], ambang = `ambang G3 p50 ≤ ${fmt(a.p50)} jam, p90 ≤ ${fmt(a.p90)} jam`;
  const judul = r.n ? `Kelas ${k}: p50 ${Kartu.hl(jam(r.p50))}, p90 ${Kartu.hl(jam(r.p90))} dari ${fmt(r.n)} ulangan; ${ambang}` : `Kelas ${k}: belum ada ulangan; ${ambang}`;
  const isi = `<div class="sp-pil-baris">${r.kecil ? pil("n kecil, belum bisa memutus G3", "asumsi-kebijakan", "Kurang dari 5 ulangan per kelas") : ""}${r.meleset ? pil(`${fmt(r.meleset)} ulangan dengan jam perangkat meleset`, "asumsi-kebijakan", "Jam perangkat berbeda dari jam server lebih dari 10 menit") : ""}${pil("Asumsi kebijakan", "asumsi-kebijakan", "Ambang G3 ditetapkan sebagai asumsi kebijakan")}</div>`;
  return Kartu.kartu("Time-motion", judul, isi, `log gelar dari form lapangan dan entri staf, ${perTeks(per)}`);
}

/* grafik titik per ulangan: x = kelas, y = jam; garis ambang G3 per kelas dan hipotesis Studio Kelas I; warna lewat kelas CSS */
function grafikTitik(rek) {   // judul titik: durasi per ulangan
  const W = 720, H = 250, L = 46, R = 14, T = 14, B = 30;
  const semua = KELAS.flatMap(k => rek[k].titik.map(t => t.y));
  const ymaks = Math.ceil(Math.max(HIPOTESIS_STUDIO[1], ...semua, AMBANG_G3.III.p90) / 6) * 6;
  const Y = v => T + (H - T - B) * (1 - v / ymaks), lebar = (W - L - R) / KELAS.length, X0 = i => L + i * lebar;
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tiba sampai air mengalir per ulangan menurut kelas medan, dalam jam">`;
  for (let v = 0; v <= ymaks; v += 6) s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sp-teks" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  KELAS.forEach((k, i) => {
    const x0 = X0(i), x1 = x0 + lebar, a = AMBANG_G3[k];
    s += `<text class="sp-teks sp-kuat" x="${(x0 + x1) / 2}" y="${H - 8}" text-anchor="middle">Kelas ${k}</text>`;
    s += `<line class="sp-ambang" x1="${x0 + 8}" x2="${x1 - 8}" y1="${Y(a.p50)}" y2="${Y(a.p50)}"><title>Ambang G3 p50 ${fmt(a.p50)} jam</title></line>`;
    s += `<line class="sp-ambang putus" x1="${x0 + 8}" x2="${x1 - 8}" y1="${Y(a.p90)}" y2="${Y(a.p90)}"><title>Ambang G3 p90 ${fmt(a.p90)} jam</title></line>`;
    if (k === "I") for (const h of HIPOTESIS_STUDIO) s += `<line class="sp-hipotesis" x1="${x0 + 8}" x2="${x1 - 8}" y1="${Y(h)}" y2="${Y(h)}"><title>Hipotesis Studio ${fmt(HIPOTESIS_STUDIO[0])}–${fmt(HIPOTESIS_STUDIO[1])} jam</title></line>`;
    rek[k].titik.forEach((t, j) => { s += `<circle class="sp-titik${t.meleset ? " meleset" : ""}" cx="${(x0 + x1) / 2 + ((j % 7) - 3) * 9}" cy="${Y(t.y)}" r="4"><title>${esc(durasi(t.y))}${t.meleset ? ", jam perangkat meleset" : ""}</title></circle>`; });
  });
  return s + "</svg>";
}

const KOLOM = [["t_tiba", "Tanggal"], ["kit", "Kit"], ["regu", "Regu"], ["kelas_medan", "Kelas"], ["jenis", "Jenis"], ["panjang_m", "Panjang"], ["n_orang", "Orang"],
  ["tiba_air", "Tiba-air"], ["gelar", "Gelar"], ["bongkar", "Bongkar"], ["jam_pompa", "Jam pompa"], ["bbm_l", "BBM"], ["air_m3", "Air"], ["sumber", "Sumber"]];
const sumberIsian = l => String(l.oleh || "").startsWith("tugas:") ? "lapangan" : String(l.oleh || "").startsWith("staf:") ? "staf" : "–";
const nilaiUrut = (l, k) => k === "t_tiba" || k === "kelas_medan" || k === "jenis" || k === "panjang_m" || k === "n_orang" || k === "jam_pompa" || k === "bbm_l" || k === "air_m3" ? l[k]
  : k === "kit" ? (l.kit_kode ?? l.kit_id) : k === "regu" ? l.nama_regu : k === "sumber" ? sumberIsian(l) : durasiLog(l)[k];

function barisTabel(l) {
  const d = durasiLog(l), sel = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;
  return `<tr>${sel("Tanggal", esc(l.t_tiba ? jamWIB(l.t_tiba) : "–") + (l.jam_klien_meleset ? " " + pil("jam meleset", "asumsi-kebijakan", "Jam perangkat berbeda dari jam server lebih dari 10 menit") : ""))}${sel("Kit", esc(l.kit_kode ?? l.kit_id ?? "–"))}${sel("Regu", esc(l.nama_regu ?? "–"))}${sel("Kelas", esc(l.kelas_medan ?? "–"))}${sel("Jenis", esc(JENIS[l.jenis] ?? l.jenis))}${sel("Panjang", esc(l.panjang_m == null ? "–" : fmt(l.panjang_m) + " m"), 1)}${sel("Orang", esc(fmt(l.n_orang)), 1)}${sel("Tiba-air", esc(durasi(d.tiba_air)), 1)}${sel("Gelar", esc(durasi(d.gelar)), 1)}${sel("Bongkar", esc(durasi(d.bongkar)), 1)}${sel("Jam pompa", esc(l.jam_pompa == null ? "–" : fmt(l.jam_pompa) + " jam"), 1)}${sel("BBM", esc(l.bbm_l == null ? "–" : fmt(l.bbm_l) + " L"), 1)}${sel("Air", esc(l.air_m3 == null ? "–" : fmt(l.air_m3) + " m3"), 1)}${sel("Sumber", esc(sumberIsian(l)))}</tr>`;
}

let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController(); pasangTanggal();
  const sinyal = ctrl.signal;
  const st = {jenis: new Set(Object.keys(JENIS)), dari: "", sampai: "", meleset: false, urut: "t_tiba", turun: true, hal: 0, log: []};
  akar.innerHTML = `<h1 class="sp-judul">Rekap time-motion</h1>
    <div class="sp-kontrol" role="group" aria-label="Penyaring log">
      <div class="sp-chips" role="group" aria-label="Jenis">${Object.entries(JENIS).map(([k, n]) => `<button type="button" class="ad-chip" data-jenis="${k}" aria-pressed="true">${n}</button>`).join("")}<button type="button" class="ad-chip" data-meleset aria-pressed="false">Hanya jam meleset</button></div>
      <label class="sp-tgl">Dari ${tanggalHtml({label: "Dari", atribut: 'data-tgl="dari"'})}</label><label class="sp-tgl">Sampai ${tanggalHtml({label: "Sampai", atribut: 'data-tgl="sampai"'})}</label>
      <a class="ad-tombol" data-csv href="/api/sippa/log.csv">Unduh CSV</a></div>
    <div id="sp-log-isi"></div>
    <section class="sp-jejak" aria-labelledby="sp-selang-judul"><h2 class="sp-sub" id="sp-selang-judul">Selang pendek lawan panjang</h2><div id="sp-selang-isi" aria-live="polite"></div></section>
    <section class="sp-jejak" aria-labelledby="sp-jejak-judul"><h2 class="sp-sub" id="sp-jejak-judul">Jejak keputusan dan perubahan</h2>
      <div class="sp-kontrol" role="group" aria-label="Penyaring jejak">
        <label>Rentang <select data-jejak="hari">${RENTANG_JEJAK.map(([h, n]) => `<option value="${h}">${n}</option>`).join("")}</select></label>
        <label>Aksi <select data-jejak="aksi"><option value="">Semua aksi</option></select></label></div>
      <div id="sp-jejak-isi" aria-live="polite"></div></section>
    <section class="sp-lap-pilih" aria-labelledby="sp-lap-judul"><h2 class="sp-sub" id="sp-lap-judul">Suhu tanah dan tekanan per tugas</h2>
      <label>Tugas <select data-lap="tugas"><option value="">Pilih tugas</option></select></label><div id="sp-lap-isi" aria-live="polite"></div></section>`;
  const isi = akar.querySelector("#sp-log-isi"), isiLap = akar.querySelector("#sp-lap-isi"), pilihTugas = akar.querySelector('[data-lap="tugas"]'), isiJejak = akar.querySelector("#sp-jejak-isi"), pilihAksi = akar.querySelector('[data-jejak="aksi"]');

  /* satu gambar ulang antre sekaligus: klik beruntun tidak menumpuk kerja berat (pola laporan.js) */
  let terjadwal = false;
  const jadwalkanGambar = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambar(); }); };
  const gambar = () => {
    if (sinyal.aborted) return;
    const rows = pilihBaris(st.log, st, konteks.prov);
    if (!st.log.length) { isi.replaceChildren(kosong("Belum ada log gelar. Log masuk dari form lapangan /pipa/lapangan atau entri staf dari formulir kertas.")); return; }
    const rek = rekapKelas(rows), per = perData(barisKoreksi(st.log));
    konteks.setPer?.(per);
    const urut = [...rows].sort((a, b) => { const x = nilaiUrut(a, st.urut), y = nilaiUrut(b, st.urut); return (x == null) - (y == null) || (x > y ? 1 : x < y ? -1 : 0) * (st.turun ? -1 : 1); });
    const hal = Math.min(st.hal, Math.max(0, Math.ceil(urut.length / PER_HAL) - 1)), potong = urut.slice(hal * PER_HAL, (hal + 1) * PER_HAL);
    isi.innerHTML = `<section class="sp-kisi k3" aria-label="Rekap per kelas medan">${KELAS.map(k => kartuKelas(k, rek[k], per)).join("")}</section>
      <article class="ex"><header class="ex-hd"><span class="ex-ey">Time-motion</span><div class="ex-jd"><h3>Tiba sampai air mengalir per ulangan, jam</h3></div></header>
      <div class="ex-bd">${grafikTitik(rek)}</div><footer class="ex-ft"><span class="ex-leg"><span><i class="sp-pj"></i>ambang G3 p50 (garis), p90 (putus)</span><span><i class="sp-pj sp-pj-h"></i>hipotesis Studio Kelas I</span></span><em>Sumber: log gelar lapangan, ${perTeks(per)}; ambang asumsi kebijakan, hipotesis Studio belum diuji</em></footer></article>
      <div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Log gelar</caption><thead><tr>${KOLOM.map(([k, n]) => `<th scope="col"><button type="button" data-k="${k}" aria-label="Urutkan menurut ${n}">${n}<i>${st.urut === k ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${potong.length ? potong.map(barisTabel).join("") : `<tr><td colspan="${KOLOM.length}"><p class="ad-kosong">Tidak ada log yang cocok dengan penyaring.</p></td></tr>`}</tbody></table></div>${paginasi(hal, urut.length, PER_HAL, "log")}`;
    const th = isi.querySelector("thead tr");
    pengurutKepala(st, th, jadwalkanGambar);
    akar.querySelector("#sp-selang-isi").innerHTML = selangHtml(bandingSelang(rows));
  };
  /* tiap muat membatalkan muat sebelumnya: jawaban basi tidak pernah menimpa jawaban terbaru */
  let acMuat = null;
  const muat = async () => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    isi.replaceChildren(memuat());
    const q = new URLSearchParams();
    if (st.dari) q.set("sejak", Date.parse(st.dari + "T00:00:00+07:00"));
    if (st.sampai) q.set("sampai", Date.parse(st.sampai + "T23:59:59.999+07:00"));
    akar.querySelector("[data-csv]").href = "/api/sippa/log.csv" + (q.size ? "?" + q : "");
    try {
      const j = await konteks.ambil("/api/sippa/log" + (q.size ? "?" + q : ""), ac.signal);
      if (ac.signal.aborted) return;
      st.log = j.log || []; st.hal = 0; isiPilihan();
      if (j.terpotong) konteks.pesan?.("Log dipotong di 2.000 baris terbaru; persempit rentang tanggal.");
      gambar();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", muat)); }
  };

  /* SP-124: suhu tanah (probe.csv, belum ada rute JSON) dan tekanan per tugas, dimuat saat tugas dipilih */
  let acLap = null;
  const muatLap = async () => {
    acLap?.abort(); const ac = acLap = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    const id = pilihTugas.value; if (!id) { isiLap.replaceChildren(); return; }
    isiLap.replaceChildren(memuat());
    try {
      const [teks, tekanan] = await Promise.all([ambilTeks(`/api/sippa/probe.csv?tugas=${encodeURIComponent(id)}`, ac.signal), muatButir(konteks.ambil, {tugas: id, jenis: "tekanan"}, ac.signal), muatGayaLapangan()]);
      if (ac.signal.aborted) return;
      const t = Date.now();
      isiLap.innerHTML = `<h3 class="sp-sub">Suhu tanah</h3>${suhuHtml(uraiCsv(teks), t)}<h3 class="sp-sub">Tekanan</h3>${tekananHtml(tekanan, t)}`;
    } catch (e) { if (ac.signal.aborted || e?.name === "AbortError") return; if (e.status == null) console.error(e); isiLap.replaceChildren(galat(e.status ?? 0, e.status == null ? "Grafik tidak bisa ditampilkan. Coba lagi." : e.message, muatLap)); }
  };
  const isiPilihan = () => { const lama = pilihTugas.value; pilihTugas.innerHTML = `<option value="">Pilih tugas</option>${pilihanTugas(st.log).map(t => `<option value="${esc(t.id)}"${t.id === lama ? " selected" : ""}>${esc(t.teks)}</option>`).join("")}`; };

  /* jejak: dimuat terpisah dari log; ganti rentang = muat ulang, ganti aksi = gambar ulang tanpa jaringan */
  const jej = {hari: 7, aksi: "", data: null};
  const gambarJejak = () => {
    if (sinyal.aborted || !jej.data) return;
    isiJejak.innerHTML = jejakTabelHtml(jej.data.jejak, {aksi: jej.aksi, terpotong: !!jej.data.terpotong});
  };
  let acJejak = null;
  const muatJejak = async () => {
    acJejak?.abort(); const ac = acJejak = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    isiJejak.replaceChildren(memuat());
    try {
      const j = await konteks.ambil(jalurJejak(Date.now() - jej.hari * 864e5), ac.signal);
      if (ac.signal.aborted) return;
      jej.data = {jejak: j.jejak || [], terpotong: j.terpotong};
      const ada = aksiJejak(jej.data.jejak); if (jej.aksi && !ada.includes(jej.aksi)) jej.aksi = "";
      pilihAksi.innerHTML = `<option value="">Semua aksi</option>${ada.map(a => `<option value="${esc(a)}"${a === jej.aksi ? " selected" : ""}>${esc(namaAksi(a))}</option>`).join("")}`;
      gambarJejak();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isiJejak.replaceChildren(galat(e.status ?? 0, e.status == null ? "Jejak tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", muatJejak)); }
  };

  /* INP: chrome (aria-pressed, panah, halaman aktif) berubah di handler; gambar ulang berat lewat nanti() */
  akar.addEventListener("click", e => {
    const c = e.target.closest("[data-jenis],[data-meleset]");
    if (c) {
      const aktif = c.getAttribute("aria-pressed") !== "true"; c.setAttribute("aria-pressed", aktif);
      if (c.dataset.jenis) st.jenis[aktif ? "add" : "delete"](c.dataset.jenis); else st.meleset = aktif;
      st.hal = 0; jadwalkanGambar(); return;
    }
    const p = e.target.closest(".pgn-b[data-h]");
    if (p && !p.disabled) { p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.removeAttribute("aria-current")); p.setAttribute("aria-current", "page"); st.hal = +p.dataset.h; jadwalkanGambar(); }
  }, {signal: sinyal});
  akar.addEventListener("change", e => {
    const t = e.target.closest("[data-tgl]"), j = e.target.closest("[data-jejak]");
    if (e.target.closest('[data-lap="tugas"]')) { if (pilihTugas.value) isiLap.replaceChildren(memuat()); nanti(muatLap); return; }
    if (t) { st[t.dataset.tgl] = t.value; isi.replaceChildren(memuat()); nanti(muat); }
    else if (j) { if (j.dataset.jejak === "hari") { jej.hari = Number(j.value) || 7; isiJejak.replaceChildren(memuat()); nanti(muatJejak); } else { jej.aksi = j.value; nanti(gambarJejak); } }
  }, {signal: sinyal});
  nanti(muatJejak);
  await muat();
}
