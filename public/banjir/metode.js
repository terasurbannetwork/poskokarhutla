"use strict";
/* ================================================================ metode (versi awam, setara Metode karhutla)
   Tiap bagian: Singkatnya → alur langkah → contoh hitung dengan data hari ini → algoritma inti (terlipat) → batasan.
   Contoh dihitung saat bagiannya dibuka pertama kali, dari berkas data yang sama dengan tab lain. Aturan diambil dari
   scripts/banjir/*.py; fungsi levelBanjir/levelLongsor/kelasSungai/jendela3/puncak3 di halaman ini adalah salinan status.py. */
const MT_IKON = {
  sensor: '<circle cx="12" cy="12" r="2"/><path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4"/>',
  awan: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z"/>',
  hujan: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  sungai: '<path d="M3 7c3 0 3 2 6 2s3-2 6-2 3 2 6 2M3 12c3 0 3 2 6 2s3-2 6-2 3 2 6 2M3 17c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/>',
  ombak: '<path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20h20M6 11a5 5 0 0 1 9-3"/>',
  lereng: '<path d="M3 20h18L14 7l-4 6-3-3z"/><path d="M14 16l2 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  hitung: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  centang: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  tabel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  grafik: '<path d="M5 20V11M11 20V5M17 20v-7M2 20h20"/>',
  tren: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  tenda: '<path d="M3 20 12 4l9 16zM9 20l3-5 3 5"/>',
  uang: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  berkas: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  bobot: '<path d="M12 4v16M6 20h12M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
  dadu: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r=".8"/><circle cx="15" cy="15" r=".8"/><circle cx="15" cy="9" r=".8"/><circle cx="9" cy="15" r=".8"/>',
  perisai: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  ukur: '<path d="M4 18a8 8 0 1 1 16 0M12 18l4-6"/>',
  jenjang: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  gedung: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
  alat: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  kisi: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  panah: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  mata: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  urut: '<path d="M4 6h10M4 12h7M4 18h4M17 4v16M14 17l3 3 3-3"/>',
  radius: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><path d="M12 12h9"/>',
  lonceng: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
};
const mtIkon = n => `<svg class="mt-ikon" viewBox="0 0 24 24" aria-hidden="true">${MT_IKON[n] || ""}</svg>`;
/* jenis langkah → warna: data (biru), olah (nila), uji (kuning), hasil (hijau) */
const MT_WARNA = {d: "var(--mt-biru)", o: "var(--mt-nila)", u: "var(--mt-kuning)", h: "var(--mt-hijau)"};
const mtA = (x, d = 1) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
const mtP = x => x == null || isNaN(x) ? "–" : mtA(x * 100, 0) + "%";
const mtTgl = s => new Date(s.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"});
const mtAlur = L => `<div><span class="mt-lbl">Alurnya</span><ol class="mt-alur">${L.map(([j, ik, b, s], i) =>
  `<li style="--mtc:${MT_WARNA[j]}"><div class="mt-ak"><i>${mtIkon(ik)}</i><em>LANGKAH ${i + 1}</em></div><b>${b}</b>${s ? `<small>${s}</small>` : ""}</li>`).join("")}</ol></div>`;
/* tangga hitung: baris = [jenis, label, cara, nilai]; jenis: "in" data masuk, "" langkah, "ok"/"no" uji, "hasil" */
const mtTangga = (judul, konteks, B, catatan = "", label = "Contoh dengan data hari ini") => `<span class="mt-lbl">${label}</span><div class="mt-ch"><b>${judul}</b>${konteks ? `<small>${konteks}</small>` : ""}</div>
  <ol class="mt-tangga">${(n => B.filter(Boolean).map(([j, l, c, v]) => `<li class="${j ? "mt-" + j : ""}"><span class="mt-tt">${j === "ok" ? "✓" : j === "no" ? "✕" : ++n}</span>
    <div class="mt-tl"><b>${l}</b>${c ? `<small>${c}</small>` : ""}</div><div class="mt-tv">${v ?? ""}</div></li>`).join(""))(0)}</ol>${catatan ? `<p class="mt-cat">${catatan}</p>` : ""}`;
const mtCek = (lulus, l, c, ya = "ya", tidak = "tidak") => [lulus ? "ok" : "no", l, c, lulus ? ya : tidak];

/* berkas yang belum dimuat halaman: sekali saja per kunjungan */
const MT_BERKAS = {};
const mtJSON = u => MT_BERKAS[u] ||= muatJSON(u).catch(e => { delete MT_BERKAS[u]; throw e; });
async function mtBahaya() { if (!Object.keys(S.bahaya || {}).length) S.bahaya = (await mtJSON("data/bahaya.json")).kec || {}; return S.bahaya; }
const mtNamaKec = k => { const [p, kb, kc] = k.split("|"); return `Kec. ${esc(kc)}, ${esc(/^Kota /.test(kb) ? kb : "Kab. " + kb)} (${esc(namaProv(p))})`; };
/* kecamatan contoh: level tertinggi 4 hari untuk bahaya z ("b"/"l"), lalu hujan 3 hari terbesar */
function mtKec(z) {
  const E = Object.entries(S.st?.kec || {}); if (!E.length) return null;
  return E.sort(([, a], [, b]) => Math.max(...b[z]) - Math.max(...a[z]) || (b.h3 || 0) - (a.h3 || 0))[0][0]; }
/* masukan satu kecamatan, sama persis dengan status.py: sel hujan di petak yang sama (atau tetangga terdekat),
   titik sungai terdekat <= 25 km, titik ansambel terdekat <= 1 derajat */
async function mtMasukan(k) {
  const P = await mtJSON("data/pusat_kec.json"), B = await mtBahaya(), c = P[k];
  if (!c) throw new Error("titik tengah kecamatan tidak ada di pusat_kec.json");
  const [la, lo] = c, H = S.hujan, sel = H.sel, i0 = H.hari.indexOf(H.hari_ini), d2 = g => (g.lat - la) ** 2 + (g.lon - lo) ** 2;
  const gy = Math.floor(la / sel), gx = Math.floor(lo / sel), pt = g => [Math.floor(g.lat / sel) - gy, Math.floor(g.lon / sel) - gx];
  let g = H.grid.find(x => { const [a, b] = pt(x); return !a && !b; });
  if (!g) { const t = H.grid.filter(x => { const [a, b] = pt(x); return Math.abs(a) <= 1 && Math.abs(b) <= 1; }); g = (t.length ? t : H.grid).reduce((m, x) => d2(x) < d2(m) ? x : m); }
  const T = S.sungai?.titik || []; let sg = null, jr = 25;
  T.forEach((t, i) => { if (Math.abs(t.lat - la) < .25 && Math.abs(t.lon - lo) < .25) { const d = kmDatar(la, lo, t.lat, t.lon); if (d <= jr) { sg = i; jr = d; } } });
  const j = (S.sungai?.hari || []).indexOf(H.hari_ini), j0 = j < 0 ? 3 : j;
  const E = await mtJSON("data/hujan_ansambel.json").catch(() => null), e0 = E ? E.hari.indexOf(H.hari_ini) : -1;
  let p3 = null; if (E && e0 >= 0) { const e = E.grid.reduce((m, x) => d2(x) < d2(m) ? x : m); if (Math.abs(e.lat - la) <= 1 && Math.abs(e.lon - lo) <= 1) p3 = e.p3; }
  return {k, la, lo, g, i0, b: B[k] || {}, sg, t: sg != null ? T[sg] : null, jr, j0, p3, e0}; }
/* nilai harian masukan untuk hari d (0 = hari ini); sk = skenario Simulasi {x} */
function mtHari(m, d, x = 1) {
  const kali = xs => x !== 1 && xs ? xs.map((v, i) => i >= m.i0 && v != null ? v * x : v) : xs, h = kali(m.g.h), im = kali(m.g.imax), sm = m.g.sm || [];
  return {h, h3: jendela3(h, m.i0 + d + GESER), im: puncak3(im, m.i0 + d + GESER), cape: puncak3(m.g.cape, m.i0 + d + GESER),
    p3: m.p3 && m.e0 >= 0 && m.e0 + d < m.p3.length ? m.p3[m.e0 + d] : null, sm: m.i0 + d < sm.length ? sm[m.i0 + d] : null,
    rk: m.t ? kelasSungai(m.t.q, m.j0 + d, m.t) : null}; }
const mtRk = (m, rk) => !m.t ? "tidak ada titik sungai besar ≤ 25 km" : rk == null ? `titik ${esc(m.t.kec)} (${mtA(m.jr)} km) belum punya ambang` : `titik ${esc(m.t.kec)} (${mtA(m.jr)} km): ${LEVEL[rk]}`;
const MT_RK = ["di bawah banjir 2 tahunan", "≥ banjir 2 tahunan", "≥ banjir 5 tahunan", "≥ banjir 20 tahunan"];
/* periode ulang Gumbel dari debit q: T = 1 / (1 − e^(−e^(−(q − u)/α))) */
const mtGumbel = t => { const a = (t.q5 - t.q2) / (1.5 - .3665), u = t.q2 - .3665 * a; return {a, u, T: q => 1 / (1 - Math.exp(-Math.exp(-(q - u) / a)))}; };

function renderMetode() {
  const M = S.meta || {};
  const tb = (kepala, baris, kanan = []) => `<div class="tw" style="margin:6px 0 10px"><table><thead><tr>${kepala.map((h, i) => `<th class="${kanan.includes(i) ? "n" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${
    baris.map(r => `<tr>${r.map((c, i) => `<td class="${kanan.includes(i) ? "n num" : ""}" style="white-space:${kanan.includes(i) ? "nowrap" : "normal"}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const h = t => `<h4 style="margin:14px 0 4px;font-size:13.5px">${t}</h4>`;
  const ul = a => `<ul style="margin:4px 0 8px;padding-left:18px">${a.map(x => `<li>${x}</li>`).join("")}</ul>`;
  const rumus = s => `<div class="rumus" style="margin:6px 0 10px">${s}</div>`;
  const RV = S.rob?.validasi || {}, VP = RV.persentil || {}, nRob = (S.rob?.titik || []).length, nRobAmb = (S.rob?.titik || []).filter(t => t.p95 != null).length;
  const B = [];

  /* ---------------------------------------------------------------- 1 */
  B.push({ik: "jam", j: "Pembaruan harian", sub: "Kapan data diambil, dihitung, diuji, lalu terbit",
    singkat: `Tiap pagi pukul 07.20 WIB komputer menjalankan urutan program yang sama: mengambil prakiraan hujan, debit sungai, pasang laut, dan peringatan BMKG terbaru, menghitung ulang status semua kecamatan, lalu menerbitkannya. Sebelum mulai, aturan hitungnya diuji dulu; bila uji gagal, tidak ada yang terbit dan halaman tetap memakai data kemarin. Jam 07.20 dipilih karena model cuaca jalan pukul 07.00 WIB (00 UTC) sudah masuk ke penyedia data.`,
    alur: [["u", "centang", "Uji aturan", "rumus status, sungai, rob, posko; gagal = berhenti"], ["d", "awan", "Ambil data", "hujan, ansambel, sungai, pasang, BMKG"], ["o", "hitung", "Hitung status", "banjir & longsor per kecamatan, 4 hari"],
      ["o", "tenda", "Rencanakan posko", "lokasi, jenjang komando"], ["h", "berkas", "Terbit", "berkas data baru dibaca halaman ini"]],
    contoh: async () => {
      const umur = (Date.now() - new Date(M.dibuat)) / 36e5, E = await mtJSON("data/hujan_ansambel.json").catch(() => null), W = await mtJSON("data/peringatan.json").catch(() => null);
      const kini = new Date(Date.now() + 7 * 36e5), besok = new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth(), kini.getUTCDate() + (kini.getUTCHours() * 60 + kini.getUTCMinutes() >= 440 ? 1 : 0), 0, 20));
      return mtTangga("Jalan terakhir", "Tiap berkas mencatat jam dibuatnya sendiri; langkah yang boleh gagal memakai berkas lamanya.", [
        ["in", "Status kecamatan dihitung", "meta.json", M.dibuat ? jamWIB(M.dibuat) : "–"],
        ["in", "Pasang laut (rob)", "rob.json", S.rob?.dibuat ? jamWIB(S.rob.dibuat) : "tidak ada"],
        ["in", "Ansambel hujan ECMWF", "hujan_ansambel.json", E?.dibuat ? jamWIB(E.dibuat) : "tidak ada"],
        ["in", "Peringatan BMKG", "peringatan.json", W?.dibuat ? jamWIB(W.dibuat) : "tidak ada"],
        ["", "Umur status saat halaman ini dibuka", "jam sekarang dikurangi jam dihitung", mtA(umur) + " jam"],
        mtCek(umur <= 30, "Masih di bawah 30 jam?", "lewat 30 jam muncul pita peringatan di atas halaman"),
        ["", "Jalan berikutnya", "terjadwal tiap hari 07.20 WIB", besok.toLocaleString("id-ID", {...WIB, weekday: "long", hour: "2-digit", minute: "2-digit"}) + " WIB"],
        ["hasil", "Kesimpulan", "", umur <= 30 ? "data segar" : "periksa pembaruan"]]);
    },
    teknis: `<p>Jadwal: <code>.github/workflows/banjir.yml</code>, cron 00.20 UTC (07.20 WIB), batas 50 menit. Kuota gratis Open-Meteo 10.000 panggilan per hari dibagi antara hujan, ansambel, sungai, dan rob.</p>
    ${tb(["Langkah", "Skrip", "Hasil", "Bila gagal"], [
      ["1", "uji: hujan, ansambel_hujan, sungai, bahaya, kejadian, status, rob, posko, peringatan, riwayat (<code>… uji</code>)", "–", "jalan berhenti, tidak terbit"],
      ["2", "<code>hujan.py</code>", "hujan.json (± 2.930 sel)", "jalan berhenti"],
      ["3", "<code>ansambel_hujan.py</code>", "hujan_ansambel.json (349 titik × 51 anggota)", "boleh gagal: jalur P3 dimatikan"],
      ["4", "<code>peringatan.py</code>", "peringatan.json", "boleh gagal: berkas lama"],
      ["5", "<code>sungai.py</code>", "sungai.json; ambang 6 titik baru per hari", "jalan berhenti"],
      ["6", "<code>rob.py</code>", "rob.json; arsip 15 titik baru per hari", "boleh gagal: berkas lama"],
      ["7", "<code>bahaya.py</code>, <code>kejadian.py</code>", "bahaya.json, kejadian.json (hanya bila belum ada)", "boleh gagal"],
      ["8", "<code>riwayat.py</code>", "riwayat.json, riwayat_grid*.json", "boleh gagal"],
      ["9", "<code>status.py</code>, <code>posko.py</code>", "status.json, meta.json, posko.json, pusat_kec.json", "jalan berhenti"]])}
    ${h("Sumber data")}${tb(["Data", "Sumber", "Diperbarui"], [
      ["Prakiraan dan arsip 7 hari hujan, hujan per jam, CAPE, kelembapan tanah", "Open-Meteo Forecast (model best_match; untuk Indonesia = ECMWF IFS), kisi 0,25°", "harian"],
      ["Peluang hujan lebat", "ECMWF IFS ENS 51 anggota lewat Open-Meteo Ensemble (cadangan GFS 31 anggota)", "harian"],
      ["Debit sungai besar", "Copernicus GloFAS v4 lewat Open-Meteo Flood API", "harian; ambang 29 tahun bertahap"],
      ["Muka laut dan gelombang", "Open-Meteo Marine (Météo-France SMOC 0,08°), arsip sejak 24 Nov 2022", "harian"],
      ["Alat ukur pasang", "IOC Sea Level Monitoring Facility (sensor tekanan)", "harian"],
      ["Peringatan resmi", "BMKG nowcast (CAP), BMKG Maritim (rob PDF, gelombang)", "harian"],
      ["Indeks bahaya", "InaRISK BNPB, raster 100 m (banjir, bandang, longsor, kekeringan, gelombang & abrasi)", "statis"],
      ["Kejadian bencana", "BNPB data.bnpb.go.id (CKAN) dan DIBI BNPB (dasbor publik)", "tahunan / saat dijalankan"],
      ["Batas wilayah, desa, kantor BPBD", "Kemendagri, OpenStreetMap, BNPB", "statis"]])}`,
    batas: ["Data diperbarui sekali sehari; hujan yang turun siang ini baru masuk perhitungan besok pagi.", "Bila kuota Open-Meteo habis, ambang sungai dan arsip rob yang baru tertunda ke jalan berikutnya.",
      "Indeks bahaya InaRISK dan riwayat BNPB hanya diambil ulang bila berkasnya hilang."]});

  /* ---------------------------------------------------------------- 2 */
  B.push({ik: "hujan", j: "Hujan: prakiraan dan yang sudah turun", sub: "Angka hujan 3 hari ke depan, 7 hari lalu, dan derasnya per jam",
    singkat: `Indonesia dibagi menjadi kotak-kotak sekitar 28 × 28 km. Untuk tiap kotak di darat diambil prakiraan hujan harian 7 hari, hujan yang sudah turun 7 hari terakhir, hujan terderas per jam, energi awan badai (CAPE), dan kebasahan tanah. Dua angka paling penting: <b>hujan 3 hari</b> (jumlah hujan tiga hari berturut-turut) dan <b>hujan 7 hari lalu</b> (seberapa basah tanah sebelum hujan berikutnya). Kecamatan memakai kotak tempat titik tengahnya berada.`,
    alur: [["d", "kisi", "Kotak 0,25°", "± 2.930 kotak di darat"], ["d", "hujan", "Ambil prakiraan", "Open-Meteo, 7 hari lalu + 7 hari depan"], ["o", "hitung", "Jumlahkan 3 hari", "tiap hari mulai hari itu"],
      ["o", "kalender", "Jumlahkan 7 hari lalu", "hujan teramati model"], ["h", "pin", "Pasang ke kecamatan", "kotak tempat titik tengahnya"]],
    contoh: async () => {
      const k = mtKec("b"); if (!k) throw new Error("status.json kosong");
      const m = await mtMasukan(k), H = S.hujan, x = mtHari(m, 0), hh = [0, 1, 2].map(d => m.g.h[m.i0 + d]), mx = Math.max(...m.g.h.slice(m.i0).map(v => v || 0));
      return mtTangga(mtNamaKec(k), `Kotak hujan ${mtA(m.g.lat, 3)}°, ${mtA(m.g.lon, 3)}° (± 28 km). Kecamatan ini dipilih karena statusnya paling tinggi minggu ini.`, [
        ...hh.map((v, d) => ["in", `Prakiraan hujan ${tglPendek(H.hari[m.i0 + d])}`, `kelas BMKG: ${kelasHujan(v || 0)}`, mtA(v) + " mm"]),
        ["", "Hujan 3 hari mulai hari ini", `${hh.map(v => mtA(v)).join(" + ")}`, mtA(x.h3) + " mm"],
        ["", "Hujan 3 hari terbesar sampai 6 hari ke depan", "jendela tiga hari digeser satu hari tiap kali, diambil yang terbesar", mtA(m.g.h3) + " mm"],
        ["in", "Hujan 7 hari terakhir", "jumlah hujan teramati model 7 hari sebelum hari ini", mtA(m.g.a7) + " mm"],
        ["in", "Hujan terderas per jam hari ini", "rata-rata kotak 28 km; badai lokal bisa jauh lebih deras", mtA(m.g.imax?.[m.i0]) + " mm/jam"],
        ["in", "Kebasahan tanah 3–27 cm hari ini", "porsi air dalam tanah; ≥ 0,45 dianggap jenuh (lihat bagian 5)", mtA(m.g.sm?.[m.i0], 3) + " m³/m³"],
        ["hasil", "Hari terbasah 7 hari ke depan", "kelas BMKG: ringan &lt; 20, sedang 20–50, lebat 50–100, sangat lebat 100–150, ekstrem &gt; 150 mm/hari", `${mtA(mx)} mm · ${kelasHujan(mx)}`]]);
    },
    teknis: `<p><code>scripts/banjir/hujan.py</code>. Kisi 0,25°: pusat sel 11,125 LS–6,375 LU, 94,875–141,375 BT. Sel dianggap darat bila pusatnya atau salah satu dari empat titik geser ±0,08° jatuh di poligon kecamatan Kemendagri. Open-Meteo Forecast, <code>past_days=7</code>, <code>forecast_days=7</code>, zona Asia/Jakarta, 100 lokasi per permintaan.</p>
    ${tb(["Medan", "Isi", "Satuan"], [["h", "hujan harian, 3 hari lalu s.d. hari ini + 6 (10 nilai)", "mm"], ["h3", "jumlah 3 hari bergeser terbesar, hari ini s.d. + 6; nilai kosong = 0", "mm"], ["a7", "jumlah 7 hari teramati, H−7 s.d. H−1", "mm"],
      ["imax", "hujan per jam terbesar hari itu", "mm/jam"], ["cape", "CAPE maksimum hari itu", "J/kg"], ["sm", "kelembapan tanah rata-rata harian 3–27 cm = (6·sm 3–9 cm + 18·sm 9–27 cm)/24", "m³/m³"],
      ["p, jam, g", "peluang hujan maks, lama hujan, hembusan angin maks", "%, jam, km/jam"]])}
    <p>Lapisan tanah 0–3 cm tidak diambil supaya bobot kuota tetap 1 panggilan per lokasi (10 variabel × 14 hari). Kecamatan → sel: petak <code>floor(lat/0,25), floor(lon/0,25)</code> yang sama dengan titik tengah kecamatan; bila kosong, sel terdekat di 8 petak tetangga.</p>`,
    batas: ["Prakiraan model 28 km tidak melihat hujan badai lokal; hujan per jam di sini adalah rata-rata kotak, bukan di satu kampung.", "Hujan 7 hari lalu adalah hujan model, bukan pengukuran penakar hujan BMKG.",
      "Kecamatan besar di Kalimantan dan Papua hanya diwakili satu kotak di titik tengahnya."]});

  /* ---------------------------------------------------------------- 3 */
  B.push({ik: "perisai", j: "Indeks bahaya InaRISK", sub: "Seberapa rawan tempatnya, terlepas dari cuaca hari ini",
    singkat: `Hujan yang sama bisa aman di bukit kering dan berbahaya di dataran banjir. Karena itu tiap kecamatan diberi angka kerawanan 0 sampai 1 dari peta bahaya resmi BNPB (InaRISK): 0 berarti di luar zona bahaya, 1 paling rawan. Peta itu dicuplik di beberapa titik dalam kecamatan dan diambil angka tertingginya, artinya "ada bagian kecamatan ini yang serawan ini". Batas yang dipakai aturan status: 0,33 (sedang) dan 0,66 (tinggi).`,
    alur: [["d", "perisai", "Peta bahaya BNPB", "kotak 100 m, banjir, bandang, longsor, kekeringan, gelombang"], ["o", "pin", "Cuplik di kecamatan", "titik tengah + kisi 3 × 3, maks 10 titik"], ["o", "urut", "Ambil yang tertinggi", ""], ["h", "ukur", "Indeks 0–1", "rendah, sedang, tinggi"]],
    contoh: async () => {
      const k = mtKec("b"); if (!k) throw new Error("status.json kosong");
      const b = (await mtBahaya())[k] || {}, kl = v => v >= .66 ? "tinggi" : v >= .33 ? "sedang" : v > 0 ? "rendah" : "di luar zona";
      return mtTangga(mtNamaKec(k), "Kecamatan yang sama dengan contoh hujan. Nilai tertinggi dari titik-titik cuplikan di dalam kecamatan.", [
        ...[["banjir", "Banjir"], ["bandang", "Banjir bandang"], ["longsor", "Tanah longsor"], ["gelombang", "Gelombang ekstrem & abrasi"], ["kering", "Kekeringan"]]
          .map(([z, n]) => ["in", n, kl(b[z] || 0), mtA(b[z] || 0, 2)]),
        mtCek((b.banjir || 0) >= .33, "Bahaya banjir minimal sedang (≥ 0,33)?", "syarat jalur Siaga dari hujan, hujan per jam, dan ansambel"),
        mtCek((b.banjir || 0) >= .66, "Bahaya banjir tinggi (≥ 0,66)?", "syarat jalur Awas dari hujan"),
        ["hasil", "Kelas bahaya banjir", "dipakai di bagian 4", kl(b.banjir || 0)]]);
    },
    teknis: `<p><code>scripts/banjir/bahaya.py</code>. Layanan ImageServer <code>gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_*</code>, operasi getSamples. Raster hanya bernilai di zona bahaya; di luar zona dicatat 0. Titik cuplik per kecamatan: titik berat luas cincin terbesar (rumus shoelace) ditambah titik kisi 3 × 3 di kotak batasnya yang jatuh di dalam poligon. Yang disimpan nilai <b>tertinggi</b>.</p>
    ${tb(["Ambang", "Dipakai di"], [["≥ 0,33", "Siaga banjir (hujan 3 hari ≥ 80 mm, hujan per jam ≥ 30 mm, P3 ≥ 0,5); Waspada & Siaga longsor"], ["≥ 0,66", "Awas banjir dari hujan; Awas & Siaga longsor"], ["rata-rata kecamatan", "20 poin skor risiko riwayat (bagian 15)"]])}`,
    batas: ["Maksimal 10 titik per kecamatan, bukan statistik seluruh luas: kecamatan besar (Papua, Kalimantan) bisa terlewat zona rawannya.", "Peta InaRISK bersifat tetap; perubahan tutupan lahan dan tanggul baru tidak tercermin.",
      "Lapisan gelombang & abrasi bernilai 0 di banyak kota pantai, karena itu tidak dipakai untuk skor rob."]});

  /* ---------------------------------------------------------------- 4 */
  B.push({ik: "centang", j: "Status banjir per kecamatan", sub: "Normal, Waspada, Siaga, Awas: hari ini sampai 3 hari ke depan",
    singkat: `Status dibaca dari atas ke bawah seperti daftar periksa: kalau syarat Awas terpenuhi berhenti di Awas; kalau tidak, cek Siaga; lalu Waspada; sisanya Normal. Syaratnya memadukan lima hal: hujan 3 hari, kerawanan tempat (InaRISK), sungai besar terdekat, hujan terderas per jam, dan peluang hujan lebat dari 51 skenario cuaca. Dihitung untuk tiap kecamatan dan tiap hari; kabupaten dan provinsi mengambil status tertinggi kecamatannya.`,
    alur: [["d", "hujan", "Hujan 3 hari", "kemarin s.d. besok"], ["d", "perisai", "Kerawanan InaRISK", "bagian 3"], ["d", "sungai", "Sungai terdekat", "≤ 25 km, bagian 7"],
      ["u", "centang", "Cek Awas → Siaga → Waspada", "berhenti di syarat pertama yang cocok"], ["h", "pin", "Status 4 hari", "kab/prov = tertinggi"]],
    contoh: async () => {
      const k = mtKec("b"); if (!k) throw new Error("status.json kosong");
      const m = await mtMasukan(k), st = S.st.kec[k], d = st.b.indexOf(Math.max(...st.b)), x = mtHari(m, d), bh = m.b.banjir || 0;
      const awas = x.rk === 3 || (x.h3 >= AMBANG_B[2] && bh >= .66), siaga = x.rk === 2 || (bh >= .33 && (x.h3 >= AMBANG_B[1] || (x.im || 0) >= 30 || (x.p3 || 0) >= .5)),
        wsp = x.rk === 1 || x.h3 >= AMBANG_B[0] || (x.im || 0) >= 20 || ((x.cape || 0) >= 2500 && x.h3 >= AMBANG_B[0]), lv = levelBanjir(x.h3, bh, x.rk, x.im, x.cape, x.p3);
      return mtTangga(`${mtNamaKec(k)} · ${tglPendek(S.st.hari[d])}`, "Kecamatan berstatus banjir tertinggi minggu ini, pada hari puncaknya. Semua angka diambil ulang dari berkas data, lalu aturan dijalankan di peramban ini.", [
        ["in", "Hujan 3 hari: sehari sebelum, hari itu, sehari sesudah", `${[-1, 0, 1].map(i => mtA(x.h[m.i0 + d + i])).join(" + ")} mm`, mtA(x.h3) + " mm"],
        ["in", "Kerawanan banjir InaRISK", "0 aman … 1 paling rawan", mtA(bh, 2)],
        ["in", "Sungai besar terdekat", mtRk(m, x.rk), x.rk == null ? "–" : MT_RK[x.rk]],
        ["in", "Hujan terderas per jam", "puncak dalam 3 hari yang sama", mtA(x.im) + " mm/jam"],
        ["in", "Energi awan badai (CAPE)", "≥ 2.500 J/kg = udara sangat labil", mtA(x.cape, 0) + " J/kg"],
        ["in", "Peluang hujan ≥ 100 mm dalam 3 hari", "porsi dari 51 skenario cuaca ECMWF (bagian 6)", x.p3 == null ? "tidak ada" : mtP(x.p3)],
        mtCek(awas, "Syarat Awas?", "sungai di atas banjir 20 tahunan, ATAU hujan 3 hari ≥ 120 mm di tempat berbahaya tinggi (≥ 0,66)"),
        !awas && mtCek(siaga, "Syarat Siaga?", "sungai di atas banjir 5 tahunan, ATAU di tempat berbahaya ≥ 0,33: hujan 3 hari ≥ 80 mm, hujan per jam ≥ 30 mm (bandang), atau peluang ansambel ≥ 50%"),
        !awas && !siaga && mtCek(wsp, "Syarat Waspada?", "sungai di atas banjir 2 tahunan, ATAU hujan 3 hari ≥ 40 mm, ATAU hujan per jam ≥ 20 mm"),
        mtCek(lv === st.b[d], "Sama dengan status di peta?", `status.json mencatat ${LEVEL[st.b[d]]}`, "sama", "berbeda"),
        ["hasil", "Status banjir", `empat hari: ${st.b.map(l => LEVEL[l]).join(", ")}`, pill(lv)]]);
    },
    teknis: `<p><code>scripts/banjir/status.py</code>, fungsi <code>level_banjir</code>; salinannya di halaman ini (<code>levelBanjir</code>) dipakai tab Simulasi dan contoh di atas. Untuk hari d (0 = hari ini, sampai 3):</p>
    ${tb(["Masukan", "Arti"], [["H3", "jumlah hujan hari d-1, d, d+1 di sel kecamatan (untuk hari ini, d-1 = hujan kemarin), dibulatkan 0,1 mm"], ["B", "indeks bahaya banjir InaRISK kecamatan"], ["RK", "kelas debit kendali tertinggi hari d..d+2 terhadap Q2/Q5/Q20 titik sungai terdekat ≤ 25 km (kosong bila belum berambang)"],
      ["I", "hujan per jam terbesar di jendela H3 (imax)"], ["C", "CAPE terbesar di jendela H3"], ["P3", "peluang ansambel ECMWF jumlah 3 hari mulai hari d ≥ 100 mm (titik ansambel terdekat ≤ 1°)"]])}
    ${rumus(`Awas     RK = 3  atau  (H3 ≥ 120 dan B ≥ 0,66)
Siaga    RK = 2  atau  B ≥ 0,33 dan (H3 ≥ 80 atau I ≥ 30 atau P3 ≥ 0,5)
Waspada  RK = 1  atau  H3 ≥ 40  atau  I ≥ 20  atau  (C ≥ 2.500 dan H3 ≥ 40)
Normal   selain itu`)}
    <p>Medan yang tidak ada di berkas (imax, cape, ansambel) mematikan jalurnya, bukan dianggap nol. Syarat CAPE tidak menambah apa pun di atas H3 ≥ 40 dan dipertahankan sebagai penanda. Ambang awal 50/100/150 mm (kelas BMKG harian pada jumlah 3 hari) diturunkan ke 40/80/120 dan jendelanya digeser sehari ke belakang setelah uji balik terhadap kejadian banjir DIBI 2016-2025 (<code>scripts/banjir/uji_balik.py</code>, RISET-UJI-BALIK.md): dipilih di 2016-2021, lalu di 2022-2025 Siaga mengenai 13% hari banjir (dulu 6%), selisih skill di atas derau bootstrap. Kabupaten dan provinsi = status tertinggi kecamatannya. status.json hanya memuat kecamatan dengan status di atas Normal.</p>`,
    batas: ["Uji balik memakai hujan ERA5 sebagai prakiraan sempurna; prakiraan nyata lebih meleset. Skill tetap rendah: 94% hari Siaga tidak punya kejadian tercatat di DIBI (sebagian karena banjir kecil tidak tercatat).", "Banjir karena drainase kota, sungai kecil, dan tanggul jebol tidak terlihat oleh data ini.",
      "Satu titik tengah per kecamatan: hujan di hulu yang jauh tidak ikut, kecuali lewat sungai besar."]});

  /* ---------------------------------------------------------------- 5 */
  B.push({ik: "lereng", j: "Status tanah longsor", sub: "Hujan lebat di atas tanah yang sudah basah, di lereng rawan",
    singkat: `Longsor biasanya terjadi bila hujan lebat turun di atas tanah yang sudah jenuh air, di lereng yang memang rawan. Platform menilai tanah "jenuh" bila model mencatat kebasahan tanah ≥ 0,45 <b>dan</b> sudah turun hujan ≥ 25 mm dalam 7 hari terakhir. Bila data kebasahan tanah tidak ada, dipakai syarat lama: hujan 7 hari ≥ 150 mm. Syarat hujan 7 hari wajib ada karena tanah liat basah sepanjang tahun, termasuk di musim kemarau.`,
    alur: [["d", "hujan", "Hujan 3 hari", "kemarin s.d. besok"], ["d", "kisi", "Tanah jenuh?", "kebasahan ≥ 0,45 dan hujan 7 hari ≥ 25 mm"], ["d", "perisai", "Lereng rawan?", "InaRISK longsor"],
      ["u", "centang", "Cek Awas → Siaga → Waspada", ""], ["h", "lereng", "Status 4 hari", ""]],
    contoh: async () => {
      const k = mtKec("l"); if (!k) throw new Error("status.json kosong");
      const m = await mtMasukan(k), st = S.st.kec[k], d = st.l.indexOf(Math.max(...st.l)), x = mtHari(m, d), bl = m.b.longsor || 0, a7 = m.g.a7 || 0;
      const jenuh = x.sm != null ? x.sm >= .45 && a7 >= A7_BASAH : a7 >= 150, lv = levelLongsor(x.h3, a7, bl, x.sm, x.im), [lw, ls, la] = AMBANG_L;
      const awas = x.h3 >= la && jenuh && bl >= .66, siaga = (x.h3 >= ls && jenuh && bl >= .66) || (x.h3 >= la && bl >= .33) || ((x.im || 0) >= 20 && bl >= .66);
      return mtTangga(`${mtNamaKec(k)} · ${tglPendek(S.st.hari[d])}`, "Kecamatan berstatus longsor tertinggi minggu ini, pada hari puncaknya.", [
        ["in", "Hujan 3 hari: sehari sebelum, hari itu, sehari sesudah", `${[-1, 0, 1].map(i => mtA(x.h[m.i0 + d + i])).join(" + ")} mm`, mtA(x.h3) + " mm"],
        ["in", "Hujan 7 hari terakhir", "teramati model", mtA(a7) + " mm"],
        ["in", "Kebasahan tanah 3–27 cm", "hari itu", x.sm == null ? "tidak ada" : mtA(x.sm, 3) + " m³/m³"],
        ["in", "Kerawanan longsor InaRISK", "0 aman … 1 paling rawan", mtA(bl, 2)],
        mtCek(jenuh, "Tanah dianggap jenuh?", x.sm != null ? `perlu kebasahan ≥ 0,45 (di sini ${mtA(x.sm, 3)}) dan hujan 7 hari ≥ 25 mm (di sini ${mtA(a7)} mm)` : `data kebasahan tidak ada: perlu hujan 7 hari ≥ 150 mm (di sini ${mtA(a7)} mm)`),
        mtCek(awas, "Syarat Awas?", "hujan 3 hari ≥ 90 mm, tanah jenuh, dan lereng berbahaya tinggi (≥ 0,66)"),
        !awas && mtCek(siaga, "Syarat Siaga?", "hujan 3 hari ≥ 60 mm + tanah jenuh + bahaya ≥ 0,66; ATAU hujan 3 hari ≥ 90 mm + bahaya ≥ 0,33; ATAU hujan per jam ≥ 20 mm + bahaya ≥ 0,66"),
        !awas && !siaga && mtCek(x.h3 >= lw && bl >= .33, "Syarat Waspada?", "hujan 3 hari ≥ 30 mm di lereng berbahaya ≥ 0,33"),
        mtCek(lv === st.l[d], "Sama dengan status di peta?", `status.json mencatat ${LEVEL[st.l[d]]}`, "sama", "berbeda"),
        ["hasil", "Status longsor", `empat hari: ${st.l.map(l => LEVEL[l]).join(", ")}`, pill(lv)]]);
    },
    teknis: `<p><code>status.py</code>, fungsi <code>level_longsor</code> (B = indeks bahaya longsor InaRISK):</p>
    ${rumus(`JENUH    sm ≥ 0,45 m³/m³ dan A7 ≥ 25 mm;   bila sm tidak ada: A7 ≥ 150 mm
Awas     H3 ≥ 90 dan JENUH dan B ≥ 0,66
Siaga    (H3 ≥ 60 dan JENUH dan B ≥ 0,66)  atau  (H3 ≥ 90 dan B ≥ 0,33)  atau  (I ≥ 20 dan B ≥ 0,66)
Waspada  H3 ≥ 30 dan B ≥ 0,33`)}
    <p><b>Mengapa 0,45.</b> Kebasahan tanah di hujan.json berasal dari ECMWF IFS (model best_match Open-Meteo untuk Indonesia; dicek 13 Okt 2026 sama persis dengan model IFS). Model tanah IFS (HTESSEL; Balsamo dkk. 2009, ECMWF Tech. Memo 563 Tabel 2) memakai kadar air jenuh 0,403 (kasar), 0,439 (sedang), 0,430 (sedang-halus), 0,520 (halus), 0,614 (sangat halus), 0,766 (organik) dan kapasitas lapang 0,244 / 0,347 / 0,383 / 0,448 / 0,541 / 0,663. Jadi 0,45 = jenuh untuk tekstur kasar-sedang dan ≥ kapasitas lapang untuk lempung tropis.</p>
    <p><b>Mengapa wajib hujan 7 hari ≥ 25 mm.</b> Uji 13 Okt 2026: kebasahan ≥ 0,45 saja menandai 154 kecamatan berbahaya tinggi di musim kemarau, karena tanah liat dan organik basah sepanjang tahun. Batas 25 mm (dulu 50) dan ambang H3 30/60/90 mm (dulu 50/100/150, jendela digeser sehari ke belakang) berasal dari uji balik terhadap kejadian longsor DIBI 2016-2025 (RISET-UJI-BALIK.md): di 2022-2025 Siaga mengenai 15% hari longsor (dulu 4%).</p>
    <p>A7 tetap untuk keempat hari (hujan 7 hari sebelum hari ini). Pembanding luar: ambang operasional ILEWS Balai Sabo 64 mm/3 hari (Jawa) dan 91 mm/3 hari (Sumatra) belum dipakai karena belum diverifikasi ke naskah aslinya (RISET-PARAMETER.md butir 8).</p>`,
    batas: ["Kebasahan tanah adalah nilai model 28 km, bukan pengukuran lapangan; untuk tanah sangat halus ambang 0,45 terlalu longgar.", "Lereng, retakan, dan pemotongan tebing tidak diketahui; kerawanan hanya dari peta InaRISK.",
      "Longsor sangat lokal; status kecamatan berarti \"ada bagian kecamatan yang perlu diperiksa\", bukan lokasi longsor."]});

  /* ---------------------------------------------------------------- 6 */
  B.push({ik: "dadu", j: "Peluang hujan lebat (51 skenario)", sub: "Seberapa yakin prakiraan hujan lebat itu",
    singkat: `Satu prakiraan cuaca bisa meleset. Pusat cuaca Eropa (ECMWF) menjalankan modelnya 51 kali dengan kondisi awal yang sedikit berbeda, sehingga ada 51 kemungkinan cuaca. Platform menghitung berapa dari 51 skenario itu yang menurunkan hujan ≥ 100 mm dalam 3 hari. Bila setengah atau lebih setuju, dan tempatnya cukup rawan, kecamatan naik menjadi Siaga walau prakiraan utamanya lebih kecil.`,
    alur: [["d", "dadu", "51 skenario ECMWF", "satu titik per kotak 1°"], ["o", "hitung", "Jumlah 3 hari per skenario", ""], ["o", "urut", "Hitung yang ≥ 100 mm", ""], ["h", "grafik", "Peluang = porsi skenario", "dipakai jalur Siaga, bagian 4"]],
    contoh: async () => {
      const E = await mtJSON("data/hujan_ansambel.json"), e0 = E.hari.indexOf(S.hujan.hari_ini);
      if (e0 < 0) throw new Error("berkas ansambel bukan untuk hari ini, jalur P3 sedang tidak dipakai");
      const g = E.grid.reduce((m, x) => (x.p3[e0] || 0) > (m.p3[e0] || 0) ? x : m), n = E.anggota || 51;
      return mtTangga(`Titik ${mtA(g.lat, 3)}°, ${mtA(g.lon, 3)}° (${esc(namaProv(g.prov))}) · ${tglPendek(E.hari[e0])}`, `Titik dengan peluang tertinggi hari ini dari ${fmt(E.grid.length)} titik. Nilainya berlaku untuk kotak 1° (± 110 km) di sekitarnya.`, [
        ["in", "Jumlah skenario", `model ${esc(E.model || "ecmwf_ifs025")}`, fmt(n)],
        ["", "Skenario dengan hujan ≥ 100 mm dalam 3 hari", `± ${mtP(g.p3[e0])} × ${n}`, "± " + fmt(Math.round(g.p3[e0] * n))],
        ["in", "Peluang hujan ≥ 50 mm dalam sehari (lebat)", "porsi skenario hari ini", mtP(g.p50[e0])],
        ["in", "Peluang hujan ≥ 100 mm dalam sehari (sangat lebat)", "porsi skenario hari ini", mtP(g.p100[e0])],
        mtCek(g.p3[e0] >= .5, "Setidaknya setengah skenario setuju?", "syarat jalur Siaga (bersama bahaya InaRISK ≥ 0,33)"),
        ["hasil", "Peluang hujan ≥ 100 mm / 3 hari", "", mtP(g.p3[e0])]]);
    },
    teknis: `<p><code>scripts/banjir/ansambel_hujan.py</code>. Open-Meteo Ensemble API, model <code>ecmwf_ifs025</code> (51 anggota; cadangan <code>gfs025</code>, 31 anggota), hari ini s.d. + 7. Biaya kuota 5,1 panggilan per lokasi, jadi tidak per sel 0,25° (± 15.000 panggilan) tetapi satu titik per kotak 1°: sel darat hujan.json yang terdekat ke pusat kotak, 349 titik (± 1.780 panggilan per hari).</p>
    ${rumus(`p50  = porsi anggota dengan hujan harian ≥ 50 mm
p100 = porsi anggota dengan hujan harian ≥ 100 mm
p3   = porsi anggota dengan jumlah hari d, d+1, d+2 ≥ 100 mm   (anggota tanpa data dibuang dari penyebut)`)}
    <p>status.py memakai titik terdekat ke titik tengah kecamatan bila selisihnya ≤ 1° lintang dan bujur. Bila berkas ansambel tidak ada atau tanggalnya bukan hari ini, jalur P3 dimatikan.</p>`,
    batas: ["Satu titik mewakili kotak ± 110 km; hujan lebat yang sangat lokal bisa tidak terwakili.", "Ansambel boleh gagal diunduh; saat gagal, status dihitung tanpa jalur ini.",
      "Peluang dari model bukan peluang yang sudah dikalibrasi terhadap pengamatan Indonesia."]});

  /* ---------------------------------------------------------------- 7 */
  B.push({ik: "sungai", j: "Sungai besar (GloFAS)", sub: "Debit sungai dibanding banjir 2, 5, dan 20 tahunan",
    singkat: `Model sungai Eropa (GloFAS) memperkirakan berapa meter kubik air yang lewat tiap detik di sungai-sungai besar. Supaya angkanya bermakna, tiap titik sungai dibandingkan dengan sejarahnya sendiri: dari debit tertinggi tiap tahun selama 29 tahun dihitung "banjir 2 tahunan" (rata-rata terlampaui sekali dalam 2 tahun), "5 tahunan", dan "20 tahunan". Bila prakiraan debit melewati banjir 2 tahunan = Waspada, 5 tahunan = Siaga, 20 tahunan = Awas.`,
    alur: [["d", "sungai", "Titik sungai besar", "debit median > 30 m³/detik"], ["d", "berkas", "Debit 1997–2025", "debit tertinggi tiap tahun"], ["o", "grafik", "Hitung ambang", "banjir 2, 5, 20 tahunan"],
      ["d", "awan", "Prakiraan 7 hari", "GloFAS harian"], ["h", "ukur", "Bandingkan", "Waspada, Siaga, Awas"]],
    contoh: () => {
      const T = (S.sungai?.titik || []).filter(t => t.q2 && t.q5 && t.q20); if (!T.length) throw new Error("belum ada titik sungai berambang");
      const t = T.reduce((m, x) => (x.puncak || 0) / x.q2 > (m.puncak || 0) / m.q2 ? x : m), G = mtGumbel(t), q20 = G.u + 2.9702 * G.a, per = G.T(t.puncak || 0), kl = kelasSungai([t.puncak], 0, t) ?? 0;
      return mtTangga(`Sungai di Kec. ${esc(t.kec)}, ${esc(t.kab)} (${esc(namaProv(t.prov))})`, `Titik dengan debit paling dekat ke ambangnya di antara ${fmt(T.length)} titik yang sudah punya ambang (dari ${fmt(S.sungai.titik.length)} titik).`, [
        ["in", "Banjir 2 tahunan (Q2)", "terlampaui rata-rata sekali dalam 2 tahun", fmt(Math.round(t.q2)) + " m³/dtk"],
        ["in", "Banjir 5 tahunan (Q5)", "", fmt(Math.round(t.q5)) + " m³/dtk"],
        ["", "Lebar sebaran debit tahunan", `(Q5 − Q2) ÷ (1,5 − 0,3665)`, mtA(G.a, 0)],
        ["", "Debit puncak tahunan yang paling lazim", `Q2 − 0,3665 × ${mtA(G.a, 0)}`, fmt(Math.round(G.u)) + " m³/dtk"],
        mtCek(Math.abs(q20 - t.q20) <= Math.max(2, t.q20 * .002), "Banjir 20 tahunan cocok dengan berkas?", `${fmt(Math.round(G.u))} + 2,9702 × ${mtA(G.a, 0)} = ${fmt(Math.round(q20))}; berkas ${fmt(Math.round(t.q20))}`, "cocok", "berbeda"),
        ["in", "Debit tertinggi 7 hari ke depan", "prakiraan GloFAS (anggota kendali)", fmt(Math.round(t.puncak)) + " m³/dtk"],
        ["", "Setara banjir berapa tahunan", "dari kurva yang sama", per < 2 ? "di bawah 2 tahunan" : `± ${mtA(per, 0)} tahunan`],
        ["hasil", "Kelas sungai", `${mtP(t.puncak / t.q2)} dari banjir 2 tahunan`, pill(kl)]],
        `Hanya ${fmt(T.length)} dari ${fmt(S.sungai.titik.length)} titik yang sudah punya ambang; titik lain ditambah 6 per hari karena unduhan 29 tahun mahal kuota.`);
    },
    teknis: `<p><code>scripts/banjir/sungai.py</code>. <b>Langkah A</b> (sekali): kisi darat 0,25° dikirim ke Open-Meteo Flood API, yang memakai sel GloFAS 0,05° terdekat; sel dipertahankan bila median debit 14 hari terakhir &gt; 30 m³/dtk, sel kembar dibuang. <b>Langkah B</b> (bertahap, 6 titik per hari): debit harian 1997-01-01 s.d. 2025-12-31 (1984–1996 kosong di Open-Meteo), maksimum tiap tahun yang punya ≥ 300 hari data, minimal 10 tahun, lalu distribusi Gumbel metode momen. <b>Langkah C</b> (harian): <code>river_discharge</code> (anggota kendali) dan <code>river_discharge_max</code>, 3 hari lalu + 7 hari.</p>
    ${rumus(`α   = s · √6 / π              s = simpangan baku maksimum tahunan (n − 1)
u   = rata-rata − 0,5772 · α
Q_T = u − α · ln(−ln(1 − 1/T))  →  Q2 = u + 0,3665 α,  Q5 = u + 1,5000 α,  Q20 = u + 2,9702 α
kelas (per jendela 3 hari di status.py, 7 hari di tab Sungai):
  debit tertinggi ≥ Q20 → Awas,  ≥ Q5 → Siaga,  ≥ Q2 → Waspada,  selain itu Normal;  kosong bila belum berambang`)}
    <p>Ambang dan prakiraan berasal dari model yang sama, jadi bias model terhadap debit nyata saling meniadakan. Kecamatan memakai titik sungai terdekat ≤ 25 km dari titik tengahnya. Saat ini ${fmt(M.titik_sungai_berambang)} dari ${fmt(M.titik_sungai)} titik berambang.</p>`,
    batas: ["Hanya sungai besar yang tertangkap kisi 0,25°; titik kisi di samping alur sungai tidak terpilih.", "Banjir sungai kecil, banjir kota, dan bendungan/pintu air tidak dimodelkan GloFAS.",
      `Baru ${fmt(M.titik_sungai_berambang)} dari ${fmt(M.titik_sungai)} titik yang berambang; titik lain tampil "belum ada ambang" dan tidak ikut menentukan status.`, "29 tahun data membuat banjir 20 tahunan masih kasar."]});

  /* ---------------------------------------------------------------- 8 */
  B.push({ik: "ombak", j: "Banjir rob (pasang laut)", sub: "Muka laut tertinggi harian dibanding sejarah titik itu",
    singkat: `Rob terjadi saat laut pasang tinggi masuk ke darat. Untuk ${fmt(nRob)} titik pantai rawan rob (pantura Banten–Jatim dan kota pesisir lain), model laut memperkirakan tinggi muka laut tiap jam 10 hari ke depan. Angka tertinggi tiap hari dibandingkan dengan sejarah titik itu sendiri sejak November 2022: setinggi 5% hari tertinggi (persentil 95) = Waspada, 1% tertinggi = Siaga, melewati rekor = Awas. Karena dibandingkan dengan dirinya sendiri, selisih model dengan patok ukur lokal tidak berpengaruh.`,
    alur: [["d", "ombak", "Model laut per jam", "Open-Meteo Marine, 10 hari"], ["o", "hitung", "Puncak harian", "muka laut dan gelombang"], ["d", "berkas", "Sejarah titik", "sejak 24 Nov 2022"],
      ["u", "ukur", "Bandingkan", "p95, p99, rekor"], ["h", "pin", "Status rob", "+ tanda bila ombak ≥ 1,25 m"]],
    contoh: () => {
      const R = S.rob; if (!R) throw new Error("rob.json tidak ada");
      const iH = Math.max(0, R.hari.indexOf(S.hujan.hari_ini)), A = R.titik.filter(t => t.p95 != null); if (!A.length) throw new Error("belum ada titik rob berambang");
      const rasio = t => Math.max(...t.h.slice(iH).map(v => v == null ? -9 : v / t.p95)), t = A.reduce((m, x) => rasio(x) > rasio(m) ? x : m);
      const hs = t.h.slice(iH), j = iH + hs.indexOf(Math.max(...hs.filter(v => v != null))), hh = t.h[j], w = t.w[j], awas = Math.max(t.p99 + .1, t.amax);
      return mtTangga(`Kec. ${esc(t.kec)}, ${esc(t.kab)} · ${tglPendek(R.hari[j])}`, `Titik pantai yang muka lautnya paling dekat ke ambang dalam 10 hari, dari ${fmt(A.length)} titik berambang. Tinggi terhadap muka laut rata-rata global model, bukan patok lokal.`, [
        ["in", "Muka laut tertinggi hari itu", "pasang + dorongan angin dan tekanan udara", mtA(hh, 2) + " m"],
        ["in", "Ambang Waspada (persentil 95)", "5% hari sejak Nov 2022 lebih tinggi dari ini", mtA(t.p95, 2) + " m"],
        ["in", "Ambang Siaga (persentil 99)", "1% hari lebih tinggi dari ini", mtA(t.p99, 2) + " m"],
        ["in", "Ambang Awas", `yang lebih tinggi dari p99 + 0,10 m dan rekor ${mtA(t.amax, 2)} m`, mtA(awas, 2) + " m"],
        mtCek(hh >= t.p95, "Sampai ambang Waspada?", `${mtA(hh, 2)} m dibanding ${mtA(t.p95, 2)} m`),
        mtCek(hh >= t.p99, "Sampai ambang Siaga?", `${mtA(hh, 2)} m dibanding ${mtA(t.p99, 2)} m`),
        ["in", "Gelombang tertinggi hari itu", "tanda tambahan bila muka laut ≥ p95 dan gelombang ≥ 1,25 m (batas bawah gelombang sedang BMKG)", mtA(w, 2) + " m"],
        t.ioc && ["in", `Alat ukur pasang terdekat: ${esc(t.ioc.nama)}`, `${mtA(t.ioc.jarak_km)} km; korelasi model–alat ${mtA(t.ioc.r, 2)}; selisih rata-rata alat − model`, mtA(t.ioc.offset, 2) + " m"],
        ["hasil", "Status rob hari itu", "", pill(t.lv[j] ?? 0)]]);
    },
    teknis: `<p><code>scripts/banjir/rob.py</code>. Titik: kecamatan pesisir kabupaten sasaran dikirim ke Open-Meteo Marine dengan <code>cell_selection=sea</code>; kecamatan yang jatuh ke sel laut yang sama dirapatkan, sel &gt; 30 km dari pusat kecamatan dibuang, jarak antartitik minimal 15 km.</p>
    ${rumus(`h       = maksimum harian sea_level_height_msl (SMOC 0,08°), 3 hari lalu + 10 hari ke depan
ambang  = persentil 95 dan 99, dan maksimum, dari maksimum harian arsip titik itu sejak 2022-11-24
Waspada h ≥ p95      Siaga h ≥ p99      Awas h ≥ max(p99 + 0,10 m, maksimum 2022+)
gabung  = 1 bila h ≥ p95 dan tinggi gelombang maks ≥ 1,25 m   (penanda, tidak mengubah level)`)}
    <p>Alat ukur IOC (sensor tekanan, <code>prs</code>) dalam jarak dekat dipakai untuk menghitung selisih model − alat, korelasi, dan "air sekarang". Uji 3 stasiun (Semarang, Jakarta Kolinlamil, Surabaya): korelasi per jam 0,96–0,98, fase dan rentang pasang cocok; yang tidak diketahui adalah datum lokal, karena itu ambang dihitung dari iklim model sendiri. Arsip mahal kuota (± 100 panggilan per titik), jadi 15 titik baru per hari; saat ini ${fmt(nRobAmb)} dari ${fmt(nRob)} titik berambang.</p>`,
    batas: ["Model laut 8 km bisa berada sampai 15 km lepas pantai; penurunan muka tanah (bisa beberapa cm per tahun di pantura) tidak dimodelkan.", "Tanggul, pompa, dan saluran setempat menentukan apakah pasang benar-benar masuk; model tidak tahu.",
      "Arsip baru sejak November 2022, jadi \"rekor\" dan persentil 99 masih pendek sejarahnya.", "Titik yang belum berambang tidak punya status."]});

  /* ---------------------------------------------------------------- 9 */
  B.push({ik: "tabel", j: "Uji ambang rob terhadap kejadian nyata", sub: "Seberapa sering ambang menangkap rob yang tercatat BNPB",
    singkat: `Ambang rob diuji pada kejadian "Banjir Rob" yang tercatat di DIBI BNPB sejak arsip model tersedia. Untuk tiap kejadian dicek: apakah muka laut model di kabupaten itu melewati ambang pada hari kejadian atau sehari sebelum/sesudahnya (tanggal laporan sering bergeser). Pada persentil 95, ${VP.p95 ? mtP(VP.p95.pod) : "–"} kejadian tertangkap, dan hanya ${VP.p95 ? mtP(VP.p95.pofd) : "–"} hari tanpa kejadian yang ikut terpicu.`,
    alur: [["d", "berkas", "Kejadian rob DIBI", "per kabupaten, bertanggal"], ["d", "ombak", "Arsip muka laut", "titik di kabupaten yang sama"], ["u", "centang", "Kena atau tidak", "± 1 hari"], ["h", "tabel", "Skor tiap ambang", "p80 s.d. p99"]],
    contoh: () => {
      const v = VP.p95; if (!v) throw new Error("validasi rob belum ada di rob.json");
      const n = RV.kejadian_diuji, pk = RV.persentil_kejadian || {};
      return mtTangga("Ambang Waspada = persentil 95", `Kejadian ${fmt(n)} rob di ${fmt(RV.kab_berkejadian)} kabupaten; arsip ${RV.periode ? mtTgl(RV.periode[0]) + " s.d. " + mtTgl(RV.periode[1]) : "–"} di ${fmt(RV.titik_berarsip)} titik.`, [
        ["in", "Kejadian rob yang bisa diuji", "tanggalnya jatuh di masa arsip dan kabupatennya punya titik", fmt(n)],
        ["", "Tertangkap (hari yang sama ± 1 hari)", `${fmt(Math.round(v.pod * n))} dari ${fmt(n)}`, mtP(v.pod)],
        ["", "Tertangkap tepat di hari yang sama", "", mtP(v.pod_hari_sama)],
        ["", "Hari tanpa kejadian yang tetap terpicu", "makin kecil makin jarang alarm sia-sia", mtP(v.pofd)],
        ["", "Skor keterampilan (tertangkap − alarm sia-sia)", `${mtA(v.pod, 3)} − ${mtA(v.pofd, 3)}; 0 = sama dengan menebak, 1 = sempurna`, mtA(v.pss, 2)],
        ["in", "Hari terpicu yang tidak ada catatan rob", `dari ${fmt(v.hari_terpicu)} hari terpicu; sebagian besar rob kecil tidak dilaporkan ke DIBI`, mtP(v.far)],
        pk.median != null && ["", "Muka laut pada hari kejadian", `median di persentil ${mtA(pk.median)} sejarahnya; hari acak: ${mtA(pk.acak_median)}`, "persentil " + mtA(pk.median)],
        mtCek(v.pod >= .7, "Menangkap ≥ 70% kejadian?", "dasar mempertahankan p95 untuk Waspada"),
        ["hasil", "Ambang Waspada rob", "", "persentil 95"]]);
    },
    teknis: `<p><code>rob.py</code>, fungsi <code>validasi</code>. Kejadian DIBI jenis "Banjir Rob" lewat permintaan yang sama dengan dasbor publik 1 (tamu, tanpa token). Satu kabupaten bisa punya beberapa titik; kabupaten dianggap terpicu bila salah satu titiknya terpicu.</p>
    ${rumus(`POD  = kejadian yang ambangnya terlampaui pada hari itu ± 1 hari ÷ semua kejadian
POFD = hari tanpa kejadian (± 1 hari) yang terpicu ÷ semua hari tanpa kejadian
FAR  = hari terpicu tanpa kejadian ÷ semua hari terpicu
PSS  = POD − POFD   (skor Peirce)`)}
    ${Object.keys(VP).length ? tb(["Ambang", "POD", "POD hari sama", "POFD", "FAR", "PSS", "Hari terpicu"], Object.entries(VP).map(([q, v]) => [q, mtA(v.pod, 3), mtA(v.pod_hari_sama, 3), mtA(v.pofd, 3), mtA(v.far, 3), mtA(v.pss, 3), fmt(v.hari_terpicu)]), [1, 2, 3, 4, 5, 6]) : ""}
    <p>${esc(S.rob?.aturan?.kalibrasi || "")}</p>`,
    batas: [`Hanya ${fmt(RV.kejadian_diuji)} kejadian di ${fmt(RV.kab_berkejadian)} kabupaten: selisih antarambang lebih kecil dari ketidakpastiannya (± 0,08).`, "DIBI mencatat per kabupaten dan banyak rob rutin tidak dilaporkan, jadi angka hari terpicu tanpa catatan (FAR) tidak bisa dibaca sebagai salah alarm.",
      "Akses DIBI lewat dasbor publik, bukan API resmi; bisa berubah sewaktu-waktu."]});

  /* ---------------------------------------------------------------- 10 */
  B.push({ik: "lonceng", j: "Peringatan resmi BMKG", sub: "Ditampilkan apa adanya, tidak mengubah status platform",
    singkat: `Status di platform ini adalah hitungan otomatis, bukan peringatan resmi. Peringatan resmi tetap dari BMKG: peringatan dini cuaca jangka pendek (nowcast, berlaku 2–3 jam), peringatan dini banjir rob per pesisir, dan peringatan gelombang tinggi per perairan. Ketiganya diunduh tiap pagi dan ditampilkan di samping status, tanpa diubah dan tanpa mengubah status. Bila keduanya berbeda, ikuti BMKG.`,
    alur: [["d", "lonceng", "Nowcast BMKG", "CAP, umumnya berlaku 2–3 jam"], ["d", "berkas", "Rob BMKG Maritim", "PDF peringatan dini"], ["d", "ombak", "Gelombang BMKG", "per perairan, 4 kategori"], ["h", "mata", "Tampil di samping status", "tab Rob dan Provinsi"]],
    contoh: async () => {
      const W = await mtJSON("data/peringatan.json"), kini = Date.now(), hr = S.hujan.hari_ini, N = W.nowcast || [], G = W.gelombang || [], RB = S.rob?.bmkg?.rob || [];
      const aktif = N.filter(x => new Date(x.selesai) > kini), robHari = RB.filter(x => x.tanggal_mulai <= hr && hr <= (x.tanggal_selesai || x.tanggal_mulai));
      const nG = z => G.reduce((a, x) => a + (x[z] || []).length, 0);
      return mtTangga(`Peringatan BMKG · ${mtTgl(hr)}`, `Diunduh ${W.dibuat ? jamWIB(W.dibuat) : "–"}${(W.gagal || []).length ? `; gagal: ${esc(W.gagal.join(", "))}` : ""}.`, [
        ["in", "Nowcast cuaca di berkas", "peringatan terbaru di RSS BMKG saat diunduh", fmt(N.length)],
        ["", "Yang masih berlaku saat halaman ini dibuka", "jam berakhir lebih lambat dari sekarang", fmt(aktif.length)],
        ["in", "Peringatan rob BMKG yang mencakup hari ini", `dari ${fmt(RB.length)} baris di PDF BMKG Maritim`, fmt(robHari.length)],
        ["in", "Perairan bergelombang tinggi (2,5–4 m)", `${fmt(G.length)} wilayah peringatan`, fmt(nG("tinggi"))],
        ["in", "Perairan bergelombang sangat tinggi atau ekstrem (&gt; 4 m)", "", fmt(nG("sangat_tinggi") + nG("ekstrem"))],
        ["no", "Apakah peringatan ini mengubah status platform?", "status hanya dari aturan bagian 4, 5, 8", "tidak"],
        ["hasil", "Peringatan rob BMKG hari ini", robHari.length ? esc(robHari.slice(0, 2).map(x => x.lokasi || x.wilayah).join("; ")) : "", fmt(robHari.length) + " lokasi"]]);
    },
    teknis: `<p><code>scripts/banjir/peringatan.py</code> dan bagian BMKG di <code>rob.py</code>. Tanpa kuota Open-Meteo.</p>
    ${tb(["Jenis", "Alamat", "Catatan"], [["Nowcast cuaca (CAP 1.2)", "<code>bmkg.go.id/alerts/nowcast/id</code> → tiap item tertaut ke berkas <code>_alert.xml</code>", "disimpan dengan tanda aktif (berakhir &gt; saat unduh); peramban memfilter lagi"],
      ["Gelombang tinggi", "<code>maritim.bmkg.go.id/marine2026-data/warning/warnings.json</code>", "per provinsi, nama perairan per kategori sedang, tinggi, sangat tinggi, ekstrem"],
      ["Peringatan dini rob", "<code>maritim.bmkg.go.id/marine2026-data/doc/peringatan-dini-banjir-rob.pdf</code>", "dibaca dengan pdftotext -layout; dicocokkan ke titik rob lewat nama kabupaten/kecamatan"]])}
    <p>Bagian yang gagal diunduh memakai isi berkas sebelumnya dan dicatat di <code>gagal</code>. Halaman <code>signature.bmkg.go.id</code> (di balik tantangan Cloudflare) tidak dipakai.</p>`,
    batas: ["Nowcast hanya berlaku 2–3 jam, sedangkan data diunduh sekali pagi: saat halaman dibuka, sebagian besar sudah lewat. Cek langsung situs atau aplikasi BMKG.", "Pencocokan peringatan rob ke titik memakai nama wilayah; ejaan berbeda bisa membuatnya tidak tampil.",
      "Format PDF BMKG bisa berubah sewaktu-waktu."]});

  /* ---------------------------------------------------------------- 11 */
  B.push({ik: "tenda", j: "Lokasi posko", sub: "Pos lapangan permanen dan siaga, pos komando kabupaten dan provinsi",
    singkat: `Posko disusun tiga jenjang seperti aturan BNPB: pos lapangan, pos komando kabupaten, pos komando provinsi. Pos lapangan <b>permanen</b> didirikan sebelum musim hujan di kabupaten yang paling sering banjir dan longsor (paling banyak 3 per provinsi), di kecamatan paling rawan. Saat ada kecamatan Siaga/Awas yang terlalu jauh (&gt; 15 km) dari posko permanen, dibuka pos lapangan <b>siaga</b> sementara. Pos komando kabupaten di kantor BPBD, pos komando provinsi di ibu kota provinsi.`,
    alur: [["d", "berkas", "Riwayat kejadian", "BNPB/DIBI per kabupaten"], ["o", "urut", "Pilih kabupaten", "3 per provinsi, 90 se-Indonesia"], ["o", "pin", "Kecamatan paling rawan", "InaRISK tertinggi"],
      ["u", "radius", "Siaga/Awas > 15 km?", "buka pos siaga"], ["h", "jenjang", "Jenjang komando", "kabupaten → provinsi"]],
    contoh: async () => {
      await Posko.muat(); const P = S.posko, L = P.lapangan, x = L.find(y => y.jenis === "permanen"); if (!x) throw new Error("posko.json tanpa posko permanen");
      const sePr = L.filter(y => y.jenis === "permanen" && y.prov === x.prov), a = L.find(y => y.jenis !== "permanen") || null, ind = a && P.kabupaten.find(k => k.id === a.induk);
      const t1 = mtTangga(`${x.id} · ${mtNamaKec(x.prov + "|" + x.kab + "|" + x.kec)}`, "Posko permanen nomor satu se-Indonesia (kabupaten dengan kejadian terbanyak).", [
        ["in", "Kejadian banjir di kabupaten", "BNPB/DIBI, semua tahun tercatat", fmt(x.kejadian_banjir)],
        ["in", "Kejadian longsor di kabupaten", "", fmt(x.kejadian_longsor)],
        ["", "Jumlah", `${fmt(x.kejadian_banjir)} + ${fmt(x.kejadian_longsor)}`, fmt(x.kejadian)],
        ["", "Jenis yang dominan", "menentukan peta bahaya mana yang dipakai", x.bahaya],
        ["", `Kecamatan dengan bahaya ${x.bahaya} InaRISK tertinggi`, "lokasi posko di kabupaten itu", `${esc(x.kec)} (${mtA(x.ib, 2)})`],
        mtCek(sePr.length <= (P.per_prov ?? 3), `Paling banyak ${P.per_prov ?? 3} per provinsi?`, `${esc(namaProv(x.prov))}: ${fmt(sePr.length)} posko permanen`),
        ["hasil", "Lokasi", x.desa ? `dipindah ke desa terdekat (≤ 8 km)` : "titik tengah kecamatan", x.desa ? "Desa " + esc(x.desa) : "Kec. " + esc(x.kec)]]);
      if (!a) return t1;
      return t1 + `<div style="height:14px"></div>` + mtTangga(`${a.id} · ${mtNamaKec(a.prov + "|" + a.kab + "|" + a.kec)}`, "Pos lapangan sementara pertama dalam daftar, dan jaraknya ke pos komando kabupaten.", [
        ["in", "Status tertinggi 4 hari", `banjir ${LEVEL[a.b]}, longsor ${LEVEL[a.l]}${a.r ? ", rob " + LEVEL[a.r] : ""}`, pill(Math.max(a.b, a.l, a.r))],
        ["no", "Ada posko permanen ≤ 15 km di kabupaten yang sama?", "bila ada, kecamatan ini dilayani posko itu", "tidak"],
        ["in", "Kecamatan yang dilayani", "kecamatan berstatus yang ≤ 15 km ikut posko ini", fmt(a.layan.length)],
        ind && ["", "Jarak garis lurus ke pos komando kabupaten", `${esc(ind.kec)}`, mtA(a.km_induk) + " km"],
        ind && ["", "Perkiraan waktu tempuh darat", `${mtA(a.km_induk)} km × 1,4 (jalan berkelok) ÷ 40 km/jam`, mtA(a.jam_induk) + " jam"],
        ["hasil", "Jenis posko", "", {siaga: "pos siaga", waspada: "pos siaga dini", rob: "pos rob"}[a.jenis] || a.jenis]]);
    },
    teknis: `<p><code>scripts/banjir/posko.py</code> (Perka BNPB 3/2016: pos lapangan → pos komando kabupaten → pos komando provinsi).</p>
    ${tb(["Jenis", "Aturan"], [
      ["Permanen (pra-musim)", "skor kabupaten = jumlah kejadian banjir + longsor (kejadian.json); urut turun; maks 3 per provinsi dan 90 se-Indonesia; jenis dominan = yang kejadiannya lebih banyak; lokasi = kecamatan dengan bahaya InaRISK tertinggi untuk jenis itu (seri: jenis lainnya)"],
      ["Siaga", "kecamatan Siaga/Awas (banjir atau longsor) hari ini s.d. + 3 yang tidak ≤ 15 km dari posko permanen di kabupaten yang sama; greedy: kecamatan berstatus tertinggi jadi posko, kecamatan lain ≤ 15 km ikut"],
      ["Siaga dini", "gugus ≥ 4 kecamatan Waspada berdekatan (≤ 15 km) di satu kabupaten yang belum terlayani; urut hujan 3 hari"],
      ["Rob", "titik rob.json level ≥ 2 di 4 hari status yang belum terlayani"],
      ["Pos komando kabupaten", "kantor BPBD (bpbd.json) bila namanya cocok dan ≤ 200 km dari titik berat posko lapangan; selain itu kecamatan senama kabupaten; lalu kecamatan terdekat dari titik berat berbobot (1 + level)"],
      ["Pos komando provinsi", "ibu kota provinsi (daftar tetap di posko.py)"]])}
    ${rumus(`jarak = haversine (km);   waktu tempuh = jarak × 1,4 ÷ 40 km/jam  (sama dengan karhutla)
titik tengah kecamatan = titik berat luas cincin terbesar; dipindah ke desa OSM terdekat bila ≤ 8 km`)}`,
    batas: ["Jarak garis lurus dikali 1,4, bukan rute jalan nyata; jembatan putus dan jalan tergenang tidak diketahui.", "Pilihan kabupaten permanen bergantung pada pencatatan BNPB/DIBI, yang lebih lengkap di Jawa.",
      "Kantor BPBD dicocokkan lewat nama; yang tidak cocok jatuh ke kecamatan pusat kabupaten."]});

  /* ---------------------------------------------------------------- 12 */
  B.push({ik: "uang", j: "Sarana dan anggaran posko", sub: "Regu, pengungsi, alat, dan biaya harian per posko",
    singkat: `Tiap posko lapangan dihitung kebutuhannya dari keadaan sekitarnya: makin banyak kecamatan Awas/Siaga yang dilayani, makin banyak regu penyelamat; perkiraan pengungsi diambil dari riwayat pengungsian per kejadian di provinsi itu. Daftar alat mengikuti aturan BNPB (Perka 7/2008, 10/2008, 17/2009) dengan harga dari katalog dan pasar. Biaya dibagi tiga: alat sekali beli, operasional harian × lama siaga, dan logistik pengungsi.`,
    alur: [["d", "tenda", "Posko lapangan", "kecamatan yang dilayani"], ["o", "hitung", "Regu & pengungsi", "dari status dan riwayat"], ["o", "alat", "Daftar alat", "Perka BNPB × harga"],
      ["o", "jam", "Operasional", "orang, BBM, sewa × hari"], ["h", "uang", "Anggaran", "alat + operasional + logistik"]],
    contoh: async () => {
      await Posko.muat(); const X = [...S.semuaPosko.values()].filter(y => y.tingkat === 2 && aktifPosko(y)).sort((p, q) => lvPosko(q) - lvPosko(p) || p.id.localeCompare(q.id));
      const x = X[0] || [...S.semuaPosko.values()].find(y => y.tingkat === 2); if (!x) throw new Error("tidak ada posko lapangan");
      const a = anggaran(x), A = ASUMSI, n = x.nlv;
      return mtTangga(`${x.id} · ${mtNamaKec(x.prov + "|" + x.kab + "|" + x.kec)}`, "Posko lapangan aktif dengan status tertinggi. Memakai asumsi yang sedang aktif di tab Posko (bisa diubah di sana).", [
        ["in", "Kecamatan dilayani menurut status", `Awas ${n[3]} · Siaga ${n[2]} · Waspada ${n[1]}${x.r >= 2 ? " · rob ≥ Siaga" : ""}`, fmt(x.layan.length)],
        ["", "Regu penyelamat", `Awas × 1 + Siaga × ½ + Waspada × ¼${x.r >= 2 ? " + 1 (rob)" : ""}, dibulatkan ke atas, 1–6 regu`, fmt(a.regu) + " regu"],
        ["", "Perkiraan pengungsi", `median pengungsi per kejadian ${esc(x.bahaya)} di provinsi × kecamatan Siaga/Awas; minimal ${fmt(A.minUngsi)}`, fmt(a.ungsi) + " orang"],
        ["", "Petugas", `${fmt(a.regu)} regu × ${fmt(A.orangRegu)} orang + dapur, kesehatan, logistik, koordinator`, fmt(a.org) + " orang"],
        ["", "Alat sekali beli", `daftar Perka BNPB × harga${a.alat.est ? `; ${rp(a.alat.est)} di antaranya harga estimasi` : ""}${A.adaAlat ? `; dikurangi ${A.adaAlat}% yang sudah ada` : ""}`, A.alat ? rp(a.alat.t) : "tidak dihitung"],
        ["", "Operasional per hari", a.ops.filter(o => o[1]).map(o => esc(o[0].split(" (")[0])).join(", "), rp(a.harian)],
        ["", "Operasional selama siaga", `${rp(a.harian)} × ${fmt(a.hari)} hari (${x.jenis === "permanen" ? "posko permanen: satu musim" : "posko sementara"})`, rp(a.op)],
        ["", "Logistik pengungsi", `${fmt(a.ungsi)} orang × ${fmt(a.hariU)} hari × ${rp(A.biayaUngsi)} (beras, lauk, air, dapur)`, rp(a.logistik)],
        ["hasil", "Anggaran posko ini", "alat + operasional + logistik", rp(a.total)]]);
    },
    teknis: `<p>Fungsi <code>reguPosko</code>, <code>ungsiPosko</code>, <code>personel</code>, <code>anggaran</code> di halaman ini; daftar alat dan harga dari <code>param_banjir.json</code> (riset: <code>scripts/banjir/RISET-PARAMETER.md</code>).</p>
    ${rumus(`regu      = min(6, max(1, ⌈Awas + Siaga/2 + Waspada/4 + (rob ≥ Siaga ? 1 : 0)⌉))      posko tidak aktif: 1
pengungsi = max(${fmt(ASUMSI.minUngsi)}, bulat10(median per tahun (mengungsi ÷ kejadian) provinsi × max(1, Siaga + Awas) × faktor))
hari      = ${fmt(ASUMSI.hariSiaga)} hari untuk posko permanen, ${fmt(ASUMSI.hari)} hari untuk posko sementara
alat      = Σ jumlah × harga, tanpa kendaraan sewa dan logistik harian, × (1 − alat yang sudah ada %)
logistik  = pengungsi × min(hari mengungsi, hari) × biaya pengungsi per orang per hari
total     = alat + operasional harian × hari + logistik`)}
    ${tb(["Tingkat", "Dasar jumlah alat", "Kekuatan"], [["Provinsi", "median jumlah minimal Perka BNPB 17/2009 Bab III.B (33 provinsi)", "kuat"], ["Kabupaten", "turunan; Perka 17/2009 tidak punya tingkat kabupaten", "lemah"],
      ["Lapangan", "Perka 7/2008 per 100 pengungsi (hunian 3 m²/orang, air 7–15 L/orang/hari, 1 jamban per 20 orang) + kit evakuasi per regu (rekomendasi platform)", "kuat / rekomendasi"]])}
    <p>Uang harian petugas dari SBM 2026 (PMK 32/2025) untuk 25 provinsi yang ditemukan; sisanya memakai nilai cadangan. Dana Siap Pakai BNPB (helikopter) dihitung terpisah untuk provinsi yang punya posko Siaga/Awas.</p>`,
    batas: ["Sebagian besar harga alat masih estimasi dari pasar daring, belum dari e-Katalog LKPP atau SSH daerah.", "Lama mengungsi 7 hari dan biaya Rp35.000/orang/hari adalah asumsi turunan, bukan angka resmi.",
      "Jumlah orang per peran pos komando adalah rekomendasi platform; Perka 3/2016 tidak menetapkannya."]});

  /* ---------------------------------------------------------------- 13 */
  B.push({ik: "bobot", j: "Keputusan musim banjir", sub: "Empat paket kesiapsiagaan dibandingkan biaya dan manfaatnya",
    singkat: `Tab Keputusan membandingkan empat pilihan untuk satu musim: A seperti biasa, B peringatan dini + posko siaga, C ditambah pompa dan drainase, D ditambah kesiapan SAR dan logistik. Dampak dasar diambil dari riwayat BNPB (meninggal, mengungsi, rumah rusak per tahun). Karena banyak angka masih perkiraan, hitungan diulang ${fmt(Keputusan?.n || 2000)} kali dengan angka diacak dalam rentangnya. Sebuah langkah disarankan bila manfaat bersihnya positif di sedikitnya 70% hitungan.`,
    alur: [["d", "berkas", "Dampak per tahun", "riwayat BNPB provinsi"], ["d", "tabel", "Parameter", "nilai rendah–tengah–tinggi"], ["o", "dadu", "Ulangi " + fmt(Keputusan?.n || 2000) + " kali", "angka diacak tiap kali"],
      ["u", "centang", "Positif ≥ 70%?", "B dibanding A; C, D dibanding B"], ["h", "bobot", "Pilihan", "+ peringkat multikriteria"]],
    contoh: async () => {
      if (!Keputusan.d) await Keputusan.render(); if (!Keputusan.d) throw new Error("data keputusan belum tersedia");
      const K = Keputusan, r = K.nilai(K.prov), t = r.tengah, Mt = r.Y.mB + r.Y.mD;
      if (!r.P.prior.length) throw new Error("provinsi ini belum punya kejadian per kabupaten");
      return mtTangga(`${esc(r.P.nama)} · ${K.tahun === "harapan" ? "tahun rata-rata" : esc(K.tahun)}`, `Provinsi yang sedang dipilih di tab Keputusan. Hitungan acak diulang saat contoh ini dibuat, jadi peluangnya bisa beda 1–2 poin dari tab Keputusan.`, [
        ["in", "Dampak dasar per tahun", `${fmt(Math.round(r.Y.u))} mengungsi, ${fmt(Math.round(r.Y.r))} rumah rusak, rata-rata ${r.ys.length} tahun`, mtA(Mt) + " meninggal"],
        ["", "Biaya B per tahun", `${fmt(K.ews)} sirene + alat ukur air per kabupaten di ${r.P.prior.length} kabupaten, posko siaga, latihan evakuasi`, rp(t[1].biaya)],
        ["", "Nyawa yang diperkirakan terselamatkan", `cakupan ${mtP(r.P.cakupan)} kejadian × efek peringatan dini (asumsi lemah)`, mtA(t[1].nyawa) + " jiwa"],
        ["", "Manfaat B", "biaya pengungsi terhindar + nilai nyawa statistik", rp(t[1].manfaat)],
        ["", "Manfaat bersih B (nilai tengah)", "manfaat − biaya", rp(t[1].bersih)],
        ["", `Peluang manfaat bersih B positif`, `dari ${fmt(K.n)} hitungan acak`, mtP(r.mc.inkrPos[1])],
        mtCek(r.pakaiB, "B positif di ≥ 70% hitungan?", "syarat menyetujui B"),
        mtCek(r.pakaiC, "Tambahan C (pompa & drainase) positif di ≥ 70%?", `dibanding B: ${mtP(r.mc.inkrPos[2])}`),
        mtCek(r.pakaiD, "Tambahan D (SAR & logistik) positif di ≥ 70%?", `dibanding B: ${mtP(r.mc.inkrPos[3])}`),
        ["hasil", "Pilihan yang disarankan", "", `${OPSI_B[r.terbaik][0]} · ${esc(OPSI_B[r.terbaik][1])}`]]);
    },
    teknis: `<p>Objek <code>Keputusan</code> di halaman ini; parameter dari <code>param_banjir.json</code> ditambah asumsi halaman (<code>PAR_B</code>), format [tengah, rendah, tinggi, satuan, sumber, catatan].</p>
    ${rumus(`dampak    = rata-rata per tahun banjir + bandang + rob (BNPB/DIBI) provinsi; pilihan: rata-rata, tahun biasa, 3 tahun terberat, 2025
rumah     = rumah rusak × (porsi RB × (stimulan RB + huntara) + porsi RS × stimulan RS + sisa × stimulan RR)
pengungsi = mengungsi × hari mengungsi × biaya per orang per hari
nyawa     = meninggal × nilai nyawa statistik   (pilihan kebijakan: nol, rendah, tengah, tinggi)
biaya B   = kabupaten prioritas × (sirene × harga × (CRF + perawatan) + alat posko × CRF + petugas × hari × (konsumsi + uang harian) + latihan)
CRF(i, n) = i ÷ (1 − (1 + i)^−n)
manfaat bersih = biaya pengungsi terhindar + rumah terhindar + nyawa × nilai nyawa − biaya`)}
    ${rumus(`Tiap hitungan acak: satu tahun riwayat diambil acak; tiap parameter dari sebaran segitiga
x = rendah + √(u·(tinggi − rendah)·(tengah − rendah))      bila u < c,   c = (tengah − rendah)/(tinggi − rendah)
x = tinggi − √((1 − u)·(tinggi − rendah)·(tinggi − tengah))  selain itu
Setujui B bila P(manfaat bersih B > 0) ≥ 70%;  C dan D bila B disetujui dan P(tambahan terhadap B > 0) ≥ 70%`)}
    ${rumus(`Peringkat multikriteria (SMAA), pembanding saja:
kriteria = manfaat bersih tanpa nilai nyawa, nyawa terselamatkan, kekuatan bukti (A 1, B 0,35, C 0,2, D 0,2)
skor_j   = Σ w_k · (x_jk − min_k) ÷ (max_k − min_k);   w ~ Dirichlet(20 × bobot/100) lewat sampel Gamma, bawaan 40/30/30`)}`,
    batas: ["Efek peringatan dini pada kematian banjir di Indonesia belum punya studi kausal; angkanya dipinjam dari Bangladesh, Jerman, dan perbandingan antarnegara.", "Lama mengungsi dan pecahan rumah rusak berat/sedang/ringan adalah asumsi.",
      "Manfaat tanggul, isi rumah, usaha, infrastruktur, dan longsor tidak dihitung, jadi manfaat cenderung terlalu rendah.", "DIBI mencatat per kabupaten: satu banjir lintas kabupaten bisa terhitung lebih dari sekali."]});

  /* ---------------------------------------------------------------- 14 */
  B.push({ik: "alat", j: "Simulasi skenario", sub: "Bagaimana bila hujan lebih deras, tanah jenuh, sungai meluap, atau pasang tinggi",
    singkat: `Tab Simulasi menjalankan aturan yang sama persis dengan status harian, tetapi masukannya diubah: hujan dikali 1,5 atau 2, hujan 3 hari dipaksa minimal sekian mm, tanah dianggap jenuh, sungai dianggap mencapai banjir 5 atau 20 tahunan, atau pasang tinggi. Tanpa skenario, hasilnya harus sama dengan peta; tab itu memeriksanya sendiri dan menampilkan hasil pemeriksaannya.`,
    alur: [["d", "berkas", "Masukan hari ini", "sama dengan status harian"], ["o", "alat", "Ubah masukan", "bukan aturannya"], ["o", "centang", "Jalankan aturan", "bagian 4 dan 5"], ["h", "grafik", "Bandingkan", "status baru vs prakiraan"]],
    contoh: async () => {
      const k = mtKec("b"); if (!k) throw new Error("status.json kosong");
      const m = await mtMasukan(k), st = S.st.kec[k], d = st.b.indexOf(Math.max(...st.b)), x = mtHari(m, d), y = mtHari(m, d, 1.5), bh = m.b.banjir || 0;
      const l0 = levelBanjir(x.h3, bh, x.rk, x.im, x.cape, x.p3), l1 = levelBanjir(y.h3, bh, y.rk, y.im, y.cape, y.p3);
      return mtTangga(`${mtNamaKec(k)} · ${tglPendek(S.st.hari[d])} · hujan × 1,5`, "Kecamatan yang sama dengan contoh bagian 4.", [
        ["in", "Hujan 3 hari prakiraan", "", mtA(x.h3) + " mm"],
        ["", "Hujan 3 hari skenario", `${mtA(x.h3)} × 1,5`, mtA(y.h3) + " mm"],
        ["", "Hujan per jam skenario", `${mtA(x.im)} × 1,5`, mtA(y.im) + " mm/jam"],
        ["in", "Yang tidak berubah", "kerawanan InaRISK, kelas sungai, peluang ansambel", ""],
        ["", "Status prakiraan", "", pill(l0)],
        mtCek(l1 > l0, "Status naik?", "aturan bagian 4 dijalankan ulang dengan masukan skenario", "naik", "tetap"),
        ["hasil", "Status skenario", "", pill(l1)]]);
    },
    teknis: `<p>Objek <code>Simulasi</code> di halaman ini, aturan = <code>levelBanjir</code>/<code>levelLongsor</code> (salinan status.py baris per baris).</p>
    ${tb(["Skenario", "Yang diubah"], [["Hujan × 1,5 / × 2", "prakiraan harian dan hujan per jam hari ini dan sesudahnya dikali; peluang ansambel tetap"], ["Hujan ekstrem", "tiap jendela 3 hari minimal X mm"],
      ["Tanah jenuh", "hujan 7 hari minimal 200 mm dan kebasahan minimal 0,45 (hanya longsor yang berubah)"], ["Sungai Q5 / Q20", "kelas sungai minimal Siaga / Awas di kecamatan yang punya titik sungai ≤ 25 km, termasuk titik tanpa ambang"],
      ["Pasang tinggi", "<b>tambahan simulasi, bukan status.py</b>: kecamatan pesisir minimal Waspada, Siaga bila hujan 3 hari ≥ 50 mm. Pesisir = bahaya gelombang/abrasi InaRISK &gt; 0 atau ≤ 15 km dari titik rob"]])}
    <p>Perkiraan orang terpapar dan kebutuhan pengungsian di tab itu memakai rata-rata pengungsi dan terdampak per kejadian (DIBI) di provinsi, dan ditandai asumsi.</p>`,
    batas: ["Skenario mengubah masukan secara seragam; hujan yang bergeser tempat atau waktu tidak disimulasikan.", "Skenario pasang tinggi adalah aturan tambahan yang belum diuji terhadap kejadian.",
      "Hasil skenario bukan prakiraan: dipakai untuk latihan dan perencanaan."]});

  /* ---------------------------------------------------------------- 15 */
  B.push({ik: "tren", j: "Riwayat dan skor risiko", sub: "Skor 0–100 per kabupaten dan kecamatan dari kejadian 2008–2025",
    singkat: `Skor risiko menjawab "seberapa sering dan seberapa besar wilayah ini kena, dibanding wilayah lain se-Indonesia". Untuk banjir dan longsor ada empat bahan: berapa tahun wilayah itu berkejadian (40 poin), berapa banyak kejadiannya (25), apakah makin sering belakangan ini (15), dan kerawanan InaRISK (20). Untuk rob hanya tiga bahan riwayat dengan bobot 50/30/20, sama dengan skor karhutla. BNPB mencatat kejadian per kabupaten, jadi skor kecamatan = skor kabupaten disesuaikan dengan kerawanan kecamatan itu.`,
    alur: [["d", "berkas", "Kejadian per tahun", "BNPB/DIBI 2008–2025"], ["o", "hitung", "Empat bahan", "kekerapan, besaran, tren, InaRISK"], ["o", "bobot", "Jumlah berbobot", "40 + 25 + 15 + 20"], ["h", "urut", "Kelas", "10% teratas sangat tinggi"]],
    contoh: async () => {
      const R = await Riwayat.muat(), J = R.jenis.banjir, k = mtKec("b") || Object.keys(J.kec)[0], kb = k.split("|").slice(0, 2).join("|"), r = J.kab[kb];
      if (!r) throw new Error("kabupaten contoh tidak ada di riwayat.json");
      const n = J.tahun_cakup.length, W = J.bobot, kc = J.kec[k], hk = (await mtBahaya())[k]?.banjir ?? 0, sk = W.kekerapan * r.fK + W.besaran * r.fB + W.tren * r.fT + W.inarisk * r.h;
      return mtTangga(`Banjir · ${esc(/^Kota /.test(kb.split("|")[1]) ? kb.split("|")[1] : "Kab. " + kb.split("|")[1])} (${esc(namaProv(kb.split("|")[0]))})`, `Kabupaten tempat kecamatan contoh bagian 4. Tahun dinilai ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)} (${n} tahun).`, [
        ["", "Kekerapan", `berkejadian ${r.tahun} dari ${n} tahun = ${mtA(r.fK, 3)}; × ${W.kekerapan}`, mtA(W.kekerapan * r.fK)],
        ["", "Besaran", `ln(1 + ${fmt(r.total)} kejadian) ÷ ln(1 + ${fmt(J.maks)}, terbanyak se-Indonesia) = ${mtA(r.fB, 3)}; × ${W.besaran}`, mtA(W.besaran * r.fB)],
        ["", "Tren", `${J.tahun_baru[0]}–${J.tahun_baru.at(-1)} dibanding tahun sebelumnya, dibagi kenaikan nasional: × ${mtA(r.tren, 2)} → ${mtA(r.fT, 3)}; × ${W.tren}`, mtA(W.tren * r.fT)],
        ["", "Kerawanan InaRISK", `rata-rata indeks banjir kecamatannya ${mtA(r.h, 2)}; × ${W.inarisk}`, mtA(W.inarisk * r.h)],
        mtCek(Math.round(sk) === r.skor, "Jumlahnya sama dengan skor di berkas?", `${mtA(sk)} dibulatkan; riwayat.json ${r.skor}`, "sama", "berbeda"),
        ["hasil", "Skor kabupaten", KELAS_R[r.lv], fmt(r.skor)],
        kc && ["", `Skor ${mtNamaKec(k)}`, `${r.skor} × (0,4 + 0,6 × bahaya kecamatan ${mtA(hk, 2)}), kelas dinilai antarkecamatan`, `${fmt(kc[0])} · ${KELAS_R[kc[1]]}`]]);
    },
    teknis: `<p><code>scripts/banjir/riwayat.py</code>, setara skor riwayat karhutla.</p>
    ${rumus(`fK = tahun berkejadian ÷ tahun tercakup     (berkejadian: ≥ 1 kejadian untuk kab/kota, ≥ 10 untuk provinsi banjir & longsor)
fB = ln(1 + total kejadian) ÷ ln(1 + total terbesar di tingkat yang sama)
rasio = (rata-rata tahun terbaru + 1) ÷ (rata-rata tahun sebelumnya + 1);  tahun terbaru = 30% tahun tercakup terakhir
fT = (log2(rasio wilayah ÷ rasio nasional) + 1) ÷ 2, dipotong 0–1
fH = rata-rata indeks bahaya InaRISK kecamatan di wilayah itu
skor banjir/longsor = round(40·fK + 25·fB + 15·fT + 20·fH)        (= 50:30:20 karhutla × 0,8, ditambah 20 InaRISK)
skor rob            = round(50·fK + 30·fB + 20·fT)
skor kecamatan      = skor kabupaten × (0,4 + 0,6 × bahaya InaRISK kecamatan)
kelas: 10% teratas sangat tinggi, 10–30% tinggi, 30–60% sedang, sisanya rendah; skor sama selalu kelas sama`)}
    <p>Dibagi rasio nasional karena pencatatan DIBI sendiri naik tiap tahun (933 baris 2008, 5.202 baris 2021); tanpa itu hampir semua wilayah tampak "naik". Tahun tercakup = tahun penuh ≤ 2025 yang mencatat bahaya itu di ≥ 5 kab/kota (banjir & longsor 2008–2025; rob baru sejak 2020-an karena kategori "Banjir Rob" DIBI baru dipakai 2018+). Rob tidak punya skor kecamatan: lapisan gelombang & abrasi InaRISK bernilai 0 di hampir semua kota pantai. Permukaan peta riwayat: kejadian kabupaten per tahun dibagi ke kecamatan berbobot (0,1 + bahaya), lalu perkiraan tahun berkejadian = Σ (1 − e^−e) per sel 0,1°.</p>`,
    batas: ["Kejadian BNPB/DIBI bergantung pada laporan daerah; Jawa lebih lengkap, kejadian kecil sering tidak tercatat.", "Skor kecamatan meminjam riwayat kabupaten, jadi kecamatan aman di kabupaten rawan tetap mendapat skor cukup tinggi.",
      "Skor belum diuji terhadap kerugian atau luas genangan nyata."]});

  /* ---------------------------------------------------------------- 16 */
  B.push({ik: "kalender", j: "Kalender musim", sub: "Kapan banjir biasanya terjadi di tiap provinsi, per 10 hari",
    singkat: `Setahun dibagi 36 dasarian (10 harian). Untuk tiap provinsi dihitung dari tanggal kejadian DIBI 2008–2025: di dasarian mana saja kejadian banjir biasanya menumpuk. "Peluang" sebuah dasarian = porsi tahun yang dasarian itu termasuk sibuk (jumlah kejadiannya masuk 10% tertinggi provinsi itu). Dipisah antara tahun La Niña (musim hujan lebih basah) dan tahun biasa. Dasarian dengan peluang ≥ 30% menjadi periode siaga.`,
    alur: [["d", "berkas", "Tanggal kejadian", "DIBI 2008–2025"], ["o", "kalender", "Kelompokkan per dasarian", "36 per tahun"], ["o", "ukur", "Ambang sibuk", "persentil 90 provinsi itu"], ["h", "kalender", "Peluang & periode siaga", "≥ 30% = siaga"]],
    contoh: async () => {
      const R = await Riwayat.muat(), Mu = R.musim?.banjir || {}, k = mtKec("b"), p = k && Mu[k.split("|")[0]] ? k.split("|")[0] : Object.keys(Mu)[0];
      if (!p) throw new Error("kalender musim belum ada"); const o = Mu[p], i = dasKini(), th = R.musim.banjir_tahun || [];
      return mtTangga(`Banjir · ${esc(namaProv(p))} · ${DAS(i)}`, `Provinsi kecamatan contoh bagian 4. Kejadian ${th[0] ?? ""}–${th.at(-1) ?? ""}.`, [
        ["in", "Ambang dasarian sibuk", "persentil 90 jumlah kejadian semua dasarian provinsi ini", fmt(o.ambang) + " kejadian"],
        ["in", "Rata-rata kejadian dasarian ini", "per tahun", mtA(o.rata[i])],
        ["", "Peluang dasarian ini sibuk, semua tahun", "porsi tahun dengan kejadian ≥ ambang", mtP(o.p_semua[i])],
        ["", "Peluang di tahun La Niña", `tahun ${(R.la_nina || []).join(", ")}`, mtP(o.p_la_nina[i])],
        ["", "Peluang di tahun biasa", "", mtP(o.p_biasa[i])],
        mtCek(o.p_semua[i] >= .3, "Dasarian ini masuk periode siaga?", `perlu peluang ≥ 30%; di sini ${mtP(o.p_semua[i])}`),
        ["hasil", "Periode siaga provinsi ini", `puncak rata-rata: ${DAS(o.puncak)}`, Tren.siaga(o.p_semua)]]);
    },
    teknis: `<p><code>riwayat.py</code>, fungsi <code>musim</code> (sama persis dengan musim.py karhutla).</p>
    ${rumus(`dasarian = (bulan − 1) × 3 + min(2, ⌊(tanggal − 1)/10⌋)
ambang   = max(1, persentil 90 jumlah kejadian semua (tahun × 36 dasarian) provinsi itu)
peluang  = porsi tahun yang jumlah kejadian dasarian itu ≥ ambang  (dipisah: semua, La Niña, biasa)
periode siaga = busur terpendek di lingkaran 36 dasarian yang memuat semua dasarian berpeluang ≥ 30%`)}
    <p>Tahun La Niña (ONI NOAA CPC ≤ −0,5 pada musim hujan utama): 2010, 2011, 2020, 2021, 2022. Musim hujan melintasi tahun baru, karena itu periode siaga dicari sebagai busur di lingkaran, bukan rentang Januari–Desember.</p>`,
    batas: ["Tanggal kejadian DIBI adalah tanggal laporan; sebagian bergeser beberapa hari.", "Provinsi dengan sedikit kejadian tercatat punya kalender yang kasar.", "Hanya 5 tahun La Niña dalam data; peluang La Niña masih kasar."]});

  /* ---------------------------------------------------------------- 17 */
  B.push({ik: "mata", j: "Seberapa teruji: batasan menyeluruh", sub: "Apa yang sudah diuji, yang belum, dan yang masih asumsi",
    singkat: `Platform ini membantu memilih di mana bersiap lebih dulu; ia bukan peringatan resmi dan tidak menggantikan BMKG, BNPB, atau BPBD. Sebagian bagian sudah diuji terhadap data nyata (rob terhadap kejadian DIBI, model laut terhadap alat ukur pasang), sebagian baru diuji agar hitungan ulang sama dengan berkas, dan sebagian masih asumsi. Angka di bawah dihitung dari berkas hari ini.`,
    alur: [["u", "centang", "Uji otomatis", "aturan sebelum tiap jalan"], ["u", "tabel", "Uji ke kejadian", "rob terhadap DIBI"], ["u", "ukur", "Uji ke alat ukur", "pasang terhadap IOC"], ["h", "mata", "Sisanya asumsi", "ditandai di tiap tab"]],
    contoh: async () => {
      const cek = async (z, f) => { const k = mtKec(z); if (!k) return true; const m = await mtMasukan(k);
        return [0, 1, 2, 3].every(d => { const x = mtHari(m, d); return f(m, x) === S.st.kec[k][z][d]; }); };
      const sama = await cek("b", (m, x) => levelBanjir(x.h3, m.b.banjir || 0, x.rk, x.im, x.cape, x.p3)) && await cek("l", (m, x) => levelLongsor(x.h3, m.g.a7 || 0, m.b.longsor || 0, x.sm, x.im));
      await Posko.muat().catch(() => null); const Hg = Object.values(S.param?.harga || {}), est = Hg.filter(x => x[2]).length;
      return mtTangga("Keadaan hari ini", "", [
        ["in", "Titik sungai yang sudah punya ambang", `${fmt(M.titik_sungai_berambang)} dari ${fmt(M.titik_sungai)}`, mtP(M.titik_sungai_berambang / Math.max(1, M.titik_sungai))],
        ["in", "Titik rob yang sudah punya ambang", `${fmt(nRobAmb)} dari ${fmt(nRob)}`, mtP(nRobAmb / Math.max(1, nRob))],
        ["in", "Kejadian rob untuk menguji ambang", "DIBI, sejak arsip model", fmt(RV.kejadian_diuji)],
        Hg.length && ["in", "Harga alat yang masih estimasi", `${fmt(est)} dari ${fmt(Hg.length)} item`, mtP(est / Hg.length)],
        ["no", "Status banjir dan longsor sudah diuji balik ke kejadian BNPB?", "langkah berikutnya", "belum"],
        mtCek(sama, "Hitungan ulang di peramban sama dengan status.json?", "kecamatan contoh bagian 4 dan 5, empat hari; seluruh provinsi diperiksa di tab Simulasi", "sama", "berbeda"),
        ["hasil", "Cara memakai", "", "untuk prioritas, bukan peringatan resmi"]]);
    },
    teknis: `${h("Uji otomatis sebelum tiap jalan")}<p>Tiap skrip punya <code>uji()</code> berbasis assert yang dijalankan workflow sebelum data diambil, misalnya: hujan 3 hari 150 mm di bahaya 0,66 = Awas; 150 mm di bahaya 0,5 = Siaga; tanah basah tanpa hujan 7 hari tidak dianggap jenuh; ambang Gumbel dan kelas sungai; persentil, level, dan validasi rob.</p>
    ${h("Yang belum ada")}${ul(["Uji balik status banjir dan longsor terhadap kejadian BNPB per kecamatan/kabupaten.", "Hujan pengamatan (penakar BMKG, satelit IMERG/GSMaP); sekarang hujan 7 hari lalu adalah hujan model.",
      "Datum pasang lokal (BIG) dan penurunan tanah untuk rob.", "Waktu tempuh lewat jaringan jalan untuk posko.", "Harga resmi e-Katalog/SSH untuk alat bertanda estimasi."])}`,
    batas: ["Status adalah hitungan otomatis dari model global, bukan peringatan resmi; ikuti BMKG dan BPBD setempat.", "Ambang status banjir dan longsor sudah diuji balik terhadap kejadian DIBI 2016-2025 (data/validasi.json), tetapi dengan hujan ERA5 sebagai prakiraan sempurna dan kejadian yang kurang tercatat; skill tetap rendah.",
      "Model 28 km tidak melihat banjir drainase kota, sungai kecil, tanggul jebol, atau longsor sangat lokal.", "Riwayat BNPB/DIBI tidak lengkap dan lebih baik di Jawa; skor risiko dan pilihan posko mewarisi bias itu.",
      "Parameter keputusan (efek peringatan dini, lama mengungsi, harga alat) sebagian besar asumsi bertanda lemah."]});

  /* ---------------------------------------------------------------- gambaran besar */
  const SUMBER = [["hujan", "Open-Meteo", "hujan, hujan per jam, kebasahan tanah · 0,25°"], ["dadu", "ECMWF ansambel", "51 skenario hujan"], ["sungai", "GloFAS Copernicus", "debit sungai besar"],
    ["ombak", "Open-Meteo Marine + IOC", "muka laut, gelombang, alat ukur pasang"], ["perisai", "InaRISK BNPB", "peta bahaya banjir, longsor, gelombang"], ["berkas", "BNPB / DIBI", "kejadian 2008–sekarang"], ["lonceng", "BMKG", "peringatan cuaca, rob, gelombang"]];
  const PROSES = [["hitung", "Hujan per kecamatan", "3 hari ke depan, 7 hari lalu · bagian 2"], ["centang", "Status banjir & longsor", "Normal–Awas, 4 hari · bagian 4–5"], ["sungai", "Sungai dibanding sejarahnya", "banjir 2/5/20 tahunan · bagian 7"],
    ["ombak", "Rob dibanding sejarahnya", "persentil 95/99 · bagian 8–9"], ["tenda", "Posko dan anggaran", "lokasi, jenjang, biaya · bagian 11–12"], ["perisai", "Uji otomatis", "gagal uji = tidak terbit · bagian 1"]];
  const TAB = [["peta", "Peta", "status, hujan, sungai, rob, posko, riwayat"], ["insight", "Insight", "kesimpulan penting dalam grafik"], ["prakiraan", "Prakiraan", "4 hari per provinsi"], ["posko", "Posko", "lokasi, jenjang, dan anggaran"],
    ["daftar", "Wilayah siaga", "kecamatan berstatus, paling mendesak dulu"], ["provinsi", "Provinsi", "rekomendasi per provinsi"], ["rob", "Rob", "titik pantai dan peringatan BMKG"], ["sungai", "Sungai", "debit dan ambang"],
    ["tren", "Tren", "skor risiko dan kalender musim"], ["keputusan", "Keputusan", "empat paket kesiapsiagaan"], ["simulasi", "Simulasi", "bagaimana bila"], ["sarana", "Sarana", "kesiapan alat posko"]];
  const panah = `<div class="mt-panah" aria-hidden="true"><svg class="mt-ikon" viewBox="0 0 24 24">${MT_IKON.panah}</svg></div>`;
  const umur = M.dibuat ? (Date.now() - new Date(M.dibuat)) / 36e5 : null, BUKA = 3;

  $("#metode").innerHTML = `<div class="head"><div><h2>Metode & data</h2><p>Cara tiap angka dihitung, dijelaskan dengan bahasa sehari-hari dan contoh dari data hari ini. Rumus lengkap ada di "Algoritma inti" pada tiap bagian.</p></div></div>
  <span class="mt-lbl" style="margin-bottom:8px">Cara membaca platform ini</span>
  <div class="mt-peta">
    <div class="mt-kol"><h3><i>1</i>Data masuk</h3><p>Diambil otomatis dari penyedia resmi dan terbuka.</p>${SUMBER.map(([ik, b, s]) => `<div class="mt-li" style="--mtc:var(--mt-biru)">${mtIkon(ik)}<span><b>${b}</b><small>${s}</small></span></div>`).join("")}</div>
    ${panah}
    <div class="mt-kol"><h3><i>2</i>Diolah tiap hari 07.20 WIB</h3><p>Terakhir ${M.dibuat ? jamWIB(M.dibuat) : "–"}${umur != null ? ` (${mtA(umur, 0)} jam lalu)` : ""}.</p>${PROSES.map(([ik, b, s]) => `<div class="mt-li" style="--mtc:var(--mt-nila)">${mtIkon(ik)}<span><b>${b}</b><small>${s}</small></span></div>`).join("")}</div>
    ${panah}
    <div class="mt-kol"><h3><i>3</i>Dibaca di tab</h3><p>Klik untuk membuka tabnya.</p>${TAB.map(([k, b, s]) => `<button class="mt-li" data-buka="${k}" style="--mtc:var(--mt-hijau)">${mtIkon("mata")}<span><b>${b}</b><small>${s}</small></span></button>`).join("")}</div>
  </div>
  <span class="mt-lbl" style="margin-bottom:8px">Tiap metode, langkah demi langkah</span>
  ${B.map((s, i) => `<details class="mt-sek" data-i="${i}"${i === BUKA ? " open" : ""}><summary><span class="mt-nom">${mtIkon(s.ik)}</span><span class="mt-jd"><b>${i + 1}. ${s.j}</b><small>${s.sub}</small></span></summary>
    <div class="mt-isi">
      <div class="mt-singkat"><span class="mt-lbl">Singkatnya</span><p>${s.singkat}</p></div>
      ${mtAlur(s.alur)}
      <div class="mt-contoh" id="mtc${i}"><div class="mt-muat"><div class="spin"></div>Menghitung contoh…</div></div>
      <details class="mt-tek"><summary>Algoritma inti: rumus, konstanta, dan sumber</summary><div class="mt-tekisi">${s.teknis}</div></details>
      <div class="mt-batas"><span class="mt-lbl">Batasan</span><ul>${s.batas.map(x => `<li><span>${x}</span></li>`).join("")}</ul></div>
    </div></details>`).join("")}`;

  $("#metode").querySelectorAll("[data-buka]").forEach(b => b.onclick = () => bukaTab(b.dataset.buka));
  /* contoh dihitung saat bagian dibuka pertama kali */
  const isi = el => { if (el.dataset.ok) return; el.dataset.ok = 1; const i = +el.dataset.i, box = $("#mtc" + i);
    nanti(() => Promise.resolve().then(() => B[i].contoh()).then(html => box.innerHTML = html)
      .catch(e => box.innerHTML = `<span class="mt-lbl">Contoh dengan data hari ini</span><p class="mt-cat">Contoh belum bisa dihitung: ${esc(e.message || e)}.</p>`)); };
  $("#metode").querySelectorAll("details.mt-sek").forEach(el => { el.addEventListener("toggle", () => el.open && isi(el)); if (el.open) isi(el); });
}
const Metode = {render() { if (!$("#metode").dataset.ok) { $("#metode").dataset.ok = 1; renderMetode(); } }};
