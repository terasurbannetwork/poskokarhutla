/* Halaman publik /statistik: manusia dan AI dihitung terpisah. Data dari /api/publik (di-cache 60 detik).
   CSP melarang style inline: lebar/warna batang diisi lewat CSSOM (data-w / data-c). */
(() => {
  const $ = s => document.querySelector(s), app = $("#app");
  const fmt = n => Math.round(n || 0).toLocaleString("id-ID"), pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const WARNA = {manusia: "#4f8fc4", ai_jawab: "#c9503a", ai_crawl: "#e58a45", mesin_cari: "#5a9e74"};
  const NAMA = {manusia: "Manusia", ai_jawab: "Jawaban AI", ai_crawl: "Pencarian & pelatihan AI", mesin_cari: "Mesin pencari"};
  const RENT = [["24j", "24 jam"], ["7h", "7 hari"], ["30h", "30 hari"], ["semua", "Sepanjang waktu"]];
  const TAB = {"/": "Beranda karhutla", "/banjir/": "Beranda banjir", "/statistik": "Statistik", "/peta": "Peta", "/insight": "Insight", "/berita": "Berita", "/tren": "Tren",
    "/kompleks": "Cluster", "/posko": "Posko", "/dampak": "Dampak", "/metode": "Metode", "/sim": "Simulasi", "/informasi": "Lapor Warga", "/ringkasan": "Ringkasan"};
  const tglID = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"});
  let r = "7h", d = null;
  try { r = sessionStorage.getItem("pb-r") || r; } catch (e) {}
  const lukis = el => el.querySelectorAll("[data-w],[data-c]").forEach(x => { if (x.dataset.w) x.style.width = x.dataset.w + "%"; if (x.dataset.c) x.style.background = x.dataset.c; });
  const halaman = k => TAB[k] ? `${TAB[k]} <small>${esc(k)}</small>` : esc(k);

  function batang(t) {
    const K = ["manusia", "ai_jawab", "ai_crawl", "mesin_cari"], v = {manusia: t.tampilan, ai_jawab: t.ai_jawab, ai_crawl: t.ai_crawl, mesin_cari: t.mesin_cari}, tot = K.reduce((s, k) => s + (v[k] || 0), 0);
    return {tot, html: `<div class="pb-tumpuk" role="img" aria-label="${K.map(k => `${NAMA[k]} ${pct(v[k], tot)}%`).join(", ")}">${K.map(k => `<i data-w="${tot ? (v[k] || 0) / tot * 100 : 0}" data-c="${WARNA[k]}"></i>`).join("")}</div>
      <div class="ad-leg pb-leg">${K.map(k => `<span><i data-c="${WARNA[k]}"></i>${NAMA[k]} <b>${fmt(v[k])}</b> · ${pct(v[k], tot)}%</span>`).join("")}</div>`};
  }
  function daftar(judul, baris, o = {}) {
    const m = Math.max(1, ...baris.map(x => x[1]));
    return `<section class="ad-kartu"><h3 class="ad-ey">${judul}</h3>${baris.length ? `<ol class="pb-rank">${baris.slice(0, o.maks || 10).map(([k, n]) => `<li><i data-w="${(n / m * 100).toFixed(1)}" data-c="${o.warna || "rgba(79,143,196,.16)"}"></i>
      <span class="k">${o.label ? o.label(k) : esc(k)}</span><b>${fmt(n)}</b></li>`).join("")}</ol>` : `<p class="ad-kosong">Belum ada data.</p>`}</section>`;
  }
  function grafik(nilai, label, warna, judul) {
    const w = 720, h = 170, ki = 40, ba = 22, maks = Math.max(4, ...nilai), y = v => h - ba - v / maks * (h - ba - 12), lb = (w - ki - 6) / Math.max(1, nilai.length);
    const p = nilai.indexOf(Math.max(...nilai)), langkah = Math.ceil(nilai.length / 12);
    return `<section class="ad-kartu ad-grafik"><h3 class="ad-ey">${judul}</h3><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${judul}">
      ${[0, maks / 2, maks].map(v => `<line class="grid" x1="${ki}" x2="${w - 6}" y1="${y(v)}" y2="${y(v)}"/><text x="${ki - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("")}
      ${nilai.map((v, i) => `<rect x="${ki + i * lb + lb * .14}" y="${y(v)}" width="${lb * .72}" height="${y(0) - y(v)}" rx="2" fill="${warna}"><title>${esc(label[i])}: ${fmt(v)}</title></rect>
        ${i % langkah === 0 ? `<text x="${ki + i * lb + lb / 2}" y="${h - 5}" text-anchor="middle">${esc(label[i])}</text>` : ""}`).join("")}
      ${nilai[p] ? `<circle cx="${ki + p * lb + lb / 2}" cy="${y(nilai[p]) - 7}" r="4" fill="#0b2545" stroke="#fff" stroke-width="1.5"/><text class="kuat" x="${Math.min(w - 70, ki + p * lb + lb / 2 + 8)}" y="${Math.max(12, y(nilai[p]) - 10)}">puncak ${fmt(nilai[p])}</text>` : ""}
    </svg></section>`;
  }

  function render() {
    const D = d.dim, t7 = d.tujuh, ts = d.sejak, b7 = batang(t7), bs = batang(ts), rl = RENT.find(x => x[0] === r)[1].toUpperCase();
    const seriL = d.per_jam ? d.per_jam.map(p => p.jam) : d.seri.map(s => s.tgl.slice(8) + "/" + s.tgl.slice(5, 7));
    const seriM = d.per_jam ? d.per_jam.map(p => p.manusia) : d.seri.map(s => s.tampilan), seriA = d.per_jam ? d.per_jam.map(p => p.ai_jawab) : d.seri.map(s => s.ai_jawab);
    const per = r === "24j" ? "PER JAM" : "PER HARI", agen = (D.ai_agen || []).map(([k, n]) => { const [nama, v] = k.split("|"); return [nama, n, v]; });
    const perayap = (D.perayap || []).map(([k, n]) => { const [j, nama, v] = k.split("|"); return {j, nama, v, n}; });
    const kanal = Object.fromEntries(D.kanal || []), dariAI = kanal["Dari jawaban AI"] || 0;
    const sampel = [t7, ts].some(x => x.sampel != null && x.sampel < 1);
    app.innerHTML = `
    <section class="pb-hero"><span class="ad-ey">Statistik pengunjung · Pantau Bencana</span>
      <h1>Manusia dan AI, dihitung terpisah.</h1>
      <p>Halaman ini dibuka oleh orang, oleh asisten AI yang sedang menjawab pertanyaan seseorang (ChatGPT, Claude, Perplexity), dan oleh perayap yang mengindeks atau mengumpulkan halaman untuk mesin pencari dan pelatihan AI. Ketiganya kami hitung terpisah, supaya angka "pembaca" benar-benar orang.${sampel ? " <b>Sebagian angka adalah perkiraan (sampel)</b> karena lalu lintas hari itu melewati batas pencatatan gratis." : ""}</p></section>

    <section class="ad-kartu pb-langsung">
      <div><div class="ad-besar"><span class="ad-titik"></span>${fmt(d.online)}</div><span class="ad-ey">Orang sedang membaca</span>
        <p class="ad-catat">Orang berbeda yang membuka halaman dalam 5 menit terakhir.</p></div>
      <div><span class="ad-ey">Yang sedang mereka buka</span>${d.buka.length ? `<ol class="pb-rank">${d.buka.map(([k, n]) => `<li><i data-w="${n / d.buka[0][1] * 100}" data-c="rgba(90,158,116,.18)"></i><span class="k">${halaman(k)}</span><b>${fmt(n)}</b></li>`).join("")}</ol>` : `<p class="ad-kosong">Belum ada yang membaca saat ini.</p>`}</div>
    </section>

    <h2 class="ad-seksi">Total</h2>
    <section class="ad-kartu pb-total"><div class="pb-angka"><b>${fmt(b7.tot)}</b><span class="ad-ey">halaman dibaca · 7 hari terakhir</span></div>${b7.html}</section>
    <section class="ad-kartu pb-total"><div class="pb-angka"><b>${fmt(bs.tot)}</b><span class="ad-ey">halaman dibaca · sejak ${tglID(d.mulai)}</span></div>${bs.html}</section>

    <div class="pb-dua">
      <section class="ad-kartu"><span class="ad-ey pb-label" data-c="${WARNA.manusia}">Manusia</span><div class="pb-kpi">
        <div><b>${fmt(t7.tampilan)}</b><small>tayangan halaman · 7 hari</small></div><div><b>${fmt(t7.orang)}</b><small>pengunjung · 7 hari (jumlah harian)</small></div>
        <div><b>${fmt(ts.tampilan)}</b><small>tayangan sejak ${tglID(d.mulai)}</small></div></div></section>
      <section class="ad-kartu"><span class="ad-ey pb-label" data-c="${WARNA.ai_jawab}">AI</span><div class="pb-kpi">
        <div><b>${fmt(t7.ai_jawab)}</b><small>jawaban AI · 7 hari: asisten AI membuka halaman untuk menjawab seseorang</small></div>
        <div><b>${fmt(t7.ai_crawl)}</b><small>crawl pencarian AI · 7 hari: halaman yang dibaca ke indeks pencarian & pelatihan AI</small></div>
        <div><b>${fmt(ts.ai_jawab)}</b><small>jawaban AI sejak ${tglID(d.mulai)}</small></div></div></section>
    </div>

    <div class="ad-kontrol pb-rentang" role="radiogroup" aria-label="Rentang waktu">${RENT.map(([k, l]) => `<button class="ad-chip" role="radio" data-r="${k}" aria-checked="${k === r}" aria-pressed="${k === r}">${l}</button>`).join("")}</div>
    <div class="pb-dua">${grafik(seriM, seriL, WARNA.manusia, `Manusia · tayangan halaman ${per.toLowerCase()}`)}${grafik(seriA, seriL, WARNA.ai_jawab, `Jawaban AI ${per.toLowerCase()}`)}</div>

    <h2 class="ad-seksi">Manusia · ${rl === "SEPANJANG WAKTU" ? "90 hari terakhir (rincian)" : rl + " terakhir"}</h2>
    <div class="pb-dua">${daftar("Halaman paling banyak dibaca", D.halaman || [], {label: halaman})}${daftar("Dari mana mereka datang", D.rujukan || [])}</div>
    <div class="pb-tiga">${daftar("Kanal", D.kanal || [], {warna: "rgba(95,111,176,.18)"})}${daftar("Negara", D.negara || [], {warna: "rgba(43,140,134,.18)"})}${daftar("Perangkat", D.perangkat || [], {warna: "rgba(227,185,78,.25)"})}</div>

    <h2 class="ad-seksi">AI · ${rl === "SEPANJANG WAKTU" ? "90 hari terakhir (rincian)" : rl + " terakhir"}</h2>
    <div class="pb-dua">
      <section class="ad-kartu"><h3 class="ad-ey">Asisten AI yang menjawab seseorang dengan halaman ini</h3>${agen.length ? `<ol class="pb-rank">${agen.map(([nama, n, v]) => `<li><i data-w="${n / agen[0][1] * 100}" data-c="rgba(201,80,58,.14)"></i>
        <span class="k">${esc(nama)} <em class="pb-tag">menjawab seseorang</em>${v === "terverifikasi" ? ` <em class="pb-tag ok" title="IP cocok dengan daftar resmi operator">terverifikasi</em>` : ""}</span><b>${fmt(n)}</b></li>`).join("")}</ol>` : `<p class="ad-kosong">Belum ada.</p>`}</section>
      ${daftar("Halaman yang paling sering dibuka asisten AI", D.ai_halaman || [], {label: halaman, warna: "rgba(201,80,58,.14)"})}
    </div>
    <section class="ad-kartu"><h3 class="ad-ey">Perayap: pencarian & pelatihan AI, dan mesin pencari</h3>
      ${perayap.length ? `<div class="pb-tabel"><table><thead><tr><th>Perayap</th><th>Jenis</th><th>Status</th><th class="n">Halaman</th></tr></thead><tbody>
      ${perayap.map(p => `<tr><td>${esc(p.nama)}</td><td>${p.j === "AI" ? "Pencarian & pelatihan AI" : "Mesin pencari"}</td><td>${p.v === "terverifikasi" ? `<em class="pb-tag ok">terverifikasi</em>` : `<em class="pb-tag">belum bisa diverifikasi</em>`}</td><td class="n">${fmt(p.n)}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="ad-kosong">Belum ada.</p>`}</section>

    <section class="ad-kartu"><h3 class="ad-ey">Menurut jenis · 7 hari</h3><div class="pb-kpi pb-kpi4">
      ${["manusia", "ai_jawab", "ai_crawl", "mesin_cari"].map(k => `<div><b>${fmt(k === "manusia" ? t7.tampilan : t7[k])}</b><small>${NAMA[k]}</small></div>`).join("")}
      <div><b>${fmt(dariAI)}</b><small>orang datang dari jawaban AI (${rl.toLowerCase()})</small></div></div></section>

    <div class="pb-dua">
      <section class="ad-kartu"><h3 class="ad-ey">Tidak dihitung</h3><p class="kecil">Tayangan dari jaringan hosting/cloud (hampir selalu skrip, pemindai, atau pratinjau tautan), perayap palsu yang mengaku Googlebot/GPTBot tetapi datang dari luar rentang IP resmi operatornya, bot lain, dan permintaan tanpa tanda peramban. Ini tidak masuk angka manusia maupun AI di atas.</p>
        ${daftar("Rincian", D.tak_dihitung || [], {warna: "rgba(138,147,168,.2)"})}</section>
      <section class="ad-kartu pb-metode"><h3 class="ad-ey">Cara angka ini dibuat</h3>
        <p><b>Tayangan</b> dihitung oleh server tiap kali halaman HTML diminta (bukan berkas gambar atau data). Agen pengguna dicocokkan dengan daftar asisten AI, perayap AI, dan mesin pencari. Bila operatornya menerbitkan rentang IP resmi (OpenAI, Google, Bing, Apple, Perplexity, Common Crawl), alamat IP permintaan dicocokkan dengan daftar yang diambil ulang tiap hari: cocok = <em>terverifikasi</em>, tidak cocok = perayap palsu (tidak dihitung). Anthropic dan beberapa operator lain belum menerbitkan daftar, jadi tampil tanpa lencana.</p>
        <p><b>Manusia</b> = permintaan dari peramban biasa (punya bahasa peramban dan tanda navigasi dokumen), bukan dari jaringan hosting/cloud, dan bukan bot yang dikenal. Kami tidak bisa melihat apakah orang itu benar-benar berinteraksi tanpa skrip di perangkatnya; skrip analitik hanya berjalan bila kamu menyetujuinya, dan angka di halaman ini tidak bergantung padanya.</p>
        <p><b>Pengunjung per hari</b> = sidik 16 karakter dari garam harian + IP + peramban. Garam diganti tiap tengah malam WIB dan garam lama dihapus, jadi pengunjung yang sama di dua hari dihitung dua kali, dan IP tidak pernah disimpan. "Pengunjung 7 hari" adalah jumlah pengunjung harian.</p>
        <p><b>Sedang membaca</b> = orang berbeda yang membuka halaman dalam 5 menit terakhir, beserta halaman terakhir yang dibukanya. <b>Negara</b> dibaca dari lokasi jaringan di tepi Cloudflare, bukan GPS.</p>
        <p><b>Sampel.</b> Situs ini berjalan di paket gratis. Bila tayangan hari itu sangat banyak, hanya sebagian yang dicatat (dipilih tetap per pengunjung) lalu dikalikan kembali; angkanya ditandai perkiraan.</p></section>
    </div>
    <p class="pb-kaki">Dihitung sejak ${tglID(d.mulai)} · waktu dalam WIB · diperbarui langsung (tembolok 1 menit) · <a href="/privasi.html#statistik">privasi</a></p>`;
    lukis(app);
    app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { r = b.dataset.r; try { sessionStorage.setItem("pb-r", r); } catch (e) {} muat(); });
  }
  async function muat() {
    try { const x = await fetch("/api/publik?r=" + r); if (!x.ok) throw new Error(x.status); d = await x.json(); render(); }
    catch (e) { app.innerHTML = `<p class="ad-galat">Statistik gagal dimuat (${esc(e.message)}).</p>`; }
  }
  muat(); setInterval(() => { if (document.visibilityState === "visible") muat(); }, 60e3);
})();
