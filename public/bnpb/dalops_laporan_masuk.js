/* Tab Laporan Masuk di Pantau Dalops (/bnpb/dalops): memantau rekap harian WA Koordalops 07.00 WIB, yaitu kejadian baru, pengkinian, dan kejadian
   terbuka yang belum dikinikan. Data: GET /api/dalops/laporan (src/dalops_laporan.js; ?dummy=1 Super Admin) + GET /api/logbook/hari?tgl=T-1 untuk
   mencocokkan kejadian baru ke logbook. Tidak ada teks dampak dan tidak ada luas/hotspot di tab ini.
   Hitungan murni di dalops_hitung.js (DalopsHitung.ringkasLaporan dst, diuji tests/bnpb/dalops.test.mjs). Helper layar disuntik dari dalops.js.
   Klik baris rekap: tanda terpilih urgent, tiga kartu lain dirender sesudah satu frame tercat (INP). */
(g => {
  "use strict";
  const H = g.DalopsHitung, KUNCI_DUMMY = "lm-dummy";
  const sesudahFrame = fn => { let jalan = false; const go = () => { if (!jalan) { jalan = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 150); };   // jaring untuk tab tersembunyi
  const simpan = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };
  const baca = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };

  async function muat(p, U) {
    const {h, F, ikon, label, kosong, bagian, hl, td, tombolWA, namaProv, pasangTip, kontak, muatKantor} = U;
    const pesan = (ik, teks) => p.replaceChildren(h("div", {class: "bn-blok"}, kosong(ik, teks)));
    const mauDummy = baca(KUNCI_DUMMY) === "1";
    let r, saya;
    try { [r, saya] = await Promise.all([fetch("/api/dalops/laporan" + (mauDummy ? "?dummy=1" : ""), {credentials: "same-origin"}),
      fetch("/api/akademisi/saya", {credentials: "same-origin"}).then(x => x.ok ? x.json() : null).catch(() => null)]); }
    catch (e) { return pesan("sinyal", "Tidak ada sinyal. Muat ulang halaman ini."); }
    if (r.status === 404) return pesan("peringatan", "Rute /api/dalops/laporan belum aktif di server.");
    if (r.status === 401 || r.status === 403) return pesan("peringatan", "Akunmu belum berhak membuka Laporan Masuk.");
    if (!r.ok) return pesan("peringatan", `Laporan Masuk gagal dimuat (${r.status}). Muat ulang halaman ini.`);
    const d = await r.json(), hari = d.hari || [], daftarKantor = await muatKantor();
    const tgl = H.tglPendek, tglP = H.tglPanjang, T7 = H.tanggalPantau(Date.now());
    const ringkas = new Map(T7.map(t => [t, H.ringkasLaporan(hari, t)]));
    let pilih = T7[0], gen = 0;

    /* ---------- pembantu tabel ---------- */
    const tabel = (kepala, baris, kelas) => h("div", {class: "ad-tabel-wadah dl-tabel-wadah"}, h("table", {class: "ad-tabel dl-tabel lm-tabel " + (kelas || "")},
      h("thead", null, h("tr", null, kepala.map(k => h("th", {scope: "col", teks: k})))), h("tbody", null, baris)));
    const nomor = (i) => td(F(i + 1), true);
    const kej = (e, ekstra) => h("td", {class: "lm-kej"}, h("b", {teks: H.labelKejadian(e.k, namaProv)}), ekstra || null);
    const hariTgl = s => s.sebelum ? "Sebelum " + tgl(s.pertama) : tgl(s.pertama);
    const STATUS = {berjalan: ["Berjalan", "tunggu", "biru"], belum: ["Belum selesai", "peringatan", "kuning"], selesai: ["Selesai", "ok", "hijau"]};
    const pilStatus = s => { const [t, ik, n] = STATUS[s] || ["–", "tunggu", "abu"]; return label(t, ik, n); };
    const alasanGagal = t => hari.find(x => x.tanggal === t)?.alasan;

    /* ---------- kartu 1: rekap harian (tujuh tanggal) ---------- */
    const barisRekap = T7.map(t => {
      const e = hari.find(x => x.tanggal === t), rk = ringkas.get(t);
      const tombol = h("button", {type: "button", class: "lm-tgl", "aria-pressed": String(t === pilih), teks: tglP(t)});
      const baris = !e ? [td(label("Belum masuk", "tunggu", "merah")), ...Array(5).fill(0).map(() => td("–", true))]
        : e.status !== "ok" ? [h("td", {title: e.alasan || "Rekap tidak terbaca"}, label("Gagal dibaca", "peringatan", "merah")), ...Array(5).fill(0).map(() => td("–", true))]
        : [td(e.jam || "–", true), td(e.laporan == null ? "–" : F(e.laporan), true),
          h("td", {class: "n"}, e.menonjol == null ? "–" : F(e.menonjol), (e.kejadian || []).length !== e.menonjol ? label(`Terurai ${F((e.kejadian || []).length)} dari ${F(e.menonjol)}`, "peringatan", "kuning") : null),
          td(F(rk.baru.length), true), td(F(rk.pengkinian.length), true), td(F(rk.tagih.length), true)];
      return h("tr", {class: "lm-baris" + (t === pilih ? " lm-pilih" : ""), "data-tgl": t}, h("td", {class: "lm-tg"}, tombol), ...baris);
    });
    const jumlahOk = T7.filter(t => hari.some(x => x.tanggal === t && x.status === "ok")).length;
    const kartuRekap = bagian("lm-rekap", "kalender", "Rekap harian",
      jumlahOk === 7 ? [hl("7 dari 7 rekap"), " harian Koordalops masuk sepekan terakhir"]
        : [hl(`${F(jumlahOk)} dari 7 rekap`), " harian Koordalops masuk sepekan terakhir, ", hl(`${F(7 - jumlahOk)} belum masuk atau gagal dibaca`)],
      tabel(["Tanggal", "Rekap masuk (WIB)", "Laporan", "Menonjol", "Baru", "Pengkinian", "Tanpa pengkinian"], barisRekap, "lm-rekap-tabel"));
    const tbRekap = kartuRekap.querySelector("tbody");

    /* ---------- kartu 2-4, bergantung pada tanggal terpilih ---------- */
    const pesanKosong = (rk, t, ik, apa) => kosong(ik, rk.status === "gagal" ? `Rekap ${tglP(t)} gagal dibaca${alasanGagal(t) ? " (" + alasanGagal(t) + ")" : ""}, ${apa} tidak bisa dihitung.` : `Rekap ${tglP(t)} belum masuk, ${apa} belum bisa dihitung.`);

    const kartuTagih = (t, rk) => {
      if (!rk.ada) return bagian("lm-tagih", "tunggu", "Perlu ditagih", `Rekap ${tglP(t)} ${rk.status === "gagal" ? "gagal dibaca" : "belum masuk"}`, pesanKosong(rk, t, "tunggu", "kejadian yang belum dikinikan"));
      if (!rk.tagih.length) return bagian("lm-tagih", "ok", "Perlu ditagih", `Semua kejadian terbuka sudah dikinikan pada rekap ${tglP(t)}`, kosong("ok", "Tidak ada kejadian terbuka yang luput dari rekap ini."));
      const baris = rk.tagih.map((x, i) => {
        const nama = x.k.lokasi || namaProv(x.k.prov), kt = kontak(daftarKantor, {nama, kab_kode: `${x.k.prov}|${x.k.lokasi || "(provinsi)"}`});
        let aksi;
        {
          const a = tombolWA({nama: H.labelKejadian(x.k, namaProv)}, H.pesanTagih(x, nama, H.kataJenis(x.k.jenis)), "permintaan pembaruan");   // tanpa nomor kantor (bpbd.json hampir kosong): petugas memilih kontak di WhatsApp
          if (kt) a.setAttribute("href", `https://wa.me/${kt.no}?text=${encodeURIComponent(H.pesanTagih(x, nama, H.kataJenis(x.k.jenis)))}`);   // ke kontak kantornya, tombol hanya membuka wa.me
          aksi = h("div", {class: "dl-aksi lm-tagih-aksi", title: kt ? kt.nama : "Pilih kontak di WhatsApp"}, a);
        }
        return h("tr", null, nomor(i), kej(x), td(namaProv(x.k.prov)), td(hariTgl(x), true), td(tgl(x.kabarTerakhir), true),
          h("td", {class: "n"}, h("div", {class: "dl-chips"}, label(`${F(x.tanpa)} hari`, "tunggu", x.nada), x.usulTutup ? label("Usul tutup", "senyap", "abu") : null)),
          h("td", {class: "n"}, aksi));
      });
      return bagian("lm-tagih", "tunggu", "Perlu ditagih", [hl(`${F(rk.tagih.length)} kejadian`), ` terbuka belum dikinikan pada rekap ${tglP(t)}`],
        tabel(["No", "Kejadian", "Provinsi", "Laporan pertama", "Kabar terakhir", "Tanpa kabar", "Aksi"], baris));
    };

    const kartuBaru = (t, rk) => {
      if (!rk.ada) return [bagian("lm-baru", "tambah", "Kejadian baru", `Rekap ${tglP(t)} ${rk.status === "gagal" ? "gagal dibaca" : "belum masuk"}`, pesanKosong(rk, t, "tunggu", "kejadian baru")), []];
      if (!rk.baru.length) return [bagian("lm-baru", "tambah", "Kejadian baru", `Tidak ada kejadian baru pada rekap ${tglP(t)}`, kosong("ok", "Rekap ini hanya memuat pengkinian.")), []];
      const cek = new Set(rk.perluDicek.filter(x => x.alasan === "mungkin_pengkinian").map(x => x.kunci)), sel = [];
      const baris = rk.baru.map((x, i) => {
        const lb = h("td", {class: "n"}, label("Memeriksa", "tunggu", "abu")); sel.push([x, lb]);
        return h("tr", null, nomor(i), kej(x, cek.has(x.kunci) ? h("div", {class: "dl-chips lm-cek"}, label("Mungkin pengkinian", "peringatan", "kuning")) : null), td(namaProv(x.k.prov)), h("td", {class: "n"}, pilStatus(x.k.status)), lb);
      });
      return [bagian("lm-baru", "tambah", "Kejadian baru", [hl(`${F(rk.baru.length)} kejadian baru`), ` pada rekap ${tglP(t)}, dicocokkan ke logbook`],
        tabel(["No", "Kejadian", "Provinsi", "Status", "Logbook"], baris)), sel];
    };

    const kartuKini = (t, rk) => {
      if (!rk.ada) return bagian("lm-kini", "kalender", "Pengkinian", `Rekap ${tglP(t)} ${rk.status === "gagal" ? "gagal dibaca" : "belum masuk"}`, pesanKosong(rk, t, "tunggu", "pengkinian"));
      if (!rk.pengkinian.length) return bagian("lm-kini", "kalender", "Pengkinian", `Tidak ada pengkinian pada rekap ${tglP(t)}`, kosong("ok", "Rekap ini hanya memuat kejadian baru."));
      const tanpa = new Set(rk.perluDicek.filter(x => x.alasan === "tanpa_pertama").map(x => x.kunci));
      const baris = rk.pengkinian.map((x, i) => h("tr", null, nomor(i), kej(x), td(namaProv(x.k.prov)), td(hariTgl(x), true), td(x.hariKe == null ? "–" : F(x.hariKe), true),
        h("td", {class: "n"}, tanpa.has(x.kunci) ? label("Tanpa laporan pertama", "peringatan", "kuning") : "–")));
      return bagian("lm-kini", "kalender", "Pengkinian", [hl(`${F(rk.pengkinian.length)} kejadian`), ` dikinikan pada rekap ${tglP(t)}`, ...tanpa.size ? [", ", hl(`${F(tanpa.size)} perlu dicek`)] : []],
        tabel(["No", "Kejadian", "Provinsi", "Laporan pertama", "Hari ke", "Catatan"], baris));
    };

    /* logbook: tgl = T - 1 (periode 07.00-07.00 WIB), satu fetch per tanggal */
    const cacheLb = new Map();
    const ambilLogbook = tg => cacheLb.get(tg) || (cacheLb.set(tg, fetch("/api/logbook/hari?tgl=" + tg, {credentials: "same-origin"})
      .then(async x => { if (!x.ok) throw 0; const j = await x.json(); return {entri: j.entri || [], terpotong: !!j.terpotong}; })
      .catch(() => { cacheLb.delete(tg); return null; })).get(tg));
    const isiLogbook = async (t, sel, g0) => {
      const lb = await ambilLogbook(H.tglLogbook(t));
      if (g0 !== gen) return;
      for (const [x, td] of sel) {
        const ada = lb && H.cocokLogbook(x.k, lb.entri);
        td.replaceChildren(!lb || (!ada && lb.terpotong) ? label("Tidak terbaca", "senyap", "abu") : ada ? label("Tercatat", "ok", "hijau") : label("Belum ada", "peringatan", "merah"));
      }
    };

    /* tiga kartu dibangun dari kerangka ke isi: dipanggil sekali awal dan tiap tanggal berganti (sesudah frame) */
    let kartu = [];
    const pasangKartu = (g0, awal) => {
      const t = pilih, rk = ringkas.get(t) || H.ringkasLaporan(hari, t), [baru, sel] = kartuBaru(t, rk), baru3 = [kartuTagih(t, rk), baru, kartuKini(t, rk)];
      if (awal) p.append(...baru3); else kartu.forEach((k, i) => k.replaceWith(baru3[i]));
      kartu = baru3; pasangTip();
      if (sel.length) isiLogbook(t, sel, g0);
    };

    /* ---------- dummy (Super Admin saja): dua ikon polos, isi/hapus lalu muat ulang penuh ---------- */
    const dummy = async (aksi, wadah) => {
      if (aksi === "hapus" && !confirm("Hapus semua data dummy Laporan Masuk? Data asli tidak tersentuh.")) return;
      const tb = [...wadah.querySelectorAll("button")]; tb.forEach(b => { b.disabled = true; b.setAttribute("aria-busy", "true"); });
      let x; try { x = await fetch("/api/dalops/laporan/dummy", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({aksi})}); } catch (e) { x = null; }
      if (x && (x.ok || (aksi === "isi" && x.status === 409))) { simpan(KUNCI_DUMMY, aksi === "isi" ? "1" : null); return location.reload(); }
      tb.forEach(b => { b.disabled = false; b.removeAttribute("aria-busy"); });
      wadah.querySelector(".lm-pesan").textContent = !x ? "Tidak ada sinyal." : x.status === 404 ? "Rute dummy Laporan Masuk belum ada di server." : `Dummy gagal (${x.status}).`;
    };
    const alat = (saya?.super || d.dummy) ? h("div", {class: "lm-alat"}, d.dummy ? label("DATA DUMMY", "uji", "kuning") : null, h("span", {class: "lm-pesan", role: "status"}), ...(saya?.super ? [
      h("button", {type: "button", class: "lm-dummy", "data-dummy": "isi", title: "Isi data dummy Laporan Masuk", "aria-label": "Isi data dummy"}, ikon("uji")),
      h("button", {type: "button", class: "lm-dummy", "data-dummy": "hapus", title: "Hapus semua data dummy", "aria-label": "Hapus data dummy"}, ikon("sapu"))] : [])) : null;
    alat?.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (b && !b.disabled) dummy(b.dataset.dummy, alat); });

    /* ---------- klik baris rekap: chrome terpilih seketika, kartu lain menyusul ---------- */
    tbRekap.addEventListener("click", e => {
      const tr = e.target.closest("tr[data-tgl]"); if (!tr || tr.dataset.tgl === pilih) return;
      pilih = tr.dataset.tgl; const g0 = ++gen;
      for (const b of tbRekap.rows) { const on = b === tr; b.classList.toggle("lm-pilih", on); b.querySelector(".lm-tgl").setAttribute("aria-pressed", String(on)); }
      sesudahFrame(() => { if (g0 === gen) pasangKartu(g0, false); });
    });

    p.replaceChildren(...[alat, kartuRekap].filter(Boolean));
    pasangTip();
    await new Promise(ok => sesudahFrame(ok));   // kartu rekap tercat dulu, tiga kartu lain menyusul
    pasangKartu(gen, true);
  }

  g.DalopsLaporanMasuk = {muat};
})(globalThis);
