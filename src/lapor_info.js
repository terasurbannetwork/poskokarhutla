/* Info daerah untuk chat Lapor Bencana BNPB: prakiraan 3 hari (/api/lapor/daerah), tempat di sekitar kejadian (/sekitar), nomor penting (/penting).
   Port dari scripts/lapor/lokal.mjs (acuan perilaku yang disetujui pemilik 19 Nov 2026). Data publik dibaca lewat muat(jalur) -> json|null (Worker: env.ASSETS).
   Tanpa D1. Yang dikirim ke Overpass OSM hanya koordinat kejadian. Label uji model tidak ditampilkan ke warga (pemilik 19 Nov 2026). */
import {Besok} from "./lapor_besok.js";
import {km} from "./lapor_tampil.js";
import {cincinDari, kotak, dalam} from "./lapor_wilayah.js";
import {kontakBpbd, kontakDamkar} from "./lapor_kontak.js";
const KATA_UMUM = new Set(["rusak", "roboh", "putus", "ambruk", "terendam", "longsor", "banjir", "yang", "di", "dan", "atau", "dekat", "sekitar", "kena", "terdampak"]);

const TINGKAT = ["Normal", "Waspada", "Siaga", "Awas"];
const adaKode = k => /^\d{2}\.\d{2}(\.\d{2})?$/.test(k || "");
// cache per isolat Worker; berkas besar (prediksi.json 200 KB) dibaca ulang tiap 10 menit
const SEGAR = 10 * 60e3, simpanan = new Map();
async function berkas(muat, jalur) {
  const c = simpanan.get(jalur);
  if (c && Date.now() - c.t < SEGAR) return c.d;
  const d = await muat(jalur).catch(() => null);
  if (d) simpanan.set(jalur, {t: Date.now(), d});
  return d;
}

export function buatInfo({muat, wilayah}) {
  /* ---------- prakiraan 3 hari: angka sama dengan halaman /prediksi (public/prediksi/besok_inti.js) ---------- */
  async function daerah(q) {
    let w = null;
    if (adaKode(q.kode)) { const d = (await wilayah.cariNama("", q.kode))[0]; w = d ? {...d, desa: null} : null; } // kab atau kec: tingkat kab cukup untuk prakiraan
    else if (q.kode) w = (await wilayah.pusat(String(q.kode)))?.wilayah;
    else if (q.lat != null && Number.isFinite(Number(q.lat)) && Number.isFinite(Number(q.lon))) w = await wilayah(Number(q.lat), Number(q.lon));
    if (!w) return [404, {galat: "Lokasi tidak terbaca sebagai desa di Indonesia."}];
    const P = await berkas(muat, "/prediksi/data/prediksi.json");
    if (!P) return [503, {galat: "Data prakiraan belum tersedia."}];
    const id = w.kabKode.replace(".", ""), k = P.kab.find(x => x.id === id);
    if (!k) return [404, {galat: "Data prakiraan untuk kabupaten/kota ini belum ada."}];
    const KOL = Object.fromEntries(Object.entries(P.kode).map(([c, v]) => [c, v.kol]));
    const hari = P.kode.HJN.hari, nmHari = t => new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"});
    const teruji = c => Object.values(P.kode[c].vonis || {}).some(v => v[0] === "mengalahkan baseline");
    const perHari = hari.map((t, i) => ({tanggal: nmHari(t), butir: Besok.KOLOM.map(c => ({c, label: P.kode[c]?.label || c, lv: Besok.levelKode(k, KOL, i + 1, c)}))
      .filter(x => x.lv != null && P.kode[x.c]).map(x => ({...x, tingkat: TINGKAT[x.lv], teruji: teruji(x.c)}))}));
    const waspada = P.waspada.filter(x => x.kab === id).map(x => ({hari: nmHari(hari[x.tenggang - 1]), maka: x.maka}));
    const dibuat = new Date(P.dibuat).toLocaleString("id-ID", {day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(":", ".");
    // curah hujan per hari dari kolom HJN (tot = total mm, puncak = jam): angka yang sama dengan halaman /prediksi (pemilik 19 Nov 2026: "waspada curah hujan berapa")
    const ki = Object.fromEntries((P.kode.HJN.kol || []).map((n, i) => [n, i]));
    const hujan = i => { const r = k.HJN?.[i]; if (!r || r[ki.tot] == null) return ""; const v = r[ki.tot], mm = Math.round(v); if (v < 0.5) return "- Tidak hujan"; // kategori hujan harian BMKG
      const kat = v > 150 ? "ekstrem" : v > 100 ? "sangat lebat" : v > 50 ? "lebat" : v > 20 ? "sedang" : "ringan";
      return `- Hujan ${kat}: *${mm.toLocaleString("id-ID")} mm*${v >= 5 && r[ki.puncak] != null ? `, puncak sekitar pukul ${String(r[ki.puncak]).padStart(2, "0")}.00` : ""}`; };
    const baris = (h, i) => [hujan(i), ...h.butir.filter(x => x.lv >= 1 && x.c !== "HJN").map(x => `- ${x.label}: *${x.tingkat}*`)].filter(Boolean).join("\n") || "- Semua jenis ancaman Normal";
    const info = `*${k.nama}, ${k.pn}*${w.desa ? `\nDesa/Kel. ${w.desa}, Kec. ${w.kec}` : ""}\n\n*${perHari[0].tanggal}*\n${baris(perHari[0], 0)}${waspada.length ? `\n\n*Imbauan*\n${waspada.map(x => `- ${x.hari}: ${x.maka}`).join("\n")}` : ""}\n\nPrakiraan Centurisk97 diperbarui ${dibuat} WIB. Untuk peringatan resmi ikuti BMKG dan BPBD setempat.`;
    const prediksi = `*Prediksi 3 hari: ${k.nama}*\n${perHari.map((h, i) => `\n*${h.tanggal}*\n${baris(h, i)}`).join("\n")}\n\nDiperbarui ${dibuat} WIB.`;
    const kartu = perHari.map((h, i) => { const r = k.HJN?.[i]; return {tanggal: h.tanggal, hujanMm: r && r[ki.tot] != null ? Math.round(r[ki.tot]) : null, puncak: r?.[ki.puncak] ?? null,
      ancaman: h.butir.filter(x => x.lv >= 1 && x.c !== "HJN").map(x => ({label: x.label, tingkat: x.tingkat, lv: x.lv}))}; });
    return [200, {wilayah: w, kab: k.nama, prov: k.pn, info, prediksi, perHari: kartu, waspada, dibuat}];
  }

  /* ---------- tempat di sekitar lokasi kejadian untuk titik pengungsian dan nama fasilitas rusak ----------
     Dua sumber: data OSM lokal (public/data/osm_nasional) dan Overpass OSM (rumah ibadah, balai warga, sekolah, jalan dalam radius 3 km). */
  const cacheSekitar = new Map();   // ponytail: per isolat Worker, paling banyak 200 lokasi; pindah ke KV bila isolat sering berganti
  async function sekitar(q, L, ctx) {
    if (!L || L.lat == null) return [400, {galat: "Lokasi kejadian belum ada."}];
    const lat = Number(L.lat), lon = Number(L.lon), kunci = `${lat.toFixed(3)},${lon.toFixed(3)}`, JENIS_T = {sekolah: "Sekolah", pemerintahan: "Kantor atau balai", titik_kumpul: "Titik kumpul", puskesmas: "Puskesmas", rs: "Rumah sakit", klinik: "Klinik", jembatan: "Jembatan"};
    const rapikan = xs => { const unik = new Map(); for (const x of xs) { const k = x.nama.toLowerCase(); if (!unik.has(k) || unik.get(k).jarakKm > x.jarakKm) unik.set(k, x); }
      return [...unik.values()].sort((a, b) => a.jarakKm - b.jarakKm).map(x => ({...x, jarakKm: Math.round(x.jarakKm * 10) / 10})); };
    let c = cacheSekitar.get(kunci);
    if (!c) {
      const lokal = [], osm = await berkas(muat, `/data/osm_nasional/${L.wilayah?.provKode}.json`) || {};
      for (const [k, t] of Object.entries(JENIS_T)) for (const [la, lo, nama] of osm[k] || []) { const d = km(lat, lon, la, lo); if (d <= 5 && nama) lokal.push({nama, jenis: t, jarakKm: d}); }
      // rumah ibadah: berkas terpisah per provinsi (scripts/scrape/osm_nasional.py); Overpass sering gagal, jadi ini sumber utamanya
      const ib = await berkas(muat, `/data/osm_nasional/ibadah/${L.wilayah?.provKode}.json`);
      for (const [la, lo, nama] of ib || []) { const d = km(lat, lon, la, lo); if (d <= 5 && nama) lokal.push({nama, jenis: "Rumah ibadah", jarakKm: d}); }
      c = {semua: rapikan(lokal), lengkap: false, ibadahLokal: !!ib};
      if (cacheSekitar.size >= 200) cacheSekitar.delete(cacheSekitar.keys().next().value);
      cacheSekitar.set(kunci, c);
      const ql = `[out:json][timeout:8];(nwr(around:3000,${lat},${lon})["amenity"~"place_of_worship|school|community_centre|townhall|shelter|clinic|hospital|doctors"]["name"];way(around:1500,${lat},${lon})["highway"~"primary|secondary|tertiary|residential|unclassified"]["name"];);out center 160;`;
      c.overpass = fetch("https://overpass-api.de/api/interpreter", {method: "POST", body: new URLSearchParams({data: ql}), headers: {"user-agent": "lapor-bencana/0.1"}, signal: AbortSignal.timeout(10000)})
        .then(r => r.json()).then(J => { const JT = {place_of_worship: "Rumah ibadah", school: "Sekolah", community_centre: "Balai warga", townhall: "Kantor atau balai", shelter: "Shelter", clinic: "Klinik", hospital: "Rumah sakit", doctors: "Klinik"}, tambah = [];
          for (const e of J.elements || []) { const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon; if (la == null || !e.tags?.name) continue; tambah.push({nama: e.tags.name, jenis: e.tags.highway ? "Jalan" : JT[e.tags.amenity] || "Tempat", jarakKm: km(lat, lon, la, lo)}); }
          c.semua = rapikan([...c.semua, ...tambah]); c.lengkap = true; })
        .catch(() => { cacheSekitar.delete(kunci); }); // gagal: dicoba lagi pada permintaan berikutnya
      ctx?.waitUntil?.(c.overpass);   // sisa unduhan tetap jalan sesudah jawaban terkirim
    }
    // Overpass ditunggu paling lama 2,5 detik, sisanya mengisi cache untuk ketukan berikutnya (pemilik 19 Nov 2026: "lama banget")
    const cukup = c.lengkap || (q.jenis === "ibadah" && c.ibadahLokal);   // daftar lokal sudah lengkap untuk rumah ibadah, Overpass hanya tambahan
    if (!cukup) await Promise.race([c.overpass, new Promise(r => setTimeout(r, 2500))]);
    const SARING = {pengungsian: /^(Sekolah|Kantor atau balai|Balai warga|Rumah ibadah|Titik kumpul|Shelter)$/, sekolah: /^Sekolah$/, faskes: /^(Puskesmas|Rumah sakit|Klinik)$/,
      ibadah: /^Rumah ibadah$/, jalan: /^(Jalan|Jembatan)$/};
    const semua = c.semua.filter(x => (SARING[q.jenis] || SARING.pengungsian).test(x.jenis));
    // cari per kata pada nama dan jenis, dengan sebutan sehari-hari ("balai desa" = kantor desa, "sd" = sekolah dasar); tidak ada yang cocok = tampilkan yang terdekat
    const SEBUT = {"Kantor atau balai": "balai desa kantor kelurahan aula", "Balai warga": "balai warga aula gedung serbaguna", "Rumah ibadah": "masjid musala mushola surau gereja pura vihara klenteng",
      "Sekolah": "sekolah sd smp sma smk madrasah", "Titik kumpul": "titik kumpul lapangan evakuasi", "Puskesmas": "puskesmas faskes", "Rumah sakit": "rs rsud rumah sakit faskes", "Klinik": "klinik faskes", "Jalan": "jalan jl", "Jembatan": "jembatan", "Shelter": "shelter tempat evakuasi"};
    const kata = String(q.q || "").slice(0, 80).trim().toLowerCase().split(/\s+/).filter(k => k && !KATA_UMUM.has(k));   // kata keadaan ("rusak", "putus") bukan bagian nama tempat
    const cocok = kata.length ? semua.filter(x => { const h = `${x.nama} ${x.jenis} ${SEBUT[x.jenis] || ""}`.toLowerCase(); return kata.every(k => h.includes(k)); }) : semua;
    if (q.semua) return [200, {tempat: semua.slice(0, 400), sebagian: !cukup}];   // layar menyaring sendiri saat diketik, tanpa menunggu server (pemilik 21 Nov 2026)
    return [200, {...(cocok.length ? {tempat: cocok.slice(0, 24)} : {tempat: semua.slice(0, 12), terdekat: true}), sebagian: !cukup}];
  }

  /* ---------- nomor penting di sekitar lokasi terverifikasi (pemilik 19 Nov 2026: damkar, BPBD daerah, rumah sakit terdekat, kepolisian) ----------
     BPBD: public/data/bpbd.json. Fasilitas: public/data/osm_nasional/<prov>.json (berkoordinat, tanpa nomor telepon). Nomor darurat nasional tetap. */
  const NOMOR_NASIONAL = [["112", "Darurat terpadu"], ["113", "Pemadam kebakaran"], ["119", "Ambulans dan gawat darurat"], ["110", "Polisi"], ["115", "SAR (Basarnas)"], ["117", "BNPB"]];
  const normKab = t => String(t || "").toLowerCase().replace(/kota administrasi|kabupaten|kab\.|kota|adm\./g, "").replace(/[^a-z]/g, "");
  async function penting(q) {
    let lat = Number(q.lat), lon = Number(q.lon), w = null;
    const B = await berkas(muat, "/data/bpbd.json");
    if (!B) return [503, {galat: "Data BPBD belum tersedia."}];
    const semuaKantor = B.kantor;
    if (adaKode(q.kode)) { // daerah tingkat kab/kec (mis. "Daerah terakhir" dari Info): titik acuan = kantor BPBD kab itu
      const d = (await wilayah.cariNama("", q.kode))[0]; w = d ? {...d, desa: null} : null;
      const k = w && semuaKantor.find(x => x.prov === w.provKode && normKab(x.kab) === normKab(w.kab));
      if (k) ({lat, lon} = k); else if (d) { const c = await wilayah.pusat(d.kode); if (c) ({lat, lon} = c); } // kantor BPBD kab belum terdata: pakai titik desa pertama di kab itu
    } else if (q.kode) { const c = await wilayah.pusat(String(q.kode)); if (c) ({lat, lon, wilayah: w} = c); }
    else if (Number.isFinite(lat) && Number.isFinite(lon)) w = await wilayah(lat, lon);
    if (!w || !Number.isFinite(lat)) return [400, {galat: "Lokasi belum terbaca. Pakai lokasi saat ini atau cari desa Anda."}];
    const kantor = semuaKantor.filter(x => x.prov === w.provKode);
    const nomor = t => /\d{3}/.test(t || "") ? String(t).replace(/[^\d+ -]/g, "").trim() : null;
    const bpbdKab = kantor.find(x => normKab(x.kab) === normKab(w.kab)) || kantor.filter(x => !/provinsi/i.test(x.nama)).sort((a, b) => km(lat, lon, a.lat, a.lon) - km(lat, lon, b.lat, b.lon))[0];
    const bpbdProv = kantor.find(x => /provinsi/i.test(x.nama));
    /* nomor dari panen situs resmi .go.id (bpbd_kontak.json, K88); kantor bpbd.json hanya untuk alamat, arah, dan jarak.
       Kantor kab lain yang terdekat tidak pernah diberi nomor kab ini, dan sebaliknya. */
    const K = await berkas(muat, "/data/bpbd_kontak.json"), wk = {...w, kabKode: w.kabKode || String(w.kode || "").slice(0, 5)};
    const kKab = kontakBpbd({wilayah: Object.fromEntries(Object.entries(K?.wilayah || {}).filter(([k]) => k.length === 4))}, wk);
    const kProv = kontakBpbd({wilayah: Object.fromEntries(Object.entries(K?.wilayah || {}).filter(([k]) => k.length === 2))}, wk);
    const kabIni = x => x && normKab(x.kab) === normKab(w.kab) && !/provinsi/i.test(x.nama);
    const bp = x => x && {nama: /provinsi/i.test(x.nama) ? `BPBD Provinsi ${w.prov}` : `BPBD ${x.kab}`, alamat: x.alamat || null,
      nomor: /provinsi/i.test(x.nama) ? (kProv.tingkat === "prov" ? kProv.nomor : nomor(x.pusdalops)) : kabIni(x) ? (kKab.tingkat === "kab" ? kKab.nomor : nomor(x.pusdalops)) : null,
      jarakKm: Math.round(km(lat, lon, x.lat, x.lon) * 10) / 10, lat: x.lat, lon: x.lon};
    const osm = await berkas(muat, `/data/osm_nasional/${w.provKode}.json`) || {};
    // OSM kadang menandai puskesmas sebagai rumah sakit: pindahkan menurut namanya
    const pkm = /^(puskesmas|pustu|poskesdes|polindes)\b/i;
    // OSM juga menandai pos Satpol PP dan Dishub sebagai kantor polisi: bukan polisi, dibuang
    const bukanPolisi = /\b(satpol|satuan polisi pamong|pamong praja|dishub|dinas perhubungan)\b/i;
    const pilah = jenis => jenis === "rs" ? (osm.rs || []).filter(x => !pkm.test(x[2] || "")) : jenis === "puskesmas" ? [...(osm.puskesmas || []), ...(osm.rs || []).filter(x => pkm.test(x[2] || ""))]
      : jenis === "polisi" ? (osm.polisi || []).filter(x => !bukanPolisi.test(x[2] || "")) : osm[jenis] || [];
    const dekat = (jenis, n) => pilah(jenis).map(([la, lo, nama]) => ({nama, lat: la, lon: lo, jarakKm: Math.round(km(lat, lon, la, lo) * 10) / 10})).sort((a, b) => a.jarakKm - b.jarakKm).slice(0, n);
    // kantor kab ini belum terdata di bpbd.json tetapi nomornya tercatat: tampilkan BPBD kab ini, bukan kantor kab tetangga
    const bKab = kabIni(bpbdKab) ? bp(bpbdKab) : kKab.tingkat === "kab" ? {nama: kKab.nama, alamat: null, nomor: kKab.nomor, jarakKm: null} : bp(bpbdKab);
    const bProv = bp(bpbdProv) || (kProv.tingkat === "prov" ? {nama: kProv.nama, alamat: null, nomor: kProv.nomor, jarakKm: null} : null);
    const dk = kontakDamkar(K, wk);
    return [200, {wilayah: w, nasional: NOMOR_NASIONAL.map(([n, l]) => ({nomor: n, label: l})), bpbd: [bKab, bProv].filter(Boolean), damkar: dk,
      rs: dekat("rs", 3), puskesmas: dekat("puskesmas", 2), polisi: dekat("polisi", 2)}];
  }
  /* ---------- rapor daerah (pemilik 22 Nov 2026: rapor wilayah /akademisi masuk bot, hanya yang terkait bencana; KEPUTUSAN-LAPOR-AI K89) ----------
     Angka sama dengan tab Wilayah /akademisi (renderWil, kondisiWil): indeks risiko = rata-rata kecamatan tanpa bobot, kejadian = DIBI setahun,
     status darurat yang masih berlaku, titik panas 24 jam di dalam batas kab (data lebih tua dari 12 jam = tidak ditampilkan, bukan 0),
     gunung api level Waspada ke atas dalam 60 km dari pusat kab. Hanya berkas publik; lembaga, logbook, dan kesiapan daerah (R2 staf) tidak ikut. */
  const namaKab = t => String(t || "").toLowerCase().replace(/^kabupaten\s+/, "").trim();
  async function rapor(q) {
    let w = null;
    if (adaKode(q.kode)) { const d = (await wilayah.cariNama("", q.kode))[0]; w = d ? {...d, desa: null} : null; }
    else if (q.kode) w = (await wilayah.pusat(String(q.kode)))?.wilayah;
    else if (Number.isFinite(Number(q.lat)) && Number.isFinite(Number(q.lon)) && q.lat != null) w = await wilayah(Number(q.lat), Number(q.lon));
    if (!w) return [404, {galat: "Lokasi tidak terbaca sebagai desa di Indonesia."}];
    const [R, D, S, T, A, G] = await Promise.all(["/banjir/data/risiko_kecamatan.json", "/data/dibi_kejadian.json", "/data/status_darurat.json", "/data/titik24.json",
      "/banjir/data/abu_gunungapi.json", `/geo/kabupaten/${w.provKode}.json`].map(j => berkas(muat, j)));
    const nk = namaKab(w.kab), pv = w.provKode, kini = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    // indeks risiko
    let risiko = null;
    if (R) { const ki = Object.fromEntries(R.kolom.map((n, i) => [n, i])), kec = R.kec.filter(r => r[ki.prov] === pv && namaKab(r[ki.kab]) === nk), sk = kec.filter(r => r[ki.risiko] != null);
      if (sk.length) { const skor = sk.reduce((a, r) => a + r[ki.risiko], 0) / sk.length, kelas = R.kelas[R.ambang.filter(x => skor >= x).length];
        const pend = kec.reduce((a, r) => a + (r[ki.pend] || 0), 0), tinggi = sk.filter(r => r[ki.risiko] >= R.ambang[1]).sort((a, b) => b[ki.risiko] - a[ki.risiko]);
        risiko = {skor: Math.round(skor), kelas, kecamatan: kec.length, penduduk: pend || null, kecTinggi: tinggi.length, contohTinggi: tinggi.slice(0, 3).map(r => r[ki.kec])}; } }
    // kejadian DIBI setahun
    let kejadian = null;
    if (D) { const xs = D.kejadian.filter(x => x.kab_kode === w.kabKode), per = new Map(); let n = 0, meninggal = 0, terdampak = 0, mengungsi = 0;
      for (const x of xs) { const k = x.kejadian || 1; n += k; per.set(x.jenis, (per.get(x.jenis) || 0) + k); meninggal += x.meninggal || 0; terdampak += x.terdampak || 0; mengungsi += x.mengungsi || 0; }
      kejadian = {dari: D.dari, sampai: D.sampai, total: n, jenis: [...per].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([jenis, n]) => ({jenis, n})), meninggal, terdampak, mengungsi}; }
    // status keadaan darurat yang masih berlaku hari ini
    // tanpa tanggal berakhir: dianggap berlaku sampai batas pedoman (batas_hari: 14 kab, 31 prov), bukan selamanya
    const sampaiBatas = x => new Date(Date.parse(`${x.mulai}T00:00:00Z`) + ((x.batas_hari || 14) - 1) * 864e5).toISOString().slice(0, 10);
    const darurat = S ? S.sk.filter(x => String(x.prov_kode) === pv && (x.skala !== "kabupaten" || x.kab_kode === w.kabKode) && x.mulai && x.mulai <= kini && (x.berakhir ? x.berakhir >= kini : sampaiBatas(x) >= kini))
      .map(x => ({status: x.status, jenis: x.jenis, skala: x.skala, mulai: x.mulai, berakhir: x.berakhir || null})) : null;
    // batas kab untuk titik panas dan pusat kab untuk gunung api
    const f = G?.features?.find(g => namaKab(g.properties.kab) === nk), c = f && cincinDari(f.geometry), b = c && kotak(c);
    const segar = T?.acuan && Date.now() - Date.parse(T.acuan) < 12 * 36e5;
    const titik = c && segar ? {n: T.titik.filter(([la, lo]) => lo >= b[0] && lo <= b[2] && la >= b[1] && la <= b[3] && dalam(lo, la, c)).length, acuan: T.acuan} : null;
    const pusatK = b && [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2];
    const gunung = pusatK && A ? A.gunung.filter(g => g.level >= 2).map(g => ({nama: g.nama, level: g.level, tingkat: TINGKAT[g.level - 1], jarakKm: Math.round(km(pusatK[0], pusatK[1], g.lat, g.lon))}))
      .filter(g => g.jarakKm <= 60).sort((a, b) => b.level - a.level || a.jarakKm - b.jarakKm) : null;
    const tgl = t => new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
    const angka = v => v.toLocaleString("id-ID");
    const teks = [`*Rapor daerah: ${w.kab}, ${w.prov}*`,
      risiko ? `\n*Tingkat risiko bencana: ${risiko.kelas}*\n- ${angka(risiko.kecamatan)} kecamatan${risiko.kecTinggi ? `, ${angka(risiko.kecTinggi)} di antaranya berisiko tinggi` : ""}` : "\n*Tingkat risiko bencana:* belum ada data",
      darurat?.length ? `\n*Status keadaan darurat berlaku*\n${darurat.map(x => `- ${x.status}: ${x.jenis} (tingkat ${x.skala}), ${tgl(x.mulai)}${x.berakhir ? ` sampai ${tgl(x.berakhir)}` : ""}`).join("\n")}` : "",
      kejadian ? `\n*Kejadian bencana ${tgl(kejadian.dari)} sampai ${tgl(kejadian.sampai)}: ${angka(kejadian.total)}*${kejadian.jenis.map(x => `\n- ${x.jenis}: ${angka(x.n)}`).join("")}` : "",
      titik ? `\n*Titik panas 24 jam terakhir:* ${angka(titik.n)}` : "",
      gunung?.length ? `\n*Gunung api terdekat*\n${gunung.map(g => `- ${g.nama}: ${g.tingkat}, ${angka(g.jarakKm)} km`).join("\n")}` : "",
      "\nSumber: DIBI BNPB, data.bnpb.go.id, NASA FIRMS, PVMBG, indeks risiko Centurisk97."].filter(Boolean).join("\n");
    return [200, {wilayah: w, kab: w.kab, prov: w.prov, risiko, kejadian, darurat, titik, gunung, teks}];
  }
  return {daerah, sekitar, penting, rapor};
}
