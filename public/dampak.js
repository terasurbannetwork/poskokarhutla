/* dampak.js — tab "Dampak": sepuluh bagian dampak kebakaran musim berjalan.
   Dimuat SETELAH skrip utama index.html dan lapisan5.js (skrip klasik; global yang dipakai: S, PRIO, namaProv, fmt, rb, rp, esc,
   muatJSON, jamWIB, bukaTab, Laci, Insight, Lapis, paparan). Angka berat dihitung harian oleh scripts/data/dampak.py
   (public/data/dampak.json) dan scripts/data/penerbangan.py (public/data/penerbangan.json); berkas ini hanya menggambar. */
const Dampak = (() => {
  const W = {merah: "#c9503a", oranye: "#e58a45", kuning: "#e3b94e", hijau: "#5a9e74", biru: "#4f8fc4", ungu: "#5f6fb0", biru2: "#3f7fb8", teal: "#2b8c86", tua: "#7a2b2b"};
  const W5 = [W.hijau, W.kuning, W.oranye, W.merah, W.tua], KELAS = ["Baik", "Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"], AMB = [15.5, 55.4, 150.4, 250.4];
  const kelas = v => AMB.filter(a => v > a).length;
  const JUDUL = ["Kualitas udara", "Penerbangan", "Kesehatan", "Pendidikan", "Permukiman", "Hutan & gambut", "Emisi karbon", "Ekonomi lahan", "Lintas batas", "Total kerugian"];
  const KAT = {konsesi_sawit: ["Konsesi sawit", W.oranye], konsesi_hph: ["Konsesi hutan alam (PBPH/HPH)", W.kuning], konsesi_lain: ["Konsesi lain", "#b8902c"],
    hutan_produksi: ["Hutan produksi tanpa konsesi", W.biru], konservasi: ["Kawasan konservasi (taman nasional, suaka)", W.hijau], lindung: ["Hutan lindung & Tahura", W.teal], apl: ["Lahan masyarakat (APL)", W.ungu]};
  const SEKTOR = {pertanian: "Pertanian & perkebunan", lingkungan_karbon: "Lingkungan: karbon", lingkungan_hayati: "Lingkungan: keanekaragaman hayati",
    kehutanan: "Kehutanan (kayu & reboisasi)", perdagangan: "Perdagangan", industri_tambang: "Industri & tambang", pariwisata: "Pariwisata",
    transportasi: "Transportasi", pemadaman: "Biaya pemadaman", kesehatan: "Kesehatan (biaya langsung)", pendidikan: "Pendidikan (sekolah tutup)"};
  const WJ = {divert: W.merah, batal: W.tua, rtb: W.oranye, tutup: W.ungu, tunda: W.kuning, jarak_pandang: W.biru, lain: "#8a96a8"};
  let D = null, F = null, M = [], pap = null, gagal = "";
  const st = {hari: 0, rentF: 60, semuaF: false, semuaD: false, semuaS: false};

  /* ---------- pembantu ---------- */
  const hl = t => `<span class="hl">${t}</span>`;
  /* lebar viewBox mengikuti layar supaya teks grafik tetap terbaca di 375 px */
  const lw = () => Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44)), sempit = () => lw() < 500, LL = l => sempit() ? Math.round(l * .7) : l;
  const nmP = k => sempit() ? pendek(k) : namaProv(k);
  const PENDEK = {konsesi_sawit: "Sawit", konsesi_hph: "PBPH/HPH", konsesi_lain: "Konsesi lain", hutan_produksi: "Hutan produksi", konservasi: "Konservasi", lindung: "Lindung", apl: "APL (masyarakat)",
    pertanian: "Pertanian", lingkungan_karbon: "Karbon", lingkungan_hayati: "Hayati", kehutanan: "Kehutanan", perdagangan: "Perdagangan", industri_tambang: "Industri",
    pariwisata: "Pariwisata", transportasi: "Transportasi", pemadaman: "Pemadaman", kesehatan: "Kesehatan", pendidikan: "Pendidikan"};
  const nmK = c => sempit() ? PENDEK[c] || c : KAT[c]?.[0] || c, nmS = k => sempit() ? PENDEK[k] || k : SEKTOR[k] || k;
  const ex = (n, judul, sub, unit, isi, fn, ctl = "") => `<section class="dk-bag" id="dk-${n}" data-bag="${n}"><div class="dk-no">${n}. ${JUDUL[n - 1]}</div>${Insight.ex(judul, sub, unit, isi, fn, ctl)}</section>`;
  const kpi = xs => `<div class="grid g4 dk-kpi">${xs.map(([l, v, s]) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`).join("")}</div>`;
  const tgl = t => new Date(t.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
  const hariN = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric"});
  const satu = v => fmt(Math.round(v * 10) / 10);
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const rentang = (a, f) => `${f(a[1])}<small class="dk-r">${f(a[0])} – ${f(a[2])}</small>`;
  const seg = (k, opsi) => `<div class="seg" role="group">${opsi.map(([v, n]) => `<button data-dks="${k}" data-v="${v}" aria-pressed="${String(st[k]) === String(v)}">${n}</button>`).join("")}</div>`;
  const baris = (dk, isi) => `<tr data-dk="${dk}" tabindex="0">${isi}</tr>`;
  const tabel = (kepala, rows) => `<div class="tw dk-tw"><table><thead><tr>${kepala.map(h => `<th${h[0] === ">" ? ' class="n"' : ""}>${h.replace(/^>/, "")}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${kepala.length}">Belum ada.</td></tr>`}</tbody></table></div>`;
  const tautan = (u, t) => `<a href="${escUrl(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const kotak = (k, v) => `<div class="dk-kv"><span>${k}</span><b>${v}</b></div>`;
  function dlg(judul, sub, isi) { const d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${judul}</h3><p>${sub}</p></div><button aria-label="Tutup" data-tutup>×</button></div><div class="db">${isi}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); };
    d.querySelectorAll("[data-kom]").forEach(b => b.onclick = () => { d.close(); bukaTab("peta"); Laci.buka(b.dataset.kom); }); d.showModal(); }
  const tombolK = id => id ? `<button class="btn sec" data-kom="${esc(id)}">Buka kompleks ${esc(id)} di peta</button>` : "";
  /* batang horizontal sederhana: rows = [{n, v, w, tip, dk, lo, hi, txt}] */
  function hbar(rows, {L = 150, W2 = lw(), rh = 26, maks, garis = []} = {}) {
    L = LL(L); const R = Math.max(50, ...rows.map(r => String(r.txt ?? fmt(r.v)).length * 6.2 + 10)), m = maks || Math.max(1, ...rows.map(r => r.hi ?? r.v)), X = v => L + Math.max(0, v) / m * (W2 - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${W2} ${rows.length * rh + 6}" role="img">${garis.map(([v, t]) => v < m ? `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${rows.length * rh}" stroke="currentColor" stroke-dasharray="3 3" opacity=".35"/><text x="${X(v) + 3}" y="${rows.length * rh + 4}" font-size="9" opacity=".6">${t}</text>` : "").join("")}
      ${rows.map((r, i) => { const y = i * rh;
        return `<g data-dk="${r.dk || ""}" style="cursor:${r.dk ? "pointer" : "default"}"><rect class="hov" x="0" y="${y}" width="${W2}" height="${rh}" fill="transparent"/>
        <text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${r.w || W.oranye}" data-tip="${r.tip || ""}"/>
        ${r.lo != null ? `<line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y + rh / 2}" y2="${y + rh / 2}" stroke="currentColor" stroke-width="1.5" opacity=".7"/><line x1="${X(r.lo)}" x2="${X(r.lo)}" y1="${y + 8}" y2="${y + rh - 8}" stroke="currentColor" opacity=".7"/><line x1="${X(r.hi)}" x2="${X(r.hi)}" y1="${y + 8}" y2="${y + rh - 8}" stroke="currentColor" opacity=".7"/>` : ""}
        <text x="${Math.max(X(r.v), r.hi != null ? X(r.hi) : 0) + 5}" y="${y + rh / 2 + 4}" font-size="10.5">${r.txt ?? fmt(r.v)}</text></g>`; }).join("")}</svg>`; }
  /* kolom harian: hari = [t], seri = [{k, w, v: {t: n}}], dk(t) */
  function kolom(hari, seri, {H = 150, W2 = lw(), tip, dk} = {}) {
    const tot = hari.map(t => seri.reduce((a, s) => a + (s.v[t] || 0), 0)), m = Math.max(1, ...tot), g = (W2 - 30) / Math.max(1, hari.length), bw = Math.max(1.5, g * .75);
    let o = `<text x="0" y="10" font-size="9" opacity=".6">${fmt(m)}</text><line x1="26" x2="${W2}" y1="${H}" y2="${H}" stroke="currentColor" opacity=".2"/>`;
    hari.forEach((t, i) => { let y = H; const x = 30 + i * g;
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
    const L = LL(150), Wd = lw(), rh = 26, X = v => v / mx * (Wd - L - 80);
    const svg = `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img" aria-label="Penduduk per kelas udara">${rows.map((r, n) => { let x = L; const y = n * rh;
      return `<g data-dk="prov|${r.k}" style="cursor:pointer"><rect class="hov" x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="11.5" font-weight="600">${esc(nmP(r.k))}</text>`
        + r.j.map((v, c) => { const w = X(v), o = w > 0 ? `<rect class="gx" style="--i:${n}" x="${x}" y="${y + 5}" width="${w}" height="${rh - 10}" fill="${W5[c]}" data-tip="<b>${esc(namaProv(r.k))}</b><br>${KELAS[c]}: ${rb(v)} jiwa<br>klik untuk rincian"/>` : ""; x += w; return o; }).join("")
        + `<text x="${x + 5}" y="${y + 17}" font-size="10.5">${rb(r.ts)}</text></g>`; }).join("")}</svg>`;
    const kb = kota.slice(0, 12).map(c => ({n: c.nama, v: c.pm[i], w: W5[kelas(c.pm[i])], dk: "kota|" + c.nama, txt: `${fmt(c.pm[i])} · ${KELAS[kelas(c.pm[i])]}`,
      tip: `<b>${esc(c.nama)}</b><br>PM2.5 maks. ${fmt(c.pm[i])} µg/m³<br>${KELAS[kelas(c.pm[i])]}<br>asap dari kompleks api terdekat ${c.api_km != null ? "± " + fmt(c.api_km) + " km" : ""}<br>klik untuk 4 hari`}));
    return ex(1, `${hl(jt(ts) + " jiwa")} di 9 provinsi prioritas menghirup udara tidak sehat ${i ? "pada " + hariN(hr) : "hari ini"}`,
      "Penduduk menurut kelas udara (ISPU PM2.5), prakiraan 4 hari", "Batang = jumlah jiwa per provinsi, diwarnai menurut kelas udara. Klik provinsi atau kota untuk rinciannya.",
      kpi([["Udara tidak sehat", jt(ts), "jiwa di 9 provinsi prioritas"], ["Sangat tidak sehat+", jt(stb), "jiwa, termasuk kelas berbahaya"],
        ["Kota terburuk", esc(kota[0]?.nama || "–"), `PM2.5 maks. ${fmt(kota[0]?.pm[i])} µg/m³`], ["Hari terburuk", terburuk ? hariN(terburuk[0]) : "–", `${jt(terburuk?.[1] || 0)} jiwa terpapar tidak sehat`]])
      + svg + legenda(KELAS.map((k, c) => [k, W5[c]])) + `<div class="lbl" style="margin:14px 0 4px">Kota yang terpapar asap karhutla, PM2.5 tertinggi <span style="text-transform:none">(µg/m³)</span></div>` + hbar(kb, {L: 120, garis: [[55.4, "tidak sehat"], [150.4, "sangat tidak sehat"]]})
        + (lain.length ? `<p class="fnd" style="margin-top:8px">Tidak dihitung karena tidak ada kompleks api searah angin dalam 300 km, jadi udaranya buruk bukan karena karhutla (polusi kota, industri, kendaraan): ${lain.map(c => `${esc(c.nama)} ${fmt(c.pm[i])}`).join(", ")} µg/m³.</p>` : ""),
      `Sumber: prakiraan CAMS (Copernicus) lewat Open-Meteo, sel ± 110 km, dibuat ${jamWIB(U.dibuat)}; penduduk WorldPop 2026. ${U.pm_basis === "rata24" ? "Jumlah jiwa per kelas ISPU dan ISPA tambahan memakai PM2.5 <b>rata-rata 24 jam</b>, sama dengan dasar ISPU; angka per kota adalah <b>maksimum per jam</b> (puncak harian, biasanya 1,5–3 kali rata-rata 24 jam di dekat api)." : "Angka PM2.5 adalah <b>maksimum per jam</b> dalam sehari, sedangkan ambang ISPU memakai rata-rata 24 jam, jadi kelasnya cenderung lebih buruk dari ukuran resmi."} CAMS menghitung semua sumber polusi, jadi data ini disilangkan dengan kompleks api: penduduk dan kota hanya dihitung bila ada titik panas 24 jam dalam 300 km yang asapnya terbawa angin ke arahnya.`,
      seg("hari", U.hari.map((t, j) => [j, j ? hariN(t) : "Hari ini"])));
  }
  function popProv(k) {
    const U = D.udara, js = U.hari.map((t, j) => jiwaProv(k, j)), m = Math.max(1, ...js.map(j => j.reduce((a, b) => a + b, 0))), is = D.udara.prov[k]?.ispa || [], dk = D.dekat.prov[k];
    const svg = `<svg class="dk-svg" viewBox="0 0 400 150">${js.map((j, n) => { let y = 130; return j.map((v, c) => { const h = v / m * 120; y -= h; return `<rect x="${20 + n * 95}" y="${y}" width="70" height="${h}" fill="${W5[c]}" data-tip="${KELAS[c]}: ${rb(v)} jiwa"/>`; }).join("") + `<text x="${55 + n * 95}" y="145" text-anchor="middle" font-size="10">${n ? hariN(U.hari[n]) : "Hari ini"}</text>`; }).join("")}</svg>`;
    dlg(esc(namaProv(k)), "Udara, kesehatan, dan kedekatan dengan api",
      `${svg}${legenda(KELAS.map((x, c) => [x, W5[c]]))}
      <div class="dk-kvs">${kotak("Udara tidak sehat hari ini", jt(js[0].slice(2).reduce((a, b) => a + b, 0)) + " jiwa")}${is[0] ? kotak("Tambahan kunjungan ISPA/hari", `${fmt(is[0][1])} (${fmt(is[0][0])}–${fmt(is[0][2])})`) : ""}
      ${dk ? kotak("Desa ≤ 5 km dari api", fmt(dk.desa[1])) + kotak("Penduduk ≤ 5 km dari api", jt(dk.jiwa[1])) + kotak("Sekolah ≤ 5 km (OSM)", fmt(dk.sekolah[1])) : ""}</div>
      <p class="fnd">Tambahan kunjungan ISPA adalah perkiraan model (lihat bagian 3), bukan laporan dinas kesehatan.</p>
      <button class="btn sec" data-peta="${k}">Buka provinsi di peta</button>`);
    $("#dlg [data-peta]").onclick = () => { $("#dlg").close(); bukaTab("peta"); nanti(() => turun(k)); };
  }
  function popKota(n) {
    const c = D.udara.kota.find(x => x.nama === n) || D.udara.tetangga.find(x => x.nama === n); if (!c) return;
    const mx = Math.max(60, ...c.pm), saran = ["Aktivitas luar ruang aman.", "Kelompok sensitif kurangi aktivitas berat di luar.", "Kurangi kegiatan luar ruang; pakai masker N95/KN95 bila keluar.",
      "Hindari kegiatan luar ruang; sekolah layak belajar dari rumah; siapkan ruang bersih udara.", "Tetap di dalam ruangan dengan jendela tertutup; evakuasi kelompok rentan bila berlangsung lama."];
    const k = kelas(Math.max(...c.pm));
    dlg(esc(n), `${c.negara ? esc(c.negara) : esc(namaProv(c.prov))} · PM2.5 maksimum harian, prakiraan CAMS`,
      hbar(c.pm.map((v, j) => ({n: j ? hariN(D.udara.hari[j]) : "Hari ini", v, w: W5[kelas(v)], txt: `${fmt(v)} µg/m³ · ${KELAS[kelas(v)]}`})), {L: 80, W2: 480, maks: mx, garis: [[55.4, "tidak sehat"], [150.4, "sangat"]]})
      + `<p style="margin:0"><b>Saran untuk kelas terburuk (${KELAS[k]}):</b> ${saran[k]}</p><p class="fnd">Satu sel CAMS ± 110 km; kota yang berdekatan bisa mendapat angka sama. Bandingkan dengan alat ukur ISPU KLHK bila tersedia.</p>`);
  }

  /* ================= 2. penerbangan ================= */
  const NJ = j => F?.nama_jenis?.[j] || j;
  function b2() {
    if (!F) return ex(2, "Data gangguan penerbangan belum tersedia", "", "", `<p>Berkas penerbangan.json belum dibuat (scripts/data/penerbangan.py).</p>`, "");
    const ev = F.kejadian, bd = ev.filter(e => e.bandara), rek = ev.filter(e => !e.bandara && e.jumlah), B = F.bandara;
    const sumB = bd.reduce((a, e) => a + e.terdampak, 0), rekMax = rek.reduce((a, e) => e.jumlah > a.jumlah ? e : a, {jumlah: 0}), nB = new Set(bd.map(e => e.bandara)).size, hariG = new Set(ev.map(e => e.tgl)).size;
    const hit = {}; bd.forEach(e => (hit[e.bandara] ||= []).push(e));
    /* peta gelembung: provinsi dari S.geo.prov, gelembung per bandara */
    const Wd = lw(), Hd = Math.round(lw() * .39), x0 = 94.5, x1 = 141.5, y0 = -11.2, y1 = 6.4, PX = lo => (lo - x0) / (x1 - x0) * Wd, PY = la => (y1 - la) / (y1 - y0) * Hd;
    let peta = "";
    for (const f of S.geo?.prov?.features || []) { const g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      peta += polys.map(p => { const r = p[0], step = Math.max(1, Math.floor(r.length / 60)); return r.length < 8 ? "" : `<path d="M${r.filter((_, j) => j % step === 0).map(([lo, la]) => PX(lo).toFixed(1) + "," + PY(la).toFixed(1)).join("L")}Z" class="dk-darat"/>`; }).join(""); }
    const mxE = Math.max(1, ...Object.values(hit).map(x => x.length));
    const gel = Object.entries(hit).sort((a, b) => b[1].length - a[1].length).map(([k, xs]) => { const b = B[k]; if (!b?.lat) return "";
      const r = (3 + Math.sqrt(xs.length / mxE) * 15) * Wd / 640 + 1, fl = xs.reduce((a, e) => a + e.terdampak, 0);
      return `<g data-dk="bandara|${k}" style="cursor:pointer"><circle class="gf" cx="${PX(b.lon)}" cy="${PY(b.lat)}" r="${r}" fill="${W.merah}" fill-opacity=".55" stroke="${W.merah}" data-tip="<b>${esc(k)} · ${esc(b.nama)}</b><br>${xs.length} kejadian · min. ${fmt(fl)} penerbangan<br>klik untuk rincian & METAR"/>
        ${xs.length >= mxE / 4 ? `<text x="${PX(b.lon)}" y="${PY(b.lat) - r - 3}" text-anchor="middle" font-size="10" font-weight="700">${k}</text>` : ""}</g>`; }).join("");
    const akhir = kini(), semua = hariSejak(F.mulai_musim, akhir), hari = st.rentF === "semua" ? semua : semua.slice(-st.rentF);
    const seri = Object.keys(WJ).map(j => ({k: j, w: WJ[j], v: ev.reduce((a, e) => { if (e.jenis[0] === j) a[e.tgl] = (a[e.tgl] || 0) + 1; return a; }, {})}));
    const daf = st.semuaF ? ev : ev.slice(0, 12);
    const rows = daf.map(e => baris(`kej|${ev.indexOf(e)}`, `<td>${tgl(e.tgl)}</td><td><b>${esc(e.bandara || e.disebut || "Beberapa/nasional")}</b><small class="dk-s">${esc(B[e.bandara]?.nama || (e.disebut ? "rekap wilayah" : ""))}</small></td>
      <td>${esc(e.maskapai.join(", ") || "–")}${e.nomor.length ? `<small class="dk-s">${esc(e.nomor.join(", "))}</small>` : ""}</td><td><span class="dk-jn" style="--w:${WJ[e.jenis[0]] || WJ.lain}">${esc(NJ(e.jenis[0]))}</span>${e.alternatif ? `<small class="dk-s">→ ${esc(e.alternatif)}</small>` : ""}</td>
      <td class="n">${e.jumlah ? fmt(e.jumlah) : "–"}</td><td class="n">${e.sumber.length}</td>`));
    /* jarak pandang terkini: METAR + BNPB */
    const metar = [...M].sort((a, b) => (a.vis_m ?? 9e9) - (b.vis_m ?? 9e9)), kodeICAO = Object.fromEntries(Object.entries(B).map(([k, v]) => [v.icao, k]));
    const bnpb = (S.bnpb?.rows || []).map(r => [r.Provinsi, r["Jarak Pandang Bandara (Km)"]]).filter(r => r[1] != null && r[1] !== "-");
    const vis = metar.map(m => baris(kodeICAO[m.icao] ? `bandara|${kodeICAO[m.icao]}` : "", `<td><b>${esc(m.icao)}</b><small class="dk-s">${esc(m.nama)}</small></td><td class="n" style="color:${(m.vis_m ?? 9999) < 1500 ? W.merah : (m.vis_m ?? 9999) < 5000 ? W.oranye : "inherit"};font-weight:700">${m.vis_m == null ? "–" : m.vis_m >= 9999 ? "≥ 10 km" : satu(m.vis_m / 1000) + " km"}</td><td>${m.asap ? "asap/kabut (FU/HZ)" : esc(m.wx || "–")}</td><td>${jamWIB(m.waktu)}</td>`));
    return ex(2, `Asap mengganggu penerbangan di ${hl(nB + " bandara")} sejak ${tgl(F.mulai_musim)}; ${rekMax.jumlah ? `rekap yang dikutip media mencatat ${hl(fmt(rekMax.jumlah) + " penerbangan")} terdampak` : `minimal ${hl(fmt(sumB) + " penerbangan")} terdampak`}`,
      "Kejadian gangguan penerbangan dari berita, diperiksa dengan jarak pandang METAR", "Gelembung = jumlah kejadian per bandara. Klik gelembung, batang, atau baris untuk rincian, tautan berita, dan grafik jarak pandang.",
      kpi([["Penerbangan terdampak", fmt(Math.max(rekMax.jumlah, sumB)), rekMax.jumlah ? `rekap terbesar di berita; jumlah per bandara min. ${fmt(sumB)}` : "batas bawah dari berita"],
        ["Bandara terdampak", fmt(nB), "disebut di berita gangguan asap"], ["Hari ada gangguan", fmt(hariG), `sejak ${tgl(F.mulai_musim)}`],
        ["Pengalihan pendaratan", fmt(ev.filter(e => e.jenis.includes("divert")).length), "kejadian divert / gagal mendarat"]])
      + `<svg class="dk-svg dk-peta" viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Peta bandara terdampak">${peta}${gel}</svg>`
      + `<div class="ctl" style="margin-top:12px">${seg("rentF", [[30, "30 hari"], [60, "60 hari"], ["semua", "Sejak awal musim"]])}</div>`
      + kolom(hari, seri, {tip: (t, n) => `<b>${tgl(t)}</b><br>${n} kejadian`, dk: t => "harif|" + t}) + legenda(Object.keys(WJ).map(j => [NJ(j), WJ[j]]))
      + `<div class="lbl" style="margin:14px 0 4px">Kejadian terbaru</div>` + tabel(["Tanggal", "Bandara", "Maskapai", "Yang terjadi", ">Jumlah", ">Berita"], rows)
      + (ev.length > 12 ? `<button class="btn sec dk-lagi" data-dks="semuaF" data-v="${!st.semuaF}">${st.semuaF ? "Tampilkan 12 terbaru" : `Tampilkan semua ${ev.length} kejadian`}</button>` : "")
      + `<details class="lipat" style="margin-top:12px"><summary>Jarak pandang bandara saat ini</summary><div class="isi">${tabel(["Bandara", ">Jarak pandang", "Cuaca", "Waktu"], vis)}
        ${bnpb.length ? `<p class="fnd" style="margin-top:8px">Laporan BNPB (jarak pandang bandara, km): ${bnpb.map(([p, v]) => `${esc(p)} ${esc(v)}`).join(" · ")}</p>` : ""}</div></details>`,
      `${esc(F.catatan)} Tidak ada data delay/pembatalan terbuka dari bandara atau maskapai, jadi angka di sini <b>batas bawah</b>; satu kejadian yang diberitakan berhari-hari bisa terhitung lebih dari sekali. Batas terbang visual (VFR) ± 5 km; di bawah ± 1,5 km sebagian besar bandara daerah tanpa ILS praktis tidak bisa didarati. ${F.laporan} judul berita dipakai, diperbarui ${jamWIB(F.dibuat)}.`);
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
    return ex(3, `Asap diperkirakan menambah ${hl(fmt(tot[1]) + " kunjungan ISPA per hari")} di 9 provinsi prioritas (rentang ${fmt(tot[0])}–${fmt(tot[2])})`,
      "Perkiraan tambahan kunjungan infeksi saluran pernapasan akut (ISPA) karena PM2.5", "Batang = perkiraan tengah; garis = rentang rendah–tinggi. Ini PERKIRAAN MODEL, bukan hitungan puskesmas. Klik provinsi untuk rincian.",
      kpi([["Tambahan ISPA/hari", rentang(tot, fmt), i ? hariN(U.hari[i]) : "hari ini, perkiraan"], ["4 hari ke depan", rentang(empat, fmt), "total tambahan kunjungan"],
        ["Berita kasus ISPA", fmt(IB.length), `judul dengan angka kasus sejak ${tgl(D.mulai_musim)}`], ["Angka terbesar di berita", maks ? fmt(maks.jumlah) : "–", maks ? esc((maks.prov || []).map(namaProv).join(", ") || "lihat daftar") : ""]])
      + hbar(rows.map(r => ({n: nmP(r.k), v: r.v[1], lo: r.v[0], hi: r.v[2], w: W.oranye, dk: "prov|" + r.k, txt: fmt(r.v[1]), tip: `<b>${esc(namaProv(r.k))}</b><br>tengah ${fmt(r.v[1])} · rentang ${fmt(r.v[0])}–${fmt(r.v[2])} kunjungan/hari`})))
      + `<div class="lbl" style="margin:14px 0 4px">Kasus ISPA yang disebut berita</div>`
      + tabel(["Tanggal", ">Kasus", "Judul"], IB.slice(0, 12).map((x, j) => baris("ispa|" + j, `<td>${tgl(x.tgl)}</td><td class="n"><b>${fmt(x.jumlah)}</b></td><td class="dk-wrap">${esc(x.judul)}<small class="dk-s">${esc(x.media || "")}</small></td>`))),
      `Cara hitung: tiap sel penduduk WorldPop × peluang dasar kunjungan ISPA per provinsi (Riskesdas 2018 Tabel 5.1.1, ISPA terdiagnosis tenaga kesehatan dalam 1 bulan; nasional ${satu(A.ispa_harian * 30 * 100)}%, mis. Riau ${satu(A.ispa_prov?.["14"] ?? 2.2)}%, Kalteng ${satu(A.ispa_prov?.["62"] ?? 6.2)}%) ÷ 30 × kenaikan risiko. Kenaikan risiko tiap +10 µg/m³ PM2.5 di atas ${A.pm_acuan} µg/m³ (pedoman WHO 24 jam): rendah ${satu((A.rr10[0] - 1) * 100)}%, tengah ${satu((A.rr10[1] - 1) * 100)}%, tinggi ${satu((A.rr10[2] - 1) * 100)}% (meta-analisis Wang dkk. 2025, Environmental Research 273:121221, 45 studi: kunjungan IGD pernapasan RR 1,04, CI 95% 1,02–1,06 per 10 µg/m³ PM2.5 asap kebakaran; rendah–tinggi = selang kepercayaan itu). Selisih PM dibatasi ${A.pm_batas} µg/m³. ${D.udara.pm_basis === "rata24" ? "PM2.5 yang dipakai adalah rata-rata 24 jam; CAMS menghitung semua sumber polusi, jadi angka ini tetap sedikit condong ke <b>atas</b>." : "Karena PM2.5 yang dipakai adalah maksimum per jam dan CAMS menghitung semua sumber polusi, angka ini lebih condong ke <b>atas</b>."} Angka di berita adalah kasus kumulatif yang dilaporkan dinas, jadi tidak setara langsung.`);
  }
  function popIspa(j) { const x = D.ispa_berita[j], p = (x.prov || [])[0], is = p && D.udara.prov[p]?.ispa?.[0];
    dlg(`${fmt(x.jumlah)} kasus ISPA disebut berita`, `${esc(x.media || "")} · ${tgl(x.tgl)}`,
      `<p style="margin:0">${tautan(x.url, x.judul)}</p>${p ? `<div class="dk-kvs">${kotak("Provinsi", esc(namaProv(p)))}${is ? kotak("Perkiraan model hari ini", `${fmt(is[1])} tambahan kunjungan/hari`) : ""}</div>` : ""}
      <p class="fnd">Angka di judul biasanya kumulatif (sejak awal bulan/tahun) dan mencakup ISPA bukan karena asap, sedangkan model menghitung tambahan per hari karena PM2.5. Keduanya saling melengkapi, tidak untuk dijumlahkan.</p>`); }

  /* ================= 4. pendidikan ================= */
  const sumP = (f, i) => PRIO.map(k => D.dekat.prov[k]).filter(Boolean).reduce((a, d) => a + (i == null ? d[f] : d[f][i]), 0);
  function b4() {
    const P = D.dekat.prov, R = D.dekat.radius_km, ks = PRIO.filter(k => P[k]).sort((a, b) => P[b].sekolah[1] - P[a].sekolah[1]);
    const SB = D.sekolah_berita, ds = st.semuaS ? D.dekat.sekolah : D.dekat.sekolah.slice(0, 10);
    const rows = ks.map(k => ({n: nmP(k), v: P[k].sekolah[1], w: W.kuning, dk: "dekat|" + k, txt: `${fmt(P[k].sekolah[1])} (≤ 1 km: ${fmt(P[k].sekolah[0])})`,
      tip: `<b>${esc(namaProv(k))}</b><br>≤ 1 km: ${fmt(P[k].sekolah[0])}<br>≤ 5 km: ${fmt(P[k].sekolah[1])}<br>≤ 10 km: ${fmt(P[k].sekolah[2])}<br>di udara tidak sehat hari ini: ${fmt(P[k].sekolah_tidak_sehat)}`}));
    return ex(4, `${hl(fmt(sumP("sekolah", 1)) + " sekolah")} di 9 provinsi prioritas berada dalam 5 km dari api yang perlu dipadamkan; ${hl(fmt(SB.length) + " berita")} melaporkan sekolah libur atau belajar dari rumah karena asap`,
      "Sekolah yang terpeta di OpenStreetMap, dekat api dan di udara tidak sehat", "Batang = sekolah ≤ 5 km dari tepi kompleks berstatus siaga atau prioritas, per provinsi. Klik provinsi, sekolah, atau berita untuk rinciannya.",
      kpi([["Sekolah ≤ 5 km dari api", fmt(sumP("sekolah", 1)), `≤ 1 km: ${fmt(sumP("sekolah", 0))}`], ["Sekolah di udara tidak sehat", fmt(sumP("sekolah_tidak_sehat")), "PM2.5 > 55,4 µg/m³ hari ini"],
        ["Berita sekolah tutup/daring", fmt(SB.length), `sejak ${tgl(D.mulai_musim)}`], ["Faskes ≤ 5 km dari api", fmt(sumP("faskes", 1)), "puskesmas, klinik, RS (OSM)"]])
      + hbar(rows) + `<div class="lbl" style="margin:14px 0 4px">Sekolah terdekat ke api</div>`
      + tabel(["Sekolah", "Provinsi", ">Jarak", "Kompleks"], ds.map((s, j) => baris("sek|" + D.dekat.sekolah.indexOf(s), `<td><b>${esc(s.nama)}</b></td><td>${esc(namaProv(s.prov))}</td><td class="n">${s.km ? satu(s.km) + " km" : "di dalam"}</td><td>${esc(s.kompleks)} <span class="pill l${s.level}">${esc(S.meta?.status?.[s.level] || "")}</span></td>`)))
      + (D.dekat.sekolah.length > 10 ? `<button class="btn sec dk-lagi" data-dks="semuaS" data-v="${!st.semuaS}">${st.semuaS ? "Tampilkan 10" : `Tampilkan ${D.dekat.sekolah.length}`}</button>` : "")
      + `<div class="lbl" style="margin:14px 0 4px">Berita penutupan sekolah</div>` + tabel(["Tanggal", "Judul"], SB.slice(0, 10).map((x, j) => baris("sekb|" + j, `<td>${tgl(x.tgl)}</td><td class="dk-wrap">${esc(x.judul)}<small class="dk-s">${esc(x.media || "")}</small></td>`))),
      `Sekolah dan fasilitas kesehatan dari OpenStreetMap: banyak sekolah belum terpeta, jadi angka ini <b>jauh di bawah</b> jumlah sebenarnya. Jarak diukur ke tepi lingkaran seluas kompleks di titik beratnya. Sebagai pembanding, pada Oktober 2015 asap berdampak pada 24.773 sekolah dan 4,69 juta siswa (World Bank 2016).`);
  }
  function popSek(j) { const s = D.dekat.sekolah[j];
    dlg(esc(s.nama), `${esc(namaProv(s.prov))} · ${s.km ? satu(s.km) + " km" : "di dalam area"} dari kompleks ${esc(s.kompleks)}`,
      (s.pm ? hbar(s.pm.map((v, i) => ({n: i ? hariN(D.udara.hari[i]) : "Hari ini", v, w: W5[kelas(v)], txt: `${fmt(v)} µg/m³ · ${KELAS[kelas(v)]}`})), {L: 80, W2: 480, maks: Math.max(60, ...s.pm), garis: [[55.4, "tidak sehat"]]}) : "")
      + `<p style="margin:0">${s.pm && Math.max(...s.pm) > 55.4 ? "<b>Udara tidak sehat dalam 4 hari ke depan: pertimbangkan belajar dari rumah atau kurangi kegiatan luar ruang.</b>" : "Pantau kualitas udara; api dekat bisa membawa asap mendadak bila angin berbalik."}</p>${tombolK(s.kompleks)}`); }
  function popBerita(arr, j, jenis) { const x = arr[j];
    dlg(jenis, `${esc(x.media || "")} · ${tgl(x.tgl)}`, `<p style="margin:0">${tautan(x.url, x.judul)}</p>${(x.prov || []).length ? `<p class="fnd">Provinsi disebut: ${x.prov.map(p => esc(namaProv(p))).join(", ")}</p>` : ""}<p class="fnd">Hanya judul yang dibaca; buka berita untuk isi lengkap.</p>`); }

  /* ================= 5. permukiman ================= */
  function b5() {
    const P = D.dekat.prov, R = D.dekat.radius_km, ks = PRIO.filter(k => P[k] && (P[k].jiwa[2] || P[k].desa[2])).sort((a, b) => P[b].jiwa[1] - P[a].jiwa[1]).slice(0, 12);
    const WB = [W.merah, W.oranye, W.kuning], dd = st.semuaD ? D.dekat.desa : D.dekat.desa.slice(0, 10), mx = Math.max(1, ...ks.map(k => P[k].jiwa[2]));
    const Wd = lw(), L = LL(150), rh = 26, X = v => v / mx * (Wd - L - 80);
    const svg = `<svg class="dk-svg" viewBox="0 0 ${Wd} ${ks.length * rh}" role="img">${ks.map((k, n) => { const y = n * rh, j = P[k].jiwa;
      return `<g data-dk="dekat|${k}" style="cursor:pointer"><rect class="hov" x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="11.5" font-weight="600">${esc(nmP(k))}</text>`
        + [2, 1, 0].map(c => `<rect class="gx" style="--i:${n}" x="${L}" y="${y + 5}" width="${Math.max(1, X(j[c]))}" height="${rh - 10}" fill="${WB[c]}" data-tip="<b>${esc(namaProv(k))}</b><br>≤ ${R[c]} km: ${rb(j[c])} jiwa, ${fmt(P[k].desa[c])} desa"/>`).join("")
        + `<text x="${L + X(j[2]) + 5}" y="${y + 17}" font-size="10.5">${rb(j[1])} ≤ 5 km</text></g>`; }).join("")}</svg>`;
    return ex(5, `${hl(jt(sumP("jiwa", 1)) + " jiwa")} dan ${hl(fmt(sumP("desa", 1)) + " desa")} di 9 provinsi prioritas berada dalam 5 km dari api yang perlu dipadamkan`,
      "Penduduk dan desa menurut jarak ke tepi kompleks yang perlu dipadamkan", `Batang bertingkat: merah ≤ ${R[0]} km, oranye ≤ ${R[1]} km, kuning ≤ ${R[2]} km. Klik provinsi atau desa untuk rinciannya.`,
      kpi(R.map((r, i) => [`≤ ${r} km dari api`, jt(sumP("jiwa", i)), `jiwa · ${fmt(sumP("desa", i))} desa`]).concat([["Kompleks diukur", fmt(D.dekat.kompleks_aktif), "status siaga & prioritas, seluruh Indonesia"]]))
      + svg + legenda(R.map((r, i) => [`≤ ${r} km`, WB[i]])) + `<div class="lbl" style="margin:14px 0 4px">Desa terdekat ke api</div>`
      + tabel(["Desa", "Provinsi", ">Jarak", "Kompleks"], dd.map(x => baris("desa|" + D.dekat.desa.indexOf(x), `<td><b>${esc(x.nama)}</b><small class="dk-s">${esc(x.kode)}</small></td><td>${esc(namaProv(x.prov))}</td><td class="n">${x.km ? satu(x.km) + " km" : "di dalam"}</td><td>${esc(x.kompleks)} <span class="pill l${x.level}">${esc(S.meta?.status?.[x.level] || "")}</span></td>`)))
      + (D.dekat.desa.length > 10 ? `<button class="btn sec dk-lagi" data-dks="semuaD" data-v="${!st.semuaD}">${st.semuaD ? "Tampilkan 10" : `Tampilkan ${D.dekat.desa.length}`}</button>` : ""),
      `Desa = titik pusat desa OpenStreetMap di 9 provinsi prioritas. Penduduk = kepadatan WorldPop 2026 (sel ± 28 km) disebar rata ke kisi ± 2 km, jadi permukiman padat di tepi kompleks bisa terhitung kurang atau lebih. Jarak diukur ke tepi lingkaran seluas kompleks, bukan ke garis api yang sebenarnya. Kompleks yang diukur = status "Siaga pemadaman awal" dan "Prioritas pemadaman". Angka hanya untuk 9 provinsi prioritas.`);
  }
  function popDekat(k) { const d = D.dekat.prov[k], R = D.dekat.radius_km;
    dlg(esc(namaProv(k)), "Penduduk, desa, sekolah, dan faskes dekat kompleks berstatus siaga & prioritas",
      tabel(["Jarak", ">Jiwa", ">Desa", ">Sekolah", ">Faskes"], R.map((r, i) => `<tr><td>≤ ${r} km</td><td class="n">${rb(d.jiwa[i])}</td><td class="n">${fmt(d.desa[i])}</td><td class="n">${fmt(d.sekolah[i])}</td><td class="n">${fmt(d.faskes[i])}</td></tr>`))
      + `<div class="dk-kvs">${kotak("Sekolah di udara tidak sehat hari ini", fmt(d.sekolah_tidak_sehat))}</div><p class="fnd">Desa hanya tersedia untuk 9 provinsi prioritas; sekolah & faskes hanya yang terpeta di OpenStreetMap.</p>`); }
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
      kpi([["Terbakar sejak " + tgl(Ms.mulai), rentang(H, v => rb(v)), "ha, perkiraan dari titik panas MODIS"], ["Kompleks aktif saat ini", rb(L6.kompleks_ha) + " ha", "luas piksel VIIRS, 7 hari"],
        ["Di lahan gambut", Math.round(gam / tot * 100) + "%", `${rb(gam)} ha luas kompleks aktif`], ["Konservasi & lindung", rb(lind) + " ha", `${fmt(L6.lindung.length)}+ kompleks di kawasan ini`]])
      + hbar(rows) + `<div class="lbl" style="margin:14px 0 4px">Status lahan kompleks aktif</div>` + strip + legenda(kats.map(([c]) => [KAT[c]?.[0] || c, KAT[c]?.[1] || "#8a96a8"]))
      + `<div class="lbl" style="margin:14px 0 4px">Kompleks terluas di kawasan konservasi & hutan lindung</div>`
      + tabel(["Kompleks", "Kawasan", "Lokasi", ">Luas"], L6.lindung.slice(0, 10).map((r, j) => baris("lind|" + j, `<td><b>${esc(r.id)}</b> <span class="pill l${r.level}">${esc(S.meta?.status?.[r.level] || "")}</span></td><td>${esc(r.nama)}${r.gambut ? " · gambut" : ""}</td><td>${esc(r.kab || "")}<small class="dk-s">${esc(namaProv(r.prov))}</small></td><td class="n">${rb(r.luas)} ha</td>`))),
      `Luas musim = jumlah titik panas MODIS (keyakinan ≥ 30) sejak ${tgl(Ms.mulai)} × rasio hektare terbakar per titik tiap provinsi, dikalibrasi dari luas terbakar satelit MCD64A1 (GWIS) dan titik MODIS 2002 s.d. dua tahun lalu; rentang = kuartil rasio tahunan. Rasio nasional ${satu(Ms.rasio_nasional)} ha/titik. Status lahan dari peta gambut, fungsi kawasan hutan, dan konsesi di titik berat kompleks; porsi ini diterapkan ke luas musim pada bagian 7, 8, dan 10. Angka "Lahan terbakar indikatif" BNPB${Ms.bnpb_waktu ? " (" + jamWIB(Ms.bnpb_waktu) + ")" : ""} jauh lebih kecil karena hanya mencatat yang sudah diverifikasi di lapangan.`);
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
      kpi([["Emisi musim ini", rentang(m, v => fmt(Math.round(v))), "juta ton CO₂e"], ["Setara emisi nasional", fmt(Math.round(E.hari_setara[1])) + " hari", `rentang ${fmt(Math.round(E.hari_setara[0]))}–${fmt(Math.round(E.hari_setara[2]))} hari`],
        ["Dari gambut", Math.round(E.gambut_mt / (E.gambut_mt + E.mineral_mt) * 100) + "%", `porsi luas gambut dipakai ${Math.round(E.porsi_gambut[1] * 100)}%`], ["Per ha gambut", fmt(Math.round(A.gambut_tdm[1] * A.ef_gambut)) + " t", "CO₂e, perkiraan tengah"]])
      + hbar(rows, {L: 170}),
      `Emisi = luas musim (bagian 6) × [porsi gambut × ${A.gambut_tdm[1]} t bahan kering/ha (rentang ${A.gambut_tdm[0]}–${A.gambut_tdm[2]}) × ${A.ef_gambut} t CO₂e/t + porsi tanah mineral × ${A.mineral_tdm[1]} t/ha (rentang ${A.mineral_tdm[0]}–${A.mineral_tdm[2]}, asumsi kami) × ${A.ef_mineral} t CO₂e/t]. Faktor gambut: IPCC 2013 Wetlands Supplement Bab 2; faktor vegetasi: Andreae & Merlet 2001; CH₄ dikali GWP100 = ${A.gwp_ch4}. Porsi gambut rendah–tinggi ${E.porsi_gambut.map(v => Math.round(v * 100) + "%").join(" / ")}: batas bawah porsi 2015 (33%, World Bank), batas atas porsi kompleks aktif di peta gambut. Ketidakpastian terbesar ada pada kedalaman gambut yang terbakar. CO₂ dari vegetasi sebagian diserap kembali saat tumbuh lagi; dari gambut tidak.`);
  }
  function popEmisi() { const E = D.emisi;
    dlg("Cara menghitung emisi", "Luas × bahan bakar terbakar × faktor emisi",
      tabel(["Skenario", ">Luas", ">Porsi gambut", ">Emisi"], ["Rendah", "Tengah", "Tinggi"].map((n, i) => `<tr><td>${n}</td><td class="n">${rb(D.musim.ha[i])} ha</td><td class="n">${Math.round(E.porsi_gambut[i] * 100)}%</td><td class="n">${fmt(Math.round(E.mt_co2e[i]))} Mt</td></tr>`))
      + `<div class="dk-kvs">${kotak("Dari gambut (tengah)", fmt(Math.round(E.gambut_mt)) + " Mt")}${kotak("Dari vegetasi tanah mineral (tengah)", fmt(Math.round(E.mineral_mt)) + " Mt")}</div><p class="fnd">Rendah = luas rendah, gambut tipis, porsi gambut kecil; tinggi = kebalikannya. Rentang lebar ini jujur: belum ada peta kedalaman bakar gambut harian.</p>`); }

  /* ================= 8. ekonomi lahan ================= */
  function b8() {
    const Ek = D.ekonomi, ks = Object.entries(Ek).sort((a, b) => b[1].rp[1] - a[1].rp[1]), tot = [0, 1, 2].map(i => ks.reduce((a, [, v]) => a + v.rp[i], 0));
    const kons = ["konsesi_sawit", "konsesi_hph", "konsesi_lain"].reduce((a, c) => a + (Ek[c]?.ha[1] || 0), 0);
    return ex(8, `Kerusakan & kerugian lahan diperkirakan ${hl(rp(tot[1]))}; ${hl(rb(kons) + " ha")} terbakar di dalam konsesi perusahaan`,
      "Nilai kerusakan dan kerugian per status lahan, musim berjalan", "Batang = nilai tengah (Rupiah 2026); garis = rentang. Klik untuk rincian atau daftar perusahaan.",
      kpi([["Nilai lahan terbakar", rentang(tot, rp), "kerusakan + kerugian produksi"], ["Di konsesi perusahaan", rb(kons) + " ha", "sawit, PBPH/HPH, lain"],
        ["Lahan masyarakat (APL)", rb(Ek.apl?.ha[1] || 0) + " ha", "kebun & ladang rakyat, semak"], ["Perusahaan dengan api aktif", fmt(D.lahan.perusahaan.length), "konsesi berisi kompleks aktif"]])
      + hbar(ks.map(([c, v]) => ({n: nmK(c), v: v.rp[1], lo: v.rp[0], hi: v.rp[2], w: KAT[c]?.[1], dk: "eko|" + c, txt: rp(v.rp[1]), tip: `<b>${esc(KAT[c]?.[0] || c)}</b><br>± ${rb(v.ha[1])} ha × US$${fmt(v.usd_ha)}/ha (2015)<br>${rp(v.rp[1])} (${rp(v.rp[0])}–${rp(v.rp[2])})`})), {L: sempit() ? 140 : 230})
      + `<div class="lbl" style="margin:14px 0 4px">Konsesi dengan kompleks api aktif terluas</div>`
      + tabel(["Pemegang izin", "Jenis", ">Luas kompleks", ">Kompleks"], D.lahan.perusahaan.slice(0, 12).map((p, j) => baris("pt|" + j, `<td><b>${esc(p.nama)}</b></td><td>${esc(KAT[p.jenis]?.[0] || p.jenis)}</td><td class="n">${rb(p.luas)} ha</td><td class="n">${fmt(p.kompleks.length)}</td>`))),
      `Nilai per ha diturunkan dari tabel World Bank 2016 (The Cost of Fire) untuk 2015: perkebunan US$${fmt(D.asumsi.nilai_usd_ha.konsesi_sawit)}/ha (kerugian perkebunan ÷ luas sawit & kebun terbakar), pangan/APL US$${fmt(D.asumsi.nilai_usd_ha.apl)}/ha, kehutanan US$${fmt(D.asumsi.nilai_usd_ha.kehutanan)}/ha (kerugian kehutanan ÷ lahan "lainnya"). Dikonversi ke Rupiah 2026 (inflasi AS × kurs Rp${fmt(D.kerugian.kurs)}). Porsi status lahan dari kompleks aktif saat ini. APL tidak selalu kebun produktif, jadi nilainya condong ke atas. Nama perusahaan dari peta konsesi; api di konsesi tidak otomatis berarti perusahaan pelakunya.`);
  }
  function popEko(c) { const v = D.ekonomi[c];
    dlg(esc(KAT[c]?.[0] || c), "Nilai kerusakan & kerugian lahan terbakar", tabel(["Skenario", ">Luas", ">Nilai (Rp 2026)"], ["Rendah", "Tengah", "Tinggi"].map((n, i) => `<tr><td>${n}</td><td class="n">${rb(v.ha[i])} ha</td><td class="n">${rp(v.rp[i])}</td></tr>`))
      + `<p class="fnd">Porsi ${Math.round(v.porsi * 100)}% dari luas musim × US$${fmt(v.usd_ha)}/ha (2015).</p>`); }
  function popPT(j) { const p = D.lahan.perusahaan[j];
    dlg(esc(p.nama), `${esc(KAT[p.jenis]?.[0] || p.jenis)} · ${rb(p.luas)} ha kompleks aktif`,
      `<div class="dk-kvs">${p.kompleks.map(id => `<button class="btn sec" data-kom="${esc(id)}">${esc(id)}</button>`).join("")}</div><p class="fnd">Klik kompleks untuk membukanya di peta. Penegakan hukum butuh pembuktian lapangan; data ini hanya penunjuk lokasi.</p>`); }

  /* ================= 9. lintas batas ================= */
  function b9() {
    const T = D.udara.tetangga, H = D.udara.hari, I = D.internasional, hr = hariSejak(geser(kini(), -59), kini());
    const buruk = T.filter(t => Math.max(...t.pm) > 55.4), nI = Object.values(I.harian).reduce((a, b) => a + b, 0), n7 = hr.slice(-7).reduce((a, t) => a + (I.harian[t] || 0), 0);
    const grid = `<div class="tw dk-tw"><table class="dk-grid"><thead><tr><th>Kota</th>${H.map((t, i) => `<th class="n">${i ? hariN(t) : "Hari ini"}</th>`).join("")}</tr></thead><tbody>${T.map(t => baris("kota|" + t.nama,
      `<td><b>${esc(t.nama)}</b><small class="dk-s">${esc(t.negara)}</small></td>${t.pm.map(v => `<td class="n"><span class="dk-sel" style="background:${W5[kelas(v)]};color:${kelas(v) >= 2 ? "#fff" : "#13213a"}">${fmt(v)}</span></td>`).join("")}`)).join("")}</tbody></table></div>`;
    return ex(9, buruk.length ? `Udara tidak sehat diperkirakan menjangkau ${hl(buruk.length + " kota")} di negara tetangga dalam 4 hari ke depan, termasuk ${esc(buruk.slice(0, 3).map(t => t.nama).join(", "))}` : "Asap belum diperkirakan membuat udara tidak sehat di kota-kota negara tetangga",
      "PM2.5 di kota negara tetangga dan liputan media internasional", "Angka = PM2.5 maksimum harian (µg/m³), warna = kelas ISPU. Klik kota untuk grafik, klik batang untuk berita hari itu.",
      kpi([["Kota tetangga tidak sehat", fmt(buruk.length) + " dari " + T.length, "dalam 4 hari prakiraan"], ["Terburuk", esc([...T].sort((a, b) => Math.max(...b.pm) - Math.max(...a.pm))[0]?.nama || "–"), `PM2.5 maks. ${fmt(Math.max(...([...T].sort((a, b) => Math.max(...b.pm) - Math.max(...a.pm))[0]?.pm || [0])))} µg/m³`],
        ["Berita internasional", fmt(nI), `${I.metode === "asal" ? "dari media luar negeri" : "judul menyebut negara tetangga"}, 120 hari`], ["7 hari terakhir", fmt(n7), "berita internasional"]])
      + grid + `<div class="lbl" style="margin:14px 0 4px">Berita internasional per hari, 60 hari terakhir</div>`
      + kolom(hr, [{k: "i", w: W.ungu, v: I.harian}], {H: 110, tip: (t, n) => `<b>${tgl(t)}</b><br>${n} berita`, dk: t => "intl|" + t})
      + tabel(["Tanggal", "Judul"], I.contoh.slice(0, 8).map((x, j) => baris("intlb|" + j, `<td>${tgl(x.tgl)}</td><td class="dk-wrap">${esc(x.judul)}<small class="dk-s">${esc(x.media || "")}</small></td>`))),
      `PM2.5 dari prakiraan CAMS di sel ± 110 km yang memuat kota itu; sumbernya bisa juga polusi lokal, jadi bandingkan dengan pengukuran badan lingkungan setempat (NEA Singapura, APIMS Malaysia). ${I.metode === "asal" ? "Berita internasional = media yang ditandai bot berita sebagai luar negeri." : "Penanda asal media belum tersedia; dipakai judul yang menyebut Malaysia/Singapura/Brunei."}`);
  }
  function popIntlHari(t) { const xs = D.internasional.contoh.filter(x => x.tgl === t);
    dlg(`Berita internasional ${tgl(t)}`, `${D.internasional.harian[t] || 0} berita`, xs.length ? `<ul class="dk-ul">${xs.map(x => `<li>${tautan(x.url, x.judul)}<small class="dk-s">${esc(x.media || "")}</small></li>`).join("")}</ul>` : `<p class="fnd">Judulnya tidak termasuk 40 contoh terbaru yang disimpan.</p>`); }

  /* ================= 10. total kerugian ================= */
  function b10() {
    const K = D.kerugian, sk = Object.entries(K.sektor).sort((a, b) => b[1][1] - a[1][1]), T = K.total, Wd = lw(), rh = 24, L = sempit() ? 92 : 210, mx = T[2], X = v => v / mx * (Wd - L - 70);
    let acc = 0;
    const svg = `<svg class="dk-svg" viewBox="0 0 ${Wd} ${(sk.length + 1) * rh + 8}" role="img" aria-label="Kerugian per sektor">${sk.map(([k, v], i) => { const y = i * rh, x = L + X(acc); acc += v[1];
      return `<g data-dk="sek10|${k}" style="cursor:pointer"><rect class="hov" x="0" y="${y}" width="${Wd}" height="${rh}" fill="transparent"/><text x="${L - 8}" y="${y + 16}" text-anchor="end" font-size="11" font-weight="600">${esc(nmS(k))}</text>
        <rect class="gx" style="--i:${i}" x="${x}" y="${y + 4}" width="${Math.max(1.5, X(v[1]))}" height="${rh - 8}" rx="2" fill="${[W.merah, W.oranye, W.kuning, W.hijau, W.biru, W.ungu, W.biru2, W.teal, W.tua, "#9a7448", "#8a96a8"][i % 11]}" data-tip="<b>${esc(SEKTOR[k] || k)}</b><br>${rp(v[1])} (${rp(v[0])}–${rp(v[2])})<br>${Math.round(v[1] / T[1] * 100)}% dari total"/>
        <text x="${x + Math.max(1.5, X(v[1])) + 5}" y="${y + 16}" font-size="10">${rp(v[1])}</text></g>`; }).join("")}
      <g transform="translate(0,${sk.length * rh + 4})"><text x="${L - 8}" y="16" text-anchor="end" font-size="12" font-weight="800">Total</text><rect x="${L}" y="3" width="${X(T[1])}" height="${rh - 6}" rx="3" fill="currentColor" opacity=".8" data-tip="<b>Total</b><br>${rp(T[1])}<br>rentang ${rp(T[0])}–${rp(T[2])}"/>
        <line x1="${L + X(T[0])}" x2="${L + X(T[2])}" y1="${rh / 2}" y2="${rh / 2}" stroke="${W.merah}" stroke-width="2"/><line x1="${L + X(T[0])}" x2="${L + X(T[0])}" y1="4" y2="${rh - 4}" stroke="${W.merah}" stroke-width="2"/><line x1="${L + X(T[2])}" x2="${L + X(T[2])}" y1="4" y2="${rh - 4}" stroke="${W.merah}" stroke-width="2"/></g></svg>`;
    const SUMBER = [["World Bank (2016). The Cost of Fire: An Economic Analysis of Indonesia's 2015 Fire Crisis. Indonesia Sustainable Landscapes Knowledge Note 1", "https://documents1.worldbank.org/curated/en/776101467990969768/pdf/103668-BRI-Cost-of-Fires-Knowledge-Note-PUBLIC-ADD-NEW-SERIES-Indonesia-Sustainable-Landscapes-Knowledge-Note.pdf", "US$16,1 miliar untuk 2,6 juta ha (Jun–Okt 2015); tabel sektor 8 provinsi, 2,43 juta ha"],
      ["World Bank (2019). Indonesia Economic Quarterly Desember 2019: Investing in People, Box A.1", "https://openknowledge.worldbank.org/entities/publication/0ea3af9f-ed88-5de7-9cb2-ef39e1752b85", "US$5,2 miliar, 8 provinsi, Jun–Okt 2019; luas resmi 620.201 ha (Jan–Sep)"],
      ["KLHK SiPongi, luas indikatif kebakaran 2019 (public/data/luas_resmi.json)", "", "1.649.258 ha setahun penuh, dasar batas bawah biaya per ha"],
      ["GWIS / MODIS MCD64A1 & NASA FIRMS MODIS", "https://gwis.jrc.ec.europa.eu/", "kalibrasi ha per titik panas, luas musim berjalan"],
      ["BPS: inflasi tahunan (Des–Des) 2016–2025; kurs dasar World Bank (2015: Rp221 T ÷ US$16,124 miliar; 2019: Rp14.160, IEQ Des 2019 Tabel A.4)", "https://www.bps.go.id/", "USD → Rupiah tahun dasar → inflasi Indonesia sampai 2026"],
      ["IPCC 2013 Wetlands Supplement; Andreae & Merlet 2001", "https://www.ipcc-nggip.iges.or.jp/public/wetlands/", "faktor emisi (bagian 7)"],
      ["Wang dkk. 2025, Environ Res 273:121221 (meta-analisis); Riskesdas 2018 Tabel 5.1.1", "https://doi.org/10.1016/j.envres.2025.121221", "risiko ISPA (bagian 3)"]];
    return ex(10, `Kerugian akibat kebakaran sejak ${tgl(D.musim.mulai)} diperkirakan ${hl(rp(T[1]))}, dengan rentang ${rp(T[0])} sampai ${rp(T[2])}`,
      "Kerusakan dan kerugian per sektor, Rupiah 2026, metode World Bank", "Air terjun: tiap sektor menumpuk ke total. Garis merah = rentang total. Klik sektor untuk angka rendah–tinggi.",
      kpi([["Total kerugian", rentang(T, rp), "Rupiah 2026"], ["Luas dasar", rentang(K.ha, v => rb(v)), `ha sejak ${tgl(D.musim.mulai)}`],
        ["Biaya per ha", `US$${fmt(K.usd_ha[1])}`, `rendah US$${fmt(K.usd_ha[0])} · tinggi US$${fmt(K.usd_ha[2])}`], ["Terbesar", esc(SEKTOR[sk[0][0]] || sk[0][0]), Math.round(sk[0][1][1] / T[1] * 100) + "% dari total"]])
      + svg + `<details class="lipat" style="margin-top:12px"><summary>Sumber dan asumsi</summary><div class="isi">${tabel(["Sumber", "Dipakai untuk"], SUMBER.map(([n, u, f]) => `<tr><td class="dk-wrap">${u ? tautan(u, n) : esc(n)}</td><td class="dk-wrap">${esc(f)}</td></tr>`))}</div></details>`,
      `Cara hitung: luas musim (bagian 6) × biaya per ha × porsi tiap sektor dari tabel World Bank 2015. Tengah = US$16.124 juta ÷ 2,425 juta ha = US$${fmt(K.usd_ha[1])}/ha (dolar 2015). Rendah = US$5,2 miliar 2019 ÷ luas resmi 2019 setahun = US$${fmt(K.usd_ha[0])}/ha; tinggi = US$5,2 miliar ÷ 620.201 ha (Jan–Sep 2019) = US$${fmt(K.usd_ha[2])}/ha; keduanya dolar 2019, dan memakai luas rendah/tinggi bagian 6. ${K.rp_per_usd ? `Ke Rupiah 2026: kerugian terjadi di ekonomi Indonesia, jadi dolar dikembalikan ke Rupiah dengan kurs yang dipakai World Bank lalu dinaikkan dengan inflasi Indonesia (BPS): US$1 2015 = Rp${fmt(K.rp_per_usd["2015"])}, US$1 2019 = Rp${fmt(K.rp_per_usd["2019"])} (Rupiah 2026).` : `Ke Rupiah 2026: dolar × inflasi AS (CPI 2026 ≈ ${K.cpi["2026"]}) × kurs asumsi Rp${fmt(K.kurs)}/US$.`} Karbon dinilai World Bank hanya US$5/ton; dengan harga karbon sosial internasional nilainya jauh lebih besar. Tidak termasuk: dampak kesehatan jangka panjang, kematian, kerugian negara tetangga, dan hilangnya jasa ekosistem lain. Ini perkiraan orde besaran untuk perencanaan, bukan penilaian kerugian resmi (yang disusun BNPB/Bappenas dengan metode PDNA).`);
  }
  function popSek10(k) { const v = D.kerugian.sektor[k];
    dlg(esc(SEKTOR[k] || k), "Kerusakan & kerugian sektor ini, Rupiah 2026", tabel(["Skenario", ">Nilai"], ["Rendah", "Tengah", "Tinggi"].map((n, i) => `<tr><td>${n}</td><td class="n">${rp(v[i])}</td></tr>`))
      + `<p class="fnd">Porsi sektor ${satu(D.asumsi.wb2015[k] / 16124 * 100)}% dari total 2015 (US$${fmt(D.asumsi.wb2015[k])} juta dari US$16.124 juta; World Bank 2016).</p>`); }

  /* ---------- aksi klik ---------- */
  function aksi(s) { const [t, a] = s.split("|");
    ({prov: () => popProv(a), kota: () => popKota(a), kej: () => popKej(+a), bandara: () => popBandara(a), harif: () => popHariF(a), ispa: () => popIspa(+a),
      sek: () => popSek(+a), sekb: () => popBerita(D.sekolah_berita, +a, "Berita penutupan sekolah"), dekat: () => popDekat(a), desa: () => popDesa(+a),
      musim: () => popMusim(a), kat: () => popKat(a), lind: () => popLind(+a), emisi: () => popEmisi(), eko: () => popEko(a), pt: () => popPT(+a),
      intl: () => popIntlHari(a), intlb: () => popBerita(D.internasional.contoh, +a, "Berita internasional"), sek10: () => popSek10(a)}[t] || (() => {}))(); }
  const BAG = [b1, b2, b3, b4, b5, b6, b7, b8, b9, b10];
  const gambar = n => { try { return BAG[n - 1](); } catch (e) { console.warn("dampak", n, e); return `<section class="dk-bag" id="dk-${n}" data-bag="${n}"><div class="ex"><h3>${JUDUL[n - 1]}</h3><p class="fnd">Bagian ini gagal digambar: ${esc(e.message)}</p></div></section>`; } };
  const BAG_ST = {hari: [1, 3], rentF: [2], semuaF: [2], semuaS: [4], semuaD: [5]};
  function ikat(el) {
    if (el._dk) return; el._dk = 1;
    el.addEventListener("click", e => {
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
    const T = D.kerugian.total, ts = PRIO.reduce((a, k) => a + jiwaProv(k, 0).slice(2).reduce((x, y) => x + y, 0), 0);
    const fl = F ? Math.max(F.kejadian.filter(e => e.bandara).reduce((a, e) => a + e.terdampak, 0), ...F.kejadian.filter(e => !e.bandara && e.jumlah).map(e => e.jumlah), 0) : null;
    el.innerHTML = `<div class="head"><div><h2>Dampak kebakaran</h2><p>Apa yang sudah dan sedang ditanggung warga, ekonomi, dan lingkungan sejak ${tgl(D.mulai_musim)}. Semua angka perkiraan dengan rentang; cara hitung ada di bawah tiap grafik. Diperbarui ${jamWIB(D.dibuat)}.</p></div></div>
      ${kpi([["Kerugian sejak " + tgl(D.mulai_musim), rp(T[1]), `rentang ${rp(T[0])}–${rp(T[2])}`], ["Luas terbakar", "± " + rb(D.musim.ha[1]) + " ha", "perkiraan satelit"],
        ["Udara tidak sehat hari ini", jt(ts), "jiwa di 9 provinsi prioritas"], ["Penerbangan terdampak", fl == null ? "–" : fmt(fl), "minimal, dari berita"]])}
      <nav class="dk-nav" aria-label="Bagian dampak">${JUDUL.map((j, i) => `<button data-ke="${i + 1}">${i + 1}. ${j}</button>`).join("")}</nav>
      <div id="dkIsi"></div>`;
    const isi = $("#dkIsi"); isi.innerHTML = gambar(1) + gambar(2);
    nanti(() => { isi.insertAdjacentHTML("beforeend", [3, 4, 5, 6, 7, 8, 9, 10].map(gambar).join("")); }); /* INP: dua bagian pertama dulu */
  }
  return {render, aksi};
})();
