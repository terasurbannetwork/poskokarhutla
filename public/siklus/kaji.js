/* Siklus Bencana F3: daftar Kaji Cepat (DS 3.5) dan satu kaji (DS 3.6). Rute: /api/siklus/kaji, /kaji/:sid, /kaji/:sid/status (src/siklus_kaji.js).
   Keluaran SELALU rentang bawah sampai atas berlabel estimasi model (KA 9); tidak pernah angka tunggal atau resmi. PAGER dan ITB berdampingan (U13). Uji balik tampil apa adanya, tanpa ambang lolos (U18).
   Gagal ambil grid = "menunggu data", bukan nol. Isian petugas meja berdampingan dengan model, tidak dijumlah. Chrome urgent, isi berat lewat nanti() (inti.js). */
import {h, ik, K, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, tombol, tanya, toast, pil, pilihan, tip, namaJenis, wilayah, angka, tgl, wib, tglWib, geser, peran, penjaga} from "./inti.js";
import {RE_KJ} from "./hitung.js";
import {muatMapLibre} from "../inti/maplibre.js";
import {urutKab, lahanGabung, ringkasKartu, citraKab, JENIS_CITRA, kabAwal, polaSel, fmtAngka, fmtPersenKelas, rentangTulis, rentangDari, alasanKab, alasanRentang, tglUtc} from "./genangan.js";

const G = globalThis, MAKS_KEJADIAN = 20;
const STATUS = {menunggu_data: ["Menunggu data", "jampasir", "Grid belum terbit atau gagal diambil; belum ada angka"], dihitung: ["Dihitung", "gelombang", "Dihitung otomatis, belum diperiksa petugas"], diperiksa: ["Diperiksa", "mata", "Sudah diperiksa petugas"],
  dipakai: ["Dipakai", "centang", "Dipakai sebagai rujukan kerja"], ditarik: ["Ditarik", "silang", "Ditarik; versi baru menggantikan"]};
const LANGKAH = {dihitung: ["diperiksa", "ditarik"], diperiksa: ["dipakai", "ditarik"], dipakai: ["ditarik"], menunggu_data: ["ditarik"], ditarik: []};
const MODEL = {gempa: ["Korban jiwa", "korban jiwa"], banjir_jam1: ["Jiwa terpapar jam pertama", "jiwa terpapar"], banjir_gfm: ["Penduduk di area genangan", "penduduk di area genangan"]};
const kom = n => String(n).replace(".", ",");
const bilangan = x => typeof x === "number" && Number.isFinite(x);

export const rentangSah = r => Array.isArray(r) && r.length === 2 && r.every(bilangan) ? r : null;
/* "a sampai b", dua ujung selalu tampil; tanpa rentang null, bukan "0 sampai 0" */
export const rentangTeks = r => { const x = rentangSah(r); return x ? `${angka(x[0])} sampai ${angka(x[1])}` : null; };
/* isian petugas terhadap rentang: di dalam, atau selisih ke ujung terdekat; tanpa isian atau tanpa rentang = null */
export function bandingRentang(n, r) {
  const x = rentangSah(r); if (!bilangan(n) || !x) return null;
  return n < x[0] ? {arah: "di bawah", selisih: x[0] - n} : n > x[1] ? {arah: "di atas", selisih: n - x[1]} : {arah: "di dalam", selisih: 0};
}
const statusPil = s => { const x = STATUS[s] ?? [String(s), "mata", ""]; return h("span", {class: "sk-fase", "data-f": s, title: x[2]}, ik(x[1], 14), x[0]); };
/* bilah rentang pada skala 0 sampai maks; gaya lewat CSSOM (CSP melarang atribut style) */
export function bilah(r, maks, label) {
  const x = rentangSah(r), u = h("u"), i = h("i", {"aria-hidden": "true"}, u);
  if (x && maks > 0) { u.style.left = (x[0] / maks * 100) + "%"; u.style.width = Math.max(1, (x[1] - x[0]) / maks * 100) + "%"; }
  return h("div", {class: "sk-rentang", role: "img", "aria-label": x ? `${label}: ${rentangTeks(x)}` : `${label}: menunggu data`, "data-tip": x ? tip(label, ["Batas bawah", angka(x[0])], ["Batas atas", angka(x[1])]) : null}, i,
    h("span", {}, h("span", {}, x ? angka(x[0]) : "menunggu"), h("span", {}, x ? angka(x[1]) : "menunggu")));
}

export async function buka(isi, sk) {
  const m = /^\/siklus\/kaji\/([0-9a-f]{16})$/.exec(location.pathname.replace(/\/+$/, ""));
  return m ? detail(isi, sk, m[1]) : daftar(isi, sk);
}

/* ================================================================ daftar */
async function daftar(isi, sk) {
  const S = {status: "semua", baris: null, kej: new Map()}, pj = penjaga();
  sk.periode = () => { const sampai = tglWib(); return {dari: geser(sampai, -30), sampai}; };
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"});
  const kart = kartu({ey: [ik("gelombang", 12), "Kaji cepat"], judul: ["Kaji cepat ", hl("menunggu"), " data"], isi: [ctl, hasil], id: "daftar"}), judul = kart.querySelector("h3");
  ctl.append(seg([["semua", "Semua", "semua"], ...Object.entries(STATUS).map(([v, [t, i]]) => [v, t, i])], S.status, v => { S.status = v; gambar(); }, "Status kaji"));

  function gambar() {
    const semua = S.baris ?? [], rows = semua.filter(r => S.status === "semua" || r.status === S.status), dihitung = semua.filter(r => rentangSah(r.ringkas?.rentang)), tunggu = semua.filter(r => r.status === "menunggu_data");
    judul.replaceChildren(...(S.baris == null ? ["Kaji cepat ", hl("menunggu"), " data"] : semua.length ? [hl(angka(dihitung.length)), " kaji punya perkiraan, ", hl(angka(tunggu.length)), " menunggu data"] : ["Belum ada ", hl("kaji cepat"), " pada 30 hari terakhir"]));
    if (!rows.length) return kosongkan(hasil).append(kead("kosong", {teks: semua.length ? "Tidak ada kaji dengan status ini. Ubah status." : "Belum ada kaji cepat pada 30 hari terakhir. Perkiraan muncul setelah gempa M5 ke atas atau banjir aktif dihitung."}));
    const t = h("tbody", {});
    for (const r of rows) {
      const k = S.kej.get(r.kejadian_id) ?? {}, href = `/siklus/kaji/${r.id}`, rt = rentangTeks(r.ringkas?.rentang), gempa = r.model === "gempa";
      const tr = h("tr", {class: "klik", "data-tip": tip(r.kejadian_id, ["Model", gempa ? "gempa (PAGER dan ITB)" : r.model === "banjir_gfm" ? "banjir, genangan radar" : "banjir jam pertama"], ["Versi", String(r.versi)], ["Diubah", wib(r.diubah)])},
        h("td", {}, h("a", {href}, r.kejadian_id), r.dummy ? h("span", {class: "sk-contoh", title: "Baris dummy untuk contoh layar"}, "contoh") : null), h("td", {}, namaJenis(k.jenis ?? (gempa ? "gempa" : "banjir"))), h("td", {}, k.kab4 ? wilayah(k.kab4) : "wilayah belum terpetakan"),
        h("td", {class: "t"}, statusPil(r.status)),
        h("td", {class: "t"}, rt ? [h("span", {class: "num"}, rt), " ", pil("estimasi-model", {x: r.galat_kalibrasi?.kalibrasi != null ? kom(r.galat_kalibrasi.kalibrasi) : "belum tertulis"})] : [h("span", {}, "menunggu data"), " ", pil("menunggu", {ditunggu: gempa ? "grid ShakeMap USGS" : r.model === "banjir_gfm" ? "lintasan radar dan data bangunan" : "kecamatan Siaga atau Awas"})]),
        h("td", {class: "t"}, gempa ? [h("span", {}, "menunggu"), " ", pil("menunggu", {ditunggu: "kurva kerapuhan resmi"})] : [h("span", {}, "belum ada perkiraan"), " ", pil("menunggu", {ditunggu: "kedalaman genangan"})]));
      tr.addEventListener("click", e => { if (e.target.closest("a,button")) return; tr.setAttribute("aria-current", "true"); G.nanti(() => { location.href = href; }); });
      t.append(tr);
    }
    const th = (a, d) => h("th", {title: d}, a);
    kosongkan(hasil).append(h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("KJ", "Nomor kejadian Buku Besar"), th("Jenis", "Jenis bencana"), th("Wilayah", "Kabupaten atau kota menurut kode BPS"), th("Status", "Status pemeriksaan kaji"),
      th("Jiwa (rentang)", "Gempa: korban jiwa; banjir: jiwa terpapar jam pertama. Dua ujung rentang, estimasi model, bukan angka resmi"), th("Rumah rusak", "Gempa menunggu kurva kerapuhan resmi; banjir menunggu kedalaman genangan"))), t)));
  }

  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    const p = sk.periode(), r = await api("/api/siklus/kejadian?" + new URLSearchParams({dari: p.dari, sampai: p.sampai, batas: 100}));
    if (!pj.terbaru(n)) return;
    if (!r.ok) return kosongkan(hasil).append(kead_dari(r, muat));
    const kej = (r.j?.baris ?? []).filter(x => /gempa|banjir/.test(x.jenis)).slice(0, MAKS_KEJADIAN);   // ponytail: kaji dibaca per kejadian (indeks sk_kaji_kej), tanpa pindai; naikkan bila rute daftar menyeluruh dibuat
    S.kej = new Map(kej.map(x => [x.id, x]));
    const per = await Promise.all(kej.map(x => api(`/api/siklus/kaji?kejadian_id=${encodeURIComponent(x.id)}`)));
    if (!pj.terbaru(n)) return;
    S.baris = per.flatMap(x => x.ok ? x.j?.baris ?? [] : []).sort((a, b) => b.diubah - a.diubah);
    if (per.length && per.every(x => !x.ok)) return kosongkan(hasil).append(kead_dari(per[0], muat));
    gambar();
  }
  isi.replaceChildren(kart); muat();
}

/* ================================================================ detail */
let bersihPeta = null;   // peta MapLibre kaji yang sedang tampil; dibuang sebelum layar digambar ulang
async function detail(isi, sk, sid) {
  bersihPeta?.(); bersihPeta = null;
  sk.periode = () => ({kaji: sid}); isi.replaceChildren(kead("memuat"));
  const [P, r] = await Promise.all([peran(), api(`/api/siklus/kaji/${sid}`)]);
  if (!r.ok) return isi.replaceChildren(kartu({ey: "Kaji cepat", judul: ["Kaji ", hl("belum bisa dibuka")], isi: [kead_dari(r, () => detail(isi, sk, sid), "Kaji tidak ada atau di luar wilayah kamu")]}));
  isi.replaceChildren(...gambarDetail(r.j, P, () => detail(isi, sk, sid)));
}

function blokModel(rk, ringkas) {
  const m = ringkas?.model ?? {}, pg = rentangSah(m.pager), itb = rentangSah(m.itb), maks = Math.max(...[rk, pg, itb].map(rentangSah).filter(Boolean).map(x => x[1]), 0);
  if (!pg && !itb) return null;
  const kelas = ringkas?.kelas ? ` Kelas siaga PAGER: ${ringkas.kelas}.` : "";
  const tanpa = bilangan(ringkas?.jumlah_kec_tanpa_mmi) && ringkas.jumlah_kec_tanpa_mmi > 0 ? ` ${angka(ringkas.jumlah_kec_tanpa_mmi)} kecamatan tidak punya nilai MMI dari kontur (di luar cincin tertutup atau terpotong tepi grid) dan tidak ikut dihitung.` : "";
  return wadah("Dasar model, berdampingan", h("div", {class: "sk-ber"},
    h("div", {}, h("small", {}, "PAGER"), h("b", {}, rentangTeks(pg) ?? "menunggu"), bilah(pg, maks, "PAGER"), pil("estimasi-model", {}, "Koefisien Indonesia (fatality.xml v2.2), pita kali dan bagi 4 (asumsi kebijakan)")),
    h("div", {}, h("small", {}, "ITB"), h("b", {}, itb ? angka(itb[0]) : "menunggu"), bilah(itb, maks, "ITB"), pil("estimasi-model", {}, "Model ITB Indonesia, satu nilai tanpa pita"))),
  para(`Dua model tidak digabung dan tidak dirata-rata. Rentang di atas memakai batas bawah terendah dan batas atas tertinggi keduanya.${kelas} Tidak dihitung: tsunami dan likuefaksi.${tanpa}`));
}

function blokGalat(g) {
  if (!g || !bilangan(g.kalibrasi) || !bilangan(g.faktor_loo)) return wadah("Galat kalibrasi", para("Galat kalibrasi belum tertulis untuk kaji ini."), pil("menunggu", {ditunggu: "galat kalibrasi"}));
  const pita = bilangan(g.pita) ? g.pita : (typeof KONST !== "undefined" ? KONST.PITA : 4), lewat = g.faktor_loo > pita;
  const cak = Array.isArray(g.cakupan) && bilangan(g.cakupan[0]) && bilangan(g.cakupan[1]) ? ` Pengamatan jatuh di dalam pita model pada ${angka(g.cakupan[0])} dari ${angka(g.cakupan[1])} gempa, jadi cakupan rentang rendah.` : "";
  return wadah("Galat kalibrasi", para(`Ini galat model kerapuhan sendiri, bukan PAGER atau ITB; PAGER dan ITB belum diuji balik. Kalibrasi ${kom(g.kalibrasi)}, faktor LOO ${kom(g.faktor_loo)}: model dapat meleset sampai ${angka(Math.round(g.faktor_loo))} kali (lebih besar atau lebih kecil dari pengamatan), diuji pada ${angka(g.n_gempa) ?? "beberapa"} gempa kerak, pengalinya disetel pada gempa yang sama (in-sample).${cak}`),
    lewat ? h("p", {class: "sk-para", role: "note"}, `Peringatan: faktor ${kom(g.faktor_loo)} melebihi pita ${kom(pita)} pada rentang, jadi rentang bisa terlalu sempit. Rentang tidak dilebarkan karena cara menerapkannya belum bersumber.`) : null,
    pil("hipotesis", {}, "Uji balik belum punya ambang lolos, jadi angka dibaca sebagai hipotesis kerja"));
}

function blokMeja(meja, rk, tanpaModel = false) {
  const baris = meja?.baris ?? [];
  if (!baris.length) return wadah("Bandingkan dengan petugas", para("Belum ada isian petugas meja kaji cepat pada wilayah dan jendela waktu kejadian ini."), pil("menunggu", {ditunggu: "isian petugas BPBD"}));
  const maks = baris.map(b => b.meninggal).filter(bilangan).reduce((a, b) => Math.max(a, b), -1), band = maks >= 0 ? bandingRentang(maks, rk) : null;
  const kal = band ? (band.arah === "di dalam" ? "berada di dalam rentang model" : `${angka(band.selisih)} ${band.arah} ${band.arah === "di bawah" ? "batas bawah" : "batas atas"} rentang model`) : null;
  const sel = x => x == null ? "tidak ada" : angka(x);
  const t = h("tbody", {}, baris.map(b => h("tr", {}, h("td", {}, [b.kec, b.desa].filter(Boolean).join(", ") || "tidak tertulis"), h("td", {class: "t"}, tgl(b.tanggal) ?? "tidak ada"), h("td", {class: "n"}, sel(b.meninggal)), h("td", {class: "n"}, sel(b.hilang)), h("td", {class: "n"}, sel(b.luka)), h("td", {class: "n"}, sel(b.mengungsi)),
    h("td", {class: "n"}, `${sel(b.rumah_rb)} / ${sel(b.rumah_rs)} / ${sel(b.rumah_rr)}`))));
  const th = (a, d) => h("th", {title: d}, a);
  return wadah("Bandingkan dengan petugas", h("div", {class: "sk-ber"}, tanpaModel ? null : h("div", {}, h("small", {}, "Model"), h("b", {}, rentangTeks(rk) ?? "menunggu"), pil("estimasi-model")), h("div", {}, h("small", {}, "Isian petugas terbesar"), h("b", {}, maks >= 0 ? angka(maks) : "tidak ada"), pil(maks >= 0 ? "terverifikasi" : "menunggu", {siapa: "petugas BPBD (meja kaji cepat)", waktu: "isian terbaru"})),
    h("div", {class: "sk-sel"}, tanpaModel ? "Isian petugas berdampingan dengan perkiraan radar; angka jiwa terpapar di sini bukan padanan jumlah korban, jadi tidak dibandingkan dan tidak dijumlah." : kal ? `Isian terbesar ${kal}. Tidak dijumlah dengan hasil model.` : "Tidak ada isian meninggal untuk dibandingkan.")),
    h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Wilayah", "Kecamatan dan desa menurut isian petugas"), th("Tanggal", "Tanggal isian"), th("Meninggal", "Isian petugas, bukan hasil model"), th("Hilang", "Isian petugas"), th("Luka", "Isian petugas"), th("Mengungsi", "Isian petugas"), th("Rumah RB / RS / RR", "Rusak berat, sedang, ringan menurut isian petugas"))), t)),
    para(meja.catatan ?? "Isian petugas BPBD, bukan hasil model; angka berdampingan, tidak dijumlah."));
}

function gambarDetail(d, P, ulang) {
  const k = d.kaji, kj = d.kejadian, ringkas = k.ringkas ?? {}, hasil = d.hasil, gempa = k.model === "gempa", [metrik, kata] = MODEL[k.model] ?? ["Jiwa", "jiwa"];
  const rk = rentangSah(ringkas.rentang), tunggu = k.status === "menunggu_data", sem = hasil?.sementara ?? null;
  const gfm = k.model === "banjir_gfm";
  const judul = gfm ? "Kaji cepat banjir dari radar satelit" : tunggu ? [hl("Menunggu grid USGS"), ", belum ada perkiraan ", kata] : rk ? [kata.replace(/^./, c => c.toUpperCase()), " diperkirakan ", hl(angka(rk[0])), " sampai ", hl(angka(rk[1])), gempa ? ", rumah rusak menunggu" : ", kerusakan menunggu kedalaman genangan"] : ["Perkiraan ", kata, " ", hl("belum ada")];
  const barisStatus = h("div", {class: "sk-baris"}, statusPil(k.status), pil("estimasi-model", {x: k.galat_kalibrasi?.kalibrasi != null ? kom(k.galat_kalibrasi.kalibrasi) : "belum tertulis"}), h("span", {}, `Versi ${k.versi}, ${tunggu ? "jam ambil terakhir" : "dihitung"} ${wib(k.dihitung) ?? "tidak ada"}`));
  const aksi = h("div", {class: "sk-aksi"});
  const ganti = async ke => {
    const v = ke === "ditarik" ? await tanya({judul: "Tarik kaji ini", teks: "Kaji yang ditarik tidak dipakai lagi; versi baru dari pipeline menggantikannya.", kolom: [{nama: "alasan", label: "Alasan (wajib, 3 sampai 300 karakter)", jenis: "area", wajib: true, maks: 300}], ya: "Tarik", bahaya: true}) : {};
    if (!v) return;
    const lama = barisStatus.firstChild, baru = statusPil(ke); lama.replaceWith(baru);   // pil berganti seketika
    const x = await api(`/api/siklus/kaji/${k.id}/status`, {metode: "POST", badan: {ke, ...(v.alasan ? {alasan: v.alasan} : {})}});
    if (!x.ok) { baru.replaceWith(lama); return toast(x.j?.galat || "Status belum bisa diubah"); }
    toast("Status kaji diubah"); G.nanti(ulang);
  };
  if (P.pd || P.ko) for (const ke of LANGKAH[k.status] ?? []) aksi.append(tombol(STATUS[ke][0] === "Ditarik" ? "Tarik" : STATUS[ke][0], ke === "ditarik" ? "bahaya" : "utama", () => ganti(ke), ke === "ditarik" ? "silang" : ke === "dipakai" ? "centang" : "mata", STATUS[ke][2]));
  const kepala = kartu({ey: [ik("gelombang", 12), "Kaji cepat"], id: "kj-kepala", judul, isi: [barisStatus, aksi,
    k.alasan_tarik ? para(`Ditarik: ${k.alasan_tarik}`) : null,
    h("div", {class: "sk-baris"}, h("a", {href: `/siklus/kejadian/${kj.id}`, "data-aksi": "biasa"}, `Buka kejadian ${kj.id}`), h("a", {href: "/siklus/kaji", "data-aksi": "biasa"}, "Kembali ke daftar"))]});

  if (gfm) return [kepala, ...detailGfm(d, k.id, f => { bersihPeta = f; })];
  const maks = rk ? rk[1] : 0, kiri = [];
  kiri.push(kartu({ey: [ik("gelombang", 12), "Rentang"], id: "kj-rentang", judul: [metrik, " ", rk ? ["antara ", hl(angka(rk[0])), " dan ", hl(angka(rk[1]))] : hl("menunggu data")], isi: [
    wadah(metrik, bilah(rk, maks, metrik), para(rk ? "Dua ujung rentang selalu tampil; tidak ada angka tunggal. Hanya jumlah jiwa, bukan daftar orang." : "Belum ada perkiraan: grid ShakeMap USGS belum terbit atau gagal diambil. Ini bukan nol."), pil(rk ? "estimasi-model" : "menunggu", {x: k.galat_kalibrasi?.kalibrasi != null ? kom(k.galat_kalibrasi.kalibrasi) : "belum tertulis", ditunggu: "grid ShakeMap USGS"})),
    gempa ? wadah("Rumah rusak", h("p", {class: "sk-para"}, "menunggu"), para(hasil?.rumah_rusak?.alasan ? `Belum ada perkiraan: ${hasil.rumah_rusak.alasan}.` : "Belum ada perkiraan: kurva kerapuhan resmi tidak ditemukan."), pil("menunggu", {ditunggu: "kurva kerapuhan resmi"})) : null,
    tunggu && sem ? wadah("Perkiraan sementara", h("div", {class: "sk-ber"}, h("div", {}, h("small", {}, "Model guncangan sendiri"), h("b", {}, rentangTeks(sem.rentang) ?? "menunggu"), pil("estimasi-model"))), para("Dihitung dari model guncangan kita sendiri selama menunggu ShakeMap USGS. Bukan angka resmi dan bukan pengganti ShakeMap.")) : null]}));
  if (gempa) kiri.push(kartu({ey: [ik("timbangan", 12), "Dasar model"], id: "kj-model", judul: ["PAGER dan ITB ", hl("berdampingan"), ", tidak digabung"], isi: [blokModel(rk, ringkas) ?? kead("kosong", {teks: tunggu ? "Dasar model muncul setelah grid terbit." : "Rincian model belum tertulis di ringkasan kaji ini."}), blokGalat(k.galat_kalibrasi)]}));
  else kiri.push(kartu({ey: [ik("banjir", 12), "Dasar banjir"], id: "kj-model", judul: ["Poligon kejadian aktif ", hl("dikali paparan"), ", batas atas jam pertama"], isi: [blokBanjir(hasil)]}));

  const kanan = [kartu({ey: [ik("jiwa", 12), "Petugas"], id: "kj-meja", judul: ["Model dan petugas ", hl("berdampingan")], isi: [blokMeja(d.meja, rk)]}),
    kartu({ey: [ik("tanya", 12), "Berkas hasil"], id: "kj-hasil", judul: ["Berkas hasil ", hl(d.hasil_status === "ada" ? "terbaca" : "belum terbaca")], isi: [d.hasil_status === "ada" ? para(`Berkas hasil memuat masukan ${hasil?.masukan?.sumber ?? "tidak tertulis"} ${hasil?.masukan?.id ?? ""}, waktu data ${hasil?.masukan?.waktu_data ?? "tidak tertulis"}.${d.hasil_selaras === false && hasil?.versi != null ? " Berkas ini dari versi lain." : ""}`) : kead("kosong", {teks: d.hasil_status === "rusak" ? "Berkas hasil rusak; ringkasan di database tetap dipakai." : d.hasil_status === "terlalu_besar" ? "Berkas hasil terlalu besar untuk dibuka di sini." : "Berkas hasil belum ada; ringkasan di database tetap dipakai."})]})];
  return [kepala, h("div", {class: "sk-detail"}, h("div", {}, kiri), h("div", {}, kanan))];
}

function blokBanjir(hasil) {
  if (!hasil) return kead("kosong", {teks: "Rincian banjir belum terbaca."});
  const j = hasil.jiwa_terpapar ?? {}, label = {worldpop: "WorldPop", dukcapil: "Dukcapil", ghsl: "GHSL"}, ada = Object.keys(label).filter(s => s in j);
  return wadah("", ada.length ? h("div", {class: "sk-ber"}, ada.map(s => h("div", {}, h("small", {}, label[s]), h("b", {}, angka(j[s]) ?? "tidak ada"), pil(j[s] == null ? "menunggu" : "estimasi-model", {ditunggu: "jiwa dari sumber ini"})))) : null,
    para(hasil.batas_atas_jam1 != null ? `Batas atas jam pertama ${angka(hasil.batas_atas_jam1)} jiwa: seluruh kecamatan Siaga atau Awas, bukan hanya bagian yang tergenang.` : "Batas atas jam pertama belum ada: daftar kecamatan Siaga atau Awas belum tersedia."),
    para(hasil.kerusakan?.status === "kedalaman belum tersedia" ? "Kerusakan: kedalaman belum tersedia, jadi kurva kerusakan belum dijalankan." : hasil.kerusakan?.euro_2010 != null ? `Kerusakan hunian ${angka(hasil.kerusakan.euro_2010)} euro (harga 2010); rupiah menunggu kurs dan faktor harga.` : "Kerusakan menunggu kedalaman genangan."),
    para(hasil.catatan ?? "Poligon kejadian aktif bukan genangan terukur: ini paparan, bukan dampak."));
}

/* ================================================================ genangan radar (banjir_gfm, GS-11) */
const kth = (a, d) => h("th", {title: d}, a);
const pilRadar = () => h("span", {class: "sk-pil", "data-y": "radar", title: "Perkiraan dari radar Sentinel-1 lewat Copernicus GFM; bukan angka resmi dan bukan hitungan korban"}, ik("gelombang", 12), "perkiraan radar");
const VONIS = {menunggu: "belum dijalankan", lulus: "lulus", gagal: "tidak lulus", tak_dapat_dinilai: "tidak dapat dinilai"};
/* token warna -> "rgb(r, g, b)" untuk MapLibre (tidak membaca oklch) */
function warnaToken(nama) {
  const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d");
  x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(nama).trim() || "gray"; x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${g}, ${b})`;
}

function kartuGenangan(d, rs, lama) {
  const hasil = d.hasil, k = d.kaji, jk = hasil?.jiwa_kab_sah, ambangBawah = Number.isFinite(hasil?.ambang?.zona_bawah) ? Math.round(hasil.ambang.zona_bawah * 100) : "yang ditetapkan model";
  const pilBaris = h("div", {class: "sk-baris"}, pilRadar(), rs.hipotesis ? pil("hipotesis", {}, k.ringkas?.pil ?? "Belum lulus uji balik, dibaca sebagai hipotesis kerja") : pil("estimasi-model"),
    h("span", {class: "sk-pil", "data-y": "radar", title: "Sumber genangan"}, "Copernicus GFM"), lama ? h("span", {class: "sk-pil", "data-y": "radar", title: "Berkas hasil berasal dari versi lain"}, `lintasan ${tglUtc(hasil?.ringkas?.lintasan_terakhir) ?? rs.lintasan ?? "tidak tertulis"}, versi ${hasil?.versi ?? "lain"}`) : null);
  if (hasil == null) return kartu({ey: [ik("gelombang", 12), "Ringkasan"], id: "kj-gfm", judul: "Genangan radar", isi: [pilBaris, d.hasil_status === "rusak" || d.hasil_status === "terlalu_besar"
    ? kead("galat", {teks: d.hasil_status === "rusak" ? "Berkas hasil rusak. Ringkasan di database tetap dipakai." : "Berkas hasil terlalu besar untuk dibuka di sini."})
    : kead("kosong", {teks: `Belum ada lintasan radar sejak ${tglUtc(d.kejadian?.mulai) ?? "kejadian dimulai"}. Angka muncul setelah lintasan Sentinel-1 terbaca.`})]});
  const maks = rs.rentang ? rs.rentang[1] : 0, lain = [["worldpop", "WorldPop"], ["dukcapil", "Dukcapil"], ["ghsl", "GHSL"]].filter(([s]) => jk?.[s]).map(([s, n]) => {
    const r = rentangDari(jk[s]); return r ? `${n} ${rentangTulis(r)}${fmtAngka(jk[s].kab_ikut) ? ` (${fmtAngka(jk[s].kab_ikut)} kabupaten)` : ""}` : `${n} tidak tersedia`;
  });
  return kartu({ey: [ik("gelombang", 12), "Ringkasan"], id: "kj-gfm", judul: "Genangan radar", isi: [pilBaris,
    h("div", {class: "sk-ber"},
      h("div", {}, h("small", {}, "Luas tergenang baru"), h("b", {}, rs.luas ? `${rs.luas} ha` : "belum dihitung"), pil(rs.luas ? "estimasi-model" : "menunggu", {ditunggu: "kabupaten teramati cukup"})),
      h("div", {}, h("small", {}, "Penduduk di area genangan"), h("b", {}, rentangTulis(rs.rentang) ?? "menunggu"), rs.rentang ? bilah(rs.rentang, maks, "Penduduk di area genangan") : null, rs.rentang ? pil("estimasi-model") : pil("menunggu", {ditunggu: "data bangunan"})),
      h("div", {}, h("small", {}, "Kabupaten teramati"), h("b", {}, rs.kabSah != null && rs.kabSemua != null ? `${rs.kabSah} dari ${rs.kabSemua}` : "belum dihitung")),
      h("div", {class: "sk-sel"}, rs.rentang ? `Lintasan terakhir ${rs.lintasan ?? "tidak tertulis"} (UTC). Ujung bawah dari sel yang tergenang paling sedikit ${ambangBawah} persen; ujung atas dari semua sel yang tersentuh genangan. Angka satu sumber, kabupaten teramati saja.` : `Rentang penduduk belum ada: ${alasanRentang(rs.alasanRentang)}.`)),
    lain.length ? para(`Sumber jiwa berdampingan, tidak dijumlah: ${lain.join("; ")}.`) : null, para("Penduduk di area genangan, bukan jumlah korban. Radar satu lintasan dan buta di permukiman padat, jadi angka bisa jauh di bawah kenyataan.")]});
}

function kartuTabel(baris, S, pilihKab) {
  const t = h("tbody", {}), n = x => fmtAngka(x) ?? "tidak ada";
  for (const b of baris) {
    const tr = h("tr", {class: "klik", tabindex: 0, "data-kab4": b.kab4, "aria-current": b.kab4 === S.kab ? "true" : null, "data-tip": tip(b.nama, ["Lintasan (UTC)", b.lintasan ?? "tidak ada"], ["Pembanding (UTC)", b.pra ?? "tidak ada"])},
      h("td", {}, b.nama), h("td", {class: "t"}, b.lintasan ?? "tidak ada"),
      ...(b.sah ? [h("td", {class: "n"}, n(b.baru)), h("td", {class: "n"}, n(b.teramati)), h("td", {class: "n"}, n(b.persenDari)),
        h("td", {class: "n", title: b.kisiKasar ? "Batas atas dari sampel, bisa lebih besar" : null}, b.pend ? [rentangTulis(b.pend), b.kisiKasar ? " (batas atas dari sampel)" : ""] : h("span", {class: "sk-abu"}, alasanKab(b.pendAlasan)))]
        : [h("td", {class: "sk-abu", colspan: 4}, b.teks)]));
    const pilih = () => { for (const x of t.children) x.setAttribute("aria-current", String(x === tr)); G.nanti(() => pilihKab(b.kab4)); };   // sorotan urgent, peta dan citra sesudahnya
    tr.addEventListener("click", e => { if (!e.target.closest("a,button")) pilih(); });
    tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pilih(); } });
    t.append(tr);
  }
  const tidak = baris.filter(b => !b.sah).length;
  return kartu({ey: [ik("bangunan", 12), "Wilayah"], id: "kj-kab", judul: "Per kabupaten", isi: baris.length ? [
    h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, kth("Kabupaten atau kota", "Klik baris untuk membuka kabupaten di peta dan citra"), kth("Lintasan", "Tanggal lintasan radar, UTC"), kth("Tergenang baru (ha)", "Luas yang tergenang pada lintasan dan tidak ada pada citra pembanding"),
      kth("Teramati (persen)", "Bagian luas kabupaten yang teramati radar"), kth("Persen dari teramati", "Tergenang baru dibagi luas teramati"), kth("Penduduk di area genangan", "Rentang bawah sampai atas, WorldPop; bukan korban"))), t)),
    tidak ? para(`${tidak} dari ${baris.length} kabupaten tidak teramati cukup dan tidak ikut dihitung. Itu belum berarti tidak ada genangan di sana.`) : null]
    : [kead("kosong", {teks: "Belum ada kabupaten dengan lintasan radar."})]});
}

function kartuLahan(kab) {
  const lg = lahanGabung(kab), isi = [];
  if (!lg.terbaca) isi.push(kead("kosong", {teks: lg.kabAda || lg.kabTanpa ? "Lahan tergenang belum terbaca untuk kabupaten teramati." : "Belum ada kabupaten teramati, jadi belum ada hitungan lahan."}));
  else {
    const bar = h("div", {class: "sk-lahan", role: "img", "aria-label": "Lahan tergenang per kelas: " + lg.kelas.map(e => `${e.nama} ${fmtAngka(e.ha)} ha`).join(", ")});
    for (const e of lg.kelas) { const i = h("i", {"data-kode": e.kode, "data-tip": tip(e.nama, ["Luas", `${fmtAngka(e.ha)} ha`], ["Bagian", `${fmtPersenKelas(e.persen)} persen`])}); i.style.flexGrow = String(e.ha); bar.append(i); }
    isi.push(bar, h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, kth("Kelas lahan", "Kelas ESA WorldCover 2021"), kth("Luas (ha)", "Hektare titik tergenang di kelas ini"), kth("Persen", "Bagian dari seluruh lahan tergenang"))),
      h("tbody", {}, lg.kelas.map(e => h("tr", {}, h("td", {}, h("span", {class: "sk-sw", "data-kode": e.kode, "aria-hidden": "true"}), e.nama), h("td", {class: "n"}, fmtAngka(e.ha)), h("td", {class: "n"}, fmtPersenKelas(e.persen))))))),
      para(`Dijumlah dari ${lg.kabAda} kabupaten teramati, satu sumber (ESA WorldCover 2021). Kelas terbangun yang kecil bukan bukti permukiman tidak tergenang: radar buta di kota padat.${lg.kabTanpa ? ` ${lg.kabTanpa} kabupaten belum terbaca lahannya.` : ""}`));
  }
  return kartu({ey: [ik("peta", 12), "Dampak"], id: "kj-lahan", judul: "Lahan tergenang", isi});
}

function bagianCitra(kab, sid, S, dasar) {
  const pilihan_ = [...kab].sort((a, b) => (b.sah === true) - (a.sah === true) || String(a.kab).localeCompare(String(b.kab), "id")), badan = h("div", {class: "sk-citra"}), ctl = h("div", {class: "sk-ctl"});
  const gambar = () => {
    const k = kab.find(x => x.kab4 === S.kab); if (!k) return kosongkan(badan).append(kead("kosong", {teks: "Belum ada kabupaten untuk ditampilkan citranya."}));
    const c = citraKab(k, S.jenis, sid); if (c.alasan) return kosongkan(badan).append(kead("kosong", {teks: `${k.kab}: ${c.alasan}.`}));
    const adaGeser = typeof G.Geser?.pasang === "function" && typeof G.Geser?.html === "function";
    if (!adaGeser) return kosongkan(badan).append(h("div", {class: "sk-citra-dua"}, [c.sebelum, c.sesudah].map((x, i) => h("figure", {}, h("img", {src: x.src, alt: i ? "Sesudah" : "Sebelum", loading: "lazy", decoding: "async"}), h("figcaption", {}, `${i ? "Sesudah" : "Sebelum"} ${x.tgl}`)))));
    const w = document.importNode(new DOMParser().parseFromString(G.Geser.html({...c, label: `Geser citra ${k.kab}, sebelum dan sesudah`}), "text/html").body.firstElementChild, true);
    G.Geser.pasang(w); kosongkan(badan).append(w, para(`${k.kab}, citra ${JENIS_CITRA.find(x => x[0] === S.jenis)[1].toLowerCase()}. Tanggal UTC; satu lintasan atau satu adegan, bukan keadaan sepanjang hari.`));
  };
  const kontrol = () => {
    kosongkan(ctl).append(pilihan(pilihan_.map(k => [k.kab4, k.kab ?? k.kab4]), S.kab, v => { S.kab = v; gambar(); dasar(v); }, "Kabupaten untuk citra"), seg(JENIS_CITRA.map(([v, t, i]) => [v, t, i]), S.jenis, v => { S.jenis = v; gambar(); }, "Jenis citra"));
  };
  kontrol(); gambar();
  return {kartu: kartu({ey: [ik("mata", 12), "Bukti"], id: "kj-citra", judul: "Citra sebelum dan sesudah", isi: kab.length ? [ctl, badan] : [kead("kosong", {teks: "Belum ada kabupaten dengan citra."})]}), segar: () => { const sel = ctl.querySelector("select"); if (sel && sel.value !== S.kab) sel.value = S.kab; gambar(); }};
}

/* peta dibuat sekali sesudah kartu atas tercat; ganti kabupaten hanya mengganti sumber GeoJSON */
function kartuPeta(sid, S) {
  const kotak = h("div", {class: "sk-peta", role: "region", "aria-label": "Peta genangan radar"}), info = h("p", {class: "sk-para", role: "status"}, "Peta dimuat sesudah kartu lain tampil.");
  const tampil = h("button", {type: "button", "data-aksi": "biasa", "aria-pressed": "true", title: "Tampilkan atau sembunyikan lapis genangan radar"}, ik("mata", 14), h("span", {}, "Lapis genangan radar"));
  const pj = penjaga(), cache = new Map(); let mapa = null, siap = false;
  const batas = fc => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const f of fc.features) { const c = f.geometry?.coordinates; if (!Array.isArray(c) || c.length < 2) continue; if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0]; if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1]; } return x0 <= x1 ? [[x0, y0], [x1, y1]] : null; };
  async function ke(kab4) {
    if (!siap) return;
    const n = pj.baru(); let fc = cache.get(kab4);
    if (!fc) { const u = polaSel(sid, kab4); const r = u ? await api(u) : null; if (!pj.terbaru(n)) return; if (!r?.ok || r.j?.type !== "FeatureCollection") { mapa.getSource("gfm").setData({type: "FeatureCollection", features: []}); info.textContent = "Sel genangan kabupaten ini belum ada atau belum bisa dimuat. Itu bukan berarti tidak ada genangan."; return; } fc = r.j; cache.set(kab4, fc); }
    mapa.getSource("gfm").setData(fc); const b = batas(fc);
    info.textContent = fc.features.length ? `${fmtAngka(fc.features.length)} titik genangan baru, sel ${fmtAngka(fc.sel_m) ?? "110"} meter.` : "Tidak ada sel genangan pada kabupaten ini.";
    if (b) mapa.fitBounds(b, {padding: 30, maxZoom: 12, duration: 600});
  }
  async function pasang() {
    try { await muatMapLibre(); } catch (e) { info.textContent = "Peta belum bisa dimuat. Tabel dan citra tetap bisa dipakai."; return; }
    const gelap = document.documentElement.dataset.theme === "dark";
    try { mapa = new G.maplibregl.Map({container: kotak, style: `https://tiles.openfreemap.org/styles/${gelap ? "dark" : "positron"}`, bounds: [[94.8, -11.2], [141.2, 6.2]], attributionControl: {compact: true}}); }
    catch (e) { mapa = null; info.textContent = "Peta tidak bisa dibuat di peramban ini (WebGL mati). Tabel dan citra tetap bisa dipakai."; return; }
    mapa.on("load", () => {
      mapa.addSource("gfm", {type: "geojson", data: {type: "FeatureCollection", features: []}});
      mapa.addLayer({id: "gfm-sel", type: "circle", source: "gfm", paint: {"circle-color": warnaToken("--kat-banjir"), "circle-opacity": 0.8, "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 1.5, 10, 3, 13, 8]}});
      siap = true; if (tampil.getAttribute("aria-pressed") !== "true") mapa.setLayoutProperty("gfm-sel", "visibility", "none"); ke(S.kab);
    });
    mapa.on("error", e => { if (!siap) info.textContent = "Peta dasar belum bisa dimuat. Sel genangan tetap dicoba."; });
  }
  tampil.addEventListener("click", () => { const nyala = tampil.getAttribute("aria-pressed") !== "true"; tampil.setAttribute("aria-pressed", String(nyala)); if (siap) mapa.setLayoutProperty("gfm-sel", "visibility", nyala ? "visible" : "none"); });
  G.nanti(pasang);
  return {ke, bersih: () => { pj.baru(); if (mapa) { mapa.remove(); mapa = null; siap = false; } }, kartu: kartu({ey: [ik("peta", 12), "Sebaran"], id: "kj-peta", judul: "Peta genangan", isi: [kotak, h("div", {class: "sk-baris"}, tampil), h("div", {class: "ex-leg"}, h("span", {class: "sk-sw", "data-kode": "air", "aria-hidden": "true"}), "Genangan radar, titik baru per sel"), info]})};
}

function kartuMetode(hasil) {
  const a = hasil?.ambang ?? {}, min = Number.isFinite(a.cakupan_pct_min) ? a.cakupan_pct_min : 10, bawah = Number.isFinite(a.zona_bawah) ? Math.round(a.zona_bawah * 100) : 50, vonis = VONIS[hasil?.ringkas?.vonis ?? "menunggu"] ?? "belum dijalankan";
  const butir = [["Data", "Genangan dari Copernicus Global Flood Monitoring (GFM), turunan radar Sentinel-1. Lahan dari ESA WorldCover 2021. Penduduk dari WorldPop dan Dukcapil, dibagi menurut bangunan Google Open Buildings."],
    ["Deteksi", `Genangan dipakai apa adanya dari GFM. Kita tidak membuat ambang radar sendiri dan tidak menyediakan penyetel ambang. Kabupaten dihitung bila radar mengamati paling sedikit ${min} persen luasnya dan sinyalnya tidak lemah; ambang ini masih hipotesis.`],
    ["Dampak", `Penduduk di area genangan memakai mesin Peta Paparan. Ujung bawah memakai sel 110 meter yang tergenang paling sedikit ${bawah} persen; ujung atas memakai semua sel yang tersentuh genangan. Bangunan terendam tidak ditampilkan di sini.`],
    ["Catatan", `Uji balik: ${vonis}. ${hasil?.keterbatasan_paparan ?? ""} Radar satu lintasan hanya memotret satu saat dan buta di permukiman padat.`.replace(/\s+/g, " ").trim()]];
  return kartu({ey: [ik("tanya", 12), "Cara hitung"], id: "kj-metode", judul: "Metode", isi: h("details", {class: "sk-lipat"}, h("summary", {}, "Empat butir cara menghitung"),
    butir.map(([j, t]) => wadah(j, para(t))), Array.isArray(hasil?.atribusi) && hasil.atribusi.length ? para(`Atribusi data: ${hasil.atribusi.join("; ")}.`) : null)});
}

function detailGfm(d, sid, selesai) {
  const hasil = d.hasil, rs = ringkasKartu(d.kaji.ringkas), kab = Array.isArray(hasil?.kab) ? hasil.kab : [], baris = urutKab(kab), S = {kab: kabAwal(kab), jenis: "radar"};
  const lama = d.hasil_selaras === false && hasil?.versi != null;
  let citra = null, peta = null;
  const pilihKab = kab4 => { S.kab = kab4; citra?.segar(); peta?.ke(kab4); };
  citra = bagianCitra(kab, sid, S, kab4 => { S.kab = kab4; for (const tr of document.querySelectorAll("#kj-kab tr[data-kab4]")) tr.setAttribute("aria-current", String(tr.dataset.kab4 === kab4)); peta?.ke(kab4); });
  peta = kartuPeta(sid, S);
  selesai?.(peta.bersih);
  const kiri = [kartuGenangan(d, rs, lama), kartuTabel(baris, S, pilihKab), kartuLahan(kab), kartuMetode(hasil)];
  const kanan = [peta.kartu, citra.kartu, kartu({ey: [ik("jiwa", 12), "Lapangan"], id: "kj-meja", judul: "Isian petugas", isi: [blokMeja(d.meja, null, true)]})];
  return [h("div", {class: "sk-detail", "data-m": "gfm"}, h("div", {}, kiri), h("div", {}, kanan))];
}
