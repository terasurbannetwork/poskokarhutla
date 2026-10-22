/* Statistik karbon per poligon, bentuk persis docs/karbon/RANCANGAN.md §3.2. Murni: tanpa fetch, tanpa DOM, tanpa impor
   (dipakai src/karbon.js di worker dan boleh dimuat peramban). Padanan Python: scripts/karbon/statistik.py `susun`; pembulatan HARUS sama
   (ha 2 desimal, ton 0 desimal, genap-ke-terdekat seperti round() Python) karena uji lintas-bahasa membandingkan keduanya.
   hasil = {namaKueri: baris[]} dari public/karbon/gfw_kueri.json (tanpa "peringatan"); kontrak = JSON kontrak itu. */
const n = x => Number(x) || 0;
const ya = x => x === true || x === 1 || x === "true";
const ha2 = x => Number(n(x).toFixed(2));
const ton = x => { x = n(x); const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; };

export function susunStat(hasil, kontrak, kini = Date.now()) {
  const B = k => hasil[k] || [], amb = Number(kontrak.hutan_ambang_min ?? 30);
  const [[tcl, akhir]] = Object.entries(kontrak.tahun_data_akhir);
  const hutan = B("tutupan").filter(b => n(b.ambang) >= amb);
  const hilang = {}, pend = {}, api = {};
  for (let t = 2001; t <= akhir; t++) { hilang[t] = {ha: 0, co2_t: 0, ha_gambut: 0, ha_primer: 0}; pend[t] = {}; api[t] = 0; }
  for (const b of B("hilang")) { const h = hilang[b.th]; if (!h) continue; h.ha += n(b.ha); h.co2_t += n(b.co2); if (ya(b.primer)) h.ha_primer += n(b.ha); }
  for (const b of B("hilang_gambut")) if (hilang[b.th]) hilang[b.th].ha_gambut += n(b.ha);
  for (const b of B("hilang_pendorong")) {
    if (!pend[b.th] || b.pendorong == null) continue;
    const p = pend[b.th][b.pendorong] ||= {ha: 0, co2_t: 0}; p.ha += n(b.ha); p.co2_t += n(b.co2);
  }
  for (const b of B("hilang_api")) if (b.th in api) api[b.th] += n(b.ha);
  for (const [t, h] of Object.entries(hilang)) {
    Object.assign(h, {ha: ha2(h.ha), co2_t: ton(h.co2_t), ha_gambut: ha2(h.ha_gambut), ha_primer: ha2(h.ha_primer)});
    const p = Object.entries(pend[t]).filter(([, v]) => v.ha > 0).sort(([a], [b]) => a < b ? -1 : 1);   // urut teks seperti sorted() Python
    if (p.length) h.pendorong = Object.fromEntries(p.map(([k, v]) => [k, {ha: ha2(v.ha), co2_t: ton(v.co2_t)}]));
  }
  const peta = (baris, kunci) => {   // kunci null (di luar kelas bernama) dilewati
    const d = {}; for (const b of baris) if (b[kunci] != null) d[b[kunci]] = (d[b[kunci]] || 0) + n(b.ha);
    return Object.fromEntries(Object.entries(d).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => [k, ha2(v)]));
  };
  const jumlah = (baris, f, k) => baris.filter(f).reduce((s, b) => s + n(b[k]), 0);
  return {
    versi: {tcl, tcd: kontrak.kueri.tutupan.versi}, tahun_data_akhir: akhir, diambil: new Date(kini).toISOString().slice(0, 10),
    luas_ha: ha2(jumlah(B("luas"), () => true, "ha")), hutan2000_ha: ha2(jumlah(hutan, () => true, "ha")),
    primer_ha: ha2(jumlah(hutan, b => ya(b.primer), "ha")),   // primer DALAM hutan (ambang >= 30)
    gambut_ha: ha2(jumlah(B("tutupan_gambut"), () => true, "ha")), gambut_hutan_ha: ha2(jumlah(B("tutupan_gambut"), b => n(b.ambang) >= amb, "ha")),
    stok_tC: {atas: ton(jumlah(hutan, () => true, "atas")), bawah: ton(jumlah(hutan, () => true, "bawah")), tanah: ton(jumlah(hutan, () => true, "tanah"))},
    hilang, hilang_api: Object.fromEntries(Object.entries(api).map(([t, v]) => [t, ha2(v)])),
    tutupan2017: peta(B("tutupan2017"), "tutupan"), kawasan: peta(B("kawasan"), "kawasan"), pendorong: peta(B("pendorong"), "kategori"),
    serapan_co2_t: ton(jumlah(B("serapan"), () => true, "serapan")),
  };
}
