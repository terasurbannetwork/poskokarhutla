// DIBANGKITKAN dari public/bencana.json oleh scripts/umum/bencana.py js, jangan disunting.
export default {
  "versi": 1,
  "bencana": [
    {
      "id": "karhutla",
      "nama": "Karhutla",
      "nama_en": "Forest & Land Fires",
      "ikon": "karhutla",
      "warna": "#f08a3c",
      "rute": "/",
      "data": "/data/",
      "status": "aktif",
      "warisan": true,
      "tab": [
        "ringkasan",
        "peta",
        "insight",
        "berita",
        "tren",
        "kompleks",
        "posko",
        "dampak",
        "metode",
        "sim",
        "informasi",
        "foto",
        "tentang"
      ],
      "tab_sembunyi": [
        "ringkasan",
        "posko",
        "informasi",
        "kompleks",
        "metode"
      ],
      "sumber_status": [
        [
          "titik",
          "/data/meta.json",
          8
        ],
        [
          "berita",
          "/data/berita.json",
          30
        ],
        [
          "dampak",
          "/data/dampak.json",
          null
        ]
      ],
      "kejadian": {
        "awalan": "K",
        "nama": "Kompleks api",
        "nama_jamak": "Kompleks api"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Pencegahan rutin",
          "warna": "#9aa4b2"
        },
        {
          "kode": 1,
          "nama": "Patroli terpadu",
          "warna": "#e0b400"
        },
        {
          "kode": 2,
          "nama": "Siaga pemadaman awal",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Prioritas pemadaman",
          "warna": "#d64545"
        }
      ],
      "foto_kategori": [
        [
          "api",
          "Api"
        ],
        [
          "asap",
          "Asap"
        ],
        [
          "padam",
          "Pemadaman"
        ],
        [
          "dampak",
          "Dampak"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "karhutla"
      ],
      "cron_worker": [
        {
          "tugas": "firms",
          "selang_detik": 10800
        }
      ],
      "workflow": "data.yml",
      "pengerja": "pipa-data",
      "bagikan": {
        "nama": "Pantau Bencana · Karhutla",
        "sumber": "NASA FIRMS, BMKG/Open-Meteo, BNPB",
        "tagar": [
          "#karhutla",
          "#kabutasap",
          "#kebakaranhutan",
          "#titikpanas"
        ]
      },
      "og": {
        "judul": "Karhutla hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: {n} titik panas, {jiwa} jiwa terpapar asap."
      },
      "kata": {
        "unit": "titik panas",
        "kejadian": "kompleks api",
        "tindakan": [
          "Pencegahan rutin",
          "Patroli terpadu",
          "Siaga pemadaman awal",
          "Prioritas pemadaman"
        ],
        "frasa_wilayah": "provinsi yang sering mengalami karhutla"
      },
      "peringatan_relevan": "angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas",
        "jalan",
        "asap"
      ],
      "berita": {
        "kueri": [
          "kebakaran hutan",
          "karhutla",
          "kebakaran lahan",
          "kabut asap",
          "titik panas"
        ],
        "leksikon": "scripts/berita/karhutla.py"
      },
      "prioritas": [
        "62",
        "16",
        "61",
        "93",
        "64",
        "63",
        "15",
        "53",
        "14"
      ],
      "posko": {
        "radius_km": 30,
        "bobot": {
          "awas": 3,
          "siaga": 1
        }
      }
    },
    {
      "id": "banjir",
      "nama": "Banjir, Longsor & Rob",
      "nama_en": "Floods, Landslides & Tidal Floods",
      "ikon": "banjir",
      "warna": "#4f9be0",
      "rute": "/banjir/",
      "data": "/banjir/data/",
      "status": "aktif",
      "warisan": true,
      "tab": [
        "peta",
        "insight",
        "berita",
        "tren",
        "dampak",
        "sim",
        "foto",
        "tentang",
        "posko",
        "informasi",
        "metode",
        "prakiraan",
        "daftar",
        "provinsi",
        "rob",
        "sungai",
        "keputusan",
        "sarana"
      ],
      "tab_sembunyi": [
        "posko",
        "informasi",
        "metode",
        "prakiraan",
        "daftar",
        "provinsi",
        "rob",
        "sungai",
        "keputusan",
        "sarana"
      ],
      "alias": {
        "simulasi": "sim"
      },
      "sumber_status": [
        [
          "banjir",
          "/banjir/data/meta.json",
          30
        ]
      ],
      "kejadian": {
        "awalan": "B",
        "nama": "Kejadian banjir",
        "nama_jamak": "Kejadian banjir"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Normal",
          "warna": "#9aa4b2"
        },
        {
          "kode": 1,
          "nama": "Waspada",
          "warna": "#e0b400"
        },
        {
          "kode": 2,
          "nama": "Siaga",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Awas",
          "warna": "#d64545"
        }
      ],
      "foto_kategori": [
        [
          "genangan",
          "Genangan"
        ],
        [
          "arus",
          "Arus"
        ],
        [
          "longsor",
          "Longsor"
        ],
        [
          "rob",
          "Rob"
        ],
        [
          "evakuasi",
          "Evakuasi"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "banjir",
        "longsor",
        "rob"
      ],
      "cron_worker": [],
      "workflow": "banjir.yml",
      "pengerja": "banjir",
      "bagikan": {
        "nama": "Pantau Bencana · Banjir, Longsor & Rob",
        "sumber": "Open-Meteo, Copernicus GloFAS, BMKG Maritim, BNPB",
        "tagar": [
          "#banjir",
          "#longsor",
          "#rob",
          "#cuacaekstrem",
          "#siagabencana"
        ]
      },
      "og": {
        "judul": "Banjir, longsor & rob hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: {n} kecamatan berstatus banjir, {jiwa} jiwa terdampak."
      },
      "kata": {
        "unit": "curah hujan (mm)",
        "kejadian": "kecamatan berstatus banjir",
        "tindakan": [
          "Pantau",
          "Siaga",
          "Evakuasi",
          "Perahu dan pompa"
        ],
        "frasa_wilayah": "kecamatan langganan banjir"
      },
      "peringatan_relevan": "banjir|hujan|longsor|rob|gelombang",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas",
        "jalan",
        "sungai"
      ],
      "berita": {
        "kueri": [
          "banjir",
          "longsor",
          "rob"
        ],
        "leksikon": "scripts/berita/banjir.py"
      },
      "prioritas": []
    },
    {
      "id": "gempa",
      "nama": "Gempa & Tsunami",
      "nama_en": "Earthquake & Tsunami",
      "ikon": "gempa",
      "warna": "#8a6d4e",
      "rute": "/gempa/",
      "data": "/gempa/data/",
      "status": "aktif",
      "warisan": false,
      "tab": [
        "peta",
        "insight",
        "berita",
        "tren",
        "kejadian",
        "dampak",
        "metode",
        "sim",
        "foto",
        "tentang"
      ],
      "tab_sembunyi": [
        "metode"
      ],
      "sumber_status": [
        [
          "gempa_terbaru",
          "/api/gempa/terbaru",
          0.5
        ],
        [
          "berita_gempa",
          "/banjir/data/berita_gempa.json",
          30
        ]
      ],
      "kejadian": {
        "awalan": "G",
        "nama": "Gempa",
        "nama_jamak": "Gempa"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Tidak berpotensi tsunami",
          "warna": "#9aa4b2"
        },
        {
          "kode": 1,
          "nama": "Tsunami Waspada",
          "warna": "#e0b400"
        },
        {
          "kode": 2,
          "nama": "Tsunami Siaga",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Tsunami Awas",
          "warna": "#d64545"
        }
      ],
      "foto_kategori": [
        [
          "guncangan",
          "Kerusakan bangunan"
        ],
        [
          "retakan",
          "Retakan tanah"
        ],
        [
          "pengungsian",
          "Pengungsian"
        ],
        [
          "tsunami",
          "Genangan tsunami"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "gempa",
        "tsunami"
      ],
      "cron_worker": [
        {
          "tugas": "gempa_bmkg",
          "selang_detik": 60
        },
        {
          "tugas": "gempa_usgs",
          "selang_detik": 300
        }
      ],
      "workflow": "gempa.yml",
      "pengerja": "gempa",
      "bagikan": {
        "nama": "Pantau Bencana · Gempa",
        "sumber": "BMKG, USGS",
        "tagar": [
          "#gempa",
          "#infogempa",
          "#tsunami"
        ]
      },
      "og": {
        "judul": "Gempa bumi hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: {n} gempa M ≥ 5, {jiwa} jiwa terpapar guncangan."
      },
      "kata": {
        "unit": "gempa",
        "kejadian": "gempa utama",
        "tindakan": [
          "Pemantauan",
          "Kaji cepat",
          "Siaga evakuasi",
          "Tanggap darurat"
        ],
        "frasa_wilayah": "provinsi yang sering diguncang gempa"
      },
      "peringatan_relevan": "gempa|tsunami",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas",
        "jalan"
      ],
      "berita": {
        "kueri": [
          "gempa bumi",
          "tsunami"
        ],
        "leksikon": "scripts/gempa/berita.py"
      },
      "prioritas": []
    },
    {
      "id": "cuaca",
      "nama": "Cuaca Ekstrem",
      "nama_en": "Extreme Weather",
      "ikon": "cuaca",
      "warna": "#7d8ca3",
      "rute": "/cuaca/",
      "data": "/cuaca/data/",
      "status": "aktif",
      "warisan": false,
      "tab": [
        "peta",
        "insight",
        "berita",
        "tren",
        "kejadian",
        "dampak",
        "simulasi",
        "foto",
        "tentang",
        "metode"
      ],
      "halaman": {
        "simulasi": "simulasi.html"
      },
      "tab_sembunyi": [
        "metode"
      ],
      "sumber_status": [
        [
          "cuaca",
          "/banjir/data/cuaca_meta.json",
          30
        ],
        [
          "cuaca_nowcast",
          "/api/cuaca/nowcast",
          2
        ],
        [
          "berita_cuaca",
          "/banjir/data/berita_cuaca.json",
          30
        ]
      ],
      "kejadian": {
        "awalan": "C",
        "nama": "Peringatan dini cuaca",
        "nama_jamak": "Peringatan dini cuaca"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Normal",
          "warna": "#9aa4b2"
        },
        {
          "kode": 1,
          "nama": "Waspada",
          "warna": "#e0b400"
        },
        {
          "kode": 2,
          "nama": "Siaga",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Awas",
          "warna": "#d64545"
        }
      ],
      "foto_kategori": [
        [
          "pohon",
          "Pohon tumbang"
        ],
        [
          "genangan",
          "Genangan"
        ],
        [
          "atap",
          "Atap rusak"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "cuaca"
      ],
      "cron_worker": [
        {
          "tugas": "nowcast",
          "selang_detik": 600
        }
      ],
      "workflow": "banjir.yml",
      "pengerja": "cuaca",
      "bagikan": {
        "nama": "Pantau Bencana · Cuaca Ekstrem",
        "sumber": "BMKG, Open-Meteo, ECMWF",
        "tagar": [
          "#cuacaekstrem",
          "#peringatandini"
        ]
      },
      "og": {
        "judul": "Cuaca ekstrem hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: {n} wilayah berstatus peringatan dini, {jiwa} jiwa terdampak."
      },
      "kata": {
        "unit": "peringatan dini cuaca",
        "kejadian": "wilayah peringatan",
        "tindakan": [
          "Pantau",
          "Siaga",
          "Evakuasi"
        ],
        "frasa_wilayah": "provinsi yang sering dilanda cuaca ekstrem"
      },
      "peringatan_relevan": "cuaca|hujan|angin|petir|gelombang",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas",
        "jalan"
      ],
      "berita": {
        "kueri": [
          "cuaca ekstrem",
          "puting beliung"
        ],
        "leksikon": "scripts/cuaca/berita.py"
      },
      "prioritas": []
    },
    {
      "id": "udara",
      "nama": "Kualitas Udara",
      "nama_en": "Air Quality",
      "ikon": "udara",
      "warna": "#4a9d9c",
      "rute": "/udara/",
      "data": "/udara/data/",
      "status": "aktif",
      "warisan": false,
      "tab": [
        "peta",
        "insight",
        "berita",
        "tren",
        "kejadian",
        "dampak",
        "simulasi",
        "foto",
        "tentang",
        "metode"
      ],
      "tab_sembunyi": [
        "metode"
      ],
      "sumber_status": [
        [
          "kualitas",
          "/udara/data/prakiraan.json",
          18
        ],
        [
          "berita_udara",
          "/banjir/data/berita_udara.json",
          30
        ]
      ],
      "kejadian": {
        "awalan": "U",
        "nama": "Stasiun tercemar",
        "nama_jamak": "Stasiun tercemar"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Baik",
          "warna": "#5a9e74"
        },
        {
          "kode": 1,
          "nama": "Sedang",
          "warna": "#e3b94e"
        },
        {
          "kode": 2,
          "nama": "Tidak sehat",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Sangat tidak sehat",
          "warna": "#d64545"
        },
        {
          "kode": 4,
          "nama": "Berbahaya",
          "warna": "#8a2be2"
        }
      ],
      "foto_kategori": [
        [
          "asap",
          "Asap atau kabut"
        ],
        [
          "jarak_pandang",
          "Jarak pandang"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "udara"
      ],
      "cron_worker": [],
      "workflow": "udara.yml",
      "pengerja": "udara",
      "bagikan": {
        "nama": "Pantau Bencana · Kualitas Udara",
        "sumber": "Copernicus CAMS via Open-Meteo, NOAA METAR, WorldPop (perkiraan model)",
        "tagar": [
          "#kualitasudara",
          "#polusiudara"
        ]
      },
      "og": {
        "judul": "Kualitas udara hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: sekitar {jiwa} jiwa menghirup udara tidak sehat (perkiraan model CAMS, belum dikoreksi)."
      },
      "kata": {
        "unit": "PM2.5 (µg/m³)",
        "kejadian": "kota atau stasiun",
        "tindakan": [
          "Pakai masker",
          "Kurangi aktivitas luar",
          "Ruang udara bersih"
        ],
        "frasa_wilayah": "kota dengan udara paling tercemar"
      },
      "peringatan_relevan": "asap|kabut|debu|jarak pandang",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas"
      ],
      "berita": {
        "kueri": [
          "kualitas udara",
          "ISPU"
        ],
        "leksikon": "scripts/udara/berita.py"
      },
      "prioritas": []
    },
    {
      "id": "gunungapi",
      "nama": "Letusan Gunung Api",
      "nama_en": "Volcanic Eruptions",
      "ikon": "gunungapi",
      "warna": "#b5523b",
      "rute": "/gunungapi/",
      "data": "/gunungapi/data/",
      "status": "aktif",
      "warisan": false,
      "tab": [
        "peta",
        "insight",
        "berita",
        "tren",
        "kejadian",
        "dampak",
        "simulasi",
        "foto",
        "tentang",
        "metode"
      ],
      "tab_sembunyi": [
        "metode"
      ],
      "sumber_status": [
        [
          "gunungapi",
          "/banjir/data/gunungapi_status.json",
          30
        ],
        [
          "berita_gunungapi",
          "/banjir/data/berita_gunungapi.json",
          30
        ]
      ],
      "kejadian": {
        "awalan": "V",
        "nama": "Gunung api",
        "nama_jamak": "Gunung api"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Level I Normal",
          "warna": "#9aa4b2"
        },
        {
          "kode": 1,
          "nama": "Level II Waspada",
          "warna": "#e0b400"
        },
        {
          "kode": 2,
          "nama": "Level III Siaga",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Level IV Awas",
          "warna": "#d64545"
        }
      ],
      "foto_kategori": [
        [
          "hujan_abu",
          "Hujan abu"
        ],
        [
          "lahar",
          "Lahar"
        ],
        [
          "pengungsian",
          "Pengungsian"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "gunungapi"
      ],
      "cron_worker": [],
      "workflow": "banjir.yml",
      "pengerja": "gunungapi",
      "bagikan": {
        "nama": "Pantau Bencana · Gunung Api",
        "sumber": "PVMBG (MAGMA Indonesia)",
        "tagar": [
          "#gunungapi",
          "#erupsi"
        ]
      },
      "og": {
        "judul": "Gunung api hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: {n} gunung api berstatus Waspada atau lebih tinggi, {jiwa} jiwa berada di zona rawan."
      },
      "kata": {
        "unit": "erupsi",
        "kejadian": "gunung api aktif",
        "tindakan": [
          "Ikuti rekomendasi PVMBG",
          "Kosongkan radius",
          "Tutup jalur pendakian"
        ],
        "frasa_wilayah": "provinsi dengan gunung api aktif"
      },
      "peringatan_relevan": "gunung|abu vulkanik|erupsi",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas",
        "jalan"
      ],
      "berita": {
        "kueri": [
          "gunung api",
          "erupsi"
        ],
        "leksikon": "scripts/gunungapi/berita.py"
      },
      "prioritas": []
    },
    {
      "id": "kekeringan",
      "nama": "Kekeringan",
      "nama_en": "Drought",
      "ikon": "kekeringan",
      "warna": "#c9a24b",
      "rute": "/kekeringan/",
      "data": "/kekeringan/data/",
      "status": "aktif",
      "warisan": false,
      "tab": [
        "peta",
        "insight",
        "berita",
        "tren",
        "dampak",
        "posko",
        "foto",
        "tentang",
        "metode"
      ],
      "tab_sembunyi": [
        "metode",
        "posko"
      ],
      "sumber_status": [
        [
          "kekeringan",
          "/data/kekeringan_meta.json",
          30
        ],
        [
          "berita_kekeringan",
          "/banjir/data/berita_kekeringan.json",
          30
        ]
      ],
      "kejadian": {
        "awalan": "D",
        "nama": "Wilayah kekeringan",
        "nama_jamak": "Wilayah kekeringan"
      },
      "tingkat": [
        {
          "kode": 0,
          "nama": "Normal",
          "warna": "#9aa4b2"
        },
        {
          "kode": 1,
          "nama": "Waspada",
          "warna": "#e0b400"
        },
        {
          "kode": 2,
          "nama": "Siaga",
          "warna": "#e8743b"
        },
        {
          "kode": 3,
          "nama": "Awas",
          "warna": "#d64545"
        }
      ],
      "foto_kategori": [
        [
          "sumur",
          "Sumur kering"
        ],
        [
          "sawah",
          "Sawah puso"
        ],
        [
          "antre",
          "Antre air"
        ],
        [
          "lainnya",
          "Lainnya"
        ]
      ],
      "lapor_bahaya": [
        "kekeringan"
      ],
      "cron_worker": [],
      "workflow": "data.yml",
      "pengerja": "kekeringan",
      "bagikan": {
        "nama": "Pantau Bencana · Kekeringan",
        "sumber": "Deteksi Pantau Bencana",
        "tagar": [
          "#kekeringan",
          "#krisisair"
        ]
      },
      "og": {
        "judul": "Kekeringan hari ini · Pantau Bencana",
        "desk_templat": "{tgl}: {n} wilayah berstatus kekeringan, {jiwa} jiwa kesulitan air bersih."
      },
      "kata": {
        "unit": "hari tanpa hujan",
        "kejadian": "wilayah kekeringan",
        "tindakan": [
          "Pantau",
          "Hemat air",
          "Distribusi air bersih"
        ],
        "frasa_wilayah": "provinsi yang sering mengalami kekeringan"
      },
      "peringatan_relevan": "kering|kemarau",
      "lapisan": [
        "penduduk",
        "sekolah",
        "fasilitas"
      ],
      "berita": {
        "kueri": [
          "kekeringan",
          "krisis air bersih"
        ],
        "leksikon": "scripts/kekeringan/berita.py"
      },
      "prioritas": []
    }
  ]
};
