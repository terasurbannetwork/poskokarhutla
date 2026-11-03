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
  const PERAN = {verifikator: "Verifikator akun instansi", pusdalops: "Pusdalops", analis_konsesi: "Analis konsesi", udara: "Operasi udara", tmc: "TMC/OMC", koordalops: "Koordinator Pusdalops", pimpinan: "Pimpinan", kemitraan: "Kemitraan kampus", operator_cc: "Operator command center", direktori: "Direktori saja"};
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
  /* staf yang perannya HANYA operator_cc (command center) masuk ke peta utama "/", bukan Meja Pantau; ?ke= yang sah (pergiPipa) menang, peran lain tidak berubah */
  const pergiPeta = peran => { if (!Array.isArray(peran) || peran.length !== 1 || peran[0] !== "operator_cc") return false; location.href = "/"; return true; };
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
  function kartuButir(b) {
    const s = D.saya, milik = b.ditugaskan_ke?.id === s.id, tutup = b.status === "selesai" || b.status === "abaikan";
    const aksi = [];
    if (!s.baca_saja) {
      if (!tutup) {
        if (s.id && !milik) aksi.push(tombol("Ambil", {"data-aksi": "ambil"}, "utama"));
        aksi.push(tombol("Abaikan", {"data-aksi": "abaikan"}));
        if (s.koordinator) aksi.push(h("select", {class: "pt-pilih", "data-tugaskan": "1", "aria-label": "Tugaskan ke"}, h("option", {value: "", teks: "Tugaskan ke…"}), ...D.staf.map(x => h("option", {value: x.id, teks: x.nama, selected: b.ditugaskan_ke?.id === x.id}))));
        if (b.ditugaskan_ke && (milik || s.koordinator)) aksi.push(tombol("Lepas", {"data-aksi": "lepas"}));
      } else aksi.push(tombol("Buka lagi", {"data-aksi": "buka"}));
    }
    if (tautanKerja(b)) aksi.push(h("a", {class: "pt-btn", href: tautanKerja(b), teks: "Buka layar kerja"}));
    for (const t of b.tagih || []) aksi.push(h("a", {class: "pt-btn wa", href: t.tautan, target: "_blank", rel: "noopener noreferrer", title: t.untuk}, h("b", {teks: t.jenis === "wakil" ? "Tagih wakil" : "Tagih PIC"}), h("small", {teks: t.nama ?? t.untuk})));
    aksi.push(tombol("Riwayat", {"data-aksi": "riwayat"}));
    return h("li", {class: "pt-butir p" + b.prioritas + (tutup ? " tutup" : ""), "data-id": b.id},
      h("div", {class: "pt-baris"}, h("span", {class: "pt-pil p" + b.prioritas, teks: PRIO[b.prioritas]}), h("span", {class: "pt-pil " + b.status, teks: STATUS[b.status]}), b.dummy ? h("span", {class: "pt-pil dummy", teks: "DUMMY"}) : null,
        b.ditugaskan_ke ? h("span", {class: "pt-pil orang", teks: milik ? "Punya saya" : b.ditugaskan_ke.nama}) : h("span", {class: "pt-pil kosong", teks: "Belum ditugaskan"})),
      h("p", {class: "pt-judul", teks: wil.teks(b.judul)}),
      h("p", {class: "pt-meta", teks: [b.kab ? `${wil.kab(b.kab)}, ${b.prov_nama}` : b.prov_nama, `umur ${lama(b.umur)}`, b.tenggat ? (b.terlambat ? `lewat tenggat ${lama(Date.now() - b.tenggat)}` : `tenggat ${waktu(b.tenggat)}`) : null].filter(Boolean).join(", ")}),
      b.rincian ? h("p", {class: "pt-meta", teks: wil.teks(b.rincian)}) : null,
      b.status === "abaikan" && b.alasan ? h("p", {class: "pt-meta", teks: "Alasan diabaikan: " + b.alasan}) : (b.catatan ? h("p", {class: "pt-meta", teks: "Catatan: " + b.catatan}) : null),
      blokCc(b), h("div", {class: "pt-aksi"}, aksi), formAbaikan === b.id ? formAlasan(b) : null, formKoreksi === b.id && FINAL_CC.includes(b.cc?.status) ? formKoreksiCc(b) : null, buka.has(b.id) ? h("ol", {class: "pt-riwayat", "data-riwayat": "1"}, h("li", {teks: "Memuat riwayat…"})) : null);
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
    const info = h("p", {class: "pt-redup pt-catatan", teks: "Butir dihitung dari keadaan sebenarnya dan hilang sendiri saat keadaannya selesai (akun divalidasi, laporan terkirim, dan seterusnya). Karena itu tidak ada tombol Selesai: ambil, tugaskan, atau abaikan dengan alasan."});
    document.getElementById("ptDaftar")?.replaceChildren(info, ...(adaIsi ? [...kel].filter(([, x]) => x.length).map(([j, x]) => {
      const semua = F["lebih_" + j], tampil = semua ? x : x.slice(0, POTONG);
      return h("section", {class: "pt-kel", "aria-label": D.jenis[j]}, h("h3", null, D.jenis[j], h("span", {class: "pt-hitung", teks: angka(x.length)})),
        h("ul", {class: "pt-daftar"}, tampil.map(kartuButir)), x.length > tampil.length ? tombol(`Lihat semua ${angka(x.length)}`, {"data-lebih": j}) : null);
    }) : [h("p", {class: "pt-kosong", teks: D.butir.length ? "Tidak ada butir yang cocok dengan penyaring." : "Antrean kosong. Tidak ada pekerjaan yang menunggu untuk peran dan wilayah Anda."})]));
    for (const li of document.querySelectorAll("[data-riwayat]")) muatRiwayat(li);
  }
  /* kontrol urgent (cetak segera), daftar berat sesudah frame berikutnya; panggilan beruntun hanya menggambar yang terakhir */
  function tunda() { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambarDaftar, 0)); }
  function gambarKontrol() {
    const r = D.ringkas, s = D.saya, provs = [...new Map(D.butir.flatMap(b => b.provs.map(p => [p, wil.prov(p)]))).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const kt = (k, l, n, kls = "") => h("button", {class: "pt-kartu " + kls, type: "button", "data-kartu": k, "aria-pressed": String(k === "punyaku" ? F.punyaku : F.kartu === k)}, h("b", {teks: angka(n)}), h("span", {teks: l}));
    /* banner merah: laporan korban jiwa yang belum diverifikasi (butir prioritas 0, jenis korban_baru); hilang sendiri sesudah diverifikasi */
    const korban = D.butir.filter(b => b.jenis === "korban_baru" && (b.status === "baru" || b.status === "dikerjakan")).length;
    app.replaceChildren(korban ? h("div", {class: "pt-banner-korban", role: "alert"}, h("span", {teks: `${angka(korban)} laporan korban jiwa belum diverifikasi.`}), D.butir.some(b => b.jenis === "korban_baru" && b.tautan) ? h("a", {href: "/admin/korban", teks: "Buka laporan korban"}) : null) : null,
      h("p", {id: "ptPesan", class: "pt-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "pt-orang"}, h("span", {teks: `${s.nama}${s.admin ? " (admin)" : ""}, ${s.peran.map(p => PERAN[p] || p).join(", ")}`}), h("span", {class: "pt-redup", teks: s.wilayah.length ? `wilayah ${s.wilayah.length} provinsi` : "wilayah nasional"}),
        s.baca_saja ? h("span", {class: "pt-pil abaikan", teks: "Baca saja"}) : null, s.id ? tombol("Keluar", {"data-aksi": "keluar"}) : null),
      h("div", {class: "pt-ringkas"}, kt("", "Butir aktif", r.aktif), kt("terlambat", "Terlambat", r.terlambat, r.terlambat ? "merah" : ""), kt("belum", "Belum ditugaskan", r.belum_ditugaskan), s.id ? kt("punyaku", "Punya saya", r.punyaku) : null),
      h("div", {class: "pt-saring"},
        h("div", {class: "pt-chip-baris", role: "group", "aria-label": "Jenis"}, h("button", {class: "pt-chip", type: "button", "data-jenis": "", "aria-pressed": String(!F.jenis)}, "Semua jenis"),
          ...Object.entries(D.jenis).map(([j, l]) => h("button", {class: "pt-chip", type: "button", "data-jenis": j, "aria-pressed": String(F.jenis === j)}, l, h("b", {teks: String(r.per_jenis[j] ?? 0)})))),
        h("div", {class: "pt-baris"}, h("select", {id: "ptProv", "aria-label": "Wilayah"}, h("option", {value: "", teks: "Semua wilayah"}), ...provs.map(([k, n]) => h("option", {value: k, teks: n, selected: F.prov === k}))),
          s.id ? h("label", {class: "pt-cek"}, h("input", {type: "checkbox", "data-punyaku": "1", checked: F.punyaku}), "Punya saya") : null,
          h("label", {class: "pt-cek"}, h("input", {type: "checkbox", "data-semua": "1", checked: F.semua}), "Tampilkan selesai dan diabaikan"))),
      h("div", {id: "ptDaftar", class: "pt-isi"}, h("p", {class: "pt-redup", teks: "Menggambar daftar…"})),
      ...(s.super ? [panelStaf()] : []));
    tunda();
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
    const ch = t.closest("[data-jenis]"); if (ch) { F.jenis = ch.dataset.jenis; for (const c of app.querySelectorAll("[data-jenis]")) c.setAttribute("aria-pressed", String(c.dataset.jenis === F.jenis)); tunda(); return; }
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
