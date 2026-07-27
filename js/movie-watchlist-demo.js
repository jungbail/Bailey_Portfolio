/**
 * Movie Watchlist Planner — browser demo
 * Mirrors the CS 5004 Java/Swing app using the same JSON data.
 */
(function () {
  const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w185";

  const state = {
    allMovies: [],
    workingSet: [],
    watchlist: [],
    genreById: new Map(),
    genreNames: [],
    sortField: "title",
    ascending: true,
    selectedWorking: new Set(),
    selectedWatchlist: new Set(),
    searchResult: null,
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function genreName(id) {
    return state.genreById.get(id) || "Unknown";
  }

  function primaryGenre(movie) {
    if (!movie.genre_ids?.length) return "";
    return genreName(movie.genre_ids[0]);
  }

  function compareMovies(a, b, field, ascending) {
    let cmp = 0;
    switch (field) {
      case "title":
        cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        break;
      case "release_date":
        cmp = (a.release_date || "").localeCompare(b.release_date || "");
        break;
      case "vote_average":
        cmp = a.vote_average - b.vote_average;
        break;
      case "popularity":
        cmp = a.popularity - b.popularity;
        break;
      case "genre":
        cmp = primaryGenre(a).localeCompare(primaryGenre(b), undefined, { sensitivity: "base" });
        break;
      default:
        cmp = 0;
    }
    return ascending ? cmp : -cmp;
  }

  function sortList(movies) {
    return [...movies].sort((a, b) => compareMovies(a, b, state.sortField, state.ascending));
  }

  function applyFilter(criteria) {
    let result = [...state.workingSet];

    const runGenre = (param, include) => {
      const target = param.toLowerCase();
      result = result.filter((movie) => {
        const hasGenre = (movie.genre_ids || []).some(
          (id) => genreName(id).toLowerCase() === target
        );
        return include ? hasGenre : !hasGenre;
      });
    };

    const runNumeric = (field, op, raw) => {
      const value = Number(raw);
      if (Number.isNaN(value)) throw new Error("Please enter a valid number.");
      result = result.filter((movie) => {
        const n = movie[field];
        if (op === ">") return n > value;
        if (op === "<") return n < value;
        return false;
      });
    };

    const runDate = (op, raw) => {
      result = result.filter((movie) => {
        const d = movie.release_date || "";
        if (op === ">") return d > raw;
        if (op === "<") return d < raw;
        return false;
      });
    };

    if (criteria.startsWith("genre==")) runGenre(criteria.slice(7), true);
    else if (criteria.startsWith("genre!=")) runGenre(criteria.slice(7), false);
    else if (criteria.startsWith("popularity>")) runNumeric("popularity", ">", criteria.slice(11));
    else if (criteria.startsWith("popularity<")) runNumeric("popularity", "<", criteria.slice(11));
    else if (criteria.startsWith("vote_average>")) runNumeric("vote_average", ">", criteria.slice(13));
    else if (criteria.startsWith("vote_average<")) runNumeric("vote_average", "<", criteria.slice(13));
    else if (criteria.startsWith("release_date>")) runDate(">", criteria.slice(13));
    else if (criteria.startsWith("release_date<")) runDate("<", criteria.slice(13));

    state.workingSet = sortList(result);
    renderWorkingList();
    showStatus(`Filter applied — ${state.workingSet.length} movie(s) in working list.`, "info");
  }

  function resetWorkingSet() {
    state.workingSet = sortList([...state.allMovies]);
    state.selectedWorking.clear();
    clearSearchDetails();
    renderWorkingList();
    showStatus("Working movie list reset.", "info");
  }

  function searchByTitle(title) {
    const trimmed = title.trim();
    if (!trimmed) {
      clearSearchDetails();
      showStatus("Please enter a movie title.", "error");
      return;
    }

    const match = state.allMovies.find(
      (m) => m.title.toLowerCase() === trimmed.toLowerCase()
    );

    if (match) {
      state.workingSet = [match];
      state.searchResult = match;
      state.selectedWorking.clear();
      renderWorkingList();
      renderSearchDetails(match);
      showStatus(`Movie found: ${match.title}`, "success");
      return;
    }

    const partial = state.allMovies.filter((m) =>
      m.title.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (partial.length) {
      state.workingSet = sortList(partial);
      state.searchResult = partial[0];
      renderWorkingList();
      renderSearchDetails(partial[0]);
      showStatus(`Found ${partial.length} matching title(s). Showing closest match.`, "info");
      return;
    }

    clearSearchDetails();
    showStatus("Movie not found in local catalog.", "error");
  }

  function clearSearchDetails() {
    state.searchResult = null;
    els.searchOverview.textContent = "Search for a title to see details here.";
    els.searchPopularity.textContent = "—";
    els.searchVote.textContent = "—";
    els.searchDate.textContent = "—";
    els.searchPoster.src = "";
    els.searchPoster.alt = "";
    els.searchPoster.hidden = true;
    els.searchPosterPlaceholder.hidden = false;
  }

  function renderSearchDetails(movie) {
    els.searchOverview.textContent = movie.overview || "No overview available.";
    els.searchPopularity.textContent = movie.popularity?.toFixed(2) ?? "—";
    els.searchVote.textContent = movie.vote_average?.toFixed(2) ?? "—";
    els.searchDate.textContent = movie.release_date || "—";

    if (movie.poster_path) {
      els.searchPoster.src = TMDB_POSTER_BASE + movie.poster_path;
      els.searchPoster.alt = `Poster for ${movie.title}`;
      els.searchPoster.hidden = false;
      els.searchPosterPlaceholder.hidden = true;
    } else {
      els.searchPoster.hidden = true;
      els.searchPosterPlaceholder.hidden = false;
    }
  }

  function movieLabel(movie) {
    return `${movie.title} (${movie.release_date?.slice(0, 4) || "????"})`;
  }

  function renderList(container, movies, selectedSet, listType) {
    container.innerHTML = "";
    if (!movies.length) {
      container.innerHTML = `<p class="demo-empty">No movies to show.</p>`;
      return;
    }

    movies.forEach((movie) => {
      const row = document.createElement("label");
      row.className = "demo-list-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selectedSet.has(movie.id);
      cb.addEventListener("change", () => {
        if (cb.checked) selectedSet.add(movie.id);
        else selectedSet.delete(movie.id);
      });

      const text = document.createElement("span");
      text.textContent = movieLabel(movie);

      row.appendChild(cb);
      row.appendChild(text);
      row.dataset.listType = listType;
      row.dataset.id = String(movie.id);
      container.appendChild(row);
    });
  }

  function renderWorkingList() {
    renderList(els.workingList, state.workingSet, state.selectedWorking, "working");
    els.workingCount.textContent = state.workingSet.length;
  }

  function renderWatchlist() {
    renderList(els.watchlist, state.watchlist, state.selectedWatchlist, "watchlist");
    els.watchlistCount.textContent = state.watchlist.length;
  }

  function refreshBothLists() {
    state.workingSet = sortList(state.workingSet);
    state.watchlist = sortList(state.watchlist);
    renderWorkingList();
    renderWatchlist();
  }

  function addSelectedToWatchlist() {
    if (!state.selectedWorking.size) {
      showStatus("Select one or more movies from the working list.", "error");
      return;
    }

    let added = 0;
    state.selectedWorking.forEach((id) => {
      const movie = state.workingSet.find((m) => m.id === id);
      if (movie && !state.watchlist.some((w) => w.id === movie.id)) {
        state.watchlist.push(movie);
        added++;
      }
    });

    state.selectedWorking.clear();
    renderWatchlist();
    renderWorkingList();
    showStatus(added ? `Added ${added} movie(s) to watchlist.` : "Selected movies are already on your watchlist.", added ? "success" : "info");
  }

  function removeSelectedFromWatchlist() {
    if (!state.selectedWatchlist.size) {
      showStatus("Select movies to remove from the watchlist.", "error");
      return;
    }

    state.watchlist = state.watchlist.filter((m) => !state.selectedWatchlist.has(m.id));
    state.selectedWatchlist.clear();
    renderWatchlist();
    showStatus("Removed selected movie(s) from watchlist.", "info");
  }

  function exportWatchlist() {
    const filename = els.exportFilename.value.trim() || "watchlist.json";
    if (!state.watchlist.length) {
      showStatus("Your watchlist is empty — add movies before exporting.", "error");
      return;
    }

    const blob = new Blob([JSON.stringify(state.watchlist, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus(`Watchlist exported as ${a.download}.`, "success");
  }

  function showStatus(message, type = "info") {
    els.status.textContent = message;
    els.status.className = `demo-status demo-status--${type}`;
  }

  function buildReleaseDate() {
    const month = els.releaseMonth.value.padStart(2, "0");
    const day = els.releaseDay.value.padStart(2, "0");
    const year = els.releaseYear.value;
    if (!year) throw new Error("Please select a release year.");
    return `${year}-${month}-${day}`;
  }

  function populateGenreSelect() {
    els.genreSelect.innerHTML = state.genreNames
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
  }

  function populateYearSelect() {
    const current = new Date().getFullYear();
    els.releaseYear.innerHTML = "";
    for (let y = current + 2; y >= 1900; y--) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      els.releaseYear.appendChild(opt);
    }
    els.releaseYear.value = "2020";
  }

  function populateDaySelect() {
    els.releaseDay.innerHTML = "";
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement("option");
      opt.value = String(d).padStart(2, "0");
      opt.textContent = String(d);
      els.releaseDay.appendChild(opt);
    }
    els.releaseDay.value = "01";
  }

  function wireEvents() {
    document.querySelectorAll(".demo-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".demo-tab").forEach((t) => {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".demo-panel").forEach((p) => p.hidden = true);
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        $(tab.dataset.panel).hidden = false;
      });
    });

    els.btnIncludeGenre.addEventListener("click", () => {
      try {
        applyFilter(`genre==${els.genreSelect.value}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });

    els.btnExcludeGenre.addEventListener("click", () => {
      try {
        applyFilter(`genre!=${els.genreSelect.value}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });

    els.btnSearch.addEventListener("click", () => searchByTitle(els.searchTitle.value));
    els.searchTitle.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchByTitle(els.searchTitle.value);
    });

    els.btnPopGreater.addEventListener("click", () => {
      try {
        applyFilter(`popularity>${els.popularityInput.value}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });
    els.btnPopLesser.addEventListener("click", () => {
      try {
        applyFilter(`popularity<${els.popularityInput.value}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });

    els.btnVoteGreater.addEventListener("click", () => {
      try {
        applyFilter(`vote_average>${els.voteInput.value}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });
    els.btnVoteLesser.addEventListener("click", () => {
      try {
        applyFilter(`vote_average<${els.voteInput.value}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });

    els.btnDateAfter.addEventListener("click", () => {
      try {
        applyFilter(`release_date>${buildReleaseDate()}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });
    els.btnDateBefore.addEventListener("click", () => {
      try {
        applyFilter(`release_date<${buildReleaseDate()}`);
      } catch (e) {
        showStatus(e.message, "error");
      }
    });

    document.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.sortField = btn.dataset.sort;
        refreshBothLists();
        showStatus(`Sorted by ${btn.dataset.sort.replace("_", " ")} (${state.ascending ? "ascending" : "descending"}).`, "info");
      });
    });

    els.btnAscend.addEventListener("click", () => {
      state.ascending = true;
      refreshBothLists();
    });
    els.btnDescend.addEventListener("click", () => {
      state.ascending = false;
      refreshBothLists();
    });

    els.btnAdd.addEventListener("click", addSelectedToWatchlist);
    els.btnRemove.addEventListener("click", removeSelectedFromWatchlist);
    els.btnReset.addEventListener("click", resetWorkingSet);
    els.btnExport.addEventListener("click", exportWatchlist);
  }

  function cacheElements() {
    els.workingList = $("demo-working-list");
    els.watchlist = $("demo-watchlist");
    els.workingCount = $("demo-working-count");
    els.watchlistCount = $("demo-watchlist-count");
    els.genreSelect = $("demo-genre-select");
    els.searchTitle = $("demo-search-title");
    els.popularityInput = $("demo-popularity");
    els.voteInput = $("demo-vote");
    els.releaseMonth = $("demo-release-month");
    els.releaseDay = $("demo-release-day");
    els.releaseYear = $("demo-release-year");
    els.searchOverview = $("demo-search-overview");
    els.searchPopularity = $("demo-search-popularity");
    els.searchVote = $("demo-search-vote");
    els.searchDate = $("demo-search-date");
    els.searchPoster = $("demo-search-poster");
    els.searchPosterPlaceholder = $("demo-search-poster-placeholder");
    els.exportFilename = $("demo-export-filename");
    els.status = $("demo-status");
    els.btnIncludeGenre = $("demo-btn-include-genre");
    els.btnExcludeGenre = $("demo-btn-exclude-genre");
    els.btnSearch = $("demo-btn-search");
    els.btnPopGreater = $("demo-btn-pop-greater");
    els.btnPopLesser = $("demo-btn-pop-lesser");
    els.btnVoteGreater = $("demo-btn-vote-greater");
    els.btnVoteLesser = $("demo-btn-vote-lesser");
    els.btnDateAfter = $("demo-btn-date-after");
    els.btnDateBefore = $("demo-btn-date-before");
    els.btnAdd = $("demo-btn-add");
    els.btnRemove = $("demo-btn-remove");
    els.btnReset = $("demo-btn-reset");
    els.btnExport = $("demo-btn-export");
    els.btnAscend = $("demo-btn-ascend");
    els.btnDescend = $("demo-btn-descend");
  }

  async function init() {
    const root = $("movie-watchlist-demo");
    if (!root) return;

    cacheElements();
    showStatus("Loading movie catalog…", "info");

    try {
      const [moviesRes, genresRes] = await Promise.all([
        fetch("data/movies.json"),
        fetch("data/genre.json"),
      ]);

      if (!moviesRes.ok || !genresRes.ok) {
        throw new Error("Could not load demo data files.");
      }

      state.allMovies = await moviesRes.json();
      const genres = await genresRes.json();
      genres.forEach((g) => state.genreById.set(g.id, g.name));
      state.genreNames = genres.map((g) => g.name).sort((a, b) => a.localeCompare(b));

      state.workingSet = sortList([...state.allMovies]);

      populateGenreSelect();
      populateYearSelect();
      populateDaySelect();
      wireEvents();
      renderWorkingList();
      renderWatchlist();
      clearSearchDetails();

      showStatus(`Ready — ${state.allMovies.length} movies loaded. Try filtering or building a watchlist!`, "success");
    } catch (err) {
      showStatus(err.message || "Failed to initialize demo.", "error");
      console.error(err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
