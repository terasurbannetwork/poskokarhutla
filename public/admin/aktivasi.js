/* Papan aktivasi daerah (/admin/aktivasi, Pintu Masuk PM-12, data/kajian-bnpb/pintu-masuk/DESIGN-SYSTEM.md L7). Data: GET /api/masuk/aktivasi (satu panggilan, hitungan di cache tepi 5 menit),
   rincian satu kabupaten GET /api/masuk/aktivasi?prov=&kab=, undang POST /api/masuk/undang {kontak_id, akun_id}. Nomor selalu tersamar dari server.
   INP: kontrol (pilih provinsi, saringan status, urut kolom) berubah seketika; isi tabel disusun bertahap per bingkai dan dibatalkan bila kontrol berganti lagi.
   CSP admin: tanpa skrip atau gaya inline; semua teks dari data lewat textContent. */
(() => {
  const app = document.getElementById("app"); if (!app) return;
  const NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const svg = d => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "av-ik");
    for (const x of d.split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", x); s.append(p); } return s; };
  const IK_PETA = "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", IK_UNDANG = "M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1|M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M19 8v6|M22 11h-6", IK_TUTUP = "M6 6l12 12|M18 6L6 18";
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const nama = k => window.Wilayah?.kab(k) ?? k;   // ejaan resmi (/instansi_wilayah.js)
  const STATUS = {belum_ada: ["Belum ada akun aktif", "abu"], belum_klaim: ["Belum diklaim", "abu"], diundang: ["Diundang", "kuning"], menunggu: ["Menunggu admin BNPB", "kuning"], aktif_kurang: ["Aktif, PIC kurang", "jingga"], aktif: ["Aktif", "hijau"], lama: ["Aktif, lama tidak masuk", "jingga"], ditolak: ["Ditolak", "merah"], dicabut: ["Dicabut", "merah"]};
  const URUT_STATUS = {belum_ada: 0, belum_klaim: 1, diundang: 2, menunggu: 3, ditolak: 4, dicabut: 5, aktif_kurang: 6, lama: 7, aktif: 8};
  const lok = r => r.kab ? nama(r.kab) : "Provinsi " + r.prov_nama;   // baris provinsi: kab kosong (PF-07, N9)
    const KOLOM = [["kab", "Kabupaten atau kota", "Nama daerah; provinsi di baris kedua"], ["pic", "PIC", "Jumlah PIC aktif dari yang didaftarkan (paling banyak 4, 3 diperlukan)"], ["akun", "Akun aktif", "Jumlah akun instansi aktif di daerah itu"], ["terakhir", "Terakhir masuk", "Masuk terakhir lewat pintu masuk ke akun daerah itu (120 hari terakhir)"],
    ["undangan", "Undangan", "Terkirim dan diterima"], ["status", "Status", "Keadaan aktivasi daerah"], [null, "Aksi", "Undang kontak pemangku yang belum menjadi anggota"]];
  const S = {prov: "", status: "", urut: "kab", arah: 1, no: 0, buka: null};
  let D = null;

  const kartu = h("section", {class: "ex ex-std av-kartu", "aria-label": "Aktivasi daerah"});
  const pilProv = h("select", {class: "av-pilih", "aria-label": "Pilih provinsi"}), pilStatus = h("select", {class: "av-pilih", "aria-label": "Saring status"});
  const hitung = h("span", {class: "av-hitung", "aria-live": "polite"});
  const badan = h("div", {class: "ex-bd"});
  kartu.append(h("header", {class: "ex-hd"}, h("div", {class: "ex-jd"}, h("h3", null, svg(IK_PETA), "Aktivasi daerah"), h("div", {class: "av-kontrol"}, hitung, pilProv, pilStatus))), badan);
  const pesan = h("p", {class: "av-pesan", role: "status"}, "Memuat...");
  app.replaceChildren(pesan, kartu); kartu.hidden = true;

  const tbody = h("tbody"), kepala = h("tr");
  const tabel = h("table", {class: "ex-tabel av-tabel"}, h("thead", null, kepala), tbody);
  const ths = new Map();
  for (const [k, teks, judul] of KOLOM) {
    const th = h("th", {scope: "col", title: judul});
    if (k) { th.append(h("button", {type: "button", class: "av-urut", "data-urut": k}, teks)); th.setAttribute("aria-sort", "none"); ths.set(k, th); } else th.textContent = teks;
    kepala.append(th);
  }
  badan.append(h("div", {class: "av-wadah"}, tabel));

  const rank = (r, k) => k === "kab" ? lok(r) : k === "pic" ? r.pic_aktif * 10 + r.pic : k === "akun" ? r.akun_aktif : k === "terakhir" ? r.terakhir_masuk ?? 0 : k === "undangan" ? r.undangan_terkirim + r.undangan_diterima : URUT_STATUS[r.status];
  function susun() {
    const a = D.daftar.filter(r => (!S.prov || r.prov === S.prov) && (!S.status || r.status === S.status));
    const k = S.urut;
    return a.sort((x, y) => { const u = rank(x, k), v = rank(y, k); const c = typeof u === "string" ? u.localeCompare(v, "id") : u - v; return (c || x.prov.localeCompare(y.prov) || lok(x).localeCompare(lok(y), "id")) * S.arah; });
  }
  function baris(r) {
    const [label, warna] = STATUS[r.status];
    const tombol = h("button", {type: "button", class: "av-btn", "data-rinci": r.prov + "|" + r.kab, "aria-label": `Rincian dan undangan ${lok(r)}`, title: "Rincian PIC dan undangan"}, svg(IK_UNDANG));
    return h("tr", {"data-kunci": r.prov + "|" + r.kab},
      h("td", {"data-label": "Kabupaten atau kota"}, h("b", {teks: lok(r)}), r.kab ? h("small", {teks: r.prov_nama}) : null),
      h("td", {class: "av-n", "data-label": "PIC"}, `${angka(r.pic_aktif)} dari ${angka(r.pic)}`, r.menunggu ? h("small", {teks: "ada yang menunggu"}) : null),
      h("td", {class: "av-n", "data-label": "Akun aktif"}, angka(r.akun_aktif), r.anggota ? h("small", {teks: `${angka(r.anggota)} anggota`}) : null),
      h("td", {"data-label": "Terakhir masuk", teks: r.akun_aktif || r.pic ? (r.terakhir_masuk ? PesanLayar.relatif(r.terakhir_masuk) : "Tidak ada dalam 120 hari") : PesanLayar.KOSONG}),
      h("td", {"data-label": "Undangan"}, `${angka(r.undangan_terkirim)} terkirim, ${angka(r.undangan_diterima)} diterima`),
      h("td", {"data-label": "Status"}, h("span", {class: "av-pil " + warna, teks: label})),
      h("td", {class: "av-a", "data-label": "Aksi"}, tombol, r.kontak_belum ? h("small", {teks: `${angka(r.kontak_belum)} kontak`}) : null));
  }
  /* isi tabel bertahap: 40 baris per bingkai, berhenti bila kontrol berganti (S.no berubah) */
  function gambar() {
    const no = ++S.no, a = susun();
    S.buka = null; tbody.replaceChildren();
    hitung.textContent = `${angka(a.length)} daerah`;
    if (!a.length) { tbody.append(h("tr", null, h("td", {colspan: String(KOLOM.length), class: "av-kosong", teks: "Tidak ada daerah yang cocok."}))); return; }
    let i = 0;
    const langkah = () => {
      if (no !== S.no) return;
      const f = document.createDocumentFragment(); for (const r of a.slice(i, i + 40)) f.append(baris(r));
      tbody.append(f); i += 40;
      if (i < a.length) requestAnimationFrame(langkah);
    };
    langkah();
  }
  const tunda = () => requestAnimationFrame(gambar);   // kontrol sudah berubah; isi menyusul di bingkai berikutnya
  function tandaiUrut() { for (const [k, th] of ths) th.setAttribute("aria-sort", k === S.urut ? (S.arah > 0 ? "ascending" : "descending") : "none"); }
  pilProv.addEventListener("change", () => { S.prov = pilProv.value; tunda(); });
  pilStatus.addEventListener("change", () => { S.status = pilStatus.value; tunda(); });
  kepala.addEventListener("click", e => {
    const b = e.target.closest("[data-urut]"); if (!b) return;
    S.arah = S.urut === b.dataset.urut ? -S.arah : 1; S.urut = b.dataset.urut; tandaiUrut(); tunda();
  });

  /* ---------- rincian satu kabupaten: kontak yang belum menjadi anggota ---------- */
  async function bukaRinci(tr) {
    const ada = tbody.querySelector(".av-rinci"); const sama = ada && ada.previousElementSibling === tr;
    if (ada) ada.remove(); S.buka = null;
    if (sama) return;
    const [prov, kab] = tr.dataset.kunci.split("|");
    const isi = h("td", {colspan: String(KOLOM.length)}, h("p", {class: "av-pesan", teks: "Memuat kontak..."}));
    const baru = h("tr", {class: "av-rinci"}, isi); tr.after(baru); S.buka = tr.dataset.kunci;
    let r; try { r = await Admin.ambil(`/api/masuk/aktivasi?prov=${encodeURIComponent(prov)}${kab ? "&kab=" + encodeURIComponent(kab) : "&tingkat=prov"}`, "Papan aktivasi"); } catch (e) { isi.replaceChildren(h("p", {class: "av-pesan galat", teks: e.message || PesanLayar.galat(0)})); return; }
    if (S.buka !== tr.dataset.kunci) return;
    const tutup = h("button", {type: "button", class: "av-btn", "data-tutup": "1", "aria-label": "Tutup rincian"}, svg(IK_TUTUP));
    const kepalaR = h("div", {class: "av-rkepala"}, h("b", {teks: `Profil PIC dan kontak di ${kab ? nama(kab) : "provinsi ini"}`}), tutup);
    const pic = r.profil?.length ? h("ul", {class: "av-kontak"}, r.profil.map(p => h("li", null, h("span", {class: "av-nama"}, h("b", {teks: p.nama}), h("small", {teks: `${p.jabatan}, ${p.status}${p.terkunci ? ", terkunci" : ""}${p.terakhir_masuk ? ", masuk " + PesanLayar.relatif(p.terakhir_masuk) : ""}`}))))) : h("p", {class: "av-pesan", teks: r.pemda ? "Belum ada PIC yang didaftarkan." : "Belum ada akun BPBD di sini."});
    const ulang = !r.pemda || r.pemda.status === "dicabut" ? null : h("div", {class: "av-ulang"}, h("b", {teks: "Kirim ulang undangan akun BPBD"}),
      ...(r.kontak_bpbd?.length ? r.kontak_bpbd.map(k => h("button", {type: "button", class: "av-btn", "data-ulang": k.id, "data-akun": r.pemda.id, "aria-label": `Kirim ulang undangan ke ${k.nama}`, title: `Kirim ke ${k.nama}, ${k.wa}`}, svg(IK_UNDANG))) : []),
      h("button", {type: "button", class: "av-btn av-teks", "data-salin": r.pemda.id, title: "Salin teks undangan"}, "Salin teks"));
    let tubuh;
    if (!r.kontak.length) tubuh = h("p", {class: "av-pesan", teks: "Tidak ada kontak pemangku aktif yang belum menjadi anggota."});
    else tubuh = h("ul", {class: "av-kontak"}, r.kontak.map(k => h("li", null, h("span", {class: "av-nama"}, h("b", {teks: k.nama}), h("small", {teks: `${k.jabatan}, ${k.wa}`})),
      k.akun_id ? h("button", {type: "button", class: "av-btn", "data-undang": k.id, "data-akun": k.akun_id, "aria-label": `Undang ${k.nama}`, title: "Kirim undangan WhatsApp"}, svg(IK_UNDANG))
        : h("small", {class: "av-redup", teks: "Belum ada akun yang cocok"}))));
    const tanpaAkun = r.akun.length ? null : h("p", {class: "av-pesan"}, "Belum ada akun instansi aktif di sini. Verifikasi akunnya dulu di ", h("a", {href: "/admin/instansi", teks: "Akun Instansi"}), ".");
    isi.replaceChildren(kepalaR, pic, ulang, tanpaAkun, tubuh);
  }
  tbody.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.rinci) return bukaRinci(t.closest("tr"));
    if (t.dataset.tutup) { t.closest("tr").remove(); S.buka = null; return; }
    if (t.dataset.ulang || t.dataset.salin) {   // PF-07: kirim ulang undangan akun BPBD (WA lewat antrean) atau teks salin; tanpa sandi
      t.disabled = true;
      const x = await Admin.kirim("/api/masuk/undang-ulang", t.dataset.ulang ? {akun_id: t.dataset.akun || t.dataset.salin, kontak_id: t.dataset.ulang} : {akun_id: t.dataset.salin}).catch(() => ({ok: false, j: {galat: PesanLayar.LURING}}));
      t.disabled = false; const w = t.closest(".av-ulang"); w.querySelector(".av-galat")?.remove();
      if (!x.ok) return void w.append(h("small", {class: "av-galat", role: "alert", teks: x.j?.galat || "Gagal mengirim ulang."}));
      if (x.j.teks_salin) { try { await navigator.clipboard.writeText(x.j.teks_salin); w.append(h("small", {class: "av-galat", role: "status", teks: "Teks undangan disalin."})); } catch (e) { w.append(h("textarea", {class: "av-salin", readonly: true, "aria-label": "Teks undangan", teks: x.j.teks_salin})); } }
      else w.append(h("small", {class: "av-galat", role: "status", teks: "Undangan masuk antrean WhatsApp."}));
      return;
    }
    if (t.dataset.undang) {
      t.disabled = true;
      const x = await Admin.kirim("/api/masuk/undang", {kontak_id: t.dataset.undang, akun_id: t.dataset.akun}).catch(() => ({ok: false, j: {galat: PesanLayar.LURING}}));
      if (x.ok) t.replaceWith(h("span", {class: "av-pil kuning", teks: "Undangan terkirim"}));
      else { t.disabled = false; const li = t.closest("li"); li.querySelector(".av-galat")?.remove(); li.append(h("small", {class: "av-galat", role: "alert", teks: x.j?.galat || "Gagal mengirim undangan."})); }
    }
  });

  async function muat() {
    let r; try { r = await Admin.ambil("/api/masuk/aktivasi", "Papan aktivasi"); } catch (e) { pesan.textContent = e.message || "Gagal memuat papan aktivasi."; pesan.className = "av-pesan galat"; return; }
    D = r; pesan.hidden = true; kartu.hidden = false;
    const prov = [...new Map(D.daftar.map(x => [x.prov, x.prov_nama]))].sort((a, b) => a[1].localeCompare(b[1], "id"));
    pilProv.replaceChildren(h("option", {value: "", teks: "Semua provinsi"}), ...prov.map(([k, n]) => h("option", {value: k, teks: n})));
    pilStatus.replaceChildren(h("option", {value: "", teks: "Semua status"}), ...Object.entries(STATUS).map(([k, [n]]) => h("option", {value: k, teks: n})));
    tandaiUrut(); gambar();
  }
  muat();
})();
