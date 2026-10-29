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
export const DAFTAR_BENCANA = Object.keys(BENCANA);
/* baris tugas_bencana yang tak ada = karhutla */
export const bencanaId = v => Object.hasOwn(BENCANA, v) ? v : "karhutla";
export const labelBencana = v => BENCANA[bencanaId(v)];
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
export const bacaBencana = v => v == null || v === "" ? null : Object.hasOwn(BENCANA, v) ? v : undefined;
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
