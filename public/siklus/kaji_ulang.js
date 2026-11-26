/* Kaji ulang pasca-kejadian di layar Siklus (KU-07 draf, KU-08 pelajaran dan rekomendasi, KU-09 cetak A4 dan halaman Rekomendasi terbuka).
   Kontrak: data/kajian-bnpb/kaji-ulang/DESIGN-SYSTEM.md, ALUR A2-A5, ALGORITMA 2-7; rute src/kaji_ulang.js (warga-api).
   Mesin hanya menyusun fakta; pelajaran dan rekomendasi selalu tulisan staf. Data yang tidak ada ditulis "tidak ada data", tidak pernah 0.
   Angka antarsumber (tugas, Lifeline, 3W) di kartu terpisah, tanpa total. Tombol tulis hanya bila server bilang boleh; server tetap menegakkan.
   Klik membuka dialog seketika, riwayat dimuat sesudahnya lewat nanti() (INP). BP: rute yang sama lewat /api/instansi/siklus (cadangan saat 401). */
import {h, ik, K, api, kartu, kead, kosongkan, seg, pilihan, tombol, tanya, toast, namaKab, namaJenis, angka, tgl, wib, tglWib} from "./inti.js";

const G = globalThis, nanti = f => (G.nanti ? G.nanti(f) : f());
const HARI = 864e5, KOSONG = "tidak ada data", BELUM = "belum diaktifkan", LIMIT_BARIS = 100;

/* ---------- model murni (diuji tanpa DOM) ---------- */
export const TAHAP_NAMA = {deteksi: "Deteksi", tugas: "Tugas", konfirmasi: "Konfirmasi", respons: "Respons", padam: "Selesai ditangani", fase: "Fase", layanan: "Layanan dasar", koordinasi: "Koordinasi", pulih: "Pulih"};
const TITIK = {deteksi: "deteksi", tugas: "tugas dibuka", konfirmasi: "konfirmasi", kabar: "kabar tindakan", tiba: "regu tiba", padam: "selesai ditangani", terverifikasi: "terverifikasi"};
export const STATUS_REK = {belum: ["Belum", "jampasir"], proses: ["Dikerjakan", "panah"], selesai: ["Selesai", "centang"]};
export const ALASAN = {tiga_kab: "menyentuh 3 kab atau lebih", lifeline_merah: "pernah ada layanan lumpuh", tanggap_lebih_7_hari: "masa tanggap lebih dari 7 hari", dimulai_staf: "dimulai staf"};
export const DILEWATI = {lifeline_belum_aktif: "status layanan belum diaktifkan", tanggap_tanpa_tanggal: "tanggal tanggap belum lengkap"};
export const KATEGORI = {baik: "Berjalan baik", perbaiki: "Perlu diperbaiki"};
const WARNA_LF = {hijau: "baik", kuning: "terganggu", merah: "lumpuh", abu: "belum diketahui"};

/* menit -> kalimat; null = tidak ada data (atau ket server, mis. "kurang dari semenit"), tidak pernah 0 */
export function teksMenit(m, ket) {
  if (m == null || !Number.isFinite(Number(m))) return ket || KOSONG;
  const n = Math.round(Number(m));
  if (n < 60) return `${angka(n)} menit`;
  if (n < 1440) { const j = Math.floor(n / 60), s = n % 60; return `${angka(j)} jam${s ? ` ${angka(s)} menit` : ""}`; }
  const d = Math.floor(n / 1440), j = Math.floor((n % 1440) / 60); return `${angka(d)} hari${j ? ` ${angka(j)} jam` : ""}`;
}
/* baris tabel durasi per tugas: tahap tanpa target tidak diberi vonis; n = 1 tanpa persentil */
export function barisDurasi(t) {
  if (!t || t.status !== "ada") return [];
  return t.tahap.map(r => ({tahap: `${TITIK[r.dari] ?? r.dari} ke ${TITIK[r.ke] ?? r.ke}`, n: r.n ? angka(r.n) : KOSONG,
    median: r.n === 1 ? teksMenit(r.nilai_menit, r.ket) : teksMenit(r.p50_menit, r.ket), p90: r.n > 1 ? teksMenit(r.p90_menit, r.ket) : r.n === 1 ? "n = 1" : KOSONG,
    target: r.target_menit == null ? "tanpa target" : teksMenit(r.target_menit),
    dalam: r.target_menit == null ? "tanpa target" : r.dalam_target_pct == null ? KOSONG : `${angka(r.dalam_target_pct)} persen`}));
}
/* teks peristiwa: warna Lifeline jadi kata (buta warna), kab jadi nama */
export function teksPeristiwa(e) {
  if (e.sumber === "lf_riwayat") { const [ly, w] = String(e.ket).split(" "); return `${ly[0]?.toUpperCase() ?? ""}${ly.slice(1)} ${WARNA_LF[w] ?? w}${e.ref ? `, ${namaKab(e.ref)}` : ""}`; }
  if (e.sumber === "tw_baris" && e.ref) return `${e.ket}, ${namaKab(e.ref)}`;
  return e.ket;
}
/* status rekomendasi: tertutup = selesai dengan catatan 20..300 (D7); lewat tenggat = terbuka dan tenggat < hari ini WIB, status tidak berubah sendiri */
export function modelRek(r, hari = tglWib()) {
  const s = STATUS_REK[r?.status?.status] ? r.status.status : "belum", c = r?.status?.catatan ?? "";
  const tertutup = s === "selesai" && c.length >= 20 && c.length <= 300;
  return {s, label: STATUS_REK[s][0], tertutup, lewat: !tertutup && typeof r?.tenggat === "string" && r.tenggat < hari};
}
/* tingkat penyelesaian "x dari n"; tanpa rekomendasi = tidak ada data, bukan 100 persen */
export const ringkasRek = (rek, hari) => rek?.length ? `${angka(rek.filter(r => modelRek(r, hari).tertutup).length)} dari ${angka(rek.length)} tertutup` : KOSONG;
const selisihHari = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / HARI);
/* isian rekomendasi -> {galat} atau {badan}; aturan sama dengan server (teks 10-400, unit 2-80, tenggat 7-365 hari) */
export function badanRek({teks = "", unit = "", tenggat = "", pelajaran_id = ""}, hari = tglWib()) {
  const t = String(teks).trim(), u = String(unit).trim();
  if (t.length < 10 || t.length > 400) return {galat: "Rekomendasi 10 sampai 400 karakter"};
  if (u.length < 2 || u.length > 80) return {galat: "Unit penanggung jawab 2 sampai 80 karakter"};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tenggat)) return {galat: "Tenggat wajib diisi"};
  const d = selisihHari(hari, tenggat); if (!(d >= 7 && d <= 365)) return {galat: "Tenggat 7 sampai 365 hari dari hari ini"};
  return {badan: {teks: t, unit: u, tenggat, pelajaran_id: pelajaran_id || null}};
}
/* perubahan status -> {galat} atau {badan}; selesai wajib catatan penutup 20-300 karakter; tidak dilanjutkan hanya bersama selesai (Q8) */
export function badanStatus({nomor, status, catatan = "", tidak = false}) {
  const c = String(catatan).trim();
  if (!STATUS_REK[status]) return {galat: "Pilih status"};
  if (status === "selesai" && (c.length < 20 || c.length > 300)) return {galat: "Selesai wajib catatan penutup 20 sampai 300 karakter"};
  if (c.length > 300) return {galat: "Catatan paling banyak 300 karakter"};
  if (tidak && status !== "selesai") return {galat: "Tidak dilanjutkan hanya bersama status selesai"};
  return {badan: {nomor, status, catatan: c || null, tidak_dilanjutkan: !!tidak}};
}
/* butir yang ditambah sesudah potret beku = lampiran "setelah versi n": di lembar cetak lewat isi potret (pelajaran per id, rekomendasi per nomor),
   di layar hidup lewat waktu dibuat sesudah pengesahan terakhir (sejak) */
export function pisahLampiran(butir, potret, kunci, sejak = null) {
  if (!potret) return sejak == null ? {inti: butir ?? [], lampiran: []} : {inti: (butir ?? []).filter(x => !(x.dibuat > sejak)), lampiran: (butir ?? []).filter(x => x.dibuat > sejak)};
  const ada = new Set((potret ?? []).map(x => x[kunci]));
  return {inti: (butir ?? []).filter(x => ada.has(x[kunci])), lampiran: (butir ?? []).filter(x => !ada.has(x[kunci]))};
}
/* F-7 per unit: terbuka, lewat tenggat, tertutup; tanpa total gabungan lintas unit */
export function perUnit(baris) {
  const m = new Map();
  for (const b of baris ?? []) { const u = m.get(b.unit) ?? {unit: b.unit, terbuka: 0, lewat: 0, tertutup: 0}; if (b.tertutup) u.tertutup++; else u.terbuka++; if (b.lewat_tenggat) u.lewat++; m.set(b.unit, u); }
  return [...m.values()].sort((a, b) => b.lewat - a.lewat || b.terbuka - a.terbuka || a.unit.localeCompare(b.unit));
}

/* ---------- komponen ---------- */
const muatCss = () => { if (typeof document === "undefined" || document.querySelector('link[href="/siklus/kaji_ulang.css"]')) return; document.head.append(h("link", {rel: "stylesheet", href: "/siklus/kaji_ulang.css"})); };
const tabel = (kepala, baris, tb = h("tbody", {}, baris)) => h("div", {class: "tw ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, kepala.map(([t, def]) => h("th", {title: def || t}, t)))), tb));
const td = (x, kelas) => h("td", kelas ? {class: kelas} : {}, x);
const redup = t => h("span", {class: "ku-redup"}, t);
const isiAtauKosong = (v) => v == null || v === "" ? redup(KOSONG) : v;
const pilStatus = s => { const k = STATUS_REK[s] ? s : "belum"; return h("span", {class: "ku-pil", "data-s": k}, ik(STATUS_REK[k][1], 12), STATUS_REK[k][0]); };
const tandaLewat = () => h("span", {class: "ku-lewat"}, ik("sirene", 12), "lewat tenggat");
const statusData = (st, teks) => kead("kosong", {teks: st === "belum diaktifkan" ? `${teks} ${BELUM}.` : `${teks}: ${KOSONG}.`});
function dialog(judul, badan, ...aksi) {
  const d = h("dialog", {class: "dlg ku-laci"}), tutup = tombol("Tutup", "biasa", () => d.close(), "silang");
  d.append(h("div", {class: "dh"}, h("div", {}, h("h3", {}, judul))), badan, h("div", {class: "sk-aksi"}, ...aksi, tutup));
  d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal(); return d;
}

function blokLinimasa(dr, cetak) {
  const ev = dr.linimasa ?? [];
  if (!ev.length) return [kead("kosong", {teks: `Linimasa: ${KOSONG}.`})];
  const baris = list => list.map(e => h("tr", {}, td(wib(e.waktu) ?? KOSONG), td(TAHAP_NAMA[e.tahap] ?? e.tahap), td([teksPeristiwa(e), e.perkiraan ? h("span", {class: "ku-pil", "data-s": "perkiraan", title: "Deteksi tanpa jam asli; tidak masuk durasi"}, "perkiraan") : null])));
  const kepala = [["Waktu", "Waktu WIB peristiwa"], ["Tahap"], ["Peristiwa", "Disusun dari data sistem, tanpa nama orang"]];
  const catat = dr.tidak_dimuat ? h("p", {class: "ku-ket"}, `${angka(dr.tidak_dimuat)} peristiwa terlama tidak dimuat (batas ukuran potret).`) : null;
  if (cetak) return [tabel(kepala, baris(ev)), catat];
  const tb = h("tbody"), wadahT = tabel(kepala, null, tb), lagi = h("div", {class: "sk-aksi"});
  let pilih = "semua", n = LIMIT_BARIS;
  const gambar = () => {
    const list = pilih === "semua" ? ev : ev.filter(e => e.tahap === pilih);
    tb.replaceChildren(...baris(list.slice(0, n)));
    lagi.replaceChildren(...(list.length > n ? [tombol(`Tampilkan ${angka(Math.min(LIMIT_BARIS, list.length - n))} berikutnya`, "biasa", () => { n += LIMIT_BARIS; nanti(gambar); }, "tambah")] : []));
  };
  const ada = [...new Set(ev.map(e => e.tahap))];
  const s = seg([["semua", "Semua", "semua"], ...ada.map(t => [t, TAHAP_NAMA[t] ?? t])], "semua", v => { pilih = v; n = LIMIT_BARIS; gambar(); }, "Saring tahap linimasa");
  gambar();
  return [s, wadahT, lagi, catat];
}
function blokDurasi(dr) {
  const k = dr.durasi?.kejadian ?? {}, mh = k.layanan_merah_ke_hijau;
  const baris = [["Kejadian tercatat ke fase tanggap", teksMenit(k.deteksi_ke_tanggap?.menit, k.deteksi_ke_tanggap?.ket) + (k.deteksi_ke_tanggap?.dari_tanggal ? " (dari tanggal, presisi hari)" : "")],
    ["Fase tanggap ke pulih", teksMenit(k.tanggap_ke_pulih?.menit, k.tanggap_ke_pulih?.ket)]];
  const kej = tabel([["Ukuran", "Durasi tingkat kejadian dari Buku Besar"], ["Durasi"]], baris.map(([a, b]) => h("tr", {}, td(a), td(b === KOSONG ? redup(b) : b, "t"))));
  const lay = mh?.status === "ada" ? tabel([["Kabupaten atau kota"], ["Layanan"], ["Lumpuh ke baik pertama", "Dari status layanan pertama kali lumpuh sampai pertama kali baik"]],
    mh.sel.map(x => h("tr", {}, td(namaKab(x.kab4)), td(x.layanan), td(x.menit == null ? redup(x.ket ?? KOSONG) : teksMenit(x.menit), "t"))))
    : kead("kosong", {teks: mh?.status === "belum diaktifkan" ? `Layanan lumpuh ke baik: ${BELUM}.` : `Layanan lumpuh ke baik: ${KOSONG}.`});
  const t = dr.durasi?.tugas, rows = barisDurasi(t);
  const tug = rows.length ? tabel([["Tahap tugas", "Durasi per tugas terhubung, dari src/sla.js"], ["n", "Tugas yang punya durasi tahap ini"], ["Median"], ["Persentil 90"], ["Target"], ["Dalam target", "Hanya tahap bertarget"]],
    rows.map(r => h("tr", {}, td(r.tahap), ...[r.n, r.median, r.p90, r.target, r.dalam].map(v => td(v === KOSONG ? redup(v) : v, "t")))))
    : kead("kosong", {teks: `Durasi per tugas: ${KOSONG}.`});
  return [kej, lay, t?.ket ? h("p", {class: "ku-ket"}, `Durasi tugas ${t.ket}.`) : null, tug];
}
const blokCelah = dr => (dr.celah ?? []).length ? [h("ul", {class: "ku-dft"}, dr.celah.map(c => h("li", {},
  c.jenis === "tahap" ? `${TAHAP_NAMA[c.tahap] ?? c.tahap}: ${c.ket}` : c.jenis === "layanan_tanpa_riwayat" ? `${namaKab(c.kab4)}, ${c.layanan.join(", ")}: ${c.ket}` : c.n != null ? `${angka(c.n)} ${c.ket}` : c.ket)))]
  : [kead("kosong", {teks: "Tidak ada celah data tercatat."})];
function blokLayanan(dr) {
  const l = dr.layanan; if (l?.status !== "ada") return [statusData(l?.status, "Status layanan dasar")];
  return [tabel([["Kabupaten atau kota"], ["Layanan"], ["Status terakhir", "Status resmi terakhir yang ditetapkan staf"], ["Ditetapkan"]],
    l.sel.map(x => h("tr", {}, td(namaKab(x.kab4)), td(x.layanan), td(WARNA_LF[x.warna] ?? x.warna), td(wib(x.dibuat) ?? KOSONG))))];
}
function blokKoordinasi(dr) {
  const k = dr.koordinasi; if (k?.status !== "ada") return [statusData(k?.status, "Koordinasi")];
  return [k.per_klaster?.length ? tabel([["Klaster"], ["Kegiatan", "Baris kegiatan organisasi di 3W"]], k.per_klaster.map(x => h("tr", {}, td(x.klaster), td(angka(x.kegiatan), "t")))) : null,
    h("p", {class: "ku-ket"}, `Tawaran bantuan masuk: ${k.tawaran != null ? angka(k.tawaran) : KOSONG}.`)];
}
function blokCatatan(dr, angkat) {
  const c = dr.catatan_lapangan; if (c?.status !== "ada") return [statusData(c?.status, "Catatan lapangan")];
  return [h("ul", {class: "ku-kutip"}, c.butir.map(b => h("li", {}, h("blockquote", {}, b.catatan), h("small", {}, `catatan lapangan, ${wib(b.waktu) ?? KOSONG}`),
    angkat ? tombol("", "ikon", () => angkat(b), "tambah", "Angkat menjadi pelajaran kejadian") : null))),
    c.tidak_dimuat ? h("p", {class: "ku-ket"}, `${angka(c.tidak_dimuat)} catatan lapangan tidak dimuat.`) : null];
}
function blokPelajaran(pel, {ubah, potret, versi, sejak} = {}) {
  const {inti, lampiran} = pisahLampiran(pel, potret, "id", sejak);
  const kolom = (list, kat) => h("div", {class: "ku-kol"}, h("h4", {}, KATEGORI[kat]), list.filter(p => p.kategori === kat).length
    ? h("ul", {class: "ku-dft"}, list.filter(p => p.kategori === kat).map(p => h("li", {}, p.teks, p.rujuk?.[0]?.peristiwa ? h("small", {}, ` merujuk: ${p.rujuk[0].peristiwa}`) : null, p.asal_ops_id ? h("small", {}, " dari catatan lapangan") : null,
      ubah ? tombol("", "ikon", () => ubah(p), "palu", "Ubah pelajaran (hanya saat draf)") : null))) : redup(KOSONG));
  const dua = list => h("div", {class: "ku-dua"}, kolom(list, "baik"), kolom(list, "perbaiki"));
  return [dua(inti), ...(lampiran.length ? [h("h4", {class: "ku-lamp"}, `Lampiran setelah versi ${versi}`), dua(lampiran)] : [])];
}
function tabelRek(rek, hari, buka, {potret, versi, sejak} = {}) {
  if (!rek?.length) return [kead("kosong", {teks: `Rekomendasi: ${KOSONG}.`})];
  const {inti, lampiran} = pisahLampiran(rek, potret, "nomor", sejak);
  const kepala = [["Nomor"], ["Rekomendasi"], ["Unit", "Unit atau instansi penanggung jawab, bukan nama orang"], ["Tenggat"], ["Status", "Tertutup hanya bila selesai dengan catatan penutup"]];
  const baris = list => list.map(r => {
    const m = modelRek(r, hari), tr = h("tr", buka ? {class: "ku-baris", tabindex: 0, title: "Buka riwayat dan status"} : {}, td(angka(r.nomor), "t"), td([r.teks, r.tidak_dilanjutkan ? h("small", {}, " tidak dilanjutkan") : null]), td(r.unit), td(tgl(r.tenggat) ?? KOSONG), td([pilStatus(m.s), m.lewat ? tandaLewat() : null]));
    if (buka) { tr.addEventListener("click", () => buka(r)); tr.addEventListener("keydown", e => { if (e.key === "Enter") buka(r); }); }
    return tr;
  });
  return [h("p", {class: "ku-ket"}, `Tingkat penyelesaian: ${ringkasRek(rek, hari)}.`), tabel(kepala, baris(inti)), ...(lampiran.length ? [h("h4", {class: "ku-lamp"}, `Lampiran setelah versi ${versi}`), tabel(kepala, baris(lampiran))] : [])];
}

/* ---------- kartu di halaman kejadian ---------- */
export function kartuKajiUlang(id, P = {}) {
  muatCss();
  const akar = h("div", {class: "ku-tumpuk", id: "k-kajiulang"}, kartu({ey: [ik("timbangan", 12), "Kaji ulang"], judul: [ik("timbangan", 16), " Kaji ulang"], isi: [kead("memuat")]}));
  let dasar = `/api/siklus/kejadian/${id}/kaji-ulang`;
  async function ambil(jalur = "", o) {
    let r = await api(dasar + jalur, o);
    if (r.status === 401 && dasar.startsWith("/api/siklus/")) { const alt = dasar.replace("/api/siklus/", "/api/instansi/siklus/"), r2 = await api(alt + jalur, o); if (r2.status !== 401) { dasar = alt; r = r2; } }
    return r;
  }
  async function muat() {
    const r = await ambil();
    if (!r.ok) {
      const teks = r.status === 503 ? "Kaji ulang belum diaktifkan." : r.status === 404 ? "Kaji ulang belum tersedia untuk kejadian ini." : r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak membuka bagian ini") : undefined;
      return akar.replaceChildren(kartu({ey: [ik("timbangan", 12), "Kaji ulang"], judul: [ik("timbangan", 16), " Kaji ulang"], isi: [r.status === 401 ? kead("sesi") : r.status === 503 || r.status === 404 ? kead("kosong", {teks}) : kead("galat", {teks, ulang: muat})]}));
    }
    gambar(r.j);
  }
  let drafTerakhir = null;
  function gambar(d) {
    drafTerakhir = d.draf ?? null;
    const kj = d.kaji, b = d.boleh ?? {}, dr = d.draf ?? d.potret?.potret?.draf ?? null, hari = tglWib(), fase = dr?.kejadian?.fase;
    const statusTeks = !kj ? "belum dimulai" : kj.status === "disahkan" ? `disahkan, versi ${angka(kj.versi)}` : "draf";
    const aksi = h("div", {class: "sk-aksi"});
    if (b.tulis && !kj && fase !== "dibatalkan" && fase !== "digabung") aksi.append(tombol("Mulai kaji ulang", "utama", mulai, "tambah"));
    if (b.sahkan && kj && fase === "selesai") aksi.append(tombol(kj.status === "disahkan" ? "Sahkan ulang" : "Sahkan", "utama", () => sahkan(kj), "centang", kj.status === "disahkan" ? "Bekukan potret baru dan naikkan versi" : "Bekukan potret linimasa dan teks pelajaran"));
    if (kj || dr) aksi.append(tombol("Cetak", "biasa", () => cetak(d), "terbit", "Cetak A4"));
    if (dasar.startsWith("/api/siklus/")) aksi.append(h("a", {href: "/siklus/kaji-ulang", "data-aksi": "biasa"}, ik("bendera", 14), h("span", {}, "Semua rekomendasi")));
    const pilVersi = kj?.versi > 1 ? pilihan(Array.from({length: kj.versi}, (_, i) => [String(kj.versi - i), `Cetak versi ${kj.versi - i}`]), String(kj.versi), v => cetak(d, Number(v)), "Cetak versi beku") : null;
    const ket = [`Status: ${statusTeks}.`, kj?.disahkan_pada ? ` Disahkan ${wib(kj.disahkan_pada)}.` : "", fase && fase !== "selesai" && kj ? " Pengesahan hanya sesudah kejadian berfase selesai." : "", !kj && !b.tulis ? " Kaji ulang dimulai staf Pusdalops atau Koordalops." : ""].join("");
    const kepala = kartu({ey: [ik("timbangan", 12), "Kaji ulang"], judul: [ik("timbangan", 16), " Kaji ulang"], isi: [h("p", {class: "ku-ket"}, ket), h("div", {class: "sk-baris"}, pilVersi, aksi)]});
    const kartuList = [kepala];
    if (dr) {
      kartuList.push(
        kartu({ey: [ik("bolak", 12), "Kaji ulang"], judul: [ik("bolak", 16), " Linimasa"], isi: [...blokLinimasa(dr), d.belum_bertaut ? h("p", {class: "ku-ket"}, `${angka(d.belum_bertaut.n)} ${d.belum_bertaut.ket}.`) : null]}),
        kartu({ey: [ik("jampasir", 12), "Kaji ulang"], judul: [ik("jampasir", 16), " Durasi tahap"], isi: blokDurasi(dr)}),
        kartu({ey: [ik("tanya", 12), "Kaji ulang"], judul: [ik("tanya", 16), " Celah data"], isi: blokCelah(dr)}),
        h("div", {class: "ku-dua"}, kartu({ey: [ik("sirene", 12), "Kaji ulang"], judul: [ik("sirene", 16), " Layanan dasar"], isi: blokLayanan(dr)}),
          kartu({ey: [ik("tiga", 12), "Kaji ulang"], judul: [ik("tiga", 16), " Koordinasi"], isi: blokKoordinasi(dr)})),
        kartu({ey: [ik("bendera", 12), "Kaji ulang"], judul: [ik("bendera", 16), " Catatan lapangan"], isi: blokCatatan(dr, kj && b.tulis ? angkat : null)}));
    }
    if (kj) {
      const sah = kj.status === "disahkan", lp = {sejak: sah ? kj.disahkan_pada : null, versi: kj.versi};
      kartuList.push(
        kartu({ey: [ik("centang", 12), "Kaji ulang"], judul: [ik("centang", 16), " Pelajaran"], kanan: b.tulis ? tombol("Tambah", "biasa", () => tambahPel(dr), "tambah", "Tambah pelajaran") : null,
          isi: blokPelajaran(d.pelajaran, {ubah: b.tulis && kj.status === "draf" ? ubahPel : null, ...lp})}),
        kartu({ey: [ik("bendera", 12), "Kaji ulang"], judul: [ik("bendera", 16), " Rekomendasi"], kanan: b.tulis ? tombol("Tambah", "biasa", () => tambahRek(d.pelajaran), "tambah", "Tambah rekomendasi") : null,
          isi: tabelRek(d.rekomendasi, hari, r => laciRek(r, b.tulis), lp)}));
    }
    akar.replaceChildren(...kartuList);
  }
  const kirim = async (jalur, badan, ok) => {
    const r = await ambil(jalur, {metode: "POST", badan});
    if (!r.ok) { toast(r.j?.galat || "Belum bisa disimpan"); return false; }
    toast(ok); nanti(muat); return true;
  };
  const mulai = () => kirim("", {}, "Kaji ulang dimulai");
  async function sahkan(kj) {
    const v = await tanya({judul: kj.status === "disahkan" ? "Sahkan ulang kaji ulang" : "Sahkan kaji ulang", teks: "Linimasa dan teks pelajaran dibekukan sebagai potret bernomor versi. Sesudahnya isi lama tidak berubah; tambahan tampil sebagai lampiran.", ya: "Sahkan"});
    if (v) kirim("/sahkan", {}, "Kaji ulang disahkan");
  }
  const KERANGKA = "Tulis sistem dan prosedur, bukan menyalahkan orang. Pegangan: apa yang diharapkan, apa yang terjadi, apa yang berjalan baik, apa yang perlu diperbaiki.";
  async function tambahPel(dr, awal = {}) {
    const ev = (dr?.linimasa ?? []).slice(-200).reverse();
    const v = await tanya({judul: awal.asal ? "Angkat catatan lapangan" : "Tambah pelajaran", teks: KERANGKA, ya: "Simpan", kolom: [
      {nama: "kategori", label: "Kategori", jenis: "pilih", opsi: Object.entries(KATEGORI)},
      {nama: "teks", label: "Pelajaran, 10 sampai 1000 karakter", jenis: "area", wajib: true, maks: 1000, nilai: awal.teks},
      ...(ev.length ? [{nama: "rujuk", label: "Peristiwa linimasa yang dirujuk", jenis: "pilih", opsi: [["", "Tanpa rujukan"], ...ev.map((e, i) => [String(i), `${wib(e.waktu)}, ${teksPeristiwa(e)}`.slice(0, 120)])]}] : [])]});
    if (!v) return;
    if (v.teks.length < 10) return toast("Pelajaran paling sedikit 10 karakter");
    const e = v.rujuk ? ev[Number(v.rujuk)] : null;
    kirim("/pelajaran", {kategori: v.kategori, teks: v.teks, rujuk: e ? [{peristiwa: teksPeristiwa(e).slice(0, 200), waktu: e.waktu, sumber: e.sumber}] : [], asal_ops_id: awal.asal ?? null}, "Pelajaran disimpan");
  }
  const angkat = b => tambahPel(drafTerakhir, {teks: b.catatan, asal: b.id});
  async function ubahPel(p) {
    const v = await tanya({judul: "Ubah pelajaran", teks: KERANGKA, ya: "Simpan", kolom: [{nama: "kategori", label: "Kategori", jenis: "pilih", opsi: Object.entries(KATEGORI), nilai: p.kategori}, {nama: "teks", label: "Pelajaran", jenis: "area", wajib: true, maks: 1000, nilai: p.teks}]});
    if (v) kirim(`/pelajaran/${p.id}`, {kategori: v.kategori, teks: v.teks}, "Pelajaran diubah");
  }
  async function tambahRek(pel) {
    const hari = tglWib(), awal = new Date(Date.parse(hari + "T00:00:00Z") + 60 * HARI).toISOString().slice(0, 10);
    const v = await tanya({judul: "Tambah rekomendasi", teks: "Tiap rekomendasi wajib punya unit penanggung jawab dan tenggat 7 sampai 365 hari. Status dilacak sampai tertutup dengan catatan penutup.", ya: "Simpan", kolom: [
      {nama: "teks", label: "Rekomendasi, 10 sampai 400 karakter", jenis: "area", wajib: true, maks: 400},
      {nama: "unit", label: "Unit atau instansi penanggung jawab", wajib: true, maks: 80},
      {nama: "tenggat", label: "Tenggat", jenis: "tgl", wajib: true, nilai: awal},
      ...(pel?.length ? [{nama: "pelajaran_id", label: "Dari pelajaran", jenis: "pilih", opsi: [["", "Tanpa pelajaran"], ...pel.map(p => [p.id, p.teks.slice(0, 80)])]}] : [])]});
    if (!v) return;
    const x = badanRek(v, hari); if (x.galat) return toast(x.galat);
    kirim("/rekomendasi", x.badan, "Rekomendasi disimpan");
  }
  function laciRek(r, tulis) {
    const m = modelRek(r), badan = h("div", {class: "ku-isi"}, h("p", {}, r.teks), h("p", {}, pilStatus(m.s), m.lewat ? tandaLewat() : null, ` Unit ${r.unit}, tenggat ${tgl(r.tenggat) ?? KOSONG}.`), h("h4", {}, "Riwayat"));
    const rw = h("div", {}, kead("memuat")); badan.append(rw);
    const aksi = [];
    if (tulis) {
      const st = h("select", {"aria-label": "Status rekomendasi"}, Object.entries(STATUS_REK).map(([k, [t]]) => h("option", {value: k, selected: k === m.s}, t)));
      const cat = h("textarea", {rows: 3, maxlength: 300, "aria-label": "Catatan", placeholder: "Catatan; selesai wajib catatan penutup 20 sampai 300 karakter"});
      const tidak = h("input", {type: "checkbox"});
      badan.append(h("h4", {}, "Perbarui status"), h("label", {class: "fld"}, h("span", {}, "Status"), st), h("label", {class: "fld"}, h("span", {}, "Catatan"), cat), h("label", {}, tidak, " Tidak dilanjutkan (ditutup selesai dengan alasan)"));
      const simpan = tombol("Simpan status", "utama", async () => {
        const x = badanStatus({nomor: r.nomor, status: st.value, catatan: cat.value, tidak: tidak.checked}); if (x.galat) return toast(x.galat);
        simpan.disabled = true; if (await kirim("/rekomendasi/status", x.badan, "Status disimpan")) d.close(); simpan.disabled = false;
      }, "centang");
      aksi.push(simpan);
    }
    const d = dialog(`Rekomendasi ${angka(r.nomor)}`, badan, ...aksi);
    nanti(async () => {
      const x = await ambil(`/rekomendasi/riwayat?nomor=${r.nomor}`);
      if (!x.ok) return rw.replaceChildren(kead(x.status === 503 ? "kosong" : "galat", {teks: x.status === 503 ? "Kaji ulang belum diaktifkan." : (x.j?.galat ?? undefined)}));
      const list = Array.isArray(x.j) ? x.j : [];
      rw.replaceChildren(list.length ? h("ul", {class: "ku-dft"}, list.map(e => h("li", {}, `${wib(e.waktu) ?? KOSONG}, ${STATUS_REK[e.status]?.[0] ?? e.status}`, e.catatan ? `: ${e.catatan}` : "", e.oleh_nama ? `, ${e.oleh_nama}` : ""))) : redup(KOSONG));
    });
  }
  /* cetak A4: versi beku dari potret bila disahkan, selain itu draf hidup bertanda belum disahkan */
  async function cetak(d, versi) {
    let isi = d, judulV = d.kaji?.status === "disahkan" ? `versi ${d.kaji.versi}` : "draf, belum disahkan";
    if (d.kaji?.status === "disahkan") {
      const r = await ambil(`?versi=${versi ?? d.kaji.versi}`);
      if (!r.ok) return toast(r.j?.galat || "Versi beku belum bisa dimuat");
      const p = r.j.potret?.potret; isi = {...r.j, draf: p?.draf, potretPel: p?.pelajaran, potretRek: p?.rekomendasi}; judulV = `versi ${p?.versi ?? versi}, disahkan ${wib(p?.disahkan_pada) ?? KOSONG}`;
    }
    const lembar = lembarCetak(isi, judulV);
    document.body.classList.add("ku-mencetak"); document.body.append(lembar);
    const bersih = () => { document.body.classList.remove("ku-mencetak"); lembar.remove(); removeEventListener("afterprint", bersih); };
    addEventListener("afterprint", bersih); G.print?.();
  }
  nanti(muat);
  return akar;
}

/* lembar cetak: tanpa tombol; pelajaran dan rekomendasi versi beku, tambahan sesudahnya sebagai lampiran */
export function lembarCetak(d, judulV) {
  const dr = d.draf ?? {}, kj = dr.kejadian ?? {}, hari = tglWib(), v = d.potret?.potret?.versi;
  const pel = d.potretPel ? [...d.potretPel, ...(d.pelajaran ?? []).filter(p => !d.potretPel.some(x => x.id === p.id))] : d.pelajaran;
  const rek = (d.rekomendasi ?? []);
  const bag = (judul, ...isi) => h("section", {class: "ku-bag"}, h("h2", {}, judul), ...isi);
  return h("article", {class: "ku-lembar"},
    h("header", {}, h("h1", {}, `Kaji ulang pasca-kejadian ${kj.nama ?? d.kejadian_id ?? ""}`), h("p", {}, `${d.kejadian_id ?? kj.id ?? ""}, ${namaJenis(kj.jenis)}, fase ${K.fase?.[kj.fase]?.[0] ?? kj.fase ?? KOSONG}. ${judulV[0].toUpperCase()}${judulV.slice(1)}. Dicetak ${tgl(hari)}.`)),
    bag("Linimasa", ...blokLinimasa(dr, true)), bag("Durasi tahap", ...blokDurasi(dr)), bag("Celah data", ...blokCelah(dr)),
    bag("Layanan dasar", ...blokLayanan(dr)), bag("Koordinasi", ...blokKoordinasi(dr)),
    bag("Pelajaran", ...blokPelajaran(pel, {potret: d.potretPel, versi: v})), bag("Rekomendasi", ...tabelRek(rek, hari, null, {potret: d.potretRek, versi: v})));
}

/* ---------- halaman /siklus/kaji-ulang: kandidat (F-1) dan rekomendasi lintas kejadian (F-7) ---------- */
export async function buka(isi) {
  muatCss();
  const kand = kartu({ey: [ik("timbangan", 12), "Kaji ulang"], judul: [ik("timbangan", 16), " Kandidat kaji ulang"], id: "ku-kandidat", isi: [kead("memuat")]});
  const rek = kartu({ey: [ik("bendera", 12), "Kaji ulang"], judul: [ik("bendera", 16), " Rekomendasi terbuka"], id: "ku-rekomendasi", isi: [kead("memuat")]});
  const unit = kartu({ey: [ik("tiga", 12), "Kaji ulang"], judul: [ik("tiga", 16), " Per unit penanggung jawab"], id: "ku-unit", isi: [kead("memuat")]});
  isi.replaceChildren(kand, rek, unit);
  const bd = k => k.querySelector(".ex-bd");
  const gagalKe = (k, r, ulang) => bd(k).replaceChildren(r.status === 401 ? kead("sesi") : r.status === 503 ? kead("kosong", {teks: "Kaji ulang belum diaktifkan."}) : kead("galat", {teks: r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak membuka bagian ini") : undefined, ulang}));
  const tautKj = id => h("a", {href: `/siklus/kejadian/${id}#k-kajiulang`}, id);
  async function muatKand() {
    const r = await api("/api/siklus/kaji-ulang/kandidat"); if (!r.ok) return gagalKe(kand, r, muatKand);
    const b = r.j?.baris ?? [];
    bd(kand).replaceChildren(...(b.length ? [h("p", {class: "ku-ket"}, "Kriteria kejadian besar masih hipotesis; alasan ditampilkan sebagai daftar, bukan skor."),
      tabel([["Kejadian"], ["Jenis"], ["Fase"], ["Kab", "Jumlah kabupaten atau kota terpasang"], ["Alasan"], ["Dilewati", "Kriteria yang tidak bisa dinilai karena datanya belum ada"], ["Kaji ulang"]],
        b.map(x => h("tr", {}, td([tautKj(x.id), x.nama ? h("small", {}, ` ${x.nama}`) : null]), td(namaJenis(x.jenis)), td(K.fase?.[x.fase]?.[0] ?? x.fase), td(angka(x.kab) ?? KOSONG, "t"),
          td(x.alasan.map(a => ALASAN[a] ?? a).join("; ")), td(isiAtauKosong(x.dilewati.map(a => DILEWATI[a] ?? a).join("; "))), td(x.kaji.status === "disahkan" ? `disahkan, versi ${angka(x.kaji.versi)}` : x.kaji.status)))),
      r.j.terpotong ? h("p", {class: "ku-ket"}, "Hanya 120 kejadian terbaru yang diperiksa.") : null] : [kead("kosong", {teks: "Belum ada kejadian yang memenuhi kriteria kaji ulang."})]));
  }
  async function muatRek() {
    const r = await api("/api/siklus/kaji-ulang/rekomendasi"); if (!r.ok) { gagalKe(rek, r, muatRek); return gagalKe(unit, r, muatRek); }
    const s = r.j.ringkas ?? {}, baris = r.j.baris ?? [];
    if (!baris.length) { bd(rek).replaceChildren(kead("kosong", {teks: `Rekomendasi: ${KOSONG}.`})); return bd(unit).replaceChildren(kead("kosong", {teks: `Per unit: ${KOSONG}.`})); }
    const tb = h("tbody"), t = tabel([["Kejadian"], ["Nomor"], ["Rekomendasi"], ["Unit"], ["Tenggat"], ["Status"]], null, tb);
    const gambarT = v => tb.replaceChildren(...baris.filter(x => v === "semua" || (v === "terbuka" ? !x.tertutup : v === "lewat" ? x.lewat_tenggat : x.tertutup)).map(x => {
      return h("tr", {}, td(tautKj(x.kejadian_id)), td(angka(x.nomor), "t"), td([x.teks, x.tidak_dilanjutkan ? h("small", {}, " tidak dilanjutkan") : null]), td(x.unit), td(tgl(x.tenggat) ?? KOSONG), td([pilStatus(x.status), x.lewat_tenggat ? tandaLewat() : null]));
    }));
    bd(rek).replaceChildren(h("p", {class: "ku-ket"}, `Per ${tgl(r.j.hari)}: ${angka(s.terbuka)} terbuka, ${angka(s.lewat_tenggat)} lewat tenggat, ${angka(s.tertutup)} tertutup, dari ${angka(s.total)} rekomendasi.`),
      seg([["terbuka", "Terbuka", "jampasir"], ["lewat", "Lewat tenggat", "sirene"], ["tertutup", "Tertutup", "centang"], ["semua", "Semua", "semua"]], "terbuka", gambarT, "Saring status rekomendasi"), t,
      r.j.terpotong ? h("p", {class: "ku-ket"}, "Hanya 2000 rekomendasi pertama yang dimuat.") : null);
    gambarT("terbuka");
    bd(unit).replaceChildren(tabel([["Unit"], ["Terbuka"], ["Lewat tenggat"], ["Tertutup"]], perUnit(baris).map(u => h("tr", {}, td(u.unit), td(angka(u.terbuka), "t"), td(angka(u.lewat), "t"), td(angka(u.tertutup), "t")))));
  }
  nanti(() => { muatKand(); muatRek(); });
}
