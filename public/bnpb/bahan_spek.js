/* Bahan laporan harian lewat form (pemilik 3 Nov 2026: "inputannya via web kaya google form, tinggal pilih").
   SPEK BERSAMA peramban dan Worker (pola laporan_karhutla_spek.js). Modul ES murni, tanpa DOM, tanpa D1, tanpa fetch.
   Isian terstruktur -> teks WA berformat baku yang SAMA dengan kiriman WA Koordalops/BMKG/PVMBG/Satgas, supaya teks itu masuk
   kotak masuk WA (wa_masuk) dan seluruh jalur yang sudah ada (bot scripts/wa/otomatis.mjs, layar /laporan-bnpb, generator
   data/laporan-bnpb/generator/wa_harian.py dan wa_operasi.py) memakainya tanpa diubah.
   Bentuk teks dijaga tests/warga/wa_form.test.mjs: teks hasil susun() diurai ulang oleh pengurai Python asli dan harus kembali ke isian.
   Peramban: const S = await import("/bnpb/bahan_spek.js"). Worker: import dari ../public/bnpb/bahan_spek.js. */

/* sama persis dengan PROV di src/alun.js (dijaga uji) */
export const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
  "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten",
  "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur",
  "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
  "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
export const KUNCI = ["rekap_koordalops_24", "bmkg_pagi", "pvmbg_pagi", "satgas"];
export const PRIORITAS = ["61", "62", "63", "16", "14", "15"];   // urutan WA satgas: Kalbar, Kalteng, Kalsel, Sumsel, Riau, Jambi
export const JENIS = {banjir: "Banjir", longsor: "Tanah Longsor", gelombang_pasang: "Gelombang Pasang dan Abrasi", cuaca: "Cuaca Ekstrem", kekeringan: "Kekeringan",
  karhutla: "Kebakaran Hutan dan Lahan", gempabumi: "Gempa Bumi", tsunami: "Tsunami", gunungapi: "Erupsi Gunung Api", wabah: "Epidemi dan Wabah Penyakit",
  kebakaran_permukiman: "Kebakaran Permukiman", kecelakaan: "Gagal teknologi", konflik_sosial: "Konflik Sosial", lainnya: "Kejadian Lainnya"};
const NON_ALAM = new Set(["wabah", "kebakaran_permukiman", "kecelakaan", "konflik_sosial", "lainnya"]);
export const PEMILIK = ["BNPB", "TNI", "Kemenhut", "Pemda", "PT Sinarmas"];
export const INTENSITAS = ["ringan", "ringan hingga sedang", "sedang", "sedang hingga lebat", "lebat"];
export const JENIS_GEMPA = ["Letusan/Erupsi", "Guguran", "Hembusan", "Harmonik", "Tremor Menerus", "Tremor Non-Harmonik", "Hybrid/Fase Banyak", "Low Frequency",
  "Vulkanik Dangkal", "Vulkanik Dalam", "Tektonik Lokal", "Tektonik Jauh", "Getaran Banjir"];
export const STASIUN = ["PANGKALANBUN", "PALANGKARAYA", "SAMPIT", "TALANG BETUTU PALEMBANG", "MUSI 2 PALEMBANG", "KOTA JAMBI", "MUARO JAMBI", "PEKANBARU", "DUMAI",
  "SAMARINDA", "BALIKPAPAN", "BANJARBARU", "KOTABARU", "PONTIANAK", "KUBU RAYA", "MEMPAWAH", "SINTANG", "KETAPANG", "PESAWARAN", "BANDAR LAMPUNG", "PANGKAL PINANG",
  "KEMAYORAN", "SEMARANG", "MALANG", "MEDAN", "KOTA BATAM", "KOTOTABANG", "MAROS", "LORE LINDU", "PALU", "SORONG", "MERAUKE"];   // dari WA BMKG 23 Okt-3 Nov 2026
const ANGKA_KEJADIAN = ["md", "hilang", "luka", "mengungsi_jiwa", "mengungsi_kk", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "luas_ha"];

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI_MS = 864e5;

/* ---------------- format ---------------- */
const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
export function terbilang(n) {
  if (n === 0) return "nol";
  const t = x => x < 12 ? SATUAN[x] : x < 20 ? t(x - 10) + " belas" : x < 100 ? t(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + t(x % 10) : "")
    : x < 200 ? "seratus" + (x - 100 ? " " + t(x - 100) : "") : x < 1000 ? t(Math.floor(x / 100)) + " ratus" + (x % 100 ? " " + t(x % 100) : "")
    : x < 2000 ? "seribu" + (x - 1000 ? " " + t(x - 1000) : "") : t(Math.floor(x / 1000)) + " ribu" + (x % 1000 ? " " + t(x % 1000) : "");
  return t(n);
}
/* angka gaya Indonesia: titik ribuan, koma desimal, paling banyak 2 desimal (pengurai Python angka() membaca balik) */
export const ribu = v => { const [b, d] = String(Math.round(v * 100) / 100).split("."); return b.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : ""); };
const tgl = iso => new Date(iso + "T00:00:00Z");
const geser = (iso, hari) => new Date(tgl(iso).getTime() + hari * HARI_MS).toISOString().slice(0, 10);
const tglHari = iso => { const d = tgl(iso); return `${HARI[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const tglTeks = iso => { const d = tgl(iso); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const tglGaris = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/* "A", "A dan B", "A, B, dan C" (pengurai wa_harian dan wa_operasi memecah koma dan "dan") */
export const daftarKata = a => a.length < 3 ? a.join(" dan ") : a.slice(0, -1).join(", ") + ", dan " + a.at(-1);
/* kategori PM2.5 BMKG (µg/m³) */
export const kategoriPm = v => v <= 15.5 ? "Baik" : v <= 55.4 ? "Sedang" : v <= 150.4 ? "Tidak Sehat" : v <= 250.4 ? "Sangat Tidak Sehat" : "Berbahaya";

/* ---------------- validasi: lempar {galat}; periksa() menangkapnya ---------------- */
const tolak = galat => { throw {galat}; };
const KONTROL = /[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮﻿]/g;
/* teks bebas satu baris: tanpa karakter kontrol, tanpa markah WA (* _) yang memecah pengurai, spasi dirapatkan */
const kalimat = (v, nama, maks, wajib = false) => {
  if (v == null || v === "") { if (wajib) tolak(`${nama} wajib diisi`); return ""; }
  if (typeof v !== "string") tolak(`${nama} harus teks`);
  const t = v.normalize("NFC").replace(KONTROL, "").replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
  if (wajib && !t) tolak(`${nama} wajib diisi`);
  if (t.length > maks) tolak(`${nama} maksimal ${maks} karakter`);
  /* teks ini masuk laporan resmi dan kadang folder harian repo publik: tanpa nomor HP pribadi dan NIK (nomor kantor berkode area tetap boleh) */
  if (/(?:\+?62|(?<!\d)0)\s*8\d(?:\D{0,2}\d){7,11}/.test(t) || /(?<!\d)\d{16}(?!\d)/.test(t)) tolak(`${nama} tidak boleh memuat nomor HP atau NIK`);
  return t;
};
const nama = (v, label, pola) => { const t = kalimat(v, label, 60, true); if (!pola.test(t)) tolak(`${label} "${t}" tidak sah`); return t; };
const bil = (v, label, maks, bulat = true) => {
  if (v == null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || (bulat && !Number.isInteger(v))) tolak(`${label} harus ${bulat ? "bilangan bulat" : "angka"} >= 0`);
  if (v > maks) tolak(`${label} melewati batas ${ribu(maks)}`);
  return v;
};
const tglSah = (v, label) => {
  if (typeof v !== "string" || !/^\d{4}-\d\d-\d\d$/.test(v) || Number.isNaN(tgl(v).getTime()) || tgl(v).toISOString().slice(0, 10) !== v) tolak(`${label} harus YYYY-MM-DD yang sah`);
  return v;
};
const larik = (v, label, min, maks) => { if (!Array.isArray(v) || v.length < min || v.length > maks) tolak(`${label} harus berisi ${min}-${maks} baris`); return v; };
const prov = (v, label) => { if (typeof v !== "string" || !Object.hasOwn(PROV, v)) tolak(`${label}: provinsi tidak dikenal`); return v; };
const provUnik = (v, label) => { const a = (v ?? []).map((k, i) => prov(k, `${label} ${i + 1}`)); if (new Set(a).size !== a.length) tolak(`${label}: provinsi dobel`); return a; };
const jam = v => { if (typeof v !== "string" || !/^(0\d|1[0-2])\.[0-5]\d$/.test(v)) tolak("jam harus HH.MM pagi (00.00-12.59), mis. 06.00"); return v; };
const RE_KAB = /^[A-Z][A-Za-z0-9 .'()-]{1,58}$/;
const RE_STASIUN = /^[A-Z][A-Z0-9 .]{1,39}$/, RE_GUNUNG = /^[A-Z][A-Za-z .'-]{1,39}$/, RE_GEMPA = /^[A-Za-z][A-Za-z /-]{1,39}$/;

/* ---------------- Koordalops 24 jam (dari Logbook Pusdalops) ---------------- */
function koordalops(o) {
  const sampai = tglSah(o.sampai, "sampai"), dari = geser(sampai, -1);
  const kej = larik(o.kejadian, "kejadian", 1, 60).map((x, i) => {
    const l = `kejadian ${i + 1}`;
    if (!x || typeof x !== "object") tolak(`${l} harus objek`);
    if (!Object.hasOwn(JENIS, x.jenis)) tolak(`${l}: jenis tidak dikenal`);
    const kab = x.kab ? nama(String(x.kab).replace(/^(Kab\.|Kabupaten)\s+/, ""), `${l}: kab/kota`, RE_KAB) : "";
    const e = {jenis: x.jenis, prov: prov(x.prov, l), kab, baru: x.baru === true};
    for (const k of ANGKA_KEJADIAN) e[k] = bil(x[k], `${l}: ${k}`, k === "luas_ha" ? 3e6 : 2e6, k !== "luas_ha");
    e.status_darurat = kalimat(x.status_darurat, `${l}: penetapan status`, 200);
    e.pendampingan = kalimat(x.pendampingan, `${l}: pendampingan BNPB`, 100);
    e.kondisi = kalimat(x.kondisi, `${l}: kondisi mutakhir`, 1000);
    e.detail = kalimat(x.detail, `${l}: detail`, 120);
    return e;
  });
  const provs = [...new Set(kej.map(x => x.prov))].sort();
  if (provs.length > 26) tolak("paling banyak 26 provinsi (huruf A-Z)");
  const laporan = bil(o.laporan ?? kej.length, "jumlah laporan kejadian", 999);
  if (laporan < kej.length) tolak("jumlah laporan kejadian tidak boleh lebih kecil dari kejadian menonjol");
  const isi = {sampai, laporan, kejadian: kej};
  const n = (v, s) => `${ribu(v)} ${s}`;
  const dampak = e => {
    const korban = [e.md && n(e.md, "jiwa MD"), e.hilang && n(e.hilang, "jiwa hilang"), e.luka && n(e.luka, "jiwa luka-luka")].filter(Boolean);
    const ungsi = e.mengungsi_jiwa ? n(e.mengungsi_jiwa, "jiwa mengungsi") + (e.mengungsi_kk ? ` (${ribu(e.mengungsi_kk)} kepala keluarga)` : "")
      : e.mengungsi_kk ? `${ribu(e.mengungsi_kk)} kepala keluarga mengungsi` : "";   // tanpa singkatan KK: pengurai membaca "N KK" sebagai KK terdampak
    const rumah = [e.rumah_rb && n(e.rumah_rb, "unit rumah RB"), e.rumah_rs && n(e.rumah_rs, "unit rumah RS"), e.rumah_rr && n(e.rumah_rr, "unit rumah RR"), e.rumah_terendam && n(e.rumah_terendam, "unit rumah terendam")].filter(Boolean);
    const bag = [e.luas_ha ? `± ${ribu(e.luas_ha)} ha luas lahan terbakar` : "", korban.join(", "), ungsi, rumah.join(", ")].filter(Boolean);
    return bag.length ? bag.join("; ") : "nihil";   // satu baris: pengurai hanya membaca baris "- Dampak:" itu sendiri
  };
  const huruf = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const blok = provs.map((p, i) => {
    const baris = kej.filter(x => x.prov === p).map((e, j) => {
      const lok = e.kab ? `${/^Kota\s/.test(e.kab) ? e.kab : "Kab. " + e.kab}, Prov. ${PROV[p]}` : `Prov. ${PROV[p]}`;
      return [`${j + 1}. ${NON_ALAM.has(e.jenis) ? "Bencana Non Alam" : "Bencana Alam"} ${JENIS[e.jenis]} di ${lok} *(${e.baru ? "Kejadian Baru" : "Pengkinian Data"})*`,
        `- Dampak: ${dampak(e)}`, `- Penetapan Status: ${e.status_darurat || "-"}`, `- Pendampingan BNPB: ${e.pendampingan || "-"}`,
        `- Kondisi Mutakhir: ${e.kondisi || "-"}`, `- Detail: ${e.detail || "Logbook Pusdalops"}`].join("\n");
    });
    return `*${huruf[i]}. Prov. ${PROV[p]}*\n${baris.join("\n\n")}`;
  });
  const teks = ["*Yth. Bapak Kepala BNPB*", "",
    `Mohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal ${tglGaris(dari)} pkl 07.00 WIB s.d ${tglGaris(sampai)} pkl 07.00 WIB sebagai berikut:`, "",
    `1. Laporan kejadian bencana sejumlah ${laporan} (${terbilang(laporan)}) kejadian.`, "",
    `2. Kejadian menonjol/kejadian berdampak signifikan sejumlah ${kej.length} (${terbilang(kej.length)}) kejadian.`, "",
    blok.join("\n\n"), "", "Sumber: form Bahan Laporan Harian (Logbook Pusdalops).", "", "Demikian disampaikan. Mohon arahan."].join("\n");
  return {isi, tanggal: sampai, teks};
}

/* draf isian Koordalops dari GET /api/logbook/hari (periode 07.00-07.00 WIB = tgl sampai-1) + GET /api/logbook/sk/aktif.
   Satu kejadian = entri TERAKHIR di periode (angka dampak entri = nilai terkini). Data dummy tidak ikut. */
const TINGKAT = {siaga: "Siaga Darurat", tanggap: "Tanggap Darurat", transisi: "Transisi Darurat ke Pemulihan"};
export function dariLogbook(entri, sk, sampai) {
  const dari = geser(sampai, -1), akhir = new Map();
  for (const e of entri ?? []) if (!e.dummy && (!akhir.has(e.kejadian_id) || e.waktu >= akhir.get(e.kejadian_id).waktu)) akhir.set(e.kejadian_id, e);
  const skKej = kid => (sk ?? []).filter(s => s.kejadian_id === kid).sort((a, b) => (a.wilayah === "prov" ? 0 : 1) - (b.wilayah === "prov" ? 0 : 1) || (a.tmt_mulai < b.tmt_mulai ? 1 : -1))[0];
  const kejadian = [...akhir.values()].filter(e => Object.hasOwn(PROV, e.prov) && Object.hasOwn(JENIS, e.jenis)).map(e => {
    const s = skKej(e.kejadian_id);
    const status = s ? `${s.perpanjangan_ke ? "Perpanjangan " : ""}${TINGKAT[s.tingkat] ?? s.tingkat}${s.wilayah === "prov" ? " Provinsi" : ""} TMT ${tglGaris(s.tmt_mulai)}${s.tmt_selesai ? " s.d. " + tglGaris(s.tmt_selesai) : ""}` : "";
    const o = {jenis: e.jenis, prov: e.prov, kab: e.kab || "", baru: String(e.kejadian_mulai || "").slice(0, 10) >= dari, status_darurat: status, pendampingan: "",
      kondisi: e.catatan || "", detail: e.kib ? `Logbook Pusdalops, KIB ${e.kib}` : "Logbook Pusdalops"};
    for (const k of ANGKA_KEJADIAN) o[k] = e[k] ?? null;
    return o;
  }).sort((a, b) => a.prov < b.prov ? -1 : a.prov > b.prov ? 1 : a.kab < b.kab ? -1 : 1);
  return {sampai, laporan: kejadian.length, kejadian};
}

/* ---------------- BMKG pagi ---------------- */
function bmkg(o) {
  const tanggal = tglSah(o.tanggal, "tanggal"), j = jam(o.jam ?? "06.00");
  const pm = larik(o.pm, "PM2.5", 5, 15).map((x, i) => ({stasiun: nama(String(x?.stasiun ?? "").toUpperCase(), `stasiun ${i + 1}`, RE_STASIUN), nilai: bil(x?.nilai, `PM2.5 stasiun ${i + 1}`, 2000, false) ?? tolak(`PM2.5 stasiun ${i + 1} wajib diisi`)}));
  const mulai = tglSah(o.periode?.mulai, "periode mulai"), selesai = tglSah(o.periode?.selesai, "periode selesai");
  if (selesai < mulai || tgl(selesai) - tgl(mulai) > 10 * HARI_MS) tolak("periode cuaca harus urut dan paling lama 10 hari");
  const hujan = provUnik(o.hujan, "hujan sedang"), lebat = provUnik(o.lebat, "Siaga hujan lebat"), angin = provUnik(o.angin, "angin kencang");
  const isi = {tanggal, jam: j, pm, periode: {mulai, selesai}, hujan, lebat, angin};
  const a = tgl(mulai), b = tgl(selesai);
  const periode = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear() ? `${a.getUTCDate()} – ${tglTeks(selesai)}` : `${a.getUTCDate()} ${BULAN[a.getUTCMonth()]} – ${tglTeks(selesai)}`;
  const nm = a => daftarKata(a.map(k => PROV[k]));
  const cuaca = ["Cuaca di Indonesia umumnya didominasi oleh kondisi hujan dengan intensitas ringan." + (hujan.length ? ` Perlu diwaspadai adanya peningkatan hujan dengan intensitas sedang yang terjadi di ${nm(hujan)}.` : "")];
  if (lebat.length || angin.length) cuaca.push("Selain itu, hujan dengan intensitas lebat yang dapat disertai kilat/petir dan angin kencang dapat terjadi dengan kategori tingkat peringatan dini dan wilayah potensi kejadian sebagai berikut:");
  if (lebat.length) cuaca.push(`Siaga (hujan lebat – sangat lebat): ${nm(lebat)}.`);
  if (angin.length) cuaca.push(`Angin Kencang: ${nm(angin)}.`);
  const teks = ["Selamat Pagi *Bapak Kepala BNPB*,", "Mohon izin Bapak", "", "Berikut kami sampaikan Laporan Meteorologi dan Klimatologi (BMKG):", "",
    `1. Lokasi Konsentrasi PM2.5 Tertinggi pada hari ${tglHari(tanggal)} pukul ${j} WIB (https://link.bmkg.go.id/pm2p5-obs)`, "",
    ...pm.map(x => `- ${x.stasiun} ${x.nilai.toFixed(1)} (${kategoriPm(x.nilai)})`), "",
    "2. Kondisi Cuaca dan Pertumbuhan Awan (https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan)", "", `a. Periode ${periode}`, ...cuaca, "",
    "Sumber: form Bahan Laporan Harian.", "", "Demikian disampaikan, mohon arahan."].join("\n");
  return {isi, tanggal, teks};
}

/* ---------------- PVMBG pagi ---------------- */
function pvmbg(o) {
  const tanggal = tglSah(o.tanggal, "tanggal"), j = jam(o.jam ?? "06.00");
  const lv = {}; for (const k of ["awas", "siaga", "waspada", "normal"]) lv[k] = bil(o.level?.[k] ?? 0, `jumlah Level ${k}`, 200);
  if (!(lv.awas + lv.siaga + lv.waspada + lv.normal)) tolak("jumlah gunung api per level wajib diisi");
  const gunung = larik(o.gunung ?? [], "gunung Level III/IV", 0, 20).map((g, i) => {
    const l = `gunung ${i + 1}`;
    if (!["Awas", "Siaga"].includes(g?.level)) tolak(`${l}: level harus Awas atau Siaga`);
    const baris = (v, lab, min) => larik(v ?? [], `${l}: ${lab}`, min, 15).map((t, k) => kalimat(t, `${l}: ${lab} ${k + 1}`, 600, true));
    return {nama: nama(String(g.nama ?? "").replace(/^(Gn\.|Gunung)\s+/, ""), `${l}: nama`, RE_GUNUNG), level: g.level,
      visual: baris(g.visual, "visual", 1), rekom: baris(g.rekom, "rekomendasi", 1),
      gempa: larik(g.gempa ?? [], `${l}: kegempaan`, 0, 15).map((q, k) => ({jumlah: bil(q?.jumlah, `${l}: jumlah gempa ${k + 1}`, 5000) ?? tolak(`${l}: jumlah gempa ${k + 1} wajib diisi`),
        jenis: nama(q?.jenis, `${l}: jenis gempa ${k + 1}`, RE_GEMPA), rincian: kalimat(q?.rincian, `${l}: rincian gempa ${k + 1}`, 300, true)}))};
  });
  for (const [k, lab] of [["awas", "Awas"], ["siaga", "Siaga"]]) if (gunung.filter(g => g.level === lab).length !== lv[k]) tolak(`jumlah gunung Level ${lab} (${lv[k]}) harus sama dengan banyaknya laporan khusus ${lab}`);
  const isi = {tanggal, jam: j, level: lv, gunung};
  const blok = [["Awas", "IV"], ["Siaga", "III"]].flatMap(([lab, rom]) => {
    const gs = gunung.filter(g => g.level === lab); if (!gs.length) return [];
    return [`*Laporan khusus gunung api pada Level ${rom} (${lab})*`, ...gs.map(g => [`*Gn. ${g.nama}*`, " Visual: ", ...g.visual.map(t => `* ${t}`), "",
      " Kegempaan: ", ...(g.gempa.length ? g.gempa.map(q => `* ${q.jumlah} kali gempa ${q.jenis} dengan ${q.rincian}`) : ["* Tidak ada kegempaan tercatat."]), "",
      " Rekomendasi:", ...g.rekom.map(t => `* ${t}`), ""].join("\n"))];
  });
  const s = (n, rom, lab) => `${n} (${terbilang(n)}) gunung api pada Level ${rom} (${lab})`;
  const teks = ["Selamat Pagi *Bapak Kepala BNPB*,", "Mohon izin Bapak", "",
    `Berikut hasil pantauan aktivitas gunung api berdasarkan data dari PVMBG tentang status gunung api pada hari ${tglHari(tanggal)} pukul ${j} WIB, dengan ${s(lv.awas, "IV", "Awas")}, ${s(lv.siaga, "III", "Siaga")}, ${s(lv.waspada, "II", "Waspada")} dan ${s(lv.normal, "I", "Normal")} dengan rincian sebagai berikut:`, "",
    ...blok, "Sumber: form Bahan Laporan Harian.", "", "Demikian disampaikan, mohon arahan."].join("\n");
  return {isi, tanggal, teks};
}

/* ---------------- Satgas pemadaman (deck Penanganan) ---------------- */
function satgas(o) {
  const tanggal = tglSah(o.tanggal_laporan, "tanggal laporan"), kegiatan = tglSah(o.tanggal_kegiatan ?? geser(tanggal, -1), "tanggal kegiatan");
  if (kegiatan > tanggal || tgl(tanggal) - tgl(kegiatan) > 3 * HARI_MS) tolak("tanggal kegiatan harus 0-3 hari sebelum tanggal laporan");
  const personel = larik(o.personel ?? [], "personel", 0, 38).map((x, i) => ({prov: prov(x?.prov, `personel ${i + 1}`), jumlah: bil(x?.jumlah, `personel ${i + 1}`, 1e6) ?? tolak(`personel ${i + 1}: jumlah wajib diisi`)}));
  if (new Set(personel.map(x => x.prov)).size !== personel.length) tolak("personel: provinsi dobel");
  const armada = larik(o.armada ?? [], "armada", 0, 40).map((x, i) => ({prov: prov(x?.prov, `armada ${i + 1}`), ikn: x?.ikn === true && x.prov === "64",
    patroli: bil(x?.patroli ?? 0, `armada ${i + 1}: patroli`, 100), wb: bil(x?.wb ?? 0, `armada ${i + 1}: helikopter WB`, 100)}));
  if (new Set(armada.map(x => x.prov + x.ikn)).size !== armada.length) tolak("armada: provinsi dobel");
  const omc = larik(o.omc ?? [], "OMC", 0, 38).map((x, i) => {
    const l = `OMC ${i + 1}`, sortie = bil(x?.sortie ?? 0, `${l}: sortie`, 100);
    const kab = (v, lab) => larik(v ?? [], `${l}: ${lab}`, 0, 20).map((k, j) => nama(String(k).replace(/^(Kab\.|Kabupaten)\s+/, ""), `${l}: ${lab} ${j + 1}`, RE_KAB));
    const e = {prov: prov(x?.prov, l), sortie, nacl: bil(x?.nacl ?? 0, `${l}: NaCl`, 1e6, false), dryice: bil(x?.dryice ?? 0, `${l}: dry ice`, 1e6, false), sasaran: kab(x?.sasaran, "sasaran"),
      hujan: x?.hujan ? (INTENSITAS.includes(x.hujan.intensitas) ? x.hujan.intensitas : tolak(`${l}: intensitas hujan tidak dikenal`)) : null, hujan_lokasi: kab(x?.hujan_lokasi, "lokasi hujan")};
    if (!sortie && (e.nacl || e.dryice)) tolak(`${l}: muatan diisi tapi sortie 0`);
    if (sortie && !e.sasaran.length) tolak(`${l}: sasaran wajib diisi bila OMC dilaksanakan`);
    if (e.hujan && !e.hujan_lokasi.length) tolak(`${l}: lokasi hujan wajib diisi`);
    if (!e.hujan) e.hujan_lokasi = [];
    return e;
  });
  if (new Set(omc.map(x => x.prov)).size !== omc.length) tolak("OMC: provinsi dobel");
  const pemilik = {}; for (const k of PEMILIK) { const v = bil(o.pemilik?.[k] ?? 0, `armada milik ${k}`, 500); if (v) pemilik[k] = v; }
  if (!personel.length && !armada.length && !omc.length) tolak("isi paling tidak personel, armada, atau OMC");
  const isi = {tanggal_laporan: tanggal, tanggal_kegiatan: kegiatan, personel, armada, omc, pemilik};
  const nm = a => PROV[a.prov];
  const urut = a => [...a].sort((x, y) => { const i = k => (PRIORITAS.indexOf(k) + 39) % 39; return i(x.prov) - i(y.prov); });
  const total = personel.reduce((s, x) => s + x.jumlah, 0);
  const teks = ["*LAPORAN UPAYA PEMADAMAN KARHUTLA OLEH SATGAS DI ENAM PROVINSI PRIORITAS*", `_${tglTeks(tanggal)}_`, "",
    "**1. Operasi Darat**", "", "*a. Kekuatan personel*",
    ...(personel.length ? [`Kekuatan personel yang terdata mencapai sekitar *±${ribu(total)} personel*, dengan rincian:`, "", ...urut(personel).map(x => `> ${nm(x)} *${ribu(x.jumlah)}* personel.`)] : ["Kekuatan personel tidak dilaporkan."]), "",
    "**2. Operasi Udara**", "", "*a. Kekuatan Armada*", "", "*Patroli Udara/Casa/OMC*",
    ...urut(armada).filter(x => x.patroli).map(x => `* ${nm(x)}: *${x.patroli} unit* tergelar${x.ikn ? " di IKN" : ""}`), "",
    "*Helikopter _Water Bombing_*", ...urut(armada).filter(x => x.wb).map(x => `* ${nm(x)}: *${x.wb} unit* tergelar${x.ikn ? " di IKN" : ""}`), "",
    "*b. Pelaksanaan Water Bombing*", `Pelaksanaan water bombing pada ${tglTeks(kegiatan)} tercatat pada laporan Satgas.`, "",
    "*d. Pelaksanaan Operasi Modifikasi Cuaca*",
    ...urut(omc).map((x, i) => {
      const muat = [x.nacl && `*${ribu(x.nacl)} kg NaCl*`, x.dryice && `*${ribu(x.dryice)} kg dry ice*`].filter(Boolean);
      return [`*${i + 1}. ${PROV[x.prov]}*`, x.sortie ? `> OMC dilaksanakan *${x.sortie} sortie*${muat.length ? " dengan muatan " + muat.join(" dan ") : ""}, menyasar *${daftarKata(x.sasaran)}*.` : "> OMC *tidak dilaksanakan*.",
        ...(x.hujan ? [`> Hujan *${x.hujan}* dilaporkan di *${daftarKata(x.hujan_lokasi)}*.`] : [])].join("\n");
    }), "",
    "**3. Rekapitulasi**", "Sumber: form Bahan Laporan Harian.",
    ...(Object.keys(pemilik).length ? ["", "*A. BERDASARKAN INSTANSI*", ...Object.entries(pemilik).map(([k, v], i) => `*${i + 1}. ${k}: ${v} Unit*`), "*B. BERDASARKAN PROVINSI*"] : []), "",
    "Demikian disampaikan."].join("\n");
  return {isi, tanggal, teks};
}

const SUSUN = {rekap_koordalops_24: koordalops, bmkg_pagi: bmkg, pvmbg_pagi: pvmbg, satgas};
/* isian -> {isi (dinormalkan), tanggal (tanggal laporan = tanggalIsi wa_jenis.js), teks} atau {galat} */
export function susun(kunci, isi) {
  if (!Object.hasOwn(SUSUN, kunci)) return {galat: `kunci harus salah satu: ${KUNCI.join(", ")}`};
  if (!isi || typeof isi !== "object" || Array.isArray(isi)) return {galat: "isi harus objek"};
  try { return SUSUN[kunci](isi); }
  catch (e) { if (e && typeof e.galat === "string") return {galat: e.galat}; throw e; }
}
