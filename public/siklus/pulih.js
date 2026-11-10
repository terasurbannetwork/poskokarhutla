/* Siklus Bencana F4: daftar Jitupasna (DS 3.7) dan satu Jitupasna dengan draf R3P (DS 3.8). Rute: /api/siklus/pulih, /pulih/:sid, /harga, /r3p (src/siklus_pulih.js).
   Angka rupiah hasil harga satuan SELALU berpil asumsi-kebijakan (U4, U8); kosong "menunggu", bukan 0. Rumah rusak laporan dan isian Jitupasna berdampingan, tidak dijumlah.
   Draf R3P bertanda "DRAF, bukan dokumen resmi" sampai ditetapkan_resmi; tanda setuju PM disebut "tanda setuju internal". Unduhan hanya CSV staf berkop; sel berawal = + - @ diberi awalan '.
   Isian lapangan lewat antre.js (IndexedDB, klien_id idempoten). Chrome urgent, isi berat lewat nanti() (inti.js). */
import {h, ik, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, tombol, tanya, toast, pil, tip, namaJenis, wilayah, angka, tgl, wib, tglWib, geser, peran, penjaga} from "./inti.js";
import {RE_KJ, SEKTOR_R3P, PETA_SEKTOR, TARIF_STIMULAN} from "./hitung.js";
import {bilah} from "./kaji.js";
import * as A from "./antre.js";

const G = globalThis, MENUNGGU = "menunggu";
const JP = {dibuka: ["Dibuka", "mata", "Jitupasna dibuka, belum ada isian"], pengumpulan: ["Pengumpulan", "gelombang", "Isian lapangan masuk"], dihitung: ["Dihitung", "timbangan", "Dihitung dengan harga satuan, belum ditinjau"],
  ditinjau: ["Ditinjau", "mata", "Sedang ditinjau koordinator"], final: ["Final", "centang", "Dikunci; ubah lewat versi baru"]};
const R3P = {draf: ["Draf", "mata", "Draf R3P, bukan dokumen resmi"], diusulkan: ["Diusulkan", "panah", "Menunggu tanda setuju internal pimpinan"], disetujui_pm: ["Tanda setuju internal", "centang", "Tanda setuju internal pimpinan"],
  ditetapkan_resmi: ["Ditetapkan resmi", "centang", "Nomor keputusan resmi tercatat"], berjalan: ["Berjalan", "gelombang", "Pelaksanaan berjalan"], selesai: ["Selesai", "bendera", "R3P selesai"]};
const SEKTOR = {permukiman: "Permukiman", infrastruktur: "Infrastruktur", ekonomi: "Ekonomi", sosial: "Sosial", lintas_sektor: "Lintas sektor", belum_terpeta: "Belum terpeta"};
const TINGKAT = [["rb", "Rusak berat"], ["rs", "Rusak sedang"], ["rr", "Rusak ringan"], ["hancur", "Hancur total"], ["unit", "Per unit"]];
const namaSektor = s => String(s).replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
const namaTingkat = t => TINGKAT.find(x => x[0] === t)?.[1] ?? String(t ?? "").replaceAll("_", " ");
const bilangan = x => typeof x === "number" && Number.isFinite(x);

/* ---------- fungsi murni (diuji tanpa peramban) ---------- */
export const rupiah = n => bilangan(n) ? `Rp${angka(Math.round(n))}` : null;
/* sel ekspor berawal = + - @ diberi awalan ' (injeksi rumus); angka tidak diubah; kosong menjadi "" bukan kata null */
export const amanSel = v => v == null ? "" : typeof v === "number" ? String(v) : /^[=+\-@\t\r]/.test(String(v)) ? "'" + v : String(v);
export const csv = baris => baris.map(r => r.map(c => { const s = amanSel(c); return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }).join(",")).join("\n");
export const tandaDraf = (statusR3p, statusJp) => (statusR3p ? ["ditetapkan_resmi", "berjalan", "selesai"].includes(statusR3p) : statusJp === "final") ? "salinan data, dokumen resmi di luar sistem" : "DRAF, bukan dokumen resmi";
/* server mengisi sektor tanpa isian dengan 0: di layar dan unduhan sektor itu "menunggu", bukan Rp0 */
export const nilaiPeta = (hs, s) => { const v = hs?.peta?.[s]; return !bilangan(v) || (s === "belum_terpeta" ? v <= 0 : (hs.penanda?.kosong ?? []).includes(s)) ? null : v; };
const nilaiSel = n => bilangan(n) ? n : MENUNGGU;
const yakinSel = n => bilangan(n) ? "asumsi-kebijakan" : MENUNGGU;

/* kop + isi lima sektor Pasal 8 ayat (2) Perban 5/2017 untuk unduhan draf R3P (SK-076) */
export function baganDraf(d, r3p, hari) {
  const jp = d.jitupasna, hs = jp.hitung ?? {}, peta = hs.peta ?? {}, tanda = tandaDraf(r3p?.status, jp.status);
  const r = [["Centurisk97, Siklus Bencana, draf Rencana Rehabilitasi dan Rekonstruksi Pascabencana (R3P)"], [tanda], [`Kejadian ${jp.kejadian_id}`, wilayah(jp.kab4) ?? "wilayah tidak tertulis"], [`Status R3P: ${R3P[r3p?.status]?.[0] ?? "belum ada"}`, r3p?.no_keputusan ? `No. keputusan ${r3p.no_keputusan}` : "nomor keputusan resmi belum tertulis"], [],
    ["Sektor (Perban 5/2017 Pasal 8 ayat 2)", "Nilai (Rp)", "Keyakinan"]];
  for (const s of [...SEKTOR_R3P, "belum_terpeta"]) r.push([SEKTOR[s], nilaiSel(nilaiPeta(hs, s)), yakinSel(nilaiPeta(hs, s))]);
  r.push(["Total", nilaiSel(hs.total), yakinSel(hs.total)], [], ["Sisa 90 hari sejak tanggap darurat", bilangan(hari?.sisa) ? hari.sisa : MENUNGGU, "pengingat, bukan penolakan"], [],
    ["Kegiatan", "Sektor", "Nilai (Rp)", "Target", "Satuan", "Status"]);
  for (const k of d.kegiatan ?? []) r.push([k.nama, namaSektor(k.sektor), nilaiSel(k.nilai_rp), nilaiSel(k.target), k.satuan ?? "", k.status]);
  r.push([], ["Tanda setuju internal bukan dokumen resmi. Dokumen resmi berada di luar sistem ini."]);
  return r;
}

/* laporan Jitupasna lima bagian menurut Perka 15/2011 hal. 41 (SK-077): gambaran bencana, akibat dan dampak, kebutuhan R3, perkiraan biaya, penutup */
export const BAGIAN_LAPORAN = ["Gambaran bencana", "Akibat dan dampak", "Kebutuhan R3", "Perkiraan biaya", "Penutup"];
export function baganLaporan(d, r3p, hari) {
  const jp = d.jitupasna, hs = jp.hitung ?? {}, rr = d.rekap_rumah_rusak?.total, ker = hs.kerusakan ?? {}, kru = hs.kerugian ?? {}, pen = hs.penanda ?? {}, peta = hs.peta ?? {}, stim = hs.stimulan ?? {};
  const B = (b, butir, nilai, yakin) => [b, butir, nilai ?? "", yakin ?? ""];
  const r = [["Centurisk97, Siklus Bencana, laporan Jitupasna"], [tandaDraf(r3p?.status, jp.status)], [], ["Bagian", "Butir", "Nilai", "Keyakinan"]];
  r.push(B(BAGIAN_LAPORAN[0], "Kejadian", jp.kejadian_id), B(BAGIAN_LAPORAN[0], "Wilayah", wilayah(jp.kab4) ?? "wilayah tidak tertulis"), B(BAGIAN_LAPORAN[0], "Tim Jitupasna", jp.tim_sk ?? "tidak tertulis"),
    B(BAGIAN_LAPORAN[0], "Status Jitupasna", JP[jp.status]?.[0] ?? jp.status));
  r.push(B(BAGIAN_LAPORAN[1], "Rumah rusak berat menurut laporan warga (berdampingan dengan isian, tidak dijumlah)", nilaiSel(rr?.berat), rr ? "terverifikasi" : MENUNGGU));
  r.push(B(BAGIAN_LAPORAN[1], "Nilai kerusakan (Rp)", nilaiSel(ker.total), yakinSel(ker.total)), B(BAGIAN_LAPORAN[1], "Nilai kerugian (Rp)", nilaiSel(kru.total), yakinSel(kru.total)));
  for (const [s, a] of Object.entries(ker.per ?? {})) r.push(B(BAGIAN_LAPORAN[1], `Kerusakan sektor ${namaSektor(s)} (Rp)`, nilaiSel(a.nilai), yakinSel(a.nilai)));
  for (const s of [...SEKTOR_R3P, "belum_terpeta"]) r.push(B(BAGIAN_LAPORAN[2], `Kebutuhan sektor ${SEKTOR[s]} (Rp)`, nilaiSel(nilaiPeta(hs, s)), yakinSel(nilaiPeta(hs, s))));
  r.push(B(BAGIAN_LAPORAN[2], "Stimulan rumah, tarif 60/30/15 juta (sumber sekunder) (Rp)", nilaiSel(stim.nilai), yakinSel(stim.nilai)));
  r.push(B(BAGIAN_LAPORAN[3], "Perkiraan biaya kerusakan dan kerugian (Rp)", nilaiSel(hs.total), yakinSel(hs.total)));
  for (const k of d.kegiatan ?? []) r.push(B(BAGIAN_LAPORAN[3], `Kegiatan ${k.nama} (Rp)`, nilaiSel(k.nilai_rp), yakinSel(k.nilai_rp)));
  r.push(B(BAGIAN_LAPORAN[4], "Hitung ganda", (pen.hitung_ganda ?? []).map(x => `${x.komponen} di ${x.sektor.join(" dan ")}`).join("; ") || "tidak ditemukan"),
    B(BAGIAN_LAPORAN[4], "Sektor R3P tanpa isian", (pen.kosong ?? []).map(s => SEKTOR[s]).join("; ") || "semua terisi"),
    B(BAGIAN_LAPORAN[4], "Sektor tidak wajar", (pen.tidak_wajar ?? []).map(namaSektor).join("; ") || "tidak ditemukan"),
    B(BAGIAN_LAPORAN[4], "Sisa hari ke batas 90 hari", bilangan(hari?.sisa) ? hari.sisa : MENUNGGU),
    B(BAGIAN_LAPORAN[4], "Catatan", "Harga satuan berlabel asumsi-kebijakan. Angka kosong menunggu, bukan nol. Dokumen resmi di luar sistem."));
  return r;
}
function unduh(nama, baris) {
  const url = URL.createObjectURL(new Blob(["﻿" + csv(baris)], {type: "text/csv;charset=utf-8"})), a = h("a", {href: url, download: nama});
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- potongan tampilan ---------- */
const fasePil = (tabel, s) => { const x = tabel[s] ?? [String(s), "mata", ""]; return h("span", {class: "sk-fase", "data-f": s, title: x[2]}, ik(x[1], 14), x[0]); };
/* rupiah berpil: nilai ada = angka + asumsi-kebijakan; kosong = "menunggu" + pil menunggu */
const sel = (n, ditunggu = "harga satuan") => bilangan(n) ? [h("span", {class: "num"}, rupiah(n)), " ", pil("asumsi-kebijakan")] : [h("span", {}, MENUNGGU), " ", pil("menunggu", {ditunggu})];
const th = (a, d) => h("th", {title: d}, a);
const tabel = (kepala, isi) => h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, kepala)), h("tbody", {}, isi)));
const parseHitung = j => { if (j && typeof j === "object") return j; try { return JSON.parse(j); } catch (e) { return null; } };
const adaHitung = r => ({...r, hitung: parseHitung(r.hitung)});

export async function buka(isi, sk) {
  const m = /^\/siklus\/pulih\/([0-9a-f]{16})$/.exec(location.pathname.replace(/\/+$/, ""));
  return m ? detail(isi, sk, m[1]) : daftar(isi, sk);
}

/* ================================================================ daftar */
async function daftar(isi, sk) {
  const S = {saring: "semua", baris: null, kej: new Map()}, pj = penjaga(), P = await peran();
  sk.periode = () => { const sampai = tglWib(); return {dari: geser(sampai, -120), sampai}; };
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"});
  const kart = kartu({ey: [ik("palu", 12), "Pulih"], judul: ["Jitupasna ", hl("menunggu"), " data"], isi: [ctl, hasil], id: "daftar"}), judul = kart.querySelector("h3");
  ctl.append(seg([["semua", "Semua", "semua"], ["jalan", "Berjalan", "gelombang"], ["final", "Final", "centang"]], S.saring, v => { S.saring = v; gambar(); }, "Status Jitupasna"));
  if (P.ko) ctl.append(h("div", {class: "sk-aksi"}, tombol("Buka Jitupasna", "utama", baru, "palu", "Buka Jitupasna untuk kejadian tanggap atau transisi")));

  async function baru() {
    const buka = [...S.kej.values()].filter(k => k.fase === "tanggap" || k.fase === "transisi");
    if (!buka.length) return toast("Belum ada kejadian berfase tanggap atau transisi");
    const v = await tanya({judul: "Buka Jitupasna", teks: "Satu Jitupasna per kabupaten kejadian. Kabupaten ditulis kode BPS 4 digit.", ya: "Buka", kolom: [
      {nama: "kejadian_id", label: "Kejadian", jenis: "pilih", opsi: buka.map(k => [k.id, `${k.id}, ${wilayah(k.kab4) ?? "wilayah tidak tertulis"}`])}, {nama: "kab4", label: "Kabupaten (kode BPS 4 digit)", jenis: "teks", wajib: true, maks: 4, nilai: buka[0].kab4},
      {nama: "tim_sk", label: "Tim Jitupasna (opsional)", jenis: "teks", maks: 120}]});
    if (!v) return;
    const r = await api("/api/siklus/pulih", {metode: "POST", badan: {kejadian_id: v.kejadian_id, kab4: v.kab4, ...(v.tim_sk ? {tim_sk: v.tim_sk} : {})}});
    if (!r.ok) return toast(r.j?.galat || "Jitupasna belum bisa dibuka");
    G.nanti(() => { location.href = `/siklus/pulih/${r.j.id}`; });
  }

  function gambar() {
    const semua = S.baris ?? [], jalan = semua.filter(r => r.status !== "final"), rows = semua.filter(r => S.saring === "semua" || (S.saring === "final") === (r.status === "final"));
    judul.replaceChildren(...(S.baris == null ? ["Jitupasna ", hl("menunggu"), " data"] : semua.length ? [hl(angka(jalan.length)), " Jitupasna berjalan, ", hl(angka(semua.length - jalan.length)), " final"] : ["Belum ada ", hl("Jitupasna")]));
    if (!rows.length) return kosongkan(hasil).append(kead("kosong", {teks: semua.length ? "Tidak ada Jitupasna dengan status ini. Ubah status." : "Belum ada Jitupasna pada 120 hari terakhir. Jitupasna dibuka saat kejadian berfase tanggap atau transisi."}));
    const t = rows.map(r => {
      const k = S.kej.get(r.kejadian_id) ?? {}, href = `/siklus/pulih/${r.id}`, hs = r.hitung ?? {};
      const tr = h("tr", {class: "klik", "data-tip": tip(r.kejadian_id, ["Versi", String(r.versi)], ["Diubah", wib(r.diubah)])},
        h("td", {}, h("a", {href}, r.kejadian_id), r.dummy ? h("span", {class: "sk-contoh", title: "Baris dummy untuk contoh layar"}, "contoh") : ""),
        h("td", {}, wilayah(r.kab4) ?? "wilayah tidak tertulis", " ", namaJenis(k.jenis ?? "")), h("td", {class: "t"}, fasePil(JP, r.status)),
        h("td", {class: "t"}, sel(hs.kerusakan?.total)), h("td", {class: "t"}, sel(hs.kerugian?.total, "isian kerugian")));
      tr.addEventListener("click", e => { if (e.target.closest("a,button")) return; tr.setAttribute("aria-current", "true"); G.nanti(() => { location.href = href; }); });
      return tr;
    });
    kosongkan(hasil).append(tabel([th("KJ", "Nomor kejadian Buku Besar"), th("Wilayah", "Kabupaten atau kota menurut kode BPS"), th("Status", "Status Jitupasna"), th("Kerusakan", "Nilai kerusakan: unit x harga satuan, asumsi kebijakan"), th("Kerugian", "Nilai kerugian: arus x bulan")], t));
  }

  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    const p = sk.periode(), r = await api("/api/siklus/kejadian?" + new URLSearchParams({dari: p.dari, sampai: p.sampai, batas: 100}));
    if (!pj.terbaru(n)) return;
    if (!r.ok) return kosongkan(hasil).append(kead_dari(r, muat));
    const kej = (r.j?.baris ?? []).filter(x => ["tanggap", "transisi", "pemulihan", "selesai"].includes(x.fase)).slice(0, 20);   // ponytail: dibaca per kejadian (indeks sk_jp_kej), tanpa pindai; naikkan bila rute daftar menyeluruh dibuat
    S.kej = new Map(kej.map(x => [x.id, x]));
    const per = await Promise.all(kej.map(x => api(`/api/siklus/pulih?kejadian_id=${encodeURIComponent(x.id)}`)));
    if (!pj.terbaru(n)) return;
    S.baris = per.flatMap(x => x.ok ? (x.j?.baris ?? []).map(adaHitung) : []).sort((a, b) => b.diubah - a.diubah);
    if (per.length && per.every(x => !x.ok)) return kosongkan(hasil).append(kead_dari(per[0], muat));
    gambar();
  }
  isi.replaceChildren(kart); muat();
}

/* ================================================================ detail */
async function detail(isi, sk, sid) {
  sk.periode = () => ({pulih: sid}); isi.replaceChildren(kead("memuat"));
  const [P, r] = await Promise.all([peran(), api(`/api/siklus/pulih/${sid}`)]);
  if (!r.ok) return isi.replaceChildren(kartu({ey: "Pulih", judul: ["Jitupasna ", hl("belum bisa dibuka")], isi: [kead_dari(r, () => detail(isi, sk, sid), "Jitupasna tidak ada atau di luar wilayah kamu")]}));
  const d = r.j; d.jitupasna = adaHitung(d.jitupasna);
  const r3 = d.r3p?.[0] ?? null, rd = r3 ? await api(`/api/siklus/r3p/${r3.id}`) : null, hari = rd?.ok ? rd.j.hari_tersisa_90 : null;
  if (rd?.ok) { d.kegiatan = rd.j.kegiatan; d.kemajuan = rd.j.kemajuan; }
  const ulang = () => detail(isi, sk, sid);
  isi.replaceChildren(...gambarDetail(d, r3, rd?.ok ? rd.j : null, hari, P, ulang));
  await antreMuat(d.jitupasna.id, P, ulang);
}

/* pita luring: berapa isian tersimpan di HP; kirim ulang saat daring */
let pita = null;   // dibuat saat layar digambar (modul ini juga diimpor tanpa DOM oleh uji)
async function antreMuat(jpId, P, ulang) {
  const kirim = (id, baris) => api(`/api/siklus/pulih/${id}/baris`, {metode: "POST", badan: {baris}});
  async function segar(kirimDulu) {
    let ringkas = "";
    if (kirimDulu && navigator.onLine !== false) { const x = await A.kirimSemua(jpId, kirim); if (x.diterima || x.duplikat) { toast(`${angka(x.diterima + x.duplikat)} isian terkirim`); G.nanti(ulang); return; } if (x.ditolak) ringkas = " Sebagian ditolak server; periksa lalu isi ulang."; }
    const j = await A.jumlah(jpId);
    pita.textContent = j.total ? `Tersimpan di HP: ${angka(j.menunggu)} isian menunggu dikirim.${ringkas}` : "";
    pita.hidden = !j.total;
  }
  pita.hidden = true; pita.textContent = "";
  if (!P.pd && !P.ko) return;
  G.addEventListener("online", () => segar(true));
  G.pbTambahBaris = async b => { const x = await A.tambah(jpId, b); if (!x.ok) { toast(x.pesan); return x; } await segar(true); return x; };
  await segar(true);
}

function barisIsian(d, P, ulang) {
  pita = h("p", {class: "sk-para", role: "status", id: "pl-pita"});
  const jp = d.jitupasna, bisaTulis = (P.pd || P.ko) && (jp.status === "dibuka" || jp.status === "pengumpulan"), rr = d.rekap_rumah_rusak, tot = rr?.total;
  const nilaiBaris = b => b.nilai_rp == null ? [h("span", {}, MENUNGGU), " ", pil("menunggu", {ditunggu: "harga satuan"})] : [h("span", {class: "num"}, rupiah(b.nilai_rp)), " ", pil("asumsi-kebijakan")];
  const t = (d.baris ?? []).map(b => h("tr", {}, h("td", {}, namaSektor(b.sektor)), h("td", {class: "t"}, b.jenis === "rusak" ? "Rusak" : "Rugi"),
    h("td", {}, b.jenis === "rusak" ? namaTingkat(b.tingkat) : namaSektor(b.komponen ?? "")), h("td", {class: "n"}, b.jenis === "rusak" ? (angka(b.unit) ?? "tidak ada") : `${rupiah(b.arus_rp) ?? "tidak ada"} x ${angka(b.bulan) ?? "tidak ada"} bulan`), h("td", {class: "t"}, nilaiBaris(b))));
  const tambahBaris = jenis => async () => {
    const sektorOpsi = Object.keys(PETA_SEKTOR).map(s => [s, namaSektor(s)]);
    const kolom = jenis === "rusak" ? [{nama: "sektor", label: "Sektor", jenis: "pilih", opsi: sektorOpsi}, {nama: "tingkat", label: "Tingkat", jenis: "pilih", opsi: TINGKAT}, {nama: "unit", label: "Jumlah unit", jenis: "teks", wajib: true, maks: 9}]
      : [{nama: "sektor", label: "Sektor", jenis: "pilih", opsi: sektorOpsi}, {nama: "komponen", label: "Komponen kerugian (huruf kecil, garis bawah)", jenis: "teks", wajib: true, maks: 40}, {nama: "arus_rp", label: "Arus per bulan (Rp)", jenis: "teks", wajib: true, maks: 12}, {nama: "bulan", label: "Jumlah bulan", jenis: "teks", wajib: true, maks: 3}];
    const v = await tanya({judul: jenis === "rusak" ? "Tambah isian kerusakan" : "Tambah isian kerugian", teks: "Disimpan di HP dulu, lalu dikirim saat ada sinyal. Kirim dua kali tidak membuat baris ganda.", kolom, ya: "Simpan"});
    if (!v) return;
    const x = await G.pbTambahBaris({jenis, ...v, unit: v.unit?.replace(",", "."), arus_rp: v.arus_rp?.replace(/\D/g, ""), bulan: v.bulan});
    if (x?.ok) toast("Isian tersimpan");
  };
  return kartu({ey: [ik("bangunan", 12), "Isian lapangan"], id: "pl-isian", judul: [hl(angka((d.baris ?? []).length) ?? "0"), " baris isian", d.baris_terpotong ? ", daftar dipotong 500 baris" : ""], isi: [
    tot ? wadah("Rumah rusak menurut laporan warga", h("div", {class: "sk-ber"}, [["Berat", tot.berat], ["Sedang", tot.sedang], ["Ringan", tot.ringan]].map(([a, n]) => h("div", {}, h("small", {}, a), h("b", {}, angka(n) ?? "tidak ada"), pil("terverifikasi")))),
      para(`${rr.catatan}. Jendela ${tgl(rr.dari) ?? "tidak ada"} sampai ${tgl(rr.sampai) ?? "tidak ada"}; tanpa nama pelapor, koordinat, atau foto.`)) : wadah("Rumah rusak menurut laporan warga", para("Belum ada hitungan laporan rumah rusak untuk kabupaten ini."), pil("menunggu", {ditunggu: "laporan rumah rusak"})),
    wadah("Isian Jitupasna", t.length ? tabel([th("Sektor", "Subsektor Jitupasna"), th("Jenis", "Kerusakan atau kerugian"), th("Rincian", "Tingkat atau komponen"), th("Jumlah", "Unit, atau arus x bulan"), th("Nilai", "Jumlah x harga satuan; kosong menunggu harga")], t) : kead("kosong", {teks: "Belum ada isian. Tambahkan dari lapangan, nilai muncul setelah dihitung dengan harga satuan."}),
      pita, bisaTulis ? h("div", {class: "sk-aksi"}, tombol("Tambah kerusakan", "biasa", tambahBaris("rusak"), "bangunan"), tombol("Tambah kerugian", "biasa", tambahBaris("rugi"), "timbangan")) : "")]});
}

function blokHarga(d, P) {
  const kartuH = kartu({ey: [ik("timbangan", 12), "Harga satuan"], id: "pl-harga", judul: ["Harga satuan ", hl("bersumber dokumen")], isi: [kead("memuat")]}), bd = kartuH.querySelector(".ex-bd");
  (async () => {
    const sektor = [...new Set((d.baris ?? []).map(b => b.sektor))].slice(0, 8), per = await Promise.all(sektor.map(s => api(`/api/siklus/harga?sektor=${encodeURIComponent(s)}`)));
    const rows = per.flatMap(x => x.ok ? x.j?.baris ?? [] : []);
    const t = rows.map(x => h("tr", {}, h("td", {}, namaSektor(x.sektor)), h("td", {}, namaTingkat(x.tingkat)), h("td", {class: "n"}, `${rupiah(x.harga_rp) ?? "tidak ada"} per ${x.satuan ?? "satuan"}`), h("td", {class: "t"}, String(x.tahun ?? "tidak ada")), h("td", {}, x.dokumen ?? "tidak tertulis"), h("td", {class: "t"}, pil("asumsi-kebijakan"))));
    const tambah = async () => {
      const v = await tanya({judul: "Tambah harga satuan", teks: "Wajib menyebut dokumen sumber (HSBGN atau Perka). Harga tanpa acuan resmi tetap berlabel asumsi kebijakan.", ya: "Simpan", kolom: [{nama: "sektor", label: "Sektor", jenis: "pilih", opsi: Object.keys(PETA_SEKTOR).map(s => [s, namaSektor(s)])},
        {nama: "tingkat", label: "Tingkat", jenis: "pilih", opsi: TINGKAT}, {nama: "satuan", label: "Satuan (mis. unit)", jenis: "teks", wajib: true, maks: 20}, {nama: "harga_rp", label: "Harga (Rp)", jenis: "teks", wajib: true, maks: 12}, {nama: "tahun", label: "Tahun harga", jenis: "teks", wajib: true, maks: 4}, {nama: "dokumen", label: "Dokumen sumber", jenis: "teks", wajib: true, maks: 200}]});
      if (!v) return;
      const x = await api("/api/siklus/harga", {metode: "POST", badan: {sektor: v.sektor, tingkat: v.tingkat, satuan: v.satuan, harga_rp: Number(v.harga_rp.replace(/\D/g, "")), tahun: Number(v.tahun), dokumen: v.dokumen}});
      if (!x.ok) return toast(x.j?.galat || "Harga belum bisa disimpan");
      toast("Harga disimpan"); G.nanti(() => location.reload());
    };
    bd.replaceChildren(t.length ? tabel([th("Sektor", ""), th("Tingkat", ""), th("Harga", "Harga satuan"), th("Tahun", "IKK atau IHPB hanya dalam tahun yang sama"), th("Dokumen", "Sumber harga"), th("Keyakinan", "")], t) : kead("kosong", {teks: "Belum ada harga satuan untuk sektor yang diisi. Nilai tetap menunggu, bukan nol."}),
      para("Indeks IKK dan IHPB belum dipakai: sumber BPS menunggu."), (P.pd || P.ko) ? h("div", {class: "sk-aksi"}, tombol("Tambah harga", "biasa", tambah, "timbangan")) : "");
  })();
  return kartuH;
}

function blokHasil(d) {
  const hs = d.jitupasna.hitung, jp = d.jitupasna;
  if (!hs) return kartu({ey: [ik("timbangan", 12), "Nilai"], id: "pl-hasil", judul: ["Nilai kerusakan dan kerugian ", hl("menunggu"), " dihitung"], isi: [kead("kosong", {teks: "Belum dihitung. Hitung setelah isian dan harga satuan lengkap."})]});
  const pen = hs.penanda ?? {}, ker = hs.kerusakan ?? {}, kru = hs.kerugian ?? {}, stim = hs.stimulan ?? {}, ada = bilangan(hs.total);
  const bendera = [];
  for (const g of pen.hitung_ganda ?? []) bendera.push(`Hitung ganda: komponen ${g.komponen} ada di ${g.sektor.map(namaSektor).join(" dan ")}.`);
  if ((pen.kosong ?? []).length) bendera.push(`Cakupan: sektor ${pen.kosong.map(s => SEKTOR[s]).join(", ")} belum ada isian.`);
  for (const s of pen.tidak_wajar ?? []) bendera.push(`Kewajaran: sektor ${namaSektor(s)} tidak monoton atau melebihi semua unit dihargai hancur total. Angka tidak diubah.`);
  return kartu({ey: [ik("timbangan", 12), "Nilai"], id: "pl-hasil", judul: ada ? ["Kerusakan dan kerugian ", hl(rupiah(hs.total)), " dari harga ", hl(String(hs.tahun_harga ?? jp.tahun_harga ?? "tidak tertulis"))] : ["Nilai kerusakan ", hl("menunggu"), " harga satuan"], isi: [
    wadah("Ringkasan", h("div", {class: "sk-ber"},
      h("div", {}, h("small", {}, "Kerusakan"), h("b", {}, bilangan(ker.total) ? rupiah(ker.total) : MENUNGGU), bilangan(ker.total) ? pil("asumsi-kebijakan") : pil("menunggu", {ditunggu: "harga satuan"})),
      h("div", {}, h("small", {}, "Kerugian"), h("b", {}, bilangan(kru.total) ? rupiah(kru.total) : MENUNGGU), bilangan(kru.total) ? pil("asumsi-kebijakan") : pil("menunggu", {ditunggu: "isian kerugian"})),
      h("div", {title: `Tarif ${TARIF_STIMULAN.rb / 1e6}/${TARIF_STIMULAN.rs / 1e6}/${TARIF_STIMULAN.rr / 1e6} juta: sumber sekunder, teks Juklak 5/2024 belum ditemukan`}, h("small", {}, "Stimulan rumah"), h("b", {}, bilangan(stim.nilai) ? rupiah(stim.nilai) : MENUNGGU), pil(bilangan(stim.nilai) ? "asumsi-kebijakan" : "menunggu", {ditunggu: "unit rumah rusak"}, "Tarif 60/30/15 juta, sumber sekunder, teks Juklak 5/2024 belum ditemukan"))),
      para(`Dihitung ${wib(Date.parse(hs.dihitung ?? "")) ?? (Number.isFinite(+hs.dihitung) ? wib(+hs.dihitung) : null) ?? "waktu tidak tertulis"} WIB. Indeks harga IKK dan IHPB: ${hs.indeks ?? MENUNGGU}.`)),
    wadah("Pemeriksaan hitung", bendera.length ? h("ul", {class: "sk-garis"}, bendera.map(t => h("li", {}, t))) : para("Tidak ada hitung ganda, sektor kosong, atau angka tidak wajar pada isian ini."), pil("asumsi-kebijakan"))]});
}

function blokR3p(d, r3, rd, hari, P, ulang) {
  const jp = d.jitupasna, hs = jp.hitung, peta = hs?.peta ?? {}, aksi = h("div", {class: "sk-aksi"});
  const post = async (jalur, badan, ok) => { const x = await api(jalur, {metode: "POST", badan}); if (!x.ok) return toast(x.j?.galat || "Belum bisa diubah"); toast(ok); G.nanti(ulang); };
  if (!r3 && jp.status === "final" && P.ko) aksi.append(tombol("Buat draf R3P", "utama", () => post("/api/siklus/r3p", {jitupasna_id: jp.id}, "Draf R3P dibuat"), "palu"));
  if (r3 && P.ko) {
    const s = r3.status, ke = (k, label, ikon, badan) => aksi.append(tombol(label, "utama", () => post(`/api/siklus/r3p/${r3.id}/status`, {ke: k, ...badan}, `Status R3P: ${R3P[k][0]}`), ikon));
    if (s === "draf") ke("diusulkan", "Usulkan", "panah");
    if (s === "berjalan") ke("selesai", "Tandai selesai", "bendera");
    if (s === "ditetapkan_resmi") ke("berjalan", "Mulai pelaksanaan", "gelombang");
    if (s === "disetujui_pm") aksi.append(tombol("Catat keputusan resmi", "utama", async () => {
      const v = await tanya({judul: "Catat nomor keputusan resmi", teks: "Diisi sebagai teks dari dokumen resmi yang ditetapkan di luar sistem.", ya: "Catat", kolom: [{nama: "no_keputusan", label: "Nomor keputusan", jenis: "teks", wajib: true, maks: 120}, {nama: "tgl_keputusan", label: "Tanggal keputusan", jenis: "tgl", wajib: true}, {nama: "penandatangan", label: "Penandatangan (opsional)", jenis: "teks", maks: 120}]});
      if (v) post(`/api/siklus/r3p/${r3.id}/status`, {ke: "ditetapkan_resmi", no_keputusan: v.no_keputusan, tgl_keputusan: v.tgl_keputusan, ...(v.penandatangan ? {penandatangan: v.penandatangan} : {})}, "Keputusan resmi dicatat");
    }, "centang"));
  }
  if (r3 && P.pm && r3.status === "diusulkan") aksi.append(tombol("Beri tanda setuju internal", "utama", () => post(`/api/siklus/r3p/${r3.id}/setuju`, {}, "Tanda setuju internal tercatat"), "centang", "Tanda setuju internal, bukan dokumen resmi"));
  if (r3 && (P.pd || P.ko)) aksi.append(tombol("Unduh draf", "biasa", () => unduh(`r3p-${jp.kejadian_id}-${jp.kab4}.csv`, baganDraf(d, r3, hari)), "panah", "Unduh CSV berkop untuk staf"));
  if (r3 && P.ko && (r3.status === "draf" || r3.status === "diusulkan")) aksi.append(tombol("Tambah kegiatan", "biasa", async () => {
    const v = await tanya({judul: "Tambah kegiatan R3P", ya: "Tambah", kolom: [{nama: "sektor", label: "Sektor", jenis: "pilih", opsi: SEKTOR_R3P.map(s => [s, SEKTOR[s]])}, {nama: "nama", label: "Nama kegiatan", jenis: "teks", wajib: true, maks: 200}, {nama: "target", label: "Target (angka, opsional)", jenis: "teks", maks: 12}, {nama: "satuan", label: "Satuan (opsional)", jenis: "teks", maks: 20}, {nama: "nilai_rp", label: "Nilai (Rp, opsional)", jenis: "teks", maks: 14}]});
    if (!v) return;
    const b = {sektor: v.sektor, nama: v.nama, ...(v.target ? {target: Number(v.target.replace(",", "."))} : {}), ...(v.satuan ? {satuan: v.satuan} : {}), ...(v.nilai_rp ? {nilai_rp: Number(v.nilai_rp.replace(/\D/g, ""))} : {})};
    post(`/api/siklus/r3p/${r3.id}/kegiatan`, b, "Kegiatan ditambahkan");
  }, "tambah"));
  const tanda = tandaDraf(r3?.status, jp.status), sisa = hari?.sisa;
  const hariTeks = !r3 ? "Hari tersisa muncul setelah ada draf R3P." : bilangan(sisa) ? (hari.lewat ? `Batas 90 hari sudah lewat ${angka(-sisa)} hari. Ini pengingat, bukan penolakan.` : `${angka(sisa)} hari tersisa ke batas 90 hari sejak tanggap darurat. Ini pengingat, bukan penolakan.`) : "Hari tersisa menunggu tanggal mulai tanggap darurat.";
  return kartu({ey: [ik("palu", 12), "Draf R3P"], id: "pl-r3p", judul: r3 ? ["Draf R3P ", hl(R3P[r3.status]?.[0] ?? r3.status), ", lima sektor"] : ["Draf R3P ", hl("belum ada")], isi: [
    h("div", {class: "sk-baris"}, r3 ? fasePil(R3P, r3.status) : "", h("span", {class: "sk-fase", "data-f": "transisi", id: "pl-tanda"}, ik("tanya", 14), tanda)),
    r3?.disetujui_oleh ? para(`${rd?.label_setuju ?? "tanda setuju internal"}: dicatat ${wib(r3.disetujui_pada) ?? "waktu tidak tertulis"} WIB. Bukan dokumen resmi.`) : "",
    r3?.no_keputusan ? para(`Nomor keputusan resmi (teks dari staf): ${r3.no_keputusan}, ${tgl(r3.tgl_keputusan) ?? "tanggal tidak tertulis"}.`) : "",
    wadah("Lima sektor Perban 5/2017 Pasal 8 ayat (2)", tabel([th("Sektor", "Pemetaan subsektor Jitupasna, tafsir bawaan menunggu keputusan pemilik"), th("Nilai", "Kerusakan dan kerugian terpeta")], [...SEKTOR_R3P, "belum_terpeta"].map(s => h("tr", {}, h("td", {}, SEKTOR[s]), h("td", {class: "t"}, sel(nilaiPeta(hs, s)))))),
      hs ? para("Nilai per sektor memakai harga satuan berlabel asumsi kebijakan.") : para("Belum dihitung, jadi semua sektor menunggu.")),
    wadah("Batas 90 hari dan PDNA", para(hariTeks)),
    wadah("Laporan Jitupasna", para("Unduhan staf lima bagian menurut Perka 15/2011: gambaran bencana, akibat dan dampak, kebutuhan R3, perkiraan biaya, penutup."),
      (P.pd || P.ko) ? h("div", {class: "sk-aksi"}, tombol("Unduh laporan", "biasa", () => unduh(`laporan-jitupasna-${jp.kejadian_id}-${jp.kab4}.csv`, baganLaporan(d, r3, hari)), "panah", "Unduh CSV laporan Jitupasna lima bagian")) : ""),
    aksi.children.length ? aksi : ""]});
}

function blokPelaksanaan(d, r3) {
  const km = new Map((d.kemajuan?.kegiatan ?? []).map(k => [k.id, k]));
  const t = (d.kegiatan ?? []).map(k => {
    const m = km.get(k.id) ?? {}, p = bilangan(m.persen) ? m.persen : null;
    return h("tr", {}, h("td", {}, SEKTOR[k.sektor] ?? namaSektor(k.sektor)), h("td", {}, k.nama), h("td", {class: "t"}, sel(k.nilai_rp, "nilai kegiatan")),
      h("td", {class: "t"}, bilah(p == null ? null : [0, p], 100, `Realisasi ${k.nama}`), m.anomali ? h("small", {}, "realisasi melebihi target") : ""),
      h("td", {class: "t"}, k.status, m.macet ? [" ", h("span", {class: "sk-fase", "data-f": "transisi", title: "Tahap sama lebih dari 60 hari"}, "Macet")] : ""));
  });
  return kartu({ey: [ik("gelombang", 12), "Pelaksanaan"], id: "pl-lak", judul: [hl(angka((d.kegiatan ?? []).length) ?? "0"), " kegiatan R3P", bilangan(d.kemajuan?.total) ? [", rata-rata tertimbang ", hl(`${angka(Math.round(d.kemajuan.total))}%`)] : ""], isi: [
    t.length ? tabel([th("Sektor", ""), th("Kegiatan", ""), th("Nilai", "Asumsi kebijakan"), th("Realisasi", "Realisasi dibagi target, tampil paling besar 100%; kosong menunggu"), th("Status", "Macet bila tahap sama lebih dari 60 hari")], t) : kead("kosong", {teks: r3 ? "Belum ada kegiatan. Tambahkan dari draf R3P." : "Kegiatan muncul setelah ada draf R3P."}),
    para("Kegiatan yang tertaut ke pemulihan membaca target dan realisasi dari sana. Total tertimbang menunggu bila ada kegiatan tanpa nilai atau target.")]});
}

function gambarDetail(d, r3, rd, hari, P, ulang) {
  const jp = d.jitupasna, hs = jp.hitung, nUnit = (d.baris ?? []).filter(b => b.jenis === "rusak").reduce((a, b) => a + (bilangan(b.unit) ? b.unit : 0), 0);
  const barisStatus = h("div", {class: "sk-baris"}, fasePil(JP, jp.status), pil("asumsi-kebijakan"), h("span", {}, `Versi ${jp.versi}, ${wilayah(jp.kab4) ?? "wilayah tidak tertulis"}${jp.tim_sk ? `, tim ${jp.tim_sk}` : ""}`));
  const aksi = h("div", {class: "sk-aksi"});
  const geserJp = async (ke, alasan) => {
    const x = await api(`/api/siklus/pulih/${jp.id}/status`, {metode: "POST", badan: {ke, ...(alasan ? {alasan} : {})}});
    if (!x.ok) return toast(x.j?.galat || "Status belum bisa diubah"); toast(`Status Jitupasna: ${JP[ke][0]}`); G.nanti(ulang);
  };
  const hitung = async () => {
    const v = await tanya({judul: "Hitung dengan harga satuan", teks: "Memakai harga satuan terbaru untuk tahun yang dipilih. Harga berlabel asumsi kebijakan.", ya: "Hitung", kolom: [{nama: "tahun", label: "Tahun harga", jenis: "teks", wajib: true, maks: 4, nilai: String(new Date().getFullYear())}]});
    if (!v) return;
    const x = await api(`/api/siklus/pulih/${jp.id}/hitung`, {metode: "POST", badan: {tahun_harga: Number(v.tahun)}});
    if (!x.ok) return toast(x.j?.galat || "Belum bisa dihitung"); toast("Dihitung"); G.nanti(ulang);
  };
  const mundur = async () => { const v = await tanya({judul: "Kembali ke pengumpulan", kolom: [{nama: "alasan", label: "Alasan (3 sampai 200 karakter)", jenis: "area", wajib: true, maks: 200}], ya: "Kembali"}); if (v) geserJp("pengumpulan", v.alasan); };
  if (P.ko || P.pd) {
    const s = jp.status;
    if (s === "dibuka" && P.ko) aksi.append(tombol("Mulai pengumpulan", "utama", () => geserJp("pengumpulan"), "gelombang"));
    if ((s === "pengumpulan" || s === "dihitung")) aksi.append(tombol(s === "dihitung" ? "Hitung ulang" : "Hitung", "utama", hitung, "timbangan"));
    if (s === "dihitung" && P.ko) aksi.append(tombol("Tinjau", "utama", () => geserJp("ditinjau"), "mata"));
    if (s === "ditinjau" && P.ko) aksi.append(tombol("Final", "utama", () => geserJp("final"), "centang", "Mengunci Jitupasna; ubah lewat versi baru"));
    if ((s === "dihitung" || s === "ditinjau") && P.ko) aksi.append(tombol("Kembali ke pengumpulan", "biasa", mundur, "panah"));
  }
  const judul = hs && bilangan(hs.total) ? ["Kerusakan dan kerugian ", hl(rupiah(hs.total)), " dari ", hl(angka(nUnit) ?? "0"), " unit rusak, draf R3P ", hl(r3 ? R3P[r3.status][0].toLowerCase() : "belum ada")] : ["Nilai ", hl("menunggu"), " dihitung, ", hl(angka(nUnit) ?? "0"), " unit rusak terisi, draf R3P ", hl(r3 ? R3P[r3.status][0].toLowerCase() : "belum ada")];
  const kepala = kartu({ey: [ik("palu", 12), "Pulih"], id: "pl-kepala", judul, isi: [barisStatus, aksi, jp.status === "final" ? para("Jitupasna final dikunci. Ubah lewat versi baru.") : "",
    h("div", {class: "sk-baris"}, h("a", {href: `/siklus/kejadian/${jp.kejadian_id}`, "data-aksi": "biasa"}, `Buka kejadian ${jp.kejadian_id}`), h("a", {href: "/siklus/pulih", "data-aksi": "biasa"}, "Kembali ke daftar"))]});
  return [kepala, h("div", {class: "sk-detail"}, h("div", {}, [barisIsian(d, P, ulang), blokHarga(d, P), blokHasil(d)]), h("div", {}, [blokR3p(d, r3, rd, hari, P, ulang), blokPelaksanaan(d, r3)]))];
}
