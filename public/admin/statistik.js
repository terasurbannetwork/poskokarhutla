/* Dasbor statistik admin. Data dari GET /api/statistik (dijaga cookie sesi). Tanpa pustaka luar: grafik & peta = SVG.
   CSP halaman admin melarang style inline, jadi lebar/warna batang diisi lewat CSSOM (data-w / data-c) setelah render. */
(() => {
  const $ = s => document.querySelector(s), app = $("#app");
  const W = ["#c9503a", "#e58a45", "#e3b94e", "#5a9e74", "#4f8fc4", "#5f6fb0", "#2b8c86", "#7a2b2b"];
  const fmt = n => Math.round(n || 0).toLocaleString("id-ID"), f1 = n => (Math.round((n || 0) * 10) / 10).toLocaleString("id-ID");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const WIB = 7 * 36e5, hariIni = () => new Date(Date.now() + WIB).toISOString().slice(0, 10);
  const geser = (t, n) => new Date(Date.parse(t) + n * 864e5).toISOString().slice(0, 10);
  const jam = s => `${String(Math.floor(s / 6)).padStart(2, "0")}:${String(s % 6 * 10).padStart(2, "0")}`;
  const TAB = {ringkasan: "Dashboard", peta: "Peta", insight: "Insight", berita: "Berita", tren: "Tren", kompleks: "Kompleks", posko: "Posko", dampak: "Dampak",
    metode: "Metode", sim: "Simulasi", simulasi: "Simulasi", informasi: "Lapor Warga", prakiraan: "Prakiraan", daftar: "Wilayah siaga", provinsi: "Provinsi", rob: "Rob",
    sungai: "Sungai", keputusan: "Keputusan", sarana: "Sarana"};
  const HALN = {karhutla: "Karhutla", banjir: "Banjir", warga: "Lapor Warga", tentang: "Tentang", privasi: "Privasi", statistik: "Statistik publik"};
  let st = {rentang: 1, sampai: hariIni(), hal: ""}, data = null, meta = null, geo = null, kluster = null;
  try { Object.assign(st, JSON.parse(sessionStorage.getItem("ad-stat") || "{}")); } catch (e) {}
  const ambil = async u => { const r = await fetch(u, {credentials: "same-origin"}); if (r.status === 401) { location.href = "/admin/masuk"; throw new Error("sesi habis"); } if (!r.ok) throw new Error((await r.json().catch(() => ({}))).galat || r.status); return r.json(); };
  const statik = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);

  /* ---------- komponen ---------- */
  const lukis = el => el.querySelectorAll("[data-w],[data-c],[data-x]").forEach(x => { if (x.dataset.w) x.style.width = x.dataset.w + "%"; if (x.dataset.c) x.style.background = x.dataset.c; if (x.dataset.x) x.style.left = x.dataset.x + "%"; });
  /* hover grafik: titik terdekat dari kursor -> garis bantu + titik + tooltip. Titik per svg disimpan di HOV[id] saat render. */
  const HOV = {};
  function pasangHover(svg) {
    const titik = HOV[svg.dataset.hov], g = svg.querySelector(".ad-hov"), tip = svg.parentElement.querySelector(".ad-tip"); if (!titik || !g || !tip) return;
    const [l, c] = [g.querySelector("line"), g.querySelector("circle")], ada = titik.filter(Boolean);
    const gerak = e => {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      let t = ada[0]; for (const q of ada) if (Math.abs(q.x - p.x) < Math.abs(t.x - p.x)) t = q;
      if (!t) return;
      l.setAttribute("x1", t.x); l.setAttribute("x2", t.x); c.setAttribute("cx", t.x); c.setAttribute("cy", t.y); g.removeAttribute("hidden");
      const kotak = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, x = (t.x - vb.x) / vb.width * kotak.width, y = (t.y - vb.y) / vb.height * kotak.height;
      tip.innerHTML = t.t; tip.hidden = false;
      tip.style.left = Math.min(kotak.width - tip.offsetWidth / 2 - 4, Math.max(tip.offsetWidth / 2 + 4, x)) + "px"; tip.style.top = y + "px";
    };
    svg.addEventListener("pointermove", gerak); svg.addEventListener("pointerdown", gerak);
    svg.addEventListener("pointerleave", () => { g.setAttribute("hidden", ""); tip.hidden = true; });
  }
  const baris = d => data.dim[d] || [];
  /* belum ada data: kerangka batang abu tetap digambar supaya bentuk visualnya terlihat */
  const HANTU = `<div class="ad-hantu"><ol class="ad-rank" aria-hidden="true">${[92, 64, 41, 23].map(w => `<li><span class="k"><i></i></span><span class="n"><i></i></span><span class="bar"><i data-w="${w}"></i></span></li>`).join("")}</ol><span>Belum ada data</span></div>`;
  function daftar(judul, dim, o = {}) {
    let r = baris(dim).map(([k, n, s]) => ({k, n, s, v: o.rata ? s / n : n}));
    if (o.saring) r = r.filter(o.saring);
    r.sort((a, b) => b.v - a.v); r = r.slice(0, o.maks || 8);
    const m = Math.max(...r.map(x => x.v), 1), warna = o.warna || W[4], total = baris(dim).reduce((s, x) => s + x[1], 0);
    return `<section class="ad-kartu"><h3>${judul}</h3>${r.length ? `<ol class="ad-rank">${r.map(x => `<li><span class="k" title="${esc(x.k)}">${esc(o.label ? o.label(x.k) : x.k)}</span>
      <span class="n">${o.rata ? f1(x.v) + (o.satuan || "") : fmt(x.n)}${!o.rata && total ? `<small>${Math.round(x.n / total * 100)}%</small>` : o.rata ? `<small>${fmt(x.n)}×</small>` : ""}</span>
      <span class="bar"><i data-w="${(x.v / m * 100).toFixed(1)}" data-c="${warna}"></i></span></li>`).join("")}</ol>` : HANTU}</section>`;
  }
  const namaProv = k => meta?.provinsi?.[k] || k, namaTab = k => TAB[k] || k;
  const namaKota = k => k.split("|").slice(0, 3).filter(Boolean).join(", ");
  const namaWil = k => { const p = k.split("|"); return [p.at(-1), namaProv(p[0])].join(", "); };

  function grafikSlot() {
    const S = data.slot, n = new Array(144).fill(null), kini = st.sampai === hariIni() ? Math.floor(((Date.now() + WIB) % 864e5) / 6e5) : 143;
    S.forEach(([s, v]) => n[s] = v); for (let i = 0; i <= kini; i++) n[i] ??= 0;
    const w = 720, h = 200, kiri = 34, bawah = 22, maks = Math.max(4, ...n.filter(x => x != null)), y = v => h - bawah - v / maks * (h - bawah - 10), x = s => kiri + s / 144 * (w - kiri - 6);
    const tik = Math.max(1, Math.ceil(maks / 4)), yt = []; for (let v = 0; v <= maks; v += tik) yt.push(v);
    const pts = n.map((v, i) => v == null ? null : [x(i + .5), y(v)]).filter(Boolean);
    const puncak = n.reduce((b, v, i) => v != null && v > (n[b] ?? -1) ? i : b, 0);
    const pita = []; for (const s of data.gangguan) { const a = Math.floor(s / 6) * 6; if (!pita.includes(a)) pita.push(a); }
    HOV.slot = n.map((v, i) => v == null ? null : {x: x(i + .5), y: y(v), t: `<span>${jam(i)}–${jam(i + 1)} WIB</span><b>${fmt(v)} orang</b>${data.gangguan.includes(i) ? "<small>data terlambat</small>" : ""}`});
    return `<div class="ad-plot"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Orang di peta per 10 menit" data-hov="slot">
      ${pita.map(a => `<rect x="${x(a)}" y="6" width="${x(a + 6) - x(a)}" height="${h - bawah - 6}" fill="#c9503a" opacity=".13"/>`).join("")}
      ${yt.map(v => `<line class="grid" x1="${kiri}" x2="${w - 6}" y1="${y(v)}" y2="${y(v)}"/><text x="${kiri - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      ${[0, 3, 6, 9, 12, 15, 18, 21, 24].map(j => `<text x="${x(j * 6)}" y="${h - 5}" text-anchor="middle">${String(j).padStart(2, "0")}</text>`).join("")}
      ${pts.length ? `<path d="M${pts[0][0]},${y(0)} L${pts.map(p => p.join(",")).join(" L")} L${pts.at(-1)[0]},${y(0)}Z" fill="#4f8fc4" opacity=".16"/>
      <polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#4f8fc4" stroke-width="2" stroke-linejoin="round"/>` : ""}
      ${n[puncak] ? `<circle cx="${x(puncak + .5)}" cy="${y(n[puncak])}" r="4.5" fill="#c9503a" stroke="#fff" stroke-width="1.5"/>
        <text x="${Math.min(w - 60, x(puncak + .5) + 8)}" y="${Math.max(14, y(n[puncak]) - 8)}" class="kuat">puncak ${n[puncak]} · ${jam(puncak)}</text>` : ""}
      <g class="ad-hov" hidden><line y1="6" y2="${h - bawah}"/><circle r="4.5"/></g>
      <rect class="ad-tangkap" x="${kiri}" y="0" width="${w - kiri}" height="${h - bawah}"/>
    </svg><div class="ad-tip" hidden></div></div>`;
  }
  function grafikHari() {
    const H = data.harian, w = 720, h = 170, kiri = 34, bawah = 22, maks = Math.max(4, ...H.map(r => r.orang)), y = v => h - bawah - v / maks * (h - bawah - 10);
    const lebar = (w - kiri - 6) / Math.max(1, data.hari), hari = []; for (let i = 0; i < data.hari; i++) hari.push(geser(data.dari, i));
    const per = Object.fromEntries(H.map(r => [r.tgl, r]));
    HOV.hari = hari.map((t, i) => { const r = per[t] || {orang: 0, kembali: 0}; return {x: kiri + i * lebar + lebar / 2, y: y(r.orang), t: `<span>${t.slice(8)}/${t.slice(5, 7)}/${t.slice(0, 4)}</span><b>${fmt(r.orang)} orang</b><small>${fmt(r.kembali)} kembali</small>`}; });
    return `<div class="ad-plot"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Orang per hari" data-hov="hari">
      ${[0, maks / 2, maks].map(v => `<line class="grid" x1="${kiri}" x2="${w - 6}" y1="${y(v)}" y2="${y(v)}"/><text x="${kiri - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("")}
      ${hari.map((t, i) => { const r = per[t] || {orang: 0, kembali: 0}; const x0 = kiri + i * lebar + lebar * .12, bw = lebar * .76;
        return `<rect x="${x0}" y="${y(r.orang)}" width="${bw}" height="${y(0) - y(r.orang)}" rx="2" fill="#4f8fc4"/>
          <rect x="${x0}" y="${y(r.kembali)}" width="${bw}" height="${y(0) - y(r.kembali)}" rx="2" fill="#0b2545" opacity=".55"/>
          ${data.hari <= 14 || i % Math.ceil(data.hari / 10) === 0 ? `<text x="${x0 + bw / 2}" y="${h - 5}" text-anchor="middle">${t.slice(8)}/${t.slice(5, 7)}</text>` : ""}`; }).join("")}
      <g class="ad-hov" hidden><line y1="6" y2="${h - bawah}"/><circle r="4.5"/></g>
      <rect class="ad-tangkap" x="${kiri}" y="0" width="${w - kiri}" height="${h - bawah}"/>
    </svg><div class="ad-tip" hidden></div></div>`;
  }

  /* ---------- peta SVG (ekuirektangular, kotak Indonesia) ---------- */
  const PX = 12, BX = [94, 141.5], BY = [-11.5, 6.5], px = lo => (lo - BX[0]) * PX, py = la => (BY[1] - la) * PX;
  const VB = `0 0 ${(BX[1] - BX[0]) * PX} ${(BY[1] - BY[0]) * PX}`;
  let dasarPeta = "";
  function dasar() {
    if (dasarPeta || !geo) return dasarPeta;
    const cincin = r => "M" + r.filter((_, i) => i % 3 === 0 || i === r.length - 1).map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join("L") + "Z";
    return dasarPeta = geo.features.map(f => `<path class="prov" d="${(f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).map(p => p.map(cincin).join("")).join("")}"/>`).join("");
  }
  const dalam = (la, lo) => la >= BY[0] && la <= BY[1] && lo >= BX[0] && lo <= BX[1];
  const gelembung = (titik, warna) => { const m = Math.max(1, ...titik.map(t => t.n));
    return titik.sort((a, b) => b.n - a.n).map(t => `<circle cx="${px(t.lo).toFixed(1)}" cy="${py(t.la).toFixed(1)}" r="${(2.5 + Math.sqrt(t.n / m) * 13).toFixed(1)}" fill="${warna}" fill-opacity=".5" stroke="${warna}" stroke-width="1"><title>${esc(t.j)}: ${fmt(t.n)}</title></circle>`).join(""); };
  function petaPengunjung() {
    const t = baris("cf_kota").map(([k, n]) => { const p = k.split("|"); return {j: namaKota(k), la: p[3] ? +p[3] : NaN, lo: p[4] ? +p[4] : NaN, n}; }).filter(t => Number.isFinite(t.la) && Number.isFinite(t.lo) && dalam(t.la, t.lo));
    return `<div class="ad-peta-w"><svg viewBox="${VB}" role="img" aria-label="Peta wilayah pengunjung">${dasar()}${gelembung(t, "#5f6fb0")}</svg>${t.length ? "" : '<span class="ad-peta-kosong">Belum ada data</span>'}</div>`;
  }
  function petaDibuka() {
    const sel = baris("sel_peta").map(([k, n]) => { const [la, lo] = k.split(",").map(Number); return {la, lo, n}; }).filter(t => dalam(t.la, t.lo)), ms = Math.max(1, ...sel.map(t => t.n));
    const kotak = sel.map(t => `<rect x="${px(t.lo)}" y="${py(t.la + .5)}" width="${PX / 2}" height="${PX / 2}" fill="#e3b94e" opacity="${(.25 + .6 * t.n / ms).toFixed(2)}"><title>Tampilan peta ${t.la},${t.lo}: ${fmt(t.n)}</title></rect>`).join("");
    const pusat = {}; if (geo) for (const f of geo.features) { const c = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat(2); let a = [999, 999, -999, -999];
      for (const [lo, la] of c) a = [Math.min(a[0], lo), Math.min(a[1], la), Math.max(a[2], lo), Math.max(a[3], la)]; pusat[f.properties.kode] = [(a[1] + a[3]) / 2, (a[0] + a[2]) / 2]; }
    const prov = baris("provinsi").filter(([k]) => pusat[k]).map(([k, n]) => ({j: namaProv(k), la: pusat[k][0], lo: pusat[k][1], n}));
    const kk = kluster ? baris("kompleks").filter(([k]) => kluster[k]).map(([k, n]) => ({j: k + " · " + kluster[k][2], la: kluster[k][0], lo: kluster[k][1], n})) : [];
    return `<div class="ad-peta-w"><svg viewBox="${VB}" role="img" aria-label="Peta kompleks dan provinsi paling dibuka">${dasar()}${kotak}${gelembung(prov, "#5a9e74")}${gelembung(kk, "#c9503a")}</svg>${sel.length + prov.length + kk.length ? "" : '<span class="ad-peta-kosong">Belum ada data</span>'}</div>`;
  }

  /* ---------- halaman ---------- */
  function render() {
    const d = data, R = d.ringkas, hariIniSaja = d.dari === d.sampai && d.sampai === hariIni();
    const per = (a, b) => b ? f1(a / b) : "–";
    const vit = baris("vital").map(([k, n, s]) => [k, n, s]), ratav = k => { const r = vit.find(x => x[0] === k); return r ? r[2] / r[1] : null; };
    app.innerHTML = `
    <div class="ad-kontrol" role="toolbar" aria-label="Rentang dan halaman">
      <div class="ad-seg" role="group" aria-label="Rentang">${[[1, "Hari ini"], [7, "7 hari"], [30, "30 hari"], [90, "90 hari"]].map(([n, l]) => `<button data-r="${n}" aria-pressed="${st.rentang === n && st.sampai === hariIni()}">${l}</button>`).join("")}</div>
      <span class="ad-pisah" aria-hidden="true"></span>
      <label class="kecil ad-redup">Tanggal <input type="date" id="tgl" value="${st.sampai}" max="${hariIni()}" min="${geser(hariIni(), -89)}"></label>
      <select id="hal" aria-label="Halaman"><option value="">Semua halaman</option>${Object.entries(HALN).map(([k, n]) => `<option value="${k}" ${st.hal === k ? "selected" : ""}>${n}</option>`).join("")}</select>
    </div>
    ${d.email_siap ? "" : `<div class="ad-spanduk" role="status"><b>Notifikasi email belum dikonfigurasi.</b> Pesan baru tetap tersimpan di <a href="/admin/pesan">Kotak pesan</a>; set EMAIL_API_KEY, EMAIL_FROM, EMAIL_TO untuk menerima email.</div>`}
    <div class="ad-hero">
      <section class="ad-kartu"><span class="ad-ey">${esc(d.jendela)}</span>
        <div class="ad-besar" title="Satu orang = satu peramban per hari yang menyetujui analitik (tanpa cookie). Do Not Track / GPC dan yang menolak tidak dihitung.">${d.sampel ? "≈ " : ""}${fmt(R.orang)}</div>
        <div class="ad-besar-l">${hariIniSaja ? "orang membuka peta hari ini" : d.hari > 1 ? `orang membuka peta (jumlah harian, ${d.hari} hari)` : "orang membuka peta pada hari itu"}</div>
        ${d.sampel ? `<p class="ad-catat"><b>Perkiraan (sampel):</b> lalu lintas melewati batas pencatatan gratis, sebagian kiriman dicatat lalu dikalikan.</p>` : ""}</section>
      <section class="ad-kartu ad-langsung" aria-live="polite" id="langsung"></section>
    </div>
    <div class="ad-kpi">
      ${[["Kunjungan", fmt(R.kunjungan), "kunjungan baru setelah 30 menit pergi", W[4]], ["Kembali", R.orang ? Math.round(R.kembali / R.orang * 100) + "%" : "–", `${fmt(R.kembali)} orang pernah datang sebelumnya`, W[3]],
        ["Tampilan halaman", per(R.tampilan, R.orang), `per orang · ${fmt(R.tampilan)} total`, W[5]], ["Interaksi", per(R.klik, R.orang), `klik per orang · ${fmt(R.klik)} total`, W[1]],
        ["Waktu aktif", R.orang ? f1(R.detik / R.orang / 60) + " mnt" : "–", "rata-rata per orang, saat halaman terlihat", W[6]]]
        .map(([j, v, s, c]) => `<section class="ad-kartu"><div class="ad-garis" data-c="${c}"></div><span class="ad-ey">${j}</span><b>${v}</b><small>${s}</small></section>`).join("")}
    </div>
    <section class="ad-kartu ad-grafik"><header><h2>Orang di peta</h2><span class="ad-redup kecil">per 10 menit · ${d.sampai} · jam WIB</span></header>${grafikSlot()}
      <div class="ad-leg"><span><i data-c="#4f8fc4"></i>orang aktif</span><span><i data-c="#c9503a"></i>puncak</span><span><i data-c="rgba(201,80,58,.25)"></i>data/pembaruan terlambat (cek tiap jam)</span></div></section>
    ${d.hari > 1 ? `<section class="ad-kartu ad-grafik"><header><h2>Orang per hari</h2><span class="ad-redup kecil">${d.dari} s.d. ${d.sampai}</span></header>${grafikHari()}
      <div class="ad-leg"><span><i data-c="#4f8fc4"></i>orang</span><span><i data-c="rgba(11,37,69,.55)"></i>pengunjung kembali</span></div></section>` : ""}

    <section class="ad-wadah"><h2 class="ad-seksi">Paling dibuka</h2>
    <div class="ad-grid">
      ${daftar("Tab", "tab", {label: namaTab, warna: W[4]})}
      ${daftar("Provinsi", "provinsi", {label: namaProv, warna: W[3]})}
      ${daftar("Kompleks api", "kompleks", {warna: W[0], label: k => kluster?.[k] ? `${k} · ${kluster[k][2]}` : k})}
      ${daftar("Kabupaten / kecamatan", "wilayah", {label: namaWil, warna: W[3]})}
      ${daftar("Eksibit yang dilihat", "ex_lihat", {warna: W[5], label: k => k.replace(/^(\w+):/, (_, t) => namaTab(t) + " ·")})}
      ${daftar("Simulasi dijalankan", "sim", {warna: W[1]})}
      ${daftar("Unduhan (brief, PDF, CSV, XLSX, PPTX)", "unduh", {warna: W[6]})}
      ${daftar("Bagikan / ekspor", "bagikan", {warna: W[6]})}
      ${daftar("Laporan warga dikirim", "laporan_kirim", {warna: W[7]})}
      ${daftar("Pencarian wilayah", "cari", {warna: W[5]})}
      ${daftar("Lapisan peta dinyalakan", "lapisan", {warna: W[2]})}
      ${daftar("Kontrol grafik & filter", "kontrol", {warna: W[5], label: k => k.replace(/^(\w+):/, (_, t) => namaTab(t) + " · ")})}
      ${daftar("Slider Operasi", "operasi", {warna: W[1]})}
      ${daftar("Kirim pesan dibuka", "pesan_buka", {label: k => "dari " + namaTab(k)})}
      ${daftar("Kirim pesan terkirim", "pesan_kirim")}
      ${daftar("Persetujuan analitik diterima", "persetujuan", {warna: W[3]})}
    </div>

    </section>
    <section class="ad-wadah"><h2 class="ad-seksi">Di mana pengunjung</h2>
    <div class="ad-peta">
      <section class="ad-kartu"><h3>Wilayah pengunjung</h3>${petaPengunjung()}<p class="ad-catat">Kota kasar dari jaringan Cloudflare (bukan GPS, bukan IP).</p></section>
      <section class="ad-kartu"><h3>Yang paling dibuka di peta</h3><div id="petaDibuka">${petaDibuka()}</div>
        <div class="ad-leg"><span><i data-c="#c9503a"></i>kompleks</span><span><i data-c="#5a9e74"></i>provinsi</span><span><i data-c="#e3b94e"></i>pusat tampilan peta (sel 0,5°)</span></div></section>
    </div>
    <div class="ad-grid">
      ${daftar("Negara", "cf_negara", {warna: W[5]})}${daftar("Provinsi / region", "cf_wilayah", {warna: W[5]})}${daftar("Kota", "cf_kota", {label: namaKota, warna: W[5]})}
      ${daftar("Jaringan (organisasi)", "cf_jaringan", {warna: W[6]})}${daftar("ASN", "cf_asn", {warna: W[6]})}${daftar("Zona waktu", "cf_zona", {warna: W[6]})}${daftar("Pusat data Cloudflare", "cf_colo", {warna: W[6]})}
    </div>

    </section>
    <section class="ad-wadah"><h2 class="ad-seksi">Datang dari mana & pakai apa</h2>
    <div class="ad-grid">
      ${daftar("Rujukan", "rujukan", {warna: W[4]})}${daftar("UTM sumber", "utm_sumber")}${daftar("UTM medium", "utm_medium")}${daftar("UTM kampanye", "utm_kampanye")}
      ${daftar("Tautan langsung", "tautan_dalam", {warna: W[1]})}${daftar("Perangkat", "perangkat", {warna: W[3]})}${daftar("Peramban", "browser", {warna: W[3]})}${daftar("Sistem operasi", "os", {warna: W[3]})}
      ${daftar("Lebar layar", "layar", {warna: W[2]})}${daftar("Lebar jendela", "viewport", {warna: W[2]})}${daftar("Bahasa", "bahasa", {warna: W[2]})}${daftar("Koneksi", "koneksi", {warna: W[2]})}
      ${daftar("Tema", "skema", {warna: W[5]})}${daftar("Dipasang sebagai aplikasi", "pwa", {warna: W[5]})}
    </div>

    </section>
    <section class="ad-wadah"><h2 class="ad-seksi">Perilaku</h2>
    <div class="ad-grid">
      ${daftar("Tab pertama", "masuk_tab", {label: namaTab})}${daftar("Tab terakhir", "keluar_tab", {label: namaTab})}
      ${daftar("Waktu per tab (rata-rata)", "tab_detik", {label: namaTab, rata: 1, satuan: " dtk", warna: W[6]})}${daftar("Kedalaman gulir per tab", "gulir", {label: namaTab, rata: 1, satuan: "%", warna: W[6]})}
      ${daftar("Lama sesi", "durasi_sesi", {warna: W[4], maks: 7})}${daftar("Pantul (pergi tanpa interaksi)", "pantul", {label: namaTab, warna: W[0]})}
      ${daftar("Tingkat zoom peta", "zoom", {warna: W[2], maks: 12})}${daftar("Ganti tema · layar besar", "tema")}${daftar("Laporan warga dibuka", "laporan_lihat")}${daftar("Bahasa berita", "berita_bahasa")}
    </div>

    </section>
    <section class="ad-wadah"><h2 class="ad-seksi">Kualitas</h2>
    <div class="ad-kpi">${[["TTFB", "ttfb", "ms", 800, 1800], ["FCP", "fcp", "ms", 1800, 3000], ["LCP", "lcp", "ms", 2500, 4000], ["CLS", "cls", "", 100, 250], ["INP", "inp", "ms", 200, 500]].map(([j, k, u, baik, buruk]) => { const v = ratav(k);
      const kelas = v == null ? "" : v <= baik ? "baik" : v <= buruk ? "perlu" : "buruk", ujung = buruk * 1.5;   // skala Web Vitals Google; CLS disimpan ×1000
      return `<section class="ad-kartu ad-vital ${kelas}"><span class="ad-ey">${j} rata-rata</span><b>${v == null ? "–" : k === "cls" ? (v / 1000).toFixed(3) : fmt(v) + " " + u}</b>
        <span class="ad-skala" aria-hidden="true"><i data-w="${(baik / ujung * 100).toFixed(1)}"></i><i data-w="${((buruk - baik) / ujung * 100).toFixed(1)}"></i><i></i>${v == null ? "" : `<em data-x="${Math.min(100, v / ujung * 100).toFixed(1)}"></em>`}</span>
        <small>${v == null ? "belum ada sampel" : `${{baik: "baik", perlu: "perlu perbaikan", buruk: "buruk"}[kelas]} · ${fmt(vit.find(x => x[0] === k)?.[1] || 0)} sampel`}</small></section>`; }).join("")}</div>
    <div class="ad-grid">
      ${daftar("Kelas Web Vitals", "vital_kelas", {maks: 15, warna: W[3]})}${daftar("Galat JavaScript", "galat_js", {warna: W[0]})}${daftar("Berkas gagal dimuat", "gagal_muat", {warna: W[0]})}${daftar("Umur data yang dilihat", "umur_data", {warna: W[2]})}
    </div>
    </section>
    <p class="ad-catat">Disimpan 90 hari. Tiap dimensi menyimpan paling banyak 100 nilai per hari; sisanya masuk "lainnya". Rincian: <a href="/privasi.html#statistik">privasi</a>.</p>`;
    lukis(app); langsung(d.langsung);
    app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { st.rentang = +b.dataset.r; st.sampai = hariIni(); muat(); });
    $("#tgl").onchange = e => { if (e.target.value) { st.sampai = e.target.value; st.rentang = 1; muat(); } };
    $("#hal").onchange = e => { st.hal = e.target.value; muat(); };
    app.querySelectorAll("svg[data-hov]").forEach(pasangHover);
    const b = $("#badgePesan"); if (b) { b.hidden = !d.pesan_baru; b.textContent = d.pesan_baru; }
  }
  function langsung(L) {
    const el = $("#langsung"); if (!el || !L) return;
    el.innerHTML = `<span class="ad-ey">Saat ini (perkiraan)</span><div title="Dari kiriman 5 menit terakhir; peramban mengirim saat halaman ditutup/disembunyikan, jadi angka ini tertinggal."><span class="ad-titik"></span><b>${fmt(L.sekarang)}</b> peta terbuka saat ini</div>
      <div class="ad-redup">${fmt(L.n30)} dalam 30 menit terakhir</div>
      <div class="ad-hal">${Object.entries(L.per_hal || {}).map(([k, v]) => `<span>${HALN[k] || k}: ${v.sekarang} · ${v.n30}</span>`).join("") || "<span>belum ada yang aktif</span>"}</div>
      <p class="ad-catat">Diperbarui tiap 15 detik · ${new Date(L.kini + WIB).toISOString().slice(11, 19)} WIB</p>`;
  }
  async function muat() {
    try { sessionStorage.setItem("ad-stat", JSON.stringify(st)); } catch (e) {}
    const dari = geser(st.sampai, -(st.rentang - 1));
    try {
      [data] = await Promise.all([ambil(`/api/statistik?dari=${dari}&sampai=${st.sampai}${st.hal ? "&hal=" + st.hal : ""}`), meta ? 0 : statik("/data/meta.json").then(m => meta = m), geo ? 0 : statik("/geo/provinsi.json").then(g => { geo = g; dasarPeta = ""; })]);
      render();
      if (!kluster && baris("kompleks").length) statik("/data/kluster_awal.json").then(k => { if (!k) return; kluster = {}; for (const f of k.features) { const p = f.properties; kluster[p.id] = [p.lat, p.lon, p.kec]; } render(); });
    } catch (e) { app.innerHTML = `<p class="ad-galat">Statistik gagal dimuat: ${esc(e.message)}</p>`; }
  }
  setInterval(() => { if (document.visibilityState === "visible") ambil("/api/statistik?kini=1" + (st.hal ? "&hal=" + st.hal : "")).then(langsung).catch(() => {}); }, 15e3);
  muat();
})();
