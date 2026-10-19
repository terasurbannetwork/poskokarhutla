/* Antrean kiriman luring bersama: /meja dan /relawan/saya (F6). Skrip klasik tanpa inline (CSP), juga dimuat node untuk uji (tests/warga/antre.test.mjs).
   Kiriman yang gagal karena jaringan/5xx disimpan di IndexedDB (cadangan localStorage) bersama klien_id acak + waktu_klien (waktu kejadian di perangkat),
   lalu dikirim ulang berurutan. Server memakai klien_id sebagai kunci idempotensi, jadi kiriman ulang (juga dari dua tab, atau respons yang hilang di jalan) tidak menggandakan baris.
   KODE petugas/relawan TIDAK disimpan di antrean: header x-kode diambil dari sessionStorage halaman saat kirim; tanpa kode antrean menunggu.
   Aturan respons: 2xx = selesai; 408/429/5xx/jaringan = tetap antre dan berhenti (urutan terjaga); 4xx lain = dibuang dengan pesan galat server. */
(g => {
  "use strict";
  const MAKS = 200, TIMEOUT = 15000;
  const acakDefault = () => { const a = new Uint8Array(12); if (g.crypto?.getRandomValues) g.crypto.getRandomValues(a); else for (let i = 0; i < 12; i++) a[i] = Math.random() * 256; return Array.from(a, x => x.toString(16).padStart(2, "0")).join(""); };
  const bisaDicoba = s => s === 408 || s === 429 || s >= 500;

  /* penyimpanan: satu larik per nama. IndexedDB bila ada, kalau tidak (atau gagal dibuka) localStorage. ponytail: seluruh larik ditulis ulang tiap perubahan (antrean <= 200), pakai kursor bila membesar */
  function penyimpanan(nama) {
    const kunci = "pb_antre_" + nama;
    const ls = { baca: async () => { try { return JSON.parse(g.localStorage.getItem(kunci) || "[]"); } catch (e) { return []; } },
      tulis: async v => { try { g.localStorage.setItem(kunci, JSON.stringify(v)); } catch (e) { throw new Error("penyimpanan penuh"); } } };
    if (!g.indexedDB) return ls;
    const buka = new Promise((ok, gagal) => { const r = g.indexedDB.open("pb_antre", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => ok(r.result); r.onerror = r.onblocked = () => gagal(r.error); });
    const op = (mode, f) => buka.then(db => new Promise((ok, gagal) => { const t = db.transaction("kv", mode), q = f(t.objectStore("kv")); t.oncomplete = () => ok(q.result); t.onerror = t.onabort = () => gagal(t.error); }));
    return { baca: () => op("readonly", s => s.get(nama)).then(v => v || [], () => ls.baca()), tulis: v => op("readwrite", s => s.put(v, nama)).catch(() => ls.tulis(v)) };
  }

  /* inti murni: tidak menyentuh DOM/jaringan sendiri. kirimItem(item) -> Promise<{s, j}>, melempar bila jaringan gagal. */
  function buat({ untuk, simpan, kirimItem, kodeAda = () => true, sekarang = Date.now, acak = acakDefault }) {
    let rantai = Promise.resolve(), jalan = null;
    const seri = f => { const p = rantai.then(f); rantai = p.catch(() => {}); return p; };   // baca-ubah-tulis tidak boleh bertumpuk
    const semua = () => simpan.baca();
    const milik = l => l.filter(x => x.untuk === untuk);
    const ubah = f => seri(async () => { const l = await semua(); const n = f(l); await simpan.tulis(n); return n; });
    const baru = (m, u, b) => { const klien_id = acak(); return { untuk, klien_id, m, u, b: { ...b, klien_id, waktu_klien: sekarang() } }; };
    const tambahItem = item => ubah(l => { if (milik(l).length >= MAKS) throw new Error("antrean penuh"); return [...l, item]; });
    const jumlah = async () => milik(await semua()).length;

    function kirimSemua() {
      if (jalan) return jalan;
      jalan = (async () => {
        const h = { terkirim: 0, dibuang: [], sisa: 0, kode: true };
        if (!kodeAda()) { h.kode = false; h.sisa = await jumlah(); return h; }
        for (;;) {
          const it = milik(await semua())[0]; if (!it) break;
          let r; try { r = await kirimItem(it); } catch (e) { break; }
          if (r.s >= 200 && r.s < 300) { await ubah(l => l.filter(x => x.klien_id !== it.klien_id)); h.terkirim++; }
          else if (!bisaDicoba(r.s) && r.s >= 400 && r.s < 500) { await ubah(l => l.filter(x => x.klien_id !== it.klien_id)); h.dibuang.push({ item: it, s: r.s, pesan: r.j?.galat || `ditolak server (${r.s})` }); }
          else break;   // 408/429/5xx/respons aneh: coba lagi nanti, urutan tetap
        }
        h.sisa = await jumlah(); return h;
      })().finally(() => { jalan = null; });
      return jalan;
    }

    /* kirim langsung bila antrean kosong dan online; kalau gagal/ tak ada sinyal masuk antrean dengan klien_id yang SAMA (respons yang hilang pun aman). */
    async function kirim(m, u, b, online = () => g.navigator?.onLine !== false) {
      const item = baru(m, u, b);
      if (online() && !jalan && kodeAda() && !(await jumlah())) {
        let r; try { r = await kirimItem(item); } catch (e) { r = null; }
        if (r && !bisaDicoba(r.s)) return { ok: r.s >= 200 && r.s < 300, s: r.s, j: r.j || {} };
      }
      try { await tambahItem(item); } catch (e) { return { ok: false, s: 0, j: { galat: e.message === "antrean penuh" ? "Antrean perangkat penuh. Tunggu sinyal sampai terkirim dulu." : "Perangkat tidak bisa menyimpan kiriman. Coba lagi saat ada sinyal." } }; }
      return { ok: true, antre: true, s: 0, j: {} };
    }
    return { kirim, kirimSemua, jumlah, tambahItem, baru };
  }

  /* kirimItem untuk peramban: header x-kode dari ambilKode() saat kirim (tidak pernah dari antrean), batas 15 dtk */
  function pengirim(ambilKode) {
    return async it => {
      const ac = new g.AbortController(), t = setTimeout(() => ac.abort(), TIMEOUT);
      try {
        const r = await g.fetch(it.u, { method: it.m, headers: { "x-kode": ambilKode(), "content-type": "application/json" }, body: JSON.stringify(it.b), signal: ac.signal });
        return { s: r.status, j: await r.json().catch(() => ({})) };
      } finally { clearTimeout(t); }
    };
  }

  /* pita status + pemicu kirim ulang (online, kembali ke tab, tiap 30 dtk). Mengembalikan fungsi segarkan. */
  function pasang(antre, { wadah, selesai = () => {}, buang = () => {} }) {
    const d = g.document, pita = d.createElement("div"), teks = d.createElement("span"), tombol = d.createElement("button");
    pita.className = "antre-pita"; pita.hidden = true; pita.setAttribute("role", "status"); tombol.type = "button"; tombol.textContent = "Kirim sekarang";
    pita.append(teks, tombol); wadah.prepend(pita);
    let pesanBuang = "";
    const segarkan = async () => {
      const n = await antre.jumlah();
      pita.hidden = !n && !pesanBuang;
      teks.textContent = pesanBuang || `${n} kiriman menunggu sinyal`;
      pita.classList.toggle("galat", !!pesanBuang); tombol.hidden = !n;
    };
    const coba = async () => {
      const h = await antre.kirimSemua();
      if (h.dibuang.length) { pesanBuang = h.dibuang.map(x => x.pesan).join("; ").slice(0, 200); buang(h.dibuang); } else if (h.terkirim) pesanBuang = "";
      if (!h.kode && h.sisa) teks.textContent = `${h.sisa} kiriman menunggu: masuk lagi dengan tautanmu supaya terkirim`;
      else await segarkan();
      if (h.terkirim) selesai(h);
      return h;
    };
    tombol.addEventListener("click", () => { pesanBuang = ""; tombol.disabled = true; coba().finally(() => { tombol.disabled = false; }); });
    g.addEventListener("online", coba);
    d.addEventListener("visibilitychange", () => { if (d.visibilityState === "visible") coba(); });
    setInterval(() => { if (g.navigator.onLine !== false) coba(); }, 30000);
    segarkan(); coba();
    return segarkan;
  }

  g.Antre = { buat, penyimpanan, pengirim, pasang };
})(globalThis);
