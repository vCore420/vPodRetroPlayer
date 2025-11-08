// --- NAVIGATION HELPERS ---

function goTo(screenFn, ...args) {
  navStack.push({ fn: screenFn, args });
  screenFn('forward', ...args);
}

function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    const { fn, args } = navStack[navStack.length - 1];
    fn('back', ...args);
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
  console.log("Play/Pause button clicked");
  if (!audioPlayer.src) return;
  if (audioPlayer.paused) {
    audioPlayer.play();
    playPauseBtn.textContent = "⏸";
  } else {
    audioPlayer.pause();
    playPauseBtn.textContent = "▶";
  }
};

document.getElementById('nextBtn').onclick = () => {
  console.log("Next button clicked");
  if (
    currentAlbumSongs.length &&
    currentSongIndex >= 0 &&
    currentSongIndex < currentAlbumSongs.length - 1
  ) {
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex + 1], currentAlbumSongs);
  }
};

document.getElementById('prevBtn').onclick = () => {
  console.log("Prev button clicked");
  if (
    currentAlbumSongs.length &&
    currentSongIndex > 0
  ) {
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
      const artist = navStack[navStack.length - 1].args[0];
      albumNames = Object.keys(albums).filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);
    } else {
      albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
    }
    const album = albumNames[currentMenuIndex];
    if (album) {
      // --- FIX: If in playlist creation/edit mode, open playlist song selection ---
      if (window.creatingPlaylist) {
        goTo(renderSongSelectionForPlaylist, album);
      } else {
        goTo(renderAlbumSongsMenu, album);
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

  // 6. Fallback: normal menu logic
  let menu =
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
    playPauseBtn.textContent = "▶";
    currentTrack = null;
    currentSongIndex = -1;
    console.log("Reached end of album or no more songs.");
  }
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
  document.addEventListener(e.type.startsWith('touch') ? 'touchmove' : 'mousemove', handleDiskMove);
  document.addEventListener(e.type.startsWith('touch') ? 'touchend' : 'mouseup', handleDiskEnd);
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
    document.getElementById('songsList') ||
    document.getElementById('albumCarousel') ||
    document.getElementById('artistsList') || 
    document.querySelector('.menu-list');
  if (!menu) return;

  let items = Array.from(menu.querySelectorAll('.menu-list-song, .carousel-album, li'));
  if (!items.length && menu.classList.contains('menu-list')) {
    items = Array.from(menu.querySelectorAll('li'));
  }
  if (!items.length) return;

  items[currentMenuIndex]?.classList.remove('active');

  // Carousel logic for albums
  if (menu.id === 'albumCarousel') {
    currentMenuIndex += direction;
    if (currentMenuIndex < 0) currentMenuIndex = items.length - 1;
    if (currentMenuIndex >= items.length) currentMenuIndex = 0;
    let albumNames = [];
    if (navStack.length > 0 && navStack[navStack.length - 1].fn === renderArtistAlbumsMenu) {
      const artist = navStack[navStack.length - 1].args[0];
      albumNames = Object.keys(albums).filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);
    } else {
      albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
    }
    setCarouselAlbum(currentMenuIndex, albumNames);
    return;
  }

  // Artists menu logic
  if (menu.id === 'artistsList') {
    currentMenuIndex += direction;
    if (currentMenuIndex < 0) currentMenuIndex = items.length - 1;
    if (currentMenuIndex >= items.length) currentMenuIndex = 0;
    items[currentMenuIndex].classList.add('active');
    items[currentMenuIndex].scrollIntoView({ block: 'nearest' });
    return;
  }

  if (menu.id === 'songsList') clearScrollingSong(currentMenuIndex);
  if (menu.id === 'albumsList' || menu.classList.contains('album-list-left')) clearScrollingAlbum(currentMenuIndex);

  currentMenuIndex += direction;
  if (currentMenuIndex < 0) currentMenuIndex = items.length - 1;
  if (currentMenuIndex >= items.length) currentMenuIndex = 0;

  items[currentMenuIndex].classList.add('active');
  items[currentMenuIndex].scrollIntoView({ block: 'nearest' });
  if (menu.id === 'songsList') setScrollingSong(currentMenuIndex);
  if (menu.id === 'albumsList' || menu.classList.contains('album-list-left')) setScrollingAlbum(currentMenuIndex);

  console.log("Menu scrolled to index:", currentMenuIndex);
}

nextBtn.onclick = () => {
  console.log("Next button clicked (playback)");
  if (
    currentAlbumSongs.length &&
    currentSongIndex >= 0 &&
    currentSongIndex < currentAlbumSongs.length - 1
  ) {
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex + 1], currentAlbumSongs);
  }
};

prevBtn.onclick = () => {
  console.log("Prev button clicked (playback)");
  if (
    currentAlbumSongs.length &&
    currentSongIndex > 0
  ) {
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex - 1], currentAlbumSongs);
  }
};