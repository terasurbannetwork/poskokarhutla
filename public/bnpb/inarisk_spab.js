"use strict";
/* Tab IRBI: daftar daerah risiko tinggi menurut capaian SPAB (spab.json) dan tabel uji IRBI lawan DIBI di Metodologi (uji_dibi.json).
   Butuh inarisk.js (Ir), inarisk_hitung.js. Data per kab/kota; SPAB tanpa data tampil "belum ada data", tidak pernah 0. */
(() => {
  const {H} = Ir;
  const fmt = v => (v === null || v === undefined ? "–" : H.angka2(v));
  const sebelumnya = Ir.tambahanIrbi;
  let spab = null;
  Ir.tambahanIrbi = (f, d) => {
    sebelumnya?.(f, d);
    const gambar = () => {
      const isi = d.tahun.includes(f.tahun) ? H.urut(d, f.tahun, "total", f.prov).filter(x => H.kelas(x.skor, "total", f.tahun) === "Tinggi") : [];
      const ada = isi.filter(x => spab.kab[x.pcode]).sort((a, b) => spab.kab[a.pcode][4] - spab.kab[b.pcode][4] || a.pcode.localeCompare(b.pcode));
      const tanpa = isi.filter(x => !spab.kab[x.pcode]);
      $("#irSpabKet").textContent = `${H.angka0(isi.length)} kabupaten/kota tinggi, ${H.angka0(tanpa.length)} belum ada data SPAB`;
      $("#irSpabBaris").innerHTML = ada.concat(tanpa).map(x => {
        const v = spab.kab[x.pcode], nm = esc(d.kab[x.pcode]?.[0] || x.pcode);
        return `<tr><td class="ir-lbl">${nm}<small>${esc(d.prov[x.pcode.slice(0, 2)] || "")}</small></td><td class="n">${H.angka2(x.skor)}</td>` + (v
          ? `<td class="n">${H.angka0(v[0])}</td><td class="n">${H.persen1(v[4] * 100)}</td><td class="n">${H.angka0(v[5])}</td><td class="n">${H.angka0(v[6])}</td><td class="n">${H.angka0(v[7])}</td>`
          : `<td class="n" colspan="5">belum ada data</td>`) +
          `<td><button type="button" class="ir-ikon" data-kab="${esc(x.pcode)}" aria-label="Lihat detail ${nm}">›</button></td></tr>`;
      }).join("") || `<tr><td colspan="8" class="ir-p">Tidak ada kabupaten/kota kelas tinggi.</td></tr>`;
    };
    if (spab) return gambar();
    Ir.muat("spab.json").then(j => { spab = j; gambar(); }).catch(() => { $("#irSpabBaris").innerHTML = `<tr><td colspan="8" class="ir-p">Data SPAB belum ditarik.</td></tr>`; });
  };
  $("#irSpabBaris").addEventListener("click", e => { const b = e.target.closest("[data-kab]"); if (b) Ir.bukaDetail(b.dataset.kab, {tahun: +$("#irTahun").value, kolom: $("#irBahaya").value, prov: $("#irProv").value, kab: $("#irKab").value}); });

  /* Metodologi: uji IRBI lawan DIBI */
  Ir.tab.metodologi = {
    pasang() {
      Ir.muat("uji_dibi.json").then(u => {
        const sel = (a, b) => `<td class="n">${fmt(a)}</td><td class="n">${fmt(b)}</td>`;
        $("#mtUjiBaris").innerHTML = u.baris.map(r => {
          const k = r.total.kejadian, j = r.total.korban;
          return `<tr><td>${r.tahun_irbi}</td><td>${esc(r.dasar)}</td><td>${r.tahun_dibi}${r.cara === "tahun sama" ? " (tahun sama)" : ""}</td>` + sel(k.rho_irbi, k.rho_persisten) + sel(k.hit_irbi, k.hit_persisten) + sel(j.rho_irbi, j.rho_persisten) + `</tr>`;
        }).join("");
        $("#mtUjiVonis").innerHTML = u.vonis.map(t => `<tr><td colspan="9" class="ir-lbl">${esc(t)}</td></tr>`).join("");
      }).catch(() => { $("#mtUjiBaris").innerHTML = `<tr><td colspan="9" class="ir-p">Uji belum tersedia.</td></tr>`; });
    },
  };
})();
