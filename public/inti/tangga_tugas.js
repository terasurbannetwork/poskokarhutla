/* Checklist tangga tindakan per peringatan aktif (PB-27; F-15). Skrip klasik tanpa inline (CSP), global window.PbTangga;
   PbTangga.pasang(host, {peringatan: kunci peringatan aktif, bisaTulis, ambil?}). Rute: GET/POST /api/pb/tindakan (kontrak: src/pb_isian.js).
   Daftar butir datang dari server (tindakanUntuk); tanpa hak tulis kontrol tidak digambar, hanya daftar. Pelaksana = peran, bukan nama orang.
   Batas bawaan Q20 (BAWAAN SEMENTARA) diisi server. Teks selalu lewat textContent; handler hanya ubah atribut, kerja berat ditunda. */
(g => {
  "use strict";
  const PELAKSANA = [["", "Pelaksana belum ditentukan"], ["warga", "Warga"], ["pusdalops", "Pusdalops"], ["bpbd", "BPBD"], ["regu", "Regu lapangan"]];
  const GALAT = {401: "Masuk dulu untuk melihat tangga tindakan.", 403: "Akun ini tidak berhak melihat tangga tindakan peringatan ini.", 404: "Peringatan tidak aktif atau belum punya daftar tindakan.", 429: "Terlalu cepat; tunggu beberapa saat."};
  const IK = {cek: "M4 6l2 2 4-4|M13 6h7|M4 14l2 2 4-4|M13 14h7", muat: "M20 12a8 8 0 1 1-2.3-5.7|M20 4v5h-5"};
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  /* ---- inti murni (diuji node) ---- */
  const urlTindakan = kunci => "/api/pb/tindakan?" + new URLSearchParams({peringatan: kunci});
  const labelPelaksana = p => (PELAKSANA.find(([v]) => v === p) || [])[1] || "Pelaksana belum ditentukan";
  const batasTeks = ms => { if (!Number.isInteger(ms)) return "belum tersedia"; const d = new Date(ms + 7 * 36e5); return d.getUTCDate() + " " + BULAN[d.getUTCMonth()] + " " + String(d.getUTCHours()).padStart(2, "0") + "." + String(d.getUTCMinutes()).padStart(2, "0") + " WIB"; };
  /* batas lewat hanya untuk butir belum selesai */
  const terlambat = (b, kini) => !b.selesai && Number.isInteger(b.batas) && b.batas < kini;
  const hitung = butir => ({selesai: butir.filter(b => b.selesai).length, total: butir.length});
  const nilaiBatas = ms => Number.isInteger(ms) ? new Date(ms + 7 * 36e5).toISOString().slice(0, 16) : "";    // datetime-local di WIB
  const dariBatas = s => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s ?? ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 7 * 36e5 : null; };
  /* badan POST: pelaksana "" dikirim kosong (tetap/ kosongkan di server); batas hanya bila terisi */
  const badanSimpan = (kunci, b, selesai, pelaksana, batas) => ({peringatan: kunci, butir: b.no, selesai, pelaksana: pelaksana ?? b.pelaksana ?? "", ...(batas != null ? {batas} : {})});
  const galatRamah = (status, j) => (j && j.galat) || GALAT[status] || "Gagal (kode " + status + ").";

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const ikon = k => { const s = document.createElementNS(NS, "svg"); for (const [a, v] of [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"]]) s.setAttribute(a, v);
    for (const d of IK[k].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const kartu = (nama, ik, isi) => { const a = el("article", "ex ex-std"), h = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3"); h3.append(ikon(ik), document.createTextNode(nama)); jd.append(h3); h.append(jd);
    const bd = el("div", "ex-bd"); bd.append(...isi); a.append(h, bd); return a; };

  /* pasang(host, {peringatan, bisaTulis, ambil?}) -> {muat, tutup} */
  function pasang(host, o = {}) {
    const ambil = o.ambil || (g.fetch ? g.fetch.bind(g) : null), kunci = o.peringatan?.kunci ?? o.peringatan;
    const S = {tutup: false, butir: [], sibuk: 0};
    const api = async (jalur, opsi) => { const r = await ambil(jalur, {credentials: "same-origin", ...opsi}); let j = null; try { j = await r.json(); } catch (e) {} return {ok: r.ok, status: r.status, j}; };
    const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);
    const status = el("p", "pb-status"); status.setAttribute("role", "status");
    const ringkas = el("p", "pb-ket"), daftar = el("div", "pb-tangga");
    host.classList.add("pb-titik"); host.replaceChildren(kartu("Tangga tindakan", "cek", [status, ringkas, daftar]));

    function gambar() {
      if (S.tutup) return;
      if (!S.butir.length) { ringkas.textContent = ""; return daftar.replaceChildren(el("p", "ops-kosong", "Belum ada daftar tindakan untuk peringatan ini.")); }
      const h = hitung(S.butir), kini = Date.now(); ringkas.textContent = h.selesai + " dari " + h.total + " tindakan selesai.";
      daftar.replaceChildren(...S.butir.map(b => {
        const baris = el("div", "pb-tindakan"); baris.dataset.no = b.no;
        const cek = el("input"); cek.type = "checkbox"; cek.checked = !!b.selesai; cek.disabled = !o.bisaTulis; cek.setAttribute("aria-label", b.teks);
        const teks = el("span", null, b.teks), ket = el("span", "pb-ket", labelPelaksana(b.pelaksana) + ", batas " + batasTeks(b.batas) + (terlambat(b, kini) ? ", lewat batas" : ""));
        const kiri = el("label", "pb-f"); kiri.append(cek, teks); baris.append(kiri);
        if (o.bisaTulis) {
          const sel = el("select"); for (const [v, t] of PELAKSANA) { const x = el("option", null, t); x.value = v; sel.append(x); } sel.value = b.pelaksana ?? "";
          const bts = el("input"); bts.type = "datetime-local"; bts.value = nilaiBatas(b.batas); bts.setAttribute("aria-label", "Batas waktu");
          cek.dataset.aksi = "selesai"; sel.dataset.aksi = "pelaksana"; bts.dataset.aksi = "batas"; baris.append(sel, bts);
        } else baris.append(ket);
        return baris;
      }));
    }
    async function muat() {
      if (S.tutup) return;
      const n = ++S.sibuk; status.textContent = "Memuat...";
      const r = await api(urlTindakan(kunci));
      if (S.tutup || n !== S.sibuk) return;
      if (!r.ok) { S.butir = []; status.textContent = galatRamah(r.status, r.j); return nanti(gambar); }
      S.butir = r.j.tersedia === false ? [] : r.j.butir || [];
      status.textContent = r.j.tersedia === false ? "Catatan tindakan belum aktif di server." : ""; nanti(gambar);
    }
    async function simpan(baris, aksi) {
      const b = S.butir.find(x => x.no === +baris.dataset.no); if (!b) return;
      const [cek, sel, bts] = baris.querySelectorAll("input[type=checkbox],select,input[type=datetime-local]");
      const r = await api("/api/pb/tindakan", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(badanSimpan(kunci, b, cek.checked, sel.value, aksi === "batas" ? dariBatas(bts.value) : null))});
      if (S.tutup) return;
      if (!r.ok) { status.textContent = galatRamah(r.status, r.j); return muat(); }
      Object.assign(b, {selesai: r.j.selesai, pelaksana: r.j.pelaksana, batas: r.j.batas}); status.textContent = ""; nanti(gambar);
    }
    /* handler hanya baca atribut; simpan jalan di tugas berikutnya */
    daftar.addEventListener("change", e => { const a = e.target.dataset?.aksi, baris = e.target.closest("[data-no]"); if (a && baris) setTimeout(() => simpan(baris, a), 0); });
    muat();
    return {muat, tutup() { S.tutup = true; host.replaceChildren(); }, _S: S};
  }

  g.PbTangga = {PELAKSANA, urlTindakan, labelPelaksana, batasTeks, terlambat, hitung, nilaiBatas, dariBatas, badanSimpan, galatRamah, pasang};
})(typeof window !== "undefined" ? window : globalThis);
