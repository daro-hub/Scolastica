/**
 * Generates the tiny synthetic master.pptx + source.pdf the e2e suite
 * uploads. Before this existed, both e2e.spec.ts and e2e-prod.spec.ts
 * pointed at a real operator's files on a specific Mac's Downloads
 * folder (`/Users/.../swisstransfer_.../Presentazione 1 - fonte.pdf`) —
 * the suite could only ever run on that one machine. Generating fixtures
 * on the fly, the same way backend/tests/conftest.py does for pytest,
 * means the suite is portable and never depends on real client material.
 *
 * Shells out to Python (the backend's own dependencies: python-pptx +
 * PyMuPDF) rather than reimplementing PPTX/PDF writers in JS.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

const PYTHON_SCRIPT = `
import sys
from pptx import Presentation
import fitz

fixtures_dir = sys.argv[1]

prs = Presentation()  # python-pptx's bundled default template — has
                       # "Title Slide", "Title and Content", etc.
prs.save(f"{fixtures_dir}/master.pptx")

doc = fitz.open()
page = doc.new_page()
page.insert_text((72, 72), "Sustainable tourism protects natural and cultural resources.", fontsize=12)
page.insert_text((72, 100), "Globalisation increased the number of people who travel abroad.", fontsize=12)
doc.save(f"{fixtures_dir}/source.pdf")
doc.close()
`

export default async function globalSetup() {
  execFileSync('python', ['-c', PYTHON_SCRIPT, FIXTURES_DIR], { stdio: 'inherit' })
}
