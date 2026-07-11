// --- NAVIGATION HELPERS ---
const NAV_STACK_MAX = 30; 
let lastConfirmTime = 0;
const CONFIRM_THROTTLE_MS = 450;

function getSortedAlbumKeys() {
  return app.state.derivedData.sortedAlbumKeys || [];
}

function getMenuItemCount(menu, itemSelector) {
  const cachedCount = Number(menu?.dataset?.itemCount || 0);
  if (cachedCount > 0) return cachedCount;
  return menu ? menu.querySelectorAll(itemSelector).length : 0;
}

function getActiveScreenRoot() {
  return app.dom.vpodScreen?.querySelector('.screen-content.screen-active') || null;
}

function goTo(screenFn, ...args) {
  const stack = app.state.navStack;
  stack.push({ fn: screenFn, args: ['forward', ...args] });

  // Limit stack size
  if (stack.length > NAV_STACK_MAX) {
    app.state.navStack = stack.slice(stack.length - NAV_STACK_MAX);
    debugLog('Nav stack trimmed to max size:', NAV_STACK_MAX);
  }

  if (stack.length > 1) {
    const prev = stack[stack.length - 2];
  if (prev.fn === renderAlbumsMenu) {
    if (args[1] !== undefined) {
      prev.args[1] = args[1];
    } else {
      prev.args[1] = app.state.currentMenuIndex;
    }
  }
    if (prev.fn === renderArtistAlbumsMenu) {
      prev.args[2] = args[1] !== undefined ? args[1] : 0;
    }
    if (prev.fn === renderAlbumSelectionForPlaylist) {
      prev.args[1] = args[1] !== undefined ? args[1] : 0;
    }
  }

  const top = app.state.navStack[app.state.navStack.length - 1];
  screenFn(...top.args);
}

function goBack() {
  const stack = app.state.navStack;
  if (stack.length > 1) {
    stack.pop();
    const { fn, args } = stack[stack.length - 1];
    args[0] = 'back'; // Set direction to 'back'
    debugLog('Going back to:', fn.name, 'with args:', args);
    fn(...args);
  }
}

// -- DISK CONTROLS --

// Button Locker for Confirm Button
function runConfirmAction(handler) {
  const now = Date.now();
  if (now - lastConfirmTime < CONFIRM_THROTTLE_MS) {
    debugLog('Confirm ignored: UI transition in progress');
    return;
  }
  lastConfirmTime = now;
  handler();
}

// Disk Touch/Cursor Scroll 
let lastAngle = null;
let scrollAccumulator = 0;

function getAngle(e, center) {
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - center.x;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - center.y;
  return Math.atan2(y, x) * 180 / Math.PI;
}

function handleDiskStart(e) {
  debugLog('Disk touch/click start');
  const rect = diskTouch.getBoundingClientRect();
  const center = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
  lastAngle = getAngle(e, center);
  scrollAccumulator = 0;
  document.addEventListener(e.type.startsWith('touch') ? 'touchmove' : 'mousemove', handleDiskMove, { passive: false });
  document.addEventListener(e.type.startsWith('touch') ? 'touchend' : 'mouseup', handleDiskEnd, { passive: false });
  e.preventDefault();
}

function handleDiskMove(e) {
  const rect = diskTouch.getBoundingClientRect();
  const center = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
  const angle = getAngle(e, center);
  let delta = angle - lastAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  scrollAccumulator += delta;
  lastAngle = angle;

  // Scroll threshold
  while (scrollAccumulator > 30) {
    scrollMenu(1);
    scrollAccumulator -= 30;
  }
  while (scrollAccumulator < -30) {
    scrollMenu(-1);
    scrollAccumulator += 30;
  }
  e.preventDefault();
}

function handleDiskEnd(e) {
  debugLog('Disk touch/click end');
  document.removeEventListener(e.type.startsWith('touch') ? 'touchmove' : 'mousemove', handleDiskMove);
  document.removeEventListener(e.type.startsWith('touch') ? 'touchend' : 'mouseup', handleDiskEnd);
  lastAngle = null;
  scrollAccumulator = 0;
}

function attachDiskControlListeners() {
  document.getElementById('menuBtn').onclick = () => {
    debugLog('Menu button clicked');
    if (typeof window.onPlaylistAlbumMenuDone === 'function') {
      window.onPlaylistAlbumMenuDone();
      window.onPlaylistAlbumMenuDone = null;
      return;
    }
    goBack();
  };

  document.getElementById('playPauseBtn').onclick = async () => {
    if (!audioPlayer.src) return;

    const icon = playPauseBtn.querySelector('i');

    if (typeof clearPendingPlaybackRetry === 'function') {
      clearPendingPlaybackRetry();
    }

    if (audioPlayer.paused) {
      try {
        const playResult = audioPlayer.play();
        if (playResult && typeof playResult.then === 'function') {
          await playResult;
        }
        if (icon) icon.className = "fa-solid fa-pause";
      } catch (error) {
        console.warn('Manual play failed', error);
      }
    } else {
      audioPlayer.pause();
      if (icon) icon.className = "fa-solid fa-play";
    }
  };

  document.getElementById('nextBtn').onclick = () => {
    const state = app.state;
    if (state.smartMixActive) {
      const forwardEntry = typeof getSmartMixHistoryEntry === 'function'
        ? getSmartMixHistoryEntry(1)
        : null;
      if (forwardEntry) {
        if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
          window.logTrackSkip(state.currentTrack);
        }
        playTrackFromAlbum(forwardEntry.track, forwardEntry.queue, {
          smartMix: true,
          smartMixHistoryCursor: forwardEntry.cursor
        });
        return;
      }

      ensureSmartMixBuffer(10);
      const q = state.smartMixQueue || state.currentAlbumSongs || [];
      const idx = state.currentSongIndex;
      if (q.length && idx < q.length - 1) {
        if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
          window.logTrackSkip(state.currentTrack);
        }
        playTrackFromAlbum(q[idx + 1], q, { smartMix: true });
      }
      return;
    }

    // Normal queue advance
    const q = state.currentAlbumSongs || [];
    const idx = state.currentSongIndex;
    if (q.length && idx >= 0 && idx < q.length - 1) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
        window.logTrackSkip(state.currentTrack);
      }
      playTrackFromAlbum(q[idx + 1], q);
    }
  };

  document.getElementById('prevBtn').onclick = () => {
    const state = app.state;
    if (state.smartMixActive) {
      const previousEntry = typeof getSmartMixHistoryEntry === 'function'
        ? getSmartMixHistoryEntry(-1)
        : null;
      if (previousEntry) {
        if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
          window.logTrackSkip(state.currentTrack);
        }
        playTrackFromAlbum(previousEntry.track, previousEntry.queue, {
          smartMix: true,
          smartMixHistoryCursor: previousEntry.cursor
        });
      }
      return;
    }

    // Normal queue back
    const q = state.currentAlbumSongs || [];
    const idx = state.currentSongIndex;
    if (q.length && idx > 0) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
        window.logTrackSkip(state.currentTrack);
      }
      playTrackFromAlbum(q[idx - 1], q);
    }
  };

  document.getElementById('confirmBtn').onclick = () => {
    runConfirmAction(() => {
      const activeScreen = getActiveScreenRoot();
      const loadMusicActions = activeScreen?.querySelector('#loadMusicActions');

      if (loadMusicActions) {
        const rows = Array.from(loadMusicActions.querySelectorAll('li[data-idx], li'));
        const idx = Math.max(0, Math.min(app.state.currentMenuIndex, rows.length - 1));
        rows[idx]?.click();
        return;
      }

      // 1. Playlist song selection mode: check for playlistSongsSelectList FIRST
      const playlistSongsSelectList = activeScreen?.querySelector('#playlistSongsSelectList');
      if (playlistSongsSelectList && playlistSongsSelectList.children.length) {
        let items = Array.from(playlistSongsSelectList.querySelectorAll('.menu-list-song'));
        if (items.length) {
          const idx = app.state.currentMenuIndex;
          items[idx]?.click();
        }
        return;
      }

      // 2. Album carousel logic
      const albumCarousel = activeScreen?.querySelector('#albumCarousel');
      if (albumCarousel && albumCarousel.children.length) {
        let albumNames = [];
        const allAlbums = app.state.albums;
        const stack = app.state.navStack;

        if (stack.length > 0 && stack[stack.length - 1].fn === renderArtistAlbumsMenu) {
          const artistKey = stack[stack.length - 1].args[1];
          albumNames = Object.keys(allAlbums).filter(
            albumName =>
              (allAlbums[albumName].artist || 'Unknown Artist').trim().toLowerCase() === artistKey
          );
        } else if (stack.length > 0 && stack[stack.length - 1].fn === renderAlbumSelectionForPlaylist) {
          albumNames = getSortedAlbumKeys();
        } else {
          albumNames = getSortedAlbumKeys();
        }

        const idx = app.state.currentMenuIndex;
        const album = albumNames[idx];
        if (album) {
          if (window.creatingPlaylist) {
            goTo(renderSongSelectionForPlaylist, album, idx);
          } else if (stack.length > 0 && stack[stack.length - 1].fn === renderArtistAlbumsMenu) {
            const artistKey = stack[stack.length - 1].args[1];
            goTo(renderAlbumSongsMenu, album, idx, artistKey);
          } else {
            goTo(renderAlbumSongsMenu, album, idx);
          }
          return;
        }
      }

      // 3. Artists menu logic
      const artistsList = activeScreen?.querySelector('#artistsList');
      if (artistsList && artistsList.children.length) {
        const idx = app.state.currentMenuIndex;
        const selectedArtist = artistsList.children[idx];
        if (selectedArtist) {
          selectedArtist.click();
          return;
        }
      }

      // 4. Playlists menu logic
      const playlistsList = activeScreen?.querySelector('#playlistsList');
      if (playlistsList && playlistsList.children.length) {
        const idx = app.state.currentMenuIndex;
        playlistsList.children[idx]?.click();
        return;
      }

      // 5. Playlist songs menu logic
      const playlistSongsList = activeScreen?.querySelector('#playlistSongsList');
      if (playlistSongsList && playlistSongsList.children.length) {
        const idx = app.state.currentMenuIndex;
        playlistSongsList.children[idx]?.click();
        return;
      }

      // 6. Colour menu confirm
      if (activeScreen?.querySelector('#colourGrid')) {
        if (window.onColourMenuScroll) window.onColourMenuConfirm();
        return;
      }

      // 7. Fallback: normal menu logic
      let menu =
        activeScreen?.querySelector('#smartMixList') ||
        activeScreen?.querySelector('#suggestedList') ||
        activeScreen?.querySelector('#allSongsList') ||
        activeScreen?.querySelector('#songsList') ||
        activeScreen?.querySelector('.album-list-left') ||
        activeScreen?.querySelector('.menu-list');
      if (!menu) return;

      let items = Array.from(menu.querySelectorAll('.menu-list-song'));
      if (!items.length && menu.classList.contains('menu-list')) {
        items = Array.from(menu.querySelectorAll('li'));
      }
      if (!items.length) return;

      const idx = app.state.currentMenuIndex;
      items[idx]?.click();
    });
  };

  // Disk touch/cursor scroll
  const diskTouch = document.getElementById('diskTouch');
  if (diskTouch) {
    diskTouch.addEventListener('mousedown', handleDiskStart);
    diskTouch.addEventListener('touchstart', handleDiskStart, { passive: false });
  }
}

// Menu Scrolling Logic
function scrollMenu(direction) {
  debugLog('Scrolling menu, direction:', direction);
  const activeScreen = getActiveScreenRoot();
  const loadMusicActions = activeScreen?.querySelector('#loadMusicActions');

  if (loadMusicActions) {
    const itemCount = getMenuItemCount(loadMusicActions, 'li');
    if (!itemCount) return;

    let idx = Number.isFinite(app.state.currentMenuIndex) ? app.state.currentMenuIndex : 0;
    idx += direction;
    if (idx < 0) idx = itemCount - 1;
    if (idx >= itemCount) idx = 0;
    app.state.currentMenuIndex = idx;

    setActiveIndexedItem(loadMusicActions, 'li', idx, { scrollIntoView: true, center: true });
    if (typeof window.updateHighlightedSong === 'function') {
      window.updateHighlightedSong();
    }
    return;
  }

  const statsScreen = document.querySelector('.stats-screen');
  if (statsScreen) {
    statsScreen.scrollTop += direction * 48;
    return;
  }

  // Games menu scroll
  if (typeof window.onGameScroll === 'function') {
    window.onGameScroll(direction);
    return;
  }

  if (typeof window.onVisualizerScroll === 'function') {
    window.onVisualizerScroll(direction);
    return;
  }

  // Colour menu disk scroll
  if (document.getElementById('colourGrid')) {
    if (window.onColourMenuScroll) {
      window.onColourMenuScroll(direction);
      return;
    }
  }

  // Playlist song selection mode
  const playlistSongsSelectList = activeScreen?.querySelector('#playlistSongsSelectList');
  if (playlistSongsSelectList) {
    const itemCount = getMenuItemCount(playlistSongsSelectList, '.menu-list-song');
    if (!itemCount) return;

    let idx = app.state.currentMenuIndex;
    idx += direction;
    if (idx < 0) idx = itemCount - 1;
    if (idx >= itemCount) idx = 0;
    app.state.currentMenuIndex = idx;
    setActiveIndexedItem(playlistSongsSelectList, '.menu-list-song', idx, { scrollIntoView: true, center: true });
    return;
  }

  // Playlist songs menu (from Playlists -> a specific playlist)
  const playlistSongsList = activeScreen?.querySelector('#playlistSongsList');
  if (playlistSongsList) {
    const itemCount = getMenuItemCount(playlistSongsList, '.menu-list-song');
    if (!itemCount) return;

    let idx = app.state.currentMenuIndex;
    idx += direction;
    if (idx < 0) idx = itemCount - 1;
    if (idx >= itemCount) idx = 0;
    app.state.currentMenuIndex = idx;
    setActiveIndexedItem(playlistSongsList, '.menu-list-song', idx, { scrollIntoView: true, center: true });
    return;
  }
  // Normal menu logic
  let menu =
    activeScreen?.querySelector('#smartMixList') ||
    activeScreen?.querySelector('#suggestedList') ||
    activeScreen?.querySelector('#allSongsList') ||
    activeScreen?.querySelector('#songsList') ||
    activeScreen?.querySelector('#albumCarousel') ||
    activeScreen?.querySelector('#artistsList') ||
    activeScreen?.querySelector('.menu-list');
  if (!menu) return;

  // Get items for the active menu
  let itemSelector = '';
  if (menu.id === 'smartMixList' || menu.id === 'suggestedList' || menu.id === 'allSongsList' || menu.id === 'songsList') {
    itemSelector = '.menu-list-song';
  } else if (menu.id === 'albumCarousel') {
    itemSelector = '.carousel-album';
  } else if (menu.id === 'artistsList' || menu.classList.contains('menu-list')) {
    itemSelector = 'li';
  }

  const itemCount = getMenuItemCount(menu, itemSelector);
  if (!itemCount) return;

  // Update index
  let idx = app.state.currentMenuIndex;
  idx += direction;
  if (idx < 0) idx = itemCount - 1;
  if (idx >= itemCount) idx = 0;
  app.state.currentMenuIndex = idx;

  setActiveIndexedItem(menu, itemSelector, idx, {
    scrollIntoView: menu.id !== 'albumCarousel',
    center: menu.id !== 'albumCarousel'
  });

  // Call master highlight function if available
  if (typeof window.updateHighlightedSong === 'function' && menu.id !== 'colourGrid') {
    window.updateHighlightedSong();
  }

  // Update album art for All Songs menu
  if (menu.id === 'suggestedList') {
    return;
  }

  if (menu.id === 'allSongsList') {
    const allAlbums = app.state.albums;
    const list = window.allSongsCurrentList || app.state.tracks || [];
    const track = list[idx];
    const albumObj = track ? (allAlbums[track.albumKey || track.album] || {}) : {};
    const artEl = document.getElementById('allSongsArt');
    if (artEl) {
      artEl.src = albumObj.cover || "src/img/default-cover.png";
    }
  }

   // Carousel logic for albums
  if (menu.id === 'albumCarousel') {
    let albumNames = [];
    const allAlbums = app.state.albums;
    const stack = app.state.navStack;

    if (
      stack.length > 0 &&
      stack[stack.length - 1].fn === renderArtistAlbumsMenu
    ) {
      const artistKey = stack[stack.length - 1].args[1];
      albumNames = Object.keys(allAlbums).filter(
        key => (allAlbums[key].artist || 'Unknown Artist').trim().toLowerCase() === artistKey
      );
    } else if (
      stack.length > 0 &&
      stack[stack.length - 1].fn === renderAlbumSelectionForPlaylist
    ) {
      albumNames = getSortedAlbumKeys();
    } else {
      albumNames = getSortedAlbumKeys();
    }

    queueCarouselAlbum(app.state.currentMenuIndex, albumNames);
    return;
  }

  // Artists menu logic
  if (menu.id === 'artistsList') {
    setActiveIndexedItem(menu, 'li', app.state.currentMenuIndex, { scrollIntoView: true, center: true });
    return;
  }

  debugLog('Menu scrolled to index:', app.state.currentMenuIndex);
}

window.attachDiskControlListeners = attachDiskControlListeners;