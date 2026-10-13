/* preventif.js — "Rencana pencegahan" untuk kecamatan langganan api (data/preventif.json, scripts/data/preventif.py).
   1. Insight "kecamatan terbakar hampir setiap tahun": kolom Pencegahan utama, saring per jenis tindakan, ringkasan provinsi
      (lewat kait kecil di Insight.exKec yang dipasang splice_preventif.py).
   2. Klik baris -> popup Rencana pencegahan (#dlg).
   3. Dialog analisa kecamatan (Tren.rinci) mendapat bagian yang sama, dibungkus di sini tanpa menyentuh index.html.
   Butuh dari index.html: muatJSON, esc, fmt, rb, namaProv, BULAN, Insight, Tren, Riwayat, S. */
(() => {
const JENIS = {
  sekat: ["Sekat kanal", "#4f8fc4"], sumur: ["Sumur bor", "#2b8c86"], paludi: ["Paludikultur", "#5a9e74"], audit: ["Audit konsesi", "#5f6fb0"],
  patroli_kon: ["Patroli konsesi", "#5f6fb0"], hukum: ["Penegakan hukum", "#7a2b2b"], kawasan: ["Patroli kawasan", "#5a9e74"],
  sekat_bakar: ["Sekat bakar", "#e3b94e"], embung: ["Embung", "#4f8fc4"], posko: ["Posko permanen", "#c9503a"], mpa: ["MPA desa", "#e58a45"],
  pltb: ["Lahan tanpa bakar", "#e3b94e"], dini: ["Peringatan dini", "#5f6fb0"]};
const POLA = {"Gambut berkanal": "#4f8fc4", "Gambut": "#2b8c86", "Konsesi": "#5f6fb0", "Kawasan hutan": "#5a9e74", "Savana": "#e3b94e", "Lahan pertanian/rakyat": "#e58a45"};
const rp = v => v >= 1e12 ? "Rp" + fmt(Math.round(v / 1e11) / 10) + " T" : v >= 1e9 ? "Rp" + fmt(Math.round(v / 1e8) / 10) + " M" : v >= 1e6 ? "Rp" + fmt(Math.round(v / 1e6)) + " jt" : v > 0 ? "Rp" + fmt(v) : "rutin";
const rentang = b => { if (!b[1]) return "biaya rutin"; const a = rp(b[0]), z = rp(b[1]), sa = a.split(" ").at(-1);
  return sa === z.split(" ").at(-1) && a.includes(" ") ? `${a.slice(0, -sa.length - 1)}–${z.slice(2)}` : `${a}–${z}`; };
const pct = x => Math.round((x || 0) * 100) + "%";
const BL = () => (typeof BULAN !== "undefined" ? BULAN : ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]);
const bulanDi = (a, b) => { const o = []; for (let i = a; ; i = (i + 1) % 12) { o.push(i); if (i === b || o.length > 12) break; } return o; };

const P = window.Preventif = {
  d: null, siap: false, _janji: null,
  muat() {
    return this._janji ||= muatJSON("data/preventif.json").then(d => { this.d = d; this.siap = true; this.segarkan(); return d; })
      .catch(e => { console.warn("preventif.json belum ada", e); return null; }); },
  /* gambar ulang exhibit kecamatan setelah data tiba */
  segarkan() { const box = document.querySelector('#insight [data-ex="kec"]');
    if (box && typeof Insight !== "undefined") box.innerHTML = Insight.gambar("kec"); },
  k(kunci) { return this.d?.kec?.[kunci]; },

  /* ---------- kait dari Insight.exKec ---------- */
  lebar() { if (!this.siap) { this.muat(); return 0; } return 250; },
  lolos(kunci, kode) { if (!kode || !this.siap) return true; const r = this.k(kunci); return !!r && r.tindakan.slice(0, 3).some(t => t.kode === kode); },
  attr(kunci) { return this.siap && this.k(kunci) ? "data-pv" : "data-riw"; },
  kontrol(st) { if (!this.siap) return "";
    return `<select data-set="kecAksi" aria-label="Saring jenis tindakan"><option value="">Semua tindakan</option>${Object.entries(JENIS).filter(([k]) => k !== "dini")
      .map(([k, [n]]) => `<option value="${k}" ${st.kecAksi === k ? "selected" : ""}>Tindakan: ${n}</option>`).join("")}</select>`; },
  judulKolom(x) { return this.siap ? `<text x="${x}" y="14" font-size="11" font-weight="700" opacity=".75">Pencegahan utama · anggaran</text>` : ""; },
  sel(kunci, x, y, rh) {
    const r = this.k(kunci); if (!r) return `<text x="${x}" y="${y + rh / 2 + 4}" font-size="11.5" opacity=".5">belum dianalisis</text>`;
    const t = r.tindakan[0], [n, w] = JENIS[t.kode] || [t.kode, "#5f6fb0"];
    return `<rect x="${x}" y="${y + rh / 2 - 4}" width="8" height="8" rx="2" fill="${w}"/>
      <text x="${x + 13}" y="${y + rh / 2 + 4}" font-size="12.5" font-weight="700">${esc(n)}<tspan font-weight="400" opacity=".65" font-size="11"> ${rentang(r.biaya)}</tspan></text>`; },
  tipKolom(kunci) { const r = this.k(kunci); return r ? `<br>Pencegahan: ${esc(r.tindakan[0].tindakan)}<br>klik untuk rencana pencegahan` : ""; },

  /* ringkasan provinsi di bawah exhibit */
  ringkasProv(pp) {
    if (!this.siap) return "";
    const BLN = BL(), daf = Object.entries(this.d.prov).filter(([k]) => !pp || k === pp).sort((a, b) => b[1].n - a[1].n);
    if (!daf.length) return "";
    const tot = daf.reduce((a, [, q]) => [a[0] + q.biaya[0], a[1] + q.biaya[1]], [0, 0]);
    return `<div class="pv-prov"><h4>Ringkasan pencegahan per provinsi</h4>
      <p class="fnd">Dari ${fmt(daf.reduce((a, [, q]) => a + q.n, 0))} kecamatan langganan yang dianalisis. Anggaran = perkiraan biaya awal + satu musim, bukan RAB. Tenggat = dua bulan sebelum awal musim paling dini di provinsi itu.</p>
      <div class="tw pv-tw"><table><thead><tr><th>Provinsi</th><th class="n">Kecamatan</th><th>Pola dominan</th><th>3 tindakan terbanyak</th><th class="n">Anggaran (perkiraan)</th><th>Tenggat persiapan</th></tr></thead><tbody>
      ${daf.map(([k, q]) => `<tr><td><b>${esc(typeof namaProv === "function" ? namaProv(k) : q.nama)}</b></td><td class="n num">${fmt(q.n)}</td>
        <td><span class="pv-pola" style="--w:${POLA[q.pola[0][0]] || "#5f6fb0"}">${esc(q.pola[0][0])}</span> <small class="pv-s">${q.pola[0][1]} dari ${q.n}${q.pola[1] ? ` · lalu ${esc(q.pola[1][0].toLowerCase())}` : ""}</small></td>
        <td class="pv-wrap">${q.aksi.map((a, i) => `${i + 1}. ${esc(a)}`).join("<br>")}</td>
        <td class="n num">${rentang(q.biaya)}</td><td>${this.tenggat(q, BLN)}</td></tr>`).join("")}
      </tbody>${daf.length > 1 ? `<tfoot><tr><td>Jumlah</td><td></td><td></td><td></td><td class="n num">${rentang(tot)}</td><td></td></tr></tfoot>` : ""}</table></div></div>`; },

  /* tenggat = awal musim paling dini - 2; bila yang dini hanya segelintir (< 10% kecamatan), tenggat utama ikut awal musim umum
     dan yang dini ditulis sebagai catatan, supaya satu-dua kecamatan tidak menggeser tenggat seluruh provinsi */
  tenggat(q, BLN) {
    const sedikit = q.awal_dini !== q.awal_umum && q.awal_dini_n / q.n < .1, awal = sedikit ? q.awal_umum : q.awal_dini, t = (awal + 10) % 12;
    return `<b>${BLN[t]}</b>${awal < 2 ? " <small class='pv-s' style='display:inline'>tahun sebelumnya</small>" : ""}<small class="pv-s">awal musim ${BLN[awal]}${sedikit
      ? `; ${q.awal_dini_n} kec. mulai ${BLN[q.awal_dini]}, siapkan ${BLN[q.tenggat]}` : q.awal_umum !== q.awal_dini ? `; umumnya ${BLN[q.awal_umum]}` : ""}</small>`; },

  /* ---------- isi rencana (dipakai popup dan dialog analisa) ---------- */
  grafikTahun(v, th) {
    if (!v) return "";
    const W = 200, c = W / v.length;
    return `<svg viewBox="0 0 ${W} 34" width="100%" role="img" aria-label="Tahun terbakar">${v.map((x, j) => `<rect x="${j * c + 1}" y="2" width="${c - 2}" height="18" rx="2" fill="${x >= 10 ? "#c9503a" : x > 0 ? "#e3b94e" : "var(--surface)"}" opacity="${x >= 10 ? Math.min(1, .45 + x / 400) : 1}" data-tip="<b>${th[j]}</b><br>${fmt(x)} titik${x >= 10 ? " · terbakar" : ""}"/>`).join("")}
      <text x="0" y="32" font-size="9" opacity=".65">${th[0]}</text><text x="${W}" y="32" font-size="9" opacity=".65" text-anchor="end">${th.at(-1)}</text></svg>
      <p class="pv-cat">${v.filter(x => x >= 10).length} dari ${v.length} tahun ≥ 10 titik (merah); kuning = ada titik tapi < 10</p>`; },
  grafikBulan(r) {
    const BLN = BL(), b = r.bulan, m = Math.max(1, ...b), M = r.musim, W = 200, c = W / 12, H = 64;
    const ms = new Set(bulanDi(M.awal, M.akhir)), aksi = new Set(bulanDi(M.tenggat, (M.awal + 11) % 12));
    return `<svg viewBox="0 0 ${W} ${H + 14}" width="100%" role="img" aria-label="Musim titik panas per bulan">
      ${[...aksi].map(i => `<rect x="${i * c}" y="0" width="${c}" height="${H}" fill="#5a9e74" opacity=".16"/>`).join("")}
      ${b.map((x, i) => { const h = x / m * (H - 6); return `<rect x="${i * c + 3}" y="${H - h}" width="${c - 6}" height="${Math.max(1, h)}" rx="2" fill="${i === M.puncak ? "#7a2b2b" : ms.has(i) ? "#c9503a" : "#e3b94e"}" data-tip="<b>${BLN[i]}</b><br>${fmt(x)} titik 2002–kini${i === M.puncak ? " · puncak" : ms.has(i) ? " · musim api" : aksi.has(i) ? " · jendela persiapan" : ""}"/>`; }).join("")}
      ${BLN.map((n, i) => `<text x="${i * c + c / 2}" y="${H + 11}" text-anchor="middle" font-size="7.5" opacity="${aksi.has(i) ? 1 : .6}" font-weight="${aksi.has(i) ? 700 : 400}">${n[0]}</text>`).join("")}</svg>
      <p class="pv-cat"><i style="background:#5a9e74;opacity:.45"></i>persiapan ${BLN[M.tenggat]}–${BLN[(M.awal + 11) % 12]} · <i style="background:#c9503a"></i>musim ${BLN[M.awal]}–${BLN[M.akhir]} · <i style="background:#7a2b2b"></i>puncak ${BLN[M.puncak]}</p>`; },
  lahan(r) {
    const kon = Object.entries(r.konsesi).sort((a, b) => b[1] - a[1]), hut = (r.kawasan.HK || 0) + (r.kawasan.HL || 0), prod = (r.kawasan.HP || 0) + (r.kawasan.HPT || 0) + (r.kawasan.HPK || 0);
    const baris = [["Gambut", r.gambut, "#2b8c86"], ...kon.map(([j, v]) => ["Konsesi " + (j === "hph" ? "HPH/PBPH" : j), v, "#5f6fb0"]),
      ["Konservasi/lindung", hut, "#5a9e74"], ["Hutan produksi", prod, "#9a7448"], ["Berulang ≤ 1 km", r.ulang, "#7a2b2b"]];
    return baris.map(([n, v, w]) => `<div class="pv-bar"><span>${n}</span><i><b style="width:${Math.min(100, v * 100)}%;background:${w}"></b></i><em class="num">${pct(v)}</em></div>`).join(""); },
  isi(kunci, rv) {
    const r = this.k(kunci); if (!r) return "";
    const BLN = BL(), M = r.musim, th = this.d.tahun, ak = r.akses || {};
    const kot = (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`;
    const fakta = [
      r.kanal_km ? `kanal ${fmt(r.kanal_km)} km (${fmt(r.kanal_padat)} km/km²)` : "tidak ada kanal tercatat di OSM",
      r.desa_sasaran != null ? `${fmt(r.desa_sasaran)} dari ${fmt(r.desa)} desa dalam 3 km dari petak langganan` : "data desa belum tersedia untuk provinsi ini",
      r.penduduk ? `${rb(r.penduduk)} penduduk` : "",
      ak.daops ? `${esc(ak.daops)} ± ${fmt(ak.daops_km)} km (± ${fmt(ak.daops_jam)} jam)` : "",
      ak.posko ? `posko usulan terdekat ${esc(ak.posko)} ± ${fmt(ak.posko_jam)} jam` : ""].filter(Boolean);
    return `<div class="grid g4 pv-kpi">${kot("Tahun terbakar", `${r.tahun}<span class="pv-dari"> / ${th.length}</span>`, r.tren5 != null ? `5 tahun terakhir ${r.tren5 >= 1 ? "↑" : "↓"} ${fmt(r.tren5)}× dari sebelumnya` : "")}
        ${kot("Titik panas / tahun", rb(r.rata), `${fmt(r.petak)} petak ±1 km terbakar ≥ 3 tahun`)}
        ${kot("Tenggat persiapan", BLN[M.tenggat], `awal musim ${BLN[M.awal]}, puncak ${BLN[M.puncak]}`)}
        ${kot("Anggaran pencegahan", rentang(r.biaya), "perkiraan, biaya awal + 1 musim")}</div>
      <div class="pv-mini">
        <div><h5>Tahun terbakar (≥ 10 titik)</h5>${this.grafikTahun(rv, th)}</div>
        <div><h5>Titik panas per bulan, 2002–kini</h5>${this.grafikBulan(r)}</div>
        <div><h5>Di mana titik panas jatuh <span class="pv-s" style="display:inline">(bisa tumpang tindih)</span></h5>${this.lahan(r)}</div></div>
      <p class="fnd"><span class="pv-pola" style="--w:${POLA[r.pola] || "#5f6fb0"}">${esc(r.pola)}</span> · ${fakta.join(" · ")}.</p>
      <ol class="pv-daf">${r.tindakan.map(t => { const [n, w] = JENIS[t.kode] || [t.kode, "#5f6fb0"]; return `<li style="--w:${w}">
        <div class="pv-t"><b>${esc(t.tindakan)}</b><span class="pv-tag">${esc(n)}</span></div>
        <p class="pv-al">${esc(t.alasan)}</p>
        <dl><div><dt>Kapan</dt><dd>${esc(t.kapan)}</dd></div><div><dt>Penanggung jawab</dt><dd>${esc(t.pj)}</dd></div>
          <div><dt>Indikator berhasil</dt><dd>${esc(t.indikator)}</dd></div>
          <div><dt>Perkiraan biaya</dt><dd><b>${rentang(t.biaya)}</b>${t.unit ? ` <span class="pv-s" style="display:inline">· ${fmt(t.unit)} ${esc(t.satuan)}</span>` : ""}</dd></div></dl>
        <small class="pv-src">Dasar biaya: ${esc(this.d.sumber_biaya?.[t.sumber] || t.sumber)}</small></li>`; }).join("")}</ol>
      <p class="fnd">Rekomendasi disusun dengan aturan terbuka dari data titik panas MODIS ${th[0]}–${th.at(-1)}, peta gambut, konsesi, kawasan hutan, kanal dan desa OSM; bukan hasil survei lapangan. Titik MODIS meleset hingga ±1 km. Pemegang izin yang areal kerjanya memuat titik panas belum tentu pembakarnya. Biaya adalah perkiraan untuk perencanaan, perlu dihitung ulang dalam RAB. Data ${esc(this.d.dibuat)}.</p>`; },

  /* popup dari exhibit */
  async buka(kunci) {
    await this.muat(); const r = this.k(kunci); if (!r) return typeof Riwayat !== "undefined" && Riwayat.buka(kunci);
    const [pv, kab, kec] = kunci.split("|"), rv = (typeof S !== "undefined" && S.riw?.[kunci]?.v) || null, d = document.getElementById("dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">Rencana pencegahan · ${esc(kec)}</h3><p>Kecamatan · ${esc(kab)} · ${esc(typeof namaProv === "function" ? namaProv(pv) : pv)}</p></div><button aria-label="Tutup" data-tutup>×</button></div>
      <div class="db">${this.isi(kunci, rv)}<button class="btn sec" data-pv-riw style="justify-self:start">Buka analisa riwayat lengkap</button></div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close();
    d.onclick = e => { if (e.target === d) return d.close(); if (e.target.closest("[data-pv-riw]")) { d.close(); Riwayat.buka(kunci); } };
    if (!d.open) d.showModal(); d.scrollTop = 0; },
};

/* klik baris [data-pv] di Insight; ditangkap sebelum handler Insight (yang hanya mengenali data-riw) */
document.addEventListener("click", e => { const x = e.target.closest?.("[data-pv]"); if (!x) return; e.stopPropagation(); P.buka(x.dataset.pv); }, true);
document.addEventListener("keydown", e => { if (e.key !== "Enter") return; const x = e.target.closest?.("[data-pv]"); if (x) P.buka(x.dataset.pv); });

/* dialog analisa kecamatan: tambahkan bagian Rencana pencegahan di atas catatan sumber */
if (typeof Tren !== "undefined" && typeof Tren.rinci === "function") {
  const asli = Tren.rinci;
  Tren.rinci = function (r, ...a) {
    const hasil = asli.call(this, r, ...a);
    if (r && r.jenis === "kec") P.muat().then(() => {
      const d = document.getElementById("dlg"), db = d?.querySelector(".db");
      if (!d?.open || !db || !P.k(r.kunci) || db.querySelector(".pv-sek") || d.querySelector("#dlgJudul")?.textContent !== r.nama) return;
      const sek = document.createElement("details"); sek.className = "lipat pv-sek"; sek.open = true;
      sek.innerHTML = `<summary>Rencana pencegahan <span>· tindakan sebelum musim api berikutnya</span></summary><div class="isi">${P.isi(r.kunci, r.v)}</div>`;
      const sumber = [...db.children].reverse().find(x => x.matches("p.fnd")); db.insertBefore(sek, sumber || null); });
    return hasil; };
}
})();
