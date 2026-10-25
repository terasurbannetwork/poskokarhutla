/* laporan_bnpb.js: halaman /laporan-bnpb. Tim mengetik angka laporan -> pratinjau slide langsung -> Simpan (D1, /api/laporan-bnpb) -> Unduh PPTX/PDF.
   Dua jenis: "harian" (Laporan Kejadian Bencana Harian) dan "presiden" (Paparan Kepala BNPB kepada Presiden, karhutla).
   Jenis harian punya empat keluaran dari isian yang sama (S.out): laporan harian, konferensi pers, Matador (layar besar), naskah juru bicara (+ teleprompter).
   Isian = satu objek JSON per (jenis, tanggal); bentuknya ditentukan BENTUK di bawah dan digambar laporan_bnpb_slide.js.
   Draf yang belum disimpan ditahan di localStorage peramban ini (per jenis+tanggal). Klik tidak membekukan layar: pratinjau ditunda. */
(() => {
const LB = window.LaporanBnpbSlide, PS = window.PaparanSlide, $ = s => document.querySelector(s);
const LIB = {
  pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],   // sama dengan paparan.js
  pptx: ["https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js", () => window.PptxGenJS],
};
const _lib = {};
const muatLib = k => { const [url, ada] = LIB[k]; if (ada()) return Promise.resolve();
  return (_lib[k] ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = url; s.crossOrigin = "anonymous"; s.async = true;
    s.onload = () => ada() ? ok() : gagal(new Error("Pustaka tidak lengkap")); s.onerror = () => { delete _lib[k]; gagal(new Error("Gagal memuat pustaka")); }; document.head.appendChild(s); })); };
const jeda = () => new Promise(r => setTimeout(r, 0));
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const kini = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // tanggal WIB
const geser = LB.tambahHari;
const salin = o => JSON.parse(JSON.stringify(o));

/* ---------------------------------------------------------------- bentuk isian */
const BNPB6 = ["Kalimantan Tengah", "Sumatera Selatan", "Jambi", "Kalimantan Selatan", "Kalimantan Barat", "Riau"];
const UNSUR = ["TNI", "Perusahaan", "Polri", "Relawan", "Pemda", "MPA", "BPBD", "Polhut", "M. Agni"];
const LABEL_KES = ["Situasi", "Wilayah", "Tren", "Prioritas terkini", "Efektivitas", "Dampak dan kendala", "Konsesi", "OMC dan luar prioritas"];
const kosong = n => Array(n).fill(null);
const BARU = {
  harian: t => ({mulai: geser(t, -1), jam: "09.00", laporan_masuk: null, penyaji: "", jabatan: "", instansi: "Badan Nasional Penanggulangan Bencana", singkatan: "BNPB",
    kejadian: [], status_daerah: [], perhatian_tambahan: [], tindak: Array.from({length: 4}, () => ({judul: "", isi: ""})), judul_ringkasan: "", judul_rincian: "", imbauan: [], konpers_pembuka: "", kepada: "Kepala BNPB", tembusan: [...window.LaporanKoordalops.TEMBUSAN], koordinator: ""}),
  presiden: t => ({judul: "Penanganan dan Pengendalian Kebakaran Hutan dan Lahan di Provinsi Prioritas", kepada: "Presiden Republik Indonesia", kepada_nama: "", penyaji: "", jabatan: "",
    instansi: "Badan Nasional Penanggulangan Bencana", hari: [-4, -3, -2].map(n => geser(t, n)), fs: kosong(3), sub_catatan: "",
    prov: BNPB6.map(nama => ({nama, hotspot: kosong(3), luas: kosong(3), belum: kosong(3), status: "", personel: null, heli: null, heli_ket: "heli WB", omc: null, wb_ha: null, kendala: ""})),
    penanganan: {personel: null, heli: null, pesawat: null, tanggal_unsur: "", unsur: UNSUR.map(nama => ({nama, n: null}))},
    omc: {judul: "", ket: "hujan setelah OMC", hujan: "", tanpa: ""},
    prioritas: {judul: "", pola: "pola El Niño", hari: Array.from({length: 7}, (_, i) => geser(t, i - 7)), periode: ["Okt tengah", "Okt akhir", "Nov awal", "Nov tengah", "Nov akhir"], sumber: "", baris: []},
    konsesi: {judul: "", sumber: "", kpi: {areal: null, areal_total: null, titik: null, titik7: null, ha: null, ha_konsesi: null, gambut: null, aktif: null},
      prov: [], jenis: ["Sawit", "HTI", "HPH", "Tambang"].map(nama => ({nama, ha: null, n: null, total: null}))},
    kesimpulan: LABEL_KES.map(label => ({label, judul: "", isi: ""})), arahan: "", judul_situasi: "", judul_efektivitas: ""}),
};
const JENIS_OPSI = Object.entries(LB.JENIS).map(([k, v]) => [k, v.nama]);
const MACAM_OPSI = [["", "—"], ["siaga", "Siaga Darurat"], ["tanggap", "Tanggap Darurat"], ["transisi", "Transisi Darurat"]];
/* Medan rincian entri laphar Dit. Koordalops (bagian A), diisi Pusdalops. Nama kunci sama dengan
   keluaran public/laporan_urai.js supaya hasil urai langsung masuk tanpa pemetaan. */
const MEDAN_PUSDALOPS = [["update", "Update (waktu laporan)", "t"], ["kronologi", "Kronologis", "a"],
  ["lokasi_rekap", "Rekap lokasi (x kec / x desa)", "t"], ["lokasi_rinci", "Lokasi rinci", "a"],
  ["korban", "Korban jiwa", "a"], ["pengungsi", "Pengungsi", "a"], ["kerugian", "Kerugian materiil", "a"],
  ["upaya", "Upaya", "a"], ["kebutuhan", "Kebutuhan mendesak", "a"], ["kendala", "Kendala", "a"],
  ["terlibat", "Unsur yang terlibat", "a"], ["peralatan", "Peralatan dan armada", "a"],
  ["status_sk", "Status (kutipan SK)", "a"], ["rekomendasi", "Rekomendasi / saran", "a"],
  ["dokumentasi", "Dokumentasi", "t"], ["sumber", "Sumber", "t"]];
const SIFAT_OPSI = [["", "—"], ["Kejadian Baru", "Kejadian Baru"], ["Pengkinian Data", "Pengkinian Data"]];
const STATUS_OPSI = [["berjalan", "Berjalan"], ["selesai", "Selesai/terkendali"], ["belum", "Belum selesai"]];
let PROV_OPSI = [];   // [kode, nama] dari /data/laporan.json

/* Formulir: tiap bagian = daftar medan. Medan: [jalur, label, jenis, opsi]. Jenis: t (teks), n (angka), d (tanggal), p (pilihan), a (teks panjang).
   Tabel: {tabel: jalur, kolom: [[kunci, label, jenis, lebar|opsi], ...]}; kolom angka berderet: [kunci, label, "n", lebar, jumlah]. */
const FORM = {
  harian: [
    {judul: "Umum", medan: [["mulai", "Periode mulai", "d"], ["jam", "Jam potong (WIB)", "t"], ["laporan_masuk", "Jumlah laporan kejadian masuk", "n"],
      ["penyaji", "Disampaikan oleh", "t"], ["jabatan", "Jabatan", "t"], ["instansi", "Instansi", "t"], ["singkatan", "Singkatan instansi", "t"]]},
    {judul: "Kejadian menonjol", ket: "Satu baris per kejadian. Baris berprovinsi sama dikelompokkan. Kolom keterangan: pisah dua pil dengan | (contoh: padam 95,93 | sisa 401,16).",
      tabel: "kejadian", kolom: [["jenis", "Jenis", "p", JENIS_OPSI], ["prov", "Provinsi", "p", "prov"], ["lokasi", "Kab/lokasi", "t", 9], ["utama", "Angka utama", "t", 11], ["kedua", "Angka kedua", "t", 8],
        ["ket", "Keterangan (pil)", "t", 11], ["catatan", "Catatan kecil", "t", 8], ["status", "Status", "p", STATUS_OPSI], ["perhatian", "Teks perlu perhatian", "t", 12],
        ["sifat", "Sifat (Koordalops)", "p", SIFAT_OPSI], ["tempat", "Tempat di judul", "t", 12], ["dampak", "Dampak", "t", 16], ["status_penetapan", "Penetapan status", "t", 16], ["pendampingan", "Pendampingan BNPB", "t", 9], ["kondisi", "Kondisi mutakhir", "t", 16], ["entry_no", "Entry laphar no", "n", 3]]},
    {judul: "Perlu perhatian tambahan", ket: "Kejadian berstatus belum selesai otomatis masuk. Tambahkan butir ringkasan di sini (maks. 6 tampil).",
      tabel: "perhatian_tambahan", kolom: [["jenis", "Jenis", "p", JENIS_OPSI], ["judul", "Judul", "t", 14], ["isi", "Isi", "t", 18], ["status", "Status", "p", STATUS_OPSI]]},
    {judul: "Yang akan dilakukan", tabel: "tindak", tetap: true, kolom: [["judul", "Judul", "t", 12], ["isi", "Isi", "t", 30]]},
    {judul: "Dit. Koordalops (opsional)", ket: "Untuk keluaran Dit. Koordalops. Kolom tambahan per kejadian ada di tabel Kejadian menonjol (geser ke kanan); kosong tampil sebagai tanda hubung.", lipat: true,
      medan: [["kepada", "Kepada (Yth.)", "t"], ["koordinator", "Koordinator pembuat laporan", "t"], ["tembusan", "Tembusan (pisah koma)", "t"]]},
    {judul: "Bahan Pusdalops", impor: true, ket: "Tempel rekap WA Dit. Koordalops, atau unggah laphar PDF. Isian di bawah diisi dari situ; baris yang sudah Anda ketik tidak ditimpa nilai kosong. Tabel status darurat daerah hanya ada di laphar PDF."},
    {judul: "Pusdalops: rincian entri laphar", kartu: "kejadian", lipat: true,
      ket: "Satu kartu per kejadian pada tabel Kejadian menonjol di atas. Medan ini mengikuti bagian A laphar Dit. Koordalops dan dipakai keluaran Dit. Koordalops.",
      medan: MEDAN_PUSDALOPS},
    {judul: "Status darurat daerah", lipat: true,
      ket: "Rekapitulasi SK darurat yang berlaku (bagian I laphar), didata harian. Satu baris per daerah per jenis kejadian; kolom Masa status disalin apa adanya dari SK.",
      tabel: "status_daerah", kolom: [["prov", "Provinsi", "p", "prov"], ["kabkota", "Kab/Kota", "t", 12], ["jenis_teks", "Jenis kejadian", "t", 16],
        ["waktu_kejadian", "Waktu kejadian", "t", 9], ["tgl_surat", "Tanggal surat", "t", 9], ["macam", "Macam", "p", MACAM_OPSI],
        ["masa", "Masa status (teks SK)", "t", 22], ["mulai", "Mulai", "d"], ["sampai", "Sampai", "d"], ["sk_posko", "SK Posko", "t", 12]]},
    {judul: "Konferensi pers (opsional)", ket: "Kosong = kalimat imbauan baku per jenis bencana yang ada hari itu. Maks. 6 imbauan. Pembuka dipakai di naskah juru bicara dan halaman ringkasan.", lipat: true,
      tabel: "imbauan", kolom: [["judul", "Judul imbauan", "t", 16], ["isi", "Isi", "t", 30]], medan: [["konpers_pembuka", "Kalimat pembuka konpers", "a"]]},
    {judul: "Judul slide (opsional)", ket: "Kosong = judul dihitung otomatis dari angka. Dua slide Pusdalops hanya ikut tercetak bila isiannya ada.", lipat: true,
      medan: [["judul_ringkasan", "Judul slide ringkasan", "a"], ["judul_rincian", "Judul slide rincian", "a"], ["judul_status", "Judul slide status darurat daerah", "a"], ["judul_pusdalops", "Judul slide hambatan dan kebutuhan", "a"]]},
  ],
  presiden: [
    {judul: "Sampul", medan: [["judul", "Judul paparan", "a"], ["kepada", "Disampaikan kepada", "t"], ["kepada_nama", "Nama penerima", "t"], ["penyaji", "Dipresentasikan oleh", "t"], ["jabatan", "Jabatan", "t"], ["instansi", "Instansi", "t"]]},
    {judul: "Situasi provinsi prioritas", ket: "Tiga tanggal data (kolom 1–3). Tombol Geser hari di atas memindahkan angka satu hari ke kiri untuk laporan berikutnya.",
      medan: [["hari.0", "Tanggal data 1", "d"], ["hari.1", "Tanggal data 2", "d"], ["hari.2", "Tanggal data 3", "d"], ["fs.0", "Fire spot 1", "n"], ["fs.1", "Fire spot 2", "n"], ["fs.2", "Fire spot 3", "n"], ["sub_catatan", "Catatan sub-judul", "t"]]},
    {judul: "Angka per provinsi", tabel: "prov", kolom: [["nama", "Provinsi", "t", 11], ["hotspot", "Hotspot", "n", 5, 3], ["luas", "Luas terbakar (ha)", "n", 5, 3], ["belum", "Belum padam (ha)", "n", 5, 3],
      ["status", "Penilaian", "t", 9], ["personel", "Personel", "n", 6], ["heli", "Heli", "n", 3], ["heli_ket", "Ket. heli", "t", 9], ["omc", "Sortie OMC", "n", 3], ["wb_ha", "Ha padam WB", "n", 4], ["kendala", "Kendala (pisah ;)", "t", 18]]},
    {judul: "Penanganan dan OMC", medan: [["penanganan.personel", "Personel darat", "n"], ["penanganan.heli", "Helikopter WB", "n"], ["penanganan.pesawat", "Pesawat patroli/OMC", "n"], ["penanganan.tanggal_unsur", "Tanggal data unsur", "t"],
      ["omc.judul", "OMC: angka besar", "t"], ["omc.ket", "OMC: keterangan", "t"], ["omc.hujan", "Hujan setelah OMC (pisah ;)", "t"], ["omc.tanpa", "Tanpa OMC (pisah ;)", "t"]]},
    {judul: "Personel per unsur", tabel: "penanganan.unsur", kolom: [["nama", "Unsur", "t", 10], ["n", "Personel", "n", 7]]},
    {judul: "Prioritas provinsi", ket: "Hotspot 7 hari dan peringkat bisa diisi dari satelit (laporan.json situs).", tombol: [["isiSatelit", "Isi hotspot 7 hari dari satelit"]],
      medan: [["prioritas.hari.0", "Hari pertama hotspot", "d"], ["prioritas.pola", "Pola peluang", "t"], ["prioritas.periode", "Periode peluang (pisah ,)", "t"], ["prioritas.sumber", "Sumber", "a"], ["prioritas.judul", "Judul (opsional)", "a"]]},
    {tabel: "prioritas.baris", judul: "Baris prioritas", kolom: [["peringkat", "Peringkat", "n", 3], ["nama", "Provinsi", "t", 11], ["status", "Status", "p", [["tetap", "Tetap"], ["masuk", "Masuk"], ["keluar", "Keluar"]]],
      ["total", "Total hotspot", "n", 6], ["luas", "Pil luas", "t", 7], ["titik", "Hotspot 7 hari", "n", 4, 7], ["peluang", "Peluang % (5 periode)", "n", 3, 5]]},
    {judul: "Konsesi", medan: [["konsesi.kpi.areal", "Areal konsesi terbakar", "n"], ["konsesi.kpi.areal_total", "Konsesi di peta", "n"], ["konsesi.kpi.titik", "Titik panas", "n"], ["konsesi.kpi.titik7", "Titik 7 hari terakhir", "n"],
      ["konsesi.kpi.ha", "Ha indikasi terbakar", "n"], ["konsesi.kpi.ha_konsesi", "Luas areal konsesi (ha)", "n"], ["konsesi.kpi.gambut", "Ha di gambut", "n"], ["konsesi.kpi.aktif", "Konsesi masih ada api", "n"],
      ["konsesi.sumber", "Sumber", "a"], ["konsesi.judul", "Judul (opsional)", "a"]]},
    {tabel: "konsesi.prov", judul: "Konsesi per provinsi (ha)", kolom: [["nama", "Provinsi", "t", 11], ["sawit", "Sawit", "n", 6], ["hti", "HTI", "n", 6], ["hph", "HPH", "n", 6], ["tambang", "Tambang", "n", 6], ["n", "Terbakar", "n", 4], ["total", "Total", "n", 4]]},
    {tabel: "konsesi.jenis", judul: "Konsesi per jenis usaha", tetap: true, kolom: [["nama", "Jenis", "t", 7], ["ha", "Ha", "n", 7], ["n", "Konsesi terbakar", "n", 5], ["total", "Total konsesi", "n", 5]]},
    {tabel: "kesimpulan", judul: "Kesimpulan", tetap: true, kolom: [["label", "Label", "t", 9], ["judul", "Judul", "t", 14], ["isi", "Isi", "t", 26]], medan: [["arahan", "Arahan", "a"]]},
    {judul: "Judul slide (opsional)", lipat: true, medan: [["judul_situasi", "Judul slide situasi", "a"], ["judul_efektivitas", "Judul slide efektivitas", "a"]]},
  ],
};

/* jalur "a.b.0.c" */
const ambil = (o, p) => p.split(".").reduce((x, k) => x == null ? x : x[k], o);
function pasang(o, p, v) { const ks = p.split("."); let x = o; for (let i = 0; i < ks.length - 1; i++) { if (x[ks[i]] == null) x[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[ks[i]]; } x[ks.at(-1)] = v; }
/* angka gaya Indonesia: "1.462" = 1462, "665,07" = 665.07; kosong = null */
const uraiAngka = s => { s = String(s).trim().replace(/\s/g, ""); if (!s) return null; const v = Number(s.replace(/\./g, "").replace(",", ".")); return Number.isFinite(v) ? v : NaN; };
const tulisAngka = v => v == null || v === "" ? "" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: 3});

/* ---------------------------------------------------------------- keadaan */
const S = {jenis: "harian", out: "harian", aspek: "16:9", tanggal: kini(), isi: null, daftar: [], ubah: false, gen: 0, sibuk: false, aset: {}, prov: {}, laporan: null, geo: null, tunda: 0};
const KUNCI_DRAF = () => `pk-lbnpb-${S.jenis}-${S.tanggal}`;
const simpanDraf = () => { try { localStorage.setItem(KUNCI_DRAF(), JSON.stringify(S.isi)); } catch (e) {} };
const bacaDraf = () => { try { return JSON.parse(localStorage.getItem(KUNCI_DRAF()) || "null"); } catch (e) { return null; } };
const hapusDraf = () => { S.kotor = false; try { localStorage.removeItem(KUNCI_DRAF()); } catch (e) {} };
const tulisDraf = () => { if (S.kotor) { S.kotor = false; simpanDraf(); } };   // draf ditulis tertunda (bersama jadwalkan), dan saat tab disembunyikan/ditutup
const sesudahCat = f => { let jalan = false; const go = () => { if (jalan) return; jalan = true; f(); }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };   // kerja berat sesudah satu frame tercat
const status = t => { $("#lbSt").textContent = t; };

/* ---------------------------------------------------------------- formulir */
function inputMedan(p, label, jenis, opsi) {
  const v = ambil(S.isi, p), id = "f-" + p.replace(/\./g, "-");
  if (jenis === "a") return `<label class="lb-m lebar" for="${id}">${esc(label)}<textarea id="${id}" data-p="${p}" data-j="t" rows="2">${esc(v)}</textarea></label>`;
  if (jenis === "p") return `<label class="lb-m" for="${id}">${esc(label)}<select id="${id}" data-p="${p}" data-j="t">${opsiHtml(opsi, v)}</select></label>`;
  const val = jenis === "n" ? tulisAngka(v) : Array.isArray(v) ? v.join(", ") : v ?? "";
  return `<label class="lb-m" for="${id}">${esc(label)}<input id="${id}" data-p="${p}" data-j="${p === "prioritas.periode" || p === "tembusan" ? "l" : jenis}" ${jenis === "d" ? 'type="date"' : jenis === "n" ? 'inputmode="decimal"' : ""} value="${esc(val)}"></label>`;
}
const opsiHtml = (o, v) => (o === "prov" ? [["", "—"], ...PROV_OPSI] : o).map(([k, n]) => `<option value="${esc(k)}"${k === (v ?? "") ? " selected" : ""}>${esc(n)}</option>`).join("");
function tabelHtml(b) {
  const rows = ambil(S.isi, b.tabel) || [];
  const kep = b.kolom.map(([, l, , , n]) => `<th${n ? ` colspan="${n}"` : ""}>${esc(l)}</th>`).join("");
  const sel = (p, j, o, w) => j === "p" ? `<select data-p="${p}" data-j="t">${opsiHtml(o, ambil(S.isi, p))}</select>`
    : `<input data-p="${p}" data-j="${j}" ${j === "n" ? 'inputmode="decimal"' : ""} style="width:${w || 8}em" value="${esc(j === "n" ? tulisAngka(ambil(S.isi, p)) : ambil(S.isi, p) ?? "")}">`;
  const isi = rows.map((_, i) => `<tr data-i="${i}">${b.kolom.map(([k, , j, o, n]) => n ? Array.from({length: n}, (_, x) => `<td>${sel(`${b.tabel}.${i}.${k}.${x}`, j, o, o)}</td>`).join("")
    : `<td>${sel(`${b.tabel}.${i}.${k}`, j, o, typeof o === "number" ? o : 0)}</td>`).join("")}${b.tetap ? "" : `<td class="lb-aksi"><button type="button" data-a="naik" data-t="${b.tabel}" aria-label="Naikkan">&#9650;</button><button type="button" data-a="hapus" data-t="${b.tabel}" aria-label="Hapus baris">&#10005;</button></td>`}</tr>`).join("");
  return `<div class="lb-tabel"><table><thead><tr>${kep}${b.tetap ? "" : "<th></th>"}</tr></thead><tbody>${isi}</tbody></table></div>${b.tetap ? "" : `<button type="button" class="pp-btn kecil ke2" data-a="tambah" data-t="${b.tabel}">+ Tambah baris</button>`}`;
}
/* kartu: satu baris larik = satu kartu lipat, untuk baris yang medannya terlalu banyak untuk tabel
   mendatar (rincian entri laphar: 16 medan, sebagian paragraf). Larik dan indeksnya sama dengan tabel. */
const judulKartu = (x, i) => {
  const jn = (LB.JENIS[x.jenis] || {}).nama || "Kejadian", di = tulisTempat(x);
  return `${x.entry_no == null || x.entry_no === "" ? `#${i + 1}` : `Entry ${x.entry_no}`} · ${jn}${di ? " di " + di : ""}`;
};
const tulisTempat = x => String(x.tempat || x.lokasi || "").trim() || S.prov[x.prov] || "";
function kartuHtml(b) {
  const rows = ambil(S.isi, b.kartu) || [];
  if (!rows.length) return `<p class="lb-ket">Belum ada kejadian. Isi lewat panel Bahan Pusdalops, atau tambah baris di tabel Kejadian menonjol.</p>`;
  return rows.map((x, i) => `<details class="lb-kartu" data-k="${i}"><summary>${esc(judulKartu(x, i))}</summary>
    <div class="lb-grid">${b.medan.map(([k, l, j, o]) => inputMedan(`${b.kartu}.${i}.${k}`, l, j, o)).join("")}</div></details>`).join("");
}
/* panel impor digambar SEKALI (lihat gambarForm): teks yang sedang ditempel tidak boleh hilang
   tiap kali isian lain berubah. */
const imporHtml = () => `<div class="lb-impor">
    <textarea id="lbUraiTeks" rows="5" spellcheck="false" placeholder="Tempel di sini rekap WA Dit. Koordalops (Mohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal ...)"></textarea>
    <div class="lb-impor-aksi">
      <button type="button" class="pp-btn kecil" data-a="urai">Urai teks</button>
      <label class="pp-btn kecil ke2 lb-imp">Unggah laphar PDF<input type="file" id="lbUraiBerkas" accept=".pdf,.txt,application/pdf,text/plain" hidden></label>
      <button type="button" class="pp-btn kecil ke2" data-a="uraiModel" title="Untuk teks yang bentuknya tidak dikenali pengurai">Urai dengan model</button>
      <button type="button" class="pp-btn kecil" data-a="uraiMasuk" disabled>Masukkan ke isian</button>
    </div>
    <div class="lb-impor-st" id="lbUraiSt" role="status" aria-live="polite"></div>
    <pre class="lb-impor-pv" id="lbUraiPv" hidden></pre>
  </div>`;
const htmlBlok = b => `<summary>${esc(b.judul)}${b.tabel ? ` <small>${(ambil(S.isi, b.tabel) || []).length} baris</small>` : ""}${b.kartu ? ` <small>${(ambil(S.isi, b.kartu) || []).length} kejadian</small>` : ""}</summary>
    ${b.ket ? `<p class="lb-ket">${esc(b.ket)}</p>` : ""}${(b.tombol || []).map(([a, l]) => `<button type="button" class="pp-btn kecil ke2" data-a="${a}">${esc(l)}</button>`).join("")}
    ${b.medan && !b.kartu ? `<div class="lb-grid">${b.medan.map(m => inputMedan(...m)).join("")}</div>` : ""}${b.tabel ? tabelHtml(b) : ""}${b.kartu ? kartuHtml(b) : ""}${b.impor ? imporHtml() : ""}`;
/* gambarForm(sel): tanpa argumen = isi semua blok; sel = indeks blok yang berubah saja. Elemen <details> dipertahankan (buka/tutup, scroll),
   fokus dikembalikan ke kontrol yang sama bila masih ada. */
const blokDari = f => FORM[S.jenis].map((b, i) => f(b) ? i : -1).filter(i => i >= 0);
function gambarForm(sel) {
  const w = $("#lbForm"), fs = FORM[S.jenis];
  if (w.dataset.jenis !== S.jenis || w.children.length !== fs.length) { w.innerHTML = fs.map((b, i) => `<details class="lb-bag" data-b="${i}"${b.lipat ? "" : " open"}>${htmlBlok(b)}</details>`).join(""); w.dataset.jenis = S.jenis; return; }
  const ae = document.activeElement, f = ae && w.contains(ae) ? {p: ae.dataset.p, a: ae.dataset.a, t: ae.dataset.t} : null;
  fs.forEach((b, i) => { if (b.impor) return; if (!sel || sel.includes(i)) w.children[i].innerHTML = htmlBlok(b); });
  const q = f && (f.p ? `[data-p="${f.p}"]` : f.a ? `button[data-a="${f.a}"]${f.t ? `[data-t="${f.t}"]` : ""}` : null), el = q && w.querySelector(q); if (el) el.focus({preventScroll: true});
}
$("#lbForm").addEventListener("input", e => {
  const el = e.target.closest("[data-p]"); if (!el) return;
  const j = el.dataset.j; let v = el.value;
  if (j === "n") { v = uraiAngka(v); el.classList.toggle("salah", Number.isNaN(v)); if (Number.isNaN(v)) return; }
  if (j === "l") v = v.split(",").map(s => s.trim()).filter(Boolean);
  pasang(S.isi, el.dataset.p, v);
  if (el.dataset.p === "prioritas.hari.0" && v) S.isi.prioritas.hari = Array.from({length: 7}, (_, i) => geser(v, i));
  tandaUbah();
});
$("#lbForm").addEventListener("change", e => { const f = e.target.closest("#lbUraiBerkas"); if (f?.files?.[0]) { uraiBerkas(f.files[0]); f.value = ""; } });
$("#lbForm").addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const a = b.dataset.a, t = b.dataset.t, arr = t && ambil(S.isi, t);
  if (a === "tambah") { if (t === "imbauan" && arr.length >= 6) return status("Imbauan paling banyak 6."); arr.push(barisBaru(t)); }
  else if (a === "hapus") arr.splice(+b.closest("tr").dataset.i, 1);
  else if (a === "naik") { const i = +b.closest("tr").dataset.i; if (!i) return; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
  else if (a === "isiSatelit") return isiSatelit();
  else if (a === "urai") return uraiTempel();
  else if (a === "uraiModel") return uraiModel();
  else if (a === "uraiMasuk") return uraiMasuk();
  else return;
  gambarForm(blokDari(x => x.tabel === t)); tandaUbah();
});
function barisBaru(t) {
  const blok = FORM[S.jenis].find(b => b.tabel === t), o = {};
  for (const [k, , j, opsi, n] of blok.kolom) o[k] = n ? kosong(n) : j === "p" ? (opsi === "prov" ? "" : opsi[0][0]) : j === "n" ? null : "";
  return o;
}
function tandaUbah() { S.ubah = true; S.kotor = true; $("#lbSimpan").classList.add("perlu"); jadwalkan(); }

/* ---------------------------------------------------------------- bahan Pusdalops (urai) */
/* Dua bentuk bahan harian Dit. Koordalops diurai tanpa model di public/laporan_urai.js: rekap WA dan
   laphar PDF. Model (Workers AI) hanya dipakai lewat tombol terpisah, untuk teks yang bentuknya tidak
   dikenali -- supaya bahan yang sudah pasti bentuknya tidak pernah bergantung pada tebakan model. */
const uraiSt = t => { $("#lbUraiSt").textContent = t; };
const provNama = () => S.prov;
function pasangHasil(h, asal) {
  S.urai = h && (h.kejadian || []).length + (h.status_daerah || []).length ? {hasil: h, asal} : null;
  const tombol = $("#lbForm").querySelector('button[data-a="uraiMasuk"]'), pv = $("#lbUraiPv");
  if (tombol) tombol.disabled = !S.urai;
  if (!S.urai) { pv.hidden = true; return; }
  const k = h.kejadian || [], sd = h.status_daerah || [];
  pv.hidden = false;
  pv.textContent = [
    ...k.map(x => `kejadian  ${String(x.entry_no ?? "-").padStart(3)}  ${(S.prov[x.prov] || x.prov || "?")} · ${(LB.JENIS[x.jenis] || {}).nama || x.jenis}${x.lokasi ? " · " + x.lokasi : ""}`),
    ...sd.map(x => `status    ${(S.prov[x.prov] || x.prov_teks || "?")}${x.kabkota ? " · " + x.kabkota : ""} · ${x.macam || "-"} · ${x.masa || "-"}`),
  ].join("\n");
  uraiSt(`${asal}: ${k.length} kejadian, ${sd.length} baris status daerah.${(h.lewat || []).length ? " Catatan: " + h.lewat.slice(0, 3).join("; ") : ""} Periksa daftarnya, lalu tekan Masukkan ke isian.`);
}
function uraiTempel() {
  const teks = $("#lbUraiTeks").value;
  if (!teks.trim()) return uraiSt("Tempel dulu teksnya, atau unggah laphar PDF.");
  const h = window.LaporanUrai.urai(teks, provNama());
  if (!h.bentuk) { pasangHasil(null); return uraiSt("Bentuk teks ini tidak dikenali. Pastikan yang ditempel rekap WA Dit. Koordalops utuh, atau coba tombol Urai dengan model."); }
  S.uraiTeks = teks;
  pasangHasil(h, h.bentuk === "wa" ? "Rekap WA" : "Teks laphar");
}
async function uraiBerkas(file) {
  uraiSt(`Membaca ${file.name}…`);
  try {
    const {teks, items} = await window.LaporanImpor.bacaBerkas(file);
    $("#lbUraiTeks").value = teks.length > 200000 ? teks.slice(0, 200000) : teks;
    S.uraiTeks = teks;
    const h = window.LaporanUrai.urai(teks, provNama(), items);
    if (!h.bentuk) { pasangHasil(null); return uraiSt(`${file.name} terbaca, tapi bentuknya bukan laphar Dit. Koordalops. Coba tombol Urai dengan model.`); }
    pasangHasil(h, file.name);
  } catch (e) { pasangHasil(null); uraiSt(e.message); }
}
async function uraiModel() {
  const teks = (S.uraiTeks || $("#lbUraiTeks").value || "").trim();
  if (!teks) return uraiSt("Tempel dulu teksnya, atau unggah berkasnya.");
  uraiSt("Meminta model membaca teks ini…");
  try {
    const r = await api("/api/laporan-bnpb/urai", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({teks})});
    const h = {bentuk: "model", kejadian: r.kejadian || [], status_daerah: [], lewat: r.catatan || []};
    for (const x of h.kejadian) x.prov = window.LaporanUrai.kodeProv(x.prov || x.prov_teks || "", provNama()) || "";
    if (!h.kejadian.length) { pasangHasil(null); return uraiSt("Model tidak menemukan kejadian di teks ini. Angka tidak pernah dikarang: isi manual, atau tempel bahan yang benar."); }
    pasangHasil(h, r.terpotong ? "Model (teks dipotong, periksa bagian akhir)" : "Model");
  } catch (e) { pasangHasil(null); uraiSt(e.status === 503 ? "Model tidak tersedia di server ini." : "Gagal memanggil model: " + e.message); }
}
function uraiMasuk() {
  if (!S.urai) return;
  const h = S.urai.hasil, i = S.isi;
  i.kejadian ||= []; i.status_daerah ||= [];
  const k = window.LaporanUrai.gabungKejadian(i.kejadian, h.kejadian || []);
  const sd = window.LaporanUrai.gabungStatus(i.status_daerah, h.status_daerah || []);
  if (h.mulai) i.mulai = h.mulai;
  if (h.jam) i.jam = h.jam;
  if (typeof h.laporan_masuk === "number") i.laporan_masuk = h.laporan_masuk;
  if (h.koordinator && !i.koordinator) i.koordinator = h.koordinator;
  if (h.kepada && !i.kepada) i.kepada = h.kepada;
  gambarForm(); tandaUbah();
  uraiSt(`Masuk ke isian: kejadian ${k.tambah} baru dan ${k.ubah} diperbarui; status daerah ${sd.tambah} baru dan ${sd.ubah} diperbarui. Periksa isiannya, lalu Simpan.`);
  pasangHasil(null);
}

/* hotspot 7 hari dari satelit: laporan.json (titik per provinsi per hari WIB, deret L.hari). Peringkat = urutan jumlah 7 hari di 38 provinsi. */
function isiSatelit() {
  const L = S.laporan; if (!L) return status("Data satelit belum termuat.");
  const pz = S.isi.prioritas, akhir = L.hari.filter(h => h <= geser(S.tanggal, -1)).at(-1); if (!akhir) return status("Tidak ada data satelit sebelum tanggal laporan.");
  const ia = L.hari.indexOf(akhir), hr = L.hari.slice(Math.max(0, ia - 6), ia + 1); pz.hari = hr;
  const deret = k => hr.map(h => L.prov[k].titik[L.hari.indexOf(h)] ?? 0);
  const rank = Object.keys(L.prov).map(k => [k, deret(k).reduce((a, b) => a + b, 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const kodeDari = nama => Object.keys(L.prov).find(k => L.prov[k].nama.toLowerCase() === String(nama).trim().toLowerCase());
  if (!pz.baris.length) rank.slice(0, 7).forEach(k => pz.baris.push({...barisBaru("prioritas.baris"), nama: L.prov[k].nama}));
  let n = 0;
  for (const b of pz.baris) { const k = kodeDari(b.nama); if (!k) continue; b.titik = deret(k); b.peringkat = rank.indexOf(k) + 1; n++; }
  pz.baris.sort((a, b) => (/keluar/i.test(a.status) - /keluar/i.test(b.status)) || (a.peringkat ?? 99) - (b.peringkat ?? 99));
  gambarForm(blokDari(x => x.tabel === "prioritas.baris" || x.medan?.some(m => m[0] === "prioritas.hari.0"))); tandaUbah(); status(`Hotspot ${LB.tglK(hr[0])}–${LB.tglK(hr.at(-1))} diisi untuk ${n} provinsi dari satelit (laporan.json).`);
}
/* Geser hari: angka tiga hari pindah satu kolom ke kiri, kolom terakhir dikosongkan untuk hari baru */
function geserHari() {
  const i = S.isi;
  if (S.jenis === "presiden") {
    i.hari = [...i.hari.slice(1), geser(i.hari.at(-1), 1)]; i.fs = [...i.fs.slice(1), null];
    for (const p of i.prov) for (const k of ["hotspot", "luas", "belum"]) p[k] = [...(p[k] || kosong(3)).slice(1), null];
  } else i.mulai = geser(i.mulai, 1);
  gambarForm(); tandaUbah(); status("Hari digeser satu: isi kolom terakhir dengan angka hari baru.");
}

/* ---------------------------------------------------------------- server */
const api = async (u, o) => { const r = await fetch(u, {credentials: "same-origin", ...o}); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.galat || r.status), {status: r.status}); return j; };
async function muatDaftar() {
  try { S.daftar = (await api(`/api/laporan-bnpb?jenis=${S.jenis}`)).daftar; }
  catch (e) { S.daftar = []; if (e.status === 403) status("Belum masuk: laporan tidak bisa disimpan. Masuk lewat /admin/masuk."); }
  $("#lbDaftar").innerHTML = `<option value="">Laporan tersimpan…</option>` + S.daftar.map(d => `<option value="${d.tanggal}"${d.tanggal === S.tanggal ? " selected" : ""}>${LB.tglP(d.tanggal)}</option>`).join("");
}
async function buka(tanggal, {dariTerakhir = false} = {}) {
  tulisDraf();
  S.tanggal = tanggal; $("#lbTgl").value = tanggal;
  let isi = bacaDraf(), asal = isi ? "draf lokal (belum disimpan)" : "";
  S.diubah = null;   // penanda penguncian optimistis: diubah milik baris di server; kosong = laporan baru
  try { const r = await api(`/api/laporan-bnpb?jenis=${S.jenis}&tanggal=${tanggal}`); S.diubah = r.diubah; if (!isi) { isi = r.isi; asal = "tersimpan di server"; } } catch (e) { if (e.status !== 404 && e.status !== 403) console.warn(e); }
  if (!isi && dariTerakhir && S.daftar.length) {
    const lama = S.daftar.find(d => d.tanggal < tanggal) || S.daftar[0];
    try { isi = (await api(`/api/laporan-bnpb?jenis=${S.jenis}&tanggal=${lama.tanggal}`)).isi; asal = `salinan laporan ${LB.tglP(lama.tanggal)}; ubah angkanya lalu Simpan`; } catch (e) {}
  }
  S.isi = {...BARU[S.jenis](tanggal), ...(isi || {})}; S.ubah = !!asal && asal !== "tersimpan di server";
  $("#lbSimpan").classList.toggle("perlu", S.ubah);
  gambarForm(); status(asal ? `Laporan ${LB.tglP(tanggal)}: ${asal}.` : `Laporan baru ${LB.tglP(tanggal)}. Isi angkanya, pratinjau berubah langsung.`); jadwalkan();
}
async function simpan() {
  const b = $("#lbSimpan"); b.disabled = true; status("Menyimpan…");
  try { const h = await api("/api/laporan-bnpb", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jenis: S.jenis, tanggal: S.tanggal, isi: S.isi, diubah: S.diubah})});
    S.diubah = h.diubah; S.ubah = false; hapusDraf(); b.classList.remove("perlu"); await muatDaftar(); status(`Tersimpan: ${S.jenis === "harian" ? "Laporan Harian" : "Paparan Presiden"} ${LB.tglP(S.tanggal)}.`); }
  catch (e) { status(e.status === 409 ? "Laporan ini baru diubah petugas lain. Muat ulang dulu." : e.status === 403 ? "Gagal menyimpan: sesi masuk habis. Buka /admin/masuk di tab baru, lalu Simpan lagi (isian tetap aman di peramban ini)." : "Gagal menyimpan: " + e.message); }
  finally { b.disabled = false; }
}

/* ---------------------------------------------------------------- aset gambar */
const keDataUrl = (u, tipe = "image/png", w, h, q) => new Promise(r => { const im = new Image(); im.onload = () => { try { const c = document.createElement("canvas"); c.width = w || im.naturalWidth; c.height = h || im.naturalHeight;
  const sw = w ? Math.min(im.naturalWidth, im.naturalHeight * w / h) : im.naturalWidth, sh = w ? sw * h / w : im.naturalHeight;
  c.getContext("2d").drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, c.width, c.height); r(c.toDataURL(tipe, q)); } catch (e) { r(null); } }; im.onerror = () => r(null); im.src = u; });
async function muatAset() {
  const kr = await fetch("/img/kredit.json").then(r => r.json()).catch(() => []), k = f => kr.find(x => x.file === f);
  const fw = Math.round((PS.W - 6.95) * 150), fh = Math.round(PS.H * 150);
  const [logo, berakhlak, foto, penutup] = await Promise.all([keDataUrl("/img/lembaga/sumber-bnpb.png"), keDataUrl("/img/laporan-bnpb/berakhlak.png"),
    keDataUrl("/img/foto-pemadam.jpg", "image/jpeg", fw, fh, 0.82), keDataUrl("/img/laporan-bnpb/penutup.jpg", "image/jpeg", 1600, 900, 0.8)]);
  const kf = k("foto-pemadam.jpg"), kh = k("foto-heli.jpg");
  S.aset = {logo, berakhlak, foto: foto && {data: foto, kredit: kf ? `Foto: ${kf.penulis}, ${kf.lisensi}` : ""}, penutup, kreditPenutup: kh ? `Foto: ${kh.penulis}, ${kh.lisensi}` : ""};
}

/* peta kejadian harian: provinsi berwarna + gelembung jumlah per provinsi, digambar ke PNG (sama di pratinjau, PPTX, PDF) */
const BB = {lon0: 94.6, lon1: 141.2, lat0: -11.2, lat1: 6.3};
const _peta = new Map();   // hasil dataURL per (besar + isi kejadian): PPTX/PDF/pratinjau/tayang tidak menggambar ulang peta yang sama
function petaPng(ks, besar = false) {
  if (!S.geo) return null; const kunci = besar + JSON.stringify(ks); if (_peta.has(kunci)) return _peta.get(kunci);
  const r = gambarPeta(ks, besar); if (_peta.size >= 4) _peta.delete(_peta.keys().next().value); _peta.set(kunci, r); return r;
}
function gambarPeta(ks, besar) {   // besar: gelembung dan nama lebih besar, tanpa baris rincian jenis (untuk Matador)
  const z = besar ? 1.6 : 1;
  if (!S.geo) return null;
  const cw = 1750, ch = 732, c = document.createElement("canvas"); c.width = cw; c.height = ch; const g = c.getContext("2d");
  const sx = cw / (BB.lon1 - BB.lon0), sy = ch / (BB.lat1 - BB.lat0), s = Math.min(sx, sy), ox = (cw - (BB.lon1 - BB.lon0) * s) / 2, oy = (ch - (BB.lat1 - BB.lat0) * s) / 2;
  const P = ([x, y]) => [ox + (x - BB.lon0) * s, oy + (BB.lat1 - y) * s];
  const per = new Map(); for (const x of ks) if (x.prov) { if (!per.has(x.prov)) per.set(x.prov, []); per.get(x.prov).push(x); }
  const JS = LB.JENIS, dom = xs => Object.keys(JS).map(j => [j, xs.filter(x => x.jenis === j).length]).sort((a, b) => b[1] - a[1])[0][0];
  const pusat = {};
  for (const f of S.geo.features) {
    const kode = f.properties.kode, xs = per.get(kode), polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    g.fillStyle = xs ? "#" + (JS[dom(xs)]?.m || "F6D9BF") : "#E4E7EB"; g.strokeStyle = "#FFFFFF"; g.lineWidth = 1.2;
    let besar = 0;
    for (const poly of polys) { g.beginPath(); for (const ring of poly) ring.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.fill("evenodd"); g.stroke();
      const r = poly[0]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const a = (x1 - x0) * (y1 - y0); if (a > besar) { besar = a; pusat[kode] = [(x0 + x1) / 2, (y0 + y1) / 2]; } }
  }
  /* gelembung: yang bertumpuk didorong mendatar; label: coba kanan, kiri, atas, bawah, ambil posisi pertama yang tidak menabrak */
  const gb = [];
  for (const [kode, xs] of per) {
    if (!pusat[kode]) continue; let [x, y] = P(pusat[kode]); const r = (20 + Math.min(14, xs.length * 2)) * z;
    for (let t = 0; t < 8; t++) { const o = gb.find(q => Math.hypot(q.x - x, q.y - y) < q.r + r + 4); if (!o) break; x += (x >= o.x ? 1 : -1) * (o.r + r + 6 - Math.abs(o.x - x)); }
    gb.push({kode, xs, x, y, r, j: JS[dom(xs)] || JS.lainnya});
  }
  g.textBaseline = "middle";
  for (const b of gb) {
    g.fillStyle = "#" + b.j.w; g.strokeStyle = "#FFFFFF"; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#FFFFFF"; g.font = `700 ${24 * z}px Roboto, Arial, sans-serif`; g.textAlign = "center"; g.fillText(String(b.xs.length), b.x, b.y + 1);
    if (b.xs.some(z => z.status === "belum")) { g.fillStyle = "#C8102E"; g.beginPath(); g.arc(b.x + b.r * 0.8, b.y - b.r * 0.8, 12 * z, 0, 7); g.fill(); g.fillStyle = "#FFF"; g.font = `700 ${17 * z}px Roboto, Arial`; g.fillText("!", b.x + b.r * 0.8, b.y - b.r * 0.8 + 1); }
  }
  const kotak = gb.map(b => [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r]);
  g.textAlign = "left";
  for (const b of gb) {
    const nama = S.prov[b.kode] || b.kode, ring = Object.keys(JS).map(k => [k, b.xs.filter(z => z.jenis === k).length]).filter(z => z[1]).map(([k, n]) => `${n} ${JS[k].nama.toLowerCase()}`).join(", ");
    g.font = `700 ${21 * z}px Roboto, Arial, sans-serif`; const w1 = g.measureText(nama).width; g.font = "500 17px Roboto, Arial, sans-serif"; const w2 = besar ? 0 : g.measureText(ring).width + 14, lw = Math.max(w1, w2), lh = besar ? 36 * z : 52;
    /* kandidat: 8 arah x 3 jarak; dipilih yang tumpang-tindihnya paling kecil (0 = bersih), jarak > 0 diberi garis penunjuk */
    const tumpang = q => kotak.reduce((a, o) => a + Math.max(0, Math.min(q[2], o[2]) - Math.max(q[0], o[0])) * Math.max(0, Math.min(q[3], o[3]) - Math.max(q[1], o[1])), 0) + (q[0] < 0 || q[2] > cw || q[1] < 0 || q[3] > ch ? 1e6 : 0);
    let terbaik = null;
    for (const d of [0, 36, 78]) for (const ang of [0, Math.PI, -Math.PI / 2, Math.PI / 2, -Math.PI / 4, Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4]) {
      const cx = b.x + Math.cos(ang) * (b.r + 8 + d + lw / 2 * Math.abs(Math.cos(ang))), cy = b.y + Math.sin(ang) * (b.r + 6 + d + lh / 2 * Math.abs(Math.sin(ang))), q = [cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2], t = tumpang(q) + d * 4;
      if (!terbaik || t < terbaik.t) terbaik = {t, q, d, cx, cy};
    }
    const [lx, ly] = terbaik.q; if (terbaik.d) { g.strokeStyle = "#8A9099"; g.lineWidth = 2; const dl = Math.hypot(terbaik.cx - b.x, terbaik.cy - b.y) || 1; g.beginPath(); g.moveTo(b.x + (terbaik.cx - b.x) / dl * b.r, b.y + (terbaik.cy - b.y) / dl * b.r); g.lineTo(terbaik.cx, terbaik.cy); g.stroke(); }
    kotak.push(terbaik.q);
    g.font = `700 ${21 * z}px Roboto, Arial, sans-serif`; g.fillStyle = "#1A1A1A"; g.fillText(nama, lx, ly + (besar ? lh / 2 : 12));
    if (besar) continue;
    g.font = "500 17px Roboto, Arial, sans-serif"; g.fillStyle = "#" + b.j.m; g.beginPath(); g.roundRect(lx - 2, ly + 26, w2, 24, 12); g.fill(); g.fillStyle = "#" + b.j.w; g.fillText(ring, lx + 5, ly + 39);
  }
  return c.toDataURL("image/png");
}

/* ---------------------------------------------------------------- pratinjau & unduh */
const OUT = () => S.jenis === "harian" ? S.out : "presiden";
const dim = () => OUT() === "matador" ? window.LaporanMatador.ASPEK[S.aspek] : [PS.W, PS.H];
function konteks(no, total) { const [W, H] = dim(); return {isi: S.isi, tanggal: S.tanggal, tahun: S.tanggal.slice(0, 4), prov: S.prov, aset: S.aset, no, total, W, H}; }
function DECK() {
  const o = OUT(); if (o === "presiden") return LB.DECK.presiden;
  if (o === "konpers") return LB.deckKonpers(konteks(1)); if (o === "matador") return LB.deckMatador(konteks(1));
  return LB.deckHarian(konteks(1));   // halaman Pusdalops ikut hanya bila datanya ada
}
function siapkanPeta() {
  if (S.jenis !== "harian") return; const ks = S.isi.kejadian || [], o = OUT();
  S.aset.peta = o === "matador" ? null : petaPng(ks); S.aset.petaM = o === "matador" ? petaPng(ks, true) : null;
}
const skala = () => document.querySelectorAll(".sl-wrap").forEach(w => { w.firstChild.style.transform = `scale(${w.clientWidth / (w.dataset.lebar * 100)})`; });
const koordNow = () => ({isi: S.isi, tanggal: S.tanggal, prov: S.prov});
const naskahNow = () => window.LaporanKonpers.naskah(konteks(1));
function pratinjauNaskah() {
  const n = naskahNow(); $("#lbNaskahTeks").textContent = n.teks;
  $("#lbDurasi").textContent = `${n.kata.toLocaleString("id-ID")} kata, perkiraan durasi baca ${n.label} (sekitar 130 kata per menit). Halaman konpers: ${n.bagian.length}.`;
  return n;
}
async function pratinjau() {
  if (!S.isi) return; const id = ++S.gen, grid = $("#lbGrid"); grid.textContent = "";
  if (OUT() === "naskah") return void pratinjauNaskah();
  if (OUT() === "koordalops") return void ($("#lbKoordTeks").textContent = window.LaporanKoordalops.teks(koordNow()));
  siapkanPeta(); const d = DECK(), [W, H] = dim();
  grid.style.gridTemplateColumns = W / H > 3 ? "1fr" : ""; let sk = 0;   // skala dihitung sekali: semua figur sama lebar
  for (let i = 0; i < d.length; i++) {
    if (id !== S.gen) return;
    const s = d[i], fig = document.createElement("figure"), w = document.createElement("div"), st = document.createElement("div");
    w.className = "sl-wrap"; w.dataset.lebar = W; w.style.aspectRatio = `${W} / ${H}`; st.className = "sl-stage"; st.style.width = W * 100 + "px"; st.style.height = H * 100 + "px"; w.append(st); fig.append(w);
    const cap = document.createElement("figcaption"); cap.textContent = `${i + 1}. ${s.judul}`; fig.append(cap); grid.append(fig);
    sk ||= w.clientWidth / (W * 100); st.style.transform = `scale(${sk})`;
    try { s.buat(konteks(i + 1, d.length)).html(st); } catch (e) { console.error("slide", s.id, e); st.innerHTML = `<div style="padding:40px;font:28px sans-serif">Slide gagal digambar: ${esc(s.id)} (${esc(e.message)})</div>`; }
    await jeda();
  }
}
const jadwalkan = () => { clearTimeout(S.tunda); S.tunda = setTimeout(() => { tulisDraf(); pratinjau(); }, 350); };
let robotoB64 = null;
async function muatRoboto() {   // sama dengan paparan.js: Roboto ditanam supaya PDF = PPTX
  if (robotoB64) return robotoB64;
  const b64 = async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };
  try { robotoB64 = {n: await b64("/vendor/roboto/Roboto-Regular.ttf"), b: await b64("/vendor/roboto/Roboto-Bold.ttf")}; } catch (e) { robotoB64 = {}; }
  return robotoB64;
}
const unduhBlob = window.unduhBlob;   // public/inti/unduh.js
const ukuran = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.round(b / 1024) + " KB";
function namaBerkas(ext) {
  const t = S.tanggal, i = S.isi, tg = `${+t.slice(8)}-${LB.tglK(t).split(" ")[1]}-${t.slice(0, 4)}`;
  if (S.jenis === "harian") {
    if (S.out === "konpers") return `Konferensi-Pers-Penanganan-Bencana-${tg}.${ext}`;
    if (S.out === "matador") return `Matador-Konferensi-Pers-${S.aspek.replace(":", "x")}-${tg}.${ext}`;
    if (S.out === "koordalops") return `Laporan-Dit-Koordalops-${+i.mulai.slice(8)}-${+t.slice(8)}-${LB.tglK(t).split(" ")[1]}-${t.slice(0, 4)}.${ext}`;
    if (S.out === "naskah") return `Naskah-Juru-Bicara-Konferensi-Pers-${tg}.${ext}`;
    return `Laporan-Kejadian-Bencana-Harian-${+i.mulai.slice(8)}-${+t.slice(8)}-${LB.tglK(t).split(" ")[1]}-${t.slice(0, 4)}.${ext}`;
  }
  return `Paparan-Kepala-BNPB-kepada-Presiden-Karhutla-${LB.tglK(t).replace(" ", "-")}-${t.slice(0, 4)}.${ext}`;
}
async function tanamRoboto(doc) {
  const rb = await muatRoboto();
  if (rb.n) { doc.addFileToVFS("Roboto-Regular.ttf", rb.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.addFileToVFS("Roboto-Bold.ttf", rb.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold"); doc.__roboto = true; }
}
async function unduh(jenis) {
  if (S.sibuk || !S.isi) return; S.sibuk = true; S.gen++;
  const tombol = [$("#lbPptx"), $("#lbPdf")]; tombol.forEach(b => b.disabled = true);
  try {
    status("Memuat pustaka…"); await muatLib(jenis); siapkanPeta(); await jeda();
    const d = DECK(), n = d.length, nama = namaBerkas(jenis), [W, H] = dim(); let blob;
    if (jenis === "pptx") {
      const P = new window.PptxGenJS(); if (W === PS.W && H === PS.H) P.layout = "LAYOUT_WIDE"; else { P.defineLayout({name: "LAYAR_LEBAR", width: W, height: H}); P.layout = "LAYAR_LEBAR"; }
      P.title = nama.replace(/\.pptx$/, "").replace(/-/g, " "); P.company = S.isi.instansi || "BNPB";
      for (let i = 0; i < n; i++) { status(`Menyusun slide ${i + 1}/${n}…`); await jeda(); d[i].buat(konteks(i + 1, n)).pptx(P.addSlide()); }
      status("Mengemas PPTX…"); await jeda(); blob = await P.write({outputType: "blob"});
    } else {
      const doc = new window.jspdf.jsPDF({orientation: "landscape", unit: "in", format: [W, H], compress: true}); await tanamRoboto(doc);
      for (let i = 0; i < n; i++) { status(`Menyusun slide ${i + 1}/${n}…`); await jeda(); if (i) doc.addPage([W, H], "landscape"); d[i].buat(konteks(i + 1, n)).pdf(doc); }
      status("Mengemas PDF…"); await jeda(); blob = doc.output("blob");
    }
    unduhBlob(blob, nama); status(`${nama}: ${n} slide, ${ukuran(blob.size)}.`); window.__lbTerakhir = {jenis, slide: n, bytes: blob.size, nama};
  } catch (e) { console.error(e); status("Gagal menyusun berkas: " + (e.message || e)); }
  finally { S.sibuk = false; tombol.forEach(b => b.disabled = false); }
}

/* ---------------------------------------------------------------- naskah: PDF, salin, teleprompter, tayang layar penuh */
async function unduhNaskahPdf() {   // huruf besar, spasi lega, nomor halaman
  if (S.sibuk || !S.isi) return; S.sibuk = true; $("#lbPdf").disabled = true;
  try {
    status("Memuat pustaka…"); await muatLib("pdf"); await jeda();
    const n = naskahNow(), doc = new window.jspdf.jsPDF({unit: "in", format: "a4", compress: true}); await tanamRoboto(doc);
    const fam = doc.__roboto ? "Roboto" : "helvetica", PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), mx = 0.9, my = 0.9, lebar = PW - 2 * mx, ukur = 18, lh = ukur * 1.9 / 72;
    let y = my; doc.setFontSize(ukur);
    const baris = (t, tebal, warna) => { doc.setFont(fam, tebal ? "bold" : "normal"); doc.setTextColor(warna || "#1a1a1a");
      for (const b of doc.splitTextToSize(t.toUpperCase(), lebar)) { if (y + lh > PH - my) { doc.addPage(); y = my; } doc.text(b, mx, y, {baseline: "top"}); y += lh; } };
    baris("Naskah juru bicara konferensi pers", true); baris(LB.tglHari(S.tanggal)); y += lh * 0.5;
    for (const l of n.teks.split("\n")) { if (!l) { y += lh * 0.55; continue; } /^\[SLIDE \d+\]$/.test(l) || /^ANTISIPASI/.test(l) ? baris(l, true, "#d9650b") : /^(Pertanyaan \d+:)/.test(l) ? baris(l, true) : baris(l); }
    const total = doc.getNumberOfPages(); doc.setFontSize(11); doc.setFont(fam, "normal"); doc.setTextColor("#555555");
    for (let p = 1; p <= total; p++) { doc.setPage(p); doc.text(`HALAMAN ${p} DARI ${total}`, PW / 2, PH - 0.5, {align: "center"}); }
    const blob = doc.output("blob"), nama = namaBerkas("pdf"); unduhBlob(blob, nama); status(`${nama}: ${total} halaman, ${ukuran(blob.size)}.`);
  } catch (e) { console.error(e); status("Gagal menyusun naskah: " + (e.message || e)); }
  finally { S.sibuk = false; $("#lbPdf").disabled = false; }
}
async function unduhKoord(jenis) {   // PDF A4 tegak atau DOCX dari model baris yang sama dengan teks WhatsApp
  if (S.sibuk || !S.isi) return; S.sibuk = true; const tombol = [$("#lbPdf"), $("#lbDocx")]; tombol.forEach(b => b.disabled = true);
  try {
    const K = window.LaporanKoordalops, nama = namaBerkas(jenis); let blob, ket;
    if (jenis === "pdf") {
      status("Memuat pustaka…"); await muatLib("pdf"); await jeda();
      const doc = new window.jspdf.jsPDF({unit: "in", format: "a4", compress: true}); await tanamRoboto(doc);
      ket = K.pdf(doc, koordNow(), doc.__roboto ? "Roboto" : "helvetica") + " halaman"; blob = doc.output("blob");
    } else { blob = new Blob([K.docx(koordNow())], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}); ket = "DOCX"; }
    unduhBlob(blob, nama); status(`${nama}: ${ket}, ${ukuran(blob.size)}.`); window.__lbTerakhir = {jenis, bytes: blob.size, nama};
  } catch (e) { console.error(e); status("Gagal menyusun berkas: " + (e.message || e)); }
  finally { S.sibuk = false; tombol.forEach(b => b.disabled = false); }
}
async function salinNaskah() {
  const t = naskahNow().teks;
  try { await navigator.clipboard.writeText(t); status("Naskah disalin."); }
  catch (e) { const a = document.createElement("textarea"); a.value = t; document.body.append(a); a.select(); const ok = document.execCommand("copy"); a.remove(); status(ok ? "Naskah disalin." : "Salin gagal: pilih teks naskah lalu tekan Ctrl+C."); }
}
/* teleprompter: teks besar bergulir (px per detik dari penggeser), Spasi = jeda/lanjut, panah atas/bawah = kecepatan, Esc = tutup */
const Tele = {on: false, jalan: false, pos: 0, t0: 0, raf: 0, maks: 0};
const hitungMaks = () => { const el = $("#tpTeks"); Tele.maks = Math.max(0, el.scrollHeight - el.clientHeight - 2); };   // layout dibaca sekali (buka, ukuran huruf, resize), bukan tiap frame
function teleLoop(t) {
  if (!Tele.on) return; const dt = Tele.t0 ? (t - Tele.t0) / 1000 : 0; Tele.t0 = t;
  if (Tele.jalan) { Tele.pos = Math.min(Tele.maks, Tele.pos + dt * +$("#tpKec").value); $("#tpTeks").scrollTop = Tele.pos; if (Tele.pos >= Tele.maks) { Tele.jalan = false; $("#tpJalan").textContent = "Ulangi"; } }
  Tele.raf = requestAnimationFrame(teleLoop);
}
function teleJalan(v) { Tele.jalan = v; Tele.t0 = 0; $("#tpJalan").textContent = v ? "Jeda" : "Lanjut"; $("#tpJalan").setAttribute("aria-pressed", v ? "true" : "false"); }
function bukaTele() {   // overlay tampil DULU (dalam gestur pengguna); isi teks menyusul sesudah satu frame tercat
  const tp = $("#lbTele"), el = $("#tpTeks"); el.textContent = "Menyiapkan…"; tp.hidden = false; Tele.on = true; Tele.maks = 0; Tele.pos = 0; teleJalan(false);
  tp.requestFullscreen?.()?.catch(() => {}); $("#tpJalan").focus();
  sesudahCat(() => {
    if (!Tele.on) return; const n = naskahNow(), fr = document.createDocumentFragment();
    for (const l of n.badan.split("\n").filter(Boolean)) { const p = document.createElement("p"); p.textContent = l; if (/^\[SLIDE \d+\]$/.test(l)) p.className = "tp-slide"; fr.append(p); }
    el.textContent = ""; el.append(fr); el.style.fontSize = $("#tpUkuran").value + "px"; el.scrollTop = 0; hitungMaks();
    cancelAnimationFrame(Tele.raf); Tele.raf = requestAnimationFrame(teleLoop);
  });
}
function tutupTele() { Tele.on = false; $("#lbTele").hidden = true; cancelAnimationFrame(Tele.raf); if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {}); }
$("#tpJalan").onclick = () => { if ($("#tpJalan").textContent === "Ulangi") { Tele.pos = 0; $("#tpTeks").scrollTop = 0; } teleJalan(!Tele.jalan); };
$("#tpUkuran").oninput = e => { $("#tpTeks").style.fontSize = e.target.value + "px"; requestAnimationFrame(hitungMaks); };
$("#tpTutup").onclick = tutupTele;

const Layar = {on: false, d: null, i: 0, cache: []};
/* tiap slide digambar SEKALI ke div sendiri di dalam panggung; panah hanya menukar slide yang tampil, slide berikutnya disiapkan saat senggang */
function skalaLayar() { const [W, H] = dim(), st = $("#lbLayarStage"); st.style.width = W * 100 + "px"; st.style.height = H * 100 + "px"; st.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / (W * 100), innerHeight / (H * 100))})`; }
function siapSlide(i) {
  if (!Layar.d || i < 0 || i >= Layar.d.length || Layar.cache[i]) return;
  const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0"; d.hidden = true; $("#lbLayarStage").append(d); Layar.cache[i] = d;
  try { Layar.d[i].buat(konteks(i + 1, Layar.d.length)).html(d); } catch (e) { console.error(e); }
}
function gambarLayar() {
  if (!Layar.d) return; skalaLayar(); siapSlide(Layar.i); $("#lbLayarMsg").hidden = true;
  Layar.cache.forEach((d, i) => { if (d) d.hidden = i !== Layar.i; });
  const n = Layar.i + 1; (window.requestIdleCallback || (f => setTimeout(f, 60)))(() => { if (Layar.on) siapSlide(n); });
}
function bukaLayar() {   // hidden=false + fullscreen dulu (masih dalam gestur pengguna), kerja berat sesudah satu frame
  if (!S.isi || OUT() === "naskah" || OUT() === "koordalops") return; Layar.on = true; Layar.i = 0; Layar.d = null; Layar.cache = []; $("#lbLayarStage").textContent = "";
  $("#lbLayarMsg").hidden = false; $("#lbLayar").hidden = false; $("#lbLayar").requestFullscreen?.()?.catch(() => {});
  sesudahCat(() => { if (!Layar.on) return; siapkanPeta(); Layar.d = DECK(); gambarLayar(); });
}
function tutupLayar() { Layar.on = false; $("#lbLayar").hidden = true; if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {}); }
const lompat = n => { if (!Layar.d) return; const i = Math.max(0, Math.min(Layar.d.length - 1, Layar.i + n)); if (i !== Layar.i) { Layar.i = i; gambarLayar(); } };
document.addEventListener("keydown", e => {
  if (Layar.on) { if (e.key === "ArrowRight" || e.key === "PageDown") lompat(1); else if (e.key === "ArrowLeft" || e.key === "PageUp") lompat(-1); else if (e.key === "Home") lompat(-1e9); else if (e.key === "End") lompat(1e9); else if (e.key === "Escape") tutupLayar(); else return; e.preventDefault(); }
  else if (Tele.on) { const k = $("#tpKec"); if (e.key === " " && e.target.tagName !== "BUTTON") { teleJalan(!Tele.jalan); } else if (e.key === "ArrowUp") k.value = +k.value + 10; else if (e.key === "ArrowDown") k.value = +k.value - 10; else if (e.key === "Escape") tutupTele(); else return; e.preventDefault(); }
});
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) { if (Layar.on) tutupLayar(); if (Tele.on) tutupTele(); } });
window.addEventListener("resize", () => requestAnimationFrame(() => { if (Layar.on) skalaLayar(); if (Tele.on) hitungMaks(); }));

/* ---------------------------------------------------------------- kontrol */
document.querySelectorAll("#lbJenis button").forEach(b => b.onclick = async () => {
  if (b.dataset.j === S.jenis) return;
  document.querySelectorAll("#lbJenis button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  tulisDraf(); S.jenis = b.dataset.j; aturOut(); await muatDaftar(); await buka(S.daftar[0]?.tanggal || kini());
});
/* pilihan keluaran jenis harian: chrome (aria-pressed, tombol yang relevan) di-set LANGSUNG, pratinjau berat menyusul lewat jadwalkan() */
function aturOut() {
  const o = OUT(), harian = S.jenis === "harian";
  document.querySelectorAll("#lbOut button").forEach(x => x.setAttribute("aria-pressed", x.dataset.o === S.out ? "true" : "false"));
  $("#lbOut").hidden = !harian; $("#lbAspekW").hidden = o !== "matador"; $("#lbTayang").hidden = !(o === "konpers" || o === "matador");
  const kd = o === "koordalops"; $("#lbPptx").hidden = o === "naskah" || kd; $("#lbDocx").hidden = !kd; $("#lbNaskah").hidden = o !== "naskah"; $("#lbKoord").hidden = !kd;
  $("#lbGrid").hidden = o === "naskah" || kd; $("#lbContoh").hidden = !harian;
}
document.querySelectorAll("#lbOut button").forEach(b => b.onclick = () => { if (b.dataset.o === S.out) return; S.out = b.dataset.o; aturOut(); jadwalkan(); });
$("#lbAspek").onchange = e => { S.aspek = e.target.value; jadwalkan(); };
$("#lbTayang").onclick = bukaLayar;
$("#lbSalin").onclick = salinNaskah; $("#lbTele2").onclick = bukaTele;
$("#lbContoh").onclick = () => {   // dummy: isian contoh Laporan Harian 20-21 Okt 2026, hanya draf peramban (tidak ke server)
  if (S.jenis !== "harian" || !window.LaporanContoh) return; if ((S.isi.kejadian || []).length && !confirm("Timpa isian dengan data contoh?")) return;
  S.isi = {...BARU.harian(S.tanggal), ...window.LaporanContoh.harian(S.tanggal, geser(S.tanggal, -1))};
  gambarForm(); tandaUbah(); status("Isian contoh (dummy) dimuat: 18 kejadian, 12 provinsi. Belum disimpan ke server; Buang draf untuk membatalkan.");
};
$("#lbDaftar").onchange = e => { if (e.target.value) buka(e.target.value); };
$("#lbTgl").onchange = e => { if (e.target.value) buka(e.target.value, {dariTerakhir: true}); };
$("#lbSimpan").onclick = simpan;
$("#lbGeser").onclick = geserHari;
$("#lbPptx").onclick = () => unduh("pptx");
$("#lbPdf").onclick = () => OUT() === "naskah" ? unduhNaskahPdf() : OUT() === "koordalops" ? unduhKoord("pdf") : unduh("pdf");
$("#lbDocx").onclick = () => unduhKoord("docx");
$("#lbKoordSalin").onclick = async () => { const t = window.LaporanKoordalops.teks(koordNow());
  try { await navigator.clipboard.writeText(t); status("Teks Dit. Koordalops disalin."); }
  catch (e) { const a = document.createElement("textarea"); a.value = t; document.body.append(a); a.select(); const ok = document.execCommand("copy"); a.remove(); status(ok ? "Teks Dit. Koordalops disalin." : "Salin gagal: pilih teks lalu salin manual."); } };
$("#lbEks").onclick = () => unduhBlob(new Blob([JSON.stringify({jenis: S.jenis, tanggal: S.tanggal, isi: S.isi}, null, 2)], {type: "application/json"}), `laporan-bnpb-${S.jenis}-${S.tanggal}.json`);
$("#lbImp").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { const o = JSON.parse(await f.text()); if (!o || !LB.DECK[o.jenis] || !/^\d{4}-\d\d-\d\d$/.test(o.tanggal) || typeof o.isi !== "object") throw new Error("bukan berkas laporan");
    tulisDraf(); if (o.jenis !== S.jenis) document.querySelector(`#lbJenis button[data-j="${o.jenis}"]`).click();
    S.jenis = o.jenis; S.tanggal = o.tanggal; $("#lbTgl").value = o.tanggal; S.isi = {...BARU[o.jenis](o.tanggal), ...o.isi}; gambarForm(); tandaUbah(); status(`Diimpor dari ${f.name}. Tekan Simpan untuk menyimpan ke server.`); }
  catch (err) { status("Impor gagal: " + err.message); }
};
$("#lbBuang").onclick = () => { if (!confirm("Buang perubahan yang belum disimpan di peramban ini?")) return; hapusDraf(); buka(S.tanggal); };
window.addEventListener("resize", () => requestAnimationFrame(skala));
window.addEventListener("beforeunload", e => { tulisDraf(); if (S.ubah) e.preventDefault(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) tulisDraf(); });
$("#tema").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };

(async () => {
  const [L, geo] = await Promise.all([fetch("/data/laporan.json").then(r => r.json()).catch(() => null), fetch("/geo/provinsi.json").then(r => r.json()).catch(() => null), muatAset()]);
  S.laporan = L; S.geo = geo;
  if (L) { for (const [k, v] of Object.entries(L.prov)) S.prov[k] = v.nama; PROV_OPSI = Object.entries(S.prov).sort((a, b) => a[1].localeCompare(b[1], "id")); }
  $("#upd").textContent = "Laporan BNPB";
  aturOut(); await muatDaftar(); await buka(S.daftar[0]?.tanggal || kini());
})().catch(e => { console.error(e); status("Halaman gagal dimuat: " + e.message); });
window.__lb = S;
})();
