// bersih: tidak boleh melanggar aturan mana pun
const RUMPUN = { 'gempa': ['Gempa bumi', '', '#e8590c'] };
export function bangun(el, nama, daftar, j) {
  el.innerHTML = `<h2>${esc(nama)}</h2><ul class="${j === 0 ? "utama" : ""}">${daftar.map(d => `<li>${esc(d.judul)}</li>`).join("")}${kosongHtml()}</ul>`;
  el.textContent = fmt(1.5);
}
