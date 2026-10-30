/* SIPPA: layar Rencana kunjungan /pipa/kunjungan (keputusan 64). Kontrak router: pasang(akar, konteks) dan lepas().
   Logika murni di kunjungan.js; berkas ini hanya DOM, MapLibre, dan jaringan. Data dimuat malas saat layar dibuka dan dibuang saat layar dilepas.
   Tombol Susun rencana: label berubah seketika, kerja berat (pilih, OSRM, bagi tim) lewat nanti(). Butuh global public/inti: fmt, esc, nanti. */
import {memuat, galat as kotakGalat} from "./keadaan.js";
import {bukaDialog, kirimPost} from "./layar_kit.js";
import {cekRenlap, hasilBuatHtml, teksKoordinat} from "./renlap.js";
import {bacaKoordinat, pilihKandidat, urlOsrmTable, bacaOsrm, gabungMatriks, susunRencana, tautanSemua, tautanTim, tautanHari, kunjunganUntukServer, MAKS_LOKASI, MAKS_TIM} from "./kunjungan.js";
import {muatMapLibre} from "../inti/maplibre.js";

export const JALUR = {kompleks: "/api/sippa/data/kelayakan_kompleks", akses: "/api/sippa/data/akses_kompleks", konsesi: "/api/sippa/data/konsesi_kompleks", titik: "/data/hotspot72.json", kluster: "/data/kluster.json", palsu: "/data/titik_palsu.json", renlap: "/api/sippa/renlap"};
const OSRM_BATAS_MS = 15000;
const PUSAT = [118, -2];

let ctrl = null, peta = null, hentikan = [];
export function lepas() {
  ctrl?.abort(); ctrl = null;
  hentikan.forEach(f => { try { f(); } catch { /* pembersih boleh gagal */ } }); hentikan = [];
  try { peta?.remove(); } catch { /* peta sudah dilepas */ }
  peta = null;
}

function muatGaya() {
  return new Promise(ok => {
    if (document.querySelector('link[data-sp="kunjungan"]')) return ok();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/pipa/layar_kunjungan.css?v=1"; l.dataset.sp = "kunjungan";
    l.onload = l.onerror = () => ok(); document.head.append(l); setTimeout(ok, 1500);
  });
}
const gayaPeta = () => document.documentElement.dataset.theme === "dark" ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";

const pil = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const km = n => `${fmt(Math.round(n * 10) / 10)} km`;
const lama = m => { const t = Math.round(m), j = Math.floor(t / 60), s = t % 60; return j ? (s ? `${fmt(j)} jam ${fmt(s)} menit` : `${fmt(j)} jam`) : `${fmt(s)} menit`; };
const td = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;
const tombolTaut = (urls, teks) => urls.map((u, i) => `<a class="ad-tombol" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(urls.length > 1 ? `${teks} (bagian ${fmt(i + 1)})` : teks)}</a>`).join(" ");

/* ambil dengan batas waktu; galat atau lewat batas = null, pemanggil jatuh ke perkiraan */
async function ambilOsrm(titik, sinyal) {
  const batas = new AbortController(), t = setTimeout(() => batas.abort(), OSRM_BATAS_MS);
  sinyal.addEventListener("abort", () => batas.abort(), {once: true});
  try { const r = await fetch(urlOsrmTable(titik), {signal: batas.signal}); return r.ok ? bacaOsrm(await r.json(), titik.length) : null; }
  catch { return null; } finally { clearTimeout(t); }
}

function hasilHtml(r, awal, o) {
  const baris = []; let no = 0;
  const nomor = new Map();
  for (const t of r.tim) for (const c of t.lokasi) nomor.set(c.id, ++no);
  for (const t of r.tim) for (const h of t.hari) for (const id of h.ids) {
    const c = t.lokasi.find(x => x.id === id), b = r.baris[id], ps = [];
    if (c.terdekat) ps.push(pil("terdekat dari titik awal"));
    if (c.dugaan) ps.push(pil("dugaan tambang atau sumber panas tetap", "hipotesis", c.dugaan));
    if (!c.sisaTahu) ps.push(pil("lama api belum diketahui", "menunggu"));
    baris.push(`<tr>${td("No", fmt(nomor.get(id)), true)}${td("Lokasi", `<b>${esc(c.kab ?? "–")}</b><br>${esc(c.id)} ${ps.join(" ")}${c.dugaan ? `<br><small>${esc(c.dugaan)}</small>` : ""}`)}`
      + `${td("Titik panas 24 jam", `${fmt(c.n24)}`, true)}${td("Jarak lurus", km(b.lurusKm), true)}`
      + `${td("Jarak jalan", `${km(b.jalanKm)} ${pil(b.sumber === "osrm" ? "OSRM" : "perkiraan", b.sumber === "osrm" ? "estimasi-model" : "asumsi-kebijakan")}`, true)}${td("Waktu mobil", lama(b.mobilMenit), true)}`
      + `${td("Jalan kaki dari parkir", `${km(c.kakiKm)}, ${lama(c.kakiMenit)}`, true)}${td("Total sampai petak", lama(b.mobilMenit + c.kakiMenit), true)}${td("Tim dan hari", `Tim ${fmt(t.no)}, hari ${fmt(h.no)}`)}</tr>`);
  }
  const kepala = ["No", "Lokasi", "Titik panas 24 jam dalam 1 km", "Jarak lurus", "Jarak jalan", "Waktu mobil", "Jalan kaki dari parkir", "Total sampai petak", "Tim dan hari"].map(k => `<th scope="col">${k}</th>`).join("");
  const perTim = r.tim.map(t => {
    const hari = t.hari.map(h => {
      const akhir = t.lokasi.find(x => x.id === h.ids[h.ids.length - 1]), sebelum = t.hari[h.no - 2], asal = sebelum ? t.lokasi.find(x => x.id === sebelum.ids.at(-1)).parkir : awal;
      const lok = h.ids.map(id => t.lokasi.find(x => x.id === id));
      return `<li><b>Hari ${fmt(h.no)}</b>: ${h.ids.map(id => esc(id)).join(", ")}. ${esc(lama(h.menitTotal))} (mobil ${esc(lama(h.menitMobil))}, lapangan ${esc(lama(h.menitLapangan))}).`
        + `${h.menginap ? ` Menginap di ${esc(akhir.kab ?? akhir.id)}.` : ""} <span class="kj-aksi">${tombolTaut(tautanHari(asal, lok), "Buka hari ini di Google Maps")}</span></li>`;
    }).join("");
    return `<div class="kj-tim kj-t${(t.no - 1) % 4}"><h3>Tim ${fmt(t.no)}, ${fmt(t.lokasi.length)} lokasi</h3><p class="ad-catat">Mobil ${esc(lama(t.menit))} sampai lokasi terakhir, pulang ke titik awal ${esc(lama(t.menitPulang))}.</p><ul>${hari}</ul>`
      + `<p class="kj-aksi">${tombolTaut(tautanTim(awal, t.lokasi), `Buka Tim ${t.no} di Google Maps`)}</p></div>`;
  }).join("");
  const semua = r.tim.flatMap(t => t.lokasi);
  return `<div class="ad-tabel-wadah"><table class="ad-tabel kj-tabel"><caption class="sr">Lokasi menurut urutan kunjungan</caption><thead><tr>${kepala}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`
    + `<div class="kj-ringkas">${perTim}</div>`
    + `<p class="sp-aksi">${tombolTaut(tautanSemua(awal, semua), "Buka semua di Google Maps")} <button type="button" class="ad-tombol" data-aksi="renlap">Buat renlap PDF</button></p>`
    + `<p class="ad-catat">Waktu jalan memakai OSRM (data OpenStreetMap) bila tersedia; untuk itu koordinat titik awal dan lokasi dikirim ke layanan rute publik OSRM. Bila OSRM tidak tersedia, selain itu perkiraan garis lurus x 1,4 pada 40 km/jam. Tambahkan 30 sampai 50 persen untuk jalan kebun atau penyeberangan feri. Waktu di lokasi ${fmt(o.diLokasi)} menit per lokasi ${pil("asumsi-kebijakan")}, batas kerja ${fmt(o.batas / 60)} jam per hari, jalan kaki dihitung pergi pulang. Titik panas dari satelit dalam 1 km kompleks, ramalan lama api dari klaster.</p>`;
}

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, prov = konteks.prov;
  await muatGaya();
  if (sinyal.aborted) return;
  akar.innerHTML = `<div class="sp-judul-baris"><h1 class="sp-judul">Rencana kunjungan</h1></div>
<div class="kj-grid">
 <section class="kj-kolom">
  <h2 class="ad-ey">1. Titik awal</h2>
  <div class="kj-peta" data-peta aria-label="Peta titik awal. Klik untuk menaruh titik awal."></div>
  <div class="sp-form">
   <label>Koordinat, lintang lalu bujur<input type="text" data-koor inputmode="decimal" autocomplete="off" placeholder="-1.24096, 116.83496"></label>
   <p class="ad-catat" data-awal role="status">Klik peta, tempel koordinat dari Google Maps, atau pakai lokasimu.</p>
   <div class="sp-aksi"><button type="button" class="ad-tombol" data-aksi="lokasi">Pakai lokasi saya</button></div>
  </div>
  <h2 class="ad-ey">2. Pengaturan</h2>
  <div class="sp-form kj-form">
   <label>Jumlah tim<input type="number" data-tim min="1" max="${MAKS_TIM}" value="1" inputmode="numeric"></label>
   <label>Jumlah lokasi<input type="number" data-lokasi min="1" max="${MAKS_LOKASI}" value="6" inputmode="numeric"></label>
   <label>Radius dari titik awal, km<input type="number" data-radius min="1" max="3000" value="300" inputmode="numeric"></label>
   <label class="kj-cek"><input type="checkbox" data-terdekat checked> Sertakan kompleks terdekat dari titik awal</label>
   <label class="kj-cek"><input type="checkbox" data-dugaan> Tampilkan dugaan tambang atau sumber panas tetap</label>
  </div>
  <div class="sp-aksi"><button type="button" class="ad-tombol" data-aksi="susun" disabled>Susun rencana</button></div>
  <p class="ad-catat" data-status role="status"></p>
 </section>
 <section class="kj-kolom" data-hasil aria-live="polite"></section>
</div>`;
  const q = s => akar.querySelector(s), hasil = q("[data-hasil]"), info = q("[data-awal]"), status = q("[data-status]"), tSusun = q('[data-aksi="susun"]');
  const s = {awal: null, d: null, rencana: null, pasang: []};
  hasil.replaceChildren(memuat());

  /* ---------- titik awal ---------- */
  let penanda = null;
  const taruh = (p, geser = true) => {
    s.awal = p; q("[data-koor]").value = `${Math.round(p[0] * 1e5) / 1e5}, ${Math.round(p[1] * 1e5) / 1e5}`;
    info.textContent = `Titik awal ${teksKoordinat(p[0], p[1])}.`;   // koordinat bertitik desimal seperti Google Maps, bukan format angka Indonesia
    if (peta) { penanda ??= new maplibregl.Marker(); penanda.setLngLat([p[1], p[0]]).addTo(peta); if (geser) peta.easeTo({center: [p[1], p[0]], duration: 300}); }
    segar();
  };
  const segar = () => { tSusun.disabled = !(s.awal && s.d); };
  q("[data-koor]").addEventListener("input", e => { const p = bacaKoordinat(e.target.value); if (p) taruh(p); else { s.awal = null; info.textContent = e.target.value.trim() ? "Koordinat belum terbaca. Contoh: -1.24096, 116.83496 (di Indonesia)." : "Klik peta, tempel koordinat dari Google Maps, atau pakai lokasimu."; segar(); } });
  q('[data-aksi="lokasi"]').addEventListener("click", e => {
    const b = e.currentTarget; b.disabled = true; b.textContent = "Mencari lokasi";
    const selesai = () => { b.disabled = false; b.textContent = "Pakai lokasi saya"; };
    if (!navigator.geolocation) { info.textContent = "Peramban ini tidak punya layanan lokasi."; selesai(); return; }
    navigator.geolocation.getCurrentPosition(p => { selesai(); const t = [p.coords.latitude, p.coords.longitude]; if (bacaKoordinat(`${t[0]}, ${t[1]}`)) taruh(t); else info.textContent = "Lokasimu di luar Indonesia."; }, () => { selesai(); info.textContent = "Lokasi tidak bisa dibaca. Izinkan lokasi atau tempel koordinat."; }, {timeout: 10000});
  });

  /* ---------- peta ---------- */
  muatMapLibre().then(() => {
    if (sinyal.aborted) return;
    peta = new maplibregl.Map({container: q("[data-peta]"), style: gayaPeta(), center: PUSAT, zoom: 4, minZoom: 3, maxZoom: 15, attributionControl: {compact: true}, dragRotate: false});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    const ukur = new ResizeObserver(() => peta?.resize()); ukur.observe(q("[data-peta]")); hentikan.push(() => ukur.disconnect());
    peta.on("click", e => { const p = [e.lngLat.lat, e.lngLat.lng]; if (bacaKoordinat(`${p[0]}, ${p[1]}`)) taruh(p, false); });
    if (s.awal) taruh(s.awal);
  }).catch(e => { q("[data-peta]").textContent = e.message; });

  /* ---------- data ---------- */
  const ambil = u => konteks.ambil(u, sinyal);
  Promise.allSettled([ambil(JALUR.kompleks), ambil(JALUR.akses), ambil(JALUR.titik), ambil(JALUR.konsesi), ambil(JALUR.kluster), ambil(JALUR.palsu)]).then(([k, a, t, c, l, f]) => {
    if (sinyal.aborted) return;
    const wajib = [k, a, t].find(x => x.status === "rejected");
    if (wajib) { hasil.replaceChildren(kotakGalat(wajib.reason?.status ?? 0, wajib.reason?.message, () => location.reload())); return; }
    s.d = {kompleks: (k.value.kompleks ?? []), akses: a.value.kompleks ?? [], titik: t.value, konsesi: c.status === "fulfilled" ? c.value : null, kluster: l.status === "fulfilled" ? l.value : null, palsu: f.status === "fulfilled" ? f.value : null};
    const ket = [c.status === "rejected" ? "konsesi" : "", l.status === "rejected" ? "klaster (lama api)" : "", f.status === "rejected" ? "sumber panas tetap" : ""].filter(Boolean);
    hasil.replaceChildren(Object.assign(document.createElement("p"), {className: "ad-kosong", textContent: "Taruh titik awal dan atur pilihan, lalu tekan Susun rencana."}));
    if (ket.length) status.textContent = `Data ${ket.join(" dan ")} tidak termuat; penilaian bagian itu dilewati.`;
    segar();
  });

  /* ---------- susun rencana ---------- */
  const angka = (sel, min, maks, awal) => { const v = Math.floor(Number(q(sel).value)); return Number.isFinite(v) && v >= min ? Math.min(v, maks) : awal; };
  async function susun() {
    const o = {nTim: angka("[data-tim]", 1, MAKS_TIM, 1), jumlah: angka("[data-lokasi]", 1, MAKS_LOKASI, 6), radiusKm: angka("[data-radius]", 1, 3000, 300), sertakanTerdekat: q("[data-terdekat]").checked, termasukDugaan: q("[data-dugaan]").checked};
    const kand = pilihKandidat({...s.d, awal: s.awal, prov, ...o});
    if (sinyal.aborted) return;
    if (!kand.length) { hasil.replaceChildren(Object.assign(document.createElement("p"), {className: "ad-kosong", textContent: "Tidak ada kompleks yang memenuhi syarat: titik panas 24 jam, perkiraan api masih 2 hari atau lebih, dan bisa dijangkau. Coba radius lebih besar."})); status.textContent = ""; return; }
    status.textContent = "Menghitung jarak jalan lewat OSRM";
    const titik = [s.awal, ...kand.map(c => c.parkir)], osrm = await ambilOsrm(titik, sinyal);
    if (sinyal.aborted) return;
    const batas = 600, diLokasi = 150, matriks = gabungMatriks(titik, osrm);
    s.rencana = susunRencana({kandidat: kand, awal: s.awal, nTim: o.nTim, matriks, batasMenit: batas, diLokasiMenit: diLokasi});
    hasil.innerHTML = hasilHtml(s.rencana, s.awal, {diLokasi, batas});
    status.textContent = osrm ? "" : "OSRM tidak menjawab; jarak jalan memakai perkiraan.";
    gambarPenanda();
  }
  function gambarPenanda() {
    s.pasang.forEach(m => m.remove()); s.pasang = [];
    if (!peta || !s.rencana) return;
    const batas = new maplibregl.LngLatBounds([s.awal[1], s.awal[0]], [s.awal[1], s.awal[0]]); let no = 0;
    for (const t of s.rencana.tim) for (const c of t.lokasi) {
      const e = document.createElement("div"); e.className = `kj-penanda kj-t${(t.no - 1) % 4}`; e.textContent = String(++no); e.title = `${c.id}, tim ${t.no}`;
      s.pasang.push(new maplibregl.Marker({element: e}).setLngLat([c.parkir[1], c.parkir[0]]).addTo(peta)); batas.extend([c.parkir[1], c.parkir[0]]);
    }
    peta.fitBounds(batas, {padding: 48, maxZoom: 11, duration: 400});
  }
  hentikan.push(() => s.pasang.forEach(m => m.remove()));
  tSusun.addEventListener("click", () => {
    tSusun.disabled = true; tSusun.textContent = "Menyusun"; status.textContent = "Menyusun rencana";
    nanti(() => susun().catch(e => { if (e?.name !== "AbortError") status.textContent = "Rencana gagal disusun. Coba lagi."; }).finally(() => { tSusun.textContent = "Susun rencana"; segar(); }));
  });

  /* ---------- renlap PDF ---------- */
  async function buatRenlap() {
    const r = s.rencana, ids = [...r.tim.flatMap(t => t.lokasi)].sort((x, y) => y.n24 - x.n24 || x.lurusKm - y.lurusKm).map(c => c.id);
    const g = cekRenlap(ids); if (g.length) { konteks.pesan?.(g[0].alasan); return; }
    const isiD = document.createElement("div"); isiD.textContent = "Membuat renlap";
    bukaDialog("Buat renlap", isiD);
    isiD.addEventListener("click", async e => {
      const b = e.target.closest("[data-salin-renlap]"); if (!b) return;
      b.textContent = "Menyalin";
      try { await navigator.clipboard.writeText(b.dataset.salinRenlap); b.textContent = "Tersalin"; } catch { b.textContent = "Salin gagal; salin dari kotak"; }
    });
    try { isiD.innerHTML = hasilBuatHtml(await kirimPost(JALUR.renlap, {kompleks_ids: ids, kunjungan: kunjunganUntukServer(r)}), location.origin); }
    catch (x) { isiD.textContent = x.message || "Renlap gagal dibuat. Coba lagi."; }
  }
  hasil.addEventListener("click", e => { if (e.target.closest('[data-aksi="renlap"]') && s.rencana) nanti(buatRenlap); });
}
