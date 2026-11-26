/* Aplikasi dan peringatan dini Pantau Bencana di beranda /lapor (paket data/kajian-bnpb/pwa-peringatan, PW-05, PW-08, PW-09).
   1. Pasang aplikasi: Android/Chrome lewat beforeinstallprompt; iPhone lewat Bagikan lalu Tambah ke Layar Utama (push iOS hanya jalan dari aplikasi terpasang).
   2. Peringatan: pilih sampai 3 kecamatan, jenis, dan ambang; langganan Web Push ke /api/lapor/peringatan/langganan.
   3. Arahan: tingkat 3 hari kab/kota dan tiga titik berkumpul terdekat (perkiraan OSM, jarak garis lurus).
   Mendaftarkan satu service worker /sw-lapor.js (juga dipakai lapor tanpa sinyal). Berdiri sendiri: tidak memakai fungsi lapor.js. */
const $ = id => document.getElementById(id);
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); s.setAttribute("aria-hidden", "true"); u.setAttribute("href", `#${id}`); s.append(u); return s; };
const JENIS = [["BNJ", 1, "Banjir"], ["LSR", 2, "Tanah longsor"], ["ASP", 4, "Asap"], ["CEX", 8, "Angin kencang"]], TINGKAT = ["Normal", "Waspada", "Siaga", "Awas"];
const terpasang = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const iPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const bisaPush = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const SIMPAN = "pb-peringatan";   // per perangkat: kecamatan pilihan (tanpa data pribadi), untuk tampilan saja
const baca = () => { try { return JSON.parse(localStorage.getItem(SIMPAN) || "null"); } catch { return null; } };
const tulis = v => { try { v ? localStorage.setItem(SIMPAN, JSON.stringify(v)) : localStorage.removeItem(SIMPAN); } catch {} };
const post = (u, b) => fetch(u, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(b), signal: AbortSignal.timeout(20000)}).then(async r => ({ok: r.ok, j: await r.json().catch(() => ({}))}));
const b64keArr = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };

let pasangTunda = null, reg = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); pasangTunda = e; gambar(); });
addEventListener("appinstalled", () => { pasangTunda = null; gambar(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-lapor.js", {scope: "/lapor/"}).then(r => { reg = r; gambar(); }).catch(() => {});

async function langgananPeramban() { const r = reg || await navigator.serviceWorker?.ready; return r?.pushManager.getSubscription(); }

function gambar() {
  const w = $("pwIsi"), sek = $("pwKartu"); if (!w || !sek) return;
  sek.hidden = false;
  const kisi = el("div", "lp-pw-kisi");
  kisi.append(kartuPasang());   // kartu peringatan pindah ke layar Info (pemilik 25 Nov 2026: "hilangkan, masukkan kesini")
  w.replaceChildren(kisi);
  if (wadahInfo?.isConnected) wadahInfo.replaceChildren(kartuPeringatan());
}
let wadahInfo = null;
window.pbKartuPeringatan = w => { wadahInfo = w; w.replaceChildren(kartuPeringatan()); };

/* ---- kartu pasang aplikasi: satu baris per perangkat, QR untuk membuka di HP (pemilik 24 Nov 2026, pola halaman unduh) ---- */
const ANDROID = /Android/.test(navigator.userAgent), HP = iPhone || ANDROID;
function ubinPasang(nama, ket, ik, langkah, tombol, cocok) {   // satu ubin per perangkat: langkah selalu tampak, tanpa tombol lipat (pemilik 25 Nov 2026: "bagusin")
  const li = el("li", cocok ? "lp-pw-ubin cocok" : "lp-pw-ubin"), kep = el("div", "lp-pw-ubin-kep"), u = el("span", "lp-pw-ik lp-pw-platform"), t = el("span");
  for (const x of [].concat(ik)) u.append(ikon(x)); t.append(el("b", null, nama), el("small", null, ket)); kep.append(u, t);
  const ol = el("ol", "lp-pw-langkah"); for (const x of langkah) { const [ic, tx] = Array.isArray(x) ? x : [null, x], l = el("li"); if (ic) l.append(ikon(ic)); l.append(el("span", null, tx)); ol.append(l); }   // langkah berikon kecil (26 Nov 2026)
  li.append(kep, ol); if (tombol) li.append(tombol); return li;
}
function tombolPasang(teks) {
  const b = el("button", "lp-pw-tbl lp-pw-tbl-utama"); b.type = "button"; b.append(ikon("i-unduh"), teks);
  b.addEventListener("click", async () => { const e = pasangTunda; if (!e) return; pasangTunda = null; await e.prompt(); await e.userChoice.catch(() => null); gambar(); });
  return b;
}
function kartuPasang() {
  const k = el("section", "lp-pw-kartu lp-pw-pasang"), kep = el("div", "lp-pw-kep"), ik = el("span", "lp-pw-ik"); ik.append(ikon("i-unduh"));
  const t = el("div"); t.append(el("b", null, "Pasang aplikasi"));   // tanpa deretan pil manfaat (pemilik 26 Nov 2026: "Hilangkan")
  kep.append(ik, t); k.append(kep);
  if (terpasang()) { const ok = el("p", "lp-pw-ok"); ok.append(ikon("i-centang"), "Aplikasi sudah terpasang di perangkat ini."); k.append(ok); return k; }
  const badan = el("div", "lp-pw-pbadan"), ul = el("ul", "lp-pw-daftar");
  const cocokAnd = ANDROID, cocokIos = iPhone, cocokKom = !HP, tbl = () => pasangTunda ? tombolPasang("Pasang sekarang") : null;   // tombol hanya bila peramban menawarkan pemasangan; kartu perangkat ini ditonjolkan
  ul.append(
    ubinPasang("Android", "Chrome", "p-android", [["i-pesan", "Buka halaman ini di Chrome."], ["i-titik3", "Ketuk menu titik tiga di kanan atas."], ["i-plus", "Pilih Instal aplikasi atau Tambahkan ke layar utama."]], cocokAnd ? tbl() : null, cocokAnd),
    ubinPasang("iPhone dan iPad", "Safari", "p-apple", [["i-pesan", "Buka halaman ini di Safari."], ["i-bagikan", "Ketuk tombol Bagikan (kotak dengan panah ke atas)."], ["i-plus", "Pilih Tambah ke Layar Utama, lalu Tambah."], ["i-sirene", "Buka Pantau Bencana dari ikon di layar utama untuk menyalakan peringatan."]], cocokIos ? tbl() : null, cocokIos),
    ubinPasang("Komputer", "Windows atau Mac, Chrome atau Edge", ["p-windows", "p-apple"], [["i-pesan", "Buka halaman ini di Chrome atau Edge."], ["i-unduh", "Klik ikon pasang di ujung kanan kolom alamat."], ["i-plus", "Pilih Instal."]], cocokKom ? tbl() : null, cocokKom));
  ul.classList.toggle("ada-cocok", true); badan.append(ul);
  const qr = !HP && window.Bagi?.QR ? (() => { try { return window.Bagi.QR.kanvas(location.origin + "/lapor/", 4); } catch { return null; } })() : null;
  if (qr) {
    const f = el("figure", "lp-pw-qr"); qr.setAttribute("role", "img"); qr.setAttribute("aria-label", "Kode QR ke halaman Pantau Bencana");
    const c = el("figcaption"); c.append(el("b", null, "Buka di HP"), el("small", null, location.host.replace(/^www\./, "") + "/lapor"));
    f.append(qr, c); badan.append(f);
  }
  k.append(badan); return k;
}

/* ---- kartu peringatan dini ---- */
function kartuPeringatan() {
  const k = el("section", "lp-pw-kartu"), kep = el("div", "lp-pw-kep"), ik = el("span", "lp-pw-ik"); ik.append(ikon("i-sirene"));
  const t = el("div"); t.append(el("b", null, "Peringatan dini untuk kecamatan Anda"), el("small", null, "Notifikasi saat prakiraan banjir, longsor, asap, atau angin naik ke Waspada, Siaga, atau Awas."));
  kep.append(ik, t); k.append(kep);
  const isi = el("div", "lp-pw-isi"); k.append(isi);
  const aktif = baca();
  if (!bisaPush()) {
    isi.append(el("p", "lp-redup lp-kecil", iPhone && !terpasang() ? "Di iPhone, peringatan hanya bisa dinyalakan dari aplikasi yang sudah dipasang di layar utama (lihat langkah di sebelah)." : "Peramban ini belum mendukung notifikasi. Coba Chrome di Android atau pasang aplikasinya."));
    if (aktif?.kec?.length) isi.append(tombolArahan(aktif.kec[0]));
    return k;
  }
  if (aktif?.kec?.length) { isi.append(ringkasAktif(aktif)); return k; }
  isi.append(formulir());
  return k;
}

function ringkasAktif(a) {
  const w = el("div", "lp-pw-aktif");
  const p = el("p", "lp-pw-ok"); p.append(ikon("i-centang"), `Peringatan menyala untuk ${a.kec.map(x => x.nama).join(", ")}.`);
  const j = el("p", "lp-redup lp-kecil", `Jenis: ${JENIS.filter(x => a.jenis & x[1]).map(x => x[2]).join(", ")}. Mulai tingkat ${TINGKAT[a.ambang || 1]}.`);
  const aksi = el("div", "lp-pw-aksi");
  const ubah = el("button", "lp-kedua"); ubah.type = "button"; ubah.append(ikon("i-tambah-teks"), "Ubah");
  ubah.addEventListener("click", () => w.replaceWith(formulir(a)));
  const mati = el("button", "lp-kedua"); mati.type = "button"; mati.append(ikon("i-tutup"), "Matikan peringatan");
  mati.addEventListener("click", async () => { mati.disabled = true; const s = await langgananPeramban().catch(() => null); if (s) { await post("/api/lapor/peringatan/berhenti", {endpoint: s.endpoint}).catch(() => {}); await s.unsubscribe().catch(() => {}); } tulis(null); gambar(); });
  aksi.append(tombolArahan(a.kec[0]), ubah, mati);
  w.append(p, j, aksi); return w;
}

function formulir(lama = null) {
  const f = el("div", "lp-pw-form"), dipilih = new Map((lama?.kec || []).map(x => [x.kode, x.nama]));
  // kecamatan: cari, pilih paling banyak 3
  const lb = el("label", "lp-pw-label", "Kecamatan (paling banyak 3)"), cari = el("label", "lp-cari"), q = el("input");
  q.type = "search"; q.placeholder = "Ketik nama kecamatan, misalnya Cakung"; q.setAttribute("aria-label", "Cari kecamatan"); cari.append(ikon("i-cari"), q);
  const chip = el("div", "lp-pw-chip"), hasil = el("div", "lp-pw-hasil");
  const segarChip = () => chip.replaceChildren(...[...dipilih].map(([kd, nm]) => { const c = el("button", "lp-tempat-chip"); c.type = "button"; c.append(nm, ikon("i-tutup")); c.setAttribute("aria-label", `Hapus ${nm}`); c.addEventListener("click", () => { dipilih.delete(kd); segarChip(); }); return c; }));
  let tunda, urut = 0;
  q.addEventListener("input", () => { clearTimeout(tunda); const v = q.value.trim(); if (v.length < 2) { hasil.replaceChildren(); return; }
    tunda = setTimeout(async () => { const n = ++urut; const j = await fetch(`/api/lapor/peringatan/cari?q=${encodeURIComponent(v)}`, {signal: AbortSignal.timeout(10000)}).then(r => r.json()).catch(() => ({hasil: []})); if (n !== urut) return;
      hasil.replaceChildren(...(j.hasil || []).slice(0, 6).map(x => { const b = el("button", "lp-pw-pilih"); b.type = "button"; const nm = x.judul.replace(/^Kecamatan /, "");
        b.append(el("b", null, nm), el("small", null, x.sub)); b.addEventListener("click", () => { if (dipilih.size >= 3 && !dipilih.has(x.kode)) { status.textContent = "Paling banyak 3 kecamatan."; return; } dipilih.set(x.kode, nm); q.value = ""; hasil.replaceChildren(); segarChip(); }); return b; }));
      if (!j.hasil?.length) hasil.append(el("p", "lp-redup lp-kecil", "Kecamatan tidak ditemukan."));
    }, 250); });
  // jenis dan ambang
  const jg = el("fieldset", "lp-pw-jenis lp-pw-pil"); jg.append(el("legend", null, "Jenis ancaman"));
  const jenisAwal = lama?.jenis ?? 15;
  for (const [, bit, nama] of JENIS) { const l = el("label"), c = el("input"); c.type = "checkbox"; c.value = String(bit); c.checked = !!(jenisAwal & bit); l.append(c, nama); jg.append(l); }
  const ag = el("label", "lp-pw-label", "Kirim mulai tingkat"), sel = el("select");
  for (const [i, nm] of [[1, "Waspada (semua kenaikan)"], [2, "Siaga ke atas"], [3, "Awas saja"]]) { const o = el("option", null, nm); o.value = String(i); if ((lama?.ambang || 1) === i) o.selected = true; sel.append(o); }
  ag.append(sel);
  const status = el("p", "lp-pw-status"); status.setAttribute("role", "status");
  const nyala = el("button", "lp-utama"); nyala.type = "button"; nyala.append(ikon("i-sirene"), lama ? "Simpan perubahan" : "Nyalakan peringatan");
  nyala.addEventListener("click", async () => {
    if (!dipilih.size) { status.textContent = "Pilih paling sedikit satu kecamatan."; q.focus(); return; }
    const jenis = [...jg.querySelectorAll("input:checked")].reduce((t, c) => t | Number(c.value), 0); if (!jenis) { status.textContent = "Pilih paling sedikit satu jenis."; return; }
    nyala.disabled = true; status.textContent = "Menyiapkan peringatan...";
    try {
      const kunci = await fetch("/api/lapor/peringatan/kunci").then(r => r.json());
      if (!kunci.tersedia) throw new Error("Layanan peringatan belum aktif di server. Coba lagi nanti.");
      const izin = await Notification.requestPermission(); if (izin !== "granted") throw new Error("Izin notifikasi belum diberikan. Nyalakan izin notifikasi untuk situs ini di pengaturan peramban.");
      const r = reg || await navigator.serviceWorker.ready;
      const s = (await r.pushManager.getSubscription()) || await r.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64keArr(kunci.publik)});
      const sj = s.toJSON(), ambang = Number(sel.value);
      const h = await post("/api/lapor/peringatan/langganan", {endpoint: sj.endpoint, kunci: sj.keys, kec: [...dipilih.keys()], jenis, ambang, bahasa: "id"});
      if (!h.ok) throw new Error(h.j.galat || "Peringatan belum bisa disimpan.");
      tulis({kec: h.j.kec, jenis, ambang}); gambar();
    } catch (e) {   // galat peramban (bahasa Inggris) diterjemahkan supaya warga tahu langkah berikutnya
      const n = e?.name, m = String(e?.message || e);
      status.textContent = n === "NotAllowedError" || /permission|denied/i.test(m) ? "Notifikasi belum bisa dinyalakan di peramban ini. Izinkan notifikasi untuk situs ini, atau pakai Chrome di Android atau aplikasi yang terpasang di iPhone."
        : n === "AbortError" || n === "InvalidStateError" ? "Pendaftaran ke layanan notifikasi peramban gagal. Coba lagi beberapa saat lagi." : /fetch|network|Failed/i.test(m) ? "Tidak ada sambungan. Coba lagi saat ada sinyal." : m;
      nyala.disabled = false; }
  });
  const catatan = el("p", "lp-redup lp-kecil lp-pw-catatan", "Tingkat dihitung per kabupaten/kota dari prakiraan Pantau Bencana, bukan peringatan resmi BMKG atau BNPB. Yang disimpan hanya alamat notifikasi perangkat dan kode kecamatan.");
  f.append(lb, chip, cari, hasil, jg, ag, nyala, status, catatan); segarChip(); return f;
}

/* ---- arahan: tingkat 3 hari dan titik berkumpul terdekat ---- */
function tombolArahan(kec) {
  const b = el("button", "lp-kedua"); b.type = "button"; b.append(ikon("i-arah"), "Arahan dan titik berkumpul");
  b.addEventListener("click", () => bukaArahan(kec)); return b;
}
async function bukaArahan(kec) {
  const d = el("dialog", "lp-pw-dialog"), kep = el("div", "lp-pw-dkep"), tutup = el("button", "lp-ikon"); tutup.type = "button"; tutup.setAttribute("aria-label", "Tutup"); tutup.append(ikon("i-tutup"));
  tutup.addEventListener("click", () => d.close()); d.addEventListener("close", () => d.remove());
  const h = el("h2", null, `Arahan untuk Kecamatan ${kec.nama}`); h.id = "pwJudulArah"; d.setAttribute("aria-labelledby", h.id); kep.append(h, tutup);
  const isi = el("div", "lp-pw-dlist"); isi.append(el("p", "lp-redup", "Memuat arahan..."));
  d.append(kep, isi); document.body.append(d); d.showModal();
  const pos = await new Promise(r => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => r(p.coords), () => r(null), {timeout: 6000, maximumAge: 600000}) : r(null));
  const u = `/api/lapor/peringatan/arah?kec=${encodeURIComponent(kec.kode)}${pos ? `&lat=${pos.latitude.toFixed(4)}&lon=${pos.longitude.toFixed(4)}` : ""}`;
  const j = await fetch(u, {signal: AbortSignal.timeout(15000)}).then(r => r.json()).catch(() => null);
  if (!j || j.galat) { isi.replaceChildren(el("p", "lp-redup", j?.galat || "Arahan belum bisa dimuat. Coba lagi.")); return; }
  const hari = el("div", "lp-pw-hari");
  for (const x of j.hari) { const c = el("div", "lp-pw-hk"); c.append(el("b", null, x.nama)); const n = x.butir.filter(b => b.lv >= 1);
    if (!n.length) c.append(el("small", null, "Semua jenis di tingkat Normal")); else for (const b of n) c.append(el("span", `lp-pred-chip lv${b.lv}`, `${b.label}: ${TINGKAT[b.lv]}`)); hari.append(c); }
  const titik = el("ol", "lp-pw-titik");
  for (const t of j.titik) { const li = el("li"), a = el("a", "lp-kedua"); a.href = `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}`; a.target = "_blank"; a.rel = "noopener"; a.append(ikon("i-arah"), "Arah");
    const tx = el("span"); tx.append(el("b", null, t.nama), el("small", null, `${t.jenis}, ${t.jarakKm.toLocaleString("id-ID")} km, ${t.sumber}`)); li.append(tx, a); titik.append(li); }
  isi.replaceChildren(el("h3", null, `Prakiraan ${j.kab || ""}`), hari, el("h3", null, "Titik berkumpul terdekat"),
    j.titik.length ? titik : el("p", "lp-redup", "Belum ada titik berkumpul tercatat dalam 5 km. Hubungi BPBD setempat atau telepon 112."), el("p", "lp-redup lp-kecil", j.catatan));
}

navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.pw === "langganan-berubah") tulis(null), gambar(); });
gambar();
// tombol hero Pasang aplikasi dan Peringatan dini menggulir ke kartunya (pemilik 25 Nov 2026)
for (const b of document.querySelectorAll("[data-ke-pw]")) b.addEventListener("click", () => {
  const k = document.querySelector(`#pwIsi ${b.dataset.kePw}`); if (!k) return;
  k.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  k.classList.remove("lp-pw-sorot"); void k.offsetWidth; k.classList.add("lp-pw-sorot");
});
