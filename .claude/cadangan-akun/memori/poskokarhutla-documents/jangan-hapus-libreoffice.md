---
name: jangan-hapus-libreoffice
description: LibreOffice.app and its profile must never be removed during disk cleanups; deck engine and .doc conversion depend on it
metadata:
  node_type: memory
  type: project
  originSessionId: 30422419-d8a9-4e61-8a0c-631049f8b0fc
  modified: 2026-10-31T15:49:32.478Z
---

LibreOffice (/Applications/LibreOffice.app, Homebrew cask, `soffice` at /opt/homebrew/bin) and its profile ~/Library/Application Support/LibreOffice must stay on the owner's Mac.

**Why:** ppt-konsultan deck engine uses it for PDF export, self-check gates, and visual checks; there is no Keynote/PowerPoint. It was deleted once and reinstalled (31 Oct 2026). Also used to convert old Pusdalops .doc logbooks to .docx.

**How to apply:** when suggesting disk cleanup, never list LibreOffice or its Application Support folder as removable. Related: [[ppt-konsultan]]
