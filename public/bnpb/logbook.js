/* Logbook Pusdalops: catat kejadian terstruktur sesuai Kontrak L1 (docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md).
   API: POST /api/logbook/kejadian, POST /api/logbook/kejadian/:id/entri, GET /api/logbook/buka?kab=, GET /api/logbook/hari?tgl=.
   Akses staf (sesi_staf berperan pusdalops/koordalops/pimpinan) atau admin; layar hanya memeriksa balasan API (401/403 -> tautan masuk).
   Draf formulir disimpan di localStorage supaya isian setengah jadi tidak hilang. Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {PROV, ikon, h, F, label, namaJenis, urutJenis, muat, desaKab, kunciKab, tutup} = window.Wilayah;
  const app = document.getElementById("app"), DRAF = "logbook_draf_v1";
  /* sama dengan JENIS di src/logbook.js (daftar putih worker); urutan resmi dari Wilayah. Jenis baru (gelombang_pasang dst) menunggu worker menerimanya. */
  const JENIS = ["banjir", "longsor", "cuaca", "karhutla", "kebakaran_permukiman", "gempabumi", "gunungapi", "kekeringan", "kecelakaan", "kegagalan_teknologi", "konflik_sosial", "lainnya"].sort(urutJenis);
  const KENDALA = {akses: "Akses putus", logistik: "Logistik/BBM", sinyal: "Sinyal putus", air: "Sumber air", personel: "Personel kurang", alat_berat: "Alat berat", gambut: "Gambut", cuaca: "Cuaca", data: "Data belum ada", dana: "Dana", malam: "Malam hari", sosial: "Sosial", listrik: "Listrik padam", angin: "Angin kencang"};
  const KEBUTUHAN = {makanan: "Makanan", tenda: "Tenda", sandang: "Sandang", air_bersih: "Air bersih", obat: "Obat", perahu: "Perahu", material: "Material", alat_berat: "Alat berat", pompa: "Pompa", dana: "Dana"};
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
      h("a", {class: "bn-tombol", href: "/admin/pantau", teks: "Masuk staf"})));
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
      h("div", {class: "bn-baris"}, isi("mulai", "Mulai kejadian (WIB)", {type: "datetime-local", max: wibLokal()}), isi("lat", "Lintang (opsional)", {inputmode: "decimal", placeholder: "-7,25"}), isi("lon", "Bujur (opsional)", {inputmode: "decimal", placeholder: "112,75"}))));
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("peringatan"), "Dampak terkini"),
      h("div", {class: "lb-angka"}, DAMPAK.map(([k, t, sat]) => { const i = h("input", {name: k, inputmode: k === "luas_ha" ? "decimal" : "numeric", autocomplete: "off", "aria-label": `${t} (${sat})`}); el[k] = i; return h("label", {class: "bn-isian", "data-d": k}, `${t} (${sat})`, i); })),
      el.peringatan = h("div", {class: "lb-peringatan", role: "alert", hidden: true}),
      h("p", {class: "lb-p lb-kaki", teks: "Isi angka terkini, bukan tambahan. Entri lanjutan menimpa angka sebelumnya. Kosongkan yang belum diketahui. Jiwa, KK, dan unit rumah berupa bilangan bulat."})));
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("akses"), "Kendala"), h("div", {class: "lb-chips lb-kendala"}, Object.entries(KENDALA).map(([k, t]) => cek("kendala", k, t, k)))));
    f.append(h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon("logistik"), "Kebutuhan"), h("div", {class: "lb-chips"}, Object.entries(KEBUTUHAN).map(([k, t]) => cek("kebutuhan", k, t, k)))));
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
    lanjutId = null; buka = []; opsi(el.lanjut, [], "Kejadian baru (bukan lanjutan)"); el.pesanLanjut.hidden = true;
    const k = dataKab(); if (!k) return;
    const r = await api("GET", "/api/logbook/buka?kab=" + encodeURIComponent(kunciKab(k)));
    if (el.kab.value !== k.kode) return;   // pengguna sudah pindah kab
    if (!r.ok) { el.pesanLanjut.hidden = false; el.pesanLanjut.textContent = r.s === 503 ? "Tabel logbook belum dibuat di server (migrasi menunggu pemilik)." : "Daftar kejadian terbuka belum bisa dimuat."; return; }
    buka = r.j.kejadian || r.j.daftar || (Array.isArray(r.j) ? r.j : []);
    opsi(el.lanjut, buka.map(e => [e.id, `${namaJenis(e.jenis || "kejadian")}, ${[e.desa, e.kec].filter(Boolean).join(", ") || "tanpa desa"}, mulai ${String(e.mulai || "").slice(0, 10)}`]), buka.length ? "Kejadian baru (bukan lanjutan)" : "Tidak ada kejadian terbuka 14 hari terakhir");
  }
  function pilihLanjut() {
    lanjutId = el.lanjut.value || null;
    const e = buka.find(x => x.id === lanjutId); el.pesanLanjut.hidden = !e;
    if (!e) return;
    const r = el.form.querySelector(`input[name="jenis"][value="${CSS.escape(e.jenis || "")}"]`); if (r) r.checked = true;
    el.pesanLanjut.textContent = "Entri ini menambah catatan pada kejadian terpilih. Angka dampak yang kamu isi menimpa angka terakhir, bukan menjumlah.";
    const last = e.terakhir || e.entri_terakhir || e;
    for (const [k] of DAMPAK) if (last[k] != null && !el[k].value) el[k].value = F(last[k]);
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
      kendala: d.kendala, kebutuhan: d.kebutuhan, catatan: d.catatan || null, sumber_instansi: d.sumber_instansi || null, yakin: !!document.getElementById("lbYakin")?.checked};
    return b;
  }
  async function kirim(e) {
    e.preventDefault();
    const d = kumpul();
    const salah = !lanjutId && !d.jenis ? "Pilih jenis kejadian." : !d.kab ? "Pilih kabupaten/kota." : !lanjutId && !d.mulai ? "Isi waktu mulai kejadian." : "";
    if (salah) return pesan(salah, false);
    periksaLive();
    if (lewat.some(x => x.keras)) return pesan("Perbaiki angka yang bertanda merah.", false);
    if (lewat.length && !document.getElementById("lbYakin")?.checked) return pesan("Ada angka melewati batas sistem. Centang \"Saya yakin\" bila memang benar.", false);
    el.kirim.disabled = true; pesan("Menyimpan…", true);
    const b = badan(), r = lanjutId ? await api("POST", `/api/logbook/kejadian/${encodeURIComponent(lanjutId)}/entri`, b) : await api("POST", "/api/logbook/kejadian", b);
    el.kirim.disabled = false;
    if (!r.ok) return pesan(r.j.galat || (r.s === 503 ? "Tabel logbook belum dibuat di server (migrasi menunggu pemilik)." : `Gagal menyimpan (${r.s}). Isianmu masih ada.`), false);
    pesan(lanjutId ? "Entri lanjutan tercatat." : "Kejadian tercatat.", true);
    hapusLokal(DRAF); bersihkan(false); muatHari();
  }
  const pesan = (t, ok) => { el.pesan.textContent = t; el.pesan.className = "bn-pesan " + (ok ? "ok" : "galat"); };
  function bersihkan(tanya = true) {
    if (tanya && !confirm("Kosongkan semua isian formulir dan hapus draf?")) return;
    el.form.reset(); lanjutId = null; kecMap = {}; hapusLokal(DRAF); el.draf.textContent = ""; el.mulai.value = wibLokal();
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
        h("td", {teks: ringkasDampak(e)}), h("td", null, h("div", {class: "lb-ikonbaris"}, kd.map(k => h("span", {title: KENDALA[k] || k}, ikon(k)))))));
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
    const aksi = h("div", {class: "bn-aksi"}); boxHari = h("div");
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
