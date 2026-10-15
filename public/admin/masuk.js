/* Tombol mata di kotak token: tampil/sembunyikan isinya. */
const t = document.getElementById("token"), m = document.querySelector(".ad-mata");
m.onclick = () => {
  const lihat = t.type === "password";
  t.type = lihat ? "text" : "password";
  m.setAttribute("aria-label", lihat ? "Sembunyikan token" : "Tampilkan token");
  m.classList.toggle("buka", lihat);
};
