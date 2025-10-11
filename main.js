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

function renderLoadingScreen(message = "Loading your music...") {
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

function goTo(screenFn) {
  navStack.push(screenFn);
  screenFn('forward');
}
function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    navStack[navStack.length - 1]('back');
  }
}

// Main Menu 
function renderMainMenu(direction = 'forward') {
  renderScreen(`
    <ul class="menu-list">
      <li id="menu-load">Load Music</li>
      <li id="menu-albums">Albums</li>
      <li id="menu-playlists">Playlists</li>
    </ul>
  `, direction);

  document.getElementById('menu-load').onclick = () => {
    currentMenuIndex = 0;
    goTo(renderLoadMusic);
  };
  document.getElementById('menu-albums').onclick = () => {
    currentMenuIndex = 1;
    goTo(renderAlbumsMenu);
  };
  document.getElementById('menu-playlists').onclick = () => {
    currentMenuIndex = 2;
    goTo(renderPlaylistsMenu);
  };
}

// Load Music Screen 
function renderLoadMusic(direction = 'forward') {
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <input type="file" id="fileInput" accept=".mp3,.flac,.cue,.m3u" multiple webkitdirectory directory style="display:none;">
      <button id="customFileBtn" class="custom-file-btn">Choose Music Folder</button>
    </div>
  `, direction);

  const fileInput = document.getElementById('fileInput');
  document.getElementById('customFileBtn').onclick = () => fileInput.click();
  fileInput.onchange = handleFiles;
}

function handleFiles(e) {
  renderLoadingScreen("Loading your music...");

  const files = Array.from(e.target.files);
  const audioFiles = files.filter(f => f.name.match(/\.(mp3|flac)$/i));
  const cueFiles = files.filter(f => f.name.match(/\.cue$/i));
  const imageFiles = files.filter(f => f.name.match(/\.(jpg|jpeg)$/i));
  window.imageFiles = window.imageFiles ? window.imageFiles.concat(imageFiles) : imageFiles;

  let processed = 0;

  function parseCue(text, flacFile) {
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
    let total = audioFiles.length;
    let done = 0;
    if (total === 0) {
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
  return parts.join('/');
}

function groupTracksByAlbum() {
  albums = {};

  const folderImages = {};
  if (window.imageFiles && window.imageFiles.length) {
    window.imageFiles.forEach(img => {
      const folder = getFolderPath(img);
      if (!folderImages[folder]) folderImages[folder] = img;
    });
  }

  tracks.forEach(track => {
    const album = track.album || 'Unidentified Album';
    if (!albums[album]) {
      albums[album] = { artist: track.artist, cover: null, songs: [], folder: getFolderPath(track.file) };
    }
    albums[album].songs.push(track);
  });

  // Assign cover images to albums
  Object.keys(albums).forEach(albumName => {
    const albumObj = albums[albumName];
    const folder = albumObj.folder;
    let coverFile = null;

    // Only use an image from the same folder as the album
    if (folderImages[folder]) {
      coverFile = folderImages[folder];
    }

    // Revoke previous blob URL if present
    if (albumObj.cover && albumObj.cover.startsWith("blob:")) {
      URL.revokeObjectURL(albumObj.cover);
    }

    // If not found, use the default image 
    albumObj.cover = coverFile
      ? URL.createObjectURL(coverFile)
      : "default-cover.png";
  });
}

// Albums Menu
function renderAlbumsMenu(direction = 'forward') {
  renderScreen(`
    <div class="album-list">
      <div class="album-list-left" id="albumsList"></div>
      <div class="album-list-right" id="albumArt"></div>
    </div>
  `, direction);

  renderAlbumsList();
}

function renderAlbumsList() {
  const albumsList = document.getElementById('albumsList');
  const albumArt = document.getElementById('albumArt');
  albumsList.innerHTML = '';
  albumArt.innerHTML = '';

  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  if (albumNames.length === 0) {
    albumsList.innerHTML = '<div style="padding:24px;">No albums loaded.</div>';
    return;
  }

  albumNames.forEach((album, idx) => {
    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.innerHTML = `<span>${album}</span>`;
    div.onclick = () => {
      currentMenuIndex = idx;
      goTo(dir => renderAlbumSongsMenu(album, dir));
    };
    albumsList.appendChild(div);
  });

  setScrollingAlbum(currentMenuIndex);
  if (albumsList.children[currentMenuIndex]);
}

function setScrollingAlbum(idx) {
  const albumsList = document.getElementById('albumsList');
  Array.from(albumsList.children).forEach((el, i) => {
    el.classList.toggle('scrolling', i === idx);
  });
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  if (albumNames[idx]) {
    const albumArt = document.getElementById('albumArt');
    const cover = albums[albumNames[idx]].cover;
    albumArt.innerHTML = `<img src="${cover}" class="album-cover" alt="Album Cover">`;
    
  }
}

function clearScrollingAlbum(idx) {
  const albumsList = document.getElementById('albumsList');
  if (albumsList.children[idx]) {
    albumsList.children[idx].classList.remove('scrolling');
  }
}

// Album Songs Menu 
function renderAlbumSongsMenu(album, direction = 'forward') {
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
  const songsList = document.getElementById('songsList');
  songsList.innerHTML = '';
  songs.forEach((track, idx) => {
    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.innerHTML = `<span>${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
    div.onclick = () => {
      currentMenuIndex = idx;
      playTrackFromAlbum(track);
    };
    songsList.appendChild(div);
  });
  setScrollingSong(currentMenuIndex);
  if (songsList.children[currentMenuIndex]);
}

function setScrollingSong(idx) {
  const songsList = document.getElementById('songsList');
  Array.from(songsList.children).forEach((el, i) => {
    el.classList.toggle('scrolling', i === idx);
  });
}

function clearScrollingSong(idx) {
  const songsList = document.getElementById('songsList');
  if (songsList.children[idx]) {
    songsList.children[idx].classList.remove('scrolling');
  }
}

// Playlists Menu (Placeholder)
function renderPlaylistsMenu(direction = 'forward') {
  renderScreen(`
    <div style="padding:24px;text-align:center;">Playlists coming soon...</div>
  `, direction);

}

// Audio Playback
function playTrackFromAlbum(track) {
  const url = URL.createObjectURL(track.file);
  audioPlayer.src = url;
  audioPlayer.play();
  playPauseBtn.textContent = "⏸";
  currentTrack = track;
}

// Disk Pad Controls 
document.getElementById('menuBtn').onclick = () => goBack();
document.getElementById('playPauseBtn').onclick = () => {
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
  scrollMenu(1);
};
document.getElementById('prevBtn').onclick = () => {
  scrollMenu(-1);
};
document.getElementById('confirmBtn').onclick = () => {
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
  // Prefer #songsList if present, else .album-list-left, else .menu-list
  let menu =
    document.getElementById('songsList') ||
    document.querySelector('.album-list-left') ||
    document.querySelector('.menu-list');
  if (!menu) return;

  // Always select only .menu-list-song items for song and album lists
  let items = Array.from(menu.querySelectorAll('.menu-list-song'));
  // For main menu, fallback to LI items
  if (!items.length && menu.classList.contains('menu-list')) {
    items = Array.from(menu.querySelectorAll('li'));
  }
  if (!items.length) return;

  // Remove active from previous
  items[currentMenuIndex]?.classList.remove('active');
  if (menu.id === 'songsList') clearScrollingSong(currentMenuIndex);
  if (menu.id === 'albumsList' || menu.classList.contains('album-list-left')) clearScrollingAlbum(currentMenuIndex);

  // Update index
  currentMenuIndex += direction;
  if (currentMenuIndex < 0) currentMenuIndex = items.length - 1;
  if (currentMenuIndex >= items.length) currentMenuIndex = 0;

  // Add active to new
  items[currentMenuIndex].classList.add('active');
  items[currentMenuIndex].scrollIntoView({ block: 'nearest' });
  if (menu.id === 'songsList') setScrollingSong(currentMenuIndex);
  if (menu.id === 'albumsList' || menu.classList.contains('album-list-left')) setScrollingAlbum(currentMenuIndex);
}

// Reset menu index on screen change
function resetMenuIndex() {
  currentMenuIndex = 0;
  setTimeout(() => scrollMenu(0), 10);
}

// Playlist Storage (for future expansion)
function savePlaylists() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

renderMainMenu();
navStack = [renderMainMenu];

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}