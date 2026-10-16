"""Registry bencana: validasi public/bencana.json dan bangkitkan src/bencana.generated.js.

public/bencana.json adalah sumber tunggal daftar bencana (docs/multi-bencana/ARSITEKTUR.md §3).
Worker tidak boleh mengimpor JSON langsung (uji Node tanpa bundler), jadi modul ES-nya dibangkitkan.

Pakai:  python3 scripts/umum/bencana.py cek    validasi skema dan keberadaan berkas, keluar 1 bila ada galat
        python3 scripts/umum/bencana.py js     tulis src/bencana.generated.js
        python3 scripts/umum/bencana.py        self-check kecil (tanpa menyentuh berkas)
"""
import json
import os
import re
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
JSON_REGISTRY = os.path.join(AKAR, "public/bencana.json")
JS_KELUAR = os.path.join(AKAR, "src/bencana.generated.js")
STATUS = ("aktif", "uji", "mati")
KEPALA = "// DIBANGKITKAN dari public/bencana.json oleh scripts/umum/bencana.py js, jangan disunting.\n"
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
SLUG = re.compile(r"^[a-z][a-z0-9_]*$")

# medan wajib per entri: nama -> tipe
WAJIB = {
    "id": str, "nama": str, "nama_en": str, "ikon": str, "warna": str, "rute": str, "data": str, "status": str,
    "warisan": bool, "tab": list, "tab_sembunyi": list, "sumber_status": list, "kejadian": dict, "tingkat": list,
    "foto_kategori": list, "lapor_bahaya": list, "cron_worker": list, "workflow": str, "pengerja": str,
    "bagikan": dict, "og": dict, "kata": dict, "peringatan_relevan": str, "lapisan": list, "berita": dict, "prioritas": list,
}


def baca(jalur=JSON_REGISTRY):
    with open(jalur, encoding="utf-8") as f:
        return json.load(f)


def _teks(v):
    """Semua string di v, untuk memeriksa larangan teks."""
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from _teks(x)
    elif isinstance(v, list):
        for x in v:
            yield from _teks(x)


def _prioritas_wilayah(akar):
    p = os.path.join(akar, "scripts/data/wilayah.py")
    if not os.path.exists(p):
        return None
    m = re.search(r"^PRIORITAS\s*=\s*(\[[^\]]*\])", open(p, encoding="utf-8").read(), re.M)
    return json.loads(m.group(1)) if m else None


def periksa(reg, akar=AKAR):
    """Daftar galat (list of str); kosong berarti sah."""
    g = []
    if not isinstance(reg, dict) or reg.get("versi") != 1 or not isinstance(reg.get("bencana"), list) or not reg["bencana"]:
        return ["registry harus {versi: 1, bencana: [..]} dan tidak kosong"]
    seen = {k: {} for k in ("id", "rute", "data", "awalan", "ikon", "bahaya")}

    def unik(jenis, nilai, id_):
        if nilai in seen[jenis]:
            g.append(f"{id_}: {jenis} '{nilai}' ganda dengan {seen[jenis][nilai]}")
        else:
            seen[jenis][nilai] = id_

    for i, b in enumerate(reg["bencana"]):
        id_ = b.get("id", f"#{i}") if isinstance(b, dict) else f"#{i}"
        if not isinstance(b, dict):
            g.append(f"{id_}: entri bukan objek")
            continue
        for k, t in WAJIB.items():
            if k not in b:
                g.append(f"{id_}: medan '{k}' hilang")
            elif not isinstance(b[k], t):
                g.append(f"{id_}: '{k}' harus {t.__name__}")
        if g and any(s.startswith(f"{id_}: medan") or s.startswith(f"{id_}: '") for s in g):
            continue
        if not SLUG.match(b["id"]):
            g.append(f"{id_}: id harus huruf kecil/angka/garis bawah")
        unik("id", b["id"], id_)
        unik("rute", b["rute"], id_)
        unik("data", b["data"], id_)
        unik("ikon", b["ikon"], id_)
        if b["status"] not in STATUS:
            g.append(f"{id_}: status '{b['status']}' bukan salah satu {'/'.join(STATUS)}")
        for k in ("rute", "data"):
            if not (b[k].startswith("/") and b[k].endswith("/")):
                g.append(f"{id_}: {k} '{b[k]}' harus diawali dan diakhiri '/'")
        if not HEX.match(b["warna"]):
            g.append(f"{id_}: warna '{b['warna']}' bukan #rrggbb")
        kj = b["kejadian"]
        if not (isinstance(kj.get("awalan"), str) and re.match(r"^[A-Z]$", kj["awalan"])) or not kj.get("nama") or not kj.get("nama_jamak"):
            g.append(f"{id_}: kejadian butuh awalan satu huruf besar, nama, nama_jamak")
        else:
            unik("awalan", kj["awalan"], id_)
        kode = [t.get("kode") for t in b["tingkat"] if isinstance(t, dict)]
        if len(b["tingkat"]) < 2 or kode != list(range(len(b["tingkat"]))):
            g.append(f"{id_}: tingkat harus berkode 0..n berurutan, minimal dua")
        for t in b["tingkat"]:
            if not (isinstance(t, dict) and t.get("nama") and HEX.match(str(t.get("warna", "")))):
                g.append(f"{id_}: tiap tingkat butuh nama dan warna #rrggbb")
                break
        fk = b["foto_kategori"]
        if not fk or any(not (isinstance(x, list) and len(x) == 2 and SLUG.match(str(x[0])) and x[1]) for x in fk) \
                or len({x[0] for x in fk if isinstance(x, list) and x}) != len(fk):
            g.append(f"{id_}: foto_kategori harus [[slug, label], ..] tanpa slug ganda")
        if not b["lapor_bahaya"] or any(not isinstance(x, str) or not SLUG.match(x) for x in b["lapor_bahaya"]):
            g.append(f"{id_}: lapor_bahaya harus daftar slug dan tidak kosong")
        else:
            for x in b["lapor_bahaya"]:
                unik("bahaya", x, id_)
        for s in b["sumber_status"]:
            if not (isinstance(s, list) and len(s) == 3 and isinstance(s[0], str) and isinstance(s[1], str) and s[1].startswith("/")
                    and (s[2] is None or isinstance(s[2], (int, float)))):
                g.append(f"{id_}: sumber_status harus [[nama, jalur, ambang_jam|null], ..]")
                break
        if any(t not in b["tab"] for t in b["tab_sembunyi"]):
            g.append(f"{id_}: tab_sembunyi memuat tab yang tidak ada di tab")
        if b["status"] != "mati":
            if not os.path.isdir(os.path.join(akar, "public" + b["data"])):
                g.append(f"{id_}: folder data public{b['data']} tidak ada")
            if not os.path.exists(os.path.join(akar, ".github/workflows", b["workflow"])):
                g.append(f"{id_}: workflow {b['workflow']} tidak ada")
        for s in _teks(b):
            if "—" in s:
                g.append(f"{id_}: em dash dilarang di teks ({s[:40]!r})")
                break
        if b["id"] == "karhutla":
            ref = _prioritas_wilayah(akar)
            if ref is not None and b["prioritas"] != ref:
                g.append(f"karhutla: prioritas {b['prioritas']} beda dengan PRIORITAS di scripts/data/wilayah.py {ref}")
    return g


def bangkitkan(reg):
    """Isi src/bencana.generated.js, deterministik."""
    return KEPALA + "export default " + json.dumps(reg, ensure_ascii=False, indent=2) + ";\n"


def cek():
    g = periksa(baca())
    for s in g:
        print("GALAT", s)
    if not g:
        n = len(baca()["bencana"])
        print(f"bencana.json sah: {n} entri")
    return 1 if g else 0


def js():
    isi = bangkitkan(baca())
    with open(JS_KELUAR, "w", encoding="utf-8") as f:
        f.write(isi)
    print(f"tulis {os.path.relpath(JS_KELUAR, AKAR)} ({len(isi)} byte)")
    return 0


def _uji():
    import copy
    reg = baca()
    assert periksa(reg) == [], periksa(reg)
    assert bangkitkan(reg) == bangkitkan(json.loads(json.dumps(reg))), "pembangkitan tidak deterministik"
    assert bangkitkan(reg).startswith(KEPALA) and bangkitkan(reg).rstrip().endswith("};")

    def rusak(f, kata):
        r = copy.deepcopy(reg)
        f(r["bencana"])
        g = periksa(r)
        assert any(kata in s for s in g), (kata, g)

    rusak(lambda b: b[1].update(id="karhutla"), "ganda")
    rusak(lambda b: b[2].update(rute="/gempa"), "diawali dan diakhiri")
    rusak(lambda b: b[2].update(status="beta"), "status")
    rusak(lambda b: b[3]["kejadian"].update(awalan="G"), "awalan")
    rusak(lambda b: b[0].update(prioritas=["62"]), "prioritas")
    rusak(lambda b: b[1].update(data="/tidak-ada/"), "folder data")
    rusak(lambda b: b[4].pop("kata"), "'kata' hilang")
    rusak(lambda b: b[4].update(nama_en="a — b"), "em dash")
    print("bencana.py: self-check lolos")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else None
    if perintah == "cek":
        sys.exit(cek())
    if perintah == "js":
        sys.exit(js())
    if perintah is None:
        _uji()
    else:
        print(__doc__)
        sys.exit(2)
