const defaultTimeSettings = {
  hourFormat: '24', 
  dateFormat: 'DD/MM/YYYY' 
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
          <svg width="40" height="36" viewBox="0 0 28 30" style="vertical-align:middle;">
            <rect x="1" y="3" width="24" height="8" rx="2" fill="#fff" stroke="#222" stroke-width="1"/>
            <rect x="2" y="4" width="22" height="6" rx="1" fill="url(#batteryGradient)"/>
            <rect x="25" y="6" width="2" height="2" rx="1" fill="#222"/>
            <defs>
              <linearGradient id="batteryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="60%" stop-color="#0074d9" />
                <stop offset="100%" stop-color="#4fc3f7" />
              </linearGradient>
            </defs>
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
  renderScreen(
    renderHotBar() +
    `<div class="album-list">
      <div class="album-list-left" id="songsListContainer" ${selectMode ? 'data-playlist-select="true"' : ''}>
        <div id="songsList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumCover || albums[songs[0]?.album]?.cover || 'src/img/default-cover.png'}" class="album-cover" alt="Album Cover">
        ${selectMode ? `<div style="margin-top:18px;text-align:center;width:100%;"><span style="font-size:1em;color:#0074d9;word-break:break-word;">Tap songs to add/remove from playlist</span></div>` : ''}
      </div>
    </div>
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

  function updateHighlightedSong(tracks, idx) {
    Array.from(songsList.children).forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
    const albumObj = albums[tracks[idx].album] || {};
    document.querySelector('.album-list-right img.album-cover').src = albumObj.cover || "src/img/default-cover.png";
  }
  // Initial highlight
  if (songs.length) {
    updateHighlightedSong(songs, currentMenuIndex);
  }
  // Expose for scrollMenu
  window.updateHighlightedSong = (idx) => updateHighlightedSong(songs, idx);
}

// --- MAIN MENU ---

function renderMainMenu(direction = 'forward') {
  renderMenuList({
    items: [
      { label: "Load Music", action: renderLoadMusic },
      { label: "Now Playing", action: renderNowPlayingScreen },
      { label: "Playlists", action: renderPlaylistsMenu }, 
      { label: "Artists", action: renderArtistsMenu },
      { label: "Albums", action: renderAlbumsMenu },
      { label: "All Songs", action: renderAllSongsMenu },
      { label: "Suggested", action: renderSuggestedMenu },
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
  renderScreen(
    renderHotBar() +
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <input type="file" id="fileInput" accept=".mp3,.flac,.cue,.m3u" multiple webkitdirectory directory style="display:none;">
      <button id="loadMusicBtn" class="load-music-btn">
        <span class="btn-icon">
          <i class="fa-solid fa-music"></i>
        </span>
        <span class="btn-text">Load Music</span>
      </button>
    </div>
  `, direction);

  const fileInput = document.getElementById('fileInput');
  document.getElementById('loadMusicBtn').onclick = () => fileInput.click();
  fileInput.onchange = handleFiles;
}

function renderLoadingScreen(message = "Loading your music...", loaded = 0, total = 0) {
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div class="loader" style="margin-bottom:18px;">
        <div style="width:48px;height:48px;border:5px solid #e0eaff;border-top:5px solid #0074d9;border-radius:50%;animation:spin 1s linear infinite;"></div>
      </div>
      <div style="font-size:1.15em;color:#0074d9;font-weight:bold;margin-bottom:8px;">${message}</div>
      <div id="loadingCounter" style="font-size:1em;color:#555;margin-bottom:4px;">
        ${total > 0 ? `Loaded ${loaded} of ${total} songs` : ''}
      </div>
      <div style="font-size:0.95em;color:#555;">Please wait while your music is loaded.</div>
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

// --- SET SCROLLING SONG ---

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
    before: renderHotBar(),
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

// --- All SONGS MENU ---

function renderAllSongsMenu(direction = 'forward') {
  // Get sort order from localStorage or default to title
  const sortOrder = localStorage.getItem('allSongsSortOrder') || 'title';
  let currentSortOrder = sortOrder;
  let sortedTracks = tracks.slice();
  function sortTracks(order) {
    currentSortOrder = order;
    localStorage.setItem('allSongsSortOrder', order);
    sortedTracks = tracks.slice();
    if (order === 'title') {
      sortedTracks.sort((a, b) => a.title.localeCompare(b.title));
    } else if (order === 'artist') {
      sortedTracks.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (order === 'album') {
      sortedTracks.sort((a, b) => a.album.localeCompare(b.album));
    }
    renderList(sortedTracks);
  }

  renderScreen(
    renderHotBar() +
    `<div style="display:flex;flex-direction:column;height:90%;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:1.1em;font-weight:bold;margin:auto;">All Songs</span>
        <button id="sortSongsBtn" title="Sort Songs" style="font-size:1.3em;background:none;border:none;color:#0074d9;cursor:pointer;">
          <i class="fa-solid fa-arrow-down-a-z"></i>
        </button>
      </div>
      <div style="margin-bottom:2px;">
        <input id="songSearchInput" type="text" placeholder="Search songs..." style="width:92%;max-width:320px;margin-left:8px;padding:4px 10px;border-radius:8px;border:1px solid #ccc;font-size:0.95em;">
      </div>
      <div class="album-list" style="height:calc(100% - 60px);">
        <div class="album-list-left" id="allSongsListContainer" style="height:100%;overflow-y:auto;">
          <div id="allSongsList"></div>
        </div>
        <div class="album-list-right" id="allSongsArtContainer">
          <img id="allSongsArt" src="src/img/default-cover.png" class="album-cover" alt="Album Cover">
        </div>
      </div>
    </div>`,
    direction
  );

  // Render song list
  function renderList(filteredTracks) {
    const songsList = document.getElementById('allSongsList');
    songsList.innerHTML = '';
    filteredTracks.forEach((track, idx) => {
      const div = document.createElement('div');
      div.className = 'menu-list-song';
      div.innerHTML = `<span>${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
      div.onclick = () => {
        currentMenuIndex = idx;
        playTrackFromAlbum(track, filteredTracks);
        updateHighlightedSong(filteredTracks, idx);
      };
      songsList.appendChild(div);
    });

    // Highlight the currentMenuIndex song and show its art
    function updateHighlightedSong(tracks, idx) {
      Array.from(songsList.children).forEach((el, i) => {
        el.classList.toggle('active', i === idx);
      });
      const albumObj = albums[tracks[idx].album] || {};
      document.getElementById('allSongsArt').src = albumObj.cover || "src/img/default-cover.png";
    }

    // Initial highlight
    if (filteredTracks.length) {
      updateHighlightedSong(filteredTracks, currentMenuIndex);
    }
  }

  renderList(sortedTracks);

  // Search functionality
  document.getElementById('songSearchInput').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = sortedTracks.filter(track =>
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album.toLowerCase().includes(query)
    );
    renderList(filtered);
  };

  // Sorting popup
  document.getElementById('sortSongsBtn').onclick = () => {
    showSortSongsModal(order => {
      sortTracks(order); 
    });
  };
}

function showSortSongsModal(onSelect) {
  const vpodScreen = document.getElementById('vpodScreen');
  const modal = document.createElement('div');
  modal.style = `
    position:absolute;top:40px;left:50%;transform:translateX(-50%);
    width:260px;z-index:9999;
    background:#fff;padding:18px 12px;border-radius:14px;box-shadow:0 2px 12px #0003;
    display:flex;flex-direction:column;align-items:center;
  `;
  modal.innerHTML = `
    <div style="font-size:1.1em;font-weight:bold;margin-bottom:10px;">Sort Songs By</div>
    <button style="margin:4px 0;padding:7px 18px;border-radius:8px;border:none;background:#e0eaff;color:#0074d9;font-size:1em;" data-sort="title">Title (A-Z)</button>
    <button style="margin:4px 0;padding:7px 18px;border-radius:8px;border:none;background:#e0eaff;color:#0074d9;font-size:1em;" data-sort="artist">Artist (A-Z)</button>
    <button style="margin:4px 0;padding:7px 18px;border-radius:8px;border:none;background:#e0eaff;color:#0074d9;font-size:1em;" data-sort="album">Album (A-Z)</button>
    <button style="margin-top:12px;padding:5px 14px;border-radius:8px;border:none;background:#eee;color:#444;font-size:1em;" id="closeSortModal">Cancel</button>
  `;
  vpodScreen.appendChild(modal);

  modal.querySelectorAll('button[data-sort]').forEach(btn => {
    btn.onclick = () => {
      onSelect(btn.getAttribute('data-sort'));
      vpodScreen.removeChild(modal);
    };
  });
  modal.querySelector('#closeSortModal').onclick = () => {
    vpodScreen.removeChild(modal);
  };
}

// -- SUGGESTED SONGS MENU ---

function renderSuggestedMenu(direction = 'forward') {
  const suggested = window.getSuggestedTracks ? window.getSuggestedTracks(tracks, 20) : [];
  if (!suggested.length) {
    renderScreen(
      renderHotBar() +
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">Suggested Songs</div>
        <div style="font-size:1em;color:#444;text-align:center;">
          Not enough listening data yet.<br>
          Play, like, or skip songs to get suggestions!
        </div>
      </div>`,
      direction
    );
    return;
  }
  renderSongList({
    songs: suggested,
    onSongClick: (track, idx) => { currentMenuIndex = idx; playTrackFromAlbum(track, suggested); },
    albumCover: albums[suggested[0]?.album]?.cover
  }, direction);
}

// --- NOW PLAYING ---

function renderNowPlayingScreen(direction = 'forward') {
  const trackId = currentTrack ? `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}` : '';
  const rating = songRatings[trackId];
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
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <button id="likeBtn" class="like-btn" title="Like" style="font-size:1.6em;color:${rating === 'like' ? '#0074d9' : '#888'};background:none;border:none;cursor:pointer;margin-left:20px;">
            <i class="fa-solid fa-thumbs-up"></i>
          </button>
          <button id="dislikeBtn" class="dislike-btn" title="Dislike" style="font-size:1.6em;color:${rating === 'dislike' ? '#d90429' : '#888'};background:none;border:none;cursor:pointer;margin-left:10px;">
            <i class="fa-solid fa-thumbs-down"></i>
          </button>
        </div>
        <button id="shuffleBtn" class="shuffle-btn${isShuffleOn ? ' shuffle-on' : ''}" title="Shuffle">
          <i class="fa-solid fa-shuffle"></i>
        </button>
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

  document.getElementById('likeBtn').onclick = () => {
    if (!currentTrack) return;
    const trackId = `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}`;
    songRatings[trackId] = songRatings[trackId] === 'like' ? null : 'like';
    localStorage.setItem('songRatings', JSON.stringify(songRatings));
    if (window.setTrackRating) window.setTrackRating(currentTrack, 'like');
    renderNowPlayingScreen('forward');
  };
  document.getElementById('dislikeBtn').onclick = () => {
    if (!currentTrack) return;
    const trackId = `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}`;
    songRatings[trackId] = songRatings[trackId] === 'dislike' ? null : 'dislike';
    localStorage.setItem('songRatings', JSON.stringify(songRatings));
    if (window.setTrackRating) window.setTrackRating(currentTrack, 'dislike');
    renderNowPlayingScreen('forward');
  };
  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) shuffleBtn.onclick = toggleShuffle;
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
      { label: "Date and Time", action: renderDateTimeMenu },
      { label: "iPod Colour", action: renderColourMenu }
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
    before: renderHotBar(),
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

function renderColourMenu(direction = 'forward') {
  const colours = [
    { name: "White", value: "linear-gradient(160deg, #fff 0%, #f6f6f8 60%, #e2e2e4 100%)" },
    { name: "Silver", value: "linear-gradient(160deg, #e0e0e0 0%, #bdbdbd 60%, #757575 100%)" },
    { name: "Black", value: "linear-gradient(160deg, #222 0%, #444 60%, #888 100%)" },
    { name: "Gold", value: "linear-gradient(160deg, #fff8e1 0%, #ffd700 60%, #bfa640 100%)" },
    { name: "Red", value: "linear-gradient(160deg, #ffe0e0 0%, #ff5252 60%, #b71c1c 100%)" },
    { name: "Orange", value: "linear-gradient(160deg, #fff3e0 0%, #ffb74d 60%, #ff9800 100%)" },
    { name: "Yellow", value: "linear-gradient(160deg, #fffde7 0%, #fff176 60%, #ffd600 100%)" },
    { name: "Green", value: "linear-gradient(160deg, #e0ffe0 0%, #a1f7a1 60%, #00d974 100%)" },
    { name: "Blue", value: "linear-gradient(160deg, #e0eaff 0%, #4fc3f7 60%, #0074d9 100%)" },
    { name: "Pink", value: "linear-gradient(160deg, #ffe0f7 0%, #f7a1e3 60%, #d90074 100%)" },
    { name: "Purple", value: "linear-gradient(160deg, #f3e0ff 0%, #b39ddb 60%, #6a1b9a 100%)" }
    
  ];
  let selectedIdx = parseInt(localStorage.getItem('vpodColourIdx') || "0", 10);

  renderScreen(
    renderHotBar() +
    `<div style="padding:4px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.2em;font-weight:bold;margin-bottom:18px;">Choose iPod Colour</div>
      <div id="colourGrid" style="display:grid;grid-template-columns:repeat(4, 64px);gap:14px;">
        ${colours.map((c, idx) =>
          `<button class="colour-btn${idx === selectedIdx ? ' active' : ''}" data-idx="${idx}" title="${c.name}" style="
            width:60px;height:60px;border-radius:14px;border:3px solid ${idx === selectedIdx ? '#0074d9' : '#ccc'};
            background:${c.value};box-shadow:0 2px 8px rgba(0,0,0,0.13);cursor:pointer;outline:none;">
            ${idx === selectedIdx ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : ''}
          </button>`
        ).join('')}
      </div>
    </div>`,
    direction
  );

  // Disk scroll support
  let gridBtns = Array.from(document.querySelectorAll('.colour-btn'));
  function highlightColour(idx) {
    gridBtns.forEach((btn, i) => btn.classList.toggle('active', i === idx));
    gridBtns.forEach((btn, i) => btn.style.borderColor = i === idx ? '#0074d9' : '#ccc');
    gridBtns.forEach((btn, i) => btn.innerHTML = i === idx ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : '');
    currentMenuIndex = idx;
  }
  highlightColour(selectedIdx);

  // Center button selects colour
  window.onColourMenuConfirm = () => {
    const idx = currentMenuIndex;
    document.querySelector('.vpod-container').style.background = colours[idx].value;
    localStorage.setItem('vpodColour', colours[idx].value);
    localStorage.setItem('vpodColourIdx', idx);
    highlightColour(idx);
  };

  // Disk scroll logic for colour grid
  window.onColourMenuScroll = (direction) => {
    selectedIdx += direction;
    if (selectedIdx < 0) selectedIdx = colours.length - 1;
    if (selectedIdx >= colours.length) selectedIdx = 0;
    highlightColour(selectedIdx);
  };

  gridBtns.forEach((btn, idx) => {
    btn.onclick = () => {
      highlightColour(idx);
      currentMenuIndex = idx;
      document.querySelector('.vpod-container').style.background = colours[idx].value;
      localStorage.setItem('vpodColour', colours[idx].value);
      localStorage.setItem('vpodColourIdx', idx);
    };
  });

  // Set colour on load
  const savedColour = localStorage.getItem('vpodColour');
  if (savedColour) document.querySelector('.vpod-container').style.background = savedColour;
}
