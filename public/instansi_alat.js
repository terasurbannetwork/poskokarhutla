/* Instansi: tab Peralatan (/instansi). Modul TERPISAH dari instansi.js (yang sedang disapu desainnya): menyisipkan satu tombol tab dan satu panel, tanpa menyentuh state instansi.js.
   Akun aktif mengelola gudang dan alat miliknya: gudang (pin peta atau GPS), alat per kategori (jumlah +/-, kondisi tiga tombol), "Data masih sama, tandai sudah dicek" per gudang (pembaruan 30 hari),
   mengerahkan alat siap ke tugas api, dan melihat ringkasan alat siap di wilayah (tanpa PIC pihak lain). Semua wewenang dicek di Worker (src/inventaris.js).
   Pengait untuk form kabar tindakan: window.AlatInv.siap() mengembalikan alat siap milik akun; kirim id-nya sebagai `alat_inventaris` di POST /api/instansi/kabar/:id.
   P3K dan medis (migrasi 0034): tiap gudang punya dua kelompok, "Pemadaman" (alat) dan "P3K dan medis" (barang habis pakai: jumlah, satuan, kedaluwarsa, ambang; tombol Dipakai mengurangi stok dengan jejak tugas api).
   Tanpa 0034 server mengirim p3k_aktif false dan kelompok P3K tidak digambar.
   INP: tombol berubah seketika, isi berat digambar sesudah satu frame. CSP: tanpa skrip/gaya inline, teks data lewat textContent. */
(() => {
  "use strict";
  const IKON = {pompa: "💧", selang_1_5: "🪢", selang_2_5: "🪢", nozzle: "🚿", jet_shooter_lance: "🎯", tangki_fleksibel: "🛢️", mobil_tangki: "🚛", mobil_pemadam: "🚒", motor_trail: "🏍️",
    alat_berat: "🚜", drone_termal: "🛸", genset: "🔌", perahu: "🚤", apd_set: "🦺", scba: "😷", kepyok_garu: "🧹", pompa_punggung: "🎒", ht_radio: "📻", tenda: "⛺", lainnya: "📦"};
  /* P3K dan medis: sama dengan CHECK p3k di migrations/0034_korban_p3k.sql dan KATEGORI_P3K di src/inventaris.js (dijaga inventaris.test.mjs) */
  const IKON_P3K = {kotak_p3k: "🧰", tandu: "🛏️", tabung_oksigen: "🫁", regulator: "🔧", masker_n95: "😷", obat_tetes_mata: "👁️", salep_luka_bakar: "🧴", infus_oralit: "💧", aed: "❤️", lainnya: "➕"};
  const SATUAN_STD = {kotak_p3k: "kotak", masker_n95: "buah", obat_tetes_mata: "buah", salep_luka_bakar: "buah", infus_oralit: "liter"};
  const SATUAN = ["unit", "kotak", "buah", "liter"];
  const KOND = {baik: "Baik", rusak_ringan: "Rusak ringan", rusak_berat: "Rusak berat"}, STAT = {siap: "Siap", dikerahkan: "Dikerahkan", servis: "Servis"};
  const KELAS = {tekanan_tinggi: "Tekanan tinggi", debit_besar: "Debit besar", jinjing_ringan: "Jinjing ringan", portabel_besar: "Portabel besar"};
  const CDN = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.";
  const SRI_JS = "sha512-dXgoFR02YHJ9Fa29P3D/1umNaZ0EXS2N0w29Lm3b/1BK8UDLMdLWDFwuujIyJJdU27/PLuk3dmS1V9NO8ABX1A==", SRI_CSS = "sha512-qN/uDg9bS3IAldWq4lswyC+9ZSoShtfyNDp+FaJhdtXJqdgubHA+s4nB8BajW0m90Y0+RBGbqu2anzbxiQYdHA==";
  const MAKS_FOTO = 1.4 * 1048576, HARI = 864e5;
  const el = id => document.getElementById(id);
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const pesan = (t, k) => { const p = el("pesan"); if (p) { p.textContent = t || ""; p.className = "lp-pesan " + (k || ""); } };
  const api = async (metode, url, body) => {
    const raw = body instanceof Blob, hd = {...(metode === "POST" ? {"x-pb": "1"} : {}), ...(body === undefined || raw ? {} : {"content-type": "application/json"})};
    try { const r = await fetch(url, {method: metode, headers: hd, body: body === undefined ? undefined : raw ? body : JSON.stringify(body)}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "Tidak ada sinyal. Coba lagi saat sinyal kembali."}}; }
  };
  const galatTeks = r => r.j?.galat || (r.status === 503 ? "Fitur peralatan belum diaktifkan di server." : `Gagal (${r.status}). Coba lagi sebentar lagi.`);
  let panel = null, D = null, W = null, tugas = null, terbuka = new Set(), pilih = new Set(), form = null, peta = null, sudahBuka = false;
  const kat = k => D.kamus.kategori.find(x => x.k === k);
  const katP = k => D.kamus.p3k.find(x => x.k === k);
  const KDL = {lewat: "Kedaluwarsa", dekat: "Hampir kedaluwarsa"};
  const tglId = t => t ? new Date(t + "T00:00:00+07:00").toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) : "";
  const umur = t => { const d = Math.floor((Date.now() - t) / HARI); return d < 1 ? "hari ini" : d + " hari lalu"; };
  const sesudahCat = fn => { let jalan = false; const f = () => { if (!jalan) { jalan = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(f)); setTimeout(f, 120); };

  /* ---------- tab ---------- */
  function pasang() {
    const bar = el("tab"), isi = el("isi"); if (!bar || !isi || el("tabAlatTombol")) return;
    const b = h("button", {type: "button", id: "tabAlatTombol", "aria-pressed": "false"}, "Peralatan");
    panel = h("div", {id: "tabAlat", hidden: true}); bar.append(b); isi.append(panel);
    b.addEventListener("click", () => { pesan(""); for (const x of bar.children) x.setAttribute("aria-pressed", String(x === b)); for (const id of ["tabTugas", "tabKontak"]) if (el(id)) el(id).hidden = true; panel.hidden = false; if (!sudahBuka) { sudahBuka = true; muat(); } });
    /* tab lain dibuka oleh instansi.js: panel ini menyingkir (instansi.js hanya tahu dua panelnya sendiri) */
    new MutationObserver(() => { if (!panel.hidden && (!el("tabTugas")?.hidden || !el("tabKontak")?.hidden)) { panel.hidden = true; b.setAttribute("aria-pressed", "false"); } }).observe(isi, {attributes: true, attributeFilter: ["hidden"], subtree: true});
  }
  const awasi = () => {
    const u = el("vUtama"); if (!u) return;
    const f = () => { if (!u.hidden) pasang(); else { D = W = tugas = null; sudahBuka = false; form = null; pilih.clear(); } };
    new MutationObserver(f).observe(u, {attributes: true, attributeFilter: ["hidden"]}); f();
  };

  /* ---------- muat ---------- */
  async function muat(senyap) {
    if (!senyap) panel.replaceChildren(h("div", {class: "al-skel", "aria-hidden": "true"}, h("i"), h("i"), h("i")), h("p", {class: "al-redup", role: "status", teks: "Memuat peralatan…"}));
    const [r, w] = await Promise.all([api("GET", "/api/instansi/gudang"), api("GET", "/api/instansi/inventaris/wilayah")]);
    if (!r.ok) return panel.replaceChildren(h("div", {class: "al-kosong galat"}, h("p", {teks: galatTeks(r)}), h("button", {type: "button", class: "al-btn utama", "data-a": "ulang", teks: "Coba lagi"})));
    D = r.j; W = w.ok ? w.j : null; sesudahCat(gambar);
  }
  function gambar() {
    const G = D.gudang, keluar = [];
    if (form) keluar.push(form);
    if (!G.length && !form) keluar.push(h("div", {class: "al-kosong"}, h("p", {teks: "Belum ada gudang. Tambahkan gudang pertama (tempat alat disimpan), lalu catat alat di dalamnya."}), h("button", {type: "button", class: "al-btn utama", "data-a": "gudang-baru", teks: "Tambah gudang"})));
    else {
      const basi = G.filter(g => g.basi).length, siap = G.reduce((s, g) => s + g.alat.filter(a => a.status === "siap").reduce((x, a) => x + a.jumlah, 0), 0);
      const p3kPerlu = G.reduce((s, g) => s + (g.p3k || []).filter(x => x.kdl || x.rendah).length, 0);
      keluar.push(h("div", {class: "al-atas"}, h("p", {class: "al-redup", teks: `${fmt(G.length)} gudang, ${fmt(siap)} unit siap${basi ? `, ${fmt(basi)} belum diperbarui lebih dari ${D.kamus.lama_hari} hari` : ""}${p3kPerlu ? `, ${fmt(p3kPerlu)} barang P3K hampir kedaluwarsa atau stoknya rendah` : ""}`}), h("button", {type: "button", class: "al-btn utama", "data-a": "gudang-baru", teks: "Tambah gudang"})));
      if (pilih.size) keluar.push(barKerahkan());
      keluar.push(h("ul", {class: "al-daftar"}, G.map((g, i) => kartuGudang(g, terbuka.has(g.id)))));
    }
    keluar.push(ringkasanWilayah());
    panel.replaceChildren(...keluar);
  }
  const SKEL = null;

  /* ---------- gudang dan alat ---------- */
  function kartuGudang(g, buka) {
    const siap = g.alat.filter(a => a.status === "siap").reduce((s, a) => s + a.jumlah, 0);
    return h("li", {class: "al-gudang" + (g.basi ? " basi" : ""), "data-g": g.id},
      h("div", {class: "al-baris"}, h("b", {teks: g.nama}), h("span", {class: "al-pil", teks: D.kamus.jenis[g.jenis]}), g.basi ? h("span", {class: "al-pil basi", teks: `Belum diperbarui lebih dari ${D.kamus.lama_hari} hari`}) : null),
      h("p", {class: "al-redup", teks: `${g.kab ? g.kab + ", " : ""}${D.prov.find(p => p.kode === g.prov)?.nama ?? g.prov}. Diperbarui ${umur(g.diubah)}. ${fmt(siap)} unit siap dari ${fmt(g.alat.reduce((s, a) => s + a.jumlah, 0))}.`}),
      h("div", {class: "al-aksi"}, h("button", {type: "button", class: "al-btn" + (g.basi ? " utama" : ""), "data-a": "konfirmasi", "data-g": g.id, teks: "Data masih sama, tandai sudah dicek"}),
        h("button", {type: "button", class: "al-btn", "data-a": "alat-baru", "data-g": g.id, teks: "Tambah alat"}), D.p3k_aktif ? h("button", {type: "button", class: "al-btn", "data-a": "p3k-baru", "data-g": g.id, teks: "Tambah P3K"}) : null, h("button", {type: "button", class: "al-btn", "data-a": "gudang-ubah", "data-g": g.id, teks: "Ubah gudang"}),
        h("button", {type: "button", class: "al-btn", "data-a": "buka", "data-g": g.id, "aria-expanded": String(buka), teks: buka ? "Sembunyikan alat" : `Lihat alat (${g.alat.length + (g.p3k?.length || 0)})`})),
      !buka && (g.alat.length || g.p3k?.length) ? h("p", {class: "al-chip-baris"}, g.alat.map(a => h("span", {class: "al-pil " + a.status, teks: `${kat(a.kategori)?.label ?? a.kategori} ${fmt(a.jumlah)}`})),
        (g.p3k || []).map(x => h("span", {class: "al-pil p3k" + (x.kdl || x.rendah ? " peringatan" : ""), teks: `${katP(x.kategori)?.label ?? x.kategori} ${fmt(x.jumlah)}`}))) : null,
      buka ? [h("h4", {class: "al-grup", teks: "Pemadaman"}), g.alat.length ? h("ul", {class: "al-alat"}, g.alat.map(a => barisAlat(a))) : h("p", {class: "al-redup", teks: "Gudang ini belum berisi alat. Tekan Tambah alat."}),
        ...(D.p3k_aktif ? [h("h4", {class: "al-grup", teks: "P3K dan medis"}), g.p3k?.length ? h("ul", {class: "al-alat"}, g.p3k.map(x => barisP3k(x))) : h("p", {class: "al-redup", teks: "Belum ada barang P3K. Tekan Tambah P3K."})] : [])] : null);
  }
  function barisAlat(a) {
    const k = kat(a.kategori), sat = k.satuan ? ` ${k.satuan}` : "";
    return h("li", {class: "al-baris-alat " + a.status, "data-al": a.id},
      h("div", {class: "al-judul"}, a.status === "siap" ? h("input", {type: "checkbox", class: "al-cek", "data-a": "pilih", "data-id": a.id, checked: pilih.has(a.id), "aria-label": `Pilih ${k.label} untuk dikerahkan`}) : null,
        h("span", {class: "al-ik", "aria-hidden": "true", teks: IKON[a.kategori] || "📦"}), h("b", {teks: k.label}),
        h("span", {class: "al-redup", teks: [a.merek_model, a.kelas_pompa ? KELAS[a.kelas_pompa] : null, a.hp ? a.hp + " HP" : null, a.kapasitas ? fmt(a.kapasitas) + sat + " per unit" : null, a.tahun].filter(Boolean).join(", ")}),
        h("span", {class: "al-pil " + a.status, teks: STAT[a.status]})),
      h("div", {class: "al-kendali"},
        h("div", {class: "al-stepper", role: "group", "aria-label": "Jumlah"}, h("button", {type: "button", "data-a": "kurang", "data-id": a.id, "aria-label": "Kurangi satu"}, "−"), h("output", {"data-n": a.id, teks: fmt(a.jumlah)}),
          h("button", {type: "button", "data-a": "tambah", "data-id": a.id, "aria-label": "Tambah satu"}, "+")),
        h("div", {class: "al-seg", role: "group", "aria-label": "Kondisi"}, Object.entries(KOND).map(([v, l]) => h("button", {type: "button", "data-a": "kondisi", "data-id": a.id, "data-v": v, "aria-pressed": String(a.kondisi === v), class: v}, l)))),
      h("div", {class: "al-aksi"},
        a.status === "dikerahkan" ? h("button", {type: "button", class: "al-btn", "data-a": "status", "data-id": a.id, "data-v": "siap", teks: "Kembalikan ke siap"})
          : h("button", {type: "button", class: "al-btn", "data-a": "status", "data-id": a.id, "data-v": a.status === "siap" ? "servis" : "siap", teks: a.status === "siap" ? "Tandai servis" : "Tandai siap", disabled: a.status === "servis" && a.kondisi === "rusak_berat"}),
        h("button", {type: "button", class: "al-btn", "data-a": "alat-ubah", "data-id": a.id, teks: "Ubah"}), h("button", {type: "button", class: "al-btn bahaya", "data-a": "alat-hapus", "data-id": a.id, teks: "Hapus"})));
  }
  function barisP3k(x) {
    const k = katP(x.kategori), peringatan = x.kdl || x.rendah;
    return h("li", {class: "al-baris-alat p3k" + (peringatan ? " peringatan" : ""), "data-p3k": x.id},
      h("div", {class: "al-judul"}, h("span", {class: "al-ik", "aria-hidden": "true", teks: IKON_P3K[x.kategori] || "➕"}), h("b", {teks: k?.label ?? x.kategori}), x.nama ? h("span", {class: "al-redup", teks: x.nama}) : null,
        h("span", {class: "al-pil", teks: `${fmt(x.jumlah)} ${x.satuan}`}), x.kdl ? h("span", {class: "al-pil peringatan", teks: KDL[x.kdl]}) : null, x.rendah ? h("span", {class: "al-pil peringatan", teks: "Stok di bawah ambang"}) : null),
      h("p", {class: "al-redup", teks: [x.kedaluwarsa ? `Kedaluwarsa ${tglId(x.kedaluwarsa)}` : "Tanpa tanggal kedaluwarsa", x.ambang != null ? `ambang stok ${fmt(x.ambang)}` : null, x.catatan].filter(Boolean).join(", ")}),
      h("div", {class: "al-aksi"}, h("button", {type: "button", class: "al-btn utama", "data-a": "p3k-pakai", "data-id": x.id, disabled: x.jumlah < 1, teks: "Dipakai"}), h("button", {type: "button", class: "al-btn", "data-a": "p3k-ubah", "data-id": x.id, teks: "Ubah atau isi stok"}),
        h("button", {type: "button", class: "al-btn bahaya", "data-a": "p3k-hapus", "data-id": x.id, teks: "Hapus"})));
  }
  const cariP3k = id => { for (const g of D.gudang) { const x = (g.p3k || []).find(y => y.id === id); if (x) return x; } return null; };
  function formP3k(gid, x) {
    const ub = !!x, v = x || {kategori: "", jumlah: 1, satuan: "unit"}, f = h("form", {class: "al-form", novalidate: true, id: "alFormP3k"}); f.dataset.kat = v.kategori; if (ub) f.dataset.id = x.id; f.dataset.g = gid;
    const gudang = D.gudang.find(g => g.id === gid), in_ = (id, att) => h("input", {id, name: id, autocomplete: "off", ...att});
    const grid = h("div", {class: "al-kat", role: "group", "aria-label": "Kategori P3K"}, D.kamus.p3k.map(k => h("button", {type: "button", "data-a": "p3k-kat", "data-k": k.k, "aria-pressed": String(v.kategori === k.k)}, h("span", {class: "al-ik", "aria-hidden": "true", teks: IKON_P3K[k.k] || "➕"}), h("span", {teks: k.label}))));
    const stp = h("div", {class: "al-stepper besar", role: "group", "aria-label": "Jumlah"}, h("button", {type: "button", "data-a": "p-kurang", "aria-label": "Kurangi satu"}, "−"), in_("pJumlah", {inputmode: "numeric", value: String(v.jumlah), "aria-label": "Jumlah"}), h("button", {type: "button", "data-a": "p-tambah", "aria-label": "Tambah satu"}, "+"));
    const sat = h("select", {id: "pSatuan"}, ...SATUAN.map(u => h("option", {value: u, teks: u, selected: v.satuan === u})));
    f.append(h("h3", {teks: (ub ? "Ubah barang P3K" : "Tambah barang P3K") + `, ${gudang?.nama ?? ""}`}), h("p", {class: "al-redup", teks: "1. Pilih kategori"}), grid, h("p", {class: "al-redup", teks: "2. Jumlah dan satuan"}), h("div", {class: "al-kendali"}, stp, lab("Satuan", sat, "pSatuan")),
      h("div", {class: "al-dua"}, lab("Kedaluwarsa (boleh kosong)", in_("pKdl", {type: "date", value: v.kedaluwarsa ?? ""}), "pKdl"), lab("Ingatkan bila stok di bawah (boleh kosong)", in_("pAmbang", {inputmode: "numeric", value: v.ambang ?? ""}), "pAmbang")),
      lab("Nama atau merek (boleh kosong)", in_("pNama", {maxlength: "80", value: v.nama ?? ""}), "pNama"), lab("Catatan (boleh kosong)", in_("pCatatan", {maxlength: "300", value: v.catatan ?? ""}), "pCatatan"),
      h("p", {class: "al-pesan galat", id: "pGalat", role: "alert"}), h("div", {class: "al-aksi"}, h("button", {type: "submit", class: "al-btn utama", teks: "Simpan P3K"}), h("button", {type: "button", class: "al-btn", "data-a": "batal-form", teks: "Batal"})));
    f.addEventListener("submit", async e => { e.preventDefault(); const b = f.querySelector("[type=submit]");
      if (!f.dataset.kat) { el("pGalat").textContent = "Pilih kategori P3K dulu."; return; }
      b.disabled = true;
      const o = {kategori: f.dataset.kat, jumlah: el("pJumlah").value === "" ? null : Number(el("pJumlah").value), satuan: el("pSatuan").value, nama: el("pNama").value, catatan: el("pCatatan").value, kedaluwarsa: el("pKdl").value || null, ambang: el("pAmbang").value ? Number(el("pAmbang").value) : null};
      const r = ub ? await api("POST", "/api/instansi/p3k/" + x.id, {aksi: "ubah", ...o}) : await api("POST", "/api/instansi/p3k", {gudang_id: gid, ...o});
      if (!r.ok) { b.disabled = false; el("pGalat").textContent = galatTeks(r); return; }
      form = null; terbuka.add(gid); pesan("Barang P3K tersimpan.", "ok"); await muat(true); });
    return f;
  }
  /* Dipakai: kurangi stok, opsional dikaitkan ke tugas api (jejak "dipakai di tugas X") */
  function formPakai(x) {
    const f = h("form", {class: "al-form", novalidate: true, id: "alFormPakai"}), k = katP(x.kategori), sel = h("select", {id: "pTugas"}, h("option", {value: "", teks: "Tidak terkait tugas api"}));
    api("GET", "/api/instansi/tugas").then(r => { if (r.ok) for (const t of r.j.tugas.filter(t => t.status === "buka")) sel.append(h("option", {value: t.id, teks: `${t.kec ? t.kec + ", " : ""}${t.kab}`})); });
    f.append(h("h3", {teks: `Dipakai: ${k?.label ?? x.kategori}${x.nama ? ", " + x.nama : ""}`}), h("p", {class: "al-redup", teks: `Stok sekarang ${fmt(x.jumlah)} ${x.satuan}.`}),
      h("div", {class: "al-stepper besar", role: "group", "aria-label": "Jumlah dipakai"}, h("button", {type: "button", "data-a": "pk-kurang", "aria-label": "Kurangi satu"}, "−"), h("input", {id: "pkJumlah", inputmode: "numeric", value: "1", "aria-label": "Jumlah dipakai", autocomplete: "off"}), h("button", {type: "button", "data-a": "pk-tambah", "aria-label": "Tambah satu"}, "+")),
      lab("Dipakai di tugas api (boleh kosong)", sel, "pTugas"), h("p", {class: "al-pesan galat", id: "pkGalat", role: "alert"}),
      h("div", {class: "al-aksi"}, h("button", {type: "submit", class: "al-btn utama", teks: "Catat pemakaian"}), h("button", {type: "button", class: "al-btn", "data-a": "batal-form", teks: "Batal"})));
    f.addEventListener("submit", async e => { e.preventDefault(); const b = f.querySelector("[type=submit]"), n = Number(el("pkJumlah").value);
      if (!Number.isInteger(n) || n < 1 || n > x.jumlah) { el("pkGalat").textContent = `Isi jumlah bulat 1 sampai ${fmt(x.jumlah)}.`; return; }
      b.disabled = true; const r = await api("POST", "/api/instansi/p3k/" + x.id, {aksi: "pakai", jumlah: n, ...(el("pTugas").value ? {tugas_id: el("pTugas").value} : {})});
      if (!r.ok) { b.disabled = false; el("pkGalat").textContent = galatTeks(r); return; }
      form = null; pesan(`Pemakaian ${fmt(n)} ${x.satuan} tercatat, sisa ${fmt(r.j.jumlah)}.`, "ok"); await muat(true); });
    return f;
  }
  const cariAlat = id => { for (const g of D.gudang) { const a = g.alat.find(x => x.id === id); if (a) return a; } return null; };
  const debounce = new Map();
  function ubahJumlah(id, d, out) {
    const a = cariAlat(id); if (!a) return;
    const n = Math.max(1, Math.min(100000, a.jumlah + d)); if (n === a.jumlah) return;
    a.jumlah = n; out.textContent = fmt(n);   // seketika; kirim sesudah jeda supaya tombol cepat tidak membanjiri server
    clearTimeout(debounce.get(id)); debounce.set(id, setTimeout(async () => { const r = await api("POST", "/api/instansi/alat/" + id, {aksi: "ubah", jumlah: n});
      if (!r.ok) pesan(galatTeks(r), "galat"); else pesan("Jumlah tersimpan.", "ok"); await muat(true); }, 700));
  }
  async function pasangKerjaan(a, p, pesanOk) {
    const r = await p; if (!r.ok) { pesan(galatTeks(r), "galat"); return r; }
    if (pesanOk) pesan(pesanOk, "ok"); await muat(true); return r;
  }

  /* ---------- kerahkan ke tugas api ---------- */
  function barKerahkan() {
    const sel = h("select", {id: "alTugas", "aria-label": "Tugas api tujuan"}, h("option", {value: "", teks: tugas ? (tugas.length ? "Pilih tugas api" : "Belum ada tugas api yang sudah dikonfirmasi") : "Memuat tugas…"}),
      ...(tugas || []).map(t => h("option", {value: t.id, teks: `${t.kec ? t.kec + ", " : ""}${t.kab}`})));
    if (!tugas) api("GET", "/api/instansi/tugas").then(r => { tugas = r.ok ? r.j.tugas.filter(t => t.status === "buka" && t.hasil_konfirmasi === "api_ada") : []; const b = el("alTugas"); if (b) b.replaceWith(barKerahkan().querySelector("select")); });
    return h("div", {class: "al-kerahkan", role: "region", "aria-label": "Kerahkan alat"}, h("b", {teks: `${pilih.size} alat dipilih`}), sel, h("button", {type: "button", class: "al-btn utama", "data-a": "kerahkan", teks: "Kerahkan ke tugas"}),
      h("button", {type: "button", class: "al-btn", "data-a": "batal-pilih", teks: "Batal"}));
  }

  /* ---------- ringkasan wilayah ---------- */
  function ringkasanWilayah() {
    if (!W) return h("p", {class: "al-redup", teks: "Ringkasan alat di wilayah belum bisa dimuat."});
    const total = Object.entries(W.total_siap).sort((x, y) => y[1] - x[1]);
    return h("details", {class: "al-wilayah"}, h("summary", {teks: `Alat siap di wilayah kita (${fmt(W.gudang.length)} gudang)`}),
      total.length ? h("p", {class: "al-chip-baris"}, total.map(([k, n]) => h("span", {class: "al-pil", teks: `${kat(k)?.label ?? k} ${fmt(n)}`}))) : h("p", {class: "al-redup", teks: "Belum ada alat siap tercatat di wilayah ini."}),
      h("ul", {class: "al-daftar"}, W.gudang.map(g => h("li", {class: "al-gudang"}, h("div", {class: "al-baris"}, h("b", {teks: g.nama}), g.milik_saya ? h("span", {class: "al-pil siap", teks: "Milik kita"}) : null),
        h("p", {class: "al-redup", teks: `${g.pemilik.nama}${g.kab ? ", " + g.kab : ""}. ${Object.keys(g.siap).length ? Object.entries(g.siap).map(([k, n]) => `${kat(k)?.label ?? k} ${fmt(n)}`).join(", ") : "Tidak ada alat siap."}`})))));
  }

  /* ---------- form gudang ---------- */
  const lab = (t, isi, id) => h("label", {for: id}, t, isi);
  function formGudang(g) {
    const ub = !!g, f = h("form", {class: "al-form", novalidate: true, id: "alFormGudang"}), v = g || {};
    const in_ = (id, att) => h("input", {id, name: id, ...att});
    const provSel = h("select", {id: "gProv", name: "prov"}, ...D.prov.map(p => h("option", {value: p.kode, teks: p.nama, selected: (v.prov || D.prov[0]?.kode) === p.kode})));
    const jenis = h("select", {id: "gJenis", name: "jenis"}, ...Object.entries(D.kamus.jenis).map(([k, l]) => h("option", {value: k, teks: l, selected: v.jenis === k})));
    const lat = in_("gLat", {inputmode: "decimal", autocomplete: "off", value: v.lat ?? "", placeholder: "-2.2"}), lon = in_("gLon", {inputmode: "decimal", autocomplete: "off", value: v.lon ?? "", placeholder: "113.9"});
    const gps = h("button", {type: "button", class: "al-btn", "data-a": "gps"}, "Pakai GPS perangkat"), pt = h("button", {type: "button", class: "al-btn", "data-a": "peta-pilih"}, "Pilih di peta");
    f.append(h("h3", {teks: ub ? "Ubah gudang" : "Gudang baru"}), lab("Nama gudang", in_("gNama", {maxlength: "100", value: v.nama ?? "", autocomplete: "off"}), "gNama"), lab("Jenis", jenis, "gJenis"),
      D.prov.length > 1 ? lab("Provinsi", provSel, "gProv") : h("input", {type: "hidden", id: "gProv", value: D.prov[0]?.kode ?? ""}), D.tingkat === "kab" ? null : lab("Kabupaten atau kota (boleh kosong)", in_("gKab", {maxlength: "60", value: v.kab ?? ""}), "gKab"),
      lab("Alamat (boleh kosong)", in_("gAlamat", {maxlength: "200", value: v.alamat ?? "", autocomplete: "street-address"}), "gAlamat"),
      h("fieldset", {class: "al-lokasi"}, h("legend", {teks: "Lokasi"}), h("div", {class: "al-aksi"}, gps, pt), h("div", {class: "al-dua"}, lab("Lintang", lat, "gLat"), lab("Bujur", lon, "gLon")),
        h("p", {class: "al-redup", id: "gLokInfo", teks: v.lat != null ? `Koordinat tersimpan dari ${v.sumber_koordinat === "gps" ? "GPS perangkat" : "pin peta"}.` : "Pilih titik di peta, pakai GPS perangkat, atau ketik koordinat."}), h("div", {id: "gPeta", class: "al-peta", hidden: true})),
      lab("Nama PIC gudang (boleh kosong)", in_("gPicNama", {maxlength: "80", value: v.pic_nama ?? "", autocomplete: "off"}), "gPicNama"), lab("WhatsApp PIC (boleh kosong)", in_("gPicWa", {inputmode: "tel", maxlength: "20", value: v.pic_wa ? "0" + v.pic_wa.slice(2) : "", placeholder: "0812xxxxxxx"}), "gPicWa"),
      h("p", {class: "al-pesan galat", id: "gGalat", role: "alert"}), h("div", {class: "al-aksi"}, h("button", {type: "submit", class: "al-btn utama", teks: "Simpan gudang"}), h("button", {type: "button", class: "al-btn", "data-a": "batal-form", teks: "Batal"}),
        ub ? h("button", {type: "button", class: "al-btn bahaya", "data-a": "gudang-hapus", "data-g": g.id, teks: "Hapus gudang"}) : null));
    f.dataset.sumber = v.sumber_koordinat || "peta"; if (ub) f.dataset.id = g.id;
    f.addEventListener("submit", async e => { e.preventDefault(); const b = f.querySelector("[type=submit]"); b.disabled = true;
      const o = {aksi: "ubah", nama: el("gNama").value, jenis: el("gJenis").value, prov: el("gProv").value, alamat: el("gAlamat").value, lat: el("gLat").value.replace(",", "."), lon: el("gLon").value.replace(",", "."),
        sumber_koordinat: f.dataset.sumber, pic_nama: el("gPicNama").value, pic_wa: el("gPicWa").value}; if (el("gKab")) o.kab = el("gKab").value;
      const r = ub ? await api("POST", "/api/instansi/gudang/" + g.id, o) : await api("POST", "/api/instansi/gudang", (delete o.aksi, o)); b.disabled = false;
      if (!r.ok) { el("gGalat").textContent = galatTeks(r); return; }
      form = null; if (!ub) terbuka.add(r.j.id); pesan("Gudang tersimpan.", "ok"); await muat(true); });
    return f;
  }
  function gpsIsi() {
    const info = el("gLokInfo"); if (!navigator.geolocation) { info.textContent = "Perangkat ini tidak menyediakan GPS. Pilih di peta atau ketik koordinat."; return; }
    info.textContent = "Mencari lokasi perangkat…";
    navigator.geolocation.getCurrentPosition(p => { el("gLat").value = p.coords.latitude.toFixed(5); el("gLon").value = p.coords.longitude.toFixed(5); el("alFormGudang").dataset.sumber = "gps"; info.textContent = `Lokasi GPS terisi (akurasi sekitar ${Math.round(p.coords.accuracy)} m).`; if (peta) peta.setCenter([p.coords.longitude, p.coords.latitude]); },
      () => { info.textContent = "Lokasi tidak bisa dibaca. Beri izin lokasi, atau pilih di peta."; }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
  }
  const sisip = (tag, atribut) => new Promise((ok, no) => { const e = document.createElement(tag); Object.assign(e, atribut); e.onload = () => ok(); e.onerror = () => no(new Error("gagal memuat")); document.head.append(e); });
  async function petaPilih() {
    const w = el("gPeta"), info = el("gLokInfo"); w.hidden = false; if (peta) { peta.resize(); return; }
    info.textContent = "Memuat peta…";
    try {
      if (!window.maplibregl) { sisip("link", {rel: "stylesheet", href: CDN + "css", integrity: SRI_CSS, crossOrigin: "anonymous"}).catch(() => {}); await sisip("script", {src: CDN + "js", integrity: SRI_JS, crossOrigin: "anonymous"}); }
      const la = parseFloat(el("gLat").value), lo = parseFloat(el("gLon").value), ada = Number.isFinite(la) && Number.isFinite(lo);
      peta = new maplibregl.Map({container: w, style: "https://tiles.openfreemap.org/styles/positron", center: ada ? [lo, la] : [113, -2], zoom: ada ? 12 : 4, minZoom: 3, maxZoom: 18, dragRotate: false, attributionControl: {compact: true}});
      peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
      const pin = new maplibregl.Marker({draggable: true}); if (ada) pin.setLngLat([lo, la]).addTo(peta);
      const taruh = ll => { el("gLat").value = ll.lat.toFixed(5); el("gLon").value = ll.lng.toFixed(5); el("alFormGudang").dataset.sumber = "peta"; info.textContent = "Titik dari pin peta."; };
      peta.on("click", e => { pin.setLngLat(e.lngLat).addTo(peta); taruh(e.lngLat); }); pin.on("dragend", () => taruh(pin.getLngLat()));
      info.textContent = "Ketuk peta untuk menaruh pin, geser pin untuk menyetel.";
    } catch (e) { w.hidden = true; peta = null; info.textContent = "Peta tidak bisa dimuat. Pakai GPS perangkat atau ketik koordinat."; }
  }

  /* ---------- form alat ---------- */
  const kecil = f => window.fotoKecil(f, MAKS_FOTO);

  function formAlat(gid, a) {
    const ub = !!a, v = a || {kategori: "", jumlah: 1, kondisi: "baik"}, f = h("form", {class: "al-form", novalidate: true, id: "alFormAlat"}); f.dataset.kat = v.kategori; f.dataset.kond = v.kondisi; if (ub) f.dataset.id = a.id; f.dataset.g = gid;
    const gudang = D.gudang.find(g => g.id === gid), in_ = (id, att) => h("input", {id, name: id, autocomplete: "off", ...att});
    const grid = h("div", {class: "al-kat", role: "group", "aria-label": "Kategori alat"}, D.kamus.kategori.map(k => h("button", {type: "button", "data-a": "kat", "data-k": k.k, "aria-pressed": String(v.kategori === k.k)}, h("span", {class: "al-ik", "aria-hidden": "true", teks: IKON[k.k] || "📦"}), h("span", {teks: k.label}))));
    const jml = in_("aJumlah", {inputmode: "numeric", value: String(v.jumlah), "aria-label": "Jumlah unit"});
    const stp = h("div", {class: "al-stepper besar", role: "group", "aria-label": "Jumlah"}, h("button", {type: "button", "data-a": "f-kurang", "aria-label": "Kurangi satu"}, "−"), jml, h("button", {type: "button", "data-a": "f-tambah", "aria-label": "Tambah satu"}, "+"));
    const seg = h("div", {class: "al-seg besar", role: "group", "aria-label": "Kondisi"}, Object.entries(KOND).map(([k, l]) => h("button", {type: "button", "data-a": "f-kond", "data-v": k, "aria-pressed": String(v.kondisi === k), class: k}, l)));
    const kelas = h("select", {id: "aKelas"}, h("option", {value: "", teks: "Tidak diketahui"}), ...Object.entries(KELAS).map(([k, l]) => h("option", {value: k, teks: l, selected: v.kelas_pompa === k})));
    f.append(h("h3", {teks: (ub ? "Ubah alat" : "Tambah alat") + `, ${gudang?.nama ?? ""}`}), h("p", {class: "al-redup", teks: "1. Pilih kategori"}), grid, h("p", {class: "al-redup", teks: "2. Jumlah dan kondisi"}), h("div", {class: "al-kendali"}, stp, seg),
      h("div", {class: "al-dua"}, lab("Merek atau model (boleh kosong)", in_("aMerek", {maxlength: "80", value: v.merek_model ?? ""}), "aMerek"), lab("Tahun (boleh kosong)", in_("aTahun", {inputmode: "numeric", maxlength: "4", value: v.tahun ?? ""}), "aTahun")),
      h("div", {id: "aPompa", class: "al-dua", hidden: v.kategori !== "pompa"}, lab("Kelas pompa", kelas, "aKelas"), lab("Tenaga (HP)", in_("aHp", {inputmode: "decimal", value: v.hp ?? ""}), "aHp")),
      h("div", {id: "aKap", hidden: !kat(v.kategori)?.satuan}, lab("Kapasitas per unit", in_("aKapasitas", {inputmode: "decimal", value: v.kapasitas ?? ""}), "aKapasitas"), h("p", {class: "al-redup", id: "aSatuan", teks: kat(v.kategori)?.satuan === "m" ? "Dalam meter per gulungan" : "Dalam liter"})),
      lab("Catatan (boleh kosong)", in_("aCatatan", {maxlength: "300", value: v.catatan ?? ""}), "aCatatan"), lab("Foto alat (boleh kosong)", h("input", {id: "aFoto", type: "file", accept: "image/jpeg,image/webp,image/*"}), "aFoto"),
      h("p", {class: "al-pesan galat", id: "aGalat", role: "alert"}), h("div", {class: "al-aksi"}, h("button", {type: "submit", class: "al-btn utama", teks: "Simpan alat"}), h("button", {type: "button", class: "al-btn", "data-a": "batal-form", teks: "Batal"})));
    f.addEventListener("submit", async e => { e.preventDefault(); const b = f.querySelector("[type=submit]");
      if (!f.dataset.kat) { el("aGalat").textContent = "Pilih kategori alat dulu."; return; }
      b.disabled = true;
      const o = {kategori: f.dataset.kat, jumlah: Number(el("aJumlah").value), kondisi: f.dataset.kond, merek_model: el("aMerek").value, tahun: el("aTahun").value || null, catatan: el("aCatatan").value,
        hp: el("aHp").value ? el("aHp").value.replace(",", ".") : null, kapasitas: el("aKapasitas").value ? el("aKapasitas").value.replace(",", ".") : null, kelas_pompa: f.dataset.kat === "pompa" ? el("aKelas").value || null : null};
      const r = ub ? await api("POST", "/api/instansi/alat/" + a.id, {aksi: "ubah", ...o}) : await api("POST", "/api/instansi/alat", {gudang_id: gid, ...o});
      if (!r.ok) { b.disabled = false; el("aGalat").textContent = galatTeks(r); return; }
      const berkas = el("aFoto").files[0]; let fotoGalat = "";
      if (berkas) { const k = await kecil(berkas); if (!k) fotoGalat = " Foto terlalu besar atau tidak terbaca, alat tersimpan tanpa foto."; else { const u = await api("POST", "/api/instansi/foto-alat/" + (ub ? a.id : r.j.id), k); if (!u.ok) fotoGalat = " Foto belum terunggah: " + galatTeks(u); } }
      form = null; terbuka.add(gid); pesan("Alat tersimpan." + fotoGalat, fotoGalat ? "galat" : "ok"); await muat(true); });
    return f;
  }
  const bukaForm = f => { form = f; gambar(); f.scrollIntoView({behavior: "smooth", block: "start"}); };

  /* ---------- aksi ---------- */
  panel_klik();
  function panel_klik() {
    document.addEventListener("click", async e => {
      const t = e.target.closest("[data-a]"); if (!t || !panel || !panel.contains(t)) return;
      const a = t.dataset.a, id = t.dataset.id, gid = t.dataset.g, f = t.closest("form");
      if (a === "ulang") return muat();
      if (a === "gudang-baru") return bukaForm(formGudang());
      if (a === "gudang-ubah") return bukaForm(formGudang(D.gudang.find(g => g.id === gid)));
      if (a === "alat-baru") return bukaForm(formAlat(gid));
      if (a === "p3k-baru") { terbuka.add(gid); return bukaForm(formP3k(gid)); }
      if (a === "p3k-ubah") { const g = D.gudang.find(z => (z.p3k || []).some(y => y.id === id)); return bukaForm(formP3k(g.id, cariP3k(id))); }
      if (a === "p3k-pakai") return bukaForm(formPakai(cariP3k(id)));
      if (a === "p3k-kat") { f.dataset.kat = t.dataset.k; for (const b of f.querySelectorAll("[data-a=p3k-kat]")) b.setAttribute("aria-pressed", String(b === t)); const std = SATUAN_STD[t.dataset.k]; if (std && !f.dataset.id) el("pSatuan").value = std; return; }
      if (a === "p-kurang" || a === "p-tambah") { const i = el("pJumlah"), n = (Number(i.value) || 0) + (a === "p-tambah" ? 1 : -1); i.value = String(Math.max(0, Math.min(1e6, n))); return; }
      if (a === "pk-kurang" || a === "pk-tambah") { const i = el("pkJumlah"), n = (Number(i.value) || 1) + (a === "pk-tambah" ? 1 : -1); i.value = String(Math.max(1, n)); return; }
      if (a === "p3k-hapus") { const x = cariP3k(id); if (!confirm(`Hapus ${katP(x.kategori).label} (${x.jumlah} ${x.satuan}) dari gudang? Jejaknya tetap tersimpan.`)) return; return pasangKerjaan(a, api("POST", "/api/instansi/p3k/" + id, {aksi: "hapus"}), "Barang P3K dihapus."); }
      if (a === "alat-ubah") { const g = D.gudang.find(x => x.alat.some(y => y.id === id)); return bukaForm(formAlat(g.id, cariAlat(id))); }
      if (a === "batal-form") { form = null; peta = null; return gambar(); }
      if (a === "gps") return gpsIsi();
      if (a === "peta-pilih") return petaPilih();
      if (a === "buka") { const g = D.gudang.find(x => x.id === gid); if (terbuka.has(gid)) { terbuka.delete(gid); if (D.gudang.length <= 2) terbuka.add("x" + gid); } else { terbuka.add(gid); terbuka.delete("x" + gid); } return gambar(); }
      if (a === "kat") { f.dataset.kat = t.dataset.k; for (const b of f.querySelectorAll("[data-a=kat]")) b.setAttribute("aria-pressed", String(b === t));
        el("aPompa").hidden = t.dataset.k !== "pompa"; const s = kat(t.dataset.k)?.satuan; el("aKap").hidden = !s; el("aSatuan").textContent = s === "m" ? "Dalam meter per gulungan" : "Dalam liter"; return; }
      if (a === "f-kond") { f.dataset.kond = t.dataset.v; for (const b of f.querySelectorAll("[data-a=f-kond]")) b.setAttribute("aria-pressed", String(b === t)); return; }
      if (a === "f-kurang" || a === "f-tambah") { const i = el("aJumlah"), n = (Number(i.value) || 1) + (a === "f-tambah" ? 1 : -1); i.value = String(Math.max(1, Math.min(100000, n))); return; }
      if (a === "pilih") { t.checked ? pilih.add(id) : pilih.delete(id); return gambar(); }
      if (a === "batal-pilih") { pilih.clear(); return gambar(); }
      if (a === "kurang" || a === "tambah") return ubahJumlah(id, a === "tambah" ? 1 : -1, t.parentElement.querySelector("output"));
      if (a === "kondisi") { for (const b of t.parentElement.children) b.setAttribute("aria-pressed", String(b === t)); return pasangKerjaan(a, api("POST", "/api/instansi/alat/" + id, {aksi: "ubah", kondisi: t.dataset.v}), "Kondisi tersimpan."); }
      if (a === "status") { pilih.delete(id); return pasangKerjaan(a, api("POST", "/api/instansi/alat/" + id, {aksi: "ubah", status: t.dataset.v}), t.dataset.v === "siap" ? "Alat kembali siap." : "Alat ditandai servis."); }
      if (a === "konfirmasi") { t.disabled = true; const r = await pasangKerjaan(a, api("POST", "/api/instansi/gudang/" + gid, {aksi: "konfirmasi"}), "Gudang ditandai sudah dicek, datanya masih sama."); if (!r.ok) t.disabled = false; return; }
      if (a === "alat-hapus") { const x = cariAlat(id); if (!confirm(`Hapus ${kat(x.kategori).label} (${x.jumlah} unit) dari gudang? Jejaknya tetap tersimpan.`)) return; pilih.delete(id); return pasangKerjaan(a, api("POST", "/api/instansi/alat/" + id, {aksi: "hapus"}), "Alat dihapus."); }
      if (a === "gudang-hapus") { if (!confirm("Hapus gudang ini? Hanya bisa bila gudang sudah kosong.")) return; const r = await api("POST", "/api/instansi/gudang/" + gid, {aksi: "hapus"}); if (!r.ok) { el("gGalat").textContent = galatTeks(r); return; } form = null; pesan("Gudang dihapus.", "ok"); return muat(true); }
      if (a === "kerahkan") { const tid = el("alTugas").value; if (!tid) return pesan("Pilih tugas api tujuan dulu.", "galat");
        t.disabled = true; const r = await api("POST", "/api/instansi/alat/kerahkan", {tugas_id: tid, alat: [...pilih]}); t.disabled = false;
        if (!r.ok) return pesan(galatTeks(r), "galat"); pilih.clear(); pesan(`${r.j.dikerahkan} jenis alat dikerahkan. Kembali siap otomatis saat tugas padam.`, "ok"); return muat(true); }
    });
  }
  window.AlatInv = {siap: async () => { const r = await api("GET", "/api/instansi/gudang"); return r.ok ? r.j.gudang.flatMap(g => g.alat.filter(a => a.status === "siap").map(a => ({id: a.id, kategori: a.kategori, label: r.j.kamus?.kategori?.find(x => x.k === a.kategori)?.label, jumlah: a.jumlah, gudang: g.nama, merek_model: a.merek_model}))) : []; }};
  awasi();
})();
