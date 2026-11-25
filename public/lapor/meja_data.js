/* Tab "Data lanjutan" di meja laporan (tiket LJ-16; data/kajian-bnpb/lapor-lanjutan, DESIGN-SYSTEM rincian staf, KEAMANAN-PRIVASI matriks hak).
   Dua pintu dari meja.js: pasangDataLanjutan (kartu di rincian tiket, hanya muncul bila tiket itu induk sebuah berkas) dan bukaDaftarData (daftar berkas lintas kab).
   Hak ditentukan server: staf Pusdalops BNPB (Tampilkan, terima, buka lagi), akun lembaga kab (tersamar, tanpa aksi), akun provinsi (rekap saja). Layar tidak menghitung angka:
   rekap datang dari server; kosong tidak pernah tampil 0 ("belum didata"). Pemilihan sumber beda_sumber di meja dampak ada di layar meja dampak (public/bnpb), bukan di sini. */
import {JENIS, NAMA_JENIS, ringkasObjek, PENANDA, RINGKAS, namaMetrik, teksRekap, STATUS_BERKAS, STATUS_DARURAT, kondisiBaris, tglIndo, labelButir, teksNilai} from "./data/murni.js";

const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const F = n => Number(n).toLocaleString("id-ID");
const IK = {rumah: "m-rumah", prasarana: "m-jalan", titik: "m-tenda", jiwa: "m-orang", korban: "m-korban", usaha: "m-fasilitas", kebutuhan: "m-tiket"};
const WARNA_STATUS = {terbuka: "var(--ok)", usul_tutup: "var(--warn)", selesai: "var(--ink2)", selesai_catatan: "var(--brand-accent)"};
const pilStatus = s => { const p = el("span", "mj-pil", STATUS_BERKAS[s] ?? s); p.style.setProperty("--st", WARNA_STATUS[s] || "var(--line)"); return p; };

async function api(jalur, badan) {
  try {
    const r = await fetch(`/api/lapor/data/${jalur}`, badan === undefined ? {cache: "no-store"} : {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
    return {s: r.status, j: await r.json().catch(() => ({}))};
  } catch { return {s: 0, j: {}}; }
}
/* kerja berat sesudah klik tercat (INP): chrome kontrol di-set dulu, tabel digambar rAF lalu timeout; klik beruntun dengan kunci sama digabung */
const tundaPer = new Map();
const nanti = (f, kunci) => { const n = (tundaPer.get(kunci) ?? 0) + 1; tundaPer.set(kunci, n); const jalan = () => { if (tundaPer.get(kunci) === n) { tundaPer.set(kunci, n + 1); f(); } }; requestAnimationFrame(() => setTimeout(jalan, 0)); setTimeout(jalan, 120); };
const BATAS = 50;   // baris pertama; sisanya lewat Muat lagi
const tombolLagi = (sisa, aksi) => { const b = el("button", "mj-tombol"); b.type = "button"; b.append(`Muat lagi, sisa ${F(sisa)}`); b.addEventListener("click", aksi); return b; };
const dlPribadi = (jenis, pribadi) => { const dl = el("dl", "mj-ld-pribadi"); for (const [n, v] of Object.entries(pribadi || {})) dl.append(el("dt", null, labelButir(jenis, n)), el("dd", null, teksNilai(jenis, n, v))); return dl; };
const galatTeks = r => r.s === 0 ? "Tidak ada sinyal. Coba lagi." : r.j.galat || "Gagal. Coba lagi.";

let cache = null;   // daftar berkas dipakai tiap rincian tiket dibuka: simpan 20 detik supaya membuka beberapa tiket beruntun tidak menembak server terus
export async function daftarBerkas(segar = false) {
  if (!segar && cache && Date.now() - cache.t < 20000) return cache.v;
  const v = await api("daftar"); cache = {t: Date.now(), v}; return v;
}

/* ---------- panel satu berkas ---------- */
function tabelRekap(rekap) {
  const tb = el("table", "mj-tabel mj-ld-tabel"), kep = el("tr"), bd = el("tbody");
  const th = el("thead"); kep.append(el("th", null, "Bagian"), el("th", null, "Jumlah")); th.append(kep); tb.append(th);
  for (const [grup, ms] of RINGKAS) {
    const g = el("tr", "mj-ld-grup"), td = el("td", null, grup); td.colSpan = 2; g.append(td); bd.append(g);
    for (const m of ms) { const v = rekap?.[m], r = el("tr"); r.append(el("td", null, namaMetrik(m)), el("td", v == null ? "mj-ld-belum" : "", teksRekap(v, m))); bd.append(r); }
  }
  tb.append(bd); const w = el("div", "mj-tabel-gulung"); w.append(tb); return w;
}
function ringkasPenanganan(isi = {}) {
  const dl = el("dl"), baris = (t, v) => dl.append(el("dt", null, t), el("dd", v == null || v === "" ? "kosong" : "", v == null || v === "" ? "belum didata" : String(v)));
  baris("Status darurat", STATUS_DARURAT.find(x => x[0] === isi.status_darurat)?.[1]); baris("Nomor SK", isi.sk_nomor); baris("Tanggal SK", tglIndo(isi.sk_tanggal));
  baris("Posko", isi.posko?.nama); baris("Upaya penanganan", isi.upaya); baris("Personel", isi.personel != null ? `${F(isi.personel)} orang` : null);
  if (isi.penutupan) baris("Penutupan diusulkan", `${tglIndo(isi.penutupan.tgl_selesai)}, ${STATUS_BERKAS[isi.penutupan.status] ?? isi.penutupan.status}`);
  return dl;
}
function daftarObjek(objek, staf) {
  const w = el("div", "mj-ld-objek"), deret = el("div", "mj-deret mj-ld-jenis"), isi = el("div");
  const ada = JENIS.filter(([j]) => objek.some(o => o.jenis === j && o.status === "aktif"));
  if (!ada.length) { w.append(el("p", "mj-ld-belum", "Belum ada objek yang dicatat tim.")); return w; }
  let pilih = ada[0][0];
  const gambar = () => {
    for (const b of deret.children) b.setAttribute("aria-pressed", String(b.dataset.j === pilih));
    const xs = objek.filter(o => o.jenis === pilih && o.status === "aktif");
    const tampil = n => { isi.replaceChildren(...xs.slice(0, n).map(o => baris(o, staf)), ...(xs.length > n ? [tombolLagi(xs.length - n, () => tampil(n + BATAS))] : [])); };
    tampil(BATAS);
  };
  for (const [j, nama] of ada) { const b = el("button", "mj-chip-j"); b.type = "button"; b.dataset.j = j; b.append(ikon(IK[j]), `${nama} `, el("b", null, F(objek.filter(o => o.jenis === j && o.status === "aktif").length)));
    b.addEventListener("click", () => { pilih = j; for (const c of deret.children) c.setAttribute("aria-pressed", String(c === b)); nanti(gambar, deret); }); deret.append(b); }
  w.append(deret, isi); gambar(); return w;
}
function baris(o, staf) {
  const r = ringkasObjek(o), k = el("article", "mj-ld-baris"), t = el("div"), pils = el("div", "mj-ld-pils");
  t.append(el("b", null, r.judul), ...(r.sub ? [el("small", null, r.sub)] : []));
  for (const p of r.pil) pils.append(el("span", "mj-ld-pil", p));
  for (const p of o.penanda || []) { const x = el("span", "mj-ld-pil peringatan", PENANDA[p]?.[0] ?? p); if (PENANDA[p]) x.title = PENANDA[p][1]; pils.append(x); }
  k.append(t, pils);
  const adaPribadi = o.pribadi && Object.keys(o.pribadi).length;
  if (staf && adaPribadi) {   // data pribadi tersamar sampai Tampilkan; tiap Tampilkan tercatat di server (Q6, D22). Tersembunyi lagi sesudah 60 detik, saat tab ke latar, atau lewat Sembunyikan
    const b = el("button", "mj-tombol mj-ld-tampil"); b.type = "button"; b.append(ikon("m-buka"), "Tampilkan data pribadi"); const g = el("p", "mj-pesan-galat"); g.setAttribute("role", "alert");
    b.addEventListener("click", async () => {
      b.disabled = true; const x = await api("tampil", {objek: o.id}); b.disabled = false;
      if (x.s !== 200) { g.textContent = galatTeks(x); return; }
      g.textContent = ""; const kotak = el("div"), sembunyi = el("button", "mj-tombol"); sembunyi.type = "button"; sembunyi.append("Sembunyikan");
      let waktu = 0; const tutup = () => { clearTimeout(waktu); document.removeEventListener("visibilitychange", latar); if (kotak.isConnected) kotak.replaceWith(b); };
      const latar = () => { if (document.hidden) tutup(); };
      kotak.append(dlPribadi(o.jenis, x.j.pribadi), sembunyi); sembunyi.addEventListener("click", tutup); waktu = setTimeout(tutup, 60000); document.addEventListener("visibilitychange", latar);
      b.replaceWith(kotak);
    }); k.append(b, g);
  } else if (adaPribadi) k.append(dlPribadi(o.jenis, o.pribadi));
  return k;
}

function dialogAlasan(judul, aksi) {
  const d = el("dialog", "mj-ld-dlg"), h = el("h3", null, judul), t = el("textarea"), g = el("p", "mj-pesan-galat"), ok = el("button", "mj-tombol isi"), batal = el("button", "mj-tombol");
  t.rows = 3; t.maxLength = 400; t.placeholder = "Tulis alasan, 5 sampai 400 huruf. Jangan tulis nomor HP atau NIK."; t.setAttribute("aria-label", "Alasan"); g.setAttribute("role", "alert");
  ok.type = batal.type = "button"; ok.append("Buka lagi berkas"); batal.append("Batal"); batal.addEventListener("click", () => d.close()); d.addEventListener("close", () => d.remove());
  ok.addEventListener("click", async () => { ok.disabled = true; const m = await aksi(t.value); ok.disabled = false; if (m) g.textContent = m; else d.close(); });
  const aksiBar = el("div", "mj-deret"); aksiBar.append(batal, ok); d.append(h, el("p", "mj-ld-belum", "Ketua tim mendapat pesan WhatsApp berisi alasan ini dan bisa melengkapi data lagi."), t, g, aksiBar);
  document.body.append(d); d.showModal();
}

export async function panelBerkas(id, {sesudah} = {}) {
  const w = el("div", "mj-ld"), r = await api(`berkas?id=${id}`);
  if (r.s !== 200) { w.append(el("p", "mj-pesan-galat", r.s === 401 || r.s === 403 ? "Data lanjutan hanya bisa dibuka staf Pusdalops BNPB dan akun BPBD wilayahnya." : galatTeks(r))); return w; }
  const {berkas: b, rekap, tim, objek, akun} = r.j, staf = akun?.jenis === "bnpb", pesan = el("p", "mj-pesan-galat"), hasil = el("div", "mj-ld-hasil"); pesan.setAttribute("role", "alert");
  const kep = el("div", "mj-ld-kep"), t = el("b", null, b.isian?.kab_nama ?? `Kab ${b.kab}`), p2 = el("span", "mj-ld-ket", `Berkas ${b.induk}`);
  kep.append(t, p2, pilStatus(b.status), el("span", "mj-ld-pil", b.kejadian_id ? "Tertaut ke kejadian Buku Besar" : "Belum tertaut ke Buku Besar")); w.append(kep, tabelRekap(rekap));
  if (b.isian && (tim || b.isian.status_darurat !== undefined)) w.append(ringkasPenanganan(b.isian));
  if (tim) { const ul = el("ul", "mj-ld-tim"); for (const x of tim.filter(y => y.aktif)) { const li = el("li"); li.append(el("b", null, x.nama ?? "belum bernama"), el("small", null, `${x.peran === "ketua" ? "ketua, " : ""}${x.wa}`)); ul.append(li); }
    const kt = el("p", "mj-label", "Tim pendataan"); w.append(kt, ul); }
  if (objek) w.append(el("p", "mj-label", "Objek yang dicatat"), daftarObjek(objek, staf));
  const muatUlang = async () => { const baru = await panelBerkas(id, {sesudah}); w.replaceWith(baru); sesudah?.(); };
  const terima = async (aksi, badanTambah, tombol) => {
    pesan.textContent = ""; hasil.replaceChildren(); tombol && (tombol.disabled = true);
    const x = await api("terima", {berkas: id, aksi, ...badanTambah}); tombol && (tombol.disabled = false);
    if (x.s !== 200) return galatTeks(x) + (x.j.dilewati ? ` Dilewati: ${Object.entries(x.j.dilewati).filter(([, n]) => n).map(([k2, n]) => `${F(n)} ${k2.replace(/_/g, " ")}`).join(", ")}.` : "");
    if (aksi === "jitupasna") { const n = x.j.baris?.length || 0; hasil.replaceChildren(el("p", "mj-ld-ok", `Diterima ke Jitupasna versi ${x.j.versi}: ${F(n)} baris sektor dan tingkat.`)); return null; }
    await muatUlang(); return null;
  };
  if (staf) {   // hanya Pusdalops BNPB; server menolak yang lain
    const aksi = el("div", "mj-deret");
    if (b.status === "usul_tutup") { const k = b.isian?.penutupan?.status; if (k) w.append(el("p", "mj-ld-ket", `Kondisi akhir yang diusulkan: ${k === "selesai" ? "selesai" : "selesai dengan catatan"}.`));
      const x = el("button", "mj-tombol isi"); x.type = "button"; x.append(ikon("m-centang"), "Terima penutupan"); x.addEventListener("click", async () => { const m = await terima("tutup", {}, x); if (m) pesan.textContent = m; }); aksi.append(x); }
    if (b.status !== "terbuka") { const x = el("button", "mj-tombol"); x.type = "button"; x.append(ikon("m-ulang"), "Buka lagi"); x.addEventListener("click", () => dialogAlasan("Buka lagi berkas", alasan => terima("buka", {alasan}))); aksi.append(x); }
    const j = el("button", "mj-tombol"); j.type = "button"; j.append(ikon("m-kirim"), "Terima ke Jitupasna"); j.title = "Memindahkan rumah dan prasarana rusak ke Jitupasna kab/kota ini. Hanya bila berkas tertaut ke kejadian dan Jitupasna masih menerima.";
    j.addEventListener("click", async () => { const m = await terima("jitupasna", {}, j); if (m) pesan.textContent = m; }); aksi.append(j);
    w.append(aksi, pesan, hasil);
  }
  return w;
}

/* ---------- kartu di rincian tiket ---------- */
/* wadah = isi kartu yang sudah ada di rincian; tampil() dipanggil hanya bila tiket ini induk sebuah berkas dan akun boleh membacanya */
export async function pasangDataLanjutan(nomor, wadah, tampil) {
  const d = await daftarBerkas(); if (d.s !== 200) return;
  const cocok = (d.j.berkas || []).filter(b => b.induk === nomor); if (!cocok.length) return;
  wadah.replaceChildren(el("p", "mj-ld-belum", "Memuat data lanjutan..."));
  const isi = []; for (const b of cocok) isi.push(await panelBerkas(b.id, {sesudah: () => { cache = null; }}));
  wadah.replaceChildren(...isi); tampil();
}

/* ---------- daftar berkas lintas kab ---------- */
const URUT = {usul_tutup: 0, terbuka: 1, selesai_catatan: 2, selesai: 3};
const urut = (a, b) => (URUT[a.status] ?? 9) - (URUT[b.status] ?? 9) || b.diubah - a.diubah;
export async function bukaDaftarData(namaDari = new Map()) {
  const d = el("dialog", "mj-rinci mj-ld-daftar"), kep = el("header", "mj-rinci-kepala"), atas = el("div", "mj-rk-atas"), judul = el("div", "mj-rk-judul"), h2 = el("h2", null, "Data lanjutan BPBD");
  h2.id = "ldJudul"; d.setAttribute("aria-labelledby", "ldJudul"); judul.append(h2, el("p", "mj-rk-meta", "Berkas pendataan dampak per kab/kota sesudah laporan awal"));
  const x = el("button", "mj-tutup"); x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ikon("m-tutup")); x.addEventListener("click", () => d.close()); atas.append(judul, x); kep.append(atas);
  const badan = el("div", "mj-rinci-gulung"), isi = el("div", "mj-ld-isi"); badan.append(isi); d.append(kep, badan); d.addEventListener("close", () => d.remove());
  document.body.append(d); d.showModal(); isi.replaceChildren(el("p", "mj-kosong", "Memuat berkas..."));
  const r = await daftarBerkas(true);
  if (r.s !== 200) { isi.replaceChildren(el("p", "mj-kosong", r.s === 401 || r.s === 403 ? "Data lanjutan hanya bisa dibuka staf Pusdalops BNPB dan akun BPBD wilayahnya." : galatTeks(r))); return; }
  const semua = (r.j.berkas || []).slice().sort(urut);
  let saring = null;
  const cocok = (b, st) => !st || b.status === st || (st === "selesai" && b.status === "selesai_catatan");
  const chips = el("div", "mj-deret mj-ld-jenis"), wadahTabel = el("div");
  const pilihan = [[null, "Semua"], ["usul_tutup", "Menunggu diterima"], ["terbuka", "Terbuka"], ["selesai", "Selesai"]];
  const segarChip = () => { chips.replaceChildren(...pilihan.map(([st, n]) => { const c = el("button", "mj-chip-j"); c.type = "button"; c.setAttribute("aria-pressed", String(saring === st));
    c.append(`${n} `, el("b", null, F(semua.filter(b => cocok(b, st)).length)));
    c.addEventListener("click", () => { saring = st; for (const x of chips.children) x.setAttribute("aria-pressed", String(x === c)); nanti(tabel, wadahTabel); }); return c; })); };   // chip tercat dulu, tabel menyusul
  const bukaBerkas = async b => { isi.replaceChildren(el("p", "mj-kosong", "Memuat berkas..."));
    const kembali = el("button", "mj-tombol"); kembali.type = "button"; kembali.append(ikon("m-panah"), "Kembali ke daftar");
    kembali.addEventListener("click", async () => { const rr = await daftarBerkas(true); if (rr.s === 200) semua.splice(0, semua.length, ...(rr.j.berkas || []).sort(urut)); tampilDaftar(); });
    const p = await panelBerkas(b.id, {sesudah: () => { cache = null; }}); isi.replaceChildren(kembali, p); };
  const tabel = () => {
    const tb = el("table", "mj-tabel mj-ld-tabel"), tr = el("tr"), bd = el("tbody"), th = el("thead");
    for (const t of ["Kab/kota", "Berkas", "Status", ...JENIS.map(j => j[1]), "Diubah"]) tr.append(el("th", null, t)); th.append(tr); tb.append(th);
    const tampil = semua.filter(b => cocok(b, saring));
    const isiBaris = (dari, sampai) => { for (const b of tampil.slice(dari, sampai)) {
      const row = el("tr", "mj-ld-klik"), kab = namaDari.get(b.induk) ?? `Kab ${b.kab}`; row.tabIndex = 0; row.setAttribute("role", "button"); row.setAttribute("aria-label", `Buka berkas ${kab}`);
      row.append(el("td", null, kab), el("td", null, b.induk), el("td"), ...JENIS.map(([j]) => { const n = b.objek?.[j]; return el("td", n ? "" : "mj-ld-belum", n ? F(n) : "belum didata"); }), el("td", null, tglIndo(b.diubah)));
      row.children[2].append(pilStatus(b.status));
      row.addEventListener("click", () => bukaBerkas(b)); row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bukaBerkas(b); } });
      bd.append(row); } };
    isiBaris(0, BATAS); tb.append(bd); const g = el("div", "mj-tabel-gulung"); g.append(tb);
    const lagi = tampil.length > BATAS ? tombolLagi(tampil.length - BATAS, () => { isiBaris(BATAS, tampil.length); lagi.remove(); }) : null;
    wadahTabel.replaceChildren(...(tampil.length ? [g, ...(lagi ? [lagi] : [])] : [el("p", "mj-kosong", saring ? "Tidak ada berkas dengan status ini." : "Belum ada berkas data lanjutan.")]));
  };
  const tampilDaftar = () => { segarChip(); tabel(); isi.replaceChildren(chips, wadahTabel); };
  tampilDaftar();
}
