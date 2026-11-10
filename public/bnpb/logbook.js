/* Logbook Pusdalops: catat kejadian terstruktur sesuai Kontrak L1 (docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md).
   API: POST /api/logbook/kejadian, POST /api/logbook/kejadian/:id/entri, GET /api/logbook/buka?kab=, GET /api/logbook/hari?tgl=.
   Akses staf (sesi_staf berperan pusdalops/koordalops/pimpinan) atau admin; layar hanya memeriksa balasan API (401/403 -> tautan masuk).
   Draf formulir disimpan di localStorage supaya isian setengah jadi tidak hilang. Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {PROV, ikon, h, F, label, namaJenis, urutJenis, muat, desaKab, kunciKab, tutup} = window.Wilayah;
  const app = document.getElementById("app"), DRAF = "logbook_draf_v1";
  /* sama persis dengan JENIS di src/logbook.js (daftar putih worker, 14 nilai); urutan resmi dari Wilayah. Tiga jenis baru dijawab 503 sampai migrasi 0091. */
  const JENIS = ["banjir", "cuaca", "kebakaran_permukiman", "karhutla", "longsor", "gempabumi", "gunungapi", "kekeringan", "kecelakaan", "konflik_sosial", "lainnya", "gelombang_pasang", "tsunami", "wabah"].sort(urutJenis);
  const KENDALA = {akses: "Akses putus", logistik: "Logistik/BBM", sinyal: "Sinyal putus", air: "Sumber air", personel: "Personel kurang", alat_berat: "Alat berat", gambut: "Gambut", cuaca: "Cuaca", data: "Data belum ada", dana: "Dana", malam: "Malam hari", sosial: "Sosial", listrik: "Listrik padam", angin: "Angin kencang"};
  const KEBUTUHAN = {makanan: "Makanan", tenda: "Tenda", sandang: "Sandang", air_bersih: "Air bersih", obat: "Obat", perahu: "Perahu", material: "Material", alat_berat: "Alat berat", pompa: "Pompa", dana: "Dana", bantuan_nasional: "Permintaan bantuan nasional"};
  /* urutan: [kunci, label, satuan]; batas wajar = BATAS_WAJAR di scripts/umum/laphar_arsip.py */
  const DAMPAK = [["md", "Meninggal", "jiwa", 5000], ["hilang", "Hilang", "jiwa", 5000], ["luka", "Luka", "jiwa", 50000], ["mengungsi_jiwa", "Mengungsi", "jiwa", 2e6], ["mengungsi_kk", "Mengungsi", "KK", 2e6],
    ["rumah_rb", "Rumah rusak berat", "unit", 5e5], ["rumah_rs", "Rumah rusak sedang", "unit", 5e5], ["rumah_rr", "Rumah rusak ringan", "unit", 5e5], ["rumah_terendam", "Rumah terendam", "unit", 1e6], ["luas_ha", "Luas terbakar", "ha", 3e6]];
  const INSTANSI = ["BPBD", "Pusdalops BNPB", "TNI", "Polri", "Basarnas", "Damkar", "BMKG", "Pemerintah desa", "Relawan", "Lainnya"];

  const wibHari = (d = new Date()) => new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 10);
  const wibLokal = (d = new Date()) => new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 16);   // untuk <input type=datetime-local>
  /* 1.234,5 / 1.234 (ribuan) / 12,5 -> angka; selain itu NaN */
  const angkaId = v => { const t = String(v).trim(); if (!t) return null; return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t); };
  const tunda = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
  const api = async (m, u, b) => {
    try { const r = await fetch(u, {method: m, headers: b ? {"content-type": "application/json", "x-pb": "1"} : {}, body: b ? JSON.stringify(b) : undefined});
      return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, s: 0, j: {galat: "Tidak ada sinyal. Isianmu tersimpan sebagai draf di perangkat ini."}}; }
  };
  const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const bacaLokal = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const hapusLokal = k => { try { localStorage.removeItem(k); } catch (e) {} };

  const kosong = (ik, teks, ...lain) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}), ...lain);
  const pil = (teks, ton, ik) => h("span", {class: "bn-pil lb-t-" + ton}, ikon(ik), teks);

  /* ---------- pagar akses ---------- */
  function kartuMasuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
      h("p", {class: "lb-p", teks: s === 403 ? "Akunmu belum berhak mengisi logbook. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan yang boleh. Minta Super Admin menambah perannya." : "Logbook hanya untuk staf Pusdalops BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
      h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }


  /* ---------- rincian juklak (opsional): Juklak BNPB 7/2023; daftar kode SAMA dengan src/logbook.js (UMUR, RENTAN, PRASARANA, TINGKAT_RUSAK, KELOMPOK_KEBUTUHAN) ---------- */
  const UMUR = ["0-17", "18-59", "60+"], KORBAN = [["md", "Meninggal"], ["hilang", "Hilang"], ["luka", "Luka"], ["terdampak", "Terdampak"], ["mengungsi", "Mengungsi"]];
  const RENTAN = {bayi: "Bayi", balita: "Balita", ibu_hamil_menyusui: "Ibu hamil/menyusui", lansia: "Lansia", disabilitas: "Disabilitas"};
  const PRASARANA = {sawah: ["Sawah", "ha"], lahan: ["Lahan", "ha"], kebun: ["Kebun", "ha"], hutan: ["Hutan", "ha"], kolam: ["Kolam", "ha"], kios_toko: ["Kios/toko", "unit"], pabrik: ["Pabrik", "unit"], jaringan_air: ["Jaringan air", "unit"], jaringan_listrik: ["Jaringan listrik", "unit"],
    jaringan_telekomunikasi: ["Jaringan telekomunikasi", "unit"], irigasi: ["Irigasi", "unit"], jalan: ["Jalan", "km"], jembatan: ["Jembatan", "unit"], transportasi: ["Transportasi", "unit"], spbu: ["SPBU", "unit"], rumah_ibadat: ["Rumah ibadat", "unit"],
    faskes: ["Fasilitas kesehatan", "unit"], sekolah: ["Sekolah", "unit"], kantor: ["Kantor", "unit"], pasar: ["Pasar", "unit"], rumah: ["Rumah", "unit"]};
  const NARASI = [["nama_kejadian", "Nama kejadian", 120], ["penyebab", "Penyebab", 300], ["kronologis", "Kronologis", 2000], ["deskripsi", "Deskripsi", 1000], ["upaya", "Upaya penanganan", 1000]];
  const TINGKAT = {rb: "Rusak berat", rs: "Rusak sedang", rr: "Rusak ringan", terendam: "Terendam"}, KELOMPOK = {dana: "Dana", sdm: "SDM", sarpras: "Sarana-prasarana", logistik: "Logistik", peralatan: "Peralatan"};
  const SK_TINGKAT = {siaga: "Siaga darurat", tanggap: "Tanggap darurat", transisi: "Transisi darurat ke pemulihan"};
  const tglId = t => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(t || ""); return m ? `${Number(m[3])} ${window.Wilayah.BLN[Number(m[2]) - 1] || m[2]} ${m[1]}` : ""; };
  const fIsi = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 6});   // pengisian ulang tanpa pembulatan: F() membulatkan 1 desimal dan nilai itu terkirim balik
  const sel2 = (daftar, kosongTeks, att) => h("select", att, kosongTeks != null ? h("option", {value: "", teks: kosongTeks}) : null, ...Object.entries(daftar).map(([v, t]) => h("option", {value: v, teks: t})));
  const kolomAngka = (nama, judul, att = {}) => { const i = h("input", {name: nama, inputmode: "decimal", autocomplete: "off", "aria-label": judul, ...att}); el[nama] = i; return h("label", {class: "bn-isian"}, judul, i); };
  const kolomTeks = (nama, judul, att = {}) => { const i = h("input", {name: nama, autocomplete: "off", "aria-label": judul, ...att}); el[nama] = i; return h("label", {class: "bn-isian"}, judul, i); };
  const bagian = (judul, ...isi) => h("section", {class: "lb-sub"}, h("h3", {teks: judul}), ...isi);
  function tambahBaris(wadah, kolom) {
    const r = h("div", {class: "lb-baris"}, ...kolom, h("button", {type: "button", class: "bn-tombol sekunder", "aria-label": "Hapus baris", title: "Hapus baris"}, ikon("sapu")));
    r.lastChild.addEventListener("click", () => r.remove()); wadah.append(r); return r;
  }
  const barisPras = (w, v = {}) => { const r = tambahBaris(w, [sel2(Object.fromEntries(Object.entries(PRASARANA).map(([k, [t, sat]]) => [k, `${t} (${sat})`])), "Pilih prasarana", {"data-k": "kode", "aria-label": "Prasarana"}),
    sel2(TINGKAT, "Tanpa tingkat", {"data-k": "tingkat", "aria-label": "Tingkat kerusakan"}), h("input", {"data-k": "jumlah", inputmode: "decimal", autocomplete: "off", "aria-label": "Jumlah", placeholder: "Jumlah"}), h("input", {"data-k": "kerugian_juta", inputmode: "decimal", autocomplete: "off", "aria-label": "Taksiran kerugian (juta rupiah)", placeholder: "Kerugian (juta)"})]);
    const satuan = () => { const p = PRASARANA[r.querySelector('[data-k="kode"]').value]; r.querySelector('[data-k="jumlah"]').placeholder = p ? `Jumlah (${p[1]})` : "Jumlah"; };
    r.querySelector('[data-k="kode"]').addEventListener("change", satuan);
    if (v.kode) { r.querySelector('[data-k="kode"]').value = v.kode; r.querySelector('[data-k="tingkat"]').value = v.tingkat || ""; r.querySelector('[data-k="jumlah"]').value = fIsi(v.jumlah); if (v.kerugian_juta != null) r.querySelector('[data-k="kerugian_juta"]').value = fIsi(v.kerugian_juta); satuan(); } };
  const barisKeb = (w, v = {}) => { const r = tambahBaris(w, [sel2(KELOMPOK, "Pilih kelompok", {"data-k": "kelompok", "aria-label": "Kelompok kebutuhan"}), h("input", {"data-k": "barang", maxlength: "60", autocomplete: "off", "aria-label": "Barang", placeholder: "Barang"}),
    h("input", {"data-k": "jumlah", inputmode: "decimal", autocomplete: "off", "aria-label": "Jumlah", placeholder: "Jumlah"}), h("input", {"data-k": "satuan", maxlength: "20", autocomplete: "off", "aria-label": "Satuan", placeholder: "Satuan"})]);
    if (v.kelompok) for (const k of ["kelompok", "barang", "satuan"]) r.querySelector(`[data-k="${k}"]`).value = v[k]; if (v.kelompok) r.querySelector('[data-k="jumlah"]').value = fIsi(v.jumlah); };
  const bacaBaris = (w, kunci) => [...w.children].map(r => Object.fromEntries(kunci.map(k => [k, r.querySelector(`[data-k="${k}"]`).value.trim()])));

  function rincian(f) {
    el.prasWadah = h("div", {class: "lb-baris-wadah"}); el.kebWadah = h("div", {class: "lb-baris-wadah"});
    const korban = h("div", {class: "lb-korban"}, h("span"), ...UMUR.flatMap(u => ["L", "P"].map(kel => h("span", {class: "lb-kop", teks: `${u} ${kel}`}))),
      ...KORBAN.flatMap(([g, t]) => [h("span", {class: "lb-kop", teks: t}), ...UMUR.flatMap(u => ["L", "P"].map(kel => { const i = h("input", {name: `k_${g}_${u}_${kel}`, inputmode: "numeric", autocomplete: "off", "aria-label": `${t} ${u} ${kel === "L" ? "laki-laki" : "perempuan"}`}); el[i.name] = i; return i; }))]));
    const tbPras = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("daftar"), "Tambah prasarana"), tbKeb = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("daftar"), "Tambah kebutuhan");
    tbPras.addEventListener("click", () => barisPras(el.prasWadah)); tbKeb.addEventListener("click", () => barisKeb(el.kebWadah));
    el.posko_ada = sel2({ya: "Ada posko", tidak: "Tidak ada posko"}, "Keposkoan belum diketahui", {name: "posko_ada", "aria-label": "Keposkoan"});
    el.skInfo = h("p", {class: "lb-p lb-kaki"}); el.skDaftar = h("ul", {class: "lb-sk"}); el.skPesan = h("p", {class: "lb-p lb-kaki", role: "status"});
    el.sk_tingkat = sel2(SK_TINGKAT, null, {"aria-label": "Tingkat status"}); el.sk_wilayah = sel2({prov: "SK provinsi", kab: "SK kabupaten/kota"}, null, {"aria-label": "Penerbit SK"});
    const sk = h("div", {class: "lb-sk-form"}, h("label", {class: "bn-isian"}, "Tingkat status", el.sk_tingkat), h("label", {class: "bn-isian"}, "Penerbit", el.sk_wilayah), kolomTeks("sk_nomor", "Nomor SK", {maxlength: "80"}),
      kolomTeks("sk_tgl", "Tanggal SK", {type: "date"}), kolomTeks("sk_mulai", "TMT mulai", {type: "date"}), kolomTeks("sk_selesai", "TMT selesai", {type: "date"}), kolomAngka("sk_ke", "Perpanjangan ke (0 = SK awal)", {inputmode: "numeric"}), kolomTeks("sk_tautan", "Tautan SK (https)", {maxlength: "300"}));
    el.skKirim = h("button", {type: "button", class: "bn-tombol"}, ikon("simpan"), "Simpan SK"); el.skKirim.addEventListener("click", simpanSk);
    sk.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); simpanSk(); } });   // Enter di sini tidak boleh mengirim formulir entri
    f.addEventListener("reset", () => { juklakDari = null; el.prasWadah.replaceChildren(); el.kebWadah.replaceChildren(); });
    return h("details", {class: "bn-blok lb-juklak"}, h("summary", {class: "lb-judul-blok"}, ikon("daftar"), "Rincian juklak (opsional)"),
      h("p", {class: "lb-p lb-kaki", teks: "Standar Juklak BNPB 7/2023. Semua boleh kosong. Seperti angka dampak, isian di sini menimpa entri sebelumnya, bukan menambah."}),
      bagian("Uraian kejadian", h("div", {class: "lb-angka"}, NARASI.map(([k, t, m]) => { el[k] = h("textarea", {name: k, maxlength: String(m), rows: m > 300 ? "3" : "1"}); return h("label", {class: "bn-isian"}, t, el[k]); })),
        h("div", {class: "lb-angka"}, kolomTeks("induk_kib", "KIB kejadian utama, bila lintas wilayah", {maxlength: "16", inputmode: "numeric"}))),
      bagian("Taksiran kerugian", kolomAngka("kerugian_juta", "Kerugian (juta rupiah)", {placeholder: "1.250,5"})),
      bagian("Jumlah terdampak", kolomAngka("terdampak_jiwa", "Terdampak total (jiwa)", {inputmode: "numeric"})),
      bagian("Korban terpilah menurut umur dan jenis kelamin (jiwa, L/P)", korban, h("p", {class: "lb-p lb-kaki", teks: "Jumlah terpilah tidak boleh melebihi total pada Dampak terkini."})),
      bagian("Kelompok rentan (jiwa)", h("div", {class: "lb-angka"}, Object.entries(RENTAN).map(([k, t]) => kolomAngka("rentan_" + k, t, {inputmode: "numeric"})))),
      bagian("Kerusakan prasarana dan layanan dasar", el.prasWadah, tbPras), bagian("Kebutuhan berjumlah (Dana, SDM, Sarana-prasarana, Logistik, Peralatan)", el.kebWadah, tbKeb),
      bagian("Sumber informasi (instansi saja, tanpa nama orang dan nomor telepon)", h("div", {class: "lb-angka"}, [0, 1, 2].map(i => kolomTeks("pemberi_" + i, "Pemberi informasi " + (i + 1), {maxlength: "80"})))),
      bagian("Tautan dokumentasi (https)", h("div", {class: "lb-angka"}, [0, 1, 2].map(i => kolomTeks("dok_" + i, "Tautan " + (i + 1), {maxlength: "300", inputmode: "url"})))),
      bagian("Keposkoan", h("div", {class: "lb-angka"}, h("label", {class: "bn-isian"}, "Posko", el.posko_ada), kolomTeks("posko_sk", "Nomor SK posko", {maxlength: "80"}), kolomTeks("posko_mulai", "Berlaku mulai", {type: "date"}), kolomTeks("posko_sampai", "Berlaku sampai", {type: "date"}))),
      bagian("SK status darurat kejadian terpilih", el.skInfo, el.skDaftar, sk, el.skKirim, el.skPesan));
  }
  /* -> {isi: medan untuk badan permintaan (hanya yang diisi), salah: teks galat atau ""} */
  function juklak() {
    const isi = {}; let salah = "";
    const n = (nama, judul) => { const v = angkaId(el[nama].value); if (v != null && (Number.isNaN(v) || v < 0)) salah ||= `${judul}: isi angka nol atau lebih`; return v; };
    for (const [k] of NARASI) { const v = el[k].value.trim().replace(/\s*\n\s*/g, " "); if (v) isi[k] = v; }
    const ik = el.induk_kib.value.trim(); if (ik) { if (!/^\d{16}$/.test(ik)) salah ||= "KIB kejadian utama harus 16 angka"; isi.induk_kib = ik; }
    const kj = n("kerugian_juta", "Kerugian"); if (kj != null) isi.kerugian_juta = kj;
    const korban = {};
    for (const [g, t] of KORBAN) for (const u of UMUR) for (const kel of ["L", "P"]) { const v = n(`k_${g}_${u}_${kel}`, `${t} ${u} ${kel}`); if (v != null) ((korban[g] ||= {})[u] ||= {})[kel] = v; }
    if (Object.keys(korban).length) isi.korban = korban;
    const td = n("terdampak_jiwa", "Terdampak"); if (td != null) isi.terdampak_jiwa = td;
    const rentan = {}; for (const k of Object.keys(RENTAN)) { const v = n("rentan_" + k, RENTAN[k]); if (v != null) rentan[k] = v; }
    if (Object.keys(rentan).length) isi.rentan = rentan;
    const pras = bacaBaris(el.prasWadah, ["kode", "tingkat", "jumlah", "kerugian_juta"]).filter(r => r.kode || r.jumlah).map(r => { const v = angkaId(r.jumlah), rugi = angkaId(r.kerugian_juta); if (!r.kode || v == null || Number.isNaN(v) || v < 0) salah ||= "Prasarana: pilih jenis dan isi jumlah angka"; if (rugi != null && (Number.isNaN(rugi) || rugi < 0)) salah ||= "Prasarana: taksiran kerugian harus angka nol atau lebih"; return {kode: r.kode, tingkat: r.tingkat || null, jumlah: v, ...rugi == null ? {} : {kerugian_juta: rugi}}; });
    if (pras.length) isi.prasarana = pras;
    const keb = bacaBaris(el.kebWadah, ["kelompok", "barang", "jumlah", "satuan"]).filter(r => r.kelompok || r.barang || r.jumlah).map(r => { const v = angkaId(r.jumlah); if (!r.kelompok || !r.barang || !r.satuan || !(v > 0)) salah ||= "Kebutuhan: isi kelompok, barang, jumlah lebih dari nol, dan satuan"; return {kelompok: r.kelompok, barang: r.barang, jumlah: v, satuan: r.satuan}; });
    if (keb.length) isi.kebutuhan_rinci = keb;
    const pem = [0, 1, 2].map(i => el["pemberi_" + i].value.trim()).filter(Boolean), dok = [0, 1, 2].map(i => el["dok_" + i].value.trim()).filter(Boolean);
    if (pem.length) isi.pemberi = pem; if (dok.length) isi.dokumentasi = dok;
    if (el.posko_ada.value) { const p = {ada: el.posko_ada.value === "ya"}; for (const [k, e] of [["sk", "posko_sk"], ["berlaku_mulai", "posko_mulai"], ["berlaku_sampai", "posko_sampai"]]) if (el[e].value.trim()) p[k] = el[e].value.trim(); isi.posko = p; }
    return {isi, salah};
  }
  /* t = entri_terkini kejadian terpilih: isi HANYA yang masih kosong (isian yang sudah diketik tidak ditimpa); t null = kembali ke kejadian baru, kosongkan semua. Draf lokal tidak menyimpan rincian juklak. */
  function isiJuklak(t) {
    const baru = !t, set = (nama, v) => { if (baru || !el[nama].value.trim()) el[nama].value = v == null ? "" : fIsi(v); };
    if (baru) { el.prasWadah.replaceChildren(); el.kebWadah.replaceChildren(); }
    for (const [k] of NARASI) if (baru || !el[k].value.trim()) el[k].value = t?.[k] || "";
    if (baru || !el.induk_kib.value.trim()) el.induk_kib.value = t?.induk_kib || "";
    set("kerugian_juta", t?.kerugian_juta); set("terdampak_jiwa", t?.korban?.terdampak_jiwa);
    for (const [g] of KORBAN) for (const u of UMUR) for (const kel of ["L", "P"]) set(`k_${g}_${u}_${kel}`, t?.korban?.[g]?.[u]?.[kel]);
    for (const k of Object.keys(RENTAN)) set("rentan_" + k, t?.rentan?.[k]);
    if (baru || !el.prasWadah.children.length) for (const v of t?.prasarana || []) barisPras(el.prasWadah, v);
    if (baru || !el.kebWadah.children.length) for (const v of t?.kebutuhan_rinci || []) barisKeb(el.kebWadah, v);
    for (let i = 0; i < 3; i++) for (const [n, v] of [["pemberi_", t?.pemberi?.[i]], ["dok_", t?.dokumentasi?.[i]]]) if (baru || !el[n + i].value.trim()) el[n + i].value = v || "";
    const sel = (n, v) => { if (baru || !el[n].value.trim()) el[n].value = v || ""; };
    sel("posko_ada", t?.posko ? (t.posko.ada ? "ya" : "tidak") : ""); sel("posko_sk", t?.posko?.sk); sel("posko_mulai", t?.posko?.berlaku_mulai); sel("posko_sampai", t?.posko?.berlaku_sampai);
  }
  async function muatSk() {
    const id = lanjutId; el.skDaftar.replaceChildren(); el.skKirim.disabled = !id; el.skPesan.textContent = "";
    el.skInfo.textContent = id ? "SK provinsi ditampilkan lebih dulu." : "Pilih kejadian pada Lanjutan dari kejadian untuk mencatat atau melihat SK status.";
    if (!id) return;
    const r = await api("GET", `/api/logbook/kejadian/${encodeURIComponent(id)}/sk`); if (id !== lanjutId) return;
    if (!r.ok) { el.skInfo.textContent = r.s === 503 ? "Data belum tersedia. Hubungi admin." : "Daftar SK belum bisa dimuat."; return; }
    el.skDaftar.replaceChildren(...(r.j.sk || []).map(x => h("li", {teks: `${x.wilayah === "prov" ? "Provinsi" : "Kabupaten/kota"}, ${SK_TINGKAT[x.tingkat] || x.tingkat}${x.perpanjangan_ke ? `, perpanjangan ke-${x.perpanjangan_ke}` : ""}, ${x.nomor}, TMT ${tglId(x.tmt_mulai)}${x.tmt_selesai ? " sampai " + tglId(x.tmt_selesai) : ""}`})));
    if (!(r.j.sk || []).length) el.skInfo.textContent = "Belum ada SK tercatat untuk kejadian ini.";
  }
  async function simpanSk() {
    const id = lanjutId; if (!id) { el.skPesan.textContent = "Pilih kejadian lanjutan dulu."; return; }
    const ke = angkaId(el.sk_ke.value), b = {tingkat: el.sk_tingkat.value, wilayah: el.sk_wilayah.value, nomor: el.sk_nomor.value.trim(), tgl_sk: el.sk_tgl.value || null, tmt_mulai: el.sk_mulai.value, tmt_selesai: el.sk_selesai.value || null, perpanjangan_ke: ke == null ? 0 : ke, tautan: el.sk_tautan.value.trim() || null};
    const galat = t => { el.skPesan.textContent = t; };
    if (!b.nomor || !b.tmt_mulai) return galat("Isi nomor SK dan TMT mulai.");
    if (ke != null && (!Number.isInteger(ke) || ke < 0)) return galat("Perpanjangan ke harus bilangan bulat nol atau lebih.");
    el.skKirim.disabled = true; const r = await api("POST", `/api/logbook/kejadian/${encodeURIComponent(id)}/sk`, b); el.skKirim.disabled = !lanjutId;
    if (!r.ok) return galat(r.j.galat || `SK gagal disimpan (${r.s}).`);
    for (const n of ["sk_nomor", "sk_tgl", "sk_mulai", "sk_selesai", "sk_ke", "sk_tautan"]) el[n].value = ""; muatSk(); el.skPesan.textContent = "SK tercatat.";   // muatSk membersihkan pesan lebih dulu
  }

  /* ---------- formulir ---------- */
  let kab = [], kecMap = {}, lanjutId = null, buka = [], el = {};
  const radio = (nama, nilai, teks, ik, cek) => h("label", null, h("input", {type: "radio", name: nama, value: nilai, checked: cek}), ikon(ik), teks);
  const cek = (nama, nilai, teks, ik) => h("label", null, h("input", {type: "checkbox", name: nama, value: nilai}), ikon(ik), teks);
  const opsi = (sel, daftar, kosongTeks) => { sel.replaceChildren(h("option", {value: "", teks: kosongTeks}), ...daftar.map(([v, t]) => h("option", {value: v, teks: t}))); };

  function bentuk() {
    const f = h("form", {class: "bn-form", autocomplete: "off", novalidate: true});
    const sel = (nama, judul) => { const s = h("select", {name: nama}); el[nama] = s; return h("label", {class: "bn-isian"}, judul, s); };
    const isi = (nama, judul, att) => { const i = h("input", {name: nama, autocomplete: "off", ...att}); el[nama] = i; return h("label", {class: "bn-isian"}, judul, i); };
    const lanj = h("select", {name: "lanjut"}); el.lanjut = lanj;
    el.pesanLanjut = h("p", {class: "lb-p", hidden: true});
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("daftar"), "Kejadian"),
      h("div", {class: "lb-seg", role: "radiogroup", "aria-label": "Jenis kejadian"}, JENIS.map(j => radio("jenis", j, namaJenis(j), j, false))),
      h("div", {class: "bn-baris"}, sel("prov", "Provinsi"), sel("kab", "Kabupaten/kota"), sel("kec", "Kecamatan"), sel("desa", "Desa/kelurahan")),
      h("div", {class: "lb-lanjut"}, h("label", {class: "bn-isian"}, "Lanjutan dari kejadian", lanj), el.pesanLanjut),
      el.daftarBuka = h("div", {class: "lb-buka"}), el.tutupWadah = h("div", {class: "lb-tutup", hidden: true}),
      h("div", {class: "bn-baris"}, isi("mulai", "Mulai kejadian (WIB)", {type: "datetime-local", max: wibLokal()}), isi("lat", "Lintang (opsional)", {inputmode: "decimal", placeholder: "-7,25"}), isi("lon", "Bujur (opsional)", {inputmode: "decimal", placeholder: "112,75"}))));
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("peringatan"), "Dampak terkini"),
      h("div", {class: "lb-angka"}, DAMPAK.map(([k, t, sat]) => { const i = h("input", {name: k, inputmode: k === "luas_ha" ? "decimal" : "numeric", autocomplete: "off", "aria-label": `${t} (${sat})`}); el[k] = i; return h("label", {class: "bn-isian", "data-d": k}, `${t} (${sat})`, i); })),
      el.peringatan = h("div", {class: "lb-peringatan", role: "alert", hidden: true}),
      h("p", {class: "lb-p lb-kaki", teks: "Isi angka terkini, bukan tambahan. Entri lanjutan menimpa angka sebelumnya. Kosongkan yang belum diketahui. Jiwa, KK, dan unit rumah berupa bilangan bulat."})));
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("akses"), "Kendala"), h("div", {class: "lb-chips lb-kendala"}, Object.entries(KENDALA).map(([k, t]) => cek("kendala", k, t, k)))));
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("logistik"), "Kebutuhan"), h("div", {class: "lb-chips"}, Object.entries(KEBUTUHAN).map(([k, t]) => cek("kebutuhan", k, t, k)))));
    f.append(rincian(f));
    const ins = h("select", {name: "sumber_instansi"}); el.sumber_instansi = ins; opsi(ins, INSTANSI.map(x => [x, x]), "Pilih sumber laporan");
    el.catatan = h("textarea", {name: "catatan", maxlength: "600", rows: "3"});
    el.pesan = h("p", {class: "bn-pesan", role: "status"});
    el.kirim = h("button", {class: "bn-tombol", type: "submit"}, ikon("simpan"), "Catat");
    el.draf = h("span", {class: "lb-draf"});
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("daftar"), "Catatan"),
      h("div", {class: "bn-baris"}, h("label", {class: "bn-isian"}, "Sumber laporan", ins), h("label", {class: "bn-isian"}, "Catatan singkat", el.catatan)),
      el.pesan, h("div", {class: "lb-aksi"}, el.kirim, h("button", {class: "bn-tombol sekunder", type: "button", id: "lbBersih"}, ikon("sapu"), "Kosongkan"), el.draf)));
    el.form = f; return f;
  }

  const kumpul = () => {
    const f = el.form, v = n => el[n].value.trim();
    return {jenis: f.querySelector('input[name="jenis"]:checked')?.value || "", prov: v("prov"), kab: v("kab"), kec: v("kec"), desa: v("desa"), lanjut: lanjutId, mulai: v("mulai"), lat: v("lat"), lon: v("lon"),
      dampak: Object.fromEntries(DAMPAK.map(([k]) => [k, v(k)])), kendala: [...f.querySelectorAll('input[name="kendala"]:checked')].map(x => x.value),
      kebutuhan: [...f.querySelectorAll('input[name="kebutuhan"]:checked')].map(x => x.value), sumber_instansi: v("sumber_instansi"), catatan: el.catatan.value.trim()};
  };
  const simpanDraf = tunda(() => { const d = kumpul(); const kosongSemua = !d.jenis && !d.kab && !d.catatan && !d.kendala.length && !d.kebutuhan.length && !Object.values(d.dampak).some(Boolean);
    if (kosongSemua) { hapusLokal(DRAF); el.draf.textContent = ""; return; }
    el.draf.textContent = simpanLokal(DRAF, d) ? "Draf tersimpan di perangkat ini" : "Draf tidak bisa disimpan (penyimpanan penuh atau diblokir)"; }, 400);

  /* ---------- wilayah berantai ---------- */
  const isiProv = () => opsi(el.prov, Object.entries(PROV).map(([k, t]) => [k, t]), "Pilih provinsi");
  const isiKab = () => opsi(el.kab, kab.filter(k => k.prov === el.prov.value).map(k => [k.kode, k.nama]), "Pilih kabupaten/kota");
  const dataKab = () => kab.find(k => k.kode === el.kab.value);
  /* kecamatan dan desa hanya kab terpilih (satu berkas kecil), bukan seluruh Indonesia */
  const muatKec = async () => { kecMap = {}; const k = dataKab(); if (!k) return false;
    try { const d = await desaKab(k); if (dataKab() !== k) return false; kecMap = d.kec; return true; } catch (e) { pesan("Daftar kecamatan belum bisa dimuat. Pilih kabupaten/kota lagi.", false); return false; } };
  const isiKec = () => opsi(el.kec, Object.keys(kecMap).map(x => [x, x]), "Pilih kecamatan");
  const isiDesa = () => opsi(el.desa, (kecMap[el.kec.value] || []).map(x => [x, x]), "Pilih desa/kelurahan");

  async function muatBuka() {
    lanjutId = null; buka = []; opsi(el.lanjut, [], "Kejadian baru (bukan lanjutan)"); el.pesanLanjut.hidden = true; muatSk(); gambarBuka();
    const k = dataKab(); if (!k) return;
    const r = await api("GET", "/api/logbook/buka?kab=" + encodeURIComponent(kunciKab(k)));
    if (el.kab.value !== k.kode) return;   // pengguna sudah pindah kab
    if (!r.ok) { el.pesanLanjut.hidden = false; el.pesanLanjut.textContent = r.s === 503 ? "Data belum tersedia. Hubungi admin." : "Daftar kejadian terbuka belum bisa dimuat."; return; }
    buka = r.j.kejadian || r.j.daftar || (Array.isArray(r.j) ? r.j : []);
    opsi(el.lanjut, buka.map(e => [e.id, `${namaJenis(e.jenis || "kejadian")}, ${[e.desa, e.kec].filter(Boolean).join(", ") || "tanpa desa"}, mulai ${tglPendek(e.mulai)}${e.perlu_tutup ? " (perlu ditutup)" : ""}`]), buka.length ? "Kejadian baru (bukan lanjutan)" : "Tidak ada kejadian terbuka 14 hari terakhir");
    gambarBuka();
  }
  /* ---------- tutup kejadian: tgl_tuntas dan kondisi_akhir WAJIB (POST /api/logbook/kejadian/:id/tutup) ---------- */
  const BLN_P = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglPendek = t => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(t || ""); return m ? `${Number(m[3])} ${BLN_P[Number(m[2]) - 1]} ${m[1]}` : ""; };
  /* -> teks galat atau "" (tanggal tidak sebelum mulai dan tidak di masa depan, kondisi 3-300 karakter); sama dengan aturan server */
  const periksaTutup = (tgl, kondisi, mulai, hariIni) => !/^\d{4}-\d\d-\d\d$/.test(tgl || "") ? "Isi tanggal tuntas." : tgl > hariIni ? "Tanggal tuntas tidak boleh di masa depan." : mulai && tgl < String(mulai).slice(0, 10) ? `Tanggal tuntas tidak boleh sebelum tanggal mulai (${tglPendek(mulai)}).`
    : String(kondisi || "").trim().length < 3 ? "Kondisi akhir wajib diisi, minimal 3 karakter." : String(kondisi).trim().length > 300 ? "Kondisi akhir maksimal 300 karakter." : "";
  function gambarBuka() {
    el.daftarBuka.replaceChildren(); el.tutupWadah.replaceChildren(); el.tutupWadah.hidden = true;
    if (!buka.length) return;
    el.daftarBuka.append(h("h3", {class: "lb-sub-judul", teks: "Kejadian terbuka di kabupaten/kota ini"}), ...buka.map(e => {
      const b = h("button", {type: "button", class: "bn-tombol sekunder", "data-tutup": e.id}, ikon("ok"), "Tutup kejadian"); b.addEventListener("click", () => formTutup(e));
      return h("div", {class: "lb-buka-baris", "data-buka": e.id}, pil(namaJenis(e.jenis || "lainnya"), "info", e.jenis || "lainnya"), h("span", {teks: `${[e.desa, e.kec].filter(Boolean).join(", ") || "tanpa desa"}, mulai ${tglPendek(e.mulai)}`}),
        e.perlu_tutup ? pil("Perlu ditutup", "bahaya", "peringatan") : null, b); }));
  }
  function formTutup(e) {
    const hari = wibHari(), min = String(e.mulai || "").slice(0, 10);
    const tgl = h("input", {type: "date", name: "tgl_tuntas", value: min > hari ? min : hari, max: hari, ...min ? {min} : {}, "aria-label": "Tanggal tuntas"});
    const kond = h("textarea", {name: "kondisi_akhir", rows: "3", maxlength: "300", "aria-label": "Kondisi akhir", placeholder: "Kondisi akhir wilayah, 3 sampai 300 karakter"});
    const pes = h("p", {class: "bn-pesan", role: "status"}), kirimTb = h("button", {type: "button", class: "bn-tombol"}, ikon("simpan"), "Tutup kejadian"), batalTb = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("sapu"), "Batal");
    const w = el.tutupWadah;
    const kirimTutup = async () => {
      if (kirimTb.disabled) return;   // Enter ganda tidak boleh POST ganda
      const g = periksaTutup(tgl.value, kond.value, e.mulai, wibHari()); if (g) { pes.textContent = g; pes.className = "bn-pesan galat"; return; }
      kirimTb.disabled = true; pes.textContent = "Menutup…"; pes.className = "bn-pesan";
      const r = await api("POST", `/api/logbook/kejadian/${encodeURIComponent(e.id)}/tutup`, {tgl_tuntas: tgl.value, kondisi_akhir: kond.value.trim()}); kirimTb.disabled = false;
      if (!r.ok) { pes.textContent = r.s === 503 ? "Data belum tersedia. Hubungi admin." : r.j.galat || `Gagal menutup (${r.s}).`; pes.className = "bn-pesan galat"; return; }
      await muatBuka(); pesan("Kejadian ditutup.", true); muatHari();
    };
    kirimTb.addEventListener("click", kirimTutup); batalTb.addEventListener("click", () => { w.replaceChildren(); w.hidden = true; });
    /* di dalam formulir catat: Enter dan ketikan di sini tidak boleh mengirim atau menyimpan draf formulir induk */
    w.onkeydown = ev => { if (ev.key === "Enter" && ev.target.tagName !== "TEXTAREA") { ev.preventDefault(); kirimTutup(); } };
    w.oninput = w.onchange = ev => ev.stopPropagation();
    w.replaceChildren(h("h3", {class: "lb-sub-judul", teks: `Tutup ${namaJenis(e.jenis || "lainnya")}, ${[e.desa, e.kec].filter(Boolean).join(", ") || "tanpa desa"}`}),
      h("div", {class: "bn-baris"}, h("label", {class: "bn-isian"}, "Tanggal tuntas", tgl), h("label", {class: "bn-isian"}, "Kondisi akhir (wajib)", kond)), h("div", {class: "lb-aksi"}, kirimTb, batalTb), pes);
    w.hidden = false; kond.focus();
  }
  let juklakDari = null;
  function pilihLanjut() {
    lanjutId = el.lanjut.value || null;
    const e = buka.find(x => x.id === lanjutId); el.pesanLanjut.hidden = !e;
    if (!e) { juklakDari = null; muatSk(); isiJuklak(null); return; }
    const r = el.form.querySelector(`input[name="jenis"][value="${CSS.escape(e.jenis || "")}"]`); if (r) r.checked = true;
    el.pesanLanjut.textContent = "Entri ini menambah catatan pada kejadian terpilih. Angka dampak yang kamu isi menimpa angka terakhir, bukan menjumlah.";
    const last = e.entri_terkini || e.entri_terakhir || e;   // GET /api/logbook/buka: entri_terkini (e.terakhir hanyalah waktu)
    for (const [k] of DAMPAK) if (last[k] != null && !el[k].value) el[k].value = fIsi(last[k]);
    if (juklakDari && juklakDari !== e.id) isiJuklak(null);   // pindah kejadian: buang rincian kejadian sebelumnya
    juklakDari = e.id; isiJuklak(e.entri_terkini); muatSk();
    periksaLive();
  }

  /* ---------- pemeriksa kewajaran ---------- */
  let lewat = [];
  function periksa() {
    const d = {}, out = [];
    for (const [k, t, sat, batas] of DAMPAK) { const n = angkaId(el[k].value); d[k] = n;
      if (n != null && Number.isNaN(n)) out.push({k, teks: `${t} (${sat}): "${el[k].value}" bukan angka`, keras: true});
      else if (n != null && n < 0) out.push({k, teks: `${t} (${sat}) tidak boleh negatif`, keras: true});
      else if (n != null && k !== "luas_ha" && !Number.isInteger(n)) out.push({k, teks: `${t} (${sat}) harus bilangan bulat`, keras: true});
      else if (n != null && n > batas) out.push({k, teks: `${t} (${sat}) ${F(n)} melewati batas sistem ${F(batas)} ${sat}`}); }
    if (d.mengungsi_kk != null && d.mengungsi_jiwa != null && d.mengungsi_kk > d.mengungsi_jiwa) out.push({k: "mengungsi_kk", teks: `Mengungsi ${F(d.mengungsi_kk)} KK lebih banyak dari ${F(d.mengungsi_jiwa)} jiwa`});
    return out;
  }
  function periksaLive() {
    lewat = periksa();
    for (const [k] of DAMPAK) el[k].closest("label").classList.toggle("lewat", lewat.some(x => x.k === k));
    const lunak = lewat.filter(x => !x.keras);
    el.peringatan.hidden = !lewat.length;
    if (!lewat.length) return;
    const yakin = el.peringatan.querySelector("input")?.checked || false;
    el.peringatan.replaceChildren(h("span", {teks: "Periksa angka ini dulu:"}), h("ul", null, lewat.map(x => h("li", {teks: x.teks}))),
      lunak.length && !lewat.some(x => x.keras) ? h("label", null, h("input", {type: "checkbox", id: "lbYakin", checked: yakin}), "Saya yakin angka ini benar") : null);
  }

  /* ---------- kirim ---------- */
  function badan() {
    const d = kumpul(), k = dataKab(), isi = {};
    for (const [n] of DAMPAK) { const v = angkaId(d.dampak[n]); if (v != null) isi[n] = v; }
    const b = {jenis: d.jenis, prov: PROV[d.prov] || d.prov, prov_kode: d.prov, kab: k ? tutup(k.nama) : "", kab_kode: k ? kunciKab(k) : "", kec: d.kec || null, desa: d.desa || null,
      mulai: d.mulai ? new Date(d.mulai + "+07:00").toISOString() : null, lat: d.lat ? angkaId(d.lat) : null, lon: d.lon ? angkaId(d.lon) : null, ...isi,
      kendala: d.kendala, kebutuhan: d.kebutuhan, catatan: d.catatan || null, sumber_instansi: d.sumber_instansi || null, yakin: !!document.getElementById("lbYakin")?.checked,
      kab_bps: k ? k.kode : undefined, ...juklak().isi};   // kab_bps = kode BPS 4 angka untuk KIB
    return b;
  }
  async function kirim(e) {
    e.preventDefault();
    const d = kumpul();
    const salah = !lanjutId && !d.jenis ? "Pilih jenis kejadian." : !d.kab ? "Pilih kabupaten/kota." : !lanjutId && !d.mulai ? "Isi waktu mulai kejadian." : "";
    if (salah) return pesan(salah, false);
    const jk = juklak(); if (jk.salah) return pesan(jk.salah, false);
    periksaLive();
    if (lewat.some(x => x.keras)) return pesan("Perbaiki angka yang bertanda merah.", false);
    if (lewat.length && !document.getElementById("lbYakin")?.checked) return pesan("Ada angka melewati batas sistem. Centang \"Saya yakin\" bila memang benar.", false);
    el.kirim.disabled = true; pesan("Menyimpan…", true);
    const b = badan(), r = lanjutId ? await api("POST", `/api/logbook/kejadian/${encodeURIComponent(lanjutId)}/entri`, b) : await api("POST", "/api/logbook/kejadian", b);
    el.kirim.disabled = false;
    if (!r.ok) return pesan(r.j.galat || (r.s === 503 ? "Data belum tersedia. Hubungi admin." : `Gagal menyimpan (${r.s}). Isianmu masih ada.`), false);
    pesan((lanjutId ? "Entri lanjutan tercatat." : "Kejadian tercatat.") + (r.j.entri?.ambang?.ya === false ? " Belum memenuhi ambang kejadian Juklak 7/2023, lengkapi dampaknya begitu datanya ada." : ""), true);
    hapusLokal(DRAF); bersihkan(false); muatHari();
  }
  const pesan = (t, ok) => { el.pesan.textContent = t; el.pesan.className = "bn-pesan " + (ok ? "ok" : "galat"); };
  function bersihkan(tanya = true) {
    if (tanya && !confirm("Kosongkan semua isian formulir dan hapus draf?")) return;
    el.form.reset(); lanjutId = null; buka = []; gambarBuka(); muatSk(); kecMap = {}; hapusLokal(DRAF); el.draf.textContent = ""; el.mulai.value = wibLokal();
    isiProv(); opsi(el.kab, [], "Pilih kabupaten/kota"); opsi(el.kec, [], "Pilih kecamatan"); opsi(el.desa, [], "Pilih desa/kelurahan"); opsi(el.lanjut, [], "Kejadian baru (bukan lanjutan)"); el.pesanLanjut.hidden = true;
    if (tanya) pesan("", true);
    periksaLive();
  }

  async function pulihkan() {
    const d = bacaLokal(DRAF); if (!d) { el.mulai.value = wibLokal(); return; }
    if (d.jenis) { const r = el.form.querySelector(`input[name="jenis"][value="${CSS.escape(d.jenis)}"]`); if (r) r.checked = true; }
    el.prov.value = d.prov || ""; isiKab(); el.kab.value = d.kab || ""; if (await muatKec()) { isiKec(); el.kec.value = d.kec || ""; isiDesa(); el.desa.value = d.desa || ""; }
    el.mulai.value = d.mulai || wibLokal(); el.lat.value = d.lat || ""; el.lon.value = d.lon || "";
    for (const [k] of DAMPAK) el[k].value = d.dampak?.[k] || "";
    for (const n of ["kendala", "kebutuhan"]) for (const x of el.form.querySelectorAll(`input[name="${n}"]`)) x.checked = (d[n] || []).includes(x.value);
    el.sumber_instansi.value = d.sumber_instansi || ""; el.catatan.value = d.catatan || "";
    el.draf.textContent = "Draf dipulihkan dari perangkat ini";
    if (d.kab) muatBuka().then(() => { if (d.lanjut && buka.some(x => x.id === d.lanjut)) { el.lanjut.value = d.lanjut; pilihLanjut(); } });
    periksaLive();
  }

  /* ---------- daftar hari ini ---------- */
  let tgl = wibHari(), boxHari;
  const ringkasDampak = e => {
    const o = [], a = (k, t) => { const v = Number(e[k]); if (v > 0) o.push(`${F(v)} ${t}`); };
    a("md", "meninggal"); a("hilang", "hilang"); a("luka", "luka"); a("mengungsi_jiwa", "jiwa mengungsi"); a("mengungsi_kk", "KK mengungsi"); a("rumah_rb", "rumah rusak berat"); a("rumah_rs", "rumah rusak sedang"); a("rumah_rr", "rumah rusak ringan"); a("rumah_terendam", "rumah terendam"); a("luas_ha", "ha terbakar");
    if (Number(e.korban?.terdampak_jiwa) > 0) o.push(`${F(e.korban.terdampak_jiwa)} jiwa terdampak`);
    return o.join(", ") || "belum ada angka dampak";
  };
  const larik = v => { if (Array.isArray(v)) return v; try { const j = JSON.parse(v || "[]"); return Array.isArray(j) ? j : []; } catch (e) { return []; } };
  async function muatHari(awal) {
    if (!awal) boxHari.replaceChildren(kosong("tunggu", "Memuat entri…"));
    const r = awal || await api("GET", "/api/logbook/hari?tgl=" + tgl);
    if (r.s === 401 || r.s === 403) return kartuMasuk(r.s);
    if (!r.ok) return boxHari.replaceChildren(kosong("peringatan", r.s === 503 ? "Tabel logbook belum dibuat di server. Migrasi 0088 menunggu pemilik." : r.s === 0 ? "Tidak ada sinyal. Isian formulir tetap aman sebagai draf." : `Entri belum bisa dimuat (${r.s}).`));
    const rows = r.j.entri || r.j.daftar || (Array.isArray(r.j) ? r.j : []);
    if (!rows.length) return boxHari.replaceChildren(kosong("daftar", "Belum ada entri untuk periode ini (07.00 sampai 07.00 WIB)."));
    const tb = h("tbody");
    for (const e of rows) {
      const wil = [e.desa, e.kec, String(e.kab || "").split("|").pop()].filter(Boolean).join(", ");
      const wk = e.waktu ? new Date(e.waktu).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"}).replace(".", ":") : "";
      const kd = larik(e.kendala);
      tb.append(h("tr", null, h("td", {teks: wk}), h("td", null, pil(namaJenis(e.jenis || "lainnya"), "info", e.jenis || "lainnya")), h("td", null, e.status === "tutup" ? pil("Ditutup", "ok", "ok") : pil("Buka", "tunggu", "tunggu")), h("td", {teks: wil}),
        h("td", null, ringkasDampak(e), e.ambang && !e.ambang.ya ? h("div", null, pil("Di bawah ambang Juklak 7/2023", "tunggu", "tunggu")) : null), h("td", null, h("div", {class: "lb-ikonbaris"}, kd.map(k => h("span", {title: KENDALA[k] || k}, ikon(k)))))));
    }
    boxHari.replaceChildren(h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Jam", "Jenis", "Status", "Wilayah", "Dampak", "Kendala"].map(t => h("th", {teks: t})))), tb)),
      h("p", {class: "lb-draf", teks: `${F(rows.length)} entri`}));
  }

  /* ---------- dummy (Super Admin saja) ---------- */
  async function dummy(aksi) {
    if (aksi === "hapus" && !confirm("Hapus SEMUA data dummy logbook? Data asli tidak tersentuh.")) return;
    const r = await api("POST", "/api/logbook/dummy", {aksi});
    if (!r.ok && !(aksi === "isi" && r.s === 409)) return pesan(r.s === 404 ? "Rute dummy logbook belum ada di server." : (r.j.galat || `Dummy gagal (${r.s}).`), false);
    location.reload();
  }
  async function tombolDummy(wadah) {
    const r = await api("GET", "/api/akademisi/saya");
    if (!r.ok || !r.j.super) return;
    wadah.append(h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "isi", title: "Isi data dummy logbook (kejadian dan entri hari ini)", "aria-label": "Isi data dummy"}, "🧪"),
      h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "hapus", title: "Hapus semua data dummy", "aria-label": "Hapus data dummy"}, "🧹"));
    wadah.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (b) dummy(b.dataset.dummy); });
  }

  /* ---------- mulai ---------- */
  async function mulai() {
    const cek0 = await api("GET", "/api/logbook/hari?tgl=" + tgl);
    if (cek0.s === 401 || cek0.s === 403) return kartuMasuk(cek0.s);
    const aksi = h("div", {class: "bn-aksi"}); boxHari = h("div");   // wadah tombol dummy Super Admin; Dokumen, Perencanaan, Operasi ada di menu Pusdalops atas
    const tglIn = h("input", {type: "date", value: tgl, max: wibHari(), "aria-label": "Tanggal laporan"});
    tglIn.addEventListener("change", () => { if (tglIn.value) { tgl = tglIn.value; muatHari(); } });
    const kolom = h("div", {class: "lb-kolom"}, bentuk(), h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("daftar"), "Entri periode laporan", h("span", {class: "lb-kanan"}, tglIn)), boxHari));
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Logbook Pusdalops"}), aksi), ...window.LogbookTurunan.pasang(kolom), kolom);
    isiProv(); opsi(el.kab, [], "Pilih kabupaten/kota"); opsi(el.kec, [], "Pilih kecamatan"); opsi(el.desa, [], "Pilih desa/kelurahan"); opsi(el.lanjut, [], "Kejadian baru (bukan lanjutan)");
    el.form.addEventListener("submit", kirim);
    el.form.addEventListener("input", () => { periksaLive(); simpanDraf(); });
    el.form.addEventListener("change", simpanDraf);
    el.prov.addEventListener("change", () => { isiKab(); kecMap = {}; opsi(el.kec, [], "Pilih kecamatan"); opsi(el.desa, [], "Pilih desa/kelurahan"); muatBuka(); });
    el.kab.addEventListener("change", async () => { opsi(el.kec, [], "Memuat kecamatan…"); opsi(el.desa, [], "Pilih desa/kelurahan"); muatBuka(); if (await muatKec()) isiKec(); else opsi(el.kec, [], "Pilih kecamatan"); });
    el.kec.addEventListener("change", isiDesa);
    el.lanjut.addEventListener("change", pilihLanjut);
    document.getElementById("lbBersih").addEventListener("click", () => bersihkan(true));
    tombolDummy(aksi);
    muatHari(cek0);
    el.mulai.value = wibLokal();
    el.pesan.textContent = "Memuat daftar wilayah…";
    try { const w = await muat(); kab = w.kab; el.pesan.textContent = ""; pulihkan(); }
    catch (er) { pesan("Daftar wilayah belum bisa dimuat. Muat ulang halaman.", false); }
  }
  mulai();
})();
