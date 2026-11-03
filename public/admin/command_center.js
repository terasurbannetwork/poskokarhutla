"use strict";
/* Meja operator command center karhutla (/command-center, kerangka src/admin_halaman.js halamanCc). Data: GET /api/cc/antrean (jajak 30 dtk), GET /api/cc/kontak,
   POST /api/cc/aksi/:id, GET /api/cc/log (src/command_center.js). Pembantu bersama (jam WIB, jajak) di command_bersama.js.
   Alur operator: lihat alert level 3 -> telepon BPBD di luar sistem (nomor kantor/Pusdalops dari Buku kontak, tombol tel:) -> "Dalam konfirmasi" -> kabar BPBD -> "Ada api" / "Tidak ada api".
   Koreksi keputusan (final -> dalam konfirmasi) wajib bercatatan. Tombol hanya yang diizinkan server (field `aksi`); koordalops/pimpinan hanya melihat.
   Antrean digambar KUNCI-PER-KARTU: kartu yang datanya tidak berubah dipakai ulang DAN tidak dipindah (alert baru hanya diselipkan; replaceChildren melepas semua kartu dan memutus fokus ketikan), dan
   fokus (beserta posisi kursor) dipulihkan ke kartu yang dibangun ulang, jadi alasan koreksi yang sedang diketik tidak terputus oleh alert baru di jajak 30 dtk. Luas satelit dibulatkan (resolusi kasar, ~4 ha per titik). */
(() => {
  const {h, jam, jamTgl, tgl, pendek, durasi, lokasi, ambil, kirim, waktu, jajak, perbaruiUmur, NAMA_STATUS} = window.Cc;
  const app = document.getElementById("app"), FINAL = ["ada_api", "tidak_ada_api"];
  const NAMA_AKSI = {dalam_konfirmasi: "Dalam konfirmasi", ada_api: "Ada api", tidak_ada_api: "Tidak ada api"};
  const JENIS_DURASI = {respons: "respons", konfirmasi: "konfirmasi"};
  const KONTAK_SEGAR = 30 * 6e4, KONTAK_ULANG = 10 * 6e4, TUNDA_LOG = 400;
  const S = {tab: "antrean", data: null, gagalSejak: null, sesiHabis: false, pesan: null, kontak: new Map(), draft: new Map(), sibuk: new Set(),
    log: {tgl: "", operator: "", daftar: new Map(), hasil: null, galat: "", muat: false, urut: 0, sudah: false, tunda: 0, batal: null, benih: false}};
  const el = {};

  /* ---------------------------------------------------------------- kerangka */
  const urlMasuk = () => "/admin/masuk?ke=" + encodeURIComponent("/command-center");
  function bangun() {
    document.querySelector(".ad-wrap")?.classList.add("cc-lebar");
    el.spanduk = h("div", {class: "cc-spanduk", role: "status", "aria-live": "polite", hidden: true});
    el.info = h("p", {class: "cc-info"});
    el.chip = h("div", {class: "cc-chip-baris"});
    el.potong = h("p", {class: "cc-spanduk galat", role: "status", hidden: true, teks: "Daftar alert melebihi batas baca server dan dipotong: angka bertanda + adalah batas bawah, dan sebagian alert belum tampil di sini."});
    el.daftar = h("div", {class: "cc-daftar"});
    el.kosong = h("p", {class: "cc-kosong", hidden: true});
    el.tabA = h("button", {class: "cc-tab", type: "button", role: "tab", "aria-selected": "true", "aria-controls": "ccAntrean", teks: "Antrean"});
    el.tabL = h("button", {class: "cc-tab", type: "button", role: "tab", "aria-selected": "false", "aria-controls": "ccLog", teks: "Log"});
    el.pA = h("section", {id: "ccAntrean", role: "tabpanel", class: "cc-panel"}, el.chip, el.potong, el.daftar, el.kosong);
    el.pL = h("section", {id: "ccLog", role: "tabpanel", class: "cc-panel", hidden: true});
    app.replaceChildren(el.spanduk, el.info, h("div", {class: "cc-tabs", role: "tablist"}, el.tabA, el.tabL), el.pA, el.pL);
    el.tabA.addEventListener("click", () => pilihTab("antrean")); el.tabL.addEventListener("click", () => pilihTab("log"));
    el.daftar.addEventListener("click", e => { const b = e.target.closest("button[data-ke]"); if (b) lakukan(b.dataset.id, b.dataset.ke); });
    el.daftar.addEventListener("input", e => { const i = e.target.closest("input[data-catatan]"); if (i) S.draft.set(i.dataset.catatan, i.value); });
  }
  function pilihTab(t) {
    S.tab = t;
    for (const [b, p, k] of [[el.tabA, el.pA, "antrean"], [el.tabL, el.pL, "log"]]) { b.setAttribute("aria-selected", String(t === k)); p.hidden = t !== k; }
    if (t === "log") { if (!S.log.sudah) bangunLog(); muatLog(); }
  }

  /* ---------------------------------------------------------------- spanduk */
  function pesan(teks, ok = true) { const p = S.pesan = {teks, ok}; gambarSpanduk(); setTimeout(() => { if (S.pesan === p) { S.pesan = null; gambarSpanduk(); } }, 15e3); }
  function gambarSpanduk() {
    let isi = null, kelas = "";
    if (S.sesiHabis) { isi = [h("b", {teks: "Sesi habis, atau akun ini tidak berhak. "}), h("a", {href: urlMasuk(), teks: "Masuk ulang"})]; kelas = "galat"; }
    else if (S.gagalSejak) { isi = `Gagal menyegarkan sejak ${jam(S.gagalSejak)}. Antrean di layar mungkin sudah lama; mencoba lagi tiap 30 detik.`; kelas = "galat"; }
    else if (S.pesan) { isi = S.pesan.teks; kelas = S.pesan.ok ? "ok" : "galat"; }
    el.spanduk.hidden = !isi; el.spanduk.className = "cc-spanduk " + kelas; el.spanduk.replaceChildren(...[].concat(isi ?? []));
  }

  /* ---------------------------------------------------------------- muat antrean */
  async function muat() {
    const r = await ambil("/api/cc/antrean");
    if (r.status === 401 || r.status === 403) { S.sesiHabis = true; gambarSpanduk(); return; }
    S.sesiHabis = false;
    if (!r.ok) { S.gagalSejak ??= waktu.kini(); if (r.status === 503) pesan(r.j.galat || "Command center belum diaktifkan.", false); gambarSpanduk(); return; }
    S.gagalSejak = null; gambarSpanduk(); waktu.sinkron(r.j.kini); S.data = r.j;
    gambar();
  }

  function gambar() {
    const d = S.data, a = d.alert, hit = s => a.filter(x => x.status === s).length, final = a.filter(x => FINAL.includes(x.status)).length;
    /* tanggal bawaan = tanggal WIB hari ini menurut server, diisi SEKALI (bukan tiap jajak/aksi): tanggal yang dikosongkan operator tidak ditimpa lagi, dan pilihannya sendiri (benih = true lewat ubah()) menang */
    if (!S.log.benih) { S.log.benih = true; if (!S.log.tgl) { S.log.tgl = d.hari.tgl; if (el.lTgl) { el.lTgl.value = S.log.tgl; if (S.tab === "log") muatLog(); } } }
    el.info.replaceChildren(h("b", {teks: `Hari ini, ${tgl(d.hari.mulai)}`}), ", ", d.saya.nama, d.saya.tulis ? " (operator)" : " (hanya melihat)");
    /* hitungan dari daftar yang dipotong server (antrean_terpotong / final_terpotong) = batas bawah: ditandai "+" */
    const tanda = potong => potong ? "+" : "";
    el.chip.replaceChildren(
      h("span", {class: "cc-chip", "data-s": "baru"}, h("b", {teks: fmt(hit("baru")) + tanda(d.antrean_terpotong)}), " Baru"),
      h("span", {class: "cc-chip", "data-s": "dalam_konfirmasi"}, h("b", {teks: fmt(hit("dalam_konfirmasi")) + tanda(d.antrean_terpotong)}), " Dalam konfirmasi"),
      h("span", {class: "cc-chip", "data-s": "ada_api"}, h("b", {teks: fmt(final) + tanda(d.final_terpotong)}), " Sudah diputuskan (12 jam)"));
    el.potong.hidden = !(d.antrean_terpotong || d.final_terpotong);
    if (d.saya.tulis) { for (const x of a) if (!FINAL.includes(x.status)) pastikanKontak(x); if (antre.length) kerjakanKontak(); }   // setelah SEMUA diantrekan: satu permintaan bersama
    gambarDaftar();
    perbaruiUmur(app);
  }

  /* ---------------------------------------------------------------- nomor BPBD (hanya meja tulis; SEMUA lokasi yang butuh dimuat dikirim bersama: satu panggilan per MAKS_KONTAK lokasi, bukan satu per alert; batas 120 panggilan/jam per operator di server) */
  const kunciKontak = a => `${a.prov}|${a.kab || ""}`, antre = [], MAKS_KONTAK = 20; let jalanKontak = false;
  function pastikanKontak(a) {
    const k = kunciKontak(a), e = S.kontak.get(k), n = Date.now();
    if (e && (e.status === "muat" || e.menyegarkan || n - e.t < (e.status === "gagal" ? KONTAK_ULANG : KONTAK_SEGAR))) return;
    if (e) e.menyegarkan = true; else S.kontak.set(k, {status: "muat", t: n});   // yang sudah tampil tetap tampil selama disegarkan
    antre.push(a);
  }
  const queryKontak = grup => new URLSearchParams(grup.map(a => ["lokasi", `${a.prov}|${a.kab || ""}`])).toString();
  /* lokasi yang gagal dimuat: yang sudah tampil tetap tampil dan dicoba lagi sebentar lagi; yang belum pernah berhasil jadi "gagal" (dicoba ulang sesudah KONTAK_ULANG), bukan "muat" selamanya */
  const gagalKontak = (a, galat, t) => {
    const k = kunciKontak(a), lama = S.kontak.get(k);
    S.kontak.set(k, lama?.status === "ok" ? {...lama, menyegarkan: false, t: t - KONTAK_SEGAR + KONTAK_ULANG} : {status: "gagal", t, galat});
  };
  async function kerjakanKontak() {
    if (jalanKontak) return;
    jalanKontak = true;
    let grup = [];
    try {
      while (antre.length) {
        grup = antre.splice(0, MAKS_KONTAK);
        const r = await ambil("/api/cc/kontak?" + queryKontak(grup)), t = Date.now();
        grup.forEach((a, i) => {   // jawaban searah permintaan; lokasi tanpa jawaban (galat seluruh panggilan) diperlakukan gagal
          const k = kunciKontak(a), jawab = r.ok ? r.j.lokasi?.[i] : null;
          if (jawab) S.kontak.set(k, {status: "ok", t, daftar: jawab.kontak || []});
          else gagalKontak(a, r.ok ? "jawaban tidak lengkap" : r.status === 429 ? "terlalu sering meminta; coba lagi nanti" : r.status === 0 ? "jaringan putus" : (r.j.galat || `galat ${r.status}`), t);
        });
        grup = [];
        gambarDaftar();
      }
    } catch (e) {
      /* galat tak terduga: kartu grup yang sedang jalan jangan macet di "Memuat nomor kantor"; sisa antrean dilanjutkan jajak berikutnya (flag dilepas di finally) */
      console.warn("cc kontak:", e?.message || e);
      const t = Date.now();
      for (const a of grup) { const e2 = S.kontak.get(kunciKontak(a)); if (e2 && (e2.status === "muat" || e2.menyegarkan)) gagalKontak(a, "galat tak terduga", t); }
      try { gambarDaftar(); } catch (x) { /* gambar ulang pun gagal: bukan urusan nomor kantor */ }
    } finally { jalanKontak = false; }
  }
  const telTautan = nomor => { const t = String(nomor).replace(/[^\d+]/g, ""); return /\d/.test(t) ? "tel:" + t : null; };
  function kontakEl(a) {
    const e = S.kontak.get(kunciKontak(a));
    if (!e || e.status === "muat") return h("p", {class: "cc-kontak redup", teks: "Memuat nomor kantor BPBD…"});
    if (e.status === "gagal") return h("p", {class: "cc-kontak redup", teks: `Nomor BPBD belum bisa dimuat (${e.galat}).`});
    if (!e.daftar.length) return h("p", {class: "cc-kontak redup", teks: "Belum ada nomor kantor/Pusdalops BPBD di Buku kontak untuk wilayah ini."});
    return h("ul", {class: "cc-kontak"}, ...e.daftar.map(k => h("li", null, h("span", {class: "cc-kontak-label", teks: `${k.label} (${k.tingkat})`}),
      telTautan(k.nomor) ? h("a", {class: "cc-tel", href: telTautan(k.nomor), teks: k.nomor}) : h("span", {teks: k.nomor}))));
  }
  const sigKontak = a => { const e = S.kontak.get(kunciKontak(a)); return e ? [e.status, e.daftar?.length, e.daftar?.[0]?.nomor, e.galat] : null; };

  /* ---------------------------------------------------------------- kartu */
  const sigKartu = a => JSON.stringify([a.status, a.oleh_nama, a.sejak, a.konfirmasi_lapangan, a.aksi, a.n24, a.luas_ha, a.kec, a.kab, S.sibuk.has(a.id), S.data.saya.tulis && !FINAL.includes(a.status) ? sigKontak(a) : 0]);
  function kartu(a, sig) {
    const final = FINAL.includes(a.status), tulis = S.data.saya.tulis, sibuk = S.sibuk.has(a.id);
    const meta = [a.prov_nama, a.n24 != null ? `${fmt(a.n24)} titik panas (24 jam)` : null, a.luas_ha != null ? `${fmt(Math.round(a.luas_ha))} ha` : null].filter(Boolean).join(", ");
    const pegang = a.status === "baru" ? h("p", {class: "cc-pegang belum", teks: "Belum ada yang memegang"})
      : h("p", {class: "cc-pegang"}, final ? "Diputuskan " : "Dipegang ", h("b", {teks: a.oleh_nama ?? "operator"}), (final ? " pukul " : " sejak ") + jamTgl(a.sejak) + ", ", h("span", {"data-dari": a.sejak}), " lalu");
    const bisa = tulis && a.aksi.length > 0, perluCatatan = bisa && (final || a.status === "dalam_konfirmasi");
    const cat = perluCatatan ? h("input", {class: "cc-catatan", type: "text", maxlength: "300", "data-catatan": a.id, value: S.draft.get(a.id) ?? "", autocomplete: "off",
      placeholder: final ? "Alasan koreksi (wajib, minimal 3 huruf)" : "Catatan (opsional)", "aria-label": final ? "Alasan koreksi" : "Catatan"}) : null;
    const tombol = bisa ? h("div", {class: "cc-aksi"}, ...a.aksi.map(ke => h("button", {class: "cc-btn ke-" + ke, type: "button", "data-id": a.id, "data-ke": ke, disabled: sibuk,
      teks: final ? "Koreksi: buka kembali konfirmasi" : NAMA_AKSI[ke]}))) : null;
    return h("article", {class: "cc-kartu", "data-id": a.id, "data-status": a.status, "data-sig": sig},
      h("div", {class: "cc-kepala"}, h("h3", {teks: lokasi(a)}), h("span", {class: "cc-pil", "data-s": a.status, teks: NAMA_STATUS[a.status] ?? a.status})),
      h("p", {class: "cc-meta"}, meta + ", dibuat " + jamTgl(a.dibuat) + ", umur ", h("span", {"data-dari": a.dibuat})),
      pegang,
      a.konfirmasi_lapangan ? h("p", {class: "cc-lap", teks: "BPBD sudah konfirmasi lapangan"}) : null,
      tulis && !final ? kontakEl(a) : null, cat, tombol);
  }
  /* fokus yang berada di dalam daftar kartu: kartu (id), jenis elemen, dan posisi kursor, untuk dipulihkan sesudah kartunya dibangun ulang */
  function catatFokus() {
    const a = document.activeElement, kartu = a && el.daftar.contains(a) ? a.closest("[data-id]") : null; if (!kartu) return null;
    const sel = a.matches("input[data-catatan]") ? "input[data-catatan]" : a.matches("button[data-ke]") ? `button[data-ke="${a.dataset.ke}"]` : null;
    return sel ? {id: kartu.dataset.id, sel, mulai: a.selectionStart ?? null, akhir: a.selectionEnd ?? null, arah: a.selectionDirection || "none"} : null;
  }
  function pulihkanFokus(f) {
    if (!f) return;
    const e = [...el.daftar.children].find(k => k.dataset.id === f.id)?.querySelector(f.sel);
    if (!e || e.disabled || document.activeElement === e) return;
    e.focus({preventScroll: true});
    if (f.mulai != null) try { e.setSelectionRange(f.mulai, f.akhir, f.arah); } catch (x) { /* elemen tanpa seleksi teks */ }
  }
  /* sinkronkan daftar ke urutan `baru` TANPA melepas kartu yang tidak berubah: kartu usang dibuang dulu, lalu hanya kartu baru/dibangun-ulang yang diselipkan (atau yang urutannya benar-benar bergeser dipindah) */
  function sinkronDaftar(baru) {
    const ada = new Set(baru);
    for (const e of [...el.daftar.children]) if (!ada.has(e)) e.remove();
    let kursor = el.daftar.firstElementChild;
    for (const e of baru) { if (e === kursor) kursor = kursor.nextElementSibling; else el.daftar.insertBefore(e, kursor); }
  }
  function gambarDaftar() {
    const d = S.data; if (!d) return;
    const fokus = catatFokus(), ada = new Map([...el.daftar.children].map(e => [e.dataset.id, e])), baru = d.alert.map(a => { const sig = sigKartu(a), lama = ada.get(a.id); return lama && lama.dataset.sig === sig ? lama : kartu(a, sig); });
    sinkronDaftar(baru); pulihkanFokus(fokus);
    el.kosong.hidden = baru.length > 0; el.kosong.textContent = "Tidak ada alert level 3 yang menunggu tindak lanjut. Layar ini memuat ulang sendiri tiap 30 detik.";
    perbaruiUmur(el.daftar);
  }

  /* ---------------------------------------------------------------- aksi */
  async function lakukan(id, ke) {
    const a = S.data?.alert.find(x => x.id === id); if (!a || S.sibuk.has(id)) return;
    const catatan = (S.draft.get(id) ?? "").trim();
    if (FINAL.includes(a.status) && catatan.length < 3) { pesan("Koreksi wajib bercatatan (minimal 3 huruf): tulis alasannya di kartu.", false); el.daftar.querySelector(`[data-id="${id}"] input`)?.focus(); return; }
    S.sibuk.add(id); gambarDaftar();
    const r = await kirim(`/api/cc/aksi/${id}`, {dari: a.status, ke, ...(catatan ? {catatan} : {})});
    S.sibuk.delete(id);
    if (r.ok) { S.draft.delete(id); pesan(`${lokasi(a)}: ${NAMA_AKSI[ke]}.`, true); }
    else if (r.status === 409) pesan(`Sudah diubah oleh ${r.j.oleh_nama ?? "operator lain"}${r.j.sejak ? " pukul " + jam(r.j.sejak) : ""} menjadi "${NAMA_STATUS[r.j.status] ?? "?"}". Antrean dimuat ulang.`, false);
    else if (r.status === 401 || r.status === 403) { S.sesiHabis = true; gambarSpanduk(); return; }
    else pesan(r.j.galat || "Aksi gagal; coba lagi.", false);
    await muat();   // setelah berhasil, kalah balapan (409), atau galat: selalu tampilkan keadaan terbaru dari server
  }

  /* ---------------------------------------------------------------- log */
  function bangunLog() {
    const L = S.log; L.sudah = true;
    el.lTgl = h("input", {type: "date", value: L.tgl, "aria-label": "Tanggal (WIB)"});
    el.lOp = h("select", {"aria-label": "Operator"}, h("option", {value: "", teks: "Semua operator"}));
    el.lCsv = h("a", {class: "cc-btn", href: "#", download: "", teks: "Unduh CSV"});
    el.lIsi = h("div", {class: "cc-log-isi"});
    /* tanggal diketik/diputar tombolnya = banyak "change" beruntun: tunggu TUNDA_LOG ms sesudah yang terakhir, baru memuat. Sementara itu permintaan yang sedang jalan sudah usang (filter berubah): diputus
       dan jawabannya tak akan menimpa layar. Operator (pilihan sekali klik) memuat segera. */
    const ubah = (hapusOp, tunda = 0) => {
      L.benih = true; L.tgl = el.lTgl.value; if (hapusOp) L.operator = ""; else L.operator = el.lOp.value;
      clearTimeout(L.tunda); L.urut++; L.batal?.abort();
      if (!L.tgl) { L.muat = false; L.hasil = null; L.galat = ""; gambarLog(); return; }   // tanggal dikosongkan: tabel/ringkasan lama dibuang (bukan tanggal lain yang tampak berlaku), tautan CSV mati
      if (!tunda) { muatLog(); return; }
      L.muat = true; L.galat = ""; gambarLog();
      L.tunda = setTimeout(muatLog, tunda);
    };
    el.lTgl.addEventListener("change", () => ubah(true, TUNDA_LOG)); el.lOp.addEventListener("change", () => ubah(false));
    el.pL.replaceChildren(h("div", {class: "cc-saring"}, h("label", null, "Tanggal ", el.lTgl), h("label", null, "Operator ", el.lOp), el.lCsv),
      h("p", {class: "cc-redup", teks: "Tanggal = hari WIB, 00.00–24.00. Durasi respons = dari alert dibuat sampai dipegang pertama kali; durasi konfirmasi = dari dipegang sampai diputuskan."}), el.lIsi);
  }
  function queryLog(csv) { const q = new URLSearchParams({tgl: S.log.tgl}); if (S.log.operator) q.set("operator", S.log.operator); if (csv) q.set("format", "csv"); return q.toString(); }
  async function muatLog() {
    const L = S.log, n = ++L.urut; clearTimeout(L.tunda); L.batal?.abort();
    if (!L.tgl) { L.muat = false; L.hasil = null; L.galat = ""; gambarLog(); return; }   // tanpa tanggal (tab dibuka sebelum tanggal dari server tiba): "Pilih tanggal" + CSV mati, bukan kotak kosong dengan tautan CSV hidup
    const batal = L.batal = new AbortController();
    L.muat = true; L.galat = ""; gambarLog();
    const r = await ambil("/api/cc/log?" + queryLog(false), {batal: batal.signal});
    if (n !== L.urut) return;   // filter berubah selagi memuat (permintaannya sudah diputus): hasil yang ini dibuang
    L.muat = false;
    if (r.status === 401 || r.status === 403) { S.sesiHabis = true; gambarSpanduk(); return; }
    if (!r.ok) { L.galat = r.status === 429 ? "Terlalu sering memuat log; tunggu beberapa menit lalu coba lagi." : r.j.galat || "Log gagal dimuat; coba lagi."; gambarLog(); return; }
    L.hasil = r.j;
    if (!L.operator) {   // daftar operator = yang bertindak di rentang ini (hasil tanpa saringan operator)
      L.daftar = new Map(r.j.ringkasan.map(o => [o.operator, o.nama ?? o.operator]));
      el.lOp.replaceChildren(h("option", {value: "", teks: "Semua operator"}), ...[...L.daftar].map(([id, nama]) => h("option", {value: id, teks: nama})));
    }
    gambarLog();
  }
  function gambarLog() {
    const L = S.log, j = L.hasil, kosong = !L.tgl;
    if (kosong) el.lCsv.removeAttribute("href"); else el.lCsv.href = "/api/cc/log?" + queryLog(true);
    if (kosong) el.lCsv.setAttribute("aria-disabled", "true"); else el.lCsv.removeAttribute("aria-disabled");
    el.lCsv.title = kosong ? "Pilih tanggal" : "";
    if (kosong) { el.lIsi.replaceChildren(h("p", {class: "cc-redup", teks: "Pilih tanggal."})); return; }
    if (L.muat) { el.lIsi.replaceChildren(h("p", {class: "cc-redup", teks: "Memuat log…"})); return; }
    if (L.galat) { el.lIsi.replaceChildren(h("p", {class: "cc-spanduk galat", teks: L.galat})); return; }
    if (!j) { el.lIsi.replaceChildren(); return; }
    const plus = j.terpotong ? "+" : "";   // server memotong log pada j.batas baris pertama: semua hitungan di bawah batas bawah, ditandai "+"
    const ring = h("table", {class: "cc-tabel"}, h("thead", null, h("tr", null, ...["Operator", "Aksi", "Diputuskan", "Median respons", "Median konfirmasi"].map(t => h("th", {teks: t})))),
      h("tbody", null, ...j.ringkasan.map(o => h("tr", null, h("td", {teks: o.nama ?? o.operator}), h("td", {class: "ang", teks: fmt(o.aksi) + plus}), h("td", {class: "ang", teks: fmt(o.selesai) + plus}),
        h("td", {class: "ang", teks: o.median_respons_ms == null ? "–" : durasi(o.median_respons_ms)}), h("td", {class: "ang", teks: o.median_konfirmasi_ms == null ? "–" : durasi(o.median_konfirmasi_ms)})))));
    const tabel = h("table", {class: "cc-tabel"}, h("thead", null, h("tr", null, ...["Waktu", "Operator", "Lokasi", "Perubahan", "Durasi", "Catatan"].map(t => h("th", {teks: t})))),
      h("tbody", null, ...j.jejak.map(x => h("tr", null, h("td", {teks: `${jam(x.waktu)}, ${pendek(x.waktu)}`}), h("td", {teks: x.operator_nama ?? x.operator}),
        h("td", {teks: x.kab ? `${x.kab}, ${x.prov_nama ?? ""}`.replace(/, $/, "") : "(tugas sudah dibuang)"}),
        h("td", null, h("span", {class: "cc-pil", "data-s": x.dari, teks: NAMA_STATUS[x.dari]}), " → ", h("span", {class: "cc-pil", "data-s": x.ke, teks: NAMA_STATUS[x.ke]})),
        h("td", {class: "ang", teks: x.durasi_ms == null ? "–" : `${durasi(x.durasi_ms)} (${JENIS_DURASI[x.durasi_jenis] ?? ""})`}), h("td", {class: "cc-cat", teks: x.catatan ?? ""})))));
    el.lIsi.replaceChildren(h("h3", {teks: `Ringkasan per operator, ${tgl(j.mulai)}`}),
      j.ringkasan.length ? ring : h("p", {class: "cc-redup", teks: "Belum ada tindakan operator pada rentang ini."}),
      h("h3", {teks: `Jejak (${fmt(j.jejak.length)}${plus} baris)`}), j.jejak.length ? tabel : null,
      j.terpotong ? h("p", {class: "cc-spanduk galat", role: "status", teks: `Log melebihi ${fmt(j.batas)} baris dan dipotong pada ${fmt(j.batas)} baris pertama: angka bertanda + adalah batas bawah, median hanya dari baris yang terbaca, dan CSV juga hanya memuat baris ini. Persempit operator atau pilih tanggal lain.`}) : null);
  }

  /* ---------------------------------------------------------------- jalan */
  bangun();
  jajak(muat, 30e3);
  setInterval(() => perbaruiUmur(app), 15e3);
})();
