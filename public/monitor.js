/* Monitor Deteksi Api (/monitor). API: GET /api/titik (publik), GET /api/monitor?bencana=karhutla|banjir (sesi), GET /api/pantau/ringkas (publik), POST /api/monitor/baca.
   Alarm: deteksi baru dengan keyakinan >= 1 -> suara 2x + popup (+ Notification bila tab tersembunyi). */
(() => {
  "use strict";
  const PROV = {"11":"Aceh","12":"Sumatera Utara","13":"Sumatera Barat","14":"Riau","15":"Jambi","16":"Sumatera Selatan","17":"Bengkulu","18":"Lampung","19":"Kepulauan Bangka Belitung","21":"Kepulauan Riau","31":"DKI Jakarta","32":"Jawa Barat","33":"Jawa Tengah","34":"DI Yogyakarta","35":"Jawa Timur","36":"Banten","51":"Bali","52":"Nusa Tenggara Barat","53":"Nusa Tenggara Timur","61":"Kalimantan Barat","62":"Kalimantan Tengah","63":"Kalimantan Selatan","64":"Kalimantan Timur","65":"Kalimantan Utara","71":"Sulawesi Utara","72":"Sulawesi Tengah","73":"Sulawesi Selatan","74":"Sulawesi Tenggara","75":"Gorontalo","76":"Sulawesi Barat","81":"Maluku","82":"Maluku Utara","91":"Papua","92":"Papua Barat","93":"Papua Selatan","94":"Papua Tengah","95":"Papua Pegunungan","96":"Papua Barat Daya"};
  const SAT = {M: "MODIS", N: "VIIRS S-NPP", N20: "NOAA-20", N21: "NOAA-21"};
  const KEY = ["Rendah", "Sedang", "Tinggi"], KEL = ["", "s", "t"];
  const HAL = 100, MAKS_SEEN = 20000, JARAK_KM = 2, SUARA = "/suara/alarm-api.mp3";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const bacaL = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
  const tulisL = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const wib = ms => new Date(ms + 7 * 36e5);
  const p2 = n => String(n).padStart(2, "0");
  const jam = ms => { const d = wib(ms); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
  const tglJam = ms => { const d = wib(ms); return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)} ${jam(ms)}`; };
  const koord = (lat, lon) => `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? "LS" : "LU"}, ${Math.abs(lon).toFixed(5)}° BT`;
  const namaProv = k => PROV[k] || ("Provinsi " + k);
  const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };

  /* dimuat sebagai tab di beranda (iframe): kepala situs disembunyikan, tema ikut induk */
  if (self !== top) { document.documentElement.classList.add("tertanam");
    try { const P = parent.document.documentElement, ikut = () => { if (P.dataset.theme) document.documentElement.dataset.theme = P.dataset.theme; };
      ikut(); new MutationObserver(ikut).observe(P, {attributes: true, attributeFilter: ["data-theme"]}); } catch (e) {} }
  const IK = d => `<svg class="mn-ik" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const kosong = (n, ik, judul, isi) => `<tr><td colspan="${n}" class="mn-kosong"><div>${IK(ik)}<b>${judul}</b>${isi}</div></td></tr>`;
  const sat = (kelas, teks) => { const e = $("mnSat"); e.className = "mn-status " + kelas; e.innerHTML = `<i></i>${esc(teks)}`; };
  let dimuat = false, judulApi = "Deteksi api terbaru", judulBj = "Status banjir";
  let dets = [], pihak = "", hal = 0, tampil = [], terbuka = new Set(), baru = [], wa = null;
  const TG = {karhutla: null, banjir: null}, kejBaru = {karhutla: [], banjir: []}, BENCANA = ["karhutla", "banjir"];
  let sel = new URLSearchParams(location.search).get("bencana") || bacaL("mn_bencana", "karhutla"); if (!BENCANA.includes(sel) && sel !== "status") sel = "karhutla";   // ?bencana=banjir dari pengalihan pemirsa

  /* ---------- deteksi ---------- */
  function urai(j) {
    const w = j.wilayah || [], t0 = Date.parse(j.acuan);
    return (j.baris || []).map(b => {
      const [pk, kab, kec] = (w[b[6]] || "||").split("|"), ms = t0 + Math.round(b[2] * 36e5);
      return {lat: b[0], lon: b[1], ms, sensor: b[3], frp: b[4], key: b[5], pk, kab, kec, id: `${b[0]}|${b[1]}|${b[3]}|${ms}`};
    }).sort((a, b) => b.ms - a.ms);
  }
  const bacaSeen = () => { try { const j = JSON.parse(localStorage.getItem("mn_seen")); return Array.isArray(j) ? j : null; } catch (e) { return null; } };
  /* Mengembalikan deteksi baru. Muat pertama kali (belum ada mn_seen): hanya menanam, tanpa alarm. */
  function cekBaru(list) {
    const lama = bacaSeen(), set = new Set(lama || []);
    const hasil = lama ? list.filter(d => !set.has(d.id)) : [];
    if (!lama || hasil.length) {
      for (const d of list) set.add(d.id);
      tulisL("mn_seen", JSON.stringify([...set].slice(-MAKS_SEEN)));
    }
    return hasil;
  }

  /* ---------- alarm ---------- */
  let audio = null, jalan = 0;
  const suaraAktif = () => bacaL("mn_suara", "") === "1";
  function putar2x() {
    if (!suaraAktif()) return;
    try {
      audio = audio || new Audio(SUARA);
      audio.onended = null; let sisa = 2;
      const main = () => { audio.currentTime = 0; jalan++; audio.play().catch(() => {}); };
      audio.onended = () => { if (--sisa > 0) main(); else audio.onended = null; };
      main();
    } catch (e) {}
  }
  function notif(judul, isi, tag) {
    if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification(judul, {body: isi, tag}); } catch (e) {}
  }
  function alarm(list) {
    const kuat = list.filter(d => d.key >= 1);
    if (!kuat.length) return;
    baru = baru.concat(kuat);
    putar2x(); notif("Deteksi api baru", `${kuat.length} deteksi baru (sedang atau tinggi)`, "mn-api"); popup();
  }
  function dekat() {
    return (TG.karhutla || []).filter(t => t.status === "buka" && baru.some(d => km(t.lat, t.lon, d.lat, d.lon) <= JARAK_KM));
  }
  const LV = t => t.level ?? t.tingkat;
  const bacaPil = (n, a) => `<span class="mn-p ${a && a.length ? "h" : "t"}">${n} ${a && a.length ? "sudah baca" : "belum baca"}</span>`;
  function bagDet() {
    const tugas = TG.karhutla, tg = baru.filter(d => d.key === 2).length, sd = baru.length - tg, kab = new Map();
    for (const d of baru) { const k = `${d.kab}, ${namaProv(d.pk)}`; kab.set(k, (kab.get(k) || 0) + 1); }
    const top = [...kab].sort((a, b) => b[1] - a[1]).slice(0, 5), tdk = dekat();
    /* sudah terlapor = ada kejadian (status apa pun) yang dipantau dalam JARAK_KM dari deteksi itu; tanpa sesi tugas tak diketahui */
    const terlapor = d => tugas.some(t => km(t.lat, t.lon, d.lat, d.lon) <= JARAK_KM);
    const blm = tugas ? baru.filter(d => !terlapor(d)) : [], blmKab = new Map();
    for (const d of blm) { const k = `${d.kec ? "Kec. " + d.kec + ", " : ""}${d.kab}, ${namaProv(d.pk)}`; blmKab.set(k, (blmKab.get(k) || 0) + 1); }
    const cekLapor = !tugas ? `<p class="mn-kecil">Masuk sebagai staf BNPB atau BPBD untuk mengecek apakah deteksi ini sudah terlapor.</p>`
      : `<p><span class="mn-p t">${blm.length} belum terlapor</span> <span class="mn-p h">${baru.length - blm.length} sudah terlapor</span></p>`
        + (blm.length ? `<ul>${[...blmKab].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `<li>${esc(k)}: ${n}</li>`).join("")}</ul>` : "");
    return `<p><span class="mn-p t">${tg} tinggi</span> <span class="mn-p s">${sd} sedang</span></p>
      <div><b>Sudah terlapor?</b>${cekLapor}</div>
      <div><b>Kabupaten terbanyak</b><ul>${top.map(([k, n]) => `<li>${esc(k)}: ${n}</li>`).join("")}</ul></div>
      <div><b>Tugas terbuka dalam ${JARAK_KM} km</b>${tdk.length ? `<ul>${tdk.map(t => `<li>${esc(t.kec)}, ${esc(t.kab)}, ${esc(t.prov_nama || namaProv(t.prov))}</li>`).join("")}</ul>` : `<p class="mn-kecil">Tidak ada.</p>`}</div>`;
  }
  function bagKej(b) {
    const l = kejBaru[b]; if (!l.length) return "";
    return `<div><b>${l.length} kejadian ${b} baru</b><ul>${l.slice(0, 8).map(t => `<li>${esc(t.kec)}, ${esc(t.kab)}, ${esc(t.prov_nama || namaProv(t.prov))} ${LV(t) != null ? `<span class="mn-p s">${esc(LV(t))}</span> ` : ""}${bacaPil("Dalops", t.baca?.dalops)} ${bacaPil("BPBD", t.baca?.bpbd)}</li>`).join("")}</ul>${l.length > 8 ? `<p class="mn-kecil">Dan ${l.length - 8} lainnya.</p>` : ""}</div>`;
  }
  const idBaca = () => [...new Set([...dekat().map(t => t.id), ...BENCANA.flatMap(b => kejBaru[b].map(t => t.id))])];
  function popup() {
    const jd = [];
    if (baru.length) jd.push(`<b>${baru.length}</b> deteksi api baru`);
    if (bjBaru.length) jd.push(`<b>${bjBaru.length}</b> kecamatan siaga banjir baru`);
    for (const b of BENCANA) if (kejBaru[b].length) jd.push(`<b>${kejBaru[b].length}</b> kejadian ${b} baru`);
    $("mnMJ").innerHTML = jd.join(", ");
    $("mnMIsi").innerHTML = (baru.length ? bagDet() : "") + bagBj() + BENCANA.map(bagKej).join("");
    $("mnBaca").hidden = !pihak || pihak === "pemirsa" || !idBaca().length;
    $("mnModal").hidden = false; $("mnTutup").focus();
  }
  function tutup() { $("mnModal").hidden = true; baru = []; kejBaru.karhutla = []; kejBaru.banjir = []; bjBaru = []; }
  async function sudahDibaca() {
    const ids = idBaca(); $("mnBaca").disabled = true;
    try { await fetch("/api/monitor/baca", {method: "POST", headers: {"x-pb": "1", "content-type": "application/json"}, body: JSON.stringify({tugas: ids})}); } catch (e) {}
    $("mnBaca").disabled = false; tutup(); muatSemua();
  }
  async function aktifkan() {
    tulisL("mn_suara", "1");
    try { const a = audio = audio || new Audio(SUARA); a.volume = 0; await a.play().catch(() => {}); a.pause(); a.currentTime = 0; a.volume = 1; } catch (e) {}
    try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch (e) {}
    tombolSuara();
  }
  function tombolSuara() { const b = $("mnSuara"), on = suaraAktif(); b.querySelector("span").textContent = on ? "Suara dan notifikasi aktif" : "Aktifkan suara dan notifikasi"; b.classList.toggle("aktif", on); }

  /* ---------- tabel deteksi (dipaginasi, 100 baris per halaman) ---------- */
  function saring() {
    const p = $("mnFProv").value, k = $("mnFKey").value, batas = Date.now() - 864e5;
    tampil = dets.filter(d => d.ms >= batas && (!p || d.pk === p) && (k === "" || d.key === +k));
  }
  function gambarDet() {
    const n = tampil.length, tot = Math.max(1, Math.ceil(n / HAL)); hal = Math.min(hal, tot - 1);
    $("mnDet").innerHTML = n ? tampil.slice(hal * HAL, hal * HAL + HAL).map(d =>
      `<tr><td>${tglJam(d.ms)}</td><td>${esc(namaProv(d.pk))}</td><td>${esc(d.kab)}</td><td>${esc(d.kec)}</td><td>${esc(SAT[d.sensor] || d.sensor)}</td><td class="k">${d.frp == null ? "" : (+d.frp).toFixed(1)}</td><td><span class="mn-p ${KEL[d.key]}">${KEY[d.key] || ""}</span></td><td class="mn-koord">${koord(d.lat, d.lon)}</td></tr>`).join("")
      : !dimuat ? kosong(8, '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>', "Data satelit belum masuk", "Halaman mencoba lagi tiap 5 menit.")
      : dets.length ? kosong(8, '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', "Tidak ada deteksi pada saringan ini", "Coba provinsi atau keyakinan lain.")
      : kosong(8, '<path d="M20 6 9 17l-5-5"/>', "Tidak ada deteksi api dalam 24 jam terakhir", "");
    judulApi = dimuat ? `<b>${n.toLocaleString("id-ID")}</b> deteksi api dalam 24 jam terakhir` : "Deteksi api terbaru"; atas();
    $("mnHal").textContent = n ? `Menampilkan ${(hal * HAL + 1).toLocaleString("id-ID")}–${Math.min(n, hal * HAL + HAL).toLocaleString("id-ID")} dari ${n.toLocaleString("id-ID")} deteksi` : "";
    $("mnHal").parentElement.hidden = tot <= 1;
    $("mnPrev").disabled = hal === 0; $("mnNext").disabled = hal >= tot - 1;
  }
  function isiProv() {
    const s = $("mnFProv"), v = s.value, ada = [...new Set(dets.map(d => d.pk))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    s.innerHTML = `<option value="">Semua provinsi</option>` + ada.map(k => `<option value="${esc(k)}">${esc(namaProv(k))}</option>`).join(""); s.value = v;
  }
  const nanti = f => (window.requestIdleCallback || (g => setTimeout(g, 1)))(f);
  function ubahFilter() { hal = 0; nanti(() => { saring(); gambarDet(); }); }   // kontrol (select) urgent; tabel ditunda

  /* ---------- tindak lanjut ---------- */
  const pilBaca = a => a && a.length ? (l => `<span class="mn-p h">${esc(l.nama)}, ${jam(l.waktu)}</span>`)(a.reduce((x, y) => y.waktu > x.waktu ? y : x)) : `<span class="mn-p t">Belum</span>`;
  const HASIL = {karhutla: {api_ada: ["Api ada", "t"], bukan_api: ["Bukan api", ""], sudah_padam: ["Sudah padam", "h"]},
    banjir: {banjir_ada: ["Banjir ada", "t"], api_ada: ["Banjir ada", "t"], bukan_banjir: ["Bukan banjir", ""], bukan_api: ["Bukan banjir", ""], sudah_surut: ["Sudah surut", "h"], sudah_padam: ["Sudah surut", "h"]}};
  const STATUS = {karhutla: {buka: ["Terbuka", "s"], padam: ["Padam", "h"], bukan_api: ["Bukan api", ""]},
    banjir: {buka: ["Terbuka", "s"], surut: ["Surut", "h"], padam: ["Surut", "h"], selesai: ["Selesai", "h"], bukan_banjir: ["Bukan banjir", ""], bukan_api: ["Bukan banjir", ""]}};
  const polos = v => { const x = String(v ?? "").replace(/_/g, " ").trim(); return x.charAt(0).toUpperCase() + x.slice(1); };
  const petaS = (m, v) => m[sel][v] || [polos(v), ""];
  function foto(m, t) {
    const med = m.jenis === "video" ? `<video src="${esc(m.url)}" poster="${esc(m.thumb || "")}" controls preload="none" playsinline></video>` : `<img src="${esc(m.thumb || m.url)}" alt="" loading="lazy">`;
    const lat = m.lat ?? t.lat, lon = m.lon ?? t.lon;
    return `<div class="mn-mw">${med}<div class="mn-cap"><span><b>Kec. ${esc(m.kec || t.kec)}</b><small>${esc(m.kab || t.kab)}, ${esc(t.prov_nama || namaProv(m.prov || t.prov))}</small><small>${koord(lat, lon)}</small><small>${m.waktu_ambil ? tglJam(m.waktu_ambil) + " WIB" : ""}</small></span></div></div>`;
  }
  function rinci(t) {
    const g = t.groundcheck, x = t.tindak;
    let h = "";
    if (g) h += `<b>Groundcheck</b>, ${esc(g.oleh || g.pic_nama || "")}${g.jarak_km != null ? `, ${(+g.jarak_km).toFixed(1)} km dari titik` : ""}${g.gps_curiga ? ` <span class="mn-p t">GPS dicurigai</span>` : ""}<div class="mn-foto">${(g.media || []).map(m => foto(m, t)).join("") || `<span class="mn-kecil">Tanpa foto.</span>`}</div>`;
    if (x) h += `<b>Tindakan</b>: ${esc(x.tindakan)}${x.kendala?.length ? `, kendala: ${esc([].concat(x.kendala).join(", "))}` : ""}<div class="mn-foto">${(x.media || []).map(m => foto(m, t)).join("") || `<span class="mn-kecil">Tanpa foto.</span>`}</div>`;
    h = h || `<span class="mn-kecil">Belum ada groundcheck atau tindakan.</span>`;
    return pihak && pihak !== "pemirsa" ? h + `<p><button type="button" class="mn-tbl mn-tbl2" data-baca="${esc(t.id)}">Tandai sudah dibaca</button></p>` : h;
  }
  function gambarTugas() {
    const tb = $("mnTugas"), tugas = TG[sel], bj = sel === "banjir";
    $("mnThSejak").textContent = bj ? "Dilaporkan sejak" : "Terdeteksi sejak";
    if (!tugas) { tb.innerHTML = kosong(7, '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>', "Memuat", ""); return; }
    $("mnJudulTugas").innerHTML = `<b>${tugas.length.toLocaleString("id-ID")}</b> kejadian ${bj ? "banjir " : ""}dipantau`;
    if (!tugas.length) { tb.innerHTML = kosong(7, '<path d="M9 11l3 3 8-8"/>', "Belum ada kejadian dipantau", ""); return; }
    tb.innerHTML = tugas.map(t => {
      const g = t.groundcheck, x = t.tindak, hs = g ? petaS(HASIL, g.hasil) : null, st = petaS(STATUS, t.status);
      const buka = terbuka.has(t.id);
      return `<tr class="mn-baris" data-id="${esc(t.id)}" tabindex="0" aria-expanded="${buka}"><td><b>${esc(t.kec)}</b>, ${esc(t.kab)}, ${esc(t.prov_nama || namaProv(t.prov))}</td>
        <td>${tglJam(t.dibuat)}</td><td>${pilBaca(t.baca?.dalops)}</td><td>${pilBaca(t.baca?.bpbd)}</td>
        <td>${g ? `<span class="mn-p ${hs[1]}">${esc(hs[0])}</span> ${jam(g.waktu)}` : `<span class="mn-p t">Belum</span>`}</td>
        <td>${x ? `${esc(x.tindakan)}${x.status_api ? ` <span class="mn-kecil">(${esc(x.status_api)})</span>` : ""}` : `<span class="mn-kecil">Belum ada</span>`}</td>
        <td><span class="mn-p ${st[1]}">${esc(st[0])}</span></td></tr>${buka ? `<tr class="mn-rinci"><td colspan="7">${rinci(t)}</td></tr>` : ""}`;
    }).join("");
  }
  async function bacaSatu(b) {
    b.disabled = true;
    try { await fetch("/api/monitor/baca", {method: "POST", headers: {"x-pb": "1", "content-type": "application/json"}, body: JSON.stringify({tugas: [b.dataset.baca]})}); } catch (e) {}
    muatSemua();
  }
  function togol(e) {
    const bb = e.target.closest("[data-baca]"); if (bb) { if (e.type === "click") bacaSatu(bb); return; }
    const r = e.target.closest(".mn-baris"); if (!r || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
    if (e.type === "keydown") e.preventDefault();
    const id = r.dataset.id; terbuka.has(id) ? terbuka.delete(id) : terbuka.add(id);
    nanti(gambarTugas);
  }

  /* ---------- status banjir per kecamatan (public/banjir/data/status.json: kec["prov|kab|kec"].b[hari] = 0 Normal, 1 Waspada, 2 Siaga, 3 Awas) ---------- */
  const LVB = ["Normal", "Waspada", "Siaga", "Awas"], KLB = ["", "s", "t", "t"], HARI_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  let BJ = null, bjBaru = [];
  const tglPdk = t => { const d = new Date(t + "T00:00:00Z"); return `${HARI_ID[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
  const kunciKec = (p, k, c) => `${p}|${String(k).toLowerCase()}|${String(c).toLowerCase()}`;
  /* sudah terlapor = ada kejadian banjir yang dipantau di kecamatan yang sama; tanpa sesi tugas tak diketahui */
  function lapBj() { const s = new Set(); for (const t of TG.banjir || []) s.add(kunciKec(t.prov, t.kab, t.kec)); return s; }
  function bjBaris() {
    if (!BJ) return [];
    const p = $("mnBProv").value, lv = +$("mnBLv").value, h = +$("mnBHari").value;
    return BJ.kec.filter(x => x.b[h] >= lv && (!p || x.pk === p)).sort((a, b) => b.b[h] - a.b[h] || (b.h3 || 0) - (a.h3 || 0));
  }
  function gambarBj() {
    if (!BJ) return;
    const L = bjBaris(), h = +$("mnBHari").value, lap = lapBj(), ada = !!TG.banjir, MAKS = 200;
    const pil = v => `<span class="mn-p ${KLB[v]}">${LVB[v] || ""}</span>`;
    $("mnBj").innerHTML = L.length ? L.slice(0, MAKS).map(x => { const pk = Math.max(...x.b), hk = x.b.indexOf(pk);
      return `<tr><td>${esc(namaProv(x.pk))}</td><td>${esc(x.kab)}</td><td><b>${esc(x.kec)}</b></td><td>${pil(x.b[h])}</td><td>${pil(pk)} <span class="mn-kecil">${tglPdk(BJ.hari[hk])}</span></td>
        <td class="k">${x.h3 == null ? "" : (+x.h3).toLocaleString("id-ID", {maximumFractionDigits: 0}) + " mm"}</td>
        <td>${!ada ? `<span class="mn-kecil">Masuk dulu</span>` : lap.has(kunciKec(x.pk, x.kab, x.kec)) ? `<span class="mn-p h">Sudah</span>` : `<span class="mn-p t">Belum</span>`}</td></tr>`; }).join("")
      : kosong(7, '<path d="M20 6 9 17l-5-5"/>', "Tidak ada kecamatan pada tingkat ini", "Coba tingkat atau hari lain.");
    $("mnBHal").textContent = L.length > MAKS ? `Menampilkan ${MAKS} dari ${L.length.toLocaleString("id-ID")} kecamatan, urut tingkat lalu hujan` : "";
    const s2 = BJ.kec.filter(x => x.b[0] >= 2).length;
    judulBj = `<b>${s2.toLocaleString("id-ID")}</b> kecamatan siaga banjir hari ini`; atas();
  }
  function isiBj() {
    const s = $("mnBProv"), v = s.value, ada = [...new Set(BJ.kec.map(x => x.pk))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    s.innerHTML = `<option value="">Semua provinsi</option>` + ada.map(k => `<option value="${esc(k)}">${esc(namaProv(k))}</option>`).join(""); s.value = v;
    const hs = $("mnBHari"), hv = hs.value; hs.innerHTML = BJ.hari.map((t, i) => `<option value="${i}">${i === 0 ? "Hari ini" : i === 1 ? "Besok" : tglPdk(t)}</option>`).join(""); hs.value = hv || "0";
  }
  /* kecamatan yang baru naik ke Siaga atau Awas hari ini: alarm; muat pertama hanya menanam */
  function cekBj() {
    const hari = BJ.hari[0], id = x => `${hari}|${x.pk}|${x.kab}|${x.kec}`, kini = BJ.kec.filter(x => x.b[0] >= 2);
    let lama = null; try { const j = JSON.parse(localStorage.getItem("mn_seen_bj")); if (Array.isArray(j)) lama = j; } catch (e) {}
    const set = new Set(lama || []), hasil = lama ? kini.filter(x => !set.has(id(x))) : [];
    if (!lama || hasil.length) { for (const x of kini) set.add(id(x)); tulisL("mn_seen_bj", JSON.stringify([...set].slice(-MAKS_SEEN))); }
    if (hasil.length) { bjBaru = bjBaru.concat(hasil); putar2x(); notif("Status banjir naik", `${hasil.length} kecamatan baru berstatus Siaga atau Awas`, "mn-bj"); popup(); }
  }
  function bagBj() {
    if (!bjBaru.length) return "";
    const lap = lapBj(), ada = !!TG.banjir, blm = bjBaru.filter(x => !lap.has(kunciKec(x.pk, x.kab, x.kec)));
    return `<div><b>${bjBaru.length} kecamatan baru berstatus Siaga atau Awas</b>
      ${ada ? `<p><span class="mn-p t">${blm.length} belum terlapor</span> <span class="mn-p h">${bjBaru.length - blm.length} sudah terlapor</span></p>` : `<p class="mn-kecil">Masuk sebagai staf BNPB atau BPBD untuk mengecek apakah sudah terlapor.</p>`}
      <ul>${bjBaru.slice(0, 8).map(x => `<li>Kec. ${esc(x.kec)}, ${esc(x.kab)}, ${esc(namaProv(x.pk))} <span class="mn-p ${KLB[x.b[0]]}">${LVB[x.b[0]]}</span></li>`).join("")}</ul>${bjBaru.length > 8 ? `<p class="mn-kecil">Dan ${bjBaru.length - 8} lainnya.</p>` : ""}</div>`;
  }
  async function muatBj() {
    try {
      const r = await fetch("/banjir/data/status.json", {cache: "no-cache"}); if (!r.ok) throw 0;
      const j = await r.json();
      BJ = {hari: j.hari || [], kec: Object.entries(j.kec || {}).map(([k, v]) => { const [pk, kab, kec] = k.split("|"); return {pk, kab, kec, b: v.b || [0], h3: v.h3}; })};
      const e = $("mnSatB"); e.className = "mn-status ok"; e.innerHTML = `<i></i>Status banjir ${esc(tglPdk(BJ.hari[0]))} sampai ${esc(tglPdk(BJ.hari.at(-1)))}, diperbarui harian`;
      isiBj(); gambarBj(); cekBj();
    } catch (x) { const e = $("mnSatB"); e.className = "mn-status gagal"; e.innerHTML = "<i></i>Status banjir gagal dimuat, mencoba lagi"; }
  }
  /* ---------- status keadaan darurat semua BPBD (public/data/status_darurat.json, SK dari data.bnpb.go.id) ---------- */
  const KLS = {"Siaga Darurat": "s", "Tanggap Darurat": "t", "Transisi Darurat ke Pemulihan": "h"};
  let SD = null, judulSt = "Status keadaan darurat";
  const tglId = t => t ? t.split("-").reverse().join("/") : "";
  const jenisL = x => String(x.jenis || "").split(",").map(t => t.trim()).filter(Boolean);
  const KAT = k => /Kering/.test(k) ? "kk" : /Geologi/.test(k) && !/Basah/.test(k) ? "kg" : /Hidro/.test(k) ? "kb" : "";
  const urutSt = {k: "mulai", turun: true};
  /* ikon status dan jenis bencana (29 Okt): ikon + label, judul penuh di title */
  const SV = d => `<svg class="mn-ik" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IK_ST = {"Siaga Darurat": SV('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
    "Tanggap Darurat": SV('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
    "Transisi Darurat ke Pemulihan": SV('<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/>')};
  const IK_JN = [[/banjir/i, '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>'],
    [/longsor/i, '<path d="m3 20 6-11 4 6 2-3 6 8z"/><circle cx="17" cy="6" r="1.5"/>'],
    [/cuaca/i, '<path d="M17.5 17H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.4 10 3.5 3.5 0 0 1 17.5 17zM12 13l-2 4h4l-2 4"/>'],
    [/kebakaran/i, '<path d="M12 3c1.5 3.5 5.5 5.5 5.5 10a5.5 5.5 0 0 1-11 0c0-2 1-3.6 2.4-4.8.3 1.8 1.2 2.8 2.3 3.2C10.8 8.5 11.2 5.8 12 3z"/>'],
    [/gelombang|abrasi/i, '<path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 6c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'],
    [/kekeringan/i, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
    [/gempa/i, '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>'],
    [/erupsi|gunung/i, '<path d="m2 21 7-11h6l7 11zM10 6l1-3M14 6l-1-3M12 6V2"/>'],
    [/epidemi|wabah/i, '<circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>'],
    [/./, '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>']];
  const ikJn = t => SV(IK_JN.find(([r]) => r.test(t))[1]);
  const per = {dari: "", sampai: ""}, buka = new Set();
  function gambarSt() {
    if (!SD) return;
    const p = $("mnSProv").value, st = $("mnSSt").value, kt = $("mnSKat").value, jn = $("mnSJen").value, kini = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    const nilai = x => urutSt.k === "jenis" ? jenisL(x).length : urutSt.k === "kab" ? (x.skala === "provinsi" ? "" : x.kab || "") : String(x[urutSt.k] || "");
    const L = SD.filter(x => (!p || x.prov_kode === p) && (!st || x.status === st) && (!kt || x.klasifikasi === kt) && (!jn || jenisL(x).includes(jn))
        && (!per.dari || (x.berakhir || x.mulai || "") >= per.dari) && (!per.sampai || (x.mulai || "") <= per.sampai))
      .sort((a, b) => { const u = nilai(a), v = nilai(b); if (!u !== !v) return u ? -1 : 1;   /* kosong selalu di bawah */
        const c = typeof u === "number" ? u - v : u.localeCompare(v, "id", {numeric: true}); return urutSt.turun ? -c : c; });
    /* satu grup per provinsi, urutan grup ikut urutan baris pertamanya; SK tingkat provinsi menempati baris grup */
    const G = new Map(); for (const x of L) { if (!G.has(x.prov_kode)) G.set(x.prov_kode, []); G.get(x.prov_kode).push(x); }
    const isi = (x, kab) => `<td>${kab}</td>
      <td><span class="mn-sti ${KLS[x.status] || ""}${x.berakhir && x.berakhir >= kini ? " on" : ""}" title="${esc(x.status)}${x.berakhir && x.berakhir >= kini ? ", masih berlaku" : ""}" aria-label="${esc(x.status)}">${IK_ST[x.status] || ""}</span></td>
      <td>${x.klasifikasi ? `<span class="mn-p ${KAT(x.klasifikasi)}">${esc(x.klasifikasi)}</span>` : ""}</td>
      <td class="mn-jenis">${jenisL(x).map(t => `<span class="mn-p mn-jn">${ikJn(t)}${esc(t)}</span>`).join("")}</td><td>${tglId(x.mulai)}</td><td>${tglId(x.berakhir)}</td>
      <td>${x.tautan ? `<a class="mn-ikb" href="${esc(x.tautan)}" target="_blank" rel="noopener" title="${esc(x.nomor)}" aria-label="Buka SK ${esc(x.nomor)}">${IK_SK}</a>` : ""}</td>
      <td><a class="mn-ikb mn-ikwa" href="${esc(waSt(x))}" target="_blank" rel="noopener noreferrer" title="${noBpbd(x) ? "WhatsApp Pusdalops BPBD" : "Kirim lewat WhatsApp"}" aria-label="WhatsApp ${esc(x.kab || x.prov)}">${IK_WA}</a></td>`;
    const kosongSel = '<td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
    const auto = G.size === 1;   /* satu provinsi tersaring: langsung terbuka */
    $("mnSt").innerHTML = L.length ? [...G].map(([kd, X]) => {
      const pv = X.filter(x => x.skala === "provinsi"), kb = X.filter(x => x.skala !== "provinsi"), o = auto || buka.has(kd);
      const hit = Object.keys(IK_ST).map(s => [s, kb.filter(x => x.status === s).length]).filter(([, n]) => n);
      const ring = hit.map(([s, n]) => `<span class="mn-sti mn-kcl ${KLS[s]}" title="${n} ${esc(s)}">${IK_ST[s]}<b>${n}</b></span>`).join("");
      const kepala = `<button type="button" class="mn-grp-b" data-g="${esc(kd)}" aria-expanded="${o}"${kb.length ? "" : " disabled"}><svg class="mn-ik mn-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg><b>${esc(X[0].prov)}</b></button>`;
      const ringkas = kb.length ? `<span class="mn-grp-n">${kb.length} kab/kota</span>${ring}` : "";
      const atasB = pv.length ? `<tr class="mn-grp"><td>${kepala}</td>${isi(pv[0], ringkas || '<span class="mn-grp-n">Tingkat provinsi</span>')}</tr>`
        : `<tr class="mn-grp"><td>${kepala}</td><td><span class="mn-grp-sel">${ringkas}</span></td>${kosongSel}</tr>`;
      const anak = [...pv.slice(1).map(x => [x, '<span class="mn-grp-n">SK provinsi</span>']), ...kb.map(x => [x, `<b>${esc(x.kab)}</b>`])]
        .map(([x, k]) => `<tr class="mn-anak" data-ag="${esc(kd)}"${o ? "" : " hidden"}><td></td>${isi(x, k)}</tr>`).join("");
      return atasB + anak;
    }).join("")
      : kosong(9, '<path d="M20 6 9 17l-5-5"/>', "Tidak ada status pada saringan ini", "Coba saringan atau periode lain.");
    $("mnSHal").innerHTML = `<span>${L.length.toLocaleString("id-ID")} SK di ${G.size} provinsi</span><span class="mn-leg">${Object.keys(IK_ST).map(s => `<span><span class="mn-sti mn-kcl ${KLS[s]}">${IK_ST[s]}</span>${esc(s)}</span>`).join("")}</span>`;
  }
  /* buka/tutup grup: hanya baris anak grup itu yang berganti hidden */
  $("mnSt").addEventListener("click", e => { const b = e.target.closest(".mn-grp-b"); if (!b || b.disabled) return;
    const kd = b.dataset.g, o = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", o); o ? buka.add(kd) : buka.delete(kd);
    for (const r of $("mnSt").querySelectorAll(`tr[data-ag="${CSS.escape(kd)}"]`)) r.hidden = !o; });
  /* pemilih periode ala pangantara: pil cepat + Dari/Sampai (input date native di bawah label id-ID) */
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglP = t => t ? `${+t.slice(8)} ${BLN[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}` : "";
  function aturPer(dari, sampai, pil) {
    per.dari = dari; per.sampai = sampai; $("mnSDari").value = dari; $("mnSSampai").value = sampai;
    $("mnSDariT").textContent = tglP(dari) || "Awal data"; $("mnSSampaiT").textContent = tglP(sampai) || "Akhir data";
    for (const b of $("mnSPil").children) b.setAttribute("aria-pressed", b.dataset.p === pil);
    nanti(gambarSt);
  }
  $("mnSPil").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return;
    const k = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), m = b.dataset.p;
    if (m === "semua") aturPer("", "", m); else if (m === "kini") aturPer(k, k, m);
    else if (m === "30") aturPer(new Date(Date.now() + 7 * 36e5 - 30 * 864e5).toISOString().slice(0, 10), k, m);
    else aturPer(k.slice(0, 4) + "-01-01", k.slice(0, 4) + "-12-31", m); });
  for (const id of ["mnSDari", "mnSSampai"]) {
    $(id).addEventListener("change", () => aturPer($("mnSDari").value, $("mnSSampai").value, ""));
    $(id).addEventListener("click", e => { try { e.currentTarget.showPicker(); } catch (x) {} });
  }
  /* aksi WA: nomor Pusdalops BPBD dari data/bpbd.json (publik, BNPB); tanpa nomor, wa.me memilih kontak sendiri */
  const IK_SK = '<svg class="mn-ik" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
  const IK_WA = '<svg class="mn-ik" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.5z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2.2-1-1 .8c-1-.4-1.9-1.3-2.3-2.3l.8-1-1-2.2z"/></svg>';
  let BP = new Map();
  const nmK = t => String(t || "").toLowerCase().replace(/^(kabupaten|kab\.?)\s+/, "").trim();
  const noHp = t => { const d = String(t || "").replace(/\D/g, ""); return /^08\d{8,12}$/.test(d) ? "62" + d.slice(1) : /^628\d{8,12}$/.test(d) ? d : ""; };
  const noBpbd = x => BP.get(x.prov_kode + "|" + (x.skala === "provinsi" ? "provinsi" : nmK(x.kab))) || "";
  const waSt = x => { const n = noBpbd(x), w = x.skala === "provinsi" ? "Provinsi " + x.prov : x.kab + ", " + x.prov;
    return `https://wa.me/${n}?text=${encodeURIComponent(`Status ${x.status} ${w}, SK ${x.nomor}, berlaku ${tglId(x.mulai)} sampai ${tglId(x.berakhir)}. Mohon pembaruan situasi terkini.`)}`; };
  async function muatBpbd() {
    try { const j = await (await fetch("/data/bpbd.json")).json();
      for (const k of j.kantor || []) { const n = noHp(k.pusdalops); if (!n) continue;
        const kunci = k.prov + "|" + (/provinsi/i.test(k.nama) ? "provinsi" : nmK(k.kab)); if (!BP.has(kunci)) BP.set(kunci, n); }
    } catch (x) {}
  }
  async function muatSt() {
    const e = $("mnSatS");
    try {
      const r = await fetch("/data/status_darurat.json", {cache: "no-cache"}); if (!r.ok) throw 0;
      await muatBpbd(); const j = await r.json(); SD = (j.sk || []).slice().sort((a, b) => (b.mulai || "").localeCompare(a.mulai || ""));
      const s = $("mnSProv"), ada = [...new Map(SD.map(x => [x.prov_kode, x.prov])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
      s.innerHTML = `<option value="">Semua provinsi</option>` + ada.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("");
      const hit = f => [...SD.flatMap(f).reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).map(([t]) => `<option>${esc(t)}</option>`).join("");
      $("mnSKat").innerHTML = `<option value="">Semua kategori</option>` + hit(x => x.klasifikasi ? [x.klasifikasi] : []);
      $("mnSJen").innerHTML = `<option value="">Semua jenis bencana</option>` + hit(jenisL);
      const nP = SD.filter(x => x.skala === "provinsi").length;
      judulSt = `<b>${SD.length.toLocaleString("id-ID")}</b> status keadaan darurat`;
      e.className = "mn-status ok"; e.innerHTML = `<i></i>${nP} provinsi dan ${SD.length - nP} kab/kota, tahun ${esc((j.tahun || []).join(", "))}, sumber BNPB`;
      atas(); gambarSt();
    } catch (x) { e.className = "mn-status gagal"; e.innerHTML = "<i></i>Status keadaan darurat gagal dimuat"; }
  }
  /* kepala halaman mengikuti bencana terpilih */
  function atas() {
    const api = sel === "karhutla", bj = sel === "banjir", st = sel === "status";
    $("mnJudulDet").innerHTML = api ? judulApi : bj ? judulBj : judulSt;
    $("mnSat").hidden = !api; $("mnSatB").hidden = !bj; $("mnSatS").hidden = !st;
    $("mnKartuApi").hidden = !api; $("mnKartuBanjir").hidden = !bj; $("mnKartuStatus").hidden = !st; $("mnTugasKartu").hidden = st;
    if (st) $("mnMasuk").hidden = true;   // kembali dari Status: muatMonitor menampilkannya lagi bila belum masuk
  }

  /* ---------- muat & polling ---------- */
  async function muatTitik() {
    try {
      const r = await fetch("/api/titik", {cache: "no-cache"}); if (!r.ok) { sat("gagal", "Data satelit belum tersedia, mencoba lagi tiap 5 menit"); gambarDet(); return; }
      const j = await r.json(); dets = urai(j); dimuat = true;
      sat("ok", `Data satelit diperbarui ${jam(Date.parse(j.dibuat || j.acuan))} WIB`);
      const b = cekBaru(dets); isiProv(); saring(); gambarDet();
      if (b.length) alarm(b);
    } catch (e) { sat("gagal", "Data satelit gagal dimuat, mencoba lagi"); }
  }
  function bacaSeenT(b) { try { const j = JSON.parse(localStorage.getItem("mn_seen_t_" + b)); return Array.isArray(j) ? j : null; } catch (e) { return null; } }
  /* kejadian baru per bencana; muat pertama (belum ada daftar): hanya menanam, tanpa alarm */
  function cekTugas(b, list) {
    const lama = bacaSeenT(b), set = new Set(lama || []), hasil = lama ? list.filter(t => !set.has(t.id)) : [];
    if (!lama || hasil.length) { for (const t of list) set.add(t.id); tulisL("mn_seen_t_" + b, JSON.stringify([...set].slice(-MAKS_SEEN))); }
    return hasil;
  }
  async function muatMonitor(b) {
    try {
      const r = await fetch("/api/monitor?bencana=" + b, {cache: "no-store"});
      if (r.status === 401) { TG[b] = null; if (b === sel) { $("mnMasuk").hidden = false; $("mnGulir").hidden = true; } return; }
      if (!r.ok) { if (b === sel) { $("mnGulir").hidden = false; $("mnTugas").innerHTML = kosong(7, '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>', "Data tindak lanjut belum tersedia", "Coba lagi sebentar."); } return; }
      const j = await r.json(), list = j.tugas || []; pihak = j.pihak || ""; TG[b] = list;
      $("mnSaya").textContent = j.saya ? [j.saya.nama, j.saya.unit].filter(Boolean).join(", ") : "";
      if (b === sel) { $("mnMasuk").hidden = true; $("mnGulir").hidden = false; gambarTugas(); }
      if (b === "banjir" && BJ) nanti(gambarBj);
      const n = cekTugas(b, list);
      if (n.length) { kejBaru[b] = kejBaru[b].concat(n); putar2x(); notif(`Kejadian ${b} baru`, `${n.length} kejadian ${b} baru`, "mn-" + b); popup(); }
    } catch (e) {}
  }
  const muatSemua = () => Promise.all(BENCANA.map(muatMonitor));
  /* ringkasan publik per bencana: terlihat juga sebelum masuk */
  async function muatRingkas() {
    const b = sel, e = $("mnRingkas");
    if (b === "status") return;
    try {
      const r = await fetch("/api/pantau/ringkas?bencana=" + b, {cache: "no-store"});
      if (!r.ok) { if (b === sel) e.hidden = true; return; }
      const j = await r.json(); if (b !== sel) return;
      const t = j.total || {}, n = v => (+v || 0).toLocaleString("id-ID"), pl = (v, l) => `<span class="mn-p"><b>${n(v)}</b>&nbsp;${l}</span>`;
      e.innerHTML = `<span class="mn-ang"><b>${n(t.kejadian)}</b> kejadian</span>${pl(t.dimonitor, "dimonitor Dalops")}${pl(t.diinfokan, "diinfokan ke BPBD")}${pl(t.groundcheck, "groundcheck")}${pl(t.tindak, "tindak lanjut")}${pl(t.selesai, "selesai")}`;
      e.hidden = false; wa = j.wa || null; kontak();
    } catch (x) { if (b === sel) e.hidden = true; }
  }
  function kontak() { for (const a of document.querySelectorAll(".mn-wa")) { a.hidden = !wa; if (wa) a.href = "https://wa.me/" + encodeURIComponent(wa); } }
  function aturSeg() { for (const k of document.querySelectorAll("#mnSeg [data-b]")) k.setAttribute("aria-pressed", k.dataset.b === sel); }
  function pilihB(b) {   // chrome (tombol) urgent; tabel ditunda
    if (b === sel) return;
    sel = b; tulisL("mn_bencana", b); aturSeg(); atas(); $("mnRingkas").hidden = true;
    if (b === "status") { if (!SD) muatSt(); return; }
    nanti(gambarTugas); muatMonitor(b); muatRingkas();
  }

  $("mnSuara").onclick = aktifkan; $("mnTutup").onclick = tutup;
  $("mnSeg").onclick = e => { const k = e.target.closest("[data-b]"); if (k) pilihB(k.dataset.b); }; $("mnBaca").onclick = sudahDibaca;
  $("mnFProv").onchange = $("mnFKey").onchange = ubahFilter;
  $("mnSProv").onchange = $("mnSSt").onchange = $("mnSKat").onchange = $("mnSJen").onchange = () => nanti(gambarSt);
  $("mnSKepala").addEventListener("click", e => { const b = e.target.closest("[data-u]"); if (!b) return;
    const k = b.dataset.u; urutSt.turun = urutSt.k === k ? !urutSt.turun : k === "mulai" || k === "berakhir" || k === "jenis"; urutSt.k = k;
    $("mnSKepala").querySelectorAll("th").forEach(th => th.setAttribute("aria-sort", th.contains(b) ? (urutSt.turun ? "descending" : "ascending") : "none"));   /* chrome urgent */
    nanti(gambarSt); });
  $("mnBProv").onchange = $("mnBLv").onchange = $("mnBHari").onchange = () => nanti(gambarBj);
  $("mnPrev").onclick = () => { hal--; gambarDet(); }; $("mnNext").onclick = () => { hal++; gambarDet(); };
  $("mnTugas").addEventListener("click", togol); $("mnTugas").addEventListener("keydown", togol);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("mnModal").hidden) tutup(); });
  tombolSuara(); if (typeof PilihCantik !== "undefined") PilihCantik.pasang();
  aturSeg(); atas(); muatRingkas(); muatBj(); if (sel === "status") muatSt();
  muatSemua().then(muatTitik);   // tugas dulu supaya popup pertama sudah tahu tugas terdekat
  setInterval(muatTitik, 5 * 6e4); setInterval(muatSemua, 2 * 6e4); setInterval(muatRingkas, 5 * 6e4); setInterval(muatBj, 30 * 6e4);
})();
