/* Seksi Dampak peringatan di Pantau Dalops (/bnpb/dalops, DP-15; data/kajian-bnpb/dampak-peringatan/).
   Peta status dan poligon BMKG lewat modul bersama public/inti/dampak_peringatan.js (satu salinan, tidak ada gambar ulang di sini),
   tabel per desa untuk satu kab (staf: GET /api/dampak-peringatan/desa?kab=), unduh CSV. Tanpa data laporan warga.
   Angka dibulatkan oleh DampakPeringatan.bulatJiwa; kosong tertulis "belum terukur", bukan 0. Teks data lewat textContent.
   Tabel dirender bertahap (100 baris per giliran) supaya klik tidak membekukan layar. Fungsi murni diuji tests/bnpb/dalops_dampak.test.mjs. */
(g => {
  "use strict";
  const BELUM = "belum terukur";
  const KOLOM = ["Desa", "Penduduk (Dukcapil)", "Kelas tinggi", "Kelas sedang", "Kelas rendah", "Tak terliput", "Balita", "Lansia", "Laki-laki (perkiraan)", "Perempuan (perkiraan)", "Fasilitas menurut sumber"];
  const NAMA_SUMBER = {sekolah_dapodik: "Sekolah (Dapodik)", faskes_osm: "Fasilitas kesehatan (OpenStreetMap)"};

  /* ---------- fungsi murni ---------- */
  /* fasilitas desa: {sumber: [{nama}|"nama"]}; sumber tanpa data = belum terukur, bukan kosong */
  function teksFasilitas(f) {
    if (!f || typeof f !== "object") return BELUM;
    const bagian = Object.entries(f).map(([s, v]) => {
      const lbl = NAMA_SUMBER[s] || s.replace(/_/g, " ");
      if (!Array.isArray(v)) return `${lbl}: ${BELUM}`;
      const nama = v.map(x => String(x?.nama ?? x ?? "").trim()).filter(Boolean);
      return `${lbl}: ${nama.length ? nama.join(", ") : "tidak ada yang terpeta"}`;
    });
    return bagian.length ? bagian.join("; ") : BELUM;
  }

  /* satu baris tabel (teks siap tampil dan siap CSV: sama persis, N6); angka dari berkas sudah bulat, dibulatkan lagi dua angka bermakna */
  function barisDesa(d, B) {
    const k = d?.jiwa_kelas, jk = d?.jiwa_jk;
    return [d?.nama || BELUM, B(d?.jiwa_dukcapil), B(k?.tinggi), B(k?.sedang), B(k?.rendah), B(k?.tak_terliput), B(d?.balita), B(d?.lansia), B(jk?.laki), B(jk?.perempuan), teksFasilitas(d?.fasilitas)];
  }

  /* urut penduduk terbesar dulu; tanpa angka di akhir */
  const urutDesa = daftar => Object.values(daftar || {}).sort((a, b) => (b?.jiwa_dukcapil ?? -1) - (a?.jiwa_dukcapil ?? -1));

  const sel = t => `"${String(t).replace(/"/g, '""')}"`;
  const csv = baris => "﻿" + [KOLOM, ...baris].map(r => r.map(sel).join(";")).join("\r\n");

  /* kab yang punya entri untuk bahaya itu di ringkas.json (kab[k4].bahaya[KODE]); karhutla tanpa entri desa */
  const daftarKab = (ringkas, kode) => Object.entries(ringkas?.kab || {})
    .filter(([k, v]) => /^\d{4}$/.test(k) && v?.bahaya?.[kode.toUpperCase()])
    .map(([k, v]) => ({k, nama: v.nama || k})).sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  /* ---------- tampilan ---------- */
  const tunda = () => g.scheduler?.yield ? g.scheduler.yield() : new Promise(r => setTimeout(r, 0));
  const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);

  async function muat(p, U) {
    const {h, ikon, bagian, kosong} = U, DP = g.DampakPeringatan;
    if (!DP) return p.replaceChildren(h("div", {class: "bn-blok"}, kosong("peringatan", "Modul peta belum termuat. Muat ulang halaman ini.")));
    const B = DP.bulatJiwa;
    let kode = "bnj", pas = null, ringkas = null, status = null, gen = 0, baris = [];
    const mem = h("select", {id: "dd-bhy", "aria-label": "Jenis bahaya"}, ...Object.entries(DP.BAHAYA).map(([k, n]) => h("option", {value: k, teks: n})));
    const memKab = h("select", {id: "dd-kab", "aria-label": "Kabupaten atau kota"});
    const unduh = h("button", {type: "button", class: "dd-ikon", disabled: true, title: "Unduh CSV tabel desa", "aria-label": "Unduh CSV tabel desa"}, ikon("unduh"));
    const wadahPeta = h("div", {class: "dd-peta"}), kartuKab = h("div", {class: "dd-kartu", hidden: true});
    const pilHip = h("span", {class: "dl-tag", hidden: true}, ikon("info"), "Hipotesis: status belum lulus uji balik");
    const catat = h("p", {class: "dl-redup", teks: "Penduduk di area peringatan BMKG adalah perkiraan, tidak dijumlah dengan jiwa total kab/kota dan tidak sama dengan jiwa terpapar aturan dampak."});
    const tbody = h("tbody"), tabel = h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, h("table", {class: "ad-tabel dl-tabel dd-tabel"},
      h("thead", null, h("tr", null, KOLOM.map(k => h("th", {scope: "col", teks: k})))), tbody));
    const infoDesa = h("p", {class: "dl-redup", role: "status"});

    const kartuPeta = bagian("dampak-peta", "pin", "Peta status prakiraan", "",
      h("div", {class: "dd-bar"}, h("label", {for: "dd-bhy"}, "Bahaya"), mem, pilHip), wadahPeta, kartuKab, catat);
    const kartuTabel = bagian("dampak-desa", "daftar", "Penduduk dan fasilitas per desa", "",
      h("div", {class: "dd-bar"}, h("label", {for: "dd-kab"}, "Kabupaten/kota"), memKab, unduh), infoDesa, tabel);
    const jaga = h("div", {class: "dd-kolom"}, kartuPeta, kartuTabel);
    p.replaceChildren(jaga);

    /* peta: satu pasang per bahaya, dimatikan saat ganti (modul bersama menggambar ulang sendiri) */
    const peta = new g.maplibregl.Map({container: wadahPeta, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]],
      fitBoundsOptions: {padding: 16}, minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new g.maplibregl.NavigationControl({showCompass: false}), "top-right");
    wadahPeta._peta = peta;   // pilihTab di dalops.js mengukur ulang peta yang lahir di panel tersembunyi
    const pasangPeta = () => {
      pas?.matikan(); pas = null; kartuKab.hidden = true;
      const mulai = async () => { pas = DP.pasang(peta, {bahaya: kode, kartu: kartuKab}); const ok = await pas.nyalakan();
        if (!ok) { kartuKab.replaceChildren(h("p", {class: "dl-redup", teks: "Status prakiraan " + BELUM + ": umpan belum masuk atau sudah basi."})); kartuKab.hidden = false; } };
      peta.loaded() ? mulai() : peta.once("load", mulai);
    };

    async function isiTabel(k4) {
      const n = ++gen; tbody.replaceChildren(); baris = []; unduh.disabled = true; infoDesa.textContent = "";
      if (!k4) { infoDesa.textContent = kode === "kht" ? "Karhutla tidak punya tabel per desa di sini." : "Belum ada kab/kota dengan peringatan untuk bahaya ini."; return; }
      infoDesa.textContent = "Memuat desa…";
      let r; try { r = await fetch("/api/dampak-peringatan/desa?kab=" + k4, {credentials: "same-origin"}); } catch { return void (infoDesa.textContent = "Tidak ada sinyal. Pilih kab/kota lagi."); }
      if (n !== gen) return;
      if (r.status === 401 || r.status === 403) return void (infoDesa.textContent = "Tabel per desa hanya untuk akun staf yang berhak.");
      const d = r.ok ? await r.json().catch(() => null) : null;
      if (!d || d.belum_terukur) return void (infoDesa.textContent = "Desa " + BELUM + ": " + (d?.alasan || "keluaran kab ini belum terbit") + ".");
      const daftar = urutDesa(d.bahaya?.[kode.toUpperCase()]);
      if (!daftar.length) return void (infoDesa.textContent = "Tidak ada desa di area peringatan untuk bahaya ini.");
      infoDesa.textContent = `${daftar.length.toLocaleString("id-ID")} desa di area peringatan, urut penduduk terbesar.`;
      baris = daftar.map(x => barisDesa(x, B)); unduh.disabled = false;
      for (let i = 0; i < baris.length; i += 100) {   // bertahap: klik tidak membekukan layar
        if (n !== gen) return;
        const f = document.createDocumentFragment();
        for (const b of baris.slice(i, i + 100)) f.append(h("tr", null, b.map((t, j) => h("td", {class: j && j < 10 ? "n" : null, "data-label": KOLOM[j], teks: t}))));
        tbody.append(f); await tunda();
      }
    }

    function isiKab() {
      const d = daftarKab(ringkas, kode);
      memKab.replaceChildren(...d.map(x => h("option", {value: x.k, teks: x.nama})));
      memKab.disabled = !d.length; isiTabel(d[0]?.k ?? null);
    }
    const segarHip = () => { pilHip.hidden = !status || DP.bolehTampil(null, status, kode); };

    mem.addEventListener("change", () => { kode = mem.value; segarHip(); pasangPeta(); isiKab(); });
    memKab.addEventListener("change", () => isiTabel(memKab.value));
    unduh.addEventListener("click", () => {
      const a = h("a", {href: URL.createObjectURL(new Blob([csv(baris)], {type: "text/csv;charset=utf-8"})), download: `dampak-peringatan-${kode}-${memKab.value}.csv`});
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });

    [ringkas, status] = await Promise.all([ambil("/api/dampak-peringatan/ringkas"), ambil("/api/dampak-peringatan/status")]);
    if (!ringkas || ringkas.belum_terukur) infoDesa.textContent = "Ringkasan peringatan " + BELUM + ".";
    segarHip(); pasangPeta(); if (ringkas && !ringkas.belum_terukur) isiKab();
  }

  g.DalopsDampak = {muat, teksFasilitas, barisDesa, urutDesa, csv, daftarKab, KOLOM};
})(globalThis);
