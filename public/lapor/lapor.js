/* Lapor Bencana BNPB (/lapor): aplikasi pesan dengan tab Beranda, Laporan, Bantuan, dan layar chat berkartu langkah.
   Mesin di server (src/lapor_mesin.js lewat /api/lapor/*); layar ini hanya menampilkan dan mengirim jawaban.
   - Teks bot berformat WA (*tebal*) disisipkan sebagai node teks, tidak pernah sebagai HTML.
   - Kartu langkah mengikuti keadaan mesin: minta (setuju, identitas, lokasi, jenis, sub, foto), form (angka, waktu, RT/RW), pilihan, banyak.
   - Cache: percakapan dan daftar laporan disimpan di localStorage per nomor supaya muat ulang langsung tampil.
   - Suara (id-ID) bila peramban mendukung; foto dikecilkan di peramban (foto_kecil.js), EXIF dibaca dulu (exif.js). */
import {maskot} from "/lapor/maskot.js?v=12"; // bervesi: berkas .js disajikan immutable
import {ilustrasi, adaIlustrasi} from "/lapor/ilustrasi.js?v=3";
/* Pelapor mengetik nomor WhatsApp tanpa kode (KEPUTUSAN-LAPOR-AI K65, D99-D102); di situs, nomor ketikan diikat ke perangkat lewat kuki HttpOnly
   dari Worker. Sesi /masuk yang sudah ada tetap dipakai bila ada. Kiriman POST wajib x-pb: 1. */
const LOKAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
{ const asli = window.fetch.bind(window);
  window.fetch = (u, o = {}) => (String(u).startsWith("/api/lapor/") && (o.method || "GET").toUpperCase() !== "GET") ? asli(u, {...o, credentials: "same-origin", headers: {...(o.headers || {}), "x-pb": "1"}}) : asli(u, o); }
const $ = id => document.getElementById(id);
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const ikon = (id, kelas) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("aria-hidden", "true"); if (kelas) s.setAttribute("class", kelas);
  const u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", `#${id}`); s.append(u); return s; };
const AVATAR = "/img/lembaga/sumber-bnpb.png";
const IKON_JENIS = {banjir: "b-banjir", longsor: "b-longsor", abrasi: "b-gelombang", cuaca: "b-angin", kekeringan: "b-matahari", karhutla: "b-api", gempa: "b-gempa", tsunami: "b-gelombang", erupsi: "b-gunung", kebakaran_gedung: "b-gedung"};
const ILUS_JENIS = {}; // jenis tanpa foto memakai ilustrasi
const KREDIT = {kekeringan: "Foto: Crisco 1492, CC BY-SA 4.0", kebakaran_gedung: "Foto: CEphoto, Uwe Aranas, CC BY-SA 3.0"}; // foto berlisensi atribusi
const GAMBAR = {kebakaran_gedung: "kebakaran", kekeringan: "kekeringan", banjir: "banjir", longsor: "longsor", abrasi: "rob", cuaca: "cuaca", gempa: "gempa", tsunami: "tsunami", erupsi: "gunungapi", karhutla: "karhutla"};
const KELOMPOK_IKON = {"Kejadian": "i-kejadian", "Korban": "i-korban", "Warga terdampak": "i-orang", "Pengungsian": "i-pengungsian", "Warga terdampak dan mengungsi": "i-pengungsian", "Kerusakan rumah": "i-rumah", "Fasilitas dan jalan": "i-fasilitas", "Data khusus": "i-khusus", "Kebutuhan": "i-kebutuhan"};
const KEPALA = {tempat: ["i-pengungsian", "Titik pengungsian"], pilihan: ["i-daftar", "Pilih salah satu"], setuju: ["i-status", "Persetujuan data"], identitas: ["i-orang", "Data pelapor"], lokasi: ["i-lokasi", "Lokasi kejadian"], jenis: ["i-kejadian", "Jenis bencana"],
  sub: ["i-kejadian", "Karakteristik"], foto: ["i-kamera", "Foto kejadian"]};
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const log = $("log"), gulir = $("gulir"), wadah = $("kartuLangkah"), fPesan = $("fPesan"), iTeks = $("iTeks"), statusEl = $("status"), app = $("app");
let kembaliKe = "beranda", wa = null, sibuk = false, cache = {transkrip: [], laporan: []}, terakhir = null, posisi = null;

const simpan = {
  baca(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  tulis(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* mode privat atau penuh: tanpa cache */ } },
};
const kunciCache = () => `lapor-cache-${wa}`;
const simpanCache = () => simpan.tulis(kunciCache(), cache);

/* ============ navigasi ============ */
function ke(tab) {
  for (const s of document.querySelectorAll(".lp-layar")) s.hidden = s.dataset.tab !== tab;
  if (tab !== "privasi") kembaliKe = tab;
  $("lChat").hidden = tab !== "chat"; $("lMasuk").hidden = tab !== "masuk"; $("lPrivasi").hidden = tab !== "privasi"; $("lInfo").hidden = tab !== "info";
  app.classList.toggle("di-chat", ["chat", "masuk", "info", "privasi"].includes(tab));
  for (const b of document.querySelectorAll("#tab button")) b.toggleAttribute("aria-current", b.dataset.ke === tab) || b.removeAttribute("aria-current");
  for (const b of document.querySelectorAll("#tab button")) { if (b.dataset.ke === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
  if (tab === "laporan") { $("titikBaru").hidden = true; tampilDaftarLaporan(); }
  if (tab === "alun") tampilAlun();
  if (tab === "tentang" && !$("heroTentang").querySelector(".lp-hero-tengah")) { // salin maskot dan kartu kontak beranda tanpa id ganda
    for (const k of [".lp-hero-tengah", ".lp-hero-kanan"]) { const c = document.querySelector(`#lBeranda ${k}`)?.cloneNode(true); if (!c) continue; c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id")); c.querySelectorAll("svg.sg").forEach(s => { s.outerHTML = maskot(s.dataset.pose); }); /* gradien salinan merujuk id beranda yang tersembunyi: gambar ulang */ $("heroTentang").append(c); } }
  if (tab === "chat") requestAnimationFrame(() => gulir.scrollTo({top: gulir.scrollHeight}));
}
// menu: Bantuan dilebur ke Beranda, diganti Kebijakan privasi (pemilik 19 Nov 2026)
document.querySelectorAll("#tab button[data-ke]").forEach(b => b.addEventListener("click", () => b.dataset.ke === "lapor" ? bukaChat() : b.dataset.ke === "privasi" ? bukaPrivasi() : ke(b.dataset.ke)));
$("bKembali").addEventListener("click", () => { ke("beranda"); tampilBeranda(); });
$("bLaporBaru").addEventListener("click", () => bukaChat()); $("bDarurat")?.addEventListener("click", () => bukaChat(true));
$("bCekStatus").addEventListener("click", () => { ke("chat"); kirim({teks: "status", tampil: "Cek status laporan"}); });
document.querySelectorAll("[data-aksi]").forEach(b => b.addEventListener("click", () => ({lapor: () => bukaChat(), darurat: () => bukaChat(true), info: () => bukaInfo("info"), prediksi: () => bukaInfo("prediksi"),
  penting: () => bukaInfo("penting"), edukasi: () => { ke("bantuan"); pilihGrup("Edukasi siaga"); }})[b.dataset.aksi]()));
$("bSemuaBantu").addEventListener("click", () => ke("bantuan"));

/* ============ pesan di log ============ */
function teksWa(e, teks) {
  for (const [i, bagian] of String(teks).split(/\*([^*\n]+)\*/).entries()) {
    if (!bagian) continue;
    if (i % 2) e.append(el("strong", null, bagian)); else e.append(bagian);
  }
}
function tambah(dari, teks, {galat = false, foto = null, berkas = null, simpanKe = true} = {}) {
  if (dari === "bot") teks = trStatis(teks);   // teks bot buatan layar dari kamus statis; balasan server sudah dalam bahasa pilihan
  const li = el("li", dari), sebelum = log.lastElementChild;
  if (galat) li.classList.add("lp-galat");
  const ganti = !sebelum || !sebelum.classList.contains(dari);
  if (ganti) li.classList.add("baru");
  if (dari !== "saya") {
    const img = el("img"); img.src = AVATAR; img.alt = ""; img.width = img.height = 28;
    if (!ganti) sebelum.querySelector(":scope > img")?.classList.add("kosong");
    li.append(img);
  }
  const g = el("div", "lp-gelembung");
  if (foto) { const f = el("img", "lp-foto-kirim"); f.src = foto; f.alt = "Foto yang dikirim"; g.append(f); }
  if (berkas) { const a = el("span", "lp-lampiran"); a.append(el("span", null, "PDF"), berkas); g.append(a); }
  if (teks) teksWa(g, teks);
  li.append(g);
  if (dari !== "saya" && ganti) log.append(el("li", "tengah lp-pengirim-baris", dari === "admin" ? "Admin BNPB" : "Asisten AI Lapor Bencana"));
  log.append(li);
  if (simpanKe) { cache.transkrip.push({dari, teks, foto: foto?.startsWith("data:") ? null : foto, berkas}); cache.transkrip = cache.transkrip.slice(-200); simpanCache(); }
  requestAnimationFrame(() => gulir.scrollTo({top: gulir.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}));
}

/* ============ kartu langkah ============ */
function kartu(kunci, judul) {
  const [ik, jd] = KEPALA[kunci] || [kunci, judul];
  const k = el("section", "lp-langkah"), kp = el("div", "lp-langkah-kepala"), isi = el("div", "lp-langkah-isi");
  kp.append(ikon(ik), judul || jd); k.append(kp, isi);
  // salah pilih: kembali ke pertanyaan sebelumnya (pemilik 19 Nov 2026)
  if (terakhir?.bisaKembali && !["setuju", "identitas"].includes(kunci)) { const kb = el("button", "lp-kembali-langkah"); kb.type = "button"; kb.append(ikon("i-kembali"), "Kembali");
    kb.setAttribute("aria-label", "Kembali ke pertanyaan sebelumnya"); kb.addEventListener("click", () => kirim({teks: "kembali", kembali: true, tampil: false})); kp.append(kb); }
  wadah.replaceChildren(k);
  return isi;
}
function tombolOpsi(label, ket, aksi, kelas = "") {
  const b = el("button", kelas); b.type = "button"; b.append(el("b", null, label)); if (ket) b.append(el("small", null, ket));
  b.addEventListener("click", aksi); return b;
}

const ikonKebutuhan = o => [  // kelompok rentan dan layanan terganggu berikon sendiri (pemilik 19 Nov 2026 "bagusin")
  [/^tidak ada|^semua masih|^belum ada/i, "i-centang"], [/^tidak tahu/i, "i-bantuan"], [/hamil|menyusui|disabilitas|lansia/i, "i-orang"], [/listrik/i, "k-listrik"], [/sinyal|telepon/i, "i-telepon"],
  [/makan/i, "k-makan"], [/air/i, "b-banjir"], [/selimut|pakaian/i, "k-baju"], [/obat|kesehatan/i, "i-plus"], [/tenda|terpal/i, "k-tenda"],
  [/bayi|lansia/i, "k-bayi"], [/sembako|pangan/i, "i-kebutuhan"], [/sandang/i, "k-baju"], [/matras|tikar|kasur/i, "k-kasur"], [/family kit/i, "k-sabun"], [/kidsware/i, "k-bayi"], [/tangki/i, "b-banjir"], [/mandi|kebersihan/i, "b-banjir"], [/tandon|penampungan/i, "b-banjir"], [/mesin|selang|pemadam/i, "b-api"], [/masker/i, "i-plus"], [/karung|bronjong/i, "b-longsor"], [/evakuasi|perahu/i, "k-perahu"], [/alat berat/i, "k-alat"], [/lainnya/i, "i-tambah-teks"], [/belum/i, "i-centang"]].find(([r]) => r.test(o))?.[1] || "i-kebutuhan";
const ikonOpsi = o => [[/^ganti/i, "i-orang"], [/^benar|^ya\b|^setuju|kirim/i, "i-centang"], [/^bukan|^tidak setuju|batal/i, "i-tutup"], [/tidak tahu|ragu/i, "i-bantuan"],
  [/tanpa foto|lanjut/i, "i-panah"], [/ubah/i, "i-daftar"], [/lokasi|desa|gps/i, "i-lokasi"], [/foto/i, "i-kamera"],
  [/petir/i, "b-petir"], [/hujan es|butiran es/i, "b-es"], [/hujan|kemarau/i, "b-hujan"], [/angin|puting|siklon/i, "b-angin"],
  [/permukiman/i, "i-rumah"], [/jauh ke darat|darat/i, "i-lokasi"], [/pantai saja/i, "b-gelombang"], [/gempa kuat terasa/i, "b-gempa"],
  [/surut|turun|mereda|berhenti|padam/i, "k-turun"], [/naik|masih/i, "k-naik"],
  [/sungai|meluap|tanggul|bendungan|pasang|genang|air|sumur|banjir|tsunami|gelombang|pantai|ombak/i, "b-banjir"],
  [/tanah|lereng|tebing|longsor|timbun/i, "b-longsor"], [/pohon|sawah|kebun|tanaman|ternak|semak/i, "k-daun"], [/listrik|korsleting|baliho|tiang/i, "k-listrik"],
  [/api|terbakar|gambut|hutan|asap|kompor|gas/i, "b-api"], [/guncang|gempa|retak|roboh/i, "b-gempa"], [/abu|erupsi|awan panas|lahar|batu|kerikil|kawah/i, "b-gunung"],
  [/toko|gedung|kantor|pasar/i, "b-gedung"], [/kampung|dusun/i, "i-rumah"], [/satu titik|titik/i, "i-lokasi"], [/rumah|atap/i, "i-rumah"], [/jalan/i, "i-lokasi"], [/mengungsi|tempat tinggi|warga/i, "i-pengungsian"],
  [/menit|bulan|sejak|lama|berlangsung/i, "k-jam"], [/bantuan|beli|membeli|mengambil/i, "i-kebutuhan"], [/tidak ada|tanpa/i, "i-centang"]].find(([r]) => r.test(o))?.[1];
/* pilihan tinggi air: orang dewasa 170 cm dengan air setinggi pilihannya (pemilik 19 Nov 2026: "bagusin") */
/* pilihan bertingkat tanpa ikon: batang naik, yang terisi sebanyak urutan pilihannya (besar kecilnya terlihat sekilas) */
const gambarTingkat = (i, n) => { const k = Math.max(2, Math.min(n, 5)); return `<svg viewBox="0 0 ${k * 8} 24" aria-hidden="true" class="lp-tingkat-svg">${Array.from({length: k}, (_, x) => `<rect x="${x * 8 + 1}" y="${22 - (x + 1) * (20 / k)}" width="6" height="${(x + 1) * (20 / k)}" rx="1.5" class="${x <= i * (k - 1) / Math.max(1, n - 1) ? "isi" : ""}"/>`).join("")}</svg>`; };
// tinggi air dari keterangan opsi, cm atau m ("Sekitar 50 cm", "Sekitar 0,5 m", "Lebih dari 1,7 m"); gambar orang dewasa setinggi 170 cm
const tinggiAir = ket => { const m = /(sekitar|lebih dari) ([\d,.]+) ?(cm|m)\b/i.exec(ket || ""); if (!m) return null;
  const cm = Number(m[2].replace(",", ".")) * (m[3].toLowerCase() === "m" ? 100 : 1); return cm + (/lebih/i.test(m[1]) ? 20 : 0); };
const gambarAir = cm => { const y = 54 - Math.min(cm, 190) / 190 * 50;
  return `<svg viewBox="0 0 40 56" aria-hidden="true" class="lp-air"><circle cx="20" cy="9" r="5" class="lp-air-orang"/><path d="M13 18h14l-2 18h-3l-1 16h-2l-1-16h-3Z" class="lp-air-orang"/><path d="M0 ${y}q5-2 10 0t10 0 10 0 10 0V56H0Z" class="lp-air-air"/></svg>`; };
/* jumlah kolom yang membuat baris rata: 6 = 3+3, 8 = 4+4; sisa diletakkan di tengah lewat flex (pemilik 19 Nov 2026: "harus selalu simetris") */
const kolomSimetris = n => n <= 4 ? n : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : n % 5 === 0 ? 5 : Math.ceil(n / Math.ceil(n / 4));
function kartuPilihan(j) {
  const isi = kartu(j.minta || "pilihan", j.minta ? null : ((j.inti || j.balasan)?.match(/\*([^*]+)\*/)?.[1]?.replace(/\.$/, "") || (j.banyak ? "Pilih yang sesuai" : "Pilih salah satu")));
  // kalimat pertanyaan ikut tampil di kepala kartu, di bawah judul (pemilik 19 Nov 2026 "harusnya pertanyaan ini muncul di sini")
  const tanyaT = !j.minta && (j.inti || j.balasan || "").replace(/^\*[^*]+\*\s*/, "").split("\n").map(x => x.trim()).filter(Boolean)[0];
  if (tanyaT && tanyaT.length < 200) { const kp = isi.closest(".lp-langkah")?.querySelector(".lp-langkah-kepala"); kp?.classList.add("lp-kepala-tanya"); const jd = el("span", "lp-kepala-teks");
    const nodes = [...(kp?.childNodes || [])].filter(n => n.nodeType === 3); const judulT = nodes.map(n => n.textContent).join(""); nodes.forEach(n => n.remove());
    jd.append(el("b", null, judulT), el("small", null, tanyaT.replace(/\*/g, ""))); kp?.querySelector("svg")?.after(jd); } // judul = judul pertanyaan, di baris mana pun
  if (j.minta === "jenis" && j.kunci) { // kartu bergambar
    const g = el("div", "lp-jenis");
    j.kunci.forEach((id, i) => {
      const b = el("button"); b.type = "button";
      if (GAMBAR[id]) b.style.backgroundImage = `url(/img/bencana-${GAMBAR[id]}.jpg)`; else { b.classList.add("tanpa-gambar"); if (ILUS_JENIS[id]) b.insertAdjacentHTML("afterbegin", ilustrasi(ILUS_JENIS[id])); }
      const ik = el("span", "lp-jenis-ikon"); ik.append(ikon(IKON_JENIS[id] || "i-kejadian")); b.append(ik);
      if (KREDIT[id]) b.append(el("span", "lp-kredit", KREDIT[id]));
      if (i < (j.saran || 0)) b.append(el("span", "saran", "Paling mirip"));
      b.append(el("b", null, j.pilihan[i]), el("small", null, j.ket?.[i] || ""));
      b.addEventListener("click", () => kirim({teks: String(i + 1), tampil: j.pilihan[i]}));
      g.append(b);
    });
    isi.closest(".lp-langkah").classList.add("lp-langkah-bebas"); // tanpa kontainer berkepala gelap (pemilik 19 Nov 2026)
    isi.append(g); return;
  }
  if (j.minta === "sub" && j.kunci?.[0]) { // karakteristik: ubin berikon jenis, "Tidak tahu" berikon tanya
    const d = el("div", "lp-opsi lp-opsi-ikon lp-simetris"), jid = j.kunci[0]; d.style.setProperty("--kol", kolomSimetris(j.pilihan.length));
    j.pilihan.forEach((o, i) => { const b = tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o})); const u = el("span", "lp-opsi-ubin"); u.append(ikon(i === j.pilihan.length - 1 ? "i-bantuan" : IKON_JENIS[jid] || "i-kejadian"));
      b.prepend(u); d.append(b); });
    isi.closest(".lp-langkah").classList.add("lp-langkah-bebas"); isi.append(d); return;
  }
  if (j.banyak) { // pilihan ganda berikon; "Lainnya" membuka kotak isian sendiri (pemilik 19 Nov 2026: "kasih icon", "ada lainnya")
    const dipilih = new Set(), d = el("div", "lp-opsi-bagian"), n = j.pilihan.length;
    // tiap bagian (Logistik, Peralatan, Lainnya) kisi simetris sendiri: 9 = 3x3, 2 = sejajar (pemilik 19 Nov 2026: "harus selalu simetris")
    const bagian = new Map(); j.pilihan.forEach((o, i) => { const g = j.grup?.[i] || ""; bagian.set(g, [...(bagian.get(g) || []), i]); });
    const kotak = new Map([...bagian].map(([g, idx]) => { const k = el("div", "lp-opsi lp-opsi-ikon lp-opsi-banyak lp-simetris"); k.style.setProperty("--kol", kolomSimetris(idx.length)); if (g) d.append(el("p", "lp-opsi-grup", g)); d.append(k); return [g, k]; }));
    const lain = el("input"); lain.type = "text"; lain.placeholder = "Tulis kebutuhan lain, misalnya genset atau popok"; lain.maxLength = 120;
    const lLain = el("label", "lp-isi lp-lain"); lLain.append("Kebutuhan lain", lain); lLain.hidden = true;
    // pilihan "tidak ada" dan sejenisnya meniadakan pilihan lain, dan sebaliknya (pemilik 19 Nov 2026: "masa bisa milih belum ada kebutuhan mendesak tapi bisa milih yang lain")
    const TUNGGAL = /^(Belum ada|Tidak ada|Tidak tahu|Semua masih)/i, tombol = [], asli = i => (j.pilihanAsli || j.pilihan)[i];   // aturan memakai label Indonesia, bukan terjemahan
    const segar = () => { tombol.forEach((t, k) => t.setAttribute("aria-pressed", String(dipilih.has(k)))); s.disabled = !dipilih.size;
      const iL = (j.pilihanAsli || j.pilihan).indexOf("Lainnya"); lLain.hidden = !(iL >= 0 && dipilih.has(iL)); };
    j.pilihan.forEach((o, i) => { const b = tombolOpsi(o, j.ket?.[i], () => {
        if (dipilih.has(i)) dipilih.delete(i);
        else { if (TUNGGAL.test(asli(i))) dipilih.clear(); else for (const k of [...dipilih]) if (TUNGGAL.test(asli(k))) dipilih.delete(k); dipilih.add(i); }
        segar(); if (asli(i) === "Lainnya" && !lLain.hidden) lain.focus(); }); tombol[i] = b;
      const u = el("span", "lp-opsi-ubin"); u.append(ikon(ikonKebutuhan(o))); b.prepend(u); b.setAttribute("aria-pressed", "false");
      kotak.get(j.grup?.[i] || "").append(b); });
    const s = el("button", "lp-utama", "Simpan pilihan"); s.type = "button"; s.disabled = true;
    s.addEventListener("click", () => kirim({pilih: [...dipilih], lain: lain.value.trim(), tampil: [...dipilih].map(i => asli(i) === "Lainnya" && lain.value.trim() ? `Lainnya: ${lain.value.trim()}` : j.pilihan[i]).join(", ")}));
    isi.append(d, lLain, s); return;
  }
  if (j.pilihan.join("|") === "Kirim|Ubah|Batal") { // menu ringkasan: tiga aksi berbobot berbeda
    isi.closest(".lp-langkah").classList.add("lp-langkah-ringkas"); const kp = isi.closest(".lp-langkah").querySelector(".lp-langkah-kepala"); if (kp) { kp.replaceChildren(ikon("i-status"), "Periksa lalu kirim"); }
    const d = el("div", "lp-ringkas-aksi");
    for (const [i, t, ket, ik, kls] of [[0, "Kirim laporan", "Diterima BNPB, diteruskan ke BPBD setempat", "i-kirim", "utama"], [1, "Ubah isian", "Perbaiki yang belum tepat", "i-daftar", ""], [2, "Batal", "Laporan ini tidak dikirim", "i-tutup", "bahaya"]]) {
      const b = tombolOpsi(t, ket, () => kirim({teks: String(i + 1), tampil: j.pilihan[i]}), kls); const u = el("span", "lp-opsi-ubin"); u.append(ikon(ik)); b.prepend(u); d.append(b); }
    isi.append(d); return;
  }
  const dua = j.pilihan.length === 2 && !j.ket?.some(Boolean);
  const d = el("div", `lp-opsi${dua ? " dua" : ""}${j.minta === "setuju" ? "" : " lp-opsi-ikon lp-opsi-banyak"}`), n = j.pilihan.length;
  if (j.minta !== "setuju") { d.style.setProperty("--kol", kolomSimetris(n)); d.classList.add("lp-simetris"); if (kolomSimetris(n) >= 5) d.classList.add("lp-tegak"); } // lima sebaris: gambar di atas, teks di bawah supaya tidak terlipat
  j.pilihan.forEach((o, i) => { const b = tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o}), i === 0 && j.minta === "setuju" ? "utama" : "");
    if (j.minta !== "setuju") { const u = el("span", "lp-opsi-ubin"), air = tinggiAir(j.ket?.[i]), ik = ikonOpsi(o);
      if (air != null) { u.classList.add("lp-ubin-air"); u.innerHTML = gambarAir(air); } else if (ik) u.append(ikon(ik)); else { u.classList.add("lp-ubin-tingkat"); u.innerHTML = gambarTingkat(i, j.pilihan.filter(x => !/tidak tahu/i.test(x)).length); } b.prepend(u); } // tinggi air bergambar, ikon bila cocok, selain itu nomor
    d.append(b); });
  isi.append(d);
  if (j.minta === "setuju") isi.append(Object.assign(el("a", "lp-catatan-kecil", "Baca kebijakan privasi"), {href: "/lapor/privasi.html", target: "_blank"}));
}

function kartuSetuju(j) {
  const isi = kartu("setuju"), atas = el("div", "lp-setuju"), m = el("div"); m.innerHTML = maskot("sapa");
  const ul = el("ul");
  for (const [ik, t] of [["i-pesan", "Percakapan, nomor WhatsApp, lokasi, dan foto Anda dicatat untuk penanganan bencana."],
    ["i-orang", "Hanya petugas BNPB dan BPBD yang menangani yang bisa membacanya."], ["i-status", "Data Anda tidak ditampilkan ke publik."]]) { const li = el("li"); li.append(ikon(ik), t); ul.append(li); }
  atas.append(m, ul);
  const d = el("div", "lp-opsi dua");
  j.pilihan.forEach((o, i) => d.append(tombolOpsi(o, null, () => kirim({teks: String(i + 1), tampil: o}), i === 0 ? "utama" : "")));
  const priv = el("button", "lp-catatan-kecil lp-tautan-polos", "Baca kebijakan privasi lengkap"); priv.type = "button"; priv.addEventListener("click", bukaPrivasi);
  isi.append(atas, d, priv);
}

/* lanjutAwal: dipanggil dari tanyaNomor sebelum nomor dikenal (K65). Kolom WhatsApp bisa diisi; isian disimpan di idAwal dan
   dikirim diam-diam saat mesin memintanya sesudah persetujuan (pemilik 20 Nov 2026: "tanya dulu warga atau BPBD terus namanya siapa"). */
let idAwal = null;
function kartuIdentitas(lanjutAwal = null) {
  const isi = kartu("identitas");
  let peran = "warga";
  const nama = el("input"); nama.type = "text"; nama.autocomplete = "name"; nama.maxLength = 80; nama.required = true; nama.placeholder = "Nama lengkap";
  const lNama = el("label", "lp-isi"); lNama.append("Nama", nama);
  const nomor = el("div", "lp-nomor-isi"); const ino = el("input"); ino.setAttribute("aria-label", "Nomor WhatsApp");
  if (lanjutAwal) { Object.assign(ino, {type: "tel", inputMode: "numeric", autocomplete: "tel-national", maxLength: 13, placeholder: "812 3456 7890"});
    ino.addEventListener("input", () => { let v = ino.value.replace(/\D/g, ""); if (v.startsWith("62")) v = v.slice(2); if (v.startsWith("0")) v = v.slice(1); ino.value = v.slice(0, 13); }); }
  else { ino.value = wa.slice(2); ino.readOnly = true; } nomor.append(el("span", "lp-awalan", "+62"), ino);
  const lWa = el("div", "lp-isi"); lWa.append("WhatsApp", nomor);
  const seg = el("div", "lp-segmen lp-peran"), bpbd = el("div", "lp-baris-isian"); bpbd.hidden = true;
  const kab = el("input"); kab.placeholder = "Kabupaten/kota"; kab.maxLength = 80; const jab = el("input"); jab.placeholder = "Jabatan"; jab.maxLength = 80;
  const lK = el("label", "lp-isi"); lK.append("BPBD", kab); const lJ = el("label", "lp-isi"); lJ.append("Jabatan", jab); bpbd.append(lK, lJ);
  for (const [k, t, ik, ket] of [["warga", "Warga", "i-orang", "Saya melihat atau mengalami kejadian"], ["bpbd", "Petugas BPBD", "i-status", "Saya melapor atas nama BPBD"]]) {
    const b = el("button"); b.type = "button"; const u = el("span", "lp-opsi-ubin"); u.append(ikon(ik)); const tx = el("span", "lp-peran-teks"); tx.append(el("b", null, t), el("small", null, ket)); const tanda = el("span", "lp-peran-tanda"); tanda.append(ikon("i-centang")); b.append(u, tx, tanda); b.setAttribute("aria-pressed", String(k === peran));
    b.addEventListener("click", () => { peran = k; seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); bpbd.hidden = k !== "bpbd"; });
    seg.append(b);
  }
  const lPeran = el("div", "lp-isi"); lPeran.append("Melapor sebagai", seg);
  const s = el("button", "lp-utama", "Lanjut"); s.type = "button"; s.append(ikon("i-panah"));
  isi.closest(".lp-langkah").classList.add("lp-langkah-id"); seg.classList.add("lp-peran");
  s.addEventListener("click", () => {
    if (nama.value.trim().length < 2) { nama.focus(); statusEl.textContent = "Tulis nama Anda."; return; }
    if (peran === "bpbd" && (kab.value.trim().length < 3 || jab.value.trim().length < 2)) { statusEl.textContent = "Petugas BPBD wajib mengisi kabupaten/kota dan jabatan."; return; }
    const form = {nama: nama.value.trim(), peran, kab: kab.value.trim(), jabatan: jab.value.trim()}, tampil = `${form.nama}, ${peran === "bpbd" ? `Petugas BPBD ${form.kab}` : "warga"}`;
    if (!lanjutAwal) return kirim({form, tampil});
    if (!/^8\d{8,12}$/.test(ino.value)) { ino.focus(); statusEl.textContent = "Nomor WhatsApp diawali 8, contoh 812 3456 7890."; return; }
    idAwal = form; wadah.replaceChildren(); tambah("saya", `${tampil}\n+62 ${ino.value}`, {simpanKe: false});
    mulai(`62${ino.value}`, {diChat: true}).then(lanjutAwal);
  });
  const baris = el("div", "lp-id-baris"); baris.append(lNama, lWa);
  isi.append(baris, lPeran, bpbd, s);
  nama.focus();
}

/* kartu lokasi bersama (chat lapor dan layar info): tombol GPS berupa ubin terang, lalu pencarian; galat tampil di dalam kartu
   (pemilik 19 Nov 2026: kepala gelap + tombol gelap selebar layar "aneh banget") */
function isiLokasi(wadahIsi, {judul, ket, pakaiPosisi, pilihCari, kabupatenCukup, terakhir}) {
  const kp = el("div", "lp-lok-kepala"), ik = el("span", "lp-lok-ikon"); ik.append(ikon("i-lokasi"));
  const tx = el("div"); tx.append(el("b", null, judul), el("small", null, ket)); kp.append(ik, tx);
  const gps = el("button", "lp-lok-gps"); gps.type = "button";
  const gIk = el("span", "lp-lok-gps-ikon"); gIk.append(ikon("i-lokasi"));
  const gTx = el("span", "lp-lok-gps-teks"), gB = el("b", null, "Pakai lokasi saat ini"), gS = el("small", null, "Paling cepat, lewat GPS perangkat");
  gTx.append(gB, gS); gps.append(gIk, gTx, ikon("i-panah"));
  const galat = el("p", "lp-lok-galat"); galat.hidden = true;
  gps.addEventListener("click", () => {
    galat.hidden = true; gps.disabled = true; gB.textContent = "Membaca lokasi"; gS.textContent = "Tunggu sebentar";
    bacaPosisi(p => pakaiPosisi(p), pesan => { gps.disabled = false; gB.textContent = "Coba lagi"; gS.textContent = "Pakai lokasi saat ini"; galat.textContent = pesan; galat.hidden = false; });
  });
  const cari = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = "Cari kab/kota, kecamatan, desa, atau nama jalan"; q.setAttribute("aria-label", "Cari tempat");
  cari.append(ikon("i-cari"), q);
  const hasil = el("ul", "lp-cari-hasil"); let tunda;
  q.addEventListener("input", () => {
    clearTimeout(tunda);
    if (q.value.trim().length < 3) { hasil.replaceChildren(); return; }
    tunda = setTimeout(async () => {
      try { await cariTempat(q.value.trim(), "", hasil, pilihCari, kabupatenCukup); }
      catch { hasil.replaceChildren(el("li", "lp-catatan-kecil", "Pencarian gagal. Coba lagi.")); }
    }, 300);
  });
  const blok = el("div", "lp-lok"); blok.append(kp);
  if (terakhir) { const t = el("button", "lp-lok-gps terakhir"); t.type = "button"; const tI = el("span", "lp-lok-gps-ikon"); tI.append(ikon("i-centang"));
    const tT = el("span", "lp-lok-gps-teks"); tT.append(el("b", null, terakhir.judul), el("small", null, `Daerah terakhir, ${terakhir.sub}`)); t.append(tI, tT, ikon("i-panah"));
    t.addEventListener("click", terakhir.aksi); blok.append(t); }
  const baris = el("div", "lp-lok-baris"); baris.append(gps, el("p", "lp-atau", "atau"), cari); // GPS, atau, cari: satu baris tetap
  blok.append(baris, galat, hasil);
  wadahIsi.append(blok);
}
/* GPS: akurasi tinggi dulu, bila gagal coba sekali lagi dengan akurasi biasa (laptop tanpa GPS sering gagal di mode tinggi) */
function bacaPosisi(ok, gagal) {
  if (!("geolocation" in navigator)) return gagal("Peramban ini tidak bisa membaca lokasi. Cari nama tempat di bawah.");
  const pesan = e => e.code === 1
    ? "Izin lokasi ditolak. Izinkan lokasi untuk situs ini di peramban, lalu tekan Coba lagi."
    : "Lokasi belum terbaca. Di laptop: buka Pengaturan Sistem, Privasi dan Keamanan, Layanan Lokasi, lalu nyalakan untuk peramban ini. Di HP: nyalakan GPS. Atau cari nama tempat di bawah.";
  navigator.geolocation.getCurrentPosition(ok, e => {
    if (e.code === 1) return gagal(pesan(e));
    navigator.geolocation.getCurrentPosition(ok, e2 => gagal(pesan(e2)), {enableHighAccuracy: false, maximumAge: 300000, timeout: 15000});
  }, {enableHighAccuracy: true, maximumAge: 0, timeout: 12000});
}
function kartuLokasi() {
  const isi = kartu("lokasi"); isi.closest(".lp-langkah").classList.add("lp-langkah-lok");
  isiLokasi(isi, {judul: "Di mana kejadiannya?", ket: "Paling tepat bila Anda sedang di lokasi kejadian.",
    pakaiPosisi: p => kirim({lokasi: {lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, sumber: "gps"}, tampil: `Lokasi saat ini, akurasi ${Math.round(p.coords.accuracy).toLocaleString("id-ID")} m`}),
    pilihCari: d => kirim({lokasi: {kode: d.kode}, tampil: `${d.judul}, ${d.sub.split(",")[0]}`}), kabupatenCukup: false});
}

/* hasil pencarian tempat: kab/kota dan kecamatan di atas; memilihnya mempersempit daftar desa di dalamnya (laporan butuh desa),
   atau langsung dipakai bila kabupatenCukup (info dan prediksi per kab/kota) */
async function cariTempat(q, dalam, wadahHasil, pilihDesa, kabupatenCukup) {
  const j = await (await fetch(`/api/lapor/cari?wa=${encodeURIComponent(wa || "")}&q=${encodeURIComponent(q)}&dalam=${encodeURIComponent(dalam)}`, {signal: AbortSignal.timeout(10000)})).json();
  const label = {kab: "Kab/kota", kec: "Kecamatan", desa: "Desa/kel."}, ik = {kab: "i-daftar", kec: "i-lokasi", desa: "i-rumah"};
  // daftar satu kolom: ubin ikon per tingkat, nama dengan bagian yang cocok ditebalkan, panah (pemilik 19 Nov 2026: "bagusin lagi")
  const sorot = t => { const n = t.replace(/^(Desa\/Kel\.|Kecamatan|Kelurahan|Desa)\s+/i, ""), i = q ? n.toLowerCase().indexOf(q.toLowerCase()) : -1, b = el("b");
    if (i < 0) b.append(n); else b.append(n.slice(0, i), el("mark", null, n.slice(i, i + q.length)), n.slice(i + q.length)); return b; };
  const isi = (j.hasil || []).map(d => { const li = el("li"), b = el("button", `lp-hasil ${d.tingkat}`); b.type = "button";
    const u = el("span", "lp-hasil-ikon"); u.append(ikon(ik[d.tingkat]));
    const tx = el("span", "lp-hasil-teks"), atas = el("span", "lp-hasil-atas"); atas.append(sorot(d.judul), el("span", `lp-pil lp-tingkat ${d.tingkat}`, label[d.tingkat]));
    // sub "Kec. X, Kab Y, Provinsi": baris kedua kecamatan dan kab/kota, provinsi jadi label di kanan supaya nama yang sama mudah dibedakan
    const bag = String(d.sub || "").split(", "), prov = bag.length > 1 ? bag.pop() : "";
    tx.append(atas, el("small", null, bag.join(", "))); b.append(u, tx); if (prov) b.append(el("span", "lp-hasil-prov", prov)); b.append(ikon("i-panah"));
    b.addEventListener("click", () => d.tingkat === "desa" || kabupatenCukup ? pilihDesa(d) : cariTempat("", d.kode, wadahHasil, pilihDesa, false).then(() => {
      const k = el("li", "lp-hasil-kepala"), kb = el("button", "lp-teks-tombol"); kb.type = "button"; kb.append(ikon("i-kembali"), "Kembali");
      kb.addEventListener("click", () => cariTempat(q, dalam, wadahHasil, pilihDesa, kabupatenCukup)); k.append(el("span", null, `Pilih desa atau kelurahan di ${d.judul}`), kb); wadahHasil.prepend(k); }));
    li.append(b); return li; });
  // di dalam kab/kec: desa dikelompokkan per kecamatan, tiap desa jadi tombol ringkas (pemilik 19 Nov 2026: "bagusin")
  if (dalam && (j.hasil || []).length && j.hasil.every(d => d.tingkat === "desa")) {
    const per = new Map(); for (const d of j.hasil) { const kec = String(d.sub || "").split(", ")[0].replace(/^Kec\. /, ""); per.set(kec, [...(per.get(kec) || []), d]); }
    const grup = [...per].map(([kec, ds]) => { const li = el("li", "lp-hasil-kec"), h = el("b"); h.append(ikon("i-lokasi"), `Kec. ${kec}`, el("small", null, `${ds.length} desa/kel.`));
      const w = el("div", "lp-hasil-chip"); for (const d of ds) { const b = el("button", null, d.judul.replace(/^(Desa\/Kel\.|Desa|Kelurahan)\s+/i, "")); b.type = "button"; b.addEventListener("click", () => pilihDesa(d)); w.append(b); }
      li.append(h, w); return li; });
    // saring desa di dalam daftar: ketik sebagian nama, tombol yang tidak cocok disembunyikan
    const sar = el("li", "lp-hasil-saring"), lab = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = `Cari desa atau kelurahan (${j.hasil.length})`; q.setAttribute("aria-label", "Cari desa");
    lab.append(ikon("i-cari"), q); sar.append(lab);
    q.addEventListener("input", () => { const t = q.value.trim().toLowerCase();
      for (const g of grup) { let ada = 0; for (const b of g.querySelectorAll("button")) { const c = !t || b.textContent.toLowerCase().includes(t); b.hidden = !c; ada += c; } g.hidden = !ada; } });
    wadahHasil.replaceChildren(sar, ...grup); wadahHasil.classList.add("berkelompok"); q.focus(); return;
  }
  wadahHasil.classList.remove("berkelompok");
  wadahHasil.replaceChildren(...isi);
  if (dalam && isi.length > 1) { // di dalam kab: kolom saring sampai ujung di atas daftar (pemilik 19 Nov 2026: "di atasnya agar ada search barnya juga")
    const sar = el("li", "lp-hasil-saring"), lab = el("label", "lp-cari"), qi = el("input"); qi.type = "search"; qi.placeholder = `Cari kecamatan atau desa (${isi.length})`; qi.setAttribute("aria-label", "Saring daftar");
    lab.append(ikon("i-cari"), qi); sar.append(lab); wadahHasil.prepend(sar);
    qi.addEventListener("input", () => { const t = qi.value.trim().toLowerCase(); for (const li of isi) li.hidden = !!t && !li.textContent.toLowerCase().includes(t); });
  }
  if (!isi.length) wadahHasil.replaceChildren(el("li", "lp-catatan-kecil", "Tidak ditemukan. Coba nama kabupaten/kota, kecamatan, desa, atau jalan."));
}

const IKON_ISIAN = {terdampak_kk: "i-orang", terdampak_jiwa: "i-korban", meninggal: "i-korban", hilang: "i-cari", luka: "i-plus", luka_inap: "i-fasilitas", mengungsi_jiwa: "i-pengungsian", mengungsi_kk: "i-orang",
  rumah_berat: "i-rumah", rumah_sedang: "i-rumah", rumah_ringan: "i-rumah", rumah_terendam: "b-banjir", fasilitas_sekolah: "i-fasilitas", fasilitas_kesehatan: "i-plus",
  fasilitas_ibadah: "i-fasilitas", jalan_jembatan: "i-lokasi", luas_terbakar: "b-api", kedalaman_genangan: "b-banjir", tebal_abu: "b-gunung"};
function kartuAngka(j) {
  const f = j.form, judul = (j.inti || j.balasan)?.match(/\*([^*]+)\*/)?.[1]?.replace(/\.$/, "") || "Isi data"; // judul pertanyaan di baris mana pun
  const TINGKAT_RUSAK = {rumah_berat: "berat", rumah_sedang: "sedang", rumah_ringan: "ringan"};
  const isi = kartu("angka", judul); wadah.querySelector(".lp-langkah-kepala").prepend(ikon("i-korban"));
  wadah.querySelector(".lp-langkah-kepala svg + svg")?.remove();
  const daftar = el("div", "lp-angka"), nilai = {};
  for (const x of f.isian) {
    const baris = el("div", "lp-angka-baris"), p = el("div", "lp-penambah");
    const inp = el("input"); inp.type = "text"; inp.inputMode = "numeric"; inp.placeholder = "?"; inp.setAttribute("aria-label", x.label);
    const kurang = el("button"); kurang.type = "button"; kurang.append(ikon("i-kurang")); kurang.setAttribute("aria-label", `Kurangi ${x.label}`);
    const tambahB = el("button", "plus"); tambahB.type = "button"; tambahB.append(ikon("i-plus")); tambahB.setAttribute("aria-label", `Tambah ${x.label}`);
    const set = v => { inp.value = v === "" ? "" : String(Math.max(0, Math.min(x.maks || 1e6, v))); nilai[x.nama] = inp.value; };
    kurang.addEventListener("click", () => set(inp.value === "" ? 0 : Number(inp.value) - 1));
    tambahB.addEventListener("click", () => set(inp.value === "" ? 1 : Number(inp.value) + 1));
    inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 7); nilai[x.nama] = inp.value; });
    if (x.nilai != null) set(x.nilai); // sudah tertangkap dari cerita
    p.append(kurang, inp, tambahB);
    // baris: ikon isian, judul dan definisi, penambah; baris yang sudah terisi diberi tanda (pemilik 19 Nov 2026: "kasih icon, bagusin")
    const u = el("span", "lp-angka-ikon"); u.append(ikon(IKON_ISIAN[x.nama] || "i-daftar"));
    const tx = el("span", "lp-angka-teks"); const atas = el("span", "lp-angka-atas"); atas.append(el("b", null, x.label), ...(x.satuan ? [el("span", "lp-angka-satuan", x.satuan)] : [])); // satuan sebaris dengan judul
    tx.append(atas, ...(x.ket ? [el("small", null, x.ket)] : []));
    if (TINGKAT_RUSAK[x.nama]) u.classList.add(`rusak-${TINGKAT_RUSAK[x.nama]}`); // warna tingkat kerusakan
    baris.append(u, tx, p);
    const tandai = () => baris.classList.toggle("terisi", inp.value !== ""); inp.addEventListener("input", tandai); kurang.addEventListener("click", tandai); tambahB.addEventListener("click", tandai); tandai();
    daftar.append(baris);
  }
  const aksi = el("div", "lp-aksi-dua");
  const nol = el("button", "lp-kedua", f.kosong || "Tidak ada"); nol.type = "button";
  nol.addEventListener("click", () => kirim({form: {kosong: true}, tampil: f.kosong || "Tidak ada"}));
  const s = el("button", "lp-utama", f.kirim || "Simpan"); s.type = "button";
  s.addEventListener("click", () => {
    const ringkas = f.isian.map(x => `${x.label} ${nilai[x.nama] === "" || nilai[x.nama] == null ? "belum tahu" : nilai[x.nama]}`).join(", ");
    kirim({form: Object.fromEntries(f.isian.map(x => [x.nama, nilai[x.nama] ?? ""])), tampil: ringkas});
  });
  aksi.append(nol, s);
  const n = f.isian.length; daftar.style.setProperty("--kol", n === 4 ? 2 : Math.min(n, 3)); // kolom sesuai jumlah isian: tanpa sel kosong
  isi.closest(".lp-langkah").classList.add("lp-langkah-angka", n === 1 ? "satu" : "banyak"); // satu isian: kartu ringkas, tombol sebaris
  isi.append(daftar, el("p", "lp-catatan-kecil", "Biarkan ? bila belum tahu."), aksi);
}

function kartuWaktu(j) {
  const isi = kartu("waktu", "Waktu kejadian"); wadah.querySelector(".lp-langkah-kepala").prepend(ikon("i-kalender"));
  // tanggal dan jam dihitung di zona lokasi kejadian, bukan zona perangkat; zona tertulis di label (pemilik 19 Nov 2026)
  const zona = j.form.zona || "WIB", geser = j.form.geser ?? 7;
  const hari = el("div", "lp-hari"), kini = new Date(Date.now() + geser * 3600e3 + new Date().getTimezoneOffset() * 6e4);
  let tanggal = j.form.isian[0].nilai, jam = "";
  const tgl = el("input"); tgl.type = "date"; tgl.max = tanggal; tgl.min = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10); tgl.value = tanggal;
  for (let n = 0; n < 7; n++) {
    const d = new Date(kini - n * 864e5), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const b = el("button", null, n === 0 ? "Hari ini" : n === 1 ? "Kemarin" : `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`); b.type = "button";
    b.setAttribute("aria-pressed", String(n === 0));
    b.addEventListener("click", () => { tanggal = iso; tgl.value = iso; hari.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    hari.append(b);
  }
  const lain = el("button", null, "Tanggal lain"); lain.type = "button"; lain.setAttribute("aria-pressed", "false");
  lain.addEventListener("click", () => { lTgl.hidden = false; tgl.showPicker?.(); }); hari.append(lain);
  tgl.addEventListener("change", () => { tanggal = tgl.value; hari.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === lain))); });
  const lTgl = el("label", "lp-isi"); lTgl.append("Tanggal", tgl); lTgl.hidden = true;
  const jm = el("input"); jm.type = "time"; jm.required = true; jm.addEventListener("input", () => { jam = jm.value; });
  const sek = el("button", "lp-jam-sekarang"); sek.type = "button"; sek.append(ikon("i-kalender"), "Pakai jam sekarang");
  sek.addEventListener("click", () => { jam = `${String(kini.getHours()).padStart(2, "0")}:${String(kini.getMinutes()).padStart(2, "0")}`; jm.value = jam; });
  const bJam = el("span", "lp-jam-baris"); bJam.append(jm, sek, el("span", "lp-zona", zona)); // tombol jam sekarang di dalam bar jam
  const lJam = el("div", "lp-isi"); lJam.append(`Jam, waktu setempat (${zona})`, bJam);
  const s = el("button", "lp-utama", "Simpan waktu"); s.type = "button";
  s.addEventListener("click", () => { if (!jam) { jm.focus(); statusEl.textContent = "Isi jam kejadian, perkiraan pun boleh."; return; } kirim({form: {tanggal, jam}, tampil: `${tanggal.split("-").reverse().join("/")}, ${jam.replace(":", ".")} ${zona}`}); });
  isi.append(hari, lTgl, lJam, s);
}

function kartuRtRw(j) {
  const isi = kartu("rtrw", "RT dan RW"); wadah.querySelector(".lp-langkah-kepala").prepend(ikon("i-rumah"));
  const baris = el("div", "lp-baris-isian"), nilai = {};
  for (const x of j.form.isian) { const i = el("input"); i.inputMode = "numeric"; i.maxLength = 3; i.placeholder = "000"; i.addEventListener("input", () => { i.value = i.value.replace(/\D/g, ""); nilai[x.nama] = i.value; });
    const l = el("label", "lp-isi"); l.append(x.label, i); baris.append(l); }
  const aksi = el("div", "lp-aksi-dua");
  const tt = el("button", "lp-kedua", "Tidak tahu"); tt.type = "button"; tt.addEventListener("click", () => kirim({form: {kosong: true}, tampil: "Tidak tahu RT dan RW"}));
  const s = el("button", "lp-utama", "Simpan"); s.type = "button";
  s.addEventListener("click", () => { if (!nilai.rt || !nilai.rw) { statusEl.textContent = "Isi RT dan RW, atau pilih Tidak tahu."; return; } kirim({form: {rt: nilai.rt, rw: nilai.rw}, tampil: `RT ${nilai.rt}, RW ${nilai.rw}`}); });
  aksi.append(tt, s); baris.append(aksi); isi.append(baris); isi.closest(".lp-langkah").classList.add("lp-langkah-rtrw"); // satu baris: RT, RW, tombol (pemilik 19 Nov 2026: "agar sebaris")
}

/* titik pengungsian: tempat di sekitar lokasi kejadian dari OpenStreetMap, bisa pilih beberapa, ditambah tempat lain yang diketik (pemilik 19 Nov 2026) */
// jenis pemilih: titik pengungsian, atau nama fasilitas rusak (sekolah, faskes, ibadah, jalan) dengan daftar tempat di sekitar lokasi
const PEMILIH = {tempat: ["Titik pengungsian", "Cari masjid, sekolah, balai desa di sekitar lokasi", "Titik pengungsian", "pengungsian", "Simpan titik pengungsian", "i-pengungsian"],
  "tempat:sekolah": ["Sekolah yang rusak", "Cari nama sekolah, misalnya SD Negeri", "Nama sekolah rusak", "sekolah", "Simpan sekolah", "i-fasilitas"],
  "tempat:faskes": ["Fasilitas kesehatan yang rusak", "Cari puskesmas, klinik, atau rumah sakit", "Nama fasilitas kesehatan rusak", "faskes", "Simpan fasilitas kesehatan", "i-plus"],
  "tempat:ibadah": ["Tempat ibadah yang rusak", "Cari masjid, musala, gereja, pura, vihara", "Nama tempat ibadah rusak", "ibadah", "Simpan tempat ibadah", "i-fasilitas"],
  "tempat:jalan": ["Jalan atau jembatan yang rusak", "Cari nama jalan atau jembatan", "Jalan atau jembatan rusak", "jalan", "Simpan jalan atau jembatan", "i-lokasi"]};
function kartuTempat(j = {}) {
  const [judul, petunjuk, awalan, jenisT, simpanT, ikonT] = PEMILIH[j.minta] || PEMILIH.tempat;
  const isi = kartu("tempat", judul); isi.closest(".lp-langkah").classList.add("lp-langkah-tempat");
  const kp = isi.closest(".lp-langkah")?.querySelector(".lp-langkah-kepala svg use"); if (kp) kp.setAttribute("href", `#${ikonT}`);
  const dipilih = new Map(), cari = el("label", "lp-cari"), q = el("input"); q.type = "search"; q.placeholder = petunjuk; q.setAttribute("aria-label", judul);
  cari.append(ikon("i-cari"), q);
  const daftar = el("div", "lp-tempat-kisi"), pilihan = el("div", "lp-tempat-pilihan"), lain = el("input"); lain.type = "text"; lain.placeholder = "Tempat lain yang tidak ada di daftar, misalnya tenda di lapangan desa"; lain.maxLength = 80;
  const lLain = el("label", "lp-isi"); lLain.append(jenisT === "pengungsian" ? "Tempat lain" : "Tidak ada di daftar? Tulis namanya", lain); if (jenisT !== "pengungsian") lain.placeholder = "Nama yang tidak ada di daftar";
  const s = el("button", "lp-utama"); s.type = "button"; s.append(ikon("i-centang"), simpanT);
  const segarPilihan = () => { pilihan.replaceChildren(...[...dipilih.keys()].map(n => { const c = el("button", "lp-tempat-chip"); c.type = "button"; c.append(n, ikon("i-tutup")); c.addEventListener("click", () => { dipilih.delete(n); segarPilihan(); muat(q.value); }); return c; }));
    pilihan.hidden = !dipilih.size; };
  let ulangTempat = 0;
  // teks yang diketik di pencarian bisa langsung dicatat sebagai nama (pemilik 20 Nov 2026: "ketika tidak ada di pilihan kenapa ga bisa diinput")
  const tambahKetik = (t, ada = []) => { const v = String(t || "").trim();
    if (v.length < 3 || ada.some(x => x.nama.toLowerCase() === v.toLowerCase()) || dipilih.has(v)) return [];
    const b = el("button", "lp-tempat lp-tempat-ketik"); b.type = "button"; const ic = el("span", "lp-tempat-ikon"); ic.append(ikon("i-plus"));
    const tx = el("span"); tx.append(el("b", null, `Catat "${v}"`), el("small", null, "Nama yang Anda ketik, tidak ada di daftar")); b.append(ic, tx);
    b.addEventListener("click", () => { dipilih.set(v, {nama: v}); q.value = ""; segarPilihan(); muat(""); }); return [b]; };
  const muat = async t => {
    if (!daftar.querySelector(".lp-tempat")) daftar.replaceChildren(el("p", "lp-redup lp-kecil", "Mencari tempat di sekitar lokasi..."));
    try { const j = await (await fetch(`/api/lapor/sekitar?wa=${encodeURIComponent(wa)}&jenis=${jenisT}&q=${encodeURIComponent(t || "")}`, {signal: AbortSignal.timeout(15000)})).json();
      // daftar rumah ibadah dan balai warga menyusul dari OpenStreetMap daring yang kadang penuh: coba lagi sampai tiga kali,
      // dan selama belum lengkap jangan pernah bilang "tidak ada" (pemilik 19 Nov 2026 "kenapa ga ada")
      if (j.sebagian && ulangTempat < 3) { ulangTempat++; setTimeout(() => muat(q.value.trim()), 4000); }
      if (!j.tempat?.length) return daftar.replaceChildren(...tambahKetik(t), el("p", "lp-redup lp-kecil", j.sebagian && ulangTempat < 3 ? "Mengambil daftar dari OpenStreetMap. Boleh langsung tulis namanya di kolom pencarian atau kolom bawah."
        : j.sebagian ? "Daftar dari OpenStreetMap sedang tidak bisa diambil. Tulis namanya di kolom bawah." : "Tidak ada tempat seperti ini tercatat di OpenStreetMap dalam 3 km dari lokasi. Tulis namanya di kolom bawah."));
      const kisi = j.tempat.map(x => { const b = el("button", "lp-tempat"); b.type = "button"; b.setAttribute("aria-pressed", String(dipilih.has(x.nama)));
        const ic = el("span", "lp-tempat-ikon"); ic.append(ikon(/ibadah|sekolah/i.test(x.jenis) ? "i-fasilitas" : /puskesmas|klinik|sakit/i.test(x.jenis) ? "i-plus" : /jalan|jembatan/i.test(x.jenis) ? "i-lokasi" : "i-rumah"));
        const tx = el("span"); tx.append(el("b", null, x.nama), el("small", null, `${x.jenis}, ${x.jarakKm.toLocaleString("id-ID")} km`)); b.append(ic, tx);
        b.addEventListener("click", () => { dipilih.has(x.nama) ? dipilih.delete(x.nama) : dipilih.set(x.nama, x); b.setAttribute("aria-pressed", String(dipilih.has(x.nama))); segarPilihan(); });
        return b; });
      daftar.replaceChildren(...tambahKetik(t, j.tempat), ...(j.terdekat ? [el("p", "lp-tempat-catatan", `Tidak ada nama yang cocok dengan "${t}". Ini tempat terdekat dari lokasi kejadian.`)] : []), ...kisi);
    } catch { daftar.replaceChildren(el("p", "lp-redup lp-kecil", "Daftar tempat belum bisa dimuat. Tulis di kolom Tempat lain.")); }
  };
  let tunda; q.addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => muat(q.value.trim()), 300); });
  s.addEventListener("click", () => { const ketik = !dipilih.size && !lain.value.trim() && q.value.trim().length >= 3 ? [q.value.trim()] : [];   // hanya mengetik di pencarian = itu namanya
    const semua = [...dipilih.keys(), ...(lain.value.trim() ? [lain.value.trim()] : []), ...ketik];
    if (!semua.length) { statusEl.textContent = "Pilih atau tulis paling sedikit satu tempat."; return; }
    kirim({teks: `${awalan}:\n${semua.map((n, i) => `${i + 1}. ${n}`).join("\n")}`, tampil: `${awalan}: ${semua.join(", ")}`}); });
  const tt = el("button", "lp-kedua", "Belum tahu"); tt.type = "button"; tt.addEventListener("click", () => kirim({teks: "belum tahu", tampil: `Belum tahu ${awalan.toLowerCase()}`}));
  const aksi = el("div", "lp-aksi-dua"); aksi.append(tt, s); pilihan.hidden = true;
  isi.append(cari, pilihan, daftar, lLain, aksi); muat("");
}

function kartuFoto(j) {
  const isi = kartu("foto");
  const kisi = el("div", "lp-foto-kisi");
  // standar foto publik (pola /instansi dan /lacak): cap waktu setempat dan koordinat di atas foto, sumber waktu, tautan peta, paling banyak 10 foto
  const daftarFoto = cache.fotoSesi || [], MAKS = 10;
  for (const f of daftarFoto) {
    const fig = el("figure", `lp-foto ${f.lat != null ? "ada-titik" : "tanpa-titik"}`), im = el("img"); im.src = f.src; im.alt = `${f.jenis === "video" ? "Video" : "Foto"} kejadian, ${f.waktuTeks || ""}`;
    const cap = el("figcaption", "lp-foto-cap");
    const w = el("span"); w.append(ikon("i-kalender"), f.waktuTeks || "Waktu tidak terbaca"); cap.append(w);
    const t = el("span"); t.append(ikon("i-lokasi"), f.lat != null ? `${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}` : "Tanpa lokasi"); cap.append(t);
    const ket = el("div", "lp-foto-ket"); ket.append(el("span", `lp-pil ${f.lat != null ? "selesai" : "ditelaah"}`, f.lencanaTeks || f.lencana || ""), el("small", null, f.sumberWaktu || ""));
    if (f.lat != null) { const a = Object.assign(el("a", "lp-teks-tombol"), {href: `https://www.google.com/maps?q=${f.lat},${f.lon}`, target: "_blank", rel: "noopener"}); a.append(ikon("i-lokasi"), "Lihat di peta"); ket.append(a); }
    const g = el("div", "lp-foto-gambar"); g.append(im, cap);
    if (f.jenis === "video") { const v = el("span", "lp-foto-video"); v.append(ikon("i-putar"), f.durasi != null ? `${f.durasi} detik` : "Video"); g.append(v); }
    fig.append(g, ket); kisi.append(fig);
  }
  const nVideo = daftarFoto.filter(f => f.jenis === "video").length, nFoto = daftarFoto.length - nVideo;
  const hitung = el("p", "lp-foto-hitung"); hitung.append(ikon("i-kamera"), `${nFoto} dari ${MAKS} foto, ${nVideo} dari ${VIDEO_MAKS_N} video`, el("small", null, "Ambil langsung dari kamera supaya waktu dan lokasinya terekam. Video paling lama 60 detik."));
  const masukan = el("input"); masukan.type = "file"; masukan.accept = "image/jpeg,image/*"; masukan.capture = "environment"; masukan.hidden = true;
  const rekam = el("input"); rekam.type = "file"; rekam.accept = "video/*"; rekam.capture = "environment"; rekam.hidden = true;   // video (K57)
  const galeri = el("input"); galeri.type = "file"; galeri.accept = "image/jpeg,image/*,video/mp4,video/quicktime,video/webm"; galeri.hidden = true;
  const ambil = el("button", "lp-utama"); ambil.type = "button"; ambil.append(ikon("i-kamera"), "Ambil foto");
  const ambilV = el("button", "lp-kedua"); ambilV.type = "button"; ambilV.append(ikon("i-putar"), "Rekam video");
  const pilihG = el("button", "lp-kedua", "Pilih dari galeri"); pilihG.type = "button";
  ambil.addEventListener("click", () => { siapkanGps(); masukan.click(); });
  ambilV.addEventListener("click", () => { siapkanGps(); rekam.click(); });
  pilihG.addEventListener("click", () => { siapkanGps(); galeri.click(); });
  const pilihBerkas = f => f && (f.type.startsWith("video/") ? unggahVideo(f) : unggahFoto(f));
  masukan.addEventListener("change", () => pilihBerkas(masukan.files[0]));
  rekam.addEventListener("change", () => pilihBerkas(rekam.files[0]));
  galeri.addEventListener("change", () => pilihBerkas(galeri.files[0]));
  const lanjut = el("div", "lp-opsi"); j.pilihan.forEach((o, i) => lanjut.append(tombolOpsi(o, j.ket?.[i], () => kirim({teks: String(i + 1), tampil: o}))));
  if (nFoto >= MAKS) ambil.disabled = true;
  if (nVideo >= VIDEO_MAKS_N) ambilV.disabled = true;
  if (nFoto >= MAKS && nVideo >= VIDEO_MAKS_N) pilihG.disabled = true;
  const aksi = el("div", "lp-aksi-dua"); aksi.append(ambil, ambilV, pilihG);
  isi.closest(".lp-langkah").classList.add("lp-langkah-foto");
  for (const b of [...lanjut.children]) { b.classList.add("lp-foto-lanjut"); aksi.append(b); } // tiga aksi sebaris
  aksi.classList.add("lp-foto-aksi"); pilihG.prepend(ikon("i-unduh"));
  if (daftarFoto.length < MAKS) { // ubin tambah foto selalu ada di ujung kisi
    const z = el("button", `lp-foto-ajak${daftarFoto.length ? " kecil" : ""}`); z.type = "button";
    z.append(ikon(daftarFoto.length ? "i-plus" : "i-kamera"), el("b", null, daftarFoto.length ? "Tambah foto" : "Foto keadaan di lokasi"), el("small", null, daftarFoto.length ? `Sisa ${MAKS - daftarFoto.length} foto` : "Kerusakan, genangan, atau pengungsian. Hindari memotret wajah orang."));
    z.addEventListener("click", () => { siapkanGps(); masukan.click(); }); kisi.append(z); }
  for (const b of aksi.querySelectorAll(".lp-foto-lanjut")) b.prepend(ikon("i-panah"));
  isi.append(hitung, kisi, aksi, masukan, rekam, galeri);
}

/* layar terima kasih sesudah laporan terkirim (pemilik 19 Nov 2026: "harusnya ada animasi terima kasih, kaya waktu pertama kali buka"):
   gaya sama dengan pembuka (.lp-pembuka), maskot senang; sekali per nomor tiket supaya tidak muncul lagi saat riwayat chat dimuat ulang */
const TEKS_TERIMA = ["Laporan terkirim", "Terima kasih", "Nomor tiket", "Laporan Anda kami teruskan ke petugas BNPB dan BPBD setempat.", "Ketuk di mana saja untuk lanjut", "Bagaimana pengalaman melapor Anda?", "Terima kasih atas penilaian Anda.", "Pilih satu penilaian untuk melanjutkan"];
/* terjemahan layar terima kasih disiapkan lebih dulu: elemen tersembunyi berisi teksnya ikut diterjemahkan penerjemah halaman dan masuk simpanan */
function hangatkanTerima() { if (bahasaKini() === "id" || document.querySelector(".lp-tr-hangat")) return; const h = el("div", "lp-tr-hangat"); h.hidden = true;
  for (const t of TEKS_TERIMA) h.append(el("span", null, t)); document.body.append(h); }
/* kartu penilaian 5 emoji; dipakai di layar terima kasih (wajib) dan di kartu tiket */
function kotakPenilaian(nomor, sesudah) {
  const nilai = el("div", "lp-nilai"), tanya = el("b", null, TEKS_TERIMA[5]);
  ["😠", "🙁", "😐", "🙂", "🤩"].forEach((e, i) => { const b = el("button", null, e); b.type = "button"; b.setAttribute("aria-label", `Nilai ${i + 1} dari 5`);
    b.addEventListener("click", async () => { nilai.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); tanya.textContent = TEKS_TERIMA[6]; sesudah?.();
      try { await fetch("/api/lapor/nilai", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, nomor, nilai: i + 1})}); } catch {} }); nilai.append(b); });
  return {tanya, nilai};
}
function ucapanTerimaKasih(nomor) {
  const kunci = `lapor-tk-${nomor}`; try { if (sessionStorage.getItem(kunci) || localStorage.getItem(kunci)) return; } catch { return; }
  if (document.querySelector(".lp-terima")) return;
  const pb = el("div", "lp-pembuka lp-terima"); pb.setAttribute("role", "alertdialog"); pb.setAttribute("aria-modal", "true");
  const riak = el("span", "lp-pb-riak"); riak.setAttribute("aria-hidden", "true"); riak.append(el("i"), el("i"), el("i"));
  const m = el("div", "lp-pembuka-maskot"); m.innerHTML = maskot("senang");
  // teks tetap dipisah dari nama dan nomor supaya terjemahannya sudah ada di perangkat (disiapkan saat chat dibuka, hangatkanTerima)
  const judul = el("p", "lp-pembuka-judul"); judul.append(el("span", null, TEKS_TERIMA[1]), cache.pelapor ? el("span", "lp-nama-orang", `, ${cache.pelapor}!`) : "!");
  const bnpb = el("p", "lp-pembuka-bnpb"); bnpb.append(el("span", null, TEKS_TERIMA[2]), " ", el("b", "lp-tk-nomor", nomor), el("br"), el("span", null, TEKS_TERIMA[3]));
  // penilaian wajib: layar tidak bisa ditutup sebelum satu emoji dipilih (pemilik 20 Nov 2026)
  const tutup = () => { try { localStorage.setItem(kunci, "1"); } catch {} setTimeout(() => { pb.classList.add("pergi"); setTimeout(() => pb.remove(), 700); }, 1200); };
  const {tanya, nilai} = kotakPenilaian(nomor, tutup), kotak = el("div", "lp-terima-nilai"); kotak.append(tanya, nilai);
  pb.append(riak, m, el("p", "lp-pembuka-sapa", TEKS_TERIMA[0]), judul, bnpb, kotak);
  document.body.append(pb); nilai.querySelector("button")?.focus();
}
/* kartu tiket (pemilik 19 Nov 2026: "bagusin maksimal"): pita sukses, tiket bersobek dengan nomor, langkah berikutnya, aksi berikon, penilaian */
function kartuTiket(j) {
  const isi = kartu("tiket", "Laporan terkirim"); const k = isi.closest(".lp-langkah"); k.classList.add("lp-langkah-tiket"); k.querySelector(".lp-langkah-kepala")?.remove();
  const pita = el("div", "lp-tk-pita"), ok = el("span", "lp-ok"); ok.append(ikon("i-centang"));
  const pt = el("div"); pt.append(el("b", null, "Terima kasih, laporan Anda sudah kami terima"), el("span", null, "Tim kami akan menghubungi Anda untuk mengonfirmasi laporan."));
  pita.append(ok, pt);
  const tiket = el("div", "lp-tk"), kiri = el("div", "lp-tk-kiri"), kanan = el("div", "lp-tk-kanan");
  const no = el("span", "lp-tk-nomor", j.nomor), salin = el("button", "lp-tk-salin"); salin.type = "button"; salin.setAttribute("aria-label", `Salin nomor tiket ${j.nomor}`); salin.append(ikon("i-salin"), "Salin");
  salin.addEventListener("click", async () => { try { await navigator.clipboard.writeText(j.nomor); salin.lastChild.textContent = "Tersalin"; } catch { statusEl.textContent = j.nomor; } });
  kiri.append(el("small", null, "Nomor tiket"), no, salin);
  // kode QR ke halaman lacak (pembuat QR yang sama dengan tombol Bagikan, public/bagi.js); dipindai dari HP lain untuk cek status
  try { const qr = window.Bagi?.QR?.kanvas(new URL(j.unduhan.find(u => u.lacak).url, location.href).href, 4); if (qr) { qr.className = "lp-tk-qr"; qr.setAttribute("role", "img"); qr.setAttribute("aria-label", `Kode QR lacak laporan ${j.nomor}`); kiri.prepend(qr); kiri.classList.add("ada-qr"); } } catch { /* tanpa QR */ }
  const lacak = j.unduhan.find(u => u.lacak), dok = j.unduhan.filter(u => !u.lacak);
  const langkah = el("ol", "lp-tk-langkah");
  for (const [t, ket, aktif, ik] of [["Diterima", "Sekarang", true, "i-centang"], ["Dilihat", "Petugas membuka", false, "i-cari"], ["Ditelaah", "Data diperiksa", false, "i-daftar"], ["Ditindaklanjuti", "BPBD bergerak", false, "i-status"], ["Selesai", "Anda diberi kabar", false, "i-centang"]]) { const li = el("li", aktif ? "aktif" : ""), t0 = el("span"); t0.append(ikon(ik)); li.append(t0, el("b", null, t), el("small", null, ket)); langkah.append(li); }
  kanan.append(el("small", null, "Langkah berikutnya"), langkah);
  tiket.append(kiri, kanan);
  const aksi = el("div", "lp-tk-aksi");
  const a = Object.assign(el("a", "lp-utama"), {href: lacak.url}); a.append(ikon("i-status"), "Lacak laporan"); aksi.append(a);
  for (const u of dok) { const b = Object.assign(el("a", "lp-kedua"), {href: u.url}); b.append(ikon("i-unduh"), u.label.replace("Unduh ", "Unduh ")); b.addEventListener("click", e => unduh(e, u.url)); aksi.append(b); }
  const kotakNilai = el("div", "lp-tk-nilai"), {tanya, nilai} = kotakPenilaian(j.nomor); kotakNilai.append(tanya, nilai);
  ucapanTerimaKasih(j.nomor);
  const baru = el("button", "lp-tk-baru"); baru.type = "button"; baru.append(ikon("i-plus"), "Buat laporan baru"); baru.addEventListener("click", () => kirim({teks: "lapor", tampil: "Buat laporan baru"}));
  isi.append(pita, tiket, aksi, kotakNilai, baru);
}

async function unduh(e, url) { // dokumen dibuat di latar; bila belum jadi, beri tahu, jangan buka halaman kosong
  e.preventDefault();
  try { const r = await fetch(url, {method: "GET"}); if (r.status === 202) { statusEl.textContent = "Dokumen sedang dibuat, coba lagi beberapa detik lagi."; return; }
    const b = await r.blob(), a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(b), download: decodeURIComponent((r.headers.get("content-disposition") || "").match(/filename="([^"]+)"/)?.[1] || "laporan")}); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  catch { statusEl.textContent = "Unduhan gagal, coba lagi."; }
}

/* terapkan keadaan mesin ke layar */
/* sesudah "kembali": percakapan digambar ulang dari transkrip server supaya jawaban yang dibatalkan hilang dari layar */
async function ulangChat() {
  const j = await (await fetch(`/api/lapor/sesi?wa=${wa}`, {signal: AbortSignal.timeout(15000)})).json();
  $("mengetik").hidden = true; log.replaceChildren(); cache.transkrip = [];
  for (const t of j.transkrip || []) tambah(t.dari === "pelapor" ? "saya" : t.dari, t.teks || (t.lokasi ? "Lokasi dibagikan" : ""));
  terapkan(j); simpanCache();
}
function terapkan(j, {dariCache = false} = {}) {
  terakhir = j; wadah.replaceChildren(); statusEl.textContent = "";
  let tulis = false;
  if (j.nomor && j.unduhan) kartuTiket(j);
  else if (j.minta === "setuju") kartuSetuju(j);
  else if (j.minta === "identitas") kartuIdentitas();
  else if (j.minta === "lokasi") kartuLokasi();
  else if (j.minta === "foto") kartuFoto(j);
  else if (j.minta?.startsWith("tempat")) kartuTempat(j);
  else if (j.form?.isian?.[0]?.tipe === "tanggal") kartuWaktu(j);
  else if (j.form?.isian?.[0]?.nama === "rt") kartuRtRw(j);
  else if (j.form) kartuAngka(j);
  else if (j.pilihan?.length) kartuPilihan(j);
  else tulis = j.status !== "terkirim" && j.status !== "batal";
  fPesan.hidden = !tulis;
  $("bBatal").hidden = !j.status || ["terkirim", "batal", "identitas"].includes(j.status);
  if (tulis && j.isiAwal && !iTeks.value.trim()) { iTeks.value = j.isiAwal; const n1 = iTeks.value.indexOf("\n1. "), t = n1 >= 0 ? n1 + 4 : iTeks.value.indexOf(":") + 2; iTeks.setSelectionRange(t, t); } // daftar bernomor: kursor di belakang "1. "
  if (tulis) iTeks.focus();
  tampilIsian(j.isian || [], j.lengkap || 0);
  suasanaSigap(j);
  if (!dariCache) { cache.keadaan = j; simpanCache(); }
  requestAnimationFrame(() => gulir.scrollTo({top: gulir.scrollHeight}));
}

/* ============ kirim ke server ============ */
async function kirim({teks = "", lokasi = null, form = null, pilih = null, tampil = null, foto = null, lain = null, kembali = false}) {
  if (sibuk) return;
  sibuk = true; statusEl.textContent = "";
  if (tampil !== false && (tampil || teks)) tambah("saya", tampil || teks, {foto}); // tampil:false = perintah diam (membuka laporan)
  wadah.replaceChildren(); fPesan.hidden = true; $("mengetik").hidden = false;
  try {
    const r = await fetch("/api/lapor/pesan", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, teks, lokasi, form, pilih, lain, kembali, saluran: "web", bahasa: bahasaKini()}), signal: AbortSignal.timeout(60000)});
    const j = await r.json();
    if (!r.ok) throw new Error(j.galat || "Gagal mengirim");
    if (j.kembali) { await ulangChat(); return; }
    selesaiBalas(j);
  } catch (e) {
    $("mengetik").hidden = true;
    tambah("bot", `Pesan belum terkirim. ${e.name === "TimeoutError" ? "Jaringan lambat" : String(e.message).replace(/[.\s]+$/, "")}. Coba lagi.`, {galat: true, simpanKe: false});
    if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true});
  } finally { sibuk = false; }
}
function selesaiBalas(j) {
  // identitas sudah diisi di kartu awal: pertanyaan "kenal" (Ganti) dan kartu identitas mesin dijawab diam-diam dengan isian itu
  if (idAwal && (j.minta === "identitas" || (j.pilihanAsli || j.pilihan)?.join("|") === "Ya|Ganti")) {
    const form = idAwal; if (j.minta === "identitas") idAwal = null;
    setTimeout(() => j.minta === "identitas" ? kirim({form, tampil: false}) : kirim({teks: "2", tampil: false}), 0); return; }
  $("mengetik").hidden = true;
  if (j.balasan) tambah("bot", j.minta === "setuju" ? (idAwal ? "Terima kasih. Sebelum mulai, mohon baca dan setujui pemakaian data di bawah." : "Halo, saya Sigap, asisten AI Lapor Bencana BNPB. Sebelum mulai, mohon baca dan setujui pemakaian data di bawah.") : j.balasan);
  if (j.pelapor?.nama) cache.pelapor = j.pelapor.nama;
  if (j.nomor && j.susulan) { const l = (cache.laporan || []).find(x => x.nomor === j.nomor); if (l) { l.versi = j.susulan; if (j.foto) l.foto = j.foto; } cache.fotoSesi = []; } // susulan: kartu tetap, versi naik
  else if (j.nomor) { cache.laporan = [{nomor: j.nomor, lacak: j.lacak, foto: j.foto || null, status: "baru", statusLabel: "Laporan diterima", waktu: Date.now()}, ...(cache.laporan || []).filter(l => l.nomor !== j.nomor)]; cache.fotoSesi = []; }
  if (j.unduhan && !j.nomor) { const d = el("div", "lp-langkah-isi"); } // daftar lacak dari "status" tampil di tab Laporan
  terapkan(j);
}

/* batalkan laporan (pemilik 20 Nov 2026): konfirmasi dulu, lalu "batal" lewat jalur kirim yang sama */
$("bBatal").addEventListener("click", () => {
  const d = el("dialog", "lp-dialog-batal"), h = el("h2", null, "Batalkan laporan ini?"), p = el("p", null, "Isian yang sudah Anda kirim tidak akan diteruskan ke petugas."), a = el("div", "lp-batal-aksi");
  const tidak = el("button", "lp-kedua", "Lanjutkan melapor"), ya = el("button", "lp-utama", "Ya, batalkan"); tidak.type = ya.type = "button";
  const tutup = () => { d.close(); d.remove(); };
  tidak.addEventListener("click", tutup); d.addEventListener("cancel", () => d.remove());
  ya.addEventListener("click", () => { tutup(); kirim({teks: "batal", tampil: "Batalkan laporan"}); });
  a.append(tidak, ya); d.setAttribute("aria-labelledby", "judulBatal"); h.id = "judulBatal"; d.append(h, p, a); document.body.append(d); d.showModal(); tidak.focus();
});
$("bIsian").addEventListener("click", () => $("bIsian").setAttribute("aria-expanded", String($("panelIsian").classList.toggle("buka")))); // ponsel: lembar bawah; layar lebar: selalu tampil
$("bTutupIsian").addEventListener("click", () => { $("panelIsian").classList.remove("buka"); $("bIsian").setAttribute("aria-expanded", "false"); });
/* Sigap di panel isian bereaksi pada keadaan laporan */
let poseSigap = "";
function suasanaSigap(j) {
  const ang = n => Number((j.isian || []).find(x => x.nama === n)?.tampil?.match?.(/\d+/)?.[0] || 0), L = j.lengkap || 0;
  const [pose, judul, teks] = j.status === "terkirim" ? ["senang", "Terima kasih banyak!", "Laporan Anda sudah sampai ke petugas BNPB dan BPBD setempat."]
    : ang("meninggal") > 0 || ang("hilang") > 0 || j.darurat ? ["sedih", "Turut prihatin", "Utamakan keselamatan. Bila ada yang perlu ditolong sekarang, telepon 112."]
    : L >= 70 ? ["semangat", "Sedikit lagi, ayo!", "Tinggal beberapa pertanyaan."]
    : L >= 30 ? ["semangat", "Bagus, lanjutkan", "Tiap jawaban membantu petugas menyiapkan bantuan."]
    : ["sapa", "Halo, saya Sigap", "Saya bantu sampai laporan lengkap."];
  if (pose !== poseSigap) { $("sigapMaskot").innerHTML = maskot(pose); poseSigap = pose; }
  const isi = [el("b", null, judul), el("span", null, teks)];
  if (pose === "sedih") { const a = el("a", "lp-sigap-tel"); a.href = "tel:112"; a.append(ikon("i-telepon"), "Telepon 112"); isi.push(a); }
  $("sigapTeks").replaceChildren(...isi); $("sigapPanel").dataset.pose = pose;
}
function tampilIsian(isian, lengkap) {
  $("cincin").style.strokeDasharray = `${lengkap} 100`;
  $("persenCincin").textContent = `${lengkap}%`;
  $("progres").style.width = `${lengkap}%`;
  $("lengkapKecil").textContent = `${lengkap}%`;
  // kepala chat: bilah kemajuan kecil + persen, bukan kalimat polos (pemilik 19 Nov 2026: "bagusin")
  // kemajuan cukup satu tempat: kartu Isian laporan di kiri (pemilik 19 Nov 2026: "ini kan sama ya, digabung di yang kiri aja, dilengkapi")
  $("langkahTeks").textContent = "Asisten AI, dipandu sampai lengkap"; $("barIsian").style.width = `${lengkap}%`;
  if (!isian.length) { $("ringkasIsian").textContent = "Terisi otomatis dari percakapan"; $("isian").replaceChildren(el("p", "lp-redup lp-kecil", "Isian muncul begitu Anda mulai melapor.")); return; }
  const jawab = x => !["kosong", "belum"].includes(x.status);
  const belum = isian.filter(x => !jawab(x));
  $("ringkasIsian").textContent = `${isian.filter(jawab).length} dari ${isian.length} terjawab`;
  $("sisaIsian").hidden = false;
  $("sisaIsian").textContent = belum.length ? `Belum: ${belum.slice(0, 3).map(x => x.label).join(", ")}${belum.length > 3 ? `, dan ${belum.length - 3} lagi` : ""}` : "Semua terjawab, laporan siap dikirim";
  $("sisaIsian").classList.toggle("selesai", !belum.length);
  const per = new Map(); for (const x of isian) per.set(x.kelompok, [...(per.get(x.kelompok) || []), x]);
  const frag = document.createDocumentFragment();
  for (const [kel, daftar] of per) {
    const n = daftar.filter(jawab).length, penuh = n === daftar.length;
    const d = el("details", `lp-kelompok${penuh ? " penuh" : ""}`), sm = el("summary");
    d.open = !penuh && daftar.some(x => x.status !== "kosong");
    // kartu per kelompok: ikon, nama, bilah kemajuan, jumlah; nilai ringkas tanpa koordinat (pemilik 19 Nov 2026: "bagusin")
    const nm = el("span", "lp-kel-nama"), bar = el("span", "lp-kel-bar"), bi = el("i"); bi.style.width = `${Math.round(n / daftar.length * 100)}%`; bar.append(bi); nm.append(el("b", null, kel), bar);
    sm.append(ikon(KELOMPOK_IKON[kel] || "i-kejadian"), nm, el("span", `lp-pil ${penuh ? "selesai" : n ? "ditelaah" : ""}`, `${n}/${daftar.length}`));
    const dl = el("dl");
    for (const x of daftar) { const b = el("div", x.status); b.append(el("span", "lp-titik"), el("dt", null, x.label), el("dd", null, String(x.tampil ?? "").replace(/\s*\(-?\d+\.\d+,\s*-?\d+\.\d+\)$/, ""))); dl.append(b); }
    d.append(sm, dl); frag.append(d);
  }
  if (isian.every(jawab)) { const b = el("div", "lp-isian-selesai"), ic = el("span"); ic.append(ikon("i-centang")); const tx = el("span"); tx.append(el("b", null, "Laporan lengkap"), el("small", null, "Periksa ringkasan lalu kirim.")); b.append(ic, tx); frag.prepend(b); }
  $("isian").replaceChildren(frag);
}

/* ============ kotak tulis, suara ============ */
fPesan.addEventListener("submit", e => { e.preventDefault(); const t = iTeks.value.trim(); if (!t) return; iTeks.value = "";
  if (/^(bahasa|ganti bahasa|language)$/i.test(t)) { tambah("saya", t, {simpanKe: false}); return tanyaBahasa(() => { tambah("bot", "Baik. Pesan berikutnya dijawab dalam bahasa pilihan Anda.", {simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); else fPesan.hidden = false; }, true); }
  kirim({teks: t}); });
iTeks.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (e.isComposing || e.keyCode === 229) return; fPesan.requestSubmit(); } });
const Pengenal = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Pengenal) {
  const bMic = $("bMic"), dengar = new Pengenal(); let awal = "", aktif = false;
  dengar.lang = "id-ID"; dengar.interimResults = true; dengar.continuous = true; bMic.hidden = false;
  bMic.addEventListener("click", () => { if (aktif) dengar.stop(); else { awal = iTeks.value; dengar.start(); } });
  dengar.addEventListener("start", () => { aktif = true; bMic.classList.add("aktif"); bMic.setAttribute("aria-pressed", "true"); statusEl.textContent = "Mendengarkan, ketuk mikrofon lagi untuk berhenti."; });
  dengar.addEventListener("end", () => { aktif = false; bMic.classList.remove("aktif"); bMic.setAttribute("aria-pressed", "false"); if (statusEl.textContent.startsWith("Mendengarkan")) statusEl.textContent = ""; });
  dengar.addEventListener("error", e => { statusEl.textContent = e.error === "not-allowed" ? "Izin mikrofon ditolak." : "Suara belum tertangkap. Coba lagi."; });
  dengar.addEventListener("result", e => { const kata = [...e.results].map(r => r[0].transcript).join(" ").trim(); iTeks.value = awal ? `${awal.replace(/\s+$/, "")} ${kata}` : kata; });
}

/* ============ lokasi dan foto ============ */
function siapkanGps() { // GPS perangkat saat memotret (KEPUTUSAN D11)
  navigator.geolocation?.getCurrentPosition(p => { posisi = {lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, waktu: Date.now()}; }, () => { posisi = null; }, {enableHighAccuracy: true, maximumAge: 0, timeout: 20000});
}
async function unggahFoto(file) {
  if (!file || sibuk) return;
  statusEl.textContent = "Menyiapkan foto...";
  try {
    const exif = window.bacaExif ? window.bacaExif(await file.slice(0, 262144).arrayBuffer()) : null;
    const kecil = window.fotoKecil ? await window.fotoKecil(file) : file;
    if (!kecil) throw new Error("Foto tidak terbaca atau terlalu besar");
    const data = await new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = gagal; r.readAsDataURL(kecil); });
    tambah("saya", "", {foto: data, simpanKe: false});
    sibuk = true; wadah.replaceChildren(); $("mengetik").hidden = false; statusEl.textContent = "";
    const r = await fetch("/api/lapor/foto", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, data, gps: posisi, exif, bahasa: bahasaKini()}), signal: AbortSignal.timeout(60000)});
    const j = await r.json(); sibuk = false;
    if (!r.ok) throw new Error(j.galat || "Foto gagal dikirim");
    const fb = j.fotoBaru || {};
    cache.fotoSesi = [...(cache.fotoSesi || []), {src: data, lencana: fb.lencana, lencanaTeks: fb.lencanaTeks, lat: fb.lat, lon: fb.lon, waktuTeks: fb.waktuTeks, sumberWaktu: fb.sumberWaktu}]; simpanCache();
    selesaiBalas(j);
  } catch (e) { sibuk = false; $("mengetik").hidden = true; tambah("bot", `${e.message}.`, {galat: true, simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); }
}

/* ============ video, unggah bersambung (KEPUTUSAN K57, K61, D77, D89, D90) ============
   Berkas disimpan di antrean bersama public/inti/antre.js (saluran "lapor-video", IndexedDB pb-antre; satu-satunya pemegang IndexedDB) sampai
   semua bagian 5 MB diterima server. Sinyal putus atau halaman ditutup = lanjut dari bagian terakhir (GET status), bukan dari nol.
   Nomor unggahan server per butir disimpan di localStorage (butir antrean tidak ditulis ulang saat bagian berjalan). */
const VIDEO_MAKS_N = 3, VIDEO_MB = 30, VIDEO_DETIK = 60, tunggu = ms => new Promise(r => setTimeout(r, ms)), janjiVideo = new Map();
const idUnggah = {baca: k => { try { return localStorage.getItem(`lapor-unggah-${k}`); } catch { return null; } }, tulis: (k, v) => { try { v ? localStorage.setItem(`lapor-unggah-${k}`, v) : localStorage.removeItem(`lapor-unggah-${k}`); } catch {} }};
function metaVideo(file) { // durasi dan sampul bingkai pertama, digambar di kanvas (tanpa metadata asli)
  return new Promise((ok, gagal) => { const v = document.createElement("video"), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
    const habis = setTimeout(() => { URL.revokeObjectURL(u); gagal(new Error("Video tidak terbaca di perangkat ini")); }, 15000);
    v.addEventListener("loadedmetadata", () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); }, {once: true});
    v.addEventListener("seeked", () => { const k = document.createElement("canvas"), sk = Math.min(1, 640 / (v.videoWidth || 640)); k.width = Math.round((v.videoWidth || 640) * sk); k.height = Math.round((v.videoHeight || 360) * sk);
      k.getContext("2d").drawImage(v, 0, 0, k.width, k.height); clearTimeout(habis); URL.revokeObjectURL(u); ok({durasi: v.duration, sampul: k.toDataURL("image/jpeg", 0.7)}); }, {once: true});
    v.addEventListener("error", () => { clearTimeout(habis); URL.revokeObjectURL(u); gagal(new Error("Video tidak terbaca di perangkat ini")); }, {once: true}); });
}
const jsonAman = async r => { try { return await r.json(); } catch { return {}; } };
/* pengunggah saluran: mulai (sekali), kirim bagian yang belum ada, coba cepat 3 kali; sesudah itu antrean yang mengatur jeda (60 dtk ke atas) */
async function unggahBersambung(berkas, x) {
  const d = x.data;
  for (let coba = 0; coba < 3; coba++) {
    try {
      let id = idUnggah.baca(x.klien_id), diterima = [];
      if (id) { const st = await fetch(`/api/lapor/unggah/${id}`, {signal: AbortSignal.timeout(15000)}); if (st.status === 404) { idUnggah.tulis(x.klien_id, null); id = null; } else diterima = (await st.json()).diterima || []; }
      if (!id) { const r = await fetch("/api/lapor/unggah/mulai", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa: d.wa, ukuran: berkas.size, durasi: d.durasi, gps: d.gps, bahasa: d.bahasa}), signal: AbortSignal.timeout(15000)});
        const j = await jsonAman(r); if (!r.ok) { if (r.status < 500) videoSelesai({...d, klien_id: x.klien_id}, null, j.galat); return {s: r.status, j}; } id = j.id; idUnggah.tulis(x.klien_id, id); x.bagian = j.bagian; x.jumlah = j.jumlah; }
      const B = x.bagian || 5 * 1048576, n = Math.ceil(berkas.size / B), sudah = new Set(diterima);
      for (let i = 0; i < n; i++) {
        if (sudah.has(i)) continue;
        statusEl.textContent = `Mengirim video, bagian ${sudah.size + 1} dari ${n}. Bila sinyal putus, kiriman dilanjutkan dari bagian ini.`;
        const r = await fetch(`/api/lapor/unggah/${id}/${i}`, {method: "PUT", body: berkas.slice(i * B, (i + 1) * B), signal: AbortSignal.timeout(120000)});
        if (r.status === 404) { idUnggah.tulis(x.klien_id, null); throw new Error("kedaluwarsa"); }
        if (!r.ok) throw new Error("bagian gagal");
        sudah.add(i);
      }
      return {s: 200, j: {media_id: id}};
    } catch {
      statusEl.textContent = navigator.onLine ? "Sinyal lemah, mencoba lagi..." : "Tanpa sinyal. Video tersimpan di HP dan dilanjutkan otomatis saat tersambung.";
      if (!navigator.onLine) break; await tunggu(2000 * 2 ** coba);
    }
  }
  // tetap gagal: butir dan berkas tinggal di antrean (dikirim otomatis saat tersambung), obrolan dilepas supaya pelapor bisa lanjut
  const t = janjiVideo.get(x.klien_id); if (t) { janjiVideo.delete(x.klien_id); t.gagal(Object.assign(new Error("Video tersimpan di HP dan terkirim otomatis saat sinyal kembali. Anda bisa lanjut mengisi laporan"), {tersimpan: true})); }
  return {s: 0, j: {}};
}
const salVideo = window.PbAntre?.saluran("lapor-video", {umurMs: 24 * 3600e3, langsung: true, media: {unggah: unggahBersambung},
  kirim: async (badan) => { // semua bagian sudah diterima: server memeriksa isi dan memasukkan video ke laporan
    const b = badan[0], r = await fetch(`/api/lapor/unggah/${b.media_id}/selesai`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({sampul: b.sampul}), signal: AbortSignal.timeout(60000)});
    const j = await jsonAman(r); if (r.ok || r.status === 400) { idUnggah.tulis(b.klien_id, null); videoSelesai(b, r.ok ? j : null, j.galat); }
    return {s: r.status, j};
  }});
function videoSelesai(b, j, galat) {
  const tunggu = janjiVideo.get(b.klien_id); janjiVideo.delete(b.klien_id);
  if (tunggu) return j ? tunggu.ok(j) : tunggu.gagal(new Error(galat || "Video ditolak"));
  if (j && b.wa === wa) { tambah("bot", "Video yang tadi terputus sudah terkirim.", {simpanKe: false}); simpanVideoCache(b, j); selesaiBalas(j); } // butir sisa dari kunjungan sebelumnya
}
function simpanVideoCache(b, j) { const fb = j.fotoBaru || {};
  cache.fotoSesi = [...(cache.fotoSesi || []), {src: b.sampul, jenis: "video", durasi: fb.durasi ?? b.durasi, lencana: fb.lencana, lencanaTeks: fb.lencanaTeks, lat: fb.lat, lon: fb.lon, waktuTeks: fb.waktuTeks, sumberWaktu: fb.sumberWaktu}]; simpanCache(); }
async function unggahVideo(file) {
  if (!file || sibuk) return;
  try {
    if (!salVideo) throw new Error("Peramban ini belum bisa mengirim video. Kirim foto saja");
    if (file.size > VIDEO_MB * 1048576) throw new Error(`Video ${Math.round(file.size / 1048576)} MB, paling besar ${VIDEO_MB} MB. Rekam lebih pendek`);
    statusEl.textContent = "Menyiapkan video...";
    const m = await metaVideo(file);
    if (!Number.isFinite(m.durasi)) m.durasi = null; // WebM tanpa durasi tercatat: server memeriksa yang bisa dibaca
    if (m.durasi > VIDEO_DETIK + 1) throw new Error(`Video ${Math.round(m.durasi)} detik, paling lama ${VIDEO_DETIK} detik. Potong dulu atau rekam lebih pendek`);
    const data = {wa, durasi: m.durasi == null ? null : Math.round(m.durasi), gps: posisi, bahasa: bahasaKini(), sampul: m.sampul};
    tambah("saya", "", {foto: m.sampul, simpanKe: false});
    sibuk = true; wadah.replaceChildren(); $("mengetik").hidden = false;
    let idButir = null;
    const hasil = new Promise((ok, gagal) => { salVideo.masukkan({data, berkas: file}).then(id => { idButir = id; janjiVideo.set(id, {ok, gagal}); salVideo.kirimSekarang(); }, gagal); });
    const j = await hasil.catch(async e => { if (!e.tersimpan && idButir) { await salVideo.kirimSekarang(); await salVideo.buang(idButir); } throw e; }); // ditolak: jangan ditahan di antrean
    sibuk = false; statusEl.textContent = "";
    simpanVideoCache(data, j); selesaiBalas(j);
  } catch (e) { sibuk = false; statusEl.textContent = ""; $("mengetik").hidden = true; tambah("bot", `${e.message}.`, {galat: !e.tersimpan, simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); }
}

/* ============ beranda, laporan saya, bantuan ============ */
const IKON_STATUS = {baru: "i-centang", dilihat: "i-cari", ditelaah: "i-daftar", diteruskan: "i-kirim", ditindaklanjuti: "i-status", selesai: "i-centang", tidak_valid: "i-tutup"};
const STATUS_PIL = s => { const p = el("span", `lp-pil lp-pil-ikon ${s.status}`); p.append(ikon(IKON_STATUS[s.status] || "i-status"), s.statusLabel || "Diterima"); return p; }; // pil status berikon (pemilik 19 Nov 2026)
async function segarkanLaporan() {
  for (const l of cache.laporan || []) {
    const t = new URL(l.lacak, location.href).searchParams.get("t");
    try { const j = await (await fetch(`/api/lapor/lacak?t=${t}`, {signal: AbortSignal.timeout(10000)})).json(); if (j.nomor) Object.assign(l, {waktu: j.terkirimMs || l.waktu, bisaSusul: j.bisaSusulan, versi: j.versi, status: j.status, statusLabel: j.statusLabel, jenis: j.jenis, balasan: j.balasan.length}); } catch {}
  }
  simpanCache();
}
/* sidebar: profil pelapor dan jumlah laporan (pemilik 19 Nov 2026: "bagusin") */
function tampilProfil() {
  const p = cache.pelapor, n = (cache.laporan || []).length;
  $("tabProfil").hidden = !p; if (p) { $("tabNama").textContent = p; $("tabAvatar").textContent = p.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase(); $("tabWa").textContent = wa && /^62\d+$/.test(wa) ? `0${wa.slice(2, 5)}****${wa.slice(-4)}${n ? `, ${n} laporan` : ""}` : (n ? `${n} laporan` : ""); }
  $("tabJumlah").hidden = !n; $("tabJumlah").textContent = String(n);
}
function tampilBeranda() {
  tampilProfil();
  const p = cache.pelapor;
  // simpul teks terpisah: "Halo" dan kalimat ikut kamus terjemahan, nama tidak (pemilik 20 Nov 2026: judul tetap bahasa Indonesia saat English)
  if (p) { const nm = el("span", "lp-nama-orang", ` ${p.split(" ")[0]}`); $("sapa").replaceChildren("Halo", nm, ", lihat kejadian bencana? Laporkan di sini."); } else $("sapa").textContent = "Lihat kejadian bencana? Laporkan di sini.";
  const l = cache.laporan?.[0];
  $("kTerbaru").hidden = !l;
  if (l) { // kartu laporan terbaru: foto jenis bencana, nomor, langkah status, tombol lacak (pemilik 19 Nov 2026: "bagusin")
    const id = {"Banjir": "banjir", "Tanah longsor": "longsor", "Gelombang pasang dan abrasi": "abrasi", "Cuaca ekstrem": "cuaca", "Kekeringan": "kekeringan", "Kebakaran hutan dan lahan": "karhutla", "Gempa bumi": "gempa", "Tsunami": "tsunami", "Erupsi gunung api": "erupsi"}[l.jenis];
    const bulat = $("kTerbaru").querySelector(".lp-bulat"); bulat.style.setProperty("background-image", GAMBAR[id] ? `url(/img/bencana-${GAMBAR[id]}.jpg)` : "none", "important"); bulat.classList.toggle("berfoto", !!GAMBAR[id]);
    const URUT = ["diterima", "dilihat", "ditelaah", "ditindaklanjuti", "selesai"], n = Math.max(0, URUT.indexOf(l.status));
    let lk = $("kTerbaru").querySelector(".lp-terbaru-langkah"); if (!lk) lk = el("span", "lp-terbaru-langkah");
    $("kTerbaru").querySelector(".lp-baris-kartu").insertBefore(lk, $("kTerbaruPil")); // langkah di tengah baris judul, bukan di bawah
    lk.replaceChildren(...[["Diterima", "i-centang"], ["Dilihat", "i-cari"], ["Ditelaah", "i-daftar"], ["Ditindaklanjuti", "i-status"], ["Selesai", "i-centang"]].map(([t, ik], i) => { const sp = el("span", i <= n ? "aktif" : i === n + 1 ? "berikut" : ""); sp.append(ikon(ik), t); return sp; }));
    $("kTerbaru").href = l.lacak; $("kTerbaruJudul").textContent = `${l.jenis || "Laporan"} ${l.nomor}`; $("kTerbaruSub").textContent = l.balasan ? `${l.balasan} balasan dari petugas` : "Ketuk untuk melihat status"; $("kTerbaruPil").replaceWith(Object.assign(STATUS_PIL(l), {id: "kTerbaruPil"})); }
}
/* Laporan saya (pemilik 19 Nov 2026: "jelek banget"): pita dengan ringkasan, kartu bergambar per laporan dengan langkah status dan tombol */
/* warna ikon per jenis dari registri bencana (public/bencana.json), sama dengan meja staf (pemilik 19 Nov 2026: "icon setiap bencana warnanya beda") */
const REG_JENIS = {tsunami: "pesisir", abrasi: "pesisir", erupsi: "gunungapi"}, warnaReg = {};
fetch("/bencana.json").then(r => r.json()).then(j => { for (const b of j.bencana || []) warnaReg[b.id] = b.warna; if (!$("lLaporan").hidden) tampilDaftarLaporan(); }).catch(() => {});
const warnaJenis = id => id === "kebakaran_gedung" ? "var(--bad)" : warnaReg[REG_JENIS[id] || id] || "var(--brand2)";
const ID_JENIS = {"Banjir": "banjir", "Tanah longsor": "longsor", "Gelombang pasang dan abrasi": "abrasi", "Cuaca ekstrem": "cuaca", "Kekeringan": "kekeringan", "Kebakaran hutan dan lahan": "karhutla", "Gempa bumi": "gempa", "Tsunami": "tsunami", "Erupsi gunung api": "erupsi", "Kebakaran gedung dan permukiman": "kebakaran_gedung"};
const URUT_STATUS = ["diterima", "dilihat", "ditelaah", "ditindaklanjuti", "selesai"];
async function mulaiSusulan(nomor) {
  try {
    const r = await fetch("/api/lapor/susulan", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({wa, nomor, saluran: "web"})}), j = await r.json();
    if (!r.ok) { statusEl.textContent = j.galat || "Kabar tambahan belum bisa dimulai."; alert(j.galat || "Kabar tambahan belum bisa dimulai."); return; }
    ke("chat"); await ulangChat();
  } catch { alert("Jaringan bermasalah. Coba lagi."); }
}
function tampilDaftarLaporan() {
  const w = $("daftarLaporan"), daftar = cache.laporan || [];
  const aktif = cache.keadaan && !["terkirim", "batal"].includes(cache.keadaan.status) && cache.transkrip.length;
  const selesai = daftar.filter(l => l.status === "selesai").length;
  const ring = $("ringkasLaporan"); ring.replaceChildren(el("b", null, "Ringkasan"));
  for (const [t, n, ik] of [["Laporan terkirim", daftar.length, "i-kirim"], ["Sedang ditangani", daftar.length - selesai, "i-status"], ["Selesai", selesai, "i-centang"]]) {
    const u = el("div", "lp-pita-ubin"), ic = el("span"); ic.append(ikon(ik)); const tx = el("span"); tx.append(el("b", null, String(n)), el("small", null, t)); u.append(ic, tx); ring.append(u); }
  const isi = [];
  if (aktif) { const b = el("button", "lp-lap-kartu draf"); b.type = "button"; const g = el("div", "lp-lap-gambar"); const ic = el("span", "lp-lap-ikon"); ic.append(ikon("i-pesan")); const mk = el("span", "lp-lap-maskot"); mk.innerHTML = maskot("semangat"); g.append(ic, el("span", "lp-pil ditelaah", "Belum dikirim"), mk);
    const tx = el("div", "lp-lap-isi"), bar = el("span", "lp-lap-bar"), bi = el("i"); bi.style.width = `${cache.keadaan.lengkap || 0}%`; bar.append(bi);
    const aksi = el("span", "lp-lap-aksi"); aksi.append(ikon("i-panah"), "Lanjutkan melapor");
    tx.append(el("b", null, "Laporan yang belum selesai"), el("small", null, `Lengkap ${cache.keadaan.lengkap || 0} persen`), bar, aksi); b.append(g, tx); b.addEventListener("click", () => ke("chat")); isi.push(b); }
  for (const l of daftar) {
    const id = ID_JENIS[l.jenis], a = Object.assign(el("a", "lp-lap-kartu"), {href: l.lacak}), g = el("div", "lp-lap-gambar");
    // foto asli yang diunggah pelapor; foto contoh jenis hanya bila laporan tanpa foto (pemilik 19 Nov 2026: "pakai foto real yang diupload")
    if (l.foto) { g.style.setProperty("background-image", `url("${l.foto}")`, "important"); g.classList.add("asli"); } else if (GAMBAR[id]) g.style.backgroundImage = `url(/img/bencana-${GAMBAR[id]}.jpg)`;
    if (!l.foto && l.fotoCek2 !== true && l.lacak) { const t = new URL(l.lacak, location.href).searchParams.get("t"); // laporan lama: ambil foto pertama dari halaman lacak sekali
      fetch(`/api/lapor/lacak?t=${encodeURIComponent(t || "")}`).then(r => r.json()).then(x => { l.fotoCek2 = true; const f = x.fotoPertama; if (f) { l.foto = f; g.style.setProperty("background-image", `url("${f}")`, "important"); g.classList.add("asli"); } simpanCache(); }).catch(() => {}); }
    const ic = el("span", "lp-lap-ikon"); ic.style.setProperty("--jn", warnaJenis(id)); ic.append(ikon(IKON_JENIS[id] || "i-kejadian")); g.append(ic, STATUS_PIL(l));
    const tx = el("div", "lp-lap-isi"), n = Math.max(0, URUT_STATUS.indexOf(l.status)), lk = el("span", "lp-terbaru-langkah");
    lk.append(...[["Diterima", "i-centang"], ["Dilihat", "i-cari"], ["Ditelaah", "i-daftar"], ["Ditindaklanjuti", "i-status"], ["Selesai", "i-centang"]].map(([t, ik], i) => { const sp = el("span", i <= n ? "aktif" : i === n + 1 ? "berikut" : ""); sp.append(ikon(ik), t); return sp; }));
    const aksi = el("span", "lp-lap-aksi"); aksi.append(ikon("i-status"), l.balasan ? `${l.balasan} balasan petugas, lihat` : "Lacak laporan");
    // baris meta: nomor tiket dan waktu kirim berikon (pemilik 19 Nov 2026 "bagusin")
    const meta = el("span", "lp-lap-meta"), m1 = el("span"), m2 = el("span"); m1.append(ikon("i-daftar"), l.nomor);
    m2.append(ikon("i-kalender"), l.waktu ? new Date(l.waktu).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(":", ".") : "Terkirim"); meta.append(m1, m2);
    // laporan susulan (F-28): Tambah kabar 72 jam sejak terkirim, sebelum laporan selesai (Q26); server memeriksa ulang
    const bisaSusul = l.bisaSusul ?? (l.waktu && Date.now() - l.waktu < 72 * 3600e3 && !["selesai", "tidak_valid"].includes(l.status));
    const kep = el("span", "lp-lap-kep"), tombolKep = el("span", "lp-lap-tombol");
    if (bisaSusul) { const tk = el("button", "lp-lap-susul"); tk.type = "button"; tk.append(ikon("i-tambah-teks"), "Tambah kabar");
      tk.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); mulaiSusulan(l.nomor); }); tombolKep.append(tk); }
    tombolKep.append(aksi); kep.append(el("b", null, l.jenis || "Laporan"), tombolKep);
    tx.append(kep, meta, lk); a.append(g, tx); isi.push(a);
  }
  if (!isi.length) {
    const k = el("div", "lp-kosong-besar"), m = el("div", "lp-kosong-maskot"); m.innerHTML = maskot("berpikir");
    const tx = el("div", "lp-kosong-teks"), b = el("button", "lp-utama"); b.type = "button"; b.append(ikon("i-kirim"), "Lapor kejadian"); b.addEventListener("click", bukaChat);
    tx.append(el("h2", null, "Belum ada laporan"), el("p", null, "Laporan yang Anda kirim muncul di sini lengkap dengan nomor tiket, status penanganan, dan balasan petugas."), b); k.append(m, tx); isi.push(k);
  }
  w.replaceChildren(...isi);
}
async function bukaChat(darurat = false) {
  if (darurat === true) {   // K68: laporan darurat selalu dimulai baru; draf laporan biasa yang belum terkirim diganti
    ke("chat"); hangatkanTerima();
    if (log.children.length) log.append(el("li", "tengah", "Laporan darurat"));
    const mulaiDarurat = () => kirim({teks: "darurat", tampil: false});
    return tanyaBahasa(() => wa ? mulaiDarurat() : tanyaNomor(mulaiDarurat));
  }
  ke("chat"); hangatkanTerima();
  if (!log.children.length || ["terkirim", "batal"].includes(cache.keadaan?.status)) { if (cache.keadaan?.status === "terkirim" || cache.keadaan?.status === "batal") { log.append(el("li", "tengah", "Laporan baru")); } const mulaiLapor = () => kirim({teks: "lapor", tampil: false});
    tanyaBahasa(() => wa ? mulaiLapor() : tanyaNomor(mulaiLapor)); }   // bahasa dipilih di jendela awal; di chat ditanya hanya bila belum
}

/* bantuan: definisi juklak dan pertanyaan umum */
const BANTU = [
  ["Melapor", "Apa saja yang perlu disiapkan?", "Lokasi kejadian (sebaiknya Anda di lokasi), perkiraan waktu kejadian, dan bila bisa foto keadaan di lokasi. Data korban dan kerusakan boleh perkiraan; bila belum tahu, biarkan kosong."],
  ["Melapor", "Kenapa lokasi wajib?", "Petugas perlu tahu desa yang terdampak untuk mengirim bantuan dan memeriksa laporan. Lokasi dicocokkan otomatis ke desa, kecamatan, kabupaten/kota, dan provinsi."],
  ["Melapor", "Apakah laporan saya langsung dianggap resmi?", "Belum. Laporan warga diperiksa dulu oleh petugas BNPB dan BPBD setempat. Status pemeriksaan bisa Anda lacak lewat nomor tiket."],
  ["Istilah", "Apa itu pengungsi?", "Orang yang terpaksa keluar dari tempat tinggalnya karena bencana, termasuk yang dievakuasi sebelum dampak, dan tinggal sementara di tenda, gedung publik, atau rumah kerabat."],
  ["Istilah", "Bagaimana menghitung KK?", "Hitung per Kartu Keluarga, bukan per orang. Satu rumah tangga dengan satu Kartu Keluarga dihitung 1 KK berapa pun anggotanya."],
  ["Istilah", "Rusak berat, sedang, ringan, terendam", "Rusak berat: roboh atau sebagian besar struktur utama, dinding, dan lantai rusak. Rusak sedang: sebagian kecil struktur rusak tetapi bangunan masih berdiri. Rusak ringan: retak pada plesteran, struktur masih bisa dipakai. Terendam: tergenang air tanpa kerusakan struktur."],
  ["Istilah", "Skala guncangan gempa", "Pilih fenomena yang Anda lihat: hampir tidak terasa, terasa tanpa kerusakan, kerusakan ringan, sedang, atau berat. Pilihan mengikuti Skala Intensitas Gempabumi BMKG (SIG I sampai V)."],
  ["Status", "Apa arti status laporan?", "Laporan diterima, sudah dilihat petugas, sedang ditelaah, diteruskan ke BPBD setempat, ditindaklanjuti, lalu selesai ditangani. Setiap perubahan bertanggal dan tampil di halaman lacak."],
  /* edukasi siaga (pemilik 19 Nov 2026): teks tetap, bukan jawaban AI. ponytail: disusun dari praktik kesiapsiagaan umum; perlu ditinjau Direktorat Kesiapsiagaan BNPB sebelum publik. */
  ["Edukasi siaga", "Gempa bumi: saat guncangan", "Lindungi kepala dan leher, berlindung di bawah meja yang kuat, jauhi kaca dan lemari. Bila di luar, jauhi bangunan, tiang, dan pohon. Keluar bangunan sesudah guncangan berhenti, lewat tangga, bukan lift."],
  ["Edukasi siaga", "Tsunami: tanda dan tindakan", "Bila di pantai terasa gempa kuat atau lama, atau air laut tiba-tiba surut, segera menjauh dari pantai ke tempat tinggi tanpa menunggu peringatan. Jangan kembali sebelum ada pengumuman resmi."],
  ["Edukasi siaga", "Banjir: sebelum dan saat air naik", "Simpan dokumen penting di wadah kedap air dan di tempat tinggi. Matikan listrik dari meteran saat air mulai masuk. Jangan berjalan atau berkendara melewati arus deras; arus setinggi lutut dapat menghanyutkan orang."],
  ["Edukasi siaga", "Tanah longsor: tanda bahaya", "Waspadai retakan baru di tanah atau dinding, pintu dan jendela yang tiba-tiba sulit dibuka, mata air baru, atau air sungai mendadak keruh. Saat hujan lebat lama di lereng, mengungsilah ke tempat yang lebih aman."],
  ["Edukasi siaga", "Kebakaran hutan dan lahan: asap", "Kurangi kegiatan di luar saat asap tebal, pakai masker yang rapat, dan utamakan perlindungan bayi, lansia, ibu hamil, dan penderita sesak napas. Jangan membakar lahan atau sampah."],
  ["Edukasi siaga", "Erupsi gunung api: hujan abu", "Ikuti radius bahaya dari PVMBG dan perintah petugas. Saat hujan abu, pakai masker dan kacamata, tutup sumber air, dan bersihkan abu dari atap supaya tidak roboh."],
  ["Edukasi siaga", "Tas siaga bencana", "Siapkan tas berisi air minum, makanan tahan lama, obat pribadi, senter, peluit, salinan dokumen penting, uang tunai, dan pakaian ganti. Letakkan di tempat yang mudah diambil."],
  ["Privasi", "Siapa yang bisa membaca laporan saya?", "Hanya petugas BNPB dan BPBD yang menangani. Nomor WhatsApp dan foto tidak ditampilkan ke publik. Rincian ada di kebijakan privasi."],
];
/* FAQ gaya halaman Tentang (details name="faq": satu terbuka sekaligus); edukasi dari edukasi.json bila ada (riset sumber resmi) */
let EDU = null, grupAktif = "Semua";
const GRUP = ["Semua", "Melapor", "Istilah", "Status", "Edukasi siaga", "Privasi"];
/* ikon per pertanyaan, bukan satu ikon per kelompok (pemilik 19 Nov 2026: "iconnya ganti-ganti dong") */
const IKON_TANYA = [[/disiapkan/i, "i-kebutuhan"], [/lokasi/i, "i-lokasi"], [/resmi/i, "i-centang"], [/pengungsi/i, "i-pengungsian"], [/KK/, "i-korban"], [/rusak/i, "i-rumah"],
  [/guncangan|gempa/i, "i-kejadian"], [/status/i, "i-status"], [/tas siaga/i, "i-kebutuhan"], [/membaca|privasi/i, "i-orang"], [/foto/i, "i-kamera"], [/waktu/i, "i-kalender"]];
const ikonTanya = t => IKON_TANYA.find(([r]) => r.test(t))?.[1];
function faqEl(t, isiFn, gambar, {sub, idIlus, ikonGrup} = {}) { const d = el("details", "lp-faq2"); d.name = "faq"; const s = el("summary"), w = el("div", "isi");
  // tiap baris punya visual: foto bencana, ilustrasi topik, atau ikon kelompok (pemilik 19 Nov 2026: "kasih gambar dong")
  if (gambar) { const g = el("span", "lp-faq-gambar"); g.style.backgroundImage = `url(/img/bencana-${gambar}.jpg)`; s.append(g); }
  else if (adaIlustrasi(idIlus)) { const g = el("span", "lp-faq-gambar ilus"); g.innerHTML = ilustrasi(idIlus); s.append(g); }
  else if (ikonGrup) { const g = el("span", "lp-faq-ikon"); g.append(ikon(ikonGrup)); s.append(g); }
  const j = el("span", "lp-faq-judul"); j.append(el("span", null, t)); if (sub) j.append(el("small", null, sub)); s.append(j); d.append(s, w);
  let terisi = false; d.addEventListener("toggle", () => { if (d.open && !terisi) { isiFn(w); terisi = true; } }); // isi dibuat saat dibuka: daftar panjang tetap ringan
  return d; }
function itemBantu() {
  const dasar = BANTU.filter(([g]) => !(EDU && g === "Edukasi siaga")).map(([g, t, i]) => ({g, t, isi: w => w.append(el("p", null, i)), cari: `${t} ${i}`}));
  const edu = (EDU?.topik || []).map(x => ({g: "Edukasi siaga", t: x.judul, cari: `${x.judul} ${x.ringkas || ""} ${[...(x.tanda || []), ...(x.sebelum || []), ...(x.saat || []), ...(x.sesudah || []), ...(x.butir || [])].join(" ")}`,
    gambar: x.gambar, id: x.id, sub: x.ringkas,
    isi: w => {
      // ilustrasi: foto bencana, tanda bahaya menonjol, lalu Sebelum, Saat, Sesudah sebagai langkah bernomor (pemilik 19 Nov 2026: "kasih gambar atau ilustrasi")
      const teks = () => { const t = el("div", "lp-edu-teks"); t.append(el("span", "lp-edu-label", "Siaga bencana"), el("h3", null, x.judul)); if (x.ringkas) t.append(el("p", null, x.ringkas)); return t; };
      if (x.gambar) { const f = el("div", "lp-edu-foto"); f.style.backgroundImage = `url(/img/bencana-${x.gambar}.jpg)`; f.append(teks()); if (x.kredit) f.append(el("span", "lp-kredit", x.kredit)); w.append(f); }
      else if (adaIlustrasi(x.id)) { const f = el("div", "lp-edu-foto ilus"); f.append(teks()); f.insertAdjacentHTML("beforeend", ilustrasi(x.id)); w.append(f); }
      else if (x.ringkas) w.append(el("p", null, x.ringkas));
      if (x.tanda?.length) { const t = el("div", "lp-edu-tanda"), h = el("b"); h.append(ikon("i-kejadian"), "Tanda bahaya"); const ul = el("ul"); x.tanda.forEach(b => ul.append(el("li", null, b))); t.append(h, ul); w.append(t); }
      const fase = [["sebelum", "Sebelum", "i-status"], ["saat", "Saat kejadian", "i-kejadian"], ["sesudah", "Sesudah", "i-centang"]].filter(([k]) => x[k]?.length);
      if (fase.length) { const g = el("div", "lp-edu-fase"); for (const [k, lab, ik] of fase) { const c = el("section", `lp-edu-kolom ${k}`), h = el("b"); h.append(ikon(ik), lab); const ol = el("ol"); x[k].forEach(b => ol.append(el("li", null, b))); c.append(h, ol); g.append(c); } w.append(g); }
      if (x.butir?.length) { const ol = el("ol", "lp-edu-butir"); x.butir.forEach(b => { const m = b.match(/^(\d{3}(?:-\d+)?): (.+)$/s); // "112: ..." jadi kartu bernomor besar
        if (!m) return ol.append(el("li", null, b)); const li = el("li", "nomor"), a = Object.assign(el("a", "lp-edu-no", m[1]), {href: `tel:${m[1].replace(/\D/g, "")}`}); li.append(a, el("span", null, m[2][0].toUpperCase() + m[2].slice(1))); ol.append(li); }); w.append(ol); }
      // sumber sebagai label; nama lembaga yang sama digabung, tautannya tetap satu per sumber (pemilik 19 Nov 2026: "sumber dibuat label")
      if (x.sumber?.length) { const p = el("div", "lp-sumber"); p.append(el("span", "lp-sumber-judul", "Sumber"));
        const per = new Map(); for (const u of x.sumber) per.set(u.lembaga, [...(per.get(u.lembaga) || []), u.url]);
        for (const [lembaga, url] of per) url.forEach((h, i) => { const a = el("a", "lp-sumber-label"); a.href = h; a.target = "_blank"; a.rel = "noopener"; a.append(ikon("i-centang"), url.length > 1 ? `${lembaga} ${i + 1}` : lembaga); p.append(a); });
        w.append(p); } }}));
  return [...dasar, ...edu];
}
function pilihGrup(g) { grupAktif = g; $("iCariBantu2").value = ""; tampilBantu(); }
function tampilBantu(q = "") {
  const kata = q.toLowerCase().trim(), semua = itemBantu();
  const IKON_SARING = {"Semua": "i-daftar", "Melapor": "i-kirim", "Istilah": "i-bantuan", "Status": "i-status", "Edukasi siaga": "i-kejadian", "Privasi": "i-orang"};
  // pilihan kelompok selebar layar, dibagi rata, berikon dan berjumlah (aturan deretan pilihan ujung ke ujung)
  $("saringBantu").replaceChildren(...GRUP.map(g => { const b = el("button"); b.append(ikon(IKON_SARING[g]), el("span", null, g), el("small", null, String(g === "Semua" ? semua.length : semua.filter(x => x.g === g).length))); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(g === grupAktif && !kata)); b.addEventListener("click", () => pilihGrup(g)); return b; }));
  const cocok = semua.filter(x => kata ? x.cari.toLowerCase().includes(kata) : grupAktif === "Semua" || x.g === grupAktif);
  // tiap kelompok satu kompartemen berkepala ikon (pemilik 19 Nov 2026: "kasih icon kompartemen")
  const IKON_GRUP = {"Melapor": "i-kirim", "Istilah": "i-daftar", "Status": "i-status", "Edukasi siaga": "i-bantuan", "Privasi": "i-orang"};
  const per = new Map(); for (const x of cocok) per.set(x.g, [...(per.get(x.g) || []), x]);
  const isi = [...per].map(([g, daftar]) => {
    const k = el("section", "lp-kompartemen"), h = el("h2", "lp-kompartemen-kepala"); h.append(ikon(IKON_GRUP[g] || "i-bantuan"), g, el("span", "lp-kompartemen-jumlah", String(daftar.length)));
    const w = el("div", "lp-kompartemen-isi lp-faq-kisi"); daftar.forEach(x => w.append(faqEl(x.t, x.isi, x.gambar, {sub: x.sub, idIlus: x.id, ikonGrup: ikonTanya(x.t) || IKON_GRUP[g] || "i-bantuan"})));
    if (g === "Privasi") { const b = el("button", "lp-faq-tautan"); b.type = "button"; b.append("Kebijakan privasi lengkap", ikon("i-panah")); b.addEventListener("click", bukaPrivasi); w.append(b); }
    k.append(h, w); return k;
  });
  if (!cocok.length) isi.push(el("p", "lp-redup", "Tidak ada yang cocok. Coba kata lain."));
  $("daftarBantu").replaceChildren(...isi);
  tampilRingkas(semua, grupRingkas);
}
/* ringkasan bantuan di Beranda: deretan pilihan kelompok yang sama dengan layar Bantuan (pemilik 19 Nov 2026: "agar ada kaya gini di sini") */
let grupRingkas = "Semua";
function tampilRingkas(semua, g) {
  grupRingkas = g;
  const IK = {"Semua": "i-daftar", "Melapor": "i-kirim", "Istilah": "i-bantuan", "Status": "i-status", "Edukasi siaga": "i-kejadian", "Privasi": "i-orang"};
  $("saringRingkas").replaceChildren(...GRUP.map(k => { const b = el("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === g));
    b.append(ikon(IK[k]), el("span", null, k), el("small", null, String(k === "Semua" ? semua.length : semua.filter(x => x.g === k).length)));
    b.addEventListener("click", () => tampilRingkas(semua, k)); return b; }));
  const pilih = g === "Semua" ? semua.filter(x => ["Melapor", "Istilah"].includes(x.g)) : semua.filter(x => x.g === g);
  $("daftarBantuRingkas").replaceChildren(...pilih.slice(0, 4).map(x => faqEl(x.t, x.isi, x.gambar, {sub: x.sub, idIlus: x.id, ikonGrup: ikonTanya(x.t) || IK[x.g] || "i-bantuan"})));
}
$("iCariBantu2").addEventListener("input", e => tampilBantu(e.target.value));
fetch("/lapor/edukasi.json", {signal: AbortSignal.timeout(10000)}).then(r => r.ok ? r.json() : null).then(j => { if (j?.topik?.length) { EDU = j; tampilBantu(); } }).catch(() => {});

/* ============ kebijakan privasi di dalam aplikasi (tata letak halaman legal; isi untuk layanan BNPB, draf menunggu tinjauan hukum) ============ */
const PRIVASI = [
  ["Data yang kami kumpulkan", [["p", "Saat Anda melapor lewat Lapor Bencana BNPB, kami mencatat:"], ["ul", ["Identitas pelapor: nama, nomor WhatsApp, dan peran (warga atau petugas BPBD beserta kabupaten/kota dan jabatan).",
    "Isi laporan: jenis dan karakteristik kejadian, waktu kejadian, lokasi (titik GPS atau desa yang Anda pilih, RT dan RW), jumlah korban, pengungsi, dan kerusakan dalam bentuk angka, serta kebutuhan.",
    "Foto yang Anda kirim beserta waktu dan lokasi pengambilannya.", "Percakapan dengan asisten AI, waktu pesan, dan nilai yang Anda berikan untuk percakapan."]],
    ["p", "Kami tidak meminta nama korban atau Nomor Induk Kependudukan. Nomor telepon, NIK, dan alamat surel yang tertulis di pesan disamarkan sebelum diproses asisten AI."]]],
  ["Untuk apa data dipakai", [["ul", ["Menyusun laporan kejadian bencana dan meneruskannya kepada petugas BNPB dan BPBD yang menangani.", "Memeriksa kebenaran laporan dan menghubungi Anda bila perlu konfirmasi.",
    "Mengirim kabar status laporan kepada Anda.", "Menyusun statistik kejadian tanpa identitas pelapor untuk perencanaan penanggulangan bencana."]]]],
  ["Asisten AI", [["p", "Pesan Anda diproses asisten AI untuk menangkap isian laporan. Hanya teks pesan yang sudah disamarkan yang dikirim ke penyedia layanan AI; identitas, foto, dan koordinat Anda tidak dikirim. Asisten AI tidak memutuskan status kejadian; keputusan tetap di tangan petugas."]]],
  ["Siapa yang dapat melihat", [["p", "Laporan dan identitas Anda hanya dapat dibaca petugas BNPB dan BPBD yang menangani kejadian. Laporan tidak ditampilkan di halaman publik. Halaman lacak laporan hanya terbuka bagi pemegang tautan yang dikirim kepada Anda."]]],
  ["Penyimpanan dan keamanan", [["p", "Data disimpan di layanan yang dikelola untuk BNPB dengan akses terbatas dan tercatat. Riwayat status laporan tidak dapat diubah, hanya ditambah. Lama penyimpanan sementara 2 tahun sesudah laporan selesai ditangani, menunggu ketetapan BNPB."]]],
  ["Hak Anda", [["p", "Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda dapat meminta salinan data Anda, meminta perbaikan, atau meminta penghapusan identitas Anda dengan mengetik \"hapus data\" di percakapan. Isian kejadian yang tidak memuat data pribadi tetap disimpan untuk penanganan bencana."]]],
  ["Laporan palsu", [["p", "Laporan yang sengaja tidak benar menghambat penanganan bencana. Laporan yang terbukti tidak benar ditandai tidak dapat ditindaklanjuti."]]],
  ["Perubahan kebijakan", [["p", "Kebijakan ini dapat diperbarui. Tanggal berlaku tercantum di bagian atas halaman ini."]]],
  ["Kontak", [["p", "Pertanyaan tentang data Anda dapat disampaikan ke BNPB melalui call center 117 atau persuratan@bnpb.go.id."]]],
];
function bukaPrivasi() {
  const w = $("isiPrivasi");
  if (!w.childElementCount) {
    const kp = el("header", "lp-legal-kepala"); kp.append(el("p", "lp-alis lp-alis-terang", "Lapor Bencana BNPB"), el("h1", null, "Kebijakan Privasi"), el("p", "lp-legal-catatan", "Draf untuk uji coba. Isi akan ditinjau bagian hukum BNPB sebelum layanan dibuka untuk umum."));
    const daftar = el("ol", "lp-legal-daftar"), isi = el("div", "lp-legal-isi"), meta = el("dl", "lp-legal-meta");
    isi.append(el("p", null, "Kebijakan ini menjelaskan data apa yang dikumpulkan layanan Lapor Bencana BNPB, untuk apa data itu dipakai, siapa yang dapat melihatnya, dan hak Anda atas data tersebut."));
    PRIVASI.forEach(([judul, blok], i) => {
      const id = `privasi-${i + 1}`, a = Object.assign(el("a"), {href: `#${id}`}); a.append(el("span", null, String(i + 1).padStart(2, "0")), judul);
      a.addEventListener("click", e => { e.preventDefault(); $(id).scrollIntoView({behavior: "smooth", block: "start"}); });
      const li = el("li"); li.append(a); daftar.append(li);
      isi.append(Object.assign(el("h2", null, `${i + 1}. ${judul}`), {id}));
      for (const [jenis, x] of blok) { if (jenis === "p") isi.append(el("p", null, x)); else { const ul = el("ul"); x.forEach(b => ul.append(el("li", null, b))); isi.append(ul); } }
    });
    for (const [k, v] of [["Berlaku", "19 November 2026"], ["Jenis", "Kebijakan"], ["Untuk", "Pelapor"], ["Bahasa", "Indonesia"]]) meta.append(el("dt", null, k), el("dd", null, v));
    // bagian per h2 jadi kartu berikon (pemilik 19 Nov 2026: "bagusin"); pembuka tetap di atas kartu
    const IK_LEGAL = ["i-daftar", "i-status", "i-pesan", "i-orang", "i-kebutuhan", "i-centang", "i-kejadian", "i-kalender", "i-telepon"];
    const anak = [...isi.children], kartuL = []; let kini = null, n = 0;
    for (const e of anak) { if (e.tagName === "H2") { kini = el("section", "lp-legal-kartu"); const h = el("h2"), u = el("span"); u.append(ikon(IK_LEGAL[n++ % IK_LEGAL.length])); h.id = e.id; h.append(u, e.textContent); kini.append(h); kartuL.push(kini); } else (kini || (kartuL.pembuka ||= el("div", "lp-legal-pembuka"))).append(e); }
    isi.replaceChildren(...(kartuL.pembuka ? [kartuL.pembuka] : []), ...kartuL);
    w.append(kp, daftar, isi, meta);
  }
  ke("privasi");
}
$("bTutupPrivasi").addEventListener("click", () => ke(kembaliKe || "beranda"));


/* balasan admin dan perubahan status (pemilik 19 Nov 2026: "bisa juga nanti dibalas sama admin") */
async function tarikKotak() {
  if (!wa || document.hidden) return;
  try {
    const j = await (await fetch(`/api/lapor/kotak?wa=${wa}&sejak=${cache.kotakSejak || 0}`, {signal: AbortSignal.timeout(10000)})).json();
    for (const k of j.pesan || []) { tambah("admin", `*${k.nomor}*\n${k.teks}`); cache.kotakSejak = Math.max(cache.kotakSejak || 0, k.waktu); $("titikBaru").hidden = false; }
    if (j.pesan?.length) { await segarkanLaporan(); tampilBeranda(); simpanCache(); }
  } catch {}
}

/* ============ info daerah, prediksi 3 hari, nomor penting: ringkasan langsung di chat (pemilik 19 Nov 2026) ============ */
const INFO = {info: ["Info dan prediksi daerah", "Hari ini dan 3 hari ke depan", "i-lokasi"], prediksi: ["Prediksi 3 hari", "Hujan, banjir, longsor, asap, angin", "i-kalender"], penting: ["Nomor penting", "BPBD, rumah sakit, polisi, pemadam", "i-telepon"]};
let infoMode = "info";
function tambahInfo(dari, teks) {
  const li = el("li", `${dari} baru`);
  if (dari === "bot") { const img = el("img"); img.src = AVATAR; img.alt = ""; img.width = img.height = 28; li.append(img); }
  const g = el("div", "lp-gelembung"); teksWa(g, teks); li.append(g); $("logInfo").append(li);
  requestAnimationFrame(() => $("gulirInfo").scrollTo({top: $("gulirInfo").scrollHeight, behavior: "smooth"}));
}
function bukaInfo(mode) {
  infoMode = mode; ke("info");
  $("infoJudul").textContent = INFO[mode][0]; $("infoSub").textContent = INFO[mode][1];
  $("infoIkon").className = `lp-info-ikon ${mode}`; $("infoIkon").replaceChildren(ikon(INFO[mode][2])); // ikon layanan, bukan logo (pemilik 19 Nov 2026: "bagusin")
  $("logInfo").replaceChildren(); $("kartuInfo").replaceChildren();
  tambahInfo("bot", mode === "penting" ? "Nomor yang tampil adalah yang terdekat dari lokasi Anda. Pilih lokasinya dulu." : "Pilih daerahnya dulu.");
  if (cache.daerah) pilihDaerahTersimpan(); else kartuLokasiInfo();
}
function pilihDaerahTersimpan() { kartuLokasiInfo(); } // daerah terakhir jadi satu ubin di kartu lokasi, GPS dan cari langsung tersedia (pemilik 19 Nov 2026)
function kartuLokasiInfo() {
  const k = el("section", "lp-langkah lp-langkah-lok"), isi = el("div", "lp-langkah-isi");
  isiLokasi(isi, {judul: "Pilih daerah Anda", ket: "Informasi ditampilkan untuk kabupaten/kota tempat Anda berada.",
    pakaiPosisi: p => ambilDaerah({lat: p.coords.latitude, lon: p.coords.longitude}, "Lokasi saat ini"),
    pilihCari: d => ambilDaerah({kode: d.kode}, d.judul), kabupatenCukup: infoMode !== "penting",
    terakhir: cache.daerah ? (w => ({judul: w.wilayah.desa ? `Desa/Kel. ${w.wilayah.desa}` : w.wilayah.kab, sub: w.wilayah.desa ? `Kec. ${w.wilayah.kec}, ${w.wilayah.kab}` : w.wilayah.prov,
      aksi: () => ambilDaerah(w.q, w.wilayah.desa ? `Desa/Kel. ${w.wilayah.desa}` : w.wilayah.kab)}))(cache.daerah) : null});
  k.append(isi); $("kartuInfo").replaceChildren(k);
}
async function ambilDaerah(q, tampil) {
  const li = el("li", "saya baru"), g = el("div", "lp-gelembung", tampil); li.append(g); $("logInfo").append(li);
  $("kartuInfo").replaceChildren(Object.assign(el("p", "lp-mengetik"), {innerHTML: '<span class="lp-gelembung-titik"><i></i><i></i><i></i></span>'}));
  const qs = new URLSearchParams(q).toString();
  try {
    if (infoMode === "penting") {
      const r = await fetch(`/api/lapor/penting?${qs}`), j = await r.json(); if (!r.ok) throw new Error(j.galat);
      cache.daerah = {q, wilayah: j.wilayah}; simpanCache();
      tambahInfo("bot", j.wilayah.desa ? `*Nomor penting sekitar Desa/Kel. ${j.wilayah.desa}*\nKec. ${j.wilayah.kec}, ${j.wilayah.kab}` : `*Nomor penting di ${j.wilayah.kab}*\nJarak dihitung dari kantor BPBD. Pakai lokasi saat ini untuk jarak dari tempat Anda.`);
      kartuPenting(j); $("kartuInfo").append(opsiLanjut(q));
    } else {
      const r = await fetch(`/api/lapor/daerah?${qs}`), j = await r.json(); if (!r.ok) throw new Error(j.galat);
      cache.daerah = {q, wilayah: j.wilayah}; simpanCache();
      // info dan prediksi digabung (pemilik 19 Nov 2026): hari ini dengan imbauan, lalu prakiraan 3 hari
      if (j.perHari?.length) { if (infoMode !== "prediksi") kartuPrediksi(j, true); kartuPrediksi(j); } else tambahInfo("bot", infoMode === "prediksi" ? j.prediksi : j.info);
      $("kartuInfo").replaceChildren(opsiLanjut(q));
    }
  } catch (e) { tambahInfo("bot", `${e.message || "Data belum bisa dimuat"}. Coba lagi.`); kartuLokasiInfo(); }
}
/* prediksi 3 hari sebagai kartu per hari: curah hujan besar berikon, ancaman berwarna per tingkat (pemilik 19 Nov 2026: "bagusin") */
function kartuPrediksi(j, hariIni = false) { // hariIni: format yang sama untuk Info hari ini, satu hari plus imbauan
  const li = el("li", "bot baru lp-pred-li"), w = el("div", "lp-pred"), kp = el("div", "lp-pred-kepala");
  const lok = j.wilayah?.desa ? `Desa/Kel. ${j.wilayah.desa}, Kec. ${j.wilayah.kec}, ${j.kab}` : `${j.kab}, ${j.prov}`;
  kp.append(el("b", null, hariIni ? `Info hari ini, ${lok}` : `Prediksi 3 hari, ${j.kab}`), el("small", null, `Diperbarui ${j.dibuat} WIB`)); w.append(kp);
  const kisi = el("div", `lp-pred-kisi${hariIni ? " hari-ini" : ""}`);
  for (const h of hariIni ? j.perHari.slice(0, 1) : j.perHari) {
    const c = el("section", "lp-pred-hari"); c.append(el("h4", null, h.tanggal));
    const mm = h.hujanMm, kat = mm == null ? null : mm < 1 ? "Tidak hujan" : mm > 150 ? "Ekstrem" : mm > 100 ? "Sangat lebat" : mm > 50 ? "Lebat" : mm > 20 ? "Sedang" : "Ringan";
    const hj = el("div", `lp-pred-hujan ${mm > 50 ? "tinggi" : mm > 20 ? "sedang" : ""}`); hj.append(ikon("b-banjir"));
    const ht = el("span"); ht.append(el("b", null, mm == null ? "Tidak ada data" : `${mm.toLocaleString("id-ID")} mm`), el("small", null, kat ? `Hujan ${kat.toLowerCase()}${mm >= 5 && h.puncak != null ? `, puncak pukul ${String(h.puncak).padStart(2, "0")}.00` : ""}` : "")); hj.append(ht); c.append(hj);
    const an = el("div", "lp-pred-ancaman");
    if (!h.ancaman.length) an.append(el("span", "lp-pred-chip aman", "Semua ancaman normal"));
    for (const a of h.ancaman) an.append(el("span", `lp-pred-chip lv${a.lv}`, `${a.label}: ${a.tingkat}`));
    c.append(an); kisi.append(c);
  }
  if (hariIni) { // imbauan dari aturan dampak /prediksi
    const im = el("section", "lp-pred-hari lp-pred-imbauan"); im.append(el("h4", null, "Imbauan"));
    if (!j.waspada?.length) im.append(el("p", "lp-redup", "Belum ada imbauan khusus untuk daerah ini."));
    // imbauan sama di beberapa hari digabung jadi satu baris, imbauan berbeda berjajar sebaris (pemilik 19 Nov 2026: "agar dibuat sebaris")
    const per = new Map(); for (const x of j.waspada || []) per.set(x.maka, [...(per.get(x.maka) || []), x.hari]);
    const baris = el("div", "lp-pred-imb-baris");
    for (const [maka, hari] of per) { const r = el("div", "lp-pred-imb"), ic = el("span"); ic.append(ikon("i-kejadian")); const tx = el("span"); tx.append(el("b", null, maka), el("small", null, hari.join(" dan "))); r.append(ic, tx); baris.append(r); }
    if (per.size) im.append(baris);
    kisi.append(im);
  }
  w.append(kisi); li.append(w); $("logInfo").append(li);
  requestAnimationFrame(() => $("gulirInfo").scrollTo({top: $("gulirInfo").scrollHeight, behavior: "smooth"}));
}
/* pilihan lanjutan di layar info: berikon, selalu ada sesudah info, prediksi, dan nomor penting (pemilik 19 Nov 2026) */
function opsiLanjut(q) {
  const d = el("div", "lp-opsi lp-opsi-ikon lp-opsi-banyak lp-lanjut");
  const pilih = [["info", "Info dan prediksi", "i-lokasi"], ["penting", "Nomor penting", "i-telepon"]].filter(([m]) => m !== infoMode && !(m === "info" && infoMode === "prediksi"))
    .map(([m, t, ik]) => [t, ik, () => { infoMode = m; ambilDaerah(q, t); }]);
  for (const [t, ik, f, kelas] of [...pilih, ["Lapor kejadian", "i-kirim", bukaChat, "utama"], ["Daerah lain", "i-cari", kartuLokasiInfo]]) {
    const b = tombolOpsi(t, null, f, kelas || ""); const u = el("span", "lp-opsi-ubin"); u.append(ikon(ik)); b.prepend(u); d.append(b); }
  d.style.setProperty("--kol", d.children.length); // sebaris sampai ujung (pemilik 19 Nov 2026)
  return d;
}
const peta = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
function kartuPenting(j) {
  const k = el("section", "lp-langkah"), kp = el("div", "lp-langkah-kepala"), isi = el("div", "lp-langkah-isi"); kp.append(ikon("i-telepon"), "Nomor penting");
  const kisi = el("div", "lp-kontak-kisi");
  const IK_NAS = {112: "i-telepon", 113: "i-kejadian", 119: "i-korban", 110: "i-orang", 115: "i-cari", 117: "i-status"};
  for (const n of j.nasional) { const a = Object.assign(el("a"), {href: `tel:${n.nomor}`}); const u = el("span", "lp-nas-ikon"); u.append(ikon(IK_NAS[n.nomor] || "i-telepon")); a.append(u, el("b", null, n.nomor), el("small", null, n.label)); kisi.append(a); }
  // tiap jenis fasilitas satu kompartemen berikon, tersusun berkolom selebar layar (pemilik 19 Nov 2026: "white space di kiri banyak banget")
  const kolom = el("div", "lp-kontak-kolom");
  const grup = (judul, ik, isiFn) => { const g = el("section", `lp-kontak-grup g-${ik.replace("i-", "")}`), h = el("h3"); h.append(ikon(ik), judul); const daftar = el("div", "lp-kontak"); isiFn(daftar); g.append(h, daftar); kolom.append(g); };
  // baris fasilitas: ikon jenis, nama dengan label jarak berikon sebaris, alamat di bawah, tombol berikon (pemilik 19 Nov 2026: "jarak dibuat ikon dan label, satu baris")
  const baris = (judul, {ik, km, alamat}, kanan, href, merah) => { const a = Object.assign(el(href ? "a" : "div", "lp-fas"), href ? {href, target: href.startsWith("http") ? "_blank" : "", rel: "noopener"} : {});
    const u = el("span", "lp-fas-ikon"); u.append(ikon(ik)); const t = el("span", "lp-fas-teks"), atas = el("span", "lp-fas-atas"); atas.append(el("b", null, judul));
    if (km != null) { const l = el("span", "lp-fas-jarak"); l.append(ikon("i-lokasi"), `${km.toLocaleString("id-ID")} km`); atas.append(l); }
    t.append(atas); if (alamat) t.append(el("small", null, alamat)); a.append(u, t);
    if (kanan) { const k = el("span", `no${merah ? " merah" : ""}`); k.append(ikon(merah ? "i-telepon" : "i-arah"), el("span", "lp-no-teks", kanan)); k.title = kanan; a.append(k); } return a; };
  grup("BPBD", "i-status", daftar => {
    for (const b of j.bpbd) daftar.append(baris(b.nama, {ik: "i-status", km: b.jarakKm, alamat: b.alamat}, b.nomor ? "Telepon" : "Arah", b.nomor ? `tel:${b.nomor.replace(/[^\d+]/g, "")}` : peta(b.lat, b.lon), !!b.nomor));
    if (!j.bpbd.length) daftar.append(baris("BPBD setempat", {ik: "i-status", alamat: "Nomor belum tercatat di data kami. Hubungi 112."}, "112", "tel:112", true)); });
  for (const [judul, list, ik] of [["Rumah sakit terdekat", j.rs, "i-fasilitas"], ["Puskesmas terdekat", j.puskesmas, "i-korban"], ["Kantor polisi terdekat", j.polisi, "i-orang"]])
    if (list?.length) grup(judul, ik, daftar => { for (const x of list) daftar.append(baris(x.nama, {ik, km: x.jarakKm}, "Arah", peta(x.lat, x.lon))); });
  k.classList.add("lp-langkah-penting");
  kolom.style.setProperty("--kol", kolom.childElementCount);
  const nas = el("section", "lp-kontak-grup nasional"), hn = el("h3"); hn.append(ikon("i-telepon"), "Nomor darurat nasional"); nas.append(hn, kisi);
  isi.append(nas, kolom, el("p", "lp-catatan-kecil", "Lokasi fasilitas dari OpenStreetMap; nomor BPBD dari peta BPBD BNPB. Pemadam kebakaran: 113."));
  k.append(kp, isi); $("kartuInfo").replaceChildren(k);
}
$("bTutupInfo").addEventListener("click", () => { ke("beranda"); tampilBeranda(); });

/* ============ Alun-alun (K30, Q14, K59): hanya laporan ditindaklanjuti atau selesai, tanpa identitas pelapor ============
   Peta titik pusat desa (D84), satu kartu per gugus dengan "N warga melapor" (D85), Ikuti kejadian di perangkat tanpa akun (D86):
   daftar id kartu dan status terakhir yang dilihat disimpan di localStorage; kartu yang statusnya berubah ditandai. */
let alunJenis = "", alunPeta = null, alunData = [];
const ikutiBaca = () => { try { return JSON.parse(localStorage.getItem("lapor-ikuti") || "{}"); } catch { return {}; } };
const ikutiTulis = x => { try { localStorage.setItem("lapor-ikuti", JSON.stringify(x)); } catch {} };
// MapLibre butuh warna jadi (tanpa var() dan oklch): token tema diubah ke rgb lewat kanvas 1 piksel
const tok = v => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = getComputedStyle(document.body).getPropertyValue(v).trim() || "gray"; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`; };
function muatMaplibre() { // dimuat saat Alun-alun pertama dibuka saja (berkas besar, tidak perlu di beranda)
  if (window.maplibregl) return Promise.resolve();
  return muatMaplibre.janji ||= new Promise((ok, gagal) => { const l = Object.assign(document.createElement("link"), {rel: "stylesheet", href: "/vendor/maplibre/maplibre-gl.css"}); document.head.append(l);
    const sc = Object.assign(document.createElement("script"), {src: "/vendor/maplibre/maplibre-gl.js"}); sc.onload = ok; sc.onerror = gagal; document.head.append(sc); });
}
function kartuAlun(x, ikut) {
  const a = el("article", "lp-alun-kartu"), g = el("div", "lp-alun-gambar"); if (GAMBAR[x.jenisId]) g.style.backgroundImage = `url(/img/bencana-${GAMBAR[x.jenisId]}.jpg)`;
  a.id = `alun-${x.id}`;
  g.append(el("span", `lp-pil ${x.status}`, x.statusLabel));
  const berubah = ikut[x.id] && ikut[x.id] !== x.status; if (berubah) g.append(el("span", "lp-pil lp-alun-berubah", "Status berubah"));
  const isi = el("div", "lp-alun-isi");
  isi.append(el("b", null, `${x.jenis}${x.subjenis ? `, ${x.subjenis.toLowerCase()}` : ""}`),
    el("small", null, [x.lokasi.desa && `Desa/Kel. ${x.lokasi.desa}`, x.lokasi.kec && `Kec. ${x.lokasi.kec}`, x.lokasi.kab, x.lokasi.prov].filter(Boolean).join(", ")),
    el("small", "lp-redup", `${x.waktu || "Waktu belum didata"}, dilaporkan ${x.tingkat.toLowerCase()}`));
  if (x.nWarga) { const n = el("p", "lp-alun-warga"); n.append(ikon("i-orang"), `${x.nWarga.toLocaleString("id-ID")} warga melapor kejadian ini`); isi.append(n); }
  const d = el("div", "lp-alun-dampak");
  for (const [k, t] of [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka"], ["mengungsi", "mengungsi"], ["rumah", "rumah rusak"], ["terendam", "rumah terendam"]])
    if (x.dampak[k]) d.append(el("span", null, `${x.dampak[k].toLocaleString("id-ID")} ${t}`));
  if (d.childElementCount) isi.append(d);
  if (x.bukti?.length) { const bk = el("div", "lp-alun-bukti"); bk.append(el("small", null, "Foto penanganan petugas"));
    const kisi = el("div"); for (const u of x.bukti) { const im = el("img"); im.src = u; im.alt = "Foto penanganan oleh petugas"; im.loading = "lazy"; kisi.append(im); } bk.append(kisi); isi.append(bk); }
  const ik = el("button", `lp-kedua lp-alun-ikuti${ikut[x.id] ? " aktif" : ""}`); ik.type = "button"; ik.setAttribute("aria-pressed", String(!!ikut[x.id]));
  ik.append(ikon(ikut[x.id] ? "i-centang" : "i-plus"), ikut[x.id] ? "Diikuti" : "Ikuti kejadian");
  ik.title = "Disimpan di perangkat ini. Kartu ditandai saat statusnya berubah.";
  ik.addEventListener("click", () => { const m = ikutiBaca(); if (m[x.id]) delete m[x.id]; else m[x.id] = x.status; ikutiTulis(m); gambarAlun(); });
  isi.append(ik);
  a.append(g, isi); return a;
}
function gambarAlun() {
  const w = $("daftarAlun"), ikut = ikutiBaca();
  const nIkut = alunData.filter(x => ikut[x.id]).length, nUbah = alunData.filter(x => ikut[x.id] && ikut[x.id] !== x.status).length;
  const jenis = [["", "Semua", "i-daftar"], ["diikuti", nIkut ? `Diikuti (${nIkut})` : "Diikuti", "i-centang"], ...Object.entries({banjir: "Banjir", longsor: "Tanah longsor", cuaca: "Cuaca ekstrem", gempa: "Gempa bumi", karhutla: "Karhutla", erupsi: "Erupsi", abrasi: "Abrasi", kekeringan: "Kekeringan"}).map(([id, t]) => [id, t, IKON_JENIS[id] || "i-kejadian"])];
  $("saringAlun").replaceChildren(...jenis.map(([id, t, ik]) => { const b = el("button"); b.append(ikon(ik), el("span", null, t)); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(id === alunJenis));
    if (id === "diikuti" && nUbah) b.append(el("span", "lp-tab-jumlah", String(nUbah)));
    b.addEventListener("click", () => { alunJenis = id; if (id === "diikuti" || !alunData.length) tampilAlun(); else tampilAlun(); }); return b; }));
  const daftar = alunJenis === "diikuti" ? alunData.filter(x => ikut[x.id]) : alunData;
  if (alunJenis === "diikuti" && nUbah) { const m = ikutiBaca(); for (const x of daftar) m[x.id] = x.status; ikutiTulis(m); } // dilihat = penanda berubah hilang pada buka berikutnya
  gambarPetaAlun(daftar);
  if (!daftar.length) {
    const k = el("div", "lp-kosong-besar"), m = el("div", "lp-kosong-maskot"); m.innerHTML = maskot("berpikir");
    const tx = el("div", "lp-kosong-teks"), lb = el("button", "lp-utama"); lb.type = "button"; lb.append(ikon("i-kirim"), "Lapor kejadian"); lb.addEventListener("click", bukaChat);
    tx.append(el("h2", null, alunJenis === "diikuti" ? "Belum ada kejadian yang Anda ikuti" : alunJenis ? "Belum ada laporan jenis ini" : "Belum ada laporan yang ditindaklanjuti"),
      el("p", null, alunJenis === "diikuti" ? "Ketuk Ikuti kejadian di kartu mana pun. Kartu ditandai saat statusnya berubah." : "Laporan warga muncul di sini sesudah diperiksa dan ditindaklanjuti petugas BNPB atau BPBD. Lihat kejadian di sekitar Anda? Laporkan sekarang."), lb);
    k.append(m, tx); return w.replaceChildren(k);
  }
  w.replaceChildren(...daftar.map(x => kartuAlun(x, ikut)));
  if (alunPeta) requestAnimationFrame(() => alunPeta.resize());
}
async function gambarPetaAlun(daftar) {
  const wp = $("petaAlun"), titik = daftar.filter(x => x.titik);   // peta selalu tampil penuh; tanpa titik = seluruh Indonesia
  try { await muatMaplibre(); } catch { return; }
  const fc = {type: "FeatureCollection", features: titik.map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [x.titik.lon, x.titik.lat]},
    properties: {id: x.id, judul: x.jenis, tempat: [x.lokasi.desa && `Desa ${x.lokasi.desa}`, x.lokasi.kab].filter(Boolean).join(", "), status: x.statusLabel, warna: tok(x.status === "selesai" ? "--ok" : "--warn")}}))};
  const pas = () => { if (!fc.features.length) return alunPeta.jumpTo({center: [118, -2], zoom: 4});
    const b = new maplibregl.LngLatBounds(); for (const f of fc.features) b.extend(f.geometry.coordinates);
    const lebar = matchMedia("(min-width:900px)").matches;   // ruang untuk panel daftar (kiri di layar lebar, bawah di HP) dan saringan di atas
    alunPeta.fitBounds(b, {padding: lebar ? {top: 110, bottom: 48, left: 440, right: 48} : {top: 100, bottom: 48 + innerHeight * .42, left: 32, right: 32}, maxZoom: 11, duration: 0}); };
  if (alunPeta) { alunPeta.getSource("alun")?.setData(fc); pas(); return; }
  alunPeta = new maplibregl.Map({container: wp.querySelector(".lp-peta-alun"), style: "https://tiles.openfreemap.org/styles/positron", center: [118, -2], zoom: 4, attributionControl: {compact: true}});
  alunPeta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  alunPeta.on("load", () => {
    alunPeta.addSource("alun", {type: "geojson", data: fc, cluster: true, clusterRadius: 40, clusterMaxZoom: 10});
    alunPeta.addLayer({id: "kelompok", type: "circle", source: "alun", filter: ["has", "point_count"], paint: {"circle-color": tok("--head-bg"), "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28], "circle-stroke-width": 3, "circle-stroke-color": tok("--card")}});
    alunPeta.addLayer({id: "kelompok-n", type: "symbol", source: "alun", filter: ["has", "point_count"], layout: {"text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"]}, paint: {"text-color": tok("--on-head")}});
    alunPeta.addLayer({id: "titik", type: "circle", source: "alun", filter: ["!", ["has", "point_count"]], paint: {"circle-color": ["get", "warna"], "circle-radius": 8, "circle-stroke-width": 2, "circle-stroke-color": tok("--card")}});
    alunPeta.on("click", "kelompok", e => { const f = e.features[0]; alunPeta.getSource("alun").getClusterExpansionZoom(f.properties.cluster_id).then(z => alunPeta.easeTo({center: f.geometry.coordinates, zoom: z})); });
    alunPeta.on("click", "titik", e => { const p = e.features[0].properties, box = el("div", "lp-alun-pop"); box.append(el("b", null, p.judul), el("small", null, p.tempat), el("small", null, p.status));
      const lihat = el("button", "lp-teks-tombol", "Lihat kartu"); lihat.type = "button"; lihat.addEventListener("click", () => { const k = document.getElementById(`alun-${p.id}`); if (!k) return; k.scrollIntoView({behavior: "smooth", block: "nearest"}); k.classList.remove("sorot"); void k.offsetWidth; k.classList.add("sorot"); }); box.append(lihat);
      new maplibregl.Popup({offset: 10, closeButton: false}).setLngLat(e.features[0].geometry.coordinates).setDOMContent(box).addTo(alunPeta); });
    for (const l of ["kelompok", "titik"]) { alunPeta.on("mouseenter", l, () => { alunPeta.getCanvas().style.cursor = "pointer"; }); alunPeta.on("mouseleave", l, () => { alunPeta.getCanvas().style.cursor = ""; }); }
    pas();
  });
}
async function tampilAlun() {
  const w = $("daftarAlun");
  if (!alunData.length) w.replaceChildren(el("p", "lp-redup", "Memuat laporan..."));
  try {
    const j = await (await fetch(`/api/lapor/alun?jenis=${alunJenis === "diikuti" ? "" : alunJenis}`, {signal: AbortSignal.timeout(10000)})).json();
    alunData = j.baris || [];
    gambarAlun();
  } catch { w.replaceChildren(el("p", "lp-redup", "Alun-alun belum bisa dimuat. Coba lagi.")); }
}

/* ============ bahasa (K58, D80): dipilih pelapor, tidak ditebak; disimpan di perangkat. Percakapan diterjemahkan server, data tetap Indonesia ============ */
const bahasaTersimpan = () => { try { return !!localStorage.getItem("lapor-bahasa"); } catch { return true; } };
const bahasaKini = () => { try { return localStorage.getItem("lapor-bahasa") || "id"; } catch { return "id"; } };
/* kartu langkah ikut bahasa pilihan (pemilik 20 Nov 2026: "kenapa masih bahasa Indonesia, kan pilihannya bahasa Sunda"). Teks tetap kartu dikumpulkan,
   diterjemahkan sekali jalan lewat /api/lapor/terjemah, disimpan per bahasa di perangkat. Nama bahasa tidak diterjemahkan. */
// seluruh halaman ikut bahasa pilihan (pemilik 20 Nov 2026: "bahasa itu dari awal, langsung pop up pilih bahasa"), termasuk layar terima kasih di akhir;
// yang dilewati: nama bahasa, isian, balon pesan (bot dari server, pelapor kata-katanya sendiri), nama pelapor, nomor tiket, maskot, animasi pembuka
const sudahTr = new WeakSet(), LEWATI_TR = ".lp-bahasa-kisi, .lp-dialog-bahasa, .lp-nama-orang, input, textarea, select, .lp-nomor-chat, #log li:not(.tengah), .lp-tab-profil, .lp-tk-nomor, svg, script, style, noscript, #pembuka";
const trBaca = b => { try { return JSON.parse(localStorage.getItem(`lapor-tr2-${b}`) || "{}"); } catch { return {}; } };
try { for (const k of Object.keys(localStorage)) if (k.startsWith("lapor-tr-")) localStorage.removeItem(k); } catch {}   // cache lama bisa berisi teks asli dari terjemahan gagal
const trTulis = (b, m) => { try { localStorage.setItem(`lapor-tr2-${b}`, JSON.stringify(m)); } catch {} };
// akar yang diterjemahkan: kartu langkah, panel isian kanan, kepala chat, dan pemisah di log (bukan balon pesan: balon bot sudah dari server, balon pelapor kata-katanya sendiri)
const AKAR_TR = () => [document.body];
let trJalan = null, trUlang = false, trCoba = 0;
async function terjemahKartu() {   // satu putaran sekaligus; perubahan selama berjalan memicu satu putaran lagi sesudahnya
  if (trJalan) { trUlang = true; return trJalan; }
  trJalan = terjemahSekali().then(sisa => { if (sisa && ++trCoba <= 4) setTimeout(terjemahKartu, 4000 * trCoba); else if (!sisa) trCoba = 0; })   // ada yang belum terjemah: ulang sampai 4 kali
    .finally(() => { trJalan = null; if (trUlang) { trUlang = false; terjemahKartu(); } });
  return trJalan;
}
/* kamus statis per bahasa (public/lapor/tr/<kode>.json, dibuat scripts/lapor/tr_buat.mjs): semua teks tetap sudah diterjemahkan sebelumnya,
   jadi layar berganti seketika tanpa menunggu AI (pemilik 20 Nov 2026: "semua statis, lu terjemahin aja semua dulu"). API hanya untuk teks tersusun saat jalan. */
const kunciTr = t => String(t).replace(/\s+/g, " ").trim();
const TR_VERSI = "20261120d";   // naikkan tiap kamus public/lapor/tr dibuat ulang
const STATIS = new Map();   // kode -> {kunci: terjemahan} | Promise
function muatStatis(b) {
  if (!STATIS.has(b)) STATIS.set(b, fetch(`/lapor/tr/${b}.json?v=${TR_VERSI}`).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(k => { STATIS.set(b, k); return k; }));
  return STATIS.get(b);
}
if (bahasaKini() !== "id") muatStatis(bahasaKini());   // diambil sejak awal, selagi animasi pembuka
const statisSiap = b => { const k = STATIS.get(b); return k && !(k instanceof Promise) ? k : null; };
const trStatis = t => { const b = bahasaKini(); if (b === "id") return t; const k = statisSiap(b); if (!k) return t; return k[kunciTr(t)] || String(t).split("\n").map(b => k[kunciTr(b)] || b).join("\n"); };   // balon bot (utuh, lalu per baris) buatan layar
function kumpulSasaran() {
  const sasaran = [];
  for (const akar of AKAR_TR()) {
    const jalan = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT);
    for (let n; (n = jalan.nextNode());) { const t = kunciTr(n.nodeValue); if (t.length > 1 && t.length <= 600 && /\p{L}{2}/u.test(t) && !/^LA-\d/.test(t) && !sudahTr.has(n) && !n.parentElement?.closest(LEWATI_TR)) sasaran.push({n, t}); }
    for (const e of akar.querySelectorAll?.("[placeholder]") || []) if (!sudahTr.has(e)) sasaran.push({e, at: "placeholder", t: kunciTr(e.getAttribute("placeholder"))});
  }
  return sasaran;
}
// teks Indonesia asli tiap simpul yang diterjemahkan, supaya ganti bahasa bisa di tempat tanpa muat ulang (pemilik 20 Nov 2026: "kenapa balik ke animasi")
const ASLI_TR = new Map();   // simpul teks atau elemen -> teks asli
function kembalikanAsli() {
  for (const [x, v] of ASLI_TR) { if (x.isConnected) { if (x.nodeType === 3) x.nodeValue = v; else x.setAttribute("placeholder", v); } sudahTr.delete(x); }
  ASLI_TR.clear();
}
function pasangTr(sasaran, kamus) {
  for (const x of sasaran) { const tr = kamus[x.t]; if (!tr) continue;
    const sp = x.n || x.e; if (sp.isConnected && !ASLI_TR.has(sp)) ASLI_TR.set(sp, x.n ? x.n.nodeValue : x.e.getAttribute(x.at));
    if (x.n) { if (x.n.isConnected) { const v = x.n.nodeValue, kiri = v.match(/^\s*/)[0], kanan = v.match(/\s*$/)[0]; x.n.nodeValue = kiri + tr + kanan; sudahTr.add(x.n); } }
    else if (x.e.isConnected) { x.e.setAttribute(x.at, tr); sudahTr.add(x.e); } }
}
// sinkron dari kamus statis: dipanggil langsung di MutationObserver (sebelum layar dilukis), jadi tidak ada kilasan bahasa Indonesia
function terjemahStatis() { const b = bahasaKini(); if (b === "id") return; const k = statisSiap(b); if (k) pasangTr(kumpulSasaran(), k); }
async function terjemahSekali() {
  const b = bahasaKini(); if (b === "id") return;
  const statis = await muatStatis(b), kamus = {...trBaca(b), ...statis}, sasaran = kumpulSasaran();
  pasangTr(sasaran, kamus);
  const belum = [...new Set(sasaran.filter(x => !kamus[x.t] && x.t.length <= 150).map(x => x.t))];
  if (!belum.length) return 0;
  const potong = []; for (let i = 0; i < belum.length; i += 60) potong.push(belum.slice(i, i + 60));
  const simpan = trBaca(b);
  await Promise.all(potong.map(async bag => {   // potongan dikirim bersamaan; butir null = gagal, dicoba lagi pada putaran berikutnya
    try { const r = await fetch("/api/lapor/terjemah", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({bahasa: b, teks: bag}), signal: AbortSignal.timeout(45000)});
      const j = await r.json(); if (r.ok) bag.forEach((t, k) => { if (typeof j.teks?.[k] === "string" && j.teks[k]) kamus[t] = simpan[t] = j.teks[k]; }); } catch {}
  }));
  trTulis(b, simpan);
  if (bahasaKini() !== b) return;   // bahasa diganti sementara menunggu
  pasangTr(sasaran, kamus);
  return sasaran.filter(x => !kamus[x.t] && x.t.length <= 150 && (x.n ? x.n.isConnected : x.e.isConnected)).length;   // jumlah yang belum terjemah
}
{ let tunda = 0; const ob = new MutationObserver(() => { if (bahasaKini() === "id") return; terjemahStatis(); clearTimeout(tunda); tunda = setTimeout(terjemahKartu, 60); });
  ob.observe(document.body, {childList: true, subtree: true}); setTimeout(terjemahKartu, 0); }
/* jendela pilih bahasa saat pertama membuka situs (sesudah animasi pembuka); dikelompokkan per wilayah (pemilik 20 Nov 2026: "bagusin") */
const WILAYAH_BAHASA = [["Nasional", ["id", "en"]], ["Jawa", ["jv", "su", "mad"]], ["Bali dan Nusa Tenggara", ["ban", "sas"]],
  ["Sumatra", ["min", "bbc", "btx", "btm", "bts", "nia", "ace", "msa", "ljp"]], ["Kalimantan", ["bjn", "nij"]], ["Sulawesi", ["bug", "mak", "sda", "gor"]], ["Maluku dan Papua", ["abs", "pmy"]]];
async function dialogBahasa(selesai = null) {   // selesai(): dipanggil sesudah Lanjut atau Tutup; halaman di belakang tidak diubah
  if (!daftarBahasa) { try { daftarBahasa = (await (await fetch("/api/lapor/bahasa", {signal: AbortSignal.timeout(10000)})).json()).bahasa || []; } catch { daftarBahasa = []; } }
  if (daftarBahasa.length < 2) return selesai?.();
  const d = el("dialog", "lp-dialog-bahasa"), kep = el("div", "lp-db-kepala"), m = el("div", "lp-db-maskot"), tx = el("div"), h = el("h2", null, "Pilih bahasa Anda");
  m.innerHTML = maskot("sapa"); h.id = "judulDialogBahasa"; d.setAttribute("aria-labelledby", h.id);
  const subJ = el("p", null, "Sigap akan bertanya dan menjawab dalam bahasa ini. Choose your language."); tx.append(h, subJ);
  // tombol tutup kanan atas (pemilik 20 Nov 2026: "di kanan atas ada buat closenya"); sama dengan Esc
  const bTutup = el("button", "lp-ikon lp-db-tutup"); bTutup.type = "button"; bTutup.setAttribute("aria-label", "Tutup"); bTutup.append(ikon("i-tutup"));
  bTutup.addEventListener("click", () => d.dispatchEvent(new Event("cancel")));
  kep.append(m, tx, bTutup);
  const kode = new Map(daftarBahasa.map(b => [b.kode, b.nama])), kini = bahasaKini(), isi = el("div", "lp-db-isi");
  // klik hanya memilih; baru dipakai sesudah Lanjut (pemilik 20 Nov 2026: "diokein dulu baru dia bisa lanjut")
  let terpilih = kini; const tombol = new Map();
  const pakai = b => { const lama = bahasaKini(); try { localStorage.setItem("lapor-bahasa", b); } catch {} d.close(); d.remove();
    if (lama !== b) kembalikanAsli();   // teks Indonesia asli dipulihkan dulu, lalu diterjemahkan ke bahasa baru; tanpa muat ulang dan tanpa animasi pembuka
    labelBahasaMenu(); terjemahKartu(); selesai?.(); };
  // pratinjau: judul, keterangan, dan tombol Lanjut langsung memakai bahasa yang dipilih (pemilik 20 Nov 2026), dari simpanan atau satu permintaan terjemah
  let urutPratinjau = 0;
  const pratinjau = async k => { const no = ++urutPratinjau, nama = kode.get(k)?.replace(/^Bahasa /, "") || "Indonesia";
    const grup = [...d.querySelectorAll(".lp-db-grup h3")], asli = ["Pilih bahasa Anda", "Sigap akan bertanya dan menjawab dalam bahasa ini.", `Lanjut dalam bahasa ${nama}`, ...grup.map(x => x.dataset.asli ||= x.textContent)];
    const pasang = t => { if (no !== urutPratinjau) return; h.textContent = t[0]; subJ.textContent = k === "en" ? t[1] : `${t[1]} Choose your language.`; lanjut.lastChild.textContent = t[2]; grup.forEach((x, i) => { x.textContent = t[3 + i]; }); };
    if (k === "id") return pasang(asli);
    const kamus = {...trBaca(k), ...await muatStatis(k)}, belum = asli.filter(t => !kamus[t]);   // kamus statis dulu: pratinjau seketika
    pasang(asli.map(t => kamus[t] || t));
    if (!belum.length) return;
    try { const r = await fetch("/api/lapor/terjemah", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({bahasa: k, teks: belum}), signal: AbortSignal.timeout(20000)});
      const j = await r.json(); if (r.ok) belum.forEach((t, i) => { if (typeof j.teks?.[i] === "string" && j.teks[i]) kamus[t] = j.teks[i]; }); trTulis(k, {...trBaca(k), ...Object.fromEntries(belum.filter(t => kamus[t]).map(t => [t, kamus[t]]))}); } catch {}
    pasang(asli.map(t => kamus[t] || t)); };
  const tandai = () => { for (const [k, b] of tombol) { const on = k === terpilih; b.classList.toggle("aktif", on); b.setAttribute("aria-pressed", String(on)); }
    pratinjau(terpilih); };
  const terpakai = new Set();
  for (const [wil, ks] of [...WILAYAH_BAHASA, ["Lainnya", daftarBahasa.map(b => b.kode)]]) {
    const ada = ks.filter(k => kode.has(k) && !terpakai.has(k)); if (!ada.length) continue;
    const g = el("section", "lp-db-grup"), kisi = el("div", "lp-db-kisi"); g.append(el("h3", null, wil), kisi);
    kisi.style.setProperty("--kol", kolomSimetris(ada.length));   // baris penuh ujung ke ujung, dibagi rata per kelompok
    for (const k of ada) { terpakai.add(k); const b = el("button"); b.type = "button";
      b.append(el("b", null, kode.get(k).replace(/^Bahasa /, "")), ikon("i-centang", "lp-db-centang"));
      b.addEventListener("click", () => { terpilih = k; tandai(); }); b.addEventListener("dblclick", () => pakai(k)); tombol.set(k, b); kisi.append(b); }
    isi.append(g);
  }
  const kaki = el("div", "lp-db-kaki"), lanjut = el("button", "lp-utama"); lanjut.type = "button"; lanjut.append(ikon("i-centang"), el("span"));
  lanjut.addEventListener("click", () => pakai(terpilih)); kaki.append(lanjut);
  d.addEventListener("cancel", () => { try { if (!localStorage.getItem("lapor-bahasa")) localStorage.setItem("lapor-bahasa", "id"); } catch {} d.remove(); selesai?.(); });   // Esc = tetap bahasa terakhir (Indonesia bila belum pernah memilih)
  d.append(kep, isi, kaki); document.body.append(d); tandai(); d.showModal(); (d.querySelector("button.aktif") || d.querySelector("button"))?.focus();
}

/* nomor WhatsApp ditanya di chat bila perangkat ini belum punya (K65: tanpa kode). Nama ditanya mesin pada langkah identitas. */
function tanyaNomor(lanjut) {   // sapaan lalu kartu identitas lengkap (peran, nama, WhatsApp) sebelum persetujuan
  tambah("bot", "*Halo, saya Sigap*\nAsisten AI Lapor Bencana BNPB. Saya bantu sampai laporan Anda lengkap dan diterima petugas. Kenalan dulu, ya. Tanpa kode, tanpa sandi.", {simpanKe: false});
  fPesan.hidden = true; kartuIdentitas(lanjut);
}
/* pilihan bahasa di dalam chat (pemilik 20 Nov 2026: "nanti disuruh pilih ada di chat bot nya"): ditanya sekali saat chat pertama dibuka,
   bisa diganti dengan mengetik "bahasa". Daftar dari server: tanpa model AI hanya Indonesia, pertanyaan dilewati. */
let daftarBahasa = null;
/* tombol bahasa di menu samping dan beranda (pemilik 20 Nov 2026: "agar ada pilih bahasa juga kalau tiba-tiba mau ganti") */
async function labelBahasaMenu() {
  if (!daftarBahasa) { try { daftarBahasa = (await (await fetch("/api/lapor/bahasa", {signal: AbortSignal.timeout(10000)})).json()).bahasa || []; } catch { daftarBahasa = []; } }
  const nama = (daftarBahasa.find(x => x.kode === bahasaKini())?.nama || "Bahasa Indonesia").replace(/^Bahasa /, "");
  for (const b of document.querySelectorAll(".lp-bahasa-menu")) { b.hidden = daftarBahasa.length < 2; b.querySelector("span").textContent = nama; }
}
for (const b of document.querySelectorAll(".lp-bahasa-menu")) b.addEventListener("click", () => dialogBahasa());
labelBahasaMenu();
async function tanyaBahasa(lanjut, paksa = false) {   // pop-up yang sama dengan menu samping (pemilik 20 Nov 2026: "keluar pop up tapi halaman belakangnya tidak berubah")
  let sudah = null; try { sudah = localStorage.getItem("lapor-bahasa"); } catch {}
  if (sudah && !paksa) return lanjut();
  dialogBahasa(lanjut);
}


/* ============ mulai ============ */
async function mulai(nomor, {diChat = false} = {}) {
  wa = String(nomor); simpan.tulis("lapor-wa", wa); // localStorage JSON bisa mengembalikan angka; nomor selalu teks
  cache = simpan.baca(kunciCache()) || {transkrip: [], laporan: []};
  // dari chat (nomor baru diisi): riwayat lama tidak ditampilkan, supaya tidak tercampur dengan percakapan baru yang bisa berbahasa lain
  if (!diChat) { for (const t of cache.transkrip) tambah(t.dari, t.teks, {foto: t.foto, berkas: t.berkas, simpanKe: false}); if (cache.keadaan) terapkan(cache.keadaan, {dariCache: true}); }
  tampilBantu(); tampilBeranda(); if (!diChat) ke("beranda");
  try {
    const j = await (await fetch(`/api/lapor/sesi?wa=${nomor}`, {signal: AbortSignal.timeout(15000)})).json();
    if (!diChat && j.status && !["terkirim", "batal"].includes(j.status)) {
      if (!cache.transkrip.length) for (const t of j.transkrip || []) tambah(t.dari === "pelapor" ? "saya" : t.dari, t.teks || (t.lokasi ? "Lokasi dibagikan" : ""));
      terapkan(j);
    }
  } catch {}
  await segarkanLaporan(); tampilBeranda(); salVideo?.kirimSekarang(); // video yang terputus pada kunjungan sebelumnya
  setInterval(() => { if (!document.hidden) tarikKotak(); }, 20000); tarikKotak();
}

const iNomor = $("iNomor");
iNomor.addEventListener("input", () => { let v = iNomor.value.replace(/\D/g, ""); if (v.startsWith("62")) v = v.slice(2); if (v.startsWith("0")) v = v.slice(1); iNomor.value = v.slice(0, 13); iNomor.setCustomValidity(""); });
iNomor.addEventListener("beforeinput", e => { if (e.inputType === "insertText" && e.data && /\D/.test(e.data)) e.preventDefault(); });
$("fNomor").addEventListener("submit", e => {
  e.preventDefault();
  if (!/^8\d{8,12}$/.test(iNomor.value)) { iNomor.setCustomValidity("Nomor WhatsApp diawali 8, contoh 812 3456 7890"); iNomor.reportValidity(); return; }
  mulai(`62${iNomor.value}`);
});
const tersimpan = simpan.baca("lapor-wa");
/* pembuka: maskot dan sapaan tiap halaman dibuka (pemilik 20 Nov 2026 "animasinya mana yang di awal"); ketuk untuk melewati */
$("maskotHero").innerHTML = maskot("sapa");
if (!$("sigapMaskot").childElementCount) { $("sigapMaskot").innerHTML = maskot("sapa"); poseSigap = "sapa"; }   // Sigap di menu samping tampil sejak awal, bukan setelah chat jalan
const pernah = false;
if (!pernah) {
  const pb = $("pembuka"); $("maskotPembuka").innerHTML = maskot("sapa", "Sigap, maskot Lapor Bencana"); pb.hidden = false;
  // tampil lebih lama (pemilik 19 Nov 2026: "agak lamain"); ketuk atau tekan tombol apa saja untuk melewati
  const tutup = () => { if (pb.classList.contains("pergi")) return; pb.classList.add("pergi"); setTimeout(() => { pb.remove(); dialogBahasa(); }, 700); };   // tiap situs dibuka (pemilik 20 Nov 2026: "kenapa pilih bahasanya ga muncul di awal"); bahasa terakhir ditandai
  setTimeout(tutup, matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 6000);   // pemilik 19 Nov 2026 malam: "masih kurang lama"
  pb.addEventListener("click", tutup); addEventListener("keydown", tutup, {once: true});
} else $("pembuka").remove();
/* tanpa nomor: langsung beranda (pemilik 20 Nov 2026 "masuknya kaya langsung halaman utama"); nomor ditanya bot di chat, seperti bot WA */
function mulaiTamu() { tampilBantu(); tampilBeranda(); ke("beranda"); }
if (LOKAL) { if (tersimpan) mulai(tersimpan); else mulaiTamu(); }
else (async () => { // produksi: sesi /masuk; nomor tampil tersamar dari server, tidak pernah diketik ulang di sini
  let j = null; try { j = await (await fetch("/api/masuk/saya?lunak=1", {credentials: "same-origin"})).json(); } catch {}
  if (j?.akun) { await mulai(`sesi-${j.akun.id}`); if (j.akun.nama) cache.pelapor ||= j.akun.nama; $("tabWa").textContent = j.akun.wa || ""; return; }
  if (tersimpan && !String(tersimpan).startsWith("sesi-")) return mulai(tersimpan);   // nomor yang pernah diketik di perangkat ini
  mulaiTamu();   // K65: tanpa kode WA; nomor ditanya di chat
})();
