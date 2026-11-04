// OCR tempelan foto (tanggal, koordinat) dengan Vision macOS. Pakai: stempel <gambar>
// Dua lintasan, hasilnya digabung: gambar penuh, lalu pojok kanan-bawah (45% x 40%) diperbesar 3x
// karena tempelan kecil di pojok sering luput di lintasan penuh. Keluaran: teks saja, satu baris per blok.
import Foundation
import Vision
import AppKit

func baca(_ cg: CGImage) -> [String] {
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.usesLanguageCorrection = false
  req.recognitionLanguages = ["id-ID", "en-US"]
  try? VNImageRequestHandler(cgImage: cg).perform([req])
  return (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
}

guard CommandLine.arguments.count > 1,
      let img = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }

var baris = baca(cg)
let w = cg.width, h = cg.height
let pw = Int(Double(w) * 0.45), ph = Int(Double(h) * 0.40)
if let potong = cg.cropping(to: CGRect(x: w - pw, y: h - ph, width: pw, height: ph)),
   let ctx = CGContext(data: nil, width: pw * 3, height: ph * 3, bitsPerComponent: 8, bytesPerRow: 0,
                       space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) {
  ctx.interpolationQuality = .high
  ctx.draw(potong, in: CGRect(x: 0, y: 0, width: pw * 3, height: ph * 3))
  if let besar = ctx.makeImage() { baris += baca(besar) }
}
print(baris.joined(separator: "\n"))
