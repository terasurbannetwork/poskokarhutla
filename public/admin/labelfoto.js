/* Admin Label kerusakan (/admin/labelfoto): manusia melabeli foto lapangan dulu, model computer vision nanti (tidak ada model, tidak ada skor AI di sini).
   Klik/pintasan 1-6 instan (INP): label diterapkan di layar SINKRON lalu foto berikutnya tampil; simpan ke server jalan di belakang (gagal = kembali ke foto itu).
   CSP admin: tanpa skrip/gaya inline; gaya di labelfoto.css. Data dari /api/labelfoto (sesi admin). */
(() => {
  const app = document.getElementById("app"), API = "/api/labelfoto";
  const KELAS = [["rusak_berat", "Rusak berat"], ["rusak_sedang", "Rusak sedang"], ["rusak_ringan", "Rusak ringan"], ["tidak_rusak", "Tidak rusak"], ["bukan_bangunan", "Bukan bangunan"], ["tidak_jelas", "Tidak jelas"]];
  const JENIS = [["rumah", "Rumah"], ["sekolah", "Sekolah"], ["ibadah", "Ibadah"], ["kesehatan", "Kesehatan"], ["jembatan", "Jembatan"], ["jalan", "Jalan"], ["lain", "Lain"]];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const tgl = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const persen = v => v == null ? "belum ada" : Math.round(v * 100) + "%";
  let contoh = false; try { contoh = sessionStorage.getItem("lf_contoh") === "1"; } catch (e) {}   // mode foto contoh (setelah 🧪), ikut ke semua panggilan
  const q = (sambung = "") => contoh ? (sambung ? "&" : "?") + "dummy=1" : "";
  const kirim = (url, body) => fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(async r => ({ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}));

  let antre = [], riwayat = [], kini = null, berikut = null, sisa = 0, memuat = false, jenis = null, saya = 0;
  const labelKu = new Map();   // sumber:id -> kelas yang saya beri (untuk ubah label)
  const kunci = f => f.sumber + ":" + f.id;

  app.innerHTML = `${contoh ? '<p class="lf-contoh">MODE CONTOH: foto dan label dummy. Tekan 🧹 untuk kembali ke data asli.</p>' : ""}
    <div class="lf-grid">
      <section class="lf-kiri"><div class="lf-foto" id="lfFoto"></div>
        <div class="lf-nav"><button class="ad-tombol" id="lfKembali" type="button">← Sebelumnya</button><span class="lf-redup" id="lfProgres"></span><button class="ad-tombol" id="lfLewati" type="button">Lewati →</button></div></section>
      <section class="lf-kanan">
        <div class="lf-info" id="lfInfo"></div>
        <div class="lf-kelas" id="lfKelas" role="group" aria-label="Kelas kerusakan">${KELAS.map(([k, l], i) => `<button class="ad-tombol lf-k lf-${k}" type="button" data-kelas="${k}"><kbd>${i + 1}</kbd>${l}</button>`).join("")}</div>
        <p class="lf-redup lf-label">Jenis objek (opsional, pilih sebelum kelas)</p>
        <div class="lf-jenis" id="lfJenis" role="group" aria-label="Jenis objek">${JENIS.map(([k, l]) => `<button class="ad-chip" type="button" data-jenis="${k}" aria-pressed="false">${l}</button>`).join("")}</div>
        <p class="lf-galat" id="lfGalat" role="alert" hidden></p>
        <div class="lf-stat" id="lfStat"><p class="lf-redup">Memuat statistik…</p></div>
        <a class="ad-tombol" href="/api/labelfoto/ekspor${q()}" download>⬇️ Ekspor dataset (JSON)</a>
      </section></div>`;
  const el = id => document.getElementById(id), fotoEl = el("lfFoto"), infoEl = el("lfInfo"), galatEl = el("lfGalat");

  function galat(t) { galatEl.hidden = !t; galatEl.textContent = t || ""; }
  function gambar() {
    const f = kini;
    el("lfProgres").textContent = f ? `${saya} dilabel oleh Anda, ${sisa} tersisa` : "";
    el("lfKembali").disabled = !riwayat.length; el("lfLewati").disabled = !f;
    if (!f) {
      fotoEl.innerHTML = `<p class="lf-kosong">${memuat ? "Memuat foto…" : (sisa ? "Memuat…" : "Semua foto yang lolos moderasi sudah Anda label.")}</p>`; infoEl.textContent = ""; tandai(); return;
    }
    fotoEl.innerHTML = `<img alt="Foto lapangan untuk dilabel" src="${esc(f.url)}">`;
    infoEl.innerHTML = `<b>${esc(f.bencana)}, ${esc(f.kategori)}</b><span>${tgl(f.diambil || f.dibuat)}</span>
      <a href="https://www.google.com/maps?q=${+f.lat},${+f.lon}" target="_blank" rel="noopener noreferrer">${(+f.lat).toFixed(5)}, ${(+f.lon).toFixed(5)}</a>`;
    for (const x of antre.slice(0, 3)) new Image().src = x.url;   // muat dini 3 foto berikutnya supaya lompatan instan
    tandai();
  }
  function tandai() {
    const ku = kini && labelKu.get(kunci(kini));
    for (const b of el("lfKelas").children) { b.setAttribute("aria-pressed", String(b.dataset.kelas === ku)); b.disabled = !kini; }
    for (const b of el("lfJenis").children) b.setAttribute("aria-pressed", String(b.dataset.jenis === jenis));
  }
  function maju() {
    if (kini) riwayat.push(kini);
    kini = antre.shift() || null;
    gambar();
    if (antre.length < 5) isi();
  }
  async function isi() {
    if (memuat || berikut === false) return;
    memuat = true;
    try {
      const r = await fetch(`${API}/antre?batas=20${berikut ? "&sebelum=" + encodeURIComponent(berikut) : ""}${q("&")}`);
      if (r.status === 403) { location.href = "/admin/masuk"; return; }
      const j = await r.json(); if (!r.ok) throw new Error(j.galat || "gagal memuat");
      const ada = new Set([kini, ...antre, ...riwayat].filter(Boolean).map(kunci));
      antre.push(...j.foto.filter(f => !ada.has(kunci(f)))); berikut = j.berikut || false; sisa = j.sisa;
      if (!kini) kini = antre.shift() || null;
    } catch (e) { galat(String(e.message || e)); }
    memuat = false; gambar();
  }
  async function stat() {
    try {
      const r = await fetch(`${API}/statistik${q()}`), s = await r.json(); if (!r.ok) throw new Error(s.galat || "gagal");
      saya = s.saya; const mak = Math.max(1, ...Object.values(s.per_kelas)), k = s.kesepakatan;
      el("lfStat").innerHTML = `<p class="lf-kalimat">Model dilatih setelah <b>${s.ambang}</b> label; kini <b>${s.terlabel}</b> foto terlabel dari ${s.total_foto} foto.</p>
        <div class="lf-bar">${KELAS.map(([c, l]) => `<div><span>${l}</span><i class="lf-b lf-${c}" data-n="${s.per_kelas[c]}"></i><b>${s.per_kelas[c]}</b></div>`).join("")}</div>
        <p class="lf-redup">${k.foto_ganda ? `Kesepakatan antar-pelabel pada ${k.foto_ganda} foto: sama ${persen(k.persen)}, Cohen kappa ${k.kappa == null ? "belum terdefinisi" : k.kappa}.` : "Kesepakatan antar-pelabel muncul setelah dua orang melabeli foto yang sama."}</p>`;
      for (const b of el("lfStat").querySelectorAll(".lf-b")) b.style.width = Math.round(100 * b.dataset.n / mak) + "%";
      gambar();
    } catch (e) { el("lfStat").innerHTML = `<p class="lf-galat">${esc(e.message)}</p>`; }
  }

  function beri(kelas) {
    const f = kini; if (!f) return;
    galat(""); const lama = labelKu.get(kunci(f)), j = ["bukan_bangunan", "tidak_jelas"].includes(kelas) ? null : jenis;   // server menolak jenis objek pada dua kelas ini
    if (lama === undefined) saya++;
    labelKu.set(kunci(f), kelas); jenis = null; sisa = Math.max(0, sisa - (lama === undefined ? 1 : 0));
    maju();   // sinkron: foto berikutnya tampil sekarang; jaringan di belakang
    kirim(`${API}/simpan`, {sumber: f.sumber, foto_id: f.id, kelas, jenis_objek: j}).then(r => {
      if (r.ok) { clearTimeout(beri.t); beri.t = setTimeout(stat, 600); return; }
      if (r.status === 403) { location.href = "/admin/masuk"; return; }
      lama === undefined ? (labelKu.delete(kunci(f)), saya--, sisa++) : labelKu.set(kunci(f), lama);   // gagal: kembalikan ke foto itu
      riwayat = riwayat.filter(x => x !== f); if (kini) antre.unshift(kini); kini = f; galat(r.j.galat || "Gagal menyimpan label"); gambar();
    }, () => { galat("Jaringan terputus, label tidak tersimpan"); });
  }
  const kembali = () => { if (!riwayat.length) return; if (kini) antre.unshift(kini); kini = riwayat.pop(); gambar(); };
  const lewati = () => { if (kini) { antre.push(kini); maju(); riwayat.pop(); } };   // dilewati = ke belakang antrean, bukan ke riwayat

  app.addEventListener("click", e => {
    const k = e.target.closest("[data-kelas]"); if (k) return beri(k.dataset.kelas);
    const c = e.target.closest("[data-jenis]"); if (c) { jenis = jenis === c.dataset.jenis ? null : c.dataset.jenis; return tandai(); }
    if (e.target.closest("#lfKembali")) return kembali();
    if (e.target.closest("#lfLewati")) return lewati();
  });
  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const i = "123456".indexOf(e.key);
    if (i >= 0 && e.key.length === 1) { e.preventDefault(); beri(KELAS[i][0]); }
    else if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); kembali(); }
    else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); lewati(); }
  });

  /* tombol dummy 🧪/🧹 (DUMMY.md): 🧪 memberi label contoh pada foto dummy yang sudah ada lalu masuk mode contoh; 🧹 menghapus label dummy dan keluar mode */
  const aksiJudul = document.getElementById("aksiJudul");
  aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi label contoh pada foto dummy" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>';
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA label dummy? Label asli tidak tersentuh.")) return;
    const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy});
    if (!r.ok && r.status !== 409) return alert(r.j.galat || "Gagal");
    try { d.dataset.dummy === "isi" ? sessionStorage.setItem("lf_contoh", "1") : sessionStorage.removeItem("lf_contoh"); } catch (x) {}
    alert(r.ok ? (d.dataset.dummy === "isi" ? `${r.j.label} label contoh dibuat pada ${r.j.foto} foto dummy.` : `${r.j.label} label dummy dihapus.`) : r.j.galat);
    location.reload();   // muat ulang penuh (DUMMY.md syarat 6)
  });

  gambar(); isi().then(stat);
})();
