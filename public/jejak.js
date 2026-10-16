/* Statistik pengunjung anonim (lihat privasi.html#statistik). Tanpa cookie, tanpa IP, tanpa sidik perangkat.
   Tidak mengirim apa pun sebelum pengunjung menyetujui kategori Analitik (public/persetujuan.js), dan tidak pernah berjalan bila
   Do Not Track / Global Privacy Control aktif atau localStorage tidak tersedia.
   Hemat kuota gratis: peristiwa dijumlahkan di memori lalu dikirim SEKALI saat halaman disembunyikan/ditutup (sendBeacon),
   plus paling banyak satu kiriman di menit ke-5 untuk sesi panjang; maksimal 3 kiriman per muat halaman, ≤ 4 KB.
   "orang", "kembali", "kunjungan baru (> 30 menit)" dan slot 10 menit dihitung di sini dari localStorage, jadi server tidak
   menyimpan id pengunjung. Fungsi halaman dibungkus, tidak diubah. */
(() => {
  const N = navigator, W = window, D = document, sc = D.currentScript;
  if (N.doNotTrack === "1" || W.doNotTrack === "1" || N.msDoNotTrack === "1" || N.globalPrivacyControl === true || N.webdriver) return;
  const HAL = sc?.dataset.halaman || "karhutla", API = new URL("api/jejak", sc?.src || location.href).href;
  const WIB = 7 * 36e5, hariWIB = (t = Date.now()) => new Date(t + WIB).toISOString().slice(0, 10), slotWIB = t => Math.floor(((t + WIB) % 864e5) / 6e5);
  let dimulai = false;
  if (W.Persetujuan?.analitik()) mulai();
  else D.addEventListener("pb-persetujuan", e => { if (e.detail?.analitik) mulai(e.detail.baru); });

  function mulai(baruSetuju) {
  if (dimulai) return; dimulai = true;
  let L, v, kembali = 0, kunjunganBaru = 1;
  try {
    L = localStorage; const h = hariWIB(); v = L.getItem("pb_vid");
    if (!v || !/^[0-9a-z]{16,40}$/.test(v)) { v = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join(""); L.setItem("pb_vid", v); L.setItem("pb_hari1", h); }
    kembali = (L.getItem("pb_hari1") || h) < h ? 1 : 0;
    kunjunganBaru = Date.now() - Number(L.getItem("pb_akhir") || 0) > 30 * 60e3 ? 1 : 0;   // kunjungan baru: > 30 menit sejak aktivitas terakhir
  } catch (e) { return; }   // tanpa localStorage: tidak dihitung (sengaja tanpa pengganti)

  const agg = new Map(), T0 = Date.now(), aman = f => { try { return f(); } catch (e) { return undefined; } };
  let klik = 0, klikTotal = 0, detik = 0, tLihat = D.visibilityState === "visible" ? Date.now() : 0, terakhirKirim = 0, nKirim = 0, nTab = 0;
  const slotSesi = new Set();
  const catat = (nama, kunci = "-", nilai = 0) => { const k = nama + "\u0001" + String(kunci).slice(0, 80), a = agg.get(k);
    if (a) { a[2]++; a[3] += Math.max(0, Math.round(nilai)); } else if (agg.size < 200) agg.set(k, [nama, String(kunci).slice(0, 80), 1, Math.max(0, Math.round(nilai))]); };
  const tabKini = () => D.querySelector(".page.on")?.id?.replace(/^p-/, "") || "-";
  const ember = (x, batas, label) => { const i = batas.findIndex(b => x < b); return label[i < 0 ? batas.length : i]; };
  /* waktu terlihat + slot 10 menit yang dilalui saat terlihat (hanya hari ini WIB) */
  function tutupLihat() {
    const kini = Date.now();
    if (tLihat) { detik += (kini - tLihat) / 1000; const h = hariWIB(kini);
      for (let t = tLihat; t <= kini; t += 6e5) if (hariWIB(t) === h) slotSesi.add(slotWIB(t)); if (hariWIB(kini) === h) slotSesi.add(slotWIB(kini)); }
    tLihat = D.visibilityState === "visible" ? kini : 0;
  }
  function kirim() {
    if (nKirim >= 3) return; tutupLihat();
    const h = hariWIB(); let o = 0, slotBaru = [];
    try {
      if (L.getItem("pb_hari") !== h) o = 1;
      const [hs, daftar] = (L.getItem("pb_slot") || "|").split("|"), sudah = new Set(hs === h && daftar ? daftar.split(",").map(Number) : []);
      slotBaru = [...slotSesi].filter(s => !sudah.has(s));
      /* susun ≤ 50 entri, terbanyak dulu, dan pangkas sampai body ≤ 4 KB */
      let e = [...agg.values()].sort((a, b) => b[2] - a[2]).slice(0, 50).map(a => a[3] ? a : a.slice(0, 3)), body;
      const susun = () => JSON.stringify({v, h: HAL, o, b: kembali, kv: kunjunganBaru, k: Math.min(5000, klik), d: Math.min(86400, Math.floor(detik)), s: slotBaru, e});
      while ((body = susun()).length > 4000 && e.length) e = e.slice(0, -5);
      const ok = aman(() => N.sendBeacon?.(API, new Blob([body], {type: "application/json"})));
      if (!ok) aman(() => W.fetch(API, {method: "POST", body, keepalive: true, headers: {"content-type": "application/json"}}).catch(() => {}));
      L.setItem("pb_hari", h); L.setItem("pb_akhir", String(Date.now())); L.setItem("pb_slot", h + "|" + [...sudah, ...slotBaru].join(","));
    } catch (err) { return; }
    agg.clear(); klik = 0; detik -= Math.floor(detik); kunjunganBaru = 0; nKirim++; terakhirKirim = Date.now();
  }

  /* ---------- konteks kunjungan (sekali per muat halaman) ---------- */
  const mm = q => aman(() => W.matchMedia(q).matches);
  const sw = Math.min(screen.width, screen.height) || 0;
  catat("perangkat", mm("(pointer:coarse)") ? (sw < 600 ? "ponsel" : "tablet") : "desktop");
  const LEBAR = [[400, 600, 900, 1280, 1600], ["<400", "400–599", "600–899", "900–1279", "1280–1599", "≥1600"]];
  catat("layar", ember(screen.width || 0, ...LEBAR));
  catat("viewport", ember(W.innerWidth || 0, ...LEBAR) + (W.innerWidth > W.innerHeight ? " mendatar" : " tegak"));
  catat("bahasa", (N.language || "?").slice(0, 10));
  catat("koneksi", N.connection?.effectiveType || "tidak diketahui");
  catat("skema", D.documentElement.dataset.theme || (mm("(prefers-color-scheme: dark)") ? "dark" : "light"));
  catat("pwa", mm("(display-mode: standalone)") || N.standalone ? "terpasang" : "peramban");
  const ref = aman(() => new URL(D.referrer).hostname.replace(/^www\.|^m\.|^l\./, "")) || "";
  const SUMBER = [[/whatsapp|wa\.me/, "WhatsApp"], [/google\./, "Google"], [/bing\./, "Bing"], [/^t\.co$|twitter|^x\.com/, "X"], [/instagram/, "Instagram"],
    [/facebook|^fb\./, "Facebook"], [/threads/, "Threads"], [/linkedin|lnkd/, "LinkedIn"], [/t\.me|telegram/, "Telegram"], [/tiktok/, "TikTok"],
    [/youtube/, "YouTube"], [/mail\.|outlook|gmail|yahoo/, "Email"], [/duckduckgo/, "DuckDuckGo"]];
  catat("rujukan", !ref ? "Langsung" : ref === location.hostname ? "Internal" : (SUMBER.find(([r]) => r.test(ref))?.[1] || ref));
  const Q = new URLSearchParams(location.search);
  [["utm_source", "utm_sumber"], ["utm_medium", "utm_medium"], ["utm_campaign", "utm_kampanye"]].forEach(([p, d]) => Q.get(p) && catat(d, Q.get(p).slice(0, 40)));
  /* tautan dalam: awalan rute dan huruf kejadian (k/K0001, sim/B0001, ...) dari registry /bencana.json; gagal dimuat = bentuk karhutla/banjir lama */
  const dalamJalur = B => { const rute = [...(B.bencana || []).map(b => b.rute.replace(/\/$/, "")).filter(Boolean), "/warga"], aw = (B.bencana || []).map(b => b.kejadian?.awalan).filter(Boolean).join("") || "K",
      jalur = location.pathname.replace(new RegExp(`^(?:${rute.join("|")})/?`), "/"), kej = new RegExp(`^/(k|sim)/[${aw}]\\d+`).exec(jalur);
    return kej ? (kej[1] === "k" ? "kompleks" : "sim kompleks") : jalur.length > 1 ? "tab " + jalur.split("/")[1] : ""; };
  const dalamQ = Q.has("wil") ? "wil" : Q.has("laporan") ? "laporan" : "";
  if (dalamQ) catat("tautan_dalam", dalamQ);
  else if (location.pathname.length > 1) fetch(new URL("/bencana.json", API).href).then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(B => { const d = aman(() => dalamJalur(B.bencana ? B : {bencana: [{rute: "/banjir/", kejadian: {awalan: "B"}}, {rute: "/", kejadian: {awalan: "K"}}]})); if (d) catat("tautan_dalam", d); });
  let tab = tabKini(), tTab = Date.now(); const gulir = {};
  catat("tampil", tab); catat("masuk_tab", tab); catat("tab", tab);

  /* ---------- perilaku ---------- */
  const tutupTab = () => { if (tTab) catat("tab_detik", tab, (Date.now() - tTab) / 1000); tTab = 0; if (gulir[tab] != null) catat("gulir", tab, gulir[tab]); delete gulir[tab]; };
  function gantiTab() {
    const t = tabKini(); if (t === tab) return;
    tutupTab();
    tab = t; tTab = Date.now(); nTab++; catat("tab", t); catat("tampil", t); setTimeout(amatiEx, 1500);
  }
  const bungkus = (obj, nama, f) => { const asli = aman(() => obj[nama]); if (typeof asli !== "function" || asli._jj) return;
    const b = function (...a) { const r = asli.apply(this, a); aman(() => f.apply(this, a)); return r; }; b._jj = 1; obj[nama] = b; };
  /* const/let global di skrip halaman bukan properti window: dibaca langsung dengan penjaga typeof (tanpa eval, aman untuk CSP) */
  const G = {Laci: () => typeof Laci !== "undefined" ? Laci : null, Sim: () => typeof Sim !== "undefined" ? Sim : null, S: () => typeof S !== "undefined" ? S : null,
    Bagikan: () => typeof Bagikan !== "undefined" ? Bagikan : null, peta: () => typeof peta !== "undefined" ? peta : null};
  const ada = nama => aman(G[nama]);
  function pasang() {
    bungkus(W, "bukaTab", () => setTimeout(gantiTab, 0));
    bungkus(W, "turun", k => { const p = String(k).split("|"); catat("provinsi", p[0]); if (p.length > 1) catat("wilayah", k); });
    bungkus(ada("Laci"), "buka", id => catat("kompleks", id));
    bungkus(ada("Sim"), "jalan", function () { const S = ada("S"); catat("sim", `${S?.pilihK || "-"} · ${[...(this.op?.on || [])].join("+") || "dasar"}`); });
    const B = ada("Bagikan");
    bungkus(B, "buka", tpl => catat("bagikan", "templat " + tpl)); bungkus(B, "salin", () => catat("bagikan", "salin tautan"));
    bungkus(N, "share", () => catat("bagikan", "bagikan perangkat"));
  }
  pasang(); D.addEventListener("DOMContentLoaded", pasang);   // modul defer yang dimuat belakangan

  D.addEventListener("click", e => {
    klik++; klikTotal++;
    const t = e.target, el = t.closest ? t : t.parentElement; if (!el) return;
    const a = el.closest("a[download]");
    if (a) catat("unduh", (a.download || "").replace(/\d{4}-\d{2}-\d{2}|\d+/g, "").replace(/-+/g, "-").slice(0, 60) || "berkas");
    const h = el.closest("#hasil button"); if (h) catat("cari", h.textContent.trim().slice(0, 60));
    if (el.closest("#tema")) setTimeout(() => catat("tema", D.documentElement.dataset.theme || "auto"), 0);
    if (el.closest('[data-rk="dinding"]')) catat("layar_besar", "buka");
  }, true);
  W.addEventListener("beforeprint", () => catat("unduh", "brief/cetak PDF (" + tab + ")"));
  D.addEventListener("change", e => {
    const el = e.target; if (!el || !el.closest) return;
    if (el.closest("#lapis")) { if (el.checked !== false) catat("lapisan", (el.closest("label")?.textContent || el.value || el.id || "?").trim().slice(0, 60)); return; }
    if (el.closest("#operasi") && el.type === "range") return catat("operasi", el.dataset.op || el.id || el.getAttribute("aria-label") || "slider");
    if (el.id === "cari" && /^K\d{3,5}$/i.test(el.value.trim())) return catat("cari", el.value.trim().toUpperCase());
    if (/^(search|text|password|email|tel|file|textarea)$/.test(el.type) || el.tagName === "TEXTAREA") return;   // teks bebas tidak pernah dikirim
    if (/bahasa|lang/.test(el.dataset.f || "")) catat("berita_bahasa", el.value || "semua");
    const judul = el.closest("article")?.querySelector("h3")?.textContent?.trim().slice(0, 30) || "";
    catat("kontrol", `${tab}:${judul ? judul + ":" : ""}${el.name || el.dataset.f || el.dataset.op || el.id || el.type}`);
  }, true);
  D.addEventListener("scroll", e => { const s = e.target === D ? D.scrollingElement : e.target; if (!s?.scrollHeight || !s.closest?.(".page.on") && s !== D.scrollingElement) return;
    const p = Math.min(100, Math.round((s.scrollTop + s.clientHeight) / s.scrollHeight * 100)); if (p > (gulir[tab] || 0)) gulir[tab] = p; }, {capture: true, passive: true});

  /* eksibit yang benar-benar terlihat (Insight, Metode, Ringkasan, ...), sekali per sesi */
  const dilihat = new Set(), io = aman(() => new IntersectionObserver(es => es.forEach(x => { if (!x.isIntersecting) return; io.unobserve(x.target);
    const k = tab + ": " + (x.target.querySelector("h3,h2")?.textContent || "").trim().slice(0, 60); if (!dilihat.has(k)) { dilihat.add(k); catat("ex_lihat", k); } }), {threshold: .5}));
  const diamati = new WeakSet();
  function amatiEx() { if (io) D.querySelectorAll(".page.on article.ex").forEach(a => { if (!diamati.has(a)) { diamati.add(a); io.observe(a); } }); }

  /* peta: tingkat zoom & sel 0,5° pusat tampilan, setelah pengguna berhenti menggeser */
  let petaDikait = false, tz, akhirPeta = "";
  function kaitPeta() {
    const p = ada("peta"); if (petaDikait || !p?.on) return; petaDikait = true;
    p.on("moveend", () => { clearTimeout(tz); tz = setTimeout(() => { const c = p.getCenter(), z = Math.round(p.getZoom()), sel = `${(Math.floor(c.lat * 2) / 2).toFixed(1)},${(Math.floor(c.lng * 2) / 2).toFixed(1)}`;
      if (sel + z === akhirPeta) return; akhirPeta = sel + z; catat("zoom", "z" + z); catat("sel_peta", sel); }, 1500); });
  }

  /* fetch: laporan warga terkirim/dibuka, dan berkas data yang gagal dimuat (hanya jalur, tanpa isi) */
  const fAsli = W.fetch;
  if (fAsli) W.fetch = function (input, init) {
    const u = aman(() => new URL(typeof input === "string" ? input : input.url, location.href)), metode = (init?.method || input?.method || "GET").toUpperCase();
    const p = fAsli.apply(this, arguments);
    if (!u || u.origin !== location.origin || u.pathname.startsWith("/api/jejak")) return p;
    p.then(r => {
      if (!r.ok && r.status !== 429) catat("gagal_muat", `${u.pathname.slice(0, 60)} ${r.status}`);
      else if (/\/api\/warga\/?$/.test(u.pathname) && metode === "POST") catat("laporan_kirim", aman(() => JSON.parse(init.body).jenis) || "?");
      else if (/\/api\/warga\/[0-9a-f]{16}$/.test(u.pathname) && metode === "GET") catat("laporan_lihat", "rincian");
    }, () => catat("gagal_muat", `${u.pathname.slice(0, 60)} jaringan`));
    return p;
  };

  /* kualitas: Web Vitals kasar + galat JS (pesan & berkas:baris saja) */
  const VIT = {ttfb: [800, 1800], fcp: [1800, 3000], lcp: [2500, 4000], cls: [100, 250], inp: [200, 500]}, vit = {};
  const amati = (type, f, o = {}) => aman(() => new PerformanceObserver(l => l.getEntries().forEach(f)).observe({type, buffered: true, ...o}));
  aman(() => { const n = performance.getEntriesByType("navigation")[0]; if (n) vit.ttfb = n.responseStart; });
  amati("paint", x => { if (x.name === "first-contentful-paint") vit.fcp = x.startTime; });
  amati("largest-contentful-paint", x => { vit.lcp = x.startTime; });
  amati("layout-shift", x => { if (!x.hadRecentInput) vit.cls = (vit.cls || 0) + x.value * 1000; });
  amati("event", x => { if (x.interactionId) vit.inp = Math.max(vit.inp || 0, x.duration); }, {durationThreshold: 40});
  let vitTerkirim = false;
  const kirimVital = () => { if (vitTerkirim) return; vitTerkirim = true;
    for (const [k, [b, u]] of Object.entries(VIT)) if (vit[k] != null) { catat("vital", k, vit[k]); catat("vital_kelas", `${k}: ${vit[k] <= b ? "baik" : vit[k] <= u ? "perlu perbaikan" : "buruk"}`); } };
  let nGalat = 0;
  W.addEventListener("error", e => { if (++nGalat > 5 || !e.message) return; const f = String(e.filename || "").split("/").pop().split("?")[0] || "inline";
    catat("galat_js", `${e.message.replace(/\d{3,}/g, "#").slice(0, 50)} @ ${f}:${e.lineno || 0}`); });
  setTimeout(() => { const t = Date.parse(ada("S")?.meta?.dibuat || ""); if (t) catat("umur_data", ember((Date.now() - t) / 36e5, [3, 6, 12, 24], ["<3 jam", "3–6 jam", "6–12 jam", "12–24 jam", ">24 jam"])); }, 8000);

  /* ---------- pengiriman: maks 3 per muat (menit ke-5, saat disembunyikan bila ≥ 2 menit sejak kiriman terakhir, saat ditutup) ---------- */
  /* akhir sesi: peristiwa penutup dicatat sekali (saat pertama disembunyikan/ditutup), lalu SATU kiriman. Bila halaman sempat
     disembunyikan lalu ditutup dalam 2 menit, kiriman kedua dilewati. ponytail: durasi sesi terpotong di penyembunyian pertama. */
  function akhiri() {
    if (!akhiri.sudah) {
      akhiri.sudah = true;
      tutupTab(); catat("keluar_tab", tab); kirimVital();
      const s = (Date.now() - T0) / 1000;
      catat("durasi_sesi", ember(s, [10, 30, 60, 180, 600, 1800], ["<10 dtk", "10–30 dtk", "30–60 dtk", "1–3 mnt", "3–10 mnt", "10–30 mnt", "≥30 mnt"]), s);
      if (!nTab && klikTotal === 0) catat("pantul", tab);
    } else if (tTab) { catat("tab_detik", tab, (Date.now() - tTab) / 1000); tTab = 0; }
    if (!nKirim || Date.now() - terakhirKirim > 120e3) kirim(); else { tutupLihat(); aman(() => L.setItem("pb_akhir", String(Date.now()))); }
  }
  D.addEventListener("visibilitychange", () => { if (D.visibilityState === "hidden") akhiri(); else { tLihat = Date.now(); tTab = Date.now(); } });
  W.addEventListener("pagehide", akhiri);
  setTimeout(() => { kaitPeta(); amatiEx(); }, 3000);
  setInterval(() => { kaitPeta(); amatiEx(); }, 30e3);
  setTimeout(() => { if (D.visibilityState === "visible" && !nKirim) kirim(); }, 5 * 60e3);   // satu kiriman tengah sesi
  if (baruSetuju) catat("persetujuan", "terima");   // hanya pilihan "terima" yang dikirim; menolak tidak mengirim apa pun
  W.Jejak = {catat, kirim};
  }
})();
