/* Meja Pantau (/admin/pantau): antrean kerja harian staf BNPB. Data dari GET /api/pantau (dihitung server saat dibaca, disaring peran dan wilayah); aksi ke POST /api/pantau/butir.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat textContent. INP: kontrol (kartu ringkas, chip, tombol) berubah SEKETIKA, daftar berat digambar sesudah satu frame
   dan dipotong per kelompok (lihat semua). Tombol dummy (Super Admin) mengisi rantai hulu ke hilir lewat POST /api/pantau/dummy. */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul");
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const JAM = 36e5, HARI = 24 * JAM, POTONG = 12;
  const PERAN = {verifikator: "Verifikator akun instansi", pusdalops: "Pusdalops", analis_konsesi: "Analis konsesi", udara: "Operasi udara", tmc: "TMC/OMC", koordalops: "Koordinator Pusdalops", pimpinan: "Pimpinan"};
  const STATUS = {baru: "Baru", dikerjakan: "Dikerjakan", selesai: "Selesai", abaikan: "Diabaikan"}, PRIO = {0: "Tertinggi", 1: "Segera", 2: "Penting", 3: "Biasa"};
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const lama = fmt.durasi;   // SATU formatter durasi semua layar (/inti/format.js): "12 menit", "6 jam 24 menit", "2 hari 3 jam"
  const wil = window.Wilayah;   // ejaan resmi kab/kota dan nama provinsi (/instansi_wilayah.js)
  /* deep link ke layar kerja: halaman + tab + butir sumber (#pantau/<tugas>, #validasi/<akun>, #kontak/<usulan>); id butir = jenis:sumber[:keadaan] */
  const tautanKerja = b => { const sumber = b.id.split(":")[1] ?? "", tab = b.jenis.startsWith("api_") ? "pantau" : b.jenis === "akun_menunggu" ? "validasi" : b.jenis === "usulan_kontak" ? "kontak" : "";
    return b.tautan + (tab && sumber ? `#${tab}/${sumber}` : ""); };
  const waktu = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "";
  /* kiriman lewat sesi staf wajib x-pb: 1 (rute menolak tanpa itu); balasan non-JSON tidak melempar */
  const kirim = async (url, body) => { try { const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {})}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}}; } };
  const tombol = (t, data, kls = "") => h("button", {class: "pt-btn " + kls, type: "button", ...data}, t);
  let D = null, F = {jenis: "", prov: "", punyaku: false, semua: false, kartu: ""}, buka = new Set(), pesanTeks = "", pesanOk = true, jadwal = 0, formAbaikan = null;

  const pesan = (t, ok = true) => { pesanTeks = t || ""; pesanOk = ok; const p = document.getElementById("ptPesan"); if (p) { p.textContent = pesanTeks; p.className = "pt-pesan " + (ok ? "ok" : "galat"); } };

  /* ---------- masuk staf ---------- */
  function kartuMasuk(...isi) { app.replaceChildren(h("div", {class: "pt-masuk"}, ...isi)); }
  /* tertahan = {nama} dari 401 /api/pantau bila sesi sah tetapi sandi awal belum diganti (tanpa panggilan /saya tambahan) */
  function layarMasuk(galat, tertahan) {
    if (tertahan) return layarGanti(tertahan);
    const u = h("input", {id: "ptUser", name: "username", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true}), p = h("input", {id: "ptSandi", name: "sandi", type: "password", autocomplete: "current-password", required: true});
    const f = h("form", {class: "pt-form"}, h("label", {for: "ptUser", teks: "Username staf"}), u, h("label", {for: "ptSandi", teks: "Kata sandi"}), p,
      h("p", {id: "ptGalat", class: "pt-pesan galat", role: "alert", teks: galat || ""}), tombol("Masuk", {type: "submit"}, "utama"));
    f.addEventListener("submit", async e => { e.preventDefault(); const r = await kirim("/api/staf/masuk", {username: u.value, sandi: p.value});
      if (r.ok) return muat(); document.getElementById("ptGalat").textContent = r.j.galat || `Gagal (${r.status})`; });
    kartuMasuk(h("h2", {teks: "Masuk staf BNPB"}), h("p", {class: "pt-redup", teks: "Akun staf dibuat Super Admin. Admin yang sudah punya akun admin masuk lewat halaman admin."}), f,
      h("a", {class: "pt-btn", href: "/admin/masuk?ke=%2Fadmin%2Fpantau", teks: "Masuk sebagai admin"}));
  }
  function layarGanti(staf) {
    const kotak = h("div"), b = tombol("Buat sandi baru", {}, "utama");
    b.addEventListener("click", async () => { b.disabled = true; const r = await kirim("/api/staf/gantisandi", {});
      if (!r.ok) { b.disabled = false; kotak.replaceChildren(h("p", {class: "pt-pesan galat", teks: r.j.galat || `Gagal (${r.status})`})); return; }
      b.remove(); kotak.replaceChildren(h("p", {teks: "Sandi baru Anda, tampil sekali. Simpan sekarang, lalu lanjut."}), h("code", {class: "pt-rahasia", teks: r.j.sandi}), tombol("Lanjut", {}, "utama")); kotak.querySelector("button").addEventListener("click", () => muat()); });
    kartuMasuk(h("h2", {teks: `Halo ${staf.nama}`}), h("p", {teks: "Sandi awal diketahui admin. Buat sandi baru acak sebelum memakai Meja Pantau."}), b, kotak);
  }

  /* ---------- daftar butir ---------- */
  const lihat = () => D.butir.filter(b => (F.semua || b.status === "baru" || b.status === "dikerjakan") && (!F.jenis || b.jenis === F.jenis) && (!F.prov || b.provs.includes(F.prov))
    && (!F.punyaku || b.ditugaskan_ke?.id === D.saya.id) && (F.kartu !== "terlambat" || b.terlambat) && (F.kartu !== "belum" || !b.ditugaskan_ke));
  function kartuButir(b) {
    const s = D.saya, milik = b.ditugaskan_ke?.id === s.id, tutup = b.status === "selesai" || b.status === "abaikan";
    const aksi = [];
    if (!s.baca_saja) {
      if (!tutup) {
        if (s.id && !milik) aksi.push(tombol("Ambil", {"data-aksi": "ambil"}, "utama"));
        aksi.push(tombol("Abaikan", {"data-aksi": "abaikan"}));
        if (s.koordinator) aksi.push(h("select", {class: "pt-pilih", "data-tugaskan": "1", "aria-label": "Tugaskan ke"}, h("option", {value: "", teks: "Tugaskan ke…"}), ...D.staf.map(x => h("option", {value: x.id, teks: x.nama, selected: b.ditugaskan_ke?.id === x.id}))));
        if (b.ditugaskan_ke && (milik || s.koordinator)) aksi.push(tombol("Lepas", {"data-aksi": "lepas"}));
      } else aksi.push(tombol("Buka lagi", {"data-aksi": "buka"}));
    }
    aksi.push(h("a", {class: "pt-btn", href: tautanKerja(b), teks: "Buka layar kerja"}));
    for (const t of b.tagih || []) aksi.push(h("a", {class: "pt-btn wa", href: t.tautan, target: "_blank", rel: "noopener noreferrer", title: t.untuk}, h("b", {teks: t.jenis === "wakil" ? "Tagih wakil" : "Tagih PIC"}), h("small", {teks: t.nama ?? t.untuk})));
    aksi.push(tombol("Riwayat", {"data-aksi": "riwayat"}));
    return h("li", {class: "pt-butir p" + b.prioritas + (tutup ? " tutup" : ""), "data-id": b.id},
      h("div", {class: "pt-baris"}, h("span", {class: "pt-pil p" + b.prioritas, teks: PRIO[b.prioritas]}), h("span", {class: "pt-pil " + b.status, teks: STATUS[b.status]}), b.dummy ? h("span", {class: "pt-pil dummy", teks: "DUMMY"}) : null,
        b.ditugaskan_ke ? h("span", {class: "pt-pil orang", teks: milik ? "Punya saya" : b.ditugaskan_ke.nama}) : h("span", {class: "pt-pil kosong", teks: "Belum ditugaskan"})),
      h("p", {class: "pt-judul", teks: wil.teks(b.judul)}),
      h("p", {class: "pt-meta", teks: [b.kab ? `${wil.kab(b.kab)}, ${b.prov_nama}` : b.prov_nama, `umur ${lama(b.umur)}`, b.tenggat ? (b.terlambat ? `lewat tenggat ${lama(Date.now() - b.tenggat)}` : `tenggat ${waktu(b.tenggat)}`) : null].filter(Boolean).join(", ")}),
      b.rincian ? h("p", {class: "pt-meta", teks: wil.teks(b.rincian)}) : null,
      b.status === "abaikan" && b.alasan ? h("p", {class: "pt-meta", teks: "Alasan diabaikan: " + b.alasan}) : (b.catatan ? h("p", {class: "pt-meta", teks: "Catatan: " + b.catatan}) : null),
      h("div", {class: "pt-aksi"}, aksi), formAbaikan === b.id ? formAlasan(b) : null, buka.has(b.id) ? h("ol", {class: "pt-riwayat", "data-riwayat": "1"}, h("li", {teks: "Memuat riwayat…"})) : null);
  }
  /* alasan abaikan: form di dalam kartu (bukan dialog bawaan peramban); Enter = simpan, Escape = batal */
  function formAlasan(b) {
    const i = h("input", {id: "ptAlasan", name: "alasan", maxlength: "300", autocomplete: "off", placeholder: "Alasan mengabaikan (wajib, minimal 3 huruf)", "aria-label": "Alasan mengabaikan butir ini"});
    const f = h("form", {class: "pt-alasan", "data-alasan-form": b.id}, i, h("p", {class: "pt-pesan galat", role: "alert", "data-alasan-galat": "1"}), h("div", {class: "pt-aksi"}, tombol("Simpan alasan", {type: "submit"}, "utama"), tombol("Batal", {"data-aksi": "batal-abaikan"})));
    queueMicrotask(() => i.focus());
    return f;
  }
  function gambarDaftar() {
    const isi = lihat(), kel = new Map(Object.keys(D.jenis).map(j => [j, []]));
    for (const b of isi) kel.get(b.jenis)?.push(b);
    const adaIsi = [...kel.values()].some(x => x.length);
    const info = h("p", {class: "pt-redup pt-catatan", teks: "Butir dihitung dari keadaan sebenarnya dan hilang sendiri saat keadaannya selesai (akun divalidasi, laporan terkirim, dan seterusnya). Karena itu tidak ada tombol Selesai: ambil, tugaskan, atau abaikan dengan alasan."});
    document.getElementById("ptDaftar")?.replaceChildren(info, ...(adaIsi ? [...kel].filter(([, x]) => x.length).map(([j, x]) => {
      const semua = F["lebih_" + j], tampil = semua ? x : x.slice(0, POTONG);
      return h("section", {class: "pt-kel", "aria-label": D.jenis[j]}, h("h3", null, D.jenis[j], h("span", {class: "pt-hitung", teks: angka(x.length)})),
        h("ul", {class: "pt-daftar"}, tampil.map(kartuButir)), x.length > tampil.length ? tombol(`Lihat semua ${angka(x.length)}`, {"data-lebih": j}) : null);
    }) : [h("p", {class: "pt-kosong", teks: D.butir.length ? "Tidak ada butir yang cocok dengan penyaring." : "Antrean kosong. Tidak ada pekerjaan yang menunggu untuk peran dan wilayah Anda."})]));
    for (const li of document.querySelectorAll("[data-riwayat]")) muatRiwayat(li);
  }
  /* kontrol urgent (cetak segera), daftar berat sesudah frame berikutnya; panggilan beruntun hanya menggambar yang terakhir */
  function tunda() { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambarDaftar, 0)); }
  function gambarKontrol() {
    const r = D.ringkas, s = D.saya, provs = [...new Map(D.butir.flatMap(b => b.provs.map(p => [p, wil.prov(p)]))).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const kt = (k, l, n, kls = "") => h("button", {class: "pt-kartu " + kls, type: "button", "data-kartu": k, "aria-pressed": String(k === "punyaku" ? F.punyaku : F.kartu === k)}, h("b", {teks: angka(n)}), h("span", {teks: l}));
    /* banner merah: laporan korban jiwa yang belum diverifikasi (butir prioritas 0, jenis korban_baru); hilang sendiri sesudah diverifikasi */
    const korban = D.butir.filter(b => b.jenis === "korban_baru" && (b.status === "baru" || b.status === "dikerjakan")).length;
    app.replaceChildren(korban ? h("div", {class: "pt-banner-korban", role: "alert"}, h("span", {teks: `${angka(korban)} laporan korban jiwa belum diverifikasi.`}), h("a", {href: "/admin/korban", teks: "Buka laporan korban"})) : null,
      h("p", {id: "ptPesan", class: "pt-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "pt-orang"}, h("span", {teks: `${s.nama}${s.admin ? " (admin)" : ""}, ${s.peran.map(p => PERAN[p] || p).join(", ")}`}), h("span", {class: "pt-redup", teks: s.wilayah.length ? `wilayah ${s.wilayah.length} provinsi` : "wilayah nasional"}),
        s.baca_saja ? h("span", {class: "pt-pil abaikan", teks: "Baca saja"}) : null, s.id ? tombol("Keluar", {"data-aksi": "keluar"}) : null),
      h("div", {class: "pt-ringkas"}, kt("", "Butir aktif", r.aktif), kt("terlambat", "Terlambat", r.terlambat, r.terlambat ? "merah" : ""), kt("belum", "Belum ditugaskan", r.belum_ditugaskan), s.id ? kt("punyaku", "Punya saya", r.punyaku) : null),
      h("div", {class: "pt-saring"},
        h("div", {class: "pt-chip-baris", role: "group", "aria-label": "Jenis"}, h("button", {class: "pt-chip", type: "button", "data-jenis": "", "aria-pressed": String(!F.jenis)}, "Semua jenis"),
          ...Object.entries(D.jenis).map(([j, l]) => h("button", {class: "pt-chip", type: "button", "data-jenis": j, "aria-pressed": String(F.jenis === j)}, l, h("b", {teks: String(r.per_jenis[j] ?? 0)})))),
        h("div", {class: "pt-baris"}, h("select", {id: "ptProv", "aria-label": "Wilayah"}, h("option", {value: "", teks: "Semua wilayah"}), ...provs.map(([k, n]) => h("option", {value: k, teks: n, selected: F.prov === k}))),
          s.id ? h("label", {class: "pt-cek"}, h("input", {type: "checkbox", "data-punyaku": "1", checked: F.punyaku}), "Punya saya") : null,
          h("label", {class: "pt-cek"}, h("input", {type: "checkbox", "data-semua": "1", checked: F.semua}), "Tampilkan selesai dan diabaikan"))),
      h("div", {id: "ptDaftar", class: "pt-isi"}, h("p", {class: "pt-redup", teks: "Menggambar daftar…"})),
      ...(s.super ? [panelStaf()] : []));
    tunda();
  }

  /* ---------- Super Admin: kelola staf ---------- */
  function panelStaf() {
    const d = h("details", {class: "pt-staf", id: "ptStaf"}, h("summary", {teks: "Kelola akun staf (Super Admin)"}), h("div", {id: "ptStafIsi", class: "pt-redup", teks: "Buka untuk memuat daftar."}));
    d.addEventListener("toggle", () => { if (d.open) muatStaf(); });
    return d;
  }
  async function muatStaf(rahasia) {
    const isi = document.getElementById("ptStafIsi"); if (!isi) return;
    const r = await fetch("/api/staf/admin/daftar").then(x => x.ok ? x.json() : null).catch(() => null);
    if (!r) { isi.textContent = "Daftar staf gagal dimuat."; return; }
    const f = h("form", {class: "pt-form pt-grid", id: "ptBuat"},
      ...[["nama", "Nama lengkap"], ["nip", "NIP"], ["unit", "Unit"], ["email", "Email dinas"], ["wa", "WhatsApp (0812…)"]].map(([k, l]) => h("label", null, l, h("input", {name: k, required: true}))),
      h("fieldset", null, h("legend", {teks: "Peran"}), ...Object.entries(r.peran).map(([k, l]) => h("label", {class: "pt-cek"}, h("input", {type: "checkbox", name: "peran", value: k}), l))),
      h("fieldset", {class: "pt-wilayah"}, h("legend", {teks: "Wilayah kerja (tidak ada yang dipilih = nasional)"}), h("div", {class: "pt-wilayah-isi"}, ...Object.entries(wil.PROV).map(([k, n]) => h("label", {class: "pt-cek"}, h("input", {type: "checkbox", name: "wilayah", value: k}), n)))),
      h("p", {id: "ptBuatGalat", class: "pt-pesan galat", role: "alert"}), tombol("Buat akun staf", {type: "submit"}, "utama"));
    f.addEventListener("submit", async e => { e.preventDefault(); const fd = new FormData(f), o = Object.fromEntries(["nama", "nip", "unit", "email", "wa"].map(k => [k, fd.get(k)]));
      o.peran = fd.getAll("peran"); o.wilayah = fd.getAll("wilayah");
      const x = await kirim("/api/staf/admin/buat", o); if (x.ok) return muatStaf({username: x.j.username, sandi: x.j.sandi, nama: x.j.staf.nama});
      document.getElementById("ptBuatGalat").textContent = x.j.galat || `Gagal (${x.status})`; });
    const baris = r.staf.map(s => h("tr", {"data-staf": s.id}, h("td", null, h("b", {teks: s.nama}), h("small", {teks: `${s.username}, ${s.unit}`})), h("td", {teks: s.peran.map(p => PERAN[p] || p).join(", ")}),
      h("td", {teks: s.wilayah.length ? s.wilayah.map(wil.prov).join(", ") : "Nasional"}), h("td", null, h("span", {class: "pt-pil " + (s.status === "aktif" ? "dikerjakan" : "abaikan"), teks: s.status}), s.dummy ? h("span", {class: "pt-pil dummy", teks: "DUMMY"}) : null),
      h("td", null, s.status === "aktif" && !s.dummy ? h("div", {class: "pt-aksi"}, tombol("Reset sandi", {"data-staf-aksi": "reset"}), tombol("Cabut", {"data-staf-aksi": "cabut"})) : null)));
    isi.className = ""; isi.replaceChildren(
      rahasia ? h("div", {class: "pt-rahasia-kotak"}, h("p", {teks: `Akun untuk ${rahasia.nama ?? "staf"}. Tampil sekali, serahkan langsung:`}), h("code", {class: "pt-rahasia", teks: `${rahasia.username}  ${rahasia.sandi}`})) : null,
      h("div", {class: "pt-tabel-wadah"}, h("table", {class: "pt-tabel"}, h("thead", null, h("tr", null, ["Staf", "Peran", "Wilayah", "Status", ""].map(k => h("th", {teks: k})))), h("tbody", null, baris.length ? baris : h("tr", null, h("td", {colspan: "5", teks: "Belum ada akun staf."}))))), f);
  }

  /* ---------- riwayat satu butir ---------- */
  async function muatRiwayat(ol) {
    const id = ol.closest("[data-id]").dataset.id, r = await fetch("/api/pantau/jejak?id=" + encodeURIComponent(id)).then(x => x.ok ? x.json() : null).catch(() => null);
    ol.replaceChildren(...(r?.jejak?.length ? r.jejak.map(j => h("li", {teks: `${waktu(j.waktu)}, ${j.oleh_nama}: ${j.aksi}${j.ke_nama ? " ke " + j.ke_nama : ""}${j.catatan ? ", " + j.catatan : ""}`})) : [h("li", {teks: r ? "Belum ada riwayat." : "Riwayat gagal dimuat."})]));
  }

  /* ---------- muat dan aksi ---------- */
  async function muat() {
    const r = await fetch("/api/pantau").catch(() => null);
    if (!r) { app.replaceChildren(h("p", {class: "pt-kosong", teks: "Jaringan putus. Muat ulang halaman."})); return; }
    if (r.status === 401) return layarMasuk("", (await r.json().catch(() => ({}))).wajib_ganti);
    if (r.status === 503) { app.replaceChildren(h("p", {class: "pt-kosong", teks: "Meja Pantau belum diaktifkan (migrasi D1 0030_staf belum diterapkan)."})); return; }
    if (!r.ok) { app.addEventListener("click", e => { if (e.target.closest("[data-ulang]")) location.reload(); }, {once: true}); app.replaceChildren(h("div", {class: "pt-galat"}, h("p", {teks: `Galat ${r.status}. Data belum bisa dimuat.`}), tombol("Coba lagi", {"data-ulang": "1"}, "utama"))); return; }
    D = await r.json(); gambarKontrol(); pasangDummy();
  }
  app.addEventListener("click", async e => {
    const t = e.target;
    const kt = t.closest("[data-kartu]");
    if (kt) { const k = kt.dataset.kartu;
      if (k === "punyaku") { F.punyaku = !F.punyaku; const c = app.querySelector("[data-punyaku]"); if (c) c.checked = F.punyaku; } else F.kartu = F.kartu === k ? "" : k;
      for (const x of app.querySelectorAll("[data-kartu]")) x.setAttribute("aria-pressed", String(x.dataset.kartu === "punyaku" ? F.punyaku : x.dataset.kartu === F.kartu));
      tunda(); return; }
    const ch = t.closest("[data-jenis]"); if (ch) { F.jenis = ch.dataset.jenis; for (const c of app.querySelectorAll("[data-jenis]")) c.setAttribute("aria-pressed", String(c.dataset.jenis === F.jenis)); tunda(); return; }
    const le = t.closest("[data-lebih]"); if (le) { F["lebih_" + le.dataset.lebih] = true; tunda(); return; }
    const sa = t.closest("[data-staf-aksi]");
    if (sa) { const id = sa.closest("[data-staf]").dataset.staf, cabut = sa.dataset.stafAksi === "cabut"; if (cabut && !confirm("Cabut akun staf ini? Sesinya langsung berakhir.")) return;
      const r = await kirim("/api/staf/admin/" + id, {aksi: sa.dataset.stafAksi}); if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
      return muatStaf(cabut ? undefined : {username: "(username tetap)", sandi: r.j.sandi, nama: "staf ini"}); }
    const b = t.closest("[data-aksi]"); if (!b || b.disabled) return;
    const a = b.dataset.aksi, li = b.closest("[data-id]"), id = li?.dataset.id;
    if (a === "keluar") { await kirim("/api/staf/keluar", {}); return location.reload(); }
    if (a === "riwayat") { buka.has(id) ? buka.delete(id) : buka.add(id); li.replaceWith(kartuButir(D.butir.find(x => x.id === id))); const ol = document.querySelector(`[data-id="${CSS.escape(id)}"] [data-riwayat]`); if (ol) muatRiwayat(ol); return; }
    if (a === "abaikan" || a === "batal-abaikan") { formAbaikan = a === "abaikan" ? id : null; const tt = D.butir.find(x => x.id === id); if (tt) li.replaceWith(kartuButir(tt)); const ol = document.querySelector(`[data-id="${CSS.escape(id)}"] [data-riwayat]`); if (ol) muatRiwayat(ol); return; }
    await aksiButir(b, {id, aksi: a});
  });
  async function aksiButir(b, o) {
    b.disabled = true; const r = await kirim("/api/pantau/butir", o); b.disabled = false;
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.status})`, false); if (r.status === 404) muat(); return false; }
    formAbaikan = null; pesan("Tersimpan."); const t0 = pesanTeks; await muat(); pesan(t0, true); return true;
  }
  app.addEventListener("submit", e => {
    const f = e.target.closest("[data-alasan-form]"); if (!f) return; e.preventDefault();
    const alasan = f.elements.alasan.value.trim(), g = f.querySelector("[data-alasan-galat]");
    if (alasan.length < 3) { g.textContent = "Tulis alasan minimal 3 huruf."; f.elements.alasan.focus(); return; }
    aksiButir(f.querySelector("button[type=submit]"), {id: f.dataset.alasanForm, aksi: "abaikan", alasan});
  });
  app.addEventListener("keydown", e => { if (e.key === "Escape" && e.target.closest?.("[data-alasan-form]")) { formAbaikan = null; gambarDaftar(); } });
  app.addEventListener("change", async e => {
    const t = e.target;
    if (t.id === "ptProv") { F.prov = t.value; tunda(); return; }
    if (t.dataset.punyaku) { F.punyaku = t.checked; app.querySelector('[data-kartu="punyaku"]')?.setAttribute("aria-pressed", String(F.punyaku)); tunda(); return; }
    if (t.dataset.semua) { F.semua = t.checked; tunda(); return; }
    if (t.dataset.tugaskan) { const id = t.closest("[data-id]").dataset.id, r = await kirim("/api/pantau/butir", {id, aksi: "tugaskan", ke: t.value});
      if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false); await muat(); pesan("Penugasan tersimpan."); }
  });

  /* dummy: Super Admin saja, dua ikon (DUMMY.md). Tombol dipasang setelah /api/pantau tahu siapa pemanggil. */
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy Meja Pantau (staf contoh, penugasan, dan sumbernya di Instansi dan Posko)? Data asli tidak tersentuh.")) return;
    const r = await kirim("/api/pantau/dummy", {aksi: d.dataset.dummy});
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    pesan(d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.staf} staf contoh, ${r.j.butir} butir, ${r.j.penugasan} penugasan.` : `Dummy dihapus: ${r.j.staf} staf, ${r.j.penugasan} penugasan.`); const t0 = pesanTeks; await muat(); pesan(t0, true);
  });
  function pasangDummy() { Admin.pasangDummy(aksiJudul, !!D?.saya.super); }
  muat();
})();
