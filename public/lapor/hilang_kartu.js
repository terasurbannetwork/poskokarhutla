/* Orang hilang publik, bagian layar bersama (data/kajian-bnpb/orang-hilang-publik, OH-09, OH-11): kartu profil publik, formulir kirim informasi,
   dan pengecil foto. Dipakai hilang.js (daftar), hilang_satu.js (satu profil), meja_hilang.js (pratinjau petugas), dan hilang_chat.js.
   Semua teks dari data lewat textContent. Kartu publik hanya memuat bidang daftar putih profilPublik (tanpa nomor, alamat, titik).
   Kosong tidak pernah jadi 0: "belum diketahui" tampil apa adanya. */

const NS = "http://www.w3.org/2000/svg";
export const IKON = {
  orang: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
  titik: '<path d="M12 21s6-5.6 6-10.5a6 6 0 0 0-12 0C6 15.4 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2"/>',
  pesan: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
  bendera: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
  centang: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  turun: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>',
  kamera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};
export function ikon(nama) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "oh-ik");
  s.innerHTML = IKON[nama] ?? "";   // konstanta di berkas ini, bukan data pengguna
  return s;
}
export function el(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks != null) e.textContent = teks;
  return e;
}

const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const KOSONG = "belum diketahui";
export const tanggalPendek = iso => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso ?? ""); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : KOSONG; };
const JENIS = {banjir: "Banjir", cuaca: "Cuaca ekstrem", gelombang: "Gelombang tinggi", gempa: "Gempa bumi", gunungapi: "Gunung api", karhutla: "Kebakaran hutan dan lahan",
  kebakaran_permukiman: "Kebakaran permukiman", kekeringan: "Kekeringan", longsor: "Tanah longsor", tsunami: "Tsunami"};
export const namaJenis = j => JENIS[j] ?? String(j ?? "").replace(/_/g, " ");

/* Perilaku satu pil status: teks selalu ada (tidak mengandalkan warna), lihat DESIGN-SYSTEM aturan 9 */
/* kerja berat sesudah chrome tergambar: dua rAF (pola lapor.js) */
export const nanti = f => requestAnimationFrame(() => requestAnimationFrame(f));
export const pilStatus = (teks, nada = "") => el("span", `oh-pil ${nada}`.trim(), teks);

/* ---- kartu profil publik ----
   p: keluaran profilPublik. opsi: {pratinjau, tautan (bool, nama jadi tautan ke /lapor/h/<id>), aksi (bool, tombol kaki), status ("tayang" | "turun" | "menunggu")} */
export function kartuProfil(p, opsi = {}) {
  const anak = !Array.isArray(p.foto) && p.umur !== undefined && p.kelamin === undefined, k = el("article", `oh-profil${anak ? " anak" : ""}${opsi.status === "turun" ? " turun" : ""}`);
  const foto = el("div", "oh-foto"), url = !anak && Array.isArray(p.foto) && /^\/api\/lapor\/hilang\/foto\/[0-9a-f]{32}$/.test(p.foto[0]) ? p.foto[0] : null;   // hanya rute foto Worker
  if (url) {
    const im = Object.assign(el("img"), {src: url, alt: `Foto ${p.panggilan || p.nama || "orang yang dicari"}, umur ${p.umur}`, loading: "lazy", decoding: "async", draggable: false, width: 160, height: 200});
    im.addEventListener("contextmenu", e => e.preventDefault());
    foto.append(im);
  } else {
    foto.classList.add("kosong"); foto.append(ikon("orang"), el("small", null, anak ? "Foto tidak ditampilkan" : "Belum ada foto"));
  }
  const isi = el("div", "oh-isi"), kepala = el("div", "oh-kepala");
  kepala.append(pilStatus(opsi.status === "menunggu" ? "Menunggu peninjauan" : opsi.status === "turun" ? "Sudah turun" : "Masih dicari", opsi.status === "turun" ? "redup" : opsi.status === "menunggu" ? "tunggu" : "cari"));
  const nama = p.nama || "Nama belum diketahui", h = el("h2", "oh-nama");
  if (opsi.tautan && p.id) h.append(Object.assign(el("a", null, nama), {href: `/lapor/h/${p.id}`})); else h.textContent = nama;
  const baris = el("dl", "oh-data"), tambah = (t, v) => { if (v != null && v !== "") { baris.append(el("dt", null, t), el("dd", null, String(v))); } };
  tambah("Panggilan", p.panggilan);
  tambah(anak ? "Kelompok umur" : "Umur", anak ? p.umur : (p.umur === KOSONG ? KOSONG : `${p.umur} tahun`));
  if (!anak) { tambah("Jenis kelamin", p.kelamin); tambah("Tinggi", p.tinggi === KOSONG ? KOSONG : `${p.tinggi} cm`); }
  tambah("Pakaian", p.pakaian); if (p.ciri) tambah("Ciri lain", p.ciri);
  const terlihat = el("p", "oh-terlihat");
  terlihat.append(ikon("titik"), p.lokasi && p.lokasi !== KOSONG ? `Terakhir terlihat di ${p.lokasi}, ${tanggalPendek(p.waktu)}.` : `Tempat terakhir terlihat belum diketahui. Tanggal ${tanggalPendek(p.waktu)}.`);
  isi.append(kepala, h, baris, terlihat);
  if (p.kejadian?.jenis) isi.append(el("p", "oh-kejadian", `Hilang karena ${namaJenis(p.kejadian.jenis).toLowerCase()}${p.kejadian.kab ? ` di ${p.kejadian.kab}` : ""}, ${tanggalPendek(p.kejadian.mulai)}.`));
  k.append(foto, isi);
  if (opsi.aksi && p.id) k.append(kakiKartu(p));
  return k;
}

/* ---- kaki kartu: tiga tautan; formulir dalam <dialog> modal bawaan (Esc dan gestur kembali menutup, fokus kembali ke pemicu) ---- */
const API = "/api/lapor/hilang";
export async function kirimInfo(badan) {
  try {
    const r = await fetch(`${API}/info`, {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan), signal: AbortSignal.timeout(20000)});
    return {s: r.status, j: await r.json().catch(() => ({}))};
  } catch { return {s: 0, j: {}}; }
}
const GALAT = {0: "Sambungan terputus. Coba lagi.", 401: "Untuk mengirim informasi, masuk dulu dengan kode WhatsApp.", 404: "Profil ini sudah tidak tampil.", 429: "Terlalu sering mengirim. Coba lagi nanti."};
export const teksGalat = (s, pesan) => GALAT[s] || (pesan ? String(pesan).slice(0, 160) : "Belum terkirim. Coba lagi.");

function formulir({judul, ket, isian, kirimTeks, badan, pemicu}) {
  const d = el("dialog", "oh-dlg"), h = el("h1", null, judul), f = el("form", "oh-form"), pesan = el("p", "oh-pesan"), aksi = el("div", "oh-aksi-dua");
  h.id = `oh-dlg-${Math.random().toString(36).slice(2, 8)}`; d.setAttribute("aria-labelledby", h.id); d.setAttribute("closedby", "any");
  pesan.setAttribute("role", "status");
  const kolom = isian.map(x => {
    const l = el("label", "oh-isi-baris"); l.append(el("span", null, x.label));
    const c = x.pilihan ? el("select") : el("textarea");
    if (x.pilihan) for (const [v, t] of x.pilihan) c.append(Object.assign(el("option", null, t), {value: v}));
    else Object.assign(c, {rows: 4, maxLength: 480, placeholder: x.petunjuk || ""});
    c.name = x.nama; if (x.wajib) c.required = true; l.append(c); return l;
  });
  const batal = el("button", "oh-tombol", "Tutup"); batal.type = "button"; batal.addEventListener("click", () => d.close());
  const kirim = el("button", "oh-tombol", kirimTeks); kirim.type = "submit";
  aksi.append(batal, kirim);
  f.append(...kolom, pesan, aksi); d.append(h, el("p", "oh-ket", ket), f);
  f.addEventListener("submit", async e => {
    e.preventDefault();
    kirim.disabled = true; kirim.textContent = "Mengirim"; pesan.textContent = "";   // chrome berubah seketika, kirim sesudahnya
    const data = Object.fromEntries(new FormData(f)), r = await kirimInfo({...badan, ...data});
    if (r.s === 200) {
      f.replaceChildren(el("p", "oh-pesan ok", "Pesan Anda sudah diterima. Petugas membacanya dan memeriksa dulu."), el("p", "oh-ket", r.j.rujukan || ""), batal);
      batal.textContent = "Selesai"; batal.autofocus = true; batal.focus(); return;
    }
    kirim.disabled = false; kirim.textContent = kirimTeks;
    pesan.replaceChildren(teksGalat(r.s, r.j.galat), ...(r.s === 401 ? [" ", Object.assign(el("a", null, "Masuk"), {href: "/masuk"})] : []));
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d); d.showModal(); (kolom[0]?.querySelector("select,textarea") ?? batal).focus({preventScroll: true});
  return d;
}

function kakiKartu(p) {
  const kaki = el("footer", "oh-kaki"), info = el("button", "oh-info", "Saya punya informasi"), lapor = el("button", "oh-laporkan", "Laporkan profil ini"), saya = el("button", "oh-bukan-saya", "Saya orang ini, mohon turunkan");
  for (const b of [info, lapor, saya]) b.type = "button";
  info.prepend(ikon("pesan")); lapor.prepend(ikon("bendera"));
  info.addEventListener("click", () => formulir({judul: "Saya punya informasi", ket: "Pesan Anda dibaca petugas, lalu diteruskan ke keluarga. Nomor Anda tidak dibagikan.", kirimTeks: "Kirim informasi", badan: {jenis: "informasi", token: p.id},
    isian: [{nama: "pesan", label: "Yang Anda ketahui", petunjuk: "Misalnya di mana dan kapan Anda melihatnya.", wajib: true}]}));
  lapor.addEventListener("click", () => formulir({judul: "Laporkan profil ini", ket: "Petugas memeriksa profil yang dilaporkan.", kirimTeks: "Kirim laporan", badan: {jenis: "laporkan", token: p.id},
    isian: [{nama: "alasan", label: "Alasan", pilihan: [["data_salah", "Datanya salah"], ["tidak_ingin_ditemukan", "Orang ini tidak ingin ditemukan"], ["penipuan", "Tampak seperti penipuan"], ["lainnya", "Alasan lain"]]},
      {nama: "pesan", label: "Keterangan, boleh dikosongkan", petunjuk: ""}]}));
  saya.addEventListener("click", () => formulir({judul: "Saya orang ini", ket: "Tulis pesan singkat bila perlu. Petugas memeriksa pesan ini dan menurunkan profil bila benar.", kirimTeks: "Kirim pesan", badan: {jenis: "orang_ini", token: p.id},
    isian: [{nama: "pesan", label: "Pesan singkat, boleh dikosongkan", petunjuk: ""}]}));
  kaki.append(info, lapor, saya);
  return kaki;
}

/* ---- pengecil foto publik: sisi panjang 800 px, JPEG, tanpa metadata (kanvas menulis ulang piksel; EXIF, XMP, dan profil warna tidak ikut).
   Batas server 300 KB; kualitas turun bertahap. Orientasi EXIF diterapkan peramban saat membaca (imageOrientation bawaan "from-image"). null = tidak terbaca. ---- */
/* kanvas kadang menulis profil warna (APP2); Worker menolak semua APPn selain JFIF dan komentar, jadi segmennya dibuang di sini sebelum dikirim */
function bersihkanJpeg(u8) {
  if (u8[0] !== 0xff || u8[1] !== 0xd8) return null;
  const bagian = [u8.subarray(0, 2)]; let i = 2;
  while (i + 4 <= u8.length && u8[i] === 0xff && u8[i + 1] !== 0xda) {
    const m = u8[i + 1], n = 2 + (u8[i + 2] << 8 | u8[i + 3]);
    if (!(m >= 0xe1 && m <= 0xef || m === 0xfe)) bagian.push(u8.subarray(i, i + n));
    i += n;
  }
  bagian.push(u8.subarray(i));
  return new Blob(bagian, {type: "image/jpeg"});
}
export async function kecilkanFoto(file, sisi = 800, maks = 300 * 1024) {
  if (!file) return null;
  try {
    const bmp = await createImageBitmap(file, {resizeWidth: sisi, resizeQuality: "medium"}), s = Math.min(1, sisi / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    for (const q of [0.8, 0.7, 0.6, 0.5]) {
      const b = await new Promise(ok => c.toBlob(ok, "image/jpeg", q)), bersih = b && bersihkanJpeg(new Uint8Array(await b.arrayBuffer()));
      if (bersih && bersih.size <= maks) return bersih;
    }
  } catch { /* tidak terbaca */ }
  return null;
}
