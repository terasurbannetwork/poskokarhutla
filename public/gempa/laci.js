"use strict";
/* ================================================================ laci rincian gempa */
/* Laci kanan seperti karhutla dan banjir (#laci, gaya dari inti/peta.css): dibuka saat satu gempa dipilih (klik titik peta atau baris daftar).
   Status tsunami resmi BMKG tampil apa adanya dan terpisah dari yang lain: kode 0 "Tidak berpotensi tsunami", 1 sampai 3 menurut kata BMKG,
   null = "BMKG tidak menyebut tsunami", TIDAK PERNAH "aman". Bagian yang datanya kosong dibuang (A18). Peta guncangan BMKG hanya tautan keluar. */
const Laci = {
  kot: (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`,
  /* "0,64° LU, 121,75° BT" (ID) atau "0.64° N, 121.75° E" (EN) */
  koord(g) { const en = window.BAHASA === "en", f = v => Math.abs(v).toFixed(2).replace(".", en ? "." : ",");
    return `${f(g.lat)}° ${en ? (g.lat < 0 ? "S" : "N") : (g.lat < 0 ? "LS" : "LU")}, ${f(g.lon)}° ${en ? "E" : "BT"}`; },
  tutup() { $("#laci")?.classList.remove("on"); },
  buka(g) {
    const el = $("#laci"); if (!el) return;
    const kd = kelasDalam(g.dalam), ts = g.tsunami, bmkg = g.sumber !== "usgs";
    const stT = !ts ? null : ts.kode == null ? ["BMKG tidak menyebut tsunami", "#5b6575"] : ts.kode === 0 ? ["Tidak berpotensi tsunami", "#5b6575"] : TSUNAMI[ts.kode];
    const kot = this.kot, koord = g => this.koord(g), rom = v => ROMAWI[Math.min(12, Math.max(1, Math.round(v)))];
    const isi = `<div class="grid g2">${kot("Kekuatan", `<span style="color:${warnaM(g.m)}">${mTulis(g.m)}</span>`, g.mtipe ? esc(g.mtipe) : "magnitudo")}${kot("Kedalaman", g.dalam == null ? "–" : fmt(g.dalam) + " km", kd < 0 ? "tidak diketahui" : "kelas " + KELAS_DALAM[kd][0].toLowerCase())}</div>
      ${stT && bmkg ? kot("Status tsunami, BMKG", `<span style="color:${stT[1]};font-size:15px">${stT[0]}</span>`, "status resmi BMKG") : ""}
      ${g.dirasakan ? `<p class="fnd" translate="no">${esc(g.dirasakan)}</p>` : ""}
      <table class="tb2"><tbody><tr><td>Pusat gempa</td><td class="n" translate="no">${koord(g)}</td></tr>${g.mmi_maks ? `<tr><td>Dirasakan</td><td class="n" translate="no">MMI ${rom(g.mmi_maks)}</td></tr>` : ""}
        ${g.prov ? `<tr><td>Provinsi</td><td class="n">${esc(namaProv(g.prov))}</td></tr>` : ""}${g.kab ? `<tr><td>Kabupaten/kota</td><td class="n" translate="no">${esc(g.kab)}</td></tr>` : ""}</tbody></table>
      ${g.shakemap ? `<a class="fnd" href="${esc(g.shakemap)}" target="_blank" rel="noopener" style="display:block">Peta guncangan BMKG ↗</a>` : ""}
      <p class="fnd">Sumber: ${bmkg ? "BMKG" : "USGS"}${g.sumber === "bmkg" ? ", USGS" : ""}</p>`;
    el.innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">Gempa ${esc(mTulis(g.m))}</span><h2 id="dlgJudul" title="${esc(wilayahPendek(g.wilayah))}" translate="no">${esc(wilayahPendek(g.wilayah))}</h2><div class="hd-meta"><span translate="no">${esc(waktuGempa(g.waktu))}</span></div></div>
      <div class="hd-aksi"><button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd" style="display:grid;gap:10px">${isi}</div>`;
    el.classList.add("on"); el.querySelector(".tutup").onclick = () => this.tutup(); },
};
