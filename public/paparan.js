/* paparan.js: halaman /paparan. Memuat data situs, menerapkan templat (urutan, aktif, tambahan), menggambar pratinjau HTML,
   dan menyusun PPTX/PDF lewat registri public/paparan_slide.js (satu fungsi gambar per slide, tiga keluaran).
   Klik tidak membekukan layar: status ditulis langsung, kerja berat per slide diselingi jeda (setTimeout 0). */
(() => {
/* ?bencana=<bahaya>: kosong = karhutla (alur lama, tak berubah). Bahaya lain memakai laporan.json v1 bahaya itu + slide b_* (paparan_slide.js) dengan bahan dari spek (laporan_bencana_spek.js).
   Nilai divalidasi terhadap registri (BENCANA di laporan_karhutla_spek.js) di awal(); templat lokal terpisah per bahaya supaya urutan slide karhutla tidak tertimpa. */
const BENC = new URLSearchParams(location.search).get("bencana") || "karhutla", HZ = BENC !== "karhutla";
const PS = window.PaparanSlide, $ = s => document.querySelector(s), KUNCI = HZ ? "pk-paparan-templat-" + BENC.replace(/[^a-z]/g, "").slice(0, 12) : "pk-paparan-templat";
const LIB = {
  pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],   // sama dengan bagikan.js
  pptx: ["https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js", () => window.PptxGenJS],
};
const muatLib = k => { const [url, ada] = LIB[k]; if (ada()) return Promise.resolve();
  return (muatLib._[k] ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = url; s.crossOrigin = "anonymous"; s.async = true;
    s.onload = () => ada() ? ok() : gagal(new Error("Pustaka tidak lengkap")); s.onerror = () => { delete muatLib._[k]; gagal(new Error("Gagal memuat pustaka")); }; document.head.appendChild(s); })); };
muatLib._ = {};
const jeda = () => new Promise(r => setTimeout(r, 0));
const muatJSON = u => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : Promise.reject(new Error(u + " " + r.status)));
const opsi = u => muatJSON(u).catch(() => null);
const host = location.hostname;
/* sama dengan situsCenturisk() di src/worker.js: data perusahaan hanya di alamat Centurisk97 */
const situsW = host.endsWith(".workers.dev") || host === "centurisk97.id" || host === "www.centurisk97.id";
const izinPerusahaan = situsW || host === "localhost" || host === "127.0.0.1";
const merek = situsW ? "Centurisk97" : "Pantau Bencana";

const S = {bencana: BENC, namaB: "Karhutla", B: null, SB: null, draf: false, foto: null, D: null, prov: "62", tgl: null, templat: null, susunan: [], gambar: Object.create(null), logo: null, gen: 0, sibuk: false};
const perusahaan = {};

/* ---------------------------------------------------------------- templat: satu titik ganti sumber */
const urlAman = PS.urlAman, cekTemplat = PS.cekTemplat;   // validasi templat tinggal di paparan_slide.js (murni, diuji node --test)
async function muatTemplat() {
  /* urutan sumber (satu titik ganti): server (D1) -> bawaan berkas statis -> draf lokal yang lolos cekTemplat */
  const kosong = {versi: 1, sampul: {}, slide: [], tambahan: []};
  let t = HZ ? kosong : cekTemplat(await opsi("/api/paparan/templat")); S.draf = false;   // templat server dan bawaan hanya untuk deck karhutla
  if (!HZ && (!t || (!t.slide.length && !t.tambahan.length))) t = cekTemplat(await opsi("/data/paparan_templat.json")) || kosong;
  try { const l = cekTemplat(JSON.parse(localStorage.getItem(KUNCI))); if (l) { S.draf = true; t = l; } } catch (e) {}
  return t;
}
function tandaiDraf() { $("#ppDraf").hidden = !S.draf; }
function simpanLokal() { try { localStorage.setItem(KUNCI, JSON.stringify(templatSaatIni())); S.draf = true; } catch (e) {} tandaiDraf(); }
function templatSaatIni() {
  const t = S.templat, tamb = new Map((t.tambahan || []).map(e => [e.id, e])), bawaan = new Set(PS.REGISTRI.map(s => s.id));
  const slide = [], tambahan = [];
  S.susunan.forEach((x, i) => {
    if (bawaan.has(x.id)) slide.push({id: x.id, aktif: x.aktif, urutan: (i + 1) * 10});
    else if (tamb.has(x.id)) tambahan.push({...tamb.get(x.id), aktif: x.aktif, setelah: S.susunan[i - 1]?.id || ""});
  });
  return {versi: t.versi || 1, sampul: t.sampul || {}, slide, tambahan};
}
function susun(t) {
  const ada = PS.REGISTRI.filter(s => PS.berlaku(s, BENC)), reg = new Map(ada.map(s => [s.id, s]));
  const arr = [...(t.slide || [])].sort((a, b) => a.urutan - b.urutan).filter(x => reg.has(x.id)).map(x => ({id: x.id, aktif: x.aktif !== false}));
  ada.forEach(s => { if (!arr.some(x => x.id === s.id)) arr.push({id: s.id, aktif: true}); });
  (t.tambahan || []).forEach(e => { const i = arr.findIndex(x => x.id === e.setelah), n = {id: e.id, aktif: e.aktif !== false}; i < 0 ? arr.push(n) : arr.splice(i + 1, 0, n); });
  return arr;
}
const defSlide = id => PS.REGISTRI.find(s => s.id === id) || ((S.templat.tambahan || []).find(e => e.id === id) && PS.slideTeks(S.templat.tambahan.find(e => e.id === id)));

/* ---------------------------------------------------------------- konteks */
const namaProv = () => S.D.laporan.prov[S.prov]?.nama || S.prov;
function ctxDasar() {
  const D = {...S.D, perusahaan: perusahaan[S.prov] || null};
  return {D, bencana: BENC, namaB: S.namaB, B: S.B, prov: S.prov, namaProv: namaProv(), tgl: S.tgl, merek, izinPerusahaan, logo: S.logo, foto: S.foto, templat: S.templat, gambar: S.gambar};
}
function alasan(s, c) { try { return s.siap(c); } catch (e) { return "data tidak lengkap"; } }
/* slide yang akan dibuat: aktif dan datanya siap; sekaligus nomor halaman dan data daftar isi */
function rencana() {
  const c0 = ctxDasar(), pilih = S.susunan.filter(x => x.aktif).map(x => defSlide(x.id)).filter(s => s && !alasan(s, c0));
  const urutan = pilih.map((s, i) => ({id: s.id, bagian: s.bagian, judulTampil: s.judul.replace("{prov}", c0.namaProv), hal: i + 1}));
  return pilih.map((s, i) => ({s, c: Object.assign(Object.create(c0), {no: i + 1, urutan})}));
}

/* ---------------------------------------------------------------- pratinjau */
function skala() { document.querySelectorAll(".sl-wrap").forEach(w => { w.firstChild.style.transform = `scale(${w.clientWidth / 1333})`; }); }
async function pratinjau() {
  const id = ++S.gen, grid = $("#ppGrid"); grid.textContent = "";
  const rc = rencana(), n = rc.length; $("#ppSt").textContent = `Menyusun pratinjau 0/${n}…`;
  for (let i = 0; i < n; i++) {
    if (id !== S.gen) return;
    const {s, c} = rc[i], fig = document.createElement("figure"), w = document.createElement("div"), st = document.createElement("div");
    w.className = "sl-wrap"; st.className = "sl-stage"; w.append(st); fig.append(w);
    const cap = document.createElement("figcaption"); cap.textContent = `${i + 1}. ${s.judul.replace("{prov}", c.namaProv)}`; fig.append(cap); grid.append(fig);
    st.style.transform = `scale(${w.clientWidth / 1333})`;
    try { s.buat(c).html(st); } catch (e) { console.error("slide", s.id, e); st.innerHTML = `<div style="padding:40px;font:28px sans-serif">Slide gagal digambar: ${s.id}</div>`; }
    $("#ppSt").textContent = `Menyusun pratinjau ${i + 1}/${n}…`;
    await jeda();
  }
  if (id === S.gen) $("#ppSt").textContent = `${n} slide siap diunduh, data ${PS.tglP(S.tgl)}.`;
}
let tunda = 0; const jadwalkan = () => { clearTimeout(tunda); tunda = setTimeout(pratinjau, 150); };

/* ---------------------------------------------------------------- panel atur slide */
function gambarAtur() {
  const c0 = ctxDasar(), tamb = new Map((S.templat.tambahan || []).map(e => [e.id, e]));
  $("#ppAtur").innerHTML = S.susunan.map((x, i) => {
    const s = defSlide(x.id), al = alasan(s, c0), judul = s.judul.replace("{prov}", c0.namaProv);
    return `<li data-i="${i}"><label><input type="checkbox" ${x.aktif ? "checked" : ""} data-a="aktif"> <span>${esc(judul)}</span></label>${al ? `<small>disembunyikan otomatis: ${esc(al)}</small>` : ""}
      <span class="pp-bt"><button type="button" data-a="naik" aria-label="Naikkan" ${i ? "" : "disabled"}>&#9650;</button><button type="button" data-a="turun" aria-label="Turunkan" ${i < S.susunan.length - 1 ? "" : "disabled"}>&#9660;</button>${tamb.has(x.id) ? `<button type="button" data-a="hapus" aria-label="Hapus">&#10005;</button>` : ""}</span></li>`;
  }).join("");
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
$("#ppAtur").addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return; const li = b.closest("li"), i = +li.dataset.i, a = b.dataset.a;
  if (a === "aktif") S.susunan[i].aktif = b.checked;
  else if (a === "naik" && i) [S.susunan[i - 1], S.susunan[i]] = [S.susunan[i], S.susunan[i - 1]];
  else if (a === "turun" && i < S.susunan.length - 1) [S.susunan[i + 1], S.susunan[i]] = [S.susunan[i], S.susunan[i + 1]];
  else if (a === "hapus") { const id = S.susunan[i].id; S.susunan.splice(i, 1); S.templat.tambahan = S.templat.tambahan.filter(x => x.id !== id); }
  else return;
  simpanLokal(); gambarAtur(); jadwalkan();   // kotak centang sudah berubah di layar; kerja berat ditunda
});
$("#ppForm").addEventListener("submit", e => {
  e.preventDefault(); const f = new FormData(e.target), id = "t" + Date.now().toString(36), bersih2 = v => String(v).replace(/[<>]/g, "");
  const ent = {id, judul: bersih2(f.get("judul").trim()), sub: bersih2(f.get("sub").trim()), isi: f.get("isi").split("\n").map(x => bersih2(x.trim())).filter(Boolean), gambar_url: urlAman(f.get("gambar_url").trim()) ? f.get("gambar_url").trim() : undefined, bagian: f.get("bagian"), setelah: S.susunan.at(-1)?.id || ""};
  (S.templat.tambahan ||= []).push(ent); S.susunan.push({id, aktif: true}); e.target.reset(); simpanLokal(); gambarAtur(); jadwalkan();
});
for (const [el, k] of [["#ppPenyaji", "penyaji"], ["#ppJabatan", "jabatan"], ["#ppLokasi", "lokasi"]])
  $(el).addEventListener("input", e => { (S.templat.sampul ||= {})[k] = e.target.value; simpanLokal(); jadwalkan(); });
$("#ppReset").onclick = () => { try { localStorage.removeItem(KUNCI); } catch (e) {} muatTemplat().then(t => { S.templat = t; tandaiDraf(); isiSampul(); S.susunan = susun(t); gambarAtur(); jadwalkan(); }); };
$("#ppEks").onclick = () => unduhBlob(new Blob([JSON.stringify(templatSaatIni(), null, 2)], {type: "application/json"}), "paparan_templat.json");
function isiSampul() { const t = S.templat.sampul || {}; $("#ppPenyaji").value = t.penyaji || ""; $("#ppJabatan").value = t.jabatan || ""; $("#ppLokasi").value = t.lokasi || ""; }

/* ---------------------------------------------------------------- data */
async function muatPerusahaan(p) {
  if (HZ || !izinPerusahaan || perusahaan[p] !== undefined) return;
  perusahaan[p] = await opsi(`/data/konsesi2026/${p}.json`);
}
async function muatGambarTambahan() {
  for (const e of S.templat.tambahan || []) {
    if (!e.gambar_url || S.gambar[e.id] || !urlAman(e.gambar_url)) continue;
    try {
      const b = await (await fetch(e.gambar_url)).blob(), data = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
      const dim = await new Promise((r, x) => { const im = new Image(); im.onload = () => r({w: im.naturalWidth, h: im.naturalHeight}); im.onerror = x; im.src = data; });
      S.gambar[e.id] = {data, ...dim};
    } catch (err) { console.warn("gambar tambahan gagal", e.gambar_url); }
  }
}
function muatLogo() {
  return new Promise(r => { const im = new Image(); im.onload = () => { try { const c = document.createElement("canvas"); c.width = c.height = 256; c.getContext("2d").drawImage(im, 0, 0, 256, 256); S.logo = c.toDataURL("image/png"); } catch (e) {} r(); }; im.onerror = () => r(); im.src = "/img/logo.svg?v=2"; });
}
/* foto sampul: foto situs berlisensi (public/img/kredit.json), dipotong ke rasio panel kanan sampul lewat kanvas */
async function muatFoto() {
  try {
    const f = "foto-pemadam.jpg", kr = (await muatJSON("/img/kredit.json")).find(x => x.file === f); if (!kr) return;
    const im = await new Promise((r, x) => { const i = new Image(); i.onload = () => r(i); i.onerror = x; i.src = "/img/" + f; });
    const rasio = (PS.W - 9.2) / PS.H, c = document.createElement("canvas"); c.width = 827; c.height = 1500;
    let sw = im.naturalWidth, sh = sw / rasio; if (sh > im.naturalHeight) { sh = im.naturalHeight; sw = sh * rasio; }
    c.getContext("2d").drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, c.width, c.height);
    S.foto = {data: c.toDataURL("image/jpeg", 0.85), kredit: `Foto: ${kr.penulis}, ${kr.lisensi}`};
  } catch (e) { console.warn("foto sampul tidak dimuat", e); }
}
/* bahaya lain: laporan.json v1 saja; S.B = bahan hari terpilih dari spek (satu pembangun dengan snapshot laporan harian) */
const hitungB = () => { S.B = HZ ? S.SB.dariLaporan(S.D.laporan, S.tgl) : null; };
async function awal() {
  let laporan, templat;
  if (HZ) {
    const KS = await import("/laporan_karhutla_spek.js");
    if (!KS.bencanaSah(BENC)) { $("#ppSt").textContent = `Bencana tidak dikenal. Pilih salah satu dari ${KS.DAFTAR_BENCANA.join(", ")}.`; $("#upd").textContent = "Bencana tidak dikenal"; return; }
    S.SB = await import("/laporan_bencana_spek.js"); S.namaB = KS.BENCANA[BENC].nama;
    [laporan, templat] = await Promise.all([muatJSON(KS.BENCANA[BENC].url), muatTemplat(), muatLogo(), muatFoto()]);
    S.D = {laporan}; S.templat = templat; S.susunan = susun(templat); laporan.hari_pilihan = laporan.hari;
    S.tgl = laporan.hari.includes(laporan.hari_lengkap) ? laporan.hari_lengkap : laporan.hari.at(-1); hitungB();
    S.prov = S.SB.pilihPrioritas(laporan, S.tgl, 1)[0] || Object.keys(laporan.prov)[0];
    document.title = `Paparan Rakor ${S.namaB} · ${merek}`; $("#p-paparan h1").textContent = `Paparan Rakor ${S.namaB}`;
  } else {
    let kumulatif, sejarah, kompleks, operasi;
    [laporan, kumulatif, sejarah, kompleks, operasi, templat] = await Promise.all([muatJSON("/data/laporan.json"), opsi("/data/kumulatif.json"), muatJSON("/data/sejarah.json"), muatJSON("/data/kompleks_konsesi.json"), opsi("/data/operasi_resmi.json"), muatTemplat(), muatLogo(), muatFoto()]);
    S.D = {laporan, kumulatif, sejarah, kompleks, operasi}; S.templat = templat; S.susunan = susun(templat);
    /* satu tanggal potong untuk seluruh deck; pilihan dimulai dari batas arsip sejarah.json (titik arsip tidak bisa dipotong lebih awal) */
    const batas = new Date(Date.parse(sejarah.dibuat.slice(0, 10)) - 864e5).toISOString().slice(0, 10), pilihan = laporan.hari.filter(h => h >= batas);
    laporan.hari_pilihan = pilihan.length ? pilihan : laporan.hari;
    S.tgl = laporan.hari_pilihan.includes(laporan.hari_lengkap) ? laporan.hari_lengkap : laporan.hari_pilihan.at(-1);
  }
  await isiPilihanBencana();
  $("#ppProv").innerHTML = Object.entries(laporan.prov).map(([k, v]) => `<option value="${esc(k)}"${k === S.prov ? " selected" : ""}>${esc(v.nama)}</option>`).join("");
  $("#ppTgl").innerHTML = [...laporan.hari_pilihan].reverse().map(h => `<option value="${esc(h)}"${h === S.tgl ? " selected" : ""}>${PS.tglP(h)}</option>`).join("");
  PilihCantik.pasang(); isiSampul();
  $("#upd").textContent = "Data s.d. " + PS.tglP(S.tgl);
  await Promise.all([muatPerusahaan(S.prov), muatGambarTambahan()]);
  tandaiDraf(); gambarAtur(); await pratinjau();
}
/* pemilih bencana: ganti = muat ulang halaman dengan ?bencana= (deck, templat, dan data semuanya milik satu bahaya) */
async function isiPilihanBencana() {
  const sel = $("#ppBencana"); let KS;
  try { KS = await import("/laporan_karhutla_spek.js"); } catch (e) { sel.closest("label").hidden = true; return; }
  sel.innerHTML = KS.DAFTAR_BENCANA.map(b => `<option value="${b}"${b === BENC ? " selected" : ""}>${esc(KS.BENCANA[b].nama)}</option>`).join("");
  sel.onchange = () => { location.search = sel.value === "karhutla" ? "" : "?bencana=" + sel.value; };
}
$("#ppProv").addEventListener("change", async e => { S.prov = e.target.value; await muatPerusahaan(S.prov); gambarAtur(); jadwalkan(); });
$("#ppTgl").addEventListener("change", e => { S.tgl = e.target.value; hitungB(); $("#upd").textContent = "Data s.d. " + PS.tglP(S.tgl); gambarAtur(); jadwalkan(); });
window.addEventListener("resize", () => requestAnimationFrame(skala));

/* ---------------------------------------------------------------- unduh */
const unduhBlob = window.unduhBlob;   // public/inti/unduh.js
const ukuran = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.round(b / 1024) + " KB";
async function unduh(jenis) {
  if (S.sibuk || !S.D) return; S.sibuk = true; S.gen++;   // hentikan pratinjau yang sedang jalan
  const tombol = [$("#ppPptx"), $("#ppPdf")], st = $("#ppSt"); tombol.forEach(b => b.disabled = true);
  try {
    st.textContent = "Memuat pustaka…"; await muatLib(jenis); await muatGambarTambahan(); await jeda();
    const rc = rencana(), n = rc.length, nama = `Paparan-Rakor-${S.namaB.replace(/[\s,]+/g, "-")}-${namaProv().replace(/\s+/g, "-")}-${S.tgl}.${jenis}`;
    let blob;
    if (jenis === "pptx") {
      const P = new window.PptxGenJS(); P.layout = "LAYOUT_WIDE"; P.title = `Paparan Rakor ${S.namaB} ${namaProv()}`; P.company = merek;
      for (let i = 0; i < n; i++) { st.textContent = `Menyusun slide ${i + 1}/${n}…`; await jeda(); rc[i].s.buat(rc[i].c).pptx(P.addSlide()); }
      st.textContent = "Mengemas berkas PPTX…"; await jeda(); blob = await P.write({outputType: "blob"});
    } else {
      const rb = await muatRoboto(), {jsPDF} = window.jspdf, doc = new jsPDF({orientation: "landscape", unit: "in", format: [PS.W, PS.H], compress: true}); pasangRoboto(doc, rb);
      for (let i = 0; i < n; i++) { st.textContent = `Menyusun slide ${i + 1}/${n}…`; await jeda(); if (i) doc.addPage([PS.W, PS.H], "landscape"); rc[i].s.buat(rc[i].c).pdf(doc); }
      st.textContent = "Mengemas berkas PDF…"; await jeda(); blob = doc.output("blob");
    }
    unduhBlob(blob, nama); st.textContent = `${nama}: ${n} slide, ${ukuran(blob.size)}.`;
    window.__paparanTerakhir = {jenis, slide: n, bytes: blob.size, nama};
  } catch (e) { console.error("paparan", e); st.textContent = "Gagal menyusun berkas: " + (e.message || e); }
  finally { S.sibuk = false; tombol.forEach(b => b.disabled = false); }
}
$("#ppPptx").onclick = () => unduh("pptx");
$("#ppPdf").onclick = () => unduh("pdf");
$("#tema").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };
awal().catch(e => { console.error(e); $("#ppSt").textContent = "Data belum tersedia. Coba muat ulang beberapa menit lagi."; $("#upd").textContent = "Data belum tersedia"; });
})();
