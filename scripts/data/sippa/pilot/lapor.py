"""Lapor status renlap ke worker: python3 lapor.py <renlap_id> <jalan|siap|gagal> [galat]
POST /api/sippa/renlap/<id>/selesai, header x-renlap-waktu (detik epoch UTC) dan x-renlap-kunci = HMAC-SHA256 hex
(kunci env RENLAP_KUNCI) atas "<id>|<waktu>". Kunci dan tanda tangan tidak pernah dicetak. Selisih waktu > 300 detik ditolak server.
Env RENLAP_API (bawaan https://centurisk97.id). Self-check tanpa jaringan: python3 lapor.py uji"""
import hashlib, hmac, json, os, re, sys, time, urllib.request


def tanda(kunci, rid, waktu):
    return hmac.new(kunci.encode(), f"{rid}|{waktu}".encode(), hashlib.sha256).hexdigest()


def lapor(rid, status, galat=None):
    assert re.fullmatch(r"[A-Za-z0-9_-]{1,64}", rid) and status in ("jalan", "siap", "gagal")
    t = int(time.time())
    body = {"status": status, **({"galat": galat[:500]} if galat else {})}
    req = urllib.request.Request(f"{os.environ.get('RENLAP_API', 'https://centurisk97.id')}/api/sippa/renlap/{rid}/selesai",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"content-type": "application/json", "x-renlap-waktu": str(t),
                                          "x-renlap-kunci": tanda(os.environ["RENLAP_KUNCI"], rid, t), "User-Agent": "renlap/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        print("lapor", status, r.status)


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        assert tanda("k", "r1", 5) == hmac.new(b"k", b"r1|5", hashlib.sha256).hexdigest() and len(tanda("k", "r1", 5)) == 64
        print("lapor uji ok")
    else:
        try:
            lapor(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
        except Exception as e:                      # jangan bocorkan header; cetak jenis galat saja
            print("lapor gagal:", type(e).__name__, getattr(e, "code", ""), file=sys.stderr)
            sys.exit(1)
