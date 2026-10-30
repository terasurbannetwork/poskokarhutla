// pelanggaran aturan 5: ${} tanpa esc( di innerHTML
export function bangun(el, nama, daftar) {
  el.innerHTML = `<h2>${nama}</h2><ul>${daftar.map(d => `<li>${d.judul}</li>`).join("")}</ul>`;
}
