"""Self-check logika murni (fixture buatan): python3 -I scripts/akademisi/pemutakhiran/uji_inti.py"""
import datetime, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import inti as I

kini = datetime.date(2026, 10, 30)
assert I.hari_sejak("2026-10-30", kini) == 0 and I.hari_sejak("", kini) > 10**5 and I.hari_sejak("bukan-tanggal", kini) > 10**5
# ambang 180 hari: tepat 180 belum, 181 sudah; tanpa web tak pernah dirayap
tgl = lambda n: (kini - datetime.timedelta(days=n)).isoformat()
assert not I.perlu_rayap({"web": "https://a.id", "diperiksa": tgl(180)}, kini)
assert I.perlu_rayap({"web": "https://a.id", "diperiksa": tgl(181)}, kini)
assert I.perlu_rayap({"web": "https://a.id"}, kini)
assert not I.perlu_rayap({"diperiksa": tgl(999)}, kini)
assert I.perlu_rayap({"web": "https://a.id", "diperiksa": tgl(1)}, kini, pindah=True)
# situs pindah: www. dan jalur diabaikan, domain lain terdeteksi
assert not I.situs_pindah("https://www.a.id", "https://a.id/beranda")
assert I.situs_pindah("https://a.id", "https://b.com/")
assert not I.situs_pindah("https://a.id", "")
# status: 403 bukan mati
assert [I.status_dari(c) for c in (200, 301, 403, 429, 404, 500, 0)] == ["hidup", "hidup", "menolak", "menolak", "mati", "mati", "mati"]
assert I.status_dari(200, tantangan=True) == "menolak"
# normalisasi + beda kontak
assert I.norm("email", " Ab@X.ID ") == "ab@x.id" and I.norm("telepon", "+62 761-123") == "+62761123"
assert I.norm("telepon", "0761-123") == "+62761123" == I.norm("telepon", "62761123")
assert I.bandingkan(["A@x.id"], ["a@x.id"], "email") == ([], [])
assert I.bandingkan(["+62761111"], ["+62761222"], "telepon") == (["+62761222"], ["+62761111"])
assert I.bandingkan(["+62761111"], [], "telepon") == ([], []), "rayap tak menemukan apa pun: bukan bukti nomor mati"
# samar: tidak membocorkan utuh
p = I.perubahan_kontak("l1", {"email": ["kepala@bpbd.go.id"], "telepon": ["+62761111111"]}, {"email": ["baru@bpbd.go.id"], "telepon": ["+62761111111"]})
assert p == [{"id": "l1", "butir": "email", "lama": ["ke***@bpbd.go.id"], "baru": ["ba***@bpbd.go.id"]}], p
assert I.samarkan("telepon", "+62761111111") == "+6276***111" and "kepala" not in str(p)
assert I.perubahan_kontak("l2", {"wa": ["+628111"]}, {"wa": ["+628111"]}) == []
r = I.laporan("2026-10", {"b": 1, "a": 2}, p, ["z", "y"], ["n1"], 3)
assert list(r["jumlah"]) == ["a", "b"] and r["situs_mati"] == ["y", "z"] and r["berita_baru"] == 3
# anti-SSRF: host internal ditolak TANPA koneksi (urlopen diganti penjebak), host publik lolos (getaddrinfo dipalsukan)
import socket, rayap as R
for u in ("http://127.0.0.1/", "http://169.254.169.254/latest/", "http://10.0.0.1/", "http://[::1]/", "http://192.168.1.1/", "ftp://example.org/", "file:///etc/passwd"):
    assert not R.host_aman(u), u
    R.OPENER.open = lambda *a, **k: (_ for _ in ()).throw(AssertionError("koneksi terjadi"))
    assert R.fetch(u) == (0, "", u, False), u
asli = socket.getaddrinfo
socket.getaddrinfo = lambda h, *a, **k: [(2, 1, 6, "", ("93.184.216.34", 443))]
assert R.host_aman("https://example.org/")
socket.getaddrinfo = lambda h, *a, **k: [(2, 1, 6, "", ("93.184.216.34", 443)), (2, 1, 6, "", ("10.0.0.5", 443))]
assert not R.host_aman("https://campuran.example/"), "satu IP privat cukup untuk menolak"
socket.getaddrinfo = asli
# berita.ambil memakai penjaga yang sama: host dipalsukan privat -> None tanpa koneksi
import berita as B
socket.getaddrinfo = lambda h, *a, **k: [(2, 1, 6, "", ("127.0.0.1", 443))]
assert B.ambil("tes") is None
socket.getaddrinfo = asli
print("uji_inti: OK")
