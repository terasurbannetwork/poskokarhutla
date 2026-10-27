/* Monitor Deteksi Api (/monitor). API: GET /api/titik (publik), GET /api/monitor (sesi), POST /api/monitor/baca.
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

  let dets = [], tugas = null, pihak = "", hal = 0, tampil = [], terbuka = new Set(), baru = [];

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
  function notif(n) {
    if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification("Deteksi api baru", {body: `${n} deteksi baru (sedang atau tinggi)`, tag: "mn-api"}); } catch (e) {}
  }
  function alarm(list) {
    const kuat = list.filter(d => d.key >= 1);
    if (!kuat.length) return;
    baru = baru.concat(kuat);
    putar2x(); notif(kuat.length); popup();
  }
  function dekat() {
    return (tugas || []).filter(t => t.status === "buka" && baru.some(d => km(t.lat, t.lon, d.lat, d.lon) <= JARAK_KM));
  }
  function popup() {
    const tg = baru.filter(d => d.key === 2).length, sd = baru.length - tg, kab = new Map();
    for (const d of baru) { const k = `${d.kab}, ${namaProv(d.pk)}`; kab.set(k, (kab.get(k) || 0) + 1); }
    const top = [...kab].sort((a, b) => b[1] - a[1]).slice(0, 5), tdk = dekat();
    $("mnMJ").innerHTML = `<b>${baru.length}</b> deteksi api baru`;
    $("mnMIsi").innerHTML = `<p><span class="mn-p t">${tg} tinggi</span> <span class="mn-p s">${sd} sedang</span></p>
      <div><b>Kabupaten terbanyak</b><ul>${top.map(([k, n]) => `<li>${esc(k)}: ${n}</li>`).join("")}</ul></div>
      <div><b>Tugas terbuka dalam ${JARAK_KM} km</b>${tdk.length ? `<ul>${tdk.map(t => `<li>${esc(t.kec)}, ${esc(t.kab)}, ${esc(t.prov_nama || namaProv(t.prov))}</li>`).join("")}</ul>` : `<p class="mn-kecil">Tidak ada.</p>`}</div>`;
    $("mnBaca").hidden = !tdk.length || !pihak;
    $("mnModal").hidden = false; $("mnTutup").focus();
  }
  function tutup() { $("mnModal").hidden = true; baru = []; }
  async function sudahDibaca() {
    const ids = dekat().map(t => t.id); $("mnBaca").disabled = true;
    try { await fetch("/api/monitor/baca", {method: "POST", headers: {"x-pb": "1", "content-type": "application/json"}, body: JSON.stringify({tugas: ids})}); } catch (e) {}
    $("mnBaca").disabled = false; tutup(); muatMonitor();
  }
  async function aktifkan() {
    tulisL("mn_suara", "1");
    try { const a = audio = audio || new Audio(SUARA); a.volume = 0; await a.play().catch(() => {}); a.pause(); a.currentTime = 0; a.volume = 1; } catch (e) {}
    try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch (e) {}
    tombolSuara();
  }
  function tombolSuara() { const b = $("mnSuara"), on = suaraAktif(); b.textContent = on ? "Suara dan notifikasi aktif" : "Aktifkan suara dan notifikasi"; b.classList.toggle("aktif", on); }

  /* ---------- tabel deteksi (dipaginasi, 100 baris per halaman) ---------- */
  function saring() {
    const p = $("mnFProv").value, k = $("mnFKey").value, batas = Date.now() - 864e5;
    tampil = dets.filter(d => d.ms >= batas && (!p || d.pk === p) && (k === "" || d.key === +k));
  }
  function gambarDet() {
    const n = tampil.length, tot = Math.max(1, Math.ceil(n / HAL)); hal = Math.min(hal, tot - 1);
    $("mnDet").innerHTML = n ? tampil.slice(hal * HAL, hal * HAL + HAL).map(d =>
      `<tr><td>${tglJam(d.ms)}</td><td>${esc(namaProv(d.pk))}</td><td>${esc(d.kab)}</td><td>${esc(d.kec)}</td><td>${esc(SAT[d.sensor] || d.sensor)}</td><td class="k">${d.frp == null ? "" : (+d.frp).toFixed(1)}</td><td><span class="mn-p ${KEL[d.key]}">${KEY[d.key] || ""}</span></td><td>${koord(d.lat, d.lon)}</td></tr>`).join("")
      : `<tr><td colspan="8" class="mn-kosong">Tidak ada deteksi pada filter ini.</td></tr>`;
    $("mnJudulDet").innerHTML = `<b style="color:var(--or)">${n.toLocaleString("id-ID")}</b> deteksi dalam 24 jam terakhir`;
    $("mnHal").textContent = `Halaman ${hal + 1} dari ${tot}`;
    $("mnPrev").disabled = hal === 0; $("mnNext").disabled = hal >= tot - 1;
  }
  function isiProv() {
    const s = $("mnFProv"), v = s.value, ada = [...new Set(dets.map(d => d.pk))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    s.innerHTML = `<option value="">Semua</option>` + ada.map(k => `<option value="${esc(k)}">${esc(namaProv(k))}</option>`).join(""); s.value = v;
  }
  const nanti = f => (window.requestIdleCallback || (g => setTimeout(g, 1)))(f);
  function ubahFilter() { hal = 0; nanti(() => { saring(); gambarDet(); }); }   // kontrol (select) urgent; tabel ditunda

  /* ---------- tindak lanjut ---------- */
  const pilBaca = a => a && a.length ? (l => `<span class="mn-p h">${esc(l.nama)}, ${jam(l.waktu)}</span>`)(a.reduce((x, y) => y.waktu > x.waktu ? y : x)) : `<span class="mn-p t">Belum</span>`;
  const HASIL = {api_ada: ["Api ada", "t"], bukan_api: ["Bukan api", ""], sudah_padam: ["Sudah padam", "h"]};
  const STATUS = {buka: ["Terbuka", "s"], padam: ["Padam", "h"], bukan_api: ["Bukan api", ""]};
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
    return pihak ? h + `<p><button type="button" class="mn-tbl mn-tbl2" data-baca="${esc(t.id)}">Tandai sudah dibaca</button></p>` : h;
  }
  function gambarTugas() {
    const tb = $("mnTugas");
    if (!tugas) return;
    $("mnJudulTugas").innerHTML = `<b style="color:var(--or)">${tugas.length}</b> kejadian dipantau`;
    if (!tugas.length) { tb.innerHTML = `<tr><td colspan="7" class="mn-kosong">Belum ada kejadian.</td></tr>`; return; }
    tb.innerHTML = tugas.map(t => {
      const g = t.groundcheck, x = t.tindak, hs = g ? (HASIL[g.hasil] || [g.hasil, ""]) : null, st = STATUS[t.status] || [t.status, ""];
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
    muatMonitor();
  }
  function togol(e) {
    const bb = e.target.closest("[data-baca]"); if (bb) { if (e.type === "click") bacaSatu(bb); return; }
    const r = e.target.closest(".mn-baris"); if (!r || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
    if (e.type === "keydown") e.preventDefault();
    const id = r.dataset.id; terbuka.has(id) ? terbuka.delete(id) : terbuka.add(id);
    nanti(gambarTugas);
  }

  /* ---------- muat & polling ---------- */
  async function muatTitik() {
    try {
      const r = await fetch("/api/titik", {cache: "no-cache"}); if (!r.ok) return;
      const j = await r.json(); dets = urai(j);
      $("mnSat").textContent = `Data satelit diperbarui ${jam(Date.parse(j.dibuat || j.acuan))} WIB`;
      const b = cekBaru(dets); isiProv(); saring(); gambarDet();
      if (b.length) alarm(b);
    } catch (e) { $("mnSat").textContent = "Data satelit gagal dimuat, mencoba lagi"; }
  }
  async function muatMonitor() {
    try {
      const r = await fetch("/api/monitor", {cache: "no-store"});
      if (r.status === 401) { $("mnMasuk").hidden = false; $("mnTugasKartu").hidden = true; tugas = null; return; }
      if (!r.ok) return;
      const j = await r.json(); tugas = j.tugas || []; pihak = j.pihak || "";
      $("mnMasuk").hidden = true; $("mnTugasKartu").hidden = false;
      $("mnSaya").textContent = j.saya ? [j.saya.nama, j.saya.unit].filter(Boolean).join(", ") : "";
      gambarTugas();
    } catch (e) {}
  }

  $("mnSuara").onclick = aktifkan; $("mnTutup").onclick = tutup; $("mnBaca").onclick = sudahDibaca;
  $("mnFProv").onchange = $("mnFKey").onchange = ubahFilter;
  $("mnPrev").onclick = () => { hal--; gambarDet(); }; $("mnNext").onclick = () => { hal++; gambarDet(); };
  $("mnTugas").addEventListener("click", togol); $("mnTugas").addEventListener("keydown", togol);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("mnModal").hidden) tutup(); });
  tombolSuara();
  muatMonitor().then(muatTitik);   // tugas dulu supaya popup pertama sudah tahu tugas terdekat
  setInterval(muatTitik, 5 * 6e4); setInterval(muatMonitor, 2 * 6e4);
})();
