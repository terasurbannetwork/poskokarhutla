"use strict";
/* ================================================================ kalender rob 30 hari
   Satu baris kotak harian dari indeks gaya pasang astronomis (data/pasang_astro.json, scripts/banjir/pasang_astro.py).
   Indeks itu BUKAN tinggi muka air dan BUKAN prakiraan rob, jadi labelnya "kekuatan pasang". Fase Bulan dihitung di sini
   (Meeus bab 49, suku utama, meleset kurang dari satu jam). Kotak oranye = pasang tinggi (ambang dari berkas) DAN hujan
   diprakirakan di titik itu. Hari di luar jangkauan prakiraan hujan tidak dianggap kering: kotaknya bergaris putus.
   Kerja murni (fase, pilih, gabung hujan, kalimat) dipisah dari html() supaya bisa diuji di node. */
const KalenderRob = (() => {
  const HUJAN_MIN = 5; /* mm/hari: batas hujan ringan BMKG */
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const OR = "#e58a45", BIRU = "#4f8fc4";
  const tambah = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const selisih = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
  const rad = d => d * Math.PI / 180;
  const tgl = iso => { const [, m, d] = iso.split("-"); return `${+d} ${BLN[m - 1]}`; };
  const tglPanjang = iso => new Date(iso + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"});

  /* saat fase k (k bulat = Bulan baru, k+0,5 = purnama), JDE menurut Meeus bab 49 (suku utama) */
  function jdFase(k, purnama) {
    const T = k / 1236.85, E = 1 - 0.002516 * T,
      M = rad(2.5534 + 29.1053567 * k), Mp = rad(201.5643 + 385.81693528 * k), F = rad(160.7108 + 390.67050284 * k),
      c = purnama ? [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209] : [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208];
    return 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T
      + c[0] * Math.sin(Mp) + c[1] * E * Math.sin(M) + c[2] * Math.sin(2 * Mp) + c[3] * Math.sin(2 * F)
      + c[4] * E * Math.sin(Mp - M) + c[5] * E * Math.sin(Mp + M) + c[6] * E * E * Math.sin(2 * M);
  }
  /* tanggal WIB (YYYY-MM-DD) dari JDE */
  const tglWib = jd => new Date((jd - 2440587.5) * 864e5 + 7 * 36e5).toISOString().slice(0, 10);

  /* {tanggal: "purnama" | "baru"} untuk [dari, dari+n hari) */
  function fase(dari, n = 30) {
    const ke = tambah(dari, n), out = {}, k0 = Math.floor((Date.parse(dari + "T00:00:00Z") / 864e5 + 2440587.5 - 2451550.1) / 29.530588861) - 1;
    for (let k = k0; k <= k0 + Math.ceil(n / 29.5) + 2; k += 0.5) {
      const t = tglWib(jdFase(k, k % 1 !== 0));
      if (t >= dari && t < ke) out[t] = k % 1 ? "purnama" : "baru";
    }
    return out;
  }

  /* profil pasang untuk wilayah "prov|kab" (daftar titik di berkas); selain itu 'lain' */
  const profil = (pa, kab) => pa.profil.pantura?.titik?.includes(kab) ? "pantura" : "lain";

  /* hujan harian (mm) di sel terdekat: {tanggal: mm}; null bila tak ada sel dalam satu sel kisi */
  function hujanTitik(hujan, lat, lon) {
    if (!hujan?.grid?.length || typeof lat !== "number" || typeof lon !== "number") return null;
    let best = null, bd = Infinity;
    for (const g of hujan.grid) { const d = Math.hypot(g.lat - lat, g.lon - lon); if (d < bd) { bd = d; best = g; } }
    if (!best || bd > (hujan.sel || 0.25)) return null;
    const o = {}; hujan.hari.forEach((t, i) => { if (best.h[i] != null) o[t] = best.h[i]; });
    return o;
  }

  /* n kotak dari 'mulai'. hujanHari: {tanggal: mm} atau null. Kotak: {tgl, g, tinggi, fase, mm, oranye}; mm null = hujan belum diprakirakan */
  function pilih(pa, {profilNama = "lain", mulai, n = 30, hujanHari = null} = {}) {
    const g = pa.seri.g[profilNama], amb = pa.pasang_tinggi[profilNama].ambang, mulai0 = mulai || pa.seri.t0, fs = fase(mulai0, n), out = [];
    for (let i = 0; i < n; i++) {
      const t = tambah(mulai0, i), j = selisih(pa.seri.t0, t);
      if (j < 0 || j >= g.length) continue;
      const mm = hujanHari && hujanHari[t] != null ? hujanHari[t] : null, tinggi = g[j] >= amb;
      out.push({tgl: t, g: g[j], tinggi, fase: fs[t] || null, mm, oranye: tinggi && mm != null && mm >= HUJAN_MIN});
    }
    return {hari: out, ambang: amb};
  }

  /* kalimat ringkas: angka dan tanggal kunci duluan */
  function kalimat(hari) {
    if (!hari.length) return "";
    const ora = hari.filter(h => h.oranye), tin = hari.filter(h => h.tinggi), luar = tin.filter(h => h.mm == null);
    const fs = h => h.fase ? `, ${h.fase === "purnama" ? "purnama" : "bulan baru"}` : "";
    let s;
    if (ora.length) { const h = ora.reduce((a, b) => b.g > a.g ? b : a); s = `${tgl(h.tgl)}: pasang kuat${fs(h)} dan hujan ${Math.round(h.mm)} mm diprakirakan, siagakan pompa dan tanggul sebelum harinya.`; if (ora.length > 1) s += ` Ada ${ora.length} hari seperti ini.`; }
    else if (tin.length) { const h = tin.reduce((a, b) => b.g > a.g ? b : a); s = `Pasang paling kuat ${tgl(h.tgl)}${fs(h)}; tidak ada hari pasang tinggi yang bersamaan dengan hujan prakiraan.`; }
    else return "Tidak ada hari pasang tinggi dalam 30 hari ke depan.";
    if (luar.length) s += ` ${luar.length} hari pasang tinggi ada di luar jangkauan prakiraan hujan, jadi belum bisa dinilai.`;
    return s;
  }

  function tip(h, ambang) {
    const kat = h.tinggi ? "tinggi" : h.g >= ambang * 0.7 ? "sedang" : "rendah";
    return `<b>${tglPanjang(h.tgl)}</b><br>Kekuatan pasang ${kat}`
      + (h.fase ? `<br>${h.fase === "purnama" ? "Bulan purnama" : "Bulan baru"}` : "")
      + `<br>${h.mm == null ? "Hujan belum diprakirakan" : `Hujan prakiraan ${Math.round(h.mm)} mm`}`
      + (h.oranye ? "<br><b>Pasang tinggi dan hujan: siagakan pompa</b>" : "");
  }

  /* opsi: {pa, hujan, lat, lon, kab:"prov|kab", profil, mulai, n}. Mengembalikan HTML kartu (kosong bila data tak ada) */
  function html(o = {}) {
    const pa = o.pa; if (!pa?.seri?.g) return "";
    const nama = o.profil || (o.kab ? profil(pa, o.kab) : "lain"), mulai = o.mulai || new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);   /* hari ini WIB, bukan hari_ini data hujan yang bisa basi */
    const {hari, ambang} = pilih(pa, {profilNama: nama, mulai, n: o.n || 30, hujanHari: hujanTitik(o.hujan, o.lat, o.lon)});
    if (!hari.length) return "";
    /* dua baris 15 hari supaya kotak dan tanggal terbaca di laci sempit; tinggi batang direntang min-maks 30 hari agar beda hari tampak */
    const W = 20, H = 44, BR = 15, Wt = W * Math.min(BR, hari.length), gs = hari.map(h => h.g), g0 = Math.min(...gs), g1 = Math.max(...gs), rg = g1 - g0 || 1;
    const kotak = hari.map((h, j) => {
      const i = j % BR, oy = Math.floor(j / BR) * (H + 12), x = i * W, tt = 6 + (h.g - g0) / rg * 24, y = oy + 14 + 30 - tt, isi = h.oranye ? OR : BIRU, op = h.tinggi ? 1 : 0.35;
      const garis = h.tinggi && h.mm == null ? ` stroke="${OR}" stroke-width="1.2" stroke-dasharray="2 2"` : "";
      const bln = h.fase ? `<circle cx="${x + W / 2}" cy="${oy + 7}" r="4" ${h.fase === "purnama" ? `fill="var(--ink)"` : `fill="none" stroke="var(--ink)" stroke-width="1.4"`}/>` : "";
      return `<g data-tip="${tip(h, ambang)}"><rect x="${x}" y="${oy}" width="${W}" height="${H + 6}" fill="transparent"/>${bln}<rect x="${x + 2}" y="${y}" width="${W - 4}" height="${tt}" rx="2" fill="${isi}" opacity="${op}"${garis}/>`
        + `<text x="${x + W / 2}" y="${oy + H + 6}" text-anchor="middle" font-size="9.5" font-weight="${+h.tgl.slice(8) === 1 || j === 0 ? 700 : 400}" fill="var(--ink2)">${+h.tgl.slice(8)}</text></g>`;
    }).join("");
    const lg = (c, t, ex = "") => `<span style="display:inline-flex;align-items:center;gap:4px"><i style="width:9px;height:9px;border-radius:2px;background:${c};${ex}"></i>${t}</span>`;
    return `<div class="kalrob"><span class="pill" style="background:#7a4fbf;color:#fff">Hipotesis</span><p class="fnd" style="margin:4px 0 6px;color:var(--ink);font-weight:600">${kalimat(hari)}</p>`
      + `<svg viewBox="0 0 ${Wt} ${Math.ceil(hari.length / BR) * (H + 12)}" width="100%" role="img" aria-label="Kalender kekuatan pasang 30 hari" style="display:block;overflow:visible">${kotak}</svg>`
      + `<div class="fnd" style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px">${lg(BIRU, "pasang tinggi")}${lg(BIRU, "pasang biasa", "opacity:.35")}${lg(OR, "pasang tinggi dan hujan prakiraan")}`
      + `<span style="display:inline-flex;align-items:center;gap:4px"><i style="width:9px;height:9px;border-radius:2px;border:1.2px dashed ${OR}"></i>pasang tinggi, hujan belum diprakirakan</span>`
      + `<span>Bulatan penuh purnama, bulatan kosong bulan baru</span></div>`
      + `<p class="fnd" style="margin-top:4px">Kekuatan pasang adalah angka 0 sampai 1 dari posisi Bulan dan Matahari, bukan tinggi air dan bukan prakiraan rob; angin, gelombang, tekanan udara, dan penurunan tanah belum masuk. Bobot pasang harian dan setengah harian masih asumsi. Sumber: hitungan posisi Bulan dan Matahari${pa.dibuat ? `, dibuat ${tgl(pa.dibuat.slice(0, 10))}` : ""}, hujan prakiraan Open-Meteo.</p></div>`;
  }

  const muat = () => (muat.p ||= fetch("data/pasang_astro.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null));
  return {html, muat, pilih, fase, hujanTitik, kalimat, profil, HUJAN_MIN};
})();
self.KalenderRob = KalenderRob;
