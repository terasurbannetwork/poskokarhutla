"""Kawasan slide 3: KAWASAN=wasur (bawaan, koridor Naukenjerai-Sota) atau KAWASAN=kimaam (Pulau Kimaam: Kontuar dan Kimaam).
Pemilik 17 Nov: "tambahin slide kontuar juga", format sama dengan slide Naukenjerai-Sota. Run kimaam menulis berkas bersufiks -kimaam."""
import os

K = os.environ.get('KAWASAN', 'wasur')
SUF = '' if K == 'wasur' else '-' + K
CFG = {
    'wasur': dict(kec=['Naukenjerai', 'Sota'], nama='Naukenjerai–Sota', kartu='Naukenjerai dan Sota', unsur=[('Taman Nasional Wasur', 'pohon'), ('berbatasan dengan PNG', 'pin')],
                  bbox=(140.15, -9.18, 141.10, -7.85), pusat={'Naukenjerai': (140.72, -8.80), 'Sota': (140.86, -8.22)},
                  lain=[('KOTA MERAUKE', 140.40, -8.47), ('JAGEBOB', 140.68, -8.00)], alur='alur.json'),
    # tab Kecamatan Siaga = dua slide (pemilik 17 Nov): Pulau Kimaam (Kontuar dan Kimaam) dan Naukenjerai-Sota (bawaan 'wasur')
    'pulau': dict(kec=['Kontuar', 'Kimaam'], nama='Pulau Kimaam', kartu='Kontuar dan Kimaam', unsur=[('Hutan Suaka Alam', 'pohon'), ('Pulau Kimaam (Yos Sudarso)', 'pin')],
                  bbox=(137.62, -8.66, 139.22, -7.28), pusat={'Kontuar': (138.12, -7.98), 'Kimaam': (138.72, -8.06)},
                  lain=[('TABONJI', 138.38, -7.80), ('PADUA', 138.78, -7.62)], alur='alur-pulau.json'),
    # satu slide per kecamatan Siaga (dicoba 17 Nov, tidak dipakai) (pemilik 17 Nov: "bikin yg kayak gini untuk masing2 kecamatan yang siaga")
    'kontuar': dict(kec=['Kontuar'], nama='Kontuar', kartu='Kec. Kontuar', unsur=[('Hutan Suaka Alam', 'pohon'), ('Pulau Kimaam (Yos Sudarso)', 'pin')],
                    bbox=(137.62, -8.55, 138.75, -7.60), pusat={'Kontuar': (138.12, -7.98)},
                    lain=[('TABONJI', 138.47, -7.78), ('KIMAAM', 138.66, -8.28)], alur='alur-kontuar.json'),
    'kimaam': dict(kec=['Kimaam'], nama='Kimaam', kartu='Kec. Kimaam', unsur=[('Hutan Suaka Alam', 'pohon'), ('dua sisi Selat Muli', 'pin')],
                   bbox=(138.40, -8.62, 139.35, -7.80), pusat={'Kimaam': (138.78, -8.08)},
                   lain=[('KONTUAR', 138.50, -8.30), ('PADUA', 138.82, -7.88)], alur='alur-kimaam.json'),
    'naukenjerai': dict(kec=['Naukenjerai'], nama='Naukenjerai', kartu='Kec. Naukenjerai', unsur=[('Taman Nasional Wasur', 'pohon'), ('berbatasan dengan PNG', 'pin')],
                        bbox=(140.38, -9.17, 141.12, -8.52), pusat={'Naukenjerai': (140.80, -8.82)},
                        lain=[('SOTA', 140.97, -8.58), ('KOTA MERAUKE', 140.47, -8.56)], alur='alur-naukenjerai.json'),
}[K]
