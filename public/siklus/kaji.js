/* Siklus Bencana F3: daftar Kaji Cepat (DS 3.5) dan satu kaji (DS 3.6). Rute: /api/siklus/kaji, /kaji/:sid, /kaji/:sid/status (src/siklus_kaji.js).
   Keluaran SELALU rentang bawah sampai atas berlabel estimasi model (KA 9); tidak pernah angka tunggal atau resmi. PAGER dan ITB berdampingan (U13). Uji balik tampil apa adanya, tanpa ambang lolos (U18).
   Gagal ambil grid = "menunggu data", bukan nol. Isian petugas meja berdampingan dengan model, tidak dijumlah. Chrome urgent, isi berat lewat nanti() (inti.js). */
import {h, ik, K, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, tombol, tanya, toast, pil, tip, namaJenis, wilayah, angka, tgl, wib, tglWib, geser, peran, penjaga} from "./inti.js";
import {RE_KJ} from "./hitung.js";

const G = globalThis, MAKS_KEJADIAN = 20;
const STATUS = {menunggu_data: ["Menunggu data", "jampasir", "Grid belum terbit atau gagal diambil; belum ada angka"], dihitung: ["Dihitung", "gelombang", "Dihitung otomatis, belum diperiksa petugas"], diperiksa: ["Diperiksa", "mata", "Sudah diperiksa petugas"],
  dipakai: ["Dipakai", "centang", "Dipakai sebagai rujukan kerja"], ditarik: ["Ditarik", "silang", "Ditarik; versi baru menggantikan"]};
const LANGKAH = {dihitung: ["diperiksa", "ditarik"], diperiksa: ["dipakai", "ditarik"], dipakai: ["ditarik"], menunggu_data: ["ditarik"], ditarik: []};
const MODEL = {gempa: ["Korban jiwa", "korban jiwa"], banjir_jam1: ["Jiwa terpapar jam pertama", "jiwa terpapar"]};
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
      const tr = h("tr", {class: "klik", "data-tip": tip(r.kejadian_id, ["Model", r.model === "gempa" ? "gempa (PAGER dan ITB)" : "banjir jam pertama"], ["Versi", String(r.versi)], ["Diubah", wib(r.diubah)])},
        h("td", {}, h("a", {href}, r.kejadian_id), r.dummy ? h("span", {class: "sk-contoh", title: "Baris dummy untuk contoh layar"}, "contoh") : null), h("td", {}, namaJenis(k.jenis ?? (gempa ? "gempa" : "banjir"))), h("td", {}, k.kab4 ? wilayah(k.kab4) : "wilayah belum terpetakan"),
        h("td", {class: "t"}, statusPil(r.status)),
        h("td", {class: "t"}, rt ? [h("span", {class: "num"}, rt), " ", pil("estimasi-model", {x: r.galat_kalibrasi?.kalibrasi != null ? kom(r.galat_kalibrasi.kalibrasi) : "belum tertulis"})] : [h("span", {}, "menunggu data"), " ", pil("menunggu", {ditunggu: gempa ? "grid ShakeMap USGS" : "kecamatan Siaga atau Awas"})]),
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
async function detail(isi, sk, sid) {
  sk.periode = () => ({kaji: sid}); isi.replaceChildren(kead("memuat"));
  const [P, r] = await Promise.all([peran(), api(`/api/siklus/kaji/${sid}`)]);
  if (!r.ok) return isi.replaceChildren(kartu({ey: "Kaji cepat", judul: ["Kaji ", hl("belum bisa dibuka")], isi: [kead_dari(r, () => detail(isi, sk, sid), "Kaji tidak ada atau di luar wilayah kamu")]}));
  isi.replaceChildren(...gambarDetail(r.j, P, () => detail(isi, sk, sid)));
}

function blokModel(rk, ringkas) {
  const m = ringkas?.model ?? {}, pg = rentangSah(m.pager), itb = rentangSah(m.itb), maks = Math.max(...[rk, pg, itb].map(rentangSah).filter(Boolean).map(x => x[1]), 0);
  if (!pg && !itb) return null;
  const kelas = ringkas?.kelas ? ` Kelas siaga PAGER: ${ringkas.kelas}.` : "";
  return wadah("Dasar model, berdampingan", h("div", {class: "sk-ber"},
    h("div", {}, h("small", {}, "PAGER"), h("b", {}, rentangTeks(pg) ?? "menunggu"), bilah(pg, maks, "PAGER"), pil("estimasi-model", {}, "Koefisien Indonesia (fatality.xml v2.2), pita kali dan bagi 4 (asumsi kebijakan)")),
    h("div", {}, h("small", {}, "ITB"), h("b", {}, itb ? angka(itb[0]) : "menunggu"), bilah(itb, maks, "ITB"), pil("estimasi-model", {}, "Model ITB Indonesia, satu nilai tanpa pita"))),
  para(`Dua model tidak digabung dan tidak dirata-rata. Rentang di atas memakai batas bawah terendah dan batas atas tertinggi keduanya.${kelas} Tidak dihitung: tsunami dan likuefaksi.`));
}

function blokGalat(g) {
  if (!g || !bilangan(g.kalibrasi) || !bilangan(g.faktor_loo)) return wadah("Galat kalibrasi", para("Galat kalibrasi belum tertulis untuk kaji ini."), pil("menunggu", {ditunggu: "galat kalibrasi"}));
  const pita = bilangan(g.pita) ? g.pita : (typeof KONST !== "undefined" ? KONST.PITA : 4), lewat = g.faktor_loo > pita;
  return wadah("Galat kalibrasi", para(`Kalibrasi ${kom(g.kalibrasi)}, faktor LOO ${kom(g.faktor_loo)}: model dapat meleset sampai ${angka(Math.round(g.faktor_loo))} kali (lebih besar atau lebih kecil dari pengamatan), diuji pada ${angka(g.n_gempa) ?? "beberapa"} gempa kerak.`),
    lewat ? h("p", {class: "sk-para", role: "note"}, `Peringatan: faktor ${kom(g.faktor_loo)} melebihi pita ${kom(pita)} pada rentang, jadi rentang bisa terlalu sempit. Rentang tidak dilebarkan karena cara menerapkannya belum bersumber.`) : null,
    pil("hipotesis", {}, "Uji balik belum punya ambang lolos, jadi angka dibaca sebagai hipotesis kerja"));
}

function blokMeja(meja, rk) {
  const baris = meja?.baris ?? [];
  if (!baris.length) return wadah("Bandingkan dengan petugas", para("Belum ada isian petugas meja kaji cepat pada wilayah dan jendela waktu kejadian ini."), pil("menunggu", {ditunggu: "isian petugas BPBD"}));
  const maks = baris.map(b => b.meninggal).filter(bilangan).reduce((a, b) => Math.max(a, b), -1), band = maks >= 0 ? bandingRentang(maks, rk) : null;
  const kal = band ? (band.arah === "di dalam" ? "berada di dalam rentang model" : `${angka(band.selisih)} ${band.arah} ${band.arah === "di bawah" ? "batas bawah" : "batas atas"} rentang model`) : null;
  const sel = x => x == null ? "tidak ada" : angka(x);
  const t = h("tbody", {}, baris.map(b => h("tr", {}, h("td", {}, [b.kec, b.desa].filter(Boolean).join(", ") || "tidak tertulis"), h("td", {class: "t"}, tgl(b.tanggal) ?? "tidak ada"), h("td", {class: "n"}, sel(b.meninggal)), h("td", {class: "n"}, sel(b.hilang)), h("td", {class: "n"}, sel(b.luka)), h("td", {class: "n"}, sel(b.mengungsi)),
    h("td", {class: "n"}, `${sel(b.rumah_rb)} / ${sel(b.rumah_rs)} / ${sel(b.rumah_rr)}`))));
  const th = (a, d) => h("th", {title: d}, a);
  return wadah("Bandingkan dengan petugas", h("div", {class: "sk-ber"}, h("div", {}, h("small", {}, "Model"), h("b", {}, rentangTeks(rk) ?? "menunggu"), pil("estimasi-model")), h("div", {}, h("small", {}, "Isian petugas terbesar"), h("b", {}, maks >= 0 ? angka(maks) : "tidak ada"), pil(maks >= 0 ? "terverifikasi" : "menunggu", {siapa: "petugas BPBD (meja kaji cepat)", waktu: "isian terbaru"})),
    h("div", {class: "sk-sel"}, kal ? `Isian terbesar ${kal}. Tidak dijumlah dengan hasil model.` : "Tidak ada isian meninggal untuk dibandingkan.")),
    h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Wilayah", "Kecamatan dan desa menurut isian petugas"), th("Tanggal", "Tanggal isian"), th("Meninggal", "Isian petugas, bukan hasil model"), th("Hilang", "Isian petugas"), th("Luka", "Isian petugas"), th("Mengungsi", "Isian petugas"), th("Rumah RB / RS / RR", "Rusak berat, sedang, ringan menurut isian petugas"))), t)),
    para(meja.catatan ?? "Isian petugas BPBD, bukan hasil model; angka berdampingan, tidak dijumlah."));
}

function gambarDetail(d, P, ulang) {
  const k = d.kaji, kj = d.kejadian, ringkas = k.ringkas ?? {}, hasil = d.hasil, gempa = k.model === "gempa", [metrik, kata] = MODEL[k.model] ?? ["Jiwa", "jiwa"];
  const rk = rentangSah(ringkas.rentang), tunggu = k.status === "menunggu_data", sem = hasil?.sementara ?? null;
  const judul = tunggu ? [hl("Menunggu grid USGS"), ", belum ada perkiraan ", kata] : rk ? [kata.replace(/^./, c => c.toUpperCase()), " diperkirakan ", hl(angka(rk[0])), " sampai ", hl(angka(rk[1])), gempa ? ", rumah rusak menunggu" : ", kerusakan menunggu kedalaman genangan"] : ["Perkiraan ", kata, " ", hl("belum ada")];
  const barisStatus = h("div", {class: "sk-baris"}, statusPil(k.status), pil("estimasi-model", {x: k.galat_kalibrasi?.kalibrasi != null ? kom(k.galat_kalibrasi.kalibrasi) : "belum tertulis"}), h("span", {}, `Versi ${k.versi}, ${tunggu ? "jam ambil terakhir" : "dihitung"} ${wib(k.dihitung) ?? "tidak ada"} WIB`));
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
