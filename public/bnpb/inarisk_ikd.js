"use strict";
/* Tab IKD (PRD F-4): daftar IKD final per tahun dari ikd.json, 20 baris per halaman, dialog analisa lewat Ir.bukaIkd. */
Ir.tab.ikd = {
  pasang() {
    const {H} = Ir, $t = $("#ikTahun"), $p = $("#ikProv"), $k = $("#ikKab"), PER = 20;
    let ikd = null, saring = [], hal = 0;
    $("#ikBaris").innerHTML = `<tr><td colspan="6" class="ir-p">Memuat IKD…</td></tr>`;
    Promise.all([Ir.muat("ikd.json"), Ir.muat("irbi.json")]).then(([x, irbi]) => {
      ikd = x;
      Ir.isiOpsi($t, [...ikd.tahun_tersedia].sort((a, b) => b - a).map(t => [t, t]));
      Ir.rantaiProvKab($p, $k, irbi.kab, irbi.prov);
      for (const el of [$t, $p, $k]) el.addEventListener("change", hitung);
      hitung();
    }).catch(() => { $("#ikBaris").innerHTML = `<tr><td colspan="6" class="ir-p">Data IKD belum ditarik.</td></tr>`; });

    /* filter dihitung hanya saat filter berubah; ganti halaman cukup mengiris (INP) */
    function hitung() {
      const t = +$t.value, p = $p.value, k = $k.value;
      saring = ikd.daftar.filter(r => r[3] === t && (!k ? (!p || r[0].startsWith(p)) : r[0] === k)).sort((a, b) => (b[4] ?? -1) - (a[4] ?? -1));
      hal = 0;
      gambar();
    }
    function gambar() {
      const iris = saring.slice(hal * PER, hal * PER + PER), n = saring.length;
      $("#ikJml").textContent = `${H.angka0(n)} data`;
      $("#ikBaris").innerHTML = iris.map(r => {
        const tk = H.tingkatIkd(r[4]), ada = ikd.analisa[`${r[0]}/${r[3]}`];
        return `<tr><td class="ir-lbl">${esc(r[1])}</td><td>${esc(r[0].length === 2 ? "Tingkat provinsi" : r[2])}</td><td class="n">${r[3]}</td><td class="n">${H.angka2(r[4])}</td>` +
          `<td><span class="ir-tk"><i class="ir-titik ${tk ? "t-" + tk.toLowerCase() : ""}"></i>${esc(tk || "–")}</span></td>` +
          `<td>${ada ? `<button type="button" class="ir-tombol2 ir-kecil" data-ikd="${esc(r[0])}" data-th="${r[3]}">Lihat analisa</button>` : `<span class="ir-ket">Analisa belum dicermin</span>`}</td></tr>`;
      }).join("") || `<tr><td colspan="6" class="ir-p">Tidak ada IKD final untuk pilihan ini.</td></tr>`;
      halaman($("#ikHal"), hal, Math.ceil(n / PER), n, PER, h => { hal = h; gambar(); });
    }
    $("#ikBaris").addEventListener("click", e => { const b = e.target.closest("[data-ikd]"); if (b) Ir.bukaIkd(b.dataset.ikd, +b.dataset.th); });
  },
};

/* paginasi bersama tab IKD dan Unduhan */
function halaman(wadah, hal, jml, n, per, pilih) {
  if (jml <= 1) { wadah.innerHTML = n ? `<span class="ir-ket">Menampilkan ${Ir.H.angka0(n)} data</span>` : ""; return; }
  const no = [...new Set([0, hal - 1, hal, hal + 1, jml - 1])].filter(i => i >= 0 && i < jml).sort((a, b) => a - b);
  let btn = `<button type="button" data-h="${hal - 1}" ${hal ? "" : "disabled"} aria-label="Halaman sebelumnya">‹</button>`, akhir = -1;
  for (const i of no) { if (i > akhir + 1) btn += `<span aria-hidden="true">…</span>`; btn += `<button type="button" data-h="${i}"${i === hal ? ' aria-current="page"' : ""}>${i + 1}</button>`; akhir = i; }
  btn += `<button type="button" data-h="${hal + 1}" ${hal < jml - 1 ? "" : "disabled"} aria-label="Halaman berikutnya">›</button>`;
  wadah.innerHTML = `<span class="ir-ket">Menampilkan ${Ir.H.angka0(hal * per + 1)} sampai ${Ir.H.angka0(Math.min(n, hal * per + per))} dari ${Ir.H.angka0(n)} data</span><nav aria-label="Halaman">${btn}</nav>`;
  wadah.onclick = e => { const b = e.target.closest("[data-h]"); if (b && !b.disabled) pilih(+b.dataset.h); };
}
