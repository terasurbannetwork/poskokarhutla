/* Tab Status (PH-10): kab diwarnai status prakiraan per bahaya dan hari, daftar urut, garis waktu, kartu fakta kab.
   Fungsi murni (statusHari, urutKab, ringkas, kelasKab, chipFakta) dari window.DampakPeringatan (inti/dampak_peringatan.js); modul ini hanya menggambar.
   Data: /api/dampak-peringatan/status, /data/kelas_desa_bnpb.json, /data/kelas_desa/<pp>.json, /api/bmkg/desa, /banjir/data/debit_kab.json.
   Klik: pil/tombol di-set langsung (urgent), hitung dan gambar ditunda lewat nanti(). ctx: lihat app.js. */
import { warnaToken } from "/inti/maplibre.js";

const BHY = [ // kode status, nama, ikon
  ["bnj", "Banjir", '<path d="M3 9c2 0 2-2 4.5-2S10 9 12 9s2.5-2 4.5-2S19 9 21 9M3 15c2 0 2-2 4.5-2S10 15 12 15s2.5-2 4.5-2S19 15 21 15"/>'],
  ["bdg", "Banjir bandang", '<path d="M12 3v8m0 0-3-3m3 3 3-3M3 18c2 0 2-2 4.5-2S10 18 12 18s2.5-2 4.5-2S19 18 21 18"/>'],
  ["lsr", "Longsor", '<path d="M3 20 10 6l3 5 2-3 6 12z"/>'],
  ["gel", "Gelombang tinggi", '<path d="M3 14c3-6 8-6 10-2s5 2 8-3M3 19h18"/>'],
  ["kht", "Karhutla", '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-6 1-9z"/>'],
  ["kek", "Kekeringan", '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'],
  ["cex", "Cuaca ekstrem", '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'],
];
const NAMA = Object.fromEntries(BHY.map((b) => [b[0], b[1]]));
const DESA6 = ["bnj", "bdg", "lsr", "gel", "kht", "kek"]; // urutan digit string kelas desa BNPB
const HARI = ["Hari ini", "Besok", "Lusa", "Hari ke-3"];
const KELAS = ["Belum terukur", "Rendah", "Sedang", "Tinggi"];
const PROV = { 11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Bangka Belitung", 21: "Kepulauan Riau", 31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur", 61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan", 74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua Barat", 92: "Papua Barat Daya", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua" };
const STD = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ik = (p) => STD + p + "</svg>";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const nanti = (f) => requestAnimationFrame(() => setTimeout(f, 0));
const ambil = (u) => fetch(u, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const angka = (n, d = 0) => (n == null || !Number.isFinite(+n) ? null : (+n).toLocaleString("id-ID", { maximumFractionDigits: d }));
const BELUM = "Belum terukur";
const muatDP = () => globalThis.DampakPeringatan ? Promise.resolve() : new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = "/inti/dampak_peringatan.js"; s.onload = ok; s.onerror = gagal; document.head.append(s); });

function bbox(g) {
  let a = 180, b = 90, c = -180, d = -90;
  (function jalan(x) { if (typeof x[0] === "number") { a = Math.min(a, x[0]); c = Math.max(c, x[0]); b = Math.min(b, x[1]); d = Math.max(d, x[1]); } else for (const y of x) jalan(y); })(g.coordinates);
  return [[a, b], [c, d]];
}

export function pasang(ctx) {
  const { panel, bawah, state } = ctx;
  let DP, D = null, fc = null, kodeKab = [], bb = new Map(), sBy = new Map(), kini = false, peta = null, main = null, putar = 0, pilihLama = "";
  const kelasDesa = new Map(), debitBm = new Map();

  panel.innerHTML = '<p class="st-info" role="status">Memuat status prakiraan</p>';
  bawah.innerHTML = `<div class="st-wkt" role="group" aria-label="Hari prakiraan"><button type="button" class="st-play" aria-pressed="false" aria-label="Putar empat hari" title="Putar empat hari">${ik('<path d="M7 5v14l12-7z"/>')}</button><div class="st-hari">${HARI.map((h, i) => `<button type="button" data-h="${i}" aria-pressed="false">${h}</button>`).join("")}<button type="button" data-h="ringkas" aria-pressed="false">Ringkas 3 hari</button></div></div>
<div class="st-leg"><ul class="st-sw" aria-label="Warna status">${["Normal", "Waspada", "Siaga", "Awas"].map((t, i) => `<li><i class="st-k st-k${i}"></i>${t}</li>`).join("")}<li><i class="st-k st-kn"></i>${BELUM}</li></ul><button type="button" class="st-cara">Cara membaca status</button></div>
<dialog class="st-dlg" aria-labelledby="st-dlg-j"><form method="dialog"><h3 id="st-dlg-j">Cara membaca status</h3><div class="st-dlg-isi" id="st-dlg-isi"></div><button class="st-tutup">Tutup</button></form></dialog>`;
  const dlg = bawah.querySelector("dialog");

  /* ---------- garis waktu ---------- */
  const tandaiHari = () => bawah.querySelectorAll(".st-hari [data-h]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.h === state.h)));
  const berhenti = () => { clearInterval(putar); putar = 0; bawah.querySelector(".st-play").setAttribute("aria-pressed", "false"); };
  function setHari(h) { state.h === h || ctx.ubah({ h }); tandaiHari(); nanti(segarkan); }
  bawah.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.h) { berhenti(); setHari(t.dataset.h); }
    else if (t.classList.contains("st-play")) {
      if (putar) return berhenti();
      t.setAttribute("aria-pressed", "true");
      setHari("0");
      putar = setInterval(() => { if (!document.hidden) setHari(String((+state.h + 1) % 4 || 0)); }, 1800);
    } else if (t.classList.contains("st-cara")) {
      $dlg();
      dlg.showModal();
    }
  });
  function $dlg() {
    const isi = bawah.querySelector("#st-dlg-isi");
    if (isi.dataset.siap) return;
    isi.dataset.siap = "1";
    isi.innerHTML = `<p>Status tiap kab/kota dan bahaya memadukan E, tingkat tertinggi dari prakiraan Centurisk97 dan peringatan BMKG yang berlaku (peringatan BMKG hanya untuk hari ini), dengan K, kelas bahaya kab/kota.</p>
<div class="ex-tabel"><table><thead><tr><th>Syarat</th><th>Status</th></tr></thead><tbody>
<tr><td>Cuaca ekstrem, atau kelas bahaya sedang atau tinggi</td><td>Sama dengan E</td></tr>
<tr><td>Kelas bahaya rendah dan peringatan BMKG bukan Awas</td><td>Paling tinggi Siaga</td></tr>
<tr><td>Kelas bahaya rendah dan peringatan BMKG Awas</td><td>Sama dengan E</td></tr>
<tr><td>Kelas bahaya belum terukur (banjir dan longsor)</td><td>Belum terukur bila E nol; bila E lebih dari nol, paling tinggi Siaga dengan tanda "kelas bahaya belum terukur"</td></tr></tbody></table></div>
<p>Kelas bahaya kab/kota diturunkan dari sebaran kelas desa BNPB: tinggi bila paling sedikit 40 persen desa berkelas tinggi; sedang bila paling sedikit 10 persen desa tinggi, atau paling sedikit 10 desa tinggi, atau paling sedikit 60 persen desa sedang atau tinggi; selain itu rendah.</p>
<p>${esc(DP.TIP_NORMAL)} ${esc(DP.TIP_BELUM)}</p>
<p>Status dari model Centurisk97 berlabel hipotesis sampai lolos uji balik. Ringkas 3 hari memakai tingkat tertinggi dari empat hari.</p>`;
  }

  /* ---------- hitung dan peta ---------- */
  const hVal = () => (state.h === "ringkas" ? "ringkas" : +state.h);
  const kodeB = () => (state.b ? state.b.toUpperCase() : null);
  const nmKab = (k) => D.kelas?.kab?.[k]?.nama || k;
  const chip = (j, t) => { const c = DP.chipFakta(j); return `<span class="st-chip ${c.kelas}"${t ? ` title="${esc(t)}"` : ""}>${c.label}</span>`; };
  const stp = (s, tip) => { const ok = Number.isInteger(s) && s >= 0; return `<span class="st-st st-${ok ? s : "n"}" title="${esc(tip || DP.tooltip(ok ? s : null))}">${ok ? DP.TINGKAT[s] : BELUM}</span>`; };

  let rows = [];
  function hitung() {
    rows = DP.urutKab(D.status, kodeB(), hVal(), D.kelas);
    sBy = new Map(rows.map((r) => [r.kab, r.s]));
  }
  function terapkan() {
    if (!peta || !peta.getSource("st-kab")) return;
    for (const k of kodeKab) peta.setFeatureState({ source: "st-kab", id: k }, { s: sBy.get(k) ?? -1 });
    tandaPilih();
  }
  function tandaPilih() {
    if (!peta || !peta.getSource("st-kab")) return;
    if (pilihLama) peta.setFeatureState({ source: "st-kab", id: pilihLama }, { pilih: false });
    if (state.kab && bb.has(state.kab)) peta.setFeatureState({ source: "st-kab", id: state.kab }, { pilih: true });
    pilihLama = state.kab;
  }
  function pasangLapis(m) {
    peta = m;
    if (!fc || m.getSource("st-kab")) return;
    const w = warnaToken;
    m.addSource("st-kab", { type: "geojson", data: fc, promoteId: "kab" });
    const vis = kini ? "visible" : "none";
    m.addLayer({ id: "st-isi", type: "fill", source: "st-kab", layout: { visibility: vis }, paint: { "fill-color": ["match", ["coalesce", ["feature-state", "s"], -1], 0, w("--dp-0"), 1, w("--dp-1"), 2, w("--dp-2"), 3, w("--dp-3"), w("--dp-belum")], "fill-opacity": 0.62 } });
    m.addLayer({ id: "st-garis", type: "line", source: "st-kab", layout: { visibility: vis }, paint: { "line-color": w("--ink2"), "line-width": ["case", ["boolean", ["feature-state", "pilih"], false], 3, 0.5] } });
    if (!m._stKlik) {
      m._stKlik = true;
      m.on("click", "st-isi", (e) => { const k = e.features?.[0]?.properties?.kab; if (k) pilihKab(k, false); });
      m.on("mouseenter", "st-isi", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "st-isi", () => (m.getCanvas().style.cursor = ""));
    }
    pilihLama = "";
    if (D) terapkan();
  }
  ctx.pasangPeta(pasangLapis);

  async function muatGeo() {
    const prov = [...new Set(Object.keys(D.kelas?.kab || {}).map((k) => k.slice(0, 2)))];
    const gs = await Promise.all(prov.map((p) => ambil(`/geo/kabupaten/${p}.json`)));
    const fitur = [], ng = (n) => DP.namaGeo(n);
    prov.forEach((p, i) => {
      const kab = Object.keys(D.kelas.kab).filter((k) => k.startsWith(p)), ada = new Set(), sisa = [];
      for (const f of gs[i]?.features || []) {
        const k = kab.find((c) => !ada.has(c) && ng(D.kelas.kab[c].nama) === ng(f.properties?.kab));
        if (k) { ada.add(k); fitur.push({ type: "Feature", geometry: f.geometry, properties: { kab: k } }); } else sisa.push(f);
      }
      const lowong = kab.filter((c) => !ada.has(c));
      if (sisa.length === 1 && lowong.length === 1) fitur.push({ type: "Feature", geometry: sisa[0].geometry, properties: { kab: lowong[0] } }); // nama beda satu-satunya (mis. Kepulauan Seribu)
    });
    for (const f of fitur) bb.set(f.properties.kab, bbox(f.geometry));
    kodeKab = fitur.map((f) => f.properties.kab);
    fc = { type: "FeatureCollection", features: fitur };
    if (peta) pasangLapis(peta);
  }

  /* ---------- panel: daftar ---------- */
  const lst = document.createElement("div"), kv = document.createElement("div");
  lst.className = "st-lst"; kv.className = "st-kv"; kv.hidden = true;

  function renderDaftar() {
    const K = kodeB(), h = hVal(), r = DP.ringkas(D.status, h, K ? [K] : undefined);
    const hip = (K ? [K] : BHY.map((b) => b[0].toUpperCase())).some((c) => !DP.bolehTampil(null, D.status, c));
    const kotak = [["Awas", r.awas, 3], ["Siaga", r.siaga, 2], ["Waspada", r.waspada, 1], ["Normal", r.normal, 0], [BELUM, r.belum, "n"]];
    const jml = (c) => Object.values(D.status.kab).filter((a) => DP.statusHari(a[c], h) >= 1).length;
    const semua = Object.values(D.status.kab).filter((a) => BHY.some((b) => DP.statusHari(a[b[0].toUpperCase()], h) >= 1)).length;
    const pil = [["", "Semua", '<path d="M4 6h16M4 12h16M4 18h16"/>', semua], ...BHY.map((b) => [b[0], b[1], b[2], jml(b[0].toUpperCase())])];
    lst.innerHTML = `<div class="st-angka" role="group" aria-label="Jumlah kab/kota per status">${kotak.map((k) => `<div class="st-ang"><b>${angka(k[1])}</b><span><i class="st-k st-k${k[2]}"></i>${k[0]}</span></div>`).join("")}</div>
<div class="st-baris-chip">${chip("hitung", "Jumlah kab/kota dihitung dari status per kab")}${hip ? chip("hipotesis", "Model belum lolos uji balik") : ""}</div>
<div class="st-bhy" role="group" aria-label="Bahaya">${pil.map((p) => `<button type="button" data-b="${p[0]}" aria-pressed="${state.b === p[0]}" title="Jumlah kab/kota Waspada ke atas: ${angka(p[3])}">${ik(p[2])}<span>${p[1]}</span><em>${angka(p[3])}</em></button>`).join("")}</div>
<ol class="st-daftar" aria-label="Kab/kota urut prioritas">${rows.map((x) => `<li><button type="button" class="st-br" data-kab="${esc(x.kab)}"><span class="st-nm"><b>${esc(x.nama)}</b><small>${esc(PROV[x.kab.slice(0, 2)] || "")}${K ? "" : ", " + NAMA[x.kode.toLowerCase()]}</small></span>${stp(x.s >= 0 ? x.s : null)}</button></li>`).join("")}</ol>`;
  }

  /* ---------- panel: kab ---------- */
  const kartu = (ey, judul, isi) => `<section class="ex ex-std st-kartu"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></section>`;
  const tabel = (kep, br, kls = "") => `<div class="ex-tabel ${kls}"><table><thead><tr>${kep.map((c) => `<th${c[1] ? ` title="${esc(c[1])}"` : ""}>${c[0]}</th>`).join("")}</tr></thead><tbody>${br.join("")}</tbody></table></div>`;

  function seksiStatus(k) {
    const a = D.status.kab[k] || {}, br = [];
    for (const [kd, nm] of BHY.map((b) => [b[0].toUpperCase(), b[1]])) {
      const e = a[kd]; if (!e) continue;
      const ef = DP.statusEfektif(e, D.status, kd);
      const hs = [0, 1, 2, 3].map((i) => `<td>${stp(DP.statusHari(e, i))}</td>`).join("");
      const j = ef.belum ? "belum" : ef.hipotesis ? "hipotesis" : "hitung";
      br.push(`<tr><th scope="row">${nm}<span class="st-sf">${chip(j)}${ef.sebagian ? '<span class="st-sb">Sebagian sumber</span>' : ""}</span></th>${hs}</tr>`);
    }
    return kartu("Prakiraan", "Status per bahaya", br.length ? tabel([["Bahaya"], ...HARI.map((h) => [h])], br, "st-lebar") : `<p class="st-kosong">${BELUM}</p>${chip("belum")}`);
  }
  function seksiKelas(k) {
    const kk = D.kelas?.kab?.[k];
    if (!kk) return kartu("BNPB", "Kelas bahaya desa", `<p class="st-kosong">${BELUM}</p>${chip("belum")}`);
    const br = DESA6.map((c) => {
      const b = kk.baseline?.[c.toUpperCase()], p = kk.proyeksi?.[c.toUpperCase()];
      const K = DP.kelasKab(b);
      return `<tr><th scope="row">${NAMA[c]}${K ? `<small>kelas kab ${K}</small>` : ""}</th>${b ? `<td>${angka(b[3])}</td><td>${angka(b[2])}</td><td>${angka(b[1])}</td><td>${angka(b[0])}</td>` : '<td colspan="4" class="st-kosong">' + BELUM + "</td>"}<td>${p ? angka(p[3]) : BELUM}</td></tr>`;
    });
    const cat = "Proyeksi, tahun dan skenario tidak tercantum di sumber";
    return kartu("BNPB", "Kelas bahaya desa", `${tabel([["Bahaya"], ["Tinggi"], ["Sedang"], ["Rendah"], ["Belum terukur", "Desa tanpa kelas di sumber"], ["Proyeksi tinggi", cat]], br, "st-lebar")}
<p class="st-cat">Jumlah desa per kelas baseline dari ${angka(kk.n)} desa. Kolom proyeksi: ${cat.toLowerCase()}. ${chip("sumber", "BNPB InaRISK, kelas bahaya desa")} ${chip("hitung", "Kelas kab dihitung dari sebaran kelas desa")}</p>
<details class="st-desa" data-k="${k}"><summary>Daftar desa</summary><div class="st-desa-isi"></div></details>`);
  }
  function seksiBmkg() { return kartu("BMKG", "Prakiraan BMKG per desa", '<div class="st-bm" aria-live="polite"><p class="st-info">Memuat prakiraan desa</p></div>'); }
  function seksiDebit(k) {
    const d = D.debit?.kab?.[k];
    const isi = d ? `<dl class="st-kv2"><dt>Puncak debit</dt><dd>${angka(d.puncak_m3s, 1) ?? BELUM}${d.puncak_m3s != null ? " m³/detik" : ""}</dd><dt>Hari puncak</dt><dd>${d.hari_puncak != null ? HARI[d.hari_puncak] || "Hari ke-" + d.hari_puncak : BELUM}</dd><dt>Rasio terhadap Q2</dt><dd>${d.rasio_q2 != null ? angka(d.rasio_q2, 1) : BELUM}</dd></dl>${chip("hipotesis", "Debit GloFAS; belum lolos uji balik")}` : `<p class="st-kosong">${BELUM}</p>${chip("belum")}`;
    return kartu("GloFAS", "Debit sungai", isi);
  }

  function bukaKab(k) {
    const kk = D.kelas?.kab?.[k];
    kv.innerHTML = `<div class="st-kep"><button type="button" class="st-balik" data-balik>${ik('<path d="M15 6l-6 6 6 6"/>')}<span>Kembali ke daftar</span></button><h3>${esc(nmKab(k))}</h3><small>${esc(PROV[k.slice(0, 2)] || "")}</small></div>${seksiStatus(k)}${seksiKelas(k)}${seksiBmkg()}${seksiDebit(k)}`;
    kv.querySelector(".st-desa")?.addEventListener("toggle", (e) => { if (e.target.open) desaBuka(e.target); }, { once: true });
    muatBmkg(k, 1);
  }

  /* daftar desa kab: dimuat saat dibuka, disaring dan dipotong 50 baris */
  async function desaBuka(det) {
    const k = det.dataset.k, p = k.slice(0, 2), isi = det.querySelector(".st-desa-isi");
    isi.innerHTML = '<p class="st-info">Memuat daftar desa</p>';
    if (!kelasDesa.has(p)) kelasDesa.set(p, await ambil(`/data/kelas_desa/${p}.json`));
    const baris = kelasDesa.get(p)?.kab?.[k];
    if (!baris) { isi.innerHTML = `<p class="st-kosong">${BELUM}</p>`; return; }
    let c = DESA6.includes(state.b) ? state.b : "bnj";
    isi.innerHTML = `<div class="st-desa-ctl"><select aria-label="Bahaya">${DESA6.map((x) => `<option value="${x}"${x === c ? " selected" : ""}>${NAMA[x]}</option>`).join("")}</select><input type="search" placeholder="Cari desa atau kecamatan" aria-label="Cari desa atau kecamatan"></div><div class="st-desa-tb"></div>`;
    const tb = isi.querySelector(".st-desa-tb"), cari = isi.querySelector("input");
    const gambar = () => {
      const i = DESA6.indexOf(c), q = cari.value.trim().toLowerCase();
      const ok = baris.filter((r) => !q || r[1].toLowerCase().includes(q) || r[2].toLowerCase().includes(q)).sort((a, b) => b[3][i] - a[3][i] || a[1].localeCompare(b[1], "id"));
      const br = ok.slice(0, 50).map((r) => `<tr><th scope="row">${esc(r[1])}</th><td>${esc(r[2])}</td><td>${KELAS[+r[3][i]] || BELUM}</td><td>${KELAS[+r[4][i]] || BELUM}</td></tr>`);
      tb.innerHTML = (br.length ? tabel([["Desa"], ["Kecamatan"], ["Baseline"], ["Proyeksi", "Proyeksi, tahun dan skenario tidak tercantum di sumber"]], br, "st-lebar") : '<p class="st-kosong">Tidak ada desa yang cocok.</p>') + `<p class="st-cat">Menampilkan ${angka(Math.min(50, ok.length))} dari ${angka(ok.length)} desa; urut kelas tertinggi. ${chip("sumber", "BNPB InaRISK, kelas bahaya desa")}</p>`;
    };
    isi.querySelector("select").addEventListener("change", (e) => { c = e.target.value; nanti(gambar); });
    let t = 0; cari.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => nanti(gambar), 150); });
    gambar();
  }

  /* prakiraan BMKG per desa: dimuat saat kab dibuka, halaman 50; galat tanpa angka */
  let bm = null;
  async function muatBmkg(k, hal) {
    if (hal === 1) bm = { k, desa: [], hal: 0, sebagian: false, galat: false, lagi: false };
    const mine = bm; mine.hal = hal;
    const j = await ambil(`/api/bmkg/desa?kab=${k}&hal=${hal}`);
    if (bm !== mine) return;
    if (!j || !Array.isArray(j.desa)) mine.galat = true;
    else { mine.galat = false; mine.desa.push(...j.desa); mine.lagi = j.desa.length >= 50; mine.sebagian = mine.sebagian || !!j.antre || j.desa.some((d) => d.antre || d.galat); }
    renderBmkg();
  }
  function ringkasDesa(d) {
    const h = d.hari; if (!Array.isArray(h) || d.antre || d.galat) return null;
    const x = state.h === "ringkas" ? h.slice(0, 4) : [h[+state.h]].filter(Boolean);
    if (!x.length) return null;
    const v = (f) => x.map(f).filter((n) => n != null && Number.isFinite(+n)).map(Number);
    const hj = v((z) => z.hujan_mm), tn = v((z) => z.t_min), tx = v((z) => z.t_maks), an = v((z) => z.angin_maks_kmj);
    return { hujan: hj.length ? hj.reduce((a, b) => a + b, 0) : null, tn: tn.length ? Math.min(...tn) : null, tx: tx.length ? Math.max(...tx) : null, an: an.length ? Math.max(...an) : null };
  }
  function renderBmkg() {
    const w = kv.querySelector(".st-bm"); if (!w || !bm) return;
    const lbl = state.h === "ringkas" ? "ringkas 3 hari (hujan dijumlah, suhu dan angin rentang tertinggi)" : HARI[+state.h].toLowerCase();
    if (bm.galat && !bm.desa.length) { w.innerHTML = `<p class="st-kosong" role="alert">Prakiraan BMKG per desa belum bisa dimuat. Tidak ada angka ditampilkan.</p><button type="button" class="st-ulang" data-ulang>Coba lagi</button>`; return; }
    const br = bm.desa.map((d) => { const r = ringkasDesa(d); const f = (n, x = 0) => angka(n, x) ?? BELUM;
      return `<tr><th scope="row">${esc(d.nama)}${d.kec ? `<small>${esc(d.kec)}</small>` : ""}</th>${r ? `<td>${f(r.hujan, 1)}</td><td>${r.tn != null && r.tx != null ? f(r.tn) + " sampai " + f(r.tx) : BELUM}</td><td>${f(r.an)}</td>` : `<td colspan="3" class="st-kosong">${BELUM}</td>`}</tr>`; });
    w.innerHTML = `${br.length ? tabel([["Desa"], ["Hujan (mm)"], ["Suhu (°C)"], ["Angin (km/jam)"]], br, "st-lebar") : `<p class="st-kosong">${BELUM}</p>`}
<p class="st-cat">Prakiraan ${lbl}. ${chip("sumber", "BMKG; hujan dijumlah dari langkah 3 jam")}</p>${bm.sebagian || bm.galat ? '<p class="st-cat" role="status">Sebagian desa belum dimuat.</p>' : ""}${bm.lagi ? '<button type="button" class="st-ulang" data-lagi>Muat 50 desa berikutnya</button>' : ""}${bm.galat ? '<button type="button" class="st-ulang" data-ulang>Coba lagi</button>' : ""}`;
  }

  /* ---------- tampilan, klik ---------- */
  function tampil() {
    lst.hidden = !!state.kab; kv.hidden = !state.kab;
    if (state.kab) bukaKab(state.kab); else { renderDaftar(); }
  }
  function pilihKab(k, dariDaftar) {
    ctx.ubah({ kab: k });
    nanti(() => { tampil(); tandaPilih(); if (dariDaftar && bb.has(k)) peta?.fitBounds(bb.get(k), { padding: ctx.padPeta(), maxZoom: 9, duration: 500 }); kv.querySelector("[data-balik]")?.focus({ preventScroll: true }); panel.scrollTop = 0; });
  }
  function segarkan() { if (!D) return; hitung(); terapkan(); if (!state.kab) renderDaftar(); else renderBmkg(); }
  panel.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.b != null && t.closest(".st-bhy")) {
      for (const s of t.parentElement.children) s.setAttribute("aria-pressed", String(s === t));
      ctx.ubah({ b: t.dataset.b }); nanti(segarkan);
    } else if (t.dataset.kab) pilihKab(t.dataset.kab, true);
    else if ("balik" in t.dataset) { ctx.ubah({ kab: "" }); nanti(() => { tampil(); tandaPilih(); }); }
    else if ("ulang" in t.dataset && bm) muatBmkg(bm.k, bm.hal || 1);
    else if ("lagi" in t.dataset && bm) muatBmkg(bm.k, bm.hal + 1);
  });
  addEventListener("popstate", () => { if (D && kini) { tandaiHari(); nanti(() => { hitung(); terapkan(); tampil(); tandaPilih(); }); } });

  async function muat() {
    try { await muatDP(); } catch { panel.innerHTML = '<p class="po-galat" role="alert">Bagian ini belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.</p>'; return; }
    DP = globalThis.DampakPeringatan;
    const [status, kelas, debit] = await Promise.all([ambil("/api/dampak-peringatan/status"), ambil("/data/kelas_desa_bnpb.json"), ambil("/banjir/data/debit_kab.json")]);
    if (!status?.kab) { panel.innerHTML = `<h3 class="st-j">${BELUM}</h3><p class="st-info" role="alert">Status prakiraan belum bisa dimuat. Tidak ada angka ditampilkan.</p>`; return; }
    D = { status, kelas, debit };
    panel.replaceChildren(lst, kv);
    hitung(); tampil(); tandaiHari();
    if (kelas?.kab) muatGeo();
  }
  tandaiHari();
  muat();
  main = { aktif(on) {
    kini = on;
    if (!on) berhenti();
    else { tandaiHari(); if (D) nanti(segarkan); }
    if (peta?.getLayer("st-isi")) for (const i of ["st-isi", "st-garis"]) peta.setLayoutProperty(i, "visibility", on ? "visible" : "none");
  } };
  return main;
}
