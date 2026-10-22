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
      judul: `${hl(d.titik.length)} titik panas terdeteksi dalam 24 jam, tersebar di ${hl(d.laci.length)} cluster`,
      pil: [[`${fmt(d.titik.length)} titik panas`, b.warna], [`${fmt(d.laci.length)} cluster`, "#d64545"], dataPil(d.acuan)],
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
    const wil = t => String(t || "").replace(/^Pusat gempa berada di\s*/i, "").trim() || "Perairan Indonesia";   /* sama dengan wilayahPendek di public/gempa/kata.js */
    return {titik: g.map(x => [x.lon, x.lat, 3 + Math.max(0, x.m - 3) * 2.5, `M ${fmt(x.m)} · ${wil(x.wilayah)}`]),
      judul: kuat ? `${hl(g.length)} gempa tercatat dalam 24 jam, terkuat M ${Kartu.hl(fmt(kuat.m))} di <span translate="no">${esc(wil(kuat.wilayah))}</span>` : "Tidak ada gempa tercatat dalam 24 jam terakhir",
      pil: [...(g.length ? [[`${fmt(g.length)} gempa`, b.warna]] : []), ...(m5 ? [[`${fmt(m5)} gempa M 5 atau lebih`, "#c9503a"]] : []), ...(d.dibuat ? [dataPil(d.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "BMKG, USGS", legenda: [[b.warna, "Gempa 24 jam (ukuran = magnitudo)"]]};
  },
  async gunungapi(b) {
    const d = await ambil("/banjir/data/gunungapi_status.json"), G = d.gunung || [];
    if (!G.length) return null;
    const n = {1: 0, 2: 0, 3: 0, 4: 0}; G.forEach(g => n[g.level]++);   /* hitungan dari daftar, sama dengan halaman gunung api */
    const sa = n[3] + n[4], LV = {2: "II Waspada", 3: "III Siaga", 4: "IV Awas"};
    return {titik: G.filter(g => g.level >= 2).map(g => [g.lon, g.lat, 4 + g.level * 2, `${g.nama} · Level ${LV[g.level]}`]),
      judul: sa ? `${Kartu.hl(fmt(sa) + " gunung")} berstatus Siaga atau Awas hari ini, ${fmt(n[2])} lainnya Waspada` : `Tidak ada gunung berstatus Siaga atau Awas hari ini; ${Kartu.hl(fmt(n[2]) + " gunung")} Waspada`,
      pil: [...(sa ? [[`${fmt(sa)} Siaga atau Awas`, "#e8743b"]] : []), [`${fmt(n[2])} Waspada`, "#e0b400"], ...(d.dibuat ? [dataPil(d.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "PVMBG (MAGMA Indonesia)", legenda: [[b.warna, "Gunung berstatus Waspada atau lebih (ukuran = level)"]]};
  },
  async kekeringan(b) {
    const [m, g] = await Promise.all([ambil("/data/kekeringan_meta.json"), ambil("/data/kekeringan_grid.json").catch(() => null)]);
    const N = m.nasional, t = [N.kab_n[0] - N.kab_n[1], N.kab_n[1] - N.kab_n[2], N.kab_n[2]];   /* [waspada, siaga, awas], sama dengan halaman kekeringan */
    if (!N.kab_n[0]) return null;
    const lv = g ? g.kolom.indexOf("lv") : -1;
    return {titik: lv < 0 ? [] : g.grid.filter(r => r[lv] >= 2).map(r => [r[1], r[0], 5 + r[lv], r[lv] === 3 ? "Awas" : "Siaga"]),
      judul: t[2] ? `${Kartu.hl(fmt(t[2]) + " kabupaten/kota")} berstatus Awas di ${fmt(N.prov_n[2])} provinsi, ${fmt(t[1])} Siaga, ${fmt(t[0])} Waspada` : `Belum ada kabupaten/kota berstatus Awas; ${Kartu.hl(fmt(t[1] + t[0]) + " kabupaten/kota")} Siaga atau Waspada`,
      pil: [...(t[2] ? [[`${fmt(t[2])} kabupaten/kota Awas`, "#c9503a"]] : []), [`${fmt(t[1])} Siaga`, "#e58a45"], [`${fmt(t[0])} Waspada`, "#e3b94e"], ...(m.dibuat ? [dataPil(m.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "Deteksi Pantau Bencana", legenda: [[b.warna, "Sel Siaga atau Awas (ukuran = tingkat)"]]};
  },
  async udara(b) {
    const u = await ambil("/data/udara_kualitas.json"), asap = await ambil("/data/asap.json").catch(() => null);
    const tgl = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), h = Math.max(0, u.hari.indexOf(tgl));
    const nas = u.nasional?.[h]?.jiwa; if (!nas) return null;
    const ts = nas[2] + nas[3] + nas[4], nProv = Object.values(u.prov).filter(hs => hs[h] && hs[h][2] + hs[h][3] + hs[h][4] > 0).length;
    const jiwa = v => (v < 1e3 ? "" : "sekitar ") + (v >= 1e7 ? fmt(Math.round(v / 1e6)) + " juta" : v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " juta" : v >= 1e3 ? fmt(Math.round(v / 1e3)) + " ribu" : fmt(Math.round(v))) + " jiwa";
    const hs = asap ? asap.hari.indexOf(u.hari[h]) : -1, ir = asap ? asap.kolom.indexOf("pm25_rata") : -1, BATAS = u.batas?.[1] ?? 55.4;
    return {titik: hs < 0 || ir < 0 ? [] : asap.grid.filter(r => r[ir][hs] > BATAS).map(r => [r[1], r[0], 6, `PM2,5 ${fmt(Math.round(r[ir][hs]))} µg/m³ (model)`]),
      judul: ts ? `${Kartu.hl(jiwa(ts))} menghirup udara tidak sehat (PM2,5 di atas 55) di ${Kartu.hl(fmt(nProv) + " provinsi")} hari ini, menurut model` : "Tidak ada provinsi dengan udara tidak sehat hari ini",
      pil: [...(ts ? [[jiwa(ts), b.warna]] : []), ["perkiraan model CAMS", "#6b7280"], ...(u.dibuat ? [dataPil(u.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "Copernicus CAMS via Open-Meteo, WorldPop", legenda: [[b.warna, "Sel model PM2,5 tidak sehat (di atas 55 µg/m³)"]]};
  },
  async cuaca(b) {
    const [file, api, meta] = await Promise.all([ambil("/data/peringatan.json").catch(() => null), ambil("/api/cuaca/nowcast").catch(() => null), ambil("/banjir/data/cuaca_meta.json").catch(() => null)]);
    const apiSah = api && Array.isArray(api.nowcast) && (api.terbit || api.dibuat), nowcast = apiSah ? api.nowcast : file?.nowcast;
    if (!nowcast) return null;   /* BMKG tak terbaca: diam, bukan "tidak ada peringatan" */
    const t = Date.now(), A = nowcast.filter(a => Date.parse(a.selesai) > t && a.polygon?.length).map(a => ({...a, n: a.wilayah.split(",").length}));
    const nKec = A.reduce((a, x) => a + x.n, 0), nProv = new Set(A.flatMap(a => a.prov)).size;
    const pusat = a => { const r = a.polygon[0]; return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length]; };
    return {titik: A.map(a => [...pusat(a), 9 + Math.min(8, a.n), a.headline]),
      judul: A.length ? `${Kartu.hl(fmt(nKec) + " kecamatan")} di ${Kartu.hl(fmt(nProv) + " provinsi")} dalam peringatan nowcast BMKG yang berlaku` : "Tidak ada peringatan nowcast BMKG yang berlaku",
      pil: [...(A.length ? [[`${fmt(A.length)} peringatan nowcast`, b.warna]] : []), ...((meta?.dibuat || api?.terbit || api?.dibuat) ? [dataPil(meta?.dibuat || api.terbit || api.dibuat)] : [])],
      sumber: b.bagikan?.sumber || "BMKG", legenda: [[b.warna, "Peringatan nowcast BMKG (ukuran = jumlah kecamatan)"]]};
  },
};

/* semua bencana hidup (bukan "mati") yang punya adaptor, dimuat paralel; yang gagal dibuang */
export async function muatSemua(registry) {
  const hasil = await Promise.all(registry.bencana.filter(b => b.status === "aktif" && ADAPTOR[b.id]).map(async b => {
    try { const r = await ADAPTOR[b.id](b); return r && {...r, b}; } catch (e) { return null; } }));
  return hasil.filter(Boolean);
}
