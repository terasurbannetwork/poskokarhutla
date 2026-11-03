/* Pantau Banjir Dalops (/bnpb/dalops): peta banjir sepekan, ringkasan per provinsi, kab/kota yang perlu ditanya, belum surut,
   status banjir per hari, sudah surut. Data: GET /api/dalops/banjir (staf, src/dalops.js; R2 dari scripts/data/dalops_banjir.py)
   + /banjir/data/status.json (publik) + /geo/provinsi.json dan /geo/kabupaten/<prov>.json (batas wilayah).
   Hitungan di dalops_hitung.js (murni, diuji). Teks data lewat textContent; tooltip lewat data-tip (di-esc). Tanpa gaya/skrip inline (CSP).
   Tabel dikelompokkan per provinsi: satu baris provinsi selebar tabel, tertutup sampai diklik (buka/tutup hanya mengganti kelas, ringan). */
(() => {
  "use strict";
  const {ikon, h, F, PROV} = window.Wilayah, H = window.DalopsHitung;
  const app = document.getElementById("app"), NS = "http://www.w3.org/2000/svg";
  const KURANG = {kk: "KK", jiwa: "Jiwa", tinggi: "Tinggi air"};
  const IK_LEVEL = ["ok", "peringatan", "peringatan", "peringatan"];
  const status = b => h("span", {class: "dl-st dl-l" + b}, ikon(IK_LEVEL[b]), H.NAMA_LEVEL[b]);   // ikon + nama, warna sama dengan peta banjir
  const nadaUmur = u => u >= 7 ? "dl-u3" : u >= 3 ? "dl-u2" : "dl-u1";
  const tinggi = t => !t ? "–" : t[0] === t[1] ? F(t[0]) + " cm" : `${F(t[0])}–${F(t[1])} cm`;
  const wibHari = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const namaProv = (kode, cadang) => PROV[kode] || cadang || "Provinsi tidak tercatat";
  const peta = x => x.kab_kode ? h("a", {class: "dl-ikon", href: "/banjir/peta?wil=" + encodeURIComponent(x.kab_kode), target: "_blank", rel: "noopener", "aria-label": "Lihat " + x.nama + " di peta banjir", "data-tip": "<b>Lihat di peta banjir</b>"}, ikon("pin")) : null;
  /* logo WhatsApp (path Simple Icons, sama dengan public/inti/alarm.js). wa.me tanpa nomor membuka pilihan chat, jadi grup BPBD bisa dipilih. */
  const ikonWA = () => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "dl-wa-ikon");
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.79h-.01a9.870 9.870 0 0 1-5.030-1.380l-.36-.21-3.740.98 1-3.650-.24-.37a9.860 9.860 0 0 1-1.510-5.260c0-5.450 4.440-9.890 9.890-9.890a9.820 9.820 0 0 1 6.990 2.900 9.830 9.830 0 0 1 2.890 6.990c0 5.450-4.440 9.890-9.880 9.890zm8.410-18.300A11.810 11.810 0 0 0 12.050 0C5.500 0 .160 5.340.160 11.890c0 2.100.550 4.140 1.590 5.950L.060 24l6.300-1.650a11.880 11.880 0 0 0 5.680 1.450h.01c6.550 0 11.890-5.340 11.890-11.890a11.820 11.820 0 0 0-3.480-8.410z");
    s.appendChild(p); return s; };
  const tombolWA = x => h("a", {class: "dl-ikon dl-wa", href: "https://wa.me/?text=" + encodeURIComponent(H.pesanWA(x)), target: "_blank", rel: "noopener",
    "aria-label": "Kirim permintaan pembaruan " + x.nama + " lewat WhatsApp", "data-tip": "<b>Kirim lewat WhatsApp</b><br>teks permintaan pembaruan, pilih grup BPBD-nya"}, ikonWA());
  const kab = (x, prov) => h("div", {class: "dl-kab"}, h("b", {teks: x.nama}), prov ? h("span", {class: "bn-label", teks: namaProv(x.prov_kode, x.prov)}) : null);
  const td = (isi, n) => h("td", {class: n ? "n" : null}, isi);
  const sumber = t => h("div", {class: "lb-kaki bn-label", teks: "Sumber: " + t});
  const blok = (id, ik, judul, ...isi) => h("section", {class: "bn-blok", id}, h("h2", {class: "lb-judul-blok"}, ikon(ik), judul), ...isi);
  const kosong = (ik, teks) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}));
  const pesan = (teks, tautan) => app.replaceChildren(h("div", {class: "bn-blok"}, h("p", {class: "lb-p", teks}), tautan || null));

  function kartuMasuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
      h("p", {class: "lb-p", teks: s === 403 ? "Akunmu belum berhak membuka Pantau Banjir Dalops. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan yang boleh. Minta Super Admin menambah perannya." : "Pantau Banjir Dalops hanya untuk staf Pusdalops BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
      h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }

  /* ---------- tabel berkelompok provinsi ----------
     grup: [{judul, meta, sel: [td ringkasan selain sel judul], baris: [tr]}]. Sel judul memakai colspan `lebarJudul`. */
  function tabelGrup(kepala, grup, lebarJudul) {
    const tbodies = grup.map(g => {
      const tombol = h("button", {type: "button", class: "dl-buka", "aria-expanded": "false"}, ikon("lanjut"), h("b", {teks: g.judul}), g.meta ? h("span", {teks: g.meta}) : null);
      const kepalaBaris = h("tr", {class: "dl-prov"}, h("td", {colspan: String(lebarJudul)}, tombol), ...(g.sel || []));
      const tb = h("tbody", {class: "dl-grup dl-tutup"}, kepalaBaris, g.baris);
      kepalaBaris.addEventListener("click", () => { const buka = tb.classList.toggle("dl-tutup") === false; tombol.setAttribute("aria-expanded", String(buka)); });
      return tb;
    });
    const t = h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, kepala.map(k => h("th", {scope: "col", teks: k})))));
    t.append(...tbodies);
    return h("div", {class: "lb-tabel-bungkus"}, t);
  }
  /* tombol buka/tutup semua di kepala bagian */
  function bukaSemua(wadah) {
    const b = h("button", {type: "button", class: "dl-semua", teks: "Buka semua"});
    b.addEventListener("click", () => {
      const tutup = b.textContent === "Tutup semua";
      wadah.querySelectorAll(".dl-grup").forEach(tb => { tb.classList.toggle("dl-tutup", tutup); tb.querySelector(".dl-buka").setAttribute("aria-expanded", String(!tutup)); });
      b.textContent = tutup ? "Buka semua" : "Tutup semua";
    });
    return b;
  }
  const kepalaBlok = (id, ik, judul, sub, ...isi) => {
    const s = h("section", {class: "bn-blok", id});
    s.append(h("div", {class: "dl-kepala"}, h("div", {class: "dl-kepala-baris"}, h("h2", {class: "lb-judul-blok"}, ikon(ik), judul), bukaSemua(s)), sub ? h("p", {class: "dl-sub", teks: sub}) : null), ...isi);
    return s;
  };
  const kelompokProv = (daftar, urut) => {
    const m = new Map();
    for (const x of daftar) (m.get(x.prov_kode) || m.set(x.prov_kode, []).get(x.prov_kode)).push(x);
    return [...m.entries()].sort(urut || ((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])));
  };

  /* ---------- peta sepekan: Indonesia abu, kab merah belum surut, biru sudah surut, label provinsi + banyak kejadian ---------- */
  const PROY = {barat: 94.6, timur: 141.2, utara: 6.4, selatan: -11.2, k: 20};
  const xy = ([lon, lat]) => [(lon - PROY.barat) * PROY.k, (PROY.utara - lat) * PROY.k];
  function jalur(geom, kotak) {
    const poli = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    let d = "";
    for (const p of poli) for (const ring of p) {
      let px = null, py = null, n = 0, s = "";
      for (const c of ring) {
        const [x, y] = xy(c);
        if (kotak) { kotak[0] = Math.min(kotak[0], x); kotak[1] = Math.min(kotak[1], y); kotak[2] = Math.max(kotak[2], x); kotak[3] = Math.max(kotak[3], y); }
        if (px != null && Math.abs(x - px) < .6 && Math.abs(y - py) < .6) continue;   // titik lebih rapat dari 0,6 px dibuang
        s += (n++ ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); px = x; py = y;
      }
      if (n > 2) d += s + "Z";
    }
    return d;
  }
  const svgEl = (tag, att) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att)) e.setAttribute(k, v); return e; };

  async function gambarPeta(wadah, pekan, prov) {
    const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    const kodeProv = [...new Set(pekan.map(x => x.prov_kode))];
    const [indo, ...kabs] = await Promise.all([ambil("/geo/provinsi.json"), ...kodeProv.map(p => ambil(`/geo/kabupaten/${p}.json`))]);
    if (!indo) { wadah.replaceChildren(kosong("peringatan", "Batas wilayah gagal dimuat, coba muat ulang.")); return; }
    const w = (PROY.timur - PROY.barat) * PROY.k, t = (PROY.utara - PROY.selatan) * PROY.k;
    const svg = svgEl("svg", {viewBox: `0 0 ${w.toFixed(0)} ${t.toFixed(0)}`, class: "dl-peta-svg", role: "img", "aria-label": "Peta kab/kota banjir sepekan"});
    const dasar = svgEl("path", {class: "dl-peta-dasar", d: indo.features.map(f => jalur(f.geometry)).join("")});
    svg.append(dasar);
    /* belum surut menang bila satu kab punya kejadian surut dan belum */
    const nada = new Map();
    for (const x of pekan) if (x.kab_kode) nada.set(x.kab_kode, nada.get(x.kab_kode) === "belum" || !x.surut ? "belum" : "surut");
    const kotakProv = new Map();
    kabs.forEach((g, i) => {
      if (!g) return;
      const p = kodeProv[i];
      for (const f of g.features) {
        const kode = p + "|" + f.properties.kab, n = nada.get(kode);
        if (!n) continue;
        const kotak = kotakProv.get(p) || [1e9, 1e9, -1e9, -1e9];
        const el = svgEl("path", {class: "dl-peta-kab dl-peta-" + n, d: jalur(f.geometry, kotak), "data-tip": `<b>${esc(f.properties.kab)}</b><br>${n === "belum" ? "Belum dilaporkan surut" : "Sudah dilaporkan surut"}`});
        svg.append(el); kotakProv.set(p, kotak);
      }
    });
    /* label provinsi: di atas kotak kab terdampaknya, bergantian bawah untuk provinsi berdekatan (Jawa) */
    const urut = [...kotakProv.entries()].sort((a, b) => a[1][0] - b[1][0]);
    let akhirX = -1e9, bawah = false;
    for (const [p, k] of urut) {
      const r = prov.find(x => x.prov_kode === p), teks = `${namaProv(p, r?.prov)} ${F(r?.kejadian || 0)}`, lebar = teks.length * 7.4 + 16;
      const cx = (k[0] + k[2]) / 2;
      bawah = cx - lebar / 2 < akhirX + 6 ? !bawah : false;
      const cy = bawah ? Math.min(k[3] + 18, t - 12) : Math.max(k[1] - 16, 12);
      const g = svgEl("g", {class: "dl-peta-label"});
      g.append(svgEl("rect", {x: (cx - lebar / 2).toFixed(1), y: (cy - 11).toFixed(1), width: lebar.toFixed(1), height: "22", rx: "11"}));
      const tx = svgEl("text", {x: cx.toFixed(1), y: (cy + 4.5).toFixed(1), "text-anchor": "middle"}); tx.textContent = teks; g.append(tx);
      svg.append(g); akhirX = cx + lebar / 2;
    }
    wadah.replaceChildren(svg);
    pasangTip();
  }

  function bagianPeta(pekan, prov) {
    const wadahPeta = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"}));
    const jml = k => prov.reduce((s, r) => s + r[k], 0);
    const baris = prov.map((r, i) => h("tr", null, td(h("span", {class: "dl-no", teks: F(i + 1)}), true), h("td", null, h("b", {teks: namaProv(r.prov_kode, r.prov)})),
      td(F(r.kejadian), true), td(F(r.nKab), true), td(F(r.nBelum), true), td(F(r.kk), true), td(F(r.jiwa), true), td(F(r.mengungsi), true)));
    const kaki = h("tr", {class: "dl-jumlah"}, h("td", {colspan: "2", teks: "Jumlah"}), td(F(jml("kejadian")), true), td(F(jml("nKab")), true), td(F(jml("nBelum")), true), td(F(jml("kk")), true), td(F(jml("jiwa")), true), td(F(jml("mengungsi")), true));
    const t = h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["No", "Provinsi", "Kejadian", "Kab/kota", "Belum surut", "KK", "Jiwa", "Mengungsi"].map(k => h("th", {scope: "col", teks: k})))), h("tbody", null, baris), h("tfoot", null, kaki));
    queueMicrotask(() => gambarPeta(wadahPeta, pekan, prov));
    return blok("peta", "banjir", "Banjir sepekan per provinsi",
      h("div", {class: "dl-peta-isi"}, h("div", null, wadahPeta,
        h("div", {class: "dl-legenda"}, h("span", {teks: "Angka = kejadian"}), h("span", {class: "dl-leg dl-leg-belum", teks: "Belum dilaporkan surut"}), h("span", {class: "dl-leg dl-leg-surut", teks: "Sudah surut"}))),
        h("div", {class: "lb-tabel-bungkus"}, t)),
      sumber("Logbook Pusdalops BNPB, batas wilayah BIG"));
  }

  /* ---------- perlu ditanya ---------- */
  function bagianTanya(daftar, sk, st, hari) {
    if (!daftar.length) return blok("tanya", "ok", "Semua wilayah belum surut sudah berkabar lengkap", kosong("ok", "Tidak ada yang perlu ditanya hari ini."));
    let n = 0;
    /* provinsi yang kabarnya paling lama di atas; di dalam provinsi kabar paling lama di atas (urutan perluDitanya) */
    const grup = kelompokProv(daftar, (a, b) => b[1][0].umur - a[1][0].umur || b[1].length - a[1].length).map(([p, xs]) => ({
      judul: namaProv(p, xs[0].prov), meta: `${F(xs.length)} wilayah, paling lama ${F(xs[0].umur)} hari tanpa kabar`,
      baris: xs.map(x => {
        /* status.json hanya memuat kecamatan berlevel > 0 (scripts/banjir/status.py): kab tak tercantum = Aman */
        const b = st ? (sk[x.kab_kode]?.b?.[1] ?? 0) : null, angka = x.kurang.filter(k => k !== "kabar");
        return h("tr", null, td(F(++n), true), h("td", null, kab(x)),
          td(h("div", {class: "dl-umur " + nadaUmur(x.umur)}, h("b", {teks: x.umur < 1 ? "Hari ini" : F(x.umur) + " hari lalu"}), h("span", {teks: H.tglPendek(x.terakhir)})), true),
          td(angka.length ? h("div", {class: "dl-chips"}, angka.map(k => h("span", {class: "dl-tag", teks: KURANG[k]}))) : h("span", {class: "dl-redup", teks: "Angka lengkap"}), true),
          td(b == null ? "–" : status(b), true),
          h("td", null, h("div", {class: "dl-aksi"}, tombolWA(x), peta(x))));
      })}));
    return kepalaBlok("tanya", "tunggu", `${F(daftar.length)} wilayah perlu ditanya ke BPBD`,
      `Banjir belum dilaporkan surut yang kabarnya lebih dari sehari atau angkanya bolong, per logbook ${H.tglPanjang(hari)}. Klik provinsi untuk membuka kab/kotanya, lalu ikon WhatsApp untuk mengirim permintaan pembaruan.`,
      tabelGrup(["No", "Kab/kota", "Kabar terakhir", "Angka belum ada", "Status besok", "Kirim"], grup, 6), sumber("Logbook Pusdalops BNPB, status banjir Centurisk97"));
  }

  /* ---------- belum surut / sudah surut ---------- */
  function tabelKejadian(daftar, hari) {
    let n = 0;
    const grup = kelompokProv(daftar).map(([p, xs]) => {
      const jml = k => xs.reduce((s, x) => s + (x[k] || 0), 0), ada = k => xs.some(x => x[k] != null);
      return {judul: namaProv(p, xs[0].prov), meta: `${F(xs.length)} kab/kota`,
        sel: [td(ada("kk") ? F(jml("kk")) : "–", true), td(ada("jiwa") ? F(jml("jiwa")) : "–", true), td(ada("mengungsi") ? F(jml("mengungsi")) : "–", true), h("td", {colspan: "4"})],
        baris: xs.map(x => h("tr", null, td(F(++n), true), h("td", null, h("b", {teks: x.nama})), td(H.tglPendek(x.mulai), true), td(F(H.lama(x, hari)), true),
          td(F(x.kk), true), td(F(x.jiwa), true), td(F(x.mengungsi), true), td(tinggi(x.tinggi_cm), true),
          h("td", {class: "dl-kondisi", "data-tip": x.kondisi ? "<b>Kondisi terakhir</b><br>" + esc(x.kondisi) : null, teks: x.kondisi ? (x.kondisi.length > 70 ? x.kondisi.slice(0, 68) + "…" : x.kondisi) : "–"}),
          td(H.tglPendek(x.terakhir), true), h("td", null, peta(x))))};
    });
    return tabelGrup(["No", "Kab/kota", "Mulai", "Lama, hari", "KK", "Jiwa", "Mengungsi", "Tinggi air", "Kondisi terakhir", "Kabar terakhir", "Peta"], grup, 4);
  }

  /* ---------- status banjir per hari + hujan tiga hari per tanggal ---------- */
  function bagianSiaga(sk, sudah, hariStatus, wadah, min) {
    const daftar = H.siaga(sk, sudah, min), hari = hariStatus || [], perHari = daftar.some(x => x.h3d?.length);
    const dua = daftar.filter(x => x.sudah && x.maks >= 2).length;
    let n = 0;
    const sel = (x, j) => h("div", {class: "dl-hari"}, status(x.b[j] ?? 0), perHari ? h("span", {class: "dl-mm", teks: x.h3d[j] == null ? "–" : F(Math.round(x.h3d[j])) + " mm"}) : null);
    const grup = kelompokProv(daftar, (a, b) => Math.max(...b[1].map(x => x.maks)) - Math.max(...a[1].map(x => x.maks)) || b[1].length - a[1].length).map(([p, xs]) => ({
      judul: namaProv(p), meta: `${F(xs.length)} kab/kota`,
      baris: xs.map(x => h("tr", {class: x.sudah && x.maks >= 2 ? "dl-sorot" : null}, td(F(++n), true), h("td", null, kab(x)),
        td(x.sudah ? h("span", {class: "dl-tag dl-tag-merah", teks: "Sudah banjir"}) : h("span", {class: "dl-redup", teks: "Belum"}), true),
        ...hari.map((_, j) => td(sel(x, j), true)), perHari ? null : td(x.h3 == null ? "–" : F(Math.round(x.h3)), true), h("td", null, peta(x))))}));
    wadah.replaceChildren(
      h("p", {class: "lb-p", teks: daftar.length ? `${F(daftar.length)} kab/kota berstatus ${min >= 2 ? "Siaga atau Awas" : "Waspada, Siaga, atau Awas"} pada salah satu hari sampai ${H.tglPanjang(hari[hari.length - 1])}${dua ? `, ${F(dua)} di antaranya sudah banjir sepekan ini (baris disorot)` : ""}.${perHari ? " Angka di bawah status = hujan tiga hari pada tanggal itu." : ""}` : "Tidak ada kab/kota berstatus itu."}),
      daftar.length ? tabelGrup(["No", "Kab/kota", "Banjir sepekan", ...hari.map(H.tglPendek), ...(perHari ? [] : ["Hujan tiga hari, mm"]), "Peta"], grup, 3 + hari.length + (perHari ? 1 : 2)) : null);
  }

  function bagianArti() {
    return h("div", {class: "dl-arti"}, [[1, "Hujan tiga hari 40 mm atau lebih, atau sungai mulai naik."], [2, "Hujan tiga hari 80 mm di wilayah rawan banjir, atau debit sungai tinggi."], [3, "Hujan tiga hari 120 mm di wilayah sangat rawan, atau sungai meluap."]]
      .map(([l, t]) => h("div", null, status(l), h("span", {class: "bn-label", teks: t}))));
  }

  function render(d, st) {
    const hari = d.hari, kel = H.kelompok(d.kejadian, hari), pekan = H.sepekan(kel, hari), prov = H.perProv(pekan);
    const belum = pekan.filter(x => !x.surut), sudahSurut = pekan.filter(x => x.surut), tanya = H.perluDitanya(kel, hari);
    const sk = st ? H.statusKab(st) : {}, sudah = new Set(pekan.map(x => x.kab_kode)), hariSt = st?.hari || [];
    const nSiaga = st ? H.siaga(sk, sudah, 2).length : null, laporan = d.kejadian.filter(k => H.selisih(hari, k.terakhir) <= H.SEPEKAN).length;
    const telat = H.selisih(wibHari(), hari), akhirSt = hariSt.length ? H.tglPanjang(hariSt[hariSt.length - 1]) : "–";

    const angka = (n, label, ket, ke, nada) => h("a", {class: "dl-angka " + (nada || ""), href: "#" + ke},
      h("span", {class: "dl-angka-label", teks: label}), h("b", {teks: n == null ? "–" : F(n)}), h("span", {class: "dl-angka-ket", teks: ket}));
    const siagaWadah = h("div", {class: "dl-isi"});
    const seg = h("div", {class: "lb-seg dl-seg", role: "radiogroup", "aria-label": "Status yang ditampilkan"},
      [[2, "Siaga dan Awas", "peringatan"], [1, "Termasuk Waspada", "daftar"]].map(([v, t, ik]) => h("label", null, h("input", {type: "radio", name: "dl-min", value: String(v), checked: v === 2}), ikon(ik), t)));
    seg.addEventListener("change", e => { bagianSiaga(sk, sudah, hariSt, siagaWadah, +e.target.value); pasangTip(); });   // hanya bagian ini yang dirender ulang
    if (st) bagianSiaga(sk, sudah, hariSt, siagaWadah, 2);

    app.replaceChildren(
      h("div", {class: "dl-judul"}, h("h1", {teks: "Pantau Banjir Dalops"}),
        h("p", {class: "dl-sub"}, ikon("kalender"), `Logbook Pusdalops per ${H.tglPanjang(hari)}`)),
      telat > 1 ? h("div", {class: "dl-basi-data", role: "status"}, ikon("peringatan"), h("span", {teks: `Logbook belum diperbarui ${F(telat)} hari. Angka di bawah bisa sudah berubah.`})) : null,
      h("div", {class: "dl-ringkas"}, angka(tanya.length, "Perlu ditanya", "wilayah, kabar lama atau angka bolong", "tanya", "dl-utama"),
        angka(belum.length, "Belum surut", "wilayah belum dilaporkan surut", "belum"), angka(nSiaga, "Siaga atau Awas", "wilayah sampai " + akhirSt, "siaga"),
        angka(laporan, "Laporan sepekan", "kejadian banjir di logbook", "peta")),
      bagianPeta(pekan, prov),
      bagianTanya(tanya, sk, st, hari),
      belum.length ? kepalaBlok("belum", "banjir", `${F(belum.length)} wilayah belum dilaporkan surut`, "Baris provinsi memuat jumlah KK, jiwa, dan mengungsi. Klik untuk membuka kab/kotanya.", tabelKejadian(belum, hari), sumber("Logbook Pusdalops BNPB"))
        : blok("belum", "ok", "Semua banjir sepekan ini sudah dilaporkan surut", kosong("ok", "Tidak ada yang belum surut.")),
      st ? kepalaBlok("siaga", "peringatan", `${F(nSiaga)} wilayah Siaga atau Awas sampai ${akhirSt}`, null, seg, siagaWadah, bagianArti(), sumber("Status banjir Centurisk97, logbook Pusdalops BNPB"))
        : blok("siaga", "peringatan", "Status banjir belum termuat", kosong("peringatan", "status.json gagal dimuat, coba muat ulang.")),
      sudahSurut.length ? kepalaBlok("surut", "ok", `${F(sudahSurut.length)} wilayah sudah dilaporkan surut`, null, tabelKejadian(sudahSurut, hari), sumber("Logbook Pusdalops BNPB"))
        : blok("surut", "tunggu", "Belum ada yang dilaporkan surut sepekan ini"));
    pasangTip();
  }

  (async () => {
    let r;
    try { r = await fetch("/api/dalops/banjir", {credentials: "same-origin"}); } catch (e) { return pesan("Tidak ada sinyal. Muat ulang halaman ini."); }
    if (r.status === 401 || r.status === 403) return kartuMasuk(r.status);
    if (r.status === 404) return pesan("Data logbook banjir belum diunggah. Jalankan python3 scripts/data/dalops_banjir.py --unggah di mesin Pusdalops.");
    if (!r.ok) return pesan("Data gagal dimuat (" + r.status + "). Muat ulang halaman ini.");
    const d = await r.json(), st = await fetch("/banjir/data/status.json").then(x => x.ok ? x.json() : null).catch(() => null);
    render(d, st);
  })();
})();
