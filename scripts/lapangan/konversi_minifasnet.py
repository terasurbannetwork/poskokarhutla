"""Konversi bobot resmi MiniFASNet (minivision-ai/Silent-Face-Anti-Spoofing, Apache-2.0) ke ONNX untuk /petugas.
Pakai: python konversi_minifasnet.py <folder_kerja>   (isi: src/MiniFASNet.py dan pth/*.pth hasil unduhan resmi; butuh torch, onnx, onnxruntime)
Keluar: <folder_kerja>/onnx/<nama>.onnx, masukan 'input' [1,3,80,80] float BGR 0..255 TANPA normalisasi (sama dengan ToTensor resmi), keluaran 'logit' [1,3].
Self-check: logit onnxruntime harus sama dengan torch (selisih < 1e-3) pada masukan acak."""
import sys, os, hashlib
import numpy as np, torch, onnxruntime as ort
sys.path.insert(0, os.path.join(sys.argv[1], "src"))
import MiniFASNet as M

MODEL = {"2.7_80x80_MiniFASNetV2": M.MiniFASNetV2, "4_0_0_80x80_MiniFASNetV1SE": M.MiniFASNetV1SE}
os.makedirs(os.path.join(sys.argv[1], "onnx"), exist_ok=True)
for nama, kelas in MODEL.items():
    h = int(nama.split("_")[-2].split("x")[0]); k = ((h + 15) // 16, (h + 15) // 16)
    m = kelas(conv6_kernel=k)
    sd = torch.load(os.path.join(sys.argv[1], "pth", nama + ".pth"), map_location="cpu")
    sd = {(x[7:] if x.startswith("module.") else x): v for x, v in sd.items()}
    m.load_state_dict(sd); m.eval()
    x = torch.rand(1, 3, h, h) * 255
    out = os.path.join(sys.argv[1], "onnx", nama + ".onnx")
    torch.onnx.export(m, x, out, input_names=["input"], output_names=["logit"], opset_version=13, dynamo=False)
    a = ort.InferenceSession(out).run(None, {"input": x.numpy()})[0]
    with torch.no_grad(): b = m(x).numpy()
    assert np.abs(a - b).max() < 1e-3, (nama, np.abs(a - b).max())
    print(nama, os.path.getsize(out), hashlib.sha256(open(out, "rb").read()).hexdigest(), "selisih", float(np.abs(a - b).max()))
