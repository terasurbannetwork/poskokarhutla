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
  /* saring peta per jenis (pemilik 11 Nov 2026 "filternya diatur lagi"): status selalu ada; dampak yang relevan per jenis; prakiraan hanya jenis berprakiraan */
  const SARING = {banjir: ["ungsi", "kabar"], longsor: ["korban", "kabar"], gempa: ["korban", "ungsi", "kabar"], cuaca: ["korban", "ungsi", "kabar"],
    kekeringan: ["kabar"], gelombang: ["ungsi", "kabar"], permukiman: ["korban", "ungsi", "kabar"]};
  const NAMA_SARING = {korban: ["Ada korban jiwa", "peringatan"], ungsi: ["Ada pengungsi", "personel"], kabar: ["Kabar > 3 hari", "tunggu"], kurang: ["Data belum lengkap", "kurang"]};
  let J = JN.banjir;
  /* kamera bersama semua peta jenis (pemilik 11 Nov 2026 "mapnya tetap aja, gausah ngulang"): peta yang tampil mencatat pusat dan zoom,
     peta jenis lain melompat ke posisi itu saat lahir dan saat ditampilkan */
  const KAM = window.DalopsKamera = {c: null, ikat(peta) { peta.getContainer()._peta = peta; if (KAM.c) peta.jumpTo(KAM.c);
    peta.on("moveend", () => { if (peta.getContainer().offsetParent) KAM.c = {center: peta.getCenter(), zoom: peta.getZoom()}; }); },
    /* legenda dan ringkasan jadi satu bilah di dasar peta (pemilik 11 Nov 2026 "sebaris sama ini"): legenda di kiri, angka di kanan */
    dasar(wadah) { const lg = wadah.querySelector(":scope > .dl-legenda-peta"), ub = wadah.querySelector(":scope > .dl-peta-ubin"); if (!ub || wadah.querySelector(".dl-peta-dasar")) return;
      const d = document.createElement("div"); d.className = "dl-peta-dasar"; if (lg) d.append(lg); d.append(ub); wadah.append(d); }};
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
    /* kepala kartu = nama seksi berikon; kalimat temuan pindah ke title dan ubin Angka utama (AGENTS 3.5 pembaruan 11 Nov 2026) */
    const kal = h("span", null, ...[].concat(judul));
    s.append(h("header", {class: "ex-hd"}, h("span", {class: "ex-ey", hidden: true}, ikon(J.ik || "banjir"), J.kata ? J.kata[0].toUpperCase() + J.kata.slice(1) : "Dalops"),
        h("div", {class: "ex-jd"}, h("h3", {title: kal.textContent}, ikon(ik), ey), isi.some(x => x?.querySelector?.(".dl-grup")) ? bukaSemua(s) : null)),
      h("div", {class: "ex-bd"}, ...isi.filter(Boolean)));
    return s;
  };
  /* pilihan Pulau lalu Provinsi (daftar provinsi mengikuti pulau), dipakai bilah saring Kondisi terkini dan Peringatan dini (pemilik 12 Nov 2026) */
  const PULAU = {1: "Sumatera", 2: "Sumatera", 3: "Jawa", 5: "Bali dan Nusa Tenggara", 6: "Kalimantan", 7: "Sulawesi", 8: "Maluku", 9: "Papua"};
  const pulauDari = k => PULAU[String(k)[0]] || "Lainnya";
  function pilihWilayah(kodes, berubah) {
    const sar = {pulau: "", prov: ""}, urutP = Object.values(PULAU);
    const pilihan = (lbl, ik, isi) => h("label", {class: "dl-pilih"}, ikon(ik), h("span", {class: "dl-pilih-t", teks: lbl}), isi);
    const opsi = (semua, xs) => [h("option", {value: "", teks: semua}), ...xs.map(([v, t]) => h("option", {value: v, teks: t}))];
    const sProv = h("select", {"aria-label": "Provinsi"}), isiProv = () => {
      const xs = [...new Set(kodes.map(String))].filter(p => !sar.pulau || pulauDari(p) === sar.pulau).map(p => [p, namaProv(p)]).sort((a, b) => a[1].localeCompare(b[1]));
      if (!xs.some(([v]) => v === sar.prov)) sar.prov = "";
      sProv.replaceChildren(...opsi("Semua provinsi", xs)); sProv.value = sar.prov; };
    const sPulau = h("select", {"aria-label": "Pulau"}, ...opsi("Semua pulau", [...new Set(kodes.map(pulauDari))].sort((a, b) => urutP.indexOf(a) - urutP.indexOf(b)).map(t => [t, t])));
    sPulau.addEventListener("change", () => { sar.pulau = sPulau.value; isiProv(); berubah(); });
    sProv.addEventListener("change", () => { sar.prov = sProv.value; berubah(); });
    isiProv();
    return {el: [pilihan("Pulau", "pin", sPulau), pilihan("Provinsi", "daftar", sProv)], aktif: () => !!(sar.pulau || sar.prov),
      cocok: pk => (!sar.pulau || pulauDari(pk) === sar.pulau) && (!sar.prov || String(pk) === sar.prov)};
  }
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
    peta.addImage("awas-1", segitiga(warna("--c3") || "#e9d36b"), {pixelRatio: devicePixelRatio > 1 ? 2 : 1});   // Waspada (pemilik 11 Nov 2026)
    peta.addImage("awas-2", segitiga(warna("--c2") || "#e3b94e"), {pixelRatio: devicePixelRatio > 1 ? 2 : 1});
    peta.addImage("awas-3", segitiga(warna("--c1") || "#c9503a"), {pixelRatio: devicePixelRatio > 1 ? 2 : 1});
    peta.addSource("peringatan", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
    peta.addLayer({id: "peringatan", type: "symbol", source: "peringatan", layout: {"icon-image": ["concat", "awas-", ["to-string", ["get", "lv"]]],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 4, ["case", ["==", ["get", "lv"], 1], .6, .75], 8, ["case", ["==", ["get", "lv"], 1], .9, 1.1]], "icon-allow-overlap": true, "symbol-sort-key": ["-", 0, ["get", "lv"]]}});
    const pop = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 14, className: "dl-popup"});
    peta.on("mouseenter", "peringatan", e => { const p = e.features[0].properties; peta.getCanvas().style.cursor = "default";
      /* pemilik 11 Nov 2026 "bagusin": kepala biru muda (lambang, nama, provinsi), isi baris berlabel rata kolom */
      const lama = p.hari ? Math.max(1, Math.round((Date.now() - Date.parse(p.hari + "T00:00:00+07:00")) / 864e5) + 1) : 0;
      pop.setLngLat(e.features[0].geometry.coordinates).setDOMContent(kartuMini({lambang: lambangKab(p), nama: p.nama, wilayah: namaProv(p.prov_kode),
        pil: [status(p.lv), p.hari ? label("Mulai " + H.tglPendek(p.hari), "kalender", "garis") : null].filter(Boolean),
        angka: [[lama ? F(lama) : null, "hari berturut-turut", "tunggu"]]})).addTo(peta); });
    peta.on("mouseleave", "peringatan", () => { pop.remove(); peta.getCanvas().style.cursor = ""; });
  }
  /* gempa BMKG terkini di peta Gempa (pemilik 11 Nov 2026 "kan sering ada peringatan gempa"): katalog InaTEWS publik
     /gempa/data/inatews_katalog.json (pipeline gempa), dalam jendela periode; bulatan sebesar magnitudo, warna kelas magnitudo; saring M >= 5 */
  const KELAS_M = [[6, "#c0392b", "M 6 ke atas"], [5, "#e8743b", "M 5 sampai 5,9"], [4, "#e0b400", "M 4 sampai 4,9"], [0, "#7f8ea3", "di bawah M 4"]];
  async function pasangGempaBmkg(peta, wadah, legenda) {
    let d; try { d = await (await fetch("/gempa/data/inatews_katalog.json")).json(); } catch (e) { return; }
    const kol = d.kolom, ix = n => kol.indexOf(n), batas = Date.now() / 1e3 - periode * 86400;
    const gm = (d.baris || []).filter(r => r[ix("t")] >= batas).sort((a, b) => a[ix("m")] - b[ix("m")]);
    if (!gm.length || peta.getSource("gempa-bmkg")) return;
    peta.addSource("gempa-bmkg", {type: "geojson", data: {type: "FeatureCollection", features: gm.map((r, i) => ({type: "Feature", id: i, geometry: {type: "Point", coordinates: [r[ix("lon")], r[ix("lat")]]}, properties: {m: r[ix("m")], i}}))}});
    peta.addLayer({id: "gempa-bmkg", type: "circle", source: "gempa-bmkg", paint: {
      "circle-color": ["step", ["get", "m"], KELAS_M[3][1], 4, KELAS_M[2][1], 5, KELAS_M[1][1], 6, KELAS_M[0][1]],
      "circle-radius": ["interpolate", ["linear"], ["get", "m"], 2, 3, 4, 5.5, 5, 8.5, 6, 12, 7, 17], "circle-opacity": .85, "circle-stroke-color": "#fff", "circle-stroke-width": 1.2}});
    const wib = t => new Date((t + 7 * 3600) * 1e3).toISOString().replace("T", " ").slice(0, 16).replace(/^(\d+)-(\d+)-(\d+)/, (_, y, mo, dd) => `${+dd} ${H.tglPendek(`${y}-${mo}-${dd}`).split(" ")[1]}`) + " WIB";
    const pop = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 10, className: "dl-popup"});
    peta.on("mouseenter", "gempa-bmkg", e => { peta.getCanvas().style.cursor = "default"; const r = gm[e.features[0].properties.i];
      pop.setLngLat(e.features[0].geometry.coordinates).setDOMContent(kartuMini({ik: "gempabumi", nama: "Gempa M " + String(r[ix("m")]).replace(".", ","), wilayah: r[ix("tempat")],
        pil: [label(wib(r[ix("t")]), "kalender", "garis")],
        angka: [[String(r[ix("m")]).replace(".", ","), "magnitudo", "gempabumi"], [F(Math.round(r[ix("dalam")])), "km kedalaman", "pin"]]})).addTo(peta); });
    peta.on("mouseleave", "gempa-bmkg", () => { pop.remove(); peta.getCanvas().style.cursor = ""; });
    const saring = wadah.querySelector(".dl-saring");
    if (saring) { const b = h("button", {type: "button", class: "dl-saring-btn dl-saring-m5", "aria-pressed": "false"}, ikon("gempabumi"), "M ≥ 5");
      b.addEventListener("click", () => { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); peta.setFilter("gempa-bmkg", on ? [">=", ["get", "m"], 5] : null); });
      saring.append(b); }
    legenda.append(...KELAS_M.filter(([m], i) => gm.some(r => (i === 3 ? r[ix("m")] < 4 : r[ix("m")] >= m && (i === 0 || r[ix("m")] < KELAS_M[i - 1][0])))).map(([, w, t]) => {
      const sp = h("span", {class: "dl-leg dl-leg-gm", teks: t}); sp.style.setProperty("--w", w); return sp; }));
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
    const acuan = pekan.reduce((m, x) => x.terakhir > m ? x.terakhir : m, "");
    const fitur = [];
    kabs.forEach((g, i) => (g?.features || []).forEach(f => {
      const kode = kodeProv[i] + "|" + f.properties.kab, x = perKab.get(kode);
      if (!x) return;
      fitur.push({type: "Feature", id: fitur.length, properties: {kode, st: x.surut ? "surut" : "belum", korban: (x.md || 0) + (x.hilang || 0) > 0 ? 1 : 0, ungsi: x.mengungsi > 0 ? 1 : 0,
        kabar: !x.surut && acuan && H.selisih(acuan, x.terakhir) >= 3 ? 1 : 0, kurang: [x.kk, x.jiwa, x.kk_u, x.mengungsi].some(v => v == null) ? 1 : 0}, geometry: f.geometry});
    }));
    wadah.replaceChildren();
    const legenda = h("div", {class: "dl-legenda-peta"}, h("b", {teks: "Legenda"}), h("span", {class: "dl-leg dl-leg-belum", teks: J.tidak}), h("span", {class: "dl-leg dl-leg-surut", teks: J.ya}),
      fitur.some(f => f.properties.kurang) ? h("span", {class: "dl-leg dl-leg-kurang"}, h("i", {class: "dl-leg-lencana"}, ikon("kurang")), "Data belum lengkap") : null);
    /* prakiraan Siaga/Awas (status.json): simbol peringatan di titik tengah kab, legenda hanya bila ada */
    const waspada = Object.values(sk).map(x => ({...x, maks: Math.max(0, ...x.b.map(l => l ?? 0))})).filter(x => x.maks >= 1);
    for (const l of [3, 2, 1]) if (waspada.some(x => x.maks === l)) legenda.append(h("span", {class: "dl-leg dl-leg-a" + l, teks: "Prakiraan " + H.NAMA_LEVEL[l]}));
    /* bawaan: seluruh Indonesia (Aceh sampai Papua) di dasar terang, sesuai permintaan pemilik 3 Nov */
    const peta = new maplibregl.Map({container: wadah, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]],
      fitBoundsOptions: {padding: 16}, minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
    /* saring di samping Tutup semua, boleh lebih dari satu (pemilik 5 Nov 2026): tak ada yang dipilih = semua tampil;
       ada yang dipilih = hanya itu. Surut/belum menyaring wilayah kab, Siaga/Awas menyaring penanda prakiraan (lv 2/3). */
    const saring = new Set();
    const terapSaring = () => {
      const st = ["surut", "belum"].filter(v => saring.has(v)), lv = [["waspada", 1], ["siaga", 2], ["awas", 3]].filter(([v]) => saring.has(v)).map(([, l]) => l);
      const flag = ["korban", "ungsi", "kabar", "kurang"].filter(v => saring.has(v));
      /* dalam satu kelompok = atau, antarkelompok = dan; hanya prakiraan yang dipilih = wilayah kejadian disembunyikan */
      const syarat = [...(st.length ? [["in", ["get", "st"], ["literal", st]]] : []), ...flag.map(v => ["==", ["get", v], 1])];
      const fKab = !saring.size ? null : syarat.length ? ["all", ...syarat] : ["==", ["get", "st"], "-"];
      for (const id of ["kab-isi", "kab-garis"]) if (peta.getLayer(id)) peta.setFilter(id, fKab);
      if (peta.getLayer("kab-kurang")) peta.setFilter("kab-kurang", fKab ? ["all", fKab, ["==", ["get", "kurang"], 1]] : ["==", ["get", "kurang"], 1]);
      if (peta.getLayer("kab-kurang-titik")) peta.setFilter("kab-kurang-titik", fKab);
      if (peta.getLayer("peringatan")) peta.setFilter("peringatan", saring.size ? ["in", ["get", "lv"], ["literal", lv]] : null);
    };
    const tSaring = [["surut", J.ya, "ok"], ["belum", J.tidak, J.ik], ...[...(SARING[J.k] || []), "kurang"].filter(v => fitur.some(f => f.properties[v])).map(v => [v, ...NAMA_SARING[v]]),   // pil Data belum lengkap (pemilik 12 Nov 2026)
      ...(J.pra === false ? [] : [["waspada", H.NAMA_LEVEL[1], "peringatan"], ["siaga", H.NAMA_LEVEL[2], "peringatan"], ["awas", H.NAMA_LEVEL[3], "peringatan"]])].map(([v, t, ik]) => {
      const b = h("button", {type: "button", class: "dl-saring-btn dl-saring-" + v, "aria-pressed": "false"}, ikon(ik), t);
      b.addEventListener("click", () => { saring.has(v) ? saring.delete(v) : saring.add(v); b.setAttribute("aria-pressed", String(saring.has(v))); terapSaring(); });
      return b;
    });
    legenda.querySelector("b")?.remove(); wadah.append(legenda);   /* legenda di dalam peta, kiri bawah di atas bilah ringkasan (pemilik 11 Nov 2026) */    // legenda di bawah peta, dalam pil (sistem desain dashboard D16)
    wadah.append(h("div", {class: "dl-peta-alat"}, h("div", {class: "dl-saring", role: "group", "aria-label": "Saring peta: status surut dan prakiraan"}, tSaring), ...(kontrol ? [kontrol] : [])));   // legenda tengah bawah; tombol Buka semua di samping +/−
    peta.touchZoomRotate.disableRotation(); KAM.ikat(peta);
    const css = getComputedStyle(document.documentElement), warna = n => css.getPropertyValue(n).trim();
    peta.on("load", () => {
      peta.addSource("kab", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
      peta.addLayer({id: "kab-isi", type: "fill", source: "kab", paint: {"fill-color": ["match", ["get", "st"], "belum", warna("--c1") || "#c9503a", warna("--c5") || "#4f8fc4"],
        "fill-opacity": ["case", ["boolean", ["feature-state", "sorot"], false], .9, .7]}});
      peta.once("idle", terapSaring);
      peta.addLayer({id: "kab-garis", type: "line", source: "kab", paint: {"line-color": ["case", ["boolean", ["feature-state", "sorot"], false], "#0b2545", "#ffffff"], "line-width": ["case", ["boolean", ["feature-state", "sorot"], false], 2, .8]}});
      /* data belum lengkap (KK/jiwa terdampak atau mengungsi belum dilaporkan): garis kuning putus-putus (pemilik 12 Nov 2026 "agar ada tandanya") */
      peta.addLayer({id: "kab-kurang", type: "line", source: "kab", filter: ["==", ["get", "kurang"], 1], paint: {"line-color": "#f2c200", "line-width": 2, "line-dasharray": [2, 1.5]}});
      /* garis saja tidak kelihatan (pemilik 12 Nov 2026 "pakai icon bulatan"): bulatan kuning di kanan atas titik tengah kab, di atas segitiga peringatan */
      const tengah = g => { let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
        JSON.stringify(g.coordinates).replace(/\[(-?[\d.]+),(-?[\d.]+)\]/g, (_, a, b) => { a = +a; b = +b; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; });
        return [(x0 + x1) / 2, (y0 + y1) / 2]; };
      peta.addSource("kab-kurang-titik", {type: "geojson", data: {type: "FeatureCollection", features: fitur.filter(f => f.properties.kurang).map(f => ({type: "Feature", properties: f.properties, geometry: {type: "Point", coordinates: tengah(f.geometry)}}))}});
      /* lencana papan catatan bertanda seru (ikon "kurang", sama dengan tabel dan legenda), bukan bulatan (pemilik 12 Nov 2026) */
      const r = devicePixelRatio > 1 ? 2 : 1, c = document.createElement("canvas"); c.width = c.height = 22 * r;
      const g = c.getContext("2d"); g.scale(r, r);
      g.beginPath(); g.roundRect(1, 1, 20, 20, 5); g.fillStyle = "#f2c200"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.fill(); g.stroke();
      g.translate(3.2, 3); g.scale(.65, .65); g.strokeStyle = "#0b2545"; g.lineWidth = 2.6; g.lineCap = g.lineJoin = "round";
      "M9 3h6v3H9z|M9 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15|M12 10v4.5|M12 17.5h.01".split("|").forEach(d => g.stroke(new Path2D(d)));
      peta.addImage("kurang-ikon", {width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data}, {pixelRatio: r});
      peta.addLayer({id: "kab-kurang-titik", type: "symbol", source: "kab-kurang-titik", layout: {"icon-image": "kurang-ikon", "icon-allow-overlap": true, "icon-offset": [12, -12],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .8, 8, 1.1]}});
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
        if (peta.getLayer("kab-kurang-titik")) peta.moveLayer("kab-kurang-titik");   // bulatan data belum lengkap di atas segitiga dan batas wilayah
        if (J.k === "gempa") pasangGempaBmkg(peta, wadah, legenda);
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
  /* angka terdampak di kartu (pemilik 12 Nov 2026 "agar ada KK mengungsi dan jiwa mengungsinya, kalau belum ada tulis NA terus kuningin"):
     empat kotak tetap (KK dan jiwa terdampak, KK dan jiwa mengungsi), yang belum dilaporkan tertulis NA berlatar kuning; korban hanya bila ada */
  function kotakAngka(x) {
    const korban = [[x.md, "meninggal", "peringatan"], [x.hilang, "hilang", "peringatan"]].filter(([v]) => v > 0);
    const isi = [...korban, [x.kk, "KK terdampak", "sosial"], [x.jiwa, "jiwa terdampak", "personel"], [x.kk_u, "KK mengungsi", "tenda"], [x.mengungsi, "jiwa mengungsi", "tenda"]];
    return h("div", {class: "dl-tip-angka"}, isi.map(([v, t, ik]) => h("div", v == null ? {class: "dl-na", title: t + " belum dilaporkan"} : null,
      h("span", {class: "dl-tip-ik"}, ikon(ik)), h("b", {teks: v == null ? "NA" : F(v)}), h("span", {teks: t}))));
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

  /* kartu hover seragam dengan kartu klik kab/kota (pemilik 11 Nov 2026 "yang lain tolong kaya gitu"): lambang atau ikon, nama, pil wilayah,
     pil status dan tanggal, kotak angka berikon */
  function kartuMini({lambang = null, ik = null, nama, wilayah = null, pil = [], angka = [], bawah = null}) {
    const kepalaIk = lambang || (ik ? h("span", {class: "dl-pop-ikbesar"}, ikon(ik)) : null);
    const isi = angka.filter(([v]) => v != null && v !== "");
    return h("div", {class: "dl-pop dl-pop-mini"},
      h("div", {class: "dl-pop-kepala"}, kepalaIk,
        h("div", null, h("b", {class: "dl-tip-nama", teks: nama}), wilayah ? h("small", {class: "dl-pop-wil"}, ikon("pin"), wilayah) : null)),
      pil.length ? h("div", {class: "dl-pop-label"}, ...pil) : null,
      isi.length ? h("div", {class: "dl-tip-angka"}, isi.slice(0, 3).map(([v, t, i]) => h("div", v === "NA" ? {class: "dl-na"} : null, h("span", {class: "dl-tip-ik"}, ikon(i)), h("b", {teks: v}), h("span", {teks: t})))) : null,
      bawah);
  }
  /* kartu klik di peta: kondisi, nama, angka yang dilaporkan, kontak BPBD dengan tombol WA dan telepon */
  function kartuKab(x, k) {
    const rincian = h("button", {type: "button", class: "dl-pop-rinci"}, ikon("kalender"), "Histori");
    rincian.addEventListener("click", () => bukaHistori(x));
    return h("div", {class: "dl-pop"},
      h("div", {class: "dl-pop-kepala"}, lambangKab(x),
        h("div", null, h("div", {class: "dl-pop-judul"}, h("b", {class: "dl-tip-nama", teks: x.nama}), label(namaProv(x.prov_kode, x.prov), "pin", "abu")),
          /* tanggal mulai dan selesai (pemilik 12 Nov 2026 "kapan tanggal mulai kapan tanggal selesainya"); selesai = kabar surut terakhir */
          h("div", {class: "dl-pop-label"}, surutLabel(x.surut),
            Object.assign(label("Mulai " + H.tglPendek(x.mulai || x.terakhir), "kalender", "garis"), {title: "Kejadian mulai " + H.tglPendek(x.mulai || x.terakhir)}),
            x.surut ? Object.assign(label("Selesai " + H.tglPendek(x.terakhir), "kalender", "garis"), {title: "Dilaporkan selesai " + H.tglPendek(x.terakhir)})
              : Object.assign(label("Kabar " + H.tglPendek(x.terakhir), "tunggu", "garis"), {title: "Kabar terakhir " + H.tglPendek(x.terakhir) + ", belum selesai"})))),
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
    b.addEventListener("click", e => { e.stopPropagation(); x.jn ? pakaiJ(x.jn, () => bukaHistori(x, sub)) : bukaHistori(x, sub); }); return b; };   // baris lintas: kata jenis barisnya

  /* kecamatan dan desa: buka lokasinya di Google Maps (tab baru) */
  const tombolMaps = (...bagian) => { const q = bagian.filter(Boolean).join(", ");
    const a = h("a", {class: "dl-ikon", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q), target: "_blank", rel: "noopener", "aria-label": "Buka " + q + " di Google Maps", "data-tip": "<b>Google Maps</b><br>lihat lokasinya"}, ikon("pin"));
    a.addEventListener("click", e => e.stopPropagation()); return a; };

  /* kab di peta banjir: /banjir/peta?wil=<kab_kode> langsung masuk kab itu */
  const tombolPetaBanjir = x => h("a", {class: "dl-ikon", href: "/banjir/peta?wil=" + encodeURIComponent(x.kab_kode), target: "_blank", rel: "noopener", "aria-label": "Buka " + x.nama + " di peta banjir", "data-tip": "<b>Peta banjir</b><br>status per kecamatan"}, ikon("banjir"));
  const chipSurut = r => h("div", {class: "dl-chips"}, r.nBelum ? label(F(r.nBelum) + " " + (J.pra === false ? J.tidak_k : "belum"), J.ik, "merah") : null, r.nKab - r.nBelum ? label(F(r.nKab - r.nBelum) + " " + (J.pra === false ? J.ya_k : "sudah"), "ok", "biru") : null);

  function bagianWilayah(pekan, prov, hari, sk = {}, hariSt = [], ubin = null) {
    /* tanggal mulai dan selesai tiap baris (pemilik 12 Nov 2026); selesai = kabar terakhir yang menyatakan surut, belum selesai = "Belum" */
    const selMulai = t => tdv(t ? H.tglPendek(t) : "–", t ? t.replace(/-/g, "") : "0");
    const selSelesai = (sudah, t) => sudah && t ? tdv(H.tglPendek(t), t.replace(/-/g, "")) : tdv(h("span", {class: "dl-belum-selesai", teks: "Belum"}), "99999999");
    /* saring tabel wilayah (pemilik 12 Nov 2026 "ini juga bisa difilter"): pilihan sama dengan pil peta; status = atau, sisanya = dan */
    const acuanKabar = pekan.reduce((m, x) => x.terakhir > m ? x.terakhir : m, "");
    const ciri = x => ({belum: !x.surut, surut: !!x.surut, ungsi: x.mengungsi > 0, korban: (x.md || 0) + (x.hilang || 0) > 0,
      kurang: [x.kk, x.jiwa, x.kk_u, x.mengungsi].some(v => v == null), kabar: !x.surut && !!acuanKabar && H.selisih(acuanKabar, x.terakhir) >= 3});
    const kabRows = [];
    const tbodies = prov.map((r, i) => {
      const baris = [];
      for (const x of r.baris.slice().sort((a, b) => a.surut - b.surut || a.nama.localeCompare(b.nama))) {
        const tombol = h("button", {type: "button", class: "dl-buka dl-buka-kab", "aria-expanded": "false"}, h("b", {teks: x.nama}));
        const tr = h("tr", {class: "dl-kab-baris"}, h("td", {class: "dl-wil", "data-v": x.nama}, tombol, chipKorban(x)), tdv(F(x.id.length), x.id.length), tdv(surutLabel(x.surut), x.surut ? J.ya_k : J.tidak_k), tdv(F(H.lama(x, hari)), H.lama(x, hari)), selMulai(x.mulai || x.terakhir), selSelesai(x.surut, x.terakhir),
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
          const trk = h("tr", {class: "dl-kec-baris", hidden: true}, h("td", {class: "dl-wil"}, tk), td("", true), td("", true), td("", true), td("", true), td("", true), td(angka(jml("kk")), true), td(angka(jml("jiwa")), true), td("", true), td("", true), td(tinggi(rentang), true), td("", true),
            kec ? h("td", null, h("div", {class: "dl-aksi"}, rwKec.length ? tombolHistori({nama: kec, tingkatKec: true, riwayat: rwKec}, `${kec}, ${x.nama}, per hari logbook`) : null, tombolMaps(kec, ...kabProv))) : td("", true));
          // desa tanpa satu angka pun (KK, jiwa, tinggi air) tidak dibuka: baris isinya cuma tanda "–" (pemilik 5 Nov 2026)
          const desa = k.desa.filter(H.adaAngka).map(d => h("tr", {class: "dl-desa-baris", hidden: true}, h("td", {class: "dl-wil", teks: d.nama}), td("", true), td("", true), td("", true), td("", true), td("", true), td(angka(d.kk), true), td(angka(d.jiwa), true), td("", true), td("", true), td(tinggi(d.tinggi_cm), true), td("", true), aksi(d.nama, kec)));
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
        kabRows.push({c: ciri(x), rows: [tr, ...kecBaris.flatMap(k => [k.trk, ...k.desa])], prov: i});
      }
      const latest = r.baris.reduce((m, x) => x.terakhir > m ? x.terakhir : m, ""), mulaiP = r.baris.reduce((m, x) => { const a = x.mulai || x.terakhir; return !m || a < m ? a : m; }, "");
      /* sub total per provinsi di bawah kab/kotanya (pemilik 3 Nov 2026) */
      baris.push(h("tr", {class: "dl-subtotal"}, h("td", {class: "dl-wil", teks: "Sub total " + namaProv(r.prov_kode, r.prov)}), td(F(r.kejadian), true), h("td", null, chipSurut(r)), td("", true), selMulai(mulaiP), selSelesai(!r.nBelum, latest),
        td(F(r.kk), true), td(F(r.jiwa), true), td(F(r.kk_u), true), td(F(r.mengungsi), true), td("", true), td(H.tglPendek(latest), true), td("", true)));
      const nama = namaProv(r.prov_kode, r.prov), gab = {nama, provinsi: true, riwayat: r.baris.reduce((a, x) => H.gabungRiwayat(a, x.riwayat || []), [])};
      const aksi = h("div", {class: "dl-aksi"}, tombolHistori(gab, `Jumlah ${F(r.nKab)} kab/kota per hari logbook`),
        r.nBelum ? tombolWA({nama: "Provinsi " + nama}, H.pesanProv(nama, r.baris, H.KATA[J.k]), "permintaan pembaruan") : null);
      const mdProv = r.baris.reduce((a, x) => a + (x.md || 0), 0), hilangProv = r.baris.reduce((a, x) => a + (x.hilang || 0), 0);
      return tbodyProv(nama, `${F(r.nKab)} kab/kota` + (mdProv ? `, ${F(mdProv)} meninggal` : "") + (hilangProv ? `, ${F(hilangProv)} hilang` : ""), [tdv(F(r.kejadian), r.kejadian), tdv(chipSurut(r), r.nBelum), td("", true), selMulai(mulaiP), selSelesai(!r.nBelum, latest),
        tdv(F(r.kk), r.kk), tdv(F(r.jiwa), r.jiwa), tdv(F(r.kk_u), r.kk_u), tdv(F(r.mengungsi), r.mengungsi), td("", true), tdv(H.tglPendek(latest), latest.replace(/-/g, "")), h("td", null, aksi)], 1, baris);
    });
    const jml = k => prov.reduce((s, r) => s + r[k], 0);
    const kaki = h("tfoot", null, h("tr", null, h("td", {teks: "Jumlah"}), td(F(jml("kejadian")), true), h("td", null, h("div", {class: "dl-chips"}, label(`${F(jml("nBelum"))} ${J.tidak_k}`, J.ik, "merah"), label(`${F(jml("nKab") - jml("nBelum"))} ${J.ya_k}`, "ok", "biru"))), td("", true), td("", true), td("", true), td(F(jml("kk")), true), td(F(jml("jiwa")), true), td(F(jml("kk_u")), true), td(F(jml("mengungsi")), true), td("", true), td("", true), td("", true)));
    /* kepala dua tingkat: Terdampak dan Pengungsi masing-masing KK dan Jiwa */
    const th = (teks, att) => h("th", {scope: "col", ...att, teks});
    const kepala = h("thead", null, h("tr", null, ...["Wilayah", "Kejadian", "Status", "Lama, hari", "Mulai", "Selesai"].map((k, i) => th(k, {rowspan: "2", "data-i": String(i)})),
        th("Terdampak", {colspan: "2", class: "dl-th-grup"}), th("Pengungsi", {colspan: "2", class: "dl-th-grup"}), th("Tinggi air", {rowspan: "2", "data-i": "10"}), th("Kabar terakhir", {rowspan: "2", "data-i": "11"}), th("Aksi", {rowspan: "2"})),
      h("tr", {class: "dl-th-sub"}, th("KK", {"data-i": "6"}), th("Jiwa", {"data-i": "7"}), th("KK", {"data-i": "8"}), th("Jiwa", {"data-i": "9"})));
    const t = h("table", {class: "ad-tabel dl-tabel" + (J.tinggi ? "" : " dl-tanpa-tinggi")}, kepala); t.append(...tbodies, kaki); pasangUrut(t);   // longsor: kolom Tinggi air disembunyikan
    const pilih = new Set(), PIL = [["belum", J.tidak, J.ik], ["surut", J.ya, "ok"], ["ungsi", "Ada pengungsi", "personel"], ["korban", "Ada korban jiwa", "peringatan"],
      ["kurang", "Data belum lengkap", "kurang"], ["kabar", "Kabar > 3 hari", "tunggu"]].filter(([v]) => kabRows.some(k => k.c[v]));
    const saringTabel = () => {
      const st = ["belum", "surut"].filter(v => pilih.has(v)), fl = [...pilih].filter(v => !st.includes(v)), ada = new Set();
      for (const k of kabRows) { const ok = wil.cocok(prov[k.prov].prov_kode) && (!st.length || st.some(v => k.c[v])) && fl.every(v => k.c[v]); k.rows.forEach(r => r.classList.toggle("dl-sar-x", !ok)); if (ok) ada.add(k.prov); }
      tbodies.forEach((tb, i) => tb.classList.toggle("dl-sar-x", !!(pilih.size || wil.aktif()) && !ada.has(i)));
    };
    const wil = pilihWilayah(prov.map(r => r.prov_kode), () => saringTabel());   // pulau dan provinsi (pemilik 12 Nov 2026)
    const pilBar = h("div", {class: "dl-bilah-saring"}, ...wil.el, PIL.length > 1 ? h("div", {class: "dl-saring dl-saring-tabel", role: "group", "aria-label": "Saring tabel wilayah"}, PIL.map(([v, t2, ik]) => {
      const n = kabRows.filter(k => k.c[v]).length, btn = h("button", {type: "button", class: "dl-saring-btn dl-saring-" + v, "aria-pressed": "false"}, ikon(ik), t2, h("b", {teks: F(n)}));
      btn.addEventListener("click", () => { pilih.has(v) ? pilih.delete(v) : pilih.add(v); btn.setAttribute("aria-pressed", String(pilih.has(v))); saringTabel(); }); return btn; })) : null);
    const tabel = h("div", null, pilBar, h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t));
    const wadahPeta = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"})), Jk = J;
    requestAnimationFrame(() => {   // MapLibre butuh wadah yang sudah terpasang dan berukuran
      gambarPeta(wadahPeta, pekan, null, sk, hariSt, Jk).then(() => { if (ubin) { ubin.classList.add("dl-peta-ubin"); wadahPeta.append(ubin); KAM.dasar(wadahPeta); } });   // ringkasan di dalam peta (pemilik 11 Nov 2026)
    });
    const nBelum = jml("nBelum"), nKab = jml("nKab"), mdTot = pekan.reduce((a, x) => a + (x.md || 0), 0);
    const kal = nBelum ? [hl(`${F(nBelum)} dari ${F(nKab)} kab/kota`), ` ${J.kata} sepekan ${J.tidak_k}`, ...jml("jiwa") ? [", ", hl(`${F(jml("jiwa"))} jiwa`), " terdampak"] : [], ...mdTot ? [", ", hl(`${F(mdTot)} meninggal`)] : []] : [hl(`${F(nKab)} kab/kota`), ` ${J.kata} sepekan, semuanya ${J.ya_k}`];
    /* peta dan tabel dua kartu terpisah (pemilik 12 Nov 2026): Peta Pantauan, lalu Kondisi terkini; Buka semua kembali ke kepala kartu tabel */
    return [bagian("peta", "pin", "Peta Pantauan", kal, wadahPeta), bagian("kondisi", J.ik, "Kondisi terkini", kal, tabel)];
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
        h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x), tombolWA(x, H.pesanWA({...x, kurang: x.kurang || []}, H.KATA[J.k]), "permintaan pembaruan upaya")))))));   // ikon WA seperti tabel Wilayah (pemilik 12 Nov 2026)
    return bagian("upaya", "personel", "Upaya penanganan", [hl(`${F(belum.length)} kab/kota`), ` ${J.pra === false ? J.tidak_k : "masih ditangani"}, `, hl(`${F(lapor)} kab/kota`), " melaporkan upaya pada hari logbook terakhir"],
      tabelStd(["No", "Kab/kota", "Upaya terakhir", "Pihak terlibat", "Kebutuhan", "Kendala", "Laporan upaya", "Aksi"], ...tb));
  }

  /* ---------- perlu ditanya ---------- */
  /* ---------- Cek Kabar Luar (data/kajian-bnpb/cek-kabar/): label per kab/kota dari berita dan data alam; tidak pernah menutup kejadian ---------- */
  const LUAR = {masih: ["Masih berlangsung", null, "merah"], mungkin_selesai: ["Kemungkinan selesai", "ok", "biru"], belum_ada: ["Belum ada kabar luar", "peringatan", "kuning"]};
  const TIP_LUAR = {masih: "ada berita sesudah laporan resmi terakhir yang menyebut korban, pengungsi, atau penanganan",
    mungkin_selesai: "ada berita yang tegas menyebut selesai, atau lama tanpa kabar dan kondisi alamnya normal", belum_ada: "tidak ada berita yang cocok atau sinyal alam belum cukup"};
  const labelLuar = x => {
    const [t, ik, nada] = LUAR[x.luar.label] || LUAR.belum_ada, e = label(t, ik || J.ik, nada);
    e.setAttribute("data-tip", `<b>Deteksi Centurisk97, bukan laporan resmi</b><br>${TIP_LUAR[x.luar.label] || ""}`);
    return e;
  };
  const amanUrl = u => /^https?:\/\//i.test(u || "") ? u : null;
  function buktiLuar(x) {
    const L = x.luar, b = L.bukti || [];
    if (b.length) {
      const li = a => h("li", null, amanUrl(a.url) ? h("a", {href: a.url, target: "_blank", rel: "noopener noreferrer", teks: a.judul}) : h("span", {teks: a.judul}),
        h("span", {class: "dl-redup", teks: ` ${a.media || "media tidak tercatat"}, ${H.tglPendek(a.tgl)}`}), " ", label(a.arah === "pulih" ? "pulih" : "masih", a.arah === "pulih" ? "ok" : J.ik, a.arah === "pulih" ? "biru" : "merah"));
      return h("details", {class: "dl-bukti"}, h("summary", {teks: `${F(b.length)} berita, terbaru ${H.tglPendek(b[0].tgl)}`}), h("ul", null, b.map(li)));
    }
    if (L.dasar === "alam") return h("span", {teks: L.senyap == null ? "Kondisi alam normal" : `${F(L.senyap)} hari tanpa kabar, kondisi alam normal`});
    return h("span", {class: "dl-redup", teks: L.catatan === "sumber tidak terjangkau" ? "Sumber berita tidak terjangkau saat dicek" : L.alam === "aktif" ? "Belum ada berita, kondisi alam masih aktif" : "Belum ada berita yang cocok"});
  }
  /* ---------- lintas bencana (pemilik 12 Nov 2026): Kabar luar dan Kelengkapan data memuat SEMUA jenis berformat logbook (karhutla dan gunung api
     punya layar sendiri), disaring Bencana, Provinsi, Kab/kota; saringan daerah = semua bencana di wilayah itu. Data yang kurang diekspor ke WA
     (satu pesan) dan Excel (.xlsx, penulis di dalops_hitung.js). Saringan bersama semua panel dan hanya mengganti hidden (INP). ---------- */
  const LINTAS = Object.keys(JN);
  const dataJenis = {};   // jenis -> janji isi /api/dalops/<jenis> (null bila belum diunggah atau gagal)
  const ambilJenis = j => dataJenis[j] ||= fetch("/api/dalops/" + j, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null);
  let statusJson = null;   // /banjir/data/status.json membawa level banjir (b) dan longsor (l): diambil sekali
  const muatStatus = () => statusJson || (statusJson = fetch("/banjir/data/status.json").then(x => x.ok ? x.json() : null).catch(() => null));
  const SL = {jn: "", prov: "", kab: ""};
  const pakaiJ = (j, fn) => { const lama = J; J = JN[j]; try { return fn(); } finally { J = lama; } };
  const namaJenis = j => JN[j].kata[0].toUpperCase() + JN[j].kata.slice(1);
  const cocokSL = x => (!SL.jn || x.jn === SL.jn) && (!SL.prov || x.prov_kode === SL.prov) && (!SL.kab || x.kab_kode === SL.kab);
  const tandai = (tr, x) => { tr.dataset.jn = x.jn; tr.dataset.prov = x.prov_kode || ""; tr.dataset.kab = x.kab_kode || ""; return tr; };
  /* data belum ada per baris: sama untuk tabel, WA, dan Excel */
  const kurangBaris = x => [...x.kurang.filter(k => k !== "kabar"), ...["kk_u", "mengungsi"].filter(f => x[f] == null),
    ...(x.kec.length || x.desa.some(d => d.kec) ? [] : ["kec"]), ...(x.desa.length ? [] : ["desa"]), ...(upayaKini(x, x.hari) ? [] : ["upaya"])].sort((a, b) => URUT_KURANG.indexOf(a) - URUT_KURANG.indexOf(b));
  let LD = null;   // janji {luar, tanya}: dimuat sekali per halaman
  async function barisLintas() {
    const st = await muatStatus(), out = {luar: [], tanya: []};
    for (const [j, d] of await Promise.all(LINTAS.map(async j => [j, await ambilJenis(j)]))) {
      if (!Array.isArray(d?.kejadian)) continue;
      const kel = H.kelompok(d.kejadian, d.hari), sk = st && JN[j].pra !== false ? H.statusKab(st, JN[j].lv) : null;
      for (const x of kel) if (!x.surut && x.luar) out.luar.push({...x, jn: j, hari: d.hari});
      for (const x of H.perluDitanya(kel, d.hari, H.KATA[JN[j].k])) out.tanya.push({...x, jn: j, hari: d.hari, sk});
    }
    return out;
  }

  function isiLuar(xs) {
    const rank = x => H.WASPADA_LUAR[x.luar.label] ?? 1;
    xs = xs.slice().sort((a, b) => rank(a) - rank(b) || (b.luar.senyap ?? 0) - (a.luar.senyap ?? 0) || a.nama.localeCompare(b.nama));
    let no = 0;
    const tb = h("tbody", null, xs.map(x => pakaiJ(x.jn, () => tandai(h("tr", {"data-luar": x.luar.label}, td(F(++no), true), h("td", null, label(namaJenis(x.jn), JN[x.jn].ik)),
      h("td", null, kab(x, true)), tdv(labelLuar(x), rank(x)), h("td", null, buktiLuar(x)),
      tdv(x.luar.senyap == null ? "–" : F(x.luar.senyap) + " hari", x.luar.senyap),   // tak diketahui = –, bukan 0
      tdv(H.tglPendek(x.terakhir), x.terakhir.replace(/-/g, "")),
      h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x), tombolWA(x, H.pesanWA({...x, kurang: []}, H.KATA[J.k]), x.luar.label === "mungkin_selesai" ? "permintaan konfirmasi selesai" : "permintaan pembaruan")))), x))));
    /* pil label: klik = hanya label itu, klik lagi = semua; jumlahnya ikut saringan daerah dan bencana */
    const tombol = Object.entries(LUAR).map(([k, [t, ik, nada]]) => h("button", {type: "button", class: "dl-luar-pil dl-tag-" + nada, "data-luar": k, "aria-pressed": "false"}, ikon(ik || "banjir"), h("span", {class: "dl-n"}), ` ${t.toLowerCase()}`));
    const saring = h("div", {class: "dl-luar-saring", role: "group", "aria-label": "Saring menurut kabar luar"}, ...tombol);
    const tabel = tabelStd(["No", "Bencana", "Kab/kota", "Kabar luar", "Bukti", "Tanpa kabar", "Laporan resmi terakhir", "Aksi"], tb);
    saring.addEventListener("click", e => {
      const b = e.target.closest("[data-luar]"); if (!b) return;
      const t = tabel.querySelector("table"); t.dataset.pil = b.getAttribute("aria-pressed") === "true" ? "" : b.dataset.luar;
      tombol.forEach(x => x.setAttribute("aria-pressed", String(x.dataset.luar === t.dataset.pil)));
      segarkan();
    });
    tabel.querySelector("table").dataset.lintas = "luar";
    return [saring, tabel];
  }

  function isiTanya(daftar) {
    const pra = daftar.some(x => x.sk), adaLuar = daftar.some(x => x.luar), lebar = 7 + (pra ? 1 : 0) + (adaLuar ? 1 : 0);
    let n = 0;
    const tb = kelompokProv(daftar, (a, b) => Math.max(...b[1].map(x => x.umur)) - Math.max(...a[1].map(x => x.umur)) || b[1].length - a[1].length).map(([p, xs]) =>
      tbodyProv(namaProv(p, xs[0].prov), `${F(new Set(xs.map(x => x.kab_kode)).size)} kab/kota`, null, lebar, xs.sort((a, b) => b.umur - a.umur).map(x => pakaiJ(x.jn, () => {
        const b = x.sk ? (x.sk[x.kab_kode]?.b?.[1] ?? 0) : null, kurang = kurangBaris(x);   // status.json hanya memuat kecamatan berlevel > 0: kab tak tercantum = Aman
        return tandai(h("tr", null, td(F(++n), true), h("td", null, label(namaJenis(x.jn), JN[x.jn].ik)), h("td", null, kab(x)),
          adaLuar ? tdv(x.luar ? labelLuar(x) : "–", x.luar ? H.WASPADA_LUAR[x.luar.label] : 9) : null,
          tdv(h("b", {class: "dl-umur " + nadaUmur(x.umur), teks: x.umur < 1 ? "Hari ini" : F(x.umur) + " hari"}), x.umur), tdv(H.tglPendek(x.terakhir), x.terakhir.replace(/-/g, "")),
          tdv(kurang.length ? h("div", {class: "dl-chips"}, kurang.map(k => label(KURANG[k][0], KURANG[k][1], "kuning"))) : label("Angka lengkap", "ok", "hijau"), kurang.length),
          pra ? tdv(b == null ? "–" : status(b), b) : null,
          h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x), tombolWA(x, H.pesanWA(upayaKini(x, x.hari) ? x : {...x, kurang: [...x.kurang, "upaya"]}, H.KATA[J.k]), x.luar?.label === "mungkin_selesai" ? "permintaan konfirmasi selesai" : "permintaan pembaruan")))), x);
      }))));
    const tabel = tabelStd(["No", "Bencana", "Kab/kota", ...adaLuar ? ["Kabar luar"] : [], "Tanpa kabar", "Kabar terakhir", "Data belum ada", ...pra ? ["Prakiraan besok"] : [], "Aksi"], ...tb);
    tabel.querySelector("table").dataset.lintas = "tanya";
    return [tabel];
  }

  /* saringan Bencana, Provinsi, Kab/kota + ekspor; satu per seksi, nilainya bersama */
  function batangSaring(semua, ekspor) {
    const op = (v, t) => h("option", {value: v, teks: t});
    const jn = LINTAS.filter(j => semua.some(x => x.jn === j));
    const prov = [...new Set(semua.map(x => x.prov_kode))].map(k => [k, namaProv(k, semua.find(x => x.prov_kode === k)?.prov)]).sort((a, b) => a[1].localeCompare(b[1]));
    const pilih = (kunci, aria, ...opsi) => h("label", {class: "dl-sl-p"}, h("span", {teks: aria}), h("select", {"data-sl": kunci, "aria-label": "Saring " + aria.toLowerCase()}, ...opsi));
    const w = h("div", {class: "dl-sl", role: "group", "aria-label": "Saring daerah dan bencana"},
      pilih("jn", "Bencana", op("", "Semua bencana"), ...jn.map(j => op(j, namaJenis(j)))),
      pilih("prov", "Provinsi", op("", "Semua provinsi"), ...prov.map(([k, t]) => op(k, t))),
      pilih("kab", "Kab/kota", op("", "Semua kab/kota")),
      ekspor ? h("div", {class: "dl-sl-ek"},
        h("button", {type: "button", class: "dl-sl-b", "data-ekspor": "wa"}, ikonWA(), h("span", {teks: "Kirim WA"})),
        h("button", {type: "button", class: "dl-sl-b", "data-ekspor": "xlsx"}, ikon("unduh"), h("span", {teks: "Unduh Excel"}))) : null);
    w.addEventListener("change", e => { const k = e.target.dataset?.sl; if (!k) return; SL[k] = e.target.value; if (k === "prov") SL.kab = ""; segarkan(); });
    w.addEventListener("click", e => { const b = e.target.closest("[data-ekspor]"); if (b) { b.setAttribute("aria-busy", "true"); nanti(() => (b.dataset.ekspor === "wa" ? kirimWA() : unduhExcel()).finally(() => b.removeAttribute("aria-busy"))); } });
    w._semua = semua; w._prov = null;   // null: opsi kab/kota diisi pada terapkan() pertama
    return w;
  }

  /* terapkan saringan ke semua tabel lintas dan samakan semua batang saring. Dipanggil lewat segarkan(): kontrol tercat dulu (INP),
     klik beruntun dan pemuatan banyak panel dilebur jadi satu kerja (token ver) */
  let ver = 0;
  const segarkan = () => { const v = ++ver; nanti(() => v === ver && terapkan()); };
  function terapkan() {
    for (const t of document.querySelectorAll("table[data-lintas]")) {
      const pil = t.dataset.pil || "", hit = {}, grup = new Map(); let tampil = 0;
      for (const tr of t.querySelectorAll("tr[data-jn]")) {
        const ok = (!SL.jn || tr.dataset.jn === SL.jn) && (!SL.prov || tr.dataset.prov === SL.prov) && (!SL.kab || tr.dataset.kab === SL.kab);
        if (ok && tr.dataset.luar) hit[tr.dataset.luar] = (hit[tr.dataset.luar] || 0) + 1;
        const hid = !ok || (!!pil && tr.dataset.luar !== pil);
        if (tr.hidden !== hid) tr.hidden = hid;
        if (hid) continue;
        tampil++;
        const tb = tr.parentElement; (grup.get(tb) || grup.set(tb, new Set()).get(tb)).add(tr.dataset.kab);
      }
      for (const tb of t.tBodies) {
        if (!tb.classList.contains("dl-grup")) continue;
        const kabs = grup.get(tb);
        tb.hidden = !kabs;
        const j = tb.querySelector(".dl-jml"); if (j && kabs) j.textContent = `${F(kabs.size)} kab/kota`;
        if (SL.prov && kabs) { tb.classList.remove("dl-tutup"); tb.querySelector(".dl-buka")?.setAttribute("aria-expanded", "true"); }   // satu provinsi dipilih: langsung terbuka
      }
      const s = t.closest("section");
      s?.querySelectorAll(".dl-luar-pil").forEach(b => { b.querySelector(".dl-n").textContent = F(hit[b.dataset.luar] || 0); });
      const kos = s?.querySelector(".dl-sl-kosong");
      if (!tampil && !kos) t.closest(".dl-tabel-wadah").before(h("p", {class: "dl-redup dl-sl-kosong", teks: "Tidak ada kejadian yang cocok dengan saringan ini."}));
      if (tampil) kos?.remove();
    }
    for (const w of document.querySelectorAll(".dl-sl")) {
      if (w._prov !== SL.prov) {   // daftar kab/kota hanya bergantung pada provinsi
        w._prov = SL.prov;
        const kabs = new Map(w._semua.filter(x => !SL.prov || x.prov_kode === SL.prov).map(x => [x.kab_kode, x.nama]));
        w.querySelector('[data-sl="kab"]').replaceChildren(h("option", {value: "", teks: "Semua kab/kota"}), ...[...kabs].sort((a, b) => a[1].localeCompare(b[1])).map(([v, t]) => h("option", {value: v, teks: t})));
      }
      for (const s of w.querySelectorAll("[data-sl]")) if (s.value !== SL[s.dataset.sl]) s.value = SL[s.dataset.sl];
    }
  }

  /* ekspor: baris Kelengkapan data yang cocok saringan (Kabar luar ikut di lembar kedua Excel) */
  const tujuanSL = xs => SL.kab ? xs.find(x => x.kab_kode === SL.kab)?.nama : SL.prov ? "Provinsi " + namaProv(SL.prov, xs.find(x => x.prov_kode === SL.prov)?.prov) + " dan kab/kota" : null;
  const urutEkspor = xs => xs.slice().sort((a, b) => namaProv(a.prov_kode, a.prov).localeCompare(namaProv(b.prov_kode, b.prov)) || b.umur - a.umur || a.nama.localeCompare(b.nama));
  async function kirimWA() {
    const d = await LD, xs = urutEkspor(d.tanya.filter(cocokSL));
    if (!xs.length) return alert("Tidak ada data yang kurang untuk saringan ini.");
    const teks = H.pesanKurang(xs.map(x => ({nama: x.nama, prov: namaProv(x.prov_kode, x.prov), jenis: JN[x.jn].kata, mulai: x.mulai || x.terakhir, terakhir: x.terakhir,
      minta: ["kondisi terkini", ...kurangBaris(x).map(k => KURANG[k][0])]})), tujuanSL(xs));
    window.open("https://wa.me/?text=" + encodeURIComponent(teks), "_blank", "noopener");
  }
  async function unduhExcel() {
    const d = await LD, T = urutEkspor(d.tanya.filter(cocokSL)), L = urutEkspor(d.luar.filter(cocokSL));
    const lembar = [
      {nama: "Kelengkapan data", kepala: ["No", "Bencana", "Provinsi", "Kab/kota", "Sejak", "Kabar terakhir", "Tanpa kabar (hari)", "Kabar luar", "Data belum ada"],
        baris: T.map((x, i) => [i + 1, namaJenis(x.jn), namaProv(x.prov_kode, x.prov), x.nama, H.tglPanjang(x.mulai || x.terakhir), H.tglPanjang(x.terakhir), x.umur, x.luar ? LUAR[x.luar.label]?.[0] ?? "" : "", kurangBaris(x).map(k => KURANG[k][0]).join(", ")])},
      {nama: "Kabar luar", kepala: ["No", "Bencana", "Provinsi", "Kab/kota", "Kabar luar", "Jumlah berita", "Berita terbaru", "Tautan", "Tanpa kabar (hari)", "Laporan resmi terakhir"],
        baris: L.map((x, i) => { const b = x.luar.bukti?.[0]; return [i + 1, namaJenis(x.jn), namaProv(x.prov_kode, x.prov), x.nama, LUAR[x.luar.label]?.[0] ?? "", x.luar.bukti?.length || 0, b?.judul ?? "", amanUrl(b?.url) ?? "", x.luar.senyap, H.tglPanjang(x.terakhir)]; })}];
    const nama = ["kelengkapan-dalops", d.tanya[0]?.hari || "", SL.jn, SL.kab ? T[0]?.nama : SL.prov ? namaProv(SL.prov) : ""].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const a = h("a", {href: URL.createObjectURL(new Blob([H.xlsx(lembar)], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})), download: nama + ".xlsx"});
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /* dua seksi lintas di tiap panel jenis: kerangka langsung (panel kiri mengenali namanya), isi menyusul sesudah semua jenis termuat */
  function bagianLintas() {
    const wL = h("div", {class: "dl-isi"}, kosong("tunggu", "Memuat kabar luar semua bencana…")), wT = h("div", {class: "dl-isi"}, kosong("tunggu", "Memuat kelengkapan data semua bencana…"));
    const sL = bagian("luar", "daftar", "Kabar luar", "Kabar luar semua bencana yang belum dilaporkan selesai", wL);
    const sT = bagian("tanya", "tunggu", "Kelengkapan data", "Kejadian semua bencana yang perlu dikonfirmasi data dan informasinya", wT);
    (LD ||= barisLintas()).then(d => {
      const semua = [...d.luar, ...d.tanya];
      if (!d.luar.length) sL.remove();
      if (!d.tanya.length) sT.remove();   // tanpa kalimat kesimpulan (AGENTS 3.5): seksi kosong tidak dirender   // L5: berkas tanpa kolom 'luar' (atau semua sudah selesai): seksi Kabar luar tidak dirender
      if (d.luar.length) wL.replaceChildren(batangSaring(semua, false), ...isiLuar(d.luar));
      if (d.tanya.length) wT.replaceChildren(batangSaring(semua, true), ...isiTanya(d.tanya));
      if (sT.querySelector(".dl-grup") && !sT.querySelector(".dl-semua")) sT.querySelector(".ex-jd").append(bukaSemua(sT));
      segarkan(); pasangTip();
    });
    return [sL, sT];
  }

  /* ---------- prakiraan banjir per hari + hujan tiga hari per tanggal ---------- */
  function bagianPrakiraan(sk, sudah, hariStatus, wadah, min, pekan = []) {
    const daftar = H.siaga(sk, sudah, min), hari = hariStatus || [], perHari = daftar.some(x => x.h3d?.length);
    const dua = daftar.filter(x => x.sudah && x.maks >= 2).length;
    /* histori banjir sepekan kab itu (kalau sudah banjir); kab yang muncul di dua kelompok surut digabung */
    const histori = x => { const ks = pekan.filter(k => k.kab_kode === x.kab_kode); return ks.length ? tombolHistori({...ks[0], riwayat: ks.reduce((a, k) => H.gabungRiwayat(a, k.riwayat || []), [])}) : null; };
    let n = 0;
    /* status dan hujan per tanggal di kolom terpisah (pemilik 12 Nov 2026 "curahnya dipisahin di kolom yang berbeda") */
    const mmSel = v => tdv(v == null || (!v && v !== 0) ? "–" : F(Math.round(v)), v ?? -1);
    const sel = (x, j) => perHari ? [tdv(status(x.b[j] ?? 0), (x.b[j] ?? 0) * 1e4 + (x.h3d[j] || 0)), mmSel(x.h3d[j])] : [tdv(status(x.b[j] ?? 0), x.b[j] ?? 0)];
    const grp = kelompokProv(daftar, (a, b) => Math.max(...b[1].map(x => x.maks)) - Math.max(...a[1].map(x => x.maks)) || b[1].length - a[1].length);
    const tb = grp.map(([p, xs]) =>
      tbodyProv(namaProv(p), `${F(xs.length)} kab/kota`, ringkasProv(xs), 2, xs.map(x => h("tr", {class: x.sudah && x.maks >= 2 ? "dl-sorot" : null, "data-lv": String(x.maks), "data-sudah": x.sudah ? "1" : "0"}, td(F(++n), true), h("td", null, kab(x)),
        tdv(x.sudah ? label("Sudah " + J.kata, J.ik, "merah") : label("Normal", "ok", "hijau"), x.sudah ? 1 : 0),
        ...hari.flatMap((_, j) => sel(x, j)), perHari ? null : tdv(x.h3 == null ? "–" : F(Math.round(x.h3)), x.h3),
        h("td", null, h("div", {class: "dl-aksi"}, histori(x), J.tinggi ? tombolPetaBanjir(x) : null, tombolWA(x, H.pesanSiaga(x, hari, H.KATA[J.k]), "peringatan dini")))))));
    /* baris provinsi: banjir sepekan, status tertinggi dan hujan tiga hari tertinggi tiap tanggal (seperti tabel Wilayah Siaga peta banjir) */
    function ringkasProv(xs) {
      const nBanjir = xs.filter(x => x.sudah).length;
      return [tdv(nBanjir ? label(F(nBanjir) + " sudah " + J.kata, J.ik, "merah") : label("Normal", "ok", "hijau"), nBanjir),
        ...hari.flatMap((_, j) => { const lv = Math.max(0, ...xs.map(x => x.b[j] ?? 0)), mm = Math.max(0, ...xs.map(x => x.h3d?.[j] ?? 0));
          return perHari ? [tdv(status(lv), lv * 1e4 + mm), mmSel(mm || null)] : [tdv(status(lv), lv)]; }),
        perHari ? null : tdv(F(Math.round(Math.max(0, ...xs.map(x => x.h3 || 0)))), Math.max(0, ...xs.map(x => x.h3 || 0))), td("", true)].filter(Boolean);
    }
    /* kepala dua tingkat: tanggal di atas, Status dan Hujan, mm di bawahnya */
    function tabelHari(...isi) {
      const th = (teks, att) => h("th", {scope: "col", ...att, teks});
      const t = h("table", {class: "ad-tabel dl-tabel dl-tabel-hari"}, h("thead", null,
        h("tr", null, th("No", {rowspan: "2", "data-i": "0"}), th("Wilayah", {rowspan: "2", "data-i": "1"}), th(J.kata[0].toUpperCase() + J.kata.slice(1) + " sepekan", {rowspan: "2", "data-i": "2"}),
          ...hari.map(t2 => th(H.tglPendek(t2), {colspan: "2", class: "dl-th-grup"})), th("Aksi", {rowspan: "2"})),
        h("tr", {class: "dl-th-sub"}, ...hari.flatMap((_, j) => [th("Status", {"data-i": String(3 + 2 * j)}), th("Hujan, mm", {"data-i": String(4 + 2 * j), title: "hujan tiga hari, mm"})]))));
      t.append(...isi); pasangUrut(t); return h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t);
    }
    /* bilah saring (pemilik 12 Nov 2026): pulau, lalu provinsi di pulau itu, sudah banjir atau normal, tingkat Waspada/Siaga/Awas.
       Dalam satu kelompok = atau, antarkelompok = dan, kosong = semua. Baris tersaring diberi kelas, bukan hidden, supaya tidak bentrok dengan buka-tutup provinsi */
    const sar = {st: new Set(), lv: new Set()};
    const saringTb = () => tb.forEach((t, i) => { const okP = wil.cocok(grp[i][0]); let ada = 0;
      t.querySelectorAll("tr[data-lv]").forEach(r => { const ok = okP && (!sar.lv.size || sar.lv.has(+r.dataset.lv)) && (!sar.st.size || sar.st.has(r.dataset.sudah)); r.classList.toggle("dl-sar-x", !ok); ada += ok; });
      t.classList.toggle("dl-sar-x", !ada); });
    const wil = pilihWilayah(grp.map(([p]) => p), () => saringTb());
    const tombolPil = (set, v, cls, ik, t, n) => { const b = h("button", {type: "button", class: "dl-saring-btn " + cls, "aria-pressed": "false"}, ikon(ik), t, h("b", {class: "dl-saring-n", teks: F(n)}));
      b.addEventListener("click", () => { set.has(v) ? set.delete(v) : set.add(v); b.setAttribute("aria-pressed", String(set.has(v))); saringTb(); }); return b; };
    const nLv = l => daftar.filter(x => x.maks === l).length, nSudah = daftar.filter(x => x.sudah).length;
    const pilSaring = daftar.length ? h("div", {class: "dl-bilah-saring", role: "group", "aria-label": "Saring peringatan dini"},
      ...wil.el,
      h("div", {class: "dl-saring", role: "group", "aria-label": "Saring kejadian"}, tombolPil(sar.st, "1", "dl-saring-belum", J.ik, "Sudah " + J.kata, nSudah), tombolPil(sar.st, "0", "dl-saring-surut", "ok", "Normal", daftar.length - nSudah)),
      h("div", {class: "dl-saring", role: "group", "aria-label": "Saring tingkat peringatan"}, [1, 2, 3].filter(nLv).map(l => tombolPil(sar.lv, l, "dl-saring-" + ["", "waspada", "siaga", "awas"][l], "peringatan", H.NAMA_LEVEL[l], nLv(l))))) : null;
    wadah.replaceChildren(pilSaring,
      daftar.length ? (perHari ? tabelHari(...tb) : tabelStd(["No", "Wilayah", J.kata[0].toUpperCase() + J.kata.slice(1) + " sepekan", ...hari.map(H.tglPendek), "Hujan tiga hari, mm", "Aksi"], ...tb)) : null);
    wadah.closest?.("section")?.querySelectorAll(".dl-semua span").forEach(s => { s.textContent = "Buka semua"; });
  }

  const siagaJudul = xs => { const dua = xs.filter(x => x.sudah).length;
    return xs.length ? [hl(`${F(xs.length)} kab/kota`), " berstatus Siaga atau Awas dalam tiga hari ke depan", ...dua ? [", ", hl(`${F(dua)}`), ` di antaranya sudah ${J.kata}`] : []] : "Tidak ada kab/kota berstatus Siaga atau Awas tiga hari ke depan"; };
  function bagianArti() {
    /* pemilik 12 Nov 2026 "bagusin": ambang hujan jadi angka besar, syarat wilayah dan sungai jadi keterangan kecil di bawahnya */
    return h("div", {class: "dl-arti"}, h("b", {class: "dl-arti-judul"}, ikon("peringatan"), "Arti prakiraan"),
      [[1, "40", "Hujan tiga hari, atau sungai mulai naik"], [2, "80", "Hujan tiga hari di wilayah rawan banjir, atau debit sungai tinggi"], [3, "120", "Hujan tiga hari di wilayah sangat rawan, atau sungai meluap"]]
        .map(([l, mm, t]) => h("div", {class: "dl-arti-l" + l}, status(l), h("p", {class: "dl-arti-mm"}, h("b", {teks: "≥ " + mm}), " mm"), h("span", {class: "bn-label", teks: t}))));
  }


  /* ---------- mitigasi (hanya tab Banjir): usulan langkah per kab/kota dari status.json, posko.json, dan logbook; hitungan di H.mitigasi ---------- */
  /* satu langkah: label jenis tindakan (ikon) + tempatnya; teks langkah dari H.mitigasi() tidak diubah */
  const JENIS_LANGKAH = [[/^Posko /i, "Posko", "tenda"], [/^Siapkan evakuasi /i, "Evakuasi", "personel"], [/^Pantau lereng /i, "Pantau lereng", "longsor"],
    [/^Penuhi kebutuhan: /i, "Kebutuhan", "logistik"], [/^Atasi kendala: /i, "Kendala", "peringatan"], [/^Konfirmasi status surut ke BPBD, /i, "Konfirmasi", "kalender"],
    [/^Pantauan khusus: /i, "Pantau", "tunggu"]];
  const butirLangkah = teks => {
    const j = JENIS_LANGKAH.find(([re]) => re.test(teks)), isi = j ? teks.replace(j[0], "") : teks;
    return h("div", {class: "dl-ln"}, h("span", {class: "dl-ln-j"}, ikon(j?.[2] || "lanjut"), j?.[1] || "Langkah"), h("span", {class: "dl-ln-t", teks: j ? isi[0].toUpperCase() + isi.slice(1) : isi}));
  };
  const PITA = {terdampak: ["banjir", "dl-mt-terdampak"], awas: ["peringatan", "dl-mt-awas"], siaga: ["peringatan", "dl-mt-siaga"], pantau: ["tunggu", "dl-mt-pantau"]};
  function bagianMitigasi(st, posko, pekan, hari) {
    if (!st || J.k !== "banjir") return null;
    const m = H.mitigasi(st, posko, pekan, hari), n = m.n;
    if (!n.total) return null;
    const A = n.terdampak ? [hl(F(n.terdampak)), " terdampak ditangani sekarang"] : [];
    const B = n.awas && n.siaga ? [hl(F(n.awas)), " Awas dan ", hl(F(n.siaga)), " Siaga disiapkan"] : n.awas || n.siaga ? [hl(F(n.awas || n.siaga)), n.awas ? " Awas disiapkan" : " Siaga disiapkan"] : [];
    const judul = ["Mitigasi ", hl(`${F(n.total)} kab/kota`), ": ", ...A, ...A.length && B.length ? [", "] : [], ...B, ...!A.length && !B.length ? ["pantauan khusus"] : []];
    const t = h("table", {class: "ad-tabel dl-tabel dl-mt"}, h("thead", null, h("tr", null, ["Kab/kota", "Tenggat", "Langkah BPBD bersama BNPB"].map(k => h("th", {scope: "col", teks: k})))));
    /* rapi (pemilik 12 Nov 2026): satu langkah satu baris berlabel, tenggat jadi tanda, kelompok Siaga dan Pantauan tertutup sampai diklik */
    for (const g of m.grup) {
      const [ik, kls] = PITA[g.kunci], buka = g.kunci === "terdampak" || g.kunci === "awas";
      const tombol = h("button", {type: "button", class: "dl-buka", "aria-expanded": String(buka)}, ikon("lanjut"), h("span", {class: "dl-mt-judul"}, ikon(ik), h("b", {teks: g.judul})),
        h("span", {class: "dl-tag dl-tag-biru dl-jml", teks: `${F(g.baris.length)} kab/kota`}));
      const tb = h("tbody", {class: "dl-mt-grup dl-grup " + kls + (buka ? "" : " dl-tutup")}, h("tr", {class: "dl-mt-pita dl-prov"}, h("td", {colspan: "3"}, tombol)),
        g.baris.map(x => h("tr", null, h("td", {class: "dl-mt-kab"}, h("b", {teks: x.nama}), h("span", {class: "bn-label", teks: namaProv(x.prov_kode)})),
          h("td", {class: "dl-mt-tg"}, x.tenggat ? h("span", {class: "dl-tag " + (x.tenggat === "Sekarang" ? "dl-tag-merah" : "dl-tag-kuning"), teks: x.tenggat}) : "–"),
          h("td", {class: "dl-mt-ln"}, ...String(x.langkah).split("; ").map(butirLangkah)))));
      tb.firstChild.addEventListener("click", () => { const jadi = tb.classList.toggle("dl-tutup") === false; tombol.setAttribute("aria-expanded", String(jadi)); });
      t.append(tb);
    }
    return bagian("mitigasi", "peringatan", "Usulan langkah", judul, h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t));
  }

  /* ubin Angka utama (sistem desain dashboard, rujukan /operasi): angka kunci jenis ini di atas, tanpa kalimat */
  function angkaUtama(pekan, prov, sk, sudah) {
    const jml = f => pekan.some(x => x[f] != null) ? pekan.reduce((a, x) => a + (x[f] || 0), 0) : null, belum = pekan.filter(x => !x.surut).length;
    const siaga = Object.entries(sk).filter(([k, x]) => !sudah.has(k) && Math.max(0, ...x.b.map(l => l ?? 0)) >= 2).length;
    const ubin = (ik, nama, nilai, sub, kelas = "") => h("div", {class: "db-ubin " + kelas, title: sub ? `${nama}: ${nilai} ${sub}` : nama}, h("header", null, h("i", null, ikon(ik)), h("span", {teks: nama})), h("b", {teks: nilai}), sub ? h("small", {teks: sub}) : null);
    return h("div", {class: "db-ubin-grid" + (J.pra === false ? " k5" : "")},
      ubin(J.ik || "banjir", "Kab/kota terdampak", F(pekan.length), kataPeriode()),
      ubin("peringatan", J.tidak || "Belum selesai", F(belum), pekan.length ? `dari ${F(pekan.length)} kab/kota` : "–", belum ? "merah" : ""),
      ubin("sosial", "KK terdampak", jml("kk") == null ? "–" : F(jml("kk")), "laporan Pusdalops"),
      ubin("personel", "Jiwa terdampak", jml("jiwa") == null ? "–" : F(jml("jiwa")), "laporan Pusdalops"),
      ubin("tenda", "KK mengungsi", jml("kk_u") == null ? "–" : F(jml("kk_u")), "KK"),
      ubin("tenda", "Jiwa mengungsi", jml("mengungsi") == null ? "–" : F(jml("mengungsi")), "jiwa"),
      J.pra === false ? null : ubin("peringatan", "Prakiraan Siaga/Awas", F(siaga), "kab/kota belum terdampak", siaga ? "oranye" : ""));   // jenis tanpa prakiraan: ubin ini dibuang
  }
  /* pemilih periode di atas (pemilik 11 Nov 2026, rujukan /operasi): jendela hari logbook untuk kejadian, ubin, peta, dan tabel */
  const PERIODE = [[1, "Hari ini", "kalender"], [3, "3 hari", "kalender"], [7, "Sepekan", "kalender"], [30, "30 hari", "kalender"]];
  let periode = 7;
  const kataPeriode = () => ({1: "hari ini", 3: "3 hari terakhir", 7: "sepekan terakhir", 30: "30 hari terakhir"})[periode];
  const dataTerakhir = {};
  function render(d, st, posko, jenis = "banjir") {
    dataTerakhir[jenis] = [d, st, posko];
    J = JN[jenis];
    window.MenuPusdalops?.kaki?.([["#2e8b57", "Logbook Pusdalops", H.tglPendek(d.hari)], ["#2f6fd6", "Dimuat", new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"}).replace(".", ":") + " WIB"]]);
    const hari = d.hari, kel = H.kelompok(d.kejadian, hari), pekan = kel.filter(x => H.selisih(hari, x.terakhir) < periode), prov = H.perProv(pekan);
    const sk = st ? H.statusKab(st, J.lv) : {}, sudah = new Set(pekan.map(x => x.kab_kode)), hariSt = st?.hari || [];

    const wadahPra = h("div", {class: "dl-isi"});
    const adaPra = J.pra !== false;
    if (st && adaPra) bagianPrakiraan(sk, sudah, hariSt, wadahPra, 1, pekan);   // Waspada ikut, bisa disaring (pemilik 12 Nov 2026)

    panel[jenis].replaceChildren(...[   // replaceChildren bawaan menulis 'null': saring dulu
      ...bagianWilayah(pekan, prov, hari, sk, hariSt, angkaUtama(pekan, prov, sk, sudah)),
      ...bagianLintas(),
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
  let dlSegar = null;   // panel kiri dan pil jenis di peta ikut tab aktif
  function pilihTab(k, tombol) {
    tombol.forEach(b => { b.setAttribute("aria-selected", String(b.dataset.tab === k)); b.setAttribute("aria-current", String(b.dataset.tab === k)); });
    const jd = document.getElementById("dlJudul"); if (jd) jd.textContent = TAB.find(x => x[0] === k)?.[1] || "Pantau Dalops";
    /* pindah jenis mulus (pemilik 11 Nov 2026 "agar smooth transisinya"): panel baru menahan tinggi panel lama sampai isinya jadi,
       jadi halaman tidak melompat; masuknya memudar (dalops.css .dl-panel) */
    const lama = Object.values(panel).find(p => !p.hidden), tinggi = lama?.offsetHeight || 0;
    for (const [n, p] of Object.entries(panel)) p.hidden = n !== k;
    if (tinggi && panel[k] && panel[k] !== lama) { const p = panel[k]; p.style.minHeight = tinggi + "px";
      const lepas = () => { p.style.minHeight = ""; }; const ob = new MutationObserver(() => { if (p.querySelector(".maplibregl-canvas, .ex-std")) { ob.disconnect(); setTimeout(lepas, 400); } });
      ob.observe(p, {childList: true, subtree: true}); setTimeout(() => { ob.disconnect(); lepas(); }, 2500); }
    if (location.hash.slice(1) !== k) history.replaceState(null, "", "#" + k);
    aktif = k; if (JN[k]) J = JN[k];
    if (k === "karhutla") window.DalopsKarhutla?.tampil();   // peta yang lahir di panel tersembunyi diukur ulang
    const pk = panel[k]?.querySelector(".maplibregl-map")?._peta; if (pk) { pk.resize(); if (KAM.c) pk.jumpTo(KAM.c); }
    if (k === "laporan") { if (!sudahBuka.has(k)) panelLaporan(panel.laporan); bukaLaporan(); }
    else if (!sudahBuka.has(k)) muat(k);
    sudahBuka.add(k);
    dlSegar?.();
  }
  function kerangka() {
    /* model A (sistem desain dashboard, pemilik 11 Nov 2026): jenis pantauan jadi panel seksi kiri, nama jenis jadi kepala halaman navy */
    const tombol = TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", class: "db-nav-b", "data-tab": k, "aria-selected": "false", "aria-controls": "tab-" + k},
      h("i", {class: "db-nav-ik"}, ikon(ik)), h("span", {class: "db-nav-t", teks: t})));
    const grup = (teks, ik) => window.MenuPusdalops?.grup ? window.MenuPusdalops.grup(teks, ik) : h("p", {class: "db-nav-sub", teks});
    const seg = h("nav", {class: "db-nav-isi dl-seg-a", role: "tablist", "aria-label": "Jenis pantauan"}, grup("Bencana", "banjir"), ...tombol.slice(0, -2), grup("Laporan", "simpan"), ...tombol.slice(-2));
    seg.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) pilihTab(b.dataset.tab, tombol); });
    const judul = h("h1", {class: "dl-l1", id: "dlJudul", teks: "Pantau Dalops", hidden: true}), slot = window.MenuPusdalops?.pakaiSlot?.();
    if (slot) {
      /* pemilik 11 Nov 2026: "pilihan bencananya ada di dalam maps": pil jenis bencana di pojok peta tiap panel (panel tanpa peta: di puncak panel);
         panel kiri berisi seksi panel yang tampil + grup Laporan */
      const JP = TAB.filter(([k]) => !k.startsWith("laporan"));
      /* jenis bencana = satu tombol pilih di pojok peta (pemilik 11 Nov 2026: deretan sembilan pil diganti pemilih turun):
         tombol menampilkan jenis aktif, menu kartu berikon; Esc atau klik di luar menutup */
      const segarBatang = () => document.querySelectorAll(".dl-jenis-peta").forEach(w => { const j = JP.find(x => x[0] === aktif) || JP[0];
        w.dataset.aktif = j[0]; w.querySelector(".dl-jp-btn > .dl-jp-ik")?.replaceChildren(ikon(j[2])); w.querySelectorAll(".dl-jp-teks > span").forEach(x => x.classList.toggle("on", x.dataset.k === j[0]));
        w.querySelectorAll("[data-jenis]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.jenis === aktif))); });
      const tutupMenu = () => document.querySelectorAll(".dl-jenis-peta.buka").forEach(w => { w.classList.remove("buka"); w.querySelector(".dl-jp-btn").setAttribute("aria-expanded", "false"); });
      document.addEventListener("click", e => { if (!e.target.closest(".dl-jenis-peta")) tutupMenu(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape") tutupMenu(); });
      const batang = () => {
        const j = JP.find(x => x[0] === aktif) || JP[0];
        const btn = h("button", {type: "button", class: "dl-jp-btn", "aria-haspopup": "listbox", "aria-expanded": "false", "aria-label": "Jenis bencana"},
          h("i", {class: "dl-jp-ik"}, ikon(j[2])), h("span", {class: "dl-jp-teks"}, ...JP.map(([k, t]) => h("span", {"data-k": k, class: k === j[0] ? "on" : null, teks: t}))),   /* semua nama ditumpuk: lebar tombol = nama terpanjang, tidak bergeser */ h("i", {class: "dl-jp-panah", "aria-hidden": "true"}));
        const menu = h("div", {class: "dl-jp-menu", role: "listbox", "aria-label": "Jenis bencana"}, ...JP.map(([k, t, ik]) => {
          const b = h("button", {type: "button", role: "option", "data-jenis": k, "aria-selected": String(k === aktif)}, h("i", null, ikon(ik)), h("span", {teks: t}));
          b.addEventListener("click", e => { e.stopPropagation(); tutupMenu(); if (k !== aktif) { pilihTab(k, tombol); segarBatang(); } }); return b; }));
        const w = h("div", {class: "dl-jenis-peta", "data-aktif": j[0]}, btn, menu);
        btn.addEventListener("click", e => { e.stopPropagation(); const jadi = !w.classList.contains("buka"); tutupMenu(); w.classList.toggle("buka", jadi); btn.setAttribute("aria-expanded", String(jadi));
          if (jadi) menu.querySelector('[aria-selected="true"]')?.focus({preventScroll: true}); });
        menu.addEventListener("keydown", e => { if (!["ArrowDown", "ArrowUp"].includes(e.key)) return; e.preventDefault(); const bs = [...menu.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
          bs[(i + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length]?.focus(); });
        return w; };
      /* seksi = halaman (pemilik 11 Nov 2026, pola /operasi): klik di panel kiri mengganti isi, satu seksi tampil sekali;
         seksi yang dipilih diingat menurut namanya, jadi pindah jenis bencana tetap di seksi yang sama (mis. Kondisi terkini) */
      /* seksi digabung per tujuan (pemilik 11 Nov 2026): kondisi sekarang + prakiraan, benar dan lengkapnya data, penanganan.
         Satu butir panel kiri = satu kelompok; seksi yang tidak terdaftar berdiri sendiri. */
      const KELOMPOK = {"Peta Pantauan": ["Kondisi dan Prakiraan", "banjir"], "Kondisi terkini": ["Kondisi dan Prakiraan", "banjir"], "Peringatan dini": ["Kondisi dan Prakiraan", "banjir"],
        "Kabar luar": ["Kabar dan Kelengkapan", "daftar"], "Kelengkapan data": ["Kabar dan Kelengkapan", "daftar"],
        "Usulan langkah": ["Penanganan", "personel"], "Upaya penanganan": ["Penanganan", "personel"]};
      let seksiNama = null;
      const seksiSlot = () => {
        const p = panel[aktif], sek = p ? [...p.querySelectorAll(":scope > section.ex-std, :scope > .ex-std")] : [];
        const nama = x => x.querySelector(".ex-jd h3")?.textContent.trim() || "Bagian";
        const kel = x => KELOMPOK[nama(x)]?.[0] || nama(x);
        const urut = [...new Set(sek.map(kel))];
        const kini = urut.includes(seksiNama) ? seksiNama : urut[0];
        sek.forEach(x => x.classList.toggle("dl-seksi-tutup", kel(x) !== kini));
        for (const x of sek) { const pk = kel(x) === kini && x.querySelector(".maplibregl-map")?._peta; if (pk) requestAnimationFrame(() => pk.resize()); }
        const bs = urut.map(k => { const x = sek.find(y => kel(y) === k), ikk = KELOMPOK[nama(x)]?.[1];
          const b = h("button", {type: "button", class: "db-nav-b", "aria-current": String(k === kini)}, h("i", {class: "db-nav-ik"}, ikk && aktif !== "gunungapi" ? ikon(ikk === "banjir" ? (JN[aktif]?.ik || "banjir") : ikk) : x.querySelector(".ex-jd h3 svg")?.cloneNode(true) || ikon("daftar")), h("span", {class: "db-nav-t", teks: k}));
          b.addEventListener("click", () => { seksiNama = k; seksiSlot(); document.querySelector(".db-kanan")?.scrollIntoView({block: "start"}); }); return b; });
        const lap = tombol.slice(-2).map(t => { if (!t.dataset.dlKlik) { t.dataset.dlKlik = 1; t.classList.add("db-nav-b"); t.addEventListener("click", () => pilihTab(t.dataset.tab, tombol)); } return t; });
        slot.replaceChildren(...(bs.length ? [grup("Isi halaman", "daftar"), ...bs] : []), grup("Laporan", "simpan"), ...lap);
      };
      const pasangBatang = k => { const p = panel[k]; if (!p || k.startsWith("laporan")) return;
        const m = p.querySelector(".maplibregl-map"), ada = p.querySelector(".dl-jenis-peta");
        if (m && k === aktif) { const al = m.querySelector(".dl-peta-alat"); if (al && !al.contains(pPer)) al.insertBefore(pPer, al.querySelector(".dl-semua-peta")); }   // periode masuk peta (pemilik 11 Nov 2026)
        if (m) { if (!m.contains(ada)) { ada?.closest(".dl-jenis-atas")?.remove(); const al = m.querySelector(".dl-peta-alat"); al ? al.prepend(batang()) : m.append(batang()); } return; }
        if (!ada && !p.querySelector(".dl-peta") && p.querySelector(".ex-std, .db-ubin-grid")) p.prepend(h("div", {class: "dl-jenis-atas"}, batang())); };   // .dl-peta tanpa kelas maplibre = peta belum jadi: tunggu
      for (const [k, pn] of Object.entries(panel)) { let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { pasangBatang(k); if (k === aktif) seksiSlot(); }, 80); }).observe(pn, {childList: true, subtree: true}); }
      dlSegar = () => { segarBatang(); seksiSlot(); };
      seksiSlot(); app.classList.add("dl-dalam");
      const pPer = h("div", {class: "dl-periode", role: "group", "aria-label": "Periode"}, ...PERIODE.map(([n, t, ik]) => {
        const b = h("button", {type: "button", "data-n": String(n), "aria-pressed": String(n === periode)}, ikon(ik), h("span", {teks: t}));
        b.addEventListener("click", () => { if (n === periode) return; periode = n; pPer.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(+x.dataset.n === periode)));
          for (const k of Object.keys(dataTerakhir)) if (k !== aktif) delete dataTerakhir[k], sudahBuka.delete(k);   // tab lain dihitung ulang saat dibuka
          if (dataTerakhir[aktif]) render(...dataTerakhir[aktif], aktif); });
        return b; }));
      const segarPer = () => { pPer.hidden = ["karhutla", "gunungapi"].includes(aktif) || aktif.startsWith("laporan"); };
      const lamaSegar = dlSegar; dlSegar = () => { lamaSegar(); segarPer(); const al = panel[aktif]?.querySelector(".maplibregl-map .dl-peta-alat"); if (al && !al.contains(pPer)) al.insertBefore(pPer, al.querySelector(".dl-semua-peta")); }; segarPer();
      app.replaceChildren(h("div", {class: "db-kanan"}, judul, pPer, ...Object.values(panel)));
    } else {
      const nav = h("aside", {class: "db-nav dl-nav"}, h("div", {class: "db-nav-id"}, h("b", {teks: "Pantau Dalops"}), h("small", {teks: "Kejadian aktif per jenis bencana"})), seg);
      app.classList.add("db-a");
      app.replaceChildren(nav, h("div", {class: "db-kanan"}, judul, ...Object.values(panel)));
    }
    const dariHash = () => TAB.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : null;
    addEventListener("hashchange", () => { const k = dariHash(); if (k) pilihTab(k, tombol); });   // tautan /bnpb/dalops#laporan dari halaman ini juga
    pilihTab(dariHash() || "banjir", tombol);
    /* jenis lain dimuat di latar satu per satu (data R2 kecil), jadi pindah jenis tidak menunggu peta dibangun */
    setTimeout(async () => { for (const [k] of TAB) { if (k.startsWith("laporan") || sudahBuka.has(k)) continue; sudahBuka.add(k); try { await muat(k); } catch (e) {} } }, 1500);
  }

  const alat = () => ({kartuMini, lambangKab, bagian, hl, h, F, ikon, label, kosong, tdv, td, tbodyProv, tombolWA, tombolHistori, pasangUrut, pasangTip, namaProv, bukaSemua, kontak, muatKantor});
  let jawabAwal = null;   // jawaban /api/dalops/banjir dari pemeriksaan akses, dipakai sekali oleh panel Banjir
  let poskoJson = null;   // /banjir/data/posko.json (publik) untuk langkah posko di Mitigasi; gagal = langkah posko dilewati
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
    if (jenis !== "karhutla") dataJenis[jenis] ||= Promise.resolve(d);   // tabel lintas memakai jawaban yang sama
    if (jenis === "karhutla") return window.DalopsKarhutla.render(p, d, alat());
    const st = JN[jenis].pra === false ? null : await muatStatus();
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
