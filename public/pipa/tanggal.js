/* SIPPA: pemilih tanggal berlabel id-ID. <input type="date"> telanjang menulis "mm/dd/yyyy" mengikuti bahasa peramban, jadi yang tampil adalah
   tombol bertulis "1 Sep 2026" (atau "Pilih tanggal"); input date tetap ada, tersembunyi di belakangnya, untuk nilai form dan kalender bawaan (showPicker). */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/* murni: "2026-09-01" -> "1 Sep 2026"; kosong atau tanggal yang tidak nyata (2026-02-30) -> "Pilih tanggal" */
export function labelTanggal(iso) {
  const m = ISO.exec(iso ?? ""); if (!m) return "Pilih tanggal";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return "Pilih tanggal";
  return d.toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"});
}

/* murni: HTML tombol + input tersembunyi. nama = nama medan form; label = nama pendek untuk pembaca layar ("Dari"); atribut = atribut tepercaya tambahan di input (mis. data-tgl="dari") */
export function tanggalHtml({nama = "", label = "Tanggal", nilai = "", atribut = ""} = {}) {
  const v = ISO.test(nilai) ? nilai : "", teks = labelTanggal(v), l = String(label).replace(/[&<>"']/g, "");
  return `<span class="sp-tgl-w"><button type="button" class="sp-tgl-btn" data-tgl-tombol data-label="${l}" aria-label="${l}: ${teks}"><b>${teks}</b></button>`
    + `<input type="date" class="sp-tgl-in" tabindex="-1" aria-hidden="true"${nama ? ` name="${nama.replace(/[^\w-]/g, "")}"` : ""}${v ? ` value="${v}"` : ""}${atribut ? " " + atribut : ""}></span>`;
}

let terpasang = false;
/* satu pasang pendengar di dokumen (delegasi), aman dipanggil berulang. Klik tombol: kalender bawaan; pilihan baru: teks dan aria-label ikut berubah seketika. */
export function pasangTanggal() {
  if (terpasang || typeof document === "undefined") return; terpasang = true;
  document.addEventListener("click", e => {
    const b = e.target.closest?.("[data-tgl-tombol]"); if (!b) return;
    const inp = b.parentElement.querySelector(".sp-tgl-in");
    try { inp.showPicker(); } catch { inp.focus(); inp.click(); }
  });
  document.addEventListener("change", e => {
    const inp = e.target.closest?.(".sp-tgl-in"); if (!inp) return;
    const b = inp.parentElement.querySelector("[data-tgl-tombol]"), teks = labelTanggal(inp.value);
    b.querySelector("b").textContent = teks; b.setAttribute("aria-label", `${b.dataset.label}: ${teks}`);
  });
}
