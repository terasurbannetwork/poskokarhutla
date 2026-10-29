"use strict";
/* Dua kartu Insight banjir, ditambahkan ke Insight tanpa menyentuh insight.js:
   1. dini: kabupaten dengan peluang hujan lebat tertinggi besok, lusa, H+3 (peluang.json, kontrak peluang/1; peluang kabupaten = MAKSIMUM titik 1 derajat).
      Tidak ada ambang "waspada" di peluang.json; daftar diurut peluang hujan 50 mm atau lebih per hari, kolom 100 mm ikut apa adanya.
   2. prospektif: kemajuan uji prospektif terdaftar menuju vonis (prospektif_skor.json dibaca apa adanya; skor dihitung scripts/banjir/prospektif.py, terkunci).
   Bagian murni (Dini) diuji di tests/banjir/dini.test.mjs. */
const Dini = (() => {
  const pct = p => p == null || !isFinite(p) ? "–" : p >= .995 ? ">99%" : p > 0 && p < .005 ? "<1%" : Math.round(p * 100) + "%";
  const angka = n => Number(n).toLocaleString("id-ID");
  const wib = (d = new Date()) => d.toLocaleDateString("sv-SE", {timeZone: "Asia/Jakarta"});
  const tambah = (t, n) => new Date(Date.parse(t + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const HARI = ["besok", "lusa", "pada H+3"], AMBANG = 0.10; /* sama dengan scripts/wa/peringatan_banjir.mjs */
  const tglIndo = t => t ? new Date(t.slice(0, 10) + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : "–";
  /* hari = tanggal WIB hari ini; hasil: tiga daftar (H+1..H+3), tiap isi [{k, nama, p50, p100}] urut p50 turun, hanya yang p50 >= AMBANG */
  function daftar(d, hari, maks = 8) {
    const ada = d?.versi === "peluang/1" && d.wilayah;
    return [1, 2, 3].map(n => { const t = tambah(hari, n), baris = [];
      if (ada) for (const [k, w] of Object.entries(d.wilayah)) { if (w.tingkat !== "kabupaten") continue;
        const h = w.hari?.find(x => x.t === t); if (h && h.p?.[0] >= AMBANG) baris.push({k, nama: w.nama, p50: h.p[0], p100: h.p[1]}); }
      baris.sort((a, b) => b.p50 - a.p50 || b.p100 - a.p100 || a.nama.localeCompare(b.nama, "id"));
      return {t, n: baris.length, baris: baris.slice(0, maks)}; });
  }
  /* kemajuan per waktu-tunda dari prospektif_skor.json; vonis hanya bila berkas memuatnya selain "belum cukup data" */
  function kemajuan(s) {
    const K = s?.kriteria; if (!K || !s.tunda) return null;
    return {hariMin: K.n_hari_min, kejMin: K.kejadian_min, mulai: K.jendela_mulai, diperbarui: s.diperbarui, nTerbit: s.n_terbit,
      vonisAkhir: s.vonis_akhir, vonisJalan: s.vonis_berjalan,
      tunda: Object.entries(s.tunda).sort((a, b) => a[0] - b[0]).map(([k, v]) => ({tunda: +k, hari: v.n_hari || 0, kej: v.n_kejadian || 0, vonis: v.vonis && v.vonis !== "belum cukup data" ? v.vonis : null}))};
  }
  return {pct, angka, wib, tambah, tglIndo, HARI, AMBANG, daftar, kemajuan};
})();
if (typeof window !== "undefined" && typeof Insight !== "undefined") {
  const css = document.createElement("style");
  css.textContent = `.dn-kol{margin:0 0 14px}.dn-kol h4{margin:0 0 6px;font-size:13px}
.dn-kol button{display:flex;width:100%;justify-content:space-between;gap:10px;padding:7px 10px;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dn-kol button:hover{background:color-mix(in oklch,var(--surface),currentColor 6%)}.dn-kol .n{white-space:nowrap;font-variant-numeric:tabular-nums}
.dn-bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden;margin:4px 0 10px}.dn-bar i{display:block;height:100%;background:#2b8c86}
.dn-ps b{font-variant-numeric:tabular-nums}`;
  document.head.appendChild(css);
  Insight.LABEL.dini = "Peringatan dini kabupaten"; Insight.LABEL.prospektif = "Uji prospektif";
  Insight.EX.splice(Insight.EX.indexOf("status") + 1, 0, "dini"); Insight.EX.splice(Insight.EX.indexOf("ujibalik"), 0, "prospektif");
  Insight.exDini = function () {
    const d = this.PH, L = Dini.daftar(d, Dini.wib());
    if (!d || d.versi !== "peluang/1") return "";
    const tgl = t => tglPendek(t), ada = L.filter(x => x.baris.length);
    const judul = ada.length ? `${this.hl(Dini.angka(ada[0].n) + " kabupaten")} berpeluang hujan 50 mm atau lebih ${Dini.HARI[L.indexOf(ada[0])]}, tertinggi ${this.hl(Dini.pct(ada[0].baris[0].p50))} di <span translate="no">${esc(ada[0].baris[0].nama)}</span>`
      : "Tidak ada kabupaten dengan peluang hujan 50 mm sebesar 10% atau lebih sampai H+3";
    const isi = L.map((x, i) => `<div class="dn-kol"><h4>${tgl(x.t)}${x.n ? `, ${Dini.angka(x.n)} kabupaten` : ""}</h4>${x.baris.length ? x.baris.map(b =>
      `<button data-kab="${esc(b.k)}" title="${esc(b.nama)}: peluang hujan 50 mm atau lebih ${Dini.pct(b.p50)}, 100 mm atau lebih ${Dini.pct(b.p100)}. Klik untuk fokus ke peta."><span translate="no">${esc(b.nama)}</span><span class="n">50 mm ${Dini.pct(b.p50)}, 100 mm ${Dini.pct(b.p100)}</span></button>`).join("")
      : `<p class="fnd">Tidak ada kabupaten dengan peluang 10% atau lebih.</p>`}</div>`).join("");
    return this.ex(judul, "", "", isi, `Peluang kabupaten = maksimum titik prakiraan 1 derajat (sekitar 110 km), hujan saja, belum terkalibrasi, bukan peluang banjir. Hanya kabupaten dengan peluang hujan 50 mm 10% atau lebih, diurut dari yang tertinggi. Sumber: ${esc(d.sumber || "ECMWF IFS ansambel")}, dibuat ${jamWIB(d.dibuat)}`);
  };
  Insight.exProspektif = function () {
    const m = Dini.kemajuan(this.PS); if (!m) return "";
    const vonis = m.vonisAkhir || (m.vonisJalan && m.vonisJalan !== "belum cukup data" ? m.vonisJalan : null);
    const maks = Math.max(0, ...m.tunda.map(t => t.hari)), kej = Math.max(0, ...m.tunda.map(t => t.kej));
    const judul = vonis ? `Uji prospektif: ${this.hl(esc(vonis))}` : `Uji prospektif: ${this.hl("belum cukup data")}, ${this.hl(Dini.angka(maks) + " dari " + Dini.angka(m.hariMin))} hari sudah dinilai`;
    const bar = (v, mx, t) => `<div class="dn-bar" title="${t}"><i style="width:${Math.min(100, mx ? v / mx * 100 : 0)}%"></i></div>`;
    const isi = `<div class="dn-ps">${m.tunda.map(t => `<div><b>Tunda H+${t.tunda}</b>, ${Dini.angka(t.hari)} dari ${Dini.angka(m.hariMin)} hari, ${Dini.angka(t.kej)} dari ${Dini.angka(m.kejMin)} kejadian${t.vonis ? `, vonis ${esc(t.vonis)}` : ""}
      ${bar(t.hari, m.hariMin, `Hari dinilai: ${Dini.angka(t.hari)} dari ${Dini.angka(m.hariMin)}`)}${bar(t.kej, m.kejMin, `Kejadian: ${Dini.angka(t.kej)} dari ${Dini.angka(m.kejMin)}`)}</div>`).join("")}
      <p class="fnd">Vonis baru tampil setelah syarat ${Dini.angka(m.hariMin)} hari dan ${Dini.angka(m.kejMin)} kejadian terpenuhi. Jendela mulai ${Dini.tglIndo(m.mulai)}, ${Dini.angka(m.nTerbit)} prakiraan terbit sejauh ini.</p></div>`;
    return this.ex(judul, "", "", isi, `Skor apa adanya dari berkas uji terdaftar. Sumber: DIBI BNPB, skor uji prospektif diperbarui ${Dini.tglIndo(m.diperbarui)}`);
  };
  fetch("data/prospektif_skor.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null).then(s => { Insight.PS = s;
    const b = document.querySelector('#insight [data-ex="prospektif"]'); if (b) Insight.ulang(b); });
}
