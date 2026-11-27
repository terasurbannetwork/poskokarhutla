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
      sumber: sumber.length ? sumber : ["status_darurat", "laphar_riwayat", "saran_status", "prediksi"], rumus: "antrean menurut aturan tipe di wil1.py; urutan: tenggat terdekat, pengungsi terbanyak, kode wilayah", aturan: [], asumsi: data?.tipe?.[String(tipe)]?.hipotesis ? ["Asumsi: hipotesis sampai kata kunci lolos uji"] : [],
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


  /* ---------- WIL-2 Pengungsian (tiket RU-099; keputusan pemilik 27 Nov 2026: dihitung di peramban) ----------
     Masukan: isian meja pengungsi dari GET /api/meja/catatan?meja=pengungsi (sesi yang boleh membaca meja itu) dan angka pusat mengungsi_jiwa dari
     laphar_riwayat.json. Aturan K1 sampai K5 hidup di public/inti/jam_aturan.js (kembar scripts/bnpb/unit/neraca.py): fungsi murni di bawah menerimanya
     sebagai argumen J supaya bisa diuji tanpa DOM. Tempat basi (umur data > 2 x pengungsi_mutakhir) tidak dijumlah; tempat < 10 jiwa tidak tampil per tempat;
     selisih > 25% merah; sistem tidak memilih angka yang benar; kosong bukan 0. Tanpa rute, tabel, atau berkas baru. */
  const MIN_TAMPIL = 10;   // tempat di bawah ini tidak tampil per tempat (DT 9.2, riset/3 W2); tetap ikut rekap kab bila segar
  const normKab = s => String(s || "").toLowerCase().replace(/^(kabupaten|kab\.?)\s+/, "").replace(/\s+/g, " ").trim();
  const iso = s => /^\d{4}-\d{2}-\d{2}/.test(s || "") ? s.slice(0, 10) : null;
  const hariKe = (a, b) => Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 864e5);

  /* catatan meja -> {kunci "prov|kab": {prov, kab, tempat[], tidak_sah}}; satu catatan terbaru per tempat; tempat ditutup dan baris dummy tidak ikut */
  function tempatDariCatatan(catatan, tanggal) {
    const per = new Map(), akhir = new Map();
    for (const c of Array.isArray(catatan) ? catatan : []) {
      const d = c?.data || {};
      if (c?.meja !== "pengungsi" || c.dummy) continue;
      const kunci = `${c.prov}|${normKab(c.kab)}`, g = per.get(kunci) || per.set(kunci, {prov: c.prov, kab: c.kab, tempat: [], tidak_sah: 0}).get(kunci);
      const tgl = iso(d.tgl_data), buka = iso(d.tgl_buka), tutup = iso(d.tgl_tutup);
      if (!tgl || !buka || !Number.isInteger(d.jiwa_total) || d.jiwa_total < 0 || !Number.isInteger(d.kk) || d.kk < 0 || (d.kk === 0 && d.jiwa_total > 0) || tgl > tanggal) { g.tidak_sah++; continue; }
      if (tutup && tutup < tanggal) continue;
      const tk = kunci + "|" + String(d.nama_tempat || "").toLowerCase(), lama = akhir.get(tk);
      const t = {id: String(d.nama_tempat || "tanpa nama"), jiwa: d.jiwa_total, kk: d.kk, buka, data_tgl: tgl};
      if (!lama || tgl > lama.t.data_tgl) { if (lama) lama.g.tempat.splice(lama.g.tempat.indexOf(lama.t), 1); g.tempat.push(t); akhir.set(tk, {g, t}); }
    }
    return per;
  }

  /* angka pusat per kab: mengungsi_jiwa terbesar di episode tingkat kab yang mencakup tanggal; tak ada episode atau angka = null (bukan 0) */
  function pusatKab(laphar, prov, kab, tanggal) {
    const n = normKab(kab);
    const v = (laphar?.episode || []).filter(e => e.tingkat === "kab" && String(e.kab || "").startsWith(prov + "|") && normKab(e.kab.split("|")[1]) === n && e.mulai <= tanggal && tanggal <= (e.terakhir || e.mulai))
      .map(e => e.puncak?.mengungsi_jiwa).filter(x => Number.isFinite(x));
    return v.length ? Math.max(...v) : null;
  }

  /* K1 sampai K5 untuk satu kab: rekap tempat segar lewat J.rekap, jiwa daerah = jumlah jiwa tempat yang dijumlah, selisih lewat J.selisih */
  function ringkasKab(J, g, laphar, tanggal) {
    const r = J.rekap(g.tempat, tanggal), idx = new Map(g.tempat.map(t => [t.id, t])), jiwa = r.dijumlah.length ? r.dijumlah.reduce((a, i) => a + idx.get(i).jiwa, 0) : null;
    const pusat = pusatKab(laphar, g.prov, g.kab, tanggal), sel = J.selisih(pusat, jiwa);
    return {prov: g.prov, kab: g.kab, segar: r.dijumlah.length, basi: r.basi.length, tidak_sah: g.tidak_sah, jiwa_daerah: jiwa, jiwa_pusat: pusat, selisih: sel.selisih, merah: sel.merah, kebutuhan: r.jumlah};
  }

  /* baris per tempat (hanya >= 10 jiwa); basi ditandai dan kebutuhannya tidak diisi */
  function barisTempat(J, g, tanggal) {
    const basi = 2 * J.nilai("pengungsi_mutakhir");
    return g.tempat.filter(t => t.jiwa >= MIN_TAMPIL).sort((a, b) => b.jiwa - a.jiwa || (a.id < b.id ? -1 : 1)).map(t => {
      const umur = hariKe(tanggal, t.data_tgl), lewat = umur > basi, k = lewat ? null : J.kebutuhanDasar(t.jiwa, hariKe(tanggal, t.buka), t.kk);
      return {tempat: t.id, jiwa: t.jiwa, kk: t.kk, hari_ke: hariKe(tanggal, t.buka) + 1, umur, status: lewat ? "basi, tidak dijumlah" : "segar",
        beras: k && k.beras_kg, air: k && k.air_bersih_l, jamban: k && k.jamban, hunian: k && k.hunian_m2, sampah: k && k.kantong_sampah, sabun: k && k.sabun_kg};
    });
  }

  const STATUS_SEL = r => r.merah === null ? "belum bisa dibandingkan" : r.merah ? "merah: selisih di atas 25%" : "dalam batas 25%";
  function skemaRekap(baris) {
    return {id: "wil2-selisih", sistem: "WIL-2", pil: "Pengungsian", ikon: "orang", judul: "Pengungsi pusat lawan daerah", label: ["hitungan_kita"], sumber: ["laphar_riwayat", "meja_pengungsi"],
      rumus: "selisih = |pusat - daerah| / maks(pusat, daerah); pusat = puncak mengungsi_jiwa dalam episode laporan harian kab yang mencakup hari ini (bukan angka satu hari), daerah = jumlah isian meja pengungsi tempat yang datanya tidak lebih tua dari 2 hari",
      aturan: [], asumsi: ["Asumsi: ambang selisih 25%"],
      angka: [{k: "kab", label: "Kab/kota berisian", nilai: baris.length, title: "kab/kota yang punya isian meja pengungsi berjalan"},
        {k: "merah", label: "Selisih di atas 25%", nilai: baris.filter(r => r.merah).length, title: "kedua angka tampil dengan sumbernya; sistem tidak memilih mana yang benar"}],
      kolom: [{k: "kab", label: "Kab/kota"}, {k: "segar", label: "Tempat segar", angka: true, title: "tempat dengan data tidak lebih tua dari 2 hari, ikut dijumlah"}, {k: "basi", label: "Tempat basi", angka: true, title: "data lebih tua dari 2 hari, tidak dijumlah"},
        {k: "daerah", label: "Jiwa menurut daerah", angka: true, title: "jumlah isian meja pengungsi; kosong bila tak ada tempat segar"}, {k: "pusat", label: "Jiwa menurut pusat (puncak episode)", angka: true, title: "puncak mengungsi_jiwa dalam episode laporan harian kab yang mencakup hari ini; bukan angka satu hari; kosong bila tak ada episode"},
        {k: "selisih", label: "Selisih (%)", angka: true, desimal: 1}, {k: "status", label: "Status"}],
      baris: baris.map(r => ({kab: r.kab, segar: r.segar, basi: r.basi, daerah: r.jiwa_daerah, pusat: r.jiwa_pusat, selisih: r.selisih == null ? null : r.selisih * 100, status: STATUS_SEL(r)}))};
  }
  function skemaTempat(nama, baris, jumlah) {
    const angka = (k, label, d) => ({k, label, angka: true, ...(d ? {desimal: d} : {}), title: "takaran dari Jam Aturan (Perka 7/2008, Juklak 3/2022); kosong bila data tempat basi"});
    const sum = jumlah ? {tempat: "Jumlah tempat segar, semua ukuran", jiwa: null, kk: null, hari_ke: null, umur: null, status: "", beras: jumlah.beras_kg, air: jumlah.air_bersih_l, jamban: jumlah.jamban, hunian: jumlah.hunian_m2, sampah: jumlah.kantong_sampah, sabun: jumlah.sabun_kg} : null;
    return {id: "wil2-tempat", sistem: "WIL-2", pil: "Pengungsian", ikon: "rumah", judul: "Kebutuhan dasar per tempat", label: ["hitungan_kita"], sumber: ["meja_pengungsi", "jam_aturan"],
      rumus: "kebutuhan = takaran Jam Aturan x jiwa (jamban = jiwa / 20 dibulatkan ke atas; kantong sampah = KK / 3); tempat di bawah 10 jiwa tidak tampil per tempat tetapi ikut jumlah", aturan: [], asumsi: [],
      angka: [{k: "tempat", label: "Tempat tampil", nilai: baris.length, title: "tempat dengan 10 jiwa atau lebih di " + nama}],
      kolom: [{k: "tempat", label: "Tempat"}, {k: "jiwa", label: "Jiwa", angka: true}, {k: "kk", label: "KK", angka: true}, {k: "hari_ke", label: "Hari ke", angka: true}, {k: "umur", label: "Umur data, hari", angka: true}, {k: "status", label: "Status data"},
        angka("beras", "Beras, kg/hari", 1), angka("air", "Air bersih, liter/hari", 1), angka("jamban", "Jamban, unit"), angka("hunian", "Hunian, m2"), angka("sampah", "Kantong sampah, per 3 hari"), angka("sabun", "Sabun mandi, kg/bulan", 1)],
      baris: [...baris, ...(sum ? [sum] : [])]};
  }

  const WIL2 = {normKab, tempatDariCatatan, pusatKab, ringkasKab, barisTempat, skemaRekap, skemaTempat, MIN_TAMPIL};
  (typeof window !== "undefined" ? window : globalThis).UnitWil2 = WIL2;

  async function tampil2(laphar) {
    const R = window.UnitRapor, mu = (tag, a, ...anak) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
      e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
    const tunda = fn => (typeof window.nanti === "function" ? window.nanti(fn) : setTimeout(fn, 0));
    const kosong = t => [R.render({id: "wil2-selisih", sistem: "WIL-2", pil: "Pengungsian", ikon: "orang", judul: "Pengungsi pusat lawan daerah", label: ["hitungan_kita"], sumber: ["meja_pengungsi"], rumus: "selisih = |pusat - daerah| / maks(pusat, daerah)", aturan: [], asumsi: [], angka: [], kolom: [], baris: []}, null)]
      .map(k => { k.querySelector(".ex-bd")?.append(mu("p", {class: "ad-kosong", role: "status", teks: t})); return k; });
    let r; try { r = await fetch("/api/meja/catatan?meja=pengungsi", {credentials: "same-origin", signal: AbortSignal.timeout(9000)}); } catch (e) { r = null; }
    if (r && (r.status === 401 || r.status === 403)) return kosong("Belum ada data: sesimu belum punya hak membaca isian meja pengungsi. Masuk dengan peran yang boleh membacanya.");
    let m = null; if (r?.ok) try { m = await r.json(); } catch (e) { m = null; }
    if (!m) return kosong("Belum ada data: isian meja pengungsi gagal dimuat. Coba lagi beberapa menit lagi.");
    const J = await import("/inti/jam_aturan.js"), tanggal = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    const per = tempatDariCatatan(m.catatan, tanggal), grup = [...per.values()].filter(g => g.tempat.length || g.tidak_sah);
    if (!grup.length) return kosong("Belum ada data: belum ada isian meja pengungsi yang berjalan.");
    const rk = grup.map(g => ringkasKab(J, g, laphar, tanggal)).sort((a, b) => (b.merah === true) - (a.merah === true) || (b.jiwa_daerah || 0) - (a.jiwa_daerah || 0) || (a.kab < b.kab ? -1 : 1));
    const bagian = mu("div", {class: "un-wil-pengungsian"}), pilih = mu("select", {id: "wil2-kab", class: "un-g-in", "aria-label": "Kab/kota"}, ...rk.map((x, i) => mu("option", {value: String(i), teks: x.kab})));
    const wadah = mu("div"), cat = mu("p", {class: "un-g-cat", role: "status", teks: m.dipotong ? "Daftar meja dipotong di 2.000 catatan terbaru; rekap bisa kurang." : ""});
    const gambar = () => { const x = rk[Number(pilih.value)], g = grup.find(z => z.prov === x.prov && normKab(z.kab) === normKab(x.kab));
      wadah.replaceChildren(R.render(skemaTempat(x.kab, barisTempat(J, g, tanggal), x.kebutuhan), null)); };
    pilih.addEventListener("change", () => { tunda(gambar); });
    bagian.append(mu("p", null, mu("label", {for: "wil2-kab", teks: "Kab/kota "}), pilih), wadah);
    gambar();
    return [R.render(skemaRekap(rk), null), cat, bagian];
  }
  if (typeof window !== "undefined" && window.UnitRapor) (window.UnitTampil ||= {})["WIL-2"] = tampil2;

  const api = {urut, pilih, skema, TIPE};
  (typeof window !== "undefined" ? window : globalThis).UnitWil1 = api;
  if (typeof window !== "undefined" && window.UnitRapor) (window.UnitTampil ||= {})["WIL-1"] = tampil;
})();
