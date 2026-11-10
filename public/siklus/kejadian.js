/* Siklus Bencana F1: daftar Buku Besar (DS 3.2), detail linimasa satu halaman (DS 3.3), antrean ambigu dan tanpa wilayah.
   Rute: /api/siklus/kejadian, /kejadian/arsip, /kejadian/:id, /antrean (src/siklus_kejadian.js). Server menegakkan peran; tombol hanya disembunyikan untuk peran yang pasti ditolak.
   Angka sumber (DIBI, Logbook, sistem kita) berdampingan dengan selisih tertulis; tidak ada kolom total. Chrome urgent, isi berat lewat nanti() (kontrol bersama di inti.js). */
import {h, ik, K, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, pilihan, tombol, tanya, toast, fase, pil, nilai, tip, namaJenis, namaProv, namaKab, namaSumber, namaMetrik,
  wilayah, angka, tgl, wib, tglWib, geser, peran, penjaga, selisihAntarsumber} from "./inti.js";
import {FASE, RE_KJ, faseSah} from "./hitung.js";

const G = globalThis, HALAMAN = 50, BATAS_MUAT = 100;
const KEL = () => (K.kelompok || [["semua", "Semua", "semua"]]).map(([v, t, i]) => [v, t, i]);
const jenisDalam = (jenis, kel) => kel === "semua" || String(jenis).split("+").some(j => (K.kelompok_jenis?.[kel] || []).includes(j));
const TEMPLAT = {usgs: id => `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(id)}`, glide: id => `https://glidenumber.net/glide/public/search/details.jsp?glide=${encodeURIComponent(id)}`, gdacs: id => `https://www.gdacs.org/report.aspx?eventid=${encodeURIComponent(id)}`};
const RE_PENGENAL = /^[A-Za-z0-9._-]{1,80}$/;

/* ---------- potongan tampilan bersama daftar dan detail ---------- */
const sel = (a, b) => { const s = selisihAntarsumber({a, b}); return s.selisih; };
function selWilayah(kab4) {
  return kab4 ? h("span", {}, wilayah(kab4)) : h("span", {}, "wilayah belum terpetakan ", pil("menunggu", {ditunggu: "pemetaan wilayah BPS"}));
}
/* tabel metrik x sumber, kolom terakhir Selisih; per = {label: {metrik: {n,y,t}}}; tanpa kolom total (KA 7) */
function tabelDampak(per) {
  const label = Object.keys(per), metrik = [...new Set(label.flatMap(l => Object.keys(per[l] || {})))].sort();
  if (!label.length || !metrik.length) return kead("kosong", {teks: "Belum ada laporan dampak dari sumber mana pun"});
  const kepala = h("tr", {}, h("th", {title: "Jenis dampak yang dilaporkan sumber"}, "Dampak"), label.map(l => h("th", {title: `Angka menurut ${l}, berdiri sendiri`}, l)), h("th", {title: "Selisih mutlak antara angka tertinggi dan terendah. Hanya ada bila dua sumber atau lebih melapor; tidak ada kolom total"}, "Selisih"));
  const baris = metrik.map(m => {
    const s = selisihAntarsumber(Object.fromEntries(label.map(l => [l, per[l]?.[m]?.n ?? null])));
    return h("tr", {}, h("td", {}, namaMetrik(m)), label.map(l => { const x = per[l]?.[m]; return h("td", {class: "t", "data-tip": x?.n != null ? tip(`${l}, ${namaMetrik(m)}`, ["Angka", angka(x.n)], ["Tahun atau waktu", x.t]) : null}, nilai(x?.n, x?.y, {sumber: l, waktu: x?.t})); }),
      h("td", {class: "t"}, s.selisih == null ? [h("span", {}, "tidak ada"), " ", pil("menunggu", {ditunggu: "laporan dari sumber kedua"})] : h("span", {class: "num", title: `${s.arah.maks} lebih tinggi dari ${s.arah.min}`}, angka(s.selisih))));
  });
  return h("div", {class: "tw kecil"}, h("table", {}, h("thead", {}, kepala), h("tbody", {}, baris)));
}
/* blok angka besar berdampingan untuk satu metrik, dengan baris selisih tertulis */
function blokBerdampingan(per, metrik) {
  const label = Object.keys(per).filter(l => per[l]?.[metrik]);
  if (!label.length) return null;
  const s = selisihAntarsumber(Object.fromEntries(label.map(l => [l, per[l][metrik].n ?? null])));
  const teks = label.map(l => `${l} ${angka(per[l][metrik].n) ?? "tidak ada"}`).join(", ") + (s.selisih == null ? ", selisih tidak ada karena hanya satu sumber melapor" : `, selisih ${angka(s.selisih)}`);
  return h("div", {class: "sk-ber"}, label.map(l => h("div", {}, h("small", {}, l), h("b", {}, angka(per[l][metrik].n) ?? "tidak ada"), pil(per[l][metrik].n == null ? "menunggu" : per[l][metrik].y, {sumber: l, waktu: per[l][metrik].t}))), h("div", {class: "sk-sel"}, teks));
}
/* dampak sumber D1 -> {label sumber: dampak}; dua baris dari satu nama sumber dibedakan oleh kode */
function perSumber(sumber) {
  const per = {};
  for (const s of sumber.filter(x => x.status === "terpasang")) {
    const dobel = sumber.filter(x => x.sumber === s.sumber && x.status === "terpasang").length > 1;
    per[namaSumber(s.sumber) + (dobel ? ` ${s.kode}` : "")] = s.dampak || {};
  }
  return per;
}
const ambilN = (per, nama, m) => { const k = Object.keys(per).find(x => x.startsWith(nama)); return k ? per[k]?.[m]?.n ?? null : null; };

/* ================================================================ daftar */
export async function buka(isi, sk) {
  const m = /^\/siklus\/kejadian\/(KJ-[^/]+)$/.exec(location.pathname.replace(/\/+$/, ""));
  if (m) return detail(isi, sk, m[1]);
  return daftar(isi, sk);
}

async function daftar(isi, sk) {
  const S = {kel: "semua", fase: [], prov: "", rentang: "30", cari: "", hal: 0, baris: [], berikut: null, tahun: String(new Date().getFullYear() - 1), arsip: null}, pj = penjaga();
  const P = await peran();
  sk.periode = () => { const sampai = tglWib(); return {dari: geser(sampai, -(S.rentang === "7" ? 7 : S.rentang === "365" ? 365 : 30)), sampai}; };
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"});
  const kart = kartu({ey: [ik("bolak", 12), "Kejadian"], judul: ["Buku Besar ", hl("menunggu"), " data"], isi: [ctl, hasil], id: "daftar"});
  const judul = kart.querySelector("h3");
  const setJudul = (n, a, arsip) => judul.replaceChildren(...(n == null ? ["Buku Besar ", hl("menunggu"), " data"] : n === 0 ? ["Belum ada ", hl("kejadian"), arsip ? " pada tahun dan provinsi ini" : " pada rentang ini"] : [hl(angka(n)), arsip ? " kejadian arsip pada tahun dan provinsi ini, " : " kejadian pada rentang ini, ", hl(angka(a)), " belum terpetakan wilayahnya"]));

  const optProv = [["", "Semua provinsi"], ...Object.keys(K.provinsi || {}).map(k => [k, namaProv(k)])];
  const optFase = [["", "Semua fase"], ...[...FASE, "dibatalkan"].map(f => [f, K.fase?.[f]?.[0] ?? f])];
  const optTahun = Array.from({length: new Date().getFullYear() - 2010}, (_, i) => String(new Date().getFullYear() - i)).map(t => [t, t]);
  const kontrol = () => {
    const cari = h("input", {type: "search", placeholder: "Cari ID, nama, atau wilayah", "aria-label": "Cari kejadian", value: S.cari});
    cari.addEventListener("input", () => G.nanti(() => { S.cari = cari.value.trim().toLowerCase(); S.hal = 0; gambar(); }));
    ctl.replaceChildren(
      seg(KEL(), S.kel, v => { S.kel = v; S.hal = 0; gambar(); }, "Kelompok bencana"),
      h("div", {class: "sk-baris"},
        S.rentang === "arsip" ? [pilihan(optTahun, S.tahun, v => { S.tahun = v; muat(); }, "Tahun arsip"), pilihan([["", "Pilih provinsi"], ...optProv.slice(1)], S.prov, v => { S.prov = v; muat(); }, "Provinsi arsip")]
          : [pilihan(optFase, S.fase[0] ?? "", v => { S.fase = v ? [v] : []; S.hal = 0; muat(); }, "Fase"), pilihan(optProv, S.prov, v => { S.prov = v; muat(); }, "Wilayah"), cari]),
      S.rentang === "arsip" ? h("div", {class: "sk-baris"}, cari) : "",
      seg([["7", "7 hari", "bolak"], ["30", "30 hari", "bolak"], ["365", "1 tahun", "bolak"], ["arsip", "Arsip", "bangunan"]], S.rentang, v => { S.rentang = v; S.hal = 0; S.baris = []; S.berikut = null; S.arsip = null; kontrol(); muat(); }, "Rentang waktu"));
  };

  const lolos = r => jenisDalam(r.jenis, S.kel) && (!S.fase.length || S.fase.includes(r.fase)) && (!S.cari || `${r.id} ${r.nama ?? ""} ${namaJenis(r.jenis)} ${wilayah(r.kab4) ?? ""}`.toLowerCase().includes(S.cari));
  function gambar() {   // isi berat: tabel per halaman 50 baris
    const semua = S.rentang === "arsip" ? (S.arsip ?? []) : S.baris, rows = semua.filter(lolos);
    if (S.rentang === "arsip" && !S.prov) { kosongkan(hasil).append(kead("kosong", {teks: "Pilih provinsi untuk membuka arsip kejadian pada tahun itu"})); setJudul(null); return; }
    setJudul(semua.length, semua.filter(r => !r.kab4).length, S.rentang === "arsip");
    if (!rows.length) { kosongkan(hasil).append(kead("kosong", {teks: "Belum ada kejadian pada rentang ini. Ubah rentang atau penyaring.", aksi: P.pd && S.rentang !== "arsip" ? {label: "Buat kejadian", fn: () => baru(muat)} : null})); return; }
    const hal = Math.min(S.hal, Math.ceil(rows.length / HALAMAN) - 1), potong = rows.slice(hal * HALAMAN, hal * HALAMAN + HALAMAN);
    kosongkan(hasil).append(S.rentang === "arsip" ? tabelArsip(potong) : tabelLive(potong), pager(rows.length, hal));
  }
  function pager(n, hal) {
    const total = Math.ceil(n / HALAMAN), lompat = i => { S.hal = i; gambar(); };
    return h("div", {class: "pgn"}, h("p", {}, `${angka(n)} kejadian, halaman ${angka(hal + 1)} dari ${angka(total)}`),
      h("div", {}, tombol("", "biasa", () => G.nanti(() => lompat(Math.max(0, hal - 1))), "kembali", "Halaman sebelumnya"), tombol("", "biasa", () => G.nanti(() => lompat(Math.min(total - 1, hal + 1))), "panah", "Halaman berikutnya"),
        S.berikut && S.rentang !== "arsip" && hal === total - 1 ? tombol("Muat 100 lagi", "biasa", () => muat(true)) : null));
  }
  const klikBaris = (tr, href) => tr.addEventListener("click", e => { if (e.target.closest("a,button")) return; tr.setAttribute("aria-current", "true"); G.nanti(() => { location.href = href; }); });
  function tabelLive(rows) {
    const t = h("tbody", {});
    for (const r of rows) {
      const href = `/siklus/kejadian/${r.id}`, tr = h("tr", {class: "klik", "data-tip": tip(r.id, ["Jenis", namaJenis(r.jenis)], ["Mulai", tgl(r.mulai)], ["Fase", K.fase?.[r.fase]?.[0]])},
        h("td", {}, h("a", {href}, r.id), r.dummy ? h("span", {class: "sk-contoh", title: "Baris dummy untuk contoh layar"}, "contoh") : null), h("td", {}, r.nama), h("td", {}, namaJenis(r.jenis)), h("td", {}, selWilayah(r.kab4)),
        h("td", {class: "t"}, tgl(r.mulai)), h("td", {class: "t"}, fase(r.fase)), h("td", {class: "t"}, r.publik ? "ya" : "belum"));
      klikBaris(tr, href); t.append(tr);
    }
    const th = (a, d) => h("th", {title: d}, a);
    return h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("KJ", "Nomor kejadian Buku Besar, tidak berubah sepanjang hidup kejadian"), th("Kejadian", "Nama kejadian"), th("Jenis", "Jenis bencana"), th("Wilayah", "Kabupaten atau kota menurut kode BPS"),
      th("Mulai", "Tanggal mulai kejadian, WIB"), th("Fase", "Fase hidup kejadian"), th("Publik", "Apakah ringkasan resmi sudah dibuka untuk umum"))), t));
  }
  function tabelArsip(rows) {
    const t = h("tbody", {});
    for (const r of rows) {
      const d = r.dampak || {}, per = {}; for (const [k, v] of Object.entries(d)) if (k !== "selisih" && v && typeof v === "object") per[namaSumber(k)] = v;
      const dibi = per[namaSumber("dibi")]?.meninggal, lb = per[namaSumber("logbook")]?.meninggal, s = sel(dibi?.n ?? null, lb?.n ?? null);
      const href = r.kab4 ? `/siklus/kejadian/${r.id}?tahun=${encodeURIComponent(S.tahun)}&kab4=${encodeURIComponent(r.kab4)}` : null;
      const tr = h("tr", {class: href ? "klik" : null},
        h("td", {}, href ? h("a", {href}, r.id) : r.id), h("td", {}, namaJenis(r.jenis)), h("td", {}, selWilayah(r.kab4), r.kab4 ? null : h("div", {}, h("small", {}, "belum bisa dipromosikan"))), h("td", {class: "t"}, tgl(r.mulai)),
        h("td", {class: "t"}, dibi ? nilai(dibi.n, dibi.y, {sumber: "DIBI", waktu: dibi.t}) : [h("span", {}, "belum ada laporan"), " ", pil("menunggu")]),
        h("td", {class: "t"}, lb ? nilai(lb.n, lb.y, {sumber: "Logbook Pusdalops", waktu: lb.t}) : [h("span", {}, "belum ada laporan"), " ", pil("menunggu")]),
        h("td", {class: "t"}, s == null ? "tidak ada" : h("span", {class: "num"}, angka(s))),
        h("td", {class: "t"}, P.pd && r.kab4 ? tombol("Promosikan", "biasa", () => promosikan(r), "tambah", "Jadikan kejadian hidup di Buku Besar") : null));
      if (href) klikBaris(tr, href); t.append(tr);
    }
    const th = (a, d) => h("th", {title: d}, a);
    return h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("KJ", "Nomor kejadian arsip"), th("Jenis", "Jenis bencana"), th("Wilayah", "Kabupaten atau kota menurut kode BPS"), th("Mulai", "Tanggal mulai, WIB"),
      th("Korban DIBI", "Korban meninggal menurut DIBI. Berdiri sendiri, tidak dijumlah dengan sumber lain"), th("Korban Logbook", "Korban meninggal menurut Logbook Pusdalops. Berdiri sendiri"), th("Selisih", "Selisih mutlak DIBI dan Logbook, hanya bila keduanya melapor"), th("Aksi", "Promosi menjadikan kejadian arsip sebagai kejadian hidup"))), t));
  }
  async function promosikan(r) {
    const x = await api(`/api/siklus/kejadian/${r.id}/promosi`, {metode: "POST", badan: {tahun: Number(S.tahun), kab4: r.kab4}});
    if (!x.ok) return toast(x.j?.galat || "Promosi gagal. Coba lagi.");
    toast(x.j?.sudah_ada ? "Kejadian sudah ada di Buku Besar" : "Kejadian dipromosikan"); G.nanti(() => { location.href = `/siklus/kejadian/${x.j.id}`; });
  }

  async function muat(tambah = false) {
    const n = pj.baru();
    if (!tambah) kosongkan(hasil).append(kead("memuat"));
    if (S.rentang === "arsip") {
      if (!S.prov) return gambar();
      const r = await api(`/api/siklus/kejadian/arsip?tahun=${encodeURIComponent(S.tahun)}&prov=${encodeURIComponent(S.prov)}`);
      if (!pj.terbaru(n)) return;
      if (!r.ok) { setJudul(null); return kosongkan(hasil).append(kead_dari(r, () => muat(), "Arsip tahun dan provinsi ini belum dibangun")); }
      const kolom = r.j?.kolom ?? [], ke = b => Object.fromEntries(kolom.map((k, i) => [k, b[i] ?? null]));
      S.arsip = [...(r.j?.baris ?? []).map(ke), ...(r.j?.tanpa_wilayah ?? []).map(ke).map(x => ({...x, kab4: null}))]; return gambar();
    }
    const p = sk.periode(), q = new URLSearchParams({dari: p.dari, sampai: p.sampai, batas: BATAS_MUAT});
    if (S.prov) q.set("prov", S.prov); if (S.fase.length === 1) q.set("fase", S.fase[0]); if (tambah && S.berikut) q.set("sesudah", S.berikut);
    const r = await api("/api/siklus/kejadian?" + q);
    if (!pj.terbaru(n)) return;   // respons lambat dari pilihan lama dibuang
    if (!r.ok) { setJudul(null); return kosongkan(hasil).append(kead_dari(r, () => muat())); }
    S.baris = tambah ? [...S.baris, ...r.j.baris] : r.j.baris; S.berikut = r.j.berikut; if (!tambah) S.hal = 0; gambar();
  }

  isi.replaceChildren(kart); kontrol(); muat();
  if (P.pd) antrean(isi, P);
}

async function baru(sesudah) {
  const v = await tanya({judul: "Buat kejadian baru", teks: "Untuk kejadian yang belum tercatat otomatis. Nomor KJ dibuat dari jenis, kabupaten, dan tanggal mulai.",
    kolom: [{nama: "jenis", label: "Jenis bencana", jenis: "pilih", opsi: Object.entries(K.jenis || {}).map(([k, x]) => [k, x[0]]), wajib: true}, {nama: "nama", label: "Nama kejadian (3 sampai 160 huruf)", wajib: true, maks: 160},
      {nama: "kab4", label: "Kabupaten atau kota", jenis: "pilih", opsi: [["", "Belum diketahui"], ...Object.keys(K.kab || {}).map(k => [k, `${namaKab(k)}, ${namaProv(k.slice(0, 2))}`])]}, {nama: "mulai", label: "Tanggal mulai", jenis: "tgl", wajib: true, nilai: tglWib()}], ya: "Buat"});
  if (!v) return;
  const badan = {jenis: v.jenis, nama: v.nama, mulai: v.mulai, ...(v.kab4 ? {kab4: v.kab4} : {})};
  let r = await api("/api/siklus/kejadian", {metode: "POST", badan});
  if (r.status === 409 && r.j?.kandidat) {
    const lanjut = await tanya({judul: "Sudah ada kejadian serupa", teks: `Kandidat: ${r.j.kandidat.map(k => `${k.id} (${namaJenis(k.jenis)}, ${tgl(k.mulai)})`).join("; ")}. Tetap buat kejadian baru?`, ya: "Tetap buat"});
    if (!lanjut) return; r = await api("/api/siklus/kejadian", {metode: "POST", badan: {...badan, paksa: true}});
  }
  if (!r.ok) return toast(r.j?.galat || "Kejadian belum bisa dibuat");
  toast("Kejadian dibuat"); sesudah?.();
}

/* ---------- antrean ambigu dan tanpa wilayah (PD, KO) ---------- */
async function antrean(isi) {
  const hasil = h("div", {class: "sk-kb"}), kart = kartu({ey: [ik("tanya", 12), "Antrean"], judul: ["Antrean ", hl("menunggu"), " keputusan"], isi: [hasil], id: "antrean"}), judul = kart.querySelector("h3");
  isi.append(kart); hasil.append(kead("memuat"));
  async function muat() {
    const r = await api("/api/siklus/antrean?batas=20");
    kosongkan(hasil);
    if (!r.ok) { judul.replaceChildren("Antrean ", hl("belum bisa dimuat")); return hasil.append(kead_dari(r, muat)); }
    const baris = r.j.baris, a = baris.filter(x => x.status === "ambigu").length, t = baris.length - a;
    judul.replaceChildren(...(baris.length ? [hl(angka(baris.length)), " baris sumber menunggu keputusan, ", hl(angka(a)), " ambigu dan ", hl(angka(t)), " tanpa wilayah"] : ["Tidak ada baris sumber yang ", hl("menunggu keputusan")]));
    if (!baris.length) return hasil.append(kead("kosong", {teks: "Semua baris sumber sudah terpasang ke kejadian"}));
    for (const b of baris) hasil.append(satu(b, muat));
  }
  muat();
}
function satu(b, ulang) {
  const kab = h("select", {"aria-label": "Kabupaten untuk baris ini"}, h("option", {value: ""}, "Pilih kabupaten"), Object.keys(K.kab || {}).map(k => h("option", {value: k}, `${namaKab(k)}, ${namaProv(k.slice(0, 2))}`)));
  const putus = async (pilih) => {
    const badan = {pilih}; if (!b.kab4 && kab.value) badan.kab4 = kab.value;
    if (pilih === "baru" && !b.kab4 && !kab.value) return toast("Pilih kabupaten dulu untuk membuat kejadian baru");
    const r = await api(`/api/siklus/antrean/${b.id}`, {metode: "POST", badan});
    if (!r.ok) return toast(r.j?.galat || "Keputusan belum bisa disimpan");
    toast(pilih === null ? "Baris ditolak" : "Baris terpasang"); ulang();
  };
  const opsi = [...(b.kandidat || []).map(k => [k, k, "tautan"]), ["baru", "Buat baru", "tambah"], ["tolak", "Tolak", "silang"]];
  const dampak = Object.entries(b.dampak || {}).slice(0, 3).map(([m, x]) => `${namaMetrik(m)} ${angka(x?.n) ?? "tidak ada"}`).join(", ");
  return h("div", {}, h("div", {}, h("b", {}, `${namaSumber(b.sumber)} ${b.kode}`), `: ${namaJenis(b.jenis)}, ${tgl(b.mulai)}, `, selWilayah(b.kab4), " ", pil(b.status === "ambigu" ? "hipotesis" : "menunggu", {}, b.status === "ambigu" ? "Lebih dari satu kejadian cocok, perlu keputusan petugas" : "Wilayah belum terpetakan")), dampak ? h("small", {}, dampak) : null,
    b.kab4 ? null : kab, seg(opsi, "", v => putus(v === "tolak" ? null : v), "Keputusan untuk baris ini"));
}

/* ================================================================ detail */
async function detail(isi, sk, id) {
  if (!RE_KJ.test(id)) return isi.replaceChildren(kartu({ey: "Kejadian", judul: ["Nomor kejadian ", hl("tidak sah")], isi: [kead("kosong", {teks: "Nomor kejadian tidak sah. Buka daftar untuk memilih kejadian."})]}));
  sk.periode = () => ({kejadian: id}); isi.replaceChildren(kead("memuat"));
  const q = new URLSearchParams(location.search), qs = q.get("tahun") && q.get("kab4") ? `?tahun=${encodeURIComponent(q.get("tahun"))}&kab4=${encodeURIComponent(q.get("kab4"))}` : "";
  const [P, r] = await Promise.all([peran(), api(`/api/siklus/kejadian/${id}${qs}`)]);
  if (!r.ok) return isi.replaceChildren(kartu({ey: "Kejadian", judul: [id, " ", hl("belum bisa dibuka")], isi: [kead_dari(r, () => detail(isi, sk, id), "Kejadian tidak ada atau di luar wilayah kamu")]}));
  if (r.j.alias_ke) { if (r.j.alias_ke !== id) location.replace(`/siklus/kejadian/${r.j.alias_ke}`); return; }
  if (r.j.arsip) return isi.replaceChildren(...detailArsip(id, r.j));
  isi.replaceChildren(...detailHidup(id, r.j, P, () => detail(isi, sk, id)));
}

function detailArsip(id, d) {
  const k = d.kejadian, per = {}; for (const [m, v] of Object.entries(k.dampak || {})) if (m !== "selisih" && v && typeof v === "object") per[namaSumber(m)] = v;
  const n1 = ambilN(per, "DIBI", "meninggal"), n2 = ambilN(per, "Logbook", "meninggal");
  return [kartu({ey: [ik("bangunan", 12), `Arsip ${d.tahun}`], judul: [namaJenis(k.jenis), " di ", wilayah(d.kab4) ?? "wilayah belum terpetakan", n1 == null && n2 == null ? ", belum ada laporan korban" : [", ", hl(angka(n1) ?? "tidak ada"), " meninggal menurut DIBI, ", hl(angka(n2) ?? "tidak ada"), " menurut Logbook"]],
    isi: [wadah("Arsip, baca saja", para(`${id} berasal dari arsip tahun ${d.tahun}. Kejadian ini belum dipromosikan menjadi kejadian hidup, jadi fase dan aksi belum tersedia. Mulai ${tgl(k.mulai) ?? "tidak ada"}${k.akhir ? `, selesai ${tgl(k.akhir)}` : ""}.`), pil("terverifikasi", {siapa: "arsip beku", waktu: String(d.tahun)})),
      wadah("Dampak per sumber", blokBerdampingan(per, "meninggal"), tabelDampak(per)), h("div", {class: "sk-aksi"}, h("a", {href: "/siklus/kejadian", "data-aksi": "biasa"}, "Kembali ke daftar"))]})];
}

const KALIMAT = {buat: () => "Kejadian dibuat", promosi: j => `Dipromosikan dari ${j.ke ?? "arsip"}`, fase: j => `Fase ${K.fase?.[j.dari]?.[0] ?? j.dari} ke ${K.fase?.[j.ke]?.[0] ?? j.ke}`, publik: () => "Ringkasan dibuka untuk umum", tarik: () => "Ringkasan publik ditarik",
  gabung: j => `Digabung ke ${j.ke}`, koreksi: j => `Satu baris sumber dipindah ke ${j.ke}`, antrean: j => `Keputusan antrean: ${j.ke ?? j.catatan ?? "selesai"}`, ingest: () => "Sumber masuk otomatis"};

function detailHidup(id, d, P, ulang) {
  const r = d.kejadian, sumber = d.sumber || [], per = perSumber(sumber), n1 = ambilN(per, "DIBI", "meninggal"), n2 = ambilN(per, "Logbook", "meninggal"), s = selisihAntarsumber({dibi: n1, logbook: n2});
  const judul = [namaJenis(r.jenis), " di ", d.wilayah ?? "wilayah belum terpetakan", n1 == null && n2 == null ? ", belum ada laporan korban" : [", ", hl(angka(n1) ?? "tidak ada"), " jiwa menurut DIBI, ", hl(angka(n2) ?? "tidak ada"), " menurut Logbook, selisih ", hl(s.selisih == null ? "tidak ada" : angka(s.selisih))]];
  const barisFase = h("div", {class: "sk-baris"}, fase(r.fase));
  const aksi = h("div", {class: "sk-aksi"});
  const i = FASE.indexOf(r.fase), ko = P.ko, pd = P.pd;
  const pindah = async (ke) => {
    const kolom = [], mundur = FASE.indexOf(ke) >= 0 && FASE.indexOf(ke) < i;
    if (mundur || ke === "selesai" || ke === "dibatalkan") kolom.push({nama: "alasan", label: "Alasan (wajib)", jenis: "area", wajib: true, maks: 200});
    else kolom.push({nama: "alasan", label: "Catatan (boleh kosong)", maks: 200});
    if (ke === "tanggap" && !r.tanggap_mulai) kolom.push({nama: "tanggap_mulai", label: "Tanggal mulai tanggap darurat", jenis: "tgl", wajib: true, nilai: tglWib()});
    if (ke === "transisi" && !r.tanggap_akhir) kolom.push({nama: "tanggap_akhir", label: "Tanggal akhir tanggap darurat", jenis: "tgl", wajib: true, nilai: tglWib()});
    const v = await tanya({judul: `Ubah fase ke ${K.fase?.[ke]?.[0] ?? ke}`, teks: `Dari ${K.fase?.[r.fase]?.[0] ?? r.fase}. Perubahan tercatat di garis waktu.`, kolom, ya: "Ubah fase", bahaya: ke === "dibatalkan"});
    if (!v) return;
    const lama = barisFase.firstChild, baruPil = fase(ke); lama.replaceWith(baruPil);   // pil berganti seketika
    const x = await api(`/api/siklus/kejadian/${id}/fase`, {metode: "POST", badan: {ke, ...(v.alasan ? {alasan: v.alasan} : {}), ...(v.tanggap_mulai ? {tanggap_mulai: v.tanggap_mulai} : {}), ...(v.tanggap_akhir ? {tanggap_akhir: v.tanggap_akhir} : {})}});
    if (!x.ok) { baruPil.replaceWith(lama); return toast(x.j?.galat || "Fase belum bisa diubah"); }
    toast("Fase diubah"); G.nanti(ulang);
  };
  if (ko && i >= 0 && i < FASE.length - 1) aksi.append(tombol("Naikkan", "utama", () => pindah(FASE[i + 1]), "panah", `Naikkan ke ${K.fase?.[FASE[i + 1]]?.[0]}`));
  if (!ko && pd && r.fase === "terdeteksi") aksi.append(tombol("Verifikasi", "utama", () => pindah("terverifikasi"), "centang"));
  if (ko && i > 0) aksi.append(tombol("Mundur", "biasa", () => pindah(FASE[i - 1]), "mundur", `Mundur ke ${K.fase?.[FASE[i - 1]]?.[0]}`));
  if ((ko || pd) && r.fase === "terdeteksi" && faseSah(r.fase, "dibatalkan")) aksi.append(tombol("Batalkan", "bahaya", () => pindah("dibatalkan"), "silang"));
  if (ko) {
    aksi.append(tombol("Gabung", "biasa", async () => {
      const v = await tanya({judul: "Gabung dengan kejadian lain", teks: "Kejadian yang mulai lebih awal bertahan; yang lain menjadi alias. Fase keduanya harus sama.", kolom: [{nama: "ke", label: "Nomor kejadian tujuan (KJ-...)", wajib: true, maks: 20}, {nama: "alasan", label: "Alasan", maks: 200}], ya: "Gabung"});
      if (!v) return; if (!RE_KJ.test(v.ke)) return toast("Nomor kejadian tujuan tidak sah");
      const x = await api(`/api/siklus/kejadian/${id}/gabung`, {metode: "POST", badan: {ke: v.ke, ...(v.alasan ? {alasan: v.alasan} : {})}});
      if (!x.ok) return toast(x.j?.galat || "Gabung gagal"); toast("Kejadian digabung"); G.nanti(() => { location.href = `/siklus/kejadian/${x.j.ke}`; });
    }, "gabung"));
    aksi.append(tombol(r.publik ? "Tarik dari publik" : "Buka untuk publik", "biasa", async () => {
      let badan = {publik: false};
      if (!r.publik) { const v = await tanya({judul: "Buka ringkasan untuk publik", teks: "Tanpa nama orang, telepon, atau surel. 20 sampai 600 huruf.", kolom: [{nama: "ringkasan", label: "Ringkasan resmi", jenis: "area", wajib: true, maks: 600}], ya: "Buka"}); if (!v) return; badan = {publik: true, ringkasan: v.ringkasan}; }
      const x = await api(`/api/siklus/kejadian/${id}/publik`, {metode: "POST", badan});
      if (!x.ok) return toast(x.j?.galat || "Status publik belum bisa diubah"); toast(r.publik ? "Ringkasan ditarik dari publik" : "Ringkasan dibuka untuk publik"); G.nanti(ulang);
    }, "terbit"));
  }
  const bagian = [["ringkasan", "Ringkasan", "mata"], ["waktu", "Waktu", "bolak"], ["dampak", "Dampak", "jiwa"], ["paparan", "Paparan", "bangunan"], ["kaji", "Kaji", "gelombang"], ["pulih", "Pulih", "palu"]];
  const lompat = seg(bagian, "", v => document.getElementById("k-" + v)?.scrollIntoView({block: "start"}), "Loncat ke bagian");
  const kepala = kartu({ey: [ik("bolak", 12), id], judul, id: "k-kepala", isi: [h("div", {class: "sk-baris"}, barisFase, aksi), lompat]});

  const kab = (d.kab || []).map(k => wilayah(k)).filter(Boolean);
  const ringkasan = kartu({ey: [ik("mata", 12), "Ringkasan resmi"], id: "k-ringkasan", judul: [r.publik ? "Ringkasan resmi " : "Ringkasan resmi ", hl(r.publik ? "sudah dibuka" : "belum dibuka"), " untuk umum"], isi: [
    wadah("", r.publik && r.ringkasan_publik ? para(r.ringkasan_publik) : para("Belum ada ringkasan resmi untuk umum. Ringkasan ditulis koordinator setelah kejadian terverifikasi."), r.publik ? pil(r.yakin || "resmi", {sumber: "Koordinator kejadian", waktu: wib(r.diubah)}) : pil("menunggu", {ditunggu: "ringkasan resmi"})),
    wadah("Pengenal", h("div", {}, `Mulai ${tgl(r.mulai) ?? "tidak ada"}${r.akhir ? `, selesai ${tgl(r.akhir)}` : ""}. Wilayah: ${kab.length ? kab.join("; ") : "belum terpetakan"}.`),
      h("div", {}, "Nomor induk resmi: tidak ada ", pil("menunggu", {ditunggu: "keputusan penomoran resmi"})))]});

  const jejak = d.jejak || [];
  const waktu = kartu({ey: [ik("bolak", 12), "Garis waktu"], id: "k-waktu", judul: [hl(angka(jejak.length) ?? "0"), " catatan perubahan, terbaru di atas"], isi: [jejak.length ? h("ol", {class: "sk-garis"}, jejak.map(j => {
    const kal = (KALIMAT[j.aksi] || (() => j.aksi))(j);
    return h("li", {"data-tip": tip(kal, ["Waktu", wib(j.waktu)], ["Pelaku", j.oleh], ["Catatan", j.catatan])}, h("time", {}, wib(j.waktu)), h("span", {}, kal), j.catatan ? h("small", {}, j.catatan) : null, h("small", {}, j.oleh));
  })) : kead("kosong", {teks: "Belum ada catatan perubahan"})]});

  const ada = Object.keys(per).length;
  const dampak = kartu({ey: [ik("jiwa", 12), "Dampak per sumber"], id: "k-dampak", judul: ada ? ["Dampak dilaporkan ", hl(angka(ada)), " sumber, berdampingan tanpa dijumlah"] : ["Dampak ", hl("belum ada laporan"), " dari sumber mana pun"],
    isi: ada ? [blokBerdampingan(per, "meninggal") ? wadah("Korban meninggal", blokBerdampingan(per, "meninggal")) : null, wadah("Semua jenis dampak", tabelDampak(per))] : [kead("kosong", {teks: "Belum ada laporan dampak. Angka muncul setelah sumber memasangkan laporannya ke kejadian ini."})]});

  const kecil = (id2, ey, jdl, teks, aksiLink) => kartu({ey: [ik(ey[0], 12), ey[1]], id: id2, judul: jdl, isi: [kead("kosong", {teks, aksi: aksiLink}), pil("menunggu")]});
  const paparan = kecil("k-paparan", ["bangunan", "Paparan"], ["Paparan bangunan dan jiwa ", hl("dibaca di layar paparan")], "Paparan per zona bahaya dibuka di layar paparan untuk kabupaten kejadian ini.", d.kab?.[0] ? {label: "Buka paparan", fn: () => { location.href = `/siklus/paparan?kab4=${encodeURIComponent(d.kab[0])}`; }} : null);
  const kaji = kecil("k-kaji", ["gelombang", "Kaji cepat"], ["Perkiraan otomatis ", hl("belum ada"), " untuk kejadian ini"], "Belum ada perkiraan otomatis. Kaji cepat tampil di sini setelah dihitung, selalu sebagai rentang estimasi model.");
  const pulih = kecil("k-pulih", ["palu", "Pemulihan"], ["Jitupasna ", hl("belum dibuka"), " untuk kejadian ini"], "Jitupasna belum dibuka. Ringkasan pemulihan muncul setelah kejadian masuk masa transisi.");

  const terpasang = kartu({ey: [ik("tautan", 12), "Sumber terpasang"], id: "k-sumber", judul: [hl(angka(sumber.length) ?? "0"), " baris sumber terpasang ke kejadian ini"], isi: [sumber.length ? h("div", {class: "sk-kb"}, sumber.map(x => {
    const link = TEMPLAT[x.sumber] && RE_PENGENAL.test(x.pengenal_luar ?? "") ? h("a", {href: TEMPLAT[x.sumber](x.pengenal_luar), target: "_blank", rel: "noopener noreferrer"}, x.pengenal_luar) : null;
    return h("div", {}, h("div", {}, h("b", {}, namaSumber(x.sumber)), ` ${x.kode}`, x.dummy ? h("span", {class: "sk-contoh"}, "contoh") : null), h("small", {}, `${namaJenis(x.jenis)}, ${tgl(x.mulai) ?? "tanggal tidak ada"}, `, selWilayah(x.kab4)), link,
      ko && x.status === "terpasang" ? tombol("Pindahkan", "biasa", async () => {
        const v = await tanya({judul: "Pindahkan baris sumber", teks: "Koreksi manual: baris ini dilepas dari kejadian ini. Tercatat di garis waktu.", kolom: [{nama: "ke", label: 'Nomor kejadian tujuan (KJ-...) atau kata "baru"', wajib: true, maks: 20}], ya: "Pindahkan"});
        if (!v) return; if (v.ke !== "baru" && !RE_KJ.test(v.ke)) return toast("Tujuan harus nomor KJ atau kata baru");
        const y = await api(`/api/siklus/kejadian/${id}/koreksi`, {metode: "POST", badan: {sid: x.id, ke: v.ke}});
        if (!y.ok) return toast(y.j?.galat || "Pemindahan gagal"); toast("Baris sumber dipindahkan"); G.nanti(ulang);
      }, "bolak", "Pindahkan baris sumber ke kejadian lain") : null);
  })) : kead("kosong", {teks: "Belum ada sumber terpasang"})]});

  return [kepala, h("div", {class: "sk-detail"}, h("div", {}, ringkasan, waktu, dampak, paparan, kaji, pulih), h("div", {}, terpasang))];
}
