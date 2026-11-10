/* Siklus Bencana F2: Peta Paparan (DS 3.4). Membaca agregat dari /api/siklus/paparan/{ringkas,kab,rinci} (kontrak DESAIN-TEKNIS 4 dan 5.2.2 sampai 5.2.4); rincian per bangunan tidak pernah ada di public/.
   Peta penuh, panel kiri bisa ditarik (pola index.html). Keterbatasan ditulis: ambang bangunan, galat posisi, kelas InaRISK tidak resmi. Provinsi tanpa grid = "tidak terliput", bukan 0.
   Ganti provinsi, kabupaten, bahaya, atau kelas: chrome urgent (inti.js seg dan pilihan), isi lewat nanti(); respons lambat dari pilihan lama dibuang (penjaga). */
import {h, ik, K, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, pilihan, tombol, toast, pil, nilai, tip, namaKab, namaProv, angka, peran, penjaga, selisihAntarsumber} from "./inti.js";
import {muatMapLibre} from "../inti/maplibre.js";

const G = globalThis, LEBAR_MIN = 320, LEBAR_MAKS = 640, KUNCI_LEBAR = "sk-panel-lebar";
const BAHAYA = [["banjir", "Banjir", "banjir"], ["gempa", "Gempa", "gempa"], ["gunungapi", "Gunung api", "gunung"], ["karhutla", "Karhutla", "api"], ["pesisir", "Pesisir", "cuaca"]];
const KELAS = [["semua", "Semua kelas", "semua"], ["sedang", "Sedang", "segitiga"], ["tinggi", "Tinggi", "api"]];
const SUMBER_JIWA = [["worldpop", "WorldPop"], ["dukcapil", "Dukcapil"], ["ghsl", "GHSL"]];
const FASILITAS = {sekolah: "Sekolah", madrasah: "Madrasah", kesehatan: "Fasilitas kesehatan", ibadah: "Tempat ibadah", kantor_pemerintah: "Kantor pemerintah", kantor_pemerintah_sipil: "Kantor pemerintah sipil", obvitnas: "Objek vital nasional", bandara: "Bandara", pelabuhan: "Pelabuhan"};
const ambang = () => (typeof KONST !== "undefined" ? KONST.AMBANG_BANGUNAN : 0.7), batas = () => (typeof KONST !== "undefined" ? KONST.BATAS_INARISK : [0.33, 0.66]);
const koma = n => Number(n).toFixed(2).replace(".", ",");
/* angka bisa polos atau {n, y, t} (5.2.1); null tetap null */
const nilaiN = x => x && typeof x === "object" ? (x.n ?? null) : (x ?? null);
const jumlahAda = (larik) => { const a = larik.filter(v => v != null); return a.length ? a.reduce((s, v) => s + v, 0) : null; };
export const kelasDipilih = k => k === "semua" ? ["rendah", "sedang", "tinggi"] : [k];
/* agregat satu bahaya untuk kelas terpilih: penjumlahan hanya antar KELAS dari sumber yang sama; antar sumber jiwa tidak dijumlah */
export function agregat(bahaya, kelas) {
  const ada = kelasDipilih(kelas).map(k => bahaya?.kelas?.[k]).filter(Boolean);
  if (!ada.length) return null;
  return {bangunan: jumlahAda(ada.map(k => nilaiN(k.bangunan))), luas: jumlahAda(ada.map(k => nilaiN(k.luas_m2))), jiwa: Object.fromEntries(SUMBER_JIWA.map(([s]) => [s, jumlahAda(ada.map(k => nilaiN(k.jiwa?.[s])))]))};
}
/* token warna -> "rgb(r, g, b)" untuk MapLibre (tidak membaca oklch); tanpa hex literal */
function warnaToken(nama) {
  const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d");
  x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(nama).trim() || "gray"; x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${g}, ${b})`;
}

export async function buka(isi, sk) {
  const main = isi.closest("main"); main.classList.add("peta"); isi.className = "sk-petabg"; isi.replaceChildren();
  if (!document.querySelector('link[href="/inti/peta.css"]')) document.head.append(h("link", {rel: "stylesheet", href: "/inti/peta.css"}));
  const q = new URLSearchParams(location.search), awal = /^\d{4}$/.test(q.get("kab4") ?? "") ? q.get("kab4") : "";
  const S = {prov: awal.slice(0, 2), kab4: awal, bahaya: "banjir", kelas: "semua"}, pj = penjaga(), cache = {ringkas: new Map(), kab: new Map()};
  const P = await peran();
  sk.periode = () => ({kab4: S.kab4 || null, prov: S.prov || null, bahaya: S.bahaya});

  const peta = h("div", {id: "peta", class: "sk-petabg"}), isiPanel = h("div", {class: "panel-isi"}), tarik = h("div", {class: "tarik", role: "separator", "aria-orientation": "vertical", "aria-label": "Tarik untuk mengubah lebar panel", tabindex: 0}), tarikV = h("div", {class: "tarik-v", role: "separator", "aria-orientation": "horizontal", "aria-label": "Tarik atau ketuk untuk mengubah tinggi panel"});
  const panel = h("div", {class: "panel"}, isiPanel, tarik, tarikV);
  isi.append(peta, panel); pasangTarik(main, panel, tarik, tarikV);
  let mapa = null; nantiPeta(peta).then(m => { mapa = m; }).catch(() => { peta.append(h("div", {class: "sk-kead", "data-k": "galat"}, h("p", {}, "Peta dasar belum bisa dimuat. Angka di panel tetap tersedia."))); });

  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"});
  const utama = kartu({ey: [ik("bangunan", 12), "Paparan"], id: "p-utama", judul: ["Paparan ", hl("menunggu"), " pilihan wilayah"], isi: [ctl, hasil]}), judul = utama.querySelector("h3");
  isiPanel.append(utama);

  async function ringkas(prov) {
    if (cache.ringkas.has(prov)) return cache.ringkas.get(prov);
    const r = await api(`/api/siklus/paparan/ringkas?prov=${encodeURIComponent(prov)}`); if (r.ok) cache.ringkas.set(prov, r); return r;
  }
  async function detailKab(kab4) {
    if (cache.kab.has(kab4)) return cache.kab.get(kab4);
    const r = await api(`/api/siklus/paparan/kab?kab4=${encodeURIComponent(kab4)}`); if (r.ok) cache.kab.set(kab4, r); return r;
  }
  const kontrol = (kabList = []) => {
    const optProv = [["", "Pilih provinsi"], ...Object.keys(K.provinsi || {}).map(k => [k, namaProv(k)])];
    const optKab = [["", S.prov ? "Seluruh provinsi" : "Pilih provinsi dulu"], ...kabList.map(k => [k, namaKab(k)])];
    ctl.replaceChildren(h("div", {class: "sk-baris"}, pilihan(optProv, S.prov, v => { S.prov = v; S.kab4 = ""; muat(); }, "Provinsi"), pilihan(optKab, S.kab4, v => { S.kab4 = v; muat(); }, "Kabupaten atau kota")),
      seg(BAHAYA, S.bahaya, v => { S.bahaya = v; muat(); }, "Jenis bahaya"), seg(KELAS, S.kelas, v => { S.kelas = v; muat(); }, "Kelas bahaya"));
  };

  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    if (!S.prov) { kontrol(); judul.replaceChildren("Pilih provinsi untuk melihat ", hl("paparan"), " bangunan dan jiwa"); return kosongkan(hasil).append(kead("kosong", {teks: "Pilih provinsi dan kabupaten. Angka paparan dihitung dari grid bangunan dan peta bahaya."})); }
    const [rp, rk] = await Promise.all([ringkas(S.prov), S.kab4 ? detailKab(S.kab4) : null]);
    if (!pj.terbaru(n)) return;   // respons lambat dari pilihan lama dibuang
    if (!rp.ok) { kontrol(); judul.replaceChildren("Paparan ", hl("belum bisa dimuat")); return kosongkan(hasil).append(kead_dari(rp, muat, "Paparan provinsi ini belum dibangun")); }
    const kabList = Object.keys(rp.j?.kab ?? {}).sort(); kontrol(kabList);
    if (rp.j?.terliput === false) { judul.replaceChildren("Provinsi ini ", hl("tidak terliput"), " grid bangunan"); return kosongkan(hasil).append(kead("kosong", {teks: "Tidak terliput: grid bangunan provinsi ini belum tersedia, jadi jumlahnya tidak ditulis sebagai 0."}), pil("menunggu", {ditunggu: "grid bangunan provinsi"}), keterbatasan()); }
    if (!S.kab4) return gambarProvinsi(rp.j, n);
    if (!rk?.ok) { judul.replaceChildren("Paparan kabupaten ini ", hl("belum bisa dimuat")); return kosongkan(hasil).append(kead_dari(rk, muat, "Paparan kabupaten ini belum dibangun")); }
    gambarKab(rp.j, rk.j);
  }

  function keterbatasan() {
    const [a, b] = batas();
    return wadah("Keterbatasan", para(`Bangunan dihitung bila keyakinan deteksi di atas ${koma(ambang())}. Posisi bangunan punya galat sekitar 0,8 km (setengah diagonal sel 0,01 derajat). Kelas bahaya memakai batas ${koma(a)} dan ${koma(b)} yang kita pilih sendiri karena sumber resmi batasnya tidak ditemukan; kelas InaRISK di sini bukan klasifikasi resmi.`), pil("asumsi-kebijakan", {asumsi: "batas 0,33 dan 0,66, sumber resmi batas tidak ditemukan"}));
  }
  function gambarProvinsi(rp, n) {
    const baris = Object.entries(rp.kab || {}).map(([k, v]) => ({k, b: nilaiN(v.bangunan), jiwa: nilaiN(v.jiwa?.dukcapil)})).sort((x, y) => (y.b ?? -1) - (x.b ?? -1)).slice(0, 10);
    judul.replaceChildren(hl(angka(jumlahAda(Object.values(rp.kab || {}).map(v => nilaiN(v.bangunan))) ?? 0) ?? "tidak ada"), " bangunan terdeteksi di ", namaProv(S.prov), ", pilih kabupaten untuk paparan per zona bahaya");
    const t = h("tbody", {}, baris.map(x => { const tr = h("tr", {class: "klik"}, h("td", {}, namaKab(x.k)), h("td", {class: "n"}, nilai(x.b, "estimasi-model", {x: "ambang " + koma(ambang())})), h("td", {class: "n"}, nilai(x.jiwa, "resmi", {sumber: "Dukcapil"})));
      tr.addEventListener("click", () => { S.kab4 = x.k; tr.setAttribute("aria-current", "true"); G.nanti(muat); }); return tr; }));
    kosongkan(hasil).append(h("div", {class: "tw ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {title: "Kabupaten atau kota menurut kode BPS"}, "Kabupaten teratas"), h("th", {title: `Jumlah bangunan terdeteksi, keyakinan di atas ${koma(ambang())}`}, "Bangunan"), h("th", {title: "Jiwa menurut Dukcapil, berdiri sendiri"}, "Jiwa Dukcapil"))), t)), keterbatasan());
  }
  function gambarKab(rp, kb) {
    const bh = kb.bahaya?.[S.bahaya], a = agregat(bh, S.kelas), nm = BAHAYA.find(x => x[0] === S.bahaya)?.[1] ?? S.bahaya, nk = KELAS.find(x => x[0] === S.kelas)?.[1].toLowerCase() ?? S.kelas;
    judul.replaceChildren(...(a && a.bangunan != null ? [hl(angka(a.bangunan)), " bangunan berada di zona ", nm.toLowerCase(), ", ", nk] : ["Paparan ", nm.toLowerCase(), " di ", namaKab(S.kab4), " ", hl("menunggu"), " data"]));
    const kartuBh = a ? wadah("Bangunan di zona bahaya", h("div", {class: "tw ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {title: "Kelas bahaya menurut batas kita sendiri, bukan klasifikasi resmi"}, "Kelas"), h("th", {title: `Bangunan terdeteksi dengan keyakinan di atas ${koma(ambang())}`}, "Bangunan"), h("th", {title: "Luas jejak bangunan dalam meter persegi"}, "Luas jejak (m2)"))),
      h("tbody", {}, kelasDipilih(S.kelas).filter(k => bh?.kelas?.[k]).map(k => h("tr", {}, h("td", {}, K.kelas?.[k] ?? k), h("td", {class: "n"}, nilai(nilaiN(bh.kelas[k].bangunan), "estimasi-model", {x: "ambang " + koma(ambang())})), h("td", {class: "n"}, nilai(nilaiN(bh.kelas[k].luas_m2), "estimasi-model"))))))))
      : kead("kosong", {teks: `Belum ada pembacaan ${nm.toLowerCase()} untuk kabupaten ini`});
    const per = Object.fromEntries(SUMBER_JIWA.map(([s, l]) => [l, a?.jiwa?.[s] ?? null])), sel = selisihAntarsumber(per);
    const jiwa = wadah("Jiwa di zona yang sama, tiga sumber berdampingan", h("div", {class: "sk-ber"}, SUMBER_JIWA.map(([s, l]) => h("div", {}, h("small", {}, l), h("b", {}, angka(a?.jiwa?.[s]) ?? "tidak ada"), pil(a?.jiwa?.[s] == null ? "menunggu" : "estimasi-model", {x: "sumber jiwa " + l}))),
      h("div", {class: "sk-sel"}, SUMBER_JIWA.map(([s, l]) => `${l} ${angka(a?.jiwa?.[s]) ?? "tidak ada"}`).join(", ") + (sel.selisih == null ? ", selisih tidak ada karena kurang dari dua sumber melapor" : `, selisih ${angka(sel.selisih)}`))));
    const fas = Object.entries(kb.fasilitas_hitung || {});
    const fasil = wadah("Fasilitas vital di kabupaten", fas.length ? h("div", {class: "tw ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {title: "Kategori fasilitas menurut InaRISK"}, "Kategori"), h("th", {title: "Jumlah fasilitas terpetakan, estimasi dari OSM dan sumber terbuka"}, "Jumlah"))),
      h("tbody", {}, fas.map(([k, v]) => h("tr", {}, h("td", {}, FASILITAS[k] ?? k.replaceAll("_", " ")), h("td", {class: "n"}, nilai(nilaiN(v), "estimasi-model", {x: "peta terbuka"}))))))) : kead("kosong", {teks: "Belum ada hitungan fasilitas vital"}));
    const desa = Object.entries(rp.kab?.[S.kab4]?.desa || {}).sort((x, y) => (y[1][0] ?? -1) - (x[1][0] ?? -1)).slice(0, 10);
    const dTab = wadah("Desa teratas menurut jumlah bangunan", desa.length ? h("div", {class: "tw ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {title: "Kode desa menurut Kemendagri"}, "Desa"), h("th", {title: "Bangunan terdeteksi"}, "Bangunan"), h("th", {title: "Luas jejak bangunan, meter persegi"}, "Luas (m2)"), h("th", {title: "Jiwa menurut Dukcapil"}, "Jiwa"))),
      h("tbody", {}, desa.map(([kode, v]) => h("tr", {}, h("td", {}, kode), h("td", {class: "n"}, angka(v[0]) ?? "tidak ada"), h("td", {class: "n"}, angka(v[1]) ?? "tidak ada"), h("td", {class: "n"}, angka(v[2]) ?? "tidak ada")))))) : kead("kosong", {teks: "Agregat per desa belum tersedia untuk kabupaten ini"}));
    const ada = kelasDipilih(S.kelas).filter(k => bh?.kelas?.[k]);
    const leg = h("div", {class: "ex-leg"}, ada.map(k => { const i = h("i"); i.style.background = `var(--f${k === "rendah" ? 0 : k === "sedang" ? 1 : 3})`; return h("span", {}, i, K.kelas?.[k] ?? k); }));
    const rinci = P.pd ? tombol("Tampilkan sel 110 m di peta", "biasa", () => tampilRinci(), "peta", "Muat rincian per sel 110 m untuk kabupaten ini (dicatat)") : para("Rincian per sel hanya untuk Pusdalops, Koordalops, dan Super Admin.");
    kosongkan(hasil).append(kartuBh, ada.length ? leg : null, jiwa, fasil, dTab, keterbatasan(), rinci);
  }
  async function tampilRinci() {
    if (!S.kab4) return;
    const r = await api(`/api/siklus/paparan/rinci?kab4=${encodeURIComponent(S.kab4)}`);
    if (!r.ok) return toast(r.j?.galat || "Rincian belum bisa dimuat");
    if (!mapa) return toast("Peta dasar belum siap");
    const k = r.j.kolom, ix = Object.fromEntries(k.map((c, i) => [c, i])), kunciKelas = v => (typeof v === "number" ? ["rendah", "sedang", "tinggi"][v - 1] : v) ?? null;
    const warna = {rendah: warnaToken("--f0"), sedang: warnaToken("--f1"), tinggi: warnaToken("--f3")}, abu = warnaToken("--ink2");
    const fitur = r.j.baris.slice(0, 20000).map(b => ({type: "Feature", geometry: {type: "Point", coordinates: [b[ix.lon], b[ix.lat]]}, properties: {warna: warna[kunciKelas(b[ix[S.bahaya]])] ?? abu, n: b[ix.n]}}));
    const data = {type: "FeatureCollection", features: fitur};
    if (mapa.getSource("rinci")) mapa.getSource("rinci").setData(data);
    else { mapa.addSource("rinci", {type: "geojson", data}); mapa.addLayer({id: "rinci", type: "circle", source: "rinci", paint: {"circle-radius": 4, "circle-color": ["get", "warna"], "circle-opacity": 0.75}}); }
    if (fitur.length) { const xs = fitur.map(f => f.geometry.coordinates[0]), ys = fitur.map(f => f.geometry.coordinates[1]); mapa.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {padding: 60, maxZoom: 13}); }
    toast(`${angka(fitur.length)} sel ditampilkan`);
  }

  kontrol(); muat();
}

/* peta dasar dibuat sekali; ganti zona tidak membuat ulang peta */
async function nantiPeta(wadah) {
  await muatMapLibre();
  const gelap = document.documentElement.dataset.theme === "dark";
  return new G.maplibregl.Map({container: wadah, style: `https://tiles.openfreemap.org/styles/${gelap ? "dark" : "positron"}`, bounds: [[94.8, -11.2], [141.2, 6.2]], attributionControl: {compact: true}});
}

/* pegangan tarik: lebar 320 sampai 640 px diingat; pointermove + requestAnimationFrame, tidak menyentuh tabel. Di bawah 900 px: tinggi lembar bawah, ketuk = ciut */
function pasangTarik(main, panel, h1, h2) {
  const simpan = w => { main.style.setProperty("--sk-lebar", w + "px"); try { localStorage.setItem(KUNCI_LEBAR, String(Math.round(w))); } catch (e) { /* abaikan */ } };
  try { const w = Number(localStorage.getItem(KUNCI_LEBAR)); if (w >= LEBAR_MIN && w <= LEBAR_MAKS) main.style.setProperty("--sk-lebar", w + "px"); } catch (e) { /* abaikan */ }
  const seret = (el, hitung, ketuk) => {
    let id = 0, x0 = 0, y0 = 0, jauh = false;
    el.addEventListener("pointerdown", e => { el.setPointerCapture(e.pointerId); el.classList.add("aktif"); x0 = e.clientX; y0 = e.clientY; jauh = false; e.preventDefault(); });
    el.addEventListener("pointermove", e => { if (!el.classList.contains("aktif")) return; if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 4) jauh = true; cancelAnimationFrame(id); id = requestAnimationFrame(() => hitung(e)); });
    const lepas = e => { el.classList.remove("aktif"); cancelAnimationFrame(id); if (e.type === "pointerup" && !jauh) ketuk?.(); };
    el.addEventListener("pointerup", lepas); el.addEventListener("pointercancel", lepas);
  };
  seret(h1, e => simpan(Math.max(LEBAR_MIN, Math.min(LEBAR_MAKS, e.clientX - panel.getBoundingClientRect().left))));
  h1.addEventListener("keydown", e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") simpan(Math.max(LEBAR_MIN, Math.min(LEBAR_MAKS, panel.offsetWidth + (e.key === "ArrowRight" ? 24 : -24)))); });
  seret(h2, e => { panel.classList.remove("min"); panel.style.height = Math.max(96, Math.min(innerHeight * 0.85, innerHeight - e.clientY)) + "px"; }, () => panel.classList.toggle("min"));
}
