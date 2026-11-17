"use strict";
/* /prediksi: tab Besok (tabel per kab, pil bencana, Perlu tindakan, pop-up, peta; besok_inti.js), Rapor (skor vs baseline), Dampak (paparan statis), Konfirmasi (POST /api/prediksi/konfirmasi).
   Data: data/prediksi.json, skor.json, ujibalik.json, kalibrasi.json, lalu.json (scripts/prediksi/*.py).
   $, fmt, esc, rb dari ../inti/format.js. Angka: format id-ID, peluang dibulatkan ke 5% (tidak ada presisi palsu). */
const PR = {dampak: null, jalan: null, d: null, skor: null, uji: null, kal: null, lalu: null, kalender: null, n: 60, tab: "besok", lap: undefined, geo: {}, kotor: new Set(), jadwal: false, baris: [], petaHari: null, hari: 1, pil: "ALL", tampil: "tabel", urut: null, lv: new Set(), KOL: {}};
const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"];
const ISPU = ["Baik/Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"];
const KODE_NAMA = {HJN: "Hujan", API: "Titik panas", BNJ: "Banjir", LSR: "Longsor", ASP: "Asap PM2,5", ROB: "Rob"};

const persen = p => p == null ? "–" : p < 0.05 ? "<5%" : p > 0.95 ? ">95%" : `${Math.round(p * 20) * 5}%`;
const mm = v => v == null ? "–" : v < 1 ? "<1 mm" : `±${fmt(Math.round(v))} mm`;
const jam = h => h == null ? "–" : `±${String(h).padStart(2, "0")}.00`;
const tglPanjang = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
const tgl = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta"});
// ["2014",..,"2020","2024","2025"] -> "2014–2020 dan 2024–2025": runtun bersambung digabung
const rentangTahun = th => {
  const r = [];
  for (const y of th.map(Number).sort((a, b) => a - b)) (r.length && r.at(-1)[1] === y - 1) ? r.at(-1)[1] = y : r.push([y, y]);
  const s = r.map(([a, b]) => a === b ? `${a}` : `${a}–${b}`);
  return s.length < 3 ? s.join(" dan ") : `${s.slice(0, -1).join(", ")}, dan ${s.at(-1)}`;
};
const angka3 = v => v == null ? "–" : fmt(Math.round(v * 1000) / 1000);
const angka4 = v => v == null ? "–" : fmt(Math.round(v * 10000) / 10000);
const kol = (kode, r, c) => r ? r[PR.d.kode[kode].kol.indexOf(c)] : null;

function pil(v) {
  /* v = [vonis, n, bss_klim, terkalibrasi] dari prediksi.json kode.vonis */
  if (!v) return "";
  const kls = v[0] === "mengalahkan baseline" ? "ok" : v[0] === "belum teruji" ? "abu" : "buruk";
  const t = v[0] === "belum teruji" ? `belum teruji${v[1] ? ` (n ${fmt(v[1])})` : ""}` : `${v[0]}, n ${fmt(v[1])}`;
  return `<span class="pr-pil ${kls}" title="Rapor ketepatan prakiraan ini">${esc(t)}${v[3] ? ", terkalibrasi" : ""}</span>`;
}

const sumberTeks = kode => { const k = PR.d.kode[kode]; return k ? `Sumber: ${k.sumber}; terbit ${tgl(k.terbit)}; dibekukan ${jamWIB(k.dibuat)}` : ""; };
const sumber = kode => {
  const k = PR.d.kode[kode];
  return k ? `<span class="pr-src" title="Dibekukan ${esc(jamWIB(k.dibuat))}">Sumber: ${esc(k.sumber)}; terbit ${esc(tgl(k.terbit))}</span>` : "";
};

const ribu = v => rb(v).replace(/ rb$/, " ribu").replace(/ jt$/, " juta");
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const JENIS_KAL = {banjir: "Banjir", longsor: "Longsor", cuaca: "Cuaca ekstrem", karhutla: "Karhutla"};
const pk = p => p == null ? "–" : p < 0.05 ? "<5%" : `${Math.round(p * 20) * 5}%`;

/* Kalender risiko (kalender_risiko.json): referensi kedua dari logbook Pusdalops, bukan pengganti klimatologi di rapor. */
function barisKal(k, n) {
  const kk = PR.kalender?.kab[k.id], hari = PR.d.kode.HJN?.hari?.[n - 1];
  if (!kk || !hari) return "";
  const m = +hari.slice(5, 7) - 1;
  const isi = ["banjir", "longsor", "karhutla"].filter(j => kk[j].ada[m] > 0).sort((a, b) => kk[b].ada[m] - kk[a].ada[m])
    .map(j => `${JENIS_KAL[j].toLowerCase()} di ${fmt(kk[j].ada[m])} dari ${fmt(PR.kalender.n_tahun)} tahun${kk[j].kecil ? " (sampel kecil)" : ""}`).join(", ");
  if (!isi) return "";
  return `<div class="pr-b"><span class="pr-lab" data-k="KAL" title="${esc(PR.kalender.metode)}">Riwayat ${esc(BULAN[m])}</span><span>${isi} <span class="pr-pil abu">logbook Pusdalops</span></span></div>`;
}

/* ===== Tab Besok (BS-5, BS-6): tabel satu kab satu baris, pil bencana, Perlu tindakan, pop-up rincian, peta. Fungsi murni: besok_inti.js (window.Besok). ===== */
const B = window.Besok;
const tundaBerat = f => window.nanti ? window.nanti(f) : f();
const svgI = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.split("|").map(x => `<path d="${x}"/>`).join("")}</svg>`;
const IK_BC = {
  ALL: "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z", HJN: "M7 16a4 4 0 0 1-.5-7.9A5.5 5.5 0 0 1 17 7a4.5 4.5 0 0 1 .5 9|M8 19l1-2|M12 19l1-2|M16 19l1-2",
  BNJ: "M3 15c2 0 2-1.5 4.5-1.5S10 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15|M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2.5-1.5 4.5-1.5S19 19 21 19|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z",
  LSR: "M3 20h18|M5 20l5-9 3 5 2-3 4 7|M9 7l2-3 2 3", API: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  ASP: "M6 17a4 4 0 0 1-.5-7.9A5.5 5.5 0 0 1 16 8a4.5 4.5 0 0 1 2 8.5|M5 20h10|M9 17h10", LAUT: "M3 12c2 0 2-2 4.5-2S10 12 12 12s2.5-2 4.5-2S19 12 21 12|M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 7c2 0 2-2 4.5-2S10 7 12 7s2.5-2 4.5-2S19 7 21 7",
  CEX: "M3 8h11a3 3 0 1 0-3-3|M3 12h16a3 3 0 1 1-3 3|M3 16h8"
};
const KOLS = [["nama", "Kab/kota"], ["jiwa", "Jiwa"], ["HJN", "Hujan"], ["BNJ", "Banjir"], ["LSR", "Longsor"], ["API", "Titik panas"], ["ASP", "Asap"], ["GEL", "Gelombang"], ["ROB", "Rob"], ["CEX", "Angin"]];
const VONIS_KOL = {HJN: "p20", API: "p", BNJ: "ps", LSR: "ps"};
const KELAS_GEL = ["di bawah 1,25 m", "1,25 sampai di bawah 2,5 m", "2,5 sampai di bawah 4 m", "4 m ke atas"];
const KELAS_CEX = ["di bawah ambang 46 km/jam", "angin kencang (46 km/jam ke atas)", "setara Beaufort 8 (63 km/jam ke atas)", "setara Beaufort 10 (89 km/jam ke atas)"];
const tglSingkat = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
Object.assign(KODE_NAMA, {GEL: "Gelombang", CEX: "Angin"});

const daftarKab = () => {
  const q = $("#cari").value.trim().toLowerCase(), p = $("#prov").value;
  return PR.d.kab.filter(k => (!p || k.prov === p) && (!q || k.nama.toLowerCase().includes(q)));
};

/* isi satu sel: {lv, a (angka utama), b (satuan/keterangan kecil)}; null = tidak ada data */
function selIsi(kode, k, n) {
  const r = k[kode]?.[n - 1], lv = B.levelSel(kode, PR.KOL, r);
  if (lv == null) return null;
  const c = g => kol(kode, r, g);
  switch (kode) {
    case "HJN": return {lv, a: c("tot") < 1 ? "<1" : fmt(Math.round(c("tot"))), b: "mm"};
    case "API": return {lv, a: persen(c("p")), b: ""};
    case "ASP": return {lv, a: fmt(Math.round(c("pm"))), b: "µg/m³, " + ISPU[c("kat")]};
    case "GEL": return {lv, a: fmt(c("hs")), b: "m"};
    case "ROB": return {lv, a: c("lewat") ? "lewat p95" : "di bawah p95", b: ""};
    case "CEX": return {lv, a: fmt(Math.round(c("emb"))), b: "km/jam"};
    default: return {lv, a: LEVEL[lv], b: ""};   // BNJ, LSR
  }
}
const sel = (kode, k, n) => {
  const s = selIsi(kode, k, n);
  return s ? `<td class="pr-s pr-l${s.lv}"><b>${esc(s.a)}</b>${s.b ? ` <small>${esc(s.b)}</small>` : ""}</td>` : '<td class="pr-s pr-n">–</td>';
};

function ujiPil(kode, n) {
  if (!PR.d.kode[kode]) return '<span class="pr-pil abu" title="Belum ada data untuk bencana ini">belum ada data</span>';
  const v = VONIS_KOL[kode] && PR.d.kode[kode].vonis?.[`${VONIS_KOL[kode]}|${n}`];
  if (!v) return '<span class="pr-pil abu" title="Menunggu sumber pengamatan: tidak dinilai lawan model sendiri">belum teruji</span>';
  const ket = `${esc(v[0])}, n ${fmt(v[1])}${v[3] ? ", terkalibrasi" : ""}`;
  if (v[0] === "mengalahkan baseline") return `<span class="pr-pil ok" title="${ket}">teruji</span>`;
  if (v[0] === "belum teruji") return `<span class="pr-pil abu" title="${ket}">belum teruji</span>`;
  return `<span class="pr-pil buruk" title="${ket}">belum unggul</span>`;
}

/* ---- bilah kendali ---- */
function buatKendali() {
  const hj = PR.d.kode.HJN || Object.values(PR.d.kode)[0], nm = ["Besok", "Lusa", "H+3"];
  $("#hariSeg").innerHTML = hj.hari.map((h, i) => `<button type="button" data-n="${i + 1}" aria-pressed="${i === 0}" title="${esc(tgl(h))}">${nm[i] || "H+" + (i + 1)} <small>${esc(tglSingkat(h))}</small></button>`).join("");
  $("#pilBar").innerHTML = Object.keys(B.PIL).map(p => `<button type="button" class="pr-pb" data-pil="${p}" aria-pressed="${p === PR.pil}" title="Kab/kota level Siaga atau Awas">${svgI(IK_BC[p])}<span>${esc(B.PIL_NAMA[p])}</span><b class="pr-pn">0</b></button>`).join("");
  $("#petaPil").innerHTML = Object.keys(B.PIL).map(p => `<option value="${p}">${esc(B.PIL_NAMA[p])}</option>`).join("");
  if (typeof PilihCantik !== "undefined") { PilihCantik.hias($("#prov")); PilihCantik.hias($("#petaPil")); PilihCantik.pasang(); }
}
function chromeKendali() {   // bagian urgent: hanya atribut, tanpa menggambar ulang
  $("#hariSeg").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.n === PR.hari)));
  $("#tampilSeg").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === PR.tampil)));
  $("#pilBar").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pil === PR.pil)));
  if ($("#petaPil").value !== PR.pil) $("#petaPil").value = PR.pil;
  document.querySelectorAll("#tabelBesok thead th[aria-sort]").forEach(th => { const u = PR.urut; th.setAttribute("aria-sort", u && th.dataset.kol === u.kol ? (u.arah === 1 && u.kol !== "nama" || u.arah === -1 && u.kol === "nama" ? "descending" : "ascending") : "none"); });
}
function angkaPilBar(dk, n) {
  for (const b of $("#pilBar").querySelectorAll("button")) b.querySelector(".pr-pn").textContent = fmt(B.angkaPil(dk, PR.KOL, n, b.dataset.pil));
}

/* ---- Perlu tindakan ---- */
function gambarWaspada(dk, n) {
  const ids = new Set(dk.map(k => k.id)), kb = Object.fromEntries(PR.d.kab.map(k => [k.id, k])), atr = Object.fromEntries(PR.d.aturan.map(a => [a.id, a]));
  const per = {};
  for (const x of PR.d.waspada.filter(x => x.tenggang === n && ids.has(x.kab))) (per[x.aturan] ||= []).push(x);
  const isi = Object.entries(per).map(([id, xs]) => {
    const a = atr[id], jiwa = xs.reduce((s, x) => s + (x.dampak.jiwa || 0), 0), ada = xs.some(x => x.dampak.jiwa != null);
    const ungsi = xs.reduce((s, x) => s + (x.dampak.kebutuhan?.mengungsi || 0), 0);
    const syarat = [...(a.semua || []), ...(a.salah_satu || [])].map(s => esc(s.sumber)).join(a.salah_satu ? " atau " : "; ");
    xs.sort((p, q) => (q.dampak.jiwa || 0) - (p.dampak.jiwa || 0));
    const rinci = xs.slice(0, 40).map(x => {
      const d = x.dampak, e = d.kebutuhan;
      return `<tr><td>${esc(kb[x.kab]?.nama)}</td><td class="n">${d.jiwa != null ? ribu(d.jiwa) : "–"}</td><td class="n">${d.sekolah != null ? fmt(d.sekolah) : "–"}</td><td class="n">${d.faskes != null ? fmt(d.faskes) : "–"}</td><td class="n">${d.murid ? ribu(d.murid) : "–"}</td>
        <td>${e ? `mengungsi ${ribu(e.mengungsi)}; air ${ribu(e.air_l)} L/hari; hunian ${ribu(e.hunian_m2)} m²; ${ribu(e.jamban)} jamban; ${ribu(e.kkal)} kkal/hari` : "–"}</td></tr>`;
    }).join("");
    return `<details class="pr-w" title="Jika: ${esc(syarat.replace(/<[^>]*>/g, ""))}"><summary><b>${esc(a.maka)}</b>, ${fmt(xs.length)} kab/kota${ada ? `, ${ribu(jiwa)} jiwa terpapar` : ""}${ungsi ? `, perkiraan mengungsi ${ribu(ungsi)}` : ""} <span class="pr-pil abu">perkiraan, belum diuji balik</span></summary>
      <p class="pr-kecil">Jika: ${syarat}. ${a.paparan?.sumber ? `Paparan: ${esc(a.paparan.sumber)}. ` : ""}${a.catatan ? esc(a.catatan) + " " : ""}Kebutuhan: ${esc(PR.d.sphere.sumber)}.</p>
      <div class="tw ex-tabel"><table><thead><tr><th>Kab/kota</th><th>Jiwa</th><th>Sekolah</th><th>Faskes</th><th>Murid</th><th>Kebutuhan Sphere (perkiraan)</th></tr></thead><tbody>${rinci}</tbody></table></div>
      ${xs.length > 40 ? `<p class="pr-kecil">dan ${fmt(xs.length - 40)} lainnya; persempit dengan saring provinsi atau cari.</p>` : ""}</details>`;
  }).join("") || '<p class="pr-kosong">Tidak ada aturan yang terpicu</p>';
  $("#waspada").innerHTML = `<section class="ex ex-std"><header class="ex-hd"><div class="ex-jd"><h3 class="pr-h">${svgI("M12 3l9 16H3z|M12 10v4|M12 17v.5")}Perlu tindakan</h3></div></header><div class="ex-bd">${isi}</div></section>`;
}

/* ---- tabel ---- */
function urutTabel(dk, n) {
  const u = PR.urut;
  return u ? B.urutKolom(dk, PR.KOL, n, u.kol, u.arah, PR.pil) : B.urutBawaan(dk, PR.KOL, n, PR.pil);
}
const KODE_SEL = ["HJN", "BNJ", "LSR", "API", "ASP", "GEL", "ROB", "CEX"];
const barisHtml = (daftar, n) => daftar.map(k => `<tr tabindex="0" data-id="${esc(k.id)}" title="Buka rincian ${esc(k.nama)}"><td class="pr-nm"><b>${esc(k.nama)}</b><small>${esc(k.pn)}</small></td><td class="n">${ribu(k.jiwa)}</td>${KODE_SEL.map(c => sel(c, k, n)).join("")}</tr>`).join("");
function infoLagi() {
  $("#lagi").hidden = PR.baris.length <= PR.n;
  $("#lagi").textContent = `Tampilkan lagi (${fmt(PR.baris.length - PR.n)} tersisa)`;
}
function gambarTabel(dk, n) {
  const baris = PR.baris = urutTabel(dk, n), u = PR.urut;
  const kepala = KOLS.map(([id, nama]) => {
    const as = u && u.kol === id ? ((u.arah === 1) === (id !== "nama") ? "descending" : "ascending") : "none";
    return `<th data-kol="${id}" aria-sort="${as}"${id === "nama" || id === "jiwa" ? "" : ` class="pr-ck"`}><button type="button" data-kol="${id}" title="Urutkan menurut ${esc(nama.toLowerCase())}${PR.d.kode[id] ? `. ${esc(sumberTeks(id))}` : ""}">${esc(nama)}<i class="pr-ar" aria-hidden="true"></i></button>${id === "nama" || id === "jiwa" ? "" : ujiPil(id, n)}</th>`;
  }).join("");
  const isi = barisHtml(baris.slice(0, PR.n), n);
  $("#tabelBesok").innerHTML = `<div class="tw ex-tabel"><table class="pr-tb"><thead><tr>${kepala}</tr></thead><tbody>${isi || `<tr><td colspan="10" class="pr-kosong">Tidak ada kab/kota yang cocok</td></tr>`}</tbody></table></div>`;
  infoLagi();
  $("#jmlTabel").textContent = `${fmt(baris.length)} kab/kota`;
}
function tambahBaris(n) {   // "Tampilkan lagi": hanya menambah baris, kepala dan baris lama tidak dibangun ulang
  $("#tabelBesok tbody").insertAdjacentHTML("beforeend", barisHtml(PR.baris.slice(PR.n - 60, PR.n), n));
  infoLagi();
}

/* satu jadwal render berpenjaga: klik beruntun menggabung bendera, render sekali sesudah frame tercat.
   bendera: data (hari/provinsi/cari), tabel (pil/urut/tampilan), lagi (tambah baris), peta (paint/filter/angka level) */
function gambarNanti(...bendera) {
  bendera.forEach(b => PR.kotor.add(b));
  if (PR.jadwal) return;
  PR.jadwal = true;
  if (PR.tampil === "tabel" && !(PR.kotor.size === 1 && PR.kotor.has("lagi"))) $("#tabelBesok").setAttribute("aria-busy", "true");
  tundaBerat(() => {
    PR.jadwal = false;
    const F = PR.kotor; PR.kotor = new Set();
    if (!PR.d) return;
    const n = PR.hari, dk = daftarKab();
    $("#kartuTabel").hidden = PR.tampil !== "tabel"; $("#kartuPeta").hidden = PR.tampil !== "peta"; $(".pr-lagi").hidden = PR.tampil !== "tabel";
    chromeKendali();
    if (F.has("data")) { angkaPilBar(dk, n); gambarWaspada(dk, n); }
    if (PR.tampil === "tabel") {
      if (F.has("data") || F.has("tabel")) gambarTabel(dk, n);
      else if (F.has("lagi")) tambahBaris(n);
      $("#tabelBesok").removeAttribute("aria-busy");
    } else gambarPetaBesok(dk, n);
    $("#lagi").removeAttribute("aria-busy");
  });
}
const gambarBesok = () => gambarNanti("data", "tabel");

/* ---- pop-up rincian ---- */
function bukaRincian(id, dari) {
  const k = PR.d.kab.find(x => x.id === id), n = PR.hari;
  if (!k) return;
  const v = (kode, c) => PR.d.kode[kode]?.vonis?.[`${c}|${n}`], baris = [];
  const lab = kd => `<span class="pr-lab" data-k="${kd}" title="${esc(sumberTeks(kd))}">${esc(KODE_NAMA[kd])}</span>`;
  const h = k.HJN?.[n - 1];
  if (h) {
    const [p1, p20, p50, tot, mulai, lama, , m] = ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "m"].map(c => kol("HJN", h, c));
    const kapan = mulai == null ? "tidak ada jam hujan ≥0,5 mm" : `mulai ${esc(jam(mulai))} WIB, lama ±${fmt(lama)} jam, total ${mm(tot)}`;
    baris.push(`<div class="pr-b">${lab("HJN")}<span>${kapan}<br>peluang ≥1 mm ${persen(p1)}, ≥20 mm ${persen(p20)}, ≥50 mm ${persen(p50)}
      ${m ? "" : '<span class="pr-pil abu" title="Tanpa ansambel: skor kasar dari jumlah hujan deterministik">skor kasar</span>'} ${pil(v("HJN", "p20"))}</span></div>`);
  }
  const a = k.API?.[n - 1];
  if (a) baris.push(`<div class="pr-b">${lab("API")}<span>peluang ≥1 titik ${persen(kol("API", a, "p"))} (${fmt(kol("API", a, "d"))} dari 3 hari terakhir bertitik panas) ${pil(v("API", "p"))}</span></div>`);
  for (const kd of ["BNJ", "LSR"]) {
    const r = k[kd]?.[n - 1];
    if (r) baris.push(`<div class="pr-b">${lab(kd)}<span>${LEVEL[kol(kd, r, "lv")]}${kol(kd, r, "ps") != null ? `, peluang Siaga ${persen(kol(kd, r, "ps"))}` : ""} ${pil(v(kd, "ps"))}</span></div>`);
  }
  const s = k.ASP?.[n - 1];
  if (s) baris.push(`<div class="pr-b">${lab("ASP")}<span>PM2,5 ±${fmt(kol("ASP", s, "pm"))} µg/m³, ${ISPU[kol("ASP", s, "kat")]} <span class="pr-pil abu">belum teruji</span></span></div>`);
  const g = k.GEL?.[n - 1];
  if (g && PR.KOL.GEL) baris.push(`<div class="pr-b">${lab("GEL")}<span>tinggi gelombang maksimum ${fmt(kol("GEL", g, "hs"))} m, ${KELAS_GEL[kol("GEL", g, "lv")]} (kategori BMKG) <span class="pr-pil abu">belum teruji</span></span></div>`);
  const r = k.ROB?.[n - 1];
  if (r) baris.push(`<div class="pr-b">${lab("ROB")}<span>${kol("ROB", r, "lewat") ? "muka laut melewati p95" : "di bawah p95"}, sel ${fmt(kol("ROB", r, "sel"))} <span class="pr-pil abu">belum teruji</span></span></div>`);
  const c = k.CEX?.[n - 1];
  if (c && PR.KOL.CEX) baris.push(`<div class="pr-b">${lab("CEX")}<span>embusan maksimum ${fmt(kol("CEX", c, "emb"))} km/jam, ${KELAS_CEX[kol("CEX", c, "lv")]} <span class="pr-pil abu">belum teruji</span></span></div>`);
  baris.push(barisKal(k, n));
  const atr = Object.fromEntries(PR.d.aturan.map(x => [x.id, x]));
  const dampak = PR.d.waspada.filter(x => x.kab === id && x.tenggang === n).map(x => {
    const d = x.dampak, e = d.kebutuhan;
    return `<li><b>${esc(atr[x.aturan]?.maka || x.aturan)}</b>${d.jiwa != null ? `: ${ribu(d.jiwa)} jiwa terpapar${d.sekolah != null ? `, ${fmt(d.sekolah)} sekolah, ${fmt(d.faskes)} faskes` : ""}${d.murid ? `, ${ribu(d.murid)} murid` : ""}` : ""}${e ? `; perkiraan mengungsi ${ribu(e.mengungsi)}` : ""} <span class="pr-pil abu">perkiraan</span></li>`;
  }).join("");
  const hari = PR.d.kode.HJN?.hari?.[n - 1];
  const dlg = $("#rincian");
  dlg.innerHTML = `<article class="ex ex-std"><header class="ex-hd"><div class="ex-jd"><h3>${esc(k.nama)} <small>${esc(k.pn)}, ${ribu(k.jiwa)} jiwa${hari ? `, ${esc(tgl(hari))}` : ""}</small></h3>
    <button type="button" class="pr-tutup" aria-label="Tutup" data-tutup>${svgI("M6 6l12 12|M18 6L6 18")}</button></div></header>
    <div class="ex-bd">${baris.join("") || `<p class="pr-kecil">Tidak ada prakiraan untuk ${esc(hari ? tgl(hari) : "hari ini")}.</p>`}${dampak ? `<div class="pr-b"><span class="pr-lab" data-k="DMP">Dampak</span><ul class="pr-dm">${dampak}</ul></div>` : ""}</div></article>`;
  PR.dari = dari || document.activeElement;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector("[data-tutup]").focus({preventScroll: true});
}

/* ---- peta (BS-6): MapLibre dimuat malas, satu sumber GeoJSON, ganti bencana/hari = perbarui properti dan paint ---- */
function isiLevel(n) {
  for (const f of PR.fc.features) { const k = PR.kabId.get(f.properties.id); for (const p of Object.keys(B.PIL)) f.properties["l_" + p] = B.levelPil(k, PR.KOL, n, p); }
  PR.petaHari = n;
}
const GARIS_INDONESIA = [[94.8, -11.2], [141.2, 6.2]];
function warnaToken(v, cad) {   // token CSS -> "rgb(...)" yang dimengerti MapLibre (canvas menurunkan oklch ke piksel sRGB)
  try {
    const e = document.createElement("i"); e.style.color = `var(${v})`; document.body.append(e);
    const c = getComputedStyle(e).color; e.remove();
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const x = cv.getContext("2d", {willReadFrequently: true}); x.fillStyle = c; x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`;
  } catch { return cad; }
}
const ekspresiWarna = pil => ["match", ["get", "l_" + pil], 1, PR.warna[1], 2, PR.warna[2], 3, PR.warna[3], PR.warna[0]];
const filterPeta = () => PR.lv.size ? ["in", ["get", "l_" + PR.pil], ["literal", [...PR.lv]]] : ["has", "id"];

async function siapkanPeta() {
  if (PR.peta) return PR.peta;
  if (PR.memPeta) return PR.memPeta;
  return PR.memPeta = (async () => {
    $("#petaPesan").textContent = "Memuat peta…";
    await (await import("/inti/maplibre.js")).muatMapLibre();
    const provs = [...new Set(PR.d.kab.map(k => k.prov))];
    const geos = await Promise.all(provs.map(p => PR.geo[p] ||= fetch(`/geo/kabupaten/${p}.json`).then(r => r.ok ? r.json() : null).catch(() => null)));
    const kunci = new Map(PR.d.kab.map(k => [B.kunciGeo(k), k])), fitur = [];
    geos.forEach((g, i) => (g?.features || []).forEach(f => {
      const k = kunci.get(provs[i] + "|" + f.properties.kab);
      if (k) fitur.push({type: "Feature", properties: {id: k.id}, geometry: f.geometry});
    }));
    PR.warna = [warnaToken("--line", "rgb(228,232,240)"), warnaToken("--f1", "rgb(245,215,110)"), warnaToken("--f2", "rgb(240,140,46)"), warnaToken("--f3", "rgb(214,58,47)")];
    const peta = new maplibregl.Map({container: "petaKanvas", style: "https://tiles.openfreemap.org/styles/positron", bounds: GARIS_INDONESIA, fitBoundsOptions: {padding: 16}, minZoom: 3, maxZoom: 11, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
    PR.fc = {type: "FeatureCollection", features: fitur};
    PR.kabId = new Map(PR.d.kab.map(k => [k.id, k]));
    isiLevel(PR.hari);   // properti level terisi sebelum addSource: geometri diunggah sekali
    await new Promise(ok => peta.on("load", ok));
    peta.addSource("kab", {type: "geojson", data: PR.fc});
    peta.addLayer({id: "pr-fill", type: "fill", source: "kab", paint: {"fill-color": ekspresiWarna(PR.pil), "fill-opacity": 0.78}});
    peta.addLayer({id: "pr-garis", type: "line", source: "kab", paint: {"line-color": PR.warna[0], "line-width": 0.5}});
    const tip = $("#tip");
    peta.on("mousemove", "pr-fill", e => {
      const k = PR.kabId.get(e.features[0]?.properties.id); if (!k) return;
      const kd = B.PIL[PR.pil].map(c => { const s = selIsi(c, k, PR.hari); return s ? `${esc(KODE_NAMA[c])}: ${esc(s.a)}${s.b ? " " + esc(s.b) : ""}` : null; }).filter(Boolean);
      wadahTip(); tip.innerHTML = rapikanTip(`<b>${esc(k.nama)}</b> ${esc(k.pn)}<br>${kd.join("<br>") || "tidak ada data"}`); tip.classList.remove("kartu"); tip.classList.add("on");
      peta.getCanvas().style.cursor = "pointer";
    });
    peta.on("mouseleave", "pr-fill", () => { tip.classList.remove("on"); peta.getCanvas().style.cursor = ""; });
    peta.on("click", "pr-fill", e => { const id = e.features[0]?.properties.id; if (id) bukaRincian(id, $("#petaKanvas")); });
    PR.peta = peta; $("#petaPesan").textContent = "";
    return peta;
  })().catch(e => { PR.memPeta = null; $("#petaPesan").textContent = "Peta gagal dimuat, coba muat ulang."; throw e; });
}

async function gambarPetaBesok(dk, n) {
  try { await siapkanPeta(); } catch { return; }
  const P = PR.peta;
  P.resize();
  if (PR.petaHari !== n) { isiLevel(n); P.getSource("kab").setData(PR.fc); }   // hanya bila hari berubah
  P.setPaintProperty("pr-fill", "fill-color", ekspresiWarna(PR.pil));
  P.setFilter("pr-fill", filterPeta());
  document.querySelectorAll("#petaLv button").forEach(b => { const l = +b.dataset.lv; b.setAttribute("aria-pressed", String(PR.lv.has(l))); b.querySelector("b").textContent = fmt(B.hitungLevel(dk, PR.KOL, n, PR.pil, l)); });
  const pv = $("#prov").value;
  if (pv !== PR.provPeta) {
    PR.provPeta = pv;
    const ring = [];
    if (pv) for (const f of PR.fc.features) if (PR.kabId.get(f.properties.id).prov === pv) { const kk = [f.geometry.coordinates]; (function s(a) { if (typeof a[0] === "number") ring.push(a); else a.forEach(s); })(kk); }
    if (ring.length) P.fitBounds([[Math.min(...ring.map(c => c[0])), Math.min(...ring.map(c => c[1]))], [Math.max(...ring.map(c => c[0])), Math.max(...ring.map(c => c[1]))]], {padding: 24, duration: 0});
    else P.fitBounds(GARIS_INDONESIA, {padding: 16, duration: 0});
  }
}

function tabelSkor(kode, g) {
  if (g.status !== "dinilai") return `<p class="pr-kecil">${esc(KODE_NAMA[kode])}: menunggu (${fmt(g.prakiraan || 0)} prakiraan tercatat). ${esc(g.alasan || "")}</p>`;
  const rows = g.grup.map(x => `<tr><td>${esc(x.ambang)}</td><td class="n">+${esc(x.tenggang)}</td><td>${esc(x.tahap)}</td><td class="n">${fmt(x.n)}</td>
    <td class="n">${angka3(x.brier_banding)}</td><td class="n">${angka3(x.brier_persistensi)}</td><td class="n">${angka3(x.brier_klimatologi)}</td>
    <td class="n">${x.pod == null ? "–" : persen(x.pod)}</td><td class="n">${x.far == null ? "–" : persen(x.far)}</td>
    <td class="n">${x.mae_mulai == null ? "–" : `±${fmt(Math.round(x.mae_mulai))} jam`}</td><td class="n">${x.mae_lama == null ? "–" : `±${fmt(Math.round(x.mae_lama))} jam`}</td>
    <td>${pil([x.vonis, x.n_banding])}</td></tr>`).join("");
  return `<h3>${esc(KODE_NAMA[kode])}</h3><div class="tw"><table><thead><tr><th>Ambang</th><th class="n">Tenggang</th><th>Tahap</th><th class="n">n</th>
    <th class="n">Brier model</th><th class="n">Brier persistensi</th><th class="n">Brier klimatologi</th><th class="n">POD</th><th class="n">FAR</th>
    <th class="n">Galat jam mulai</th><th class="n">Galat lama</th><th>Vonis</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* Model bayangan (lab adu model 2 Nov 2026): berdampingan dengan model lama dan baseline, pasangan kab-hari yang sama. Tidak mengganti apa pun. */
const pilAp = (v, n) => `<span class="pr-pil abu">${v === "belum teruji" ? "belum teruji" : v.startsWith("peringkat lebih") ? `AP unggul di ${fmt(n)} pasangan prospektif` : `AP belum unggul di ${fmt(n)} pasangan prospektif`}</span>`;
function bayanganRapor(b) {
  if (!b) return "";
  const nama = kd => b.model[kd]?.nama || kd;
  const rows = b.banding.map(x => `<tr><td>${esc(nama(x.kode))}</td><td class="n">+${esc(x.tenggang)}</td><td class="n">${fmt(x.n_banding)}</td>
    <td class="n">${angka4(x.brier_bayangan)}</td><td class="n">${x.lama ? angka4(x.brier_lama) : "tidak ada"}</td><td class="n">${angka4(x.brier_persistensi)}</td><td class="n">${angka4(x.brier_klimatologi)}</td>
    <td class="n">${angka3(x.ap_bayangan)}</td><td class="n">${x.lama ? angka3(x.ap_lama) : "tidak ada"}</td><td class="n">${angka3(x.ap_persistensi)}</td><td class="n">${angka3(x.ap_klimatologi)}</td>
    <td>${pil([x.vonis, x.n_banding])}</td><td>${pilAp(x.vonis_peringkat, x.n_banding)}</td></tr>`).join("");
  const info = Object.entries(b.model).map(([kd, m]) => `<li><b>${esc(m.nama)}</b> (${fmt(m.prakiraan)} prakiraan tercatat): ${esc(m.metode)}. Di lab: ${esc(m.uji_lab)}.</li>`).join("");
  return `<section class="card pad pr-sek"><h2>Model bayangan, diuji berdampingan</h2><p class="pr-kecil">${esc(b.catatan)} Brier lebih kecil dan AP (ketepatan peringkat) lebih besar = lebih baik. Vonis kiri memakai aturan yang sama dengan model lama (Brier lebih kecil dari persistensi dan klimatologi, n ≥ 30); vonis kanan memakai AP. Peluang bayangan belum dikalibrasi, jadi Brier dapat kalah oleh pergeseran laju kejadian sementara peringkatnya menang.</p>
    <ul class="pr-kecil">${info}</ul>${rows ? `<div class="tw"><table><thead><tr><th>Model</th><th class="n">Tenggang</th><th class="n">n pasangan</th><th class="n">Brier bayangan</th><th class="n">Brier model lama</th><th class="n">Brier persistensi</th><th class="n">Brier klimatologi</th>
    <th class="n">AP bayangan</th><th class="n">AP model lama</th><th class="n">AP persistensi</th><th class="n">AP klimatologi</th><th>Vonis (Brier)</th><th>Vonis (AP)</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="pr-kecil">Belum ada pasangan yang matang. Banjir dan longsor menunggu label DIBI 14 hari, karhutla dan cuaca ekstrem sesudah data harian terkumpul.</p>'}</section>`;
}

function gambarRapor() {
  const s = PR.skor, u = PR.uji, k = PR.kal;
  let h = `<div class="head"><div><h2>Rapor ketepatan</h2><p class="pr-kecil">Brier lebih kecil = lebih baik. Prakiraan harus lebih baik dari persistensi (besok = hari terakhir lengkap) dan klimatologi (frekuensi bulan yang sama). Vonis butuh ≥30 pasangan.</p></div></div>`;
  h += `<section class="card pad pr-sek"><h2>Prospektif</h2><p class="pr-kecil">${esc(s?.catatan || "skor.json belum ada")}</p>${s ? Object.entries(s.kode).filter(([kd]) => !kd.endsWith("_B")).map(([kd, g]) => tabelSkor(kd, g)).join("") : ""}</section>`;
  h += bayanganRapor(s?.bayangan);
  h += `<section class="card pad pr-sek"><h2>Uji balik retrospektif</h2>${u ? `<p class="pr-kecil">${esc(u.catatan)} Periode ${esc(u.periode.join(" s.d. "))}, ${fmt(u.n_terbit)} hari terbit.</p>${tabelSkor("HJN", u.kode.HJN)}` : '<p class="pr-kecil">Belum dijalankan.</p>'}</section>`;
  h += kalenderRapor();
  const ka = PR.aktif;
  h += `<section class="card pad pr-sek"><h2>Koreksi bulanan banjir</h2><p class="pr-kecil">${ka?.versi ? `Versi koreksi yang dipakai: ${ka.versi}${ka.setel ? `, disusun ulang ${tglPanjang(ka.setel)}` : ""}.` : "Belum ada koreksi yang lolos uji: prakiraan banjir memakai angka model apa adanya."} Disusun ulang sebulan sekali. Versi baru hanya dipakai bila lebih akurat pada hari-hari uji yang tidak ikut disusun. Prakiraan yang sudah terbit tidak berubah. Sumber: data kejadian DIBI BNPB dan logbook Pusdalops.</p></section>`;
  const kp = (k?.peluang || []).concat(k?.jumlah || []);
  h += `<section class="card pad pr-sek"><h2>Kalibrasi otomatis</h2><p class="pr-kecil">${esc(k?.aturan?.metode || "kalibrasi.json belum ada")}. Dipakai ${fmt(k?.ringkas?.dipakai || 0)}, ditolak ${fmt(k?.ringkas?.ditolak || 0)}, menunggu ${fmt(k?.ringkas?.menunggu || 0)}.</p>
    ${kp.length ? `<div class="tw"><table><thead><tr><th>Grup</th><th>Status</th><th class="n">n fit / uji</th><th>Alasan</th></tr></thead><tbody>${kp.map(x =>
      `<tr><td>${esc(x.kode || x.besaran)} ${esc(x.ambang ?? x.prov)} +${esc(x.tenggang)}</td><td>${esc(x.status)}</td><td class="n">${fmt(x.n_fit)} / ${fmt(x.n_uji)}</td><td>${esc(x.alasan)}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>`;
  $("#rapor").innerHTML = h;
}

function kalenderRapor() {
  const kal = PR.kalender;
  if (!kal) return '<section class="card pad pr-sek"><h2>Kalender risiko</h2><p class="pr-kecil">kalender_risiko.json belum ada.</p></section>';
  const id = idKab($("#kalKab")?.value || "") || PR.d.kab[0].id, kk = kal.kab[id], m0 = new Date(Date.now() + 7 * 36e5).getUTCMonth();
  const baris = !kk ? '<p class="pr-kecil">Kab/kota ini tidak ada di logbook (nama wilayah tidak cocok).</p>' : kal.jenis.map(j => {
    const x = kk[j], mx = Math.max(0.05, ...x.p.map(v => v || 0));
    return `<div class="pr-kal"><b>${JENIS_KAL[j]}</b> ${x.kecil ? '<span class="pr-pil buruk">sampel kecil</span>' : ""}<div class="pr-bars" role="img" aria-label="Peluang bulanan ${JENIS_KAL[j]}">${x.p.map((v, i) =>
      `<span class="pr-bar${i === m0 ? " ini" : ""}" tabindex="0" style="height:${Math.round((v || 0) / mx * 100)}%" title="${BULAN[i]}: ${fmt(x.ada[i])} dari ${fmt(kal.n_tahun)} tahun${x.ada[i] ? " ada kejadian" : ""}"></span>`).join("")}</div></div>`;
  }).join("");
  return `<section class="card pad pr-sek" id="kalender"><h2>Kalender risiko dari logbook</h2>
    <p class="pr-kecil">Referensi kedua, berdampingan dengan klimatologi: klimatologi di atas memakai pengamatan harian yang baru dikumpulkan sistem ini; kalender memakai logbook Pusdalops tahun penuh ${esc(rentangTahun(kal.tahun_penuh))} (${fmt(kal.n_tahun)} tahun), sehingga cocok untuk sisi dampak banjir dan longsor. Angka \"N dari ${fmt(kal.n_tahun)} tahun\" = tahun yang bulan itu punya minimal satu kejadian tercatat. Kab/kota dengan kurang dari ${fmt(kal.kecil_di_bawah)} kejadian ditandai sampel kecil. Belum diuji lawan prakiraan.</p>
    <label class="pr-kecil">Kab/kota <input id="kalKab" list="dKab" value="${esc(PR.d.kab.find(k => k.id === id).nama)}" autocomplete="off"></label>
    <div id="kalIsi">${baris}</div></section>`;
}

function laluKab() {
  const kab = idKab($("#kKab").value), t = $("#kTgl").value, hari = PR.lalu?.hari?.[t];
  if (!kab || !hari) { $("#kLalu").innerHTML = '<p class="pr-kecil">Tidak ada prakiraan tercatat untuk kab dan tanggal ini.</p>'; return; }
  const isi = Object.entries(hari).filter(([, v]) => v.kab[kab]).map(([kd, v]) => {
    const r = v.kab[kab], g = c => r[v.kol.indexOf(c)];
    const t = kd === "HJN" ? `hujan ${mm(g("tot"))}, peluang ≥20 mm ${persen(g("p20"))}` : kd === "API" ? `peluang titik panas ${persen(g("p"))}`
      : kd === "ASP" ? `PM2,5 ±${fmt(g("pm"))} µg/m³` : kd === "ROB" ? (g("lewat") ? "rob di atas p95" : "rob di bawah p95") : LEVEL[g("lv")];
    return `<li><b>${KODE_NAMA[kd]}</b>: ${esc(t)} (terbit ${esc(v.terbit)})</li>`;
  }).join("");
  $("#kLalu").innerHTML = `<p class="pr-kecil">Prakiraan sehari sebelumnya untuk tanggal ini:</p><ul>${isi}</ul>`;
}

const idKab = s => PR.d?.kab.find(k => k.nama === s || k.id === s)?.id;

async function kirim(e) {
  e.preventDefault();
  const kab = idKab($("#kKab").value);
  if (!kab) { $("#kHasil").textContent = "Pilih kab/kota dari daftar."; return; }
  const regu = $("#kRegu").value.trim();
  try { localStorage.setItem("prediksi.regu", regu); } catch {}
  const nilai = $("#kNilai").value === "" ? null : Number($("#kNilai").value);
  const body = {kab, tanggal: $("#kTgl").value, kode: $("#kKode").value, terjadi: +e.submitter.dataset.terjadi, nilai, catatan: $("#kCat").value.trim() || null};
  $("#kHasil").textContent = "Mengirim…";
  try {
    const r = await fetch("/api/prediksi/konfirmasi", {method: "POST", headers: {"content-type": "application/json", "x-kode-regu": regu}, body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({}));
    $("#kHasil").textContent = r.ok ? `Tersimpan: ${KODE_NAMA[body.kode]} ${body.terjadi ? "terjadi" : "tidak terjadi"} di ${$("#kKab").value}, ${tgl(body.tanggal)}.` : `Gagal: ${j.galat || j.error || r.status}`;
  } catch (x) { $("#kHasil").textContent = "Gagal mengirim: periksa sambungan."; }
}

/* Tab Paparan dampak: peta kab/kota satu provinsi per lapisan (dampak.json, jalan.json), dimuat sekali saat tab pertama dibuka.
   SKENARIO/PAPARAN, bukan prakiraan. Kelas dan warna di laporan_prov.js (LaporanProv.KELAS), peta digambar petaLap() di laporan_layar.js. */
const kelasPil = {Rendah: "ok", Sedang: "abu", Tinggi: "buruk", "Sangat tinggi": "buruk"};
const NAMA_LAP = {gempa: "Bahaya gempa", terisolir: "Desa langganan terisolir", jalan: "Ruas rawan putus jalan", genangan: "Genangan banjir terekam"};
const dpKab = id => [PR.dampak?.kab[id], PR.jalan?.kab[id]];
function teksDampak(l, id) {
  const [dp, jl] = dpKab(id), v = LaporanProv.nilaiDampak(l, dp, jl);
  if (v == null) return "tanpa data";
  if (l === "gempa") return `${dp.gempa.kelas}, skor ${fmt(dp.gempa.skor)} dari 100`;
  if (l === "terisolir") return `${fmt(v)} desa`;
  if (l === "genangan") return `${fmt(Math.round(v))} ha`;
  return `${fmt(v)} ruas${jl.way_rawan == null ? " (ruas tunggal)" : ""}`;
}
const baris2 = (lab, isi) => `<div class="dm-baris"><span>${lab}</span><span>${isi}</span></div>`;
function rincianDampak(id) {
  const k = PR.d.kab.find(x => x.id === id);
  if (!k) return "";
  const [dp, jl] = dpKab(id), g = dp?.gempa, f = dp?.genangan, t = dp?.terisolir;
  const b = [];
  b.push(baris2("Bahaya gempa", g ? `${g.kelas ? `<span class="pr-pil ${kelasPil[g.kelas] || "abu"}">${esc(g.kelas)}</span> ` : ""}skor ${fmt(g.skor)} dari 100` : "tanpa data"));
  if (g?.m_maks != null) b.push(baris2("Gempa tercatat", `magnitudo tertinggi ${fmt(g.m_maks)}, ${fmt(g.n_m5)} gempa M5+`));
  if (g?.kec_inarisk != null) b.push(baris2("InaRISK", `${fmt(g.kec_tinggi)} dari ${fmt(g.kec_inarisk)} kecamatan berindeks tinggi (indeks tertinggi ${g.inarisk_maks.toLocaleString("id-ID", {maximumFractionDigits: 2})} pada skala 0–1)`));
  b.push(baris2("Desa langganan terisolir", t ? `${fmt(t.desa)} desa, ${fmt(t.kejadian)} kejadian di logbook (batas atas, layak dicek)` : "tanpa data"));
  b.push(baris2("Genangan banjir terekam", f ? `${fmt(Math.round(f.tergenang_ha))} ha pada ${esc(tgl(f.acuan))} (cakupan radar ${fmt(f.cakupan_pct)}%)` : "tanpa data"));
  const rw = LaporanProv.ruasRawan(jl);
  b.push(baris2("Ruas rawan putus jalan", jl ? `${rw != null ? `${fmt(rw)} ruas${jl.way_rawan == null ? " (ruas tunggal)" : ""}` : "tanpa data"} dari ${fmt(jl.way)} way OSM jalan utama (${fmt(Math.round(jl.km_jaringan))} km), ${fmt(jl.jembatan_tunggal)} jembatan` : "tanpa data"));
  const tb = jl?.top?.length ? `<div class="tw ex-tabel dm-rinci"><table><thead><tr><th>Ruas</th><th>Kelas jalan</th><th>Jembatan</th><th>Jalan terpisah (km)</th><th>Peta</th></tr></thead><tbody>${jl.top.slice(0, 10).map(o =>
    `<tr><td>${esc(o.nama || "tanpa nama")}</td><td>${esc(LaporanProv.kelasJalan(o.kelas))}</td><td>${o.jembatan ? "ya" : "tidak"}</td><td class="n">${fmt(Math.round(o.km_terisolir * 10) / 10)}</td><td><a href="https://www.openstreetmap.org/way/${esc(o.way)}" target="_blank" rel="noopener">OSM ${esc(o.way)}</a></td></tr>`).join("")}</tbody></table></div>` : "";
  return kartuLap("Rincian", `Rincian ${esc(k.nama)}`, `<div class="dm-deret">${b.join("")}</div>${tb}`);
}
function kartuPeta(pt, l) {
  const baris = dataPeta(l);
  return kartuLap("Peta", `Peta paparan ${esc(NAMA_LAP[l].toLowerCase())}`, defsLap(pt) + petaLap(pt, {baris}, l, b => b.dv, b => teksDampak(l, b.id)));
}
function dataPeta(l) {
  const baris = PR.d.kab.filter(k => k.prov === PR.dm.prov).map(k => ({id: k.id, nama: k.nama, kunci: LaporanProv.kunci(k.nama), dv: LaporanProv.nilaiDampak(l, ...dpKab(k.id))}));
  PR.dm.baris = baris;
  return baris;
}
/* ganti lapisan pada provinsi yang sama: SVG tidak dibangun ulang, cukup fill + tooltip, legenda, judul, rincian */
function perbaruiPeta(l) {
  const K = LaporanProv.KELAS[l], per = Object.fromEntries(dataPeta(l).map(b => [b.id, b]));
  document.querySelectorAll("#dampakIsi use[data-id]").forEach(u => {
    const b = per[u.dataset.id], i = LaporanProv.kelas(b?.dv, K.batas);
    u.setAttribute("fill", i < 0 ? LaporanProv.TANPA : K.warna[i]);
    u.setAttribute("data-tip", `<b>${esc(b.nama)}</b><br>${esc(teksDampak(l, b.id))}`);
  });
  $("#dampakIsi .lp-leg").outerHTML = legendaLap(l);
  $("#dampakIsi .dm-grid h3").textContent = `Peta paparan ${NAMA_LAP[l].toLowerCase()}`;
}
async function gambarDampak() {
  const dm = PR.dm, {prov, l} = dm;
  document.querySelectorAll("#dLapisan button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === l)));
  history.replaceState(null, "", "#dampak/" + prov);
  $("#dampakIsi").setAttribute("aria-busy", "true");
  const pt = await petaProv(prov);
  (window.nanti || (f => f()))(() => {
    if (prov !== dm.prov || l !== dm.l) return;   // pemilih berganti selama menunggu
    $("#dampakIsi").removeAttribute("aria-busy");
    if (!pt) { $("#dampakIsi").innerHTML = '<p class="kosong">Batas kab/kota provinsi ini belum tersedia.</p>'; dm.rend = null; return; }
    if (dm.rend === prov && $("#dampakIsi .dm-grid")) {
      perbaruiPeta(l);
      if (!dm.baris.some(b => b.id === dm.id)) dm.id = dm.baris[0]?.id;
      $("#dmRinci").innerHTML = rincianDampak(dm.id);
    } else {
      const peta = kartuPeta(pt, l);
      if (!dm.id || !dm.baris.some(b => b.id === dm.id)) dm.id = dm.baris.reduce((a, b) => (b.dv ?? -1) > (a.dv ?? -1) ? b : a, dm.baris[0])?.id;
      $("#dampakIsi").innerHTML = `<div class="dm-grid">${peta}<div id="dmRinci">${rincianDampak(dm.id)}</div></div>`;
      dm.rend = prov;
    }
    tandaiDampak();
  });
}
function tandaiDampak() {
  document.querySelectorAll("#dampakIsi use[data-id]").forEach(u => u.classList.toggle("dm-pilih", u.dataset.id === PR.dm.id));
  const k = PR.d.kab.find(x => x.id === PR.dm.id);
  if (k) $("#dKabIn").value = k.nama;
}
function pilihKabDampak(id) {
  if (!id) return;
  const k = PR.d.kab.find(x => x.id === id);
  if (k.prov !== PR.dm.prov) { PR.dm.prov = k.prov; $("#dProv").value = k.prov; PR.dm.id = id; gambarDampak(); return; }
  PR.dm.id = id;
  $("#dmRinci").innerHTML = rincianDampak(id);
  tandaiDampak();
}
async function muatDampak() {
  if (PR.dampak === null) {
    $("#dampakIsi").innerHTML = '<p class="kosong">Memuat…</p>';
    [PR.dampak, PR.jalan] = await (PR.memDampak ||= Promise.all(["dampak.json", "jalan.json"].map(ambil)));
    PR.dampak ||= false;
    $("#dampakLabel").textContent = PR.dampak ? PR.dampak.label + (PR.jalan ? " " + PR.jalan.label : "") : "";
    $("#dampakSumber").innerHTML = PR.dampak ? Object.values(PR.dampak.sumber).map(esc).join("<br>") + `<br>Data: ${esc(jamWIB(PR.dampak.dibuat))}` + (PR.jalan ? "<br>" + esc(PR.jalan.sumber) + `<br>Data jalan: ${esc(tgl(PR.jalan.dibuat))}` : "") : "";
  }
  if (!PR.dampak) { $("#dampakIsi").innerHTML = '<p class="kosong">Data dampak belum tersedia.</p>'; return; }
  if (!PR.dm) {
    const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
    $("#dProv").innerHTML = prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("");
    const h = location.hash.match(/^#dampak\/(\d{2})$/)?.[1];
    PR.dm = {prov: h && prov.some(([k]) => k === h) ? h : PR.d.kab[0].prov, l: "gempa", id: null, baris: []};
    $("#dProv").value = PR.dm.prov;
  }
  gambarDampak();
}

function pilihTab(t) {
  PR.tab = t;
  document.querySelectorAll("#tabs button").forEach(b => b.dataset.tab === t ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  document.querySelectorAll(".db-nav-b[data-tab]").forEach(b => b.setAttribute("aria-current", String(b.dataset.tab === t)));
  const j = $("#prJudul"); if (j) j.textContent = document.querySelector(`#tabs button[data-tab="${t}"]`)?.textContent || "Prediksi";
  document.querySelectorAll("main .page").forEach(s => s.classList.toggle("on", s.id === "p-" + t));
  const tunda2 = f => window.nanti ? window.nanti(f) : f();   // isi berat sesudah satu frame tercat (chrome tab sudah berganti)
  if (t === "rapor" && !$("#rapor table, #rapor section")) tunda2(gambarRapor);
  if (t === "dampak") tunda2(muatDampak);
  if (t === "laporan") muatLaporan();   // laporan_layar.js; hash #laporan/<prov> diatur di sana
  else if (t === "tangga") muatTangga();   // tangga.js; hash #tangga/<id kab> diatur di sana
  else history.replaceState(null, "", t === "besok" ? "./" : "#" + t);
}

/* model A (data/kajian-bnpb/dashboard): panel seksi kiri dari tab, kepala halaman navy, kaki pembaruan data per sumber */
const IK_TAB = {besok: "M8 2v4|M16 2v4|M3 10h18|M5 4h14v17H5z", rapor: "M9 11l3 3 8-8|M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9", tangga: "M4 20h4v-4h4v-4h4V8h4", dampak: "M12 3l9 16H3z|M12 10v4|M12 17v.5", laporan: "M6 3h9l4 4v14H6z|M9 12h6|M9 16h6", konfirmasi: "M20 6 9 17l-5-5"};
const svgD = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d.split("|").map(x => `<path d="${x}"/>`).join("")}</svg>`;
function panelKiri() {
  if ($(".db-nav")) return;
  const tabs = [...document.querySelectorAll("#tabs button[data-tab]")];
  const kaki = Object.entries(PR.d.kode).map(([kd, k]) => `<div class="db-nav-pb"><i class="db-nav-dot"></i><span>${esc(KODE_NAMA[kd] || kd)}</span><b>${esc(tgl(k.terbit).replace(/^\w+, /, "").replace(/ (\w{3})\w*$/, " $1"))}</b></div>`).join("");
  document.body.insertAdjacentHTML("beforeend", `<aside class="db-nav pr-nav" aria-label="Seksi prediksi"><div class="db-nav-id"><b>Prediksi</b><small>Prakiraan per kab/kota sampai 3 hari</small></div>
    <p class="db-nav-g"><i>${svgD("M4 6h16|M4 12h16|M4 18h10")}</i><span>Isi halaman</span></p>
    <nav class="db-nav-isi">${tabs.map(b => `<button type="button" class="db-nav-b" data-tab="${b.dataset.tab}" aria-current="${b.hasAttribute("aria-current")}"><i class="db-nav-ik">${svgD(IK_TAB[b.dataset.tab] || IK_TAB.besok)}</i><span class="db-nav-t">${esc(b.textContent.trim())}</span></button>`).join("")}</nav>
    <div class="db-nav-kaki"><p class="db-nav-g"><i>${svgD("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7v5l3 2")}</i><span>Pembaruan data</span></p>${kaki}</div></aside>`);
  $(".pr-nav").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) pilihTab(b.dataset.tab); });
  document.querySelector("main").insertAdjacentHTML("afterbegin", `<h1 class="db-l1" id="prJudul">${esc(document.querySelector("#tabs button[aria-current]")?.textContent || "Prakiraan 3 hari")}</h1>`);
}

async function ambil(f) { try { const r = await fetch("data/" + f, {cache: "no-cache"}); return r.ok ? r.json() : null; } catch { return null; } }

async function mulai() {
  [PR.d, PR.skor, PR.uji, PR.kal, PR.lalu, PR.kalender, PR.aktif] = await Promise.all(["prediksi.json", "skor.json", "ujibalik.json", "kalibrasi.json", "lalu.json", "kalender_risiko.json", "kalibrasi_aktif.json"].map(ambil));
  if (!PR.d) { $("#tabelBesok").innerHTML = '<p class="kosong">Data prediksi belum tersedia.</p>'; $("#upd").textContent = "Data belum ada"; return; }
  $("#upd").textContent = "Diperbarui " + jamWIB(PR.d.dibuat);
  PR.KOL = Object.fromEntries(Object.entries(PR.d.kode).map(([kd, v]) => [kd, v.kol]));
  const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  $("#prov").insertAdjacentHTML("beforeend", prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join(""));
  buatKendali();
  pasangTip();
  $("#dKab").innerHTML = PR.d.kab.map(k => `<option value="${esc(k.nama)}">${esc(k.pn)}</option>`).join("");
  $("#ikTabel").title = "Batasan: " + (PR.d.batasan || []).join(" ");
  panelKiri();
  const kini = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  Object.assign($("#kTgl"), {max: kini, min: new Date(Date.now() + 7 * 36e5 - 7 * 864e5).toISOString().slice(0, 10), value: kini});
  try { $("#kRegu").value = localStorage.getItem("prediksi.regu") || ""; } catch {}
  gambarBesok();
  const tab = location.hash.slice(1).split("/")[0];
  if (["rapor", "dampak", "konfirmasi", "laporan", "tangga"].includes(tab)) pilihTab(tab);
}

let tunda;
$("#cari").addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { PR.n = 60; gambarNanti("data", "tabel"); }, 150); });
$("#prov").addEventListener("change", () => { PR.n = 60; gambarNanti("data", "tabel"); });
$("#petaPil").addEventListener("change", () => { PR.pil = $("#petaPil").value; PR.urut = null; PR.lv.clear(); chromeKendali(); gambarNanti("tabel", "peta"); });
$("#lagi").addEventListener("click", () => { PR.n += 60; $("#lagi").setAttribute("aria-busy", "true"); $("#lagi").textContent = "Memuat…"; gambarNanti("lagi"); });
/* klik = chrome (aria-pressed, aria-sort) segera, isi tabel dan peta lewat gambarNanti() */
$("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button[data-n]"); if (!b) return; PR.hari = +b.dataset.n; PR.n = 60; chromeKendali(); gambarNanti("data", "tabel"); });
$("#tampilSeg").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (!b) return; PR.tampil = b.dataset.t; chromeKendali(); $("#kartuTabel").hidden = PR.tampil !== "tabel"; $("#kartuPeta").hidden = PR.tampil !== "peta"; if (PR.tampil === "peta" && !PR.peta) $("#petaPesan").textContent = "Memuat peta…"; gambarNanti("tabel", "peta"); });
$("#pilBar").addEventListener("click", e => { const b = e.target.closest("button[data-pil]"); if (!b) return; PR.pil = b.dataset.pil; PR.urut = null; PR.n = 60; PR.lv.clear(); chromeKendali(); gambarNanti("tabel", "peta"); });
$("#petaLv").addEventListener("click", e => { const b = e.target.closest("button[data-lv]"); if (!b) return; const l = +b.dataset.lv; PR.lv.has(l) ? PR.lv.delete(l) : PR.lv.add(l); b.setAttribute("aria-pressed", String(PR.lv.has(l))); gambarNanti("peta"); });
$("#tabelBesok").addEventListener("click", e => {
  const h = e.target.closest("thead button[data-kol]");
  if (h) { const u = PR.urut, id = h.dataset.kol; PR.urut = u && u.kol === id ? {kol: id, arah: -u.arah} : {kol: id, arah: 1}; PR.n = 60; chromeKendali(); gambarNanti("tabel"); return; }
  const tr = e.target.closest("tbody tr[data-id]"); if (tr) bukaRincian(tr.dataset.id, tr);
});
$("#tabelBesok").addEventListener("keydown", e => { const tr = e.target.closest?.("tbody tr[data-id]"); if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bukaRincian(tr.dataset.id, tr); } });
$("#rincian").addEventListener("click", e => { if (e.target.closest("[data-tutup]") || e.target === $("#rincian")) $("#rincian").close(); });
$("#rincian").addEventListener("close", () => { const d = PR.dari; PR.dari = null; if (d?.isConnected) d.focus({preventScroll: true}); });
$("#tabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  pilihTab(b.dataset.tab);
  $("header.top").classList.remove("buka");
  $("#burger").setAttribute("aria-expanded", "false");
});
$("#burger").addEventListener("click", () => $("#burger").setAttribute("aria-expanded", $("header.top").classList.toggle("buka")));
$("#fk").addEventListener("submit", kirim);
$("#dProv").addEventListener("change", () => { PR.dm.prov = $("#dProv").value; PR.dm.id = null; gambarDampak(); });
$("#dLapisan").addEventListener("click", e => { const b = e.target.closest("button[data-l]"); if (b && PR.dm) { PR.dm.l = b.dataset.l; gambarDampak(); } });
$("#dKabIn").addEventListener("change", () => pilihKabDampak(idKab($("#dKabIn").value)));
$("#dampakIsi").addEventListener("click", e => { const u = e.target.closest("use[data-id]"); if (u) pilihKabDampak(u.dataset.id); });
$("#kKab").addEventListener("change", laluKab);
$("#kTgl").addEventListener("change", laluKab);
mulai();

document.addEventListener("change", e => {
  if (e.target.id !== "kalKab") return;
  (window.nanti || (f => f()))(() => {
    const s = document.createElement("div");
    s.innerHTML = kalenderRapor();
    $("#kalIsi").innerHTML = s.querySelector("#kalIsi").innerHTML;
  });
});
