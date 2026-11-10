#!/usr/bin/env python3
"""Panen arsip Laporan Aktivitas MAGMA, mundur dari yang terbaru, ke JSONL lokal per gunung (data/raw, tidak masuk repo).

Satu permintaan pada satu waktu, jeda 1,2 detik. Bisa dihentikan dan dilanjutkan: id yang sudah tersimpan dilewati.
Teks rekomendasi hanya disimpan saat berubah dari laporan sebelumnya gunung yang sama. Nama pembuat laporan tidak disimpan.
Pakai:  python3 scripts/gunungapi/panen_laporan.py <folder keluaran>   |   python3 scripts/gunungapi/panen_laporan.py uji
"""
import html, json, os, re, shutil, sys, time, urllib.error, urllib.request

BASIS = "https://magma.esdm.go.id"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
JEDA = 1.2
BAGIAN = ["Pengamatan Visual", "Keterangan Lainnya", "Klimatologi", "Pengamatan Kegempaan", "Rekomendasi"]
TAUTAN = re.compile(r'https://magma\.esdm\.go\.id/v1/gunung-api/laporan/(\d+)\?signature=[0-9a-f]+')


def teks(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<(script|style).*?</\1>", "", h)))).strip()


def urai(h, ident):
    t = teks(h[h.find("slim-mainpanel"):])
    m = re.search(r"Level (IV|III|II|I) \(\w+\) (.+?, \w+ - \d{1,2} \w+ \d{4}, periode [\d: -]+\w+)", t)
    if not m:
        return None
    o = {"id": ident, "level": {"I": 1, "II": 2, "III": 3, "IV": 4}[m.group(1)], "judul": m.group(2)}
    o["gunung"] = m.group(2).split(",")[0].strip()
    pos = [(t.find(b, m.end()), b) for b in BAGIAN]
    pos = sorted((p, b) for p, b in pos if p >= 0)
    for i, (p, b) in enumerate(pos):
        ujung = pos[i + 1][0] if i + 1 < len(pos) else t.find("Copyright", p)
        o[b] = t[p + len(b): ujung if ujung > 0 else None].strip()
    if "Rekomendasi" in o:   # grafik dan bagian bawah halaman bukan isi rekomendasi
        o["Rekomendasi"] = re.split(r"\s(?:Kegempaan \S.* 90 hari|Follow Kami)", o["Rekomendasi"])[0].strip()
    f = re.search(r'https://[a-z0-9.-]+\.esdm\.go\.id/img/ga/[^"\s]+', h)
    if f:
        o["foto"] = f.group(0)
    return o


def ambil(url):
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "id"}), timeout=60) as f:
                return f.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                return None
            time.sleep(60 * (i + 1))   # 429 atau 5xx: situs sedang berat, mundur lama
        except Exception:
            time.sleep(30 * (i + 1))
    return None


def jalan(akar):
    os.makedirs(akar, exist_ok=True)
    selesai, rek = set(), {}
    for n in os.listdir(akar):
        if n.endswith(".jsonl"):
            for b in open(os.path.join(akar, n), encoding="utf-8"):
                x = json.loads(b)
                selesai.add(x["id"])
                if x.get("Rekomendasi"):
                    rek[x["gunung"]] = x["Rekomendasi"]
    print(f"lanjut dengan {len(selesai)} laporan", flush=True)
    kosong = gagal = baru = 0
    p = 0
    while kosong < 3:
        if shutil.disk_usage(akar).free < 10 * 2**30:
            print("berhenti: disk tersisa kurang dari 10 GB", flush=True)
            return
        p += 1
        h = ambil(f"{BASIS}/v1/gunung-api/laporan?page={p}")
        time.sleep(JEDA)
        l = {int(m.group(1)): m.group(0) for m in TAUTAN.finditer(h or "")}
        kosong = kosong + 1 if not l else 0
        for i, u in l.items():
            if i in selesai:
                continue
            d = ambil(u.replace("&amp;", "&"))
            time.sleep(JEDA)
            o = urai(d, i) if d else None
            if not o:
                gagal += 1
                print(f"gagal id {i} halaman {p}", flush=True)
                continue
            if o.get("Rekomendasi") == rek.get(o["gunung"]):
                o.pop("Rekomendasi", None)
            elif o.get("Rekomendasi"):
                rek[o["gunung"]] = o["Rekomendasi"]
            nama = re.sub(r"[^a-z0-9]+", "-", o["gunung"].lower()).strip("-")
            with open(os.path.join(akar, nama + ".jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps(o, ensure_ascii=False) + "\n")
            selesai.add(i)
            baru += 1
        if p % 100 == 0:
            print(f"halaman {p}, baru {baru}, gagal {gagal}", flush=True)
    print(f"selesai di halaman {p}; baru {baru}, gagal {gagal}", flush=True)


def uji():
    h = '''<div class="slim-mainpanel"><p>Laporan Aktivitas Level III (Siaga) Anak Krakatau, Selasa - 10 November 2026, periode 06:00-12:00 WIB</p>
    <img src="https://magma.vsi.esdm.go.id/img/ga/KRA/KRA202611100600.png"><h6>Pengamatan Visual</h6><p>Kabut.</p><h6>Keterangan Lainnya</h6><p>Nihil</p>
    <h6>Klimatologi</h6><p>Berawan.</p><h6>Pengamatan Kegempaan</h6><p>1 kali gempa Tremor Menerus</p><h6>Rekomendasi</h6><p>1. Radius 5 km.</p><footer>Copyright 2026</footer></div>'''
    o = urai(h, 7)
    assert o["level"] == 3 and o["gunung"] == "Anak Krakatau", o
    assert o["Pengamatan Visual"] == "Kabut." and o["Keterangan Lainnya"] == "Nihil" and o["Pengamatan Kegempaan"].startswith("1 kali"), o
    assert o["Rekomendasi"] == "1. Radius 5 km." and o["foto"].endswith("KRA202611100600.png"), o
    assert "pembuat" not in o and urai("<div class=slim-mainpanel>kosong</div>", 1) is None
    print("panen_laporan uji OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan(sys.argv[1])
