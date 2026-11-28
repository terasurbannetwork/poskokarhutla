/* Tab Dampak (PH-11): poligon peringatan BMKG yang aktif di peta, daftar peringatan, keterpaparan per kab (jiwa tiga sumber berdampingan, fasilitas),
   tabel per desa dan CSV untuk staf. Data: GET /api/dampak-peringatan/ringkas dan /desa?kab=. Mesin angka dan kartu dari window.DampakPeringatan
   (inti/dampak_peringatan.js: modelKartu, bulatJiwa, chipFakta) dan tabel desa dari window.DalopsDampak (bnpb/dalops_dampak.js); modul ini hanya menggambar.
   Kosong: "Tidak ada peringatan BMKG yang aktif saat ini", tidak pernah "aman". Teks data lewat textContent. ctx: lihat app.js. */
import { warnaToken } from "/inti/maplibre.js";
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
import { nanti, ambil, bbox } from "/potensi/umum.js";
import { PROV } from "/potensi/analisis.js";
export { nanti, ambil, bbox };
export const BELUM = "belum terukur";
const tunda = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));
const pasangSkrip = (src, kunci) => (globalThis[kunci] ? Promise.resolve() : new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = gagal; document.head.append(s); }));
export const muatDP = () => pasangSkrip("/inti/dampak_peringatan.js", "DampakPeringatan");
/* sementara sebelum <link> dipasang sesi induk di index.html */
export function muatCss() {
  if (!document.querySelector('link[href^="/potensi/peta2.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/potensi/peta2.css?v=2"; document.head.append(l); }
}
export const kartu = (ey, judul, isi) => `<section class="ex ex-std p2-kartu"><header class="ex-hd"><span class="ex-ey">${esc(ey)}</span><div class="ex-jd"><h3>${esc(judul)}</h3></div></header><div class="ex-bd">${isi}</div></section>`;
export const chip = (DP, j, t) => { const c = DP.chipFakta(j); return `<span class="p2-chip ${c.kelas}"${t ? ` title="${esc(t)}"` : ""}>${c.label}</span>`; };
const waktu = (iso) => { const t = new Date(iso); return Number.isNaN(+t) ? BELUM : t.toLocaleString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB"; };

export function pasang(ctx) {
  const { panel, bawah } = ctx;
  muatCss();
  let DP, R = null, peta = null, kini = false, fc = null, sudahFit = false, stafKab = [];
  panel.innerHTML = '<p class="p2-info" role="status">Memuat peringatan BMKG</p>';
  bawah.innerHTML = '<ul class="p2-sw" aria-label="Legenda peta"><li><i class="p2-k p2-k-pol"></i>Area peringatan BMKG yang aktif</li></ul>';

  const namaKab = (k) => R.kab?.[k]?.nama || "Kab/kota " + k;
  const namaB = (c) => DP.BAHAYA[String(c).toLowerCase()] || c;

  /* ---------- peta ---------- */
  function pasangLapis(m) {
    peta = m;
    if (!fc || m.getSource("dm-pol")) return;
    const w = warnaToken;
    m.addSource("dm-pol", { type: "geojson", data: fc });
    const vis = kini ? "visible" : "none";
    m.addLayer({ id: "dm-isi", type: "fill", source: "dm-pol", layout: { visibility: vis }, paint: { "fill-color": w("--brand2"), "fill-opacity": ["case", ["boolean", ["feature-state", "pilih"], false], 0.4, 0.18] } });
    m.addLayer({ id: "dm-garis", type: "line", source: "dm-pol", layout: { visibility: vis }, paint: { "line-color": w("--brand2"), "line-width": ["case", ["boolean", ["feature-state", "pilih"], false], 3, 1.6], "line-dasharray": [2, 1] } });
    if (!m._dmKlik) {
      m._dmKlik = true;
      m.on("click", "dm-isi", (e) => { const i = e.features?.[0]?.id; if (i != null) pilih(i, false); });
      m.on("mouseenter", "dm-isi", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "dm-isi", () => (m.getCanvas().style.cursor = ""));
    }
    if (kini) fitSemua();
  }
  ctx.pasangPeta(pasangLapis);

  function fitSemua() {
    if (sudahFit || !peta || !fc?.features.length) return;
    sudahFit = true;
    const bb = bbox(fc.features.map((f) => f.geometry.coordinates));
    peta.fitBounds(bb, { padding: ctx.padPeta(), maxZoom: 9, duration: 600 });
  }

  let lama = null;
  function pilih(i, daftar) {
    if (peta?.getSource("dm-pol")) {
      if (lama != null) peta.setFeatureState({ source: "dm-pol", id: lama }, { pilih: false });
      peta.setFeatureState({ source: "dm-pol", id: i }, { pilih: true });
    }
    lama = i;
    panel.querySelectorAll("details[data-pilih]").forEach((x) => x.removeAttribute("data-pilih"));
    const ds = [...panel.querySelectorAll(`details[data-is~="${i}"]`)];
    ds.forEach((x) => x.setAttribute("data-pilih", ""));
    /* dari peta: buka provinsi dan kab/kota pertama yang kena peringatan ini; dari daftar: baris yang diklik sudah terbuka */
    if (ds[0] && !daftar) { const pv = ds[0].closest(".p2-pv"); if (pv) pv.open = true; ds[0].open = true; ds[0].scrollIntoView({ block: "nearest" }); }
    const f = fc?.features.find((x) => x.id === i);
    if (f && peta) peta.fitBounds(bbox(f.geometry.coordinates), { padding: ctx.padPeta(), maxZoom: 11, duration: 500 });
  }

  /* ---------- panel: provinsi > kab/kota > peringatan ---------- */
  /* keterpaparan satu kab/kota untuk satu peringatan */
  function isiKab(k, p) {
    const kodes = (p.bahaya || []).map((c) => String(c).toUpperCase());
    if (!kodes.length) return `<p class="p2-info">Penduduk dan fasilitas ${BELUM}: peringatan ini tidak dipetakan ke banjir atau longsor.</p>`;
    return `<ul class="p2-bh">${kodes.map((c) => {
      if (!R.kab?.[k]?.bahaya?.[c]) return `<li><b>${esc(namaB(c))}</b>: ${BELUM}</li>`;
      const m = DP.modelKartu(k, c.toLowerCase(), { ringkas: R });
      return `<li><b>${esc(namaB(c))}</b><span class="p2-sub" title="Tiga sumber jiwa berdampingan, tidak dijumlah, dan bukan jiwa terpapar aturan dampak">Penduduk di area peringatan: ${esc(m.penduduk.join("; "))}</span><span class="p2-sub">Fasilitas yang terpeta: ${esc(m.fasilitas.join("; "))}</span></li>`;
    }).join("")}</ul>`;
  }

  const judul = (t) => String(t || "").toLocaleLowerCase("id-ID").replace(/(^|[\s(\-])(\p{L})/gu, (_, a, c) => a + c.toLocaleUpperCase("id-ID"));
  /* ikon garis 24px: awan petir dan awan hujan; warna ikut tingkat peringatan lewat --dp-w */
  const IKON = { petir: "M7 16a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 7a4.5 4.5 0 0 1 .5 8.97|M13 12l-3 5h4l-3 5", hujan: "M7 15a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 6a4.5 4.5 0 0 1 .5 8.97|M8 18l-1 3M12 18l-1 3M16 18l-1 3" };
  const svg = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.split("|").map((x) => `<path d="${x}"/>`).join("")}</svg>`;
  const jam = (iso) => { const t = new Date(iso); if (Number.isNaN(+t)) return BELUM; const m = String(iso).match(/([+-])(\d\d):/), z = m ? ({ "+07": "WIB", "+08": "WITA", "+09": "WIT" })[m[1] + m[2]] : ""; return "Hingga " + String(iso).slice(11, 16).replace(":", ".") + " " + (z || "WIB"); };
  const tk = (t) => Number.isInteger(t) ? `<span class="p2-tk" style="--dp-w:var(${DP.token(t)})">${esc(DP.namaTingkat(t))}</span>` : "";
  const puncak = (is, P) => is.reduce((m, i) => (Number.isInteger(P[i].tingkat_bmkg) && P[i].tingkat_bmkg > (m ?? -1) ? P[i].tingkat_bmkg : m), null);
  /* satu baris peringatan di dalam kab/kota: ikon, jenis, tingkat, jam; isi keterpaparan untuk kab ini bila k ada */
  function barisP(P, i, k) {
    const p = P[i], kec = String(p.wilayah || "").split(",").map((x) => judul(x.trim())).filter(Boolean);
    return `<li class="p2-pr" style="--dp-w:var(${DP.token(p.tingkat_bmkg)})"><div class="p2-pr-a"><span class="p2-ik">${svg(/petir/i.test(p.event) ? IKON.petir : IKON.hujan)}</span><span class="p2-ev">${esc(p.event || "Peringatan BMKG")}</span>${tk(p.tingkat_bmkg)}<span class="p2-jam">${esc(jam(p.berlaku_sampai))}</span></div>${kec.length ? `<p class="p2-kc">Kecamatan dalam peringatan: ${esc(kec.join(", "))}</p>` : ""}${k ? isiKab(k, p) : ""}</li>`;
  }
  function daftar() {
    const P = R.peringatan || [];
    const basi = R.umpan && R.umpan !== "segar";
    const cap = R.umpan_cap ? ` Umpan terakhir ${esc(waktu(R.umpan_cap))}.` : "";
    const catatan = basi ? `<p class="p2-info" role="status">Umpan peringatan BMKG belum segar.${cap}</p>` : "";
    const tak = R.tak_dipetakan?.n > 0 ? `<p class="p2-info">${R.tak_dipetakan.n} peringatan belum bisa dipetakan ke kab/kota.</p>` : "";
    /* kab -> indeks peringatan; prov -> kab */
    const perKab = new Map(), tanpaKab = [];
    P.forEach((p, i) => { const ks = p.kab || []; if (!ks.length) tanpaKab.push(i); for (const k of ks) { if (!perKab.has(k)) perKab.set(k, []); perKab.get(k).push(i); } });
    const perProv = new Map();
    for (const k of perKab.keys()) { const pv = String(k).slice(0, 2); if (!perProv.has(pv)) perProv.set(pv, []); perProv.get(pv).push(k); }
    const namaPv = (pv) => PROV[pv] || "Provinsi " + pv;
    const urutKab = (a, b) => (puncak(perKab.get(b), P) ?? -1) - (puncak(perKab.get(a), P) ?? -1) || namaKab(a).localeCompare(namaKab(b), "id");
    const provs = [...perProv.entries()].sort((a, b) => b[1].length - a[1].length || namaPv(a[0]).localeCompare(namaPv(b[0]), "id"));
    const kabHtml = (k) => { const is = perKab.get(k); return `<li><details class="p2-kd" data-k="${esc(k)}" data-is="${is.join(" ")}"><summary><span class="p2-kn">${esc(namaKab(k))}</span>${tk(puncak(is, P))}<span class="p2-num">${is.length}</span></summary><ol class="p2-pl" data-kosong="1"></ol></details></li>`; };
    const provHtml = ([pv, ks], n) => { const is = [...new Set(ks.flatMap((k) => perKab.get(k)))]; ks.sort(urutKab);
      return `<li><details class="p2-pv" data-is="${is.join(" ")}"><summary><span class="p2-no">${n + 1}</span><span class="p2-pn">${esc(namaPv(pv))}</span><span class="p2-num">${ks.length}</span><span class="p2-num">${is.length}</span></summary><ol class="p2-kl">${ks.map(kabHtml).join("")}</ol></details></li>`; };
    const lepas = tanpaKab.length ? `<h4 class="p2-gr">Belum terpetakan ke kab/kota <span>${tanpaKab.length}</span></h4><ol class="p2-pl p2-lepas">${tanpaKab.map((i) => barisP(P, i, null)).join("")}</ol>` : "";
    const isi = P.length ? `<div class="p2-th" aria-hidden="true"><span></span><span>Provinsi</span><span title="Jumlah kab/kota dalam area peringatan">Kab/kota</span><span title="Jumlah peringatan BMKG aktif">Peringatan</span></div><ol class="p2-prov">${provs.map(provHtml).join("")}</ol>${lepas}` : `<p class="p2-kosong">Tidak ada peringatan BMKG yang aktif saat ini.</p>`;
    panel.innerHTML = `<section class="ex ex-std p2-kartu"><header class="ex-hd"><span class="ex-ey">BMKG</span><div class="ex-jd"><h3>Peringatan BMKG aktif${P.length ? ` <span class="p2-n">${P.length.toLocaleString("id-ID")}</span>` : ""}</h3></div></header><div class="ex-bd">${catatan + isi + tak}</div></section>`;
    panel.querySelectorAll("details.p2-kd").forEach((d) => d.addEventListener("toggle", () => {
      if (!d.open) return;
      const is = d.dataset.is.split(" ").map(Number), w = d.querySelector(".p2-pl");
      if (w.dataset.kosong) { w.removeAttribute("data-kosong"); w.innerHTML = is.map((i) => barisP(P, i, d.dataset.k)).join(""); }
      if (!is.includes(lama)) nanti(() => pilih(is[0], true));
    }));
  }

  /* ---------- staf: tabel per desa ---------- */
  async function staf() {
    const kabs = [...new Set((R.peringatan || []).flatMap((p) => p.kab || []))];
    if (!kabs.length) return;
    let r;
    try { r = await fetch("/api/dampak-peringatan/desa?kab=" + kabs[0], { credentials: "same-origin" }); } catch { return; }
    if (!r.ok) return; // tanpa sesi staf: bagian ini tidak ada
    try { await pasangSkrip("/bnpb/dalops_dampak.js", "DalopsDampak"); } catch { return; }
    const DD = globalThis.DalopsDampak;
    const wad = document.createElement("div");
    wad.innerHTML = kartu("Staf", "Penduduk dan fasilitas per desa", `<div class="p2-bar"><label for="dm-kab">Kabupaten/kota</label><select id="dm-kab">${kabs.map((k) => `<option value="${k}">${esc(namaKab(k))}</option>`).join("")}</select><button type="button" class="p2-unduh" disabled aria-label="Unduh CSV tabel desa" title="Unduh CSV tabel desa">Unduh CSV</button></div><p class="p2-info" role="status"></p><div class="ex-tabel p2-lebar"><table><thead><tr>${DD.KOLOM.map((k) => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead><tbody></tbody></table></div>`);
    panel.append(wad.firstElementChild);
    const sel = panel.querySelector("#dm-kab"), tb = panel.querySelector(".p2-lebar tbody"), inf = panel.querySelector(".p2-bar+.p2-info"), btn = panel.querySelector(".p2-unduh");
    let gen = 0, baris = [];
    async function muatDesa(k4, awal) {
      const n = ++gen; tb.replaceChildren(); baris = []; btn.disabled = true; inf.textContent = "Memuat desa";
      const d = awal && k4 === kabs[0] ? await r.clone().json().catch(() => null) : await ambil("/api/dampak-peringatan/desa?kab=" + k4);
      if (n !== gen) return;
      if (!d || d.belum_terukur) return void (inf.textContent = "Desa " + BELUM + ": " + (d?.alasan || "keluaran kab ini belum terbit") + ".");
      const kodes = [...new Set((R.peringatan || []).filter((p) => (p.kab || []).includes(k4)).flatMap((p) => p.bahaya || []))].map((c) => String(c).toUpperCase());
      const per = {};
      for (const c of kodes) for (const x of DD.urutDesa(d.bahaya?.[c])) per[x.kode ?? x.nama] ??= x;
      const dft = DD.urutDesa(Object.keys(per).length ? per : null);
      if (!dft.length) return void (inf.textContent = "Tidak ada desa di area peringatan untuk kab/kota ini.");
      inf.textContent = `${dft.length.toLocaleString("id-ID")} desa di area peringatan, urut penduduk terbesar.`;
      baris = dft.map((x) => DD.barisDesa(x, DP.bulatJiwa)); btn.disabled = false;
      for (let i = 0; i < baris.length; i += 100) {
        if (n !== gen) return;
        const f = document.createDocumentFragment();
        for (const b of baris.slice(i, i + 100)) { const tr = document.createElement("tr"); b.forEach((t, j) => { const td = document.createElement("td"); if (j && j < 10) td.className = "n"; td.textContent = t; tr.append(td); }); f.append(tr); }
        tb.append(f); await tunda();
      }
    }
    sel.addEventListener("change", () => muatDesa(sel.value, false));
    btn.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([DD.csv(baris)], { type: "text/csv;charset=utf-8" })); a.download = `dampak-peringatan-${sel.value}.csv`;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
    muatDesa(kabs[0], true);
  }

  async function muat() {
    try { await muatDP(); } catch { panel.innerHTML = '<p class="po-galat" role="alert">Bagian ini belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.</p>'; return; }
    DP = globalThis.DampakPeringatan;
    R = await ambil("/api/dampak-peringatan/ringkas");
    if (!R || R.belum_terukur || !Array.isArray(R.peringatan)) { panel.innerHTML = kartu("BMKG", "Peringatan aktif", `<p class="p2-kosong">Peringatan BMKG ${BELUM}: data belum bisa dimuat. Tidak ada angka ditampilkan.</p>`); return; }
    fc = { type: "FeatureCollection", features: R.peringatan.flatMap((p, i) => (p.poligon?.length ? [{ type: "Feature", id: i, properties: { i }, geometry: { type: "MultiPolygon", coordinates: p.poligon.map((r) => [r]) } }] : [])) };
    daftar();
    if (peta) pasangLapis(peta);
    nanti(staf);
  }
  muat();

  return { aktif(on) {
    kini = on;
    if (peta?.getLayer("dm-isi")) { for (const i of ["dm-isi", "dm-garis"]) peta.setLayoutProperty(i, "visibility", on ? "visible" : "none"); if (on) fitSemua(); }
  } };
}
