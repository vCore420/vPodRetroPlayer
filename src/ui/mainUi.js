// --- Main Ui Features ---

function cacheScreenContent(screenContent) {
  if (!screenContent?.dataset?.screenKey) return;

  const cache = app.state.screenCache;
  cache.set(screenContent.dataset.screenKey, screenContent);

  if (cache.size > 12) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey && oldestKey !== screenContent.dataset.screenKey) {
      cache.delete(oldestKey);
    }
  }
}

function takeCachedScreen(screenKey) {
  if (!screenKey) return null;

  const cache = app.state.screenCache;
  const cached = cache.get(screenKey) || null;
  if (cached) {
    cache.delete(screenKey);
  }
  return cached;
}

function stripIdsForTransition(node) {
  if (!node) return;

  if (node.id) {
    node.removeAttribute('id');
  }

  node.querySelectorAll('[id]').forEach(element => {
    element.removeAttribute('id');
  });
}

function createTransitionGhost(screenNode, direction) {
  if (!screenNode) return null;

  const ghost = screenNode.cloneNode(true);
  stripIdsForTransition(ghost);
  ghost.classList.remove('screen-active');
  ghost.classList.add(direction === 'forward' ? 'screen-fade-out' : 'screen-fade-in');
  ghost.dataset.transitionGhost = 'true';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.pointerEvents = 'none';
  return ghost;
}

function getIndexedItem(container, itemsSelector, idx) {
  if (!container || idx == null || idx < 0) return null;
  return container.querySelector(`${itemsSelector}[data-idx="${idx}"]`) || null;
}

function ensureIndexedItemVisible(container, item, { center = false } = {}) {
  if (!container || !item) return;
  if (container.id === 'albumCarousel') return;
  item.scrollIntoView({ block: 'nearest' });
}

function setActiveIndexedItem(container, itemsSelector, idx, { scrollIntoView = false, center = false } = {}) {
  if (!container) return null;

  const previousIdx = Number(container.dataset.activeIndex ?? -1);
  if (previousIdx !== idx) {
    const previousItem = getIndexedItem(container, itemsSelector, previousIdx);
    if (previousItem) previousItem.classList.remove('active');
  }

  const nextItem = getIndexedItem(container, itemsSelector, idx);
  if (nextItem) {
    nextItem.classList.add('active');
    if (scrollIntoView) {
      ensureIndexedItemVisible(container, nextItem, { center });
    }
  }

  container.dataset.activeIndex = String(idx);
  return nextItem;
}

window.setActiveIndexedItem = setActiveIndexedItem;

// Master Highlight
function masterHighlight({ containerSelector, itemsSelector, tracks, albumArtSelector }) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const idx = app.state.currentMenuIndex;

  setActiveIndexedItem(container, itemsSelector, idx);

  if (albumArtSelector && tracks && tracks[idx]) {
    const allAlbums = app.state.albums;
    const albumObj = allAlbums[tracks[idx].albumKey || tracks[idx].album] || {};
    const artImg = document.querySelector(albumArtSelector);
    if (artImg) artImg.src = albumObj.cover || "src/img/default-cover.png";
  }
}

// --- GENERIC RENDERERS ---

// Render main screen
function renderScreen(content, direction = 'forward', options = {}) {
  const { screenKey = '', reuseCached = false } = options;
  if (typeof window.onScreenCleanup === 'function') {
    const cleanup = window.onScreenCleanup;
    window.onScreenCleanup = null;
    cleanup();
  }
  window.updateHighlightedSong = null;

  if (typeof window.onRecapScroll === 'function') {
    window.onRecapScroll = null;
  }
  
  const oldContent = vpodScreen.querySelector('.screen-content.screen-active') || vpodScreen.querySelector('.screen-content');
  if (oldContent) {
    const shouldCache = oldContent.dataset.preserveScreen === 'true' && oldContent.dataset.screenKey;
    const transitionGhost = createTransitionGhost(oldContent, direction);

    if (oldContent.parentNode) oldContent.remove();
    if (shouldCache) cacheScreenContent(oldContent);

    if (transitionGhost) {
      vpodScreen.appendChild(transitionGhost);
      setTimeout(() => {
        if (transitionGhost.parentNode) transitionGhost.remove();
      }, 350);
    }
  }

  const cachedScreen = reuseCached && screenKey ? takeCachedScreen(screenKey) : null;
  const div = cachedScreen || document.createElement('div');
  div.className = 'screen-content screen-active screen-fade-in';

  if (screenKey) {
    div.dataset.screenKey = screenKey;
    div.dataset.preserveScreen = 'true';
  }

  if (!cachedScreen) {
    div.innerHTML = typeof content === 'function' ? content() : content;
  }

  vpodScreen.appendChild(div);

  updateHotBarTime();
  return {
    root: div,
    reused: !!cachedScreen
  };
}

// Render Menu Screen
function renderMenuList({ title, items, onItemClick, showBack, onBack, id = "menuList", before = "", cacheKey = "" }, direction = 'forward') {
  const { reused } = renderScreen(() => `
    ${before}
    <div>
      ${title ? `<div class="menu-title" style="font-weight:bold;font-size:1.2em;text-align:center;margin-bottom:12px;">${title}</div>` : ''}
      <ul class="menu-list" id="${id}">
        ${items.map((item, idx) => `<li data-idx="${idx}">${item.label}</li>`).join('')}
      </ul>
    </div>
  `, direction, { screenKey: cacheKey, reuseCached: !!cacheKey });

  const list = document.getElementById(id);
  if (!list) return;

  list.dataset.itemCount = String(items.length);

  if (!reused || !list.dataset.boundClick) {
    list.onclick = (event) => {
      const row = event.target.closest('li[data-idx]');
      if (!row || !list.contains(row)) return;

      const idx = Number(row.dataset.idx || 0);
      const item = items[idx];
      app.state.currentMenuIndex = idx;
      setActiveIndexedItem(list, 'li', idx, { scrollIntoView: true });
      onItemClick(idx, item);
    };
    list.dataset.boundClick = 'true';
  }

  window.updateHighlightedSong = () => masterHighlight({
    containerSelector: `#${id}`,
    itemsSelector: 'li'
  });
}

// Update Hotbar time
let hotBarMessageActive = false;
let hotBarClockTimeoutId = null;

function clearHotBarClockTimer() {
  if (!hotBarClockTimeoutId) return;
  clearTimeout(hotBarClockTimeoutId);
  hotBarClockTimeoutId = null;
}

function scheduleHotBarClockUpdate() {
  clearHotBarClockTimer();

  if (hotBarMessageActive || document.hidden) return;

  const now = new Date();
  const delay = ((60 - now.getSeconds()) * 1000) - now.getMilliseconds();
  hotBarClockTimeoutId = setTimeout(() => {
    hotBarClockTimeoutId = null;
    updateHotBarTime();
  }, Math.max(250, delay));
}

function updateHotBarTime() {
  if (hotBarMessageActive) return;

  const el = document.getElementById('hotBarTime');
  if (el) {
    const now = new Date();
    const settings = getTimeSettings ? getTimeSettings() : { hourFormat: '24' };
    let h = now.getHours();
    let m = now.getMinutes().toString().padStart(2, '0');
    let ampm = '';
    if (settings.hourFormat === '12') {
      ampm = h >= 12 ? ' PM' : ' AM';
      h = h % 12 || 12;
    }
    el.textContent = `${h}:${m}${ampm}`;
  }

  scheduleHotBarClockUpdate();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearHotBarClockTimer();
    return;
  }

  updateHotBarTime();
});

let hotBarMessageTimeoutId = null;

function showHotBarMessage(text, duration = 2500) {
  const el = document.getElementById('hotBarTime');
  if (!el) return;

  hotBarMessageActive = true;

  // Clear any pending restore
  if (hotBarMessageTimeoutId) {
    clearTimeout(hotBarMessageTimeoutId);
    hotBarMessageTimeoutId = null;
  }

  // Fade out current content
  el.style.transition = 'opacity 0.3s';
  el.style.opacity = '0';

  setTimeout(() => {
    // Set message and fade in
    el.textContent = text;
    el.style.opacity = '1';
  }, 300);

  // After duration, fade back to time
  hotBarMessageTimeoutId = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      hotBarMessageTimeoutId = null;
      hotBarMessageActive = false;
      updateHotBarTime();
      el.style.opacity = '1';
    }, 300);
  }, duration);
}

window.showHotBarMessage = showHotBarMessage;

// Render Album Carousel Screen
function preloadCarouselCovers(albumKeys, centerIdx, radius = 2) {
  const allAlbums = app.state.albums || {};
  const start = Math.max(0, centerIdx - radius);
  const end = Math.min(albumKeys.length - 1, centerIdx + radius);

  for (let i = start; i <= end; i++) {
    const cover = allAlbums[albumKeys[i]]?.cover;
    if (!cover) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = cover;
  }
}

function renderAlbumCarousel({ albumsList, onAlbumClick, title, showDone, onDone, selectedIdx = 0 }, direction = 'forward') {
  const allAlbums = app.state.albums;
  const cacheKey = `album-carousel:${albumsList.join('|')}`;

  const { reused } = renderScreen(() => `
    <div class="album-carousel-container">
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle"></div>
      ${showDone ? `<button id="donePlaylistBtn" style="margin-top:12px;font-size:1em;">Done</button>` : ''}
    </div>
  `, direction, { screenKey: cacheKey, reuseCached: true });

  const carousel = document.getElementById('albumCarousel');
  if (!carousel) return;
  carousel.dataset.itemCount = String(albumsList.length);

  if (!reused) {
    const fragment = document.createDocumentFragment();

    albumsList.forEach((album, idx) => {
      const albumObj = allAlbums[album] || {};
      const cover = albumObj.cover || 'src/img/default-cover.png';

      const div = document.createElement('div');
      div.className = 'carousel-album';
      div.dataset.idx = String(idx);

      div.innerHTML = `
        <div class="carousel-cover-reflect">
          <img
            src="${cover}"
            class="carousel-cover"
            alt="Album Cover"
            decoding="async"
            fetchpriority="${Math.abs(idx - selectedIdx) <= 1 ? 'high' : 'low'}"
            draggable="false"
          >
          <img
            src="${cover}"
            class="reflection"
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable="false"
          >
        </div>
      `;

      const coverImg = div.querySelector('.carousel-cover');
      const onLoaded = () => div.classList.add('carousel-album-loaded');
      coverImg.addEventListener('load', onLoaded, { once: true });
      if (coverImg.complete) onLoaded();

      fragment.appendChild(div);
    });

    carousel.innerHTML = '';
    carousel.appendChild(fragment);
  }

  carousel.onclick = (event) => {
    const item = event.target.closest('.carousel-album[data-idx]');
    if (!item || !carousel.contains(item)) return;

    const idx = Number(item.dataset.idx || 0);
    app.state.currentMenuIndex = idx;
    onAlbumClick(albumsList[idx], idx);
  };

  setCarouselAlbum(selectedIdx, albumsList);
  preloadCarouselCovers(albumsList, selectedIdx);

  if (showDone && onDone) {
    document.getElementById('donePlaylistBtn').onclick = onDone;
  }

  app.state.currentMenuIndex = selectedIdx;
}

// Render Song List Screen
function renderSongList({ songs, onSongClick, selectedTracks = [], showBack, onBack, selectMode = false, albumCover }, direction = 'forward') {
  const allAlbums = app.state.albums;
  const currentTrack = app.state.currentTrack;
  const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;

  renderScreen(
    `<div class="album-list">
      <div class="album-list-left" id="songsListContainer" data-scroll-container="true" ${selectMode ? 'data-playlist-select="true"' : ''}>
        <div id="songsList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumCover || allAlbums[songs[0]?.albumKey || songs[0]?.album]?.cover || 'src/img/default-cover.png'}" class="album-cover" alt="Album Cover">
        ${selectMode ? `<div style="margin-top:18px;text-align:center;width:100%;"><span style="font-size:1em;color:#0074d9;word-break:break-word;">Tap songs to add/remove from playlist</span></div>` : ''}
      </div>
    </div>
  `, direction);

  const songsList = document.getElementById('songsList');
  const songsListContainer = document.getElementById('songsListContainer');

  if (songsListContainer) {
    songsListContainer.style.overflowY = 'auto';
    songsListContainer.onwheel = (event) => {
      songsListContainer.scrollTop += event.deltaY;
      event.preventDefault();
    };
  }

  songsList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  songs.forEach((track, idx) => {
    const isSelected = selectedTracks.some(t =>
      (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
      (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
    );

    const isNowPlaying =
      currentTrackId && getTrackId(track) === currentTrackId;

    const nowPlayingLabel = isNowPlaying
      ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
      : '';

    const selectedIcon = selectMode && isSelected
      ? `<i class="fa-solid fa-check" style="color:#0074d9;margin-right:4px;"></i>`
      : '';

    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.dataset.idx = String(idx);
    div.innerHTML = `
      ${nowPlayingLabel}
      <span style="padding-left:6px;">
        ${selectedIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}
      </span>
    `;
    fragment.appendChild(div);
  });

  songsList.appendChild(fragment);
  songsList.dataset.itemCount = String(songs.length);

  songsList.onclick = (event) => {
    const row = event.target.closest('.menu-list-song[data-idx]');
    if (!row || !songsList.contains(row)) return;

    const idx = Number(row.dataset.idx || 0);
    app.state.currentMenuIndex = idx;
    window.updateHighlightedSong();
    onSongClick(songs[idx], idx);
  };

  window.updateHighlightedSong = () => masterHighlight({
    containerSelector: '#songsList',
    itemsSelector: '.menu-list-song',
    tracks: songs,
    albumArtSelector: '.album-list-right img.album-cover'
  });
}


// --- SET SCROLLING SONG ---

function setScrollingSong(idx) {
  debugLog('Setting scrolling song index:', idx);
  const songsList = document.getElementById('songsList');
  if (!songsList) return; 
  Array.from(songsList.children).forEach((el, i) => {
    el.classList.toggle('scrolling', i === idx);
  });
}

function clearScrollingSong(idx) {
  debugLog('Clearing scrolling song index:', idx);
  const songsList = document.getElementById('songsList');
  if (songsList.children[idx]) {
    songsList.children[idx].classList.remove('scrolling');
  }
}


// --- Reset and Info Buttons ---
document.getElementById('resetBtn').onclick = () => {
  showResetPrompt();
};

document.getElementById('infoBtn').onclick = () => {
  showInfoPrompt();
};

function resetUiState() {
  // Stop audio and release URL
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  audioPlayer.src = '';
  if (window.clearCurrentAudioUrl) window.clearCurrentAudioUrl();

  // Reset play/pause icon and hotbar state/message
  const icon = playPauseBtn.querySelector('i');
  if (icon) icon.className = "fa-solid fa-play";
  const ps = document.getElementById('hotBarPlayState');
  if (ps) ps.textContent = '';
  hotBarMessageActive = false;
  if (hotBarMessageTimeoutId) {
    clearTimeout(hotBarMessageTimeoutId);
    hotBarMessageTimeoutId = null;
  }
  updateHotBarTime();

  // Clear global UI callbacks/intervals
  window.updateHighlightedSong = null;
  window.onRecapScroll = null;
  window.onPlaylistAlbumMenuDone = null;
  window.onColourMenuScroll = null;
  window.onColourMenuConfirm = null;
  if (window.dateTimeMenuInterval) {
    clearInterval(window.dateTimeMenuInterval);
    window.dateTimeMenuInterval = null;
  }

  // Reset nav & playback state (but keep tracks/albums/playlists)
  app.state.navStack = [];
  app.state.currentTrack = null;
  app.state.currentAlbumSongs = [];
  app.state.currentSongIndex = -1;
  app.state.currentMenuIndex = 0;
  app.state.isShuffleOn = false;
  app.state.originalAlbumSongs = null;
  app.state.originalSongIndex = -1;
  app.state.queueSignature = null;
  app.state.smartMixPlaybackHistory = [];
  app.state.smartMixHistoryCursor = -1;

  debugLog('UI state has been reset.');
  
  // Re-render main menu as fresh entry point
  renderMainMenu('forward');
  app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
}

// Reset Prompt and Functionality
function showResetPrompt() {
  const modal = document.createElement('div');
  modal.style = `
    position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;
    background:rgba(0,0,0,0.38);display:flex;align-items:center;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="background:#fff;padding:32px 28px;border-radius:18px;box-shadow:0 2px 12px #0003;display:flex;flex-direction:column;align-items:center;max-width:320px;">
      <div style="font-size:1.15em;font-weight:bold;color:#0074d9;margin-bottom:14px;">Reset App UI?</div>
      <div style="font-size:1em;color:#444;text-align:center;margin-bottom:18px;">
        This feature is for when the vPod UI acts strange or gets stuck.<br>
        It will stop playback, clear the navigation, and refresh the menus.<br>
        <b>Your loaded music will remain.</b>
      </div>
      <div style="display:flex;gap:18px;">
        <button id="resetYesBtn" style="padding:10px 28px;border-radius:8px;border:none;cursor:pointer;background:#0074d9;color:#fff;font-size:1em;">Yes, Reset</button>
        <button id="resetNoBtn" style="padding:10px 28px;border-radius:8px;border:none;cursor:pointer;background:#eee;color:#444;font-size:1em;">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('resetYesBtn').onclick = () => {
    resetUiState();
    modal.remove();
  };

  document.getElementById('resetNoBtn').onclick = () => {
    modal.remove();
  };
}

// Site Info Prompt
function showInfoPrompt() {
  const tips = [
    {
      title: "Welcome to vRetro Player",
      body: `
        <b>Load your music:</b><br>
        • On the main menu, choose <b>Load Music</b>.<br>
        • Pick your music folder (MP3 / FLAC).<br>
        • Optional: keep <b>tracks-meta.json</b> in the folder for faster loading.
      `
    },
    {
      title: "Using the Click Wheel",
      body: `
        <b>Scroll:</b> move your finger (or mouse) around the disk ring.<br>
        <b>Select:</b> press the center button.<br>
        <b>Back:</b> press <b>MENU</b> at the top of the disk.
      `
    },
    {
      title: "Playing Music",
      body: `
        • Browse by <b>Albums</b>, <b>Artists</b>, or <b>All Songs</b>.<br>
        • Open an album and press center on a song to play.<br>
        • Use <b>Next</b>/<b>Prev</b> on the disk to change tracks.<br>
        • Press <b>Play / Pause</b> to start or pause playback.
      `
    },
    {
      title: "Likes, Dislikes & Suggestions",
      body: `
        • Open <b>Now Playing</b> to see the current song.<br>
        • Tap the <b>thumbs up</b> or <b>thumbs down</b> buttons.<br>
        • Your habits power the <b>Suggested</b> menu and <b>Weekly Recap</b> stats.
      `
    },
    {
      title: "Playlists & Settings",
      body: `
        • Create playlists from the <b>Playlists</b> menu.<br>
        • Add songs by picking albums and ticking tracks.<br>
        • In <b>Settings</b> you can change EQ, time format, vPod colour, and view user stats.
      `
    }
  ];

  let idx = 0;

  const modal = document.createElement('div');
  modal.style = `
    position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;
    background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;
  `;

  const box = document.createElement('div');
  box.style = `
    background:#fff;padding:22px 20px;border-radius:18px;box-shadow:0 2px 14px #0004;
    max-width:360px;width:90%;display:flex;flex-direction:column;align-items:center;
  `;

  const titleEl = document.createElement('div');
  titleEl.style = 'font-size:1.2em;font-weight:bold;color:#0074d9;margin-bottom:10px;text-align:center;';

  const bodyEl = document.createElement('div');
  bodyEl.style = 'font-size:0.95em;color:#444;text-align:left;margin-bottom:16px;line-height:1.4;';

  const dotsEl = document.createElement('div');
  dotsEl.style = 'margin-bottom:10px;text-align:center;font-size:0.9em;';

  const buttonsRow = document.createElement('div');
  buttonsRow.style = 'display:flex;justify-content:space-between;width:100%;gap:10px;';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◀ Prev';
  prevBtn.style = 'flex:1;padding:8px 0;border-radius:8px;border:none;background:#eee;color:#444;font-size:0.95em;cursor:pointer;';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next ▶';
  nextBtn.style = 'flex:1;padding:8px 0;border-radius:8px;border:none;background:#0074d9;color:#fff;font-size:0.95em;cursor:pointer;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style = 'margin-top:10px;padding:6px 18px;border-radius:8px;border:none;background:#ddd;color:#444;font-size:0.9em;cursor:pointer;';

  buttonsRow.appendChild(prevBtn);
  buttonsRow.appendChild(nextBtn);

  box.appendChild(titleEl);
  box.appendChild(bodyEl);
  box.appendChild(dotsEl);
  box.appendChild(buttonsRow);
  box.appendChild(closeBtn);
  modal.appendChild(box);
  document.body.appendChild(modal);

  function renderSlide() {
    const tip = tips[idx];
    titleEl.textContent = tip.title;
    bodyEl.innerHTML = tip.body;
    dotsEl.innerHTML = tips
      .map((_, i) =>
        `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 3px;${i === idx ? 'background:#0074d9;' : 'background:#ccc;'}"></span>`
      )
      .join('');
    prevBtn.disabled = idx === 0;
    nextBtn.textContent = idx === tips.length - 1 ? 'Done' : 'Next ▶';
  }

  prevBtn.onclick = () => {
    if (idx > 0) {
      idx--;
      renderSlide();
    }
  };

  nextBtn.onclick = () => {
    if (idx < tips.length - 1) {
      idx++;
      renderSlide();
    } else {
      document.body.removeChild(modal);
    }
  };

  closeBtn.onclick = () => {
    document.body.removeChild(modal);
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };

  renderSlide();
}

// Observe Now Playing screen for changes and attach listeners
const observer = new MutationObserver(() => {
  const nowPlaying = document.querySelector('.nowplaying-container');
  if (nowPlaying) {
    attachNowPlayingButtonListeners();
  }
});
observer.observe(document.getElementById('vpodScreen'), { childList: true, subtree: true });