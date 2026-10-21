/* laporan_konpers.js: bahan bersama tiga keluaran konferensi pers dari isian harian /laporan-bnpb (tanpa input ulang).
   Murni, tanpa DOM, jadi diuji di node: rencana halaman konpers (satu sumber untuk deck DAN naskah, supaya [SLIDE n] = nomor halaman),
   imbauan baku per jenis bencana, naskah juru bicara (templat deterministik, tanpa AI), durasi baca, pemecah daftar untuk Matador.
   Angka di naskah hanya berasal dari isian: pembulatan "sekitar 28 ribu" dan hitungan (jumlah kejadian, provinsi) saja, tidak ada penjumlahan luas. */
(() => {
const LB = window.LaporanBnpbSlide, {JENIS, STATUS, tglHari, tglP, rentang, angkaTeks, KONTAK} = LB;
const TB = "Data belum tersedia, akan kami sampaikan.";
const PER_HAL = 20, PER_PERHATIAN = 8, KATA_PER_MENIT = 130;
const num = v => typeof v === "number" && Number.isFinite(v) ? v : null;
const nProv = (c, p) => c.prov[p] || p || "";
const penuh = x => x && (x.judul || x.isi);

/* ------------------------------------------------------------ bahan dari isian */
function kelompokProv(ks) { const m = new Map(); for (const x of ks) { if (!m.has(x.prov)) m.set(x.prov, []); m.get(x.prov).push(x); } return [...m]; }
const kejadian = c => c.isi.kejadian || [];
const tambahan = c => (c.isi.perhatian_tambahan || []).filter(penuh);
/* jenis yang ada hari itu menurut urutan JENIS: dari kejadian ATAU butir tambahan (mis. gunung api) */
const jenisAda = c => Object.keys(JENIS).filter(j => kejadian(c).some(x => x.jenis === j) || tambahan(c).some(x => x.jenis === j));
/* perlu perhatian: kejadian belum selesai + butir tambahan; bentuk seragam {jenis, judul, isi, status} */
const perhatian = c => [
  ...kejadian(c).filter(x => x.status === "belum").map(x => ({jenis: x.jenis, judul: [nProv(c, x.prov), x.lokasi].filter(Boolean).join(", "), isi: x.perhatian || x.utama || "", status: "belum"})),
  ...tambahan(c).map(x => ({jenis: x.jenis, judul: x.judul || "", isi: x.isi || "", status: x.status || "berjalan"}))];

/* satu jenis -> beberapa halaman bila barisnya melebihi PER_HAL (kepala provinsi dihitung satu baris) */
function bagiJenis(c, j) {
  const kg = kelompokProv(kejadian(c).filter(x => x.jenis === j)), tb = tambahan(c).filter(x => x.jenis === j), out = [];
  let cur = {kej: [], tamb: []}, n = 0;
  const dorong = (kej, tamb, baris) => { if (n && n + baris > PER_HAL) { out.push(cur); cur = {kej: [], tamb: []}; n = 0; } cur.kej.push(...kej); cur.tamb.push(...tamb); n += baris; };
  for (const [, xs] of kg) dorong(xs, [], xs.length + (xs.length > 1 ? 1 : 0));
  for (const t of tb) dorong([], [t], 1);
  out.push(cur);
  return out;
}

/* ------------------------------------------------------------ imbauan */
const UMUM = {judul: "Ikuti informasi resmi", isi: "Gunakan informasi dari BNPB, BMKG, PVMBG, dan BPBD setempat, dan jangan menyebarkan kabar yang belum jelas sumbernya."};
const BAKU = {
  karhutla: [{judul: "Jangan membakar hutan dan lahan", isi: "Pembakaran hutan dan lahan melanggar hukum, merusak lingkungan, dan membahayakan kesehatan."}, {judul: "Pakai masker saat asap pekat", isi: "Kurangi kegiatan di luar ruangan ketika udara berasap, terutama bagi anak, lansia, ibu hamil, dan penderita gangguan pernapasan."}],
  gunungapi: [{judul: "Patuhi radius dan rekomendasi PVMBG", isi: "Jangan beraktivitas di dalam radius bahaya yang ditetapkan PVMBG dan ikuti arahan BPBD setempat."}, {judul: "Waspadai hujan abu", isi: "Siapkan masker dan pelindung mata, dan tutup sumber air bersih bila abu turun."}],
  gempabumi: [{judul: "Ikuti arahan BPBD", isi: "Tetap tenang, ikuti arahan petugas, dan hanya kembali ke rumah setelah dinyatakan aman."}, {judul: "Waspadai gempa susulan", isi: "Jauhi bangunan yang retak atau rusak dan siapkan tas siaga bencana."}],
  banjir: [{judul: "Waspadai banjir dan arus deras", isi: "Hindari menyeberangi genangan atau sungai yang meluap dan segera mengungsi bila diminta petugas."}],
  longsor: [{judul: "Waspadai tanah longsor", isi: "Jauhi lereng yang retak atau miring, terutama saat dan sesudah hujan lebat."}],
  kekeringan: [{judul: "Hemat air bersih", isi: "Gunakan air seperlunya dan manfaatkan bantuan air bersih dari pemerintah daerah."}],
  cuaca: [{judul: "Waspadai cuaca ekstrem", isi: "Hindari berteduh di bawah pohon atau papan reklame saat angin kencang."}],
  kebakaran_permukiman: [{judul: "Periksa kompor dan instalasi listrik", isi: "Matikan peralatan listrik dan api sebelum meninggalkan rumah, dan segera hubungi pemadam kebakaran bila ada api."}],
};
/* imbauan: isian (maks. 6) menang; kosong = baku per jenis yang ada hari itu (urut jumlah kejadian), ditutup imbauan umum */
function imbauan(c) {
  const sendiri = (c.isi.imbauan || []).filter(penuh).slice(0, 6);
  if (sendiri.length) return sendiri;
  const jml = j => kejadian(c).filter(x => x.jenis === j).length + tambahan(c).filter(x => x.jenis === j).length;
  const baku = jenisAda(c).sort((a, b) => jml(b) - jml(a)).flatMap(j => BAKU[j] || []);
  return [...baku.slice(0, 5), UMUM];
}

/* ------------------------------------------------------------ rencana halaman konpers */
function rencana(c) {
  const r = [{id: "sampul"}, {id: "ringkasan"}];
  for (const j of jenisAda(c)) { const bg = bagiJenis(c, j); bg.forEach((b, i) => r.push({id: "jenis", jenis: j, hal: i + 1, dari: bg.length, ...b})); }
  const ph = perhatian(c); for (let i = 0; i < ph.length; i += PER_PERHATIAN) r.push({id: "perhatian", hal: i / PER_PERHATIAN + 1, dari: Math.ceil(ph.length / PER_PERHATIAN), butir: ph.slice(i, i + PER_PERHATIAN)});
  const td = (c.isi.tindak || []).filter(penuh).slice(0, 8); if (td.length) r.push({id: "tindak", butir: td});
  r.push({id: "imbauan", butir: imbauan(c)}, {id: "penutup"});
  return r;
}

/* ------------------------------------------------------------ angka ke ucapan */
const SAT = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
const kata = n => n >= 100 ? String(n) : n < 12 ? SAT[n] : n < 20 ? SAT[n - 10] + " belas" : SAT[Math.floor(n / 10)] + " puluh" + (n % 10 ? " " + SAT[n % 10] : "");
const idn = (v, d = 0) => v.toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
const urai = s => Number(s.replace(/\./g, "").replace(",", "."));
/* < 100 bulat: kata ("tujuh belas"); 100-999 dan desimal < 1000: apa adanya; >= 1000: "sekitar 28 ribu", angka lengkap disebut SEKALI di sebutan pertama */
function ucap(v, st, tanpaSekitar, asli) {
  if (Number.isInteger(v) && v < 100) return kata(v);
  if (v < 1000) return asli || idn(v, Number.isInteger(v) ? 0 : (String(v).split(".")[1] || "").length);
  const [bagi, sat] = v >= 1e6 ? [1e6, "juta"] : [1e3, "ribu"], x = v / bagi, p = x >= 10 || Number.isInteger(x) ? 0 : 1;
  const lengkap = asli || idn(v, Number.isInteger(v) ? 0 : (String(v).split(".")[1] || "").length), pertama = !st.sudah.has(lengkap); st.sudah.add(lengkap);
  return `${tanpaSekitar ? "" : "sekitar "}${idn(Math.round(x * 10 ** p) / 10 ** p, p)} ${sat}${pertama ? ` (tepatnya ${lengkap})` : ""}`;
}
/* teks bebas isian -> ucapan: angka, tanda ±, singkatan satuan */
function ucapTeks(t, st) {
  return String(t || "").replace(/(±\s*)?(\d+(?:\.\d{3})*(?:,\d+)?)/g, (m, pra, n) => {
    const v = urai(n); if (!pra && Number.isInteger(v) && v >= 1900 && v <= 2100 && !/\./.test(n)) return n;   // tahun
    return (pra ? "sekitar " : "") + ucap(v, st, !!pra, n);
  }).replace(/\bha\b/g, "hektare").replace(/\bKK\b/g, "kepala keluarga").replace(/\bs\.d\./g, "sampai dengan").replace(/\bOkt\b/g, "Oktober").replace(/\bDes\b/g, "Desember").replace(/\bkm\b/g, "kilometer").replace(/\bhuntara\b/g, "hunian sementara").replace(/\s+/g, " ").trim();
}
const statusUcap = s => s === "selesai" ? "selesai atau terkendali" : s === "belum" ? "belum selesai" : "penanganan masih berjalan";
const daftarUcap = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " dan " + a.at(-1);
const huruf1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const akhiri = s => /[.!?]$/.test(s) ? s : s + ".";

/* ------------------------------------------------------------ naskah */
function kalimatKejadian(c, x, st) {
  const lok = [nProv(c, x.prov), x.lokasi].filter(Boolean).join(", ");
  const angka = [x.utama, x.kedua].filter(Boolean).map(t => ucapTeks(t, st)).join(", ");
  const ket = x.ket ? String(x.ket).split("|").map(s => ucapTeks(s.trim(), st)).filter(Boolean).join(", ") : "";
  return akhiri(`${lok}: ${[angka, ket].filter(Boolean).join(", ")}${angka || ket ? ", " : ""}status ${statusUcap(x.status)}`);
}
function bagianNaskah(c, h, st, b) {
  const i = c.isi, ks = kejadian(c), p = [];
  if (h.id === "sampul") {
    p.push(`Assalamualaikum warahmatullahi wabarakatuh. Salam sejahtera bagi kita semua. Selamat datang, rekan-rekan media, pada Konferensi Pers Penanganan Bencana, ${tglHari(c.tanggal)}.`);
    if (i.penyaji) p.push(`Saya ${i.penyaji}${i.jabatan ? ", " + i.jabatan : ""}${i.instansi ? ", " + i.instansi : ""}, akan menyampaikan perkembangan kejadian bencana dan langkah penanganannya.`);
    if (i.konpers_pembuka) p.push(ucapTeks(i.konpers_pembuka, st));
    p.push(`Laporan ini mencakup periode ${rentang(i.mulai, c.tanggal)}, hingga pukul ${i.jam || "07.00"} WIB.`);
  } else if (h.id === "ringkasan") {
    if (!ks.length) { p.push("Belum ada kejadian menonjol yang tercatat pada laporan ini."); return p; }
    const jn = jenisAda(c).map(j => [j, ks.filter(x => x.jenis === j).length]).filter(x => x[1]);
    p.push(`Pada periode ini kami mencatat ${kata(ks.length)} kejadian bencana menonjol di ${kata(b.nProv)} provinsi.`);
    p.push(`Menurut jenisnya: ${daftarUcap(jn.map(([j, n]) => `${kata(n)} ${JENIS[j].nama.toLowerCase()}`))}.`);
    const bs = ks.filter(x => x.status === "belum"), sl = ks.filter(x => x.status === "selesai").length, bj = ks.filter(x => x.status === "berjalan").length;
    p.push(bs.length ? `Dari seluruh kejadian itu, ${kata(bs.length)} belum selesai penanganannya, yaitu ${daftarUcap(bs.map(x => x.lokasi || nProv(c, x.prov)))}.` : "Seluruh kejadian itu sudah selesai atau sedang ditangani, dan tidak ada yang berstatus belum selesai.");
    const bagi = [sl && `${kata(sl)} kejadian selesai atau terkendali`, bj && `${kata(bj)} kejadian penanganannya masih berjalan`].filter(Boolean);
    if (bagi.length) p.push(huruf1(daftarUcap(bagi)) + ".");
    const tb = tambahan(c);
    if (tb.length) p.push(`Kami juga melaporkan ${kata(tb.length)} butir informasi tambahan, yaitu ${daftarUcap([...new Set(tb.map(x => (JENIS[x.jenis] || JENIS.lainnya).nama.toLowerCase()))])}.`);
  } else if (h.id === "jenis") {
    const nm = JENIS[h.jenis].nama, nK = ks.filter(x => x.jenis === h.jenis).length, tj = tambahan(c).filter(x => x.jenis === h.jenis);
    if (h.hal === 1) {
      const np = new Set(ks.filter(x => x.jenis === h.jenis).map(x => x.prov)).size;
      p.push(nK ? `${nm}. Terdapat ${kata(nK)} kejadian ${nm.toLowerCase()} di ${kata(np)} provinsi.` : `${nm}. Terdapat ${kata(tj.length)} laporan ${nm.toLowerCase()}.`);
    } else p.push(`${nm}, lanjutan rincian, halaman ${kata(h.hal)} dari ${kata(h.dari)}.`);
    for (const [pv, xs] of kelompokProv(h.kej)) {
      if (xs.length > 1) p.push(`Di ${nProv(c, pv)} terdapat ${kata(xs.length)} kejadian.`);
      for (const x of xs) p.push(kalimatKejadian(c, x, st));
    }
    for (const t of h.tamb) p.push(akhiri(`${ucapTeks(t.judul, st)}${t.isi ? ": " + ucapTeks(t.isi, st) : ""}`));
  } else if (h.id === "perhatian") {
    p.push(h.hal === 1 ? "Hal yang perlu mendapat perhatian khusus." : "Hal yang perlu mendapat perhatian khusus, lanjutan.");
    for (const x of h.butir) p.push(akhiri(`${ucapTeks(x.judul, st)}${x.isi ? ": " + ucapTeks(x.isi, st) : ""}`));
  } else if (h.id === "tindak") {
    p.push(`Langkah yang akan dilakukan ${i.singkatan || "BNPB"} dan seluruh unsur terkait.`);
    for (const t of h.butir) p.push(akhiri(`${ucapTeks(t.judul, st)}${t.isi ? ": " + ucapTeks(t.isi, st) : ""}`));
  } else if (h.id === "imbauan") {
    p.push("Kepada masyarakat, kami menyampaikan imbauan berikut.");
    for (const x of h.butir) p.push(akhiri(`${ucapTeks(x.judul, st)}${x.isi ? ". " + ucapTeks(x.isi, st) : ""}`));
  } else if (h.id === "penutup") {
    const k = Object.fromEntries(KONTAK);
    p.push("Demikian yang dapat kami sampaikan. Masyarakat dapat menghubungi kami melalui kanal berikut.");
    p.push(`Call Center ${k["Call Center"]}. Telepon ${k.Telepon}. Surel ${k.Surel}. Situs ${k.Situs}.`);
    p.push("Terima kasih atas perhatian rekan-rekan media. Wassalamualaikum warahmatullahi wabarakatuh.");
  }
  return p;
}

/* antisipasi pertanyaan wartawan: jawaban hanya dari isian; data tidak ada = TB */
function tanyaJawab(c, b) {
  const st = {sudah: new Set()};   // tiap jawaban berdiri sendiri: angka penting disebut lengkap di jawabannya
  const ks = kejadian(c), lok = x => [nProv(c, x.prov), x.lokasi].filter(Boolean).join(", "), teks = x => [x.utama, x.kedua, x.ket, x.catatan].filter(Boolean).join(" ");
  const cocok = (re, a) => a.filter(x => re.test(teks(x)));
  const QA = [];
  const jn = jenisAda(c).map(j => [j, ks.filter(x => x.jenis === j).length]).filter(x => x[1]);
  st.sudah.clear(); QA.push(["Berapa jumlah kejadian bencana pada periode ini?", ks.length ? akhiri(`Kami mencatat ${kata(ks.length)} kejadian menonjol di ${kata(b.nProv)} provinsi: ${daftarUcap(jn.map(([j, n]) => `${kata(n)} ${JENIS[j].nama.toLowerCase()}`))}`) : TB]);
  const per = kelompokProv(ks).map(([p, xs]) => [p, xs.length]), mx = Math.max(0, ...per.map(x => x[1])), atas = per.filter(x => x[1] === mx).slice(0, 3);
  st.sudah.clear(); QA.push(["Provinsi mana yang paling banyak mengalami kejadian?", ks.length ? akhiri(daftarUcap(atas.map(([p, n]) => `${nProv(c, p)} dengan ${kata(n)} kejadian`))) : TB]);
  const kh = ks.filter(x => x.jenis === "karhutla"), luas = cocok(/\bha\b/, kh).sort((x, y) => (angkaTeks(y.utama) || 0) - (angkaTeks(x.utama) || 0))[0];
  st.sudah.clear(); QA.push(["Berapa luas lahan yang terbakar?", luas ? akhiri(`Kejadian karhutla dengan luas tercatat terbesar berada di ${lok(luas)}, yaitu ${ucapTeks(luas.utama, st)}`) : TB]);
  const bk = kh.filter(x => x.status === "belum");
  st.sudah.clear(); QA.push(["Berapa kejadian karhutla yang belum padam, dan di mana?", !kh.length ? TB : bk.length ? akhiri(`${huruf1(kata(bk.length))} kejadian karhutla belum selesai penanganannya, yaitu ${daftarUcap(bk.map(x => x.lokasi ? `${x.lokasi} di ${nProv(c, x.prov)}` : nProv(c, x.prov)))}`) : "Tidak ada kejadian karhutla berstatus belum selesai pada laporan ini."]);
  const dk = cocok(/jiwa|pengungsi|korban|KK|meninggal|luka|terdampak/i, ks);
  st.sudah.clear(); QA.push(["Berapa korban, pengungsi, atau warga terdampak?", dk.length ? dk.map(x => akhiri(`${lok(x)}: ${[x.utama, x.kedua].filter(Boolean).map(t => ucapTeks(t, st)).join(", ")}`)).join(" ") : TB]);
  const ga = tambahan(c).filter(x => x.jenis === "gunungapi"), gk = ks.filter(x => x.jenis === "gunungapi");
  st.sudah.clear(); QA.push(["Bagaimana status gunung api saat ini?", ga.length || gk.length ? [...ga.map(x => akhiri(`${ucapTeks(x.judul, st)}${x.isi ? ": " + ucapTeks(x.isi, st) : ""}`)), ...gk.map(x => kalimatKejadian(c, x, st))].join(" ") : TB]);
  const td = (c.isi.tindak || []).filter(penuh), sd = [...td, ...ks.map(x => ({judul: lok(x), isi: teks(x)}))].filter(x => /personel|helikopter|pesawat|water bombing|armada/i.test(`${x.judul} ${x.isi}`));
  st.sudah.clear(); QA.push(["Berapa personel dan peralatan yang dikerahkan?", sd.length ? sd.map(x => akhiri(`${ucapTeks(x.judul, st)}${x.isi ? ": " + ucapTeks(x.isi, st) : ""}`)).join(" ") : TB]);
  st.sudah.clear(); QA.push(["Apa langkah BNPB selanjutnya?", td.length ? td.map(x => akhiri(`${ucapTeks(x.judul, st)}${x.isi ? ": " + ucapTeks(x.isi, st) : ""}`)).join(" ") : TB]);
  return QA;
}

/* naskah(c) -> {teks, kata, menit, label, bagian, lampiran}. Satu [SLIDE n] per halaman rencana(c), urut sama dengan deck konpers. */
function naskah(c) {
  const r = rencana(c), st = {sudah: new Set()}, ks = kejadian(c), b = {nProv: new Set(ks.map(x => x.prov).filter(Boolean)).size};
  const bagian = r.map((h, n) => ({slide: n + 1, id: h.id, paragraf: bagianNaskah(c, h, st, b)}));
  const lampiran = tanyaJawab(c, b);
  const badan = bagian.map(x => `[SLIDE ${x.slide}]\n${x.paragraf.join("\n\n")}`).join("\n\n");
  const tl = "ANTISIPASI PERTANYAAN WARTAWAN\n\n" + lampiran.map(([q, a], i) => `Pertanyaan ${i + 1}: ${q}\nJawaban: ${a}`).join("\n\n");
  const nKata = t => (t.replace(/\[SLIDE \d+\]/g, "").match(/\S+/g) || []).length, kataBaca = nKata(badan);   // lampiran tidak dibacakan
  const menit = kataBaca / KATA_PER_MENIT;
  return {teks: `${badan}\n\n${tl}`, badan, lampiran: tl, qa: lampiran, bagian, kata: kataBaca, menit, label: menit < 1 ? "kurang dari satu menit" : `sekitar ${Math.round(menit)} menit`};
}

/* ------------------------------------------------------------ pemecah daftar Matador */
/* items dipecah ke halaman: jumlah BARIS (hitung(item), dipagari 1..maks) per halaman tidak pernah > maks. */
function pecahHalaman(items, hitung = () => 1, maks = 5) {
  const hal = []; let cur = [], n = 0;
  for (const it of items) {
    const b = Math.min(maks, Math.max(1, hitung(it)));
    if (n + b > maks) { hal.push(cur); cur = []; n = 0; }
    cur.push(it); n += b;
  }
  if (cur.length) hal.push(cur);
  return hal;
}

window.LaporanKonpers = {rencana, naskah, imbauan, bagiJenis, jenisAda, perhatian, pecahHalaman, ucap, ucapTeks, kata, statusUcap, nProv, kejadian, tambahan, kelompokProv, TB, KATA_PER_MENIT, PER_HAL, STATUS};
})();
