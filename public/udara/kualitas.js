"use strict";
/* ================================================================ kualitas udara BMKG bulanan (kartu Insight)
   Data: /udara/data/kualitas_bmkg.json (scripts/udara/kualitas_bmkg.py, sumber BMKG www.bmkg.go.id/kualitas-udara). Dimuat saat Insight dibuka; berkas hilang = kartu dibuang (A18).
   DATA BULANAN UNTUK KAJIAN, BUKAN SIAGA: bukan ISPU, bukan model CAMS. Bulan data dan satuan ditulis persis seperti sumber; satuan yang tidak dicantumkan sumber tidak ditebak. */
const Kualitas = {
  D: null,
  P: [["spm", "SPM"], ["ozon", "Ozon"], ["so2", "SO2"], ["no2", "NO2"], ["kimia_air_hujan", "Hujan asam"]],
  NAMA: {spm: "partikel tersuspensi (SPM)", ozon: "ozon permukaan", so2: "SO2", no2: "NO2", kimia_air_hujan: "kimia air hujan"},
  async muat() { this.D = await fetch("/udara/data/kualitas_bmkg.json").then(r => r.ok ? r.json() : null).catch(() => null); },
  /* bulan dari sumber: "2026-09" jadi "September 2026"; teks lain ("September 2026") dipakai apa adanya */
  bulan(b) { return /^\d{4}-\d{2}$/.test(b || "") ? new Date(b + "-15T12:00:00+07:00").toLocaleDateString("id-ID", {month: "long", year: "numeric"}) : (b || "bulan tak tertulis"); },
  ada(k) { return (this.D?.[k]?.stasiun || []).length > 0; },
  num: (v, n = 2) => v == null || isNaN(v) ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: n}),
  tabel(kol, baris) {
    return `<div class="tw" style="max-height:340px"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}">${c.n}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; },
  ex() {
    const D = this.D, ada = this.P.filter(([k]) => this.ada(k)); if (!D || !ada.length) return "";
    const k = ada.some(([x]) => x === Insight.st.kualP) ? Insight.st.kualP : ada[0][0], B = D[k], R = [...B.stasiun];
    const bln = this.bulan(B.bulan || B.waktu), tertinggal = B.tertinggal_bulan > 0 ? `, tertinggal ${B.tertinggal_bulan} bulan dari sekarang` : "", L = s => Array.isArray(s) ? s.join(", ") || "–" : s || "–";
    let kol, judul, satuan;
    if (k === "spm") {
      R.sort((a, b) => b.spm - a.spm); const t = R[0];
      judul = `Rata-rata SPM bulanan tertinggi ${Kartu.hl(esc(t.id) + " " + this.num(t.spm))} dari ${Kartu.hl(R.length + " stasiun")} BMKG, ${bln}`;
      satuan = B.satuan ? "satuan " + B.satuan : "satuan tidak dicantumkan sumber";
      kol = [{n: "Stasiun", h: r => `<b translate="no">${esc(r.id)}</b>`}, {n: "SPM bulanan", num: 1, h: r => this.num(r.spm)}, {n: "Kategori BMKG", h: r => esc(r.kategori || "–")}]; }
    else if (k === "ozon") {
      const rr = r => { const h = (r.harian || []).filter(x => x.rata != null); return h.length ? h.reduce((a, x) => a + x.rata, 0) / h.length : null; }, mk = r => Math.max(...(r.harian || []).map(x => x.maks ?? -Infinity));
      R.sort((a, b) => (rr(b) ?? -1) - (rr(a) ?? -1)); const t = R[0];
      judul = `Ozon permukaan ${Kartu.hl(esc(t.lokasi) + " " + this.num(rr(t), 1))} rata-rata harian ${bln}, dari ${Kartu.hl(R.length + " stasiun")} BMKG`;
      satuan = B.satuan ? "satuan " + B.satuan : "satuan tidak dicantumkan sumber";
      kol = [{n: "Stasiun", h: r => `<b translate="no">${esc(r.lokasi)}</b>`}, {n: "Rata-rata harian", num: 1, h: r => this.num(rr(r), 1)}, {n: "Puncak harian", num: 1, h: r => isFinite(mk(r)) ? this.num(mk(r), 1) : "–"}, {n: "Hari terdata", num: 1, h: r => (r.harian || []).length}]; }
    else {
      R.sort((a, b) => b.nilai - a.nilai); const t = R[0], n = R.length, lewat = R.filter(r => r.nab != null && (k === "kimia_air_hujan" ? r.nilai < r.nab : r.nilai > r.nab)).length;
      satuan = B.satuan ? "satuan " + B.satuan : "satuan tidak dicantumkan sumber";
      const kata = k === "kimia_air_hujan" ? "di bawah nilai ambang asam" : "di atas nilai ambang (NAB)";
      judul = `${Kartu.hl(lewat + " dari " + n + " stasiun")} ${kata} untuk ${this.NAMA[k]} ${bln}; tertinggi ${Kartu.hl(esc(t.stasiun) + " " + this.num(t.nilai, 4))}`;
      kol = [{n: "Stasiun", h: r => `<b translate="no">${esc(r.stasiun)}</b>`}, {n: "Lokasi", h: r => `<span translate="no">${esc(L(r.lokasi))}</span>`}, {n: "Nilai", num: 1, h: r => this.num(r.nilai, 4)}, {n: "Ambang (NAB)", num: 1, h: r => this.num(r.nab, 4)}]; }
    const pilBulanan = '<span class="kt" style="--c:#0b2545;--f:#fff;text-transform:none;letter-spacing:0">data bulanan untuk kajian, bukan siaga</span>';
    return Kartu.ex(judul, "", "", `<div style="margin:0 0 6px">${pilBulanan}</div>` + this.tabel(kol, R), `Data ${bln}, ${satuan}${tertinggal}. Sumber: BMKG kualitas-udara, terbit ${esc((D.dibuat || "").slice(0, 10))}`, Kartu.seg("kualP", ada.map(([x, n]) => [x, n]), {kualP: k}))
      .replace('<span class="ex-ey"></span>', `<span class="ex-ey"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/></svg>Kualitas udara BMKG</span>`); },
};
