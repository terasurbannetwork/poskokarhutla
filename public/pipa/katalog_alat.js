/* SIPPA: katalog alat berfoto (SP-113, keputusan 50: kelas kinerja, tanpa merek; merek hanya di kolom rujukan). Teks antarmuka, bukan data lapangan.
   Isi disalin dari scripts/data/sippa/pilot/lampiran.py (ALAT) lewat src/uji_pilot_data.js; foto Wikimedia Commons berlisensi bebas di /pipa/uji_pilot/img/, kredit wajib tampil di kartu.
   Bila isi lampiran.py berubah, salin ulang daftar ini. */
export const ALAT = [
 {
 "kunci": "pompa",
 "nama": "Pompa portabel",
 "fungsi": "Mengisap air dari parit, kanal, atau sungai dan mendorongnya lewat selang ke petak.",
 "spek": [
 "1.000–1.300 liter/menit pada 6–8 bar (yang ada di Daops, BPBD)",
 "Kit SIPPA berikutnya: 1.500 liter/menit pada 10 bar, atau setara",
 "Bensin RON 91 atau lebih, ± 2–5 liter per jam",
 "Isap 3 inci, keluar 2,5 inci; dipikul 2–4 orang"
 ],
 "jumlah": "1; selang panjang tambah 1–2 pompa",
 "foto": "/pipa/uji_pilot/img/alat_pompa.jpg",
 "artis": "TeWeBs",
 "lisensi": "CC BY-SA 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Funchal_Portable_Fire_Pump.JPG"
 },
 {
 "kunci": "isap",
 "nama": "Selang isap dengan saringan",
 "fungsi": "Menghubungkan pompa ke air tanpa menyedot lumpur dan sampah.",
 "spek": [
 "Selang isap 3 inci, dinding kaku tidak kempis, panjang 3 m",
 "Saringan kasar lubang ± 5 mm",
 "Katup kaki satu arah supaya air tidak turun saat pompa berhenti",
 "Pompa paling tinggi 3,5 m di atas permukaan air"
 ],
 "jumlah": "1 set per pompa",
 "foto": "/pipa/uji_pilot/img/alat_isap.jpg",
 "artis": "Jonathan Clemens (Jclemens (talk))",
 "lisensi": "CC BY-SA 3.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Hard_suction_end_med_strainer.jpg"
 },
 {
 "kunci": "layflat",
 "nama": "Selang layflat 2,5 inci",
 "fungsi": "Mengalirkan air dari pompa ke petak; satu jalur saja.",
 "spek": [
 "Diameter dalam 65 mm (2,5 inci), lapis karet atau nitril",
 "Tekanan kerja 16 bar atau lebih, diuji 1,5 kali tekanan kerja",
 "20 m per gulung, ± 8 kg per gulung",
 "Kopling Storz 65 dengan karet perapat, pasang tanpa baut"
 ],
 "jumlah": "Sesuai panjang jalur, termasuk 2 gulung cadangan (lihat tabel tiap lokasi)",
 "foto": "/pipa/uji_pilot/img/alat_layflat.jpg",
 "artis": "lihat halaman Commons",
 "lisensi": "CC BY-SA 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Fire_hose_supply.jpg"
 },
 {
 "kunci": "ypembagi",
 "nama": "Y-pembagi berkatup",
 "fungsi": "Membagi satu selang menjadi dua cabang: ke lance dan ke nozzle.",
 "spek": [
 "Masuk 2,5 inci Storz, keluar 2 × 1,5 inci",
 "Katup di tiap cabang untuk membuka dan menutup sendiri-sendiri",
 "Tekanan kerja 16 bar atau lebih",
 "Dipasang ± 15 m sebelum petak"
 ],
 "jumlah": "1",
 "foto": "/pipa/uji_pilot/img/alat_ypembagi.jpg",
 "artis": "Jebulon",
 "lisensi": "CC0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Incendie_h%C3%B4tel_Lambert_d%C3%A9doubleur_tuyaux_pompiers.jpg"
 },
 {
 "kunci": "lance",
 "nama": "Lance injeksi",
 "fungsi": "Ditusukkan ke gambut untuk menyuntik air langsung ke bara di bawah permukaan.",
 "spek": [
 "Pipa baja tahan karat SS316 atau galvanis, 1,5 inci, panjang 1,5 m",
 "Ujung runcing berlubang; ukuran lubang final dari uji bengkel (contoh 8 lubang 2–2,5 mm)",
 "Katup bola dan pengukur tekanan di kepala lance",
 "Debit 15–40 liter/menit pada 2–4 bar"
 ],
 "jumlah": "2 untuk pilot, boleh sampai 8",
 "foto": "/pipa/uji_pilot/img/alat_lance.jpg",
 "artis": "Murer-Feuerschutz",
 "lisensi": "CC BY-SA 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:00_Brandbek%C3%A4mpfung_mit_der_E-L%C3%B6schlanze_bei_einem_Fahrzeugbrand_03.jpg"
 },
 {
 "kunci": "nozzle",
 "nama": "Nozzle semprot",
 "fungsi": "Menyemprot permukaan di petak pembanding (cara biasa).",
 "spek": [
 "Nozzle 1,5 inci, bisa diatur pancar lurus atau kabut",
 "Debit bisa diatur; catat menit dan setelan selama menyemprot",
 "Tekanan kerja sama dengan selang cabang"
 ],
 "jumlah": "1",
 "foto": "/pipa/uji_pilot/img/alat_nozzle.jpg",
 "artis": "Jonathan Clemens (Jclemens (talk))",
 "lisensi": "CC BY-SA 3.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Fire_hose_nozzle_crosslay.jpg"
 },
 {
 "kunci": "manometer",
 "nama": "Pengukur tekanan (manometer)",
 "fungsi": "Membaca tekanan air di pompa dan di kepala lance.",
 "spek": [
 "Rentang 0–10 bar, jarum berisi gliserin (tahan getar)",
 "Ulir 1/4 inci, dipasang di keluaran pompa dan di kepala lance",
 "Dibaca dan dicatat tiap 10 menit"
 ],
 "jumlah": "1 di pompa, 1 di tiap lance",
 "foto": "/pipa/uji_pilot/img/alat_manometer.jpg",
 "artis": "Eng.dilan86",
 "lisensi": "CC BY-SA 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Bar_gauge.jpg"
 },
 {
 "kunci": "termometer",
 "nama": "Termometer tusuk gambut",
 "fungsi": "Mengukur suhu tanah gambut untuk tahu bara masih menyala atau sudah padam.",
 "spek": [
 "Sensor termokopel tipe K, layar digital",
 "Batang tusuk baja tahan karat, panjang 1 m atau lebih, bertanda 10, 30, 50, 100 cm",
 "Rentang sampai 400 °C atau lebih, ketelitian ± 2 °C",
 "Padam bila semua titik di bawah 40 °C"
 ],
 "jumlah": "2",
 "foto": "/pipa/uji_pilot/img/alat_termometer.jpg",
 "artis": "Harke",
 "lisensi": "CC BY-SA 3.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Thermoelement-Thermometer_Omega_(1).jpg"
 },
 {
 "kunci": "bor",
 "nama": "Bor gambut",
 "fungsi": "Mengambil contoh tanah untuk mengukur tebal gambut di tiap petak.",
 "spek": [
 "Tabung setengah silinder untuk contoh gambut tidak teraduk",
 "Batang sambung 1 m, bisa disambung sampai 5–6 m",
 "Gagang T untuk diputar dengan tangan"
 ],
 "jumlah": "1",
 "foto": "/pipa/uji_pilot/img/alat_bor.jpg",
 "artis": "USDAgov",
 "lisensi": "Public domain",
 "halaman": "https://commons.wikimedia.org/wiki/File:20170413-RT-NRCS-001_jog.jpg"
 },
 {
 "kunci": "meteran",
 "nama": "Meteran, patok, dan tali",
 "fungsi": "Memasang 4 petak 10 × 10 m dan menandai titik ukur suhu.",
 "spek": [
 "Meteran gulung 50 m bahan fiberglass",
 "16 patok kayu atau PVC ± 1 m, diberi nomor",
 "Tali rafia untuk batas petak"
 ],
 "jumlah": "1 meteran, 16 patok, 1 gulung tali",
 "foto": "/pipa/uji_pilot/img/alat_meteran.jpg",
 "artis": "Evan-Amos",
 "lisensi": "Public domain",
 "halaman": "https://commons.wikimedia.org/wiki/File:Measuring-tape.jpg"
 },
 {
 "kunci": "hp",
 "nama": "HP dan radio",
 "fungsi": "Mencatat data di aplikasi /pipa dan berkomunikasi antar regu.",
 "spek": [
 "HP Android dengan aplikasi /pipa (bisa tanpa sinyal) dan GPS",
 "Power bank 20.000 mAh",
 "Radio genggam untuk pompa, pompa tambahan, dan petak",
 "Formulir kertas cadangan"
 ],
 "jumlah": "1 set per regu, radio 1 per pos",
 "foto": "/pipa/uji_pilot/img/alat_hp.jpg",
 "artis": "James Case from Philadelphia, Mississippi, U.S.A.",
 "lisensi": "CC BY 2.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Baofeng_UV-5R%2B_Plus_(9110574127).jpg"
 },
 {
 "kunci": "jerigen",
 "nama": "Bensin dan jerigen",
 "fungsi": "Bahan bakar pompa selama uji.",
 "spek": [
 "Jerigen 20 liter khusus BBM, tertutup rapat",
 "Bensin RON 91 atau lebih",
 "Corong dan saringan; disimpan 10 m atau lebih dari bara"
 ],
 "jumlah": "20 liter per pompa per hari",
 "foto": "/pipa/uji_pilot/img/alat_jerigen.jpg",
 "artis": "Wojciech.aniszewski",
 "lisensi": "CC BY 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:A_1938_Jerrycan_(in_original_state_and_restored).jpg"
 },
 {
 "kunci": "servis",
 "nama": "Alat servis",
 "fungsi": "Perbaikan kecil di lokasi supaya uji tidak berhenti.",
 "spek": [
 "Kunci pompa dan kunci busi, busi cadangan, oli",
 "Klem selang, selang tambal, sealtape, karet perapat kopling cadangan",
 "Kain lap dan sarung tangan kerja"
 ],
 "jumlah": "1 set",
 "foto": "/pipa/uji_pilot/img/alat_servis.jpg",
 "artis": "Valinor4 at English Wikipedia",
 "lisensi": "Public domain",
 "halaman": "https://commons.wikimedia.org/wiki/File:Hose_clamp.jpg"
 },
 {
 "kunci": "apd",
 "nama": "Alat pelindung diri",
 "fungsi": "Melindungi regu dari asap, panas, dan lubang bara.",
 "spek": [
 "Masker N95 atau P100",
 "Kacamata pelindung, helm, baju lengan panjang",
 "Sarung tangan kulit, sepatu bot karet"
 ],
 "jumlah": "1 set per orang",
 "foto": "/pipa/uji_pilot/img/alat_apd.jpg",
 "artis": "byrev",
 "lisensi": "CC0",
 "halaman": "https://commons.wikimedia.org/wiki/File:Cone-88240_1920.jpg"
 },
 {
 "kunci": "p3k",
 "nama": "P3K dan air minum",
 "fungsi": "Pertolongan pertama dan mencegah kepanasan.",
 "spek": [
 "Kotak P3K dengan obat luka bakar dan cairan pencuci mata",
 "Air minum 3 liter per orang per hari"
 ],
 "jumlah": "1 kotak per regu",
 "foto": "/pipa/uji_pilot/img/alat_p3k.jpg",
 "artis": "Renée Kools",
 "lisensi": "CC BY 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:First-aid_travel_kit_1.jpg"
 },
 {
 "kunci": "pelampung",
 "nama": "Pelampung",
 "fungsi": "Wajib saat bekerja di tepi kanal, sungai, atau di perahu.",
 "spek": [
 "Rompi pelampung berwarna terang dengan tali pengikat",
 "Dipakai sejak naik perahu sampai turun"
 ],
 "jumlah": "1 per orang bila ada kanal, sungai, atau perahu",
 "foto": "/pipa/uji_pilot/img/alat_pelampung.jpg",
 "artis": "Dietmar Rabich",
 "lisensi": "CC BY-SA 4.0",
 "halaman": "https://commons.wikimedia.org/wiki/File:K%C3%BChlungsborn,_Marina,_Rettungswesten_--_2024_--_5222.jpg"
 }
];

/* kartu katalog: foto, fungsi, spesifikasi kelas kinerja, jumlah, dan kredit foto (tanpa merek). Semua teks lewat esc (global public/inti). */
export function kartuAlatHtml(a) {
  const kredit = `Foto: ${esc(a.artis === "lihat halaman Commons" ? "lihat halaman Commons" : a.artis)}, ${esc(a.lisensi)}, <a href="${esc(a.halaman)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>`;
  return `<article class="sp-alat" data-alat="${esc(a.kunci)}"><figure><img src="${esc(a.foto)}" alt="${esc(a.nama)}" loading="lazy" width="350" height="262"><figcaption class="ad-catat">${kredit}</figcaption></figure>
    <h3>${esc(a.nama)}</h3><p>${esc(a.fungsi)}</p><ul>${a.spek.map(s => `<li>${esc(s)}</li>`).join("")}</ul><p class="sp-alat-jml"><b>Jumlah:</b> ${esc(a.jumlah)}</p></article>`;
}
export const katalogHtml = (alat = ALAT) => `<section class="sp-katalog" aria-label="Katalog alat"><h2 class="sp-judul-kecil">Katalog alat</h2>
  <p class="ad-catat">Kelas kinerja, atau setara. Merek tidak disebut. Spesifikasi dari lampiran renlap pilot; foto Wikimedia Commons berlisensi bebas.</p>
  <div class="sp-katalog-kisi">${alat.map(kartuAlatHtml).join("")}</div></section>`;
