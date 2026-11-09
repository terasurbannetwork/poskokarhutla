/* katalog-dokumen.js: halaman /bnpb/katalog-dokumen. Membaca indeks dari GET /api/bnpb/katalog-dokumen, saring per kata kunci, kategori, dan format, tampil sebagai daftar atau kartu.
   Klik pill format membuka panel pratinjau (samping, layar penuh, popup): Markdown diformat, PDF lewat penampil peramban, format lain menawarkan PDF-nya atau GitHub.
   Daftar panjang dirender per 60 baris; teks data selalu lewat textContent (CSP script-src 'self'). */
"use strict";
(() => {
  const GITHUB = "https://github.com/terasurbannetwork/poskokarhutla/blob/main/", PER_MUAT = 60, NS = "http://www.w3.org/2000/svg", API = "/api/bnpb/katalog-dokumen";
  const IKON = {
    semua: "M4 5h16v14H4z|M4 10h16|M9 10v9",
    harian: "M8 3v4M16 3v4M4 9h16|M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
    satelit: "M12 8l4 4-5 5-4-4z|M16 4l4 4-3 3-4-4z|M8 12L4 8l3-3 4 4|M4 20a5 5 0 0 0 5-1",
    laporan: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z|M14 3v4h4|M9 13h6M9 17h6",
    kegiatan: "M3 4h18|M5 4v11h14V4|M12 15v3|M8 21l4-3 4 3",
    kajian: "M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2z",
    rancangan: "M4 4h7v7H4z|M13 13h7v7h-7z|M15 4h5v5|M4 15v5h5",
    riset: "M10 3h4|M11 3v6L5 19a1.500 1.500 0 0 0 1.300 2h11.400a1.500 1.500 0 0 0 1.300-2L13 9V3|M8 15h8",
    sistem: "M4 6h16M4 12h16M4 18h10",
    teknis: "M8 8l-4 4 4 4|M16 8l4 4-4 4|M13 6l-2 12",
    lain: "M6 12h.01M12 12h.01M18 12h.01",
    templat: "M4 4h16v5H4z|M4 13h7v7H4z|M15 13h5M15 17h5",
    folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    kalender: "M8 3v4M16 3v4M4 9h16|M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z|M8 13h2v2H8z|M14 13h2v2h-2z",
    kiri: "M15 6l-6 6 6 6",
    kanan: "M9 6l6 6-6 6",
    bawah: "M6 9l6 6 6-6",
    centang: "M5 12l5 5L20 7",
    pdf: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z|M14 3v4h4|M9 17v-4h1.500a1.200 1.200 0 0 1 0 2.400H9|M14 13v4",
    pptx: "M11 4a8.500 8.500 0 1 0 8.500 8.500H11z|M14.500 3.500a6.500 6.500 0 0 1 6 6h-6z",
    docx: "M4 5h16M4 10h16M4 15h16M4 20h10",
    xlsx: "M4 4h16v16H4z|M4 10h16M4 15h16M10 4v16",
    md: "M3 6h18v12H3z|M7 15V9l2.500 3L12 9v6|M17 9v6|M15 13l2 2 2-2",
    cari: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M21 21l-4.300-4.300",
    daftar: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    kartu: "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z",
    terang: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400",
    gelap: "M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z",
    samping: "M4 4h16v16H4z|M14 4v16",
    penuh: "M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5",
    popup: "M3 5h18v14H3z|M8 9h8v6H8z",
    keluar: "M14 4h6v6|M20 4l-9 9|M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
    tutup: "M6 6l12 12M18 6L6 18",
  };
  const FORMAT = [["", "Semua format"], ["pdf", "PDF"], ["pptx", "PowerPoint"], ["docx", "Word"], ["xlsx", "Excel"], ["md", "Markdown"]];
  const NAMA_FORMAT = Object.fromEntries(FORMAT);
  const app = document.getElementById("app");
  const simpan = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const baca = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const S = {cari: "", kat: new Set(), fmt: new Set(), tgl: "", dari: "", sampai: "", n: PER_MUAT, hari: "", bulan: "", tampil: ["kartu", "kalender"].includes(baca("kd-tampil")) ? baca("kd-tampil") : "daftar"};

  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "kd-ik");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const h = (tag, atr, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atr || {})) { if (v == null) continue; if (k === "teks") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const hl = t => h("span", {class: "hl", teks: t});
  const angka = n => n.toLocaleString("id-ID");
  const tanggal = (t, bulan = "short") => t ? new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: bulan, year: "numeric", timeZone: "Asia/Jakarta"}) : "–";
  const ukuran = b => b == null ? "" : b >= 1048576 ? (b / 1048576).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " MB" : Math.max(1, Math.round(b / 1024)).toLocaleString("id-ID") + " KB";
  const tautan = p => GITHUB + p.split("/").map(encodeURIComponent).join("/");
  const kunciBerkas = p => btoa(String.fromCharCode(...new TextEncoder().encode(p))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");   // alamat tanpa ".pdf": pengelola unduhan menangkap dari nama
  const pesan = (kelas, ...isi) => app.replaceChildren(h("p", {class: "bn-pesan " + kelas, role: "status"}, ...isi));

  /* ---------- tema terang/gelap: kunci sama dengan halaman lain ---------- */
  const temaKini = () => document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  function tombolTema() {
    const b = h("button", {type: "button", class: "kd-ikon"});
    const segarkan = () => { const gelap = temaKini() === "dark", label = gelap ? "Ganti ke tema terang" : "Ganti ke tema gelap"; b.replaceChildren(ikon(gelap ? "terang" : "gelap")); b.title = label; b.setAttribute("aria-label", label); };
    b.addEventListener("click", () => { const t = temaKini() === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; simpan("pk-tema", JSON.stringify(t)); segarkan(); });
    segarkan(); return b;
  }

  /* ---------- panel pratinjau: samping (bisa ditarik), layar penuh, popup ---------- */
  function buatPanel() {
    const isi = h("div", {class: "kd-p-isi"}), nama = h("b", {class: "kd-p-nama"}), info = h("small", {class: "kd-p-info"});
    const github = h("a", {class: "kd-ikon", target: "_blank", rel: "noopener noreferrer", title: "Buka di GitHub", "aria-label": "Buka di GitHub"}, ikon("keluar"));
    const tutup = h("button", {type: "button", class: "kd-ikon", title: "Tutup", "aria-label": "Tutup pratinjau"}, ikon("tutup"));
    const MODE = [["samping", "Panel samping"], ["penuh", "Layar penuh"], ["popup", "Popup"]];
    const tombolMode = MODE.map(([m, t]) => h("button", {type: "button", class: "kd-ikon", "data-mode": m, title: t, "aria-label": t}, ikon(m)));
    const tarik = h("div", {class: "kd-tarik", title: "Tarik untuk mengubah lebar", "aria-hidden": "true"});
    const panel = h("aside", {class: "kd-panel", role: "dialog", "aria-label": "Pratinjau dokumen", hidden: ""}, tarik,
      h("header", {class: "kd-p-kepala"}, h("div", {class: "kd-p-judul"}, nama, info), h("div", {class: "kd-p-alat"}, tombolMode, github, tutup)), isi);
    const latar = h("div", {class: "kd-latar", hidden: ""});
    document.body.append(latar, panel);
    let mode = "samping", token = 0, batal = null, asal = null, pilAktif = null, penampil = null;

    const lebar = Number(baca("kd-lebar")); if (lebar >= 320) document.documentElement.style.setProperty("--kd-lebar", lebar + "px");
    tarik.addEventListener("pointerdown", ev => { tarik.setPointerCapture(ev.pointerId); tarik.classList.add("aktif"); });
    tarik.addEventListener("pointermove", ev => { if (!tarik.hasPointerCapture(ev.pointerId)) return; document.documentElement.style.setProperty("--kd-lebar", Math.round(Math.min(Math.max(320, innerWidth - ev.clientX), innerWidth - 240)) + "px"); });
    tarik.addEventListener("pointerup", ev => { tarik.releasePointerCapture(ev.pointerId); tarik.classList.remove("aktif"); simpan("kd-lebar", parseInt(getComputedStyle(panel).width, 10)); });

    const aturMode = m => { mode = m; panel.dataset.mode = m; latar.hidden = panel.hidden || m !== "popup"; document.body.classList.toggle("kd-ada-samping", !panel.hidden && m === "samping"); for (const b of tombolMode) b.setAttribute("aria-pressed", String(b.dataset.mode === m)); };
    const tandai = pil => { pilAktif?.classList.remove("aktif"); pilAktif = pil; pil?.classList.add("aktif"); };
    const lepasMuatan = () => { token++; batal?.abort(); batal = null; penampil?.hancur(); penampil = null; };
    const keadaan = (...x) => isi.replaceChildren(h("div", {class: "kd-p-pesan"}, ...x));
    const keGithub = p => h("a", {class: "kd-p-tombol", href: tautan(p), target: "_blank", rel: "noopener noreferrer", teks: "Buka di GitHub"});

    function buka(x, p, u, bs, judul, pil) {
      lepasMuatan(); const t = token;
      if (panel.hidden) asal = pil;
      panel.hidden = false; aturMode(mode); tandai(pil);
      nama.textContent = judul; info.textContent = [NAMA_FORMAT[x], ukuran(u)].filter(Boolean).join(", "); github.href = tautan(p);
      const url = `${API}/berkas?k=${kunciBerkas(p)}`;
      const ambil = (baca, tampil) => { keadaan("Memuat isi…"); batal = new AbortController();
        fetch(url, {signal: batal.signal}).then(r => { if (!r.ok) throw new Error(r.status); return r[baca](); }).then(d => { if (t === token) tampil(d); })
          .catch(e => { if (e.name !== "AbortError" && t === token) keadaan("Isi berkas belum bisa dimuat.", keGithub(p)); }); };
      if (x === "pdf") {
        ambil("arrayBuffer", d => {
          const w = h("div", {class: "kd-pdf"});
          isi.replaceChildren(w); isi.scrollTop = 0;
          window.KatalogPdf.tampil(d, w).then(v => { if (t === token) penampil = v; else v.hancur(); })
            .catch(e => { console.error("pdf", e); if (t === token) keadaan("Isi PDF belum bisa ditampilkan.", keGithub(p)); });
        });
      } else if (x === "md") {
        ambil("text", teks => requestAnimationFrame(() => { if (t !== token) return; isi.replaceChildren(window.KatalogMd.bangun(teks)); isi.scrollTop = 0; }));
      } else {
        const pdf = bs.find(b => b[0] === "pdf");
        keadaan(`Berkas ${NAMA_FORMAT[x]} belum bisa dipratinjau di sini.`,
          pdf ? h("button", {type: "button", class: "kd-p-tombol", "data-pdf": "1", teks: "Lihat versi PDF-nya"}) : null, keGithub(p));
        isi.querySelector("[data-pdf]")?.addEventListener("click", () => buka("pdf", pdf[1], pdf[2], bs, judul, pil));
      }
      tutup.focus({preventScroll: true});
    }
    function kunci() {
      if (panel.hidden) return;
      lepasMuatan(); panel.hidden = true; isi.replaceChildren(); aturMode(mode); tandai(null);
      if (asal?.isConnected) asal.focus({preventScroll: true}); asal = null;
    }
    for (const b of tombolMode) b.addEventListener("click", () => aturMode(b.dataset.mode));
    tutup.addEventListener("click", kunci); latar.addEventListener("click", kunci);
    addEventListener("keydown", ev => { if (ev.key === "Escape") kunci(); });
    aturMode("samping");
    return buka;
  }

  function pasang(d) {
    const nama = Object.fromEntries(d.kategori), dok = d.dok.map(e => { const semua = [...e.b, ...(e.v || []).flatMap(v => v.b)];
      return {...e, fmt: new Set(semua.map(b => b[0])), c: [e.j, e.d, nama[e.k], e.r, ...(e.v || []).map(v => v.l), ...semua.map(b => b[1])].join(" ").toLowerCase()}; });
    const hitung = {}; for (const e of dok) hitung[e.k] = (hitung[e.k] || 0) + 1;
    const buka = buatPanel();
    const judul = h("h3"), badan = h("tbody"), grid = h("div", {class: "kd-grid"}), kal = h("div", {class: "kd-hm"}), muat = h("button", {type: "button", class: "kd-muat", hidden: ""});
    let hasil = dok;

    const berkas = (b, jd) => h("div", {class: "kd-berkas"}, b.map(([x, p, u]) => {
      const pil = h("button", {type: "button", class: "kd-pil", "data-x": x, title: `Pratinjau ${NAMA_FORMAT[x]}`}, x.toUpperCase(), u != null ? h("small", {teks: ukuran(u)}) : null);
      pil.addEventListener("click", () => buka(x, p, u, b, jd, pil)); return pil; }));
    const folderVersi = e => h("details", {class: "kd-versi"}, h("summary", null, ikon("folder"), `${angka(e.v.length)} versi lain`),
      h("ul", null, e.v.map(v => h("li", null, h("span", {class: "kd-label", teks: v.l}), h("span", {class: "kd-tgl", teks: tanggal(v.t)}), berkas(v.b, `${e.j} (${v.l})`)))));
    const judulE = e => [h("span", {class: "kd-judul", teks: e.j}), e.r ? h("span", {class: "kd-rev", teks: e.r}) : null, e.d ? h("span", {class: "kd-folder", teks: e.d}) : null];
    const jdLengkap = e => e.r ? `${e.j} (${e.r})` : e.j;
    const ikonKat = e => h("span", {class: "kd-ikon-kat", "data-k": e.k, title: nama[e.k]}, ikon(e.k));
    const kat = e => h("span", {class: "kd-kat", teks: nama[e.k]});
    const baris = e => h("tr", null, h("td", null, h("div", {class: "kd-dok"}, ikonKat(e), h("div", {class: "kd-dok-isi"}, judulE(e), e.v ? folderVersi(e) : null))), h("td", null, kat(e)), h("td", {class: "kd-tgl", teks: tanggal(e.t)}), h("td", null, berkas(e.b, jdLengkap(e))));
    const kartu = e => h("article", {class: "kd-kartu"}, h("div", {class: "kd-kartu-atas"}, kat(e), h("span", {class: "kd-tgl", teks: tanggal(e.t)})), h("div", {class: "kd-dok"}, ikonKat(e), h("div", {class: "kd-dok-isi"}, judulE(e))), berkas(e.b, jdLengkap(e)), e.v ? folderVersi(e) : null);

    const kolom = [["Dokumen", "Judul dari isi Markdown atau nama berkas, dengan folder di repo"], ["Kategori", "Dikelompokkan menurut folder di repo"], ["Tanggal", "Tanggal pada nama berkas atau folder, kalau tidak ada tanggal perubahan terakhir di git"], ["Berkas", "Klik format untuk melihat isinya"]];
    const tabel = h("table", null, h("thead", null, h("tr", null, kolom.map(([t, ket]) => h("th", {scope: "col", title: ket, teks: t})))), badan);
    const wadah = h("div", {class: "ex-tabel kd-tabel"}, kal, tabel, grid, muat);
    /* ---------- tampilan kalender: heatmap jumlah file per hari, makin gelap makin banyak. Klik tanggal = daftar dokumennya ---------- */
    const adaDiHari = (e, t) => e.t === t || (e.v || []).some(v => v.t === t);
    const daftarAktif = () => S.tampil === "kalender" ? (S.hari ? hasil.filter(e => adaDiHari(e, S.hari)) : []) : hasil;
    const hitungHari = () => { const m = new Map();
      for (const e of hasil) for (const x of [e, ...(e.v || [])]) if (x.t) { const n = x.b.filter(b => !S.fmt.size || S.fmt.has(b[0])).length; if (n) m.set(x.t, (m.get(x.t) || 0) + n); }
      return m; };
    const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"], isoHari = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
    const tingkat = (n, maks) => !n ? 0 : Math.max(1, Math.min(5, Math.ceil(Math.sqrt(n / maks) * 5)));   // akar: hari sibuk tidak menumpuk di warna tergelap
    const bulanKini = () => S.bulan || urutTanggal[urutTanggal.length - 1].slice(0, 7);
    const namaBulanKd = k => new Date(k + "-15T12:00:00Z").toLocaleDateString("id-ID", {month: "long", year: "numeric", timeZone: "UTC"});
    function gambarKalender(per) {
      const kunci = bulanKini(), y = +kunci.slice(0, 4), m = +kunci.slice(5, 7) - 1, awal = urutTanggal[0].slice(0, 7), akhir = urutTanggal[urutTanggal.length - 1].slice(0, 7);
      const maks = Math.max(0, ...[...per].filter(([t]) => t.startsWith(kunci)).map(x => x[1]));
      const n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), geser = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, sel = [];
      for (let i = 0; i < geser; i++) sel.push(h("span"));
      for (let d = 1; d <= n; d++) {
        const t = isoHari(y, m, d), j = per.get(t) || 0;
        sel.push(h("button", {type: "button", class: "kd-hm-sel" + (t === S.hari ? " pilih" : ""), "data-t": t, "data-l": tingkat(j, maks), disabled: j ? null : "", title: j ? `${angka(j)} file, ${tanggal(t, "long")}` : tanggal(t, "long"), "aria-label": `${tanggal(t, "long")}, ${angka(j)} file`, "aria-pressed": String(t === S.hari)},
          h("span", {class: "kd-hm-tgl", teks: d}), j ? h("span", {class: "kd-hm-n"}, h("b", {teks: angka(j)}), h("small", {teks: "file"})) : null));
      }
      const panah = (l, ik, teks, mati) => h("button", {type: "button", class: "kd-ikon", "data-geser": l, title: teks, "aria-label": teks, disabled: mati ? "" : null}, ikon(ik));
      kal.replaceChildren(
        h("header", {class: "kd-hm-kepala"},
          h("div", {class: "kd-hm-nav"}, panah(-1, "kiri", "Bulan sebelumnya", kunci <= awal), h("b", {teks: namaBulanKd(kunci)}), panah(1, "kanan", "Bulan berikutnya", kunci >= akhir))),
        h("div", {class: "kd-hm-kisi"}, HARI.map(x => h("span", {class: "kd-hm-hari", teks: x})), sel),
        h("div", {class: "kd-hm-skala"}, "Sedikit", [1, 2, 3, 4, 5].map(l => h("i", {"data-l": l})), "Banyak"));
    }
    kal.addEventListener("click", ev => {
      const p = ev.target.closest("button[data-geser]");
      if (p) { const k = bulanKini(), d = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1 + Number(p.dataset.geser), 1)); S.bulan = d.toISOString().slice(0, 7); S.hari = ""; S.n = PER_MUAT; requestAnimationFrame(gambar); return; }
      const b = ev.target.closest("button[data-t]"); if (!b) return; S.hari = S.hari === b.dataset.t ? "" : b.dataset.t; S.n = PER_MUAT; requestAnimationFrame(gambar);
    });

    const tombolMuat = () => { const sisa = daftarAktif().length - S.n; muat.hidden = sisa <= 0; muat.textContent = `Tampilkan ${angka(Math.min(sisa, PER_MUAT))} lagi, tersisa ${angka(Math.max(sisa, 0))}`; };
    const KOSONG = "Tidak ada dokumen yang cocok. Coba kata kunci atau saringan lain.";
    const gambar = () => {
      const adaKal = S.tampil === "kalender", adaKartu = S.tampil === "kartu", daftar = daftarAktif(), tampak = daftar.slice(0, S.n);
      if (adaKal) {
        const per = hitungHari(), kunci = bulanKini(), isi = [...per].filter(([t]) => t.startsWith(kunci)), jumlah = isi.reduce((a, x) => a + x[1], 0), puncak = isi.sort((a, b) => b[1] - a[1])[0], nama = namaBulanKd(kunci);
        judul.replaceChildren(...(S.hari ? [hl(angka(daftar.length)), " dokumen pada ", hl(tanggal(S.hari, "long"))]
          : puncak ? [hl(angka(jumlah)), ` file di ${nama}, terbanyak `, hl(`${angka(puncak[1])} file`), " pada ", hl(tanggal(puncak[0], "long"))] : [`Tidak ada file yang cocok di ${nama}`]));
        gambarKalender(per);
      } else judul.replaceChildren(...(hasil.length === dok.length ? [hl(angka(dok.length)), " dokumen tersimpan di repo, terbaru ", hl(tanggal(dok[0]?.t, "long"))]
        : [hl(angka(hasil.length)), ` dari ${angka(dok.length)} dokumen cocok dengan saringan`]));
      kal.hidden = !adaKal; tabel.hidden = adaKartu || (adaKal && !S.hari); grid.hidden = !adaKartu;
      if (adaKartu) { badan.replaceChildren(); grid.replaceChildren(...(daftar.length ? tampak.map(kartu) : [h("p", {class: "kd-kosong", teks: KOSONG})])); }
      else { grid.replaceChildren(); badan.replaceChildren(...(daftar.length ? tampak.map(baris) : adaKal ? [] : [h("tr", null, h("td", {class: "kd-kosong", colspan: "4", teks: KOSONG}))])); }
      tombolMuat();
    };
    const hariJakarta = (mundur = 0) => { const d = new Date(Date.now() - mundur * 864e5); return d.toLocaleDateString("sv-SE", {timeZone: "Asia/Jakarta"}); };
    const rentang = () => {
      if (S.tgl === "kustom") return S.dari && S.sampai && S.dari > S.sampai ? [S.sampai, S.dari] : [S.dari, S.sampai];
      if (S.tgl === "bulan") return [hariJakarta().slice(0, 8) + "01", ""];
      return S.tgl ? [hariJakarta(Number(S.tgl) - 1), ""] : ["", ""];
    };
    const dalamRentang = (e, a, z) => (!a && !z) || [e.t, ...(e.v || []).map(v => v.t)].some(t => t && (!a || t >= a) && (!z || t <= z));   // versi lama ikut dihitung: paparan tetap ketemu bila salah satu versinya di rentang
    const saring = () => {
      const kata = S.cari.toLowerCase().split(/\s+/).filter(Boolean), [a, z] = S.tampil === "kalender" ? ["", ""] : rentang();   // di kalender, tanggal dipilih dari kisinya
      hasil = dok.filter(e => (!S.kat.size || S.kat.has(e.k)) && (!S.fmt.size || [...S.fmt].some(x => e.fmt.has(x))) && dalamRentang(e, a, z) && kata.every(k => e.c.includes(k)));
      S.n = PER_MUAT; requestAnimationFrame(gambar);
    };
    const tandaiDeret = (w, b) => { for (const x of w.querySelectorAll("button[data-v]")) x.setAttribute("aria-pressed", String(x === b)); };
    /* ---------- filter: tiga menu tarik-turun. Popover menempel di body karena kartu .ex-std memotong isinya ---------- */
    let menuBuka = null;
    const letakkanMenu = () => { if (!menuBuka) return; const {tombol, pop} = menuBuka, r = tombol.getBoundingClientRect(), w = pop.offsetWidth, t = pop.offsetHeight;
      pop.style.setProperty("left", Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px"); pop.style.setProperty("top", Math.max(8, r.bottom + 6 + t <= innerHeight ? r.bottom + 6 : r.top - t - 6) + "px"); };
    const tutupMenu = () => { if (!menuBuka) return; const m = menuBuka; removeEventListener("scroll", letakkanMenu, {capture: true}); menuBuka = null; m.pop.hidden = true; m.tombol.setAttribute("aria-expanded", "false"); m.saatTutup?.(); };
    function menu(teks, ik, isi, saatBuka, saatTutup) {
      const label = h("span", {class: "kd-tk", teks}), tombol = h("button", {type: "button", class: "kd-menu", "aria-haspopup": "dialog", "aria-expanded": "false"}, ikon(ik), label, ikon("bawah"));
      const pop = h("div", {class: "kd-pop", role: "dialog", "aria-label": teks, hidden: ""}, isi), m = {tombol, pop, label, saatTutup};
      document.body.append(pop);
      tombol.addEventListener("click", () => { const sudah = menuBuka === m; tutupMenu(); if (sudah) return; menuBuka = m; pop.hidden = false; tombol.setAttribute("aria-expanded", "true"); saatBuka?.(); letakkanMenu(); addEventListener("scroll", letakkanMenu, {passive: true, capture: true}); });
      return m;
    }
    document.addEventListener("pointerdown", ev => { if (menuBuka && !menuBuka.pop.contains(ev.target) && !menuBuka.tombol.contains(ev.target)) tutupMenu(); });
    addEventListener("keydown", ev => { if (ev.key === "Escape" && menuBuka) { ev.stopPropagation(); const t = menuBuka.tombol; tutupMenu(); t.focus(); } }, true);
    addEventListener("resize", tutupMenu);

    const opsiGanda = (kunci, pilihan) => {
      const w = h("div", {class: "kd-opsi-daftar"}, pilihan.map(([v, t, n]) => h("button", {type: "button", class: "kd-opsi", "data-v": v, "aria-pressed": "false"}, h("span", {class: "kd-centang"}, ikon("centang")), h("span", {class: "kd-ikon-kat", "data-k": v}, ikon(v)), h("span", {class: "kd-tk", teks: t}), n != null ? h("small", {teks: angka(n)}) : null)));
      w.addEventListener("click", ev => { const b = ev.target.closest("button[data-v]"); if (!b) return; if (!S[kunci].delete(b.dataset.v)) S[kunci].add(b.dataset.v); segarkanFilter(); saring(); });
      return w;
    };
    const opsiKat = h("div", {class: "kd-pilih", role: "group", "aria-label": "Saring kategori"}, [["", "Semua", "semua", dok.length], ...d.kategori.filter(([k]) => hitung[k]).map(([k, t]) => [k, t, k, hitung[k]])].map(([v, t, ik, n]) =>
      h("button", {type: "button", "data-v": v, "aria-pressed": "false"}, ikon(ik), h("span", {class: "kd-tk", title: t, teks: t}), h("small", {teks: angka(n)}))));
    opsiKat.addEventListener("click", ev => { const b = ev.target.closest("button[data-v]"); if (!b) return; const v = b.dataset.v; if (!v) S.kat.clear(); else if (!S.kat.delete(v)) S.kat.add(v); segarkanFilter(); saring(); });
    const opsiFmt = opsiGanda("fmt", FORMAT.filter(([v]) => v).map(([v, t]) => [v, t]));
    const PRESET = [["7", "7 hari terakhir"], ["30", "30 hari terakhir"], ["bulan", "Bulan ini"]];
    const opsiPreset = h("div", {class: "kd-preset"}, PRESET.map(([v, t]) => h("button", {type: "button", "data-v": v, "aria-pressed": "false", teks: t})));
    opsiPreset.addEventListener("click", ev => { const b = ev.target.closest("button[data-v]"); if (!b) return; S.tgl = S.tgl === b.dataset.v ? "" : b.dataset.v; S.dari = S.sampai = ""; kalender.kosongkan(); segarkanFilter(); saring(); if (S.tgl) tutupMenu(); });
    const jumlahTanggal = new Map(); for (const e of dok) for (const t of new Set([e.t, ...(e.v || []).map(v => v.t)])) if (t) jumlahTanggal.set(t, (jumlahTanggal.get(t) || 0) + 1);
    const urutTanggal = [...jumlahTanggal.keys()].sort();
    const kalender = window.KatalogTgl.buat({jumlah: jumlahTanggal, min: urutTanggal[0], max: urutTanggal[urutTanggal.length - 1], ubah: (a, z) => { S.dari = a; S.sampai = z; S.tgl = a ? "kustom" : ""; segarkanFilter(); saring(); if (a) tutupMenu(); }});
    const menuFmt = menu("Format", "laporan", opsiFmt), menuTgl = menu("Tanggal", "harian", [opsiPreset, kalender.el], () => kalender.segarkan(), () => kalender.batalkanSetengah());
    menuTgl.pop.classList.add("lebar");

    const terpilih = h("div", {class: "kd-chips", hidden: ""});
    const pendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
    const teksTanggal = () => S.tgl === "kustom" ? (S.dari === S.sampai ? pendek(S.dari) : `${pendek(S.dari)} sampai ${pendek(S.sampai)}`) : (PRESET.find(([v]) => v === S.tgl)?.[1] || "");
    const ringkas = (m, dasar, daftar) => { m.label.textContent = !daftar.length ? dasar : daftar.length === 1 ? daftar[0] : `${dasar} (${daftar.length})`; m.tombol.classList.toggle("aktif", !!daftar.length); };
    const hapusTanggal = () => { S.tgl = S.dari = S.sampai = ""; kalender.kosongkan(); };
    function segarkanFilter() {
      for (const b of opsiKat.children) b.setAttribute("aria-pressed", String(b.dataset.v ? S.kat.has(b.dataset.v) : !S.kat.size));
      for (const b of opsiFmt.querySelectorAll("button[data-v]")) b.setAttribute("aria-pressed", String(S.fmt.has(b.dataset.v)));
      for (const b of opsiPreset.children) b.setAttribute("aria-pressed", String(S.tgl === b.dataset.v));
      const diKalender = S.tampil === "kalender", namaF = [...S.fmt].map(f => NAMA_FORMAT[f]), tgl = diKalender ? "" : teksTanggal();
      if (diKalender && menuBuka === menuTgl) tutupMenu();
      menuTgl.tombol.disabled = diKalender; menuTgl.tombol.title = diKalender ? "Tanggal dipilih langsung dari kalender" : "";
      ringkas(menuFmt, "Format", namaF); ringkas(menuTgl, "Tanggal", tgl ? [tgl] : []);
      const chip = (teks, buang) => { const b = h("button", {type: "button", class: "kd-chip", title: "Lepas filter " + teks, teks}, ikon("tutup")); b.addEventListener("click", () => { buang(); segarkanFilter(); saring(); }); return b; };
      const chips = [...[...S.fmt].map(f => chip(NAMA_FORMAT[f], () => S.fmt.delete(f))), ...(tgl ? [chip(tgl, hapusTanggal)] : [])];   // kategori tidak perlu chip: tombolnya sudah terlihat menyala
      if (chips.length > 1 || (chips.length && S.kat.size)) { const semua = h("button", {type: "button", class: "kd-chip-hapus", teks: "Hapus semua"}); semua.addEventListener("click", () => { S.kat.clear(); S.fmt.clear(); hapusTanggal(); segarkanFilter(); saring(); }); chips.push(semua); }
      terpilih.replaceChildren(...chips); terpilih.hidden = !chips.length;
    }
    segarkanFilter();
    const pilihTampil = h("div", {class: "seg", role: "group", "aria-label": "Pilih tampilan"}, [["daftar", "Daftar"], ["kartu", "Kartu"], ["kalender", "Kalender"]].map(([v, t]) => h("button", {type: "button", "data-v": v, "aria-pressed": String(S.tampil === v)}, ikon(v), t)));
    pilihTampil.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b || b.dataset.v === S.tampil) return; S.tampil = b.dataset.v; S.hari = ""; simpan("kd-tampil", S.tampil); tandaiDeret(pilihTampil, b); segarkanFilter(); saring(); });

    const input = h("input", {type: "search", placeholder: "Cari judul, folder, atau nama berkas", "aria-label": "Cari dokumen", autocomplete: "off"});
    let tunda; input.addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { S.cari = input.value.trim(); saring(); }, 120); });
    muat.addEventListener("click", () => { const dari = S.n; S.n += PER_MUAT; const tambah = daftarAktif().slice(dari, S.n); if (S.tampil === "kartu") grid.append(...tambah.map(kartu)); else badan.append(...tambah.map(baris)); tombolMuat(); });   // ditambahkan, bukan digambar ulang: folder yang sedang terbuka tetap terbuka

    app.replaceChildren(h("section", {class: "ex ex-std"},
      h("header", {class: "ex-hd"}, h("span", {class: "ex-ey"}, ikon("kajian"), "Katalog dokumen"), h("div", {class: "ex-jd"}, judul, h("div", {class: "kd-kanan"}, pilihTampil, tombolTema()))),
      h("div", {class: "ex-bd"}, h("div", {class: "kd-alat"},
        h("div", {class: "kd-saring"}, h("label", {class: "kd-cari"}, ikon("cari"), input), menuFmt.tombol, menuTgl.tombol), h("div", {class: "kd-grup"}, h("span", {class: "kd-grup-label", teks: "Kategori"}), opsiKat), terpilih)),
      wadah));
    gambar();
  }

  fetch(API, {credentials: "same-origin"}).then(async r => {
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) return pesan("galat", "Katalog belum bisa dimuat, coba muat ulang halaman.");
    pasang(d);
  }).catch(() => pesan("galat", "Katalog belum bisa dimuat, periksa koneksi lalu muat ulang."));
})();
