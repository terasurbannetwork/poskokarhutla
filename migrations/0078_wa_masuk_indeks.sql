-- Indeks kotak masuk WA (src/wa.js, 29 Okt 2026): plafon harian menghitung menurut diterima, dan kiriman ulang gerbang dicari lewat (dari, diterima). Idempoten.
CREATE INDEX IF NOT EXISTS wa_masuk_diterima ON wa_masuk(diterima);
CREATE INDEX IF NOT EXISTS wa_masuk_dedup ON wa_masuk(dari, diterima);
