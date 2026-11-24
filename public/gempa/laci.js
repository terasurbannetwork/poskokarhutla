"use strict";
/* ================================================================ laci rincian gempa */
/* Laci kanan seperti karhutla dan banjir (#laci, gaya dari inti/peta.css): dibuka saat satu gempa dipilih (klik titik peta atau baris daftar).
   Status tsunami resmi BMKG tampil apa adanya dan terpisah dari yang lain: kode 0 "Tidak berpotensi tsunami", 1 sampai 3 menurut kata BMKG,
   null = "BMKG tidak menyebut tsunami", TIDAK PERNAH "aman". Bagian yang datanya kosong dibuang (A18). Peta guncangan BMKG hanya tautan keluar.
   Tiap bagian satu kartu .lc-sek berkepala ikon + nama (LaciInti dari inti/peta/lapis.js), sumber kecil di kaki kartu, pil kelas .lc-pil (23 Nov 2026). */
const Laci = {
  /* kotak angka laci: kepala terang berikon (latar gelap hanya kepala halaman, AGENTS.md 3.5); ikon dari kunci IK_KOT */
  IK_KOT: {kuat: "M2 12h4l2-6 4 12 3-9 2 3h5", dalam: "M12 3v14m0 0-5-5m5 5 5-5M5 21h14",
    tsunami: "M2 9c2.5-3.5 5-3.5 7.5 0s5 3.5 7.5 0 3-2 5-2M2 16c2.5-3.5 5-3.5 7.5 0s5 3.5 7.5 0 3-2 5-2"},
  kot(l, v, s, ik) { const p = this.IK_KOT[ik]; return `<div class="kpi">${`<span class="lbl">${p ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>` : ""}${l}</span>`}<b>${v}</b><small>${s}</small></div>`; },
  /* ikon kepala bagian: kunci IKON bersama (LaciInti) dulu, cadangan jalur sendiri bila modul inti belum termuat */
  IK: {pusat: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", rasa: "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4",
    prov: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15", kab: "M4 21V8l8-5 8 5v13M9 21v-6h6v6", luar: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
    waktu: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", orang: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
    nyawa: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z", gedung: "M4 21V5l8-2v18M12 7l8 3v11M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01M2 21h20",
    ombak: "M2 9c2.5-3.5 5-3.5 7.5 0s5 3.5 7.5 0 3-2 5-2M2 16c2.5-3.5 5-3.5 7.5 0s5 3.5 7.5 0 3-2 5-2", perisai: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    pesawat: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
    satelit: "M13 7 9 3 5 7l4 4M17 11l4 4-4 4-4-4M8 12l4 4M16 8l-1-1M21 21l-3-3M14 3a7 7 0 0 1 7 7", rantai: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
    tabel: "M4 4h16v16H4zM4 10h16M10 4v16", lokasi: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"},
  ik(k, u = 14) { return `<svg viewBox="0 0 24 24" width="${u}" height="${u}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${this.IK[k] || this.IK.prov}"/></svg>`; },
  /* kepala bagian: ikon + nama, pil keterangan (perkiraan model) sebaris di kanan */
  h(ik, judul, pil = "") { return `<h4 class="lc-h">${this.ik(ik)}<span>${judul}</span>${pil ? `<span class="lc-h-pil">${pil}</span>` : ""}</h4>`; },
  src: t => `<p class="fnd lc-src">${t}</p>`,
  /* pil kelas MMI berwarna (teks gelap di kelas muda); tanpa literal warna teks */
  pilMMI(v, rom) { const k = Math.min(12, Math.max(1, Math.round(v))); return `<span class="lc-pil${pilTerang(MMI_WARNA[k]) ? " terang" : ""}" style="--w:${MMI_WARNA[k]}">MMI ${rom}</span>`; },
  /* "0,64° LU, 121,75° BT" (ID) atau "0.64° N, 121.75° E" (EN) */
  koord(g) { const en = window.BAHASA === "en", f = v => Math.abs(v).toFixed(2).replace(".", en ? "." : ",");
    return `${f(g.lat)}° ${en ? (g.lat < 0 ? "S" : "N") : (g.lat < 0 ? "LS" : "LU")}, ${f(g.lon)}° ${en ? "E" : "BT"}`; },
  tutup() { $("#laci")?.classList.remove("on"); Kejadian.bersih(); },
  /* "IV Tiakur, III Saumlaki, II-III Kupang" (BMKG) -> chip wilayah berpil MMI, terkuat dulu; tak terbaca = paragraf apa adanya */
  felt(teks) { const t = String(teks || "").trim(); return t && t !== "-" && typeof Ina !== "undefined" ? Ina.felt(t.replace(/(\b[IVX]+)\s*-\s*([IVX]+\b)/g, "$1 - $2")) : []; },
  /* baris MMI tertinggi berlabel asal: dari laporan Dirasakan BMKG bila ada; mmi_maks gabungan (src/gempa.js) bisa berasal dari ShakeMap USGS, ditulis terpisah */
  rasaMaks(g, br, rom) { const F = this.felt(g.dirasakan), kB = `<span title="MMI: skala intensitas guncangan Modified Mercalli, dari laporan Dirasakan BMKG">MMI tertinggi, BMKG</span>`,
      kU = `<span title="MMI: skala intensitas guncangan Modified Mercalli, perkiraan model ShakeMap USGS, bukan laporan dirasakan">MMI perkiraan USGS</span>`;
    if (F.length) { const top = F.reduce((a, x) => x.nilai > a.nilai ? x : a), u = g.mmi_maks != null && Math.round(g.mmi_maks) > top.nilai;
      return br("rasa", kB, this.pilMMI(top.nilai, esc(top.mmi.replace(" - ", "–"))), true) + (u ? br("rasa", kU, this.pilMMI(g.mmi_maks, rom(g.mmi_maks)), true) : ""); }
    return g.mmi_maks == null ? "" : br("rasa", g.sumber === "bmkg" ? kB : kU, this.pilMMI(g.mmi_maks, rom(g.mmi_maks)), true); },
  /* jenis magnitudo dijelaskan lewat title (mb = magnitudo gelombang badan, dan seterusnya) */
  mJenis(t) { const k = String(t || "").toLowerCase(), a = k.startsWith("mw") ? "magnitudo momen" : k === "mb" ? "magnitudo gelombang badan" : k === "ml" ? "magnitudo lokal" : k.startsWith("ms") ? "magnitudo gelombang permukaan" : k === "md" ? "magnitudo durasi" : "";
    return a ? `<abbr title="${a}">magnitudo ${esc(t)}</abbr>` : "magnitudo " + esc(t); },
  dirasakan(teks) {
    const t = String(teks || "").trim(); if (!t || t === "-") return "";
    const mm = this.felt(t);
    if (!mm.length) return `<p class="fnd lc-rasa" translate="no">${esc(t)}</p>`;
    const A = [...mm].sort((a, b) => b.nilai - a.nilai), M = 6, ch = x => `<span>${this.pilMMI(x.nilai, esc(x.mmi.replace(" - ", "–")))}<span translate="no">${esc(x.wilayah)}</span></span>`, lagi = A.slice(M);
    return `<div class="lc-rasa-h">Dirasakan menurut BMKG, ${fmt(A.length)} wilayah</div><div class="chip-wil lc-chip">${A.slice(0, M).map(ch).join("")}${lagi.length ? `<span class="lagi" title="${esc(lagi.map(x => x.wilayah + " (MMI " + x.mmi + ")").join(", "))}">+${fmt(lagi.length)} lainnya</span>` : ""}</div>`; },
  buka(g) {
    const el = $("#laci"); if (!el) return;
    const kd = kelasDalam(g.dalam), ts = g.tsunami, bmkg = g.sumber !== "usgs";
    const stT = !ts ? null : ts.kode == null ? ["BMKG tidak menyebut tsunami", "var(--ink2)"] : ts.kode === 0 ? ["Tidak berpotensi tsunami", "var(--ink2)"] : TSUNAMI[ts.kode];
    const kot = (...a) => this.kot(...a), rom = v => ROMAWI[Math.min(12, Math.max(1, Math.round(v)))];
    const br = (i, l, v, tr = false) => `<div class="lc-lb"><span class="lc-lb-k">${this.ik(i)}${l}</span><b${tr ? ' translate="no"' : ""}>${v}</b></div>`;
    /* kartu Lokasi: baris berikon (pusat, dirasakan, provinsi, kab/kota), wilayah dirasakan sebagai chip, tautan peta guncangan sebagai tombol, sumber kecil */
    const lokasi = `<section class="lc-sek lc-lok">${this.h("lokasi", "Lokasi")}<div class="lc-lbs">${br("pusat", "Pusat gempa", this.koord(g), true)}${this.rasaMaks(g, br, rom)}${g.prov ? br("prov", "Provinsi", esc(namaProv(g.prov))) : ""}${g.kab ? br("kab", "Kabupaten/kota", esc(g.kab), true) : ""}</div>${this.dirasakan(g.dirasakan)}
      ${g.shakemap ? `<a class="lc-luar" href="${esc(g.shakemap)}" target="_blank" rel="noopener">${this.ik("luar")}Peta guncangan BMKG</a>` : ""}${this.src(`Sumber: ${bmkg ? "BMKG" : "USGS"}${g.sumber === "bmkg" ? ", USGS" : ""}`)}</section>`;
    const isi = `<div class="grid g2 lc-kot">${kot("Kekuatan", `<span style="color:${warnaM(g.m)}">${mTulis(g.m)}</span>`, g.mtipe ? this.mJenis(g.mtipe) : "magnitudo", "kuat")}${kot("Kedalaman", g.dalam == null ? "–" : fmt(g.dalam) + " km", kd < 0 ? "tidak diketahui" : "kelas " + KELAS_DALAM[kd][0].toLowerCase(), "dalam")}</div>
      ${stT && bmkg ? `<div class="lc-tsu" style="--w:${stT[1]}">${kot("Status tsunami, BMKG", `<span class="lc-tsu-v">${stT[0]}</span>`, "status resmi BMKG", "tsunami")}</div>` : ""}${lokasi}`;
    const ws = esc(wilayahPendek(g.wilayah));
    el.innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">Gempa ${esc(mTulis(g.m))}</span><h2 id="dlgJudul" title="${ws}" translate="no">${ws}</h2><div class="hd-meta"><span translate="no">${esc(waktuGempa(g.waktu))}</span></div></div>
      <div class="hd-aksi">${g.kej ? `<button class="bagikan ik-btn" aria-label="Bagikan" title="Bagikan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg></button>` : ""}<button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd lc-bd">${isi}<div class="lc-lanjut" id="laciLanjut"></div><div class="lc-aksi" id="laciAksi">${this.simulasi(g)}</div></div>`;
    /* judul ditulis ulang sesudah kamus nama kab BMKG dimuat ("Buruselatan" jadi "Buru Selatan") */
    if (typeof NamaWil !== "undefined" && !NamaWil.kamus) NamaWil.siap().then(() => { if (el.dataset.g !== g.id) return; const h = el.querySelector("#dlgJudul"); if (h) { h.textContent = wilayahPendek(g.wilayah); h.title = h.textContent; } });
    el.dataset.g = g.id; el.classList.add("on"); el.querySelector(".tutup").onclick = () => this.tutup(); const bg = el.querySelector(".bagikan"); if (bg) bg.onclick = () => this.bagikan(g); this.lanjut(g, el); },
  /* tautan ke tab Simulasi: /gempa/sim?lat=&lon=&m=&dalam= */
  simulasi: g => `<a class="btn sec lc-sim" href="/gempa/sim?lat=${g.lat}&lon=${g.lon}&m=${g.m}${g.dalam == null ? "" : "&dalam=" + g.dalam}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 3.5-4 6-3"/></svg>Simulasikan</a>`,
  /* bagian yang bergantung pada model/data tambahan datang sendiri-sendiri; hilang bila datanya tidak ada (A18) */
  lanjut(g, el) {
    const slot = el.querySelector("#laciLanjut"), sama = () => el.dataset.g === g.id && slot.isConnected, rom = v => ROMAWI[Math.min(12, Math.max(1, Math.round(v)))];
    const tambah = (urut, html) => { if (!html || !sama()) return; const d = document.createElement("div"); d.className = "lc-sek"; d.style.order = urut; d.innerHTML = html; slot.appendChild(d); };
    const baris = (a, b) => `<tr><td>${a}</td><td class="n" translate="no">${b}</td></tr>`;
    /* "8% (0 sampai 21%)" -> angka besar di atas, rentang kecil di bawahnya */
    const duaTingkat = t => { const m = String(t).match(/^(.*?)\s*\((.*)\)$/); return m ? `<b class="lc-v">${m[1]}</b><small class="lc-sub">rentang ${m[2]}</small>` : `<b class="lc-v">${t}</b>`; };
    /* 0. kejadian (gempa utama M 5 atau lebih dan susulannya) yang memuat gempa ini: kode, susulan tercatat, status masa aktif */
    if (g.kej && typeof Sus !== "undefined") Sus.daftar().then(L => { const k = (L || []).find(x => x.kode === g.kej); if (!k) return;
      const br = (i, l, v) => `<div class="lc-lb"><span class="lc-lb-k">${this.ik(i)}${l}</span><b>${v}</b></div>`;
      tambah(0, `${this.h("rantai", "Kejadian " + esc(k.kode))}<div class="lc-lbs">${br("waktu", "Gempa utama", `<span translate="no">${esc(mTulis(k.m))}, ${esc(waktuGempa(k.mulai))}</span>`)}${br("ombak", "Susulan tercatat", fmt(Math.max(0, k.jumlah - 1)))}${br("perisai", "Status", (k.aktif ? `<span class="lc-pil" style="--w:var(--bad)">Aktif</span>` : `<span class="lc-pil netral">Selesai</span>`))}</div>
        ${this.src("Susulan: gempa di bawah M 5 di jendela jarak dan waktu gempa utama. Masa aktif berakhir 3 hari sesudah gempa terakhir, 7 hari bila gempa utama M 6,5 atau lebih.")}`); }).catch(() => {});
    /* 1. susulan 7 hari ke depan, disesuaikan dengan susulan teramati */
    if (g.kej) Promise.all([Sus.peluang(g.kej), Sus.daftar().catch(() => null)]).then(([r, L]) => { if (!r?.baris.length) return; const adaKej = (L || []).some(x => x.kode === g.kej);
      tambah(1, `${this.h("waktu", "Peluang susulan 7 hari ke depan")}<table class="tb2"><tbody>${r.baris.map(([n, p]) => baris(n, duaTingkat(peluangTeks(p)))).join("")}</tbody></table>
        ${this.src(`${r.n && !adaKej ? fmt(r.n) + " susulan sudah tercatat. " : ""}Model dari gempa utama ${mTulis(r.m)}, bukan prakiraan resmi.`)}`); }).catch(() => {});
    /* 2. penduduk terpapar per kelas MMI dan fasilitas di MMI VI atau lebih (perkiraan model) */
    if (g.m >= 4.5 && typeof GempaGuncangan !== "undefined") Guncang.hitung(g).then(({P, F}) => { if (!P?.total) return;
      const ks = Object.keys(P.per).map(Number).filter(k => k >= 3 && P.per[k] > 0).sort((a, b) => b - a); if (!ks.length) return;
      const nf = t => F ? F.filter(f => f.t === t).length : 0, Fr = [["gedung", "Sekolah", nf("sekolah")], ["nyawa", "Fasilitas kesehatan", nf("rs")], ["kab", "Bangunan publik", nf("publik")]].filter(x => x[2]);
      const fas = F && F.length ? `<div class="lc-sub-h">Fasilitas rawan di MMI VI atau lebih</div><div class="lc-lbs">${(Fr.length ? Fr : [["gedung", "Fasilitas", F.length]]).map(([i, l, n]) => `<div class="lc-lb"><span class="lc-lb-k">${this.ik(i)}${l}</span><b>${fmt(n)}</b></div>`).join("")}</div>` : "";
      const maks = Math.max(...ks.map(k => P.per[k])), tot = ks.reduce((x, k) => x + P.per[k], 0);
      tambah(2, `${this.h("orang", "Penduduk terpapar", pilModel)}<div class="lc-big"><div><b>${jiwaTeks(tot)}</b><small>terguncang MMI III atau lebih</small></div></div><div class="lc-mmi-bar">${ks.map(k => `<div class="lc-mb">${this.pilMMI(k, rom(k))}<span class="lc-mb-t"><i style="--w:${MMI_WARNA[k]};width:${Math.max(3, Math.round(P.per[k] / maks * 100))}%"></i></span><b>${jiwaTeks(P.per[k])}</b></div>`).join("")}</div>${fas}
        ${this.src(`Perkiraan model guncangan, belum diuji terhadap laporan Dirasakan.${F && F.length ? " Sebagian sekolah dengan syarat teringan tidak dimuat." : ""}`)}`); }).catch(() => {});
    /* 2b. korban jiwa model empiris USGS PAGER (koefisien Indonesia), berdampingan dengan perkiraan model di atas; catatan bila tsunami/likuefaksi mungkin dominan */
    if (g.m >= 4.5 && typeof GempaPager !== "undefined") Guncang.hitung(g).then(({P}) => { if (!P?.total) return;
      const r = GempaPager.hitung(P.per), kls = GempaPager.kelas(GempaPager.bulat2(r.jiwa)), ts = (g.tsunami?.kode || 0) >= 1 || (typeof Tsunami !== "undefined" && Tsunami.layak(g)), likuefaksi = g.m >= 7;
      const klsDaftar = [["hijau", "kurang dari 1", "kurang dari 1"], ["kuning", "1–99", "1 sampai 99"], ["oranye", "100–999", "100 sampai 999"], ["merah", "1.000 atau lebih", "1.000 atau lebih"]];
      tambah(2, `${this.h("nyawa", "Korban jiwa", pilPager)}<div class="lc-big"><div><b>${r.jiwa < 1 ? "kurang dari 1" : "sekitar " + duaAngka(r.jiwa)}</b><small>jiwa, rentang wajar ${r.jiwa < 1 ? "kurang dari 4" : duaAngka(r.bawah) + " sampai " + duaAngka(r.atas)}</small></div><span class="lc-pil${pilTerang(PAGER_WARNA[kls]) ? " terang" : ""}" style="--w:${PAGER_WARNA[kls]}" title="Kelas PAGER">Kelas ${kls}</span></div>
        <div class="lc-kls" aria-label="Kelas PAGER menurut perkiraan jiwa">${klsDaftar.map(([k, t, p]) => `<span style="--w:${PAGER_WARNA[k]}"${k === kls ? ' class="on"' : ""} title="Kelas ${k}: ${p} jiwa"><i></i>${t}</span>`).join("")}</div>
        <details class="lc-lipat"><summary>Catatan dan sumber</summary><ol class="lc-ol">${ts || likuefaksi ? `<li>Model ini tidak menghitung korban tsunami${likuefaksi ? " dan likuefaksi" : ""}. Pada gempa Palu 28 September 2018, PAGER resmi memberi 86 jiwa (dihitung Centurisk97 dengan paparan model guncangan), sedangkan korban nyata 4.140 jiwa (EM-DAT, CRED/UCLouvain).</li>` : ""}
        <li>Kelas PAGER ditentukan menurut perkiraan jumlah jiwa.</li><li>Model empiris, bukan laporan korban dan bukan status resmi BMKG.</li><li>Rentang wajar seperempat sampai empat kali perkiraan.</li></ol>
        ${this.src("Sumber: USGS PAGER (Jaiswal dan Wald 2010), model guncangan dan penduduk WorldPop Centurisk97")}</details>`); }).catch(() => {});
    /* 6. bandara di zona guncangan MMI VI atau lebih (A35, model guncangan yang sama) */
    if (g.m >= 5 && typeof GempaGuncangan !== "undefined") Guncang.bandara(g).then(B => { if (!B?.length) return;
      tambah(6, `${this.h("pesawat", "Bandara terguncang", pilModel)}<table class="tb2"><tbody>${B.slice(0, 5).map(b => baris(`<span translate="no">${esc(b.nama.replace(/ (International )?Airport$/, ""))}</span>`, this.pilMMI(b.mmi, rom(b.mmi)))).join("")}</tbody></table>
        ${B.length > 5 ? `<p class="fnd">${fmt(B.length)} bandara diperkirakan terguncang MMI VI atau lebih; lima teratas ditampilkan.</p>` : ""}${this.src("Perkiraan model guncangan, bukan laporan kerusakan. Sumber: OurAirports, model guncangan Centurisk97")}`); }).catch(() => {});
    /* 7. citra Sentinel-2 sebelum dan sesudah, hanya gempa M 6,5+ dangkal di darat yang sudah diproses citra.py */
    if (g.m >= 6.5) Citra.untuk(g).then(k => { if (!k?.citra?.length) return;
      const tg = c => KG.tgl(c.tgl + "T12:00:00+07:00", {day: "numeric", month: "short", year: "numeric"}), ar = {sebelum: "Sebelum", sesudah: "Sesudah"};
      tambah(7, `${this.h("satelit", "Citra satelit sebelum dan sesudah")}<div class="lc-citra">${k.citra.map(c => `<figure><img loading="lazy" src="${esc(c.berkas)}" alt="${ar[c.fase]} gempa, Sentinel-2, ${esc(tg(c))}"><figcaption><span class="lc-pil" style="--w:var(${c.fase === "sebelum" ? "--info" : "--bad"})">${ar[c.fase]}</span> ${esc(tg(c))}</figcaption></figure>`).join("")}</div>
        ${this.src("Warna semu: tanah terbuka segar tampak terang. Sumber: Copernicus Sentinel-2 lewat Earth Search")}`); }).catch(() => {});
    /* 3. waktu tiba dan tinggi di pantai terdekat, hanya bila gempa layak; status resmi BMKG tetap di atas. Dihitung di luar tugas klik (nanti), batas 60 menit lalu 180 bila kosong, cache per gempa */
    if (typeof Tsunami !== "undefined" && Tsunami.layak(g)) this.gelombang(g).then(P => { if (!P?.length) return;
      const mnt = waktuTiba, tg = x => x.tinggi_lo != null && x.tinggi_hi != null ? `${fmt(x.tinggi_lo)} sampai ${fmt(x.tinggi_hi)} m` : `sekitar ${fmt(Math.round(x.tinggi_m * 10) / 10)} m`;
      tambah(3, `${this.h("ombak", "Gelombang di pantai terdekat", pilModel)}<table class="tb2"><tbody>${P.map(x => baris(esc(x.kab || this.koord({lat: x.lat, lon: x.lon})), `<b class="lc-v">${x.menit < 1 ? "langsung" : mnt(x.menit)}</b><small class="lc-sub">${x.menit < 1 ? "di atas bidang patahan, " : ""}${tg(x)}</small>`)).join("")}</tbody></table>
        ${this.src("Simulasi, bukan prakiraan. Ikuti status resmi BMKG di atas.")}`); }).catch(() => {});
    /* 4. indeks risiko riwayat provinsi (data/risiko.json): skor 0 sampai 100, kelas sebagai pil */
    if (g.prov) Risiko.prov(g.prov).then(r => { if (!r) return;
      tambah(4, `${this.h("perisai", "Indeks risiko riwayat provinsi")}<div class="lc-rsk"><div class="lc-rsk-k"><span>${esc(namaProv(g.prov))}</span><span class="lc-pil${pilTerang(r.w) ? " terang" : ""}" style="--w:${r.w}">${r.kelas}</span></div><div class="lc-rsk-v"><b>${r.skor}</b><small>dari 100</small></div></div>
        <div class="lc-bar" style="--w:${r.w}" role="img" aria-label="Skor ${r.skor} dari 100"><i style="width:${Math.max(2, Math.min(100, r.skor))}%"></i></div>
        ${this.src(`Dari gempa M 5 atau lebih, ${r.r.tahun[0]} sampai ${r.r.tahun[1]}. Sumber: USGS`)}`); }).catch(() => {});
    /* 8. detail lengkap BMKG/InaTEWS (peta guncangan, siaran pers, mekanisme, stasiun, zona tsunami): dipasangkan lewat waktu dan jarak ke katalog BMKG; tombol sebaris dengan Simulasikan */
    if (typeof Ina !== "undefined") Ina.untukLaci(g).then(r => { const ak = el.querySelector("#laciAksi"); if (!r || !sama() || !ak) return;
      ak.insertAdjacentHTML("afterbegin", `<button type="button" class="btn sec" data-ina title="Detail lengkap BMKG (InaTEWS): peta guncangan, siaran pers, mekanisme sumber, stasiun">${this.ik("tabel", 16)}Detail BMKG</button>`);
      const t = ak.querySelector("[data-ina]"); if (t) t.onclick = () => Ina.buka(r); }).catch(() => {});
    /* 5. kantor BPBD terdekat (bpbd.json BNPB). DISEMBUNYIKAN (A24) seperti "Respons terdekat" karhutla: gempa.css menyembunyikan [data-j="Kontak BPBD"]; data kantor lama (± 2016), nomor perlu dicek */
    Kontak.dekat(g.lat, g.lon).then(K => { if (!K.length) return;
      tambah(5, `<h4 class="lc-h" data-j="Kontak BPBD">Kontak BPBD terdekat</h4><table class="tb2" data-j="Kontak BPBD"><tbody>${K.map(b => baris(esc(b.nama), `${fmt(Math.round(b.km))} km${b.pusdalops ? ", " + esc(b.pusdalops) : ""}`)).join("")}</tbody></table>
        <p class="fnd" data-j="Kontak BPBD">Sumber: BNPB (data kantor, perlu dicek ulang)</p>`); }).catch(() => {});
  },
  /* tombol bagikan (ikon, A19) untuk kejadian: tautan /gempa/k/G0016 lewat lembar bagikan peramban, atau disalin */
  async bagikan(g) { const u = location.origin + "/gempa/k/" + g.kej;
    try { if (navigator.share) return await navigator.share({title: `Gempa ${mTulis(g.m)} ${wilayahPendek(g.wilayah)}`, url: u}); await navigator.clipboard.writeText(u); toast("Tautan disalin"); } catch (e) { if (e?.name !== "AbortError") toast("Tautan belum bisa dibagikan"); } },
  _gel: new Map(),
  gelombang(g) { let c = this._gel.get(g.id); if (c) return c;
    const hit = (grid, mk) => new Promise(res => nanti(() => { const w = Tsunami.waktuTiba(grid, g.lat, g.lon, g.m, {dalam: g.dalam, maksMenit: mk});
      res((w?.pantai || []).filter(x => x.menit != null).sort((a, b) => a.menit - b.menit).slice(0, 5)); }));
    c = Tsunami.muat().then(async grid => { let P = await hit(grid, 60); if (!P.length) P = await hit(grid, 180); return P; });
    this._gel.set(g.id, c); if (this._gel.size > 30) this._gel.delete(this._gel.keys().next().value); return c; },
};
