/* Orang hilang publik di obrolan /lapor (orang-hilang-publik OH-04, OH-05, OH-08, OH-10): kartu langkah dari mesin (kejadian, izin, wali),
   layar terima kasih jalur "Saya menemukan seseorang", dan panel Laporan saya (cabut, perpanjang, foto publik).
   Mesin tetap satu (src/lapor_mesin.js): layar hanya menggambar pilihan yang dikirim mesin dan mengirim nomor pilihannya.
   c = {kartu, el, ikon, kirim} dari lapor.js (kartu() mengganti isi wadah). Teks dari mesin masuk lewat textContent. */
import {kecilkanFoto, teksGalat, tanggalPendek} from "/lapor/hilang_kartu.js?v=1";

export const OH_LANGKAH = new Set(["cari_kejadian", "cari_setuju", "cari_wali"]);
const judulDari = j => ((j.inti || j.balasan || "").match(/^\*([^*]+)\*/) || [])[1] || "";
const badanDari = j => (j.inti || j.balasan || "").replace(/^\*[^*]+\*\s*/, "").split("\n").map(x => x.trim()).filter(Boolean);

export function kartuOh(j, c) {
  const {kartu, el, ikon, kirim} = c, isi = kartu("i-cari", judulDari(j) || "Orang hilang"), badan = badanDari(j);
  isi.classList.add("oh-chat");
  const kirimPilihan = i => kirim({teks: String(i + 1), tampil: j.pilihan[i]});
  if (j.status === "cari_kejadian") {
    const n = j.pilihan.length - 2;   // dua pilihan terakhir tetap: bencana lain, bukan karena bencana
    isi.append(el("p", "oh-ket", badan.join(" ")));
    const g = el("fieldset", "oh-kej-daftar"), lg = el("legend", "oh-sr", judulDari(j) || "Pilih kejadian"); g.append(lg);
    let dipilih = -1;
    const lanjut = el("button", "lp-utama", "Lanjut"); lanjut.type = "button"; lanjut.disabled = true; lanjut.prepend(ikon("i-panah"));
    if (n <= 0) g.append(el("p", "oh-kej-kosong", "Belum ada kejadian tercatat di wilayah ini. Pilih Bencana lain bila hilangnya karena bencana; petugas yang memeriksa kaitannya."));
    j.pilihan.forEach((o, i) => {
      const l = el("label", "oh-kej"), r = el("input"), kom = o.lastIndexOf(", ");
      r.type = "radio"; r.name = "oh-kej"; r.value = String(i);
      l.append(r, el("b", null, i < n && kom > 0 ? o.slice(0, kom) : o));
      const ket = [i < n && kom > 0 ? o.slice(kom + 2) : "", j.ket?.[i] || ""].filter(Boolean).join(". ");
      if (ket) l.append(el("small", null, ket));
      r.addEventListener("change", () => { dipilih = i; lanjut.disabled = false; });   // chrome langsung, tanpa kerja berat
      g.append(l);
    });
    lanjut.addEventListener("click", () => { if (dipilih >= 0) { lanjut.disabled = true; kirimPilihan(dipilih); } });
    isi.append(g, lanjut); return;
  }
  if (j.status === "cari_setuju") {
    const ul = el("ul", "oh-setuju-teks");
    for (const t of badan) { const li = el("li"); li.append(ikon("i-centang"), el("span", null, t)); ul.append(li); }
    isi.append(ul);
  } else isi.append(...badan.map(t => el("p", "oh-ket", t)));
  // dua tombol sama besar dan sama gaya (DESIGN-SYSTEM 5): tidak ada yang berwarna bahaya atau mendorong setuju
  const aksi = el("div", "oh-setuju-aksi");
  j.pilihan.forEach((o, i) => { const b = el("button", null, o); b.type = "button"; b.addEventListener("click", () => { for (const x of aksi.children) x.disabled = true; kirimPilihan(i); }); aksi.append(b); });
  isi.append(aksi);
}

/* jalan pintas 112 sesudah jawaban kondisi orang yang ditemukan: mesin menaruh kalimat "Hubungi 112 sekarang" di balasan */
export function tombol112(j, c) {
  if (!/^temu_/.test(j.status || "") || !/Hubungi 112 sekarang/.test(j.balasan || "")) return null;
  const a = Object.assign(c.el("a", "oh-112"), {href: "tel:112"}); a.append(c.ikon("i-telepon"), "Telepon 112 sekarang"); a.setAttribute("aria-label", "Telepon 112 sekarang");
  return a;
}

export function kartuTemuTerkirim(c, bukaBaru) {
  const {kartu, el, ikon} = c, isi = kartu("tiket", "Laporan diterima"), k = isi.closest(".lp-langkah"); k.classList.add("lp-langkah-tiket"); k.querySelector(".lp-langkah-kepala")?.remove();
  const pita = el("div", "lp-tk-pita"), ok = el("span", "lp-ok"), pt = el("div"); ok.append(ikon("i-centang"));
  pt.append(el("b", null, "Terima kasih, laporan Anda sudah kami terima"), el("span", null, "Petugas akan menghubungi bila ada keluarga yang cocok. Orang ini tidak akan tampil di halaman publik tanpa izinnya.")); pita.append(ok, pt);
  const hub = el("div", "lp-tk-bpbd"), t = el("div"), tel = Object.assign(el("a", "lp-tk-tel"), {href: "tel:112"});
  t.append(el("b", null, "Butuh pertolongan sekarang?"), el("span", null, "Telepon 112 untuk keadaan darurat.")); tel.append(ikon("i-telepon"), "Telepon 112"); hub.append(t, tel);
  const baru = el("button", "lp-tk-baru"); baru.type = "button"; baru.append(ikon("i-plus"), "Buat laporan baru"); baru.addEventListener("click", bukaBaru);
  isi.append(pita, hub, baru);
}

/* ---- Laporan saya ---- */
const API = "/api/lapor/hilang/saya";
/* Map cari_id -> profil milik nomor ini; null bila belum masuk (401) atau layanan belum dibuka: panel tidak digambar, tanpa galat di layar */
export async function muatSaya() {
  try {
    const r = await fetch(API, {credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000)});
    if (!r.ok) return null;
    return new Map(((await r.json()).profil || []).map(p => [p.id, p]));
  } catch { return null; }
}
async function kirimSaya(jalur, badan, bytes) {
  try {
    const r = await fetch(`${API}/${jalur}`, {method: "POST", credentials: "same-origin", headers: {"x-pb": "1", ...(bytes ? {"content-type": "image/jpeg"} : {"content-type": "application/json"})}, body: bytes ?? JSON.stringify(badan), signal: AbortSignal.timeout(30000)});
    return {s: r.status, j: await r.json().catch(() => ({}))};
  } catch { return {s: 0, j: {}}; }
}
/* konfirmasi dengan <dialog> modal bawaan: tombol yang tidak menghapus apa pun (Batal) berfokus lebih dulu, Esc dan gestur kembali = batal */
function konfirmasi(el, judul, teks, ya) {
  return new Promise(selesai => {
    const d = el("dialog", "oh-dlg"), h = el("h1", null, judul), f = el("form"), a = el("div", "oh-aksi-dua"), b = el("button", "oh-tombol", "Batal"), y = el("button", "oh-tombol", ya);
    h.id = "oh-konfirmasi"; d.setAttribute("aria-labelledby", h.id); b.type = y.type = "submit"; b.value = "batal"; y.value = "ya"; b.autofocus = true; f.method = "dialog"; a.append(b, y); f.append(a);
    d.append(h, el("p", "oh-ket", teks), f); d.addEventListener("close", () => { const v = d.returnValue === "ya"; d.remove(); selesai(v); });
    document.body.append(d); d.showModal();
  });
}
export function panelSaya(c, p, segarkan) {
  const {el} = c, w = el("div", "oh-saya"), st = el("p"), aksi = el("div", "oh-saya-aksi");
  st.setAttribute("role", "status");
  const kepala = el("div", "oh-kepala"), pil = el("span", `oh-pil ${p.status === "tayang" ? "ok" : p.status === "turun" ? "redup" : "tunggu"}`, p.label || p.status);
  kepala.append(pil); if (p.alasan) kepala.append(el("span", "oh-pil redup", p.alasan));
  w.append(kepala);
  if (p.status === "tayang" && p.berakhir) w.append(el("p", null, `Profil tampil sampai ${tanggalPendek(new Date(p.berakhir + 7 * 36e5).toISOString())}.`));
  if (p.status === "menunggu") w.append(el("p", null, "Petugas memeriksa dulu sebelum profil tampil."));
  const tombol = (teks, f) => { const b = el("button", "oh-tombol", teks); b.type = "button"; b.addEventListener("click", async () => { b.disabled = true; st.textContent = ""; await f(b); b.disabled = false; }); aksi.append(b); return b; };
  const hasil = (r, ok) => { if (r.s === 200) { st.textContent = ok; segarkan?.(); } else st.textContent = teksGalat(r.s, r.j.galat); };
  if (p.bisa_cabut) tombol("Cabut persetujuan", async () => {
    if (await konfirmasi(el, "Cabut persetujuan?", "Profil akan langsung turun dari halaman publik.", "Cabut persetujuan")) hasil(await kirimSaya("cabut", {id: p.id}), "Persetujuan dicabut. Profil sudah turun.");
  });
  if (p.bisa_perpanjang) tombol("Perpanjang profil", async () => hasil(await kirimSaya("perpanjang", {id: p.id}), "Permintaan diterima. Petugas memeriksa lagi sebelum profil tampil."));
  if (p.status === "draf" || p.status === "menunggu") {
    const masuk = Object.assign(el("input"), {type: "file", accept: "image/*", hidden: true}), foto = el("div", "oh-saya-foto");
    masuk.addEventListener("change", async () => {
      const f = masuk.files[0]; masuk.value = ""; if (!f) return;
      st.textContent = "Menyiapkan foto";
      const b = await kecilkanFoto(f);
      if (!b) { st.textContent = "Foto tidak terbaca atau terlalu besar. Coba foto lain."; return; }
      const r = await kirimSaya(`foto?id=${encodeURIComponent(p.id)}`, null, b);
      if (r.s === 200) { foto.append(Object.assign(el("img"), {src: URL.createObjectURL(b), alt: "Foto publik yang dipilih", width: 64, height: 80})); st.textContent = `${r.j.jumlah} dari 3 foto publik terkirim. Petugas memeriksa dulu.`; }
      else st.textContent = teksGalat(r.s, r.j.galat);
    });
    tombol("Pilih foto publik", () => masuk.click());
    w.append(el("p", "oh-foto-catatan", "Foto yang Anda unggah dikirim ke penyedia model kecerdasan buatan di luar negeri untuk dibaca cirinya. Foto anak tidak ditampilkan di halaman publik."), foto, masuk);
  }
  w.append(aksi, st);
  return w;
}
