/* Tab Lapisan (PH-12, potensi-hidromet D14, ALGORITMA 10): tumpukan enam lapis yang digambar dari objek nyata.
   Klik lapis = daftar objeknya (dengan cari); klik objek = jejak di atas tabel dan lapis bawah tersaring.
   Publik hanya kelas bahaya dan status kab induk (Q9); tanpa paparan penduduk atau fasilitas per desa.
   Data: /api/dampak-peringatan/ringkas (peringatan), /status, /data/kelas_desa_bnpb.json, /data/kelas_desa/<pp>.json.
   Klik: tanda lapis di-set langsung, isi daftar ditunda lewat nanti(). ctx: lihat app.js. */
import { esc, angka, ikon, NAMA, PROV, BELUM, chip, pakaiGaya, bahan } from "/potensi/analisis.js";
import { nanti, ambil } from "/potensi/umum.js";

const LAP = [["peringatan", "Peringatan BMKG aktif"], ["bahaya", "Bahaya"], ["prov", "Provinsi"], ["kab", "Kab/kota"], ["kec", "Kecamatan"], ["desa", "Desa"]];
const URUT6 = ["BNJ", "BDG", "LSR", "GEL", "KHT", "KEK"];
const TAMPIL = 100;
const kecil = (s) => String(s ?? "").toLowerCase();

export function pasang(ctx) {
  pakaiGaya();
  const { panel } = ctx;
  let DP, B = null, kab = {}, P = [], sel = {}, aktif = "peringatan", cari = "";
  const filePv = new Map(); // prov -> berkas kelas desa (atau null bila gagal)
  const stackEl = () => panel.querySelector(".bc-tumpuk"), kananEl = () => panel.querySelector(".bc-isi");

  panel.innerHTML = '<h2 class="po-sek">Lapisan</h2><p class="bc-info" role="status">Memuat lapisan</p>';

  /* ---------- relasi ---------- */
  const nilaiKode = (k, kode) => { const e = DP.entriStatus(B.st, k, kode), s = DP.statusHari(e, "ringkas"); return s === 0 && e?.sebagian === true ? null : s; };
  const kodeBahaya = () => { const a = new Set(); for (const v of Object.values(B.st?.kab || {})) for (const c of Object.keys(v || {})) a.add(c); return [...a].sort((x, y) => Object.keys(NAMA).indexOf(x) - Object.keys(NAMA).indexOf(y)); };
  const statusKab = (k) => { const v = (sel.bahaya ? [sel.bahaya] : kodeBahaya()).map((c) => nilaiKode(k, c)).filter((x) => x != null); return v.length ? Math.max(...v) : null; };
  const bahayaPeringatan = (p) => new Set(Object.keys(NAMA).filter((c) => DP.peringatanUntuk([p], c.toLowerCase()).length));
  /** kab yang lolos filter lapis SEBELUM `sampai` (tidak termasuk) */
  function kabHingga(sampai) {
    let ks = Object.keys(kab);
    const i = LAP.findIndex((l) => l[0] === sampai);
    if (i > 0 && sel.peringatan) { const p = P.find((x) => x.id === sel.peringatan), s = new Set(p?.kab || []); ks = ks.filter((k) => s.has(k)); }
    if (i > 1 && sel.bahaya) ks = ks.filter((k) => nilaiKode(k, sel.bahaya) != null);
    if (i > 2 && sel.prov) ks = ks.filter((k) => k.startsWith(sel.prov));
    if (i > 3 && sel.kab) ks = ks.filter((k) => k === sel.kab);
    return ks;
  }
  async function desaTersaring() {
    const ks = kabHingga("desa"), pv = [...new Set(ks.map((k) => k.slice(0, 2)))];
    if (pv.length > 3) return { butuh: true };
    await Promise.all(pv.filter((p) => !filePv.has(p)).map(async (p) => filePv.set(p, await ambil(`/data/kelas_desa/${p}.json`))));
    const out = [];
    for (const k of ks) for (const d of filePv.get(k.slice(0, 2))?.kab?.[k] || []) out.push({ k, kode: d[0], nama: d[1], kec: d[2], b: String(d[3] || "") });
    return { out, gagal: pv.some((p) => !filePv.get(p)) };
  }

  /* ---------- bagian tampilan ---------- */
  const pil = (s) => `<span class="bc-st bc-st${s == null ? "n" : s}">${s == null ? BELUM : DP.TINGKAT[s]}</span>`;
  const ikonTinggi = (d) => URUT6.map((c, i) => (String(d)[i] === "3" ? `<span class="bc-ik" title="${esc(NAMA[c])}: kelas tinggi">${ikon(c, 15)}</span>` : "")).join("") || '<span class="bc-kosong">-</span>';
  const tabel = (kep, br) => `<div class="ex-tabel"><table><thead><tr>${kep.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${br.join("")}</tbody></table></div>`;
  const pilih = (lap, id, teks, on) => `<button type="button" class="bc-pilih" data-lap="${lap}" data-id="${esc(id)}" aria-pressed="${on}">${esc(teks)}</button>`;
  const cocok = (...t) => !cari || t.some((x) => kecil(x).includes(cari));
  /* saring dulu, potong, baru jadikan HTML: hanya TAMPIL baris yang dirender; total dari panjang hasil saringan */
  const potong = (it, f) => it.slice(0, TAMPIL).map(f).join("") + (it.length > TAMPIL ? `<tr><td colspan="9" class="bc-cat">Menampilkan ${TAMPIL} pertama dari ${angka(it.length)}. Ketik di kolom cari untuk menyempit.</td></tr>` : "");

  async function isiLapis() {
    const L = aktif, el = kananEl();
    let h;
    if (L === "peringatan") {
      if (B.rg?.belum_terukur || !B.rg) h = `<p class="bc-kosong">${BELUM}. Umpan peringatan BMKG belum masuk.</p>${chip("belum")}`;
      else {
        const br = P.filter((p) => cocok(DP.teksPeringatan(p), p.event, p.wilayah)).map((p) => `<tr${sel.peringatan === p.id ? ' class="bc-on"' : ""}><th scope="row">${pilih(L, p.id, DP.teksPeringatan(p), sel.peringatan === p.id)}</th><td>${pil(Number.isInteger(p.tingkat_bmkg) ? p.tingkat_bmkg : null)}</td><td class="bc-n">${angka((p.kab || []).length)}</td></tr>`);
        h = P.length ? tabel(["Peringatan", "Tingkat BMKG", "Kab/kota"], [br.join("") || '<tr><td colspan="3" class="bc-kosong">Tidak ada yang cocok.</td></tr>']) : '<p class="bc-kosong">Tidak ada peringatan BMKG yang aktif saat data ini dibangun.</p>';
      }
    } else if (L === "bahaya") {
      const ks = kabHingga("bahaya"), ada = sel.peringatan ? bahayaPeringatan(P.find((x) => x.id === sel.peringatan) || {}) : null;
      const br = kodeBahaya().filter((c) => (!ada || ada.has(c)) && cocok(NAMA[c], c)).map((c) => {
        const v = ks.map((k) => nilaiKode(k, c)).filter((x) => x != null);
        return `<tr${sel.bahaya === c ? ' class="bc-on"' : ""}><th scope="row">${ikon(c)} ${pilih(L, c, NAMA[c] || c, sel.bahaya === c)}</th><td class="bc-n">${v.length ? angka(v.length) : BELUM}</td><td class="bc-n">${v.length ? angka(v.filter((x) => x >= 2).length) : BELUM}</td></tr>`;
      });
      h = tabel(["Bahaya", "Kab/kota berstatus", "Siaga atau Awas"], [br.join("") || '<tr><td colspan="3" class="bc-kosong">Tidak ada yang cocok.</td></tr>']);
    } else if (L === "prov") {
      const ks = kabHingga("prov"), g = new Map();
      for (const k of ks) { const p = k.slice(0, 2), a = g.get(p) || [0, 0, 0], st = statusKab(k); a[0]++; if (st != null) a[2]++; if ((st ?? -1) >= 2) a[1]++; g.set(p, a); }
      const br = [...g].filter(([p]) => cocok(PROV[p])).sort((a, b) => (PROV[a[0]] || "").localeCompare(PROV[b[0]] || "", "id")).map(([p, [n, s, u]]) => `<tr${sel.prov === p ? ' class="bc-on"' : ""}><th scope="row">${pilih(L, p, PROV[p] || "Provinsi " + p, sel.prov === p)}</th><td class="bc-n">${angka(n)}</td><td class="bc-n">${u ? angka(s) : BELUM}</td></tr>`);
      h = tabel(["Provinsi", "Kab/kota", "Siaga atau Awas"], [br.join("") || '<tr><td colspan="3" class="bc-kosong">Tidak ada yang cocok.</td></tr>']);
    } else if (L === "kab") {
      const ks = kabHingga("kab").filter((k) => cocok(kab[k].nama, PROV[k.slice(0, 2)])), sk = new Map(ks.map((k) => [k, statusKab(k)])); // kunci urut dihitung sekali per kab
      ks.sort((a, b) => (sk.get(b) ?? -1) - (sk.get(a) ?? -1) || kab[a].nama.localeCompare(kab[b].nama, "id"));
      h = ks.length ? tabel(["Kab/kota", "Provinsi", "Status, ringkas 3 hari", "Kelas bahaya tinggi"], [potong(ks, (k) => `<tr${sel.kab === k ? ' class="bc-on"' : ""}><th scope="row">${pilih(L, k, kab[k].nama, sel.kab === k)}</th><td>${esc(PROV[k.slice(0, 2)] || "")}</td><td>${pil(sk.get(k))}</td><td>${URUT6.filter((c) => kab[k].K?.[c] === "tinggi").map((c) => `<span class="bc-ik" title="${esc(NAMA[c])}: kelas kab tinggi">${ikon(c, 15)}</span>`).join("") || '<span class="bc-kosong">-</span>'}</td></tr>`)]) : '<p class="bc-kosong">Tidak ada kab/kota yang cocok dengan pilihan di atas.</p>';
    } else {
      el.querySelector(".bc-daftar").innerHTML = '<p class="bc-info" role="status">Memuat daftar</p>';
      const r = await desaTersaring();
      if (aktif !== L) return;
      if (r.butuh) h = '<p class="bc-kosong">Pilih provinsi atau kab/kota dulu supaya daftar kecamatan dan desa tidak terlalu panjang.</p>';
      else if (r.gagal && !r.out.length) h = `<p class="bc-kosong">${BELUM}. Daftar desa belum bisa dimuat.</p>${chip("belum")}`;
      else if (L === "kec") {
        const g = new Map();
        for (const d of r.out) { const id = d.k + "|" + d.kec, a = g.get(id) || { k: d.k, kec: d.kec, n: 0, t: 0 }; a.n++; if (d.b.includes("3")) a.t++; g.set(id, a); }
        const ga = [...g].filter(([, a]) => cocok(a.kec, kab[a.k]?.nama)).sort((a, b) => a[1].kec.localeCompare(b[1].kec, "id"));
        h = ga.length ? tabel(["Kecamatan", "Kab/kota", "Desa", "Desa berkelas tinggi"], [potong(ga, ([id, a]) => `<tr${sel.kec === id ? ' class="bc-on"' : ""}><th scope="row">${pilih(L, id, a.kec, sel.kec === id)}</th><td>${esc(kab[a.k]?.nama || "")}</td><td class="bc-n">${angka(a.n)}</td><td class="bc-n">${angka(a.t)}</td></tr>`)]) : '<p class="bc-kosong">Tidak ada kecamatan yang cocok.</p>';
      } else {
        const dd = r.out.filter((d) => (!sel.kec || d.k + "|" + d.kec === sel.kec) && cocok(d.nama, d.kec));
        h = dd.length ? tabel(["Desa", "Kecamatan", "Bahaya kelas tinggi", "Status kab/kota induk"], [potong(dd, (d) => `<tr><th scope="row">${esc(d.nama)}</th><td>${esc(d.kec)}</td><td>${ikonTinggi(d.b)}</td><td>${pil(statusKab(d.k))}</td></tr>`)]) + '<p class="bc-cat">Hanya kelas bahaya dan status kab/kota induk. Keterpaparan penduduk per desa tidak dibuka untuk publik.</p>' : '<p class="bc-kosong">Tidak ada desa yang cocok.</p>';
      }
    }
    el.querySelector(".bc-daftar").innerHTML = h;
  }

  const teksSel = (l) => ({ peringatan: () => DP.teksPeringatan(P.find((x) => x.id === sel.peringatan) || {}), bahaya: () => NAMA[sel.bahaya], prov: () => PROV[sel.prov], kab: () => kab[sel.kab]?.nama, kec: () => (sel.kec || "").split("|")[1] })[l]?.();
  function hitungLapis(l) {
    if (l === "peringatan") return B.rg && !B.rg.belum_terukur ? `${angka(P.length)} aktif` : BELUM;
    if (l === "bahaya") return `${angka(kodeBahaya().length)} bahaya`;
    if (l === "prov") return `${angka(new Set(kabHingga("prov").map((k) => k.slice(0, 2))).size)} provinsi`;
    if (l === "kab") return `${angka(kabHingga("kab").length)} kab/kota`;
    return l === "kec" || l === "desa" ? (sel.kab || sel.prov ? "dimuat saat dibuka" : "pilih wilayah dulu") : "";
  }
  function gambarTumpuk() {
    stackEl().innerHTML = LAP.map(([l, n], i) => {
      const t = sel[l] && teksSel(l);
      return `${i ? `<li class="bc-sam${sel[LAP[i - 1][0]] ? " bc-on" : ""}" aria-hidden="true"></li>` : ""}<li><button type="button" class="bc-lap" data-lap="${l}" aria-pressed="${aktif === l}"><b>${esc(n)}</b><span>${esc(hitungLapis(l))}</span>${t ? `<em>${esc(t)}</em>` : ""}</button></li>`;
    }).join("");
    panel.querySelector(".bc-jejak").innerHTML = LAP.filter(([l]) => sel[l]).map(([l, n]) => `<button type="button" class="bc-jj" data-hapus="${l}" title="Lepas pilihan ${esc(n)}">${esc(n)}: ${esc(teksSel(l) || "")} <span aria-hidden="true">×</span></button>`).join("") || '<span class="bc-cat">Belum ada objek terpilih. Klik satu baris untuk mengikuti keterkaitannya ke lapis bawah.</span>';
    panel.querySelector(".bc-judul").textContent = LAP.find((x) => x[0] === aktif)[1];
  }
  const ubah = () => { gambarTumpuk(); nanti(isiLapis); };

  /* ---------- peristiwa ---------- */
  panel.addEventListener("click", (e) => {
    if (!B) return;
    const lap = e.target.closest("button.bc-lap"), pl = e.target.closest("button.bc-pilih"), hp = e.target.closest("button.bc-jj");
    if (lap) { aktif = lap.dataset.lap; cari = ""; panel.querySelector(".bc-cari").value = ""; ubah(); }
    else if (pl) {
      const l = pl.dataset.lap, id = pl.dataset.id, i = LAP.findIndex((x) => x[0] === l);
      sel[l] = sel[l] === id ? null : id;
      for (const [b] of LAP.slice(i + 1)) sel[b] = null; // yang di bawah dilepas; relasinya sudah berubah
      if (sel[l] && i < LAP.length - 1) { aktif = LAP[i + 1][0]; cari = ""; panel.querySelector(".bc-cari").value = ""; }
      ubah();
    } else if (hp) {
      const i = LAP.findIndex((x) => x[0] === hp.dataset.hapus);
      for (const [b] of LAP.slice(i)) sel[b] = null;
      ubah();
    }
  });
  let tunda = 0;
  panel.addEventListener("input", (e) => { if (!e.target.classList.contains("bc-cari")) return; const v = e.target.value; clearTimeout(tunda); tunda = setTimeout(() => { cari = kecil(v.trim()); nanti(isiLapis); }, 120); });

  bahan().then((b) => {
    B = b; DP = globalThis.DampakPeringatan;
    if (!DP || !B.kelas?.kab) { panel.innerHTML = `<h2 class="po-sek">Lapisan</h2><p class="bc-kosong" role="alert">${BELUM}. Data kab/kota belum bisa dibaca. Muat ulang halaman nanti.</p>`; return; }
    kab = B.kelas.kab; P = Array.isArray(B.rg?.peringatan) ? B.rg.peringatan : [];
    panel.innerHTML = `<h2 class="po-sek">Lapisan</h2><p class="bc-cat">Enam lapis dari yang paling luas ke yang paling kecil. Klik lapis untuk melihat objeknya, klik objek untuk mengikuti yang terkait. ${chip("sumber", "Peringatan BMKG, kelas bahaya BNPB")} ${chip("hipotesis", "Status prakiraan dari model Centurisk97 yang belum lolos uji balik")}</p>
<div class="bc-dua"><ol class="bc-tumpuk" aria-label="Lapis"></ol><div class="bc-isi"><nav class="bc-jejak" aria-label="Jejak pilihan"></nav><div class="bc-kep"><h3 class="bc-judul"></h3><input type="search" class="bc-cari" placeholder="Cari nama" aria-label="Cari objek di lapis ini" autocomplete="off"></div><div class="bc-daftar" role="region" aria-live="polite"></div></div></div>`;
    ubah();
  });
}
