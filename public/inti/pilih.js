"use strict";
/* Pemilih kustom bersama (public/inti). Butuh format.js (esc). Pemasangan (PilihCantik.pasang()) dilakukan halaman. */
/* pemilih kustom: <select> asli tetap ada (tersembunyi, sumber kebenaran & event change), tampilannya pil + menu kartu.
   Menu posisi fixed supaya tidak terpotong kartu ber-overflow:hidden. */
const PilihCantik = {
  buka: null,
  hias(sel) { if (sel.dataset.cantik || sel.multiple || sel.closest(".pc, dialog")) return; sel.dataset.cantik = 1;
    const w = document.createElement("div"); w.className = "pc"; sel.before(w); w.append(sel);
    w.insertAdjacentHTML("afterbegin", `<button type="button" class="pc-btn" aria-haspopup="listbox" aria-label="${esc(sel.getAttribute("aria-label") || "Pilih")}"><span></span><i></i></button>`);
    this.label(sel); },
  label(sel) { const b = sel.parentElement?.querySelector(".pc-btn span"); if (b) b.textContent = sel.selectedOptions[0]?.textContent || ""; },
  tutup() { this.buka?.remove(); this.buka = null; document.querySelectorAll(".pc.on").forEach(x => x.classList.remove("on")); },
  bukaMenu(w) { this.tutup(); const sel = w.querySelector("select"), r = w.getBoundingClientRect(); w.classList.add("on");
    const m = document.createElement("div"); m.className = "pc-menu"; m.setAttribute("role", "listbox");
    m.innerHTML = [...sel.options].map((o, i) => `<button type="button" role="option" data-i="${i}" aria-selected="${o.selected}"${o.disabled ? " disabled" : ""}>${esc(o.textContent)}</button>`).join("");
    (document.querySelector("dialog[open]") || document.body).append(m);
    const bawah = innerHeight - r.bottom, tinggi = Math.min(320, m.scrollHeight);
    Object.assign(m.style, {left: r.left + "px", minWidth: r.width + "px", top: (bawah < tinggi + 12 && r.top > bawah ? r.top - tinggi - 6 : r.bottom + 6) + "px"});
    m.querySelector('[aria-selected="true"]')?.scrollIntoView({block: "nearest"}); m.querySelector('[aria-selected="true"], button')?.focus({preventScroll: true});
    m.addEventListener("click", e => { const o = e.target.closest("[data-i]"); if (!o) return; sel.selectedIndex = +o.dataset.i; this.label(sel); this.tutup();
      sel.dispatchEvent(new Event("input", {bubbles: true})); sel.dispatchEvent(new Event("change", {bubbles: true})); w.querySelector(".pc-btn").focus(); });
    m.addEventListener("keydown", e => { const bs = [...m.querySelectorAll("button:not([disabled])")], i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); bs[Math.min(bs.length - 1, i + 1)]?.focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); bs[Math.max(0, i - 1)]?.focus(); }
      else if (e.key === "Escape") { this.tutup(); w.querySelector(".pc-btn").focus(); } });
    this.buka = m; },
  pasang() {
    const hiasSemua = () => document.querySelectorAll("main select:not([multiple]):not([data-cantik])").forEach(x => this.hias(x));
    hiasSemua(); new MutationObserver(hiasSemua).observe(document.querySelector("main"), {childList: true, subtree: true});
    document.addEventListener("click", e => { const b = e.target.closest(".pc-btn"); if (b) { const w = b.parentElement; return w.classList.contains("on") ? this.tutup() : this.bukaMenu(w); } if (!e.target.closest(".pc-menu")) this.tutup(); });
    document.addEventListener("keydown", e => { if (e.target.matches?.(".pc-btn") && (e.key === "ArrowDown" || e.key === " " || e.key === "Enter")) { e.preventDefault(); this.bukaMenu(e.target.parentElement); } });
    addEventListener("scroll", e => { if (!e.target.closest?.(".pc-menu")) this.tutup(); }, true); addEventListener("resize", () => this.tutup());
    /* nilai yang diubah kode (sel.value = …) ikut memperbarui label pil */
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(HTMLSelectElement.prototype, "value", {get() { return d.get.call(this); }, set(v) { d.set.call(this, v); if (this.dataset.cantik) PilihCantik.label(this); }, configurable: true});
    document.addEventListener("change", e => { if (e.target.dataset?.cantik) this.label(e.target); }, true); }
};
