/* Fungsi murni tab Besok /prediksi (level per kolom) dipakai ulang di Worker supaya angka chat Lapor sama dengan halaman /prediksi.
   Urutan impor penting: lapor_window.js lebih dulu. ponytail: `window` dipasang lalu dibuang; ganti besok_inti.js menjadi modul ES bila pengerja layar menyentuhnya. */
import "./lapor_window.js";
import "../public/prediksi/besok_inti.js";
export const Besok = globalThis.window.Besok;
delete globalThis.window;
