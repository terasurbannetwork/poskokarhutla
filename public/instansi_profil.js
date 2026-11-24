/* Akun BPBD dengan profil PIC di /instansi (data/kajian-bnpb/profil-bpbd/, DESIGN-SYSTEM L2 sampai L6): pilih profil, dialog PIN, daftar PIC, kepala kerja dengan ganti profil, log.
   Dipasang instansi.js lewat window.InstansiProfil.pasang(konteks). PIN hanya hidup di kotak isian dan satu variabel sementara; tidak ada penyimpanan peramban, kuki dari skrip,
   atribut DOM, atau URL yang memuat PIN (gerbang GP-6). Foto diperkecil di peramban (sisi 512 px, JPEG); EXIF dibuang server. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const IK = {orang: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5"/>', kunci: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    mata: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', kamera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    galeri: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l4.5-4.5L13 16l2.5-2.5L19 17"/>', tukar: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', tambah: '<path d="M12 5v14M5 12h14"/>', dok: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>', cek: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'};
  const ik = n => `<svg class="pf-ik" viewBox="0 0 24 24" aria-hidden="true">${IK[n]}</svg>`;
  const tombolIkon = (n, label, data = "") => `<button type="button" class="pf-ikon" aria-label="${esc(label)}" title="${esc(label)}" ${data}>${ik(n)}</button>`;
  const jam = ms => { const d = new Date(ms + 7 * 36e5); return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`; };
  const tglJam = ms => { const d = new Date(ms + 7 * 36e5); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()} ${jam(ms)}`; };
  const awal = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("");
  const foto = (p, u) => p.foto ? `<img class="pf-foto ${u}" src="/api/instansi/profil/foto/${esc(p.id)}?t=${esc(p.diubah)}" alt="" width="${{b: 96, m: 56, k: 40}[u]}" height="${{b: 96, m: 56, k: 40}[u]}" loading="lazy">` : `<span class="pf-foto ${u}" aria-hidden="true">${esc(awal(p.nama))}</span>`;
  /* serahkan kerja berat sesudah satu frame tercat (INP: chrome kontrol urgent lebih dulu) */
  const sesudahCat = fn => { let j = false; const f = () => { if (!j) { j = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(f)); setTimeout(f, 120); };
  let K = null;   // konteks dari instansi.js: {api, pesan, muatSaya, unggahDok, saya}

  /* ---------- foto: perkecil di peramban (createImageBitmap dan canvas.toBlob, Baseline widely available) ---------- */
  async function kecilkan(berkas, sisi = 512) {
    if (!berkas) return null;
    try {
      const bmp = await createImageBitmap(berkas), s = Math.min(1, sisi / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, "image/jpeg", 0.8));
    } catch (e) { return null; }
  }

  /* ---------- dialog PIN: enam kotak per baris; satu dialog untuk masuk, atur PIN, dan ganti PIN ---------- */
  let dlg = null, pinSementara = "", cekAktif = null;   // cekAktif: pemeriksa tombol untuk dialog yang sedang terbuka (satu pendengar tetap)
  function bangunDialog() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog"); dlg.className = "pf-dlg"; dlg.setAttribute("aria-labelledby", "pfDlgNama");
    dlg.innerHTML = `<form class="pf-dlg-isi" novalidate><div class="pf-dlg-kepala"><span id="pfDlgFoto"></span><div><div id="pfDlgNama" class="pf-nama"></div><div id="pfDlgJab" class="pf-jabatan"></div></div></div>
      <p id="pfDlgKet" class="pf-kecil"></p><div id="pfBaris"></div>
      <div class="pf-aksi"><button type="button" id="pfMata" class="pf-ikon" aria-pressed="false" aria-label="Tampilkan PIN" title="Tampilkan PIN">${ik("mata")}</button></div>
      <p id="pfDlgPesan" class="pf-pesan" role="status" aria-live="polite"></p>
      <div class="pf-dlg-aksi"><button type="button" id="pfBatal" class="lp-tombol">Batal</button><button type="submit" id="pfOk" class="lp-tombol utama" disabled>Masuk</button></div></form>`;
    document.body.append(dlg);
    dlg.querySelector("#pfBatal").addEventListener("click", () => dlg.close());
    dlg.querySelector("#pfBaris").addEventListener("pfubah", () => cekAktif?.());
    dlg.querySelector("#pfMata").addEventListener("click", e => {
      const buka = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", String(buka));
      e.currentTarget.setAttribute("aria-label", buka ? "Sembunyikan PIN" : "Tampilkan PIN"); for (const i of dlg.querySelectorAll(".pf-pin input")) i.type = buka ? "text" : "password";
    });
    dlg.addEventListener("close", () => { for (const i of dlg.querySelectorAll(".pf-pin input")) i.value = ""; dlg.querySelector("#pfBaris").replaceChildren(); });
    return dlg;
  }
  const barisPin = (label, n) => {
    const w = document.createElement("div"); w.className = "pf-baris-pin";
    w.innerHTML = `<span>${esc(label)}</span><div class="pf-pin" role="group" aria-label="${esc(label)}, 6 angka">${[...Array(6)].map((_, i) => `<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" aria-label="${esc(label)}, angka ke ${i + 1}">`).join("")}</div>`;
    const kotak = [...w.querySelectorAll("input")];
    kotak.forEach((k, i) => {
      k.addEventListener("input", () => { k.value = k.value.replace(/\D/g, "").slice(-1); if (k.value && kotak[i + 1]) kotak[i + 1].focus(); w.dispatchEvent(new Event("pfubah", {bubbles: true})); });
      k.addEventListener("keydown", e => { if (e.key === "Backspace" && !k.value && kotak[i - 1]) { kotak[i - 1].focus(); kotak[i - 1].value = ""; w.dispatchEvent(new Event("pfubah", {bubbles: true})); } });
      k.addEventListener("paste", e => { const d = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6); if (!d) return; e.preventDefault(); kotak.forEach((x, j) => { x.value = d[j] || ""; }); kotak[Math.min(d.length, 5)].focus(); w.dispatchEvent(new Event("pfubah", {bubbles: true})); });
    });
    w.nilai = () => kotak.map(k => k.value).join("");
    w.kosongkan = () => { for (const k of kotak) k.value = ""; kotak[0].focus(); };
    return w;
  };
  /* buka({profil, ket, baris: [label], tombol, kirim(nilai[]) -> {ok, pesan?}}) */
  function bukaDialog({profil, ket, baris, tombol, kirim}) {
    const d = bangunDialog(), form = d.querySelector("form"), tmb = d.querySelector("#pfOk"), pes = d.querySelector("#pfDlgPesan"), wadah = d.querySelector("#pfBaris");
    d.querySelector("#pfDlgFoto").innerHTML = profil ? foto(profil, "m") : ""; d.querySelector("#pfDlgNama").textContent = profil?.nama || ""; d.querySelector("#pfDlgJab").textContent = profil?.jabatan || "";
    d.querySelector("#pfDlgKet").textContent = ket || ""; pes.textContent = ""; pes.className = "pf-pesan"; tmb.textContent = tombol; tmb.disabled = true; tmb.removeAttribute("aria-busy");
    const rows = baris.map(b => barisPin(b)); wadah.replaceChildren(...rows);
    cekAktif = () => { tmb.disabled = rows.some(r => r.nilai().length !== 6); };
    form.onsubmit = async e => {
      e.preventDefault(); if (tmb.disabled) return;
      tmb.disabled = true; tmb.setAttribute("aria-busy", "true"); pes.className = "pf-pesan"; pes.textContent = "Memeriksa…";   // chrome urgent dulu
      const nilai = rows.map(r => r.nilai());
      await new Promise(r => sesudahCat(r));
      const h = await kirim(nilai);
      tmb.removeAttribute("aria-busy");
      if (h.ok) { d.close(); return; }
      pes.className = "pf-pesan galat"; pes.textContent = h.pesan || "Belum berhasil. Coba lagi."; rows[rows.length - 1].kosongkan(); tmb.disabled = true;
    };
    if (!d.open) d.showModal(); rows[0].querySelector("input").focus();
  }

  /* ---------- L2: pilih profil ---------- */
  async function pilih(w, opsi = {}) {
    w.innerHTML = `<h2 class="pf-judul">${ik("orang")}Pilih profil</h2><div id="pfKisi" class="pf-kisi" aria-busy="true"></div><div class="pf-aksi" id="pfBawah"></div>`;
    const r = await K.api("GET", "/api/instansi/profil");
    if (!r.ok) { $("pfKisi").textContent = r.j?.galat || "Daftar profil belum bisa dimuat."; return; }
    const aktif = r.j.profil.filter(p => p.status === "aktif"), kisi = $("pfKisi"); kisi.removeAttribute("aria-busy");
    if (!aktif.length) kisi.innerHTML = `<p class="pf-kecil">Belum ada profil yang aktif di akun ini. Hubungi admin BNPB.</p>`;
    kisi.innerHTML = aktif.map(p => {
      const t = p.terkunci === "admin" ? "dikunci, hubungi admin BNPB" : p.terkunci ? `terkunci sampai ${jam(p.terkunci)}` : "";
      return `<button type="button" class="pf-sel" data-id="${esc(p.id)}" ${t ? 'aria-disabled="true"' : ""} aria-label="Pilih profil ${esc(p.nama)}, ${esc(p.jabatan)}${t ? ", " + esc(t) : ""}">${foto(p, "b")}<span class="pf-nama" title="${esc(p.nama)}">${esc(p.nama)}</span><span class="pf-jabatan" title="${esc(p.jabatan)}">${esc(p.jabatan)}</span>${t ? `<span class="pf-kunci">${esc(t)}</span>` : ""}</button>`;
    }).join("") || kisi.innerHTML;
    const ada = r.j.profil.filter(p => p.status !== "dicabut").length;
    $("pfBawah").innerHTML = ada < r.j.maks ? `<button type="button" class="lp-tombol" id="pfTambah">${ik("tambah")}Tambah atau kelola PIC</button>` : `<button type="button" class="lp-tombol" id="pfTambah">${ik("orang")}Kelola PIC</button>`;
    $("pfTambah").addEventListener("click", () => opsi.kelola?.());
    if (r.j.pin_wajib_ganti) wajibGanti();
    kisi.addEventListener("click", e => {
      const b = e.target.closest(".pf-sel"); if (!b) return; const p = aktif.find(x => x.id === b.dataset.id);
      if (b.getAttribute("aria-disabled") === "true") return K.pesan(p.terkunci === "admin" ? "Profil ini dikunci. Hubungi admin BNPB untuk membukanya." : `Profil ini dikunci sementara. Bisa dicoba lagi pukul ${jam(p.terkunci)}.`, "galat");
      bukaDialog({profil: p, ket: "Masukkan PIN 6 angka profil ini.", baris: ["PIN"], tombol: "Masuk", kirim: async ([pin]) => {
        const h = await K.api("POST", `/api/instansi/profil/pin/${p.id}`, {pin});
        if (!h.ok) return {pesan: h.j?.galat};
        if (h.j.pin_wajib_ganti) { pinSementara = pin; setTimeout(() => wajibGanti(p), 0); return {ok: true, tunda: true}; }
        K.pesan(""); setTimeout(() => K.muatSaya(), 0); return {ok: true};
      }});
    });
  }

  /* PIN sementara dari admin: PIN baru wajib sebelum apa pun */
  function wajibGanti(p) {
    const lama = pinSementara, perluLama = !lama;
    bukaDialog({profil: p, ket: "PIN Anda baru diatur ulang oleh admin. Buat PIN baru yang hanya Anda yang tahu.", baris: [...(perluLama ? ["PIN sementara"] : []), "PIN baru", "Ulangi PIN baru"], tombol: "Simpan PIN baru", kirim: async n => {
      const [a, b] = n.slice(-2), l = perluLama ? n[0] : lama;
      if (a !== b) return {pesan: "Kedua PIN baru belum sama. Ketik ulang."};
      const id = p?.id || K.saya()?.profil?.id || (await K.api("GET", "/api/instansi/profil")).j?.profil_aktif; if (!id) return {pesan: "Pilih profil dulu."};
      const h = await K.api("POST", `/api/instansi/profil/gantipin/${id}`, {lama: l, baru: a});
      if (!h.ok) return {pesan: h.j?.galat};
      pinSementara = ""; K.pesan("PIN baru tersimpan.", "ok"); setTimeout(() => K.muatSaya(), 0); return {ok: true};
    }});
  }

  /* ---------- L4 dan L5: daftar PIC ---------- */
  const PEMBERITAHUAN = "Pemberitahuan data pribadi. Centurisk97 menyimpan nama, jabatan, NIP, email, nomor HP, dan foto Anda supaya BPBD Anda punya daftar petugas dan setiap tindakan di sistem tercatat atas nama Anda. Nama, jabatan, dan foto terlihat oleh rekan PIC di BPBD yang sama dan admin BNPB. NIP, email, dan nomor HP hanya terlihat oleh Anda dan admin BNPB. Foto tidak dipakai untuk mengenali wajah. Data disimpan selama profil aktif dan dua tahun sesudahnya; foto dihapus 30 hari sesudah profil dicabut. Untuk meminta data dihapus, hubungi admin BNPB";
  const STATUS = {draf: ["draf", ""], menunggu: ["menunggu", "tunggu"], aktif: ["aktif", "ok"], dicabut: ["dicabut", "bad"]};
  const KOLOM = [["nama", "Nama lengkap", "text", 100, "name"], ["jabatan", "Jabatan", "text", 100, "organization-title"], ["nip", "NIP", "text", 30, "off"], ["email", "Email", "email", 254, "email"], ["wa", "Nomor HP", "tel", 30, "tel"]];
  const isian = (p, baca) => KOLOM.map(([k, l, t, m, ac]) => `<label>${esc(l)}<input type="${t}" name="${k}" maxlength="${m}" autocomplete="${ac}" ${baca ? "readonly" : ""} ${p && !baca && p[k] == null ? 'placeholder="Ketik ulang untuk menyimpan"' : ""} value="${esc(p?.[k] ?? "")}"${k === "nip" || k === "wa" ? ' inputmode="numeric"' : ""}></label>`).join("");
  const ambilIsian = f => Object.fromEntries(KOLOM.map(([k]) => [k, f.elements[k].value.trim()]));
  const kartuPic = (p, no, boleh, aktifMode) => {
    const [st, kls] = STATUS[p.status] || [p.status, ""], baca = !(p.status === "draf" && !p.pin_ada) || !boleh;
    const kurang = p.kurang?.length ? `kurang ${p.kurang.join(" dan ")}` : "lengkap";
    return `<section class="pf-kartu" data-id="${esc(p.id)}"><header>${ik("orang")}PIC ${no}<span class="pf-pil ${p.lengkap ? "ok" : "tunggu"}">${esc(p.status === "draf" ? kurang : st)}</span></header><form class="pf-badan" novalidate>
      <div class="pf-foto-baris">${foto(p, "b")}${boleh && p.status === "draf" && !p.pin_ada ? `<div class="pf-aksi">${tombolIkon("kamera", "Ambil foto dengan kamera", 'data-foto="kamera"')}${tombolIkon("galeri", "Pilih foto dari galeri", 'data-foto="galeri"')}</div>
        <input type="file" accept="image/*" capture="user" data-kamera hidden><input type="file" accept="image/*" data-galeri hidden>` : ""}</div>
      <div class="pf-grid">${isian(p, baca)}</div><p class="pf-pesan" role="status" aria-live="polite" data-pesan></p>
      <div class="pf-aksi">${!baca ? `<button type="submit" class="lp-tombol">Simpan data</button>` : ""}
        ${boleh && p.status === "draf" && !p.pin_ada ? `<button type="button" class="lp-tombol" data-atur>${ik("kunci")}Atur PIN</button>` : ""}
        ${aktifMode && p.status === "draf" && p.lengkap ? `<button type="button" class="lp-tombol utama" data-ajukan>Ajukan untuk disetujui</button>` : ""}</div></form></section>`;
  };
  async function daftar(w, opsi = {}) {
    const aktifMode = !!opsi.aktif;
    w.innerHTML = `<h2 class="pf-judul">${ik("orang")}${aktifMode ? "Kelola PIC" : "Daftarkan PIC"}</h2><div class="pf-isi" id="pfIsi" aria-busy="true"></div>`;
    if (aktifMode && opsi.kembali) w.insertAdjacentHTML("beforeend", `<div class="pf-aksi"><button type="button" class="lp-tombol" id="pfKembali">Kembali ke pilih profil</button></div>`), $("pfKembali").addEventListener("click", opsi.kembali);
    /* isian yang sedang diketik (kartu PIC lain dan form tambah) disimpan sebelum digambar ulang dan dikembalikan sesudahnya; form tambah dikosongkan hanya sesudah berhasil menyimpan */
    const ambilIsi = () => { const m = new Map(); for (const f of $("pfIsi")?.querySelectorAll("form") ?? []) { const kunci = f.closest("[data-id]")?.dataset.id ?? (f.closest("#pfBaru") ? "baru" : null); if (!kunci) continue;
      for (const e of f.elements) if (e.name && !e.readOnly) m.set(kunci + "|" + e.name, e.type === "checkbox" ? e.checked : e.value); } return m; };
    const pulihkan = (m, tanpaBaru) => { for (const f of $("pfIsi").querySelectorAll("form")) { const kunci = f.closest("[data-id]")?.dataset.id ?? (f.closest("#pfBaru") ? "baru" : null); if (!kunci || (kunci === "baru" && tanpaBaru)) continue;
      for (const e of f.elements) { const v = m.get(kunci + "|" + e.name); if (e.name && !e.readOnly && v != null && v !== "" && v !== false) { if (e.type === "checkbox") e.checked = v; else e.value = v; } } } };
    const muat = async (tanpaBaru = false) => {
      const lama = ambilIsi();
      const r = await K.api("GET", "/api/instansi/profil"); if (!r.ok) { $("pfIsi").textContent = r.j?.galat || "Daftar PIC belum bisa dimuat."; return; }
      const {akun, profil, maks, wajib} = r.j, hitung = profil.filter(p => p.status !== "dicabut"), lengkap = hitung.filter(p => p.status === "draf" && p.lengkap).length, saya = K.saya().akun;
      const boleh = aktifMode || ["belum_klaim", "ditolak"].includes(akun.status), pil = akun.status === "menunggu" ? ["menunggu", "tunggu"] : akun.status === "ditolak" ? ["ditolak", "bad"] : ["belum dikirim", ""];
      const status = aktifMode ? "" : `<section class="pf-kartu"><header>${ik("jam")}Status pengajuan<span class="pf-pil ${pil[1]}">${pil[0]}</span></header><div class="pf-badan"><p>${
        akun.status === "menunggu" ? "Pengajuan sedang diperiksa admin BNPB. Profil bisa dipakai sesudah pengajuan disetujui." : akun.status === "ditolak" ? `Pengajuan ditolak: ${esc(saya.alasan || "tanpa alasan")}. Perbaiki lalu kirim ulang.`
        : `Daftarkan ${wajib} PIC sebelum mengirim. Baru ada ${lengkap}.`}</p></div></section>`;
      const kartu = hitung.map((p, i) => kartuPic(p, i + 1, boleh, aktifMode)).join("");
      const baru = boleh && hitung.length < maks ? `<section class="pf-kartu" id="pfBaru"><header>${ik("tambah")}Tambah PIC</header><form class="pf-badan" novalidate><div class="pf-grid">${isian(null, false)}</div>
        <p class="pf-pemberitahuan">${esc(PEMBERITAHUAN)}</p><label class="pf-setuju"><input type="checkbox" name="setuju"><span>Saya sudah membaca pemberitahuan ini dan setuju datanya diolah untuk keperluan tersebut.</span></label>
        <p class="pf-pesan" role="status" aria-live="polite" data-pesan></p><div class="pf-aksi"><button type="submit" class="lp-tombol utama">Simpan PIC</button></div></form></section>` : "";
      const dok = aktifMode || !boleh ? "" : `<section class="pf-kartu"><header>${ik("dok")}Dokumen</header><div class="pf-badan"><div class="pf-grid">
        <label>Surat tugas atau SK (PDF atau JPEG, maksimal 3 MB)<input type="file" id="pfSurat" accept="application/pdf,image/jpeg"><span class="pf-kecil" id="pfSuratInfo">${saya.verifikasi.surat ? "Surat tugas sudah terunggah. Pilih berkas lagi untuk menggantinya." : "Belum ada surat tugas."}</span></label>
        <label>Foto kartu pegawai<input type="file" id="pfKartu" accept="image/*"><span class="pf-kecil" id="pfKartuInfo">${saya.verifikasi.kartu ? "Foto kartu sudah terunggah. Pilih foto lagi untuk menggantinya." : "Belum ada foto kartu."}</span></label></div>
        <p class="pf-pesan" role="status" aria-live="polite" id="pfKirimPesan"></p><div class="pf-aksi"><button type="button" class="lp-tombol utama" id="pfKirim" ${lengkap >= wajib ? "" : "disabled"}>Kirim untuk disetujui</button></div></div></section>`;
      const isi = $("pfIsi"); isi.removeAttribute("aria-busy");
      isi.innerHTML = status + `<p class="pf-kecil">Urutan yang aman: isi data dan foto lebih dulu, lalu atur PIN. Sesudah PIN dibuat, data dan foto tidak bisa diubah dari layar ini.</p><div class="pf-dua">${kartu}${baru}</div>` + dok;
      pulihkan(lama, tanpaBaru === true); pasangKartu(isi, profil, muat);
    };
    await muat();
  }
  function pasangKartu(isi, profil, muat) {
    const pesanDi = (el, t, k) => { const p = el.querySelector("[data-pesan]"); if (p) { p.textContent = t || ""; p.className = "pf-pesan " + (k || ""); } };
    for (const sec of isi.querySelectorAll(".pf-kartu[data-id]")) {
      const id = sec.dataset.id, p = profil.find(x => x.id === id), f = sec.querySelector("form");
      f.addEventListener("submit", async e => {
        e.preventDefault(); const t = e.submitter || f.querySelector("[type=submit]"); if (t) { t.disabled = true; t.setAttribute("aria-busy", "true"); } pesanDi(sec, "Menyimpan…");
        await new Promise(r => sesudahCat(r));
        const h = await K.api("POST", `/api/instansi/profil/${id}`, ambilIsian(f)); if (t) { t.disabled = false; t.removeAttribute("aria-busy"); }
        h.ok ? (pesanDi(sec, "Data tersimpan.", "ok"), muat()) : pesanDi(sec, h.j?.galat || "Belum tersimpan.", "galat");
      });
      for (const b of sec.querySelectorAll("[data-foto]")) b.addEventListener("click", () => sec.querySelector(b.dataset.foto === "kamera" ? "[data-kamera]" : "[data-galeri]").click());
      for (const inp of sec.querySelectorAll("[data-kamera],[data-galeri]")) inp.addEventListener("change", async () => {
        const berkas = inp.files[0]; inp.value = ""; if (!berkas) return; pesanDi(sec, "Memperkecil foto…");
        const kecil = await kecilkan(berkas); if (!kecil) return pesanDi(sec, "Foto tidak terbaca. Coba foto lain.", "galat");
        pesanDi(sec, "Mengunggah…"); const h = await K.api("POST", `/api/instansi/profil/foto/${id}`, kecil);
        h.ok ? (pesanDi(sec, "Foto tersimpan.", "ok"), muat()) : pesanDi(sec, h.j?.galat || "Foto belum tersimpan.", "galat");
      });
      sec.querySelector("[data-atur]")?.addEventListener("click", () => {
        if (!p.foto) return pesanDi(sec, "Tambahkan foto dulu, lalu atur PIN.", "galat");
        bukaDialog({profil: p, ket: "Buat PIN 6 angka untuk profil ini. PIN hanya Anda yang tahu.", baris: ["PIN baru", "Ulangi PIN"], tombol: "Simpan PIN", kirim: async ([a, b]) => {
          if (a !== b) return {pesan: "Kedua PIN belum sama. Ketik ulang."};
          const h = await K.api("POST", `/api/instansi/profil/pin/${id}`, {pin: a}); if (!h.ok) return {pesan: h.j?.galat};
          setTimeout(muat, 0); return {ok: true};
        }});
      });
      sec.querySelector("[data-ajukan]")?.addEventListener("click", async e => {
        e.currentTarget.disabled = true; const h = await K.api("POST", `/api/instansi/profil/ajukan/${id}`, {});
        h.ok ? (pesanDi(sec, "Diajukan. Admin BNPB akan memeriksa.", "ok"), muat()) : (pesanDi(sec, h.j?.galat || "Belum bisa diajukan.", "galat"), e.currentTarget.disabled = false);
      });
    }
    const baru = isi.querySelector("#pfBaru form");
    baru?.addEventListener("submit", async e => {
      e.preventDefault(); const t = e.submitter || baru.querySelector("[type=submit]"); t.disabled = true; t.setAttribute("aria-busy", "true"); pesanDi(baru, "Menyimpan…");
      await new Promise(r => sesudahCat(r));
      const h = await K.api("POST", "/api/instansi/profil", {...ambilIsian(baru), setuju: baru.elements.setuju.checked}); t.disabled = false; t.removeAttribute("aria-busy");
      h.ok ? muat(true) : pesanDi(baru, h.j?.galat || "Belum tersimpan.", "galat");
    });
    isi.querySelector("#pfSurat")?.addEventListener("change", e => K.unggahDok("surat", e.target.files[0], $("pfSuratInfo")));
    isi.querySelector("#pfKartu")?.addEventListener("change", e => K.unggahDok("kartu", e.target.files[0], $("pfKartuInfo")));
    isi.querySelector("#pfKirim")?.addEventListener("click", async e => {
      const t = e.currentTarget, p = $("pfKirimPesan"); t.disabled = true; t.setAttribute("aria-busy", "true"); p.className = "pf-pesan"; p.textContent = "Mengirim…";
      await new Promise(r => sesudahCat(r));
      const h = await K.api("POST", "/api/instansi/kirim", {}); t.removeAttribute("aria-busy");
      if (h.ok) { K.pesan("Terkirim. Pengajuan sedang diperiksa admin BNPB.", "ok"); return K.muatSaya(); }
      t.disabled = false; p.className = "pf-pesan galat"; p.textContent = h.j?.galat || "Belum bisa dikirim.";
    });
  }

  /* ---------- L6: kepala kerja ---------- */
  const LABEL_LOG = {masuk: "masuk akun", pin_ok: "masuk profil", pin_salah: "PIN salah", terkunci: "profil terkunci sementara", terkunci_admin: "profil dikunci admin", ganti_profil: "ganti profil", keluar: "keluar", profil_buat: "PIC didaftarkan", profil_ubah: "data PIC diubah", foto: "foto diunggah", pin_atur: "PIN diatur", pin_ganti: "PIN diganti", kirim: "dikirim untuk disetujui", setuju: "disetujui", tolak: "ditolak", cabut: "profil dicabut", reset_pin: "PIN diatur ulang admin", buka_kunci: "kunci dibuka admin", kerja: "tindakan kerja", meja: "tindakan di meja laporan"};
  function kepala(w, profil) {
    w.hidden = false;
    w.innerHTML = `<div class="pf-ringkas">${foto({id: profil.id, nama: profil.nama, foto: true, diubah: ""}, "k")}<div><div class="pf-nama">${esc(profil.nama)}</div><div class="pf-jabatan">${esc(profil.jabatan)}</div></div></div>
      ${tombolIkon("dok", "Log tindakan lembaga", 'data-log="1"')}${tombolIkon("kunci", "Ganti PIN", 'data-gpin="1"')}${tombolIkon("tukar", "Ganti profil", 'data-ganti="1"')}`;
    w.onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.ganti) { b.disabled = true; const h = await K.api("POST", "/api/instansi/profil/keluar", {}); if (!h.ok) { b.disabled = false; return K.pesan(h.j?.galat || "Belum bisa ganti profil.", "galat"); } K.pesan(""); return K.muatSaya(); }
      if (b.dataset.gpin) return bukaDialog({profil, ket: "Ganti PIN profil ini.", baris: ["PIN lama", "PIN baru", "Ulangi PIN baru"], tombol: "Simpan PIN baru", kirim: async ([l, a, c]) => {
        if (a !== c) return {pesan: "Kedua PIN baru belum sama. Ketik ulang."};
        const h = await K.api("POST", `/api/instansi/profil/gantipin/${profil.id}`, {lama: l, baru: a}); if (!h.ok) return {pesan: h.j?.galat}; K.pesan("PIN baru tersimpan.", "ok"); return {ok: true};
      }});
      if (b.dataset.log) return bukaLog(b);
    };
  }
  async function bukaLog(b) {
    let p = $("pfLog"); if (p) { p.remove(); b.setAttribute("aria-expanded", "false"); return; }
    b.setAttribute("aria-expanded", "true"); p = document.createElement("section"); p.id = "pfLog"; p.className = "pf-kartu"; p.innerHTML = `<header>${ik("dok")}Log lembaga</header><div class="pf-badan"><p class="pf-kecil">Memuat…</p></div>`;
    $("profilKepala").after(p);
    let sebelum = null;
    const muat = async () => {
      const h = await K.api("GET", "/api/instansi/profil/log" + (sebelum ? `?sebelum=${sebelum}` : ""));
      const badan = p.querySelector(".pf-badan"); if (!h.ok) { badan.textContent = h.j?.galat || "Log belum bisa dimuat."; return; }
      const tambah = h.j.log.map(x => `<tr><td>${esc(tglJam(x.waktu))}</td><td>${esc(x.profil || "-")}</td><td>${esc(LABEL_LOG[x.jenis] || x.jenis)}${x.rute ? ` <span class="pf-kecil">${esc(x.rute)}</span>` : ""}</td></tr>`).join("");
      sebelum = h.j.berikut;
      const tb = badan.querySelector("tbody");
      if (tb) { tb.insertAdjacentHTML("beforeend", tambah); if (!sebelum) badan.querySelector("#pfLogLagi")?.remove(); return; }   // "Muat lebih lama" menambah baris, tidak menggambar ulang tabel
      badan.innerHTML = `<div class="pf-gulir"><table class="pf-tabel"><thead><tr><th>Waktu</th><th>Siapa</th><th>Tindakan</th></tr></thead><tbody>${tambah || '<tr><td colspan="3">Belum ada catatan.</td></tr>'}</tbody></table></div>${sebelum ? '<button type="button" class="lp-tombol" id="pfLogLagi">Muat lebih lama</button>' : ""}`;
      badan.querySelector("#pfLogLagi")?.addEventListener("click", muat);
    };
    await muat();
  }

  window.InstansiProfil = {pasang: k => { K = k; }, pilih, daftar, kepala, wajibGanti, kecilkan};
})();
