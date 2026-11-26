/* peta ikon pilihan /lapor: satu sumber untuk layar dan gerbang tests/lapor/gerbang_ikon_opsi.test.mjs (pemilik 26 Nov 2026: tiap pilihan berikon bermakna, generik hanya untuk Lainnya) */
export const ikonKebutuhan = (o, bawaan = "i-kebutuhan") => [  // kelompok rentan dan layanan terganggu berikon sendiri (pemilik 19 Nov 2026 "bagusin")
  [/^tidak ada|^semua masih|^belum ada/i, "i-centang"], [/^tidak tahu|^belum tahu/i, "i-bantuan"],
  // benda yang terdampak bergambar sendiri (pemilik 25 Nov 2026: "rumah warga, jalan, sawah masa sama semua")
  [/terjebak/i, "i-orang"], [/genset|penerangan/i, "k-listrik"], [/bahan atap/i, "i-rumah"], [/gergaji/i, "k-alat"], [/pompa/i, "k-air-turun"],
  [/rumah sakit|puskesmas|klinik/i, "i-plus"], [/rumah/i, "i-rumah"], [/jalan|jembatan/i, "k-jalan"], [/sawah|kebun|ladang|lahan/i, "k-daun"], [/sekolah|ibadah|masjid|gereja/i, "k-sekolah"], [/pasar|toko|warung/i, "k-pasar"], [/kantor|gedung/i, "b-gedung"], [/hamil|menyusui|disabilitas|lansia/i, "i-orang"], [/listrik/i, "k-listrik"], [/sinyal|telepon/i, "i-telepon"],
  [/makan/i, "k-makan"], [/air/i, "b-banjir"], [/selimut|pakaian/i, "k-baju"], [/obat|kesehatan/i, "i-plus"], [/tenda|terpal/i, "k-tenda"],
  [/bayi|lansia/i, "k-bayi"], [/sembako|pangan/i, "k-makan"], [/sandang/i, "k-baju"], [/matras|tikar|kasur/i, "k-kasur"], [/family kit/i, "k-sabun"], [/kidsware/i, "k-bayi"], [/tangki/i, "b-banjir"], [/mandi|kebersihan/i, "b-banjir"], [/tandon|penampungan/i, "b-banjir"], [/mesin|selang|pemadam/i, "b-api"], [/masker/i, "i-plus"], [/karung|bronjong/i, "b-longsor"], [/evakuasi|perahu/i, "k-perahu"], [/alat berat/i, "k-alat"], [/lainnya/i, "i-tambah-teks"], [/belum/i, "i-centang"]].find(([r]) => r.test(o))?.[1] || bawaan;
export const ikonSub = o => [[/luapan sungai/i, "b-sungai"], [/genangan/i, "b-genangan"], [/bandang/i, "b-bandang"], [/banjir rob/i, "b-rob"], [/lahar/i, "b-lahar"], [/tanggul|waduk|bendungan/i, "b-tanggul"]].find(([r]) => r.test(o))?.[1];
export const bertingkat = ps => { const p = ps.filter(x => !/tidak tahu|ragu|lainnya/i.test(x)); return p.length >= 2 && (p.every(x => /^(tidak ada|sedikit|sedang|banyak|sangat banyak|ringan|berat|rendah|tinggi|kecil|besar)$/i.test(x)) || p.every(x => /^(sekitar |lebih dari |kurang dari )?[\d,.]+/i.test(x))); };
export const ikonOpsi = o => [
  // hubungan dan jenis kelamin berikon sendiri (pemilik 26 Nov 2026: "Ini iconnya kok sama semua?")
  [/^anak\b/i, "i-anak"], [/^orang tua/i, "i-ortu"], [/^(suami|istri)/i, "i-pasangan"], [/^(saudara|kerabat|keluarga)/i, "i-saudara"], [/^(teman|tetangga)/i, "i-tetangga"],
  [/^(laki-laki|pria)$/i, "i-laki"], [/^(perempuan|wanita)$/i, "i-perempuan"], [/^lainnya$/i, "i-daftar"],
  // dicocokkan dengan pertanyaannya (pemilik 25 Nov 2026: "cari kesesuaian icon dan pertanyaan"); null = skala bertingkat berbatang
  [/^SIG |menutupi tanah/i, null], [/^pelan, sedikit/i, "k-air-naik"], [/merayap/i, "b-longsor"], [/\d+\s*jam\b|setengah hari|sehari|seperempat|setengah jam|minggu|kali ini/i, "k-jam"],
  [/^bisa dilewati/i, "k-jalan"], [/^terputus/i, "i-tutup"], [/^sudah tenang/i, "i-centang"], [/reda dan cerah/i, "b-matahari"], [/^antre/i, "i-orang"], [/tempat jauh/i, "i-lokasi"], [/tertimpa atau terjepit/i, "i-orang"], [/^mulai sulit/i, "k-air-turun"],
  [/lahan kosong|pekarangan/i, "k-daun"], [/membakar/i, "b-api"], [/sangat kering/i, "b-matahari"], [/tidak mengancam/i, "i-centang"], [/getaran|hentakan/i, "b-gempa"], [/detik/i, "k-jam"], [/lari keluar/i, "i-pengungsian"], [/sembako|paket pangan/i, "k-makan"], [/hewan|ternak/i, "k-daun"], [/dentuman|ledakan/i, "b-gunung"], [/kendaraan/i, "k-jalan"], [/kebakaran|lava|belerang/i, "b-api"], [/ikan|biota/i, "b-gelombang"], [/sirene|kentongan/i, "i-sirene"], [/hidran/i, "b-banjir"],
  [/^masih naik|naik cepat/i, "k-air-naik"], [/hitungan menit/i, "k-jam"], [/^bertahan/i, "k-air-tetap"], [/^mulai surut/i, "k-air-turun"], [/^sudah surut/i, "k-air-surut"],
  [/laut pasang/i, "b-rob"], [/tanggul|talud|pintu air|bendungan/i, "b-tanggul"], [/dari arah hulu|tiba-tiba, deras/i, "b-bandang"],
  [/semua kendaraan/i, "k-jalan"], [/motor dan pejalan/i, "i-orang"], [/^putus/i, "i-tutup"], [/^masih cukup/i, "i-centang"], [/^tidak ada air/i, "i-tutup"],
  [/orang tertimbun|warga masih|ternak hanyut/i, "i-orang"], [/arus deras/i, "b-bandang"], [/gemuruh/i, "b-gempa"], [/kendaraan tertimpa/i, "k-jalan"], [/pohon/i, "k-daun"],
  [/^masih bergerak/i, "b-longsor"], [/^sudah berhenti/i, "i-centang"], [/^masih tinggi|surut mendadak|terkikis|garis pantai|sampah laut|bibir pantai/i, "b-gelombang"], [/^masih berlangsung/i, "k-jam"],
  [/awan|gelap/i, "b-hujan"], [/dingin|angin/i, "b-angin"], [/gerah|panas/i, "b-matahari"], [/petir|kilat/i, "b-petir"], [/^hujan/i, "b-hujan"], [/retak|menggantung|miring/i, "b-gempa"], [/dinding|bangunan/i, "b-gedung"], [/peringatan/i, "i-sirene"],
  [/^ganti/i, "i-orang"], [/^benar|^ya\b|^setuju|kirim/i, "i-centang"], [/^bukan|^tidak setuju|batal/i, "i-tutup"], [/tidak tahu|ragu/i, "i-bantuan"],
  [/tanpa foto|lanjut/i, "i-panah"], [/ubah/i, "i-daftar"], [/lokasi|desa|gps/i, "i-lokasi"], [/foto/i, "i-kamera"],
  [/petir/i, "b-petir"], [/hujan es|butiran es/i, "b-es"], [/hujan|kemarau/i, "b-hujan"], [/angin|puting|siklon/i, "b-angin"],
  [/permukiman/i, "i-rumah"], [/jauh ke darat|darat/i, "i-lokasi"], [/pantai saja/i, "b-gelombang"], [/gempa kuat terasa/i, "b-gempa"],
  [/surut|turun|mereda|berhenti|padam/i, "k-turun"], [/naik|masih/i, "k-naik"],
  [/sungai|meluap|tanggul|bendungan|pasang|genang|air|sumur|banjir|tsunami|gelombang|pantai|ombak/i, "b-banjir"],
  [/tanah|lereng|tebing|longsor|timbun/i, "b-longsor"], [/pohon|sawah|kebun|tanaman|ternak|semak/i, "k-daun"], [/listrik|korsleting|baliho|tiang/i, "k-listrik"],
  [/api|terbakar|gambut|hutan|asap|kompor|gas/i, "b-api"], [/guncang|gempa|retak|roboh/i, "b-gempa"], [/abu|erupsi|awan panas|lahar|batu|kerikil|kawah/i, "b-gunung"],
  [/toko|gedung|kantor|pasar/i, "b-gedung"], [/kampung|dusun/i, "i-rumah"], [/satu titik|titik/i, "i-lokasi"], [/rumah|atap/i, "i-rumah"], [/jalan/i, "i-lokasi"], [/mengungsi|tempat tinggi|warga/i, "i-pengungsian"],
  [/menit|bulan|sejak|lama|berlangsung/i, "k-jam"], [/bantuan|beli|membeli|mengambil/i, "i-kebutuhan"], [/tidak ada|tanpa/i, "i-centang"]].find(([r]) => r.test(o))?.[1];
