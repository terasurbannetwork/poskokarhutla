/* operasi.js — tab "Operasi": rencana operasi & kebutuhan sumber daya (regu, personel, pompa, selang, titik bor, heli, OMC, logistik).
   Skrip klasik, dimuat SETELAH skrip utama index.html. Global yang dipakai: S, ASUMSI, UH, namaProv, fmt, rp, esc, muatJSON, bukaTab, Laci, $.
   Beban kerja per kompleks (regu-hari) dihitung harian oleh scripts/data/operasi.py -> public/data/operasi.json; berkas ini hanya
   membaginya dengan target hari T dan menggambar. Rumus T-bergantung (OperasiHitung) HARUS sama dengan operasi.py:kebutuhan/total —
   `python3 scripts/data/operasi.py uji` membandingkan keduanya lewat node. Metode, koefisien, dan sumber: OPERASI.md.

   KAIT UNTUK TAB LAIN (mis. kartu keputusan ringkasan.js):
     await Operasi.siap();                       // true bila operasi.json termuat
     const b = Operasi.butuhProv("62", 3);       // T hari opsional (default = slider), skenario tengah
     // b = {regu, personel, pompa, selang, bor, heli, ada: {personel, sumber}|null, tambahPersonel, tambahRegu, kompleks}
     Operasi.kalimat("62")                       // "butuh tambah 290 regu = 4.785 personel; pompa +1.200; titik bor +3.048; heli +2"
*/
"use strict";
/* ---------- rumus murni (tanpa DOM; diuji node lewat operasi.py uji) ---------- */
var OperasiHitung = (() => {
  const H = {koef: null};
  H.k = (n, s) => H.koef[n][["lo", "mid", "hi"][s]];
  H.kebutuhan = (c, T, s = 1) => {
    T = Math.max(1, Math.min(14, Math.trunc(T)));
    const rg = c.wl[s] / T, rb = c.wb[s] / (T + H.k("hari_mopup", s)), pg = H.k("pompa_regu_gambut", s);
    const pompa = (rb * pg + rg * (c.ps >= 0.5 ? pg : 1)) * H.k("cadangan_pompa", s);
    return {regu_kerja: rg + rb, regu_garis: rg, regu_bara: rb, pompa, bor: c.bor[s], heli: c.wh[s] / T};
  };
  H.total = (L, T, s = 1) => {
    const t = {regu_kerja: 0, regu_garis: 0, regu_bara: 0, pompa: 0, bor: 0, heli: 0};
    for (const c of L) { const b = H.kebutuhan(c, T, s); for (const x in t) t[x] += b[x]; }
    for (const x of ["regu_kerja", "regu_garis", "regu_bara", "pompa", "heli"]) t[x] = Math.ceil(t[x] - 1e-9);
    t.selang = t.pompa * H.k("selang_pompa", s);
    t.regu = Math.ceil(t.regu_kerja * H.k("rotasi", s) - 1e-9);
    t.personel = Math.floor(t.regu * H.k("orang_regu", s) * (1 + H.k("dukungan", s)) + 0.5);
    return t;
  };
  return H;
})();

var Operasi = typeof document === "undefined" ? null : (() => {
  const H = OperasiHitung, W = {merah: "#c9503a", oranye: "#e58a45", kuning: "#e3b94e", hijau: "#5a9e74", biru: "#4f8fc4", ungu: "#5f6fb0", teal: "#2b8c86", tua: "#7a2b2b"};
  const KOREM = {"14": "Korem 031/Wira Bima", "15": "Korem 042/Garuda Putih", "16": "Korem 044/Garuda Dempo", "61": "Korem 121/Alambhana Wanawai", "62": "Korem 102/Panju Panjung",
    "63": "Korem 101/Antasari", "64": "Korem 091/Aji Surya Natakesuma", "53": "Korem 161/Wira Sakti", "93": "Korem 174/Anim Ti Waninggap"};
  const SKEN = ["Optimis", "Tengah", "Pesimis"], JENIS = {gambut: "Gambut", mineral: "Mineral/semak", savana: "Savana"};
  const baca = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const simpan = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat */ } };
  const st = {T: Math.max(1, Math.min(14, +baca("pk-op-T", 3) || 3)), s: [0, 1, 2].includes(baca("pk-op-s", 1)) ? baca("pk-op-s", 1) : 1};
  let D = null, R = null, gagal = "", janji = null;
  const nP = k => typeof namaProv === "function" ? namaProv(k) : k;
  const tag = j => `<i class="op-j op-${j}">${{resmi: "Resmi", satelit: "Satelit", model: "Model"}[j]}</i>`;
  const f1 = v => fmt(Math.round(v * 10) / 10), f0 = v => fmt(Math.round(v));
  const km = m => m >= 1000 ? f1(m / 1000) + " km" : f0(m) + " m";
  const tanda = v => v > 0 ? "+" + fmt(v) : v < 0 ? "−" + fmt(-v) : "0";

  /* ---------- data ---------- */
  function siap() {
    return janji ||= (async () => {
      try {
        [D, R] = await Promise.all([muatJSON("data/operasi.json"), muatJSON("data/operasi_resmi.json").catch(() => null)]);
        H.koef = D.koef;
        const per = {};
        for (const c of D.kompleks) (per[c.prov] ||= []).push(c);
        D.byP = per;
        return true;
      } catch (e) { gagal = String(e.message || e); return false; }
    })();
  }
  const adaProv = k => { const a = D.prov[k]?.ada; if (a) return {personel: a.personel, sumber: a.sumber, wb: a.wb, omc: a.omc, jenis: "resmi"};
    const d = D.prov[k]?.daops; return d ? {personel: d.anggota, sumber: `Manggala Agni ${d.n} Daops saja (SiPongi); TNI/Polri/MPA tidak dilaporkan`, wb: null, omc: null, jenis: "daops"} : null; };
  function butuhProv(k, T = st.T, s = st.s) {
    if (!D) return null;
    const L = D.byP[k] || [], t = H.total(L, T, s), ada = adaProv(k);
    const tp = ada ? Math.max(0, t.personel - ada.personel) : t.personel;
    return {...t, kompleks: L.length, ada, tambahPersonel: tp, tambahRegu: Math.ceil(tp / (H.k("orang_regu", s) * (1 + H.k("dukungan", s))) - 1e-9),
      tambahHeli: Math.max(0, t.heli - (ada?.wb || 0))};
  }
  const kalimat = (k, T) => { const b = butuhProv(k, T); if (!b) return "";
    return `${b.tambahPersonel ? `butuh tambah ${fmt(b.tambahRegu)} regu = ${fmt(b.tambahPersonel)} personel` : "personel cukup"}; pompa +${fmt(b.pompa)}; titik bor +${fmt(b.bor)}; heli +${fmt(b.tambahHeli)}`; };
  /* T terkecil (1-14) yang kebutuhan personelnya <= personel yang sudah terjun */
  const tRealistis = (L, ada, s) => { for (let T = 1; T <= 14; T++) if (H.total(L, T, s).personel <= ada) return T; return null; };
  const omcHari = k => D.prov[k]?.omc?.hari || [];
  function biaya(k, t, T, s) {
    const A = typeof ASUMSI === "object" ? ASUMSI : {porsiBKO: .4, porsiMPA: .4, honorMPA: 100e3, konsumsi: 150e3, jamPompa: 6, lPompa: 4.9, bbm: 10e3, heliJam: 150e6, omc: 220e6};
    const uh = (typeof UH === "object" && UH[k]) || 380e3, hari = T + H.k("hari_mopup", s);
    const orang = t.personel * (A.porsiBKO * uh + A.porsiMPA * A.honorMPA + A.konsumsi) * hari;
    const bbmL = t.pompa * A.jamPompa * A.lPompa, bbm = bbmL * A.bbm * hari;
    const heli = t.heli * H.k("heli_jam_hari", s) * A.heliJam * T, omc = (omcHari(k).length && t.regu ? 1 : 0) * Math.min(omcHari(k).length, hari) * A.omc;
    const bor = t.bor * H.k("biaya_bor", s);
    return {orang, bbm, heli, omc, bor, total: orang + bbm + heli + omc + bor, bbmL, hari, airL: t.personel * H.k("air_minum", s)};
  }

  /* ---------- gambar ---------- */
  async function render() {
    const el = $("#operasi"); if (!el) return;
    if (!D) { el.innerHTML = `<p class="op-muat">Memuat rencana operasi…</p>`; if (!await siap()) { el.innerHTML = `<p class="op-muat">Data operasi belum tersedia (${esc(gagal)}). Jalankan scripts/data/operasi.py.</p>`; return; } }
    const T = st.T, s = st.s, nas = H.total(D.kompleks, T, s), resmiP = R?.personel_darat ?? null;
    const provs = Object.keys(D.byP).map(k => ({k, b: butuhProv(k, T, s)})).sort((a, b) => b.b.personel - a.b.personel);
    const tReal = resmiP ? tRealistis(D.kompleks, resmiP, s) : null, gapN = resmiP != null ? nas.personel - resmiP : null;
    const bN = provs.reduce((a, {k, b}) => { const x = biaya(k, b, T, s); for (const y in x) a[y] = (a[y] || 0) + x[y]; return a; }, {});
    const wbResmi = R?.armada_udara?.water_bombing, omcResmi = R ? Object.values(R.omc_pesawat || {}).reduce((a, b) => a + b, 0) : null;
    const omcProv = provs.filter(({k, b}) => b.regu && omcHari(k).length >= 2).map(({k}) => k);
    el.innerHTML = `
    <div class="head"><div><h2>Rencana operasi & kebutuhan sumber daya</h2>
      <p>Berapa regu, personel, pompa, selang, titik bor, helikopter, dan hari modifikasi cuaca yang dibutuhkan agar front api aktif terkurung dalam <b>${T} hari</b> dan bara gambut padam ${H.k("hari_mopup", s)} hari sesudahnya. Data satelit ${esc(D.per || "")} · dihitung ${esc((D.dibuat || "").slice(0, 16).replace("T", " "))} WIB.
      Label angka: ${tag("resmi")} rekap BNPB atau pernyataan pemerintah, ${tag("satelit")} NASA FIRMS, ${tag("model")} hitungan platform dari koefisien terbuka.</p></div></div>
    <div class="op-kendali card">
      <label class="op-slider"><span class="lbl">Target front terkurung</span><input type="range" min="1" max="14" step="1" value="${T}" data-op="T" aria-label="Target hari terkurung"><b>${T} hari</b></label>
      <div class="seg" role="group" aria-label="Skenario koefisien">${SKEN.map((n, i) => `<button data-ops="${i}" aria-pressed="${i === s}">${n}</button>`).join("")}</div>
      <small>Skenario memakai koefisien bawah/tengah/atas (tabel koefisien di bawah). Mop-up bara: ${T} + ${H.k("hari_mopup", s)} = ${T + H.k("hari_mopup", s)} hari.</small>
    </div>
    <div class="grid g4 op-kpi">
      ${kpi("Personel dibutuhkan", fmt(nas.personel), `${fmt(nas.regu)} regu (${fmt(nas.regu_kerja)} di garis + rotasi) ${tag("model")}`, W.tua)}
      ${kpi("Personel terjun", resmiP != null ? fmt(resmiP) : "–", `rekap BNPB s.d. ${esc(R?.per || "?")} ${tag("resmi")}`, "#0b2545")}
      ${kpi("Selisih", gapN != null ? tanda(gapN) : "–", gapN > 0 ? `kurang ${fmt(Math.ceil(gapN / (H.k("orang_regu", s) * (1 + H.k("dukungan", s)))))} regu untuk target ${T} hari` : "personel cukup untuk target ini", gapN > 0 ? W.merah : W.hijau)}
      ${kpi("Target realistis", tReal ? tReal + " hari" : "> 14 hari", `dengan ${resmiP != null ? fmt(resmiP) : "?"} personel yang sudah ada`, tReal && tReal <= 3 ? W.hijau : W.merah)}
      ${kpi("Pompa jinjing/induk", fmt(nas.pompa), `selang ± ${km(nas.selang)} ${tag("model")}`, W.biru)}
      ${kpi("Titik bor air", fmt(nas.bor), `untuk ± ${fmt(D.rekonsiliasi.bara_ha[s])} ha bara gambut ${tag("model")}`, W.teal)}
      ${kpi("Heli water bombing", fmt(nas.heli), `butuh (front tak terjangkau ≥ ${H.k("jam_tiba", s)} jam) · ada ${wbResmi ?? "?"} ${tag("resmi")}`, W.ungu)}
      ${kpi("Modifikasi cuaca", fmt(omcProv.length) + " provinsi", `punya ≥ 2 hari awal berpeluang hujan 15–60% · pesawat OMC ada ${omcResmi ?? "?"} ${tag("resmi")}`, "#0b2545")}
    </div>
    <div class="grid g2">
      <section class="card op-blok"><h3>Logistik per hari ${tag("model")}</h3>
        <table class="op-tb"><tbody>
          <tr><td>Makan (3 kali)</td><td class="n">${fmt(nas.personel * 3)} porsi</td></tr>
          <tr><td>Air minum (${H.k("air_minum", s)} L/orang)</td><td class="n">${fmt(Math.round(bN.airL))} L</td></tr>
          <tr><td>BBM pompa (${typeof ASUMSI === "object" ? ASUMSI.jamPompa : 6} jam × ${typeof ASUMSI === "object" ? f1(ASUMSI.lPompa) : 4.9} L/jam)</td><td class="n">${fmt(Math.round(bN.bbmL))} L</td></tr>
          <tr><td>Air untuk bara (${fmt(H.k("air_bara", s))} L/ha, sebar ${T + H.k("hari_mopup", s)} hari)</td><td class="n">${fmt(Math.round(D.rekonsiliasi.bara_ha[s] * H.k("air_bara", s) / (T + H.k("hari_mopup", s)) / 1e6))} juta L</td></tr>
          <tr><td>Rotasi</td><td>3 giliran: 2 regu bekerja, 1 istirahat (× ${f1(H.k("rotasi", s))})</td></tr>
        </tbody></table></section>
      <section class="card op-blok"><h3>Perkiraan biaya ${T + H.k("hari_mopup", s)} hari ${tag("model")}</h3>
        <table class="op-tb"><tbody>
          <tr><td>Uang harian & konsumsi personel</td><td class="n">${rp(bN.orang)}</td></tr>
          <tr><td>BBM pompa</td><td class="n">${rp(bN.bbm)}</td></tr>
          <tr><td>Titik bor (Rp ${rb0(H.k("biaya_bor", s))}/titik)</td><td class="n">${rp(bN.bor)}</td></tr>
          <tr><td>Helikopter (${H.k("heli_jam_hari", s)} jam/hari × ${T} hari)</td><td class="n">${rp(bN.heli)}</td></tr>
          <tr><td>Modifikasi cuaca (hari layak)</td><td class="n">${rp(bN.omc)}</td></tr>
          <tr class="op-jml"><td>Jumlah</td><td class="n">${rp(bN.total)}</td></tr>
        </tbody></table><p class="op-cat">Harga satuan dari asumsi anggaran tab Posko (uang harian SBM 2026, BBM, sewa heli Rp ${rb0(typeof ASUMSI === "object" ? ASUMSI.heliJam : 150e6)}/jam, OMC Rp ${rb0(typeof ASUMSI === "object" ? ASUMSI.omc : 220e6)}/hari). Manggala Agni sudah dibiayai DIPA; pompa dan selang yang sudah dimiliki tidak dihitung ulang.</p></section>
    </div>
    ${hRekon(T, s)}
    <section class="op-bag"><h3 class="op-h">Kebutuhan dan selisih per provinsi <small>klik baris untuk rincian kompleks dan rumus langkah demi langkah</small></h3>
      <div class="tw"><table class="op-prov"><thead><tr><th>Provinsi</th><th class="n">Kompleks</th><th class="n">Front km</th><th class="n">Bara ha</th><th class="n">Personel butuh</th><th class="n">Terjun</th><th class="n">Selisih</th><th class="n">Pompa</th><th class="n">Titik bor</th><th class="n">Heli</th><th class="n">OMC</th><th>Tambahan</th></tr></thead>
      <tbody>${provs.filter(x => x.b.personel).map(({k, b}) => { const L = D.byP[k], fr = L.reduce((a, c) => a + c.front[s], 0), ba = L.reduce((a, c) => a + c.bara[s], 0), gap = b.ada ? b.personel - b.ada.personel : null;
        return `<tr data-opp="${k}" tabindex="0"><td><b>${esc(nP(k))}</b></td><td class="n">${fmt(b.kompleks)}</td><td class="n">${f0(fr)}</td><td class="n">${f0(ba)}</td><td class="n"><b>${fmt(b.personel)}</b><small>${fmt(b.regu)} regu</small></td>
          <td class="n">${b.ada ? fmt(b.ada.personel) + `<small>${b.ada.jenis === "resmi" ? "BNPB" : "Daops saja"}</small>` : "<small>tidak dilaporkan</small>"}</td>
          <td class="n op-gap ${gap == null ? "" : gap > 0 ? "kurang" : "cukup"}">${gap == null ? "–" : tanda(gap)}</td><td class="n">${fmt(b.pompa)}</td><td class="n">${fmt(b.bor)}</td>
          <td class="n">${fmt(b.heli)}${b.ada?.wb != null ? `<small>ada ${b.ada.wb}</small>` : ""}</td><td class="n">${omcHari(k).length ? omcHari(k).length + " hari" : "–"}</td>
          <td class="op-tambah">${esc(kalimat(k, T))}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="op-cat">"Terjun" = total personel harian BNPB (termasuk Satpol PP dan Pemda yang tidak selalu di garis api) untuk enam provinsi pantauan; provinsi lain hanya Manggala Agni di Daops sehingga selisihnya batas atas. Pompa dan titik bor yang sudah ada tidak dilaporkan per provinsi, jadi angkanya kebutuhan penuh.</p></section>
    ${hTNP(T, s)}
    ${hPlaybook(T, s)}
    ${hPolhut(s)}
    ${hKoef()}`;
    const sl = el.querySelector('[data-op="T"]');
    sl.oninput = () => { sl.nextElementSibling.textContent = sl.value + " hari"; };
    sl.onchange = () => { st.T = +sl.value; simpan("pk-op-T", st.T); render(); };
    el.querySelectorAll("[data-ops]").forEach(b => b.onclick = () => { st.s = +b.dataset.ops; simpan("pk-op-s", st.s); render(); });
    el.querySelectorAll("[data-opp]").forEach(r => { r.onclick = () => dlgProv(r.dataset.opp); r.onkeydown = e => { if (e.key === "Enter") dlgProv(r.dataset.opp); }; });
    el.querySelectorAll("[data-opk]").forEach(b => b.onclick = () => dlgKompleks(b.dataset.opk));
  }
  const rb0 = v => v >= 1e9 ? f1(v / 1e9) + " M" : v >= 1e6 ? f1(v / 1e6) + " jt" : fmt(v);
  const kpi = (l, v, sub, w) => `<div class="kpi op-k" style="--w:${w}"><span class="lbl">${l}</span><b>${v}</b><small>${sub}</small></div>`;

  function hRekon(T, s) {
    const r = D.rekonsiliasi, res = R?.belum_padam_ha ? R.belum_padam_ha.prioritas_6_prov + R.belum_padam_ha.lainnya : null;
    const bn = Object.entries(D.prov).filter(([, v]) => v.ada).map(([k, v]) => [k, v.ada.belum_padam_ha, (D.byP[k] || []).reduce((a, c) => a + c.px, 0)]);
    return `<section class="card op-blok op-rekon"><h3>Resmi vs satelit: mengapa angkanya berbeda</h3>
      <div class="grid g3">
        <div><span class="lbl">Belum padam ${tag("resmi")}</span><b class="op-big">${res != null ? fmt(res) + " ha" : "–"}</b><small>${R ? `${fmt(R.belum_padam_ha.prioritas_6_prov)} ha di 6 provinsi prioritas + ${fmt(R.belum_padam_ha.lainnya)} ha lainnya; ${fmt(R.dipadamkan_total_ha)} ha sudah dipadamkan; ${R.padam_hari_sama_pct}% luas baru padam di hari yang sama` : ""}</small></div>
        <div><span class="lbl">Api aktif 24 jam ${tag("satelit")}</span><b class="op-big">${fmt(r.kompleks)} kompleks</b><small>${fmt(r.px24)} piksel VIIRS (${fmt(r.px24_gambut)} di gambut); jejak piksel ${fmt(r.ha_piksel)} ha, bukan luas terbakar</small></div>
        <div><span class="lbl">Bara gambut yang direncanakan ${tag("model")}</span><b class="op-big">${fmt(r.bara_ha[s])} ha</b><small>${fmt(H.k("ha_bara_piksel", s))} ha bara per piksel aktif (rentang ${fmt(r.bara_ha[0])}–${fmt(r.bara_ha[2])} ha). Agar sama dengan angka BNPB, tiap piksel hanya boleh berisi ${r.ha_per_piksel_setara_resmi ?? "?"} ha api.</small></div>
      </div>
      <ol class="op-alasan">
        <li><b>Definisinya berbeda.</b> "Luas belum padam" BNPB adalah luas yang sudah dicek regu darat dan dilaporkan masih menyala. Piksel satelit adalah kotak 375 × 375 m (14 ha) yang di dalamnya ada sumber panas, sekecil apa pun; satu piksel tidak sama dengan 14 ha terbakar.</li>
        <li><b>Gambut membara tanpa nyala.</b> Bara di bawah permukaan bisa padam di permukaan (dilaporkan padam) tetapi masih terdeteksi panas, lalu menyala lagi beberapa hari kemudian. Platform mempertahankan kompleks gambut kering 7 hari karena itu.</li>
        <li><b>Api baru belum terlaporkan.</b> Satelit melihat seluruh Indonesia tiap beberapa jam; laporan darat hanya mencakup lokasi yang sudah didatangi. ${fmt(r.kompleks)} kompleks aktif jauh lebih banyak dari lokasi yang tercantum di rekap.</li>
        <li><b>Cakupan wilayah.</b> Rekap harian BNPB di platform ini hanya enam provinsi pantauan; ${fmt(r.kompleks - bn.reduce((a, x) => a + (D.byP[x[0]] || []).length, 0))} kompleks aktif ada di luar enam provinsi itu (terbanyak Papua Selatan).</li>
      </ol>
      <div class="tw"><table class="op-tb"><thead><tr><th>Provinsi</th><th class="n">Akan dipadamkan (BNPB harian)</th><th class="n">Piksel aktif 24 jam</th></tr></thead><tbody>${bn.map(([k, h, p]) => `<tr><td>${esc(nP(k))}</td><td class="n">${f1(h)} ha</td><td class="n">${fmt(p)}</td></tr>`).join("")}</tbody></table></div>
      <p class="op-cat">Kedua angka ditampilkan apa adanya. Perencanaan di halaman ini memakai satelit karena ia satu-satunya sumber yang mencakup seluruh wilayah setiap hari; angka resmi dipakai sebagai pembanding dan batas bawah.</p></section>`;
  }

  function hTNP(T, s) {
    const L = D.kompleks.filter(c => c.tnp), t = H.total(L, T, s), so = (R?.sorotan || []).find(x => /Tanjung Puting/i.test(x.lokasi));
    if (!L.length && !so) return "";
    const ha = so?.luas_ha || 0, rr = H.k("bara_regu", s), hm = T + H.k("hari_mopup", s), hb = H.k("ha_per_bor", s);
    const reguResmi = Math.ceil(ha / (rr * hm) - 1e-9), reguTot = Math.ceil(reguResmi * H.k("rotasi", s) - 1e-9), org = Math.round(reguTot * 15 * (1 + H.k("dukungan", s)));
    const pompa = Math.ceil(reguResmi * 2 * H.k("cadangan_pompa", s)), bor = Math.ceil(ha / hb), selang = pompa * H.koef.selang_pompa.hi;
    const tak = L.filter(c => c.jsum === "akses" && (c.jam == null || c.jam > H.k("jam_tiba", s)));
    return `<section class="card op-blok op-tnp"><h3>Taman Nasional Tanjung Puting (Kalimantan Tengah): paket penanganan</h3>
      <p>${so ? `Kebakaran baru <b>${fmt(so.luas_ha)} ha</b> ${tag("resmi")} di rawa gambut yang sulit dijangkau kendaraan. ` : ""}Satelit mencatat <b>${fmt(L.length)}</b> kompleks aktif di dalam taman nasional ${tag("satelit")} dengan ${fmt(L.reduce((a, c) => a + c.px, 0))} piksel aktif 24 jam; ${fmt(tak.length)} kompleks tidak punya rute jalan/sungai ≤ ${H.k("jam_tiba", s)} jam menurut graf OSM. Jejak 7 hari kompleks satelit (${fmt(Math.round(L.reduce((a, c) => a + c.luas, 0)))} ha) bukan luas terbakar dan tidak dapat dibandingkan langsung dengan angka BNPB.</p>
      <div class="grid g2">
        <div><span class="lbl">Paket dari angka resmi ${fmt(ha)} ha ${tag("model")}</span>
          <ol class="op-rumus">
            <li>Regu mop-up = ${fmt(ha)} ha ÷ (${f1(rr)} ha/regu/hari × ${hm} hari) = <b>${fmt(reguResmi)} regu</b> bekerja</li>
            <li>Dengan rotasi × ${f1(H.k("rotasi", s))} = ${fmt(reguTot)} regu × 15 orang × ${f1(1 + H.k("dukungan", s))} (komando, logistik, motoris) = <b>${fmt(org)} personel</b></li>
            <li>Pompa = ${fmt(reguResmi)} regu × 2 (pompa apung/induk + jinjing) × ${f1(H.k("cadangan_pompa", s))} cadangan = <b>${fmt(pompa)} pompa</b>; selang panjang ${fmt(H.koef.selang_pompa.hi)} m/pompa = <b>${km(selang)}</b></li>
            <li>Titik bor/bor air di gambut kering = ${fmt(ha)} ÷ ${fmt(hb)} ha = <b>${fmt(bor)} titik</b>; di rawa yang masih berair pompa apung langsung menyedot air permukaan</li>
            <li>Perahu: 1 klotok/speedboat per 2 regu = <b>${fmt(Math.ceil(reguTot / 2))} perahu</b> (asumsi platform)</li>
            <li>Helikopter: 1–2 unit untuk pendinginan titik (spot cooling) di depan regu; <b>tidak memadamkan bara gambut</b></li>
          </ol></div>
        <div><span class="lbl">Paket dari satelit (semua kompleks TN) ${tag("model")}</span>
          <table class="op-tb"><tbody><tr><td>Regu (rotasi termasuk)</td><td class="n"><b>${fmt(t.regu)}</b></td></tr><tr><td>Personel</td><td class="n"><b>${fmt(t.personel)}</b></td></tr>
          <tr><td>Pompa · selang</td><td class="n">${fmt(t.pompa)} · ${km(t.pompa * H.koef.selang_pompa.hi)}</td></tr><tr><td>Titik bor</td><td class="n">${fmt(t.bor)}</td></tr><tr><td>Heli WB (front tak terjangkau)</td><td class="n">${fmt(t.heli)}</td></tr></tbody></table>
          <p class="op-cat">Akses: dari Kumai/Pangkalan Bun lewat Sungai Sekonyer dengan klotok, lalu jalan kaki di rawa; Daops Pangkalanbun (PKB-05) dan Balai TN Tanjung Puting memimpin, dibantu TNI, Polri, MPA desa penyangga, dan perusahaan sawit di batas timur (Permentan 5/2018). Waktu tempuh sungai belum dimodelkan untuk semua kompleks.</p>
          <div class="op-kl">${L.slice(0, 8).map(c => `<button class="btn sec" data-opk="${c.id}">${c.id} · ${fmt(c.px)} piksel</button>`).join("")}</div></div>
      </div></section>`;
  }

  const PLAY = [
    ["gambut_dalam", "Gambut dalam / kering (DC ≥ 350)", W.tua, [
      ["Deteksi & cek lapangan", "Manggala Agni, MPA, BPBD; tim 2 orang bermotor", "≤ 24 jam sejak titik panas"],
      ["Serangan awal di permukaan", "Regu terdekat dengan 2 pompa (induk + jinjing)", "≤ 6 jam sejak terkonfirmasi"],
      ["Sekat: basahi jalur 3–5 m di depan api; parit hanya bila mencapai muka air", "Regu sekat bakar terpisah dari regu semprot", "Hari 1–T"],
      ["Pembasahan & titik bor: satu titik per ± 4 ha, injektor gambut ke lapisan membara", "Regu + operator bor (BRGM/BPBD); 3 jam per titik", "Hari 1–T+4"],
      ["Mop-up bara sampai tidak berasap dan suhu gambut 30–50 cm di bawah permukaan < 40 °C (termometer tusuk/inframerah; ambang kerja platform)", "Regu mop-up bergiliran siang-malam", "T+4 hari, bisa berminggu-minggu"],
      ["Patroli pasca padam & sekat kanal untuk menaikkan muka air", "MPA, polisi hutan, BRGM", "14 hari setelah padam"],
      ["Penegakan hukum: olah TKP, segel lahan, telusuri pemilik", "Gakkum Kehutanan/KLH, Polri", "≤ 7 hari"]]],
    ["gambut_dangkal", "Gambut dangkal (< 1 m)", W.oranye, [
      ["Deteksi & cek lapangan", "Manggala Agni, MPA, BPBD", "≤ 24 jam"], ["Serangan awal langsung dengan pompa jinjing", "Regu terdekat", "≤ 6 jam"],
      ["Parit sekat sampai tanah mineral di sayap api", "Regu sekat bakar, alat tangan", "Hari 1–T"], ["Pembasahan dari kanal/parit; titik bor bila air > 0,5 km", "Regu + operator pompa", "Hari 1–T"],
      ["Mop-up sampai tidak berasap dan dingin disentuh", "Regu mop-up", "T+2 hari"], ["Patroli pasca", "MPA, polisi hutan", "7 hari"], ["Penegakan hukum", "Gakkum, Polri", "≤ 7 hari"]]],
    ["mineral", "Tanah mineral / semak belukar", W.kuning, [
      ["Deteksi & cek lapangan", "MPA, BPBD, Manggala Agni", "≤ 24 jam"], ["Serangan langsung di sayap dan kepala api (bila ISI rendah)", "Regu terdekat, kepyok + pompa punggung", "≤ 2–6 jam"],
      ["Sekat bakar 1–3 m dengan alat tangan; bakar balik hanya di bawah komandan", "Regu sekat bakar", "Hari 1–T"], ["Mop-up sampai 30 m dari tepi api", "Regu", "1 hari setelah terkurung"],
      ["Patroli pasca", "MPA", "3 hari"], ["Penegakan hukum bila disengaja", "Polri", "≤ 7 hari"]]],
    ["savana", "Savana NTT/NTB/Papua Selatan", W.hijau, [
      ["Deteksi & cek lapangan (prioritas dekat permukiman)", "BPBD, MPA, kelompok tani", "≤ 12 jam"], ["Serangan langsung dengan kepyok, garu, pompa punggung; lindungi permukiman dulu", "Regu desa + BPBD", "≤ 2 jam"],
      ["Sekat bakar lebar rumput 3–5 m, manfaatkan jalan dan sungai", "Regu", "Hari 1"], ["Mop-up singkat (bahan bakar ringan)", "Regu", "≤ 1 hari"],
      ["Patroli sore hari berangin", "MPA", "musim kemarau"], ["Pencegahan: bakar terkendali awal musim bersama masyarakat adat", "Dinas, MPA", "sebelum puncak kemarau"]]],
    ["konservasi", "Kawasan konservasi / rawa (TN, SM, CA)", W.teal, [
      ["Deteksi & cek lapangan lewat sungai", "Balai TN/BKSDA, Manggala Agni", "≤ 24 jam"], ["Serangan awal: pompa apung dari sungai/rawa, selang panjang 300–500 m", "Regu Manggala Agni + MMP", "≤ 12 jam (perahu)"],
      ["Pendinginan titik dengan heli di depan regu (bukan pemadaman)", "BNPB (water bombing)", "selama front belum terkurung"], ["Bor air di gambut kering, pembasahan", "Regu + BRGM", "Hari 1–T+4"],
      ["Mop-up tanpa alat berat; lindungi habitat satwa", "Regu bergiliran", "T+4 hari"], ["Patroli pasca & pemulihan sekat kanal", "Polisi hutan, MMP", "14 hari"], ["Penegakan hukum perambahan", "Gakkum", "≤ 7 hari"]]],
    ["konsesi", "Areal konsesi (sawit, PBPH)", W.ungu, [
      ["Perusahaan melapor dan menurunkan regu sendiri", "Brigade perusahaan (wajib: Permentan 5/2018, P.32/2016)", "≤ 1 jam sejak terdeteksi"], ["Pemerintah cek: bila regu & sarana perusahaan tidak memadai, regu pemerintah masuk", "Manggala Agni, BPBD", "≤ 24 jam"],
      ["Pemadaman & pembasahan memakai sarana perusahaan (pompa, embung, kanal)", "Perusahaan", "Hari 1–T"], ["Mop-up hingga tuntas, dilaporkan harian", "Perusahaan", "T+4 hari"],
      ["Segel lahan terbakar, verifikasi sarana wajib", "Gakkum, Dinas Perkebunan", "≤ 7 hari"], ["Sanksi administratif dan gugatan ganti rugi (tanggung jawab mutlak, UU 32/2009 Ps. 88)", "KLH, Kemenhut, Kejaksaan", "≤ 30 hari"]]],
  ];
  function hPlaybook(T, s) {
    const n = {gambut_dalam: 0, gambut_dangkal: 0, mineral: 0, savana: 0, konservasi: 0, konsesi: 0};
    for (const c of D.kompleks) { if (c.jenis === "gambut") n[(c.dc ?? 400) >= 350 ? "gambut_dalam" : "gambut_dangkal"]++; else n[c.jenis]++; if (c.kaw !== "lain") n[c.kaw]++; }
    const nas = H.total(D.kompleks, T, s), ph = Object.values(D.prov).reduce((a, v) => a + (v.polhut?.butuh[s] || 0), 0);
    return `<section class="op-bag"><h3 class="op-h">Cara menyelesaikan: langkah per jenis situasi <small>jumlah kompleks aktif hari ini per jenis; kedalaman gambut tidak tersedia, kekeringan (DC) dipakai sebagai penanda bara dalam</small></h3>
      <div class="op-presiden card"><span class="lbl">Arahan Presiden ${tag("resmi")} → angka platform ${tag("model")}</span><ul>
        <li><b>Tambah pompa:</b> butuh ${fmt(nas.pompa)} pompa dan ${km(nas.selang)} selang untuk target ${T} hari.</li>
        <li><b>Tambah titik bor air:</b> butuh ${fmt(nas.bor)} titik bor untuk bara gambut yang sedang aktif (satu titik per ${fmt(H.k("ha_per_bor", s))} ha).</li>
        <li><b>Perkuat polisi hutan menuju 70.000:</b> patroli pencegahan di petak langganan terbakar butuh ± ${fmt(ph)} personel (lihat di bawah); sisanya untuk pengamanan kawasan hutan lain.</li>
        <li><b>Polisi hutan dibekali pompa dan bor air:</b> setara 1 pompa jinjing + 1 set bor dangkal per regu patroli 3 orang.</li></ul></div>
      <div class="op-play">${PLAY.map(([k, nm, w, L]) => `<article class="card op-pc" style="--w:${w}"><h4>${nm}<small>${fmt(n[k])} kompleks</small></h4>
        <ol>${L.map(([a, b, c]) => `<li><b>${a}</b><span>${b}</span><em>${c}</em></li>`).join("")}</ol></article>`).join("")}</div></section>`;
  }

  function hPolhut(s) {
    const L = Object.entries(D.prov).filter(([, v]) => v.polhut).sort((a, b) => b[1].polhut.rawan_ha - a[1].polhut.rawan_ha);
    const tot = L.reduce((a, [, v]) => a + v.polhut.butuh[s], 0), ha = L.reduce((a, [, v]) => a + v.polhut.rawan_ha, 0);
    const per = H.k("polhut_ha_hari", s) * H.k("polhut_siklus", s);
    return `<section class="card op-blok"><h3>Polisi hutan untuk patroli pencegahan ${tag("model")}</h3>
      <p>Rumus: luas petak langganan (petak 1 km yang terbakar ≥ 3 tahun berbeda, preventif.json) ÷ (${fmt(H.k("polhut_ha_hari", s))} ha/regu/hari × siklus ${H.k("polhut_siklus", s)} hari = ${fmt(per)} ha per regu) × ${H.k("polhut_regu", s)} orang × ${f1(H.k("polhut_kerja", s))} (hari libur bergantian).</p>
      <div class="tw"><table class="op-tb"><thead><tr><th>Provinsi</th><th class="n">Petak langganan</th><th class="n">Polisi hutan patroli</th><th class="n">Rentang</th></tr></thead><tbody>
        ${L.map(([k, v]) => `<tr><td>${esc(nP(k))}</td><td class="n">${fmt(v.polhut.rawan_ha)} ha</td><td class="n"><b>${fmt(v.polhut.butuh[s])}</b></td><td class="n">${fmt(v.polhut.butuh[0])}–${fmt(v.polhut.butuh[2])}</td></tr>`).join("")}
        <tr class="op-jml"><td>Jumlah</td><td class="n">${fmt(ha)} ha</td><td class="n">${fmt(tot)}</td><td></td></tr></tbody></table></div>
      <p class="op-cat">Pembanding ${tag("resmi")}: polisi hutan sekarang ± 4.500 orang (1 orang per ± 26.000 ha), target bertahap 70.000 (21.000 pada 2027) menurut Presiden 6 Oktober 2026. Patroli api di petak langganan hanya memakai ± ${fmt(Math.round(tot / 700))}% dari target itu; sisanya untuk pembalakan liar, perambahan, dan kawasan hutan ± 125 juta ha. Daftar petak hanya mencakup kecamatan langganan di sembilan provinsi prioritas, jadi angka ini batas bawah.</p></section>`;
  }

  function hKoef() {
    return `<details class="card op-blok op-koef"><summary><b>Koefisien, sumber, dan arti</b> (lo = skenario optimis, hi = pesimis)</summary>
      <div class="tw"><table class="op-tb"><thead><tr><th>Koefisien</th><th class="n">Optimis</th><th class="n">Tengah</th><th class="n">Pesimis</th><th>Satuan</th><th>Arti</th><th>Sumber</th></tr></thead><tbody>
      ${Object.entries(D.koef).map(([k, v]) => `<tr><td><code>${k}</code></td><td class="n">${fmt(v.lo)}</td><td class="n"><b>${fmt(v.mid)}</b></td><td class="n">${fmt(v.hi)}</td><td>${esc(v.satuan)}</td><td class="op-w">${esc(v.arti)}</td><td class="op-w">${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.sumber)}</a>` : esc(v.sumber)}</td></tr>`).join("")}
      </tbody></table></div><p class="op-cat">${esc(D.catatan)}</p></details>`;
  }

  /* ---------- dialog ---------- */
  function dlg(judul, sub, isi) { const d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${judul}</h3><p>${sub}</p></div><button aria-label="Tutup" data-tutup>×</button></div><div class="db op-db">${isi}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); };
    d.querySelectorAll("[data-opk]").forEach(b => b.onclick = () => dlgKompleks(b.dataset.opk));
    d.querySelectorAll("[data-kom]").forEach(b => b.onclick = () => { d.close(); bukaTab("peta"); Laci.buka(b.dataset.kom); });
    if (!d.open) d.showModal(); }

  function sumberTarik(k, b) {
    const s = st.s, surplus = Object.keys(D.prov).map(x => ({x, b: butuhProv(x)})).filter(o => o.x !== k && o.b.ada?.jenis === "resmi" && o.b.ada.personel > o.b.personel)
      .sort((a, c) => (c.b.ada.personel - c.b.personel) - (a.b.ada.personel - a.b.personel));
    const dp = D.prov[k]?.daops, ks = D.prov[k]?.konsesi, L = D.byP[k] || [];
    const reguKons = Math.ceil(L.filter(c => c.kaw === "konsesi").reduce((a, c) => a + H.kebutuhan(c, st.T, s).regu_kerja, 0) - 1e-9);
    const dari = {}; for (const c of L) if (c.jsum === "akses" && c.jam != null && c.jam <= 12) dari[c.dari] = (dari[c.dari] || 0) + 1;
    return `<ol class="op-sumber">
      ${surplus.length ? `<li><b>Provinsi dengan personel lebih</b> ${tag("resmi")}: ${surplus.slice(0, 3).map(o => `${esc(nP(o.x))} (lebih ${fmt(o.b.ada.personel - o.b.personel)})`).join(", ")}</li>` : ""}
      ${dp ? `<li><b>Manggala Agni</b>: ${fmt(dp.n)} Daops, ${fmt(dp.regu)} regu / ${fmt(dp.anggota)} orang (${esc(dp.nama.join(", "))})</li>` : ""}
      ${Object.keys(dari).length ? `<li><b>Posko/Daops terdekat dengan rute ≤ 12 jam</b>: ${Object.entries(dari).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([n, v]) => `${esc(n)} (${v} kompleks)`).join(", ")}</li>` : ""}
      <li><b>TNI/Polri (BKO)</b>: ${esc(KOREM[k] || "Korem setempat")} dan Polda ${esc(nP(k))}</li>
      <li><b>MPA</b>: desa di sekitar kompleks; honor dan pompa dari APBD/Dana Desa</li>
      ${ks ? `<li><b>Perusahaan pemegang konsesi</b> (wajib punya regu & sarana, Permentan 5/2018 dan P.32/2016): ${fmt(ks.kompleks)} kompleks di areal konsesi butuh ± ${fmt(reguKons)} regu bekerja; terbanyak ${ks.nama.slice(0, 4).map(([n, v]) => `${esc(n)} (${v})`).join(", ")}</li>` : ""}
    </ol>`;
  }

  function dlgProv(k) {
    const T = st.T, s = st.s, b = butuhProv(k), L = (D.byP[k] || []).slice().sort((a, c) => (c.wl[s] + c.wb[s]) - (a.wl[s] + a.wb[s]));
    const bi = biaya(k, b, T, s), om = omcHari(k);
    dlg(`${esc(nP(k))}: kebutuhan operasi ${T} hari`, `${fmt(b.kompleks)} kompleks aktif · skenario ${SKEN[s].toLowerCase()} · ${b.ada ? `terjun ${fmt(b.ada.personel)} (${esc(b.ada.sumber)})` : "personel terjun tidak dilaporkan"}`,
      `<div class="grid g4 op-kpi">${kpi("Personel", fmt(b.personel), `${fmt(b.regu)} regu`, W.ungu)}${kpi("Tambah", fmt(b.tambahPersonel), `${fmt(b.tambahRegu)} regu`, b.tambahPersonel ? W.merah : W.hijau)}
        ${kpi("Pompa · selang", fmt(b.pompa), km(b.selang), W.biru)}${kpi("Titik bor · heli", `${fmt(b.bor)} · ${fmt(b.heli)}`, `OMC layak ${om.length} hari`, W.teal)}</div>
      <p><b>${esc(kalimat(k, T))}</b>. Perkiraan biaya ${bi.hari} hari: ${rp(bi.total)}.</p>
      <h4>Rumus provinsi</h4><ol class="op-rumus">
        <li>Regu garis = Σ (front km × faktor ISI ÷ produksi garis) ÷ ${T} hari = <b>${fmt(b.regu_garis)}</b></li>
        <li>Regu bara = Σ (bara ha ÷ ${f1(H.k("bara_regu", s))} ha/regu/hari) ÷ ${T + H.k("hari_mopup", s)} hari = <b>${fmt(b.regu_bara)}</b></li>
        <li>Regu bekerja ${fmt(b.regu_kerja)} × rotasi ${f1(H.k("rotasi", s))} = <b>${fmt(b.regu)} regu</b> × 15 × ${f1(1 + H.k("dukungan", s))} = <b>${fmt(b.personel)} personel</b></li>
        <li>Pompa = (regu bara × 2 + regu garis gambut × 2 + regu garis lain × 1) × ${f1(H.k("cadangan_pompa", s))} = <b>${fmt(b.pompa)}</b>; selang ${fmt(H.k("selang_pompa", s))} m/pompa</li>
        <li>OMC: hari dengan peluang hujan ≥ 5 mm rata-rata provinsi 15–60% (ansambel ECMWF): ${om.length ? om.map(t => esc(t.slice(5))).join(", ") : "tidak ada"}</li></ol>
      <h4>Sumber tambahan, urut paling cepat</h4>${sumberTarik(k, b)}
      <h4>Kompleks terberat (klik untuk rumus langkah demi langkah)</h4>
      <div class="tw"><table class="op-tb"><thead><tr><th>Kompleks</th><th>Jenis</th><th class="n">Front km</th><th class="n">Bara ha</th><th class="n">Regu kerja</th><th class="n">Tiba</th><th></th></tr></thead><tbody>
      ${L.slice(0, 25).map(c => { const x = H.kebutuhan(c, T, s); return `<tr><td><b>${c.id}</b><small>${esc(c.kab || "")}${c.kec ? ", " + esc(c.kec) : ""}</small></td><td>${JENIS[c.jenis]}${c.kaw !== "lain" ? `<small>${c.kaw}</small>` : ""}</td>
        <td class="n">${f1(c.front[s])}</td><td class="n">${f1(c.bara[s])}</td><td class="n">${f1(x.regu_kerja)}</td><td class="n">${c.jam == null ? "tanpa rute" : f1(c.jam) + " jam"}${c.jsum === "perkiraan" ? "<small>perkiraan</small>" : ""}</td>
        <td><button class="btn sec" data-opk="${c.id}">Rumus</button></td></tr>`; }).join("")}</tbody></table></div>
      ${L.length > 25 ? `<p class="op-cat">${fmt(L.length - 25)} kompleks kecil lain ikut dijumlahkan; kompleks kecil berdekatan ditangani bergiliran oleh satu regu, jadi kebutuhannya boleh pecahan.</p>` : ""}`);
  }

  function dlgKompleks(id) {
    const c = D.kompleks.find(x => x.id === id); if (!c) return;
    const T = st.T, s = st.s, x = H.kebutuhan(c, T, s), k = n => H.k(n, s), pxKm = c.px * 0.140625, ling = 2 * Math.sqrt(Math.PI * pxKm);
    const g = c.kmrn ? Math.min(k("tumbuh_maks"), Math.max(1, (c.ini || 0) / c.kmrn)) : 1, fi = 1 + Math.max(0, (c.isi || 0) - k("isi_ambang")) / 8, r = k("garis_" + c.jenis);
    const tiba = c.jam == null ? "tidak ada rute jalan/sungai ≤ 18 jam" : `${f1(c.jam)} jam dari ${esc(c.dari)}${c.jsum === "perkiraan" ? " (perkiraan garis lurus × 1,3 ÷ 30 km/jam + 1 jam)" : " (graf jalan & sungai OSM)"}`;
    const heliOk = c.wh[s] > 0, siklus = 2 * k("jarak_air_heli") / 150 * 60 + 3, kmHeli = k("heli_jam_hari") * 60 / siklus * k("m_per_drop") / 1000;
    dlg(`${c.id}: rumus langkah demi langkah`, `${esc(c.kab || "")}${c.kec ? ", " + esc(c.kec) : ""} · ${esc(nP(c.prov))} · ${JENIS[c.jenis]} (gambut ${Math.round(c.ps * 100)}% titik) · ${esc(c.pj || "")} · target ${T} hari, skenario ${SKEN[s].toLowerCase()}`,
      `<ol class="op-rumus op-langkah">
        <li><b>Keliling kompleks</b> dari poligon ${tag("satelit")}: ${f1(c.kel)} km. Luas jejak 7 hari ${fmt(Math.round(c.luas))} ha.</li>
        <li><b>Front aktif</b>: ${fmt(c.px)} piksel VIIRS 24 jam × 14 ha = ${f1(pxKm)} km² → bila lingkaran, keliling 2√(π × ${f1(pxKm)}) = ${f1(ling)} km; diambil yang lebih kecil dari ini dan keliling kompleks = ${f1(Math.min(ling, c.kel))} km.
          Deteksi hari ini ${fmt(c.ini ?? 0)} vs kemarin ${fmt(c.kmrn ?? 0)} → faktor tumbuh ${f1(g)} (maks ${f1(k("tumbuh_maks"))}) → <b>front ${f1(c.front[s])} km</b>.</li>
        <li><b>Produksi garis</b> ${JENIS[c.jenis].toLowerCase()}: ${f1(r)} km/regu/hari; ISI ${f1(c.isi ?? 0)} vs ambang ${k("isi_ambang")} → dibagi ${f1(fi)} → <b>${f1(c.front[s] * fi / r)} regu-hari</b> garis.</li>
        <li><b>Regu garis</b> = ${f1(c.wl[s])} regu-hari ÷ ${T} hari = <b>${f1(x.regu_garis)} regu</b>.</li>
        <li><b>Bara gambut</b> = min(luas × porsi gambut ${fmt(Math.round(c.luas * c.ps))} ha, max(piksel, 1) × ${fmt(k("ha_bara_piksel"))} ha) = <b>${f1(c.bara[s])} ha</b>; mop-up ${f1(k("bara_regu"))} ha/regu/hari → ${f1(c.wb[s])} regu-hari ÷ ${T + k("hari_mopup")} hari = <b>${f1(x.regu_bara)} regu</b>.</li>
        <li><b>Regu bekerja</b> ${f1(x.regu_kerja)} × rotasi ${f1(k("rotasi"))} × 15 orang × ${f1(1 + k("dukungan"))} = <b>± ${fmt(Math.ceil(x.regu_kerja * k("rotasi") * 15 * (1 + k("dukungan"))))} personel</b> (dibulatkan di tingkat provinsi).</li>
        <li><b>Pompa</b> = (${f1(x.regu_bara)} × 2 + ${f1(x.regu_garis)} × ${c.ps >= .5 ? 2 : 1}) × ${f1(k("cadangan_pompa"))} = ${f1(x.pompa)}; selang ${fmt(k("selang_pompa"))} m/pompa ≈ ${km(Math.ceil(x.pompa) * k("selang_pompa"))}.</li>
        <li><b>Titik bor</b> = ${f1(c.bara[s])} ha ÷ ${fmt(k("ha_per_bor"))} ha${c.kanal != null && c.kanal <= k("kanal_dekat") ? ` × 0,5 (kanal ${f1(c.kanal)} km)` : c.kanal != null ? ` (kanal terdekat ${f1(c.kanal)} km)` : " (data kanal tidak ada)"} = <b>${fmt(c.bor[s])}</b>; air ± ${fmt(Math.round(c.bara[s] * k("air_bara") / 1000))} m³.</li>
        <li><b>Akses</b>: ${tiba}. ${heliOk ? `Lebih dari ${k("jam_tiba")} jam → water bombing menahan front: siklus ${f1(siklus)} menit, ${f1(kmHeli)} km garis basah/heli/hari → ${f1(c.wh[s])} heli-hari ÷ ${T} = <b>${f1(x.heli)} heli</b>. Water bombing tidak memadamkan bara gambut.` : "Regu darat dapat tiba; heli tidak dihitung (boleh untuk pendinginan titik)."}</li>
      </ol><p class="op-cat">Semua koefisien dan sumbernya ada di tabel koefisien tab Operasi dan OPERASI.md. Angka satelit adalah perkiraan; cek lapangan menentukan.</p>
      <button class="btn sec" data-kom="${c.id}">Buka kompleks ${c.id} di peta</button>`);
  }

  return {siap, render, butuhProv, kalimat, get T() { return st.T; }};
})();
if (Operasi) window.Operasi = Operasi;
