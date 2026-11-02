/* PDF laporan BNPB (data/laporan-bnpb/generator/pdf.py) hanya boleh memuat Roboto, bukan serif fallback. Lewati bila soffice/pdffonts tak ada. */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import {mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const ada = (c) => spawnSync("which", [c]).status === 0 || spawnSync("test", ["-x", "/Applications/LibreOffice.app/Contents/MacOS/soffice"]).status === 0;
const lewati = !(ada("pdffonts") && ada("soffice"));
uji("ke_pdf: pdffonts hanya Roboto", {skip: lewati && "soffice/pdffonts tidak ada"}, () => {
  const d = mkdtempSync(join(tmpdir(), "pdf-font-"));
  const ns = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"';
  const p = join(d, "kecil.fodt");   // dokumen mini (LibreOffice membaca apa pun); ke_pdf tidak peduli ekstensi
  writeFileSync(p, `<?xml version="1.0" encoding="UTF-8"?><office:document ${ns} office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.text"><office:font-face-decls><style:font-face style:name="Roboto" svg:font-family="Roboto"/></office:font-face-decls><office:automatic-styles><style:style style:name="T" style:family="paragraph"><style:text-properties style:font-name="Roboto" fo:font-size="24pt"/></style:style></office:automatic-styles><office:body><office:text><text:p text:style-name="T">Laporan Karhutla Roboto</text:p></office:text></office:body></office:document>`);
  const pdf = execFileSync("python3", ["-c", "import sys; sys.path.insert(0,'data/laporan-bnpb/generator'); import pdf; print(pdf.ke_pdf(sys.argv[1]))", p]).toString().trim();
  const nama = execFileSync("pdffonts", [pdf]).toString().split("\n").slice(2).filter(Boolean).map((l) => l.split(/\s+/)[0]);
  assert.ok(nama.length > 0, "PDF memuat font");
  for (const n of nama) assert.match(n, /Roboto/, `font bukan Roboto: ${n}`);
});
