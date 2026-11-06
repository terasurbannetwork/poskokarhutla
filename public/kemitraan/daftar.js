/* Kemitraan Kampus, halaman daftar publik /kemitraan/daftar (KM-D02, PRD F-D2, ALUR §1.1 dan §1.2).
   Dua jalur: kampus baru (multipart: field data = JSON, field surat = PDF <= 2 MB) dan anggota kampus (JSON).
   Rute: POST /api/kemitraan/daftar/kampus, POST /api/kemitraan/daftar/anggota, GET /api/kemitraan/publik/kampus (src/kemitraan_akun.js).
   Jawaban server SENGAJA sama untuk pendaftar baru dan duplikat (anti-oracle): layar ini tidak pernah mengatakan "sudah terdaftar" kecuali 409 kampus aktif.
   Turnstile: window.tokenTurnstile() dari /bnpb/turnstile.js; null bila server tidak mengaktifkannya. */
(() => {
  "use strict";
  const KM = window.KM, {$, esc, ikon, htmlPilih, pasangPilih} = KM, IK = KM.IK;
  /* salinan KEAHLIAN src/relawan.js:22 (kunci dikirim ke server; label tampil) */
  const KEAHLIAN = {medis: "Medis", perawat: "Perawat", psikososial: "Psikososial", sar: "SAR", pemadaman: "Pemadaman", logistik: "Logistik", dapur_umum: "Dapur umum",
    distribusi: "Distribusi", gis_data: "GIS dan data", komunikasi: "Komunikasi", bahasa_isyarat: "Bahasa isyarat", teknik_bangunan: "Teknik bangunan", pendidikan_anak: "Pendidikan anak",
    pengemudi: "Pengemudi", lainnya: "Lainnya"};
  const UNSUR = [["dosen", "Dosen"], ["tendik", "Tendik"], ["mahasiswa", "Mahasiswa"], ["alumni", "Alumni"]];
  const JENIS = [["ptn", "Negeri"], ["pts", "Swasta"]];
  const MAKS_SURAT = 2 * 1048576;
  const IK_PIN = IK.daerah, IK_UNSUR = {dosen: IK.talenta, tendik: IK.orang, mahasiswa: IK.buku, alumni: IK.cek};
  /* teks baku persetujuan (KEAMANAN-PRIVASI §2): tujuan, penerima, masa simpan, hak cabut */
  const PDP_BAKU = "Aku setuju data di formulir ini diproses sesuai UU Pelindungan Data Pribadi (UU 27/2022). Tujuannya koordinasi kemitraan kampus dan satgas kebencanaan. Penerimanya ";
  const PDP_AKHIR = " Datanya disimpan selama aku aktif dan dianonimkan 180 hari sesudah aku nonaktif. Tanpa NIK dan tanpa KTP. Aku bisa mencabut persetujuan kapan saja dari halaman pribadiku atau lewat koordinator kampus.";
  const pdpTeks = () => PDP_BAKU + (ST.sebagai === "kampus" ? "BNPB." : "BNPB dan koordinator kampus tempatku terdaftar.") + PDP_AKHIR;

  const ST = {sebagai: "anggota", unsur: "dosen", jenis: "pts", keahlian: new Set(), kampus: "", kab: "", kabKerja: "", prov: "", kampusDaftar: null, kode: null, provN: null};
  const isi = $("dfIsi");

  /* ---------- potongan HTML ---------- */
  const fieldHtml = (id, label, tipe, atribut) => `<label class="km-f" for="${esc(id)}"><span>${esc(label)}</span><input id="${esc(id)}" type="${esc(tipe)}" ${atribut || ""}></label>`;
  const bagiHtml = (nama, opsi, nilai, ikonFn) => `<div class="km-bagi km-bagi${opsi.length}" role="group" aria-label="${esc(nama)}">${opsi.map(([k, l]) =>
    `<button type="button" class="ak-tog" data-${esc(nama)}="${esc(k)}" aria-pressed="${k === nilai}">${ikonFn(k)}<span>${esc(l)}</span></button>`).join("")}</div>`;
  const sebagaiHtml = () => bagiHtml("sebagai", [["anggota", "Anggota kampus"], ["kampus", "Kampus baru"]], ST.sebagai, k => ikon(k === "kampus" ? IK.kampus : IK.orang, ""));
  const pdpHtml = () => `<label class="km-setuju" for="dfSetuju"><input id="dfSetuju" type="checkbox"><span>${esc(pdpTeks())}</span></label>`;
  const keahlianHtml = () => `<div class="km-pilgrid" role="group" aria-label="Keahlian">${Object.entries(KEAHLIAN).map(([k, l]) =>
    `<button type="button" class="ak-tog" data-keahlian="${esc(k)}" aria-pressed="${ST.keahlian.has(k)}">${ikon(IK.cek, "")}<span>${esc(l)}</span></button>`).join("")}</div>`;

  const anggotaHtml = () => `<div class="km-grid2">${fieldHtml("dfNama", "Nama lengkap", "text", 'maxlength="80" autocomplete="name"')}
      <div class="km-f"><span>Kampus</span>${htmlPilih("dfKampus", IK.kampus, "Cari kampus")}</div>
      ${fieldHtml("dfWa", "Nomor WhatsApp", "tel", 'inputmode="tel" autocomplete="tel" placeholder="0812xxxxxxx"')}
      ${fieldHtml("dfEmail", "Email", "email", 'maxlength="254" autocomplete="email"')}</div>
    <div class="km-f"><span>Unsur</span>${bagiHtml("unsur", UNSUR, ST.unsur, k => ikon(IK_UNSUR[k], ""))}</div>
    <div class="km-grid2">${fieldHtml("dfProdi", "Program studi", "text", 'maxlength="100"')}
      ${fieldHtml("dfAngkatan", "Angkatan atau tahun lulus", "number", 'min="1960" max="2035" inputmode="numeric"')}
      <div class="km-f"><span>Kabupaten atau kota domisili</span>${htmlPilih("dfKab", IK_PIN, "Cari kabupaten atau kota")}</div>
      <div class="km-alumni" id="dfAlumni" hidden>${fieldHtml("dfInstansi", "Instansi tempat kerja", "text", 'maxlength="120"')}
        <div class="km-f"><span>Kabupaten atau kota tempat kerja</span>${htmlPilih("dfKabKerja", IK_PIN, "Cari kabupaten atau kota")}</div></div></div>
    <div class="km-f"><span>Keahlian, pilih satu atau lebih</span>${keahlianHtml()}</div>`;
  const kampusHtml = () => `<div class="km-grid2">${fieldHtml("dfNamaK", "Nama kampus", "text", 'maxlength="120"')}
      ${fieldHtml("dfSingk", "Singkatan", "text", 'maxlength="20"')}
      <div class="km-f"><span>Jenis</span>${bagiHtml("jenis", JENIS, ST.jenis, k => ikon(IK.kampus, ""))}</div>
      <div class="km-f"><span>Provinsi</span>${htmlPilih("dfProv", IK_PIN, "Cari provinsi")}</div>
      ${fieldHtml("dfPic", "Nama penanggung jawab", "text", 'maxlength="80" autocomplete="name"')}
      ${fieldHtml("dfJab", "Jabatan penanggung jawab", "text", 'maxlength="80"')}
      ${fieldHtml("dfWaK", "WhatsApp penanggung jawab", "tel", 'inputmode="tel" placeholder="0812xxxxxxx"')}
      ${fieldHtml("dfEmailK", "Email penanggung jawab", "email", 'maxlength="120"')}</div>
    ${fieldHtml("dfSurat", "Surat tugas penanggung jawab (PDF, maksimal 2 MB)", "file", 'accept="application/pdf,.pdf"')}`;
  const formHtml = () => `<section class="ak-panel km-form">
    <p class="km-ket">Pilih jalurmu. Kampus baru menunggu persetujuan BNPB. Anggota kampus menunggu persetujuan koordinator kampusnya, lalu mendapat kode pribadi.</p>
    ${sebagaiHtml()}
    <form id="dfForm" novalidate>${ST.sebagai === "kampus" ? kampusHtml() : anggotaHtml()}
      ${pdpHtml()}
      <p class="km-pesan" id="dfPesan" role="alert" hidden></p>
      <div class="km-aksi"><button type="submit" class="ak-tbl" id="dfKirim">Kirim pendaftaran</button><a class="ak-tbl alt" href="/kemitraan/masuk">Sudah punya akun koordinator? Masuk</a></div>
    </form></section>`;
  const suksesHtml = (judul, teks) => `<section class="ak-panel ak-kosong km-sukses" role="status"><h2>${esc(judul)}</h2><p>${esc(teks)}</p><p><a class="ak-tbl alt" href="/kemitraan/daftar">Kembali</a></p></section>`;

  /* ---------- data pemilih ---------- */
  const ambilJson = u => fetch(u, {credentials: "same-origin"}).then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))));
  async function muatData() {
    const [kode, meta, kampus] = await Promise.all([ambilJson("/data/kemitraan/kode.json"), ambilJson("/data/meta.json").catch(() => ({})), ambilJson("/api/kemitraan/publik/kampus").catch(() => ({kampus: []}))]);
    ST.kode = kode; ST.provN = meta.provinsi || {}; ST.kampusDaftar = kampus.kampus || []; hitungOpsi();
  }
  /* urut sekali di sini (Collator tunggal); pemilih membaca ST.oKab dst. tanpa menyortir ulang tiap ketikan */
  const urut = (() => { const c = new Intl.Collator("id"); return a => a.sort((x, y) => c.compare(x[1], y[1])); })();
  const hitungOpsi = () => {
    const np = p => ST.provN[p] || p;
    ST.oKab = urut(Object.entries(ST.kode).map(([k, v]) => [k, `${v.nama}, ${np(v.prov)}`]));
    ST.oProv = urut([...new Set(Object.values(ST.kode).map(v => v.prov))].map(p => [p, np(p)]));
    ST.oKampus = urut(ST.kampusDaftar.map(k => [k.id, k.singkatan ? `${k.nama} (${k.singkatan})` : k.nama]));
  };

  /* ---------- tampil ---------- */
  function pasang() {
    isi.innerHTML = formHtml();
    if (ST.sebagai === "anggota") {
      pasangPilih("dfKampus", {opsi: () => ST.oKampus, nilai: () => ST.kampus, semua: ST.kampusDaftar.length ? "Pilih kampus" : "Belum ada kampus aktif", pilih: v => { ST.kampus = v; }});
      pasangPilih("dfKab", {opsi: () => ST.oKab, nilai: () => ST.kab, semua: "Pilih kabupaten atau kota", pilih: v => { ST.kab = v; }});
      pasangPilih("dfKabKerja", {opsi: () => ST.oKab, nilai: () => ST.kabKerja, semua: "Pilih kabupaten atau kota", pilih: v => { ST.kabKerja = v; }});
      $("dfAlumni").hidden = ST.unsur !== "alumni";
    } else pasangPilih("dfProv", {opsi: () => ST.oProv, nilai: () => ST.prov, semua: "Pilih provinsi", pilih: v => { ST.prov = v; }});
    $("dfForm").addEventListener("submit", kirim);
  }
  const pesan = t => { const p = $("dfPesan"); p.textContent = t; p.hidden = !t; if (t) p.scrollIntoView({block: "nearest"}); };

  isi.addEventListener("click", e => {
    const t = e.target.closest("button[data-sebagai], button[data-unsur], button[data-jenis], button[data-keahlian]"); if (!t) return;
    if (t.dataset.sebagai) { if (t.dataset.sebagai !== ST.sebagai) { ST.sebagai = t.dataset.sebagai; history.replaceState(null, "", `?sebagai=${ST.sebagai}`); pasang(); } return; }
    const kel = t.dataset.unsur ? "unsur" : t.dataset.jenis ? "jenis" : null;
    if (kel) { ST[kel] = t.dataset[kel]; t.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === t))); if (kel === "unsur") $("dfAlumni").hidden = ST.unsur !== "alumni"; return; }
    const k = t.dataset.keahlian, ada = ST.keahlian.has(k); ada ? ST.keahlian.delete(k) : ST.keahlian.add(k); t.setAttribute("aria-pressed", String(!ada));
  });

  /* ---------- kirim ---------- */
  const v = id => ($(id)?.value || "").trim();
  function bodyAnggota() {
    if (v("dfNama").length < 2) return "Isi nama lengkap, minimal 2 huruf.";
    if (!ST.kampus) return "Pilih kampusmu.";
    if (!v("dfWa")) return "Isi nomor WhatsApp, contoh 0812xxxxxxx.";
    if (!KM.emailOk(v("dfEmail"))) return "Isi email yang sah.";
    if (!ST.kab) return "Pilih kabupaten atau kota domisili.";
    if (!ST.keahlian.size) return "Pilih minimal satu keahlian.";
    const alumni = ST.unsur === "alumni";
    return {nama: v("dfNama"), wa: v("dfWa"), email: v("dfEmail"), kampus_id: ST.kampus, unsur: ST.unsur, kab4: ST.kab, keahlian: [...ST.keahlian], prodi: v("dfProdi") || null,
      angkatan: v("dfAngkatan") ? Number(v("dfAngkatan")) : null, instansi: alumni ? v("dfInstansi") || null : null, kab4_kerja: alumni && ST.kabKerja ? ST.kabKerja : null};
  }
  function bodyKampus() {
    if (v("dfNamaK").length < 3) return "Isi nama kampus, minimal 3 huruf.";
    if (!ST.prov) return "Pilih provinsi kampus.";
    if (v("dfPic").length < 2) return "Isi nama penanggung jawab.";
    if (!KM.emailOk(v("dfEmailK"))) return "Isi email penanggung jawab yang sah.";
    if (!v("dfWaK")) return "Isi WhatsApp penanggung jawab, contoh 0812xxxxxxx.";
    const f = $("dfSurat").files[0];
    if (!f) return "Lampirkan surat tugas dalam bentuk PDF.";
    if (f.size > MAKS_SURAT) return "Surat tugas lebih dari 2 MB. Kecilkan dulu berkasnya.";
    return {nama: v("dfNamaK"), singkatan: v("dfSingk") || null, jenis: ST.jenis, prov: ST.prov, pic_nama: v("dfPic"), pic_jabatan: v("dfJab") || null, pic_email: v("dfEmailK"), pic_wa: v("dfWaK")};
  }
  let sibuk = false;
  async function kirim(e) {
    e.preventDefault(); if (sibuk) return;
    const kampus = ST.sebagai === "kampus", b = kampus ? bodyKampus() : bodyAnggota();
    if (typeof b === "string") return pesan(b);
    if (!$("dfSetuju").checked) return pesan("Centang persetujuan pemrosesan data pribadi dulu.");
    sibuk = true; $("dfKirim").disabled = true; pesan("");
    try {
      const ts = window.tokenTurnstile ? await window.tokenTurnstile().catch(() => null) : null;
      const isiKirim = {...b, setuju: true, ...(ts ? {turnstile: ts} : {})};
      let opsi;
      if (kampus) { const fd = new FormData(); fd.append("data", JSON.stringify(isiKirim)); fd.append("surat", $("dfSurat").files[0]); opsi = {method: "POST", body: fd}; }
      else opsi = {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(isiKirim)};
      const r = await fetch(`/api/kemitraan/daftar/${kampus ? "kampus" : "anggota"}`, {...opsi, credentials: "same-origin"}), j = await r.json().catch(() => ({}));
      if (r.status === 429) return pesan("Terlalu banyak percobaan. Coba lagi satu jam lagi.");
      if (!r.ok) return pesan(j.galat || `Pendaftaran gagal. Coba lagi sebentar lagi.`);
      isi.innerHTML = kampus
        ? suksesHtml("Pendaftaran kampus terkirim", "BNPB akan memeriksa surat tugasmu. Kalau disetujui, penanggung jawab menerima tautan untuk mengatur sandi lewat WhatsApp atau email yang kamu isi.")
        : suksesHtml("Pendaftaran terkirim", "Koordinator kampusmu akan memeriksa pendaftaran ini. Kalau disetujui, kamu menerima kode pribadi dari koordinator. Simpan kodenya, tampil sekali.");
      window.scrollTo(0, 0);
    } catch (x) { pesan("Tidak tersambung ke server. Periksa sambunganmu lalu coba lagi."); }
    finally { sibuk = false; const k = $("dfKirim"); if (k) k.disabled = false; window.turnstile?.reset?.(); }
  }

  /* ---------- mulai ---------- */
  const q = new URLSearchParams(location.search).get("sebagai"); if (q === "kampus" || q === "anggota") ST.sebagai = q;
  muatData().then(pasang).catch(() => { isi.innerHTML = KM.kosongHtml("Formulir belum bisa dibuka", "Daftar wilayah gagal dimuat. Muat ulang halaman ini sebentar lagi."); });
})();
