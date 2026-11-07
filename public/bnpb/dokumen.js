/* Dokumen Pusdalops (/bnpb/dokumen): BAST Piket, Laporan Menonjol, Laporan Shift, Rekap Mingguan, Laporan Harian (laphar), Sitrep per kejadian dari logbook.
   Data: GET /api/logbook/hari?tgl= (rute yang ADA), GET /api/logbook/kejadian/:id/sk (laphar, sitrep), berkas instansi statis (sitrep gunung api dan gempa);
   semua hitungan di dokumen_pusdalops.js dan dokumen_laphar.js (murni, diuji). Cetak = window.print() dengan CSS A4; salin teks WA.
   INP: ganti tab/tanggal langsung mengecat chrome (tab aktif, pesan memuat); pengambilan data dan render tabel menyusul sesudah satu frame tercat.
   Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {ikon, h} = window.Wilayah, D = window.DokumenPusdalops, L = window.DokumenLaphar, app = document.getElementById("app"), POLA = "dokumen_bast_pola_v1";
  const POLA_BAWAAN = "NNN/PTEO/PO.02/BB/2026";   // pola nomor dari BAST asli (katalog Drive: NNN/PTEO/PO.02/BB/2026); urutnya diisi manual
  const TAB = [["bast", "BAST Piket", "daftar"], ["menonjol", "Laporan Menonjol", "lainnya"], ["shift", "Laporan Shift", "kalender"], ["mingguan", "Rekap Mingguan", "simpan"], ["laphar", "Laporan Harian", "peringatan"], ["sitrep", "Sitrep Kejadian", "gunungapi"]];
  const SITREP_HARI = 10, URL_GUNUNG = "/banjir/data/gunungapi_status.json", URL_GEMPA = "/gempa/data/laporan.json", MAKS_SK = 40;
  const kini = Date.now(), kemarin = D.tglISO(kini - 864e5);
  const st = {tab: "bast", tgl: kemarin, n: 3, kamis: D.tglISO(D.akhirKamis(kini)), urut: "", pola: POLA_BAWAAN, manual: new Set(), pilihBuka: false, semua: false, kejadian: "", gunung: ""};
  let nomor = 0, cache = new Map(), teksWA = "", ulangNomor = null, tundaManual = 0;

  const bacaLokal = () => { try { return JSON.parse(localStorage.getItem(POLA) || "null"); } catch (e) { return null; } };
  const simpanLokal = () => { try { localStorage.setItem(POLA, JSON.stringify({pola: st.pola, urut: st.urut})); } catch (e) {} };
  const l0 = bacaLokal(); if (l0 && typeof l0.pola === "string") { st.pola = l0.pola.slice(0, 60); st.urut = String(l0.urut || "").slice(0, 6); }

  const api = async tgl => {
    const c = cache.get(tgl);   // hari yang periodenya masih berjalan kedaluwarsa 5 menit; hari lampau tetap
    if (c && (D.awalHari(tgl) + 864e5 <= Date.now() || Date.now() - c.t < 3e5)) return c;
    let r;
    try { const x = await fetch("/api/logbook/hari?tgl=" + tgl); r = {s: x.status, j: await x.json().catch(() => ({}))}; } catch (e) { r = {s: 0, j: {}}; }
    r.t = Date.now(); if (r.s === 200) cache.set(tgl, r);
    return r;
  };
  /* ambil beberapa hari, 4 sekaligus; hasil = semua entri + status galat pertama */
  async function ambilHari(daftar) {
    const out = []; let galat = null, terpotong = false, diambil = 0;
    for (let i = 0; i < daftar.length; i += 4) {
      const rs = await Promise.all(daftar.slice(i, i + 4).map(api));
      for (const r of rs) { if (r.s !== 200) galat = galat || r.s; else { diambil = Math.max(diambil, r.t); out.push(...(r.j.entri || [])); terpotong = terpotong || !!r.j.terpotong; } }
    }
    return {entri: out, galat, terpotong, diambil};
  }

  /* SK status per kejadian (rute baru, bisa 503 sebelum migrasi 0094) dan berkas instansi statis; semuanya gagal dengan tenang, dokumen tetap tersusun tanpa bagian itu */
  const skCache = new Map(), statikCache = new Map();
  async function ambilSk(id) {
    const c = skCache.get(id); if (c && Date.now() - c.t < 3e5) return c;
    let r; try { const x = await fetch("/api/logbook/kejadian/" + encodeURIComponent(id) + "/sk"); r = {s: x.status, list: x.ok ? ((await x.json().catch(() => ({}))).sk || []) : []}; } catch (e) { r = {s: 0, list: []}; }
    r.t = Date.now(); if (r.s === 200) skCache.set(id, r); return r;
  }
  async function ambilSkBanyak(ids) {
    const sk = {}; let galat = null;
    for (let i = 0; i < ids.length && i < MAKS_SK; i += 4) for (const [j, r] of (await Promise.all(ids.slice(i, i + 4).map(async id => [id, await ambilSk(id)])))) { if (r.s === 200) sk[j] = r.list; else galat = galat || r.s; }
    return {sk, galat, terpotong: ids.length > MAKS_SK};
  }
  async function statik(url) {
    if (statikCache.has(url)) return statikCache.get(url);
    let j = null; try { const x = await fetch(url); if (x.ok) j = await x.json(); } catch (e) {}
    if (j) statikCache.set(url, j);   // gagal tidak di-cache supaya percobaan berikut mengulang
    return j;
  }
  const infoSk = r => r.galat === 503 ? "SK status belum aktif di server (menunggu migrasi), bagian Status kosong." : r.galat != null && r.galat !== 404 ? `SK status sebagian gagal dimuat (${r.galat}), bagian Status bisa kurang.` : r.terpotong ? `SK status hanya dimuat untuk ${MAKS_SK} kejadian pertama.` : "";
  const EKSTRA = {
    async laphar(entri) {
      const m = L.laphar(entri, st.tgl, {manual: st.manual, semua: st.semua}), r = await ambilSkBanyak(m.kejadian.map(k => k.id));
      return {m: L.pasangSk(m, r.sk), info: [infoSk(r)]};
    },
    async sitrep(entri) {
      const c = L.kandidatSitrep(entri, st.tgl), pilih = c.find(x => x.id === st.kejadian) || c[0]; st.kejadian = pilih ? pilih.id : "";
      if (!pilih) return {kandidat: c};
      const [r, gd, gl] = await Promise.all([ambilSkBanyak([pilih.id]), pilih.jenis === "gunungapi" ? statik(URL_GUNUNG) : null, pilih.jenis === "gempabumi" || pilih.jenis === "tsunami" ? statik(URL_GEMPA) : null]);
      const info = [infoSk(r)]; if (pilih.jenis === "gunungapi" && !gd) info.push("Data PVMBG tidak bisa dimuat."); if (gl === null && (pilih.jenis === "gempabumi" || pilih.jenis === "tsunami")) info.push("Katalog gempa tidak bisa dimuat.");
      return {kandidat: c, pilih, sk: r.sk[pilih.id] || [], gunungData: gd, gempaLap: gl, info};
    }};

  const pil = (teks, ton, ik) => h("span", {class: "bn-pil dk-t-" + ton}, ikon(ik), teks);
  const tabel = (kepala, baris, kelasKolom = []) => h("div", {class: "dk-bungkus"}, h("table", {class: "dk-tabel"}, h("thead", null, h("tr", null, kepala.map(t => h("th", {teks: t})))),
    h("tbody", null, baris.map(b => h("tr", null, b.map((c, i) => h("td", {class: kelasKolom[i] || "", ...(c instanceof Node ? {} : {teks: c == null ? "" : String(c)})}, c instanceof Node ? c : null)))))));
  /* daftar panjang: 200 baris pertama + tombol; cetak membuka semuanya */
  const BATAS = 200;
  const tabelBatas = (kepala, baris, kelas) => {
    if (baris.length <= BATAS) return tabel(kepala, baris, kelas);
    const w = h("div"), tampil = n => w.replaceChildren(tabel(kepala, baris.slice(0, n), kelas), n < baris.length ? h("button", {type: "button", class: "bn-tombol sekunder dk-tak-cetak dk-lagi", teks: `Tampilkan semua (${F(baris.length)} baris)`}) : null);
    w.addEventListener("click", e => { if (e.target.closest(".dk-lagi")) tampil(baris.length); }); tampil(BATAS); return w;
  };
  const kosong = teks => h("p", {class: "dk-kosong", teks});
  const catatan = teks => h("p", {class: "dk-p", teks});
  const F = D.fmt, namaJenis = j => D.NAMA[j] || j;
  const jenisPil = j => pil(namaJenis(j), "info", j);

  /* ---------- pratinjau per dokumen: {node, teks} ---------- */
  function kop(judul, sub, dummy) {
    return h("div", {class: "dk-kop"}, h("p", {class: "dk-instansi", teks: "BADAN NASIONAL PENANGGULANGAN BENCANA, DIREKTORAT KOORDINASI DAN PELAKSANAAN OPERASI (PUSDALOPS)"}), h("h2", {teks: judul}), h("p", {class: "dk-sub", teks: sub}),
      dummy ? h("p", {class: "dk-dummy", teks: "DATA DUMMY, BUKAN LAPORAN NYATA"}) : null);
  }
  const daftarMenonjol = (ds) => ds.length ? D.perProv(ds).map(([p, vs]) => h("section", {class: "dk-prov"}, h("h3", {teks: D.namaProv(p)}), h("ul", null, vs.map(v => h("li", null,
    h("b", {teks: namaJenis(v.jenis)}), ", " + v.lokasi + (v.dampak ? ": " + v.dampak : ": dampak belum dilaporkan"), v.alasan.length ? h("span", {class: "dk-alasan", teks: " (menonjol: " + v.alasan.join(", ") + ")"}) : null))))) : [kosong("Tidak ada kejadian yang memenuhi ambang menonjol pada periode ini.")];
  const periodeHari = tgl => `${D.tglIndo(tgl)} pukul 07.00 WIB s.d. ${D.tglIndo(D.tambahHari(tgl, 1))} pukul 07.00 WIB`;

  const pilihManual = hr => h("details", {class: "dk-tak-cetak"}, h("summary", {teks: `Pilih manual dari ${F(hr.semua.length)} kejadian periode ini`}),
    h("div", {class: "dk-pilih"}, hr.semua.map(v => { const otomatis = v.menonjol && !st.manual.has(v.id), c = h("input", {type: "checkbox", "data-id": v.id, checked: v.menonjol, disabled: otomatis});
      return h("label", null, c, `${namaJenis(v.jenis)}, ${v.lokasi}`); })));
  function buatMenonjol(entri, dummy, diambil) {
    const hr = D.hariData(entri, st.tgl, st.manual);
    // pimpinan boleh memilih manual kejadian di bawah ambang (hanya dalam sesi ini); yang lolos ambang terkunci tercentang
    const pilih = pilihManual(hr);
    const node = h("div", null, kop("LAPORAN MENONJOL", periodeHari(st.tgl), dummy),
      h("div", {class: "dk-ringkas"}, pil(`${F(hr.daftar.length)} menonjol`, "bahaya", "peringatan"), pil(`${F(hr.total)} kejadian periode ini`, "info", "daftar"), pil(`${F(hr.baru)} baru, ${F(hr.pengkinian)} pengkinian`, "tunggu", "kalender")),
      h("p", {class: "dk-p", teks: `Laporan kejadian bencana sejumlah ${F(hr.daftar.length)}.`}), ...daftarMenonjol(hr.daftar),
      catatan("Ambang dari Panduan Lapjol 02/PO.02/07/2025 (Lampiran G.2.a-i). Jenis tanpa kriteria resmi tidak menonjol otomatis dan hanya masuk lewat pilihan manual."));
    return {node, pilih, teks: D.teksMenonjol(hr, dummy, diambil)};
  }
  function buatBast(entri, dummy, diambil) {
    const b = D.bast(entri, D.tambahHari(st.tgl, -(st.n - 1)), st.n, st.manual), no = D.nomorSurat(st.pola, st.urut);
    const nomorEl = h("p", {class: "dk-nomor", teks: "Nomor: " + no});
    const node = h("div", null, kop("BERITA ACARA SERAH TERIMA PELAKSANAAN PEMANTAUAN PUSDALOPS", `Periode ${D.tglIndo(b.tglAwal)} s.d. ${D.tglIndo(b.tglAkhir)}, tiap hari 07.00 s.d. 07.00 WIB`, dummy),
      nomorEl,
      h("h3", {teks: "A. Jumlah laporan per hari"}),
      tabel(["Hari dan tanggal", "Jumlah kejadian", "Kejadian baru", "Pengkinian", "Menonjol"], [...b.hari.map(x => [D.tglIndo(x.tgl), F(x.total), F(x.baru), F(x.pengkinian), F(x.daftar.length)]), ["Jumlah", F(b.total), F(b.baru), F(b.pengkinian), F(b.hari.reduce((a, x) => a + x.daftar.length, 0))]], ["", "n", "n", "n", "n"]),
      h("h3", {teks: "B. Lampiran Laporan Menonjol"}),
      ...b.hari.map(x => h("div", {class: "dk-hari"}, h("h4", {teks: `${D.tglIndo(x.tgl)}: ${F(x.daftar.length)} menonjol`}), ...daftarMenonjol(x.daftar))),
      h("div", {class: "dk-ttd"}, ["Tim yang menyerahkan", "Tim penerima", "Mengetahui, Supervisor"].map(t => h("div", null, h("p", {teks: t}), h("span", {class: "dk-garis"})))),
      catatan("Kejadian baru = kejadian yang entri pertamanya tercatat di hari itu (dicek mundur 7 hari dari awal periode). Pengkinian = kejadian yang sudah tercatat sebelumnya dan diperbarui di hari itu. Tanda tangan diisi manual setelah dicetak."));
    const teksDari = () => { const n = D.nomorSurat(st.pola, st.urut); nomorEl.textContent = "Nomor: " + n; return D.teksBast(b, n, dummy, diambil); };
    return {node, teks: teksDari(), ulang: teksDari};
  }
  function buatShift(entri, dummy, diambil) {
    const s = D.shift(entri, st.tgl);
    const node = h("div", null, kop("LAPORAN PELAKSANAAN SHIFT PIKET", periodeHari(st.tgl), dummy),
      ...s.shift.map(x => h("section", {class: "dk-shift"}, h("h3", {teks: `Shift ${x.no} (${x.jam})`}),
        h("div", {class: "dk-ringkas"}, pil(`${F(x.daftar.length)} kejadian`, "info", "daftar"), pil(`${F(x.baru)} baru`, "ok", "tambah"), pil(`${F(x.pengkinian)} pengkinian`, "tunggu", "kalender"), pil(`${F(x.tuntas)} tuntas`, "ok", "simpan")),
        x.daftar.length ? tabelBatas(["No", "Kejadian", "Wilayah", "Dampak terkini", "Status kejadian", "Tindak lanjut"], x.daftar.map((v, i) => [String(i + 1), jenisPil(v.jenis), D.namaProv(v.prov) + ", " + v.lokasi, v.dampak || "belum dilaporkan",
          pil(v.baru ? "Baru" : "Pengkinian", v.baru ? "ok" : "tunggu", v.baru ? "tambah" : "kalender"), pil(v.tuntas ? "Tuntas" : "Lanjut", v.tuntas ? "ok" : "tunggu", v.tuntas ? "simpan" : "kalender")]), ["n", "", "", "", "n", "n"]) : kosong("Tidak ada laporan masuk di shift ini."))),
      catatan("Jam shift: 07.00 s.d. 15.00, 15.00 s.d. 21.00, 21.00 s.d. 07.00 WIB. Tuntas atau lanjut mengikuti status kejadian saat dokumen dibuat (kejadian ditutup = tuntas), bukan keadaan saat shift berakhir. Personel dan peran piket tidak tercatat di logbook, isi manual setelah dicetak."));
    return {node, teks: D.teksShift(s, dummy, diambil)};
  }
  function buatMingguan(entri, dummy, diambil) {
    const m = D.mingguan(entri, D.akhirDariTgl(st.kamis));
    const ref = m.adaKib;
    const node = h("div", null, kop("REKAPITULASI MINGGUAN BENCANA", `${D.jamTgl(m.dari)} s.d. ${D.jamTgl(m.sampai)}`, dummy),
      h("div", {class: "dk-ringkas"}, pil(`${F(m.total)} kejadian`, "info", "daftar"), pil(`${F(m.baru)} baru, ${F(m.pengkinian)} pengkinian`, "tunggu", "kalender")),
      h("h3", {teks: "A. Jumlah kejadian per jenis"}), m.perJenis.length ? tabel(["Jenis", "Kejadian", "Baru", "Pengkinian"], m.perJenis.map(o => [jenisPil(o.kunci), F(o.total), F(o.baru), F(o.pengkinian)]), ["", "n", "n", "n"]) : kosong("Belum ada kejadian pada periode ini."),
      h("h3", {teks: "B. Jumlah kejadian per provinsi"}), tabel(["Provinsi", "Kejadian", "Baru", "Pengkinian"], m.perProv.map(o => [D.namaProv(o.kunci), F(o.total), F(o.baru), F(o.pengkinian)]), ["", "n", "n", "n"]),
      h("h3", {teks: "C. Luas kebakaran hutan dan lahan per provinsi"}),
      m.luas.length ? tabel(["Provinsi", "Kejadian", "Luas (ha, perkiraan dari entri piket)", "Tanpa data luas"], [...m.luas.map(o => [D.namaProv(o.prov), F(o.kejadian), D.fmt0(o.ha), F(o.tanpaLuas)]), ["Jumlah", F(m.luas.reduce((a, o) => a + o.kejadian, 0)), D.fmt0(m.luasTotal), F(m.luas.reduce((a, o) => a + o.tanpaLuas, 0))]], ["", "n", "n", "n"]) : kosong("Tidak ada kejadian karhutla pada periode ini."),
      h("h3", {teks: "D. Daftar kejadian"}),
      m.semua.length ? tabelBatas(["Rujukan", "Jenis", "Wilayah", "Dampak terkini", ...(ref ? ["KIB"] : [])], m.semua.map(v => [v.ref, jenisPil(v.jenis), D.namaProv(v.prov) + ", " + v.lokasi, v.dampak || "belum dilaporkan", ...(ref ? [v.kib || ""] : [])]), ["n", "", "", "", "n"]) : kosong("Belum ada kejadian."),
      catatan("Minggu berjalan Kamis 18.00 WIB s.d. Kamis berikutnya 18.00 WIB. Luas karhutla = perkiraan dari entri piket: luas pada entri terakhir tiap kejadian dalam periode, dijumlahkan per provinsi dan dibulatkan ke hektare; bukan hitungan selisih harian metode Sipongi. Rujukan = 6 karakter awal nomor kejadian di logbook" + (ref ? "." : "; kolom KIB tampil bila logbook memuatnya.")));
    return {node, teks: D.teksMingguan(m, dummy, diambil)};
  }
  /* sel isi satu medan laphar/sitrep: baris pertama paragraf, sisanya butir */
  const selMedan = baris => h("div", null, baris[0] ? h("p", {class: "dk-isi", teks: baris[0]}) : null, baris.length > 1 ? h("ul", {class: "dk-butir"}, baris.slice(1).map(b => h("li", {teks: b}))) : null);
  const tautan = u => /^https:\/\//.test(u || "") ? h("a", {class: "dk-url", href: u, target: "_blank", rel: "noopener noreferrer", teks: u}) : (u || "");
  /* daftar blok panjang: 40 pertama + tombol; cetak membuka semuanya (.dk-lagi) */
  const daftarBlok = (items, buat, batas = 40) => {
    if (items.length <= batas) return h("div", {class: "dk-daftar"}, items.map(buat));
    const w = h("div", {class: "dk-daftar"}), tampil = n => w.replaceChildren(...items.slice(0, n).map(buat), ...(n < items.length ? [h("button", {type: "button", class: "bn-tombol sekunder dk-tak-cetak dk-lagi", teks: `Tampilkan semua (${F(items.length)} kejadian)`})] : []));
    w.addEventListener("click", e => { if (e.target.closest(".dk-lagi")) tampil(items.length); }); tampil(batas); return w;
  };
  function buatLaphar(entri, dummy, diambil, ek) {
    const m = ek.m, hr = D.hariData(entri, st.tgl, st.manual);
    const blok = k => h("section", {class: "dk-kej"}, h("h4", {teks: `${k.no}. ${k.judul}`}), tabel(["Medan", "Keterangan"], k.medan.map(([lab, baris]) => [lab, selMedan(baris)]), ["dk-label", ""]));
    const bersk = m.kejadian.filter(k => k.sk.length);
    const node = h("div", null, kop("LAPORAN HARIAN", `${L.hariTgl(m.selesai)}, pemantauan ${D.tglIndo(m.tgl)} pukul 07.00 WIB s.d. ${D.tglIndo(m.selesai)} pukul 07.00 WIB`, dummy),
      h("div", {class: "dk-ringkas"}, pil(`${F(m.kejadian.length)} ${m.semua ? "kejadian" : "menonjol"}`, "bahaya", "peringatan"), pil(`${F(m.total)} kejadian periode ini`, "info", "daftar")),
      h("h3", {teks: "A. Kejadian Bencana"}), m.kejadian.length ? daftarBlok(m.kejadian, blok) : kosong("Tidak ada kejadian yang memenuhi ambang menonjol pada periode ini."),
      h("h3", {teks: "B. Rekapitulasi berdasarkan SK Darurat"}),
      bersk.length ? tabel(["No", "Kejadian", "Status kedaruratan"], bersk.map(k => [String(k.no), k.judul, h("ul", {class: "dk-butir"}, k.sk.map(x => h("li", {teks: L.skTeks(x)})))]), ["n", "", ""]) : kosong("Tidak ada SK status darurat tercatat untuk kejadian pada laporan ini."),
      catatan("Bentuk mengikuti laphar Koordalops 2022 sampai 2026 dan dapat diurai kembali oleh pengurai laphar. Isi medan dari entri terakhir tiap kejadian dalam periode, kronologis dari semua entri periode itu. Medan yang tidak diisi piket tertulis belum dilaporkan. Tanggal judul = tanggal penutup periode."));
    return {node, pilih: pilihManual(hr), teks: L.teksLaphar(m, diambil)};
  }
  const baris2 = (kepala, rows, kelas) => tabel(kepala, rows, kelas);
  function buatSitrep(entri, dummy, diambil, ek) {
    const c = ek.kandidat || [];
    if (!c.length) return {node: h("div", null, kop("SITUASI TERKINI (SITREP)", "Per kejadian besar", dummy), kosong(`Belum ada kejadian besar (gunung api, gempa, atau menonjol) sampai ${D.tglIndo(st.tgl)}.`)), teks: ""};
    const grup = D.kelompokKejadian(entri).get(ek.pilih.id);
    const kg = ek.pilih.jenis === "gunungapi" && ek.gunungData ? L.kandidatGunung(grup, ek.gunungData) : [], gpilih = kg.find(x => x.nama === st.gunung) || kg[0] || null;
    const gempa = (ek.pilih.jenis === "gempabumi" || ek.pilih.jenis === "tsunami") && ek.gempaLap ? L.kandidatGempa(grup, ek.gempaLap) : null;
    const s = L.sitrep(entri, ek.pilih.id, st.tgl, ek.sk, {gunung: gpilih, data: ek.gunungData, gempa, gempaPer: L.perGempa(ek.gempaLap)});
    const selK = h("label", {class: "bn-isian"}, "Kejadian besar", h("select", {name: "kejadian"}, c.map(x => h("option", {value: x.id, selected: x.id === ek.pilih.id, teks: `${x.judul} (${F(x.nEntri)} entri)`}))));
    const selG = kg.length > 1 ? h("label", {class: "bn-isian"}, "Gunung api (data PVMBG)", h("select", {name: "gunung"}, kg.map(x => h("option", {value: x.nama, selected: gpilih && x.nama === gpilih.nama, teks: `${x.nama}, ${L.LEVEL[x.level] || x.level}`})))) : null;
    const gn = s.gunung, gb = gn && [["Gunung", `${gn.nama} (${gn.prov})`], ["Status", gn.level], ["Radius bahaya", gn.radius], ["Periode pengamatan", gn.periode || "belum dilaporkan"], ["Penduduk dalam radius", gn.penduduk || "belum dilaporkan"]];
    const node = h("div", null, kop("SITUASI TERKINI (SITREP)", `${s.judul}. Data dilaporkan sampai ${L.waktuWib(s.sampai)}`, dummy),
      h("div", {class: "dk-ringkas"}, pil(s.status === "tutup" ? "Ditutup" : "Masih berjalan", s.status === "tutup" ? "ok" : "tunggu", s.status === "tutup" ? "simpan" : "kalender"), pil(`${F(s.nEntri)} entri`, "info", "daftar"), s.kib ? pil("KIB " + s.kib, "info", "lainnya") : null),
      h("h3", {teks: "A. Ringkasan"}), baris2(["Butir", "Keterangan"], s.ringkas, ["dk-label", ""]),
      h("h3", {teks: "B. Kronologis"}), tabelBatas(["Waktu", "Perkembangan", "Dampak pada entri"], s.kronologi.map(x => [x.waktu, x.teks, x.dampak || "tidak dilaporkan"]), ["", "", ""]),
      h("h3", {teks: "C. Dampak terkini"}), baris2(["Butir", "Keterangan"], s.dampak.map(([a, b]) => [a, selMedan(b)]), ["dk-label", ""]),
      h("h3", {teks: "D. Upaya, kebutuhan, dan kendala"}), baris2(["Butir", "Keterangan"], [["Upaya", selMedan(s.upaya)], ["Kebutuhan", selMedan(s.kebutuhan)], ["Kendala", selMedan(s.kendala)]], ["dk-label", ""]),
      h("h3", {teks: "E. Status kedaruratan dan posko"}),
      s.sk.length ? baris2(["Tingkat", "Wilayah", "Nomor SK", "Masa berlaku (TMT)", "Perpanjangan", "Tautan SK"], s.sk.map(r => [r[0], r[1], r[2], r[3], r[4], r[5] ? tautan(r[5]) : "belum dilaporkan"]), ["", "", "", "", "n", ""]) : kosong("Tidak ada SK status tercatat di logbook."),
      h("p", {class: "dk-p", teks: "Posko: " + s.posko}),
      ...(gn ? [h("h3", {teks: "F. Data instansi: gunung api"}), baris2(["Butir", "Keterangan"], gb, ["dk-label", ""]), h("p", {class: "dk-p", teks: "Rekomendasi PVMBG: " + (gn.rekomendasi || "belum dilaporkan")}),
        ...(gn.letusan.length ? [h("ul", {class: "dk-butir"}, gn.letusan.map(t => h("li", {teks: t})))] : []), h("p", {class: "dk-p"}, `Sumber: ${gn.sumber}, per ${gn.tgl}. `, gn.laporan ? tautan(gn.laporan) : "")]
        : ek.pilih.jenis === "gunungapi" ? [h("h3", {teks: "F. Data instansi: gunung api"}), kosong("Gunung belum cocok dengan data PVMBG. Sebut nama gunung di catatan piket agar data otomatis tertarik.")] : []),
      ...(gempa ? [h("h3", {teks: "F. Data instansi: gempa"}), gempa.length ? tabel(["Waktu", "Magnitudo", "Kedalaman (km)", "Wilayah"], gempa.map(x => [x.waktu, F(x.magnitudo), F(x.kedalaman), x.wilayah]), ["", "n", "n", ""]) : kosong("Tidak ada gempa M 5 atau lebih di katalog yang menyebut wilayah kejadian ini."),
        h("p", {class: "dk-p", teks: `Sumber: USGS dan BMKG, arsip Centurisk97 30 hari, per ${s.gempaPer}. Intensitas guncangan (MMI) belum tersedia di berkas instansi.`})] : []),
      catatan(`Kronologis memuat entri ${SITREP_HARI} hari terakhir sampai hari laporan. Kejadian yang ditawarkan: gunung api, gempa, tsunami, dan kejadian yang melewati ambang menonjol.`));
    return {node, pilih: h("div", {class: "bn-baris"}, selK, selG), teks: L.teksSitrep(s, diambil)};
  }
  const BUAT = {bast: buatBast, menonjol: buatMenonjol, shift: buatShift, mingguan: buatMingguan, laphar: buatLaphar, sitrep: buatSitrep};

  /* hari yang harus diambil: periode dokumen + 7 hari mundur (untuk menilai baru vs pengkinian) */
  function hariDiperlukan() {
    const mundur = D.LOOKBACK_HARI;
    if (st.tab === "mingguan") { const a = D.akhirDariTgl(st.kamis), p = D.periodeMinggu(a); return D.hariUntuk(p.dari - mundur * 864e5, p.sampai); }
    if (st.tab === "sitrep") return D.hariUntuk(D.awalHari(D.tambahHari(st.tgl, -(SITREP_HARI - 1))), D.awalHari(st.tgl) + 864e5);
    const awal = st.tab === "bast" ? D.tambahHari(st.tgl, -(st.n - 1)) : st.tgl;
    return D.hariUntuk(D.awalHari(D.tambahHari(awal, -mundur)), D.awalHari(st.tgl) + 864e5);
  }

  /* ---------- kerangka layar ---------- */
  const el = {};
  function kerangka() {
    el.tab = h("div", {class: "dk-seg", role: "tablist", "aria-label": "Jenis dokumen"}, TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", "data-tab": k, "aria-selected": String(k === st.tab), class: "dk-tab"}, ikon(ik), t)));
    el.kontrol = h("div", {class: "bn-baris dk-kontrol"});
    el.pesan = h("p", {class: "bn-pesan", role: "status"});
    el.kertas = h("article", {class: "dk-kertas"});
    el.pilihan = h("div", {class: "dk-tak-cetak"});
    el.wa = h("textarea", {class: "dk-wa", readonly: true, rows: "10", "aria-label": "Teks WA"});
    el.cetak = h("button", {type: "button", class: "bn-tombol"}, ikon("simpan"), "Cetak atau PDF");
    el.salin = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("daftar"), "Salin teks WA");
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Dokumen Pusdalops"}), h("div", {class: "bn-aksi"})),
      h("section", {class: "bn-blok dk-tak-cetak"}, el.tab, el.kontrol, el.pilihan, h("div", {class: "dk-aksi"}, el.cetak, el.salin), el.pesan),
      el.kertas, h("section", {class: "bn-blok dk-tak-cetak"}, h("h2", {teks: "Teks WA"}), el.wa));
    el.tab.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && b.dataset.tab !== st.tab) { st.tab = b.dataset.tab; tandaiTab(); gambarKontrol(); segarkan(); } });
    el.cetak.addEventListener("click", cetak);
    el.salin.addEventListener("click", salin);
    el.pilihan.addEventListener("change", e => {
      const sel = e.target.closest("select[name]"); if (sel) { if (sel.name === "kejadian") { st.kejadian = sel.value; st.gunung = ""; } else st.gunung = sel.value; segarkan(true); return; }
      const c = e.target.closest("input[data-id]"); if (!c) return; c.checked ? st.manual.add(c.dataset.id) : st.manual.delete(c.dataset.id); clearTimeout(tundaManual); tundaManual = setTimeout(() => segarkan(true), 300); });
    el.pilihan.addEventListener("toggle", e => { if (e.target.tagName === "DETAILS") st.pilihBuka = e.target.open; }, true);
    el.kontrol.addEventListener("change", ubahKontrol);
  }
  const tandaiTab = () => el.tab.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === st.tab)));
  const isian = (nama, judul, att) => { const i = h("input", {name: nama, autocomplete: "off", ...att}); return h("label", {class: "bn-isian"}, judul, i); };
  function gambarKontrol() {
    const k = [];
    if (st.tab === "mingguan") k.push(isian("kamis", "Kamis penutup periode (18.00 WIB)", {type: "date", value: st.kamis, max: D.tglISO(kini)}));
    else k.push(isian("tgl", st.tab === "bast" ? "Hari laporan terakhir" : st.tab === "sitrep" ? "Data sampai hari laporan (07.00 s.d. 07.00 WIB)" : "Hari laporan (mulai 07.00 WIB)", {type: "date", value: st.tgl, max: D.tglISO(kini)}));
    if (st.tab === "bast") {
      const s = h("select", {name: "n"}, [1, 2, 3, 4, 5, 6, 7].map(x => h("option", {value: String(x), selected: x === st.n, teks: `${x} hari`})));
      k.push(h("label", {class: "bn-isian"}, "Lama periode", s), isian("pola", "Pola nomor surat (N = digit urut)", {value: st.pola, maxlength: "60"}), isian("urut", "Nomor urut (diisi manual)", {value: st.urut, inputmode: "numeric", maxlength: "6", placeholder: "kosong = garis isian"}));
    }
    if (st.tab === "laphar") k.push(h("label", {class: "bn-isian"}, "Isi laporan", h("select", {name: "isi"}, [["menonjol", "Hanya kejadian menonjol"], ["semua", "Semua kejadian periode ini"]].map(([v, t]) => h("option", {value: v, selected: (v === "semua") === st.semua, teks: t})))));
    el.kontrol.replaceChildren(...k);
  }
  function ubahKontrol(e) {
    const n = e.target.name, v = e.target.value;
    if (n === "tgl" && /^\d{4}-\d\d-\d\d$/.test(v)) st.tgl = v;
    else if (n === "kamis" && /^\d{4}-\d\d-\d\d$/.test(v)) { if (D.akhirDariTgl(v) == null) { st.kamis = D.tglISO(D.akhirKamis(D.awalHari(v) + 12 * 36e5)); e.target.value = st.kamis; } else st.kamis = v; }
    else if (n === "isi") st.semua = v === "semua";
    else if (n === "n") st.n = Math.min(7, Math.max(1, Number(v) || 3));
    else if (n === "pola" || n === "urut") {
      if (n === "pola") st.pola = v.slice(0, 60); else { st.urut = v.replace(/\D/g, "").slice(0, 6); e.target.value = st.urut; }
      simpanLokal(); if (ulangNomor) { teksWA = ulangNomor(); el.wa.value = teksWA; } return;   // hanya nomor dan teks WA, kertas tidak dibangun ulang
    }
    segarkan();
  }

  /* chrome urgent di atas; ambil data + render berat menyusul sesudah satu frame tercat */
  const sesudahFrame = f => { let jalan = false; const go = () => { if (!jalan) { jalan = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  function segarkan(tanpaMuat) {
    const no = ++nomor;
    if (!tanpaMuat) { el.pesan.className = "bn-pesan"; el.pesan.textContent = "Memuat entri logbook…"; el.kertas.setAttribute("aria-busy", "true"); }
    sesudahFrame(async () => {
      const d = await ambilHari(hariDiperlukan()); if (no !== nomor) return;
      const ek = d.galat == null || d.entri.length ? await (EKSTRA[st.tab] ? EKSTRA[st.tab](d.entri) : {}) : {}; if (no !== nomor) return;
      el.kertas.removeAttribute("aria-busy");
      if (d.galat === 401 || d.galat === 403) return masuk(d.galat);
      if (d.galat === 503) { el.pesan.className = "bn-pesan galat"; el.pesan.textContent = "Data logbook belum tersedia. Hubungi admin."; el.kertas.replaceChildren(); return; }
      if (d.galat != null && !d.entri.length) { el.pesan.className = "bn-pesan galat"; el.pesan.textContent = d.galat === 0 ? "Tidak ada sinyal. Coba lagi." : `Logbook belum bisa dimuat (${d.galat}).`; return; }
      const dummy = D.adaDummy(d.entri), r = BUAT[st.tab](d.entri, dummy, d.diambil || Date.now(), ek);
      r.node.append(h("p", {class: "dk-p", teks: D.sumber(d.diambil || Date.now())}));
      ulangNomor = r.ulang || null; teksWA = r.teks;
      el.kertas.replaceChildren(r.node);
      if (r.pilih) { if (st.pilihBuka) r.pilih.setAttribute("open", ""); el.pilihan.replaceChildren(r.pilih); } else el.pilihan.replaceChildren();
      sesudahFrame(() => { if (no === nomor) el.wa.value = teksWA; });   // teks WA menyusul sesudah kertas tercat
      const info = []; if (dummy) info.push("Memuat data dummy, ditandai di dokumen."); if (d.terpotong) info.push("Sebagian entri terpotong batas 1.000 per hari, angka bisa kurang."); if (d.galat != null) info.push(`Sebagian hari gagal dimuat (${d.galat}), angka bisa kurang.`); info.push(...(ek.info || []).filter(Boolean));
      el.pesan.className = "bn-pesan" + (info.length ? " galat" : " ok"); el.pesan.textContent = info.join(" ") || `Pratinjau siap, ${F(d.entri.length)} entri dibaca.`;
    });
  }
  function masuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}), h("p", {class: "dk-p", teks: s === 403 ? "Akunmu belum berhak membuka dokumen Pusdalops. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan." : "Dokumen Pusdalops hanya untuk staf. Masuk dulu."}), h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search), teks: "Masuk staf"})));
  }
  const sibuk = () => el.kertas.hasAttribute("aria-busy");
  function cetak() {
    if (sibuk()) return;
    el.pesan.className = "bn-pesan"; el.pesan.textContent = "Menyiapkan cetak…";
    sesudahFrame(() => { el.kertas.querySelectorAll(".dk-lagi").forEach(b => b.click()); window.print(); el.pesan.textContent = ""; });
  }
  function salin() {
    if (sibuk()) return;
    if (!teksWA) { el.pesan.className = "bn-pesan galat"; el.pesan.textContent = "Belum ada teks untuk disalin."; return; }
    el.pesan.className = "bn-pesan"; el.pesan.textContent = "Menyalin…";
    sesudahFrame(async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(teksWA); ok = true; } catch (e) { el.wa.value = teksWA; el.wa.focus(); el.wa.select(); try { ok = document.execCommand("copy"); } catch (e2) {} }
      el.pesan.className = "bn-pesan " + (ok ? "ok" : "galat"); el.pesan.textContent = ok ? "Teks WA disalin." : "Penyalinan diblokir peramban. Teks sudah terpilih di kotak Teks WA, tekan salin sendiri.";
    });
  }

  kerangka(); gambarKontrol(); segarkan();
})();
