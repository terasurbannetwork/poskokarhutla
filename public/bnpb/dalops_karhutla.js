/* Tab Karhutla di Pantau Dalops (/bnpb/dalops), pemilik 5 Nov 2026: "Pantau = Karhutla, Banjir, Longsor", bentuk tiru tab Banjir
   (peta, tabel provinsi > kab/kota, kelengkapan data, upaya penanganan).
   Angka luas dan belum padam HANYA dari sistem kita (public/data/peta_karhutla_kab.json, scripts/data/peta_karhutla.py): luas dan
   belum per kab per hari [indeks_hari, luas, belum]. Luas periode tidak dijumlah antarhari (luas harian bertumpuk), yang tampil luas
   hari terakhir. Kabar BPBD (kondisi, upaya, tanggal) dari /api/dalops/karhutla (logbook + WA Koordalops, scripts/data/dalops_banjir.py
   --jenis karhutla); teksnya tidak pernah menjadi angka luas.
   Helper layar (h, bagian, tbodyProv, ...) disuntik dari dalops.js; rakit() murni dan diuji tests/bnpb/dalops.test.mjs. */
(g => {
  "use strict";
  const PEKAN = 7;

  /* kab dengan luas atau belum padam dalam 7 hari terakhir data -> baris layar. kabar: kejadian /api/dalops/karhutla (kab_kode, terakhir, surut, kondisi, upaya). */
  function rakit(kab, kabar = []) {
    const n = kab.hari.length, akhir = n - 1, awal = n - PEKAN, hariAkhir = kab.hari[akhir];
    const wa = new Map();
    for (const k of kabar) for (const kode of k.kab_kode || []) { const a = wa.get(kode); if (!a || k.terakhir > a.terakhir) wa.set(kode, k); }
    const out = [];
    for (const [kode, v] of Object.entries(kab.kab)) {
      const d = (v.d || []).filter(e => e[0] >= awal);
      if (!d.length) continue;
      const per = new Map(d.map(e => [e[0], e])), kini = per.get(akhir), belum = kini?.[2] || 0;
      let lama = 0;
      for (let i = akhir; i >= awal && (per.get(i)?.[2] || 0) > 0; i--) lama++;
      out.push({kab_kode: kode, nama: v.nama, prov_kode: v.prov, luas: kini?.[1] || 0, belum, padam: belum === 0, lama,
        harian: [...Array(PEKAN)].map((_, j) => { const i = awal + j, e = per.get(i); return {tgl: kab.hari[i], luas: e?.[1] || 0, belum: e?.[2] || 0}; }),
        kabar: wa.get(kode) || null});
    }
    return {hari: hariAkhir, baris: out.sort((a, b) => b.belum - a.belum || b.luas - a.luas || a.nama.localeCompare(b.nama))};
  }

  /* belum padam yang kabar BPBD-nya bukan dari hari data (sama dengan ambang banjir, dalops_hitung.js): perlu ditanya. umur = hari sejak kabar terakhir (null = belum pernah). */
  function perluDitanya(baris, hari) {
    const hariKe = s => Math.round((Date.parse(hari) - Date.parse(s)) / 864e5);
    return baris.filter(x => !x.padam).map(x => ({...x, umur: x.kabar ? hariKe(x.kabar.terakhir) : null}))
      .filter(x => x.umur == null || x.umur >= 1).sort((a, b) => (b.umur ?? 99) - (a.umur ?? 99) || b.belum - a.belum);
  }

  const pesanWA = (x, hari, tgl) => `Yth. rekan BPBD ${x.nama}. Menurut data satelit NOAA-20/21 (sistem Centurisk97) per ${tgl(hari)}, api belum padam sekitar ${x.belum.toLocaleString("id-ID")} ha di ${x.nama}` +
    (x.lama > 1 ? `, ${x.lama} hari berturut-turut` : "") + `${x.kabar ? `, kabar BPBD terakhir ${tgl(x.kabar.terakhir)}` : ", belum ada kabar BPBD"}.\n` +
    "Mohon pembaruan:\n1. Kondisi api terkini, sudah padam atau belum\n2. Luas yang sudah dipadamkan dan sisa yang masih terbakar\n3. Upaya pemadaman dan personel di lapangan\n" +
    "Bila ada kebutuhan mendesak (pompa, selang, water bombing, logistik regu), mohon disampaikan sekalian. Terima kasih.";

  async function render(p, d, U) {
    const {bagian, hl, h, F, ikon, label, kosong, tdv, td, tbodyProv, tombolWA, pasangUrut, pasangTip, namaProv, bukaSemua} = U;
    const kab = await fetch("/data/peta_karhutla_kab.json").then(r => r.ok ? r.json() : null).catch(() => null);
    if (!kab) return p.replaceChildren(kosong("peringatan", "Data karhutla sistem gagal dimuat, coba muat ulang."));
    const {hari, baris} = rakit(kab, d.kejadian || []);
    const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const tgl = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]}` : "–";
    const ha = v => v ? F(v) : "–";
    const status = x => x.padam ? label("Padam", "ok", "biru") : label("Belum padam", "karhutla", "merah");
    const belum = baris.filter(x => !x.padam), totBelum = belum.reduce((s, x) => s + x.belum, 0);

    /* tabel provinsi > kab/kota; baris kab membuka 7 hari terakhir */
    const prov = new Map();
    for (const x of baris) (prov.get(x.prov_kode) || prov.set(x.prov_kode, []).get(x.prov_kode)).push(x);
    const tbodies = [...prov.entries()].map(([pk, xs]) => [pk, xs, xs.reduce((s, x) => s + x.belum, 0)]).sort((a, b) => b[2] - a[2] || b[1].length - a[1].length)
      .map(([pk, xs, nb]) => {
        const rows = [];
        for (const x of xs) {
          const tombol = h("button", {type: "button", class: "dl-buka dl-buka-kab", "aria-expanded": "false"}, h("b", {teks: x.nama}));
          const tr = h("tr", {class: "dl-kab-baris"}, h("td", {class: "dl-wil"}, tombol), tdv(status(x), x.padam ? 0 : 1), tdv(x.lama ? F(x.lama) : "–", x.lama),
            tdv(ha(x.luas), x.luas), tdv(ha(x.belum), x.belum), tdv(x.kabar ? tgl(x.kabar.terakhir) : "belum ada", x.kabar?.terakhir?.replace(/-/g, "") || "0"),
            h("td", null, h("div", {class: "dl-aksi"}, x.padam ? null : tombolWA(x, pesanWA(x, hari, tgl), "permintaan pembaruan"))));
          /* 7 hari terakhir dibangun saat pertama dibuka (ratusan kab x 7 baris = ribuan baris DOM bila dibangun di depan) */
          let anak = null;
          tr.addEventListener("click", e => { if (e.target.closest("a")) return; const buka = tombol.getAttribute("aria-expanded") !== "true";
            if (!anak) { anak = x.harian.slice().reverse().map(r => h("tr", {class: "dl-kec-baris", hidden: true}, h("td", {class: "dl-wil", teks: tgl(r.tgl)}),
              td(r.belum ? label("Belum padam", "karhutla", "merah") : r.luas ? label("Padam", "ok", "biru") : "–"), td("", true), td(ha(r.luas), true), td(ha(r.belum), true), td("", true), td("", true))); tr.after(...anak); }
            anak.forEach(a => a.hidden = !buka); tombol.setAttribute("aria-expanded", String(buka)); tr.classList.toggle("dl-aktif", buka); });
          rows.push(tr);
        }
        const nBelum = xs.filter(x => !x.padam).length;
        return tbodyProv(namaProv(pk), `${F(xs.length)} kab/kota`, [
          tdv(h("div", {class: "dl-chips"}, nBelum ? label(F(nBelum) + " belum", "karhutla", "merah") : null, xs.length - nBelum ? label(F(xs.length - nBelum) + " padam", "ok", "biru") : null), nBelum),
          td("", true), tdv(ha(xs.reduce((s, x) => s + x.luas, 0)), 0), tdv(ha(nb), nb), td("", true), td("", true)], 1, rows);
      });
    const th = (t, i, tip) => h("th", {scope: "col", teks: t, "data-i": i == null ? null : String(i), title: tip || null});
    const t = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, th("Wilayah", 0), th("Status", 1), th("Lama, hari", 2, "hari berturut-turut sampai hari data terakhir dengan api belum padam"),
      th("Luas terbakar, ha", 3, `luas terbakar hari ${tgl(hari)}, data satelit NOAA-20/21 (sistem Centurisk97)`), th("Belum padam, ha", 4, `sisa api belum padam hari ${tgl(hari)}, data satelit NOAA-20/21 (sistem Centurisk97)`),
      th("Kabar BPBD", 5, "tanggal kabar terakhir BPBD di logbook atau WA Koordalops"), th("Aksi"))));
    t.append(...tbodies); pasangUrut(t);
    const wadahPeta = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"}));
    requestAnimationFrame(() => peta(wadahPeta, baris, U));

    /* kelengkapan data: belum padam tanpa kabar BPBD sehari terakhir */
    const tanya = perluDitanya(baris, hari);
    const tTanya = tanya.length ? h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, (() => { const tb = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, th("No"), th("Kab/kota", 1), th("Provinsi", 2), th("Belum padam, ha", 3), th("Kabar BPBD terakhir", 4), th("Kirim"))),
      h("tbody", null, ...tanya.map((x, i) => h("tr", null, td(F(i + 1), true), h("td", null, h("b", {teks: x.nama})), td(namaProv(x.prov_kode)), tdv(ha(x.belum), x.belum),
        tdv(x.umur == null ? "belum ada" : `${tgl(x.kabar.terakhir)}, ${F(x.umur)} hari lalu`, x.umur ?? 999), h("td", null, h("div", {class: "dl-aksi"}, tombolWA(x, pesanWA(x, hari, tgl), "permintaan pembaruan")))))));
      pasangUrut(tb); return tb; })()) : kosong("ok", "Tidak ada kab/kota belum padam yang tanpa kabar BPBD.");

    /* upaya penanganan dari kabar BPBD (logbook + WA) */
    const kabar = (d.kejadian || []).slice().sort((a, b) => (a.surut - b.surut) || b.terakhir.localeCompare(a.terakhir));
    const tUpaya = kabar.length ? h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, (() => { const tb = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, th("Kab/kota", 0), th("Status BPBD", 1), th("Kondisi terakhir"), th("Upaya"), th("Kabar", 4))),
      h("tbody", null, ...kabar.map(k => h("tr", null, h("td", null, h("b", {teks: (k.kab || [""])[0]}), h("div", {class: "bn-label", teks: namaProv(k.prov_kode, k.prov)})),
        tdv(k.surut ? label("Padam", "ok", "biru") : label("Belum padam", "karhutla", "merah"), k.surut ? 0 : 1), h("td", {class: "dl-kondisi", teks: k.kondisi || "–"}),
        h("td", {class: "dl-tindak"}, (k.upaya || []).length ? h("ul", null, ...k.upaya.slice(0, 4).map(u => h("li", {teks: u})), k.upaya.length > 4 ? h("li", {class: "bn-label", teks: `+${F(k.upaya.length - 4)} lainnya`}) : null) : "–"), tdv(tgl(k.terakhir), k.terakhir.replace(/-/g, ""))))));
      pasangUrut(tb); return tb; })()) : kosong("ok", "Belum ada kabar karhutla dari BPBD sepekan ini.");

    /* tabel utama dan peta dulu; Kelengkapan data dan Upaya menyusul sesudah frame berikut supaya tab tidak beku di HP */
    p.replaceChildren(
      bagian("karhutla-peta", "karhutla", "Kondisi karhutla terkini",
        belum.length ? [hl(`${F(belum.length)} kab/kota`), " masih ada api belum padam, ", hl(`${F(totBelum)} ha`), ` belum padam per ${tgl(hari)}`]
          : [hl(`${F(baris.length)} kab/kota`), ` terbakar sepekan, semuanya padam per ${tgl(hari)}`],
        wadahPeta, h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t)));
    pasangTip();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    p.append(
      bagian("karhutla-tanya", "tunggu", "Kelengkapan data", tanya.length ? [hl(`${F(tanya.length)} kab/kota`), ` belum padam tanpa kabar BPBD pada ${tgl(hari)}`] : `Semua kab/kota belum padam sudah berkabar pada ${tgl(hari)}`, tTanya),
      bagian("karhutla-upaya", "personel", "Upaya penanganan", kabar.length ? [hl(`${F(kabar.length)} kab/kota`), " berkabar karhutla dari BPBD sepekan ini"] : "Belum ada kabar BPBD sepekan ini", tUpaya));
  }

  /* peta: kab terbakar sepekan, merah = belum padam (makin pekat makin luas), biru = sudah padam; arahkan kursor untuk angka */
  async function peta(wadah, baris, U) {
    const {h, F, kosong} = U;
    if (!g.maplibregl) return wadah.replaceChildren(kosong("peringatan", "Peta gagal dimuat, coba muat ulang."));
    const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    const per = new Map(baris.map(x => [x.kab_kode, x])), provs = [...new Set(baris.map(x => x.prov_kode))];
    const geo = await Promise.all(provs.map(p => ambil(`/geo/kabupaten/${p}.json`)));
    const fitur = [];
    geo.forEach((gj, i) => (gj?.features || []).forEach(f => { const x = per.get(provs[i] + "|" + f.properties.kab); if (x) fitur.push({type: "Feature", id: fitur.length, properties: {kode: x.kab_kode, belum: x.belum}, geometry: f.geometry}); }));
    wadah.replaceChildren(); wadah.after(h("div", {class: "dl-legenda-peta"}, h("span", {class: "dl-leg dl-leg-belum", teks: "Belum padam"}), h("span", {class: "dl-leg dl-leg-surut", teks: "Padam"})));
    const m = petaKini = new g.maplibregl.Map({container: wadah, trackResize: false,   // panel bisa hidden: ukur ulang saat tab tampil (tampil()) style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]], fitBoundsOptions: {padding: 16},
      minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    m.addControl(new g.maplibregl.NavigationControl({showCompass: false}), "top-right");
    m.touchZoomRotate.disableRotation();
    const css = getComputedStyle(document.documentElement), c1 = css.getPropertyValue("--c1").trim() || "#c9503a", c5 = css.getPropertyValue("--c5").trim() || "#4f8fc4";
    const pop = new g.maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 10, className: "dl-popup"});
    m.on("load", () => {
      m.addSource("kab", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
      m.addLayer({id: "kab-isi", type: "fill", source: "kab", paint: {"fill-color": ["case", [">", ["get", "belum"], 0], c1, c5],
        "fill-opacity": ["case", [">", ["get", "belum"], 0], ["interpolate", ["linear"], ["get", "belum"], 1, .45, 100, .7, 1000, .9], .55]}});
      m.addLayer({id: "kab-garis", type: "line", source: "kab", paint: {"line-color": "#ffffff", "line-width": .8}});
      let kodeLama = null;   // isi pop-up dibangun hanya saat kab berganti; selain itu cukup geser posisinya
      m.on("mousemove", "kab-isi", e => { const kode = e.features[0].properties.kode, x = per.get(kode); m.getCanvas().style.cursor = "pointer";
        if (kode === kodeLama) return void pop.setLngLat(e.lngLat);
        kodeLama = kode;
        pop.setLngLat(e.lngLat).setDOMContent(h("div", {class: "dl-pop"}, h("b", {teks: x.nama}), h("div", {teks: x.padam ? "Padam" : `Belum padam ${F(x.belum)} ha`}),
          h("div", {class: "bn-label", teks: `Luas terbakar ${x.luas ? F(x.luas) + " ha" : "–"}`}))).addTo(m); });
      m.on("mouseleave", "kab-isi", () => { m.getCanvas().style.cursor = ""; pop.remove(); kodeLama = null; });
    });
  }

  let petaKini = null;
  const tampil = () => petaKini && requestAnimationFrame(() => petaKini.resize());
  g.DalopsKarhutla = {rakit, perluDitanya, render, tampil};
})(globalThis);
