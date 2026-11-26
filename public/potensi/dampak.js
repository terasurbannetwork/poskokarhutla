/* Tab Dampak (PH-11): poligon peringatan BMKG yang aktif di peta, daftar peringatan, keterpaparan per kab (jiwa tiga sumber berdampingan, fasilitas),
   tabel per desa dan CSV untuk staf. Data: GET /api/dampak-peringatan/ringkas dan /desa?kab=. Mesin angka dan kartu dari window.DampakPeringatan
   (inti/dampak_peringatan.js: modelKartu, bulatJiwa, chipFakta) dan tabel desa dari window.DalopsDampak (bnpb/dalops_dampak.js); modul ini hanya menggambar.
   Kosong: "Tidak ada peringatan BMKG yang aktif saat ini", tidak pernah "aman". Teks data lewat textContent. ctx: lihat app.js. */
import { warnaToken } from "/inti/maplibre.js";
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const nanti = (f) => requestAnimationFrame(() => setTimeout(f, 0));
export const ambil = (u) => fetch(u, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
export const BELUM = "belum terukur";
const tunda = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));
const pasangSkrip = (src, kunci) => (globalThis[kunci] ? Promise.resolve() : new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = gagal; document.head.append(s); }));
export const muatDP = () => pasangSkrip("/inti/dampak_peringatan.js", "DampakPeringatan");
/* sementara sebelum <link> dipasang sesi induk di index.html */
export function muatCss() {
  if (!document.querySelector('link[href^="/potensi/peta2.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/potensi/peta2.css"; document.head.append(l); }
}
export const kartu = (ey, judul, isi) => `<section class="ex ex-std p2-kartu"><header class="ex-hd"><span class="ex-ey">${esc(ey)}</span><div class="ex-jd"><h3>${esc(judul)}</h3></div></header><div class="ex-bd">${isi}</div></section>`;
export const chip = (DP, j, t) => { const c = DP.chipFakta(j); return `<span class="p2-chip ${c.kelas}"${t ? ` title="${esc(t)}"` : ""}>${c.label}</span>`; };
export function bbox(koor) {
  let a = 180, b = 90, c = -180, d = -90;
  (function jalan(x) { if (typeof x[0] === "number") { a = Math.min(a, x[0]); c = Math.max(c, x[0]); b = Math.min(b, x[1]); d = Math.max(d, x[1]); } else for (const y of x) jalan(y); })(koor);
  return [[a, b], [c, d]];
}
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
    const d = panel.querySelector(`details[data-i="${i}"]`);
    if (d) { if (!daftar) { d.open = true; d.scrollIntoView({ block: "nearest" }); } else d.open = true; }
    const f = fc?.features.find((x) => x.id === i);
    if (f && peta) peta.fitBounds(bbox(f.geometry.coordinates), { padding: ctx.padPeta(), maxZoom: 11, duration: 500 });
  }

  /* ---------- panel ---------- */
  function isiPeringatan(p) {
    const kodes = (p.bahaya || []).map((c) => String(c).toUpperCase());
    const kabs = (p.kab || []);
    if (!kabs.length) return `<p class="p2-info">Peringatan ini belum terpetakan ke kab/kota: keterpaparan ${BELUM}.</p>`;
    const blok = kabs.map((k) => {
      if (!kodes.length) return `<div class="p2-kab"><h4>${esc(namaKab(k))}</h4><p class="p2-info">Penduduk dan fasilitas ${BELUM}: peringatan ini tidak dipetakan ke banjir atau longsor.</p></div>`;
      const baris = kodes.map((c) => {
        if (!R.kab?.[k]?.bahaya?.[c]) return `<li><b>${esc(namaB(c))}</b>: ${BELUM}</li>`;
        const m = DP.modelKartu(k, c.toLowerCase(), { ringkas: R });
        return `<li><b>${esc(namaB(c))}</b><span class="p2-sub">Penduduk di area peringatan: ${esc(m.penduduk.join("; "))}</span><span class="p2-sub">Fasilitas yang terpeta: ${esc(m.fasilitas.join("; "))}</span></li>`;
      }).join("");
      return `<div class="p2-kab"><h4>${esc(namaKab(k))}</h4><ul>${baris}</ul></div>`;
    }).join("");
    return `<p class="p2-cat">${chip(DP, "sumber", "Poligon dan waktu berlaku dari BMKG")} ${chip(DP, "hitung", "Penduduk dan fasilitas dihitung dari irisan area peringatan dengan desa")}</p>${blok}<p class="p2-cat">Tiga sumber jiwa ditampilkan berdampingan, tidak dijumlah, dan bukan jiwa terpapar aturan dampak.</p>`;
  }

  function daftar() {
    const P = R.peringatan || [];
    const basi = R.umpan && R.umpan !== "segar";
    const cap = R.umpan_cap ? ` Umpan terakhir ${esc(waktu(R.umpan_cap))}.` : "";
    const catatan = basi ? `<p class="p2-info" role="status">Umpan peringatan BMKG belum segar.${cap}</p>` : "";
    const tak = R.tak_dipetakan?.n > 0 ? `<p class="p2-info">${R.tak_dipetakan.n} peringatan belum bisa dipetakan ke kab/kota.</p>` : "";
    const isi = P.length
      ? `<ol class="p2-daftar">${P.map((p, i) => `<li><details data-i="${i}"><summary><span class="p2-ev">${esc(p.event || "Peringatan BMKG")}</span><span class="p2-sub">${esc((p.bahaya || []).map(namaB).join(", ") || "Tidak dipetakan ke banjir atau longsor")}${p.wilayah ? ", " + esc(p.wilayah) : ""}</span><span class="p2-sub">Berlaku sampai ${esc(waktu(p.berlaku_sampai))}</span></summary><div class="p2-isi" data-kosong="1"></div></details></li>`).join("")}</ol>`
      : `<p class="p2-kosong">Tidak ada peringatan BMKG yang aktif saat ini.</p>`;
    panel.innerHTML = kartu("BMKG", `Peringatan aktif${P.length ? ", " + P.length.toLocaleString("id-ID") : ""}`, catatan + isi + tak);
    panel.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => {
      if (!d.open) return;
      const i = +d.dataset.i, w = d.querySelector(".p2-isi");
      if (w.dataset.kosong) { w.removeAttribute("data-kosong"); w.innerHTML = isiPeringatan(P[i]); }
      if (lama !== i) nanti(() => pilih(i, true));
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
