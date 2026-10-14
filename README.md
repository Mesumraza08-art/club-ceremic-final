# Club Ceramic: website redesign concept

A complete multi-page frontend concept for clubceramic.com. Static HTML, CSS and JavaScript, ready to open locally and present.

## Opening the demo

1. Unzip the folder.
2. Double-click `index.html` (Chrome, Edge or Safari).
3. Everything runs offline. Only "Directions" and "Read all reviews" open Google in a new tab.

The logo intro plays once per browser tab: the four coloured tiles of the Club Ceramic icon slide into place, the wordmark wipes in, and the logo docks into the header. Open `index.html` in a new tab to see it again, or use `index.html?intro=0` to skip it.

## Suggested presentation path (about 5 minutes)

1. `index.html` : intro, hero material selector (hover Porcelain, Stone, SPC, Bathroom), material discovery, collections rail, Explore by Space hotspots, Material Explorer, product hover cards
2. `visualize.html` : pick a room, Floor or Wall, apply materials, drag the compare handle, try A / B and "Upload your room"
3. `lookbook.html` : the book lifts off the table and opens; tap any sample for quick view, try Search, Grid view and Save page
4. `design-your-space.html` : change room, style and colour; save the palette as a project
5. `tiles.html` : filters, counts, sort, mobile bottom sheet (narrow the window)
6. `product-calacatta-gold.html` : gallery, specs, box calculator, add to project, spec sheet
7. `showroom-montreal.html` and `locations.html` : live "open now" status, hours, FAQs
8. `my-project.html` : saved materials grouped into projects, quote for a whole project

## Page map

| Template | File(s) | Planned live URL |
| --- | --- | --- |
| Home | index.html | / |
| Tiles listing and edits | tiles.html, large-format-porcelain-tiles.html, glossy-porcelain-tiles.html, matte-porcelain-tiles.html | /tiles/, /large-format-porcelain-tiles/ ... |
| Product (64 generated) | product-*.html, product.html | /tiles/{slug}/, /spc-flooring/{slug}/ ... |
| Collections | collections.html, collection-*.html (6) | /collections/{slug}/ |
| Bathroom | bathroom.html, bathroom-products.html | /bathroom/, /bathroom/products/ |
| Flooring, materials, kitchen, decoration | spc-flooring.html, materials.html, kitchen.html, decoration.html | |
| Catalogue and lookbook | catalogue.html, lookbook.html | /catalogues/, /lookbook/ |
| Inspiration | inspiration.html, project-*.html (5) | /inspiration/{slug}/ |
| Tools | visualize.html, design-your-space.html, quote.html | |
| Offers, professionals, about | deals.html, professionals.html, about.html | |
| Locations | locations.html, showroom-montreal/mississauga/ottawa/cambridge.html | /locations/{city}/ |
| Journal | journal.html, article-*.html (7) | /journal/{slug}/ |
| Utility | contact.html, search.html, saved.html, my-project.html, spec-sheet.html, 404.html | |

Each page has a unique title, description, canonical URL, one H1, breadcrumbs and JSON-LD (Organization, LocalBusiness x4, Product, BreadcrumbList, FAQPage, Article). `sitemap.xml` and `robots.txt` are included and use the planned live URLs.

## What is real and what is placeholder

Taken from the current clubceramic.com: the Club Ceramic logo (four coloured tiles, CLUB CERAMIC, Renovation Center), product names, categories, finishes, sizes, SPC thickness range, bathroom category counts, the 241 tile count, current offer prices (Montreal only), showroom addresses, phone numbers, emails and opening hours, Google review text, Tabit buy now pay later, and company background.

Placeholders to replace before launch:

- **Imagery.** Interior and showroom photos are AI-generated stand-ins. Tile swatches are procedurally generated textures. Real product scans and installation photos drop straight into `assets/img/`.
- **Product data.** `assets/js/data.js` holds a 64-product demo catalogue. Box coverage, pieces per box, availability and collection groupings are illustrative and should come from the WooCommerce feed and the packing details table. Five tile names (Calacatta Gold, Subway Bianco, Terrazzo Bianco, Rovere Natural, Pietra Graphite) and the generic bathroom and materials items were added to show the range.
- **Forms.** Quote, contact, trade account and newsletter forms show success states but do not send anything yet.
- **Saved materials and projects** are stored in the browser (localStorage). In production they would sync to a customer account.

## Logo files

The logo is the real Club Ceramic logo from the current site, rebuilt at high resolution so it stays sharp on retina screens. The four-tile icon is vector (`club-ceramic-icon.svg`), the CLUB CERAMIC lettering comes from the brand's own artwork, and Renovation Center is set in Nunito Sans ExtraBold to match. If the client has original vector files (AI, EPS or SVG), swap them into `assets/img/brand/` using the same file names.

## Technology

- HTML5, CSS3, vanilla JavaScript, no build step required to run
- GSAP + ScrollTrigger (motion), Lenis (smooth scrolling), Swiper (product galleries), bundled locally in `assets/js/vendor/`
- Fonts: Newsreader and Archivo (Google Fonts, open license), embedded so they work offline
- Respects `prefers-reduced-motion`, keyboard focus states, semantic headings and ARIA on interactive parts
- Tested at 1920, 1440, 1280, 1024, 768, 430 and 390 px wide

## Folder structure

```
index.html and 115 other pages
assets/css/main.css        design system and all components
assets/js/app.js           interaction layer (every module boots only if its markup is present)
assets/js/data.js          catalogue, collections, showrooms, visualizer room geometry
assets/js/vendor/          gsap, ScrollTrigger, lenis, swiper
assets/img/photo/          interiors and showrooms (3 sizes each, WebP)
assets/img/tex/            tile surface swatches (2 sizes each, WebP)
assets/img/viz/            visualizer rooms with lighting and highlight maps
assets/img/brand/          Club Ceramic logo: white and dark versions (240, 480, 960 px wide), icon SVG
assets/docs/               downloadable lookbook PDF
```
