/* Dashboard pimpinan lintas bencana (PB-31; F-18, F-19). Skrip klasik tanpa inline (CSP), global window.PbPimpinan;
   PbPimpinan.pasang(host, opsi) di atas DasborA (seksi kiri dibangun DasborA dari kartu .ex-std di host). Rute: GET /api/pb/ringkas (kontrak: src/pb_ringkas.js).
   Satu kartu per bencana: status berkas ringkas (segar, basi, mati, belum tersedia) apa adanya, angka bersumber, operasi {nilai, sumber, waktu}.
   Angka antarsumber tidak dijumlah; tanpa hitungan ulang. Q14: saringan jenis jamak (pil), disaring di klien dari satu muatan. Q15 (mode TV) dan Q16 (garis target) tidak dibuat.
   Teks selalu lewat textContent; sumber dan waktu hanya di title. Chrome kontrol urgent; kartu digambar di rAF sesudah data tiba (INP). */
(g => {
  "use strict";
  const GALAT = {401: "Masuk dulu untuk melihat dashboard pimpinan.", 403: "Akun ini tidak berhak melihat dashboard pimpinan di wilayah ini.", 404: "Dashboard pimpinan belum menyala.", 429: "Terlalu cepat; tunggu beberapa saat."};
  const IK = {kartu: "M4 5h16v14H4z|M4 10h16", muat: "M20 12a8 8 0 1 1-2.3-5.7|M20 4v5h-5", semua: "M4 6h16|M4 12h16|M4 18h10", data: "M4 19V9|M10 19V5|M16 19v-7|M22 19H2", tindak: "M5 12l5 5L20 7", sk: "M6 3h9l4 4v14H6z|M9 12h7|M9 16h7"};
  const OPERASI = [["renlap_terbit_hari_ini", "Renlap terbit hari ini", "renlap"], ["renlap_terbit_30h", "Renlap terbit 30 hari", "renlap"], ["kepatuhan_persen", "Kepatuhan renlap (persen)", "persen"],
    ["tindakan_terbuka", "Tindakan terbuka", "ttp"], ["sk_berlaku", "SK status darurat berlaku", "sk"], ["sk_berakhir_7h", "SK akan berakhir dalam 7 hari", "sk"]];
  const STATUS = {segar: "Data segar", basi: "Data basi", mati: "Data mati", belum_tersedia: "Belum tersedia"};

  /* ---- inti murni (diuji node) ---- */
  const tgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? ""); return m ? m[3] + "-" + m[2] + "-" + m[1] : "belum tersedia"; };
  const angkaTeks = n => n === null || n === undefined || typeof n !== "number" || !isFinite(n) ? "belum tersedia" : n.toLocaleString("id-ID");
  const statusBerkas = r => !r ? "belum_tersedia" : STATUS[r.status] ? r.status : r.basi ? "basi" : "segar";
  const hipotesis = r => !!r && r.prospektif?.hipotesis === true;   // null = belum ditetapkan, bukan hipotesis; angka observasi tidak berlabel
  const urlRingkas = prov => "/api/pb/ringkas" + (prov ? "?" + new URLSearchParams({prov}) : "");
  const galatRamah = (status, j) => (j && j.galat) || GALAT[status] || "Gagal (kode " + status + ").";
  const bencanaNama = (reg, id) => (reg?.bencana ?? []).find(b => b.id === id)?.nama || id;
  /* baris angka berkas ringkas: tiap angka dengan sumber dan arti dari angka_meta; nol tetap nol, null tampil belum tersedia */
  const barisAngka = r => Object.entries(r?.angka ?? {}).map(([k, v]) => { const m = r.angka_meta?.[k] || {};
    return {nama: k.replace(/_/g, " "), teks: typeof v === "number" || v === null ? angkaTeks(v) : "belum tersedia", satuan: m.satuan || "", title: [m.arti, m.sumber ? "sumber " + m.sumber : "", m.waktu ? "waktu " + tgl(m.waktu) : ""].filter(Boolean).join(", ")}; });
  const barisOperasi = op => OPERASI.map(([k, nama]) => { const a = op?.[k]; return {nama, teks: angkaTeks(a?.nilai), title: a ? [a.sumber ? "sumber " + a.sumber : "", a.waktu ? "waktu " + a.waktu : ""].filter(Boolean).join(", ") : ""}; });
  /* saringan jamak: set kosong = semua; urutan tampil mengikuti registri */
  const terpilih = (bencana, pilih) => pilih.size ? bencana.filter(b => pilih.has(b.id)) : bencana;
  const ganti = (pilih, id) => { const s = new Set(pilih); if (id === "") s.clear(); else if (s.has(id)) s.delete(id); else s.add(id); return s; };

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const ikon = k => { const s = document.createElementNS(NS, "svg"); for (const [a, v] of [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"]]) s.setAttribute(a, v);
    for (const d of IK[k].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const tombol = (k, teks, kelas) => { const b = el("button", kelas || ""); b.type = "button"; b.append(ikon(k), el("span", null, teks)); return b; };
  const kartu = (nama, ik, isi) => { const a = el("article", "ex ex-std"), h = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3"); h3.append(ikon(ik), document.createTextNode(nama)); jd.append(h3); h.append(jd);
    const bd = el("div", "ex-bd"); bd.append(...isi); a.append(h, bd); return a; };
  const tabel = (kepala, baris) => { const t = el("table"), th = el("thead"), tr = el("tr"); for (const k of kepala) tr.append(el("th", null, k)); th.append(tr); t.append(th);
    const tb = el("tbody"); for (const b of baris) { const r = el("tr"); b.forEach((c, i) => { const td = el("td", i === 0 ? "ops-kiri" : null, c.teks ?? c); if (c.title) td.title = c.title; r.append(td); }); tb.append(r); } t.append(tb);
    const w = el("div", "tw ops-tw ex-tabel"); w.append(t); return w; };
  const pil = (teks, kelas) => el("span", "pm-pil " + kelas, teks);

  function kartuBencana(b, reg) {
    const r = b.ringkas, st = statusBerkas(r), isi = [];
    const kepala = el("div", "pm-st"); kepala.append(pil(STATUS[st], "pm-" + st));
    if (r?.data_sampai) { const d = el("span", "pm-ket", "data sampai " + tgl(r.data_sampai)); d.title = r.data_sampai; kepala.append(d); }
    if (hipotesis(r)) { const h = pil("Hipotesis", "pm-hipotesis"); h.title = "Model belum punya uji balik prospektif"; kepala.append(h); }
    isi.push(kepala);
    const a = barisAngka(r);
    isi.push(a.length ? tabel(["Angka", "Nilai", "Satuan"], a.map(x => [{teks: x.nama, title: x.title}, x.teks, x.satuan])) : el("p", "ops-kosong", "Berkas ringkas bencana ini belum tersedia."));
    isi.push(tabel(["Operasi", "Nilai"], barisOperasi(b.operasi).map(x => [{teks: x.nama, title: x.title}, x.teks])));
    const k = kartu(bencanaNama(reg, b.id), b.id === "karhutla" ? "tindak" : "data", isi); k.dataset.bencana = b.id; return k;
  }

  /* pasang(host, {registri?, prov?, provDaftar?: [[kode,nama]], ambil?}) -> {muat, gantiProv, tutup} */
  function pasang(host, o = {}) {
    const ambil = o.ambil || (g.fetch ? g.fetch.bind(g) : null);
    const S = {tutup: false, reg: o.registri || null, data: null, pilih: new Set(), sibuk: 0};
    const provDaftar = o.provDaftar || Object.entries(g.S?.meta?.provinsi || {});
    const api = async jalur => { const r = await ambil(jalur, {credentials: "same-origin"}); let j = null; try { j = await r.json(); } catch (e) {} return {ok: r.ok, status: r.status, j}; };
    const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);

    const selProv = el("select"); for (const [v, t] of [["", "Semua provinsi"], ...provDaftar]) { const x = el("option", null, t); x.value = v; selProv.append(x); } selProv.value = o.prov || "";
    const lab = el("label", "pb-f"); lab.append(el("span", null, "Provinsi"), selProv);
    const muatB = tombol("muat", "Muat ulang", "pb-sekunder"), aksi = el("div", "pb-aksi"); aksi.append(muatB);
    const seg = el("div", "pb-seg pm-seg"), status = el("p", "pb-status"), ket = el("p", "pb-ket"), grid = el("div", "pm-grid");
    status.setAttribute("role", "status"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Jenis bencana");
    const kendali = el("div", "pb-form"); kendali.append(lab);
    host.classList.add("pb-titik"); host.replaceChildren(kartu("Pilihan tampilan", "kartu", [kendali, seg, aksi, status, ket]), grid);

    const pilBencana = () => { const daftar = [["", "Semua bencana"], ...(S.data?.bencana ?? []).map(b => [b.id, bencanaNama(S.reg, b.id)])];
      seg.replaceChildren(...daftar.map(([v, t]) => { const b = tombol(v ? "data" : "semua", t); b.dataset.jenis = v; b.setAttribute("aria-pressed", String(v === "" ? !S.pilih.size : S.pilih.has(v))); return b; })); };
    const tandai = () => seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.jenis === "" ? !S.pilih.size : S.pilih.has(b.dataset.jenis))));
    function gambar() {
      if (S.tutup || !S.data) return;
      const daftar = terpilih(S.data.bencana ?? [], S.pilih);
      ket.textContent = S.data.terpotong ? "Daftar SK dipotong 500 baris; persempit provinsi." : "";
      if (!daftar.length) return grid.replaceChildren(el("p", "ops-kosong", "Tidak ada bencana untuk pilihan ini."));
      grid.replaceChildren(...daftar.map(b => kartuBencana(b, S.reg)));
      g.DasborA?.kaki?.(daftar.map(b => [{segar: "#2e8b57", basi: "#c98a00", mati: "#c0392b", belum_tersedia: "#7a869a"}[statusBerkas(b.ringkas)], bencanaNama(S.reg, b.id), STATUS[statusBerkas(b.ringkas)].replace("Data ", "")]));
    }
    async function muat() {
      if (S.tutup) return;
      const n = ++S.sibuk; status.textContent = "Memuat...";
      const r = await api(urlRingkas(selProv.value));
      if (S.tutup || n !== S.sibuk) return;
      if (!r.ok) { S.data = null; status.textContent = galatRamah(r.status, r.j); return nanti(() => grid.replaceChildren()); }
      S.data = r.j; status.textContent = ""; nanti(() => { pilBencana(); gambar(); });
    }
    /* handler hanya ubah atribut; kerja berat ditunda */
    seg.addEventListener("click", e => { const b = e.target.closest("button[data-jenis]"); if (!b) return; S.pilih = ganti(S.pilih, b.dataset.jenis); tandai(); nanti(gambar); });
    selProv.addEventListener("change", muat); muatB.addEventListener("click", muat);
    const mulai = () => muat();
    if (S.reg) mulai(); else api("/bencana.json").then(r => { if (S.tutup) return; S.reg = r.j; mulai(); });
    const gantiProv = p => { if (selProv.value === (p || "")) return; selProv.value = p || ""; muat(); };
    return {muat, gantiProv, tutup() { S.tutup = true; host.replaceChildren(); }, _S: S};
  }

  g.PbPimpinan = {tgl, angkaTeks, statusBerkas, hipotesis, urlRingkas, galatRamah, bencanaNama, barisAngka, barisOperasi, terpilih, ganti, pasang};
})(typeof window !== "undefined" ? window : globalThis);
