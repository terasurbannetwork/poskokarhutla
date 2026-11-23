"use strict";
/* Cermin InaRISK /bnpb/inarisk (data/kajian-bnpb/inarisk/): navigasi bagian lewat hash, pemuat data bersama, tab IRBI.
   Butuh format.js ($, esc), tip.js, inarisk_hitung.js (InariskHitung). Tab lain mendaftar lewat Ir.tab[nama] = {pasang}. */
const Ir = (() => {
  const H = InariskHitung;
  const DATA = "/data/inarisk/";
  const NAMA_BAHAYA = {total: "Semua jenis bahaya", gempabumi: "Gempa bumi", tsunami: "Tsunami", banjir: "Banjir", longsor: "Tanah longsor",
    gunungapi: "Letusan gunung api", karlahut: "Kebakaran hutan dan lahan", kekeringan: "Kekeringan", cuaca_ekstrem: "Cuaca ekstrem", abrasi: "Gelombang ekstrem dan abrasi"};
  const tab = {};
  const cache = {};
  /* satu janji per berkas: tab dan dialog yang meminta berkas sama tidak menarik dua kali */
  const muat = nama => cache[nama] ??= fetch(DATA + nama, {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const api = (jalur, opsi) => fetch("/api/inarisk/" + jalur, opsi).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.galat || "Sumber InaRISK tidak menjawab"); return j; });
  /* token (oklch) -> rgb lewat kanvas: MapLibre belum mengurai oklch */
  const kanvas = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
  const warna = k => {
    kanvas.clearRect(0, 0, 1, 1); kanvas.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(k).trim(); kanvas.fillRect(0, 0, 1, 1);
    const [r, g, b] = kanvas.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`;
  };
  const kelasCss = k => k ? "k-" + k.toLowerCase() : "k-kosong";
  const pil = k => `<span class="ir-pil ${kelasCss(k)}">${esc(k || "Tanpa skor")}</span>`;
  const isiOpsi = (sel, pasangan, awal) => { sel.innerHTML = (awal ? `<option value="">${esc(awal)}</option>` : "") + pasangan.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join(""); };
  /* pemilih kab yang bergantung pada provinsi (dipakai IRBI, IKD, Unduhan) */
  function rantaiProvKab(selProv, selKab, kab, prov) {
    isiOpsi(selProv, Object.entries(prov).sort((a, b) => a[0].localeCompare(b[0])), "Semua provinsi");
    const ganti = () => {
      const p = selProv.value;
      selKab.disabled = !p;
      isiOpsi(selKab, p ? Object.entries(kab).filter(([k]) => k.startsWith(p)).sort((a, b) => a[1][0].localeCompare(b[1][0], "id")).map(([k, v]) => [k, v[0]]) : [],
        p ? "Semua kabupaten/kota" : "Pilih provinsi dulu");
    };
    selProv.addEventListener("change", ganti);
    ganti();
  }
  /* bagian aktif dari hash; tab dipasang malas saat pertama dibuka */
  function tampil() {
    const nama = (location.hash.slice(1) || "irbi").split("/")[0];
    const ada = document.querySelector(`.ir-bag[data-bag="${CSS.escape(nama)}"]`) ? nama : "irbi";
    for (const s of document.querySelectorAll(".ir-bag")) s.hidden = s.dataset.bag !== ada;
    for (const a of document.querySelectorAll(".ir-nav a")) a.toggleAttribute("aria-current", a.hash === "#" + ada) && a.setAttribute("aria-current", "page");
    document.querySelector(".ir-nav a[aria-current]")?.scrollIntoView({block: "nearest", inline: "nearest"});
    const t = tab[ada];
    if (t && !t.sudah) { t.sudah = true; t.pasang(); }
    t?.tampil?.();
  }
  /* dialog: cadangan light dismiss untuk peramban tanpa closedby (Safari) */
  function pasangDialog(d) {
    if (!("closedBy" in HTMLDialogElement.prototype)) d.addEventListener("click", e => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) d.close();
    });
    d.addEventListener("click", e => { if (e.target.closest("[data-tutup]")) d.close(); });
  }
  addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("dialog").forEach(pasangDialog);
    pasangTip();
    addEventListener("hashchange", tampil);
    tampil();
  });
  /* kerja berat sesudah frame berikut tercat (INP): chrome kontrol bereaksi dulu */
  const nanti = fn => { let s = 0; const go = () => { if (!s++) fn(); }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  const tanggal = (x, o = {day: "numeric", month: "long", year: "numeric"}) => { const t = Date.parse(x); return Number.isNaN(t) ? "–" : new Date(t).toLocaleDateString("id-ID", o); };
  return {H, NAMA_BAHAYA, tab, muat, api, warna, kelasCss, pil, isiOpsi, rantaiProvKab, nanti, tanggal};
})();

/* ===== tab IRBI ===== */
Ir.tab.irbi = {
  pasang() {
    const {H} = Ir, $t = $("#irTahun"), $b = $("#irBahaya"), $p = $("#irProv"), $k = $("#irKab");
    const st = {d: null, peta: null, siap: false};
    const nyatakan = pesan => { $("#irAngka").innerHTML = `<p class="ir-p" role="status">${esc(pesan)}</p>`; };
    nyatakan("Memuat data IRBI…");
    Promise.all([Ir.muat("irbi.json"), Ir.muat("kab.geojson")]).then(([d, geo]) => {
      st.d = d; st.geo = geo;
      Ir.isiOpsi($t, [...d.tahun].reverse().map(t => [t, t]));
      Ir.isiOpsi($b, d.kolom.map(k => [k, Ir.NAMA_BAHAYA[k] || k]));
      Ir.rantaiProvKab($p, $k, d.kab, d.prov);
      $("#irKaki").textContent = `Sumber: InaRISK BNPB, ditarik ${Ir.tanggal(d.dibuat)}.`;
      for (const el of [$t, $b, $p, $k]) el.addEventListener("change", segarkan);
      $("#irReset").addEventListener("click", () => { $t.selectedIndex = 0; $b.selectedIndex = 0; $p.value = ""; $p.dispatchEvent(new Event("change")); segarkan(); });
      for (const id of ["#irBaris", "#irBskBaris", "#irSimBaris"]) $(id).addEventListener("click", e => { const b = e.target.closest("[data-kab]"); if (b) Ir.bukaDetail(b.dataset.kab, filter()); });
      pasangPeta(geo);
      gambar();
    }).catch(() => nyatakan("Data IRBI belum tersedia. Coba muat ulang halaman nanti."));
    Ir.api("unduhan?search=irbi&per_page=3&sort=Terbaru").then(j => {
      const baris = j.data?.rows || [];
      $("#irDok").innerHTML = baris.length ? baris.map(r => `<li><a href="${escUrl(urlBerkas(r.file_url))}" target="_blank" rel="noopener noreferrer"><i>${esc(String(r.file_format || "").toUpperCase())}</i><span>${esc(r.title)}<small>${esc(String(r.file_format || "").toUpperCase())}, ${esc(r.file_size || "")}</small></span></a></li>`).join("") : `<li class="ir-p">Belum ada dokumen.</li>`;
    }).catch(e => { $("#irDok").innerHTML = `<li class="ir-p">${esc(e.message)}</li>`; });

    const filter = () => ({tahun: +$t.value, kolom: $b.value, prov: $p.value, kab: $k.value});

    function pasangPeta(geo) {
      if (!window.maplibregl) return;
      const M = st.peta = new maplibregl.Map({container: "irPeta", style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]],
        fitBoundsOptions: {padding: 12}, attributionControl: {compact: true}, dragRotate: false});
      M.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-left");
      M.on("load", () => {
        M.addSource("kab", {type: "geojson", data: geo, promoteId: "pcode"});
        const w = k => Ir.warna(k);
        M.addLayer({id: "kab-isi", type: "fill", source: "kab", paint: {"fill-opacity": 0.82,
          "fill-color": ["match", ["feature-state", "k"], "Tinggi", w("--bad"), "Sedang", w("--warn"), "Rendah", w("--ok"), w("--line")]}});
        M.addLayer({id: "kab-garis", type: "line", source: "kab", paint: {"line-color": w("--card"), "line-width": ["case", ["boolean", ["feature-state", "pilih"], false], 2.5, 0.4]}});
        st.siap = true;
        warnaiPeta();
        const pop = new maplibregl.Popup({closeButton: false, closeOnClick: false, className: "ir-pop"});
        let pAkhir = "";
        M.on("mousemove", "kab-isi", e => {
          const f = e.features[0], p = f.properties.pcode;
          if (p === pAkhir) { pop.setLngLat(e.lngLat); return; }   // kab sama: geser saja, tanpa membangun ulang isi
          pAkhir = p;
          const {tahun, kolom} = filter(), s = H.skor(st.d, p, tahun, kolom);
          M.getCanvas().style.cursor = "pointer";
          pop.setLngLat(e.lngLat).setHTML(`<b>${esc(st.d.kab[p]?.[0] || f.properties.nama)}</b><br>${esc(H.angka2(s))} ${esc(H.kelas(s, kolom, tahun) || "")}`).addTo(M);
        });
        M.on("mouseleave", "kab-isi", () => { pAkhir = ""; M.getCanvas().style.cursor = ""; pop.remove(); });
        M.on("click", "kab-isi", e => Ir.bukaDetail(e.features[0].properties.pcode, filter()));
      });
    }
    function warnaiPeta() {
      if (!st.siap) return;
      const {tahun, kolom, prov, kab} = filter(), M = st.peta;
      for (const p of Object.keys(st.d.kab)) {
        const tampak = (!prov || p.startsWith(prov));
        M.setFeatureState({source: "kab", id: p}, {k: tampak ? H.kelas(H.skor(st.d, p, tahun, kolom), kolom, tahun) : null, pilih: p === kab});
      }
    }
    function bingkai(prov, kab) {
      if (!st.siap) return;
      const kode = kab || prov;
      if (kode === st.kodeBingkai) return;   // ganti tahun atau bahaya tidak menggeser peta
      st.kodeBingkai = kode;
      if (!kode) { st.peta.fitBounds([[94.8, -11.2], [141.2, 6.2]], {padding: 12, duration: 500}); return; }
      const b = new maplibregl.LngLatBounds();
      for (const f of st.geo.features) if (String(f.properties.pcode).startsWith(kode)) for (const c of f.geometry.coordinates.flat(f.geometry.type === "MultiPolygon" ? 2 : 1)) b.extend(c);
      if (!b.isEmpty()) st.peta.fitBounds(b, {padding: 24, duration: 500, maxZoom: 9});
    }

    function gambar() {
      const {tahun, kolom, prov, kab} = filter(), d = st.d;
      const daftar = H.urut(d, tahun, kolom, prov);
      const r = H.ringkas(daftar, kolom, tahun);
      const nasional = H.ringkas(H.urut(d, tahun, kolom), kolom, tahun);
      const wil = prov ? d.prov[prov] : "Indonesia";
      const kartu = (judul, isi, cls = "") => `<section class="ir-a ${cls}"><h2>${judul}</h2>${isi}</section>`;
      const namaKab = x => esc(d.kab[x.pcode]?.[0] || x.pcode);
      $("#irAngka").innerHTML = r.n ? [
        kartu(`Indeks risiko ${prov ? "provinsi" : "bencana Indonesia"}`, `<p class="ir-a-n">${H.angka2(r.rerata)}</p>${Ir.pil(H.kelas(r.rerata, kolom, tahun))}<p class="ir-a-k">${esc(wil)}, ${esc(Ir.NAMA_BAHAYA[kolom].toLowerCase())}, ${tahun}</p>`, "ir-a-utama"),
        kartu("Risiko tertinggi", `<p class="ir-a-nm">${namaKab(r.tertinggi)}</p><p class="ir-a-m">${H.angka2(r.tertinggi.skor)} ${Ir.pil(H.kelas(r.tertinggi.skor, kolom, tahun))}</p>`),
        kartu("Risiko terendah", `<p class="ir-a-nm">${namaKab(r.terendah)}</p><p class="ir-a-m">${H.angka2(r.terendah.skor)} ${Ir.pil(H.kelas(r.terendah.skor, kolom, tahun))}</p>`),
        kartu("Rerata kabupaten/kota", `<p class="ir-a-n2">${H.angka2(r.rerata)}</p><p class="ir-a-k">dari ${H.angka0(r.n)} kabupaten/kota${prov ? `; nasional ${H.angka2(nasional.rerata)}` : ""}</p>`),
        kartu("Kabupaten/kota risiko tinggi", `<p class="ir-a-n2">${H.angka0(r.nTinggi)}</p><p class="ir-a-k">dari ${H.angka0(r.n)} kabupaten/kota</p>`),
      ].join("") : `<p class="ir-p">Belum ada skor ${esc(Ir.NAMA_BAHAYA[kolom].toLowerCase())} untuk ${esc(wil)} tahun ${tahun}.</p>`;

      $("#irPetaKet").textContent = prov ? (kab ? d.kab[kab]?.[0] : d.prov[prov]) : "Seluruh kabupaten/kota Indonesia";
      $("#irPerKet").textContent = `${H.angka0(daftar.length)} kabupaten/kota`;
      $("#irThSkor").textContent = `Skor ${tahun}`;
      $("#irThSeb").textContent = kolom === "total" && tahun >= H.TAHUN_HV2021 ? "Skor pembanding" : `Skor ${tahun - 1}`;
      $("#irBaris").innerHTML = daftar.map((x, i) => {
        const seb = H.sebelumnya(d, x.pcode, tahun, kolom), beda = seb === null ? null : x.skor - seb;
        const panah = beda === null ? "–" : `${beda > 0 ? "↑" : beda < 0 ? "↓" : ""} ${H.angka2(Math.abs(beda))}`;
        const nm = namaKab(x);
        return `<tr${x.pcode === kab ? ' class="ir-pilih"' : ""}><td class="n">${i + 1}</td><td class="ir-lbl">${nm}<small>${esc(d.prov[x.pcode.slice(0, 2)] || "")}</small></td><td class="n">${H.angka2(x.skor)}</td><td>${Ir.pil(H.kelas(x.skor, kolom, tahun))}</td>` +
          `<td class="n">${H.angka2(seb)}</td><td class="n ${beda > 0 ? "naik" : beda < 0 ? "turun" : ""}">${panah}</td><td><button type="button" class="ir-ikon" data-kab="${esc(x.pcode)}" aria-label="Lihat detail ${nm}">›</button></td></tr>`;
      }).join("") || `<tr><td colspan="7" class="ir-p">Tidak ada kabupaten/kota bersekor.</td></tr>`;
      if (kab) document.querySelector("#irBaris .ir-pilih")?.scrollIntoView({block: "nearest"});

      /* rerata per jenis bahaya pada wilayah terpilih (pengganti kartu komponen H/V/C InaRISK yang berangka pengisi) */
      const per = d.kolom.filter(k => k !== "total").map(k => ({k, r: H.ringkas(H.urut(d, tahun, k, prov), k, tahun)})).filter(x => x.r.n);
      const maks = Math.max(1, ...per.map(x => x.r.rerata));
      $("#irBahKet").textContent = `${wil}, ${tahun}`;
      $("#irBahayaRata").innerHTML = per.length ? per.map(({k, r}) =>
        `<button type="button" class="ir-bh" data-kolom="${k}" aria-pressed="${k === kolom}" data-tip="<b>${esc(Ir.NAMA_BAHAYA[k])}</b><br>Rerata: ${H.angka2(r.rerata)}<br>Kabupaten/kota tinggi: ${H.angka0(r.nTinggi)} dari ${H.angka0(r.n)}">` +
        `<span>${esc(Ir.NAMA_BAHAYA[k])}</span><b>${H.angka2(r.rerata)}</b><i class="ir-bh-bt"><s class="${Ir.kelasCss(H.kelas(r.rerata, k, tahun))}" data-w="${(r.rerata / maks * 100).toFixed(1)}"></s></i><small>${H.angka0(r.nTinggi)} kab/kota tinggi</small></button>`).join("")
        : `<p class="ir-p">Tahun ${tahun} belum punya skor per jenis bahaya.</p>`;
      for (const s of document.querySelectorAll("#irBahayaRata s[data-w]")) s.style.setProperty("inline-size", s.dataset.w + "%");
      warnaiPeta();
      bingkai(prov, kab);
      Ir.tambahanIrbi?.(filter(), d);   // simulasi kapasitas dan risiko besok (inarisk_simulasi.js)
    }
    /* urgent: tanda tombol dan status sibuk; berat (kartu, 514 baris, peta): ditunda, yang terakhir menang */
    let giliran = 0;
    function segarkan() {
      const no = ++giliran;
      for (const b of document.querySelectorAll("#irBahayaRata [data-kolom]")) b.setAttribute("aria-pressed", String(b.dataset.kolom === $b.value));
      $("#irBaris").setAttribute("aria-busy", "true");
      Ir.nanti(() => { if (no !== giliran) return; gambar(); $("#irBaris").removeAttribute("aria-busy"); });
    }
    $("#irBahayaRata").addEventListener("click", e => { const b = e.target.closest("[data-kolom]"); if (!b) return; $b.value = b.dataset.kolom === $b.value ? "total" : b.dataset.kolom; segarkan(); });
    this.tampil = () => st.peta?.resize();
  },
};
