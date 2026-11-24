"use strict";
/* Mesin laporan harian generik (public/inti). Kontrak data: docs/multi-bencana/LAPORAN-HARIAN.md (laporan.json v1).
   Skrip klasik; butuh format.js, kartu.js (Kartu), pilih.js, tip.js, tabel.js (pengurutKepala) lebih dulu.
   Pakai: Laporan.pasang({id, url}) ke dalam <div id="laporan">; url bawaan /${id}/data/laporan.json. Status di URL: ?prov=<kode>&hari=<iso>.
   Penyusun HTML (Laporan.bangun/bagian/baris/awal) murni: tanpa DOM, bisa diuji lewat vm. Semua teks dari JSON lewat esc(). */
const Laporan = (() => {
  const URUT = ["kop", "kepala", "ring", "tren", "sorot", "prakiraan", "prov", "naik", "kab", "tambahan", "sumber"];
  const RENTANG = [["7", "7 hari"], ["30", "30 hari"], ["0", "Semua"]];
  const LV = {awas: ["lv3", "Awas"], siaga: ["lv2", "Siaga"], waspada: ["lv1", "Waspada"], info: ["lv0", "Info"]};
  const ada = v => typeof v === "number" && !isNaN(v);
  const angka = (v, d = 0) => ada(v) && isFinite(v) ? v.toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}) : "–";
  const tgl = (h, th) => { const d = new Date(h + "T12:00:00Z"); return isNaN(d) ? String(h) : d.toLocaleDateString("id-ID", {day: "numeric", month: "short", ...(th ? {year: "numeric"} : {}), timeZone: "UTC"}); };
  const wkt = iso => { const d = new Date(iso); return iso && !isNaN(d) ? jamWIB(d) : "–"; };
  /* tautan dari data: hanya jalur situs ("/x", bukan "//x" atau "/\x") atau http(s); selain itu "#" */
  const tautan = u => /^\/([^\/\\]|$)|^https?:\/\//i.test(String(u ?? "")) ? esc(u) : "#";
  const A = (o, k, n) => { const a = o && o[k]; return Array.isArray(a) ? a : Array(n).fill(null); };
  const nama = (D, p) => Object.hasOwn(D.prov, p) ? D.prov[p].nama : p;
  const gabung = (m, a) => { const v = a.filter(ada); if (!v.length) return null; const j = v.reduce((x, y) => x + y, 0);
    return m.agregat === "maks" ? Math.max(...v) : m.agregat === "rerata" ? j / v.length : j; };
  /* perubahan a terhadap b; c = kelas warna menurut arah metrik (naik = merah, turun = hijau; netral tanpa warna) */
  const ubah = (m, a, b) => {
    if (!ada(a) || !ada(b)) return {p: null, t: "–", c: "", k: ""};
    if (a === b) return {p: 0, t: "0%", c: "", k: "sama dengan kemarin"};
    const naik = a > b, p = b === 0 ? Infinity : Math.round((a - b) / Math.abs(b) * 100), pc = b === 0 ? "dari nol" : angka(Math.abs(p)) + "%";
    return {p, t: (naik ? "▲ " : "▼ ") + (b === 0 ? "baru" : pc), c: m.arah === "netral" ? "" : naik === (m.arah !== "naik_baik") ? "naik" : "turun", k: (naik ? "naik " : "turun ") + pc + (b === 0 ? "" : " dari kemarin")};
  };
  /* ---- gaya seksi (opt-in, S.seksi): kepala kartu = nama seksi berikon, angka di isi, sumber ke title kepala, tanpa kaki "Sumber:",
     nilai kosong "tidak ada data", simbol dan singkatan dari label data dirapikan saat tampil (datanya tidak diubah). Banjir dan
     laporan contoh tetap gaya lama; dinyalakan per id di SEKSI atau lewat Laporan.pasang({seksi: true}). */
  const SEKSI = ["gempa", "kekeringan", "gunungapi", "cuaca", "udara", "pesisir"];
  const rapi = t => String(t ?? "").replace(/\s*≥\s*([\d.,]+)/g, " $1 atau lebih").replace(/\s*≤\s*([\d.,]+)/g, " $1 atau kurang")
    .replace(/\b([Kk])ab\/kota\b/g, (_, k) => (k === "K" ? "K" : "k") + "abupaten/kota");
  const T = (c, t) => esc(c.S.seksi ? rapi(t) : t);
  const NA = '<span class="lp-na">tidak ada data</span>';
  const N = (c, v, d = 0) => ada(v) && isFinite(v) ? angka(v, d) : c.S.seksi ? NA : "–";
  const sp = (u, c) => u.p == null && c && c.S.seksi ? NA : u.c ? `<span class="${u.c}">${esc(u.t)}</span>` : esc(u.t);
  /* label metrik + satuan: gaya seksi menulis "Label (satuan)" supaya tidak terbaca menyambung */
  const AGR = {maks: "nilai tertinggi", rerata: "rata-rata"};
  const lbl = (c, m, agr) => { const s = m.satuan && m.satuan.toLowerCase() !== String(m.label).toLowerCase() ? m.satuan : "";
    if (!c.S.seksi) return `${esc(m.label)}${s ? ` <small>${esc(s)}</small>` : ""}${agr && m.agregat && m.agregat !== "jumlah" ? ` <small>(${esc(m.agregat)})</small>` : ""}`;
    return `${T(c, m.label)}${s ? ` <small>(${T(c, s)})</small>` : ""}${agr && AGR[m.agregat] ? ` <small>(${AGR[m.agregat]})</small>` : ""}`; };
  const KK = c => c.S.seksi ? "Kabupaten/kota" : "Kab/kota";

  function awal(D, qs) {
    const q = new URLSearchParams(qs), n = D.hari.length, p = q.get("prov") || "";
    const hari = D.hari.includes(q.get("hari")) ? q.get("hari") : D.hari.includes(D.hari_lengkap) ? D.hari_lengkap : D.hari[n - 1];
    const u = D.metrik.find(m => m.utama) || D.metrik[0], urut = () => ({urut: u.k, turun: true, hal: 0});
    return {prov: D.prov && Object.hasOwn(D.prov, p) ? p : "", hari, rentang: "30", urut: {prov: urut(), kab: urut()}};
  }
  function kon(D, S) {
    const n = D.hari.length, i = Math.max(0, D.hari.indexOf(S.hari)), u = D.metrik.find(m => m.utama) || D.metrik[0];
    /* fokus = laporan kejadian satu kab/kota (scripts/umum/laporan_kejadian.py): ringkasan dan tren memakai seri kab itu */
    const f = D.fokus && (D.kab || []).find(k => k.kode === D.fokus);
    return {D, S, n, i, u, f, ms: D.metrik, sr: f || (S.prov ? D.prov[S.prov] : D.nasional), wil: f ? f.nama : S.prov ? nama(D, S.prov) : "", brj: h => !!D.hari_lengkap && h > D.hari_lengkap};
  }
  const sumberNama = D => esc((D.sumber || []).map(s => s.nama).filter(Boolean).join(", ") || "data bencana");
  const kartu = (ey, judul, isi, D, ctl = "") => Kartu.kartu(ey, judul, isi, sumberNama(D), ctl);
  /* kartu bagian: gaya lama = pil ey + kalimat judul + kaki sumber; gaya seksi = ikon + nama seksi, pil konteks (tanggal, wilayah), sumber di title */
  const K = (c, ey, judul, isi, ctl = "", o = {}) => {
    if (!c.S.seksi) return kartu(ey, judul, isi, c.D, ctl);
    const sb = (c.D.sumber || []).map(s => s.nama).filter(Boolean).join(", ") || "data bencana", tt = [o.ket, "Sumber: " + sb].filter(Boolean).join(". ");
    return Kartu.ex(`${IK[o.ik] || ""}${o.nama || esc(ey)}`, "", "", isi, "", ctl)
      .replace('<span class="ex-ey"></span>', `<span class="ex-ey">${o.pil || ""}</span>`).replace("<h3>", `<h3 title="${esc(tt)}">`).replace('<footer class="ex-ft"></footer>', ""); };
  const kosong = t => `<div class="kosong">${esc(t)}</div>`;
  const dgn = c => c.wil ? ", " + esc(c.wil) : "";

  /* ---- tabel yang bisa diurut (Per provinsi, Per kab/kota) ---- */
  const barisData = (c, o) => { const v = {}; c.ms.forEach(m => { v[m.k] = A(o, m.k, c.n)[c.i]; });
    const s = A(o, c.u.k, c.n); return {v, ub: ubah(c.u, s[c.i], c.i > 0 ? s[c.i - 1] : null)}; };
  const urutkan = (rows, st) => { const f = st.urut, d = st.turun ? -1 : 1, val = r => f === "nama" ? r.nama : f === "ubah" ? r.ub.p : r.v[f];
    return rows.sort((a, b) => { const x = val(a), y = val(b), t = a.nama.localeCompare(b.nama, "id");
      if (f === "nama") return d * x.localeCompare(y, "id");
      if (!ada(x) || !ada(y)) return ada(x) ? -1 : ada(y) ? 1 : t;
      return x === y ? t : d * (x < y ? -1 : 1); }); };
  const sel = (c, r, kls = "", td = "") => `<tr${kls}><td${td}>${esc(r.nama)}</td>${c.ms.map(m => `<td class="n">${N(c, r.v[m.k], m.desimal | 0)}</td>`).join("")}<td class="n">${sp(r.ub, c)}</td></tr>`;
  const kepalaTb = (c, st, kolom) => `<thead><tr>${[["nama", kolom, ""], ...c.ms.map(m => [m.k, m.label, "n", m.satuan]), ["ubah", "Ubah", "n"]]
    .map(([k, l, n, s]) => `<th${n ? ' class="n"' : ""}${c.S.seksi && s ? ` title="${T(c, l + " (" + s + ")")}"` : ""}><button type="button" data-k="${esc(k)}">${T(c, l)}<i>${st.urut === k ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>`;
  function barisProv(c) {
    const rows = Object.keys(c.D.prov).filter(p => !c.S.prov || p === c.S.prov).map(p => ({nama: c.D.prov[p].nama, ...barisData(c, c.D.prov[p])}));
    return rows.length ? urutkan(rows, c.S.urut.prov).map(r => sel(c, r)).join("") : `<tr><td colspan="${c.ms.length + 2}" class="kosong">Belum ada data provinsi.</td></tr>`;
  }
  function barisKab(c) {
    const st = c.S.urut.kab, g = new Map();
    (c.D.kab || []).filter(k => !c.S.prov || k.prov === c.S.prov).forEach(k => { if (!g.has(k.prov)) g.set(k.prov, []); g.get(k.prov).push({nama: k.nama, ...barisData(c, k)}); });
    if (!g.size) return `<tr><td colspan="${c.ms.length + 2}" class="kosong">Belum ada data ${c.S.seksi ? "kabupaten/kota" : "kab/kota"}.</td></tr>`;
    const ps = [...g.keys()].map(p => ({p, nama: nama(c.D, p), ...barisData(c, Object.hasOwn(c.D.prov, p) ? c.D.prov[p] : {})}));
    /* urutan kelompok: menurut kolom metrik bila itu yang diurut, selain itu menurut nama provinsi */
    const metrik = c.ms.some(m => m.k === st.urut);
    (metrik ? urutkan(ps, st) : ps.sort((a, b) => a.nama.localeCompare(b.nama, "id")));
    return ps.map(r => sel(c, r, ' class="lp-grp"') + urutkan(g.get(r.p), st).map(k => sel(c, k, "", ' class="lp-kab"')).join("")).join("");
  }
  const tabelUrut = (c, key, kolom, tfoot = "") => `<div class="tw"><table class="lp-tb" data-tb="${key}">${kepalaTb(c, c.S.urut[key], kolom)}<tbody>${key === "prov" ? barisProv(c) : barisKab(c)}</tbody>${tfoot}</table></div>`;

  /* ---- grafik batang metrik utama ---- */
  function batang(c, dari) {
    const {D, S, u} = c, v = A(c.sr, u.k, c.n), W = 720, H = 230, pl = 44, pr = 10, pt = 22, pb = 34, n = c.n - dari, d = u.desimal | 0;
    const mx = Math.max(1e-9, ...v.slice(dari).filter(ada)), e = 10 ** Math.floor(Math.log10(mx)), f = mx / e, top = d === 0 && mx <= 40 ? Math.max(4, Math.ceil(mx / 4) * 4) : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
    const slot = (W - pl - pr) / n, bw = Math.max(2, slot * .7), ya = x => pt + (H - pt - pb) * (1 - x / top), step = Math.ceil(n / 9), td = d;
    let s = `<defs><pattern id="lpHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#d2772c" fill-opacity=".25"/><line x1="0" y1="0" x2="0" y2="6" stroke="#d2772c" stroke-width="3"/></pattern></defs>`;
    for (let k = 0; k <= 4; k++) { const x = top * k / 4, y = ya(x); s += `<line class="lp-gl" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="lp-gp" x="${pl - 6}" y="${y + 4}" text-anchor="end" font-size="11">${angka(x, td)}</text>`; }
    for (let j = dari; j < c.n; j++) { const h = D.hari[j], x = pl + (j - dari) * slot, val = v[j], brj = c.brj(h), on = h === S.hari;
      const tip = `<b>${esc(tgl(h, 1))}</b>${brj ? " (berjalan)" : ""}<br>${T(c, u.label)}: ${T(c, ada(val) ? angka(val, d) + " " + (u.satuan || "") : "tidak ada data")}`;
      const y = ada(val) ? ya(val) : H - pb;
      s += `<g data-tip="${esc(tip)}"><rect x="${x}" y="${pt}" width="${slot}" height="${H - pt - pb}" fill="transparent"/>`
        + (ada(val) ? `<rect class="lp-bar${on ? " on" : ""}${brj ? " lp-sm" : ""}" x="${x + (slot - bw) / 2}" y="${y}" width="${bw}" height="${Math.max(0, H - pb - y)}" rx="2"/>` : "")
        + (n <= 16 && ada(val) ? `<text class="lp-gp" x="${x + slot / 2}" y="${y - 4}" text-anchor="middle" font-size="11">${angka(val, d)}</text>` : "")
        + ((j - dari) % step === 0 ? `<text class="lp-sb${on ? " on" : ""}" x="${x + slot / 2}" y="${H - 12}" text-anchor="middle" font-size="11">${esc(tgl(h))}</text>` : "") + `</g>`; }
    return `<div class="lp-gr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T(c, "Tren harian " + u.label)}">${s}</svg></div>`;
  }

  /* ---- laporan rentang (PB-83, F-42): model murni, tanpa DOM ----
     Hanya tanggal yang ada di D.hari (D16). Angka per periode = gabung() menurut agregat metrik (jumlah, maks, rerata), tidak dihitung ulang dari sumber lain. */
  function rentang(D, S, dari, sampai) {
    const i0 = D.hari.indexOf(dari), i1 = D.hari.indexOf(sampai);
    if (i0 < 0 || i1 < 0 || i0 > i1) return null;
    const c = kon(D, S), hari = D.hari.slice(i0, i1 + 1), pot = (o, k) => A(o, k, c.n).slice(i0, i1 + 1);
    const ringkas = c.ms.map(m => { const a = pot(c.sr, m.k), ada1 = a.filter(ada), mx = ada1.length ? Math.max(...ada1) : null, j = mx == null ? -1 : a.indexOf(mx);
      return {m, total: gabung(m, a), rerata: ada1.length ? ada1.reduce((x, y) => x + y, 0) / ada1.length : null, maks: mx, hariMaks: j >= 0 ? hari[j] : null, hariData: ada1.length}; });
    const agr = o => Object.fromEntries(c.ms.map(m => [m.k, gabung(m, pot(o, m.k))]));
    const prov = Object.keys(D.prov).filter(p => !S.prov || p === S.prov).map(p => ({kode: p, nama: D.prov[p].nama, v: agr(D.prov[p])}))
      .sort((a, b) => (b.v[c.u.k] ?? -1) - (a.v[c.u.k] ?? -1) || a.nama.localeCompare(b.nama, "id"));
    const kab = (D.kab || []).filter(k => !S.prov || k.prov === S.prov).map(k => ({nama: k.nama, prov: nama(D, k.prov), v: agr(k)}))
      .filter(k => ada(k.v[c.u.k]) && k.v[c.u.k] > 0).sort((a, b) => b.v[c.u.k] - a.v[c.u.k]).slice(0, 10);
    return {c, i0, i1, dari, sampai, hari, ringkas, prov, kab, nasional: agr(c.sr), berjalan: hari.some(h => c.brj(h))};
  }
  /* tabel per hari untuk Excel: satu baris per hari per wilayah (Nasional atau provinsi terpilih, lalu provinsi, lalu kab/kota) */
  function barisHarian(D, S, dari, sampai) {
    const R = rentang(D, S, dari, sampai); if (!R) return null; const {c} = R, ms = c.ms;
    const kolom = ["Tanggal", "Tingkat", "Provinsi", "Wilayah", ...ms.map(m => m.label + (m.satuan && m.satuan.toLowerCase() !== String(m.label).toLowerCase() ? ` (${m.satuan})` : ""))];
    const nilai = (o, j) => ms.map(m => { const v = A(o, m.k, c.n)[j]; return ada(v) ? v : null; }), baris = [];
    const provUrut = Object.keys(D.prov).sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
    const kabUrut = (D.kab || []).filter(k => !S.prov || k.prov === S.prov).sort((a, b) => nama(D, a.prov).localeCompare(nama(D, b.prov), "id") || a.nama.localeCompare(b.nama, "id"));
    for (let j = R.i0; j <= R.i1; j++) { const h = D.hari[j], t = tgl(h, 1) + (c.brj(h) ? " (berjalan)" : "");
      baris.push([t, S.prov ? "Provinsi" : "Nasional", S.prov ? nama(D, S.prov) : "", S.prov ? nama(D, S.prov) : "Indonesia", ...nilai(c.sr, j)]);
      if (!S.prov && !c.f) provUrut.forEach(p => baris.push([t, "Provinsi", D.prov[p].nama, D.prov[p].nama, ...nilai(D.prov[p], j)]));
      kabUrut.forEach(k => baris.push([t, "Kab/kota", nama(D, k.prov), k.nama, ...nilai(k, j)])); }
    return {R, kolom, baris};
  }
  /* tampilan cetak ringkasan periode (PDF lewat dialog cetak peramban, sama dengan Cetak PDF satu hari) */
  function htmlRentang(R) {
    const {c} = R, D = c.D, per = `${tgl(R.dari, 1)} sampai ${tgl(R.sampai, 1)}`, u = c.u, du = u.desimal | 0, tot = R.ringkas.find(x => x.m.k === u.k);
    const kop = `<div class="lp-kop" aria-hidden="true"><img src="/img/logo.svg?v=2" alt="" width="40" height="40"><div><b>Centurisk97</b><span>${esc(D.judul)}</span><small>${esc(per)}${dgn(c)}</small></div></div><div class="lp-kop-garis" aria-hidden="true"></div>`;
    const kep = `<section class="lp-kep"><div class="lp-jd"><h1>${esc(D.judul)}: ${esc(per)}</h1><div class="lp-pils"><span class="lp-pil ${R.berjalan ? "sm" : "ok"}">${R.berjalan ? "Data masih bertambah" : "Data lengkap"}</span><span class="lp-pil">${angka(R.hari.length)} hari</span><span class="lp-pil">Cut-off ${esc(wkt(D.cutoff))}</span></div></div></section>`;
    const ag = m => m.agregat === "maks" ? "tertinggi" : m.agregat === "rerata" ? "rerata" : "jumlah";
    const sk = !!c.S.seksi, pil = esc(per) + dgn(c), ag2 = m => sk ? (AGR[m.agregat] || "jumlah") : ag(m);
    const ring = K(c, "Ringkasan periode", `${esc(u.label)} ${esc(per)}${dgn(c)}: ${Kartu.hl(angka(tot.total, du))} ${esc(u.satuan || "")}`,
      `<div class="tw"><table class="lp-tb"><thead><tr><th>Metrik</th><th class="n">Periode</th><th class="n">Rata-rata per hari</th><th class="n">Hari tertinggi</th></tr></thead><tbody>${R.ringkas.map(x => { const d = x.m.desimal | 0;
        return `<tr><td>${lbl(c, x.m)} <small>(${ag2(x.m)})</small></td><td class="n">${N(c, x.total, d)}</td><td class="n">${N(c, x.rerata, d || 1)}</td><td class="n">${x.hariMaks ? `${angka(x.maks, d)} <small>${esc(tgl(x.hariMaks))}</small>` : sk ? NA : "–"}</td></tr>`; }).join("")}</tbody></table></div>`, "", {ik: "ring", pil});
    const tren = K(c, "Tren harian", `Tren harian ${esc(u.label)}${dgn(c)}, ${esc(per)}`, batang({...c, n: R.i1 + 1}, R.i0), "", {ik: "tren", nama: `Tren harian ${T(c, u.label)}`, pil});
    const kolM = c.ms.map(m => `<th class="n">${T(c, m.label)}</th>`).join(""), selM = v => c.ms.map(m => `<td class="n">${N(c, v[m.k], m.desimal | 0)}</td>`).join("");
    const prov = R.prov.length && !c.f ? K(c, "Per provinsi", `Per provinsi, ${esc(per)}`, `<div class="tw"><table class="lp-tb"><thead><tr><th>Provinsi</th>${kolM}</tr></thead><tbody>${R.prov.map(r => `<tr><td>${esc(r.nama)}</td>${selM(r.v)}</tr>`).join("")}</tbody>${c.S.prov ? "" : `<tfoot><tr><td>Nasional</td>${selM(R.nasional)}</tr></tfoot>`}</table></div>`, "", {ik: "prov", pil: esc(per)}) : "";
    const kk = sk ? "kabupaten/kota" : "kab/kota";
    const kab = K(c, "Kab/kota teratas", R.kab.length ? `${angka(R.kab.length)} kab/kota dengan ${esc(String(u.label).toLowerCase())} terbanyak, ${esc(per)}` : "Tidak ada kab/kota bernilai pada periode ini",
      R.kab.length ? `<div class="tw"><table class="lp-tb"><thead><tr><th class="n">#</th><th>${KK(c)}</th><th>Provinsi</th>${kolM}</tr></thead><tbody>${R.kab.map((r, j) => `<tr><td class="n">${j + 1}</td><td>${esc(r.nama)}</td><td>${esc(r.prov)}</td>${selM(r.v)}</tr>`).join("")}</tbody></table></div>` : kosong(`Tidak ada ${kk} bernilai pada periode ini.`), "",
      {ik: "kab", nama: "Kabupaten dan kota teratas", pil: R.kab.length ? `${angka(R.kab.length)} teratas, ${esc(per)}` : esc(per)});
    return `<div id="insight" class="lp lp-rentang${sk ? " lp-seksi" : ""}">${kop}${kep}${ring}${tren}${prov}${kab}${B.sumber(c)}</div>`;
  }

  /* ---- bagian ---- */
  const B = {
    kop: c => `<div class="lp-kop" aria-hidden="true"><img src="/img/logo.svg?v=2" alt="" width="40" height="40"><div><b>Centurisk97</b><span>${esc(c.D.judul)}</span><small>${esc(tgl(c.S.hari, 1))}${dgn(c)}</small></div></div><div class="lp-kop-garis" aria-hidden="true"></div>`,
    kepala(c) {
      const {D, S} = c, brj = c.brj(S.hari), kodes = Object.keys(D.prov).sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
      const hari = `<select data-set="hari" aria-label="Hari laporan">${[...D.hari].reverse().map(h => `<option value="${esc(h)}"${h === S.hari ? " selected" : ""}>${esc(tgl(h, 1))}${c.brj(h) ? " (berjalan)" : ""}</option>`).join("")}</select>`;
      return `<section class="lp-kep" aria-live="polite"><div class="lp-jd"><h1>${esc(D.judul)}</h1><div class="lp-pils"><span class="lp-pil ${brj ? "sm" : "ok"}" title="${brj ? "Hari ini belum selesai; angka masih bisa bertambah sampai pukul 24.00 WIB" : "Hari sudah selesai; angka tidak berubah lagi"}">${brj ? "Data masih bertambah" : "Data lengkap"}</span><span class="lp-pil">Cut-off ${esc(wkt(D.cutoff))}</span></div></div>
        <div class="lp-aksi">${hari}${kodes.length && !c.f ? Kartu.selProv("prov", "Seluruh Indonesia", kodes, k => D.prov[k].nama, S) : ""}<button type="button" class="lp-cetak" id="lpRentang" aria-haspopup="dialog" aria-label="Unduh laporan rentang tanggal" title="Unduh laporan rentang tanggal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 13v5m0 0-2-2m2 2 2-2"/></svg></button><button type="button" class="lp-cetak" id="lpCetak" aria-label="Cetak PDF" title="Cetak PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/></svg></button></div></section>`; },
    ring(c) {
      const {D, S, u, i, n} = c, s = A(c.sr, u.k, n), ub = ubah(u, s[i], i > 0 ? s[i - 1] : null), b = D.hari[i - 1];
      const judul = `${esc(u.label)} ${esc(tgl(S.hari))}${dgn(c)}: ${Kartu.hl(angka(s[i], u.desimal | 0))} ${esc(u.satuan || "")}${ub.k ? ", " + esc(ub.k) : ""}`;
      const bln = D.hari[i].slice(0, 7), baris = c.ms.map(m => { const a = A(c.sr, m.k, n), d = m.desimal | 0, x = a[i], y = i > 0 ? a[i - 1] : null;
        const w7 = gabung(m, a.slice(Math.max(0, i - 6), i + 1)), bl = gabung(m, a.slice(0, i + 1).filter((_, j) => D.hari[j].slice(0, 7) === bln));
        return `<tr><td>${lbl(c, m, true)}</td><td class="n">${N(c, x, d)}</td><td class="n">${N(c, y, d)}</td><td class="n">${sp(ubah(m, x, y), c)}</td><td class="n">${N(c, w7, d)}</td><td class="n">${N(c, bl, d)}</td></tr>`; }).join("");
      /* gaya seksi: kotak angka hari ini per metrik di awal isi (angka temuan pindah dari kepala ke isi) */
      const ka = !S.seksi ? "" : `<div class="lp-ka">${c.ms.map(m => { const a = A(c.sr, m.k, n), x = a[i], y = i > 0 ? a[i - 1] : null, ux = ubah(m, x, y), s = m.satuan && m.satuan.toLowerCase() !== String(m.label).toLowerCase() ? m.satuan : "";
        return `<div class="lp-ka-i${m.utama ? " utama" : ""}"><span>${T(c, m.label)}</span><b>${N(c, x, m.desimal | 0)}</b>${s && ada(x) ? `<small>${T(c, s)}</small>` : ""}<em${ux.c ? ` class="${ux.c}"` : ""}>${ux.k ? esc(ux.k[0].toUpperCase() + ux.k.slice(1)) : "Tidak ada data kemarin untuk dibandingkan"}</em></div>`; }).join("")}</div>`;
      return K(c, "Ringkasan", judul, `${ka}<div class="tw"><table class="lp-tb"><thead><tr><th>Metrik</th><th class="n">${esc(tgl(S.hari))}${c.brj(S.hari) ? ' <span class="lp-bf">berjalan</span>' : ""}</th><th class="n">${b ? esc(tgl(b)) : "Kemarin"}</th><th class="n">Ubah</th><th class="n">7 hari</th><th class="n">Bulan ini</th></tr></thead><tbody>${baris}</tbody></table></div>`, "",
        {ik: "ring", pil: esc(tgl(S.hari, 1)) + dgn(c)}); },
    tren(c) {
      const r = +c.S.rentang, dari = r > 0 ? Math.max(0, c.n - r) : 0;
      return K(c, "Tren harian", `Tren harian ${esc(c.u.label)}${dgn(c)}, ${c.n - dari} hari terakhir`, batang(c, dari), Kartu.seg("rentang", RENTANG, c.S),
        {ik: "tren", nama: `Tren harian ${T(c, c.u.label)}`, pil: esc(c.wil || "Seluruh Indonesia")}); },
    sorot(c) {
      const l = (c.D.sorot || []).filter(o => !c.S.prov || !o.prov || o.prov === c.S.prov);
      const isi = l.length ? `<ul class="lp-so">${l.map(o => { const [k, t] = LV[o.tingkat] || LV.info, h = o.tautan ? tautan(o.tautan) : "#";
        return `<li><span class="lp-lv ${k}">${t}</span><div><b>${T(c, o.judul)}</b>${o.teks ? `<span>${T(c, o.teks)}</span>` : ""}</div>${h !== "#" ? `<a href="${h}">Buka</a>` : ""}</li>`; }).join("")}</ul>` : kosong("Tidak ada hal yang perlu perhatian khusus.");
      return K(c, "Perlu perhatian", l.length ? `${angka(l.length)} hal perlu perhatian${dgn(c)}` : "Tidak ada hal yang perlu perhatian khusus", isi, "",
        {ik: "sorot", pil: l.length ? `${angka(l.length)} hal${dgn(c)}` : esc(c.wil)}); },
    prakiraan(c) {
      const P = c.D.prakiraan; if (!P || !Array.isArray(P.hari)) return "";
      const rows = (P.baris || []).filter(o => !c.S.prov || !o.prov || o.prov === c.S.prov), pr = o => o.satuan === "peluang";
      const isi = rows.length ? `<div class="tw"><table class="lp-tb"><thead><tr><th>Lokasi</th>${P.hari.map(h => `<th class="n">${esc(tgl(h))}</th>`).join("")}</tr></thead><tbody>${rows.map(o => `<tr><td>${T(c, o.label)}</td>${P.hari.map((_, j) => { const v = (o.nilai || [])[j];
        return `<td class="n">${ada(v) ? pr(o) ? angka(v * 100) + "%" : angka(v, 1) : N(c, v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>` : kosong("Tidak ada prakiraan untuk wilayah ini.");
      /* gaya seksi: judul prakiraan dari data bisa berupa kalimat temuan, jadi pindah ke title kepala */
      return K(c, "Prakiraan", esc(P.judul || "Prakiraan"), isi, "", {ik: "prakiraan", pil: `${angka(P.hari.length)} hari ke depan`, ket: rapi(P.judul || "")}); },
    prov(c) {
      const tf = c.S.prov ? "" : (r => `<tfoot>${sel(c, r)}</tfoot>`)({nama: "Nasional", ...barisData(c, c.D.nasional)});
      return K(c, "Per provinsi", `Per provinsi, ${esc(tgl(c.S.hari))}${c.S.prov ? ", " + esc(c.wil) : ""}`, tabelUrut(c, "prov", "Provinsi", tf), "", {ik: "prov", pil: esc(tgl(c.S.hari, 1)) + dgn(c)}); },
    naik(c) {
      const {u, i, n} = c, d = u.desimal | 0, k = c.D.kab || [], kk = c.S.seksi ? "kabupaten/kota" : "kab/kota";
      const l = i < 1 ? [] : k.filter(o => !c.S.prov || o.prov === c.S.prov).map(o => { const s = A(o, u.k, n); return {o, a: s[i], b: s[i - 1]}; })
        .filter(x => ada(x.a) && ada(x.b) && x.a > x.b).sort((x, y) => (y.a - y.b) - (x.a - x.b)).slice(0, 10);
      const isi = l.length ? `<div class="tw"><table class="lp-tb"><thead><tr><th class="n">#</th><th>${KK(c)}</th><th>Provinsi</th><th class="n">Kemarin</th><th class="n">Hari ini</th><th class="n">Naik</th></tr></thead><tbody>${l.map((x, j) =>
        `<tr><td class="n">${j + 1}</td><td>${esc(x.o.nama)}</td><td>${esc(nama(c.D, x.o.prov))}</td><td class="n">${angka(x.b, d)}</td><td class="n">${angka(x.a, d)}</td><td class="n"><span class="naik">▲ ${angka(x.a - x.b, d)}</span></td></tr>`).join("")}</tbody></table></div>` : kosong(`Tidak ada ${kk} yang naik dibanding kemarin.`);
      return K(c, "Kenaikan terbesar", l.length ? `Kenaikan terbesar ${esc(u.label)} per kab/kota${dgn(c)}` : "Tidak ada kab/kota yang naik dibanding kemarin", isi, "",
        {ik: "naik", nama: "Kenaikan terbesar per kabupaten dan kota", pil: `${T(c, u.label)}${dgn(c)}`}); },
    kab: c => K(c, "Per kab/kota", `Per kab/kota, ${esc(tgl(c.S.hari))}${c.S.prov ? ", " + esc(c.wil) : ""}`, tabelUrut(c, "kab", KK(c)), "", {ik: "kab", nama: "Per kabupaten dan kota", pil: esc(tgl(c.S.hari, 1)) + dgn(c)}),
    tambahan: c => (c.D.tambahan || []).map(t => { const nm = x => typeof x === "number" ? angka(x, Number.isInteger(x) ? 0 : 1) : x == null ? (c.S.seksi ? NA : "–") : T(c, x);
      return K(c, "Tambahan", esc(t.judul), `<div class="tw"><table class="lp-tb"><thead><tr>${(t.kolom || []).map((k, j) => `<th${(t.baris || []).some(r => typeof r[j] === "number") ? ' class="n"' : ""}>${T(c, k)}</th>`).join("")}</tr></thead><tbody>${(t.baris || []).map(r =>
        `<tr>${r.map(x => `<td${typeof x === "number" ? ' class="n"' : ""}>${nm(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${t.catatan ? `<p class="lp-cat">${T(c, t.catatan)}</p>` : ""}`, "", {ik: "tambahan", nama: T(c, t.judul)}); }).join(""),
    sumber(c) {
      const {D} = c, l = (D.sumber || []).map(s => { const h = tautan(s.url);
        return `<li>${h !== "#" ? `<a href="${h}" target="_blank" rel="noopener">${esc(s.nama)}</a>` : esc(s.nama)}${s.catatan ? ` <span>${T(c, s.catatan)}</span>` : ""}</li>`; }).join("");
      return K(c, "Sumber", "Sumber dan cut-off", `${l ? `<ul class="lp-sl">${l}</ul>` : ""}<p class="lp-cat">Data terakhir masuk ${esc(wkt(D.cutoff))}. Laporan dibuat ${esc(wkt(D.dibuat))}.</p>`, "", {ik: "sumber", nama: "Sumber dan cut-off"}); },
  };

  function cek(D) {
    if (!D || typeof D !== "object" || D.v !== 1) return "Format laporan tidak dikenali.";
    if (!Array.isArray(D.hari) || !D.hari.length || !Array.isArray(D.metrik) || !D.metrik.length || !D.nasional || typeof D.nasional !== "object") return "Laporan belum berisi data.";
    D.prov = D.prov && typeof D.prov === "object" ? D.prov : {};
    return "";
  }
  const nanti = f => requestAnimationFrame(() => setTimeout(f, 0));

  function pasang({id, url, seksi} = {}) {
    const host = document.getElementById("laporan"); if (!host) return;
    const tema = document.getElementById("tema");
    if (tema) tema.onclick = () => { const gelap = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, t = gelap ? "light" : "dark";
      document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };
    host.innerHTML = '<div class="kosong" role="status">Memuat laporan…</div>';
    return (async () => {
      let D;
      try { const r = await fetch(url || `/${id}/data/laporan.json`, {cache: "no-cache"}); if (!r.ok) throw new Error(r.status); D = await r.json(); }
      catch (e) { host.innerHTML = '<div class="kosong" role="alert">Laporan belum bisa dimuat. Coba lagi nanti.</div>'; return; }
      const gal = cek(D); if (gal) { host.innerHTML = `<div class="kosong" role="alert">${esc(gal)}</div>`; return; }
      const S = awal(D, location.search); S.seksi = seksi ?? SEKSI.includes(id);
      document.title = D.judul + ", Centurisk97";
      const upd = document.getElementById("upd"); if (upd) upd.textContent = "Data s.d. " + wkt(D.cutoff);
      host.innerHTML = `<div id="insight" class="lp${S.seksi ? " lp-seksi" : ""}">${URUT.map(k => `<div data-ex="${k}"></div>`).join("")}</div>`;
      const isi = k => { const e = host.querySelector(`[data-ex="${k}"]`); e.innerHTML = bagian(D, S, k);
        /* kepala kolom tabel: pengurut bersama; hanya <tbody> yang digambar ulang, jadi pendengar di <thead> tetap hidup */
        const th = (k === "prov" || k === "kab") && e.querySelector("thead");
        if (th) pengurutKepala(S.urut[k], th, () => nanti(() => { const tb = e.querySelector("tbody"); if (tb) tb.innerHTML = baris(D, S, k); })); };
      const semua = (l = URUT) => { isi(l[0]); if (l.length > 1) setTimeout(() => semua(l.slice(1)), 0); };
      semua();
      host.addEventListener("click", e => {
        if (e.target.closest("#lpCetak")) return print();
        if (e.target.closest("#lpRentang")) return bukaRentang(D, S, host);
        const b = e.target.closest("button[data-set]"); if (!b || b.dataset.set !== "rentang") return;
        b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* kontrol urgent */
        S.rentang = b.dataset.v; nanti(() => isi("tren")); });
      host.addEventListener("change", e => {
        const s = e.target.closest("select[data-set]"); if (!s || (s.dataset.set !== "hari" && s.dataset.set !== "prov")) return;
        S[s.dataset.set] = s.dataset.set === "prov" && !Object.hasOwn(D.prov, s.value) ? "" : s.value;
        const u = new URL(location.href); S.prov ? u.searchParams.set("prov", S.prov) : u.searchParams.delete("prov"); u.searchParams.set("hari", S.hari); history.replaceState(null, "", u);
        nanti(() => semua()); });
      if (typeof pasangTip === "function" && document.getElementById("tip")) pasangTip();
      if (typeof PilihCantik !== "undefined" && document.querySelector("main")) PilihCantik.pasang();
    })();
  }
  /* ---- dialog unduh rentang (PB-83): kalender inti dan mesin unduh dimuat malas saat dibutuhkan, jadi laporan.html tiap bencana tidak berubah ---- */
  const muatSkrip = (src, css) => new Promise((ok, gagal) => {
    if (css && !document.querySelector(`link[href="${css}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = css; document.head.append(l); }
    const ada0 = document.querySelector(`script[src="${src}"]`); if (ada0) return ada0.dataset.siap ? ok() : ada0.addEventListener("load", () => ok(), {once: true});
    const s = document.createElement("script"); s.src = src; s.onload = () => { s.dataset.siap = 1; ok(); }; s.onerror = () => { s.remove(); gagal(new Error("Gagal memuat " + src)); }; document.head.append(s); });
  const svgI = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IK_KAL = svgI('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'), IK_PDF = svgI('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>'),
    IK_XLS = svgI('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>');
  /* ikon nama seksi (gaya seksi), ukuran dari kartu.css (h3>svg, setinggi huruf) */
  const IK = {
    ring: svgI('<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>'), tren: svgI('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    sorot: svgI('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'), prakiraan: svgI('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    prov: svgI('<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'), naik: svgI('<path d="M12 20V5M5 12l7-7 7 7"/>'),
    kab: svgI('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    tambahan: svgI('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'), sumber: svgI('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
  };
  function bukaRentang(D, S, host) {
    const akhir = D.hari_lengkap && D.hari.includes(D.hari_lengkap) ? D.hari_lengkap : D.hari[D.hari.length - 1], ia = D.hari.indexOf(akhir);
    const st = {dari: D.hari[Math.max(0, ia - 6)], sampai: akhir};
    let dlg = document.getElementById("lpDlgRentang");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "lpDlgRentang"; dlg.className = "dlg lp-dlg-rt"; document.body.append(dlg); }
    const pintas = [["7", "7 hari"], ["30", "30 hari"], ["0", "Semua"]];
    const gambar = () => { const R = rentang(D, S, st.dari, st.sampai), ok = !!R;
      dlg.innerHTML = `<div class="dh"><div><h3>Unduh laporan rentang tanggal</h3><p>${esc(D.judul)}${S.prov ? ", " + esc(nama(D, S.prov)) : ""}. Hanya tanggal yang ada di laporan yang bisa dipilih.</p></div><button type="button" data-rt="tutup" aria-label="Tutup">×</button></div>
        <div class="db"><div class="seg penuh lp-rt-pil" role="group" aria-label="Rentang cepat">${pintas.map(([v, l]) => `<button type="button" data-rt-n="${v}">${IK_KAL}${l}</button>`).join("")}</div>
        <div class="lp-rt-tgl"><label><span>Dari</span><button type="button" class="lp-rt-b" data-rt="dari">${IK_KAL}${esc(tgl(st.dari, 1))}</button></label><label><span>Sampai</span><button type="button" class="lp-rt-b" data-rt="sampai">${IK_KAL}${esc(tgl(st.sampai, 1))}</button></label></div>
        <p class="lp-rt-ket" role="status">${ok ? `${angka(R.hari.length)} hari dipilih${R.berjalan ? ", termasuk hari yang datanya masih bertambah" : ""}.` : "Tanggal awal harus sebelum atau sama dengan tanggal akhir."}</p>
        <div class="lp-rt-aksi"><button type="button" class="lp-rt-u" data-rt="pdf"${ok ? "" : " disabled"}>${IK_PDF}PDF ringkasan periode</button><button type="button" class="lp-rt-u sek" data-rt="xlsx"${ok ? "" : " disabled"}>${IK_XLS}Excel per hari</button></div></div>`; };
    const jumlah = () => { const c = kon(D, S), a = A(c.sr, c.u.k, c.n), j = {}; D.hari.forEach((h, k) => { if (ada(a[k])) j[h] = a[k]; }); return j; };
    dlg.onclick = async e => { const b = e.target.closest("button"); if (!b) return; const k = b.dataset.rt;
      if (b.dataset.rtN != null) { const n = +b.dataset.rtN; st.sampai = akhir; st.dari = n ? D.hari[Math.max(0, ia - n + 1)] : D.hari[0]; return gambar(); }
      if (k === "tutup") return dlg.close();
      if (k === "dari" || k === "sampai") { try { await muatSkrip("/inti/kalender.js", "/inti/kalender.css"); } catch (er) { return; }
        const c = kon(D, S); Kalender.buka({tombol: b, hariIni: D.hari[D.hari.length - 1], terpilih: st[k], judul: k === "dari" ? "Tanggal awal" : "Tanggal akhir", satuan: c.u.satuan || "data",
          ket: `Angka = ${String(c.u.label).toLowerCase()} hari itu. Yang bisa dipilih: tanggal yang ada di laporan.`, terbanyak: {judul: "Terbanyak", n: 6}, awal: D.hari[0],
          muat: async () => ({jumlah: jumlah()}), bisa: t => D.hari.includes(t), pilih: t => { st[k] = t; gambar(); }}); return; }
      if (k === "pdf") { const R = rentang(D, S, st.dari, st.sampai); if (!R) return; dlg.close();
        const simpan = host.innerHTML, judul = document.title; host.innerHTML = htmlRentang(R); document.title = `${D.judul} ${R.dari} sampai ${R.sampai}`;
        const pulih = () => { host.innerHTML = simpan; document.title = judul; removeEventListener("afterprint", pulih); }; addEventListener("afterprint", pulih);
        return setTimeout(() => print(), 50); }
      if (k === "xlsx") { const T = barisHarian(D, S, st.dari, st.sampai); if (!T) return; b.disabled = true;
        try { await muatSkrip("/inti/unduh.js"); await muatSkrip("/inti/unduh_tabel.js");
          const per = `${tgl(st.dari, 1)} sampai ${tgl(st.sampai, 1)}`, R = T.R;
          const ringkas = {nama: "Ringkasan periode", ket: per, kolom: ["Metrik", "Agregat", "Periode", "Rata-rata per hari", "Hari tertinggi", "Nilai tertinggi"],
            baris: R.ringkas.map(x => { const d = x.m.desimal | 0; return [x.m.label, x.m.agregat || "jumlah", angka(x.total, d), angka(x.rerata, d || 1), x.hariMaks ? tgl(x.hariMaks, 1) : "–", angka(x.maks, d)]; })};
          /* mesin unduh membaca angka seperti di layar (teks id-ID); kosong = tanda minus panjang, bukan nol */
          const ms = R.c.ms, teks = T.baris.map(r => r.map((v, i) => i < 4 ? v : angka(v, ms[i - 4].desimal | 0)));
          const L = {judul: `${D.judul}, ${per}`, iso: `${st.dari}_${st.sampai}`, tanggal: per, sumber: (D.sumber || []).map(s => s.nama).filter(Boolean).join(", "),
            tabel: [ringkas, {nama: "Per hari", ket: "Satu baris per hari per wilayah" + (R.berjalan ? "; hari bertanda (berjalan) datanya masih bertambah" : ""), kolom: T.kolom, baris: teks}]};
          window.unduhBlob(await UnduhTabel.format.xlsx(L), `${String(D.judul || "laporan").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${st.dari}-sampai-${st.sampai}.xlsx`); }
        catch (er) { console.error(er); } finally { b.disabled = false; } } };
    gambar(); dlg.showModal(); }

  /* laporan kejadian (fokus): tabel per provinsi dan kenaikan antar-kab tidak relevan untuk satu kab/kota */
  const LEWAT_FOKUS = ["prov", "naik"];
  const bagian = (D, S, k) => D.fokus && LEWAT_FOKUS.includes(k) ? "" : B[k](kon(D, S));
  const baris = (D, S, k) => { const c = kon(D, S); return k === "prov" ? barisProv(c) : barisKab(c); };
  const bangun = (D, S) => Object.fromEntries(URUT.map(k => [k, bagian(D, S, k)]));
  return {pasang, awal, bangun, bagian, baris, cek, urut: URUT, rentang, barisHarian, htmlRentang};
})();
