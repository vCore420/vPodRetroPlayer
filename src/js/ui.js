const defaultTimeSettings = {
  hourFormat: '24', // or '12'
  dateFormat: 'DD/MM/YYYY' // or 'MM/DD/YYYY'
};

function getTimeSettings() {
  return JSON.parse(localStorage.getItem('timeSettings')) || defaultTimeSettings;
}

function saveTimeSettings(settings) {
  localStorage.setItem('timeSettings', JSON.stringify(settings));
}

// --- GENERIC RENDERERS ---

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

function renderMenuList({ title, items, onItemClick, showBack, onBack, id = "menuList", before = "" }, direction = 'forward') {
  renderScreen(`
    ${before}
    <div>
      ${title ? `<div class="menu-title" style="font-weight:bold;font-size:1.2em;text-align:center;margin-bottom:12px;">${title}</div>` : ''}
      <ul class="menu-list" id="${id}">
        ${items.map((item, idx) => `<li data-idx="${idx}">${item.label}</li>`).join('')}
      </ul>
    </div>
  `, direction);

  items.forEach((item, idx) => {
    document.querySelector(`#${id} li[data-idx="${idx}"]`).onclick = () => onItemClick(idx, item);
  });
  if (showBack && onBack) {
    document.getElementById('genericBackBtn').onclick = onBack;
  }
}

function renderHotBar() {
  return `
    <div id="hotBar" style="
      width:100%;height:28px;display:flex;align-items:center;justify-content:center;
      font-size:1em;color:#222;z-index:10;">
      <span id="hotBarTime" style="flex:1;text-align:center;font-weight:bold;"></span>
      <span style="position:absolute;right:4px;top:2px;font-size:1.3em;">
        <span id="hotBarBattery" title="Battery Full">
          <svg width="40" height="30" viewBox="0 0 28 30" style="vertical-align:middle;">
            <rect x="1" y="3" width="24" height="8" rx="2" fill="#fff" stroke="#222" stroke-width="2"/>
            <rect x="3" y="5" width="20" height="4" rx="1" fill="#4caf50"/>
            <rect x="25" y="6" width="2" height="2" rx="1" fill="#222"/>
          </svg>
        </span>
      </span>
    </div>
  `;
}

// Update time
function updateHotBarTime() {
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
}
setInterval(updateHotBarTime, 1000);

function renderAlbumCarousel({ albumsList, onAlbumClick, title, showDone, onDone, selectedIdx = 0 }, direction = 'forward') {
  renderScreen(`
    <div class="album-carousel-container">
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle"></div>
      ${showDone ? `<button id="donePlaylistBtn" style="margin-top:12px;font-size:1em;">Done</button>` : ''}
    </div>
  `, direction);

  const carousel = document.getElementById('albumCarousel');
  carousel.innerHTML = '';
  albumsList.forEach((album, idx) => {
    const albumObj = albums[album];
    const div = document.createElement('div');
    div.className = 'carousel-album';
    div.innerHTML = `<img src="${albumObj.cover}" class="carousel-cover" alt="Album Cover">`;
    div.onclick = () => onAlbumClick(album, idx);
    carousel.appendChild(div);
  });
  setCarouselAlbum(selectedIdx, albumsList);

  if (showDone && onDone) {
    document.getElementById('donePlaylistBtn').onclick = onDone;
  }
  // Set currentMenuIndex for scroll wheel navigation
  currentMenuIndex = selectedIdx;
}

function renderSongList({ songs, onSongClick, selectedTracks = [], showBack, onBack, selectMode = false, albumCover }, direction = 'forward') {
  renderScreen(`
    <div class="album-list">
      <div class="album-list-left" id="songsListContainer" ${selectMode ? 'data-playlist-select="true"' : ''}>
        <div id="songsList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumCover || albums[songs[0]?.album]?.cover || 'src/img/default-cover.png'}" class="album-cover" alt="Album Cover">
      </div>
    </div>
    ${selectMode ? `<div style="text-align:center;margin-top:8px;"><span style="font-size:1em;color:#0074d9;">Tap songs to add/remove from playlist</span></div>` : ''}
  `, direction);

  const songsList = document.getElementById('songsList');
  songsList.innerHTML = '';
  songs.forEach((track, idx) => {
    const isSelected = selectedTracks.some(t =>
      (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
      (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
    );
    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.innerHTML = `<span>${selectMode && isSelected ? '✅ ' : ''}${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
    div.onclick = () => onSongClick(track, idx);
    songsList.appendChild(div);
  });

}

// --- MAIN MENU ---

function renderMainMenu(direction = 'forward') {
  renderMenuList({
    items: [
      { label: "Load Music", action: renderLoadMusic },
      { label: "Albums", action: renderAlbumsMenu },
      { label: "Artists", action: renderArtistsMenu },
      { label: "Playlists", action: renderPlaylistsMenu },
      { label: "Now Playing", action: renderNowPlayingScreen },
      { label: "Settings", action: renderSettingsMenu }
    ],
    onItemClick: (idx, item) => {
  currentMenuIndex = idx;
    if (item.action === renderAlbumsMenu) {
      goTo(renderAlbumsMenu, 0);
    } else {
      goTo(item.action);
    }
  },
    before: renderHotBar()
  }, direction);
  updateHotBarTime();
}

// --- LOAD MUSIC ---

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

// --- ALBUMS MENU ---

function renderAlbumsMenu(direction = 'forward', selectedIdx = 0) {
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  renderAlbumCarousel({
    albumsList: albumNames,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album, idx); },
    selectedIdx
  }, direction);
}

function renderAlbumSongsMenu(direction = 'forward', album, albumIdx = 0, artist = null) {
  const albumObj = albums[album];
  renderSongList({
    songs: albumObj.songs,
    albumCover: albumObj.cover, 
    onSongClick: (track, idx) => { currentMenuIndex = idx; playTrackFromAlbum(track, albumObj.songs); },
    showBack: true,
    onBack: () => {
      if (artist) {
        goTo(renderArtistAlbumsMenu, 'back', artist, albumIdx);
      } else {
        goTo(renderAlbumsMenu, 'back', albumIdx);
      }
    }
  }, direction);
}

// -- Album Carousel --

function setCarouselAlbum(idx, albumNames) {
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  const spacing = 80; // px between covers

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
      el.style.transform = `translate(calc(-50% - ${offset}px), -50%) scale(0.95) rotateY(55deg)`;
      el.style.zIndex = 5 - (idx - i);
      el.style.opacity = 0.7;
      el.style.filter = 'brightness(0.85) blur(0.5px)';
    } else if (i > idx) {
      el.classList.add('carousel-album-right');
      const offset = spacing * (i - idx);
      el.style.transform = `translate(calc(-50% + ${offset}px), -50%) scale(0.95) rotateY(-55deg)`;
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

// --- SONG LIST ---

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

// --- ARTISTS MENU ---

function renderArtistsMenu(direction = 'forward') {
  const artistSet = new Set(tracks.map(t => t.artist || 'Unknown Artist'));
  const artistNames = Array.from(artistSet).sort((a, b) => a.localeCompare(b));
  renderMenuList({
    title: "Artists",
    items: artistNames.map(name => ({ label: name })),
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(renderArtistAlbumsMenu, item.label); },
    onBack: goBack,
    id: "artistsList"
  }, direction);
}

function renderArtistAlbumsMenu(direction = 'forward', artist, selectedIdx = 0) {
  const artistAlbums = Object.keys(albums)
    .filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);
  renderAlbumCarousel({
    albumsList: artistAlbums,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album, idx, artist); },
    title: artist,
    selectedIdx
  }, direction);
}

// --- NOW PLAYING ---

function renderNowPlayingScreen(direction = 'forward') {
  renderScreen(
    renderHotBar() +
    `
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
  
  updateHotBarTime();
  updateNowPlayingProgress();
}

function getCurrentCover() {
  if (!currentTrack) return "src/img/default-cover.png";
  const albumObj = albums[currentTrack.album] || {};
  return albumObj.cover || "src/img/default-cover.png";
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

// --- SETTINGS MENU ---

function renderSettingsMenu(direction = 'forward') {
  renderMenuList({
    title: "Settings",
    items: [
      { label: "Equalizer", action: renderEqualizerMenu },
      { label: "Date and Time", action: renderDateTimeMenu }
      // Add more settings here 
    ],
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(item.action); },
    onBack: goBack,
    id: "settingsList",
    before: renderHotBar()
  }, direction);
  updateHotBarTime();
}

function renderEqualizerMenu(direction = 'forward', selectedIdx = null) {
  const currentPreset = localStorage.getItem('eqPreset') || "Flat";
  const presets = [
    "Flat",
    "Bass Boost",
    "Treble Boost",
    "Rock",
    "Pop",
    "Jazz",
    "Classical",
    "Dance",
    "Vocal Boost",
    "Soft",
    "Loudness",
    "Acoustic",
    "Electronic",
    "Metal",
    "Reggae"
  ];

  if (selectedIdx === null) {
    selectedIdx = presets.findIndex(label => label === currentPreset);
  }
  currentMenuIndex = selectedIdx;

  renderMenuList({
    title: "Equalizer Presets",
    items: presets.map(label => ({
      label: label + (label === currentPreset ? ' <span style="color:#0074d9;font-size:1.2em;">•</span>' : ''),
      rawLabel: label
    })),
    onItemClick: (idx, item) => {
        setEQPreset(item.rawLabel);

        const eqList = document.getElementById('eqList');
        if (eqList) {
            Array.from(eqList.children).forEach((li, i) => {
            li.innerHTML = presets[i] + (i === idx ? ' <span style="color:#0074d9;font-size:1.2em;">•</span>' : '');
            });
        }
        currentMenuIndex = idx;
    },
    onBack: goBack,
    id: "eqList"
  }, direction);

  const eqList = document.getElementById('eqList');
  if (eqList && eqList.children[selectedIdx]) {
    eqList.children[selectedIdx].classList.add('active');
    eqList.children[selectedIdx].scrollIntoView({ block: 'nearest' });
  }
}

function renderDateTimeMenu(direction = 'forward') {
  const settings = getTimeSettings();
  const now = new Date();

  // Format time
  let hours = now.getHours();
  let minutes = now.getMinutes().toString().padStart(2, '0');
  let ampm = '';
  if (settings.hourFormat === '12') {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const timeStr = `${hours}:${minutes}${ampm}`;

  // Format date
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth()+1).toString().padStart(2, '0');
  const year = now.getFullYear();
  let dateStr = settings.dateFormat === 'MM/DD/YYYY'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;

  renderScreen(
    renderHotBar() +
  `<div style="padding:32px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
    <div id="dateTimeTime" style="font-size:2em;font-weight:bold;margin-bottom:8px;">${timeStr}</div>
    <div id="dateTimeDate" style="font-size:1.2em;color:#444;margin-bottom:24px;">${dateStr}</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:1em;">Time Format:</label>
        <select id="hourFormatSelect" style="margin-left:8px;font-size:1em;">
          <option value="24" ${settings.hourFormat === '24' ? 'selected' : ''}>24 Hour</option>
          <option value="12" ${settings.hourFormat === '12' ? 'selected' : ''}>12 Hour</option>
        </select>
      </div>
      <div>
        <label style="font-size:1em;">Date Format:</label>
        <select id="dateFormatSelect" style="margin-left:8px;font-size:1em;">
          <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
          <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
        </select>
      </div>
    </div>`,
    direction
  );

  // Handlers
  document.getElementById('hourFormatSelect').onchange = (e) => {
    settings.hourFormat = e.target.value;
    saveTimeSettings(settings);
    updateDateTimeMenuDisplay();
  };
  document.getElementById('dateFormatSelect').onchange = (e) => {
    settings.dateFormat = e.target.value;
    saveTimeSettings(settings);
    updateDateTimeMenuDisplay();
  };

  // Live update time/date every second, but only update the text, not the whole screen
  if (window.dateTimeMenuInterval) clearInterval(window.dateTimeMenuInterval);
  window.dateTimeMenuInterval = setInterval(updateDateTimeMenuDisplay, 1000);

}

function updateDateTimeMenuDisplay() {
  const settings = getTimeSettings();
  const now = new Date();

  // Format time
  let hours = now.getHours();
  let minutes = now.getMinutes().toString().padStart(2, '0');
  let ampm = '';
  if (settings.hourFormat === '12') {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const timeStr = `${hours}:${minutes}${ampm}`;

  // Format date
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth()+1).toString().padStart(2, '0');
  const year = now.getFullYear();
  let dateStr = settings.dateFormat === 'MM/DD/YYYY'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;

  const timeEl = document.getElementById('dateTimeTime');
  const dateEl = document.getElementById('dateTimeDate');
  if (timeEl) timeEl.textContent = timeStr;
  if (dateEl) dateEl.textContent = dateStr;
}

