"""Unduh stdlib dengan coba-ulang 4x (jeda naik), jeda sopan per host, galat 4xx (selain 429/403) tidak diulang.
Dipakai modul panen sinyal (#35-41). Kunci dibaca dari env oleh pemanggil, tidak pernah dicatat di sini."""
import json, sys, time, urllib.error, urllib.request

_TERAKHIR = {}


class Ditolak(RuntimeError):
    """429/403 berulang: berhenti, jangan dipaksa (best-effort)."""


def jeda(host, detik):
    t = _TERAKHIR.get(host, 0) + detik - time.time()
    if t > 0:
        time.sleep(t)
    _TERAKHIR[host] = time.time()


def ambil(url, data=None, kepala=None, coba=4, jeda_host=0.0, batas=60, mentah=False):
    """-> JSON (atau bytes bila mentah). Ulang 4x dengan jeda 5/15/45 dtk; 429 berulang -> Ditolak."""
    host = url.split("/")[2]
    for i in range(coba):
        jeda(host, jeda_host)
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "pantau-bencana/1.0 (https://github.com/pangantara)", **(kepala or {})})
            with urllib.request.urlopen(req, timeout=batas) as r:
                isi = r.read()
            return isi if mentah else json.loads(isi)
        except urllib.error.HTTPError as e:
            if e.code in (429, 403) and i == coba - 1:
                raise Ditolak(f"{host}: HTTP {e.code}")
            if 400 <= e.code < 500 and e.code not in (429, 403):
                raise RuntimeError(f"{host}: HTTP {e.code}")
            print(f"  {host} HTTP {e.code}, ulang", file=sys.stderr)
        except (OSError, ValueError) as e:  # termasuk JSON rusak / teks penolakan non-JSON
            if i == coba - 1:
                raise Ditolak(f"{host}: {e}") if "Expecting value" in str(e) else RuntimeError(f"{host}: {e}")
        time.sleep(5 * 3 ** i)


if __name__ == "__main__":
    jeda("x", 0)
    t = time.time(); jeda("x", 0.2); assert time.time() - t >= 0.15
    print("uji jaring: ok")
