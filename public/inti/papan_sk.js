/* Papan SK status darurat lintas bencana (PB-29; F-20). Skrip klasik tanpa inline (CSP), global window.PbPapanSk;
   PbPapanSk.pasang(host, opsi) siap dipasang di /bnpb/siaga. Rute: GET /api/pb/papan-sk (kontrak: src/pb_ringkas.js).
   Papan hanya membaca SK yang tercatat di logbook; status tidak pernah disimpulkan dari model. Tanggal selesai kosong tampil apa adanya.
   Teks selalu lewat textContent. Chrome kontrol urgent (atribut saja); tabel digambar di rAF sesudah data tiba (INP). */
(g => {
  "use strict";
  const MAKS_BARIS = 100;
  const GALAT = {401: "Masuk dulu untuk melihat papan status darurat.", 403: "Akun ini tidak berhak melihat papan status darurat di wilayah ini.", 404: "Papan status darurat belum menyala.", 429: "Terlalu cepat; tunggu beberapa saat."};
  const IK = {papan: "M4 5h16v14H4z|M4 10h16|M10 10v9", muat: "M20 12a8 8 0 1 1-2.3-5.7|M20 4v5h-5", daftar: "M4 6h16|M4 12h16|M4 18h10"};
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  /* ---- inti murni (diuji node) ---- */
  const tgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? ""); return m ? +m[3] + " " + BULAN[+m[2] - 1] + " " + m[1] : "belum tersedia"; };
  const sisaTeks = n => n === null || n === undefined ? "belum tersedia" : n < 0 ? "lewat " + Math.abs(n) + " hari" : n === 0 ? "berakhir hari ini" : n + " hari";
  const penanda = s => s.sinyal === "akan_berakhir" ? "Akan berakhir" : s.sinyal === "tanpa_tanggal_selesai" ? "Tanpa tanggal selesai" : "";
  const wilayahTeks = (s, prov) => s.wilayah === "kab" ? "Kab/kota " + (s.kab || "belum tersedia") + ", " + (prov?.[s.prov] || "provinsi " + s.prov) : prov?.[s.prov] || "Provinsi " + (s.prov || "belum tersedia");
  const bencanaNama = (reg, id) => (reg?.bencana ?? []).find(b => b.id === id)?.nama || id;
  const pilihBencana = reg => (reg?.bencana ?? []).map(b => [b.id, b.nama || b.id]);
  /* kolom tabel; urutan = urutan server (tmt_selesai naik di dalam, SK provinsi didahulukan) */
  const barisSk = (s, reg, prov) => [bencanaNama(reg, s.bencana), "Tingkat " + (s.tingkat ?? "belum tersedia"), wilayahTeks(s, prov), s.nomor || "belum tersedia", tgl(s.tmt_mulai), s.tmt_selesai ? tgl(s.tmt_selesai) : "belum tersedia", sisaTeks(s.sisa_hari), penanda(s)];
  const hitungBerakhir = sk => sk.filter(s => s.sinyal === "akan_berakhir").length;
  const urlPapan = (bencana, prov) => "/api/pb/papan-sk" + (bencana || prov ? "?" + new URLSearchParams({...(bencana ? {bencana} : {}), ...(prov ? {prov} : {})}) : "");
  const galatRamah = (status, j) => (j && j.galat) || GALAT[status] || "Gagal (kode " + status + ").";

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const ikon = k => { const s = document.createElementNS(NS, "svg"); for (const [a, v] of [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"]]) s.setAttribute(a, v);
    for (const d of IK[k].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const tombol = (k, teks, kelas) => { const b = el("button", kelas || ""); b.type = "button"; b.append(ikon(k), el("span", null, teks)); return b; };
  const kartu = (nama, ik, isi) => { const a = el("article", "ex ex-std"), h = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3"); h3.append(ikon(ik), document.createTextNode(nama)); jd.append(h3); h.append(jd);
    const bd = el("div", "ex-bd"); bd.append(...isi); a.append(h, bd); return a; };
  const tabel = (kepala, baris) => { const t = el("table"), th = el("thead"), tr = el("tr"); for (const k of kepala) tr.append(el("th", null, k)); th.append(tr); t.append(th);
    const tb = el("tbody"); for (const b of baris) { const r = el("tr"); b.forEach((c, i) => r.append(el("td", i === 0 ? "ops-kiri" : null, c))); tb.append(r); } t.append(tb);
    const w = el("div", "tw ops-tw ex-tabel"); w.append(t); return w; };

  /* pasang(host, {registri?, prov?, provDaftar?: [[kode,nama]], bencana?, ambil?}) -> {muat, tutup} */
  function pasang(host, o = {}) {
    const ambil = o.ambil || (g.fetch ? g.fetch.bind(g) : null);
    const S = {tutup: false, reg: o.registri || null, sk: [], terpotong: false, batas: MAKS_BARIS, sibuk: 0};
    const provDaftar = o.provDaftar || Object.entries(g.S?.meta?.provinsi || {}), namaProv = Object.fromEntries(provDaftar);
    const api = async jalur => { const r = await ambil(jalur, {credentials: "same-origin"}); let j = null; try { j = await r.json(); } catch (e) {} return {ok: r.ok, status: r.status, j}; };
    const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);

    const pilihan = (nilai, daftar) => { const s = el("select"); for (const [v, t] of daftar) { const x = el("option", null, t); x.value = v; s.append(x); } s.value = nilai; return s; };
    const bidang = (teks, kontrol) => { const l = el("label", "pb-f"); l.append(el("span", null, teks), kontrol); return l; };
    const selBen = pilihan(o.bencana || "", [["", "Semua bencana"]]), selProv = pilihan(o.prov || "", [["", "Semua provinsi"], ...provDaftar]);
    const muatB = tombol("muat", "Muat ulang", "pb-sekunder");
    const grid = el("div", "pb-form"); grid.append(bidang("Bencana", selBen), bidang("Provinsi", selProv));
    const aksi = el("div", "pb-aksi"); aksi.append(muatB);
    const status = el("p", "pb-status"); status.setAttribute("role", "status");
    const ringkas = el("p", "pb-ket"), wadah = el("div", "pb-tabel");
    host.classList.add("pb-titik"); host.replaceChildren(kartu("Papan SK status darurat", "papan", [grid, aksi, status, ringkas, wadah]));

    const isiBen = () => { const lama = selBen.value;
      selBen.replaceChildren(...[["", "Semua bencana"], ...pilihBencana(S.reg)].map(([v, t]) => { const x = el("option", null, t); x.value = v; return x; })); selBen.value = pilihBencana(S.reg).some(([v]) => v === lama) ? lama : ""; };

    function gambar() {
      if (S.tutup) return;
      if (!S.sk.length) { ringkas.textContent = ""; return wadah.replaceChildren(el("p", "ops-kosong", "Tidak ada SK status darurat yang tercatat berlaku untuk pilihan ini.")); }
      const nb = hitungBerakhir(S.sk);
      ringkas.textContent = S.sk.length.toLocaleString("id-ID") + " SK tercatat berlaku, " + nb.toLocaleString("id-ID") + " akan berakhir dalam 7 hari." + (S.terpotong ? " Daftar dipotong 500 baris; persempit pilihan." : "");
      const isi = [tabel(["Bencana", "Jenis status", "Wilayah", "Nomor SK", "Mulai", "Selesai", "Sisa hari", "Penanda"], S.sk.slice(0, S.batas).map(s => barisSk(s, S.reg, namaProv)))];
      if (S.sk.length > S.batas) { const l = tombol("daftar", "Tampilkan lagi (" + (S.sk.length - S.batas).toLocaleString("id-ID") + " baris)", "pb-sekunder"); l.dataset.lagi = "1"; isi.push(l); }
      wadah.replaceChildren(...isi);
    }
    async function muat() {
      if (S.tutup) return;
      const n = ++S.sibuk; status.textContent = "Memuat..."; S.batas = MAKS_BARIS;
      const r = await api(urlPapan(selBen.value, selProv.value));
      if (S.tutup || n !== S.sibuk) return;
      if (!r.ok) { S.sk = []; S.terpotong = false; status.textContent = galatRamah(r.status, r.j); return nanti(gambar); }
      S.sk = r.j.tersedia === false ? [] : r.j.sk || []; S.terpotong = !!r.j.terpotong;
      status.textContent = r.j.tersedia === false ? "Catatan SK belum aktif di server." : ""; nanti(gambar);
    }

    /* handler hanya ubah atribut/nilai; kerja berat ditunda */
    selBen.addEventListener("change", muat); selProv.addEventListener("change", muat); muatB.addEventListener("click", muat);
    wadah.addEventListener("click", e => { if (e.target.closest("[data-lagi]")) { S.batas += MAKS_BARIS; nanti(gambar); } });

    const mulai = () => { isiBen(); muat(); };
    if (S.reg) mulai(); else api("/bencana.json").then(r => { if (S.tutup) return; S.reg = r.j; mulai(); });
    /* pemasang luar (mis. pilihan provinsi /bnpb/siaga) mengganti provinsi tanpa membangun ulang kartu */
    const gantiProv = p => { if (selProv.value === (p || "")) return; selProv.value = p || ""; muat(); };
    return {muat, gantiProv, tutup() { S.tutup = true; host.replaceChildren(); }, _S: S};
  }

  g.PbPapanSk = {tgl, sisaTeks, penanda, wilayahTeks, bencanaNama, pilihBencana, barisSk, hitungBerakhir, urlPapan, galatRamah, pasang};
})(typeof window !== "undefined" ? window : globalThis);
