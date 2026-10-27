/* SIPPA: layar Data dan metode /pipa/data (PRD §9.4.8, DS §3.4 §3.5 §4.13). Kontrak router: pasang(akar, konteks) dan lepas().
   Empat tab: Dataset (PRD §7.1), Rumus (PRD §9.3), Gerbang (PRD §9.3), Batas pemakaian alat (batas.js, sumber tunggal dengan Lampiran L buku,
   ditambah beda angka mesin Studio lawan hidraulika(), DT §5.7). Isinya teks antarmuka; satu-satunya data yang dimuat adalah tanggal tarik dari
   sumber[] zona.json dan pemicu.json. Pembangun HTML murni dan diuji tanpa DOM. Butuh global public/inti: fmt, esc, nanti. */
import {BATAS_ALAT} from "./batas.js";

export const TAB = [["dataset", "Dataset"], ["rumus", "Rumus"], ["gerbang", "Gerbang"], ["batas", "Batas pemakaian alat"]];
export const tabDari = q => TAB.some(([k]) => k === q) ? q : "dataset";

const pil = (teks, kelas, judul = "") => `<span class="sp-yakin ${esc(kelas)}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const td = (label, isi, kelas = "") => `<td${kelas ? ` class="${kelas}"` : ""} data-label="${label}">${isi}</td>`;
const tabel = (caption, kepala, baris, kelas = "") => `<div class="ad-tabel-wadah ${kelas}"><table class="ad-tabel"><caption class="sr">${esc(caption)}</caption><thead><tr>${kepala.map(k => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`;
const tanggal = s => { const t = Date.parse(s); return Number.isNaN(t) ? "–" : new Date(t).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}); };

/* ---------- Dataset (PRD §7.1). kunci = nama di GET /api/sippa/data/<nama>; tarik = nama di sumber[] JSON turunan ---------- */
const KETERANGAN_KEYAKINAN = {resmi: "Diterbitkan lembaga berwenang", terverifikasi: "Diukur atau dihitung dari data yang bisa ditelusuri", "estimasi-model": "Hasil model, bukan pengukuran", "asumsi-kebijakan": "Ditetapkan sebagai asumsi kebijakan", hipotesis: "Belum diuji", menunggu: "Menunggu data atau keputusan", "penilaian-pakar": "Penilaian pakar"};
export const DATASET = [
  {nama: "Kompleks api 2026 dan koefisien operasi", berkas: "public/data/operasi.json, kendala.json", sumber: "Pipeline repo; OSM (ODbL)", tarik: "kendala.json", segar: "harian (data.yml)", batas: "Jarak air dan jalan versi kendala.json; 134 kompleks tanpa data jalan", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Kelayakan per kompleks, semua provinsi", berkas: "kelayakan_kompleks.json", kunci: "kelayakan_kompleks", sumber: "Turunan OSM, DEM, GSW, MCD64A1 (scripts/data/sippa)", tarik: "kendala.json", segar: "saat kendala.json berubah", batas: "Zona memakai jarak garis lurus, bukan jarak tempuh; provinsi selain Kalteng belum punya DEM, air citra satelit, tahun terbakar, dan waktu tempuh (tampil belum dihitung)", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Sekat kanal dan sumur bor BRGM", berkas: "brgm_pembasahan.json", kunci: "brgm_pembasahan", sumber: "BRGM PRIMS WFS (data terbuka BRGM)", tarik: "", segar: "saat pipeline BRGM berjalan", batas: "Letak menurut BRGM, belum diverifikasi lapangan; kondisi sekat dan sumur tidak diketahui; status rencana berarti sumur bor belum terbangun", keyakinan: "resmi", status: "ada"},
  {nama: "Prioritas harian per kompleks", berkas: "prioritas.json", kunci: "prioritas", sumber: "Turunan titik panas FIRMS 7 hari, kelayakan_kompleks.json, akses_kompleks.json", tarik: "titik24.json", segar: "harian (data.yml)", batas: "Titik panas dalam 2 km, bukan luas terbakar; bobot dan ambang asumsi kebijakan, belum diuji balik", keyakinan: "estimasi-model", status: "ada"},
  {nama: "Kelayakan per sel 2,2 km", berkas: "kelayakan_sel.json", kunci: "kelayakan_sel", sumber: "Turunan VIIRS dan zona kompleks", tarik: "NASA FIRMS VIIRS S-NPP (sel22)", segar: "tahunan", batas: "Kekerapan 14 tahun VIIRS 2012–2026", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Kekerapan sel 2,2 km (14 tahun)", berkas: "sel22.json", kunci: "sel22", sumber: "NASA FIRMS VIIRS S-NPP", tarik: "NASA FIRMS VIIRS S-NPP (sel22)", segar: "tahunan", batas: "Hitungan titik panas satelit, bukan luas terbakar", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Ringkasan zona A sampai D tiga versi", berkas: "zona.json", kunci: "zona", sumber: "Turunan OSM (ODbL), DEM, GSW, MCD64A1, CHIRPS", tarik: "OpenStreetMap (jalan, air) via Overpass", segar: "tahunan atau saat AOI baru", batas: "Jalan track OSM belum tentu dapat dilalui pickup di musim hujan; relasi multipolygon danau tidak ikut", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Kit nasional bersyarat", berkas: "kit_nasional.json", kunci: "kit_nasional", sumber: "SiPongi indikasi luas kebakaran; asumsi 22.700 ha per kit", tarik: "kit_nasional.json", segar: "tahunan", batas: "Rencana bersyarat, bukan pengadaan; pasangan banjir menunggu DIBI", keyakinan: "asumsi-kebijakan", status: "ada"},
  {nama: "Pemicu pra-posisi per kabupaten", berkas: "pemicu.json", kunci: "pemicu", sumber: "Ansambel FWI, outlook iklim BMKG, titik panas 24 jam", tarik: "fwi_ansambel.json", segar: "harian", batas: "Semua ambang asumsi kebijakan dan belum diuji balik; bukan perintah gelar", keyakinan: "estimasi-model", status: "ada"},
  {nama: "Pemicu kemarau", berkas: "fwi.json, fwi_ansambel.json, iklim_outlook.json, musim.json", sumber: "Open-Meteo, BMKG", tarik: "iklim_outlook.json", segar: "harian", batas: "Ansambel atau titik panas lebih tua dari 36 jam tidak menaikkan tingkat", keyakinan: "estimasi-model", status: "ada"},
  {nama: "Tutupan lahan WorldCover 2021 per kompleks", berkas: "worldcover.csv", sumber: "ESA WorldCover v200 (CC BY 4.0)", tarik: "", segar: "tetap", batas: "", keyakinan: "terverifikasi", status: "ada"},
  {nama: "CHIRPS Jul–Okt 2001–2025 per kompleks dan provinsi", berkas: "chirps_*.csv", sumber: "CHIRPS UCSB (CC0)", tarik: "CHIRPS v2.0", segar: "tahunan", batas: "Hujan satelit, resolusi 0,05 derajat", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Riwayat api MODIS 24 tahun sel 0,1 derajat", berkas: "public/data/riwayat_grid.json", sumber: "NASA FIRMS", tarik: "", segar: "tahunan", batas: "", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Titik panas VIIRS 2012–2026", berkas: "data/raw/firms/viirs*.csv", sumber: "NASA FIRMS", tarik: "titik24.json", segar: "3 jam (titik.yml)", batas: "Titik panas satelit, bukan luas terbakar", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Luas terbakar resmi per provinsi", berkas: "public/data/luas_resmi.json", sumber: "SiPongi KLHK", tarik: "", segar: "bulanan", batas: "", keyakinan: "resmi", status: "ada"},
  {nama: "Konsesi dan status lahan", berkas: "kompleks_konsesi.json, konsesi2026/", sumber: "Pipeline repo", tarik: "kompleks_konsesi.json", segar: "saat berubah", batas: "Status lahan lain, konsesi, atau konservasi; tanpa nama perusahaan", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Posko dan Daops", berkas: "posko.json, daops.json", sumber: "Kemenhut, BNPB", tarik: "", segar: "saat berubah", batas: "", keyakinan: "resmi", status: "ada"},
  {nama: "KHG dan prioritas", berkas: "khg_prioritas.json", sumber: "Kemenhut", tarik: "khg_prioritas.json", segar: "saat berubah", batas: "", keyakinan: "resmi", status: "ada"},
  {nama: "Waktu tempuh posko ke kompleks", berkas: "akses.json", sumber: "OSRM dan OSM", tarik: "akses.json", segar: "harus dilengkapi", batas: "Sebagian saja: 185 kompleks nasional, 71 di Kalteng", keyakinan: "estimasi-model", status: "sebagian"},
  {nama: "Jarak kompleks ke jalan dan air OSM", berkas: "osm_jarak.csv", sumber: "OSM (ODbL) via Overpass", tarik: "OpenStreetMap (jalan, air) via Overpass", segar: "tahunan atau saat AOI baru", batas: "Batas pencarian 16 km; jarak garis lurus", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Elevasi kompleks, titik air, titik jalan", berkas: "dem_elevasi.csv", sumber: "Copernicus GLO-30 (DSM)", tarik: "Copernicus DEM GLO-30", segar: "tetap", batas: "DSM berkanopi, ada bias kanopi; ukur ulang dengan DEMNAS atau GNSS", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Air permukaan di titik air terdekat", berkas: "gsw_air_terdekat.csv", sumber: "JRC GSW v1.4 (CC BY 4.0)", tarik: "JRC Global Surface Water v1.4", segar: "tetap", batas: "Permanen, musiman, atau tidak terdeteksi", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Tahun terbakar 2001–2025 (jendela 2,3 km dan 5 km)", berkas: "area_terbakar.csv", sumber: "MODIS MCD64A1 v061", tarik: "MODIS MCD64A1 v061", segar: "tahunan", batas: "", keyakinan: "terverifikasi", status: "ada"},
  {nama: "Pilot Okt 2026 dan banjir 2026", berkas: "D1 sippa_*", sumber: "Lapangan", tarik: "", segar: "langsung", batas: "n kecil; tidak dipakai untuk vonis G4", keyakinan: "terverifikasi", status: "dikumpulkan"},
  {nama: "GloFAS debit model", berkas: "belum ditarik", sumber: "Copernicus CEMS", tarik: "", segar: "bila pemilik mendaftar", batas: "Butuh akun CDS dan CDSAPI_KEY dari pemilik; hanya sungai besar", keyakinan: "menunggu", status: "belum ditarik"},
  {nama: "Matriks jarak kompleks ke gudang", berkas: "matriks_gudang.csv", sumber: "Turunan daops.json dan posko.json", tarik: "", segar: "saat gudang berubah", batas: "Harus dihitung", keyakinan: "menunggu", status: "harus dihitung"},
  {nama: "DEMNAS 0,27 detik busur", berkas: "belum ada", sumber: "BIG", tarik: "", segar: "tetap", batas: "Harus diminta atau ditarik", keyakinan: "menunggu", status: "harus diminta"},
  {nama: "Debit kemarau sungai dan kanal, izin intake", berkas: "belum ada", sumber: "BWS Kalimantan II", tarik: "", segar: "tahunan", batas: "Harus diminta lewat surat BWS", keyakinan: "menunggu", status: "harus diminta"},
  {nama: "Ketebalan gambut dan tinggi muka air", berkas: "belum ada", sumber: "Walidata KHG, BRGM", tarik: "", segar: "", batas: "Harus diminta", keyakinan: "menunggu", status: "harus diminta"},
  {nama: "Harga e-katalog dan tiga penawaran", berkas: "belum ada", sumber: "LKPP, OEM", tarik: "", segar: "saat RFQ", batas: "Harus diminta", keyakinan: "menunggu", status: "harus diminta"},
  {nama: "Harga heli BNPB", berkas: "belum ada", sumber: "BNPB", tarik: "", segar: "", batas: "Menunggu pemilik", keyakinan: "menunggu", status: "menunggu pemilik"},
  {nama: "Kurva Q-H pompa dan datasheet layflat", berkas: "belum ada", sumber: "Pabrikan", tarik: "", segar: "", batas: "Harus diminta ke OEM; sebelum bench test G2 pompa dinilai dengan rating", keyakinan: "menunggu", status: "harus diminta"},
];

/* tanggal tarik per nama dari sumber[] JSON turunan; nama gabungan "a.json, b.json" dipecah per berkas */
export function tarikDari(daftar) {
  const hasil = {};
  for (const j of daftar) for (const s of (j && Array.isArray(j.sumber) ? j.sumber : [])) {
    if (!s || typeof s.nama !== "string" || !s.tarik) continue;
    const bagian = s.nama.split(/,\s*/);
    for (const n of bagian.every(b => /\.json$/.test(b)) ? bagian : [s.nama]) hasil[n] = s.tarik;
  }
  return hasil;
}

/* jumlah kompleks dan provinsi dari baris zona.json (versi konservatif, tingkat provinsi): kalimat nama dihitung dari data, bukan ditulis tangan */
export function jumlahKelayakan(zona) {
  const b = ((zona && zona.baris) || []).filter(x => x.versi === "k" && x.kab == null && x.n > 0);
  return b.length ? {n: b.reduce((s, x) => s + x.n, 0), prov: new Set(b.map(x => x.prov)).size} : null;
}
export const namaDataset = (d, jumlah) => d.kunci === "kelayakan_kompleks" && jumlah ? `Kelayakan per kompleks (${fmt(jumlah.n)} kompleks di ${fmt(jumlah.prov)} provinsi)` : d.nama;

export function tabDatasetHtml(tarik = {}, daftar = DATASET, jumlah = null) {
  const baris = daftar.map(d => {
    const t = d.tarik && tarik[d.tarik] ? tanggal(tarik[d.tarik]) : "–", ada = d.status === "ada" || d.status === "sebagian" || d.status === "dikumpulkan";
    return `<tr>${td("Nama", `<b>${esc(namaDataset(d, jumlah))}</b>${ada ? "" : ` <span class="sp-status putus">${esc(d.status)}</span>`}`)}${td("Berkas", `<code class="sp-berkas">${esc(d.berkas)}</code>`)}${td("Sumber dan lisensi", esc(d.sumber))}${td("Ditarik", esc(t), "n")}${td("Penyegaran", esc(d.segar || "–"))}${td("Keterbatasan", esc(d.batas || "–"))}${td("Keyakinan", pil(d.keyakinan === "menunggu" ? "Menunggu" : d.keyakinan.charAt(0).toUpperCase() + d.keyakinan.slice(1).replace("-", " "), d.keyakinan, KETERANGAN_KEYAKINAN[d.keyakinan] ?? ""))}</tr>`;
  });
  return tabel("Inventaris dataset SIPPA", ["Nama", "Berkas", "Sumber dan lisensi", "Ditarik", "Penyegaran", "Keterbatasan", "Keyakinan"], baris, "sp-tabel-dataset");
}

/* ---------- Rumus (PRD §9.3): satu sumber rumus ada di hitung.js; di sini hanya penjelasan teksnya ---------- */
export const RUMUS = [
  {fungsi: "idHdpe(od, sdr)", rumus: "ID = OD x (1 - 2/SDR)", satuan: "mm"},
  {fungsi: "idLayflat(dn, idDatasheet)", rumus: "ID datasheet bila ada; bila tidak, 0,96 x DN (berpil asumsi)", satuan: "mm"},
  {fungsi: "hfHW(L, Q, C, D)", rumus: "h_f = 10,67 L Q^1,852 / (C^1,852 D^4,871)", satuan: "m"},
  {fungsi: "fSuhu(T)", rumus: "f_suhu = 1 - 0,014 (T - 20), dibatasi 0,58 sampai 1", satuan: "tanpa satuan"},
  {fungsi: "batasTekanan(p)", rumus: "HDPE: 0,88 x PN x f_suhu (PN16 untuk SDR11, PN10 untuk SDR17); layflat: 0,88 x tekanan kerja datasheet", satuan: "bar"},
  {fungsi: "pRating(kelas, q)", rumus: "Interpolasi linear antar titik rating datasheet pompa", satuan: "bar"},
  {fungsi: "hidraulika(p)", rumus: "TDH = Δz + h_f + K v²/2g + sisa x 10,197 (+ 3,5 bila hisap); P = ρ g Q TDH / η; tekanan pompa = TDH / 10,197", satuan: "m, bar, kW, HP"},
  {fungsi: "gerbangHidraulika(p, h)", rumus: "Daftar kode, tingkat, nilai, dan batas (tab Gerbang)", satuan: "tanpa satuan"},
  {fungsi: "vonis(gerbang)", rumus: "Ada gerbang keras = NO-GO; ada syarat = HOLD; selain itu KONDISIONAL", satuan: "vonis"},
  {fungsi: "bbmJam(kw, kelas, jenis, nPompa)", rumus: "Bensin kelas 1.500 L/min: 22 L/jam per pompa pada rating; solar: kW x BSFC / 0,84 (BSFC 0,25 kg/kWh, rentang 0,22–0,30)", satuan: "L/jam"},
  {fungsi: "co2(liter, jenis)", rumus: "Bensin 2,31 kg/L; solar 2,68 kg/L (hanya BBM)", satuan: "kg CO2"},
  {fungsi: "zona(airKm, jalanKm, ambang)", rumus: "A: air < 2,5 km dan jalan < 5 km; B: air dekat, jalan jauh; C: air jauh, jalan dekat; D: keduanya jauh. Tepat 2,50 atau 5,00 km = jauh; tanpa data = jauh", satuan: "A, B, C, D"},
  {fungsi: "kuantil(xs, p)", rumus: "Interpolasi linear tipe 7 (sama dengan numpy.percentile bawaan); n < 5 = n kecil", satuan: "satuan data"},
  {fungsi: "vonisPilot(d)", rumus: "Tujuh butir pilot menghasilkan DAPAT DIPAKAI, DAPAT DIPAKAI BERSYARAT, atau BELUM DAPAT DIPAKAI (keputusan 53)", satuan: "vonis pilot"},
  {fungsi: "neracaAir(p)", rumus: "stok(t+1) = stok(t) + maks(0, Q95 - Q_eko) x 86,4 - Q_api x 86,4 - evaporasi; syarat G1: Q95 ≥ 1,5 x Q_api", satuan: "m3"},
  {fungsi: "joukowsky(dv, a)", rumus: "ΔP = ρ a Δv / 100.000; a bawaan 300 m/s HDPE dan 150 m/s layflat (asumsi)", satuan: "bar"},
  {fungsi: "zonaTerverifikasi(k, cek)", rumus: "Zona semua jalan OSM hanya bila cek jalan musim hujan terbaru lolos; selain itu zona versi kendala.json", satuan: "A, B, C, D"},
  {fungsi: "saranSarana(k, versi, apiAktif, cek)", rumus: "Enam aturan dicek dari atas, berhenti di aturan pertama yang cocok (PRD §9.4.2)", satuan: "saran dan alasan berangka"},
  {fungsi: "matriksRespons(frp, luasHa, zona, koef, jamTiba)", rumus: "Empat tingkat respons dengan koefisien dari operasi.json", satuan: "regu, hari"},
  {fungsi: "tingkatPemicu(x)", rumus: "SIAGA bila anomali curah hujan di bawah ambang; PRA-POSISI bila SIAGA, ansambel segar, dan hari titik panas cukup; GELAR bila PRA-POSISI, titik panas segar, dan titik di zona A atau B cukup", satuan: "NORMAL, SIAGA, PRA-POSISI, GELAR"},
  {fungsi: "bandingRerata(a, b)", rumus: "Welch: se = √(s_a²/n_a + s_b²/n_b), df Welch-Satterthwaite; n < 8 per lengan = belum bisa diputus", satuan: "selisih dan CI 95%"},
  {fungsi: "bandingProporsi(xa, na, xb, nb)", rumus: "Agresti-Caffo: tambah 1 sukses dan 1 gagal per lengan", satuan: "selisih proporsi dan CI 95%"},
  {fungsi: "vonisG4(lengan, konv)", rumus: "LULUS bila ≥ 30% lebih baik pada satu ukuran, CI tidak memotong nol, n ≥ 8 per lengan, biaya per ha ≤ 1,2 x konvensional; data pilot tidak pernah diberi vonis G4", satuan: "LULUS, TIDAK LULUS, BELUM BISA DIPUTUS"},
  {fungsi: "crf(r, n)", rumus: "r / (1 - (1 + r)^-n)", satuan: "per tahun"},
  {fungsi: "af(r, H)", rumus: "(1 - (1 + r)^-H) / r", satuan: "tahun"},
  {fungsi: "biayaPerHa(p)", rumus: "(CAPEX x crf + OPEX + regu) / ha dingin terverifikasi 30 hari", satuan: "Rp/ha"},
  {fungsi: "npv(p)", rumus: "Σ (B_t - O_t) / (1 + r)^t - CAPEX, t = 1 sampai H; r bawaan 8%, H bawaan 5 tahun", satuan: "Rp"},
  {fungsi: "bcr(p)", rumus: "PV(B) / (CAPEX + PV(O))", satuan: "rasio"},
  {fungsi: "impas(p)", rumus: "B* = O + CAPEX / AF", satuan: "Rp/tahun"},
];

export function tabRumusHtml() {
  return tabel("Rumus fungsi hitung bersama", ["Fungsi", "Rumus", "Satuan"], RUMUS.map(r => `<tr>${td("Fungsi", `<code class="sp-berkas">${esc(r.fungsi)}</code>`)}${td("Rumus", `<code class="sp-rumus">${esc(r.rumus)}</code>`)}${td("Satuan", esc(r.satuan))}</tr>`), "sp-tabel-rumus")
    + `<p class="ad-catat sp-sumber">Sumber: PRD §9.3; rumus tinggal di public/pipa/hitung.js, satu sumber untuk kalkulator, peta, Studio, 3D, laporan, dan buku.</p>`;
}

/* ---------- Gerbang (PRD §9.3). Uji membandingkan kode dan tingkat dengan hitung.js ---------- */
export const GERBANG = [
  {kode: "H-TEKANAN", tingkat: "keras", syarat: "Tekanan pompa lebih dari 0,88 x PN x f_suhu (HDPE) atau 0,88 x tekanan kerja datasheet (layflat)", pesan: "Tekanan 12,5 bar melewati batas kerja 11,1 bar (88% x PN16 x 0,79 pada 35 °C)"},
  {kode: "H-SISA", tingkat: "keras", syarat: "Tekanan ujung kurang dari 1 bar", pesan: "Tekanan di manifold kurang dari 1 bar; lance tidak bekerja"},
  {kode: "H-SISA2", tingkat: "syarat", syarat: "Tekanan ujung dari 1 bar sampai kurang dari 2 bar", pesan: "Tekanan ujung di bawah 2 bar; lance 15–40 L/min butuh 2–4 bar"},
  {kode: "H-SERAP", tingkat: "keras", syarat: "Debit pompa lebih dari jumlah lance x 40 L/min ditambah debit pemakai lain", pesan: "Debit 600 L/min tidak terserap 8 lance (paling banyak 320 L/min)"},
  {kode: "H-RATING", tingkat: "keras", syarat: "Pompa dipilih dan debit di luar titik rating datasheet", pesan: "Debit 2.400 L/min di luar rating pompa terpilih (paling banyak 2.050 L/min)"},
  {kode: "H-DAYA", tingkat: "keras", syarat: "Daya poros per pompa lebih dari 0,85 x rating pompa terpilih", pesan: "Daya poros melewati kemampuan pompa terpilih"},
  {kode: "H-KECEPATAN", tingkat: "syarat", syarat: "Kecepatan aliran lebih dari 3 m/s", pesan: "Kecepatan 3,4 m/s; risiko lonjakan saat katup ditutup"},
  {kode: "H-PANAS", tingkat: "keras", syarat: "Bahan HDPE dan ujung di perimeter api aktif dicentang", pesan: "HDPE tidak boleh berada di perimeter api aktif (K-16)"},
  {kode: "H-DALAM", tingkat: "keras", syarat: "Kedalaman lance lebih dari 5 m: masukan ditolak", pesan: "Injeksi lebih dari 5 m tidak termasuk SIPPA (keputusan 50)"},
  {kode: "H-AIR", tingkat: "keras", syarat: "Neraca air negatif: stok sumber habis dalam masa operasi", pesan: "Sumber habis pada hari ke-2"},
  {kode: "H-AIR", tingkat: "syarat", syarat: "Debit andalan Q95 kurang dari 1,5 x debit operasi (syarat G1)", pesan: "Q95 1,2 L/s kurang dari 1,5 x debit operasi 5 L/s"},
  {kode: "H-DSM", tingkat: "catatan", syarat: "Beda elevasi diambil dari dem_elevasi.csv", pesan: "Beda elevasi dari DSM berkanopi (Copernicus GLO-30); ukur ulang dengan DEMNAS atau GNSS"},
  {kode: "H-UJI", tingkat: "catatan", syarat: "Kedalaman lance 3 m atau lebih", pesan: "Kedalaman 3–5 m hanya untuk lengan uji kedua"},
];
const LABEL_TINGKAT = {keras: "Keras", syarat: "Syarat", catatan: "Catatan"};

export function tabGerbangHtml() {
  return tabel("Gerbang kalkulator hidraulika", ["Kode", "Syarat", "Tingkat", "Pesan layar"],
    GERBANG.map(g => `<tr>${td("Kode", `<b>${esc(g.kode)}</b>`)}${td("Syarat", esc(g.syarat))}${td("Tingkat", `<span class="sp-gerbang ${esc(g.tingkat)}">${esc(LABEL_TINGKAT[g.tingkat])}</span>`)}${td("Pesan layar", esc(g.pesan))}</tr>`), "sp-tabel-gerbang")
    + `<p class="ad-catat sp-sumber">Sumber: PRD §9.3. Satu gerbang keras cukup membuat vonis NO-GO, berapa pun skor dan biayanya; gerbang yang sama dijalankan Studio sebagai lapisan tambahan.</p>`;
}

/* ---------- Batas pemakaian alat dan beda angka mesin Studio ---------- */
/* angka kalkulator dicocokkan ke hidraulika() oleh uji; angka mesin dibekukan (keputusan 34) dari DT §5.7 */
export const BEDA_MESIN = {kasus: "HDPE OD160 SDR11, 2.000 L/min, 2 km, naik 10 m, sisa 2 bar, K = 5, 35 °C",
  mesin: {tekanan: fmt(12.21), C: 135}, kalkulator: {tanpa_hisap: fmt(12.495), dengan_hisap: fmt(12.84), C: 130}, vonis: "NO-GO"};

function kartuBeda() {
  const b = BEDA_MESIN, bar = v => `${esc(v)} bar`;
  const isi = `<p>Layar Studio menampilkan angka mesin yang dibekukan (keputusan 34); layar Hitung menampilkan angka hidraulika(). Keduanya boleh berbeda; bandingkan vonisnya, bukan selisih angkanya.</p>
    <div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Beda angka mesin Studio dan kalkulator hidraulika</caption><thead><tr>${["Besaran", "Mesin Studio", "Kalkulator hidraulika()"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>
    <tr>${td("Besaran", "Koefisien Hazen-Williams HDPE")}${td("Mesin Studio", `C ${esc(b.mesin.C)}`, "n")}${td("Kalkulator hidraulika()", `C ${esc(b.kalkulator.C)}`, "n")}</tr>
    <tr>${td("Besaran", "Tinggi hisap")}${td("Mesin Studio", "tidak dipakai", "n")}${td("Kalkulator hidraulika()", "tanpa hisap bawaan; 3,5 m bila hisap dicentang", "n")}</tr>
    <tr>${td("Besaran", "Tekanan pompa, " + esc(b.kasus))}${td("Mesin Studio", bar(b.mesin.tekanan), "n")}${td("Kalkulator hidraulika()", `${bar(b.kalkulator.tanpa_hisap)} tanpa hisap; ${bar(b.kalkulator.dengan_hisap)} dengan hisap`, "n")}</tr>
    <tr>${td("Besaran", "Vonis")}${td("Mesin Studio", `<span class="sp-vonis nogo">${esc(b.vonis)}</span>`)}${td("Kalkulator hidraulika()", `<span class="sp-vonis nogo">${esc(b.vonis)}</span>`)}</tr></tbody></table></div>
    <div class="sp-pil-baris">${pil("Estimasi model", "estimasi-model", "Hasil model hidraulika, bukan pengukuran")}</div>`;
  return `<div id="insight" class="sp-kisi"><article class="ex"><header class="ex-hd"><span class="ex-ey">Data</span><div class="ex-jd"><h3>Mesin Studio memberi <span class="hl">${esc(b.mesin.tekanan)} bar</span>, kalkulator <span class="hl">${esc(b.kalkulator.tanpa_hisap)} bar</span>, vonis sama</h3></div></header><div class="ex-bd">${isi}</div><footer class="ex-ft"><em>Sumber: DT §5.7 dan kasus acuan H1 (tests/sippa/fixtures/acuan.json); mesin dibekukan keputusan 34</em></footer></article></div>`;
}

export function tabBatasHtml() {
  return `<h2 class="sp-sub">Batas pemakaian alat</h2><ol class="sp-batas">${BATAS_ALAT.map(p => `<li>${esc(p)}</li>`).join("")}</ol>
    <p class="ad-catat sp-sumber">Sumber: public/pipa/batas.js, teks yang sama dengan Lampiran L buku kajian (PRD §9.4.8, G22 dan G23).</p>${kartuBeda()}`;
}

/* ---------- kerangka tab dan DOM ---------- */
export function kerangkaTab(aktif) {
  return `<div class="ad-tabs sp-tabs" role="tablist" aria-label="Data dan metode">${TAB.map(([k, n]) => `<button type="button" role="tab" id="sp-tab-${k}" data-tab="${k}" aria-selected="${k === aktif}" aria-controls="sp-panel" tabindex="${k === aktif ? 0 : -1}">${esc(n)}</button>`).join("")}</div>
    <div id="sp-panel" class="sp-panel" role="tabpanel" aria-labelledby="sp-tab-${aktif}" tabindex="0"></div>`;
}

let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, st = {tab: tabDari(new URLSearchParams(location.search).get("tab")), tarik: {}, jumlah: null, catatTarik: "Tanggal tarik dimuat dari zona.json dan pemicu.json."};
  akar.innerHTML = `<h1 class="sp-judul">Data dan metode</h1>${kerangkaTab(st.tab)}`;
  const panel = akar.querySelector("#sp-panel"), tabs = [...akar.querySelectorAll("[role=tab]")];
  const BANGUN = {dataset: () => tabDatasetHtml(st.tarik, DATASET, st.jumlah) + `<p class="ad-catat sp-sumber">Sumber: PRD §7.1 inventaris dataset. ${esc(st.catatTarik)}</p>`, rumus: tabRumusHtml, gerbang: tabGerbangHtml, batas: tabBatasHtml};
  const gambar = () => { if (!sinyal.aborted) panel.innerHTML = BANGUN[st.tab](); };
  /* INP: aria-selected dan fokus berpindah di handler; isi panel digambar sesudah satu frame lewat nanti() */
  const pilih = (k, fokus) => {
    if (k === st.tab) return;
    st.tab = k; tabs.forEach(t => { const on = t.dataset.tab === k; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && fokus) t.focus(); });
    panel.setAttribute("aria-labelledby", `sp-tab-${k}`);
    const u = new URL(location.href); u.searchParams.set("tab", k); history.replaceState(null, "", u);
    nanti(gambar);
  };
  akar.addEventListener("click", e => { const t = e.target.closest("[data-tab]"); if (t) pilih(t.dataset.tab, false); }, {signal: sinyal});
  akar.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const t = e.target.closest("[role=tab]"); if (!t) return;
    e.preventDefault(); pilih(TAB[(TAB.findIndex(([k]) => k === t.dataset.tab) + (e.key === "ArrowRight" ? 1 : TAB.length - 1)) % TAB.length][0], true);
  }, {signal: sinyal});
  gambar();
  /* tanggal tarik: dua berkas turunan, dimuat sendiri-sendiri; kegagalan hanya menandai catatan, tabel tetap tampil */
  const [z, p] = await Promise.allSettled(["zona", "pemicu"].map(n => konteks.ambil(`/api/sippa/data/${n}`, sinyal)));
  if (sinyal.aborted) return;
  const ok = [z, p].filter(r => r.status === "fulfilled").map(r => r.value);
  st.tarik = tarikDari(ok); st.jumlah = z.status === "fulfilled" ? jumlahKelayakan(z.value) : null;
  st.catatTarik = ok.length === 2 ? "Tanggal tarik dari sumber zona.json dan pemicu.json." : ok.length ? "Tanggal tarik hanya sebagian termuat; sebagian sumber tidak bisa dibaca." : "Tanggal tarik belum termuat; sumber tidak bisa dibaca.";
  if (z.status === "fulfilled" && z.value.per) konteks.setPer?.(Date.parse(z.value.per));
  if (st.tab === "dataset") gambar();
}
