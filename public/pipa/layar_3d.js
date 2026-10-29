/* SIPPA: layar Simulasi 3D /pipa/3d (PRD §9.6, DS §3.17 dan §4.10). Kontrak router: pasang(akar, konteks) dan lepas().
   Butuh global public/inti: fmt, esc, nanti (dimuat cangkang atau app.js). Logika murni dan runtime three di adegan.js (three hanya dimuat di layar ini).
   Semua angka dari hidraulika() di hitung.js, sama dengan kalkulator; panel teks memuat angka yang sama dengan kanvas (alternatif aksesibel). */
import {hidraulika, KONST} from "./hitung.js";
import {buatAdegan, tataKomponen, angkaPanel, cekKedalaman, dariKompleks, SKALA_TEKANAN, TEPI_BAR, INFO_KOMPONEN} from "./adegan.js";
import {galat, menunggu} from "./keadaan.js";
import {ikon} from "./ikon.js";

const ADEGAN = [["susunan", "Susunan kit"], ["jalur", "Jalur air"], ["injeksi", "Injeksi"]];
const DN = [65, 100, 150];
/* kontrol bergeser: [kunci, label, satuan, min geser, maks geser, langkah, min kotak, maks kotak]; kedalaman memakai batas KONST, bukan angka tertulis */
const KONTROL = [
  ["q_lpm", "Debit", "L/min", 60, 1500, 10, 1, 5000],
  ["L_m", "Panjang trase", "m", 100, 5000, 50, 10, 20000],
  ["dz_m", "Beda elevasi", "m", -30, 60, 0.5, -200, 200],
  ["n_lance", "Lance aktif", "buah", 1, 16, 1, 1, 16],
  ["dalam_m", "Kedalaman lance", "m", 0, KONST.dalam_maks_m, 0.1, 0, KONST.dalam_maks_m]
];
const AWAL = {q_lpm: 300, L_m: 1000, dz_m: 2, n_lance: 8, dalam_m: 1.5, dn_mm: 100};
const LABEL_SKALA = {rendah: b => `Di bawah ${fmt(KONST.sisa_syarat)} bar`, sedang: () => `${fmt(TEPI_BAR[0])} sampai ${fmt(TEPI_BAR[1])} bar`, baik: () => `${fmt(TEPI_BAR[1])} sampai ${fmt(TEPI_BAR[2])} bar`, tinggi: b => `${fmt(TEPI_BAR[2])} bar sampai batas ${fmt(b)} bar`, lewat: b => `Di atas batas kerja ${fmt(b)} bar`};
const PILIHAN_GAGAL = "Layar tidak bisa ditampilkan. Coba lagi.";

const pil = (teks, kelas = "estimasi-model", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const satuanTeks = (n, s) => s ? `${fmt(n)} ${s}` : String(n);

/* ---------- tampilan murni (string); data teks selalu lewat esc ---------- */
function htmlKartu(a) {
  const nilai = a.kunci === "vonis" ? esc(a.nilai) : esc(satuanTeks(a.nilai, a.satuan));
  const banding = a.banding == null ? a.bandingTeks : `${a.bandingTeks} ${fmt(a.banding)} ${a.satuan}`;
  return `<div class="sp-angka${a.kunci === "vonis" ? " sp-angka-lebar" : ""}${a.lewat ? " lewat" : ""}${a.asumsi ? " asumsi" : ""}"><dt class="ad-ey">${esc(a.label)}</dt>
    <dd><b>${a.lewat ? ikon("circle-x") : ""}${nilai}</b>${a.lewat ? '<span class="sr"> melewati batas</span>' : ""}<small>${esc(banding)}</small>
    <span class="sp-pil-baris">${pil(a.asumsi ? "Asumsi" : "Estimasi model", a.asumsi ? "asumsi-kebijakan" : "estimasi-model")}</span><small class="sp-sumber">${esc(a.sumber)}</small></dd></div>`;
}
function htmlKontrol([k, label, satuan, mn, mx, langkah, kmn, kmx], nilai) {
  const id = `sa-${k}`;
  return `<div class="sp-baris"><label for="${id}-r">${label} <span class="sp-nilai" data-nilai="${k}">${esc(fmt(nilai))} ${satuan}</span></label>
    <div class="sp-geser"><input type="range" id="${id}-r" data-k="${k}" min="${mn}" max="${mx}" step="${langkah}" value="${nilai}">
    <input type="number" inputmode="decimal" id="${id}-n" data-kn="${k}" min="${kmn}" max="${kmx}" step="${langkah}" value="${nilai}" aria-label="${label}, kotak angka, dalam ${satuan}"></div>
    <p class="sp-peringatan" data-salah="${k}" role="alert" hidden></p></div>`;
}
function htmlKartuKomponen(id, k) {
  if (!id) return `<p class="ad-kosong">Pilih komponen dari daftar untuk melihat kode BOM, titik kerja, dan kriteria terima.</p>`;
  const b = k.find(x => x.id === id); if (!b) return "";
  const i = INFO_KOMPONEN[b.kode_bom], n = k.filter(x => x.kode_bom === b.kode_bom).length;
  return `<article class="sp-komponen" aria-label="Info komponen ${esc(b.kode_bom)}"><header><b>${esc(b.kode_bom)}</b>${pil(i.yakin === "terverifikasi" ? "Terverifikasi" : "Asumsi", i.yakin)}</header>
    <p>${esc(i.nama)}</p><dl><div><dt>Jumlah di kit</dt><dd>${esc(i.jumlah)}${n > 1 ? `, ${fmt(n)} di adegan` : ""}</dd></div><div><dt>Titik kerja</dt><dd>${esc(i.titik)}</dd></div>${i.terima ? `<div><dt>Kriteria terima</dt><dd>${esc(i.terima)}</dd></div>` : ""}<div><dt>Gambar teknik</dt><dd>SIPPA-G-01, susunan kit relay</dd></div></dl>
    <small class="sp-sumber">Sumber: PRD §6.1, harga dan jumlah berpil keyakinan sama</small></article>`;
}
function htmlChipKomponen(k, pilih) {
  const unik = [...new Map(k.map(b => [b.kode_bom, b])).values()];
  return unik.map(b => `<button type="button" class="ad-chip" data-komp="${esc(b.id)}" aria-pressed="${Boolean(pilih) && k.find(x => x.id === pilih)?.kode_bom === b.kode_bom}">${esc(b.kode_bom)}</button>`).join("");
}

function pastikanCSS() {
  if (document.querySelector("link[data-adegan]")) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/pipa/adegan.css"; l.dataset.adegan = ""; document.head.append(l);
}

let ctrl = null, adegan = null;
export function lepas() { ctrl?.abort(); ctrl = null; adegan?.lepas(); adegan = null; }

export async function pasang(akar, konteks) {
  lepas(); pastikanCSS(); ctrl = new AbortController();
  const sinyal = ctrl.signal;
  const q = new URLSearchParams(location.search), idAwal = /^K[0-9]+$/.test(q.get("kompleks") || "") ? q.get("kompleks") : null;
  const st = {adegan: "susunan", p: {...AWAL}, kompleks: null, daftar: null, pilih: null, anim: !matchMedia("(prefers-reduced-motion: reduce)").matches};

  akar.innerHTML = `<h1 class="sp-judul">Simulasi 3D</h1>
    <p class="ad-spanduk sp-hp-saja" role="note">Layar ini dirancang untuk laptop. Di ponsel, angka tetap lengkap di bawah adegan.</p>
    <div class="sp-3d">
      <section class="sp-3d-kanvas" aria-label="Adegan 3D">
        <div class="sp-3d-atas"><div class="ad-seg" role="radiogroup" aria-label="Adegan">${ADEGAN.map(([k, n]) => `<button type="button" role="radio" aria-checked="${k === st.adegan}" tabindex="${k === st.adegan ? 0 : -1}" data-adegan="${k}">${n}</button>`).join("")}</div>
          <span class="sp-pil-baris" data-pil-adegan></span></div>
        <div class="sp-3d-wadah"><div class="sp-3d-pentas" data-wadah><div class="sp-muat"><div class="sp-kerangka" aria-busy="true" aria-label="Memuat"></div><span>Memuat adegan 3D</span></div></div>
          <div class="sa-lb" aria-hidden="true"><span data-lb="anim"></span><span data-lb="skala"></span></div></div>
        <div class="sp-3d-kamera" role="group" aria-label="Kontrol kamera">
          <button type="button" class="ad-tombol" data-kam="kiri">Putar kiri</button><button type="button" class="ad-tombol" data-kam="kanan">Putar kanan</button>
          <button type="button" class="ad-tombol" data-kam="dekat">Perbesar</button><button type="button" class="ad-tombol" data-kam="jauh">Perkecil</button>
          <button type="button" class="ad-tombol" data-kam="reset">Atur ulang</button>
          <button type="button" class="ad-tombol" data-anim aria-pressed="${st.anim}">${st.anim ? "Jeda animasi" : "Putar animasi"}</button></div>
        <ul class="sa-legenda" data-legenda hidden aria-label="Skala tekanan selang"></ul>
        <p class="sa-catat" data-catat hidden>Ilustrasi, bukan model panas terkalibrasi (model M04 belum dikalibrasi)</p>
      </section>
      <aside class="sp-3d-panel" aria-label="Kontrol dan angka">
        <section class="sp-3d-angka" aria-labelledby="sa-h-angka"><h2 class="sp-h2" id="sa-h-angka">Angka</h2><div data-pesan class="sp-peringatan" role="alert" hidden></div><dl class="sp-angka-kisi" data-angka></dl></section>
        <details class="sp-3d-kontrol" ${matchMedia("(min-width: 768px)").matches ? "open" : ""}><summary>Kontrol</summary><form class="sp-form" data-form>
          ${KONTROL.slice(0, 1).map(k => htmlKontrol(k, st.p[k[0]])).join("")}
          <div class="sp-baris"><span class="sp-etiket" id="sa-dn-e">Diameter layflat</span><div class="ad-seg" role="radiogroup" aria-labelledby="sa-dn-e">${DN.map(d => `<button type="button" role="radio" aria-checked="${d === st.p.dn_mm}" tabindex="${d === st.p.dn_mm ? 0 : -1}" data-dn="${d}">DN${d}</button>`).join("")}</div></div>
          ${KONTROL.slice(1).map(k => htmlKontrol(k, st.p[k[0]])).join("")}
          <div class="sp-baris"><label for="sa-kompleks-i">Kompleks, boleh kosong</label><div class="sp-geser"><input type="text" id="sa-kompleks-i" list="sa-kompleks-d" maxlength="12" placeholder="K0412" autocomplete="off" spellcheck="false" value="${esc(idAwal || "")}" disabled><datalist id="sa-kompleks-d"></datalist></div>
          <p class="sp-peringatan" data-salah="kompleks" role="alert" hidden></p><p class="sp-kompleks-info" data-kompleks-info></p></div></form></details>
        <section class="sp-3d-komp" aria-labelledby="sa-h-komp" data-sec-komp><h2 class="sp-h2" id="sa-h-komp">Komponen kit</h2><div class="sp-chips" data-chip-komp role="group" aria-label="Daftar komponen"></div><div aria-live="polite" data-kartu-komp></div></section>
      </aside></div>`;

  akar.addEventListener("submit", e => e.preventDefault(), {signal: sinyal});
  const q1 = s => akar.querySelector(s), wadah = q1("[data-wadah]");
  const pesan = t => { const e = q1("[data-pesan]"); e.hidden = !t; e.textContent = t || ""; };
  const salah = (k, t) => { const e = q1(`[data-salah="${k}"]`); e.hidden = !t; e.textContent = t || ""; akar.querySelectorAll(`[data-k="${k}"],[data-kn="${k}"]`).forEach(x => x.setAttribute("aria-invalid", String(!!t))); };

  /* hitung: hasil dari hidraulika() atau galat masukan berkalimat (kedalaman di atas batas ditolak) */
  const hitung = () => { cekKedalaman(st.p.dalam_m); return hidraulika({...st.p, dz_sumber: st.kompleks ? "dem" : "masukan", n_pompa: 1}); };

  /* label melayang di kanvas: textContent saja */
  const setLabel = (kunci, t) => { const e = q1(`[data-lb="${kunci}"]`); if (e && e.textContent !== t) e.textContent = t; };

  /* satu pembaruan berat per frame: slider beruntun tidak menumpuk (INP) */
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; segarkan(); }); };
  function segarkan() {
    if (sinyal.aborted) return;
    let hasil;
    try { hasil = hitung(); pesan(""); } catch (e) { if (!(e instanceof RangeError)) throw e; pesan(e.message); return; }
    q1("[data-angka]").innerHTML = angkaPanel(hasil).map(htmlKartu).join("");
    const ju = q1("[data-legenda]"); ju.hidden = st.adegan !== "jalur";
    if (st.adegan === "jalur") ju.innerHTML = SKALA_TEKANAN.map(s => `<li><i class="sa-sw sa-k${s.kelas}"></i>${esc(LABEL_SKALA[s.kunci](hasil.p_batas_bar))}</li>`).join("");
    q1("[data-catat]").hidden = st.adegan !== "injeksi";
    const profilKompleks = !!st.kompleks && st.kompleks.elev_air_m != null && st.kompleks.elev_kompleks_m != null && Math.abs(st.p.dz_m - (st.kompleks.elev_kompleks_m - st.kompleks.elev_air_m)) < 0.05;
    q1("[data-pil-adegan]").innerHTML = st.adegan === "jalur" ? (profilKompleks ? pil("DSM berkanopi, ilustrasi", "estimasi-model", "Elevasi GLO-30 berkanopi sampai DEMNAS tiba") : pil("Garis lurus dari beda elevasi", "asumsi-kebijakan")) : pil("Skala ilustrasi", "asumsi-kebijakan");
    const sk = q1("[data-sec-komp]"); sk.hidden = st.adegan !== "susunan";
    if (st.adegan === "susunan") { const k = tataKomponen(st.p.n_lance); q1("[data-chip-komp]").innerHTML = htmlChipKomponen(k, st.pilih); q1("[data-kartu-komp]").innerHTML = htmlKartuKomponen(st.pilih, k); }
    adegan?.atur(st.adegan, {hasil, p: {...st.p}, kompleks: st.kompleks});
  }

  /* kontrol: kotak angka dan penggeser saling sinkron; yang di luar rentang ditolak dengan alasan, bukan dipotong diam-diam */
  function ubah(k, nilai, dariKotak) {
    const def = KONTROL.find(x => x[0] === k), [, label, satuan, , , , kmn, kmx] = def;
    if (!Number.isFinite(nilai)) return;
    if (k === "n_lance" && !Number.isInteger(nilai)) { salah(k, `${label} harus bilangan bulat`); return; }
    if (k === "dalam_m") { try { cekKedalaman(nilai); } catch (e) { salah(k, e.message); return; } }
    if (nilai < kmn || nilai > kmx) { salah(k, `${label} diisi antara ${fmt(kmn)} dan ${fmt(kmx)} ${satuan}`); return; }
    salah(k, ""); st.p[k] = nilai;
    const r = q1(`[data-k="${k}"]`), n = q1(`[data-kn="${k}"]`);
    if (dariKotak) r.value = nilai; else n.value = nilai;
    q1(`[data-nilai="${k}"]`).textContent = `${fmt(nilai)} ${satuan}`;
    if (k === "dalam_m") q1(`[data-nilai="${k}"]`).textContent += nilai >= KONST.dalam_uji_m ? ", lengan uji" : "";
    jadwalkan();
  }
  akar.addEventListener("input", e => {
    const r = e.target.closest("[data-k]"), n = e.target.closest("[data-kn]");
    if (r) ubah(r.dataset.k, r.valueAsNumber, false); else if (n) ubah(n.dataset.kn, n.valueAsNumber, true);
  }, {signal: sinyal});

  /* radiogroup (aria-checked): chrome seketika, adegan sesudah satu frame */
  const grupRadio = (sel, aksi) => {
    const g = akar.querySelector(sel); if (!g) return;
    const pilihRadio = b => { g.querySelectorAll("[role=radio]").forEach(x => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; }); aksi(b); };
    g.addEventListener("click", e => { const b = e.target.closest("[role=radio]"); if (b && b.getAttribute("aria-checked") !== "true") pilihRadio(b); }, {signal: sinyal});
    g.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const bs = [...g.querySelectorAll("[role=radio]")], i = bs.findIndex(x => x.getAttribute("aria-checked") === "true"), n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
      e.preventDefault(); n.focus(); pilihRadio(n);
    }, {signal: sinyal});
  };
  grupRadio(".sp-3d-atas .ad-seg", b => { st.adegan = b.dataset.adegan; setLabel("anim", ""); setLabel("skala", ""); jadwalkan(); });
  grupRadio("[data-form] .ad-seg", b => { st.p.dn_mm = +b.dataset.dn; jadwalkan(); });

  /* komponen: chip dan klik kanvas; kartu info berubah di handler (murah), pewarnaan 3D lewat jadwalkan */
  const pilihKomponen = id => { st.pilih = id; jadwalkan(); };
  q1("[data-chip-komp]").addEventListener("click", e => { const b = e.target.closest("[data-komp]"); if (!b) return; q1("[data-chip-komp]").querySelectorAll(".ad-chip").forEach(x => x.setAttribute("aria-pressed", String(x === b))); st.pilih = b.dataset.komp; q1("[data-kartu-komp]").innerHTML = htmlKartuKomponen(st.pilih, tataKomponen(st.p.n_lance)); nanti(() => adegan?.pilih(st.pilih)); }, {signal: sinyal});

  /* kamera dan animasi */
  q1(".sp-3d-kamera").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.kam) return adegan?.kamera(t.dataset.kam);
    if (t.hasAttribute("data-anim")) { st.anim = !st.anim; t.setAttribute("aria-pressed", String(st.anim)); t.textContent = st.anim ? "Jeda animasi" : "Putar animasi"; adegan?.animasi(st.anim); }
  }, {signal: sinyal});

  /* kompleks: pilih dari daftar (tulis id), terapkan panjang, Δz, dan elevasi trase dari kelayakan_kompleks */
  const infoKompleks = () => {
    const e = q1("[data-kompleks-info]"), k = st.kompleks;
    if (!k) { e.replaceChildren(); return; }
    const d = dariKompleks(k);
    e.innerHTML = `<b>${esc(k.id)}</b>, ${esc(k.kab || "kabupaten tidak tercatat")}. ${d ? `Air terdekat ${esc(fmt(d.air_km))} km ${pil("Terverifikasi", "terverifikasi", "OSM, jarak garis lurus dari kendala.json")}, panjang trase ${esc(fmt(d.L_m))} m = jarak x ${esc(fmt(KONST.liku_trase))} ${pil("Estimasi model")}.` : "Jarak air tidak tersedia."} ${d?.dz_m != null ? `Beda elevasi ${esc(fmt(d.dz_m))} m ${pil("DSM berkanopi, ilustrasi", "estimasi-model", "GLO-30 berkanopi sampai DEMNAS tiba")}.` : ""}`;
  };
  const terapkanKompleks = k => {
    st.kompleks = k; salah("kompleks", "");
    const u = new URL(location.href); k ? u.searchParams.set("kompleks", k.id) : u.searchParams.delete("kompleks"); history.replaceState(null, "", u);
    if (k) { const d = dariKompleks(k); if (d) { ubah("L_m", d.L_m, false); if (d.dz_m != null) ubah("dz_m", Math.round(d.dz_m * 10) / 10, false); } }
    infoKompleks(); jadwalkan();
  };
  q1("#sa-kompleks-i").addEventListener("change", e => {
    const v = e.target.value.trim().toUpperCase();
    if (!v) return terapkanKompleks(null);
    const k = st.daftar?.get(v);
    if (!k) return salah("kompleks", `Kompleks ${v} tidak ada di provinsi ini. Pilih dari daftar, contoh K0001.`);
    terapkanKompleks(k);
  }, {signal: sinyal});

  /* muat three dan data kompleks secara paralel; keduanya tidak menahan angka pertama */
  segarkan();
  const muatKompleks = async () => {
    const kolom = q1("#sa-kompleks-i");
    try {
      const j = await konteks.ambil("/api/sippa/data/kelayakan_kompleks", sinyal);
      if (sinyal.aborted) return;
      const baris = (j.kompleks || []).filter(k => !konteks.prov || k.prov === konteks.prov);
      st.daftar = new Map(baris.map(k => [k.id, k]));
      nanti(() => {
        if (sinyal.aborted) return;
        q1("#sa-kompleks-d").replaceChildren(...baris.map(k => { const o = document.createElement("option"); o.value = k.id; o.label = k.kab || ""; return o; }));
        kolom.disabled = false;
        if (idAwal && st.daftar.has(idAwal)) terapkanKompleks(st.daftar.get(idAwal)); else if (idAwal) salah("kompleks", `Kompleks ${idAwal} tidak ada di provinsi ini.`);
        if (j.per) konteks.setPer?.(Date.parse(j.per + "T00:00:00+07:00"));
      });
    } catch (e) {
      if (sinyal.aborted || e.name === "AbortError") return;
      if (e.status == null) console.error(e);
      q1("[data-kompleks-info]").replaceChildren(e.status === 404 ? menunggu("Data kompleks belum terbit; simulasi memakai masukan manual") : galat(e.status ?? 0, e.status === 0 ? "Tidak bisa terhubung ke server." : e.message, muatKompleks));
    }
  };
  muatKompleks();

  try {
    const a = await buatAdegan(wadah, {animasiAwal: st.anim, onPilih: pilihKomponen, onLabel: setLabel});
    if (sinyal.aborted) { a.lepas(); return; }
    adegan = a;
    if (!a.webgl) akar.querySelector(".sp-3d-kamera").hidden = true;
    segarkan();
  } catch (e) {
    if (sinyal.aborted) return;
    console.error(e); wadah.replaceChildren(galat(0, PILIHAN_GAGAL, () => pasang(akar, konteks)));
  }
}
