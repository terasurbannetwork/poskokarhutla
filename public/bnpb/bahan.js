/* Bahan Laporan Harian (/bnpb/bahan): form "tinggal pilih" -> teks WA baku (bahan_spek.js, dipakai juga Worker) -> POST /api/wa/form.
   Empat tab, tiap tab satu kunci. Pratinjau teks disusun di peramban lewat susun(); ditunda 200 md supaya ketikan tidak tertahan (INP).
   Akses staf (sesi_staf); layar hanya memeriksa balasan API. Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
import * as S from "/bnpb/bahan_spek.js";
import {CONTOH} from "/bnpb/bahan_contoh.js";

const {ikon, h} = window.Wilayah, {PROV} = S;
const app = document.getElementById("app");
const tunda = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const wibHari = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const geser = (iso, d) => new Date(Date.parse(iso + "T00:00:00Z") + d * 864e5).toISOString().slice(0, 10);
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tglId = t => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(t || ""); return m ? `${Number(m[3])} ${BLN[Number(m[2]) - 1]} ${m[1]}` : t || ""; };
/* 1.234,5 / 1.234 (ribuan) / 12,5 / 252.8 -> angka; kosong -> null; bukan angka -> teksnya (spek menolak dengan pesan jelas) */
const angkaId = v => { const t = String(v).trim(); if (!t) return null; return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t); };
const n = v => { const a = angkaId(v ?? ""); return a == null ? null : Number.isNaN(a) ? String(v) : a; };
const str = v => v == null ? "" : typeof v === "number" ? S.ribu(v) : String(v);
const pecah = s => String(s).split(/,|\s+dan\s+/).map(x => x.trim()).filter(Boolean);
const api = async (m, u, b) => {
  try { const r = await fetch(u, {method: m, headers: b ? {"content-type": "application/json", "x-pb": "1"} : {}, body: b ? JSON.stringify(b) : undefined});
    return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, s: 0, j: {galat: "Tidak ada sinyal. Coba lagi sebentar."}}; }
};

/* ---------- komponen isian: tiap isian menulis langsung ke objek state, lalu menjadwalkan pratinjau ---------- */
let aktif = null;                       // tab yang sedang dibuka
const jadwal = tunda(() => pratinjau(), 200);
const ubah = () => { if (aktif) aktif.sentuh = true; jadwal(); };
const lbl = (judul, el) => h("label", {class: "bn-isian"}, judul, el);
function isian(judul, o, k, a = {}, area = false) {
  const i = h(area ? "textarea" : "input", {autocomplete: "off", "aria-label": judul, ...a});
  i.value = str(o[k]); i.addEventListener("input", () => { o[k] = i.value; ubah(); });
  return lbl(judul, i);
}
const angka = (judul, o, k, a = {}) => isian(judul, o, k, {inputmode: "decimal", ...a});
function pilih(judul, o, k, opsi, kosong, balik) {
  const s = h("select", {"aria-label": judul}, kosong != null ? h("option", {value: "", teks: kosong}) : null, opsi.map(([v, t]) => h("option", {value: v, teks: t})));
  s.value = o[k] ?? ""; s.addEventListener("change", () => { o[k] = s.value; balik?.(); ubah(); });
  return lbl(judul, s);
}
function centang(teks, o, k, ik, balik) {
  const c = h("input", {type: "checkbox"}); c.checked = !!o[k];
  c.addEventListener("change", () => { o[k] = c.checked; balik?.(); ubah(); });
  return h("label", null, c, ik ? ikon(ik) : null, teks);
}
/* daftar baris yang bisa ditambah/dihapus; kolom(item) -> elemen. Hanya daftar ini yang digambar ulang saat tambah/hapus. */
function daftar(arr, kolom, baru, tambah, min = 0, maks = 99) {
  const w = h("div", {class: "bh-daftar"}), tb = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("tambah"), tambah);
  const atur = () => { tb.disabled = arr.length >= maks; for (const x of w.querySelectorAll(":scope > .bh-baris > .bh-ikon")) x.disabled = arr.length <= min; };
  const baris = it => {
    const hapus = h("button", {type: "button", class: "bh-ikon", "aria-label": "Hapus baris", title: "Hapus baris"}, ikon("sapu")), r = h("div", {class: "bh-baris"}, kolom(it), hapus);
    hapus.addEventListener("click", () => {
      const i = arr.indexOf(it); if (i < 0) return; arr.splice(i, 1);
      const fokus = r.nextElementSibling?.querySelector(":scope > .bh-ikon") || r.previousElementSibling?.querySelector(":scope > .bh-ikon") || tb;
      r.remove(); atur(); (fokus.disabled ? tb : fokus).focus(); ubah();
    });
    return r;
  };
  tb.addEventListener("click", () => { const it = baru(); arr.push(it); const r = baris(it); w.insertBefore(r, tb); atur(); r.querySelector("input,select,textarea")?.focus(); ubah(); });
  w.append(...arr.map(baris), tb); atur(); return w;
}
/* pemilih banyak provinsi: lipatan berisi kotak centang; arr tetap berurutan menurut kode */
function provBanyak(judul, arr) {
  const sum = h("summary", {teks: `${judul} (${arr.length})`}), kode = Object.keys(PROV);
  const box = kode.map(k => { const c = h("input", {type: "checkbox", value: k}); c.checked = arr.includes(k); return h("label", null, c, PROV[k]); });
  const d = h("details", {class: "bh-prov"}, sum, h("div", {class: "bh-chips"}, box));
  d.addEventListener("change", () => { arr.splice(0, arr.length, ...box.filter(l => l.firstChild.checked).map(l => l.firstChild.value)); sum.textContent = `${judul} (${arr.length})`; ubah(); });
  return d;
}
const provOpsi = Object.entries(PROV);
const blok = (judul, ik, ...isi) => h("section", {class: "bn-blok"}, h("h2", {class: "bh-judul"}, ikon(ik), judul), ...isi);
const kosongBox = (ik, teks, ...lain) => h("div", {class: "bh-kosong"}, ikon(ik), h("span", {teks}), ...lain);

/* ---------- tab 1: Koordalops dari Logbook ---------- */
const ANGKA = ["md", "hilang", "luka", "mengungsi_jiwa", "mengungsi_kk", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "luas_ha"];
const LABEL = {md: "Meninggal (jiwa)", hilang: "Hilang (jiwa)", luka: "Luka (jiwa)", mengungsi_jiwa: "Mengungsi (jiwa)", mengungsi_kk: "Mengungsi (KK)", rumah_rb: "Rumah rusak berat", rumah_rs: "Rumah rusak sedang",
  rumah_rr: "Rumah rusak ringan", rumah_terendam: "Rumah terendam", luas_ha: "Luas terbakar (ha)"};
const kartuDari = e => ({ikut: true, jenis: e.jenis, prov: e.prov, kab: e.kab || "", bs: e.baru ? "baru" : "pengkinian", ...Object.fromEntries(ANGKA.map(k => [k, str(e[k])])),
  status_darurat: e.status_darurat || "", pendampingan: e.pendampingan || "", kondisi: e.kondisi || "", detail: e.detail || ""});
const koordalops = {
  kunci: "rekap_koordalops_24", judul: "Koordalops (dari Logbook)", ik: "daftar",
  baru: () => ({sampai: wibHari(), laporan: "", kej: []}),
  dariIsi: i => ({sampai: i.sampai, laporan: str(i.laporan), kej: (i.kejadian || []).map(kartuDari)}),
  keIsi: s => ({sampai: s.sampai, laporan: n(s.laporan), kejadian: s.kej.filter(e => e.ikut).map(e => ({jenis: e.jenis, prov: e.prov, kab: e.kab, baru: e.bs === "baru",
    ...Object.fromEntries(ANGKA.map(k => [k, n(e[k])])), status_darurat: e.status_darurat, pendampingan: e.pendampingan, kondisi: e.kondisi, detail: e.detail}))}),
  bangun(s) {
    const isiKartu = h("div", {class: "bh-kartu-daftar"}), pes = h("p", {class: "bn-pesan", role: "status"});
    const lap = angka("Jumlah laporan kejadian", s, "laporan", {inputmode: "numeric"}), lapIn = lap.querySelector("input");
    const hit = () => { lapIn.placeholder = `Bawaan ${s.kej.filter(x => x.ikut).length}`; };
    let tok = 0;
    const kartu = e => h("section", {class: "bh-kartu"},
        h("div", {class: "bh-kartu-kepala"}, centang("Ikut laporan", e, "ikut", "ok", hit), h("strong", {teks: `${S.JENIS[e.jenis]}, ${[e.kab, PROV[e.prov]].filter(Boolean).join(", ")}`})),
        pilih("Jenis laporan", e, "bs", [["baru", "Kejadian baru"], ["pengkinian", "Pengkinian data"]]),
        h("div", {class: "bh-angka"}, ANGKA.map(k => angka(LABEL[k], e, k))),
        h("div", {class: "bn-baris"}, isian("Penetapan status", e, "status_darurat"), isian("Pendampingan BNPB", e, "pendampingan")),
        isian("Kondisi mutakhir", e, "kondisi", {rows: 3}, true), isian("Detail (sumber)", e, "detail"));
    const gambar = () => {
      const my = ++tok; hit();
      if (!s.kej.length) return isiKartu.replaceChildren(kosongBox("daftar", "Belum ada kejadian. Tekan Ambil dari Logbook untuk menarik entri periode 07.00 sampai 07.00 WIB.", h("a", {href: "/bnpb/logbook", teks: "Buka Logbook untuk mencatat kejadian"})));
      isiKartu.replaceChildren(); let i = 0;   // 10 kartu per frame
      const langkah = () => { if (my !== tok) return; isiKartu.append(...s.kej.slice(i, i + 10).map(kartu)); i += 10; if (i < s.kej.length) requestAnimationFrame(langkah); };
      langkah();
    };
    const ambil = h("button", {type: "button", class: "bn-tombol"}, ikon("unduh"), "Ambil dari Logbook");
    ambil.addEventListener("click", async () => {
      if (!s.sampai) { pes.textContent = "Isi tanggal laporan dulu."; pes.className = "bn-pesan galat"; return; }
      ambil.disabled = true; pes.textContent = "Mengambil entri Logbook…"; pes.className = "bn-pesan";
      const [r, sk] = await Promise.all([api("GET", "/api/logbook/hari?tgl=" + geser(s.sampai, -1)), api("GET", "/api/logbook/sk/aktif")]);
      ambil.disabled = false;
      if (!r.ok) { pes.textContent = r.s === 503 ? "Tabel logbook belum dibuat di server." : r.j.galat || `Logbook belum bisa dimuat (${r.s}).`; pes.className = "bn-pesan galat"; return; }
      const d = S.dariLogbook(r.j.entri || r.j.daftar || [], sk.ok ? sk.j.sk || [] : [], s.sampai);
      s.kej = d.kejadian.map(kartuDari); s.laporan = ""; lapIn.value = "";
      pes.textContent = d.kejadian.length ? `${d.kejadian.length} kejadian dari Logbook. Sunting seperlunya, hapus centang bagian yang tidak ikut.` : "Logbook kosong untuk periode ini."; pes.className = "bn-pesan" + (d.kejadian.length ? " ok" : " galat");
      requestAnimationFrame(() => gambar()); ubah();
    });
    const tg = isian("Tanggal laporan (periode 07.00 WIB hari sebelumnya s.d. 07.00 WIB tanggal ini)", s, "sampai", {type: "date", max: geser(wibHari(), 1)});
    gambar();
    return [blok("Periode laporan", "kalender", h("div", {class: "bn-baris"}, tg, lap), h("div", {class: "bh-aksi"}, ambil), pes), isiKartu];
  },
};

/* ---------- tab 2: BMKG pagi ---------- */
const bmkg = {
  kunci: "bmkg_pagi", judul: "BMKG pagi", ik: "cuaca",
  baru: () => { const t = wibHari(); return {tanggal: t, jam: "06.00", pm: Array.from({length: 10}, () => ({stasiun: "", nilai: ""})), mulai: t, selesai: geser(t, 3), hujan: [], lebat: [], angin: []}; },
  dariIsi: i => ({tanggal: i.tanggal, jam: i.jam, pm: i.pm.map(x => ({stasiun: x.stasiun, nilai: str(x.nilai)})), mulai: i.periode.mulai, selesai: i.periode.selesai, hujan: [...i.hujan], lebat: [...i.lebat], angin: [...i.angin]}),
  keIsi: s => ({tanggal: s.tanggal, jam: s.jam, pm: s.pm.filter(x => x.stasiun.trim() || String(x.nilai).trim()).map(x => ({stasiun: x.stasiun, nilai: n(x.nilai)})), periode: {mulai: s.mulai, selesai: s.selesai}, hujan: s.hujan, lebat: s.lebat, angin: s.angin}),
  bangun(s) {
    const dl = h("datalist", {id: "bh-stasiun"}, S.STASIUN.map(v => h("option", {value: v})));
    const pm = daftar(s.pm, x => {
      const kat = h("span", {class: "bh-kat"}), pasang = () => { const v = n(x.nilai); kat.textContent = typeof v === "number" ? S.kategoriPm(v) : ""; };
      const nil = angka("PM2.5 (µg/m³)", x, "nilai"); nil.querySelector("input").addEventListener("input", pasang); pasang();
      return [isian("Stasiun", x, "stasiun", {list: "bh-stasiun"}), nil, kat];
    }, () => ({stasiun: "", nilai: ""}), "Tambah stasiun", 0, 15);
    return [blok("Waktu", "kalender", h("div", {class: "bn-baris"}, isian("Tanggal", s, "tanggal", {type: "date"}), isian("Jam (WIB)", s, "jam", {placeholder: "06.00"}))),
      blok("PM2.5 tertinggi (5 sampai 15 stasiun)", "sinyal", dl, pm, h("p", {class: "bh-cat", teks: "Kategori dihitung otomatis dari nilai (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya)."})),
      blok("Cuaca dan awan", "cuaca", h("div", {class: "bn-baris"}, isian("Periode mulai", s, "mulai", {type: "date"}), isian("Periode selesai", s, "selesai", {type: "date"})),
        provBanyak("Hujan intensitas sedang", s.hujan), provBanyak("Siaga hujan lebat sampai sangat lebat", s.lebat), provBanyak("Angin kencang", s.angin))];
  },
};

/* ---------- tab 3: PVMBG pagi ---------- */
let namaGunung = null;
const pvmbg = {
  kunci: "pvmbg_pagi", judul: "PVMBG pagi", ik: "gunungapi",
  baru: () => ({tanggal: wibHari(), jam: "06.00", waspada: "", normal: "", gunung: []}),
  dariIsi: i => ({tanggal: i.tanggal, jam: i.jam, waspada: str(i.level.waspada), normal: str(i.level.normal), gunung: i.gunung.map(g => ({nama: g.nama, level: g.level,
    visual: g.visual.map(t => ({t})), rekom: g.rekom.map(t => ({t})), gempa: g.gempa.map(q => ({jumlah: str(q.jumlah), jenis: q.jenis, rincian: q.rincian}))}))}),
  keIsi: s => ({tanggal: s.tanggal, jam: s.jam, level: {awas: s.gunung.filter(g => g.level === "Awas").length, siaga: s.gunung.filter(g => g.level === "Siaga").length, waspada: n(s.waspada), normal: n(s.normal)},
    gunung: s.gunung.map(g => ({nama: g.nama, level: g.level, visual: g.visual.map(x => x.t), rekom: g.rekom.map(x => x.t), gempa: g.gempa.map(q => ({jumlah: n(q.jumlah), jenis: q.jenis, rincian: q.rincian}))}))}),
  bangun(s) {
    const dl = h("datalist", {id: "bh-gunung"});
    if (namaGunung) dl.append(...namaGunung.map(v => h("option", {value: v})));
    else fetch("/gunungapi/data/gunung.json").then(r => r.json()).then(j => { namaGunung = Object.keys(j).sort(); dl.append(...namaGunung.map(v => h("option", {value: v}))); }).catch(() => {});
    const hit = h("p", {class: "bh-cat"}), hitung = () => { hit.textContent = `Dihitung dari daftar di bawah: Level IV (Awas) ${s.gunung.filter(g => g.level === "Awas").length}, Level III (Siaga) ${s.gunung.filter(g => g.level === "Siaga").length}.`; };
    const teks = (judul, arr) => daftar(arr, x => isian(judul, x, "t", {}, true), () => ({t: ""}), "Tambah baris " + judul.toLowerCase(), 1, 15);
    const gunung = daftar(s.gunung, g => h("div", {class: "bh-kartu"},
      h("div", {class: "bn-baris"}, isian("Nama gunung api", g, "nama", {list: "bh-gunung"}), pilih("Level", g, "level", [["Siaga", "Level III (Siaga)"], ["Awas", "Level IV (Awas)"]], null, hitung)),
      h("h3", {teks: "Visual"}), teks("Visual", g.visual),
      h("h3", {teks: "Kegempaan"}), daftar(g.gempa, q => h("div", {class: "bh-gempa"}, angka("Jumlah kali", q, "jumlah", {inputmode: "numeric"}), pilih("Jenis gempa", q, "jenis", S.JENIS_GEMPA.map(v => [v, v]), "Pilih jenis"), isian("Rincian (amplitudo, lama gempa)", q, "rincian")),
        () => ({jumlah: "", jenis: "", rincian: ""}), "Tambah baris kegempaan", 0, 15),
      h("h3", {teks: "Rekomendasi"}), teks("Rekomendasi", g.rekom)),
      () => ({nama: "", level: "Siaga", visual: [{t: ""}], rekom: [{t: ""}], gempa: []}), "Tambah gunung api Level III/IV");
    gunung.addEventListener("click", () => setTimeout(hitung)); hitung();
    return [blok("Waktu dan jumlah gunung api", "kalender", h("div", {class: "bn-baris"}, isian("Tanggal", s, "tanggal", {type: "date"}), isian("Jam (WIB)", s, "jam", {placeholder: "06.00"}),
      angka("Jumlah Level II (Waspada)", s, "waspada", {inputmode: "numeric"}), angka("Jumlah Level I (Normal)", s, "normal", {inputmode: "numeric"})), hit),
      blok("Laporan khusus Level III dan IV", "gunungapi", dl, gunung)];
  },
};

/* ---------- tab 4: Satgas pemadaman ---------- */
const INT = S.INTENSITAS.map(v => [v, v]);
const satgas = {
  kunci: "satgas", judul: "Satgas pemadaman", ik: "karhutla",
  baru: () => { const t = wibHari(); return {tl: t, tk: geser(t, -1), personel: S.PRIORITAS.map(prov => ({prov, jumlah: ""})), armada: S.PRIORITAS.map(prov => ({prov, patroli: "", wb: "", ikn: false})),
    omc: S.PRIORITAS.map(prov => ({prov, sortie: "", nacl: "", dryice: "", sasaran: "", hujan: "", hujan_lokasi: ""})), pemilik: {}}; },
  dariIsi: i => ({tl: i.tanggal_laporan, tk: i.tanggal_kegiatan, personel: i.personel.map(x => ({prov: x.prov, jumlah: str(x.jumlah)})),
    armada: i.armada.map(x => ({prov: x.prov, ikn: !!x.ikn, patroli: str(x.patroli || ""), wb: str(x.wb || "")})),
    omc: i.omc.map(x => ({prov: x.prov, sortie: str(x.sortie), nacl: str(x.nacl || ""), dryice: str(x.dryice || ""), sasaran: x.sasaran.join(", "), hujan: x.hujan?.intensitas ?? x.hujan ?? "", hujan_lokasi: x.hujan_lokasi.join(", ")})),
    pemilik: Object.fromEntries(Object.entries(i.pemilik || {}).map(([k, v]) => [k, str(v)]))}),
  keIsi: s => ({tanggal_laporan: s.tl, tanggal_kegiatan: s.tk,
    personel: s.personel.filter(x => String(x.jumlah).trim()).map(x => ({prov: x.prov, jumlah: n(x.jumlah)})),
    armada: s.armada.filter(x => String(x.patroli).trim() || String(x.wb).trim()).map(x => ({prov: x.prov, ikn: x.ikn, patroli: n(x.patroli), wb: n(x.wb)})),
    omc: s.omc.filter(x => ["sortie", "nacl", "dryice", "sasaran", "hujan", "hujan_lokasi"].some(k => String(x[k]).trim())).map(x => ({prov: x.prov, sortie: n(x.sortie), nacl: n(x.nacl), dryice: n(x.dryice),
      sasaran: pecah(x.sasaran), hujan: x.hujan ? {intensitas: x.hujan} : null, hujan_lokasi: pecah(x.hujan_lokasi)})),
    pemilik: Object.fromEntries(S.PEMILIK.map(k => [k, n(s.pemilik[k])]))}),
  bangun(s) {
    const pv = (x, balik) => pilih("Provinsi", x, "prov", provOpsi, "Pilih provinsi", balik);
    const personel = daftar(s.personel, x => [pv(x), angka("Personel (orang)", x, "jumlah", {inputmode: "numeric"})], () => ({prov: "", jumlah: ""}), "Tambah provinsi", 0, 38);
    const armada = daftar(s.armada, x => { const ikn = centang("Di IKN", x, "ikn", "pin"); const atur = () => { ikn.hidden = x.prov !== "64"; if (ikn.hidden) { x.ikn = false; ikn.firstChild.checked = false; } }; atur();
      return [pv(x, atur), angka("Patroli udara (unit)", x, "patroli", {inputmode: "numeric"}), angka("Helikopter WB (unit)", x, "wb", {inputmode: "numeric"}), ikn]; }, () => ({prov: "", patroli: "", wb: "", ikn: false}), "Tambah baris armada", 0, 40);
    const omc = daftar(s.omc, x => h("div", {class: "bh-omc"}, pv(x), angka("Sortie", x, "sortie", {inputmode: "numeric"}), angka("NaCl (kg)", x, "nacl"), angka("Dry ice (kg)", x, "dryice"),
      isian("Sasaran kab/kota (pisah koma)", x, "sasaran", {placeholder: "Katingan, Kapuas"}), pilih("Hujan dilaporkan", x, "hujan", INT, "Tidak ada hujan dilaporkan"), isian("Lokasi hujan (pisah koma)", x, "hujan_lokasi")),
      () => ({prov: "", sortie: "", nacl: "", dryice: "", sasaran: "", hujan: "", hujan_lokasi: ""}), "Tambah provinsi OMC", 0, 38);
    return [blok("Tanggal", "kalender", h("div", {class: "bn-baris"}, isian("Tanggal laporan", s, "tl", {type: "date"}), isian("Tanggal kegiatan", s, "tk", {type: "date"}))),
      blok("Kekuatan personel per provinsi", "personel", personel), blok("Armada udara per provinsi", "karhutla", armada),
      blok("Operasi modifikasi cuaca per provinsi", "cuaca", omc, h("p", {class: "bh-cat", teks: "Baris OMC yang dikosongkan seluruhnya tidak ikut laporan. Isi sortie 0 bila OMC tidak dilaksanakan."})),
      blok("Armada per instansi (opsional)", "logistik", h("div", {class: "bh-angka"}, S.PEMILIK.map(k => angka(k + " (unit)", s.pemilik, k, {inputmode: "numeric"}))))];
  },
};

/* ---------- kerangka: tab, pratinjau, kirim ---------- */
const TAB = [koordalops, bmkg, pvmbg, satgas];
const el = {};
function kartuMasuk(s) {
  app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
    h("p", {class: "bh-p", teks: s === 403 ? "Akunmu belum berhak mengisi bahan laporan. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan yang boleh. Minta Super Admin menambah perannya." : "Bahan laporan hanya untuk staf Pusdalops BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
    h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname), teks: "Masuk staf"})));
}
const pesan = (t, ok) => { el.pesan.textContent = t; el.pesan.className = "bn-pesan " + (ok ? "ok" : "galat"); };
function pratinjau() {
  const r = S.susun(aktif.kunci, aktif.keIsi(aktif.s));
  const tampil = r.galat && aktif.sentuh;   // keadaan awal: petunjuk netral (placeholder CSS), galat merah hanya sesudah pengguna mengisi atau menekan Kirim
  el.galat.textContent = tampil ? r.galat : ""; el.galat.hidden = !tampil;
  el.teks.textContent = r.galat ? "" : r.teks;
  el.tgl.textContent = r.galat ? "" : `Tanggal laporan: ${tglId(r.tanggal)}`;
}
function pasang(t) {
  aktif = t; t.s ||= t.baru();
  const my = ++pasangKe; el.form.setAttribute("aria-busy", "true"); el.pesan.textContent = ""; el.pesan.className = "bn-pesan";
  /* chrome tab urgent; bangun form + pratinjau ditunda dua frame (setTimeout 120 jaring bila tab tersembunyi) */
  let jalan = false; const kerja = () => { if (jalan || my !== pasangKe) return; jalan = true; el.form.replaceChildren(...t.bangun(t.s)); el.form.removeAttribute("aria-busy"); pratinjau(); };
  requestAnimationFrame(() => requestAnimationFrame(kerja)); setTimeout(kerja, 120);
}
let pasangKe = 0;
function isiKembali(isi) { aktif.sentuh = true; aktif.s = aktif.dariIsi(isi); pasang(aktif); }
async function salinTerakhir() {
  el.salin.disabled = true; pesan("Mengambil isian terakhir…", true);
  const r = await api("GET", "/api/wa/form/terakhir?kunci=" + aktif.kunci); el.salin.disabled = false;
  if (!r.ok) return pesan(r.j.galat || `Isian terakhir belum bisa dimuat (${r.s}).`, false);
  if (!r.j.isi) return pesan("Belum ada isian terakhir untuk jenis ini.", false);
  const info = [r.j.waktu && tglId(String(r.j.waktu).slice(0, 10))].filter(Boolean).join(", ");
  try { isiKembali(r.j.isi); pesan(`Isian terakhir disalin${info ? " (" + info + ")" : ""}. Sesuaikan tanggal dan angkanya.`, true); }
  catch (e) { pesan("Isian terakhir tidak cocok dengan bentuk form sekarang.", false); }
}
async function kirim() {
  const r = S.susun(aktif.kunci, aktif.keIsi(aktif.s));
  if (r.galat) { aktif.sentuh = true; pratinjau(); return pesan("Perbaiki isian dulu: " + r.galat, false); }
  el.kirim.disabled = true; pesan("Mengirim…", true);
  const k = await api("POST", "/api/wa/form", {kunci: aktif.kunci, isi: r.isi}); el.kirim.disabled = false;
  if (!k.ok) return pesan(k.j.galat || `Gagal mengirim (${k.s}).`, false);
  pesan(`Masuk sebagai bahan ${tglId(k.j.tanggal || r.tanggal)}. Bot laporan memakai bahan TERBARU per jenis, jadi kirim ulang bila ada koreksi.`, true);
}

/* ---------- dummy (Super Admin saja): isi form tab yang dibuka dengan isian contoh / kosongkan. Tidak menulis D1. ---------- */
async function tombolDummy(wadah) {
  return; // tombol dummy 🧪/🧹 disembunyikan atas permintaan pemilik 11 Nov 2026 (semua proyek); pulihkan: hapus baris return ini
  const r = await api("GET", "/api/akademisi/saya");
  if (!r.ok || !r.j.super) return;
  wadah.append(h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "isi", title: "Isi form tab ini dengan isian contoh (angka 3 Nov 2026)", "aria-label": "Isi data dummy"}, "🧪"),
    h("button", {class: "ad-tombol ad-bulat", type: "button", "data-dummy": "hapus", title: "Kosongkan form tab ini", "aria-label": "Kosongkan form"}, "🧹"));
  wadah.addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (!b) return;
    if (b.dataset.dummy === "isi") isiKembali(CONTOH[aktif.kunci]); else { aktif.s = aktif.baru(); pasang(aktif); } });
}

async function mulai() {
  const cek = await api("GET", "/api/wa/form/terakhir?kunci=" + koordalops.kunci);
  if (cek.s === 401 || cek.s === 403) return kartuMasuk(cek.s);
  const aksi = h("div", {class: "bn-aksi"});
  el.form = h("div", {class: "bh-form"});
  el.galat = h("p", {class: "bn-pesan galat", role: "alert", hidden: true}); el.teks = h("pre", {class: "bh-wa"}); el.tgl = h("p", {class: "bh-cat"});
  el.pesan = h("p", {class: "bn-pesan", role: "status"});
  el.salin = h("button", {type: "button", class: "bn-tombol sekunder"}, ikon("lanjut"), "Salin isian terakhir");
  el.kirim = h("button", {type: "button", class: "bn-tombol"}, ikon("simpan"), "Kirim ke kotak masuk");
  el.salin.addEventListener("click", salinTerakhir); el.kirim.addEventListener("click", kirim);
  const seg = h("div", {class: "bh-seg", role: "radiogroup", "aria-label": "Jenis bahan"}, TAB.map((t, i) => { const r = h("input", {type: "radio", name: "tab", value: t.kunci}); r.checked = i === 0; return h("label", null, r, ikon(t.ik), t.judul); }));
  seg.addEventListener("change", e => { const t = TAB.find(x => x.kunci === e.target.value); if (t && t !== aktif) pasang(t); });
  const panel = h("aside", {class: "bh-panel"}, h("section", {class: "bn-blok"}, h("h2", {class: "bh-judul"}, ikon("simpan"), "Pratinjau teks WA"), el.galat, el.teks, el.tgl,
    h("div", {class: "bh-aksi"}, el.salin, el.kirim), el.pesan));
  app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Bahan Laporan Harian"})),
    h("p", {class: "bh-p", teks: "Isi lewat form, teks WA baku tersusun otomatis di kanan. Bot laporan membaca kiriman terbaru per jenis."}), seg, h("div", {class: "bh-kolom"}, el.form, panel));
  tombolDummy(aksi);
  pasang(koordalops);
}
mulai();
