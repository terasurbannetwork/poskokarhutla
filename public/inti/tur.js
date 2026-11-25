/* Mesin tur aplikasi bersama untuk semua laman bencana (pemilik 24 Nov 2026: "tambahin tombol untuk mulai tour",
   "ada pilihan di awal: tour singkat, tour lengkap", "interaksi2 seperti ketika klik x muncul sidebar dll nya juga dibahas",
   "buat untuk semua laman bencana").
   Laman memanggil Tur.pasang({...}) dengan daftar langkahnya; tombol #turBuka di kepala membuka layar sambutan.
   Langkah: {sel, judul, isi, keadaan?}. `keadaan` = nama keadaan layar yang disiapkan sebelum langkah tampil
   (mis. "laci": buka rincian cluster). Tiap fungsi keadaan membangun keadaannya dari keadaan awal, jadi maju dan mundur
   cukup: pulihkan() lalu jalankan keadaan langkah tujuan. Selesai atau keluar selalu memulihkan layar.
   Langkah juga boleh {peraga: teks} (keterangan peragaan) dan {fokus: false}. Elemen yang tidak tampak dilewati. Warna hanya dari token tema (inti/tema.css). Tanpa dialog modal di peragaan:
   lapisan atas (top layer) dialog akan menutupi tur. */
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };
  const tampak = sel => { if (!sel) return null; const e = typeof sel === "string" ? $(sel) : sel; if (!e) return null; const r = e.getBoundingClientRect();
    if (e.checkVisibility && !e.checkVisibility({visibilityProperty: true})) return null;
    if (r.right <= 0 || r.left >= innerWidth) return null;   // terdorong ke luar layar (mis. ikon kepala yang meluber di HP)
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" ? e : null; };
  // dialog modal ada di lapisan atas (top layer) dan menutupi tur; tutup yang terbuka (mis. sapaan otomatis yang muncul belakangan)
  const tutupModal = () => { for (const d of document.querySelectorAll("dialog[open]")) if (d.matches(":modal")) d.close(); };
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  const tunggu = async (sel, ms = 1500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = tampak(sel); if (e) return e; await jeda(80); } return null; };
  // elemen belum ada sama sekali (data kosong): menyerah cepat; ada tapi belum tampak: beri waktu render
  const klik = async sel => { const e = await tunggu(sel, $(sel) ? 1500 : 400); e?.click(); return e; };
  const IK = {
    kilat: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    centang: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
    panah: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    titik: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
    lapis: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    dok: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    wilayah: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    grafik: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    tangan: '<path d="M9 11V5a1.5 1.5 0 0 1 3 0v5m0-1a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.4-1.8L9 15"/>',
  };
  const svg = (k, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k] || IK.titik}</svg>`;

  const css = `
.tr-tur{position:fixed;inset:0;z-index:9000;font-family:var(--font)}
/* performa (pemilik 24 Nov 2026 "kotak highlight oren itu ketika pindah2 masih ngelag"): layar gelap = 4 panel warna polos
   seukuran layar yang hanya digeser/direntang lewat transform (dikerjakan kompositor, tanpa tata letak, tanpa lapisan raksasa,
   tanpa backdrop-filter yang memaksa peta WebGL disaring ulang tiap frame). Panel atas dan bawah diperkecil (scaleX)
   selebar sorotan, jadi tidak ada tumpang tindih yang menggandakan gelap. Cincin oranye elemen kecil terpisah. */
.tr-gelap{position:fixed;left:0;top:0;width:100vw;height:100vh;transform-origin:0 0;pointer-events:none;background:color-mix(in oklab,var(--head-bg) 72%,transparent)}
/* panel atas/bawah selebar layar lalu diperkecil (scaleX <= 1): merentang elemen 1px ratusan kali meninggalkan celah gambar di Chrome */
/* cincin oranye = 4 garis yang juga hanya transform: width/height di thread utama tertinggal dari panel gelap saat peta sibuk
   menggambar (itulah yang terasa "ngelag"); kini semua bagian sorotan bergerak di kompositor, selalu serempak */
.tr-lubang{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none}
.tr-garis{position:fixed;left:0;top:0;width:100vw;height:3px;transform-origin:0 0;pointer-events:none;background:var(--brand-accent);transition:opacity .2s}
.tr-garis.tegak{width:3px;height:100vh}
.tr-lubang.kosong .tr-garis{opacity:0}
.tr-kartu{position:fixed;left:0;top:0;will-change:transform;width:min(400px,calc(100vw - 16px));border-radius:18px;background:var(--card);color:var(--ink);box-shadow:var(--shadow-lg);overflow:hidden}
.tr-kartu.lebar{width:min(560px,calc(100vw - 16px))}
.tr-tur [hidden]{display:none!important}
.tr-tur button{font-family:var(--font)}
.tr-tur button:focus-visible{outline:2px solid var(--brand-accent);outline-offset:2px}
/* sambutan */
.tr-hero{position:relative;padding:22px 24px 20px;color:var(--on-head);background:linear-gradient(160deg,color-mix(in oklab,var(--head-bg) 55%,transparent),color-mix(in oklab,var(--head-bg) 96%,transparent) 70%),var(--tr-foto) center/cover,var(--head-bg)}
.tr-logo{display:flex;align-items:center;gap:8px;margin-bottom:18px}
.tr-logo img{width:34px;height:34px;padding:4px;border-radius:10px;background:var(--on-head);object-fit:contain}
.tr-logo span{margin-left:4px;padding:3px 10px;border-radius:var(--r-pill);font:700 var(--fs-1)/1.6 var(--font);letter-spacing:.06em;text-transform:uppercase;color:var(--head-bg);background:var(--head-hl)}
.tr-hero h2{margin:0;font:800 clamp(1.375rem,3.6vw,1.75rem)/1.2 var(--display);letter-spacing:-.015em}
.tr-hero p{margin:8px 0 0;font-size:var(--fs-4);line-height:1.55;color:var(--on-head-2);max-width:44ch}
.tr-kredit{position:absolute;right:10px;bottom:6px;font-size:9.5px;color:var(--on-head-2);opacity:.75}
.tr-badan{padding:18px 24px 6px}
.tr-sorot{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 18px;padding:0;list-style:none}
.tr-sorot li{display:grid;gap:6px;padding:10px;border-radius:12px;background:var(--surface);font-size:var(--fs-2);line-height:1.35;color:var(--ink2)}
.tr-sorot li b{display:block;font-size:var(--fs-3);color:var(--ink)}
.tr-sorot svg{width:20px;height:20px;color:var(--brand2)}
.tr-label{margin:0 0 8px;font:800 10.5px var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
.tr-opsi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tr-opsi{position:relative;display:grid;align-content:start;gap:4px;text-align:left;padding:14px;border:1.5px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);cursor:pointer;transition:border-color var(--dur-2),translate var(--dur-2),box-shadow var(--dur-2)}
.tr-opsi:hover{border-color:var(--brand2);translate:0 -2px;box-shadow:var(--shadow)}
.tr-opsi .tr-ik{display:grid;place-items:center;width:38px;height:38px;margin-bottom:6px;border-radius:11px;background:color-mix(in oklab,var(--brand2) 14%,transparent);color:var(--brand2)}
.tr-opsi .tr-ik svg{width:20px;height:20px}
.tr-opsi b{font:800 var(--fs-5) var(--display)}
.tr-opsi small{font:700 var(--fs-2) var(--font);color:var(--brand2)}
.tr-opsi span.tr-ket{font-size:var(--fs-3);line-height:1.45;color:var(--ink2)}
.tr-opsi .tr-pil{position:absolute;top:12px;right:12px;padding:2px 8px;border-radius:var(--r-pill);font:700 var(--fs-1)/1.6 var(--font);color:var(--on-brand);background:var(--brand2)}
.tr-catat{margin:12px 0 0;font-size:var(--fs-2);color:var(--ink2)}
#turBuka.tr-tunjuk{animation:tr-tunjuk 1s ease-in-out 3;border-radius:10px}
@keyframes tr-tunjuk{50%{box-shadow:0 0 0 3px var(--brand-accent),0 0 0 8px color-mix(in oklab,var(--brand-accent) 30%,transparent)}}
.tr-kaki{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 24px 16px}
.tr-kbd{font-size:var(--fs-2);color:var(--ink2)}
.tr-kbd kbd{display:inline-block;min-width:20px;margin:0 2px;padding:1px 5px;border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;font:600 var(--fs-1) var(--font);text-align:center;color:var(--ink)}
/* langkah */
.tr-bar{height:4px;background:var(--surface)}
.tr-bar i{display:block;height:100%;width:0;background:var(--brand-accent);transition:width .35s var(--ease)}
.tr-langkah{padding:16px 20px 14px}
.tr-ke{display:flex;align-items:center;gap:8px;margin:0;font:700 var(--fs-2) var(--font);color:var(--brand2)}
.tr-ke .tr-mode{padding:1px 8px;border-radius:var(--r-pill);background:color-mix(in oklab,var(--brand2) 12%,transparent)}
.tr-langkah h2{margin:8px 0 0;font:800 var(--fs-6)/1.3 var(--display)}
.tr-isi{margin:8px 0 0;font-size:var(--fs-3);line-height:1.6;color:var(--ink2);text-align:justify}
.tr-peraga{display:flex;align-items:center;gap:8px;margin:10px 0 0;padding:8px 10px;border-radius:10px;font-size:var(--fs-2);line-height:1.4;color:var(--ink);background:color-mix(in oklab,var(--brand-accent) 16%,transparent)}
.tr-peraga svg{flex:none;width:18px;height:18px;color:var(--brand-accent)}
.tr-aksi{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px}
.tr-aksi>div{display:flex;gap:8px}
.tr-btn{min-height:36px;padding:0 16px;border-radius:10px;font:700 var(--fs-3) var(--font);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.tr-btn svg{width:16px;height:16px}
.tr-maju{border:0;background:var(--brand2);color:var(--on-brand)}
.tr-maju:hover{filter:brightness(1.1)}
.tr-mundur{border:1px solid var(--line);background:var(--card);color:var(--ink)}
.tr-lewat{border:0;background:none;padding:6px 4px;font:600 var(--fs-3) var(--font);color:var(--ink2);cursor:pointer}
.tr-lewat:hover{color:var(--ink)}
.tr-sibuk .tr-langkah{opacity:.55}
/* selesai */
.tr-akhir{padding:26px 24px 18px;text-align:center}
.tr-akhir .tr-cek{display:grid;place-items:center;width:56px;height:56px;margin:0 auto 12px;border-radius:50%;color:var(--on-pekat);background:var(--ok)}
.tr-akhir .tr-cek svg{width:30px;height:30px}
.tr-akhir h2{margin:0;font:800 var(--fs-7)/1.25 var(--display)}
.tr-akhir p{margin:8px auto 0;max-width:38ch;font-size:var(--fs-3);line-height:1.55;color:var(--ink2)}
.tr-akhir .tr-aksi{justify-content:center;margin-top:18px}
.tr-kartu{max-height:calc(100dvh - 16px);overflow:auto;overscroll-behavior:contain}
/* HP: sambutan muat satu layar (pilihan tur dan Nanti saja terlihat tanpa gulir) */
@media (max-width:560px){.tr-sorot{display:none}.tr-opsi-grid{grid-template-columns:1fr}.tr-opsi{padding:12px}.tr-opsi .tr-ik{width:32px;height:32px;margin-bottom:2px}
  .tr-kbd{display:none}.tr-hero{padding:16px 18px}.tr-logo{margin-bottom:12px}.tr-hero p{font-size:var(--fs-3)}.tr-badan,.tr-kaki{padding-left:18px;padding-right:18px}.tr-badan{padding-top:14px}}
@media (prefers-reduced-motion:no-preference){
  .tr-gelap.gerak{transition:transform .26s var(--ease)}
  .tr-lubang.gerak .tr-garis{transition:transform .26s var(--ease),opacity .2s}
  .tr-kartu.gerak{transition:transform .26s var(--ease)}
  .tr-masuk{animation:tr-masuk .35s var(--ease)}
  @keyframes tr-masuk{from{opacity:0;scale:.96}}
  /* denyut peragaan: garis cincin berkedip (opacity saja, dikerjakan kompositor) */
  .tr-lubang.denyut .tr-garis{animation:tr-denyut .7s ease-in-out .3s 3}
  @keyframes tr-denyut{50%{opacity:.25}}
}`;

  let K = null;   // konfigurasi laman dari Tur.pasang

  function mulai(otomatis) {
    otomatis = otomatis === true;   // dari klik tombol: argumen berupa event
    tandai();   // dibuka sendiri lewat tombol juga dihitung sudah disambut
    if (!K || $(".tr-tur")) return;
    if (!$("#trGaya")) { const s = el("style"); s.id = "trGaya"; s.textContent = css; document.head.append(s); }
    const w = el("div", "tr-tur"), lubang = el("div", "tr-lubang kosong");
    const garis = ["", "", "tegak", "tegak"].map(c => el("div", `tr-garis ${c}`)); lubang.append(...garis);   // atas, bawah, kiri, kanan
    const gelap = [0, 1, 2, 3].map(() => el("div", "tr-gelap"));   // kiri, kanan, atas, bawah
    const k = el("div", "tr-kartu"); k.setAttribute("role", "dialog"); k.setAttribute("aria-modal", "true"); k.setAttribute("aria-labelledby", "trJudul");
    w.append(...gelap, lubang, k); document.body.append(w);
    const asal = document.activeElement;
    let langkah = [], N = 0, i = 0, mode = "", sasaran = null, keadaan = null, sibuk = false, tutup = false, lepasGerak = 0; const gagal = new Set();

    // posisi dihitung paling banyak sekali per frame (scroll dan resize bisa beruntun)
    let antre = 0; const tataNanti = () => { if (!antre) antre = requestAnimationFrame(() => { antre = 0; tata(); }); };
    const tata = () => {
      if (tutup) return;
      const vw = innerWidth, vh = innerHeight, pad = 6, r = sasaran?.isConnected ? sasaran.getBoundingClientRect() : null;
      // dibulatkan ke piksel utuh: tepi panel gelap bertemu tanpa garis celah
      const x = Math.round(r ? Math.max(0, r.left - pad) : vw / 2), y = Math.round(r ? Math.max(0, r.top - pad) : vh / 2);
      const rw = r ? Math.round(Math.min(r.width + pad * 2, vw - x)) : 0, rh = r ? Math.round(Math.min(r.height + pad * 2, vh - y)) : 0;
      lubang.classList.toggle("kosong", !r);
      lubang.dataset.kotak = `${x},${y},${rw},${rh}`;   // dibaca uji QA
      const tb = 3;
      garis[0].style.transform = `translate3d(${x - tb}px,${y - tb}px,0) scaleX(${(rw + tb * 2) / vw})`;
      garis[1].style.transform = `translate3d(${x - tb}px,${y + rh}px,0) scaleX(${(rw + tb * 2) / vw})`;
      garis[2].style.transform = `translate3d(${x - tb}px,${y}px,0) scaleY(${rh / vh})`;
      garis[3].style.transform = `translate3d(${x + rw}px,${y}px,0) scaleY(${rh / vh})`;
      gelap[0].style.transform = `translate3d(${x - vw}px,0,0)`;
      gelap[1].style.transform = `translate3d(${x + rw}px,0,0)`;
      gelap[2].style.transform = `translate3d(${x}px,${y - vh}px,0) scaleX(${rw / vw})`;
      gelap[3].style.transform = `translate3d(${x}px,${y + rh}px,0) scaleX(${rw / vw})`;
      // kartu tidak menutupi sasaran: bawah, atas, kanan, kiri; bila tak ada yang muat, yang paling sedikit menimpa
      const kw = k.offsetWidth, kh = k.offsetHeight, jarak = 16, tepi = 8;
      const jepit = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
      let left, top;
      if (!r) { left = (vw - kw) / 2; top = Math.max(tepi, (vh - kh) / 2); }
      else {
        const tX = jepit(x + rw / 2 - kw / 2, tepi, vw - kw - tepi), tY = jepit(y + rh / 2 - kh / 2, tepi, vh - kh - tepi);
        const calon = [[tX, y + rh + jarak], [tX, y - jarak - kh], [x + rw + jarak, tY], [x - jarak - kw, tY]];
        const muat = ([l, t]) => l >= tepi && t >= tepi && l + kw <= vw - tepi && t + kh <= vh - tepi;
        const timpa = ([l, t]) => Math.max(0, Math.min(l + kw, x + rw) - Math.max(l, x)) * Math.max(0, Math.min(t + kh, y + rh) - Math.max(t, y));
        [left, top] = calon.find(muat) || calon.map(([l, t]) => [jepit(l, tepi, vw - kw - tepi), jepit(t, tepi, vh - kh - tepi)]).sort((a, b) => timpa(a) - timpa(b))[0];
      }
      k.style.transform = `translate3d(${Math.round(left)}px,${Math.round(top)}px,0)`;
    };
    const ganti = isi => { k.replaceChildren(...isi); k.classList.remove("tr-masuk"); void k.offsetWidth; k.classList.add("tr-masuk"); };
    const tombol = (cls, teks, ik) => { const b = el("button", `tr-btn ${cls}`); b.type = "button"; b.innerHTML = (ik === "kiri" ? svg("panah", "tr-balik") : "") + `<span></span>` + (ik === "kanan" ? svg("panah") : ""); b.querySelector("span").textContent = teks; return b; };
    const pulihkan = async () => { if (keadaan) { keadaan = null; try { await K.pulihkan?.(); } catch (e) { console.warn("tur pulihkan", e); } } };
    const siapkan = async nama => {   // true bila keadaan siap
      if (nama && gagal.has(nama)) return false;   // sudah gagal sekali di tur ini (mis. data kosong): jangan buat orang menunggu lagi
      // keadaan yang bisa hilang sendiri (mis. menu yang menutup saat fokus pindah) ditandai .ulang dan dijalankan lagi
      if (nama === keadaan) { const f = nama && K.keadaan?.[nama]; if (f?.ulang) { await f({klik, tunggu, jeda}); await jeda(120); } return true; }
      await pulihkan();
      // keadaan mengembalikan null/false bila peragaan gagal (mis. data kosong): langkahnya dilewati, teksnya tidak menipu
      if (nama && K.keadaan?.[nama]) { keadaan = nama; let h; try { h = await K.keadaan[nama]({klik, tunggu, jeda}); } catch (e) { console.warn("tur keadaan", nama, e); h = false; } await jeda(150); const ok = h !== null && h !== false; if (!ok) gagal.add(nama); return ok; }
    };
    const selesai = async (akhir = false) => {
      removeEventListener("resize", tataNanti); removeEventListener("scroll", tataNanti, true);
      await pulihkan();
      if (akhir) return layarAkhir();
      tutup = true; removeEventListener("keydown", kunci, true); w.remove(); asal?.focus?.();
    };

    /* ---------- layar sambutan ---------- */
    const layarSambut = () => {
      sasaran = null; N = 0; k.classList.add("lebar");
      const hero = el("div", "tr-hero"); hero.style.setProperty("--tr-foto", `url("${K.gambar || "/img/foto-satelit.jpg"}")`);
      hero.innerHTML = `<div class="tr-logo"><img src="/img/logo.svg?v=2" alt=""><img src="/lapor/lambang-bnpb.png" alt=""><span>Tur aplikasi</span></div><h2 id="trJudul"></h2><p></p>${K.kredit ? '<small class="tr-kredit"></small>' : ""}`;
      hero.querySelector("h2").textContent = `Selamat datang di Centurisk97 ${K.nama}`;
      hero.querySelector("p").textContent = K.sapa;
      if (K.kredit) hero.querySelector(".tr-kredit").textContent = K.kredit;
      const badan = el("div", "tr-badan");
      const sorot = el("ul", "tr-sorot");
      for (const [ik, judul, isi] of K.sorot || []) { const li = el("li"); li.innerHTML = svg(ik); const t = el("span"); t.append(el("b", null, judul), document.createTextNode(isi)); li.append(t); sorot.append(li); }
      const label = el("p", "tr-label", "Pilih tur");
      const grid = el("div", "tr-opsi-grid");
      const opsi = (ik, judul, daftar, ket, pil) => {
        const b = el("button", "tr-opsi"); b.type = "button";
        const n = daftar.map(judulTab).filter(s => !s.sel || s.keadaan || tampak(s.sel)).length, menit = Math.max(1, Math.round(n * 12 / 60));
        b.innerHTML = `<span class="tr-ik">${svg(ik)}</span>${pil ? `<em class="tr-pil"></em>` : ""}<b></b><small></small><span class="tr-ket"></span>`;
        b.querySelector("b").textContent = judul; b.querySelector("small").textContent = `${n} langkah, sekitar ${menit} menit`; b.querySelector(".tr-ket").textContent = ket;
        if (pil) b.querySelector(".tr-pil").textContent = pil;
        b.addEventListener("click", () => jalankan(judul, daftar)); return b;
      };
      grid.append(opsi("kilat", "Tur singkat", K.singkat, "Kenali fitur utama dengan cepat.", "Disarankan"),
                  opsi("peta", "Tur lengkap", K.lengkap, "Tiap tombol, menu, dan panel, termasuk apa yang terjadi saat diklik."));
      badan.append(...(K.sorot?.length ? [sorot] : []), label, grid);
      if (otomatis) badan.append(el("p", "tr-catat", "Belum sempat? Tur bisa dibuka lagi kapan saja lewat tombol tanda tanya di kanan atas."));
      const kaki = el("div", "tr-kaki"), nanti = el("button", "tr-lewat", "Nanti saja"); nanti.type = "button"; nanti.addEventListener("click", () => { selesai(); if (otomatis) tunjukTombol(); });
      const kbd = el("span", "tr-kbd"); kbd.innerHTML = "<kbd>←</kbd><kbd>→</kbd> pindah langkah, <kbd>Esc</kbd> keluar";
      kaki.append(nanti, kbd);
      ganti([hero, badan, kaki]); tata(); grid.querySelector("button").focus();
    };

    /* ---------- langkah ---------- */
    const bar = el("div", "tr-bar"), barIsi = el("i"); bar.append(barIsi);
    const lk = el("div", "tr-langkah"), ke = el("p", "tr-ke"), h = el("h2"), p = el("p", "tr-isi"), peraga = el("p", "tr-peraga");
    h.id = "trJudul";
    const lewat = el("button", "tr-lewat", "Lewati tur"); lewat.type = "button";
    const mundur = tombol("tr-mundur", "Kembali"), maju = tombol("tr-maju", "Lanjut", "kanan");
    const aksi = el("div", "tr-aksi"), kanan = el("div"); kanan.append(mundur, maju); aksi.append(lewat, kanan);
    lk.append(ke, h, p, peraga, aksi);
    lewat.addEventListener("click", () => selesai()); mundur.addEventListener("click", () => tampil(i - 1));
    maju.addEventListener("click", () => i < N - 1 ? tampil(i + 1) : selesai(true));

    const jalankan = (nama, daftar) => {
      mode = nama; langkah = daftar.map(judulTab).filter(s => !s.sel || s.keadaan || tampak(typeof s.sel === "function" ? s.sel() : s.sel)); N = langkah.length; k.classList.remove("lebar");
      ganti([bar, lk]); tampil(0);
    };
    const tampil = async n => {
      if (sibuk) return; sibuk = true; k.classList.add("tr-sibuk"); tutupModal();
      await jeda(30);   // biarkan klik Lanjut selesai merambat (penutup menu di laman) sebelum keadaan disiapkan
      const dari = i; i = n; let s = langkah[i];
      const siap = (await siapkan(s.keadaan || null)) !== false;
      sasaran = siap ? tampak(typeof s.sel === "function" ? s.sel() : s.sel) : null;
      // elemen tidak ada (mis. tombol tersembunyi di HP): lompati ke arah yang sama
      if ((s.sel && !sasaran) || !siap) { sibuk = false; k.classList.remove("tr-sibuk"); const arah = n >= dari ? 1 : -1, t = n + arah;
        if (t >= 0 && t < N) return tampil(t); if (t >= N) return selesai(true); i = dari; return; }
      ke.innerHTML = ""; const md = el("span", "tr-mode", mode); ke.append(md, document.createTextNode(`Langkah ${i + 1} dari ${N}`));
      h.textContent = s.judul; p.textContent = s.isi;
      peraga.hidden = !s.peraga; if (s.peraga) { peraga.innerHTML = svg("tangan"); peraga.append(document.createTextNode(s.peraga)); }
      barIsi.style.width = `${((i + 1) / N) * 100}%`;
      mundur.hidden = i === 0; maju.querySelector("span").textContent = i === N - 1 ? "Selesai" : "Lanjut";
      sasaran?.scrollIntoView?.({block: "nearest", behavior: "instant"});
      // gerak halus hanya antarlangkah; scroll/resize menempel langsung tanpa transisi
      for (const e of [lubang, k, ...gelap]) e.classList.add("gerak"); tata();
      requestAnimationFrame(() => requestAnimationFrame(tata));   // isi kartu baru: ukur ulang sesudah tata letak
      clearTimeout(lepasGerak); lepasGerak = setTimeout(() => { for (const e of [lubang, k, ...gelap]) e.classList.remove("gerak"); }, 320);
      lubang.classList.remove("denyut"); void lubang.offsetWidth; if (s.peraga) lubang.classList.add("denyut");
      // fokus: false untuk peragaan yang tertutup saat fokus pindah (mis. popover yang memegang fokusnya sendiri)
      sibuk = false; k.classList.remove("tr-sibuk"); if (s.fokus !== false) maju.focus();
    };

    /* ---------- selesai ---------- */
    const layarAkhir = () => {
      sasaran = null; N = 0; addEventListener("resize", tataNanti);
      const a = el("div", "tr-akhir"); a.innerHTML = `<div class="tr-cek">${svg("centang")}</div><h2 id="trJudul">Tur selesai</h2><p></p>`;
      a.querySelector("p").textContent = `Selamat memantau. Tur bisa dibuka lagi kapan saja lewat tombol tanda tanya di kanan atas.`;
      const ak = el("div", "tr-aksi"), ok = tombol("tr-maju", "Mulai memantau");
      ok.addEventListener("click", () => selesai());
      if (mode === "Tur singkat") { const l = tombol("tr-mundur", "Lihat tur lengkap"); l.addEventListener("click", () => { addEventListener("scroll", tataNanti, true); jalankan("Tur lengkap", K.lengkap); }); ak.append(l); }
      ak.append(ok); a.append(ak); ganti([a]); tata(); ok.focus();
    };

    const kunci = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); const disambut = otomatis && !N && !mode; selesai(); if (disambut) tunjukTombol(); return; }
      if (N && e.key === "ArrowRight") { e.preventDefault(); i < N - 1 ? tampil(i + 1) : selesai(true); }
      else if (N && e.key === "ArrowLeft" && i > 0) { e.preventDefault(); tampil(i - 1); }
      else if (e.key === "Tab") { const f = [...k.querySelectorAll("button")].filter(b => !b.closest("[hidden]")), a = f.indexOf(document.activeElement);
        if (e.shiftKey ? a <= 0 : a === f.length - 1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); } }
      // tombol lain tidak boleh sampai ke laman (mis. pintasan peta) selama tur
      else if (!["Enter", " ", "Shift"].includes(e.key)) e.stopPropagation();
    };
    addEventListener("resize", tataNanti); addEventListener("scroll", tataNanti, true); addEventListener("keydown", kunci, true);
    if (!otomatis) tutupModal(); layarSambut();
    // modal yang muncul sendiri selama tur (pewaktu laman) ditutup juga
    const jaga = setInterval(() => { if (document.hidden) return;   // tab tersembunyi: lewati, tidak ada modal yang perlu ditutup (gerbang poll-tampak)
      if (tutup || !w.isConnected) return clearInterval(jaga);
      // sambutan otomatis mengalah pada jendela laman yang muncul belakangan (mis. sapaan harian): tutup diam-diam, tampil lagi sesudahnya
      if (otomatis && !mode && document.querySelector("dialog[open]")?.matches(":modal")) {
        clearInterval(jaga); tutup = true; removeEventListener("keydown", kunci, true); removeEventListener("resize", tataNanti); removeEventListener("scroll", tataNanti, true);
        w.remove(); hapusTanda(); sambutOtomatis(); return;
      }
      tutupModal();
    }, 700);
  }

  /* kredit foto dari img/kredit.json (lisensi CC BY wajib atribusi) */
  const kreditFoto = async src => { try { const f = src.split("/").pop().split("?")[0]; const d = await (await fetch("/img/kredit.json")).json();
    const x = (Array.isArray(d) ? d : d.foto || []).find(r => r.file === f); return x && !/public domain/i.test(x.lisensi) ? `Foto: ${x.penulis}, ${x.lisensi}` : ""; } catch { return ""; } };

  /* ---------- bahan bersama untuk laman bencana ---------- */
  const TAB = {
    peta: "Pemantauan langsung di peta, dengan daftar wilayah di panel kiri.",
    kejadian: "Daftar kejadian yang tercatat beserta rinciannya.",
    katalog: "Katalog lengkap kejadian yang bisa disaring dan diunduh.",
    insight: "Temuan penting dalam grafik dan tabel.",
    longsor: "Pantauan tanah longsor yang menyertai hujan lebat.",
    berita: "Berita terbaru dari media daring tentang bencana ini.",
    tren: "Riwayat tahunan dan pola musiman.",
    dampak: "Dampak kejadian: korban, pengungsi, dan kerusakan.",
    sim: "Simulasi skenario untuk perencanaan.", simulasi: "Simulasi skenario untuk perencanaan.",
    foto: "Foto lapangan yang dikirim petugas dan warga.",
    metode: "Sumber data dan cara angka dihitung.",
    tentang: "Penjelasan tentang laman ini.",
    operasi: "Operasi lapangan dan rencananya.",
  };
  const NAMA_TAB = {sim: "Simulasi"};
  const langkahTab = keys => keys.map(k => ({sel: `#tabs [data-t="${k}"]`, judul: NAMA_TAB[k] || null, isi: TAB[k] || "", tab: k}));
  // judul tab diambil dari teks tombolnya saat tur berjalan (ikut bahasa dan nama laman)
  // tab yang terlipat di menu Lainnya: tur membuka menunya dulu (keadaan "lainnya") lalu menunjuk tabnya
  const judulTab = s => { if (!s.tab) return s; const b = $(`#tabs [data-t="${s.tab}"]`); if (!b) return s;
    const nama = b.textContent.replace(/undefined/g, "").trim() || s.tab;
    return {...s, judul: s.judul || nama, ...(b.closest("details.lainnya") ? {keadaan: "lainnya", fokus: false, isi: `${s.isi} Ada di menu Lainnya.`} : {})}; };
  const umum = {
    bencana: {sel: ".top .bencana", judul: "Pilih jenis bencana", isi: "Pindah ke pemantauan bencana lain. Tiap jenis punya peta dan menunya sendiri."},
    bahasa: {sel: ".top .bhs", judul: "Bahasa", isi: "Ganti tampilan antara bahasa Indonesia dan Inggris."},
    upd: {sel: "#upd", judul: "Waktu data", isi: "Jam data terakhir diperbarui. Data dari sumber resmi ditarik otomatis."},
    laporan: {sel: '.top .stat a[href*="laporan"]', judul: "Laporan harian", isi: "Buka laporan harian yang disusun dari data sistem, siap dicetak atau dibagikan."},
    peringatan: {sel: '.top .stat a[href="/peringatan"]', judul: "Peringatan dini", isi: "Daftar peringatan dini yang berlaku dari sumber resmi."},
    brief: {sel: '.top .stat [aria-label="Unduh brief pimpinan"]', judul: "Brief pimpinan", isi: "Unduh ringkasan satu halaman untuk pimpinan."},
    sapa: {sel: "#sapaBuka", judul: "Rincian situasi hari ini", isi: "Ringkasan situasi terkini dalam satu jendela."},
    tema: {sel: "#tema", judul: "Tema terang atau gelap", isi: "Ganti tampilan sesuai kenyamanan mata."},
    keluar: {sel: "#keluar", judul: "Keluar", isi: "Akhiri sesi masuk Anda."},
    cari: {sel: "#panel .cari", judul: "Cari", isi: "Ketik nama wilayah untuk langsung menuju ke sana."},
    peta: {sel: null, judul: "Peta", isi: "Geser dan perbesar peta dengan mouse atau jari. Tekan wilayah atau titik di peta untuk membuka rinciannya, sama seperti dari daftar."},
    lapis: {sel: "#lapis", keadaan: "lapis", judul: "Lapisan peta", isi: "Daftar overlay yang bisa dinyalakan atau dimatikan. Centang untuk menyalakan."},
    legenda: {sel: "#legenda", judul: "Legenda", isi: "Arti warna dan simbol untuk lapisan yang sedang menyala."},
    turBuka: {sel: "#turBuka", judul: "Putar ulang tur", isi: "Tur ini bisa dibuka lagi kapan saja dari tombol ini."},
  };
  // tekan baris pertama berulang (provinsi > kab > kec ...) sampai laci rincian terbuka
  // lanjut begitu daftar berganti (baris pertama diganti elemen baru) atau laci terbuka, bukan jeda tetap
  const telusur = async (sel, maks = 4) => {
    for (let n = 0; n < maks && !$("#laci.on"); n++) {
      const e = await tunggu(sel, 3000); if (!e) break; e.click();
      const t0 = Date.now(); while (Date.now() - t0 < 2000 && !$("#laci.on") && $(sel) === e) await jeda(60);
      await jeda(120);
    }
    return tunggu("#laci.on", 2000); };
  const keadaanUmum = {
    async lapis({klik}) { if (!tampak("#lapis")) await klik("#lapisBtn"); },
    async lainnya() { const d = $("#tabs details.lainnya"); if (d) d.open = true; },
  };
  keadaanUmum.lainnya.ulang = true;
  // resep pulihkan bersama: tutup laci, dialog, popover lintasan, kembali ke tingkat Indonesia, tutup lapisan
  const pulihkanUmum = async () => {
    const laci = $("#laci.on"); if (laci) { const t = laci.querySelector(".tutup, [data-tutup]"); t ? t.click() : laci.classList.remove("on"); }
    const d = $("#dlg"); if (d?.open) d.close();
    const pop = $("#lintasPop"); if (pop && !pop.hidden) pop.querySelector(".lp-x")?.click();
    const c0 = $('#crumb button[data-n="0"]'); if (c0 && $("#crumb button[data-n]:not([data-n=\"0\"])")) c0.click();
    $("#lapis")?.classList.remove("buka");
    const ln = $("#tabs details.lainnya[open]"); if (ln) ln.open = false;
    await jeda(200);
  };

  // tunjukkan tempat tombol tur sesudah sambutan otomatis dilewati
  const tunjukTombol = () => { const b = $("#turBuka"); if (!b) return; b.classList.remove("tr-tunjuk"); void b.offsetWidth; b.classList.add("tr-tunjuk");
    b.addEventListener("animationend", () => b.classList.remove("tr-tunjuk"), {once: true}); };

  /* onboarding (pemilik 24 Nov 2026: "tour ini sebagai onboarding juga untuk orang yang pertama kali buka websitenya",
     "yang udah pernah dan revisit gausah", lalu "maksud pertama kali buka tuh bukan untuk keseluruhan webnya ya, tapi untuk
     masing2 laman bencananya"): sambutan terbuka sendiri SEKALI PER LAMAN BENCANA, hanya bila laman itu benar-benar baru
     dibuka di peramban ini, sesudah data termuat dan tidak ada jendela lain terbuka.
     Pengunjung lama laman itu dikenali dari jejak laman itu sendiri yang sudah ada saat skrip ini dimuat: sapaan harian
     (pb_sapa untuk karhutla, pb_sapa_<id> untuk bencana lain) atau posisi panel lapisan (geserLapis:<jalur laman>).
     Jejak laman bencana lain tidak dihitung. Tanda dipasang begitu sambutan tampil atau tur dibuka lewat tombol.
     Tidak tampil di dalam iframe (panel tertanam) atau dengan ?tur=0; ?tur=1 memaksa tur dibuka. */
  const ID = document.querySelector(".top .bencana")?.dataset.bencana || "karhutla";
  const KUNCI = () => `tur-sambut:${ID}`;
  // dipotret saat skrip dimuat, sebelum sapaan di kunjungan ini sempat menulis jejaknya
  try {
    const sapa = ID === "karhutla" ? "pb_sapa" : `pb_sapa_${ID}`, geser = ID === "karhutla" ? /^geserLapis:\/(index\.html|peta\/?)?$/ : new RegExp(`^geserLapis:/${ID}(/|$)`);
    if (!localStorage.getItem(KUNCI()) && Object.keys(localStorage).some(k => k === sapa || geser.test(k))) localStorage.setItem(KUNCI(), "lama");
  } catch {}
  const sudah = () => { try { return !!localStorage.getItem(KUNCI()); } catch { return true; } };
  const tandai = () => { try { localStorage.setItem(KUNCI(), "1"); } catch {} };
  const hapusTanda = () => { try { localStorage.removeItem(KUNCI()); } catch {} };
  const sambutOtomatis = async () => {
    const q = new URLSearchParams(location.search).get("tur");
    if (q === "0" || window.top !== window || (sudah() && q !== "1")) return;
    const t0 = Date.now();
    await jeda(1500);
    // tunggu laman siap: pemuat hilang, daftar terisi, tanpa dialog modal (mis. sapaan prakiraan cuaca); paling lama 45 detik
    while (Date.now() - t0 < 45000) {
      const muat = $("#muat"), muatAda = muat && tampak(muat) && getComputedStyle(muat).opacity !== "0" && !muat.classList.contains("hilang");
      const siap = !muatAda && (!$("#rows") || $("#rows").children.length > 0);
      const izin = $(".pv-kartu");   // kartu persetujuan cookie dijawab dulu
      if (siap && !document.querySelector("dialog[open]") && !(izin && tampak(izin)) && !$(".tr-tur") && document.visibilityState === "visible") break;
      await jeda(700);
    }
    if (Date.now() - t0 >= 45000 || $(".tr-tur")) return;
    await jeda(600);
    tandai(); mulai(true);
  };

  window.Tur = {
    pasang(konfig) {
      K = konfig; if (K.gambar && K.kredit == null) kreditFoto(K.gambar).then(t => { K.kredit = t; });
      const b = $("#turBuka"); if (b && !b.dataset.tur) { b.dataset.tur = "1"; b.addEventListener("click", mulai); }
      sambutOtomatis();
    },
    mulai, tampak, tunggu, klik, jeda, umum, langkahTab, keadaanUmum, pulihkanUmum, telusur,
  };
})();
