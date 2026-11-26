"use strict";
/* WIL-1 Meja Wilayah (tiket RU-079; DESAIN-TEKNIS 6.14; DESIGN-SYSTEM 7.10). Data dari unit/meja_wilayah.json (wil1.py): antrean per direktorat dan tipe.
   Layar tidak menghitung antrean: hanya memilih direktorat dan tipe, menggabungkan "Semua", dan mengurutkan dengan aturan yang sama dengan wil1.py
   (tenggat terdekat, pengungsi terbanyak, kode wilayah; dijaga tests/bnpb/unit_wil1.test.mjs). Tipe yang belum bisa dihitung tampil "belum ada data" beserta alasannya.
   Pemilih direktorat dan tipe adalah deretan .ad-tabs penuh lebar; ganti pilihan hanya menyusun ulang satu kartu (tanpa ambil data).
   Pakai: UnitWil1.urut(butir) -> butir urut; UnitWil1.pilih(data, dit, tipe) -> {butir, tersedia, alasan}; UnitTampil["WIL-1"](berkas) -> [elemen]. */
(() => {
  const TIPE = {1: "Belum didampingi", 2: "Surat keputusan hampir habis", 3: "Saran tanpa surat keputusan", 4: "Pertanggungjawaban Dana Siap Pakai", 5: "Besok berisiko"};
  const WIB = "Asia/Jakarta";
  const tgl = iso => /^\d{4}-\d{2}-\d{2}/.test(iso || "") ? new Date(iso.slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}).replace(/\./g, "") : null;

  /* sama dengan wil1.py urut_kunci */
  function urut(butir) {
    const k = b => [b.tenggat == null, b.tenggat || "", -(b.jiwa || 0), b.kab_kode || b.prov || "", b.kab || ""];
    return [...butir].sort((a, b) => { const x = k(a), y = k(b);
      for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
      return 0; });
  }

  function pilih(data, dit, tipe) {
    const t = data?.tipe?.[String(tipe)] || {tersedia: false, alasan: "tipe tidak dikenal"};
    const dits = Object.keys(data?.direktorat || {}), pakai = dit === "semua" ? dits : dits.filter(d => d === dit);
    const butir = pakai.flatMap(d => (data.direktorat[d].butir || []).filter(b => b.tipe === Number(tipe)));
    return {tersedia: !!t.tersedia, alasan: t.alasan || null, butir: urut(butir)};
  }

  function skema(data, dit, tipe) {
    const p = pilih(data, dit, tipe);
    const sumber = [...new Set(p.butir.flatMap(b => b.sumber || []))];
    return {id: "wil1-antrean", sistem: "WIL-1", pil: "Meja Wilayah", ikon: "orang", judul: TIPE[tipe] || "Antrean", label: ["hitungan_kita"],
      sumber: sumber.length ? sumber : ["status_darurat", "laphar_riwayat", "saran_status", "prediksi"], rumus: "antrean menurut aturan tipe di wil1.py; urutan: tenggat terdekat, pengungsi terbanyak, kode wilayah", aturan: [], asumsi: [],
      angka: [{k: "butir", label: "Butir di antrean ini", nilai: p.tersedia ? p.butir.length : null, title: p.tersedia ? "butir yang memenuhi syarat tipe ini" : (p.alasan || "belum ada data")}],
      kolom: p.tersedia && p.butir.length ? [{k: "no", label: "No", angka: true}, {k: "kab", label: "Kab/kota"}, {k: "jenis", label: "Kejadian"}, {k: "alasan", label: "Alasan", title: "satu kalimat; sumber ada di tooltip angka"},
        {k: "tenggat", label: "Tenggat", title: "tanggal batas menurut aturan tipe; kosong bila tidak ada"}] : [],
      baris: p.tersedia ? p.butir.map((b, i) => ({no: i + 1, kab: b.kab || "Tingkat provinsi", jenis: b.jenis || null, alasan: b.alasan, tenggat: tgl(b.tenggat)})) : []};
  }

  function tampil(berkas) {
    const R = window.UnitRapor, d = berkas.data;
    const h = (tag, a, ...anak) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
      e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
    const per = {dibuat: berkas.dibuat, basi_jam: berkas.basi_jam};
    const ringkas = (berkas.kartu || []).filter(k => k.sistem === "WIL-1").map(k => R.render(k, per));
    if (!d || !d.direktorat) return ringkas;
    const ditId = ["wil1", "wil2", "wil3"].filter(x => d.direktorat[x]);
    const dpil = [...ditId.map(x => [x, d.direktorat[x].nama]), ["semua", "Semua"]];
    const tpil = Object.keys(TIPE).map(Number);
    let dit = "semua", tipe = tpil.find(i => d.tipe?.[i]?.tersedia && pilih(d, "semua", i).butir.length) || 1;
    const wadah = h("div", {class: "un-wil-antre"});
    const tabs = (label, daftar, aktif, kunci) => h("div", {class: "ad-tabs un-tabs", role: "group", "aria-label": label},
      ...daftar.map(([id, teks]) => h("button", {type: "button", ["data-" + kunci]: id, "aria-pressed": String(id === aktif), teks})));
    const tabD = tabs("Direktorat", dpil, dit, "dit");
    const tabT = tabs("Tipe antrean", tpil.map(i => [i, `${i} ${TIPE[i]}`]), tipe, "tipe");
    const gambar = () => {
      for (const b of tabD.children) b.setAttribute("aria-pressed", String(b.dataset.dit === dit));
      for (const b of tabT.children) b.setAttribute("aria-pressed", String(Number(b.dataset.tipe) === tipe));
      const p = pilih(d, dit, tipe);
      wadah.replaceChildren(R.render(skema(d, dit, tipe), per), ...(p.tersedia ? [] : [h("p", {class: "ad-kosong", role: "status", teks: "Belum ada data: " + (p.alasan || "sumber belum tersedia") + "."})]));
    };
    tabD.addEventListener("click", e => { const b = e.target.closest("[data-dit]"); if (b && b.dataset.dit !== dit) { dit = b.dataset.dit; gambar(); } });
    tabT.addEventListener("click", e => { const b = e.target.closest("[data-tipe]"); if (b && Number(b.dataset.tipe) !== tipe) { tipe = Number(b.dataset.tipe); gambar(); } });
    gambar();
    return [...ringkas, h("div", {class: "un-wil-pemilih"}, tabD, tabT), wadah];
  }

  const api = {urut, pilih, skema, TIPE};
  (typeof window !== "undefined" ? window : globalThis).UnitWil1 = api;
  if (typeof window !== "undefined" && window.UnitRapor) (window.UnitTampil ||= {})["WIL-1"] = tampil;
})();
