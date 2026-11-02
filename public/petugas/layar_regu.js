/* L7 Pantau regu (ketua regu): angka hari ini, titik absen anggota, dan antrean tinjauan BACA SAJA. Kode pribadi di x-kode; server membatasi data ke tugas yang diketuai
   dan menolak putusan dari ketua, jadi layar ini tidak punya tombol sah/tolak. */
import {$, esc, angka, api, nanti} from "./umum.js";
import {pesanGalat, keMs} from "./murni.js";
import {teksJam} from "./stempel.js";
import {angkaStrip, labelStatusPeta, HADIR} from "./panel_murni.js";
import {kartuTinjau} from "./tinjau_kartu.js";

const off = () => -new Date().getTimezoneOffset();
const kelas = s => HADIR.has(s) ? "hijau" : s === "tolak" ? "merah" : "kuning";

export function layarRegu(ctx) {
  let mati = false; ctx.pasangBersih(() => { mati = true; });
  ctx.tampil(`${ctx.infoHtml()}<section class="lp-kartu"><h2>Pantau regu</h2><div class="lp-rangka" aria-busy="true"><i></i><i></i><i></i></div></section>`);
  nanti(async () => {
    const [r, t] = await Promise.all([api("/api/petugas/panel/ringkas", {kode: ctx.kode}), api("/api/petugas/panel/tinjau", {kode: ctx.kode})]);
    if (mati) return;
    if (!r.ok) {
      ctx.tampil(`<section class="lp-kartu lp-kosong"><h2>Pantau regu</h2><p>${esc(r.status === 403 ? "Kamu bukan ketua regu pada tugas yang berjalan." : pesanGalat(r.status))}</p><button class="lp-tbl utama" id="lpKembali" type="button">Kembali ke beranda</button></section>`);
      $("lpKembali").addEventListener("click", () => ctx.pindah("beranda")); return;
    }
    const a = angkaStrip(r.data), kotak = (n, label) => `<div class="lp-strip-isi"><b class="num">${angka(a[n])}</b><span>${label}</span></div>`;
    const titik = (r.data.titik || []).slice(0, 100), baris = t.ok ? (t.data.baris || []) : [];
    ctx.tampil(`${ctx.infoHtml()}
    <section class="lp-kartu"><h2>Pantau regu</h2>
      <div class="lp-strip">${kotak("hadir", "Hadir")}${kotak("belum_absen", "Belum absen")}${kotak("belum_logbook", "Belum isi logbook")}${kotak("tinjau", "Menunggu tinjauan")}</div></section>
    <section class="lp-kartu"><h2>Absen terakhir anggota</h2>
      ${titik.length ? `<ul class="lp-riwayat">${titik.map(x => { const w = keMs(x.waktu); return `<li><div><b>${esc(x.nama || "Petugas")}</b><span class="lp-kecil">${esc(x.tugas || "")}${Number.isFinite(w) ? `, ${esc(teksJam(w, off()))}` : ""}</span></div><span class="lp-pil ${kelas(x.status)}">${esc(labelStatusPeta(x.status))}</span></li>`; }).join("")}</ul>` : `<p class="lp-kecil">Belum ada absen hari ini.</p>`}</section>
    <section class="lp-kartu"><h2>Antrean tinjauan</h2><p class="lp-kecil">Hanya untuk dilihat. Putusan sah atau tolak ada di pimpinan.</p>
      ${t.ok ? (baris.length ? `<div class="lp-tinjau-daftar">${baris.map(x => kartuTinjau(x, {baca: true})).join("")}</div>` : `<p class="lp-kecil">Tidak ada absen yang menunggu tinjauan.</p>`) : `<p class="lp-kecil">${esc(pesanGalat(t.status))}</p>`}</section>
    <button class="lp-tbl" id="lpKembali" type="button">Kembali ke beranda</button>`);
    $("lpKembali").addEventListener("click", () => ctx.pindah("beranda"));
  });
}
