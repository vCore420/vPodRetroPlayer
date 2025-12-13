// --- NAVIGATION HELPERS ---
const NAV_STACK_MAX = 30; 
let lastConfirmTime = 0;
const CONFIRM_THROTTLE_MS = 450;

function goTo(screenFn, ...args) {
  const stack = app.state.navStack;
  stack.push({ fn: screenFn, args: ['forward', ...args] });

  // Limit stack size
  if (stack.length > NAV_STACK_MAX) {
    app.state.navStack = stack.slice(stack.length - NAV_STACK_MAX);
    console.log("Nav stack trimmed to max size:", NAV_STACK_MAX);
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
    console.log("Going back to:", fn.name, "with args:", args);
    fn(...args);
  }
}

// -- DISK CONTROLS --

// Button Locker for Confirm Button
function runConfirmAction(handler) {
  const now = Date.now();
  if (now - lastConfirmTime < CONFIRM_THROTTLE_MS) {
    console.log("Confirm ignored: UI transition in progress");
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
  console.log("Disk touch/click start");
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
    console.log("Disk scroll: next");
    scrollMenu(1);
    scrollAccumulator -= 30;
  }
  while (scrollAccumulator < -30) {
    console.log("Disk scroll: prev");
    scrollMenu(-1);
    scrollAccumulator += 30;
  }
  e.preventDefault();
}

function handleDiskEnd(e) {
  console.log("Disk touch/click end");
  document.removeEventListener(e.type.startsWith('touch') ? 'touchmove' : 'mousemove', handleDiskMove);
  document.removeEventListener(e.type.startsWith('touch') ? 'touchend' : 'mouseup', handleDiskEnd);
  lastAngle = null;
  scrollAccumulator = 0;
}

function attachDiskControlListeners() {
  document.getElementById('menuBtn').onclick = () => {
    console.log("Menu button clicked");
    if (typeof window.onPlaylistAlbumMenuDone === 'function') {
      window.onPlaylistAlbumMenuDone();
      window.onPlaylistAlbumMenuDone = null;
      return;
    }
    goBack();
  };

  document.getElementById('playPauseBtn').onclick = () => {
    if (!audioPlayer.src) return;
    const icon = playPauseBtn.querySelector('i');
    if (audioPlayer.paused) {
      audioPlayer.play();
      if (icon) icon.className = "fa-solid fa-pause";
    } else {
      audioPlayer.pause();
      if (icon) icon.className = "fa-solid fa-play";
    }
  };

  document.getElementById('nextBtn').onclick = () => {
    console.log("Next button clicked");
    const state = app.state;
    if (
      state.currentAlbumSongs.length &&
      state.currentSongIndex >= 0 &&
      state.currentSongIndex < state.currentAlbumSongs.length - 1
    ) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
        window.logTrackSkip(state.currentTrack);
      }
      playTrackFromAlbum(state.currentAlbumSongs[state.currentSongIndex + 1], state.currentAlbumSongs);
    }
  };

  document.getElementById('prevBtn').onclick = () => {
    console.log("Prev button clicked");
    const state = app.state;
    if (
      state.currentAlbumSongs.length &&
      state.currentSongIndex > 0
    ) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && state.currentTrack) {
        window.logTrackSkip(state.currentTrack);
      }
      playTrackFromAlbum(state.currentAlbumSongs[state.currentSongIndex - 1], state.currentAlbumSongs);
    }
  };

  document.getElementById('confirmBtn').onclick = () => {
    runConfirmAction(() => {
      // 1. Playlist song selection mode: check for playlistSongsSelectList FIRST
      const playlistSongsSelectList = document.getElementById('playlistSongsSelectList');
      if (playlistSongsSelectList && playlistSongsSelectList.children.length) {
        let items = Array.from(playlistSongsSelectList.querySelectorAll('.menu-list-song'));
        if (items.length) {
          const idx = app.state.currentMenuIndex;
          items[idx]?.click();
        }
        return;
      }

      // 2. Album carousel logic
      const albumCarousel = document.getElementById('albumCarousel');
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
          albumNames = Object.keys(allAlbums).sort((a, b) =>
            (allAlbums[a].title || '').localeCompare(allAlbums[b].title || '') ||
            (allAlbums[a].artist || '').localeCompare(allAlbums[b].artist || '')
          );
        } else {
          // MAIN ALBUM CAROUSEL: sort by title then artist (matches renderAlbumsMenu)
          albumNames = Object.keys(allAlbums).sort((a, b) =>
            (allAlbums[a].title || '').localeCompare(allAlbums[b].title || '') ||
            (allAlbums[a].artist || '').localeCompare(allAlbums[b].artist || '')
          );
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
      const artistsList = document.getElementById('artistsList');
      if (artistsList && artistsList.children.length) {
        const idx = app.state.currentMenuIndex;
        const selectedArtist = artistsList.children[idx];
        if (selectedArtist) {
          selectedArtist.click();
          return;
        }
      }

      // 4. Playlists menu logic
      const playlistsList = document.getElementById('playlistsList');
      if (playlistsList && playlistsList.children.length) {
        const idx = app.state.currentMenuIndex;
        playlistsList.children[idx]?.click();
        return;
      }

      // 5. Playlist songs menu logic
      const playlistSongsList = document.getElementById('playlistSongsList');
      if (playlistSongsList && playlistSongsList.children.length) {
        const idx = app.state.currentMenuIndex;
        playlistSongsList.children[idx]?.click();
        return;
      }

      // 6. Colour menu confirm
      if (document.getElementById('colourGrid')) {
        if (window.onColourMenuScroll) window.onColourMenuConfirm();
        return;
      }

      // 7. Fallback: normal menu logic
      let menu =
        document.getElementById('allSongsList') ||
        document.getElementById('songsList') ||
        document.querySelector('.album-list-left') ||
        document.querySelector('.menu-list');
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
  console.log("Scrolling menu, direction:", direction);
  // Colour menu disk scroll
  if (document.getElementById('colourGrid')) {
    if (window.onColourMenuScroll) {
      window.onColourMenuScroll(direction);
      return;
    }
  }

  // Playlist song selection mode
  const playlistSongsSelectList = document.getElementById('playlistSongsSelectList');
  if (playlistSongsSelectList) {
    let items = Array.from(playlistSongsSelectList.querySelectorAll('.menu-list-song'));
    if (!items.length) return;

    let idx = app.state.currentMenuIndex;
    items[idx]?.classList.remove('active');
    idx += direction;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    app.state.currentMenuIndex = idx;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
    return;
  }

  // Playlist songs menu (from Playlists -> a specific playlist)
  const playlistSongsList = document.getElementById('playlistSongsList');
  if (playlistSongsList) {
    let items = Array.from(playlistSongsList.querySelectorAll('.menu-list-song'));
    if (!items.length) return;

    let idx = app.state.currentMenuIndex;
    items[idx]?.classList.remove('active');
    idx += direction;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    app.state.currentMenuIndex = idx;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
    return;
  }
  // Normal menu logic
  let menu =
    document.getElementById('allSongsList') ||
    document.getElementById('songsList') ||
    document.getElementById('albumCarousel') ||
    document.getElementById('artistsList') || 
    document.querySelector('.menu-list');
  if (!menu) return;

  // Get items for the active menu
  let items;
  if (menu.id === 'allSongsList') {
    items = Array.from(menu.querySelectorAll('.menu-list-song'));
  } else if (menu.id === 'songsList') {
    items = Array.from(menu.querySelectorAll('.menu-list-song'));
  } else if (menu.id === 'albumCarousel') {
    items = Array.from(menu.querySelectorAll('.carousel-album'));
  } else if (menu.id === 'artistsList') {
    items = Array.from(menu.querySelectorAll('li'));
  } else if (menu.classList.contains('menu-list')) {
    items = Array.from(menu.querySelectorAll('li'));
  } else {
    items = [];
  }
  if (!items.length) return;

  // Remove highlight from all items
  items.forEach(el => el.classList.remove('active'));

  // Update index
  let idx = app.state.currentMenuIndex;
  idx += direction;
  if (idx < 0) idx = items.length - 1;
  if (idx >= items.length) idx = 0;
  app.state.currentMenuIndex = idx;

  // Highlight the new item
  items[idx].classList.add('active');
  items[idx].scrollIntoView({ block: 'nearest' });

  // Call master highlight function if available
  if (typeof window.updateHighlightedSong === 'function' && menu.id !== 'colourGrid') {
    window.updateHighlightedSong();
  }

  // Update album art for All Songs menu
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
        key =>
          (allAlbums[key].artist || 'Unknown Artist').trim().toLowerCase() === artistKey
      );
    } else if (
      stack.length > 0 &&
      stack[stack.length - 1].fn === renderAlbumSelectionForPlaylist
    ) {
      albumNames = Object.keys(allAlbums).sort((a, b) =>
        (allAlbums[a].title || '').localeCompare(allAlbums[b].title || '') ||
        (allAlbums[a].artist || '').localeCompare(allAlbums[b].artist || '')
      );
    } else {
      albumNames = Object.keys(allAlbums).sort((a, b) =>
        (allAlbums[a].title || '').localeCompare(allAlbums[b].title || '') ||
        (allAlbums[a].artist || '').localeCompare(allAlbums[b].artist || '')
      );
    }

    setCarouselAlbum(app.state.currentMenuIndex, albumNames);
    return;
  }

  // Artists menu logic
  if (menu.id === 'artistsList') {
    const idx = app.state.currentMenuIndex;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
    return;
  }

  console.log("Menu scrolled to index:", app.state.currentMenuIndex);
}

window.attachDiskControlListeners = attachDiskControlListeners;