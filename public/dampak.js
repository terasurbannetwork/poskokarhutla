/* dampak.js — tab "Dampak": sepuluh bagian dampak kebakaran musim berjalan.
   Dimuat SETELAH skrip utama index.html dan lapisan5.js (skrip klasik; global yang dipakai: S, PRIO, namaProv, fmt, rb, rp, esc,
   muatJSON, jamWIB, bukaTab, Laci, Insight, Lapis, paparan). Angka berat dihitung harian oleh scripts/data/dampak.py
   (public/data/dampak.json) dan scripts/data/penerbangan.py (public/data/penerbangan.json); berkas ini hanya menggambar. */
const Dampak = (() => {
  const W = {merah: "#c9503a", oranye: "#e58a45", kuning: "#e3b94e", hijau: "#5a9e74", biru: "#4f8fc4", ungu: "#5f6fb0", biru2: "#3f7fb8", teal: "#2b8c86", tua: "#7a2b2b"};
  const W5 = [W.hijau, W.kuning, W.oranye, W.merah, W.tua], KELAS = ["Baik", "Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"], AMB = [15.5, 55.4, 150.4, 250.4];
  const kelas = v => AMB.filter(a => v > a).length;
  /* ISPU dari PM2.5 (PermenLHK 14/2020), interpolasi linear per pita; maks 500 */
  const BP = [[0, 15.5, 0, 50], [15.5, 55.4, 51, 100], [55.4, 150.4, 101, 200], [150.4, 250.4, 201, 300], [250.4, 500, 301, 500]];
  const aqiISPU = pm => { if (!(pm > 0)) return 0; if (pm >= 500) return 500; const b = BP.find(q => pm <= q[1]); return Math.round(b[2] + (pm - b[0]) / (b[1] - b[0]) * (b[3] - b[2])); };
  const aqiT = pm => pm > 500 ? "> 500" : String(aqiISPU(pm));
  window.aqiISPU = aqiISPU; window.aqiTeks = aqiT;
  const WK = ["#5f6fb0", "#1d4e89", "#c9503a", "#e58a45", "#8a6a3f", "#2b8c86", "#5b6782", "#b8932f", "#4f8fc4", "#7a2b3f"];
  /* ikon tab bagian, urut sama dengan JUDUL */
  const IKON = ["M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2",
    "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z",
    "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7ZM3.5 12h5l1.5-3 2 6 1.5-3h7",
    "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5", "M3 10.5 12 3l9 7.5M5 9v12h14V9M10 21v-6h4v6",
    "M12 22v-5M12 2 5 12h4l-3 5h12l-3-5h4L12 2Z", "M17.5 19H8a6 6 0 1 1 5.7-7.9A4.5 4.5 0 1 1 17.5 19Z",
    "M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 12h0M18 12h0",
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20", "M18 7V4H6l6 8-6 8h12v-3"];
  const JUDUL = ["Kualitas udara", "Penerbangan", "Kesehatan", "Pendidikan", "Permukiman", "Hutan & gambut", "Emisi karbon", "Ekonomi lahan", "Lintas batas", "Total kerugian"];
  const KAT = {konsesi_sawit: ["Konsesi sawit", W.oranye], konsesi_hph: ["Konsesi hutan alam (PBPH/HPH)", W.kuning], konsesi_lain: ["Konsesi lain", "#b8902c"],
    hutan_produksi: ["Hutan produksi tanpa konsesi", W.biru], konservasi: ["Kawasan konservasi (taman nasional, suaka)", W.hijau], lindung: ["Hutan lindung & Tahura", W.teal], apl: ["Lahan masyarakat (APL)", W.ungu]};
  const SEKTOR = {pertanian: "Pertanian & perkebunan", lingkungan_karbon: "Lingkungan: karbon", lingkungan_hayati: "Lingkungan: keanekaragaman hayati",
    kehutanan: "Kehutanan (kayu & reboisasi)", perdagangan: "Perdagangan", industri_tambang: "Industri & tambang", pariwisata: "Pariwisata",
    transportasi: "Transportasi", pemadaman: "Biaya pemadaman", kesehatan: "Kesehatan (biaya langsung)", pendidikan: "Pendidikan (sekolah tutup)"};
  const JNK = {sawit: "Konsesi sawit", hti: "Konsesi HTI (kayu pulp)", hph: "Konsesi HPH (hutan alam)", tambang: "Izin tambang (PPKH)", lain: "Konsesi lain"};
  /* bendera negara tetangga (emoji; Windows menampilkan kode huruf, nama negara tetap tertulis di sebelahnya) */
  const BDR = {Singapura: "🇸🇬", Malaysia: "🇲🇾", Brunei: "🇧🇳", Thailand: "🇹🇭", "Timor-Leste": "🇹🇱", Filipina: "🇵🇭", Indonesia: "🇮🇩"};
  const bdr = n => { const k = (n || "").split(" (")[0], e = BDR[k] || (typeof BENDERA !== "undefined" && BENDERA[k]); return e ? `<span class="bdr" role="img" aria-label="${esc(k)}" title="${esc(n)}">${e}</span> ` : ""; };
  /* berita internasional: tautan asli, thumbnail (fallback favicon media), media + negaranya */
  const urlB = x => x.url_asli || x.url;
  const domB = x => x.domain || (() => { try { return new URL(urlB(x)).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const favB = d => d ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64` : "";
  const ngB = x => typeof negaraMedia === "function" ? negaraMedia(domB(x), x.media || "") : "";
  const thumbB = x => { const fv = favB(domB(x));
    const img = x.gambar ? `<img class="dk-thumb" src="${escUrl(x.gambar)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fav="${esc(fv)}" onerror="if(this.dataset.fav){this.src=this.dataset.fav;this.dataset.fav='';this.classList.add('ikon')}else this.remove()">`
      : fv ? `<img class="dk-thumb ikon" src="${esc(fv)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
    return img ? `<a href="${escUrl(urlB(x))}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${img}</a>` : ""; };
  const mediaB = x => { const fv = favB(domB(x)), ng = ngB(x);
    return `<span class="dk-media">${fv ? `<img src="${esc(fv)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span>${esc(x.media || domB(x) || "–")}${ng ? `<small>${bdr(ng)}${esc(ng)}</small>` : ""}</span></span>`; };
  const WJ = {divert: W.merah, batal: W.tua, rtb: W.oranye, tutup: W.ungu, tunda: W.kuning, jarak_pandang: W.biru, lain: "#8a96a8"};
  let D = null, F = null, M = [], pap = null, gagal = "";
  const st = {hari: 0, rentF: 60, skn: 1, hal: {F: 0, S: 0, D: 0}};
  const PER = 10;

  /* ---------- pembantu ---------- */
  const hl = t => `<span class="hl">${t}</span>`;
  /* lebar viewBox mengikuti layar supaya teks grafik tetap terbaca di 375 px */
  const lw = () => Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), sempit = () => lw() < 500, LL = l => sempit() ? Math.round(l * .7) : l;
  const nmP = k => sempit() ? pendek(k) : namaProv(k);
  const PENDEK = {konsesi_sawit: "Sawit", konsesi_hph: "PBPH/HPH", konsesi_lain: "Konsesi lain", hutan_produksi: "Hutan produksi", konservasi: "Konservasi", lindung: "Lindung", apl: "APL (masyarakat)",
    pertanian: "Pertanian", lingkungan_karbon: "Karbon", lingkungan_hayati: "Hayati", kehutanan: "Kehutanan", perdagangan: "Perdagangan", industri_tambang: "Industri",
    pariwisata: "Pariwisata", transportasi: "Transportasi", pemadaman: "Pemadaman", kesehatan: "Kesehatan", pendidikan: "Pendidikan"};
  const nmK = c => sempit() ? PENDEK[c] || c : KAT[c]?.[0] || c, nmS = k => sempit() ? PENDEK[k] || k : SEKTOR[k] || k;
  /* kartu bergaya Insight: eyebrow = nama bagian, tanpa sub/unit; legenda (L) dan "Sumber:" masuk footer */
  let pend = null;
  const LG = xs => { pend = xs; return ""; };
  const ex = (n, judul, sub, unit, isi, fn, ctl = "") => { Insight.leg(pend ? pend.map(([nm, w]) => [w, nm]) : null); pend = null;
    return `<section class="dk-bag" id="dk-${n}" data-bag="${n}"><header class="dk-sh" style="--w:${WK[n - 1]}"><span class="dk-sn">${n}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[n - 1]}"/></svg><h2>${JUDUL[n - 1]}</h2></header>${Insight.ex(judul, "", "", isi, fn, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${JUDUL[n - 1]}</span>`)}</section>`; };
  const NAVY = "oklch(25.5% .075 256)";
  /* label nilai di ujung batang: pil berwarna, teks putih tebal */
  const pw = t => String(t).length * 11 * .6 + 16;
  const pilV = (x, y, t, w) => Insight.pil(x, y, t, w || NAVY, w === W.kuning || w === "#b8902c" ? "#13213a" : "#fff", 11)[0];
  const tgl = t => new Date(t.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
  const hariN = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric"});
  const satu = v => fmt(Math.round(v * 10) / 10);
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const seg = (k, opsi) => `<div class="seg" role="group">${opsi.map(([v, n]) => `<button data-dks="${k}" data-v="${v}" aria-pressed="${String(st[k]) === String(v)}">${n}</button>`).join("")}</div>`;
  const baris = (dk, isi) => `<tr data-dk="${dk}" tabindex="0">${isi}</tr>`;
  const tabel = (kepala, rows) => `<div class="tw dk-tw"><table><thead><tr>${kepala.map(h => `<th${h[0] === ">" ? ' class="n"' : ""}>${h.replace(/^>/, "")}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${kepala.length}">Belum ada.</td></tr>`}</tbody></table></div>`;
  const tautan = (u, t) => `<a href="${escUrl(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  /* tautan sumber di footer kartu */
  const SM = {wb16: "https://documents1.worldbank.org/curated/en/776101467990969768/pdf/103668-BRI-Cost-of-Fires-Knowledge-Note-PUBLIC-ADD-NEW-SERIES-Indonesia-Sustainable-Landscapes-Knowledge-Note.pdf",
    wb19: "https://openknowledge.worldbank.org/entities/publication/0ea3af9f-ed88-5de7-9cb2-ef39e1752b85", gwis: "https://gwis.jrc.ec.europa.eu/", bps: "https://www.bps.go.id/",
    ipcc: "https://www.ipcc-nggip.iges.or.jp/public/wetlands/", wang: "https://doi.org/10.1016/j.envres.2025.121221", sipongi: "https://sipongi.menlhk.go.id/",
    cams: "https://open-meteo.com/en/docs/cams-air-quality-api", wpop: "https://www.worldpop.org/", osm: "https://www.openstreetmap.org/", firms: "https://firms.modaps.eosdis.nasa.gov/",
    iem: "https://mesonet.agron.iastate.edu/ASOS/", andreae: "https://doi.org/10.1029/2000GB001382", bnpb: "https://bnpb.go.id/", who: "https://www.who.int/publications/i/item/9789240034228"};
  const sm = (k, t) => tautan(SM[k], t);
  /* paginasi 10 per halaman: pembungkus [data-pg] menampung tabel + pager (global paginasi di index.html) */
  const hal = (k, arr) => { const m = Math.max(0, Math.ceil(arr.length / PER) - 1); st.hal[k] = Math.min(st.hal[k], m); return arr.slice(st.hal[k] * PER, st.hal[k] * PER + PER); };
  const pg = (k, tbl, total, satuan) => `<div data-pg="${k}">${tbl}${typeof paginasi === "function" && total > PER ? paginasi(st.hal[k], total, PER, satuan) : ""}</div>`;
  const kotak = (k, v) => `<div class="dk-kv"><span>${k}</span><b>${v}</b></div>`;
  function dlg(judul, sub, isi) { const d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${judul}</h3><p>${sub}</p></div><button aria-label="Tutup" data-tutup>×</button></div><div class="db">${isi}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); };
    d.querySelectorAll("[data-kom]").forEach(b => b.onclick = () => { d.close(); bukaTab("peta"); Laci.buka(b.dataset.kom); }); d.showModal(); }
  const tombolK = id => id ? `<button class="btn sec" data-kom="${esc(id)}">Buka kompleks ${esc(id)} di peta</button>` : "";
  /* batang horizontal sederhana: rows = [{n, v, w, tip, dk, lo, hi, txt}] */
  function hbar(rows, {L = 150, W2 = lw(), rh = 26, maks, garis = []} = {}) {
    L = LL(L); const ct = r => r.cat ? r.cat.length * 9.5 * .55 + 6 : 0, R = Math.max(50, ...rows.map(r => pw(r.txt ?? fmt(r.v)) + ct(r) + 16)), m = maks || Math.max(1, ...rows.map(r => r.hi ?? r.v)), X = v => L + Math.max(0, v) / m * (W2 - L - R);
    /* ambang: garis putus berwarna + pil nama di ATAS grafik; bila bertabrakan, turun satu baris */
    const gs = garis.filter(([v]) => v < m).sort((a, b) => a[0] - b[0]), ends = []; 
    const lab = gs.map(([v, t, w]) => { const pwid = t.length * 10 * .6 + 14, x0 = Math.min(Math.max(0, X(v) - pwid / 2), W2 - pwid); let lv = ends.findIndex(e => x0 > e + 4); if (lv < 0) lv = ends.length; ends[lv] = x0 + pwid; return {v, t, w: w || W5[kelas(v)], x0, pwid, lv}; });
    const T = lab.length ? (Math.max(...lab.map(l => l.lv)) + 1) * 17 + 3 : 0, H = rows.length * rh;
    return `<svg class="dk-svg" viewBox="0 0 ${W2} ${H + T + 6}" role="img">${lab.map(l => `<line x1="${X(l.v)}" x2="${X(l.v)}" y1="${l.lv * 17 + 15}" y2="${T + H}" stroke="${l.w}" stroke-width="1.6" stroke-dasharray="4 3"/><rect x="${l.x0}" y="${l.lv * 17 + 1}" width="${l.pwid}" height="15" rx="7.5" fill="${l.w}"/><text x="${l.x0 + l.pwid / 2}" y="${l.lv * 17 + 12}" text-anchor="middle" font-size="10" font-weight="700" style="fill:${l.w === W.kuning ? "#13213a" : "#fff"}">${l.t}</text>`).join("")}
      ${rows.map((r, i) => { const y = T + i * rh, px = Math.max(X(r.v), r.hi != null ? X(r.hi) : 0) + 5, tx = r.txt ?? fmt(r.v);
        return `<g data-dk="${r.dk || ""}" style="cursor:${r.dk ? "pointer" : "default"}"><rect class="hov" x="0" y="${y}" width="${W2}" height="${rh}" fill="transparent"/>
        <text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600"><title>${esc(r.n)}</title>${esc(r.n.length * 6.6 > L - 10 ? r.n.slice(0, Math.max(4, Math.floor((L - 10) / 6.6) - 1)) + "…" : r.n)}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${r.w || W.oranye}" data-tip="${r.tip || ""}"/>
        ${r.lo != null ? `<line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y + rh / 2}" y2="${y + rh / 2}" stroke="currentColor" stroke-width="1.5" opacity=".7"/><line x1="${X(r.lo)}" x2="${X(r.lo)}" y1="${y + 8}" y2="${y + rh - 8}" stroke="currentColor" opacity=".7"/><line x1="${X(r.hi)}" x2="${X(r.hi)}" y1="${y + 8}" y2="${y + rh - 8}" stroke="currentColor" opacity=".7"/>` : ""}
        ${pilV(px, y + 3, tx, r.w || W.oranye)}${r.cat ? `<text x="${px + pw(tx) + 5}" y="${y + rh / 2 + 3.5}" font-size="9.5" opacity=".75">${r.cat}</text>` : ""}</g>`; }).join("")}</svg>`; }
  /* kolom harian: hari = [t], seri = [{k, w, v: {t: n}}], dk(t) */
  function kolom(hari, seri, {H = 150, W2 = lw(), tip, dk} = {}) {
    const tot = hari.map(t => seri.reduce((a, s) => a + (s.v[t] || 0), 0)), m0 = Math.max(1, ...tot), st0 = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(q => m0 / q <= 4) || 1000;
    let m = Math.ceil(m0 / st0) * st0; if (m % 2) m++;
    const g = (W2 - 34) / Math.max(1, hari.length), bw = Math.max(1.5, g * .75), Y = v => H - v / m * (H - 14);
    if (tot.filter(n => n > 0).length < 3) return "";
    let o = [0, m / 2, m].map(v => `<line x1="30" x2="${W2}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity="${v ? .12 : .25}"${v ? ' stroke-dasharray="3 3"' : ""}/><text x="25" y="${Y(v) + 3}" text-anchor="end" font-size="9.5" opacity=".65">${fmt(v)}</text>`).join("");
    hari.forEach((t, i) => { let y = H; const x = 34 + i * g;
      seri.forEach(s => { const h = (s.v[t] || 0) / m * (H - 14); if (h > 0) { y -= h; o += `<rect class="gy" style="--i:${i}" x="${x}" y="${y}" width="${bw}" height="${h}" fill="${s.w}"/>`; } });
      o += `<rect x="${x - (g - bw) / 2}" y="0" width="${g}" height="${H}" fill="transparent" data-tip="${tip ? tip(t, tot[i]) : t + ": " + fmt(tot[i])}" ${dk && tot[i] ? `data-dk="${dk(t)}" style="cursor:pointer"` : ""}/>`;
      if (i % Math.ceil(hari.length / 8) === 0) o += `<text x="${x + bw / 2}" y="${H + 13}" text-anchor="middle" font-size="9.5" opacity=".65">${tgl(t)}</text>`; });
    return `<svg class="dk-svg" viewBox="0 0 ${W2} ${H + 18}" role="img">${o}</svg>`; }
  const hariSejak = (a, b) => { const o = []; for (let t = new Date(a + "T12:00:00Z"); t <= new Date(b + "T12:00:00Z"); t = new Date(+t + 864e5)) o.push(t.toISOString().slice(0, 10)); return o; };
  const kini = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const legenda = xs => `<div class="dk-leg">${xs.map(([n, w]) => `<span><i style="background:${w}"></i>${n}</span>`).join("")}</div>`;

  /* ---------- muat ---------- */
  async function muat() {
    const [d, f, m] = await Promise.all([muatJSON("data/dampak.json"), muatJSON("data/penerbangan.json").catch(() => null), muatJSON("data/metar.json").catch(() => [])]);
    D = d; F = f; M = m;
    if (typeof paparan === "function") pap = await Promise.all(PRIO.map(k => paparan(k).catch(() => null)));
  }
  /* utamakan paparan yang sudah disilangkan dengan asap kebakaran (dampak.json, sama dengan Insight); paparan() menghitung semua polusi */
  const jiwaProv = (k, i) => { const u = D.udara.prov[k]?.jiwa[i]; if (u) return u; const p = pap?.[PRIO.indexOf(k)]; return p?.jiwa[i] || [0, 0, 0, 0, 0]; };

  /* ================= 1. udara ================= */
  function b1() {
    const U = D.udara, i = Math.min(st.hari, U.hari.length - 1), hr = U.hari[i];
    const rows = PRIO.map(k => ({k, j: jiwaProv(k, i)})).map(r => ({...r, ts: r.j[2] + r.j[3] + r.j[4], tot: r.j.reduce((a, b) => a + b, 0)})).sort((a, b) => b.ts - a.ts);
    const ts = rows.reduce((a, r) => a + r.ts, 0), stb = rows.reduce((a, r) => a + r.j[3] + r.j[4], 0), mx = Math.max(1, ...rows.map(r => r.tot));
    /* hanya kota yang udaranya dipengaruhi asap kebakaran (kompleks api searah angin, lihat dampak.py asap_api) */
    const kotaAll = [...U.kota].sort((a, b) => b.pm[i] - a.pm[i]), kota = kotaAll.filter(c => c.karhutla !== false), lain = kotaAll.filter(c => c.karhutla === false && c.pm[i] > 55.4), terburuk = U.hari.map((t, j) => [t, PRIO.reduce((a, k) => a + jiwaProv(k, j).slice(2).reduce((x, y) => x + y, 0), 0)]).sort((a, b) => b[1] - a[1])[0];
    const L = LL(150), Wd = lw(), rh = 26, X = v => v / mx * (Wd - L - 90);
    const svg = `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img" aria-label="Penduduk per kelas udara">${rows.map((r, n) => { let x = L; const y = n * rh;
      return `<g data-dk="prov|${r.k}" style="cursor:pointer"><rect class="hov" x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="11.5" font-weight="600">${esc(nmP(r.k))}</text>`
        + `<g class="gx" style="--i:${n}">` + r.j.map((v, c) => { const w = X(v), o = w > 0 ? `<rect x="${x}" y="${y + 5}" width="${w}" height="${rh - 10}" fill="${W5[c]}" data-tip="<b>${esc(namaProv(r.k))}</b><br>${KELAS[c]}: ${rb(v)} jiwa<br>klik untuk rincian"/>` : ""; x += w; return o; }).join("") + "</g>"
        + `${pilV(x + 5, y + 3, rb(r.ts), NAVY)}</g>`; }).join("")}</svg>`;
    const kb = kota.slice(0, 12).map(c => ({n: c.nama, v: c.pm[i], w: W5[kelas(c.pm[i])], dk: "kota|" + c.nama, txt: fmt(c.pm[i]), cat: `AQI ${aqiT(c.pm[i])} · ${KELAS[kelas(c.pm[i])]}`,
      tip: `<b>${esc(c.nama)}</b><br>PM2.5 maks. ${fmt(c.pm[i])} µg/m³<br>AQI (ISPU): ${aqiT(c.pm[i])}<br>${KELAS[kelas(c.pm[i])]}<br>asap dari kompleks api terdekat ${c.api_km != null ? "± " + fmt(c.api_km) + " km" : ""}<br>klik untuk 4 hari`}));
    return ex(1, `${hl(jt(ts) + " jiwa")} di 9 provinsi yang sering mengalami karhutla menghirup udara tidak sehat ${i ? "pada " + hariN(hr) : "hari ini"}`,
      "Penduduk menurut kelas udara (ISPU PM2.5), prakiraan 4 hari", "Batang = jumlah jiwa per provinsi, diwarnai menurut kelas udara. Klik provinsi atau kota untuk rinciannya.",
      svg + LG(KELAS.map((k, c) => [k, W5[c]])) + `<div class="lbl" style="margin:14px 0 4px">Kota yang terpapar asap karhutla, PM2.5 tertinggi <span style="text-transform:none">(µg/m³)</span></div>` + hbar(kb, {L: 120, garis: [[55.4, "tidak sehat"], [150.4, "sangat tidak sehat"], [250.4, "berbahaya"]]}),
      `Sumber: prakiraan ${sm("cams", "CAMS (Copernicus) lewat Open-Meteo")}, dibuat ${jamWIB(U.dibuat)}; penduduk ${sm("wpop", "WorldPop")} 2026; hanya asap dari kompleks api searah angin dalam 300 km`,
      seg("hari", U.hari.map((t, j) => [j, j ? hariN(t) : "Hari ini"])));
  }
  function popProv(k) {
    const U = D.udara, js = U.hari.map((t, j) => jiwaProv(k, j)), m = Math.max(1, ...js.map(j => j.reduce((a, b) => a + b, 0))), is = D.udara.prov[k]?.ispa || [], dk = D.dekat.prov[k];
    const svg = `<svg class="dk-svg" viewBox="0 0 400 150">${js.map((j, n) => { let y = 130; return j.map((v, c) => { const h = v / m * 120; y -= h; return `<rect x="${20 + n * 95}" y="${y}" width="70" height="${h}" fill="${W5[c]}" data-tip="${KELAS[c]}: ${rb(v)} jiwa"/>`; }).join("") + `<text x="${55 + n * 95}" y="145" text-anchor="middle" font-size="10">${n ? hariN(U.hari[n]) : "Hari ini"}</text>`; }).join("")}</svg>`;
    dlg(esc(namaProv(k)), "Udara, kesehatan, dan kedekatan dengan api",
      `${svg}${legenda(KELAS.map((x, c) => [x, W5[c]]))}
      <div class="dk-kvs">${kotak("Udara tidak sehat hari ini", jt(js[0].slice(2).reduce((a, b) => a + b, 0)) + " jiwa")}${is[0] ? kotak("Tambahan kunjungan ISPA/hari", `${fmt(is[0][1])} (${fmt(is[0][0])}–${fmt(is[0][2])})`) : ""}
      ${dk ? kotak("Desa ≤ 5 km dari api", fmt(dk.desa[1])) + kotak("Penduduk ≤ 5 km dari api", jt(dk.jiwa[1])) + kotak("Sekolah ≤ 5 km", fmt(dk.sekolah[1])) + (dk.siswa ? kotak("Siswa ≤ 5 km", fmt(dk.siswa[1])) : "") : ""}</div>
      <p class="fnd">Tambahan kunjungan ISPA adalah perkiraan model (lihat bagian 3), bukan laporan dinas kesehatan.</p>
      <button class="btn sec" data-peta="${k}">Buka provinsi di peta</button>`);
    $("#dlg [data-peta]").onclick = () => { $("#dlg").close(); bukaTab("peta"); nanti(() => turun(k)); };
  }
  function popKota(n) {
    const c = D.udara.kota.find(x => x.nama === n) || D.udara.tetangga.find(x => x.nama === n); if (!c) return;
    const mx = Math.max(60, ...c.pm), saran = ["Aktivitas luar ruang aman.", "Kelompok sensitif kurangi aktivitas berat di luar.", "Kurangi kegiatan luar ruang; pakai masker N95/KN95 bila keluar.",
      "Hindari kegiatan luar ruang; sekolah layak belajar dari rumah; siapkan ruang bersih udara.", "Tetap di dalam ruangan dengan jendela tertutup; evakuasi kelompok rentan bila berlangsung lama."];
    const k = kelas(Math.max(...c.pm));
    dlg(esc(n), `${c.negara ? bdr(c.negara) + esc(c.negara) : esc(namaProv(c.prov))} · PM2.5 maksimum harian, prakiraan CAMS`,
      hbar(c.pm.map((v, j) => ({n: j ? hariN(D.udara.hari[j]) : "Hari ini", v, w: W5[kelas(v)], txt: fmt(v), cat: `µg/m³ · AQI ${aqiT(v)} · ${KELAS[kelas(v)]}`, tip: `<b>PM2.5 ${fmt(v)} µg/m³</b><br>AQI (ISPU): ${aqiT(v)}<br>${KELAS[kelas(v)]}`})), {L: 80, W2: 480, maks: mx, garis: [[55.4, "tidak sehat"], [150.4, "sangat tidak sehat"]]})
      + `<p style="margin:0"><b>Saran untuk kelas terburuk (${KELAS[k]}):</b> ${saran[k]}</p><p class="fnd">Satu sel CAMS ± 110 km; kota yang berdekatan bisa mendapat angka sama. Bandingkan dengan alat ukur ISPU KLHK bila tersedia.</p>`);
  }

  /* ================= 2. penerbangan ================= */
  const NJ = j => F?.nama_jenis?.[j] || j;
  const PJ = [["", "Semua"], ["batal", "Dibatalkan"], ["tunda", "Tertunda"], ["divert", "Dialihkan"], ["jarak_pandang", "Jarak pandang"]];
  let pm = null;
  /* peta MapLibre bandara + panel kanan; dipasang setelah kartu masuk DOM */
  function pasangPeta(tries = 0) {
    const el = document.getElementById("dkPeta"); if (!el) { if (tries < 60) setTimeout(() => pasangPeta(tries + 1), 50); return; }
    if (el._pm || !F || typeof maplibregl === "undefined") return; el._pm = 1; try { pm?.remove(); } catch (e) {}
    const B = F.bandara, rt = el.parentElement, side = rt.querySelector(".dk-pm-ls"), fb = rt.querySelector(".dk-pm-f"), hn = rt.querySelector(".dk-hn");
    let jenis = "", pop = null, sel = null;
    const agr = () => { const hit = {}; F.kejadian.filter(e => e.bandara && B[e.bandara]?.lat && (!jenis || e.jenis.includes(jenis))).forEach(e => (hit[e.bandara] ||= []).push(e));
      return Object.entries(hit).map(([k, xs]) => { const c = {}; xs.forEach(e => c[e.jenis[0]] = (c[e.jenis[0]] || 0) + 1);
        return {k, b: B[k], n: xs.length, fl: xs.reduce((a, e) => a + e.terdampak, 0), last: xs.map(e => e.tgl).sort().at(-1), w: WJ[Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]] || W.merah}; }).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k)); };
    const fc = g => ({type: "FeatureCollection", features: g.map(x => ({type: "Feature", properties: {k: x.k, n: x.n, nama: x.b.nama, fl: x.fl, last: x.last}, geometry: {type: "Point", coordinates: [x.b.lon, x.b.lat]}}))});
    const isi = x => `<b>${esc(x.k)} · ${esc(x.b.nama)}</b><br>Kejadian: ${x.n}<br>Penerbangan terdampak: min. ${fmt(x.fl)}<br>Terakhir: ${tgl(x.last)}`;
    const buka = x => { pop?.remove(); sel = x.k; tandai(); pop = new maplibregl.Popup({offset: 14, closeButton: true, maxWidth: "260px"}).setLngLat([x.b.lon, x.b.lat])
      .setHTML(`<div style="font-size:12.5px;line-height:1.5">${isi(x)}<br><button class="btn sec" style="margin-top:6px" data-dk="bandara|${esc(x.k)}">Rincian &amp; grafik</button></div>`).addTo(m); pop.on("close", () => { if (sel === x.k) { sel = null; tandai(); } }); };
    const tandai = () => side.querySelectorAll("button[data-i]").forEach(b => b.classList.toggle("on", g[+b.dataset.i]?.k === sel));
    let g = agr(), mx = 1;
    const m = pm = new maplibregl.Map({container: el, style: typeof DASAR === "function" ? DASAR() : "https://tiles.openfreemap.org/styles/positron", bounds: [[94.5, -11.5], [141.8, 6.3]], fitBoundsOptions: {padding: {top: 20, bottom: 20, left: 20, right: 44}}, minZoom: 3, maxZoom: 12, attributionControl: {compact: true}, dragRotate: false});
    m.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-left");
    const daftar = () => { g = agr(); mx = Math.max(1, ...g.map(x => x.n)); m.getSource("bd")?.setData(fc(g));
      if (m.getLayer("bd-c")) m.setPaintProperty("bd-c", "circle-radius", ["+", 8, ["*", 8, ["sqrt", ["/", ["get", "n"], mx]]]]);
      hn.textContent = g.length;
      side.innerHTML = g.map((x, i) => `<li><button data-i="${i}"><span class="dk-kd">${esc(x.k)}</span><span class="dk-nm">${esc(x.b.nama.replace(/ (International )?Airport$/, ""))}</span><span class="dk-ct" style="background:${x.w};color:${x.w === W.kuning ? "#13213a" : "#fff"}">${x.n}</span></button></li>`).join("") || `<li class="fnd" style="padding:12px">Belum ada kejadian jenis ini.</li>`; tandai(); };
    m.on("load", () => { m.addSource("bd", {type: "geojson", data: fc([]), cluster: true, clusterRadius: 40, clusterMaxZoom: 7, clusterProperties: {sum: ["+", ["get", "n"]]}});
      const f = {"text-font": ["Noto Sans Bold"], "text-allow-overlap": true};
      m.addLayer({id: "bd-cl", type: "circle", source: "bd", filter: ["has", "point_count"], paint: {"circle-color": W.tua, "circle-opacity": .9, "circle-stroke-color": "#fff", "circle-stroke-width": 3, "circle-radius": ["step", ["get", "point_count"], 16, 3, 19, 6, 22]}});
      m.addLayer({id: "bd-cn", type: "symbol", source: "bd", filter: ["has", "point_count"], layout: {...f, "text-field": ["to-string", ["get", "sum"]], "text-size": 12}, paint: {"text-color": "#fff"}});
      m.addLayer({id: "bd-c", type: "circle", source: "bd", filter: ["!", ["has", "point_count"]], paint: {"circle-color": W.merah, "circle-opacity": .9, "circle-stroke-color": "#fff", "circle-stroke-width": 3, "circle-radius": 8}});
      m.addLayer({id: "bd-n", type: "symbol", source: "bd", filter: ["!", ["has", "point_count"]], layout: {...f, "text-field": ["to-string", ["get", "n"]], "text-size": 10.5}, paint: {"text-color": "#fff"}});
      m.addLayer({id: "bd-k", type: "symbol", source: "bd", minzoom: 5, filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "n"], 5]], layout: {...f, "text-field": ["get", "k"], "text-size": 10.5, "text-anchor": "bottom", "text-offset": [0, -1.5]}, paint: {"text-color": "#13213a", "text-halo-color": "#fff", "text-halo-width": 1.6}});
      daftar();
      m.on("mousemove", "bd-c", ev => { m.getCanvas().style.cursor = "pointer"; const p = ev.features[0].properties, h = `<b>${esc(p.k)} · ${esc(p.nama)}</b><br>Kejadian: ${p.n}<br>Penerbangan terdampak: min. ${fmt(p.fl)}<br>Terakhir: ${tgl(p.last)}`;
        typeof tampilTip === "function" ? tampilTip(h, ev.originalEvent) : (el.title = h.replace(/<[^>]+>/g, " ")); });
      m.on("mouseleave", "bd-c", () => { m.getCanvas().style.cursor = ""; document.getElementById("tip")?.classList.remove("on"); });
      m.on("mouseenter", "bd-cl", () => m.getCanvas().style.cursor = "pointer"); m.on("mouseleave", "bd-cl", () => m.getCanvas().style.cursor = "");
      m.on("click", "bd-c", ev => { const x = g.find(q => q.k === ev.features[0].properties.k); if (x) buka(x); });
      m.on("click", "bd-cl", ev => { const c = ev.features[0]; m.getSource("bd").getClusterExpansionZoom(c.properties.cluster_id).then(z => m.easeTo({center: c.geometry.coordinates, zoom: z + .2})); }); });
    side.onclick = ev => { const b = ev.target.closest("button[data-i]"); if (!b) return; const x = g[+b.dataset.i]; m.flyTo({center: [x.b.lon, x.b.lat], zoom: Math.max(m.getZoom(), 8), speed: 1.4}); m.once("moveend", () => buka(x)); };
    fb.onclick = ev => { const b = ev.target.closest("button[data-pj]"); if (!b) return; jenis = b.dataset.pj; sel = null; fb.querySelectorAll("button").forEach(q => q.setAttribute("aria-pressed", q === b)); pop?.remove(); if (m.isStyleLoaded()) daftar(); };
  }
  function b2() {
    if (!F) return ex(2, "Data gangguan penerbangan belum tersedia", "", "", `<p>Berkas penerbangan.json belum dibuat (scripts/data/penerbangan.py).</p>`, "");
    const ev = F.kejadian, bd = ev.filter(e => e.bandara), rek = ev.filter(e => !e.bandara && e.jumlah), B = F.bandara;
    const sumB = bd.reduce((a, e) => a + e.terdampak, 0), rekMax = rek.reduce((a, e) => e.jumlah > a.jumlah ? e : a, {jumlah: 0}), nB = new Set(bd.map(e => e.bandara)).size, hariG = new Set(ev.map(e => e.tgl)).size;
    const hit = {}; bd.forEach(e => (hit[e.bandara] ||= []).push(e));
    const peta = `<div class="dk-pm"><div class="dk-pm-map" id="dkPeta" aria-label="Peta bandara terdampak"></div><aside class="dk-pm-side"><header><span>Bandara terdampak</span><b class="dk-hn"></b></header>
      <div class="dk-pm-f" role="group" aria-label="Jenis kejadian">${PJ.map(([v, n], i) => `<button data-pj="${v}" aria-pressed="${!i}">${n}</button>`).join("")}</div><ol class="dk-pm-ls"></ol></aside></div>`;
    const akhir = kini(), semua = hariSejak(F.mulai_musim, akhir), hari = st.rentF === "semua" ? semua : semua.slice(-st.rentF);
    const seri = Object.keys(WJ).map(j => ({k: j, w: WJ[j], v: ev.reduce((a, e) => { if (e.jenis[0] === j) a[e.tgl] = (a[e.tgl] || 0) + 1; return a; }, {})}));
    const daf = hal("F", ev); pasangPeta();
    const rows = daf.map(e => baris(`kej|${ev.indexOf(e)}`, `<td>${tgl(e.tgl)}</td><td><span class="dk-el">${e.bandara ? `<b>${esc(e.bandara)}</b> · ` : ""}${esc(B[e.bandara]?.nama || (e.disebut ? "Rekap " + e.disebut : "Beberapa / nasional"))}</span></td>
      <td><span class="dk-el">${esc(e.maskapai.join(", ") || "–")}</span></td><td><span class="dk-jn" style="--w:${WJ[e.jenis[0]] || WJ.lain}">${esc(NJ(e.jenis[0]))}</span>${e.alternatif ? `<small class="dk-s">ke ${esc(e.alternatif)}</small>` : ""}</td>
      <td class="n">${e.jumlah ? fmt(e.jumlah) : "–"}</td><td class="n">${e.sumber.length}</td>`));
    /* jarak pandang terkini: METAR + BNPB */
    const metar = [...M].sort((a, b) => (a.vis_m ?? 9e9) - (b.vis_m ?? 9e9)), kodeICAO = Object.fromEntries(Object.entries(B).map(([k, v]) => [v.icao, k]));
    const bnpb = (S.bnpb?.rows || []).map(r => [r.Provinsi, r["Jarak Pandang Bandara (Km)"]]).filter(r => r[1] != null && r[1] !== "-");
    const vis = metar.map(m => baris(kodeICAO[m.icao] ? `bandara|${kodeICAO[m.icao]}` : "", `<td><b>${esc(m.icao)}</b></td><td><span class="dk-el">${esc(m.nama)}</span></td><td class="n" style="color:${(m.vis_m ?? 9999) < 1500 ? W.merah : (m.vis_m ?? 9999) < 5000 ? W.oranye : "inherit"};font-weight:700">${m.vis_m == null ? "–" : m.vis_m >= 9999 ? "≥ 10 km" : satu(m.vis_m / 1000) + " km"}</td><td>${m.asap ? "asap/kabut (FU/HZ)" : esc(m.wx || "–")}</td><td>${jamWIB(m.waktu)}</td>`));
    return ex(2, `Asap mengganggu penerbangan di ${hl(nB + " bandara")} sejak ${tgl(F.mulai_musim)}; ${rekMax.jumlah ? `rekap yang dikutip media mencatat ${hl(fmt(rekMax.jumlah) + " penerbangan")} terdampak` : `minimal ${hl(fmt(sumB) + " penerbangan")} terdampak`}`,
      "Kejadian gangguan penerbangan dari berita, diperiksa dengan jarak pandang METAR", "Gelembung = jumlah kejadian per bandara. Klik gelembung, batang, atau baris untuk rincian, tautan berita, dan grafik jarak pandang.",
      peta
      + `<div class="ctl" style="margin-top:12px">${seg("rentF", [[30, "30 hari"], [60, "60 hari"], ["semua", "Sejak awal musim"]])}</div>`
      + kolom(hari, seri, {tip: (t, n) => `<b>${tgl(t)}</b><br>${n} kejadian`, dk: t => "harif|" + t}) + LG(Object.keys(WJ).map(j => [NJ(j), WJ[j]]))
      + `<div class="lbl" style="margin:14px 0 4px">Kejadian terbaru</div>` + pg("F", tabel(["Tanggal", "Bandara", "Maskapai", "Yang terjadi", ">Jumlah", ">Berita"], rows), ev.length, "kejadian")
      + `<details class="lipat" style="margin-top:12px"><summary>Jarak pandang bandara saat ini</summary><div class="isi">${tabel(["Kode ICAO", "Bandara", ">Jarak pandang", "Cuaca", "Waktu"], vis)}
        ${bnpb.length ? `<p class="fnd" style="margin-top:8px">Laporan BNPB (jarak pandang bandara, km): ${bnpb.map(([p, v]) => `${esc(p)} ${esc(v)}`).join(" · ")}</p>` : ""}</div></details>`,
      `Sumber: berita media, diperiksa dengan METAR (${sm("iem", "Iowa Environmental Mesonet")}); ${F.laporan} judul berita, diperbarui ${jamWIB(F.dibuat)}`);
  }
  function grafikVis(icao, a, b, tanda) {
    const v = F.metar?.[icao]; if (!v) return `<p class="fnd">Tidak ada arsip METAR untuk bandara ini.</p>`;
    const hari = hariSejak(a, b).filter(t => t >= F.mulai_musim), Wd = Math.min(600, lw()), H = 140, g = (Wd - 30) / Math.max(1, hari.length), m = 10, Y = km => H - Math.min(km, m) / m * (H - 10);
    const pts = hari.map((t, i) => v[t] ? [30 + i * g + g / 2, Y(v[t][0]), t] : null).filter(Boolean);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${H + 18}" role="img" aria-label="Jarak pandang minimum harian">
      <rect x="30" y="${Y(1.5)}" width="${Wd - 30}" height="${H - Y(1.5)}" fill="${W.merah}" opacity=".12"/><rect x="30" y="${Y(5)}" width="${Wd - 30}" height="${Y(1.5) - Y(5)}" fill="${W.kuning}" opacity=".14"/>
      <text x="26" y="${Y(5) + 3}" text-anchor="end" font-size="9">5 km</text><text x="26" y="${Y(1.5) + 3}" text-anchor="end" font-size="9">1,5</text><text x="26" y="${Y(10) + 6}" text-anchor="end" font-size="9">10+</text>
      ${tanda ? tanda.map(t => hari.indexOf(t) >= 0 ? `<line x1="${30 + hari.indexOf(t) * g + g / 2}" x2="${30 + hari.indexOf(t) * g + g / 2}" y1="0" y2="${H}" stroke="${W.merah}" stroke-dasharray="3 2"/>` : "").join("") : ""}
      <path d="${pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("")}" fill="none" stroke="${W.biru2}" stroke-width="2"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${v[p[2]][0] < 1.5 ? W.merah : v[p[2]][0] < 5 ? W.oranye : W.biru2}" data-tip="<b>${tgl(p[2])}</b><br>jarak pandang min. ${satu(v[p[2]][0])} km<br>${v[p[2]][1]} jam di bawah 5 km · ${v[p[2]][2]} jam di bawah 1,5 km"/>`).join("")}
      ${hari.map((t, i) => i % Math.ceil(hari.length / 7) === 0 ? `<text x="${30 + i * g + g / 2}" y="${H + 13}" text-anchor="middle" font-size="9" opacity=".65">${tgl(t)}</text>` : "").join("")}</svg>
      <p class="fnd">Garis = jarak pandang terendah tiap hari dari METAR ${esc(icao)} (Iowa Environmental Mesonet). Pita kuning: di bawah batas terbang visual 5 km; pita merah: di bawah 1,5 km. Garis putus merah = tanggal kejadian.</p>`;
  }
  const geser = (t, n) => new Date(new Date(t + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
  function popKej(i) { const e = F.kejadian[i], b = F.bandara[e.bandara];
    const cek = e.vis_min_km != null ? (e.vis_min_km < 5 ? `<b style="color:${W.merah}">Dikonfirmasi METAR</b>: jarak pandang terendah ${satu(e.vis_min_km)} km (hari itu atau sehari sebelumnya).` : `METAR mencatat jarak pandang terendah ${satu(e.vis_min_km)} km, di atas 5 km; gangguan mungkin di bandara tujuan/asal atau di jam yang tidak terlapor.`) : "Tidak ada METAR untuk dicocokkan.";
    dlg(`${esc(NJ(e.jenis[0]))}: ${esc(e.bandara ? e.bandara + " · " + (b?.nama || "") : e.disebut ? "rekap wilayah (" + e.disebut + ")" : "beberapa bandara / nasional")}`, `${tgl(e.tgl)} · ${e.sumber.length} berita`,
      `<div class="dk-kvs">${kotak("Maskapai", esc(e.maskapai.join(", ") || "tidak disebut"))}${kotak("Nomor penerbangan", esc(e.nomor.join(", ") || "tidak disebut"))}
      ${kotak("Jenis gangguan", esc(e.jenis.map(NJ).join(", ")))}${kotak("Jumlah disebut", e.jumlah ? fmt(e.jumlah) + " penerbangan" : "–")}${e.alternatif ? kotak("Dialihkan ke", esc(e.alternatif + " · " + (F.bandara[e.alternatif]?.nama || ""))) : ""}</div>
      <p style="margin:0">${cek}</p>${b ? grafikVis(b.icao, geser(e.tgl, -12), geser(e.tgl, 5), [e.tgl]) : ""}
      <div class="lbl">Berita</div><ul class="dk-ul">${e.sumber.map(s => `<li>${tautan(s.url, s.judul)}<small class="dk-s">${esc(s.media || "")} · ${jamWIB(s.tgl)}</small></li>`).join("")}</ul>
      <p class="fnd">Kejadian disusun otomatis dari judul berita; bandara, maskapai, dan jenis gangguan dibaca dari judul dan bisa keliru. Buka beritanya untuk kepastian.</p>`); }
  function popBandara(k) { const b = F.bandara[k], xs = F.kejadian.filter(e => e.bandara === k || e.alternatif === k);
    dlg(`${esc(k)} · ${esc(b?.nama || "")}`, `${esc(namaProv(b?.prov || ""))} · ${xs.length} kejadian terkait sejak ${tgl(F.mulai_musim)}`,
      (b ? grafikVis(b.icao, F.mulai_musim, kini(), xs.map(e => e.tgl)) : "")
      + tabel(["Tanggal", "Yang terjadi", "Maskapai", ">Berita"], xs.map(e => baris(`kej|${F.kejadian.indexOf(e)}`, `<td>${tgl(e.tgl)}</td><td>${esc(NJ(e.jenis[0]))}${e.alternatif === k ? " (menerima pengalihan)" : ""}</td><td>${esc(e.maskapai.join(", ") || "–")}</td><td class="n">${e.sumber.length}</td>`))));
    ikatDlg(); }
  function popHariF(t) { const xs = F.kejadian.filter(e => e.tgl === t);
    dlg(`Gangguan penerbangan ${tgl(t)}`, `${xs.length} kejadian`, tabel(["Bandara", "Yang terjadi", "Maskapai", ">Berita"], xs.map(e => baris(`kej|${F.kejadian.indexOf(e)}`, `<td><b>${esc(e.bandara || "–")}</b></td><td>${esc(NJ(e.jenis[0]))}</td><td>${esc(e.maskapai.join(", ") || "–")}</td><td class="n">${e.sumber.length}</td>`)))); ikatDlg(); }
  /* baris di dalam dialog membuka dialog lain */
  const ikatDlg = () => $("#dlg").querySelectorAll("[data-dk]").forEach(r => r.onclick = () => aksi(r.dataset.dk));

  /* ================= 3. kesehatan ================= */
  function b3() {
    const U = D.udara, A = D.asumsi, i = Math.min(st.hari, U.hari.length - 1), is = k => U.prov[k]?.ispa?.[i] || [0, 0, 0];
    const rows = PRIO.map(k => ({k, v: is(k)})).sort((a, b) => b.v[1] - a.v[1]), tot = [0, 1, 2].map(j => rows.reduce((a, r) => a + r.v[j], 0));
    const empat = [0, 1, 2].map(j => PRIO.reduce((a, k) => a + (U.prov[k]?.ispa || []).reduce((x, d) => x + d[j], 0), 0));
    const IB = D.ispa_berita, maks = IB.reduce((a, x) => x.jumlah > (a?.jumlah || 0) ? x : a, null);
    return ex(3, `Asap diperkirakan menambah ${hl(fmt(tot[1]) + " kunjungan ISPA per hari")} di 9 provinsi yang sering mengalami karhutla (rentang ${fmt(tot[0])}–${fmt(tot[2])})`,
      "Perkiraan tambahan kunjungan infeksi saluran pernapasan akut (ISPA) karena PM2.5", "Batang = perkiraan tengah; garis = rentang rendah–tinggi. Ini PERKIRAAN MODEL, bukan hitungan puskesmas. Klik provinsi untuk rincian.",
      hbar(rows.map(r => ({n: nmP(r.k), v: r.v[1], lo: r.v[0], hi: r.v[2], w: W.oranye, dk: "prov|" + r.k, txt: fmt(r.v[1]), tip: `<div class='tk'><div class='tk-h'><b>${esc(namaProv(r.k))}</b></div><div class='tk-n'><b>${fmt(r.v[1])}</b><span>kunjungan ISPA/hari</span></div><div class='tk-f'>Rentang ${fmt(r.v[0])} – ${fmt(r.v[2])} (skenario rendah–tinggi)</div></div>`})))
      + `<div class="lbl" style="margin:14px 0 4px">Kasus ISPA yang disebut berita</div>`
      + tabel(["Tanggal", ">Kasus", "Judul", "Media"], IB.slice(0, 12).map((x, j) => baris("ispa|" + j, `<td>${tgl(x.tgl)}</td><td class="n"><b>${fmt(x.jumlah)}</b></td><td class="dk-wrap">${tautan(x.url, x.judul)}</td><td><span class="dk-s">${esc(x.media || "")}</span></td>`))),
      `Sumber: ${sm("wpop", "WorldPop")}, Riskesdas 2018, meta-analisis ${sm("wang", "Wang dkk. 2025 (Environ Res 273:121221)")}, ${sm("who", "pedoman WHO")}; perkiraan model, bukan hitungan puskesmas`);
  }
  function popIspa(j) { const x = D.ispa_berita[j], p = (x.prov || [])[0], is = p && D.udara.prov[p]?.ispa?.[0];
    dlg(`${fmt(x.jumlah)} kasus ISPA disebut berita`, `${esc(x.media || "")} · ${tgl(x.tgl)}`,
      `<p style="margin:0">${tautan(x.url, x.judul)}</p>${p ? `<div class="dk-kvs">${kotak("Provinsi", esc(namaProv(p)))}${is ? kotak("Perkiraan model hari ini", `${fmt(is[1])} tambahan kunjungan/hari`) : ""}</div>` : ""}
      <p class="fnd">Angka di judul biasanya kumulatif (sejak awal bulan/tahun) dan mencakup ISPA bukan karena asap, sedangkan model menghitung tambahan per hari karena PM2.5. Keduanya saling melengkapi, tidak untuk dijumlahkan.</p>`); }

  /* ================= 4. pendidikan ================= */
  const sumP = (f, i) => PRIO.map(k => D.dekat.prov[k]).filter(Boolean).reduce((a, d) => a + (i == null ? d[f] : d[f][i]), 0);
  function b4() {
    const P = D.dekat.prov, R = D.dekat.radius_km, ks = PRIO.filter(k => P[k]).sort((a, b) => P[b].sekolah[1] - P[a].sekolah[1]);
    const SB = D.sekolah_berita, ds = hal("S", D.dekat.sekolah);
    const rows = ks.map(k => ({n: nmP(k), v: P[k].sekolah[1], w: W.kuning, dk: "dekat|" + k, txt: `${fmt(P[k].sekolah[1])} (≤ 1 km: ${fmt(P[k].sekolah[0])})`,
      tip: `<b>${esc(namaProv(k))}</b><br>≤ 1 km: ${fmt(P[k].sekolah[0])}<br>≤ 5 km: ${fmt(P[k].sekolah[1])}<br>≤ 10 km: ${fmt(P[k].sekolah[2])}<br>di udara tidak sehat hari ini: ${fmt(P[k].sekolah_tidak_sehat)}`}));
    return ex(4, `${hl(fmt(sumP("sekolah", 1)) + " sekolah")} di 9 provinsi yang sering mengalami karhutla berada dalam 5 km dari api yang perlu dipadamkan; ${hl(fmt(SB.length) + " berita")} melaporkan sekolah libur atau belajar dari rumah karena asap`,
      "Sekolah dekat api dan di udara tidak sehat", "Batang = sekolah ≤ 5 km dari tepi kompleks berstatus siaga atau prioritas, per provinsi. Klik provinsi, sekolah, atau berita untuk rinciannya.",
      hbar(rows) + `<div class="lbl" style="margin:14px 0 4px">Sekolah terdekat ke api</div>`
      + pg("S", tabel(["Sekolah", "Provinsi", ">Jarak", "Kompleks", "Status"], ds.map((s, j) => baris("sek|" + D.dekat.sekolah.indexOf(s), `<td><b>${esc(s.nama)}</b></td><td>${esc(namaProv(s.prov))}</td><td class="n">${s.km ? satu(s.km) + " km" : "di dalam"}</td><td>${esc(s.kompleks)}</td><td><span class="pill l${s.level}">${esc(S.meta?.status?.[s.level] || "")}</span></td>`))), D.dekat.sekolah.length, "sekolah")
      + `<div class="lbl" style="margin:14px 0 4px">Berita penutupan sekolah</div>` + tabel(["Tanggal", "Judul", "Media"], SB.slice(0, 10).map((x, j) => baris("sekb|" + j, `<td>${tgl(x.tgl)}</td><td class="dk-wrap">${tautan(x.url, x.judul)}</td><td><span class="dk-s">${esc(x.media || "")}</span></td>`))),
      `Sumber: data sekolah nasional Kemendikbud (NPSN), prakiraan ${sm("cams", "CAMS")}, berita media; pembanding Oktober 2015: 24.773 sekolah (${sm("wb16", "World Bank 2016")})`);
  }
  function popSek(j) { const s = D.dekat.sekolah[j];
    dlg(esc(s.nama), `${esc(namaProv(s.prov))} · ${s.km ? satu(s.km) + " km" : "di dalam area"} dari kompleks ${esc(s.kompleks)}`,
      (s.pm ? hbar(s.pm.map((v, i) => ({n: i ? hariN(D.udara.hari[i]) : "Hari ini", v, w: W5[kelas(v)], txt: fmt(v), cat: `µg/m³ · AQI ${aqiT(v)} · ${KELAS[kelas(v)]}`, tip: `<b>PM2.5 ${fmt(v)} µg/m³</b><br>AQI (ISPU): ${aqiT(v)}<br>${KELAS[kelas(v)]}`})), {L: 80, W2: 480, maks: Math.max(60, ...s.pm), garis: [[55.4, "tidak sehat"]]}) : "")
      + `<p style="margin:0">${s.pm && Math.max(...s.pm) > 55.4 ? "<b>Udara tidak sehat dalam 4 hari ke depan: pertimbangkan belajar dari rumah atau kurangi kegiatan luar ruang.</b>" : "Pantau kualitas udara; api dekat bisa membawa asap mendadak bila angin berbalik."}</p>${tombolK(s.kompleks)}`); }
  function popBerita(arr, j, jenis) { const x = arr[j];
    dlg(jenis, `${esc(x.media || "")} · ${tgl(x.tgl)}`, `<p style="margin:0">${tautan(urlB(x), x.judul)}</p>${(x.prov || []).length ? `<p class="fnd">Provinsi disebut: ${x.prov.map(p => esc(namaProv(p))).join(", ")}</p>` : ""}<p class="fnd">Hanya judul yang dibaca; buka berita untuk isi lengkap.</p>`); }

  /* ================= 5. permukiman ================= */
  function b5() {
    const P = D.dekat.prov, R = D.dekat.radius_km, ks = PRIO.filter(k => P[k] && (P[k].jiwa[2] || P[k].desa[2])).sort((a, b) => P[b].jiwa[1] - P[a].jiwa[1]).slice(0, 12);
    const WB = [W.merah, W.oranye, W.kuning], dd = hal("D", D.dekat.desa), mx = Math.max(1, ...ks.map(k => P[k].jiwa[2]));
    const Wd = lw(), L = LL(150), rh = 26, X = v => v / mx * (Wd - L - 80);
    const svg = `<svg class="dk-svg" viewBox="0 0 ${Wd} ${ks.length * rh}" role="img">${ks.map((k, n) => { const y = n * rh, j = P[k].jiwa;
      return `<g data-dk="dekat|${k}" style="cursor:pointer"><rect class="hov" x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="11.5" font-weight="600">${esc(nmP(k))}</text>`
        + [2, 1, 0].map(c => `<rect class="gx" style="--i:${n}" x="${L}" y="${y + 5}" width="${Math.max(1, X(j[c]))}" height="${rh - 10}" fill="${WB[c]}" data-tip="<b>${esc(namaProv(k))}</b><br>≤ ${R[c]} km: ${rb(j[c])} jiwa, ${fmt(P[k].desa[c])} desa"/>`).join("")
        + `<text x="${L + X(j[2]) + 5}" y="${y + 17}" font-size="10.5">${rb(j[1])} ≤ 5 km</text></g>`; }).join("")}</svg>`;
    return ex(5, `${hl(jt(sumP("jiwa", 1)) + " jiwa")} dan ${hl(fmt(sumP("desa", 1)) + " desa")} di 9 provinsi yang sering mengalami karhutla berada dalam 5 km dari api yang perlu dipadamkan`,
      "Penduduk dan desa menurut jarak ke tepi kompleks yang perlu dipadamkan", `Batang bertingkat: merah ≤ ${R[0]} km, oranye ≤ ${R[1]} km, kuning ≤ ${R[2]} km. Klik provinsi atau desa untuk rinciannya.`,
      svg + LG(R.map((r, i) => [`≤ ${r} km`, WB[i]])) + `<div class="lbl" style="margin:14px 0 4px">Desa terdekat ke api</div>`
      + pg("D", tabel(["Desa", "Kode desa", "Provinsi", ">Jarak", "Kompleks", "Status"], dd.map(x => baris("desa|" + D.dekat.desa.indexOf(x), `<td><b>${esc(x.nama)}</b></td><td><span class="dk-s">${esc(x.kode)}</span></td><td>${esc(namaProv(x.prov))}</td><td class="n">${x.km ? satu(x.km) + " km" : "di dalam"}</td><td>${esc(x.kompleks)}</td><td><span class="pill l${x.level}">${esc(S.meta?.status?.[x.level] || "")}</span></td>`))), D.dekat.desa.length, "desa"),
      `Sumber: ${sm("osm", "OpenStreetMap")}, ${sm("wpop", "WorldPop")} 2026, kompleks api siaga & prioritas dari peta ini`);
  }
  function popDekat(k) { const d = D.dekat.prov[k], R = D.dekat.radius_km;
    dlg(esc(namaProv(k)), "Penduduk, desa, sekolah, dan faskes dekat kompleks berstatus siaga & prioritas",
      tabel(["Jarak", ">Jiwa", ">Desa", ">Sekolah", ">Faskes"], R.map((r, i) => `<tr><td>≤ ${r} km</td><td class="n">${rb(d.jiwa[i])}</td><td class="n">${fmt(d.desa[i])}</td><td class="n">${fmt(d.sekolah[i])}</td><td class="n">${fmt(d.faskes[i])}</td></tr>`))
      + `<div class="dk-kvs">${kotak("Sekolah di udara tidak sehat hari ini", fmt(d.sekolah_tidak_sehat))}</div><p class="fnd">Desa hanya tersedia untuk 9 provinsi yang sering mengalami karhutla; sekolah & faskes hanya yang terpeta di OpenStreetMap.</p>`); }
  function popDesa(j) { const x = D.dekat.desa[j], k = S.kluster?.features.find(f => f.properties.id === x.kompleks)?.properties;
    dlg(`Desa ${esc(x.nama)}`, `${esc(namaProv(x.prov))} · kode ${esc(x.kode)}`,
      `<div class="dk-kvs">${kotak("Jarak ke tepi kompleks", x.km ? satu(x.km) + " km" : "di dalam area kompleks")}${kotak("Kompleks", esc(x.kompleks) + " · " + esc(S.meta?.status?.[x.level] || ""))}
      ${k ? kotak("Luas kompleks", "± " + rb(k.luas) + " ha") + kotak("Titik panas 24 jam", fmt(k.n24)) + kotak("Lokasi", esc([k.kec, k.kab].filter(Boolean).join(", "))) : ""}</div>
      <p style="margin:0">Desa sedekat ini perlu jalur evakuasi, masker, dan informasi arah angin harian. Pastikan MPA dan BPBD setempat tahu.</p>${tombolK(x.kompleks)}`); }

  /* ================= 6. hutan & gambut ================= */
  function b6() {
    const Ms = D.musim, L6 = D.lahan, H = Ms.ha, kh = L6.kategori_ha, tot = Object.values(kh).reduce((a, b) => a + b, 0) || 1, gam = L6.gambut_ha.gambut || 0;
    const nb = Object.fromEntries(Object.entries(S.meta?.bnpb || {}).map(([k, n]) => [n, k])), bn = Object.fromEntries(Object.entries(Ms.bnpb || {}).map(([n, v]) => [nb[n], v]).filter(([k]) => k));
    const ps = Object.entries(Ms.prov).sort((a, b) => b[1].ha - a[1].ha).slice(0, 10);
    const rows = ps.map(([k, v]) => ({n: nmP(k), v: v.ha, lo: v.lo, hi: v.hi, w: PRIO.includes(k) ? W.merah : W.oranye, dk: "musim|" + k, txt: rb(v.ha) + " ha",
      tip: `<b>${esc(namaProv(k))}</b><br>${fmt(v.titik)} titik MODIS × ${satu(v.rasio)} ha/titik<br>± ${rb(v.ha)} ha (${rb(v.lo)}–${rb(v.hi)})${bn[k] != null ? `<br>BNPB indikatif: ${rb(bn[k])} ha` : ""}`}));
    const lind = (kh.konservasi || 0) + (kh.lindung || 0); let x = 0;
    const kats = Object.entries(kh).sort((a, b) => b[1] - a[1]);
    const SW = lw(), strip = `<svg class="dk-svg" viewBox="0 0 ${SW} 46" role="img">${kats.map(([c, v]) => { const w = v / tot * SW, o = `<rect class="gx" x="${x}" y="0" width="${w}" height="28" fill="${KAT[c]?.[1] || "#8a96a8"}" data-dk="kat|${c}" style="cursor:pointer" data-tip="<b>${esc(KAT[c]?.[0] || c)}</b><br>${rb(v)} ha (${Math.round(v / tot * 100)}%) di kompleks aktif<br>klik untuk per provinsi"/>${w > 40 ? `<text x="${x + w / 2}" y="42" text-anchor="middle" font-size="10">${Math.round(v / tot * 100)}%</text>` : ""}`; x += w; return o; }).join("")}</svg>`;
    return ex(6, `Sejak ${tgl(Ms.mulai)}, satelit memperkirakan ${hl("± " + jt(H[1]) + " ha")} terbakar; ${hl(Math.round(gam / tot * 100) + "%")} luas kompleks aktif berada di gambut dan ${hl(rb(lind) + " ha")} di kawasan lindung/konservasi`,
      "Luas terbakar musim berjalan per provinsi, dan status lahan kompleks yang sedang aktif", "Batang = perkiraan tengah, garis = rentang. Pita warna = status lahan kompleks aktif. Klik untuk rincian.",
      hbar(rows) + `<div class="lbl" style="margin:14px 0 4px">Status lahan kompleks aktif</div>` + strip + LG(kats.map(([c]) => [KAT[c]?.[0] || c, KAT[c]?.[1] || "#8a96a8"]))
      + `<div class="lbl" style="margin:14px 0 4px">Kompleks terluas di kawasan konservasi & hutan lindung</div>`
      + tabel(["Kompleks", "Status", "Kawasan", "Gambut", "Kabupaten", "Provinsi", ">Luas"], L6.lindung.slice(0, 10).map((r, j) => baris("lind|" + j, `<td><b>${esc(r.id)}</b></td><td><span class="pill l${r.level}">${esc(S.meta?.status?.[r.level] || "")}</span></td><td>${esc(r.nama)}</td><td>${r.gambut ? "ya" : "–"}</td><td>${esc(r.kab || "")}</td><td>${esc(namaProv(r.prov))}</td><td class="n">${rb(r.luas)} ha</td>`))),
      `Sumber: ${sm("firms", "NASA FIRMS MODIS")}, kalibrasi ${sm("gwis", "GWIS MCD64A1")}, peta gambut, fungsi kawasan hutan dan konsesi${Ms.bnpb_waktu ? "; " + sm("bnpb", "BNPB") + " " + jamWIB(Ms.bnpb_waktu) : ""}`);
  }
  function popMusim(k) { const v = D.musim.prov[k], kp = D.lahan.kategori_prov[k] || {}, t = Object.values(kp).reduce((a, b) => a + b, 0) || 1;
    dlg(`${esc(namaProv(k))}: luas terbakar musim ini`, `sejak ${tgl(D.musim.mulai)}`,
      `<div class="dk-kvs">${kotak("Titik panas MODIS", fmt(v.titik))}${kotak("Rasio kalibrasi", satu(v.rasio) + " ha per titik")}${kotak("Perkiraan luas", `± ${rb(v.ha)} ha (${rb(v.lo)}–${rb(v.hi)})`)}</div>`
      + (Object.keys(kp).length ? tabel(["Status lahan kompleks aktif", ">Luas", ">Porsi"], Object.entries(kp).sort((a, b) => b[1] - a[1]).map(([c, x]) => `<tr><td>${esc(KAT[c]?.[0] || c)}</td><td class="n">${rb(x)} ha</td><td class="n">${Math.round(x / t * 100)}%</td></tr>`)) : "")); }
  function popKat(c) { const P = D.lahan.kategori_prov, rs = Object.keys(P).filter(k => P[k][c]).sort((a, b) => P[b][c] - P[a][c]);
    dlg(esc(KAT[c]?.[0] || c), `${rb(D.lahan.kategori_ha[c])} ha di kompleks aktif`, tabel(["Provinsi", ">Luas kompleks aktif"], rs.map(k => `<tr><td>${esc(namaProv(k))}</td><td class="n">${rb(P[k][c])} ha</td></tr>`))
      + `<p class="fnd">Penanggung jawab lahan menurut aturan: ${{konsesi_sawit: "perusahaan perkebunan", konsesi_hph: "pemegang PBPH", hutan_produksi: "KPH", konservasi: "BKSDA / Balai Taman Nasional", lindung: "KPH / dinas kehutanan", apl: "desa, camat, bupati"}[c] || "pemegang izin"}.</p>`); }
  function popLind(j) { const r = D.lahan.lindung[j];
    dlg(`Kompleks ${esc(r.id)} di ${esc(r.nama)}`, `${esc(r.kab || "")}, ${esc(namaProv(r.prov))}`,
      `<div class="dk-kvs">${kotak("Luas kompleks", rb(r.luas) + " ha")}${kotak("Gambut", r.gambut ? "ya" : "tidak")}${kotak("Status", esc(S.meta?.status?.[r.level] || ""))}</div><p style="margin:0">Api di kawasan konservasi atau lindung merusak habitat dan simpanan karbon yang sulit dipulihkan. Penanggung jawab: BKSDA / Balai Taman Nasional atau KPH.</p>${tombolK(r.id)}`); }

  /* ================= 7. emisi ================= */
  function b7() {
    const E = D.emisi, A = D.asumsi, m = E.mt_co2e;
    const rows = [{n: "Musim ini (perkiraan)", v: m[1], lo: m[0], hi: m[2], w: W.merah, dk: "emisi|", txt: fmt(Math.round(m[1])) + " Mt", tip: `tengah ${fmt(Math.round(m[1]))} Mt CO₂e<br>rentang ${fmt(Math.round(m[0]))}–${fmt(Math.round(m[2]))}`},
      {n: "Kebakaran 2015 (GFED)", v: 1750, w: W.oranye, txt: "1.750 Mt", tip: "GFED4, dikutip World Bank 2016"},
      {n: "Kebakaran 2019 (CAMS)", v: 708, w: W.kuning, txt: "708 Mt", tip: "CAMS, dikutip World Bank IEQ Des 2019"},
      {n: "Kebakaran Amazon 2019", v: 366, w: W.hijau, txt: "366 Mt", tip: "CAMS, dikutip World Bank IEQ Des 2019"},
      {n: "Emisi nasional setahun", v: E.nasional_mt_th, w: W.biru, txt: fmt(E.nasional_mt_th) + " Mt", tip: "Komunikasi Nasional ke-2, dikutip World Bank 2016"}];
    return ex(7, `Kebakaran musim ini diperkirakan melepas ${hl("± " + fmt(Math.round(m[1])) + " juta ton CO₂e")}, setara ${hl(fmt(Math.round(E.hari_setara[1])) + " hari")} emisi seluruh Indonesia`,
      "Emisi gas rumah kaca dari luas terbakar musim ini", "Batang = juta ton CO₂-ekuivalen; garis = rentang rendah–tinggi. Klik batang musim ini untuk cara hitung.",
      hbar(rows, {L: 170}),
      `Sumber: luas terbakar bagian 6; ${sm("ipcc", "IPCC 2013 Wetlands Supplement")}, ${sm("andreae", "Andreae & Merlet 2001")}, ${sm("wb16", "World Bank 2016")} dan ${sm("wb19", "2019")}`);
  }
  function popEmisi() { const E = D.emisi;
    dlg("Cara menghitung emisi", "Luas × bahan bakar terbakar × faktor emisi",
      tabel(["Skenario", ">Luas", ">Porsi gambut", ">Emisi"], ["Rendah", "Tengah", "Tinggi"].map((n, i) => `<tr><td>${n}</td><td class="n">${rb(D.musim.ha[i])} ha</td><td class="n">${Math.round(E.porsi_gambut[i] * 100)}%</td><td class="n">${fmt(Math.round(E.mt_co2e[i]))} Mt</td></tr>`))
      + `<div class="dk-kvs">${kotak("Dari gambut (tengah)", fmt(Math.round(E.gambut_mt)) + " Mt")}${kotak("Dari vegetasi tanah mineral (tengah)", fmt(Math.round(E.mineral_mt)) + " Mt")}</div><p class="fnd">Rendah = luas rendah, gambut tipis, porsi gambut kecil; tinggi = kebalikannya. Rentang lebar ini jujur: belum ada peta kedalaman bakar gambut harian.</p>`); }

  /* ================= 8. ekonomi lahan ================= */
  function b8() {
    const Ek = D.ekonomi, ks = Object.entries(Ek).sort((a, b) => b[1].rp[1] - a[1].rp[1]), tot = [0, 1, 2].map(i => ks.reduce((a, [, v]) => a + v.rp[i], 0));
    const kons = ["konsesi_sawit", "konsesi_hph", "konsesi_lain"].reduce((a, c) => a + (Ek[c]?.ha[1] || 0), 0);
    /* konsesi per jenis areal (agregat jenis x provinsi dari dampak.py; tanpa nama pemegang, keputusan pemilik 14 Okt 2026) */
    const KS = D.lahan.konsesi || [], kj = {};
    for (const r of KS) { const a = kj[r.jenis] ||= {luas: 0, n: 0, prov: {}}; a.luas += r.luas; a.n += r.n_kompleks; a.prov[r.prov] = (a.prov[r.prov] || 0) + r.luas; }
    const kjs = Object.entries(kj).sort((a, b) => b[1].luas - a[1].luas);
    return ex(8, `Kerusakan & kerugian lahan diperkirakan ${hl(rp(tot[1]))}; ${hl(rb(kons) + " ha")} terbakar di dalam areal konsesi`,
      "Nilai kerusakan dan kerugian per status lahan, musim berjalan", "Batang = nilai tengah (Rupiah 2026); garis = rentang. Klik untuk rincian per jenis areal.",
      hbar(ks.map(([c, v]) => ({n: nmK(c), v: v.rp[1], lo: v.rp[0], hi: v.rp[2], w: KAT[c]?.[1], dk: "eko|" + c, txt: rp(v.rp[1]), tip: `<b>${esc(KAT[c]?.[0] || c)}</b><br>± ${rb(v.ha[1])} ha × US$${fmt(v.usd_ha)}/ha (2015)<br>${rp(v.rp[1])} (${rp(v.rp[0])}–${rp(v.rp[2])})`})), {L: sempit() ? 140 : 230})
      + `<div class="lbl" style="margin:14px 0 4px">Kompleks api aktif menurut jenis areal konsesi</div>`
      + tabel(["Jenis areal", ">Luas kompleks", ">Kompleks", "Provinsi terluas"], kjs.map(([j, a]) => baris("ksj|" + j, `<td><b>${esc(JNK[j] || j)}</b></td><td class="n">${rb(a.luas)} ha</td><td class="n">${fmt(a.n)}</td><td>${Object.entries(a.prov).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k]) => esc(namaProv(k))).join(", ")}</td>`))),
      `Sumber: ${sm("wb16", "World Bank 2016 (The Cost of Fire)")}, ${sm("bps", "BPS")} inflasi, peta konsesi (sawit/HPH ± 2014, HTI 2020–2022, tambang 2026); api di areal konsesi tidak otomatis berarti pemegang izinnya pelaku`);
  }
  function popEko(c) { const v = D.ekonomi[c];
    dlg(esc(KAT[c]?.[0] || c), "Nilai kerusakan & kerugian lahan terbakar", tabel(["Skenario", ">Luas", ">Nilai (Rp 2026)"], ["Rendah", "Tengah", "Tinggi"].map((n, i) => `<tr><td>${n}</td><td class="n">${rb(v.ha[i])} ha</td><td class="n">${rp(v.rp[i])}</td></tr>`))
      + `<p class="fnd">Porsi ${Math.round(v.porsi * 100)}% dari luas musim × US$${fmt(v.usd_ha)}/ha (2015).</p>`); }
  function popKsj(j) { const rs = (D.lahan.konsesi || []).filter(r => r.jenis === j); if (!rs.length) return;
    dlg(esc(JNK[j] || j), `${rb(rs.reduce((a, r) => a + r.luas, 0))} ha kompleks aktif di ${rs.length} provinsi`,
      tabel(["Provinsi", ">Luas kompleks", ">Kompleks"], rs.map(r => `<tr><td>${esc(namaProv(r.prov))}</td><td class="n">${rb(r.luas)} ha</td><td class="n">${fmt(r.n_kompleks)}</td></tr>`))
      + `<div class="dk-kvs">${rs.flatMap(r => r.kompleks).slice(0, 40).map(id => `<button class="btn sec" data-kom="${esc(id)}">${esc(id)}</button>`).join("")}</div><p class="fnd">Klik kompleks untuk membukanya di peta. Data ini hanya penunjuk status lahan, bukan penetapan siapa yang membakar.</p>`); }

  /* ================= 9. lintas batas ================= */
  function b9() {
    const T = D.udara.tetangga, H = D.udara.hari, I = D.internasional, hr = hariSejak(geser(kini(), -59), kini());
    const buruk = T.filter(t => Math.max(...t.pm) > 55.4), nI = Object.values(I.harian).reduce((a, b) => a + b, 0), n7 = hr.slice(-7).reduce((a, t) => a + (I.harian[t] || 0), 0);
    const grid = `<div class="tw dk-tw"><table class="dk-grid"><thead><tr><th>Kota</th><th>Negara</th>${H.map((t, i) => `<th class="n">${i ? hariN(t) : "Hari ini"}</th>`).join("")}</tr></thead><tbody>${T.map(t => baris("kota|" + t.nama,
      `<td><b>${esc(t.nama)}</b></td><td><span class="dk-s">${bdr(t.negara)}${esc(t.negara)}</span></td>${t.pm.map(v => `<td class="n"><span class="dk-sel" style="background:${W5[kelas(v)]};color:${kelas(v) >= 2 ? "#fff" : "#13213a"}">${fmt(v)}</span></td>`).join("")}`)).join("")}</tbody></table></div>`;
    return ex(9, buruk.length ? `Udara tidak sehat diperkirakan menjangkau ${hl(buruk.length + " kota")} di negara tetangga dalam 4 hari ke depan, termasuk ${esc(buruk.slice(0, 3).map(t => t.nama).join(", "))}` : "Asap belum diperkirakan membuat udara tidak sehat di kota-kota negara tetangga",
      "PM2.5 di kota negara tetangga dan liputan media internasional", "Angka = PM2.5 maksimum harian (µg/m³), warna = kelas ISPU. Klik kota untuk grafik, klik batang untuk berita hari itu.",
      grid + `<div class="lbl" style="margin:14px 0 4px">Berita internasional per hari, 60 hari terakhir</div>`
      + kolom(hr, [{k: "i", w: W.ungu, v: I.harian}], {H: 110, tip: (t, n) => `<b>${tgl(t)}</b><br>${n} berita`, dk: t => "intl|" + t})
      + tabel(["", "Tanggal", "Judul", "Media"], I.contoh.slice(0, 8).map(x => `<tr><td>${thumbB(x)}</td><td>${tgl(x.tgl)}</td><td class="dk-wrap">${tautan(urlB(x), x.judul)}</td><td>${mediaB(x)}</td></tr>`)),
      `Sumber: prakiraan ${sm("cams", "CAMS (Copernicus)")}, liputan media internasional`);
  }
  function popIntlHari(t) { const xs = D.internasional.contoh.filter(x => x.tgl === t);
    dlg(`Berita internasional ${tgl(t)}`, `${D.internasional.harian[t] || 0} berita`, xs.length ? `<ul class="dk-ul">${xs.map(x => `<li>${tautan(urlB(x), x.judul)}<small class="dk-s">${esc(x.media || "")}${ngB(x) ? " · " + bdr(ngB(x)) + esc(ngB(x)) : ""}</small></li>`).join("")}</ul>` : `<p class="fnd">Judulnya tidak termasuk 40 contoh terbaru yang disimpan.</p>`); }

  /* ================= 10. total kerugian ================= */
  function b10() {
    const K = D.kerugian, si = st.skn, sk = Object.entries(K.sektor).sort((a, b) => b[1][si] - a[1][si]), T = K.total, NS = ["rendah", "menengah", "tinggi"][si], Wd = lw(), rh = 30, L = sempit() ? 92 : 210, R = 96, mx = T[2], X = v => v / mx * (Wd - L - R);
    const WC = [W.merah, W.oranye, W.kuning, W.hijau, W.biru, W.ungu, W.biru2, W.teal, W.tua, "#9a7448", "#8a96a8"], n = sk.length, yT = n * rh + 6, yW = yT + rh + 4, yA = yW + 2 * rh + 6, Ht = yA + 16;
    const stp = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(q => mx / 1e12 / q <= 6) || 1000, tk = []; for (let v = 0; v * 1e12 <= mx; v += stp) tk.push(v);
    const pc = (x, y, t, w) => { const wd = pw(t); return pilV(Math.min(Math.max(L, x - wd / 2), Wd - wd), y, t, w); };
    let acc = 0, xs = [];
    const bar = sk.map(([k, v], i) => { const y = i * rh, x = L + X(acc), wd = Math.max(1.5, X(v[si])); acc += v[si]; xs.push(x + wd); const w = WC[i % 11];
      return `<g data-dk="sek10|${k}" style="cursor:pointer"><rect class="hov" x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(nmS(k))}</text>
        <rect class="gx" style="--i:${i}" x="${x}" y="${y + 6}" width="${wd}" height="${rh - 12}" rx="3" fill="${w}" data-tip="<div class='tk'><div class='tk-h'><b>${esc(SEKTOR[k] || k)}</b></div><div class='tk-n'><b>${rp(v[si])}</b><span class='tk-s on'>${Math.round(v[si] / T[si] * 100)}% dari total</span></div><div class='tk-rg'><i style='left:${(v[1] - v[0]) / Math.max(1, v[2] - v[0]) * 100}%'></i></div><div class='tk-rgn'><span>${rp(v[0])}<small>rendah</small></span><span>${rp(v[2])}<small>tinggi</small></span></div></div>"/>
        ${pilV(x + wd + 5, y + 5, rp(v[si]), w)}</g>`; }).join("");
    const con = xs.map((x, i) => `<line x1="${x}" x2="${x}" y1="${i * rh + rh - 6}" y2="${(i + 1) * rh + 6}" stroke="currentColor" stroke-dasharray="3 3" opacity=".4"/>`).join("");
    const grid = tk.map(v => `<line x1="${L + X(v * 1e12)}" x2="${L + X(v * 1e12)}" y1="0" y2="${yA}" stroke="currentColor" opacity=".08"/><text x="${L + X(v * 1e12)}" y="${Ht - 2}" text-anchor="middle" font-size="9.5" opacity=".65">${rp(v * 1e12)}</text>`).join("");
    const svg = `<svg class="dk-svg" viewBox="0 0 ${Wd} ${Ht}" role="img" aria-label="Kerugian per sektor">${grid}<line x1="${L}" x2="${L}" y1="0" y2="${yA}" stroke="currentColor" opacity=".25"/>${con}${bar}
      <g data-dk="" ><text x="${L - 8}" y="${yT + rh / 2 + 4}" text-anchor="end" font-size="12.5" font-weight="800">Total</text><rect x="${L}" y="${yT + 4}" width="${X(T[si])}" height="${rh - 8}" rx="3" fill="${NAVY}" data-tip="<b>Total (skenario ${NS})</b><br>${rp(T[si])}<br>rentang ${rp(T[0])}–${rp(T[2])}"/>${pilV(L + X(T[si]) + 5, yT + 5, rp(T[si]), NAVY)}</g>
      <g><text x="${L - 8}" y="${yW + 14}" text-anchor="end" font-size="11.5" font-weight="600" opacity=".8">Rentang</text>
        <line x1="${L + X(T[0])}" x2="${L + X(T[2])}" y1="${yW + 10}" y2="${yW + 10}" stroke="${NAVY}" stroke-width="2"/><line x1="${L + X(T[0])}" x2="${L + X(T[0])}" y1="${yW + 3}" y2="${yW + 17}" stroke="${NAVY}" stroke-width="2"/><line x1="${L + X(T[2])}" x2="${L + X(T[2])}" y1="${yW + 3}" y2="${yW + 17}" stroke="${NAVY}" stroke-width="2"/>
        ${pc(L + X(T[0]), yW + 22, "min " + rp(T[0]), "#5a6b85")}${pc(L + X(T[2]), yW + 22, "maks " + rp(T[2]), "#5a6b85")}</g></svg>`;
    return ex(10, `Kerugian akibat kebakaran sejak ${tgl(D.musim.mulai)} diperkirakan ${hl(rp(T[si]))} pada skenario ${NS}, dengan rentang ${rp(T[0])} sampai ${rp(T[2])}`,
      "Kerusakan dan kerugian per sektor, Rupiah 2026, metode World Bank", "Air terjun: tiap sektor menumpuk ke total. Garis dengan label min/maks = rentang total. Klik sektor untuk angka rendah–tinggi.",
      `<div class="ctl" style="margin-bottom:8px">${seg("skn", [[0, "Rendah"], [1, "Menengah"], [2, "Tinggi"]])}</div>` + svg + LG([[`Kerusakan & kerugian per sektor (skenario ${NS})`, W.oranye], ["Total", NAVY], ["Rentang rendah–tinggi", "#5a6b85"]]),
      `Sumber: ${sm("wb16", "World Bank 2016")} dan ${sm("wb19", "2019")}, ${sm("bps", "BPS")} (inflasi), ${sm("gwis", "GWIS/MODIS")}, ${sm("sipongi", "KLHK SiPongi")}, ${sm("ipcc", "IPCC")}, ${sm("wang", "Wang dkk. 2025")}; perkiraan orde besaran, bukan penilaian resmi BNPB/Bappenas`);
  }
  function popSek10(k) { const v = D.kerugian.sektor[k];
    dlg(esc(SEKTOR[k] || k), "Kerusakan & kerugian sektor ini, Rupiah 2026", tabel(["Skenario", ">Nilai"], ["Rendah", "Menengah", "Tinggi"].map((n, i) => `<tr><td>${n}</td><td class="n">${rp(v[i])}</td></tr>`))
      + `<p class="fnd">Porsi sektor ${satu(D.asumsi.wb2015[k] / 16124 * 100)}% dari total 2015 (US$${fmt(D.asumsi.wb2015[k])} juta dari US$16.124 juta; World Bank 2016).</p>`); }

  /* ---------- aksi klik ---------- */
  function aksi(s) { const [t, a] = s.split("|");
    ({prov: () => popProv(a), kota: () => popKota(a), kej: () => popKej(+a), bandara: () => popBandara(a), harif: () => popHariF(a), ispa: () => popIspa(+a),
      sek: () => popSek(+a), sekb: () => popBerita(D.sekolah_berita, +a, "Berita penutupan sekolah"), dekat: () => popDekat(a), desa: () => popDesa(+a),
      musim: () => popMusim(a), kat: () => popKat(a), lind: () => popLind(+a), emisi: () => popEmisi(), eko: () => popEko(a), ksj: () => popKsj(a),
      intl: () => popIntlHari(a), intlb: () => popBerita(D.internasional.contoh, +a, "Berita internasional"), sek10: () => popSek10(a)}[t] || (() => {}))(); }
  const BAG = [b1, b2, b3, b4, b5, b6, b7, b8, b9, b10];
  const gambar = n => { try { return BAG[n - 1](); } catch (e) { console.warn("dampak", n, e); return `<section class="dk-bag" id="dk-${n}" data-bag="${n}"><div class="ex"><h3>${JUDUL[n - 1]}</h3><p class="fnd">Bagian ini gagal digambar: ${esc(e.message)}</p></div></section>`; } };
  const BAG_ST = {hari: [1, 3], rentF: [2], skn: [10]};
  function ikat(el) {
    if (el._dk) return; el._dk = 1;
    el.addEventListener("click", e => {
      const h = e.target.closest("[data-pg] [data-h]"); if (h) { if (!h.disabled) { const w = h.closest("[data-pg]"), b = h.closest("[data-bag]"); st.hal[w.dataset.pg] = +h.dataset.h; b.outerHTML = gambar(+b.dataset.bag); } return; }
      const s = e.target.closest("[data-dks]"); if (s) { const k = s.dataset.dks, v = s.dataset.v; st[k] = v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v;
        (BAG_ST[k] || []).forEach(n => { const b = el.querySelector(`#dk-${n}`); if (b) b.outerHTML = gambar(n); }); return; }
      const nav = e.target.closest("[data-ke]"); if (nav) { el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); return; }
      const a = e.target.closest("[data-dk]"); if (a && a.dataset.dk && !e.target.closest("a")) aksi(a.dataset.dk); });
    el.addEventListener("keydown", e => { if (e.key !== "Enter") return; const a = e.target.closest("[data-dk]"); if (a?.dataset.dk) aksi(a.dataset.dk); });
  }

  async function render() {
    const el = $("#dampak"); if (!el) return; ikat(el);
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak kebakaran…</div>`;
      try { await muat(); } catch (e) { gagal = e.message; el.innerHTML = `<div class="kosong">Data dampak belum tersedia (${esc(gagal)}). Jalankan scripts/data/dampak.py.</div>`; return; } }
    /* judul halaman dihapus (pemilik); tiap pintasan bagian berikon dengan warna sendiri */
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${JUDUL.map((j, i) => `<button data-ke="${i + 1}" style="--w:${WK[i]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[i]}"/></svg>${j}</button>`).join("")}</nav>
      <div id="dkIsi"></div></div>`;
    if (!el._sc) { el._sc = 1; let tk = 0; document.addEventListener("scroll", () => { if (tk) return; tk = requestAnimationFrame(() => { tk = 0; let a = 1; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = +b.dataset.bag; }); el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", +b.dataset.ke === a)); }); }, true); }
    const isi = $("#dkIsi"); isi.innerHTML = gambar(1) + gambar(2);
    nanti(() => { isi.insertAdjacentHTML("beforeend", [3, 4, 5, 6, 7, 8, 9, 10].map(gambar).join("")); }); /* INP: dua bagian pertama dulu */
  }
  return {render, aksi};
})();
