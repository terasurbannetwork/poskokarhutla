"use strict";
/* Tab Tangga (Tangga Peringatan): per kab/kota, pernyataan resmi BMKG dan prediksi kita dari musim sampai jam, dua ancaman berdampingan.
   Dimuat sesudah prediksi.js (PR, ambil, esc, fmt dari sana) dan tangga_inti.js (Tangga). Data tangga.json dimuat sekali.
   Layar baca saja: tidak menulis tabel apa pun, jadi tanpa tombol data dummy (KEPUTUSAN-TANGGA D7).
   Kontrol (pilihan, segmen) berubah dulu di layar; isi digambar sesudah satu frame tercat lewat nanti() (INP.md). */
const TG = {t: null, prov: "", kab: "", a: "semua", n: 60, antri: false, provOpsi: null, r: []};
const kartuTg = (ey, judul, isi, kls = "") => `<article class="ex ex-std ${kls}"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></article>`;
const hlTg = v => `<span class="hl">${fmt(v)}</span>`;
const kelasTk = (e, a) => { const v = Tangga.tkItem(e, a); return v == null ? "abu" : "tk" + v; };
const ketTk = (t, e, sk) => {
  const s = t.sumber[e.s] || {};
  return `<b>${esc(sk.nama)}</b><br>Label resmi: ${esc(e.t)}<br>Lembaga: ${esc(s.lembaga)}<br>Cakupan: ${esc(s.cakupan)}`;
};

function pilSinyal(t, sg, a) {
  const ket = Tangga.ketSinyal(t, sg).join("<br>");
  const tip = esc(`<b>Sinyal ${Tangga.ANCAMAN[a].toLowerCase()}</b><br>${esc(ket).replace(/&lt;br&gt;/g, "<br>")}`);
  const p = [];
  if (sg.m) p.push(`<span class="pr-pil ok" data-tip="${tip}">menguat</span>`);
  if (sg.d) p.push(`<span class="pr-pil abu" data-tip="${tip}">searah</span>`);
  if (sg.s) p.push(`<span class="pr-pil buruk" data-tip="${tip}">belum selaras</span>`);
  if (!p.length) p.push(`<span class="pr-pil abu" data-tip="${tip}">tanpa sinyal</span>`);
  p.push('<span class="pr-pil abu" data-tip="Sinyal ini belum diuji balik terhadap kejadian (RENCANA-UJI); jangan dibaca sebagai ketepatan. Beda dari pil vonis rapor pada prediksi kita.">sinyal belum diuji balik</span>');
  return p.join(" ");
}

/* deret peringkat per skala: batang 0..3, tooltip per batang; tanpa tingkat = batang putus-putus */
function deretTg(t, sg) {
  return `<div class="tg-bars" role="img" aria-label="Peringkat per skala">${t.skala.map((s, i) => {
    const v = sg.r[i];
    const tip = esc(`<b>${esc(s.nama)}</b><br>Peringkat: ${v == null ? "tanpa tingkat" : v}`);
    return `<span class="tg-bar${v == null ? " tg-nol" : ""}" data-tip="${tip}" style="height:${v == null ? 6 : 8 + v * 10}px"></span>`;
  }).join("")}</div>`;
}

function itemTg(t, e, sk, a) {
  const cak = Tangga.cakupanTeks(e.c), s = t.sumber[e.s] || {};
  const jenis = s.jenis === "kita" ? '<span class="pr-pil abu" data-tip="Prediksi model Centurisk97, terpisah dari BMKG">kita</span>'
    : s.jenis === "analisis" ? '<span class="pr-pil abu" data-tip="Analisis atau pengamatan, bukan peringatan resmi">analisis</span>' : "";
  const uji = e.u ? `<span class="pr-pil abu" data-tip="Rapor prediksi ini di tab Rapor">${esc(e.u)}</span>` : "";
  return `<div class="tg-it"><div class="tg-pil"><span class="pr-pil ${kelasTk(e, a)}" data-tip="${esc(ketTk(t, e, sk))}">${esc(e.t)}</span>${cak ? `<span class="pr-pil abu">${esc(cak)}</span>` : ""}${jenis}${uji}</div>
    <p>${esc(e.x)}</p><small class="pr-kecil">${esc(Tangga.jejak(t, e))}${e.p ? `, periode ${esc(e.p)}` : ""}</small></div>`;
}

function barisTg(t, k, sk) {
  const sel = a => {
    const ps = Tangga.pernyataan(t, k.id, k.prov, sk.id, a);
    return `<div class="tg-sel" data-a="${a}">${ps.length ? ps.map(e => itemTg(t, e, sk, a)).join("") : `<p class="tg-kosong">${esc(Tangga.kosongTeks(sk, a))}</p>`}</div>`;
  };
  return `<div class="tg-baris"><div class="tg-skala"><b>${esc(sk.nama)}</b><small>${esc(Tangga.KETERANGAN[sk.id] || "")}</small></div>${TG.a !== "b" ? sel("k") : ""}${TG.a !== "k" ? sel("b") : ""}</div>`;
}

function tanggaTg(k) {
  const t = TG.t, e = t.kab[k.id];
  if (!e) return kartuTg("Tangga", `Tangga ${esc(k.nama)} belum tersedia`, '<p class="kosong">Kabupaten/kota ini tidak ada di tangga.json.</p>');
  const cols = a => `<div class="tg-kepala"><b>${Tangga.ANCAMAN[a]}</b> ${pilSinyal(t, e.sg[a], a)}${deretTg(t, e.sg[a])}</div>`;
  const terisi = t.skala.filter(s => ["k", "b"].some(a => Tangga.pernyataan(t, k.id, k.prov, s.id, a).length)).length;
  const kini = e.kita ? ["k", "b"].map(a => `${Tangga.ANCAMAN[a].toLowerCase()} ${e.kita[a] == null ? "tanpa tingkat" : "peringkat " + e.kita[a]}`).join(", ") : "";
  const gagal = t.gagal?.length ? `<details class="pr-kecil"><summary>Sumber yang dilewati (${fmt(t.gagal.length)})</summary><ul>${t.gagal.map(g => `<li>${esc(g)}</li>`).join("")}</ul></details>` : "";
  const isi = `<div class="tg-kepala-baris"><div></div>${TG.a !== "b" ? cols("k") : ""}${TG.a !== "k" ? cols("b") : ""}</div>${t.skala.map(s => barisTg(t, k, s)).join("")}
    <details class="pr-kecil tg-aturan"><summary>Aturan sinyal</summary><ul>${Tangga.ATURAN.map(r => `<li>${esc(r)}</li>`).join("")}</ul></details>${gagal}
    <p class="pr-kecil">Prediksi kita 3 hari (terpisah dari sinyal): ${esc(kini)}. Data tangga ${esc(jamWIB(t.dibuat))}.</p>`;
  return kartuTg("Tangga", `Tangga peringatan ${esc(k.nama)}: ${hlTg(terisi)} dari ${fmt(t.skala.length)} skala memuat pernyataan`, isi, "tg-tangga");
}

function ringkasTg() {
  const t = TG.t, daftar = PR.d.kab;
  if (!TG.prov) {
    const r = Tangga.perProvinsi(t, daftar), tot = k => r.reduce((s, x) => s + x[k], 0);
    const baris = r.map(x => `<tr class="tg-klik" data-prov="${esc(x.p)}" tabindex="0"><td>${esc(x.nama)}</td><td class="n">${fmt(x.n)}</td><td class="n">${fmt(x.mk)}</td><td class="n">${fmt(x.mb)}</td><td class="n">${fmt(x.dk)}</td><td class="n">${fmt(x.db)}</td><td class="n">${fmt(x.sk)}</td><td class="n">${fmt(x.sb)}</td></tr>`).join("");
    return kartuTg("Ringkasan", `${hlTg(tot("mk"))} kabupaten/kota menguat pada ancaman kering dan ${hlTg(tot("mb"))} pada ancaman basah`,
      `<div class="tw ex-tabel"><table><thead><tr><th>Provinsi</th><th>Kab/kota</th><th data-tip="Menguat, kering">Menguat kering</th><th data-tip="Menguat, basah">Menguat basah</th><th data-tip="Searah (cakupan beda atau datar), kering">Searah kering</th><th data-tip="Searah (cakupan beda atau datar), basah">Searah basah</th><th data-tip="Belum selaras, kering">Belum selaras kering</th><th data-tip="Belum selaras, basah">Belum selaras basah</th></tr></thead><tbody>${baris}</tbody></table></div>`);
  }
  const r = TG.r = Tangga.bersinyal(t, daftar, TG.prov, TG.a), nProv = daftar.filter(k => k.prov === TG.prov).length;
  const pn = daftar.find(k => k.prov === TG.prov)?.pn || "";
  const mk = r.filter(x => x.m.k).length, mb = r.filter(x => x.m.b).length;
  const isi = r.length ? `<div class="tw ex-tabel"><table><thead><tr><th>Kab/kota</th><th>Kering</th><th>Basah</th></tr></thead><tbody>${barisKab(0, TG.n)}</tbody></table></div>${r.length > TG.n ? '<div class="pr-lagi"><button type="button" id="tgLagi">Tampilkan lagi</button></div>' : ""}`
    : '<p class="kosong">Tidak ada kab/kota dengan sinyal pada pernyataan BMKG yang ada.</p>';
  return kartuTg("Ringkasan", `${esc(pn)}: ${hlTg(mk)} dari ${fmt(nProv)} kab/kota menguat kering, ${hlTg(mb)} menguat basah`, isi + '<p class="pr-kecil"><span class="pr-pil abu" data-tip="Sinyal ini belum diuji balik terhadap kejadian">sinyal belum diuji balik</span> Sinyal hanya dari pernyataan BMKG; aturannya ada di tangga tiap kab/kota.</p>');
}

/* baris tabel ringkasan kab dari indeks a sampai b (dipakai juga oleh "Tampilkan lagi" tanpa menggambar ulang) */
function barisKab(a, b) {
  return TG.r.slice(a, b).map(x => {
    const c = z => [x.m[z] ? "menguat" : "", x.d[z] ? "searah" : "", x.s[z] ? "belum selaras" : ""].filter(Boolean).join(", ") || "tanpa sinyal";
    return `<tr class="tg-klik" data-kab="${esc(x.k.id)}" tabindex="0"><td>${esc(x.k.nama)}</td><td>${c("k")}</td><td>${c("b")}</td></tr>`;
  }).join("");
}

function gambarTg() {
  const t = TG.t, kab = TG.kab && PR.d.kab.find(k => k.id === TG.kab);
  $("#tgIsi").innerHTML = ringkasTg() + (kab ? tanggaTg(kab) : "");
  $("#tgIsi").removeAttribute("aria-busy");
  history.replaceState(null, "", TG.kab ? "#tangga/" + TG.kab : "#tangga");
  if (typeof pasangTip === "function") pasangTip();
  return t;
}

/* chrome dulu (nilai terpilih, aria-pressed), isi satu frame kemudian; permintaan beruntun digabung jadi satu gambar */
function pasangTg() {
  $("#tgProv").value = TG.prov;
  if (TG.provOpsi !== TG.prov) {   // opsi kabupaten hanya dibangun bila provinsi berubah
    TG.provOpsi = TG.prov;
    $("#tgKab").innerHTML = '<option value="">Pilih kab/kota</option>' + PR.d.kab.filter(k => !TG.prov || k.prov === TG.prov).map(k => `<option value="${esc(k.id)}">${esc(k.nama)}</option>`).join("");
  }
  $("#tgKab").value = TG.kab;
  document.querySelectorAll("#tgAncaman button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.a === TG.a)));
  $("#tgIsi").setAttribute("aria-busy", "true");
  if (TG.antri) return;
  TG.antri = true;
  nanti(() => { TG.antri = false; gambarTg(); });
}

async function muatTangga() {
  if (!PR.d) return;
  if (TG.t === null) {
    $("#tgIsi").innerHTML = '<p class="kosong">Memuat tangga…</p>';
    TG.t = (await (PR.memTg ||= ambil("tangga.json"))) || false;
    if (!TG.t) { $("#tgIsi").innerHTML = '<p class="kosong">Data tangga belum tersedia.</p>'; $("#tgLabel").textContent = ""; return; }
    const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
    $("#tgProv").innerHTML = '<option value="">Semua provinsi</option>' + prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("");
    const awal = location.hash.match(/^#tangga\/(\d{4})$/)?.[1], k0 = awal && PR.d.kab.find(k => k.id === awal);
    if (k0) { TG.kab = k0.id; TG.prov = k0.prov; }
    $("#tgLabel").textContent = `Pernyataan resmi BMKG dan prediksi kita per skala waktu, data ${jamWIB(TG.t.dibuat)}. Alat bantu staf, bukan peringatan publik.`;
  }
  if (!TG.t) return;
  pasangTg();
}

$("#tgProv").addEventListener("change", () => { TG.prov = $("#tgProv").value; TG.kab = ""; TG.n = 60; pasangTg(); });
$("#tgKab").addEventListener("change", () => { TG.kab = $("#tgKab").value; const k = PR.d.kab.find(x => x.id === TG.kab); if (k) TG.prov = k.prov; pasangTg(); });
$("#tgAncaman").addEventListener("click", e => { const b = e.target.closest("button[data-a]"); if (b) { TG.a = b.dataset.a; TG.n = 60; pasangTg(); } });
const bukaTg = e => {
  if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
  const r = e.target.closest("tr[data-prov], tr[data-kab]");
  if (!r) return;
  if (e.type === "keydown") e.preventDefault();   // Spasi tidak menggulir halaman
  if (r.dataset.prov) { TG.prov = r.dataset.prov; TG.kab = ""; } else { TG.kab = r.dataset.kab; }
  TG.n = 60; pasangTg();
};
$("#tgIsi").addEventListener("click", e => {
  if (e.target.id !== "tgLagi") return bukaTg(e);
  const tb = $("#tgIsi tbody"), dari = TG.n;   // tambah baris saja, tanpa menggambar ulang
  TG.n += 60;
  tb.insertAdjacentHTML("beforeend", barisKab(dari, TG.n));
  if (TG.n >= TG.r.length) e.target.parentNode.remove();
});
$("#tgIsi").addEventListener("keydown", bukaTg);
