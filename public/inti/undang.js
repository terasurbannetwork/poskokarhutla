/* Undang rekan (Pintu Masuk PM-11, DESIGN-SYSTEM L6, ALUR A6): skrip klasik tanpa ketergantungan, global window.UndangRekan.
   Dipasang halaman mana pun: UndangRekan.pasang(wadah, {akunId}). Satu kartu standar .ex.ex-std berisi form undang, tabel undangan,
   tabel anggota (hanya bila GET /api/masuk/anggota 200), dan antrean menunggu. Semua teks dari data lewat textContent (DOM aman),
   semua POST membawa x-pb: 1. Nomor selalu tersamar dari server. Hasil fetch lama tidak menimpa yang baru (nomor urut per bagian).
   WAJIB memuat /inti/pesan.js (window.PesanLayar) SEBELUM skrip ini; tanpa itu pasang() melempar galat.
   Juga dimuat node untuk uji (tests/inti/undang.test.mjs, lewat vm). Tanpa timer berulang. */
(g => {
  "use strict";
  const P = () => { if (!g.PesanLayar) throw new Error("undang.js butuh /inti/pesan.js: muat sebelum /inti/undang.js"); return g.PesanLayar; };

  /* ---- bagian murni ---- */
  const STATUS = {terkirim: ["Terkirim", "kuning"], diterima: ["Diterima", "hijau"], habis: ["Kedaluwarsa", "abu"]};
  const pilStatus = s => STATUS[s] || ["Kedaluwarsa", "abu"];
  const JALUR = {undangan: "Undangan", kontak: "Kontak", email: "Email", tinjau: "Ditinjau"};
  const jalur = j => JALUR[j] || "Ditinjau";
  const tanggal = t => P().tanggal(t);
  const relatif = (t, kini) => P().relatif(t || null, kini);   // 0 = belum pernah masuk
  /* kalimat galat manusiawi; s = status HTTP (0 = putus), ra = header retry-after (detik), j = badan jawaban */
  const galat = (s, ra, j) => {
    if (s === 401) return "Sesi masuk berakhir. Masuk lagi lalu ulangi.";
    if (s === 409) return "Nomor ini sudah anggota atau sudah diundang.";
    return P().galat(s, s === 400 || s === 403 || s === 404 ? j && j.galat : null, Number(ra));
  };

  /* ---- jaringan: tidak pernah melempar; {s, j, ra} ---- */
  async function api(metode, url, badan) {
    try {
      const o = {method: metode, credentials: "same-origin", headers: {}};
      if (metode !== "GET") { o.headers["x-pb"] = "1"; o.headers["content-type"] = "application/json"; o.body = JSON.stringify(badan || {}); }
      const r = await g.fetch(url, o);
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      return {s: r.status, j, ra: r.headers && r.headers.get ? r.headers.get("retry-after") : null};
    } catch (e) { return {s: 0, j: null, ra: null}; }
  }

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => {
    const e = g.document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a);
    return e;
  };
  const svg = d => {
    const s = g.document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "ud-ik");
    for (const x of d.split("|")) { const p = g.document.createElementNS(NS, "path"); p.setAttribute("d", x); s.append(p); }
    return s;
  };
  const IK_UNDANG = "M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1|M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M19 8v6|M22 11h-6";
  const IK_CABUT = "M6 6l12 12|M18 6L6 18";
  const pil = (teks, warna) => h("span", {class: "ud-pil " + warna, teks});
  const tombolIkon = (ik, label, onklik, att) => {
    const b = h("button", Object.assign({type: "button", class: "ud-btn", "aria-label": label, title: label}, att), svg(ik));
    b.addEventListener("click", onklik); return b;
  };
  const tombolTeks = (teks, onklik, kelas) => { const b = h("button", {type: "button", class: "ud-tb " + (kelas || ""), teks}); b.addEventListener("click", onklik); return b; };

  /* tabel: kolom = [[label, judul]], tiap baris = larik sel (node atau teks) */
  function tabel(kolom, baris) {
    const kepala = h("tr", null, kolom.map(k => h("th", {scope: "col", teks: k})));
    const tb = h("tbody");
    for (const sel of baris) tb.append(h("tr", null, sel.map((s, i) => h("td", {"data-label": kolom[i]}, s))));
    return h("div", {class: "ud-wadah"}, h("table", {class: "ex-tabel ud-tabel"}, h("thead", null, kepala), tb));
  }
  const namaSel = nama => h("b", {teks: nama || "Tanpa nama"});

  function pasang(wadah, opsi) {
    const PL = P();
    const akunId = opsi && opsi.akunId, q = akunId ? "?akun_id=" + encodeURIComponent(akunId) : "";
    const no = {u: 0, a: 0, t: 0};   // nomor urut per bagian: hasil fetch yang sudah usang dibuang
    let kirim = false;

    const kartu = h("section", {class: "ex ex-std ud-kartu", "aria-label": "Undang rekan"});
    const inWa = h("input", {id: "ud-wa", class: "ud-isian", type: "tel", inputmode: "numeric", autocomplete: "off", placeholder: "08xxxxxxxxxx", maxlength: "20", required: true});
    const inNama = h("input", {id: "ud-nama", class: "ud-isian", type: "text", autocomplete: "off", maxlength: "80", placeholder: "Nama rekan (boleh dikosongkan)"});
    const tbUndang = h("button", {type: "submit", class: "ud-tb ud-utama", teks: "Undang"});
    const pesan = h("p", {class: "ud-pesan", role: "status"});
    const form = h("form", {class: "ud-form", novalidate: true},
      h("label", {class: "ud-fl", for: "ud-wa"}, "Nomor WhatsApp"), inWa,
      h("label", {class: "ud-fl", for: "ud-nama"}, "Nama"), inNama, tbUndang);
    const slotSesi = h("div", {class: "ud-konf", role: "status", "aria-live": "polite"});
    const bUndang = h("div", {class: "ud-bag"}), bAnggota = h("div", {class: "ud-bag"}), bTunggu = h("div", {class: "ud-bag"});
    bAnggota.hidden = true; bTunggu.hidden = true;
    const bd = h("div", {class: "ex-bd"}, form, pesan, slotSesi, bUndang, bTunggu, bAnggota);
    kartu.append(h("header", {class: "ex-hd"}, h("div", {class: "ex-jd"}, h("h3", null, svg(IK_UNDANG), "Undang rekan"))), bd);
    wadah.replaceChildren(kartu);

    const lapor = t => { pesan.textContent = t || ""; };
    const judul = (t, ...x) => h("h4", {class: "ud-sub"}, t, ...x);
    /* konfirmasi dalam halaman (bukan dialog bawaan peramban: memblokir main thread): satu terbuka sekali waktu, fokus ke Batal, Escape membatalkan */
    let tutupKonf = null;
    const konfirmasi = (slot, kalimat, labelYa, onYa, balik) => {
      if (tutupKonf) tutupKonf();
      const tutup = () => { slot.replaceChildren(); if (tutupKonf === tutup) tutupKonf = null; };
      const ya = tombolTeks(labelYa, () => { ya.disabled = true; batal.disabled = true; tutup(); onYa(); }, "ud-utama");
      const batal = tombolTeks("Batal", () => { tutup(); if (balik) balik.focus(); }, "ud-tipis");
      const kotak = h("div", {class: "ud-konf-isi"}, h("p", {class: "ud-ket", teks: kalimat}), h("span", {class: "ud-aksi"}, ya, batal));
      kotak.addEventListener("keydown", ev => { if (ev.key === "Escape") batal.click(); });
      tutupKonf = tutup; slot.replaceChildren(kotak); batal.focus();
    };
    /* 401: orang belum punya sesi pintu masuk; kartu jadi satu ajakan masuk */
    const ajak = () => {
      const jalur = (g.location && g.location.pathname) || "/";
      bd.replaceChildren(h("p", {class: "ud-ket ud-ajak"}, h("a", {href: "/masuk?ke=" + encodeURIComponent(jalur), teks: PL.MASUK_WA})));
    };
    const status = (t, kelas) => h("p", {class: "ud-ket " + (kelas || ""), role: "status", teks: t});

    /* ---- undangan ---- */
    async function muatUndang() {
      const n = ++no.u; bUndang.replaceChildren(judul("Undangan"), status("Memuat..."));
      const r = await api("GET", "/api/masuk/undang" + q);
      if (n !== no.u) return;
      if (r.s === 401) { ajak(); return; }
      if (r.s !== 200 || !r.j) { bUndang.replaceChildren(judul("Undangan"), status(galat(r.s, r.ra, r.j), "ud-galat")); return; }
      const d = r.j.undangan || [];
      if (!d.length) { bUndang.replaceChildren(judul("Undangan"), status("Belum ada undangan.")); return; }
      const baris = d.map(u => {
        const [label, warna] = pilStatus(u.status);
        const boleh = u.status === "terkirim" && (u.milikku || r.j.boleh_cabut_semua);
        return [namaSel(u.nama), PL.samar(u.wa), pil(label, warna), tanggal(u.habis),
          boleh ? tombolIkon(IK_CABUT, `Cabut undangan untuk ${u.nama || PL.samar(u.wa)}`, ev => cabutUndang(u, ev.currentTarget)) : ""];
      });
      bUndang.replaceChildren(judul("Undangan"), tabel(["Nama", "Nomor", "Status", "Berlaku sampai", "Aksi"], baris));
    }
    async function cabutUndang(u, tombol) {
      if (tombol.disabled) return;
      tombol.disabled = true; lapor("");
      const r = await api("POST", "/api/masuk/undang/cabut/" + encodeURIComponent(u.id));
      if (r.s === 200) { lapor("Undangan dicabut."); await muatUndang(); return; }
      tombol.disabled = false;
      lapor(r.s === 409 ? "Undangan itu sudah tidak berstatus terkirim." : galat(r.s, r.ra, r.j));
      if (r.s === 404 || r.s === 409) muatUndang();
    }

    /* ---- anggota ---- */
    async function muatAnggota() {
      const n = ++no.a;
      const r = await api("GET", "/api/masuk/anggota" + q);
      if (n !== no.a) return;
      if (r.s !== 200 || !r.j) { bAnggota.hidden = true; bAnggota.replaceChildren(); return; }   // bukan pemilik nomor akun: bagian tidak tampil
      bAnggota.hidden = false;
      const d = (r.j.anggota || []).filter(a => a.status !== "dicabut"), kini = Date.now();
      if (!d.length) { bAnggota.replaceChildren(judul("Anggota"), status("Belum ada anggota selain pemilik nomor akun.")); return; }
      const baris = d.map(a => {
        const slot = h("div", {class: "ud-konf", role: "status", "aria-live": "polite"});
        const nm = a.nama || PL.samar(a.wa);
        const t = tombolIkon(IK_CABUT, `Cabut anggota ${nm}`, ev => konfirmasi(slot, `Cabut ${nm}? Ia tidak bisa lagi masuk ke akun ini dan undangan yang ia kirim ikut dicabut. Sesi yang sedang berjalan tetap hidup sampai berakhir.`, "Ya, cabut", () => cabutAnggota(a, t), ev.currentTarget));
        return [namaSel(a.nama), PL.samar(a.wa), jalur(a.jalur), relatif(a.terakhir_masuk, kini), h("div", null, t, slot)];
      });
      bAnggota.replaceChildren(judul("Anggota"), tabel(["Nama", "Nomor", "Jalur masuk", "Terakhir masuk", "Aksi"], baris));
    }
    async function cabutAnggota(a, tombol, sesi) {
      if (tombol.disabled) return;
      const nm = a.nama || PL.samar(a.wa);
      tombol.disabled = true; lapor("");
      const r = await api("POST", "/api/masuk/anggota/cabut/" + encodeURIComponent(a.id), sesi ? {cabut_sesi: true} : {});
      if (r.s !== 200) { tombol.disabled = false; lapor(r.s === 409 ? "Anggota itu sudah dicabut." : galat(r.s, r.ra, r.j)); if (r.s === 404 || r.s === 409) muatAnggota(); return; }
      if (r.j && r.j.sesi_semua_dicabut) lapor("Semua sesi di akun ini diputus. Semua orang perlu masuk ulang.");
      else if (r.j && r.j.sesi_lama_masih_hidup) {
        pesan.textContent = `${nm} dicabut. Sesi yang sudah berjalan masih hidup. `;
        const ts = tombolTeks("Putuskan semua sesi", () => konfirmasi(slotSesi, "Putuskan semua sesi? Semua orang di akun ini, termasuk kamu, harus masuk ulang.", "Ya, putuskan semua sesi", () => cabutAnggota(a, ts, true), ts), "ud-tipis");
        pesan.append(ts);
      } else lapor(`${nm} dicabut.`);
      await Promise.all([muatAnggota(), muatUndang()]);   // pesan tidak disentuh muat ulang, tombol sesi tetap ada
    }

    /* ---- antrean menunggu ---- */
    async function muatTunggu() {
      const n = ++no.t;
      const r = await api("GET", "/api/masuk/anggota/tinjau");
      if (n !== no.t) return;
      const d = r.s === 200 && r.j && r.j.anggota || [];
      if (!d.length) { bTunggu.hidden = true; bTunggu.replaceChildren(); return; }
      bTunggu.hidden = false;
      const baris = d.map(a => {
        const tanda = h("span", {class: "ud-tanda"}, a.cocok_kontak ? pil("Cocok kontak", "hijau") : null, a.nomor_terbukti ? pil("Nomor terbukti", "hijau") : null);
        const aksi = h("span", {class: "ud-aksi"}), slot = h("div", {class: "ud-konf", role: "status", "aria-live": "polite"});
        const tolak = tombolTeks("Tolak", ev => konfirmasi(slot, `Tolak permohonan ${a.nama || PL.samar(a.wa)}? Ia tidak jadi anggota akun ini.`, "Ya, tolak", () => putus(a, "tolak", aksi), ev.currentTarget), "ud-tipis");
        aksi.append(tombolTeks("Setujui", () => putus(a, "setujui", aksi), "ud-utama"), tolak);
        return [a.nama || "Tanpa nama", PL.samar(a.wa), tanda, h("div", null, aksi, slot)];
      });
      bTunggu.replaceChildren(judul(PL.MENUNGGU), tabel(["Nama", "Nomor", "Tanda", "Keputusan"], baris));
    }
    async function putus(a, aksi, sel) {
      const bt = sel.querySelectorAll("button"); if (bt[0].disabled) return;
      bt.forEach(b => { b.disabled = true; }); lapor("");
      const r = await api("POST", "/api/masuk/anggota/putus/" + encodeURIComponent(a.id), {aksi});
      if (r.s === 200) { lapor(aksi === "setujui" ? "Anggota disetujui." : "Permohonan ditolak."); await Promise.all([muatTunggu(), muatAnggota()]); return; }
      bt.forEach(b => { b.disabled = false; });
      lapor(r.s === 409 ? "Permohonan itu sudah diputus orang lain." : galat(r.s, r.ra, r.j));
      if (r.s === 404 || r.s === 409) muatTunggu();
    }

    /* ---- form ---- */
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (kirim) return;   // klik ganda tidak mengirim dua kali
      const wa = inWa.value.trim();
      if (!/^[+0-9][0-9 .-]{7,18}$/.test(wa)) { lapor("Isi nomor WhatsApp dengan angka, misalnya 081234567890."); inWa.focus(); return; }
      kirim = true; tbUndang.disabled = true; lapor("");
      const badan = {wa}; const nama = inNama.value.trim(); if (nama) badan.nama = nama; if (akunId) badan.akun_id = akunId;
      const r = await api("POST", "/api/masuk/undang", badan);
      kirim = false; tbUndang.disabled = false;
      if (r.s === 201 || r.s === 200) { inWa.value = ""; inNama.value = ""; lapor("Undangan terkirim."); await muatUndang(); inWa.focus(); return; }
      lapor(galat(r.s, r.ra, r.j));
    });

    Promise.all([muatUndang(), muatAnggota(), muatTunggu()]);
    return {muat: () => Promise.all([muatUndang(), muatAnggota(), muatTunggu()])};
  }

  g.UndangRekan = {pasang, pilStatus, jalur, galat};
})(typeof window !== "undefined" ? window : globalThis);
