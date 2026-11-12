/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");
const sortBtn = document.getElementById("sortBtn");
let currentItems = [];

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in and allow toggling between Live and Sample mode
function updateModeUI() {
  modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
  modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);
}

modeBadge.addEventListener("click", () => {
  USE_SAMPLE_DATA = !USE_SAMPLE_DATA;
  updateModeUI();
  setStatus(
    USE_SAMPLE_DATA
      ? "Switched to Sample data (offline mode)."
      : "Switched to Live mode (TVmaze API).",
    "info"
  );

  const query = input.value.trim();
  if (query) {
    searchShows(query);
  }
});

updateModeUI();

// STEP 1 — Your first API request

//- Wrote a test function (testRequest) that fetched searchURL("friends") and
//-logged the status and JSON, to confirm the request works.
//- Deleted it afterward because it ran on every save and used up requests.

// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array
// STEP 2 — Search and show the results
/*renderResults(items) builds one <button class="card"> per show (poster, title, years, genres, rating or "Not rated yet") with data-id = show.id. 
It unwraps { show } with destructuring and uses replaceChildren() so each search replaces the old cards. 
The submit listener calls preventDefault(), trims the input, and ignores empty input. */

// TODO: renderResults(items), searchShows(query), and a submit listener on the form
function renderResults(items) {
  results.replaceChildren(
    ...items.map(({ show }) => {
      const card = el("button", "card");
      card.type = "button";
      card.dataset.id = show.id;

      card.append(
        createPoster(show),
        el("span", "title", show.name),
        el("span", "year", yearRange(show)),
        el("span", "genres", show.genres.join(", ")),
        el("span", "rating", show.rating.average ? `★ ${show.rating.average}` : "Not rated yet")
      );
      return card;
    })
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (query) searchShows(query);
});
// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check
/* getJSON(url) handles every failure: network error ("Can't reach TVmaze"), HTTP 429 ("Too many requests"), and !response.ok
 (404 and others, since fetch doesn't reject on those). searchShows uses try/catch, a loading status, a "No shows found"
  message for an empty array, and a correct "1 show" / "6 shows" count. */
async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Can't reach TVmaze. Check your internet, or use sample mode.");
  }

  if (response.status === 429) {
    throw new Error("Too many requests. Wait 10 seconds and try again.");
  }
  if (!response.ok) {
    throw new Error(
      USE_SAMPLE_DATA
        ? "Sample mode only knows: friends, office, breaking bad, stranger things, sherlock, thrones, sample."
        : `Request failed (HTTP ${response.status}).`
    );
  }
  return response.json();
}

async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.replaceChildren();

  try {
    const data = await getJSON(searchURL(query));

    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }

    currentItems = data; // save for the sort button
    renderResults(data);
    const n = data.length;
    setStatus(`${n} show${n === 1 ? "" : "s"} found for "${query}"`, "info");
  } catch (error) {
    setStatus(error.message, "error");
  }
}
// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)
/*One click listener on #results (event delegation) uses closest(".card") to find the clicked card.
 showDetails(id) shows "Loading details…", opens the pop-up with showModal(), and shows errors inside it. 
 renderDetails handles null network, runtime, and rating, and shows the summary with stripTags() and textContent, never innerHTML. */
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const start = performance.now();
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);
    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);

    renderDetails(show, cast, seasons);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

function renderDetails(show, cast, seasons) {
  const where = show.network?.name ?? show.webChannel?.name;
  const minutes = show.runtime ?? show.averageRuntime;
  const rating = show.rating.average;

  const count = seasons.length;
  const seasonText = `${count} season${count === 1 ? "" : "s"}`;

  const meta = [yearRange(show), seasonText, where, show.genres.join(", "), minutes && `${minutes} min`]
    .filter(Boolean)
    .join(" · ");

  const list = el("ul", "cast");
  list.append(
    ...cast.slice(0, 6).map(({ person, character }) => {
      const li = el("li", "", person.name + " ");
      li.append(el("span", "", "as " + character.name));
      return li;
    })
  );

  const link = Object.assign(el("a", "", "View on TVmaze ↗"), {
    href: show.url,
    target: "_blank",
    rel: "noopener",
  });
  const links = el("p", "links");
  links.append(link);

  const info = el("div", "info");
  info.append(
    el("h2", "", show.name),
    el("p", "meta", meta),
    el("p", "score", rating ? `★ ${rating} / 10` : "Not rated yet"),
    el("p", "plot", stripTags(show.summary)),
    list,
    links
  );

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)
/* showDetails now runs showURL, castURL, and seasonsURL together with Promise.all and logs "3 requests in … ms".
 renderDetails(show, cast, seasons) adds the season count ("1 season" / "5 seasons") and up to 6 cast members ("Actor as Character").
  If any request fails, the pop-up shows an error. */

// STEP 6 (Challenge 5) — Sort by rating: top rated first, unrated / null last
/*(Sort by rating): A "Top rated first" button sorts a copy of currentItems by rating, highest first, with null ratings last (?? -1), then calls renderResults. */
sortBtn.addEventListener("click", () => {
  if (currentItems.length === 0) return;

  const sorted = [...currentItems].sort((a, b) => {
    const ratingA = a.show.rating?.average ?? -1;
    const ratingB = b.show.rating?.average ?? -1;
    return ratingB - ratingA;
  });

  renderResults(sorted);
});
