"use strict";
/* Tab Laporan provinsi (gaya laporan FFGS BMKG): peta kab satu provinsi + tabel, cetak A4 lewat window.print().
   Dimuat sesudah prediksi.js (skrip klasik: PR, ambil, pil, persen, tgl, LEVEL dari sana); fungsi murni di laporan_prov.js (LP).
   Data dimuat sekali saat tab pertama dibuka; geometri per provinsi saat dipilih.
   Panel ambang dan lebihan berpil hipotesis selama ambang_persentil.pakai bukan true.
   Spec: docs/superpowers/specs/2026-11-04-laporan-prov-banjir-design.md */
const LP = window.LaporanProv;
const kartuLap = (ey, judul, isi, kls = "") => `<article class="ex ex-std ${kls}"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></article>`;
const pilHip = ap => ap?.pakai === true ? "" : `<span class="pr-pil buruk" title="Ambang belum lolos uji. Uji 2024–2025 ambang Waspada: ${persen(ap?.uji_2024_2025?.persentil?.waspada?.far)} alarm tanpa kejadian tercatat (FAR)">hipotesis</span>`;
const mmLap = v => v == null ? "tanpa data" : `${fmt(Math.round(v))} mm`;
const lgs = v => v == null ? "–" : v.toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
function legendaLap(k) {
  const K = LP.KELAS[k];
  return `<div class="lp-leg">${K.warna.map((w, i) => `<span><i style="background:${w}"></i>${esc(K.label[i])}</span>`).join("")}<span><i style="background:${LP.TANPA}"></i>tanpa data</span></div>`;
}
/* Geometri provinsi ditulis SEKALI di <defs> tersembunyi; tiap panel hanya <use> berwarna (8 panel x 140 KB path = beku di HP).
   kunci kab hanya [a-z], aman sebagai id. teks(b) boleh memuat "\n" untuk baris baru di tooltip. */
const defsLap = pt => `<svg class="lp-defs" width="0" height="0" aria-hidden="true"><defs>${Object.entries(pt.d).map(([k, d]) => `<path id="lp-${k}" d="${d}"/>`).join("")}</defs></svg>`;
function petaLap(pt, s, kls, nilai, teks) {
  const per = Object.fromEntries(s.baris.map(b => [b.kunci, b]));
  const pakai = Object.keys(pt.d).map(k => {
    const b = per[k], v = b ? nilai(b) : null, i = LP.kelas(v, LP.KELAS[kls].batas);
    const tip = `<b>${esc(b?.nama || k)}</b><br>${esc(b ? teks(b) : "tidak ada di prediksi").replace(/\n/g, "<br>")}`;
    return `<use href="#lp-${k}" fill="${i < 0 ? LP.TANPA : LP.KELAS[kls].warna[i]}" data-tip="${esc(tip)}"/>`;
  }).join("");
  return `<svg class="lp-peta" viewBox="0 0 ${pt.lebar} ${pt.tinggi}" role="img" preserveAspectRatio="xMidYMid meet">${pakai}</svg>${legendaLap(kls)}`;
}

async function muatLaporan() {
  if (!PR.d) return;   // tab diklik sebelum prediksi.json termuat: mulai() memanggil pilihTab lagi lewat hash
  if (PR.lap === undefined) {
    const banjir = fetch("../banjir/data/ambang_persentil.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
    const [amatan, lengas, ap] = await (PR.memLap ||= Promise.all([ambil("amatan/HJN.json"), ambil("lengas.json"), banjir]));
    PR.lap = {amatan, lengas, ap};
    const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
    $("#lpProv").innerHTML = prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("");
    const awal = location.hash.match(/^#laporan\/(\d{2})$/)?.[1];
    if (awal && prov.some(([k]) => k === awal)) $("#lpProv").value = awal;
  }
  if (PR.lapProv === $("#lpProv").value) { history.replaceState(null, "", "#laporan/" + PR.lapProv); return; }   // buka ulang tab: sudah tergambar
  gambarLaporan();
}

async function gambarLaporan() {
  const prov = $("#lpProv").value, {amatan, lengas, ap} = PR.lap;
  history.replaceState(null, "", "#laporan/" + prov);
  $("#laporanIsi").setAttribute("aria-busy", "true");
  await new Promise(r => setTimeout(r));   // biarkan pemilih menutup dan tampil dulu sebelum render berat
  const geo = PR.geo[prov] ||= await fetch(`../geo/kabupaten/${prov}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  if (prov !== $("#lpProv").value) return;   // pemilih berganti selama menunggu
  $("#laporanIsi").removeAttribute("aria-busy");
  if (!geo) { $("#laporanIsi").innerHTML = '<p class="kosong">Batas kab/kota provinsi ini belum tersedia.</p>'; return; }
  const pt = (PR.pt ||= {})[prov] ||= LP.petaSvg(geo);
  const s = LP.susun({d: PR.d, amatan, lengas, ap, prov}), w = LP.waspada(s.baris, 1);
  PR.lapProv = prov;
  const hj = PR.d.kode.HJN, bn = PR.d.kode.BNJ;
  const tahapA = !s.amatan ? "" : s.amatan.j === "final" ? '<span class="pr-pil ok" title="ERA5 per jam lewat Open-Meteo Archive">final, ERA5</span>'
    : '<span class="pr-pil abu" title="Open-Meteo untuk tanggal lampau = analisis model, bukan pengukuran; diganti ERA5 sesudah 6 hari">sementara, analisis model</span>';
  const panel = [
    kartuLap("Kemarin", `Hujan ${s.amatan ? esc(tgl(s.amatan.hari)) : "kemarin"} ${tahapA}`,
      petaLap(pt, s, "hujan", b => b.hujan, b => `hujan: ${mmLap(b.hujan)}`)),
    kartuLap("Kini", `Lengas tanah ${lengas ? esc(tgl(lengas.hari)) : ""}`,
      petaLap(pt, s, "lengas", b => b.lengas, b => b.lengas == null ? "tanpa data" : `lengas: ${lgs(b.lengas)}`)),
    kartuLap("Besok", `Prakiraan hujan ${hj ? esc(tgl(hj.hari[0])) : ""} ${pil(hj?.vonis["p50|1"])}`,
      petaLap(pt, s, "hujan", b => b.prak, b => `total: ${mmLap(b.prak)}\npeluang ≥50 mm: ${persen(b.p50)}`)),
    kartuLap("Ambang", `Hujan pemicu banjir ${pilHip(ap)}`,
      petaLap(pt, s, "ambang", b => b.ambang, b => `ambang Waspada: ${mmLap(b.ambang)}${b.sumberAmbang === "nasional" ? "\nangka nasional" : ""}`)),
    kartuLap("Besok", `Prakiraan hujan lewat ambang ${pilHip(ap)}`,
      petaLap(pt, s, "lebih", b => b.lebih == null ? null : Math.max(0, b.lebih),
        b => b.lebih == null ? "tanpa data" : b.lebih <= 0 ? `${fmt(Math.round(-b.lebih))} mm di bawah ambang` : `${fmt(Math.round(b.lebih))} mm di atas ambang`)),
    ...[1, 2, 3].map(n => kartuLap(n === 1 ? "Besok" : `+${n} hari`, `Peluang banjir ${bn ? esc(tgl(bn.hari[n - 1])) : ""} ${pil(bn?.vonis[`ps|${n}`])}`,
      petaLap(pt, s, "level", b => b.lv[n - 1],
        b => `${b.lv[n - 1] == null ? "tanpa data" : LEVEL[b.lv[n - 1]]}${b.ps[n - 1] != null ? `\npeluang Siaga: ${persen(b.ps[n - 1])}` : ""}`), n > 1 ? "lp-ext" : "")),
  ];
  const tb = LP.tabel(s.baris), sel = v => v == null ? "–" : fmt(Math.round(v));
  const tabel = tb.length ? `<div class="tw ex-tabel"><table><thead><tr><th>Kab/kota</th><th title="Hujan hari terakhir di arsip pengamatan">Hujan kemarin (mm)</th><th title="Fraksi volume 3 sampai 27 cm">Lengas</th><th title="Total prakiraan hujan besok">Prakiraan besok (mm)</th><th title="Ambang Waspada, hipotesis; * = angka nasional">Ambang (mm)</th><th title="Prakiraan dikurangi ambang">Lebihan (mm)</th><th>Banjir +1</th><th>Banjir +2</th><th>Banjir +3</th></tr></thead><tbody>${tb.map(b =>
    `<tr><td>${esc(b.nama)}</td><td class="n">${sel(b.hujan)}</td><td class="n">${lgs(b.lengas)}</td><td class="n">${sel(b.prak)}</td><td class="n">${sel(b.ambang)}${b.sumberAmbang === "nasional" ? "*" : ""}</td><td class="n">${sel(b.lebih)}</td>${b.lv.map(v => `<td>${v == null ? "–" : LEVEL[v]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  /* jumlah kab per level untuk +1..+3: baris = hari, kolom = Waspada/Siaga/Awas */
  const ringkas = `<div class="tw ex-tabel"><table><thead><tr><th>Hari</th>${LEVEL.slice(1).map(l => `<th>${l}</th>`).join("")}</tr></thead><tbody>${[1, 2, 3].map(n =>
    `<tr><td>${bn ? esc(tgl(bn.hari[n - 1])) : `+${n}`}</td>${[1, 2, 3].map(l => `<td class="n">${fmt(s.baris.filter(b => b.lv[n - 1] === l).length)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  $("#laporanIsi").innerHTML =`<header class="lp-kepala"><h2>Laporan prediksi banjir ${esc(s.nama)}</h2><p class="pr-kecil">Terbit ${esc(jamWIB(PR.d.dibuat))}. Alat bantu staf, tidak untuk disebar ke publik.</p></header>
    <details class="pr-kecil lp-batas"><summary>Batasan</summary><ul>${PR.d.batasan.map(b => `<li>${esc(b)}</li>`).join("")}<li>Ambang hujan pemicu belum lolos uji; kab/kota di luar sampel memakai angka nasional (bertanda *).</li></ul></details>
    ${kartuLap("Ringkasan", `<span class="hl">${fmt(w.length)} dari ${fmt(s.n)}</span> kab/kota ${esc(s.nama)} berpeluang banjir Waspada atau lebih besok`, ringkas)}
    <div class="lp-grid">${panel.join("")}</div>
    ${tabel ? kartuLap("Rincian", `Kab/kota berlevel Waspada atau lebih dalam 3 hari: <span class="hl">${fmt(tb.length)}</span>`, tabel, "lp-rinci") : ""}`;
}

$("#lpProv").addEventListener("change", gambarLaporan);
$("#lpCetak").addEventListener("click", () => window.print());
pasangTip();
