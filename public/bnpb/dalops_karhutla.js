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

  /* kab dengan luas atau belum padam dalam jendela -> baris layar. kabar: kejadian /api/dalops/karhutla (kab_kode, terakhir, surut, kondisi, upaya).
     jendela (pemilih periode, pemilik 13 Nov 2026): {hari: N} = N hari terakhir data; {dari, sampai} = rentang tanggal (sampai dipotong ke hari data terakhir).
     Tanpa jendela = 7 hari. Luas dan belum padam tetap angka hari akhir jendela (luas harian bertumpuk, tidak dijumlah). */
  function rakit(kab, kabar = [], jendela = {}) {
    const n = kab.hari.length, cari = (t, akhirKah) => { let i = -1; kab.hari.forEach((x, j) => { if (akhirKah ? x <= t : i < 0 && x >= t) i = j; }); return i; };
    const akhir = jendela.sampai ? Math.max(0, cari(jendela.sampai, true)) : n - 1;
    const awal = jendela.dari ? Math.max(0, Math.min(akhir, cari(jendela.dari, false) < 0 ? akhir : cari(jendela.dari, false))) : Math.max(0, akhir - (jendela.hari || PEKAN) + 1);
    const hariAkhir = kab.hari[akhir], lebar = akhir - awal + 1;
    const wa = new Map();
    for (const k of kabar) if (!(k.terakhir > hariAkhir)) for (const kode of k.kab_kode || []) { const a = wa.get(kode); if (!a || k.terakhir > a.terakhir) wa.set(kode, k); }
    const out = [];
    for (const [kode, v] of Object.entries(kab.kab)) {
      const d = (v.d || []).filter(e => e[0] >= awal && e[0] <= akhir);
      if (!d.length) continue;
      const per = new Map(d.map(e => [e[0], e])), kini = per.get(akhir), belum = kini?.[2] || 0;
      let lama = 0;
      for (let i = akhir; i >= awal && (per.get(i)?.[2] || 0) > 0; i--) lama++;
      out.push({kab_kode: kode, nama: v.nama, prov_kode: v.prov, luas: kini?.[1] || 0, belum, padam: belum === 0, lama,
        harian: [...Array(lebar)].map((_, j) => { const i = awal + j, e = per.get(i); return {tgl: kab.hari[i], luas: e?.[1] || 0, belum: e?.[2] || 0}; }),
        kabar: wa.get(kode) || null});
    }
    return {hari: hariAkhir, dari: kab.hari[awal], lebar, baris: out.sort((a, b) => b.belum - a.belum || b.luas - a.luas || a.nama.localeCompare(b.nama))};
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
    const jendela = U.periode?.() || {}, {hari, dari, lebar, baris} = rakit(kab, d.kejadian || [], jendela);
    const kataJendela = U.kataPeriode?.() || "sepekan";
    const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const tgl = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]}` : "–";
    const ha = v => v ? F(v) : "–";
    const status = x => x.padam ? label("Padam", "ok", "biru") : label("Belum padam", "karhutla", "merah");
    const belum = baris.filter(x => !x.padam), totBelum = belum.reduce((s, x) => s + x.belum, 0);
    const hariKe = n => new Date(Date.parse(hari) - n * 864e5).toISOString().slice(0, 10), tiga = [2, 1, 0].map(hariKe);
    const [nas, ...kl] = await Promise.all([fetch("/data/peta_karhutla.json").then(r => r.ok ? r.json() : null).catch(() => null),
      ...tiga.map(t => fetch(`/data/kluster_hari/${t}.json`).then(r => r.ok ? r.json() : null).catch(() => null))]);
    const hot = tiga.map(t => { const i = nas?.hari?.indexOf(t) ?? -1; return i < 0 ? null : nas.nasional.hot[i]; });
    const fs = kl.map(k => k?.w ? Object.entries(k.w).filter(([kk]) => !kk.includes("|")).reduce((s, [, v]) => s + (v[4] || 0), 0) : null);
    /* kolom hotspot dan firespot di tabel (pemilik 12 Nov 2026): provinsi = hotspot deck + firespot arsip; kab/kota = firespot saja (hotspot deck tidak dipecah per kab) */
    const iH = nas?.hari?.indexOf(hari) ?? -1, kH = kl[2]?.w;
    const hotProv = pk => iH < 0 || !nas?.prov?.[pk]?.hot ? null : nas.prov[pk].hot[iH];
    const fsDi = kunci => kH ? kH[kunci]?.[4] ?? 0 : null;
    const nOrNA = v => v == null ? "NA" : v ? F(v) : "–";

    /* tabel provinsi > kab/kota; baris kab membuka log harian sepanjang jendela */
    const prov = new Map();
    for (const x of baris) (prov.get(x.prov_kode) || prov.set(x.prov_kode, []).get(x.prov_kode)).push(x);
    const tbodies = [...prov.entries()].map(([pk, xs]) => [pk, xs, xs.reduce((s, x) => s + x.belum, 0)]).sort((a, b) => b[2] - a[2] || b[1].length - a[1].length)
      .map(([pk, xs, nb]) => {
        const rows = [];
        for (const x of xs) {
          const tombol = h("button", {type: "button", class: "dl-buka dl-buka-kab", "aria-expanded": "false"}, h("b", {teks: x.nama}));
          const tr = h("tr", {class: "dl-kab-baris"}, h("td", {class: "dl-wil"}, tombol), tdv(status(x), x.padam ? 0 : 1), tdv(x.lama ? F(x.lama) : "–", x.lama),
            Object.assign(tdv("–", -1), {title: "Hotspot per kab/kota belum dihitung, lihat baris provinsi"}), tdv(nOrNA(fsDi(x.prov_kode + "|" + x.nama)), fsDi(x.prov_kode + "|" + x.nama) ?? -1),
            tdv(ha(x.luas), x.luas), tdv(ha(x.belum), x.belum), tdv(x.kabar ? tgl(x.kabar.terakhir) : "belum ada", x.kabar?.terakhir?.replace(/-/g, "") || "0"),
            h("td", null, h("div", {class: "dl-aksi"},
              /* log harian 7 hari, sama dengan jenis bencana lain (pemilik 12 Nov 2026): klik ikon membuka baris per hari */
              h("button", {type: "button", class: "dl-ikon", title: `Log harian ${F(lebar)} hari`, "aria-label": `Log harian ${F(lebar)} hari ${x.nama}`}, ikon("kalender")),
              x.padam ? null : tombolWA(x, pesanWA(x, hari, tgl), "permintaan pembaruan"))));
          /* 7 hari terakhir dibangun saat pertama dibuka (ratusan kab x 7 baris = ribuan baris DOM bila dibangun di depan) */
          let anak = null;
          tr.addEventListener("click", e => { if (e.target.closest("a")) return; const buka = tombol.getAttribute("aria-expanded") !== "true";
            if (!anak) { anak = x.harian.slice().reverse().map(r => h("tr", {class: "dl-kec-baris", hidden: true}, h("td", {class: "dl-wil", teks: tgl(r.tgl)}),
              td(r.belum ? label("Belum padam", "karhutla", "merah") : r.luas ? label("Padam", "ok", "biru") : "–"), td("", true), td("", true), td("", true), td(ha(r.luas), true), td(ha(r.belum), true), td("", true), td("", true))); tr.after(...anak); }
            anak.forEach(a => a.hidden = !buka); tombol.setAttribute("aria-expanded", String(buka)); tr.classList.toggle("dl-aktif", buka); });
          rows.push(tr);
        }
        const nBelum = xs.filter(x => !x.padam).length;
        return tbodyProv(namaProv(pk), `${F(xs.length)} kab/kota`, [
          tdv(h("div", {class: "dl-chips"}, nBelum ? label(F(nBelum) + " belum", "karhutla", "merah") : null, xs.length - nBelum ? label(F(xs.length - nBelum) + " padam", "ok", "biru") : null), nBelum),
          td("", true), tdv(nOrNA(hotProv(pk)), hotProv(pk) ?? -1), tdv(nOrNA(fsDi(pk)), fsDi(pk) ?? -1), tdv(ha(xs.reduce((s, x) => s + x.luas, 0)), 0), tdv(ha(nb), nb), td("", true), td("", true)], 1, rows);
      });
    const th = (t, i, tip) => h("th", {scope: "col", teks: t, "data-i": i == null ? null : String(i), title: tip || null});
    const t = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, th("Wilayah", 0), th("Status", 1), th("Lama, hari", 2, `hari berturut-turut sampai ${tgl(hari)} dengan api belum padam, dalam jendela ${tgl(dari)} sampai ${tgl(hari)}`),
      th("Hotspot", 3, `titik panas ${tgl(hari)} per provinsi, semua satelit dan tingkat keyakinan (sistem Centurisk97)`), th("Firespot", 4, `titik firespot ${tgl(hari)} dari cluster firespot (sistem Centurisk97)`),
      th("Luas terbakar, ha", 5, `luas terbakar hari ${tgl(hari)}, data satelit NOAA-20/21 (sistem Centurisk97)`), th("Belum padam, ha", 6, `sisa api belum padam hari ${tgl(hari)}, data satelit NOAA-20/21 (sistem Centurisk97)`),
      th("Kabar BPBD", 7, "tanggal kabar terakhir BPBD di logbook atau WA Koordalops"), th("Aksi"))));
    t.append(...tbodies); pasangUrut(t);
    const wadahPeta = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"}));
    /* ringkasan di dalam peta, sama dengan jenis lain (pemilik 11 Nov 2026 "karhutla kok beda sendiri") */
    const tanpaKabar = perluDitanya(baris, hari).length, luasTot = baris.reduce((s, x) => s + x.luas, 0);
    const ub = (ik, nama, nilai, kelas = "", tip = "") => h("div", {class: "db-ubin " + kelas, title: tip || null}, h("header", null, h("i", null, ikon(ik)), h("span", {teks: nama})), typeof nilai === "string" ? h("b", {teks: nilai}) : nilai);
    /* angka deck Penanganan di peta (pemilik 12 Nov 2026): hotspot, firespot, luas terbakar, belum padam, tren 3 hari; semua dari sistem kita.
       hotspot nasional = peta_karhutla.json (definisi deck), firespot = arsip kluster_hari (titik firespot hari itu, w[prov][4]) */
    const tren = (() => { const ada = hot.filter(v => v != null), m = Math.max(1, ...ada);
      const ubah = hot[0] && hot[2] != null ? Math.round((hot[2] - hot[0]) / hot[0] * 100) : null;
      return h("b", {class: "dl-tren3"}, ...hot.map((v, i) => h("i", {style: `--t:${v == null ? 0 : Math.max(8, Math.round(v / m * 100))}%`, title: `${tgl(tiga[i])}: ${v == null ? "belum ada data" : F(v) + " hotspot"}`})),
        ubah == null ? null : h("small", {class: ubah > 0 ? "naik" : "turun", teks: (ubah > 0 ? "▲ " : "▼ ") + F(Math.abs(ubah)) + "%"})); })();
    const NA = v => v == null ? "NA" : F(v);
    const ubin = h("div", {class: "db-ubin-grid"},
      ub("karhutla", "Hotspot " + tgl(hari), NA(hot[2]), hot[2] == null ? "dl-na" : "", "Titik panas hari itu, semua satelit dan tingkat keyakinan (sistem Centurisk97)"),
      ub("peringatan", "Firespot " + tgl(hari), NA(fs[2]), fs[2] == null ? "dl-na" : fs[2] ? "merah" : "", "Titik firespot hari itu dari cluster firespot (sistem Centurisk97)"),
      ub("kalender", "Luas terbakar " + tgl(hari) + ", ha", ha(luasTot)),
      ub("karhutla", "Belum padam, ha", ha(totBelum), totBelum ? "merah" : ""),
      ub("data", "Tren hotspot 3 hari", tren, "", tiga.map((t, i) => `${tgl(t)}: ${hot[i] == null ? "NA" : F(hot[i])}`).join(", ")),
      ub("pin", "Kab/kota belum padam", F(belum.length), belum.length ? "merah" : ""),
      ub("tunggu", "Tanpa kabar BPBD", F(tanpaKabar), tanpaKabar ? "oranye" : ""));
    requestAnimationFrame(() => peta(wadahPeta, baris, U, ubin, {nas, kl: kl[2], hari, tgl}));

    /* kelengkapan data: belum padam tanpa kabar BPBD sehari terakhir */
    const tanya = perluDitanya(baris, hari);
    const tTanya = tanya.length ? h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, (() => { const tb = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, th("No"), th("Kab/kota", 1), th("Provinsi", 2), th("Belum padam, ha", 3), th("Kabar BPBD terakhir", 4), th("Kirim"))),
      h("tbody", null, ...tanya.map((x, i) => h("tr", null, td(F(i + 1), true), h("td", null, h("b", {teks: x.nama})), td(namaProv(x.prov_kode)), tdv(ha(x.belum), x.belum),
        tdv(x.umur == null ? "belum ada" : `${tgl(x.kabar.terakhir)}, ${F(x.umur)} hari lalu`, x.umur ?? 999), h("td", null, h("div", {class: "dl-aksi"}, tombolWA(x, pesanWA(x, hari, tgl), "permintaan pembaruan")))))));
      pasangUrut(tb); return tb; })()) : kosong("ok", "Tidak ada kab/kota belum padam yang tanpa kabar BPBD.");

    /* upaya penanganan dari kabar BPBD (logbook + WA) */
    const kabar = (d.kejadian || []).filter(k => k.terakhir >= dari && k.terakhir <= hari).sort((a, b) => (a.surut - b.surut) || b.terakhir.localeCompare(a.terakhir));
    const tUpaya = kabar.length ? h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, (() => { const tb = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, th("Kab/kota", 0), th("Status BPBD", 1), th("Kondisi terakhir"), th("Upaya"), th("Kabar", 4))),
      h("tbody", null, ...kabar.map(k => h("tr", null, h("td", null, h("b", {teks: (k.kab || [""])[0]}), h("div", {class: "bn-label", teks: namaProv(k.prov_kode, k.prov)})),
        tdv(k.surut ? label("Padam", "ok", "biru") : label("Belum padam", "karhutla", "merah"), k.surut ? 0 : 1), h("td", {class: "dl-kondisi", teks: k.kondisi || "–"}),
        h("td", {class: "dl-tindak"}, (k.upaya || []).length ? h("ul", null, ...k.upaya.slice(0, 4).map(u => h("li", {teks: u})), k.upaya.length > 4 ? h("li", {class: "bn-label", teks: `+${F(k.upaya.length - 4)} lainnya`}) : null) : "–"), tdv(tgl(k.terakhir), k.terakhir.replace(/-/g, ""))))));
      pasangUrut(tb); return tb; })()) : kosong("ok", `Belum ada kabar karhutla dari BPBD ${kataJendela}.`);

    /* tabel utama dan peta dulu; Kelengkapan data dan Upaya menyusul sesudah frame berikut supaya tab tidak beku di HP */
    p.replaceChildren(
      ...(kal => [bagian("karhutla-peta", "pin", "Peta Pantauan", kal, wadahPeta),   // peta dan tabel dua kartu (pemilik 12 Nov 2026)
        bagian("karhutla-kondisi", "karhutla", "Kondisi terkini", kal, h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t))])(
        belum.length ? [hl(`${F(belum.length)} kab/kota`), " masih ada api belum padam, ", hl(`${F(totBelum)} ha`), ` belum padam per ${tgl(hari)}`]
          : [hl(`${F(baris.length)} kab/kota`), ` terbakar ${kataJendela}, semuanya padam per ${tgl(hari)}`]));
    pasangTip();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    p.append(
      bagian("karhutla-tanya", "tunggu", "Kelengkapan data", tanya.length ? [hl(`${F(tanya.length)} kab/kota`), ` belum padam tanpa kabar BPBD pada ${tgl(hari)}`] : `Semua kab/kota belum padam sudah berkabar pada ${tgl(hari)}`, tTanya),
      bagian("karhutla-upaya", "personel", "Penanganan dan bantuan", kabar.length ? [hl(`${F(kabar.length)} kab/kota`), ` berkabar karhutla dari BPBD ${kataJendela}`] : `Belum ada kabar BPBD ${kataJendela}`, tUpaya));
  }

  /* peta: kab terbakar sepekan, merah = belum padam (makin pekat makin luas), biru = sudah padam; arahkan kursor untuk angka */
  async function peta(wadah, baris, U, ubin = null, ex = {}) {
    const {h, F, kosong, ikon} = U;
    if (!g.maplibregl) return wadah.replaceChildren(kosong("peringatan", "Peta gagal dimuat, coba muat ulang."));
    const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    const per = new Map(baris.map(x => [x.kab_kode, x])), provs = [...new Set(baris.map(x => x.prov_kode))];
    const geo = await Promise.all(provs.map(p => ambil(`/geo/kabupaten/${p}.json`)));
    const fitur = [];
    geo.forEach((gj, i) => (gj?.features || []).forEach(f => { const x = per.get(provs[i] + "|" + f.properties.kab); if (x) fitur.push({type: "Feature", id: fitur.length, properties: {kode: x.kab_kode, belum: x.belum}, geometry: f.geometry}); }));
    /* kategori hotspot per provinsi seperti peta deck Penanganan (pemilik 12 Nov 2026 "kategorinya kaya gini"): tanpa hotspot, 1-100, 101-250, 251-500, > 500;
       kab/kota belum padam bergaris merah di atasnya */
    const KAT = [[0, "Tanpa hotspot", "#dfe3ea"], [1, "1 sampai 100 titik", "#f6c49e"], [101, "101 sampai 250", "#ef9150"], [251, "251 sampai 500", "#dd6421"], [501, "Lebih dari 500", "#8a2d0e"]];
    const iHotHari = ex.nas?.hari?.indexOf(ex.hari) ?? -1;
    const provGeo = await ambil("/geo/provinsi.json");
    for (const f of provGeo?.features || []) f.properties.hot = iHotHari < 0 ? -1 : ex.nas.prov?.[f.properties.kode]?.hot?.[iHotHari] ?? 0;
    wadah.replaceChildren(); wadah.append(h("div", {class: "dl-legenda-peta"}, ...KAT.map(([, t, w]) => h("span", {class: "dl-leg dl-leg-kat", style: `--w:${w}`, teks: t})),
      h("span", {class: "dl-leg dl-leg-garis", teks: "Kab/kota belum padam"})));
    /* trackResize hidup: peta ikut ukuran wadah saat panel tampil (dulu mati dan peta terpotong separuh). */
    const m = petaKini = new g.maplibregl.Map({container: wadah, trackResize: true, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]], fitBoundsOptions: {padding: 16},
      minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    m.addControl(new g.maplibregl.NavigationControl({showCompass: false}), "top-right"); g.DalopsKamera?.ikat(m);
    m.touchZoomRotate.disableRotation();
    /* saring status di puncak peta (bentuk sama dengan jenis lain): tak ada yang dipilih = semua */
    const saring = new Set(), terap = () => { if (!m.getLayer("kab-isi")) return; const f = !saring.size || saring.size === 2 ? null : saring.has("belum") ? [">", ["get", "belum"], 0] : ["==", ["get", "belum"], 0];
      for (const id of ["kab-isi", "kab-garis"]) m.setFilter(id, f); };
    const tSaring = [["surut", "Padam", "ok"], ["belum", "Belum padam", "karhutla"]].map(([v, t, ik]) => { const b = h("button", {type: "button", class: "dl-saring-btn dl-saring-" + v, "aria-pressed": "false"}, ikon(ik), t);
      b.addEventListener("click", () => { saring.has(v) ? saring.delete(v) : saring.add(v); b.setAttribute("aria-pressed", String(saring.has(v))); terap(); }); return b; });
    wadah.append(h("div", {class: "dl-peta-alat"}, h("div", {class: "dl-saring", role: "group", "aria-label": "Saring status padam"}, tSaring)));
    if (ubin) { ubin.classList.add("dl-peta-ubin"); wadah.append(ubin); g.DalopsKamera?.dasar(wadah); }
    const css = getComputedStyle(document.documentElement), c1 = css.getPropertyValue("--c1").trim() || "#c9503a", c5 = css.getPropertyValue("--c5").trim() || "#4f8fc4";
    const pop = new g.maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 10, className: "dl-popup"});
    /* angka provinsi di tiap pop-up (pemilik 12 Nov 2026 "di tiap provinsi juga ada hotspot firespot luas terbakar dan belum padam"):
       hotspot, luas, belum padam = peta_karhutla.json (definisi deck); firespot = arsip kluster_hari w[prov][4]. Belum ada = NA kuning. */
    const iHari = ex.nas?.hari?.indexOf(ex.hari) ?? -1, NA = v => v == null ? "NA" : F(v);
    const fsKab = x => ex.kl?.w ? NA(ex.kl.w[x.prov_kode + "|" + x.nama]?.[4] ?? 0) : "NA";
    const angkaProv = pk => { const P = ex.nas?.prov?.[pk], ambil = k => iHari < 0 || !P?.[k] ? null : P[k][iHari];
      const isi = [["Hotspot", ambil("hot"), "titik"], ["Firespot", ex.kl?.w ? ex.kl.w[pk]?.[4] ?? 0 : null, "titik"], ["Luas terbakar", ambil("luas"), "ha"], ["Belum padam", ambil("belum"), "ha"]];
      return h("div", {class: "dl-pop-prov"}, h("small", {teks: `Provinsi ${U.namaProv(pk)}, ${ex.tgl ? ex.tgl(ex.hari) : ""}`}),
        h("div", null, ...isi.map(([t, v, sat]) => h("span", v == null ? {class: "dl-na"} : null, h("b", {teks: NA(v)}), h("em", {teks: `${t}, ${sat}`}))))); };
    m.on("load", () => {
      if (provGeo) { m.addSource("prov", {type: "geojson", data: provGeo});
        m.addLayer({id: "prov-isi", type: "fill", source: "prov", paint: {"fill-color": ["step", ["get", "hot"], KAT[0][2], 1, KAT[1][2], 101, KAT[2][2], 251, KAT[3][2], 501, KAT[4][2]], "fill-opacity": .9}});
        m.addLayer({id: "prov-garis", type: "line", source: "prov", paint: {"line-color": "#ffffff", "line-width": 1}}); }
      m.addSource("kab", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
      /* isi kab hampir bening: tetap bisa disorot dan dibuka pop-up; warna kategori datang dari provinsi */
      m.addLayer({id: "kab-isi", type: "fill", source: "kab", paint: {"fill-color": "#0b2545", "fill-opacity": .02}});
      m.addLayer({id: "kab-garis", type: "line", source: "kab", paint: {"line-color": ["case", [">", ["get", "belum"], 0], "#b3261e", "rgba(255,255,255,.6)"], "line-width": ["case", [">", ["get", "belum"], 0], 1.8, .5]}});
      let kodeLama = null;   // isi pop-up dibangun hanya saat kab berganti; selain itu cukup geser posisinya
      m.on("mousemove", "kab-isi", e => { const kode = e.features[0].properties.kode, x = per.get(kode); m.getCanvas().style.cursor = "pointer";
        if (kode === kodeLama) return void pop.setLngLat(e.lngLat);
        kodeLama = kode;
        pop.setLngLat(e.lngLat).setDOMContent(U.kartuMini({lambang: U.lambangKab(x), nama: x.nama, wilayah: U.namaProv(x.prov_kode),
          pil: [U.label(x.padam ? "Padam" : "Belum padam", x.padam ? "ok" : "karhutla", x.padam ? "biru" : "merah")],
          angka: [[x.padam ? null : F(x.belum), "ha belum padam", "karhutla"], [x.luas ? F(x.luas) : "–", "ha terbakar", "peringatan"], [fsKab(x), "titik firespot", "peringatan"]],
          bawah: angkaProv(x.prov_kode)})).addTo(m); });
      m.on("mouseleave", "kab-isi", () => { m.getCanvas().style.cursor = ""; pop.remove(); kodeLama = null; });
    });
  }

  let petaKini = null;
  const tampil = () => petaKini && requestAnimationFrame(() => petaKini.resize());
  g.DalopsKarhutla = {rakit, perluDitanya, render, tampil};
})(globalThis);
