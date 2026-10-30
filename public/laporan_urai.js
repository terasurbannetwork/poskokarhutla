/* laporan_urai.js: pengurai bahan Pusdalops untuk /laporan-bnpb.
   Murni, tanpa DOM, diuji di node (tests/warga/laporan_urai.test.mjs).

   Dua bentuk bahan yang dipakai Dit. Koordalops tiap hari:
     1. REKAP WA  "Mohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal .. pkl .. WIB s.d .."
        -> ringkas: per provinsi, per kejadian, 5 medan (Dampak, Penetapan status, Pendampingan BNPB, Kondisi mutakhir, Detail).
     2. LAPHAR    "Laporan Harian Dit. Koordalops BNPB DDMMYYYY" (DOCX dicetak PDF)
        -> lengkap: bagian A (entri rinci, medan ➢ Label:) dan bagian I "Rekapitulasi berdasarkan SK Darurat"
           (tabel status darurat per daerah; satu-satunya sumber bagian status daerah).

   Keduanya deterministik: tanpa model, tanpa jaringan. Model (Workers AI) hanya dipanggil layar
   untuk teks yang TIDAK dikenali bentuknya di sini -- lihat src/laporan_urai.js.

   Tabel bagian I tidak bisa diurai per baris: satu baris logis pecah jadi 2-6 baris cetak dan
   selnya hanya dibedakan oleh POSISI MENDATAR. Jadi baris kepala tabel dibaca dulu untuk
   mengambil kolom tiap label, lalu baris di bawahnya diiris memakai kolom itu. Teks PDF wajib
   datang dalam tata letak berjarak (pdftotext -layout, atau tataLetak() di bawah untuk pdf.js). */
(() => {
const ZW = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g;   // zero width Google Docs ("A.<zwsp> Kejadian") dan word joiner rekap WA ("1.<wj> <wj>")
const rapi = s => String(s ?? "").replace(ZW, "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
const polos = s => String(s ?? "").replace(ZW, "").replace(/ /g, " ").replace(/\*/g, "").trim();
const angkaId = s => { const t = String(s).replace(/[^\d.,]/g, ""); if (!t) return null; const v = Number(t.replace(/\./g, "").replace(",", ".")); return Number.isFinite(v) ? v : null; };

/* ---------------------------------------------------------------- provinsi */
const ALIAS = {"ntt": "nusa tenggara timur", "ntb": "nusa tenggara barat", "diy": "daerah istimewa yogyakarta", "di yogyakarta": "daerah istimewa yogyakarta",
  "dki": "dki jakarta", "dk. jakarta": "dki jakarta", "dk jakarta": "dki jakarta", "daerah khusus jakarta": "dki jakarta", "jakarta": "dki jakarta",
  "di. yogyakarta": "daerah istimewa yogyakarta", "d.i yogyakarta": "daerah istimewa yogyakarta", "d.i. yogyakarta": "daerah istimewa yogyakarta", "babel": "kepulauan bangka belitung", "kepri": "kepulauan riau", "sulsel": "sulawesi selatan", "sulut": "sulawesi utara",
  "sulteng": "sulawesi tengah", "sultra": "sulawesi tenggara", "sulbar": "sulawesi barat", "kalteng": "kalimantan tengah", "kalsel": "kalimantan selatan",
  "kalbar": "kalimantan barat", "kaltim": "kalimantan timur", "kaltara": "kalimantan utara", "sumsel": "sumatera selatan", "sumut": "sumatera utara",
  "sumbar": "sumatera barat", "jabar": "jawa barat", "jateng": "jawa tengah", "jatim": "jawa timur", "papua barat daya": "papua barat daya"};
/* kodeProv(nama, prov): prov = {kode: "Nama"} dari /data/laporan.json. Tak dikenal = "" (tidak pernah melempar: teks dari luar). */
function kodeProv(nama, prov) {
  let n = polos(nama).replace(/^(Prov(insi)?\.?|Wilayah)\s*/i, "").replace(/\s+/g, " ").toLowerCase().replace(/[.,;]$/, "");
  n = n.replace(/^kep\.\s*/, "kepulauan ");
  n = ALIAS[n] || n;
  const baku = v => String(v).toLowerCase().replace(/^kep\.\s*/, "kepulauan ").replace(/^di\s+/, "daerah istimewa ");
  for (const [k, v] of Object.entries(prov || {})) if (baku(v) === n) return k;
  /* kolom tabel kadang kemasukan sepotong sel tetangga ("Banjir Prov. Sumatera Barat"): cari nama
     provinsi terpanjang yang muncul di dalamnya, supaya baris itu tidak kehilangan provinsinya. */
  let pilih = "", pjg = 0;
  for (const [k, v] of Object.entries(prov || {})) { const t = baku(v); if (t.length > pjg && n.includes(t)) { pilih = k; pjg = t.length; } }
  return pilih;
}

/* ---------------------------------------------------------------- jenis bencana */
/* Urutan diperiksa dari yang paling khusus: "Kebakaran TPA" dan "kebakaran permukiman" mengandung kata
   "kebakaran" juga, dan "Banjir Bandang dan Tanah Longsor" harus jatuh ke banjir, bukan longsor. */
const POLA_JENIS = [
  [/\bTPA\b|tempat pembuangan akhir/i, "lainnya"],
  [/kebakaran (permukiman|pemukiman|rumah)/i, "kebakaran_permukiman"],
  [/karhutla|hutan dan lahan|hutan\/lahan|kebakaran hutan|kebakaran lahan/i, "karhutla"],
  [/kekeringan/i, "kekeringan"],
  [/gempa/i, "gempabumi"],
  [/tsunami/i, "gempabumi"],
  [/banjir/i, "banjir"],
  [/longsor/i, "longsor"],
  [/erupsi|gunung ?api|vulkan/i, "gunungapi"],
  [/cuaca ekstrem|cuaca ekstrim|angin kencang|puting beliung|gelombang|abrasi/i, "cuaca"],
];
const jenisDari = judul => (POLA_JENIS.find(([re]) => re.test(judul)) || [, "lainnya"])[1];

/* tempat di judul: teks sesudah " di " terakhir yang masih menyebut wilayah; "Prov. X" = tingkat provinsi (tempat kosong) */
const PRA_WILAYAH = /^(Kab\.|Kabupaten|Kota|Prov\.|Provinsi|Kec\.|Kecamatan|Kel\.|Desa|Ds\.|Kawasan|Pulau|Gunung|Gn\.|TN|TPA|Taman)\b/i;
function tempatDari(judul) {
  const bag = polos(judul).split(/\s+di\s+/i);
  /* format Pusdalops lama tanpa "di": "Banjir Bandang Kab. Agam, Prov. Sumatera Barat" -> mulai dari Kab./Kota/Prov. pertama */
  if (bag.length < 2) {
    const w = polos(judul).search(/\b(Kab\.|Kabupaten|Kota|Prov\.|Provinsi)\s/i);
    if (w < 0) return {tempat: "", prov_teks: ""};
    bag.splice(0, 1, polos(judul).slice(0, w), polos(judul).slice(w));
  }
  let sisa = bag.slice(1).join(" di ").trim().replace(/[.,;]$/, "");
  let prov_teks = "";
  const m = sisa.match(/,\s*(Provinsi|Prov\.)\s+(.+)$/i);                 // "… di Kab. X, Provinsi Y"
  if (m) { prov_teks = m[2].trim(); sisa = sisa.slice(0, m.index).trim(); }
  if (/^(Prov\.|Provinsi)\s+/i.test(sisa)) { prov_teks ||= sisa.replace(/^(Prov\.|Provinsi)\s+/i, ""); sisa = ""; }
  return {tempat: sisa, prov_teks};
}
/* nama kab/kota tanpa prefiks, untuk kolom "lokasi" di tabel kejadian */
const tanpaPrefiks = t => polos(t).replace(/^(Kab\.|Kabupaten|Kota)\s+/i, "").trim();

/* ---------------------------------------------------------------- status penetapan */
const RE_MACAM = /(Transisi(\s+Darurat)?(\s+ke\s+Pemulihan)?|Tanggap\s+Darurat|Siaga\s+Darurat|Keadaan\s+Darurat|Darurat\s+Bencana)/i;
const RE_TMT = /TMT\s*:?\s*([0-9A-Za-z .\/]+?)\s*(?:s\.?\s?d\.?|s\/d|sd\.?|sampai(?:\s+dengan)?)\s*([0-9A-Za-z .\/]+?)(?=[.,;)\n]|$)/i;
/* ringkasStatus(teks) -> "Siaga Darurat TMT 13/02/2026 s.d 30/11/2026" atau "" bila tak ada penetapan di teks.
   Dipakai untuk mengisi kolom Penetapan status pada rekap, dari blok Status laphar yang berupa prosa SK. */
function ringkasStatus(teks) {
  const t = rapi(teks); if (!t) return "";
  const m = t.match(RE_MACAM), w = t.match(RE_TMT);
  if (!m && !w) return "";
  const macam = m ? m[1].replace(/\s+/g, " ").replace(/^transisi$/i, "Transisi Darurat") : "Status darurat";
  const perpanjangan = /perpanjangan/i.test(t) ? "Perpanjangan " : "";
  return w ? `${perpanjangan}${macam} TMT ${w[1].trim()} s.d ${w[2].trim()}` : `${perpanjangan}${macam}`;
}

/* ================================================================ 1. rekap WA */
const RE_PERIODE = /tanggal\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*pkl\.?\s*([\d.:]+)\s*WIB\s*s\.?\s?d\.?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*pkl\.?\s*([\d.:]+)/i;
const RE_GRUP = /^\*?\s*([A-Z])\.\s*(?:Prov(?:insi)?\.?\s*)?(.+?)\s*\*?$/;
const RE_ENTRI = /^(\d+)\.\s*(.+)$/;
const RE_MEDAN = /^[-–•]\s*([A-Za-z][A-Za-z /]{2,28}?)\s*:\s*(.*)$/;
const MEDAN_WA = {dampak: "dampak", "penetapan status": "status_penetapan", "pendampingan bnpb": "pendampingan",
  "kondisi mutakhir": "kondisi", "kondisi terkini": "kondisi", detail: "_detail"};
const isoDari = d => { const m = String(d).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}` : ""; };

function uraiWa(teks, prov) {
  const baris = String(teks ?? "").replace(ZW, "").split(/\r?\n/);
  const hasil = {bentuk: "wa", mulai: "", sampai: "", jam: "", laporan_masuk: null, menonjol: null, kepada: "", koordinator: "", kejadian: [], lewat: []};
  const utuh = baris.join("\n");
  const p = utuh.match(RE_PERIODE);
  if (p) { hasil.mulai = isoDari(p[1]); hasil.sampai = isoDari(p[3]); hasil.jam = p[2].replace(":", "."); }
  const lm = utuh.match(/Laporan kejadian bencana sejumlah\s*±?\s*([\d.]+)/i); if (lm) hasil.laporan_masuk = angkaId(lm[1]);
  const mn = utuh.match(/Kejadian menonjol[^\n]*?sejumlah\s*±?\s*([\d.]+)/i); if (mn) hasil.menonjol = angkaId(mn[1]);
  const kp = utuh.match(/^\s*\*?\s*Yth\.?\s*(.+?)\s*\*?\s*$/mi); if (kp) hasil.kepada = polos(kp[1]);
  const kd = utuh.match(/Koordinator pembuat laporan\s*:\s*(.+)/i); if (kd) hasil.koordinator = polos(kd[1]);

  let kodeSekarang = "", namaSekarang = "", k = null, medan = null;
  const tutup = () => { if (k) hasil.kejadian.push(k); k = null; medan = null; };
  for (const b0 of baris) {
    const b = rapi(b0);
    if (!b) { medan = null; continue; }
    const g = b.match(RE_GRUP);
    /* kepala grup: "*A. Prov. Riau*". Harus bertanda bintang ATAU menyebut Prov. supaya tidak menelan
       butir "A. Kejadian Bencana" pada bahan lain. */
    if (g && (/\*/.test(b0) || /Prov/i.test(b)) && !/^\d/.test(g[2])) {
      const kode = kodeProv(g[2], prov);
      if (kode || /Prov/i.test(b)) { tutup(); kodeSekarang = kode; namaSekarang = polos(g[2]); if (!kode) hasil.lewat.push(`provinsi tidak dikenal: ${namaSekarang}`); continue; }
    }
    const e = b.match(RE_ENTRI);
    if (e && !RE_MEDAN.test(b) && /[A-Za-z]{4}/.test(e[2]) && !/^(Laporan|Kejadian menonjol)/i.test(e[2])) {
      tutup();
      const judulMentah = polos(e[2]);
      const sf = judulMentah.match(/\((Kejadian Baru|Pengkinian Data)\)/i);
      const judul = judulMentah.replace(/\s*\((Kejadian Baru|Pengkinian Data)\)\s*/i, " ").trim();
      const {tempat, prov_teks} = tempatDari(judul);
      const kode = kodeSekarang || kodeProv(prov_teks, prov);
      k = {jenis: jenisDari(judul), prov: kode, lokasi: tanpaPrefiks(tempat), tempat, judul, sifat: sf ? sf[1] : "",
        dampak: "", status_penetapan: "", pendampingan: "", kondisi: "", entry_no: null, sumber_urai: "wa"};
      if (!kode) hasil.lewat.push(`provinsi kosong untuk: ${judul}`);
      continue;
    }
    if (!k) continue;
    const m = b.match(RE_MEDAN);
    if (m) {
      const kunci = MEDAN_WA[polos(m[1]).toLowerCase().replace(/\s+/g, " ")];
      medan = kunci || null;
      if (!kunci) continue;
      if (kunci === "_detail") { const en = m[2].match(/Entry\s+(?:no|nomor)\.?\s*0*(\d+)/i); if (en) k.entry_no = Number(en[1]); medan = null; continue; }
      k[kunci] = polos(m[2]).replace(/^-$/, "");
      continue;
    }
    if (medan && medan !== "_detail") k[medan] = (k[medan] ? k[medan] + " " : "") + polos(b);
  }
  tutup();
  for (const x of hasil.kejadian) x.status = statusDari(x.kondisi, !x.lokasi);
  return hasil;
}

/* status operasional dari kalimat Kondisi mutakhir (sama dengan generator Python wa_harian.status_dari):
   belum = masih ditangani; selesai = padam/surut; selain itu berjalan. Sisa > 0 ha di tingkat provinsi = berjalan
   (sisanya tersebar di banyak lokasi), di tingkat kabupaten = belum. */
function statusDari(kondisi, tingkatProv) {
  const k = polos(kondisi).toLowerCase();
  if (!k) return "berjalan";
  /* Sisa luas diperiksa LEBIH DULU daripada kata kunci: kalimat rekap provinsi hampir selalu berbunyi
     "sisa ... yang masih dalam penanganan ± N ha", dan kata "masih" di situ bukan berarti satu lokasi
     belum tertangani -- sisanya tersebar di banyak kabupaten dan penanganannya berjalan. */
  const m = k.match(/sisa[^,.]*?±?\s*([\d.,]+)\s*ha/);
  if (m && (angkaId(m[1]) || 0) > 0) return tingkatProv ? "berjalan" : "belum";
  if (/masih dilakukan|masih dalam|masih pemadaman|belum padam|belum dapat|pendinginan|muncul kembali|belum selesai/.test(k)) return "belum";
  if (/berhasil dipadamkan|berhasil di dipadamkan|sudah padam|telah padam|sudah surut|telah surut|sudah terkendali/.test(k)) return "selesai";
  return "berjalan";
}

/* ================================================================ 2. laphar (dokumen) */
/* Label ➢ di bagian A, dengan semua ejaan yang benar-benar muncul pada laphar 20-24 Okt 2026. */
const MEDAN_LAPHAR = [
  [/^update/i, "update"], [/^kronolog/i, "kronologi"], [/^lokasi/i, "lokasi_rinci"],
  [/^korban/i, "korban"], [/^pengungsi/i, "pengungsi"], [/^kerugian/i, "kerugian"],
  [/^(upaya|giat bnpb)/i, "upaya"], [/^kebutuhan/i, "kebutuhan"], [/^kendala|^hambatan/i, "kendala"],
  [/^(unsur|pihak|personil|personel).*terlibat/i, "terlibat"], [/^peralatan|^kekuatan satgas|^dukungan alat/i, "peralatan"],
  [/^status/i, "status_sk"], [/^(rekomendasi|saran|kesimpulan)/i, "rekomendasi"],
  [/^kondisi mutakhir/i, "kondisi"], [/^dokumentasi/i, "dokumentasi"], [/^sumber/i, "sumber"],
];
const kunciLaphar = label => (MEDAN_LAPHAR.find(([re]) => re.test(label)) || [])[1] || "";
const RE_LABEL_LAPHAR = /^[➢>»]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ /()&.]{2,40}?)\s*(?::\s*(.*))?$/;   // "➢ Giat BNPB" kadang tanpa titik dua
const RE_LABEL_POLOS = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ /()&.]{2,40}?)\s*:\s*(.*)$/;      // "Sumber:" dan "Kebutuhan Mendesak:" kadang tanpa ➢
const RE_ENTRI_LAPHAR = /^\s*(\d{1,3})\.\s*([A-Z].*)$/;
const RE_SEKSI = /^\s*([A-Z])\.\s+([A-Z].{2,60})\s*$/;
/* judul entri selalu dibuka kata jenis kejadian. Butir di dalam entri ("4. Ds Mentawak ulu …") tidak,
   dan menjorok jauh ke kanan -- dua syarat itu yang memisahkan entri dari isi. */
const RE_JUDUL_ENTRI = /^(Bencana|Kebakaran|Karhutla|Banjir|Gempa|Kekeringan|Tanah Longsor|Longsor|Cuaca|Erupsi|Angin|Abrasi|Gelombang|Hidrometeorologi|Aktivitas)\b/i;
const MAKS_JOROK_ENTRI = 24;
/* laphar Pusdalops lama kadang berjudul wilayah saja ("3. Kab. Aceh Tamiang, Prov. Aceh"). Diterima hanya bila nomornya
   tepat lanjutan entri sebelumnya DAN menyebut provinsi -- daftar kab bernomor di dalam entri tidak memenuhi keduanya. */
const RE_JUDUL_WILAYAH = /^(Kab\.|Kabupaten|Kota)\s.+,\s*(Prov\.|Provinsi)\s*\S/i;

function uraiLaphar(teks, prov, items) {
  const baris = String(teks ?? "").replace(ZW, "").replace(/ /g, " ").split(/\r?\n/);
  const hasil = {bentuk: "laphar", tanggal: "", mulai: "", sampai: "", jam: "", kejadian: [], status_daerah: [], lewat: []};
  const utuh = baris.map(rapi).join("\n");     // spasi ganda dari tata letak PDF dirapatkan dulu
  const per = utuh.match(/sejak hari \w+,\s*(\d{1,2}\s+\w+\s+\d{4})\s*pukul\s*([\d.]+)\s*WIB\s*sampai\s*(?:dengan\s*)?hari \w+,\s*(\d{1,2}\s+\w+\s+\d{4})\s*pukul\s*([\d.]+)/i);
  if (per) { hasil.mulai = isoBulan(per[1]); hasil.sampai = isoBulan(per[3]); hasil.jam = per[2]; }
  const jd = utuh.match(/LAPORAN HARIAN\s*\n\s*\w+,\s*(\d{1,2}\s+\w+\s+\d{4})/i); if (jd) hasil.tanggal = isoBulan(jd[1]);

  /* --- bagian A: entri --- */
  let i = baris.findIndex(b => /^A\.\s*Kejadian Bencana$/i.test(rapi(b)));
  if (i < 0) i = 0; else i++;
  let k = null, kunci = "", judulBuka = false, noTerakhir = 0;
  const tutup = () => {
    if (!k) return;
    k.judul = rapi(k.judul);
    const {tempat, prov_teks} = tempatDari(k.judul);
    k.jenis = jenisDari(k.judul); k.tempat = tempat; k.lokasi = tanpaPrefiks(tempat);
    k.prov = kodeProv(prov_teks, prov) || kodeProv(tempat, prov);
    const rek = (k.lokasi_rinci || "").match(/^\(([^)]*(?:Kecamatan|Kab|Kota|Desa|Kel)[^)]*)\)/i);
    if (rek) k.lokasi_rekap = rek[1].trim();
    k.status_penetapan = ringkasStatus(k.status_sk);
    k.dampak = ringkasDampak(k);
    k.status = statusDari(k.kondisi, !k.lokasi);
    if (!k.prov) hasil.lewat.push(`provinsi kosong untuk: ${k.judul.slice(0, 70)}`);
    hasil.kejadian.push(k); k = null; kunci = ""; judulBuka = false;
  };
  for (; i < baris.length; i++) {
    const b0 = baris[i], b = rapi(b0);
    if (!b) continue;
    const sk = b.match(RE_SEKSI);
    /* laphar Jan-Apr 2026 (format Pusdalops lama) menutup bagian A dengan "B. Bencana Indonesia", "D. Pantauan Gunung Api",
       "F. Prakiraan Cuaca oleh BMKG"; judul seksinya lain, hurufnya juga lain */
    if (sk && !/^A$/.test(sk[1]) && /Rekapitulasi|Infografis|Bencana Indonesia|Pantauan Gunung|Prakiraan Cuaca|Laporan Aktivitas|Laporan Meteorologi|Komunikasi Radio|Petugas Piket|Analisis/i.test(sk[2])) { tutup(); break; }
    const e = b.match(RE_ENTRI_LAPHAR);
    if (e && (RE_JUDUL_ENTRI.test(e[2]) || (Number(e[1]) === noTerakhir + 1 && RE_JUDUL_WILAYAH.test(e[2]))) && Number(e[1]) > noTerakhir && b0.search(/\S/) <= MAKS_JOROK_ENTRI && !RE_LABEL_LAPHAR.test(b)) {
      tutup(); noTerakhir = Number(e[1]); k = {judul: e[2], sifat: "", entry_no: noTerakhir, sumber_urai: "laphar"}; judulBuka = true; continue;
    }
    if (!k) continue;
    const m = b.match(RE_LABEL_LAPHAR) || (/^[➢>»]/.test(b) ? null : b.match(RE_LABEL_POLOS));
    if (m && (kunciLaphar(m[1]) || /^[➢>»]/.test(b))) {
      judulBuka = false; kunci = kunciLaphar(m[1]);
      if (!kunci) { kunci = ""; continue; }
      k[kunci] = (k[kunci] ? k[kunci] + " " : "") + rapi(m[2] || "");
      continue;
    }
    if (judulBuka && !/^[●•\-➢]/.test(b)) { k.judul += " " + b; continue; }   // judul membungkus ke baris berikutnya
    if (kunci) k[kunci] = ((k[kunci] || "") + " " + rapi(b).replace(/^[●•]\s*/, "• ")).trim();
  }
  tutup();

  /* --- bagian I: rekap SK darurat --- */
  hasil.status_daerah = items ? uraiSkDarurat(items, prov) : [];
  if (!items) hasil.lewat.push("tabel status daerah hanya terbaca dari unggahan PDF (butuh koordinat), bukan dari teks tempelan");
  return hasil;
}

const BULAN_ID = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
/* singkatan yang benar-benar dipakai petugas di kolom masa status: "Ags", "Okt", "Nop", "Peb", "Des" */
const BULAN_SINGKAT = {jan: 0, peb: 1, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5, jul: 6, ags: 7, agt: 7, agu: 7, sep: 8, okt: 9, oct: 9, nov: 10, nop: 10, des: 11, dec: 11};
function isoBulan(s) {
  const m = rapi(s).match(/(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})/); if (!m) return "";
  const p = m[2].toLowerCase().slice(0, 3), bl = p in BULAN_SINGKAT ? BULAN_SINGKAT[p] : BULAN_ID.findIndex(x => x.startsWith(p));
  return bl < 0 ? "" : `${m[3]}-${String(bl + 1).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}
/* dampak ringkas untuk rekap: angka korban/kerugian yang paling sering dipakai Koordalops */
function ringkasDampak(k) {
  const sumber = [k.korban, k.kerugian, k.pengungsi].map(x => rapi(x)).filter(Boolean).join(" ");
  if (!sumber || /^(Nihil|-)$/i.test(sumber)) return rapi(k.kerugian) === "Nihil" ? "Nihil" : "";
  const potong = sumber.replace(/^•\s*/, "").split(/\s*•\s*/).filter(x => !/^nihil$/i.test(x)).slice(0, 2).join("; ");
  return potong.slice(0, 300);
}

/* ---------------------------------------------------------------- tabel SK darurat (bagian I) */
const KOLOM_SK = [["No.", "no"], ["Jenis Kejadian", "jenis_teks"], ["Prov.", "prov_teks"], ["Kab/Kota", "kabkota"],
  ["Waktu", "waktu_kejadian"], ["Tanggal", "tgl_surat"], ["Siaga", "siaga"], ["Tanggap", "tanggap"], ["Keadaan", "tanggap"], ["Transisi", "transisi"], ["SK Posko", "sk_posko"]];
/* kepala tabel terpecah jadi beberapa baris cetak ("Kejadian"/"Bencana"/"Surat"/"Darurat" menggantung di
   bawahnya). Yang dipakai hanya baris yang memuat "No." DAN "Jenis Kejadian": di situ semua label pokok sebaris.
   "Prov." dicari sesudah "Jenis Kejadian" supaya tidak tertukar dengan kata Prov. di tempat lain. */
const adaKepala = b => /\bNo\.\s/.test(b) && b.includes("Jenis Kejadian");
/* tindih(baris): gabungkan beberapa baris cetak jadi satu kanvas; huruf menang atas spasi. */
function tindih(ls) {
  const lebar = Math.max(...ls.map(s => s.length), 0), out = new Array(lebar).fill(" ");
  for (const s of ls) for (let i = 0; i < s.length; i++) if (s[i] !== " " && out[i] === " ") out[i] = s[i];
  return out.join("");
}
function kolomDariKepala(b) {
  if (!adaKepala(b)) return null;
  const peta = []; let dari = 0;
  for (const [kata, kunci] of KOLOM_SK) {
    const x = b.indexOf(kata, dari);
    if (x < 0) continue;
    peta.push({kunci, x, c: x + kata.length / 2}); dari = x + kata.length;
  }
  return peta.length >= 6 ? peta : null;
}
/* iris(baris, peta) -> {kunci: teks}. Isi sel dicetak RATA TENGAH di kolomnya, jadi batas diambil di
   tengah-tengah antara titik tengah dua label kepala, bukan di awal labelnya. */
function iris(b, peta) {
  const o = {};
  for (let j = 0; j < peta.length; j++) {
    const x0 = j === 0 ? 0 : Math.round((peta[j - 1].c + peta[j].c) / 2);
    const x1 = j === peta.length - 1 ? b.length : Math.round((peta[j].c + peta[j + 1].c) / 2);
    o[peta[j].kunci] = b.slice(x0, x1).trim();
  }
  return o;
}
const RE_KEPALA_GRUP = /^(Lokasi|Waktu Kejadian|Masa Status|Kejadian|Bencana|Surat|Darurat|Tanggap|Keadaan|Siaga|Transisi|SK Posko|Prov\.|Kab\/Kota|Waktu|Tanggal|No\.)([ \t]+(Lokasi|Waktu Kejadian|Masa Status|Kejadian|Bencana|Surat|Darurat|Tanggap|Keadaan|Siaga|Transisi|SK Posko|Prov\.|Kab\/Kota|Waktu|Tanggal))*[ \t]*$/;
/* Tabel bagian I HANYA bisa dibaca dari koordinat, bukan dari teks berjarak.
   Alasannya satu: sel di tabel ini dicetak RATA TENGAH TEGAK, jadi potongan sel sebuah baris berada
   di ATAS dan di BAWAH angka nomornya (laphar 24 Okt, baris 1: 3 baris cetak di atas angka "1.",
   3 di bawah). Menyusun per baris cetak -- atau memisah baris lewat baris kosong -- selalu memotong
   di tempat yang salah, karena jarak 18,5 pt antar-baris tabel kadang juga muncul di dalam satu sel.
   Yang tidak pernah salah: angka nomor SELALU di tengah barisnya, jadi tiap baris cetak dimiliki oleh
   angka nomor yang paling dekat secara tegak. Kolom diambil dari baris kepala tabel yang dicetak ulang
   di tiap halaman, dan tiap kata dimasukkan ke kolom yang titik tengahnya paling dekat.
   items: {x, y, str} seperti pada tataLetak() (y menaik ke bawah, berbeda halaman sudah digeser). */
function barisKoord(items, tol = 2.5) {
  const kata = [];
  for (const it of items || []) {
    const s = String(it.str ?? it.s ?? "").replace(ZW, "").trim(); if (!s) continue;
    const y = Number(it.y), x = Number(it.x); if (!Number.isFinite(y) || !Number.isFinite(x)) continue;
    const w0 = Number(it.w ?? it.width), w = Number.isFinite(w0) && w0 > 0 ? w0 : s.length * 2.6;
    /* pdf.js memberi SATU butir untuk satu runtun teks ("Bencana Banjir Prov. Aceh"), sedangkan kolom
       tabel ditentukan titik tengah tiap kata. Runtun dipecah jadi kata dengan lebar dibagi menurut
       jumlah hurufnya -- hampiran, tapi cukup untuk menjatuhkan tiap kata ke kolom yang benar. */
    if (/\s/.test(s.trim())) {
      let geser = 0;
      for (const b of s.split(/(\s+)/)) {
        const lb = w * b.length / s.length;
        if (b.trim()) kata.push({x: x + geser, y, s: b, w: lb});
        geser += lb;
      }
    } else kata.push({x, y, s, w});
  }
  kata.sort((a, b) => a.y - b.y || a.x - b.x);           // sapu terurut: dokumen laphar puluhan ribu kata
  const per = [];
  for (const w of kata) {
    const l = per.length && Math.abs(per[per.length - 1].y - w.y) <= tol ? per[per.length - 1] : (per.push({y: w.y, kata: []}), per[per.length - 1]);
    l.kata.push({x: w.x, s: w.s, w: w.w, c: w.x + w.w / 2});
  }
  for (const l of per) { l.kata.sort((a, b) => a.x - b.x); l.teks = l.kata.map(k => k.s).join(" "); l.x0 = l.kata[0].x; }
  return per;
}
/* kolom dari baris kepala: baris ber-"No." + "Jenis Kejadian" ditambah baris kepala di bawahnya
   (dalam 30 pt) yang memuat sisa labelnya. Titik tengah tiap label = titik tengah kolomnya. */
function kolomKoord(baris, i) {
  const pusat = [];
  const pakai = (kata, kunci, k) => {
    if (pusat.some(p => p.kunci === kunci)) return;
    const n = kata.split(" ");
    const cocok = k.kata.findIndex((w, q) => n.every((bagian, r) => k.kata[q + r] && k.kata[q + r].s.replace(/[:：]/g, "") === bagian));
    if (cocok < 0) return;
    const aw = k.kata[cocok], ak = k.kata[cocok + n.length - 1];
    pusat.push({kunci, c: (aw.x + ak.x + ak.w) / 2});          // titik tengah label = titik tengah kolomnya
  };
  /* Label kepala tersebar DI ATAS dan di bawah baris "No." (laphar 24 Okt: "Tanggap /" 4 pt di atasnya),
     jadi jendela pencarian dibuka ke dua arah. */
  for (let j = 0; j < baris.length; j++) {
    const d = baris[j].y - baris[i].y; if (d < -20) continue; if (d > 30) break;
    for (const [kata, kunci] of KOLOM_SK) pakai(kata, kunci, baris[j]);
  }
  return pusat.length >= 6 ? pusat.sort((a, b) => a.c - b.c) : null;
}
function uraiSkDarurat(items, prov) {
  const baris = barisKoord(items);
  let i = baris.findIndex(l => /Rekapitulasi berdasarkan SK Darurat/i.test(l.teks));
  if (i < 0) return [];
  let akhir = baris.findIndex((l, n) => n > i && /^[J-Z]\.?\s*(Laporan Aktivitas|Laporan Meteorologi|Komunikasi Radio|Petugas Piket)/i.test(l.teks));
  if (akhir < 0) akhir = baris.length;

  /* 1. kolom per halaman + daftar baris nomor */
  const potong = [];                                      // {dari, pusat}
  const nomor = [];                                       // {y, no, i}
  for (let j = i + 1; j < akhir; j++) {
    const l = baris[j];
    if (/\bNo\.$/.test(l.kata[0]?.s || "") || (l.teks.includes("Jenis Kejadian") && /^No\.?$/.test(l.kata[0].s))) {
      const p = kolomKoord(baris, j); if (p) potong.push({dari: l.y, pusat: p});
    }
    const w0 = l.kata[0];
    if (w0 && /^\d{1,3}\.?$/.test(w0.s) && w0.x < 60) nomor.push({y: l.y, no: Number(w0.s.replace(".", "")), i: j});
  }
  if (!potong.length || !nomor.length) return [];
  const pusatPada = y => (potong.filter(p => p.dari <= y + 2).pop() || potong[0]).pusat;

  /* 2. tiap baris cetak jadi milik angka nomor terdekat; kepala grup provinsi dikeluarkan dulu */
  const RE_GRUP_PROV = /^Prov(insi)?\.\s+[A-Z]/;
  const milik = new Map(nomor.map(n => [n.i, []]));
  const grup = [];
  for (let j = i + 1; j < akhir; j++) {
    const l = baris[j];
    if (RE_KEPALA_GRUP.test(l.teks) || /Rekapitulasi berdasarkan SK Darurat/i.test(l.teks)) continue;
    if (RE_GRUP_PROV.test(l.teks) && l.kata.length <= 4 && !/\d/.test(l.teks) && l.x0 > 200) { grup.push({y: l.y, nama: l.teks.replace(/^Prov(insi)?\.\s+/i, "")}); continue; }
    let dekat = null, jarak = Infinity;
    for (const n of nomor) { const d = Math.abs(n.y - l.y); if (d < jarak) { jarak = d; dekat = n; } }
    if (dekat && jarak <= 60) milik.get(dekat.i).push(l);
  }

  /* 3. kata -> kolom terdekat, lalu rakit baris */
  const out = [];
  for (const n of nomor) {
    const pusat = pusatPada(n.y), sel = {};
    for (const l of milik.get(n.i).sort((a, b) => a.y - b.y)) for (const w of l.kata) {
      const c = w.c;
      let k = pusat[0].kunci, d = Infinity;
      for (const p of pusat) { const q = Math.abs(p.c - c); if (q < d) { d = q; k = p.kunci; } }
      sel[k] = (sel[k] ? sel[k] + " " : "") + w.s;
    }
    const provNama = (grup.filter(g => g.y < n.y + 2).pop() || {}).nama || "";
    for (const k of ["jenis_teks", "prov_teks", "kabkota", "waktu_kejadian", "tgl_surat", "siaga", "tanggap", "transisi", "sk_posko"]) sel[k] = rapi(sel[k]);
    sel.jenis_teks = sel.jenis_teks.replace(/^\d{1,3}\.?\s*/, "");
    if (!sel.jenis_teks && !sel.siaga && !sel.tanggap && !sel.transisi) continue;
    const macam = sel.tanggap ? "tanggap" : sel.transisi ? "transisi" : sel.siaga ? "siaga" : "";
    const masa = sel.tanggap || sel.transisi || sel.siaga;
    out.push({no: n.no, prov: kodeProv(sel.prov_teks || provNama, prov), prov_teks: sel.prov_teks || provNama, kabkota: sel.kabkota,
      jenis: jenisDari(`${sel.jenis_teks} ${sel.kabkota}`), jenis_teks: sel.jenis_teks, waktu_kejadian: sel.waktu_kejadian, tgl_surat: sel.tgl_surat,
      macam, masa, siaga: sel.siaga, tanggap: sel.tanggap, transisi: sel.transisi, sk_posko: sel.sk_posko, ...urutTmt(masa)});
  }
  return out;
}

/* mulai/sampai ISO dari teks masa status, bila terbaca ("TMT 1 Mei 2026 sd 31 Oktober 2026", "TMT 17 Sep s/d 31 Des 2026") */
function urutTmt(masa) {
  const t = rapi(masa); if (!t) return {mulai: "", sampai: ""};
  const m = t.match(RE_TMT); if (!m) return {mulai: "", sampai: ""};
  const thn = (t.match(/\b(20\d{2})\b(?!.*\b20\d{2}\b)/) || [])[1] || "";
  const satu = s => { const x = isoBulan(s) || isoBulan(`${s} ${thn}`); return x; };
  return {mulai: satu(m[1]) || "", sampai: satu(m[2]) || ""};
}

/* ================================================================ 3. gabung ke isian */
/* Kunci padan: entry_no bila ada, selain itu jenis + provinsi + lokasi. Baris lama DIPERBARUI (medan kosong
   hasil urai tidak menimpa isian yang sudah diketik petugas), baris baru ditambahkan di belakang. */
const kunciKejadian = x => x.entry_no != null && x.entry_no !== "" ? `n:${x.entry_no}` : `t:${x.jenis}|${x.prov}|${polos(x.lokasi).toLowerCase()}`;
function gabungKejadian(lama, baru) {
  const peta = new Map(lama.map(x => [kunciKejadian(x), x]));
  let tambah = 0, ubah = 0;
  for (const b of baru) {
    const ada = peta.get(kunciKejadian(b));
    if (!ada) { lama.push(b); peta.set(kunciKejadian(b), b); tambah++; continue; }
    let berubah = false;
    for (const [k, v] of Object.entries(b)) { if (v === "" || v == null) continue; if (ada[k] !== v) { ada[k] = v; berubah = true; } }
    if (berubah) ubah++;
  }
  return {tambah, ubah};
}
/* Kunci padan status daerah memakai KODE jenis (karhutla, banjir, ...), bukan tulisan "Jenis Kejadian"
   di SK: tulisan itu berbeda-beda antar daerah dan antar hari ("Karhutla", "Kebakaran Hutan dan Lahan",
   "Karhutla dan Kekeringan"), dan memakainya sebagai kunci melahirkan baris kembar tiap kali ejaannya
   bergeser. */
const kunciStatus = x => `${x.prov}|${polos(x.kabkota).toLowerCase()}|${polos(x.jenis || x.jenis_teks).toLowerCase()}`;
function gabungStatus(lama, baru) {
  const peta = new Map(lama.map(x => [kunciStatus(x), x]));
  let tambah = 0, ubah = 0;
  for (const b of baru) {
    const ada = peta.get(kunciStatus(b));
    if (!ada) { lama.push(b); peta.set(kunciStatus(b), b); tambah++; continue; }
    let berubah = false;
    for (const [k, v] of Object.entries(b)) { if (v === "" || v == null) continue; if (ada[k] !== v) { ada[k] = v; berubah = true; } }
    if (berubah) ubah++;
  }
  return {tambah, ubah};
}

/* ================================================================ 4. pengenal bentuk + pdf.js */
const RE_BENTUK_WA = /hasil pemantauan Dit\.?\s*Koordalops|Laporan kejadian bencana sejumlah/i;
const RE_BENTUK_LAPHAR = /LAPORAN HARIAN|Kejadian Bencana$|Rekapitulasi berdasarkan SK Darurat/im;
/* urai(teks, prov): pilih pengurai dari isi teks. Kembalinya selalu punya .bentuk; "" = tidak dikenali
   (layar lalu menawarkan jalur model). */
function urai(teks, prov, items) {
  const t = String(teks ?? "");
  if (!rapi(t)) return {bentuk: "", kejadian: [], status_daerah: [], lewat: ["teks kosong"]};
  const datar = t.split(/\r?\n/).map(rapi).join("\n");
  if (RE_BENTUK_LAPHAR.test(datar) && /Rekapitulasi berdasarkan SK Darurat|➢/.test(datar)) return uraiLaphar(t, prov, items);
  if (RE_BENTUK_WA.test(datar)) return {...uraiWa(t, prov), status_daerah: []};
  return {bentuk: "", kejadian: [], status_daerah: [], lewat: ["bentuk teks tidak dikenali"]};
}

/* tataLetak(items, {skala, jeda}): butir teks berkoordinat -> teks berjarak seperti `pdftotext -layout`,
   TAPI dengan baris kosong di tiap lompatan tegak yang lebih besar dari `jeda` kali jarak baris lazim.
   Baris kosong itu yang memisahkan baris tabel bagian I; tanpanya tabel tak terbaca.
   items: {x, y, str} dengan y MENAIK KE BAWAH (pdf.js: pakai tinggi viewport dikurangi transform[5]).
   skala = lebar satu huruf dalam satuan koordinat (10,5pt Roboto ~ 5,1). */
function tataLetak(items, {skala = 5.1, jeda = 1.35} = {}) {
  const baris = barisKoord(items);
  /* Ambang pemisah dibandingkan dengan jarak baris DI SEKITARNYA, bukan sedunia dokumen: badan laporan
     berjarak ~13 pt sedangkan sel tabel ~6,7 pt, jadi satu ambang tetap pasti salah di salah satunya. */
  const out = [], lalu = [];
  baris.forEach((l, n) => {
    if (n) {
      const g = l.y - baris[n - 1].y, u = [...lalu].sort((a, c) => a - c), lazim = u.length ? u[Math.floor(u.length / 2)] : 12;
      if (g > lazim * jeda) out.push("");
      lalu.push(g); if (lalu.length > 12) lalu.shift();
    }
    let s = "";
    for (const w of l.kata) {
      const kol = Math.round(w.x / skala);
      if (kol > s.length) s += " ".repeat(kol - s.length);
      else if (s && !/\s$/.test(s)) s += " ";        // kolom berdempetan tetap dipisah satu spasi
      s += w.s;
    }
    out.push(s.replace(/\s+$/, ""));
  });
  return out.join("\n");
}

const API = {urai, uraiWa, uraiLaphar, uraiSkDarurat, gabungKejadian, gabungStatus, tataLetak,
  kodeProv, jenisDari, tempatDari, ringkasStatus, statusDari, isoBulan, tanpaPrefiks};
if (typeof window !== "undefined") window.LaporanUrai = API;
if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
