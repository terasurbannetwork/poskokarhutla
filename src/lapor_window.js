/* Pelengkap lapor_besok.js: public/prediksi/besok_inti.js menulis ke `window.Besok` (kode peramban); Worker tidak punya `window`, jadi dipasang sebentar. */
globalThis.window ??= {};
