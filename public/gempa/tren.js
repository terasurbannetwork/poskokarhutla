"use strict";
/* ================================================================ tren gempa */
/* Tab Tren: kartu bergaya Insight dari katalog USGS (data/riwayat_m5.json: gempa M 5+ sejak 1900, kolom waktu_utc, lat, lon, dalam_km, m, prov).
   TIDAK ada kalender musim: gempa tidak bermusim (A16 tidak berlaku). Angka termasuk gempa susulan; katalog sebelum 2000 tidak lengkap, jadi kartu memakai 2000 ke atas. */
const Tren = {
  st: {bulan: "24", dalam: "2000"},
  R: undefined, akhir: "",
  /* gempa M 5+ per bulan: [{k: "2026-10", n}] untuk N bulan terakhir (bulan terakhir belum penuh) */
  exBulan() {
    const N = +this.st.bulan, per = {}; for (const b of this.R.baris) per[b[0].slice(0, 7)] = (per[b[0].slice(0, 7)] || 0) + 1;
    const [ay, am] = this.akhir.slice(0, 7).split("-").map(Number), kunci = Array.from({length: N}, (_, i) => { const t = ay * 12 + am - 1 - (N - 1 - i); return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`; });
    const nilai = kunci.map(k => [per[k] || 0]), tot = nilai.reduce((a, v) => a + v[0], 0), pk = nilai.map(v => v[0]).indexOf(Math.max(...nilai.map(v => v[0])));
    const nama = k => `${KG.BLN[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
    return KG.kartu("Per bulan", `${Kartu.hl(fmt(tot) + " gempa")} M 5+ tercatat di Indonesia dalam ${N} bulan terakhir, terbanyak ${Kartu.hl(fmt(nilai[pk][0]))} pada ${Kartu.hl(nama(kunci[pk]))}`,
      KG.kolom({cat: kunci.map(k => `${KG.BLN[+k.slice(5) - 1]} ${k.slice(2, 4)}`), seri: [["Gempa M 5+", KG.TANAH]], nilai, ber: true, aria: "Gempa M 5+ per bulan",
        tip: i => `<b>${nama(kunci[i])}${i === N - 1 ? " (berjalan)" : ""}</b><br>Gempa M 5+: ${fmt(nilai[i][0])}`}),
      `USGS sampai ${KG.tgl(this.akhir + "T12:00:00+07:00")}`, Kartu.seg("bulan", [["24", "24 bulan"], ["60", "60 bulan"]], this.st), [[KG.TANAH, "gempa M 5+"], ["#b07a3c8c", "bulan berjalan"]]); },

  /* per tahun sejak 2000, menurut kelas kekuatan */
  exTahun() {
    const per = {}; for (const b of this.R.baris) { const th = +b[0].slice(0, 4); if (th < 2000) continue; const c = per[th] ||= [0, 0, 0]; c[b[4] >= 7 ? 2 : b[4] >= 6 ? 1 : 0]++; }
    const th = Object.keys(per).map(Number).sort(), nilai = th.map(t => per[t]), tot = nilai.reduce((a, v) => a + v[0] + v[1] + v[2], 0), n6 = nilai.reduce((a, v) => a + v[1] + v[2], 0);
    return KG.kartu("Per tahun", `${Kartu.hl(fmt(tot) + " gempa")} M 5+ mengguncang Indonesia sejak 2000, ${Kartu.hl(fmt(n6))} di antaranya M 6 atau lebih`,
      KG.kolom({cat: th.map(t => String(t).slice(2)), seri: NAMA_M_STACK.map((n, i) => [n, WARNA_M_STACK[i]]), nilai, ber: true, aria: "Gempa M 5+ per tahun menurut kelas",
        tip: i => `<b>${th[i]}${i === th.length - 1 ? " (berjalan)" : ""}</b><br>${NAMA_M_STACK.map((n, k) => `${n}: ${fmt(nilai[i][k])}`).join("<br>")}`}),
      "USGS", "", NAMA_M_STACK.map((n, i) => [WARNA_M_STACK[i], n])); },

  /* sebaran kelas kedalaman (dangkal < 60, menengah 60 sampai 300, dalam > 300 km) */
  exDalam() {
    const dari = this.st.dalam === "5" ? new Date(this.akhir).getUTCFullYear() - 4 : 2000, c = [0, 0, 0];
    for (const b of this.R.baris) if (+b[0].slice(0, 4) >= dari && b[3] != null) c[kelasDalam(b[3])]++;
    const tot = c[0] + c[1] + c[2]; if (!tot) return "";
    const rows = KELAS_DALAM.map(([n, w, r], i) => ({nama: innerWidth < 640 ? n : `${n} (${r.replace(" sampai ", "-")})`, v: c[i], warna: w, pil: [[Math.round(c[i] / tot * 100) + "%", w]], tip: `<b>${n}</b> · ${r}<br>Gempa M 5+: ${fmt(c[i])}<br>Bagian: ${Math.round(c[i] / tot * 100)}%`}));
    return KG.kartu("Kedalaman", `${Kartu.hl(Math.round(c[0] / tot * 100) + "%")} gempa M 5+ di Indonesia sejak ${dari} berpusat dangkal (kurang dari 60 km): ${Kartu.hl(fmt(c[0]) + " gempa")}`,
      KG.mendatar(rows, {akhir: 70}), "USGS", Kartu.seg("dalam", [["2000", "Sejak 2000"], ["5", "5 tahun terakhir"]], this.st)); },

  gambar(id) { Kartu._leg = null;
    try { return this["ex" + id[0].toUpperCase() + id.slice(1)]() || ""; } catch (e) { console.error(e); return ""; } },
  EX: ["bulan", "tahun", "dalam"],
  async render() {
    const el = $("#tren"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => { const s = e.target.closest("[data-set]"); if (!s) return; this.st[s.dataset.set] = s.dataset.v; const box = s.closest("[data-ex]"); nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); KG.gulir(box); }); }); }
    if (!el.children.length) el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren gempa…</div>`;
    if (!this.R) { const [R, m] = await Promise.all([Insight.R ?? muatJSON("data/riwayat_m5.json").catch(() => null), muatJSON("data/meta.json").catch(() => ({}))]); this.R = Insight.R = R; this.akhir = m.akhir || ""; }
    if (!this.R || !this.akhir) { el.innerHTML = `<div class="kosong">Data riwayat gempa belum tersedia.</div>`; return; }
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join(""); KG.gulir(el); },
};
