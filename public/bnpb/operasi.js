/* Operasi Pusdalops (/bnpb/operasi): enam tab, Pemulihan, Laporan Khusus, Roll Call, SK Aktif, Berantai, Medsos (tiga terakhir di operasi_g3.js). Spek: docs/superpowers/specs/2026-11-01-pusdalops-standar.md (W2).
   Data: /api/pusdalops/pemulihan*, /lapsus*, /rollcall* (src/pemulihan.js, lapsus.js, rollcall.js); semua hitungan penyajian di operasi_pusdalops.js (murni, diuji).
   INP: ganti tab/bulan/operasi langsung mengecat chrome (tab aktif, pesan memuat); fetch dan render berat menyusul sesudah dua rAF.
   Tanpa gaya/skrip inline (CSP); teks data lewat textContent saja. */
(() => {
  "use strict";
  const {ikon, h, PROV, JENIS_URUT, namaJenis, muat, kunciKab} = window.Wilayah, O = window.OperasiPusdalops, F = O.fmt, app = document.getElementById("app");
  const TAB = [["pemulihan", "Pemulihan", "tenda"], ["lapsus", "Laporan Khusus", "peringatan"], ["rollcall", "Roll Call", "sosial"], ["sk", "SK Aktif", "kalender"], ["berantai", "Berantai", "tunggu"], ["medsos", "Medsos", "uji"]];
  const BELUM = "Data belum tersedia. Hubungi admin.";
  const IKON_PEMULIHAN = {huntara: "tenda", huntap: "material", dana_tunggu_hunian: "dana", jembatan_gantung: "akses", sumur_bor: "pompa", lainnya: "lainnya"};
  const IKON_STATUS = {rencana: "kalender", berjalan: "tunggu", selesai: "ok", terhenti: "peringatan"};
  const IKON_KONDISI = {normal: "ok", terganggu: "tunggu", padam: "peringatan"};
  const IKON_HASIL = {hadir: "ok", tidak: "senyap", gangguan: "peringatan"};
  const JENIS_LAPSUS = JENIS_URUT.filter(j => j !== "omc");   // sama dengan JENIS di src/logbook.js
  const kini = () => Date.now();
  const st = {tab: "pemulihan", prov: "", opId: null, bulan: O.bulanIni(kini()), info: "", super: false};
  let nomor = 0, kabList = [], wilayahGagal = false, teksWA = "", kertasSiap = false;
  const rc = {bpbd_prov: new Map(), bpbd_kab: [], komunitas: []};   // isian roll call, bertahan antar render

  const api = async (m, u, b) => {
    try { const r = await fetch(u, {method: m, headers: b ? {"content-type": "application/json", "x-pb": "1"} : {}, body: b ? JSON.stringify(b) : undefined});
      return {ok: r.ok, s: r.status, t: Date.parse(r.headers.get("date")) || Date.now(), j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, s: 0, t: Date.now(), j: {}}; }
  };
  const sesudahFrame = f => { let jalan = false; const go = () => { if (!jalan) { jalan = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  const galatTeks = r => r.s === 503 ? BELUM : r.s === 0 ? "Tidak ada sinyal. Coba lagi." : r.s === 401 || r.s === 403 ? "Akunmu belum berhak untuk ini." : r.s === 429 ? "Terlalu sering menyimpan. Tunggu sebentar." : (r.j.galat && r.s < 500 ? r.j.galat : "Belum berhasil. Coba lagi.");
  const tampil = (el, t, ok) => { el.textContent = t || ""; el.className = "bn-pesan" + (t ? (ok === true ? " ok" : ok === false ? " galat" : "") : ""); };

  /* ---------- komponen kecil ---------- */
  const pil = (teks, ton, ik) => h("span", {class: "bn-pil op-t-" + ton}, ik ? ikon(ik) : null, teks);
  const IKON_TONE = {ok: "ok", tunggu: "tunggu", bahaya: "peringatan", info: null};
  const pilDummy = () => pil("DATA DUMMY", "bahaya", "uji");
  const tabel = (kepala, baris, kelas = [], kelasBaris = []) => h("div", {class: "op-bungkus"}, h("table", {class: "op-tabel"}, h("thead", null, h("tr", null, kepala.map(t => h("th", {teks: t})))),
    h("tbody", null, baris.map((b, r) => h("tr", {class: kelasBaris[r] || null}, b.map((c, i) => h("td", {class: kelas[i] || null, ...(c instanceof Node ? {} : {teks: c == null ? "" : String(c)})}, c instanceof Node ? c : null)))))));
  const BATAS = 100;   // daftar panjang: 100 baris pertama + tombol; cetak membuka semuanya
  const tabelBatas = (kepala, baris, kelas, kelasBaris = []) => {
    if (baris.length <= BATAS) return tabel(kepala, baris, kelas, kelasBaris);
    const w = h("div"), tampilkan = n => w.replaceChildren(tabel(kepala, baris.slice(0, n), kelas, kelasBaris), n < baris.length ? h("button", {type: "button", class: "bn-tombol sekunder op-tak-cetak op-lagi", teks: `Tampilkan semua (${F(baris.length)} baris)`}) : null);
    w.addEventListener("click", e => { const b = e.target.closest(".op-lagi"); if (!b) return; b.disabled = true; b.textContent = "Memuat…"; sesudahFrame(() => tampilkan(baris.length)); }); tampilkan(BATAS); return w;
  };
  const isian = (judul, ...anak) => h("label", {class: "bn-isian"}, judul, ...anak);
  const input = (nama, att) => h("input", {name: nama, autocomplete: "off", ...att});
  const opsi = (sel, pasang, placeholder) => sel.replaceChildren(h("option", {value: "", teks: placeholder}), ...pasang.map(([v, t]) => h("option", {value: v, teks: t})));
  const seg = (nama, pasang, nilai, kelas = "") => h("div", {class: "op-seg op-pilih"}, pasang.map(([v, t, ik, k]) => h("label", {class: k || null}, h("input", {type: "radio", name: nama, value: v, checked: v === nilai}), ikon(ik), t)));
  const angka = O.angka, GALAT_ANGKA = "Angka tidak sah: pakai koma untuk desimal, titik hanya pemisah ribuan (contoh 1.200 atau 3,5).";
  const nilaiSeg = (f, nama) => f.querySelector(`input[name="${nama}"]:checked`)?.value || "";
  const sumberKaki = (nama, t) => h("p", {class: "op-kaki", teks: O.sumber(nama, t)});   // waktu respons server (header Date), cadangan jam klien
  const kosong = t => h("p", {class: "op-kosong", teks: t});

  /* pemilih wilayah berantai: provinsi, kabupaten/kota, kejadian logbook (opsional) */
  function pemilih({provBoleh = null, kejadian = false} = {}) {
    const sp = h("select", {name: "prov", "aria-label": "Provinsi"}), sk = h("select", {name: "kab", "aria-label": "Kabupaten/kota"}), sj = kejadian ? h("select", {name: "kejadian_id", "aria-label": "Kejadian logbook"}) : null;
    opsi(sp, Object.entries(PROV).filter(([k]) => !provBoleh || provBoleh.includes(k)), "Pilih provinsi"); opsi(sk, [], "Pilih kabupaten/kota"); if (sj) opsi(sj, [], "Tanpa tautan kejadian");
    let no = 0;
    sp.addEventListener("change", () => { opsi(sk, kabList.filter(k => k.prov === sp.value).map(k => [k.nama, k.nama]), "Pilih kabupaten/kota"); if (sj) { no++; opsi(sj, [], "Tanpa tautan kejadian"); } });
    if (sj) sk.addEventListener("change", async () => {
      const n = ++no; opsi(sj, [], "Tanpa tautan kejadian"); if (!sk.value) return;
      const r = await api("GET", "/api/logbook/buka?kab=" + encodeURIComponent(kunciKab({prov: sp.value, nama: sk.value}))); if (n !== no) return;
      opsi(sj, (r.j.kejadian || []).map(k => [k.id, `${namaJenis(k.jenis)}, ${[k.kec, k.desa].filter(Boolean).join(", ") || "lokasi belum diisi"}`]), "Tanpa tautan kejadian");
    });
    return {sp, sk, sj, kunci: () => sp.value && sk.value ? sp.value + "|" + sk.value : "",
      kolom: [isian("Provinsi", sp), isian("Kabupaten/kota", sk), ...sj ? [isian("Kejadian logbook (opsional)", sj)] : []]};
  }
  /* formulir lipat: kumpul() -> {url, body, ok} atau {galat}; sukses menyegarkan tab dan menaruh pesan ok di bagian atas */
  function formulir(judul, ik, anak, kumpul, tombol = "Simpan", id = null) {
    const pes = h("p", {class: "bn-pesan", role: "status"}), tb = h("button", {type: "submit", class: "bn-tombol"}, ikon("simpan"), tombol);
    const f = h("form", {class: "op-form", novalidate: true}, ...anak, h("div", {class: "op-aksi"}, tb), pes);
    f.addEventListener("submit", async e => {
      e.preventDefault(); const k = kumpul(); if (k.galat) return tampil(pes, k.galat, false);
      tb.disabled = true; tampil(pes, "Menyimpan…"); const r = await api("POST", k.url, k.body); tb.disabled = false;
      if (r.ok) { st.info = k.ok; if (k.sesudah) k.sesudah(r); segarkan(); } else tampil(pes, galatTeks(r), false);
    });
    return h("details", {class: "bn-blok op-tak-cetak", ...id ? {"data-form": id} : {}}, h("summary", {class: "op-judul"}, ikon(ik), judul), f);
  }
  const kepalaBlok = (judul, ik, ...kanan) => h("div", {class: "op-judul-baris"}, h("h2", {class: "op-judul"}, ikon(ik), judul), ...kanan);

  /* ---------- tab 1: pemulihan ---------- */
  async function muatPemulihan() {
    const q = st.prov ? "?prov=" + st.prov : "";
    const [rg, ls] = await Promise.all([api("GET", "/api/pusdalops/pemulihan/ringkasan" + q), api("GET", "/api/pusdalops/pemulihan" + q)]);
    if (!rg.ok) return {r: rg}; if (!ls.ok) return {r: ls};
    const rk = rg.j.ringkasan || [], daftar = ls.j.pemulihan || [], adaDummy = daftar.some(x => x.dummy);
    const np = k => PROV[k] || k;
    const filter = h("select", {name: "prov", "aria-label": "Filter provinsi"}); opsi(filter, Object.entries(PROV), "Semua provinsi"); filter.value = st.prov;
    filter.addEventListener("change", () => { st.prov = filter.value; segarkan(); });
    const total = rk.reduce((a, x) => ({item: a.item + x.item, selesai: a.selesai + x.selesai, terhenti: a.terhenti + x.terhenti, berjalan: a.berjalan + x.berjalan}), {item: 0, selesai: 0, terhenti: 0, berjalan: 0});
    const blokRingkas = h("section", {class: "bn-blok"}, kepalaBlok("Ringkasan per kabupaten/kota", "tenda", isian("Provinsi", filter)),
      h("div", {class: "op-ringkas"}, pil(`${F(total.item)} item`, "info", "daftar"), pil(`${F(total.berjalan)} berjalan`, "info", "tunggu"), pil(`${F(total.selesai)} selesai`, "ok", "ok"), pil(`${F(total.terhenti)} terhenti`, total.terhenti ? "bahaya" : "ok", "peringatan")),
      rk.length ? tabelBatas(["Kabupaten/kota", "Jenis", "Item", "Target", "Realisasi", "Persen", "Status"], rk.map(x => { const s = O.statusRingkas(x);
        return [`${x.kab} (${np(x.prov)})`, pil(O.NAMA_JENIS_PEMULIHAN[x.jenis] || x.jenis, "info", IKON_PEMULIHAN[x.jenis] || "lainnya"), F(x.item), `${F(x.target)} ${x.satuan}`, `${F(x.realisasi)} ${x.satuan}`,
          h("span", null, h("progress", {class: "op-meter", max: "100", value: String(Math.min(100, x.persen || 0)), "aria-label": "Persen realisasi"}), " " + O.fmtPersen(x.persen)), pil(O.NAMA_STATUS[s], O.tonePemulihan(s), IKON_STATUS[s])]; }),
        ["", "", "n", "n", "n", "", "n"]) : kosong("Belum ada item pemulihan untuk filter ini. Tambahkan lewat formulir di bawah."));
    const idPilih = h("select", {name: "id", "aria-label": "Item pemulihan"}); opsi(idPilih, daftar.map(x => [x.id, `${O.NAMA_JENIS_PEMULIHAN[x.jenis] || x.jenis}, ${x.desa ? x.desa + ", " : ""}${x.kab} (${F(x.realisasi)} dari ${F(x.target)} ${x.satuan})`]), "Pilih item");
    const blokDaftar = h("section", {class: "bn-blok"}, kepalaBlok("Daftar item", "daftar", ...adaDummy ? [pilDummy()] : []),
      daftar.length ? tabelBatas(["Jenis", "Lokasi", "Target", "Realisasi", "Persen", "Status", "Pelaksana", "Progres"], daftar.map(x => { const p = O.persen(x.realisasi, x.target);
        const tb = h("button", {type: "button", class: "bn-tombol sekunder op-tak-cetak", "data-progres": x.id}, ikon("tambah"), "Progres");
        tb.addEventListener("click", () => { const d = app.querySelector('[data-form="progres"]'); d.open = true; idPilih.value = x.id; d.scrollIntoView({block: "center"}); });
        return [pil(O.NAMA_JENIS_PEMULIHAN[x.jenis] || x.jenis, "info", IKON_PEMULIHAN[x.jenis] || "lainnya"), `${x.desa ? x.desa + ", " : ""}${x.kab}, ${np(x.prov)}`, `${F(x.target)} ${x.satuan}`, `${F(x.realisasi)} ${x.satuan}`, O.fmtPersen(p),
          h("span", null, pil(O.NAMA_STATUS[x.status], O.tonePemulihan(x.status), IKON_STATUS[x.status]), x.dummy ? pilDummy() : null), x.pelaksana || "", tb]; }),
        ["", "", "n", "n", "n", "n", "", "n"]) : kosong("Belum ada item."), ls.j.terpotong ? h("p", {class: "op-p", teks: "Daftar terpotong 500 item terbaru; saring per provinsi untuk melihat sisanya."}) : null);
    /* form tambah item */
    const pm = pemilih({kejadian: true});
    const jenis = seg("jenis", Object.entries(O.NAMA_JENIS_PEMULIHAN).map(([k, t]) => [k, t, IKON_PEMULIHAN[k] || "lainnya"]), "huntara");
    const f = n => input(n, {inputmode: "decimal"});
    const baru = formulir("Tambah item pemulihan", "tambah", [jenis, h("div", {class: "bn-baris"}, ...pm.kolom, isian("Desa/kelurahan (opsional)", input("desa", {maxlength: "60"}))),
      h("div", {class: "bn-baris"}, isian("Target", f("target")), isian("Realisasi saat ini", f("realisasi")), isian("Satuan (unit, KK, titik)", input("satuan", {maxlength: "20"})),
        isian("Status", (() => { const s = h("select", {name: "status"}); opsi(s, Object.entries(O.NAMA_STATUS), "Pilih status"); s.value = "rencana"; return s; })())),
      h("div", {class: "bn-baris"}, isian("Pelaksana", input("pelaksana", {maxlength: "80"})), isian("Sumber dana", input("sumber_dana", {maxlength: "80"})), isian("Mulai", input("mulai", {type: "date"})), isian("Target selesai", input("selesai", {type: "date"}))),
      isian("Catatan (tanpa nomor telepon)", input("catatan", {maxlength: "500"}))],
    function () {
      const el = n => baru.querySelector(`[name="${n}"]`), v = n => el(n).value.trim();
      if (!pm.kunci()) return {galat: "Pilih provinsi dan kabupaten/kota."}; const target = angka(v("target")), real = v("realisasi") === "" ? 0 : angka(v("realisasi"));
      if (!(target >= 0) || !(real >= 0)) return {galat: GALAT_ANGKA}; if (!v("satuan")) return {galat: "Satuan wajib diisi."};
      const body = {jenis: nilaiSeg(baru, "jenis"), kab: pm.kunci(), target, realisasi: real, satuan: v("satuan"), status: v("status") || "rencana"};
      for (const n of ["desa", "pelaksana", "sumber_dana", "mulai", "selesai", "catatan"]) if (v(n)) body[n] = v(n);
      if (pm.sj?.value) body.kejadian_id = pm.sj.value;
      if (real > target) { if (!confirm(`Realisasi (${F(real)}) melebihi target (${F(target)}). Simpan tetap?`)) return {galat: "Dibatalkan. Periksa lagi angkanya."}; body.yakin = true; }
      return {url: "/api/pusdalops/pemulihan", body, ok: "Item pemulihan tersimpan."};
    });
    const prog = formulir("Tambah progres", "kalender", [h("div", {class: "bn-baris"}, isian("Item", idPilih), isian("Realisasi terbaru", f("realisasi")),
      isian("Status (kosong = tetap)", (() => { const s = h("select", {name: "status"}); opsi(s, Object.entries(O.NAMA_STATUS), "Tetap"); return s; })()), isian("Tanggal", input("tgl", {type: "date"}))), isian("Catatan progres (wajib)", input("catatan", {maxlength: "500"}))],
    function () {
      const el = n => prog.querySelector(`[name="${n}"]`), v = n => el(n).value.trim(), it = daftar.find(x => x.id === idPilih.value);
      if (!it) return {galat: "Pilih item yang diperbarui."}; const real = angka(v("realisasi")); if (!(real >= 0)) return {galat: GALAT_ANGKA}; if (!v("catatan")) return {galat: "Catatan progres wajib diisi."};
      const body = {id: it.id, realisasi: real, catatan: v("catatan")}; if (v("status")) body.status = v("status"); if (v("tgl")) body.tgl = v("tgl");
      if (real > it.target) { if (!confirm(`Realisasi (${F(real)}) melebihi target (${F(it.target)}). Simpan tetap?`)) return {galat: "Dibatalkan. Periksa lagi angkanya."}; body.yakin = true; }
      return {url: "/api/pusdalops/pemulihan/progres", body, ok: "Progres tersimpan."};
    }, "Simpan progres", "progres");
    return {node: [blokRingkas, blokDaftar, baru, prog, sumberKaki("tracker pemulihan Pusdalops (input staf)", rg.t)], dummy: adaDummy};
  }

  /* ---------- tab 2: laporan khusus ---------- */
  const tabelLayanan = l => h("span", {class: "op-layanan"}, O.LAYANAN.filter(k => l?.[k]).map(k => pil(`${O.NAMA_LAYANAN[k]} ${O.NAMA_KONDISI[l[k].status].toLowerCase()}`, l[k].status === "normal" ? "ok" : l[k].status === "padam" ? "bahaya" : "tunggu", IKON_KONDISI[l[k].status])));
  async function muatLapsus() {
    const [ds, dt] = await Promise.all([api("GET", "/api/pusdalops/lapsus"), st.opId ? api("GET", "/api/pusdalops/lapsus/" + st.opId) : Promise.resolve(null)]);
    if (!ds.ok) return {r: ds}; if (dt && !dt.ok) { if (dt.s === 404) { st.opId = null; return muatLapsus(); } return {r: dt}; }
    const ops = ds.j.operasi || [], t = (dt || ds).t, node = [];
    const adaDummy = ops.some(o => o.dummy);
    const bukaTb = o => { const b = h("button", {type: "button", class: "bn-tombol sekunder op-tak-cetak"}, ikon("lanjut"), "Buka"); b.addEventListener("click", () => { st.opId = o.id; segarkan(); }); return b; };
    node.push(h("section", {class: "bn-blok op-tak-cetak"}, kepalaBlok("Daftar operasi", "daftar", ...adaDummy ? [pilDummy()] : []),
      ops.length ? tabel(["Operasi", "Jenis", "Mulai", "Provinsi", "Entri", "Status", ""], ops.map(o => [o.nama, pil(namaJenis(o.jenis), "info", o.jenis), O.tglIndo(o.mulai), F(o.jumlah_prov), F(o.jumlah_entri),
        h("span", null, pil(o.status === "aktif" ? "Aktif" : "Selesai", o.status === "aktif" ? "ok" : "info", o.status === "aktif" ? "tunggu" : "ok"), o.dummy ? pilDummy() : null), bukaTb(o)]), ["", "", "n", "n", "n", "n", "n"], ops.map(o => o.id === st.opId ? "op-pilih-baris" : "")) : kosong("Belum ada operasi. Buat yang pertama di bawah.")));
    const nama = input("nama", {maxlength: "120", placeholder: "Contoh: Operasi Banjir Sumatera"}), jns = h("select", {name: "jenis"}); opsi(jns, JENIS_LAPSUS.map(j => [j, namaJenis(j)]), "Pilih jenis");
    node.push(formulir("Operasi baru", "tambah", [h("div", {class: "bn-baris"}, isian("Nama operasi", nama), isian("Jenis bencana", jns), isian("Mulai", input("mulai", {type: "date", value: O.tglWIB(t), max: O.tglWIB(t)})))],
      function () { const m = node[1].querySelector('[name="mulai"]').value; if (nama.value.trim().length < 3) return {galat: "Nama operasi minimal 3 karakter."}; if (!jns.value) return {galat: "Pilih jenis bencana."}; if (!m) return {galat: "Isi tanggal mulai."};
        return {url: "/api/pusdalops/lapsus", body: {nama: nama.value.trim(), jenis: jns.value, mulai: m}, ok: "Operasi dibuat. Tambahkan provinsi di rincian.", sesudah: r => { st.opId = r.j.operasi?.id || null; }}; }));
    if (dt) node.push(...rincianLapsus(dt.j, t)); else node.push(sumberKaki("Pusdalops BNPB, Laporan Khusus (input staf)", t));
    return {node, dummy: adaDummy || !!dt?.j.operasi?.dummy};
  }
  function rincianLapsus(r, t) {
    const o = r.operasi, aktif = o.status === "aktif", nb = O.hitungBasi(r, t), provs = r.provinsi.map(p => p.prov), np = k => PROV[k] || k;
    teksWA = O.teksWa(r, t, t, namaJenis); kertasSiap = true;
    const tutupTb = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("daftar"), "Kembali ke daftar"), statusTb = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon(aktif ? "ok" : "tunggu"), aktif ? "Tandai selesai" : "Buka lagi");
    tutupTb.addEventListener("click", () => { st.opId = null; kertasSiap = false; segarkan(); });
    statusTb.addEventListener("click", async () => { statusTb.disabled = true; const x = await api("POST", "/api/pusdalops/lapsus/status", {operasi_id: o.id, status: aktif ? "selesai" : "aktif"}); statusTb.disabled = false;
      if (x.ok) { st.info = aktif ? "Operasi ditandai selesai." : "Operasi dibuka lagi."; segarkan(); } else tampil(el.pesan, galatTeks(x), false); });
    const salinTb = h("button", {type: "button", class: "bn-tombol sekunder", "data-aksi": "salin"}, ikon("daftar"), "Salin teks WA"), cetakTb = h("button", {type: "button", class: "bn-tombol", "data-aksi": "cetak"}, ikon("cetak"), "Cetak atau PDF");
    salinTb.addEventListener("click", salin); cetakTb.addEventListener("click", cetak);
    const kartuProv = r.provinsi.map(p => { const po = O.pohon(p), kej = k => h("li", null, `${namaJenis(k.jenis)}, ${k.kab || "kabupaten belum diketahui"}${k.status ? " (" + k.status + ")" : ""}`);
      return h("section", {class: "op-kartu"}, h("h3", {teks: p.nama || np(p.prov)}),
        h("ul", {class: "op-pohon"}, po.tim.map(x => h("li", null, h("b", {teks: x.nama}), x.kejadian.length ? h("ul", null, x.kejadian.map(kej)) : h("span", {teks: ", belum ada kejadian tertaut"}))),
          po.tanpaTim.length ? h("li", null, h("b", {teks: "Tanpa tim"}), h("ul", null, po.tanpaTim.map(kej))) : null, !p.tim.length && !po.tanpaTim.length ? h("li", {teks: "Belum ada tim atau kejadian."}) : null),
        p.kab.length ? tabel(["Kabupaten/kota", "Data terakhir", "Kebutuhan mendesak", "Layanan dasar", "Catatan"], p.kab.map(k => { const b = O.basiK(k, t);
          return [k.kab, h("span", null, O.wibTeks(k.waktu_data) + ", " + O.umurK(k, t), " ", b ? pil("BASI", "bahaya", "peringatan") : null),
            k.kebutuhan?.length ? h("ul", {class: "op-keb"}, k.kebutuhan.map(x => h("li", {teks: O.kebutuhanTeks(x)}))) : "", tabelLayanan(k.layanan), k.catatan || ""]; }), ["", "", "", "", ""], p.kab.map(k => O.basiK(k, t) ? "op-basi-baris" : "")) : kosong("Belum ada entri harian untuk provinsi ini."));
    });
    const out = [h("article", {class: "bn-blok"}, h("div", {class: "op-judul-baris"}, h("h2", {teks: o.nama}), pil(namaJenis(o.jenis), "info", o.jenis), pil(aktif ? "Aktif" : "Selesai", aktif ? "ok" : "info", aktif ? "tunggu" : "ok"), pil("Mulai " + O.tglIndo(o.mulai), "info", "kalender"), o.dummy ? pilDummy() : null),
      o.dummy ? h("p", {class: "op-dummy", teks: "DATA DUMMY, BUKAN LAPORAN NYATA"}) : null,
      nb ? h("div", {class: "op-basi", role: "alert"}, ikon("peringatan"), `${F(nb)} kabupaten/kota datanya lebih dari 24 jam (BASI). Minta pembaruan sebelum laporan dipakai.`) : kosong("Semua data kabupaten/kota masih dalam 24 jam terakhir."),
      h("div", {class: "op-aksi op-tak-cetak"}, cetakTb, salinTb, statusTb, tutupTb),
      ...kartuProv.length ? kartuProv : [kosong("Belum ada provinsi. Tambahkan lewat formulir di bawah.")], sumberKaki("Pusdalops BNPB, Laporan Khusus (input staf)", t))];
    if (aktif) out.push(...formLapsus(r, provs));
    out.push(h("section", {class: "bn-blok op-tak-cetak"}, h("h2", {teks: "Teks WA"}), h("textarea", {class: "op-wa", readonly: true, rows: "10", "aria-label": "Teks WA", id: "opWa"})));
    return out;
  }
  function formLapsus(r, provs) {
    const o = r.operasi, out = [];
    const pv = h("select", {name: "prov", "aria-label": "Provinsi"}); opsi(pv, Object.entries(PROV).filter(([k]) => !provs.includes(k)), "Pilih provinsi");
    out.push(formulir("Tambah provinsi", "tambah", [isian("Provinsi", pv)], () => pv.value ? {url: "/api/pusdalops/lapsus/provinsi", body: {operasi_id: o.id, prov: pv.value}, ok: "Provinsi ditambahkan."} : {galat: "Pilih provinsi."}));
    if (!provs.length) return out;
    const tp = h("select", {name: "prov", "aria-label": "Provinsi tim"}), tn = input("nama", {maxlength: "80", placeholder: "Contoh: Tim A BNPB"}); opsi(tp, provs.map(k => [k, PROV[k] || k]), "Pilih provinsi");
    out.push(formulir("Tambah tim pendamping", "sosial", [h("div", {class: "bn-baris"}, isian("Provinsi", tp), isian("Nama tim (instansi, bukan orang)", tn))],
      () => !tp.value ? {galat: "Pilih provinsi."} : tn.value.trim().length < 2 ? {galat: "Nama tim minimal 2 karakter."} : {url: "/api/pusdalops/lapsus/tim", body: {operasi_id: o.id, prov: tp.value, nama: tn.value.trim()}, ok: "Tim ditambahkan."}));
    const pk = pemilih({provBoleh: provs, kejadian: true}), tt = h("select", {name: "tim_id", "aria-label": "Tim"});
    const isiTim = () => opsi(tt, r.provinsi.filter(p => p.prov === pk.sp.value).flatMap(p => p.tim.map(x => [x.id, x.nama])), "Tanpa tim"); pk.sp.addEventListener("change", isiTim); isiTim();
    out.push(formulir("Taut kejadian logbook", "pin", [h("div", {class: "bn-baris"}, ...pk.kolom, isian("Tim", tt))],
      () => !pk.sj?.value ? {galat: "Pilih provinsi, kabupaten/kota, lalu kejadian logbook."} : {url: "/api/pusdalops/lapsus/kejadian", body: {operasi_id: o.id, kejadian_id: pk.sj.value, ...tt.value ? {tim_id: tt.value} : {}}, ok: "Kejadian ditautkan."}));
    /* entri harian per kabupaten/kota: kebutuhan mendesak berjumlah (bentuk Rincian juklak logbook) + 4 layanan dasar */
    const pe = pemilih({provBoleh: provs}), wadah = h("div", {class: "op-rc"}), waktu = input("waktu", {type: "datetime-local"}), cat = input("catatan", {maxlength: "500"});
    const baris = () => { const b = h("div", {class: "op-baris"}, h("select", {"data-k": "kelompok", "aria-label": "Kelompok kebutuhan"}), input("barang", {"data-k": "barang", maxlength: "60", placeholder: "Barang", "aria-label": "Barang"}),
      input("jumlah", {"data-k": "jumlah", inputmode: "decimal", placeholder: "Jumlah", "aria-label": "Jumlah"}), input("satuan", {"data-k": "satuan", maxlength: "20", placeholder: "Satuan", "aria-label": "Satuan"}),
      h("button", {type: "button", class: "bn-tombol sekunder", "aria-label": "Hapus baris", title: "Hapus baris"}, ikon("sapu")));
      opsi(b.firstChild, O.KELOMPOK.map(k => [k, O.NAMA_KELOMPOK[k]]), "Pilih kelompok"); b.firstChild.value = "logistik"; b.lastChild.addEventListener("click", () => b.remove()); wadah.append(b); };
    baris(); const tbKeb = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("tambah"), "Tambah kebutuhan"); tbKeb.addEventListener("click", baris);
    const layanan = h("div", {class: "op-rc"}, O.LAYANAN.map(k => h("div", {class: "op-rc"}, h("b", {teks: O.NAMA_LAYANAN[k]}),
      seg("l_" + k, [["", "Tidak dilaporkan", "senyap"], ...O.KONDISI.map(c => [c, O.NAMA_KONDISI[c], IKON_KONDISI[c], c === "padam" ? "op-padam" : c === "terganggu" ? "op-ganggu" : ""])], ""))));
    const saatIni = () => { const d = new Date(kini() + 7 * 36e5); return d.toISOString().slice(0, 16); };   // jam dinding WIB untuk datetime-local
    waktu.value = saatIni(); waktu.max = saatIni();
    const form = formulir("Entri harian per kabupaten/kota", "kalender", [h("div", {class: "bn-baris"}, ...pe.kolom, isian("Waktu data (WIB)", waktu)), h("b", {teks: "Kebutuhan mendesak"}), wadah, tbKeb, h("b", {teks: "Layanan dasar"}), layanan, isian("Catatan (tanpa nomor telepon)", cat)],
      function () {
        if (!pe.kunci()) return {galat: "Pilih provinsi dan kabupaten/kota."};
        const keb = []; for (const b of wadah.children) { const v = k => b.querySelector(`[data-k="${k}"]`).value.trim(); if (!v("barang") && !v("jumlah") && !v("satuan")) continue;
          const n = angka(v("jumlah")); if (!v("barang") || !v("satuan")) return {galat: "Tiap kebutuhan butuh barang, jumlah, dan satuan."}; if (!(n > 0)) return {galat: v("jumlah") && Number.isNaN(n) ? GALAT_ANGKA : "Jumlah kebutuhan harus lebih dari 0."}; keb.push({kelompok: v("kelompok"), barang: v("barang"), jumlah: n, satuan: v("satuan")}); }
        const lay = {}; for (const k of O.LAYANAN) { const c = nilaiSeg(form, "l_" + k); if (c) lay[k] = {status: c}; }
        if (!keb.length && !Object.keys(lay).length) return {galat: "Isi kebutuhan mendesak atau minimal satu layanan dasar."};
        const w = Date.parse(waktu.value + ":00+07:00"); if (!Number.isFinite(w)) return {galat: "Isi waktu data."};
        return {url: "/api/pusdalops/lapsus/entri", body: {operasi_id: o.id, kab: pe.kunci(), waktu_data: w, ...keb.length ? {kebutuhan: keb} : {}, ...Object.keys(lay).length ? {layanan: lay} : {}, ...cat.value.trim() ? {catatan: cat.value.trim()} : {}}, ok: "Entri harian tersimpan."};
      });
    out.push(form); return out;
  }

  /* ---------- tab 3: roll call ---------- */
  const rcBaris = (label, hasil, ubah, hapus) => {
    const seg3 = h("div", {class: "op-hasil-seg", role: "group", "aria-label": "Hasil " + label}, ["hadir", "tidak", "gangguan"].map(k => h("button", {type: "button", class: "op-hasil", "data-hasil": k, "aria-pressed": String(hasil === k)}, ikon(IKON_HASIL[k]), O.NAMA_HASIL[k])));
    seg3.addEventListener("click", e => { const b = e.target.closest("[data-hasil]"); if (!b) return; const baru = b.getAttribute("aria-pressed") === "true" ? "" : b.dataset.hasil; ubah(baru);
      seg3.querySelectorAll("[data-hasil]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.hasil === baru))); });
    const x = hapus ? h("button", {type: "button", class: "bn-tombol sekunder", "aria-label": "Hapus peserta", title: "Hapus peserta"}, ikon("sapu")) : null; x?.addEventListener("click", hapus);
    return h("div", {class: "op-rc-baris"}, h("span", {teks: label}), seg3, x || h("span"));
  };
  async function muatRollcall() {
    const [rg, ds] = await Promise.all([api("GET", "/api/pusdalops/rollcall/ringkasan?bulan=" + st.bulan), api("GET", "/api/pusdalops/rollcall?bulan=" + st.bulan)]);
    if (!rg.ok) return {r: rg}; if (!ds.ok) return {r: ds};
    const sesi = ds.j.sesi || [], adaDummy = sesi.some(s => s.dummy), t = kini(), j = rg.j;
    /* form sesi */
    const tgl = input("tgl", {type: "date", value: O.tglWIB(t), max: O.tglWIB(t)}), slot = seg("slot", Object.entries(O.NAMA_SLOT).map(([k, tt]) => [k, tt, k === "malam" ? "malam" : "kalender"]), O.slotBawaan(t));
    const wProv = h("div", {class: "op-rc"}), wKab = h("div", {class: "op-rc"}), wKom = h("div", {class: "op-rc"});
    for (const [k, nama] of Object.entries(PROV)) wProv.append(rcBaris(nama, rc.bpbd_prov.get(k) || "", v => v ? rc.bpbd_prov.set(k, v) : rc.bpbd_prov.delete(k)));
    const semua = (wadah, arr, nilai) => () => { arr(nilai); wadah.querySelectorAll("[data-hasil]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.hasil === nilai))); };
    const tbSemua = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("ok"), "Semua provinsi hadir"), tbKosong = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("sapu"), "Kosongkan pilihan");
    tbSemua.addEventListener("click", semua(wProv, v => { for (const k of Object.keys(PROV)) rc.bpbd_prov.set(k, v); }, "hadir")); tbKosong.addEventListener("click", semua(wProv, () => rc.bpbd_prov.clear(), ""));
    const pesanTambah = h("p", {class: "bn-pesan", role: "status"});
    const barisKab = p => { const b = rcBaris(`${p.kab} (${PROV[p.prov] || p.prov})`, p.hasil, v => { p.hasil = v; }, () => { rc.bpbd_kab.splice(rc.bpbd_kab.indexOf(p), 1); b.remove(); }); return b; };
    const barisKom = p => { const b = rcBaris(`${p.nama} (${PROV[p.prov] || p.prov})`, p.hasil, v => { p.hasil = v; }, () => { rc.komunitas.splice(rc.komunitas.indexOf(p), 1); b.remove(); }); return b; };
    wKab.append(...rc.bpbd_kab.map(barisKab)); wKom.append(...rc.komunitas.map(barisKom));   // tambah/hapus kemudian menyentuh satu baris saja
    const pk = pemilih(), tbKab = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("tambah"), "Tambah kabupaten/kota");
    tbKab.addEventListener("click", () => {
      if (!pk.kunci()) return tampil(pesanTambah, "Pilih provinsi dan kabupaten/kota dulu.", false);
      if (rc.bpbd_kab.some(p => p.prov === pk.sp.value && p.kab === pk.sk.value)) return tampil(pesanTambah, "Kabupaten/kota itu sudah ada di daftar.", false);
      const p = {prov: pk.sp.value, kab: pk.sk.value, hasil: "hadir"}; rc.bpbd_kab.push(p); wKab.append(barisKab(p)); tampil(pesanTambah, "");
    });
    const kn = input("nama", {maxlength: "60", placeholder: "Contoh: ORARI Aceh"}), kp = h("select", {name: "prov", "aria-label": "Provinsi komunitas"}); opsi(kp, Object.entries(PROV), "Pilih provinsi");
    const tbKom = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("tambah"), "Tambah komunitas");
    tbKom.addEventListener("click", () => {
      const n = kn.value.trim(); if (n.length < 2 || !kp.value) return tampil(pesanTambah, "Isi nama komunitas (minimal 2 karakter) dan pilih provinsinya.", false);
      if (rc.komunitas.some(p => p.nama === n && p.prov === kp.value)) return tampil(pesanTambah, "Komunitas itu sudah ada di daftar.", false);
      const p = {nama: n, prov: kp.value, hasil: "hadir"}; rc.komunitas.push(p); wKom.append(barisKom(p)); kn.value = ""; tampil(pesanTambah, "");
    });
    const form = formulir("Catat sesi roll call", "sosial", [h("div", {class: "bn-baris"}, isian("Tanggal", tgl)), isian("Slot", slot),
      h("h3", {teks: "BPBD provinsi"}), h("div", {class: "op-aksi"}, tbSemua, tbKosong), wProv,
      h("h3", {teks: "BPBD kabupaten/kota"}), h("div", {class: "bn-baris"}, ...pk.kolom, tbKab), wKab,
      h("h3", {teks: "Komunitas radio"}), h("div", {class: "op-tambah"}, isian("Nama komunitas", kn), isian("Provinsi", kp), tbKom), wKom, pesanTambah,
      h("p", {class: "op-p", teks: "Hanya peserta yang sudah dipilih hadir, tidak, atau gangguan yang dikirim. Klik pilihan yang sama sekali lagi untuk membatalkan."})],
    function () {
      const peserta = [...[...rc.bpbd_prov].map(([prov, hasil]) => ({kategori: "bpbd_prov", prov, hasil})), ...rc.bpbd_kab.filter(p => p.hasil).map(p => ({kategori: "bpbd_kab", kab: p.prov + "|" + p.kab, hasil: p.hasil})), ...rc.komunitas.filter(p => p.hasil).map(p => ({kategori: "komunitas", nama: p.nama, prov: p.prov, hasil: p.hasil}))];
      if (!peserta.length) return {galat: "Pilih hasil minimal satu peserta."}; if (!tgl.value) return {galat: "Isi tanggal."};
      return {url: "/api/pusdalops/rollcall", body: {tgl: tgl.value, slot: nilaiSeg(form, "slot"), peserta}, ok: `Sesi roll call tersimpan, ${F(peserta.length)} peserta.`, sesudah: () => { rc.bpbd_prov.clear(); rc.bpbd_kab.length = 0; rc.komunitas.length = 0; st.bulan = tgl.value.slice(0, 7); }};
    });
    /* ketaatan per bulan */
    const bln = input("bulan", {type: "month", value: st.bulan, max: O.bulanIni(t)}); bln.addEventListener("change", () => { if (/^\d{4}-\d\d$/.test(bln.value)) { st.bulan = bln.value; segarkan(); } });
    const k = O.ketaatan(j.per_peserta || [], PROV), baris = x => [x.label, F(x.dipanggil), F(x.hadir), F(x.gangguan), F(x.tidak), pil(O.fmtPersen(x.persen), O.toneKetaatan(x.persen), IKON_TONE[O.toneKetaatan(x.persen)])];
    const KEPALA = ["Peserta", "Dipanggil", "Hadir", "Gangguan", "Tidak hadir", "Ketaatan"], KLS = ["", "n", "n", "n", "n", "n"];
    const blokRingkas = h("section", {class: "bn-blok"}, kepalaBlok(`Ketaatan ${O.bulanTeks(st.bulan)}`, "sosial", isian("Bulan", bln)),
      h("div", {class: "op-ringkas"}, pil(`${F(j.sesi)} sesi`, "info", "daftar"), pil(`${F(j.hari)} hari`, "info", "kalender"), ...adaDummy ? [pilDummy()] : []),
      (j.per_kategori || []).length ? tabel(["Kategori", ...KEPALA.slice(1)], j.per_kategori.map(x => baris({...x, label: O.NAMA_KATEGORI[x.kategori] || x.kategori})), KLS) : kosong("Belum ada sesi roll call pada bulan ini."),
      ...["bpbd_prov", "bpbd_kab", "komunitas"].filter(c => k[c].length).flatMap(c => [h("h3", {teks: `${O.NAMA_KATEGORI[c]}, terendah dulu`}), tabelBatas(KEPALA, k[c].map(baris), KLS)]),
      (j.per_kategori || []).length ? h("p", {class: "op-p", teks: "Ketaatan = hadir dibagi dipanggil. Gangguan dihitung terpisah, bukan hadir. Warna hijau 80% ke atas, kuning 50% sampai 80%, merah di bawah 50% (ambang sementara, belum ditetapkan)."}) : null);
    const blokSesi = h("section", {class: "bn-blok"}, kepalaBlok("Sesi bulan ini", "kalender"), sesi.length ? tabelBatas(["Tanggal", "Slot", "Dipanggil", "Hadir", "Tidak hadir", "Gangguan", ""], sesi.map(s => [O.tglIndo(s.tgl), O.NAMA_SLOT[s.slot] || s.slot, F(s.dipanggil), F(s.hadir), F(s.tidak), F(s.gangguan), s.dummy ? pilDummy() : ""]), ["", "", "n", "n", "n", "n", "n"]) : kosong("Belum ada sesi pada bulan ini."));
    return {node: [form, blokRingkas, blokSesi, sumberKaki("roll call radio Pusdalops (input staf)", rg.t)], dummy: adaDummy};
  }
  const G3 = window.OperasiG3({api, h, ikon, pil, pilDummy, tabel, tabelBatas, kosong, sumberKaki, isian, input, opsi, formulir, kepalaBlok, seg, nilaiSeg, pemilih, st, PROV, namaJenis, JENIS: JENIS_LAPSUS, kunciKab, O, segarkan: () => segarkan()});
  const MUAT = {pemulihan: muatPemulihan, lapsus: muatLapsus, rollcall: muatRollcall, ...G3};

  /* ---------- kerangka ---------- */
  const el = {};
  function kerangka() {
    el.tab = h("div", {class: "op-seg op-tabs", role: "tablist", "aria-label": "Bagian operasi"}, TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", "data-tab": k, "aria-selected": String(k === st.tab), class: "op-tab"}, ikon(ik), t)));
    el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.dummy = h("div", {class: "op-tak-cetak op-aksi"}); el.isi = h("div", {class: "op-isi", role: "tabpanel"}); el.bandera = h("p", {class: "op-dummy op-tak-cetak", hidden: true, teks: "DATA DUMMY ditampilkan, bukan laporan nyata."});
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Operasi Pusdalops"}), h("div", {class: "bn-aksi"}, el.dummy)),
      h("section", {class: "bn-blok op-tak-cetak"}, el.tab, el.pesan), el.bandera, el.isi);
    el.tab.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && b.dataset.tab !== st.tab) { st.tab = b.dataset.tab; el.tab.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", String(x === b))); segarkan(); } });
  }
  function masuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}), h("p", {class: "op-p", teks: s === 403 ? "Akunmu belum berhak membuka halaman ini. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan." : "Halaman operasi hanya untuk staf. Masuk dulu."}), h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }
  /* chrome urgent: tab aktif dan pesan memuat langsung; fetch dan render berat sesudah dua rAF */
  function segarkan() {
    const no = ++nomor; tampil(el.pesan, "Memuat…"); el.isi.setAttribute("aria-busy", "true"); kertasSiap = false;
    sesudahFrame(async () => {
      if (!kabList.length && !wilayahGagal) { try { kabList = (await muat()).kab; } catch (e) { wilayahGagal = true; } }
      const m = await MUAT[st.tab](); if (no !== nomor) return;
      el.isi.removeAttribute("aria-busy");
      if (m.r) { if (m.r.s === 401 || m.r.s === 403) return masuk(m.r.s); el.isi.replaceChildren(); el.bandera.hidden = true; return tampil(el.pesan, galatTeks(m.r), false); }
      el.isi.replaceChildren(...m.node); el.bandera.hidden = !m.dummy;
      sesudahFrame(() => { const w = document.getElementById("opWa"); if (no === nomor && w) w.value = teksWA; });
      const info = [st.info, wilayahGagal ? "Daftar wilayah belum bisa dimuat, pilihan kabupaten/kota kosong. Muat ulang halaman." : ""].filter(Boolean); st.info = "";
      tampil(el.pesan, info.join(" "), wilayahGagal ? false : info.length ? true : undefined);
    });
  }
  const sibuk = () => el.isi.hasAttribute("aria-busy");
  function cetak() { if (sibuk() || !kertasSiap) return; tampil(el.pesan, "Menyiapkan cetak…"); sesudahFrame(() => { const lagi = el.isi.querySelectorAll(".op-lagi"); lagi.forEach(b => b.click()); const cetakKini = () => { window.print(); tampil(el.pesan, ""); }; if (lagi.length) sesudahFrame(cetakKini); else cetakKini(); tampil(el.pesan, ""); }); }
  function salin() {
    if (sibuk() || !teksWA) return; tampil(el.pesan, "Menyalin…");
    sesudahFrame(async () => {
      let ok = false; const w = document.getElementById("opWa");
      try { await navigator.clipboard.writeText(teksWA); ok = true; } catch (e) { if (w) { w.value = teksWA; w.focus(); w.select(); try { ok = document.execCommand("copy"); } catch (e2) {} } }
      tampil(el.pesan, ok ? "Teks WA disalin." : "Penyalinan diblokir peramban. Teks sudah terpilih di kotak Teks WA, tekan salin sendiri.", ok);
    });
  }

  /* ---------- dummy (Super Admin saja): 🧪 isi untuk tab yang terbuka, 🧹 hapus semua ---------- */
  const RUTE_DUMMY = {pemulihan: "/api/pusdalops/pemulihan/dummy", lapsus: "/api/pusdalops/lapsus/dummy", rollcall: "/api/pusdalops/rollcall/dummy", sk: "/api/logbook/dummy", berantai: "/api/pusdalops/berantai/dummy", medsos: "/api/pusdalops/medsos/dummy"};
  async function dummy(aksi, tombol) {
    if (aksi === "hapus" && !confirm("Hapus SEMUA data dummy operasi (pemulihan, laporan khusus, roll call, SK dan logbook, peringatan berantai, antrean medsos)? Data asli tidak tersentuh.")) return;
    const semuaTb = [...el.dummy.querySelectorAll("[data-dummy]")]; semuaTb.forEach(x => { x.disabled = true; x.setAttribute("aria-busy", "true"); });   // chrome dulu, jaringan sesudahnya
    try { await dummyJalan(aksi); } finally { semuaTb.forEach(x => { x.disabled = false; x.removeAttribute("aria-busy"); }); }
  }
  async function dummyJalan(aksi) {
    const rute = aksi === "isi" ? [RUTE_DUMMY[st.tab]] : Object.values(RUTE_DUMMY);
    const hs = await Promise.all(rute.map(u => api("POST", u, {aksi}))), gagal = hs.find(r => !r.ok && !(aksi === "isi" && r.s === 409));
    if (gagal) return tampil(el.pesan, gagal.s === 404 ? "Rute dummy belum ada di server." : galatTeks(gagal), false);
    st.info = aksi === "isi" ? (hs[0].s === 409 ? "Data dummy tab ini sudah ada. Hapus dulu dengan sapu bila ingin mengisi ulang." : "Data dummy terisi.") : "Semua data dummy dihapus.";
    if (st.tab === "rollcall" && aksi === "isi") st.bulan = O.bulanIni(kini());   // dummy roll call mengisi enam hari terakhir: pampangkan bulan ini
    if (st.tab === "lapsus") st.opId = null;
    segarkan();
  }
  async function tombolDummy() {
    const r = await api("GET", "/api/akademisi/saya"); if (!r.ok || !r.j.super) return; st.super = true;
    el.dummy.append(h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "isi", title: "Isi data dummy untuk tab yang sedang dibuka", "aria-label": "Isi data dummy"}, "🧪"),
      h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "hapus", title: "Hapus semua data dummy", "aria-label": "Hapus data dummy"}, "🧹"));
    el.dummy.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (b && !b.disabled) dummy(b.dataset.dummy, b); });
  }

  kerangka(); segarkan(); tombolDummy();
})();
