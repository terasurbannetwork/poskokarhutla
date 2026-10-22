"use strict";
/* Risiko kebakaran permukiman per kelurahan (halaman publik). Data: /bnpb/data/kebakaran_31.json dan kebakaran_geo_31.json
   (pipeline scripts/bnpb/kebakaran.py). Peta SVG digambar sekali; klik hanya mengganti kelas path. Angka tidak dihitung ulang di sini.
   Butuh /inti/format.js (fmt, esc) dan /inti/tabel.js (pengurutKepala, paginasi). */
(() => {
  const el = id => document.getElementById(id);
  const PER = 20;
  let D, IX, GEO, elPath = new Map(), terpilih = -1, kota = "";
  const st = {urut: "skor", turun: true, hal: 0};
  const v = (r, k) => r[IX[k]];
  const bil = x => x == null ? "–" : fmt(Math.round(x));
  const kap = s => String(s || "").replace(/^./, c => c.toUpperCase());
  const KLS = r => v(r, "kelas") == null ? "kn" : "k" + v(r, "kelas");
  const namaKelas = r => v(r, "kelas") == null ? "Tanpa data" : (D.kelas.find(k => k[0] === v(r, "kelas")) || [0, "Kelas " + v(r, "kelas")])[1];
  const pilKelas = r => `<span class="kb-kls ${KLS(r)}">${esc(namaKelas(r))}</span>`;   // skor = peringkat relatif dalam kota: hanya di pop-up, berlabel
  const median = a => { a = a.filter(x => x != null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

  /* ---------- kepala dan ringkasan */
  function gambarKepala() {
    const lb = el("pilLabel"); lb.textContent = kap(D.label); lb.hidden = false;
    const k = el("pilKota"); k.textContent = D.kota; k.hidden = false;
    const t = new Date(D.dibuat), h = el("pilHari");
    if (!isNaN(t)) { h.textContent = "Diolah " + t.toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}); h.hidden = false; }
    const B = D.baris, sangat = B.filter(r => v(r, "kelas") === 3).length, kb = B.reduce((n, r) => n + (v(r, "kejadian_b") || 0), 0);
    const pil = (n, l) => `<span class="bn-pil"><b>${typeof n === "number" ? fmt(n) : n}</b>${esc(l)}</span>`;
    el("ringkas").innerHTML = pil(sangat, " kelurahan sangat tinggi") + pil(D.ringkasan.pos_damkar, " pos Damkar") +
      pil(bil(median(B.map(r => v(r, "menit_damkar")))), " menit median tempuh Damkar") + pil(kb, " kebakaran semua jenis " + D.ujibalik.periode.B.keterangan);
    el("legenda").innerHTML = D.kelas.map(([i, n]) => `<span><i class="k${i}"></i>${esc(n)}</span>`).join("") + `<span><i class="kn"></i>Tanpa data</span>`;
  }

  /* ---------- peta */
  function gambarPeta() {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const rs of Object.values(GEO)) for (const r of rs) for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const k = Math.cos((y0 + y1) / 2 * Math.PI / 180), W = (x1 - x0) * k, H = y1 - y0, s = 1000 / Math.max(W, H), ox = x0 - 8 / s / k, oy = y1 + 8 / s;
    const X = lon => ((lon - ox) * k * s).toFixed(1), Y = lat => ((oy - lat) * s).toFixed(1);
    const svg = el("peta"); svg.setAttribute("viewBox", `0 0 ${(W * s + 16).toFixed(0)} ${(H * s + 16).toFixed(0)}`);
    let h = "";
    D.baris.forEach((r, i) => { const rs = GEO[v(r, "kode")]; if (!rs) return;
      h += `<path data-i="${i}" class="${KLS(r)}" d="${rs.map(c => "M" + c.map(p => X(p[0]) + " " + Y(p[1])).join("L") + "Z").join("")}"/>`; });
    h += D.pos.map(p => `<circle cx="${X(p[1])}" cy="${Y(p[0])}" r="2.6"><title>${esc(p[2])}</title></circle>`).join("");
    svg.innerHTML = h;
    svg.querySelectorAll("path").forEach(x => elPath.set(+x.dataset.i, x));
  }
  function tandai(i) {   // hanya mengganti kelas path yang terpilih
    if (terpilih >= 0 && elPath.get(terpilih)) elPath.get(terpilih).classList.remove("pilih");
    terpilih = i;
    if (i >= 0 && elPath.get(i)) elPath.get(i).classList.add("pilih");
  }

  /* ---------- tabel */
  const KUNCI = {nama: r => v(r, "nama"), kec: r => v(r, "kec"), kab: r => v(r, "kab"), skor: r => v(r, "skor") ?? -1,
    menit: r => v(r, "menit_damkar") ?? -1, gang: r => v(r, "gang_pct") ?? -1, kb: r => v(r, "kejadian_b") ?? -1};
  function gambarTabel() {
    const kk = KUNCI[st.urut], d = st.turun ? -1 : 1;
    const bs = D.baris.map((r, i) => ({r, i})).filter(x => !kota || v(x.r, "kab") === kota)
      .sort((a, b) => (kk(a.r) > kk(b.r) ? 1 : kk(a.r) < kk(b.r) ? -1 : 0) * d);
    const a = Math.min(st.hal, Math.max(0, Math.ceil(bs.length / PER) - 1));
    el("isiTabel").innerHTML = bs.length ? bs.slice(a * PER, (a + 1) * PER).map(({r, i}) => `<tr data-i="${i}" tabindex="0">
      <td data-label="Kelurahan">${esc(v(r, "nama"))}</td><td data-label="Kecamatan">${esc(v(r, "kec"))}</td><td data-label="Kota">${esc(v(r, "kab"))}</td>
      <td class="n" data-label="Risiko">${pilKelas(r)}</td><td class="n" data-label="Damkar (menit)">${bil(v(r, "menit_damkar"))}</td>
      <td class="n" data-label="Gang (%)">${bil(v(r, "gang_pct"))}</td><td class="n" data-label="Kebakaran ${esc(D.ujibalik.periode.B.keterangan)}">${fmt(v(r, "kejadian_b"))}</td></tr>`).join("")
      : `<tr><td colspan="7" class="ad-kosong">Belum ada kelurahan.</td></tr>`;
    el("halTabel").innerHTML = paginasi(a, bs.length, PER, "kelurahan");
  }

  /* ---------- pop-up rincian */
  function buka(i) {
    const r = D.baris[i], P = D.ujibalik.periode;
    tandai(i);
    const kv = (a, b, cat) => `<dt>${a}${cat ? `<small>${esc(cat)}</small>` : ""}</dt><dd>${b}</dd>`;
    const n = (k, sat) => v(r, k) == null ? "–" : bil(v(r, k)) + (sat || "");
    el("dlgIsi").innerHTML = `<div class="kb-dlg-kepala"><div><h2 id="dlgJudul">${esc(v(r, "nama"))}</h2><p>Kecamatan ${esc(v(r, "kec"))}, ${esc(v(r, "kab"))}</p></div>
        <button type="button" class="kb-tutup" id="dlgTutup" aria-label="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="kb-skor">${pilKelas(r)}${v(r, "skor") == null ? "" : `<span class="bn-pil">peringkat ${bil(v(r, "skor"))} dari 100 di ${esc(D.kota)}</span>`}</div>
      <div class="kb-blok"><dl class="kb-kv">
        ${kv("Tutupan bangunan", n("tutupan_pct", "%"))}${kv("Kepadatan", n("bangunan_per_ha", " bangunan/ha"))}
        ${kv("Waktu tempuh Damkar", n("menit_damkar", " menit"), "Tanpa macet, kecepatan jalan diandaikan.")}${kv("Porsi jalan gang", n("gang_pct", "%"))}
        ${kv("Bangunan lebih dari 100 m dari jalan mobil", n("jauh_jalan_pct", "%"))}
        ${kv("Hidran di OSM", n("hidran_osm", " buah"), "Pemetaan hidran OSM tidak lengkap, tidak masuk skor.")}
        ${kv("Kebakaran " + esc(P.A.keterangan), fmt(v(r, "kejadian_a")), "Semua jenis, Dinas Gulkarmat DKI.")}${kv("Kebakaran " + esc(P.B.keterangan), fmt(v(r, "kejadian_b")))}
      </dl></div>`;
    const d = el("dlg"); d.showModal(); el("dlgTutup").onclick = () => d.close();
  }

  /* ---------- uji balik */
  function gambarUji() {
    const U = D.ujibalik, pv = el("pilVonis"); pv.textContent = U.lulus ? "Lulus" : "Belum lulus"; pv.classList.toggle("kb-peringatan", !U.lulus);
    const B = U.periode.B, persen = x => bil(x * 100) + "%";
    el("aturan").textContent = kap(U.aturan) + "." + (U.lulus ? "" : ` Kelas tinggi belum terbukti lebih sering terbakar: 20% kelurahan teratas menurut indeks menampung ${persen(B.tangkapan.indeks)} kebakaran ${B.keterangan}, tebakan acak sekitar 20%, jumlah bangunan ${persen(B.tangkapan.jumlah_bangunan)}.`);
    const BARIS = [["indeks", "Indeks"], ["jumlah_bangunan", "Jumlah bangunan"], ["kepadatan_saja", "Kepadatan saja"], ["riwayat_A", "Riwayat " + U.periode.A.keterangan]];
    const pct = x => bil(x * 100), dua = x => (Math.round(x * 100) / 100).toLocaleString("id-ID");
    el("uji").innerHTML = ["A", "B"].map(p => { const P = U.periode[p];
      const rs = BARIS.filter(([k]) => P.tangkapan[k] != null).map(([k, l]) => { const b = P.banding[k];
        return `<tr><td data-label="Pembanding">${esc(l)}</td><td class="n" data-label="Tangkapan 20% teratas (%)">${pct(P.tangkapan[k])}</td><td class="n" data-label="Spearman">${dua(P.spearman[k])}</td>
          <td class="n" data-label="Indeks dikurangi pembanding (poin)">${b ? bil(b.selisih * 100) + `<span class="kb-selang">selang 90% ${bil(b.selang90[0] * 100)} sampai ${bil(b.selang90[1] * 100)}</span>` : "–"}</td></tr>`; }).join("");
      return `<div class="kb-uji"><h3>${esc(P.keterangan)}, ${fmt(P.kejadian)} kebakaran semua jenis</h3><div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>
        <th>Pembanding</th><th>Tangkapan 20% teratas (%)</th><th>Spearman</th><th>Indeks dikurangi pembanding (poin)</th></tr></thead><tbody>${rs}</tbody></table></div></div>`; }).join("");
    el("sumber").textContent = D.sumber.join(", ");
  }

  /* ---------- gerak */
  function pasang() {
    const peta = el("peta");
    let sorotan = null;
    peta.addEventListener("pointerover", e => { const p = e.target.closest("path"); if (p && p !== sorotan) { sorotan = p; const r = D.baris[+p.dataset.i]; el("sorot").textContent = `${v(r, "nama")}, ${v(r, "kec")}: ${namaKelas(r)}${v(r, "skor") == null ? "" : " " + bil(v(r, "skor"))}`; } });
    peta.addEventListener("click", e => { const p = e.target.closest("path"); if (p) buka(+p.dataset.i); });
    const tb = el("isiTabel"), pilih = t => { if (t) buka(+t.dataset.i); };
    tb.addEventListener("click", e => pilih(e.target.closest("tr[data-i]")));
    tb.addEventListener("keydown", e => { const t = e.target.closest("tr[data-i]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pilih(t); } });
    el("halTabel").addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (b && !b.disabled) { st.hal = +b.dataset.h; gambarTabel(); } });
    el("fKota").addEventListener("change", e => { kota = e.target.value; st.hal = 0; gambarTabel(); });
    el("dlg").addEventListener("close", () => tandai(-1));
    pengurutKepala(st, el("kepalaTabel"), gambarTabel);
  }

  async function mulai() {
    const ambil = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
    try { [D, GEO] = await Promise.all([ambil("/bnpb/data/kebakaran_31.json"), ambil("/bnpb/data/kebakaran_geo_31.json")]); GEO = GEO.kel; }
    catch (e) { el("pesan").textContent = "Data kebakaran belum bisa kamu buka. Coba muat ulang sebentar lagi."; el("pesan").className = "bn-pesan galat"; return; }
    IX = Object.fromEntries(D.kolom.map((k, i) => [k, i]));
    el("fKota").innerHTML = `<option value="">Semua</option>` + [...new Set(D.baris.map(r => v(r, "kab")))].sort().map(k => `<option>${esc(k)}</option>`).join("");
    el("kepalaTabel").querySelector("[data-k=kb]").firstChild.textContent = "Kebakaran " + D.ujibalik.periode.B.keterangan;
    gambarKepala(); gambarPeta(); gambarTabel(); gambarUji(); pasang();
    el("isi").hidden = false; el("pesan").textContent = ""; el("pesan").className = "bn-pesan";
  }
  mulai();
})();
