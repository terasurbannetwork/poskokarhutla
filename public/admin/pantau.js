/* Meja Pantau (/admin/pantau): antrean kerja harian staf BNPB. Data dari GET /api/pantau (dihitung server saat dibaca, disaring peran dan wilayah); aksi ke POST /api/pantau/butir.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat textContent. INP: kontrol (kartu ringkas, chip, tombol) berubah SEKETIKA, daftar berat digambar sesudah satu frame
   dan dipotong per kelompok (lihat semua). Tombol dummy (Super Admin) mengisi rantai hulu ke hilir lewat POST /api/pantau/dummy.
   Kartu api yang tugasnya alert command center (butir.cc dari server, src/pantau.js) menampilkan status tindak lanjut + pemegang, dan bagi penulis cc tombol transisinya: kiriman lewat POST /api/cc/aksi/:id (src/command_center.js).
   Gaya HANYA kelas Meja Pantau yang sudah ada (pantau.css); command_bersama.* tidak dimuat. */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul");
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const JAM = 36e5, HARI = 24 * JAM, POTONG = 12;
  const PERAN = {verifikator: "Verifikator akun instansi", pusdalops: "Pusdalops", analis_konsesi: "Analis konsesi", udara: "Operasi udara", tmc: "TMC/OMC", koordalops: "Koordinator Pusdalops", pimpinan: "Pimpinan", kemitraan: "Kemitraan kampus", operator_cc: "Operator command center", direktori: "Direktori saja", irtama: "Inspektorat Utama"};
  const STATUS = {baru: "Baru", dikerjakan: "Dikerjakan", selesai: "Selesai", abaikan: "Diabaikan"}, PRIO = {0: "Tertinggi", 1: "Segera", 2: "Penting", 3: "Biasa"};
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const lama = fmt.durasi;   // SATU formatter durasi semua layar (/inti/format.js): "12 menit", "6 jam 24 menit", "2 hari 3 jam"
  const wil = window.Wilayah;   // ejaan resmi kab/kota dan nama provinsi (/instansi_wilayah.js)
  /* deep link ke layar kerja: halaman + tab + butir sumber (#pantau/<tugas>, #validasi/<akun>, #kontak/<usulan>); id butir = jenis:sumber[:keadaan] */
  /* b.tautan null = server memutuskan pemanggil tidak boleh membuka halaman tujuannya (HALAMAN_STAF): tidak ada tautan, bukan tautan buntu */
  const tautanKerja = b => { if (!b.tautan) return null; const sumber = b.id.split(":")[1] ?? "", tab = b.jenis.startsWith("api_") ? "pantau" : b.jenis === "akun_menunggu" ? "validasi" : b.jenis === "usulan_kontak" ? "kontak" : "";
    return b.tautan + (tab && sumber ? `#${tab}/${sumber}` : ""); };
  /* status tindak lanjut command center (src/command_center.js STATUS): label dan kelas pil yang SUDAH ada di pantau.css (baru, dikerjakan, p1 merah, selesai hijau) */
  const CC = {baru: "Baru", dalam_konfirmasi: "Dalam konfirmasi", ada_api: "Ada api", tidak_ada_api: "Tidak ada api"}, PIL_CC = {baru: "baru", dalam_konfirmasi: "dikerjakan", ada_api: "p1", tidak_ada_api: "selesai"}, FINAL_CC = ["ada_api", "tidak_ada_api"];
  /* sebab kartu api bukan alert cc, dikirim server (butir.cc.sebab); sebab tak dikenal = kalimat netral, tidak menuduh level */
  const BUKAN_CC = {level: "Bukan alert level 3", umur: "Alert level 3 sudah lewat 7 hari", bencana: "Bukan alert karhutla"};
  /* jam saja bila ms jatuh di hari WIB yang sama dengan sekarang ("07.42"), selain itu "30 Okt 09.15": status yang dipegang berhari-hari (alert hidup 7 hari) tak boleh terbaca sebagai pagi ini.
     SALINAN logika jamTgl di public/admin/command_bersama.js (berkas itu tidak dimuat di sini; ubah di sana, ubah di sini) */
  const fJam = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}), fTgl = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short"});
  const hariWib = ms => Math.floor((ms + 7 * JAM) / HARI), jamWib = ms => fJam.format(ms).replace(":", ".");
  const jamTgl = ms => !Number.isFinite(ms) ? "" : hariWib(ms) === hariWib(Date.now()) ? jamWib(ms) : `${fTgl.format(ms)} ${jamWib(ms)}`;
  /* kata hubung waktu baku: "pukul 07.42" hanya untuk jam saja (hari ini WIB); bila tanggal ikut, "pada 30 Okt 09.15". Satu fungsi untuk kalimat pemegang dan pesan 409. Tidak finit = "". */
  const waktuKata = ms => !Number.isFinite(ms) ? "" : hariWib(ms) === hariWib(Date.now()) ? "pukul " + jamWib(ms) : "pada " + jamTgl(ms);
  const waktu = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "";
  /* ?ke= dari halaman SIPPA (/pipa*, ADR-05), Atur drone gambut (/admin/drone, src/drone.js), atau command center (/command-center*, src/command_center.js): sesudah masuk staf, hanya jalur yang cocok diikuti (alamat sama asal; URL penuh atau jalur lain diabaikan) */
  const KE_PIPA = /^\/(pipa|admin\/drone|command-center|direktori)(\/|$|\?)/;
  const keAsal = new URLSearchParams(location.search).get("ke") || "";
  const ke = KE_PIPA.test(keAsal) ? keAsal : null;
  const pergiPipa = () => { if (ke == null) return false; location.href = ke; return true; };
  /* kiriman lewat sesi staf wajib x-pb: 1 (rute menolak tanpa itu); balasan non-JSON tidak melempar */
  const kirim = async (url, body) => { try { const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {})}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}}; } };
  const tombol = (t, data, kls = "") => h("button", {class: "pt-btn " + kls, type: "button", ...data}, t);
  let D = null, F = {jenis: "", prov: "", punyaku: false, semua: false, kartu: ""}, buka = new Set(), pesanTeks = "", pesanOk = true, jadwal = 0, formAbaikan = null, formKoreksi = null, fokusKoreksi = null;
  /* catatan koreksi yang sedang diketik, per id butir: kartu dibangun ulang (Riwayat, penyaring, muat ulang sesudah aksi kartu lain) tanpa menghapusnya; fokus hanya diberikan sekali, saat form dibuka lewat klik Koreksi */
  const draf = new Map();
  /* menutup form kartu `id` (bawaan: yang sedang terbuka); form kartu LAIN yang sedang diketik tidak disentuh oleh aksi di kartu ini */
  const tutupKoreksi = (id = formKoreksi) => { if (id == null || id !== formKoreksi) return; draf.delete(id); formKoreksi = fokusKoreksi = null; };

  const pesan = (t, ok = true) => { pesanTeks = t || ""; pesanOk = ok; const p = document.getElementById("ptPesan"); if (p) { p.textContent = pesanTeks; p.className = "pt-pesan " + (ok ? "ok" : "galat"); } };

  /* ---------- masuk staf ---------- */
  function kartuMasuk(...isi) { app.replaceChildren(h("div", {class: "pt-masuk"}, ...isi)); }
  /* tertahan = {nama} dari 401 /api/pantau bila sesi sah tetapi sandi awal belum diganti (tanpa panggilan /saya tambahan) */
  /* satu pintu masuk (3 Nov 2026): form masuk staf dihapus; tanpa sesi -> /admin/masuk?ke=<halaman ini>. Sesi bersandi awal tetap mendapat layar ganti sandi. */
  function layarMasuk(galat, tertahan) {
    if (tertahan) return layarGanti(tertahan);
    location.href = "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.search);
  }
  function layarGanti(staf) {
    const kotak = h("div"), b = tombol("Buat sandi baru", {}, "utama");
    b.addEventListener("click", async () => { b.disabled = true; const r = await kirim("/api/staf/gantisandi", {});
      if (!r.ok) { b.disabled = false; kotak.replaceChildren(h("p", {class: "pt-pesan galat", teks: r.j.galat || `Gagal (${r.status})`})); return; }
      b.remove(); kotak.replaceChildren(h("p", {teks: "Sandi baru Anda, tampil sekali. Simpan sekarang, lalu lanjut."}), h("code", {class: "pt-rahasia", teks: r.j.sandi}), tombol("Lanjut", {}, "utama")); kotak.querySelector("button").addEventListener("click", () => pergiPipa() || muat()); });
    kartuMasuk(h("h2", {teks: `Halo ${staf.nama}`}), h("p", {teks: "Sandi awal diketahui admin. Buat sandi baru acak sebelum memakai Meja Pantau."}), b, kotak);
  }

  /* ---------- daftar butir ---------- */
  const lihat = () => D.butir.filter(b => (F.semua || b.status === "baru" || b.status === "dikerjakan") && (!F.jenis || b.jenis === F.jenis) && (!F.prov || b.provs.includes(F.prov))
    && (!F.punyaku || b.ditugaskan_ke?.id === D.saya.id) && (F.kartu !== "terlambat" || b.terlambat) && (F.kartu !== "belum" || !b.ditugaskan_ke));
  /* ikon garis 24x24 (CSP: dibangun lewat createElementNS) */
  const IKP = {ambil: "M12 5v14M5 12h14", abaikan: "M6 6l12 12M18 6L6 18", buka: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5", layar: "M14 4h6v6M20 4l-9 9|M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
    riwayat: "M12 7v5l3 2|M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8M3 3v5h5", lepas: "M16 11a4 4 0 1 0-8 0M3 21a9 9 0 0 1 18 0|M17 3l4 4M21 3l-4 4", wa: "M4 20l1.3-3.9A8 8 0 1 1 8 19.4z",
    api: "M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 1.5 1.5 2 2 2 0-3 0-5 1-7.5z", akun: "M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM4 21a8 8 0 0 1 16 0", kontak: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
    lapor: "M6 3h9l4 4v14H6z|M14 3v5h5M9 13h6M9 17h4", jam: "M12 7v5l3 2|M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", orang: "M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM4 21a8 8 0 0 1 16 0", daftar: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", awas: "M12 3l9 16H3z|M12 10v4M12 17v.5"};
  const NS = "http://www.w3.org/2000/svg";
  const ik = n => { const v = document.createElementNS(NS, "svg"); v.setAttribute("viewBox", "0 0 24 24"); v.setAttribute("aria-hidden", "true");
    for (const d of (IKP[n] || IKP.daftar).split("|")) { const q = document.createElementNS(NS, "path"); q.setAttribute("d", d); v.append(q); } return v; };
  const ikJenis = j => j.startsWith("api_") ? "api" : j.startsWith("akun") ? "akun" : /kontak|panggil|perusahaan/.test(j) ? "kontak" : /lapor|korban/.test(j) ? "lapor" : "daftar";
  const tIk = (n, label, data, kls = "") => h("button", {class: "pt-ik " + kls, type: "button", title: label, "aria-label": label, ...data}, ik(n));
  /* satu butir = satu <tbody data-id>: baris utama + baris tambahan (alasan abaikan, koreksi cc, riwayat) melebar penuh di bawahnya.
     Rombak 11 Nov 2026 (pemilik "terjelek sepanjang sejarah"): kartu tinggi empat kolom diganti tabel per jenis pola /operasi. */
  const KOLOM = 6;
  function kartuButir(b) {
    const s = D.saya, milik = b.ditugaskan_ke?.id === s.id, tutup = b.status === "selesai" || b.status === "abaikan";
    const aksi = [];
    if (!s.baca_saja) {
      if (!tutup) {
        if (s.id && !milik) aksi.push(tIk("ambil", "Ambil", {"data-aksi": "ambil"}, "utama"));
        aksi.push(tIk("abaikan", "Abaikan dengan alasan", {"data-aksi": "abaikan"}));
        if (b.ditugaskan_ke && (milik || s.koordinator)) aksi.push(tIk("lepas", "Lepas penugasan", {"data-aksi": "lepas"}));
      } else aksi.push(tIk("buka", "Buka lagi", {"data-aksi": "buka"}));
    }
    if (tautanKerja(b)) aksi.push(h("a", {class: "pt-ik", href: tautanKerja(b), title: "Buka layar kerja", "aria-label": "Buka layar kerja"}, ik("layar")));
    for (const t of b.tagih || []) aksi.push(h("a", {class: "pt-ik wa", href: t.tautan, target: "_blank", rel: "noopener noreferrer", title: `${t.jenis === "wakil" ? "Tagih wakil" : "Tagih PIC"}: ${t.nama ?? t.untuk}`, "aria-label": t.jenis === "wakil" ? "Tagih wakil" : "Tagih PIC"}, ik("wa")));
    aksi.push(tIk("riwayat", "Riwayat", {"data-aksi": "riwayat", "aria-pressed": String(buka.has(b.id))}));
    const pegang = s.koordinator && !s.baca_saja && !tutup
      ? h("select", {class: "pt-pilih", "data-tugaskan": "1", "aria-label": "Tugaskan ke"}, h("option", {value: "", teks: b.ditugaskan_ke ? "Lepas…" : "Tugaskan…"}), ...D.staf.map(x => h("option", {value: x.id, teks: x.nama, selected: b.ditugaskan_ke?.id === x.id})))
      : b.ditugaskan_ke ? h("span", {class: "pt-pil orang", teks: milik ? "Punya saya" : b.ditugaskan_ke.nama}) : h("span", {class: "pt-pil kosong", teks: "Belum ditugaskan"});
    const lokasi = b.kab ? wil.kab(b.kab) : (b.prov_nama || "Nasional");
    const waktuSel = b.tenggat ? (b.terlambat ? h("span", {class: "pt-pil p1", title: "tenggat " + waktu(b.tenggat), teks: "lewat " + lama(Date.now() - b.tenggat)}) : h("span", {class: "pt-pil dikerjakan", teks: waktu(b.tenggat)})) : h("span", {class: "pt-redup", teks: "–"});
    const cc = blokCc(b);
    const utama = h("tr", {class: "pt-tr p" + b.prioritas},
      h("td", {class: "pt-prio"}, h("span", {class: "pt-pil p" + b.prioritas, teks: PRIO[b.prioritas]}), b.status !== "baru" ? h("span", {class: "pt-pil " + b.status, teks: STATUS[b.status]}) : null),
      h("td", {class: "pt-lok"}, h("b", {teks: lokasi}), b.kab && b.prov_nama ? h("small", {teks: b.prov_nama}) : null),
      h("td", {class: "pt-isi-sel"}, h("p", {class: "pt-judul", title: wil.teks(b.judul), teks: wil.teks(b.judul).replace(b.tenggat ? /,\s*lewat .*$/ : /$^/, "")})   /* tenggat sudah di kolom sendiri: ekor "lewat ... dari batas" dibuang */, b.rincian ? h("small", {class: "pt-rinci", teks: wil.teks(b.rincian)}) : null,
        b.status === "abaikan" && b.alasan ? h("small", {class: "pt-rinci", teks: "Alasan diabaikan: " + b.alasan}) : (b.catatan ? h("small", {class: "pt-rinci", teks: "Catatan: " + b.catatan}) : null), ...[].concat(cc || [])),
      h("td", {class: "pt-waktu"}, waktuSel, h("small", {teks: "umur " + lama(b.umur)})),
      h("td", {class: "pt-pegang"}, pegang),
      h("td", null, h("div", {class: "pt-aksi"}, aksi)));
    const tambahan = [formAbaikan === b.id ? formAlasan(b) : null, formKoreksi === b.id && FINAL_CC.includes(b.cc?.status) ? formKoreksiCc(b) : null,
      buka.has(b.id) ? h("ol", {class: "pt-riwayat", "data-riwayat": "1"}, h("li", {teks: "Memuat riwayat…"})) : null].filter(Boolean)
      .map(x => h("tr", {class: "pt-tr-tambah"}, h("td", {colspan: String(KOLOM)}, x)));
    return h("tbody", {class: "pt-butir" + (tutup ? " tutup" : ""), "data-id": b.id}, utama, ...tambahan);
  }
  /* tindak lanjut command center pada kartu api (butir.cc dari server): pil status + pemegang untuk semua pembaca cc, tombol transisi hanya bila server memberi aksi (penulis cc: operator_cc, moderator).
     Tugas yang BUKAN alert (bukan level 3 / lewat 7 hari / bukan karhutla): keterangan hanya untuk operator_cc, peran lain tidak berubah. */
  function blokCc(b) {
    const c = b.cc; if (!c) return null;
    if (!c.alert) return !D.saya.admin && D.saya.peran.includes("operator_cc") ? h("p", {class: "pt-meta", teks: (BUKAN_CC[c.sebab] ?? "Bukan alert command center") + ": tidak ada tindak lanjut operator"}) : null;
    const final = FINAL_CC.includes(c.status), nama = c.oleh_nama ?? "operator", oleh = c.status === "baru" ? "Belum ada yang memegang" : final ? `Diputuskan ${nama} ${waktuKata(c.sejak)}` : `Dipegang ${nama} sejak ${jamTgl(c.sejak)}`;
    return [h("div", {class: "pt-baris", "data-cc": c.status}, h("span", {class: "pt-meta", teks: "Tindak lanjut command center"}), h("span", {class: "pt-pil " + PIL_CC[c.status], teks: CC[c.status]}), h("span", {class: "pt-meta", teks: oleh})),
      c.aksi.length ? h("div", {class: "pt-aksi"}, c.aksi.map(ke => tombol(final ? "Koreksi" : CC[ke], {"data-cc-ke": ke}, c.status === "baru" ? "utama" : ""))) : null];
  }
  /* koreksi keputusan: catatan wajib (3 sampai 300 huruf, sama dengan server), input kecil di dalam kartu seperti alasan abaikan; Enter = simpan, Escape = batal */
  function formKoreksiCc(b) {
    const i = h("input", {id: "ptKoreksi", name: "catatan", maxlength: "300", autocomplete: "off", placeholder: "Catatan koreksi (wajib, minimal 3 huruf)", "aria-label": "Catatan koreksi keputusan command center"});
    i.value = draf.get(b.id) ?? "";
    const f = h("form", {class: "pt-alasan", "data-koreksi-form": b.id}, i, h("p", {class: "pt-pesan galat", role: "alert", "data-koreksi-galat": "1"}), h("div", {class: "pt-aksi"}, tombol("Simpan koreksi", {type: "submit"}, "utama"), tombol("Batal", {"data-cc-batal": "1"})));
    if (fokusKoreksi === b.id) { fokusKoreksi = null; queueMicrotask(() => i.focus()); }
    return f;
  }
  /* alasan abaikan: form di dalam kartu (bukan dialog bawaan peramban); Enter = simpan, Escape = batal */
  function formAlasan(b) {
    const i = h("input", {id: "ptAlasan", name: "alasan", maxlength: "300", autocomplete: "off", placeholder: "Alasan mengabaikan (wajib, minimal 3 huruf)", "aria-label": "Alasan mengabaikan butir ini"});
    const f = h("form", {class: "pt-alasan", "data-alasan-form": b.id}, i, h("p", {class: "pt-pesan galat", role: "alert", "data-alasan-galat": "1"}), h("div", {class: "pt-aksi"}, tombol("Simpan alasan", {type: "submit"}, "utama"), tombol("Batal", {"data-aksi": "batal-abaikan"})));
    queueMicrotask(() => i.focus());
    return f;
  }
  function gambarDaftar() {
    const isi = lihat(), kel = new Map(Object.keys(D.jenis).map(j => [j, []]));
    for (const b of isi) kel.get(b.jenis)?.push(b);
    const adaIsi = [...kel.values()].some(x => x.length);
    const kepala = () => h("thead", null, h("tr", null, ...["Prioritas", "Lokasi", "Butir", "Tenggat", "Dipegang", "Aksi"].map(t => h("th", {scope: "col", teks: t}))));
    document.getElementById("ptDaftar")?.replaceChildren(...(adaIsi ? [...kel].filter(([, x]) => x.length).map(([j, x]) => {
      const semua = F["lebih_" + j], tampil = semua ? x : x.slice(0, POTONG), telat = x.filter(b => b.terlambat).length;
      const t = h("table", {class: "ad-tabel pt-tabel2"}, kepala(), ...tampil.map(kartuButir));
      return h("section", {class: "ex ex-std pt-kel", id: "pt-" + j, "aria-label": D.jenis[j]},
        h("header", {class: "ex-hd"}, h("span", {class: "ex-ey", hidden: true, teks: "Meja Pantau"}),
          h("div", {class: "ex-jd"}, h("h3", null, ik(ikJenis(j)), D.jenis[j]), h("span", {class: "pt-hitung", teks: angka(x.length)}), telat ? h("span", {class: "pt-pil p1", teks: `${angka(telat)} terlambat`}) : null)),
        h("div", {class: "ex-bd"}, h("div", {class: "ad-tabel-wadah pt-wadah"}, t),
          x.length > tampil.length ? h("div", {class: "pt-lebih"}, tombol(`Lihat semua ${angka(x.length)}`, {"data-lebih": j})) : null));
    }) : [h("p", {class: "pt-kosong", teks: D.butir.length ? "Tidak ada butir yang cocok dengan penyaring." : "Antrean kosong. Tidak ada pekerjaan yang menunggu untuk peran dan wilayah Anda."})]));
    for (const li of document.querySelectorAll("[data-riwayat]")) muatRiwayat(li);
  }
  /* kontrol urgent (cetak segera), daftar berat sesudah frame berikutnya; panggilan beruntun hanya menggambar yang terakhir */
  function tunda() { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambarDaftar, 0)); }
  function gambarKontrol() {
    const r = D.ringkas, s = D.saya, provs = [...new Map(D.butir.flatMap(b => b.provs.map(p => [p, wil.prov(p)]))).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    /* ubin ringkas = penyaring (rujukan /operasi): ikon navy, label, angka; ditekan = tepi navy */
    const kt = (k, l, n, ikn, kls = "") => h("button", {class: "db-ubin pt-ubin " + kls, type: "button", "data-kartu": k, "aria-pressed": String(k === "punyaku" ? F.punyaku : F.kartu === k)},
      h("header", null, h("i", null, ik(ikn)), h("span", {teks: l})), h("b", {teks: angka(n)}));
    const korban = D.butir.filter(b => b.jenis === "korban_baru" && (b.status === "baru" || b.status === "dikerjakan")).length;
    app.replaceChildren(korban ? h("div", {class: "pt-banner-korban", role: "alert"}, h("span", {teks: `${angka(korban)} laporan korban jiwa belum diverifikasi.`}), D.butir.some(b => b.jenis === "korban_baru" && b.tautan) ? h("a", {href: "/admin/korban", teks: "Buka laporan korban"}) : null) : null,
      h("p", {id: "ptPesan", class: "pt-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "db-ubin-grid pt-ringkas " + (s.id ? "k4" : "")}, kt("", "Butir aktif", r.aktif, "daftar"), kt("terlambat", "Terlambat", r.terlambat, "jam", r.terlambat ? "merah" : ""), kt("belum", "Belum ditugaskan", r.belum_ditugaskan, "orang", r.belum_ditugaskan ? "oranye" : ""), s.id ? kt("punyaku", "Punya saya", r.punyaku, "ambil") : null),
      h("div", {class: "pt-alat"},
        h("label", {class: "pt-wil"}, ik("pin"), h("select", {id: "ptProv", "aria-label": "Wilayah"}, h("option", {value: "", teks: "Semua wilayah"}), ...provs.map(([k, n]) => h("option", {value: k, teks: n, selected: F.prov === k})))),
        s.id ? h("label", {class: "pt-cek"}, h("input", {type: "checkbox", "data-punyaku": "1", checked: F.punyaku}), "Punya saya") : null,
        h("label", {class: "pt-cek"}, h("input", {type: "checkbox", "data-semua": "1", checked: F.semua}), "Tampilkan selesai dan diabaikan"),
        h("span", {class: "pt-siapa", title: "Butir dihitung dari keadaan sebenarnya dan hilang sendiri saat keadaannya selesai; tidak ada tombol Selesai: ambil, tugaskan, atau abaikan dengan alasan."},
          ik("orang"), `${s.nama}${s.admin ? " (admin)" : ""}`, h("small", {teks: s.wilayah.length ? `${s.wilayah.length} provinsi` : "nasional"}), s.baca_saja ? h("span", {class: "pt-pil abaikan", teks: "Baca saja"}) : null)),
      h("div", {id: "ptDaftar", class: "pt-isi"}, h("p", {class: "pt-redup", teks: "Menggambar daftar…"})),
      ...(s.super ? [panelStaf()] : []));
    jenisKiri();
    tunda();
  }
  /* jenis butir di panel kiri Pusdalops (slot halaman), berlencana jumlah; klik = saring jenis. Tanpa panel kiri (layar sempit): deretan pil lama. */
  function jenisKiri() {
    const M = window.MenuPusdalops, slot = M?.pakaiSlot?.(), r = D.ringkas;
    const pil = (j, l, n) => { const b = h("button", {class: slot ? "db-nav-b" : "pt-chip", type: "button", "data-jenis": j, "aria-current": String(F.jenis === j), "aria-pressed": String(F.jenis === j)},
      slot ? h("i", {class: "db-nav-ik"}, ik(j ? ikJenis(j) : "daftar")) : null, h("span", {class: slot ? "db-nav-t" : null, teks: l}), n != null ? h("b", {class: slot ? "db-nav-n" : null, teks: angka(n)}) : null); return b; };
    const daftar = [pil("", "Semua jenis", r.aktif), ...Object.entries(D.jenis).filter(([j]) => (r.per_jenis[j] ?? 0) > 0 || F.jenis === j).map(([j, l]) => pil(j, l, r.per_jenis[j] ?? 0))];
    if (slot) { slot.replaceChildren(M.grup("Jenis butir", "daftar"), ...daftar); return; }
    app.querySelector(".pt-alat")?.before(h("div", {class: "pt-chip-baris", role: "group", "aria-label": "Jenis"}, ...daftar));
  }
  /* ---------- Super Admin: akun staf dikelola di /admin/akun ---------- */
  const panelStaf = () => h("a", {class: "pt-btn", href: "/admin/akun", teks: "👥 Kelola akun staf dan aksesnya"});

  /* ---------- riwayat satu butir ---------- */
  async function muatRiwayat(ol) {
    const id = ol.closest("[data-id]").dataset.id, r = await fetch("/api/pantau/jejak?id=" + encodeURIComponent(id)).then(x => x.ok ? x.json() : null).catch(() => null);
    ol.replaceChildren(...(r?.jejak?.length ? r.jejak.map(j => h("li", {teks: `${waktu(j.waktu)}, ${j.oleh_nama}: ${j.cc ? `${j.aksi} ${CC[j.cc.dari] ?? j.cc.dari} → ${CC[j.cc.ke] ?? j.cc.ke}` : j.aksi}${j.ke_nama ? " ke " + j.ke_nama : ""}${j.catatan ? ", " + j.catatan : ""}`})) : [h("li", {teks: r ? "Belum ada riwayat." : "Riwayat gagal dimuat."})]));
  }

  /* ---------- muat dan aksi ---------- */
  async function muat() {
    const r = await fetch("/api/pantau").catch(() => null);
    if (!r) { app.replaceChildren(h("p", {class: "pt-kosong", teks: "Jaringan putus. Muat ulang halaman."})); return; }
    if (r.status === 401) { const j = await r.json().catch(() => ({})); if (j.ke === "/direktori") { location.href = j.ke; return; } return layarMasuk("", j.wajib_ganti); }   // akun berperan Direktori saja
    if (r.status === 503) { app.replaceChildren(h("p", {class: "pt-kosong", teks: "Meja Pantau belum diaktifkan (migrasi D1 0030_staf belum diterapkan)."})); return; }
    if (!r.ok) { app.addEventListener("click", e => { if (e.target.closest("[data-ulang]")) location.reload(); }, {once: true}); app.replaceChildren(h("div", {class: "pt-galat"}, h("p", {teks: `Galat ${r.status}. Data belum bisa dimuat.`}), tombol("Coba lagi", {"data-ulang": "1"}, "utama"))); return; }
    D = await r.json(); if (formKoreksi && !FINAL_CC.includes(D.butir.find(b => b.id === formKoreksi)?.cc?.status)) tutupKoreksi(); gambarKontrol(); pasangDummy();
  }
  app.addEventListener("click", async e => {
    const t = e.target;
    const kt = t.closest("[data-kartu]");
    if (kt) { const k = kt.dataset.kartu;
      if (k === "punyaku") { F.punyaku = !F.punyaku; const c = app.querySelector("[data-punyaku]"); if (c) c.checked = F.punyaku; } else F.kartu = F.kartu === k ? "" : k;
      for (const x of app.querySelectorAll("[data-kartu]")) x.setAttribute("aria-pressed", String(x.dataset.kartu === "punyaku" ? F.punyaku : x.dataset.kartu === F.kartu));
      tunda(); return; }
    const ch = t.closest("[data-jenis]"); if (ch) return pilihJenis(ch);
    const le = t.closest("[data-lebih]"); if (le) { F["lebih_" + le.dataset.lebih] = true; tunda(); return; }
    const cb = t.closest("[data-cc-batal]"); if (cb) { const id = cb.closest("[data-id]").dataset.id; tutupKoreksi(id); return gantiKartu(id); }
    const ck = t.closest("[data-cc-ke]"); if (ck) { if (!ck.disabled) klikCc(ck); return; }
    const b = t.closest("[data-aksi]"); if (!b || b.disabled) return;
    const a = b.dataset.aksi, li = b.closest("[data-id]"), id = li?.dataset.id;
    if (a === "keluar") { await kirim("/api/staf/keluar", {}); return location.reload(); }
    if (a === "riwayat") { buka.has(id) ? buka.delete(id) : buka.add(id); li.replaceWith(kartuButir(D.butir.find(x => x.id === id))); const ol = document.querySelector(`[data-id="${CSS.escape(id)}"] [data-riwayat]`); if (ol) muatRiwayat(ol); return; }
    if (a === "abaikan" || a === "batal-abaikan") { formAbaikan = a === "abaikan" ? id : null; const tt = D.butir.find(x => x.id === id); if (tt) li.replaceWith(kartuButir(tt)); const ol = document.querySelector(`[data-id="${CSS.escape(id)}"] [data-riwayat]`); if (ol) muatRiwayat(ol); return; }
    await aksiButir(b, {id, aksi: a});
  });
  function pilihJenis(ch) { F.jenis = ch.dataset.jenis; for (const c of document.querySelectorAll("[data-jenis]")) { c.setAttribute("aria-pressed", String(c.dataset.jenis === F.jenis)); c.setAttribute("aria-current", String(c.dataset.jenis === F.jenis)); } tunda(); }
  document.addEventListener("click", e => { const ch = e.target.closest?.(".mp-slot [data-jenis]"); if (ch) pilihJenis(ch); });
  async function aksiButir(b, o) {
    b.disabled = true; const r = await kirim("/api/pantau/butir", o); b.disabled = false;
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.status})`, false); if (r.status === 404) muat(); return false; }
    formAbaikan = null; pesan("Tersimpan."); const t0 = pesanTeks; await muat(); pesan(t0, true); return true;
  }
  /* kartu diganti di tempat (tanpa muat ulang): riwayat yang terbuka dimuat lagi */
  function gantiKartu(id) {
    const x = D.butir.find(k => k.id === id), li = document.querySelector(`[data-id="${CSS.escape(id)}"]`); if (!x || !li) return;
    li.replaceWith(kartuButir(x)); const ol = document.querySelector(`[data-id="${CSS.escape(id)}"] [data-riwayat]`); if (ol) muatRiwayat(ol);
  }
  /* form koreksi satu kartu saja: kartu yang tadinya terbuka ditutup (drafnya dibuang), yang baru difokuskan sekali */
  function bukaKoreksi(id) { const lama = formKoreksi; if (lama && lama !== id) draf.delete(lama); formKoreksi = fokusKoreksi = id; gantiKartu(id); if (lama && lama !== id) gantiKartu(lama); }
  /* tombol transisi cc: keputusan final -> "Koreksi" membuka input catatan wajib dulu; selain itu langsung dikirim */
  function klikCc(btn) {
    const x = D.butir.find(k => k.id === btn.closest("[data-id]").dataset.id); if (!x?.cc?.alert) return;
    if (FINAL_CC.includes(x.cc.status)) return bukaKoreksi(x.id);
    return kirimCc(btn, x, btn.dataset.ccKe, null);
  }
  /* POST /api/cc/aksi/:id {dari, ke, catatan} (rute command center yang sama dengan meja operator; compare-and-set). 409 = rekan lebih dulu: pesan singkat + muat ulang; sukses = muat ulang Meja Pantau */
  async function kirimCc(btn, x, ke, catatan) {
    btn.disabled = true; const r = await kirim("/api/cc/aksi/" + encodeURIComponent(x.cc.tugas), {dari: x.cc.status, ke, ...(catatan ? {catatan} : {})}); btn.disabled = false;
    if (r.status === 409) { tutupKoreksi(x.id); pesan(["Sudah diubah oleh", r.j.oleh_nama ?? "operator lain", waktuKata(r.j.sejak), `menjadi "${CC[r.j.status] ?? "status lain"}"; kartu dimuat ulang.`].filter(Boolean).join(" "), false); await muat(); return; }
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.status})`, false); if (r.status === 404) muat(); return; }
    tutupKoreksi(x.id); pesan("Tindak lanjut tersimpan."); await muat();
  }
  app.addEventListener("submit", e => {
    const k = e.target.closest("[data-koreksi-form]");
    if (k) { e.preventDefault(); const catatan = k.elements.catatan.value.trim(), x = D.butir.find(b => b.id === k.dataset.koreksiForm);
      if (catatan.length < 3) { k.querySelector("[data-koreksi-galat]").textContent = "Tulis catatan koreksi minimal 3 huruf."; k.elements.catatan.focus(); return; }
      if (x?.cc?.alert) kirimCc(k.querySelector("button[type=submit]"), x, "dalam_konfirmasi", catatan); return; }
    const f = e.target.closest("[data-alasan-form]"); if (!f) return; e.preventDefault();
    const alasan = f.elements.alasan.value.trim(), g = f.querySelector("[data-alasan-galat]");
    if (alasan.length < 3) { g.textContent = "Tulis alasan minimal 3 huruf."; f.elements.alasan.focus(); return; }
    aksiButir(f.querySelector("button[type=submit]"), {id: f.dataset.alasanForm, aksi: "abaikan", alasan});
  });
  app.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (e.target.closest?.("[data-alasan-form]")) { formAbaikan = null; gambarDaftar(); } else if (e.target.closest?.("[data-koreksi-form]")) { tutupKoreksi(e.target.closest("[data-koreksi-form]").dataset.koreksiForm); gambarDaftar(); } });
  app.addEventListener("input", e => { const k = e.target.closest?.("[data-koreksi-form]"); if (k) draf.set(k.dataset.koreksiForm, e.target.value); });
  app.addEventListener("change", async e => {
    const t = e.target;
    if (t.id === "ptProv") { F.prov = t.value; tunda(); return; }
    if (t.dataset.punyaku) { F.punyaku = t.checked; app.querySelector('[data-kartu="punyaku"]')?.setAttribute("aria-pressed", String(F.punyaku)); tunda(); return; }
    if (t.dataset.semua) { F.semua = t.checked; tunda(); return; }
    if (t.dataset.tugaskan) { const id = t.closest("[data-id]").dataset.id, r = await kirim("/api/pantau/butir", {id, aksi: "tugaskan", ke: t.value});
      if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false); await muat(); pesan("Penugasan tersimpan."); }
  });

  /* dummy: Super Admin saja, dua ikon (DUMMY.md). Tombol dipasang setelah /api/pantau tahu siapa pemanggil. */
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy Meja Pantau (staf contoh, penugasan, dan sumbernya di Instansi dan Posko)? Data asli tidak tersentuh.")) return;
    const r = await kirim("/api/pantau/dummy", {aksi: d.dataset.dummy});
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    pesan(d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.staf} staf contoh, ${r.j.butir} butir, ${r.j.penugasan} penugasan.` : `Dummy dihapus: ${r.j.staf} staf, ${r.j.penugasan} penugasan.`); const t0 = pesanTeks; await muat(); pesan(t0, true);
  });
  function pasangDummy() { Admin.pasangDummy(aksiJudul, !!D?.saya.super); }
  muat();
})();
