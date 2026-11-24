/* Orang dicari di meja laporan (KEPUTUSAN-LAPOR-AI K91, D129, D130; TIKET LA-82): daftar wilayah akun, tanda cocok dengan kabar selamat (hanya nomor yang sama persis),
   ubah status dengan catatan. Hak dan wilayah ditentukan server (GET /api/lapor/meja/cari); layar tidak menyaring sendiri.
   INP: dialog dan tombol berubah seketika, daftar dimuat ulang sesudah server menjawab. Kata larangan D126 tidak dipakai. */
import {STATUS_CARI, labelCari, aksiCari, waktuWib, teksGalat} from "./selamat_murni.js";

const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const NS = "http://www.w3.org/2000/svg";
const ikon = id => { const s = document.createElementNS(NS, "svg"), u = document.createElementNS(NS, "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const F = n => Number(n).toLocaleString("id-ID");
const WARNA = {buka: "var(--warn)", ditemukan_selamat: "var(--ok)", ditemukan_meninggal: "var(--ink2)", ke_sar: "var(--brand-accent)", tutup: "var(--line)"};
const pil = s => { const p = el("span", "mj-pil", labelCari(s)); p.style.setProperty("--st", WARNA[s] || "var(--line)"); return p; };
const BATAS = 100;
const sebut = nomor => nomor ? `+${String(nomor).replace(/\D/g, "")}` : "";

async function api(jalur, badan) {
  try {
    const r = await fetch(`/api/lapor/meja/cari${jalur}`, badan === undefined ? {cache: "no-store", credentials: "same-origin"}
      : {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan)});
    return {s: r.status, j: await r.json().catch(() => ({}))};
  } catch { return {s: 0, j: {}}; }
}

function dialogStatus(r, sesudah) {
  const d = el("dialog", "mj-ld-dlg"), h = el("h3", null, `Ubah status: ${r.nama_dicari}`), ca = el("textarea"), p = el("p", "mj-kosong"), aksi = el("div", "mj-cari-aksi");
  d.setAttribute("aria-label", "Ubah status orang dicari"); ca.rows = 3; ca.maxLength = 300; ca.placeholder = "Catatan untuk riwayat, boleh dikosongkan"; ca.setAttribute("aria-label", "Catatan");
  const tombolTutup = el("button", "mj-tombol", "Batal"); tombolTutup.type = "button"; tombolTutup.addEventListener("click", () => d.close());
  const semua = [tombolTutup];
  for (const [st, teks] of aksiCari(r.status)) {
    const b = el("button", "mj-tombol", teks); b.type = "button"; semua.push(b);
    b.addEventListener("click", async () => {
      for (const x of semua) x.disabled = true; b.textContent = "Menyimpan..."; p.textContent = "";   // chrome berubah seketika
      const res = await api(`/${r.id}/status`, {status: st, catatan: ca.value.trim() || undefined});
      if (res.s === 200) { d.close(); sesudah(); return; }
      for (const x of semua) x.disabled = false; b.textContent = teks; p.textContent = teksGalat(res.s, res.j.galat);
    });
    aksi.append(b);
  }
  d.append(h, el("p", null, `Status sekarang: ${labelCari(r.status)}.`), ca, aksi, p, tombolTutup); d.addEventListener("close", () => d.remove());
  document.body.append(d); d.showModal(); ca.focus({preventScroll: true});
}

function baris(r, muatUlang) {
  const tr = el("tr"), nama = el("td"), lok = el("td"), pen = el("td"), st = el("td"), kabar = el("td"), ak = el("td");
  nama.append(el("b", null, r.nama_dicari)); if (r.ciri) nama.append(el("small", "mj-cari-ciri", r.ciri));
  lok.append(r.lokasi_terakhir || "belum diisi"); if (r.waktu_terakhir) lok.append(el("small", "mj-cari-ciri", `Terakhir terlihat ${waktuWib(r.waktu_terakhir) || r.waktu_terakhir}`));
  pen.append(sebut(r.nomor_pencari)); if (r.hubungan) pen.append(el("small", "mj-cari-ciri", r.hubungan)); if (r.nomor_dicari) pen.append(el("small", "mj-cari-ciri", `Nomor yang dicari ${sebut(r.nomor_dicari)}`));
  st.append(pil(r.status));
  if (r.cocok) { const c = el("span", "mj-cari-cocok"); c.append(ikon("m-orang"), "Ada kabar selamat dari nomor ini"); c.title = r.tanda ? `${r.tanda.label || ""} ${waktuWib(r.tanda.waktu)}`.trim() : ""; kabar.append(c); if (r.tanda) kabar.append(el("small", "mj-cari-ciri", `${r.tanda.label || ""}, ${waktuWib(r.tanda.waktu)}`)); }
  const u = el("button", "mj-tombol", "Ubah status"); u.type = "button"; u.addEventListener("click", () => dialogStatus(r, muatUlang)); ak.append(u);
  tr.append(nama, lok, el("td", null, r.kab_nama || r.kab), pen, st, kabar, el("td", null, waktuWib(r.dibuat)), ak);
  return tr;
}

export async function bukaOrangDicari() {
  if (document.querySelector("dialog.mj-oc[open]")) return;
  const d = el("dialog", "mj-rinci mj-ld-daftar mj-oc"), kep = el("header", "mj-rinci-kepala"), atas = el("div", "mj-rk-atas"), judul = el("div", "mj-rk-judul"), h2 = el("h2", null, "Orang dicari");
  h2.id = "ocJudul"; d.setAttribute("aria-labelledby", "ocJudul"); judul.append(h2, el("p", "mj-rk-meta", "Laporan warga tentang orang yang belum ditemukan, hanya untuk petugas wilayah ini"));
  const x = el("button", "mj-tutup"); x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ikon("m-tutup")); x.addEventListener("click", () => d.close()); atas.append(judul, x); kep.append(atas);
  const badan = el("div", "mj-rinci-gulung"), isi = el("div", "mj-ld-isi"); badan.append(isi); d.append(kep, badan); d.addEventListener("close", () => d.remove());
  document.body.append(d); d.showModal();
  let semua = [], saring = "terbuka", jadwal = 0, rafId = 0;   // hanya render terakhir yang jalan
  const wadah = el("div"), chips = el("div", "mj-deret mj-ld-jenis");
  const cocok = (b, f) => f === "semua" || (f === "terbuka" ? b.status === "buka" : f === "kabar" ? b.cocok : b.status === f);
  const PILIHAN = [["terbuka", "Terbuka"], ["kabar", "Ada kabar selamat"], ["semua", "Semua"]];
  const tabel = () => {
    const tampil = semua.filter(b => cocok(b, saring));
    if (!tampil.length) return wadah.replaceChildren(el("p", "mj-kosong", saring === "terbuka" ? "Tidak ada laporan orang dicari yang terbuka." : "Tidak ada laporan yang cocok."));
    const tb = el("table", "mj-tabel mj-ld-tabel"), th = el("thead"), tr = el("tr"), bd = el("tbody");
    for (const t of ["Orang dicari", "Terakhir terlihat", "Kab/kota", "Pelapor", "Status", "Kabar selamat", "Masuk", "Aksi"]) tr.append(el("th", null, t)); th.append(tr);
    const isiBaris = (dari, sampai) => bd.append(...tampil.slice(dari, sampai).map(b => baris(b, muat)));
    isiBaris(0, BATAS); tb.append(th, bd); const g = el("div", "mj-tabel-gulung"); g.append(tb);
    const lagi = tampil.length > BATAS ? el("button", "mj-tombol", `Tampilkan lagi, sisa ${F(tampil.length - BATAS)}`) : null;
    if (lagi) { lagi.type = "button"; let n = BATAS; lagi.addEventListener("click", () => { isiBaris(n, n + BATAS); n += BATAS; if (n >= tampil.length) lagi.remove(); else lagi.textContent = `Tampilkan lagi, sisa ${F(tampil.length - n)}`; }); }
    wadah.replaceChildren(g, ...(lagi ? [lagi] : []));
  };
  const chip = () => chips.replaceChildren(...PILIHAN.map(([k, t]) => { const c = el("button", "mj-chip-j"); c.type = "button"; c.setAttribute("aria-pressed", String(saring === k));
    c.append(`${t} `, el("b", null, F(semua.filter(b => cocok(b, k)).length)));
    c.addEventListener("click", () => { saring = k; for (const y of chips.children) y.setAttribute("aria-pressed", String(y === c)); clearTimeout(jadwal); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => { jadwal = setTimeout(tabel, 0); }); }); return c; }));   // chip tercat dulu, tabel menyusul
  async function muat() {
    const r = await api("");
    if (r.s !== 200) { isi.replaceChildren(el("p", "mj-kosong", r.s === 401 || r.s === 403 ? "Daftar orang dicari hanya bisa dibuka staf BNPB dan akun BPBD wilayahnya." : teksGalat(r.s, r.j.galat))); return; }
    semua = (r.j.baris || []).slice().sort((a, b) => (a.status === "buka" ? 0 : 1) - (b.status === "buka" ? 0 : 1) || (b.cocok ? 1 : 0) - (a.cocok ? 1 : 0) || Number(b.dibuat) - Number(a.dibuat));
    chip(); tabel(); isi.replaceChildren(chips, wadah);
  }
  isi.replaceChildren(el("p", "mj-kosong", "Memuat daftar...")); await muat();
}
export {STATUS_CARI};
