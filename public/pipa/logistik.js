/* SIPPA: logistik fase 3 (keputusan 61: SP-143 butir 32, 33, 35; SP-144 butir 34, 40). Fungsi murni tanpa DOM; hanya pembangun HTML memakai global
   public/inti (fmt, esc, jamWIB). Tidak ada data di berkas ini: semua masukan datang dari /api/sippa/* dan public/banjir/data/status.json (dibaca layar).
   Semua ambang di sini berlabel asumsi-kebijakan. */
import {KELAS, kelasDari} from "./pelihara.js";
import {KELAS_POMPA} from "./hitung.js";

const HARI = 864e5, WIB = 7 * 36e5;
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const h = s => typeof esc === "function" ? esc(s) : String(s);
const tglId = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric"});
const angka = x => typeof x === "number" && Number.isFinite(x);

/* ---------- butir 32: beli ulang. baris = keluaran barisStok (layar_pelihara): {gudang, kode_bom, saldo, satuan, min, bawah} ---------- */
export const jumlahBeli = b => b && b.min != null && angka(b.saldo) && b.saldo < b.min ? b.min - b.saldo : 0;
export function daftarBeli(baris) {
  return (baris || []).map(b => ({...b, beli: jumlahBeli(b)})).filter(b => b.beli > 0)
    .sort((x, y) => y.beli - x.beli || (x.gudang < y.gudang ? -1 : x.gudang > y.gudang ? 1 : 0) || (x.kode_bom < y.kode_bom ? -1 : 1));
}
export const teksBeli = b => `beli ulang ${tampil(jumlahBeli(b))} ${b.satuan ?? ""}`.trim();

/* ---------- butir 33: servis pompa dari jam pakai. Batas jam servis K1 dibaca dari pelihara.js (satu-satunya tempat angka itu). ---------- */
export const BATAS_JAM_SERVIS = KELAS.K1.interval.jam.servis;
export const SEGERA_JAM = BATAS_JAM_SERVIS * 0.2;   // asumsi kebijakan: 20% terakhir dari batas = segera
/* d = payload /api/sippa/pelihara: komponen [{kit_id, kit_kode, kode_bom}], jam_sejak_servis {kit_id: jam}. Satu baris per kit yang punya pompa K1. */
export function servisPompa(d) {
  const kit = new Map();
  for (const c of d?.komponen || []) if (kelasDari(c.kode_bom) === "K1" && !kit.has(c.kit_id)) kit.set(c.kit_id, c.kit_kode);
  const rows = [...kit].map(([id, kode]) => {
    const jam = d.jam_sejak_servis?.[id];
    if (!angka(jam) || jam < 0) return {kit_id: id, kit_kode: kode, jam: null, sisa: null, status: "tanpa_jam"};
    const sisa = BATAS_JAM_SERVIS - jam;
    return {kit_id: id, kit_kode: kode, jam, sisa, status: sisa <= 0 ? "jatuh_tempo" : sisa <= SEGERA_JAM ? "segera" : "aman"};
  });
  const urut = {jatuh_tempo: 0, segera: 1, aman: 2, tanpa_jam: 3};
  return rows.sort((a, b) => urut[a.status] - urut[b.status] || (a.sisa ?? Infinity) - (b.sisa ?? Infinity) || (a.kit_kode < b.kit_kode ? -1 : 1));
}
const TEKS_SERVIS = {jatuh_tempo: "Jatuh tempo servis", segera: "Segera servis", aman: "Aman", tanpa_jam: "Jam belum tercatat"};
export function servisHtml(rows) {
  const baris = rows.map(r => `<tr><td data-label="Kit">${h(r.kit_kode ?? "–")}</td><td class="n" data-label="Jam sejak servis">${r.jam == null ? "–" : h(tampil(r.jam))}</td>`
    + `<td class="n" data-label="Sisa">${r.sisa == null ? "–" : r.sisa <= 0 ? `lewat ${h(tampil(-r.sisa))} jam` : `${h(tampil(r.sisa))} jam`}</td>`
    + `<td data-label="Status"><span class="${r.status === "jatuh_tempo" ? "sp-laik" : "sp-sub"}">${h(TEKS_SERVIS[r.status])}</span></td></tr>`).join("");
  return `<section class="sp-panel-pel" aria-labelledby="sp-servis-h"><h2 class="sp-sub-judul" id="sp-servis-h">${rows.some(r => r.status === "jatuh_tempo") ? `${h(tampil(rows.filter(r => r.status === "jatuh_tempo").length))} pompa jatuh tempo servis` : "Servis pompa dari jam pakai"}</h2>`
    + (rows.length ? `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Servis pompa per kit</caption><thead><tr>${["Kit", "Jam sejak servis", "Sisa", "Status"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>` : `<p class="ad-kosong">Belum ada kit dengan pompa tercatat.</p>`)
    + `<p class="ad-catat">Batas servis ${h(tampil(BATAS_JAM_SERVIS))} jam pompa (kelas K1); segera bila sisa ${h(tampil(SEGERA_JAM))} jam atau kurang. <span class="sp-yakin asumsi-kebijakan">asumsi-kebijakan</span></p></section>`;
}

/* ---------- butir 35: BBM per gelar menjadi permintaan logistik. h = hasil hidraulika(), nilai = masukan kalkulator. ---------- */
export function permintaanBbm({h: hasil, nilai, lokasi = null, tanggal}) {
  if (!hasil || !angka(hasil.bbm_l) || !angka(hasil.bbm_l_jam)) throw new RangeError("hasil kalkulator belum punya angka BBM");
  if (!angka(tanggal)) throw new RangeError("tanggal harus angka (ms epoch)");
  const kelas = KELAS_POMPA[nilai.pompa], jenis = nilai.jenis_bbm ?? kelas?.bbm ?? "solar", liter = Math.ceil(hasil.bbm_l - 1e-9);
  const baris = [
    "PERMINTAAN BBM UNTUK GELAR SIPPA",
    `Tanggal: ${tglId(tanggal)}`,
    `Lokasi: ${lokasi || "belum diisi, tulis lokasi gelar"}`,
    `Peralatan: ${tampil(nilai.n_pompa)} pompa ${kelas?.nama ?? nilai.pompa}`,
    `Jenis BBM: ${jenis === "bensin" ? "bensin" : "solar"}`,
    `Jumlah diminta: ${tampil(liter)} liter`,
    `Dasar hitung: ${tampil(hasil.bbm_l_jam)} liter per jam untuk ${tampil(nilai.n_pompa)} pompa, ${tampil(nilai.jam)} jam gelar`,
    "Keyakinan: estimasi model dari kalkulator hidraulika SIPPA (konsumsi spesifik BBM, PRD §6.4), belum diukur di lapangan",
    "Catatan: tambahkan cadangan bila gelar bisa melebihi jam di atas; sesuaikan dengan stok kit di buku BBM.",
  ];
  return {liter, jenis, jam: nilai.jam, lokasi: lokasi || null, teks: baris.join("\n")};
}

/* ---------- butir 34: lini masa kit per modul. gerak = rincian kit .gerak [{dari_status, ke_status, waktu, tiba, rencana}] ---------- */
const MODUL_STATUS = {gelar: "karhutla", depot: "karhutla", banjir: "banjir", gudang: "gudang", servis: "servis", hilang: "hilang", pensiun: "pensiun"};
export const NAMA_MODUL = {karhutla: "Karhutla", banjir: "Banjir", gudang: "Gudang", servis: "Servis", hilang: "Hilang", pensiun: "Pensiun"};
export function segmenModul(gerak, kini) {
  const sah = (gerak || []).filter(g => !(g.rencana === 1 && g.tiba == null)).map(g => ({...g, saat: g.tiba ?? g.waktu})).filter(g => angka(g.saat)).sort((a, b) => a.saat - b.saat);
  if (!sah.length) return {segmen: [], total: {}};
  const segmen = [];
  let status = sah[0].dari_status, mulai = null;   // awal sebelum gerak pertama tidak diketahui: segmen pertama mulai di gerak pertama
  for (const g of sah) {
    if (mulai != null) segmen.push({status, modul: MODUL_STATUS[status] ?? "gudang", mulai, akhir: g.saat});
    status = g.ke_status; mulai = g.saat;
  }
  segmen.push({status, modul: MODUL_STATUS[status] ?? "gudang", mulai, akhir: angka(kini) && kini > mulai ? kini : mulai, berjalan: true});
  const total = {};
  for (const s of segmen) total[s.modul] = (total[s.modul] ?? 0) + (s.akhir - s.mulai) / HARI;
  return {segmen, total};
}
export function liniModulHtml({segmen, total}) {
  if (!segmen.length) return "";
  const ringkas = Object.entries(total).filter(([m]) => m === "karhutla" || m === "banjir").map(([m, d]) => `${NAMA_MODUL[m]} ${tampil(Math.round(d * 10) / 10)} hari`).join(", ");
  const li = segmen.map(s => `<li class="sp-lini-modul ${h(s.modul)}"><span class="sp-status ${h(s.status)}">${h(NAMA_MODUL[s.modul] ?? s.modul)}</span> ${h(tglId(s.mulai))} sampai ${s.berjalan ? "sekarang" : h(tglId(s.akhir))}, ${h(tampil(Math.round((s.akhir - s.mulai) / HARI * 10) / 10))} hari</li>`).join("");
  return `<section class="sp-lini-ringkas" aria-label="Lini masa per modul"><h3 class="sp-sub">Lini masa per modul${ringkas ? `: ${h(ringkas)}` : ""}</h3><ol>${li}</ol>`
    + `<p class="ad-catat">Dari catatan gerak kit. Depot depan dan gelar dihitung modul karhutla; awal kit sebelum gerak pertama tidak diketahui.</p></section>`;
}

/* ---------- butir 40: pindah ke banjir mulai November ---------- */
export const MUSIM_BANJIR = {dari: 11, sampai: 4};   // November sampai April, asumsi kebijakan (musim hujan; sama dengan musim model kecamatan_pemicu)
export function dalamMusimBanjir(ms) {
  const b = new Date(ms + WIB).getUTCMonth() + 1;
  return b >= MUSIM_BANJIR.dari || b <= MUSIM_BANJIR.sampai;
}
/* kit yang boleh ditawarkan: di gudang atau depot depan, bukan kit pinjam pilot, belum punya gerak terjadwal; laik dari rincian bila ada (null = belum diperiksa) */
export function kitLaikBanjir(kits, laikPerKit = {}) {
  return (kits || []).filter(k => (k.status === "gudang" || k.status === "depot") && k.jenis !== "pinjam_pilot" && !k.gerak_buka)
    .map(k => ({kit: k, laik: Object.hasOwn(laikPerKit, k.id) ? laikPerKit[k.id] : null})).filter(x => x.laik !== false)
    .sort((a, b) => (a.kit.kode < b.kit.kode ? -1 : 1));
}
export const SIAGA_BANJIR = 2;   // sama dengan SIAGA di scripts/banjir/dampak.py: tingkat status 2 (Siaga) atau lebih
/* st = public/banjir/data/status.json {hari:[YYYY-MM-DD], kec:{"prov|kab|kec": {b:[tingkat per hari]}}}. Hari yang dipakai: yang terakhir tidak melewati hari ini. */
export function pilihHariStatus(hari, kini) {
  const ini = new Date(kini + WIB).toISOString().slice(0, 10);
  let i = -1; (hari || []).forEach((t, j) => { if (t <= ini) i = j; });
  if (i < 0) i = 0;
  const t = hari?.[i];
  return {indeks: i, tanggal: t ?? null, basi: t == null || (Date.parse(ini) - Date.parse(t)) / HARI > 2};
}
export function tujuanBanjir(st, kini) {
  const {indeks, tanggal, basi} = pilihHariStatus(st?.hari, kini), kab = new Map();
  for (const [kunci, v] of Object.entries(st?.kec || {})) {
    if (!Array.isArray(v?.b) || !(v.b[indeks] >= SIAGA_BANJIR)) continue;
    const [prov, nama] = kunci.split("|"), k = `${prov}|${nama}`, g = kab.get(k) ?? {prov, kab: nama, n_kec: 0, tingkat: 0};
    g.n_kec++; g.tingkat = Math.max(g.tingkat, v.b[indeks]); kab.set(k, g);
  }
  return {tanggal, basi, tujuan: [...kab.values()].sort((a, b) => b.n_kec - a.n_kec || (a.kab < b.kab ? -1 : 1))};
}
export function panelBanjirHtml({kits, tujuan, kini, peran, maks = 40}) {
  const musim = dalamMusimBanjir(kini), tulis = peran === "W" || peran === "M";
  if (!musim) return `<h2 class="sp-sub">Pindah ke banjir</h2><p class="ad-catat">Panel ini aktif mulai November, awal musim banjir (asumsi kebijakan). Kit tetap bisa dipindah lewat rincian kit.</p>`;
  const opsi = tujuan.tujuan.slice(0, maks).map(t => `<option value="${h(t.prov)}|${h(t.kab)}">${h(t.kab)} (${h(tampil(t.n_kec))} kecamatan Siaga atau lebih)</option>`).join("");
  const baris = kits.map(x => `<li><a class="sp-kit-kode" href="/pipa/kit/${h(x.kit.id)}">${h(x.kit.kode)}</a><span>${h(x.kit.lokasi || "lokasi belum dicatat")}</span>${x.laik === null ? ` <span class="sp-yakin asumsi-kebijakan" title="Rincian kit belum diperiksa di layar ini">laik belum diperiksa</span>` : ""}`
    + (tulis ? ` <button type="button" class="ad-tombol" data-pindah-banjir="${h(x.kit.id)}"${opsi ? "" : " disabled"}>Pindah ke banjir</button>` : "") + `</li>`).join("");
  return `<h2 class="sp-sub">Pindah ke banjir</h2>`
    + `<p class="sp-pil-baris"><span class="sp-yakin asumsi-kebijakan" title="Musim banjir Nov sampai Apr">musim banjir</span>${tujuan.basi ? ` <span class="sp-yakin hipotesis" title="Status banjir terakhir ${h(tujuan.tanggal ?? "–")}">data status banjir ${tujuan.tanggal ? `per ${h(tglId(Date.parse(tujuan.tanggal)))}` : "tidak termuat"}</span>` : ""}</p>`
    + (opsi ? `<label>Tujuan banjir<select data-tujuan-banjir>${opsi}</select></label>` : `<p class="ad-kosong">Tidak ada kabupaten berstatus Siaga atau lebih di data status banjir${tujuan.tanggal ? ` per ${h(tglId(Date.parse(tujuan.tanggal)))}` : ""}. Kit tetap bisa dipindah lewat rincian kit.</p>`)
    + (baris ? `<ul class="sp-siap">${baris}</ul>` : `<p class="ad-kosong">Tidak ada kit di gudang atau depot yang laik dipindah.</p>`)
    + `<p class="ad-catat">Sumber: status banjir kecamatan (BNPB banjir, tingkat Siaga ${h(tampil(SIAGA_BANJIR))} atau lebih) dan inventaris SIPPA. Pindah tetap lewat catatan gerak: pengangkut dan peminta wajib diisi.</p>`;
}
