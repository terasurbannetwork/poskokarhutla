/* Mesin tugas multi-bahaya. SATU peta di sini: berkas masukan, versi di tugas_meta, kata di layar, kunci kartu, dan aturan "selesai" tiap bahaya.
   Kontrak berkas /data/tugas_<id>.json (karhutla tetap tugas_kompleks.json): SAMA dengan tugas_kompleks.json
     {dibuat: ISO, bencana: "<id>", kompleks: [{lat, lon, prov (2 digit), kab, level (0-9), kec?, n24?, luas?, jam_sejak?, insiden?, front?, masuk?, otomatis?, rekomendasi?, akses?,
       status?, kartu?: {...}, ...kunci kartu hazard...}]}
   Kunci kartu hazard boleh di tingkat butir ATAU di butir.kartu; hanya `kunciKartu` bahaya itu yang dibawa (JSON <= 3000 huruf).
   Tugas dibuat sekali per versi `dibuat`, digabung ke tugas terbuka bahaya yang SAMA (insiden, atau <= 2 km di kabupaten yang sama).
   `lengkap: true` (top-level) WAJIB agar berkas dengan kompleks kosong boleh dinilai (butir hilang = reda); tanpa itu berkas kosong, terpotong (> 600) atau berisi butir tak sah tidak menutup apa pun.
   Urutan kunci top-level dari pipeline: dibuat, bencana, lengkap, [label], syarat_ambang, kompleks. kekeringan: butir otomatis:false (hanya memperbarui tugas yang sudah ada) dan membawa `hipotesis` (bool) di kartu.
   Kunci tugas bahaya lain = butir.id (kode kejadian stabil, mis. B0038; disimpan sebagai insiden di tugas_kartu); tanpa id baru jatuh ke lokasi 2 km.
   Aturan selesai (`reda`): butir dianggap "reda" bila id-nya hilang dari berkas, atau status ada di `normal`, atau level <= `levelMaks`, atau kartu.level <= `kartuLevelMaks`.
   umurMaksJam (opsional): tugas buka yang lebih tua dari ini ditutup otomatis oleh tutupKedaluwarsa (instansi.js), dijalankan tiap jam di bersihkanInstansi; berlaku juga bila reda: null.
   `berturut` versi berturut-turut yang reda menutup tugas otomatis (status padam, padam_verif padam_terverifikasi). reda: null = tanpa penutupan otomatis (laporan regu saja).
   Murni: tanpa impor, aman dipakai push/kabar/pantau/sla tanpa siklus. */
/* ANGKA KEBIJAKAN, bukan angka bersumber (tidak ditemukan di docs repo): jendela kaji cepat gempa. Tugas gempa yang `dibuat`-nya lebih tua dari ini ditutup otomatis
   (padam_dilaporkan, lalu padam_terverifikasi 48 jam kemudian) karena tak ada sinyal "reda" untuk gempa. Pemilik boleh mengubahnya di sini saja. */
export const UMUR_KAJI_CEPAT_JAM = 72;
export const KUNCI_UMUM = ["insiden", "front", "masuk", "insiden_awal_ms", "insiden_awal", "nama", "tingkat", "mulai", "jiwa", "syarat"];
const NORMAL = ["normal", "aman", "surut", "selesai", "berakhir"];
/* kunciKartu = KUNCI_UMUM + kartu hazard dari pipeline (scripts/umum/tugas.py). reda.kartuLevelMaks: kartu.level (tingkat resmi PVMBG) <= nilai = reda. */
export const BENCANA = {
  karhutla: {nama: "Karhutla", sebut: "Api", kata: "padam", berkas: "tugas_kompleks.json", meta: "tugas_kompleks_dibuat", reda: null,
    sasaran: (tempat, cara) => `Padamkan api di ${tempat}, cegah meluas ke luar sektor${cara ? `, metode utama ${cara}` : ""}.`,
    keselamatan: dari => dari ? `Pakai APD lengkap. Angin datang dari ${dari}: jangan berada searah angin dari api, tetapkan jalur keluar dan titik kumpul.` : "Pakai APD lengkap. Arah angin belum diketahui: tetapkan jalur keluar dan titik kumpul.",
    deteksi: tempat => `Titik api terdeteksi satelit dan tugas dibuat di ${tempat}`,
    kunciKartu: ["insiden", "front", "masuk", "radius_m", "luas_aktif", "luas_koreksi", "tren", "konsesi", "syarat", "insiden_awal_ms", "insiden_awal", "jenis", "firespot"]},
  banjir: {nama: "Banjir", sebut: "Banjir", kata: "surut", berkas: "tugas_banjir.json", meta: "tugas_banjir_dibuat", reda: {berturut: 2, normal: NORMAL, levelMaks: 1},
    kunciKartu: [...KUNCI_UMUM, "jiwa_terdampak", "hujan_mm"]},
  gempa: {nama: "Gempa", sebut: "Gempa", kata: "selesai", berkas: "tugas_gempa.json", meta: "tugas_gempa_dibuat", reda: null, umurMaksJam: UMUR_KAJI_CEPAT_JAM,
    kunciKartu: [...KUNCI_UMUM, "mag", "mmi_maks", "jiwa_mmi6", "dalam_km", "dasar"]},
  gunungapi: {nama: "Gunungapi", sebut: "Gunungapi", kata: "turun status", berkas: "tugas_gunungapi.json", meta: "tugas_gunungapi_dibuat", reda: {berturut: 1, normal: NORMAL, levelMaks: 1, kartuLevelMaks: 2},
    kunciKartu: [...KUNCI_UMUM, "level", "radius_krb_km", "jiwa_krb", "dasar"]},
  cuaca: {nama: "Cuaca ekstrem", sebut: "Cuaca ekstrem", kata: "berakhir", berkas: "tugas_cuaca.json", meta: "tugas_cuaca_dibuat", reda: {berturut: 1, normal: NORMAL, levelMaks: 1},
    kunciKartu: [...KUNCI_UMUM, "jenis_peringatan", "berlaku_hingga", "jiwa_kab_terlibat"]},
  kekeringan: {nama: "Kekeringan", sebut: "Kekeringan", kata: "membaik", berkas: "tugas_kekeringan.json", meta: "tugas_kekeringan_dibuat", reda: {berturut: 2, normal: NORMAL, levelMaks: 1},
    kunciKartu: [...KUNCI_UMUM, "spi3", "hari_tanpa_hujan", "jiwa_kab_terlibat", "dasar", "hipotesis"]},
  udara: {nama: "Kualitas udara", sebut: "Kualitas udara", kata: "membaik", berkas: "tugas_udara.json", meta: "tugas_udara_dibuat", reda: null, umurMaksJam: UMUR_KAJI_CEPAT_JAM,
    kunciKartu: [...KUNCI_UMUM, "ispu", "polutan", "tren"]},
};
/* Longsor dan pesisir (paritas bencana PB-07): tugasnya di tabel samping tugas_bencana_x (migrasi 0130), berkas tugas_<id>.json dibuat PB-09. reda: null = tanpa penutupan otomatis,
   umurMaksJam = jendela kaji cepat yang sama dengan gempa (angka kebijakan di atas). Teks hanya dari docs/multi-bencana/PRAKTIK-PENANGANAN.md bagian tanggap darurat (Perka BNPB 13/2010 SAR [korpus]); tanpa angka. */
BENCANA.longsor = {nama: "Longsor", sebut: "Longsor", kata: "selesai", berkas: "tugas_longsor.json", meta: "tugas_longsor_dibuat", reda: null, umurMaksJam: UMUR_KAJI_CEPAT_JAM,
  sasaran: tempat => `Cari dan tolong korban timbunan di ${tempat}, amankan dari longsor susulan, evakuasi warga.`,
  keselamatan: () => "Waspadai longsor susulan dan retakan di mahkota longsor. Tutup akses ke zona berbahaya.",
  kunciKartu: [...KUNCI_UMUM, "hujan_mm", "jiwa_kab_terlibat", "dasar"]};
BENCANA.pesisir = {nama: "Gelombang pasang dan abrasi", sebut: "Gelombang pasang", kata: "selesai", berkas: "tugas_pesisir.json", meta: "tugas_pesisir_dibuat", reda: null, umurMaksJam: UMUR_KAJI_CEPAT_JAM,
  sasaran: tempat => `Evakuasi permukiman pesisir yang terkena gelombang di ${tempat}, siapkan penampungan dan logistik.`,
  keselamatan: () => "Waspadai tanggul yang rusak dan genangan rob. Pakai perahu dan pompa sesuai kebutuhan lapangan.",
  kunciKartu: [...KUNCI_UMUM, "tinggi_gelombang_m", "jiwa_kab_terlibat", "dasar"]};
/* Jenis tugas yang disimpan di tugas_bencana_x (CHECK tugas_bencana 0047 tidak mencakupnya). */
export const BENCANA_X = ["longsor", "pesisir"];
/* Sarana dan fasilitas sasaran (F-2, F-7), dicerminkan CHECK pb_titik (migrasi 0130). */
export const SARANA = ["heli_evakuasi", "perahu_karet", "perahu_motor", "pompa_air", "truk_tangki", "tenda", "terpal", "atap_darurat", "alat_berat", "genset", "dapur_umum", "masker", "air_bersih_unit", "tim_sar_unit"];
export const FASILITAS = ["tempat_evakuasi", "faskes", "sekolah", "gudang", "helipad", "sumber_air", "barak", "ruang_udara_bersih", "pos_pantau"];
export const DAFTAR_BENCANA = Object.keys(BENCANA);
/* Jenis dari baris D1 yang tak dikenal: BUKAN karhutla. Entri netral tak terdaftar di DAFTAR_BENCANA (tak enumerable), supaya satu baris ganjil tidak menjatuhkan daftar. */
export const TIDAK_DIKENAL = "tidak_dikenal";
Object.defineProperty(BENCANA, TIDAK_DIKENAL, {enumerable: false, value: {nama: "Jenis tidak dikenal", sebut: "Tugas", kata: "selesai", berkas: null, meta: null, reda: null, kunciKartu: []}});
/* baris tugas_bencana yang tak ada (null/undefined) = karhutla; teks jenis yang tak dikenal = TIDAK_DIKENAL (dicatat di log), tidak diam-diam jadi karhutla */
export const bencanaId = v => {
  if (v == null || v === "") return "karhutla";
  if (!Object.hasOwn(BENCANA, v)) { console.error("jenis bencana tidak dikenal:", String(v).slice(0, 40)); return TIDAK_DIKENAL; }
  return v;
};
export const labelBencana = v => BENCANA[bencanaId(v)];
/* teks tugas per jenis; jenis tanpa kunci teks sendiri (banjir dst) memakai kalimat umum seperti sebelumnya */
export const teksBencana = v => {
  const b = labelBencana(v), n = b.nama.toLowerCase();
  return {sasaran: b.sasaran ?? (tempat => `Tangani ${n} di ${tempat}, utamakan keselamatan warga dan regu.`),
    keselamatan: b.keselamatan ?? (() => "Pakai APD sesuai bahaya. Tetapkan jalur keluar dan titik kumpul, pantau peringatan resmi."),
    deteksi: b.deteksi ?? (tempat => `Tugas ${n} dibuat di ${tempat}`)};
};
/* Kata penutup tugas per bahaya di atas kolom padam_pada/padam_verif (satu alur, dua kosakata). Tanpa entri = kosakata api (karhutla, dan bahaya lain seperti sebelumnya).
   Banjir: "terverifikasi" = data pantauan banjir masih menyatakan reda 48 jam sesudah dilaporkan surut; BUKAN citra satelit. */
const TUTUP = {banjir: {
  judul: "Sudah surut belum?", lapor: "Dilaporkan surut", pil_lapor: "Surut dilaporkan", verif: "Surut terverifikasi", lagi: "Banjir naik lagi", pil_lagi: "Banjir naik lagi", cek: "Surut",
  hasil: {api_ada: "banjir ada", bukan_api: "bukan banjir", sudah_padam: "sudah surut"}, status: {menyala: "masih tergenang", bara: "mulai surut", padam: "sudah surut"},
  catatan: "Surut terverifikasi berarti data pantauan banjir tidak lagi menandai lokasi ini selama 48 jam sesudah dilaporkan surut. Ini bukan citra satelit, jadi lapangan tetap perlu mengecek genangan sisa.",
  label: {padam_dilaporkan: "Surut dilaporkan. Menunggu 48 jam data pantauan banjir untuk disebut terverifikasi.",
    padam_terverifikasi: "Surut terverifikasi: data pantauan banjir tidak lagi menandai lokasi ini selama 48 jam. Genangan sisa tetap mungkin, cek lapangan.",
    muncul_lagi: "Banjir naik lagi sesudah dilaporkan surut. Tugas dibuka kembali."}}};
export const tutupBencana = v => typeof v === "string" && Object.hasOwn(TUTUP, v) ? TUTUP[v] : null;
/* ?bencana= : kosong = semua (null); dikenal = id; selain itu undefined (tolak 400) */
export const bacaBencana = v => v == null || v === "" ? null : Object.hasOwn(BENCANA, v) && v !== TIDAK_DIKENAL ? v : undefined;
/* butir berkas sudah reda menurut aturan bahayanya (butir yang sama sekali tak ada ditangani pemanggil) */
export function butirReda(b, k) {
  const r = BENCANA[b]?.reda; if (!r) return false;
  const st = String(k?.status ?? k?.kartu?.status ?? "").toLowerCase();
  const kl = Number(k?.kartu?.level);
  return (st !== "" && r.normal.includes(st)) || (Number.isFinite(k?.level) && k.level <= r.levelMaks) || (r.kartuLevelMaks != null && Number.isFinite(kl) && kl <= r.kartuLevelMaks);
}
/* nilai kartu: angka terbatas, teks <= 200, null/boolean, atau larik <= 10 isi primitif seperti itu. Objek bersarang dan teks panjang dibuang (undefined). */
const prim = v => v === null || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length <= 200);
const jinak = v => prim(v) ? v : Array.isArray(v) && v.length <= 10 && v.every(prim) ? v : undefined;
/* kartu bahaya non-karhutla: ambil hanya kunci whitelist (tingkat butir lalu butir.kartu), JSON <= 3000 huruf, kunci dibuang dari belakang bila kepanjangan (insiden terakhir dibuang) */
export function pasKartuBencana(b, k, maks = 3000) {
  const kunci = BENCANA[b]?.kunciKartu; if (!kunci || !k || typeof k !== "object") return null;
  const x = {}, dalam = k.kartu && typeof k.kartu === "object" && !Array.isArray(k.kartu) ? k.kartu : {};
  for (const c of kunci) { const v = jinak(dalam[c] !== undefined ? dalam[c] : k[c]); if (v !== undefined) x[c] = v; }
  if (typeof x.insiden !== "string" || x.insiden.length < 3 || x.insiden.length > 40) delete x.insiden;
  const ks = Object.keys(x);
  while (ks.length && JSON.stringify(x).length > maks) delete x[ks.pop()];
  return ks.length ? JSON.stringify(x) : null;
}
