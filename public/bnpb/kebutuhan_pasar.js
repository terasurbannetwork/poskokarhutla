"use strict";
/* Dua kartu pendamping perkiraan kebutuhan: harga pangan per provinsi dan aktivitas pelabuhan.
   Data (dimuat sekali, saat kartu mendekati layar): /data/harga_pangan.json, /data/harga_pangan_wfp.json, /data/inaportnet.json.
   Layar hanya membaca angka pipeline; selisih terhadap nasional dan median 12 bulan dihitung dari baris data itu sendiri.
   Butuh /inti/format.js (fmt, esc) dan /inti/nanti.js. */
(() => {
  const el = id => document.getElementById(id);
  /* komoditas pokok: id harga_pangan.json, nama layar, ikon ringkas tidak dipakai (pil kartu cukup) */
  const POKOK = [[28, "Beras medium"], [38, "Minyak goreng kemasan"], [37, "Gula konsumsi"], [36, "Telur ayam ras"], [32, "Cabai merah keriting"], [30, "Bawang merah"]];
  const IK = {harga: "M4 7h16M4 7l1 12h14l1-12M9 7a3 3 0 0 1 6 0", kapal: "M3 17l2 3h14l2-3M5 17l-1-6h16l-1 6M12 11V4h4"};
  const ikon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${IK[k]}"/></svg>`;
  const rp = v => "Rp" + fmt(Math.round(v / 100) * 100);                       // ratusan rupiah: tanpa presisi palsu
  const pst = v => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(Math.round(v * 10) / 10)) + "%";
  const median = a => { const s = a.filter(x => x != null && x > 0).sort((x, y) => x - y); return s.length ? (s[s.length >> 1] + s[(s.length - 1) >> 1]) / 2 : null; };
  const judulCase = s => s.toLowerCase().replace(/(^|[\s\-\/,(])([a-z])/g, (_, a, b) => a + b.toUpperCase());
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tglId = d => `${+d.slice(8)} ${BLN[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  const namaBulan = ym => `${BLN[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
  let H, W, P, prov = "11", pilihan = 0;

  const kartu = (id, pil, ik, judul, kanan, isi) => `<section class="ex ex-std" id="${id}"><header class="ex-hd"><span class="ex-ey">${ikon(ik)}${esc(pil)}</span>
    <div class="ex-jd"><h3>${judul}</h3>${kanan}</div></header><div class="ex-bd">${isi}</div></section>`;
  const tabel = (kepala, baris) => `<div class="ad-tabel-wadah ex-tabel"><table class="ad-tabel"><thead><tr>${kepala.map(([k, t]) => `<th title="${esc(t)}">${esc(k)}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>`;
  const hl = t => `<span class="hl">${esc(t)}</span>`;

  function gambarHarga() {
    const w = H.wilayah[prov], nas = H.wilayah["00"];
    if (!w || !nas) throw new Error("wilayah");
    const wf = W && W.wilayah[prov], pad = W ? W.padanan_komoditas : {};
    const baris = POKOK.map(([id, nm]) => {
      const h = w.harga[id], n = nas.harga[id], ada = h > 0, sel = ada && n > 0 ? (h - n) / n * 100 : null;
      const med = wf && wf[id] ? median(wf[id].slice(-12)) : null, dgn = ada && med ? (h - med) / med * 100 : null;
      return {id, nm, h: ada ? h : null, n, sel, med, dgn, sat: (H.komoditas.find(k => k.id === id) || {}).satuan || ""};
    });
    const ada = baris.filter(b => b.sel != null), mahal = ada.slice().sort((a, b) => b.sel - a.sel)[0];
    const judul = mahal ? `Di ${esc(w.nama)}, ${esc(mahal.nm.toLowerCase())} ${hl(rp(mahal.h))} per ${mahal.sat.endsWith("Liter") ? "liter" : "kg"}, ${hl(pst(mahal.sel))} dari rata-rata nasional`
      : `Harga pokok ${esc(w.nama)} belum dilaporkan pada ${esc(tglId(H.tanggal))}`;
    const pilih = `<select class="kp-pilih" id="kpProv" aria-label="Provinsi">${Object.entries(H.wilayah).filter(([k]) => k !== "00").sort((a, b) => a[1].nama.localeCompare(b[1].nama, "id"))
      .map(([k, v]) => `<option value="${k}"${k === prov ? " selected" : ""}>${esc(v.nama)}</option>`).join("")}</select>`;
    const cat = [`Harga per ${esc(tglId(H.tanggal))}. Median WFP adalah median bulanan 12 bulan terakhir dari ${W ? `${esc(W.sumber)}, diperbarui ${esc(tglId(W.diperbarui_sumber.slice(0, 10)))}, bulan terakhir bisa belum penuh` : "WFP (belum termuat)"}; tanda – berarti padanan atau datanya tidak ada untuk provinsi ini.`];
    if (!H.selisih_aktif) cat.push(`Selisih 30 hari belum ditampilkan: arsip harian baru ${fmt(H.arsip_hari)} hari, belum cukup.`);
    const kep = [["Komoditas", "Komoditas pangan pokok"], ["Harga", "Harga pada tanggal data di provinsi terpilih, dibulatkan ke ratusan rupiah"], ["Nasional", "Harga rata-rata nasional pada tanggal data"],
      ["Selisih nasional", "Persen harga provinsi terhadap nasional"], ["Median WFP", "Median harga bulanan 12 bulan terakhir (padanan komoditas WFP)"], ["Selisih median", "Persen harga pada tanggal data terhadap median WFP"]];
    const isi = tabel(kep, baris.map(b => `<tr><td data-label="Komoditas">${esc(b.nm)}</td><td class="n" data-label="Harga">${b.h ? rp(b.h) : "–"}</td><td class="n" data-label="Nasional">${b.n > 0 ? rp(b.n) : "–"}</td>
      <td class="n" data-label="Selisih nasional">${b.sel == null ? "–" : pst(b.sel)}</td><td class="n" data-label="Median WFP">${b.med && pad[b.id] ? rp(b.med) : "–"}</td><td class="n" data-label="Selisih median">${b.dgn == null || !pad[b.id] ? "–" : pst(b.dgn)}</td></tr>`).join(""))
      + `<p class="kp-cat">${cat.join(" ")}</p>`;
    const sel = el("kpProv");
    if (sel) { const k = el("kpHarga"); k.querySelector("h3").innerHTML = judul; k.querySelector(".ex-bd").innerHTML = isi; return; }   // select tetap: fokus papan ketik aman
    el("kpHarga").outerHTML = kartu("kpHarga", "Harga pangan", "harga", judul, pilih, isi);
    el("kpProv").addEventListener("change", e => { prov = e.target.value; const t = ++pilihan; nanti(() => { if (t === pilihan) tahan(gambarHarga, "kpHarga"); }); });
  }

  function gambarPelabuhan() {
    const bln = Object.keys(P.bulan).sort().filter(m => m < P.diambil.slice(0, 7)).pop();   // bulan berjalan belum penuh: dibuang
    if (!bln) { el("kpPelabuhan").outerHTML = kartu("kpPelabuhan", "Pelabuhan", "kapal", "Belum ada bulan penuh untuk aktivitas pelabuhan", "", ""); return; }
    const rows = Object.entries(P.bulan[bln]).map(([k, v]) => ({k, nm: judulCase(v.nama || P.pelabuhan[k] || k), d: v.dalam, l: v.luar, t: v.dalam + v.luar}))
      .sort((a, b) => b.t - a.t);
    if (!rows.length) { el("kpPelabuhan").outerHTML = kartu("kpPelabuhan", "Pelabuhan, nasional", "kapal", `Tidak ada data pelabuhan untuk ${esc(namaBulan(bln))}`, "", ""); return; }
    const top = rows.slice(0, 10), tot = rows.reduce((s, r) => s + r.t, 0);
    const judul = `${hl(top[0].nm)} paling sibuk pada ${esc(namaBulan(bln))}, ${hl(fmt(top[0].t))} kunjungan kapal dari ${hl(fmt(tot))} di ${fmt(rows.length)} pelabuhan`;
    const kep = [["Pelabuhan", "Nama pelabuhan menurut Inaportnet"], ["Dalam negeri", "Kunjungan kapal pelayaran dalam negeri sebulan"], ["Luar negeri", "Kunjungan kapal pelayaran luar negeri sebulan"], ["Total", "Dalam negeri ditambah luar negeri"]];
    const isi = tabel(kep, top.map(r => `<tr><td data-label="Pelabuhan">${esc(r.nm)}</td><td class="n" data-label="Dalam negeri">${fmt(r.d)}</td><td class="n" data-label="Luar negeri">${fmt(r.l)}</td><td class="n" data-label="Total">${fmt(r.t)}</td></tr>`).join(""))
      + `<p class="kp-cat">Angka seluruh Indonesia untuk sepuluh pelabuhan teratas. Data pelabuhan tidak membawa koordinat atau provinsi, dan nama pelabuhan belum terpadankan ke provinsi, jadi belum bisa disaring per provinsi. ${esc(namaBulan(P.diambil.slice(0, 7)))} belum penuh dan tidak dibandingkan.</p>`;
    el("kpPelabuhan").outerHTML = kartu("kpPelabuhan", "Pelabuhan, nasional", "kapal", judul, "", isi);
  }

  const muat = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
  const kosong = (id, t) => { el(id).innerHTML = `<p class="kp-cat" role="status">${esc(t)}</p>`; };
  const tahan = (f, id) => { try { f(); } catch (e) { kosong(id, "Data termuat tetapi kartu gagal digambar. Laporkan ke tim agar diperbaiki."); console.error(e); } };   // galat render != galat muat
  async function isi() {
    muat("/data/harga_pangan.json").then(h => { H = h; if (!H.wilayah || !H.wilayah[prov]) prov = Object.keys(H.wilayah || {}).find(k => k !== "00");
      return muat("/data/harga_pangan_wfp.json").catch(() => null).then(w => { W = w; tahan(gambarHarga, "kpHarga"); }); },   // WFP boleh hilang
      () => kosong("kpHarga", "Harga pangan belum bisa dimuat. Coba muat ulang sebentar lagi."));
    muat("/data/inaportnet.json").then(p => { P = p; tahan(gambarPelabuhan, "kpPelabuhan"); },
      () => kosong("kpPelabuhan", "Aktivitas pelabuhan belum bisa dimuat. Coba muat ulang sebentar lagi."));
  }
  const wadah = el("pasar"); if (!wadah) return;
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); nanti(isi); } }, {rootMargin: "300px"}); io.observe(wadah); }
  else nanti(isi);
})();
