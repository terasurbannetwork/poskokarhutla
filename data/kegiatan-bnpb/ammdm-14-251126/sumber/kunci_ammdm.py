import re
KUNCI = {
 "en": [r"KRIS", r"Kolaborasi", r"Responsif", r"Integratif", r"Sinkronisasi", r"collaboration", r"responsiveness", r"integration", r"synchronisation",
        r"Collaboration, Responsiveness, Integration and Synchronisation", r"a rope", r"rope", r"One ASEAN, One Response",
        r"ASEAN Sustainable Resilience Strategies", r"more than 1,800 disaster events", r"all 38 of our provinces", r"more than 550 times",
        r"magnitude 7\.7", r"More than 100 people", r"more than 27,000 houses", r"1,189 people", r"more than 900,000 people", r"89 lives",
        r"24 areas", r"eleven Member States", r"three Work Plans", r"Work Plan on Disaster Management for 2026 to 2030",
        r"hand over the chairmanship to Lao PDR", r"three tasks", r"three lessons", r"three things",
        r"(?<=^)(?:First|Second|Third|One|Two|Three),"],
 "id": [r"KRIS", r"Kolaborasi", r"Responsif", r"Integratif", r"Sinkronisasi", r"kolaborasi, responsif, integratif, dan sinkronisasi",
        r"seutas tali", r"tali", r"One ASEAN, One Response", r"ASEAN Sustainable Resilience Strategies",
        r"lebih dari 1\.800 kejadian bencana", r"seluruh 38 provinsi", r"lebih dari 550 kali", r"magnitudo 7,7", r"Lebih dari 100 orang",
        r"lebih dari 27\.000 rumah", r"1\.189 orang", r"lebih dari 900\.000 orang", r"89 jiwa", r"24 bidang", r"Sebelas negara anggota",
        r"tiga Rencana Kerja", r"Rencana Kerja Penanggulangan Bencana ASEAN-(?:Tiongkok|Jepang|Republik Korea) 2026–2030", r"menyerahkan keketuaan kepada Laos",
        r"tiga tugas", r"tiga pelajaran", r"tiga hal", r"(?<=^)(?:Pertama|Kedua|Ketiga),"],
}
RE_KUNCI = {k: re.compile("(" + "|".join(f"(?<![\\w-]){x}" if not x.startswith("(?<=^)") else "^" + x[6:] for x in sorted(v, key=len, reverse=True)) + r")(?![\w-])")
            for k, v in KUNCI.items()}
