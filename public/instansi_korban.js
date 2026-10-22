/* Instansi: tab Korban (/instansi). Modul SISIP terpisah seperti instansi_alat.js: menambah satu tombol tab dan satu panel, tanpa menyentuh state instansi.js.
   Akun aktif melaporkan korban jiwa (meninggal, luka berat, hilang) lewat form cepat untuk ponsel: waktu, lokasi (GPS perangkat atau tugas api terkait), jenis bencana, tiga jumlah,
   kategori, penyebab, kronologi singkat, sumber, nama korban opsional, foto dokumen opsional. Daftar di bawahnya memuat laporan akun ini dan statusnya (dilaporkan, terverifikasi, dikoreksi).
   PRIVASI: nama korban hanya terlihat moderator dan staf Pusdalops; sesudah dikirim, nama TIDAK ditampilkan lagi di sini. Semua wewenang dicek di Worker (src/korban.js).
   Jalur API (hanya /api/instansi: cookie sesi instansi tidak dikirim ke jalur lain): GET dan POST /api/instansi/korban, POST /api/instansi/foto-korban/:id. INP: tombol berubah seketika, daftar digambar sesudah satu frame. CSP: tanpa skrip/gaya inline, teks data lewat textContent. */
(() => {
  "use strict";
  /* daftar tetap: sama dengan src/korban.js dan CHECK di migrations/0034_korban_p3k.sql (dijaga korban.test.mjs); label asli dibaca dari kamus server, ini cadangan urutan */
  const BENCANA = ["karhutla", "banjir", "gempa", "cuaca", "udara", "gunungapi", "kekeringan", "lainnya"];
  const KATEGORI = ["warga", "petugas_pemadam", "relawan", "lainnya"], PENYEBAB = ["terbakar", "asap_ispa", "tenggelam", "kecelakaan_tugas", "lainnya"], SUMBER = ["laporan_langsung", "rs", "kepolisian"];
  const STATUS = {dilaporkan: "Menunggu verifikasi", terverifikasi: "Terverifikasi", dikoreksi: "Dikoreksi, menunggu verifikasi ulang"};
  const MAKS_FOTO = 1.4 * 1048576;
  const el = id => document.getElementById(id);
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else if (k === "value") e.value = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const ganti = (n, ...a) => n.replaceChildren(...a.flat().filter(x => x != null && x !== false));
  const api = async (metode, url, body) => {
    const raw = body instanceof Blob, hd = {...(metode === "POST" ? {"x-pb": "1"} : {}), ...(body === undefined || raw ? {} : {"content-type": "application/json"})};
    try { const r = await fetch(url, {method: metode, headers: hd, body: body === undefined ? undefined : raw ? body : JSON.stringify(body)}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "Tidak ada sinyal. Coba lagi saat sinyal kembali."}}; }
  };
  const galatTeks = r => r.j?.galat || (r.status === 503 ? "Fitur laporan korban belum diaktifkan di server." : `Gagal (${r.status}). Coba lagi sebentar lagi.`);
  const sesudahCat = fn => { let jalan = false; const f = () => { if (!jalan) { jalan = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(f)); setTimeout(f, 120); };
  const waktu = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const nowWib = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 16);   // nilai awal datetime-local (jam WIB)
  const ringkas = k => [[k.meninggal, "meninggal"], [k.luka_berat, "luka berat"], [k.hilang, "hilang"]].filter(([n]) => n > 0).map(([n, l]) => `${fmt(n)} ${l}`).join(", ");
  let panel = null, D = null, tugas = null, sudahBuka = false, sedangKirim = false;
  const lab = (t, isi, id) => h("label", {for: id}, t, isi);
  const nilai = (kamus, k) => kamus?.[k] ?? k;

  /* ---------- tab ---------- */
  const LAIN = ["tabTugas", "tabKontak", "tabAlat", "tabLaporan"];
  function pasang() {
    const bar = el("tab"), isi = el("isi"); if (!bar || !isi || el("tabKorbanTombol")) return;
    const b = h("button", {type: "button", id: "tabKorbanTombol", "aria-pressed": "false"}, "Korban");
    panel = h("div", {id: "tabKorban", hidden: true}); bar.append(b); isi.append(panel);
    b.addEventListener("click", () => { for (const x of bar.children) x.setAttribute("aria-pressed", String(x === b)); for (const id of LAIN) if (el(id)) el(id).hidden = true; panel.hidden = false; if (!sudahBuka) { sudahBuka = true; muat(); } });
    /* tab lain dibuka oleh instansi.js atau modul sisip lain: panel ini menyingkir */
    new MutationObserver(() => { if (!panel.hidden && LAIN.some(id => el(id) && !el(id).hidden)) { panel.hidden = true; b.setAttribute("aria-pressed", "false"); } }).observe(isi, {attributes: true, attributeFilter: ["hidden"], subtree: true});
  }
  const awasi = () => {
    const u = el("vUtama"); if (!u) return;
    const f = () => { if (!u.hidden) pasang(); else { D = tugas = null; sudahBuka = false; } };
    new MutationObserver(f).observe(u, {attributes: true, attributeFilter: ["hidden"]}); f();
  };

  /* ---------- muat dan gambar ---------- */
  async function muat(senyap) {
    if (!senyap) ganti(panel, h("p", {class: "kb-redup", role: "status", teks: "Memuat laporan korban…"}));
    const r = await api("GET", "/api/instansi/korban");
    if (!r.ok) return ganti(panel, h("div", {class: "kb-kosong galat"}, h("p", {teks: galatTeks(r)}), h("button", {type: "button", class: "kb-btn utama", "data-a": "ulang", teks: "Coba lagi"})));
    D = r.j; sesudahCat(gambar);
  }
  function gambar() {
    const belum = D.korban.filter(k => k.status !== "terverifikasi").length;
    ganti(panel, h("div", {class: "kb-atas"}, h("p", {class: "kb-redup", teks: D.korban.length ? `${fmt(D.korban.length)} laporan, ${fmt(belum)} menunggu verifikasi Pusdalops.` : "Belum ada laporan korban dari akun ini."}),
      h("button", {type: "button", class: "kb-btn utama", "data-a": "baru", teks: "Lapor korban"})),
      h("p", {id: "kbPesan", class: "kb-pesan", role: "status"}), h("div", {id: "kbForm"}),
      D.korban.length ? h("ul", {class: "kb-daftar"}, D.korban.map(kartu)) : null);
  }
  function kartu(k) {
    return h("li", {class: "kb-kartu " + k.status},
      h("div", {class: "kb-baris"}, h("b", {teks: ringkas(k)}), h("span", {class: "kb-pil " + k.status, teks: STATUS[k.status]}), k.dummy ? h("span", {class: "kb-pil dummy", teks: "DUMMY"}) : null),
      h("p", {class: "kb-redup", teks: `${waktu(k.waktu_kejadian)}, ${k.kab ? k.kab + ", " : ""}${k.prov_nama}. ${nilai(D.kamus.kategori, k.kategori)}, ${nilai(D.kamus.penyebab, k.penyebab).toLowerCase()}. ${nilai(D.kamus.bencana, k.bencana)}.`}),
      k.kronologi ? h("p", {class: "kb-redup", teks: k.kronologi}) : null,
      h("p", {class: "kb-redup", teks: `Sumber: ${nilai(D.kamus.sumber, k.sumber)}.${k.ada_nama ? " Nama korban tercatat dan hanya terlihat Pusdalops." : ""}${k.foto ? " Ada foto dokumen." : ""}`}));
  }
  const pesan = (t, k) => { const p = el("kbPesan"); if (p) { p.textContent = t || ""; p.className = "kb-pesan " + (k || ""); } };

  /* ---------- form cepat ---------- */
  const seg = (nama, daftar, kamus, awal) => h("div", {class: "kb-seg", role: "group", "aria-label": nama, "data-seg": nama}, daftar.map(k => h("button", {type: "button", "data-a": "pilih", "data-seg": nama, "data-v": k, "aria-pressed": String(k === awal)}, nilai(kamus, k))));
  const cacah = (id, judul) => h("div", {class: "kb-cacah"}, h("span", {teks: judul}), h("div", {class: "kb-stepper", role: "group", "aria-label": judul},
    h("button", {type: "button", "data-a": "kurang", "data-id": id, "aria-label": `Kurangi ${judul}`}, "−"), h("input", {id, inputmode: "numeric", value: "0", autocomplete: "off", "aria-label": judul}), h("button", {type: "button", "data-a": "tambah", "data-id": id, "aria-label": `Tambah ${judul}`}, "+")));
  function formBaru() {
    const f = h("form", {class: "kb-form", novalidate: true, id: "kbFormLapor"}), K = D.kamus;
    f.dataset.kategori = ""; f.dataset.penyebab = ""; f.dataset.sumber = "laporan_langsung"; f.dataset.sumber_lokasi = "manual";
    f.dataset.klien = "k" + crypto.randomUUID().replace(/-/g, "");   // satu per form, tetap sama sampai sukses: kirim ulang (ketuk ganda, sinyal putus) tidak menggandakan laporan
    const tugasSel = h("select", {id: "kbTugas"}, h("option", {value: "", teks: "Tidak terkait tugas api"}));
    if (!tugas) api("GET", "/api/instansi/tugas").then(r => { tugas = r.ok ? r.j.tugas : []; const s = el("kbTugas"); if (s) for (const t of tugas) s.append(h("option", {value: t.id, teks: `${t.kec ? t.kec + ", " : ""}${t.kab}`})); });
    else for (const t of tugas) tugasSel.append(h("option", {value: t.id, teks: `${t.kec ? t.kec + ", " : ""}${t.kab}`}));
    const bencana = h("select", {id: "kbBencana"}, ...BENCANA.map(k => h("option", {value: k, teks: nilai(K.bencana, k), selected: k === "karhutla"})));
    const prov = D.prov.length > 1 ? lab("Provinsi", h("select", {id: "kbProv"}, ...D.prov.map(p => h("option", {value: p.kode, teks: p.nama}))), "kbProv") : h("input", {type: "hidden", id: "kbProv", value: D.prov[0]?.kode ?? ""});
    f.append(h("h3", {teks: "Lapor korban jiwa"}), h("p", {class: "kb-redup", teks: "Isi secepatnya, boleh dilengkapi nanti lewat Pusdalops. Laporan langsung masuk Meja Pantau Pusdalops sebagai prioritas tertinggi."}),
      lab("Waktu kejadian (WIB)", h("input", {id: "kbWaktu", type: "datetime-local", value: nowWib(), max: nowWib()}), "kbWaktu"),
      h("fieldset", {class: "kb-lokasi"}, h("legend", {teks: "Lokasi"}), h("div", {class: "kb-aksi"}, h("button", {type: "button", class: "kb-btn", "data-a": "gps", teks: "Pakai GPS perangkat"})), h("p", {class: "kb-redup", id: "kbLokInfo", teks: "GPS opsional. Tanpa GPS, laporan memakai provinsi dan kabupaten di bawah."}),
        lab("Atau pilih tugas api terkait", tugasSel, "kbTugas"), prov, D.tingkat === "kab" ? null : lab("Kabupaten atau kota (boleh kosong)", h("input", {id: "kbKab", maxlength: "60", autocomplete: "off"}), "kbKab"),
        h("input", {type: "hidden", id: "kbLat"}), h("input", {type: "hidden", id: "kbLon"})),
      lab("Jenis bencana", bencana, "kbBencana"),
      h("div", {class: "kb-tiga"}, cacah("kbMd", "Meninggal"), cacah("kbLb", "Luka berat"), cacah("kbHl", "Hilang")),
      h("p", {class: "kb-redup", teks: "Kategori korban"}), seg("kategori", KATEGORI, K.kategori, ""), h("p", {class: "kb-redup", teks: "Penyebab"}), seg("penyebab", PENYEBAB, K.penyebab, ""), h("p", {class: "kb-redup", teks: "Sumber atau verifikasi"}), seg("sumber", SUMBER, K.sumber, "laporan_langsung"),
      lab("Kronologi singkat (jangan tulis nama korban di sini)", h("textarea", {id: "kbKron", rows: "3", maxlength: "600"}), "kbKron"),
      lab("Nama korban (boleh kosong, hanya terlihat moderator dan Pusdalops)", h("input", {id: "kbNama", maxlength: "300", autocomplete: "off"}), "kbNama"),
      lab("Foto dokumen (boleh kosong)", h("input", {id: "kbFoto", type: "file", accept: "image/jpeg,image/webp,image/*"}), "kbFoto"),
      h("p", {class: "kb-pesan galat", id: "kbGalat", role: "alert"}), h("div", {class: "kb-aksi"}, h("button", {type: "submit", class: "kb-btn utama", teks: "Kirim laporan"}), h("button", {type: "button", class: "kb-btn", "data-a": "batal", teks: "Batal"})));
    f.addEventListener("submit", kirim);
    return f;
  }
  const kecil = f => window.fotoKecil(f, MAKS_FOTO);

  async function kirim(e) {
    e.preventDefault(); if (sedangKirim) return; const f = e.currentTarget, b = f.querySelector("[type=submit]"), galat = t => { el("kbGalat").textContent = t; };
    const n = id => Number(el(id).value || 0);
    if (!f.dataset.kategori || !f.dataset.penyebab) return galat("Pilih kategori korban dan penyebab.");
    if (n("kbMd") + n("kbLb") + n("kbHl") < 1) return galat("Isi minimal satu korban: meninggal, luka berat, atau hilang.");
    const w = Date.parse(el("kbWaktu").value + ":00+07:00"); if (!Number.isFinite(w)) return galat("Isi waktu kejadian.");
    sedangKirim = true; b.disabled = true; galat("");
    const o = {klien_id: f.dataset.klien, waktu_kejadian: w, bencana: el("kbBencana").value, meninggal: n("kbMd"), luka_berat: n("kbLb"), hilang: n("kbHl"), kategori: f.dataset.kategori, penyebab: f.dataset.penyebab, sumber: f.dataset.sumber, kronologi: el("kbKron").value, nama_korban: el("kbNama").value};
    if (el("kbTugas").value) o.tugas_id = el("kbTugas").value;
    else { o.prov = el("kbProv").value; if (el("kbKab")) o.kab = el("kbKab").value; if (el("kbLat").value) { o.lat = el("kbLat").value; o.lon = el("kbLon").value; o.sumber_lokasi = f.dataset.sumber_lokasi; } }
    const r = await api("POST", "/api/instansi/korban", o); sedangKirim = false;
    if (!r.ok) { b.disabled = false; return galat(galatTeks(r)); }
    /* duplikat = laporan sudah ada (foto menyertai kiriman pertama): jangan unggah ulang */
    let fotoGalat = ""; const berkas = el("kbFoto").files[0];
    if (berkas && !r.j.duplikat) { const k = await kecil(berkas); if (!k) fotoGalat = " Foto terlalu besar atau tidak terbaca, laporan tersimpan tanpa foto."; else { const u = await api("POST", "/api/instansi/foto-korban/" + r.j.id, k); if (!u.ok) fotoGalat = " Foto belum terunggah: " + galatTeks(u); } }
    await muat(true); pesan((r.j.duplikat ? "Laporan yang sama sudah terkirim sebelumnya." : "Laporan terkirim ke Pusdalops.") + fotoGalat, fotoGalat ? "galat" : "ok");
  }
  function gpsIsi() {
    const info = el("kbLokInfo"); if (!navigator.geolocation) { info.textContent = "Perangkat ini tidak menyediakan GPS. Pilih tugas api atau isi provinsi."; return; }
    info.textContent = "Mencari lokasi perangkat…";
    navigator.geolocation.getCurrentPosition(p => { el("kbLat").value = p.coords.latitude.toFixed(5); el("kbLon").value = p.coords.longitude.toFixed(5); el("kbFormLapor").dataset.sumber_lokasi = "gps"; info.textContent = `Lokasi GPS terisi (akurasi sekitar ${Math.round(p.coords.accuracy)} m).`; },
      () => { info.textContent = "Lokasi tidak bisa dibaca. Beri izin lokasi, atau pilih tugas api dan provinsi."; }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
  }

  /* ---------- aksi ---------- */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-a]"); if (!t || !panel || !panel.contains(t)) return;
    const a = t.dataset.a, f = t.closest("form");
    if (a === "ulang") return muat();
    if (a === "baru") { const w = el("kbForm"); w.replaceChildren(formBaru()); w.scrollIntoView({behavior: "smooth", block: "start"}); return; }
    if (a === "batal") return el("kbForm").replaceChildren();
    if (a === "gps") return gpsIsi();
    if (a === "pilih") { f.dataset[t.dataset.seg] = t.dataset.v; for (const b of f.querySelectorAll(`[data-seg=${t.dataset.seg}] button`)) b.setAttribute("aria-pressed", String(b === t)); return; }
    if (a === "kurang" || a === "tambah") { const i = el(t.dataset.id), v = (Number(i.value) || 0) + (a === "tambah" ? 1 : -1); i.value = String(Math.max(0, Math.min(100000, v))); }
  });
  awasi();
})();
