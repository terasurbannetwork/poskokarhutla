/* Teks WA otomatis dari SNAPSHOT laporan karhutla (docs/laporan-karhutla/SOP.md §5). Modul ES murni dan deterministik: hanya angka dari snapshot, tidak ada angka diketik.
   Format mengikuti laporan WA asli pemilik (20-21 Okt 2026): LAPORAN KARHUTLA (bagian A situasi umum, B upaya pemadaman, C hambatan, D luar provinsi prioritas, KESIMPULAN),
   gelar pesawat dan helikopter, rekap dry ice OMC, dan hasil pemantauan hujan pasca-OMC. Simbol WA: *tebal*, _miring_, "> " kutipan, "* " butir.
   Data kosong ditulis "belum ada data" (bukan dikarang). Hujan ditulis "dilaporkan setelah OMC", bukan akibat OMC. Tidak ada kiriman otomatis: teks disalin atau ditekan manusia (SOP §8). */
import {BAHAN_OMC, HAMBATAN, UPAYA, namaProv, labelAlat, teksDampak, labelVerifikasi} from "./laporan_karhutla_spek.js";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_P = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const KATA = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
export const KALIMAT_SEBAB = "Kesesuaian lokasi hujan dengan sasaran OMC belum membuktikan hubungan sebab-akibat secara langsung.";
const BELUM = "belum ada data";

const pecah = t => String(t).split("-").map(Number);
export const tglPendek = t => { const [y, m, d] = pecah(t); return `${d} ${BULAN[m - 1]} ${y}`; };
export const tglPanjang = t => { const [y, m, d] = pecah(t); return `${d} ${BULAN_P[m - 1]} ${y}`; };
export const hariPanjang = t => { const [y, m, d] = pecah(t); return `${HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} ${BULAN_P[m - 1]} ${y}`; };
const fmt = (n, d) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d, minimumFractionDigits: d});
const int = n => n == null ? BELUM : fmt(n, 0);
const h2 = n => n == null ? BELUM : fmt(n, 2);
const ha = n => n == null ? BELUM : `±${h2(n)} ha`;
const kata = n => KATA[n] ?? String(n);
const B = t => `*${t}*`, I = t => `_${t}_`, H1 = t => `***${t}***`, H2 = t => `**${t}**`;   // judul bagian ***A.***, sub-bagian **1.**, persis laporan WA asli
const gabung = a => a.length < 2 ? a.join("") : a.length === 2 ? a.join(" dan ") : `${a.slice(0, -1).join(", ")} dan ${a.at(-1)}`;
const jamMenit = m => m == null ? null : `${m >= 60 ? Math.floor(m / 60) + " jam" : ""}${m % 60 ? (m >= 60 ? " " : "") + (m % 60) + " menit" : ""}` || "0 menit";
const unik = a => [...new Set(a)];
const PEMILIK = {KLHK: "Kemenhut", BPBD: "BPBD", TNI: "TNI", Polri: "Polri", Swasta: "Swasta", BNPB: "BNPB", Lainnya: "lainnya"};

const catatPengecualian = s => s.pengecualian.map(p => `_Catatan: ${p.label}, data terakhir ${p.data_terakhir ? tglPendek(p.data_terakhir) : "tidak ada"} (${p.alasan})_`);
const sisipProv = (s, k) => s.provinsi.find(p => p.kode === k);
const nm = (s, k) => sisipProv(s, k)?.nama ?? namaProv(k);

/* ============================================================ LAPORAN KARHUTLA */
function totalBaris(t, hsTeks) {   // "target ... pada N FS; padam ... dan belum padam ..."
  return `${hsTeks}target ${ha(t.target_ha)} pada ${int(t.fs)} FS; padam ${ha(t.padam_ha)} pada ${int(t.fs_padam)} FS dan belum padam ${ha(t.sisa_ha)} pada ${int(t.fs_sisa)} FS.`;
}
function barisProvinsi(s, p) {
  const hs = p.hotspot?.total, hsT = hs != null ? `${int(hs)} HS, ` : "";
  const akhir = p.lanjut_tanpa ? ` ${I(`(data terakhir ${p.data_terakhir ? tglPendek(p.data_terakhir) : "tidak ada"})`)}` : "";
  if (!p.total) return `> ${p.nama}: ${hsT}${BELUM} penanganan.${akhir}`;
  if (p.total.fs === 0) return `> ${p.nama}: ${hsT}hasil verifikasi dan rekap penanganan mencatat ${B("0 FS, 0 ha terbakar, dan 0 ha belum padam")} pada ${tglPanjang(s.tanggal_data)}.${akhir}`;
  let t = `> ${p.nama}: ${totalBaris(p.total, hsT)}`;
  if (p.blok.length > 1) for (const b of p.blok) t += ` ${/^Di /.test(b.kawasan) ? b.kawasan : "Di " + b.kawasan}, target ${ha(b.target_ha)} pada ${int(b.fs)} FS, padam ${ha(b.padam_ha)} pada ${int(b.fs_padam)} FS, dan sisa ${ha(b.sisa_ha)} pada ${int(b.fs_sisa)} FS.`;
  return t + akhir;
}
const urutIspu = ["baik", "sedang", "tidak_sehat", "sangat_tidak_sehat", "berbahaya"];
function kondisiProv(p) {
  const k = p.kondisi; if (!k.length) return null;
  const kab = r => r.kab, bagian = [];
  const ispu = urutIspu.map(l => [l, k.filter(r => r.ispu === l).map(kab)]).filter(x => x[1].length).map(([l, a]) => B(`${l.replace(/_/g, " ")} di ${gabung(a)}`));
  if (ispu.length) bagian.push(`Kualitas udara/ISPU PM2,5 berkategori ${ispu.length > 1 ? ispu.slice(0, -1).join("; ") + "; dan " + ispu.at(-1) : ispu[0]}.`);
  const jp = unik(k.filter(r => r.jarak_pandang_m != null).map(r => r.jarak_pandang_m)).sort((a, b) => a - b).map(m => B(`${m >= 1000 ? fmt(m / 1000, 1) + " km" : int(m) + " meter"} di ${gabung(k.filter(r => r.jarak_pandang_m === m).map(kab))}`));
  if (jp.length) bagian.push(`Jarak pandang tercatat ${jp.join("; ")}.`);
  const pn = ["terganggu", "ditutup"].map(l => [l, k.filter(r => r.penerbangan === l).map(kab)]).filter(x => x[1].length).map(([l, a]) => `${l} di ${gabung(a)}`);
  if (pn.length) bagian.push(`Penerbangan ${pn.join("; ")}.`); else if (k.some(r => r.penerbangan === "normal")) bagian.push("Penerbangan normal.");
  const sk = [["daring", "Pembelajaran daring/PJJ"], ["libur", "Sekolah diliburkan"]].map(([l, t]) => [t, k.filter(r => r.sekolah === l).map(kab)]).filter(x => x[1].length).map(([t, a]) => `${t} di ${gabung(a)}`);
  if (sk.length) bagian.push(sk.join("; ") + ".");
  const ispa = k.filter(r => r.ispa != null); if (ispa.length) bagian.push(`ISPA tercatat ${B(int(ispa.reduce((a, r) => a + r.ispa, 0)) + " kasus")} di ${ispa.length} kabupaten/kota.`);
  const hj = ["ringan", "sedang", "lebat"].map(l => [l, k.filter(r => r.hujan === l).map(kab)]).filter(x => x[1].length).map(([l, a]) => `Hujan ${l} dilaporkan di ${B(gabung(a))}.`);
  bagian.push(...hj);
  return bagian.length ? "> " + bagian.join(" ") : null;
}
/* hasil padam darat/udara per wilayah dari baris FS bila SEMUA provinsi berbaris FS; kalau tidak, hanya total per wilayah */
function padamWilayah(s) {
  const lengkap = s.provinsi.length > 0 && s.provinsi.every(p => p.total && p.fs.length > 0 && p.fs.filter(f => !f.kumulatif).length > 0);
  return s.wilayah.map(w => {
    const ps = s.provinsi.filter(p => w.provinsi.includes(p.kode)), fs = ps.flatMap(p => p.fs.filter(f => !f.kumulatif));
    const darat = fs.reduce((a, f) => a + (f.padam_darat_ha ?? 0), 0), udara = fs.reduce((a, f) => a + (f.padam_udara_ha ?? 0), 0);
    return {wilayah: w.wilayah, total: w.padam_ha, split: lengkap, darat: Math.round(darat * 100) / 100, udara: Math.round(udara * 100) / 100};
  });
}
const lokasiWB = d => d.lokasi ? `, di ${B(d.lokasi)}` : "";
function sortieProv(daftar, k) { return daftar.filter(x => x.provs.includes(k)); }

export function laporanKarhutla(s) {
  const n = s.nasional, f = n.fs_ha, N = s.prioritas.length, L = [B("LAPORAN KARHUTLA"), I(tglPanjang(s.tanggal_laporan) + (s.ralat ? `, Ralat-${s.ralat}` : "")), ""];
  /* ---- A ---- */
  L.push(H1("A. SITUASI UMUM"), "", H2("1. Hotspot, Firespot dan Luas Kebakaran"));
  const hot = n.hotspot;
  L.push(`Berdasarkan pantauan 24 jam pada ${tglPanjang(s.tanggal_data)}, pada ${N} provinsi prioritas ${hot ? `terdeteksi ${B(int(hot.total) + " hotspot (HS)")}${hot.tinggi != null && hot.sedang != null ? `, terdiri atas ${B(int(hot.tinggi) + " HS tingkat kepercayaan tinggi")} dan ${B(int(hot.sedang) + " HS tingkat kepercayaan sedang")}` : ""}.` : `hotspot satelit ${BELUM}.`}`);
  L.push(`Terdapat ${B(int(f.fs) + " FS")} dengan target penanganan ${B(ha(f.target_ha))}. Dari luas tersebut, ${B(`${ha(f.padam_ha)} pada ${int(f.fs_padam)} FS telah padam`)} dan ${B(`${ha(f.sisa_ha)} pada ${int(f.fs_sisa)} FS belum padam`)}, dengan rincian:`);
  for (const p of s.provinsi) L.push(barisProvinsi(s, p));
  L.push("", H2("2. Kondisi wilayah"));
  if (s.provinsi.every(p => !p.kondisi.length)) L.push(I(BELUM + " kondisi wilayah"));
  else for (const p of s.provinsi) { const t = kondisiProv(p); L.push(`* ${p.nama}`, t ?? `> ${I(BELUM + " kondisi wilayah")}`); }
  if (s.dampak) L.push("", H2("3. Korban jiwa"), `${teksDampak(s.dampak)} pada ${tglPanjang(s.dampak.tanggal)} ${I("(" + labelVerifikasi(s.dampak) + ")")}.`);   // angka saja, tanpa nama; hanya bila ada laporan
  /* ---- B ---- */
  L.push("", H1("B. UPAYA PEMADAMAN DAN HASIL YANG DICAPAI"), "", H2("1. Operasi Darat"), B("a. Kekuatan personel"));
  const dgP = s.provinsi.filter(p => p.personel?.total != null);
  if (dgP.length) {
    L.push(`Kekuatan personel yang terdata pada ${kata(dgP.length)} provinsi mencapai sekitar ${B("±" + int(n.personel.total) + " personel")}, dengan rincian:`);
    for (const p of s.provinsi) L.push(p.personel?.total != null ? `- ${p.nama}: ${B(int(p.personel.total) + " personel")}${p.personel.keterangan ? ` (${p.personel.keterangan})` : p.personel.shift ? ` (${p.personel.shift})` : ""}.` : `- ${p.nama}: ${I(BELUM)}.`);
  } else L.push(I(`${BELUM} personel`));
  L.push("", B("b. Peralatan"));
  if (s.provinsi.every(p => !p.peralatan.length)) L.push(I(BELUM + " peralatan"));
  else for (const p of s.provinsi) {
    if (!p.peralatan.length) { L.push(`* ${p.nama}: ${I(BELUM + " peralatan")}`); continue; }
    L.push(`* ${p.nama}: ` + p.peralatan.map(a => `${labelAlat(a.kategori)} ${int(a.stok + a.tambahan)}${a.tambahan ? ` (stok ${int(a.stok)}, tambahan ${int(a.tambahan)})` : ""}${a.catatan ? ` (${a.catatan})` : ""}`).join(", ") + ".");
  }
  L.push("", B("c. Kegiatan pemadaman"));
  for (const p of s.provinsi) {
    if (!p.total) { L.push(`* ${p.nama}: ${I(BELUM + " kegiatan pemadaman")}`); continue; }
    if (p.total.fs === 0) { L.push(`* ${p.nama}: tidak ada FS yang ditangani pada ${tglPanjang(s.tanggal_data)}.`); continue; }
    const baris = p.fs.filter(x => !x.kumulatif), darat = baris.reduce((a, x) => a + (x.padam_darat_ha ?? 0), 0), udara = baris.reduce((a, x) => a + (x.padam_udara_ha ?? 0), 0), t = p.total;
    const pembuka = baris.length && udara === 0 ? "Satgas Darat memadamkan" : "Hasil pemadaman";
    let x = `* ${p.nama}: ${pembuka} ${B(`${ha(t.padam_ha)} pada ${int(t.fs_padam)} FS`)} dari target ${B(`${ha(t.target_ha)} pada ${int(t.fs)} FS`)}, menyisakan ${B(`${ha(t.sisa_ha)} pada ${int(t.fs_sisa)} FS`)}.`;
    if (baris.length && udara > 0) x += ` Dari hasil tersebut, ${ha(Math.round(darat * 100) / 100)} oleh darat dan ${ha(Math.round(udara * 100) / 100)} oleh udara.`;
    if (p.blok.length > 1) for (const b of p.blok) x += ` ${/^Di /.test(b.kawasan) ? b.kawasan : "Di " + b.kawasan}, padam ${ha(b.padam_ha)} pada ${int(b.fs_padam)} FS dari target ${ha(b.target_ha)} pada ${int(b.fs)} FS, sisa ${ha(b.sisa_ha)} pada ${int(b.fs_sisa)} FS.`;
    if (p.kumulatif_ha?.ha != null) x += ` Rincian lokasi memuat luasan kumulatif ${ha(p.kumulatif_ha.ha)} dan tidak dijumlahkan kembali sebagai hasil harian.`;
    L.push(x);
  }
  L.push("", H2("2. Operasi Udara"));
  const u0 = s.udara, o0 = s.omc;
  const u = u0 && (u0.armada.length || u0.patroli.daftar.length || u0.water_bombing.daftar.length) ? u0 : null, o = o0 && o0.daftar.length ? o0 : null;   // tanpa baris sama sekali = belum ada data
  const catKosong = (x, nama) => I(x?.alasan_kosong ? `Tidak ada ${nama} (${x.alasan_kosong})` : `${BELUM} ${nama}`);
  const armadaProv = (k, jenis) => u ? u.armada.filter(a => a.prov === k && a.jenis === jenis).length : 0;
  L.push(B("a. Patroli Udara/Casa/OMC"));
  if (!u || !u.armada.length) L.push(catKosong(u0, "armada udara")); else for (const k of s.prioritas) L.push(armadaProv(k, "pesawat") ? `* ${nm(s, k)}: ${B(armadaProv(k, "pesawat") + " unit")} tergelar` : `* ${nm(s, k)}: tidak ada pesawat tergelar`);
  L.push(B("b. Helikopter _Water Bombing_"));
  if (!u || !u.armada.length) L.push(catKosong(u0, "armada udara")); else for (const k of s.prioritas) L.push(armadaProv(k, "heli") ? `* ${nm(s, k)}: ${B(armadaProv(k, "heli") + " unit")} tergelar` : `* ${nm(s, k)}: tidak ada helikopter tergelar`);
  L.push(B("c. Pelaksanaan Patroli"));
  if (!u) L.push(catKosong(u0, "patroli")); else if (!u.patroli.daftar.length) L.push(I("Tidak ada patroli yang dilaporkan."));
  else for (const k of s.prioritas) {
    const d = sortieProv(u.patroli.daftar, k); if (!d.length) continue;
    L.push(`* ${nm(s, k)}: ` + d.map(x => `${x.registrasi} melaksanakan ${B(`1 sortie${x.durasi_menit != null ? " selama " + jamMenit(x.durasi_menit) : ""}`)}${x.lokasi ? ` di ${x.lokasi}` : ""}${x.temuan_fs ? `, temuan ${int(x.temuan_fs)} FS${x.temuan_ha != null ? ` (${ha(x.temuan_ha)})` : ""}` : x.temuan_fs === 0 ? " tanpa temuan FS baru" : ""}.`).join(" "));
  }
  L.push(B("d. Pelaksanaan Water Bombing"));
  if (!u) L.push(catKosong(u0, "water bombing")); else {
    L.push(`Pelaksanaan water bombing pada ${tglPanjang(s.tanggal_data)} diarahkan pada lokasi prioritas sebagai berikut:`);
    s.prioritas.forEach((k, i) => {
      const d = sortieProv(u.water_bombing.daftar, k); L.push(B(`${i + 1}. ${nm(s, k)}`));
      if (!d.length) { const vis = u.armada.some(a => a.prov === k && a.status === "tidak_terbang" && a.alasan === "visibilitas"); L.push(`* WB dilaporkan ${B("nihil")}.${vis ? " Jarak pandang rendah membatasi pelaksanaan operasi udara." : ""}`); return; }
      const tot = {bom: d.reduce((a, x) => a + (x.bom ?? 0), 0), liter: d.reduce((a, x) => a + (x.liter ?? 0), 0), ha: d.reduce((a, x) => a + (x.padam_ha ?? 0), 0)}, heli = unik(d.map(x => x.registrasi)).length;
      L.push(`* WB dilaksanakan oleh ${B(`${heli} helikopter, ${d.length} sortie`)}, dengan ${B(`${int(tot.bom)} kali pengeboman/${int(tot.liter)} liter air`)}. Hasil padam ${B(ha(Math.round(tot.ha * 100) / 100))}.`);
      for (const x of d) L.push(`> ${B(x.registrasi + ":")} ${B(`1 sortie${x.bom != null ? `, ${int(x.bom)} kali WB/${int(x.liter ?? 0)} liter` : ""}`)}${lokasiWB(x)}${x.padam_ha != null ? `; padam ${B(ha(x.padam_ha))}` : ""}.`);
    });
    if (u.water_bombing.lintas_provinsi) L.push(I(`${int(u.water_bombing.lintas_provinsi)} sortie lintas provinsi dihitung sekali di total nasional`));
  }
  L.push(B("e. Pelaksanaan Operasi Modifikasi Cuaca"));
  if (!o) L.push(catKosong(o0, "sortie OMC")); else {
    s.prioritas.forEach((k, i) => {
      const d = sortieProv(o.daftar, k); L.push(B(`${i + 1}. ${nm(s, k)}`));
      if (!d.length) { L.push(`> OMC tidak dilaksanakan atau ${BELUM}.`); return; }
      for (const x of d) L.push(`> ${B(x.registrasi)} melaksanakan ${B("1 sortie")}, dengan ${B(`${int(x.kg)} kg ${BAHAN_OMC[x.bahan]}`)}${x.sasaran.length ? `, menyasar ${B(gabung(x.sasaran))}` : ""}${x.ketinggian_ft ? ` pada ketinggian ${int(x.ketinggian_ft)} kaki` : ""}.`);
      const pp = o.per_provinsi[k]; if (pp && d.length > 1) L.push(`> Total dukungan penyemaian untuk ${nm(s, k)}: ${B(int(pp.sortie) + " sortie")}, ${int(pp.kg)} kg bahan semai.`);
    });
    if (o.lintas_provinsi) L.push(I(`${int(o.lintas_provinsi)} sortie lintas provinsi dihitung sekali di total nasional`));
  }
  const pw = padamWilayah(s);
  if (pw.length && pw.every(x => x.split)) L.push("", `Total berhasil dipadamkan: ${B(ha(f.padam_ha))}, terdiri dari:`, "* Operasi darat", ...pw.map(x => `> ${x.wilayah}: ${B(ha(x.darat))}.`), "* Operasi udara", ...pw.map(x => `> ${x.wilayah}: ${B(ha(x.udara))}.`));
  else L.push("", `Total berhasil dipadamkan: ${B(ha(f.padam_ha))}${pw.length ? ` (${pw.map(x => `${x.wilayah} ${ha(x.total)}`).join(", ")})` : ""}.`, I("Pembagian darat dan udara belum ada karena baris FS belum lengkap"));
  /* ---- C ---- */
  L.push("", H1("C. HAMBATAN DAN CARA MENGATASI"));
  for (const w of s.wilayah.length ? s.wilayah.map(x => x.wilayah) : []) {
    const ps = s.provinsi.filter(p => p.wilayah === w);
    const hb = unik(ps.flatMap(p => [...(p.hambatan?.pilihan ?? []).map(c => HAMBATAN[c]), p.hambatan?.teks])).filter(Boolean), up = unik(ps.flatMap(p => [...(p.upaya?.pilihan ?? []).map(c => UPAYA[c]), p.upaya?.teks])).filter(Boolean);
    L.push(hb.length ? `* ${w}: ${hb.join("; ")}.` : `* ${w}: ${I(BELUM + " hambatan")}`);
    if (up.length) L.push(`> Upaya: ${up.join("; ")}.`);
  }
  /* ---- D ---- */
  L.push("", H1(`D. PENANGANAN KARHUTLA DI LUAR ${N} PROVINSI PRIORITAS`));
  const dl = s.di_luar_prioritas;
  if (!dl) L.push(I(BELUM + " kejadian di luar provinsi prioritas"));
  else if (!dl.kejadian.length) L.push("* Tidak ada kejadian karhutla di luar provinsi prioritas yang dilaporkan.");
  else {
    L.push(`* Kejadian karhutla juga dilaporkan terjadi di ${kata(unik(dl.kejadian.map(k => k.prov)).length)} provinsi di luar ${kata(N)} provinsi prioritas:`);
    for (const k of dl.kejadian) L.push(`* ${B("Provinsi " + k.prov + ":")} ${[k.kab, k.jenis !== "karhutla" ? k.jenis : null, k.luas_ha != null ? ha(k.luas_ha) : null, k.keterangan].filter(Boolean).join(", ")}.`);
    const dgL = dl.kejadian.filter(k => k.luas_ha != null), tanpaL = dl.kejadian.length - dgL.length;
    if (dgL.length) L.push(`> Luas lahan terbakar di luar ${kata(N)} provinsi prioritas yang dilaporkan sekitar ${B(ha(Math.round(dgL.reduce((a, k) => a + k.luas_ha, 0) * 100) / 100))}${tanpaL ? ` (${tanpaL} kejadian belum menyebut luas)` : ""}.`);
  }
  /* ---- kesimpulan ---- */
  L.push("", "=============================================================", "", B("KESIMPULAN"), "", `Sampai hari ini, ${hariPanjang(s.tanggal_laporan)}, Penanganan Karhutla dilaporkan:`);
  L.push(`* Pada ${kata(N)} provinsi prioritas (${gabung(s.provinsi.map(p => p.nama))}) jumlah FS (fire spot) yang ditangani sebanyak ${B(int(f.fs) + " FS")} yang menunjukkan kebakaran nyata.`);
  for (const w of s.wilayah) {
    const ps = s.provinsi.filter(p => w.provinsi.includes(p.kode) && p.total), besar = ps.slice().sort((a, b) => b.total.sisa_ha - a.total.sisa_ha)[0];
    const tntp = besar?.blok.some(b => /TNTP/.test(b.kawasan) && !/luar/i.test(b.kawasan) && b.sisa_ha > 0);
    L.push(`* Di wilayah ${w.wilayah} terdeteksi ${B(int(w.fs) + " FS")} pada target area ${B(ha(w.target_ha))}. Sekitar ${B(`${ha(w.padam_ha)} pada ${int(w.fs_padam)} FS telah padam`)} dan ${B(`${ha(w.sisa_ha)} pada ${int(w.fs_sisa)} FS belum padam`)}.${besar && besar.total.sisa_ha > 0 ? ` Luas area belum padam terbesar berada di ${B(besar.nama)}${tntp ? ", termasuk TNTP" : ""}.` : ""}`);
  }
  const hujan = o ? o.hasil.filter(x => x.hujan === "ya").map(x => x.sasaran) : [];
  if (hujan.length) L.push(`* Hujan dilaporkan setelah OMC di ${gabung(hujan)}. ${KALIMAT_SEBAB}`);
  else if (o && o.hasil.length) L.push(`* Hujan setelah OMC tidak dilaporkan pada sasaran yang dipantau. ${KALIMAT_SEBAB}`);
  L.push(`* Jadi, luas area terbakar di ${kata(N)} provinsi prioritas yang sedang dipadamkan hari ini: ${B(ha(f.sisa_ha))} ditambah apabila hari ini menemukan fire spot baru.`);
  if (s.pengecualian.length) L.push("", ...catatPengecualian(s));
  L.push("", "*Dmmp*");
  return L.join("\n");
}

/* ============================================================ GELAR PESAWAT */
export function gelarPesawat(s) {
  const u = s.udara, L = [B("LAPORAN GELAR PESAWAT DAN HELIKOPTER KARHUTLA"), B(`Data: ${tglPanjang(s.tanggal_data)}`), I(`Laporan ${tglPanjang(s.tanggal_laporan)}${s.ralat ? `, Ralat-${s.ralat}` : ""}`), ""];
  if (!u || !u.armada.length) return [...L, I(BELUM + " armada udara"), ...(u?.alasan_kosong ? ["", I(u.alasan_kosong)] : []), ...catatPengecualian(s)].join("\n");
  const urut = [...s.prioritas, ...unik(u.armada.map(a => a.prov).filter(k => k && !s.prioritas.includes(k)))];
  const etiket = (a) => `${a.jenis === "heli" ? "WB" : "Patroli/OMC"}${a.pemilik === "BNPB" ? "" : " " + PEMILIK[a.pemilik]}`;
  urut.forEach((k, i) => {
    const a = u.armada.filter(x => x.prov === k); L.push(B(`${i + 1}. ${nm(s, k).toUpperCase()}: ${a.length} UNIT`));
    const rinci = new Map(); for (const x of a) rinci.set(etiket(x), (rinci.get(etiket(x)) ?? 0) + 1);
    L.push(a.length ? `(${[...rinci].map(([e, n]) => `${n} ${e}`).join(" + ")})` : "(tidak ada armada)");
    for (const x of a.filter(y => y.status === "tidak_terbang")) L.push(`- ${x.registrasi} tidak terbang${x.alasan ? ` (${x.alasan.replace(/_/g, " ")})` : ""}`);
    L.push("");
  });
  const per = new Map(); for (const x of u.armada) per.set(x.pemilik, (per.get(x.pemilik) ?? 0) + 1);
  const urutP = ["BNPB", "TNI", "KLHK", "Polri", "BPBD", "Swasta", "Lainnya"].filter(x => per.has(x));
  L.push(B("REKAPITULASI"), ...urutP.map(x => `* ${x === "KLHK" ? "Kementerian Kehutanan" : PEMILIK[x]}: ${per.get(x)} Unit`), "", B(`TOTAL KESELURUHAN: ${u.armada.length} UNIT`),
    `* Patroli/CASA/OMC: ${B(u.armada.filter(x => x.jenis === "pesawat").length + " Unit")}`, `* Helikopter Water Bombing: ${B(u.armada.filter(x => x.jenis === "heli").length + " Unit")}`);
  const w = u.water_bombing, p = u.patroli;
  if (w.sortie || p.sortie) L.push("", `Terlaksana pada hari tersebut: water bombing ${int(w.sortie)} sortie (${int(w.bom)} bom, ${int(w.liter)} liter, padam ${ha(w.padam_ha)}), patroli ${int(p.sortie)} sortie.`);
  if (w.lintas_provinsi) L.push(I(`${int(w.lintas_provinsi)} sortie lintas provinsi dihitung sekali`));
  return [...L, ...catatPengecualian(s)].join("\n");
}

/* ============================================================ REKAP DRY ICE */
const huruf = i => String.fromCharCode(65 + i);
export function rekapDryIce(s) {
  const o = s.omc, tg = hariPanjang(s.tanggal_data), L = [B("LAPORAN REKAPITULASI PENGGUNAAN DRY ICE OPERASI MODIFIKASI CUACA (OMC)"), "", B(tg), ""];
  if (!o) return [...L, I(BELUM + " OMC"), ...catatPengecualian(s)].join("\n");
  L.push(`Izin melaporkan rekapitulasi penggunaan bahan semai ${B("Dry Ice")} dan NaCl pada Operasi Modifikasi Cuaca (OMC) tanggal ${tglPanjang(s.tanggal_data)}, sebagai berikut:`, "");
  if (!o.daftar.length && !o.hasil.length) return [...L, I(o.alasan_kosong ? `Tidak ada sortie OMC (${o.alasan_kosong})` : BELUM + " sortie OMC"), "", "Demikian laporan disampaikan. Terima kasih.", ...catatPengecualian(s)].join("\n");
  if (!o.daftar.length) L.push(I(o.alasan_kosong ? `Tidak ada sortie OMC (${o.alasan_kosong})` : BELUM + " sortie OMC"), "");
  const adaProv = s.prioritas.filter(k => sortieProv(o.daftar, k).length); let i = 0;
  for (const k of adaProv) {
    const d = sortieProv(o.daftar, k), pp = o.per_provinsi[k]; L.push(B(`${huruf(i++)}. PROVINSI ${nm(s, k).toUpperCase()}`));
    for (const r of unik(d.map(x => x.registrasi))) { L.push(`Pesawat ${r}:`); d.filter(x => x.registrasi === r).forEach((x, j) => L.push(`- Sortie ${j + 1}: ${int(x.kg)} kg ${BAHAN_OMC[x.bahan]}${x.sasaran.length ? `, sasaran ${gabung(x.sasaran)}` : ""}${x.lintas ? " (lintas provinsi)" : ""}.`)); }
    L.push(B(`Rekapitulasi ${nm(s, k)}:`), `- Jumlah sortie: ${int(pp.sortie)} sortie.`);
    for (const b of Object.keys(BAHAN_OMC)) { const kg = d.filter(x => x.bahan === b).reduce((a, x) => a + x.kg, 0); if (kg) L.push(`- Penggunaan ${BAHAN_OMC[b]} tanggal ${tglPanjang(s.tanggal_data)}: ${int(kg)} kg.`); }
    L.push("");
  }
  L.push(B(`${huruf(i++)}. HASIL PEMANTAUAN OMC`));
  if (!o.hasil.length) L.push(I("Hasil pemantauan belum diisi"));
  const ya = {ya: "hujan dilaporkan setelah OMC", tidak: "hujan tidak dilaporkan", tidak_diketahui: "hujan belum diketahui"};
  for (const x of o.hasil) {
    L.push(`* ${B(x.sasaran)}: ${x.hujan ? ya[x.hujan] : "hasil belum diisi"}${x.curah_mm != null ? `, ${h2(x.curah_mm)} mm` : ""}.`);
    if (x.pm25_sebelum != null || x.pm25_sesudah != null) L.push(`> PM2,5 sebelum ${h2(x.pm25_sebelum)} dan sesudah ${h2(x.pm25_sesudah)} µg/m³.`);
    if (x.jarak_pandang_sebelum_m != null || x.jarak_pandang_sesudah_m != null) L.push(`> Jarak pandang sebelum ${int(x.jarak_pandang_sebelum_m)} m dan sesudah ${int(x.jarak_pandang_sesudah_m)} m.`);
  }
  L.push(I(KALIMAT_SEBAB), "", B(`${huruf(i)}. REKAPITULASI TOTAL PENGGUNAAN BAHAN SEMAI`), `* Total sortie: ${B(int(o.sortie) + " sortie")}`);
  for (const [b, v] of Object.entries(o.per_bahan)) L.push(`* ${BAHAN_OMC[b]}: ${B(int(v.kg) + " kg")} (${int(v.sortie)} sortie)`);
  L.push(`* Total bahan semai: ${B(int(o.kg_total) + " kg")}`);
  if (o.lintas_provinsi) L.push(I(`${int(o.lintas_provinsi)} sortie lintas provinsi dihitung sekali`));
  return [...L, "", "Demikian laporan disampaikan. Terima kasih.", ...catatPengecualian(s)].join("\n");
}

/* ============================================================ HASIL HUJAN PASCA-OMC */
export function hasilHujanOmc(s) {
  const o = s.omc, N = s.prioritas.length, L = [B(`LAPORAN HASIL PEMANTAUAN HUJAN PASCA PELAKSANAAN OPERASI MODIFIKASI CUACA (OMC) DI ${N} PROVINSI PRIORITAS KARHUTLA`), "", B(hariPanjang(s.tanggal_data)), ""];
  if (!o) return [...L, I(BELUM + " OMC"), ...catatPengecualian(s)].join("\n");
  L.push("Yth. Bapak/Ibu Pimpinan,", `Izin melaporkan hasil pelaksanaan OMC dan pemantauan kejadian hujan pada tanggal ${tglPanjang(s.tanggal_data)}, sebagai berikut:`, "");
  if (!o.daftar.length && !o.hasil.length) return [...L, I(o.alasan_kosong ? `Tidak ada sortie OMC (${o.alasan_kosong})` : BELUM + " sortie OMC dan hasil pemantauan hujan"), "", `Sumber: Laporan PIC Karhutla, ${tglPanjang(s.tanggal_data)}.`, ...catatPengecualian(s)].join("\n");
  const dipakai = new Set(); let adaProv = 0;
  s.prioritas.forEach((k, i) => {
    const d = sortieProv(o.daftar, k), sasaran = unik(d.flatMap(x => x.sasaran)), pp = o.per_provinsi[k];
    L.push(B(`${i + 1}. ${nm(s, k).toUpperCase()}`));
    if (!d.length) { L.push(`* OMC tidak dilaksanakan atau ${BELUM}.`, ""); return; }
    adaProv++;
    const bahan = Object.keys(BAHAN_OMC).map(b => [b, d.filter(x => x.bahan === b).reduce((a, x) => a + x.kg, 0)]).filter(x => x[1]).map(([b, kg]) => `${int(kg)} kg ${BAHAN_OMC[b]}`);
    L.push(`* OMC dilaksanakan sebanyak ${int(pp.sortie)} sortie dengan bahan semai ${gabung(bahan)}.`);
    if (sasaran.length) L.push(`* Sasaran OMC: ${gabung(sasaran)}.`);
    const hs = o.hasil.filter(x => sasaran.includes(x.sasaran)); hs.forEach(x => dipakai.add(x));
    const hujan = hs.filter(x => x.hujan === "ya").map(x => x.sasaran);
    if (hujan.length) L.push(`* Hujan dilaporkan setelah OMC di ${gabung(hujan)}.`);
    for (const x of hs) { if (x.curah_mm != null) L.push(`* Curah hujan ${x.sasaran}: ${h2(x.curah_mm)} mm.`); }
    L.push(hs.length ? `* ${B("Hasil:")} ${hs.map(x => `${x.sasaran} ${{ya: "tercatat hujan setelah OMC", tidak: "tidak tercatat hujan", tidak_diketahui: "belum diketahui"}[x.hujan] ?? "belum diisi"}`).join("; ")}.` : `* ${B("Hasil:")} ${I("belum diisi")}`, "");
  });
  const lain = o.hasil.filter(x => !dipakai.has(x));
  if (lain.length) L.push(B("Sasaran lain yang dipantau"), ...lain.map(x => `* ${x.sasaran}: ${{ya: "hujan dilaporkan setelah OMC", tidak: "hujan tidak dilaporkan", tidak_diketahui: "belum diketahui"}[x.hujan] ?? "belum diisi"}.`), "");
  const nYa = o.hasil.filter(x => x.hujan === "ya").length;
  L.push(B("II. KESIMPULAN"), `1. OMC dilaksanakan ${B(int(o.sortie) + " sortie")} di ${kata(adaProv)} dari ${kata(N)} provinsi prioritas, dengan ${B(int(o.kg_total) + " kg")} bahan semai.`);
  L.push(o.hasil.length ? `2. Hujan dilaporkan setelah OMC pada ${nYa} dari ${o.hasil.length} sasaran yang dipantau.` : `2. Hasil pemantauan hujan ${BELUM}.`, `3. ${KALIMAT_SEBAB}`);
  L.push("", "Demikian dilaporkan sebagai bahan informasi dan arahan pimpinan.", `Sumber: Laporan PIC Karhutla, ${tglPanjang(s.tanggal_data)}.`, "Terima kasih.", ...catatPengecualian(s));
  return L.join("\n");
}

export const teksWA = s => ({laporan_karhutla: laporanKarhutla(s), gelar_pesawat: gelarPesawat(s), rekap_dry_ice: rekapDryIce(s), hasil_hujan_omc: hasilHujanOmc(s)});
