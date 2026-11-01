/* Layar petugas /petugas, tahap A: L1 Beranda dan L2 Persetujuan. Kode pribadi hanya di sessionStorage dan header x-kode. */
import {$, esc, api, ambilKode, pasangTema, pasangDummy, nanti} from "./umum.js";
import {statusWajah, labelJenis, pesanGalat} from "./murni.js";

const isi = $("lpIsi");
let kode = ambilKode(), saya = null, layar = "beranda", info = "";

const tampil = h => { isi.innerHTML = h; };
const kosong = (judul, teks, aksi = "") => tampil(`<section class="lp-kartu lp-kosong"><h2>${esc(judul)}</h2><p>${esc(teks)}</p>${aksi}</section>`);

function beranda() {
  const o = saya.orang, w = statusWajah(o.wajah_status), tugas = saya.tugas || [];
  const setuju = o.setuju_versi != null && o.setuju_versi === saya.setuju?.versi;
  tampil(`${info ? `<p class="lp-kartu" role="status">${esc(info)}</p>` : ""}
  <section class="lp-kartu"><div class="lp-nama">${esc(o.nama)}</div>
    <p class="lp-kecil">${esc([o.unit, o.jabatan].filter(Boolean).join(", ") || "Unit belum diisi")}</p>
    <div class="lp-baris"><span class="lp-pil">${esc(labelJenis(o.jenis))}</span><span class="lp-pil ${w.kelas}">Wajah: ${esc(w.label)}</span></div>
    ${w.daftar ? "" : `<button class="lp-tbl utama" id="lpDaftar" type="button">Daftar wajah</button>`}
  </section>
  <section class="lp-kartu"><h2>Tugas hari ini</h2>
    ${tugas.length ? tugas.map(t => `<div class="lp-baris"><b>${esc(t.judul || "Tugas")}</b></div>`).join("") : `<p class="lp-kecil">Belum ada tugas hari ini</p>`}
  </section>
  <section class="lp-dua">
    <button class="lp-tbl besar" type="button" disabled>Absen masuk</button>
    <button class="lp-tbl besar" type="button" disabled>Isi logbook</button>
  </section>
  <p class="lp-kecil">${setuju ? "Persetujuan data wajah sudah kamu simpan. " : ""}Absen dan logbook tersedia sesudah daftar wajah.</p>`);
  $("lpDaftar")?.addEventListener("click", () => { layar = "setuju"; info = ""; gambar(); });
}

function persetujuan() {
  const s = saya.setuju, sudah = saya.orang.setuju_versi != null && saya.orang.setuju_versi === s.versi;
  tampil(`${info ? `<p class="lp-kartu" role="status">${esc(info)}</p>` : ""}<section class="lp-kartu"><h2>Persetujuan data wajah</h2>
    ${String(s.teks || "").split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join("")}
    ${sudah ? `<p class="lp-pil hijau" role="status">Persetujuan tersimpan</p>
      <button class="lp-tbl utama" type="button" disabled>Mulai daftar wajah</button>
      <p class="lp-kecil">Pendaftaran wajah dibuka di tahap berikutnya.</p>
      <button class="lp-tautan" id="lpCabut" type="button">Cabut persetujuan</button>`
    : `<label class="lp-centang"><input type="checkbox" id="lpCek"><span>Aku sudah membaca dan setuju datanya disimpan seperti di atas.</span></label>
      <div class="lp-dua"><button class="lp-tbl utama" id="lpSetuju" type="button" disabled>Setuju</button><button class="lp-tbl" id="lpTolak" type="button">Tolak</button></div>`}
    <button class="lp-tautan" id="lpKembali" type="button">Kembali ke beranda</button>
  </section>`);
  $("lpKembali").addEventListener("click", () => { layar = "beranda"; gambar(); });
  $("lpCek")?.addEventListener("change", e => { $("lpSetuju").disabled = !e.target.checked; });
  $("lpSetuju")?.addEventListener("click", () => kirim(true, "lpSetuju"));
  $("lpTolak")?.addEventListener("click", () => kirim(false, "lpTolak"));
  $("lpCabut")?.addEventListener("click", () => kirim(false, "lpCabut"));
}

/* tombol langsung berubah keadaan, panggilan jaringan sesudah dua frame */
function kirim(setuju, idTombol) {
  const b = $(idTombol); b.disabled = true; b.classList.add("kerja"); b.textContent = "Menyimpan...";
  nanti(async () => {
    const r = await api("/api/petugas/setuju", {metode: "POST", kode, badan: {versi: saya.setuju.versi, setuju}});
    if (!r.ok) { info = pesanGalat(r.status); layar = "setuju"; gambar(); return; }
    saya.orang.setuju_versi = r.data.setuju_versi ?? null;
    info = setuju ? "" : "Persetujuan tidak disimpan. Kamu bisa menyetujuinya kapan saja.";
    layar = setuju ? "setuju" : "beranda"; gambar();
  });
}

function gambar() { if (layar === "setuju") persetujuan(); else beranda(); window.scrollTo(0, 0); }

async function muat() {
  tampil(`<div class="lp-kartu lp-rangka" aria-busy="true"><i></i><i></i><i></i></div>`);
  const r = await api("/api/petugas/saya", {kode});
  if (r.status === 401) return kosong("Tautan tidak dikenali", pesanGalat(401));
  if (!r.ok) { kosong("Belum bisa dibuka", pesanGalat(r.status), `<button class="lp-tbl utama" id="lpUlang" type="button">Ulangi</button>`); $("lpUlang").addEventListener("click", muat); return; }
  saya = r.data; layar = "beranda"; gambar();
}

pasangTema();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/petugas/sw.js").catch(() => {});
if (!kode) kosong("Buka tautan pribadimu", "Buka tautan pribadi yang dikirim lewat WA. Tautannya berakhiran #k= lalu kode panjang.");
else muat();
pasangDummy(true);
