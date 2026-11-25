/* Peta Situs: SATU registri halaman situs (paket data/kajian-bnpb/peta-situs/, D1). Tiap halaman tercatat tepat sekali:
   {rute, nama, ikon, pintu, grup, akses, hak, induk} (+ token:true bila tautannya bertoken dan tak boleh tampil di menu).
   akses: "tamu" = sama persis dengan kunci PUBLIK_TANPA_SESI (src/worker.js); "sesi" = butuh sesi di host terkunci; "token" = tautan bertoken (D9);
   "kode" = masuk dengan kode WA (modul Kemitraan). hak = kunci HALAMAN_STAF (src/admin_halaman.js) hanya bila ada. Menu hanya alat tunjuk, hak akses tetap di Worker.
   Berkas ini TIDAK mengimpor admin_halaman.js (PS-04 akan membalik arah impornya): predikat bolehStaf dilewatkan ke menuUntuk. Ikon = kunci IKON menu_pusdalops.js. */
import {bolehHalaman} from "./worker.js";   // keputusan halaman terbuka atau tertutup di Worker (satu sumber); worker.js mengimpor menuUntuk (impor melingkar aman: keduanya hanya dipakai di dalam fungsi, bukan saat modul dievaluasi)

export const PINTU = {
  publik: {nama: "Publik", beranda: "/"},
  staf: {nama: "Staf BNPB", beranda: "/bnpb"},
  instansi: {nama: "BPBD dan instansi", beranda: "/instansi"},
  petugas: {nama: "Petugas lapangan", beranda: "/petugas"},
  kampus: {nama: "Kampus dan mitra", beranda: "/kemitraan"}};

/* urutan grup = urutan tampil; admin:true = hanya admin kecuali butirnya punya hak yang dipenuhi peran */
export const GRUP = {
  publik: [{id: "bencana", nama: "Bencana"}, {id: "prediksi", nama: "Prediksi"}, {id: "peringatan", nama: "Peringatan"}, {id: "lapor", nama: "Lapor"}, {id: "masuk", nama: "Masuk"}, {id: "kaki", nama: "Tentang situs"}],
  staf: [{id: "pantau", nama: "Pantau"}, {id: "kejadian", nama: "Kejadian"}, {id: "operasi", nama: "Operasi"}, {id: "laporan", nama: "Laporan"}, {id: "risiko", nama: "Risiko dan perencanaan"},
    {id: "pimpinan", nama: "Pimpinan"}, {id: "jejaring", nama: "Jejaring"}, {id: "pengaturan", nama: "Pengaturan", admin: true}],
  instansi: [{id: "kerja", nama: "Kerja BPBD"}, {id: "data", nama: "Data dan logistik"}],
  petugas: [{id: "lapangan", nama: "Lapangan"}],
  kampus: [{id: "kemitraan", nama: "Kemitraan"}]};

/* [rute, nama, ikon, grup, akses, hak, induk, token, juga] per pintu; juga = pintu lain yang ikut menampilkan butir ini (tanpa entri kedua), di grup pertama pintu itu; urutan baris = urutan menu */
const T = (pintu, baris) => baris.map(([rute, nama, ikon, grup, akses = "sesi", hak = null, induk = null, token = false, juga]) =>
  ({rute, nama, ikon, pintu, grup, akses, hak, induk, ...(token ? {token: true} : {}), ...(juga ? {juga} : {})}));
const B = "bencana", K = "kaki", L = "lapor";

const _HALAMAN = [
  ...T("publik", [
    ["/semua", "Semua bencana", "daftar", B],
    ["/", "Karhutla", "pin", B],
    ["/desa-waspada", "Desa waspada", "peringatan", B, "tamu", null, "/"],
    ["/laporan-konsesi", "Laporan konsesi terbakar", "daftar", B, "sesi", null, "/"],
    ["/banjir", "Banjir", "banjir", B],
    ["/banjir/replay", "Putar ulang banjir", "grafik", B, "sesi", null, "/banjir"],
    ["/banjir/laporan.html", "Laporan banjir", "simpan", B, "sesi", null, "/banjir"],
    ["/banjir/laporan-das.html", "Laporan banjir per DAS", "simpan", B, "sesi", null, "/banjir"],
    ["/cuaca", "Cuaca", "awan", B],
    ["/cuaca/simulasi", "Simulasi cuaca", "grafik", B, "sesi", null, "/cuaca"],
    ["/cuaca/laporan.html", "Laporan cuaca", "simpan", B, "sesi", null, "/cuaca"],
    ["/pesisir", "Pesisir", "banjir", B],
    ["/gempa", "Gempa", "sinyal", B],
    ["/gempa/laporan.html", "Laporan gempa", "simpan", B, "sesi", null, "/gempa"],
    ["/gunungapi", "Gunung api", "peringatan", B],
    ["/gunungapi/simulasi.html", "Simulasi gunung api", "grafik", B, "sesi", null, "/gunungapi"],
    ["/gunungapi/laporan.html", "Laporan gunung api", "simpan", B, "sesi", null, "/gunungapi"],
    ["/kekeringan", "Kekeringan", "kalender", B],
    ["/kekeringan/simulasi", "Simulasi kekeringan", "grafik", B, "sesi", null, "/kekeringan"],
    ["/kekeringan/laporan.html", "Laporan kekeringan", "simpan", B, "sesi", null, "/kekeringan"],
    ["/udara", "Kualitas udara", "awan", B],
    ["/udara/laporan.html", "Laporan udara", "simpan", B, "sesi", null, "/udara"],
    ["/prediksi", "Prediksi", "grafik", "prediksi"],
    ["/prediksi/ringkas", "Prediksi ringkas", "daftar", "prediksi", "sesi", null, "/prediksi"],
    ["/peringatan", "Peringatan", "peringatan", "peringatan"],
    ["/monitor", "Monitor peringatan", "sinyal", "peringatan", "sesi", null, "/peringatan"],
    ["/lapor", "Lapor bencana", "pin", L, "tamu"],
    ["/lapor/lacak", "Lacak laporan", "meja", L, "tamu", null, "/lapor", true],
    ["/lapor/hari-ini", "Kejadian hari ini", "kalender", L, "tamu", null, "/lapor"],
    ["/lapor/s", "Kabar selamat bertautan", "sinyal", L, "tamu", null, "/lapor", true],
    ["/kabar", "Kabar selamat", "sinyal", L],
    ["/alun-alun", "Alun-alun", "personel", L, "tamu"],
    ["/lapor/poster.html", "Poster desa", "simpan", L, "sesi", null, "/lapor"],
    ["/warga", "Lapor warga lama", "daftar", L, "sesi", null, "/lapor"],
    ["/bantu", "Tawaran bantuan organisasi", "personel", L, "tamu", null, null, true],
    ["/masuk", "Masuk", "personel", "masuk", "tamu"],
    ["/tentang", "Tentang", "daftar", K],
    ["/docs", "Dokumentasi", "daftar", K, "tamu"],
    ["/privasi", "Privasi", "daftar", K],
    ["/syarat", "Syarat penggunaan", "daftar", K],
    ["/statistik", "Statistik", "grafik", K],
    ["/api", "API", "daftar", K],
    ["/verifikasi", "Verifikasi dokumen", "simpan", K, "tamu"],
    ["/daftar-kontak", "Daftar kontak darurat", "sinyal", K, "tamu"],
    ["/laporan", "Laporan", "simpan", K],
    ["/paparan", "Paparan", "kalender", K]]),
  ...T("staf", [
    ["/bnpb", "Beranda staf", "daftar", "pantau"],
    ["/bnpb/dalops", "Pantau kejadian", "banjir", "pantau"],
    ["/admin/pantau", "Meja pantau", "meja", "pantau", "sesi", "pantau"],
    ["/lapor/meja", "Laporan warga", "daftar", "pantau", "sesi", null, null, false, ["instansi"]],
    ["/admin/pengingat", "Pengingat", "kalender", "pantau"],
    ["/command-center", "Command center", "meja", "pantau", "sesi", "command-center"],
    ["/bnpb/logbook", "Logbook", "daftar", "pantau"],
    ["/siklus", "Siklus bencana", "kalender", "kejadian"],
    ["/siklus/kejadian", "Buku besar kejadian", "daftar", "kejadian", "tamu", null, "/siklus"],
    ["/rumah-rusak", "Rumah rusak", "daftar", "kejadian"],
    ["/kejadian.html", "Laporan kejadian", "simpan", "kejadian"],
    ["/pelaporan", "Laporan dan arsip", "simpan", "kejadian", "sesi", null, "/"],
    ["/bnpb/operasi", "Operasi", "personel", "operasi"],
    ["/bnpb/operasi-lapangan", "Operasi lapangan", "pin", "operasi"],
    ["/?operasi", "Peta operasi lapangan", "pin", "operasi", "sesi", null, "/"],
    ["/admin/omc", "Sortie modifikasi cuaca", "awan", "operasi", "sesi", "omc"],
    ["/renlap-cetak", "Renlap cetak", "simpan", "operasi"],
    ["/renlap-omc", "Renlap modifikasi cuaca", "simpan", "operasi"],
    ["/pipa", "SIPPA", "banjir", "operasi", "sesi", "pipa"],
    ["/admin/posko", "Ruang posko", "personel", "operasi", "sesi", "posko"],
    ["/admin/drone", "Drone", "pin", "operasi"],
    ["/bnpb/bahan", "Bahan laporan", "daftar", "laporan"],
    ["/admin/laporan-karhutla", "Laporan karhutla", "simpan", "laporan", "sesi", "laporan-karhutla"],
    ["/laporan-bnpb", "Laporan Koordalops", "simpan", "laporan"],
    ["/sitrep", "Sitrep", "simpan", "laporan"],
    ["/bnpb/dokumen", "Dokumen", "simpan", "laporan"],
    ["/dokumen", "Generator dokumen", "simpan", "laporan"],
    ["/bnpb/katalog-dokumen", "Katalog dokumen", "daftar", "laporan", "tamu"],
    ["/admin/laporan", "Ruang laporan", "daftar", "laporan", "sesi", "laporan"],
    ["/admin/gakkum", "Berkas Gakkum", "daftar", "laporan"],
    ["/admin/segel", "Segel dokumen", "simpan", "laporan"],
    ["/bnpb/perencanaan", "Perencanaan", "kalender", "risiko"],
    ["/bnpb/siaga", "Siaga", "peringatan", "risiko"],
    ["/risiko", "Risiko", "peringatan", "risiko"],
    ["/risiko-kebakaran", "Risiko kebakaran", "peringatan", "risiko"],
    ["/kebutuhan", "Kebutuhan", "daftar", "risiko"],
    ["/bnpb/inarisk", "InaRISK", "pin", "risiko"],
    ["/bnpb/data-bencana", "Data bencana", "grafik", "risiko"],
    ["/bnpb/rapor-sumber", "Rapor sumber", "grafik", "risiko"],
    ["/bnpb/silang", "Silang sumber", "grafik", "risiko"],
    ["/admin/pimpinan", "Layar pimpinan", "grafik", "pimpinan"],
    ["/bnpb/pimpinan", "Layar pimpinan BNPB", "grafik", "pimpinan"],
    ["/kinerja-bnpb", "Kinerja BNPB", "grafik", "pimpinan"],
    ["/admin/kinerja", "Kinerja pemantauan", "grafik", "pimpinan", "sesi", "kinerja"],
    ["/presiden", "Panel presiden", "grafik", "pimpinan", "tamu"],
    ["/relawan", "Relawan", "personel", "jejaring"],
    ["/relawan/saya", "Relawan saya", "personel", "jejaring", "sesi", null, "/relawan"],
    ["/admin/relawan", "Kelola relawan", "personel", "jejaring", "sesi", null, "/relawan"],
    ["/admin/alun", "Alun-alun staf", "personel", "jejaring"],
    ["/direktori", "Direktori", "daftar", "jejaring"],
    ["/riset", "Riset", "grafik", "jejaring"],
    ["/riset/mitra", "Mitra riset", "grafik", "jejaring", "sesi", null, "/riset"],
    ["/admin/riset", "Kelola riset", "grafik", "jejaring", "sesi", null, "/riset"],
    ["/meja", "Meja kerja", "meja", "jejaring", "tamu"],
    ["/admin/meja", "Meja kerja staf", "meja", "jejaring", "sesi", "meja"],
    ["/bnpb/hukum", "Hukum", "daftar", "jejaring"],
    ["/bnpb/saham", "Saham", "grafik", "jejaring"],
    ["/ai", "Asisten AI", "sinyal", "jejaring", "sesi", "ai"],
    ["/admin/instansi", "Akun instansi", "personel", "jejaring", "sesi", "instansi"],
    ["/admin/aktivasi", "Aktivasi daerah", "pin", "jejaring", "sesi", "aktivasi"],
    ["/admin/akun", "Akun dan akses", "personel", "pengaturan"],
    ["/admin/kunci-api", "Kunci API", "simpan", "pengaturan"],
    ["/admin/biaya-bot", "Biaya bot", "grafik", "pengaturan"],
    ["/admin/kontak", "Buku kontak", "sinyal", "pengaturan"],
    ["/admin/statistik", "Statistik admin", "grafik", "pengaturan"],
    ["/admin/pesan", "Kotak pesan", "daftar", "pengaturan"],
    ["/admin/foto", "Foto lapangan", "pin", "pengaturan"],
    ["/admin/labelfoto", "Label foto", "daftar", "pengaturan", "sesi", null, "/admin/foto"],
    ["/admin/sosmed", "Media sosial", "sinyal", "pengaturan"],
            ["/admin/inventaris", "Inventaris alat", "daftar", "pengaturan", "sesi", "inventaris"],
    ["/admin/korban", "Korban jiwa", "daftar", "pengaturan", "sesi", "korban"],
    ["/admin/pendataan", "Pendataan admin", "daftar", "pengaturan"],
    ["/design-system", "Sistem desain", "daftar", "pengaturan"],
    ["/design-system/bnpb", "Sistem desain BNPB", "daftar", "pengaturan", "sesi", null, "/design-system"],
    ["/design-system/sistem", "Peta sistem", "daftar", "pengaturan", "sesi", null, "/design-system"]]),
  ...T("instansi", [
    ["/instansi", "Beranda instansi", "personel", "kerja", "tamu"],
    ["/pendataan", "Pendataan", "daftar", "kerja", "tamu"],
    ["/instansi/data-bencana", "Data bencana", "grafik", "data"],
    ["/instansi/logpal", "Logistik LogPal", "daftar", "data"],
    ["/lapor/data", "Data lanjutan tim", "daftar", "data", "tamu", null, "/instansi", true]]),
  ...T("petugas", [
    ["/petugas", "Absen dan logbook", "personel", "lapangan", "tamu"],
    ["/petugas/panel", "Panel petugas", "grafik", "lapangan"],
    ["/lapangan", "Regu lapangan", "pin", "lapangan", "tamu"],
    ["/uji-lapangan", "Uji lapangan", "daftar", "lapangan"],
    ["/lacak", "Lacak penugasan", "pin", "lapangan", "token"],
    ["/renlap", "Renlap HP", "simpan", "lapangan", "tamu", null, null, true],
    ["/uji-pilot", "Uji pilot", "daftar", "lapangan", "tamu", null, null, true],
    ["/pipa/lapangan", "Form lapangan SIPPA", "banjir", "lapangan", "token", null, "/pipa"]]),
  ...T("kampus", [
    ["/kemitraan", "Kemitraan", "personel", "kemitraan", "kode"],
    ["/kampus", "Kampus saya", "personel", "kemitraan", "token"],
    ["/kemitraan/masuk", "Masuk mitra", "personel", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/saya", "Saya", "personel", "kemitraan", "token", null, "/kemitraan"],
    ["/kemitraan/buku", "Buku", "daftar", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/panduan", "Panduan", "daftar", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/daftar", "Daftar mitra", "daftar", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/sertifikat/:id", "Sertifikat", "simpan", "kemitraan", "token", null, "/kemitraan/saya"]])];

/* Halaman /admin/* yang di Worker admin saja (halamanAdmin tanpa daftar peran, atau Super Admin): menu tidak boleh menawarkannya ke staf. Diperiksa
   lawan sumber Worker di tests/warga/peta_situs.test.mjs. */
const ADMIN_SAJA = new Set(["statistik", "pesan", "foto", "labelfoto", "sosmed", "kunci-api", "biaya-bot", "kontak", "akun", "pengingat", "gakkum", "pimpinan", "alun", "riset", "relawan", "meja", "pendataan"].map(k => "/admin/" + k));
/* gerbang sendiri halaman (bukan kunci HALAMAN_STAF): /admin/segel = PERAN_BACA src/segel.js */
const PERAN_SENDIRI = {"/admin/segel": ["pimpinan", "pusdalops"]};
export const HALAMAN = _HALAMAN.map(e => ({...e, ...(ADMIN_SAJA.has(e.rute) ? {admin: true} : {}), ...(PERAN_SENDIRI[e.rute] ? {peran: PERAN_SENDIRI[e.rute]} : {})}));

/* Menu untuk satu sesi (ALGORITMA "Penyaring menu"). sesi = {jenis: "admin"|"staf"|"instansi"|"petugas"|"kemitraan"|"pemirsa"|null, peran: []};
   boleh = bolehStaf dari src/admin_halaman.js (dilewatkan, bukan diimpor: menghindari impor melingkar).
   Hasil: [{pintu, nama, beranda, grup: [{id, nama, butir: [entri]}]}], grup kosong dibuang, urutan = urutan GRUP dan HALAMAN. */
const PINTU_AKUN = {staf: "staf", instansi: "instansi", petugas: "petugas", kemitraan: "kampus"};
export function menuUntuk(sesi, boleh, terkunci = true) {
  const jenis = sesi?.jenis, peran = sesi?.peran || [], admin = jenis === "admin";
  const adaPeran = jenis !== "staf" || peran.length > 0;   // staf tanpa peran: tak ada pintu staf
  const hanyaDirektori = jenis === "staf" && peran.length > 0 && peran.every(p => p === "direktori");
  const pintuBoleh = new Set(["publik", ...(admin ? Object.keys(PINTU) : PINTU_AKUN[jenis] && adaPeran ? [PINTU_AKUN[jenis]] : [])]);
  const grupAdmin = new Set(Object.values(GRUP).flat().filter(g => g.admin).map(g => g.id));
  const lihatDi = (e, d) => {   // apakah butir e tampil di pintu d untuk sesi ini
    if (e.akses === "token" || e.token || !pintuBoleh.has(d) || !bolehHalaman(e.rute, sesi, terkunci)) return false;
    if (d !== e.pintu) return (e.juga || []).includes(d);
    if (d !== "staf" || admin) return true;
    if (e.admin) return false;
    if (hanyaDirektori) return e.rute === "/direktori";
    if (e.peran) return peran.some(p => e.peran.includes(p));
    return e.hak ? boleh(e.hak, peran) : !grupAdmin.has(e.grup);
  };
  const idGrup = (e, d) => d === e.pintu ? e.grup : GRUP[d][0].id;
  return Object.entries(PINTU).filter(([id]) => pintuBoleh.has(id)).map(([id, p]) => ({pintu: id, nama: p.nama, beranda: p.beranda,
    grup: GRUP[id].map(g => ({id: g.id, nama: g.nama, butir: HALAMAN.filter(e => lihatDi(e, id) && idGrup(e, id) === g.id)})).filter(g => g.butir.length)})).filter(p => p.grup.length);
}
