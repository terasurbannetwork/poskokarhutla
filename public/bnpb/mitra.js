/* Halaman mitra riset (/riset/mitra), berkode pribadi tanpa akun. Kode datang di fragmen #k= (tidak masuk log server), dipindah ke sessionStorage lalu fragmen dihapus.
   Semua teks dari server masuk lewat textContent; tautan hanya http/https dengan rel="noopener noreferrer". Data dari /api/riset/mitra/*. */
(() => {
  const NS = "http://www.w3.org/2000/svg", app = document.getElementById("app"), KUNCI = "riset_kode";
  const IKON = {
    topi: "M2 9l10-5 10 5-10 5z|M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5", jam: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 7v5l3 2", centang: "M5 12l5 5 9-10", dokumen: "M7 3h7l5 5v13H7z|M14 3v5h5|M10 13h6|M10 17h6",
    api: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z", tambah: "M12 5v14|M5 12h14", tutup: "M6 6l12 12|M18 6L6 18", kirim: "M4 12l16-8-6 16-3-7z", unduh: "M12 3v12|M7 11l5 5 5-5|M5 21h14",
    kunci: "M6 11h12v9H6z|M8 11V8a4 4 0 0 1 8 0v3", bendera: "M5 21V4|M5 4h11l-2 4 2 4H5", silang: "M6 6l12 12|M18 6L6 18", edit: "M4 20h4L19 9l-4-4L4 16z", buka: "M14 4h6v6|M20 4l-9 9|M18 14v6H4V6h6",
  };
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak) if (a != null) e.append(a); return e; };
  const pil = (ikon, teks, warna) => h("span", {class: "bn-pil" + (warna ? " rs-" + warna : "")}, svg(ikon), teks);
  const wkt = ms => ms ? new Date(ms).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : "";
  const tgl = s => s ? new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : "";
  const STATUS = {diajukan: ["kirim", "Diajukan", "abu"], ditelaah: ["jam", "Ditelaah", "biru"], revisi: ["edit", "Perlu revisi", "kuning"], disetujui: ["centang", "Disetujui", "hijau"], ditolak: ["silang", "Ditolak", "merah"],
    berjalan: ["jam", "Berjalan", "biru"], laporan_akhir: ["dokumen", "Laporan akhir", "ungu"], selesai: ["centang", "Selesai", "hijau"]};
  const LANGKAH = ["diajukan", "ditelaah", "disetujui", "berjalan", "laporan_akhir", "selesai"];
  const JENIS = {artikel: "Artikel", dataset: "Dataset", model: "Model", policy_brief: "Policy brief", prototipe: "Prototipe"};
  const PERMINTAAN = {diminta: ["jam", "Menunggu", "kuning"], disetujui: ["centang", "Disetujui", "hijau"], ditolak: ["silang", "Ditolak", "merah"]};
  const PKS = {berlaku: ["centang", "PKS berlaku", "hijau"], hampir: ["jam", "PKS hampir habis", "kuning"], kedaluwarsa: ["silang", "PKS kedaluwarsa", "merah"], tanpa: ["jam", "PKS belum dicatat", "abu"]};
  let D = null, dlg = null;

  /* tautan hanya http/https (atau alamat dalam situs untuk jalur data); selainnya tampil sebagai teks biasa */
  const tautan = (url, teks, dalam) => (/^https?:\/\//i.test(url || "") || (dalam && /^\/(?!\/)/.test(url || ""))) ? h("a", {href: url, target: "_blank", rel: "noopener noreferrer"}, teks || url) : document.createTextNode(teks || url || "");

  async function api(metode, jalur, body) {
    const kode = sessionStorage.getItem(KUNCI) || "";
    const r = await fetch(jalur, {method: metode, headers: {"x-kode": kode, ...(body ? {"content-type": "application/json"} : {})}, body: body ? JSON.stringify(body) : undefined});
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) { sessionStorage.removeItem(KUNCI); formKode("Kode tidak berlaku (salah atau sudah dicabut). Minta tautan baru dari admin."); throw new Error("kode"); }
    return {ok: r.ok, status: r.status, j};
  }
  const pesanDi = (el, teks, ok) => { el.textContent = teks; el.className = "bn-pesan " + (ok ? "ok" : "galat"); };

  /* ---- masuk ---- */
  function formKode(galat) {
    const inp = h("input", {type: "password", autocomplete: "off", spellcheck: "false", maxlength: "26", required: true, placeholder: "26 karakter"}), pesan = h("p", {class: "bn-pesan galat", role: "status", teks: galat || ""});
    const f = h("form", {class: "bn-kartu mt-masuk"}, h("h2", null, svg("kunci"), "Kode mitra"), h("label", {class: "bn-isian"}, "Tempel kode dari admin", inp), pesan, h("button", {class: "bn-tombol", type: "submit", teks: "Masuk"}));
    f.addEventListener("submit", e => { e.preventDefault(); sessionStorage.setItem(KUNCI, inp.value.trim().toLowerCase()); muat(); });
    app.replaceChildren(f);
  }

  async function muat(bukaId) {
    let r; try { r = await api("GET", "/api/riset/mitra/saya"); } catch (e) { if (e.message === "kode") return; app.replaceChildren(h("p", {class: "rs-kosong", teks: "Gagal memuat. Coba lagi."})); return; }
    if (!r.ok) { app.replaceChildren(h("p", {class: "rs-kosong", teks: r.status === 503 ? "Fitur riset belum diaktifkan." : r.status === 429 ? "Terlalu banyak percobaan. Coba lagi nanti." : "Gagal memuat (" + r.status + ")."})); return; }
    D = r.j; utama(); if (bukaId) { const u = D.usulan.find(x => x.id === bukaId); if (u) detail(u); }
  }

  /* ---- halaman utama ---- */
  function tabel(kolom, baris, kosong) {
    return baris.length ? h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", null, h("tr", null, ...kolom.map(k => h("th", {teks: k})))), h("tbody", null, ...baris))) : h("p", {class: "rs-kosong", teks: kosong});
  }
  function utama() {
    const m = D.mitra, p = PKS[m.pks.s], namaData = Object.fromEntries(D.katalog.map(k => [k.id, k.nama]));
    const kep = h("div", {class: "bn-kartu"}, h("div", {class: "mt-kepala"}, h("h2", null, svg("topi"), m.institusi), m.unit ? pil("dokumen", m.unit, "abu") : null, pil(p[0], p[1] + (m.pks_sampai ? " s/d " + tgl(m.pks_sampai) : ""), p[2]),
      h("span", {class: "bn-aksi"}, h("button", {class: "bn-tombol", type: "button", id: "baru"}, svg("tambah"), "Ajukan usulan"), " ", h("button", {class: "bn-tombol sekunder", type: "button", id: "minta"}, svg("unduh"), "Minta data"))));
    const usulan = tabel(["Riset", "Status", "Jadwal", "Nomor PKS", ""], D.usulan.map(u => { const s = STATUS[u.status];
      return h("tr", null, h("td", {"data-label": "Riset", class: "rs-judul"}, h("b", {teks: u.judul}), h("span", {class: "rs-redup", teks: u.wilayah})), h("td", {"data-label": "Status"}, pil(s[0], s[1], s[2])),
        h("td", {"data-label": "Jadwal"}, tgl(u.mulai) + "–" + tgl(u.selesai)), h("td", {"data-label": "Nomor PKS"}, u.nomor_pks || "–"),
        h("td", {class: "a"}, h("button", {class: "ad-tombol kecil", type: "button", "data-u": u.id}, svg("buka"), "Buka"))); }), "Kamu belum punya usulan.");
    const minta = tabel(["Data", "Tujuan", "Status", "Jalur", "Diminta"], D.permintaan.map(q => { const s = PERMINTAAN[q.status];
      return h("tr", null, h("td", {"data-label": "Data", class: "rs-judul"}, h("b", {teks: namaData[q.dataset] || q.dataset})), h("td", {"data-label": "Tujuan"}, q.tujuan, q.catatan ? h("span", {class: "rs-redup", teks: q.catatan}) : null),
        h("td", {"data-label": "Status"}, pil(s[0], s[1], s[2])), h("td", {"data-label": "Jalur"}, q.jalur ? tautan(q.jalur, "Buka data", true) : "–"), h("td", {"data-label": "Diminta"}, wkt(q.dibuat))); }), "Belum ada permintaan data.");
    const pecah = (j, t) => h("section", {class: "mt-blok"}, h("h2", {class: "mt-kepala", teks: j}), t);
    app.replaceChildren(kep, pecah("Usulan riset", usulan), pecah("Permintaan data", minta));
    app.querySelector("#baru").onclick = () => dialogUsulan(null);
    app.querySelector("#minta").onclick = dialogMinta;
    app.querySelector(".mt-blok").addEventListener("click", e => { const b = e.target.closest("[data-u]"); if (b) detail(D.usulan.find(u => u.id === b.dataset.u)); });
  }

  /* ---- dialog lebar ---- */
  function buka(judul, ...isi) {
    dlg?.remove(); const tutup = h("button", {class: "ad-tombol ad-bulat", type: "button", "aria-label": "Tutup"}, svg("tutup"));
    dlg = h("dialog", {class: "mt-dlg"}, h("div", {class: "mt-dlg-isi"}, h("div", {class: "mt-dlg-kepala"}, h("h2", {teks: judul}), tutup), ...isi));
    tutup.onclick = () => dlg.close(); dlg.addEventListener("close", () => dlg.remove()); dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg); dlg.showModal(); return dlg;
  }
  const isian = (label, el) => h("label", {class: "bn-isian"}, label, el);
  const teksIsian = (nama, nilai, maks, min) => h("input", {name: nama, value: nilai ?? "", maxlength: maks, minlength: min, required: !!min});
  const area = (nama, nilai, maks, min) => h("textarea", {name: nama, maxlength: maks, minlength: min, required: !!min}, nilai ?? "");
  const pilihOpsi = (nama, opsi, nilai, kosong) => h("select", {name: nama}, ...(kosong ? [h("option", {value: "", teks: kosong})] : []), ...opsi.map(([v, t]) => h("option", {value: v, selected: v === nilai, teks: t})));

  function dialogUsulan(awal) {
    const pesan = h("p", {class: "bn-pesan", role: "status"}), f = h("form", {class: "mt-form", autocomplete: "off"});
    const pilihData = h("div", {class: "bn-pilihan", role: "group", "aria-label": "Data yang dibutuhkan"}, ...D.katalog.map(k => h("label", null, h("input", {type: "checkbox", name: "data_butuh", value: k.id, checked: !!awal?.data_butuh.includes(k.id)}), k.nama)));
    f.append(isian("Judul riset", teksIsian("judul", awal?.judul, 200, 5)), h("div", {class: "bn-baris"}, isian("Ketua peneliti", teksIsian("ketua", awal?.ketua, 100, 2)), isian("Anggota", teksIsian("anggota", awal?.anggota, 400))),
      h("div", {class: "bn-baris"}, isian("Agenda BNPB (opsional)", pilihOpsi("agenda_id", D.agenda.map(a => [a.id, a.judul]), awal?.agenda_id, "Tanpa agenda")), isian("Bencana", pilihOpsi("bencana", [...Object.entries(D.bencana), ["lintas", "Lintas bencana"]].filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i), awal?.bencana || "karhutla")),
        isian("Wilayah", teksIsian("wilayah", awal?.wilayah, 120, 2))), isian("Metode ringkas", area("metode", awal?.metode, 800, 10)), h("div", {class: "bn-isian"}, "Data yang dibutuhkan", pilihData),
      h("div", {class: "bn-baris"}, isian("Mulai", h("input", {type: "date", name: "mulai", value: awal?.mulai || "", required: true})), isian("Selesai", h("input", {type: "date", name: "selesai", value: awal?.selesai || "", required: true}))),
      isian("Luaran yang direncanakan", area("luaran_rencana", awal?.luaran_rencana, 400, 3)), pesan, h("div", {class: "mt-aksi"}, h("button", {class: "bn-tombol", type: "submit"}, svg("kirim"), awal ? "Kirim ulang revisi" : "Ajukan")));
    f.addEventListener("submit", async e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)), b = {...v, data_butuh: [...f.querySelectorAll('[name="data_butuh"]:checked')].map(i => i.value), agenda_id: v.agenda_id || undefined, anggota: v.anggota || undefined};
      const tombol = f.querySelector("button[type=submit]"); tombol.disabled = true;
      try { const r = await api("POST", awal ? "/api/riset/mitra/usulan/" + awal.id : "/api/riset/mitra/usulan", b); tombol.disabled = false;
        if (!r.ok) return pesanDi(pesan, r.j.galat || "Gagal (" + r.status + ")", false);
        dlg.close(); muat(r.j.id || awal.id); } catch (x) { tombol.disabled = false; }
    });
    buka(awal ? "Revisi usulan" : "Ajukan usulan riset", f);
  }

  function dialogMinta() {
    const pesan = h("p", {class: "bn-pesan", role: "status"}), petunjuk = h("p", {class: "rs-redup"}), f = h("form", {class: "mt-form"});
    const sel = pilihOpsi("dataset", D.katalog.map(k => [k.id, k.nama + " (" + k.format + ")"]), D.katalog[0].id);
    const tampil = () => { const k = D.katalog.find(x => x.id === sel.value); petunjuk.replaceChildren(...(k.jalur ? ["Data ini terbuka: ", tautan(k.jalur, "unduh langsung", true), ". Permintaan tetap dicatat sebagai bukti pemakaian."] : ["Data ini disiapkan admin sesudah permintaan disetujui."])); };
    sel.addEventListener("change", tampil); tampil();
    const setuju = h("input", {type: "checkbox", name: "sitasi", required: true});
    f.append(isian("Data", sel), petunjuk, isian("Untuk usulan (opsional)", pilihOpsi("usulan_id", D.usulan.map(u => [u.id, u.judul]), "", "Tanpa usulan")), isian("Tujuan pemakaian", area("tujuan", "", 500, 10)),
      h("label", {class: "bn-setuju"}, setuju, `Aku berjanji mencantumkan sitasi BNPB dan Centurisk97 pada setiap luaran yang memakai data ini (lisensi ${D.katalog[0].lisensi}).`), pesan,
      h("div", {class: "mt-aksi"}, h("button", {class: "bn-tombol", type: "submit"}, svg("kirim"), "Kirim permintaan")));
    f.addEventListener("submit", async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f));
      try { const r = await api("POST", "/api/riset/mitra/permintaan", {dataset: v.dataset, tujuan: v.tujuan, sitasi: setuju.checked, usulan_id: v.usulan_id || undefined});
        if (!r.ok) return pesanDi(pesan, r.j.galat || "Gagal (" + r.status + ")", false); dlg.close(); muat(); } catch (x) {} });
    buka("Minta data", f);
  }

  /* ---- detail usulan ---- */
  function detail(u) {
    const s = STATUS[u.status], namaData = Object.fromEntries(D.katalog.map(k => [k.id, k.nama])), jejak = D.jejak.filter(j => j.usulan_id === u.id), kem = D.kemajuan.filter(k => k.usulan_id === u.id), lua = D.luaran.filter(l => l.usulan_id === u.id);
    const idx = LANGKAH.indexOf(u.status === "revisi" ? "ditelaah" : u.status), alur = h("ol", {class: "bn-alur", "aria-label": "Alur usulan"}, ...LANGKAH.map((l, i) => h("li", {class: i < idx ? "lewat" : "", "aria-current": i === idx ? "step" : null, teks: STATUS[l][1]})));
    const info = (j, v) => h("div", null, h("b", {teks: j}), v);
    const bagian = (judul, ...isi) => h("section", {class: "mt-bagian"}, h("h3", {teks: judul}), ...isi);
    const agenda = D.agenda.find(a => a.id === u.agenda_id);
    const isi = [h("div", {class: "mt-aksi"}, pil(s[0], s[1], s[2]), u.nomor_pks ? pil("dokumen", u.nomor_pks, "hijau") : null), alur,
      u.catatan && (u.status === "revisi" || u.status === "ditolak") ? h("p", {class: "mt-catatan", teks: "Catatan telaah: " + u.catatan}) : null,
      h("div", {class: "mt-info"}, info("Ketua peneliti", u.ketua), info("Anggota", u.anggota || "–"), info("Bencana", D.bencana[u.bencana] || u.bencana), info("Wilayah", u.wilayah), info("Jadwal", tgl(u.mulai) + "–" + tgl(u.selesai)),
        info("Agenda BNPB", agenda ? agenda.judul : u.agenda_id ? "Agenda sudah ditutup" : "–"), info("Data dibutuhkan", u.data_butuh.map(i => namaData[i] || i).join(", ") || "–"), info("Luaran rencana", u.luaran_rencana)),
      h("div", {class: "mt-info"}, info("Metode", u.metode)),
      bagian("Riwayat status", h("ul", {class: "mt-daftar"}, ...jejak.map(j => h("li", null, h("b", {teks: (j.dari ? STATUS[j.dari][1] + " ke " : "") + STATUS[j.ke][1]}), h("span", {class: "rs-redup", teks: wkt(j.waktu) + " oleh " + (j.oleh === "mitra" ? "kamu" : "admin") + (j.catatan ? ": " + j.catatan : "")}))))),
    ];
    if (u.status === "revisi") { const b = h("button", {class: "bn-tombol", type: "button"}, svg("edit"), "Revisi dan kirim ulang"); b.onclick = () => { dlg.close(); dialogUsulan(u); }; isi.push(h("div", {class: "mt-aksi"}, b)); }
    if (kem.length || u.status === "berjalan") isi.push(bagian("Laporan kemajuan", ...(kem.length ? [h("ul", {class: "mt-daftar"}, ...kem.map(k => h("li", null, h("b", {teks: (k.jenis === "akhir" ? "Laporan akhir" : "Kemajuan") + " · " + wkt(k.waktu)}), h("span", {teks: k.isi}), k.tautan ? tautan(k.tautan, "Dokumen") : null)))] : []), u.status === "berjalan" ? formKemajuan(u) : null));
    if (lua.length || ["berjalan", "laporan_akhir", "selesai"].includes(u.status)) isi.push(bagian("Luaran", ...(lua.length ? [h("ul", {class: "mt-daftar"}, ...lua.map(l => h("li", null, h("b", {teks: (JENIS[l.jenis] || l.jenis) + ": " + l.judul}),
      h("span", {class: "rs-redup", teks: l.disetujui ? "Tampil di halaman publik" : "Menunggu persetujuan admin"}), l.tautan ? tautan(l.tautan, "Tautan") : null, l.doi ? h("span", {class: "rs-redup"}, "DOI ", tautan("https://doi.org/" + l.doi, l.doi)) : null)))] : []), formLuaran(u)));
    buka(u.judul, ...isi);
  }
  function formKemajuan(u) {
    const pesan = h("p", {class: "bn-pesan", role: "status"}), f = h("form", {class: "mt-form"}), akhir = h("input", {type: "checkbox", name: "akhir"});
    f.append(isian("Isi laporan", area("isi", "", 1500, 10)), isian("Tautan dokumen (opsional, http atau https)", h("input", {type: "url", name: "tautan", maxlength: "300", placeholder: "https://"})),
      h("label", {class: "bn-setuju"}, akhir, "Ini laporan akhir: riset selesai dikerjakan dan menunggu penutupan oleh admin."), pesan, h("div", {class: "mt-aksi"}, h("button", {class: "bn-tombol", type: "submit"}, svg("kirim"), "Kirim laporan")));
    f.addEventListener("submit", async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f));
      try { const r = await api("POST", "/api/riset/mitra/kemajuan/" + u.id, {isi: v.isi, tautan: v.tautan || undefined, akhir: akhir.checked}); if (!r.ok) return pesanDi(pesan, r.j.galat || "Gagal (" + r.status + ")", false); dlg.close(); muat(u.id); } catch (x) {} });
    return f;
  }
  function formLuaran(u) {
    const pesan = h("p", {class: "bn-pesan", role: "status"}), f = h("form", {class: "mt-form"});
    f.append(h("div", {class: "bn-baris"}, isian("Jenis", pilihOpsi("jenis", Object.entries(JENIS), "artikel")), isian("Judul", teksIsian("judul", "", 200, 3))),
      h("div", {class: "bn-baris"}, isian("Tautan (opsional)", h("input", {type: "url", name: "tautan", maxlength: "300", placeholder: "https://"})), isian("DOI (opsional)", h("input", {name: "doi", maxlength: "120", placeholder: "10.1234/contoh"}))),
      pesan, h("div", {class: "mt-aksi"}, h("button", {class: "bn-tombol sekunder", type: "submit"}, svg("tambah"), "Catat luaran")));
    f.addEventListener("submit", async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f));
      try { const r = await api("POST", "/api/riset/mitra/luaran/" + u.id, {jenis: v.jenis, judul: v.judul, tautan: v.tautan || undefined, doi: v.doi || undefined}); if (!r.ok) return pesanDi(pesan, r.j.galat || "Gagal (" + r.status + ")", false); dlg.close(); muat(u.id); } catch (x) {} });
    return f;
  }

  /* ---- mulai ---- */
  const dariHash = new URLSearchParams(location.hash.slice(1)).get("k");
  if (dariHash) { sessionStorage.setItem(KUNCI, dariHash.trim().toLowerCase()); history.replaceState(null, "", location.pathname); }
  if (sessionStorage.getItem(KUNCI)) muat(); else formKode();
})();
