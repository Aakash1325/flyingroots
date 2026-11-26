FLYINGROOTS WEBSITE

Open the dist/ folder for the complete, deployable website.
Publish the contents of dist/ to a static host or GitHub Pages.

For a local preview, from this folder run:
python3 -m http.server 8000 --directory dist
Then open http://localhost:8000 in your browser.

Use an HTTP server rather than opening index.html through file://, because the interactive catalogue reads local JSON files.

EDITING
dist/index.html - page structure and content
dist/styles.css - visual design and responsive styles
dist/site.js - interactions and motion
dist/catalogue.json - category and product data
dist/process.json - process stages
dist/images - supplied logo derivatives and generated photography
dist/videos/hero-desktop-v2.mp4 and hero-mobile-v2.mp4 - optimized full-length film for desktop and mobile
The original source film remains in dist/videos/flyingroots-hero.mp4 as an archival source.

Editable build sources are in source/. To regenerate dist/index.html and its text assets, run:
python3 source/build.py

The build uses Python's standard library only. The website itself requires no build tools or package installation.

DEMO BEHAVIOR
Company details are fictional. Contact actions explain the concept instead of contacting anyone. Enquiry forms validate inputs and generate local previews. They do not submit, send, save or retain data across reloads.

See FlyingRoots_Design_Decisions.txt for the design rationale and Quality_Checks.txt for verification details.

Video delivery was optimized on 2026-11-26: desktop H.264 is 1280 x 720 / 6,281,108 bytes; mobile H.264 is 768 x 432 / 1,421,848 bytes. Both preserve the complete approximately 48.6-second film and place MP4 metadata before media data for streaming. A 73,554-byte preview extracted from the same film appears while it starts.

Published on GitHub Pages at https://aakash1325.github.io/flyingroots/. Source changes on main build and publish through .github/workflows/pages.yml.
