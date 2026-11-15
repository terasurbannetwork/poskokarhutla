/* Antrean luring /meja dan /relawan/saya di atas antrean bersama /inti/antre.js (PbAntre, KP-11). Muat /inti/antre.js DULU. Skrip klasik tanpa inline (CSP), juga dimuat node untuk uji.
   Satu saluran per halaman ("meja", "relawan"); butir = {m, u, b} (metode, url, badan lengkap dengan klien_id dan waktu_klien persis seperti yang dikirim langsung).
   Header x-kode dibaca saat kirim lewat opsi.header, tidak pernah disimpan. Butir lama di IndexedDB pb_antre/kv (satu larik per nama) dipindah ke saluran baru lewat PbAntre.pindahDari,
   basis lama dihapus hanya sesudah semua butir terbaca ulang. Tidak memanggil indexedDB sendiri (gerbang keterpaduan). */
(g => {
  "use strict";
  const NAMA = ["meja", "relawan"], TIMEOUT = 15000;
  const post = async (u, m, b, kode) => {
    const ac = new g.AbortController(), t = setTimeout(() => ac.abort(), TIMEOUT);
    try { const r = await g.fetch(u, { method: m, headers: { "x-kode": kode, "content-type": "application/json" }, body: JSON.stringify(b), signal: ac.signal }); return { s: r.status, j: await r.json().catch(() => ({})) }; }
    finally { clearTimeout(t); }
  };
  const acak = () => { const a = new Uint8Array(12); g.crypto.getRandomValues(a); return Array.from(a, x => x.toString(16).padStart(2, "0")).join(""); };
  const sah = x => x && NAMA.includes(x.untuk) && typeof x.klien_id === "string" && typeof x.u === "string" && x.b && typeof x.b === "object";

  /* opsi.simpan/kirimLangsung/sekarang untuk uji; di peramban semuanya bawaan */
  function buat(untuk, ambilKode, opsi = {}) {
    const P = g.PbAntre, sekarang = opsi.sekarang || Date.now;
    const bikin = (n, o) => P.saluran(n, { simpan: opsi.simpan && opsi.simpan(n), langsung: opsi.langsung, pemicu: opsi.pemicu, ...o });
    const kirimButir = (n, kode) => async badan => { const { m, u, b } = badan[0]; return post(u, m, b, kode()); };
    const s = bikin(untuk, { header: () => ({ "x-kode": ambilKode() }), kirim: opsi.kirim || kirimButir(untuk, ambilKode) });
    const sal = { [untuk]: s };
    /* saluran halaman lain hanya menampung butir hasil pindahan; tidak pernah mengirim (kodenya bukan milik halaman ini) */
    for (const n of NAMA) if (n !== untuk) sal[n] = bikin(n, { pemicu: false, kirim: async () => ({ s: 401, j: {} }) });

    async function kirim(m, u, b, online = () => g.navigator && g.navigator.onLine !== false) {
      const klien_id = acak(), waktu = sekarang(), badan = { ...b, klien_id, waktu_klien: waktu };
      if (online() && ambilKode() && !(await s.menunggu())) {
        let r; try { r = await (opsi.kirimLangsung || post)(u, m, badan, ambilKode()); } catch (e) { r = null; }
        if (r && r.s !== 0 && r.s !== 408 && r.s !== 429 && r.s < 500) return { ok: r.s >= 200 && r.s < 300, s: r.s, j: r.j || {} };
      }
      try { await s.masukkan({ klien_id, data: { m, u, b: badan }, dibuat: waktu }); } catch (e) { return { ok: false, s: 0, j: { galat: "Perangkat tidak bisa menyimpan kiriman. Coba lagi saat ada sinyal." } }; }
      if (g.document && opsi.langsung !== false) s.kirimSekarang();
      return { ok: true, antre: true, s: 0, j: {} };
    }
    const jumlah = () => s.menunggu();
    /* pita bersama + panggilan selesai() bila jumlah butir menurun (terkirim) */
    const pasang = (el, selesai) => { let n = -1; const p = P.pasangPita(el);
      P.dengar(async () => { const k = await s.menunggu(); if (n > k && selesai) selesai(); n = k; }); s.menunggu().then(k => { n = k; }); return p; };

    /* pindahan: larik lama -> butir baru per `untuk`. pindahDari memetakan satu rekaman jadi satu butir, jadi pembungkus `ke` membuka larik. */
    async function pindah(lama) {
      let nomor = 0; const tulis = new Set(), grup = [];
      const ke = { cadangan: false, kedaluwarsa: t => s.kedaluwarsa(t),
        daftar: async () => { const l = []; for (const n of NAMA) l.push(...await sal[n].daftar()); const ada = new Set(l.map(x => x.klien_id));
          for (const gr of grup) if (gr.ids.every(i => ada.has(i))) l.push({ klien_id: gr.klien_id }); ke.cadangan = NAMA.some(n => sal[n].cadangan); return l; },
        masukkan: async gr => { const ids = []; for (const x of gr.items.filter(sah).filter(x => !s.kedaluwarsa(x.b.waktu_klien))) {   // butir lewat umur 14 hari dibuang (sama dengan umur antrean bersama)
           await sal[x.untuk].masukkan({ klien_id: x.klien_id, data: { m: x.m, u: x.u, b: x.b }, dibuat: x.b.waktu_klien }); ids.push(x.klien_id); }
          grup.push({ klien_id: gr.klien_id, ids }); } };
      try { return await P.pindahDari({ db: "pb_antre", store: "kv", petakan: v => ({ klien_id: "grup" + nomor++, items: Array.isArray(v) ? v : [] }), ke, lama }); } catch (e) { return -1; }
    }
    /* cadangan localStorage lama (dipakai bila IndexedDB gagal dibuka) */
    async function pindahLokal(ls = g.localStorage) {
      try { const k = "pb_antre_bnpb", l = JSON.parse(ls.getItem(k) || "[]"); if (!Array.isArray(l)) return 0;
        for (const x of l.filter(sah).filter(x => !s.kedaluwarsa(x.b.waktu_klien))) await sal[x.untuk].masukkan({ klien_id: x.klien_id, data: { m: x.m, u: x.u, b: x.b }, dibuat: x.b.waktu_klien });
        if (!NAMA.some(n => sal[n].cadangan)) ls.removeItem(k); return l.length; } catch (e) { return 0; }
    }
    return { saluran: s, kirim, jumlah, pasang, pindah, pindahLokal };
  }

  g.AntreBnpb = { buat };
})(globalThis);
