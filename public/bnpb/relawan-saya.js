/* /relawan/saya: halaman pribadi relawan. Kode dari fragmen #k=… (tidak ikut ke server/log) disimpan di sessionStorage (hilang saat tab ditutup; tombol Keluar menghapusnya), dikirim lewat header x-kode.
   Status alur, penugasan (terima/tolak, check-in/out dengan lokasi opsional), jam kerja, pelatihan, ketersediaan, dan hapus data (hak UU PDP). CSP: tanpa inline. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), K = "pb_kode_relawan";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => Number(n || 0).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const wkt = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "–";
  const tgl = s => s ? new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–";
  const durasi = m => m == null ? "–" : `${angka(m / 60)} jam`;
  const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IKON = {jam: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), centang: I('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'), bolt: I('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'), pin: I('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    bendera: I('<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>'), x: I('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>'), jeda: I('<circle cx="12" cy="12" r="9"/><path d="M10 9v6m4-6v6"/>'), larang: I('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'),
    orang: I('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>'), api: I('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>')};
  const pil = (k, ikon, t) => `<span class="bn-pil ${k}">${IKON[ikon] || ""}${esc(t)}</span>`;
  const STATUS = {terdaftar: ["p-kuning", "jam", "Menunggu verifikasi"], diverifikasi: ["p-biru", "centang", "Terverifikasi"], siap_tugas: ["p-hijau", "bolt", "Siap tugas"], ditugaskan: ["p-ungu", "pin", "Ditugaskan"],
    bertugas: ["p-hijau", "api", "Sedang bertugas"], selesai: ["p-hijau", "bendera", "Selesai"], ditolak: ["p-merah", "x", "Ditolak"], nonaktif: ["p-abu", "jeda", "Nonaktif"], daftar_hitam: ["p-merah", "larang", "Dibatasi"]};
  const NAMA_ALUR = {terdaftar: "Terdaftar", diverifikasi: "Diverifikasi", siap_tugas: "Siap tugas", ditugaskan: "Ditugaskan", bertugas: "Bertugas", selesai: "Selesai"};
  const PENUGASAN = {ditawarkan: ["p-kuning", "jam", "Menunggu jawabanmu"], diterima: ["p-biru", "centang", "Kamu terima"], ditolak: ["p-abu", "x", "Kamu tolak"], bertugas: ["p-hijau", "api", "Bertugas"], selesai: ["p-hijau", "bendera", "Selesai"], dibatalkan: ["p-abu", "x", "Dibatalkan"]};
  const SAH = {0: ["p-kuning", "jam", "Menunggu validasi"], 1: ["p-hijau", "centang", "Sah"], 2: ["p-merah", "x", "Ditolak"]};
  const sp = ([k, i, t]) => pil(k, i, t);
  const pesan = (t, ok) => { const p = $("pesan"); p.textContent = t || ""; p.className = "bn-pesan " + (t ? (ok ? "ok" : "galat") : ""); };
  const baca = () => { try { return sessionStorage.getItem(K); } catch (e) { return null; } };
  try { localStorage.removeItem(K); } catch (e) {}   // sisa versi lama: kode tidak lagi disimpan permanen
  let kode = (location.hash.match(/^#k=([0-9a-fA-F]{26})$/) || [])[1]?.toLowerCase() || null, d = null;
  if (kode) { try { sessionStorage.setItem(K, kode); } catch (e) {} try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  else { const b = baca(); if (b && /^[0-9a-f]{26}$/.test(b)) kode = b; }

  /* F6 luring: check-in/out masuk antrean perangkat bila tanpa sinyal (antre.js); kode TIDAK ikut tersimpan, diambil dari sini saat kirim */
  const antre = Antre.buat({untuk: "relawan", simpan: Antre.penyimpanan("bnpb"), kirimItem: Antre.pengirim(() => kode || ""), kodeAda: () => !!kode});
  async function api(metode, j, body) {
    let r; try { r = await fetch(j, {method: metode, headers: {"x-kode": kode, ...(body ? {"content-type": "application/json"} : {})}, body: body ? JSON.stringify(body) : undefined}); } catch (e) { return {ok: false, s: 0, j: {galat: "Tidak ada sinyal. Coba lagi."}}; }
    return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))};
  }
  /* tabel standar: kepala gelap, urut per kolom, berhalaman */
  function Tabel(el, kolom, rows, kosong, ukuran = 8) {
    let urut = -1, arah = 1, hal = 0;
    const nil = (b, k) => k.v ? k.v(b) : b[k.k];
    const gambar = () => {
      const x = rows.slice();
      if (urut >= 0) { const k = kolom[urut]; x.sort((a, b) => { const p = nil(a, k), q = nil(b, k); return arah * (typeof p === "number" && typeof q === "number" ? p - q : String(p ?? "").localeCompare(String(q ?? ""), "id")); }); }
      const total = Math.max(1, Math.ceil(x.length / ukuran)); hal = Math.min(hal, total - 1);
      const isi = x.slice(hal * ukuran, (hal + 1) * ukuran);
      el.innerHTML = `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kolom.map((k, i) => `<th aria-sort="${urut === i ? (arah > 0 ? "ascending" : "descending") : "none"}"><button type="button" class="rl-urut" data-u="${i}">${esc(k.l)}${urut === i ? (arah > 0 ? " ▲" : " ▼") : ""}</button></th>`).join("")}</tr></thead><tbody>${
        isi.length ? isi.map(b => `<tr>${kolom.map(k => `<td>${k.h ? k.h(b) : esc(nil(b, k))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${kolom.length}" class="rl-kosong">${esc(kosong)}</td></tr>`}</tbody></table></div>${
        total > 1 ? `<div class="rl-hal"><button type="button" class="ad-tombol kecil" data-h="-1" ${hal === 0 ? "disabled" : ""}>Sebelumnya</button><span>Halaman ${hal + 1} dari ${total}</span><button type="button" class="ad-tombol kecil" data-h="1" ${hal >= total - 1 ? "disabled" : ""}>Berikutnya</button></div>` : ""}`;
    };
    el.onclick = e => { const u = e.target.closest("[data-u]"), h = e.target.closest("[data-h]"); if (u) { const i = +u.dataset.u; arah = urut === i ? -arah : 1; urut = i; hal = 0; gambar(); } else if (h && !h.disabled) { hal += +h.dataset.h; gambar(); } };
    gambar();
  }

  function kartuPenugasan(g) {
    const aksi = g.status === "ditawarkan" ? `<button class="bn-tombol" data-a="terima" data-id="${esc(g.id)}">Terima tugas</button><button class="bn-tombol sekunder" data-a="tolak" data-id="${esc(g.id)}">Tolak</button>` :
      g.status === "diterima" || g.status === "bertugas" ? `<button class="bn-tombol" data-a="masuk" data-id="${esc(g.id)}">Check-in</button><button class="bn-tombol sekunder" data-a="keluar" data-id="${esc(g.id)}">Check-out</button>
        <label class="rl-cek"><input type="checkbox" class="gps"> Sertakan lokasiku saat check-in</label>` : "";
    return `<article class="bn-kartu rl-penugasan"><h3>${esc(g.judul)} ${sp(PENUGASAN[g.status])}</h3>
      <div class="rl-kecil">${esc(g.kab)} · ${esc(d.provinsi[g.prov] || g.prov)} · ${tgl(g.mulai)} sampai ${tgl(g.selesai)}</div>${g.catatan ? `<div class="rl-kecil">${esc(g.catatan)}</div>` : ""}
      <div class="rl-kecil">Asuransi: ${esc({belum: "belum diurus", diajukan: "sedang diajukan", aktif: "aktif", tidak_perlu: "tidak perlu"}[g.asuransi] || g.asuransi)}</div><div class="rl-aksi">${aksi}</div></article>`;
  }
  function gambar(x) {
    const r = x.relawan, st = STATUS[r.status], idx = x.alur.indexOf(r.status), berhenti = idx < 0;
    $("isi").hidden = false;
    $("isi").innerHTML = `<section class="bn-blok"><div class="bn-judul"><h1>${esc(r.nama)}</h1><div class="bn-aksi">${sp(st)}<button class="bn-tombol sekunder" type="button" data-keluar>Keluar</button></div></div>
      <ol class="bn-alur" aria-label="Alur relawan">${x.alur.map((s, i) => `<li ${s === r.status ? 'aria-current="step"' : ""} class="${!berhenti && i < idx ? "lewat" : ""}">${NAMA_ALUR[s]}</li>`).join("")}</ol>
      ${r.alasan ? `<p>Catatan dari admin: ${esc(r.alasan)}</p>` : ""}
      <div class="rl-baris"><span class="rl-kecil">${esc(r.kab)}, ${esc(d.provinsi[r.prov] || r.prov)}</span>${r.kampus ? pil("p-kuning", "orang", r.kampus) : ""}
        ${r.keahlian.map(k => `<span class="bn-pil p-abu">${esc(d.keahlianNama[k] || k)}</span>`).join("")}</div>
      <div class="rl-aksi">${r.status === "diverifikasi" || r.status === "selesai" ? '<button class="bn-tombol" data-s="siap">Aku siap tugas</button>' : ""}${r.status === "siap_tugas" ? '<button class="bn-tombol sekunder" data-s="istirahat">Aku istirahat dulu</button>' : ""}</div></section>
      <div class="rl-grid2"><section class="rl-tata"><h2>${pil("p-ungu", "pin", "Penugasan")}</h2>${x.penugasan.length ? x.penugasan.map(kartuPenugasan).join("") : '<div class="bn-blok"><p class="rl-kecil">Belum ada penugasan. Admin akan menghubungimu saat ada kebutuhan yang cocok.</p></div>'}</section>
        <section class="rl-tata"><div class="bn-kartu"><div class="bn-angka">${durasi(x.jam_sah_menit)}</div><div class="bn-label">${pil("p-hijau", "centang", "Jam kerja tervalidasi")}</div></div>
        <h2>${pil("p-biru", "jam", "Riwayat jam kerja")}</h2><div id="tJam"></div><h2>${pil("p-biru", "centang", "Pelatihan dan sertifikat")}</h2><div id="tLatih"></div></section></div>
      <section class="bn-blok"><h2>${pil("p-biru", "bolt", "Ketersediaan")}</h2><form id="fKet" class="bn-form"><div class="bn-baris">
        <label class="bn-isian">Hari siap per minggu<input name="hari_per_minggu" type="number" min="1" max="7" value="${r.hari_per_minggu}" required></label>
        <label class="bn-isian">Siap bertugas sampai (hari)<input name="maks_hari" type="number" min="1" max="365" value="${r.maks_hari}" required></label>
        <label class="bn-isian">Bersedia keluar provinsi<select name="luar_provinsi"><option value="ya" ${r.luar_provinsi ? "selected" : ""}>Ya</option><option value="tidak" ${r.luar_provinsi ? "" : "selected"}>Tidak</option></select></label></div>
        <div><button class="bn-tombol" type="submit">Simpan ketersediaan</button></div></form></section>
      <section class="bn-blok rl-bahaya"><details><summary>Hapus datamu</summary><p>Identitasmu (nama, WhatsApp, email, kota, kontak darurat, sertifikat, pelatihan, lokasi check-in) dihapus permanen sesuai hak UU PDP. Yang tersisa hanya angka tanpa identitas: total jam kerja, provinsi, dan status penugasan, untuk statistik. Tautan ini tidak bisa dipakai lagi.</p>
        <form id="fHapus" class="bn-baris"><label class="bn-isian">Ketik HAPUS untuk melanjutkan<input name="konfirmasi" autocomplete="off"></label><div><button class="bn-tombol sekunder" type="submit">Hapus dataku</button></div></form></details></section>`;
    Tabel($("tJam"), [{l: "Masuk", k: "masuk", h: j => wkt(j.masuk)}, {l: "Keluar", k: "keluar", h: j => j.keluar ? wkt(j.keluar) : pil("p-hijau", "api", "Sedang berjalan")}, {l: "Durasi", k: "menit", h: j => durasi(j.menit)},
      {l: "Tugas", k: "judul"}, {l: "Validasi", v: j => j.sah, h: j => sp(SAH[j.sah])}], x.jam, "Belum ada jam kerja.");
    Tabel($("tLatih"), [{l: "Pelatihan", k: "nama"}, {l: "Penyelenggara", v: p => p.penyelenggara || ""}, {l: "Tanggal", k: "tgl", h: p => tgl(p.tgl)}, {l: "Berlaku sampai", v: p => p.berlaku_sampai || "", h: p => tgl(p.berlaku_sampai)}], x.pelatihan, "Belum ada pelatihan tercatat. Admin yang mencatatnya setelah kamu mengikuti pelatihan.");
  }
  async function muat() {
    const r = await api("GET", "/api/relawan/saya");
    if (r.s === 0) return pesan(r.j.galat);   // tanpa sinyal: biarkan tampilan terakhir
    if (!r.ok) { $("isi").hidden = true; if (r.s === 403) { $("tanpaKode").hidden = false; pesan("Tautan pribadimu tidak berlaku (salah atau sudah dicabut). Minta tautan baru dari admin."); try { sessionStorage.removeItem(K); } catch (e) {} } else pesan(r.j.galat || "Halaman belum bisa dimuat."); return; }
    const k = await (await fetch("/api/relawan/ringkas")).json().catch(() => ({}));
    d = {provinsi: k.konfig?.provinsi || {}, keahlianNama: k.konfig?.keahlian || {}}; $("tanpaKode").hidden = true; gambar(r.j);
  }
  const lokasi = () => new Promise(ok => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lon: p.coords.longitude}), () => ok(null), {enableHighAccuracy: true, timeout: 15000}) : ok(null));

  $("isi").addEventListener("click", async e => {
    if (e.target.closest("[data-keluar]")) { try { sessionStorage.removeItem(K); } catch (x) {} kode = null; $("isi").hidden = true; $("tanpaKode").hidden = false; return pesan("Kamu sudah keluar. Buka lagi tautan pribadimu untuk masuk.", true); }
    const t = e.target.closest("button[data-a], button[data-s]"); if (!t) return;
    t.disabled = true; pesan("");
    let r;
    if (t.dataset.s) r = await api("POST", "/api/relawan/saya", {aksi: t.dataset.s});
    else {
      const body = {aksi: t.dataset.a};
      if (t.dataset.a === "masuk" && t.closest("article").querySelector(".gps")?.checked) { pesan("Membaca lokasimu..."); const p = await lokasi(); if (p) Object.assign(body, p); else pesan("Lokasi tidak terbaca; check-in dicatat tanpa lokasi.", false); }
      r = body.aksi === "masuk" || body.aksi === "keluar" ? await antre.kirim("POST", `/api/relawan/saya/penugasan/${t.dataset.id}`, body) : await api("POST", `/api/relawan/saya/penugasan/${t.dataset.id}`, body);
    }
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.s})`); t.disabled = false; return; }
    if (r.antre) { segarkanPita(); return pesan(`${t.dataset.a === "masuk" ? "Check-in" : "Check-out"} disimpan di perangkat dengan jam saat ini. Dikirim otomatis begitu ada sinyal.`, true); }
    await muat();
    pesan({terima: "Tugas diterima.", tolak: "Tugas ditolak.", masuk: "Check-in tercatat.", keluar: `Check-out tercatat (${durasi(r.j.menit)}). Jammu menunggu validasi.`, siap: "Kamu tercatat siap tugas.", istirahat: "Kamu istirahat dulu."}[t.dataset.a || t.dataset.s], true);
  });
  $("isi").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, tb = f.querySelector("button[type=submit]"); tb.disabled = true; pesan("");
    if (f.id === "fKet") {
      const v = Object.fromEntries(new FormData(f)), r = await api("POST", "/api/relawan/saya", {aksi: "ketersediaan", hari_per_minggu: Number(v.hari_per_minggu), maks_hari: Number(v.maks_hari), luar_provinsi: v.luar_provinsi === "ya"});
      tb.disabled = false; return pesan(r.ok ? "Ketersediaan tersimpan." : r.j.galat || "Gagal menyimpan.", r.ok);
    }
    if (f.id === "fHapus") {
      const r = await api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: new FormData(f).get("konfirmasi")});
      if (!r.ok) { tb.disabled = false; return pesan(r.j.galat || "Gagal menghapus."); }
      try { sessionStorage.removeItem(K); } catch (x) {}
      $("isi").hidden = true; pesan("Datamu sudah dihapus. Terima kasih sudah bersedia membantu.", true);
    }
  });
  const segarkanPita = Antre.pasang(antre, {wadah: document.querySelector("main"), selesai: () => { if (kode) muat(); }});
  if (!kode) { $("tanpaKode").hidden = false; } else muat();
})();
