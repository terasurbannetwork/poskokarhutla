/* Kemitraan Kampus, halaman cetak panduan wawancara /kemitraan/panduan?kab=<kode4>&masalah=<auto_id>&n=<narasumber,...> (KM-C02, PRD F-M6).
   Skrip klasik mandiri (tanpa inti.js: cangkang layar utama). Semua teks dari data masuk lewat esc() atau textContent; pertanyaan disusun hitung.js (kembaran pertanyaan.py). */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const $ = id => document.getElementById(id);
  const H = window.KM_HITUNG, NS = Object.keys(window.KM_KONST.NARASUMBER);
  const get = u => fetch(u, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const kosong = (t, pesan) => { $("pdIsi").innerHTML = `<div class="ak-panel ak-kosong"><h2>${esc(t)}</h2><p>${esc(pesan)}</p></div>`; };

  /* kaki cetak: sumber dan waktu data tiap kelompok angka + tanggal cetak (selebaran cetak, bukan kartu laporan: AGENTS §3.5 tidak berlaku) */
  const tglId = v => { const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? "")); return x ? `${+x[3]}/${+x[2]}/${x[1]}` : "–"; };
  function kaki(p) {
    const ir = p.irbi, kj = p.kejadian, ud = p.udara, pd = p.penduduk, th = ir?.seri?.length ? ir.seri[ir.seri.length - 1][0] : null, rs = kj?.tren_rentang?.semua;
    const baris = [
      ir && `Skor dan kelas IRBI tahun ${th ?? "–"}: ${ir.sumber || "–"}, data per ${tglId(ir.tanggal)}.`,
      kj && `Jumlah kejadian: ${kj.sumber || "–"}, data per ${tglId(kj.tanggal)}; semua jenis ${rs ? rs[0] + "–" + rs[1] : "–"}, per jenis 2015–2025 tanpa 2024 (data DIBI 2024 tak lengkap).`,
      pd && `Penduduk dan kelompok rentan: ${pd.sumber || "–"}, data per ${tglId(pd.tanggal)}.`,
      ud && `PM2,5 provinsi (estimasi model): ${ud.sumber || "–"}, ${ud.dari && ud.sampai ? tglId(ud.dari) + " sampai " + tglId(ud.sampai) : "cakupan tidak diketahui"}.`,
      `Pertanyaan disusun otomatis dari data profil dan belum divalidasi. Dicetak ${new Date().toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"})}.`,
    ].filter(Boolean);
    const ul = $("pdKaki"); ul.textContent = ""; for (const b of baris) { const li = document.createElement("li"); li.textContent = b; ul.appendChild(li); }
    ul.hidden = false;
  }

  async function mulai() {
    const q = new URLSearchParams(location.search), kab = q.get("kab") || "", mid = q.get("masalah") || "";
    const pilih = (q.get("n") || "").split(",").filter(x => NS.includes(x));
    if (!/^\d{4}$/.test(kab)) return kosong("Pilih daerah dulu", "Buka panduan dari lembar profil daerah di halaman Kemitraan Kampus.");
    const [p, bank, meta] = await Promise.all([get(`/data/kemitraan/daerah/${kab}.json`), get("/data/kemitraan/pertanyaan.json"), get("/data/meta.json")]);
    if (!p || !bank) return kosong("Panduan gagal dimuat", "Muat ulang halaman atau coba lagi nanti.");
    const m = mid ? (p.masalah || []).find(x => x.auto_id === mid) : null;
    if (mid && !m) return kosong("Masalah tidak ditemukan", "Masalah itu tidak ada pada profil daerah ini.");
    let h; try { h = H.panduan(bank, p, m, pilih.length ? pilih : null, {prov_nama: (meta?.provinsi || {})[p.prov] ?? null}); } catch (e) { console.warn("kemitraan panduan", e); return kosong("Panduan gagal dimuat", "Data profil daerah ini tidak bisa diolah menjadi pertanyaan."); }
    $("pdJudul").textContent = `Panduan wawancara ${p.nama}`;
    $("pdSub").textContent = m ? `Masalah: ${m.judul}` : "Pertanyaan umum dan per narasumber untuk satu daerah. Semua butir disusun otomatis dari data profil dan belum divalidasi.";
    document.title = `Panduan wawancara ${p.nama} | Centurisk97`;
    const isiHtml = H.panduanHtml(h, esc);
    $("pdIsi").innerHTML = isiHtml;
    kaki(p);
    document.querySelectorAll("#pdIsi details").forEach(d => { d.open = true; });   // cetak: semua narasumber terbuka
  }
  $("pdCetak").addEventListener("click", () => window.print());
  mulai();
})();
