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
  const sp = u => u.c ? `<span class="${u.c}">${esc(u.t)}</span>` : esc(u.t);

  function awal(D, qs) {
    const q = new URLSearchParams(qs), n = D.hari.length, p = q.get("prov") || "";
    const hari = D.hari.includes(q.get("hari")) ? q.get("hari") : D.hari.includes(D.hari_lengkap) ? D.hari_lengkap : D.hari[n - 1];
    const u = D.metrik.find(m => m.utama) || D.metrik[0], urut = () => ({urut: u.k, turun: true, hal: 0});
    return {prov: D.prov && Object.hasOwn(D.prov, p) ? p : "", hari, rentang: "30", urut: {prov: urut(), kab: urut()}};
  }
  function kon(D, S) {
    const n = D.hari.length, i = Math.max(0, D.hari.indexOf(S.hari)), u = D.metrik.find(m => m.utama) || D.metrik[0];
    return {D, S, n, i, u, ms: D.metrik, sr: S.prov ? D.prov[S.prov] : D.nasional, wil: S.prov ? nama(D, S.prov) : "", brj: h => !!D.hari_lengkap && h > D.hari_lengkap};
  }
  const sumberNama = D => esc((D.sumber || []).map(s => s.nama).filter(Boolean).join(", ") || "data bencana");
  const kartu = (ey, judul, isi, D, ctl = "") => Kartu.kartu(ey, judul, isi, sumberNama(D), ctl);
  const kosong = t => `<div class="kosong">${esc(t)}</div>`;
  const dgn = c => c.wil ? " · " + esc(c.wil) : "";

  /* ---- tabel yang bisa diurut (Per provinsi, Per kab/kota) ---- */
  const barisData = (c, o) => { const v = {}; c.ms.forEach(m => { v[m.k] = A(o, m.k, c.n)[c.i]; });
    const s = A(o, c.u.k, c.n); return {v, ub: ubah(c.u, s[c.i], c.i > 0 ? s[c.i - 1] : null)}; };
  const urutkan = (rows, st) => { const f = st.urut, d = st.turun ? -1 : 1, val = r => f === "nama" ? r.nama : f === "ubah" ? r.ub.p : r.v[f];
    return rows.sort((a, b) => { const x = val(a), y = val(b), t = a.nama.localeCompare(b.nama, "id");
      if (f === "nama") return d * x.localeCompare(y, "id");
      if (!ada(x) || !ada(y)) return ada(x) ? -1 : ada(y) ? 1 : t;
      return x === y ? t : d * (x < y ? -1 : 1); }); };
  const sel = (c, r, kls = "", td = "") => `<tr${kls}><td${td}>${esc(r.nama)}</td>${c.ms.map(m => `<td class="n">${angka(r.v[m.k], m.desimal | 0)}</td>`).join("")}<td class="n">${sp(r.ub)}</td></tr>`;
  const kepalaTb = (c, st, kolom) => `<thead><tr>${[["nama", kolom, ""], ...c.ms.map(m => [m.k, m.label, "n"]), ["ubah", "Ubah", "n"]]
    .map(([k, l, n]) => `<th${n ? ' class="n"' : ""}><button type="button" data-k="${esc(k)}">${esc(l)}<i>${st.urut === k ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>`;
  function barisProv(c) {
    const rows = Object.keys(c.D.prov).filter(p => !c.S.prov || p === c.S.prov).map(p => ({nama: c.D.prov[p].nama, ...barisData(c, c.D.prov[p])}));
    return rows.length ? urutkan(rows, c.S.urut.prov).map(r => sel(c, r)).join("") : `<tr><td colspan="${c.ms.length + 2}" class="kosong">Belum ada data provinsi.</td></tr>`;
  }
  function barisKab(c) {
    const st = c.S.urut.kab, g = new Map();
    (c.D.kab || []).filter(k => !c.S.prov || k.prov === c.S.prov).forEach(k => { if (!g.has(k.prov)) g.set(k.prov, []); g.get(k.prov).push({nama: k.nama, ...barisData(c, k)}); });
    if (!g.size) return `<tr><td colspan="${c.ms.length + 2}" class="kosong">Belum ada data kab/kota.</td></tr>`;
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
    const mx = Math.max(1e-9, ...v.slice(dari).filter(ada)), e = 10 ** Math.floor(Math.log10(mx)), f = mx / e, top = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
    const slot = (W - pl - pr) / n, bw = Math.max(2, slot * .7), ya = x => pt + (H - pt - pb) * (1 - x / top), step = Math.ceil(n / 9), td = top < 4 && !d ? 1 : d;
    let s = `<defs><pattern id="lpHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#d2772c" fill-opacity=".25"/><line x1="0" y1="0" x2="0" y2="6" stroke="#d2772c" stroke-width="3"/></pattern></defs>`;
    for (let k = 0; k <= 4; k++) { const x = top * k / 4, y = ya(x); s += `<line class="lp-gl" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="lp-gp" x="${pl - 6}" y="${y + 4}" text-anchor="end" font-size="11">${angka(x, td)}</text>`; }
    for (let j = dari; j < c.n; j++) { const h = D.hari[j], x = pl + (j - dari) * slot, val = v[j], brj = c.brj(h), on = h === S.hari;
      const tip = `<b>${esc(tgl(h, 1))}</b>${brj ? " · berjalan" : ""}<br>${esc(u.label)}: ${esc(ada(val) ? angka(val, d) + " " + (u.satuan || "") : "tidak ada data")}`;
      const y = ada(val) ? ya(val) : H - pb;
      s += `<g data-tip="${esc(tip)}"><rect x="${x}" y="${pt}" width="${slot}" height="${H - pt - pb}" fill="transparent"/>`
        + (ada(val) ? `<rect class="lp-bar${on ? " on" : ""}${brj ? " lp-sm" : ""}" x="${x + (slot - bw) / 2}" y="${y}" width="${bw}" height="${Math.max(0, H - pb - y)}" rx="2"/>` : "")
        + (n <= 16 && ada(val) ? `<text class="lp-gp" x="${x + slot / 2}" y="${y - 4}" text-anchor="middle" font-size="11">${angka(val, d)}</text>` : "")
        + ((j - dari) % step === 0 ? `<text class="lp-sb${on ? " on" : ""}" x="${x + slot / 2}" y="${H - 12}" text-anchor="middle" font-size="11">${esc(tgl(h))}</text>` : "") + `</g>`; }
    return `<div class="lp-gr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc("Tren harian " + u.label)}">${s}</svg></div>`;
  }

  /* ---- bagian ---- */
  const B = {
    kop: c => `<div class="lp-kop" aria-hidden="true"><img src="/img/logo.svg?v=2" alt="" width="40" height="40"><div><b>Centurisk97</b><span>${esc(c.D.judul)}</span><small>${esc(tgl(c.S.hari, 1))}${dgn(c)}</small></div></div><div class="lp-kop-garis" aria-hidden="true"></div>`,
    kepala(c) {
      const {D, S} = c, brj = c.brj(S.hari), kodes = Object.keys(D.prov).sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
      const hari = `<select data-set="hari" aria-label="Hari laporan">${[...D.hari].reverse().map(h => `<option value="${esc(h)}"${h === S.hari ? " selected" : ""}>${esc(tgl(h, 1))}${c.brj(h) ? " (berjalan)" : ""}</option>`).join("")}</select>`;
      return `<section class="lp-kep" aria-live="polite"><div class="lp-jd"><h1>${esc(D.judul)}</h1><div class="lp-pils"><span class="lp-pil ${brj ? "sm" : "ok"}">${brj ? "Hari berjalan, belum final" : "Hari final"}</span><span class="lp-pil">Cut-off ${esc(wkt(D.cutoff))}</span></div></div>
        <div class="lp-aksi">${hari}${kodes.length ? Kartu.selProv("prov", "Seluruh Indonesia", kodes, k => D.prov[k].nama, S) : ""}<button type="button" class="lp-cetak" id="lpCetak" aria-label="Cetak PDF" title="Cetak PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/></svg></button></div></section>`; },
    ring(c) {
      const {D, S, u, i, n} = c, s = A(c.sr, u.k, n), ub = ubah(u, s[i], i > 0 ? s[i - 1] : null), b = D.hari[i - 1];
      const judul = `${esc(u.label)} ${esc(tgl(S.hari))}${dgn(c)}: ${Kartu.hl(angka(s[i], u.desimal | 0))} ${esc(u.satuan || "")}${ub.k ? ", " + esc(ub.k) : ""}`;
      const bln = D.hari[i].slice(0, 7), baris = c.ms.map(m => { const a = A(c.sr, m.k, n), d = m.desimal | 0, x = a[i], y = i > 0 ? a[i - 1] : null;
        const w7 = gabung(m, a.slice(Math.max(0, i - 6), i + 1)), bl = gabung(m, a.slice(0, i + 1).filter((_, j) => D.hari[j].slice(0, 7) === bln));
        return `<tr><td>${esc(m.label)}${m.satuan ? ` <small>${esc(m.satuan)}</small>` : ""}${m.agregat && m.agregat !== "jumlah" ? ` <small>(${esc(m.agregat)})</small>` : ""}</td><td class="n">${angka(x, d)}</td><td class="n">${angka(y, d)}</td><td class="n">${sp(ubah(m, x, y))}</td><td class="n">${angka(w7, d)}</td><td class="n">${angka(bl, d)}</td></tr>`; }).join("");
      return kartu("Ringkasan", judul, `<div class="tw"><table class="lp-tb"><thead><tr><th>Metrik</th><th class="n">${esc(tgl(S.hari))}${c.brj(S.hari) ? ' <span class="lp-bf">berjalan</span>' : ""}</th><th class="n">${b ? esc(tgl(b)) : "Kemarin"}</th><th class="n">Ubah</th><th class="n">7 hari</th><th class="n">Bulan ini</th></tr></thead><tbody>${baris}</tbody></table></div>`, D); },
    tren(c) {
      const r = +c.S.rentang, dari = r > 0 ? Math.max(0, c.n - r) : 0;
      return kartu("Tren harian", `Tren harian ${esc(c.u.label)}${dgn(c)}, ${c.n - dari} hari terakhir`, batang(c, dari), c.D, Kartu.seg("rentang", RENTANG, c.S)); },
    sorot(c) {
      const l = (c.D.sorot || []).filter(o => !c.S.prov || !o.prov || o.prov === c.S.prov);
      const isi = l.length ? `<ul class="lp-so">${l.map(o => { const [k, t] = LV[o.tingkat] || LV.info, h = o.tautan ? tautan(o.tautan) : "#";
        return `<li><span class="lp-lv ${k}">${t}</span><div><b>${esc(o.judul)}</b>${o.teks ? `<span>${esc(o.teks)}</span>` : ""}</div>${h !== "#" ? `<a href="${h}">Buka</a>` : ""}</li>`; }).join("")}</ul>` : kosong("Tidak ada hal yang perlu perhatian khusus.");
      return kartu("Perlu perhatian", l.length ? `${angka(l.length)} hal perlu perhatian${dgn(c)}` : "Tidak ada hal yang perlu perhatian khusus", isi, c.D); },
    prakiraan(c) {
      const P = c.D.prakiraan; if (!P || !Array.isArray(P.hari)) return "";
      const rows = (P.baris || []).filter(o => !c.S.prov || !o.prov || o.prov === c.S.prov), pr = o => o.satuan === "peluang";
      const isi = rows.length ? `<div class="tw"><table class="lp-tb"><thead><tr><th>Lokasi</th>${P.hari.map(h => `<th class="n">${esc(tgl(h))}</th>`).join("")}</tr></thead><tbody>${rows.map(o => `<tr><td>${esc(o.label)}</td>${P.hari.map((_, j) => { const v = (o.nilai || [])[j];
        return `<td class="n">${ada(v) ? pr(o) ? angka(v * 100) + "%" : angka(v, 1) : "–"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>` : kosong("Tidak ada prakiraan untuk wilayah ini.");
      return kartu("Prakiraan", esc(P.judul || "Prakiraan"), isi, c.D); },
    prov(c) {
      const tf = c.S.prov ? "" : (r => `<tfoot>${sel(c, r)}</tfoot>`)({nama: "Nasional", ...barisData(c, c.D.nasional)});
      return kartu("Per provinsi", `Per provinsi, ${esc(tgl(c.S.hari))}${c.S.prov ? " · " + esc(c.wil) : ""}`, tabelUrut(c, "prov", "Provinsi", tf), c.D); },
    naik(c) {
      const {u, i, n} = c, d = u.desimal | 0, k = c.D.kab || [];
      const l = i < 1 ? [] : k.filter(o => !c.S.prov || o.prov === c.S.prov).map(o => { const s = A(o, u.k, n); return {o, a: s[i], b: s[i - 1]}; })
        .filter(x => ada(x.a) && ada(x.b) && x.a > x.b).sort((x, y) => (y.a - y.b) - (x.a - x.b)).slice(0, 10);
      const isi = l.length ? `<div class="tw"><table class="lp-tb"><thead><tr><th class="n">#</th><th>Kab/kota</th><th>Provinsi</th><th class="n">Kemarin</th><th class="n">Hari ini</th><th class="n">Naik</th></tr></thead><tbody>${l.map((x, j) =>
        `<tr><td class="n">${j + 1}</td><td>${esc(x.o.nama)}</td><td>${esc(nama(c.D, x.o.prov))}</td><td class="n">${angka(x.b, d)}</td><td class="n">${angka(x.a, d)}</td><td class="n"><span class="naik">▲ ${angka(x.a - x.b, d)}</span></td></tr>`).join("")}</tbody></table></div>` : kosong("Tidak ada kab/kota yang naik dibanding kemarin.");
      return kartu("Kenaikan terbesar", l.length ? `Kenaikan terbesar ${esc(u.label)} per kab/kota${dgn(c)}` : "Tidak ada kab/kota yang naik dibanding kemarin", isi, c.D); },
    kab: c => kartu("Per kab/kota", `Per kab/kota, ${esc(tgl(c.S.hari))}${c.S.prov ? " · " + esc(c.wil) : ""}`, tabelUrut(c, "kab", "Kab/kota"), c.D),
    tambahan: c => (c.D.tambahan || []).map(t => { const nm = x => typeof x === "number" ? angka(x, Number.isInteger(x) ? 0 : 1) : x == null ? "–" : esc(x);
      return kartu("Tambahan", esc(t.judul), `<div class="tw"><table class="lp-tb"><thead><tr>${(t.kolom || []).map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${(t.baris || []).map(r =>
        `<tr>${r.map(x => `<td${typeof x === "number" ? ' class="n"' : ""}>${nm(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${t.catatan ? `<p class="lp-cat">${esc(t.catatan)}</p>` : ""}`, c.D); }).join(""),
    sumber(c) {
      const {D} = c, l = (D.sumber || []).map(s => { const h = tautan(s.url);
        return `<li>${h !== "#" ? `<a href="${h}" target="_blank" rel="noopener">${esc(s.nama)}</a>` : esc(s.nama)}${s.catatan ? ` <span>${esc(s.catatan)}</span>` : ""}</li>`; }).join("");
      return kartu("Sumber", "Sumber dan cut-off", `${l ? `<ul class="lp-sl">${l}</ul>` : ""}<p class="lp-cat">Data terakhir masuk ${esc(wkt(D.cutoff))}. Laporan dibuat ${esc(wkt(D.dibuat))}.</p>`, D); },
  };

  function cek(D) {
    if (!D || typeof D !== "object" || D.v !== 1) return "Format laporan tidak dikenali.";
    if (!Array.isArray(D.hari) || !D.hari.length || !Array.isArray(D.metrik) || !D.metrik.length || !D.nasional || typeof D.nasional !== "object") return "Laporan belum berisi data.";
    D.prov = D.prov && typeof D.prov === "object" ? D.prov : {};
    return "";
  }
  const nanti = f => requestAnimationFrame(() => setTimeout(f, 0));

  function pasang({id, url} = {}) {
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
      const S = awal(D, location.search);
      document.title = D.judul + " · Centurisk97";
      const upd = document.getElementById("upd"); if (upd) upd.textContent = "Data s.d. " + wkt(D.cutoff);
      host.innerHTML = `<div id="insight" class="lp">${URUT.map(k => `<div data-ex="${k}"></div>`).join("")}</div>`;
      const isi = k => { const e = host.querySelector(`[data-ex="${k}"]`); e.innerHTML = bagian(D, S, k);
        /* kepala kolom tabel: pengurut bersama; hanya <tbody> yang digambar ulang, jadi pendengar di <thead> tetap hidup */
        const th = (k === "prov" || k === "kab") && e.querySelector("thead");
        if (th) pengurutKepala(S.urut[k], th, () => nanti(() => { const tb = e.querySelector("tbody"); if (tb) tb.innerHTML = baris(D, S, k); })); };
      const semua = (l = URUT) => { isi(l[0]); if (l.length > 1) setTimeout(() => semua(l.slice(1)), 0); };
      semua();
      host.addEventListener("click", e => {
        if (e.target.closest("#lpCetak")) return print();
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
  const bagian = (D, S, k) => B[k](kon(D, S));
  const baris = (D, S, k) => { const c = kon(D, S); return k === "prov" ? barisProv(c) : barisKab(c); };
  const bangun = (D, S) => { const c = kon(D, S); return Object.fromEntries(URUT.map(k => [k, B[k](c)])); };
  return {pasang, awal, bangun, bagian, baris, cek, urut: URUT};
})();
