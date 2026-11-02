/* Kartu tinjauan absen (foto absen + acuan wajah + alasan). Dipakai panel pimpinan (dengan tombol putus) dan layar ketua regu (baca saja, ketua tidak bisa memutus).
   Foto hanya dari /api/petugas/foto/ lewat fotoAman; semua teks lewat esc(). */
import {esc} from "./umum.js";
import {teksAlasan, keMs} from "./murni.js";
import {tanggalLokal, teksJam} from "./stempel.js";
import {fotoAman} from "./panel_murni.js";

const off = () => -new Date().getTimezoneOffset();

export function kartuTinjau(x, {baca = false} = {}) {
  const foto = fotoAman(x.foto_url), acuan = fotoAman(x.acuan_url), w = keMs(x.waktu), skor = Number(x.skor_wajah);
  const gambar = (u, ket) => u ? `<figure><img src="${esc(u)}" alt="${esc(ket)}" loading="lazy" decoding="async"><figcaption>${esc(ket)}</figcaption></figure>` : `<figure class="kosong"><span>${esc(ket)} tidak tersedia</span></figure>`;
  return `<article class="lp-tinjau" data-id="${esc(x.id)}"><div class="lp-banding">${gambar(foto, "Foto absen berstempel")}${gambar(acuan, "Acuan wajah depan")}</div>
    <div class="lp-tinjau-info"><b>${esc(x.nama || "Petugas")}</b><span class="lp-kecil">${esc(x.tugas || "")}${Number.isFinite(w) ? `, ${esc(tanggalLokal(w, off()))} ${esc(teksJam(w, off()))}` : ""}</span>
      <div class="lp-baris">${Number.isFinite(skor) ? `<span class="lp-pil">Skor wajah ${esc(skor.toFixed(2).replace(".", ","))}</span>` : ""}${Number.isFinite(Number(x.jarak_m)) ? `<span class="lp-pil">Jarak ${esc(Math.round(Number(x.jarak_m)))} m</span>` : ""}${(x.alasan || []).map(a => `<span class="lp-pil kuning">${esc(teksAlasan(a, Number(x.jarak_m)))}</span>`).join("")}</div>
      ${baca ? "" : `<label class="lp-bidang" for="lpC${esc(x.id)}">Catatan (wajib bila menolak)</label><input id="lpC${esc(x.id)}" maxlength="300" autocomplete="off">
      <div class="lp-dua"><button class="lp-tbl utama" type="button" data-putus="sah">Sah</button><button class="lp-tbl tolak" type="button" data-putus="tolak">Tolak</button></div>
      <p class="lp-galat" role="alert" hidden></p>`}</div></article>`;
}
