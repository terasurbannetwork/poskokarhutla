/* SIPPA: enam keadaan standar tiap layar (PRD §9.2.1, DS §3.0). Satu-satunya tempat kalimat keadaan ditulis.
   Fungsi mengembalikan elemen; teks selalu lewat textContent, tidak pernah markup mentah. */

const buat = (tag, kelas, teks, atribut = {}) => {
  const e = document.createElement(tag);
  e.className = kelas;
  if (teks != null) e.textContent = teks;
  for (const [k, v] of Object.entries(atribut)) e.setAttribute(k, v);
  return e;
};
/* waktu WIB: jamWIB milik public/inti/format.js bila dimuat, selain itu padanannya (uji Node) */
export const waktu = ms => typeof jamWIB === "function" ? jamWIB(ms)
  : new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";

export const memuat = () => buat("div", "sp-kerangka", null, {"aria-busy": "true", "aria-label": "Memuat"});

export const kosong = teks => buat("p", "ad-kosong", teks);

const KALIMAT_GALAT = {403: "Akunmu tidak punya akses ke data ini", 503: "Migrasi SIPPA belum diterapkan di basis data"};
export function galat(status, pesan, ulang) {
  const e = buat("div", "ad-galat", null, {role: "alert"});
  const kalimat = KALIMAT_GALAT[status] || pesan || "Data tidak bisa dimuat";
  e.append(buat("span", "", kalimat));
  /* kode HTTP sekali saja: bila pesan sudah menyebutnya, jangan diulang */
  if (status > 0 && !String(kalimat).includes(String(status))) e.append(buat("span", "sp-kode", ` (kode ${status})`));
  if (ulang) {
    const t = buat("button", "ad-tombol", "Coba lagi", {type: "button"});
    t.addEventListener("click", ulang);
    e.append(t);
  }
  return e;
}

export const luring = per => buat("div", "ad-spanduk", per == null ? "Luring. Belum ada data tersimpan." : `Luring. Menampilkan data terakhir per ${waktu(per)}.`, {role: "status"});

const tanggal = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
export const basi = per => buat("span", "sp-yakin asumsi-kebijakan", `basi, per ${tanggal(per)}`);

export function menunggu(alasan) {
  const e = buat("span", "sp-menunggu");
  e.append(buat("b", "", "–"), buat("span", "sp-yakin menunggu", "Menunggu"), buat("small", "", alasan));
  return e;
}
