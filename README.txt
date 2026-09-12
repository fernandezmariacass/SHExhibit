SHExhibit of the South — README
================================

FILES
-----
index.html   The whole site: Front Page (hero), Artworks section, About Us section.
style.css    All styling — fonts, colors, arch cards, modal, responsive rules.
script.js    Loads data.json, builds the artwork cards, runs the modal + nav.
data.json    All your content: artworks, categories, and About Us info.
img/         Photos. hero-banner.jpg is already in place.

IMPORTANT — VIEWING THE SITE LOCALLY
-------------------------------------
Browsers block a page from loading data.json when you just double-click
index.html (this is a security rule for "file://" pages, not a bug in
this site). You have two easy options:

Option A — Run a local server (takes 10 seconds)
  1. Open a terminal in this folder.
  2. Run:  python3 -m http.server 8000
  3. Open http://localhost:8000 in your browser.

Option B — Skip the local server
  Just upload the whole folder to GitHub Pages (see earlier instructions).
  data.json loads normally once the site is hosted online — this only
  affects opening the file directly from your computer.

EDITING CONTENT
----------------
- To add/edit artworks: open data.json and copy an existing block inside
  the "artworks" list. Give it a unique artwork_id and a list of
  artwork_tags — any tag used there should also be added to the "tags"
  list at the top so it shows up as a filter pill.
- To edit the About Us section: change the fields inside "about".
  - "team_members" holds one object per person (6 total): "name", "role",
    "photo" (path to their picture), and "socials" (gmail / facebook /
    linkedin links). Right now every "photo" points at the same
    placeholder silhouette (img/team/placeholder-avatar.svg) and every
    social link is "#" — replace these with your real photos and profile
    links whenever you're ready, one member at a time. Photos work best
    as upright (portrait) images, since the cards are shaped for that.
- To change the hero photo: replace img/hero-banner.jpg with your own
  image (same filename), or update the <img src="..."> path in
  index.html's #home section.

FONTS & COLORS
---------------
Defined once at the top of style.css under :root — change --bg, --text,
--accent, or the font names there to update the whole site at once.
