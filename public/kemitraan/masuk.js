/* Kemitraan Kampus, halaman masuk koordinator kampus /kemitraan/masuk (KM-D02, ALUR §1.1 langkah 6, KEAMANAN-PRIVASI §3).
   Dua mode: masuk (email + sandi) dan atur sandi lewat tautan ?atur=<32 hex> dari staf BNPB (sekali pakai, 72 jam).
   Rute: POST /api/kemitraan/masuk {email, sandi} -> {jenis:"KK", nama, institusi_id} + cookie sesi HttpOnly; POST /api/kemitraan/atur-sandi {token, sandi} -> {ok:true}.
   Token atur sandi dibaca sekali lalu dibuang dari bilah alamat (history.replaceState) supaya tidak tersimpan di riwayat atau terbawa Referer. */
(() => {
  "use strict";
  const KM = window.KM, {$, esc, ikon} = KM, IK = KM.IK;
  const isi = $("msIsi");
  const IK_SURAT = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>';
  const IK_KUNCI = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
  const sanitasi = new URLSearchParams(location.search).get("atur");
  const TOKEN = /^[0-9a-f]{32}$/.test(sanitasi || "") ? sanitasi : null;
  if (sanitasi !== null) history.replaceState(null, "", location.pathname);

  const fieldHtml = (id, label, tipe, atribut) => `<label class="km-f" for="${esc(id)}"><span>${esc(label)}</span><input id="${esc(id)}" type="${esc(tipe)}" ${atribut}></label>`;
  const pesan = t => { const p = $("msPesan"); p.textContent = t; p.hidden = !t; };
  const masukHtml = () => `<section class="ak-panel km-form km-sempit">
    <h2 class="km-judul">Masuk koordinator kampus</h2>
    <p class="km-ket">Untuk penanggung jawab kampus mitra yang sudah disetujui BNPB. Belum punya akun? <a href="/kemitraan/daftar?sebagai=kampus">Daftarkan kampusmu</a>.</p>
    <form id="msForm" novalidate>${fieldHtml("msEmail", "Email", "email", 'autocomplete="username" maxlength="120"')}${fieldHtml("msSandi", "Sandi", "password", 'autocomplete="current-password" maxlength="100"')}
      <p class="km-pesan" id="msPesan" role="alert" hidden></p>
      <div class="km-aksi"><button type="submit" class="ak-tbl" id="msKirim">${ikon(IK_KUNCI, "")}<span>Masuk</span></button><a class="ak-tbl alt" href="/kemitraan/daftar">${ikon(IK_SURAT, "")}<span>Daftar</span></a></div>
    </form></section>`;
  const aturHtml = () => `<section class="ak-panel km-form km-sempit">
    <h2 class="km-judul">Atur sandi</h2>
    <p class="km-ket">Tautan ini berlaku sekali dan 72 jam sejak diterbitkan. Sandi minimal 10 karakter.</p>
    <form id="msForm" novalidate>${fieldHtml("msSandi", "Sandi baru", "password", 'autocomplete="new-password" minlength="10" maxlength="100"')}${fieldHtml("msSandi2", "Ulangi sandi baru", "password", 'autocomplete="new-password" maxlength="100"')}
      <p class="km-pesan" id="msPesan" role="alert" hidden></p>
      <div class="km-aksi"><button type="submit" class="ak-tbl" id="msKirim">${ikon(IK_KUNCI, "")}<span>Simpan sandi</span></button></div>
    </form></section>`;
  const tautanMati = () => `<section class="ak-panel ak-kosong km-sempit"><h2>Tautan atur sandi tidak sah</h2><p>Tautan ini rusak, sudah dipakai, atau lewat 72 jam. Minta tautan baru dari BNPB, atau masuk bila sandimu sudah diatur.</p><p><a class="ak-tbl" href="/kemitraan/masuk">Ke halaman masuk</a></p></section>`;
  const beresHtml = () => `<section class="ak-panel ak-kosong km-sempit" role="status"><h2>Sandi tersimpan</h2><p>Sesi lama di semua perangkat sudah ditutup. Masuk dengan sandi barumu.</p><p><a class="ak-tbl" href="/kemitraan/masuk">Masuk</a></p></section>`;

  async function kirim(url, body, galatBaku) {
    const k = $("msKirim"); k.disabled = true; pesan("");
    try {
      const r = await fetch(url, {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}), j = await r.json().catch(() => ({}));
      if (r.status === 429) { pesan("Terlalu banyak percobaan. Coba lagi satu jam lagi."); return null; }
      if (!r.ok) { pesan(j.galat || galatBaku); return null; }
      return j;
    } catch (e) { pesan("Tidak tersambung ke server. Periksa sambunganmu lalu coba lagi."); return null; }
    finally { k.disabled = false; }
  }
  function pasang() {
    $("msForm").addEventListener("submit", async e => {
      e.preventDefault();
      if (TOKEN) {
        const s = $("msSandi").value;
        if (s.length < 10) return pesan("Sandi minimal 10 karakter.");
        if (s !== $("msSandi2").value) return pesan("Kedua sandi harus sama.");
        if (await kirim("/api/kemitraan/atur-sandi", {token: TOKEN, sandi: s}, "Sandi belum tersimpan. Coba lagi.")) isi.innerHTML = beresHtml();
        return;
      }
      const em = $("msEmail").value.trim();
      if (!KM.emailOk(em) || !$("msSandi").value) return pesan("Isi email dan sandi.");
      if (await kirim("/api/kemitraan/masuk", {email: em, sandi: $("msSandi").value}, "Masuk gagal. Coba lagi.")) location.assign("/kemitraan?tampil=kampus");
    });
  }
  isi.innerHTML = sanitasi !== null && !TOKEN ? tautanMati() : TOKEN ? aturHtml() : masukHtml();
  if ($("msForm")) pasang();
})();
