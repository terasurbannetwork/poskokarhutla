"use strict";
/* ================================================================ kepala kartu gempa */
/* Kepala kartu = NAMA SEKSI berikon (AGENTS.md 3.5, pembaruan 11 Nov 2026), sama dengan kepalaKartu di /cuaca dan /udara.
   Kartu gempa dibuat banyak berkas (insight, tren, dampak, berita, bukti, inatews, tsunami_zona, beruntun) lewat Kartu.ex/Kartu.kartu
   dari public/inti; supaya tidak menyunting tiap pembuat, kepala dirapikan di DOM saat kartu masuk halaman (MutationObserver,
   berjalan sebelum layar dilukis, jadi tidak ada kedip):
   - nama seksi (isi pil .ex-ey) jadi judul h3 dengan ikon sebaris; pil dibuang (kartu Peluang gaya B: ubin ikon dibuang, pil tingkat tetap);
   - kalimat temuan lama dan "Sumber: ..." di kaki tidak tampil, tetapi tetap terbaca sebagai title judul (angka dan sumber tidak hilang);
   - legenda di kaki tetap. Idempoten (data-kp). Tanpa pil nama seksi, kartu dibiarkan apa adanya. */
const KepalaGempa = (() => {
  const P = {
    gempa: '<path d="M2 12h4l2-5 3 10 3-12 2 7h6"/>', daftar: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    rasa: '<path d="M3 12a9 9 0 0 1 18 0"/><path d="M7 12a5 5 0 0 1 10 0"/><circle cx="12" cy="12" r="1.5"/><path d="M12 14v7"/>',
    susulan: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5"/>',
    peluang: '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/>', peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    riwayat: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>', tsunami: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2"/>',
    laut: '<path d="M12 3v9M8 7l4-4 4 4"/><path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3-2 5-1.5"/>', sesar: '<path d="M4 20 10 4M14 20l6-16"/><path d="M7 12h10"/>',
    guncang: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', pesisir: '<path d="M3 15c3-2 6-2 9 0s6 2 9 0"/><path d="M3 20c3-2 6-2 9 0s6 2 9 0"/><path d="M12 11V4l5 3-5 3"/>',
    jalur: '<path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-5h6v5"/><path d="M4 4l16 16"/>', fasilitas: '<path d="M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5"/>',
    cerita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', gunung: '<path d="m3 20 6-11 4 6 2-3 6 8z"/><path d="M11 6l1-3 1 3"/>',
    beruntun: '<path d="M2 12h3l2-4 2 8 2-6 2 4h2l2-5 2 7 2-4h1"/>', bulan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    tahun: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', dalam: '<path d="M12 3v14M7 12l5 5 5-5"/><path d="M4 21h16"/>',
    risiko: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 12 18 6"/><circle cx="12" cy="12" r="1.5"/>', rusak: '<path d="M4 21V9l8-6 8 6v12"/><path d="m10 9 2 4-2 3 2 5"/>',
    berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', sorot: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    topik: '<path d="M20 12 12 20 3 11V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    orang: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    sinyal: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>'};
  const NAMA = {"Katalog BMKG": "daftar", "Tsunami per zona": "tsunami", "Muka laut terkini": "laut", "Gempa terkini": "gempa", "Dirasakan": "rasa", "Susulan": "susulan",
    "Peluang": "peluang", "Paling sering diguncang": "peta", "Riwayat sejak 1900": "riwayat", "Status tsunami BMKG": "tsunami", "Di atas sesar aktif": "sesar",
    "Zona guncangan tinggi": "guncang", "Pesisir rendah": "pesisir", "Tanpa jalur evakuasi": "jalur", "Genangan skenario BNPB": "tsunami", "Fasilitas rawan": "fasilitas",
    "Cerita": "cerita", "Kajian MAGMA": "gunung", "Gempa beruntun": "beruntun", "Per bulan": "bulan", "Per tahun": "tahun", "Kedalaman": "dalam",
    "Indeks risiko riwayat": "risiko", "Gempa merusak": "rusak", "Volume berita": "berita", "Sorotan": "sorot", "Topik": "topik", "Daftar berita": "berita",
    "Penduduk nasional": "orang", "Penduduk per provinsi": "orang", "Gempa terbesar 7 hari": "guncang", "Akses komunikasi": "sinyal", "Kejadian gempa": "daftar"};
  const svg = nama => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[NAMA[nama]] || P.gempa}</svg>`;
  const bersih = t => String(t || "").replace(/\s+/g, " ").trim();
  function rapikan(ex) {
    if (ex.dataset.kp) return; const hd = ex.querySelector(":scope > .ex-hd"), ey = hd?.querySelector(".ex-ey"), h3 = hd?.querySelector("h3");
    if (!ey || !h3) return; const nama = bersih(ey.textContent); if (!nama) return;   /* kartu masih memuat: pil kosong, dirapikan saat isi datang */
    ex.dataset.kp = 1;
    const ft = ex.querySelector(":scope > .ex-ft"), em = ft && [...ft.querySelectorAll(":scope > em")].find(e => /^Sumber:/.test(bersih(e.textContent)));
    const lama = bersih(h3.textContent), ket = [lama && lama !== nama ? lama.replace(/[.\s]*$/, ".") : "", em ? bersih(em.textContent) : ""].filter(Boolean).join(" ");
    hd.querySelector(":scope > .ex-ik")?.remove();   /* kartu gaya B (Peluang): ubin ikon besar dibuang, ikon sebaris seperti kartu lain */
    const isi = ey.innerHTML, ik = ey.querySelector("svg") ? "" : svg(nama);
    h3.innerHTML = ik + isi; if (ket) h3.title = ket;
    const pl = hd.querySelector(".ex-pl"); if (pl?.querySelector(".ex-tk")) ey.remove(); else (pl || ey).remove();   /* baris pil kosong tidak menyisakan jarak */
    em?.remove(); }
  const sapu = root => { if (root.matches?.(".ex")) rapikan(root); root.querySelectorAll?.(".ex").forEach(rapikan); };
  function pasang() {
    const main = document.querySelector("main"); if (!main) return; sapu(main);
    new MutationObserver(M => { for (const m of M) { m.addedNodes.forEach(n => n.nodeType === 1 && sapu(n));
      const ex = m.target.closest?.(".ex"); if (ex && !ex.dataset.kp) rapikan(ex); } })
      .observe(main, {childList: true, subtree: true}); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang); else pasang();
  return {rapikan, svg, P};
})();
