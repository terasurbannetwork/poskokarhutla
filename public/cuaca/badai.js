"use strict";
/* ================================================================ badai: dua kartu pengamatan di Insight /cuaca (H91)
   1. Embusan awan badai terekam: kunci embusan_badai per stasiun di ../banjir/data/cuaca_metar.json (scripts/cuaca/metar.py, A1). Hanya enam jam terakhir.
      Stasiun tanpa kunci itu = pipeline belum menghitung, kartu dibuang (bukan "tidak ada embusan").
   2. Awan tumbuh cepat: /api/awan_tumbuh (Worker membaca R2 data/awan_tumbuh.json seperti /api/himawari; TIDAK ada di public/; scripts/udara/awan_tumbuh.py, A2), Himawari-9 pita 13, dua pindaian berjarak 30 menit.
   Keduanya pengamatan, bukan peringatan resmi BMKG. Indeks badai (CAPE, geseran angin) tidak ditampilkan (KEPUTUSAN Q2). Berkas hilang = kartu dibuang (A18). */
const Badai = (() => {
  const JAM6 = 6 * 36e5, D = {}, K = 273.15;
  /* zona dari bujur: ponytail: garis kasar (WIB < 114,6; WIT >= 127), bandara di dekat batas bisa meleset; ganti ke kolom zona bila metar.py menulisnya */
  const zona = lon => lon >= 127 ? ["WIT", "Asia/Jayapura"] : lon >= 114.6 ? ["WITA", "Asia/Makassar"] : ["WIB", "Asia/Jakarta"];
  const jam = (t, lon) => { const [n, tz] = zona(lon ?? 107); return new Date(t).toLocaleTimeString("id-ID", {timeZone: tz, hour: "2-digit", minute: "2-digit"}).replace(":", ".") + " " + n; };
  const tgl = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"}).replace(",", "").replace(":", ".") + " WIB";
  const pil = (teks, w) => `<span class="pl" style="--w:${w}">${teks}</span>`;
  async function muat() {
    if (D.siap) return D;
    D.siap = true;
    const [mt, at] = await Promise.all([Tambahan.muat("mt"), muatJSON("/api/awan_tumbuh").catch(() => null)]);
    const t = SEKARANG();
    if (mt?.stasiun?.some(s => "embusan_badai" in s))
      D.emb = mt.stasiun.flatMap(s => (s.embusan_badai || []).map(e => ({...e, t: Date.parse(e.waktu), s}))).filter(e => t - e.t <= JAM6 && e.t <= t + 36e5);
    if (at?.kab && Date.parse(at.jam_pengamatan_utc)) {
      D.tt = {t: Date.parse(at.jam_pengamatan_utc), sumber: at.sumber, baris: Object.entries(at.kab).filter(([, v]) => v.tumbuh || v.puncak_tembus)
        .map(([kode, v]) => ({kode, nama: v.kab, prov: kode.slice(0, 2), dT: v.delta_k < 0 ? -v.delta_k : 0, tb: v.tb_min_k - K, tumbuh: v.tumbuh}))};
    }
    return D;
  }
  const kalimat = e => [`suhu turun ${fmt(Math.round(-e.dT))} °C`, e.dQ >= 1 && `tekanan naik ${fmt(e.dQ)} hPa`,
    e.arah_sebelum != null && e.arah_sesudah != null && `angin berbalik dari ${e.arah_sebelum}° ke ${e.arah_sesudah}°`].filter(Boolean).join(", ");
  return {muat, jam, tgl, pil, kalimat, D};
})();

Insight.T.embusan = {urut: "t", turun: true, hal: 0};
Insight.T.tumbuh = {urut: "dT", turun: true, hal: 0};
Insight.EX.splice(Insight.EX.indexOf("awan") + 1, 0, "embusan", "tumbuh");
Object.assign(Insight.LABEL, {embusan: "Embusan awan badai terekam", tumbuh: "Awan tumbuh cepat"});
IK.embusan = '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>';
IK.tumbuh = '<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path d="M12 22v-6m0 0-2 2m2-2 2 2"/>';
const BADAI_DIAM = () => 'style="cursor:default"';   /* baris tabel tidak punya aksi: kursor biasa */
Object.assign(Insight, {
  exEmbusan() { const E = Badai.D.emb; if (!E) return "";
    const src = `<p class="fnd">Sumber data:  BMKG Aviation dan aviationweather.gov (NOAA), METAR/SPECI bandara.</p>`;
    const ket = `<p class="fnd">${Badai.pil("Pengamatan", "#2b8c86")} Tanda gelombang angin dari awan badai di satu titik bandara: suhu turun cepat, tekanan naik, atau arah angin berbalik. Ini bukan peringatan resmi BMKG.</p>`;
    if (!E.length) return this.ex("Embusan awan badai terekam", "", "", `${ket}<p class="fnd">Tidak ada bandara yang mencatat tanda itu dalam 6 jam terakhir. Bandara hanya mewakili satu titik, jadi angin kencang di tempat lain bisa tidak terekam.</p>${src}`, "");
    const kol = [{k: "t", n: "Waktu", num: 1, v: r => r.t, h: r => Badai.jam(r.t, r.s.lon)},
      {k: "b", n: "Bandara", v: r => r.s.nama, h: r => `<span translate="no">${esc(r.s.nama)}</span> <small translate="no">${esc(r.s.icao)}</small>`},
      {k: "u", n: "Yang terekam", v: r => r.dT, h: r => esc(Badai.kalimat(r))},
      {k: "g", n: "Embusan", num: 1, v: r => r.embusan_kmj ?? -1, h: r => r.embusan_kmj != null ? fmt(r.embusan_kmj) + " km/jam" : "–"}];
    const kuat = E.filter(e => e.kuat).length;
    const ring = `<p class="fnd">${fmt(E.length)} embusan terekam di ${fmt(new Set(E.map(e => e.s.icao)).size)} bandara dalam 6 jam terakhir${kuat ? `, ${fmt(kuat)} di antaranya kuat` : ""}.</p>`;
    return this.ex("Embusan awan badai terekam", "", "", ket + ring + this.tabel("embusan", kol, E, 5, "embusan", BADAI_DIAM) + src, ""); },
  exTumbuh() { const A = Badai.D.tt; if (!A) return "";
    const R = A.baris, basi = SEKARANG() - A.t > 6 * 36e5, src = `<p class="fnd">Sumber data:  Himawari-9 pita 13 (inframerah 10,4 mikron), NOAA open data; analisis Centurisk97, citra ${Badai.tgl(A.t)}.</p>`;
    const tg = `<span title="Citra satelit, bukan pengukuran di lokasi">${Badai.tgl(A.t)}</span>`;
    const ket = `<p class="fnd">${Badai.pil("Pengamatan · uji", "#7a4fc4")} Tanda awal, bukan peringatan resmi BMKG. Suhu puncak awan dibandingkan dua pindaian citra berjarak 30 menit di titik contoh sekitar 11 km, jadi sel kecil bisa terlewat. Belum terbukti berkaitan dengan hujan lebat atau angin kencang.</p>`
      + (basi ? `<p class="fnd">Citra terakhir ini dari ${tg}, bukan kondisi terkini.</p>` : "");
    if (!R.length) return this.ex("Awan tumbuh cepat", "", "", ket + `<p class="fnd">Tidak ada awan yang tumbuh cepat pada citra ${Badai.tgl(A.t)}.</p>` + src, "");
    const top = [...R].sort((a, b) => b.dT - a.dT)[0], nT = R.filter(r => r.tumbuh).length;
    const kol = [{k: "kab", n: "Kabupaten/kota", v: r => r.nama, h: r => `<span translate="no">${esc(r.nama)}</span>, ${esc(namaProv(r.prov))}`},
      {k: "dT", n: "Puncak mendingin", t: "Penurunan suhu puncak awan terdingin dalam 30 menit", num: 1, v: r => r.dT, h: r => r.dT ? `±${fmt(Math.round(r.dT))} °C` : "–"},
      {k: "tb", n: "Suhu puncak (±)", t: "Perkiraan satelit: suhu puncak awan terdingin di kabupaten pada citra ini", num: 1, v: r => -r.tb, h: r => `${fmt(Math.round(r.tb)).replace("-", "−")} °C`},
      {k: "tanda", n: "Tanda", v: r => +r.tumbuh, h: r => r.tumbuh ? Badai.pil("Tumbuh cepat", "#7a4fc4") : Badai.pil("Puncak sangat dingin", "#a98bd6")}];
    const ring = `<p class="fnd">${fmt(nT)} kabupaten/kota punya awan tumbuh cepat; puncak mendingin paling cepat ±${fmt(Math.round(top.dT))} °C dalam 30 menit di ${this.nm2s(top.nama)}.</p>`;
    return this.ex("Awan tumbuh cepat", "", "", ket + ring + this.tabel("tumbuh", kol, R, 10, "kabupaten/kota", BADAI_DIAM) + src, ""); },
});
