/* Pembuat dokumen lintas bencana (PB-24; F-8 sampai F-10): sitrep, renops, laporan KIB, penunjuk renkon. Skrip klasik tanpa inline (CSP), global window.PbDokumen;
   PbDokumen.pasang(host, opsi) siap dipasang di /bnpb/sitrep. Rute: POST /api/pb/dokumen/rakit, POST /api/pb/dokumen/bekukan, GET /api/pb/dokumen, GET /api/pb/dokumen/berkas (kontrak: src/pb_dokumen.js).
   Angka datang dari draf mesin dan hanya ditampilkan; staf hanya menulis ringkasan dan kebijakan. Bagian tanpa data tampil apa adanya ("belum tersedia"), tidak pernah 0 atau "aman".
   Teks selalu lewat textContent. Chrome kontrol urgent (atribut saja); pratinjau dan daftar digambar di rAF sesudah data tiba (INP). Unduh hanya JSON (PDF belum ada); cetak lewat @media print. */
(g => {
  "use strict";
  const JENIS = {sitrep: "Laporan situasi", renops: "Rencana operasi", laporan_kib: "Laporan kejadian", renkon_peta: "Penunjuk renkon"};
  const MAKS_KALIMAT = 1500, MAKS_BARIS = 100;
  const GALAT = {401: "Masuk dulu untuk menyusun dokumen.", 403: "Akun ini tidak berhak atas dokumen di wilayah ini.", 404: "Bencana atau jenis dokumen ini belum menyala, atau dokumennya tidak ditemukan.", 409: "Dokumen sudah berubah atau bentrok; muat ulang daftar lalu coba lagi.", 413: "Dokumen terlalu besar.", 422: "Isi dokumen memuat nomor telepon atau NIK; dokumen tidak boleh memuat data pribadi.", 429: "Terlalu cepat; tunggu beberapa saat."};
  const IK = {isi: "M12 5v14|M5 12h14", pratinjau: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z|M12 9a3 3 0 1 0 0 .01", daftar: "M4 6h16|M4 12h16|M4 18h10", beku: "M6 11V8a6 6 0 0 1 12 0v3|M5 11h14v10H5z", unduh: "M12 4v11|M7 11l5 5 5-5|M5 20h14", cetak: "M7 9V3h10v6|M7 17H4v-7h16v7h-3|M7 14h10v7H7z", batal: "M6 6l12 12|M18 6 6 18"};

  /* ---- inti murni (diuji node) ---- */
  const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);   // WIB
  const koma = n => { if (n === null || n === undefined || n === "" || !Number.isFinite(+n)) return "belum tersedia"; const d = Math.min(10, (String(+n).split(".")[1] || "").replace(/e.*/, "").length); return new Intl.NumberFormat("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}).format(n); };   // desimal mengikuti angka dari mesin
  /* registri = bencana.json {bencana:[{id,nama,kemampuan:{dokumen:[...]}}]}; hanya yang kemampuan.dokumen-nya menyala */
  const aktif = reg => (reg?.bencana ?? []).filter(b => (b.kemampuan?.dokumen ?? []).length);
  const bencanaUntuk = (reg, jenis) => aktif(reg).filter(b => b.kemampuan.dokumen.includes(jenis));
  const jenisUntuk = (reg, bencana) => Object.keys(JENIS).filter(j => (reg?.bencana ?? []).find(b => b.id === bencana)?.kemampuan?.dokumen?.includes(j));
  const badanRakit = f => {
    const o = {jenis: f.jenis, bencana: f.bencana, prov: f.prov, periode: String(f.periode ?? "").trim()};
    if (String(f.kab ?? "").trim()) o.kab = String(f.kab).trim();
    if (String(f.kib ?? "").trim()) o.kib = String(f.kib).trim();
    return o;
  };
  const cekRakit = o => !o.jenis ? "Pilih jenis dokumen." : !o.bencana ? "Pilih bencana." : !o.prov ? "Pilih provinsi." : !/^\d{4}(-\d{2}(-\d{2})?|-W\d{2})?$/.test(o.periode) ? "Periode berbentuk 2026, 2026-11, 2026-11-15, atau 2026-W46."
    : o.jenis === "laporan_kib" && !/^\d{16}$/.test(o.kib ?? "") ? "Laporan kejadian butuh KIB 16 digit." : null;
  const badanBekukan = (id, k) => { const kalimat = {}; for (const n of ["ringkasan", "kebijakan"]) { const t = String(k?.[n] ?? "").trim(); if (t) kalimat[n] = t; } return {id, kalimat}; };
  const cekKalimat = k => { for (const n of ["ringkasan", "kebijakan"]) if (String(k?.[n] ?? "").length > MAKS_KALIMAT) return "Kalimat " + n + " maksimal " + MAKS_KALIMAT + " karakter."; return null; };
  /* satu baris angka: nilai null tampil "belum tersedia", tidak pernah 0 */
  const barisAngka = a => [a.nama.replace(/_/g, " "), a.nilai === null || a.nilai === undefined ? "belum tersedia" : koma(a.nilai) + (a.satuan ? " " + a.satuan : ""), a.sumber || "belum tersedia", a.waktu || "belum tersedia"];
  const unduhUrl = (id, fmt = "json") => "/api/pb/dokumen/berkas?" + new URLSearchParams({id, fmt});
  const galatRamah = (status, j) => (j && j.galat) || GALAT[status] || "Gagal (kode " + status + ").";
  const label = j => JENIS[j] || j;

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const ikon = k => { const s = document.createElementNS(NS, "svg"); for (const [a, v] of [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"]]) s.setAttribute(a, v);
    for (const d of IK[k].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const tombol = (k, teks, kelas) => { const b = el("button", kelas || ""); b.type = "button"; b.append(ikon(k), el("span", null, teks)); return b; };
  const kartu = (nama, ik, isi) => { const a = el("article", "ex ex-std"), h = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3"); h3.append(ikon(ik), document.createTextNode(nama)); jd.append(h3); h.append(jd);
    const bd = el("div", "ex-bd"); bd.append(...isi); a.append(h, bd); return a; };
  const pilihan = (nilai, daftar) => { const s = el("select"); for (const [v, t] of daftar) { const o = el("option", null, t); o.value = v; s.append(o); } s.value = nilai; return s; };
  const bidang = (teks, kontrol) => { const l = el("label", "pb-f"); l.append(el("span", null, teks), kontrol); return l; };
  const masukan = (ket, maks) => { const i = el("input"); i.type = "text"; if (ket) i.placeholder = ket; if (maks) i.maxLength = maks; i.autocomplete = "off"; return i; };
  const tabel = (kepala, baris) => { const t = el("table"), th = el("thead"), tr = el("tr"); for (const k of kepala) tr.append(el("th", null, k)); th.append(tr); t.append(th);
    const tb = el("tbody"); for (const b of baris) { const r = el("tr"); b.forEach((c, i) => r.append(c instanceof Node ? c : el("td", i === 0 ? "ops-kiri" : null, c))); tb.append(r); } t.append(tb);
    const w = el("div", "tw ops-tw ex-tabel"); w.append(t); return w; };

  /* pasang(host, {registri?, prov?, provDaftar?: [[kode,nama]], bencana?, ambil?}) -> {muat, tutup} */
  function pasang(host, o = {}) {
    const ambil = o.ambil || (g.fetch ? g.fetch.bind(g) : null);
    const S = {tutup: false, reg: o.registri || null, draf: null, daftar: [], batas: MAKS_BARIS, sibuk: 0};
    const provDaftar = o.provDaftar || Object.entries(g.S?.meta?.provinsi || {});
    const api = async (jalur, opsi) => { const r = await ambil(jalur, {credentials: "same-origin", ...opsi}); let j = null; try { j = await r.json(); } catch (e) {} return {ok: r.ok, status: r.status, j}; };
    const kirim = (jalur, badan) => api(jalur, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(badan)});
    const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);

    /* kartu 1: susun */
    const selJenis = pilihan("", [["", "Pilih jenis"]]), selBen = pilihan("", [["", "Pilih bencana"]]), selProv = pilihan(o.prov || "", [["", "Pilih provinsi"], ...provDaftar]);
    const fPer = masukan("2026-11-15", 10), fKab = masukan("4 digit (opsional)", 4), fKib = masukan("16 digit (laporan kejadian)", 16);
    fPer.value = hariIni(); fKab.inputMode = fKib.inputMode = "numeric";
    const rakitB = tombol("isi", "Rakit draf", "pb-utama"), pesan = el("p", "pb-pesan"); pesan.setAttribute("role", "status");
    const grid = el("div", "pb-form"); grid.append(bidang("Jenis dokumen", selJenis), bidang("Bencana", selBen), bidang("Provinsi", selProv), bidang("Periode", fPer), bidang("Kab/kota (kode)", fKab), bidang("KIB", fKib));
    const aksi = el("div", "pb-aksi"); aksi.append(rakitB);
    const kartuSusun = kartu("Susun dokumen", "isi", [grid, aksi, pesan]);
    /* kartu 2: pratinjau dan isian staf */
    const prat = el("div", "pbd-cetak"), alat = el("div", "pb-aksi");
    const kartuPrat = kartu("Pratinjau dan isian", "pratinjau", [prat, alat]); kartuPrat.hidden = true;
    /* kartu 3: daftar versi */
    const status = el("p", "pb-status"); status.setAttribute("role", "status"); const wadah = el("div", "pb-tabel");
    const kartuDaftar = kartu("Versi dokumen", "daftar", [status, wadah]);
    host.classList.add("pb-titik"); host.replaceChildren(kartuSusun, kartuPrat, kartuDaftar);

    const isiBen = () => { const ada = selJenis.value ? bencanaUntuk(S.reg, selJenis.value) : aktif(S.reg), lama = selBen.value;
      selBen.replaceChildren(...[["", "Pilih bencana"], ...ada.map(b => [b.id, b.nama || b.id])].map(([v, t]) => { const x = el("option", null, t); x.value = v; return x; })); selBen.value = ada.some(b => b.id === lama) ? lama : (o.bencana || ""); };
    const isiJenis = () => { const lama = selJenis.value; const semua = new Set(aktif(S.reg).flatMap(b => b.kemampuan.dokumen));
      selJenis.replaceChildren(...[["", "Pilih jenis"], ...Object.keys(JENIS).filter(j => semua.has(j)).map(j => [j, label(j)])].map(([v, t]) => { const x = el("option", null, t); x.value = v; return x; })); selJenis.value = semua.has(lama) ? lama : ""; isiBen(); };

    /* pratinjau: angka dari draf apa adanya; staf mengisi hanya ringkasan dan kebijakan */
    function gambarPrat() {
      if (S.tutup) return;
      const d = S.draf; kartuPrat.hidden = !d; if (!d) return;
      const dok = d.dokumen, beku = d.status === "beku", isi = [];
      const kop = el("h4", null, label(dok.jenis) + ", " + dok.bencana + ", provinsi " + dok.prov + (dok.kab ? " kab " + dok.kab : "") + ", periode " + dok.periode + ", versi " + d.versi + (beku ? ", beku" : ", draf"));
      isi.push(kop);
      if (dok.basi) isi.push(el("p", "pb-ket", "Data ringkas sumber sudah basi; angka di bawah bukan keadaan terkini."));
      if (dok.prospektif?.hipotesis) isi.push(el("p", "pb-ket", "Model belum lulus uji balik: tampil sebagai hipotesis."));
      for (const b of dok.bagian) {
        const bag = el("section", "pbd-bag"); bag.append(el("h5", null, b.judul));
        if (b.angka?.length) bag.append(tabel(["Angka", "Nilai", "Sumber", "Waktu"], b.angka.map(barisAngka)));
        if (b.keterangan) bag.append(el("p", "pb-ket", "Belum tersedia: " + b.keterangan));
        if (b.penunjuk) { const a = el("a", null, "Buka renkon di Siklus Bencana"); a.href = b.penunjuk; bag.append(a); }
        if (b.kunci === "ringkasan" || b.kunci === "kebijakan") {
          if (beku) bag.append(el("p", "pbd-kal", b.kalimat_staf || "Tidak diisi."));
          else { const t = el("textarea"); t.rows = 4; t.maxLength = MAKS_KALIMAT; t.dataset.kunci = b.kunci; t.value = b.kalimat_staf || ""; t.setAttribute("aria-label", b.judul); bag.append(t); }
        }
        isi.push(bag);
      }
      prat.replaceChildren(...isi);
      const bB = tombol("beku", "Bekukan versi ini", "pb-utama"), cB = tombol("cetak", "Cetak", "pb-sekunder"); bB.dataset.aksi = "beku"; cB.dataset.aksi = "cetak";
      alat.replaceChildren(...(beku ? [cB] : [bB, cB]));
    }
    const kalimatDariIsian = () => { const k = {}; for (const t of prat.querySelectorAll("textarea[data-kunci]")) k[t.dataset.kunci] = t.value; return k; };

    function gambarDaftar() {
      if (S.tutup) return;
      if (!S.daftar.length) return wadah.replaceChildren(el("p", "ops-kosong", "Belum ada versi dokumen untuk pilihan ini."));
      const baris = S.daftar.slice(0, S.batas).map(x => {
        const a = el("td", "pb-ak"), pil = el("span", "pb-st", x.status === "beku" ? "Beku" : x.status === "draf" ? "Draf" : x.status); pil.style.setProperty("--w", x.status === "beku" ? "#1f8a4c" : "#7a8699");
        if (x.status === "beku") { const u = el("a", "pb-ik"); u.href = unduhUrl(x.id); u.setAttribute("download", ""); u.append(ikon("unduh"), el("span", null, "Unduh JSON")); a.append(u); }
        const st = el("td"); st.append(pil);
        return [label(x.jenis), x.bencana + " " + x.prov + (x.kab ? "-" + x.kab : ""), x.periode, "v" + x.versi, st, a];
      });
      const isi = [tabel(["Jenis", "Wilayah", "Periode", "Versi", "Status", "Aksi"], baris)];
      if (S.daftar.length > S.batas) { const l = tombol("daftar", "Tampilkan lagi (" + (S.daftar.length - S.batas) + " baris)", "pb-sekunder"); l.dataset.lagi = "1"; isi.push(l); }
      wadah.replaceChildren(...isi);
    }
    async function muat() {
      if (S.tutup) return;
      if (!selJenis.value || !selProv.value) { S.daftar = []; status.textContent = "Pilih jenis dokumen dan provinsi untuk melihat versinya."; gambarDaftar(); return; }
      const n = ++S.sibuk; status.textContent = "Memuat...";
      const r = await api("/api/pb/dokumen?" + new URLSearchParams({jenis: selJenis.value, bencana: selBen.value, prov: selProv.value}));
      if (S.tutup || n !== S.sibuk) return;
      if (!r.ok) { S.daftar = []; status.textContent = galatRamah(r.status, r.j); return nanti(gambarDaftar); }
      S.daftar = r.j.tersedia === false ? [] : r.j.dokumen || [];
      status.textContent = r.j.tersedia === false ? "Fitur dokumen belum aktif di server." : ""; nanti(gambarDaftar);
    }

    /* handler hanya ubah atribut/nilai; kerja berat ditunda */
    selJenis.addEventListener("change", () => { isiBen(); muat(); });
    selBen.addEventListener("change", muat); selProv.addEventListener("change", muat);
    wadah.addEventListener("click", e => { if (e.target.closest("[data-lagi]")) { S.batas += MAKS_BARIS; nanti(gambarDaftar); } });
    rakitB.addEventListener("click", async () => {
      const b = badanRakit({jenis: selJenis.value, bencana: selBen.value, prov: selProv.value, periode: fPer.value, kab: fKab.value, kib: fKib.value}), s = cekRakit(b);
      if (s) { pesan.textContent = s; return; }
      rakitB.disabled = true; pesan.textContent = "Merakit...";
      const r = await kirim("/api/pb/dokumen/rakit", b); rakitB.disabled = false;
      if (!r.ok) { pesan.textContent = galatRamah(r.status, r.j); return; }
      S.draf = {id: r.j.id, versi: r.j.versi, status: "draf", dokumen: r.j.dokumen}; pesan.textContent = "Draf versi " + r.j.versi + " dirakit. Isi ringkasan dan kebijakan, lalu bekukan.";
      nanti(gambarPrat); muat();
    });
    alat.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b || !S.draf) return;
      if (b.dataset.aksi === "cetak") return g.print?.();
      if (b.dataset.aksi === "beku") {   // konfirmasi dua langkah, tanpa dialog bawaan
        const ya = tombol("beku", "Ya, bekukan (tidak dapat diubah)", "pb-bahaya"), tdk = tombol("batal", "Batal", "pb-sekunder");
        tdk.addEventListener("click", () => nanti(gambarPrat));
        ya.addEventListener("click", async () => {
          const k = kalimatDariIsian(), s = cekKalimat(k); if (s) { pesan.textContent = s; return; }
          ya.disabled = true; const r = await kirim("/api/pb/dokumen/bekukan", badanBekukan(S.draf.id, k));
          if (!r.ok) { ya.disabled = false; pesan.textContent = galatRamah(r.status, r.j); return; }
          for (const bg of S.draf.dokumen.bagian) if (Object.hasOwn(k, bg.kunci)) bg.kalimat_staf = String(k[bg.kunci]).trim();
          S.draf.status = "beku"; pesan.textContent = "Versi " + r.j.versi + " dibekukan."; nanti(gambarPrat); muat();
        });
        alat.replaceChildren(ya, tdk);
      }
    });

    const mulai = () => { isiJenis(); gambarDaftar(); if (selJenis.value && selProv.value) muat(); else status.textContent = "Pilih jenis dokumen dan provinsi untuk melihat versinya."; };
    if (S.reg) mulai(); else api("/bencana.json").then(r => { if (S.tutup) return; S.reg = r.j; mulai(); });
    return {muat, tutup() { S.tutup = true; host.replaceChildren(); }, _S: S};
  }

  g.PbDokumen = {JENIS, MAKS_KALIMAT, aktif, bencanaUntuk, jenisUntuk, badanRakit, cekRakit, badanBekukan, cekKalimat, barisAngka, unduhUrl, galatRamah, koma, label, pasang};
})(typeof window !== "undefined" ? window : globalThis);
