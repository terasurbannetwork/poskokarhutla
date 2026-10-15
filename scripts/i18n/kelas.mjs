/* Pengelompok kata ID/EN untuk crawler bahasa (kumpul.mjs) dan penilai ulang (skor.mjs). */
/* ---------- pengelompok kata: daftar kata fungsi + kosakata UI yang TIDAK sama ejaannya di kedua bahasa.
   Kata pinjaman yang sah di KBBI (data, status, model, total, area, level, tren, nama satuan) tidak dihitung Inggris. */
const kata = s => new Set(s.trim().split(/\s+/));
export const KATA_ID = kata(`dan yang di ke dari untuk dengan tidak ini itu atau pada oleh sebagai dalam akan bisa belum sudah adalah juga karena agar jika bila
  saat tiap setiap seluruh masih lebih kurang tanpa hingga sampai sejak antara selain hanya paling sekitar menurut bukan serta namun tetapi maka telah
  hari jam minggu pekan bulan tahun titik panas lahan hutan kebakaran wilayah kecamatan kabupaten provinsi desa jumlah luas sumber lihat buka tutup unduh
  cari semua terbaru kemarin sekarang baru tinggi rendah sedang siaga awas waspada peta berita dampak simulasi metode lapor warga laporan perkiraan orang
  regu kompleks asap udara gambut sawit kawasan musim hujan kering angin suhu kelembapan risiko bahaya naik turun dibanding rincian ringkasan pembaruan
  diperbarui terakhir puncak kenaikan penurunan menit detik tanggal tingkat kelas jenis nilai angka terdekat jarak penduduk jiwa terdampak rumah sekolah
  kasus perusahaan konsesi izin tindakan disarankan lokasi cuaca riwayat peringkat teratas satelit citra lapisan legenda bagikan salin tautan kirim pesan
  tentang privasi lipat persen banyak sedikit mulai selesai peluang kemungkinan aktif padam sebaran arah kecepatan hektare sumur pompa banjir longsor
  prakiraan keputusan sarana memuat gagal pilih tampilkan sembunyikan areal luar dalam perkebunan pemadaman patroli pencegahan prioritas personel
  terbakar bentuk indikatif utama berpotensi membesar peringatan dini kemarau rawan sungai debit
  situasi nasional kesiapan keadaan kondisi pemantauan bawaan permanen jt rb tayangan pengunjung halaman dibaca sejak perayap
  januari februari maret mei juni juli agustus oktober desember okt agu agt des senin selasa rabu kamis jumat sabtu`);
export const KATA_EN = kata(`the and of to in for with from by on at is are was were be been this that these those not or as it its has have had will can could
  would should more less than which who what when where how all any each today yesterday show hide view open close download share search back next previous
  loading copy copied send message feedback about privacy settings theme dark light layer layers legend satellite map maps trend trends impact impacts method
  methods news report reports source sources week weeks day days hour hours month months year years people land fire fires hotspot hotspots risk high low
  medium update updated last new latest estimate estimated forecast count number chart page link score rate rates oil palm pulp pulpwood wood timber logging
  mining concession concessions plantation peat peatland burned burnt burn alert warning watch priority patrol prevention district districts regency
  province provinces village villages smoke quality weather rain rainfall wind humidity temperature danger hazard crew crews command post posts simulation
  spread complex complexes outside inside none unknown other others click tap here see read full summary details detail average only also just still now
  since until between after before around over under into if then but yes you your we our they their please online offline insight dashboard
  january february march june july august october december aug oct dec monday tuesday wednesday thursday friday saturday sunday`);
/* nama diri / nama sumber data yang memang berbahasa Inggris (atau Indonesia) dan tidak diterjemahkan: dibuang sebelum dihitung */
const NAMA_DIRI = /(?:Google|ANTARA|Yahoo|NST|Asia) News(?: RSS| \p{Lu}\p{L}+)?|ArcGIS Online|Pontianak Post|Banjir Rob|\(burned area\)|\b[\w-]+\.(?:com|co\.id|go\.id|org|net)\b|\b\w+_\w+\b|Global Forest Watch|Fire Weather Index|Fire Information for Resource Management System|NASA FIRMS|Open[- ]Meteo(?: Forecast| Marine| Ensemble| Flood)?(?: API)?|Contains modified Copernicus Sentinel data|Corrected Reflectance|Earth Search|AWS Open Data|Worldview|GFW Global peatland extent|Bull WHO|\bWHO\b|The (?:Star|Straits Times|Edge Malaysia|Independent Singapore|Jakarta Post|Mighty \d+ \w+)|\bInsight\b|\bDashboard\b|\(hotspot\)|OpenStreetMap|Copernicus|Sentinel-?\d?\w*|Google( Earth)?|World Bank|Nusantara Atlas|Trase|Climate Hazards[\w ]*|Global Flood Awareness System|Fire Danger|Air Quality|Earth Engine|Land ?sat|Pantau Bencana|Posko Karhutla|Lapor Warga|U\.S\. Department of State|YSEALI|Manggala Agni|Masyarakat Peduli Api|Teras Urban( Network)?|Claude|ChatGPT|Perplexity|Indonesia wood pulp concessions?( v\d)?|Taman Nasional [\p{Lu}][\p{L} ]+|Sungai [\p{Lu}]\p{L}+|Kota [\p{Lu}]\p{L}+|Desa [\p{Lu}]\p{L}+|Hulu Sungai \p{L}+|Kecamatan [\p{Lu}]\p{L}+|Kabupaten [\p{Lu}]\p{L}+/gu;
/* label navigasi yang sengaja dipilih pemilik (nama bagian, bukan kalimat) */
export const NAV_SAH = new Set(["Dashboard", "Insight"]);
export function kelas(t) {
  if (NAV_SAH.has(t.trim())) return {id: 0, en: 0};
  const u = t.replace(NAMA_DIRI, " ").replace(/https?:\/\/\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:go\.id|co\.id|com|org|net|id)\/\S*|\S+@\S+|\S*\/\S*\.(?:json|js|csv|md|html|py|geojson)\b|\b[\w*-]+\.(?:json|js|csv|md|html|py|geojson)\b/g, " ").match(/(?<![\p{L}\d])\p{L}+(?:-\p{L}+)?/gu) || [];
  /* frasa pendek Bertajuk Kapital (≤ 4 kata) = nama tempat/lembaga ("Mekar Baru", "Pondok Tinggi", "ANTARA News"); singkatan kapital ≤ 3 huruf ("DI", "KE") bukan kata */
  if (u.length <= 4 && u.length > 1 && u.every(x => /^\p{Lu}/u.test(x)) && !KATA_ID.has(u[0].toLowerCase()) && !KATA_EN.has(u[0].toLowerCase())) return {id: 0, en: 0};
  const w = u.filter(x => !(x.length <= 3 && x === x.toUpperCase())).map(x => x.toLowerCase());
  let id = 0, en = 0;
  for (const x of w) { if (KATA_ID.has(x)) id++; if (KATA_EN.has(x)) en++; }
  /* kata tunggal yang sama-sama dipakai ("Siaga" tidak, tapi "in"/"on" di tengah singkatan) tidak cukup sendiri: teks satu kata dinilai utuh */
  return {id, en};
}

/* node scripts/i18n/kelas.mjs  -> cek cepat pengelompok */
if (import.meta.url === `file://${process.argv[1]}`) {
  const cek = (t, id, en) => { const k = kelas(t); if (!!k.id !== id || !!k.en !== en) throw new Error(`kelas(${JSON.stringify(t)}) = ${JSON.stringify(k)}, harap id=${id} en=${en}`); };
  cek("Konsesi oil palm", true, true); cek("Konsesi sawit", true, false); cek("Oil palm concession", false, true); cek("Data FIRMS", false, false);
  cek("Total 1.234 titik panas", true, false); cek("Sumber: Global Forest Watch", true, false); cek("Source: Global Forest Watch", false, true);
  cek("Kalimantan Tengah", false, false); cek("Show DI Yogyakarta", false, true); cek("Mekar Baru", false, false); cek("Score per regency (scripts/banjir/riwayat.py)", false, true); cek("Dashboard", false, false); cek("Hari ini", true, false); cek("Today", false, true); cek("14 Okt", true, false); cek("14 Oct", false, true);
  console.log("kelas(): ok"); process.exit(0);

}
