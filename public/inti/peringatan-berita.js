"use strict";
/* Kartu "Peringatan dari berita" bersama semua halaman bencana (public/inti). Data: /banjir/data/peringatan_berita.json
   (scripts/umum/peringatan_berita.py). Butuh format.js ($, fmt, WIB). Pakai: PeringatanBerita.pasang("#wadah", "banjir")
   atau tanpa id bencana (/semua: semua bencana, tiap kartu berlabel bencana). Berkas gagal/kosong = wadah tetap kosong & hidden.
   ponytail: klik kartu tidak terbang ke peta (tiap halaman beda objek peta), tautan berita saja; tambah bila diminta. */
const PeringatanBerita = (() => {
  const MAKS = 10, CHUNK = 20;
  const NAMA = {karhutla: "Karhutla", banjir: "Banjir", gempa: "Gempa", gunungapi: "Gunung api", kekeringan: "Kekeringan", udara: "Kualitas udara", cuaca: "Cuaca ekstrem"};
  const url = u => { const s = String(u ?? "").trim(); return /^https?:\/\//i.test(s) ? s : ""; };
  const tgl = t => new Date(t).toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short"});
  const rentang = (a, b) => { const x = tgl(a), y = tgl(b); return x === y ? x : x + " sampai " + y; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const kata = s => String(s || "").replace(/_/g, " ");

  function kartu(p, semua) {
    const it = el("article", "pb-it"), ps = el("div", "pb-ps");
    if (semua) ps.append(el("span", "pb-pil", NAMA[p.bencana] || p.bencana));
    ps.append(el("span", "pb-pil " + (p.jenis === "peringatan" ? "p" : "k"), p.jenis === "peringatan" ? "peringatan" : "kejadian"));
    if (p.bahaya && p.bahaya !== p.bencana) ps.append(el("span", "pb-pil k", kata(p.bahaya)));
    ps.append(el("span", "pb-pil", "dari berita, belum diverifikasi"));
    const ss = (p.sumber || []).filter(s => url(s.url)), s0 = ss[0];
    const j = s0 ? el("a", "pb-jd", p.judul) : el("span", "pb-jd", p.judul);
    if (s0) { j.href = url(s0.url); j.target = "_blank"; j.rel = "noopener noreferrer"; }
    const n = el("div", "pb-ps"); n.append(el("span", "pb-n", fmt(p.n_sumber || ss.length || 1) + " media"));
    if (s0) n.append(el("span", "pb-wl", s0.sumber || ""));
    const wl = el("div", "pb-wl", (p.wilayah || []).join(", "));
    const wk = el("div", "pb-wl", p.mulai && p.selesai ? "Berlaku " + rentang(p.mulai, p.selesai) : "");
    it.append(n, ps, j, wl, wk);
    if (ss.length > 1) {
      const d = el("details"), ul = el("ul");
      d.append(el("summary", "", "Sumber lain (" + fmt(ss.length - 1) + ")"), ul);
      ss.slice(1).forEach(s => { const li = el("li"), a = el("a", "", s.judul || s.sumber || "berita"); a.href = url(s.url); a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a, el("span", "", s.sumber ? ", " + s.sumber : "")); ul.append(li); });
      it.append(d);
    }
    return it;
  }

  async function pasang(wadah, bencana) {
    const w = typeof wadah === "string" ? document.querySelector(wadah) : wadah;
    if (!w) return;
    let d;
    try { const r = await fetch("/banjir/data/peringatan_berita.json"); if (!r.ok) return; d = await r.json(); } catch (e) { return; }
    // satu berita yang menyebut beberapa kab = beberapa entri di data; di layar jadi satu kartu dengan wilayah digabung
    const g = new Map();
    (d.peringatan || []).filter(p => p.judul && new Date(p.selesai) > Date.now() && (!bencana || p.bencana === bencana)).forEach(p => {
      const k = p.bencana + "|" + p.jenis + "|" + p.judul, w = [p.kab, p.prov_nama].filter(Boolean).join(", ");
      if (g.has(k)) { const q = g.get(k); if (!q.wilayah.includes(w)) q.wilayah.push(w); q.n_sumber = Math.max(q.n_sumber || 0, p.n_sumber || 0); }
      else g.set(k, {...p, wilayah: [w]});
    });
    const a = [...g.values()];
    if (!a.length) return;
    const np = a.filter(p => p.jenis === "peringatan").length, nk = a.length - np, semua = !bencana;
    const h3 = el("h3"), isi = [];
    if (np) isi.push(["", np, " peringatan"]);
    if (nk) isi.push(["", nk, " kejadian"]);
    isi.forEach(([, n, t], i) => { if (i) h3.append(" dan "); h3.append(Object.assign(el("b"), {textContent: fmt(n)}), t); });
    h3.append(" aktif dari berita");
    const hd = el("div", "pb-hd"); hd.append(el("span", "pb-ey", "Peringatan dari berita"), h3);
    const bd = el("div", "pb-bd"), ft = el("div", "pb-ft");
    a.slice(0, MAKS).forEach(p => bd.append(kartu(p, semua)));
    ft.append(el("span", "", "Sumber: " + (d.sumber || "berita") + (d.dibuat ? ", diperbarui " + tgl(d.dibuat) : "")));
    // basi dihitung saat tampil (48 jam, sama dengan JAM_BASI di scripts/umum/peringatan_berita.py), bukan bendera beku dari build
    if (d.bahan_dibuat && Date.now() - new Date(d.bahan_dibuat) > 48 * 3600e3) ft.append(el("em", "", "berita terbaru diambil " + tgl(d.bahan_dibuat) + ", sebagian mungkin tidak lagi berlaku"));
    if (a.length > MAKS) {
      const b = el("button", "pb-lagi", "Lihat semua (" + fmt(a.length) + ")"); b.type = "button";
      b.onclick = () => { b.disabled = true; b.textContent = "Memuat…";
        // dua rAF: "Memuat…" sempat dicat dulu, lalu satu potongan per frame (nanti halaman = const, bukan window.nanti)
        const sesudahCat = f => requestAnimationFrame(() => requestAnimationFrame(f));
        let i = MAKS; const langkah = () => { const f = document.createDocumentFragment(); a.slice(i, i + CHUNK).forEach(p => f.append(kartu(p, semua))); bd.append(f); i += CHUNK; if (i < a.length) sesudahCat(langkah); else b.remove(); };
        sesudahCat(langkah); };
      ft.prepend(b);
    }
    w.classList.add("pb"); w.replaceChildren(hd, bd, ft); w.hidden = false;
  }
  return {pasang};
})();
