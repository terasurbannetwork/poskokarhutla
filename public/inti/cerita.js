"use strict";
/* Kartu Cerita bersama (gempa, gunung api, banjir, kekeringan, cuaca, udara): satu bingkai, isi dipasok adaptor yang didaftarkan tiap bencana dari berkasnya sendiri.
   Adaptor mengembalikan {judul, baris: [[warna, label pil, kalimat]], sumber, ey?} atau {judul, grafik, sumber, leg?} (kartu bergrafik); null/"" = kartu dibuang.
   Hanya data bersumber yang sudah ada di berkas bencana itu. Butuh format.js dan kartu.js. Gaya baris di cerita.css (dimuat halaman).
   Pakai: Cerita.daftar("gempa", () => ({...})); sisip di render: Cerita.sisip(el, "gempa") (async, kartu ditambahkan di akhir); atau Cerita.kartu("gempa") untuk string/janji. */
const Cerita = {
  A: {},
  daftar(id, fn) { this.A[id] = fn; },
  bingkai(c, ey = "Cerita") {
    const isi = c.grafik || `<div class="cr">${c.baris.map(([w, t, x]) => `<div><span class="pl" style="--w:${w}">${esc(t)}</span><p>${x}</p></div>`).join("")}</div>`;
    return Kartu.kartu(c.ey || ey, c.judul, isi, c.sumber, "", c.leg || null); },
  /* episode terberat dari rekap tahunan BNPB/DIBI {tahun: {kejadian, terdampak, mengungsi, rumah_rusak}}: kunci = ukuran pemeringkat, kata = "banjir".
     Mengembalikan {judul, baris} (baris "Pernah terjadi" + "Terbaru"); null bila kurang dari 2 tahun. Adaptor menambah baris Status di depan. */
  /* jumlah dalam kata (bukan singkatan): kalimat dan judul memakai "7,4 juta", "812 ribu"; singkatan rb/jt hanya untuk label sempit */
  kata: v => rb(v).replace(" rb", " ribu").replace(" jt", " juta"),
  dibi(T, kunci, kata) {
    const th = Object.keys(T || {}).sort(); if (th.length < 2) return null;
    /* nilai 0 pada ukuran pemeringkat = tidak tercatat (BNPB), bukan nol: tidak ikut peringkat */
    const urut = th.filter(t => T[t][kunci] > 0).sort((a, b) => T[b][kunci] - T[a][kunci]), y = urut[0], o = T[y], z = th.at(-1), n = urut.indexOf(z) + 1;
    if (!y) return null;
    const U = {kejadian: [v => `${fmt(v)} kejadian`, "jumlah kejadian"], terdampak: [v => `${this.kata(v)} jiwa terdampak`, "jiwa terdampak"], rumah_rusak: [v => `${fmt(v)} rumah rusak`, "rumah rusak"]},
      bag = ["kejadian", "terdampak", "mengungsi", "rumah_rusak"].filter(k => o[k]).map(k => k === "mengungsi" ? `${this.kata(o[k])} mengungsi` : U[k][0](o[k])).join(", ");
    return {judul: `${Kartu.hl(U[kunci][0](o[kunci]))} pada ${y}, tahun ${kunci === "rumah_rusak" ? kata + " dengan rumah rusak terbanyak" : kata + " terberat"} dalam catatan BNPB ${th[0]} sampai ${z}`,
      baris: [["#b5651d", "Pernah terjadi", `Tahun ${y} tercatat ${bag} akibat ${kata}.`],
        ["#6b7fa3", "Terbaru", `Tahun ${z} tercatat ${fmt(T[z].kejadian)} kejadian ${kata}, ${n ? `peringkat ${fmt(n)} dari ${fmt(urut.length)} tahun menurut ${U[kunci][1]}` : `${U[kunci][1]} tidak tercatat`}.`]]}; },
  kartu(id) { const a = this.A[id]; if (!a) return "";
    const h = c => c && (c.grafik || c.baris?.length) ? this.bingkai(c) : "", c = a();
    return c?.then ? c.then(h).catch(e => { console.error(e); return ""; }) : h(c); },
  async sisip(el, id) {
    const h = await this.kartu(id); if (!h || !el.isConnected || el.querySelector(".ex-cerita")) return;
    const t = document.createElement("div"); t.className = "ex-cerita"; t.innerHTML = h; el.append(t); },
};
