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

function renderMenuList({ title, items, onItemClick, showBack, onBack, id = "menuList" }, direction = 'forward') {
  renderScreen(`
    <div>
      ${title ? `<div class="menu-title" style="font-weight:bold;font-size:1.2em;text-align:center;margin-bottom:12px;">${title}</div>` : ''}
      <ul class="menu-list" id="${id}">
        ${items.map((item, idx) => `<li data-idx="${idx}">${item.label}</li>`).join('')}
      </ul>
  `, direction);

  items.forEach((item, idx) => {
    document.querySelector(`#${id} li[data-idx="${idx}"]`).onclick = () => onItemClick(idx, item);
  });
  if (showBack && onBack) {
    document.getElementById('genericBackBtn').onclick = onBack;
  }
}

function renderAlbumCarousel({ albumsList, onAlbumClick, title, showDone, onDone }, direction = 'forward') {
  renderScreen(`
    <div class="album-carousel-container">
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle">${title || ''}</div>
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
  setCarouselAlbum(currentMenuIndex, albumsList);

  if (showDone && onDone) {
    document.getElementById('donePlaylistBtn').onclick = onDone;
  }
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
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(item.action); }
  }, direction);
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

function renderAlbumsMenu(direction = 'forward') {
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  renderAlbumCarousel({
    albumsList: albumNames,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album); }
  }, direction);
}

function renderAlbumSongsMenu(direction = 'forward', album) {
  const albumObj = albums[album];
  renderSongList({
    songs: albumObj.songs,
    albumCover: albumObj.cover, 
    onSongClick: (track, idx) => { currentMenuIndex = idx; playTrackFromAlbum(track, albumObj.songs); }
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

function renderArtistAlbumsMenu(direction = 'forward', artist) {
  const artistAlbums = Object.keys(albums)
    .filter(albumName => (albums[albumName].artist || 'Unknown Artist') === artist);
  renderAlbumCarousel({
    albumsList: artistAlbums,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album); },
    title: artist
  }, direction);
}

// --- NOW PLAYING ---

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
      { label: "Equalizer", action: renderEqualizerMenu }
      // Add more settings here 
    ],
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(item.action); },
    onBack: goBack,
    id: "settingsList"
  }, direction);
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