"use strict";
/* Tab Unduhan (PRD F-8) lewat proksi /api/inarisk/unduhan, dan tab Tautan (F-9) dari tautan.json. */
const AMAN_HOST = /^https?:\/\/(inarisk2?\.bnpb\.go\.id)\//i;
/* file_url InaRISK ada yang relatif (/apiv4/upload/file/...): lengkapi dengan host InaRISK; host lain ditolak */
const urlBerkas = u => { const s = String(u || ""); const p = s.startsWith("/") ? "https://inarisk.bnpb.go.id" + s : s; return AMAN_HOST.test(p) ? p : ""; };
Ir.tab.unduhan = {
  pasang() {
    const {H} = Ir, PER = 8, f = {cari: $("#unCari"), prov: $("#unProv"), kab: $("#unKab"), kat: $("#unKat"), fmt: $("#unFmt"), urut: $("#unUrut")};
    let hal = 0, tunda = 0, minta = 0;
    Ir.muat("irbi.json").then(d => Ir.rantaiProvKab(f.prov, f.kab, d.kab, d.prov)).catch(() => {});
    Ir.api("unduhan/ringkas").then(j => {
      const r = j.data || {};
      const opsi = arr => (arr || []).map(x => typeof x === "string" ? [x, x] : [x.value ?? x.name ?? x.category ?? x.format, `${x.label ?? x.name ?? x.category ?? x.format}${x.count != null ? ` (${H.angka0(x.count)})` : ""}`]);
      Ir.isiOpsi(f.kat, opsi(r.categories), "Semua kategori");
      Ir.isiOpsi(f.fmt, opsi(r.formats || r.file_formats), "Semua format");
    }).catch(() => {});
    const q = () => {
      const p = new URLSearchParams({page: hal + 1, per_page: PER, sort: f.urut.value});
      if (f.cari.value.trim()) p.set("search", f.cari.value.trim().slice(0, 80));
      if (f.kat.value) p.set("category", f.kat.value);
      if (f.fmt.value) p.set("file_format", f.fmt.value);
      if (f.kab.value || f.prov.value) p.set("region", f.kab.value || f.prov.value);
      return p;
    };
    function muat() {
      const no = ++minta;
      $("#unBaris").setAttribute("aria-busy", "true");
      Ir.api("unduhan?" + q()).then(j => {
        if (no !== minta) return;   // balasan lama yang kalah cepat dibuang
        const rows = j.data?.rows || [], n = j.data?.pagination?.total_data;
        $("#unJml").textContent = typeof n === "number" ? `${H.angka0(n)} berkas` : "Jumlah berkas belum diketahui";
        $("#unBaris").innerHTML = rows.map(r => {
          const url = urlBerkas(r.file_url) && escUrl(urlBerkas(r.file_url));
          const fm = String(r.file_format || "").toUpperCase();
          return `<tr><td class="ir-lbl"><b>${esc(r.title)}</b><small>${esc(r.description || "")}</small></td><td><span class="ir-pil ir-kat">${esc(r.category || "–")}</span></td>` +
            `<td>${esc(fm || "–")}</td><td class="n">${esc(r.file_size || "–")}</td><td>${esc(Ir.tanggal(r.published_at, {day: "numeric", month: "short", year: "numeric"}))}</td>` +
            `<td>${url ? `<a class="ir-tombol2 ir-kecil" href="${url}" target="_blank" rel="noopener noreferrer">Unduh</a>` : ""}</td></tr>`;
        }).join("") || `<tr><td colspan="6" class="ir-p">Tidak ada berkas untuk pilihan ini.</td></tr>`;
        if (typeof n === "number") halaman($("#unHal"), hal, Math.ceil(n / PER), n, PER, h => { hal = h; muat(); }); else $("#unHal").innerHTML = "";
      }).catch(e => { if (no === minta) $("#unBaris").innerHTML = `<tr><td colspan="6" class="ir-p">${esc(e.message)}</td></tr>`; })
        .finally(() => { if (no === minta) $("#unBaris").removeAttribute("aria-busy"); });
    }
    $("#unForm").addEventListener("submit", e => e.preventDefault());
    for (const el of [f.prov, f.kab, f.kat, f.fmt, f.urut]) el.addEventListener("change", () => { hal = 0; muat(); });
    f.cari.addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { hal = 0; muat(); }, 350); });
    muat();
  },
};

Ir.tab.tautan = {
  pasang() {
    Ir.muat("tautan.json").then(t => {
      const grup = new Map();
      for (const b of t.baris) { if (!grup.has(b.kategori)) grup.set(b.kategori, []); grup.get(b.kategori).push(b); }
      $("#tbIsi").innerHTML = [...grup].map(([k, bs]) => `<section class="ir-kartu"><div class="ir-kartu-hd"><h2>${esc(k || "Lainnya")}</h2><span class="ir-ket">${bs.length} tautan</span></div>` +
        `<ul class="ir-taut">${bs.map(b => `<li><a href="${escUrl(b.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(b.judul)}</b><span>${esc(b.deskripsi || b.url)}</span></a></li>`).join("")}</ul></section>`).join("")
        || `<p class="ir-p">Belum ada tautan.</p>`;
    }).catch(() => { $("#tbIsi").innerHTML = `<p class="ir-p">Data tautan belum ditarik.</p>`; });
  },
};
