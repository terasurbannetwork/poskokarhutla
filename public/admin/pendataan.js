/* Pendataan Satu Data BNPB (/admin/pendataan), Super Admin saja: monitoring siapa yang sudah mengisi, kelola akun responden, baca semua isian, ekspor CSV.
   Data: GET /api/pendataan/admin/ringkas. Aksi: POST /api/pendataan/admin/akun/:id {aksi}, POST /api/pendataan/dummy. Spek bersama: /bnpb/pendataan_spek.js.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat textContent. INP: pindah tab dan urut berubah seketika, tabel besar digambar bertahap. */
(async () => {
  const app = document.getElementById("app"), slot = document.getElementById("aksiJudul");
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const waktu = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) : "";
  const S = await import("/bnpb/pendataan_spek.js");
  const KLS_UNIT = {"Belum ada akun": "merah", "Akun menunggu": "kuning", "Belum mengisi": "abu", "Draf": "biru", "Sudah kirim": "hijau"};
  const KLS_AKUN = {menunggu: "kuning", aktif: "hijau", ditolak: "merah", dicabut: "abu"};
  const KLS_ISIAN = {draf: "biru", terkirim: "hijau"};
  const pil = (t, kls = "") => h("span", {class: "pd-pil " + kls, teks: t});
  const tombol = (t, att, kls = "") => h("button", {class: "ad-tombol kecil " + kls, type: "button", ...att}, t);
  const gagalJaringan = {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}};
  let D = null, tab = "unit", rahasia = null, jadwal = 0;
  const urut = {unit: {k: "status", arah: 1}, akun: {k: "dibuat", arah: -1}, isian: {k: "diubah", arah: -1}};
  const F = {akun: "", jenis: "", unit: "", status: "", q: "", batas: 60};

  /* ---------- bahan ---------- */
  const namaUnit = (kunci, lain) => kunci === "lainnya" ? `Lainnya: ${lain || ""}` : S.UNIT[kunci] || kunci;
  const barisUnit = () => [...D.unit.map(u => ({...u, label: u.nama})), ...D.lainnya.map(u => ({...u, kunci: "lainnya", label: `Lainnya: ${u.unit_lain}`}))];
  const pesanTagih = (u, nama) => `Halo ${nama || ""}, mohon bantuannya mengisi pendataan data, dokumen, dan aplikasi milik ${u.label} di ${location.origin}/pendataan. Terima kasih.`.replace("Halo ,", "Halo,");
  const pesanBagi = u => `Halo, mohon perwakilan ${u.label} membuat akun dan mengisi pendataan data, dokumen, dan aplikasi di ${location.origin}/pendataan. Terima kasih.`;
  const wa = (nomor, teks, label) => h("a", {class: "ad-tombol kecil pd-wa", href: `https://wa.me/${nomor || ""}?text=${encodeURIComponent(teks)}`, target: "_blank", rel: "noopener noreferrer", teks: label});
  const bandingkan = (k, arah) => (a, b) => { const x = a[k], y = b[k]; if (x === y) return 0; if (x == null || x === "") return 1; if (y == null || y === "") return -1; return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "id")) * arah; };
  const urutStatus = s => STATUS_URUT.indexOf(s);
  const STATUS_URUT = ["Belum ada akun", "Akun menunggu", "Belum mengisi", "Draf", "Sudah kirim"];

  /* ---------- kerangka ---------- */
  function kerangka() {
    const R = D.ringkas, p = (v, l) => h("span", {class: "pd-ringkas"}, h("b", {teks: angka(v)}), h("span", {teks: l}));
    app.replaceChildren(
      h("div", {class: "pd-baris-pil"}, p(R.unit_sudah, `dari ${angka(R.unit_total)} unit sudah kirim`), p(R.akun_aktif, "akun aktif"), p(R.akun_menunggu, "akun menunggu"), p(R.data, "data terkirim"), p(R.aplikasi, "aplikasi terkirim"), p(R.umum, "kebutuhan terkirim"), p(R.draf, "draf")),
      rahasia ? kotakRahasia() : null,
      h("div", {class: "pd-bar"},
        h("div", {class: "pd-tab", role: "tablist"}, ...[["unit", "Unit"], ["akun", `Akun (${angka(D.akun.length)})`], ["isian", `Isian (${angka(D.isian.length)})`]].map(([k, l]) => h("button", {type: "button", role: "tab", "data-tab": k, "aria-selected": String(tab === k), teks: l}))),
        h("div", {class: "pd-ekspor"}, ...S.JENIS.map(j => h("a", {class: "ad-tombol kecil", href: "/api/pendataan/admin/ekspor?jenis=" + j, download: `pendataan-${j}.csv`, teks: "CSV " + S.JUDUL_JENIS[j]})))),
      h("div", {id: "pdIsi"}));
    gambar();
  }
  function kotakRahasia() {
    return h("div", {class: "pd-rahasia", role: "status"}, h("p", {teks: `Sandi sementara untuk ${rahasia.nama}. Tampil sekali, salin dan serahkan langsung:`}),
      h("code", {teks: `Username: ${rahasia.username}\nSandi: ${rahasia.sandi}`}),
      h("div", {class: "pd-aksi"}, tombol("Salin", {"data-salin": "1"}, "utama"), tombol("Tutup", {"data-tutup": "1"})),
      h("small", {teks: "Ia wajib membuat sandi baru saat masuk."}));
  }
  const tunda = () => { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambar, 0)); };
  function gambar() {
    const w = document.getElementById("pdIsi"); if (!w) return;
    for (const b of app.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    const cari = document.activeElement?.matches?.("[data-cari]") ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    w.replaceChildren(tab === "unit" ? tabelUnit() : tab === "akun" ? tabelAkun() : tabelIsian());
    const q = cari && w.querySelector("[data-cari]");   // kolom cari ikut tergambar ulang: kembalikan fokus dan kursor supaya ketikan berikutnya tidak hilang
    if (q) { q.focus({preventScroll: true}); q.setSelectionRange(...cari); }
  }
  function kepala(jenis, kolom) {
    const u = urut[jenis];
    return h("thead", null, h("tr", null, ...kolom.map(([k, l]) => k ? h("th", {"data-urut": k, "data-jenis": jenis, "aria-sort": u.k === k ? (u.arah > 0 ? "ascending" : "descending") : "none", tabindex: "0"}, l, u.k === k ? (u.arah > 0 ? " ▲" : " ▼") : "") : h("th", {teks: l}))));
  }

  /* ---------- unit ---------- */
  function tabelUnit() {
    const u = urut.unit, xs = barisUnit().map(x => ({...x, urut_status: urutStatus(x.status)})).sort(u.k === "status" ? bandingkan("urut_status", u.arah) : bandingkan(u.k === "nama" ? "label" : u.k, u.arah));
    return h("div", {class: "pd-tabel-wadah"}, h("table", {class: "pd-tabel"},
      kepala("unit", [["nama", "Unit"], ["status", "Status"], ["akun_aktif", "Akun aktif"], ["akun_menunggu", "Akun menunggu"], ["data", "Data"], ["aplikasi", "Aplikasi"], ["umum", "Kebutuhan"], ["draf", "Draf"], ["terakhir", "Terakhir kirim"], [null, "Tagih"]]),
      h("tbody", null, xs.map(x => h("tr", null,
        h("td", null, h("b", {teks: x.label})), h("td", null, pil(x.status, KLS_UNIT[x.status])),
        ...["akun_aktif", "akun_menunggu", "data", "aplikasi", "umum", "draf"].map(k => h("td", {class: "pd-num", teks: angka(x[k])})),
        h("td", {teks: waktu(x.terakhir)}),
        h("td", null, h("div", {class: "pd-aksi"}, x.status === "Sudah kirim" ? null : x.pic.length ? x.pic.map(p => wa(p.wa, pesanTagih(x, p.nama), `Tagih ${p.nama.split(" ")[0]}`)) : x.status === "Akun menunggu" ? null : wa("", pesanBagi(x), "Bagikan tautan"))))))));
  }

  /* ---------- akun ---------- */
  function tabelAkun() {
    const u = urut.akun, q = F.q.trim().toLowerCase();
    const xs = D.akun.filter(a => (!F.akun || a.status === F.akun) && (!q || [a.nama, a.username, a.jabatan, a.email, namaUnit(a.unit, a.unit_lain)].some(v => String(v ?? "").toLowerCase().includes(q)))).sort(bandingkan(u.k, u.arah));
    const chip = (k, l) => h("button", {class: "pd-chip", type: "button", "data-akun": k, "aria-pressed": String(F.akun === k), teks: l});
    return h("div", null,
      h("div", {class: "pd-saring"}, chip("", "Semua"), ...S.STATUS_AKUN.map(s => chip(s, s[0].toUpperCase() + s.slice(1) + ` (${angka(D.akun.filter(a => a.status === s).length)})`)),
        h("input", {class: "pd-cari", type: "search", placeholder: "Cari nama, username, unit", "aria-label": "Cari akun", value: F.q, "data-cari": "akun"})),
      xs.length ? h("div", {class: "pd-tabel-wadah"}, h("table", {class: "pd-tabel"},
        kepala("akun", [["nama", "Nama"], ["unit", "Unit"], [null, "Kontak"], ["status", "Status"], ["isian", "Isian"], ["dibuat", "Daftar"], [null, ""]]),
        h("tbody", null, xs.map(a => h("tr", {"data-akun-id": a.id, class: a.status === "aktif" ? "" : "pd-redup"},
          h("td", null, h("b", {teks: a.nama}), h("small", {teks: `@${a.username}, ${a.jabatan}`}), a.nip ? h("small", {teks: "NIP " + a.nip}) : null),
          h("td", {teks: namaUnit(a.unit, a.unit_lain)}),
          h("td", null, h("small", {teks: a.email}), h("small", {teks: "+" + a.wa})),
          h("td", null, pil(a.status[0].toUpperCase() + a.status.slice(1), KLS_AKUN[a.status]), a.wajib_ganti ? pil("Belum ganti sandi", "kuning") : null, a.dummy ? pil("DUMMY", "dummy") : null),
          h("td", {class: "pd-num", teks: angka(a.isian)}), h("td", {teks: waktu(a.dibuat)}),
          h("td", null, h("div", {class: "pd-aksi"},
            a.status !== "aktif" ? tombol("Setujui", {"data-aksi": "setujui"}, "utama") : null, a.status === "menunggu" ? tombol("Tolak", {"data-aksi": "tolak"}, "bahaya") : null,
            a.status === "aktif" ? tombol("Reset sandi", {"data-aksi": "reset"}) : null, a.status === "aktif" ? tombol("Cabut", {"data-aksi": "cabut"}, "bahaya") : null))))))) : h("p", {class: "pd-kosong", teks: D.akun.length ? "Tidak ada akun yang cocok." : "Belum ada akun responden."}));
  }

  /* ---------- isian ---------- */
  function tabelIsian() {
    const u = urut.isian, q = F.q.trim().toLowerCase();
    const xs = D.isian.filter(i => (!F.jenis || i.jenis === F.jenis) && (!F.unit || (F.unit === "lainnya" ? i.unit === "lainnya" : i.unit === F.unit)) && (!F.status || i.status === F.status) && (!q || [i.judul, i.pengisi, namaUnit(i.unit, i.unit_lain)].some(v => String(v ?? "").toLowerCase().includes(q)))).sort(bandingkan(u.k, u.arah));
    const pilih = (nama, daftar, label) => h("select", {"data-saring": nama, "aria-label": label}, h("option", {value: "", teks: label}), ...daftar.map(([v, l]) => h("option", {value: v, selected: F[nama] === v, teks: l})));
    return h("div", null,
      h("div", {class: "pd-saring"}, pilih("jenis", S.JENIS.map(j => [j, S.JUDUL_JENIS[j]]), "Semua jenis"), pilih("unit", Object.entries(S.UNIT).map(([k, l]) => [k, l]), "Semua unit"), pilih("status", S.STATUS_ISIAN.map(s => [s, s[0].toUpperCase() + s.slice(1)]), "Semua status"),
        h("input", {class: "pd-cari", type: "search", placeholder: "Cari judul, pengisi, unit", "aria-label": "Cari isian", value: F.q, "data-cari": "isian"}), h("span", {class: "pd-jumlah", teks: `${angka(xs.length)} isian`})),
      xs.length ? h("div", {class: "pd-tabel-wadah"}, h("table", {class: "pd-tabel pd-klik"},
        kepala("isian", [["judul", "Judul"], ["jenis", "Jenis"], ["unit", "Unit"], ["pengisi", "Pengisi"], ["status", "Status"], [null, "Berkas"], ["diubah", "Diubah"]]),
        h("tbody", null, xs.slice(0, F.batas).map(i => h("tr", {"data-isian": i.id, tabindex: "0"},
          h("td", null, h("b", {teks: i.judul})), h("td", null, pil(S.JUDUL_JENIS[i.jenis], "biru")), h("td", {teks: namaUnit(i.unit, i.unit_lain)}), h("td", {teks: i.pengisi}),
          h("td", null, pil(i.status[0].toUpperCase() + i.status.slice(1), KLS_ISIAN[i.status]), i.dummy ? pil("DUMMY", "dummy") : null), h("td", {class: "pd-num", teks: angka(i.berkas.length)}), h("td", {teks: waktu(i.diubah)})))))
        , xs.length > F.batas ? tombol(`Tampilkan lagi (${angka(xs.length - F.batas)})`, {"data-lagi": "1"}) : null) : h("p", {class: "pd-kosong", teks: D.isian.length ? "Tidak ada isian yang cocok." : "Belum ada isian."}));
  }
  function bukaIsian(id) {
    const i = D.isian.find(x => x.id === id); if (!i) return;
    const dlg = h("dialog", {class: "pd-dialog", "aria-label": i.judul});
    const baris = S.KOLOM[i.jenis].map(c => [c.label, S.teksKolom(c, i.isi)]).filter(([, v]) => v);
    dlg.append(h("div", {class: "pd-dialog-kepala"}, h("h2", {teks: i.judul}), tombol("Tutup", {"data-tutup-dialog": "1"})),
      h("div", {class: "pd-baris-pil"}, pil(S.JUDUL_JENIS[i.jenis], "biru"), pil(i.status[0].toUpperCase() + i.status.slice(1), KLS_ISIAN[i.status]), pil(namaUnit(i.unit, i.unit_lain)), i.dummy ? pil("DUMMY", "dummy") : null),
      h("p", {class: "pd-redup", teks: `${i.pengisi}, ${i.jabatan}. Diubah ${waktu(i.diubah)}${i.dikirim ? `, dikirim ${waktu(i.dikirim)}` : ""}.`}),
      h("dl", {class: "pd-dl"}, baris.flatMap(([l, v]) => [h("dt", {teks: l}), h("dd", {teks: v})])),
      i.berkas.length ? h("div", {class: "pd-berkas"}, h("b", {teks: "Berkas"}), ...i.berkas.map(b => h("a", {class: "ad-tombol kecil", href: "/api/pendataan/berkas/" + b.id, download: b.nama, teks: `${b.nama} (${S.BERKAS.tipe[b.mime] || b.mime}, ${angka(Math.max(1, Math.round(b.ukuran / 1024)))} KB)`}))) : null);
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg); dlg.showModal();
  }

  /* ---------- muat dan aksi ---------- */
  async function muat() {
    try { D = await Admin.ambil("/api/pendataan/admin/ringkas", "Pendataan"); }
    catch (e) { app.replaceChildren(h("p", {class: "pd-kosong", teks: String(e.message || e)})); return; }
    kerangka();
  }
  app.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; F.q = ""; F.batas = 60; gambar(); return; }
    const th = e.target.closest("[data-urut]");
    if (th) { const u = urut[th.dataset.jenis]; u.arah = u.k === th.dataset.urut ? -u.arah : 1; u.k = th.dataset.urut; tunda(); return; }
    const c = e.target.closest("[data-akun]"); if (c) { F.akun = c.dataset.akun; tunda(); return; }
    if (e.target.closest("[data-lagi]")) { F.batas += 60; tunda(); return; }
    if (e.target.closest("[data-tutup]")) { rahasia = null; kerangka(); return; }
    if (e.target.closest("[data-salin]")) { const b = e.target.closest("[data-salin]"); await navigator.clipboard?.writeText(`Username: ${rahasia.username}\nSandi: ${rahasia.sandi}`).catch(() => null); b.textContent = "Tersalin"; return; }
    const ab = e.target.closest("[data-aksi]");
    if (ab) {
      const tr = ab.closest("[data-akun-id]"), a = D.akun.find(x => x.id === tr.dataset.akunId), aksi = ab.dataset.aksi;
      if (aksi === "cabut" && !confirm(`Cabut akun ${a.nama}? Sesinya langsung berakhir.`)) return;
      if (aksi === "reset" && !confirm(`Reset sandi ${a.nama}? Sandi lama langsung tidak berlaku.`)) return;
      ab.disabled = true; const x = await Admin.kirim("/api/pendataan/admin/akun/" + a.id, {aksi}).catch(() => gagalJaringan); ab.disabled = false;
      if (!x.ok) { alert(x.j.galat || `Gagal (${x.status})`); return; }
      rahasia = aksi === "reset" ? {nama: a.nama, username: x.j.username, sandi: x.j.sandi} : null; await muat(); return;
    }
    const tr = e.target.closest("[data-isian]"); if (tr && !e.target.closest("a")) bukaIsian(tr.dataset.isian);
  });
  app.addEventListener("keydown", e => { if (e.key !== "Enter" && e.key !== " ") return; const th = e.target.closest("[data-urut]"), tr = e.target.closest("[data-isian]"); if (th || tr) { e.preventDefault(); e.target.click(); } });
  app.addEventListener("input", e => { if (e.target.matches("[data-cari]")) { F.q = e.target.value; F.batas = 60; tunda(); } });
  app.addEventListener("change", e => { const s = e.target.closest("[data-saring]"); if (s) { F[s.dataset.saring] = s.value; F.batas = 60; tunda(); } });
  document.addEventListener("click", e => { if (e.target.closest("[data-tutup-dialog]")) e.target.closest("dialog").close(); else if (e.target.tagName === "DIALOG") e.target.close(); });

  /* 🧪 dan 🧹 (DUMMY.md): isi atau hapus lalu muat ulang penuh */
  if (slot) {
    Admin.pasangDummy(slot, true);
    slot.addEventListener("click", async e => {
      const d = e.target.closest("[data-dummy]"); if (!d) return;
      if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy Pendataan? Akun dan isian asli tidak tersentuh.")) return;
      d.disabled = true; const x = await Admin.kirim("/api/pendataan/dummy", {aksi: d.dataset.dummy}).catch(() => gagalJaringan);
      if (!x.ok) { d.disabled = false; alert(x.j.galat || `Gagal (${x.status})`); return; }
      location.reload();
    });
  }
  muat();
})();
