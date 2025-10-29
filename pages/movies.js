// Configuration constants
const CONFIG = {
    API_KEY: "2713804610e1e236b1cf44bfac3a7776",
    IMAGE_BASE_URL: "https://image.tmdb.org/t/p/w500",
    CACHE_EXPIRY: 72 * 60 * 60 * 1000,
    RATE_LIMIT: 100,
    RATE_LIMIT_WINDOW: 10000,
    INITIAL_LOAD: 80,
    LOAD_MORE: 20,
    INITIAL_ROWS: 10,
    RESTRICTED_RATINGS: ["NC-17", "NR"]
};

// Server configurations
const SERVERS = [
    {
        id: 'vidplus',
        name: 'Vidplus',
        urls: {
            movie: 'https://player.vidplus.to/embed/movie/{id}',
            tv: 'https://player.vidplus.to/embed/tv/{id}/{season}/{episode}'
        }
    },
    {
        id: 'vidfast',
        name: 'Vidfast',
        urls: {
            movie: 'https://vidfast.to/embed/movie/{id}',
            tv: 'https://vidfast.to/embed/tv/{id}&s={season}&e={episode}'
        }
    },
    {
        id: 'vidsrccx',
        name: 'VidsrcCX',
        urls: {
            movie: 'https://vidsrc.cx/embed/movie/{id}',
            tv: 'https://vidsrc.cx/embed/tv/{id}/{season}/{episode}'
        }
    }
];

// DOM elements
const ELEMENTS = {
    moviesContainer: document.getElementById("moviesContainer"),
    tvShowsContainer: document.getElementById("tvShowsContainer"),
    searchInput: document.getElementById("searchInput"),
    searchSuggestions: document.getElementById("searchSuggestions"),
    mediaModal: document.getElementById("mediaModal"),
    mediaFrame: document.getElementById("mediaFrame"),
    mediaModalTitle: document.getElementById("mediaModalTitle"),
    serverSelect: document.getElementById("serverSelect"),
    providerBadge: document.getElementById("providerBadge"),
    seasonEpisodeExplorer: document.getElementById("seasonEpisodeExplorer"),
    closeSeasonEpisode: document.getElementById("closeSeasonEpisode"),
    seasonsContainer: document.getElementById("seasonsContainer"),
    episodesContainer: document.getElementById("episodesContainer"),
    moviesTab: document.getElementById("moviesTab"),
    tvShowsTab: document.getElementById("tvShowsTab"),
    subtitle: document.getElementById("subtitle")
};

// State management
let state = {
    displayedMovies: 0,
    displayedTVShows: 0,
    currentPage: 1,
    isLoading: false,
    allMoviesLoaded: false,
    requestCount: 0,
    windowStart: Date.now(),
    currentMedia: null,
    currentServer: localStorage.getItem('selectedServer') || 'Vidplus',
    currentEmbedUrl: null
};

// Utility functions
const rateLimitedFetch = async (endpoint) => {
    if (state.requestCount >= CONFIG.RATE_LIMIT) {
        const elapsed = Date.now() - state.windowStart;
        if (elapsed < CONFIG.RATE_LIMIT_WINDOW) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_WINDOW - elapsed));
            state.requestCount = 0;
            state.windowStart = Date.now();
        }
    }
    state.requestCount++;
    try {
        const response = await fetch(endpoint);
        if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return rateLimitedFetch(endpoint);
        }
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    } catch (error) {
        console.error(`Fetch error for ${endpoint}:`, error);
        throw error;
    }
};

const getCachedData = (key) => {
    const cached = localStorage.getItem(key);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CONFIG.CACHE_EXPIRY) return data;
    }
    return null;
};

const setCachedData = (key, data) => {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};
const getImdbId = async (tmdbId) => {
    const cacheKey = `imdb_${tmdbId}`;
    let imdbId = getCachedData(cacheKey);
    if (!imdbId) {
        const endpoint = `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${CONFIG.API_KEY}`;
        const data = await rateLimitedFetch(endpoint);
        imdbId = data.imdb_id;
        if (imdbId) setCachedData(cacheKey, imdbId);
    }
    return imdbId;
};

// Media modal functions
function openMediaModal(mediaData, type) {
    state.currentMedia = { ...mediaData, type };
    ELEMENTS.mediaModalTitle.textContent = mediaData.title || mediaData.name;
    ELEMENTS.mediaModal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // Set default server
    ELEMENTS.serverSelect.value = state.currentServer;
    updateProviderBadge();

    // Load media
    loadMediaInModal();
}

function closeMediaModal() {
    ELEMENTS.mediaModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (ELEMENTS.mediaFrame.src && ELEMENTS.mediaFrame.src.startsWith('blob:')) {
        URL.revokeObjectURL(ELEMENTS.mediaFrame.src);
    }
    ELEMENTS.mediaFrame.src = '';
    state.currentMedia = null;
    state.currentEmbedUrl = null;
}

function updateProviderBadge() {
    ELEMENTS.providerBadge.textContent = state.currentServer;
}

async function loadMediaInModal() {
    if (!state.currentMedia) return;

    const server = SERVERS.find(s => s.name === state.currentServer);
    if (!server) return;

    let embedUrl = '';
    if (state.currentMedia.type === 'movie') {
        try {
            const imdbId = await getImdbId(state.currentMedia.id);
            embedUrl = server.urls.movie.replace('{id}', imdbId || state.currentMedia.id);
        } catch (error) {
            console.warn('Failed to get IMDB ID, using TMDB ID:', error);
            embedUrl = server.urls.movie.replace('{id}', state.currentMedia.id);
        }
    } else if (state.currentMedia.type === 'tv') {
        embedUrl = server.urls.tv
            .replace('{id}', state.currentMedia.id)
            .replace('{season}', state.currentMedia.season)
            .replace('{episode}', state.currentMedia.episode);
    }
    state.currentEmbedUrl = embedUrl;

    // Direct iframe load without blob wrapper for better compatibility
    ELEMENTS.mediaFrame.src = embedUrl;
}

function fullscreenMedia() {
    if (ELEMENTS.mediaFrame.requestFullscreen) {
        ELEMENTS.mediaFrame.requestFullscreen();
    } else if (ELEMENTS.mediaFrame.webkitRequestFullscreen) {
        ELEMENTS.mediaFrame.webkitRequestFullscreen();
    } else if (ELEMENTS.mediaFrame.msRequestFullscreen) {
        ELEMENTS.mediaFrame.msRequestFullscreen();
    }
}

function openMediaInAboutBlank() {
    if (state.currentEmbedUrl) {
        window.openURLInAboutBlank(state.currentEmbedUrl);
    }
}

// Search suggestions
const handleSearchInput = debounce(async (event) => {
    const query = event.target.value.trim();
    if (query.length < 2) {
        ELEMENTS.searchSuggestions.classList.add('hidden');
        return;
    }

    try {
        // Always query movies regardless of active tab
        const endpoint = `https://api.themoviedb.org/3/search/movie?api_key=${CONFIG.API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
        const data = await rateLimitedFetch(endpoint);

        ELEMENTS.searchSuggestions.innerHTML = '';
        if (data.results && data.results.length > 0) {
            data.results.slice(0, 6).forEach(item => {
                const suggestion = document.createElement('div');
                suggestion.className = 'result-item';
                const img = document.createElement('img');
                img.src = item.poster_path ? `${CONFIG.IMAGE_BASE_URL}${item.poster_path}` : "https://via.placeholder.com/120x180?text=No+Image";
                img.alt = item.title;
                img.style.width = '120px';
                img.style.height = '180px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                img.style.marginLeft = '15px';
                img.style.flexShrink = '0';

                const info = document.createElement('div');
                info.className = 'result-info';
                const title = document.createElement('div');
                title.className = 'result-title';
                title.textContent = item.title;
                const artist = document.createElement('div');
                artist.className = 'result-artist';
                artist.textContent = item.release_date ? new Date(item.release_date).getFullYear() : 'N/A';

                info.appendChild(title);
                info.appendChild(artist);
                suggestion.appendChild(img);
                suggestion.appendChild(info);

                suggestion.onclick = () => {
                    ELEMENTS.searchInput.value = '';
                    ELEMENTS.searchSuggestions.classList.add('hidden');
                    openMediaModal(item, 'movie');
                };
                ELEMENTS.searchSuggestions.appendChild(suggestion);
            });
            ELEMENTS.searchSuggestions.classList.remove('hidden');
        } else {
            ELEMENTS.searchSuggestions.classList.add('hidden');
        }
    } catch (error) {
        console.error('Search error:', error);
        ELEMENTS.searchSuggestions.classList.add('hidden');
    }
}, 300);

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!ELEMENTS.searchInput.contains(e.target) && !ELEMENTS.searchSuggestions.contains(e.target)) {
        ELEMENTS.searchSuggestions.classList.add('hidden');
    }
});

// Season/Episode explorer functions
async function openSeasonExplorer(tvShowId) {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
    ELEMENTS.seasonEpisodeExplorer.style.display = "flex";
    ELEMENTS.episodesContainer.innerHTML = "";
    ELEMENTS.seasonsContainer.innerHTML = "";

    const cacheKey = `seasons_${tvShowId}`;
    let seasonsData = getCachedData(cacheKey);

    if (!seasonsData) {
        try {
            const data = await rateLimitedFetch(`https://api.themoviedb.org/3/tv/${tvShowId}?api_key=${CONFIG.API_KEY}&language=en-US`);
            seasonsData = data.seasons || [];
            setCachedData(cacheKey, seasonsData);
        } catch (error) {
            console.error("Error fetching seasons:", error);
            ELEMENTS.seasonsContainer.innerHTML = "<p>Error loading seasons.</p>";
            return;
        }
    }
    displaySeasons(seasonsData, tvShowId);
}

function displaySeasons(seasons, tvShowId) {
    seasons.forEach(season => {
        const seasonCard = document.createElement("div");
        seasonCard.classList.add("season-card");
        seasonCard.textContent = `Season ${season.season_number}`;
        seasonCard.addEventListener("click", () => fetchEpisodes(tvShowId, season.season_number));
        ELEMENTS.seasonsContainer.appendChild(seasonCard);
    });
}

async function fetchEpisodes(tvShowId, seasonNumber) {
    ELEMENTS.episodesContainer.style.display = "flex";
    ELEMENTS.episodesContainer.innerHTML = "";

    const cacheKey = `episodes_${tvShowId}_${seasonNumber}`;
    let episodesData = getCachedData(cacheKey);

    if (!episodesData) {
        try {
            const data = await rateLimitedFetch(`https://api.themoviedb.org/3/tv/${tvShowId}/season/${seasonNumber}?api_key=${CONFIG.API_KEY}&language=en-US`);
            episodesData = data.episodes || [];
            setCachedData(cacheKey, episodesData);
        } catch (error) {
            console.error("Error fetching episodes:", error);
            ELEMENTS.episodesContainer.innerHTML = "<p>Error loading episodes.</p>";
            return;
        }
    }
    episodesData.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    displayEpisodes(episodesData, tvShowId, seasonNumber);
}

function displayEpisodes(episodes, tvShowId, seasonNumber) {
    episodes.forEach(episode => {
        const episodeCard = document.createElement("div");
        episodeCard.classList.add("episode-card");
        const rating = episode.vote_average?.toFixed(1) || "N/A";
        episodeCard.innerHTML = `<h3>S${episode.season_number}E${episode.episode_number} - ${episode.name} (${rating}/10)</h3>`;
        episodeCard.addEventListener("click", () => {
            ELEMENTS.seasonEpisodeExplorer.style.display = "none";
            const episodeData = {
                id: tvShowId,
                name: episode.name,
                season: seasonNumber,
                episode: episode.episode_number
            };
            openMediaModal(episodeData, 'tv');
        });
        ELEMENTS.episodesContainer.appendChild(episodeCard);
    });
}

// Load movies and TV shows
async function loadMovies(query = "") {
    showLoading();
    ELEMENTS.moviesContainer.innerHTML = "";
    ELEMENTS.moviesContainer.classList.remove('hidden');
    state.displayedMovies = 0;
    state.currentPage = 1;
    state.allMoviesLoaded = false;

    if (query) {
        await fetchContent(query, "movie");
        return;
    }

    // Load initial batch of popular movies
    let totalToLoad = CONFIG.INITIAL_LOAD;
    for (let page = 1; state.displayedMovies < totalToLoad; page++) {
        try {
            const popularEndpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${CONFIG.API_KEY}&language=en-US&page=${page}`;
            const data = await rateLimitedFetch(popularEndpoint);
            const moviesToAdd = data.results.slice(0, totalToLoad - state.displayedMovies);
            if (moviesToAdd.length === 0) break;

            moviesToAdd.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            displayMovies(moviesToAdd.filter(movie => movie.poster_path));
        } catch (error) {
            console.error("Error loading movies:", error);
            ELEMENTS.moviesContainer.innerHTML = "<p>Error loading movies. Please try again.</p>";
            hideLoading();
            break;
        }
    }
    // Add load more button after initial load
    if (state.displayedMovies >= CONFIG.INITIAL_LOAD) {
        addLoadMoreButton();
    }
    hideLoading();
}

async function loadTVShows(query = "") {
    showLoading();
    ELEMENTS.tvShowsContainer.innerHTML = "";
    ELEMENTS.tvShowsContainer.classList.remove('hidden');
    state.displayedTVShows = 0;

    if (query) {
        await fetchContent(query, "tv");
        return;
    }

    // Load initial batch of popular TV shows (same as movies for consistency)
    let totalToLoad = CONFIG.INITIAL_LOAD;
    for (let page = 1; state.displayedTVShows < totalToLoad; page++) {
        try {
            const popularEndpoint = `https://api.themoviedb.org/3/tv/popular?api_key=${CONFIG.API_KEY}&language=en-US&page=${page}`;
            const data = await rateLimitedFetch(popularEndpoint);
            const tvShowsToAdd = data.results.slice(0, totalToLoad - state.displayedTVShows);
            if (tvShowsToAdd.length === 0) break;

            tvShowsToAdd.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            displayTVShows(tvShowsToAdd.filter(show => show.poster_path));
        } catch (error) {
            console.error("Error loading TV shows:", error);
            ELEMENTS.tvShowsContainer.innerHTML = "<p>Error loading TV shows. Please try again.</p>";
            hideLoading();
            break;
        }
    }
    hideLoading();
}

function displayMovies(movies) {
    movies.forEach(movie => {
        if (state.displayedMovies >= CONFIG.MEDIA_LIMIT) return;

        const movieCard = document.createElement('div');
        movieCard.className = 'media-item';

        const poster = document.createElement('img');
        poster.src = movie.poster_path ? `${CONFIG.IMAGE_BASE_URL}${movie.poster_path}` : "https://via.placeholder.com/120x180?text=No+Image";
        poster.alt = `${movie.title} Poster`;

        const title = document.createElement('p');
        title.textContent = movie.title;

        movieCard.append(poster, title);
        movieCard.addEventListener("click", () => openMediaModal(movie, 'movie'));
        ELEMENTS.moviesContainer.appendChild(movieCard);
        state.displayedMovies++;
    });
}

function displayTVShows(tvShows) {
    tvShows.forEach(show => {
        if (state.displayedTVShows >= CONFIG.MEDIA_LIMIT) return;

        const tvShowCard = document.createElement('div');
        tvShowCard.className = 'media-item';

        const poster = document.createElement('img');
        poster.src = show.poster_path ? `${CONFIG.IMAGE_BASE_URL}${show.poster_path}` : "https://via.placeholder.com/120x180?text=No+Image";
        poster.alt = `${show.name} Poster`;

        const title = document.createElement('p');
        title.textContent = show.name;

        tvShowCard.append(poster, title);
        tvShowCard.addEventListener("click", () => openSeasonExplorer(show.id));
        ELEMENTS.tvShowsContainer.appendChild(tvShowCard);
        state.displayedTVShows++;
    });
}

async function fetchContent(query, type) {
    const endpoint = `https://api.themoviedb.org/3/search/${type}?api_key=${CONFIG.API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
    hideLoading();
    try {
        const data = await rateLimitedFetch(endpoint);
        if (data.results?.length > 0) {
            const results = data.results.filter(item => item.poster_path);
            results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            if (type === "movie") {
                displayMovies(results);
            } else {
                displayTVShows(results);
            }
        } else {
            const container = type === "movie" ? ELEMENTS.moviesContainer : ELEMENTS.tvShowsContainer;
            container.innerHTML = `<p>No ${type === "movie" ? "movies" : "TV shows"} found matching your search.</p>`;
        }
    } catch (error) {
        console.error(`Error fetching ${type} content:`, error);
        const container = type === "movie" ? ELEMENTS.moviesContainer : ELEMENTS.tvShowsContainer;
        container.innerHTML = `<p>Error loading ${type === "movie" ? "movies" : "TV shows"}. Please try again.</p>`;
    }
}

// Tab switching
function switchTab(type) {
    ELEMENTS.searchInput.value = "";
    ELEMENTS.searchSuggestions.classList.add('hidden');
    if (type === "tv-shows") {
        ELEMENTS.moviesTab.classList.remove("active");
        ELEMENTS.tvShowsTab.classList.add("active");
        ELEMENTS.moviesContainer.classList.add('hidden');
        ELEMENTS.tvShowsContainer.classList.remove('hidden');
        loadTVShows();
    } else {
        ELEMENTS.tvShowsTab.classList.remove("active");
        ELEMENTS.moviesTab.classList.add("active");
        ELEMENTS.tvShowsContainer.classList.add('hidden');
        ELEMENTS.moviesContainer.classList.remove('hidden');
        loadMovies();
    }
}

// Event listeners
ELEMENTS.searchInput.addEventListener("input", handleSearchInput);
ELEMENTS.serverSelect.addEventListener('change', (e) => {
    state.currentServer = e.target.value;
    localStorage.setItem('selectedServer', state.currentServer);
    updateProviderBadge();
    if (state.currentMedia) {
        loadMediaInModal();
    }
});
ELEMENTS.moviesTab.addEventListener("click", () => switchTab("movies"));
ELEMENTS.tvShowsTab.addEventListener("click", () => switchTab("tv-shows"));
ELEMENTS.closeSeasonEpisode.addEventListener("click", () => ELEMENTS.seasonEpisodeExplorer.style.display = "none");
ELEMENTS.seasonEpisodeExplorer.addEventListener("click", (event) => {
    if (event.target === ELEMENTS.seasonEpisodeExplorer) {
        ELEMENTS.seasonEpisodeExplorer.style.display = "none";
    }
});

// Initialize
ELEMENTS.subtitle.textContent = "Browse and stream movies and TV shows";
loadMovies();

// Navigation function
function navigateTo(url) {
    window.location.href = url;
}

function showLoading() {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
}

const loadingIndicator = document.getElementById("loadingIndicator");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

const lazyLoad = () => {
    const images = document.querySelectorAll('img[data-src]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    images.forEach(image => observer.observe(image));
};

// Load more movies function
async function loadMoreMovies() {
    showLoading();
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.remove();

    let moviesLoaded = 0;
    const targetLoad = CONFIG.LOAD_MORE;

    for (let page = state.currentPage + 1; moviesLoaded < targetLoad; page++) {
        try {
            const popularEndpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${CONFIG.API_KEY}&language=en-US&page=${page}`;
            const data = await rateLimitedFetch(popularEndpoint);
            const moviesToAdd = data.results.slice(0, targetLoad - moviesLoaded);
            if (moviesToAdd.length === 0) break;

            moviesToAdd.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            displayMovies(moviesToAdd.filter(movie => movie.poster_path));
            moviesLoaded += moviesToAdd.length;
            state.currentPage = page;
        } catch (error) {
            console.error("Error loading more movies:", error);
            hideLoading();
            break;
        }
    }

    if (moviesLoaded === targetLoad) {
        addLoadMoreButton();
    }
    hideLoading();
}

// Add load more button function
function addLoadMoreButton() {
    const loadMoreBtn = document.createElement('div');
    loadMoreBtn.id = 'load-more-btn';
    loadMoreBtn.className = 'media-item load-more-btn';
    loadMoreBtn.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;"><i class="fa-solid fa-plus" style="font-size: 24px; margin-bottom: 8px;"></i><span>Load More</span></div>';
    loadMoreBtn.addEventListener('click', loadMoreMovies);
    ELEMENTS.moviesContainer.appendChild(loadMoreBtn);
}

window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
        if (scrollToTopBtn) scrollToTopBtn.classList.remove('hidden');
    } else {
        if (scrollToTopBtn) scrollToTopBtn.classList.add('hidden');
    }
});

if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}