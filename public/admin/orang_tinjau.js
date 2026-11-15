/* Kartu "Pasangan akun" di /admin/akun (Keterpaduan KP-23). Data: GET /api/orang/tinjau (bernomor sudah disamarkan di Worker); keputusan: POST /api/orang/tinjau.
   INP: baris ditutup seketika, permintaan jalan di latar; gagal = baris kembali dengan pesan. Tanpa skrip/gaya inline, teks lewat textContent. */
(() => {
  const app = document.getElementById("app"); if (!app) return;
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const ikon = (d) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "ot-ik");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.append(p); return s; };
  const IK_TAUT = "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1", IK_OK = "M5 12l5 5L20 7", IK_X = "M6 6l12 12M18 6L6 18";
  const TABEL = {staf: "Staf BNPB", instansi_akun: "Akun instansi", pdt_akun: "Pendataan", km_akun: "Kemitraan kampus"}, ALASAN = {bentrok: "NIP dan WA menunjuk orang berbeda", nip_tidak_baku: "NIP tidak 18 digit"};
  const tombol = (teks, ik, att) => h("button", {type: "button", class: "ot-btn", ...att}, ik ? ikon(ik) : null, teks);
  const kartu = h("section", {class: "ex ex-std ot-kartu", id: "otKartu", hidden: true, "aria-label": "Pasangan akun"});
  const badan = h("div", {class: "ex-bd"}), judul = h("h3", null, ikon(IK_TAUT), "Pasangan akun"), hitung = h("span", {class: "ot-hitung"});
  kartu.append(h("header", {class: "ex-hd"}, h("div", {class: "ex-jd"}, judul, hitung)), badan);
  app.after(kartu);
  let D = null;

  const orangSel = (o, r) => h("li", {class: "ot-orang"}, h("span", {class: "ot-ket"}, `${o.unit || "unit kosong"}, ${o.jabatan || "jabatan kosong"}`, h("small", {teks: `${o.jenis}, NIP ${o.nip || "-"}, WA ${o.wa || "-"}`})),
    tombol("Pasang", IK_OK, {"data-pasang": r.id, "data-orang": o.id, "aria-label": "Pasang ke orang ini"}));
  const baris = r => h("tr", {"data-baris": r.id},
    h("td", null, TABEL[r.akun_tabel] || r.akun_tabel, h("small", {teks: r.akun_id})),
    h("td", null, r.akun ? `NIP ${r.akun.nip || "-"}` : "akun tidak ditemukan", h("small", {teks: `WA ${r.akun?.wa || "-"}${r.akun?.unit ? `, ${r.akun.unit}` : ""}`})),
    h("td", {teks: ALASAN[r.alasan] || r.alasan}),
    h("td", null, r.kandidat.length ? h("ul", {class: "ot-daftar"}, r.kandidat.map(o => orangSel(o, r))) : h("span", {class: "ot-redup", teks: "tidak ada kandidat"})),
    h("td", null, tombol("Tolak", IK_X, {"data-tolak": r.id, "aria-label": "Tolak, jangan pasangkan"})));
  function gambar() {
    hitung.textContent = D.total ? `${D.total} menunggu` : "";
    badan.replaceChildren(D.tinjau.length ? h("div", {class: "ot-wadah"}, h("table", {class: "ex-tabel ot-tabel"},
      h("thead", null, h("tr", null, ...["Akun", "NIP dan WA akun", "Alasan", "Kandidat orang", "Aksi"].map(t => h("th", {scope: "col", teks: t})))),
      h("tbody", null, D.tinjau.map(baris))), D.berikut != null ? h("div", {class: "ot-lebih"}, tombol("Berikutnya", null, {"data-dari": D.berikut})) : null)
      : h("p", {class: "ot-redup", teks: "Tidak ada akun yang menunggu ditinjau."}));
  }
  const pesan = t => { let p = badan.querySelector(".ot-pesan"); if (!p) { p = h("p", {class: "ot-pesan", role: "alert"}); badan.prepend(p); } p.textContent = t; };
  async function muat(dari = 0) {
    const r = await fetch("/api/orang/tinjau?dari=" + dari, {headers: {"x-pb": "1"}}).catch(() => null);
    if (!r || !r.ok) return;   // 403 (bukan admin) atau 503 (migrasi belum): kartu tetap tersembunyi
    D = await r.json(); kartu.hidden = false; gambar();
  }
  badan.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dari) { muat(Number(b.dataset.dari)); return; }
    const id = b.dataset.pasang || b.dataset.tolak; if (!id) return;
    const tr = badan.querySelector(`tr[data-baris="${id}"]`), ada = D.tinjau.findIndex(r => r.id === id), lama = D.tinjau[ada];
    const kirim = b.dataset.pasang ? {id, keputusan: "pasang", orang_id: b.dataset.orang} : {id, keputusan: "tolak"};
    tr.remove(); D.tinjau.splice(ada, 1); D.total -= 1; hitung.textContent = D.total ? `${D.total} menunggu` : "";   // seketika; permintaan di latar
    Admin.kirim("/api/orang/tinjau", kirim).catch(() => ({ok: false, j: {galat: "jaringan putus"}})).then(x => {
      if (x.ok || x.status === 409) { if (!D.tinjau.length) gambar(); return; }
      D.tinjau.splice(ada, 0, lama); D.total += 1; gambar(); pesan(`Keputusan tidak tersimpan: ${x.j?.galat || "coba lagi"}`);
    });
  });
  muat();
})();
