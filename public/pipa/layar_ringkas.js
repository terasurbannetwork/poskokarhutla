/* SIPPA: layar Ringkas /pipa (PRD §9.4.1, DS §3.2.1 §4.1). Kontrak router: pasang(akar, konteks) dan lepas().
   Empat kartu Insight tautan (Kit, Pemicu, Pilot, Zona) + gerak kit terakhir + alarm telemetri; tiap kartu memuat sendiri lewat jalurnya,
   satu kartu galat tidak menghentikan kartu lain. Pembangun kartu murni (spesifikasi tanpa DOM) di atas, DOM dan jaringan di bawah.
   Tidak ada angka dihitung ulang dari data mentah selain pencacahan baris: angka zona dan tingkat pemicu dibaca dari JSON turunan.
   Butuh global public/inti: fmt, esc, jamWIB, Kartu, nanti. */
import {kuantil, nKecil} from "./hitung.js";
import {barisKoreksi, rekapKelas, AMBANG_G3} from "./layar_log.js";
import {TEKS_ALASAN, muatGayaKit} from "./layar_kit.js";
import {memuat, galat, menunggu} from "./keadaan.js";
import {ikon} from "./ikon.js";
import {ringkasDepot, kesiapanHtml, muatRincian, kitTerpotong} from "./kesiapan.js";
import {peringkat, keputusanHariIni, teksWhatsApp} from "./keputusan.js";

export const JALUR = {keputusan: "/api/sippa/data/prioritas", kit: "/api/sippa/kit", pemicu: "/api/sippa/data/pemicu", pilot: "/api/sippa/log", zona: "/api/sippa/data/zona", gerak: "/api/sippa/ringkas", alarm: "/api/sippa/alarm?aktif=1"};
export const TAUTAN = {kit: "/pipa/kit", pemicu: "/pipa/pemicu", pilot: "/pipa/log", zona: "/pipa/peta"};
const BASI_MS = 48 * 36e5;   // data harian lebih tua dari 48 jam = basi (PRD §9.2.1)

/* ---------- potongan HTML kecil: semua teks dari data lewat esc ---------- */
const hl = n => `<span class="hl">${esc(fmt(n))}</span>`;
const pil = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const pilBaris = (...p) => `<div class="sp-pil-baris">${p.filter(Boolean).join("")}</div>`;
const kosongHtml = t => `<p class="ad-kosong">${esc(t)}</p>`;
const tanggal = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const pilBasi = per => pil(`basi, per ${tanggal(per)}`, "asumsi-kebijakan", "Data harian lebih tua dari 48 jam");
const bukaGambar = (ms, kini) => ms != null && kini - ms > BASI_MS;
const namaKab = k => String(k ?? "–");

/* ---------- Kit ---------- */
const URUT_STATUS = {hilang: 0, gelar: 1, depot: 2, banjir: 2, servis: 3, gudang: 4, pensiun: 5};
const LABEL_STATUS = {gudang: "di gudang", depot: "di depot depan", gelar: "digelar", banjir: "dipakai banjir", servis: "servis", hilang: "hilang", pensiun: "pensiun"};

/* siap = di gudang; lapangan = depot, gelar, banjir; hilang terpisah (servis dan pensiun dihitung sendiri) */
export function ringkasKit(kits) {
  const n = s => kits.filter(k => k.status === s).length;
  return {siap: n("gudang"), lapangan: n("depot") + n("gelar") + n("banjir"), hilang: n("hilang"), servis: n("servis"), total: kits.length};
}

export function kartuKit(d, depot = null, terpotong = 0) {
  const kits = d.kit || [];
  const sumber = "inventaris SIPPA D1 (kit, gerak, komponen)";
  if (!kits.length) return {ey: "Kit", judul: "Belum ada kit terdaftar.", isi: kosongHtml("Kit dicatat dari layar Kit lewat tombol Tambah kit."), sumber, per: null, tautan: TAUTAN.kit};
  const r = ringkasKit(kits), per = kits.reduce((m, k) => k.diubah != null && (m == null || k.diubah > m) ? k.diubah : m, null);
  const teratas = [...kits].sort((a, b) => (URUT_STATUS[a.status] ?? 9) - (URUT_STATUS[b.status] ?? 9) || String(a.kode).localeCompare(String(b.kode))).slice(0, 3);
  const baris = teratas.map(k => `<li data-kode="${esc(k.kode)}"><b class="num">${esc(k.kode)}</b><span class="sp-status ${esc(k.status)}">${esc(LABEL_STATUS[k.status] ?? k.status)}</span></li>`).join("");
  const lain = kits.length - teratas.length, pct = d.kehilangan?.musim_pct;
  return {ey: "Kit", judul: `Kit: ${hl(r.siap)} siap di gudang, ${hl(r.lapangan)} di lapangan, ${hl(r.hilang)} hilang`,
    isi: `<ul class="sp-daftar">${baris}</ul>${lain > 0 ? `<p class="ad-catat">dan ${esc(fmt(lain))} kit lain</p>` : ""}${pct == null ? "" : `<p class="ad-catat">${esc(fmt(pct))}% komponen musim ini hilang</p>`}${depot ? kesiapanHtml(depot, terpotong) : ""}${pilBaris(pil("Terverifikasi", "terverifikasi", "Dicatat staf di inventaris SIPPA"))}`,
    sumber, per, perLabel: "perubahan terakhir", tautan: TAUTAN.kit};
}

/* ---------- Pemicu ---------- */
const TINGKAT = ["NORMAL", "SIAGA", "PRA-POSISI", "GELAR"];
const KELAS_TINGKAT = {"NORMAL": "normal", "SIAGA": "siaga", "PRA-POSISI": "praposisi", "GELAR": "gelar"};
const pilTingkat = t => `<span class="sp-pemicu ${KELAS_TINGKAT[t] ?? "normal"}">${esc(t)}</span>`;

export function kartuPemicu(p, prov, kini = Date.now()) {
  const sumber = "pemicu.json (ansambel FWI, outlook iklim, titik panas 24 jam)", per = p.dibuat ? Date.parse(p.dibuat) : null;
  const baris = (p.baris || []).filter(b => b.prov === prov);
  if (!baris.length) return {ey: "Pemicu", judul: "Belum ada kabupaten terpantau di provinsi ini.", isi: kosongHtml("Pemicu dihitung untuk kabupaten dengan kompleks zona A atau B."), sumber, per, tautan: TAUTAN.pemicu};
  const idx = b => TINGKAT.indexOf(b.tingkat), atas = Math.max(...baris.map(idx)), sama = baris.filter(b => idx(b) === atas);
  const judul = atas === 0 ? `Pemicu: ${hl(baris.length)} kabupaten, semuanya di level ${esc(TINGKAT[0])}` : `Pemicu: ${hl(sama.length)} kabupaten di level ${esc(TINGKAT[atas])}`;
  const tiga = [...baris].sort((a, b) => idx(b) - idx(a) || namaKab(a.kab).localeCompare(namaKab(b.kab))).slice(0, 3);
  const daftar = tiga.map(b => `<li data-kab="${esc(b.kab)}"><span>${esc(namaKab(b.kab))}</span>${pilTingkat(b.tingkat)}</li>`).join("");
  const lamaBasi = bukaGambar(per, kini);
  return {ey: "Pemicu", judul,
    isi: `<ul class="sp-daftar">${daftar}</ul>${pilBaris(p.basi?.ansambel ? pil("ansambel basi", "asumsi-kebijakan", "Ansambel FWI lebih tua dari 36 jam: tingkat tidak naik ke PRA-POSISI atau GELAR") : "", p.basi?.titik24 ? pil("titik panas basi", "asumsi-kebijakan", "Data titik panas 24 jam lebih tua dari 36 jam") : "", lamaBasi ? pilBasi(per) : "", pil("Asumsi kebijakan", "asumsi-kebijakan", "Ambang tingkat ditetapkan sebagai asumsi kebijakan"))}<p class="ad-catat">${esc(p.ambang?.uji_balik ?? "belum diuji balik")}. Bukan perintah gelar; keputusan di staf.</p>`,
    sumber, per, tautan: TAUTAN.pemicu, basi: lamaBasi};
}

/* ---------- Pilot ---------- */
const KELAS = ["I", "II", "III"];
/* titik per ulangan: satu baris per kelas yang punya data, x = jam tiba sampai air mengalir, garis = ambang G3 p50 kelas itu */
function titikMini(rek) {
  const kel = KELAS.filter(k => rek[k].n), W = 240, L = 54, R = 10, baris = 30, H = kel.length * baris + 26;
  const semua = kel.flatMap(k => rek[k].titik.map(t => t.y)), xmaks = Math.max(6, Math.ceil(Math.max(...semua, ...kel.map(k => AMBANG_G3[k].p50)) / 6) * 6);
  const X = v => L + (W - L - R) * v / xmaks;
  let s = `<svg class="sp-grafik sp-mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tiba sampai air mengalir per ulangan menurut kelas medan, dalam jam">`;
  kel.forEach((k, i) => {
    const y = i * baris + baris / 2 + 4, a = AMBANG_G3[k];
    s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="sp-teks sp-kuat" x="${L - 8}" y="${y + 4}" text-anchor="end">Kelas ${k}</text>`;
    s += `<line class="sp-ambang" x1="${X(a.p50)}" x2="${X(a.p50)}" y1="${y - 11}" y2="${y + 11}"><title>Ambang G3 Kelas ${k} p50 ${esc(fmt(a.p50))} jam</title></line>`;
    rek[k].titik.forEach((t, j) => { s += `<circle class="sp-titik${t.meleset ? " meleset" : ""}" cx="${X(t.y)}" cy="${y + ((j % 3) - 1) * 5}" r="4"><title>${esc(fmt(t.y))} jam</title></circle>`; });
  });
  const ya = kel.length * baris + 16;
  for (const v of [0, xmaks / 2, xmaks]) s += `<text class="sp-teks" x="${X(v)}" y="${ya}" text-anchor="${v === 0 ? "start" : v === xmaks ? "end" : "middle"}">${esc(fmt(v))}${v === xmaks ? " jam" : ""}</text>`;
  return s + "</svg>";
}

export function kartuPilot(log) {
  const sumber = "log gelar lapangan dan entri staf (SIPPA D1)", aktif = barisKoreksi(log).filter(l => !l.dummy && l.jenis === "karhutla");
  if (!aktif.length) return {ey: "Pilot", judul: "Belum ada log gelar.", isi: kosongHtml("Log masuk dari form lapangan /pipa/lapangan atau entri staf dari formulir kertas."), sumber, per: null, tautan: TAUTAN.pilot};
  const rek = rekapKelas(aktif), ys = KELAS.flatMap(k => rek[k].titik.map(t => t.y)), per = aktif.reduce((m, l) => l.t_tiba != null && (m == null || l.t_tiba > m) ? l.t_tiba : m, null);
  const kecil = nKecil(ys.length), p50 = kuantil(ys, 0.5);
  const sesi = `${hl(aktif.length)} sesi gelar`;
  const judul = p50 == null ? `Pilot: ${sesi}, p50 menunggu ulangan dengan waktu air mengalir` : `Pilot: ${sesi}, p50 tiba sampai air mengalir ${hl(p50)} jam${kecil ? " (n kecil)" : ""}`;
  return {ey: "Pilot", judul,
    isi: `${ys.length ? titikMini(rek) : ""}${pilBaris(kecil ? pil("n kecil", "asumsi-kebijakan", "Kurang dari 5 ulangan: belum bisa memutus G3") : "", pil("Pilot, tidak dipakai untuk vonis G4", "terverifikasi", "Hasil pilot Okt 2026 tidak pernah dipakai untuk vonis G4"))}`,
    sumber, per, perLabel: "log terakhir", tautan: TAUTAN.pilot};
}

/* ---------- Zona ---------- */
const ZONA = ["A", "B", "C", "D"];
const VERSI = [["k", "Konservatif", "versi kendala.json"], ["u", "Jalan utama OSM", "tersier ke atas x semua air"], ["o", "Optimistis", "semua jalan OSM"]];
/* pola wajib selain huruf (keputusan 52): A penuh, B cincin, C garis miring, D silang; didefinisikan sekali per kartu */
const POLA = `<svg class="sp-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <pattern id="zona-pola-A" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" class="sp-pola-a"/></pattern>
  <pattern id="zona-pola-B" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" class="sp-pola-garis"/></pattern>
  <pattern id="zona-pola-C" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1l2-2M0 6l6-6M5 7l2-2" class="sp-pola-garis"/></pattern>
  <pattern id="zona-pola-D" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0l6 6M6 0L0 6" class="sp-pola-garis"/></pattern></defs></svg>`;

function batangZona(r) {
  const W = 240, H = 26, total = ZONA.reduce((s, z) => s + (r[z] || 0), 0) || 1;
  let x = 0, s = `<svg class="sp-zona-batang" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Zona A ${fmt(r.A)}, B ${fmt(r.B)}, C ${fmt(r.C)}, D ${fmt(r.D)} dari ${fmt(r.n)} kompleks`)}">`;
  for (const z of ZONA) {
    const w = W * (r[z] || 0) / total;
    if (w > 0) s += `<g><rect class="zona-${z}" x="${x}" y="0" width="${w}" height="${H}"/><rect class="zona-pola-${z}" x="${x}" y="0" width="${w}" height="${H}" fill="url(#zona-pola-${z})"/><title>Zona ${z}: ${esc(fmt(r[z]))} kompleks</title></g>`;
    x += w;
  }
  x = 0;   // huruf di atas pola; segmen sempit (di bawah 14 satuan) tidak memuat huruf, angkanya ada di tabel pembaca layar
  for (const z of ZONA) { const w = W * (r[z] || 0) / total; if (w >= 14) s += `<text class="sp-zona-huruf" x="${x + w / 2}" y="${H / 2 + 5}" text-anchor="middle">${z}</text>`; x += w; }
  return s + "</svg>";
}

export function kartuZona(z, prov, namaProv) {
  const sumber = "OpenStreetMap (ODbL) via Overpass, jarak garis lurus; kompleks api kendala.json", per = z.per ? Date.parse(z.per) : null;
  const baris = Object.fromEntries(VERSI.map(([v]) => [v, (z.baris || []).find(b => b.prov === prov && b.kab == null && b.versi === v)]));
  if (!baris.k || !baris.o) return {ey: "Zona", judul: "Belum ada data zona untuk provinsi ini.", isi: kosongHtml("Zona dihitung dari jarak kompleks ke air dan jalan; jalankan pipeline zona untuk provinsi ini."), sumber, per, tautan: TAUTAN.zona};
  const air = z.ambang?.air_km, jalan = z.ambang?.jalan_km;
  const rows = VERSI.filter(([v]) => baris[v]).map(([v, nama, ket]) => {
    const r = baris[v];
    return `<div class="sp-zona-baris"><span class="sp-zona-nama" title="${esc(ket)}">${esc(nama)}</span>${batangZona(r)}<span class="sr">${esc(`${nama}: A${fmt(r.A)} B${fmt(r.B)} C${fmt(r.C)} D${fmt(r.D)} dari ${fmt(r.n)} kompleks`)}</span></div>`;
  }).join("");
  return {ey: "Zona", judul: `Zona A ${esc(namaProv)}: ${hl(baris.k.A)} kompleks (versi kendala.json), ${hl(baris.o.A)} (semua jalan OSM)`,
    isi: `${POLA}<div class="sp-zona">${rows}<div class="sp-zona-baris"><span class="sp-zona-nama">Terverifikasi</span><span class="sp-zona-menunggu">${pil("Menunggu", "menunggu", "Zona Terverifikasi memakai cek jalan musim hujan di layar Peta")}<small>menunggu cek jalan lolos musim hujan</small></span></div></div>
    <p class="ad-catat">Zona A: air kurang dari ${esc(fmt(air))} km dan jalan kurang dari ${esc(fmt(jalan))} km. Huruf dan pola membedakan A sampai D.</p>${pilBaris(pil("Terverifikasi", "terverifikasi", "Jarak dihitung dari data OSM yang ditarik"), pil("Batas atas OSM", "asumsi-kebijakan", "Versi semua jalan OSM memuat jalan track yang belum tentu dapat dilalui pickup pada musim hujan"))}`,
    sumber, per, tautan: TAUTAN.zona};
}

/* ---------- gerak terakhir dan alarm ---------- */
const PENGANGKUT = {yontp: "YonTP", bpbd: "BPBD", daops: "Daops", manggala_agni: "Manggala Agni", lain: "Lain"};
const waktuTag = ms => ms == null ? "–" : `<time datetime="${new Date(ms).toISOString()}">${esc(jamWIB(ms))}</time>`;

export function kartuGerak(rows) {
  const sumber = "inventaris SIPPA D1 (gerak kit)";
  if (!rows.length) return {ey: "Kit", judul: "Belum ada gerak kit.", isi: kosongHtml("Gerak dicatat dari layar Kit dan form lapangan."), sumber, per: null};
  const urut = [...rows].sort((a, b) => b.waktu - a.waktu).slice(0, 10), td = (l, v, n) => `<td${n ? ' class="n"' : ""} data-label="${l}">${v}</td>`;
  const tr = g => `<tr>${td("Waktu", waktuTag(g.waktu))}${td("Kit", `<b>${esc(g.kit_kode ?? g.kit_id ?? "–")}</b>`)}${td("Gerak", `<span class="sp-status ${esc(g.dari_status)}">${esc(LABEL_STATUS[g.dari_status] ?? g.dari_status)}</span>${ikon("chevron-right")}<span class="sp-status ${esc(g.ke_status)}">${esc(LABEL_STATUS[g.ke_status] ?? g.ke_status)}</span>`)}${td("Alasan", esc(TEKS_ALASAN[g.alasan] ?? g.alasan ?? "–"))}${td("Pengangkut", esc(PENGANGKUT[g.pengangkut] ?? "–"))}</tr>`;
  return {ey: "Kit", judul: `${hl(urut.length)} gerak kit terakhir`,
    isi: `<div class="ad-tabel-wadah sp-gerak"><table class="ad-tabel"><caption class="sr">Gerak kit terakhir</caption><thead><tr>${["Waktu", "Kit", "Gerak", "Alasan", "Pengangkut"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${urut.map(tr).join("")}</tbody></table></div><p class="sp-lainnya-tautan"><a href="${TAUTAN.kit}" data-layar="kit">Lihat semua gerak</a></p>`,
    sumber, per: Math.max(...urut.map(g => g.waktu)), perLabel: "gerak terakhir"};
}

const NAMA_ALARM = {hisap_rendah: "Hisap rendah", debit_rendah: "Debit rendah", dry_run: "Pompa kering", tekanan_lebih: "Tekanan lebih", belum_dingin: "Belum dingin", co_tinggi: "CO tinggi", bbm_rendah: "BBM rendah", diam: "Perangkat diam"};
/* satuan per kode menurut DT §6.3.1; payload `satuan` menang bila ada */
const SATUAN_ALARM = {hisap_rendah: "bar", debit_rendah: "L/min", dry_run: "L/min", tekanan_lebih: "bar", belum_dingin: "°C", co_tinggi: "ppm", bbm_rendah: "%", diam: "menit"};
const angkaSatuan = (a, v) => { const u = a.satuan ?? SATUAN_ALARM[a.kode] ?? ""; return esc(`${fmt(v)}${u ? ` ${u}` : ""}`); };
export function kartuAlarm(alarm) {
  const sumber = "telemetri SIPPA (perangkat dan alarm)";
  if (!alarm.length) return {ey: "Telemetri", judul: "Tidak ada alarm aktif.", isi: kosongHtml("Alarm muncul di sini saat perangkat melewati ambang."), sumber, per: null};
  const baris = alarm.map(a => `<li><b>${esc(NAMA_ALARM[a.kode] ?? a.kode)}</b>${a.kit_kode ? `<span>${esc(a.kit_kode)}</span>` : ""}${a.nilai != null ? `<span class="num">${angkaSatuan(a, a.nilai)}${a.ambang != null ? ` (ambang ${angkaSatuan(a, a.ambang)})` : ""}</span>` : ""}<span class="ad-catat">sejak ${waktuTag(a.mulai)}</span></li>`).join("");
  return {ey: "Telemetri", judul: `Telemetri: ${hl(alarm.length)} alarm aktif`, isi: `<ul class="sp-daftar sp-alarm">${baris}</ul>`, sumber, per: Math.max(...alarm.map(a => a.mulai).filter(Boolean)), perLabel: "alarm terbaru"};
}

/* ---------- Keputusan hari ini (SP-100), jalan atau tunda (SP-101), peringkat 7 hari (SP-102); logika di keputusan.js ---------- */
const KUNCI_VERSI = {k: "zona_k", o: "zona_o"};   // Terverifikasi butuh cek jalan per kompleks: memakai Konservatif
export function kartuKeputusan(pri, kel, prov, versi = "k", namaProv = prov) {
  const sumber = "prioritas.json (titik panas FIRMS 7 hari dalam 2 km, waktu tempuh akses, prakiraan hujan dan angin Open-Meteo)", per = pri.dibuat ? Date.parse(pri.dibuat) : null;
  const kompleks = (kel.kompleks || []).filter(k => k.prov === prov);
  const urut = peringkat(kompleks, pri.kompleks || [], KUNCI_VERSI[versi] ?? "zona_k", 10), kh = keputusanHariIni(urut);
  if (!urut.length) return {ey: "Keputusan hari ini", judul: "Tidak ada titik panas dalam 2 km dari kompleks mana pun selama 7 hari.", isi: kosongHtml("Kit tetap di gudang atau depot."), sumber, per};
  const pergi = r => `${r.berangkat.hari < 0 ? "malam ini" : `besok ${esc(r.berangkat.teks)}`} dari ${esc(r.dari ?? "posko terdekat")}`;
  const judul = kh.length ? `Kirim kit ke ${esc(kh[0].id)} (${esc(namaKab(kh[0].kab))}), berangkat ${pergi(kh[0])}`
    : "Belum ada lokasi yang layak dikirimi kit besok";
  const daftar = kh.map(r => `<li><b>${esc(r.id)} ${esc(namaKab(r.kab))}, zona ${esc(r.zona ?? "–")}</b>: berangkat ${pergi(r)}. ${esc(r.alasan)}</li>`).join("");
  const baris = urut.map((r, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(r.id)}</b></td><td>${esc(namaKab(r.kab))}</td><td>${esc(r.zona ?? "–")}</td>`
    + `<td class="n">${esc(fmt(r.n7))}</td><td class="n">${esc(fmt(r.n24))}</td><td class="n">${r.menit == null ? "–" : esc(fmt(r.menit))}</td>`
    + `<td><span class="sp-putusan ${r.putusan}">${r.putusan === "jalan" ? "Jalan" : "Tunda"}</span>${r.putusan === "tunda" ? `<small>${esc(r.alasan)}</small>` : ""}</td></tr>`).join("");   // alasan jalan = angka di kolom sebelahnya
  return {ey: "Keputusan hari ini", judul,
    isi: `${daftar ? `<ol class="sp-keputusan">${daftar}</ol>` : kosongHtml("Semua kompleks teratas ditunda; alasannya di tabel.")}
      <div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-prioritas"><caption>Peringkat prioritas 7 hari, ${esc(String(urut.length))} teratas</caption>
      <thead><tr><th class="n" scope="col">No</th><th scope="col">Kompleks</th><th scope="col">Kabupaten</th><th scope="col">Zona</th><th class="n" scope="col">Titik 7 hari</th><th class="n" scope="col">24 jam</th><th class="n" scope="col">Menit</th><th scope="col">Besok</th></tr></thead>
      <tbody>${baris}</tbody></table></div>
      ${pilBaris(pil("Asumsi kebijakan", "asumsi-kebijakan", "Bobot zona, ambang hujan 20 mm dan angin 30 km/jam, tiba 07.00 WIB: asumsi kebijakan, belum diuji balik"), pil("Estimasi model", "estimasi-model", "Waktu tempuh dari model akses, bukan navigasi"))}
      <button type="button" class="ad-tombol" data-aksi="salin-wa">Salin ringkasan WhatsApp</button>`,
    wa: teksWhatsApp(urut, kh, namaProv, per == null ? "hari ini" : tanggal(per)),
    sumber, per, basi: bukaGambar(per, Date.now())};
}

/* ---------- isolasi: tiap pemuat jalan sendiri; galat satu kartu tidak menjatuhkan yang lain ---------- */
const bungkus = f => Promise.resolve().then(f).then(ok => ({ok}), e => e?.name === "AbortError" ? {batal: true} : {galat: e});
export async function isolasi(pemuat) {
  const kunci = Object.keys(pemuat), hasil = await Promise.all(kunci.map(k => bungkus(pemuat[k])));
  return Object.fromEntries(kunci.map((k, i) => [k, hasil[i]]));
}

/* ---------- DOM ---------- */
const teksJudul = h => h.replace(/<[^>]*>/g, "");
function rakitKartu(s) {
  const per = s.per != null ? `, ${s.perLabel ?? "per"} ${jamWIB(s.per)}` : "";
  const dalam = Kartu.kartu(s.ey, s.judul, s.isi, esc(s.sumber) + esc(per));
  return s.tautan ? `<a class="sp-kartu-tautan${s.basi ? " basi" : ""}" href="${esc(s.tautan)}" data-layar="${esc(s.tautan.slice(6))}" aria-label="${esc(teksJudul(s.judul))}">${dalam}</a>` : dalam;
}

let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController(); muatGayaKit();
  const sinyal = ctrl.signal, prov = konteks.prov, kini = Date.now();
  const nama = (typeof Wilayah !== "undefined" && Wilayah.PROV?.[prov]) || `provinsi ${prov}`;
  akar.innerHTML = `<h1 class="sp-judul">Ringkas</h1>
    <section id="insight" class="sp-kisi sp-ringkas" aria-label="Status SIPPA">${Object.keys(JALUR).map(k => `<div class="sp-slot${k === "gerak" || k === "keputusan" ? " lebar" : k === "alarm" ? " sempit" : ""}" data-kartu="${k}"></div>`).join("")}</section>`;
  const slot = k => akar.querySelector(`[data-kartu="${k}"]`);
  for (const k of Object.keys(JALUR)) slot(k).replaceChildren(memuat());
  /* bilah "Data per" hanya dari berkas turunan (pemicu, zona); waktu kit, log, gerak, alarm adalah waktu kejadian, bukan kesegaran data */
  const per = {}, tampilPer = () => { const v = [per.pemicu, per.zona, per.keputusan].filter(x => x != null); konteks.setPer?.(v.length ? Math.min(...v) : null); };
  const ambil = (url, q = "") => konteks.ambil(url + (q ? (url.includes("?") ? "&" : "?") + q : ""), sinyal);
  const pasangSlot = (k, hasil, bangun, ulang) => {
    if (sinyal.aborted || hasil.batal) return;
    const wadah = slot(k);
    if (hasil.galat) {
      const e = hasil.galat; if (e.status == null) console.error(e);
      wadah.replaceChildren(e.status === 404 && k === "alarm" ? menunggu("Telemetri belum dirilis di versi ini") : e.status === 404 && k === "keputusan" ? menunggu("Peringkat prioritas menunggu putaran pipeline data.yml") : galat(e.status ?? 0, e.status == null ? "Kartu tidak bisa ditampilkan. Coba lagi." : e.message || undefined, ulang));
      return;
    }
    const s = bangun(hasil.ok); per[k] = s.per; wadah.innerHTML = rakitKartu(s); tampilPer();
  };
  let teksWa = "";
  /* kartu Kit tampil dulu tanpa kesiapan; bagian kit siap gelar diisi begitu rincian kit datang (maksimal 12 fetch) */
  const kesiapanSusul = j => muatRincian(konteks.ambil, j.kit || [], sinyal).then(r => {
    if (sinyal.aborted) return;
    const w = slot("kit"); if (w && !w.querySelector(".ad-galat")) w.innerHTML = rakitKartu(kartuKit(j, ringkasDepot(j.kit || [], r), kitTerpotong(j.kit || [])));
  });
  akar.addEventListener("click", async e => {
    const t = e.target.closest('[data-aksi="salin-wa"]'); if (!t || !teksWa) return;
    t.textContent = "Menyalin";   // piksel berubah sebelum menunggu izin papan klip (INP)
    try { await navigator.clipboard.writeText(teksWa); t.textContent = "Tersalin"; } catch { t.textContent = "Salin gagal; izinkan papan klip"; }
  }, {signal: sinyal});
  const muat = {
    keputusan: () => Promise.all([ambil(JALUR.keputusan), ambil("/api/sippa/data/kelayakan_kompleks")]),
    kit: () => ambil(JALUR.kit, `prov=${encodeURIComponent(prov)}`),
    pemicu: () => ambil(JALUR.pemicu),
    pilot: () => ambil(JALUR.pilot, "jenis=karhutla"),
    zona: () => ambil(JALUR.zona),
    gerak: () => ambil(JALUR.gerak),
    alarm: () => ambil(JALUR.alarm),
  };
  const bangun = {
    keputusan: ([p, k]) => { const s = kartuKeputusan(p, k, prov, konteks.zona, nama); teksWa = s.wa; return s; },
    kit: j => { kesiapanSusul(j); return kartuKit(j); }, pemicu: j => kartuPemicu(j, prov, kini),
    pilot: j => kartuPilot((j.log || []).filter(l => l.prov == null || l.prov === prov)),
    zona: j => kartuZona(j, prov, nama), gerak: j => kartuGerak(j.gerak_terakhir || []), alarm: j => kartuAlarm(j.alarm || []),
  };
  /* tiap kartu mendarat begitu datanya datang (tidak menunggu yang lain); ulangi hanya kartu itu */
  const jalankan = k => bungkus(muat[k]).then(h => pasangSlot(k, h, bangun[k], () => { slot(k).replaceChildren(memuat()); jalankan(k); }));
  await Promise.all(Object.keys(muat).map(jalankan));
}
