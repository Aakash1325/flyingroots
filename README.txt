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
dist/videos/flyingroots-hero.mp4 - unchanged original supplied film

Editable build sources are in source/. To regenerate dist/index.html and its text assets, run:
python3 source/build.py

The build uses Python's standard library only. The website itself requires no build tools or package installation.

DEMO BEHAVIOR
Company details are fictional. Contact actions explain the concept instead of contacting anyone. Enquiry forms validate inputs and generate local previews. They do not submit, send, save or retain data across reloads.

See FlyingRoots_Design_Decisions.txt for the design rationale and Quality_Checks.txt for verification details.

The supplied video remains 1280 x 720 and approximately 45 MB. It has not been compressed or re-encoded.

GitHub repository selection, publication and portfolio integration are pending the chosen destination. This archive is ready for review and deployment.
