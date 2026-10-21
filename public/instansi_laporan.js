/* Instansi: tab "Laporan harian" untuk akun Pemerintah Provinsi (/instansi). Modul SISIP terpisah seperti instansi_alat.js: menambah satu tombol tab dan satu panel, tanpa menyentuh state instansi.js.
   Form laporan karhutla provinsi (docs/laporan-karhutla/SOP.md §6): terisi dulu dari draf server (FS kemarin yang sisanya > 0, FS baru dari tugas api, hotspot satelit, personel dan peralatan),
   cek merah/kuning langsung per baris memakai spek yang SAMA dengan Worker (/laporan_karhutla_spek.js), simpan otomatis sebagai draf (versi, klien_id, 409 bila dua orang bersamaan),
   antre bila sinyal hilang, lalu kirim. Worker memvalidasi ulang; peramban tidak dipercaya.
   Jalur API: /api/instansi/laporan/{kiriman,draf,kirim} (cookie sesi instansi hanya dikirim ke /api/instansi).
   Gerbang INP: kontrol berubah seketika, cek dan total digambar sesudah satu frame. CSP: tanpa skrip/gaya inline, teks data lewat textContent. */
(() => {
  "use strict";
  /* angka gaya format.js (id-ID, "–" bila kosong) tetapi 2 desimal: luasan laporan bernilai 74,77 ha, fmt() dari format.js membulatkan ke 1 desimal */
  const fmt2 = n => (n == null || isNaN(n)) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 2});
  const el = id => document.getElementById(id);
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else if (k === "value") e.value = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const ganti = (n, ...a) => n.replaceChildren(...a.flat().filter(x => x != null && x !== false));   // replaceChildren(null) menulis teks "null"
  const api = async (metode, url, body) => {
    try { const r = await fetch(url, {method: metode, headers: {...(metode === "POST" ? {"x-pb": "1", "content-type": "application/json"} : {})}, body: body === undefined ? undefined : JSON.stringify(body)}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "Tidak ada sinyal."}}; }
  };
  const wibHariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const tampilAngka = v => v == null || v === "" ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v);
  const klienBaru = () => "k" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const STATUS = {draf: "Draf", terkirim: "Terkirim, menunggu verifikasi", dikembalikan: "Dikembalikan, perlu diperbaiki", disetujui: "Disetujui"};
  const LABEL_CEK = {merah: "Wajib dibetulkan", kuning: "Perlu keterangan"};
  let S = null, panel = null, kode = null, tgl = wibHariIni(), D = null, isi = null, hasil = null, simpanState = "diam", simpanPesan = "", tTunda = 0, tCek = 0, sedangSimpan = false, antre = false, buka = new Set(["fs", "personel"]);

  /* ---------- tab ---------- */
  function pasang() {
    const bar = el("tab"), isiEl = el("isi"); if (!bar || !isiEl || el("tabLaporanTombol")) return;
    const b = h("button", {type: "button", id: "tabLaporanTombol", "aria-pressed": "false"}, "Laporan harian");
    panel = h("div", {id: "tabLaporan", hidden: true}); bar.append(b); isiEl.append(panel);
    b.addEventListener("click", () => { for (const x of bar.children) x.setAttribute("aria-pressed", String(x === b)); for (const id of ["tabTugas", "tabKontak", "tabAlat"]) if (el(id)) el(id).hidden = true; panel.hidden = false; if (!D) muat(); });
    new MutationObserver(() => { if (!panel.hidden && ["tabTugas", "tabKontak", "tabAlat"].some(id => el(id) && !el(id).hidden)) { panel.hidden = true; b.setAttribute("aria-pressed", "false"); } }).observe(isiEl, {attributes: true, attributeFilter: ["hidden"], subtree: true});
  }
  const awasi = () => {
    const u = el("vUtama"); if (!u) return;
    const f = async () => {
      if (u.hidden) { D = isi = null; return; }
      const j = window.InstansiSaya, a = j?.akun;   // dari instansi.js (tanpa panggilan /saya kedua)
      if (a?.jenis === "pemprov" && a.tingkat === "prov" && a.status === "aktif" && j.cakupan?.length === 1) { kode = j.cakupan[0]; pasang(); }
    };
    new MutationObserver(f).observe(u, {attributes: true, attributeFilter: ["hidden"]}); f();
  };

  /* ---------- muat ---------- */
  const kunciCadangan = () => `lk:${tgl}:${kode}`;
  async function muat(senyap) {
    if (!senyap) ganti(panel, h("p", {class: "lk-redup", role: "status", teks: "Memuat laporan harian…"}));
    S ||= await import("/laporan_karhutla_spek.js");
    const r = await api("GET", `/api/instansi/laporan/kiriman?tanggal=${tgl}&sumber=prov:${kode}`);
    if (!r.ok) return ganti(panel, h("div", {class: "lk-kosong"}, h("p", {teks: r.status === 503 ? "Laporan harian belum diaktifkan di server." : r.j?.galat || `Gagal memuat (${r.status}).`}), h("button", {type: "button", class: "lk-btn utama", "data-a": "ulang", teks: "Coba lagi"})));
    D = r.j; isi = JSON.parse(JSON.stringify(D.isi));
    if (isi.fs.length) isi.total = null;   // dengan baris FS, total selalu dari baris
    try { const c = JSON.parse(localStorage.getItem(kunciCadangan()) || "null"); if (c && c.dasar === D.versi && D.status !== "disetujui" && D.boleh_tulis) { isi = c.isi; simpanState = "belum"; simpanPesan = "Perubahan yang belum tersimpan dipulihkan dari perangkat ini."; antre = true; } } catch (e) { /* abaikan */ }
    gambar(); hitung(); if (antre) simpanTunda(500);
  }

  /* ---------- hitung cek (spek yang sama dengan Worker) ---------- */
  /* kolom turunan (sisa) dibuang: server menghitungnya sendiri, dan sisa basi dari muatan lama akan terbaca sebagai isian yang salah */
  const TURUNAN = ["sisa_ha", "sisa_isian", "fs_sisa", "fs_sisa_isian", "dihitung"];
  const salin = () => { const o = JSON.parse(JSON.stringify(isi)); for (const x of [...o.fs, ...(o.blok || []), ...(o.total ? [o.total] : [])]) for (const k of TURUNAN) delete x[k]; if (o.fs.length) delete o.total; return o; };
  function hitung() {
    const n = S.normalisasi("prov:" + kode, salin(), tgl, false);
    hasil = {isi: n.isi, galat: n.galat, cek: n.galat.length ? [] : S.cek("prov:" + kode, n.isi, D.kemarin)};
    gambarHasil();
  }
  const hitungTunda = () => { cancelAnimationFrame(tCek); tCek = requestAnimationFrame(() => setTimeout(hitung, 0)); };

  /* ---------- simpan otomatis ---------- */
  function setSimpan(s, t) { simpanState = s; simpanPesan = t || ""; const e = el("lkSimpan"); if (e) { e.textContent = simpanTeks(); e.className = "lk-simpan " + s; } }
  const simpanTeks = () => simpanState === "tersimpan" ? `Tersimpan otomatis ${new Date().toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"})}` : simpanState === "menyimpan" ? "Menyimpan…" : simpanState === "belum" ? simpanPesan || "Belum tersimpan" : simpanState === "konflik" ? "Konflik: muat ulang" : simpanPesan;
  function simpanTunda(ms = 1400) { if (!D?.boleh_tulis) return; setSimpan("belum", "Belum tersimpan"); try { localStorage.setItem(kunciCadangan(), JSON.stringify({dasar: D.versi, isi})); } catch (e) { /* penyimpanan penuh */ } clearTimeout(tTunda); tTunda = setTimeout(simpan, ms); }
  async function simpan() {
    if (sedangSimpan) { antre = true; return; }
    sedangSimpan = true; antre = false; setSimpan("menyimpan");
    const r = await api("POST", "/api/instansi/laporan/draf", {tanggal: tgl, sumber: "prov:" + kode, isi: salin(), versi_dasar: D.versi, klien_id: klienBaru()});
    sedangSimpan = false;
    if (r.ok) { D.versi = r.j.versi; D.status = "draf"; try { localStorage.removeItem(kunciCadangan()); } catch (e) { /* abaikan */ } setSimpan("tersimpan"); gambarStatus(); if (antre) simpanTunda(300); return; }
    if (r.status === 409) { setSimpan("konflik"); return galatKonflik(r.j.galat); }
    if (r.status === 0) { setSimpan("belum", "Belum tersimpan: sinyal hilang, dicoba lagi otomatis"); clearTimeout(tTunda); tTunda = setTimeout(simpan, 15000); return; }
    setSimpan("belum", r.j.galat || `Gagal menyimpan (${r.status})`);
  }
  addEventListener("online", () => { if (D && simpanState === "belum") { clearTimeout(tTunda); simpan(); } });
  function galatKonflik(teks) {
    const k = el("lkKonflik"); if (!k) return;
    ganti(k, h("p", {teks: (teks || "Laporan sudah diubah orang lain.") + " Perubahanmu di layar belum tersimpan."}), h("button", {type: "button", class: "lk-btn utama", "data-a": "ulang", teks: "Muat versi terbaru"})); k.hidden = false;
  }

  /* ---------- tata letak ---------- */
  const isiBagian = (id, judul, ringkas, ...anak) => { const d = h("details", {class: "lk-bagian", "data-bagian": id, open: buka.has(id)}, h("summary", null, h("b", {teks: judul}), h("span", {class: "lk-redup", "data-ringkas": id, teks: ringkas || ""})), h("div", {class: "lk-isi"}, anak)); return d; };
  const kolom = (label, jalur, o = {}) => { const v = jalur.split(".").reduce((x, k) => x?.[k], isi);
    const i = h(o.pilihan ? "select" : "input", {"data-j": jalur, id: "lk_" + jalur.replace(/\W/g, "_"), inputmode: o.angka ? "decimal" : o.teks ? "text" : null, type: o.tgl ? "date" : o.cek ? "checkbox" : null, maxlength: o.maks, autocomplete: "off", disabled: o.mati});
    if (o.pilihan) { i.append(h("option", {value: "", teks: "pilih"}), ...Object.entries(o.pilihan).map(([k, l]) => h("option", {value: k, teks: l, selected: v === k}))); }
    else if (o.cek) i.checked = !!v; else i.value = tampilAngka(v);
    return h("label", {class: "lk-kol" + (o.cek ? " cek" : ""), for: i.id}, o.cek ? null : h("span", {teks: label}), i, o.cek ? h("span", {teks: label}) : null); };
  const kotak = (...a) => h("div", {class: "lk-grid"}, a);

  function barisFs(f, i) {
    return h("li", {class: "lk-fs", "data-i": i}, h("div", {class: "lk-fs-kepala"}, h("b", {teks: f.fs_id || "FS baru"}), f.tugas_id ? h("span", {class: "lk-pil", teks: "dari tugas api"}) : null, f.kemarin ? h("span", {class: "lk-pil", teks: `kemarin ${tampilAngka(f.kemarin.target_ha)} ha`}) : null),
      kotak(kolom("Kabupaten/kota", `fs.${i}.kab`, {teks: 1, maks: 60}), kolom("Kecamatan", `fs.${i}.kec`, {teks: 1, maks: 60}), kolom("Kawasan (mis. TNTP)", `fs.${i}.kawasan`, {teks: 1, maks: 60}),
        kolom("Target (ha)", `fs.${i}.target_ha`, {angka: 1}), kolom("Padam darat (ha)", `fs.${i}.padam_darat_ha`, {angka: 1}), kolom("Padam udara (ha)", `fs.${i}.padam_udara_ha`, {angka: 1}),
        kolom("Status api", `fs.${i}.status`, {pilihan: {menyala: "Menyala", bara: "Bara", padam: "Padam"}}), h("div", {class: "lk-kol"}, h("span", {teks: "Sisa terhitung (ha)"}), h("output", {class: "lk-sisa", "data-sisa": i, teks: ""})),
        kolom("Alasan koreksi atau luasan baru", `fs.${i}.alasan`, {teks: 1, maks: 300}), kolom("Luasan kumulatif, jangan dijumlahkan", `fs.${i}.kumulatif`, {cek: 1})),
      h("div", {class: "lk-cek-baris", "data-cekfs": i}), h("button", {type: "button", class: "lk-btn kecil bahaya", "data-a": "hapus-fs", "data-i": i, disabled: !D.boleh_tulis, teks: "Hapus baris"}));
  }
  function gambar() {
    const T = isi.total || {}, tulis = D.boleh_tulis, mat = h("fieldset", {class: "lk-set", disabled: !tulis});
    const rows = h("ul", {class: "lk-daftar", id: "lkFs"}, isi.fs.map(barisFs));
    const totalManual = h("div", {id: "lkTotalManual"}, kotak(kolom("Jumlah FS", "total.fs", {angka: 1}), kolom("FS padam", "total.fs_padam", {angka: 1}), kolom("Target (ha)", "total.target_ha", {angka: 1}), kolom("Padam (ha)", "total.padam_ha", {angka: 1})),
      h("p", {class: "lk-redup", teks: "Tanpa rincian FS, isi total provinsi di sini. Dengan baris FS di atas, total dihitung dari baris."}),
      h("h4", {teks: "Rincian per kawasan (mis. di luar TNTP dan TNTP), opsional"}), h("ul", {class: "lk-daftar", id: "lkBlok"}, (isi.blok || []).map((b, i) => h("li", {class: "lk-fs"}, kotak(kolom("Kawasan", `blok.${i}.kawasan`, {teks: 1, maks: 60}), kolom("FS", `blok.${i}.fs`, {angka: 1}), kolom("FS padam", `blok.${i}.fs_padam`, {angka: 1}), kolom("Target (ha)", `blok.${i}.target_ha`, {angka: 1}), kolom("Padam (ha)", `blok.${i}.padam_ha`, {angka: 1})),
        h("button", {type: "button", class: "lk-btn kecil bahaya", "data-a": "hapus-blok", "data-i": i, teks: "Hapus kawasan"})))), h("button", {type: "button", class: "lk-btn kecil", "data-a": "tambah-blok", teks: "Tambah kawasan"}));
    const unsur = h("div", null, kotak(kolom("Personel total", "personel.total", {angka: 1}), ...Object.entries(S.UNSUR).map(([k, l]) => kolom(l, `personel.unsur.${k}`, {angka: 1})), kolom("Pola shift", "personel.shift", {teks: 1, maks: 120}), kolom("Standby (orang)", "personel.standby", {angka: 1})),
      kolom("Keterangan (wajib bila berubah lebih dari 50%)", "personel.keterangan", {teks: 1, maks: 300}), D.isi.personel?.diperbarui === false && !D.ada ? h("p", {class: "lk-redup", teks: "Disalin dari laporan terakhir. Ubah hanya bila ada perubahan."}) : null);
    mat.append(
      isiBagian("fs", "Fire spot", "", h("p", {class: "lk-redup", teks: D.draf_otomatis ? `Terisi otomatis: ${D.fs_kemarin ?? 0} FS dari kemarin yang masih bersisa dan ${D.fs_baru ?? 0} FS baru dari tugas api. Isi padam darat dan udara (kumulatif sampai ${D.isi.tanggal_data}).` : `Luas dan padam kumulatif sampai ${D.isi.tanggal_data}.`}),
        rows, h("button", {type: "button", class: "lk-btn kecil", "data-a": "tambah-fs", teks: "Tambah FS"}), h("div", {id: "lkTotalHitung"}), totalManual,
        kolom("Luasan kumulatif musim (tidak dijumlahkan), ha", "kumulatif_ha.ha", {angka: 1}), kolom("Keterangan luasan kumulatif", "kumulatif_ha.keterangan", {teks: 1, maks: 200})),
      isiBagian("hotspot", "Hotspot satelit (GIS)", "", kotak(kolom("Total hotspot", "hotspot.total", {angka: 1}), kolom("Keyakinan tinggi", "hotspot.tinggi", {angka: 1}), kolom("Keyakinan sedang", "hotspot.sedang", {angka: 1})), h("p", {class: "lk-redup", teks: "Angka satelit bukan angka lapangan; keduanya tidak dicampur."})),
      isiBagian("personel", "Personel per unsur", "", unsur),
      isiBagian("peralatan", "Peralatan", "", h("p", {class: "lk-redup", teks: "Stok tetap diambil dari Inventaris. Tambahkan dukungan khusus hari ini."}), h("ul", {class: "lk-daftar", id: "lkAlat"}, isi.peralatan.map((a, i) => h("li", {class: "lk-fs"}, kotak(kolom("Kategori", `peralatan.${i}.kategori`, {pilihan: Object.fromEntries(S.KATEGORI_ALAT.map(k => [k, k.replace(/_/g, " ")]))}), kolom("Stok tetap", `peralatan.${i}.stok`, {angka: 1}), kolom("Tambahan hari ini", `peralatan.${i}.tambahan`, {angka: 1})), h("button", {type: "button", class: "lk-btn kecil bahaya", "data-a": "hapus-alat", "data-i": i, teks: "Hapus"})))), h("button", {type: "button", class: "lk-btn kecil", "data-a": "tambah-alat", teks: "Tambah peralatan"})),
      isiBagian("kondisi", "Kondisi wilayah per kabupaten/kota", "", h("ul", {class: "lk-daftar", id: "lkKondisi"}, isi.kondisi.map((k, i) => h("li", {class: "lk-fs"}, kotak(kolom("Kabupaten/kota", `kondisi.${i}.kab`, {teks: 1, maks: 60}), kolom("ISPU", `kondisi.${i}.ispu`, {pilihan: Object.fromEntries(S.ISPU.map(x => [x, x.replace(/_/g, " ")]))}), kolom("Jarak pandang (m)", `kondisi.${i}.jarak_pandang_m`, {angka: 1}),
        kolom("Sekolah", `kondisi.${i}.sekolah`, {pilihan: {normal: "Normal", daring: "Daring", libur: "Libur"}}), kolom("Penerbangan", `kondisi.${i}.penerbangan`, {pilihan: {normal: "Normal", terganggu: "Terganggu", ditutup: "Ditutup"}}), kolom("Kasus ISPA", `kondisi.${i}.ispa`, {angka: 1}),
        kolom("Hujan", `kondisi.${i}.hujan`, {pilihan: {tidak: "Tidak", ringan: "Ringan", sedang: "Sedang", lebat: "Lebat"}})), h("button", {type: "button", class: "lk-btn kecil bahaya", "data-a": "hapus-kondisi", "data-i": i, teks: "Hapus"})))), h("button", {type: "button", class: "lk-btn kecil", "data-a": "tambah-kondisi", teks: "Tambah kabupaten/kota"})),
      isiBagian("hambatan", "Hambatan dan upaya", "", h("fieldset", {class: "lk-pilihan"}, h("legend", {teks: "Hambatan"}), ...Object.entries(S.HAMBATAN).map(([k, l]) => pilihan("hambatan", k, l))), kolom("Hambatan lain", "hambatan.teks", {teks: 1, maks: 500}),
        h("fieldset", {class: "lk-pilihan"}, h("legend", {teks: "Upaya"}), ...Object.entries(S.UPAYA).map(([k, l]) => pilihan("upaya", k, l))), kolom("Upaya lain", "upaya.teks", {teks: 1, maks: 500})),
      isiBagian("darurat", "Status kedaruratan", "", kotak(kolom("Jenis", "darurat.jenis", {pilihan: S.DARURAT}), kolom("TMT", "darurat.tmt", {tgl: 1}), kolom("Sampai dengan", "darurat.sd", {tgl: 1}))),
      isiBagian("catatan", "Catatan", "", kolom("Penjelasan (mis. FS kemarin yang tidak ada hari ini)", "catatan", {teks: 1, maks: 500})));
    const tglIn = h("input", {type: "date", id: "lkTgl", value: tgl, max: new Date(Date.now() + 7 * 36e5 + 864e5).toISOString().slice(0, 10), "aria-label": "Tanggal laporan"});
    ganti(panel, 
      h("div", {class: "lk-atas"}, h("div", null, h("h2", {teks: "Laporan harian karhutla"}), h("p", {class: "lk-redup", teks: `Data pantauan ${D.isi.tanggal_data} (24 jam, cut-off 07.00 WIB). Laporan hari ${tgl}. Kirim paling lambat 09.00 WIB.`})), h("label", {class: "lk-kol lk-tgl", for: "lkTgl"}, h("span", {teks: "Tanggal laporan"}), tglIn)),
      h("div", {id: "lkStatus"}), h("div", {id: "lkKonflik", class: "lk-banner galat", role: "alert", hidden: true}),
      D.wajib ? null : h("p", {class: "lk-banner kuning", teks: "Provinsi ini bukan provinsi prioritas pada hari itu, jadi laporan tidak bisa dikirim."}),
      mat, h("section", {class: "lk-hasil", "aria-live": "polite", id: "lkHasil"}),
      h("div", {class: "lk-bar"}, h("span", {id: "lkSimpan", class: "lk-simpan " + simpanState, role: "status", teks: simpanTeks()}), h("button", {type: "button", class: "lk-btn utama", id: "lkKirim", "data-a": "kirim", disabled: !tulis || !D.wajib, teks: D.status === "terkirim" || D.status === "disetujui" ? "Kirim ulang" : "Kirim laporan"})));
    gambarStatus(); sinkronTotal();
  }
  function pilihan(bagian, k, label) { const on = isi[bagian].pilihan.includes(k), c = h("input", {type: "checkbox", "data-pilih": bagian, value: k, checked: on}); return h("label", {class: "lk-kol cek"}, c, h("span", {teks: label})); }
  function gambarStatus() {
    const w = el("lkStatus"); if (!w) return;
    ganti(w, h("div", {class: "lk-baris"}, h("span", {class: "lk-pil st-" + D.status, teks: STATUS[D.status] || D.status}), D.versi ? h("span", {class: "lk-redup", teks: `versi ${D.versi}`}) : null, D.terkunci ? h("span", {class: "lk-pil", teks: "Laporan hari ini sudah dikunci"}) : null),
      D.status === "dikembalikan" && D.catatan ? h("p", {class: "lk-banner galat", teks: "Dikembalikan verifikator: " + D.catatan}) : null,
      D.status === "terkirim" ? h("p", {class: "lk-redup", teks: "Koreksi setelah terkirim membuka ulang status: kirim lagi supaya diverifikasi ulang."}) : null);
    const b = el("lkKirim"); if (b) b.textContent = D.status === "terkirim" || D.status === "disetujui" ? "Kirim ulang" : "Kirim laporan";
  }
  /* total dari baris (bila ada) atau isian manual: ditampilkan, bukan diketik */
  function sinkronTotal() {
    const ada = isi.fs.length > 0; el("lkTotalManual")?.toggleAttribute("hidden", ada);
    const t = el("lkTotalHitung"); if (t) t.hidden = !ada;
  }
  function gambarHasil() {
    const w = el("lkHasil"); if (!w || !hasil) return;
    const n = hasil.isi, T = n.total, f2 = x => x == null ? "kosong" : fmt2(x);
    for (const o of document.querySelectorAll("[data-sisa]")) { const f = n.fs[Number(o.dataset.sisa)]; o.textContent = f ? fmt2(f.sisa_ha) : ""; }
    const th = el("lkTotalHitung"); if (th && isi.fs.length && T) ganti(th, h("p", {class: "lk-total", teks: `Total dari baris: ${f2(T.fs)} FS, target ${f2(T.target_ha)} ha, padam ${f2(T.padam_ha)} ha, sisa ${f2(T.sisa_ha)} ha`}));
    const ring = (id, t2) => { const e = document.querySelector(`[data-ringkas="${id}"]`); if (e) e.textContent = t2; };
    ring("fs", T ? `${f2(T.fs)} FS, sisa ${f2(T.sisa_ha)} ha` : "belum diisi"); ring("personel", n.personel.total != null ? `${fmt2(n.personel.total)} orang` : "belum diisi");
    for (const e of document.querySelectorAll("[data-cekfs]")) { const i = e.dataset.cekfs; e.replaceChildren(...hasil.cek.filter(c => c.j.startsWith(`fs[${i}]`)).map(c => h("p", {class: "lk-cek " + c.t + (c.dijelaskan ? " ok" : ""), teks: (c.dijelaskan ? "Dijelaskan: " : "") + c.p}))); }
    const m = hasil.cek.filter(c => c.t === "merah"), k = hasil.cek.filter(c => c.t === "kuning"), kurang = S.kurangMinimal("prov:" + kode, salin(), tgl);   // wajib isi yang masih kosong, aturan yang sama dengan Worker
    ganti(w, h("h3", {teks: "Cek otomatis"}),
      hasil.galat.length ? h("div", {class: "lk-banner galat"}, h("p", {teks: "Isian belum terbaca:"}), h("ul", null, hasil.galat.slice(0, 6).map(g => h("li", {teks: S.galatManusia(g)})))) : null,
      !hasil.galat.length && kurang.length ? h("p", {class: "lk-banner kuning", teks: "Isi minimal: " + kurang.slice(0, 4).join("; ") + (kurang.length > 4 ? `; dan ${kurang.length - 4} lagi` : "") + "."}) : null,
      !hasil.galat.length && !kurang.length && !m.length && !k.length ? h("p", {class: "lk-banner ok", teks: "Tidak ada pelanggaran. Siap dikirim."}) : null,
      ...[["merah", m], ["kuning", k]].filter(([, l]) => l.length).map(([t, l]) => h("div", {class: "lk-cek-kel " + t}, h("h4", {teks: `${LABEL_CEK[t]} (${l.length})`}), h("ul", null, l.map(c => h("li", {class: c.dijelaskan ? "ok" : "", teks: (c.dijelaskan ? "Dijelaskan: " : "") + c.p}))))));
  }

  /* ---------- isian ---------- */
  const atur = (jalur, nilai) => { const p = jalur.split("."); let o = isi; for (let i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; } o[p[p.length - 1]] = nilai; };
  const fsKosong = () => ({fs_id: "", tugas_id: null, kab: "", kec: "", kawasan: "", target_ha: "", padam_darat_ha: "", padam_udara_ha: "", status: "menyala", kumulatif: false, alasan: "", kemarin: null});
  const penambah = {"tambah-fs": () => isi.fs.push(fsKosong()), "tambah-blok": () => (isi.blok ||= []).push({kawasan: "", fs: "", fs_padam: "", target_ha: "", padam_ha: ""}), "tambah-alat": () => isi.peralatan.push({kategori: "", stok: "", tambahan: ""}), "tambah-kondisi": () => isi.kondisi.push({kab: ""}),
    "hapus-fs": i => isi.fs.splice(i, 1), "hapus-blok": i => isi.blok.splice(i, 1), "hapus-alat": i => isi.peralatan.splice(i, 1), "hapus-kondisi": i => isi.kondisi.splice(i, 1)};
  const ubah = () => { hitungTunda(); simpanTunda(); };
  document.addEventListener("input", e => {
    const t = e.target; if (!panel || !panel.contains(t) || !D) return;
    if (t.dataset.j) { atur(t.dataset.j, t.type === "checkbox" ? t.checked : t.value); ubah(); }
    else if (t.dataset.pilih) { const a = isi[t.dataset.pilih].pilihan; const i = a.indexOf(t.value); if (t.checked && i < 0) a.push(t.value); if (!t.checked && i >= 0) a.splice(i, 1); ubah(); }
  });
  document.addEventListener("change", e => { const t = e.target; if (t.id === "lkTgl" && panel?.contains(t)) { tgl = t.value || wibHariIni(); D = null; muat(); } });
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]"); if (!b || !panel?.contains(b)) return; const a = b.dataset.a;
    if (a === "ulang") return muat();
    if (penambah[a]) { b.disabled = true; for (const d of panel.querySelectorAll("details")) if (d.open) buka.add(d.dataset.bagian); penambah[a](Number(b.dataset.i)); gambar(); hitung(); simpanTunda(); return; }
    if (a === "kirim") return kirimLaporan(b);
  });
  async function kirimLaporan(b) {
    const n = S.normalisasi("prov:" + kode, salin(), tgl, true);
    if (n.galat.length) { hasil = {isi: S.normalisasi("prov:" + kode, salin(), tgl, false).isi, galat: n.galat, cek: []}; gambarHasil(); el("lkHasil")?.scrollIntoView({behavior: "smooth", block: "center"}); return; }
    b.disabled = true; b.textContent = "Mengirim…"; clearTimeout(tTunda);
    for (let i = 0; i < 50 && sedangSimpan; i++) await new Promise(r => setTimeout(r, 100));
    const r = await api("POST", "/api/instansi/laporan/kirim", {tanggal: tgl, sumber: "prov:" + kode, isi: salin(), versi_dasar: D.versi, klien_id: klienBaru()});
    b.disabled = false;
    if (r.ok) { try { localStorage.removeItem(kunciCadangan()); } catch (e) { /* abaikan */ } await muat(true); setSimpan("tersimpan", ""); simpanPesan = `Terkirim${r.j.hitung?.merah ? `, ${r.j.hitung.merah} pelanggaran merah menunggu perbaikan` : ""}.`; const s = el("lkSimpan"); if (s) { s.textContent = simpanPesan; s.className = "lk-simpan " + (r.j.hitung?.merah ? "belum" : "tersimpan"); } return; }
    if (r.status === 409) { setSimpan("konflik"); return galatKonflik(r.j.galat); }
    hasil = {isi: hasil?.isi ?? D.isi, galat: [{jalur: "kirim", pesan: r.j.galat || (r.status === 0 ? "Tidak ada sinyal; coba lagi." : `Gagal (${r.status})`)}], cek: []}; gambarHasil(); b.textContent = "Kirim laporan";
  }
  awasi();
})();
