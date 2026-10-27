/* SIPPA: layar Kit /pipa/kit dan /pipa/kit/:id (PRD §9.4.5, DS §3.13 §3.14 §4.5, DT §4.3 §6.2). Kontrak router: pasang(akar, konteks) dan lepas().
   Logika murni (mesin keadaan, kehilangan, QR, validasi) dan pembangun HTML ada di atas dan diuji tanpa DOM; DOM dan jaringan di bawah.
   Butuh global public/inti: fmt, esc, jamWIB, Kartu, nanti. Kode penugasan hanya hidup di dialog sekali tampil: tidak ke penyimpanan, alamat, atau konsol. */
import {MEDAN} from "./formulir.js";
import {ikon} from "./ikon.js";
import {memuat, kosong, galat} from "./keadaan.js";

/* ---------- mesin keadaan kit (DT §6.2). Pasangan sah = CHECK sippa_gerak di 0056; uji membandingkan keduanya. ---------- */
export const STATUS = ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"];
const pasang2 = (dari, ke) => dari.map(d => `${d}>${ke}`);
const DASAR = {
  pra_posisi: ["gudang>depot", "banjir>depot"],
  gelar: pasang2(["gudang", "depot", "banjir"], "gelar"),
  bongkar: ["gelar>depot"],
  kembali: pasang2(["depot", "gelar", "banjir", "servis"], "gudang"),
  pindah_banjir: pasang2(["gudang", "depot", "gelar"], "banjir"),
  servis: pasang2(["gudang", "depot", "gelar", "banjir"], "servis"),
  hilang: pasang2(["gudang", "depot", "gelar", "banjir", "servis"], "hilang"),
  ditemukan: ["hilang>gudang"],
  pensiun: pasang2(["gudang", "servis", "hilang"], "pensiun"),
};
export const PASANGAN_SAH = [...new Set(Object.values(DASAR).flat())];
export const ALASAN_TRANSISI = {...DASAR, koreksi: PASANGAN_SAH};
const HANYA_MODERATOR = new Set(["hilang", "ditemukan", "pensiun", "koreksi"]);
const WAJIB_CATATAN = new Set(["hilang", "koreksi"]);
const WAJIB_PESAN = {catatan: "Catatan wajib diisi. Tulis alasan singkat.", pengangkut: "Pengangkut wajib diisi. Pilih pengangkut dari daftar.", permintaan_dari: "Permintaan dari wajib diisi. Tulis nama instansi atau peminta."};
export const TEKS_ALASAN = {pra_posisi: "Pra-posisi ke depot", gelar: "Gelar", bongkar: "Bongkar ke depot", kembali: "Kembali ke gudang", pindah_banjir: "Pindah ke banjir", servis: "Kirim servis",
  hilang: "Tandai hilang", ditemukan: "Tandai ditemukan", pensiun: "Pensiunkan", koreksi: "Koreksi status"};
const NAMA_STATUS = {gudang: "gudang", depot: "depot depan", gelar: "digelar", banjir: "dipakai banjir", servis: "servis", hilang: "hilang", pensiun: "pensiun"};
const TEKS_PENGANGKUT = {yontp: "YonTP", bpbd: "BPBD", daops: "Daops", manggala_agni: "Manggala Agni", lain: "Lain"};
const UNSUR = {manggala_agni: "Manggala Agni", bpbd: "BPBD", yontp: "YonTP", mpa: "MPA", lain: "Lain"};
const JENIS_KIT = {gambut: "Gambut", mineral: "Mineral", banjir: "Banjir", pinjam_pilot: "Pinjam pilot"};
const KONDISI = {baik: "Baik", rusak_ringan: "Rusak ringan", rusak_berat: "Rusak berat", hilang: "Hilang"};
const ID16 = /^[0-9a-f]{16}$/;
const ada = v => v != null && String(v).trim() !== "";

/* peran klien dari atribut body yang diisi worker (hanya untuk tampilan tombol; server tetap memeriksa tiap rute): M moderator, W tulis, B baca */
export const peranKlien = ds => ds && (ds.mod === "1" || ds.super === "1") ? "M" : ds && ds.tulis === "1" ? "W" : "B";

export function alasanBoleh(dari, ke, peran) {
  if (peran !== "W" && peran !== "M") return [];
  return Object.entries(ALASAN_TRANSISI).filter(([a, ps]) => ps.includes(`${dari}>${ke}`) && (peran === "M" || !HANYA_MODERATOR.has(a))).map(([a]) => a);
}

/* semua gerak yang boleh dicatat dari status ini: rencana = boleh terencana (hanya pra-posisi gudang ke depot dan pindah ke banjir) */
export function opsiGerak(status, peran) {
  return STATUS.flatMap(ke => alasanBoleh(status, ke, peran).map(alasan => ({alasan, ke_status: ke,
    rencana: alasan === "pindah_banjir" || (alasan === "pra_posisi" && status === "gudang"),
    wajib: alasan === "pindah_banjir" ? ["pengangkut", "permintaan_dari"] : WAJIB_CATATAN.has(alasan) ? ["catatan"] : []})));
}

/* validasi masukan gerak staf: [{medan, alasan}], kosong = sah. Batas teks dan ETA dibaca dari MEDAN.gerak (satu sumber dengan CHECK). */
export function cekGerak(kit, f, peran) {
  const g = [], tolak = (medan, alasan) => g.push({medan, alasan});
  const o = opsiGerak(kit.status, peran).find(x => x.alasan === f.alasan && x.ke_status === f.ke_status);
  if (!o) tolak("alasan", `${TEKS_ALASAN[f.alasan] || "Gerak ini"} dari ${NAMA_STATUS[kit.status] ?? kit.status} ke ${NAMA_STATUS[f.ke_status] ?? f.ke_status} tidak sah untuk perananmu. Pilih gerak lain dari daftar.`);
  for (const m of o?.wajib || []) if (!ada(f[m])) tolak(m, WAJIB_PESAN[m]);
  if (o && f.rencana === 1 && !o.rencana) tolak("rencana", "Gerak ini tidak bisa dijadwalkan lebih dulu. Hapus centang Jadwalkan dulu.");
  if (ada(f.eta_jam)) { const e = Number(f.eta_jam), {min, maks} = MEDAN.gerak.eta_jam; if (!Number.isFinite(e) || e < min || e > maks) tolak("eta_jam", `Perkiraan tiba harus ${fmt(min)} sampai ${fmt(maks)} jam. Isi angka dalam rentang itu.`); }
  if (ada(f.pengangkut) && !MEDAN.gerak.pengangkut.pilihan.includes(f.pengangkut)) tolak("pengangkut", "Pengangkut tidak dikenal. Pilih dari daftar.");
  if (ada(f.prov) && !/^\d{2}$/.test(f.prov)) tolak("prov", "Kode provinsi harus 2 angka, misalnya 62. Perbaiki lalu simpan lagi.");
  for (const m of ["ke_lokasi", "kab", "permintaan_dari", "catatan"]) if (ada(f[m]) && String(f[m]).length > MEDAN.gerak[m].maks) tolak(m, `${MEDAN.gerak[m].label} paling banyak ${fmt(MEDAN.gerak[m].maks)} huruf. Persingkat teksnya.`);
  return g;
}

/* ---------- kehilangan komponen musim (DT §6.2): baris komponen hilang / baris komponen awal musim, dalam persen ---------- */
export const persenKehilangan = komp => {
  const dasar = komp.filter(x => x.musim_awal !== 0);
  return dasar.length ? dasar.filter(x => x.kondisi === "hilang").length * 100 / dasar.length : null;
};
/* dibandingkan pada nilai yang TAMPIL (satu desimal): "5%" tidak pernah bersanding dengan "di bawah ambang"; tepat di ambang = mencapai (PRD: kehilangan harus < 5%) */
export const tingkatKehilangan = p => { const r = p == null ? null : Math.round(p * 10) / 10; return r != null && r >= 20 ? "k15" : r != null && r >= 5 ? "u8" : "normal"; };
export const komponenKurang = komp => komp.filter(x => x.kondisi === "hilang").length;
const TINGKAT = {normal: "di bawah ambang U8 (5%)", u8: "mencapai ambang U8 (5%)", k15: "mencapai 20%: NO-GO koridor tetap (K-15)"};

/* kartu judul daftar: "3 kit: 2 di gudang Palangka Raya, 1 di banjir Kapuas; kehilangan komponen musim ini 1,2%" */
export function ringkasKit(kits, pct) {
  if (!kits.length) return "Belum ada kit terdaftar";
  const grup = new Map();
  for (const k of kits) { const kunci = `${k.status}|${k.lokasi || ""}`; grup.set(kunci, (grup.get(kunci) || 0) + 1); }
  const bagian = [...grup].map(([kunci, n]) => { const [s, l] = kunci.split("|"); return `${fmt(n)} di ${s}${l ? " " + l : ""}`; }).join(", ");
  return `${fmt(kits.length)} kit: ${bagian}${pct != null ? `; kehilangan komponen musim ini ${fmt(pct)}%` : ""}`;
}

/* judul kartu layar: satu klausa pendek; rincian status ada di pilStatusKit, lokasi di tooltip pil */
export function judulKit(kits, pct) {
  if (!kits.length) return "Belum ada kit terdaftar";
  return `${fmt(kits.length)} kit${pct != null ? `; kehilangan komponen musim ini ${fmt(pct)}%` : ""}`;
}
/* satu pil per status (urutan siklus hidup STATUS), jumlah id-ID; nama lokasi unik di title */
export function pilStatusKit(kits) {
  return STATUS.map(s => {
    const k = kits.filter(x => x.status === s); if (!k.length) return "";
    const lok = [...new Set(k.map(x => x.lokasi).filter(Boolean))].join(", ");
    return `<span class="sp-status ${esc(s)}"${lok ? ` title="${esc(lok)}"` : ""}>${esc(`${fmt(k.length)} ${(LABEL_STATUS[s] ?? s)}`)}</span>`;
  }).join("");
}

/* pemakaian tercatat dari tab Pemakaian dan BBM: jam pompa, air banjir, BBM keluar */
export const ringkasPakai = (pakai, bbm) => ({jam: pakai.reduce((s, l) => s + (l.jam_pompa || 0), 0), banjir: pakai.reduce((s, l) => s + (l.banjir_m3 || 0), 0),
  bbmKeluar: bbm.filter(b => b.aksi === "keluar").reduce((s, b) => s + (b.liter || 0), 0)});

/* ---------- QR (PRD §9.4.5, DS §3.14, RU T5): label hanya mengenal kode kit dan kode BOM, kode penugasan tidak pernah lewat sini ---------- */
const KODE_KIT = /^SIPPA-\d{3}$/, KODE_BOM = /^[A-Z][A-Z0-9]*-\d+$/;
export function labelKit(kode) { if (typeof kode !== "string" || !KODE_KIT.test(kode)) throw new Error("kode kit tidak sah"); return `SIPPA:${kode}`; }
export function labelBin(kode, bom) { if (typeof bom !== "string" || bom.length > 12 || !KODE_BOM.test(bom)) throw new Error("kode BOM tidak sah"); return `${labelKit(kode)}:${bom}`; }
/* teks pindaian atau ketikan manual -> {kode, bom} atau null; tautan penugasan dan kode 26 heks ditolak */
export function parseQR(teks) {
  if (typeof teks !== "string") return null;
  const t = teks.trim();
  if (/^SIPPA-\d{3}$/i.test(t)) return {kode: t.toUpperCase(), bom: null};
  const m = /^SIPPA:(SIPPA-\d{3})(?::([A-Z][A-Z0-9]*-\d+))?$/.exec(t);
  return m && (!m[2] || m[2].length <= 12) ? {kode: m[1], bom: m[2] || null} : null;
}
const KODE_TUGAS = /^[0-9a-f]{26}$/;
export function tautanTugas(kode) { if (typeof kode !== "string" || !KODE_TUGAS.test(kode)) throw new Error("kode penugasan tidak sah"); return `/pipa/lapangan#k=${kode}`; }
/* SVG QR dari objek qrcode-generator (getModuleCount, isDark): zona tenang 4 modul, latar putih lewat kelas (CSP tanpa gaya sebaris) */
export function qrSvg(qr, label) {
  const n = qr.getModuleCount(), m = 4, w = n + 2 * m;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg class="sp-qr-svg" viewBox="0 0 ${w} ${w}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="${w}" height="${w}" class="sp-qr-latar"/><path d="${d}" class="sp-qr-modul"/></svg>`;
}
export function buatQR(teks, label) {
  if (typeof globalThis.qrcode !== "function") throw new Error("pustaka QR belum dimuat");
  const q = globalThis.qrcode(0, "M"); q.addData(teks); q.make();
  return qrSvg(q, label);
}
const muatSkrip = src => new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error(`Gagal memuat ${src}`)); document.head.append(s); });
let janjiQR = null;
export const pastikanQR = () => typeof globalThis.qrcode === "function" ? Promise.resolve() : (janjiQR ??= muatSkrip("/vendor/qrcode/qrcode.min.js?v=1").catch(e => { janjiQR = null; throw e; }));

/* ---------- form tugaskan (DT §4.3 POST /api/sippa/tugas) ---------- */
export function cekTugas(f) {
  const g = [], tolak = (medan, alasan) => g.push({medan, alasan}), p = (v, a, b) => ada(v) && String(v).trim().length >= a && String(v).trim().length <= b;
  if (!p(f.nama_regu, 2, 80)) tolak("nama_regu", "Nama regu harus 2 sampai 80 huruf. Tulis nama regu yang jelas.");
  if (!Object.hasOwn(UNSUR, f.unsur)) tolak("unsur", "Unsur regu belum dipilih. Pilih salah satu dari daftar.");
  if (!/^\d{2}$/.test(String(f.prov ?? ""))) tolak("prov", "Provinsi belum dipilih. Pilih provinsi dari daftar.");
  if (!p(f.kab, 2, 60)) tolak("kab", "Kabupaten atau kota harus 2 sampai 60 huruf. Tulis nama wilayah tugasnya.");
  if (ada(f.kompleks_id) && !/^K[0-9]/.test(f.kompleks_id)) tolak("kompleks_id", "Kode kompleks diawali K lalu angka, misalnya K123. Perbaiki atau kosongkan.");
  const h = Number(f.berlaku_hari);
  if (!ada(f.berlaku_hari) || !Number.isInteger(h) || h < 1 || h > 30) tolak("berlaku_hari", "Masa berlaku harus bilangan bulat 1 sampai 30 hari. Isi angka dalam rentang itu.");
  return g;
}
export function badanTugas(f) {
  const b = {nama_regu: String(f.nama_regu).trim(), unsur: f.unsur, prov: f.prov, kab: String(f.kab).trim(), berlaku_hari: Number(f.berlaku_hari), lengan_dalam: f.lengan_dalam === 1 || f.lengan_dalam === "1" || f.lengan_dalam === true ? 1 : 0};
  if (ada(f.kit_id)) b.kit_id = f.kit_id;
  if (ada(f.kompleks_id)) b.kompleks_id = String(f.kompleks_id).trim();
  return b;
}

/* ---------- jaringan ---------- */
export function jalurApi(aksi, id) { if (!ID16.test(String(id))) throw new Error("id tidak sah"); return `/api/sippa/${aksi}/${id}`; }
export async function kirimPost(url, badan) {
  let r;
  try { r = await fetch(url, {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1", accept: "application/json"}, body: JSON.stringify(badan)}); }
  catch { const g = new Error("Tidak bisa terhubung ke server."); g.status = 0; throw g; }
  let j = null; try { j = await r.json(); } catch { /* badan bukan JSON */ }
  if (!r.ok) { const g = new Error(j?.galat || `Permintaan ditolak (kode ${r.status}).`); g.status = r.status; throw g; }
  return j;
}

/* ---------- HTML: semua teks dari data lewat esc ---------- */
const LABEL_STATUS = {gudang: "di gudang", depot: "di depot depan", gelar: "digelar", banjir: "dipakai banjir", servis: "servis", hilang: "hilang", pensiun: "pensiun"};
const pilStatus = (s, putus = false, teks = LABEL_STATUS[s] ?? s) => `<span class="sp-status ${esc(s)}${putus ? " putus" : ""}">${esc(teks)}</span>`;
const pilYakin = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const waktuTag = ms => ms == null ? "–" : `<time datetime="${new Date(ms).toISOString()}">${esc(jamWIB(ms))}</time>`;
const td = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;
const angka = (v, satuan = "") => v == null ? "–" : `${fmt(v)}${satuan ? " " + satuan : ""}`;
const namaProv = k => k == null ? "–" : (typeof Wilayah !== "undefined" && Wilayah.PROV?.[k]) || String(k);
export const sumberTeks = per => `<p class="ad-catat sp-sumber">Sumber: inventaris SIPPA, ${per == null ? "per –" : "per " + esc(jamWIB(per))}</p>`;
const tabel = (kepala, baris, kosongTeks, per) => baris.length
  ? `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kepala.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>${sumberTeks(per)}`
  : `<p class="ad-kosong">${kosongTeks}</p>`;

export function barisKitHtml(k) {
  const g = k.gerak_buka;
  return `<tr>${td("Kode", `<a class="sp-kit-kode" href="/pipa/kit/${esc(k.id)}">${esc(k.kode)}</a>`)}${td("Jenis", esc(JENIS_KIT[k.jenis] ?? k.jenis))}${td("Status", pilStatus(k.status) + (g ? " " + pilStatus(g.ke_status, true, `menuju ${g.ke_status}${g.eta_jam != null ? `, ETA ${fmt(g.eta_jam)} jam` : ""}`) : ""))}${td("Lokasi", esc(k.lokasi ?? "–"))}${td("Provinsi", esc(namaProv(k.prov)))}${td("Sejak", waktuTag(k.diubah))}${td("Komponen", k.komponen_kurang > 0 ? `${fmt(k.komponen_kurang)} kurang` : "lengkap")}${td("Jam pompa", esc(angka(k.jam_pompa_musim, "jam")), 1)}${td("m3 banjir", esc(angka(k.banjir_m3_musim)), 1)}${td("Pemilik asal", esc(k.pemilik_asal ?? "–"))}</tr>`;
}
const KEPALA_KIT = ["Kode", "Jenis", "Status", "Lokasi", "Provinsi", "Sejak", "Komponen", "Jam pompa", "m3 banjir", "Pemilik asal"];

/* tombol catat gerak: hanya yang sah untuk status dan peran (tombol tak sah tidak ditawarkan), satu tombol per alasan, koreksi satu tombol */
export function tombolGerakHtml(kit, peran) {
  const alasan = [...new Set(opsiGerak(kit.status, peran).map(o => o.alasan))];
  return alasan.length ? `<div class="sp-aksi">${alasan.map(a => `<button type="button" class="ad-tombol${a === "hilang" || a === "pensiun" ? " bahaya" : ""}" data-gerak="${a}">${TEKS_ALASAN[a]}</button>`).join("")}</div>` : "";
}

export function kepalaKitHtml(kit, pakai, komp, per) {
  const kurang = komponenKurang(komp);
  return `<header class="sp-kit-kepala"><div class="sp-kit-judul"><h1 class="sp-judul">${esc(kit.kode)}</h1>${pilStatus(kit.status)}<span class="sp-kit-meta">${esc([kit.lokasi, kit.kab, namaProv(kit.prov)].filter(x => x && x !== "–").join(", ") || "Lokasi belum dicatat")}</span><span class="sp-kit-meta">${esc(JENIS_KIT[kit.jenis] ?? kit.jenis)}, milik ${esc(kit.pemilik_asal ?? "–")}</span></div>
    <figure class="sp-qr"><div data-qr></div><figcaption class="num">${esc(kit.kode)}</figcaption></figure>
    <button type="button" class="ad-tombol" data-cetak>Cetak label</button></header>
    <dl class="sp-stat"><div><dt>Jam pompa tercatat</dt><dd class="num">${esc(angka(pakai.jam, "jam"))}</dd></div><div><dt>Air banjir tercatat</dt><dd class="num">${esc(angka(pakai.banjir, "m3"))}</dd></div><div><dt>BBM keluar</dt><dd class="num">${esc(angka(pakai.bbmKeluar, "L"))}</dd></div><div><dt>Komponen kurang</dt><dd class="num">${esc(fmt(kurang))}</dd></div></dl>
    <p class="sp-pil-baris">${pilYakin("Terverifikasi", "terverifikasi", "Dijumlahkan dari log gelar dan buku BBM yang tercatat")}</p>${sumberTeks(per)}`;
}

export function tabKomponenHtml(komp, peran, {ubah = false, per = null} = {}) {
  const pct = persenKehilangan(komp), tingkat = tingkatKehilangan(pct), tulis = peran === "W" || peran === "M";
  const kisi = pct == null ? "" : `<p class="sp-kehilangan"><b class="num">${esc(fmt(pct))}%</b> komponen musim ini hilang (${esc(fmt(komp.filter(x => x.musim_awal !== 0 && x.kondisi === "hilang").length))} dari ${esc(fmt(komp.filter(x => x.musim_awal !== 0).length))}) ${pilYakin(TINGKAT[tingkat], "asumsi-kebijakan", "Ambang 5% (U8) dan 20% (K-15) ditetapkan sebagai asumsi kebijakan")}</p>`;
  const baris = komp.map(x => `<tr>${td("Kode", esc(x.kode_bom))}${td("Kelas kinerja", esc(x.nama))}${td("Jumlah", esc(angka(x.jumlah, x.satuan)), 1)}${td("Nomor seri", esc(x.nomor_seri ?? "–"))}
    ${td("Kondisi", ubah ? `<select data-komp="${esc(x.id)}" aria-label="Kondisi ${esc(x.kode_bom)}">${Object.entries(KONDISI).map(([k, n]) => `<option value="${k}"${k === x.kondisi ? " selected" : ""}>${n}</option>`).join("")}</select>` : esc(KONDISI[x.kondisi] ?? x.kondisi))}${td("Dicek terakhir", waktuTag(x.dicek))}${td("Pemilik asal", esc(x.pemilik_asal ?? "–"))}</tr>`);
  const aksi = !tulis || !komp.length ? "" : ubah
    ? `<div class="sp-aksi"><label class="sp-tgl">Catatan, wajib bila ada yang hilang <input data-cek-catatan maxlength="500"></label><button type="button" class="ad-tombol" data-cek-simpan>Simpan hasil cek</button><button type="button" class="ad-tombol" data-cek-batal>Batal</button></div>`
    : `<div class="sp-aksi"><button type="button" class="ad-tombol" data-cek>Cek komponen</button></div>`;
  return kisi + tabel(["Kode", "Kelas kinerja", "Jumlah", "Nomor seri", "Kondisi", "Dicek terakhir", "Pemilik asal"], baris, "Belum ada komponen tercatat untuk kit ini.", per) + aksi;
}

/* garis waktu gerak, terbaru di atas; antar-provinsi dibandingkan dengan butir sebelumnya */
export function tabGerakHtml(gerak, kit, peran, per = null) {
  const urut = [...gerak].sort((a, b) => a.waktu - b.waktu);
  let prev = null;
  const butir = urut.map(g => { const antar = g.prov && prev && g.prov !== prev; if (g.prov) prev = g.prov; return {g, antar}; }).reverse().map(({g, antar}) => {
    const buka = g.rencana === 1 && g.tiba == null;
    return `<li class="sp-lini-butir${buka ? " sp-lini-rencana" : ""}"><div class="sp-lini-kepala">${pilStatus(g.dari_status)}${ikon("chevron-right")}${buka ? pilStatus(g.ke_status, true, `rencana${g.eta_jam != null ? `, ETA ${fmt(g.eta_jam)} jam` : ""}`) : pilStatus(g.ke_status)}${pilYakin(TEKS_ALASAN[g.alasan] ?? g.alasan, "terverifikasi")}${antar ? pilYakin("antar-provinsi", "asumsi-kebijakan") : ""}</div>
      <p>${waktuTag(g.waktu)}${g.pengangkut ? `, ${esc(TEKS_PENGANGKUT[g.pengangkut] ?? g.pengangkut)}` : ""}${g.ke_lokasi ? `, ke ${esc(g.ke_lokasi)}` : ""}${!buka && g.eta_jam != null ? `, ETA ${esc(fmt(g.eta_jam))} jam` : ""}${g.tiba != null ? `, tiba ${waktuTag(g.tiba)} (${esc(fmt.durasi(g.tiba - g.waktu))})` : ""}, oleh ${esc(g.oleh)}</p>
      ${g.catatan ? `<p class="ad-catat">${esc(g.catatan)}</p>` : ""}${buka && (peran === "W" || peran === "M") ? `<button type="button" class="ad-tombol" data-tiba="${esc(g.id)}">Konfirmasi tiba</button>` : ""}</li>`;
  });
  const lini = butir.length ? `<ol class="sp-lini" aria-label="${esc(`Riwayat gerak kit ${kit.kode}`)}">${butir.join("")}</ol>${sumberTeks(per)}` : `<p class="ad-kosong">Kit ini belum pernah bergerak sejak dibuat.</p>`;
  return lini + tombolGerakHtml(kit, peran);
}

export const tabPemakaianHtml = (pakai, per = null) => tabel(["Tanggal", "Jenis", "Kelas", "Jam pompa", "BBM", "Air", "Air banjir"],
  pakai.map(l => `<tr>${td("Tanggal", waktuTag(l.t_tiba))}${td("Jenis", esc(l.jenis))}${td("Kelas", esc(l.kelas_medan ?? "–"))}${td("Jam pompa", esc(angka(l.jam_pompa, "jam")), 1)}${td("BBM", esc(angka(l.bbm_l, "L")), 1)}${td("Air", esc(angka(l.air_m3, "m3")), 1)}${td("Air banjir", esc(angka(l.banjir_m3, "m3")), 1)}</tr>`), "Belum ada sesi gelar atau banjir yang memakai kit ini.", per);
export const tabBbmHtml = (bbm, per = null) => tabel(["Waktu", "Jenis", "Aksi", "Liter", "Operator", "Tiket", "Pencatat"],
  bbm.map(b => `<tr>${td("Waktu", waktuTag(b.waktu))}${td("Jenis", esc(b.jenis))}${td("Aksi", esc(b.aksi))}${td("Liter", esc(angka(b.liter, "L")), 1)}${td("Operator", esc(b.operator ?? "–"))}${td("Tiket", esc(b.tiket ?? "–"))}${td("Pencatat", esc(b.oleh))}</tr>`), "Buku BBM kit ini masih kosong. Buku hanya bisa ditambah, tidak disunting.", per);

export function tabTugasHtml(tugas, peran, kini = Date.now(), per = null) {
  const tulis = peran === "W" || peran === "M";
  const status = t => t.dicabut != null ? ["dicabut"] : kini >= t.berakhir ? ["kedaluwarsa"] : ["aktif"];
  const baris = tugas.map(t => { const [s] = status(t); return `<tr>${td("Regu", esc(t.nama_regu))}${td("Unsur", esc(UNSUR[t.unsur] ?? t.unsur))}${td("Wilayah", esc(`${t.kab ?? "–"}, ${namaProv(t.prov)}`))}${td("Berlaku", `${waktuTag(t.mulai)} sampai ${waktuTag(t.berakhir)}`)}${td("Status", pilStatus(s, false, s))}${td("Aksi", tulis && s === "aktif" ? `<button type="button" class="ad-tombol bahaya" data-cabut="${esc(t.id)}">Cabut tugas</button>` : "")}</tr>`; });
  return `<p class="ad-catat">Kode penugasan tidak pernah ditampilkan lagi sesudah dibuat; yang tersimpan hanya sidik jarinya.</p>${tabel(["Regu", "Unsur", "Wilayah", "Berlaku", "Status", "Aksi"], baris, "Belum ada penugasan untuk kit ini.", per)}${tulis ? `<div class="sp-aksi"><button type="button" class="ad-tombol" data-tugaskan>Tugaskan</button></div>` : ""}`;
}

/* ---------- DOM ---------- */
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const peranSaya = () => peranKlien(document.body?.dataset);
const pergi = jalur => { history.pushState(null, "", jalur + location.search); dispatchEvent(new PopStateEvent("popstate")); };   // app.js mendengar popstate: aria-current seketika, layar sesudah satu frame

let ctrl = null, dialogTerbuka = null, kamera = null;
function tutupKamera() { if (kamera) { clearInterval(kamera.timer); kamera.strim?.getTracks().forEach(t => t.stop()); kamera = null; } }
export function bukaDialog(judul, isi) {
  tutupDialog();
  const d = el("dialog", "sp-dialog dlg"), kepala = el("div", "dh"), h = el("h3", "", judul), x = el("button", "");
  h.tabIndex = -1; x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.innerHTML = ikon("x");
  kepala.append(h, x); const badan = el("div", "db"); badan.append(isi); d.append(kepala, badan);
  x.addEventListener("click", () => d.close());
  d.addEventListener("close", () => { d.replaceChildren(); d.remove(); if (dialogTerbuka === d) dialogTerbuka = null; });   // isi dibuang saat tutup: kode sekali tampil tidak tersisa di DOM
  document.body.append(d); d.showModal(); h.focus(); dialogTerbuka = d;
  return d;
}
export function tutupDialog() { dialogTerbuka?.close(); dialogTerbuka = null; }
export function lepas() { ctrl?.abort(); ctrl = null; tutupKamera(); tutupDialog(); document.body?.classList.remove("sp-mencetak"); document.querySelectorAll(".sp-cetak-area").forEach(e => e.remove()); }

const kotakGalat = (daftar) => { const e = el("div", "ad-galat"); e.setAttribute("role", "alert"); const ul = el("ul"); daftar.forEach(g => ul.append(el("li", "", g))); e.append(ul); return e; };

/* form gerak: dipakai layar ini dan SP-043 (rencana banjir). rencana = hanya gerak yang boleh terencana; alasan = kunci ke satu alasan. */
export function formGerak(kit, {rencana = false, alasan = null, peran = peranSaya(), sesudah = () => {}} = {}) {
  const opsi = opsiGerak(kit.status, peran).filter(o => (!rencana || o.rencana) && (!alasan || o.alasan === alasan));
  const f = el("form", "sp-form"); f.noValidate = true;
  if (!opsi.length) { f.append(kosong("Tidak ada gerak yang sah dari status ini untuk perananmu.")); return f; }
  const label = o => o.alasan === "koreksi" ? `Koreksi status menjadi ${NAMA_STATUS[o.ke_status]}` : TEKS_ALASAN[o.alasan];
  f.innerHTML = `<label>Gerak <select name="gerak">${opsi.map(o => `<option value="${esc(o.alasan)}:${esc(o.ke_status)}">${esc(label(o))}</option>`).join("")}</select></label>
    <label data-g="rencana"><input type="checkbox" name="rencana"${rencana ? " checked" : ""}> Jadwalkan dulu (kit baru berpindah saat tiba dikonfirmasi)</label>
    <label>Lokasi tujuan <input name="ke_lokasi" maxlength="${MEDAN.gerak.ke_lokasi.maks}"></label>
    <label>Kabupaten atau kota <input name="kab" maxlength="${MEDAN.gerak.kab.maks}"></label>
    <label>Kode provinsi <input name="prov" maxlength="2" inputmode="numeric" pattern="[0-9]{2}"></label>
    <label data-g="eta">Perkiraan tiba, jam <input name="eta_jam" inputmode="decimal"></label>
    <label data-g="angkut">Pengangkut <select name="pengangkut"><option value="">Pilih</option>${MEDAN.gerak.pengangkut.pilihan.map(p => `<option value="${p}">${esc(TEKS_PENGANGKUT[p] ?? p)}</option>`).join("")}</select></label>
    <label data-g="minta">Permintaan dari <input name="permintaan_dari" maxlength="${MEDAN.gerak.permintaan_dari.maks}"></label>
    <label>Catatan <textarea name="catatan" rows="2" maxlength="${MEDAN.gerak.catatan.maks}"></textarea></label>
    <div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama"></button></div>`;
  const q = n => f.querySelector(`[data-g="${n}"]`), sel = () => opsi.find(o => `${o.alasan}:${o.ke_status}` === f.elements.gerak.value) || opsi[0], kirim = f.querySelector("button[type=submit]");
  /* chrome seketika: bidang yang relevan muncul atau hilang di handler, tanpa kerja berat */
  const sesuaikan = () => {
    const o = sel(); q("rencana").hidden = !o.rencana; const r = o.rencana && f.elements.rencana.checked;
    q("eta").hidden = !r; q("angkut").hidden = !(o.wajib.includes("pengangkut") || r); q("minta").hidden = !o.wajib.includes("permintaan_dari");
    kirim.textContent = o.alasan === "koreksi" ? "Simpan koreksi" : label(o); kirim.classList.toggle("bahaya", o.alasan === "hilang" || o.alasan === "pensiun");
  };
  f.addEventListener("change", sesuaikan); sesuaikan();
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const o = sel(), slot = f.querySelector(".sp-galat-slot"), v = n => String(f.elements[n].value ?? "").trim();
    const b = {alasan: o.alasan, ke_status: o.ke_status};
    if (o.rencana && f.elements.rencana.checked) b.rencana = 1;
    for (const n of ["ke_lokasi", "kab", "prov", "pengangkut", "permintaan_dari", "catatan"]) if (v(n)) b[n] = v(n);
    if (b.rencana && v("eta_jam")) b.eta_jam = Number(v("eta_jam").replace(",", "."));
    const salah = cekGerak(kit, b, peran);
    if (salah.length) { slot.replaceChildren(kotakGalat(salah.map(g => g.alasan))); return; }
    kirim.disabled = true; kirim.setAttribute("aria-busy", "true"); slot.replaceChildren();
    try { sesudah(await kirimPost(jalurApi("gerak", kit.id), b)); }
    catch (er) { slot.replaceChildren(kotakGalat([er.message])); kirim.disabled = false; kirim.removeAttribute("aria-busy"); }
  });
  return f;
}

/* ---------- label cetak A6 (DS §3.14): area khusus di body, hanya ia yang tercetak ---------- */
function cetakLabel(kit, komp) {
  const area = el("div", "sp-cetak-area"), a6 = el("section", "sp-label-a6");
  const qrA6 = el("div", "sp-label-qr"); qrA6.innerHTML = buatQR(labelKit(kit.kode), `QR kit ${kit.kode}`);
  const ket = el("div", "sp-label-teks");
  for (const [k, t] of [["sp-label-merk", "SIPPA"], ["sp-label-kode", kit.kode], ["", JENIS_KIT[kit.jenis] ?? kit.jenis], ["", `Milik: ${kit.pemilik_asal ?? "–"}`], ["sp-label-bmn", "Barang Milik Negara BNPB"]]) ket.append(el("p", k, t));
  a6.append(ket, qrA6); area.append(a6);
  for (const x of komp) {
    let teks; try { teks = labelBin(kit.kode, x.kode_bom); } catch { continue; }   // kode BOM tak lazim tidak dicetak
    const bin = el("section", "sp-label-bin"), q = el("div", "sp-label-qr"); q.innerHTML = buatQR(teks, `QR ${x.kode_bom} kit ${kit.kode}`);
    bin.append(q, el("p", "num", teks)); area.append(bin);
  }
  document.body.append(area); document.body.classList.add("sp-mencetak");
  const bersih = () => { document.body.classList.remove("sp-mencetak"); area.remove(); removeEventListener("afterprint", bersih); };
  addEventListener("afterprint", bersih); print();
}

/* ---------- dialog tugaskan: kode tampil SEKALI, tidak disimpan, tidak masuk alamat ---------- */
function dialogTugaskan(kit, sesudahTutup) {
  const f = el("form", "sp-form"); f.noValidate = true;
  const PROV = (typeof Wilayah !== "undefined" && Wilayah.PROV) || {"62": "Kalimantan Tengah"};
  f.innerHTML = `<label>Nama regu <input name="nama_regu" maxlength="80" required></label>
    <label>Unsur <select name="unsur">${Object.entries(UNSUR).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></label>
    <label>Provinsi <select name="prov">${Object.entries(PROV).map(([k, n]) => `<option value="${esc(k)}"${k === (kit.prov ?? "") ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <label>Kabupaten atau kota <input name="kab" maxlength="60" value="${esc(kit.kab ?? "")}"></label>
    <label>Kompleks tujuan, boleh kosong <input name="kompleks_id" maxlength="12" placeholder="K123"></label>
    <label>Masa berlaku, hari (1 sampai 30) <input name="berlaku_hari" inputmode="numeric" value="7"></label>
    <label><input type="checkbox" name="lengan_dalam"> Lengan uji: boleh mengisi probe 150 sampai 500 cm</label>
    <div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama">Tugaskan kit</button></div>`;
  const d = bukaDialog(`Tugaskan ${kit.kode}`, f);
  if (sesudahTutup) d.addEventListener("close", sesudahTutup);
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const slot = f.querySelector(".sp-galat-slot"), isian = {kit_id: kit.id, lengan_dalam: f.elements.lengan_dalam.checked ? 1 : 0};
    for (const n of ["nama_regu", "unsur", "prov", "kab", "kompleks_id", "berlaku_hari"]) isian[n] = f.elements[n].value;
    const salah = cekTugas(isian);
    if (salah.length) { slot.replaceChildren(kotakGalat(salah.map(g => g.alasan))); return; }
    const kirim = f.querySelector("button[type=submit]"); kirim.disabled = true; kirim.setAttribute("aria-busy", "true"); slot.replaceChildren();
    try {
      const j = await kirimPost("/api/sippa/tugas", badanTugas(isian));
      await pastikanQR().catch(() => {});
      const tautan = tautanTugas(j.kode), mutlak = location.origin + tautan, hasil = el("div", "sp-kode-sekali");
      const peringatan = el("p", "sp-peringatan", "Simpan atau kirim tautan ini sekarang; tautan tidak bisa ditampilkan lagi."); peringatan.setAttribute("role", "alert");
      const fig = el("figure", "sp-qr"); const qrBox = el("div"); try { qrBox.innerHTML = buatQR(mutlak, "QR tautan penugasan untuk operator"); } catch { qrBox.append(el("p", "ad-kosong", "QR tidak bisa digambar; pakai tautan.")); }
      fig.append(qrBox, el("figcaption", "", `Pindai dengan ponsel operator: regu ${isian.nama_regu.trim()}`));
      const kolom = el("input"); kolom.readOnly = true; kolom.value = mutlak; kolom.setAttribute("aria-label", "Tautan penugasan"); kolom.addEventListener("focus", () => kolom.select());
      const salin = el("button", "ad-tombol", "Salin tautan"); salin.type = "button";
      salin.addEventListener("click", async () => { try { await navigator.clipboard.writeText(mutlak); salin.textContent = "Tersalin"; } catch { kolom.select(); salin.textContent = "Pilih lalu salin manual"; } });
      hasil.append(peringatan, fig, kolom, salin);
      f.replaceWith(hasil);
    } catch (er) { slot.replaceChildren(kotakGalat([er.message])); kirim.disabled = false; kirim.removeAttribute("aria-busy"); }
  });
}

/* ---------- layar ---------- */
export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  return konteks.id ? rincian(akar, konteks) : daftar(akar, konteks);
}

async function daftar(akar, konteks) {
  const sinyal = ctrl.signal, st = {status: new Set(STATUS), jenis: new Set(Object.keys(JENIS_KIT)), kit: [], kehilangan: null, per: null};
  akar.innerHTML = `<h1 class="sp-judul">Kit</h1><div id="sp-kit-isi"></div>`;
  const isi = akar.querySelector("#sp-kit-isi");
  const baru = () => {
    isi.innerHTML = `<div id="sp-kit-kartu"></div>
      <div class="sp-kontrol" role="group" aria-label="Penyaring kit"><button type="button" class="ad-tombol sp-besar" data-pindai aria-expanded="false" aria-controls="sp-pindai">Pindai QR</button>
        <div class="sp-chips" role="group" aria-label="Status">${STATUS.map(s => `<button type="button" class="ad-chip" data-status="${s}" aria-pressed="true">${NAMA_STATUS[s]}</button>`).join("")}</div>
        <div class="sp-chips" role="group" aria-label="Jenis">${Object.entries(JENIS_KIT).map(([k, n]) => `<button type="button" class="ad-chip" data-jenis="${k}" aria-pressed="true">${n}</button>`).join("")}</div></div>
      <section class="sp-pindai" id="sp-pindai" hidden><div class="sp-pindai-video" hidden></div><p class="sp-pindai-info" role="status"></p>
        <form class="sp-pindai-form"><label>Kode kit <input name="kode" placeholder="SIPPA-001" autocomplete="off" maxlength="40"></label><button type="submit" class="ad-tombol">Buka kit</button></form></section>
      <div id="sp-kit-tabel"></div>`;
    gambar();
  };
  const gambar = () => {
    if (sinyal.aborted) return;
    const baris = st.kit.filter(k => st.status.has(k.status) && st.jenis.has(k.jenis));
    const pct = st.kehilangan?.musim_pct ?? null, per = st.per;
    konteks.setPer?.(per);
    const tingkat = tingkatKehilangan(pct);
    isi.querySelector("#sp-kit-kartu").innerHTML = Kartu.kartu("Kit", esc(judulKit(st.kit, pct)), `<div class="sp-pil-baris">${pilStatusKit(st.kit)}${pct != null ? pilYakin(TINGKAT[tingkat], "asumsi-kebijakan", "Ambang 5% (U8) dan 20% (K-15) ditetapkan sebagai asumsi kebijakan") : ""}${pilYakin("Inventaris staf", "terverifikasi", "Diisi dan diperiksa staf lewat layar ini")}</div>`, `inventaris SIPPA, ${per == null ? "per –" : "per " + jamWIB(per)}`);
    isi.querySelector("#sp-kit-tabel").innerHTML = st.kit.length ? tabel(KEPALA_KIT, baris.map(barisKitHtml), "Tidak ada kit yang cocok dengan penyaring.", per) : `<p class="ad-kosong">Belum ada kit. Kit dibuat oleh moderator; unit pertama SIPPA-001.</p>`;
  };
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambar(); }); };
  const muat = async () => {
    isi.replaceChildren(memuat());
    try {
      const j = await konteks.ambil("/api/sippa/kit", sinyal);
      if (sinyal.aborted) return;
      st.kit = j.kit || []; st.kehilangan = j.kehilangan || null; st.per = Date.now();   // inventaris dibaca langsung dari D1 saat ini
      baru();
    } catch (e) { if (sinyal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.message, muat)); }
  };

  /* pindai: BarcodeDetector bila ada, isian manual selalu ada. Hasil membuka rincian kit bila kodenya dikenal. */
  const bukaDariTeks = teks => {
    const p = parseQR(teks), info = isi.querySelector(".sp-pindai-info"), k = p && st.kit.find(x => x.kode === p.kode);
    if (!p) { info.textContent = "Teks itu bukan label kit SIPPA."; return false; }
    if (!k) { info.textContent = `Kit ${p.kode} tidak ada di daftarmu.`; return false; }
    tutupKamera(); pergi(`/pipa/kit/${k.id}`); return true;
  };
  async function mulaiKamera() {
    const info = isi.querySelector(".sp-pindai-info"), kotak = isi.querySelector(".sp-pindai-video");
    if (kamera || !("BarcodeDetector" in globalThis) || !navigator.mediaDevices?.getUserMedia) { info.textContent = kamera ? "" : "Peramban ini belum bisa memindai. Ketik kode kit di bawah."; return; }
    info.textContent = "Arahkan kamera ke QR kit";
    try {
      const strim = await navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}), v = el("video"); v.srcObject = strim; v.muted = true; v.setAttribute("playsinline", ""); try { await v.play(); } catch (e) { strim.getTracks().forEach(t => t.stop()); throw e; }
      if (sinyal.aborted || isi.querySelector("#sp-pindai")?.hidden !== false) { strim.getTracks().forEach(t => t.stop()); return; }   // panel ditutup atau layar dilepas selama menunggu izin kamera
      kotak.hidden = false; kotak.replaceChildren(v);
      const det = new BarcodeDetector({formats: ["qr_code"]});
      let sibuk = false;   // satu deteksi sekaligus: bingkai lambat tidak menumpuk
      kamera = {strim, timer: setInterval(async () => { if (sibuk) return; sibuk = true; try { const h = await det.detect(v); if (h[0]) bukaDariTeks(h[0].rawValue); } catch { /* bingkai belum siap */ } finally { sibuk = false; } }, 300)};
    } catch { info.textContent = "Kamera tidak bisa dibuka. Ketik kode kit di bawah."; }
  }

  /* INP: aria-pressed dan aria-expanded berubah di handler; gambar ulang tabel lewat nanti() */
  akar.addEventListener("click", e => {
    const c = e.target.closest("[data-status],[data-jenis]");
    if (c) { const on = c.getAttribute("aria-pressed") !== "true"; c.setAttribute("aria-pressed", on); const [h, k] = c.dataset.status ? ["status", c.dataset.status] : ["jenis", c.dataset.jenis]; st[h][on ? "add" : "delete"](k); jadwalkan(); return; }
    const p = e.target.closest("[data-pindai]");
    if (p) { const buka = p.getAttribute("aria-expanded") !== "true"; p.setAttribute("aria-expanded", buka); isi.querySelector("#sp-pindai").hidden = !buka; if (buka) nanti(mulaiKamera); else tutupKamera(); return; }
    const a = e.target.closest("a.sp-kit-kode");
    if (a && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); pergi(a.pathname); }
  }, {signal: sinyal});
  akar.addEventListener("submit", e => { const f = e.target.closest(".sp-pindai-form"); if (f) { e.preventDefault(); bukaDariTeks(f.elements.kode.value); } }, {signal: sinyal});
  await muat();
}

async function rincian(akar, konteks) {
  const sinyal = ctrl.signal, peran = peranSaya(), id = konteks.id;
  const st = {tab: "komponen", ubah: false, d: null, per: null};
  akar.innerHTML = `<p><a class="sp-balik" href="/pipa/kit">Semua kit</a></p><div id="sp-kit-isi"></div>`;
  const isi = akar.querySelector("#sp-kit-isi");
  const TAB = [["komponen", "Komponen"], ["gerak", "Gerak"], ["pemakaian", "Pemakaian"], ["bbm", "BBM"], ["tugas", "Penugasan"]];
  const isiTab = () => {
    const d = st.d;
    return st.tab === "komponen" ? tabKomponenHtml(d.komponen || [], peran, {ubah: st.ubah, per: st.per}) : st.tab === "gerak" ? tabGerakHtml(d.gerak || [], d.kit, peran, st.per)
      : st.tab === "pemakaian" ? tabPemakaianHtml(d.pemakaian || [], st.per) : st.tab === "bbm" ? tabBbmHtml(d.bbm || [], st.per) : tabTugasHtml(d.tugas || [], peran, Date.now(), st.per);
  };
  const gambarTab = () => { if (!sinyal.aborted && st.d) isi.querySelector("#sp-tab-isi").innerHTML = isiTab(); };
  /* satu gambar ulang antre sekaligus: klik beruntun tidak menumpuk kerja berat */
  let tabTerjadwal = false;
  const jadwalkanTab = () => { if (tabTerjadwal) return; tabTerjadwal = true; nanti(() => { tabTerjadwal = false; gambarTab(); }); };
  const gambar = async () => {
    const d = st.d, pakai = ringkasPakai(d.pemakaian || [], d.bbm || []);
    konteks.setPer?.(st.per);
    isi.innerHTML = kepalaKitHtml(d.kit, pakai, d.komponen || [], st.per) + `<div class="ad-tabs" role="group" aria-label="Rincian kit">${TAB.map(([k, n]) => `<button type="button" data-tab="${k}" aria-pressed="${k === st.tab}">${n}</button>`).join("")}</div><div id="sp-tab-isi" class="sp-tab-isi"></div>`;
    gambarTab();
    try { await pastikanQR(); if (!sinyal.aborted) isi.querySelector("[data-qr]").innerHTML = buatQR(labelKit(d.kit.kode), `QR kit ${d.kit.kode}`); } catch { /* kode tertulis di bawah QR tetap terbaca */ }
  };
  let muatCtrl = null;
  const muat = async (senyap = false) => {
    muatCtrl?.abort(); const ac = muatCtrl = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});   // jawaban basi tidak pernah menimpa yang terbaru
    if (!senyap) isi.replaceChildren(memuat());
    try {
      const d = await konteks.ambil(jalurApi("kit", id), ac.signal);
      if (ac.signal.aborted) return;
      st.d = d; st.per = Date.now(); await gambar();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status === 404 ? "Kit tidak ditemukan atau di luar wilayahmu." : e.message, muat)); }
  };
  const lapor = t => konteks.pesan?.(t);
  const aksi = async (f, ok) => { try { await f(); await muat(true); if (ok) lapor(ok); return true; } catch (e) { lapor(e.message); return false; } };

  akar.addEventListener("click", e => {
    const t = e.target;
    const tab = t.closest("[data-tab]");
    if (tab) { st.tab = tab.dataset.tab; st.ubah = false; tab.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === tab))); jadwalkanTab(); return; }   // chrome seketika, isi sesudah satu frame
    if (t.closest(".sp-balik")) { e.preventDefault(); pergi("/pipa/kit"); return; }
    if (!st.d) return;
    const g = t.closest("[data-gerak]");
    if (g) { bukaDialog(TEKS_ALASAN[g.dataset.gerak], formGerak(st.d.kit, {alasan: g.dataset.gerak, peran, sesudah: () => { tutupDialog(); muat(true); }})); return; }
    const ti = t.closest("[data-tiba]");
    if (ti) { ti.disabled = true; aksi(() => kirimPost(jalurApi("tiba", ti.dataset.tiba), {}), "Tiba tercatat."); return; }
    const sibukkan = b => { b.disabled = true; b.setAttribute("aria-busy", "true"); };   // umpan balik seketika, cegah klik ganda
    const cek = t.closest("[data-cek],[data-cek-batal]");
    if (cek) { sibukkan(cek); st.ubah = cek.hasAttribute("data-cek"); jadwalkanTab(); return; }
    const simpan = t.closest("[data-cek-simpan]");
    if (simpan) {
      if (simpan.disabled) return;
      const asal = new Map((st.d.komponen || []).map(x => [x.id, x.kondisi])), catatan = akar.querySelector("[data-cek-catatan]").value.trim();
      const ubah = [...akar.querySelectorAll("[data-komp]")].map(s => ({id: s.dataset.komp, kondisi: s.value, dicek: true}));
      if (ubah.some(u => u.kondisi === "hilang" && asal.get(u.id) !== "hilang") && !catatan) { lapor("Catatan wajib bila ada komponen yang ditandai hilang. Isi kolom catatan lalu simpan lagi."); return; }
      const badan = {ubah}; if (catatan) badan.catatan = catatan;
      sibukkan(simpan);
      aksi(() => kirimPost(jalurApi("komponen", id), badan), "Hasil cek tersimpan.").then(ok => { if (ok) st.ubah = false; else { simpan.disabled = false; simpan.removeAttribute("aria-busy"); } }); return;
    }
    if (t.closest("[data-tugaskan]")) { dialogTugaskan(st.d.kit, () => muat(true)); return; }
    const cb = t.closest("[data-cabut]");
    if (cb) {
      const isiKonf = el("div"), p = el("p", "", "Kode penugasan ini berhenti berlaku seketika dan tidak bisa dihidupkan lagi. Regu perlu kode baru."), aks = el("div", "sp-aksi"), batal = el("button", "ad-tombol", "Batal"), ya = el("button", "ad-tombol bahaya", "Cabut tugas");
      batal.type = ya.type = "button"; aks.append(batal, ya); isiKonf.append(p, aks);
      const regu = (st.d.tugas || []).find(x => x.id === cb.dataset.cabut)?.nama_regu ?? "ini";
      const d = bukaDialog(`Cabut tugas regu ${regu}?`, isiKonf);
      batal.addEventListener("click", () => d.close());
      ya.addEventListener("click", () => { ya.disabled = true; d.close(); aksi(() => kirimPost(jalurApi("tugas-cabut", cb.dataset.cabut), {}), "Penugasan dicabut."); });
      return;
    }
    const cetak = t.closest("[data-cetak]");
    if (cetak) {
      if (cetak.getAttribute("aria-busy") === "true") return;
      cetak.setAttribute("aria-busy", "true");
      nanti(async () => {
        let ok = true;
        try { await pastikanQR(); } catch { ok = false; lapor("Label tidak bisa dibuat: pustaka QR gagal dimuat."); }
        if (ok) { try { cetakLabel(st.d.kit, st.d.komponen || []); } catch (e) { console.error(e); lapor("Label tidak bisa dibuat. Coba lagi."); } }
        cetak.removeAttribute("aria-busy");
      });
    }
  }, {signal: sinyal});
  await muat();
}
