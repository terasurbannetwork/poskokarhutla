/* Tab Kaji ulang di /instansi (KU-08 baca BPBD; data/kajian-bnpb/kaji-ulang/KEPUTUSAN Q2, Q6). Baca saja: daftar kaji ulang yang sudah disahkan di kab wilayah akun,
   lalu pelajaran dan rekomendasi dari potret beku. Rute GET /api/instansi/siklus/kaji-ulang/disahkan dan /api/instansi/siklus/kejadian/<KJ>/kaji-ulang (src/kaji_ulang.js).
   Halaman /siklus tidak terbuka bagi sesi instansi (kuki berjalur /api/instansi), jadi tampilan baca tinggal di sini. Memakai esc dan jamWIB dari /inti/format.js. */
(() => {
  "use strict";
  const API = "/api/instansi/siklus", KOSONG = "tidak ada data";
  const KATEGORI = {baik: "Berjalan baik", perbaiki: "Perlu diperbaiki"}, STATUS = {belum: "Belum", proses: "Dikerjakan", selesai: "Selesai"};
  const tgl = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : KOSONG;
  const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const pesanGagal = r => r.status === 503 ? "Kaji ulang belum diaktifkan." : r.status === 404 ? "Kaji ulang belum tersedia untuk kejadian ini." : r.j?.galat || "Kaji ulang belum bisa dimuat.";

  function rincian(d) {
    const pel = d.pelajaran || [], rek = d.rekomendasi || [], hari = hariIni();
    const daftarPel = KATEGORI_URUT => KATEGORI_URUT.map(k => {
      const isi = pel.filter(p => p.kategori === k);
      return `<div><h3 class="in-sub">${KATEGORI[k]}</h3>${isi.length ? `<ul class="in-daftar">${isi.map(p => `<li>${esc(p.teks)}</li>`).join("")}</ul>` : `<p class="lp-kecil">${KOSONG}</p>`}</div>`;
    }).join("");
    const baris = rek.map(r => {
      const s = STATUS[r.status] ? r.status : "belum", lewat = s !== "selesai" && typeof r.tenggat === "string" && r.tenggat < hari;
      return `<tr><td>${esc(r.nomor)}</td><td>${esc(r.teks)}</td><td>${esc(r.unit)}</td><td>${esc(tgl(r.tenggat))}</td><td>${esc(STATUS[s])}${lewat ? ` <span class="in-pil merah">lewat tenggat</span>` : ""}</td></tr>`;
    }).join("");
    return `<p class="lp-kecil">Disahkan ${esc(jamWIB(d.kaji.disahkan_pada))}, versi ${esc(d.kaji.versi)}. Isi di bawah adalah versi yang disahkan; status rekomendasi mengikuti perkembangan terakhir.</p>
      <h2 class="in-sub">Pelajaran</h2>${pel.length ? daftarPel(["baik", "perbaiki"]) : `<p class="lp-kecil">${KOSONG}</p>`}
      <h2 class="in-sub">Rekomendasi</h2>${rek.length ? `<table class="op-tabel"><thead><tr><th>Nomor</th><th>Rekomendasi</th><th title="Unit atau instansi penanggung jawab, bukan nama orang">Unit</th><th>Tenggat</th><th>Status</th></tr></thead><tbody>${baris}</tbody></table>` : `<p class="lp-kecil">${KOSONG}</p>`}`;
  }

  /* w = wadah tab; api = api() milik instansi.js (menangani 401 sesi profil) */
  async function tampil(w, api) {
    w.innerHTML = `<div class="in-kartu"><p class="lp-kecil">Memuat kaji ulang…</p></div>`;
    const r = await api("GET", API + "/kaji-ulang/disahkan");
    if (!r.ok) { w.innerHTML = `<div class="in-kartu"><p class="lp-kecil">${esc(pesanGagal(r))}</p></div>`; return; }
    const baris = r.j.baris || [];
    w.innerHTML = `<div class="in-kartu"><h2 class="in-sub">Kaji ulang yang sudah disahkan</h2>
      ${baris.length ? `<ul class="in-daftar">${baris.map(b => `<li><button type="button" class="lp-tombol" data-ku="${esc(b.id)}" aria-expanded="false">${esc(b.nama)}, ${esc(tgl(b.mulai))}</button></li>`).join("")}</ul>`
        : `<p class="lp-kecil">Belum ada kaji ulang yang disahkan untuk kejadian di wilayah ini.</p>`}</div><div class="in-kartu" id="kuRinci" hidden></div>`;
    const rinci = w.querySelector("#kuRinci");
    let minta = 0;
    w.querySelector("ul")?.addEventListener("click", async e => {
      const b = e.target.closest("[data-ku]"); if (!b) return;
      for (const x of w.querySelectorAll("[data-ku]")) x.setAttribute("aria-expanded", String(x === b));   // chrome urgent, isi menyusul
      rinci.hidden = false; rinci.innerHTML = `<p class="lp-kecil">Memuat…</p>`;
      const n = ++minta, d = await api("GET", `${API}/kejadian/${encodeURIComponent(b.dataset.ku)}/kaji-ulang`);
      if (n !== minta) return;   // klik lain menyusul: jawaban lama dibuang
      rinci.innerHTML = d.ok ? `<h2 class="in-sub">${esc(b.textContent)}</h2>${rincian(d.j)}` : `<p class="lp-kecil">${esc(pesanGagal(d))}</p>`;
    });
  }
  window.KajiUlangBp = {tampil, rincian};
})();
