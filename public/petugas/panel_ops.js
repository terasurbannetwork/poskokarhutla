/* Panel pimpinan, tahap B (ALUR A8 dan A9, DESIGN-SYSTEM §3): strip angka, peta personel + jejak, form tugas, antrean tinjauan.
   Masuk = sesi staf (cookie). Semua teks dari server lewat esc(); foto tinjauan hanya dari /api/petugas/foto/. */
import {$, esc, angka, api, nanti} from "./umum.js";
import {pesanGalat, teksAlasan, keMs} from "./murni.js";
import {teksJam, tanggalLokal} from "./stempel.js";
import {kartuTinjau} from "./tinjau_kartu.js";
import {BENCANA, ringkasAnggota, STATUS_PETA, titikGeo, jejakGeo, tepiPeta, angkaStrip, fotoAman, putusanTinjau, rapikanTugas, bacaKoordinat, teksKoordinat, labelStatusPeta} from "./panel_murni.js";
import {muatMapLibre} from "/inti/maplibre.js";
import {ik} from "./ikon.js";
import {urlEkspor} from "./panggil_murni.js";

const off = () => -new Date().getTimezoneOffset();
const kerangkaMuat = `<div class="lp-rangka" aria-busy="true"><i></i><i></i><i></i></div>`;
const galatKotak = (r, ulang) => `<p>${esc(r.status === 403 ? "Kamu belum punya izin untuk bagian ini. Hanya pimpinan, koordinator Pusdalops, dan moderator." : r.data?.galat || pesanGalat(r.status))}</p>${ulang ? `<button class="lp-tbl" type="button" data-ulang="${ulang}">Ulangi</button>` : ""}`;

export const opsKerangka = () => `
<section class="lp-kartu"><h2>Hari ini</h2>
  <div class="lp-strip" id="lpStrip">${kerangkaMuat}</div>
</section>
<section class="lp-kartu"><h2>Peta personel</h2>
  <div class="lp-baris lp-legenda" id="lpLegenda">${["lolos", "tinjau", "tolak"].map(s => `<span class="lp-pil"><i class="lp-bulat" data-s="${s}"></i>${esc(STATUS_PETA[s][0])}</span>`).join("")}<label class="lp-centang lp-jejak"><input type="checkbox" id="lpJejak" checked><span>Tampilkan jejak</span></label></div>
  <div class="lp-peta" id="lpPeta" role="application" aria-label="Peta titik absen hari ini"></div>
  <p class="lp-kecil" id="lpPetaInfo" role="status"></p>
</section>
<section class="lp-kartu"><h2>Tugas lapangan</h2>
  <form class="lp-form lp-tugas-form" id="lpTugasForm" novalidate>
    <div><label class="lp-bidang" for="lpTJudul">Judul tugas</label><input id="lpTJudul" maxlength="120" autocomplete="off"><p class="lp-galat" data-g="judul" role="alert" hidden></p></div>
    <fieldset class="lp-chips" data-n="2"><legend>Bencana</legend>${BENCANA.map(b => `<label class="lp-chip"><input type="radio" name="tbencana" value="${b.k}"><span>${ik(b.k === "banjir" ? "air" : "api", 20)}${esc(b.label)}</span></label>`).join("")}<p class="lp-galat" data-g="bencana" role="alert" hidden></p></fieldset>
    <div><label class="lp-bidang" for="lpTKor">Titik tugas (lintang, bujur)</label>
      <div class="lp-tautan-salin"><input id="lpTKor" inputmode="decimal" autocomplete="off" placeholder="-0,05793 116,42250"><button class="lp-tbl" id="lpTPeta" type="button" aria-pressed="false">${ik("pin", 18)}Pilih di peta</button></div><p class="lp-galat" data-g="koordinat" role="alert" hidden></p></div>
    <div><label class="lp-bidang" for="lpTRadius">Radius meter (kosong = bawaan server)</label><input id="lpTRadius" inputmode="numeric" autocomplete="off"><p class="lp-galat" data-g="radius_m" role="alert" hidden></p></div>
    <div><label class="lp-bidang" for="lpTWilayah">Wilayah (tercetak di stempel foto)</label><input id="lpTWilayah" maxlength="160" autocomplete="off" placeholder="Kec. Kenohan, Kab. Kutai Kartanegara"></div>
    <div><label class="lp-bidang" for="lpTRenlap">Tautan Renlap (opsional)</label><input id="lpTRenlap" inputmode="url" autocomplete="off" placeholder="https://"><p class="lp-galat" data-g="renlap_url" role="alert" hidden></p></div>
    <div><label class="lp-bidang" for="lpTMulai">Mulai</label><input id="lpTMulai" type="datetime-local"><p class="lp-galat" data-g="mulai" role="alert" hidden></p></div>
    <div><label class="lp-bidang" for="lpTSelesai">Selesai</label><input id="lpTSelesai" type="datetime-local"><p class="lp-galat" data-g="selesai" role="alert" hidden></p></div>
    <div class="lp-penuh"><label class="lp-bidang" for="lpTCari">Anggota</label><input id="lpTCari" type="search" autocomplete="off" placeholder="Cari nama, NIP, atau unit lalu tekan Tambah">
      <div id="lpTHasil" class="lp-baris"></div><div id="lpTAnggota" class="lp-baris" aria-live="polite"></div><p class="lp-galat" data-g="anggota" role="alert" hidden></p></div>
    <div class="lp-penuh"><button class="lp-tbl utama" id="lpTSimpan" type="submit">Simpan tugas</button><p class="lp-kecil" id="lpTInfo" role="status"></p></div>
  </form>
  <div id="lpTugas">${kerangkaMuat}</div>
</section>
<section class="lp-kartu"><h2>Antrean tinjauan</h2><div id="lpTinjau">${kerangkaMuat}</div></section>`;

/* ---------- strip + peta ---------- */
let peta = null, petaSiap = false, ringkas = null, saring = null, pilihTitik = false, penanda = null, popup = null, popupId = "";
const kunciFitur = f => `${f.properties.orang}|${f.properties.waktu}|${f.properties.status}`;
const gelap = () => document.documentElement.dataset.theme === "dark";
const GAYA = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const GAYA_KOSONG = () => ({version: 8, sources: {}, layers: [{id: "latar", type: "background", paint: {"background-color": gelap() ? "#101a2e" : "#e8edf4"}}]});

function gambarStrip() {
  const a = angkaStrip(ringkas), kotak = (k, label, klik) => `<${klik ? "button" : "div"} class="lp-strip-isi${klik ? " bisa" : ""}" ${klik ? `type="button" data-saring="${klik}" aria-pressed="${saring === klik}"` : ""}><b class="num">${angka(a[k])}</b><span>${label}</span></${klik ? "button" : "div"}>`;
  $("lpStrip").innerHTML = kotak("hadir", "Hadir", "hadir") + kotak("belum_absen", "Belum absen") + kotak("belum_logbook", "Belum isi logbook") + kotak("tinjau", "Antrean tinjauan", "tinjau");
}

function terapkanPeta(fit = true) {
  if (!peta || !petaSiap || !ringkas) return;
  const t = titikGeo(ringkas.titik, saring), j = jejakGeo(ringkas.jejak);
  peta.getSource("titik")?.setData(t); peta.getSource("jejak")?.setData(j);
  peta.setLayoutProperty("jejak-garis", "visibility", $("lpJejak")?.checked ? "visible" : "none");
  const tepi = tepiPeta(t, j);
  if (tepi && fit) peta.fitBounds([[tepi[0], tepi[1]], [tepi[2], tepi[3]]], {padding: 48, maxZoom: 12, animate: false});
  $("lpPetaInfo").textContent = t.features.length ? `${angka(t.features.length)} titik absen${saring ? ` (${saring === "hadir" ? "hadir" : labelStatusPeta(saring).toLowerCase()})` : ""}.` : "Belum ada titik absen hari ini.";
}

const popupHtml = p => `<div class="lp-pop"><b>${esc(p.nama || "Petugas")}</b><br>${esc(p.tugas)}<br>${esc(labelStatusPeta(p.status))}${Number.isFinite(Number(p.waktu)) && Number(p.waktu) ? `<br>${esc(tanggalLokal(Number(p.waktu), off()))}, ${esc(teksJam(Number(p.waktu), off()))}` : ""}</div>`;

async function mulaiPeta() {
  try { await muatMapLibre(); } catch (e) { $("lpPetaInfo").textContent = "Pustaka peta tidak bisa dimuat. Muat ulang halaman."; return; }
  const buat = style => new maplibregl.Map({container: "lpPeta", style, center: [118, -2], zoom: 3.5, minZoom: 2, maxZoom: 17, attributionControl: {compact: true}, dragRotate: false});
  const pasang = m => {
    m.on("load", () => {
      petaSiap = true;
      m.addSource("jejak", {type: "geojson", data: jejakGeo([])}); m.addSource("titik", {type: "geojson", data: titikGeo([])});
      m.addLayer({id: "jejak-garis", type: "line", source: "jejak", paint: {"line-color": "#4a7bd0", "line-width": 2.5, "line-opacity": 0.75}});
      m.addLayer({id: "titik-lingkar", type: "circle", source: "titik", paint: {"circle-radius": 8, "circle-color": ["get", "warna"], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff"}});
      const tunjuk = e => { const f = e.features?.[0]; if (!f) return; m.getCanvas().style.cursor = pilihTitik ? "crosshair" : "pointer"; if (popup?.isOpen() && popupId === kunciFitur(f)) { popup.setLngLat(f.geometry.coordinates); return; } popup?.remove(); popupId = kunciFitur(f); popup = new maplibregl.Popup({closeButton: false, offset: 12, maxWidth: "260px"}).setLngLat(f.geometry.coordinates).setHTML(popupHtml(f.properties)).addTo(m); };
      m.on("mousemove", "titik-lingkar", tunjuk); m.on("click", "titik-lingkar", tunjuk);
      m.on("mouseleave", "titik-lingkar", () => { m.getCanvas().style.cursor = pilihTitik ? "crosshair" : ""; popup?.remove(); });
      m.on("click", e => { if (pilihTitik) setTitik(e.lngLat.lat, e.lngLat.lng); });
      terapkanPeta();
    });
    m.on("error", () => { if (!petaSiap && m === peta) { m.remove(); peta = buat(GAYA_KOSONG()); pasang(peta); $("lpPetaInfo").textContent = "Peta dasar tidak bisa dimuat; titik tetap ditampilkan tanpa latar."; } });
  };
  peta = buat(GAYA()); pasang(peta);
}

function setTitik(lat, lon) {
  $("lpTKor").value = teksKoordinat(lat, lon); $("lpTPeta").setAttribute("aria-pressed", "false"); pilihTitik = false; if (peta) peta.getCanvas().style.cursor = "";
  penanda?.remove(); if (peta) penanda = new maplibregl.Marker({color: "#e0731f"}).setLngLat([lon, lat]).addTo(peta);
}

async function muatRingkas() {
  const r = await api("/api/petugas/panel/ringkas", {cookie: true});
  if (!r.ok) { $("lpStrip").innerHTML = galatKotak(r, "ringkas"); $("lpPetaInfo").textContent = ""; return; }
  ringkas = r.data; gambarStrip(); terapkanPeta();
}

/* ---------- tugas ---------- */
const anggota = new Map();   // id -> nama
const gambarAnggota = () => { $("lpTAnggota").innerHTML = [...anggota].map(([id, n]) => `<span class="lp-pil">${esc(n)}<button class="lp-x" type="button" data-lepas="${esc(id)}" aria-label="Lepas ${esc(n)}">${ik("silang", 14)}</button></span>`).join(""); };

const anggotaSel = a => { const r = ringkasAnggota(a); return `<b class="num">${angka(r.jumlah)}</b>${r.nama ? `<span class="lp-kecil"> ${esc(r.nama)}</span>` : ""}`; };
async function muatTugas() {
  const kotak = $("lpTugas"); kotak.innerHTML = kerangkaMuat;
  const r = await api("/api/petugas/panel/tugas", {cookie: true});
  if (!r.ok) { kotak.innerHTML = galatKotak(r, "tugas"); return; }
  const baris = r.data.baris || r.data.tugas || []; document.dispatchEvent(new CustomEvent("lp:tugas", {detail: baris})); const d = x => (x == null || x === "" ? "-" : esc(x));
  kotak.innerHTML = baris.length ? `<div class="lp-gulir"><table class="lp-tabel"><thead><tr><th>Tugas</th><th>Bencana</th><th>Wilayah</th><th>Anggota</th><th>Hadir</th><th>Logbook terisi</th><th>Temuan terbaru</th><th>Rekap</th></tr></thead><tbody>
    ${baris.map(t => `<tr><td><b>${d(t.judul)}</b></td><td>${esc(BENCANA.find(b => b.k === t.bencana)?.label || t.bencana || "-")}</td><td>${d(t.wilayah_teks)}</td><td>${anggotaSel(t.anggota)}</td><td class="num lp-tengah">${d(t.hadir)}</td><td class="num lp-tengah">${d(t.logbook)}</td><td>${d(t.temuan)}</td><td>${urlEkspor(t.id) ? `<a class="lp-tbl" href="${esc(urlEkspor(t.id))}" download="rekap-tugas.csv">${ik("buku", 18)}Unduh CSV</a>` : "-"}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="lp-kecil lp-tengah">Belum ada tugas. Isi formulir di atas untuk membuat tugas pertama.</p>`;
}

const tampilGalat = (form, g) => { form.querySelectorAll("[data-g]").forEach(el => { const t = g[el.dataset.g] || ""; el.textContent = t; el.hidden = !t; }); };

function pasangTugas() {
  const form = $("lpTugasForm");
  $("lpTPeta").addEventListener("click", e => { pilihTitik = !pilihTitik; e.currentTarget.setAttribute("aria-pressed", String(pilihTitik)); if (peta) peta.getCanvas().style.cursor = pilihTitik ? "crosshair" : ""; $("lpTInfo").textContent = pilihTitik ? "Klik titik di peta di atas." : ""; if (pilihTitik) $("lpPeta").scrollIntoView({block: "center"}); });
  $("lpTKor").addEventListener("change", () => { const k = bacaKoordinat($("lpTKor").value); if (k && peta) { penanda?.remove(); penanda = new maplibregl.Marker({color: "#e0731f"}).setLngLat([k.lon, k.lat]).addTo(peta); peta.easeTo({center: [k.lon, k.lat], zoom: Math.max(peta.getZoom(), 9)}); } });
  let tunda = 0;
  $("lpTCari").addEventListener("input", e => {
    clearTimeout(tunda); const q = e.target.value.trim();
    if (q.length < 2) { $("lpTHasil").innerHTML = ""; return; }
    tunda = setTimeout(async () => {
      const r = await api(`/api/petugas/panel/orang?${new URLSearchParams({cari: q, halaman: 1})}`, {cookie: true});
      if ($("lpTCari").value.trim() !== q) return;
      $("lpTHasil").innerHTML = r.ok ? (r.data.baris || []).slice(0, 8).filter(o => !anggota.has(o.id)).map(o => `<button class="lp-tbl" type="button" data-tambah="${esc(o.id)}" data-nama="${esc(o.nama)}">${ik("tambah", 16)}${esc(o.nama)}${o.unit ? `, ${esc(o.unit)}` : ""}</button>`).join("") || `<span class="lp-kecil">Tidak ada yang cocok.</span>` : `<span class="lp-kecil">${esc(pesanGalat(r.status))}</span>`;
    }, 300);
  });
  form.addEventListener("click", e => {
    const t = e.target.closest("[data-tambah]"); if (t) { anggota.set(t.dataset.tambah, t.dataset.nama); t.remove(); gambarAnggota(); return; }
    const l = e.target.closest("[data-lepas]"); if (l) { anggota.delete(l.dataset.lepas); gambarAnggota(); }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const b = $("lpTSimpan"); if (b.disabled) return;
    const r = rapikanTugas({judul: $("lpTJudul").value, bencana: form.querySelector('input[name="tbencana"]:checked')?.value, koordinat: $("lpTKor").value, radius_m: $("lpTRadius").value, wilayah_teks: $("lpTWilayah").value, renlap_url: $("lpTRenlap").value, mulai: $("lpTMulai").value, selesai: $("lpTSelesai").value, anggota: [...anggota.keys()]});
    tampilGalat(form, r.galat);
    if (!r.ok) { form.querySelector("[data-g]:not([hidden])")?.scrollIntoView({block: "center"}); return; }
    b.disabled = true; b.textContent = "Menyimpan...";
    nanti(async () => {
      const h = await api("/api/petugas/panel/tugas", {metode: "POST", cookie: true, badan: r.badan});
      b.disabled = false; b.textContent = "Simpan tugas";
      if (!h.ok) { $("lpTInfo").textContent = h.data?.galat || pesanGalat(h.status); return; }
      $("lpTInfo").textContent = "Tugas tersimpan. Anggota menerima tautan lewat WA."; form.reset(); anggota.clear(); gambarAnggota(); penanda?.remove();
      muatTugas(); muatRingkas();
    });
  });
}

/* ---------- tinjauan ---------- */
async function muatTinjau() {
  const kotak = $("lpTinjau"); kotak.innerHTML = kerangkaMuat;
  const r = await api("/api/petugas/panel/tinjau", {cookie: true});
  if (!r.ok) { kotak.innerHTML = galatKotak(r, "tinjau"); return; }
  const baris = r.data.baris || [];
  kotak.innerHTML = baris.length ? `<div class="lp-tinjau-daftar">${baris.map(x => kartuTinjau(x)).join("")}</div>` : `<p class="lp-kecil lp-tengah">Tidak ada absen yang menunggu tinjauan.</p>`;
}

function pasangTinjau() {
  $("lpTinjau").addEventListener("click", e => {
    const u = e.target.closest("[data-ulang]"); if (u) return muatTinjau();
    const b = e.target.closest("[data-putus]"); if (!b || b.disabled) return;
    const kartu = b.closest(".lp-tinjau"), g = kartu.querySelector(".lp-galat"), r = putusanTinjau(b.dataset.putus, kartu.querySelector("input").value);
    if (!r.ok) { g.textContent = r.galat; g.hidden = false; return; }
    g.hidden = true; const tombol = kartu.querySelectorAll("[data-putus]"), teks = b.textContent; tombol.forEach(x => { x.disabled = true; }); b.textContent = "Menyimpan...";
    nanti(async () => {
      const h = await api(`/api/petugas/panel/tinjau/${encodeURIComponent(kartu.dataset.id)}`, {metode: "POST", cookie: true, badan: r.badan});
      if (!kartu.isConnected) return;
      if (!h.ok) { tombol.forEach(x => { x.disabled = false; }); b.textContent = teks; g.textContent = h.data?.galat || pesanGalat(h.status); g.hidden = false; return; }
      kartu.remove(); if (!$("lpTinjau").querySelector(".lp-tinjau")) $("lpTinjau").innerHTML = `<p class="lp-kecil lp-tengah">Tidak ada absen yang menunggu tinjauan.</p>`;
      muatRingkas();
    });
  });
}

export function pasangOps() {
  $("lpStrip").addEventListener("click", e => {
    const u = e.target.closest("[data-ulang]"); if (u) return muatRingkas();
    const b = e.target.closest("[data-saring]"); if (!b) return;
    saring = saring === b.dataset.saring ? null : b.dataset.saring;
    if (saring === "tinjau") $("lpTinjau").scrollIntoView({block: "start"});
    $("lpStrip").querySelectorAll("[data-saring]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.saring === saring)));   // tombol tetap, fokus tidak hilang
    nanti(() => terapkanPeta(false));
  });
  $("lpJejak").addEventListener("change", () => peta && petaSiap && peta.setLayoutProperty("jejak-garis", "visibility", $("lpJejak").checked ? "visible" : "none"));
  $("lpTugas").addEventListener("click", e => { if (e.target.closest("[data-ulang]")) muatTugas(); });
  pasangTugas(); pasangTinjau();
  mulaiPeta().then(muatRingkas);
  muatTugas(); muatTinjau();
}
