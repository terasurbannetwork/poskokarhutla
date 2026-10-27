/* SIPPA: layar Laporan /pipa/laporan (PRD §9.10, DS §3.18 §4.12). Kontrak router: pasang(akar, konteks) dan lepas().
   Staf memilih jenis dan rentang, layar mengambil log, probe, dan komponen dari API yang sudah ada, isiLaporan() menyusun blok, jsPDF merender di peramban,
   dan (bila dicentang) arsip dikirim ke POST /api/sippa/laporan. Templat yang tersedia: pilot; empat lainnya menyusul di SP-044. Pembangun murni di atas, DOM dan jaringan di bawah.
   Butuh global public/inti: fmt, esc, jamWIB, nanti, paginasi (dimuat cangkang). Tidak ada data di berkas ini. */
import {isiLaporan, JENIS_LAPORAN, JENIS_SIAP} from "./laporan_isi.js";
import {isiTemplat, JENIS_TEMPLAT, saringBahan, milikProv} from "./laporan_templat.js";
import {ringkasAb} from "./layar_ab.js";
import {pratinjauHtml, buatPdf, siapkanBahan} from "./laporan_pdf.js";
import {barisKoreksi} from "./layar_log.js";
import {memuat, kosong, galat, menunggu} from "./keadaan.js";
import {tanggalHtml, pasangTanggal} from "./tanggal.js";

const ID16 = /^[0-9a-f]{16}$/;
export const PER_HAL = 50;
export const MAKS_HARI = 366;
/* rentang pilot (PRD PL1): 26 Okt sampai 1 Nov 2026, bukan data; hanya nilai awal isian */
export const RENTANG_PILOT = {dari: "2026-10-26", sampai: "2026-11-01"};
export const MAKS_KENDALA = 10;
const MAKS_KENDALA_PANJANG = 300;
const LABEL_JENIS = Object.fromEntries(JENIS_LAPORAN);

/* ---------- logika murni ---------- */
const tglMs = (s, akhir) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.parse(`${s}T${akhir ? "23:59:59.999" : "00:00:00"}+07:00`) : NaN;
export const rentangMs = ({dari, sampai}) => ({sejak: tglMs(dari, false), sampai: tglMs(sampai, true)});

/* galat isian: larik {medan, alasan}; kosong = boleh dibuat */
export function cekFormLaporan({jenis, dari, sampai}) {
  const g = [];
  if (!JENIS_LAPORAN.some(([k]) => k === jenis)) g.push({medan: "jenis", alasan: "Pilih jenis laporan."});
  else if (!JENIS_SIAP.includes(jenis)) g.push({medan: "jenis", alasan: `Templat ${LABEL_JENIS[jenis]} belum tersedia di versi ini. Pilih Pilot.`});
  const {sejak, sampai: sd} = rentangMs({dari, sampai});
  if (Number.isNaN(sejak)) g.push({medan: "dari", alasan: "Isi tanggal mulai."});
  if (Number.isNaN(sd)) g.push({medan: "sampai", alasan: "Isi tanggal akhir."});
  if (!Number.isNaN(sejak) && !Number.isNaN(sd)) {
    if (sd < sejak) g.push({medan: "sampai", alasan: "Tanggal akhir harus sama dengan atau sesudah tanggal mulai."});
    else if ((sd - sejak) / 864e5 > MAKS_HARI) g.push({medan: "sampai", alasan: `Rentang paling lama ${fmt(MAKS_HARI)} hari. Persempit tanggalnya.`});
  }
  return g;
}

/* semua lima jenis: tanggal diperiksa seperti pilot; jenis liar tetap ditolak (cekFormLaporan di atas mempertahankan perilaku lamanya) */
export const JENIS_AKTIF = [...JENIS_SIAP, ...JENIS_TEMPLAT];
export const cekForm = f => cekFormLaporan({...f, jenis: JENIS_AKTIF.includes(f.jenis) ? "pilot" : f.jenis});

/* teks kendala dari staf: satu per baris, kosong dibuang, dipotong; tetap teks polos */
export const bersihKendala = t => String(t ?? "").split("\n").map(s => s.trim().slice(0, MAKS_KENDALA_PANJANG)).filter(Boolean).slice(0, MAKS_KENDALA);

/* CSV aman server memberi awalan ' pada sel berawalan = + - @; dilepas lagi di sini. Sel bertanda kutip dan baris dalam kutip didukung. */
export function bacaCsv(teks) {
  const baris = []; let sel = "", r = [], kutip = false;
  const s = String(teks).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (kutip) { if (c === '"') { if (s[i + 1] === '"') { sel += '"'; i++; } else kutip = false; } else sel += c; }
    else if (c === '"') kutip = true;
    else if (c === ",") { r.push(sel); sel = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; r.push(sel); sel = ""; if (r.length > 1 || r[0] !== "") baris.push(r); r = []; }
    else sel += c;
  }
  if (sel !== "" || r.length) { r.push(sel); baris.push(r); }
  if (!baris.length) return [];
  const [kepala, ...isi] = baris;
  return isi.map(b => Object.fromEntries(kepala.map((k, i) => [k, /^'[=+\-@\t\r]/.test(b[i] ?? "") ? b[i].slice(1) : (b[i] ?? "")])));
}
const angkaAtauNull = v => v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);
export const barisProbe = teks => bacaCsv(teks).map(r => ({petak_id: r.petak_id || null, titik: angkaAtauNull(r.titik), tahap: r.tahap, kedalaman_cm: angkaAtauNull(r.kedalaman_cm), suhu_c: angkaAtauNull(r.suhu_c), waktu: angkaAtauNull(r.waktu)}));

/* data isiLaporan('pilot') dari jawaban API: log aktif jenis karhutla atau latihan dalam provinsi dan rentang, probe milik log itu, komponen dari kit yang tampil di log */
export function bahanPilot({log, probe, kit, kendala, prov, rentang}) {
  const {sejak, sampai} = rentangMs(rentang);
  /* satu pintu penyaring (laporan_templat.saringBahan): dummy, koreksi, wilayah ketat, jendela waktu; probe anak dari log yang terbuang ikut terbuang */
  const b = saringBahan({log: (log || []).filter(l => l.jenis !== "banjir"), probe}, {prov, sejak: Number.isNaN(sejak) ? null : sejak, sampai: Number.isNaN(sampai) ? null : sampai});
  const komponen = (kit || []).flatMap(k => (k.komponen || []).filter(c => !(c.dummy === 1 || c.dummy === true)));
  return {log: b.log, probe: b.probe, komponen_kembali: komponen.map(c => ({kode_bom: c.kode_bom, kondisi: c.kondisi})), foto: [], kendala: bersihKendala(Array.isArray(kendala) ? kendala.join("\n") : kendala),
    rentang: {dari: Number.isNaN(sejak) ? null : sejak, sampai: Number.isNaN(sampai) ? null : sampai}};
}

/* bahan templat lain dari jawaban API. kit = rincian /api/sippa/kit/:id (komponen, gerak, tugas); alarm, ab, skenario dari rute masing-masing.
   Semua lewat saringBahan: dummy dan wilayah lain tidak pernah masuk laporan. kejadian memakai satu sesi (sesiId); latihan ikut hanya di musim. */
export function bahanTemplat(jenis, {log, probe, kit, alarm, ab, skenario, kendala, prov, rentang, sesiId = null, gerbang = [], pelajaran = []}) {
  const {sejak, sampai} = rentangMs(rentang), r = {prov, sejak: Number.isNaN(sejak) ? null : sejak, sampai: Number.isNaN(sampai) ? null : sampai};
  const kitDet = (kit || []).filter(k => !(k.kit?.dummy === 1 || k.kit?.dummy === true) && milikProv({prov: k.kit?.prov ?? null, kit_prov: k.kit?.prov ?? null}, prov));
  const bawa = (rows, f) => kitDet.flatMap(k => (k[rows] || []).map(x => ({...x, kit_kode: k.kit?.kode, kit_prov: k.kit?.prov, kit_id: x.kit_id ?? k.kit?.id, ...(f ?? {})})));
  const b = saringBahan({log: (log || []).map(l => ({...l, kit_prov: l.kit_prov ?? kitDet.find(k => k.kit?.id === l.kit_id)?.kit?.prov})), probe, gerak: bawa("gerak"), tugas: bawa("tugas"), komponen: bawa("komponen"), bbm: bawa("bbm"), alarm, kit: kitDet.map(k => k.kit)}, r);
  if (jenis === "kejadian") {
    const l = b.log.find(x => x.id === sesiId) ?? null;
    return {log: l, probe: l ? b.probe.filter(p => p.log_id === l.id || (p.log_id == null && (p.tugas_id === l.tugas_id && l.tugas_id != null || p.petak_id === l.petak_id && l.petak_id != null))) : [], tugas: l ? b.tugas.find(t => t.id === l.tugas_id) ?? null : null, foto: []};
  }
  if (jenis === "skenario") return {skenario: (skenario || []).filter(s => !(s.dummy === 1 || s.dummy === true)).slice(0, 5)};
  const abRows = jenis === "musim" ? ringkasAb((ab?.petak || []).filter(p => !(p.dummy === 1 || p.dummy === true) && (prov == null || p.prov == null || p.prov === prov)), {unggah: ab?.unggah || []}).lengan.filter(l => l.ada).map(l => ({nama: l.nama, n: l.n, vonis: l.g4.vonis, keterangan: l.g4.pilot ? "pilot, n kecil" : l.keyakinan === "hipotesis" ? "hipotesis" : "ditinjau evaluator"})) : [];
  return {...b, ab: abRows, gerbang, pelajaran: bersihKendala(Array.isArray(pelajaran) ? pelajaran.join("\n") : pelajaran), rentang: {dari: r.sejak, sampai: r.sampai}};
}

/* peran: tulis (arsip) bila moderator, super, atau tulis; selain itu hanya baca */
export const bolehArsip = ds => !!ds && (ds.mod === "1" || ds.super === "1" || ds.tulis === "1");

/* badan arsip POST /api/sippa/laporan (multipart: meta JSON <= 8.192 byte + berkas PDF) */
export function metaArsip(lap, {jenis, prov, rentang, per, halaman}) {
  const meta = {jenis, prov: prov || undefined, parameter: {dari: rentang.dari, sampai: rentang.sampai, per, halaman, nama: lap.nama_berkas}};
  const teks = JSON.stringify(meta);
  if (new TextEncoder().encode(teks).length > 8192) throw new RangeError("meta arsip lebih dari 8.192 byte");
  return teks;
}

const ukuranTeks = b => b == null ? "–" : b >= 1048576 ? `${fmt(b / 1048576)} MB` : `${fmt(Math.max(1, Math.round(b / 1024)))} KB`;
const tanggalPendek = ms => ms == null ? "–" : new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
function rentangArsip(l) {
  let p; try { p = JSON.parse(l.parameter); } catch { return "–"; }
  const dari = Number(p?.dari), sampai = Number(p?.sampai);
  return Number.isFinite(dari) && Number.isFinite(sampai) ? `${tanggalPendek(dari)} sampai ${tanggalPendek(sampai)}` : "–";
}
const td = (label, isi, kelas = "") => `<td${kelas ? ` class="${kelas}"` : ""} data-label="${label}">${isi}</td>`;
export function barisArsipHtml(l) {
  const unduh = l.ada_berkas && ID16.test(String(l.id)) ? `<a class="ad-tombol" href="/api/sippa/laporan-berkas/${l.id}" download aria-label="Unduh laporan ${esc(LABEL_JENIS[l.jenis] ?? l.jenis)} ${esc(tanggalPendek(l.waktu))}">Unduh</a>` : `<span class="sp-yakin menunggu">tanpa berkas</span>`;
  return `<tr>${td("Waktu", esc(l.waktu ? jamWIB(l.waktu) : "–"))}${td("Jenis", esc(LABEL_JENIS[l.jenis] ?? String(l.jenis ?? "–")))}${td("Provinsi", esc(l.prov ?? "nasional"))}${td("Rentang", esc(rentangArsip(l)))}${td("Ukuran", esc(ukuranTeks(l.ukuran)), "n")}${td("Dibuat oleh", esc(l.oleh ?? "–"))}${td("Unduh", unduh, "a")}</tr>`;
}
export function tabelArsipHtml(daftar, hal = 0) {
  const rows = daftar.filter(l => !l.dummy), mulai = hal * PER_HAL;
  const kepala = ["Waktu", "Jenis", "Provinsi", "Rentang", "Ukuran", "Dibuat oleh", ""].map(k => `<th scope="col">${esc(k)}</th>`).join("");
  const isi = rows.length ? rows.slice(mulai, mulai + PER_HAL).map(barisArsipHtml).join("") : `<tr><td colspan="7"><p class="ad-kosong">Belum ada laporan diarsipkan. Centang "Arsipkan salinan di server" saat membuat PDF.</p></td></tr>`;
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Arsip laporan</caption><thead><tr>${kepala}</tr></thead><tbody>${isi}</tbody></table></div>${rows.length > PER_HAL ? paginasi(hal, rows.length, PER_HAL, "laporan") : ""}`;
}

/* ---------- DOM dan jaringan ---------- */
let ctrl = null, hentikan = [], urlPdf = null;
export function lepas() { ctrl?.abort(); ctrl = null; hentikan.forEach(f => f()); hentikan = []; if (urlPdf) { URL.revokeObjectURL(urlPdf); urlPdf = null; } }

/* gaya layar ini dan kartu.css milik public/inti (pemilih kustom PilihCantik, DS §1.3) dimuat sekali; layar menunggu sampai terpasang agar tidak berkedip polos */
function muatGaya() {
  const pasangLink = (href, kunci) => new Promise(ok => {
    if (document.querySelector(`link[data-sp="${kunci}"]`)) return ok();
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href; l.dataset.sp = kunci;
    l.onload = l.onerror = () => ok();
    document.head.append(l);
    setTimeout(ok, 1500);
  });
  return Promise.all([pasangLink("/inti/kartu.css", "kartu"), pasangLink("/pipa/layar_laporan.css?v=1", "laporan")]);
}
const jeda = () => new Promise(r => setTimeout(r, 0));
const getTeks = async (url, sinyal) => {
  let r;
  try { r = await fetch(url, {credentials: "same-origin", signal: sinyal}); }
  catch (e) { if (e.name === "AbortError") throw e; const g = new Error("Tidak bisa terhubung ke server."); g.status = 0; throw g; }
  if (!r.ok) { const g = new Error(`Permintaan ditolak (kode ${r.status}).`); g.status = r.status; throw g; }
  return r.text();
};

export async function pasang(akar, konteks) {
  pasangTanggal();
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, bisaArsip = bolehArsip(document.body?.dataset);
  await muatGaya();
  const PROV = globalThis.Wilayah?.PROV || {"62": "Kalimantan Tengah"};
  akar.innerHTML = `<div class="sp-lap-kepala"><h1 class="sp-judul">Laporan</h1></div>
    <div class="sp-lap-kisi">
      <section class="sp-lk sp-lap-form" aria-labelledby="sp-lap-fh"><header class="sp-lk-hd"><span class="ad-ey">Buat laporan</span><div><h3 id="sp-lap-fh">PDF dari data SIPPA, dibuat di perangkatmu</h3></div></header>
        <div class="sp-lk-bd"><form class="sp-form" novalidate>
          <label>Jenis laporan<select name="jenis">${JENIS_LAPORAN.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></label>
          <label data-jenis="kejadian" hidden>Sesi gelar<select name="sesi" aria-describedby="sp-lap-sb"></select><span class="sp-bantu" id="sp-lap-sb">Satu sesi gelar dalam rentang dan provinsi yang dipilih.</span></label>
          <label>Provinsi<select name="prov">${Object.entries(PROV).map(([k, n]) => `<option value="${esc(k)}"${k === konteks.prov ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
          <div class="sp-lap-tgl"><label>Dari${tanggalHtml({nama: "dari", label: "Dari", nilai: RENTANG_PILOT.dari})}</label><label>Sampai${tanggalHtml({nama: "sampai", label: "Sampai", nilai: RENTANG_PILOT.sampai})}</label></div>
          <label>Kendala di lapangan<textarea name="kendala" rows="3" maxlength="${MAKS_KENDALA * MAKS_KENDALA_PANJANG}" aria-describedby="sp-lap-kb"></textarea><span class="sp-bantu" id="sp-lap-kb">Satu kendala per baris, paling banyak ${fmt(MAKS_KENDALA)}. Boleh dikosongkan.</span></label>
          <label class="sp-cek"><input type="checkbox" name="arsip"${bisaArsip ? " checked" : " disabled"}> Arsipkan salinan di server</label>
          ${bisaArsip ? "" : `<p class="ad-spanduk" role="status">Akunmu hanya bisa membaca arsip. PDF tetap bisa dibuat dan diunduh.</p>`}
          <div class="sp-galat-slot" aria-live="polite"></div>
          <div class="sp-aksi"><button type="submit" class="ad-tombol utama">Buat PDF</button></div>
          <div class="sp-lap-hasil" aria-live="polite"></div>
        </form></div></section>
      <section class="sp-lk sp-lap-arsip" aria-labelledby="sp-lap-ah"><header class="sp-lk-hd"><span class="ad-ey">Arsip</span><div><h3 id="sp-lap-ah">Laporan yang sudah diarsipkan</h3></div></header>
        <div class="sp-lk-bd" id="sp-lap-arsip-isi"></div></section>
      <section class="sp-lk sp-lap-pra-kotak" aria-labelledby="sp-lap-ph"><header class="sp-lk-hd"><span class="ad-ey">Pratinjau isi</span><div><h3 id="sp-lap-ph">Isi laporan yang akan dibuat</h3></div></header>
        <div class="sp-lk-bd" id="sp-lap-pra-isi"></div></section>
      <section class="sp-lk sp-lap-aoi" aria-labelledby="sp-lap-oh"><header class="sp-lk-hd"><span class="ad-ey">Gerbang G0</span><div><h3 id="sp-lap-oh">Calon AOI usulan</h3></div></header>
        <div class="sp-lk-bd" id="sp-lap-aoi-isi"></div></section>
    </div>`;
  const f = akar.querySelector("form"), slot = f.querySelector(".sp-galat-slot"), hasil = f.querySelector(".sp-lap-hasil"), tombol = f.querySelector("button[type=submit]");
  const praIsi = akar.querySelector("#sp-lap-pra-isi"), arsipIsi = akar.querySelector("#sp-lap-arsip-isi");
  akar.querySelector("#sp-lap-aoi-isi").append(menunggu("Daftar usulan AOI menunggu rute baca usulan dari server"));
  const nilai = () => ({jenis: f.elements.jenis.value, prov: f.elements.prov.value, dari: f.elements.dari.value, sampai: f.elements.sampai.value, kendala: f.elements.kendala.value, sesi: f.elements.sesi.value || null, arsip: f.elements.arsip.checked});

  /* ---- data sumber, di-cache per kunci rentang dan provinsi; muat baru membatalkan yang lama ---- */
  const st = {kunci: null, bahan: null, per: null, acMuat: null, arsip: [], hal: 0};
  const lebar = j => j === "pilot" || j === "kejadian" ? "p" : "x";
  const kunci = v => `${v.prov}|${v.dari}|${v.sampai}|${lebar(v.jenis)}${v.jenis === "musim" ? "m" : v.jenis === "skenario" ? "s" : ""}`;
  async function ambilBahan(v) {
    const k = kunci(v);
    if (st.kunci === k && st.bahan) return st.bahan;
    st.acMuat?.abort(); const ac = st.acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    const {sejak, sampai} = rentangMs(v), q = new URLSearchParams({sejak, sampai}), lain = (url, kunciJawab) => konteks.ambil(url, ac.signal).then(j => j[kunciJawab] ?? []).catch(e => { if (e.name === "AbortError") throw e; return []; });
    const [logJ, probeT] = await Promise.all([konteks.ambil(`/api/sippa/log?${q}`, ac.signal), getTeks(`/api/sippa/probe.csv?${q}`, ac.signal)]);
    const log = barisKoreksi(logJ.log || []).filter(l => !l.dummy && l.kit_id && ID16.test(l.kit_id));
    let kitId = [...new Set(log.map(l => l.kit_id))].slice(0, 20), alarm = [], ab = null, skenario = [];
    if (lebar(v.jenis) === "x") {   // mingguan dan musim: gerak, tugas, dan komponen semua kit provinsi (bukan hanya yang punya log), alarm, dan A/B
      const daftar = await konteks.ambil(`/api/sippa/kit?prov=${encodeURIComponent(v.prov)}`, ac.signal).catch(e => { if (e.name === "AbortError") throw e; return {kit: []}; });
      kitId = [...new Set([...kitId, ...(daftar.kit || []).map(x => x.id).filter(x => ID16.test(String(x)))])].slice(0, 40);
      alarm = await lain("/api/sippa/alarm", "alarm");
      if (v.jenis === "musim") ab = await konteks.ambil("/api/sippa/ab", ac.signal).catch(e => { if (e.name === "AbortError") throw e; return null; });
    }
    if (v.jenis === "skenario") skenario = await lain("/api/sippa/skenario", "skenario");
    const kit = await Promise.all(kitId.map(id => konteks.ambil(`/api/sippa/kit/${id}`, ac.signal).catch(e => { if (e.name === "AbortError") throw e; return {komponen: []}; })));
    if (ac.signal.aborted) throw new DOMException("batal", "AbortError");
    st.kunci = k; st.per = Date.now();
    st.bahan = {log: logJ.log || [], probe: barisProbe(probeT), kit, alarm, ab, skenario};
    if (logJ.terpotong) konteks.pesan?.("Log dipotong di 2.000 baris terbaru; persempit rentang tanggal.");
    return st.bahan;
  }
  /* pilihan sesi untuk laporan kejadian: log nyata dalam provinsi dan rentang (dummy dan provinsi lain sudah disaring) */
  const sesiPilihan = (v, b) => bahanPilot({...b, kendala: "", prov: v.prov, rentang: {dari: v.dari, sampai: v.sampai}}).log;
  const susunLaporan = (v, b) => {
    const opsiLap = {per: st.per, prov: v.prov, provNama: PROV[v.prov], rentang: rentangMs({dari: v.dari, sampai: v.sampai})};
    if (v.jenis === "pilot") return isiLaporan("pilot", bahanPilot({...b, kendala: v.kendala, prov: v.prov, rentang: {dari: v.dari, sampai: v.sampai}}), opsiLap);
    const d = bahanTemplat(v.jenis, {...b, kendala: v.kendala, prov: v.prov, rentang: {dari: v.dari, sampai: v.sampai}, sesiId: v.sesi, pelajaran: v.kendala});
    if (v.jenis === "kejadian" && !d.log) throw Object.assign(new Error("Pilih satu sesi gelar untuk laporan kejadian."), {status: 400});
    return isiTemplat(v.jenis, d, {per: st.per, prov: v.prov, provNama: PROV[v.prov], rentang: {dari: opsiLap.rentang.sejak, sampai: opsiLap.rentang.sampai}});
  };

  /* ---- pratinjau: gambar ulang lewat nanti(), satu antrean; data baru hanya bila rentang atau provinsi berubah ---- */
  let giliran = 0;
  const segarkanPra = async () => {
    const g = ++giliran, v = nilai(), salah = cekForm(v);
    if (salah.length) { praIsi.replaceChildren(kosong(salah[0].alasan)); return; }
    if (st.kunci !== kunci(v)) praIsi.replaceChildren(memuat());
    try {
      const b = await ambilBahan(v);
      if (g !== giliran || sinyal.aborted) return;
      if (v.jenis === "kejadian") {
        const pilih = f.elements.sesi, daftar = sesiPilihan(v, b), lama = pilih.value;
        pilih.replaceChildren(new Option("Pilih sesi gelar", ""), ...daftar.map(l => new Option(`${l.kit_kode ?? l.kit_id ?? "kit"}, ${tanggalPendek(l.t_tiba)}`, l.id)));
        pilih.value = daftar.some(l => l.id === lama) ? lama : "";
        if (!pilih.value) { praIsi.replaceChildren(kosong(daftar.length ? "Pilih satu sesi gelar untuk laporan kejadian." : "Belum ada sesi gelar nyata dalam rentang dan provinsi ini.")); return; }
        v.sesi = pilih.value;
      }
      praIsi.innerHTML = pratinjauHtml(susunLaporan(v, b));
    } catch (e) {
      if (e.name === "AbortError" || g !== giliran || sinyal.aborted) return;
      if (e.status == null) console.error(e);
      praIsi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Pratinjau tidak bisa disusun. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", segarkanPra));
    }
  };
  let terjadwal = false;
  const jadwalkanPra = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; segarkanPra(); }); };

  /* ---- arsip ---- */
  const gambarArsip = () => { arsipIsi.innerHTML = tabelArsipHtml(st.arsip, st.hal); };
  async function muatArsip() {
    arsipIsi.replaceChildren(memuat());
    try {
      const j = await konteks.ambil("/api/sippa/laporan", sinyal);
      st.arsip = j.laporan || []; st.hal = 0; gambarArsip();
    } catch (e) {
      if (e.name === "AbortError" || sinyal.aborted) return;
      if (e.status === 404) { arsipIsi.replaceChildren(menunggu("Arsip menunggu rute laporan di server")); return; }
      if (e.status == null) console.error(e);
      arsipIsi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Arsip tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", muatArsip));
    }
  }

  /* ---- buat PDF: tombol berubah seketika, kerja berat bertahap dengan jeda antar tahap ---- */
  const kotakGalat = daftar => { const e = document.createElement("div"); e.className = "ad-galat"; e.setAttribute("role", "alert"); const ul = document.createElement("ul"); daftar.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.append(li); }); e.append(ul); return e; };
  f.addEventListener("submit", e => {
    e.preventDefault();
    if (tombol.disabled) return;
    const v = nilai(), salah = cekForm(v);
    f.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    salah.forEach(s => f.elements[s.medan]?.setAttribute("aria-invalid", "true"));
    if (salah.length) { slot.replaceChildren(kotakGalat(salah.map(s => s.alasan))); f.elements[salah[0].medan]?.focus(); return; }
    slot.replaceChildren(); hasil.replaceChildren();
    tombol.disabled = true; tombol.setAttribute("aria-busy", "true"); tombol.textContent = "Membuat PDF";   // pikselnya berubah di handler; sisanya nanti
    nanti(async () => {
      try {
        const b = await ambilBahan(v); await jeda();
        const lap = susunLaporan(v, b), bahan = await siapkanBahan(lap, sinyal); await jeda();
        const pdf = await buatPdf(lap, bahan);
        if (sinyal.aborted) return;
        if (urlPdf) URL.revokeObjectURL(urlPdf);
        urlPdf = URL.createObjectURL(new Blob([pdf.byte], {type: "application/pdf"}));
        const a = document.createElement("a"); a.href = urlPdf; a.download = pdf.nama; a.className = "ad-tombol"; a.textContent = "Unduh PDF"; a.setAttribute("aria-label", `Unduh ${pdf.nama}`);
        const info = document.createElement("p"); info.className = "ad-catat"; info.textContent = `${pdf.nama} siap: ${fmt(pdf.halaman)} halaman, ${ukuranTeks(pdf.byte.length)}.`;
        hasil.replaceChildren(info, a); a.click();
        if (v.arsip && bisaArsip) {
          const fd = new FormData();
          fd.append("meta", metaArsip(lap, {jenis: v.jenis, prov: v.prov, rentang: {dari: v.dari, sampai: v.sampai}, per: st.per, halaman: pdf.halaman}));
          fd.append("berkas", new Blob([pdf.byte], {type: "application/pdf"}), pdf.nama);
          const r = await fetch("/api/sippa/laporan", {method: "POST", credentials: "same-origin", headers: {"x-pb": "1"}, body: fd, signal: sinyal});
          if (r.ok) { konteks.pesan?.("Laporan diarsipkan."); muatArsip(); }
          else { let m = ""; try { m = (await r.json()).galat || ""; } catch { /* badan bukan JSON */ } slot.replaceChildren(kotakGalat([`PDF sudah terunduh, tetapi arsip di server gagal${m ? `: ${m}` : ` (kode ${r.status})`}. Unggah ulang dengan membuat PDF lagi.`])); }
        }
      } catch (er) {
        if (er.name === "AbortError" || sinyal.aborted) return;
        if (er.status == null) console.error(er);
        slot.replaceChildren(kotakGalat([er.status == null ? "PDF tidak bisa dibuat. Coba lagi." : er.message || "Data tidak bisa dimuat."]));
      } finally { tombol.disabled = false; tombol.removeAttribute("aria-busy"); tombol.textContent = "Buat PDF"; }
    });
  }, {signal: sinyal});
  f.addEventListener("change", () => { f.querySelectorAll("[data-jenis]").forEach(x => { x.hidden = x.dataset.jenis !== f.elements.jenis.value; }); jadwalkanPra(); }, {signal: sinyal});
  f.elements.kendala.addEventListener("input", () => jadwalkanPra(), {signal: sinyal});
  akar.addEventListener("click", e => {
    const p = e.target.closest(".pgn-b[data-h]");
    if (p && !p.disabled && arsipIsi.contains(p)) { p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.removeAttribute("aria-current")); p.setAttribute("aria-current", "page"); st.hal = +p.dataset.h; nanti(gambarArsip); }
  }, {signal: sinyal});

  segarkanPra(); muatArsip();
}
