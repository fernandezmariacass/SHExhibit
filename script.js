/* =====================================================================
   SHExhibit of the South — script.js
   Beginner-friendly JavaScript, commented step by step.
   ===================================================================== */

// Grab the elements we'll need more than once
var tagBar        = document.getElementById("tagBar");
var artworkGrid   = document.getElementById("artworkGrid");
var modalOverlay  = document.getElementById("artworkModal");
var modalClose    = document.getElementById("modalClose");
var navToggle     = document.getElementById("navToggle");
var mainNav       = document.getElementById("mainNav");
var themeToggle   = document.getElementById("themeToggle");

// Keeps track of which tag is currently selected ("All" by default)
var activeTag = "All";

// Filled in once data.json loads, so filtering/modal code can reuse it
var ALL_ARTWORKS = [];

/* ---------------------------------------------------------------------
   1. LOAD data.json AND BUILD THE PAGE
   --------------------------------------------------------------------- */
fetch("data.json")
  .then(function (response) { return response.json(); })
  .then(function (data) {
    ALL_ARTWORKS = data.artworks;
    renderTagBar(data.tags);
    renderGrid(); // shows everything, since activeTag starts as "All"
    renderAbout(data.about);
  })
  .catch(function (err) {
    // If fetch fails (e.g. opened straight from disk), show a friendly
    // message instead of a blank page.
    console.warn("Could not load data.json:", err);
    artworkGrid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;opacity:0.7;">' +
      "Couldn't load data.json. If you opened this file directly from " +
      "your computer, run a local server instead (see the README), or " +
      "upload the whole folder to GitHub Pages." +
      "</p>";
  });

/* ---------------------------------------------------------------------
   2. BUILD THE TAG FILTER BAR
   --------------------------------------------------------------------- */
function renderTagBar(tags) {
  var pillsHtml = "";
  tags.forEach(function (tag) {
    var isActive = tag === activeTag ? " active" : "";
    pillsHtml += '<button class="tag-pill' + isActive + '" data-tag="' + tag + '">' + tag + "</button>";
  });
  tagBar.innerHTML = pillsHtml;

  // Listen for clicks on any pill
  tagBar.addEventListener("click", function (e) {
    var pill = e.target.closest(".tag-pill");
    if (!pill) return;

    activeTag = pill.getAttribute("data-tag");

    // Move the "active" class to whichever pill was just clicked
    tagBar.querySelectorAll(".tag-pill").forEach(function (p) {
      p.classList.toggle("active", p === pill);
    });

    renderGrid();
  });
}

/* ---------------------------------------------------------------------
   3. BUILD THE ARCH IMAGE GRID (filtered by the active tag)
   --------------------------------------------------------------------- */
function renderGrid() {
  // "All" shows everything; otherwise only artworks whose tags include activeTag
  var visible = ALL_ARTWORKS.filter(function (art) {
    return activeTag === "All" || art.artwork_tags.indexOf(activeTag) !== -1;
  });

  var cardsHtml = visible.map(function (art) {
    return (
      '<div class="art-card" data-id="' + art.artwork_id + '" data-tags="' + art.artwork_tags.join(",") + '">' +
        '<div class="art-card-media">' +
          '<img src="' + art.artwork_image + '" alt="' + art.artwork_title + '">' +
          '<div class="art-card-overlay-title">' + art.artwork_title + '</div>' +
        '</div>' +
        '<div class="art-card-body">' +
          '<h3 class="art-card-title">' + art.artwork_title + '</h3>' +
          '<p class="art-card-meta">' + art.artist_name + ' &bull; ' + art.artwork_year + '</p>' +
          '<p class="art-card-desc">' + art.what_we_see + '</p>' +
          '<span class="art-card-link">Read More &rarr;</span>' +
        '</div>' +
      '</div>'
    );
  }).join("");

  artworkGrid.innerHTML = cardsHtml;
}

// Clicking anywhere on a card (the whole thing is just an image) opens the modal
artworkGrid.addEventListener("click", function (e) {
  var card = e.target.closest(".art-card");
  if (!card) return;
  openModal(card.getAttribute("data-id"));
});

/* ---------------------------------------------------------------------
   4. FILL IN THE ABOUT US SECTION
   --------------------------------------------------------------------- */
function renderAbout(about) {
  document.getElementById("groupIntro").textContent = about.group_introduction;
  document.getElementById("courseSection").textContent = about.course_section;
  document.getElementById("whyStatement").textContent = about.why_we_created_statement;
  renderTeamGrid(about.team_members);
}

// Small inline icons so we don't depend on an external icon library.
// Swap the "href" for each member's real profile link inside data.json —
// no need to touch this code.
var SOCIAL_ICONS = {
  gmail:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13Zm2.2.5 7.8 6.2L19.8 6H4.2Zm-.2 1.6V18h16V7.6l-7.5 6-.5.4-.5-.4-7.5-6Z"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 9.5V7.8c0-.8.2-1.3 1.3-1.3H16V3.2C15.7 3.1 14.7 3 13.5 3 11 3 9.3 4.5 9.3 7.4v2.1H6.5V13h2.8v8h3.4v-8h2.7l.4-3.5H12.7v-1.8c0-1 .3-1.7 1.3-1.7Z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3.5 9h3v11.5h-3V9Zm6 0h2.9v1.6h.04c.4-.75 1.4-1.55 2.9-1.55 3.1 0 3.66 2 3.66 4.7v6.75h-3V14.4c0-1.2-.02-2.75-1.68-2.75-1.68 0-1.94 1.3-1.94 2.65v6.2h-3V9Z"/></svg>'
};

function renderTeamGrid(members) {
  var teamGrid = document.getElementById("teamGrid");
  if (!teamGrid || !members) return;

  teamGrid.innerHTML = members.map(function (member) {
    var socials = member.socials || {};
    var socialLinksHtml = Object.keys(SOCIAL_ICONS).map(function (key) {
      var link = socials[key] || "#";
      return (
        '<a class="team-social-link" href="' + link + '" target="_blank" rel="noopener" aria-label="' + key + '">' +
          SOCIAL_ICONS[key] +
        '</a>'
      );
    }).join("");

    return (
      '<div class="team-card">' +
        '<div class="team-card-photo">' +
          '<img src="' + member.photo + '" alt="' + member.name + '">' +
        '</div>' +
        '<h4 class="team-card-name">' + member.name + '</h4>' +
        '<p class="team-card-role">' + member.role + '</p>' +
        '<div class="team-card-socials">' + socialLinksHtml + '</div>' +
      '</div>'
    );
  }).join("");
}

/* ---------------------------------------------------------------------
   5. MODAL / POP-UP LOGIC
   --------------------------------------------------------------------- */
function openModal(artworkId) {
  var art = ALL_ARTWORKS.find(function (a) { return a.artwork_id === artworkId; });
  if (!art) return;

  document.getElementById("modalImage").src = art.hero_image;
  document.getElementById("modalImage").alt = art.artwork_title;
  document.getElementById("modalTitle").textContent = art.artwork_title;
  document.getElementById("modalArtist").textContent = art.artist_name;
  document.getElementById("modalYear").textContent = art.artwork_year;
  document.getElementById("modalType").textContent = art.art_type;
  document.getElementById("modalWhatWeSee").textContent = art.what_we_see;
  document.getElementById("modalInterpretation").textContent = art.our_interpretation;
  document.getElementById("modalWhyChosen").textContent = art.why_we_chose_it;
  document.getElementById("modalPersonal").textContent = art.personal_analysis;

  // Tags shown as small pills inside the modal
  document.getElementById("modalTags").innerHTML = art.artwork_tags
    .map(function (t) { return '<span class="mini-pill">' + t + "</span>"; })
    .join("");

  modalOverlay.classList.add("open");
  modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // stop background from scrolling
}

function closeModal() {
  modalOverlay.classList.remove("open");
  modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);

// Also close if you click the dark overlay outside the modal box
modalOverlay.addEventListener("click", function (e) {
  if (e.target === modalOverlay) closeModal();
});

// Also close with the Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeModal();
});

/* ---------------------------------------------------------------------
   6. MOBILE NAVIGATION TOGGLE
   --------------------------------------------------------------------- */
navToggle.addEventListener("click", function () {
  var isOpen = mainNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

// Close the mobile menu automatically after tapping a nav link
mainNav.querySelectorAll("a").forEach(function (link) {
  link.addEventListener("click", function () {
    mainNav.classList.remove("open");
  });
});

/* ---------------------------------------------------------------------
   7. LIGHT PINK / DARK MODE TOGGLE
   --------------------------------------------------------------------- */
// The order the toggle button cycles through when clicked
var THEME_ORDER = ["light", "dark"];

// Which emoji to show for each theme — shows the icon for the theme
// you'd switch TO next (🌙 while in light mode, ☀️ while in dark mode)
var THEME_ICONS = { light: "🌙", dark: "☀️" };

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("shexhibit-theme", theme);
  themeToggle.textContent = THEME_ICONS[theme];
}

// Load saved theme, if any, on page start
applyTheme(localStorage.getItem("shexhibit-theme") || "light");

themeToggle.addEventListener("click", function () {
  var current = document.documentElement.getAttribute("data-theme");
  var nextIndex = (THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length;
  applyTheme(THEME_ORDER[nextIndex]);
});

/* ---------------------------------------------------------------------
   8. SMOOTH SCROLL for HOME / GALLERY / ABOUT links
   (CSS "scroll-behavior: smooth" in style.css already handles this for
   most browsers — this is a small JS fallback for older ones.)
   --------------------------------------------------------------------- */
document.querySelectorAll('.main-nav a[href^="#"]').forEach(function (link) {
  link.addEventListener("click", function (e) {
    var target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});
