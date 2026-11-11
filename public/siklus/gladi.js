/* Siklus Bencana F5: daftar Gladi (DS 3.11) dan satu Gladi dengan pemutaran ulang. Rute: /api/siklus/gladi, /gladi/:sid, /gladi/:sid/status, /gladi/:sid/catatan (src/siklus_renkon.js).
   Hanya kejadian yang sudah dipromosikan ke D1 yang bisa dijadikan skenario (kejadian arsip R2: server menjawab 409 "promosikan dulu"). Pemutaran ulang membawa nilai apa adanya, tanpa nama korban,
   berlabel "Model sederhana, bukan prakiraan" dan berpil hipotesis. Skor kesiapan selalu "n dari 4 komponen". Tanpa data = "menunggu", bukan 0. */
import {h, ik, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, pilihan, tombol, tanya, toast, pil, tip, K, namaJenis, namaProv, namaMetrik, namaSumber, wilayah, angka, tgl, wib, tglWib, geser, peran, penjaga} from "./inti.js";

const G = globalThis, MENUNGGU = "menunggu";
export const STATUS_GL = {dirancang: ["Dirancang", "mata", "Skenario disusun, belum siap"], siap: ["Siap", "centang", "Siap dijalankan"], berjalan: ["Berjalan", "sirene", "Gladi sedang berjalan"], dievaluasi: ["Dievaluasi", "timbangan", "Evaluasi dan rekomendasi"], selesai: ["Selesai", "bendera", "Selesai dengan rekomendasi"]};
export const URUT_GL = Object.keys(STATUS_GL);
export const JENIS_GL = [["ruang", "Ruang", "tiga"], ["posko", "Posko", "bendera"], ["lapang", "Lapang", "peta"]];
const BIDANG = [["kebijakan", "Kebijakan"], ["renkon", "Renkon"], ["sarpras", "Sarana dan prasarana"]];   // keluaran gladi minimal (Juklak 4/2026)
const bilangan = x => typeof x === "number" && Number.isFinite(x);
const ang = n => angka(n) ?? MENUNGGU;
const LABEL_PUTAR = "Model sederhana, bukan prakiraan";

/* ---------- fungsi murni (diuji tanpa peramban) ---------- */
export const statusBerikutGl = s => URUT_GL[URUT_GL.indexOf(s) + 1] ?? null;
export const rekomendasiTertaut = rek => Array.isArray(rek) ? {tertaut: rek.filter(r => r && r.tertaut === true).length, total: rek.length} : {tertaut: 0, total: 0};
export const belumTertaut = daftar => (daftar ?? []).reduce((a, g) => { const r = rekomendasiTertaut(g.rekomendasi); return a + (r.total - r.tertaut); }, 0);
export const jamTeks = t => bilangan(t) ? `T+${angka(t)} jam` : MENUNGGU;
export const nilaiLangkah = l => bilangan(l?.nilai) ? ang(l.nilai) : MENUNGGU;

const gagalToast = r => toast(r.status === 429 ? "Terlalu sering. Tunggu sebentar lalu coba lagi." : r.status === 403 ? "Peran kamu belum berhak untuk aksi ini" : (typeof r.j?.galat === "string" && r.j.galat) || "Gagal. Coba lagi.");
const statusPil = s => { const x = STATUS_GL[s] ?? [String(s), "mata", ""]; return h("span", {class: "sk-fase", "data-f": s, title: x[2]}, ik(x[1], 14), x[0]); };

export async function buka(isi, sk) {
  const m = /^\/siklus\/gladi\/([0-9a-f]{16})$/.exec(location.pathname.replace(/\/+$/, ""));
  return m ? detail(isi, sk, m[1]) : daftar(isi, sk);
}

/* ================================================================ daftar */
async function daftar(isi, sk) {
  let prov0 = null; try { prov0 = localStorage.getItem("sk-prov"); } catch (e) { /* penyimpanan diblokir */ }
  const S = {prov: new URLSearchParams(location.search).get("prov") || prov0 || "32", renkon: "", jenis: "semua", status: "semua", rk: [], baris: null, kej: []}, pj = penjaga(); sk.periode = () => ({kab4: null});
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"}), aksi = h("span", {}), rancang = h("div", {});
  const kart = kartu({ey: [ik("sirene", 12), "Gladi"], judul: ["Gladi ", hl("menunggu"), " data"], kanan: aksi, isi: [ctl, hasil], id: "daftar"}), judul = kart.querySelector("h3");
  const optProv = Object.entries(K.provinsi ?? {}).sort((a, b) => a[0].localeCompare(b[0]));

  function kontrol() {
    kosongkan(ctl).append(h("div", {class: "sk-baris"}, pilihan(optProv, S.prov, v => { S.prov = v; S.renkon = ""; muatRenkon(); }, "Wilayah"),
      pilihan(S.rk.length ? S.rk.map(r => [r.id, `${r.judul} (${r.status})`]) : [["", "Belum ada renkon"]], S.renkon, v => { S.renkon = v; muat(); }, "Renkon")),
      seg([["semua", "Semua jenis", "semua"], ...JENIS_GL], S.jenis, v => { S.jenis = v; gambar(); }, "Jenis gladi"),
      seg([["semua", "Semua status", "semua"], ...Object.entries(STATUS_GL).map(([v, [t, i]]) => [v, t, i])], S.status, v => { S.status = v; gambar(); }, "Status gladi"));
  }
  function gambar() {
    const semua = S.baris ?? [], rows = semua.filter(g => (S.jenis === "semua" || g.jenis === S.jenis) && (S.status === "semua" || g.status === S.status));
    judul.replaceChildren(...(S.baris == null ? ["Gladi ", hl("menunggu"), " data"] : semua.length ? [hl(angka(semua.length)), " gladi, ", hl(angka(belumTertaut(semua))), " rekomendasi belum tertaut ke renkon"] : ["Belum ada ", hl("gladi"), " untuk renkon ini"]));
    kosongkan(hasil).append(para("Putar ulang kejadian arsip, bukan simulasi dan bukan prakiraan."), rancang);
    if (!rows.length) return hasil.append(kead("kosong", {teks: semua.length ? "Tidak ada gladi dengan pilihan ini. Ubah jenis atau status." : S.renkon ? "Belum ada gladi untuk renkon ini" : "Pilih renkon lebih dulu"}));
    const t = h("tbody", {});
    for (const g of rows) {
      const href = `/siklus/gladi/${g.id}`, rk = rekomendasiTertaut(g.rekomendasi), tr = h("tr", {class: "klik", "data-tip": tip(`Gladi ${g.jenis}`, ["Kejadian", g.kejadian_id], ["Diubah", wib(g.diubah)])},
        h("td", {}, h("a", {href}, `Gladi ${g.jenis}`), g.dummy ? h("span", {class: "sk-contoh", title: "Baris dummy untuk contoh layar"}, "contoh") : null), h("td", {}, h("a", {href: `/siklus/kejadian/${g.kejadian_id}`}, g.kejadian_id)), h("td", {class: "t"}, statusPil(g.status)),
        h("td", {class: "num"}, bilangan(g.skenario?.total_langkah) ? ang(g.skenario.total_langkah) : MENUNGGU),
        h("td", {class: "t"}, rk.total ? `${ang(rk.tertaut)} dari ${ang(rk.total)}` : [h("span", {}, "belum ada"), " ", pil("menunggu", {ditunggu: "rekomendasi saat selesai"})]));
      tr.addEventListener("click", e => { if (e.target.closest("a,button")) return; tr.setAttribute("aria-current", "true"); G.nanti(() => { location.href = href; }); });
      t.append(tr);
    }
    const th = (a, d) => h("th", {title: d}, a);
    hasil.append(h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Gladi", "Jenis gladi: ruang, posko, atau lapang"), th("Kejadian", "Kejadian arsip yang diputar ulang"), th("Status", "Status gladi"), th("Langkah", "Jumlah langkah pemutaran ulang"), th("Rekomendasi tertaut", "Rekomendasi yang tertaut ke renkon"))), t)));
  }
  function kartuRancang(p) {
    const optK = S.kej.map(k => [k.id, `${namaJenis(k.jenis)}, ${wilayah(k.kab4) ?? "wilayah belum terpetakan"}, ${tgl(k.mulai) ?? ""}`]);
    if (!(p.ko || p.sa) || !S.renkon) return kosongkan(rancang);
    kosongkan(rancang).append(wadah("Rancang gladi", para("Skenario disusun server dari kejadian yang sudah dipromosikan ke Buku Besar. Kejadian arsip harus dipromosikan dulu."),
      h("div", {class: "sk-aksi"}, tombol("Susun skenario", "utama", async () => {
        if (!optK.length) return toast("Belum ada kejadian di Buku Besar pada 365 hari terakhir");
        const v = await tanya({judul: "Susun skenario gladi", teks: "Putar ulang kejadian, bukan simulasi dan bukan prakiraan.", ya: "Susun", kolom: [{nama: "jenis", label: "Jenis", jenis: "pilih", opsi: JENIS_GL.map(([a, b]) => [a, b])}, {nama: "kej", label: "Kejadian", jenis: "pilih", opsi: optK}, {nama: "per", label: "Percepatan (1 sampai 1000)", nilai: "1", maks: 4}]});
        if (!v) return;
        if (!/^\d+(\.\d+)?$/.test(v.per)) return toast("Percepatan harus angka antara 1 dan 1000");
        const r = await api("/api/siklus/gladi", {metode: "POST", badan: {jenis: v.jenis, renkon_id: S.renkon, kejadian_id: v.kej, percepatan: Number(v.per)}});
        if (!r.ok) return gagalToast(r);
        location.href = `/siklus/gladi/${r.j.id}`;
      }, "tambah"))));
  }
  async function muatRenkon() {
    const r = await api("/api/siklus/renkon?" + new URLSearchParams({prov: S.prov}));
    S.rk = r.ok ? (r.j?.baris ?? []).filter(x => x.status !== "dimutakhirkan") : []; S.renkon = S.rk[0]?.id ?? ""; kontrol(); muat();
  }
  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    if (!S.renkon) { S.baris = []; return gambar(); }
    const r = await api("/api/siklus/gladi?" + new URLSearchParams({renkon_id: S.renkon}));
    if (!pj.terbaru(n)) return;
    if (!r.ok) { S.baris = null; return kosongkan(hasil).append(kead_dari(r, muat)); }
    S.baris = r.j?.baris ?? []; gambar(); kartuRancang(await peran());
  }
  isi.replaceChildren(kart);
  (async () => {
    const sampai = tglWib(), k = await api("/api/siklus/kejadian?" + new URLSearchParams({dari: geser(sampai, -365), sampai, batas: 100}));
    S.kej = k.ok ? (k.j?.baris ?? []).filter(x => !["dibatalkan", "digabung"].includes(x.fase)) : [];
    await muatRenkon();
  })();
}

/* ================================================================ detail */
async function detail(isi, sk, id) {
  const S = {d: null, skor: null, p: {}, semua: false}, pj = penjaga(); sk.periode = () => ({kab4: null});
  const hasil = h("div", {}), aksi = h("span", {class: "sk-aksi"});
  const kart = kartu({ey: [ik("sirene", 12), "Gladi"], judul: ["Gladi ", hl("menunggu"), " data"], kanan: aksi, isi: hasil, id: "gladi"}), judul = kart.querySelector("h3");
  const g = () => S.d.gladi;

  async function ubahStatus(ke) {
    const badan = {ke};
    if (ke === "selesai") {
      const rek = [];
      for (let i = 0; i < 20; i++) {
        const v = await tanya({judul: `Rekomendasi ${i + 1}`, teks: "Gladi selesai wajib punya rekomendasi. Tertaut berarti sudah masuk renkon.", ya: "Lanjut", kolom: [{nama: "bidang", label: "Bidang", jenis: "pilih", opsi: BIDANG}, {nama: "teks", label: "Rekomendasi", jenis: "area", wajib: true, maks: 300},
          {nama: "tertaut", label: "Sudah tertaut ke renkon", jenis: "pilih", opsi: [["tidak", "Belum"], ["ya", "Sudah"]]}, {nama: "lagi", label: "Tambah rekomendasi lagi", jenis: "pilih", opsi: [["tidak", "Tidak, selesaikan"], ["ya", "Ya"]]}]});
        if (!v) return;
        rek.push({bidang: v.bidang, teks: v.teks, tertaut: v.tertaut === "ya"}); if (v.lagi !== "ya") break;
      }
      badan.rekomendasi = rek;
    }
    const r = await api(`/api/siklus/gladi/${id}/status`, {metode: "POST", badan}); if (!r.ok) return gagalToast(r);
    toast(`Status menjadi ${STATUS_GL[ke][0].toLowerCase()}`); muat();
  }
  async function catat() {
    const v = await tanya({judul: "Catat masalah", teks: "Satu butir masalah yang ditemukan saat gladi. Tanpa nama korban.", kolom: [{nama: "teks", label: "Masalah", jenis: "area", wajib: true, maks: 300}], ya: "Catat"});
    if (!v) return;
    const r = await api(`/api/siklus/gladi/${id}/catatan`, {metode: "POST", badan: {teks: v.teks}}); if (!r.ok) return gagalToast(r);
    toast("Masalah dicatat"); muat();
  }
  function gambar() {
    const x = g(), sc = x.skenario ?? {}, langkah = sc.langkah ?? [], rk = rekomendasiTertaut(x.rekomendasi), next = statusBerikutGl(x.status), tampilLangkah = S.semua ? langkah : langkah.slice(0, 30);
    judul.replaceChildren(...["Gladi ", x.jenis, ": ", hl(ang(sc.total_langkah)), " langkah putar ulang, ", rk.total ? [hl(`${ang(rk.tertaut)} dari ${ang(rk.total)}`), " rekomendasi tertaut ke renkon"] : ["rekomendasi ", hl(MENUNGGU)]].flat());
    kosongkan(aksi).append(statusPil(x.status), ...(S.p.ko && next ? [tombol(`Lanjut ke ${STATUS_GL[next][0].toLowerCase()}`, "utama", () => ubahStatus(next), "panah")] : []));
    const ml = h("ul", {class: "sk-garis"}, tampilLangkah.map(l => h("li", {"data-tip": tip(jamTeks(l.t_jam), ["Sumber", namaSumber(l.sumber)], ["Metrik", namaMetrik(l.metrik)], ["Nilai", nilaiLangkah(l)])},
      h("time", {}, jamTeks(l.t_jam)), h("span", {}, `${namaSumber(l.sumber)}, ${namaMetrik(l.metrik)}: `, h("b", {}, nilaiLangkah(l))), h("small", {}, "nilai apa adanya, tanpa interpolasi"))));
    const sisa = langkah.length - tampilLangkah.length;
    const masalah = Array.isArray(x.masalah) ? x.masalah : [], bisaCatat = (S.p.pd || S.p.ko || S.p.sa) && ["siap", "berjalan", "dievaluasi"].includes(x.status);
    const th = (a, d) => h("th", {title: d}, a);
    const tm = h("tbody", {}, masalah.map(m => h("tr", {}, h("td", {class: "t"}, wib(Date.parse(m.waktu)) ?? ""), h("td", {}, m.oleh ?? ""), h("td", {}, m.teks))));
    const tr = h("tbody", {}, (x.rekomendasi ?? []).map(r => h("tr", {}, h("td", {}, BIDANG.find(b => b[0] === r.bidang)?.[1] ?? r.bidang), h("td", {}, r.teks), h("td", {class: "t"}, r.tertaut ? "tertaut ke renkon" : "belum tertaut"))));
    kosongkan(hasil).append(
      wadah("Skenario pemutaran ulang", h("p", {class: "sk-para"}, LABEL_PUTAR, " ", pil("hipotesis"), " ", sc.percepatan ? `Percepatan ${ang(sc.percepatan)} kali. ` : "", `Kejadian ${x.kejadian_id}, ${sc.jenis ? namaJenis(sc.jenis) : "jenis belum tertulis"}, mulai ${tgl(sc.kejadian_mulai) ?? "tanggal belum tertulis"}. Putar ulang kejadian arsip, bukan simulasi dan bukan prakiraan.`),
        sc.replay_maret_2025 ? para(`Replay Maret 2025: ${sc.lisensi ?? "lisensi DEM NC"}.`) : null,
        langkah.length ? ml : kead("kosong", {teks: "Skenario belum punya langkah: kejadian belum memuat dampak bertanggal"}),
        sisa > 0 ? tombol(`Tampilkan ${angka(sisa)} langkah lagi`, "biasa", () => { S.semua = true; G.nanti(gambar); }) : null,
        sc.total_langkah > langkah.length ? para(`Skenario memuat ${ang(sc.total_langkah)} langkah; hanya ${ang(langkah.length)} pertama yang disimpan.`) : null),
      wadah("Matriks masalah", masalah.length ? h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Waktu", "Waktu dicatat"), th("Oleh", "Pencatat"), th("Masalah", "Butir masalah"))), tm)) : kead("kosong", {teks: "Belum ada masalah dicatat"}), bisaCatat ? tombol("Catat masalah", "biasa", catat, "tambah") : null),
      wadah("Rekomendasi", (x.rekomendasi ?? []).length ? h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Bidang", "Keluaran minimal Juklak 4/2026: kebijakan, renkon, sarana dan prasarana"), th("Rekomendasi", "Isi rekomendasi"), th("Renkon", "Tertaut atau belum ke renkon"))), tr)) : kead("kosong", {teks: "Belum ada rekomendasi; wajib terisi saat gladi selesai"})),
      wadah("Skor kesiapan", para(S.skor?.status === "dihitung" ? `Skor ${ang(S.skor.skor)} dari 100, berdasar ${S.skor.label}.` : `Skor menunggu: ${S.skor?.label ?? "0 dari 4 komponen"}, perlu minimal 2 komponen.`), " ", pil(S.skor?.yakin ?? "asumsi-kebijakan"),
        h("div", {class: "sk-aksi"}, h("a", {href: `/siklus/renkon/${S.d.renkon.id}`, "data-aksi": "biasa"}, `Buka renkon: ${S.d.renkon.judul}`))));
  }
  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    const [r, p] = await Promise.all([api(`/api/siklus/gladi/${id}`), peran()]);
    if (!pj.terbaru(n)) return;
    if (!r.ok) return kosongkan(hasil).append(kead_dari(r, muat, "Gladi tidak ditemukan atau di luar wilayahmu"));
    S.d = r.j; S.p = p;
    const rk = await api(`/api/siklus/renkon/${S.d.renkon.id}`); S.skor = rk.ok ? rk.j?.skor ?? null : null;
    if (!pj.terbaru(n)) return;
    gambar();
  }
  isi.replaceChildren(kart); muat();
}
