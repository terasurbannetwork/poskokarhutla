/* Tombol mata di kotak sandi: tampil/sembunyikan isinya. */
const t = document.getElementById("sandi"), m = document.querySelector(".ad-mata");
m.onclick = () => {
  const lihat = t.type === "password";
  t.type = lihat ? "text" : "password";
  m.setAttribute("aria-label", lihat ? "Sembunyikan sandi" : "Tampilkan sandi");
  m.classList.toggle("buka", lihat);
};
