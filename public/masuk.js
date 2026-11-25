/* /masuk: nomor WhatsApp, kode enam angka, lalu pilih ruang, sandi staf, atau lengkapi profil (data/kajian-bnpb/pintu-masuk/, tiket PM-08).
   Teks dari server masuk lewat textContent (tanpa pemasangan HTML dari data). Nomor hanya di variabel, kode tidak pernah disimpan atau dicatat. */
(() => {
  /* ?ke= hanya jalur di situs sendiri: awalan satu "/", bukan "//" atau "/\", tanpa karakter kontrol atau spasi (sama dengan tujuan() src/statistik.js) */
  const jalurAman = k => typeof k === "string" && /^\/(?![\/\\])[^\x00-\x20\x7f]*$/.test(k) ? k : "";
  /* tautan "Masuk dengan sandi": form sandi di halaman ini (#sandi, K21: staf, admin, pemirsa, instansi), kecuali akun pendataan dan koordinator kampus yang sandinya di modulnya sendiri */
  const pintuSandi = ke => /^\/pendataan(?:[\/?#]|$)/.test(ke) ? "/pendataan" : /^\/kemitraan(?:[\/?#]|$)/.test(ke) ? "/kemitraan/masuk" : "#sandi";
  const digit = t => String(t ?? "").replace(/\D/g, "");
  const nomorSah = t => { const d = digit(t); return d.length >= 9 && d.length <= 15 && /^(?:0|62)8/.test(d); };
  const kalimat = t => { const s = String(t || "").trim(); return s ? s[0].toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? "" : ".") : ""; };
  globalThis.MasukMurni = {jalurAman, pintuSandi, nomorSah, kalimat};
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
    aparat: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
  };
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[n] || IKON.umum).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };

  const LANGKAH = {
    nomor: {f: $("fNomor"), h: "Masuk", info: "Masukkan nomor WhatsApp. Kami kirim kode enam angka."},
    kode: {f: $("fKode"), h: "Masuk", info: ""},
    ruang: {f: $("vRuang"), h: "Pilih ruang", info: "Pilih ruang yang mau dibuka."},
    sandi: {f: $("fSandi"), h: "Masukkan sandi", info: ""},
    peran: {f: $("vPeran"), h: "Saya petugas atau relawan", info: "Pilih peranmu."},
    lengkapi: {f: $("fLengkapi"), h: "Lengkapi data", info: "Sekali saja. Data ini membantu petugas menanggapi kirimanmu."},
    email: {f: $("fEmail"), h: "Kode lewat email", info: "Ketik alamat email akunmu. Kode dikirim bila alamat itu cocok dengan akun bernomor ini."},
    sandibaru: {f: $("fSandiBaru"), h: "Atur sandi", info: ""},
    hapus: {f: $("fHapus"), h: "Hapus akun", info: "Penghapusan tidak bisa dibatalkan."},
    akun: {f: $("fAkun"), h: "Masuk dengan sandi", info: "Untuk staf BNPB, BPBD, dan instansi yang punya username dan sandi."},
  };
  let aktif = "nomor", nomor = "", pilihStaf = null, hitung = null, gambarUlang = null;
  let emailMode = false, segarNo = 0, kirimWa = 0, saluranEmail = false, waMati = false, emailDari = "nomor", sandiTarget = null, akunKini = {sandi: [], anggotaN: 0};
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
  const sibuk = (tombol, ya, teks) => { if (ya) { if (!tombol.disabled) tombol.dataset.teks = tombol.textContent; tombol.textContent = teks; } else if (tombol.dataset.teks) tombol.textContent = tombol.dataset.teks; tombol.disabled = ya; };

  async function kirim(jalur, badan) {
    if (navigator.onLine === false) return {s: 0, j: {galat: "tidak ada koneksi"}};
    try {
      const r = await fetch(jalur, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan || {})});
      return {s: r.status, j: await r.json().catch(() => ({})), tunggu: Number(r.headers.get("retry-after")) || 0};
    } catch (e) { return {s: 0, j: {galat: "tidak ada koneksi"}}; }
  }
  const galat = r => r.s === 503 ? "Masuk dengan nomor WhatsApp belum aktif." : PesanLayar.galat(r.s, kalimat(r.j.galat), r.tunggu);
  const pergi = tujuan => location.assign(jalurAman(tujuan) || "/alun-alun");

  /* ---------- L1: nomor ---------- */
  $("aSandi").href = pintuSandi(ke); $("aTerganggu").href = pintuSandi(ke);
  async function mintaKode(ulang) {
    const tombol = ulang ? $("bUlang") : $("bKirim");
    pesan(""); sibuk(tombol, true, "Mengirim...");
    const t = await window.tokenTurnstile?.();
    const r = await kirim("/api/masuk/kode", {wa: nomor, turnstile: t || undefined});
    sibuk(tombol, false);
    if (r.s === 200) { kirimWa++; layar("kode", `Kode dikirim ke WhatsApp ${PesanLayar.samar(digit(nomor))}`); mulaiHitung(r.j.tunggu || 60); tawarEmail(); return; }
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
    if (r.j.lewat === "email") return sesudahEmail(r.j.ruang || []);
    sesudahMasuk(r.j.ruang || [], r.j.lengkap, r.j.menunggu);
  }
  $("fKode").addEventListener("submit", e => { e.preventDefault(); periksa(); });
  $("iKode").addEventListener("input", () => { const i = $("iKode"), b = i.value.replace(/\D/g, "").slice(0, 6); if (b !== i.value) i.value = b; if (b.length === 6) periksa(); });
  $("bUlang").addEventListener("click", () => mintaKode(true));
  $("bGanti").addEventListener("click", () => { clearInterval(hitung); $("iKode").value = ""; kirimWa = 0; layar("nomor"); tawarEmail(); });

  /* ---------- kode lewat email (PM-16, ALUR A8): ditawarkan sesudah dua kali kirim WA, atau saat WA terganggu; alamat diketik, jawaban server selalu sama ---------- */
  const tawarEmail = () => {
    const ya = saluranEmail && (kirimWa >= 2 || waMati), baru = $("bEmail").hidden && ya;
    $("bEmail").hidden = !ya; $("bEmailNomor").hidden = !(saluranEmail && waMati);
    if (baru && aktif === "kode") pesan("Kode belum sampai? Kamu bisa meminta kode lewat email.", true);   // pembaca layar tahu ada tombol baru (role=status)
  };
  function bukaEmail(dari) { emailDari = dari; $("iEmail").value = ""; layar("email"); }
  $("bEmail").addEventListener("click", () => bukaEmail("kode"));
  $("bEmailNomor").addEventListener("click", () => {
    const v = $("iNomor").value.trim();
    if (!nomorSah(v)) return pesan("Nomor WhatsApp tidak sah. Contoh 0812xxxxxxxx.");
    nomor = v; bukaEmail("nomor");
  });
  $("bEmailKembali").addEventListener("click", () => { layar(emailDari === "kode" && nomor ? "kode" : "nomor"); tawarEmail(); });
  $("fEmail").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("iEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return pesan("Alamat email tidak sah.");
    pesan(""); sibuk($("bEmailKirim"), true, "Mengirim...");
    const t = await window.tokenTurnstile?.();
    const r = await kirim("/api/masuk/kode_email", {wa: nomor, email, turnstile: t || undefined});
    sibuk($("bEmailKirim"), false);
    if (r.s !== 200) return pesan(r.s === 503 ? "Kode lewat email belum aktif." : galat(r));
    $("iEmail").value = ""; layar("kode", "Bila alamat itu cocok dengan akunmu, kode dikirim ke email dan berlaku lima menit. Cek juga folder spam."); mulaiHitung(r.j.tunggu || 60);
  });

  /* ---------- kode lewat email sah (D21): hanya akun yang emailnya cocok terbuka; tanpa akun umum, tanpa halaman akun ---------- */
  function sesudahEmail(ruang) {
    if (!ruang.length) { layar("nomor"); return pesan("Tidak ada akun yang bisa dibuka lewat email ini."); }
    if (ruang.length === 1) return ruang[0].butuh_sandi ? bukaAkun() : pergi(ke || ruang[0].ke);
    emailMode = true; daftarRuang(ruang, []); layar("ruang");
  }

  /* ---------- sesudah kode sah ---------- */
  function sesudahMasuk(ruang, lengkap, menunggu) {
    if (!ruang.length && menunggu?.length) { daftarRuang(ruang, menunggu); layar("ruang"); $("bKeluar").hidden = false; return segarkanAkun(); }   // hanya keanggotaan yang menunggu: tampilkan, jangan lempar ke alun-alun
    if (!ruang.length) return lengkap ? pergi(ke) : bukaLengkapi();
    const satu = ruang.length === 1 && !ruang[0].perlu_pilih && !ruang[0].butuh_sandi;
    if (satu) return pergi(ke || ruang[0].ke);
    daftarRuang(ruang, menunggu); layar("ruang"); $("bKeluar").hidden = false; segarkanAkun();
  }

  /* ---------- L3: ruang ---------- */
  function daftarRuang(ruang, menunggu) {
    const w = $("daftarMenunggu"); w.replaceChildren(); w.hidden = !(menunggu && menunggu.length);
    for (const nama of menunggu || []) { const li = el("li", "mk-catatan"); li.append(el("span", "mk-pil kuning", PesanLayar.MENUNGGU), " " + nama); w.append(li); }
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
    if (emailMode) return r.butuh_sandi ? bukaAkun() : pergi(r.ke);   // lewat email: sesi sudah terbit, staf ke form sandi
    if (r.butuh_sandi) { pilihStaf = r.pilih || null; layar("sandi", `${r.nama_ruang}. Masukkan sandi akun stafmu.`); return; }
    if (!r.perlu_pilih) return pergi(r.ke);
    b.disabled = true; pesan("");
    const x = await kirim("/api/masuk/pilih", {jenis: r.jenis, pilih: r.pilih});
    b.disabled = false;
    if (x.s === 200) return pergi(x.j.ke || r.ke);
    pesan(galat(x));
  }
  /* ---------- aksi akun (PM-13, PM-14): atur sandi dan hapus akun, hanya sesudah kode dalam 15 menit terakhir ---------- */
  function panelAkun(d) {
    const baru = !!d.baru_kode; akunKini = {sandi: d.sandi || [], anggotaN: d.anggota_n || 0};
    $("vAkun").hidden = !baru; $("mkAkunInfo").hidden = baru;
    const ul = $("daftarSandi"); ul.replaceChildren();
    for (const x of akunKini.sandi) {
      const b = el("button", "mk-baris"); b.type = "button"; b.append(ikon(x.jenis), el("span", "mk-nama", "Atur sandi"), el("span", "mk-sub", x.lembaga || ""));
      b.addEventListener("click", () => bukaSandi(x)); const li = el("li"); li.append(b); ul.append(li);
    }
  }
  async function segarkanAkun() {
    const no = ++segarNo, r = await baca("/api/masuk/saya");
    if (no !== segarNo) return;   // panggilan lebih baru menang
    if (r.s === 200) { panelAkun(r.j); daftarRuang(r.j.ruang || [], r.j.menunggu); }
  }
  function bukaSandi(x) {
    sandiTarget = x; const acak = x.jenis === "instansi";   // akun instansi: sandi dibuatkan server (aturan modulnya), tampil sekali
    $("lSandiBaru").hidden = acak; $("bLihatSandi").hidden = acak; $("iSandiBaru").value = ""; $("iSandiBaru").type = "password"; $("bLihatSandi").textContent = "Tampilkan sandi"; $("bLihatSandi").setAttribute("aria-pressed", "false");
    $("cSandiBaru").textContent = acak ? "Sandi dibuatkan otomatis dan hanya tampil sekali. Catat di tempat aman. Sesi lain akun ini ikut keluar." : "Paling sedikit 10 huruf. Sesi lain akun ini ikut keluar.";
    $("oSandiHasil").hidden = true; $("oSandiHasil").textContent = ""; $("bSandiBaru").hidden = false; $("bSandiBaru").textContent = acak ? "Buat sandi baru" : "Simpan sandi";
    layar("sandibaru", x.lembaga || "");
  }
  $("bLihatSandi").addEventListener("click", () => { const i = $("iSandiBaru"), tampil = i.type === "password"; i.type = tampil ? "text" : "password"; $("bLihatSandi").textContent = tampil ? "Sembunyikan sandi" : "Tampilkan sandi"; $("bLihatSandi").setAttribute("aria-pressed", String(tampil)); });
  $("fSandiBaru").addEventListener("submit", async e => {
    e.preventDefault();
    if (!sandiTarget) return;
    const acak = sandiTarget.jenis === "instansi", sandi = $("iSandiBaru").value;
    if (!acak && (sandi.length < 10 || sandi.length > 100)) return pesan("Sandi 10 sampai 100 huruf.");
    pesan(""); sibuk($("bSandiBaru"), true, "Menyimpan...");
    const r = await kirim("/api/masuk/sandi_baru", {jenis: sandiTarget.jenis, pilih: sandiTarget.pilih, ...(acak ? {} : {sandi})});
    sibuk($("bSandiBaru"), false);
    if (r.s !== 200) return pesan(r.s === 403 ? kalimat(r.j.galat) || "Tidak diizinkan." : galat(r));
    $("iSandiBaru").value = "";
    if (r.j.sandi) { $("oSandiHasil").textContent = r.j.sandi; $("oSandiHasil").hidden = false; }
    $("bSandiBaru").hidden = true; pesan(r.j.sandi ? "Sandi baru dibuat. Catat sekarang, tidak tampil lagi." : "Sandi baru disimpan.", true);
  });
  $("bSandiKembali").addEventListener("click", () => { $("oSandiHasil").textContent = ""; $("iSandiBaru").value = ""; sandiTarget = null; layar("ruang"); });
  $("bHapusAkun").addEventListener("click", () => {
    const n = akunKini.anggotaN;
    $("cHapus").textContent = `Nomor, nama, dan wilayahmu dihapus. ${n ? `Keanggotaanmu di ${n} akun lembaga ikut hilang.` : "Kamu tidak punya keanggotaan di akun lembaga."} Kirimanmu di alun-alun tetap tampil tanpa namamu. Akun lembaga tidak terhapus.`;
    layar("hapus");
  });
  $("bHapusBatal").addEventListener("click", () => layar("ruang"));
  $("fHapus").addEventListener("submit", async e => {
    e.preventDefault();
    pesan(""); sibuk($("bHapusYa"), true, "Menghapus...");
    const r = await kirim("/api/masuk/hapus", {yakin: true});
    sibuk($("bHapusYa"), false);
    if (r.s !== 200) return pesan(r.s === 403 ? kalimat(r.j.galat) || "Tidak diizinkan." : galat(r));
    $("bKeluar").hidden = true; bersih(); layar("nomor"); pesan("Akunmu sudah dihapus.", true);
  });

  /* sisa data orang sebelumnya tidak boleh tinggal di halaman sesudah keluar (peramban bersama) */
  function bersih() {
    clearInterval(hitung); gambarUlang = null; nomor = ""; pilihStaf = null; kirimWa = 0; emailMode = false; segarNo++; sandiTarget = null; akunKini = {sandi: [], anggotaN: 0};
    for (const i of ["iNomor", "iKode", "iSandi", "iNama", "iKab", "iSandiBaru", "iEmail", "iAkun", "iSandiAkun"]) $(i).value = "";
    $("oSandiHasil").textContent = ""; $("daftarSandi").replaceChildren(); $("daftarMenunggu").replaceChildren(); $("vAkun").hidden = true;
    $("iProv").value = ""; $("iSetuju").checked = false; $("daftarRuang").replaceChildren(); $("daftarKab").replaceChildren();
    $("daftarAkun").replaceChildren(); $("vGabung").hidden = true; $("iGProv").value = ""; $("iGKab").replaceChildren(); gabungNo++;
  }
  async function keluar() {
    clearTimeout(alih);
    const b = $("bKeluar"); b.disabled = true;
    const r = await kirim("/api/masuk/keluar", {});
    b.disabled = false;
    if (r.s === 200) { b.hidden = true; bersih(); layar("nomor"); } else pesan(galat(r));
  }
  $("bKeluar").addEventListener("click", keluar);
  $("bKembali").addEventListener("click", () => layar("ruang"));


  /* ---------- L5: saya petugas atau relawan (PM-09, ALUR A5): lima pilihan, lalu gabung ke akun lembaga yang sudah aktif ---------- */
  const PERAN = [["pemda", "BPBD atau pemda", "Gabung ke akun lembaga daerahmu", "instansi", null],
    ["aparat", "TNI atau Polri", "Gabung ke akun lembaga daerahmu", "aparat", null], ["pendataan", "Unit BNPB", "Daftar pendataan satu data", "pendataan", "/pendataan"],
    ["kemitraan", "Kampus", "Daftar kemitraan kampus", "kemitraan", "/kemitraan/daftar"]];
  let rumpun = null, gabungNo = 0, sedangGabung = false, alih = null;
  const baca = jalur => fetch(jalur).then(async r => ({s: r.status, j: await r.json().catch(() => ({}))}), () => ({s: 0, j: {}}));
  const ejaan = k => window.Wilayah?.kab(k) ?? k;
  function bukaPeran() {
    const ul = $("daftarPeran");
    if (!ul.children.length) for (const [id, nama, sub, ik, ke] of PERAN) {
      const b = el("button", "mk-baris"); b.type = "button"; b.append(ikon(ik), el("span", "mk-nama", nama), el("span", "mk-sub", sub));
      b.addEventListener("click", () => pilihPeran(id, ke)); const li = el("li"); li.append(b); ul.append(li);
    }
    $("vGabung").hidden = true; layar("peran");
  }
  function pilihPeran(id, ke) {
    if (ke) return location.assign(ke);   // relawan, unit BNPB, kampus: formulir yang sudah ada
    rumpun = id; gabungNo++;
    const s = $("iGProv"); if (s.options.length < 2) for (const [k, n] of Object.entries(window.Wilayah?.PROV || {})) { const o = document.createElement("option"); o.value = k; o.textContent = n; s.append(o); }
    s.value = ""; $("iGKab").replaceChildren(new Option("Pilih kabupaten atau kota", "")); $("iGKab").disabled = true; $("daftarAkun").replaceChildren(); pesan("");
    $("vGabung").hidden = false; s.focus();
  }
  async function muatAkun() {
    const no = ++gabungNo, prov = $("iGProv").value, kab = $("iGKab").value;
    if (!prov) return;
    $("daftarAkun").replaceChildren(el("li", "mk-catatan", "Memuat...")); pesan("");
    const r = await baca(`/api/masuk/akun?prov=${encodeURIComponent(prov)}&rumpun=${rumpun}${kab ? "&kab=" + encodeURIComponent(kab) : ""}`);
    if (no !== gabungNo) return;   // pilihan berganti selama menunggu: hasil basi dibuang
    if (r.s !== 200) {   // gagal: pesan dan tombol Coba lagi, pilihan tidak terkunci
      const li = el("li"), b = el("button", "mk-tautan", "Coba lagi"); b.type = "button"; b.addEventListener("click", muatAkun); li.append(b); $("daftarAkun").replaceChildren(li);
      return pesan(r.s === 0 ? PesanLayar.LURING : r.s === 401 ? "Masuk dulu lewat kode WhatsApp." : kalimat(r.j.galat) || "Daftar akun belum bisa dimuat.");
    }
    if (!kab) {   // daftar kabupaten dari server (ejaan sama dengan akun lembaga)
      const k = $("iGKab"); k.replaceChildren(new Option("Pilih kabupaten atau kota", ""), ...(r.j.kab || []).map(n => new Option(ejaan(n), n))); k.disabled = false;
    }
    daftarAkun(r.j.akun || [], !!kab && !r.j.kab_ada_akun);
  }
  function daftarAkun(akun, tanpaAkunDaerah) {
    const ul = $("daftarAkun"); ul.replaceChildren();
    for (const a of akun) {
      const b = el("button", "mk-baris"); b.type = "button"; b.append(ikon("instansi"), el("span", "mk-nama", ejaan(a.lembaga)), el("span", "mk-sub", "Ketuk untuk bergabung"));
      b.addEventListener("click", () => gabung(a, b)); const li = el("li"); li.append(b); ul.append(li);
    }
    if (tanpaAkunDaerah) {   // ALUR A5: akun lembaga belum pernah aktif, orang diarahkan ke verifikasi yang ada
      const li = el("li"), p = el("p", "mk-catatan", "Belum ada akun lembaga yang aktif di daerah ini. Verifikasi akun lembaganya dulu di "), a = el("a", null, "halaman instansi"); a.href = "/instansi"; p.append(a, "."); li.append(p); ul.append(li);
    } else if (!akun.length && $("iGKab").value) ul.append(el("li", "mk-catatan", "Belum ada akun lembaga yang aktif di daerah ini."));
  }
  async function gabung(a, b) {
    if (sedangGabung) return;   // satu permohonan sekali jalan: dua klik pada dua akun tidak mengirim dua
    sedangGabung = true; for (const x of $("daftarAkun").querySelectorAll("button")) x.disabled = true; pesan("");
    const r = await kirim("/api/masuk/mohon", {jenis: "instansi", akun_id: a.id});
    sedangGabung = false;
    if (r.s !== 200) { for (const x of $("daftarAkun").querySelectorAll("button")) x.disabled = false; return pesan(galat(r)); }
    b.querySelector(".mk-sub")?.remove();
    const aktif = r.j.status === "aktif", pil = el("span", "mk-pil " + (aktif ? "hijau" : "kuning"), aktif ? "Aktif" : PesanLayar.MENUNGGU); b.append(pil);
    if (aktif) { pesan("Kamu sudah bergabung. Membuka ruang lembaga...", true); alih = setTimeout(() => pergi(r.j.ke), 900); }
    else { pesan("Permohonanmu menunggu pemeriksaan petugas. Sementara itu akun umummu tetap bisa dipakai.", true); for (const x of $("daftarAkun").querySelectorAll("button")) if (x !== b) x.disabled = false; }
  }
  $("iGProv").addEventListener("change", () => { $("iGKab").replaceChildren(new Option("Pilih kabupaten atau kota", "")); $("iGKab").disabled = true; $("daftarAkun").replaceChildren(); muatAkun(); });
  $("iGKab").addEventListener("change", muatAkun);
  $("bPeran").addEventListener("click", bukaPeran);
  $("bPeranKembali").addEventListener("click", () => { clearTimeout(alih); layar("ruang"); });

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

  /* ---------- sandi (K21): form biasa POST /masuk, logika server sama dengan /admin/masuk; galat dari server di <body data-galat> ---------- */
  let galatSandi = document.body.dataset.galat || "";
  $("fAkun").action = "/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : "");
  function bukaAkun() { layar("akun"); pesan(galatSandi); galatSandi = ""; }
  window.addEventListener("hashchange", () => { if (location.hash === "#sandi") bukaAkun(); });
  $("fAkun").addEventListener("submit", () => sibuk($("bAkun"), true, "Memeriksa..."));
  window.addEventListener("pageshow", e => { if (e.persisted) { sibuk($("bAkun"), false); $("iSandiAkun").value = ""; } });   // kembali lewat tombol Back: tombol hidup lagi, sandi tidak tertinggal
  $("bAkunKembali").addEventListener("click", () => { history.replaceState(null, "", location.pathname + location.search); layar($("bKeluar").hidden ? "nomor" : "ruang"); });

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
    await mulaiKode();
    if (galatSandi || location.hash === "#sandi") bukaAkun();
  }
  async function mulaiKode() {
    const ambil = jalur => fetch(jalur).then(async r => ({s: r.status, j: await r.json().catch(() => ({}))}), () => ({s: 0, j: {}}));
    const [saya, saluran] = await Promise.all([ambil("/api/masuk/saya"), ambil("/api/masuk/saluran")]);
    $("mkMuat").hidden = true;
    if (saya.s === 200) {
      $("bKeluar").hidden = false;
      const ruang = saya.j.ruang || [];
      if (!ruang.length && !saya.j.akun?.lengkap) return bukaLengkapi();
      daftarRuang(ruang, saya.j.menunggu); panelAkun(saya.j); layar("ruang");
      if (location.hash === "#peran") bukaPeran();   // tautan "Saya petugas atau relawan" dari kepala situs
      return;
    }
    layar("nomor");
    if (saya.s === 0 && saluran.s === 0) return pesan("Tidak ada koneksi.");
    if ([saya.s, saluran.s].some(x => x === 404 || x === 503)) { tutup(); return pesan("Masuk dengan nomor WhatsApp belum aktif."); }   // rute belum terbit atau migrasi belum jalan
    if (saluran.s === 200) { saluranEmail = !!saluran.j.email; waMati = saluran.j.wa === false; if (waMati) $("mkTerganggu").hidden = false; tawarEmail(); }
  }
  window.addEventListener("offline", () => { if (aktif !== "ruang") pesan("Tidak ada koneksi."); });
  mulai();
})();
