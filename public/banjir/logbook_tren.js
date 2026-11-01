"use strict";
/* Kartu tren tahunan kejadian banjir/longsor dari Logbook Pusdalops BNPB (public/data/logbook_riwayat.json: nasional[tahun][jenis], hari_tercatat, tahun_penuh).
   Tahun dasar = tahun_penuh dari berkas (tidak ditulis di sini). Tahun lain dipudarkan dan TIDAK masuk judul; tooltip-nya memuat jumlah hari tercatat dan hitungan per 100 hari.
   Tanpa angka korban. Bagian murni (LogbookTren.seri/judul) diuji di tests/banjir/logbook_tren.test.mjs.
   Kartu kedua "susulan": batang pasangan nasional (hari 1-3) dengan selang ci95; kab tidak diperingkat. Bagian murni LogbookTren.susulan/judulSusulan/svgSusulan. */
const LogbookTren = (() => {
  const id = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
  function seri(lb, jenis) {
    const dasar = new Set((lb?.tahun_penuh || []).map(String));
    return Object.keys(lb?.hari_tercatat || {}).filter(y => lb.nasional?.[y]?.[jenis] != null).sort().map(y => {
      const n = lb.nasional[y][jenis], h = lb.hari_tercatat[y];
      return {y, n, h, per100: h ? n / h * 100 : null, dasar: dasar.has(y)}; });
  }
  /* rentang tahun bersambung, sama dengan rentangTh di public/cuaca/tren.js: [2014..2020, 2024, 2025] -> "2014–2020 dan 2024–2025" */
  function rentang(a) { const r = []; a.forEach((y, i) => i && y === a[i - 1] + 1 ? r[r.length - 1][1] = y : r.push([y, y]));
    const s = r.map(([x, z]) => x === z ? `${x}` : `${x}–${z}`); return s.length < 3 ? s.join(" dan ") : `${s.slice(0, -1).join(", ")}, dan ${s.at(-1)}`; }
  /* judul: hanya tahun dasar. Angka kunci (tahun dasar terbaru) di depan, lalu kedudukannya terhadap tahun dasar lain */
  function judul(s, nama, hl) {
    const d = s.filter(x => x.dasar); if (!d.length) return `Kejadian ${nama} per tahun menurut Logbook Pusdalops BNPB`;
    const u = d.at(-1), mx = Math.max(...d.map(x => x.n)), mn = Math.min(...d.map(x => x.n)), th = `tahun dasar ${rentang(d.map(x => +x.y))}`;
    const rata = Math.round(d.reduce((a, x) => a + x.n, 0) / d.length);
    const rank = u.n === mx ? `tertinggi dari ${id(d.length)} ${th}` : u.n === mn ? `terendah dari ${id(d.length)} ${th}`
      : `${u.n > rata ? "di atas" : u.n < rata ? "di bawah" : "sama dengan"} rata-rata ${th} (${id(rata)} kejadian)`;
    return `${hl(id(u.n))} kejadian ${nama} tercatat pada ${u.y}, ${rank}`;
  }
  function svg(s, warna) {
    const Wd = 640, T = 20, B = 164, tinggi = 190, L = 8, m = Math.max(...s.map(x => x.n), 1), gp = (Wd - L * 2) / s.length, bw = Math.min(30, gp * .66);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${tinggi}" width="100%" role="img" aria-label="Kejadian per tahun">${s.map((x, i) => { const h = Math.max(1.5, x.n / m * (B - T)), cx = L + i * gp + gp / 2;
      const tip = `<b>${x.y}</b><br>${id(x.n)} kejadian dalam ${id(x.h)} hari tercatat<br>${id(x.per100)} per 100 hari<br>${x.dasar ? "Tahun dasar" : "Bukan tahun dasar (tercatat tidak penuh atau dikoreksi)"}`;
      return `<g><rect class="gy" style="--i:${i}" x="${cx - bw / 2}" y="${B - h}" width="${bw}" height="${h}" rx="3" fill="${warna}" opacity="${x.dasar ? 1 : .3}" data-tip="${tip}"/>`
        + `<text x="${cx}" y="${B - h - 4}" text-anchor="middle" font-size="10" fill="currentColor" opacity="${x.dasar ? 1 : .55}">${id(x.n)}</text><text x="${cx}" y="${tinggi - 8}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".75">${x.y}</text></g>`; }).join("")}</svg>`;
  }
  /* kartu lengkap; lb = isi logbook_riwayat.json */
  function kartu(lb, jenis, nama, warna) {
    const s = seri(lb, jenis); if (!s.length) return "";
    return Kartu.kartu("Riwayat", judul(s, nama, Kartu.hl), svg(s, warna), "Logbook harian Pusdalops BNPB; tahun dasar pekat, tahun lain pudar dan tidak masuk judul", "", [[warna, "tahun dasar"], [warna + "55", "bukan tahun dasar"]]);
  }
  /* susulan: blok utama (hari 1-3) per pasangan nasional. Kab TIDAK diurutkan menurut lift (perbandingan berganda, dasar kecil). */
  const PAS = [["banjir>longsor", "Banjir, lalu longsor"], ["cuaca>banjir", "Cuaca ekstrem, lalu banjir"], ["cuaca>longsor", "Cuaca ekstrem, lalu longsor"], ["banjir>banjir", "Banjir berlanjut atau berulang"], ["gempabumi>longsor", "Gempabumi, lalu longsor"]];
  const sama = ci => ci && ci[0] <= 1 && ci[1] >= 1;
  function susulan(sl, pasangan = "banjir>longsor") {
    const p = sl?.pasangan?.[pasangan]; if (!p?.nasional) return null;
    return {nas: p.nasional, nKab: Object.values(p.kab || {}).filter(v => v.n >= (sl.min_pemicu || 10) && v.k >= (sl.min_k_kab || 5)).length};
  }
  function judulSusulan(sl, hl) {
    const a = susulan(sl); if (!a) return ""; const w = sl.jendela_hari || 3, th = `tahun dasar ${rentang((sl.tahun_dasar || []).map(Number))}`;
    return `${hl(id(Math.round(a.nas.laju * 100)))} dari 100 banjir disusul longsor 1–${id(w)} hari kemudian di kab/kota yang sama, ${id(a.nas.lift)} kali hari biasa di bulan yang sama (${th})`;
  }
  function svgSusulan(sl, warna) {
    const r = PAS.map(([k, nm]) => { const a = susulan(sl, k); return a && {nm, ...a.nas}; }).filter(Boolean); if (!r.length) return "";
    const Wd = 640, rh = 28, L = 190, R = 150, m = Math.max(...r.map(x => x.ci95?.[1] ?? x.lift), 1.2) * 1.05, X = v => L + v / m * (Wd - L - R), tinggi = r.length * rh + 16;
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${tinggi}" width="100%" role="img" aria-label="Kelipatan peluang susulan dibanding hari biasa, per pasangan jenis kejadian">`
      + `<line x1="${X(1)}" x2="${X(1)}" y1="2" y2="${tinggi - 12}" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/><text x="${X(1)}" y="${tinggi - 1}" text-anchor="middle" font-size="9.5" fill="currentColor" opacity=".7">1 = hari biasa</text>`
      + r.map((x, i) => { const y = 4 + i * rh, c = x.ci95, tak = sama(c), mid = y + rh / 2 - 3;
        const tip = `<b>${x.nm}</b><br>${id(x.n)} kejadian pertama, ${id(x.k)} ${x.nm.startsWith("Banjir berlanjut") ? "tercatat lagi sebagai banjir berlanjut atau berulang" : "disusul"} (${id(x.laju * 100)}%) dalam 1–${sl.jendela_hari || 3} hari kemudian<br>Hari biasa ${id(x.dasar * 100)}%<br>${id(x.lift)} kali, selang 95% ${c ? `${id(c[0])} sampai ${id(c[1])}` : "tidak tersedia"}${tak ? "<br>Tidak berbeda dari hari biasa" : ""}`;
        return `<g><text x="${L - 6}" y="${mid + 4}" text-anchor="end" font-size="11" fill="currentColor">${x.nm}</text><rect class="gy" style="--i:${i}" x="${L}" y="${mid - 8}" width="${Math.max(2, X(x.lift) - L)}" height="16" rx="3" fill="${warna}" opacity="${tak ? .35 : 1}" data-tip="${tip}"/>`
          + (c ? `<line x1="${X(c[0])}" x2="${X(c[1])}" y1="${mid}" y2="${mid}" stroke="currentColor" stroke-width="1.5"/><line x1="${X(c[0])}" x2="${X(c[0])}" y1="${mid - 4}" y2="${mid + 4}" stroke="currentColor"/><line x1="${X(c[1])}" x2="${X(c[1])}" y1="${mid - 4}" y2="${mid + 4}" stroke="currentColor"/>` : "")
          + `<text x="${X(c ? c[1] : x.lift) + 6}" y="${mid + 4}" font-size="10.5" fill="currentColor">${tak ? "tidak berbeda dari hari biasa" : `${id(x.lift)} kali`}</text></g>`; }).join("") + `</svg>`;
  }
  function kartuSusulan(sl, warna) {
    const a = susulan(sl); if (!a) return "";
    const h0 = a.nas.hari0, c = susulan(sl, "cuaca>banjir")?.nas, l = susulan(sl, "cuaca>longsor")?.nas;
    const b0 = h0 ? `<p>${Kartu.hl(id(Math.round(h0.laju * 100)))} dari 100 tercatat di hari yang sama, sebagian satu laporan gabungan "banjir dan longsor".</p>` : "";
    const bc = c && l ? `<p>Cuaca ekstrem disusul banjir ${id(c.lift)} kali dan longsor ${id(l.lift)} kali hari biasa (1–${sl.jendela_hari || 3} hari kemudian).</p>` : "";
    return Kartu.kartu("Susulan", judulSusulan(sl, Kartu.hl), svgSusulan(sl, warna) + b0 + bc,
      `Pola deskriptif dari Logbook Pusdalops, bukan ramalan. Selang 95%: ${sl.ci_metode || "bootstrap blok"}. Kab/kota tidak diperingkat (${id(a.nKab)} kab dengan minimal ${sl.min_pemicu || 10} banjir dan ${sl.min_k_kab || 5} susulan; dasar kecil, banyak perbandingan)`, "", [[warna, "kelipatan dari hari biasa, garis = selang 95%"]]);
  }
  return {seri, judul, svg, kartu, susulan, judulSusulan, svgSusulan, kartuSusulan};
})();
if (typeof window !== "undefined" && typeof Insight !== "undefined") {
  Insight.LABEL.logbook = "Riwayat Logbook"; Insight.EX.splice(Insight.EX.indexOf("tren") + 1, 0, "logbook", "susulan"); Insight.LABEL.susulan = "Banjir disusul longsor";
  Insight.exLogbook = function () { return this.LB ? LogbookTren.kartu(this.LB, "banjir", "banjir", "#3f7fb8") : ""; };
  Insight.exSusulan = function () { return this.SL ? LogbookTren.kartuSusulan(this.SL, "#b8742f") : ""; };
  muatJSON("../data/bnpb/logbook_susulan.json").catch(() => null).then(d => { Insight.SL = d;
    const b = document.querySelector('#insight [data-ex="susulan"]'); if (b) Insight.ulang(b); });
  muatJSON("../data/logbook_riwayat.json").catch(() => null).then(d => { Insight.LB = d;
    const b = document.querySelector('#insight [data-ex="logbook"]'); if (b) Insight.ulang(b); });
}
