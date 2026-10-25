REM Dipasang bangun.py ke profil LibreOffice pribadi (keluaran/.lo-profil) sebagai Standard.Module1.
REM DOCX -> PDF. Hasil bidang TOC tersimpan dibiarkan (UpdateDocMode 0), catatan kaki diberi nomor per bab
REM (Word: numRestart eachSect; LibreOffice tidak membacanya dari DOCX), dan penanda Word diekspor sebagai
REM tujuan bernama PDF supaya bangun.py bisa membaca halaman tiap judul dan keterangan.
Sub Ekspor(sMasuk As String, sPdf As String)
  Dim a(1) As New com.sun.star.beans.PropertyValue
  a(0).Name = "Hidden" : a(0).Value = True
  a(1).Name = "UpdateDocMode" : a(1).Value = 0
  oDoc = StarDesktop.loadComponentFromURL(ConvertToURL(sMasuk), "_blank", 0, a())
  oDoc.FootnoteSettings.FootnoteCounting = com.sun.star.text.FootnoteNumbering.PER_CHAPTER
  Dim fd(0) As New com.sun.star.beans.PropertyValue
  fd(0).Name = "ExportBookmarksToPDFDestination" : fd(0).Value = True
  Dim p(1) As New com.sun.star.beans.PropertyValue
  p(0).Name = "FilterName" : p(0).Value = "writer_pdf_Export"
  p(1).Name = "FilterData" : p(1).Value = fd()
  oDoc.storeToURL(ConvertToURL(sPdf), p())
  oDoc.close(True)
  StarDesktop.terminate()
End Sub
