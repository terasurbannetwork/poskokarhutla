"use strict";
/* Risiko kecamatan (halaman publik). Data: /banjir/data/risiko_kecamatan.json (pipeline scripts/bnpb/risiko.py), geo per provinsi dimuat saat dipilih.
   Peta digambar sendiri sebagai SVG (CSP halaman ini melarang pustaka peta dari CDN). Rumus skor sama persis dengan risiko() di risiko.py.
   Butuh /inti/format.js (fmt, esc, rb) dan /inti/tabel.js (pengurutKepala). */
(() => {
  const el = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  const IKON = {
    karhutla: "M12 3c1 3-1 4-1 6 0 1.5 1 2 2 2 0-1 1-2 1-2 2 1.5 3 3.5 3 6a5 5 0 0 1-10 0c0-3 3-5 5-12z",
    banjir: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
    gempa: "M3 12h4l2-6 4 12 2-6h6",
    gunungapi: "M3 20l6-11 3 5 3-4 6 10zM12 3v3M9 4l1 2M15 4l-1 2",
    kekeringan: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
    cuaca: "M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15zM11 15l-2 5 4-3-1 4",
  };
  const ikon = id => `<svg class="rk-ikon" viewBox="0 0 24 24" aria-hidden="true"><path d="${IKON[id] || IKON.cuaca}"/></svg>`;
  const WARNA = {karhutla: "#f08a3c", banjir: "#4f9be0", gempa: "#8a6d4e", gunungapi: "#b5523b", kekeringan: "#c9a24b", cuaca: "#7d8ca3"};
  const SIFAT = {karhutla: "harian", banjir: "statis x harian", gempa: "statis", gunungapi: "harian", kekeringan: "harian, hipotesis", cuaca: "harian"};
  let D, IX, BENCANA, KOR = new Map(), pilih = new Set(), prov = "", lingkup = "prov", geoCache = {}, elPath = [], terpilih = -1;
  const st = {urut: "risiko", turun: true, hal: 0};

  const pct = v => v == null ? "–" : fmt(Math.round(v * 100)) + "%";
  const val = (r, k) => r[IX[k]];
  /* skor satu baris untuk bencana yang dipilih: rumus yang sama dengan pipeline */
  function skor(r) {
    const ada = BENCANA.filter(b => pilih.has(b) && val(r, "h_" + b) != null);
    const pg = val(r, "pangkat"), kap = val(r, "kapasitas");
    if (!ada.length || pg == null || kap == null) return {s: null, b: ada.length ? Math.max(...ada.map(b => val(r, "h_" + b))) : null, u: null};
    const u = ada.reduce((m, b) => val(r, "h_" + b) > val(r, "h_" + m) ? b : m), b = val(r, "h_" + u);
    return {s: Math.round(1000 * b * pg * (1 - D.bobot.w_kapasitas * kap)) / 10, b, u};
  }
  const kelas = s => s == null ? null : D.ambang.filter(a => s >= a).length;
  const kls = s => s == null ? "kn" : "k" + kelas(s);
  const namaB = b => D.bencana.find(x => x.id === b).nama;
  const pilKelas = s => `<span class="rk-kls ${kls(s)}">${s == null ? "Tanpa data" : fmt(s) + " · " + D.kelas[kelas(s)]}</span>`;

  /* ---------- kontrol */
  function gambarKontrol() {
    el("fBencana").innerHTML = BENCANA.map(b => `<button type="button" data-b="${b}" aria-pressed="${pilih.has(b)}" class="rk-b">${ikon(b)}${esc(namaB(b))}</button>`).join("");
    el("fBencana").querySelectorAll("button").forEach(b => b.style.setProperty("--pil", WARNA[b.dataset.b]));
    const P = [...new Set(D.kec.map(r => r[IX.prov]))].sort((a, b) => D.provinsi[a].localeCompare(D.provinsi[b]));
    el("fProv").innerHTML = P.map(p => `<option value="${p}">${esc(D.provinsi[p])}</option>`).join("");
    el("fProv").value = prov;
    el("legenda").innerHTML = D.kelas.map((n, i) => `<span><i class="k${i}"></i>${esc(n)}</span>`).join("") + `<span><i class="kn"></i>Tanpa data</span>`;
    el("pilLabel").textContent = D.label.charAt(0).toUpperCase() + D.label.slice(1);
    el("pilHari").textContent = new Date(D.hari + "T00:00:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"});
  }

  /* ---------- peta */
  const hitungPeta = fs => {   // proyeksi equirectangular, lebar dikoreksi cos(lintang tengah)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const lihat = c => { for (const p of c) typeof p[0] === "number" ? (x0 = Math.min(x0, p[0]), x1 = Math.max(x1, p[0]), y0 = Math.min(y0, p[1]), y1 = Math.max(y1, p[1])) : lihat(p); };
    fs.forEach(f => lihat(f.geometry.coordinates));
    const k = Math.cos((y0 + y1) / 2 * Math.PI / 180), W = (x1 - x0) * k, H = y1 - y0, s = 1000 / Math.max(W, H);
    return {k, x0: x0 - 8 / s / k, y1: y1 + 8 / s, s, W: W * s + 16, H: H * s + 16};
  };
  const jalur = (g, P) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map(poli => poli.map(r =>
    "M" + r.map(p => ((p[0] - P.x0) * P.k * P.s).toFixed(1) + " " + ((P.y1 - p[1]) * P.s).toFixed(1)).join("L") + "Z").join("")).join("");

  async function muatGeo(p) {
    if (!geoCache[p]) { const r = await fetch(`/geo/kecamatan/${p}.json`); if (!r.ok) throw new Error("geo " + r.status); geoCache[p] = (await r.json()).features.filter(f => f.properties.kab && f.properties.kec); }
    return geoCache[p];
  }
  async function gambarPeta() {
    const p = prov, fs = await muatGeo(p);
    if (p !== prov) return;
    const P = hitungPeta(fs), svg = el("peta");
    svg.setAttribute("viewBox", `0 0 ${P.W.toFixed(0)} ${P.H.toFixed(0)}`);
    elPath = [];
    svg.innerHTML = fs.map(f => { const i = KOR.get(`${p}|${f.properties.kab}|${f.properties.kec}`); return `<path data-i="${i ?? -1}" d="${jalur(f.geometry, P)}"/>`; }).join("");
    svg.querySelectorAll("path").forEach(x => elPath.push(x));
    warnai();
  }
  function warnai() {
    elPath.forEach(x => { const i = +x.dataset.i; x.setAttribute("class", i < 0 ? "kn" : kls(skor(D.kec[i]).s) + (i === terpilih ? " pilih" : "")); });
  }

  /* ---------- tabel */
  function baris(lingk) {
    return D.kec.map((r, i) => ({i, r, s: skor(r)})).filter(x => x.s.s != null && (lingk === "nas" || val(x.r, "prov") === prov))
      .sort((a, b) => b.s.s - a.s.s).slice(0, 20);
  }
  const KUNCI = {kec: x => val(x.r, "kec"), kab: x => val(x.r, "kab"), prov: x => D.provinsi[val(x.r, "prov")], risiko: x => x.s.s, utama: x => namaB(x.s.u), pend: x => val(x.r, "pend") ?? -1, kap: x => val(x.r, "kapasitas") ?? -1};
  function gambarTabel() {
    const k = KUNCI[st.urut], d = st.turun ? -1 : 1;
    const bs = baris(lingkup).sort((a, b) => (k(a) > k(b) ? 1 : k(a) < k(b) ? -1 : 0) * d);
    el("isiTabel").innerHTML = bs.length ? bs.map(({i, r, s}) => `<tr data-i="${i}" tabindex="0">
      <td data-label="Kecamatan">${esc(val(r, "kec"))}</td><td data-label="Kabupaten">${esc(val(r, "kab"))}</td><td data-label="Provinsi">${esc(D.provinsi[val(r, "prov")])}</td>
      <td class="n" data-label="Risiko">${pilKelas(s.s)}</td>
      <td data-label="Bahaya utama"><span class="bn-pil rk-bhy" data-b="${s.u}">${ikon(s.u)}${esc(namaB(s.u))} ${pct(s.b)}</span></td>
      <td class="n" data-label="Penduduk">${rb(val(r, "pend"))}</td><td class="n" data-label="Kapasitas">${pct(val(r, "kapasitas"))}</td></tr>`).join("")
      : `<tr><td colspan="7" class="ad-kosong">Belum ada kecamatan bersekor.</td></tr>`;
    el("isiTabel").querySelectorAll(".rk-bhy").forEach(x => x.style.setProperty("--pil", WARNA[x.dataset.b]));
  }

  /* ---------- pop-up rincian */
  function buka(i) {
    const r = D.kec[i], s = skor(r), nama = val(r, "kec");
    terpilih = i; warnai();
    const bh = BENCANA.map(b => { const v = val(r, "h_" + b), m = D.bencana.find(x => x.id === b);
      return `<div class="rk-baris"><span>${ikon(b)} ${esc(m.nama)}</span><meter min="0" max="1" low=".33" high=".66" optimum="0" value="${v ?? 0}"></meter><span class="a">${pct(v)}</span><span class="bn-pil st">${esc(SIFAT[b])}</span></div>`; }).join("");
    const kv = (a, b) => `<dt>${a}</dt><dd>${b}</dd>`;
    const fas = [["Sekolah", val(r, "sekolah")], ["Siswa", val(r, "siswa")], ["Faskes", val(r, "faskes")]].filter(x => x[1] != null);
    el("dlgIsi").innerHTML = `<div class="rk-dlg-kepala"><div><h2 id="dlgJudul">${esc(nama)}</h2><p>${esc(val(r, "kab"))}, ${esc(D.provinsi[val(r, "prov")])}</p></div>
        <button type="button" class="rk-tutup" id="dlgTutup" aria-label="Tutup"><svg class="rk-ikon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="rk-skor">${pilKelas(s.s)}<span class="bn-pil">${esc(D.label)}</span></div>
      <div class="rk-blok"><h3>Bahaya hari ini</h3>${bh}</div>
      <div class="rk-dua">
        <div class="rk-blok"><h3>Keterpaparan</h3><dl class="rk-kv">${kv("Penduduk", val(r, "pend") == null ? "–" : fmt(val(r, "pend")) + " jiwa")}${kv("Peringkat nasional", pct(val(r, "pangkat")))}${fas.map(x => kv(x[0], fmt(x[1]))).join("")}</dl></div>
        <div class="rk-blok"><h3>Kapasitas</h3><dl class="rk-kv">${kv("Jarak ke BPBD", val(r, "bpbd_km") == null ? "–" : fmt(val(r, "bpbd_km")) + " km")}${kv("Kapasitas statis", pct(val(r, "kapasitas")))}${kv("Posko, relawan, Destana", "menyusul lewat API")}</dl></div></div>
      <details class="rk-sumber"><summary>Rumus dan sumber</summary><p>${esc(D.rumus)}. ${esc(D.ambang_catatan)}</p>
        <ul>${D.bencana.map(b => `<li><b>${esc(b.nama)}</b>: ${esc(b.sumber)}. ${esc(b.validasi)}${b.kosong ? ` (${fmt(b.kosong)} kecamatan tanpa data)` : ""}</li>`).join("")}
        <li><b>Keterpaparan</b>: ${esc(D.keterpaparan.sumber)}. ${esc(D.keterpaparan.catatan)}</li><li><b>Kapasitas</b>: ${esc(D.kapasitas.statis)}</li></ul></details>`;
    const d = el("dlg"); d.showModal(); el("dlgTutup").onclick = () => d.close();
  }

  /* ---------- gerak */
  function sorot(i) {
    if (i < 0) return;
    const r = D.kec[i], s = skor(r);
    el("sorot").textContent = `${val(r, "kec")}, ${val(r, "kab")}: ${s.s == null ? "tanpa data" : fmt(s.s) + " (" + D.kelas[kelas(s.s)] + ")"}`;
  }
  const segar = () => nanti(() => { warnai(); gambarTabel(); });   // pil yang baru ditekan tampil dulu (/inti/nanti.js)
  async function ganti() {
    el("pesan").textContent = ""; el("pesan").className = "bn-pesan";
    try { await gambarPeta(); } catch (e) { el("pesan").textContent = "Peta provinsi ini belum bisa kamu buka. Coba muat ulang."; el("pesan").className = "bn-pesan galat"; }
    gambarTabel();
  }
  function pasang() {
    el("fBencana").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
      const id = b.dataset.b; if (pilih.has(id)) { if (pilih.size === 1) return; pilih.delete(id); } else pilih.add(id);
      b.setAttribute("aria-pressed", pilih.has(id)); segar(); });
    /* ganti provinsi: umpan balik dulu, lalu geo 1 MB diurai dan peta digambar sesudah frame tercat */
    el("fProv").addEventListener("change", e => { prov = e.target.value; terpilih = -1; el("pesan").textContent = "Memuat peta…"; el("peta").setAttribute("aria-busy", "true");
      nanti(() => ganti().finally(() => el("peta").removeAttribute("aria-busy"))); });
    el("fLingkup").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; lingkup = b.dataset.l;
      el("fLingkup").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); gambarTabel(); });
    const peta = el("peta");
    peta.addEventListener("pointerover", e => { const p = e.target.closest("path"); if (p) sorot(+p.dataset.i); });
    peta.addEventListener("click", e => { const p = e.target.closest("path"); if (p && +p.dataset.i >= 0) buka(+p.dataset.i); });
    const tb = el("isiTabel");
    tb.addEventListener("click", e => { const t = e.target.closest("tr[data-i]"); if (t) bukaDariTabel(+t.dataset.i); });
    tb.addEventListener("keydown", e => { const t = e.target.closest("tr[data-i]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bukaDariTabel(+t.dataset.i); } });
    el("dlg").addEventListener("close", () => { terpilih = -1; warnai(); });
    pengurutKepala(st, el("kepalaTabel"), gambarTabel);
  }
  async function bukaDariTabel(i) {
    const p = D.kec[i][IX.prov];
    if (p !== prov) { prov = p; el("fProv").value = p; await ganti(); }
    buka(i);
  }

  async function mulai() {
    try {
      const r = await fetch("/banjir/data/risiko_kecamatan.json"); if (!r.ok) throw new Error(r.status);
      D = await r.json();
    } catch (e) { el("pesan").textContent = "Data risiko belum bisa kamu buka. Coba muat ulang sebentar lagi."; el("pesan").className = "bn-pesan galat"; return; }
    IX = Object.fromEntries(D.kolom.map((k, i) => [k, i]));
    BENCANA = D.bencana.map(b => b.id); pilih = new Set(BENCANA);
    D.kec.forEach((r, i) => KOR.set(`${r[0]}|${r[1]}|${r[2]}`, i));
    const atas = D.kec.reduce((m, r) => r[IX.risiko] != null && (m == null || r[IX.risiko] > m[IX.risiko]) ? r : m, null);
    prov = atas ? atas[IX.prov] : D.kec[0][IX.prov];
    gambarKontrol(); pasang();
    el("tata").hidden = false; el("pesan").textContent = "";
    ganti();
  }
  mulai();
})();
