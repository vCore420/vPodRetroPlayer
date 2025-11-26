// --- NAVIGATION HELPERS ---

function goTo(screenFn, ...args) {
  navStack.push({ fn: screenFn, args: ['forward', ...args] });

  if (navStack.length > 1) {
    const prev = navStack[navStack.length - 2];
    if (prev.fn === renderAlbumsMenu) {
      prev.args[1] = args[1] !== undefined ? args[1] : 0;
    }
    if (prev.fn === renderArtistAlbumsMenu) {
      prev.args[2] = args[1] !== undefined ? args[1] : 0;
    }
    if (prev.fn === renderAlbumSelectionForPlaylist) {
      prev.args[1] = args[1] !== undefined ? args[1] : 0;
    }
  }

  screenFn(...navStack[navStack.length - 1].args);
}

function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    const { fn, args } = navStack[navStack.length - 1];
    args[0] = 'back'; // Set direction to 'back'
    console.log("Going back to:", fn.name, "with args:", args);
    fn(...args);
  }
}

function resetMenuIndex() {
  currentMenuIndex = 0;
  setTimeout(() => scrollMenu(0), 10);
}

// -- DISK CONTROLS --

// Disk Pad Controls 
document.getElementById('menuBtn').onclick = () => {
  console.log("Menu button clicked");
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
  if (
    currentAlbumSongs.length &&
    currentSongIndex >= 0 &&
    currentSongIndex < currentAlbumSongs.length - 1
  ) {
    // Track skip if not at end
    if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip) {
      window.logTrackSkip(currentTrack);
    }
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex + 1], currentAlbumSongs);
  }
};

document.getElementById('prevBtn').onclick = () => {
  console.log("Prev button clicked");
  if (
    currentAlbumSongs.length &&
    currentSongIndex > 0
  ) {
    // Track skip if not at start
    if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip) {
      window.logTrackSkip(currentTrack);
    }
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex - 1], currentAlbumSongs);
  }
};

document.getElementById('confirmBtn').onclick = () => {
  // 1. Playlist song selection mode: check for playlistSongsSelectList FIRST
  const playlistSongsSelectList = document.getElementById('playlistSongsSelectList');
  if (playlistSongsSelectList && playlistSongsSelectList.children.length) {
    let items = Array.from(playlistSongsSelectList.querySelectorAll('.menu-list-song'));
    if (items.length) {
      // This will call your toggle handler, NOT play the song
      items[currentMenuIndex]?.click();
    }
    return; // Prevent fallback logic!
  }

  // 2. Album carousel logic
  const albumCarousel = document.getElementById('albumCarousel');
  if (albumCarousel && albumCarousel.children.length) {
    let albumNames = [];
    if (navStack.length > 0 && navStack[navStack.length - 1].fn === renderArtistAlbumsMenu) {
      const artist = navStack[navStack.length - 1].args[1];
      albumNames = Object.keys(albums).filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);
    } else if (navStack.length > 0 && navStack[navStack.length - 1].fn === renderAlbumSelectionForPlaylist) {
      albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
    } else {
      albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
    }
    const album = albumNames[currentMenuIndex];
    if (album) {
      if (window.creatingPlaylist) {
        goTo(renderSongSelectionForPlaylist, album, currentMenuIndex);
      } else if (navStack.length > 0 && navStack[navStack.length - 1].fn === renderArtistAlbumsMenu) {
        const artist = navStack[navStack.length - 1].args[1];
        goTo(renderAlbumSongsMenu, album, currentMenuIndex, artist);
      } else {
        goTo(renderAlbumSongsMenu, album, currentMenuIndex);
      }
      return;
    }
  }

  // 3. Artists menu logic
  const artistsList = document.getElementById('artistsList');
  if (artistsList && artistsList.children.length) {
    const selectedArtist = artistsList.children[currentMenuIndex];
    if (selectedArtist) {
      selectedArtist.click();
      return;
    }
  }

  // 4. Playlists menu logic
  const playlistsList = document.getElementById('playlistsList');
  if (playlistsList && playlistsList.children.length) {
    playlistsList.children[currentMenuIndex]?.click();
    return;
  }

  // 5. Playlist songs menu logic
  const playlistSongsList = document.getElementById('playlistSongsList');
  if (playlistSongsList && playlistSongsList.children.length) {
    playlistSongsList.children[currentMenuIndex]?.click();
    return;
  }

  // 6. Colour menu confirm
  if (document.getElementById('colourGrid')) {
    if (window.onColourMenuScroll) window.onColourMenuScroll(direction);
    highlightColour(currentMenuIndex);
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

  items[currentMenuIndex]?.click();
};

audioPlayer.addEventListener('ended', () => {
  console.log("Audio ended, currentSongIndex:", currentSongIndex, "currentAlbumSongs:", currentAlbumSongs);
  if (
    currentAlbumSongs.length &&
    currentSongIndex >= 0 &&
    currentSongIndex < currentAlbumSongs.length - 1
  ) {
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex + 1], currentAlbumSongs);
  } else {
    const icon = playPauseBtn.querySelector('i');
    if (icon) icon.className = "fa-solid fa-play";
    currentTrack = null;
    currentSongIndex = -1;
    console.log("Reached end of album or no more songs.");
  }
});

audioPlayer.addEventListener('play', () => {
  const icon = playPauseBtn.querySelector('i');
  if (icon) icon.className = "fa-solid fa-pause";
});

audioPlayer.addEventListener('pause', () => {
  const icon = playPauseBtn.querySelector('i');
  if (icon) icon.className = "fa-solid fa-play";
});

// Disk Touch/Cursor Scroll 
const diskTouch = document.getElementById('diskTouch');
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

if (diskTouch) {
  diskTouch.addEventListener('mousedown', handleDiskStart);
  diskTouch.addEventListener('touchstart', handleDiskStart, { passive: false });
}

// Menu Scrolling Logic
function scrollMenu(direction) {
  console.log("Scrolling menu, direction:", direction);
  // Colour menu disk scroll
  if (document.getElementById('colourGrid')) {
    if (window.onColourMenuScroll) window.onColourMenuScroll(direction);
    return;
  }

  // Playlist song selection mode
  const playlistSongsSelectList = document.getElementById('playlistSongsSelectList');
  if (playlistSongsSelectList) {
    let items = Array.from(playlistSongsSelectList.querySelectorAll('.menu-list-song'));
    if (!items.length) return;

    items[currentMenuIndex]?.classList.remove('active');
    currentMenuIndex += direction;
    if (currentMenuIndex < 0) currentMenuIndex = items.length - 1;
    if (currentMenuIndex >= items.length) currentMenuIndex = 0;
    items[currentMenuIndex].classList.add('active');
    items[currentMenuIndex].scrollIntoView({ block: 'nearest' });
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
  currentMenuIndex += direction;
  if (currentMenuIndex < 0) currentMenuIndex = items.length - 1;
  if (currentMenuIndex >= items.length) currentMenuIndex = 0;

  // Highlight the new item
  items[currentMenuIndex].classList.add('active');
  items[currentMenuIndex].scrollIntoView({ block: 'nearest' });

  // Call master highlight function if available
  if (typeof window.updateHighlightedSong === 'function' && menu.id !== 'colourGrid') {
    window.updateHighlightedSong();
  }

  // Update album art for All Songs menu
  if (menu.id === 'allSongsList') {
    const trackTitle = items[currentMenuIndex].textContent.split(' - ')[0];
    const track = tracks.find(t => t.title === trackTitle);
    const albumObj = track ? (albums[track.album] || {}) : {};
    document.getElementById('allSongsArt').src = albumObj.cover || "src/img/default-cover.png";
  }

  // Carousel logic for albums
  if (menu.id === 'albumCarousel') {
    let albumNames = [];
    if (navStack.length > 0 && navStack[navStack.length - 1].fn === renderArtistAlbumsMenu) {
      const artist = navStack[navStack.length - 1].args[1];
      albumNames = Object.keys(albums).filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);
    } else if (navStack.length > 0 && navStack[navStack.length - 1].fn === renderAlbumSelectionForPlaylist) {
      albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
    } else {
      albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
    }
    setCarouselAlbum(currentMenuIndex, albumNames);
    return;
  }

  // Artists menu logic
  if (menu.id === 'artistsList') {
    items[currentMenuIndex].classList.add('active');
    items[currentMenuIndex].scrollIntoView({ block: 'nearest' });
    return;
  }

  // If you need to update scrolling for songs/albums, do it here (but don't increment index again)
  if (menu.id === 'songsList') setScrollingSong(currentMenuIndex);
  if (menu.id === 'albumsList' || menu.classList.contains('album-list-left')) setScrollingAlbum(currentMenuIndex);

  console.log("Menu scrolled to index:", currentMenuIndex);
}

