/* insiden_kaya.js — tiket IK-09 dan IK-10 (paket data/kajian-bnpb/insiden-kaya): dua kartu di laci insiden.
   "Perkembangan api": deret pil hari, tabel per hari, isokron, titik awal (lingkaran galat), lompatan; dari data/progresi/<id>.json.
   "Bangunan dekat api": dua angka dibulatkan dari data/insiden_bangunan.json; tanpa koordinat sel atau bangunan.
   Berkas dibuat CI: 404 = kartu bertulis "belum tersedia", bukan 0. Teks dari berkas lewat esc(). Dimuat SETELAH pembanding.js.
   Global halaman: S, Laci, peta, $, esc, fmt, nanti, PKH_INSIDEN. */
(() => {
  "use strict";
  const IKON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  const IK_API = IKON + '<path d="M12 3c1.5 3.3 5 5.3 5 9.6a5 5 0 0 1-10 0c0-2 .9-3.5 2.2-4.7.2 1.7 1.2 2.7 2.2 3C10.6 8.3 11.2 5.6 12 3Z"/></svg>';
  const IK_BGN = IKON + '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg>';
  const IK_PIN = IKON + '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const IK_INFO = IKON + '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const KOSONG = "belum tersedia";
  const SUMBER = "ik-src", LAPIS = ["ik-iso", "ik-awal", "ik-awal-garis", "ik-lompat"];

  const ambil = u => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
  let PBGN = null;   /* satu unduhan berkas bangunan; gagal tidak disimpan */
  const bangunan = () => PBGN ||= ambil("data/insiden_bangunan.json").then(d => { if (d == null) PBGN = null; return d; });

  const wib = t => new Date(Date.parse(t) + 7 * 36e5);   /* getUTC* pada hasil = jam dinding WIB */
  const tglPendek = t => { const d = wib(t); return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]}`; };
  const tgl = t => `${tglPendek(t)} ${wib(t).getUTCFullYear()}`;
  const angka = (v, d = 0) => v == null || isNaN(v) ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});

  const kartu = (nama, ikon, isi, tip = "", kanan = "") => `<section class="ex ex-std"><header class="ex-hd"><span class="ex-ey"></span><div class="ex-jd"><h3${tip ? ` title="${esc(tip)}"` : ""}>${ikon}${nama}</h3>${kanan}</div></header><div class="ex-bd">${isi}</div></section>`;
  const kosong = teks => `<p class="ik-info">${IK_INFO}<span>${esc(teks)}</span></p>`;

  /* ---------- peta: warna token lewat piksel kanvas (MapLibre tidak mengerti oklch) ---------- */
  function warna(token) {
    const c = document.createElement("canvas"); c.width = c.height = 1;
    const x = c.getContext("2d", {willReadFrequently: true});
    x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "gray"; x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`;
  }
  function lingkaran(lat, lon, m) {
    const dl = m / 111320, dn = dl / Math.cos(lat * Math.PI / 180), n = 48, c = [];
    for (let i = 0; i <= n; i++) { const a = 2 * Math.PI * i / n; c.push([+(lon + dn * Math.cos(a)).toFixed(5), +(lat + dl * Math.sin(a)).toFixed(5)]); }
    return c;
  }
  function bersih() {
    if (typeof peta === "undefined" || !peta) return;
    try { for (const l of LAPIS) if (peta.getLayer(l)) peta.removeLayer(l); if (peta.getSource(SUMBER)) peta.removeSource(SUMBER); } catch (e) { /* gaya sedang berganti */ }
  }
  function gambarPeta(p, k0) {
    if (typeof peta === "undefined" || !peta) return;
    const fitur = [];
    for (const i of p.isokron || []) if (i.geometri) fitur.push({type: "Feature", properties: {j: "iso", k: i.k}, geometry: i.geometri});
    for (const l of p.lompatan || []) if (l.dari && l.lat != null) fitur.push({type: "Feature", properties: {j: "lompat"}, geometry: {type: "LineString", coordinates: [[l.dari[1], l.dari[0]], [l.lon, l.lat]]}});
    const a = p.titik_awal;
    if (a && a.lat != null && a.radius_m) fitur.push({type: "Feature", properties: {j: "awal"}, geometry: {type: "Polygon", coordinates: [lingkaran(a.lat, a.lon, a.radius_m)]}});
    if (!fitur.length) return;
    bersih();
    const ks = (p.isokron || []).map(i => i.k), kmax = Math.max(...ks, 0), lama = warna("--warn"), baru = warna("--bad"), tinta = warna("--brand2");
    peta.addSource(SUMBER, {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
    peta.addLayer({id: "ik-iso", type: "line", source: SUMBER, filter: ["==", ["get", "j"], "iso"], layout: {"line-join": "round"},
      paint: {"line-color": kmax ? ["interpolate", ["linear"], ["get", "k"], 0, lama, kmax, baru] : baru, "line-width": ["case", ["==", ["get", "k"], k0], 4, 1.5]}});
    peta.addLayer({id: "ik-awal", type: "fill", source: SUMBER, filter: ["==", ["get", "j"], "awal"], paint: {"fill-color": tinta, "fill-opacity": .15}});
    peta.addLayer({id: "ik-awal-garis", type: "line", source: SUMBER, filter: ["==", ["get", "j"], "awal"], paint: {"line-color": tinta, "line-width": 2}});
    peta.addLayer({id: "ik-lompat", type: "line", source: SUMBER, filter: ["==", ["get", "j"], "lompat"], paint: {"line-color": baru, "line-width": 2, "line-dasharray": [2, 2]}});
  }
  const pilihHari = k => { if (typeof peta !== "undefined" && peta?.getLayer("ik-iso")) peta.setPaintProperty("ik-iso", "line-width", ["case", ["==", ["get", "k"], k], 4, 1.5]); };

  /* ---------- kartu Perkembangan api ---------- */
  const TIP_VONIS = "Ketepatan perkiraan waktu tiba api belum lulus uji tahan. Angka tampil sebagai hipotesis, bukan angka resmi.";
  const TH = [["Hari", "Garis depan dihitung sekali sehari pukul 14.00 WIB"], ["Dijangkau (ha)", "Batas atas luas terbakar, bukan luas terbakar. Satu piksel 14,06 ha"], ["Baru (ha)", "Tambahan dari hari sebelumnya"],
    ["Laju p90 (km per hari)", "Persentil 90 jarak kemajuan sel baru. Belum terukur bila di bawah satu sel (0,38 km)"], ["Catatan", "Lompatan: sel baru 2 sampai 10 km dari yang sudah tercapai. Arah geometri, bukan arah angin"]]
    .map(([t, tip]) => `<th title="${esc(tip)}">${t}</th>`).join("");

  function perkembangan(p, r) {
    const kepala = (isi, kanan = "") => kartu("Perkembangan api", IK_API, isi, "Perkiraan perkembangan api dari deteksi satelit. Satelit melihat api sesudah menyala.", kanan);
    if (!p) return {html: kepala(kosong(KOSONG)), k0: null};
    if (p.tersedia === false) return {html: kepala(kosong(p.alasan ? p.alasan.charAt(0).toUpperCase() + p.alasan.slice(1) : KOSONG)), k0: null};
    const iso = (p.isokron || []).slice().sort((a, b) => a.k - b.k);
    if (!iso.length) return {html: kepala(kosong(KOSONG)), k0: null};
    const laju = new Map((p.laju || []).map(l => [l.k, l])), lom = p.lompatan || [];
    const k0 = iso[iso.length - 1].k;
    const pil = iso.map(i => `<button type="button" data-k="${+i.k}" aria-pressed="${i.k === k0}" aria-label="hari ${esc(tgl(i.t))}">${tglPendek(i.t)}</button>`).join("");
    const baris = iso.map((i, n) => {
      const l = laju.get(i.k), cat = lom.filter(x => Date.parse(x.t) <= Date.parse(i.t) && (n === 0 || Date.parse(x.t) > Date.parse(iso[n - 1].t)));
      const lj = !l || l.p90_km == null || l.terukur === false ? "belum terukur" : angka(l.p90_km, 1);
      return `<tr data-k="${+i.k}"${i.k === k0 ? ' class="ik-pilih"' : ""}><td>${tgl(i.t)}</td><td class="n">${angka(i.luas_ha)}</td><td class="n">${angka(i.baru_ha)}</td><td class="n">${lj}</td><td>${cat.map(x => `lompatan ${angka(x.jarak_km, 1)} km`).join(", ") || "–"}</td></tr>`;
    }).join("");
    const a = p.titik_awal;
    const awal = a ? `<p class="ik-awal" title="${esc("Satelit melihat api sesudah menyala, jadi titik ini perkiraan dan bukan penentu sebab. Lingkaran di peta = galat posisi.")}">${IK_PIN}<span>perkiraan titik awal terdeteksi, galat ±${angka(a.galat_jam, 1)} jam${a.mulai_lebih_awal ? ", sudah besar saat pertama terlihat" : ""}</span></p>` : "";
    const tak = r?.status === "tak_terdeteksi" ? `<p class="ik-info">${IK_INFO}<span>Tak terlihat sejak ${esc(tgl(r.tak_terdeteksi))}</span></p>` : "";
    const lulus = p.metode?.uji?.vonis === "lulus";
    const status = lulus ? "" : `<span class="pk-lemah" title="${esc(TIP_VONIS)}">hipotesis</span>`;
    const sejak = p.hitung_sejak ? `<p class="ik-info">${IK_INFO}<span>Dihitung sejak ${esc(tgl(p.hitung_sejak))}</span></p>` : "";
    return {html: kepala(`<div class="ik-hari" role="group" aria-label="Pilih hari">${pil}</div>${awal}${tak}${sejak}<div class="tw ex-tabel"><table class="ik-tbl"><thead><tr>${TH}</tr></thead><tbody>${baris}</tbody></table></div>`, status), k0};
  }

  /* ---------- kartu Bangunan dekat api ---------- */
  function bangunanKartu(d, id) {
    const tip = d ? `${d.definisi || ""} Sumber ${d.sumber || "Google Open Buildings"}, lisensi ${d.lisensi || "CC BY 4.0"}, keyakinan paling sedikit ${angka(d.ambang_keyakinan, 2)}, galat posisi sekitar ${angka(d.galat_posisi_km, 2)} km. Bangunan yang tidak terdeteksi tidak dikoreksi. Bukan jumlah jiwa, bukan penjumlahan dengan sumber lain.` : "";
    const kep = (isi, kanan = "") => kartu("Bangunan dekat api", IK_BGN, isi, tip, kanan);
    const e = d?.insiden?.[id];
    if (!d || !e) return kep(kosong(KOSONG));
    if (e.terliput === false) return kep(kosong("Belum tercakup untuk provinsi ini"));
    const t = e.tampil || {};
    const kini = t.kini || "–", kum = t.kumulatif || "–";   /* hanya teks bulat dari server, tidak pernah angka mentah */
    const rad = angka(d.radius_m || 500);
    const catKini = t.kini ? `dalam ${rad} m dari petak api` : e.kini_alasan ? "tidak ada petak api berumur 12 jam atau kurang" : "belum terhitung";
    const catKum = t.kumulatif ? `dalam ${rad} m dari petak api` : "belum terhitung";
    return kep(`<div class="ik-dua"><div><b>${esc(kini)}</b><span>bangunan sekarang</span><small>${catKini}</small></div><div><b>${esc(kum)}</b><span>bangunan sejak terdeteksi</span><small>${catKum}</small></div></div>
      ${e.luas_atap_m2 == null || e.kumulatif == null ? "" : `<p class="ik-info">${IK_BGN}<span>luas atap sekitar ${angka(e.luas_atap_m2)} m²</span></p>`}`, `<span class="pk-lemah" title="${esc(tip)}">perkiraan</span>`);
  }

  /* ---------- pemasangan di laci ---------- */
  const _buka = Laci.buka.bind(Laci);
  Laci.buka = function (id) { _buka(id); bersih(); nanti(() => pasang(id)); };
  const wLaci = $("#laci");
  if (wLaci) new MutationObserver(() => { if (!wLaci.classList.contains("on")) bersih(); }).observe(wLaci, {attributes: true, attributeFilter: ["class"]});
  $("#dlgLaci")?.addEventListener("close", bersih);

  async function pasang(kid) {
    const r = await window.PKH_INSIDEN?.cari(kid); if (!r) return;
    const [p, d] = await Promise.all([ambil(`data/progresi/${encodeURIComponent(r.id)}.json`), bangunan()]);
    if (S.pilihK !== kid || $("#laci .ik-wadah")) return;
    const a = perkembangan(p, r);
    const wadah = document.createElement("div"); wadah.className = "ik-wadah";
    wadah.innerHTML = a.html + bangunanKartu(d, r.id);
    wadah.addEventListener("click", e => {
      const b = e.target.closest(".ik-hari button"); if (!b) return;
      const k = +b.dataset.k;
      wadah.querySelectorAll(".ik-hari button").forEach(x => x.setAttribute("aria-pressed", x === b));   /* chrome kontrol urgent */
      wadah.querySelectorAll(".ik-tbl tr[data-k]").forEach(tr => tr.classList.toggle("ik-pilih", +tr.dataset.k === k));
      nanti(() => pilihHari(k));
    });
    let coba = 0;
    const taruh = () => {
      if (S.pilihK !== kid || $("#laci .ik-wadah")) return;
      const jangkar = $("#laci .pk-laci");
      if (!jangkar && ++coba < 12) return void setTimeout(taruh, 150);   /* pembanding.js menyisipkan "Insiden api" lebih dulu */
      jangkar ? jangkar.insertAdjacentElement("afterend", wadah) : $("#laci .bd")?.insertAdjacentElement("afterbegin", wadah);
      if (a.k0 != null) nanti(() => { if (S.pilihK === kid) gambarPeta(p, a.k0); });
    };
    taruh();
  }
})();
