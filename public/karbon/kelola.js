/* Tab Pemantauan (peringatan + status), Kesepakatan (kanban per tahap + pihak), Buku unit (saldo + entri baru; catatan internal).
   Semua simpan lewat POST dengan `diubah`; 409 dari server ditampilkan apa adanya. */
import {S, h, ganti, ang, T, tgl, selisihHari, judul, tombol, pil, kosong, tabel, segmen, pilihan, hias, nanti, kabar, api, kirim, daftar, pesanGalat, petaBaru, ukurUlang, batas} from "./alat.js";
import {TAHAP_KS, ARAH, JENIS_PIHAK, STATUS_PER, SUMBER_PER, JENIS_BUKU, label} from "./ranah.js";

/* GET /api/karbon/buku: entri, saldo (saldo, cadang, tersedia per proyek+vintage), total (jumlah per jenis) */
const bukuDari = j => ({entri: daftar(j, "entri"), saldo: j.saldo || [], total: j.total || []});
export async function muatKelola() {
  const [w, ph, ks, bk] = await Promise.allSettled([api("/api/karbon/peringatan"), api("/api/karbon/pihak"), api("/api/karbon/kesepakatan"), api("/api/karbon/buku")]);
  if (w.status === "fulfilled") S.peringatan = daftar(w.value, "peringatan");
  if (ph.status === "fulfilled") S.pihak = daftar(ph.value, "pihak");
  if (ks.status === "fulfilled") S.kesepakatan = daftar(ks.value, "kesepakatan");
  if (bk.status === "fulfilled") S.buku = bukuDari(bk.value);
  return [w, ph, ks, bk].find(x => x.status === "rejected")?.reason;
}
const namaProyek = id => S.proyek.find(p => p.id === id)?.nama ?? id ?? "–";
const namaPihak = id => S.pihak.find(p => p.id === id)?.nama ?? id ?? "–";
const PER = 25;

/* dialog formulir sederhana; isi(form) membangun kolom, kirimkan(v) → Promise */
function dialogForm(jd, kolom, kirimkan) {
  const d = h("dialog", {class: "dlg", "aria-label": jd}), galat = h("p", {class: "kb-galat", role: "alert", hidden: true});
  const f = h("form", {class: "kb-asumsi", onsubmit: async e => {
    e.preventDefault(); const b = f.querySelector("button"); b.disabled = true;
    try { await kirimkan(Object.fromEntries(new FormData(f))); d.close(); } catch (er) { galat.hidden = false; galat.textContent = pesanGalat(er); b.disabled = false; }
  }}, h("fieldset", null, kolom), galat, h("div", {class: "kb-aksi"}, h("button", {class: "kb-btn"}, "Simpan"), h("button", {type: "button", class: "kb-btn ke2", onclick: () => d.close()}, "Batal")));
  d.append(h("div", {class: "dh"}, h("div", null, h("h3", null, jd)), h("button", {type: "button", "aria-label": "Tutup", onclick: () => d.close()}, "×")), h("div", {class: "db"}, f));
  d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal();
}
const kol = (t, inp) => h("label", {class: "kb-f"}, h("span", null, t), inp);
const angka = v => v === "" || v == null ? null : +v;

/* ---------- Pemantauan ---------- */
const FW = {status: "semua", sumber: "semua", proyek: "", hal: 0};
let petaW = null, ulangPer = null, kunciPer = "";
export function renderPemantauan(panel) {
  /* kembali ke tab dengan data sama: pakai UI dan peta yang ada, peta cukup diukur ulang (INP) */
  const kunci = S.proyek.length + "|" + S.peringatan.length;
  if (ulangPer && panel.dataset.per === kunci) { nanti(() => { ukurUlang(petaW); ulangPer(); }); return; }
  panel.dataset.per = kunciPer = kunci;
  const isi = h("div"), petaEl = h("div", {class: "kb-peta"}, h("div", {class: "kb-peta-k"}));
  const set = (k, v) => { FW[k] = v; FW.hal = 0; nanti(gambar); };
  const gambar = () => {
    const L = S.peringatan.filter(x => (FW.status === "semua" || x.status === FW.status) && (FW.sumber === "semua" || x.sumber === FW.sumber) && (!FW.proyek || x.proyek_id === FW.proyek))
      .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    const hal = Math.min(FW.hal, Math.max(0, Math.ceil(L.length / PER) - 1)), nav = h("div", {class: "kb-pgn"});
    nav.innerHTML = paginasi(hal, L.length, PER, "peringatan");
    nav.addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (b) { FW.hal = +b.dataset.h; nanti(gambar); } });
    ganti(isi, L.length ? tabel([
      {t: "Tanggal", f: x => tgl(x.tanggal)}, {t: "Proyek", kelas: "kb-nama", f: x => namaProyek(x.proyek_id)}, {t: "Sumber", f: x => label(SUMBER_PER, x.sumber)},
      {t: "Luas (ha)", n: 1, f: x => x.luas_ha == null ? "–" : ang(x.luas_ha, 1)}, {t: "Keyakinan", f: x => x.keyakinan || "–"},
      {t: "Status", f: x => pil(label(STATUS_PER, x.status), x.status)}, {t: "Catatan", kelas: "kb-nama kb-o", f: x => x.catatan || "–"},
      {t: "Tindak lanjut", f: x => h("button", {type: "button", class: "link", onclick: e => { e.stopPropagation(); ubahPer(x, gambar); }}, "Ubah")},
    ], L.slice(hal * PER, hal * PER + PER)) : kosong(S.peringatan.length ? "Tidak ada peringatan yang cocok dengan saringan." : "Belum ada peringatan. Pemantauan berjalan otomatis tiap pagi untuk proyek tahap studi ke atas."), nav);
    const src = petaW?.getSource("w");
    if (src) src.setData({type: "FeatureCollection", features: L.map(x => ({type: "Feature", properties: {s: x.status}, geometry: {type: "Point", coordinates: [x.lon, x.lat]}}))});
  };
  ganti(panel,
    judul("Pemantauan", "Peringatan deforestasi dan titik api di dalam proyek, dengan status tindak lanjutnya."),
    h("div", {class: "kb-f"}, h("span", null, "Status"), segmen([["semua", "Semua"], ...STATUS_PER], FW.status, v => set("status", v), "Status")),
    h("div", {class: "kb-saring"},
      kol("Proyek", pilihan([["", "Semua proyek"], ...S.proyek.map(p => [p.id, p.nama])], FW.proyek, {"aria-label": "Proyek", onchange: e => set("proyek", e.target.value)})),
      h("div", {class: "kb-f"}, h("span", null, "Sumber"), segmen([["semua", "Semua"], ...SUMBER_PER], FW.sumber, v => set("sumber", v), "Sumber"))),
    S.peringatan.length ? petaEl : null, isi);
  ulangPer = gambar; petaW?.remove(); petaW = null;
  hias(panel); gambar();
  if (S.peringatan.length) petaBaru(petaEl.firstChild).then(m => {
    petaW = m;
    m.addSource("w", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    m.addLayer({id: "w", type: "circle", source: "w", paint: {"circle-radius": 5, "circle-color": ["match", ["get", "s"], "baru", "#c9503a", "valid", "#0b2545", "dicek", "#4f9be0", "#9aa3ad"], "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
    const fc = {type: "FeatureCollection", features: S.peringatan.map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}}))}, b = batas(fc);
    if (b) m.fitBounds(b, {padding: 40, duration: 0, maxZoom: 10});
    gambar();
  }).catch(e => console.warn(e));
}
function ubahPer(x, ulang) {
  dialogForm(`Peringatan ${tgl(x.tanggal)} · ${namaProyek(x.proyek_id)}`, [
    kol("Status", pilihan(STATUS_PER, x.status, {name: "status"})),
    h("label", {class: "kb-f kb-lebar"}, h("span", null, "Catatan tindak lanjut"), h("textarea", {name: "catatan", rows: 3, maxlength: 2000}, x.catatan ?? "")),
  ], async v => { const j = await kirim("/api/karbon/peringatan", {id: x.id, ...v, diubah: x.diubah}); Object.assign(x, v, {diubah: j.diubah ?? x.diubah}); kabar("Peringatan diperbarui."); nanti(ulang); });
}

/* ---------- Kesepakatan ---------- */
const FK = {arah: "semua"};
export function renderKesepakatan(panel) {
  const papan = h("div", {class: "kb-kanban"}), pihakEl = h("div");
  const gambar = () => {
    const L = S.kesepakatan.filter(k => FK.arah === "semua" || k.arah === FK.arah);
    ganti(papan, TAHAP_KS.map(([t, nm]) => {
      const isi = L.filter(k => k.tahap === t).sort((a, b) => String(a.tenggat || "9").localeCompare(String(b.tenggat || "9")));
      return h("section", {class: "kb-kol", "aria-label": nm}, h("h3", null, nm, h("small", null, " " + ang(isi.length))),
        isi.length ? isi.map(k => {
          const sisa = k.tenggat ? selisihHari(k.tenggat) : null;
          return h("button", {type: "button", class: "kb-kartu", onclick: () => ubahKs(k, gambar)},
            h("b", null, namaPihak(k.pihak_id)), h("span", null, label(ARAH, k.arah) + (k.proyek_id ? " · " + namaProyek(k.proyek_id) : "")),
            k.nilai_usd ? h("span", {class: "num"}, ang(k.nilai_usd) + " USD") : null,
            k.langkah_berikut ? h("span", {class: "kb-langkah"}, k.langkah_berikut) : null,
            k.tenggat ? h("span", null, pil(sisa < 0 ? "Lewat" : sisa <= 14 ? "Segera" : "Terjadwal", sisa < 0 ? "lewat" : sisa <= 14 ? "dekat" : "jauh"), " " + (sisa < 0 ? `${-sisa} hari lewat` : sisa <= 14 ? `${sisa} hari lagi` : tgl(k.tenggat))) : null);
        }) : h("p", {class: "kb-cat"}, "Kosong"));
    }));
    ganti(pihakEl, S.pihak.length ? tabel([{t: "Nama", kelas: "kb-nama", f: x => x.nama}, {t: "Jenis", f: x => label(JENIS_PIHAK, x.jenis)}, {t: "Negara", f: x => x.negara || "–"},
      {t: "Kontak", kelas: "kb-nama", f: x => x.kontak || "–"}, {t: "Kesepakatan", n: 1, f: x => ang(S.kesepakatan.filter(k => k.pihak_id === x.id).length)}], S.pihak, {klik: x => ubahPihak(x, gambar)}) : kosong("Belum ada pihak."));
  };
  ganti(panel,
    judul("Kesepakatan", "Kesepakatan dengan pemegang konsesi, pembeli, investor, dan mitra menurut tahapnya.", tombol("Tambah kesepakatan", () => ubahKs(null, gambar))),
    h("div", {class: "kb-f"}, h("span", null, "Arah"), segmen([["semua", "Semua"], ...ARAH], FK.arah, v => { FK.arah = v; nanti(gambar); }, "Arah kesepakatan")),
    papan,
    h("section", {class: "kb-bag"}, judul("Pihak", "Orang dan lembaga yang terlibat.", tombol("Tambah pihak", () => ubahPihak(null, gambar))), pihakEl));
  gambar();
}
function ubahKs(k, ulang) {
  if (!S.pihak.length) { kabar("Tambah pihak dulu."); return; }
  k ||= {arah: "jual", tahap: "prospek"};
  dialogForm(k.id ? "Ubah kesepakatan" : "Kesepakatan baru", [
    kol("Pihak", pilihan(S.pihak.map(p => [p.id, p.nama]), k.pihak_id, {name: "pihak_id", required: true})),
    kol("Proyek", pilihan([["", "Belum terkait proyek"], ...S.proyek.map(p => [p.id, p.nama])], k.proyek_id, {name: "proyek_id"})),
    kol("Arah", pilihan(ARAH, k.arah, {name: "arah"})), kol("Tahap", pilihan(TAHAP_KS, k.tahap, {name: "tahap"})),
    kol(`Volume (${T}/th)`, h("input", {type: "number", name: "volume_t_th", min: 0, step: "any", value: k.volume_t_th ?? ""})),
    kol("Tenor (th)", h("input", {type: "number", name: "tenor_th", min: 0, step: "any", value: k.tenor_th ?? ""})),
    kol(`Harga (USD/${T})`, h("input", {type: "number", name: "harga_usd", min: 0, step: "any", value: k.harga_usd ?? ""})),
    kol("Nilai (USD)", h("input", {type: "number", name: "nilai_usd", min: 0, step: "any", value: k.nilai_usd ?? "", placeholder: "kosong = volume × tenor × harga"})),
    kol("Tenggat", h("input", {type: "date", name: "tenggat", value: k.tenggat ?? ""})),
    h("label", {class: "kb-f kb-lebar"}, h("span", null, "Langkah berikut"), h("input", {name: "langkah_berikut", maxlength: 500, value: k.langkah_berikut ?? ""})),
    h("label", {class: "kb-f kb-lebar"}, h("span", null, "Catatan"), h("textarea", {name: "catatan", rows: 2, maxlength: 2000}, k.catatan ?? "")),
  ], async v => {
    const isi = {...v, proyek_id: v.proyek_id || null, tenggat: v.tenggat || null};
    for (const x of ["volume_t_th", "tenor_th", "harga_usd", "nilai_usd"]) isi[x] = angka(v[x]);
    if (isi.nilai_usd == null && isi.volume_t_th && isi.tenor_th && isi.harga_usd) isi.nilai_usd = isi.volume_t_th * isi.tenor_th * isi.harga_usd;
    const j = await kirim("/api/karbon/kesepakatan", k.id ? {id: k.id, ...isi, diubah: k.diubah} : isi);
    if (k.id) Object.assign(k, isi, {diubah: j.diubah ?? k.diubah}); else S.kesepakatan = daftar(await api("/api/karbon/kesepakatan"), "kesepakatan");
    kabar("Kesepakatan tersimpan."); nanti(ulang);
  });
}
function ubahPihak(x, ulang) {
  x ||= {jenis: "pembeli"};
  dialogForm(x.id ? "Ubah pihak" : "Pihak baru", [
    kol("Nama", h("input", {name: "nama", required: true, maxlength: 200, value: x.nama ?? ""})), kol("Jenis", pilihan(JENIS_PIHAK, x.jenis, {name: "jenis"})),
    kol("Negara", h("input", {name: "negara", maxlength: 80, value: x.negara ?? ""})), kol("Kontak", h("input", {name: "kontak", maxlength: 300, value: x.kontak ?? ""})),
    h("label", {class: "kb-f kb-lebar"}, h("span", null, "Catatan"), h("textarea", {name: "catatan", rows: 2, maxlength: 2000}, x.catatan ?? "")),
  ], async v => {
    const j = await kirim("/api/karbon/pihak", x.id ? {id: x.id, ...v, diubah: x.diubah} : v);
    if (x.id) Object.assign(x, v, {diubah: j.diubah ?? x.diubah}); else S.pihak = daftar(await api("/api/karbon/pihak"), "pihak");
    kabar("Pihak tersimpan."); nanti(ulang);
  });
}

/* ---------- Buku unit ---------- */
const FB = {hal: 0};
export function renderBuku(panel) {
  const saldoEl = h("div"), riwEl = h("div"), galat = h("p", {class: "kb-galat", role: "alert", hidden: true});
  const gambar = () => {
    /* saldo, cadang bersih, tersedia dari `saldo` server; rincian per jenis dari `total` server (bukan dijumlah dari entri) */
    const tot = new Map(S.buku.total.map(t => [t.proyek_id + "|" + t.vintage, t]));
    const sl = S.buku.saldo.map(x => { const t = tot.get(x.proyek_id + "|" + x.vintage) || {};
      return {...x, terbit: t.terbit ?? 0, alih: t.alih ?? 0, pensiun: t.pensiun ?? 0, batal: t.batal ?? 0, cadang: x.cadang ?? (t.cadang ?? 0) - (t.lepas_cadang ?? 0)}; })
      .sort((a, b) => namaProyek(a.proyek_id).localeCompare(namaProyek(b.proyek_id)) || a.vintage - b.vintage);
    ganti(saldoEl, sl.length ? tabel([{t: "Proyek", kelas: "kb-nama", f: x => namaProyek(x.proyek_id)}, {t: "Vintage", f: x => x.vintage},
      ...[["terbit", "Terbit"], ["cadang", "Cadang"], ["alih", "Alih"], ["pensiun", "Pensiun"], ["batal", "Batal"], ["saldo", "Saldo unit"], ["tersedia", "Tersedia"]].map(([k, t]) => ({t: `${t} (${T})`, n: 1, f: x => ang(x[k] ?? 0)}))],
    sl, {kaki: (_, i) => i === 0 ? "Total" : i === 1 ? "" : ang(sl.reduce((s, x) => s + (x[["", "", "terbit", "cadang", "alih", "pensiun", "batal", "saldo", "tersedia"][i]] ?? 0), 0))}) : kosong("Belum ada unit tercatat."));
    const E = [...S.buku.entri].sort((a, b) => (b.waktu ?? 0) - (a.waktu ?? 0)), hal = Math.min(FB.hal, Math.max(0, Math.ceil(E.length / PER) - 1)), nav = h("div", {class: "kb-pgn"});
    nav.innerHTML = paginasi(hal, E.length, PER, "entri");
    nav.addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (b) { FB.hal = +b.dataset.h; nanti(gambar); } });
    ganti(riwEl, E.length ? tabel([{t: "Waktu", f: x => tgl(x.waktu)}, {t: "Proyek", kelas: "kb-nama", f: x => namaProyek(x.proyek_id)}, {t: "Vintage", f: x => x.vintage},
      {t: "Jenis", f: x => pil(label(JENIS_BUKU, x.jenis), "b-" + x.jenis)}, {t: `Jumlah (${T})`, n: 1, f: x => ang(x.jumlah_t)},
      {t: ["Serial ", h("small", null, "(nomor catatan internal)")], kelas: "kb-o", f: x => x.serial_awal ? `${x.serial_awal} – ${x.serial_akhir ?? ""}` : "–"}, {t: "Pembeli", f: x => x.pembeli || "–"}, {t: "Oleh", kelas: "kb-o", f: x => x.oleh || "–"}],
    E.slice(hal * PER, hal * PER + PER)) : kosong("Belum ada entri."), nav);
  };
  const f = h("form", {class: "kb-asumsi", onsubmit: async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(f)), b = f.querySelector("button"); galat.hidden = true;
    const isi = {proyek_id: v.proyek_id, vintage: +v.vintage, jenis: v.jenis, jumlah_t: +v.jumlah_t, serial_awal: v.serial_awal || null, serial_akhir: v.serial_akhir || null,
      kesepakatan_id: v.kesepakatan_id || null, pembeli: v.pembeli || null, catatan: v.catatan || null};
    if (!Number.isInteger(isi.jumlah_t) || isi.jumlah_t <= 0) { galat.hidden = false; galat.textContent = "Jumlah harus bilangan bulat lebih dari 0."; return; }
    b.disabled = true;
    try { await kirim("/api/karbon/buku", isi); S.buku = bukuDari(await api("/api/karbon/buku")); f.reset(); kabar("Entri tercatat."); nanti(gambar); }
    catch (er) { galat.hidden = false; galat.textContent = er.status === 409 ? "Ditolak: " + (er.isi?.galat || "saldo tidak cukup") : pesanGalat(er); }
    b.disabled = false;
  }},
  h("fieldset", null, h("legend", null, "Entri baru"),
    kol("Proyek", pilihan(S.proyek.map(p => [p.id, p.nama]), "", {name: "proyek_id", required: true})),
    kol("Vintage", h("input", {type: "number", name: "vintage", min: 2000, max: 2100, step: 1, required: true, value: new Date().getFullYear() - 1})),
    kol("Jenis", pilihan(JENIS_BUKU, "terbit", {name: "jenis"})),
    kol(`Jumlah (${T})`, h("input", {type: "number", name: "jumlah_t", min: 1, step: 1, required: true})),
    kol("Serial awal", h("input", {name: "serial_awal", maxlength: 120, placeholder: "nomor catatan internal"})), kol("Serial akhir", h("input", {name: "serial_akhir", maxlength: 120, placeholder: "nomor catatan internal"})),
    kol("Kesepakatan", pilihan([["", "Tidak terkait"], ...S.kesepakatan.map(k => [k.id, `${namaPihak(k.pihak_id)} · ${label(ARAH, k.arah)}`])], "", {name: "kesepakatan_id"})),
    kol("Pembeli", h("input", {name: "pembeli", maxlength: 200})),
    h("label", {class: "kb-f kb-lebar"}, h("span", null, "Catatan"), h("input", {name: "catatan", maxlength: 2000}))),
  galat, h("div", {class: "kb-aksi"}, h("button", {class: "kb-btn", disabled: !S.proyek.length}, "Catat entri")));
  ganti(panel,
    judul("Buku unit", "Catatan internal, bukan registri."),
    saldoEl,
    h("section", {class: "kb-bag"}, f),
    h("section", {class: "kb-bag"}, judul("Riwayat entri", "Entri tidak bisa diubah; koreksi dicatat sebagai entri baru."), riwEl));
  hias(panel); gambar();
}
