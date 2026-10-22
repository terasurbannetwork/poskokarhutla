/* Penugasan, pelacak posisi, pop-up peta saat masuk, dan penjelas padam/EXIF untuk /instansi dan /admin/instansi. Modul sisip: window.Tugaskan.
   - pasang(t, wadah): panel penugasan satu tugas (akun instansi): tugaskan orang, tautan /lacak/<token> yang tampil SEKALI, Kirim lewat WA (hanya membuka wa.me), cabut, terbitkan ulang,
     checklist persiapan, peta posisi terakhir dan jejak (<= 200 titik), jarak ke api dan ETA kasar. Poll 30 detik, berhenti saat tab tersembunyi.
   - pasangAdmin(t, wadah): sama, hanya baca (tanpa WA orang yang ditugaskan, tanpa tombol ubah).
   - popupMasuk({saya, tugas, lihatTugas}): modal peta wilayah (titik panas 24 jam dan tugas berwarna status) sekali per sesi (sessionStorage, try/catch).
   - padamPil(t), padamBlok(t), exifInfo(m): label padam dan baris metadata foto, dipakai kedua halaman.
   CSP: tanpa skrip/gaya inline; teks data lewat esc(). INP: ketukan menandai chrome lebih dulu, kerja jaringan dan peta sesudahnya. */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ang = (n, d = 1) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d});
  const MENIT = 60e3, JAM = 36e5, POLL_MS = 30e3;
  const jamWIB = ms => new Date(ms).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"});
  const tglJamWIB = ms => new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(",", "");
  const pil = (t, k = "") => `<span class="in-pil ${k}">${esc(t)}</span>`;
  const lama = ms => { const m = Math.max(0, Math.round(ms / MENIT)); return m < 1 ? "baru saja" : m < 60 ? `${m} menit lalu` : `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ""} lalu`; };
  const PERAN = {driver: "Driver", ketua_regu: "Ketua regu", anggota: "Anggota", lainnya: "Lainnya"};

  /* ================= padam dan EXIF (dipakai /instansi, /admin/instansi) ================= */
  const PADAM_PENDEK = {padam_terverifikasi: ["Padam terverifikasi", "hijau"], muncul_lagi: ["Api muncul lagi", "merah"]};
  function padamPil(t) {
    const p = t?.padam; if (!p) return "";
    if (p.status === "padam_dilaporkan") return pil(Date.now() - p.pada >= 24 * JAM ? "Padam, belum ada titik baru 24 jam" : "Padam dilaporkan", "emas");
    const [teks, k] = PADAM_PENDEK[p.status] || ["", ""]; return teks ? pil(teks, k) : "";
  }
  const SUMBER = {firms: "titik panas NASA", himawari: "Himawari (perkiraan, sekitar 2 km)", regu: "laporan regu lapangan"};
  const HARI_CEK = h => `H+${h}`;
  /* api muncul lagi: sumber, waktu, jarak. Jadwal cek ulang H+1/H+3/H+7 (gambut atau lahan belum diketahui): pil hijau selesai, merah lewat, emas menunggu. */
  function munculJadwal(p) {
    const m = p.muncul, j = p.jadwal_cek_ulang;
    return (m ? `<p>${pil("Api muncul lagi", "merah")} ${esc(SUMBER[m.sumber] || m.sumber)}, ${esc(tglJamWIB(m.waktu))} WIB${m.jarak_km != null ? `, ${esc(ang(m.jarak_km))} km dari titik tugas` : ""}.${m.keterangan ? " " + esc(m.keterangan) : ""}</p>` : "")
      + (j ? `<p class="tg-jadwal"><span class="k">Cek ulang lapangan${p.dasar_lahan === "tidak_diketahui" ? " (lahan belum diketahui, dianggap gambut)" : ""}</span> ${j.map(x => pil(`${HARI_CEK(x.hari)} ${x.selesai != null ? "sudah" : x.terlambat ? "terlambat" : tglJamWIB(x.jatuh_tempo)}`, x.selesai != null ? "hijau" : x.terlambat ? "merah" : "emas")).join(" ")}</p>` : "");
  }
  function padamBlok(t) {
    const p = t?.padam; if (!p) return "";
    return `<div class="in-kartu tg-padam ${esc(p.tingkat)}"><h2 class="in-sub">Sudah padam belum?</h2><p>${padamPil(t)} ${esc(p.label)}</p>${munculJadwal(p)}
      <p class="lp-kecil">Satelit memeriksa titik panas dalam radius 2 km tiap 3 jam sesudah laporan padam. Satelit tidak melihat bara bawah permukaan, jadi lapangan tetap perlu mengecek ulang.</p>
      ${p.cek_ulang ? `<p>${pil("Sudah dicek ulang lapangan", "hijau")} ${p.cek_ulang_pada ? esc(tglJamWIB(p.cek_ulang_pada)) + " WIB" : ""}</p>` : ""}</div>`;
  }
  /* satu baris metadata foto untuk galeri: jam diambil (EXIF), koordinat EXIF, jarak ke GPS perangkat dan ke titik api, tanda terverifikasi seperti layar foto publik */
  function exifInfo(m) {
    const b = [];
    if (m.exif_waktu != null) b.push(`diambil ${tglJamWIB(m.exif_waktu)} WIB menurut EXIF`);
    if (m.exif_lat != null && m.exif_lon != null) b.push(`koordinat EXIF ${ang(m.exif_lat, 5)}, ${ang(m.exif_lon, 5)}`);
    if (m.exif_jarak != null) b.push(`${ang(m.exif_jarak, 0)} m dari GPS perangkat`);
    if (m.exif_api_km != null) b.push(`${ang(m.exif_api_km)} km dari titik api`);
    const v = m.terverifikasi || {}, tanda = [v.kamera && "kamera", v.waktu && "waktu", v.gps && "GPS"].filter(Boolean);
    return `${b.length ? esc(b.join(", ")) + "." : "Tanpa metadata EXIF (dari galeri, atau dibuang aplikasi)."}${tanda.length ? " " + tanda.map(x => pil("Terverifikasi " + x, "hijau")).join(" ") : ""}`;
  }

  /* ================= pop-up peta saat masuk ================= */
  function ringkasan(tugas) {
    const aktif = (tugas || []).filter(t => t.status === "buka"), terlambat = aktif.filter(t => t.terlambat).length;
    return {aktif: aktif.length, terlambat, teks: `${aktif.length} kompleks aktif, ${terlambat} terlambat`};
  }
  /* baris titik panas /api/titik di wilayah akun: kolom wilayah berisi "kodeprov|kabupaten|kecamatan" */
  function titikWilayah(j, saya) {
    if (!j || !Array.isArray(j.baris) || !Array.isArray(j.wilayah)) return [];
    const kab = saya?.akun?.tingkat === "kab" && saya.kab ? String(saya.kab).toLowerCase() : null, cakupan = Array.isArray(saya?.cakupan) ? saya.cakupan : [];
    const ok = j.wilayah.map(w => { const [p, k] = String(w).split("|"); return cakupan.includes(p) && (!kab || String(k).toLowerCase() === kab); });
    return j.baris.filter(b => ok[b[6]]).map(b => ({lat: b[0], lon: b[1]}));
  }
  const sudahTampil = new Set();   // cadangan bila sessionStorage tak bisa dipakai: sekali per muatan halaman
  let modalAktif = null;
  async function popupMasuk({saya, tugas, lihatTugas} = {}) {
    const a = saya?.akun; if (!a || a.status !== "aktif" || !Array.isArray(tugas)) return false;
    const kunci = "pb_peta_masuk:" + a.id;
    if (sudahTampil.has(kunci)) return false;
    try { if (sessionStorage.getItem(kunci)) return false; } catch (e) { /* sessionStorage ditolak (mode privat ketat): cukup penanda memori */ }
    sudahTampil.add(kunci); try { sessionStorage.setItem(kunci, "1"); } catch (e) {}
    const r = ringkasan(tugas), m = document.createElement("div");
    m.className = "tg-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "tgModalJudul");
    m.innerHTML = `<div class="tg-kotak"><h2 id="tgModalJudul">Peta wilayahmu</h2><p class="tg-ringkas">${esc(r.teks)}</p>
      <div id="tgPetaModal" class="tg-peta-modal" role="img" aria-label="Peta titik panas 24 jam dan tugas aktif di wilayahmu"></div>
      <p id="tgTitikInfo" class="lp-kecil">Memuat titik panas 24 jam terakhir…</p>
      <p class="tg-legenda"><span class="tg-l tg-l-titik"></span>titik panas satelit <span class="tg-l tg-l-aktif"></span>tugas aktif <span class="tg-l tg-l-telat"></span>terlambat <span class="tg-l tg-l-selesai"></span>selesai</p>
      <div class="tg-aksi"><button type="button" class="lp-tombol utama" data-aksi="lihat">Lihat tugas</button><button type="button" class="lp-tombol" data-aksi="tutup">Tutup</button></div></div>`;
    const tutup = () => { document.removeEventListener("keydown", esc2); m.remove(); if (modalAktif === m) { modalAktif.peta?.remove?.(); modalAktif = null; } };
    const esc2 = e => { if (e.key === "Escape") tutup(); };
    m.addEventListener("click", e => {
      const b = e.target?.closest?.("button[data-aksi]");
      if (b?.dataset.aksi === "lihat") { tutup(); lihatTugas?.(); } else if (b?.dataset.aksi === "tutup" || e.target === m) tutup();
    });
    document.addEventListener("keydown", esc2);
    document.body.append(m); modalAktif = m;
    m.querySelector?.('[data-aksi="lihat"]')?.focus();
    isiPeta(m, saya, tugas).catch(() => {});   // data dan peta menyusul; modal sudah tampil
    return true;
  }
  async function isiPeta(m, saya, tugas) {
    let titik = [], info = "Titik panas belum bisa dimuat. Tugas tetap tampil di peta.";
    try { const r = await fetch("/api/titik"); if (r.ok) { const j = await r.json(); titik = titikWilayah(j, saya); info = `${ang(titik.length, 0)} titik panas dalam 24 jam terakhir di wilayahmu${j.dibuat ? `, data satelit pukul ${jamWIB(Date.parse(j.dibuat))} WIB` : ""}.`; } } catch (e) {}
    const t = m.querySelector?.("#tgTitikInfo"); if (t) t.textContent = info;
    const w = m.querySelector?.("#tgPetaModal"); if (!w || !window.InstansiPeta) return;
    try { await window.InstansiPeta.muat(); } catch (e) { w.hidden = true; return; }
    if (!m.isConnected && modalAktif !== m) return;   // ditutup sebelum peta siap
    const adaT = tugas.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)), pusat = adaT[0] ? [adaT[0].lon, adaT[0].lat] : titik[0] ? [titik[0].lon, titik[0].lat] : [113.9, -2.2];
    const peta = new maplibregl.Map({container: w, style: "https://tiles.openfreemap.org/styles/positron", center: pusat, zoom: 8, minZoom: 3, maxZoom: 16, dragRotate: false, attributionControl: {compact: true}});
    m.peta = peta; peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
    peta.on("load", () => {
      peta.addSource("titik", {type: "geojson", data: {type: "FeatureCollection", features: titik.slice(0, 4000).map(p => ({type: "Feature", properties: {}, geometry: {type: "Point", coordinates: [p.lon, p.lat]}}))}});
      peta.addLayer({id: "titik", type: "circle", source: "titik", paint: {"circle-radius": 4, "circle-color": "#e8743b", "circle-opacity": .75, "circle-stroke-width": 1, "circle-stroke-color": "#fff"}});
    });
    const b = new maplibregl.LngLatBounds();
    for (const x of adaT) { const el = document.createElement("span"); el.className = `in-pin ${x.status !== "buka" ? "selesai" : x.terlambat ? "telat" : "aktif"}`; el.setAttribute("aria-label", `Tugas ${x.kab}`); new maplibregl.Marker({element: el}).setLngLat([x.lon, x.lat]).addTo(peta); b.extend([x.lon, x.lat]); }
    for (const p of titik.slice(0, 4000)) b.extend([p.lon, p.lat]);
    if (!b.isEmpty()) peta.fitBounds(b, {padding: 40, maxZoom: 10, duration: 0});
  }

  /* peta SVG tanpa ubin dan tanpa pustaka: titik api, radius tiba 300 m, jejak dan posisi terakhir tiap orang. Proyeksi datar (cukup untuk jarak puluhan km). */
  function petaSvg(t, ada) {
    const W = 320, H = 240, P = 28, pts = [[t.lat, t.lon], ...ada.flatMap(p => [[p.posisi.lat, p.posisi.lon], ...p.jejak.map(x => [x[0], x[1]])])];
    const k = Math.cos(t.lat * Math.PI / 180), la = pts.map(p => p[0]), lo = pts.map(p => p[1] * k);
    const y0 = Math.min(...la), y1 = Math.max(...la), x0 = Math.min(...lo), x1 = Math.max(...lo), s = Math.min((W - 2 * P) / Math.max(x1 - x0, 1e-4), (H - 2 * P) / Math.max(y1 - y0, 1e-4));
    const X = lon => (W - (x1 - x0) * s) / 2 + (lon * k - x0) * s, Y = lat => H - ((H - (y1 - y0) * s) / 2 + (lat - y0) * s);
    const rM = 300 / 111320 * s, km1 = 1 / 111.32 * s;   // 300 m dan 1 km dalam piksel
    const garis = ada.filter(p => p.jejak.length > 1).map(p => `<polyline fill="none" stroke="#1b5fa8" stroke-width="2.5" stroke-linejoin="round" opacity=".8" points="${p.jejak.map(x => `${X(x[1]).toFixed(1)},${Y(x[0]).toFixed(1)}`).join(" ")}"/>`).join("");
    const orang = ada.map(p => `<g><circle cx="${X(p.posisi.lon).toFixed(1)}" cy="${Y(p.posisi.lat).toFixed(1)}" r="10" fill="#1b5fa8" stroke="#fff" stroke-width="2"/><text x="${X(p.posisi.lon).toFixed(1)}" y="${(Y(p.posisi.lat) + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${esc(String(p.nama).replace(/^\[DUMMY\]\s*/, "").slice(0, 1).toUpperCase())}</text></g>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="Peta sederhana: titik api dan posisi terakhir ${ada.length} orang yang ditugaskan, tanpa ubin peta"><rect width="${W}" height="${H}" fill="#eef2f7"/>
      <circle cx="${X(t.lon).toFixed(1)}" cy="${Y(t.lat).toFixed(1)}" r="${Math.max(4, rM).toFixed(1)}" fill="#c9503a" fill-opacity=".14" stroke="#c9503a" stroke-dasharray="3 3"/>${garis}
      <circle cx="${X(t.lon).toFixed(1)}" cy="${Y(t.lat).toFixed(1)}" r="7" fill="#c9503a" stroke="#fff" stroke-width="2"/>${orang}
      <line x1="${P}" y1="${H - 12}" x2="${(P + km1).toFixed(1)}" y2="${H - 12}" stroke="#14213d" stroke-width="2"/><text x="${P}" y="${H - 16}" font-size="10" fill="#14213d" font-family="system-ui,sans-serif">1 km</text></svg>`;
  }

  /* ================= panel penugasan (akun) dan versi baca-saja (admin) ================= */
  let gen = 0, aktif = null;   // satu panel hidup pada satu waktu; yang lama berhenti sendiri
  async function api(metode, url, body) {
    const h = {...(metode === "POST" ? {"x-pb": "1"} : {}), ...(body === undefined ? {} : {"content-type": "application/json"})};
    let r; try { r = await fetch(url, {method: metode, headers: h, body: body === undefined ? undefined : JSON.stringify(body)}); } catch (e) { return {ok: false, status: 0, j: {galat: "Tidak ada sinyal."}}; }
    return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))};
  }
  function keadaan(p) {
    if (p.status === "dicabut") return ["Dicabut", "merah"]; if (p.status === "kedaluwarsa") return ["Tautan kedaluwarsa", "merah"]; if (p.status === "selesai") return ["Selesai", "hijau"];
    if (p.tiba_pada) return ["Tiba di lokasi", "hijau"]; if (p.berangkat_pada) return ["Dalam perjalanan", "emas"]; if (p.dibuka_pada) return ["Tautan dibuka, belum berangkat", ""]; return ["Tautan belum dibuka", ""];
  }
  /* darurat dari tombol di halaman lacak (<= 6 jam): kotak merah mencolok di atas baris; tautan WhatsApp hanya bila nomor tampil (akun pembuat), tidak ada kiriman otomatis */
  function daruratHtml(p) {
    const d = p.darurat; if (!d || p.status !== "aktif") return "";
    const wa = /^62\d{8,13}$/.test(p.wa || "") ? `https://wa.me/${p.wa}?text=${encodeURIComponent("Posko di sini. Kami menerima panggilan darurat dari Anda. Anda di mana dan apa yang terjadi?")}` : null;
    return `<div class="tg-darurat" role="alert"><b>DARURAT: ${esc(d.label || d.jenis)}</b> dikirim ${esc(jamWIB(d.pada))} WIB${d.lat != null ? `, posisi ${ang(d.lat, 5)}, ${ang(d.lon, 5)}` : ", tanpa posisi (lihat posisi terakhir)"}. Hubungi sekarang atau telepon 112.
      ${wa ? `<a class="lp-tombol utama" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">Hubungi lewat WhatsApp</a>` : `<span class="lp-kecil">Nomor orang ini hanya tampil untuk akun yang menugaskannya; hubungi lewat pembuat penugasan.</span>`}</div>`;
  }
  /* bunyi pendek sekali per darurat baru; peramban butuh ketukan sebelumnya, jadi gagal diam-diam */
  function bunyiDarurat() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.type = "square"; o.frequency.value = 880; g.gain.value = .12; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .6); o.onended = () => c.close(); } catch (e) {} }
  function barisHtml(p, admin, kini) {
    const [k, kls] = keadaan(p), mati = p.status !== "aktif", pos = p.posisi, umur = pos ? kini - pos.pada : null, lamaPos = umur != null && umur > 5 * MENIT && p.berangkat_pada && !p.tiba_pada && !mati;
    return `<article class="tg-orang${p.darurat && p.status === "aktif" ? " tg-ada-darurat" : ""}" data-pid="${esc(p.id)}">${daruratHtml(p)}<div class="tg-o-kepala"><b>${esc(p.nama)}</b><span class="tg-peran">${esc(PERAN[p.peran] || p.peran)}, ${ang(p.orang, 0)} orang</span>${pil(k, kls)}${p.dummy ? pil("Contoh", "") : ""}</div>
      <p class="tg-o-info">${pos ? `Posisi ${esc(jamWIB(pos.pada))} WIB (${esc(lama(umur))})${pos.akurasi != null ? `, akurasi sekitar ${ang(pos.akurasi, 0)} m` : ""}.` : "Belum ada posisi."}
        ${p.jarak_km != null ? ` <b>${ang(p.jarak_km)} km</b> dari titik api (garis lurus)${p.eta_menit != null ? `, ETA kasar ${ang(p.eta_menit, 0)} menit` : ""}.` : ""}${lamaPos ? ` ${pil("Posisi lama: layar mati atau sinyal hilang?", "merah")}` : ""}</p>
      <p class="lp-kecil">Persiapan: ${ang(p.ringkas.wajib_centang, 0)} dari ${ang(p.ringkas.wajib, 0)} butir wajib dicentang.${p.berangkat_pada ? ` Berangkat ${esc(jamWIB(p.berangkat_pada))} WIB.` : ""}${p.tiba_pada ? ` Tiba ${esc(jamWIB(p.tiba_pada))} WIB.` : ""}${p.selesai_pada ? ` Selesai ${esc(jamWIB(p.selesai_pada))} WIB.` : ""}</p>
      <details class="in-rinci tg-cek"><summary>Checklist persiapan</summary><ul class="tg-cek-daftar">${p.butir.map(b => `<li><label><input type="checkbox" data-tg="centang" data-p="${esc(p.id)}" data-k="${esc(b.k)}"${p.checklist[b.k] ? " checked" : ""}${admin || mati ? " disabled" : ""}><span>${esc(b.teks)}${b.wajib ? "" : b.saran ? " (disarankan)" : " (opsional)"}${p.checklist[b.k] ? ` <small>dicentang ${esc(jamWIB(p.checklist[b.k]))}</small>` : ""}</span></label></li>`).join("")}</ul></details>
      ${admin ? "" : `<div class="tg-o-aksi">${p.status === "aktif" ? `<button type="button" class="lp-tombol" data-tg="cabut" data-p="${esc(p.id)}">Cabut tautan</button>` : ""}<button type="button" class="lp-tombol" data-tg="ulang" data-p="${esc(p.id)}">Terbitkan ulang tautan</button></div>`}</article>`;
  }
  const formHtml = () => `<form id="tgForm" class="in-form in-blok tg-form" novalidate hidden>
    <label>Nama orang yang ditugaskan<input id="tgNama" maxlength="80" autocomplete="off" placeholder="mis. Hendra"></label>
    <label>Peran<select id="tgPeran">${Object.entries(PERAN).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
    <label>Nomor WhatsApp (boleh kosong, bisa dipilih saat WhatsApp terbuka)<input id="tgWa" inputmode="tel" maxlength="30" autocomplete="off" placeholder="mis. 0812xxxxxxx"></label>
    <label>Jumlah orang dalam regu<input id="tgOrang" inputmode="numeric" value="1" maxlength="3"></label>
    <label>Masa berlaku tautan<select id="tgJam"><option value="24">24 jam</option><option value="48" selected>48 jam</option><option value="72">72 jam</option><option value="168">7 hari</option></select></label>
    <p id="tgGalat" class="lp-pesan galat" role="alert" hidden></p>
    <button type="submit" class="lp-tombol utama" id="tgKirim">Buat tautan</button></form>`;
  /* kandidat dari GET /api/instansi/usulan/:id (sudah urut waktu tempuh lalu beban); rumus dan sifat "perkiraan" ditampilkan apa adanya */
  function usulanHtml(j, admin) {
    if (!j.kandidat.length) return `<p class="lp-kecil">${esc(j.pesan || "Belum ada kandidat.")}</p>`;
    const alat = j.alat?.pompa?.filter(p => p.total_siap > 0).map(p => `${esc(p.label)}: ${ang(p.total_siap, 0)} siap, terdekat ${esc(p.tersedia[0]?.nama || "")} ${ang(p.tersedia[0]?.jarak_km)} km`) || [];
    return `<p class="lp-kecil"><b>Perkiraan.</b> ${esc(j.rumus)}</p><ol class="tg-usulan-daftar">${j.kandidat.map((k, i) => `<li><b>${esc(k.nama)}</b> <span class="tg-peran">${esc(k.peran_nama)}, ${ang(k.orang, 0)} orang, ${esc(k.oleh)}</span>
      <p class="lp-kecil">${k.tempuh_menit != null ? `Tempuh sekitar <b>${ang(k.tempuh_menit, 0)} menit</b> (${k.cara === "graf" ? "graf jalan dan sungai" : "garis lurus x 1,3"}${k.jarak_km != null ? `, ${ang(k.jarak_km)} km` : ""})` : "Waktu tempuh tidak diketahui (belum ada posisi atau pos asal)"}.
        ${k.asal.jenis === "posisi" ? `Dari posisi terakhir ${ang(k.asal.umur_menit, 0)} menit lalu.` : k.asal.jenis === "pos" ? `Dari ${esc(k.asal.nama)}.` : ""} Beban 7 hari: ${ang(k.beban_7h, 0)} penugasan.</p>
      ${admin ? "" : `<button type="button" class="lp-tombol utama" data-tg="pilih" data-i="${i}">Tugaskan</button>`}</li>`).join("")}</ol>
      ${alat.length ? `<p class="lp-kecil">Alat siap yang cocok dengan rekomendasi: ${alat.join("; ")}.</p>` : j.alat?.gudang?.length ? `<p class="lp-kecil">Gudang terdekat dengan alat siap: ${j.alat.gudang.map(g => `${esc(g.nama)} (${ang(g.jarak_km)} km)`).join(", ")}.</p>` : ""}`;
  }
  function hasilHtml(j, nama) {
    const wa = typeof j.wa?.tautan === "string" && j.wa.tautan.startsWith("https://wa.me/") ? j.wa.tautan : null;
    return `<div class="tg-hasil" role="status"><p><b>Tautan untuk ${esc(nama)} sudah dibuat.</b> Tautan hanya tampil sekali di layar ini dan tidak bisa dilihat lagi. Hilang atau salah kirim? Cabut lalu terbitkan ulang.</p>
      <input class="tg-tautan" readonly value="${esc(j.tautan)}" aria-label="Tautan pelacak">
      <div class="tg-o-aksi">${wa ? `<a class="lp-tombol utama" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">Kirim lewat WA</a>` : ""}<button type="button" class="lp-tombol" data-tg="salin" data-url="${esc(j.tautan)}">Salin tautan</button></div>
      <p class="lp-kecil">Tidak ada pesan yang dikirim otomatis: WhatsApp terbuka dengan pesan siap kirim, kamu yang menekan kirim. Berlaku sampai ${esc(tglJamWIB(j.kedaluwarsa))} WIB.</p></div>`;
  }
  function pasangInti(t, wadah, admin) {
    if (aktif?.timer) clearInterval(aktif.timer);   // panel lama berhenti polling
    wadah.__tgOff?.();
    const saya = ++gen, S = {t, wadah, admin, daftar: [], peta: null, penanda: new Map(), pernahFit: false, timer: null, muatPeta: false};
    aktif = S;
    const url = admin ? `/api/instansi/admin/penugasan/${t.id}` : `/api/instansi/penugasan/${t.id}`, boleh = !admin && t.status === "buka";
    wadah.innerHTML = `<section class="in-kartu tg-kartu" aria-label="Penugasan dan pelacak posisi"><div class="tg-kepala"><h2 class="in-sub">Penugasan dan pelacak posisi</h2><button type="button" class="lp-tombol tg-ops" data-tg="ops"><svg class="tg-ik" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM10 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/></svg>Operasi lapangan</button>${boleh ? `<button type="button" class="lp-tombol utama tg-baru" data-tg="baru">Tugaskan orang</button>` : ""}</div>
      <p class="lp-kecil">${admin ? "Posisi terakhir dan jejak orang yang ditugaskan. Nomor WhatsApp mereka tidak ditampilkan di sini." : "Buat tautan untuk driver, regu, atau petugas. Mereka membuka tautan di ponsel, melihat rute dan checklist, lalu membagikan posisi saat berangkat."} Posisi hanya terlihat oleh akun pemilik tugas, moderator, dan staf pusdalops wilayah ini, dan berhenti dikirim saat tugas selesai.</p>
      ${boleh ? formHtml() : ""}<div class="tg-hasil-wadah"></div><div class="tg-usulan"><button type="button" class="lp-tombol" data-tg="usulan">Lihat usulan orang untuk ditugaskan</button><div class="tg-usulan-isi" aria-live="polite"></div></div><div class="tg-peta" hidden></div><div class="tg-daftar" aria-live="polite"><p class="lp-kecil">Memuat penugasan…</p></div></section>`;
    const q = s => wadah.querySelector(s), hidup = () => aktif === S && saya === gen && wadah.isConnected !== false;
    async function muat() {
      if (!hidup()) return;
      const r = await api("GET", url); if (!hidup()) return;
      if (!r.ok) { q(".tg-daftar").innerHTML = r.status === 503 ? `<p class="lp-kecil">Fitur penugasan belum diaktifkan di server.</p>` : `<p class="lp-kecil">${esc(r.j.galat || "Penugasan belum bisa dimuat.")}</p>`; return; }
      S.daftar = r.j.penugasan; S.kini = r.j.kini; gambar();
    }
    /* gambar penuh hanya saat urutan penugasan berubah; selain itu hanya baris yang isinya berubah diganti (poll 30 detik tidak merusak fokus dan centang yang sedang diketuk) */
    function gambar() {
      const d = q(".tg-daftar"), ids = S.daftar.map(p => p.id).join(","), html = new Map(S.daftar.map(p => [p.id, barisHtml(p, admin, S.kini)]));
      if (ids !== S.ids || !d.querySelector(".tg-orang")) {
        S.ids = ids; const buka = new Set([...wadah.querySelectorAll?.("details[open]") || []].map(x => x.closest("[data-pid]")?.dataset.pid));
        d.innerHTML = S.daftar.length ? [...html.values()].join("") : `<p class="lp-kecil">${boleh ? "Belum ada orang yang ditugaskan. Ketuk Tugaskan orang." : "Belum ada orang yang ditugaskan."}</p>`;
        for (const id of buka) if (id) wadah.querySelector(`[data-pid="${id}"] details`)?.setAttribute("open", "");
      } else for (const [id, h] of html) {
        if (S.html?.get(id) === h) continue;
        const art = wadah.querySelector(`[data-pid="${id}"]`); if (!art || art.contains(document.activeElement)) continue;   // baris yang sedang diketuk tidak digambar ulang
        ganti(art, h);
      }
      S.html = html; petaPosisi();
      S.bunyi ||= new Set(); let baruDar = false; for (const p of S.daftar) if (p.darurat && p.status === "aktif" && !S.bunyi.has(p.id + ":" + p.darurat.pada)) { S.bunyi.add(p.id + ":" + p.darurat.pada); baruDar = true; }
      if (baruDar) bunyiDarurat();
    }
    function ganti(art, h) {
      const buka = art.querySelector("details")?.open, id = art.dataset.pid, fokus = document.activeElement?.dataset?.k;
      art.outerHTML = h; const baru = wadah.querySelector(`[data-pid="${id}"]`);
      if (buka) baru?.querySelector("details")?.setAttribute("open", "");
      if (fokus) baru?.querySelector(`[data-k="${fokus}"]`)?.focus();
    }
    /* peta hanya bila ada posisi: dibuat sekali, penanda dan garis diperbarui tiap poll */
    async function petaPosisi() {
      const ada = S.daftar.filter(p => p.posisi); const w = q(".tg-peta"); if (!w) return;
      if (!ada.length) { w.hidden = true; return; }
      w.hidden = false;
      if (admin || !window.InstansiPeta) { w.innerHTML = petaSvg(t, ada); return; }   // /admin/instansi: CSP tanpa CDN peta, jadi peta digambar SVG sendiri
      if (!S.peta && !S.muatPeta) {
        S.muatPeta = true;
        try { await window.InstansiPeta.muat(); if (!hidup()) return;
          S.peta = new maplibregl.Map({container: w, style: "https://tiles.openfreemap.org/styles/positron", center: [t.lon, t.lat], zoom: 11, minZoom: 3, maxZoom: 17, dragRotate: false, attributionControl: {compact: true}});
          S.peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
          const api0 = document.createElement("span"); api0.className = "in-pin telat"; api0.setAttribute("aria-label", "Titik api"); new maplibregl.Marker({element: api0}).setLngLat([t.lon, t.lat]).addTo(S.peta);
          S.peta.on("load", () => { S.peta.addSource("jejak", {type: "geojson", data: {type: "FeatureCollection", features: []}}); S.peta.addLayer({id: "jejak", type: "line", source: "jejak", paint: {"line-color": "#1b5fa8", "line-width": 3, "line-opacity": .8}}); S.siap = true; isiPeta2(); });
        } catch (e) { w.hidden = true; S.muatPeta = false; return; }
      }
      isiPeta2();
    }
    function isiPeta2() {
      if (!S.peta) return; const ada = S.daftar.filter(p => p.posisi), pakai = new Set(ada.map(p => p.id));
      for (const [id, m] of S.penanda) if (!pakai.has(id)) { m.remove(); S.penanda.delete(id); }
      for (const p of ada) {
        let m = S.penanda.get(p.id);
        if (!m) { const el = document.createElement("span"); el.className = "tg-pin"; m = new maplibregl.Marker({element: el}).setLngLat([p.posisi.lon, p.posisi.lat]).addTo(S.peta); m.el = el; S.penanda.set(p.id, m); }
        m.setLngLat([p.posisi.lon, p.posisi.lat]); m.el.textContent = String(p.nama).replace(/^\[DUMMY\]\s*/, "").slice(0, 1).toUpperCase(); m.el.setAttribute("aria-label", `${p.nama}, posisi terakhir`);
      }
      const garis = ada.filter(p => p.jejak.length > 1).map(p => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: p.jejak.map(x => [x[1], x[0]])}}));
      if (S.siap) S.peta.getSource("jejak")?.setData({type: "FeatureCollection", features: garis});
      if (!S.pernahFit) { S.pernahFit = true; const b = new maplibregl.LngLatBounds([t.lon, t.lat], [t.lon, t.lat]); for (const p of ada) b.extend([p.posisi.lon, p.posisi.lat]); S.peta.fitBounds(b, {padding: 50, maxZoom: 13, duration: 0}); }
    }
    /* poll 30 detik; tidak jalan di tab tersembunyi, dan satu poll segera saat tab terlihat lagi */
    S.timer = setInterval(() => { if (document.visibilityState !== "hidden") muat(); }, POLL_MS);
    S.lihat = () => { if (document.visibilityState !== "hidden") muat(); };
    {
      const onClick = async e => {
        const b = e.target.closest?.("[data-tg]"); if (!b) return; const a = b.dataset.tg;
        if (a === "ops") return bukaOps(t, admin, b);
        if (a === "baru") { const f = q("#tgForm"); f.hidden = !f.hidden; if (!f.hidden) q("#tgNama").focus(); return; }
        if (a === "usulan") { const w = q(".tg-usulan-isi"); b.disabled = true; w.innerHTML = `<p class="lp-kecil">Mencari kandidat…</p>`; const r = await api("GET", `/api/instansi/usulan/${t.id}`); b.disabled = false;
          if (!r.ok) { w.innerHTML = `<p class="lp-kecil">${esc(r.status === 503 ? "Usulan belum aktif di server." : r.j.galat || "Usulan belum bisa dimuat.")}</p>`; return; } S.usulan = r.j.kandidat; w.innerHTML = usulanHtml(r.j, admin); return; }
        if (a === "pilih") { const k = S.usulan?.[Number(b.dataset.i)]; if (!k || b.disabled) return; b.disabled = true; b.textContent = "Membuat tautan…";
          const r = await api("POST", `/api/instansi/penugasan/${t.id}`, {nama: k.nama, peran: k.peran, wa: k.wa || "", orang: k.orang || 1, jam: 48});
          if (!r.ok) { b.disabled = false; b.textContent = r.j.galat || "Gagal, coba lagi"; return; } b.textContent = "Sudah ditugaskan"; q(".tg-hasil-wadah").innerHTML = hasilHtml(r.j, k.nama); return muat(); }
        if (a === "salin") { try { await navigator.clipboard.writeText(b.dataset.url); b.textContent = "Tautan disalin"; } catch (x) { q(".tg-tautan")?.select?.(); b.textContent = "Salin manual: tekan lama pada tautan"; } return; }
        if (a === "cabut") { if (b.dataset.konfirmasi !== "1") { b.dataset.konfirmasi = "1"; b.textContent = "Ketuk lagi untuk mencabut"; return; }
          b.disabled = true; const r = await api("POST", `/api/instansi/cabut_penugasan/${b.dataset.p}`, {}); if (!r.ok) { b.disabled = false; b.textContent = r.j.galat || "Gagal mencabut"; return; } return muat(); }
        if (a === "ulang") { b.disabled = true; const nama = S.daftar.find(p => p.id === b.dataset.p)?.nama || "orang ini"; const r = await api("POST", `/api/instansi/terbit_penugasan/${b.dataset.p}`, {});
          b.disabled = false; if (!r.ok) { b.textContent = r.j.galat || "Gagal menerbitkan"; return; } q(".tg-hasil-wadah").innerHTML = hasilHtml(r.j, nama); return muat(); }
      };
      const onChange = async e => {
        const c = e.target; if (c.dataset?.tg !== "centang") return;
        const r = await api("POST", `/api/instansi/centang_penugasan/${c.dataset.p}`, {k: c.dataset.k, ya: !!c.checked});
        if (!r.ok) { c.checked = !c.checked; return; } const p = S.daftar.find(x => x.id === c.dataset.p); if (p) { p.checklist = r.j.checklist; p.ringkas = r.j.ringkas; const art = c.closest("[data-pid]"), h = barisHtml(p, admin, S.kini); S.html?.set(p.id, h); if (art) ganti(art, h); }   // hanya baris ini
      };
      const onSubmit = async e => {
        if (e.target.id !== "tgForm") return; e.preventDefault();
        const g = q("#tgGalat"), tombol = q("#tgKirim"), nama = q("#tgNama").value.trim(); g.hidden = true; tombol.disabled = true;
        const r = await api("POST", `/api/instansi/penugasan/${t.id}`, {nama, peran: q("#tgPeran").value, wa: q("#tgWa").value.trim(), orang: Number(q("#tgOrang").value) || 0, jam: Number(q("#tgJam").value)});
        tombol.disabled = false; if (!r.ok) { g.hidden = false; g.textContent = r.j.galat || "Penugasan belum bisa dibuat."; return; }
        q("#tgForm").hidden = true; q("#tgNama").value = ""; q("#tgWa").value = ""; q(".tg-hasil-wadah").innerHTML = hasilHtml(r.j, nama); muat();
      };
      wadah.addEventListener("click", onClick); wadah.addEventListener("change", onChange); wadah.addEventListener("submit", onSubmit);
      wadah.__tgOff = () => { wadah.removeEventListener("click", onClick); wadah.removeEventListener("change", onChange); wadah.removeEventListener("submit", onSubmit); };
    }
    muat();
  }
  /* layar operasi (instansi_ops.js) dimuat saat pertama dibuka bila halaman belum menaut skripnya (/admin/instansi) */
  async function bukaOps(t, admin, pembuka) {
    if (!window.InstansiOps) {
      pembuka.disabled = true;
      try {
        const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/instansi_ops.css?v=1"; document.head.append(l);
        await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "/instansi_ops.js?v=1"; sc.onload = ok; sc.onerror = () => no(new Error("skrip operasi gagal dimuat")); document.head.append(sc); });
      } catch (e) { pembuka.disabled = false; pembuka.textContent = "Layar operasi belum bisa dimuat, coba lagi"; return; }
      pembuka.disabled = false;
    }
    window.InstansiOps.buka(t, {admin, pembuka});
  }
  /* tombol 🧪/🧹 Super Admin di /admin/instansi: sesudah isi/hapus dummy instansi selesai, isi/hapus juga contoh operasi lapangan (POST /api/ops/dummy), supaya layar operasi berangka.
     Handler halaman jalan lebih dulu (menonaktifkan tombol); tombol yang tidak jadi nonaktif berarti konfirmasi hapus ditolak, jadi tidak ada yang dikerjakan di sini. */
  document.addEventListener("click", e => {
    const d = e.target.closest?.("[data-dummy]"), aksi = d?.dataset.dummy; if (!d || !d.closest("#aksiJudul") || (aksi !== "isi" && aksi !== "hapus")) return;
    if (!d.disabled) return;
    const t0 = Date.now(), tunggu = async () => {
      if (d.disabled && Date.now() - t0 < 90e3) return setTimeout(tunggu, 200);
      const r = await api("POST", "/api/ops/dummy", {aksi}), p = document.getElementById("aiPesan");
      if (p) p.textContent += r.ok ? ` Operasi lapangan: contoh ${aksi === "isi" ? "terisi" : "dihapus"}.` : ` Operasi lapangan: ${r.status === 503 ? "migrasi belum diterapkan" : r.j.galat || "gagal"}.`;
    };
    setTimeout(tunggu, 200);
  });
  document.addEventListener("visibilitychange", () => aktif?.lihat?.());
  window.Tugaskan = {pasang: (t, w) => pasangInti(t, w, false), pasangAdmin: (t, w) => pasangInti(t, w, true), lepas: () => { if (aktif?.timer) clearInterval(aktif.timer); aktif = null; ++gen; },
    popupMasuk, ringkasan, titikWilayah, padamPil, padamBlok, exifInfo, keadaan};
})();
