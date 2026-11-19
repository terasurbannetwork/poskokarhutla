/* Wilayah administratif dari titik GPS untuk Lapor Bencana BNPB (KEPUTUSAN D10; pemilik 19 Nov 2026: "langsung pilih prov, kabko, kecamatan, desa berdasarkan gps").
   Sumber di repo, tanpa layanan luar: public/geo/provinsi.json (poligon provinsi), public/geo/desa/<kab>.json (poligon desa, kd),
   public/data/desa_cari.json (kode kab -> nama, kd desa -> [nama desa, kecamatan]). Batas disederhanakan (bukan SK batas desa),
   jadi hasil selalu dikonfirmasi pelapor dan desa sekitar ditawarkan sebagai pilihan.
   buatWilayah(muat) -> cari(lat, lon), dengan cari.cariNama(q) dan cari.pusat(kd). muat(jalur) -> Promise<json>: Worker memakai env.ASSETS, server lokal memakai fs. Berkas di-cache per proses. */

// ponytail: salinan ke-4 nama provinsi (juga src/alun.js, src/relawan.js, src/instansi.js); satukan ke modul data bersama saat salah satunya disentuh.
export const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
  "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten",
  "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur",
  "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
  "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};

const cincinDari = g => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).flat();
function kotak(cincin) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of cincin) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
const dalam = (x, y, cincin) => { let ok = false; for (const r of cincin) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
  const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok; } return ok; };
const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };

export function buatWilayah(muat) {
  const tunda = new Map();
  const sekali = (k, f) => tunda.get(k) || tunda.set(k, f().catch(e => { tunda.delete(k); throw e; })).get(k);
  const prov = () => sekali("prov", async () => (await muat("/geo/provinsi.json")).features.map(f => { const c = cincinDari(f.geometry); return {kode: f.properties.kode, c, k: kotak(c)}; }));
  const nama = () => sekali("nama", async () => {
    const d = await muat("/data/desa_cari.json");
    return {kab: d.kab, desa: new Map(d.baris.map(([kd, n, kec]) => [kd, [n, kec]]))};
  });
  const desaKab = kab => sekali(`desa:${kab}`, async () => {
    const fc = await muat(`/geo/desa/${kab}.json`);
    const fitur = fc.features.map(f => { const c = cincinDari(f.geometry), k = kotak(c); return {kd: f.properties.kd, c, k, pusat: [(k[1] + k[3]) / 2, (k[0] + k[2]) / 2]}; });
    return {fitur, k: kotak(fitur.flatMap(f => [[[f.k[0], f.k[1]], [f.k[2], f.k[3]]]]))};
  });

  const isiKd = async kd => { const N = await nama(); const [n, kec] = N.desa.get(kd) || [kd, ""]; const kab = kd.slice(0, 5);
    return {kode: kd, desa: n, kec, kab: N.kab[kab] || kab, kabKode: kab, prov: PROV[kd.slice(0, 2)] || kd.slice(0, 2), provKode: kd.slice(0, 2)}; };
  /* pencarian nama desa/kecamatan/kab (pemilik 19 Nov 2026: "bisa search juga"); semua kata harus cocok, paling banyak 8 */
  async function cariNama(q, dalam = "") {
    // kab/kota dan kecamatan ikut dicari dan ditaruh di atas (pemilik 19 Nov 2026: "kenapa langsung desa? kenapa ga semuanya bisa");
    // dalam = awalan kode (kab "31.75" atau kec "31.75.07") untuk mempersempit desa sesudah kab/kec dipilih
    const kata = String(q || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 1).slice(0, 5);
    const N = await nama(), cocok = t => kata.every(w => t.toLowerCase().includes(w));
    const hasil = [];
    if (!dalam && kata.length) {
      for (const [kab, n] of Object.entries(N.kab)) if (cocok(`${n} ${PROV[kab.slice(0, 2)] || ""}`))
        hasil.push({tingkat: "kab", kode: kab, judul: n, sub: `Provinsi ${PROV[kab.slice(0, 2)] || ""}`, skor: n.toLowerCase().replace(/^(kota administrasi|kota|kabupaten) /, "").startsWith(kata[0]) ? 0 : 1});
      const kec = new Map();
      for (const [kd, [, k]] of N.desa) { const kunci = kd.slice(0, 8); if (!kec.has(kunci) && cocok(`${k} ${N.kab[kd.slice(0, 5)] || ""}`)) kec.set(kunci, k); if (kec.size > 30) break; }
      for (const [kode, k] of kec) hasil.push({tingkat: "kec", kode, judul: `Kecamatan ${k}`, sub: `${N.kab[kode.slice(0, 5)]}, ${PROV[kode.slice(0, 2)]}`, skor: k.toLowerCase().startsWith(kata[0]) ? 2 : 3});
    }
    for (const [kd, [n, k]] of N.desa) {
      if (dalam && !kd.startsWith(dalam)) continue;
      if (!kata.length ? dalam : cocok(`${n} ${k} ${N.kab[kd.slice(0, 5)] || ""}`)) {
        hasil.push({tingkat: "desa", kode: kd, judul: `Desa/Kel. ${n}`, sub: `Kec. ${k}, ${N.kab[kd.slice(0, 5)]}, ${PROV[kd.slice(0, 2)]}`, skor: n.toLowerCase().startsWith(kata[0] || "") ? 4 : 5});
        if (hasil.length > 200) break;
      }
    }
    hasil.sort((a, b) => a.skor - b.skor || a.judul.localeCompare(b.judul));
    return Promise.all(hasil.slice(0, dalam ? 40 : 10).map(async h => h.tingkat === "desa" ? {...h, ...(await isiKd(h.kode))} : h));
  }
  /* titik pusat kotak batas desa (perkiraan tingkat desa) */
  async function pusat(kd) {
    const D = await desaKab(kd.slice(0, 5)), f = D.fitur.find(x => x.kd === kd);
    return f ? {lat: f.pusat[0], lon: f.pusat[1], wilayah: await isiKd(kd)} : null;
  }

  async function cari(lat, lon) {
    const p = (await prov()).find(q => lon >= q.k[0] && lon <= q.k[2] && lat >= q.k[1] && lat <= q.k[3] && dalam(lon, lat, q.c));
    const N = await nama();
    // kab yang mungkin: di provinsi itu (atau semua bila titik di luar poligon provinsi, misalnya di bibir pantai)
    const kabKode = Object.keys(N.kab).filter(k => !p || k.startsWith(p.kode + "."));
    let hit = null, calon = [];
    for (const kab of kabKode) {
      if (!p && kabKode.length > 60) break; // di luar semua provinsi: jangan memuat seluruh negeri
      let D;
      try { D = await desaKab(kab); } catch { continue; }
      const [x0, y0, x1, y1] = D.k;
      const dekat = lon >= x0 - .05 && lon <= x1 + .05 && lat >= y0 - .05 && lat <= y1 + .05;
      if (!dekat) continue;
      for (const f of D.fitur) {
        const j = km(lat, lon, f.pusat[0], f.pusat[1]);
        calon.push({kd: f.kd, j});
        if (!hit && lon >= f.k[0] && lon <= f.k[2] && lat >= f.k[1] && lat <= f.k[3] && dalam(lon, lat, f.c)) hit = f.kd;
      }
    }
    calon.sort((a, b) => a.j - b.j);
    const kd = hit || (calon[0]?.j <= 3 ? calon[0].kd : null);
    if (!kd) return null;
    const isi = k => { const [n, kec] = N.desa.get(k) || [k, ""]; const kab = k.slice(0, 5); return {kode: k, desa: n, kec, kab: N.kab[kab] || kab, kabKode: kab, prov: PROV[k.slice(0, 2)] || k.slice(0, 2), provKode: k.slice(0, 2)}; };
    return {...isi(kd), tepat: !!hit, sekitar: calon.filter(c => c.kd !== kd).slice(0, 5).map(c => ({...isi(c.kd), jarakKm: Math.round(c.j * 10) / 10}))};
  }
  return Object.assign(cari, {cariNama, pusat});
}
