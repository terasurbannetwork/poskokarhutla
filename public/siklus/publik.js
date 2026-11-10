/* Siklus Bencana: halaman publik ringkasan resmi satu kejadian (U3 bawaan, SK-029). Mandiri: tidak memuat inti.js staf.
   Hanya ringkasan resmi: tanpa nama korban dan rincian. Panel "Lisensi dan atribusi" dari atribusi.json (bukan kaki sumber kartu).
   Tanpa markup mentah: DOM dibangun dengan teks murni. */
(() => {
  "use strict";
  const isi = document.getElementById("pk"), id = /\/siklus\/kejadian\/(KJ-\d{4}-[0-9A-HJKMNP-TV-Z]{8})\/?$/.exec(location.pathname)?.[1];
  const h = (tag, atr, ...anak) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(atr || {})) if (v != null && v !== false) { if (k === "class") e.className = v; else e.setAttribute(k, String(v)); } e.append(...anak.flat(Infinity).filter(x => x != null && x !== false)); return e; };
  const hl = t => h("span", {class: "hl"}, t);
  const kartu = (ey, judul, ...isiKartu) => h("section", {class: "ex ex-std"}, h("header", {class: "ex-hd"}, h("span", {class: "ex-ey"}, ey), h("div", {class: "ex-jd"}, h("h3", {}, judul))), h("div", {class: "ex-bd"}, isiKartu));
  const kosong = teks => h("div", {class: "sk-kead", "data-k": "kosong"}, h("p", {}, teks));
  const tgl = t => /^\d{4}-\d\d-\d\d/.test(t ?? "") ? new Date(t.slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : "tidak ada";
  const ambil = async u => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  document.getElementById("tema")?.addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("pb-tema", t); } catch (e) { /* penyimpanan diblokir */ }
  });
  try { const t = localStorage.getItem("pb-tema"); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* abaikan */ }

  function atribusi(a) {
    const daftar = (a?.sumber ?? []).filter(x => (x.dipakai_di ?? []).includes("F1"));
    const aman = u => /^https:\/\//.test(u ?? "");
    return h("details", {class: "lipat"}, h("summary", {}, "Lisensi dan atribusi ", h("span", {}, `${daftar.length} sumber`)),
      h("div", {class: "isi sk-atr"}, daftar.length ? daftar.map(x => h("div", {}, h("b", {}, x.nama), h("small", {}, x.atribusi), h("small", {}, `Lisensi: ${x.lisensi}`), aman(x.url_lisensi) ? h("a", {href: x.url_lisensi, target: "_blank", rel: "noopener noreferrer"}, "Teks lisensi") : null)) : h("p", {}, "Daftar atribusi belum tersedia.")));
  }

  async function mulai() {
    if (!id) { isi.replaceChildren(kartu("Kejadian", ["Nomor kejadian ", hl("tidak sah")], kosong("Nomor kejadian tidak sah."))); return; }
    const [kamus, a, r] = await Promise.all([ambil("/siklus/data/kamus.json"), ambil("/siklus/data/atribusi.json"), (async () => { try { const x = await fetch(`/api/siklus/publik/kejadian/${id}`); return {ok: x.ok, j: x.ok ? await x.json() : null}; } catch (e) { return {ok: false, j: null}; } })()]);
    if (!r.ok || !r.j) { isi.replaceChildren(kartu("Ringkasan resmi", ["Ringkasan ", hl("belum dibuka"), " untuk umum"], kosong("Ringkasan resmi untuk kejadian ini belum dibuka untuk umum, atau nomornya tidak ditemukan.")), atribusi(a)); return; }
    const k = r.j, jenis = String(k.jenis ?? "").split("+").map(j => kamus?.jenis?.[j]?.[0] ?? j.replaceAll("_", " ")).join(" dan "), fase = kamus?.fase?.[k.fase]?.[0] ?? k.fase, kata = kamus?.label?.[k.yakin]?.kata ?? k.yakin ?? "resmi";
    const y = kamus?.label?.[k.yakin] ? k.yakin : "resmi";
    isi.replaceChildren(
      kartu(id, [hl(jenis), k.wilayah ? ` di ${k.wilayah}` : "", ", fase ", hl(fase)],
        h("div", {class: "sk-blok"}, h("h4", {}, "Ringkasan resmi"), h("p", {class: "sk-para"}, k.ringkasan ?? "Belum ada ringkasan.")),
        h("div", {class: "sk-blok"}, h("h4", {}, "Keterangan"), h("div", {class: "sk-meta"}, h("span", {}, `Mulai ${tgl(k.mulai)}`), h("span", {}, `Diperbarui ${tgl(k.diperbarui)}`)), h("span", {class: "sk-pil", "data-y": y, title: "Ringkasan ditulis dan disetujui koordinator kejadian"}, kata),
          h("p", {class: "sk-para"}, "Ringkasan ini sengaja tanpa nama korban dan rincian per orang. Angka korban di bawah 5 ditulis \"di bawah 5\".")),
      ),
      atribusi(a));
  }
  mulai();
})();
