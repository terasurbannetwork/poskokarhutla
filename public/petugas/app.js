/* Layar petugas /petugas. L1 Beranda, L2 Persetujuan di berkas ini; L3 L4 di layar_kamera.js, L5 L6 di layar_logbook.js (dimuat saat dibuka, bukan saat beranda).
   Kode pribadi hanya di sessionStorage dan header x-kode. Data API tidak disimpan. */
import {$, esc, api, ambilKode, pasangTema, pasangDummy, nanti} from "./umum.js";
import {statusWajah, labelJenis, pesanGalat, jarakM, teksJarak, tautanAman, pilihTugas, langkahAbsen, keMs} from "./murni.js";
import {teksJam} from "./stempel.js";
import {hitungAntre, kirimTertunda, isiNonceLuring} from "./luring.js";
import {satuTitik} from "./gps.js";
import {ik} from "./ikon.js";

const isi = $("lpIsi");
let kode = ambilKode(), ketua = null, saya = null, layar = "beranda", info = "", bersih = null, tugasId = null;

const tampil = h => { isi.innerHTML = h; };
const kosong = (judul, teks, aksi = "") => tampil(`<section class="lp-kartu lp-kosong"><h2>${esc(judul)}</h2><p>${esc(teks)}</p>${aksi}</section>`);
const infoHtml = () => info ? `<p class="lp-kartu" role="status">${esc(info)}</p>` : "";
const offsetMenit = () => -new Date().getTimezoneOffset();

const ctx = {
  tampil, infoHtml, pindah,
  get kode() { return kode; }, get saya() { return saya; }, get tugasId() { return tugasId; },
  pasangBersih: f => { bersih = f; },
};

/* ---------- L1 Beranda ---------- */
const labelStatus = s => s === "lolos" || s === "sah" ? "hijau" : s === "tolak" ? "merah" : "kuning";
const teksStatus = (a, off) => a ? `${teksJam(keMs(a.waktu), off)}${a.status === "tinjau" ? ", menunggu tinjauan" : a.status === "tolak" ? ", ditolak" : ""}` : "belum";

let praMuat = false;
function beranda() {
  const o = saya.orang, w = statusWajah(o.wajah_status), tugas = saya.tugas || [], t = pilihTugas(tugas, tugasId), hi = saya.hari_ini || {}, off = offsetMenit();
  const langkah = langkahAbsen(hi), lb = hi.logbook, aktif = w.daftar && !!t;
  const alasanMati = !t ? "Belum ada tugas hari ini" : !w.daftar ? "Daftar wajah dulu" : "";
  tampil(`${infoHtml()}<p class="lp-pita" id="lpPita" role="status" hidden></p>
  <section class="lp-kartu"><div class="lp-nama">${esc(o.nama)}</div>
    <p class="lp-kecil">${esc([o.unit, o.jabatan].filter(Boolean).join(", ") || "Unit belum diisi")}</p>
    <div class="lp-baris"><span class="lp-pil">${esc(labelJenis(o.jenis))}</span><span class="lp-pil ${w.kelas}">Wajah: ${esc(w.label)}</span></div>
    ${w.daftar ? `<button class="lp-tautan" id="lpDaftar" type="button">Daftar ulang wajah</button>` : `<button class="lp-tbl utama" id="lpDaftar" type="button">${ik("orang")}Daftar wajah</button>`}
  </section>
  <section class="lp-kartu"><h2>Tugas hari ini</h2>
    ${tugas.length > 1 ? `<div class="lp-chips" role="radiogroup" aria-label="Pilih tugas" data-n="${tugas.length}">${tugas.map(x => `<label class="lp-chip"><input type="radio" name="tugas" value="${esc(x.id)}" ${x.id === t.id ? "checked" : ""}><span>${esc(x.judul || "Tugas")}</span></label>`).join("")}</div>` : ""}
    ${t ? `<div class="lp-tugas"><b>${esc(t.judul || "Tugas")}</b><span class="lp-kecil">${ik("pin", 16)}${esc(t.wilayah_teks || "Wilayah belum diisi")}</span>
      <span class="lp-kecil" id="lpJarak"></span>
      <div class="lp-baris"><button class="lp-tbl" id="lpCekJarak" type="button">${ik("pin", 18)}Cek jarak dari posisiku</button>${tautanAman(t.renlap_url) ? `<a class="lp-tbl" href="${esc(tautanAman(t.renlap_url))}" target="_blank" rel="noopener noreferrer">${ik("buku", 18)}Buka Renlap</a>` : ""}</div></div>`
      : `<p class="lp-kecil">Belum ada tugas hari ini</p>`}
  </section>
  <section class="lp-kartu"><h2>Hari ini</h2>
    <div class="lp-baris"><span class="lp-pil ${hi.absen_masuk ? labelStatus(hi.absen_masuk.status) : "abu"}">Masuk: ${esc(teksStatus(hi.absen_masuk, off))}</span><span class="lp-pil ${hi.absen_pulang ? labelStatus(hi.absen_pulang.status) : "abu"}">Pulang: ${esc(teksStatus(hi.absen_pulang, off))}</span>
    <span class="lp-pil ${lb ? (lb.terkunci ? "abu" : "hijau") : "abu"}">Logbook: ${lb ? (lb.terkunci ? "terkunci" : "terisi") : "belum"}</span></div>
  </section>
  <section class="lp-dua">
    <button class="lp-tbl besar utama" id="lpAbsen" type="button" ${aktif && langkah ? "" : "disabled"}>${ik("kamera")}${langkah === "pulang" ? "Absen pulang" : langkah === "masuk" ? "Absen masuk" : "Absen hari ini selesai"}</button>
    <button class="lp-tbl besar" id="lpLogbook" type="button" ${t && !lb?.terkunci ? "" : "disabled"}>${ik("buku")}${lb ? (lb.terkunci ? "Logbook terkunci" : "Perbarui logbook") : "Isi logbook"}</button>
  </section>
  ${alasanMati ? `<p class="lp-kecil">${esc(alasanMati)}.</p>` : ""}
  <button class="lp-tbl" id="lpRegu" type="button" hidden>${ik("orang")}Pantau regu</button>
  <button class="lp-tautan" id="lpRiwayat" type="button">Lihat riwayat 14 hari</button>`);
  $("lpRegu").addEventListener("click", () => pindah("regu"));
  cekKetua();
  $("lpDaftar").addEventListener("click", () => pindah("setuju"));
  $("lpAbsen").addEventListener("click", () => pindah(langkah));
  $("lpLogbook").addEventListener("click", () => pindah("logbook"));
  $("lpRiwayat").addEventListener("click", () => pindah("riwayat"));
  isi.querySelectorAll('input[name="tugas"]').forEach(r => r.addEventListener("change", () => { tugasId = r.value; nanti(beranda); }));
  $("lpCekJarak")?.addEventListener("click", () => cekJarak(t));
  perbaruiPita();
  if (aktif && !praMuat) { praMuat = true; import("./antispoof.js").then(m => m.praMuatAntispoof()).catch(() => {}); }   // sekali, saat idle
  /* izin lokasi sudah diberikan: hitung jarak tanpa menunggu klik */
  navigator.permissions?.query({name: "geolocation"}).then(p => { if (p.state === "granted" && $("lpCekJarak")?.isConnected) cekJarak(t); }).catch(() => {});
}

/* ketua regu = panel/ringkas dengan x-kode menjawab 200 (staf/ketua), selain itu 401/403. Dicek sekali per muat; tombol hanya dimunculkan. */
function cekKetua() {
  const tampilTombol = () => { const b = $("lpRegu"); if (b) b.hidden = !ketua; };
  if (ketua !== null) return tampilTombol();
  nanti(async () => { const r = await api("/api/petugas/panel/ringkas", {kode}); if (r.ok || r.status === 401 || r.status === 403) ketua = r.ok; tampilTombol(); });
}

function cekJarak(t) {
  const b = $("lpCekJarak"), el = $("lpJarak"); if (!b || !t) return;
  b.disabled = true; el.textContent = "Mencari lokasi...";
  nanti(async () => {
    try {
      const p = await satuTitik({tinggi: false, usiaMs: 60000, batasMs: 10000});
      if (!el.isConnected) return;
      el.textContent = `Jarak dari kamu ke titik tugas: ${teksJarak(jarakM(p.lat, p.lon, t.lat, t.lon))}, radius ${teksJarak(t.radius_m)}`;
      b.hidden = true;
    } catch (e) { if (el.isConnected) { el.textContent = e.message; b.disabled = false; } }
  });
}

/* pita antrean luring: tampil bila tanpa sinyal atau masih ada absen tersimpan */
async function perbaruiPita() {
  const el = $("lpPita"); if (!el) return;
  const n = await hitungAntre();
  if (!el.isConnected) return;
  el.hidden = navigator.onLine && !n;
  el.textContent = n ? `Tersimpan di HP, terkirim saat ada sinyal. ${n} absen menunggu.` : "Tanpa sinyal. Absen tetap bisa dilakukan dan terkirim saat ada sinyal.";
}

/* ---------- L2 Persetujuan ---------- */
function persetujuan() {
  const s = saya.setuju, sudah = saya.orang.setuju_versi != null && saya.orang.setuju_versi === s.versi;
  tampil(`${infoHtml()}<section class="lp-kartu"><h2>Persetujuan data wajah</h2>
    ${String(s.teks || "").split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join("")}
    ${sudah ? `<p class="lp-pil hijau" role="status">Persetujuan tersimpan</p>
      <button class="lp-tbl utama" id="lpMulai" type="button">${ik("orang")}Mulai daftar wajah</button>
      <button class="lp-tautan" id="lpCabut" type="button">Cabut persetujuan</button>`
    : `<label class="lp-centang"><input type="checkbox" id="lpCek"><span>Aku sudah membaca dan setuju datanya disimpan seperti di atas.</span></label>
      <div class="lp-dua"><button class="lp-tbl utama" id="lpSetuju" type="button" disabled>Setuju</button><button class="lp-tbl" id="lpTolak" type="button">Tolak</button></div>`}
    <button class="lp-tautan" id="lpKembali" type="button">Kembali ke beranda</button>
  </section>`);
  $("lpKembali").addEventListener("click", () => pindah("beranda"));
  $("lpMulai")?.addEventListener("click", () => pindah("daftar"));
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
    if (!setuju) saya.orang.wajah_status = saya.orang.wajah_status === "terdaftar" ? "dihapus" : saya.orang.wajah_status;
    info = setuju ? "" : "Persetujuan dicabut. Data wajahmu dihapus. Kamu tetap bisa absen, tetapi tiap absenmu diperiksa petugas.";
    layar = setuju ? "setuju" : "beranda"; gambar();
  });
}

/* ---------- router ---------- */
const MODUL = {
  daftar: async () => (await import("./layar_kamera.js")).layarDaftar(ctx),
  masuk: async () => (await import("./layar_kamera.js")).layarAbsen(ctx, "masuk"),
  pulang: async () => (await import("./layar_kamera.js")).layarAbsen(ctx, "pulang"),
  logbook: async () => (await import("./layar_logbook.js")).layarLogbook(ctx),
  riwayat: async () => (await import("./layar_logbook.js")).layarRiwayat(ctx),
  regu: async () => (await import("./layar_regu.js")).layarRegu(ctx),
};
const DARI_TUGAS = new Set(["daftar", "masuk", "pulang", "logbook"]);

function gambar() {
  bersih?.(); bersih = null;
  if (layar === "setuju") persetujuan();
  else if (Object.hasOwn(MODUL, layar)) {
    tampil(`<div class="lp-kartu lp-rangka" aria-busy="true"><i></i><i></i><i></i></div>`);
    const ini = layar;
    MODUL[ini]().catch(() => {
      if (layar !== ini) return;
      kosong("Layar belum bisa dibuka", "Periksa sinyal lalu ulangi.", `<button class="lp-tbl utama" id="lpUlang" type="button">Ulangi</button>`);
      $("lpUlang").addEventListener("click", () => pindah(ini));
    });
  } else beranda();
  window.scrollTo(0, 0);
}

function pindah(ke, pesan = "") {
  const dari = layar; layar = ke; info = pesan;
  /* sesudah absen/logbook/daftar, beranda membaca ulang status hari ini dari server */
  if (ke === "beranda" && DARI_TUGAS.has(dari)) { bersih?.(); bersih = null; muat(); return; }
  gambar();
}

async function muat() {
  tampil(`<div class="lp-kartu lp-rangka" aria-busy="true"><i></i><i></i><i></i></div>`);
  const r = await api("/api/petugas/saya", {kode});
  if (r.status === 401) return kosong("Tautan tidak dikenali", pesanGalat(401));
  if (!r.ok) {
    if (saya) { layar = "beranda"; info = pesanGalat(r.status); gambar(); return; }   // sudah pernah termuat (mis. tanpa sinyal): pakai data terakhir
    kosong("Belum bisa dibuka", pesanGalat(r.status), `<button class="lp-tbl utama" id="lpUlang" type="button">Ulangi</button>`); $("lpUlang").addEventListener("click", muat); return;
  }
  saya = r.data; layar = "beranda";
  gambar();
  tertunda();
}

/* kirim absen yang tersimpan, lalu lengkapi simpanan nonce luring */
async function tertunda() {
  if (!kode || !navigator.onLine) return;
  const h = await kirimTertunda(kode);
  if (h.terkirim.length && layar === "beranda") { info = `${h.terkirim.length} absen yang tersimpan sudah terkirim.`; muat(); }
  else if (h.ditolak.length && layar === "beranda") { info = `${h.ditolak.length} absen tersimpan ditolak server. Ulangi absennya bila perlu.`; gambar(); }
  isiNonceLuring(kode);
}

pasangTema();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/petugas/sw.js").catch(() => {});
window.addEventListener("online", () => { perbaruiPita(); tertunda(); });
window.addEventListener("offline", perbaruiPita);
if (!kode) kosong("Buka tautan pribadimu", "Buka tautan pribadi yang dikirim lewat WA. Tautannya berakhiran #k= lalu kode panjang.");
else muat();
pasangDummy(true);
