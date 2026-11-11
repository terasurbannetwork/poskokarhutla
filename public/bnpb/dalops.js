/* Pantau Banjir Dalops (/bnpb/dalops): peta banjir sepekan, tabel wilayah bertingkat (provinsi > kab/kota > kecamatan > desa,
   plus histori harian per kab), kab/kota yang perlu ditanya, prakiraan banjir per hari, lampiran pengungsi.
   Data: GET /api/dalops/banjir (staf, src/dalops.js; R2 dari scripts/data/dalops_banjir.py) + /banjir/data/status.json (publik)
   + /geo/provinsi.json dan /geo/kabupaten/<prov>.json (batas wilayah). Hitungan di dalops_hitung.js (murni, diuji).
   Teks data lewat textContent; tooltip lewat data-tip (di-esc). Tanpa gaya/skrip inline (CSP). Tabel bergaya standar .ad-tabel.
   Buka/tutup baris hanya mengganti kelas atau atribut hidden, tidak merender ulang. */
(() => {
  "use strict";
  const {ikon, h, F, PROV} = window.Wilayah, H = window.DalopsHitung;
  const app = document.getElementById("app"), NS = "http://www.w3.org/2000/svg";
  const KURANG = {kk: ["KK terdampak", "sosial"], jiwa: ["Jiwa terdampak", "personel"], kk_u: ["KK pengungsi", "tenda"], mengungsi: ["Jiwa pengungsi", "tenda"], tinggi: ["Tinggi air", "air"], kec: ["Kecamatan", "pin"], desa: ["Desa/kel.", "pin"], upaya: ["Upaya penanganan", "personel"]};
  const URUT_KURANG = ["kk", "jiwa", "kk_u", "mengungsi", "tinggi", "kec", "desa", "upaya"];
  const IK_LEVEL = ["ok", "peringatan", "peringatan", "peringatan"];
  const status = b => h("span", {class: "dl-st dl-l" + b}, ikon(IK_LEVEL[b]), H.NAMA_LEVEL[b]);   // prakiraan: ikon + nama, warna sama dengan peta banjir
  const label = (teks, ik, nada) => h("span", {class: "dl-tag" + (nada ? " dl-tag-" + nada : "")}, ikon(ik), teks);
  /* satu bentuk layar untuk banjir dan longsor (pemilik 5 Nov 2026: Pantau = Karhutla, Banjir, Longsor); kolom data 'surut' = selesai menurut jenisnya */
  const JN = {
    banjir: {k: "banjir", kata: "banjir", ik: "banjir", ya: "Sudah surut", tidak: "Belum surut", ya_k: "sudah surut", tidak_k: "belum surut", lv: "b", tinggi: true},
    longsor: {k: "longsor", kata: "longsor", ik: "longsor", ya: "Tertangani", tidak: "Masih ditangani", ya_k: "sudah tertangani", tidak_k: "masih ditangani", lv: "l", tinggi: false},
    /* pemilik 9 Nov 2026: bencana lain di halaman yang sama. Tanpa prakiraan di status.json (pra: false): bagian Peringatan dini dan kolom prakiraan dilewati. */
    gempa: {k: "gempa", kata: "gempa bumi", ik: "gempabumi", ya: "Selesai", tidak: "Masih ditangani", ya_k: "selesai", tidak_k: "masih ditangani", tinggi: false, pra: false},
    cuaca: {k: "cuaca", kata: "cuaca ekstrem", ik: "cuaca", ya: "Selesai", tidak: "Masih ditangani", ya_k: "selesai", tidak_k: "masih ditangani", tinggi: false, pra: false},
    kekeringan: {k: "kekeringan", kata: "kekeringan", ik: "kekeringan", ya: "Selesai", tidak: "Masih berlangsung", ya_k: "selesai", tidak_k: "masih berlangsung", tinggi: false, pra: false},
    /* pemilik 11 Nov 2026: tiap jenis tab sendiri */
    gelombang: {k: "gelombang", kata: "gelombang pasang", ik: "gelombang_pasang", ya: "Sudah surut", tidak: "Belum surut", ya_k: "sudah surut", tidak_k: "belum surut", tinggi: false, pra: false},
    permukiman: {k: "permukiman", kata: "kebakaran permukiman", ik: "kebakaran_permukiman", ya: "Padam", tidak: "Masih ditangani", ya_k: "sudah padam", tidak_k: "masih ditangani", tinggi: false, pra: false}};
  let J = JN.banjir;
  const GEO = new Map();
  const surutLabel = s => s ? label(J.ya, "ok", "biru") : label(J.tidak, J.ik, "merah");
  const nadaUmur = u => u >= 7 ? "dl-u3" : u >= 3 ? "dl-u2" : "dl-u1";
  const tinggi = t => !t ? "–" : t[0] === t[1] ? F(t[0]) + " cm" : `${F(t[0])}–${F(t[1])} cm`;
  const angka = v => v == null ? "–" : F(v);
  const namaProv = (kode, cadang) => PROV[kode] || cadang || "Provinsi tidak tercatat";
  /* logo WhatsApp (path Simple Icons, sama dengan public/inti/alarm.js). wa.me tanpa nomor membuka pilihan chat, jadi grup BPBD bisa dipilih. */
  const ikonWA = () => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "dl-wa-ikon");
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41");
    s.appendChild(p); return s; };
  const tombolWA = (x, teks, apa) => h("a", {class: "dl-ikon dl-wa", href: "https://wa.me/?text=" + encodeURIComponent(teks), target: "_blank", rel: "noopener",
    "aria-label": `Kirim ${apa} ${x.nama} lewat WhatsApp`, "data-tip": `<b>Kirim lewat WhatsApp</b><br>${apa}, pilih grup BPBD-nya`}, ikonWA());
  /* korban gempa dst (kolom md, hilang, status_darurat bila dilaporkan): merah menonjol, status darurat label kuning; aman bila kosong */
  const korbanChip = (teks, ik, nada) => { const e = label(teks, ik, nada); e.classList.add("dl-korban"); return e; };
  const BULAN_DL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglDarurat = s => String(s).replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (_, d, m, y) => `${+d} ${BULAN_DL[m - 1]} ${y}`);   // teks WA 27/09/2026 -> 27 Sep 2026
  const chipKorban = x => (x.md > 0 || x.hilang > 0 || x.status_darurat) ? h("div", {class: "dl-chips dl-korban-baris"},
    x.md > 0 ? korbanChip(F(x.md) + " meninggal", "peringatan", "merah") : null, x.hilang > 0 ? korbanChip(F(x.hilang) + " hilang", "peringatan", "merah") : null,
    x.status_darurat ? label(tglDarurat(x.status_darurat), "peringatan", "kuning") : null) : null;
  const kab = (x, prov) => h("div", {class: "dl-kab"}, h("b", {teks: x.nama}), prov ? h("span", {class: "bn-label", teks: namaProv(x.prov_kode, x.prov)}) : null);
  const td = (isi, n) => h("td", {class: n ? "n" : null}, isi);
  const kosong = (ik, teks) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}));
  const pesan = (teks, tautan) => app.replaceChildren(h("div", {class: "bn-blok"}, h("p", {class: "lb-p", teks}), tautan || null));
  const tdv = (isi, v) => h("td", {class: "n", "data-v": v == null ? "" : String(v)}, isi);   // sel berangka dengan kunci urut
  const tabelStd = (kepala, ...isi) => {
    const t = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, kepala.map((k, i) => h("th", {scope: "col", teks: k, "data-i": k && k !== "Kirim" && k !== "Aksi" ? String(i) : null})))));
    t.append(...isi); pasangUrut(t); return h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t);
  };

  /* ---------- urut kolom: klik kepala bertanda data-i. Provinsi ikut diurut, kab/kota di dalamnya juga; baris kecamatan/desa ikut kab-nya ---------- */
  const BLN3 = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"], LEVEL = {aman: 0, normal: 0, waspada: 1, siaga: 2, awas: 3};
  function kunci(td) {
    if (!td) return null;
    const v = td.dataset.v ?? td.textContent.trim();
    if (v === "" || v === "–") return null;
    if (/^-?[\d.]+$/.test(v)) return +v.replace(/\./g, "");
    const t = v.match(/^(\d{1,2}) (\w{3})/i);
    if (t && BLN3.includes(t[2].toLowerCase())) return BLN3.indexOf(t[2].toLowerCase()) * 100 + +t[1];
    const l = LEVEL[v.split(/\s/)[0].toLowerCase()];
    return l ?? v.toLowerCase();
  }
  function banding(a, b, arah) {
    if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;   // kosong selalu di bawah
    return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "id")) * arah;
  }
  function pasangUrut(t) {
    t.querySelectorAll("th[data-i]").forEach(th => {
      th.classList.add("dl-urut"); th.tabIndex = 0;
      const urut = () => {
        const i = +th.dataset.i, arah = th.getAttribute("aria-sort") === "descending" ? 1 : -1;
        t.querySelectorAll("th[aria-sort]").forEach(x => x.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", arah === 1 ? "ascending" : "descending");
        const tbodies = [...t.tBodies], kunciTb = [];
        for (const tb of tbodies) {
          const prov = tb.querySelector(":scope > tr.dl-prov"), sub = tb.querySelector(":scope > tr.dl-subtotal"), kel = [];
          for (const tr of tb.rows) { if (tr === prov || tr === sub) continue; if (tr.classList.contains("dl-kec-baris") || tr.classList.contains("dl-desa-baris")) kel[kel.length - 1]?.push(tr); else kel.push([tr]); }
          kel.sort((a, b) => banding(kunci(a[0].cells[i]), kunci(b[0].cells[i]), arah));
          tb.append(...kel.flat(), ...(sub ? [sub] : []));   // sub total tetap di bawah kelompoknya
          const sel = prov && prov.cells.length > 1 ? prov.cells[i] : kel[0]?.[0].cells[i];
          kunciTb.push([tb, kunci(sel)]);
        }
        kunciTb.sort((a, b) => banding(a[1], b[1], arah)).forEach(([tb]) => t.append(tb));
        if (t.tFoot) t.append(t.tFoot);
      };
      th.addEventListener("click", urut); th.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); urut(); } });
    });
  }

  function kartuMasuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
      h("p", {class: "lb-p", teks: s === 403 ? "Akunmu belum berhak membuka Pantau Banjir Dalops. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan yang boleh. Minta Super Admin menambah perannya." : "Pantau Banjir Dalops hanya untuk staf Pusdalops BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
      h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }

  /* ---------- kelompok provinsi: baris provinsi selebar tabel (atau dengan sel jumlah), tertutup sampai diklik ---------- */
  function tbodyProv(judul, meta, sel, lebarJudul, baris) {
    /* nama provinsi selebar tetap, jumlah kab/kota jadi label supaya lurus ke bawah antarbaris; sisa keterangan sesudahnya */
    const [jml, ...ket] = String(meta || "").split(", ");
    const tombol = h("button", {type: "button", class: "dl-buka dl-buka-prov", "aria-expanded": "false"}, h("b", {teks: judul}),
      jml ? h("span", {class: "dl-tag dl-tag-biru dl-jml", teks: jml}) : null, ket.length ? h("span", {class: "dl-ket", teks: ket.join(", ")}) : null);
    const kepala = h("tr", {class: "dl-prov"}, h("td", {colspan: String(lebarJudul)}, tombol), ...(sel || []));
    const tb = h("tbody", {class: "dl-grup dl-tutup"}, kepala, baris);
    kepala.addEventListener("click", e => { if (e.target.closest("a")) return; const buka = tb.classList.toggle("dl-tutup") === false; tombol.setAttribute("aria-expanded", String(buka)); });
    return tb;
  }
  function bukaSemua(wadah) {
    const b = h("button", {type: "button", class: "dl-semua"}, ikon("daftar"), h("span", {teks: "Buka semua"}));
    b.addEventListener("click", () => {
      const tutup = b.textContent === "Tutup semua";
      wadah.querySelectorAll(".dl-grup").forEach(tb => { tb.classList.toggle("dl-tutup", tutup); tb.querySelector(".dl-buka").setAttribute("aria-expanded", String(!tutup)); });
      b.lastChild.textContent = tutup ? "Buka semua" : "Tutup semua";
    });
    return b;
  }
  /* kartu laporan standar .ex-std (public/inti/kartu.css): pil kategori berikon, judul kalimat temuan (angka .hl), isi; tanpa kaki keterangan/sumber (pemilik 4 Nov 2026) */
  const hl = t => h("span", {class: "hl", teks: t});
  const bagian = (id, ik, ey, judul, ...isi) => {
    const s = h("section", {class: "ex ex-std", id: J.k === "banjir" || id.includes("-") ? id : J.k + "-" + id});   // id berawalan jenis (karhutla-*) dipakai apa adanya   // banjir tetap id lama (tautan #peta dsb.)
    s.append(h("header", {class: "ex-hd"}, h("span", {class: "ex-ey"}, ikon(ik), ey),
        h("div", {class: "ex-jd"}, h("h3", null, ...[].concat(judul)), isi.some(x => x?.querySelector?.(".dl-grup")) ? bukaSemua(s) : null)),
      h("div", {class: "ex-bd"}, ...isi.filter(Boolean)));
    return s;
  };
  const kelompokProv = (daftar, urut) => {
    const m = new Map();
    for (const x of daftar) (m.get(x.prov_kode) || m.set(x.prov_kode, []).get(x.prov_kode)).push(x);
    return [...m.entries()].sort(urut || ((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])));
  };

  /* ---------- kontak Pusdalops BPBD: kab/kota bila nomornya ada, kalau tidak provinsi (public/data/bpbd.json) ---------- */
  let kantor = null;
  const muatKantor = () => kantor || (kantor = fetch("/data/bpbd.json").then(r => r.ok ? r.json() : {kantor: []}).then(d => d.kantor || []).catch(() => []));
  const nomor = s => { const d = String(s || "").replace(/\D/g, ""); return /^0\d{8,12}$/.test(d) ? "62" + d.slice(1) : /^62\d{8,12}$/.test(d) ? d : ""; };
  function kontak(daftar, x) {
    const [p, n] = (x.kab_kode || "|").split("|"), sama = (a, b) => String(a || "").toLowerCase().replace(/^(kab\.|kabupaten)\s*/, "") === String(b || "").toLowerCase();
    const kab = daftar.find(k => k.prov === p && sama(k.kab, n) && !/provinsi/i.test(k.nama) && nomor(k.pusdalops));
    if (kab) return {nama: "Pusdalops BPBD " + x.nama, no: nomor(kab.pusdalops)};
    const prov = daftar.find(k => k.prov === p && /provinsi/i.test(k.nama) && nomor(k.pusdalops));
    return prov ? {nama: "Pusdalops BPBD Provinsi " + namaProv(p), no: nomor(prov.pusdalops)} : null;
  }

  /* ---------- peta sepekan (MapLibre, bisa zoom dan geser): kab merah belum surut, biru sudah surut ---------- */
  /* segitiga peringatan (canvas), Awas di atas Siaga; hover = level dan hari pertama mencapainya */
  function pasangPeringatan(peta, waspada, semuaKab, kodeProv, hariSt, warna) {
    if (!waspada.length) return;
    const pusat = new Map();
    semuaKab.forEach((g, i) => (g?.features || []).forEach(f => {
      let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
      JSON.stringify(f.geometry.coordinates).replace(/\[(-?[\d.]+),(-?[\d.]+)\]/g, (_, a, b) => { a = +a; b = +b; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; });
      pusat.set(kodeProv[i] + "|" + f.properties.kab, [(x0 + x1) / 2, (y0 + y1) / 2]);
    }));
    const fitur = waspada.filter(x => pusat.has(x.kab_kode)).map(x => {
      const j = x.b.findIndex(l => l === x.maks);
      return {type: "Feature", geometry: {type: "Point", coordinates: pusat.get(x.kab_kode)}, properties: {lv: x.maks, nama: x.nama, prov_kode: x.kab_kode.split("|")[0], hari: hariSt[j] || ""}};
    });
    const segitiga = isi => { const r = devicePixelRatio > 1 ? 2 : 1, n = 26 * r, c = document.createElement("canvas"); c.width = c.height = n;
      const g = c.getContext("2d"); g.scale(r, r); g.lineJoin = "round";
      g.beginPath(); g.moveTo(13, 2.5); g.lineTo(24, 22.5); g.lineTo(2, 22.5); g.closePath(); g.fillStyle = isi; g.strokeStyle = "#fff"; g.lineWidth = 2.2; g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.fillRect(11.8, 9, 2.4, 7.5); g.beginPath(); g.arc(13, 19.2, 1.4, 0, 7); g.fill();
      return {width: n, height: n, data: g.getImageData(0, 0, n, n).data}; };
    peta.addImage("awas-2", segitiga(warna("--c2") || "#e3b94e"), {pixelRatio: devicePixelRatio > 1 ? 2 : 1});
    peta.addImage("awas-3", segitiga(warna("--c1") || "#c9503a"), {pixelRatio: devicePixelRatio > 1 ? 2 : 1});
    peta.addSource("peringatan", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
    peta.addLayer({id: "peringatan", type: "symbol", source: "peringatan", layout: {"icon-image": ["concat", "awas-", ["to-string", ["get", "lv"]]],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .75, 8, 1.1], "icon-allow-overlap": true, "symbol-sort-key": ["-", 0, ["get", "lv"]]}});
    const pop = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 14, className: "dl-popup"});
    peta.on("mouseenter", "peringatan", e => { const p = e.features[0].properties; peta.getCanvas().style.cursor = "default";
      pop.setLngLat(e.features[0].geometry.coordinates).setDOMContent(h("div", {class: "dl-pop dl-pop-awas"}, h("div", {class: "dl-pop-kepala"}, lambangKab(p),
        h("div", null, h("b", {class: "dl-tip-nama", teks: p.nama}), h("div", {class: "dl-pop-label"}, status(p.lv), p.hari ? label("Mulai " + H.tglPendek(p.hari), "kalender", "abu") : null))))).addTo(peta); });
    peta.on("mouseleave", "peringatan", () => { pop.remove(); peta.getCanvas().style.cursor = ""; });
  }
  async function gambarPeta(wadah, pekan, kontrol, sk = {}, hariSt = [], Jx = J) {
    const J = Jx;   // label jenis saat peta diminta, bukan tab yang sedang tampil sesudah fetch selesai
    if (!window.maplibregl) { wadah.replaceChildren(kosong("peringatan", "Peta gagal dimuat, coba muat ulang.")); return; }
    const ambil = u => { if (!GEO.has(u)) GEO.set(u, fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)); return GEO.get(u); };   // batas wilayah dimuat sekali untuk semua tab berpeta
    const kodeProv = [...new Set(pekan.map(x => x.prov_kode))];
    const [daftarKantor, ...kabs] = await Promise.all([muatKantor(), ...kodeProv.map(p => ambil(`/geo/kabupaten/${p}.json`))]);
    /* satu kab bisa punya kejadian surut dan belum: belum menang */
    const perKab = new Map();
    for (const x of pekan) if (x.kab_kode) { const a = perKab.get(x.kab_kode); perKab.set(x.kab_kode, !a || (a.surut && !x.surut) ? x : a); }
    const fitur = [];
    kabs.forEach((g, i) => (g?.features || []).forEach(f => {
      const kode = kodeProv[i] + "|" + f.properties.kab, x = perKab.get(kode);
      if (!x) return;
      fitur.push({type: "Feature", id: fitur.length, properties: {kode, st: x.surut ? "surut" : "belum"}, geometry: f.geometry});
    }));
    wadah.replaceChildren();
    const legenda = h("div", {class: "dl-legenda-peta"}, h("b", {teks: "Legenda"}), h("span", {class: "dl-leg dl-leg-belum", teks: J.tidak}), h("span", {class: "dl-leg dl-leg-surut", teks: J.ya}));
    /* prakiraan Siaga/Awas (status.json): simbol peringatan di titik tengah kab, legenda hanya bila ada */
    const waspada = Object.values(sk).map(x => ({...x, maks: Math.max(0, ...x.b.map(l => l ?? 0))})).filter(x => x.maks >= 2);
    for (const l of [3, 2]) if (waspada.some(x => x.maks === l)) legenda.append(h("span", {class: "dl-leg dl-leg-a" + l, teks: "Prakiraan " + H.NAMA_LEVEL[l]}));
    /* bawaan: seluruh Indonesia (Aceh sampai Papua) di dasar terang, sesuai permintaan pemilik 3 Nov */
    const peta = new maplibregl.Map({container: wadah, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]],
      fitBoundsOptions: {padding: 16}, minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
    /* saring di samping Tutup semua, boleh lebih dari satu (pemilik 5 Nov 2026): tak ada yang dipilih = semua tampil;
       ada yang dipilih = hanya itu. Surut/belum menyaring wilayah kab, Siaga/Awas menyaring penanda prakiraan (lv 2/3). */
    const saring = new Set();
    const terapSaring = () => {
      const st = ["surut", "belum"].filter(v => saring.has(v)), lv = [["siaga", 2], ["awas", 3]].filter(([v]) => saring.has(v)).map(([, l]) => l);
      for (const id of ["kab-isi", "kab-garis"]) if (peta.getLayer(id)) peta.setFilter(id, saring.size ? ["in", ["get", "st"], ["literal", st]] : null);
      if (peta.getLayer("peringatan")) peta.setFilter("peringatan", saring.size ? ["in", ["get", "lv"], ["literal", lv]] : null);
    };
    const tSaring = [["surut", J.ya, "ok"], ["belum", J.tidak, J.ik], ...(J.pra === false ? [] : [["siaga", H.NAMA_LEVEL[2], "peringatan"], ["awas", H.NAMA_LEVEL[3], "peringatan"]])].map(([v, t, ik]) => {
      const b = h("button", {type: "button", class: "dl-saring-btn dl-saring-" + v, "aria-pressed": "false"}, ikon(ik), t);
      b.addEventListener("click", () => { saring.has(v) ? saring.delete(v) : saring.add(v); b.setAttribute("aria-pressed", String(saring.has(v))); terapSaring(); });
      return b;
    });
    wadah.append(legenda, h("div", {class: "dl-peta-alat"}, h("div", {class: "dl-saring", role: "group", "aria-label": "Saring peta: status surut dan prakiraan"}, tSaring), ...(kontrol ? [kontrol] : [])));   // legenda tengah bawah; tombol Buka semua di samping +/−
    peta.touchZoomRotate.disableRotation();
    const css = getComputedStyle(document.documentElement), warna = n => css.getPropertyValue(n).trim();
    peta.on("load", () => {
      peta.addSource("kab", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
      peta.addLayer({id: "kab-isi", type: "fill", source: "kab", paint: {"fill-color": ["match", ["get", "st"], "belum", warna("--c1") || "#c9503a", warna("--c5") || "#4f8fc4"],
        "fill-opacity": ["case", ["boolean", ["feature-state", "sorot"], false], .9, .7]}});
      peta.once("idle", terapSaring);
      peta.addLayer({id: "kab-garis", type: "line", source: "kab", paint: {"line-color": ["case", ["boolean", ["feature-state", "sorot"], false], "#0b2545", "#ffffff"], "line-width": ["case", ["boolean", ["feature-state", "sorot"], false], 2, .8]}});
      /* batas wilayah seluruh Indonesia: provinsi tebal gelap, kab/kota tipis abu; dimuat sesudah lapisan banjir supaya peta cepat tampil */
      const SEMUA_PROV = ["11","12","13","14","15","16","17","18","19","21","31","32","33","34","35","36","51","52","53","61","62","63","64","65","71","72","73","74","75","76","81","82","91","92","93","94","95","96"];
      Promise.all([ambil("/geo/provinsi.json"), ...SEMUA_PROV.map(p => kodeProv.includes(p) ? Promise.resolve(kabs[kodeProv.indexOf(p)]) : ambil(`/geo/kabupaten/${p}.json`))]).then(([prov, ...semuaKab]) => {
        const sebelum = peta.getLayer("kab-isi") ? "kab-isi" : undefined;
        peta.addSource("batas-kab", {type: "geojson", data: {type: "FeatureCollection", features: semuaKab.flatMap(g => g?.features || [])}});
        peta.addLayer({id: "batas-kab", type: "line", source: "batas-kab", paint: {"line-color": "#8a93a8", "line-width": ["interpolate", ["linear"], ["zoom"], 4, .3, 8, .9], "line-opacity": .7}}, sebelum);
        if (prov) {
          peta.addSource("batas-prov", {type: "geojson", data: prov});
          peta.addLayer({id: "batas-prov", type: "line", source: "batas-prov", paint: {"line-color": "#0b2545", "line-width": ["interpolate", ["linear"], ["zoom"], 4, .9, 8, 2], "line-opacity": .75}});
        }
        pasangPeringatan(peta, waspada, semuaKab, SEMUA_PROV, hariSt, warna);
        terapSaring();   // penanda dipasang belakangan: saring yang sudah dipilih ikut berlaku
      });
      let sorot = null;
      peta.on("mousemove", "kab-isi", e => { const id = e.features[0].id; if (sorot !== null && sorot !== id) peta.setFeatureState({source: "kab", id: sorot}, {sorot: false}); sorot = id; peta.setFeatureState({source: "kab", id}, {sorot: true}); peta.getCanvas().style.cursor = "pointer"; });
      peta.on("mouseleave", "kab-isi", () => { if (sorot !== null) peta.setFeatureState({source: "kab", id: sorot}, {sorot: false}); sorot = null; peta.getCanvas().style.cursor = ""; });
      /* kartu muncul saat kursor melewati kab; tetap terbuka selama kursor di kab atau di kartunya (supaya tombol bisa diklik) */
      const pop = new maplibregl.Popup({closeButton: true, closeOnClick: false, maxWidth: "290px", offset: 12, className: "dl-popup"});
      let kodePop = null, tunda = null;
      pop.on("close", () => { kodePop = null; });   // tombol x: kab yang sama bisa dibuka lagi
      const tutup = () => { clearTimeout(tunda); tunda = setTimeout(() => { pop.remove(); kodePop = null; }, 250); };
      const tahan = () => clearTimeout(tunda);
      const tampil = e => {
        tahan();
        const kode = e.features[0].properties.kode, x = perKab.get(kode); if (!x) return;
        if (kode === kodePop) return;
        kodePop = kode;
        pop.setLngLat(e.lngLat).setDOMContent(kartuKab(x, kontak(daftarKantor, x))).addTo(peta);
        const el = pop.getElement(); el.addEventListener("mouseenter", tahan); el.addEventListener("mouseleave", tutup);
      };
      peta.on("mousemove", "kab-isi", tampil);
      peta.on("click", "kab-isi", tampil);   // layar sentuh: ketuk
      peta.on("mouseleave", "kab-isi", tutup);
    });
  }
  /* angka terdampak di kartu: hanya yang dilaporkan; kalau keduanya kosong, satu baris keterangan kecil (bukan "–" besar) */
  function kotakAngka(x) {
    const isi = [[x.md, "meninggal", "peringatan"], [x.hilang, "hilang", "peringatan"], [x.kk, "KK terdampak", "sosial"], [x.jiwa, "jiwa terdampak", "personel"], [x.mengungsi, "jiwa mengungsi", "tenda"]]
      .filter(([v], i) => v != null && (i > 1 || v > 0));   // korban hanya bila ada
    return isi.length ? h("div", {class: "dl-tip-angka"}, isi.slice(0, x.md > 0 || x.hilang > 0 ? 3 : 2).map(([v, t, ik]) => h("div", null, h("span", {class: "dl-tip-ik"}, ikon(ik)), h("b", {teks: F(v)}), h("span", {teks: t}))))
      : h("p", {class: "dl-tip-kosong"}, ikon("tunggu"), "Jumlah terdampak belum dilaporkan");
  }

  /* lambang kab/kota di kepala kartu (/lambang, sama dengan /bnpb/relawan); belum termuat atau tak ada: lambang provinsi, gagal: disembunyikan */
  let LAMBANG = {};
  fetch("/lambang/kabkota.json").then(r => r.json()).then(d => { LAMBANG = d; }).catch(() => {});
  const lambangKab = x => {
    const slug = LAMBANG[x.prov_kode + "|" + x.nama];
    const img = h("img", {class: "dl-pop-lambang", alt: "", loading: "lazy", src: slug ? `/lambang/kabkota/${slug}.png` : `/lambang/provinsi/${x.prov_kode}.png`});
    img.addEventListener("error", () => { img.hidden = true; }, {once: true});
    return img;
  };

  /* kartu klik di peta: kondisi, nama, angka yang dilaporkan, kontak BPBD dengan tombol WA dan telepon */
  function kartuKab(x, k) {
    const rincian = h("button", {type: "button", class: "dl-pop-rinci"}, ikon("kalender"), "Histori");
    rincian.addEventListener("click", () => bukaHistori(x));
    return h("div", {class: "dl-pop"},
      h("div", {class: "dl-pop-kepala"}, lambangKab(x),
        h("div", null, h("div", {class: "dl-pop-judul"}, h("b", {class: "dl-tip-nama", teks: x.nama}), label(namaProv(x.prov_kode, x.prov), "pin", "abu")),
          h("div", {class: "dl-pop-label"}, surutLabel(x.surut),
            Object.assign(label(H.tglPendek(x.terakhir), "kalender", "garis"), {title: "Kabar terakhir " + H.tglPendek(x.terakhir)})))),
      kotakAngka(x),
      h("div", {class: "dl-pop-kontak"},
        h("div", {class: "dl-pop-tombol"},
          k ? h("a", {class: "dl-pop-wa", href: `https://wa.me/${k.no}?text=${encodeURIComponent(H.pesanWA({...x, kurang: x.kurang || []}, H.KATA[J.k]))}`, target: "_blank", rel: "noopener"}, ikonWA(), "Chat") : null,
          k ? h("a", {class: "dl-pop-telp", href: "tel:+" + k.no}, ikon("sinyal"), "Telepon") : null, rincian)));
  }

  /* ---------- tabel wilayah bertingkat ---------- */
  /* histori harian satu kab dalam pop-up (dialog bawaan peramban: Esc dan klik latar menutup) */
  let dialog;
  function bukaHistori(x, sub) {
    const rw = (x.riwayat || []).slice().reverse(), denganKondisi = !x.provinsi && !x.tingkatKec;
    const maksKK = Math.max(1, ...rw.map(r => r.kk || 0));
    /* ringkasan: angka terakhir yang terisi, perubahan dari laporan sebelumnya yang terisi */
    const th = (teks, att) => h("th", {scope: "col", ...att, teks});
    const histori = rw.length ? h("div", {class: "ad-tabel-wadah dl-tabel-wadah dl-hs-wadah"}, h("table", {class: "ad-tabel dl-tabel dl-hs"},
      h("thead", null, h("tr", null, th("Tanggal", {rowspan: "2", "data-i": "0"}), th("Terdampak", {colspan: "2"}), th("Wilayah", {colspan: "2"}), J.tinggi ? th("Tinggi air", {rowspan: "2", "data-i": "5"}) : null, denganKondisi ? th("Status", {rowspan: "2"}) : null, denganKondisi ? th("Kondisi", {rowspan: "2"}) : null, denganKondisi ? th("Upaya penanganan", {rowspan: "2"}) : null),
        h("tr", {class: "dl-th-sub"}, th("KK", {"data-i": "1"}), th("Jiwa", {"data-i": "2"}), th("Kec", {"data-i": "3"}), th("Desa", {"data-i": "4"}))),
      h("tbody", null, rw.map(r => h("tr", null, h("td", {class: "dl-tgl", "data-v": r.tgl.replace(/-/g, ""), teks: H.tglPendek(r.tgl)}),
        h("td", {class: "n dl-hs-kk", "data-v": r.kk ?? ""}, h("span", {class: "dl-hs-batang"}, h("i", {class: "dl-hs-isi", "data-w": r.kk ? String(Math.round(r.kk / maksKK * 100)) : "0"})), h("b", {teks: angka(r.kk)})),
        tdv(angka(r.jiwa), r.jiwa), tdv(angka(r.n_kec), r.n_kec), tdv(angka(r.n_desa), r.n_desa), J.tinggi ? tdv(tinggi(r.tinggi_cm), r.tinggi_cm?.[1]) : null,
        denganKondisi ? h("td", null, surutLabel(r.surut)) : null, denganKondisi ? h("td", {class: "dl-kondisi", teks: r.kondisi || "–"}) : null, denganKondisi ? h("td", {class: "dl-tindak"}, daftarUpaya(r.upaya, 4)) : null)))))
      : h("p", {class: "dl-redup", teks: "Histori harian belum ada."});
    if (!dialog) {
      dialog = h("dialog", {class: "dl-dialog", "aria-labelledby": "dl-dialog-judul"});
      dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
      document.body.append(dialog);
    }
    const tutup = h("button", {type: "button", class: "dl-ikon dl-tutup-dialog", "aria-label": "Tutup"}, ikon("tambah"));
    tutup.addEventListener("click", () => dialog.close());
    dialog.replaceChildren(h("div", {class: "dl-dialog-kepala"}, h("span", {class: "dl-hs-lencana"}, ikon("kalender")),
        h("div", null, h("h2", {id: "dl-dialog-judul", teks: "Histori harian " + x.nama}),
          sub ? h("p", {class: "dl-sub", teks: sub}) : h("div", {class: "dl-sub dl-dialog-info"}, label(namaProv(x.prov_kode, x.prov), "pin"),
            label(J.kata[0].toUpperCase() + J.kata.slice(1) + " sejak " + H.tglPendek(x.mulai), J.ik), label("Kabar terakhir " + H.tglPendek(x.terakhir), "kalender"))), tutup),
      h("div", {class: "dl-gulir"}, histori));
    /* lebar batang lewat CSSOM (bukan atribut style), aman untuk CSP */
    dialog.querySelectorAll(".dl-hs-isi").forEach(i => { i.style.width = i.dataset.w + "%"; });
    dialog.querySelectorAll("table.dl-hs").forEach(pasangUrut);
    dialog.showModal();
  }

  const tombolHistori = (x, sub) => { const b = h("button", {type: "button", class: "dl-ikon", "aria-label": "Histori harian " + x.nama, "data-tip": "<b>Histori harian</b><br>angka" + (x.provinsi ? " semua kab/kota" : x.tingkatKec ? " desa kecamatan ini" : " dan kondisi") + " tiap hari logbook"}, ikon("kalender"));
    b.addEventListener("click", e => { e.stopPropagation(); bukaHistori(x, sub); }); return b; };

  /* kecamatan dan desa: buka lokasinya di Google Maps (tab baru) */
  const tombolMaps = (...bagian) => { const q = bagian.filter(Boolean).join(", ");
    const a = h("a", {class: "dl-ikon", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q), target: "_blank", rel: "noopener", "aria-label": "Buka " + q + " di Google Maps", "data-tip": "<b>Google Maps</b><br>lihat lokasinya"}, ikon("pin"));
    a.addEventListener("click", e => e.stopPropagation()); return a; };

  /* kab di peta banjir: /banjir/peta?wil=<kab_kode> langsung masuk kab itu */
  const tombolPetaBanjir = x => h("a", {class: "dl-ikon", href: "/banjir/peta?wil=" + encodeURIComponent(x.kab_kode), target: "_blank", rel: "noopener", "aria-label": "Buka " + x.nama + " di peta banjir", "data-tip": "<b>Peta banjir</b><br>status per kecamatan"}, ikon("banjir"));
  const chipSurut = r => h("div", {class: "dl-chips"}, r.nBelum ? label(F(r.nBelum) + " " + (J.pra === false ? J.tidak_k : "belum"), J.ik, "merah") : null, r.nKab - r.nBelum ? label(F(r.nKab - r.nBelum) + " " + (J.pra === false ? J.ya_k : "sudah"), "ok", "biru") : null);

  function bagianWilayah(pekan, prov, hari, sk = {}, hariSt = []) {
    const tbodies = prov.map((r, i) => {
      const baris = [];
      for (const x of r.baris.slice().sort((a, b) => a.surut - b.surut || a.nama.localeCompare(b.nama))) {
        const tombol = h("button", {type: "button", class: "dl-buka dl-buka-kab", "aria-expanded": "false"}, h("b", {teks: x.nama}));
        const tr = h("tr", {class: "dl-kab-baris"}, h("td", {class: "dl-wil", "data-v": x.nama}, tombol, chipKorban(x)), tdv(F(x.id.length), x.id.length), tdv(surutLabel(x.surut), x.surut ? J.ya_k : J.tidak_k), tdv(F(H.lama(x, hari)), H.lama(x, hari)),
          tdv(angka(x.kk), x.kk), tdv(angka(x.jiwa), x.jiwa), tdv(angka(x.kk_u), x.kk_u), tdv(angka(x.mengungsi), x.mengungsi), tdv(tinggi(x.tinggi_cm), x.tinggi_cm?.[1]), tdv(H.tglPendek(x.terakhir), x.terakhir.replace(/-/g, "")),
          h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x), x.surut ? null : tombolWA(x, H.pesanWA({...x, kurang: []}, H.KATA[J.k]), "permintaan pembaruan"))));
        /* kecamatan lalu desa: baris tabel bertingkat, sama dengan provinsi dan kab/kota */
        const kecBaris = H.perKec(x).filter(k => k.nama && k.desa.length).map(k => {   // kecamatan tak disebut atau tanpa rincian desa tidak ditampilkan; kab tanpa rincian tidak bisa diklik
          const jml = f => k.desa.some(d => d[f] != null) ? k.desa.reduce((s, d) => s + (d[f] || 0), 0) : null;
          const ting = k.desa.filter(d => d.tinggi_cm).map(d => d.tinggi_cm), rentang = ting.length ? [Math.min(...ting.map(t => t[0])), Math.max(...ting.map(t => t[1]))] : null;
          const kec = k.nama ? "Kecamatan " + k.nama.replace(/^(kecamatan|kec\.?)\s*/i, "") : null, kabProv = [x.nama, namaProv(x.prov_kode, x.prov)];
          const aksi = (...q) => h("td", null, h("div", {class: "dl-aksi"}, tombolMaps(...q, ...kabProv)));
          /* histori kecamatan: desa kecamatan ini di tiap hari logbook, dijumlah */
          const rwKec = k.nama ? (x.riwayat || []).map(r => {
            const ds = (r.desa || []).filter(d => (d.kec || "").toLowerCase() === k.nama.toLowerCase()); if (!ds.length) return null;
            const n = f => ds.some(d => d[f] != null) ? ds.reduce((a, d) => a + (d[f] || 0), 0) : null, t = ds.filter(d => d.tinggi_cm).map(d => d.tinggi_cm);
            return {tgl: r.tgl, kk: n("kk"), jiwa: n("jiwa"), n_kec: 1, n_desa: ds.length, tinggi_cm: t.length ? [Math.min(...t.map(v => v[0])), Math.max(...t.map(v => v[1]))] : null};
          }).filter(r => r && H.adaAngka(r)) : [];   // hari tanpa angka tidak masuk histori; tanpa satu hari pun, tombol histori hilang
          const tk = h("button", {type: "button", class: "dl-buka dl-buka-kec", "aria-expanded": "false"}, h("b", {teks: k.nama ? "Kec. " + k.nama.replace(/^(kecamatan|kec\.?)\s*/i, "") : "Kecamatan tidak disebut"}),
            k.desa.length ? label(`${F(k.desa.length)} desa/kel.`, "pin", "abu") : null);
          const trk = h("tr", {class: "dl-kec-baris", hidden: true}, h("td", {class: "dl-wil"}, tk), td("", true), td("", true), td("", true), td(angka(jml("kk")), true), td(angka(jml("jiwa")), true), td("", true), td("", true), td(tinggi(rentang), true), td("", true),
            kec ? h("td", null, h("div", {class: "dl-aksi"}, rwKec.length ? tombolHistori({nama: kec, tingkatKec: true, riwayat: rwKec}, `${kec}, ${x.nama}, per hari logbook`) : null, tombolMaps(kec, ...kabProv))) : td("", true));
          // desa tanpa satu angka pun (KK, jiwa, tinggi air) tidak dibuka: baris isinya cuma tanda "–" (pemilik 5 Nov 2026)
          const desa = k.desa.filter(H.adaAngka).map(d => h("tr", {class: "dl-desa-baris", hidden: true}, h("td", {class: "dl-wil", teks: d.nama}), td("", true), td("", true), td("", true), td(angka(d.kk), true), td(angka(d.jiwa), true), td("", true), td("", true), td(tinggi(d.tinggi_cm), true), td("", true), aksi(d.nama, kec)));
          const bukaKec = jadi => { desa.forEach(r => r.hidden = !jadi); tk.setAttribute("aria-expanded", String(jadi)); };
          if (desa.length) trk.addEventListener("click", () => bukaKec(tk.getAttribute("aria-expanded") !== "true")); else { trk.classList.add("dl-tanpa"); tk.removeAttribute("aria-expanded"); tk.disabled = true; }
          return {trk, desa, bukaKec};
        });
        const buka = paksa => {
          const jadi = paksa || tombol.getAttribute("aria-expanded") !== "true";
          kecBaris.forEach(k => { k.trk.hidden = !jadi; if (!jadi) k.bukaKec(false); });
          tombol.setAttribute("aria-expanded", String(jadi)); tr.classList.toggle("dl-aktif", jadi);
        };
        if (kecBaris.length) tr.addEventListener("click", e => { if (!e.target.closest("a,button.dl-ikon")) buka(); }); else tr.classList.add("dl-tanpa");
        baris.push(tr, ...kecBaris.flatMap(k => [k.trk, ...k.desa]));
      }
      const latest = r.baris.reduce((m, x) => x.terakhir > m ? x.terakhir : m, "");
      /* sub total per provinsi di bawah kab/kotanya (pemilik 3 Nov 2026) */
      baris.push(h("tr", {class: "dl-subtotal"}, h("td", {class: "dl-wil", teks: "Sub total " + namaProv(r.prov_kode, r.prov)}), td(F(r.kejadian), true), h("td", null, chipSurut(r)), td("", true),
        td(F(r.kk), true), td(F(r.jiwa), true), td(F(r.kk_u), true), td(F(r.mengungsi), true), td("", true), td(H.tglPendek(latest), true), td("", true)));
      const nama = namaProv(r.prov_kode, r.prov), gab = {nama, provinsi: true, riwayat: r.baris.reduce((a, x) => H.gabungRiwayat(a, x.riwayat || []), [])};
      const aksi = h("div", {class: "dl-aksi"}, tombolHistori(gab, `Jumlah ${F(r.nKab)} kab/kota per hari logbook`),
        r.nBelum ? tombolWA({nama: "Provinsi " + nama}, H.pesanProv(nama, r.baris, H.KATA[J.k]), "permintaan pembaruan") : null);
      const mdProv = r.baris.reduce((a, x) => a + (x.md || 0), 0), hilangProv = r.baris.reduce((a, x) => a + (x.hilang || 0), 0);
      return tbodyProv(nama, `${F(r.nKab)} kab/kota` + (mdProv ? `, ${F(mdProv)} meninggal` : "") + (hilangProv ? `, ${F(hilangProv)} hilang` : ""), [tdv(F(r.kejadian), r.kejadian), tdv(chipSurut(r), r.nBelum), td("", true),
        tdv(F(r.kk), r.kk), tdv(F(r.jiwa), r.jiwa), tdv(F(r.kk_u), r.kk_u), tdv(F(r.mengungsi), r.mengungsi), td("", true), tdv(H.tglPendek(latest), latest.replace(/-/g, "")), h("td", null, aksi)], 1, baris);
    });
    const jml = k => prov.reduce((s, r) => s + r[k], 0);
    const kaki = h("tfoot", null, h("tr", null, h("td", {teks: "Jumlah"}), td(F(jml("kejadian")), true), h("td", null, h("div", {class: "dl-chips"}, label(`${F(jml("nBelum"))} ${J.tidak_k}`, J.ik, "merah"), label(`${F(jml("nKab") - jml("nBelum"))} ${J.ya_k}`, "ok", "biru"))), td("", true), td(F(jml("kk")), true), td(F(jml("jiwa")), true), td(F(jml("kk_u")), true), td(F(jml("mengungsi")), true), td("", true), td("", true), td("", true)));
    /* kepala dua tingkat: Terdampak dan Pengungsi masing-masing KK dan Jiwa */
    const th = (teks, att) => h("th", {scope: "col", ...att, teks});
    const kepala = h("thead", null, h("tr", null, ...["Wilayah", "Kejadian", "Status", "Lama, hari"].map((k, i) => th(k, {rowspan: "2", "data-i": String(i)})),
        th("Terdampak", {colspan: "2", class: "dl-th-grup"}), th("Pengungsi", {colspan: "2", class: "dl-th-grup"}), th("Tinggi air", {rowspan: "2", "data-i": "8"}), th("Kabar terakhir", {rowspan: "2", "data-i": "9"}), th("Aksi", {rowspan: "2"})),
      h("tr", {class: "dl-th-sub"}, th("KK", {"data-i": "4"}), th("Jiwa", {"data-i": "5"}), th("KK", {"data-i": "6"}), th("Jiwa", {"data-i": "7"})));
    const t = h("table", {class: "ad-tabel dl-tabel" + (J.tinggi ? "" : " dl-tanpa-tinggi")}, kepala); t.append(...tbodies, kaki); pasangUrut(t);   // longsor: kolom Tinggi air disembunyikan
    const tabel = h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t);
    const wadahPeta = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"})), Jk = J;
    requestAnimationFrame(() => {   // MapLibre butuh wadah yang sudah terpasang dan berukuran
      const semua = wadahPeta.closest("section")?.querySelector(".ex-hd .dl-semua");
      semua?.remove(); semua?.classList.add("dl-semua-peta");
      gambarPeta(wadahPeta, pekan, semua, sk, hariSt, Jk);
    });
    const nBelum = jml("nBelum"), nKab = jml("nKab"), mdTot = pekan.reduce((a, x) => a + (x.md || 0), 0);
    return bagian("peta", J.ik, `Kondisi ${J.kata} terkini`,
      nBelum ? [hl(`${F(nBelum)} dari ${F(nKab)} kab/kota`), ` ${J.kata} sepekan ${J.tidak_k}`, ...jml("jiwa") ? [", ", hl(`${F(jml("jiwa"))} jiwa`), " terdampak"] : [], ...mdTot ? [", ", hl(`${F(mdTot)} meninggal`)] : []] : [hl(`${F(nKab)} kab/kota`), ` ${J.kata} sepekan, semuanya ${J.ya_k}`],
      wadahPeta,
      tabel);
  }

  /* ---------- upaya penanganan: kab belum surut, tindakan terakhir dari logbook / laporan harian (scripts/data/dalops_banjir.py) ---------- */
  const upayaKini = (x, hari) => x.upaya_tgl && H.selisih(hari, x.upaya_tgl) < 1;
  /* daftar upaya: `maks` butir pertama tampil, sisanya di bawah "+n lainnya" (details bawaan, tanpa JS) */
  function daftarUpaya(butir, maks = 3) {
    if (!butir?.length) return h("span", {class: "dl-redup", teks: "Belum ada laporan upaya"});
    const ul = xs => h("ul", {class: "dl-upaya"}, xs.map(t => h("li", {teks: t})));
    return butir.length <= maks ? ul(butir) : h("div", null, ul(butir.slice(0, maks)),
      h("details", {class: "dl-upaya-lain"}, h("summary", {teks: `+${F(butir.length - maks)} lainnya`}), ul(butir.slice(maks))));
  }
  const chipTindak = (xs, ik, nada) => xs?.length ? h("div", {class: "dl-chips"}, xs.map(t => label(t, ik, nada))) : h("span", {class: "dl-redup", teks: "–"});
  function bagianUpaya(pekan, hari) {
    const belum = pekan.filter(x => !x.surut), lapor = belum.filter(x => upayaKini(x, hari)).length;
    if (!belum.length) return bagian("upaya", "personel", "Upaya penanganan", `Semua wilayah ${J.kata} sepekan ${J.ya_k}`, kosong("ok", "Tidak ada penanganan yang masih berjalan."));
    let n = 0;
    const tb = kelompokProv(belum).map(([p, xs]) => tbodyProv(namaProv(p, xs[0].prov), `${F(xs.length)} kab/kota`, null, 8, xs.map(x =>
      h("tr", null, td(F(++n), true), h("td", null, kab(x)), h("td", {class: "dl-tindak"}, daftarUpaya(x.upaya)),
        h("td", {class: "dl-tindak"}, chipTindak(x.terlibat, "personel", "abu")), h("td", {class: "dl-tindak"}, chipTindak(x.kebutuhan, "logistik", "kuning")),
        h("td", {class: "dl-tindak"}, chipTindak(x.kendala, "peringatan", "merah")),
        tdv(x.upaya_tgl ? H.tglPendek(x.upaya_tgl) : "–", (x.upaya_tgl || "").replace(/-/g, "")),
        h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x)))))));
    return bagian("upaya", "personel", "Upaya penanganan", [hl(`${F(belum.length)} kab/kota`), ` ${J.pra === false ? J.tidak_k : "masih ditangani"}, `, hl(`${F(lapor)} kab/kota`), " melaporkan upaya pada hari logbook terakhir"],
      tabelStd(["No", "Kab/kota", "Upaya terakhir", "Pihak terlibat", "Kebutuhan", "Kendala", "Laporan upaya", "Aksi"], ...tb));
  }

  /* ---------- perlu ditanya ---------- */
  function bagianTanya(daftar, sk, st, hari) {
    if (!daftar.length) return bagian("tanya", "ok", "Kelengkapan data", `Semua wilayah yang ${J.tidak_k} sudah berkabar lengkap`, kosong("ok", "Tidak ada yang perlu ditanya hari ini."));
    let n = 0;
    const pra = J.pra !== false;   // jenis tanpa prakiraan: kolom Prakiraan besok dibuang
    const tb = kelompokProv(daftar, (a, b) => b[1][0].umur - a[1][0].umur || b[1].length - a[1].length).map(([p, xs]) =>
      tbodyProv(namaProv(p, xs[0].prov), `${F(xs.length)} kab/kota`, null, pra ? 7 : 6, xs.map(x => {
        /* status.json hanya memuat kecamatan berlevel > 0 (scripts/banjir/status.py): kab tak tercantum = Aman */
        const b = st ? (sk[x.kab_kode]?.b?.[1] ?? 0) : null, kurang = [...x.kurang.filter(k => k !== "kabar"), ...["kk_u", "mengungsi"].filter(f => x[f] == null),
          ...(x.kec.length || x.desa.some(d => d.kec) ? [] : ["kec"]), ...(x.desa.length ? [] : ["desa"]), ...(upayaKini(x, hari) ? [] : ["upaya"])].sort((a, b) => URUT_KURANG.indexOf(a) - URUT_KURANG.indexOf(b));   // pengungsi, kecamatan, desa: tampil saja, bukan syarat ditanya
        return h("tr", null, td(F(++n), true), h("td", null, kab(x)),
          tdv(h("b", {class: "dl-umur " + nadaUmur(x.umur), teks: x.umur < 1 ? "Hari ini" : F(x.umur) + " hari"}), x.umur), tdv(H.tglPendek(x.terakhir), x.terakhir.replace(/-/g, "")),
          tdv(kurang.length ? h("div", {class: "dl-chips"}, kurang.map(k => label(KURANG[k][0], KURANG[k][1], "kuning"))) : label("Angka lengkap", "ok", "hijau"), kurang.length),
          pra ? tdv(b == null ? "–" : status(b), b) : null,
          h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x), tombolWA(x, H.pesanWA(upayaKini(x, hari) ? x : {...x, kurang: [...x.kurang, "upaya"]}, H.KATA[J.k]), "permintaan pembaruan"))));
      })));
    return bagian("tanya", "tunggu", "Kelengkapan data", ["Terdapat ", hl(`${F(daftar.length)} kab/kota`), " di ", hl(`${F(tb.length)} provinsi`), " yang perlu dilakukan konfirmasi data dan informasi"],
      tabelStd(["No", "Kab/kota", "Tanpa kabar", "Kabar terakhir", "Data belum ada", ...pra ? ["Prakiraan besok"] : [], "Aksi"], ...tb));
  }

  /* ---------- prakiraan banjir per hari + hujan tiga hari per tanggal ---------- */
  function bagianPrakiraan(sk, sudah, hariStatus, wadah, min, pekan = []) {
    const daftar = H.siaga(sk, sudah, min), hari = hariStatus || [], perHari = daftar.some(x => x.h3d?.length);
    const dua = daftar.filter(x => x.sudah && x.maks >= 2).length;
    /* histori banjir sepekan kab itu (kalau sudah banjir); kab yang muncul di dua kelompok surut digabung */
    const histori = x => { const ks = pekan.filter(k => k.kab_kode === x.kab_kode); return ks.length ? tombolHistori({...ks[0], riwayat: ks.reduce((a, k) => H.gabungRiwayat(a, k.riwayat || []), [])}) : null; };
    let n = 0;
    const sel = (x, j) => tdv(h("div", {class: "dl-hari"}, status(x.b[j] ?? 0), perHari ? h("span", {class: "dl-mm", teks: x.h3d[j] == null ? "–" : F(Math.round(x.h3d[j])) + " mm"}) : null), (x.b[j] ?? 0) * 1e4 + (x.h3d?.[j] || 0));
    const tb = kelompokProv(daftar, (a, b) => Math.max(...b[1].map(x => x.maks)) - Math.max(...a[1].map(x => x.maks)) || b[1].length - a[1].length).map(([p, xs]) =>
      tbodyProv(namaProv(p), `${F(xs.length)} kab/kota`, ringkasProv(xs), 2, xs.map(x => h("tr", {class: x.sudah && x.maks >= 2 ? "dl-sorot" : null}, td(F(++n), true), h("td", null, kab(x)),
        tdv(x.sudah ? label("Sudah " + J.kata, J.ik, "merah") : label("Normal", "ok", "hijau"), x.sudah ? 1 : 0),
        ...hari.map((_, j) => sel(x, j)), perHari ? null : tdv(x.h3 == null ? "–" : F(Math.round(x.h3)), x.h3),
        h("td", null, h("div", {class: "dl-aksi"}, histori(x), J.tinggi ? tombolPetaBanjir(x) : null, tombolWA(x, H.pesanSiaga(x, hari, H.KATA[J.k]), "peringatan dini")))))));
    /* baris provinsi: banjir sepekan, status tertinggi dan hujan tiga hari tertinggi tiap tanggal (seperti tabel Wilayah Siaga peta banjir) */
    function ringkasProv(xs) {
      const nBanjir = xs.filter(x => x.sudah).length;
      return [tdv(nBanjir ? label(F(nBanjir) + " sudah " + J.kata, J.ik, "merah") : label("Normal", "ok", "hijau"), nBanjir),
        ...hari.map((_, j) => { const lv = Math.max(0, ...xs.map(x => x.b[j] ?? 0)), mm = Math.max(0, ...xs.map(x => x.h3d?.[j] ?? 0));
          return tdv(h("div", {class: "dl-hari"}, status(lv), perHari ? h("span", {class: "dl-mm", teks: mm ? F(Math.round(mm)) + " mm" : "–"}) : null), lv * 1e4 + mm); }),
        perHari ? null : tdv(F(Math.round(Math.max(0, ...xs.map(x => x.h3 || 0)))), Math.max(0, ...xs.map(x => x.h3 || 0))), td("", true)].filter(Boolean);
    }
    wadah.replaceChildren(
      daftar.length ? tabelStd(["No", "Kab/kota", J.kata[0].toUpperCase() + J.kata.slice(1) + " sepekan", ...hari.map(H.tglPendek), ...(perHari ? [] : ["Hujan tiga hari, mm"]), "Aksi"], ...tb) : null);
    wadah.closest?.("section")?.querySelectorAll(".dl-semua span").forEach(s => { s.textContent = "Buka semua"; });
  }

  const siagaJudul = xs => { const dua = xs.filter(x => x.sudah).length;
    return xs.length ? [hl(`${F(xs.length)} kab/kota`), " berstatus Siaga atau Awas dalam tiga hari ke depan", ...dua ? [", ", hl(`${F(dua)}`), ` di antaranya sudah ${J.kata}`] : []] : "Tidak ada kab/kota berstatus Siaga atau Awas tiga hari ke depan"; };
  function bagianArti() {
    return h("div", {class: "dl-arti"}, h("b", {class: "dl-arti-judul", teks: "Arti prakiraan"}), [[1, "Hujan tiga hari 40 mm atau lebih, atau sungai mulai naik."], [2, "Hujan tiga hari 80 mm di wilayah rawan banjir, atau debit sungai tinggi."], [3, "Hujan tiga hari 120 mm di wilayah sangat rawan, atau sungai meluap."]]
      .map(([l, t]) => h("div", {class: "dl-arti-l" + l}, status(l), h("span", {class: "bn-label", teks: t}))));
  }

  /* ---------- mitigasi (hanya tab Banjir): usulan langkah per kab/kota dari status.json, posko.json, dan logbook; hitungan di H.mitigasi ---------- */
  const PITA = {terdampak: ["banjir", "dl-mt-terdampak"], awas: ["peringatan", "dl-mt-awas"], siaga: ["peringatan", "dl-mt-siaga"], pantau: ["tunggu", "dl-mt-pantau"]};
  function bagianMitigasi(st, posko, pekan, hari) {
    if (!st || J.k !== "banjir") return null;
    const m = H.mitigasi(st, posko, pekan, hari), n = m.n;
    if (!n.total) return null;
    const A = n.terdampak ? [hl(F(n.terdampak)), " terdampak ditangani sekarang"] : [];
    const B = n.awas && n.siaga ? [hl(F(n.awas)), " Awas dan ", hl(F(n.siaga)), " Siaga disiapkan"] : n.awas || n.siaga ? [hl(F(n.awas || n.siaga)), n.awas ? " Awas disiapkan" : " Siaga disiapkan"] : [];
    const judul = ["Mitigasi ", hl(`${F(n.total)} kab/kota`), ": ", ...A, ...A.length && B.length ? [", "] : [], ...B, ...!A.length && !B.length ? ["pantauan khusus"] : []];
    const t = h("table", {class: "ad-tabel dl-tabel dl-mt"}, h("thead", null, h("tr", null, ["Kab/kota", "Tenggat", "Langkah BPBD bersama BNPB"].map(k => h("th", {scope: "col", teks: k})))));
    for (const g of m.grup) {
      const [ik, kls] = PITA[g.kunci];
      t.append(h("tbody", {class: "dl-mt-grup " + kls}, h("tr", {class: "dl-mt-pita"}, h("td", {colspan: "3"}, h("span", {class: "dl-mt-judul"}, ikon(ik), `${g.judul}, ${F(g.baris.length)} kab/kota`))),
        g.baris.map(x => h("tr", null, h("td", {class: "dl-mt-kab"}, h("b", {teks: x.nama}), h("span", {class: "bn-label", teks: namaProv(x.prov_kode)})),
          h("td", {class: "dl-mt-tg", teks: x.tenggat || "–"}), h("td", {class: "dl-mt-ln", teks: x.langkah})))));
    }
    return bagian("mitigasi", "peringatan", "Usulan langkah", judul, h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t));
  }

  function render(d, st, posko, jenis = "banjir") {
    J = JN[jenis];
    const hari = d.hari, kel = H.kelompok(d.kejadian, hari), pekan = H.sepekan(kel, hari), prov = H.perProv(pekan);
    const tanya = H.perluDitanya(kel, hari, H.KATA[J.k]);
    const sk = st ? H.statusKab(st, J.lv) : {}, sudah = new Set(pekan.map(x => x.kab_kode)), hariSt = st?.hari || [];

    const wadahPra = h("div", {class: "dl-isi"});
    const adaPra = J.pra !== false;
    if (st && adaPra) bagianPrakiraan(sk, sudah, hariSt, wadahPra, 2, pekan);

    panel[jenis].replaceChildren(...[   // replaceChildren bawaan menulis 'null': saring dulu
      bagianWilayah(pekan, prov, hari, sk, hariSt),
      bagianTanya(tanya, sk, st, hari),
      !adaPra ? null : st ? bagian("prakiraan", "peringatan", "Peringatan dini", siagaJudul(H.siaga(sk, sudah, 2)), wadahPra, J.tinggi ? bagianArti() : null)
        : bagian("prakiraan", "peringatan", "Peringatan dini", `Prakiraan ${J.kata} belum termuat`, kosong("peringatan", "status.json gagal dimuat, coba muat ulang.")),
      bagianMitigasi(st, posko, pekan, hari),
      bagianUpaya(pekan, hari)].filter(Boolean));   // upaya penanganan paling bawah (pemilik 5 Nov 2026)
    /* tombol Buka semua bagian prakiraan dipasang setelah tabelnya ada */
    const pra = panel[jenis].querySelector("section[id$='prakiraan']");
    if (pra && !pra.querySelector(".dl-semua") && pra.querySelector(".dl-grup")) pra.querySelector(".ex-jd").append(bukaSemua(pra));
    J = JN[aktif] || J;   // render tab yang selesai dimuat di latar tidak mengganti kata jenis tab yang sedang tampil
    pasangTip();
  }

  /* ---------- tab Laporan (pemilik 5 Nov 2026: isi /pelaporan pindah ke sini): tiga kartu buat laporan + arsip laporan harian (public/arsip_laporan.js) ---------- */
  const KARTU_LAPORAN = [["/laporan-bnpb", "Laporan bencana harian", "Laporan Kejadian Bencana Harian BNPB: isi angka kejadian, pratinjau, lalu unduh.", "PPTX, PDF"],
    ["/laporan", "Laporan karhutla harian", "Titik panas, luas terbakar, belum padam, dan status per provinsi dan kabupaten untuk hari terpilih.", "Cetak, PDF"],
    ["/paparan", "Laporan per daerah", "Paparan karhutla satu provinsi: pilih provinsi dan tanggal, susun slide, lalu unduh.", "PPTX, PDF"]];
  let arsipDimuat = false;
  function panelLaporan(p) {
    p.append(h("div", {class: "dl-lp-grid"}, ...KARTU_LAPORAN.map(([href, judul, isi, jenis]) =>
      h("a", {class: "dl-lp-k", href}, ikon("simpan"), h("b", {teks: judul}), h("span", {teks: isi}), h("small", {teks: jenis})))),
      h("div", {id: "arsipLaporan"}));   // judul "Arsip laporan harian" dari arsip_laporan.js sendiri
  }
  function bukaLaporan() {
    if (arsipDimuat) return window.ArsipLaporan?.muat();
    arsipDimuat = true;   // skrip arsip memasang pendengar klik pada #arsipLaporan saat dimuat, jadi dimuat sesudah wadahnya ada
    document.head.append(h("link", {rel: "stylesheet", href: "/arsip_laporan.css"}));
    const s = h("script", {src: "/arsip_laporan.js"}); s.addEventListener("load", () => window.ArsipLaporan?.muat()); document.body.append(s);
  }

  /* ---------- pemilih jenis (gaya Operasi Udara | Operasi Darat): Karhutla, Banjir, Longsor, Laporan (pemilik 5 Nov 2026).
     Satu panel per jenis, dirender sekali saat pertama dibuka; ganti tab hanya mengganti hidden. J (label per jenis) ikut tab yang tampil,
     supaya pop-up peta dan tombol WA di panel itu memakai kata jenisnya. ---------- */
  const TAB = [["karhutla", "Karhutla", "karhutla"], ["banjir", "Banjir", "banjir"], ["longsor", "Longsor", "longsor"], ["gunungapi", "Gunung Api", "gunungapi"], ["gempa", "Gempa & Tsunami", "gempabumi"],
    ["cuaca", "Cuaca Ekstrem", "cuaca"], ["kekeringan", "Kekeringan", "kekeringan"], ["gelombang", "Gelombang Pasang", "gelombang_pasang"], ["permukiman", "Kebakaran Permukiman", "kebakaran_permukiman"], ["laporan_masuk", "Laporan Masuk", "daftar"], ["laporan", "Laporan", "simpan"]];
  const panel = Object.fromEntries(TAB.map(([k]) => [k, h("div", {class: "dl-panel", id: "tab-" + k, role: "tabpanel", hidden: true})]));
  const sudahBuka = new Set();
  let aktif = "banjir";   // tab yang tampil: J dikembalikan ke jenis ini sesudah tab lain selesai dimuat di latar
  function pilihTab(k, tombol) {
    tombol.forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === k)));
    for (const [n, p] of Object.entries(panel)) p.hidden = n !== k;
    if (location.hash.slice(1) !== k) history.replaceState(null, "", "#" + k);
    aktif = k; if (JN[k]) J = JN[k];
    if (k === "karhutla") window.DalopsKarhutla?.tampil();   // peta yang lahir di panel tersembunyi diukur ulang
    if (k === "laporan") { if (!sudahBuka.has(k)) panelLaporan(panel.laporan); bukaLaporan(); }
    else if (!sudahBuka.has(k)) muat(k);
    sudahBuka.add(k);
  }
  function kerangka() {
    const tombol = TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", "data-tab": k, "aria-selected": "false", "aria-controls": "tab-" + k}, ikon(ik), t));
    const seg = h("div", {class: "dl-seg", role: "tablist", "aria-label": "Jenis pantauan"}, ...tombol);
    seg.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) pilihTab(b.dataset.tab, tombol); });
    app.replaceChildren(seg, ...Object.values(panel));
    const dariHash = () => TAB.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : null;
    addEventListener("hashchange", () => { const k = dariHash(); if (k) pilihTab(k, tombol); });   // tautan /bnpb/dalops#laporan dari halaman ini juga
    pilihTab(dariHash() || "banjir", tombol);
  }

  const alat = () => ({bagian, hl, h, F, ikon, label, kosong, tdv, td, tbodyProv, tombolWA, tombolHistori, pasangUrut, pasangTip, namaProv, bukaSemua, kontak, muatKantor});
  let jawabAwal = null;   // jawaban /api/dalops/banjir dari pemeriksaan akses, dipakai sekali oleh panel Banjir
  let poskoJson = null;   // /banjir/data/posko.json (publik) untuk langkah posko di Mitigasi; gagal = langkah posko dilewati
  let statusJson = null;  // /banjir/data/status.json membawa level banjir (b) dan longsor (l): diambil sekali untuk kedua tab
  async function muat(jenis) {
    const p = panel[jenis], tulis = teks => p.replaceChildren(h("div", {class: "bn-blok"}, h("p", {class: "lb-p", teks})));
    tulis("Memuat data " + jenis + "…");
    if (jenis === "laporan_masuk") return window.DalopsLaporanMasuk.muat(p, alat());   // rekap harian WA Koordalops (dalops_laporan_masuk.js)
    if (jenis === "gunungapi") {   // data publik tanpa rute baru: status PVMBG dari pipeline banjir
      let g; try { g = await fetch("/banjir/data/gunungapi_status.json"); } catch (e) { return tulis("Tidak ada sinyal. Muat ulang halaman ini."); }
      if (!g.ok) return tulis("Data gunung api gagal dimuat (" + g.status + "). Muat ulang halaman ini.");
      return window.DalopsGunungApi.render(p, await g.json(), alat());
    }
    let r = jenis === "banjir" ? jawabAwal : null; if (jenis === "banjir") jawabAwal = null;
    try { r = r || await fetch("/api/dalops/" + jenis, {credentials: "same-origin"}); } catch (e) { return tulis("Tidak ada sinyal. Muat ulang halaman ini."); }
    if (r.status === 404) return tulis(JN[jenis].pra === false ? `Data ${jenis} belum tersedia: rute /api/dalops/${jenis} belum aktif atau datanya belum diunggah.` : `Data ${jenis} belum diunggah. Jalankan python3 scripts/data/dalops_banjir.py --unggah di mesin Pusdalops.`);
    if (!r.ok) return tulis("Data gagal dimuat (" + r.status + "). Muat ulang halaman ini.");
    const d = await r.json();
    if (jenis === "karhutla") return window.DalopsKarhutla.render(p, d, alat());
    const st = JN[jenis].pra === false ? null : await (statusJson || (statusJson = fetch("/banjir/data/status.json").then(x => x.ok ? x.json() : null).catch(() => null)));
    render(d, st, jenis === "banjir" ? await (poskoJson || (poskoJson = fetch("/banjir/data/posko.json").then(x => x.ok ? x.json() : null).catch(() => null))) : null, jenis);
  }

  (async () => {
    /* akses dulu lewat data Banjir; jawabannya dipakai ulang panel Banjir supaya tidak diambil dua kali */
    let r;
    try { r = await fetch("/api/dalops/banjir", {credentials: "same-origin"}); } catch (e) { return pesan("Tidak ada sinyal. Muat ulang halaman ini."); }
    if (r.status === 401 || r.status === 403) return kartuMasuk(r.status);
    jawabAwal = r;
    kerangka();
  })();
})();
