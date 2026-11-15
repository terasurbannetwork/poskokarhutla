/* /masuk: nomor WhatsApp, kode enam angka, lalu pilih ruang, sandi staf, atau lengkapi profil (data/kajian-bnpb/pintu-masuk/, tiket PM-08).
   Teks dari server masuk lewat textContent (tanpa pemasangan HTML dari data). Nomor hanya di variabel, kode tidak pernah disimpan atau dicatat. */
(() => {
  /* ?ke= hanya jalur di situs sendiri: awalan satu "/", bukan "//" atau "/\", tanpa karakter kontrol atau spasi (sama dengan tujuan() src/statistik.js) */
  const jalurAman = k => typeof k === "string" && /^\/(?![\/\\])[^\x00-\x20\x7f]*$/.test(k) ? k : "";
  /* pintu sandi lama yang cocok dengan halaman tujuan (pintu lama tidak ditutup, KEPUTUSAN D3); ke dibuang untuk tiga pintu itu karena halaman sandinya sudah tahu tujuannya sendiri */
  const pintuSandi = ke => /^\/instansi(?:[\/?#]|$)/.test(ke) ? "/instansi" : /^\/pendataan(?:[\/?#]|$)/.test(ke) ? "/pendataan"
    : /^\/kemitraan(?:[\/?#]|$)/.test(ke) ? "/kemitraan/masuk" : "/admin/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : "");
  const digit = t => String(t ?? "").replace(/\D/g, "");
  const nomorSah = t => { const d = digit(t); return d.length >= 9 && d.length <= 15 && /^(?:0|62)8/.test(d); };
  const tersamar = t => { let d = digit(t); if (d.startsWith("62")) d = "0" + d.slice(2); return d.slice(0, 4) + " xxxx xx" + d.slice(-2); };
  const kalimat = t => { const s = String(t || "").trim(); return s ? s[0].toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? "" : ".") : ""; };
  const lama = d => { const n = Math.max(1, Math.ceil(d)); return n >= 90 ? `${Math.ceil(n / 60)} menit` : `${n} detik`; };
  globalThis.MasukMurni = {jalurAman, pintuSandi, nomorSah, tersamar, kalimat};
  if (!document.getElementById("fNomor")) return;   // dimuat tanpa halaman (uji)

  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  const ke = jalurAman(new URLSearchParams(location.search).get("ke") || "");
  const IKON = {
    instansi: "M3 21h18|M5 21V9l7-5 7 5v12|M9 21v-6h6v6",
    pendataan: "M6 3h12v18H6z|M9 8h6|M9 12h6|M9 16h4",
    kemitraan: "M2 9l10-5 10 5-10 5z|M6 11.5V16c3 2.5 9 2.5 12 0v-4.5",
    pemirsa: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    staf: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
    relawan: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
    petugas: "M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z",
    umum: "M4 6h16|M4 12h16|M4 18h16",
  };
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[n] || IKON.umum).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };

  const LANGKAH = {
    nomor: {f: $("fNomor"), h: "Masuk", info: "Masukkan nomor WhatsApp. Kami kirim kode enam angka."},
    kode: {f: $("fKode"), h: "Masuk", info: ""},
    ruang: {f: $("vRuang"), h: "Pilih ruang", info: "Pilih ruang yang mau dibuka."},
    sandi: {f: $("fSandi"), h: "Masukkan sandi", info: ""},
    lengkapi: {f: $("fLengkapi"), h: "Lengkapi data", info: "Sekali saja. Data ini membantu petugas menanggapi kirimanmu."},
  };
  let aktif = "nomor", nomor = "", pilihStaf = null, hitung = null, gambarUlang = null;
  const pesanEl = () => LANGKAH[aktif].f.querySelector(".bn-pesan");
  const pesan = (t, ok) => { const p = pesanEl(); p.textContent = t || ""; p.className = "bn-pesan" + (t ? (ok ? " ok" : " galat") : ""); };
  const layar = (nama, info) => {
    aktif = nama;
    for (const [k, v] of Object.entries(LANGKAH)) v.f.hidden = k !== nama;
    $("mkJudul").textContent = LANGKAH[nama].h; $("mkInfo").textContent = info ?? LANGKAH[nama].info; $("mkInfo").hidden = !$("mkInfo").textContent;
    pesan("");
    const f = LANGKAH[nama].f.querySelector("input:not([type=checkbox]),select,button.mk-baris") || $("mkJudul");
    f.focus({preventScroll: false});
  };
  const sibuk = (tombol, ya, teks) => { if (ya) { tombol.dataset.teks = tombol.textContent; tombol.textContent = teks; } else if (tombol.dataset.teks) tombol.textContent = tombol.dataset.teks; tombol.disabled = ya; };

  async function kirim(jalur, badan) {
    if (navigator.onLine === false) return {s: 0, j: {galat: "tidak ada koneksi"}};
    try {
      const r = await fetch(jalur, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan || {})});
      return {s: r.status, j: await r.json().catch(() => ({})), tunggu: Number(r.headers.get("retry-after")) || 0};
    } catch (e) { return {s: 0, j: {galat: "tidak ada koneksi"}}; }
  }
  const galat = r => r.s === 0 ? "Tidak ada koneksi." : r.s === 429 ? `Terlalu banyak percobaan. Coba lagi ${r.tunggu ? lama(r.tunggu) + " lagi" : "nanti"}.`
    : r.s === 503 ? "Masuk dengan nomor WhatsApp belum aktif." : kalimat(r.j.galat) || "Terjadi gangguan. Coba lagi.";
  const pergi = tujuan => location.assign(jalurAman(tujuan) || "/alun-alun");

  /* ---------- L1: nomor ---------- */
  $("aSandi").href = pintuSandi(ke); $("aTerganggu").href = pintuSandi(ke);
  async function mintaKode(ulang) {
    const tombol = ulang ? $("bUlang") : $("bKirim");
    pesan(""); sibuk(tombol, true, "Mengirim...");
    const t = await window.tokenTurnstile?.();
    const r = await kirim("/api/masuk/kode", {wa: nomor, turnstile: t || undefined});
    sibuk(tombol, false);
    if (r.s === 200) { layar("kode", `Kode dikirim ke WhatsApp ${tersamar(nomor)}`); mulaiHitung(r.j.tunggu || 60); return; }
    if (r.s === 503) tutup();
    if (ulang && r.s === 429 && r.tunggu) mulaiHitung(r.tunggu);
    pesan(galat(r));
  }
  $("fNomor").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("iNomor").value.trim();
    if (!nomorSah(v)) return pesan("Nomor WhatsApp tidak sah. Contoh 0812xxxxxxxx.");
    nomor = v; mintaKode(false);
  });

  /* ---------- L2: kode ---------- */
  function mulaiHitung(detik) {
    clearInterval(hitung); const akhir = Date.now() + Math.ceil(detik) * 1000, b = $("bUlang");   // sisa dihitung dari jam, bukan dari jumlah tick: tab yang tertidur tetap tepat
    const gambar = () => { const sisa = Math.max(0, Math.ceil((akhir - Date.now()) / 1000)); b.disabled = sisa > 0; b.textContent = sisa > 0 ? `Kirim ulang dalam ${Math.floor(sisa / 60)}:${String(sisa % 60).padStart(2, "0")}` : "Kirim ulang"; if (sisa <= 0) clearInterval(hitung); };
    gambarUlang = gambar; gambar();
    hitung = setInterval(() => { if (document.hidden) return; gambar(); }, 1000);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) gambarUlang?.(); });   // tab dibuka lagi: tombol hidup tepat waktu
  let periksaJalan = false;
  async function periksa() {
    if (periksaJalan) return;
    const kode = $("iKode").value.trim();
    if (!/^[0-9]{6}$/.test(kode)) return pesan("Kode terdiri dari enam angka.");
    periksaJalan = true; pesan(""); sibuk($("bKode"), true, "Memeriksa...");
    const r = await kirim("/api/masuk/periksa", {wa: nomor, kode});
    periksaJalan = false; sibuk($("bKode"), false);
    if (r.s !== 200) { if (r.s === 503) tutup(); $("iKode").select(); return pesan(galat(r)); }
    clearInterval(hitung); gambarUlang = null; $("iKode").value = ""; $("iNomor").value = ""; nomor = "";
    sesudahMasuk(r.j.ruang || [], r.j.lengkap);
  }
  $("fKode").addEventListener("submit", e => { e.preventDefault(); periksa(); });
  $("iKode").addEventListener("input", () => { const i = $("iKode"), b = i.value.replace(/\D/g, "").slice(0, 6); if (b !== i.value) i.value = b; if (b.length === 6) periksa(); });
  $("bUlang").addEventListener("click", () => mintaKode(true));
  $("bGanti").addEventListener("click", () => { clearInterval(hitung); $("iKode").value = ""; layar("nomor"); });

  /* ---------- sesudah kode sah ---------- */
  function sesudahMasuk(ruang, lengkap) {
    if (!ruang.length) return lengkap ? pergi(ke) : bukaLengkapi();
    const satu = ruang.length === 1 && !ruang[0].perlu_pilih && !ruang[0].butuh_sandi;
    if (satu) return pergi(ke || ruang[0].ke);
    daftarRuang(ruang); layar("ruang");
  }

  /* ---------- L3: ruang ---------- */
  function daftarRuang(ruang) {
    const ul = $("daftarRuang"); ul.replaceChildren();
    if (!ruang.length) { const a = el("a", "mk-tautan", "Belum ada ruang untuk nomor ini. Ke alun-alun"); a.href = "/alun-alun"; const li = el("li"); li.append(a); ul.append(li); return; }
    for (const r of ruang) {
      const b = el("button", "mk-baris"); b.type = "button";
      b.append(ikon(r.jenis), el("span", "mk-nama", r.nama_ruang), el("span", "mk-sub", [r.lembaga, r.wilayah].filter(Boolean).join(", ")));
      b.addEventListener("click", () => pilih(r, b));
      const li = el("li"); li.append(b); ul.append(li);
    }
  }
  async function pilih(r, b) {
    if (r.butuh_sandi) { pilihStaf = r.pilih || null; layar("sandi", `${r.nama_ruang}. Masukkan sandi akun stafmu.`); return; }
    if (!r.perlu_pilih) return pergi(r.ke);
    b.disabled = true; pesan("");
    const x = await kirim("/api/masuk/pilih", {jenis: r.jenis, pilih: r.pilih});
    b.disabled = false;
    if (x.s === 200) return pergi(x.j.ke || r.ke);
    pesan(galat(x));
  }
  /* sisa data orang sebelumnya tidak boleh tinggal di halaman sesudah keluar (peramban bersama) */
  function bersih() {
    clearInterval(hitung); gambarUlang = null; nomor = ""; pilihStaf = null;
    for (const i of ["iNomor", "iKode", "iSandi", "iNama", "iKab"]) $(i).value = "";
    $("iProv").value = ""; $("iSetuju").checked = false; $("daftarRuang").replaceChildren(); $("daftarKab").replaceChildren();
  }
  async function keluar() {
    const b = $("bKeluar"); b.disabled = true;
    const r = await kirim("/api/masuk/keluar", {});
    b.disabled = false;
    if (r.s === 200) { b.hidden = true; bersih(); layar("nomor"); } else pesan(galat(r));
  }
  $("bKeluar").addEventListener("click", keluar);
  $("bKembali").addEventListener("click", () => layar("ruang"));

  /* ---------- sandi staf ---------- */
  $("fSandi").addEventListener("submit", async e => {
    e.preventDefault();
    const sandi = $("iSandi").value;
    if (!sandi) return pesan("Sandi wajib diisi.");
    pesan(""); sibuk($("bSandi"), true, "Memeriksa...");
    const r = await kirim("/api/masuk/sandi", {sandi, staf: pilihStaf});
    sibuk($("bSandi"), false);
    if (r.s !== 200) { $("iSandi").value = ""; return pesan(galat(r)); }
    $("iSandi").value = "";
    pergi(r.j.wajib_ganti ? r.j.ke : ke || r.j.ke);
  });

  /* ---------- L4: lengkapi ---------- */
  let kabPerProv = null;
  const muatKab = async () => {
    if (kabPerProv) return kabPerProv;
    kabPerProv = {};
    try { const r = await fetch("/data/wilayah/indeks.json"); if (r.ok) for (const [kode, [, nama]] of Object.entries(await r.json())) (kabPerProv[kode.slice(0, 2)] ||= []).push(nama); } catch (e) {}
    return kabPerProv;
  };
  async function isiKab() {
    const dl = $("daftarKab"), prov = $("iProv").value; dl.replaceChildren();
    const daftar = (await muatKab())[prov] || [];
    if ($("iProv").value !== prov) return;   // provinsi berganti selama menunggu: hasil basi dibuang
    for (const n of daftar) { const o = document.createElement("option"); o.value = n; dl.append(o); }
  }
  function bukaLengkapi() {
    const s = $("iProv");
    if (s.options.length < 2) for (const [k, n] of Object.entries(window.Wilayah?.PROV || {})) { const o = document.createElement("option"); o.value = k; o.textContent = n; s.append(o); }
    layar("lengkapi");
  }
  $("iProv").addEventListener("change", () => { $("iKab").value = ""; isiKab(); });
  $("fLengkapi").addEventListener("submit", async e => {
    e.preventDefault();
    const nama = $("iNama").value.trim(), prov = $("iProv").value, kab = $("iKab").value.trim();
    if (nama.length < 2) return pesan("Isi namamu, paling sedikit dua huruf.");
    if (!prov) return pesan("Pilih provinsi.");
    if (kab.length < 2) return pesan("Isi kabupaten atau kota.");
    if (!$("iSetuju").checked) return pesan("Centang persetujuan dulu untuk melanjutkan.");
    pesan(""); sibuk($("bSimpan"), true, "Menyimpan...");
    const r = await kirim("/api/masuk/lengkapi", {nama, prov, kab, setuju: true});
    sibuk($("bSimpan"), false);
    if (r.s === 200) return pergi(ke);
    pesan(galat(r));
  });

  /* ---------- keadaan awal ---------- */
  const tutup = () => { $("bKirim").disabled = true; $("bKode").disabled = true; $("bUlang").disabled = true; };   // rute belum aktif: tombol kirim mati, tautan sandi tetap ada
  async function mulai() {
    const ambil = jalur => fetch(jalur).then(async r => ({s: r.status, j: await r.json().catch(() => ({}))}), () => ({s: 0, j: {}}));
    const [saya, saluran] = await Promise.all([ambil("/api/masuk/saya"), ambil("/api/masuk/saluran")]);
    $("mkMuat").hidden = true;
    if (saya.s === 200) {
      $("bKeluar").hidden = false;
      const ruang = saya.j.ruang || [];
      if (!ruang.length && !saya.j.akun?.lengkap) return bukaLengkapi();
      daftarRuang(ruang); return layar("ruang");
    }
    layar("nomor");
    if (saya.s === 0 && saluran.s === 0) return pesan("Tidak ada koneksi.");
    if ([saya.s, saluran.s].some(x => x === 404 || x === 503)) { tutup(); return pesan("Masuk dengan nomor WhatsApp belum aktif."); }   // rute belum terbit atau migrasi belum jalan
    if (saluran.s === 200 && saluran.j.wa === false) $("mkTerganggu").hidden = false;
  }
  window.addEventListener("offline", () => { if (aktif !== "ruang") pesan("Tidak ada koneksi."); });
  mulai();
})();
