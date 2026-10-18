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
      <div class="bd" style="display:grid;gap:10px">${isi}<div class="lc-lanjut" id="laciLanjut"></div>${this.simulasi(g)}</div>`;
    el.dataset.g = g.id; el.classList.add("on"); el.querySelector(".tutup").onclick = () => this.tutup(); this.lanjut(g, el); },
  /* tautan ke tab Simulasi: /gempa/sim?lat=&lon=&m=&dalam= */
  simulasi: g => `<a class="btn sec lc-sim" href="/gempa/sim?lat=${g.lat}&lon=${g.lon}&m=${g.m}${g.dalam == null ? "" : "&dalam=" + g.dalam}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 3.5-4 6-3"/></svg>Simulasikan</a>`,
  /* bagian yang bergantung pada model/data tambahan datang sendiri-sendiri; hilang bila datanya tidak ada (A18) */
  lanjut(g, el) {
    const slot = el.querySelector("#laciLanjut"), sama = () => el.dataset.g === g.id && slot.isConnected, rom = v => ROMAWI[Math.min(12, Math.max(1, Math.round(v)))];
    const tambah = (urut, html) => { if (!html || !sama()) return; const d = document.createElement("div"); d.className = "lc-sek"; d.style.order = urut; d.innerHTML = html; slot.appendChild(d); };
    const baris = (a, b) => `<tr><td>${a}</td><td class="n" translate="no">${b}</td></tr>`;
    /* 1. susulan 7 hari ke depan, disesuaikan dengan susulan teramati */
    if (g.kej) Sus.peluang(g.kej).then(r => { if (!r?.baris.length) return;
      tambah(1, `<h4 class="lc-h">Peluang susulan 7 hari ke depan</h4><table class="tb2"><tbody>${r.baris.map(([n, p]) => baris(n, peluangTeks(p))).join("")}</tbody></table>
        <p class="fnd">${r.n ? fmt(r.n) + " susulan sudah tercatat. " : ""}Perkiraan model dari gempa utama ${mTulis(r.m)}, bukan prakiraan resmi.</p>`); }).catch(() => {});
    /* 2. penduduk terpapar per kelas MMI dan fasilitas di MMI VI atau lebih (perkiraan model) */
    if (g.m >= 4.5 && typeof GempaGuncangan !== "undefined") Guncang.hitung(g).then(({P, F}) => { if (!P?.total) return;
      const ks = Object.keys(P.per).map(Number).filter(k => k >= 3 && P.per[k] > 0).sort((a, b) => b - a); if (!ks.length) return;
      const nf = t => F ? F.filter(f => f.t === t).length : 0, fas = F && F.length ? `<p class="fnd">Dari fasilitas rawan yang dimuat (sebagian sekolah dengan syarat teringan tidak dimuat), ${[nf("sekolah") && fmt(nf("sekolah")) + " sekolah", nf("rs") && fmt(nf("rs")) + " fasilitas kesehatan", nf("publik") && fmt(nf("publik")) + " bangunan publik"].filter(Boolean).join(" dan ") || fmt(F.length) + " fasilitas"} diperkirakan terguncang MMI VI atau lebih.</p>` : "";
      tambah(2, `<h4 class="lc-h">Perkiraan penduduk terpapar</h4><table class="tb2"><tbody>${ks.map(k => baris(`<span class="lc-mmi" style="--w:${MMI_WARNA[k]};color:${k <= 3 ? "#3b3320" : "#fff"}">MMI ${rom(k)}</span>`, jiwaTeks(P.per[k]))).join("")}</tbody></table>${fas}
        <p class="fnd">Simulasi, bukan prakiraan.</p>`); }).catch(() => {});
    /* 3. waktu tiba dan tinggi di pantai terdekat, hanya bila gempa layak; status resmi BMKG tetap di atas. Dihitung di luar tugas klik (nanti), batas 60 menit lalu 180 bila kosong, cache per gempa */
    if (typeof Tsunami !== "undefined" && Tsunami.layak(g)) this.gelombang(g).then(P => { if (!P?.length) return;
      const mnt = m => "sekitar " + fmt(Math.max(5, Math.round(m / 5) * 5)) + " menit", tg = x => x.tinggi_lo != null && x.tinggi_hi != null ? `${fmt(x.tinggi_lo)} sampai ${fmt(x.tinggi_hi)} m` : `sekitar ${fmt(Math.round(x.tinggi_m * 10) / 10)} m`;
      tambah(3, `<h4 class="lc-h">Perkiraan gelombang di pantai terdekat</h4><table class="tb2"><tbody>${P.map(x => baris(esc(x.kab || this.koord({lat: x.lat, lon: x.lon})), `${mnt(x.menit)}, ${tg(x)}`)).join("")}</tbody></table>
        <p class="fnd">Simulasi, bukan prakiraan. Ikuti status resmi BMKG di atas.</p>`); }).catch(() => {});
  },
  _gel: new Map(),
  gelombang(g) { let c = this._gel.get(g.id); if (c) return c;
    const hit = (grid, mk) => new Promise(res => nanti(() => { const w = Tsunami.waktuTiba(grid, g.lat, g.lon, g.m, {dalam: g.dalam, maksMenit: mk});
      res((w?.pantai || []).filter(x => x.menit != null).sort((a, b) => a.menit - b.menit).slice(0, 5)); }));
    c = Tsunami.muat().then(async grid => { let P = await hit(grid, 60); if (!P.length) P = await hit(grid, 180); return P; });
    this._gel.set(g.id, c); if (this._gel.size > 30) this._gel.delete(this._gel.keys().next().value); return c; },
};
