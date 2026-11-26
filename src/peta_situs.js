/* Peta Situs: SATU registri halaman situs (paket data/kajian-bnpb/peta-situs/, D1). Tiap halaman tercatat tepat sekali:
   {rute, nama, ikon, pintu, grup, akses, hak, induk} (+ token:true bila tautannya bertoken dan tak boleh tampil di menu).
   akses: "tamu" = sama persis dengan kunci PUBLIK_TANPA_SESI (src/worker.js); "sesi" = butuh sesi di host terkunci; "token" = tautan bertoken (D9);
   "kode" = masuk dengan kode WA (modul Kemitraan). hak = kunci HALAMAN_STAF (src/admin_halaman.js) hanya bila ada. Menu hanya alat tunjuk, hak akses tetap di Worker.
   admin_halaman.js mengimpor berkas ini (nav admin dan staf, PS-04), jadi berkas ini TIDAK mengimpor admin_halaman.js: predikat bolehStaf dilewatkan ke menuUntuk. Ikon = kunci IKON menu_pusdalops.js. */
import {bolehHalaman} from "./gerbang_halaman.js";   // keputusan halaman terbuka atau tertutup di Worker (satu sumber, modul daun tanpa impor worker.js, jadi tanpa siklus)

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
    ["/laporan-konsesi", "Laporan konsesi terbakar", "daftar", B, "tamu", null, "/"],
    ["/banjir", "Banjir", "banjir", B],
    ["/banjir/replay", "Replay banjir Jabodetabek", "grafik", B, "sesi", null, "/banjir"],
    ["/banjir/laporan.html", "Laporan harian banjir & longsor serta rob", "simpan", B, "sesi", null, "/banjir"],
    ["/banjir/laporan-das.html", "Bukti DAS hulu", "simpan", B, "sesi", null, "/banjir"],
    ["/cuaca", "Cuaca", "awan", B],
    ["/cuaca/simulasi", "Simulasi cuaca 72 jam", "grafik", B, "sesi", null, "/cuaca"],
    ["/cuaca/laporan.html", "Laporan harian cuaca ekstrem", "simpan", B, "sesi", null, "/cuaca"],
    ["/pesisir", "Pesisir", "banjir", B],
    ["/gempa", "Gempa", "sinyal", B],
    ["/gempa/laporan.html", "Laporan harian gempa & tsunami", "simpan", B, "sesi", null, "/gempa"],
    ["/gunungapi", "Gunung api", "peringatan", B],
    ["/gunungapi/simulasi.html", "Simulasi erupsi gunung api", "grafik", B, "sesi", null, "/gunungapi"],
    ["/gunungapi/laporan.html", "Laporan harian gunung api", "simpan", B, "sesi", null, "/gunungapi"],
    ["/kekeringan", "Kekeringan", "kalender", B],
    ["/kekeringan/simulasi", "Simulasi kekeringan", "grafik", B, "sesi", null, "/kekeringan"],
    ["/kekeringan/laporan.html", "Laporan harian kekeringan", "simpan", B, "sesi", null, "/kekeringan"],
    ["/udara", "Kualitas udara", "awan", B],
    ["/udara/laporan.html", "Laporan harian kualitas udara", "simpan", B, "sesi", null, "/udara"],
    ["/prediksi", "Prediksi", "grafik", "prediksi"],
    ["/prediksi/ringkas", "Siaga 3 hari", "daftar", "prediksi", "sesi", null, "/prediksi"],
    ["/peringatan", "Peringatan dini untuk lokasimu", "peringatan", "peringatan"],
    ["/monitor", "Monitor bencana", "sinyal", "peringatan", "sesi", null, "/peringatan"],
    ["/lapor", "Lapor bencana", "pin", L, "tamu"],
    ["/lapor/lacak", "Lacak laporan", "meja", L, "tamu", null, "/lapor", true],
    ["/lapor/hari-ini", "Kejadian hari ini", "kalender", L, "tamu", null, "/lapor"],
    ["/lapor/s", "Kabar selamat bertautan", "sinyal", L, "tamu", null, "/lapor", true],
    ["/kabar", "Kabar api per kabupaten", "sinyal", L],
    ["/alun-alun", "Alun-alun", "personel", L, "tamu"],
    ["/lapor/poster.html", "Poster QR desa", "simpan", L, "sesi", null, "/lapor"],
    ["/bantu", "Tawaran bantuan organisasi", "personel", L, "tamu", null, null, true],
    ["/masuk", "Masuk", "personel", "masuk", "tamu"],
    ["/tentang", "Tentang", "daftar", K],
    ["/docs", "Panduan", "daftar", K, "tamu"],
    ["/privasi", "Pemberitahuan privasi", "daftar", K],
    ["/syarat", "Syarat dan ketentuan", "daftar", K],
    ["/statistik", "Statistik pengunjung", "grafik", K],
    ["/api", "API data", "daftar", K],
    ["/verifikasi", "Periksa keaslian dokumen", "simpan", K, "tamu"],
    ["/daftar-kontak", "Registrasi kontak pemangku kepentingan", "sinyal", K, "tamu"],
    ["/laporan", "Laporan harian karhutla", "simpan", K],
    ["/paparan", "Paparan rakor karhutla", "kalender", K]]),
  ...T("staf", [
    ["/bnpb", "Ruang koordinasi", "daftar", "pantau"],
    ["/bnpb/dalops", "Pantau Dalops", "banjir", "pantau"],
    ["/admin/pantau", "Meja pantau", "meja", "pantau", "sesi", "pantau"],
    ["/lapor/meja", "Meja laporan", "daftar", "pantau", "sesi", null, null, false, ["instansi"]],
    ["/admin/pengingat", "Pengingat", "kalender", "pantau"],
    ["/command-center", "Command center", "meja", "pantau", "sesi", "command-center"],
    ["/bnpb/logbook", "Logbook Pusdalops", "daftar", "pantau"],
    ["/siklus", "Siklus bencana", "kalender", "kejadian"],
    ["/siklus/kejadian", "Buku besar kejadian", "daftar", "kejadian", "tamu", null, "/siklus"],
    ["/rumah-rusak", "Rumah rusak", "daftar", "kejadian"],
    ["/kejadian.html", "Laporan kejadian", "simpan", "kejadian"],
    ["/pelaporan", "Laporan dan arsip", "simpan", "kejadian", "sesi", null, "/"],
    ["/bnpb/operasi", "Operasi Pusdalops", "personel", "operasi"],
    ["/bnpb/operasi-lapangan", "Operasi lapangan", "pin", "operasi"],
    ["/?operasi", "Peta operasi lapangan", "pin", "operasi", "sesi", null, "/"],
    ["/admin/omc", "Sortie OMC", "awan", "operasi", "sesi", "omc"],
    ["/renlap-cetak", "Renlap rute udara", "simpan", "operasi"],
    ["/renlap-omc", "Renlap OMC", "simpan", "operasi"],
    ["/pipa", "SIPPA", "banjir", "operasi", "sesi", "pipa"],
    ["/admin/posko", "Ruang posko", "personel", "operasi", "sesi", "posko"],
    ["/admin/drone", "Atur drone gambut", "pin", "operasi"],
    ["/bnpb/bahan", "Bahan laporan harian", "daftar", "laporan"],
    ["/admin/laporan-karhutla", "Laporan bencana", "simpan", "laporan", "sesi", "laporan-karhutla"],
    ["/laporan-bnpb", "Laporan Koordalops", "simpan", "laporan"],
    ["/sitrep", "Laporan situasi", "simpan", "laporan"],
    ["/bnpb/dokumen", "Dokumen Pusdalops", "simpan", "laporan"],
    ["/dokumen", "Generator dokumen", "simpan", "laporan"],
    ["/bnpb/katalog-dokumen", "Katalog dokumen", "daftar", "laporan", "tamu"],
    ["/admin/laporan", "Ruang laporan", "daftar", "laporan", "sesi", "laporan"],
    ["/admin/gakkum", "Berkas Gakkum", "daftar", "laporan"],
    ["/admin/segel", "Segel dokumen", "simpan", "laporan"],
    ["/bnpb/perencanaan", "Perencanaan Pusdalops", "kalender", "risiko"],
    ["/bnpb/siaga", "Siaga pra-musim", "peringatan", "risiko"],
    ["/risiko", "Risiko kecamatan", "peringatan", "risiko"],
    ["/risiko-kebakaran", "Risiko kebakaran permukiman", "peringatan", "risiko"],
    ["/kebutuhan", "Perkiraan kebutuhan musim", "daftar", "risiko"],
    ["/bnpb/inarisk", "Risiko bencana Indonesia (InaRISK)", "pin", "risiko"],
    ["/bnpb/data-bencana", "Data bencana Indonesia", "grafik", "risiko", "tamu"],
    ["/bnpb/rapor-sumber", "Rapor sumber prakiraan", "grafik", "risiko"],
    ["/bnpb/silang", "Banding sumber data", "grafik", "risiko"],
    ["/admin/pimpinan", "Layar pimpinan", "grafik", "pimpinan"],
    ["/bnpb/pimpinan", "Dashboard pimpinan", "grafik", "pimpinan"],
    ["/kinerja-bnpb", "Kinerja BNPB", "grafik", "pimpinan"],
    ["/admin/kinerja", "Kinerja pemantauan", "grafik", "pimpinan", "sesi", "kinerja"],
    ["/presiden", "Pantau karhutla untuk Presiden", "grafik", "pimpinan", "tamu"],
    ["/relawan", "Jadi relawan", "personel", "jejaring"],
    ["/relawan/saya", "Halaman relawan", "personel", "jejaring", "sesi", null, "/relawan"],
    ["/admin/relawan", "Relawan", "personel", "jejaring", "sesi", null, "/relawan"],
    ["/admin/alun", "Alun-alun", "personel", "jejaring"],
    ["/direktori", "Direktori jaringan kebencanaan", "daftar", "jejaring"],
    ["/riset", "Riset kampus untuk kebijakan", "grafik", "jejaring"],
    ["/riset/mitra", "Mitra riset", "grafik", "jejaring", "sesi", null, "/riset"],
    ["/admin/riset", "Riset", "grafik", "jejaring", "sesi", null, "/riset"],
    ["/meja", "Meja kerja", "meja", "jejaring", "tamu"],
    ["/admin/meja", "Meja kerja staf", "meja", "jejaring", "sesi", "meja"],
    ["/bnpb/hukum", "Pustaka hukum BNPB", "daftar", "jejaring"],
    ["/bnpb/saham", "Data saham", "grafik", "jejaring"],
    ["/ai", "AI internal", "sinyal", "jejaring", "sesi", "ai"],
    ["/admin/instansi", "Akun instansi", "personel", "jejaring", "sesi", "instansi"],
    ["/admin/aktivasi", "Aktivasi daerah", "pin", "jejaring", "sesi", "aktivasi"],
    ["/admin/akun", "Akun & akses", "personel", "pengaturan"],
    ["/admin/kunci-api", "Kunci API", "simpan", "pengaturan"],
    ["/admin/biaya-bot", "Biaya bot WA", "grafik", "pengaturan"],
    ["/admin/kontak", "Buku kontak", "sinyal", "pengaturan"],
    ["/admin/statistik", "Statistik", "grafik", "pengaturan"],
    ["/admin/pesan", "Kotak pesan", "daftar", "pengaturan"],
    ["/admin/foto", "Foto lapangan", "pin", "pengaturan"],
    ["/admin/labelfoto", "Label kerusakan", "daftar", "pengaturan", "sesi", null, "/admin/foto"],
    ["/admin/sosmed", "Media sosial", "sinyal", "pengaturan"],
            ["/admin/inventaris", "Inventaris alat", "daftar", "pengaturan", "sesi", "inventaris"],
    ["/admin/korban", "Korban jiwa", "daftar", "pengaturan", "sesi", "korban"],
    ["/admin/pendataan", "Pendataan", "daftar", "pengaturan"],
    ["/design-system", "Design system", "daftar", "pengaturan"],
    ["/design-system/bnpb", "Design system BNPB", "daftar", "pengaturan", "sesi", null, "/design-system"],
    ["/design-system/sistem", "Peta sistem", "daftar", "pengaturan", "sesi", null, "/design-system"]]),
  ...T("instansi", [
    ["/instansi", "Instansi: tugas api", "personel", "kerja", "tamu"],
    ["/pendataan", "Pendataan Satu Data BNPB", "daftar", "kerja", "tamu"],
    ["/instansi/data-bencana", "Data bencana Indonesia", "grafik", "data"],
    ["/instansi/logpal", "Inventori LogPal", "daftar", "data"],
    ["/lapor/data", "Data lanjutan tim", "daftar", "data", "tamu", null, "/instansi", true]]),
  ...T("petugas", [
    ["/petugas", "Pegawai dan relawan lapangan", "personel", "lapangan", "tamu"],
    ["/petugas/panel", "Panel lapangan", "grafik", "lapangan"],
    ["/lapangan", "Lapor lapangan", "pin", "lapangan", "tamu"],
    ["/uji-lapangan", "Uji lapangan karhutla", "daftar", "lapangan"],
    ["/lacak", "Lacak penugasan", "pin", "lapangan", "token"],
    ["/renlap", "Renlap HP", "simpan", "lapangan", "tamu", null, null, true],
    ["/uji-pilot", "Uji pilot", "daftar", "lapangan", "tamu", null, null, true],
    ["/pipa/lapangan", "Form lapangan SIPPA", "banjir", "lapangan", "token", null, "/pipa"]]),
  ...T("kampus", [
    ["/kemitraan", "Kemitraan kampus", "personel", "kemitraan", "kode"],
    ["/kampus", "Kampus saya", "personel", "kemitraan", "token"],
    ["/kemitraan/masuk", "Masuk koordinator kemitraan kampus", "personel", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/saya", "Saya", "personel", "kemitraan", "token", null, "/kemitraan"],
    ["/kemitraan/buku", "Buku profil daerah", "daftar", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/panduan", "Panduan wawancara", "daftar", "kemitraan", "kode", null, "/kemitraan"],
    ["/kemitraan/daftar", "Daftar kemitraan kampus", "daftar", "kemitraan", "kode", null, "/kemitraan"],
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
