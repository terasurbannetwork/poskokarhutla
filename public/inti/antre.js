/* Antrean kiriman luring bersama (KP-09, D5): skrip klasik tanpa inline (CSP), global window.PbAntre. Juga dimuat node untuk uji
   (tests/inti/antre.test.mjs lewat import, pola tests/warga/antre.test.mjs). Satu basis data IndexedDB `pb-antre`:
   store `butir` (kunci klien_id, indeks saluran) dan `blob` (media dua tahap). Satu-satunya berkas yang boleh memanggil indexedDB.open (gerbang keterpaduan).
   Aturan kirim (ALGORITMA 2): terlama dulu per saluran, satu proses sekaligus; 0/408/429/5xx berhenti dan mundur 60 dtk x 2^(n-1) maks 30 menit +-20%;
   401/403 berhenti dan butir tetap; 409 ber-keadaan = "berubah", tak dikirim ulang otomatis; 4xx lain = ditolak dan ditahan dengan alasan; 413 pada gugus = dibelah dua.
   Header (kode akses) dibaca saat kirim lewat opsi.header(), tidak pernah disimpan di butir. Saluran `rahasia` (vektor wajah) tidak pernah menyentuh localStorage. */
(g => {
  "use strict";
  const MENIT = 60000, HARI = 86400000, PLAFON = 30 * MENIT, TIMEOUT = 15000;

  /* ---- inti murni ---- */
  const kelas = (s, j) => s >= 200 && s < 300 ? "ok" : s === 401 || s === 403 ? "masuk" : s === 409 && j && j.keadaan ? "berubah"
    : s === 0 || s === 408 || s === 429 || s >= 500 ? "ulang" : "tolak";
  const jeda = (n, r = 0.5) => Math.min(PLAFON, MENIT * 2 ** (n - 1) * (1 + (r * 2 - 1) * 0.2));   // plafon berlaku sesudah jitter (ALGORITMA 2)
  const teksAman = x => String(x).slice(0, 200);
  const DILARANG = new Set(["x-kode", "x-lacak", "kode", "sesi", "session", "token", "authorization"]);
  const LAMA = new Set(["pb_lacak", "pb_instansi", "lp-antre", "pb_antre", "sippa-antre", "siklus-antre"]);
  const acakId = () => { const a = new Uint8Array(12); if (g.crypto && g.crypto.getRandomValues) g.crypto.getRandomValues(a); else for (let i = 0; i < 12; i++) a[i] = Math.random() * 256; return Array.from(a, x => x.toString(16).padStart(2, "0")).join(""); };
  const rupiahAngka = n => new Intl.NumberFormat("id-ID").format(n);

  /* ---- penyimpanan: semua(saluran), taruh(butir), hapus(id), taruhBlob(id,blob), ambilBlob(id), hapusBlob(id) ---- */
  function memori() {
    const b = new Map(), bl = new Map();
    return { semua: async s => [...b.values()].filter(x => x.saluran === s).map(x => structuredClone(x)), taruh: async x => { b.set(x.klien_id, structuredClone(x)); }, hapus: async id => { b.delete(id); bl.delete(id); }, hapusBanyak: async ids => { for (const id of ids) { b.delete(id); bl.delete(id); } },
      taruhBlob: async (id, v) => { bl.set(id, v); }, ambilBlob: async id => bl.get(id), hapusBlob: async id => { bl.delete(id); } };
  }
  /* cadangan teks saja: butir tanpa blob (blob ikut memori, hilang saat tab ditutup) */
  function lokal() {
    const m = memori(), K = "pb_antre2";
    const baca = () => { try { return JSON.parse(g.localStorage.getItem(K) || "{}"); } catch (e) { return {}; } };
    const tulis = o => { try { g.localStorage.setItem(K, JSON.stringify(o)); } catch (e) { throw new Error("penyimpanan penuh"); } };
    return { semua: async s => Object.values(baca()).filter(x => x.saluran === s), taruh: async x => { const o = baca(); o[x.klien_id] = x; tulis(o); },
      hapus: async id => { const o = baca(); delete o[id]; tulis(o); await m.hapus(id); },
      hapusBanyak: async ids => { const o = baca(); for (const id of ids) delete o[id]; tulis(o); await m.hapusBanyak(ids); }, taruhBlob: m.taruhBlob, ambilBlob: m.ambilBlob, hapusBlob: m.hapusBlob };
  }
  function idb() {
    let buka;
    const db = () => buka || (buka = new Promise((ok, gagal) => {
      if (!g.indexedDB) return gagal(new Error("tanpa indexedDB"));
      const r = g.indexedDB.open("pb-antre", 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("butir", { keyPath: "klien_id" }).createIndex("saluran", "saluran"); d.createObjectStore("blob", { keyPath: "klien_id" }); };
      r.onsuccess = () => ok(r.result); r.onerror = r.onblocked = () => { buka = null; gagal(r.error || new Error("gagal buka")); };
    }));
    const op = (toko, mode, f) => db().then(d => new Promise((ok, gagal) => { const t = d.transaction(toko, mode); let q; t.oncomplete = () => ok(q && q.result); t.onerror = t.onabort = () => gagal(t.error); q = f(t); }));
    return { semua: s => op("butir", "readonly", t => t.objectStore("butir").index("saluran").getAll(s)).then(v => v || []),
      taruh: x => op("butir", "readwrite", t => t.objectStore("butir").put(x)),
      hapus: id => op(["butir", "blob"], "readwrite", t => { t.objectStore("butir").delete(id); t.objectStore("blob").delete(id); }),
      hapusBanyak: ids => op(["butir", "blob"], "readwrite", t => { for (const id of ids) { t.objectStore("butir").delete(id); t.objectStore("blob").delete(id); } }),
      taruhBlob: (id, v) => op("blob", "readwrite", t => t.objectStore("blob").put({ klien_id: id, blob: v })),
      ambilBlob: id => op("blob", "readonly", t => t.objectStore("blob").get(id)).then(v => v && v.blob),
      hapusBlob: id => op("blob", "readwrite", t => t.objectStore("blob").delete(id)) };
  }
  /* IndexedDB dulu; bila gagal: localStorage (teks saja), atau memori bila rahasia. ponytail: butir di IndexedDB tak ikut terbaca sesudah beralih */
  function berlapis(rahasia) {
    const utama = idb(), cadangan = rahasia ? memori() : lokal(); let gagal = false;
    const p = n => async (...a) => { if (!gagal) { try { return await utama[n](...a); } catch (e) { gagal = true; } } return cadangan[n](...a); };
    return { get cadangan() { return gagal; }, semua: p("semua"), taruh: p("taruh"), hapus: p("hapus"), hapusBanyak: p("hapusBanyak"), taruhBlob: p("taruhBlob"), ambilBlob: p("ambilBlob"), hapusBlob: p("hapusBlob") };
  }

  /* ---- saluran ---- */
  const kabar = new Set(), registri = new Map();
  const beri = () => kabar.forEach(f => { try { f(); } catch (e) { /* pendengar rusak tak boleh menghentikan antrean */ } });

  /* satu pemicu untuk semua saluran: kirim berurutan, hanya saat tab terlihat */
  const otomatis = new Set(); let terpasang = false;
  const semuaOtomatis = async () => { if (g.navigator && g.navigator.onLine === false) return; for (const s of otomatis) await s._otomatis(); };
  function pasangPemicu(rand) {
    if (terpasang) return; terpasang = true;
    g.addEventListener("online", semuaOtomatis);
    g.document.addEventListener("visibilitychange", () => { if (g.document.visibilityState === "visible") semuaOtomatis(); });
    setInterval(() => { if (g.document.visibilityState === "visible") semuaOtomatis(); }, 30000 + Math.floor(rand() * 30000));
  }

  function saluran(nama, o = {}) {
    const rahasia = !!o.rahasia, umur = o.umurMs || (rahasia ? 36 * 3600000 : 14 * HARI);
    const sekarang = o.sekarang || Date.now, acak = o.acak || acakId, rand = o.rand || Math.random;
    const simpan = o.simpan || berlapis(rahasia), langsung = o.langsung ?? !!g.document;
    let batas = o.batch || 1, jalan = null, coba = 0, tunda = 0, perluMasuk = false;

    const bersihkan = async () => {
      const basi = (await simpan.semua(nama)).filter(x => sekarang() - x.dibuat > umur).map(x => x.klien_id);
      if (basi.length) await simpan.hapusBanyak(basi);
    };
    const urut = async () => (await simpan.semua(nama)).sort((a, b) => a.dibuat - b.dibuat || (a.klien_id < b.klien_id ? -1 : 1));
    const tanda = async () => (await urut()).map(x => x.klien_id + x.status).join();
    const tandai = async (x, status, alasan) => { x.status = status; x.alasan = teksAman(alasan); x.ada_blob = false; await simpan.taruh(x); await simpan.hapusBlob(x.klien_id); };
    const alasanDari = (s, j) => teksAman((j && (j.galat || j.pesan)) || `ditolak server (${s})`);

    const post = async (url, body, tipe, h) => {
      const ac = g.AbortController ? new g.AbortController() : null, t = ac && setTimeout(() => ac.abort(), TIMEOUT);
      try { const r = await g.fetch(url, { method: "POST", headers: { "content-type": tipe, ...h }, body, signal: ac && ac.signal }); return { s: r.status, j: await r.json().catch(() => ({})) }; }
      finally { if (t) clearTimeout(t); }
    };
    const kirimGugus = async gugus => {
      const h = o.header ? o.header() : {};
      const badan = gugus.map(x => ({ ...x.data, klien_id: x.klien_id, waktu_klien: x.dibuat, ...(x.media_id ? { media_id: x.media_id } : {}) }));
      try { return o.kirim ? await o.kirim(badan, h) : await post(o.url, JSON.stringify(badan.length === 1 ? badan[0] : { butir: badan }), "application/json", h); }
      catch (e) { return { s: 0, j: {} }; }
    };
    const unggah = async x => {
      const blob = await simpan.ambilBlob(x.klien_id); if (blob === undefined) { x.ada_blob = false; await simpan.taruh(x); return { s: 200 }; }
      let r; try { r = await post(o.media.url, blob, blob.type || "application/octet-stream", o.header ? o.header() : {}); } catch (e) { r = { s: 0, j: {} }; }
      if (kelas(r.s, r.j) === "ok" && r.j && r.j.media_id) { x.media_id = r.j.media_id; x.ada_blob = false; await simpan.taruh(x); await simpan.hapusBlob(x.klien_id); return { s: 200 }; }
      return r.s >= 200 && r.s < 300 ? { s: 500, j: {} } : r;
    };
    /* hasil: "lanjut" | "henti". Gugus dibelah dua bila 413 (atau ditolak sebagian: butir beracun tak boleh menahan gugus). */
    const proses = async gugus => {
      const r = await kirimGugus(gugus), k = kelas(r.s, r.j);
      if (k === "ok") { for (const x of gugus) await simpan.hapus(x.klien_id); coba = 0; tunda = 0; return "lanjut"; }
      if (k === "ulang") { coba++; tunda = sekarang() + jeda(coba, rand()); return "henti"; }
      if (k === "masuk") { perluMasuk = true; if (o.masukUlang) o.masukUlang(r.s); return "henti"; }
      if (gugus.length > 1) { const t = gugus.length >> 1; batas = Math.min(batas, t); return (await proses(gugus.slice(0, t))) === "lanjut" ? proses(gugus.slice(t)) : "henti"; }
      await tandai(gugus[0], k === "berubah" ? "berubah" : "ditolak", k === "berubah" ? String(r.j.keadaan) : alasanDari(r.s, r.j));
      return "lanjut";
    };
    async function putar(paksa) {
      await bersihkan();
      if (!paksa && sekarang() < tunda) return;
      perluMasuk = false;
      for (;;) {
        const sisa = (await urut()).filter(x => x.status === "menunggu"); if (!sisa.length) break;
        const gugus = [];
        for (const x of sisa) {
          if (gugus.length >= batas) break;
          if (x.ada_blob) { const r = await unggah(x), k = kelas(r.s, r.j);
            if (k === "ok") { } else if (k === "tolak" || k === "berubah") { await tandai(x, "ditolak", alasanDari(r.s, r.j)); continue; }
            else { if (k === "ulang") { coba++; tunda = sekarang() + jeda(coba, rand()); } else { perluMasuk = true; if (o.masukUlang) o.masukUlang(r.s); } beri(); return; } }
          gugus.push(x);
        }
        if (gugus.length && (await proses(gugus)) === "henti") break;
      }
    }
    const kirimSekarang = (otomatis) => {
      if (jalan) return jalan;
      jalan = (async () => { const a = await tanda(); await putar(!otomatis).catch(() => {}); if (a !== await tanda()) beri(); })().finally(() => { jalan = null; });
      return jalan;
    };
    const masukkan = async ({ klien_id, data, berkas, dibuat }) => {
      const salah = Object.keys(data || {}).find(k => DILARANG.has(k.toLowerCase()));
      if (salah) throw new Error(`data butir memuat kunci rahasia "${salah}": kode akses dibaca saat kirim lewat opsi.header, bukan disimpan`);
      const x = { klien_id: klien_id || acak(), saluran: nama, data, dibuat: dibuat || sekarang(), status: "menunggu", ada_blob: !!(berkas && o.media), coba: 0 };
      if (x.ada_blob) await simpan.taruhBlob(x.klien_id, berkas);
      await simpan.taruh(x); beri(); return x.klien_id;
    };
    const s = {
      nama, rahasia, masukkan, kirimSekarang: () => kirimSekarang(false), daftar: async () => { await bersihkan(); return urut(); },
      buang: async id => { await simpan.hapus(id); beri(); }, menunggu: async () => (await simpan.semua(nama)).length,
      get perluMasuk() { return perluMasuk; }, get tundaSampai() { return tunda; }, get cadangan() { return !!simpan.cadangan; }, kedaluwarsa: t => sekarang() - t > umur, _otomatis: () => kirimSekarang(true),
      tambah: async (data, berkas) => { const id = await masukkan({ data, berkas }); if (langsung) kirimSekarang(true); return id; },
    };
    if (g.document && o.pemicu !== false) { otomatis.add(s); pasangPemicu(rand); }
    registri.set(nama, s);
    return s;
  }

  /* ---- pindah dari IndexedDB lama (T7): basis lama dihapus HANYA sesudah semua butir terbaca ulang dari saluran baru ---- */
  async function pindahDari({ db, store, petakan, ke, lama }) {
    if (!lama || db !== undefined) { if (!LAMA.has(db)) throw new Error(`basis lama "${db}" tidak dikenal: hanya ${[...LAMA].join(", ")}`); }
    await ke.daftar();   // membaca dulu supaya penyimpanan yang rusak ketahuan sebelum menulis
    if (ke.cadangan) throw new Error("saluran tujuan memakai penyimpanan cadangan: basis lama dibiarkan");
    const L = lama || { semua: () => new Promise((ok, gagal) => { const r = g.indexedDB.open(db); r.onerror = () => gagal(r.error);
      r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(store)) { d.close(); return ok([]); } const q = d.transaction(store).objectStore(store).getAll(); q.onsuccess = () => { d.close(); ok(q.result); }; q.onerror = () => { d.close(); gagal(q.error); }; }; }),
      hapus: () => new Promise((ok, gagal) => { const r = g.indexedDB.deleteDatabase(db); r.onsuccess = () => ok(); r.onerror = r.onblocked = () => gagal(r.error || new Error("basis lama terkunci")); }) };
    const butir = (await L.semua()).map(petakan).filter(b => !(b.dibuat !== undefined && ke.kedaluwarsa(b.dibuat)));
    for (const b of butir) await ke.masukkan(b);
    const ada = new Set((await ke.daftar()).map(x => x.klien_id));
    if (ke.cadangan || !butir.every(b => ada.has(b.klien_id))) throw new Error("butir belum tertulis semua");
    await L.hapus();
    return butir.length;
  }

  /* ---- pita bersama ---- */
  const IKON = { kirim: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    daftar: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    buang: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>' };
  const KEADAAN = { menunggu: "Menunggu", ditolak: "Ditolak", berubah: "Keadaan berubah" };
  const waktuId = ms => new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ringkas = d => Object.values(d || {}).filter(v => typeof v === "string" || typeof v === "number").slice(0, 3).join(", ").slice(0, 80);

  function pasangPita(el) {
    const d = g.document, pita = d.createElement("div"), teks = d.createElement("span"), kirim = d.createElement("button"), buka = d.createElement("button"), daftar = d.createElement("div");
    pita.className = "antre-pita"; pita.hidden = true; pita.setAttribute("role", "status"); daftar.className = "antre-daftar"; daftar.hidden = true;
    for (const [b, k, label] of [[kirim, "kirim", "Kirim sekarang"], [buka, "daftar", "Lihat daftar belum terkirim"]]) { b.type = "button"; b.className = "antre-ikon"; b.innerHTML = IKON[k]; b.title = b.ariaLabel = label; }
    pita.append(teks, kirim, buka); el.prepend(daftar); el.prepend(pita);
    const semua = async () => { const l = []; for (const s of registri.values()) for (const x of await s.daftar()) l.push({ s, x }); return l.sort((a, b) => a.x.dibuat - b.x.dibuat); };
    let tunggu = false, sig = null, jadwal = false;
    const segarkan = async () => {
      if (tunggu) return; tunggu = true;
      try {
        const l = await semua(); pita.hidden = !l.length; teks.textContent = `Belum terkirim: ${rupiahAngka(l.length)}`;
        pita.classList.toggle("antre-galat", l.some(({ x }) => x.status !== "menunggu"));
        if (!l.length) daftar.hidden = true;
        const baru = l.map(({ x }) => x.klien_id + "|" + x.status).join();
        if (!daftar.hidden && baru !== sig) {
          sig = baru;
          const t = d.createElement("table"), kep = t.createTHead().insertRow(); for (const k of ["Isi", "Waktu", "Keadaan", "Alasan", ""]) { const th = d.createElement("th"); th.scope = "col"; th.textContent = k; kep.append(th); }
          const tb = t.createTBody();
          for (const { s, x } of l) { const r = tb.insertRow(); r.insertCell().textContent = ringkas(x.data); r.insertCell().textContent = waktuId(x.dibuat);
            r.insertCell().textContent = KEADAAN[x.status] || x.status; r.insertCell().textContent = x.alasan || "";
            const b = d.createElement("button"); b.type = "button"; b.className = "antre-ikon"; b.innerHTML = IKON.buang; b.title = b.ariaLabel = "Buang butir ini"; b.dataset.id = x.klien_id; b.dataset.saluran = s.nama; r.insertCell().append(b); }
          daftar.replaceChildren(t);
        }
      } finally { tunggu = false; }
    };
    kirim.addEventListener("click", () => { kirim.disabled = true; Promise.all([...registri.values()].map(s => s.kirimSekarang())).finally(() => { kirim.disabled = false; segarkan(); }); });
    buka.addEventListener("click", () => { daftar.hidden = !daftar.hidden; sig = null; segarkan(); });
    daftar.addEventListener("click", e => { const b = e.target.closest && e.target.closest("button[data-id]"); if (b) { b.closest("tr").remove(); sig = sig && sig.split(",").filter(t => t.split("|")[0] !== b.dataset.id).join(); registri.get(b.dataset.saluran).buang(b.dataset.id); } });
    const tunda = () => { if (!jadwal) { jadwal = true; setTimeout(() => { jadwal = false; segarkan(); }, 0); } };
    kabar.add(tunda); segarkan();
    return segarkan;
  }

  /* untuk blokir keluar akun selama masih ada butir (pola pipa/antre.js) */
  const menungguSemua = async () => { let n = 0; for (const s of registri.values()) n += await s.menunggu(); return n; };

  g.PbAntre = { saluran, pindahDari, pasangPita, menungguSemua, kelas, jeda, memori, dengar: f => { kabar.add(f); return () => kabar.delete(f); }, _registri: registri };
})(globalThis);
