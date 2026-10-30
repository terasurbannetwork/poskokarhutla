/* SIPPA: Rencana kunjungan (keputusan 64). Fungsi murni tanpa DOM dan tanpa fetch; layar di layar_kunjungan.js.
   Titik selalu [lat, lon] (satu-satunya pengecualian: rute akses [lon, lat] dan URL OSRM, lon dulu). Tidak ada data di berkas ini. */

export const MAKS_LOKASI = 10, MAKS_TIM = 4, MAKS_HARI = 7;
export const KECEPATAN_KMJ = 40, FAKTOR_JALAN = 1.4, RADIUS_TITIK_KM = 1, JAM_24 = -24;
const BATAS_ID = /^K[0-9]+$/;

/* ---------- jarak ---------- */
export function kmLurus(a, b) {
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(x)));
}
export function perkiraanJalan(lurusKm) {
  const jalanKm = lurusKm * FAKTOR_JALAN;
  return {jalanKm, menit: jalanKm / KECEPATAN_KMJ * 60, sumber: "perkiraan"};
}
export const dalamIndonesia = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= -11 && lat <= 6 && lon >= 94 && lon <= 142;
/* "lat, lon" biasa atau tempelan Google Maps; titik desimal. null bila bukan dua angka atau di luar Indonesia */
export function bacaKoordinat(teks) {
  const m = String(teks ?? "").match(/-?\d+(?:\.\d+)?/g);
  if (!m || m.length !== 2) return null;
  const lat = Number(m[0]), lon = Number(m[1]);
  return dalamIndonesia(lat, lon) ? [lat, lon] : null;
}

/* ---------- pemilihan kandidat ---------- */
const sel = (lat, lon) => `${Math.floor(lat * 20)},${Math.floor(lon * 20)}`;   // sel 0,05 derajat, jauh di atas 1 km
function gridTitik(titik) {
  const k = titik?.kolom ?? [], ix = n => k.indexOf(n), g = new Map();
  const [iLat, iLon, iJam, iFrp, iHit] = ["lat", "lon", "jam", "frp", "hitung"].map(ix);
  for (const b of titik?.baris ?? []) {
    const t = {lat: b[iLat], lon: b[iLon], jam: b[iJam], frp: b[iFrp], hitung: iHit < 0 ? 1 : b[iHit]};
    const c = sel(t.lat, t.lon);
    (g.get(c) ?? g.set(c, []).get(c)).push(t);
  }
  return g;
}
function titikDekat(g, lat, lon) {
  const a = Math.floor(lat * 20), o = Math.floor(lon * 20), hasil = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const t of g.get(`${a + i},${o + j}`) ?? []) if (kmLurus([lat, lon], [t.lat, t.lon]) <= RADIUS_TITIK_KM) hasil.push(t);
  return hasil;
}
function petaKonsesi(konsesi) {
  const m = new Map(), k = konsesi?.kolom ?? [], iId = k.indexOf("id");
  for (const b of konsesi?.baris ?? []) m.set(b[iId], [b[k.indexOf("jenis_utama")], b[k.indexOf("jenis")]].map(x => String(x ?? "")).join(" "));
  return m;
}
const adaLain = s => /(^|[^a-z])lain([^a-z]|$)/i.test(s ?? "");
function klusterTerdekat(kluster, lat, lon) {
  let terbaik = null, jarak = 2;
  for (const f of kluster?.features ?? []) {
    const p = f.properties ?? {}, d = kmLurus([lat, lon], [p.lat, p.lon]);
    if (d <= jarak) { jarak = d; terbaik = p; }
  }
  return terbaik;
}
const parkirDari = (k, a) => Array.isArray(a.rute) && a.rute.length >= 2 ? [a.rute[a.rute.length - 2][1], a.rute[a.rute.length - 2][0]] : [k.lat, k.lon];

/* alasan dugaan tambang atau sumber panas tetap; null bila tidak ada. dekat = titik <= 1 km dalam 72 jam */
/* sumber panas tetap terdaftar (titik_palsu.json, non-kawah) dalam 1 km. Kolom hitung hotspot72 BUKAN penanda industri:
   hitung 0 = deteksi ganda piksel yang sama di hari yang sama (harian.py); titik industri sudah dibuang pipeline sebelum hotspot72. */
export function palsuDekat(palsu, lat, lon) {
  const s = (palsu?.sumber_statis ?? []).find(x => x.jenis !== "kawah" && kmLurus([lat, lon], [x.lat, x.lon]) <= 1);
  return s ? s.nama || s.jenis : null;
}
export function alasanDugaan(dekat, konsesiTeks, kl, palsuNama = null) {
  const a = [];
  if (palsuNama) a.push(`dekat sumber panas tetap terdaftar (${palsuNama})`);
  if (adaLain(konsesiTeks)) a.push("di areal konsesi tambang atau lain");
  const w = kl?.wt;
  if (dekat.length && dekat.every(t => Number(t.frp) <= 5) && w && w.n > 0 && w.a / w.n >= 0.5 && w.k >= 3) a.push("api lemah menahun di tempat yang sama, ciri api batubara atau tambang");
  return a.length ? a.join("; ") : null;
}

export function pilihKandidat({kompleks = [], akses = [], konsesi = null, titik = null, kluster = null, palsu = null, awal, prov, radiusKm = 300, jumlah = 6, sertakanTerdekat = true, termasukDugaan = false}) {
  const maks = Math.max(1, Math.min(MAKS_LOKASI, Math.floor(jumlah) || 1)), grid = gridTitik(titik), kons = petaKonsesi(konsesi);
  const aks = new Map((Array.isArray(akses) ? akses : akses?.kompleks ?? []).map(a => [a.id, a]));
  const semua = [];
  for (const k of kompleks) {
    if (k.prov !== prov) continue;
    const a = aks.get(k.id);
    if (!a || a.tak_terjangkau || a.kaki_tak_realistis) continue;
    semua.push({k, a, lurusKm: kmLurus(awal, [k.lat, k.lon])});
  }
  semua.sort((x, y) => x.lurusKm - y.lurusKm);
  const bangun = ({k, a, lurusKm}) => {
    const dekat = titikDekat(grid, k.lat, k.lon), kl = klusterTerdekat(kluster, k.lat, k.lon);
    const sisa = Number.isFinite(kl?.wt?.sisa) ? kl.wt.sisa : null, kakiKm = a.km?.kaki ?? 0;
    return {
      id: k.id, kab: k.kab ?? null, lat: k.lat, lon: k.lon, parkir: parkirDari(k, a), kakiKm, kakiMenit: Number.isFinite(a.menit?.kaki) ? a.menit.kaki : Math.round(kakiKm / 2 * 60),
      n24: dekat.filter(t => t.jam > JAM_24 && t.hitung === 1).length, n24Semua: dekat.filter(t => t.jam > JAM_24).length,
      sisa, sisaTahu: sisa != null, hari: Number.isFinite(kl?.hari) ? kl.hari : null, lurusKm, dugaan: alasanDugaan(dekat, kons.get(k.id), kl, palsuDekat(palsu, k.lat, k.lon)), terdekat: false,
    };
  };
  const lolos = [];
  for (const s of semua) {
    if (s.lurusKm > radiusKm) break;   // sudah urut jarak
    const c = bangun(s);
    if (c.n24 < 1 || (c.sisa != null && c.sisa < 2) || (c.dugaan && !termasukDugaan)) continue;
    lolos.push(c);
  }
  lolos.sort((x, y) => y.n24 - x.n24 || x.lurusKm - y.lurusKm);
  const hasil = lolos.slice(0, maks);
  if (sertakanTerdekat) {
    for (const s of semua) {   // urut jarak: yang pertama punya titik panas 24 jam dipakai, radius diabaikan
      const c = hasil.find(h => h.id === s.k.id) ?? bangun(s);
      if (c.n24Semua < 1) continue;
      c.terdekat = true;
      if (!hasil.includes(c)) { if (hasil.length >= maks) hasil.pop(); hasil.push(c); }
      break;
    }
  }
  return hasil;
}

/* ---------- OSRM ---------- */
export const urlOsrmTable = titik => `https://router.project-osrm.org/table/v1/driving/${titik.map(p => `${p[1]},${p[0]}`).join(";")}?annotations=duration,distance`;
/* {menit[][], km[][]} dengan null untuk pasangan tanpa rute; null bila bentuk balasan salah */
export function bacaOsrm(j, n) {
  const bentuk = m => Array.isArray(m) && m.length === n && m.every(r => Array.isArray(r) && r.length === n);
  if (j?.code !== "Ok" || !bentuk(j.durations) || !bentuk(j.distances)) return null;
  const ubah = (m, b) => m.map(r => r.map(v => Number.isFinite(v) ? v / b : null));
  return {menit: ubah(j.durations, 60), km: ubah(j.distances, 1000)};
}
/* matriks lengkap: OSRM bila ada, selain itu perkiraan per pasangan; sumber[i][j] "osrm" | "perkiraan" */
export function gabungMatriks(titik, osrm) {
  const n = titik.length, menit = [], km = [], sumber = [];
  for (let i = 0; i < n; i++) {
    menit.push([]); km.push([]); sumber.push([]);
    for (let j = 0; j < n; j++) {
      if (i === j) { menit[i].push(0); km[i].push(0); sumber[i].push("osrm"); continue; }
      const m = osrm?.menit?.[i]?.[j], d = osrm?.km?.[i]?.[j];
      if (Number.isFinite(m) && Number.isFinite(d)) { menit[i].push(m); km[i].push(d); sumber[i].push("osrm"); }
      else { const p = perkiraanJalan(kmLurus(titik[i], titik[j])); menit[i].push(p.menit); km[i].push(p.jalanKm); sumber[i].push("perkiraan"); }
    }
  }
  return {menit, km, sumber};
}

/* ---------- tim, urutan, hari ---------- */
const arah = (a, p) => Math.atan2((p[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), p[0] - a[0]);
const titikLokasi = l => l.parkir ?? [l.lat, l.lon];
/* bagi menurut sudut dari awal: urut sudut, potong di celah terlebar supaya sektor bersambung, lalu bagi rata jumlahnya */
export function bagiTim(lokasi, awal, nTim) {
  const n = lokasi.length, t = Math.max(1, Math.floor(nTim) || 1), hasil = Array.from({length: t}, () => []);
  if (!n) return hasil;
  const u = lokasi.map(l => ({l, s: arah(awal, titikLokasi(l))})).sort((x, y) => x.s - y.s);
  let mulai = 0, celah = -1;
  for (let i = 0; i < n; i++) {
    const g = (u[(i + 1) % n].s - u[i].s + 2 * Math.PI) % (2 * Math.PI) || (n === 1 ? 2 * Math.PI : 0);
    if (g > celah) { celah = g; mulai = (i + 1) % n; }
  }
  const urut = Array.from({length: n}, (_, i) => u[(mulai + i) % n].l);
  let p = 0;
  for (let i = 0; i < t; i++) { const jml = Math.floor(n / t) + (i < n % t ? 1 : 0); hasil[i] = urut.slice(p, p + jml); p += jml; }
  return hasil;
}

const biayaJalur = (u, M, awal) => { let t = 0, p = awal; for (const i of u) { t += M[p][i]; p = i; } return t; };
/* jalur terbuka (tanpa pulang) dari awalIdx; <= 8 lokasi dicoba semua urutan, selebihnya tetangga terdekat + 2-opt */
export function urutTermurah(idxs, M, awalIdx = 0) {
  let terbaik;
  if (idxs.length <= 8) {
    let min = Infinity;
    const cari = (sisa, jalur, biaya) => {
      if (biaya >= min) return;
      if (!sisa.length) { min = biaya; terbaik = jalur; return; }
      const p = jalur.length ? jalur[jalur.length - 1] : awalIdx;
      sisa.forEach((x, i) => cari(sisa.filter((_, j) => j !== i), [...jalur, x], biaya + M[p][x]));
    };
    cari(idxs, [], 0);
  } else {
    const sisa = [...idxs]; terbaik = []; let p = awalIdx;
    while (sisa.length) { let b = 0; sisa.forEach((x, i) => { if (M[p][x] < M[p][sisa[b]]) b = i; }); p = sisa.splice(b, 1)[0]; terbaik.push(p); }
    for (let baik = true; baik;) {
      baik = false;
      for (let i = 0; i < terbaik.length - 1; i++) for (let j = i + 1; j < terbaik.length; j++) {
        const c = [...terbaik.slice(0, i), ...terbaik.slice(i, j + 1).reverse(), ...terbaik.slice(j + 1)];
        if (biayaJalur(c, M, awalIdx) < biayaJalur(terbaik, M, awalIdx) - 1e-9) { terbaik = c; baik = true; }
      }
    }
  }
  terbaik = terbaik ?? [];
  const menit = biayaJalur(terbaik, M, awalIdx);
  return {urutan: terbaik, menit, menitPulang: menit + (terbaik.length ? M[terbaik[terbaik.length - 1]][awalIdx] : 0)};
}

/* urutan = [{idx, id, kakiMenit}]. Waktu lapangan satu lokasi = diLokasiMenit + jalan kaki pergi pulang. Hari berikut mulai dari lokasi terakhir hari sebelumnya (menginap di sana). */
export function pecahHari(urutan, M, {awalIdx = 0, batasMenit = 600, diLokasiMenit = 150} = {}) {
  const hari = []; let p = awalIdx, h = null;
  for (const s of urutan) {
    const mobil = M[p][s.idx], lap = diLokasiMenit + 2 * (s.kakiMenit ?? 0);
    if (h && h.menitTotal + mobil + lap > batasMenit) { hari.push(h); h = null; }
    if (!h) { h = {no: hari.length + 1, asalIdx: p, ids: [], idx: [], menitMobil: 0, menitLapangan: 0, menitTotal: 0, menginap: false}; }
    h.ids.push(s.id); h.idx.push(s.idx); h.menitMobil += mobil; h.menitLapangan += lap; h.menitTotal += mobil + lap; p = s.idx;   // hari baru mulai dari lokasi terakhir kemarin
  }
  if (h) hari.push(h);
  hari.forEach((d, i) => { d.menginap = i < hari.length - 1; });
  return hari;
}

/* rencana utuh. kandidat[i] = titik matriks i+1, titik 0 = awal; matriks dari gabungMatriks. */
export function susunRencana({kandidat, awal, nTim, matriks, batasMenit = 600, diLokasiMenit = 150}) {
  const idx = new Map(kandidat.map((c, i) => [c.id, i + 1])), baris = {};
  const kelompok = bagiTim(kandidat, awal, Math.min(nTim, kandidat.length)).filter(g => g.length);
  const tim = kelompok.map((g, i) => {
    const o = urutTermurah(g.map(c => idx.get(c.id)), matriks.menit, 0);
    const lok = o.urutan.map(ix => kandidat[ix - 1]);
    const hari = pecahHari(lok.map(c => ({idx: idx.get(c.id), id: c.id, kakiMenit: c.kakiMenit})), matriks.menit, {batasMenit, diLokasiMenit});
    let p = 0;
    for (const c of lok) {
      const ix = idx.get(c.id);
      baris[c.id] = {lurusKm: c.lurusKm, jalanKm: matriks.km[p][ix], mobilMenit: matriks.menit[p][ix], kakiKm: c.kakiKm, sumber: matriks.sumber[p][ix], dari: p};
      p = ix;
    }
    return {no: i + 1, lokasi: lok, hari, menit: o.menit, menitPulang: o.menitPulang};
  });
  return {awal, tim, baris};
}

/* ---------- Google Maps ---------- */
const dec = v => Number(v).toLocaleString("en-US", {minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false});
const kor = p => `${dec(p[0])},${dec(p[1])}`;
const tautanPotong = (p, mode) => `https://www.google.com/maps/dir/?api=1&origin=${kor(p[0])}&destination=${kor(p[p.length - 1])}${p.length > 2 ? `&waypoints=${p.slice(1, -1).map(kor).join("%7C")}` : ""}&travelmode=${mode}`;
/* jalur berurutan p (asal, ..., tujuan) jadi satu atau lebih tautan; tiap tautan paling banyak 9 titik antara */
export function tautanJalur(p, mode = "driving") {
  const hasil = [];
  for (let i = 0; i < p.length - 1; i += 10) hasil.push(tautanPotong(p.slice(i, Math.min(i + 11, p.length)), mode));
  return hasil;
}
export const tautanSemua = (awal, lokasi) => tautanJalur([awal, ...lokasi.map(titikLokasi), awal]);
export const tautanTim = (awal, lokasi) => tautanJalur([awal, ...lokasi.map(titikLokasi)]);
export const tautanHari = (asal, lokasi) => tautanJalur([asal, ...lokasi.map(titikLokasi)]);

/* ---------- kontrak server ---------- */
const bulat1 = x => Math.round(Math.min(5000, Math.max(0, x)) * 10) / 10;
const lat5 = x => Math.round(x * 1e5) / 1e5;
/* rencana = keluaran susunRencana. Hasilnya persis kontrak POST /api/sippa/renlap `kunjungan` (v1). */
export function kunjunganUntukServer(rencana) {
  const jarak = {};
  for (const t of rencana.tim) for (const c of t.lokasi) {
    const b = rencana.baris[c.id];
    jarak[c.id] = {lurus_km: bulat1(b.lurusKm), jalan_km: bulat1(b.jalanKm), mobil_menit: Math.round(Math.min(5000, Math.max(0, b.mobilMenit))), kaki_km: bulat1(b.kakiKm), sumber: b.sumber === "osrm" ? "osrm" : "perkiraan"};
  }
  return {v: 1, awal: {lat: lat5(rencana.awal[0]), lon: lat5(rencana.awal[1])}, tim: rencana.tim.map(t => ({no: t.no, hari: t.hari.map(h => ({no: h.no, ids: [...h.ids]}))})), jarak};
}
export const idSah = id => BATAS_ID.test(String(id));
