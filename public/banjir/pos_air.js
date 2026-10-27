"use strict";
/* Pos tinggi air sungai terukur (SIHKA, Kementerian PU) di peta /banjir: pin kapsul, sungai mengalir, kartu pos, daftar pos macet.
   Bagian murni (PosAir) diuji di tests/banjir/pos_air.test.mjs; bagian peta (PosUkur, Alir) memakai peta/Analisa/nanti dari skrip lain. */
globalThis.PosAir = (() => {
  const R = 6378137, DEG = 180 / Math.PI;
  const NAMA = {biasa: "Biasa", naik_di_atas_biasa: "Naik di atas biasa", tertinggi: "Tertinggi", lama: "Data lama", macet: "Macet", bukan_tinggi: "Bukan tinggi air", riwayat_kurang: "Riwayat kurang", pantauan_terbatas: "Pantauan terbatas", data_bolong: "Data bolong"};
  const WARNA = {biasa: "#3f7fb8", naik_di_atas_biasa: "#e58a45", tertinggi: "#c9503a", lama: "#8d9aa9", macet: "#8d9aa9", bukan_tinggi: "#8d9aa9", riwayat_kurang: "#c3ccd6", pantauan_terbatas: "#c3ccd6", data_bolong: "#8d9aa9"};
  /* isi air di kapsul: penanda relatif per status, bukan ukuran; pos tanpa pembanding tidak punya tinggi relatif */
  const ISI = {biasa: .5, naik_di_atas_biasa: .75, tertinggi: 1, lama: .3, macet: .3, bukan_tinggi: .3, riwayat_kurang: .4, pantauan_terbatas: .4, data_bolong: .3};
  const SATUAN = {centimeter: "cm", "m3/s": "m³/s"};
  /* status resmi (ambang siaga pengelola) menang atas status persentil, kecuali data lama atau macet */
  const RESMI = {"Normal": ["#3f7fb8", .5], "Siaga 3": ["#e3b94e", .65], "Siaga 2": ["#e58a45", .8], "Siaga 1": ["#c9503a", 1]};
  const PENGELOLA = "Kementerian PU, Ditjen SDA (SIHKA)";
  const resmi = p => p && !["lama", "macet", "bukan_tinggi", "data_bolong"].includes(p.status) && RESMI[p.status_resmi] ? p.status_resmi : null;
  const ikonKunci = p => resmi(p) ? "r-" + resmi(p).replace(" ", "") : p.status;
  const warnaPos = p => resmi(p) ? RESMI[resmi(p)][0] : warna(p.status);
  const isiPos = p => resmi(p) ? RESMI[resmi(p)][1] : ISI[p.status] ?? .3;
  const pengelola = p => p?.pengelola || PENGELOLA;
  const titik = p => typeof p.lon === "number" && typeof p.lat === "number" ? [p.lon, p.lat] : lonlat(p.x, p.y);
  const lonlat = (x, y) => [x / R * DEG, (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * DEG];
  const warna = s => WARNA[s] || WARNA.data_bolong;
  const nama = s => NAMA[s] || s;
  const redup = s => s === "lama" || s === "macet" || s === "bukan_tinggi" || s === "data_bolong";
  const denyut = s => s === "naik_di_atas_biasa" || s === "tertinggi";
  const denyutPos = p => resmi(p) ? p.status_resmi !== "Normal" : denyut(p.status);   /* semua Siaga berdenyut, juga Siaga 3 */
  const angkaId = v => v == null || isNaN(v) ? "–" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2});
  const satuan = s => s == null ? "" : (SATUAN[s] || s);
  /* satuan null: angka saja, tanpa konversi */
  const angka = (v, s) => v == null || isNaN(v) ? "–" : angkaId(v) + (satuan(s) ? " " + satuan(s) : "");
  const delta = (d, s) => d == null ? "–" : d > 0 ? "▲ " + angka(d, s) : d < 0 ? "▼ " + angka(Math.abs(d), s) : "tetap";
  const deltaKelas = d => d == null ? "" : d > 0 ? "naik" : d < 0 ? "turun" : "tetap";
  const detik = t => t > 1e12 ? t / 1000 : t;
  /* "Dibaca Sen 27 Okt 16.00 WIB" */
  const waktuBaca = t => { if (t == null) return "–";
    const p = Object.fromEntries(new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).formatToParts(new Date(detik(t) * 1000)).map(x => [x.type, x.value]));
    return `Dibaca ${p.weekday.replace(".", "")} ${p.day} ${p.month.replace(".", "")} ${p.hour}.${p.minute} WIB`; };
  /* nama pos untuk tampilan: SEMUA KAPITAL jadi Title Case; singkatan tanpa huruf hidup (BTB, JB) tetap kapital. Data tidak diubah */
  const SINGKAT = new Set(["pda", "awlr", "arr", "awr", "pduga", "pa", "ps", "btb", "plta", "das", "ii", "iii", "iv"]);   /* singkatan pos SIHKA tetap huruf besar */
  const judulPos = n => { n = String(n ?? ""); return n !== n.toUpperCase() ? n : n.toLowerCase().replace(/[a-z]+/g, w => /^[^aiueo]{2,3}$/.test(w) || SINGKAT.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)); };
  /* "Sel, 27 Okt 18.00 WIB"; "–" bila waktu tak ada */
  const waktuBacaRingkas = t => t == null ? "–" : waktuBaca(t).replace(/^Dibaca (\S+) /, "$1, ").replace(/^Dibaca /, "");
  const lalu = (t, now) => { if (t == null) return "–"; const j = Math.max(0, (now - detik(t)) / 3600); return j < 1 ? "kurang dari 1 jam lalu" : j < 48 ? Math.floor(j) + " jam lalu" : Math.floor(j / 24) + " hari lalu"; };
  /* pos lama dan macet, terlama mengirim di atas */
  const pilihMacet = pos => { const u = (s) => pos.filter(p => p.status === s).sort((a, b) => a.t - b.t); return {lama: u("lama"), macet: u("macet")}; };
  /* daftar macet per pengelola: [[pengelola, [pos lama dan macet, terlama dulu]]], kelompok terbanyak dulu */
  const macetPerPengelola = pos => { const m = pilihMacet(pos), g = new Map(); for (const p of [...m.macet, ...m.lama].sort((a, b) => a.t - b.t)) { const k = pengelola(p); g.set(k, [...(g.get(k) || []), p]); }
    return [...g].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])); };
  /* skala tegak ambang: tiga batas (cm) dan posisi nilai; null bila ambang tidak ada */
  const skala = p => { const a = p?.ambang; if (!a || a.siaga3 == null || a.siaga2 == null || a.siaga1 == null) return null;
    const b = [["Siaga 1", a.siaga1], ["Siaga 2", a.siaga2], ["Siaga 3", a.siaga3], ["Normal", null]]; return b.map(([n, v]) => ({nama: n, batas: v, warna: RESMI[n][0]})); };
  const geojson = pos => ({type: "FeatureCollection", features: (pos || []).map(p => ({type: "Feature", geometry: {type: "Point", coordinates: titik(p)},
    properties: {id: p.id, nama: p.nama, s: p.status, i: ikonKunci(p), a: cmTeks(p) ?? "", n: cmNilai(p) == null ? "" : fmtCm(cmNilai(p)), w: warnaPos(p), p: denyutPos(p) ? 1 : 0, u: denyutPos(p) ? 0 : redup(p.status) ? 2 : 1}}))});
  /* sorot pendek-panjang yang bergeser sepanjang garis tengah: 14 langkah, tiap pola berjumlah 7 */
  const T = 7, DS = 1.5, DASH = Array.from({length: 14}, (_, k) => { const g = k * T / 14; return g + DS <= T ? [0, +g.toFixed(2), DS, +(T - g - DS).toFixed(2)] : [+(g + DS - T).toFixed(2), T - DS, +(DS - (g + DS - T)).toFixed(2)]; });
  const JEDA = 90; /* ms antar pembaruan paint, sekitar 11 fps */
  const dash = ts => DASH[Math.floor(ts / JEDA) % DASH.length];
  const fase = ts => (ts % 1800) / 1800;
  const KEMBAR = p => ["lama", "macet", "bukan_tinggi", "data_bolong"].includes(p.status);
  const SIAGA = ["Siaga 1", "Siaga 2", "Siaga 3"];
  const kelas = p => KEMBAR(p) ? "mati" : resmi(p) || (p.status === "naik_di_atas_biasa" || p.status === "tertinggi" ? "naik" : "Normal");
  const WARNA_KELAS = {"Normal": RESMI["Normal"][0], "Siaga 3": RESMI["Siaga 3"][0], "Siaga 2": RESMI["Siaga 2"][0], "Siaga 1": RESMI["Siaga 1"][0], mati: "#8d9aa9", naik: "#e58a45"};
  /* hitungan untuk panel ringkas dan batang bertumpuk; pos yang naik masuk batang Normal tetapi dihitung terpisah */
  const ringkas = pos => { const h = {"Normal": 0, "Siaga 3": 0, "Siaga 2": 0, "Siaga 1": 0, mati: 0, naik: 0}; for (const p of pos || []) { const k = kelas(p); h[k === "naik" ? "Normal" : k]++; if (k === "naik") h.naik++; }
    return {...h, total: (pos || []).length, kirim: (pos || []).length - h.mati}; };
  const urutBerat = (a, b) => { const w = p => SIAGA.indexOf(kelas(p)) >= 0 ? SIAGA.indexOf(kelas(p)) : 3; return w(a) - w(b) || String(a.nama).localeCompare(String(b.nama), "id"); };
  const perluPantau = pos => (pos || []).filter(p => { const k = kelas(p); return SIAGA.includes(k) || k === "naik"; }).sort(urutBerat);
  const kalimat = pos => { const a = perluPantau(pos).filter(p => SIAGA.includes(kelas(p))), n = ringkas(pos).naik, t = [];
    if (a.length) t.push(`${angkaId(a.length)} pos di atas batas normal: ${a.slice(0, 3).map(p => `${p.nama} (${kelas(p)})`).join(", ")}${a.length > 3 ? ` dan ${angkaId(a.length - 3)} lainnya` : ""}.`);
    if (n) t.push(`${angkaId(n)} pos sedang naik.`); return t.join(" ") || "Tidak ada pos di atas batas normal."; };
  /* normalisasi ke cm: cm/centimeter apa adanya, m x100, mm /10. Satuan null (sumber tak mencantumkan) dan m3/s, mdpl bukan tinggi air: tanpa angka cm */
  const FAKTOR = {cm: 1, centimeter: 1, m: 100, mm: .1};
  const faktor = s => FAKTOR[s] ?? null;
  const cmNilai = p => p.v == null || faktor(p.satuan) == null ? null : p.v * faktor(p.satuan);
  const fmtCm = v => Number(v).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const cmTeks = p => { const c = cmNilai(p); return c == null ? null : fmtCm(c) + " cm"; };
  /* alasan tanpa angka, untuk kartu: kosong bila angka cm ada atau nilai memang kosong */
  const ketAngka = p => p.v == null || cmNilai(p) != null ? "" : p.satuan == null ? "Satuan tidak jelas" : "Bukan tinggi air";
  const teksPos = p => cmTeks(p) ?? "–";
  const deltaPos = p => faktor(p.satuan) == null ? "–" : delta(p.d3 == null ? null : p.d3 * faktor(p.satuan), "cm");
  /* posisi nilai terhadap Siaga 1 (0..1) untuk batang tipis; null bila tanpa ambang */
  const rasio = p => { const a = p?.ambang, c = cmNilai(p); return !a || a.siaga1 == null || c == null ? null : Math.max(0, Math.min(1, c / a.siaga1)); };
  /* kelompok per sungai; tanpa nama sungai jatuh ke kabupaten atau kota */
  const labelKab = kb => /^(Kota|Kabupaten|Kab\.) /.test(kb) ? kb.replace(/^Kabupaten /, "Kab. ") : "Kab. " + kb;
  /* kabupaten/kota terdekat dari koordinat pos lewat pusat kecamatan ({"prov|kab|kec": [lat, lon]}); null bila lebih jauh dari maksKm. Pos tanpa nama sungai dan kab jadi berkelompok bermakna */
  const kabTerdekat = (p, pusat, maksKm = 40) => { const [lo, la] = titik(p), kx = Math.cos(la * Math.PI / 180); let best = null, bd = Infinity;
    for (const k in pusat || {}) { const c = pusat[k], dx = (c[1] - lo) * kx, dy = c[0] - la, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
    return best && Math.sqrt(bd) * 111.32 <= maksKm ? best.split("|").slice(0, 2).join("|") : null; };
  /* cari(p) opsional: cadangan nama kelompok ("prov|kab") bila pos tanpa sungai dan kab */
  const kelompok = (pos, cari) => { const g = new Map(); for (const p of pos || []) { const kb = !p.sungai && !p.kab && !p.kota && cari ? cari(p) : null, k = p.sungai || (p.kab || p.kota ? "Kab. " + (p.kab || p.kota) : kb ? labelKab(kb.split("|")[1]) : "Tanpa nama sungai"); g.set(k, [...(g.get(k) || []), p]); }
    const penting = l => l.some(p => SIAGA.includes(kelas(p)) || kelas(p) === "naik") ? 1 : 0;   /* grup berpos Siaga atau naik di atas, lalu terbanyak */
    return [...g].map(([k, l]) => [k, l.sort(urutBerat)]).sort((a, b) => penting(b[1]) - penting(a[1]) || b[1].length - a[1].length || a[0].localeCompare(b[0], "id")); };
  /* pil status baris pos: nama Siaga resmi, "Tanpa batas" bila tanpa ambang, "Data lama" / "Macet" bila tidak mengirim */
  /* ikon garis (path viewBox 24) per label pil: Normal centang, Siaga segitiga, Data lama jam, Macet silang, Tanpa batas garis datar, naik gelombang naik */
  const IKON_PIL = {"Normal": "M5 12l4 4 10-10", "Siaga 3": "M12 3 2 20h20zM12 10v4M12 17v.5", "Siaga 2": "M12 3 2 20h20zM12 10v4M12 17v.5", "Siaga 1": "M12 3 2 20h20zM12 10v4M12 17v.5",
    "Data lama": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2", "Macet": "M6 6l12 12M18 6 6 18", "Tanpa batas": "M5 12h14", "Tanpa batas resmi": "M5 12h14", "Bukan tinggi air": "M5 12h14",
    "Naik di atas biasa": "M3 17l6-6 4 4 8-8M15 7h6v6", "Tertinggi": "M3 17l6-6 4 4 8-8M15 7h6v6", "Biasa": "M5 12l4 4 10-10"};
  const ikonPil = (label, w = 12) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON_PIL[label] || IKON_PIL["Tanpa batas"]}"/></svg>`;
  const pilLabel = p => { const r = resmi(p); return r || (p.status === "lama" ? "Data lama" : p.status === "macet" || p.status === "data_bolong" ? "Macet" : p.status === "bukan_tinggi" ? "Bukan tinggi air" : "Tanpa batas"); };
  /* tooltip batas: semua batas Siaga, tinggi sekarang, dan selisih ke batas berikut; null tanpa ambang */
  const d1 = v => Number(v).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " cm";
  const tipAmbang = p => { const a = p?.ambang; if (!a || a.siaga3 == null || a.siaga2 == null || a.siaga1 == null) return null; const c = cmNilai(p), bt = `Siaga 3 ${angka(a.siaga3, "cm")}, Siaga 2 ${angka(a.siaga2, "cm")}, Siaga 1 ${angka(a.siaga1, "cm")}`;
    if (c == null) return bt; const nb = menujuBatas(p); return `${bt}, sekarang ${d1(c)} (${nb ? `${d1(nb.cm)} di bawah batas ${nb.nama}` : `${d1(c - a.siaga1)} di atas batas Siaga 1`})`; };
  /* batang tipis: isi = tinggi sekarang relatif skala (0..100), tiga tik Siaga 3/2/1; null tanpa ambang */
  const batangAmbang = p => { const g = skalaGeom(p); if (!g) return null; const a = p.ambang, c = cmNilai(p), mx = g.mx || 1;
    return {isi: c == null ? 0 : Math.round(Math.max(0, Math.min(c, mx)) / mx * 100), tik: [["Siaga 3", a.siaga3], ["Siaga 2", a.siaga2], ["Siaga 1", a.siaga1]].map(([n, v]) => ({nama: n, pos: Math.round(Math.min(v, mx) / mx * 100), warna: RESMI[n][0]}))}; };
  const arah = (d, s) => d == null || d === 0 || faktor(s) == null ? "" : (d > 0 ? "naik " : "turun ") + angka(Math.abs(d) * faktor(s), "cm");
  const subjudul = p => [p.sungai, p.kota || p.kab].filter(Boolean).join(", ") || "Pos tinggi air";
  /* geometri skala tegak (viewBox 0..H): pita Normal, Siaga 3, 2, 1 dan garis air; null bila tanpa ambang */
  const skalaGeom = (p, H = 150) => { const a = p?.ambang, c = cmNilai(p); if (!a || a.siaga3 == null || a.siaga2 == null || a.siaga1 == null) return null;
    const mx = Math.max(a.siaga1 * 1.2, c ?? 0), y = v => +(H - Math.max(0, Math.min(v, mx)) / mx * H).toFixed(1), b = [[0, a.siaga3, "Normal"], [a.siaga3, a.siaga2, "Siaga 3"], [a.siaga2, a.siaga1, "Siaga 2"], [a.siaga1, mx, "Siaga 1"]];
    return {H, mx, pita: b.map(([lo, hi, n]) => ({nama: n, y0: y(hi), y1: y(lo), warna: RESMI[n][0], batas: n === "Normal" ? null : lo})), yAir: c == null ? null : y(c)}; };
  /* lingkaran kecil (radius km) sebagai cincin poligon untuk filter within */
  const lingkar = (lon, lat, km, n = 16) => { const dl = km / 111.32, dg = km / (111.32 * Math.cos(lat * Math.PI / 180)), r = [];
    for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; r.push([+(lon + dg * Math.cos(a)).toFixed(5), +(lat + dl * Math.sin(a)).toFixed(5)]); } r.push(r[0]); return r; };
  /* ruas sungai berwarna: pos Siaga, atau naik_di_atas_biasa tanpa ambang. Dengan nama waterway terdekat: tiga cincin (4,5 km pudar kuning, 3 km 70%, 1,5 km penuh) hanya untuk waterway bernama sama;
     tanpa nama: tiga cincin dirapatkan (1,5, 1, 0,5 km). Hasil: [{kelas, lapis: 0 luar | 1 tengah | 2 dalam, nama|null, g: MultiPolygon}], satu per (kelas, lapis, nama) */
  const KM_LAPIS = [4.5, 3, 1.5];
  const ruasLapis = (pos, namaDari) => { const m = new Map(); for (const p of pos || []) { const k = kelas(p); if (!SIAGA.includes(k) && !(k === "naik" && !p.ambang)) continue; const [lo, la] = titik(p), nm = namaDari ? namaDari(p) || null : null;
      for (const l of [0, 1, 2]) { const key = k + "|" + l + "|" + (nm || ""); (m.get(key) || m.set(key, {kelas: k, lapis: l, nama: nm, g: {type: "MultiPolygon", coordinates: []}}).get(key)).g.coordinates.push([lingkar(lo, la, nm ? KM_LAPIS[l] : KM_LAPIS[l] / 3)]); } }   /* tanpa nama: gradasi tetap ada, dirapatkan ke 1,5 km supaya tidak tumpah ke sungai lain */
    return [...m.values()]; };
  /* nama waterway terdekat dari titik: fitur [{properties: {name}, geometry}] hasil queryRenderedFeatures, jarak ke titik terdekat garis (km kasar) */
  const terdekatNama = (feats, lon, la) => { let best = null, bd = Infinity; const kx = Math.cos(la * Math.PI / 180);
    const jalan = (c, f) => { if (typeof c[0] === "number") { const d = Math.hypot((c[0] - lon) * kx, c[1] - la); if (d < bd) { bd = d; best = f.properties.name; } } else c.forEach(x => jalan(x, f)); };
    for (const f of feats || []) if (f.properties?.name && f.geometry?.coordinates) jalan(f.geometry.coordinates, f); return best; };
  /* pasang surut BMKG (pasut.json): waktu dibaca sebagai WIB */
  const wibDetik = t => Date.parse(String(t).slice(0, 10) + "T" + String(t).slice(11, 16) + ":00+07:00") / 1000;
  /* deret per jam harus satu datum dengan puncak (MSL): di puncak pertama dalam rentang deret, selisihnya paling banyak 20 cm; berkas lama dengan datum HAT ditolak (tanpa angka) */
  const deretSelaras = st => { const d = st?.deret; if (!d?.cm?.length) return false; const t0 = wibDetik(d.t0), p = (st.puncak || []).find(x => { const i = (wibDetik(x.t) - t0) / (d.langkah_menit * 60); return i >= 0 && i <= d.cm.length - 1; });
    if (!p) return true; const i = Math.round((wibDetik(p.t) - t0) / (d.langkah_menit * 60)); return Math.abs(d.cm[i] - p.cm) <= 20; };
  const pasutSekarang = (st, now) => { const d = st?.deret; if (!d?.cm?.length || !deretSelaras(st)) return null; const i = (now - wibDetik(d.t0)) / (d.langkah_menit * 60), a = Math.floor(i);
    if (i < 0 || a >= d.cm.length - 1) return null; const v = d.cm[a] + (d.cm[a + 1] - d.cm[a]) * (i - a); return {cm: Math.round(v), arah: d.cm[a + 1] >= d.cm[a] ? "pasang" : "surut"}; };
  /* label angka stasiun pasut: prediksi sekarang dalam cm, minus bertanda U+2212; null bila tanpa deret */
  const pasutTeks = (st, now) => { const k = pasutSekarang(st, now); return k == null || k.cm == null ? "" : cmMinus(k.cm) + " cm"; };
  /* angka cm dengan minus sejati U+2212, format Indonesia */
  const cmMinus = v => v == null || isNaN(v) ? "–" : (v < 0 ? "\u2212" : "") + angkaId(Math.abs(v));
  /* kurva 24 jam: titik per jam dari sekarang (deret satu datum) dan puncak di jendela itu; null bila deret tak ada atau tak selaras */
  const pasutKurva = (st, now, jam = 24) => { const d = st?.deret; if (!d?.cm?.length || !deretSelaras(st)) return null; const pts = [];
    for (let h = 0; h <= jam; h++) { const k = pasutSekarang(st, now + h * 3600); if (k) pts.push({t: now + h * 3600, cm: k.cm}); }
    if (pts.length < 2) return null; const t1 = pts.at(-1).t;
    return {pts, puncak: (st.puncak || []).map(x => ({t: wibDetik(x.t), cm: x.cm, jenis: x.jenis})).filter(x => x.t >= now && x.t <= t1)}; };
  const pasutKartu = (st, now, n = 4) => (st?.puncak || []).filter(x => wibDetik(x.t) > now).sort((a, b) => wibDetik(a.t) - wibDetik(b.t)).slice(0, n).map(x => {
    const dt = new Date(wibDetik(x.t) * 1000), f = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", weekday: "short"}).format(dt).replace(".", "");
    return {jenis: x.jenis === "tinggi" ? "Pasang" : "Surut", hari: f, jam: String(x.t).slice(11, 16).replace(":", "."), cm: x.cm}; });
  const jamWib = ts => new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).format(new Date(detik(ts) * 1000)).replace(":", ".");
  const tglJamWib = ts => new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short"}).format(new Date(detik(ts) * 1000)).replace(".", "") + " " + jamWib(ts) + " WIB";
  /* kaki panel ringkas: pengelola yang ada dan jam baca terbaru */
  const kakiPanel = pos => { const ada = (pos || []).filter(p => p.t != null), peng = [...new Set((pos || []).map(pengelola))]; return peng.length ? `Sumber: ${peng.join(", ")}${ada.length ? `, dibaca terbaru ${jamWib(Math.max(...ada.map(p => detik(p.t))))} WIB` : ""}` : ""; };
  /* titik di dalam cincin luar poligon (ray casting; lubang diabaikan) */
  const dalamCincin = (c, lo, la) => { let d = false; for (let i = 0, j = c.length - 1; i < c.length; j = i++) { const [xi, yi] = c[i], [xj, yj] = c[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) d = !d; } return d; };
  /* bbox tiap cincin luar dihitung sekali; titik di luar bbox tidak diuji ray casting */
  const dalam = (pos, g) => { const pl = (g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []).map(r => { const c = r[0], xs = c.map(q => q[0]), ys = c.map(q => q[1]); return {c, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)}; });
    return (pos || []).filter(p => { const [lo, la] = titik(p); return pl.some(r => lo >= r.x0 && lo <= r.x1 && la >= r.y0 && la <= r.y1 && dalamCincin(r.c, lo, la)); }); };
  /* selisih ke batas Siaga berikutnya yang belum tercapai; null bila tanpa ambang atau sudah di atas Siaga 1 */
  const menujuBatas = p => { const a = p?.ambang, c = cmNilai(p); if (!a || c == null) return null; for (const [n, v] of [["Siaga 3", a.siaga3], ["Siaga 2", a.siaga2], ["Siaga 1", a.siaga1]]) if (v != null && c < v) return {nama: n, cm: v - c}; return null; };
  return {ikonPil, IKON_PIL, cmMinus, pasutKurva, judulPos, waktuBacaRingkas, ruasLapis, terdekatNama, KM_LAPIS, pilLabel, tipAmbang, batangAmbang, kabTerdekat, labelKab, dalam, menujuBatas, cmNilai, faktor, cmTeks, ketAngka, teksPos, deltaPos, jamWib, tglJamWib, kakiPanel, deltaKelas, KEMBAR, SIAGA, kelas, WARNA_KELAS, ringkas, perluPantau, kalimat, rasio, kelompok, arah, subjudul, skalaGeom, lingkar, wibDetik, pasutSekarang, deretSelaras, pasutTeks, pasutKartu, lonlat, titik, resmi, ikonKunci, warnaPos, isiPos, pengelola, denyutPos, macetPerPengelola, skala, RESMI, PENGELOLA, warna, nama, redup, denyut, angka, angkaId, satuan, delta, waktuBaca, lalu, pilihMacet, geojson, dash, fase, ISI, NAMA, WARNA, JEDA, detik};
})();

/* ---------- bagian peta (butuh peta, Analisa, nanti, gelap, esc dari skrip lain) ---------- */
const Alir = {
  id: 0, terakhir: 0, dipasang: false,
  kurangGerak: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  boleh() { return !document.hidden && !this.kurangGerak() && PosUkur.menyala() && !!peta?.getLayer("alir-gerak"); },
  mulai() { if (this.id || !this.boleh()) return; this.id = requestAnimationFrame(this.langkah); },
  henti() { if (this.id) cancelAnimationFrame(this.id); this.id = 0; },
  /* satu frame rAF murah; paint hanya diubah tiap JEDA ms (sekitar 11 fps) */
  langkah: ts => {
    if (!Alir.boleh()) { Alir.id = 0; return; }
    Alir.id = requestAnimationFrame(Alir.langkah);
    if (ts - Alir.terakhir < PosAir.JEDA) return; Alir.terakhir = ts;
    if (peta.isMoving()) return;   /* geser atau zoom sedang jalan: peta sudah sibuk, lewati pembaruan paint */
    peta.setPaintProperty("alir-gerak", "line-dasharray", PosAir.dash(ts)); peta.getLayer("alir-kilau") && peta.setPaintProperty("alir-kilau", "line-dasharray", PosAir.dash(ts));
    if (PosUkur._denyut != null && peta.getLayer("pos-pilih-halo")) { const f = Math.min(1, (performance.now() - PosUkur._denyut) / 700), r = 22 + 8 * Math.sin(Math.PI * f);   /* satu denyut lembut lalu diam */
      peta.setPaintProperty("pos-pilih-halo", "circle-radius", r); peta.setPaintProperty("pos-pilih-luar", "circle-radius", 28 + (r - 22)); if (f >= 1) PosUkur._denyut = null; }
    if (peta.getLayer("pos-cincin")) { const f = PosAir.fase(ts); peta.setPaintProperty("pos-cincin", "circle-stroke-opacity", .6 * (1 - f)); peta.setPaintProperty("pos-cincin", "circle-radius", 11 + f * 12); } },
  pasang() { if (this.dipasang) return; this.dipasang = true;
    document.addEventListener("visibilitychange", () => document.hidden ? this.henti() : this.mulai());
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => this.kurangGerak() ? (this.henti(), this.diam()) : this.mulai()); },
  /* tanpa animasi: garis aliran statis, cincin diam */
  diam() { if (!peta?.getLayer("alir-gerak")) return; peta.getLayer("alir-kilau") && peta.setPaintProperty("alir-kilau", "line-dasharray", [0, 1.5, 1.5, 4]); peta.setPaintProperty("alir-gerak", "line-dasharray", [0, 1.5, 1.5, 4]);
    if (peta.getLayer("pos-cincin")) { peta.setPaintProperty("pos-cincin", "circle-radius", 15); peta.setPaintProperty("pos-cincin", "circle-stroke-opacity", .4); } },
};

/* baris sumber kecil di bawah kartu hover */
const KAKI = (t, h) => h + `<small style="display:block;margin-top:5px;color:var(--ink2);font-size:9px">${t}</small>`;
globalThis.KAKI = KAKI;
const PosUkur = {
  D: null, p: null, t0: 0,
  menyala: () => !!document.querySelector('#lapis input[data-l="pos"]')?.checked,
  muat() { return this.p ||= fetch("/api/banjir/sungai-ukur", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).then(d => { this.D = d?.pos ? d : null; this._agg = null; this.t0 = Date.now(); nanti(() => this.petakan()); return this.D; }).catch(() => null); },
  /* kapsul berisi air: gambar kanvas, satu sprite per status */
  /* chevron kecil biru tua menghadap +x; di garis ia berputar mengikuti arah titik garis (hulu ke hilir, konvensi OSM) */
  panah() { const c = document.createElement("canvas"); c.width = 20; c.height = 20; const g = c.getContext("2d");
    g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(6, 4); g.lineTo(14, 10); g.lineTo(6, 16); g.stroke();
    g.lineWidth = 1.8; g.strokeStyle = "#0b3a66"; g.stroke(); return g.getImageData(0, 0, 20, 20); },
  ikon(w, isi, tebal) {
    const c = document.createElement("canvas"); c.width = 40; c.height = 62; const g = c.getContext("2d");
    const kapsul = (x, y, lebar, tinggi) => { g.beginPath(); g.roundRect(x, y, lebar, tinggi, lebar / 2); };
    g.beginPath(); g.moveTo(13, 46); g.lineTo(20, 60); g.lineTo(27, 46); g.closePath(); g.fillStyle = "#fff"; g.fill();
    kapsul(5, 3, 30, 46); g.fillStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 4; g.fill(); g.shadowBlur = 0;
    g.save(); kapsul(9, 7, 22, 38); g.clip(); g.fillStyle = "rgba(160,190,215,.28)"; g.fillRect(9, 7, 22, 38);
    const y = 45 - 38 * isi; g.fillStyle = w; g.fillRect(9, y, 22, 45 - y);
    g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(9, y, 22, 2); g.restore();
    if (tebal) { kapsul(5, 3, 30, 46); g.strokeStyle = "#000"; g.lineWidth = 2.5; g.stroke(); }   /* pos terpilih: tepi hitam tebal */
    return g.getImageData(0, 0, 40, 62); },
  lapis() {
    if (!peta || peta.getSource("pos")) return;
    for (const s of Object.keys(PosAir.NAMA)) if (!peta.hasImage("pa-" + s)) peta.addImage("pa-" + s, this.ikon(PosAir.warna(s), PosAir.ISI[s]), {pixelRatio: 2});
    for (const [n, [w, isi]] of Object.entries(PosAir.RESMI)) { const k = "pa-r-" + n.replace(" ", ""); if (!peta.hasImage(k)) peta.addImage(k, this.ikon(w, isi), {pixelRatio: 2}); }
    for (const s of Object.keys(PosAir.NAMA)) if (!peta.hasImage("pas-" + s)) peta.addImage("pas-" + s, this.ikon(PosAir.warna(s), PosAir.ISI[s], true), {pixelRatio: 2});
    for (const [n, [w, isi]] of Object.entries(PosAir.RESMI)) { const k = "pas-r-" + n.replace(" ", ""); if (!peta.hasImage(k)) peta.addImage(k, this.ikon(w, isi, true), {pixelRatio: 2}); }
    if (!peta.hasImage("pa-panah")) peta.addImage("pa-panah", this.panah(), {pixelRatio: 2});
    if (!peta.hasImage("pa-pasut")) peta.addImage("pa-pasut", this.ikon("#2b8c86", .5), {pixelRatio: 2});
    const bl = Peta.bawahLabel(), gl = gelap(), vis = this.menyala() ? "visible" : "none";
    /* sungai: badan air biru muda dan garis aliran bergerak di atas waterway basemap */
    const sumber = peta.getStyle().layers.find(l => l["source-layer"] === "waterway")?.source;
    if (sumber) {
      const kls = ["match", ["get", "class"], "river", 1, .55], filter = ["any", ["==", ["get", "class"], "river"], ["all", ["in", ["get", "class"], ["literal", ["canal", "stream"]]], [">=", ["zoom"], 8]]];
      const lebar = (a, b, c, d) => ["interpolate", ["linear"], ["zoom"], 4, ["*", kls, a], 8, ["*", kls, b], 12, ["*", kls, c], 15, ["*", kls, d]];
      peta.addLayer({id: "alir-badan", type: "line", source: sumber, "source-layer": "waterway", minzoom: 11, filter, layout: {visibility: vis, "line-cap": "round", "line-join": "round"},
        paint: {"line-color": gl ? "#2f6f9f" : "#5b9bd8", "line-width": lebar(2.2, 4.6, 13, 36), "line-opacity": .95}}, bl);   /* badan air biru penuh seperti Oyenza; kilau bergerak selebar badan di atasnya */
      peta.addLayer({id: "alir-garis", type: "line", source: sumber, "source-layer": "waterway", filter, layout: {visibility: vis, "line-cap": "round", "line-join": "round"},
        paint: {"line-color": gl ? "#6fb2ea" : "#4f95d6", "line-width": ["interpolate", ["linear"], ["zoom"], 4, ["*", kls, 1], 7, ["*", kls, 1.8], 9, ["*", kls, 2.6], 12, ["*", kls, 3.6], 13, ["*", kls, 4], 15, ["*", kls, 4.5]]}}, bl);   /* tebal sejak zoom jauh: sungai tetap terbaca saat diperkecil */
      peta.addLayer({id: "alir-gerak", type: "line", source: sumber, "source-layer": "waterway", minzoom: 11, filter, layout: {visibility: vis, "line-join": "round"},
        paint: {"line-color": gl ? "#e6f3ff" : "#d6ebff", "line-width": lebar(1.8, 3.7, 10.5, 30), "line-opacity": .55, "line-blur": ["interpolate", ["linear"], ["zoom"], 11, 1, 15, 6], "line-dasharray": [0, 1.5, 1.5, 4]}}, bl);   /* kilau selebar badan air, bukan garis tipis di tengah */
      peta.addLayer({id: "alir-panah", type: "symbol", source: sumber, "source-layer": "waterway", minzoom: 12, filter: ["any", ["==", ["get", "class"], "river"], ["in", ["get", "class"], ["literal", ["canal", "stream"]]]],
        layout: {visibility: vis, "symbol-placement": "line", "symbol-spacing": 250, "icon-image": "pa-panah", "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 1.1, 16, 1.8], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true}}, bl); }
    peta.addSource("pos", {type: "geojson", data: PosAir.geojson(this.D?.pos)});
    peta.addLayer({id: "pos-cincin", type: "circle", source: "pos", minzoom: 7, filter: ["==", ["get", "p"], 1], layout: {visibility: vis},
      paint: {"circle-radius": 15, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ["get", "w"], "circle-stroke-width": 2, "circle-stroke-opacity": .4, "circle-translate": [0, -14], "circle-pitch-alignment": "map"}});
    peta.addSource("pos-pilih", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    peta.addLayer({id: "pos", type: "symbol", source: "pos", minzoom: 7, layout: {visibility: vis, "icon-image": ["concat", "pa-", ["get", "i"]], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .5, 9, .8, 13, 1], "symbol-sort-key": ["get", "u"]}});
    /* angka cm: zoom 8,5 sampai 11 boleh disingkirkan tabrakan (Siaga dan naik menang lewat symbol-sort-key u); dari zoom 11 semua pos berangka tampil */
    const warnaAngka = ["match", ["get", "s"], "lama", "#7a8796", "macet", "#7a8796", "bukan_tinggi", "#7a8796", "data_bolong", "#7a8796", gl ? "#ffffff" : "#0b2545"], halo = gl ? "#0b1424" : "#ffffff";
    for (const [id, mn, mk, tabrak] of [["pos-angka", 8.5, 11, false], ["pos-angka-semua", 11, 24, true]])
      peta.addLayer({id, type: "symbol", source: "pos", minzoom: mn, maxzoom: mk, filter: ["!=", ["get", "a"], ""],
        layout: {visibility: vis, "text-field": ["format", ["get", "n"], {}, " cm", {"font-scale": .75, "text-color": "#8d9aa9"}], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-anchor": "left", "text-offset": [1, -1.3], "text-optional": true, "symbol-sort-key": ["get", "u"], ...(tabrak ? {"text-allow-overlap": true, "text-ignore-placement": true} : {})},
        paint: {"text-color": warnaAngka, "text-halo-color": halo, "text-halo-width": 1.8}});
    /* pos terpilih: kapsul bertepi hitam tebal x1,15 di atas pin, angka cm tebal hitam yang tak pernah tersingkir */
    /* halo lembut warna status + cincin putih + cincin luar berwarna di belakang kapsul terpilih; satu denyut saat dipilih (Alir.langkah) */
    peta.addLayer({id: "pos-pilih-halo", type: "circle", source: "pos-pilih", layout: {visibility: vis}, paint: {"circle-radius": 22, "circle-color": ["get", "w"], "circle-opacity": .28, "circle-translate": [0, -16], "circle-pitch-alignment": "map"}});
    peta.addLayer({id: "pos-pilih-cincin", type: "circle", source: "pos-pilih", layout: {visibility: vis}, paint: {"circle-radius": 22, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3, "circle-translate": [0, -16], "circle-pitch-alignment": "map"}});
    peta.addLayer({id: "pos-pilih-luar", type: "circle", source: "pos-pilih", layout: {visibility: vis}, paint: {"circle-radius": 28, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ["get", "w"], "circle-stroke-width": 2, "circle-stroke-opacity": .75, "circle-translate": [0, -16], "circle-pitch-alignment": "map"}});
    peta.addLayer({id: "pos-pilih", type: "symbol", source: "pos-pilih", layout: {visibility: vis, "icon-image": ["concat", "pas-", ["get", "i"]], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .65, 9, 1, 13, 1.25]}});
    peta.addLayer({id: "pos-pilih-angka", type: "symbol", source: "pos-pilih", filter: ["!=", ["get", "a"], ""],
      layout: {visibility: vis, "text-field": ["get", "a"], "text-font": ["Noto Sans Bold"], "text-size": 14, "text-anchor": "left", "text-offset": [1.1, -1.3], "text-allow-overlap": true, "text-ignore-placement": true},
      paint: {"text-color": "#000000", "text-halo-color": "#ffffff", "text-halo-width": 4.5}});   /* halo tebal putih = latar pil, terbaca di atas sungai dan angin */
    if (!this._ev) { this._ev = 1; peta.on("moveend", () => this.cariNama());
      peta.on("mouseenter", "pos", () => { this.diPos = true; peta.getCanvas().style.cursor = "pointer"; });
      peta.on("mousemove", "pos", e => { this.diPos = true; const x = this.cari(e.features[0]?.properties?.id); if (x) PI?.tampilTip(this.kartuHover(x), e.originalEvent); });
      peta.on("mouseleave", "pos", () => { this.diPos = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); }
    this.ruas(); Alir.pasang(); Alir.kurangGerak() ? Alir.diam() : Alir.mulai(); this.daftar(); renderLegenda(); },
  cari(id) { return this.D?.pos?.find(p => p.id === id) || null; },
  /* sakelar: chrome urgent (penanda memuat, hidden panel, animasi); 12 lapisan dan daftar menyusul sesudah satu frame */
  tampil(on) { const lb = document.querySelector('#lapis input[data-l="pos"]')?.closest("label"); if (lb) { lb.classList.add("memuat"); lb.setAttribute("aria-busy", "true"); }
    on ? Alir.mulai() : Alir.henti();
    nanti(() => { this.lapisan(on); this.daftar(); if (on) this.petakan(); if (lb) { lb.classList.remove("memuat"); lb.removeAttribute("aria-busy"); } }); },
  lapisan(on) { for (const l of ["alir-badan", "alir-garis", "alir-st-Siaga3", "alir-st-Siaga2", "alir-st-Siaga1", "alir-st-luar", "alir-st-Siaga3-m", "alir-st-Siaga2-m", "alir-st-Siaga1-m", "alir-st-naik-m", "alir-kilau", "alir-st-naik", "alir-gerak", "alir-panah", "pos-cincin", "pos", "pos-angka", "pos-angka-semua", "pos-pilih-halo", "pos-pilih-cincin", "pos-pilih-luar", "pos-pilih", "pos-pilih-angka", "pasut", "pasut-angka", "pasut-angka-semua"]) peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"); },
  hit(pt) { const f = peta.getLayer("pos") && peta.queryRenderedFeatures(pt, {layers: ["pos"]}); return f?.length ? f[0].properties.id : null; },
  legenda() { if (!Peta.lihat("pos") || !this.D) return "";
    return `<div class="lbl">Pos tinggi air</div><div class="leg">${[["biasa", "Biasa"], ["naik_di_atas_biasa", "Naik di atas biasa"], ["tertinggi", "Tertinggi"], ["lama", "Lama atau macet"]].map(([s, n]) => `<span><i class="sw dot" style="background:${PosAir.warna(s)}"></i>${n}</span>`).join("")}<span><b style="color:#0b3a66">&rsaquo;</b> Panah = arah aliran</span><span><button type="button" class="pa-daftar" data-pos-nas>Daftar pos</button></span></div>`; },
  pil(s) { const t = s === "riwayat_kurang" || s === "pantauan_terbatas", n = PosAir.nama(s); return `<span class="pill pa-pil" style="background:${PosAir.warna(s)};color:${t ? "#4a5868" : "#fff"}">${PosAir.ikonPil(n)}${esc(n)}</span>`; },
  pilPos(x) { const r = PosAir.resmi(x), l = r || PosAir.pilLabel(x); return `<span class="pill pa-pil" style="background:${r ? PosAir.warnaPos(x) : PosAir.warna(x.status)};color:${r === "Siaga 3" ? "#3b2f06" : !r && (x.status === "riwayat_kurang" || x.status === "pantauan_terbatas") ? "#4a5868" : "#fff"}">${PosAir.ikonPil(l)}${l}</span>`; },
  kapsul(x) { const w = PosAir.warnaPos(x), h = Math.round(PosAir.isiPos(x) * 100); return `<i style="display:inline-block;flex:none;width:10px;height:18px;border-radius:6px;border:1.5px solid ${w};background:linear-gradient(to top,${w} ${h}%,transparent ${h}%)"></i>`; },
  /* tabung ukur tegak: pita ambang di dalam tabung, sumbu cm di kiri, label Siaga di kanan, garis air bergelombang; sentuh pita atau air untuk rentangnya */
  skala(x) { const H = 220, polos = !PosAir.skalaGeom(x, H); let g = PosAir.skalaGeom(x, H);
    if (polos) { const c0 = PosAir.cmNilai(x); if (c0 == null) return ""; const mx = Math.max(c0 * 1.5, 50);   /* tanpa ambang: tabung biru polos, rentang 0 sampai maks */
      g = {H, mx, pita: [{nama: "Tinggi air", y0: 0, y1: H, warna: "#3f7fb8", batas: 0}], yAir: +(H - Math.max(0, Math.min(c0, mx)) / mx * H).toFixed(1)}; }
    const T = 8, y = v => +(g.H - Math.max(0, Math.min(v, g.mx)) / g.mx * g.H).toFixed(1), st = [10, 20, 25, 50, 100, 200, 500, 1000].find(q => g.mx / q <= 6) || 1000, ti = [];
    for (let v = 0; v <= g.mx; v += st) ti.push(v); const kecil = []; for (let v = st / 5; v < g.mx; v += st / 5) if (Math.abs(v / st - Math.round(v / st)) > .01) kecil.push(v);   /* garis bantu tiap seperlima jarak angka */
    const tip = (n, t) => `data-tip="${esc(`<b>${n}</b><br>${t}`)}"`, sat = "cm", ang = v => PosAir.angka(v, sat), top = g.pita.length - 1;
    const rng = (t, i) => polos ? `Sekarang ${ang(c)}` : i === 0 ? `Rentang: 0 sampai ${ang(g.pita[1].batas)}` : i === top ? `Rentang: di atas ${ang(t.batas)}` : `Rentang: ${ang(t.batas)} sampai ${ang(g.pita[i + 1].batas)}`;
    const gel = yy => `M18,${yy} q5,-4 10,0${" t10,0".repeat(7)} V${g.H} H18 Z`, c = PosAir.cmNilai(x);
    return `<svg viewBox="0 0 190 ${g.H + 2 * T}" style="width:190px;max-width:100%;height:auto;display:block" role="img" aria-label="Tabung ukur ambang"><style>.pa-ombak{animation:paOmbak 2.4s linear infinite}.pa-ombak2{animation-duration:3.6s;animation-direction:reverse}.pa-naik{animation:paNaik 1.1s cubic-bezier(.2,.7,.2,1) both}@keyframes paOmbak{to{transform:translateX(-20px)}}@keyframes paNaik{from{transform:translateY(var(--d))}}@media (prefers-reduced-motion:reduce){.pa-ombak,.pa-naik{animation:none}}</style><defs><clipPath id="paTb"><rect x="38" y="0" width="40" height="${g.H}" rx="20"/></clipPath></defs><g transform="translate(0,${T})">
      <g clip-path="url(#paTb)">${g.pita.map((t, i) => `<rect x="38" y="${t.y0}" width="40" height="${Math.max(0, t.y1 - t.y0)}" fill="${t.warna}" opacity=".4" ${tip(t.nama, rng(t, i))}/>`).join("")}${g.yAir == null ? "" : `<g class="pa-naik" style="--d:${g.H - g.yAir}px"><path class="pa-ombak pa-ombak2" d="${gel(g.yAir + 1.5)}" fill="#3f7fb8" opacity=".35"/><path class="pa-ombak" d="${gel(g.yAir)}" fill="#3f7fb8" opacity=".7" ${tip("Tinggi air", "Sekarang: " + ang(c))}/></g>`}</g>
      <rect x="38" y="0" width="40" height="${g.H}" rx="20" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>
      <text x="27" y="-1" font-size="9" text-anchor="end" opacity=".6">cm</text>${kecil.map(v => `<line x1="33" x2="36" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" stroke-opacity=".3"/>`).join("")}${ti.map(v => `<line x1="30" x2="36" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" stroke-opacity=".5"/><text x="27" y="${y(v) + 3.5}" font-size="10" text-anchor="end" opacity=".7">${PosAir.angkaId(v)}</text>`).join("")}
      ${g.pita.slice(1).map(t => `<line x1="78" x2="86" y1="${t.y1}" y2="${t.y1}" stroke="${t.warna}" stroke-width="3" stroke-linecap="round"/><text x="90" y="${t.y1 + 4}" font-size="11" font-weight="700" style="fill:${t.warna}">${esc(t.nama.replace("Siaga ", "S"))} ${PosAir.angka(t.batas, sat)}</text>`).join("")}
      ${g.yAir == null ? "" : `<line x1="34" x2="82" y1="${g.yAir}" y2="${g.yAir}" stroke="#1d5aa0" stroke-width="1.5" stroke-dasharray="3 2"/>`}</g></svg>`; },
  /* kartu di laci kiri: isi ringan langsung, grafik menyusul sesudah satu frame */
  buka(id, terbang, asal) {
    const x = this.cari(id); if (!x) return; const w = PosAir.redup(x.status) ? "#7a8796" : PosAir.warnaPos(x), cm = PosAir.cmNilai(x), u = cm == null ? "" : "cm", ket = PosAir.ketAngka(x), a = PosAir.arah(x.d3, x.satuan);
    if (terbang) { const [lo, la] = PosAir.titik(x); peta.flyTo({center: [lo, la], zoom: Math.max(peta.getZoom(), 10), padding: kiriPad()}); }
    this.pilih(x); this._denyut = performance.now(); this._g = x.id; const nb = PosAir.menujuBatas(x);
    const sg = x.ambang ? [["Siaga 3", x.ambang.siaga3], ["Siaga 2", x.ambang.siaga2], ["Siaga 1", x.ambang.siaga1]] : [];
    const mati = x.status === "lama" || x.status === "macet", wn = mati ? "#7a8796" : "var(--ink)", pil = this.pilPos(x).replace(/>(<svg[^>]*>.*?<\/svg>)Tanpa batas</, ">$1Tanpa batas resmi<"), baris = (l, v, on) => `<tr${on ? ' class="pa-kini"' : ""}><td>${l}</td><td class="n" style="white-space:normal;overflow-wrap:anywhere;color:var(--ink)">${v}</td></tr>`;
    const ik = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`, lb = (d, t) => `<span class="pa-lb">${ik(d)}${t}</span>`;
    const pilSg = n => `<span class="pill pa-pil" style="background:${PosAir.RESMI[n][0]};color:${n === "Siaga 3" ? "#3b2f06" : "#fff"}">${esc(n)}</span>`, rs = PosAir.resmi(x);
    const tSg = [["Pantau tinggi air tiap jam dari pos ini", "Pastikan jalur informasi ke warga bantaran siap"], ["Informasikan warga bantaran untuk waspada", "Siapkan pompa dan perahu di titik rawan"], ["Siagakan evakuasi warga bantaran", "Buka posko dan siapkan logistik"], ["Evakuasi warga bantaran sungai sekarang", "Aktifkan posko darurat dan laporkan ke BPBD"]][Math.max(0, ["Normal", "Siaga 3", "Siaga 2", "Siaga 1"].indexOf(rs))];
    const d3 = x.d3 != null && PosAir.faktor(x.satuan) != null ? `<span class="${PosAir.deltaKelas(x.d3)}" style="color:${x.d3 > 0 ? "#c9503a" : x.d3 < 0 ? "#3f7fb8" : "inherit"}">${PosAir.deltaPos(x)}</span>` : "–";
    const isi = `${asal ? `<button class="tb" data-semua style="justify-self:start;width:auto;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;padding:4px 12px 4px 8px;border-radius:999px"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Semua pos</button>` : ""}
      <div class="grid g4">${kot("Tinggi air", `<span style="color:${wn}">${cm == null ? "–" : PosAir.angkaId(cm) + " cm"}</span>`, PosAir.waktuBacaRingkas(x.t))}${kot("Status", pil, rs ? "batas resmi pengelola" : esc(PosAir.subjudul(x)))}
        ${kot("Batas berikut", nb && !PosAir.redup(x.status) ? PosAir.angkaId(nb.cm) + " cm" : "–", nb && !PosAir.redup(x.status) ? "lagi ke " + nb.nama : rs === "Siaga 1" ? "sudah di batas tertinggi" : "tanpa batas resmi")}${kot("Perubahan 3 jam", d3, a ? a.replace(/<[^>]+>/g, "") : "selisih bacaan")}</div>
      ${ket ? `<p class="fnd" style="margin:0">${ket}.</p>` : ""}
      ${lipat("Tabung ukur dan batas Siaga", `<div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;min-width:0"><div>${this.skala(x)}</div>
        ${sg.length ? `<table class="tb2"><tbody>${sg.map(([n, v]) => baris(pilSg(n), PosAir.angka(v, "cm"), n === rs)).join("")}</tbody></table>` : `<p class="fnd" style="margin:0">Pengelola belum menerbitkan batas Siaga untuk pos ini.</p>`}</div>`)}
      ${lipat("Tinggi air beberapa jam terakhir", `<div id="paGrafik" style="min-width:0;max-width:100%;overflow:hidden"><p class="fnd" style="margin:0">Memuat bacaan…</p></div>`)}
      ${lipat("Tindakan yang disarankan", `<ul style="margin:0;padding-left:18px;font-size:12.5px">${tSg.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`)}
      <p class="fnd">Pengelola: ${esc(PosAir.pengelola(x))}. ${esc(PosAir.subjudul(x))}.</p>`;
    Analisa.buka(isi, `<div><h3 id="dlgJudul">${esc(PosAir.judulPos(x.nama))}</h3><p>Pos tinggi air</p></div>`);
    /* tombol kepala laci seperti Laci karhutla: zoom ke pos, Google Maps, WhatsApp */
    const [lo, la] = PosAir.titik(x), q = `${la.toFixed(5)},${lo.toFixed(5)}`, gm = "https://www.google.com/maps?q=" + q, b = (tag, at, t, d) => `<${tag} class="ik-btn" ${at} title="${t}" aria-label="${t}"><svg viewBox="0 0 24 24">${d}</svg></${tag}>`;
    const wa = `Pos ${PosAir.judulPos(x.nama)}: ${cm == null ? "-" : PosAir.angkaId(cm) + " cm"}, ${PosAir.pilLabel(x)}\n${gm}`;
    $("#laci .hd-aksi")?.insertAdjacentHTML("afterbegin", b("button", 'type="button" data-pa-zoom', "Zoom ke pos", '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="2"/>')
      + b("a", `target="_blank" rel="noopener" href="${gm}"`, "Buka di Google Maps", '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>')
      + b("a", `target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(wa)}"`, "Bagikan lewat WhatsApp", '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z"/>'));
    const z = $("#laci [data-pa-zoom]"); if (z) z.onclick = () => peta.flyTo({center: [lo, la], zoom: Math.max(peta.getZoom(), 14), padding: kiriPad()});
    nanti(() => this.grafik(x)); },
  /* tepi gelap di pos terpilih */
  pilih(x) { const [lo, la] = x ? PosAir.titik(x) : [0, 0]; peta.getSource("pos-pilih")?.setData({type: "FeatureCollection", features: x ? [{type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {i: PosAir.ikonKunci(x), a: PosAir.cmTeks(x) ?? "", w: PosAir.redup(x.status) ? "#7a8796" : PosAir.warnaPos(x)}}] : []}); },
  async grafik(x) {
    const r = await fetch("/api/banjir/sungai-ukur/pos/" + encodeURIComponent(x.id), {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null), el = $("#paGrafik");
    if (this._g !== x.id) return;   /* pos lain dibuka selama menunggu */
    if (el && r?.v?.length === 1 && PosAir.faktor(x.satuan) != null) { el.innerHTML = `<p class="fnd" style="margin:6px 0 0">Grafik beberapa jam terakhir muncul setelah ada dua bacaan atau lebih. Pos ini baru tercatat satu bacaan.</p>`; return; }
    if (!el || !r?.v?.length || r.v.length < 2 || PosAir.faktor(x.satuan) == null) { if (el) el.innerHTML = `<p class="fnd" style="margin:0">Belum ada riwayat bacaan untuk pos ini.</p>`; return; }   /* satuan tak dikenal atau bukan tinggi air: tanpa grafik */
    const W = 660, B = 120, L = 46, Rm = 14, v = r.v.map(q => q * PosAir.faktor(x.satuan)), ts = (r.t || []).map(PosAir.detik), k = 1, a = x.ambang, ba = a ? [["Normal", 0, a.siaga3], ["Siaga 3", a.siaga3, a.siaga2], ["Siaga 2", a.siaga2, a.siaga1], ["Siaga 1", a.siaga1, 1e9]] : [];
    const sp = Math.max(...v) - Math.min(...v), lo = Math.min(...v) - sp * .1, hi = Math.max(...v) + sp * .1 || lo + 1, m = hi - lo || 1, t0 = ts[0], t1 = ts.at(-1), pakaiT = ts.length === v.length && t1 > t0;
    const X = i => L + (pakaiT ? (ts[i] - t0) / (t1 - t0) : i / (v.length - 1)) * (W - L - Rm), Y = q => B - 10 - Math.max(0, Math.min(1, (q - lo) / m)) * (B - 30);
    const pita = a ? ba.map(([n, l, h]) => { const y0 = Y(h / k), y1 = Y(l / k); return y1 - y0 > .5 ? `<rect x="${L}" y="${y0}" width="${W - L - Rm}" height="${y1 - y0}" fill="${PosAir.RESMI[n][0]}" opacity=".22"/>` : ""; }).join("") : "";
    const grid = [0, 1, 2, 3].map(i => { const q = lo + m * i / 3; return `<line x1="${L}" x2="${W - Rm}" y1="${Y(q)}" y2="${Y(q)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 6}" y="${Y(q) + 3.5}" font-size="10" text-anchor="end" opacity=".65">${PosAir.angkaId(Math.round(q))}</text>`; }).join("");
    const jam = []; if (pakaiT) for (let q = Math.ceil((t0 + 25200) / 21600) * 21600 - 25200; q <= t1; q += 21600) jam.push(q);
    const sumbu = jam.map(q => `<text x="${(L + (q - t0) / (t1 - t0) * (W - L - Rm)).toFixed(1)}" y="${B + 12}" font-size="10" text-anchor="middle" opacity=".65">${PosAir.jamWib(q)}</text>`).join("");
    const lw = Math.max(2, (W - L - Rm) / v.length), n = v.length - 1;
    const kena = v.map((q, i) => `<g class="pg"><line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="6" y2="${B - 10}" stroke="currentColor" stroke-opacity=".5"/><circle cx="${X(i).toFixed(1)}" cy="${Y(q).toFixed(1)}" r="4" fill="#fff" stroke="#3f7fb8" stroke-width="2"/><rect x="${(X(i) - lw / 2).toFixed(1)}" y="0" width="${lw.toFixed(1)}" height="${B}" fill="transparent" data-tip="${esc(`<b>${pakaiT ? PosAir.jamWib(ts[i]) + " WIB" : "Bacaan " + (i + 1)}</b><br>Tinggi: ${PosAir.angka(q, "cm")}`)}"/></g>`).join("");
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 2px"><span class="lbl">Jam WIB</span><small>${esc("cm")}</small></div><svg viewBox="0 0 ${W} ${B + 18}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:100%;height:auto;display:block" role="img" aria-label="Tinggi air beberapa jam terakhir"><style>.pg>line,.pg>circle{opacity:0;pointer-events:none}.pg:hover>line,.pg:hover>circle{opacity:1}</style>${pita}${grid}
      <path d="${v.map((q, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(q).toFixed(1)).join("")}" fill="none" stroke="#3f7fb8" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="${X(n).toFixed(1)}" cy="${Y(v[n]).toFixed(1)}" r="4.5" fill="#3f7fb8" stroke="#fff" stroke-width="1.5"/>${sumbu}${kena}</svg>`;
    /* tip bersama hanya bergerak lewat pointermove dokumen; di laci posisinya tertinggal di 0,0, jadi ikuti kursor dari sini dan sembunyikan saat keluar */
    const sv = el.querySelector("svg"), tp = $("#tip"), taruh = e => { if (!tp.classList.contains("on")) return; tp.style.left = Math.max(8, Math.min(innerWidth - tp.offsetWidth - 8, e.clientX + 14)) + "px"; tp.style.top = Math.max(8, e.clientY - tp.offsetHeight - 12) + "px"; };
    sv.addEventListener("pointerover", e => requestAnimationFrame(() => taruh(e))); sv.addEventListener("pointermove", taruh); sv.addEventListener("pointerleave", () => tp.classList.remove("on")); },
  /* ruas waterway sekitar pos Siaga diwarnai: lapisan garis berfilter within poligon kecil, di bawah garis aliran bergerak */
  ruas() {
    if (!peta.getLayer("alir-gerak")) return; const it = PosAir.ruasLapis(this.D?.pos, p => this._nm?.get(p.id)), base = peta.getFilter("alir-badan"), src = peta.getLayer("alir-badan").source, vis = this.menyala() ? "visible" : "none";
    const sel = (a) => { const bagian = it.filter(a).map(x => ["all", ["within", x.g], ...(x.nama ? [["==", ["get", "name"], x.nama]] : [])]); return ["all", base, bagian.length ? ["any", ...bagian] : ["==", ["literal", 1], 0]]; };   /* ["==", 1, 0] polos dibaca filter lama oleh MapLibre */
    /* selebar badan air biru (alir-badan) supaya ruas berwarna menutupnya penuh, tanpa pinggiran biru */
    const kls = ["match", ["get", "class"], "river", 1, .55], lebar = ["interpolate", ["linear"], ["zoom"], 8, 5, 12, 8, 13, ["max", 8, ["*", kls, 13]], 15, ["*", kls, 36]], atas = peta.getLayer("alir-panah") ? "alir-panah" : undefined;
    const campur = (a, b, t) => "#" + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join(""), KUNING = "#f2c14e";
    const tambah = (id, filter, warna, op, sebelum) => { if (peta.getLayer(id)) return peta.setFilter(id, filter);
      peta.addLayer({id, type: "line", source: src, "source-layer": "waterway", filter, layout: {visibility: vis, "line-cap": "round", "line-join": "round"}, paint: {"line-color": warna, "line-width": lebar, "line-opacity": op}}, sebelum); };
    tambah("alir-st-luar", sel(x => x.lapis === 0), KUNING, .9, atas);   /* gradasi menjauhi pin: dalam warna Siaga, tengah campuran, luar kuning; di atas garis aliran biru */
    for (const k of ["Siaga 3", "Siaga 2", "Siaga 1", "naik"]) { const id = "alir-st-" + k.replace(" ", ""); tambah(id + "-m", sel(x => x.kelas === k && x.lapis === 1), campur(PosAir.WARNA_KELAS[k], KUNING, .5), .92, atas); tambah(id, sel(x => x.kelas === k && x.lapis === 2), PosAir.WARNA_KELAS[k], .95, atas); }
    /* kilau terang searah aliran (urutan titik garis = hulu ke hilir) di seluruh ruas berwarna */
    const semua = ["all", base, ["any", ...it.map(x => ["all", ["within", x.g], ...(x.nama ? [["==", ["get", "name"], x.nama]] : [])])].slice(0, 1).length && it.length ? ["any", ...it.map(x => ["all", ["within", x.g], ...(x.nama ? [["==", ["get", "name"], x.nama]] : [])])] : ["==", ["literal", 1], 0]];
    if (peta.getLayer("alir-kilau")) peta.setFilter("alir-kilau", semua);
    else peta.addLayer({id: "alir-kilau", type: "line", source: src, "source-layer": "waterway", filter: semua, layout: {visibility: vis, "line-join": "round"},
      paint: {"line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.4, 12, 2.4, 15, 4], "line-opacity": .9, "line-blur": 1, "line-dasharray": [0, 1.5, 1.5, 4]}}, atas); },
  /* nama waterway terdekat tiap pos Siaga/naik, dari fitur yang sedang tergambar; dicoba tiap moveend, hasil di-cache (gagal dicatat hanya dari zoom 11) */
  cariNama() {
    if (!peta.getLayer("alir-garis") || !this.D?.pos || !this.menyala()) return; this._nm ||= new Map(); let baru = false;
    for (const p of this.D.pos) { if (this._nm.has(p.id)) continue; const k = PosAir.kelas(p); if (!PosAir.SIAGA.includes(k) && !(k === "naik" && !p.ambang)) continue;
      const [lo, la] = PosAir.titik(p), pt = peta.project([lo, la]); if (pt.x < 0 || pt.y < 0 || pt.x > innerWidth || pt.y > innerHeight) continue;
      const nm = PosAir.terdekatNama(peta.queryRenderedFeatures([[pt.x - 16, pt.y - 16], [pt.x + 16, pt.y + 16]], {layers: ["alir-garis"]}), lo, la);
      if (nm) { this._nm.set(p.id, nm); baru = true; } else if (peta.getZoom() >= 11) this._nm.set(p.id, null); }
    if (baru) this.ruas(); },
  /* pasang surut BMKG: kartu dan pin stasiun pantai; berkas belum ada = tidak ada pin */
  async pasut() {
    this.PS ||= await fetch("data/pasut.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null); if (!this.PS?.stasiun?.length || peta.getSource("pasut")) return;
    peta.addSource("pasut", {type: "geojson", data: {type: "FeatureCollection", features: this.PS.stasiun.map(s => ({type: "Feature", geometry: {type: "Point", coordinates: [s.lon, s.lat]}, properties: {id: s.id, nama: s.nama, a: PosAir.pasutTeks(s, Date.now() / 1000)}}))}});
    peta.addLayer({id: "pasut", type: "symbol", source: "pasut", layout: {visibility: this.menyala() ? "visible" : "none", "icon-image": "pa-pasut", "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .5, 9, .8, 13, 1]}});
    for (const [id, mn, mk, tabrak] of [["pasut-angka", 8.5, 11, false], ["pasut-angka-semua", 11, 24, true]])
      peta.addLayer({id, type: "symbol", source: "pasut", minzoom: mn, maxzoom: mk, filter: ["!=", ["get", "a"], ""],
        layout: {visibility: this.menyala() ? "visible" : "none", "text-field": ["get", "a"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-anchor": "left", "text-offset": [1, -1.3], "text-optional": true, ...(tabrak ? {"text-allow-overlap": true, "text-ignore-placement": true} : {})},
        paint: {"text-color": gelap() ? "#7fd6cf" : "#1f6f69", "text-halo-color": gelap() ? "#0b1424" : "#ffffff", "text-halo-width": 1.8}});
    peta.on("mouseenter", "pasut", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "pasut", () => peta.getCanvas().style.cursor = ""); },
  hitPasut(pt) { const f = peta.getLayer("pasut") && peta.queryRenderedFeatures(pt, {layers: ["pasut"]}); return f?.length ? f[0].properties.id : null; },
  bukaPasut(id) { const s = this.PS?.stasiun?.find(x => x.id === id); if (!s) return; const now = Date.now() / 1000, k = PosAir.pasutSekarang(s, now), pk = PosAir.pasutKartu(s, now), kv = PosAir.pasutKurva(s, now);
    const IK = {Pasang: "M3 17l6-6 4 4 8-8M15 7h6v6", Surut: "M3 7l6 6 4-4 8 8M15 17h6v-6"}, WR = {Pasang: "#2b8c86", Surut: "#3f7fb8"}, ik = (n, w = 13) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IK[n]}"/></svg>`;
    const pil = n => `<span class="pill pa-pil" style="background:${WR[n]};color:#fff">${ik(n)}${n}</span>`, tren = k ? (k.arah === "pasang" ? "Pasang" : "Surut") : null;
    const kurva = kv ? (() => { const W = 420, B = 120, L = 40, R = 12, vs = kv.pts.map(p => p.cm), lo = Math.min(...vs, ...kv.puncak.map(p => p.cm)), hi = Math.max(...vs, ...kv.puncak.map(p => p.cm)), m = hi - lo || 1, t0 = kv.pts[0].t, t1 = kv.pts.at(-1).t,
        X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = c => 14 + (1 - (c - lo) / m) * (B - 34), tip = (t, c) => esc(`<b>${PosAir.jamWib(t)} WIB</b><br>${PosAir.cmMinus(c)} cm`);
      const grid = [0, 1, 2].map(i => { const c = lo + m * i / 2; return `<line x1="${L}" x2="${W - R}" y1="${Y(c)}" y2="${Y(c)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 6}" y="${Y(c) + 3.5}" font-size="10" text-anchor="end" opacity=".65">${PosAir.cmMinus(Math.round(c))}</text>`; }).join("");
      const jam = []; for (let q = Math.ceil((t0 + 25200) / 21600) * 21600 - 25200; q <= t1; q += 21600) jam.push(q);
      const sumbu = jam.map(q => `<text x="${X(q).toFixed(1)}" y="${B + 12}" font-size="10" text-anchor="middle" opacity=".65">${PosAir.jamWib(q)}</text>`).join("");
      const lw = (W - L - R) / (kv.pts.length - 1), kena = kv.pts.map(p => `<g class="pg"><line x1="${X(p.t).toFixed(1)}" x2="${X(p.t).toFixed(1)}" y1="6" y2="${B - 10}" stroke="currentColor" stroke-opacity=".5"/><circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.cm).toFixed(1)}" r="4" fill="#fff" stroke="#2b8c86" stroke-width="2"/><rect x="${(X(p.t) - lw / 2).toFixed(1)}" y="0" width="${lw.toFixed(1)}" height="${B}" fill="transparent" tabindex="0" data-tip="${tip(p.t, p.cm)}" aria-label="${PosAir.jamWib(p.t)} WIB, ${PosAir.cmMinus(p.cm)} cm"/></g>`).join("");
      const pc = kv.puncak.map(p => `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.cm).toFixed(1)}" r="3" fill="${p.jenis === "tinggi" ? "#2b8c86" : "#3f7fb8"}"/><text x="${X(p.t).toFixed(1)}" y="${(Y(p.cm) + (p.jenis === "tinggi" ? -6 : 13)).toFixed(1)}" font-size="9.5" font-weight="700" text-anchor="middle">${PosAir.cmMinus(p.cm)}</text>`).join("");
      return `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 2px"><span class="lbl">24 jam ke depan, WIB</span><small>cm</small></div><svg viewBox="0 0 ${W} ${B + 18}" style="width:100%;max-width:100%;height:auto;display:block" role="img" aria-label="Prediksi pasang surut 24 jam ke depan"><style>.pg>line,.pg>circle{opacity:0;pointer-events:none}.pg:hover>line,.pg:hover>circle,.pg:focus-within>line,.pg:focus-within>circle{opacity:1}</style>${grid}
        <path d="${kv.pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + "," + Y(p.cm).toFixed(1)).join("")}" fill="none" stroke="#2b8c86" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="${X(t0)}" x2="${X(t0)}" y1="6" y2="${B - 10}" stroke="#c9503a" stroke-dasharray="3 2"/><circle cx="${X(t0)}" cy="${Y(kv.pts[0].cm).toFixed(1)}" r="4.5" fill="#c9503a" stroke="#fff" stroke-width="1.5"/><text x="${X(t0) + 5}" y="12" font-size="9.5" font-weight="700" fill="#c9503a">sekarang</text>${pc}${sumbu}${kena}</svg>`; })() : "";
    const isi = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="display:inline-flex;align-items:baseline;gap:6px"><b style="font-size:46px;line-height:1;font-weight:800;color:var(--ink)">${k ? PosAir.cmMinus(k.cm) : "–"}</b>${k ? `<span style="font-size:15px;color:var(--ink2)">cm</span>` : ""}</span>${tren ? `<span class="pill pa-pil" style="background:${WR[tren]};color:#fff">${ik(tren)}Sedang ${tren.toLowerCase()}</span>` : ""}</div>
      <div class="lbl" style="margin:0">Prediksi pukul ${PosAir.jamWib(now)} WIB</div>${k ? "" : `<p class="fnd" style="margin:0">Prediksi jam ini tidak tersedia (deret belum selaras dengan puncak).</p>`}
      ${s.di_atas_biasa ? `<span class="pill pa-pil" style="justify-self:start;background:#e58a45;color:#fff">${PosAir.ikonPil("Siaga 2")}Pasang tinggi di atas biasa${s.p90_harian_cm != null ? `, p90 harian ${PosAir.cmMinus(s.p90_harian_cm)} cm` : ""}</span>` : ""}
      ${kurva}
      <table class="tb2 pa-pk"><tbody>${pk.map(x => `<tr><td>${pil(x.jenis)}</td><td>${x.hari} ${x.jam} WIB</td><td class="n"><span class="pa-v">${PosAir.cmMinus(x.cm)}</span><span class="pa-u">cm</span></td></tr>`).join("")}</tbody></table>
      <p class="fnd">Sumber: BMKG Maritim, prediksi pasang surut${this.PS.dibuat ? ", dibuat " + PosAir.tglJamWib(Date.parse(this.PS.dibuat) / 1000) : ""}.</p>`;
    Analisa.buka(isi, `<div><h3 id="dlgJudul">${esc(s.nama)}</h3><p>Pasang surut</p></div>`); },
  /* jumlah, batang status berlegenda, kalimat, daftar perlu dipantau: dipakai panel nasional dan laci provinsi */
  ringkasHtml(pos) {
    const R = PosAir.ringkas(pos), K = PosAir.WARNA_KELAS, bt = [["Normal", "Normal"], ["Siaga 3", "Siaga 3"], ["Siaga 2", "Siaga 2"], ["Siaga 1", "Siaga 1"], ["mati", "Tidak mengirim"]], pantau = PosAir.perluPantau(pos).slice(0, 20), n = PosAir.angkaId;
    const pk = this.PS?.stasiun?.find(x => /Tanjung Priok/i.test(x.nama)), ps = pk && PosAir.pasutSekarang(pk, Date.now() / 1000), upd = this.D?.dibuat ? ` Diperbarui ${PosAir.jamWib(this.D.dibuat)} WIB.` : "";
    return `<div class="pa-kep"><small>LANGSUNG SEKARANG</small><div><b>${n(R.total)} pos tinggi air</b>, ${n(R.kirim)} mengirim data</div></div>
      <div class="pa-bt">${bt.map(([k]) => R[k] ? `<i style="flex:${R[k]};background:${K[k]}"></i>` : "").join("")}</div>
      <div class="leg pa-lg">${bt.map(([k, nm]) => `<span><i class="sw dot" style="background:${K[k]}"></i>${nm} <b>${n(R[k])}</b></span>`).join("")}</div>
      <p class="fnd">${esc(PosAir.kalimat(pos))}${ps ? ` Pasang Tanjung Priok sedang ${ps.arah}.` : ""}${upd}</p>
      ${pantau.length ? `<div class="lbl pa-jd">Perlu dipantau</div><div class="pa-kt">${this.baris(pantau)}</div>` : ""}`; },
  /* laci provinsi: pos di provinsi yang diklik, gaya Oyen; tanpa pos jatuh ke rincian wilayah. Kerangka urgent, daftar menyusul satu frame */
  provinsi(kunci, geom) {
    if (kunci) this._prov = {kunci, nama: namaProv(kunci), pos: null, geom};
    const pr = this._prov; if (!pr) return;
    this._g = null; this.pilih(null);
    Analisa.buka(`<div id="paProv"><small>Memuat pos</small></div>`, `<div><h3 id="dlgJudul">${esc(pr.nama)}</h3><p>Pos tinggi air</p></div>`);
    nanti(() => { if (this._prov !== pr) return; pr.pos ||= this._agg?.get(pr.kunci)?.pos || PosAir.dalam(this.D?.pos, pr.geom);   /* pemetaan siap = baca; belum = hitung di sini, di luar handler klik */
      if (!pr.pos.length) return Analisa.wilayah(pr.kunci);
      const el = $("#paProv"); if (!el) return;
      const grup = this.kelompok(pr.pos.filter(p => p.status !== "lama" && p.status !== "macet")), mati = PosAir.macetPerPengelola(pr.pos), g = (k, l, at, i) => `<details class="pa-grup" ${at}="${i}"><summary><b>${esc(k)}</b> <small>${PosAir.angkaId(l.length)} pos</small></summary><div class="gr pa-kt"></div></details>`;
      el.innerHTML = this.ringkasHtml(pr.pos) + `<div class="lbl pa-jd">Per sungai dan wilayah</div>` + grup.map(([k, l], i) => g(k, l, "data-g", i)).join("")
        + (mati.length ? `<div class="lbl pa-jd">Tidak mengirim</div>` + mati.map(([k, l], i) => g(k, l, "data-m", i)).join("") : "") + `<p class="fnd">${esc(PosAir.kakiPanel(pr.pos))}</p>`;
      el.addEventListener("toggle", e => { const d = e.target; if (!d.open || d.dataset.isi || !d.classList?.contains("pa-grup")) return; d.dataset.isi = 1;   /* isi kartu grup digambar saat dibuka */
        d.querySelector(".gr").innerHTML = this.baris(d.dataset.g != null ? grup[+d.dataset.g][1] : mati[+d.dataset.m][1]); }, true); }); },
  /* cadangan kelompok: kabupaten/kota terdekat dari pusat kecamatan (data/pusat_kec.json, dimuat gelembung.js); di-cache per pos */
  kabDari(p) { if (!Gelembung.kec) return null; const m = this._kabP ||= new Map(); if (!m.has(p.id)) m.set(p.id, PosAir.kabTerdekat(p, Gelembung.kec)); return m.get(p.id); },
  kelompok(pos) { return PosAir.kelompok(pos, p => this.kabDari(p)); },
  /* panel nasional di sidebar kanan (laci yang sama dengan kartu pos dan pasut), dibuka dari tombol di legenda */
  nasional() { const pos = this.D?.pos; if (!pos?.length) return; this._prov = {kunci: "", nama: "Indonesia", pos, geom: null}; this.provinsi(); },
  /* kartu hover pos: nama dengan pil status, sungai dan kabupaten, tinggi air dan selisih ke batas berikut */
  kartuHover(x) { const w = PosAir.redup(x.status) ? "#7a8796" : PosAir.warnaPos(x), nb = PosAir.menujuBatas(x), r = PosAir.resmi(x);
    return PI.kartuTip({judul: `${esc(PosAir.judulPos(x.nama))} ${this.pilPos(x)}`, sub: `<small class="tp-sub">${esc(PosAir.subjudul(x))}</small>`,
      stat: [["sungai", PosAir.teksPos(x), "tinggi air", w, PosAir.denyutPos(x)], ...(nb && !PosAir.redup(x.status) ? [["debit", PosAir.angkaId(nb.cm) + " cm", "ke " + nb.nama, PosAir.RESMI[nb.nama][0]]] : [])]}); },
  /* pemetaan pos ke wilayah (provinsi atau kabupaten tingkat yang sedang dimuat) dibangun sekali per kunci, di luar handler hover/klik */
  petakan() { const m = this._agg ||= new Map(); if (!this.D?.pos || !S.fiturWil) return;
    for (const f of S.fiturWil) { const k = f.properties.kunci; if (k.split("|").length < 3 && !m.has(k)) { const pos = PosAir.dalam(this.D.pos, f.geometry); m.set(k, {pos, R: PosAir.ringkas(pos)}); } } },
  /* ringkasan pos satu wilayah; null selama pemetaan belum siap (kartu hover tampil tanpa kotak pos) */
  agg(kunci) { return this._agg?.get(kunci)?.R || null; },
  /* panel kiri dihapus (pemilik, 27 Okt 2026): daftar pos hidup di sidebar kanan lewat nasional(); di sini hanya membersihkan sisa panel lama dan menyegarkan legenda */
  daftar() { $("#posPanel")?.remove(); renderLegenda(); },
  /* kartu baris bulat: kapsul status, nama, "sungai, kota", angka cm + pil, batang ambang dengan tiga tik (tooltip data-tip, fokus papan ketik) */
  baris(l) { return l.map(x => { const tip = PosAir.tipAmbang(x), b = PosAir.batangAmbang(x), w = PosAir.redup(x.status) ? "#7a8796" : PosAir.warnaPos(x);
    return `<button class="tb pa-baris" data-pos="${esc(x.id)}"${tip ? ` data-tip="${esc(tip)}" aria-label="${esc(PosAir.judulPos(x.nama) + ": " + tip)}"` : ""}>${this.kapsul(x)}<span class="pa-isi"><b class="pa-nm">${esc(PosAir.judulPos(x.nama))}</b><small>${esc(PosAir.subjudul(x))}</small></span>
      <span class="pa-kn"><b style="color:${w}">${PosAir.teksPos(x)}</b>${this.pilPos(x)}</span>${b ? `<span class="pa-ba"><i style="width:${b.isi}%;background:${w}"></i>${b.tik.map(t => `<u style="left:${t.pos}%;background:${t.warna}"></u>`).join("")}</span>` : ""}</button>`; }).join(""); },
  async mulai() { await this.muat(); const sm = peta.getSource("pos"); sm ? sm.setData(PosAir.geojson(this.D?.pos)) : this.lapis(); this.ruas(); this.daftar(); nanti(() => this.pasut()); },
};
/* data dimuat sesudah peta siap; segar lagi saat tab kembali terlihat dan data lebih tua dari 5 menit */
document.addEventListener("visibilitychange", () => { if (!document.hidden && PosUkur.D && Date.now() - PosUkur.t0 > 3e5) { PosUkur.p = null; PosUkur.muat().then(() => { peta?.getSource("pos")?.setData(PosAir.geojson(PosUkur.D?.pos)); PosUkur.ruas(); PosUkur.daftar(); }); } });
document.addEventListener("click", e => { if (e.target.closest("[data-pos-nas]")) PosUkur.nasional(); });
