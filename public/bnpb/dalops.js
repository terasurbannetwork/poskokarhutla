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
  const KURANG = {kk: ["KK", "sosial"], jiwa: ["Jiwa", "personel"], tinggi: ["Tinggi air", "air"]};
  const IK_LEVEL = ["ok", "peringatan", "peringatan", "peringatan"];
  const status = b => h("span", {class: "dl-st dl-l" + b}, ikon(IK_LEVEL[b]), H.NAMA_LEVEL[b]);   // prakiraan: ikon + nama, warna sama dengan peta banjir
  const label = (teks, ik, nada) => h("span", {class: "dl-tag" + (nada ? " dl-tag-" + nada : "")}, ikon(ik), teks);
  const surutLabel = s => s ? label("Sudah surut", "ok", "biru") : label("Belum surut", "banjir", "merah");
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
  const kab = (x, prov) => h("div", {class: "dl-kab"}, h("b", {teks: x.nama}), prov ? h("span", {class: "bn-label", teks: namaProv(x.prov_kode, x.prov)}) : null);
  const td = (isi, n) => h("td", {class: n ? "n" : null}, isi);
  const kosong = (ik, teks) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}));
  const pesan = (teks, tautan) => app.replaceChildren(h("div", {class: "bn-blok"}, h("p", {class: "lb-p", teks}), tautan || null));
  const tabelStd = (kepala, ...isi) => { const t = h("table", {class: "ad-tabel dl-tabel"}, h("thead", null, h("tr", null, kepala.map(k => h("th", {scope: "col", teks: k}))))); t.append(...isi); return h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t); };

  function kartuMasuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
      h("p", {class: "lb-p", teks: s === 403 ? "Akunmu belum berhak membuka Pantau Banjir Dalops. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan yang boleh. Minta Super Admin menambah perannya." : "Pantau Banjir Dalops hanya untuk staf Pusdalops BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
      h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }

  /* ---------- kelompok provinsi: baris provinsi selebar tabel (atau dengan sel jumlah), tertutup sampai diklik ---------- */
  function tbodyProv(judul, meta, sel, lebarJudul, baris) {
    const tombol = h("button", {type: "button", class: "dl-buka", "aria-expanded": "false"}, ikon("lanjut"), h("b", {teks: judul}), meta ? h("span", {teks: meta}) : null);
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
  const bagian = (id, ik, judul, sub, ...isi) => {
    const s = h("section", {class: "bn-blok", id});
    s.append(h("div", {class: "dl-kepala"}, h("div", {class: "dl-kepala-baris"}, h("h2", {class: "lb-judul-blok"}, ikon(ik), judul), isi.some(x => x?.querySelector?.(".dl-grup")) ? bukaSemua(s) : null),
      sub ? h("p", {class: "dl-sub", teks: sub}) : null), ...isi);
    return s;
  };
  const kelompokProv = (daftar, urut) => {
    const m = new Map();
    for (const x of daftar) (m.get(x.prov_kode) || m.set(x.prov_kode, []).get(x.prov_kode)).push(x);
    return [...m.entries()].sort(urut || ((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])));
  };

  /* ---------- peta sepekan: fokus ke wilayah terdampak, kab merah belum surut, biru sudah surut ---------- */
  const K = 24, xy = ([lon, lat]) => [(lon - 94) * K, (7 - lat) * K];
  function jalur(geom, kotak) {
    const poli = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    let d = "";
    for (const p of poli) for (const ring of p) {
      let px = null, py = null, n = 0, s = "";
      for (const c of ring) {
        const [x, y] = xy(c);
        if (kotak) { kotak[0] = Math.min(kotak[0], x); kotak[1] = Math.min(kotak[1], y); kotak[2] = Math.max(kotak[2], x); kotak[3] = Math.max(kotak[3], y); }
        if (px != null && Math.abs(x - px) < .5 && Math.abs(y - py) < .5) continue;   // titik lebih rapat dari 0,5 px dibuang
        s += (n++ ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); px = x; py = y;
      }
      if (n > 2) d += s + "Z";
    }
    return d;
  }
  const svgEl = (tag, att) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att)) e.setAttribute(k, v); return e; };

  async function gambarPeta(wadah, pekan, prov, bukaKab) {
    const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    const kodeProv = [...new Set(pekan.map(x => x.prov_kode))];
    const [indo, ...kabs] = await Promise.all([ambil("/geo/provinsi.json"), ...kodeProv.map(p => ambil(`/geo/kabupaten/${p}.json`))]);
    if (!indo) { wadah.replaceChildren(kosong("peringatan", "Batas wilayah gagal dimuat, coba muat ulang.")); return; }
    /* satu kab bisa punya kejadian surut dan belum: belum menang */
    const perKab = new Map();
    for (const x of pekan) if (x.kab_kode) { const a = perKab.get(x.kab_kode); perKab.set(x.kab_kode, !a || (a.surut && !x.surut) ? x : a); }
    const svg = svgEl("svg", {class: "dl-peta-svg", role: "img", "aria-label": "Peta kab/kota banjir sepekan"});
    svg.append(svgEl("path", {class: "dl-peta-dasar", d: indo.features.map(f => jalur(f.geometry)).join("")}));
    const semua = [1e9, 1e9, -1e9, -1e9], kotakProv = new Map();
    kabs.forEach((g, i) => {
      if (!g) return;
      const p = kodeProv[i];
      for (const f of g.features) {
        const x = perKab.get(p + "|" + f.properties.kab);
        if (!x) continue;
        const kotak = kotakProv.get(p) || [1e9, 1e9, -1e9, -1e9];
        const el = svgEl("path", {class: "dl-peta-kab " + (x.surut ? "dl-peta-surut" : "dl-peta-belum"), d: jalur(f.geometry, kotak), tabindex: "0", role: "button", "aria-label": x.nama});
        el.addEventListener("pointerenter", e => tampilTip(x, e));
        el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); tampilTip(x, {clientX: r.left + r.width / 2, clientY: r.top}); });
        el.addEventListener("blur", () => tip.hidden = true);
        el.addEventListener("click", () => bukaKab(x));
        el.addEventListener("keydown", e => { if (e.key === "Enter") bukaKab(x); });
        svg.append(el); kotakProv.set(p, kotak);
        for (let j = 0; j < 2; j++) { semua[j] = Math.min(semua[j], kotak[j]); semua[j + 2] = Math.max(semua[j + 2], kotak[j + 2]); }
      }
    });
    /* bingkai: kotak semua kab terdampak + tepi, minimal selebar Sumatra-Jawa supaya konteks Indonesia tetap terbaca */
    const pad = 30, lebarMin = 560;
    let [x0, y0, x1, y1] = [semua[0] - pad, semua[1] - pad, semua[2] + pad, semua[3] + pad];
    if (x1 - x0 < lebarMin) { const c = (x0 + x1) / 2; x0 = c - lebarMin / 2; x1 = c + lebarMin / 2; }
    svg.setAttribute("viewBox", `${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`);
    /* kartu hover sendiri (bukan #tip bersama): kondisi berwarna, nama, dua angka besar, kabar terakhir */
    const tip = h("div", {class: "dl-peta-tip", hidden: true, role: "tooltip"});
    const geser = e => { const w = wadah.getBoundingClientRect(), x = e.clientX - w.left, y = e.clientY - w.top, kiri = x > w.width - 250;
      tip.style.transform = `translate(${Math.round(kiri ? x - tip.offsetWidth - 14 : x + 14)}px, ${Math.round(Math.max(8, y - tip.offsetHeight - 12))}px)`; };
    function tampilTip(x, e) {
      tip.replaceChildren(surutLabel(x.surut), h("b", {class: "dl-tip-nama", teks: x.nama}), h("span", {class: "dl-tip-prov", teks: namaProv(x.prov_kode, x.prov)}),
        h("div", {class: "dl-tip-angka"}, h("div", null, h("span", {class: "dl-tip-ik"}, ikon("sosial")), h("b", {teks: angka(x.kk)}), h("span", {teks: "KK terdampak"})),
          h("div", null, h("span", {class: "dl-tip-ik"}, ikon("personel")), h("b", {teks: angka(x.jiwa)}), h("span", {teks: "jiwa terdampak"}))),
        h("span", {class: "dl-tip-kaki"}, ikon("kalender"), `Kabar terakhir ${H.tglPendek(x.terakhir)}. Klik untuk rincian.`));
      tip.hidden = false; geser(e);
    }
    svg.addEventListener("pointermove", e => { if (!tip.hidden) geser(e); });
    svg.addEventListener("pointerleave", () => tip.hidden = true);
    svg.addEventListener("pointerover", e => { if (!e.target.closest(".dl-peta-kab")) tip.hidden = true; });
    wadah.replaceChildren(svg, tip);
  }

  /* ---------- tabel wilayah bertingkat ---------- */
  /* histori harian satu kab dalam pop-up (dialog bawaan peramban: Esc dan klik latar menutup) */
  let dialog;
  function bukaHistori(x, sub) {
    const rw = (x.riwayat || []).slice().reverse(), denganKondisi = !x.provinsi;
    const histori = rw.length ? h("table", {class: "dl-mini"}, h("thead", null, h("tr", null, ["Tanggal", "KK", "Jiwa", "Kec", "Desa", "Tinggi air", ...(denganKondisi ? ["Kondisi"] : [])].map(k => h("th", {teks: k})))),
      h("tbody", null, rw.map(r => h("tr", null, h("td", {class: "dl-tgl", teks: H.tglPendek(r.tgl)}), td(angka(r.kk), true), td(angka(r.jiwa), true), td(angka(r.n_kec), true), td(angka(r.n_desa), true), td(tinggi(r.tinggi_cm), true),
        denganKondisi ? h("td", {class: "dl-kondisi"}, r.surut ? label("Surut", "ok", "biru") : null, h("span", {teks: r.kondisi || "–"})) : null)))) : h("p", {class: "dl-redup", teks: "Histori harian belum ada."});
    if (!dialog) {
      dialog = h("dialog", {class: "dl-dialog", "aria-labelledby": "dl-dialog-judul"});
      dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
      document.body.append(dialog);
    }
    const tutup = h("button", {type: "button", class: "dl-ikon dl-tutup-dialog", "aria-label": "Tutup"}, ikon("tambah"));
    tutup.addEventListener("click", () => dialog.close());
    dialog.replaceChildren(h("div", {class: "dl-dialog-kepala"}, h("div", null, h("h2", {id: "dl-dialog-judul"}, ikon("kalender"), "Histori harian " + x.nama),
      h("p", {class: "dl-sub", teks: sub || `${namaProv(x.prov_kode, x.prov)}, banjir sejak ${H.tglPanjang(x.mulai)}, kabar terakhir ${H.tglPanjang(x.terakhir)}`})), tutup),
      h("div", {class: "dl-gulir"}, histori));
    dialog.showModal();
  }

  const tombolHistori = (x, sub) => { const b = h("button", {type: "button", class: "dl-ikon", "aria-label": "Histori harian " + x.nama, "data-tip": "<b>Histori harian</b><br>angka" + (x.provinsi ? " semua kab/kota" : " dan kondisi") + " tiap hari logbook"}, ikon("kalender"));
    b.addEventListener("click", e => { e.stopPropagation(); bukaHistori(x, sub); }); return b; };

  function bagianWilayah(pekan, prov, hari) {
    const petaKab = new Map();
    const tbodies = prov.map((r, i) => {
      const baris = [];
      for (const x of r.baris.slice().sort((a, b) => a.surut - b.surut || a.nama.localeCompare(b.nama))) {
        const tombol = h("button", {type: "button", class: "dl-buka dl-buka-kab", "aria-expanded": "false"}, h("b", {teks: x.nama}));
        const tr = h("tr", {class: "dl-kab-baris"}, h("td", {class: "dl-wil"}, tombol), td(F(x.id.length), true), td(x.surut ? null : surutLabel(false), true), td(x.surut ? surutLabel(true) : null, true), td(F(H.lama(x, hari)), true),
          td(angka(x.kk), true), td(angka(x.jiwa), true), td(angka(x.kk_u), true), td(angka(x.mengungsi), true), td(tinggi(x.tinggi_cm), true), td(H.tglPendek(x.terakhir), true),
          h("td", null, h("div", {class: "dl-aksi"}, tombolHistori(x), x.surut ? null : tombolWA(x, H.pesanWA({...x, kurang: []}), "permintaan pembaruan"))));
        /* kecamatan lalu desa: baris tabel bertingkat, sama dengan provinsi dan kab/kota */
        const kecBaris = H.perKec(x).map(k => {
          const jml = f => k.desa.some(d => d[f] != null) ? k.desa.reduce((s, d) => s + (d[f] || 0), 0) : null;
          const ting = k.desa.filter(d => d.tinggi_cm).map(d => d.tinggi_cm), rentang = ting.length ? [Math.min(...ting.map(t => t[0])), Math.max(...ting.map(t => t[1]))] : null;
          const tk = h("button", {type: "button", class: "dl-buka dl-buka-kec", "aria-expanded": "false"}, h("b", {teks: k.nama ? "Kec. " + k.nama.replace(/^(kecamatan|kec\.?)\s*/i, "") : "Kecamatan tidak disebut"}),
            h("span", {teks: k.desa.length ? `${F(k.desa.length)} desa/kel.` : "desa belum dirinci"}));
          const trk = h("tr", {class: "dl-kec-baris", hidden: true}, h("td", {class: "dl-wil"}, tk), td("", true), td("", true), td("", true), td("", true), td(angka(jml("kk")), true), td(angka(jml("jiwa")), true), td("", true), td("", true), td(tinggi(rentang), true), td("", true), td("", true));
          const desa = k.desa.map(d => h("tr", {class: "dl-desa-baris", hidden: true}, h("td", {class: "dl-wil", teks: d.nama}), td("", true), td("", true), td("", true), td("", true), td(angka(d.kk), true), td(angka(d.jiwa), true), td("", true), td("", true), td(tinggi(d.tinggi_cm), true), td("", true), td("", true)));
          const bukaKec = jadi => { desa.forEach(r => r.hidden = !jadi); tk.setAttribute("aria-expanded", String(jadi)); };
          if (desa.length) trk.addEventListener("click", () => bukaKec(tk.getAttribute("aria-expanded") !== "true")); else trk.classList.add("dl-tanpa");
          return {trk, desa, bukaKec};
        });
        const buka = paksa => {
          const jadi = paksa || tombol.getAttribute("aria-expanded") !== "true";
          kecBaris.forEach(k => { k.trk.hidden = !jadi; if (!jadi) k.bukaKec(false); });
          tombol.setAttribute("aria-expanded", String(jadi)); tr.classList.toggle("dl-aktif", jadi);
        };
        tr.addEventListener("click", e => { if (!e.target.closest("a,button.dl-ikon")) buka(); });
        if (x.kab_kode && (!petaKab.has(x.kab_kode) || !x.surut)) petaKab.set(x.kab_kode, {tr, buka});
        baris.push(tr, ...kecBaris.flatMap(k => [k.trk, ...k.desa]));
      }
      const latest = r.baris.reduce((m, x) => x.terakhir > m ? x.terakhir : m, "");
      const nama = namaProv(r.prov_kode, r.prov), gab = {nama, provinsi: true, riwayat: r.baris.reduce((a, x) => H.gabungRiwayat(a, x.riwayat || []), [])};
      const aksi = h("div", {class: "dl-aksi"}, tombolHistori(gab, `Jumlah ${F(r.nKab)} kab/kota per hari logbook`),
        r.nBelum ? tombolWA({nama: "Provinsi " + nama}, H.pesanProv(nama, r.baris), "permintaan pembaruan") : null);
      return tbodyProv(nama, `${F(r.nKab)} kab/kota`, [td(F(r.kejadian), true), td(F(r.nBelum), true), td(F(r.nKab - r.nBelum), true), td("", true),
        td(F(r.kk), true), td(F(r.jiwa), true), td(F(r.kk_u), true), td(F(r.mengungsi), true), td("", true), td(H.tglPendek(latest), true), h("td", null, aksi)], 1, baris);
    });
    const jml = k => prov.reduce((s, r) => s + r[k], 0);
    const kaki = h("tfoot", null, h("tr", null, h("td", {teks: "Jumlah"}), td(F(jml("kejadian")), true), td(F(jml("nBelum")), true), td(F(jml("nKab") - jml("nBelum")), true), td("", true), td(F(jml("kk")), true), td(F(jml("jiwa")), true), td(F(jml("kk_u")), true), td(F(jml("mengungsi")), true), td("", true), td("", true), td("", true)));
    /* kepala dua tingkat: Terdampak dan Pengungsi masing-masing KK dan Jiwa */
    const th = (teks, att) => h("th", {scope: "col", ...att, teks});
    const kepala = h("thead", null, h("tr", null, ...["Wilayah", "Kejadian", "Belum surut", "Sudah surut", "Lama, hari"].map(k => th(k, {rowspan: "2"})),
        th("Terdampak", {colspan: "2", class: "dl-th-grup"}), th("Pengungsi", {colspan: "2", class: "dl-th-grup"}), ...["Tinggi air", "Kabar terakhir", "Aksi"].map(k => th(k, {rowspan: "2"}))),
      h("tr", {class: "dl-th-sub"}, th("KK"), th("Jiwa"), th("KK"), th("Jiwa")));
    const t = h("table", {class: "ad-tabel dl-tabel"}, kepala); t.append(...tbodies, kaki);
    const tabel = h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, t);
    /* klik kab di peta: buka provinsinya, buka rincian kab, gulir ke sana */
    const bukaKab = x => {
      const t = petaKab.get(x.kab_kode); if (!t) return;
      const tb = t.tr.closest("tbody"); tb.classList.remove("dl-tutup"); tb.querySelector(".dl-buka").setAttribute("aria-expanded", "true");
      t.buka(true); t.tr.scrollIntoView({block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
    };
    const wadahPeta = h("div", {class: "dl-peta"}, h("p", {class: "bn-pesan", teks: "Memuat peta…"}));
    queueMicrotask(() => gambarPeta(wadahPeta, pekan, prov, bukaKab));
    return bagian("peta", "banjir", "Banjir sepekan per wilayah", "Klik provinsi untuk membuka kab/kota, klik kab/kota untuk kecamatan, lalu klik kecamatan untuk desa/kelurahan. Ikon kalender membuka histori harian. Klik wilayah di peta untuk langsung ke rinciannya.",
      wadahPeta, h("div", {class: "dl-legenda"}, h("span", {class: "dl-leg dl-leg-belum", teks: "Belum dilaporkan surut"}), h("span", {class: "dl-leg dl-leg-surut", teks: "Sudah dilaporkan surut"})),
      tabel);
  }

  /* ---------- perlu ditanya ---------- */
  function bagianTanya(daftar, sk, st, hari) {
    if (!daftar.length) return bagian("tanya", "ok", "Semua wilayah belum surut sudah berkabar lengkap", null, kosong("ok", "Tidak ada yang perlu ditanya hari ini."));
    let n = 0;
    const tb = kelompokProv(daftar, (a, b) => b[1][0].umur - a[1][0].umur || b[1].length - a[1].length).map(([p, xs]) =>
      tbodyProv(namaProv(p, xs[0].prov), `${F(xs.length)} kab/kota, paling lama ${F(xs[0].umur)} hari tanpa kabar`, null, 6, xs.map(x => {
        /* status.json hanya memuat kecamatan berlevel > 0 (scripts/banjir/status.py): kab tak tercantum = Aman */
        const b = st ? (sk[x.kab_kode]?.b?.[1] ?? 0) : null, kurang = x.kurang.filter(k => k !== "kabar");
        return h("tr", null, td(F(++n), true), h("td", null, kab(x)),
          td(h("div", {class: "dl-umur " + nadaUmur(x.umur)}, h("b", {teks: x.umur < 1 ? "Hari ini" : F(x.umur) + " hari lalu"}), h("span", {teks: H.tglPendek(x.terakhir)})), true),
          td(kurang.length ? h("div", {class: "dl-chips"}, kurang.map(k => label(KURANG[k][0], KURANG[k][1], "kuning"))) : label("Angka lengkap", "ok", "hijau"), true),
          td(b == null ? "–" : status(b), true),
          h("td", null, h("div", {class: "dl-aksi"}, tombolWA(x, H.pesanWA(x), "permintaan pembaruan"))));
      })));
    return bagian("tanya", "tunggu", `${F(daftar.length)} kab/kota perlu ditanya ke BPBD`,
      `Banjir belum dilaporkan surut yang kabarnya lebih dari sehari atau angkanya bolong, per logbook ${H.tglPanjang(hari)}. Ikon WhatsApp mengirim permintaan pembaruan ke grup BPBD.`,
      tabelStd(["No", "Kab/kota", "Kabar terakhir", "Angka belum ada", "Prakiraan besok", "Kirim"], ...tb));
  }

  /* ---------- prakiraan banjir per hari + hujan tiga hari per tanggal ---------- */
  function bagianPrakiraan(sk, sudah, hariStatus, wadah, min) {
    const daftar = H.siaga(sk, sudah, min), hari = hariStatus || [], perHari = daftar.some(x => x.h3d?.length);
    const dua = daftar.filter(x => x.sudah && x.maks >= 2).length;
    let n = 0;
    const sel = (x, j) => h("div", {class: "dl-hari"}, status(x.b[j] ?? 0), perHari ? h("span", {class: "dl-mm", teks: x.h3d[j] == null ? "–" : F(Math.round(x.h3d[j])) + " mm"}) : null);
    const tb = kelompokProv(daftar, (a, b) => Math.max(...b[1].map(x => x.maks)) - Math.max(...a[1].map(x => x.maks)) || b[1].length - a[1].length).map(([p, xs]) =>
      tbodyProv(namaProv(p), `${F(xs.length)} kab/kota`, null, 4 + hari.length + (perHari ? 0 : 1), xs.map(x => h("tr", {class: x.sudah && x.maks >= 2 ? "dl-sorot" : null}, td(F(++n), true), h("td", null, kab(x)),
        td(x.sudah ? label("Sudah banjir", "banjir", "merah") : label("Belum banjir", "ok", "abu"), true),
        ...hari.map((_, j) => td(sel(x, j), true)), perHari ? null : td(x.h3 == null ? "–" : F(Math.round(x.h3)), true),
        h("td", null, h("div", {class: "dl-aksi"}, tombolWA(x, H.pesanSiaga(x, hari), "peringatan dini")))))));
    wadah.replaceChildren(
      h("p", {class: "lb-p", teks: daftar.length ? `${F(daftar.length)} kab/kota dengan prakiraan Siaga atau Awas pada salah satu hari sampai ${H.tglPanjang(hari[hari.length - 1])}${dua ? `, ${F(dua)} di antaranya sudah banjir sepekan ini (baris disorot)` : ""}.${perHari ? " Angka di bawah prakiraan = hujan tiga hari pada tanggal itu." : ""}` : "Tidak ada kab/kota dengan prakiraan itu."}),
      daftar.length ? tabelStd(["No", "Kab/kota", "Banjir sepekan", ...hari.map(H.tglPendek), ...(perHari ? [] : ["Hujan tiga hari, mm"]), "Kirim"], ...tb) : null);
    wadah.closest?.("section")?.querySelectorAll(".dl-semua span").forEach(s => { s.textContent = "Buka semua"; });
  }

  function bagianArti() {
    return h("div", {class: "dl-arti"}, [[2, "Hujan tiga hari 80 mm di wilayah rawan banjir, atau debit sungai tinggi."], [3, "Hujan tiga hari 120 mm di wilayah sangat rawan, atau sungai meluap."]]
      .map(([l, t]) => h("div", null, status(l), h("span", {class: "bn-label", teks: t}))));
  }

  function render(d, st) {
    const hari = d.hari, kel = H.kelompok(d.kejadian, hari), pekan = H.sepekan(kel, hari), prov = H.perProv(pekan);
    const tanya = H.perluDitanya(kel, hari);
    const sk = st ? H.statusKab(st) : {}, sudah = new Set(pekan.map(x => x.kab_kode)), hariSt = st?.hari || [];
    const nSiaga = st ? H.siaga(sk, sudah, 2).length : null;
    const akhirSt = hariSt.length ? H.tglPanjang(hariSt[hariSt.length - 1]) : "–";

    const wadahPra = h("div", {class: "dl-isi"});
    if (st) bagianPrakiraan(sk, sudah, hariSt, wadahPra, 2);

    app.replaceChildren(
      h("div", {class: "dl-judul"}, h("h1", {teks: "Pantau Banjir Dalops"}),
        h("p", {class: "dl-sub"}, ikon("kalender"), `Logbook Pusdalops per ${H.tglPanjang(hari)}`)),
      bagianWilayah(pekan, prov, hari),
      bagianTanya(tanya, sk, st, hari),
      st ? bagian("prakiraan", "peringatan", `${F(nSiaga)} kab/kota prakiraan Siaga atau Awas sampai ${akhirSt}`, null, wadahPra, bagianArti())
        : bagian("prakiraan", "peringatan", "Prakiraan banjir belum termuat", null, kosong("peringatan", "status.json gagal dimuat, coba muat ulang.")));
    /* tombol Buka semua bagian prakiraan dipasang setelah tabelnya ada */
    const pra = document.getElementById("prakiraan");
    if (pra && !pra.querySelector(".dl-semua") && pra.querySelector(".dl-grup")) pra.querySelector(".dl-kepala-baris").append(bukaSemua(pra));
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
