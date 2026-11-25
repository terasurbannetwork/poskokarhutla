/* Layar /lapor/data/ untuk tim BPBD (tiket LJ-15; data/kajian-bnpb/lapor-lanjutan, ALUR 3 sampai 7, DESIGN-SYSTEM, KEAMANAN-PRIVASI D21).
   Tautan WA membawa ?t= (sekali pakai) yang ditukar kuki lapor_data lewat POST /api/lapor/data/masuk, lalu dibuang dari alamat.
   Layar hanya menggambar dan mengirim: aturan isian dijaga server (src/lapor_lanjut.js), pesan galatnya ditampilkan apa adanya.
   Antrean luring: butir tanpa data pribadi lewat saluran "lanjut-umum" (IndexedDB); rumah, pengungsi, dan korban lewat saluran "lanjut-rahasia" yang hanya
   hidup di memori halaman (D21), dengan peringatan sebelum halaman ditutup. Edit, batal, nihil, tim, dan penutupan butuh sinyal.
   INP: tab berganti seketika (aria-selected), isi dan peta digambar sesudah cat berikutnya. Video menyusul (LJ-18): tempatnya `data-slot="video"` di kartu objek. */
import {JENIS, NAMA_JENIS, FORM, FOTO_MINTA, TANPA_LOKASI, wajibIni, wajahTampil, punyaPribadi, bangunIsian, nilaiDariObjek, ringkasObjek, PENANDA, METRIK_TAB, RINGKAS, namaMetrik, teksRekap,
  STATUS_BERKAS, STATUS_DARURAT, kondisiBaris, layakAntre, tglIndo, saluranJenis} from "./murni.js";

const $ = id => document.getElementById(id);
const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const F = n => Number(n).toLocaleString("id-ID");
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // WIB
const acakId = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
/* kerja berat sesudah tombol tercat; panggilan beruntun dengan kunci sama digabung jadi satu (kunci beda tidak saling membatalkan). Timer cadangan untuk tab latar (rAF berhenti) */
const tundaPer = new Map();
const nanti = (f, kunci = f) => { const n = (tundaPer.get(kunci) ?? 0) + 1; tundaPer.set(kunci, n); const jalan = () => { if (tundaPer.get(kunci) === n) { tundaPer.set(kunci, n + 1); f(); } }; requestAnimationFrame(() => setTimeout(jalan, 0)); setTimeout(jalan, 120); };

/* ---------- jaringan ---------- */
async function api(jalur, badan) {
  try {
    const r = await fetch(`/api/lapor/data/${jalur}`, badan === undefined ? {cache: "no-store"} : {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
    return {s: r.status, j: await r.json().catch(() => ({}))};
  } catch { return {s: 0, j: {}}; }
}
const galatTeks = r => r.s === 0 ? "Tidak ada sinyal. Coba lagi saat sinyal kembali." : r.j.galat || "Gagal menyimpan. Coba lagi.";
const labelButir = (jenis, nama) => FORM[jenis]?.find(f => f[0] === nama)?.[1] ?? nama;

/* ---------- keadaan ---------- */
const S = {b: null, rekap: {}, tim: [], objek: [], saya: null, tab: "ringkasan", antre: [], batas: {}};
const aktif = jenis => S.objek.filter(o => o.status === "aktif" && (!jenis || o.jenis === jenis));
const terbuka = () => S.b?.status === "terbuka";
const ketua = () => S.saya?.peran === "ketua";
const titikBerkas = () => aktif("titik").filter(o => o.titik_id);

async function muatBerkas() {
  const r = await api("berkas");
  if (r.s !== 200) return r;
  Object.assign(S, {b: r.j.berkas, rekap: r.j.rekap || {}, tim: r.j.tim || [], objek: r.j.objek || [], saya: r.j.saya});
  $("pintu").hidden = true; $("app").hidden = false;
  gambarKepala(); gambarTab(); nanti(() => { gambarIsi(); segarPeta(); }, "isi"); return r;
}

/* ---------- antrean luring ---------- */
const terkirimFoto = new Map();   // klien_id -> foto yang sudah masuk server; hanya hidup selama halaman ini (ponytail: sesudah muat ulang foto yang sudah masuk bisa terkirim dua kali, server membatasi 10 per objek)
async function kirimButir(b) {
  const r = await api("objek", {jenis: b.jenis, isian: b.isian, lat: b.lat, lon: b.lon, klien_id: b.klien_id, ...(b.paksa && {paksa: true})});
  if (r.s !== 200 && r.s !== 201) return r;
  const id = r.j.objek.id, fotos = b.fotos || [];
  for (let i = terkirimFoto.get(b.klien_id) ?? 0; i < fotos.length; i++) {
    const f = await api("foto", {objek: id, data: fotos[i].data, gps: fotos[i].gps, jenis: fotos[i].jenis});
    if (f.s !== 201) return layakAntre(f.s) || f.s === 401 || f.s === 403 ? f : {s: 422, j: {galat: `Data sudah tersimpan, tetapi foto ditolak: ${f.j.galat || "tidak sah"}`}};
    terkirimFoto.set(b.klien_id, i + 1);
  }
  return {s: 200, j: r.j};
}
const saluran = {};
function siapkanAntre() {
  if (saluran.umum || !window.PbAntre) return;
  const buat = (nama, opsi) => window.PbAntre.saluran(nama, {kirim: async b => kirimButir(b[0]), ...opsi});
  saluran.umum = buat("lanjut-umum", {});
  saluran.rahasia = buat("lanjut-rahasia", {rahasia: true, simpan: window.PbAntre.memori()});   // memori saja: tidak pernah ke IndexedDB atau localStorage
  window.PbAntre.dengar(() => nanti(segarAntre));
  segarAntre();
}
let menungguLama = 0;
async function segarAntre() {
  if (!saluran.umum) return;
  S.antre = [...await saluran.umum.daftar(), ...await saluran.rahasia.daftar()].sort((a, b) => a.dibuat - b.dibuat);
  const n = S.antre.filter(x => x.status === "menunggu").length;
  if (n < menungguLama) muatBerkas();   // ada yang terkirim: ambil data terbaru
  menungguLama = n; gambarPita(); if (S.b) gambarIsi();
}
const adaRahasia = () => S.antre.some(x => x.saluran === "lanjut-rahasia");
let formKotor = false;   // form terbuka yang sudah diisi tapi belum disimpan
addEventListener("beforeunload", e => { if (adaRahasia() || formKotor) { e.preventDefault(); e.returnValue = ""; } });   // D21: isian pribadi yang belum terkirim hilang bila halaman ditutup
addEventListener("online", () => { gambarPita(); saluran.umum?.kirimSekarang(); saluran.rahasia?.kirimSekarang(); }); addEventListener("offline", gambarPita);
function gambarPita() {
  const p = $("pita"), luring = navigator.onLine === false, menunggu = S.antre.filter(x => x.status === "menunggu").length, rahasia = adaRahasia();
  p.hidden = !luring && !S.antre.length;
  if (p.hidden) return;
  const teks = [luring ? "Tidak ada sinyal. Data yang disimpan akan terkirim otomatis saat sinyal kembali." : null, menunggu ? `${F(menunggu)} isian menunggu dikirim.` : null,
    rahasia ? "Isian yang berisi data pribadi hanya tersimpan selama halaman ini terbuka. Jangan tutup halaman sebelum terkirim." : null].filter(Boolean).join(" ");
  p.replaceChildren(ikon(luring ? "d-sinyal" : "d-kirim"), el("span", null, teks));
}

/* ---------- kepala dan tab ---------- */
function gambarKepala() {
  $("judul").textContent = `Data lanjutan ${S.b.isian?.kab_nama ?? "kab/kota"}`;
  $("sub").textContent = `Berkas ${S.b.induk}`;
  const st = $("status"); st.textContent = STATUS_BERKAS[S.b.status] ?? S.b.status; st.dataset.s = S.b.status;
  $("peran").textContent = ketua() ? "Ketua tim" : "Anggota tim";
  $("tutupan").hidden = terbuka();
  $("tutupan").textContent = S.b.status === "usul_tutup" ? "Penutupan sudah diusulkan dan menunggu diterima Pusdalops BNPB. Data tidak bisa diubah. Bila ada yang perlu diperbaiki, minta Pusdalops membuka berkas lagi." : "Berkas ini sudah ditutup. Data tidak bisa diubah.";
}
const TAB = [["ringkasan", "Ringkasan", "d-ringkas"], ...JENIS, ["penanganan", "Penanganan", "d-berkas"]];
function gambarTab() {
  const bar = $("tab");
  if (!bar.childElementCount) for (const [id, nama, ik] of TAB) {
    const b = el("button", "ld-tab"); b.type = "button"; b.role = "tab"; b.id = `tab-${id}`; b.dataset.tab = id; b.append(ikon(ik), el("span", null, nama), el("b", null)); bar.append(b);
  }
  for (const b of bar.children) {
    const id = b.dataset.tab, n = JENIS.some(j => j[0] === id) ? aktif(id).length : 0;
    b.setAttribute("aria-selected", String(id === S.tab)); b.lastChild.textContent = n ? F(n) : ""; b.lastChild.hidden = !n;   // jumlah kosong tidak tampil 0
  }
}
function bukaTab(id) { S.tab = id; gambarTab(); nanti(() => { gambarIsi(); segarPeta(); }, "isi"); }
$("tab").addEventListener("click", e => { const b = e.target.closest(".ld-tab"); if (b && b.dataset.tab !== S.tab) bukaTab(b.dataset.tab); });

/* ---------- isi tab ---------- */
const kartu = (judul, ik, ...isi) => { const k = el("section", "ld-kartu"), h = el("h2"); h.append(ikon(ik), judul); k.append(h, ...isi); return k; };
const pil = (t, kelas, title) => { const p = el("span", `ld-pil${kelas ? " " + kelas : ""}`, t); if (title) p.title = title; return p; };
const tombol = (teks, ik, kelas, aksi) => { const b = el("button", `ld-tb${kelas ? " " + kelas : ""}`); b.type = "button"; if (ik) b.append(ikon(ik)); b.append(teks); if (aksi) b.addEventListener("click", aksi); return b; };
function toast(t) { const x = $("toast"); x.textContent = t; x.hidden = false; clearTimeout(toast.w); toast.w = setTimeout(() => { x.hidden = true; }, 6000); }

function gambarIsi() {
  const w = $("isi"), jenis = JENIS.find(j => j[0] === S.tab);
  $("bTambah").hidden = !jenis || !terbuka();
  if (jenis) $("bTambah").lastChild.textContent = `Tambah ${jenis[1].toLowerCase()}`;
  if (S.tab === "ringkasan") return void w.replaceChildren(isiRingkasan());
  if (S.tab === "penanganan") return void w.replaceChildren(...isiPenanganan());
  w.replaceChildren(...isiJenis(jenis[0]));
}

function isiRingkasan() {
  const tb = el("table", "ld-tabel"), th = el("thead"), tr = el("tr"); tr.append(el("th", null, "Bagian"), el("th", null, "Jumlah")); th.append(tr); tb.append(th);
  const bd = el("tbody");
  for (const [grup, ms] of RINGKAS) {
    const g = el("tr", "ld-grup"), td = el("td", null, grup); td.colSpan = 2; g.append(td); bd.append(g);
    for (const m of ms) { const r = el("tr"), v = S.rekap[m]; r.append(el("td", null, namaMetrik(m)), el("td", v == null ? "belum" : "", teksRekap(v, m))); bd.append(r); }
  }
  tb.append(bd);
  const gulung = el("div", "ld-tabel-gulung"); gulung.append(tb);
  const cacah = el("dl", "ld-cacah");
  for (const [j, n] of JENIS) cacah.append(el("dt", null, n), el("dd", aktif(j).length ? "" : "belum", aktif(j).length ? F(aktif(j).length) : "belum didata"));
  const k = el("div", "ld-kisi"); k.append(kartu("Ringkasan berkas", "d-ringkas", gulung), kartu("Data yang sudah dicatat", "d-daftar", cacah)); return k;
}

function blokNihil(jenis) {
  const ms = METRIK_TAB[jenis]; if (!ms) return null;
  const d = el("details", "ld-nihil"); d.open = jenis !== "prasarana";
  const s = el("summary"); s.append(ikon("d-nihil"), "Tandai bagian yang memang tidak ada"); d.append(s);
  d.append(el("p", "ld-kecil", "Kosong berarti belum didata, bukan nol. Tandai tidak ada hanya bila sudah dicek dan memang tidak ada."));
  const tandai = new Set(S.b.isian?.nihil || []);
  for (const m of ms) {
    const v = S.rekap[m], r = el("div", "ld-nihil-baris"), t = el("span", null, namaMetrik(m)), n = el("b", v == null ? "belum" : "", teksRekap(v, m));
    r.append(t, n);
    if (terbuka() && (v == null || tandai.has(m))) {
      const b = tombol(tandai.has(m) ? "Cabut tanda" : "Tandai tidak ada", null, "kecil", async () => {
        b.disabled = true; const x = await api("nihil", {metrik: m, nihil: !tandai.has(m)}); b.disabled = false;
        if (x.s !== 200) return toast(galatTeks(x));
        await muatBerkas();
      });
      r.append(b);
    }
    d.append(r);
  }
  return d;
}

function isiJenis(jenis) {
  const hasil = [], nih = blokNihil(jenis); if (nih) hasil.push(nih);
  for (const x of S.antre.filter(a => a.data.jenis === jenis)) hasil.push(kartuAntre(x));
  const daftar = aktif(jenis);
  if (!daftar.length && !S.antre.some(a => a.data.jenis === jenis)) hasil.push(el("p", "ld-kosong", `Belum ada data ${NAMA_JENIS[jenis].toLowerCase()}.${terbuka() ? " Ketuk tombol Tambah di bawah." : ""}`));
  const batas = S.batas[jenis] ?? 50;   // 50 kartu dulu; sisanya lewat Muat lagi supaya tab berisi ratusan objek tidak membekukan layar
  for (const o of daftar.slice(0, batas)) hasil.push(kartuObjek(o));
  if (daftar.length > batas) hasil.push(tombol(`Muat lagi, sisa ${F(daftar.length - batas)}`, "d-daftar", "", () => { S.batas[jenis] = batas + 50; gambarIsi(); }));
  return hasil;
}

function kartuAntre(x) {
  const d = x.data, r = ringkasObjek({jenis: d.jenis, urut: "baru", data: d.isian, pribadi: d.isian}), k = el("article", "ld-objek antre");
  const kep = el("div", "ld-objek-kep"), t = el("div"); t.append(el("b", null, r.judul), el("small", null, r.sub)); kep.append(t);
  const ps = el("div", "ld-pils"); ps.append(pil(x.status === "ditolak" ? "Ditolak" : x.status === "berubah" ? "Perlu dicek" : "Belum terkirim", "peringatan", x.alasan || undefined), ...r.pil.map(p => pil(p)));
  const aksi = el("div", "ld-aksi");
  if (x.status === "menunggu" && navigator.onLine !== false) aksi.append(tombol("Kirim sekarang", "d-kirim", "", () => saluran.umum.kirimSekarang().then(() => saluran.rahasia.kirimSekarang())));
  aksi.append(tombol("Hapus dari antrean", "d-tutup", "lemah", async () => { if (confirm("Hapus isian yang belum terkirim ini?")) await (x.saluran === "lanjut-rahasia" ? saluran.rahasia : saluran.umum).buang(x.klien_id); }));
  k.append(kep, ps, ...(x.status !== "menunggu" && x.alasan ? [el("p", "ld-galat", x.alasan)] : []), aksi); return k;
}

function kartuObjek(o) {
  const r = ringkasObjek(o), k = el("article", "ld-objek"); k.id = `o-${o.id}`;
  const kep = el("div", "ld-objek-kep"), t = el("div"); t.append(el("b", null, r.judul), ...(r.sub ? [el("small", null, r.sub)] : [])); kep.append(t);
  const ps = el("div", "ld-pils"); ps.append(...r.pil.map(p => pil(p)), ...(o.penanda || []).map(p => pil(PENANDA[p]?.[0] ?? p, "peringatan", PENANDA[p]?.[1])));
  const kf = o.kurang_foto; if (kf?.foto) ps.append(pil(`Foto kurang ${kf.foto}`, "peringatan", "Jumlah foto kamera yang diminta untuk jenis data ini belum terpenuhi.")); if (kf?.wajah) ps.append(pil("Foto wajah belum ada", "peringatan"));
  const foto = el("div", "ld-foto");
  for (const m of o.media || []) { const im = el("img"); im.loading = "lazy"; im.alt = m.jenis === "wajah" ? "Foto wajah" : "Foto objek"; im.src = `/api/lapor/data/media?id=${m.id}`; im.width = 72; im.height = 72; foto.append(im); }
  const video = el("div"); video.dataset.slot = "video"; video.hidden = true;   // LJ-18: pemutar dan unggah video bersambung dipasang di sini
  const aksi = el("div", "ld-aksi");
  if (terbuka()) {
    aksi.append(tombol("Ubah", "d-ubah", "", () => bukaForm(o.jenis, o)));
    if (FOTO_MINTA[o.jenis] > 0) aksi.append(tombol("Tambah foto", "d-kamera", "", () => tambahFoto(o, "foto")));
    if (kf?.wajah) aksi.append(tombol("Foto wajah", "d-kamera", "", () => tambahFoto(o, "wajah")));
    aksi.append(tombol("Batalkan", "d-tutup", "lemah", () => batalkan(o)));
  }
  k.append(kep, ps, ...(foto.childElementCount ? [foto] : []), video, aksi); return k;
}

async function batalkan(o) {
  const {d, b} = dialog(`Batalkan ${ringkasObjek(o).judul}`), alasan = el("textarea"), g = el("p", "ld-galat"); g.setAttribute("role", "alert");
  alasan.maxLength = 300; alasan.rows = 3; alasan.placeholder = "Tulis alasan pembatalan, 5 sampai 300 huruf. Jangan tulis nomor HP atau NIK."; alasan.setAttribute("aria-label", "Alasan pembatalan");
  const ok = tombol("Batalkan data ini", "d-tutup", "bahaya", async () => {
    ok.disabled = true; const r = await api("batal", {objek: o.id, rev: o.rev, alasan: alasan.value}); ok.disabled = false;
    if (r.s !== 200) { g.textContent = galatTeks(r); return; }
    d.close(); await muatBerkas();
  });
  b.append(el("p", null, "Data yang dibatalkan tidak ikut dihitung di rekap. Riwayatnya tetap tercatat."), alasan, g, ok);
}

/* ---------- foto kamera ---------- */
function posisi() {
  return new Promise(ok => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok({lat: Number(p.coords.latitude.toFixed(6)), lon: Number(p.coords.longitude.toFixed(6)), akurasi: Math.round(p.coords.accuracy), waktu: Date.now()}), () => ok(null),
    {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000}) : ok(null));
}
async function kecilkan(file) {
  const bmp = await createImageBitmap(file, {imageOrientation: "from-image"}), r = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return c.toDataURL("image/jpeg", 0.8);
}
/* kamera belakang langsung; titik GPS diambil saat foto agar lencana titik di server sah (maks 10 menit) */
function ambilFoto(jenisFoto) {
  return new Promise(ok => {
    const i = el("input"); i.type = "file"; i.accept = "image/*"; i.capture = "environment";
    i.addEventListener("change", async () => { const f = i.files?.[0]; if (!f) return ok(null); toast("Memproses foto..."); try { const [data, gps] = await Promise.all([kecilkan(f), jenisFoto === "wajah" ? null : posisi()]); ok({data, gps, jenis: jenisFoto}); } catch { ok(null); } });
    i.addEventListener("cancel", () => ok(null)); i.click();
  });
}
async function tambahFoto(o, jenisFoto) {
  const f = await ambilFoto(jenisFoto); if (!f) return;
  toast("Mengirim foto...");
  const r = await api("foto", {objek: o.id, data: f.data, gps: f.gps, jenis: f.jenis});
  if (r.s !== 201) return toast(galatTeks(r));
  toast("Foto tersimpan."); await muatBerkas();
}

/* ---------- dialog bersama ---------- */
function dialog(judul) {
  const d = el("dialog", "ld-dlg"), kep = el("header", "ld-dlg-kep"), h = el("h2", null, judul), x = el("button", "ld-ikon"), b = el("div", "ld-dlg-isi");
  x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ikon("d-tutup")); x.addEventListener("click", () => d.close()); kep.append(h, x); d.append(kep, b);
  d.setAttribute("aria-label", judul); d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal(); return {d, b};
}

/* ---------- form objek ---------- */
const bidang = (label, wajib, ...isi) => { const r = el("div", "ld-bidang"), l = el("label", null, label); if (wajib) l.append(el("i", null, " wajib")); r.append(l, ...isi); return r; };
function deretPilihan(f, nilai, ubah) {   // satu pilihan ujung ke ujung, terbagi rata; ketuk lagi untuk mengosongkan
  const [n, , tp] = f, w = el("div", "ld-deret"), banyak = tp.t === "banyak", opsi = tp.t === "ya_tidak" ? [[true, "Ya"], [false, "Tidak"]] : tp.v.map(v => [v, tp.l[v]]);
  w.setAttribute("role", banyak ? "group" : "radiogroup");
  const gambar = () => { for (const b of w.children) b.setAttribute("aria-pressed", String(banyak ? (nilai[n] || []).includes(b.dataset.v) : nilai[n] === opsi[b.dataset.i][0])); };
  opsi.forEach(([v, l], i) => { const b = el("button", "ld-pilih", l); b.type = "button"; b.dataset.i = i; b.dataset.v = String(v);
    b.addEventListener("click", () => { if (banyak) { const a = new Set(nilai[n] || []); a.has(v) ? a.delete(v) : a.add(v); nilai[n] = [...a]; } else nilai[n] = nilai[n] === v ? undefined : v; gambar(); ubah(); }); w.append(b); });
  gambar(); return {el: w, segar: gambar};
}
function pilihan(f, daftar, nilai, ubah, kosongTeks) {   // <select> untuk daftar panjang, tempat pengungsian, dan kepala keluarga
  const s = el("select"); s.setAttribute("aria-label", f[1]);
  const isi = () => { const sekarang = nilai[f[0]]; s.replaceChildren(Object.assign(el("option", null, kosongTeks), {value: ""}), ...daftar().map(([v, l]) => Object.assign(el("option", null, l), {value: v}))); s.value = sekarang ?? ""; if (s.value !== (sekarang ?? "")) { nilai[f[0]] = undefined; } };
  s.addEventListener("change", () => { nilai[f[0]] = s.value || undefined; ubah(); }); isi(); return {el: s, segar: isi};
}
function bangunBidang(jenis, f, nilai, ubah) {
  const [n, label, tp] = f; let w;
  if (tp.t === "pilih" && tp.v.length > 6) w = pilihan(f, () => tp.v.map(v => [v, tp.l[v]]), nilai, ubah, "Pilih");
  else if (tp.t === "pilih" || tp.t === "banyak" || tp.t === "ya_tidak") w = deretPilihan(f, nilai, ubah);
  else if (tp.t === "tp") { w = pilihan(f, () => titikBerkas().map(o => [o.titik_id, o.data.nama]), nilai, ubah, jenis === "jiwa" ? "Pilih tempat pengungsian" : "Tidak untuk tempat tertentu"); }
  else if (tp.t === "kk") w = pilihan(f, () => [["diri", "Dia sendiri kepala keluarga"], ...aktif("jiwa").filter(o => o.data.kk === "diri" && o.data.titik === nilai.titik).map(o => [o.id, `Keluarga ${o.pribadi?.nama || "tanpa nama"}`])], nilai, ubah, "Pilih");
  else if (tp.t === "hp") {
    const i = el("input"), c = el("label", "ld-cek"), cb = el("input"); i.type = "tel"; i.inputMode = "tel"; i.autocomplete = "off"; i.placeholder = "08..."; cb.type = "checkbox"; c.append(cb, " Tidak punya nomor");
    const muat = () => { const v = nilai[n]; cb.checked = v === "tidak_ada"; i.disabled = cb.checked; i.value = v && v !== "tidak_ada" ? v : ""; };
    i.addEventListener("input", () => { nilai[n] = i.value; }); cb.addEventListener("change", () => { nilai[n] = cb.checked ? "tidak_ada" : undefined; muat(); }); muat();
    const k = el("div", "ld-kolom"); k.append(i, c); w = {el: k, segar: muat};
  } else {
    const i = el(tp.panjang ? "textarea" : "input"); i.autocomplete = "off";
    if (tp.t === "angka") i.inputMode = tp.desimal ? "decimal" : "numeric"; else if (tp.t === "tanggal") i.type = "date"; else if (tp.t === "nik") { i.inputMode = "numeric"; i.maxLength = 20; i.placeholder = "16 angka"; }
    if (tp.panjang) i.rows = 2; i.value = nilai[n] ?? ""; i.setAttribute("aria-label", label); i.addEventListener("input", () => { nilai[n] = i.value; }); i.addEventListener("change", ubah); w = {el: i, segar: () => {}};
  }
  const r = bidang(label, false, w.el); r.dataset.n = n; return {r, segar: w.segar};
}

function bukaForm(jenis, lama = null) {
  const nilai = lama ? nilaiDariObjek(lama) : {}, titik = {lat: lama?.lat ?? null, lon: lama?.lon ?? null}, fotos = [];
  if (!lama) { if (jenis === "jiwa") nilai.masuk = hariIni(); if (jenis === "titik") nilai.tgl_buka = hariIni(); }
  const {d, b} = dialog(`${lama ? "Ubah" : "Tambah"} ${NAMA_JENIS[jenis].toLowerCase()}`);
  const wajib = el("div", "ld-form-blok"), tambah = el("details", "ld-tambahan"), tambahIsi = el("div", "ld-form-blok"), g = el("p", "ld-galat"), status = el("p", "ld-kecil");
  g.setAttribute("role", "alert"); status.setAttribute("role", "status");
  const sm = el("summary", null, "Isian tambahan"); tambah.append(sm, tambahIsi);
  const baris = FORM[jenis].map(f => ({f, ...bangunBidang(jenis, f, nilai, () => { formKotor = true; susun(f[0]); })}));
  d.addEventListener("input", () => { formKotor = true; }); d.addEventListener("close", () => { formKotor = false; });
  /* dari = butir yang baru berubah: hanya baris yang wajibnya bergantung (fungsi) dan kepala keluarga (bergantung titik) dihitung ulang; tanpa dari = semua (buka form) */
  const susun = dari => { for (const {f, r, segar} of baris) { if (dari && typeof f[3] !== "function" && !(f[0] === "kk" && dari === "titik")) continue; if (!dari || f[0] === "kk") segar(); const w = wajibIni(f, nilai); r.querySelector("label i")?.remove(); if (w) r.querySelector("label").append(el("i", null, " wajib")); (w ? wajib : tambahIsi).append(r); }
    tambah.hidden = !tambahIsi.childElementCount; wajahBox.hidden = !wajahTampil(jenis, nilai) || !!lama; };
  b.append(wajib, tambah);
  if (!TANPA_LOKASI.has(jenis)) {   // lokasi objek: GPS peramban; foto yang diambil di tempat juga memberi titik
    const ket = el("small", null, titik.lat != null ? "Titik sudah ada." : "Belum ada titik. Foto yang diambil di tempatnya juga memberi titik."), tb = tombol("Ambil lokasi saya", "d-lokasi", "", async () => {
      ket.textContent = "Mengambil lokasi..."; const p = await posisi(); if (!p) { ket.textContent = "Lokasi belum terbaca. Nyalakan GPS dan izin lokasi, lalu coba lagi."; return; }
      titik.lat = p.lat; titik.lon = p.lon; ket.textContent = `Titik tercatat, ketelitian sekitar ${F(p.akurasi)} m.`; });
    const bl = bidang("Titik lokasi", false, tb, ket); b.insertBefore(bl, tambah);
  }
  const wajahBox = el("div"); wajahBox.hidden = true;
  if (!lama) {   // foto dikirim bersama objek (juga lewat antrean luring); objek yang sudah ada memakai tombol Tambah foto di kartunya
    const daftarFoto = el("div", "ld-foto"), tb = tombol("Ambil foto", "d-kamera", "", async () => { const f = await ambilFoto("foto"); if (f) { fotos.push(f); gambarFoto(); } });
    const tw = tombol("Ambil foto wajah", "d-kamera", "", async () => { const f = await ambilFoto("wajah"); if (f) { fotos.push(f); gambarFoto(); } });
    const gambarFoto = () => daftarFoto.replaceChildren(...fotos.map((f, i) => { const w = el("figure"), im = el("img"), x = tombol("Hapus", null, "kecil lemah", () => { fotos.splice(i, 1); gambarFoto(); }); im.src = f.data; im.alt = f.jenis === "wajah" ? "Foto wajah" : "Foto objek"; w.append(im, el("figcaption", null, f.jenis === "wajah" ? "Wajah" : f.gps ? "Dengan titik" : "Tanpa titik"), x); return w; }));
    if (FOTO_MINTA[jenis]) b.insertBefore(bidang(`Foto kamera, diminta ${FOTO_MINTA[jenis]}`, false, tb, daftarFoto), tambah);
    wajahBox.append(bidang("Foto wajah, bila bersedia", false, tw)); b.insertBefore(wajahBox, tambah);
  }
  const kirimBtn = tombol("Simpan", "d-centang", "utama", () => simpan());
  b.append(g, status, kirimBtn); susun();
  let paksa = false, tp = undefined;
  async function simpan() {
    g.textContent = ""; kirimBtn.disabled = true; status.textContent = "Menyimpan...";
    const isian = bangunIsian(jenis, nilai); if (tp) isian.tp = tp;
    try {
      if (lama) {
        const r = await api("objek", {id: lama.id, rev: lama.rev, isian, ...(titik.lat != null && {lat: titik.lat, lon: titik.lon})});
        if (r.s === 200) { d.close(); toast("Perubahan tersimpan."); return void await muatBerkas(); }
        return gagal(r);
      }
      const butir = {jenis, isian, lat: titik.lat ?? undefined, lon: titik.lon ?? undefined, fotos: fotos.map(f => ({data: f.data, gps: f.gps, jenis: f.jenis})), ...(paksa && {paksa: true})}, klien = acakId();
      const r = await kirimButir({...butir, klien_id: klien});
      if (r.s === 200) { d.close(); toast("Data tersimpan."); return void await muatBerkas(); }
      if (layakAntre(r.s)) {
        siapkanAntre(); if (!saluran.umum) return gagal(r);
        await (saluranJenis(jenis) === "rahasia" ? saluran.rahasia : saluran.umum).masukkan({klien_id: klien, data: butir});
        d.close(); toast(punyaPribadi(jenis) ? "Tidak ada sinyal. Isian disimpan sementara dan terkirim otomatis saat sinyal kembali. Karena berisi data pribadi, jangan tutup halaman ini." : "Tidak ada sinyal. Isian disimpan di HP dan terkirim otomatis saat sinyal kembali.");
        return void await segarAntre();
      }
      gagal(r);
    } finally { kirimBtn.disabled = false; status.textContent = ""; }
  }
  function gagal(r) {
    g.replaceChildren(el("span", null, galatTeks(r)));
    const nama = r.j.isian; if (Array.isArray(nama) && nama.length) { g.append(el("span", null, ` Periksa: ${nama.map(x => labelButir(jenis, x)).join(", ")}.`));
      for (const x of baris) x.r.classList.toggle("salah", nama.includes(x.f[0])); b.querySelector(".ld-bidang.salah")?.scrollIntoView({block: "center"}); }
    if (r.s === 409 && Array.isArray(r.j.dekat)) {   // titik pengungsian baru dekat tempat yang sudah ada: tautkan atau paksa
      const w = el("div", "ld-aksi"); for (const x of r.j.dekat) w.append(tombol(`Tautkan ke ${x.nama} (${F(x.jarak_m)} m)`, null, "", () => { tp = x.id; simpan(); }));
      w.append(tombol("Ini tempat yang berbeda, simpan", null, "lemah", () => { paksa = true; simpan(); })); g.append(w);
    }
  }
}

/* ---------- tab penanganan: isian berkas, tim, penutupan ---------- */
function isiPenanganan() {
  const i = S.b.isian || {}, titikNama = id => titikBerkas().find(o => o.titik_id === id)?.data.nama ?? id;
  const dl = el("dl", "ld-dl"), baris = (t, v) => dl.append(el("dt", null, t), el("dd", v == null || v === "" ? "belum" : "", v == null || v === "" ? "belum didata" : String(v)));
  baris("Status darurat", STATUS_DARURAT.find(x => x[0] === i.status_darurat)?.[1]); baris("Nomor SK", i.sk_nomor); baris("Tanggal SK", tglIndo(i.sk_tanggal));
  baris("Posko", i.posko?.nama); baris("Tempat pengungsian posko", i.posko?.titik && titikNama(i.posko.titik)); baris("Nomor posko", i.posko?.nomor); baris("Upaya penanganan", i.upaya); baris("Personel", i.personel != null ? `${F(i.personel)} orang` : null);
  const k1 = kartu("Data penanganan", "d-berkas", dl);
  if (ketua() && terbuka()) k1.append(tombol("Ubah data penanganan", "d-ubah", "", formIsian));
  const k2 = kartu("Tim pendataan", "d-orang", daftarTim()), k3 = kartu("Penutupan berkas", "d-centang", ...isiTutup());
  return [k1, k2, k3];
}
function formIsian() {
  const i = S.b.isian || {}, {d, b} = dialog("Data penanganan"), g = el("p", "ld-galat"); g.setAttribute("role", "alert");
  const nilai = {status_darurat: i.status_darurat, sk_nomor: i.sk_nomor, sk_tanggal: i.sk_tanggal, nama: i.posko?.nama, titik: i.posko?.titik, nomorp: i.posko?.nomor, upaya: i.upaya, personel: i.personel};
  const teks = (k, label, o = {}) => { const x = el(o.panjang ? "textarea" : "input"); if (o.panjang) x.rows = 3; else x.type = o.tipe || "text"; if (o.mode) x.inputMode = o.mode; x.value = nilai[k] ?? ""; x.maxLength = o.maks || 120; x.autocomplete = "off";
    x.addEventListener("input", () => { nilai[k] = x.value; }); return bidang(label, false, x); };
  const status = deretPilihan(["status_darurat", "Status darurat", {t: "pilih", v: STATUS_DARURAT.map(x => x[0]), l: Object.fromEntries(STATUS_DARURAT)}], nilai, () => {});
  const titik = pilihan(["titik", "Tempat pengungsian posko"], () => titikBerkas().map(o => [o.titik_id, o.data.nama]), nilai, () => {}, "Bukan di tempat pengungsian tercatat");
  b.append(bidang("Status darurat", false, status.el), teks("sk_nomor", "Nomor SK", {maks: 60}), teks("sk_tanggal", "Tanggal SK", {tipe: "date"}), teks("nama", "Nama posko"), bidang("Posko di tempat pengungsian", false, titik.el),
    teks("nomorp", "Nomor telepon posko", {tipe: "tel", mode: "tel", maks: 20}), teks("upaya", "Upaya penanganan", {panjang: true, maks: 500}), teks("personel", "Jumlah personel", {mode: "numeric", maks: 6}), g);
  const kosong = v => v == null || String(v).trim() === "", pat = {};
  const ok = tombol("Simpan", "d-centang", "utama", async () => {
    const ada = (k, v) => { if (!kosong(v)) pat[k] = typeof v === "string" ? v.trim() : v; else if (i[k] != null) pat[k] = null; };
    for (const k of ["status_darurat", "sk_nomor", "sk_tanggal", "upaya"]) ada(k, nilai[k]);
    if (!kosong(nilai.personel)) { const n = Number(nilai.personel); pat.personel = Number.isFinite(n) ? n : nilai.personel; } else if (i.personel != null) pat.personel = null;
    const p = {}; for (const [k, v] of [["nama", nilai.nama], ["titik", nilai.titik], ["nomor", nilai.nomorp]]) { if (!kosong(v)) p[k] = String(v).trim(); else if (i.posko?.[k] != null) p[k] = null; }
    if (Object.keys(p).length) pat.posko = p;
    if (!Object.keys(pat).length) { g.textContent = "Tidak ada yang diubah."; return; }
    ok.disabled = true; const r = await api("isian", {isian: pat}); ok.disabled = false;
    if (r.s !== 200) { g.textContent = galatTeks(r) + (r.j.isian ? ` Periksa: ${r.j.isian.join(", ")}.` : ""); return; }
    d.close(); toast("Data penanganan tersimpan."); await muatBerkas();
  });
  b.append(ok);
}
function daftarTim() {
  const w = el("div"), ul = el("ul", "ld-tim");
  for (const x of S.tim.filter(t => t.aktif)) {
    const li = el("li"), t = el("div"); t.append(el("b", null, x.nama ?? "belum bernama"), el("small", null, `${x.wa}${x.peran === "ketua" ? ", ketua" : ""}`)); li.append(t);
    if (ketua() && terbuka() && x.peran !== "ketua") { const a = el("div", "ld-aksi");
      a.append(tombol("Tautan baru", "d-kirim", "kecil", () => aksiTim({aksi: "token_baru", wa: x.wa})), tombol("Cabut", "d-tutup", "kecil lemah", () => { if (confirm(`Cabut ${x.nama ?? x.wa} dari tim? Tautannya langsung tidak berlaku. Data yang sudah diisinya tetap ada.`)) aksiTim({aksi: "cabut", wa: x.wa}); })); li.append(a); }
    ul.append(li);
  }
  w.append(ul);
  if (ketua() && terbuka()) {
    const f = el("form", "ld-tim-tambah"), wa = el("input"), nama = el("input"); wa.type = "tel"; wa.inputMode = "tel"; wa.placeholder = "Nomor HP, 08..."; wa.autocomplete = "off"; wa.setAttribute("aria-label", "Nomor HP anggota baru");
    nama.type = "text"; nama.placeholder = "Nama (boleh dikosongkan)"; nama.maxLength = 120; nama.autocomplete = "off"; nama.setAttribute("aria-label", "Nama anggota baru");
    const b = tombol("Tambah anggota", "d-tambah", "utama"); b.type = "submit";
    f.addEventListener("submit", e => { e.preventDefault(); aksiTim({aksi: "tambah", wa: wa.value, nama: nama.value || undefined}, () => f.reset()); });
    f.append(wa, nama, b); w.append(f, el("p", "ld-kecil", "Nomor itu menerima tautan pribadi lewat WhatsApp. Paling banyak 20 anggota aktif."));
  } else w.append(el("p", "ld-kecil", ketua() ? "" : "Hanya ketua tim yang bisa menambah atau mencabut anggota."));
  return w;
}
async function aksiTim(badan, selesai) {
  const r = await api("tim", badan);
  if (r.s !== 200) return toast(galatTeks(r));
  S.tim = r.j.tim || S.tim; toast(r.j.pesan || "Tim diperbarui."); selesai?.(); gambarIsi();
}
function isiTutup() {
  if (!terbuka()) return [el("p", null, STATUS_BERKAS[S.b.status] ?? S.b.status)];
  if (!ketua()) return [el("p", "ld-kecil", "Hanya ketua tim yang bisa mengusulkan penutupan berkas.")];
  const tgl = el("input"), skn = el("input"), skt = el("input"), g = el("p", "ld-galat"), hasil = el("div"); g.setAttribute("role", "alert");
  tgl.type = "date"; tgl.value = hariIni(); tgl.max = hariIni(); skn.type = "text"; skn.maxLength = 80; skn.autocomplete = "off"; skt.type = "date"; skt.max = hariIni();
  const badan = konf => ({tgl_selesai: tgl.value, sk_nomor: skn.value || undefined, sk_tanggal: skt.value || undefined, konfirmasi: konf});
  const lihat = tombol("Lihat kondisi akhir", "d-ringkas", "", async () => {
    g.textContent = ""; hasil.replaceChildren(); lihat.disabled = true; const r = await api("tutup", badan(false)); lihat.disabled = false;
    if (r.s !== 200) { g.textContent = galatTeks(r) + (r.j.isian ? ` Periksa: ${r.j.isian.join(", ")}.` : ""); return; }
    const k = kondisiBaris(r.j.kondisi), ul = el("ul", "ld-kondisi");
    for (const t of k.baris) ul.append(el("li", null, t));
    if (k.belum.length) ul.append(el("li", "belum", `Belum didata: ${k.belum.join(", ")}.`));
    const ya = tombol("Usulkan penutupan", "d-centang", "utama", async () => {
      ya.disabled = true; const x = await api("tutup", badan(true)); ya.disabled = false;
      if (x.s !== 200) { g.textContent = galatTeks(x); return; }
      toast("Penutupan diusulkan. Menunggu diterima Pusdalops BNPB."); await muatBerkas();
    });
    hasil.replaceChildren(pil(k.status, k.status === "Selesai" ? "baik" : "peringatan"), ul, el("p", "ld-kecil", "Sesudah diusulkan, berkas terkunci sampai Pusdalops BNPB menerima atau membukanya lagi."), ya);
  });
  return [el("p", "ld-kecil", "Kondisi akhir dihitung dari data yang sudah dicatat. Bila masih ada korban hilang, pengungsi, atau prasarana putus, statusnya selesai dengan catatan."),
    bidang("Tanggal selesai", true, tgl), bidang("Nomor SK pencabutan status atau transisi, bila ada", false, skn), bidang("Tanggal SK", false, skt), lihat, g, hasil];
}

/* ---------- peta titik objek, dimuat saat pertama dibuka ---------- */
let peta = null, penanda = [], petaDimuat = null, tandaPeta = "";
const WARNA_TITIK = Object.fromEntries(JENIS.map(([j]) => [j, `ld-t-${j}`]));
function muatMapLibre() {
  petaDimuat ||= new Promise(ok => {
    const c = el("link"); c.rel = "stylesheet"; c.href = "/vendor/maplibre/maplibre-gl.css"; document.head.append(c);
    const s = el("script"); s.src = "/vendor/maplibre/maplibre-gl.js"; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.append(s);
  });
  return petaDimuat;
}
async function segarPeta() {
  const d = $("petaLipat"); if (!d.open || !S.b) return;
  if (!await muatMapLibre()) { $("peta").textContent = "Peta tidak bisa dimuat."; return; }
  const titik = S.objek.filter(o => o.status === "aktif" && o.lat != null && o.lon != null);
  $("petaKet").textContent = titik.length ? `${F(titik.length)} titik tercatat.` : "Belum ada titik tercatat. Titik datang dari lokasi saat mengisi atau dari foto.";
  if (!peta) { try { peta = new maplibregl.Map({container: "peta", style: "https://tiles.openfreemap.org/styles/positron", center: [118, -2.5], zoom: 4, attributionControl: {compact: true}}); } catch { $("peta").textContent = "Peta tidak bisa dimuat di perangkat ini."; return; } }
  const tanda = titik.map(o => `${o.id}:${o.lat}:${o.lon}:${o.jenis}`).join("|");
  if (tanda === tandaPeta) return peta.resize();   // titik sama: marker dan batas tidak dibangun ulang
  tandaPeta = tanda;
  for (const m of penanda) m.remove(); penanda = [];
  for (const o of titik) {
    const e = el("button", `ld-titik ${WARNA_TITIK[o.jenis]}`); e.type = "button"; e.title = ringkasObjek(o).judul; e.setAttribute("aria-label", `${NAMA_JENIS[o.jenis]}: ${ringkasObjek(o).judul}`);
    e.addEventListener("click", () => { bukaTab(o.jenis); setTimeout(() => document.getElementById(`o-${o.id}`)?.scrollIntoView({block: "center"}), 200); });
    penanda.push(new maplibregl.Marker({element: e}).setLngLat([o.lon, o.lat]).addTo(peta));
  }
  peta.resize(); if (titik.length) { const b = new maplibregl.LngLatBounds(); for (const o of titik) b.extend([o.lon, o.lat]); peta.fitBounds(b, {padding: 48, maxZoom: 15, duration: 0}); }
}
$("petaLipat").addEventListener("toggle", () => nanti(segarPeta));

/* ---------- mulai ---------- */
$("bTambah").addEventListener("click", () => { const j = JENIS.find(x => x[0] === S.tab); if (j) { siapkanAntre(); bukaForm(j[0]); } });
(async function mulai() {
  const u = new URL(location.href), t = u.searchParams.get("t"); let galatMasuk = null;
  if (t) { history.replaceState(null, "", location.pathname); const r = await api("masuk", {t}); if (r.s !== 200) galatMasuk = galatTeks(r); }   // token tidak boleh tinggal di alamat
  siapkanAntre();
  const r = await muatBerkas();
  if (r.s !== 200) { $("pintuIsi").textContent = galatMasuk || (r.s === 401 ? "Buka tautan dari pesan WhatsApp Anda. Tautan itu khusus untuk satu orang dan sekali pakai." : galatTeks(r)); }
})();
