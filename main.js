const vpodScreen = document.getElementById('vpodScreen');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let tracks = []; 
let albums = {}; 
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let navStack = [];
let currentTrack = null; 
let currentMenuIndex = 0;
let currentAlbumSongs = [];
let currentSongIndex = -1;

function renderLoadingScreen(message = "Loading your music...") {
  console.log("Rendering loading screen:", message);
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div class="loader" style="margin-bottom:18px;">
        <div style="width:40px;height:40px;border:4px solid #ccc;border-top:4px solid #0074d9;border-radius:50%;animation:spin 1s linear infinite;"></div>
      </div>
      <div style="font-size:1.1em;color:#555;">${message}</div>
    </div>
  `, 'forward');
}

// Navigation & Screen Rendering 
function renderScreen(content, direction = 'forward') {
  console.log("Rendering screen, direction:", direction);
  const oldContent = vpodScreen.querySelector('.screen-content');
  if (oldContent) {
    oldContent.classList.remove('screen-active');
    oldContent.classList.add(direction === 'forward' ? 'screen-slide-out' : 'screen-slide-in');
    setTimeout(() => oldContent.remove(), 350);
  }
  const div = document.createElement('div');
  div.className = 'screen-content screen-active';
  div.innerHTML = content;
  vpodScreen.appendChild(div);
  resetMenuIndex();
}

function goTo(screenFn, ...args) {
  console.log("Navigating to new screen:", screenFn.name, args);
  navStack.push({ fn: screenFn, args });
  screenFn('forward', ...args);
}

function goBack() {
  console.log("Going back in navStack, current length:", navStack.length);
  if (navStack.length > 1) {
    navStack.pop();
    const { fn, args } = navStack[navStack.length - 1];
    fn('back', ...args);
  }
}

// Main Menu 
function renderMainMenu(direction = 'forward') {
  renderScreen(`
    <ul class="menu-list">
      <li id="menu-load">Load Music</li>
      <li id="menu-albums">Albums</li>
      <li id="menu-artists">Artists</li>
      <li id="menu-playlists">Playlists</li>
      <li id="menu-nowplaying">Now Playing</li>
    </ul>
  `, direction);

  document.getElementById('menu-load').onclick = () => { currentMenuIndex = 0; goTo(renderLoadMusic); };
  document.getElementById('menu-albums').onclick = () => { currentMenuIndex = 1; goTo(renderAlbumsMenu); };
  document.getElementById('menu-artists').onclick = () => { currentMenuIndex = 2; goTo(renderArtistsMenu); };
  document.getElementById('menu-playlists').onclick = () => { currentMenuIndex = 3; goTo(renderPlaylistsMenu); };
  document.getElementById('menu-nowplaying').onclick = () => { currentMenuIndex = 4; goTo(renderNowPlayingScreen); };
}

// Load Music Screen 
function renderLoadMusic(direction = 'forward') {
  console.log("Rendering load music screen");
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <input type="file" id="fileInput" accept=".mp3,.flac,.cue,.m3u" multiple webkitdirectory directory style="display:none;">
      <button id="customFileBtn" class="custom-file-btn">Choose Music Folder</button>
    </div>
  `, direction);

  const fileInput = document.getElementById('fileInput');
  document.getElementById('customFileBtn').onclick = () => {
    console.log("Clicked: Choose Music Folder");
    fileInput.click();
  };
  fileInput.onchange = handleFiles;
}

function handleFiles(e) {
  console.log("Handling files:", e.target.files);
  renderLoadingScreen("Loading your music...");

  const files = Array.from(e.target.files);
  const audioFiles = files.filter(f => f.name.match(/\.(mp3|flac)$/i));
  const cueFiles = files.filter(f => f.name.match(/\.cue$/i));
  const imageFiles = files.filter(f => f.name.match(/\.(jpg|jpeg)$/i));
  window.imageFiles = window.imageFiles ? window.imageFiles.concat(imageFiles) : imageFiles;

  console.log("Audio files:", audioFiles);
  console.log("Cue files:", cueFiles);
  console.log("Image files:", imageFiles);

  let processed = 0;

  function parseCue(text, flacFile) {
    console.log("Parsing CUE file:", flacFile ? flacFile.name : "No FLAC");
    const albumMatch = text.match(/^\s*TITLE\s+"([^"]+)"/m);
    const album = albumMatch ? albumMatch[1] : 'Unidentified Album';
    const artistMatch = text.match(/^\s*PERFORMER\s+"([^"]+)"/m);
    const artist = artistMatch ? artistMatch[1] : 'Unknown Artist';
    const trackRegex = /TRACK\s+\d+\s+AUDIO([\s\S]*?)(?=TRACK|\Z)/g;
    let match;
    let cueTracks = [];
    while ((match = trackRegex.exec(text))) {
      const trackBlock = match[1];
      const titleMatch = trackBlock.match(/TITLE\s+"([^"]+)"/);
      const performerMatch = trackBlock.match(/PERFORMER\s+"([^"]+)"/);
      cueTracks.push({
        file: flacFile,
        title: titleMatch ? titleMatch[1] : flacFile ? flacFile.name : 'Unknown Track',
        artist: performerMatch ? performerMatch[1] : artist,
        album
      });
    }
    console.log("Parsed cue tracks:", cueTracks);
    return cueTracks;
  }

  let cueTracks = [];
  if (cueFiles.length && audioFiles.length) {
    cueFiles.forEach(cueFile => {
      const reader = new FileReader();
      reader.onload = function(ev) {
        const cueText = ev.target.result;
        const fileMatch = cueText.match(/FILE\s+"([^"]+\.flac)"/i);
        let flacFile = null;
        if (fileMatch) {
          flacFile = audioFiles.find(f => f.name === fileMatch[1]);
        }
        if (flacFile) {
          cueTracks = cueTracks.concat(parseCue(cueText, flacFile));
        }
        if (++processed === cueFiles.length) {
          processAudioFiles();
        }
      };
      reader.readAsText(cueFile);
    });
  } else {
    processAudioFiles();
  }

  function processAudioFiles() {
    console.log("Processing audio files...");
    let total = audioFiles.length;
    let done = 0;
    if (total === 0) {
      console.log("No audio files, only cue tracks:", cueTracks);
      cueTracks.forEach(ct => {
        if (!tracks.some(t =>
          t.file.name === ct.file.name &&
          t.file.size === ct.file.size
        )) {
          tracks.push(ct);
        }
      });
      groupTracksByAlbum();
      goBack();
      return;
    }
    audioFiles.forEach(file => {
      window.jsmediatags.read(file, {
        onSuccess: tag => {
          const { title, artist, album } = tag.tags;
          console.log("Read tags for:", file.name, tag.tags);
          if (!tracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            tracks.push({
              file,
              title: title || file.name.replace(/\.(mp3|flac)$/i, ''),
              artist: artist || 'Unknown Artist',
              album: album || 'Unidentified Album'
            });
          }
          if (++done === total) {
            cueTracks.forEach(ct => {
              if (!tracks.some(t =>
                t.file.name === ct.file.name &&
                t.file.size === ct.file.size
              )) {
                tracks.push(ct);
              }
            });
            groupTracksByAlbum();
            goBack();
          }
        },
        onError: () => {
          console.log("Error reading tags for:", file.name);
          if (!tracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            tracks.push({
              file,
              title: file.name.replace(/\.(mp3|flac)$/i, ''),
              artist: 'Unknown Artist',
              album: 'Unidentified Album'
            });
          }
          if (++done === total) {
            cueTracks.forEach(ct => {
              if (!tracks.some(t =>
                t.file.name === ct.file.name &&
                t.file.size === ct.file.size
              )) {
                tracks.push(ct);
              }
            });
            groupTracksByAlbum();
            goBack();
          }
        }
      });
    });
  }
}

function getFolderPath(file) {
  if (!file.webkitRelativePath) return '';
  const parts = file.webkitRelativePath.split('/');
  parts.pop(); 
  const folder = parts.join('/');
  console.log("Got folder path for file:", file.name, folder);
  return folder;
}

function groupTracksByAlbum() {
  console.log("Grouping tracks by album...");
  albums = {};

  const folderImages = {};
  if (window.imageFiles && window.imageFiles.length) {
    window.imageFiles.forEach(img => {
      const folder = getFolderPath(img);
      if (!folderImages[folder]) folderImages[folder] = img;
    });
    console.log("Folder images map:", folderImages);
  }

  tracks.forEach(track => {
    const album = track.album || 'Unidentified Album';
    if (!albums[album]) {
      albums[album] = { artist: track.artist, cover: null, songs: [], folder: getFolderPath(track.file) };
    }
    albums[album].songs.push(track);
  });

  Object.keys(albums).forEach(albumName => {
    const albumObj = albums[albumName];
    const folder = albumObj.folder;
    let coverFile = null;

    if (folderImages[folder]) {
      coverFile = folderImages[folder];
    }

    if (albumObj.cover && albumObj.cover.startsWith("blob:")) {
      URL.revokeObjectURL(albumObj.cover);
    }

    albumObj.cover = coverFile
      ? URL.createObjectURL(coverFile)
      : "default-cover.png";
    console.log(`Album "${albumName}" assigned cover:`, albumObj.cover);
  });
  console.log("Albums grouped:", albums);
}

// Albums Menu
function renderAlbumsMenu(direction = 'forward') {
  console.log("Rendering albums menu (carousel)");
  renderScreen(`
    <div class="album-carousel-container">
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle"></div>
    </div>
  `, direction);

  renderAlbumsCarousel();
}

function renderAlbumsCarousel() {
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  carousel.innerHTML = '';

  if (albumNames.length === 0) {
    carousel.innerHTML = '<div style="padding:24px;">No albums loaded.</div>';
    title.textContent = '';
    return;
  }

  albumNames.forEach((album, idx) => {
    const albumObj = albums[album];
    const div = document.createElement('div');
    div.className = 'carousel-album';
    div.innerHTML = `<img src="${albumObj.cover}" class="carousel-cover" alt="Album Cover">`;
    div.onclick = () => {
      currentMenuIndex = idx;
      goTo(dir => renderAlbumSongsMenu(album, dir));
    };
    carousel.appendChild(div);
  });

  setCarouselAlbum(currentMenuIndex, albumNames);
}

function setCarouselAlbum(idx, albumNames) {
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  const spacing = 80; // px between covers (was 140)

  Array.from(carousel.children).forEach((el, i) => {
    el.className = 'carousel-album';
    el.style.zIndex = '';
    el.style.opacity = '';
    el.style.filter = '';
    el.style.transform = '';

    if (i === idx) {
      el.classList.add('carousel-album-center');
      el.style.transform = `translate(-50%, -50%) scale(1.25) rotateY(0deg)`;
      el.style.zIndex = 10;
      el.style.opacity = 1;
      el.style.filter = 'brightness(1) blur(0px)';
    } else if (i < idx) {
      el.classList.add('carousel-album-left');
      const offset = spacing * (idx - i);
      el.style.transform = `translate(calc(-50% - ${offset}px), -50%) scale(0.95) rotateY(55deg)`; // was 35deg
      el.style.zIndex = 5 - (idx - i);
      el.style.opacity = 0.7;
      el.style.filter = 'brightness(0.85) blur(0.5px)';
    } else if (i > idx) {
      el.classList.add('carousel-album-right');
      const offset = spacing * (i - idx);
      el.style.transform = `translate(calc(-50% + ${offset}px), -50%) scale(0.95) rotateY(-55deg)`; // was -35deg
      el.style.zIndex = 5 - (i - idx);
      el.style.opacity = 0.7;
      el.style.filter = 'brightness(0.85) blur(0.5px)';
    }
  });
  title.textContent = albumNames[idx] || '';
}

function setScrollingAlbum(idx) {
  console.log("Setting scrolling album index:", idx);
  const albumsList = document.getElementById('albumsList');
  Array.from(albumsList.children).forEach((el, i) => {
    el.classList.toggle('scrolling', i === idx);
  });
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  if (albumNames[idx]) {
    const albumArt = document.getElementById('albumArt');
    const cover = albums[albumNames[idx]].cover;
    albumArt.innerHTML = `<img src="${cover}" class="album-cover" alt="Album Cover">`;
    console.log("Displayed album art for:", albumNames[idx], cover);
  }
}

function clearScrollingAlbum(idx) {
  console.log("Clearing scrolling album index:", idx);
  const albumsList = document.getElementById('albumsList');
  if (albumsList.children[idx]) {
    albumsList.children[idx].classList.remove('scrolling');
  }
}

// Album Songs Menu 
function renderAlbumSongsMenu(direction = 'forward', album) {
  console.log("Rendering album songs menu for:", album);
  const albumObj = albums[album];
  renderScreen(`
    <div class="album-list">
      <div class="album-list-left" id="songsListContainer">
        <div id="songsList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumObj.cover}" class="album-cover" alt="Album Cover">
      </div>
    </div>
  `, direction);

  renderSongsList(albumObj.songs);
}

function renderSongsList(songs) {
  console.log("Rendering songs list:", songs);
  const songsList = document.getElementById('songsList');
  songsList.innerHTML = '';
  songs.forEach((track, idx) => {
    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.innerHTML = `<span>${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
    div.onclick = () => {
      console.log("Clicked song:", track.title, "at index:", idx);
      currentMenuIndex = idx;
      playTrackFromAlbum(track, songs);
    };
    songsList.appendChild(div);
  });
  setScrollingSong(currentMenuIndex);
  if (songsList.children[currentMenuIndex]);
}

function setScrollingSong(idx) {
  console.log("Setting scrolling song index:", idx);
  const songsList = document.getElementById('songsList');
  if (!songsList) return; 
  Array.from(songsList.children).forEach((el, i) => {
    el.classList.toggle('scrolling', i === idx);
  });
}

function clearScrollingSong(idx) {
  console.log("Clearing scrolling song index:", idx);
  const songsList = document.getElementById('songsList');
  if (songsList.children[idx]) {
    songsList.children[idx].classList.remove('scrolling');
  }
}

// Playlists Menu (Placeholder)
function renderPlaylistsMenu(direction = 'forward') {
  console.log("Rendering playlists menu");
  renderScreen(`
    <div style="padding:24px;text-align:center;">Playlists coming soon...</div>
  `, direction);

}

// Now Playing Screen
function renderNowPlayingScreen(direction = 'forward') {
  renderScreen(`
    <div class="nowplaying-container">
      <div class="nowplaying-info">
        <div class="nowplaying-cover">
          <img id="nowplayingCover" src="${getCurrentCover()}" alt="Album Cover">
        </div>
        <div class="nowplaying-meta">
          <div class="nowplaying-title">${currentTrack ? currentTrack.title : 'No song playing'}</div>
          <div class="nowplaying-artist">${currentTrack ? currentTrack.artist : ''}</div>
          <div class="nowplaying-album">${currentTrack ? currentTrack.album : ''}</div>
        </div>
      </div>
      <div class="nowplaying-progress">
        <span id="nowplayingElapsed">0:00</span>
        <div class="nowplaying-bar-bg">
          <div id="nowplayingBar" class="nowplaying-bar"></div>
        </div>
        <span id="nowplayingRemaining">0:00</span>
      </div>
    </div>
  `, direction);

  updateNowPlayingProgress();
}

function getCurrentCover() {
  if (!currentTrack) return "default-cover.png";
  const albumObj = albums[currentTrack.album] || {};
  return albumObj.cover || "default-cover.png";
}

function updateNowPlayingProgress() {
  const elapsedSpan = document.getElementById('nowplayingElapsed');
  const remainingSpan = document.getElementById('nowplayingRemaining');
  const bar = document.getElementById('nowplayingBar');
  if (!audioPlayer || !currentTrack) return;

  const duration = audioPlayer.duration || 0;
  const current = audioPlayer.currentTime || 0;
  if (elapsedSpan) elapsedSpan.textContent = formatTime(current);
  if (remainingSpan) remainingSpan.textContent = formatTime(Math.max(0, duration - current));
  if (bar) {
    bar.style.width = duration ? `${(current / duration) * 100}%` : '0%';
  }
}

// Artist Menu 
function renderArtistsMenu(direction = 'forward') {
  // Get unique sorted artist names
  const artistSet = new Set(tracks.map(t => t.artist || 'Unknown Artist'));
  const artistNames = Array.from(artistSet).sort((a, b) => a.localeCompare(b));

  renderScreen(`
    <ul class="menu-list" id="artistsList">
      ${artistNames.map((artist, idx) => `<li data-idx="${idx}">${artist}</li>`).join('')}
    </ul>
  `, direction);

  artistNames.forEach((artist, idx) => {
    document.querySelector(`#artistsList li[data-idx="${idx}"]`).onclick = () => {
      currentMenuIndex = idx;
      goTo(renderArtistAlbumsMenu, artist);
    };
  });
} 

function renderArtistAlbumsMenu(direction = 'forward', artist) {
  // Filter albums by artist
  const artistAlbums = Object.keys(albums)
    .filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);

  renderScreen(`
    <div class="album-carousel-container">
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle"></div>
    </div>
  `, direction);

  // Render only the artist's albums in the carousel
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  carousel.innerHTML = '';

  if (artistAlbums.length === 0) {
    carousel.innerHTML = '<div style="padding:24px;">No albums for this artist.</div>';
    title.textContent = '';
    return;
  }

  artistAlbums.forEach((album, idx) => {
    const albumObj = albums[album];
    const div = document.createElement('div');
    div.className = 'carousel-album';
    div.innerHTML = `<img src="${albumObj.cover}" class="carousel-cover" alt="Album Cover">`;
    div.onclick = () => {
      currentMenuIndex = idx;
      goTo(renderAlbumSongsMenu, album);
    };
    carousel.appendChild(div);
  });

  setCarouselAlbum(currentMenuIndex, artistAlbums);
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

audioPlayer.addEventListener('timeupdate', updateNowPlayingProgress);
audioPlayer.addEventListener('loadedmetadata', updateNowPlayingProgress);
audioPlayer.addEventListener('play', updateNowPlayingProgress);
audioPlayer.addEventListener('pause', updateNowPlayingProgress);

// Audio Playback
function playTrackFromAlbum(track, albumSongs) {
  console.log("Playing:", track.title, "from albumSongs:", albumSongs);
  currentAlbumSongs = albumSongs || [track];
  currentSongIndex = currentAlbumSongs.findIndex(t => t.file === track.file);
  currentTrack = track;
  currentMenuIndex = currentSongIndex; // Sync menu selection to playback

  const url = URL.createObjectURL(track.file);
  audioPlayer.src = url;
  audioPlayer.play();
  playPauseBtn.textContent = "⏸";
  setScrollingSong(currentMenuIndex); // Highlight the playing song

  const activeScreen = document.querySelector('.screen-content.screen-active');
  if (activeScreen && activeScreen.querySelector('.nowplaying-container')) {
    renderNowPlayingScreen('forward');
  }
}

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
  console.log("Confirm button clicked");
  // Album carousel logic
  const albumCarousel = document.getElementById('albumCarousel');
  if (albumCarousel && albumCarousel.children.length) {
    const centerAlbum = albumCarousel.children[currentMenuIndex];
    if (centerAlbum) {
      centerAlbum.click();
      return;
    }
  }

  // Artists menu logic
  const artistsList = document.getElementById('artistsList');
  if (artistsList && artistsList.children.length) {
    const selectedArtist = artistsList.children[currentMenuIndex];
    if (selectedArtist) {
      selectedArtist.click();
      return;
    }
  }

  // Fallback: normal menu logic
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

  console.log("Confirm selecting item at index:", currentMenuIndex);
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
  let menu =
    document.getElementById('songsList') ||
    document.getElementById('albumCarousel') ||
    document.getElementById('artistsList') || // <-- add this line
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
    setCarouselAlbum(currentMenuIndex, Object.keys(albums).sort((a, b) => a.localeCompare(b)));
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

// Reset menu index on screen change
function resetMenuIndex() {
  console.log("Resetting menu index");
  currentMenuIndex = 0;
  setTimeout(() => scrollMenu(0), 10);
}

// Playlist Storage (for future expansion)
function savePlaylists() {
  console.log("Saving playlists to localStorage");
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

console.log("App starting, rendering main menu");
renderMainMenu();
navStack = [{ fn: renderMainMenu, args: [] }];

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
  console.log("Service worker registered");
}