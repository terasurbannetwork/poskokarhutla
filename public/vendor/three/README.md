# three (vendor)

Three.js 0.169.0 (REVISION 169), lisensi MIT (`LICENSE`). Lokal karena CSP `script-src 'self'` menolak CDN dan import map sebaris. Versi sama dengan `public/sim_adegan.js`.

Isi:
- `three.module.min.js`: `build/three.module.min.js` dari paket npm `three@0.169.0`, tanpa perubahan.
- `addons/controls/OrbitControls.js`: `examples/jsm/controls/OrbitControls.js`, satu perubahan: impor `'three'` ditulis ulang ke `'../../three.module.min.js'`.

Langkah memperbarui:
1. `npm pack three@0.169.0` lalu `tar xzf`.
2. Salin dua berkas di atas, ulangi tulis ulang impor dengan `sed "s#from 'three'#from '../../three.module.min.js'#"`.
3. Cek: `node -e "import('./public/vendor/three/three.module.min.js').then(m=>console.log(m.REVISION))"` mencetak `169`.
