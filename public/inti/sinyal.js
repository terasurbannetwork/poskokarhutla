"use strict";
/* inti/sinyal.js (PB-81.2, F-41, Lifeline D6, AGENTS.md 2.19): kartu "Sinyal komunikasi" bersama untuk tab Dampak bencana selain karhutla
   (karhutla tetap memakai public/sinyal.js sendiri sampai PB-80). Data public/data/menara.json (OpenCelliD) dan public/data/internet_padam.json (IODA), dibaca apa adanya.
   Hanya konteks PROVINSI: tidak pernah warna atau usulan per kab/kota. Padam internet = proksi akses komunikasi, bukan bukti seluler atau listrik mati.
   Digerbangi kemampuan.layar.sinyal di /bencana.json. Pemakaian: SinyalInti.pasang(wadah, {id: "gempa", prov: () => kode|nama|[kode urut prioritas]|{kode: paparan}|null}).
   Tanpa petunjuk, provinsi diambil dari paparan terbesar data dampak halaman (PAPARAN per id); baru bila itu pun kosong jatuh ke provinsi dengan padam terbaru. */
(() => {
const nf = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0});
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const n0 = v => Number.isFinite(v) ? nf.format(v) : "–";
const tgl = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–"; };
/* kode provinsi -> nama, mengikuti kode geo/kabupaten/<kode>.json repo (93 Papua Selatan, 94 Papua Tengah, 95 Papua Pegunungan, 96 Papua Barat Daya) */
const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Bangka Belitung", "21": "Kepulauan Riau",
  "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "NTB", "53": "NTT", "61": "Kalimantan Barat", "62": "Kalimantan Tengah",
  "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
  "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
const nama = k => PROV[k] || `Provinsi ${k}`;

/* ---------- model murni (diuji di tests/layar/pb_sinyal.test.mjs) ---------- */
/* dibulatkan kasar: hasil patungan pengguna, bukan sensus */
const bulat = v => !Number.isFinite(v) ? NaN : v >= 1000 ? Math.round(v / 100) * 100 : v >= 100 ? Math.round(v / 10) * 10 : v;
const izinReg = (daftar, id) => id !== "karhutla" && (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.sinyal === true;
/* daftar provinsi yang punya data menara atau padam, urut nama */
const daftarProv = (m, p) => [...new Set([...Object.keys(m?.menara_per_provinsi || {}), ...(p?.peristiwa || []).map(e => e.prov)])].sort((a, b) => nama(a).localeCompare(nama(b), "id"));
/* nama provinsi (juga nama panjang dari data bencana) -> kode */
const SEBUT = {"nusa tenggara barat": "52", "nusa tenggara timur": "53", "kepulauan bangka belitung": "19", "bangka belitung": "19", "daerah istimewa yogyakarta": "34", "yogyakarta": "34", "jakarta": "31", "dki jakarta": "31", "riau kepulauan": "21"};
const normal = t => String(t).toLowerCase().replace(/^provinsi\s+/, "").replace(/\s+/g, " ").trim();
const keKode = x => { if (x == null || x === "") return null; const t = String(x).trim(); if (/^\d{2}$/.test(t)) return t;
  const n = normal(t); if (SEBUT[n]) return SEBUT[n]; const k = Object.keys(PROV).find(c => normal(PROV[c]) === n); return k || null; };
/* petunjuk halaman: kode atau nama provinsi, deret urut prioritas (yang pertama punya data menang), atau peta {kode/nama: paparan} (paparan terbesar menang) */
const dariPetunjuk = (petunjuk, d) => { if (petunjuk == null) return null; const ada = k => k && d.includes(k);
  if (Array.isArray(petunjuk)) return petunjuk.map(keKode).find(ada) || null;
  if (typeof petunjuk === "object") { const jml = {}; for (const [k, v] of Object.entries(petunjuk)) { const c = keKode(k), n = typeof v === "object" && v ? +(v.jiwa ?? v.penduduk ?? v.nilai ?? 0) : +v; if (ada(c) && Number.isFinite(n)) jml[c] = (jml[c] || 0) + n; }
    return Object.entries(jml).sort((a, b) => b[1] - a[1])[0]?.[0] || null; }
  const c = keKode(petunjuk); return ada(c) ? c : null; };
/* provinsi awal: petunjuk halaman bila ada datanya, jika tidak provinsi dengan padam terbaru, jika tidak yang pertama */
const awal = (m, p, petunjuk) => { const d = daftarProv(m, p), k = dariPetunjuk(petunjuk, d); if (k) return k;
  const e = [...(p?.peristiwa || [])].sort((a, b) => b.mulai - a.mulai)[0]; return e ? e.prov : d[0] || null; };
/* adaptor bawaan: provinsi dengan paparan terbesar dari data dampak halaman, untuk halaman yang tidak memberi petunjuk sendiri.
   Hasilnya peta {kode/nama provinsi: jiwa}; berkas sama dengan yang dibaca dampak.js halaman itu (muatJSON memakai cache). */
const PAPARAN = {
  gunungapi: {url: "../banjir/data/dampak_gunungapi.json", pilih: j => { const r = {}; for (const g of j?.terpapar?.daftar || []) if (g.prov) r[g.prov] = (r[g.prov] || 0) + (+g.jiwa || 0); return r; }},
  cuaca: {url: "../banjir/data/cuaca_dampak.json", pilih: j => { const T = j?.terpapar || {}, kini = T[j?.hari_ini]?.prov; if (kini && Object.keys(kini).length) return kini;
    const r = {}; for (const h of Object.values(T)) for (const [k, v] of Object.entries(h?.prov || {})) r[k] = (r[k] || 0) + (+v?.penduduk || 0); return r; }},
};
const paparan = async id => { const a = PAPARAN[id]; if (!a) return null;
  try { const j = await (typeof muatJSON === "function" ? muatJSON(a.url) : fetch(a.url).then(r => r.ok ? r.json() : null)); return j ? a.pilih(j) : null; } catch (e) { return null; } };
/* ringkasan satu provinsi: sel tercatat, peringkat di antara provinsi, peristiwa padam, total jam, peristiwa terbaru dulu */
const ringkas = (m, p, k) => { const mp = m?.menara_per_provinsi || {}, sel = mp[k], urut = Object.values(mp).sort((a, b) => b - a);
  const ev = (p?.peristiwa || []).filter(e => e.prov === k).sort((a, b) => b.mulai - a.mulai);
  return {sel: Number.isFinite(sel) ? sel : null, peringkat: Number.isFinite(sel) ? urut.indexOf(sel) + 1 : null, dari: urut.length, n: ev.length, jam: ev.reduce((s, e) => s + (e.jam || 0), 0), ev, sepi: Number.isFinite(sel) && sel < 20}; };

/* ---------- tampilan ---------- */
const IKON = "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01";
const tabel = (kepala, baris) => `<div class="tw ex-tabel"><table><thead><tr>${kepala.map((k, i) => { const [t, ti] = Array.isArray(k) ? k : [k, ""]; return `<th${i ? ' class="n"' : ""}${ti ? ` title="${esc(ti)}"` : ""}>${t}</th>`; }).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const kartu = (m, p, k) => { const r = ringkas(m, p, k), pil = daftarProv(m, p);
  const sel = `<select data-sy-prov aria-label="Provinsi">${pil.map(x => `<option value="${esc(x)}"${x === k ? " selected" : ""}>${esc(nama(x))}</option>`).join("")}</select>`;
  const ring = tabel(["Ukuran", ["Nilai", "Jumlah sel mengukur kepadatan pengamatan pengguna OpenCelliD, bukan jumlah menara sebenarnya"]], [
    ["Sel seluler tercatat (OpenCelliD, dibulatkan)", r.sel == null ? "tidak tercatat" : n0(bulat(r.sel))],
    ["Peringkat sel tercatat antarprovinsi", r.peringkat ? `${n0(r.peringkat)} dari ${n0(r.dari)}` : "–"],
    [`Peristiwa padam internet sejak ${tgl(p?.dari)}`, n0(r.n)],
    ["Jumlah jam padam", n0(r.jam)]]);
  const ev = r.ev.slice(0, 6), evt = ev.length ? tabel(["Tanggal", ["Lama (jam)", "Padam = blok jaringan /24 yang tak menjawab ping (IODA), bukan bukti listrik atau seluler mati"], "Turun hingga (%)"], ev.map(e => [tgl(e.tanggal), n0(e.jam), Number.isFinite(e.turun_maks) ? n0(Math.round(e.turun_maks * 100)) : "–"])) : `<p class="sy-cat">Tidak ada peristiwa padam internet tercatat untuk ${esc(nama(k))} pada rentang data.</p>`;
  return `<section class="ex ex-std" data-sy-kartu><header class="ex-hd"><span class="ex-ey">Akses komunikasi</span><div class="ex-jd"><h3 title="Sumber: OpenCelliD (CC-BY-SA 4.0), IODA Georgia Tech, data s.d. ${esc(tgl(p?.sampai))}">Sinyal komunikasi, ${esc(nama(k))}</h3>${sel}</div></header>
    <div class="ex-bd"><p class="sy-ket">Konteks tingkat provinsi, proksi akses komunikasi dan bukan bukti seluler mati. Data belum tersedia per kabupaten/kota.</p>${ring}${evt}${r.sepi ? `<p class="sy-cat">${esc(nama(k))} punya kurang dari 20 sel tercatat: angka mengukur kepadatan pengamatan pengguna, bukan jumlah menara.</p>` : ""}</div></section>`; };
const bungkus = isi => `<section class="dk-bag" id="dk-sinyal" data-bag="sinyal"><header class="dk-sh" style="--w:var(--brand2)"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON}"/></svg><h2>Sinyal komunikasi</h2></header><div class="dk-kartu">${isi}</div></section>`;

let REG = null, DATA = null, gen = 0;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
const ambil = () => DATA ||= Promise.all(["../data/menara.json", "../data/internet_padam.json"].map(u => typeof muatJSON === "function" ? muatJSON(u) : fetch(u).then(r => r.json()))).catch(e => { DATA = null; throw e; });
/* memasang kartu di akhir wadah bila registri mengizinkan; gagal apa pun = tidak tampil (A18) */
async function pasang(wadah, o = {}) {
  if (!wadah) return; const id = ++gen;
  wadah.querySelector("#dk-sinyal")?.remove();
  try {
    if (!izinReg(await registri(), o.id)) return;
    const [m, p] = await ambil(); if (id !== gen || !wadah.isConnected) return;
    let petunjuk = null; try { petunjuk = await o.prov?.(); } catch (e) { /* petunjuk opsional */ }
    if (!dariPetunjuk(petunjuk, daftarProv(m, p))) { const pp = await paparan(o.id); if (id !== gen || !wadah.isConnected) return; if (pp) petunjuk = pp; }
    const k = awal(m, p, petunjuk); if (!k) return;
    wadah.querySelector("#dk-sinyal")?.remove(); wadah.insertAdjacentHTML("beforeend", bungkus(kartu(m, p, k)));
    const s = wadah.querySelector("#dk-sinyal"); s.addEventListener("change", e => { const sel = e.target.closest("[data-sy-prov]"); if (!sel) return;
      const t = () => { s.querySelector(".dk-kartu").innerHTML = kartu(m, p, sel.value); }; typeof nanti === "function" ? nanti(t) : t(); });
  } catch (e) { /* data belum ada: kartu tidak tampil */ }
}
window.SinyalInti = {pasang, model: {izinReg, daftarProv, awal, dariPetunjuk, keKode, PAPARAN, ringkas, bulat, nama, kartu, bungkus}};
})();
