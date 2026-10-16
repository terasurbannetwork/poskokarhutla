/* Adaptor data lintas bencana untuk beranda /semua (public/semua). Satu adaptor per id registry (public/bencana.json):
   async (bencana) => {titik: [[lon, lat, radius, teks?]], judul (html, angka dibungkus Kartu.hl), pil: [[teks, warna?]], sumber, legenda: [[warna, nama]]} atau null.
   Berkas atau API yang tidak ada/gagal = null, bencana itu diam-diam tidak tampil. Bencana tanpa adaptor tidak dimuat.
   Bencana baru: tambah satu fungsi ke ADAPTOR. Butuh format.js (fmt, esc, jamWIB, rb) dan kartu.js (Kartu.hl) yang dimuat lebih dulu. */
const ambil = async u => { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const hl = n => Kartu.hl(fmt(n));
const dataPil = t => ["Data " + jamWIB(t), "#6b7a90"];

export const ADAPTOR = {
  async karhutla(b) {
    const d = await ambil("/data/titik24.json");
    return {titik: d.titik.map(([la, lo]) => [lo, la, 2.2]),
      judul: `${hl(d.titik.length)} titik panas terdeteksi dalam 24 jam, tersebar di ${hl(d.laci.length)} kompleks api`,
      pil: [[`${fmt(d.titik.length)} titik panas`, b.warna], [`${fmt(d.laci.length)} kompleks api`, "#d64545"], dataPil(d.acuan)],
      sumber: b.bagikan?.sumber || "NASA FIRMS", legenda: [[b.warna, "Titik panas 24 jam"]]};
  },
  async banjir(b) {
    const d = await ambil("/banjir/data/kejadian_aktif_awal.json"), k = d.kejadian || [], prov = new Set(k.flatMap(x => x.prov || []));
    const jiwa = k.reduce((a, x) => a + (x.penduduk || 0), 0);
    return {titik: k.filter(x => x.pusat).map(x => [x.pusat[1], x.pusat[0], 9 + Math.min(8, x.n_kec), `${x.kode} · ${x.n_kec} kecamatan`]),
      judul: k.length ? `${hl(k.length)} kejadian banjir aktif di ${hl(prov.size)} provinsi` : "Tidak ada kecamatan berstatus Siaga atau Awas hari ini",
      pil: [...(k.length ? [[`${fmt(k.length)} kejadian aktif`, b.warna]] : []), ...(jiwa ? [[`${rb(jiwa)} jiwa di kecamatan terdampak`, "#e58a45"]] : []), ...(d.dibuat ? [dataPil(d.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "Open-Meteo, Copernicus GloFAS, BNPB", legenda: [[b.warna, "Kejadian banjir aktif"]]};
  },
  async gempa(b) {
    const d = await ambil("/api/gempa/terbaru?jam=24"), g = d.gempa || [], kuat = g.reduce((a, x) => !a || x.m > a.m ? x : a, null), m5 = g.filter(x => x.m >= 5).length;
    return {titik: g.map(x => [x.lon, x.lat, 3 + Math.max(0, x.m - 3) * 2.5, `M ${fmt(x.m)} · ${x.wilayah}`]),
      judul: kuat ? `${hl(g.length)} gempa tercatat dalam 24 jam, terkuat M ${Kartu.hl(fmt(kuat.m))} di <span translate="no">${esc(kuat.wilayah)}</span>` : "Tidak ada gempa tercatat dalam 24 jam terakhir",
      pil: [...(g.length ? [[`${fmt(g.length)} gempa`, b.warna]] : []), ...(m5 ? [[`${fmt(m5)} gempa M 5 atau lebih`, "#c9503a"]] : []), ...(d.dibuat ? [dataPil(d.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "BMKG, USGS", legenda: [[b.warna, "Gempa 24 jam (ukuran = magnitudo)"]]};
  },
};

/* semua bencana hidup (bukan "mati") yang punya adaptor, dimuat paralel; yang gagal dibuang */
export async function muatSemua(registry) {
  const hasil = await Promise.all(registry.bencana.filter(b => b.status !== "mati" && ADAPTOR[b.id]).map(async b => {
    try { const r = await ADAPTOR[b.id](b); return r && {...r, b}; } catch (e) { return null; } }));
  return hasil.filter(Boolean);
}
