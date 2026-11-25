"use strict";
/* ================================================================ badai: dua kartu pengamatan di Insight /cuaca (H91)
   1. Embusan awan badai terekam: kunci embusan_badai per stasiun di ../banjir/data/cuaca_metar.json (scripts/cuaca/metar.py, A1). Hanya enam jam terakhir.
      Stasiun tanpa kunci itu = pipeline belum menghitung, kartu dibuang (bukan "tidak ada embusan").
   2. Awan tumbuh cepat: /api/awan_tumbuh (Worker membaca R2 data/awan_tumbuh.json seperti /api/himawari; TIDAK ada di public/; scripts/udara/awan_tumbuh.py, A2), Himawari-9 pita 13, dua pindaian berjarak 30 menit.
   3. Jam rawan hujan (H13, A3): data/jam_hujan.json (scripts/cuaca/jam_hujan.py, IMERG per jam), kab.<kode>.{semua|DJF|MAM|JJA|SON}.{jam_puncak, jendela_70, peluang_jam, merata, n_hari}, jam lokal.
   4. Bibit siklon (H91, A6): kunci bibit dan pasangan_pusaran di ../banjir/data/cuaca_siklon.json (siklon.py, JTWC abio10/abpw10). Kunci bibit tidak ada = kartu dibuang.
   Semuanya pengamatan atau catatan, bukan peringatan resmi BMKG. Indeks badai (CAPE, geseran angin) tidak ditampilkan (KEPUTUSAN Q2). Berkas hilang = kartu dibuang (A18). */
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
    const [mt, at, jh, sk, wl] = await Promise.all([Tambahan.muat("mt"), muatJSON("/api/awan_tumbuh").catch(() => null), muatJSON("data/jam_hujan.json").catch(() => null),
      muatJSON("../banjir/data/cuaca_siklon.json").catch(() => null), muatJSON("/data/bnpb/wilayah.json").catch(() => null)]);
    const t = SEKARANG();
    if (mt?.stasiun?.some(s => "embusan_badai" in s))
      D.emb = mt.stasiun.flatMap(s => (s.embusan_badai || []).map(e => ({...e, t: Date.parse(e.waktu), s}))).filter(e => t - e.t <= JAM6 && e.t <= t + 36e5);
    if (at?.kab && Date.parse(at.jam_pengamatan_utc)) {
      D.tt = {t: Date.parse(at.jam_pengamatan_utc), sumber: at.sumber, baris: Object.entries(at.kab).filter(([, v]) => v.tumbuh || v.puncak_tembus)
        .map(([kode, v]) => ({kode, nama: v.kab, prov: kode.slice(0, 2), dT: v.delta_k < 0 ? -v.delta_k : 0, tb: v.tb_min_k - K, tumbuh: v.tumbuh}))};
    }
    if (jh?.kab && wl?.kab) {
      const ms = ["DJF", "DJF", "MAM", "MAM", "MAM", "JJA", "JJA", "JJA", "SON", "SON", "SON", "DJF"][new Date(t + 7 * 36e5).getUTCMonth()], nm = Object.fromEntries(wl.kab.map(w => [w.kode, w]));
      D.jh = {ms, baris: Object.entries(jh.kab).flatMap(([kode, v]) => { const m = v[ms] || v.semua, w = nm[kode]; return m && w ? [{kode, nama: w.nama, prov: w.prov, m, p: m.peluang_jam[m.jam_puncak]}] : []; })};
    }
    if (Array.isArray(sk?.bibit)) D.bb = {bibit: sk.bibit, pusaran: sk.pasangan_pusaran, dibuat: Date.parse(sk.dibuat) || null};
    return D;
  }
  const jj = h => String((h + 24) % 24).padStart(2, "0") + ".00";
  const zn = p => ["81", "82", "91", "92", "93", "94", "95", "96"].includes(p) ? "WIT" : ["51", "52", "53", "63", "64", "65", "71", "72", "73", "74", "75", "76"].includes(p) ? "WITA" : "WIB";
  const kalimat = e => [`suhu turun ${fmt(Math.round(-e.dT))} °C`, e.dQ >= 1 && `tekanan naik ${fmt(e.dQ)} hPa`,
    e.arah_sebelum != null && e.arah_sesudah != null && `angin berbalik dari ${e.arah_sebelum}° ke ${e.arah_sesudah}°`].filter(Boolean).join(", ");
  return {muat, jam, tgl, pil, kalimat, jj, zn, D};
})();

Insight.T.embusan = {urut: "t", turun: true, hal: 0};
Insight.T.tumbuh = {urut: "dT", turun: true, hal: 0};
Insight.T.jam = {urut: "p", turun: true, hal: 0};
Insight.T.bibit = {urut: "w", turun: true, hal: 0};
Insight.EX.splice(Insight.EX.indexOf("awan") + 1, 0, "embusan", "tumbuh", "jam", "bibit");
Object.assign(Insight.LABEL, {embusan: "Embusan awan badai terekam", tumbuh: "Awan tumbuh cepat", jam: "Jam rawan hujan", bibit: "Bibit siklon"});
IK.jam = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
IK.bibit = '<path d="M12 12a2 2 0 1 0 0 .01M12 6a6 6 0 0 1 6 6M12 2a10 10 0 0 1 10 10M12 18a6 6 0 0 1-6-6M12 22A10 10 0 0 1 2 12"/>';
IK.embusan = '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>';
IK.tumbuh = '<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path d="M12 22v-6m0 0-2 2m2-2 2 2"/>';
const BADAI_DIAM = () => 'style="cursor:default"';   /* baris tabel tidak punya aksi: kursor biasa */
Object.assign(Insight, {
  exEmbusan() { const E = Badai.D.emb; if (!E) return "";
    const ket = `<p class="fnd">${Badai.pil("Pengamatan", "#2b8c86")} Tanda gelombang angin dari awan badai di satu titik bandara: suhu turun cepat, tekanan naik, atau arah angin berbalik. Ini bukan peringatan resmi BMKG.</p>`;
    if (!E.length) return this.ex("Embusan awan badai terekam", "", "", `${ket}<p class="fnd">Tidak ada bandara yang mencatat tanda itu dalam 6 jam terakhir. Bandara hanya mewakili satu titik, jadi angin kencang di tempat lain bisa tidak terekam.</p>`, "");
    const kol = [{k: "t", n: "Waktu", t: "Asal data: BMKG Aviation dan aviationweather.gov (NOAA), METAR/SPECI bandara", num: 1, v: r => r.t, h: r => Badai.jam(r.t, r.s.lon)},
      {k: "b", n: "Bandara", v: r => r.s.nama, h: r => `<span translate="no">${esc(r.s.nama)}</span> <small translate="no">${esc(r.s.icao)}</small>`},
      {k: "u", n: "Yang terekam", v: r => r.dT, h: r => esc(Badai.kalimat(r))},
      {k: "g", n: "Embusan", num: 1, v: r => r.embusan_kmj ?? -1, h: r => r.embusan_kmj != null ? fmt(r.embusan_kmj) + " km/jam" : "–"}];
    const kuat = E.filter(e => e.kuat).length;
    const ring = `<p class="fnd">${Badai.pil(fmt(E.length) + " embusan", "#c9503a")} ${Badai.pil(fmt(new Set(E.map(e => e.s.icao)).size) + " bandara", "#2b8c86")}${kuat ? " " + Badai.pil(fmt(kuat) + " kuat", "#7a1f2b") : ""}</p>`;
    return this.ex("Embusan awan badai terekam", "", "", ket + ring + this.tabel("embusan", kol, E, 5, "embusan", BADAI_DIAM), ""); },
  exTumbuh() { const A = Badai.D.tt; if (!A) return "";
    const R = A.baris, basi = SEKARANG() - A.t > 6 * 36e5;
    const tg = `<span title="Citra satelit, bukan pengukuran di lokasi">${Badai.tgl(A.t)}</span>`;
    const ket = `<p class="fnd">${Badai.pil("Pengamatan, uji", "#7a4fc4")} Tanda awal, bukan peringatan resmi BMKG. Suhu puncak awan dibandingkan dua pindaian citra berjarak 30 menit di titik contoh sekitar 11 km, jadi sel kecil bisa terlewat. Belum terbukti berkaitan dengan hujan lebat atau angin kencang.</p>`
      + (basi ? `<p class="fnd">Citra terakhir ini dari ${tg}, bukan kondisi terkini.</p>` : "");
    if (!R.length) return this.ex("Awan tumbuh cepat", "", "", ket + `<p class="fnd">Tidak ada awan yang tumbuh cepat pada citra ${Badai.tgl(A.t)}.</p>`, "");
    const nT = R.filter(r => r.tumbuh).length;
    const kol = [{k: "kab", n: "Kabupaten/kota", t: `Asal data: Himawari-9 pita 13 (inframerah 10,4 mikron), NOAA open data; analisis Centurisk97, citra ${Badai.tgl(A.t)}`, v: r => r.nama, h: r => `<span translate="no">${esc(r.nama)}</span>, ${esc(namaProv(r.prov))}`},
      {k: "dT", n: "Puncak mendingin", t: "Penurunan suhu puncak awan terdingin dalam 30 menit", num: 1, v: r => r.dT, h: r => r.dT ? `turun ${fmt(Math.round(r.dT))} °C` : "–"},
      {k: "tb", n: "Suhu puncak", t: "Perkiraan satelit: suhu puncak awan terdingin di kabupaten pada citra ini", num: 1, v: r => -r.tb, h: r => `${fmt(Math.round(r.tb)).replace("-", "−")} °C`},
      {k: "tanda", n: "Tanda", v: r => +r.tumbuh, h: r => r.tumbuh ? Badai.pil("Tumbuh cepat", "#7a4fc4") : Badai.pil("Puncak sangat dingin", "#a98bd6")}];
    const ring = `<p class="fnd">${Badai.pil(fmt(nT) + " tumbuh cepat", "#7a4fc4")} ${Badai.pil(fmt(R.length - nT) + " puncak sangat dingin", "#a98bd6")}</p>`;
    return this.ex("Awan tumbuh cepat", "", "", ket + ring + this.tabel("tumbuh", kol, R, 10, "kabupaten/kota", BADAI_DIAM), ""); },
  exJam() { const J = Badai.D.jh; if (!J) return "";
    const R = J.baris.filter(r => !r.m.merata), ms = {DJF: "Des sampai Feb", MAM: "Mar sampai Mei", JJA: "Jun sampai Agu", SON: "Sep sampai Nov"}[J.ms];
    const ket = `<p class="fnd">${Badai.pil("Pengamatan", "#2b8c86")} Jam hujan paling sering di tiap kabupaten/kota pada musim berjalan (${ms}), dari hujan satelit IMERG per jam. Hujan lokal yang deras bisa tidak terukur, dan fasenya bisa bergeser sekitar 1 jam, jadi baca sebagai ±. Ini pola lama, bukan peringatan dan bukan prakiraan hari ini.</p>`;
    if (!R.length) return this.ex("Jam rawan hujan", "", "", ket + `<p class="fnd">Tidak ada kabupaten/kota dengan pola jam yang jelas pada musim ini.</p>`, "");
    const kol = [{k: "kab", n: "Kabupaten/kota", t: "Asal data: NASA IMERG Half-Hourly, analisis Centurisk97; jam setempat tiap wilayah", v: r => r.nama, h: r => `<span translate="no">${esc(r.nama)}</span>, ${esc(namaProv(r.prov))}`},
      {k: "j", n: "Jam puncak", t: "Jam dengan hujan terbanyak (jam setempat)", num: 1, v: r => r.m.jam_puncak, h: r => `±${Badai.jj(r.m.jam_puncak)} ${Badai.zn(r.prov)}`},
      {k: "w", n: "Jendela 70% hujan", t: "Rentang jam bersambung terpendek yang menampung 70% hujan", v: r => r.m.jendela_70?.panjang ?? 99, h: r => r.m.jendela_70 ? `${Badai.jj(r.m.jendela_70.mulai)} sampai ${Badai.jj(r.m.jendela_70.mulai + r.m.jendela_70.panjang)}` : "–"},
      {k: "p", n: "Hari berhujan di jam puncak", t: "Bagian hari yang jam puncaknya hujan 1 mm atau lebih", num: 1, v: r => r.p, h: r => fmt(Math.round(r.p * 100)) + "%"}];
    return this.ex("Jam rawan hujan", "", "", ket + `<p class="fnd">${Badai.pil(fmt(R.length) + " jam menonjol", "#2b8c86")} ${Badai.pil(fmt(J.baris.length - R.length) + " merata", "#a98bd6")}</p>` + this.tabel("jam", kol, R, 10, "kabupaten/kota", BADAI_DIAM), ""); },
  exBibit() { const B = Badai.D.bb; if (!B) return "";
    const ll = b => `${fmt(Math.abs(b.lat))}° ${b.lat < 0 ? "LS" : "LU"}, ${fmt(Math.abs(b.lon))}° BT`, W = {LOW: ["rendah", 1], MEDIUM: ["sedang", 2], HIGH: ["tinggi", 3]}, pl = x => W[String(x).toUpperCase()];
    const ket = `<p class="fnd">${Badai.pil("Pengamatan", "#2b8c86")} Daerah awan yang dipantau JTWC (Angkatan Laut AS) karena bisa berkembang menjadi siklon tropis. Ini bibit, bukan siklon, dan bukan peringatan resmi BMKG.${B.dibuat ? ` Terbitan ${Badai.tgl(B.dibuat)}.` : ""}</p>`;
    const pus = B.pusaran && !(Array.isArray(B.pusaran) && !B.pusaran.length) ? `<p class="fnd">Tercatat pasangan pusaran pada terbitan JTWC terakhir.</p>` : "";
    if (!B.bibit.length) return this.ex("Bibit siklon", "", "", ket + `<p class="fnd">Tidak ada bibit siklon di Samudra Hindia dan Pasifik Barat pada terbitan terakhir JTWC.</p>` + pus, "");
    const kol = [{k: "n", n: "Bibit", t: "Asal data: JTWC, Significant Tropical Weather Advisory (ABIO10 dan ABPW10)", v: r => String(r.nama ?? r.id ?? ""), h: r => `<span translate="no">${esc(r.nama ?? r.id ?? "–")}</span>`},
      {k: "l", n: "Posisi", v: r => r.lat, h: r => r.lat != null && r.lon != null ? ll(r) : "–"},
      {k: "a", n: "Angin maksimum", num: 1, v: r => r.angin_kt ?? -1, h: r => r.angin_kt != null ? `${fmt(Math.round(r.angin_kt * 1.852))} km/jam` : "–"},
      {k: "t", n: "Tekanan", num: 1, v: r => r.tekanan_hpa ?? -1, h: r => r.tekanan_hpa != null ? fmt(r.tekanan_hpa) + " hPa" : "–"},
      {k: "w", n: "Peluang jadi siklon", t: "Penilaian JTWC dalam 24 jam", v: r => pl(r.peluang)?.[1] ?? 0, h: r => pl(r.peluang) ? Badai.pil(pl(r.peluang)[0], "#7a4fc4") : "–"}];
    return this.ex("Bibit siklon", "", "", ket + `<p class="fnd">${Badai.pil(fmt(B.bibit.length) + " bibit dipantau", "#7a4fc4")}</p>` + this.tabel("bibit", kol, B.bibit, 5, "bibit", BADAI_DIAM) + pus, ""); },
});
