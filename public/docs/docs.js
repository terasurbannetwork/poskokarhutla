/* Docs Centurisk97: pindah halaman tanpa muat penuh (ambil, tukar isi, riwayat, prefetch), bilah samping bertingkat, daftar isi,
   laci, tombol aksi, tombol salin, perbesar gambar, dan pencarian dua bagian (Panduan dan Pengembang).
   Tanpa build step dan tanpa skrip inline. Fungsi murni diekspor lewat module.exports agar bisa diuji di Node
   (tests/docs/perilaku.test.mjs). Rancangan: data/kajian-bnpb/docs-situs/DESAIN-TEKNIS.md dan DESIGN-SYSTEM.md. */
(function () {
  "use strict";

  const MAKS_HASIL = 20;
  const SLOT_LAIN = 5;
  const NAMA_BAGIAN = { p: "Panduan", d: "Pengembang" };

  /* ---------- fungsi murni ---------- */

  function normal(s) {
    return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function kataKueri(q) {
    return normal(q).split(/[^a-z0-9]+/).filter(function (k) { return k.length >= 2; });
  }

  /* Skor: kata di b x3, di t (judul halaman dan modul) x2, di k x1; entri yang tidak memuat semua kata bernilai 0. */
  function skor(entri, kata) {
    if (!kata.length) return 0;
    const b = normal(entri.b), t = normal(entri.t + " " + (entri.m || "")), k = normal(entri.k);
    let total = 0;
    for (let i = 0; i < kata.length; i++) {
      const w = kata[i];
      const sb = b.indexOf(w) >= 0, st = t.indexOf(w) >= 0, sk = k.indexOf(w) >= 0;
      if (!sb && !st && !sk) return 0;
      total += (sb ? 3 : 0) + (st ? 2 : 0) + (sk ? 1 : 0);
    }
    return total;
  }

  /* bagian = "p" atau "d": hasil dari bagian yang sedang dibuka tampil lebih dulu, lalu skor, lalu urutan indeks. */
  function cari(indeks, kueri, bagian) {
    const kata = kataKueri(kueri);
    if (!kata.length) return [];
    const hasil = [];
    for (let i = 0; i < indeks.length; i++) {
      const s = skor(indeks[i], kata);
      if (s > 0) hasil.push({ s: s, i: i, e: indeks[i], x: bagian && indeks[i].s === bagian ? 1 : 0 });
    }
    hasil.sort(function (a, b) { return b.x - a.x || b.s - a.s || a.i - b.i; });
    let atas = hasil.slice(0, MAKS_HASIL);
    /* sisakan SLOT_LAIN tempat untuk bagian lain bila ada, supaya pembaca tahu hasilnya ada di sana */
    if (bagian && atas.length === MAKS_HASIL && atas.every(function (h) { return h.x === 1; })) {
      const lain = hasil.filter(function (h) { return h.x === 0; }).slice(0, SLOT_LAIN);
      if (lain.length) atas = atas.slice(0, MAKS_HASIL - lain.length).concat(lain);
    }
    return atas.map(function (h) { return h.e; });
  }

  /* cari.json v2: {v, m:[[judul modul, bagian]], e:[[u tanpa /docs, indeks modul, judul halaman, bagian halaman, cuplikan]]} */
  function bukaIndeks(d) {
    if (!d || d.v !== 2 || !Array.isArray(d.e) || !Array.isArray(d.m)) return [];
    return d.e.map(function (r) {
      const m = d.m[r[1]] || ["", "p"];
      return { u: "/docs" + r[0], m: m[0], s: m[1], t: r[2], b: r[3], k: r[4] };
    });
  }

  /* Potong teks menjadi segmen [{t, m}] dengan m=true untuk kata yang cocok. Tidak pernah menghasilkan HTML. */
  function sorot(teks, kata) {
    const asli = String(teks || "");
    const n = normal(asli);
    if (n.length !== asli.length) return [{ t: asli, m: false }]; /* diakritik mengubah panjang: tanpa sorotan */
    const tanda = new Array(asli.length).fill(false);
    kata.forEach(function (w) {
      let p = n.indexOf(w);
      while (p >= 0) {
        for (let j = p; j < p + w.length; j++) tanda[j] = true;
        p = n.indexOf(w, p + w.length);
      }
    });
    const seg = [];
    let mulai = 0;
    for (let i = 1; i <= asli.length; i++) {
      if (i === asli.length || tanda[i] !== tanda[mulai]) {
        seg.push({ t: asli.slice(mulai, i), m: tanda[mulai] });
        mulai = i;
      }
    }
    return seg;
  }

  /* Cuplikan sekitar kemunculan pertama kata, dipotong ~140 karakter. */
  function cuplik(k, kata) {
    const n = normal(k);
    let p = -1;
    for (let i = 0; i < kata.length; i++) {
      const q = n.indexOf(kata[i]);
      if (q >= 0 && (p < 0 || q < p)) p = q;
    }
    const a = Math.max(0, (p < 0 ? 0 : p) - 40);
    const potong = k.slice(a, a + 140);
    return (a > 0 ? "..." : "") + potong + (a + 140 < k.length ? "..." : "");
  }

  /* Kelompokkan hasil per modul dan bagian menurut urutan kemunculan pertama; tiap kelompok memuat entri berurutan skor. */
  function kelompok(hasil) {
    const urut = [], peta = {};
    hasil.forEach(function (e) {
      const kunci = (e.s || "") + "|" + (e.m || e.t);
      if (!peta[kunci]) { peta[kunci] = { t: e.m || e.t, s: e.s || "", e: [] }; urut.push(peta[kunci]); }
      peta[kunci].e.push(e);
    });
    return urut;
  }

  /* Tautan boleh dicegat untuk pindah halaman tanpa muat penuh: asal sama, jalur /docs, /docs/<modul>, /docs/<modul>/<halaman>,
     atau yang sama di bawah /docs/pengembang; bukan halaman yang sedang dibuka, klik kiri biasa tanpa tombol pengubah, bukan tab baru
     atau unduhan. ev: button, ctrlKey, metaKey, shiftKey, altKey, defaultPrevented, target, unduh, sekarang (alamat halaman saat ini). */
  const POLA_DOCS = /^\/docs(?:\/pengembang)?(?:\/(?!gambar\/|gambar$|cari$)[a-z0-9-]+){0,2}\/?$/;
  function tautanBolehDicegat(url, asal, ev) {
    ev = ev || {};
    if (ev.defaultPrevented) return false;
    if (ev.button !== undefined && ev.button !== 0) return false;
    if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return false;
    if (ev.target && ev.target !== "_self") return false;
    if (ev.unduh) return false;
    let u, o;
    try { o = new URL(asal); u = new URL(url, asal); } catch (e) { return false; }
    if (u.origin !== o.origin || u.search) return false;
    if (!POLA_DOCS.test(u.pathname)) return false;
    if (ev.sekarang) {
      try {
        const c = new URL(ev.sekarang, asal);
        if (c.pathname.replace(/\/$/, "") === u.pathname.replace(/\/$/, "")) return false;
      } catch (e) { /* abaikan */ }
    }
    return true;
  }

  const api = { normal: normal, kataKueri: kataKueri, skor: skor, cari: cari, bukaIndeks: bukaIndeks, sorot: sorot, cuplik: cuplik,
    kelompok: kelompok, tautanBolehDicegat: tautanBolehDicegat, MAKS_HASIL: MAKS_HASIL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* ---------- peramban ---------- */

  const $ = function (s, d) { return (d || document).querySelector(s); };
  const $$ = function (s, d) { return Array.prototype.slice.call((d || document).querySelectorAll(s)); };

  const kepalaDocs = $(".dk-atas");
  const status = $("#docsStatus");
  let halamanSekarang = location.pathname;

  /* Pengumuman untuk pembaca layar (salin, pindah halaman) */
  function umumkan(t) {
    if (!status) return;
    status.textContent = "";
    setTimeout(function () { status.textContent = t; }, 30);
  }
  function dekode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  function kurangiGerak() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function bagianSekarang() { return document.body.classList.contains("docs-pengembang") ? "d" : "p"; }

  /* Alamat bagian: bila sasarannya terlipat, buka. Mengembalikan true bila sasaran ada. */
  function bukaSasaran() {
    const id = dekode((location.hash || "").slice(1));
    if (!id) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    const det = el.closest("details");
    if (det && !det.open) det.open = true;
    el.scrollIntoView();
    return true;
  }
  window.addEventListener("hashchange", bukaSasaran);

  /* Bilah samping: panah modul melipat atau membuka daftar halamannya; penutup laci saat tautan dipilih */
  const samping = $("#samping");
  if (samping) {
    samping.addEventListener("click", function (e) {
      const t = e.target.closest && e.target.closest(".dk-mod-t");
      if (t) {
        const mod = t.closest(".dk-mod");
        const b = mod.classList.toggle("buka");
        t.setAttribute("aria-expanded", String(b));
        return;
      }
      if (e.target.closest && e.target.closest("a")) laci(false);
    });
  }
  /* Bawa penanda aktif ke dalam pandangan bilah samping tanpa menggulir halaman */
  function tampakkanAktif() {
    const a = $('#samping a[aria-current="page"]');
    if (!a || !samping) return;
    const r = a.getBoundingClientRect(), w = samping.getBoundingClientRect();
    if (r.top < w.top + 8) samping.scrollTop -= w.top + 8 - r.top;
    else if (r.bottom > w.bottom - 8) samping.scrollTop += r.bottom - w.bottom + 8;
  }

  /* Laci topik (layar sempit) */
  const buka = $("#bukaLaci"), tutup = $("#tutupLaci");
  function laci(b) {
    const tadi = document.body.classList.contains("laci");
    document.body.classList.toggle("laci", b);
    if (buka) buka.setAttribute("aria-expanded", String(b));
    if (tutup) tutup.hidden = !b;
    if (b && !tadi) {
      const a = $('#samping a[aria-current="page"]') || $("#samping a");
      if (a) a.focus({ preventScroll: true });
    } else if (!b && tadi && buka && buka.offsetParent !== null) buka.focus();
  }
  if (buka) buka.addEventListener("click", function () { laci(!document.body.classList.contains("laci")); });
  if (tutup) tutup.addEventListener("click", function () { laci(false); });

  /* Tombol aksi di judul (salin tautan, cetak): satu pendengar untuk semua halaman yang pernah dimuat */
  document.addEventListener("click", function (e) {
    const b = e.target.closest && e.target.closest("[data-aksi]");
    if (!b) return;
    const aksi = b.getAttribute("data-aksi");
    if (aksi === "cetak") { window.print(); return; }
    const label = b.getAttribute("aria-label");
    const url = location.href.split("#")[0];
    const selesai = function (ok) {
      b.setAttribute("title", ok ? "Tautan tersalin" : "Gagal menyalin");
      umumkan(ok ? "Tautan tersalin" : "Gagal menyalin tautan");
      setTimeout(function () { b.setAttribute("title", label); }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { selesai(true); }, function () { selesai(false); });
    } else selesai(false);
  });

  /* Perbesar gambar raster: dialog sederhana, Esc atau klik menutup */
  function bukaZoom(a) {
    const d = document.createElement("dialog");
    d.className = "dk-zoom";
    d.setAttribute("aria-label", a.getAttribute("aria-label") || "Gambar diperbesar");
    const asli = a.querySelector("img");
    const im = document.createElement("img");
    im.src = a.href;
    im.alt = asli ? asli.alt : "";
    d.appendChild(im);
    d.addEventListener("click", function () { d.close(); });
    d.addEventListener("close", function () { d.remove(); if (a.isConnected) a.focus(); });
    document.body.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }

  /* Isi yang diganti tiap halaman: tombol salin kode, daftar isi kanan (hanya h2), penanda bagian yang sedang dibaca */
  let tocT = null, tocBox = null, judulToc = [], terakhirAktif = null, rafSpy = 0;

  function pasangSalin() {
    $$(".dk-isi pre.kode").forEach(function (pre) {
      if (pre.querySelector(".salin")) return;
      const tb = document.createElement("button");
      tb.type = "button";
      tb.className = "salin";
      tb.textContent = "Salin";
      tb.setAttribute("aria-label", "Salin blok kode");
      tb.addEventListener("click", function () {
        const kode = pre.querySelector("code");
        const teks = kode ? kode.textContent : pre.textContent;
        const selesai = function (ok) {
          tb.textContent = ok ? "Tersalin" : "Gagal";
          umumkan(ok ? "Kode tersalin" : "Gagal menyalin kode");
          setTimeout(function () { tb.textContent = "Salin"; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(teks).then(function () { selesai(true); }, function () { selesai(false); });
        } else selesai(false);
      });
      pre.appendChild(tb);
    });
  }

  function pasangToc() {
    tocT = $("#tocTombol");
    tocBox = $(".dk-toc");
    if (tocT && tocBox) {
      tocT.hidden = false;
      tocT.addEventListener("click", function () {
        const b = tocBox.classList.toggle("buka");
        tocT.setAttribute("aria-expanded", String(b));
      });
    }
    judulToc = [];
    terakhirAktif = null;
    $$(".dk-toc a").forEach(function (a) {
      const el = document.getElementById(dekode(a.getAttribute("href").slice(1)));
      if (el) judulToc.push({ el: el, a: a });
    });
    penandaToc();
  }

  /* Bagian yang sedang dibaca = h2 terakhir yang puncaknya sudah melewati garis di bawah bilah atas */
  function penandaToc() {
    if (!judulToc.length) return;
    const dasar = kepalaDocs ? Math.max(kepalaDocs.getBoundingClientRect().bottom, 58) : 58;
    const batas = dasar + 40;
    let aktif = null;
    for (let i = 0; i < judulToc.length; i++) {
      const j = judulToc[i];
      if (!j.el.getClientRects().length) continue;
      if (j.el.getBoundingClientRect().top <= batas) aktif = j; else break;
    }
    if (!aktif) aktif = judulToc[0];
    if (aktif === terakhirAktif) return;
    terakhirAktif = aktif;
    $$(".dk-toc a.aktif").forEach(function (a) { a.classList.remove("aktif"); });
    aktif.a.classList.add("aktif");
  }
  function sesudahGulir() {
    if (rafSpy) return;
    rafSpy = window.requestAnimationFrame(function () {
      rafSpy = 0;
      if (kepalaDocs) kepalaDocs.classList.toggle("tergulir", window.scrollY > 4);
      penandaToc();
    });
  }
  window.addEventListener("scroll", sesudahGulir, { passive: true });
  window.addEventListener("resize", sesudahGulir);

  /* Pencarian: tiap kotak ([data-cari]) punya panel hasil sendiri, indeks dimuat sekali */
  let indeks = null, memuat = null;
  const kotakAktif = [];

  function muatIndeks() {
    if (indeks) return Promise.resolve(indeks);
    if (!memuat) {
      memuat = fetch("/docs/cari.json", { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { indeks = bukaIndeks(d); return indeks; })
        .catch(function () { memuat = null; throw new Error("gagal"); });
    }
    return memuat;
  }

  function sorotKe(el, teks, kata) {
    sorot(teks, kata).forEach(function (s) {
      if (s.m) { const m = document.createElement("mark"); m.textContent = s.t; el.appendChild(m); }
      else el.appendChild(document.createTextNode(s.t));
    });
  }

  function pasangCari(wadah) {
    const kotak = $(".dk-cari-in", wadah), panel = $(".dk-panel", wadah), daftar = $(".dk-hasil", wadah), pesan = $(".dk-pesan", wadah);
    let timer = null, pilih = -1, nomor = 0;

    function tutupPanel() {
      panel.hidden = true; daftar.textContent = ""; pesan.textContent = ""; pilih = -1;
      kotak.setAttribute("aria-expanded", "false"); kotak.removeAttribute("aria-activedescendant");
    }
    function tampilPesan(t, tautan) {
      pesan.textContent = t || "";
      if (t && tautan) {
        const a = document.createElement("a"); a.href = bagianSekarang() === "d" ? "/docs/pengembang" : "/docs";
        a.textContent = "Ke beranda " + (bagianSekarang() === "d" ? "Pengembang" : "Panduan");
        pesan.appendChild(document.createTextNode(" ")); pesan.appendChild(a);
      }
    }
    function gambar(hasil, kata) {
      daftar.textContent = "";
      pilih = -1; nomor = 0;
      kelompok(hasil).forEach(function (g) {
        const kep = document.createElement("li");
        kep.className = "dk-grup"; kep.setAttribute("role", "presentation");
        const n = document.createElement("span"); n.textContent = g.t; kep.appendChild(n);
        const bg = document.createElement("span"); bg.textContent = NAMA_BAGIAN[g.s] || ""; kep.appendChild(bg);
        daftar.appendChild(kep);
        g.e.forEach(function (e) {
          const li = document.createElement("li");
          li.setAttribute("role", "option");
          li.setAttribute("aria-selected", "false");
          li.id = kotak.id + "-h" + (nomor++);
          const a = document.createElement("a");
          a.href = e.u;
          a.tabIndex = -1;
          const b = document.createElement("span"); b.className = "b"; sorotKe(b, e.b === e.t ? e.t : e.t + ": " + e.b, kata);
          const k = document.createElement("span"); k.className = "k"; sorotKe(k, cuplik(e.k, kata), kata);
          a.appendChild(b); a.appendChild(k);
          a.addEventListener("click", function () { laci(false); setTimeout(function () { kotak.value = ""; tutupPanel(); }, 0); });
          li.appendChild(a);
          daftar.appendChild(li);
        });
      });
    }
    function jalankan() {
      if (!kataKueri(kotak.value).length) { tutupPanel(); return; }
      muatIndeks().then(function (d) {
        const kata = kataKueri(kotak.value);
        if (!kata.length) return;
        const h = cari(d, kotak.value, bagianSekarang());
        gambar(h, kata);
        tampilPesan(h.length ? "" : "Tidak ada hasil, coba kata lain.", !h.length);
        panel.hidden = false;
        kotak.setAttribute("aria-expanded", "true");
      }, function () {
        daftar.textContent = "";
        tampilPesan("Pencarian tidak tersedia.", false);
        panel.hidden = false;
        kotak.setAttribute("aria-expanded", "true");
      });
    }
    function pindah(n) {
      const a = $$('li[role="option"]', daftar);
      if (!a.length) return;
      pilih = pilih < 0 && n < 0 ? a.length - 1 : (pilih + n + a.length) % a.length;
      a.forEach(function (x, i) { x.setAttribute("aria-selected", i === pilih ? "true" : "false"); });
      kotak.setAttribute("aria-activedescendant", a[pilih].id);
      a[pilih].scrollIntoView({ block: "nearest" });
    }
    kotak.addEventListener("focus", function () { muatIndeks().catch(function () {}); });
    kotak.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { timer = null; jalankan(); }, 150); });
    kotak.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); pindah(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); pindah(-1); }
      else if (e.key === "Enter") {
        if (timer) { /* ketikan terakhir belum diproses: jalankan dulu, jangan membuka hasil lama */
          e.preventDefault(); clearTimeout(timer); timer = null; jalankan(); return;
        }
        const li = $$('li[role="option"]', daftar)[pilih >= 0 ? pilih : 0];
        const a = li && $("a", li);
        if (a) { e.preventDefault(); const h = a.href; kotak.value = ""; tutupPanel(); pergiKe(h); }
      } else if (e.key === "Escape") {
        if (!panel.hidden || kotak.value) { e.preventDefault(); kotak.value = ""; tutupPanel(); kotak.focus(); }
      }
    });
    kotakAktif.push({ wadah: wadah, tutup: tutupPanel });
  }
  /* satu pendengar klik untuk semua kotak cari; kotak di isi yang sudah diganti dibuang dari daftar */
  document.addEventListener("click", function (e) {
    for (let i = kotakAktif.length - 1; i >= 0; i--) {
      const k = kotakAktif[i];
      if (!k.wadah.isConnected) kotakAktif.splice(i, 1);
      else if (!k.wadah.contains(e.target)) k.tutup();
    }
  });
  function pasangCariBaru() {
    $$("[data-cari]").forEach(function (w) {
      if (!w.__dkPasang) { w.__dkPasang = true; pasangCari(w); }
    });
  }

  function fokusCari() {
    const k = $$("[data-cari] .dk-cari-in").filter(function (x) {
      const w = x.closest(".dk-atas-cari");
      return x.getClientRects().length > 0 && window.getComputedStyle(x).visibility !== "hidden" &&
        !(w && window.getComputedStyle(w).visibility === "hidden");
    })[0];
    if (k) { k.focus(); k.select(); }
  }
  document.addEventListener("keydown", function (e) {
    const t = e.target;
    const mengetik = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if ((e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !mengetik) || ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k")) {
      e.preventDefault();
      fokusCari();
    } else if (e.key === "Escape") laci(false);
  });

  /* ---------- pindah halaman tanpa muat penuh ---------- */

  const adaNavigasi = !!(window.fetch && window.DOMParser && window.history && history.pushState && window.URL && Element.prototype.replaceChildren);
  const simpanHalaman = new Map();
  const MAKS_SIMPAN = 20;
  let tokenNav = 0;

  function kunciHalaman(path) { return path.length > 1 ? path.replace(/\/$/, "") : path; }

  /* Ambil HTML satu halaman (tanpa hash); hasilnya disimpan sebagai janji supaya ambil ganda tidak mengulang jaringan */
  function ambil(path) {
    const k = kunciHalaman(path);
    if (simpanHalaman.has(k)) return simpanHalaman.get(k);
    const p = fetch(k, { credentials: "same-origin" }).then(function (r) {
      const jenis = r.headers.get("content-type") || "";
      if (!r.ok || jenis.indexOf("text/html") < 0) throw new Error("bukan halaman");
      return r.text();
    }).catch(function (err) { simpanHalaman.delete(k); throw err; });
    simpanHalaman.set(k, p);
    while (simpanHalaman.size > MAKS_SIMPAN) simpanHalaman.delete(simpanHalaman.keys().next().value);
    return p;
  }

  const garisMuat = document.createElement("div");
  garisMuat.className = "dk-muat";
  garisMuat.setAttribute("aria-hidden", "true");
  document.body.appendChild(garisMuat);

  function simpanPosisi() {
    try { history.replaceState({ y: window.scrollY }, ""); } catch (e) { /* diabaikan */ }
  }

  function bisaDicegat(a, e) {
    return tautanBolehDicegat(a.href, location.href, {
      button: e ? e.button : 0, ctrlKey: e && e.ctrlKey, metaKey: e && e.metaKey, shiftKey: e && e.shiftKey, altKey: e && e.altKey,
      defaultPrevented: e && e.defaultPrevented, target: a.getAttribute("target") || "", unduh: a.hasAttribute("download"), sekarang: location.href
    });
  }

  function cocokStruktur(doc) {
    return !!(doc.querySelector(".dk-isi") && doc.querySelector(".dk-nav") && doc.querySelector(".dk-tab") && doc.querySelector("#tocW") && doc.querySelector("h1"));
  }

  /* Tukar hanya wilayah yang berubah: isi, daftar isi kanan, bilah samping, tab bagian, kaki, judul dokumen, meta, kelas halaman */
  function ganti(sel, doc) {
    const a = $(sel), b = doc.querySelector(sel);
    if (a && b) a.replaceWith(document.importNode(b, true));
  }
  function tukar(doc) {
    document.title = doc.title;
    const md = $('meta[name="description"]'), nd = doc.querySelector('meta[name="description"]');
    if (md && nd) md.setAttribute("content", nd.getAttribute("content") || "");
    const kn = $('link[rel="canonical"]'), nk = doc.querySelector('link[rel="canonical"]');
    if (kn && nk) kn.setAttribute("href", nk.getAttribute("href") || "");
    Array.prototype.slice.call(document.body.classList).forEach(function (c) { if (/^docs-/.test(c)) document.body.classList.remove(c); });
    Array.prototype.slice.call(doc.body.classList).forEach(function (c) { if (/^docs-/.test(c)) document.body.classList.add(c); });
    const isi = $(".dk-isi"), nIsi = doc.querySelector(".dk-isi");
    isi.replaceChildren.apply(isi, Array.prototype.slice.call(nIsi.childNodes).map(function (n) { return document.importNode(n, true); }));
    const tw = $("#tocW"), ntw = doc.querySelector("#tocW");
    tw.replaceChildren.apply(tw, Array.prototype.slice.call(ntw.childNodes).map(function (n) { return document.importNode(n, true); }));
    ganti(".dk-nav", doc);
    ganti(".dk-tab", doc);
    ganti(".dk-kaki", doc);
    laci(false);
    halamanSekarang = location.pathname;
    initIsi();
    tampakkanAktif();
  }

  function posisi(y) {
    if (typeof y === "number") { window.scrollTo(0, y); return; }
    if (location.hash && bukaSasaran()) return;
    window.scrollTo(0, 0);
  }

  function sesudahPindah() {
    const h = $(".dk-isi h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    umumkan("Halaman dimuat: " + document.title);
  }

  /* dorong=true untuk klik (tambah entri riwayat), false untuk maju atau mundur; y = posisi gulir yang dipulihkan */
  let tertunda = false;
  function pergi(url, dorong, y) {
    const tok = ++tokenNav;
    const timer = setTimeout(function () { garisMuat.classList.add("aktif"); }, 150);
    tertunda = true;
    const selesai = function () {
      clearTimeout(timer);
      if (tok !== tokenNav) return; /* navigasi kedaluwarsa tidak boleh mematikan garis muat milik yang baru */
      tertunda = false;
      garisMuat.classList.remove("aktif");
    };
    ambil(url.pathname).then(function (teks) {
      if (tok !== tokenNav) return null;
      const doc = new DOMParser().parseFromString(teks, "text/html");
      if (!cocokStruktur(doc)) throw new Error("struktur tidak cocok");
      if (dorong) { simpanPosisi(); history.pushState({ y: 0 }, "", url.pathname + url.hash); }
      const kerjakan = function () { if (tok !== tokenNav) return; tukar(doc); posisi(y); };
      if (document.startViewTransition && !kurangiGerak()) {
        const vt = document.startViewTransition(kerjakan);
        /* transisi yang dilewati oleh klik berikutnya menolak ready dan finished: tangkap supaya console bersih */
        if (vt.ready) vt.ready.catch(function () {});
        if (vt.finished) vt.finished.catch(function () {});
        return vt.updateCallbackDone.then(function () { if (tok === tokenNav) sesudahPindah(); });
      }
      kerjakan();
      if (tok === tokenNav) sesudahPindah();
      return null;
    }).then(selesai, function () {
      selesai();
      if (tok !== tokenNav) return;
      if (dorong) location.href = url.href; else location.reload();
    });
  }

  function pergiKe(href) {
    let u;
    try { u = new URL(href, location.href); } catch (e) { location.href = href; return; }
    if (adaNavigasi && tautanBolehDicegat(u.href, location.href, { sekarang: location.href })) pergi(u, true, null);
    else location.href = u.href;
  }

  if (adaNavigasi) {
    try { history.scrollRestoration = "manual"; } catch (e) { /* diabaikan */ }
    window.addEventListener("pagehide", simpanPosisi);

    document.addEventListener("click", function (e) {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      if (a.hasAttribute("data-zum")) {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) { e.preventDefault(); bukaZoom(a); }
        return;
      }
      if (!bisaDicegat(a, e)) return;
      e.preventDefault();
      pergi(new URL(a.href), true, null);
    });

    window.addEventListener("popstate", function (e) {
      if (!tertunda && location.pathname === halamanSekarang) return; /* hanya hash berubah: ditangani hashchange */
      pergi(new URL(location.href), false, e.state && typeof e.state.y === "number" ? e.state.y : null);
    });

    /* Ambil lebih awal: kursor diam 65 ms di tautan, atau fokus papan ketik */
    let timerPra = null;
    function pra(e) {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.hasAttribute("data-zum") || !bisaDicegat(a, null)) return;
      clearTimeout(timerPra);
      timerPra = setTimeout(function () { ambil(new URL(a.href).pathname).catch(function () {}); }, 65);
    }
    document.addEventListener("pointerover", pra);
    document.addEventListener("focusin", pra);
    document.addEventListener("pointerout", function () { clearTimeout(timerPra); });
    document.addEventListener("touchstart", function (e) {
      const a = e.target.closest && e.target.closest("a[href]");
      if (a && !a.hasAttribute("data-zum") && bisaDicegat(a, null)) ambil(new URL(a.href).pathname).catch(function () {});
    }, { passive: true });
  }

  /* ---------- keadaan awal ---------- */

  function initIsi() {
    pasangSalin();
    pasangToc();
    pasangCariBaru();
  }
  initIsi();
  if (kepalaDocs) kepalaDocs.classList.toggle("tergulir", window.scrollY > 4);
  if (!bukaSasaran() && adaNavigasi && history.state && typeof history.state.y === "number") window.scrollTo(0, history.state.y);
  tampakkanAktif();
})();
