/* Halaman publik /verifikasi dan /verifikasi/<kode> (paket data/kajian-bnpb/segel-dokumen/, SG-08; DESIGN-SYSTEM 1-2, ALUR A2-A4).
   Satu fetch per kode ke /api/verifikasi/<kode>; tanpa cache. Pencocok PDF menghitung sha256 di peramban: berkas tidak pernah diunggah.
   Semua isi dari server ditulis lewat textContent (tanpa innerHTML). jamWIB dari /inti/format.js (skrip klasik, global). */
const $ = id => document.getElementById(id);
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const POLA = /^[0-9A-HJKMNP-TV-Z]{10}$/;
const normal = s => String(s ?? "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");   // sama dengan normalKode di src/segel.js
const tampil = k => `${k.slice(0, 5)}-${k.slice(5)}`;
const WARNA = {berlaku: "ok", lebih_baru: "warn", dicabut: "abu", tidak_cocok: "bad"};
const PENJELAS = {
  berlaku: "Kode ini terdaftar dan isi dokumennya di sistem masih sama dengan saat disegel. Cocokkan judul, wilayah, dan periode di bawah dengan lembar Anda.",
  lebih_baru: "Kode ini sah, tetapi dokumennya sudah diganti versi yang lebih baru.",
  dicabut: "Penerbit sudah menarik dokumen ini. Jangan pakai sebagai rujukan.",
  tidak_cocok: "Isi dokumen di sistem sudah berbeda dari saat disegel. Hubungi penerbit untuk memastikan.",
};
const JUDUL = document.title;
const versi = d => d.jenis === "pb" ? `Versi ${d.versi}` : d.versi ? `Ralat ${d.versi}` : "Terbitan awal";

function baris(dl, label, isi) {
  dl.append(el("dt", null, label));
  const dd = el("dd"); typeof isi === "string" ? dd.textContent = isi : dd.append(isi); dl.append(dd);
}

function kartu(d) {
  const ex = el("article", "ex ex-std vf-kartu");
  const hd = el("div", "ex-hd"), jd = el("div", "ex-jd");
  jd.append(el("h2", null, "Keaslian dokumen"), el("span", `vf-pil vf-${WARNA[d.status] ?? "abu"}`, d.label));
  hd.append(jd);
  const bd = el("div", "ex-bd"), dl = el("dl", "vf-dl");
  const st = el("div", "vf-status"); st.append(el("span", null, PENJELAS[d.status] ?? ""));
  if (d.status === "dicabut" && d.dicabut) st.append(el("span", "vf-kecil", `Dicabut ${jamWIB(d.dicabut)}`));
  if (d.terbaru && POLA.test(d.terbaru)) { const a = el("a", "vf-tautan", "Buka versi terbaru"); a.href = "/verifikasi/" + d.terbaru; st.append(a); }
  baris(dl, "Status", st);
  baris(dl, "Dokumen", d.judul);
  if (d.wilayah) baris(dl, "Wilayah", d.wilayah);
  baris(dl, "Periode", d.periode);
  baris(dl, "Versi", versi(d));
  baris(dl, "Penerbit", d.penerbit);
  baris(dl, "Terbit", jamWIB(d.terbit));
  baris(dl, "Sidik", el("code", "vf-sidik", d.sidik12));
  baris(dl, "Kode", el("code", "vf-sidik", tampil(d.kode)));
  bd.append(dl);
  if (d.sidik_berkas) bd.append(pencocok(d.sidik_berkas));
  ex.append(hd, bd);
  return ex;
}

/* ALUR A4: cocokkan PDF yang dipegang pembaca; hanya bila server menyimpan sidik berkas */
function pencocok(sidik) {
  const w = el("div", "vf-cocok"), lb = el("label", null, "Cocokkan PDF yang Anda pegang"), inp = el("input"), hasil = el("p", "vf-kecil");
  inp.type = "file"; inp.accept = "application/pdf"; inp.id = "berkas"; lb.htmlFor = "berkas"; hasil.setAttribute("role", "status");
  inp.addEventListener("change", async () => {
    const f = inp.files?.[0]; if (!f) return;
    hasil.textContent = "Memeriksa berkas di perangkat Anda. Berkas tidak dikirim ke mana pun.";
    const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await f.arrayBuffer()))].map(b => b.toString(16).padStart(2, "0")).join("");
    hasil.textContent = h === sidik ? "Berkas cocok: sama persis dengan yang diterbitkan." : "Berkas ini berbeda dari yang diterbitkan, mungkin sudah diubah atau bukan berkas asli.";
  });
  w.append(lb, inp, hasil);
  return w;
}

async function periksa(kode) {
  const wadah = $("hasil");
  wadah.setAttribute("aria-busy", "true"); wadah.replaceChildren(el("p", "vf-kecil", "Memeriksa kode."));
  document.title = JUDUL;
  let r, d;
  try { r = await fetch("/api/verifikasi/" + encodeURIComponent(kode), {cache: "no-store"}); d = await r.json().catch(() => ({})); }
  catch { r = null; }
  wadah.setAttribute("aria-busy", "false");
  if (r?.ok) { wadah.replaceChildren(kartu(d)); document.title = `${d.label}: ${d.judul}, Centurisk97`; return; }
  const pesan = r?.status === 404 ? "Kode ini tidak terdaftar. Periksa lagi huruf dan angkanya."
    : r?.status === 429 ? (d?.galat || "Terlalu banyak pemeriksaan, coba lagi beberapa menit lagi.")
    : "Kami belum bisa memeriksa kode ini. Coba beberapa saat lagi.";
  wadah.replaceChildren(el("p", "vf-pesan", pesan));
}

const inp = $("kode");
const tandai = () => {   // aria-invalid dan aria-describedby mengikuti :user-invalid (pola validate-input-after-interaction)
  const salah = inp.matches(":user-invalid") || inp.classList.contains("vf-salah");
  inp.setAttribute("aria-invalid", String(salah));
  inp.setAttribute("aria-describedby", salah ? "kode-hint kode-galat" : "kode-hint");
};
inp.addEventListener("blur", tandai);
inp.addEventListener("input", () => { inp.classList.remove("vf-salah"); tandai(); });

$("cari").addEventListener("submit", e => {
  e.preventDefault();
  const k = normal(inp.value);
  if (!POLA.test(k)) { inp.classList.add("vf-salah"); tandai(); inp.focus(); return; }
  inp.value = tampil(k);
  history.pushState(null, "", "/verifikasi/" + k);
  periksa(k);
});

const dariJalur = () => {
  let mentah = ""; try { mentah = decodeURIComponent(location.pathname.split("/")[2] ?? ""); } catch { /* % rusak = bukan kode */ }
  const k = normal(mentah);
  if (POLA.test(k)) { inp.value = tampil(k); periksa(k); } else $("hasil").replaceChildren();
};
addEventListener("popstate", dariJalur);
dariJalur();
