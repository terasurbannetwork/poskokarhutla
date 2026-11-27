/* Meja petugas: profil orang hilang untuk halaman publik (orang-hilang-publik OH-07, OH-10, OH-11; KEPUTUSAN K113, D19, D31, D34).
   Dua antrean: Tinjau profil (pratinjau persis publik, panel "Hanya petugas", daftar periksa telepon, aksi tayang) dan Informasi masuk (kiriman publik, laporkan,
   cabut, "Saya orang ini"). Hak dan wilayah ditentukan server (GET /api/lapor/meja/hilang*); layar tidak menyaring sendiri.
   INP: tombol berubah seketika, daftar dimuat ulang sesudah server menjawab. Teks data lewat textContent. */
import {el, kartuProfil, ikon, tanggalPendek, pilStatus} from "./hilang_kartu.js?v=1";

const NS = "http://www.w3.org/2000/svg";
const ikonM = id => { const s = document.createElementNS(NS, "svg"), u = document.createElementNS(NS, "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const F = n => Number(n).toLocaleString("id-ID");
const sebut = n => n ? `+${String(n).replace(/\D/g, "")}` : "";
const SYARAT = {status: "Status bukan menunggu peninjauan", kejadian_belum_dikonfirmasi: "Kejadian belum dikonfirmasi petugas", wali_belum_diverifikasi: "Wali belum diverifikasi petugas", persetujuan_tidak_sah: "Persetujuan tidak sah atau sudah dicabut",
  orang_tidak_ingin_dicari: "Orang yang dicari menyatakan tidak ingin dicari", telepon_belum_dicatat: "Telepon ke nomor orang yang dicari belum dicatat", laporan_pihak_ketiga_terbuka: "Ada informasi atau laporan pihak ketiga yang belum selesai", bendera_mati: "Halaman publik belum dibuka"};
const HASIL_TELEPON = [["ingin", "Orang itu ingin dicari"], ["tidak_ingin", "Orang itu tidak ingin dicari"], ["tak_terjangkau", "Tidak terjangkau"], ["tanpa_nomor", "Laporan tanpa nomor orang yang dicari"]];
const ALASAN_TOLAK = [["bukan_bencana", "Bukan karena bencana"], ["tidak_masuk_akal", "Data tidak masuk akal"], ["duplikat", "Laporan ganda"], ["anak_tanpa_wali", "Anak tanpa wali yang sah"], ["lainnya", "Alasan lain"]];
const SARAN = {kab: "Wilayah sama atau bertetangga", waktu: "Waktu penemuan dalam jendela", kelamin: "Jenis kelamin tidak berlawanan", umur: "Umur berdekatan", pakaian: "Pakaian ada kata yang sama"};
const JENIS_INFO = {informasi: "Informasi untuk keluarga", foto: "Foto kiriman", laporkan: "Laporan atas profil", cabut: "Permintaan cabut", orang_ini: "Mengaku orang ini"};
const KONDISI = {sadar: "Sadar dan bisa bicara", tidak_sadar: "Tidak sadar", terluka: "Terluka", anak: "Anak", bingung: "Tampak bingung"};
const BERSAMA = {sendiri: "Sendiri", pelapor: "Bersama penemu", petugas: "Bersama petugas", rumah_sakit: "Di rumah sakit"};

async function api(jalur, badan) {
  try {
    const r = await fetch(`/api/lapor/meja/hilang${jalur}`, badan === undefined ? {cache: "no-store", credentials: "same-origin"}
      : {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
    return {s: r.status, j: await r.json().catch(() => ({}))};
  } catch { return {s: 0, j: {}}; }
}
const teksGalat = (s, g) => s === 0 ? "Sambungan terputus. Coba lagi." : s === 401 || s === 403 ? "Daftar ini hanya bisa dibuka petugas yang berhak meninjau orang hilang." : (g || "Belum berhasil. Coba lagi.");
const fotoId = u => (/\/foto\/([0-9a-f]+)$/.exec(u) || [])[1];

/* pratinjau persis publik; berkas foto baru dilayani sesudah tayang, jadi sebelum itu tempatnya berisi keterangan, bukan gambar rusak */
function pratinjau(p) {
  const k = kartuProfil(p, {status: "menunggu"});
  for (const im of k.querySelectorAll(".oh-foto img")) im.addEventListener("error", () => { const f = im.parentElement; f.classList.add("kosong"); f.replaceChildren(ikon("kamera"), el("small", null, "Foto tampil sesudah profil tayang")); }, {once: true});
  return k;
}
function privat(b) {
  const w = el("section", "oh-privat"), p = b.privat, d = el("dl");
  w.setAttribute("aria-label", "Hanya petugas"); w.append(el("h3", null, "Hanya petugas, tidak tampil di publik"));
  const t = (a, v) => { if (v != null && v !== "") d.append(el("dt", null, a), el("dd", null, v)); };
  t("Nomor pelapor", `${sebut(p.nomor_pelapor)}${p.nomor_terverifikasi ? "" : " (hanya diketik, belum terverifikasi)"}`); t("Hubungan", p.hubungan); t("Nomor orang dicari", sebut(p.nomor_dicari));
  t("Lokasi terakhir (rinci)", p.lokasi_terakhir); t("Ciri dari pelapor", p.ciri_laporan);
  t("Telepon ke orang dicari", b.telepon ? (HASIL_TELEPON.find(x => x[0] === b.telepon) || [])[1] || b.telepon : "belum dicatat");
  if (b.anak) t("Wali", b.anak.wali_diverifikasi ? "diverifikasi petugas" : b.anak.pelapor_wali ? "pelapor menyatakan wali, belum diverifikasi" : "pelapor bukan wali");
  w.append(d); return w;
}
function saran(b, temu) {
  if (!b.saran_cocok?.length) return null;
  const w = el("section", "oh-meja-bagian"), h = el("h2", null, "Mungkin mirip dengan laporan penemuan");
  w.append(h, el("p", "oh-ket", "Ini bukan kepastian. Periksa sendiri sebelum menghubungkan."));
  for (const s of b.saran_cocok) {
    const t = temu.find(x => x.id === s.id), ul = el("ul", "oh-saran");
    if (t) ul.append(Object.assign(el("li"), {textContent: `Ditemukan ${tanggalPendek(new Date(t.waktu_temu + 7 * 36e5).toISOString())}, ${s.hari} hari sesudah terakhir terlihat. ${t.lokasi_teks || ""}`.trim()}));
    for (const [k, teks] of Object.entries(SARAN)) {
      const v = s.alasan?.[k], li = el("li", v === true ? "ya" : v === false ? "tidak" : ""); li.append(ikon(v === false ? "turun" : "centang"), `${teks}: ${v === true ? "ya" : v === false ? "tidak" : "tidak bisa dibandingkan"}`); ul.append(li);
    }
    w.append(ul);
  }
  return w;
}
function syarat(b) {
  const ul = el("ul", "oh-syarat");
  if (!b.syarat_belum.length) { const li = el("li", "ok"); li.append(ikon("centang"), "Semua syarat tayang terpenuhi."); ul.append(li); }
  for (const k of b.syarat_belum) { const li = el("li", "belum"); li.append(ikon("turun"), SYARAT[k] || k); ul.append(li); }
  return ul;
}

function kartuMeja(b, temu, muatUlang) {
  const w = el("article", `oh-meja-kartu${b.prioritas ? " prioritas" : ""}`), st = el("p", "oh-pesan"), catatan = Object.assign(el("textarea"), {rows: 2, maxLength: 140, placeholder: "Catatan singkat untuk riwayat (tanpa nomor atau alamat)"});
  catatan.setAttribute("aria-label", "Catatan");
  st.setAttribute("role", "status");
  w.append(pratinjau(b.pratinjau), privat(b));
  if (b.prioritas) w.append(pilStatus("Kejadian masih berjalan, didahulukan", "cari"));
  const sr = saran(b, temu); if (sr) w.append(sr);
  w.append(el("h2", "oh-sr", "Syarat tayang"), syarat(b));
  const kejadian = el("div", "oh-meja-aksi"), pilihKej = el("select"); pilihKej.setAttribute("aria-label", "Kejadian");
  pilihKej.append(Object.assign(el("option", null, b.kejadian.usulan.length ? "Pilih kejadian" : "Tidak ada kejadian yang cocok"), {value: ""}));
  for (const k of b.kejadian.usulan) pilihKej.append(Object.assign(el("option", null, `${k.jenis.replace(/_/g, " ")}, ${tanggalPendek(k.mulai)}${k.aktif ? ", berjalan" : ""}`), {value: k.id}));
  const aksiKe = async (tombol, badan) => {   // tombol berubah seketika; server menjawab sesudahnya
    const semua = [...w.querySelectorAll("button")], teks = tombol.textContent; for (const x of semua) x.disabled = true; tombol.textContent = "Menyimpan"; st.textContent = "";
    const r = await api(`/${b.id}/aksi`, {...badan, catatan: catatan.value.trim() || undefined});
    if (r.s === 200) { await muatUlang(); return; }
    for (const x of semua) x.disabled = false; tombol.textContent = teks;
    st.textContent = r.s === 409 && r.j.syarat_belum ? `Belum bisa ditayangkan: ${r.j.syarat_belum.map(k => SYARAT[k] || k).join("; ")}.` : teksGalat(r.s, r.j.galat);
  };
  const tombol = (teks, f, induk) => { const x = el("button", "oh-tombol", teks); x.type = "button"; x.addEventListener("click", () => f(x)); induk.append(x); return x; };
  pilihKej.disabled = !b.kejadian.usulan.length;
  kejadian.append(pilihKej);
  tombol("Ubah kejadian", x => pilihKej.value ? aksiKe(x, {aksi: "ubah_kejadian", kejadian: pilihKej.value}) : (st.textContent = "Pilih kejadian dulu."), kejadian).disabled = !b.kejadian.usulan.length;
  if (b.kejadian.terisi && !b.kejadian.dikonfirmasi) tombol("Konfirmasi kejadian", x => aksiKe(x, {aksi: "konfirmasi_kejadian"}), kejadian);
  if (b.anak && b.anak.pelapor_wali && !b.anak.wali_diverifikasi) tombol("Verifikasi wali", x => aksiKe(x, {aksi: "verifikasi_wali"}), kejadian);
  w.append(kejadian);
  if (b.kelas === "dewasa") {   // daftar periksa D34: telepon nomor orang yang dicari dulu, lalu catat hasilnya
    const t = el("div", "oh-meja-aksi"), pilih = el("select"); pilih.setAttribute("aria-label", "Hasil telepon");
    for (const [v, tx] of HASIL_TELEPON) pilih.append(Object.assign(el("option", null, tx), {value: v}));
    t.append(pilih); tombol("Catat hasil telepon", x => aksiKe(x, {aksi: "telepon", hasil: pilih.value}), t); w.append(t);
  }
  const foto = (b.pratinjau.foto || []).map(fotoId).filter(Boolean);
  if (foto.length) { const f = el("div", "oh-meja-aksi"); foto.forEach((id, i) => tombol(`Buang foto ${i + 1}`, x => aksiKe(x, {aksi: "ganti_foto", foto: id}), f)); w.append(f); }
  const tolak = el("div", "oh-meja-aksi"), alasan = el("select"); alasan.setAttribute("aria-label", "Alasan tolak");
  for (const [v, tx] of ALASAN_TOLAK) alasan.append(Object.assign(el("option", null, tx), {value: v}));
  const aksiUtama = el("div", "oh-meja-aksi");
  const tayang = tombol("Tayang", x => aksiKe(x, {aksi: "tayang"}), aksiUtama), kepada = (b.kelas === "anak" ? "anak" : "dewasa");
  tayang.classList.add("utama"); tayang.disabled = b.syarat_belum.length > 0; tayang.title = tayang.disabled ? "Syarat tayang belum terpenuhi" : `Tayangkan profil ${kepada}`;
  tombol("Minta perbaikan", x => catatan.value.trim() ? aksiKe(x, {aksi: "perbaikan"}) : (st.textContent = "Tulis catatan singkat untuk pelapor."), aksiUtama);
  tolak.append(alasan); tombol("Tolak", x => aksiKe(x, {aksi: "tolak", alasan: alasan.value}), tolak);
  w.append(catatan, aksiUtama, tolak, st);
  return w;
}
function kartuTemu(t) {
  const w = el("article", "oh-meja-kartu"), d = el("dl"), p = el("section", "oh-privat");
  p.append(el("h3", null, "Hanya petugas, tidak tampil di publik"));
  const a = (k, v) => { if (v != null && v !== "") d.append(el("dt", null, k), el("dd", null, v)); };
  a("Keadaan", KONDISI[t.kondisi] || t.kondisi); a("Ucapan", t.ucapan); a("Bersama", BERSAMA[t.bersama] || t.bersama); a("Ciri", t.ciri); a("Ditemukan di", t.lokasi_teks);
  a("Waktu", tanggalPendek(new Date(t.waktu_temu + 7 * 36e5).toISOString())); a("Foto", t.foto_boleh ? "boleh dipakai petugas" : "tidak ada izin foto");
  a("Nomor penemu", `${sebut(t.nomor_penemu)}${t.nomor_terverifikasi ? "" : " (hanya diketik, belum terverifikasi)"}`);
  p.append(d); w.append(p); return w;
}

function kartuInfo(i, muatUlang) {
  const w = el("article", "oh-meja-kartu"), kepala = el("div", "oh-kepala"), st = el("p", "oh-pesan"), d = el("dl", "oh-data"); st.setAttribute("role", "status");
  kepala.append(pilStatus(JENIS_INFO[i.jenis] || i.jenis, "tunggu"));
  if (i.tingkat) kepala.append(pilStatus(i.tingkat === "mirip" ? "Mungkin mirip" : "Mirip sedikit", "cari"));
  if (i.profil.dilaporkan_ambang) kepala.append(pilStatus("Turun sementara: dilaporkan beberapa pihak", "redup"));
  const t = (k, v) => { if (v) d.append(el("dt", null, k), el("dd", null, v)); };
  t("Profil", `${i.profil.kelas === "anak" ? "anak" : "dewasa"}, ${i.profil.kab || "kab/kota belum diketahui"}, status ${i.profil.status}`); t("Pesan", i.pesan); t("Nomor pemberi", sebut(i.nomor_pemberi) || "tanpa sesi (tidak ada nomor)");
  t("Masuk", tanggalPendek(new Date(i.dibuat + 7 * 36e5).toISOString()));
  const aksi = el("div", "oh-meja-aksi"), alasan = el("select"); alasan.setAttribute("aria-label", "Alasan turunkan");
  alasan.append(Object.assign(el("option", null, "Turunkan: pelapor atau orang itu sudah terverifikasi (dicabut)"), {value: "dicabut"}), Object.assign(el("option", null, "Turunkan: keputusan petugas"), {value: "petugas"}));
  const kirim = async (x, badan) => {
    const semua = [...w.querySelectorAll("button")], teks = x.textContent; for (const y of semua) y.disabled = true; x.textContent = "Menyimpan"; st.textContent = "";
    const r = await api(`/${i.profil.id}/aksi`, badan);
    if (r.s === 200) { await muatUlang(); return; }
    for (const y of semua) y.disabled = false; x.textContent = teks; st.textContent = teksGalat(r.s, r.j.galat);
  };
  const tombol = (teks, badan) => { const x = el("button", "oh-tombol", teks); x.type = "button"; x.addEventListener("click", () => kirim(x, badan())); aksi.append(x); };
  if (["menunggu", "tayang"].includes(i.profil.status)) { aksi.append(alasan); tombol("Turunkan profil", () => ({aksi: "turunkan", alasan: alasan.value})); }
  tombol("Teruskan ke keluarga", () => ({aksi: "teruskan_info", info: i.id})); tombol("Tandai selesai", () => ({aksi: "selesai_info", info: i.id}));
  w.append(kepala, d, aksi, st); return w;
}

export async function bukaHilangPublik() {
  if (document.querySelector("dialog.mj-oh[open]")) return;
  const d = el("dialog", "mj-rinci mj-ld-daftar mj-oh"), kep = el("header", "mj-rinci-kepala"), atas = el("div", "mj-rk-atas"), judul = el("div", "mj-rk-judul"), h2 = el("h2", null, "Orang hilang di halaman publik");
  h2.id = "ohJudul"; d.setAttribute("aria-labelledby", "ohJudul"); judul.append(h2, el("p", "mj-rk-meta", "Tinjau profil sebelum tayang dan tangani kiriman dari publik"));
  const x = el("button", "mj-tutup"); x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ikonM("m-tutup")); x.addEventListener("click", () => d.close()); atas.append(judul, x); kep.append(atas);
  const badan = el("div", "mj-rinci-gulung"), isi = el("div", "mj-ld-isi oh-meja"); badan.append(isi); d.append(kep, badan); d.addEventListener("close", () => d.remove());
  document.body.append(d); d.showModal();
  let tab = "tinjau", data = null, info = [], kursor = null, urutan = 0;
  const chips = el("div", "mj-deret mj-ld-jenis"), wadah = el("div", "oh-meja");
  const kosong = (j, t) => { const k = el("div", "oh-kosong"); k.append(el("b", null, j), el("span", null, t)); return k; };
  const gambar = () => {
    const bagian = [];
    if (tab === "tinjau") {
      const baris = data?.baris || [], temu = data?.temu || [];
      bagian.push(...(baris.length ? baris.map(b => kartuMeja(b, temu, muat)) : [kosong("Belum ada profil yang menunggu", "Profil muncul di sini sesudah pelapor menyetujui dan mengirim.")]));
      if (temu.length) { const s = el("section", "oh-meja-bagian"); s.append(el("h2", null, "Laporan menemukan orang"), ...temu.map(kartuTemu)); bagian.push(s); }
    } else {
      bagian.push(...(info.length ? info.map(i => kartuInfo(i, muatInfo)) : [kosong("Belum ada kiriman dari publik", "Informasi, laporan atas profil, dan permintaan cabut muncul di sini.")]));
      if (kursor) { const l = el("button", "oh-tombol", "Muat lagi"); l.type = "button"; l.addEventListener("click", async () => { l.disabled = true; await muatInfo(true); }); bagian.push(l); }
    }
    wadah.replaceChildren(...bagian);
  };
  const segar = () => {
    chips.replaceChildren(...[["tinjau", "Tinjau profil", data?.baris?.length], ["info", "Informasi masuk", tab === "info" ? info.length : null]].map(([k, t, n]) => {
      const c = el("button", "mj-chip-j"); c.type = "button"; c.setAttribute("aria-pressed", String(tab === k)); c.append(ikonM("m-orang"), `${t} `, ...(n != null ? [el("b", null, F(n))] : []));
      c.addEventListener("click", () => { tab = k; segar(); gambar(); if (k === "info" && !info.length && kursor === null) muatInfo(); });
      return c;
    }));
  };
  async function muat() {
    const saya = ++urutan, r = await api("");
    if (saya !== urutan) return;
    if (r.s !== 200) { isi.replaceChildren(el("p", "mj-kosong", teksGalat(r.s, r.j.galat))); return; }
    data = r.j; segar(); gambar(); isi.replaceChildren(chips, wadah);
  }
  async function muatInfo(tambah = false) {
    const r = await api(`/info${tambah && kursor ? `?kursor=${encodeURIComponent(kursor)}` : ""}`);
    if (r.s !== 200) { wadah.replaceChildren(el("p", "mj-kosong", teksGalat(r.s, r.j.galat))); return; }
    info = tambah ? [...info, ...(r.j.info || [])] : (r.j.info || []); kursor = r.j.kursor || null; segar(); gambar();
  }
  isi.replaceChildren(el("p", "mj-kosong", "Memuat daftar")); await muat();
}
