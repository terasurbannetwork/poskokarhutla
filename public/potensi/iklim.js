/* Tab Iklim (PH-11): ONI dan IOD, peta debit puncak sungai per kab (GloFAS, hipotesis), hari tanpa hujan per kab (ALGORITMA bagian 6 dan 7; D19, Q5, Q6).
   Data apa adanya: /data/iklim.json (oni_status, iod, status, cpc_status), /banjir/data/debit_kab.json, /data/kekeringan_hth.json. Basi tampil abu, kosong tidak pernah 0.
   Rasio terhadap Q2 belum terukur (Q2 titik kab belum ada); debit tidak menaikkan status banjir (Q6). Kartu dan chip dari dampak.js (satu salinan). ctx: lihat app.js. */
import { warnaToken } from "/inti/maplibre.js";
import { esc, nanti, BELUM, muatDP, muatCss, kartu, chip, bbox } from "/potensi/dampak.js";
import { ambil, geoKab } from "/potensi/umum.js";

const HARI = ["Hari ini", "Besok", "Lusa", "Hari ke-3"];
const LANGKAH = [10, 100, 500, 2000]; // m³/detik, batas kelas legenda
const BASI_HTH = 3; // hari
/* ONI dan IOD: nilai indeks sumber, dua desimal seperti yang dilaporkan NOAA dan BoM. Debit bulat, rasio satu desimal. */
const num = (n, d = 2) => (n == null || !Number.isFinite(+n) ? null : (+n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }));
const bertanda = (n) => { const t = num(n); return t == null ? BELUM : (+n > 0 ? "+" : "") + t; };
const tgl = (iso) => { const t = new Date(String(iso).slice(0, 10) + "T00:00:00+07:00"); return Number.isNaN(+t) ? BELUM : t.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }); };
const KAT = ["Rendah", "Menengah", "Tinggi", "Sangat Tinggi"]; // kategori narasi BMKG, urut naik
const PRODUK_BMKG = { "curah-hujan-deterministik": "Curah hujan (deterministik)", "sifat-hujan-deterministik": "Sifat hujan (deterministik)", "curah-hujan-probabilistik-a100": "Peluang lebih dari 100 mm", "curah-hujan-probabilistik-a150": "Peluang lebih dari 150 mm", "curah-hujan-probabilistik-a300": "Peluang lebih dari 300 mm", "curah-hujan-probabilistik-a500": "Peluang lebih dari 500 mm", "curah-hujan-probabilistik-b100": "Peluang kurang dari 100 mm", "curah-hujan-probabilistik-b150": "Peluang kurang dari 150 mm" };
const URL_BMKG = "https://www.bmkg.go.id/iklim/prediksi-hujan-bulanan";
const umurHari = (iso) => Math.floor((Date.now() - new Date(String(iso).slice(0, 10) + "T00:00:00+07:00")) / 864e5);

export function pasang(ctx) {
  const { panel, bawah } = ctx;
  muatCss();
  let DP, I = null, Q = null, H = null, B = null, mode = "debit", peta = null, kini = false, fc = null, geoMuat = false, gm = new Map(), lama = "";
  panel.innerHTML = '<p class="p2-info" role="status">Memuat data iklim</p>';
  const legKat = () => `<ul class="p2-sw" aria-label="Legenda kategori hujan bulanan"><li class="p2-jd">Kategori hujan bulanan menurut narasi BMKG</li>${KAT.map((t, i) => `<li><i class="p2-k p2-c p2-c${i}"></i>${t}${B?.pch_kategori?.rentang?.[t] ? ", " + esc(B.pch_kategori.rentang[t]) : ""}</li>`).join("")}<li><i class="p2-k p2-kn"></i>${BELUM}</li></ul>`;
  const legDebit = () => `<ul class="p2-sw" aria-label="Legenda debit puncak"><li class="p2-jd">Debit puncak, m³/detik</li>${["kurang dari " + LANGKAH[0], LANGKAH[0] + " sampai " + LANGKAH[1], LANGKAH[1] + " sampai " + LANGKAH[2], LANGKAH[2] + " sampai " + LANGKAH[3], "lebih dari " + LANGKAH[3]].map((t, i) => `<li><i class="p2-k p2-q${i}"></i>${t}</li>`).join("")}<li><i class="p2-k p2-kn"></i>${BELUM}</li></ul>`;
  bawah.innerHTML = legDebit();

  const kodeNama = new Map(); // kode kab -> nama, dari kunci "pp|Nama" di data hari tanpa hujan
  const nmKab = (k) => kodeNama.get(k) || "Kab/kota " + k;

  /* ---------- kartu ---------- */
  function kartuSamudra() {
    const o = I?.oni_status, d = I?.iod;
    const blok = (judul, nilai, ket, basi, sumberChip) => `<div class="p2-ind${basi ? " p2-basi" : ""}"><span class="p2-lbl">${esc(judul)}</span><b class="p2-nilai">${esc(nilai)}</b><span class="p2-sub">${esc(ket)}</span>${basi ? chip(DP, "belum", "Data sudah basi, tidak dipakai sebagai kabar terbaru") : sumberChip}</div>`;
    const oni = o && o.nilai != null
      ? blok("ONI (suhu laut Pasifik)", bertanda(o.nilai), `Musim ${o.musim} ${o.tahun}${o.umur_hari != null ? `, ${o.umur_hari} hari lalu` : ""}${o.basi ? ". Data basi" : ""}`, o.basi, chip(DP, "sumber", "NOAA CPC"))
      : blok("ONI (suhu laut Pasifik)", BELUM, "Data belum masuk", true);
    const iod = d && d.nilai != null
      ? blok("IOD (Samudra Hindia)", bertanda(d.nilai), `${d.sumber ? d.sumber + ", " : ""}data ${tgl(d.tgl_data)}${d.umur_hari != null ? `, ${d.umur_hari} hari lalu` : ""}${d.basi ? ". Data basi" : ""}`, d.basi, chip(DP, "sumber", d.sumber || "Sumber IOD"))
      : blok("IOD (Samudra Hindia)", BELUM, "Data belum masuk", true);
    const enso = I?.status || I?.cpc_status || I?.enso
      ? `<p class="p2-info">Status ENSO: <b>${esc(I.status || I.enso || BELUM)}</b>${I.cpc_status && I.cpc_status !== I.status ? `, CPC: ${esc(I.cpc_status)}` : ""}. ${chip(DP, "sumber", "NOAA CPC")}</p>` : "";
    return kartu("Iklim", "Indeks samudra", `<div class="p2-dua">${oni}${iod}</div>${enso}`);
  }

  const kabQ = (k) => Q?.kab?.[k];
  function kartuDebit() {
    const semua = Object.entries(Q?.kab || {}).filter(([, v]) => v?.puncak_m3s != null);
    if (!semua.length) return kartu("Banjir", "Debit sungai per kab/kota", `<p class="p2-kosong">Debit sungai ${BELUM}: berkas belum terbit atau kosong.</p>${chip(DP, "belum")}`);
    const adaRasio = semua.some(([, v]) => v.rasio_q2 != null);
    const atas = semua.sort((a, b) => b[1].puncak_m3s - a[1].puncak_m3s).slice(0, 10);
    const basi = Q.dibuat && umurHari(Q.dibuat) > BASI_HTH;
    return kartu("Banjir", "Debit sungai per kab/kota", `<p class="p2-cat">${Q.hipotesis ? chip(DP, "hipotesis", "Belum lolos uji balik") : ""} ${chip(DP, "sumber", Q.sumber || "Copernicus GloFAS")}</p>
<p class="p2-cat">Puncak debit ansambel rerata, hari ini sampai hari ke-3. Rasio terhadap Q2 (debit ulang dua tahun): ${adaRasio ? "tersedia untuk sebagian kab/kota" : BELUM + ", Q2 titik kab belum ada"}. Debit tidak menaikkan status banjir.${basi ? ` Data belum diperbarui sejak ${esc(tgl(Q.dibuat))}.` : ""}</p>
<div id="ik-kab" class="p2-pilih" role="status"><p class="p2-info">Klik kab/kota di peta untuk melihat debitnya.</p></div>
<ol class="p2-top" aria-label="Debit puncak tertinggi">${atas.map(([k, v]) => `<li><button type="button" data-kab="${k}"><span>${esc(nmKab(k))}</span><b>${num(v.puncak_m3s, 0)}</b></button></li>`).join("")}</ol>`);
  }

  function kartuBmkg() {
    const prod = (B?.produk_hujan?.bulanan || []).filter((p) => PRODUK_BMKG[p.id] && /^https:\/\/dataweb\.bmkg\.go\.id\//.test(p.gambar_step1 || ""));
    const bln = prod[0]?.steps?.[0]?.nama;
    if (!prod.length || !bln) return kartu("Prediksi", "Prediksi hujan bulanan BMKG", `<p class="p2-kosong">Prediksi hujan bulanan BMKG ${BELUM}: berkas belum terbit.</p>${chip(DP, "belum")}`);
    const kk = B.pch_kategori, rilis = kk?.diambil || B.dibuat;
    const opsi = prod.map((p) => `<option value="${esc(p.gambar_step1)}">${esc(PRODUK_BMKG[p.id])}</option>`).join("");
    const kat = kk?.kab && Object.keys(kk.kab).length
      ? `<p class="p2-cat">Kategori hujan bulanan menurut narasi BMKG, ${esc(kk.bulan || bln)}, bukan peluang. Kab/kota yang tidak disebut narasi ${BELUM}.</p>
<div class="p2-bar" role="group" aria-label="Isi peta"><button type="button" class="p2-unduh" data-mode="debit" aria-pressed="true">Peta debit sungai</button><button type="button" class="p2-unduh" data-mode="pch" aria-pressed="false">Peta kategori hujan bulanan</button></div>`
      : `<p class="p2-kosong">Kategori per kab/kota ${BELUM}: narasi BMKG belum terbaca.</p>`;
    return kartu("Prediksi", "Prediksi hujan bulanan BMKG", `<p class="p2-cat">Bulan prediksi ${esc(bln)}, gambar resmi BMKG apa adanya. ${chip(DP, "sumber", "BMKG (dataweb.bmkg.go.id)")} <a href="${URL_BMKG}" target="_blank" rel="noopener">Halaman BMKG</a></p>
<div class="p2-bar"><label for="ik-bmkg-p">Gambar</label><select id="ik-bmkg-p">${opsi}</select></div>
<figure class="p2-gb"><img id="ik-bmkg-g" src="${esc(prod[0].gambar_step1)}" alt="Peta prediksi hujan bulanan BMKG, ${esc(bln)}" loading="lazy" decoding="async"></figure>${kat}`).replace("<h3>", `<h3 title="Sumber BMKG${rilis ? ", diambil " + esc(tgl(rilis)) : ""}">`);
  }

  function kartuHth() {
    if (!H?.kab) return kartu("Kekeringan", "Hari tanpa hujan per kab/kota", `<p class="p2-kosong">Hari tanpa hujan ${BELUM}: berkas belum terbit.</p>${chip(DP, "belum")}`);
    if (!H.hari || umurHari(H.hari) > BASI_HTH) {
      return kartu("Kekeringan", "Hari tanpa hujan per kab/kota", `<p class="p2-kosong">Data hari tanpa hujan belum diperbarui sejak ${esc(H.hari ? tgl(H.hari) : BELUM)}.</p>${chip(DP, "belum", "Data basi tidak ditampilkan sebagai kabar terbaru")}`);
    }
    const baris = Object.values(H.kab).filter((v) => v.maks > 0).sort((a, b) => b.maks - a.maks).slice(0, 15);
    const isi = baris.length
      ? `<div class="ex-tabel"><table><thead><tr><th>Kab/kota</th><th title="Hari berturut-turut terakhir dengan hujan kurang dari ${num(H.ambang_mm, 0)} mm sampai ${esc(tgl(H.hari))}">Hari tanpa hujan</th></tr></thead><tbody>${baris.map((v) => `<tr><th scope="row">${esc(nmKab(v.kode))}</th><td class="n">${v.maks.toLocaleString("id-ID")}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="p2-kosong">Tidak ada kab/kota dengan hari tanpa hujan berturut-turut menurut data ini.</p>`;
    return kartu("Kekeringan", "Hari tanpa hujan per kab/kota", `<p class="p2-cat">Hari tanpa hujan sampai ${esc(tgl(H.hari))}, bukan prakiraan. ${chip(DP, "hitung", "Dihitung dari hujan model Open-Meteo, bukan pos BMKG")}</p>${isi}`);
  }

  const kartuKabDebit = (k) => {
    const v = kabQ(k);
    if (!v || v.puncak_m3s == null) return `<p class="p2-info"><b>${esc(nmKab(k))}</b>: debit ${BELUM}. Kategori hujan bulanan BMKG: ${esc(B?.pch_kategori?.kab?.[k] || BELUM)}.</p>`;
    return `<dl class="p2-kv"><dt>Kab/kota</dt><dd>${esc(nmKab(k))}</dd><dt>Puncak debit</dt><dd>${num(v.puncak_m3s, 0)} m³/detik</dd><dt>Hari puncak</dt><dd>${v.hari_puncak != null ? HARI[v.hari_puncak] || "Hari ke-" + v.hari_puncak : BELUM}</dd><dt>Rasio terhadap Q2</dt><dd>${v.rasio_q2 != null ? num(v.rasio_q2, 1) + "×" : BELUM}</dd><dt>Kategori hujan bulanan BMKG</dt><dd>${esc(B?.pch_kategori?.kab?.[k] || BELUM)}</dd></dl><p class="p2-cat">${chip(DP, "hipotesis", "Debit GloFAS; belum lolos uji balik")}</p>`;
  };
  function pilihKab(k, terbang) {
    const w = panel.querySelector("#ik-kab");
    if (w) w.innerHTML = kartuKabDebit(k);
    if (peta?.getSource("ik-kab")) {
      if (lama) peta.setFeatureState({ source: "ik-kab", id: lama }, { pilih: false });
      peta.setFeatureState({ source: "ik-kab", id: k }, { pilih: true });
    }
    lama = k;
    const g = terbang && gm.get(k); // bbox dihitung hanya untuk kab terpilih
    if (g) peta?.fitBounds(bbox(g.coordinates), { padding: ctx.padPeta(), maxZoom: 9, duration: 500 });
  }

  /* ---------- peta ---------- */
  function pasangLapis(m) {
    peta = m;
    if (!fc || m.getSource("ik-kab")) return;
    const w = warnaToken, q = ["get", "q"];
    m.addSource("ik-kab", { type: "geojson", data: fc, promoteId: "kab" });
    const vis = kini ? "visible" : "none";
    m.addLayer({ id: "ik-isi", type: "fill", source: "ik-kab", layout: { visibility: vis }, paint: {
      "fill-color": ["case", ["<", q, 0], w("--dp-belum"), w("--brand2")],
      "fill-opacity": ["case", ["<", q, 0], 0.35, ["step", q, 0.12, LANGKAH[0], 0.26, LANGKAH[1], 0.42, LANGKAH[2], 0.6, LANGKAH[3], 0.8]] } });
    m.addLayer({ id: "ik-pch", type: "fill", source: "ik-kab", layout: { visibility: "none" }, paint: {
      "fill-color": ["case", ["<", ["get", "c"], 0], w("--dp-belum"), w("--info")],
      "fill-opacity": ["case", ["<", ["get", "c"], 0], 0.35, ["match", ["get", "c"], 0, 0.15, 1, 0.35, 2, 0.6, 0.85]] } });
    m.addLayer({ id: "ik-garis", type: "line", source: "ik-kab", layout: { visibility: vis }, paint: { "line-color": w("--ink2"), "line-width": ["case", ["boolean", ["feature-state", "pilih"], false], 3, 0.4] } });
    if (!m._ikKlik) {
      m._ikKlik = true;
      m.on("click", "ik-isi", (e) => { const k = e.features?.[0]?.properties?.kab; if (k) pilihKab(k, false); });
      m.on("mouseenter", "ik-isi", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "ik-isi", () => (m.getCanvas().style.cursor = ""));
    }
    lama = "";
  }
  ctx.pasangPeta(pasangLapis);

  async function muatGeo() {
    if (geoMuat) return;
    geoMuat = true;
    const kodeAda = [...Object.keys(Q?.kab || {}), ...Object.keys(B?.pch_kategori?.kab || {}), ...Object.values(H?.kab || {}).map((v) => v.kode)];
    const prov = [...new Set(kodeAda.map((k) => String(k).slice(0, 2)))].sort();
    if (!prov.length) { geoMuat = false; return; }
    const gs = await Promise.all(prov.map((p) => geoKab(p)));
    const fitur = [];
    prov.forEach((p, i) => {
      (gs[i]?.features || []).forEach((f, n) => {
        const k = p + String(n + 1).padStart(2, "0"); // kode repo: prov + urutan kab di berkas geo
        const v = Q?.kab?.[k];
        fitur.push({ type: "Feature", geometry: f.geometry, properties: { kab: k, q: v?.puncak_m3s ?? -1, c: KAT.indexOf(B?.pch_kategori?.kab?.[k]) } });
        gm.set(k, f.geometry);
      });
    });
    fc = { type: "FeatureCollection", features: fitur };
    if (peta) pasangLapis(peta);
  }

  function terapkanMode() {
    const pch = mode === "pch";
    bawah.innerHTML = pch ? legKat() : legDebit();
    if (!peta?.getLayer("ik-isi")) return;
    peta.setLayoutProperty("ik-isi", "visibility", kini && !pch ? "visible" : "none");
    peta.setLayoutProperty("ik-pch", "visibility", kini && pch ? "visible" : "none");
  }

  async function muat() {
    try { await muatDP(); } catch { panel.innerHTML = '<p class="po-galat" role="alert">Bagian ini belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.</p>'; return; }
    DP = globalThis.DampakPeringatan;
    [I, Q, H, B] = await Promise.all([ambil("/data/iklim.json"), ambil("/banjir/data/debit_kab.json"), ambil("/data/kekeringan_hth.json"), ambil("/banjir/data/iklim_bmkg.json")]);
    for (const [key, v] of Object.entries(H?.kab || {})) {
      const n = key.split("|")[1]; kodeNama.set(v.kode, n);
    }
    panel.innerHTML = kartuSamudra() + kartuDebit() + kartuBmkg() + kartuHth();
    panel.querySelector(".p2-top")?.addEventListener("click", (e) => { const b = e.target.closest("[data-kab]"); if (b) pilihKab(b.dataset.kab, true); });
    panel.querySelector("#ik-bmkg-p")?.addEventListener("change", (e) => { const g = panel.querySelector("#ik-bmkg-g"); if (g) g.src = e.target.value; });
    panel.querySelector("#ik-bmkg-g")?.addEventListener("error", (e) => e.target.replaceWith(Object.assign(document.createElement("p"), { className: "p2-kosong", textContent: "Gambar BMKG " + BELUM + ": belum bisa dimuat." })));
    panel.querySelector('[aria-label="Isi peta"]')?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]"); if (!b) return;
      mode = b.dataset.mode;
      for (const x of b.parentNode.children) x.setAttribute("aria-pressed", String(x === b));
      terapkanMode();
    });
    if (kini) nanti(muatGeo);
  }
  muat();

  return { aktif(on) {
    kini = on;
    if (on) nanti(muatGeo);
    if (peta?.getLayer("ik-garis")) { peta.setLayoutProperty("ik-garis", "visibility", on ? "visible" : "none"); terapkanMode(); }
  } };
}
