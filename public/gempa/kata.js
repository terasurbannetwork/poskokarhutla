"use strict";
/* Kosakata gempa (COPYWRITING.md §5 kolom gempa): satu tempat, dipakai peta dan modul berikutnya.
   Dua kosakata terpisah: (A) status tsunami resmi BMKG (TSUNAMI) dan (B) bentuk gempa (kekuatan, kedalaman). */
const mTulis = m => "M " + Number(m).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
/* kelas kekuatan: warna pil (A3) dan batas; teks pil memakai warna tegas supaya terbaca di latar putih */
const KELAS_M = [[7, "#c9503a"], [6, "#d4702a"], [5, "#a8780c"], [0, "#3f6fa8"]];
const warnaM = m => (KELAS_M.find(k => m >= k[0]) || KELAS_M[3])[1];
const pilM = m => `<span class="pill pm" style="--w:${warnaM(m)}">${mTulis(m)}</span>`;
/* kedalaman: dangkal < 60 km, menengah 60 sampai 300, dalam > 300 */
const KELAS_DALAM = [["Dangkal", "#d4572f", "< 60 km"], ["Menengah", "#e8a33c", "60 sampai 300 km"], ["Dalam", "#3a5fa8", "> 300 km"]];
const WARNA_DALAM_NA = "#9aa8b8";
const kelasDalam = d => d == null ? -1 : d < 60 ? 0 : d <= 300 ? 1 : 2;
/* status tsunami resmi: kode dari BMKG (src/gempa.js); null = BMKG tidak menyebut tsunami, bukan "aman" */
const TSUNAMI = {1: ["Tsunami Waspada", "#e0b400"], 2: ["Tsunami Siaga", "#e8743b"], 3: ["Tsunami Awas", "#d64545"]};
/* teks wilayah BMKG "Pusat gempa berada di darat 21 km Barat Daya Kota Bogor" -> "Darat 21 km Barat Daya Kota Bogor" */
const wilayahPendek = t => { const s = String(t || "").replace(/^Pusat gempa berada di\s*/i, "").trim(); return s ? s[0].toUpperCase() + s.slice(1) : "Perairan Indonesia"; };
const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
/* waktu gempa: "12 Okt 04.34 WIB" (jamWIB dari inti/format.js) */
const waktuGempa = iso => jamWIB(iso);
