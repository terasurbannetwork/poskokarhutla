/* Kemitraan Kampus, tampilan Data lapor: unduhan agregat Lapor Bencana untuk peneliti dan kampus mitra (KEPUTUSAN-LAPOR-AI K62, D91-D93).
   Per kab/kota, jenis, dan minggu; tanpa identitas; sel kecil "<3". Kolom selisih dengan data resmi "belum tersedia" sampai laporan ditempel ke Buku Besar. */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  let data = null;
  const angka = () => [[IK.data, data ? data.baris.length : null, "Baris agregat"], [IK.daerah, data ? new Set(data.baris.map(b => b.kab_kode)).size : null, "Kab/kota"],
    [IK.waktu, data ? new Set(data.baris.map(b => b.minggu)).size : null, "Minggu"], [IK.cek, data ? data.baris.filter(b => typeof b.laporan === "number").reduce((t, b) => t + b.laporan, 0) : null, "Laporan (sel terbuka)"]];
  KM.tampilan.data = {
    async bangun(el) {
      el.innerHTML = '<div class="ak-hantu"></div>';
      try { const r = await fetch("/api/lapor/agregat?format=json", {credentials: "same-origin"}); if (!r.ok) throw 0; data = await r.json(); }
      catch { el.innerHTML = KM.kosongHtml("Data lapor", "Data agregat belum bisa dimuat. Coba lagi nanti."); return; }
      const kepala = data.kolom.map(([k, t]) => `<th scope="col" title="${esc(t)}">${esc(k)}</th>`).join("");
      const contoh = data.baris.slice(-20).reverse().map(b => `<tr>${data.kolom.map(([k]) => `<td>${esc(b[k] ?? "")}</td>`).join("")}</tr>`).join("");
      el.innerHTML = `<section class="ak-panel km-data">
        <h2>Laporan warga Lapor Bencana, agregat mingguan</h2>
        <p>Jumlah laporan per kab/kota, jenis bencana, dan minggu ISO (WIB). Tanpa nomor tiket, desa, koordinat, teks, foto, atau identitas pelapor.
          Sel dengan kurang dari ${esc(data.batas)} pelapor berbeda ditulis "&lt;${esc(data.batas)}" dan rinciannya dikosongkan. Diperbarui ${esc(data.dibuat)}.</p>
        <div class="km-data-unduh"><a class="ak-tbl" href="/api/lapor/agregat?format=csv" download>Unduh CSV</a><a class="ak-tbl alt" href="/api/lapor/agregat?format=json" download="lapor-agregat.json">Unduh JSON</a></div>
        <h3>Kamus kolom</h3>
        <dl class="km-data-kamus">${data.kolom.map(([k, t]) => `<dt>${esc(k)}</dt><dd>${esc(t)}</dd>`).join("")}</dl>
        <h3>Baris terbaru</h3>
        ${contoh ? `<div class="km-data-gulung"><table class="ex-tabel"><thead><tr>${kepala}</tr></thead><tbody>${contoh}</tbody></table></div>` : "<p>Belum ada laporan terkirim.</p>"}
      </section>`;
      KM.segarPita();
    },
    angka,
  };
})();
