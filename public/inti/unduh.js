/* unduh.js: simpan Blob sebagai berkas lewat tautan sementara. Dipakai /paparan dan /laporan-bnpb (window.unduhBlob). */
window.unduhBlob = (blob, nama) => { const a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = nama; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
