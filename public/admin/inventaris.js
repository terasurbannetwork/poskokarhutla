/* Inventaris alat pemadam (/admin/inventaris): rekap per provinsi per kategori, peta gudang, daftar gudang berikut rincian alat dan jejaknya.
   Data dari GET /api/inventaris (admin modOK atau sesi staf pusdalops, verifikator, pimpinan, koordalops; staf berwilayah hanya provinsinya).
   CSP admin: tanpa skrip/gaya inline, semua teks data lewat textContent. Peta = SVG titik digambar di sini (tanpa pustaka luar).
   INP: chip dan kartu berubah SEKETIKA, bagian berat (peta, tabel, daftar) digambar sesudah satu frame dan daftar dipotong. Dummy: Super Admin saja (🧪 isi, 🧹 hapus). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const sv = (tag, att, ...anak) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att || {})) e.setAttribute(k, v); for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const HARI = 864e5, POTONG = 15, IKON = {pompa: "💧", selang_1_5: "🪢", selang_2_5: "🪢", nozzle: "🚿", jet_shooter_lance: "🎯", tangki_fleksibel: "🛢️", mobil_tangki: "🚛", mobil_pemadam: "🚒", motor_trail: "🏍️",
    alat_berat: "🚜", drone_termal: "🛸", genset: "🔌", perahu: "🚤", apd_set: "🦺", scba: "😷", kepyok_garu: "🧹", pompa_punggung: "🎒", ht_radio: "📻", tenda: "⛺", lainnya: "📦"};
  const IKON_P3K = {kotak_p3k: "🧰", tandu: "🛏️", tabung_oksigen: "🫁", regulator: "🔧", masker_n95: "😷", obat_tetes_mata: "👁️", salep_luka_bakar: "🧴", infus_oralit: "💧", aed: "❤️", lainnya: "➕"};   // sama dengan KATEGORI_P3K (src/inventaris.js)
  const KOND = {baik: "Baik", rusak_ringan: "Rusak ringan", rusak_berat: "Rusak berat"}, STAT = {siap: "Siap", dikerahkan: "Dikerahkan", servis: "Servis"};
  const waktu = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const umur = (kini, t) => { const d = Math.floor((kini - t) / HARI); return d < 1 ? "hari ini" : d + " hari lalu"; };
  const kirim = async (url, body) => { try { const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {})}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}}; } };
  let D = null, F = {pihak: "", prov: "", basi: false, semua: false}, buka = new Set(), jadwal = 0, pesanTeks = "", pesanOk = true;
  const pesan = (t, ok = true) => { pesanTeks = t || ""; pesanOk = ok; const p = document.getElementById("ivPesan"); if (p) { p.textContent = pesanTeks; p.className = "iv-pesan " + (ok ? "ok" : "galat"); } };
  const kosong = (teks, ...tombol) => app.replaceChildren(h("div", {class: "iv-kosong"}, h("p", {teks}), ...tombol));
  const lihat = () => D.gudang.filter(g => !F.basi || g.basi);

  /* ---------- peta titik ---------- */
  function gambarPeta() {
    const G = lihat(), w = document.getElementById("ivPeta"); if (!w) return;
    if (!G.length) { w.replaceChildren(h("p", {class: "iv-redup", teks: "Tidak ada gudang untuk ditampilkan di peta."})); return; }
    const lat = G.map(g => g.lat), lon = G.map(g => g.lon), pad = 1.2, a = Math.min(...lat) - pad, b = Math.max(...lat) + pad, c = Math.min(...lon) - pad, d = Math.max(...lon) + pad;
    const W = 1000, T = Math.max(220, Math.min(560, W * (b - a) / (d - c))), x = o => (o - c) / (d - c) * W, y = o => (b - o) / (b - a) * T;
    const svg = sv("svg", {viewBox: `0 0 ${W} ${T}`, role: "img", "aria-label": `Peta ${G.length} gudang`, class: "iv-svg"});
    for (let o = Math.ceil(c); o <= d; o++) svg.append(sv("line", {x1: x(o), y1: 0, x2: x(o), y2: T, class: "iv-gr"}));
    for (let o = Math.ceil(a); o <= b; o++) svg.append(sv("line", {x1: 0, y1: y(o), x2: W, y2: y(o), class: "iv-gr"}));
    for (const g of G) {
      const kls = g.siap <= 0 ? "kosong" : g.basi ? "basi" : "ok", r = 7 + Math.min(14, Math.sqrt(g.siap) * 1.4);
      const t = sv("circle", {cx: x(g.lon), cy: y(g.lat), r, class: "iv-titik " + kls, "data-gudang": g.id, tabindex: "0", role: "button", "aria-label": `${g.nama}, ${g.siap} unit siap`}, sv("title", {}, document.createTextNode(`${g.nama}: ${g.siap} unit siap dari ${g.total}`)));
      svg.append(t);
    }
    w.replaceChildren(svg, h("p", {class: "iv-legenda"}, h("span", {class: "iv-pil ok", teks: "Siap, diperbarui"}), h("span", {class: "iv-pil basi", teks: "Lebih dari 30 hari"}), h("span", {class: "iv-pil kosong", teks: "Tanpa alat siap"}), h("span", {class: "iv-redup", teks: "Ukuran titik = jumlah unit siap"})));
  }

  /* ---------- rekap provinsi x kategori ---------- */
  function gambarRekap() {
    const K = D.kamus.kategori, w = document.getElementById("ivRekap"); if (!w) return;
    if (!D.rekap.length) { w.replaceChildren(h("p", {class: "iv-redup", teks: "Belum ada alat tercatat untuk penyaring ini."})); return; }
    const total = Object.fromEntries(K.map(k => [k.k, 0]));
    for (const p of D.rekap) for (const [k, v] of Object.entries(p.kategori)) total[k] += v.siap;
    const ada = K.filter(k => total[k.k] > 0 || D.rekap.some(p => p.kategori[k.k]));
    w.replaceChildren(h("div", {class: "iv-tabel-wadah"}, h("table", {class: "iv-tabel"},
      h("thead", null, h("tr", null, h("th", {teks: "Provinsi"}), h("th", {teks: "Gudang"}), ...ada.map(k => h("th", {title: k.label, teks: (IKON[k.k] || "") + " " + k.label})))),
      h("tbody", null, ...D.rekap.map(p => h("tr", null, h("td", {teks: p.nama}), h("td", {teks: fmt(p.gudang)}), ...ada.map(k => { const v = p.kategori[k.k];
        return h("td", {class: v ? (v.siap ? "" : "nol") : "tak", title: v ? `${fmt(v.siap)} siap, ${fmt(v.dikerahkan)} dikerahkan, ${fmt(v.total)} total` : "tidak tercatat", teks: v ? fmt(v.siap) : "0"}); }))),
        h("tr", {class: "iv-jumlah"}, h("td", {teks: "Jumlah siap"}), h("td", {teks: fmt(D.rekap.reduce((s, p) => s + p.gudang, 0))}), ...ada.map(k => h("td", {teks: fmt(total[k.k])})))))));
  }

  /* ---------- rekap P3K dan medis per provinsi (tabel p3k, migrasi 0034) ---------- */
  function gambarP3k() {
    const w = document.getElementById("ivP3k"); if (!w) return;
    if (!D.p3k_aktif) { w.replaceChildren(h("p", {class: "iv-redup", teks: "Inventaris P3K belum diaktifkan: migrasi D1 0034_korban_p3k belum diterapkan."})); return; }
    if (!D.rekap_p3k.length) { w.replaceChildren(h("p", {class: "iv-redup", teks: "Belum ada barang P3K tercatat untuk penyaring ini."})); return; }
    const K = D.kamus.p3k, ada = K.filter(k => D.rekap_p3k.some(p => p.kategori[k.k])), total = k => D.rekap_p3k.reduce((s, p) => s + (p.kategori[k]?.jumlah || 0), 0);
    w.replaceChildren(h("div", {class: "iv-tabel-wadah"}, h("table", {class: "iv-tabel"},
      h("thead", null, h("tr", null, h("th", {teks: "Provinsi"}), ...ada.map(k => h("th", {title: k.label, teks: (IKON_P3K[k.k] || "") + " " + k.label})))),
      h("tbody", null, ...D.rekap_p3k.map(p => h("tr", null, h("td", {teks: p.nama}), ...ada.map(k => { const v = p.kategori[k.k], perlu = v && (v.kedaluwarsa || v.rendah);
        return h("td", {class: v ? (perlu ? "peringatan" : "") : "tak", title: v ? `${fmt(v.jumlah)} total, ${fmt(v.jenis)} jenis, ${fmt(v.kedaluwarsa)} hampir kedaluwarsa, ${fmt(v.rendah)} di bawah ambang` : "tidak tercatat", teks: v ? fmt(v.jumlah) : "0"}); }))),
        h("tr", {class: "iv-jumlah"}, h("td", {teks: "Jumlah"}), ...ada.map(k => h("td", {teks: fmt(total(k.k))})))))),
      h("p", {class: "iv-redup", teks: "Sel merah muda: ada barang yang kedaluwarsa dalam 30 hari atau stoknya di bawah ambang pemilik gudang."}));
  }

  /* ---------- daftar gudang ---------- */
  function kartuGudang(g) {
    const terbuka = buka.has(g.id);
    return h("li", {class: "iv-gudang" + (g.basi ? " basi" : ""), id: "g" + g.id, "data-id": g.id},
      h("div", {class: "iv-baris"}, h("b", {teks: g.nama}), h("span", {class: "iv-pil", teks: D.kamus.jenis[g.jenis]}), g.dummy ? h("span", {class: "iv-pil dummy", teks: "DUMMY"}) : null,
        g.basi ? h("span", {class: "iv-pil basi", teks: "Belum diperbarui lebih dari 30 hari"}) : null),
      h("p", {class: "iv-meta", teks: [`${g.pemilik.nama}`, g.kab ? `${window.Wilayah.kab(g.kab)}, ${provNama(g.prov)}` : provNama(g.prov), `diperbarui ${umur(D.kini, g.diubah)}`].join(", ")}),
      h("p", {class: "iv-meta", teks: `${fmt(g.siap)} unit siap dari ${fmt(g.total)}${g.rusak_berat ? `, ${fmt(g.rusak_berat)} rusak berat` : ""}`}),
      g.pic_nama ? h("p", {class: "iv-meta", teks: `PIC ${g.pic_nama}${g.pic_wa ? ", " : ""}`}, g.pic_wa ? h("a", {href: "https://wa.me/" + g.pic_wa, target: "_blank", rel: "noopener noreferrer", teks: "+" + g.pic_wa}) : null) : null,
      h("div", {class: "iv-aksi"}, h("button", {class: "iv-btn", type: "button", "data-rinci": g.id, "aria-expanded": String(terbuka), teks: terbuka ? "Tutup rincian" : "Rincian alat dan jejak"}),
        h("a", {class: "iv-btn", href: `https://www.google.com/maps?q=${g.lat},${g.lon}`, target: "_blank", rel: "noopener noreferrer", teks: "Buka peta"})),
      terbuka ? h("div", {class: "iv-rinci", "data-rinci-isi": g.id}, h("p", {class: "iv-redup", teks: "Memuat rincian…"})) : null);
  }
  const provNama = k => (D.rekap.find(p => p.prov === k) || {}).nama || k;
  function gambarDaftar() {
    const G = lihat(), w = document.getElementById("ivDaftar"); if (!w) return;
    const tampil = F.semua ? G : G.slice(0, POTONG);
    w.replaceChildren(...(G.length ? [h("ul", {class: "iv-daftar"}, tampil.map(kartuGudang)), G.length > tampil.length ? h("button", {class: "iv-btn", type: "button", "data-semua": "1", teks: `Lihat semua ${fmt(G.length)} gudang`}) : null]
      : [h("p", {class: "iv-redup", teks: "Tidak ada gudang yang cocok dengan penyaring."})]));
    for (const e of w.querySelectorAll("[data-rinci-isi]")) muatRinci(e.dataset.rinciIsi);
  }
  async function muatRinci(id) {
    const e = document.querySelector(`[data-rinci-isi="${CSS.escape(id)}"]`); if (!e) return;
    const r = await fetch("/api/inventaris/gudang/" + id).then(x => x.ok ? x.json() : null).catch(() => null);
    if (!r) return e.replaceChildren(h("p", {class: "iv-pesan galat", teks: "Rincian gagal dimuat."}));
    e.replaceChildren(h("div", {class: "iv-tabel-wadah"}, h("table", {class: "iv-tabel"}, h("thead", null, h("tr", null, ["Alat", "Jumlah", "Kondisi", "Status", "Keterangan"].map(k => h("th", {teks: k})))),
      h("tbody", null, ...r.alat.map(a => h("tr", null, h("td", {teks: `${IKON[a.kategori] || ""} ${D.kamus.kategori.find(k => k.k === a.kategori)?.label}${a.merek_model ? ", " + a.merek_model : ""}`}), h("td", {teks: fmt(a.jumlah)}),
        h("td", {class: a.kondisi, teks: KOND[a.kondisi]}), h("td", {class: a.status, teks: STAT[a.status]}),
        h("td", {teks: [a.kelas_pompa ? a.kelas_pompa.replace("_", " ") : null, a.hp ? a.hp + " HP" : null, a.kapasitas ? fmt(a.kapasitas) + (D.kamus.kategori.find(k => k.k === a.kategori)?.satuan || "") : null, a.tahun, a.catatan].filter(Boolean).join(", ")})))))),
      ...(r.p3k?.length ? [h("h4", {teks: "P3K dan medis"}), h("div", {class: "iv-tabel-wadah"}, h("table", {class: "iv-tabel"}, h("thead", null, h("tr", null, ["Barang", "Jumlah", "Kedaluwarsa", "Ambang"].map(k => h("th", {teks: k})))),
        h("tbody", null, ...r.p3k.map(x => h("tr", null, h("td", {teks: `${IKON_P3K[x.kategori] || ""} ${D.kamus.p3k.find(k => k.k === x.kategori)?.label}${x.nama ? ", " + x.nama : ""}`}), h("td", {class: x.rendah ? "rusak_berat" : "", teks: `${fmt(x.jumlah)} ${x.satuan}`}),
          h("td", {class: x.kdl ? "rusak_berat" : "", teks: x.kedaluwarsa ? x.kedaluwarsa + (x.kdl === "lewat" ? " (lewat)" : x.kdl === "dekat" ? " (dekat)" : "") : "-"}), h("td", {teks: x.ambang != null ? fmt(x.ambang) : "-"})))))),
        r.p3k_jejak?.length ? h("ol", {class: "iv-jejak"}, ...r.p3k_jejak.slice(0, 20).map(j => h("li", {teks: `${waktu(j.waktu)}, ${j.oleh}: ${j.aksi}${j.dari != null || j.ke != null ? ` (${j.dari ?? "-"} ke ${j.ke ?? "-"})` : ""}${j.tugas_id ? ", dipakai di tugas api" : ""}`}))) : null] : []),
      h("h4", {teks: "Jejak perubahan"}), r.jejak.length ? h("ol", {class: "iv-jejak"}, ...r.jejak.slice(0, 30).map(j => h("li", {teks: `${waktu(j.waktu)}, ${j.oleh}: ${j.aksi}${j.dari != null || j.ke != null ? ` (${j.dari ?? "-"} ke ${j.ke ?? "-"})` : ""}`}))) : h("p", {class: "iv-redup", teks: "Belum ada jejak."}));
  }

  /* ---------- kerangka ---------- */
  const tunda = () => { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(() => { gambarPeta(); gambarRekap(); gambarP3k(); gambarDaftar(); }, 0)); };
  function gambarKontrol() {
    const G = D.gudang, siap = G.reduce((s, g) => s + g.siap, 0), basi = G.filter(g => g.basi).length;
    const kt = (l, n, kls = "", data = {}) => h("button", {class: "iv-kartu " + kls, type: "button", ...data}, h("b", {teks: fmt(n)}), h("span", {teks: l}));
    const provs = [...new Map(D.rekap.map(p => [p.prov, p.nama])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    app.replaceChildren(h("p", {id: "ivPesan", class: "iv-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "iv-ringkas"}, kt("Gudang", G.length), kt("Unit alat siap", siap), kt("Belum diperbarui lebih dari 30 hari", basi, basi ? "merah" : "", {"data-basi": "1", "aria-pressed": String(F.basi)})),
      h("div", {class: "iv-saring"},
        h("div", {class: "iv-chip-baris", role: "group", "aria-label": "Pihak"}, h("button", {class: "iv-chip", type: "button", "data-pihak": "", "aria-pressed": String(!F.pihak)}, "Semua pihak"),
          ...Object.entries(D.pihak).map(([k, l]) => h("button", {class: "iv-chip", type: "button", "data-pihak": k, "aria-pressed": String(F.pihak === k)}, l))),
        h("select", {id: "ivProv", "aria-label": "Provinsi"}, h("option", {value: "", teks: "Semua provinsi"}), ...provs.map(([k, n]) => h("option", {value: k, teks: n, selected: F.prov === k})))),
      h("section", {class: "iv-bagian"}, h("h2", {teks: "Peta gudang"}), h("div", {id: "ivPeta"})),
      h("section", {class: "iv-bagian"}, h("h2", {teks: "Alat siap per provinsi dan kategori"}), h("div", {id: "ivRekap"})),
      h("section", {class: "iv-bagian"}, h("h2", {teks: "P3K dan medis per provinsi"}), h("div", {id: "ivP3k"})),
      h("section", {class: "iv-bagian"}, h("h2", {teks: "Gudang"}), h("div", {id: "ivDaftar"})));
    tunda();
  }
  async function muat() {
    const q = new URLSearchParams(); if (F.pihak) q.set("pihak", F.pihak); if (F.prov) q.set("prov", F.prov);
    const r = await fetch("/api/inventaris" + (q.size ? "?" + q : "")).catch(() => null);
    if (!r) return kosong("Jaringan putus. Periksa sinyal lalu coba lagi.", h("button", {class: "iv-btn utama", type: "button", "data-ulang": "1", teks: "Coba lagi"}));
    if (r.status === 401 || r.status === 403) return kosong(r.status === 401 ? "Masuk dulu untuk melihat inventaris alat." : "Akun ini tidak punya akses ke inventaris alat. Peran yang boleh: admin moderator, Pusdalops, verifikator, koordinator, pimpinan.",
      ...(document.body.dataset.masuk === "1" ? [h("a", {class: "iv-btn utama", href: "/admin/pantau", teks: "Kembali ke Meja Pantau"})]   // staf yang sudah masuk: tidak dilempar ke login admin
        : [h("a", {class: "iv-btn utama", href: "/admin/pantau", teks: "Masuk sebagai staf"}), h("a", {class: "iv-btn", href: "/admin/masuk?ke=%2Fadmin%2Finventaris", teks: "Masuk sebagai admin"})]));
    if (r.status === 503) return kosong("Inventaris belum diaktifkan: migrasi D1 0031_inventaris belum diterapkan.");
    if (!r.ok) return kosong(`Galat ${r.status}.`, h("button", {class: "iv-btn utama", type: "button", "data-ulang": "1", teks: "Coba lagi"}));
    D = await r.json();
    if (!D.gudang.length && !F.pihak && !F.prov) { app.replaceChildren(h("p", {id: "ivPesan", class: "iv-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "iv-kosong"}, h("p", {teks: "Belum ada gudang tercatat. Akun instansi menambahkan gudang dan alatnya di halaman /instansi, tab Peralatan."}), h("a", {class: "iv-btn utama", href: "/instansi", teks: "Buka halaman instansi"}))); pasangDummy(); return; }
    gambarKontrol(); pasangDummy();
  }
  app.addEventListener("click", async e => {
    const t = e.target;
    if (t.closest("[data-ulang]")) return muat();
    const p = t.closest("[data-pihak]"); if (p) { F.pihak = p.dataset.pihak; for (const c of app.querySelectorAll("[data-pihak]")) c.setAttribute("aria-pressed", String(c.dataset.pihak === F.pihak)); return muat(); }
    if (t.closest("[data-basi]")) { F.basi = !F.basi; t.closest("[data-basi]").setAttribute("aria-pressed", String(F.basi)); return tunda(); }
    if (t.closest("[data-semua]")) { F.semua = true; return tunda(); }
    const ri = t.closest("[data-rinci]");
    if (ri) { const id = ri.dataset.rinci; buka.has(id) ? buka.delete(id) : buka.add(id); const li = document.getElementById("g" + id), g = D.gudang.find(x => x.id === id); li.replaceWith(kartuGudang(g)); if (buka.has(id)) muatRinci(id); return; }
    const ti = t.closest("[data-gudang]"); if (ti) { const id = ti.dataset.gudang; if (!lihat().slice(0, F.semua ? 1e9 : POTONG).some(g => g.id === id)) { F.semua = true; gambarDaftar(); } document.getElementById("g" + id)?.scrollIntoView({behavior: "smooth", block: "center"}); }
  });
  app.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-gudang]")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", {bubbles: true})); } });
  app.addEventListener("change", e => { if (e.target.id === "ivProv") { F.prov = e.target.value; muat(); } });

  /* dummy: Super Admin saja, dua ikon (DUMMY.md); layar dimuat ulang penuh sesudah isi dan hapus */
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy inventaris (gudang, alat, jejak contoh)? Data asli tidak tersentuh.")) return;
    d.disabled = true; const r = await kirim("/api/inventaris/dummy", {aksi: d.dataset.dummy}); d.disabled = false;
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    const t0 = d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.gudang} gudang dan ${r.j.alat} jenis alat di beberapa provinsi.` : `Dummy dihapus: ${r.j.gudang} gudang, ${r.j.alat} jenis alat.`;
    F = {pihak: "", prov: "", basi: false, semua: false}; buka.clear(); await muat(); pesan(t0, true);
  });
  function pasangDummy() { Admin.pasangDummy(aksiJudul, !!D?.super); }
  muat();
})();
