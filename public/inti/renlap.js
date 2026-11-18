/* Renlap lintas bencana (PB-18; F-1, F-3, F-5). Skrip klasik tanpa inline (CSP), global window.PbRenlap; juga dimuat node untuk uji (tests/layar/pb_renlap.test.mjs).
   Rute: GET/POST /api/pb/renlap, POST /api/pb/renlap/terbit dan /selesai-tandai, GET /api/pb/renlap/berkas?id&fmt, POST /api/pb/hasil, GET /api/pb/kepatuhan. Kontrak: src/pb_isian.js.
   Tiga kartu .ex-std (kepala = nama seksi): Renlap, Hasil tindakan, Kepatuhan. Teks selalu lewat textContent. PDF belum ada: tidak ada tombolnya.
   Chrome kontrol urgent (atribut saja); tabel digambar di rAF sesudah data tiba (INP). Hak tulis diputuskan server. Tanpa data contoh: kosong = "Belum ada". */
(g => {
  "use strict";
  const TAHAN_MINTA = 30 * 60e3, MAKS_BARIS = 100, MAKS_BUTIR = 100;
  /* kode alasan CHECK 0130 sudah_aman tidak pernah tampil apa adanya: kata "aman" dilarang, labelnya "tidak diperlukan lagi" */
  const ALASAN = {akses_terputus: "Akses terputus", cuaca: "Cuaca", sarana_kurang: "Sarana kurang", warga_menolak: "Warga menolak", sudah_aman: "Tidak diperlukan lagi", lokasi_salah: "Lokasi salah", lainnya: "Lainnya", tanpa_alasan: "Tanpa alasan"};
  const HASIL = {selesai: "Selesai", sebagian: "Sebagian", belum: "Belum", eskalasi: "Eskalasi"};
  const STATUS = {diminta: "Diminta, diproses", draf: "Draf", terbit: "Terbit", selesai: "Selesai", gagal: "Gagal", dibatalkan: "Dibatalkan"};
  const WARNA = {diminta: "#b7791f", draf: "#7a8699", terbit: "#1b5fa8", selesai: "#1f8a4c", gagal: "#c0392b", dibatalkan: "#7a8699"};
  const GALAT = {401: "Masuk dulu untuk mengelola renlap.", 403: "Akun ini tidak berhak di wilayah ini.", 404: "Renlap belum menyala untuk bencana ini, atau tidak ditemukan.", 409: "Status renlap sudah berubah atau permintaan masih diproses; muat ulang.", 422: "Isian ditolak server.", 429: "Terlalu cepat; tunggu beberapa menit lalu coba lagi.", 503: "Fitur renlap belum aktif di server."};
  const IK = {renlap: "M4 4h16v16H4z|M8 9h8|M8 13h8|M8 17h5", hasil: "M5 12l4 4 10-10", patuh: "M4 20V10|M10 20V4|M16 20v-7|M22 20H2", minta: "M12 5v14|M5 12h14", unduh: "M12 4v11|M7 11l5 5 5-5|M5 20h14", salin: "M8 8h11v12H8z|M5 16V4h11", terbit: "M4 12l16-8-6 16-3-7z", selesai: "M5 12l4 4 10-10", muat: "M4 12a8 8 0 1 0 3-6|M4 4v5h5", simpan: "M5 4h12l3 3v13H5z|M8 4v6h8V4|M8 20v-6h8v6", lagi: "M4 6h16|M4 12h16|M4 18h10", tindakan: "M9 11l3 3 8-8|M20 12v7H4V5h11"};

  /* ---- inti murni (diuji node) ---- */
  const hariWib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
  const labelAlasan = k => ALASAN[k] || (k == null ? "" : "Lainnya");
  /* diminta lebih dari 30 menit = mesin tak menjawab: "Gagal, ulangi" (dihitung saat baca, sama dengan jendela ulang server) */
  const statusEfektif = (r, kini) => r.status === "diminta" && kini - r.dibuat > TAHAN_MINTA ? "gagal_ulang" : r.status;
  const labelStatus = (r, kini) => { const s = statusEfektif(r, kini); return s === "gagal_ulang" ? "Gagal, ulangi" : STATUS[s] || s; };
  const warnaStatus = (r, kini) => WARNA[statusEfektif(r, kini) === "gagal_ulang" ? "gagal" : r.status] || WARNA.draf;
  const bisaUnduh = r => ["draf", "terbit", "selesai"].includes(r.status);
  const FORMAT = [["kml", "KML"], ["gpx", "GPX"], ["json", "JSON"]];
  const rpSatu = n => new Intl.NumberFormat("id-ID").format(n);
  const persen = p => p == null ? "–" : String(p).replace(".", ",") + " persen";
  /* target berurut: base[].patroli[] diratakan, nomor 1.. sesuai urutan (sama dengan KML/GPX/teks WA); nama dari tempat, kec, lalu nama */
  function targetDari(j) {
    const hasil = []; let no = 0;
    for (const b of (j && j.base) || []) for (const c of b.patroli || []) { no++; hasil.push({no, nama: String(c.tempat || c.kec || c.nama || "Target " + no).slice(0, 80), base: b.nama || ""}); }
    return hasil;
  }
  /* badan POST /api/pb/hasil dari baris isian yang diubah; alasan hanya bila tidak didatangi (server menolak selain itu) */
  function butirDari(baris, urut) {
    const susun = t => { const a = [...t]; if (urut) a.sort((p, q) => urut.indexOf(p) - urut.indexOf(q)); return a; };
    return baris.map(x => { const d = x.didatangi === "1" ? true : x.didatangi === "0" ? false : null;
      const o = {target_no: x.no, didatangi: d}; if (d === false && x.alasan) o.alasan = x.alasan; if (x.hasil) o.hasil = x.hasil; const c = String(x.catatan || "").trim(); if (c) o.catatan = c.slice(0, 200); if (x.tindakan) o.tindakan = susun(x.tindakan); return o; });
  }
  /* catatan keselamatan: teks tetap; isi renlap.json (huruf besar dari mesin) tidak ditampilkan apa adanya */
  const catatanDari = () => "Usulan lokasi untuk dilihat, bukan perintah terbang. Skor hipotesis.";
  const potong = (daftar, n) => { const h = []; for (let i = 0; i < daftar.length; i += n) h.push(daftar.slice(i, i + n)); return h; };
  /* persen kejadian logbook yang mencatat tindakan ini; null bila bencana tak ada di logbook */
  const persenLogbook = (lb, id, kode) => { const j = lb && lb.jenis && lb.jenis[id]; if (!j || !j.n) return null; const h = (j.tindakan || {})[kode] || 0; return Math.round(h / j.n * 100); };   // bilangan bulat: asalnya pencocokan kata kunci
  const ringkasKepatuhan = (k, tdk) => ({tindakan: Object.entries(k.per_tindakan || {}).map(([c, n]) => [((tdk || []).find(t => t[0] === c) || [c, c])[1], n]).sort((x, y) => y[1] - x[1]),
    didatangi: k.didatangi || 0, target: k.target || 0, belum_diisi: k.belum_diisi || 0, persen: k.persen,
    tidak: Object.entries(k.per_alasan || {}).map(([a, n]) => [labelAlasan(a), n]).sort((x, y) => y[1] - x[1]), tidakJumlah: Object.values(k.per_alasan || {}).reduce((t, n) => t + n, 0)});
  const galatRamah = (status, j) => (j && j.galat) || GALAT[status] || "Gagal (kode " + status + ").";

  /* logbook tindakan: satu promise per muat halaman; gagal tidak di-cache */
  let lbJanji = null;
  const logbook = ambil => lbJanji ||= ambil("/data/bnpb/logbook_tindakan.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => { if (!j) lbJanji = null; return j; });

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const ikon = k => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    for (const d of IK[k].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const tombol = (k, teks, kelas) => { const b = el("button", kelas || ""); b.type = "button"; b.append(ikon(k), el("span", null, teks)); return b; };
  const kartu = (nama, ik, isi) => { const a = el("article", "ex ex-std"), h = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3"); h3.append(ikon(ik), document.createTextNode(nama)); jd.append(h3); h.append(jd);
    const bd = el("div", "ex-bd"); bd.append(...isi); a.append(h, bd); return a; };
  const pilihan = (nilai, daftar) => { const s = el("select"); for (const [v, t] of daftar) { const o = el("option", null, t); o.value = v; s.append(o); } s.value = nilai; return s; };
  const bidang = (teks, kontrol) => { const l = el("label", "pb-f"); l.append(el("span", null, teks), kontrol); return l; };
  const masukan = (tipe, ket, maks) => { const i = el("input"); i.type = tipe; if (ket) i.placeholder = ket; if (maks) i.maxLength = maks; i.autocomplete = "off"; return i; };

  /* pasang(host, {bencana, prov?, provDaftar?, ambil?, kini?}) -> {muat, tutup} */
  function pasang(host, o) {
    const ambil = o.ambil || (g.fetch ? g.fetch.bind(g) : null), kini = o.kini || Date.now;
    const S = {tutup: false, batas: MAKS_BARIS, prov: o.prov || "", daftar: [], pilih: null, target: [], sibuk: 0, sibukT: 0, ubah: {}};
    const provDaftar = o.provDaftar || Object.entries(g.S?.meta?.provinsi || {});
    const api = async (jalur, opsi) => { const r = await ambil(jalur, {credentials: "same-origin", ...opsi}); let j = null; try { j = await r.json(); } catch (e) {} return {ok: r.ok, status: r.status, j}; };
    const kirim = (jalur, badan) => api(jalur, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(badan)});
    const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);

    /* kartu 1: renlap */
    const TDK = o.tindakan || [], urutTdk = TDK.map(t => t[0]), namaTdk = k => (TDK.find(t => t[0] === k) || [k, k])[1];
    const tdkWadah = el("div", "pb-tabel"), kT = TDK.length ? kartu("Tindakan", "tindakan", [tdkWadah]) : null;
    const hariIni = hariWib(kini());
    const selProv = pilihan(S.prov, [["", "Pilih provinsi"], ...provDaftar]), fKab = masukan("text", "4 digit (opsional)", 4), fTgl = masukan("date"); fKab.inputMode = "numeric"; fTgl.value = hariIni; fTgl.max = hariIni; fTgl.min = hariWib(kini() - 7 * 864e5);
    const mintaB = tombol("minta", "Minta renlap", "pb-utama"), muatB = tombol("muat", "Muat ulang", "pb-sekunder");
    const alat = el("div", "pb-alat"); alat.append(bidang("Provinsi", selProv), bidang("Kab/kota (kode)", fKab), bidang("Tanggal", fTgl));
    const aksi = el("div", "pb-aksi"); aksi.append(mintaB, muatB);
    const status = el("p", "pb-status"); status.setAttribute("role", "status");
    const CATATAN = "Usulan lokasi untuk dilihat, bukan perintah terbang. Skor hipotesis.";
    const catat = el("p", "pb-ket", CATATAN), tabelWadah = el("div", "pb-tabel"), teksWa = el("pre", "rl-wa"); teksWa.hidden = true;
    const salinB = tombol("salin", "Salin teks WA", "pb-sekunder"); salinB.hidden = true;
    const k1 = kartu("Renlap", "renlap", [alat, aksi, status, tabelWadah, catat, teksWa, salinB]);
    /* kartu 2: hasil tindakan */
    const infoHasil = el("p", "pb-ket", "Pilih satu renlap berstatus terbit atau selesai pada tabel di atas."), hasilWadah = el("div", "pb-tabel");
    const simpanB = tombol("simpan", "Simpan hasil", "pb-utama"); simpanB.hidden = true; const pesan = el("p", "pb-pesan"); pesan.setAttribute("role", "status");
    const k2 = kartu("Hasil tindakan", "hasil", [infoHasil, hasilWadah, simpanB, pesan]);
    /* kartu 3: kepatuhan */
    const fDari = masukan("date"), fSampai = masukan("date"); fSampai.value = fSampai.max = hariIni; fDari.value = hariWib(kini() - 30 * 864e5); fDari.min = hariWib(kini() - 61 * 864e5); fDari.max = hariIni;
    const patuhB = tombol("muat", "Tampilkan kepatuhan", "pb-sekunder"), patuhAlat = el("div", "pb-alat"); patuhAlat.append(bidang("Dari", fDari), bidang("Sampai", fSampai));
    const patuhIsi = el("div", "rl-patuh"); const k3 = kartu("Kepatuhan", "patuh", [patuhAlat, (() => { const a = el("div", "pb-aksi"); a.append(patuhB); return a; })(), patuhIsi]);
    host.replaceChildren(...(kT ? [kT] : []), k1, k2, k3);

    /* kartu tindakan: logbook diambil sekali per pasang; gagal = persen "tidak tercatat" */
    /* keadaan: "memuat" | "gagal" | "ada" (lb terisi; bencana tak di jenis = "tidak tercatat") */
    function gambarTindakan(keadaan, lb) {
      if (S.tutup || !kT) return;
      const jn = lb && lb.jenis && lb.jenis[o.bencana], tgl = lb && lb.dibuat && !isNaN(new Date(lb.dibuat)) ? new Date(lb.dibuat).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : "";
      const t = el("table"), th = el("thead"), tr = el("tr"), kp = el("th", "n", "Persen kejadian"), kj = el("th", "n", "Kejadian");
      kp.title = "persen kejadian berisi di logbook Pusdalops 2011-2026 yang mencatat tindakan ini; pencocokan kata kunci, bisa kurang atau lebih dari kenyataan" + (tgl ? "; data dibuat " + tgl : "");
      if (jn && jn.n) kj.title = "dari " + rpSatu(jn.n) + " kejadian berisi";
      tr.append(el("th", "", "Tindakan"), kp, kj); th.append(tr); t.append(th);
      const tb = el("tbody"), kosong = keadaan === "memuat" ? "memuat data" : keadaan === "gagal" ? "data logbook belum bisa dimuat" : "tidak tercatat";
      for (const [kode, label] of TDK) {
        const p = keadaan === "ada" ? persenLogbook(lb, o.bencana, kode) : null, x = el("tr"), c = el("td", "n");
        if (p == null) c.append(el("span", "rl-tt", kosong)); else { const bar = el("span", "rl-bar"), isi = el("i"); isi.style.width = Math.min(100, p) + "%"; bar.append(isi); c.append(bar, el("span", "rl-p num", persen(p))); }
        x.append(el("td", "ops-kiri", label), c, el("td", "n num", p == null ? "–" : rpSatu((jn.tindakan || {})[kode] || 0))); tb.append(x);
      }
      t.append(tb); const w = el("div", "tw ops-tw ex-tabel"); w.append(t); tdkWadah.replaceChildren(w);
    }
    if (kT) { gambarTindakan("memuat"); if (ambil) logbook(ambil).then(lb => nanti(() => gambarTindakan(lb ? "ada" : "gagal", lb))); else gambarTindakan("gagal"); }

    function gambarTabel() {
      if (S.tutup) return;
      const t = el("table"), th = el("thead"), tr = el("tr"); for (const h of ["Tanggal", "Versi", "Status", "Target", "Aksi"]) tr.append(el("th", h === "Target" ? "n" : "", h)); th.append(tr); t.append(th);
      const tb = el("tbody"), kn = kini();
      for (const r of S.daftar.slice(0, S.batas)) {
        const x = el("tr"); x.dataset.id = r.id; if (S.pilih && S.pilih.id === r.id) x.setAttribute("aria-selected", "true");
        const st = el("td"), pil = el("span", "pb-st", labelStatus(r, kn)); pil.style.setProperty("--w", warnaStatus(r, kn)); st.append(pil);
        const ak = el("td", "pb-ak"), add = (kunci, teks, ik) => { const b = tombol(ik, teks, "pb-ik"); b.dataset.aksi = kunci; ak.append(b); };
        if (bisaUnduh(r)) { for (const [f, t] of FORMAT) { const a = el("a", "pb-ik", t); a.href = "/api/pb/renlap/berkas?id=" + r.id + "&fmt=" + f; a.download = ""; a.dataset.unduh = f; ak.append(a); } add("wa", "Teks WA", "salin"); }
        if (r.status === "draf") add("terbit", "Terbit", "terbit");
        if (r.status === "terbit") add("selesai", "Tandai selesai", "selesai");
        if (r.status === "terbit" || r.status === "selesai") add("hasil", "Isi hasil", "hasil");
        x.append(el("td", null, r.tanggal), el("td", "n num", "v" + r.versi), st, el("td", "n num", r.jml_target == null ? "–" : rpSatu(r.jml_target)), ak); tb.append(x);
      }
      t.append(tb); const w = el("div", "tw ops-tw ex-tabel"); w.append(t);
      const isi = [S.daftar.length ? w : el("p", "ops-kosong", S.prov ? "Belum ada renlap untuk provinsi dan tanggal ini." : "Pilih provinsi untuk melihat renlap.")];
      if (S.daftar.length > S.batas) { const l = tombol("lagi", "Tampilkan lagi (" + (S.daftar.length - S.batas) + " baris)", "pb-sekunder"); l.dataset.lagi = "1"; isi.push(l); }
      tabelWadah.replaceChildren(...isi);
    }
    const ringTdk = n => n ? n + " tindakan" : "Pilih tindakan";
    function daftarTdk(pilih) { const d = el("details", "rl-tdk"); d.append(el("summary", null, ringTdk(pilih ? pilih.size : 0))); return d; }   // isi centang dibangun saat dibuka (INP)
    function barisHasil(x) {
        const u = S.ubah[x.no] || {didatangi: "", alasan: "", hasil: "", catatan: ""}, r = el("tr"); r.dataset.no = x.no;
        const d = pilihan(u.didatangi, [["", "Belum diisi"], ["1", "Didatangi"], ["0", "Tidak didatangi"]]), a = pilihan(u.alasan, [["", "Pilih alasan"], ...Object.entries(ALASAN).filter(([k]) => k !== "tanpa_alasan")]), h = pilihan(u.hasil, [["", "Pilih hasil"], ...Object.entries(HASIL)]), c = masukan("text", "Catatan singkat", 200);
        d.dataset.f = "didatangi"; a.dataset.f = "alasan"; h.dataset.f = "hasil"; c.dataset.f = "catatan"; c.value = u.catatan; a.disabled = u.didatangi !== "0";
        for (const k of [d, a, h, c]) k.setAttribute("aria-label", k.dataset.f + " target " + x.no);
        const cel = k => { const e = el("td"); e.append(k); return e; };
        r.append(el("td", "n num", String(x.no)), el("td", "ops-kiri", x.nama), cel(d), cel(a), cel(h)); if (TDK.length) r.append(cel(daftarTdk(u.tindakan))); r.append(cel(c)); return r;
    }
    function gambarHasil() {
      if (S.tutup) return;
      if (!S.pilih) { hasilWadah.replaceChildren(); simpanB.hidden = true; return; }
      const t = el("table"), th = el("thead"), tr = el("tr"); for (const h of ["No", "Target", "Didatangi", "Alasan bila tidak", "Hasil", ...(TDK.length ? ["Tindakan"] : []), "Catatan"]) tr.append(el("th", h === "No" ? "n" : "", h)); th.append(tr); t.append(th);
      const tb = el("tbody");
      for (const x of S.target.slice(0, S.batasT || MAKS_BARIS)) tb.append(barisHasil(x));
      t.append(tb); const w = el("div", "tw ops-tw ex-tabel"); w.append(t);
      const isi = [S.target.length ? w : el("p", "ops-kosong", "Renlap ini tidak memuat target.")];
      if (S.target.length > (S.batasT || MAKS_BARIS)) { const l = tombol("lagi", "Tampilkan lagi (" + (S.target.length - (S.batasT || MAKS_BARIS)) + " baris)", "pb-sekunder"); l.dataset.lagiT = "1"; isi.push(l); }
      hasilWadah.replaceChildren(...isi); simpanB.hidden = !S.target.length;
    }
    function gambarPatuh(k) {
      if (S.tutup) return;
      const p = ringkasKepatuhan(k, TDK), kotak = (ik, nama, nilai) => { const d = el("div", "rl-k"); d.append(ikon(ik), el("span", "rl-n", nilai), el("span", "rl-t", nama)); return d; };
      const baris = el("div", "rl-baris"); baris.append(kotak("renlap", "Renlap", rpSatu(k.renlap || 0)), kotak("hasil", "Target", rpSatu(p.target)), kotak("hasil", "Didatangi", rpSatu(p.didatangi)), kotak("patuh", "Persen didatangi", persen(p.persen)));
      const sisa = el("div", "rl-baris"); sisa.append(kotak("minta", "Tidak didatangi", rpSatu(p.tidakJumlah)), kotak("lagi", "Belum diisi", rpSatu(p.belum_diisi)));   // belum_diisi terpisah dari tidak didatangi
      const isi = [baris, sisa];
      if (p.tidak.length) { const ul = el("ul", "rl-alasan"); for (const [a, n] of p.tidak) ul.append(el("li", null, a + ": " + rpSatu(n))); isi.push(ul); }
      if (p.tindakan.length) { const ul = el("ul", "rl-alasan"); for (const [a, n] of p.tindakan) ul.append(el("li", null, a + ": " + rpSatu(n) + " target")); isi.push(ul); }
      patuhIsi.replaceChildren(...isi);
    }

    async function muat() {
      if (!S.prov) { S.daftar = []; gambarTabel(); status.textContent = ""; return; }
      const n = ++S.sibuk; status.textContent = "Memuat...";
      const q = new URLSearchParams({bencana: o.bencana, prov: S.prov, dari: fTgl.value || hariIni, sampai: fTgl.value || hariIni}), r = await api("/api/pb/renlap?" + q);
      if (n !== S.sibuk) return;
      if (!r.ok) { S.daftar = []; status.textContent = galatRamah(r.status, r.j); nanti(gambarTabel); return; }
      S.daftar = (r.j.renlap || []).filter(x => !fKab.value.trim() || x.kab === fKab.value.trim());
      status.textContent = r.j.tersedia === false ? "Fitur belum aktif di server." : "";
      nanti(gambarTabel);
    }
    async function muatTarget(r) {
      const n = ++S.sibukT; S.pilih = r; S.ubah = {}; S.target = []; hasilWadah.replaceChildren(); simpanB.hidden = true;   // isian renlap lama tidak boleh terkirim ke renlap baru
       S.batasT = MAKS_BARIS; infoHasil.textContent = "Memuat target..."; pesan.textContent = "";
      const x = await ambil("/api/pb/renlap/berkas?id=" + r.id + "&fmt=json", {credentials: "same-origin"}); let j = null; try { j = await x.json(); } catch (e) {}
      if (n !== S.sibukT) return;
      if (!x.ok) { S.target = []; infoHasil.textContent = galatRamah(x.status, j); nanti(gambarHasil); return; }
      S.target = targetDari(j); catat.textContent = catatanDari(j); infoHasil.textContent = "Renlap " + r.tanggal + " v" + r.versi + ", " + rpSatu(S.target.length) + " target. Alasan hanya diisi bila tidak didatangi.";
      nanti(gambarHasil);
    }
    async function muatPatuh() {
      if (!S.prov) { patuhIsi.replaceChildren(el("p", "ops-kosong", "Pilih provinsi untuk melihat kepatuhan.")); return; }
      patuhIsi.replaceChildren(el("p", "pb-ket", "Memuat..."));
      const q = new URLSearchParams({bencana: o.bencana, prov: S.prov, dari: fDari.value, sampai: fSampai.value}), r = await api("/api/pb/kepatuhan?" + q);
      if (!r.ok) { patuhIsi.replaceChildren(el("p", "pb-ket", galatRamah(r.status, r.j))); return; }
      if (r.j.tersedia === false) { patuhIsi.replaceChildren(el("p", "pb-ket", "Fitur belum aktif di server.")); return; }
      nanti(() => gambarPatuh(r.j));
    }

    /* ---- kontrol: handler hanya mengubah atribut/nilai; kerja berat ditunda ---- */
    selProv.addEventListener("change", () => { S.prov = selProv.value; S.batas = MAKS_BARIS; S.pilih = null; S.target = []; muat(); muatPatuh(); nanti(gambarHasil); });
    fTgl.addEventListener("change", () => muat()); fKab.addEventListener("change", () => muat()); muatB.addEventListener("click", () => muat()); patuhB.addEventListener("click", () => muatPatuh());
    mintaB.addEventListener("click", async () => {
      if (!S.prov) { status.textContent = "Pilih provinsi."; return; }
      mintaB.disabled = true; status.textContent = "Meminta...";
      const b = {bencana: o.bencana, prov: S.prov, tanggal: fTgl.value || hariIni}; if (fKab.value.trim()) b.kab = fKab.value.trim();
      const r = await kirim("/api/pb/renlap", b); mintaB.disabled = false;
      status.textContent = r.ok ? "Renlap diminta" + (r.j && r.j.picu === false ? ", mesin belum menjawab: " + (r.j.pesan || "") : ", mesin sedang menyusun.") : galatRamah(r.status, r.j);
      if (r.ok) muat();
    });
    salinB.addEventListener("click", () => { g.navigator?.clipboard?.writeText(teksWa.textContent).then(() => { status.textContent = "Teks WA disalin."; }, () => { status.textContent = "Salin gagal; pilih teks lalu salin manual."; }); });
    tabelWadah.addEventListener("click", async e => {
      if (e.target.closest("[data-lagi]")) { S.batas += MAKS_BARIS; return nanti(gambarTabel); }
      const b = e.target.closest("[data-aksi]"); if (!b) return;
      const r = S.daftar.find(z => z.id === b.closest("tr").dataset.id); if (!r) return;
      if (b.dataset.aksi === "hasil") { muatTarget(r); nanti(gambarTabel); return; }
      if (b.dataset.aksi === "wa") {
        status.textContent = "Memuat teks WA..."; const x = await ambil("/api/pb/renlap/berkas?id=" + r.id + "&fmt=txt", {credentials: "same-origin"});
        if (!x.ok) { let j = null; try { j = await x.json(); } catch (er) {} status.textContent = galatRamah(x.status, j); return; }
        teksWa.textContent = await x.text(); teksWa.hidden = salinB.hidden = false; status.textContent = ""; return;
      }
      b.disabled = true; const rt = await kirim(b.dataset.aksi === "terbit" ? "/api/pb/renlap/terbit" : "/api/pb/renlap/selesai-tandai", {id: r.id});
      if (!rt.ok) { b.disabled = false; status.textContent = galatRamah(rt.status, rt.j); return; }
      status.textContent = b.dataset.aksi === "terbit" ? "Renlap diterbitkan." : "Renlap ditandai selesai."; muat();
    });
    hasilWadah.addEventListener("click", e => {
      const l = e.target.closest("[data-lagi-t]"); if (!l) return;
      const dari = S.batasT || MAKS_BARIS; S.batasT = dari + MAKS_BARIS;   // hanya menambah irisan baru ke tbody
      nanti(() => { const tb = hasilWadah.querySelector("tbody"); if (!tb) return; tb.append(...S.target.slice(dari, S.batasT).map(barisHasil));
        if (S.target.length > S.batasT) l.querySelector("span").textContent = "Tampilkan lagi (" + (S.target.length - S.batasT) + " baris)"; else l.remove(); });
    });
    hasilWadah.addEventListener("toggle", e => {   // capture: toggle tidak menggelembung; daftar dibangun dari Set di S.ubah
      const d = e.target; if (!d.classList || !d.classList.contains("rl-tdk") || !d.open || d.querySelector(".rl-tdk-isi")) return;
      const pilih = S.ubah[d.closest("tr").dataset.no]?.tindakan, l = el("div", "rl-tdk-isi");
      for (const [kode, label] of TDK) { const b = el("label", "rl-cek"), c = el("input"); c.type = "checkbox"; c.dataset.k = kode; c.checked = !!(pilih && pilih.has(kode)); b.append(c, el("span", null, label)); l.append(b); }
      d.append(l);
    }, true);
    hasilWadah.addEventListener("change", e => {
      const kt = e.target.dataset.k, f = e.target.dataset.f, no = e.target.closest("tr")?.dataset.no;
      if (kt && no) {   // hanya himpunan dan teks ringkasan baris itu; tabel tidak digambar ulang
        const u = S.ubah[no] ||= {no: Number(no), didatangi: "", alasan: "", hasil: "", catatan: ""}; const h = u.tindakan ||= new Set(); e.target.checked ? h.add(kt) : h.delete(kt);
        e.target.closest("details").querySelector("summary").textContent = ringTdk(h.size); return;
      }
      if (!f || !no) return;
      const u = S.ubah[no] ||= {no: Number(no), didatangi: "", alasan: "", hasil: "", catatan: ""}; u[f] = e.target.value;
      if (f === "didatangi") { const a = e.target.closest("tr").querySelector("[data-f=alasan]"); a.disabled = u.didatangi !== "0"; if (a.disabled) { a.value = ""; u.alasan = ""; } }
    });
    hasilWadah.addEventListener("input", e => { if (e.target.dataset.f !== "catatan") return; const no = e.target.closest("tr").dataset.no; (S.ubah[no] ||= {no: Number(no), didatangi: "", alasan: "", hasil: "", catatan: ""}).catatan = e.target.value; });
    simpanB.addEventListener("click", async () => {
      const baris = Object.values(S.ubah); if (!baris.length || !S.pilih) { pesan.textContent = "Belum ada isian yang diubah."; return; }
      simpanB.disabled = true; pesan.textContent = "Menyimpan..."; let n = 0, info = "";
      for (const bag of potong(butirDari(baris, urutTdk), MAKS_BUTIR)) {
        const r = await kirim("/api/pb/hasil", {id: S.pilih.id, butir: bag});
        if (!r.ok) { simpanB.disabled = false; pesan.textContent = galatRamah(r.status, r.j) + (n ? " (" + n + " butir sudah tersimpan)" : ""); return; }
        n += bag.length; if (r.j && r.j.tindakan === false && r.j.pesan) info = r.j.pesan;
      }
      simpanB.disabled = false; S.ubah = {}; pesan.textContent = n + " butir tersimpan." + (info ? " " + info : ""); muatPatuh();
    });

    gambarTabel(); gambarHasil();
    if (S.prov) { muat(); muatPatuh(); } else patuhIsi.replaceChildren(el("p", "ops-kosong", "Pilih provinsi untuk melihat kepatuhan."));
    return {muat, tutup() { S.tutup = true; host.replaceChildren(); }, _S: S};
  }

  g.PbRenlap = {ALASAN, HASIL, STATUS, labelAlasan, labelStatus, statusEfektif, targetDari, catatanDari, butirDari, ringkasKepatuhan, galatRamah, persenLogbook, persen, hariWib, potong, bisaUnduh, FORMAT, MAKS_BARIS, MAKS_BUTIR, pasang};
})(typeof window !== "undefined" ? window : globalThis);
