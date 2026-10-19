"use strict";
/* Tab Posko air bersih kekeringan (DISEMBUNYIKAN, sama dengan Posko karhutla: ada di TABS, tidak di nav). Data: ../data/posko_kekeringan.json
   (scripts/kekeringan/posko.py, rantai terakhir status.py). Kebutuhan = batas atas: SEMUA penduduk kecamatan Siaga/Awas x 15 liter/orang/hari (Sphere 2018); tangki = asumsi 5.000 liter per rit. */
const Posko = (() => {
  let D = null;
  const kartu = (ey, judul, isi, catatan) => Kartu.ex(judul, "", "", isi, catatan).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`);
  const jtP = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const juta = l => F1(l / 1e6);
  function batang(rows) {
    const W = 940, L = innerWidth < 640 ? 110 : 190, rh = 28, mx = Math.max(1, ...rows.map(r => r.v)), X = v => v / mx * (W - L - 90);
    return `<svg viewBox="0 0 ${W} ${rows.length * rh + 6}" role="img" aria-label="Kebutuhan tangki air per provinsi">${rows.map((r, i) => { const y = i * rh;
      return `<g><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="13" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(r.v))}" height="${rh - 10}" rx="3" fill="#1d6fa5" data-tip="${r.tip}"/><g class="gf" style="--i:${i}">${Kartu.pil(L + X(r.v) + 8, y + 3, fmt(r.v), "#1d6fa5")[0]}</g></g>`; }).join("")}</svg>`; }
  function gambar() {
    const N = D.nasional, P = Object.entries(D.prov).sort((a, b) => b[1].tangki - a[1].tangki).slice(0, 12);
    const a = kartu("Posko air bersih", `${Kartu.hl(fmt(D.nasional.posko) + " posko")} di ${fmt(N.kab)} kabupaten/kota melayani ${Kartu.hl(jtP(N.jiwa) + " jiwa")} yang butuh sampai ${Kartu.hl(juta(N.liter) + " juta liter")} air sehari, setara ${Kartu.hl(fmt(N.tangki) + " rit tangki")} per hari`,
      batang(P.map(([k, o]) => ({n: namaProv(k), v: o.tangki, tip: `<b>${esc(namaProv(k))}</b><br>${fmt(o.posko)} posko, ${fmt(o.kab)} kabupaten/kota<br>${jtP(o.jiwa)} jiwa<br>${juta(o.liter)} juta liter per hari<br>${fmt(o.tangki)} rit tangki ${fmt(D.param.kap_tangki_l)} liter per hari`}))),
      `Batang = rit tangki ${fmt(D.param.kap_tangki_l)} liter per hari. BATAS ATAS: semua penduduk kecamatan Siaga atau Awas dihitung ${fmt(D.param.liter_orang_hari)} liter/orang/hari, padahal tidak semuanya kehilangan sumber air; ukuran skala logistik, bukan jumlah penerima. ${esc(D.sumber.liter)}. ${esc(D.sumber.tangki)}. Posko = satu per gugus kecamatan dalam ${fmt(D.param.gabung_km)} km. Sumber: Pantau Bencana`);
    const K = D.kabupaten.slice(0, 20), baris = K.map(o => `<tr><td><b translate="no">${esc(o.nama)}</b><br><small translate="no">${esc(namaProv(o.prov))}</small></td><td>${pill(o.lv)}</td><td class="n num">${rb(o.jiwa)}</td><td class="n num">${fmt(o.tangki)}</td><td class="n num">${fmt(o.posko.length)}</td>
      <td>${o.bpbd?.pusdalops ? `<span translate="no">${esc(o.bpbd.pusdalops)}</span>` : "–"}</td><td class="n num">${o.embung != null ? fmt(o.embung) : "–"}</td></tr>`).join("");
    const b = kartu("Kabupaten", `${Kartu.hl(esc(K[0].nama))} perlu ${Kartu.hl(fmt(K[0].tangki) + " rit tangki")} sehari, terbanyak dari ${fmt(D.kabupaten.length)} kabupaten/kota`,
      `<div class="tw"><table class="kl-tb"><thead><tr><th>Kabupaten/kota</th><th>Status</th><th class="n">Jiwa</th><th class="n">Rit tangki/hari</th><th class="n">Posko</th><th>Pusdalops BPBD</th><th class="n">Embung OSM</th></tr></thead><tbody>${baris}</tbody></table></div>`,
      `20 kabupaten/kota dengan status tertinggi lalu penduduk terbanyak. Embung = jumlah objek OpenStreetMap per kabupaten (kasar, tidak lengkap): nol bukan bukti tak ada tampungan. Kontak dari BNPB peta_bpbd. Sumber: ${esc(D.sumber.pos)}`);
    return a + b; }
  async function render() {
    const el = $("#posko"); if (!el) return;
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat posko…</div>`;
      try { D = await muatJSON("../data/posko_kekeringan.json"); S.posko = D; } catch (e) { el.innerHTML = `<div class="kosong">Data posko belum tersedia.</div>`; return; } }
    el.innerHTML = D.nasional?.posko ? gambar() : `<div class="kosong">Tidak ada kecamatan Siaga atau Awas, jadi tidak ada posko air bersih.</div>`; }
  return {render};
})();
