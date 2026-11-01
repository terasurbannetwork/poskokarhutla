/* Dokumen Pusdalops (/bnpb/dokumen): BAST Piket, Laporan Menonjol, Laporan Shift, Rekap Mingguan dari logbook.
   Data: GET /api/logbook/hari?tgl= (rute yang ADA); semua hitungan di dokumen_pusdalops.js (murni, diuji). Cetak = window.print() dengan CSS A4; salin teks WA.
   INP: ganti tab/tanggal langsung mengecat chrome (tab aktif, pesan memuat); pengambilan data dan render tabel menyusul sesudah satu frame tercat.
   Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {ikon, h} = window.Wilayah, D = window.DokumenPusdalops, app = document.getElementById("app"), POLA = "dokumen_bast_pola_v1";
  const POLA_BAWAAN = "NNN/PTEO/PO.02/BB/2026";   // pola nomor dari BAST asli (katalog Drive: NNN/PTEO/PO.02/BB/2026); urutnya diisi manual
  const TAB = [["bast", "BAST Piket", "daftar"], ["menonjol", "Laporan Menonjol", "lainnya"], ["shift", "Laporan Shift", "kalender"], ["mingguan", "Rekap Mingguan", "simpan"]];
  const kini = Date.now(), kemarin = D.tglISO(kini - 864e5);
  const st = {tab: "bast", tgl: kemarin, n: 3, kamis: D.tglISO(D.akhirKamis(kini)), urut: "", pola: POLA_BAWAAN, manual: new Set(), pilihBuka: false};
  let nomor = 0, cache = new Map(), teksWA = "", ulangNomor = null, tundaManual = 0;

  const bacaLokal = () => { try { return JSON.parse(localStorage.getItem(POLA) || "null"); } catch (e) { return null; } };
  const simpanLokal = () => { try { localStorage.setItem(POLA, JSON.stringify({pola: st.pola, urut: st.urut})); } catch (e) {} };
  const l0 = bacaLokal(); if (l0 && typeof l0.pola === "string") { st.pola = l0.pola.slice(0, 60); st.urut = String(l0.urut || "").slice(0, 6); }

  const api = async tgl => {
    const c = cache.get(tgl);   // hari yang periodenya masih berjalan kedaluwarsa 5 menit; hari lampau tetap
    if (c && (D.awalHari(tgl) + 864e5 <= Date.now() || Date.now() - c.t < 3e5)) return c;
    let r;
    try { const x = await fetch("/api/logbook/hari?tgl=" + tgl); r = {s: x.status, j: await x.json().catch(() => ({}))}; } catch (e) { r = {s: 0, j: {}}; }
    r.t = Date.now(); if (r.s === 200) cache.set(tgl, r);
    return r;
  };
  /* ambil beberapa hari, 4 sekaligus; hasil = semua entri + status galat pertama */
  async function ambilHari(daftar) {
    const out = []; let galat = null, terpotong = false, diambil = 0;
    for (let i = 0; i < daftar.length; i += 4) {
      const rs = await Promise.all(daftar.slice(i, i + 4).map(api));
      for (const r of rs) { if (r.s !== 200) galat = galat || r.s; else { diambil = Math.max(diambil, r.t); out.push(...(r.j.entri || [])); terpotong = terpotong || !!r.j.terpotong; } }
    }
    return {entri: out, galat, terpotong, diambil};
  }

  const pil = (teks, ton, ik) => h("span", {class: "bn-pil dk-t-" + ton}, ikon(ik), teks);
  const tabel = (kepala, baris, kelasKolom = []) => h("div", {class: "dk-bungkus"}, h("table", {class: "dk-tabel"}, h("thead", null, h("tr", null, kepala.map(t => h("th", {teks: t})))),
    h("tbody", null, baris.map(b => h("tr", null, b.map((c, i) => h("td", {class: kelasKolom[i] || "", ...(c instanceof Node ? {} : {teks: c == null ? "" : String(c)})}, c instanceof Node ? c : null)))))));
  /* daftar panjang: 200 baris pertama + tombol; cetak membuka semuanya */
  const BATAS = 200;
  const tabelBatas = (kepala, baris, kelas) => {
    if (baris.length <= BATAS) return tabel(kepala, baris, kelas);
    const w = h("div"), tampil = n => w.replaceChildren(tabel(kepala, baris.slice(0, n), kelas), n < baris.length ? h("button", {type: "button", class: "bn-tombol sekunder dk-tak-cetak dk-lagi", teks: `Tampilkan semua (${F(baris.length)} baris)`}) : null);
    w.addEventListener("click", e => { if (e.target.closest(".dk-lagi")) tampil(baris.length); }); tampil(BATAS); return w;
  };
  const kosong = teks => h("p", {class: "dk-kosong", teks});
  const catatan = teks => h("p", {class: "dk-p", teks});
  const F = D.fmt, namaJenis = j => D.NAMA[j] || j;
  const jenisPil = j => pil(namaJenis(j), "info", j);

  /* ---------- pratinjau per dokumen: {node, teks} ---------- */
  function kop(judul, sub, dummy) {
    return h("div", {class: "dk-kop"}, h("p", {class: "dk-instansi", teks: "BADAN NASIONAL PENANGGULANGAN BENCANA, DIREKTORAT KOORDINASI DAN PELAKSANAAN OPERASI (PUSDALOPS)"}), h("h2", {teks: judul}), h("p", {class: "dk-sub", teks: sub}),
      dummy ? h("p", {class: "dk-dummy", teks: "DATA DUMMY, BUKAN LAPORAN NYATA"}) : null);
  }
  const daftarMenonjol = (ds) => ds.length ? D.perProv(ds).map(([p, vs]) => h("section", {class: "dk-prov"}, h("h3", {teks: D.namaProv(p)}), h("ul", null, vs.map(v => h("li", null,
    h("b", {teks: namaJenis(v.jenis)}), ", " + v.lokasi + (v.dampak ? ": " + v.dampak : ": dampak belum dilaporkan"), v.alasan.length ? h("span", {class: "dk-alasan", teks: " (menonjol: " + v.alasan.join(", ") + ")"}) : null))))) : [kosong("Tidak ada kejadian yang memenuhi ambang menonjol pada periode ini.")];
  const periodeHari = tgl => `${D.tglIndo(tgl)} pukul 07.00 WIB s.d. ${D.tglIndo(D.tambahHari(tgl, 1))} pukul 07.00 WIB`;

  function buatMenonjol(entri, dummy, diambil) {
    const hr = D.hariData(entri, st.tgl, st.manual);
    // pimpinan boleh memilih manual kejadian di bawah ambang (hanya dalam sesi ini); yang lolos ambang terkunci tercentang
    const pilih = h("details", {class: "dk-tak-cetak"}, h("summary", {teks: `Pilih manual dari ${F(hr.semua.length)} kejadian periode ini`}),
      h("div", {class: "dk-pilih"}, hr.semua.map(v => { const otomatis = v.menonjol && !st.manual.has(v.id), c = h("input", {type: "checkbox", "data-id": v.id, checked: v.menonjol, disabled: otomatis});
        return h("label", null, c, `${namaJenis(v.jenis)}, ${v.lokasi}`); })));
    const node = h("div", null, kop("LAPORAN MENONJOL", periodeHari(st.tgl), dummy),
      h("div", {class: "dk-ringkas"}, pil(`${F(hr.daftar.length)} menonjol`, "bahaya", "peringatan"), pil(`${F(hr.total)} kejadian periode ini`, "info", "daftar"), pil(`${F(hr.baru)} baru, ${F(hr.pengkinian)} pengkinian`, "tunggu", "kalender")),
      h("p", {class: "dk-p", teks: `Laporan kejadian bencana sejumlah ${F(hr.daftar.length)}.`}), ...daftarMenonjol(hr.daftar),
      catatan("Ambang dari Panduan Lapjol 02/PO.02/07/2025 (Lampiran G.2.a-i). Jenis tanpa kriteria resmi tidak menonjol otomatis dan hanya masuk lewat pilihan manual."));
    return {node, pilih, teks: D.teksMenonjol(hr, dummy, diambil)};
  }
  function buatBast(entri, dummy, diambil) {
    const b = D.bast(entri, D.tambahHari(st.tgl, -(st.n - 1)), st.n, st.manual), no = D.nomorSurat(st.pola, st.urut);
    const nomorEl = h("p", {class: "dk-nomor", teks: "Nomor: " + no});
    const node = h("div", null, kop("BERITA ACARA SERAH TERIMA PELAKSANAAN PEMANTAUAN PUSDALOPS", `Periode ${D.tglIndo(b.tglAwal)} s.d. ${D.tglIndo(b.tglAkhir)}, tiap hari 07.00 s.d. 07.00 WIB`, dummy),
      nomorEl,
      h("h3", {teks: "A. Jumlah laporan per hari"}),
      tabel(["Hari dan tanggal", "Jumlah kejadian", "Kejadian baru", "Pengkinian", "Menonjol"], [...b.hari.map(x => [D.tglIndo(x.tgl), F(x.total), F(x.baru), F(x.pengkinian), F(x.daftar.length)]), ["Jumlah", F(b.total), F(b.baru), F(b.pengkinian), F(b.hari.reduce((a, x) => a + x.daftar.length, 0))]], ["", "n", "n", "n", "n"]),
      h("h3", {teks: "B. Lampiran Laporan Menonjol"}),
      ...b.hari.map(x => h("div", {class: "dk-hari"}, h("h4", {teks: `${D.tglIndo(x.tgl)}: ${F(x.daftar.length)} menonjol`}), ...daftarMenonjol(x.daftar))),
      h("div", {class: "dk-ttd"}, ["Tim yang menyerahkan", "Tim penerima", "Mengetahui, Supervisor"].map(t => h("div", null, h("p", {teks: t}), h("span", {class: "dk-garis"})))),
      catatan("Kejadian baru = kejadian yang entri pertamanya tercatat di hari itu (dicek mundur 7 hari dari awal periode). Pengkinian = kejadian yang sudah tercatat sebelumnya dan diperbarui di hari itu. Tanda tangan diisi manual setelah dicetak."));
    const teksDari = () => { const n = D.nomorSurat(st.pola, st.urut); nomorEl.textContent = "Nomor: " + n; return D.teksBast(b, n, dummy, diambil); };
    return {node, teks: teksDari(), ulang: teksDari};
  }
  function buatShift(entri, dummy, diambil) {
    const s = D.shift(entri, st.tgl);
    const node = h("div", null, kop("LAPORAN PELAKSANAAN SHIFT PIKET", periodeHari(st.tgl), dummy),
      ...s.shift.map(x => h("section", {class: "dk-shift"}, h("h3", {teks: `Shift ${x.no} (${x.jam})`}),
        h("div", {class: "dk-ringkas"}, pil(`${F(x.daftar.length)} kejadian`, "info", "daftar"), pil(`${F(x.baru)} baru`, "ok", "tambah"), pil(`${F(x.pengkinian)} pengkinian`, "tunggu", "kalender"), pil(`${F(x.tuntas)} tuntas`, "ok", "simpan")),
        x.daftar.length ? tabelBatas(["No", "Kejadian", "Wilayah", "Dampak terkini", "Status kejadian", "Tindak lanjut"], x.daftar.map((v, i) => [String(i + 1), jenisPil(v.jenis), D.namaProv(v.prov) + ", " + v.lokasi, v.dampak || "belum dilaporkan",
          pil(v.baru ? "Baru" : "Pengkinian", v.baru ? "ok" : "tunggu", v.baru ? "tambah" : "kalender"), pil(v.tuntas ? "Tuntas" : "Lanjut", v.tuntas ? "ok" : "tunggu", v.tuntas ? "simpan" : "kalender")]), ["n", "", "", "", "n", "n"]) : kosong("Tidak ada laporan masuk di shift ini."))),
      catatan("Jam shift: 07.00 s.d. 15.00, 15.00 s.d. 21.00, 21.00 s.d. 07.00 WIB. Tuntas atau lanjut mengikuti status kejadian saat dokumen dibuat (kejadian ditutup = tuntas), bukan keadaan saat shift berakhir. Personel dan peran piket tidak tercatat di logbook, isi manual setelah dicetak."));
    return {node, teks: D.teksShift(s, dummy, diambil)};
  }
  function buatMingguan(entri, dummy, diambil) {
    const m = D.mingguan(entri, D.akhirDariTgl(st.kamis));
    const ref = m.adaKib;
    const node = h("div", null, kop("REKAPITULASI MINGGUAN BENCANA", `${D.jamTgl(m.dari)} s.d. ${D.jamTgl(m.sampai)}`, dummy),
      h("div", {class: "dk-ringkas"}, pil(`${F(m.total)} kejadian`, "info", "daftar"), pil(`${F(m.baru)} baru, ${F(m.pengkinian)} pengkinian`, "tunggu", "kalender")),
      h("h3", {teks: "A. Jumlah kejadian per jenis"}), m.perJenis.length ? tabel(["Jenis", "Kejadian", "Baru", "Pengkinian"], m.perJenis.map(o => [jenisPil(o.kunci), F(o.total), F(o.baru), F(o.pengkinian)]), ["", "n", "n", "n"]) : kosong("Belum ada kejadian pada periode ini."),
      h("h3", {teks: "B. Jumlah kejadian per provinsi"}), tabel(["Provinsi", "Kejadian", "Baru", "Pengkinian"], m.perProv.map(o => [D.namaProv(o.kunci), F(o.total), F(o.baru), F(o.pengkinian)]), ["", "n", "n", "n"]),
      h("h3", {teks: "C. Luas kebakaran hutan dan lahan per provinsi"}),
      m.luas.length ? tabel(["Provinsi", "Kejadian", "Luas (ha, perkiraan dari entri piket)", "Tanpa data luas"], [...m.luas.map(o => [D.namaProv(o.prov), F(o.kejadian), D.fmt0(o.ha), F(o.tanpaLuas)]), ["Jumlah", F(m.luas.reduce((a, o) => a + o.kejadian, 0)), D.fmt0(m.luasTotal), F(m.luas.reduce((a, o) => a + o.tanpaLuas, 0))]], ["", "n", "n", "n"]) : kosong("Tidak ada kejadian karhutla pada periode ini."),
      h("h3", {teks: "D. Daftar kejadian"}),
      m.semua.length ? tabelBatas(["Rujukan", "Jenis", "Wilayah", "Dampak terkini", ...(ref ? ["KIB"] : [])], m.semua.map(v => [v.ref, jenisPil(v.jenis), D.namaProv(v.prov) + ", " + v.lokasi, v.dampak || "belum dilaporkan", ...(ref ? [v.kib || ""] : [])]), ["n", "", "", "", "n"]) : kosong("Belum ada kejadian."),
      catatan("Minggu berjalan Kamis 18.00 WIB s.d. Kamis berikutnya 18.00 WIB. Luas karhutla = perkiraan dari entri piket: luas pada entri terakhir tiap kejadian dalam periode, dijumlahkan per provinsi dan dibulatkan ke hektare; bukan hitungan selisih harian metode Sipongi. Rujukan = 6 karakter awal nomor kejadian di logbook" + (ref ? "." : "; kolom KIB tampil bila logbook memuatnya.")));
    return {node, teks: D.teksMingguan(m, dummy, diambil)};
  }
  const BUAT = {bast: buatBast, menonjol: buatMenonjol, shift: buatShift, mingguan: buatMingguan};

  /* hari yang harus diambil: periode dokumen + 7 hari mundur (untuk menilai baru vs pengkinian) */
  function hariDiperlukan() {
    const mundur = D.LOOKBACK_HARI;
    if (st.tab === "mingguan") { const a = D.akhirDariTgl(st.kamis), p = D.periodeMinggu(a); return D.hariUntuk(p.dari - mundur * 864e5, p.sampai); }
    const awal = st.tab === "bast" ? D.tambahHari(st.tgl, -(st.n - 1)) : st.tgl;
    return D.hariUntuk(D.awalHari(D.tambahHari(awal, -mundur)), D.awalHari(st.tgl) + 864e5);
  }

  /* ---------- kerangka layar ---------- */
  const el = {};
  function kerangka() {
    el.tab = h("div", {class: "dk-seg", role: "tablist", "aria-label": "Jenis dokumen"}, TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", "data-tab": k, "aria-selected": String(k === st.tab), class: "dk-tab"}, ikon(ik), t)));
    el.kontrol = h("div", {class: "bn-baris dk-kontrol"});
    el.pesan = h("p", {class: "bn-pesan", role: "status"});
    el.kertas = h("article", {class: "dk-kertas"});
    el.pilihan = h("div", {class: "dk-tak-cetak"});
    el.wa = h("textarea", {class: "dk-wa", readonly: true, rows: "10", "aria-label": "Teks WA"});
    el.cetak = h("button", {type: "button", class: "bn-tombol"}, ikon("simpan"), "Cetak atau PDF");
    el.salin = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("daftar"), "Salin teks WA");
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Dokumen Pusdalops"}), h("div", {class: "bn-aksi"}, h("a", {class: "bn-tombol sekunder", href: "/bnpb/logbook"}, ikon("daftar"), "Kembali ke logbook"))),
      h("section", {class: "bn-blok dk-tak-cetak"}, el.tab, el.kontrol, el.pilihan, h("div", {class: "dk-aksi"}, el.cetak, el.salin), el.pesan),
      el.kertas, h("section", {class: "bn-blok dk-tak-cetak"}, h("h2", {teks: "Teks WA"}), el.wa));
    el.tab.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && b.dataset.tab !== st.tab) { st.tab = b.dataset.tab; tandaiTab(); gambarKontrol(); segarkan(); } });
    el.cetak.addEventListener("click", cetak);
    el.salin.addEventListener("click", salin);
    el.pilihan.addEventListener("change", e => { const c = e.target.closest("input[data-id]"); if (!c) return; c.checked ? st.manual.add(c.dataset.id) : st.manual.delete(c.dataset.id); clearTimeout(tundaManual); tundaManual = setTimeout(() => segarkan(true), 300); });
    el.pilihan.addEventListener("toggle", e => { if (e.target.tagName === "DETAILS") st.pilihBuka = e.target.open; }, true);
    el.kontrol.addEventListener("change", ubahKontrol);
  }
  const tandaiTab = () => el.tab.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === st.tab)));
  const isian = (nama, judul, att) => { const i = h("input", {name: nama, autocomplete: "off", ...att}); return h("label", {class: "bn-isian"}, judul, i); };
  function gambarKontrol() {
    const k = [];
    if (st.tab === "mingguan") k.push(isian("kamis", "Kamis penutup periode (18.00 WIB)", {type: "date", value: st.kamis, max: D.tglISO(kini)}));
    else k.push(isian("tgl", st.tab === "bast" ? "Hari laporan terakhir" : "Hari laporan (mulai 07.00 WIB)", {type: "date", value: st.tgl, max: D.tglISO(kini)}));
    if (st.tab === "bast") {
      const s = h("select", {name: "n"}, [1, 2, 3, 4, 5, 6, 7].map(x => h("option", {value: String(x), selected: x === st.n, teks: `${x} hari`})));
      k.push(h("label", {class: "bn-isian"}, "Lama periode", s), isian("pola", "Pola nomor surat (N = digit urut)", {value: st.pola, maxlength: "60"}), isian("urut", "Nomor urut (diisi manual)", {value: st.urut, inputmode: "numeric", maxlength: "6", placeholder: "kosong = garis isian"}));
    }
    el.kontrol.replaceChildren(...k);
  }
  function ubahKontrol(e) {
    const n = e.target.name, v = e.target.value;
    if (n === "tgl" && /^\d{4}-\d\d-\d\d$/.test(v)) st.tgl = v;
    else if (n === "kamis" && /^\d{4}-\d\d-\d\d$/.test(v)) { if (D.akhirDariTgl(v) == null) { st.kamis = D.tglISO(D.akhirKamis(D.awalHari(v) + 12 * 36e5)); e.target.value = st.kamis; } else st.kamis = v; }
    else if (n === "n") st.n = Math.min(7, Math.max(1, Number(v) || 3));
    else if (n === "pola" || n === "urut") {
      if (n === "pola") st.pola = v.slice(0, 60); else { st.urut = v.replace(/\D/g, "").slice(0, 6); e.target.value = st.urut; }
      simpanLokal(); if (ulangNomor) { teksWA = ulangNomor(); el.wa.value = teksWA; } return;   // hanya nomor dan teks WA, kertas tidak dibangun ulang
    }
    segarkan();
  }

  /* chrome urgent di atas; ambil data + render berat menyusul sesudah satu frame tercat */
  const sesudahFrame = f => { let jalan = false; const go = () => { if (!jalan) { jalan = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  function segarkan(tanpaMuat) {
    const no = ++nomor;
    if (!tanpaMuat) { el.pesan.className = "bn-pesan"; el.pesan.textContent = "Memuat entri logbook…"; el.kertas.setAttribute("aria-busy", "true"); }
    sesudahFrame(async () => {
      const d = await ambilHari(hariDiperlukan()); if (no !== nomor) return;
      el.kertas.removeAttribute("aria-busy");
      if (d.galat === 401 || d.galat === 403) return masuk(d.galat);
      if (d.galat === 503) { el.pesan.className = "bn-pesan galat"; el.pesan.textContent = "Data logbook belum tersedia. Hubungi admin."; el.kertas.replaceChildren(); return; }
      if (d.galat != null && !d.entri.length) { el.pesan.className = "bn-pesan galat"; el.pesan.textContent = d.galat === 0 ? "Tidak ada sinyal. Coba lagi." : `Logbook belum bisa dimuat (${d.galat}).`; return; }
      const dummy = D.adaDummy(d.entri), r = BUAT[st.tab](d.entri, dummy, d.diambil || Date.now());
      r.node.append(h("p", {class: "dk-p", teks: D.sumber(d.diambil || Date.now())}));
      ulangNomor = r.ulang || null; teksWA = r.teks;
      el.kertas.replaceChildren(r.node);
      if (r.pilih) { if (st.pilihBuka) r.pilih.setAttribute("open", ""); el.pilihan.replaceChildren(r.pilih); } else el.pilihan.replaceChildren();
      sesudahFrame(() => { if (no === nomor) el.wa.value = teksWA; });   // teks WA menyusul sesudah kertas tercat
      const info = []; if (dummy) info.push("Memuat data dummy, ditandai di dokumen."); if (d.terpotong) info.push("Sebagian entri terpotong batas 1.000 per hari, angka bisa kurang."); if (d.galat != null) info.push(`Sebagian hari gagal dimuat (${d.galat}), angka bisa kurang.`);
      el.pesan.className = "bn-pesan" + (info.length ? " galat" : " ok"); el.pesan.textContent = info.join(" ") || `Pratinjau siap, ${F(d.entri.length)} entri dibaca.`;
    });
  }
  function masuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}), h("p", {class: "dk-p", teks: s === 403 ? "Akunmu belum berhak membuka dokumen Pusdalops. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan." : "Dokumen Pusdalops hanya untuk staf. Masuk dulu."}), h("a", {class: "bn-tombol", href: "/admin/pantau", teks: "Masuk staf"})));
  }
  const sibuk = () => el.kertas.hasAttribute("aria-busy");
  function cetak() {
    if (sibuk()) return;
    el.pesan.className = "bn-pesan"; el.pesan.textContent = "Menyiapkan cetak…";
    sesudahFrame(() => { el.kertas.querySelectorAll(".dk-lagi").forEach(b => b.click()); window.print(); el.pesan.textContent = ""; });
  }
  function salin() {
    if (sibuk() || !teksWA) return;
    el.pesan.className = "bn-pesan"; el.pesan.textContent = "Menyalin…";
    sesudahFrame(async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(teksWA); ok = true; } catch (e) { el.wa.value = teksWA; el.wa.focus(); el.wa.select(); try { ok = document.execCommand("copy"); } catch (e2) {} }
      el.pesan.className = "bn-pesan " + (ok ? "ok" : "galat"); el.pesan.textContent = ok ? "Teks WA disalin." : "Penyalinan diblokir peramban. Teks sudah terpilih di kotak Teks WA, tekan salin sendiri.";
    });
  }

  kerangka(); gambarKontrol(); segarkan();
})();
