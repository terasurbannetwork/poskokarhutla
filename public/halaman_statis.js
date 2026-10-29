/* Halaman statis berkepala situs (404, 500, syarat): tema tersimpan dipasang sebelum CSS (dimuat di <head>, tanpa skrip inline),
   lalu menu garis tiga dan tombol tema, sama dengan akademisi.js. */
try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger"), tema = document.getElementById("tema");
  if (burger) burger.addEventListener("click", () => { const b = document.querySelector("header.top").classList.toggle("buka"); burger.setAttribute("aria-expanded", String(b)); });
  if (tema) tema.addEventListener("click", () => {
    const gelap = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const t = gelap ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
  });
  const ulang = document.getElementById("muatUlang");
  if (ulang) ulang.addEventListener("click", () => location.reload());
});
