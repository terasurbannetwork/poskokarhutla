/* Siklus Bencana F5: daftar Renkon (DS 3.9) dan satu Renkon (DS 3.10). Rute: /api/siklus/renkon, /renkon/:sid, /renkon/:sid/asumsi, /renkon/:sid/status (src/siklus_renkon.js).
   Kedaluwarsa dan sisa hari datang dari server saat dibaca (ADR-09), tidak disimpan. Usulan angka dari rumus Perka 7/2008 hanya di samping isian staf: Terima menulis isian, Tolak tidak mengubah apa pun.
   Tanpa data = "menunggu" atau "stok belum tercatat", bukan 0. Chrome urgent, isi berat lewat nanti() (inti.js). */
import {h, ik, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, pilihan, tombol, tanya, toast, pil, tip, K, namaJenis, namaProv, wilayah, angka, tgl, tglWib, peran, penjaga} from "./inti.js";

const G = globalThis, MENUNGGU = "menunggu";
export const STATUS_RK = {persiapan: ["Persiapan", "mata", "Renkon disusun, belum masuk pelaksanaan"], pelaksanaan: ["Pelaksanaan", "palu", "Penyusunan berjalan"], finalisasi: ["Finalisasi", "timbangan", "Menunggu penetapan"],
  ditetapkan: ["Ditetapkan", "centang", "Nomor penetapan tercatat"], berlaku: ["Berlaku", "perisai", "Berlaku 36 bulan sejak ditetapkan (Perban 2/2023 Pasal 21)"], dimutakhirkan: ["Dimutakhirkan", "panah", "Sudah diganti versi yang lebih baru"]};
export const URUT_RK = ["persiapan", "pelaksanaan", "finalisasi", "ditetapkan", "berlaku", "dimutakhirkan"];
export const ASPEK = [["lingkungan", "Lingkungan"], ["kependudukan", "Kependudukan"], ["ekonomi", "Ekonomi"], ["infrastruktur", "Infrastruktur"], ["layanan_sipil", "Layanan sipil"]];   // Perban 2/2023 Pasal 7 ayat 5
const YAKIN = ["resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "hipotesis", "menunggu"];
const SATUAN_KOMP = {penampungan: "Penampungan", beras: "Beras", makan: "Makan", energi: "Energi", air_bersih: "Air bersih", air_minum: "Air minum", jamban: "Jamban", tempat_sampah: "Tempat sampah", sabun_mandi: "Sabun mandi", sabun_cuci: "Sabun cuci"};
const BARANG = {beras: "Beras", air_minum: "Air minum"};
const bilangan = x => typeof x === "number" && Number.isFinite(x);
const ang = n => angka(n) ?? MENUNGGU;

/* ---------- fungsi murni (diuji tanpa peramban) ---------- */
export const statusBerikut = s => URUT_RK[URUT_RK.indexOf(s) + 1] ?? null;
export const sisaTeks = r => r?.kesegaran?.sisa == null ? null : r.kesegaran.sisa < 0 ? `lewat ${angka(-r.kesegaran.sisa)} hari` : `${angka(r.kesegaran.sisa)} hari`;
/* kelompok segmen daftar: persiapan = tiga status penyusunan; berlaku = ditetapkan atau berlaku yang belum kedaluwarsa */
export function cocokKelompok(r, k) {
  if (k === "semua") return true;
  if (k === "persiapan") return ["persiapan", "pelaksanaan", "finalisasi"].includes(r.status);
  if (k === "kedaluwarsa") return r.kedaluwarsa === true;
  if (k === "berlaku") return ["ditetapkan", "berlaku"].includes(r.status) && !r.kedaluwarsa;
  return r.status === k;
}
/* usulan sistem untuk aspek kependudukan: jiwa dari kerangka respon, hanya bila belum sama dengan isian staf; tidak pernah menimpa */
export function usulanAspek(renkon) {
  const jiwa = renkon?.kerangka?.jiwa, ada = renkon?.asumsi?.kependudukan;
  if (!bilangan(jiwa)) return null;
  return ada && Number(ada.nilai) === jiwa ? null : {aspek: "kependudukan", nilai: jiwa, sumber: "Usulan sistem dari kerangka respon", yakin: "estimasi-model"};
}
/* PERHATIAN: kolom asumsi di server diganti utuh, jadi isian satu aspek dikirim bersama aspek lain yang sudah ada */
export function gabungAsumsi(asumsi, aspek, isian) {
  const lama = Object.fromEntries(Object.entries(asumsi ?? {}).filter(([, a]) => a && a.nilai != null).map(([k, a]) => [k, {nilai: a.nilai, sumber: a.sumber, waktu: a.waktu ?? null, yakin: a.yakin}]));
  return {...lama, [aspek]: {nilai: isian.nilai, sumber: isian.sumber, waktu: isian.waktu || null, yakin: isian.yakin}};
}
export const angkaAtauTeks = v => { const t = String(v ?? "").trim(); if (t === "") return null; const n = Number(t); return Number.isFinite(n) && /^\d+(\.\d+)?$/.test(t) ? n : t; };

export const statusPil = s => { const x = STATUS_RK[s] ?? [String(s), "mata", ""]; return h("span", {class: "sk-fase", "data-f": s, title: x[2]}, ik(x[1], 14), x[0]); };
const gagalToast = r => toast(r.status === 429 ? "Terlalu sering. Tunggu sebentar lalu coba lagi." : r.status === 403 ? "Peran kamu belum berhak untuk aksi ini" : (typeof r.j?.galat === "string" && r.j.galat) || "Gagal. Coba lagi.");

export async function buka(isi, sk) {
  const m = /^\/siklus\/renkon\/([0-9a-f]{16})$/.exec(location.pathname.replace(/\/+$/, ""));
  return m ? detail(isi, sk, m[1]) : daftar(isi, sk);
}

/* ================================================================ daftar */
async function daftar(isi, sk) {
  let prov0 = null; try { prov0 = localStorage.getItem("sk-prov"); } catch (e) { /* penyimpanan diblokir */ }
  // ponytail: rute daftar wajib prov; bawaan 32 (provinsi contoh dummy) sampai ada pemilih wilayah staf dari sesi
  const S = {prov: new URLSearchParams(location.search).get("prov") || prov0 || "32", kel: "semua", bencana: "", baris: null, terpotong: false}, pj = penjaga(), P = {};
  sk.periode = () => ({kab4: null});
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"}), aksi = h("span", {});
  const kart = kartu({ey: [ik("timbangan", 12), "Renkon"], judul: ["Renkon ", hl("menunggu"), " data"], kanan: aksi, isi: [ctl, hasil], id: "daftar"}), judul = kart.querySelector("h3");
  const optProv = Object.entries(K.provinsi ?? {}).sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => [k, n]), optB = [["", "Semua bencana"], ...Object.keys(K.jenis ?? {}).map(j => [j, namaJenis(j)])];
  ctl.append(seg([["semua", "Semua", "semua"], ["persiapan", "Persiapan", "mata"], ["berlaku", "Berlaku", "perisai"], ["kedaluwarsa", "Kedaluwarsa", "silang"], ["dimutakhirkan", "Dimutakhirkan", "panah"]], S.kel, v => { S.kel = v; gambar(); }, "Status renkon"),
    h("div", {class: "sk-baris"}, pilihan(optB, S.bencana, v => { S.bencana = v; muat(); }, "Bencana"), pilihan(optProv, S.prov, v => { S.prov = v; try { localStorage.setItem("sk-prov", v); } catch (e) { /* abaikan */ } muat(); }, "Wilayah")));

  function gambar() {
    const semua = S.baris ?? [], rows = semua.filter(r => cocokKelompok(r, S.kel)), n = k => semua.filter(r => cocokKelompok(r, k)).length, dekat = semua.filter(r => r.kesegaran?.status === "segera_habis").length;
    judul.replaceChildren(...(S.baris == null ? ["Renkon ", hl("menunggu"), " data"] : semua.length ? [hl(angka(n("berlaku"))), " berlaku, ", hl(angka(n("kedaluwarsa"))), " kedaluwarsa, ", hl(angka(dekat)), " berakhir dalam 90 hari"] : ["Belum ada ", hl("renkon"), ` di ${namaProv(S.prov)}`]));
    if (!rows.length) return kosongkan(hasil).append(kead("kosong", {teks: semua.length ? "Tidak ada renkon dengan status ini. Ubah status." : `Belum ada rencana kontingensi di ${namaProv(S.prov)}`}));
    const t = h("tbody", {});
    for (const r of rows) {
      const href = `/siklus/renkon/${r.id}`, s = r.kesegaran ?? {}, sisa = sisaTeks(r);
      const tr = h("tr", {class: "klik", "data-tip": tip(r.judul, ["Versi", String(r.versi)], ["Penetapan", r.no_penetapan ?? "belum ditetapkan"])},
        h("td", {}, h("a", {href}, r.judul), r.dummy ? h("span", {class: "sk-contoh", title: "Baris dummy untuk contoh layar"}, "contoh") : null), h("td", {}, namaJenis(r.bencana)), h("td", {}, r.kab4 ? wilayah(r.kab4) : namaProv(r.prov)),
        h("td", {class: "t"}, statusPil(r.status), r.kedaluwarsa ? [" ", h("span", {class: "sk-fase", "data-f": "dibatalkan", title: "Lewat 36 bulan sejak ditetapkan"}, ik("silang", 14), "Kedaluwarsa")] : null),
        h("td", {class: "t"}, s.berlaku_sampai ? tgl(s.berlaku_sampai) : [h("span", {}, MENUNGGU), " ", pil("menunggu", {ditunggu: "penetapan"})]),
        h("td", {class: "t"}, sisa ? h("span", {class: "sk-sisa", "data-s": s.status}, sisa) : MENUNGGU),
        h("td", {class: "t"}, h("span", {}, "dihitung di rincian"), " ", pil("menunggu", {ditunggu: "stok LogPal"})));
      tr.addEventListener("click", e => { if (e.target.closest("a,button")) return; tr.setAttribute("aria-current", "true"); G.nanti(() => { location.href = href; }); });
      t.append(tr);
    }
    const th = (a, d) => h("th", {title: d}, a);
    kosongkan(hasil).append(h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Judul", "Judul rencana kontingensi"), th("Bencana", "Jenis bencana"), th("Wilayah", "Kabupaten atau kota; kosong berarti tingkat provinsi"), th("Status", "Status penyusunan; kedaluwarsa dihitung saat halaman dibuka"),
      th("Berlaku sampai", "Tanggal penetapan ditambah 36 bulan (Perban 2/2023 Pasal 21 ayat 1)"), th("Hari tersisa", "Dihitung saat halaman dibuka, bukan disimpan"), th("Kesenjangan", "Stok LogPal dan personel dibaca di rincian; stok belum tercatat tampil menunggu"))), t)),
      ...(S.terpotong ? [para("Daftar dipotong pada 100 renkon pertama. Persempit dengan bencana.")] : []));
  }
  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    const r = await api("/api/siklus/renkon?" + new URLSearchParams({prov: S.prov, ...(S.bencana ? {bencana: S.bencana} : {})}));
    if (!pj.terbaru(n)) return;
    if (!r.ok) { S.baris = null; return kosongkan(hasil).append(kead_dari(r, muat)); }
    S.baris = r.j?.baris ?? []; S.terpotong = r.j?.terpotong === true; gambar();
  }
  peran().then(p => {
    if (!(p.pd || p.ko || p.sa)) return;
    aksi.replaceChildren(tombol("Renkon baru", "utama", async () => {
      const v = await tanya({judul: "Renkon baru", teks: `Provinsi ${namaProv(S.prov)}. Kosongkan kabupaten untuk tingkat provinsi.`, ya: "Buat renkon", kolom: [{nama: "judul", label: "Judul", wajib: true, maks: 200}, {nama: "bencana", label: "Bencana", jenis: "pilih", opsi: optB.slice(1)}, {nama: "kab4", label: "Kode kabupaten 4 digit (opsional)", maks: 4}]});
      if (!v) return;
      const r = await api("/api/siklus/renkon", {metode: "POST", badan: {judul: v.judul, bencana: v.bencana, prov: S.prov, kab4: v.kab4 || null}});
      if (!r.ok) return gagalToast(r);
      location.href = `/siklus/renkon/${r.j.id}`;
    }, "tambah"));
  });
  isi.replaceChildren(kart); muat();
}

/* ================================================================ detail */
async function detail(isi, sk, id) {
  const S = {tab: "asumsi", d: null, p: {}}, pj = penjaga(); sk.periode = () => ({kab4: S.d?.renkon?.kab4 ?? null});
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"}), aksi = h("span", {class: "sk-aksi"});
  const kart = kartu({ey: [ik("timbangan", 12), "Renkon"], judul: ["Renkon ", hl("menunggu"), " data"], kanan: aksi, isi: [ctl, hasil], id: "renkon"}), judul = kart.querySelector("h3");
  const bisaSunting = () => (S.p.pd || S.p.ko || S.p.sa) && ["persiapan", "pelaksanaan", "finalisasi"].includes(S.d?.renkon?.status);

  async function kirimAsumsi(badan, pesan) {
    const r = await api(`/api/siklus/renkon/${id}/asumsi`, {metode: "POST", badan}); if (!r.ok) return gagalToast(r);
    toast(pesan); muat();
  }
  async function ubahAspek(aspek, awal) {
    const a = S.d.renkon.asumsi?.[aspek], v = await tanya({judul: `Asumsi ${ASPEK.find(x => x[0] === aspek)?.[1].toLowerCase()}`, teks: "Isian staf. Sumber dan keyakinan wajib tertulis.", kolom: [
      {nama: "nilai", label: "Nilai (angka atau kalimat pendek)", wajib: true, nilai: awal?.nilai ?? a?.nilai ?? "", maks: 300}, {nama: "sumber", label: "Sumber", wajib: true, nilai: awal?.sumber ?? a?.sumber ?? "", maks: 120},
      {nama: "yakin", label: "Keyakinan", jenis: "pilih", opsi: YAKIN.map(y => [y, K.label?.[y]?.kata ?? y])}, {nama: "waktu", label: "Tanggal data", jenis: "tgl", nilai: a?.waktu ?? tglWib()}]});
    if (!v) return;
    kirimAsumsi({asumsi: gabungAsumsi(S.d.renkon.asumsi, aspek, {nilai: angkaAtauTeks(v.nilai), sumber: v.sumber, waktu: v.waktu, yakin: v.yakin})}, "Asumsi tersimpan");
  }
  function tabAsumsi() {
    const r = S.d.renkon, u = usulanAspek(r), edit = bisaSunting(), t = h("tbody", {});
    for (const [k, nama] of ASPEK) {
      const a = r.asumsi?.[k];
      t.append(h("tr", {}, h("td", {}, nama), h("td", {}, a ? (bilangan(a.nilai) ? ang(a.nilai) : String(a.nilai)) : "belum diisi"), h("td", {}, a?.sumber ?? "belum tertulis"), h("td", {class: "t"}, a?.waktu ? tgl(a.waktu) : MENUNGGU),
        h("td", {class: "t"}, a ? pil(a.yakin, {sumber: a.sumber, waktu: a.waktu ?? "belum tertulis"}) : pil("menunggu", {ditunggu: "isian staf"})), h("td", {class: "t"}, edit ? tombol("Isi", "biasa", () => ubahAspek(k), "tambah", `Isi asumsi ${nama.toLowerCase()}`) : null)));
    }
    const th = (a, d) => h("th", {title: d}, a);
    const blok = [wadah("Asumsi dampak lima aspek", h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Aspek", "Lima aspek menurut Perban 2/2023 Pasal 7 ayat 5"), th("Isian staf", "Nilai yang ditulis staf"), th("Sumber", "Sumber yang ditulis staf"), th("Tanggal", "Tanggal data"), th("Keyakinan", "Label keyakinan isian"), th("", "Isi atau ubah"))), t)))];
    if (u) {
      const tolak = sessionStorage.getItem("sk-tolak-" + id) === String(u.nilai);
      blok.push(wadah("Usulan dari data", para(tolak ? `Usulan ${ang(u.nilai)} jiwa ditolak pada sesi ini. Isian staf tidak berubah.` : `Kerangka respon menulis ${ang(u.nilai)} jiwa. Isian kependudukan sekarang ${r.asumsi?.kependudukan ? ang(r.asumsi.kependudukan.nilai) : "belum diisi"}. Usulan tidak menimpa isian tanpa persetujuan staf.`), " ", pil(u.yakin),
        edit && !tolak ? h("div", {class: "sk-aksi"}, tombol("Terima", "utama", () => kirimAsumsi({asumsi: gabungAsumsi(r.asumsi, "kependudukan", {nilai: u.nilai, sumber: u.sumber, waktu: tglWib(), yakin: u.yakin})}, "Usulan diterima dan ditulis ke isian"), "centang"),
          tombol("Ubah", "biasa", () => ubahAspek("kependudukan", u), "palu"), tombol("Tolak", "biasa", () => { try { sessionStorage.setItem("sk-tolak-" + id, String(u.nilai)); } catch (e) { /* abaikan */ } toast("Usulan ditolak. Isian staf tidak berubah."); gambar(); }, "silang")) : null));
    }
    return blok;
  }
  function tabKerangka() {
    const U = S.d.usulan ?? {}, r = S.d.renkon;
    if (U.status !== "usulan") return [wadah("Kebutuhan dasar Perka 7/2008", kead("kosong", {teks: `Kebutuhan dasar menunggu: ${U.alasan ?? "jiwa dan hari belum diisi"}`}), pil("menunggu", {ditunggu: "jiwa dan hari"}),
      bisaSunting() ? tombol("Isi kerangka", "utama", isiKerangka, "tambah") : null)];
    const t = h("tbody", {});
    for (const [k, nama] of Object.entries(SATUAN_KOMP)) {
      const c = U.komponen?.[k], sp = U.sphere?.[k];
      t.append(h("tr", {}, h("td", {}, nama), h("td", {class: "num"}, bilangan(c?.nilai) ? ang(c.nilai) : MENUNGGU), h("td", {}, c?.satuan ?? ""), h("td", {class: "num"}, sp ? ang(sp.nilai) : "tidak ada"),
        h("td", {class: "t"}, bilangan(c?.nilai) ? pil(U.yakin) : pil("menunggu", {ditunggu: "jumlah keluarga"}))));
    }
    const th = (a, d) => h("th", {title: d}, a);
    return [wadah(`Kebutuhan dasar Perka 7/2008 untuk ${ang(U.jiwa)} jiwa selama ${ang(U.hari)} hari`, h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Komponen", "Standar kebutuhan dasar Perka 7/2008"), th("Kebutuhan", "Usulan hitung, bukan isian staf"), th("Satuan", "Satuan kebutuhan"),
      th("Sphere 2018", "Pembanding Sphere 2018, tidak menggantikan Perka 7/2008 (hipotesis)"), th("Keyakinan", "Label keyakinan kebutuhan"))), t)), para(U.sphere?.catatan ?? ""), bisaSunting() ? tombol("Ubah kerangka", "biasa", isiKerangka, "palu") : null, para(`Kerangka tersimpan: ${r.kerangka ? `${ang(r.kerangka.jiwa)} jiwa, ${ang(r.kerangka.hari)} hari, ${ang(r.kerangka.kk)} keluarga` : "belum diisi"}.`))];
  }
  async function isiKerangka() {
    const k = S.d.renkon.kerangka ?? {}, s = S.d.renkon.kesenjangan ?? {}, v = await tanya({judul: "Kerangka respon", teks: "Isi angka bulat. Kosong berarti menunggu, bukan 0.", kolom: [
      {nama: "jiwa", label: "Jiwa terdampak", nilai: k.jiwa ?? "", maks: 9}, {nama: "hari", label: "Lama respon (hari, 1 sampai 365)", nilai: k.hari ?? "", maks: 3}, {nama: "kk", label: "Keluarga (KK)", nilai: k.kk ?? "", maks: 9}, {nama: "target", label: "Target personel siap tugas", nilai: s.target_personel ?? "", maks: 7}]});
    if (!v) return;
    const n = x => { const t = x.trim(); return t === "" ? null : /^\d+$/.test(t) ? Number(t) : NaN; };
    const jiwa = n(v.jiwa), hari = n(v.hari), kk = n(v.kk), target = n(v.target);
    if ([jiwa, hari, kk, target].some(Number.isNaN)) return toast("Isi hanya bilangan bulat tanpa titik atau koma.");
    kirimAsumsi({kerangka: {jiwa, hari, kk}, kesenjangan: {target_personel: target, catatan: s.catatan ?? null}}, "Kerangka tersimpan");
  }
  function tabSenjang() {
    const Kh = S.d.kesenjangan_hitung ?? {}, B = Kh.barang ?? [], P = Kh.personel ?? {}, t = h("tbody", {});
    for (const b of B) t.append(h("tr", {}, h("td", {}, BARANG[b.nama] ?? b.nama), h("td", {class: "num"}, bilangan(b.kebutuhan) ? `${ang(b.kebutuhan)} ${b.satuan}` : MENUNGGU), h("td", {class: "num"}, bilangan(b.stok_baik) ? ang(b.stok_baik) : b.status),
      h("td", {class: "num"}, bilangan(b.rusak) ? ang(b.rusak) : "tidak ada"), h("td", {class: "num"}, bilangan(b.gap) ? ang(b.gap) : MENUNGGU), h("td", {class: "num"}, bilangan(b.surplus) ? ang(b.surplus) : MENUNGGU),
      h("td", {class: "t"}, b.status === "dihitung" ? pil("estimasi-model") : [h("span", {}, b.status), " ", pil("menunggu", {ditunggu: "stok LogPal"})])));
    const th = (a, d) => h("th", {title: d}, a);
    const sk4 = S.d.skor ?? {};
    return [wadah("Kesenjangan stok", h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Barang", "Hanya beras dan air minum yang berpadanan di LogPal"), th("Kebutuhan", "Dari kebutuhan dasar"), th("Stok baik", "Kondisi baik di gudang wilayah, dibaca dari LogPal"),
      th("Rusak", "Stok rusak tidak dihitung sebagai stok"), th("Kurang", "Kebutuhan dikurangi stok baik, tidak kurang dari nol"), th("Lebih", "Stok baik melebihi kebutuhan"), th("Keyakinan", "Label keyakinan"))), t)), para(Kh.catatan ?? "")),
      wadah("Personel siap tugas", para(P.status === "dihitung" ? `Target ${ang(P.target)} orang, siap ${ang(P.siap)} orang, kurang ${ang(P.gap)} orang (tingkat ${P.cakupan ?? "provinsi"}).` : `Personel ${P.status ?? MENUNGGU}.`), " ", pil(P.status === "dihitung" ? "terverifikasi" : "menunggu", {siapa: "daftar /petugas", waktu: "saat dibuka", ditunggu: "target personel"})),
      wadah("Skor kesiapan gladi", para(sk4.status === "dihitung" ? `Skor ${ang(sk4.skor)} dari 100, berdasar ${sk4.label}.` : `Skor menunggu: baru ${sk4.label ?? "0 dari 4 komponen"}, perlu minimal 2 komponen.`), " ", pil(sk4.yakin ?? "asumsi-kebijakan"))];
  }
  function tabRiwayat() {
    const r = S.d.renkon, ev = [[r.dibuat, `Dibuat versi ${r.versi}`], [r.tgl_sah ? Date.parse(r.tgl_sah + "T00:00:00Z") : null, r.tgl_sah ? `Ditetapkan, nomor ${r.no_penetapan ?? "belum tertulis"}` : null], [r.reviu_terakhir ? Date.parse(r.reviu_terakhir + "T00:00:00Z") : null, r.reviu_terakhir ? "Reviu terakhir" : null], [r.diubah, "Diubah terakhir"]].filter(x => x[0] && x[1]);
    const gl = S.d.gladi ?? [];
    return [wadah("Riwayat", h("ul", {class: "sk-garis"}, ev.map(([w, t]) => h("li", {}, h("time", {}, tgl(new Date(w).toISOString()) ?? ""), h("span", {}, t))))),
      wadah("Gladi untuk renkon ini", gl.length ? h("ul", {class: "sk-garis"}, gl.map(g => h("li", {}, h("a", {href: `/siklus/gladi/${g.id}`}, `Gladi ${g.jenis}`), h("small", {}, g.status)))) : kead("kosong", {teks: "Belum ada gladi untuk renkon ini"}), h("div", {class: "sk-aksi"}, h("a", {href: "/siklus/gladi", "data-aksi": "biasa"}, "Buka gladi")))];
  }
  function gambar() {
    const d = S.d, r = d.renkon, U = d.usulan ?? {}, sisa = r.kesegaran?.sisa, jiwa = r.kerangka?.jiwa;
    judul.replaceChildren(...[r.asumsi?.kependudukan && bilangan(Number(r.asumsi.kependudukan.nilai)) ? ["Asumsi dampak ", hl(ang(Number(r.asumsi.kependudukan.nilai))), " jiwa"] : bilangan(jiwa) ? ["Kerangka ", hl(ang(jiwa)), " jiwa"] : ["Asumsi dampak ", hl("menunggu"), " isian"],
      ", skor kesiapan ", hl(d.skor?.status === "dihitung" ? ang(d.skor.skor) : MENUNGGU), ", ", sisa == null ? ["berlaku ", hl("menunggu"), " penetapan"] : [sisa < 0 ? "kedaluwarsa " : "sisa berlaku ", hl(sisa < 0 ? `${angka(-sisa)} hari lalu` : `${angka(sisa)} hari`)]].flat());
    const next = statusBerikut(r.status);
    kosongkan(aksi).append(statusPil(r.status), ...(S.p.ko && next ? [tombol(`Lanjut ke ${STATUS_RK[next][0].toLowerCase()}`, "utama", () => ubahStatus(next), "panah")] : []));
    kosongkan(hasil).append(...({asumsi: tabAsumsi, kerangka: tabKerangka, kesenjangan: tabSenjang, riwayat: tabRiwayat})[S.tab]());
  }
  async function ubahStatus(ke) {
    const badan = {ke};
    if (ke === "ditetapkan") {
      const v = await tanya({judul: "Tetapkan renkon", teks: "Nomor penetapan resmi diisi staf. Masa berlaku 36 bulan sejak tanggal sah.", ya: "Tetapkan", kolom: [{nama: "no", label: "Nomor penetapan", wajib: true, maks: 120}, {nama: "tgl", label: "Tanggal sah", jenis: "tgl", wajib: true, nilai: tglWib()}]});
      if (!v) return; badan.no_penetapan = v.no; badan.tgl_sah = v.tgl;
    }
    const r = await api(`/api/siklus/renkon/${id}/status`, {metode: "POST", badan}); if (!r.ok) return gagalToast(r);
    toast(`Status menjadi ${STATUS_RK[ke][0].toLowerCase()}`); muat();
  }
  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    const [r, p] = await Promise.all([api(`/api/siklus/renkon/${id}`), peran()]);
    if (!pj.terbaru(n)) return;
    if (!r.ok) return kosongkan(hasil).append(kead_dari(r, muat, "Renkon tidak ditemukan atau di luar wilayahmu"));
    S.d = r.j; S.p = p;
    kosongkan(ctl).append(seg([["asumsi", "Asumsi", "jiwa"], ["kerangka", "Kerangka respon", "timbangan"], ["kesenjangan", "Kesenjangan", "gelombang"], ["riwayat", "Riwayat", "jampasir"]], S.tab, v => { S.tab = v; gambar(); }, "Bagian renkon"),
      h("p", {class: "sk-para"}, `${S.d.renkon.judul}, ${namaJenis(S.d.renkon.bencana)}, ${S.d.renkon.kab4 ? wilayah(S.d.renkon.kab4) : namaProv(S.d.renkon.prov)}`));
    gambar();
  }
  isi.replaceChildren(kart); muat();
}
