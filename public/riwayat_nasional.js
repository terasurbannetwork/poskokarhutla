/* riwayat_nasional.js: grafik "Riwayat nasional" 1997–tahun berjalan, dipakai kartu laporan (/laporan) dan Insight (index.html).
   fs = factsheet_karhutla.json, tb = laporan.json tahun_berjalan, sj = sejarah.json (boleh null), merek = nama situs.
   Tahun lalu = angka resmi BNPB (factsheet), tahun berjalan = perkiraan satelit (tahun_berjalan.ha) karena angka resmi
   tertinggal berminggu-minggu (pemilik, 17 Okt 2026). Panel kiri titik VIIRS S-NPP per tahun supaya titik dan luas bisa
   dibandingkan; titik tahun berjalan = ha / ha_titik, sama dengan dasar perkiraan luasnya. Butuh fmt (inti/format.js) & Kartu.hl. */
function riwayatNasional(fs, tb, sj, merek) {
  const tgl = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"});
  const th = (tb?.sd || "").slice(0, 4), rows = fs.nasional.filter(r => r[0] !== th).map(([n, v, cat]) => ({n, v, cat}));
  if (tb) rows.push({n: th, v: tb.ha, ini: true});
  const titikTh = t => sj?.tahun.includes(t) ? Object.values(sj.prov).reduce((a, p) => a + (p[t] || []).reduce((x, y) => x + y, 0), 0) : null;
  rows.forEach(r => { r.t = r.ini ? Math.round(tb.ha / tb.ha_titik) : titikTh(r.n); });
  const MERAH = "#c9503a", NAVY = "#0b2545", ORANYE = "#e08a3c", W = 940, L = 92, TB = 170, A0 = L + TB + 92, RK = 62, RW = 200, rh = 30, T = 24;
  const MX = 2.8e6, MXT = Math.max(1, ...rows.map(r => r.t || 0)), bw = W - A0 - RW - RK, H = T + 10 + rows.length * rh + 22, X1 = A0 + 1e6 / MX * bw;
  const lbl = r => r.v > MX ? "±" + fmt(Math.round(r.v / 1e5) / 10) + " juta ha" : fmt(r.v) + " ha";
  const jt = v => fmt(Math.round(v / 1e5) / 10);
  const rasio = r => r.t && !r.ini && r.n !== "1997–1998" ? (r.v / r.t).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1}) : "–";
  let g = `<defs><pattern id="lpArsir" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${MERAH}" opacity=".35"/><rect width="3" height="6" fill="${MERAH}"/></pattern>`
    + `<pattern id="lpArsirT" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${ORANYE}" opacity=".35"/><rect width="3" height="6" fill="${ORANYE}"/></pattern></defs>`
    + `<text x="${L}" y="14" font-size="11" font-weight="700" opacity=".65">Titik panas</text><text x="${A0}" y="14" font-size="11" font-weight="700" opacity=".65">Luas terbakar</text><text x="${W}" y="14" text-anchor="end" font-size="11" font-weight="700" opacity=".65">ha per titik</text>`
    + `<line x1="${X1}" x2="${X1}" y1="${T}" y2="${H - 18}" stroke="currentColor" stroke-dasharray="3 3" opacity=".3"/><text x="${X1}" y="${H - 4}" text-anchor="middle" font-size="10.5" opacity=".6">1 juta ha</text>`;
  rows.forEach((r, i) => { const y = T + 4 + i * rh, w = Math.max(3, Math.min(r.v, MX) / MX * bw), wr = r.v >= 1e6 ? MERAH : NAVY;
    g += `<text x="0" y="${y + 17}" font-size="12.5" font-weight="${r.ini ? 800 : 700}">${r.n}</text>`
      + (r.t ? `<rect x="${L}" y="${y + 5}" width="${Math.max(3, r.t / MXT * TB)}" height="${rh - 12}" rx="3" fill="${r.ini ? "url(#lpArsirT)" : ORANYE}"/><text x="${L + Math.max(3, r.t / MXT * TB) + 6}" y="${y + 17}" font-size="11.5" font-weight="700">${fmt(r.t)}</text>`
        : `<text x="${L}" y="${y + 17}" font-size="11.5" opacity=".45">belum ada satelit</text>`)
      + `<rect x="${A0}" y="${y + 5}" width="${w}" height="${rh - 12}" rx="3" fill="${r.ini ? "url(#lpArsir)" : wr}"/>`
      + (r.v > MX ? `<path d="M${A0 + w - 112} ${y + 3}l-6 ${rh - 8}M${A0 + w - 104} ${y + 3}l-6 ${rh - 8}" stroke="#fff" stroke-width="3"/><text x="${A0 + w - 8}" y="${y + 17}" text-anchor="end" font-size="12" font-weight="800" style="fill:#fff">${lbl(r)}</text>`
        : `<text x="${A0 + w + 8}" y="${y + 17}" font-size="12" font-weight="800" style="fill:${r.v >= 1e6 ? MERAH : "currentColor"}">${lbl(r)}</text>`
          + (r.ini ? `<text x="${A0 + w + 8 + lbl(r).length * 6.4 + 6}" y="${y + 17}" font-size="11" font-weight="700" style="fill:#b07a1e">perkiraan ${jt(tb.rendah)}–${jt(tb.tinggi)} juta, s.d. ${tgl(tb.sd)}</text>` : ""))
      + `<text x="${W}" y="${y + 17}" text-anchor="end" font-size="12" font-weight="700" opacity="${r.ini ? .45 : .85}">${rasio(r)}</text>`; });
  const ini = rows.at(-1), lebih = rows.filter(r => !r.ini && r.n !== "1997–1998" && r.v > ini.v).map(r => r.n);
  return {
    judul: `Perkiraan luas terbakar ${th} sudah ${Kartu.hl("±" + jt(ini.v) + " juta ha")} (rentang ${jt(tb.rendah)}–${jt(tb.tinggi)} juta) hingga ${tgl(tb.sd)}, tertinggi ${lebih.length ? `ke-${lebih.length + 1} ` : ""}sejak 2015`,
    svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Titik panas dan luas terbakar Indonesia per tahun 1997–${th}">${g}</svg>`,
    sumber: `Titik: NASA FIRMS VIIRS S-NPP keyakinan sedang/tinggi, setahun penuh (satelit mulai 2012, jadi 1997–1998 tidak ada); ${th}: perkiraan ${merek} dari titik x ${fmt(tb.ha_titik)} ha (rentang ${fmt(Math.round(tb.rendah / 1e3))}–${fmt(Math.round(tb.tinggi / 1e3))} ribu ha), bukan angka resmi, jadi ha per titiknya tidak dihitung; 1997–${+th - 1}: luas BNPB via ${fs.sumber.split(",")[0]}; 1997–1998 estimasi kumulatif dua tahun, digambar terpotong`,
    leg: [[ORANYE, "titik panas setahun"], [MERAH, "luas di atas 1 juta ha"], [NAVY, "luas di bawah 1 juta ha"], ["#d98b7c", `${th} (sementara)`]],
  };
}
