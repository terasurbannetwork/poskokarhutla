"use strict";
/* Perkiraan kebutuhan musim (halaman publik). Data: /banjir/data/kebutuhan_musim.json (pipeline scripts/bnpb/kebutuhan.py).
   Layar hanya menampilkan angka pipeline; tidak menghitung ulang. Butuh /inti/format.js (fmt, esc) dan /inti/tabel.js (paginasi, pengurutKepala). */
(() => {
  const el = id => document.getElementById(id), PER = 12;
  const IKON = {
    heli: "M3 8h16M11 8V5M8 5h6M19 8v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8M9 15l-2 4M15 15l2 4M5 19h14",
    regu: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20v-1a5 5 0 0 1 10 0v1M16 11a2.5 2.5 0 1 0 0-5M21 20v-1a4 4 0 0 0-4-4",
    masker: "M4 9c4-2 12-2 16 0v4c0 3-4 5-8 5s-8-2-8-5zM8 12h8M8 15h8",
    rupiah: "M5 4v16M5 4h6a4 4 0 0 1 0 8H5M9 12l7 8M13 8h8M13 11h8",
    perkiraan: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
    asumsi: "M12 3l9 16H3zM12 10v4M12 17v.5",
    hari: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
  };
  const ikon = (k, c = "kb-ikon") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IKON[k]}"/></svg>`;
  const rp = v => v == null ? "–" : "Rp" + Math.round(v).toLocaleString("id-ID");
  /* ringkas: kartu = miliar/juta bulat; tabel = 1 desimal koma (miliar bila >= 1 miliar, selain itu juta) */
  const rpK = v => v == null ? "–" : v >= 1e9 ? "Rp" + fmt(Math.round(v / 1e9)) + " miliar" : "Rp" + fmt(Math.round(v / 1e6)) + " juta";
  const rpT = v => v == null ? "–" : v >= 1e9 ? "Rp" + fmt(Math.round(v / 1e8) / 10) + " miliar" : "Rp" + fmt(Math.round(v / 1e5) / 10) + " juta";
  /* rentang kartu: "Rp400–950 miliar" bila satuannya sama, selain itu dua nilai lengkap */
  const rpR = (a, b) => a == null || b == null ? "–" : a >= 1e9 && b >= 1e9 ? "Rp" + fmt(Math.round(a / 1e9)) + "–" + fmt(Math.round(b / 1e9)) + " miliar" : rpK(a) + " – " + rpK(b);
  const bulat = v => v == null ? "–" : fmt(Math.round(v));
  let D, IX, hor = 90, sk = "rata";
  const st = {urut: "rp_total", turun: true, hal: 0};
  const baris = () => D.data[`${sk}|${hor}`];
  const nas = () => D.nasional[`${sk}|${hor}`];
  const nilai = (r, k) => k === "prov" ? D.provinsi[r[0]] : r[IX[k]];

  function gambarKontrol() {
    el("fHorizon").innerHTML = D.horizon.map(h => `<button type="button" data-h="${h}" aria-pressed="${h === hor}">${ikon("hari")}${h} hari</button>`).join("");
    el("fSkenario").innerHTML = D.skenario.map(s => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === sk}">${esc(s.nama)}</button>`).join("");
    el("pilLabel").innerHTML = ikon("perkiraan") + esc(D.label.charAt(0).toUpperCase() + D.label.slice(1));
    const nn = D.tahun_dipakai[`analog|${D.horizon[0]}`] || [];
    el("pilAnalog").innerHTML = ikon("hari") + `Analog = ${fmt(nn.length)} tahun El Nino`; el("pilAnalog").title = nn.join(", ");
    el("pilAsumsi").innerHTML = ikon("asumsi") + "Asumsi tarif dan koefisien";
    if (D.dasar.analog_relevan) { el("pilNino").hidden = false; el("pilNino").innerHTML = ikon("perkiraan") + `RONI ${fmt(D.dasar.roni_sekarang)}, El Nino aktif`; }
    el("pilHari").textContent = "Mulai " + new Date(D.hari + "T00:00:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"});
  }

  function gambarKartu() {
    const n = nas(), k = (ik, judul, angka, label, warna) => `<section class="bn-kartu"><h2><span class="kb-ikon-kartu" data-w="${warna}">${ikon(ik)}</span>${esc(judul)}</h2><div class="bn-angka">${angka}</div><div class="bn-label">${label}</div></section>`;
    const tahun = D.tahun_dipakai[`${sk}|${hor}`];
    el("kartu").innerHTML = `<section class="bn-kartu kb-utama"><h2><span class="kb-ikon-kartu" data-w="c2">${ikon("rupiah")}</span>Total perkiraan ${hor} hari</h2>
        <div class="bn-angka">${rpR(n.rp_rendah, n.rp_tinggi)}</div><div class="bn-label">Titik tengah ${rpK(n.rp_total)}, rentang dari tahun paling sepi sampai paling ramai dan 1,5 sampai 6 jam heli per cluster</div>
        <div class="bn-label">${fmt(n.prov_berangka)} provinsi berangka, tahun ${esc(tahun.join(", "))}. Titik per cluster berasal dari kondisi cluster saat ini, bukan dari tahun-tahun itu.</div>
        <div class="bn-label">Sumber: ${esc(D.dasar.titik_panas)}; ${esc(D.dasar.operasi)}; ${esc(D.dasar.penduduk)}; tarif dan koefisien asumsi kerja tim Pantau Bencana.</div>
        <div class="kb-rincian"><span class="bn-pil" data-w="c3">${ikon("heli")}Heli ${rpK(n.rp_heli)}</span><span class="bn-pil" data-w="c4">${ikon("regu")}Regu ${rpK(n.rp_regu)}</span><span class="bn-pil" data-w="c1">${ikon("masker")}Masker ${rpK(n.rp_masker)}</span></div></section>`
      + k("heli", "Water bombing", fmt(n.jam_terbang) + " jam", `terbang, ${fmt(n.kompleks)} cluster`, "c3")
      + k("regu", "Regu darat", bulat(n.regu_rata) + " regu", `rata-rata siaga · ${fmt(n.regu_hari)} regu-hari`, "c4")
      + k("masker", "Masker N95", fmt(n.masker) + " masker", `untuk ${fmt(n.terdampak)} warga terdampak asap`, "c1")
      ;
    el("kartu").querySelectorAll("[data-w]").forEach(x => x.style.setProperty("--pil", `var(--${x.dataset.w})`));
  }

  function gambarTabel() {
    const k = st.urut, d = st.turun ? -1 : 1;
    const rs = baris().slice().sort((a, b) => {
      const x = nilai(a, k), y = nilai(b, k);
      if (x == null || y == null) return (x == null) - (y == null);   // null selalu di bawah
      return (x > y ? 1 : x < y ? -1 : 0) * d;
    });
    const hal = Math.min(st.hal, Math.max(0, Math.ceil(rs.length / PER) - 1)), potong = rs.slice(hal * PER, hal * PER + PER);
    el("isiTabel").innerHTML = potong.map(r => `<tr><td data-label="Provinsi">${esc(D.provinsi[r[0]])}</td>
      <td class="n" data-label="Titik panas">${fmt(r[IX.titik])}</td><td class="n" data-label="Cluster">${fmt(r[IX.kompleks])}</td>
      <td class="n" data-label="Jam terbang">${fmt(r[IX.jam_terbang])}</td><td class="n" data-label="Regu darat">${bulat(r[IX.regu_rata])}</td>
      <td class="n" data-label="Masker">${fmt(r[IX.masker])}</td><td class="n" data-label="Total rupiah">${rpT(r[IX.rp_total])}</td></tr>`).join("");
    el("pgn").innerHTML = paginasi(hal, rs.length, PER, "provinsi");
  }

  function gambarAsumsi() {
    el("judulAsumsi").innerHTML = ikon("asumsi") + "Asumsi tarif dan koefisien";
    const t = D.tarif, k = D.koefisien, uh = t.uang_harian;
    const baris = [
      ["Sewa helikopter", rp(t.heli_jam.nilai), t.heli_jam.satuan, t.heli_jam.sumber],
      ["Uang harian (bawaan)", rp(uh.bawaan), uh.satuan, uh.sumber],
      ["Porsi uang harian penuh", fmt(t.porsi_bko.nilai), t.porsi_bko.satuan, t.porsi_bko.sumber],
      ["Porsi MPA dan honornya", `${fmt(t.porsi_mpa.nilai)} · ${rp(t.honor_mpa.nilai)}`, t.honor_mpa.satuan, t.honor_mpa.sumber],
      ["Konsumsi", rp(t.konsumsi.nilai), t.konsumsi.satuan, t.konsumsi.sumber],
      ["Harga masker N95", rp(t.harga_masker.nilai), t.harga_masker.satuan, t.harga_masker.sumber],
      ...Object.entries(k).map(([id, v]) => [{orang_per_regu: "Orang per regu", jam_heli_per_api: "Jam heli per cluster prioritas", rotasi: "Rotasi regu", masker_per_orang: "Masker per warga terdampak"}[id] || id, fmt(v.nilai), v.satuan, v.sumber]),
    ];
    el("isiAsumsi").innerHTML = baris.map(r => `<tr><td data-label="Komponen">${esc(r[0])}</td><td class="n" data-label="Nilai">${esc(r[1])}</td><td data-label="Satuan">${esc(r[2])}</td><td data-label="Sumber">${esc(r[3])}</td></tr>`).join("");
    const nama = {titik: "Titik panas", kompleks: "Cluster", jam_terbang: "Jam terbang", regu_hari: "Regu-hari", regu_rata: "Regu darat", terdampak: "Warga terdampak", masker: "Masker", rp_heli: "Rupiah heli", rp_regu: "Rupiah regu", rp_masker: "Rupiah masker", rp_total: "Total rupiah"};
    el("rumus").innerHTML = Object.entries(D.rumus).map(([c, v]) => `<li><b>${esc(nama[c] || c)}</b>: ${esc(v)}</li>`).join("")
      + D.batas.map(b => `<li>${esc(b)}</li>`).join("")
      + `<li>Dasar data: ${esc(Object.values(D.dasar).filter(v => typeof v === "string").join("; "))}.</li>`;
  }

  const segar = () => nanti(() => { st.hal = 0; gambarKartu(); gambarTabel(); });   // pil yang baru ditekan tampil dulu (/inti/nanti.js)
  function pasang() {
    el("fHorizon").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; hor = +b.dataset.h;
      el("fHorizon").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); segar(); });
    el("fSkenario").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sk = b.dataset.s;
      el("fSkenario").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); segar(); });
    el("pgn").addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (!b || b.disabled) return; st.hal = +b.dataset.h; gambarTabel(); });
    pengurutKepala(st, el("kepalaTabel"), gambarTabel);
  }

  async function mulai() {
    try {
      const r = await fetch("/banjir/data/kebutuhan_musim.json"); if (!r.ok) throw new Error(r.status);
      D = await r.json();
    } catch (e) { el("pesan").textContent = "Perkiraan kebutuhan belum bisa kamu buka. Coba muat ulang sebentar lagi."; el("pesan").className = "bn-pesan galat"; return; }
    IX = Object.fromEntries(D.kolom.map((k, i) => [k, i]));
    if (D.dasar.analog_relevan) sk = "analog";
    gambarKontrol(); gambarAsumsi(); pasang(); gambarKartu(); gambarTabel();
    el("isi").hidden = false; el("pesan").textContent = ""; el("pesan").className = "bn-pesan";
  }
  mulai();
})();
