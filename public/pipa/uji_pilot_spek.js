/* Uji pilot SIPPA Kalteng tanpa login (keputusan SIPPA 59): daftar tahap laporan dan batas tiap isian.
   Satu sumber untuk dua pemakai: layar /uji-pilot (public/pipa/uji_pilot.js) dan validasi server (src/uji_pilot.js mengimpor
   berkas ini langsung). ES module tanpa DOM. Tahap dan petak SAMA dengan CHECK migrations/0061_uji_pilot.sql
   (tests/warga/uji_pilot.test.mjs membacanya dari SQL). Waktu tiap tahap = waktu foto, jadi stopwatch keputusan 53
   (tiba, air mengalir, bongkar) terisi dari laporan itu sendiri. */

export const PETAK = ["L1", "L2", "K1", "K2"];
export const KEDALAMAN = [10, 30, 50, 100];
export const TITIK = 5;

const n = (nama, label, min, maks, satuan, o = {}) => ({nama, label, tipe: "angka", min, maks, satuan, ...o});
const b = (nama, label, min, maks, satuan, o = {}) => ({nama, label, tipe: "bulat", min, maks, satuan, ...o});
const p = (nama, label, pilihan, o = {}) => ({nama, label, tipe: "pilihan", pilihan, ...o});
const ya = (nama, label, o = {}) => p(nama, label, [["1", "Ya"], ["0", "Tidak"]], o);
const suhu = {nama: "suhu", label: "Suhu tanah (°C)", tipe: "suhu"};
const asap = p("asap", "Asap dari tanah", [["0", "Tidak ada"], ["1", "Tipis"], ["2", "Sedang"], ["3", "Tebal"]]);

/* foto: apa yang harus terlihat di foto supaya laporan bisa dipakai sebagai bukti */
export const TAHAP = [
  {id: "tiba", judul: "Tiba di lokasi", ikon: "📍", foto: "Regu dan alat di titik parkir atau titik turun perahu",
   medan: [b("n_orang", "Jumlah orang di regu", 1, 50, "orang", {wajib: true}), p("jenis", "Jenis sesi", [["karhutla", "Uji di api"], ["latihan", "Latihan"]], {wajib: true})]},
  {id: "pompa", judul: "Pompa terpasang", ikon: "⛽", foto: "Pompa di tepi air dan selang isap masuk ke air",
   medan: [p("jenis_air", "Sumber air", [["kanal", "Kanal"], ["parit", "Parit"], ["sungai", "Sungai"], ["sumur", "Sumur bor"], ["lain", "Lainnya"]], {wajib: true}),
     n("dalam_air_cm", "Dalam air di titik isap", 0, 1000, "cm"), n("lebar_air_m", "Lebar parit, kanal, atau sungai", 0, 500, "m")]},
  {id: "air_mengalir", judul: "Air sampai di lance", ikon: "💧", foto: "Air keluar dari ujung lance, jarum pengukur tekanan terlihat",
   medan: [ya("air_sampai_lance", "Air sampai di ujung lance", {wajib: true}), n("tekanan_pompa_bar", "Tekanan di pompa", 0, 25, "bar"),
     n("tekanan_lance_bar", "Tekanan di lance", 0, 25, "bar"), n("panjang_selang_m", "Panjang selang terpasang", 0, 5000, "m")]},
  {id: "petak_sebelum", judul: "Petak sebelum disuntik", ikon: "🌡️", petak: true, foto: "Petak dari dekat dengan patok, asap terlihat",
   medan: [n("tebal_gambut_cm", "Tebal gambut (hasil bor)", 0, 2000, "cm"), n("muka_air_cm", "Kedalaman muka air tanah", 0, 500, "cm"), asap, suhu]},
  {id: "injeksi", judul: "Menyuntik atau menyemprot", ikon: "🧯", petak: true, foto: "Lance tertancap di gambut, atau nozzle menyemprot di petak pembanding",
   medan: [b("menit", "Lama menyuntik atau menyemprot", 0, 600, "menit", {wajib: true}), b("tusukan", "Jumlah tusukan lance", 0, 300, "tusukan"),
     n("tekanan_lance_bar", "Tekanan di lance", 0, 25, "bar"), b("tahan_2bar_menit", "Lama tekanan lance ≥ 2 bar", 0, 1440, "menit")]},
  {id: "petak_sesudah", judul: "Petak sesudah disuntik", ikon: "🌡️", petak: true, foto: "Petak yang sama dari arah yang sama dengan foto sebelum",
   medan: [asap, suhu]},
  {id: "petak_24j", judul: "Petak 24 jam kemudian", ikon: "🕑", petak: true, foto: "Petak yang sama dari arah yang sama, sehari kemudian",
   medan: [asap, ya("nyala_ulang", "Ada api atau bara menyala lagi", {wajib: true}), suhu]},
  {id: "bongkar", judul: "Selesai dan bongkar", ikon: "📦", foto: "Semua alat sudah digulung dan dikumpulkan",
   medan: [n("jam_pompa", "Lama pompa menyala", 0, 48, "jam"), n("bbm_l", "Bensin terpakai", 0, 500, "liter"), n("air_m3", "Air terpakai (meteran air, bila ada)", 0, 1000, "m³"),
     ya("kecelakaan", "Ada kecelakaan kerja", {wajib: true}), b("bocor_henti_menit", "Berhenti karena bocor", 0, 1440, "menit"),
     b("alat_kembali_pct", "Alat kembali utuh dan berfungsi", 0, 100, "%")]},
  {id: "kendala", judul: "Kendala atau kejadian", ikon: "⚠️", foto: "Kendala yang terjadi (jalan rusak, alat rusak, api membesar, dan sebagainya)", catatanWajib: true, medan: []},
];
export const TAHAP_ID = TAHAP.map(t => t.id);
export const MAKS = {catatan: 1000, nama: 60, regu: 80, isi: 4000};

/* -> {ok, isi (bersih, siap JSON), galat:[...]} ; masukan = objek bernilai string (FormData) atau angka */
export function cekIsi(tahapId, petak, isi = {}, catatan = "") {
  const t = TAHAP.find(x => x.id === tahapId), galat = [];
  if (!t) return {ok: false, galat: [`tahap harus salah satu dari ${TAHAP_ID.join(", ")}`]};
  if (t.petak && !PETAK.includes(petak)) galat.push(`pilih petak: ${PETAK.join(", ")}`);
  if (!t.petak && petak) galat.push("tahap ini tidak memakai petak");
  if (t.catatanWajib && !String(catatan || "").trim()) galat.push("tulis kendalanya di catatan");
  const bersih = {}, kenal = new Set(t.medan.map(m => m.nama));
  for (const k of Object.keys(isi || {})) if (!kenal.has(k)) galat.push(`isian ${k} tidak dikenal untuk tahap ${t.judul}`);
  for (const m of t.medan) {
    const v = isi?.[m.nama];
    const kosong = v == null || v === "" || (m.tipe === "suhu" && typeof v === "object" && !Object.keys(v).length);
    if (kosong) { if (m.wajib) galat.push(`${m.label} wajib diisi`); continue; }
    if (m.tipe === "pilihan") {
      const s = String(v); if (!m.pilihan.some(([k]) => k === s)) { galat.push(`${m.label}: pilihan tidak dikenal`); continue; }
      bersih[m.nama] = /^\d+$/.test(s) ? Number(s) : s;
    } else if (m.tipe === "suhu") {
      if (typeof v !== "object" || Array.isArray(v)) { galat.push("suhu harus kisi titik × kedalaman"); continue; }
      const kisi = {};
      for (const [titik, baris] of Object.entries(v)) {
        if (!/^[1-5]$/.test(titik) || !Array.isArray(baris) || baris.length !== KEDALAMAN.length) { galat.push(`suhu titik ${titik} tidak sah`); continue; }
        const a = baris.map(x => x == null || x === "" ? null : Number(String(x).replace(",", ".")));
        if (a.some(x => x != null && !(Number.isFinite(x) && x >= -10 && x <= 900))) { galat.push(`suhu titik ${titik} harus -10 sampai 900 °C`); continue; }
        if (a.some(x => x != null)) kisi[titik] = a;
      }
      if (Object.keys(kisi).length) bersih.suhu = kisi;
    } else {
      const x = Number(String(v).replace(",", "."));
      if (!Number.isFinite(x) || x < m.min || x > m.maks || (m.tipe === "bulat" && !Number.isInteger(x))) {
        galat.push(`${m.label} harus ${m.tipe === "bulat" ? "bilangan bulat " : ""}${m.min} sampai ${m.maks} ${m.satuan}`); continue;
      }
      bersih[m.nama] = x;
    }
  }
  return {ok: !galat.length, isi: bersih, galat};
}

/* ringkasan suhu: maksimum dan proporsi titik < 40 °C (definisi padam, dossier UMUM.uji) */
export function ringkasSuhu(kisi) {
  const v = Object.values(kisi || {}).flat().filter(x => x != null);
  if (!v.length) return null;
  return {maks: Math.max(...v), n: v.length, dingin: v.filter(x => x < 40).length};
}
