const API = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org";

// Open Library has no "bestseller" ranking for authors or genres, so these
// are curated from current US bestseller lists. Details are fetched live.
const TOP_AUTHORS = [
  "Stephen King",
  "Colleen Hoover",
  "Freida McFadden",
  "James Patterson",
  "Sarah J. Maas",
  "Rebecca Yarros",
  "Emily Henry",
  "John Grisham",
  "Nora Roberts",
  "Danielle Steel",
];

const TOP_GENRES = [
  { name: "Romance", subject: "romance" },
  { name: "Fantasy", subject: "fantasy" },
  { name: "Thriller", subject: "thrillers" },
];

const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

function skeletons(el, n, cls) {
  el.innerHTML = Array.from({ length: n }, () => `<li class="skeleton ${cls}"></li>`).join("");
}

// Top 5 books: Open Library's weekly trending list
async function loadBooks() {
  const el = $("books");
  skeletons(el, 5, "cover");
  try {
    const { works } = await getJSON(`${API}/trending/weekly.json?limit=5`);
    el.innerHTML = works.slice(0, 5).map((w, i) => `
      <li class="book">
        <a href="${API}${w.key}" target="_blank" rel="noopener">
          <div class="cover">
            ${w.cover_i
              ? `<img src="${COVERS}/b/id/${w.cover_i}-L.jpg" alt="${esc(w.title)}" loading="lazy">`
              : `<span class="fallback">${esc(w.title)}</span>`}
          </div>
          <p class="rank">No. ${i + 1}</p>
          <p class="title">${esc(w.title)}</p>
          <p class="byline">${esc((w.author_name || ["Unknown author"])[0])}</p>
        </a>
      </li>`).join("");
  } catch {
    el.innerHTML = `<p class="error">Couldn't load books right now.</p>`;
  }
}

// Top 3 genres: subject pages with a few representative covers
async function loadGenres() {
  const el = $("genres");
  el.innerHTML = TOP_GENRES.map(() => `<div class="genre skeleton" style="height:200px"></div>`).join("");
  const cards = await Promise.all(TOP_GENRES.map(async (g) => {
    let count = "", stack = "";
    try {
      const data = await getJSON(`${API}/subjects/${g.subject}.json?limit=5`);
      count = `${data.work_count.toLocaleString()} works`;
      stack = data.works.filter((w) => w.cover_id).slice(0, 5)
        .map((w) => `<img src="${COVERS}/b/id/${w.cover_id}-M.jpg" alt="${esc(w.title)}" loading="lazy">`).join("");
    } catch {}
    return `
      <a class="genre" href="${API}/subjects/${g.subject}" target="_blank" rel="noopener">
        <h3>${g.name}</h3>
        <p class="count">${count}</p>
        <div class="stack">${stack}</div>
      </a>`;
  }));
  el.innerHTML = cards.join("");
}

// Top 10 authors: look each one up for photo, top work and work count
async function loadAuthors() {
  const el = $("authors");
  const rows = await Promise.all(TOP_AUTHORS.map(async (name, i) => {
    let href = `${API}/search/authors?q=${encodeURIComponent(name)}`;
    let meta = "";
    let avatar = esc(initials(name));
    try {
      const { docs } = await getJSON(`${API}/search/authors.json?q=${encodeURIComponent(name)}&limit=1`);
      const a = docs[0];
      if (a) {
        href = `${API}/authors/${a.key}`;
        meta = [a.top_work, a.work_count && `${a.work_count.toLocaleString()} works`].filter(Boolean).map(esc).join(" · ");
        avatar = `<img src="${COVERS}/a/olid/${a.key}-M.jpg?default=false" alt="" loading="lazy"
                   onerror="this.replaceWith(document.createTextNode('${esc(initials(name))}'))">`;
      }
    } catch {}
    return `
      <li class="author">
        <a href="${href}" target="_blank" rel="noopener">
          <span class="pos">${i + 1}</span>
          <span class="avatar">${avatar}</span>
          <div>
            <p class="name">${esc(name)}</p>
            <p class="meta">${meta}</p>
          </div>
        </a>
      </li>`;
  }));
  el.innerHTML = rows.join("");
}

// Theme: light, dark, or follow the system
function setTheme(choice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try { localStorage.setItem("theme", choice); } catch {}
  document.querySelectorAll("[data-theme-choice]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.themeChoice === choice)));
}

document.querySelectorAll("[data-theme-choice]").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.themeChoice)));
setTheme(document.documentElement.dataset.theme || "system");

// Greeting by time of day
const hour = new Date().getHours();
const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
$("greeting").textContent = `Good ${part}, Daniella.`;

loadBooks();
loadGenres();
loadAuthors();
