// DEBUG: Set to true to always show Weekly Recap menu
const DEBUG_RECAP_ALWAYS_ON = false;

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

function masterHighlight({ containerSelector, itemsSelector, tracks, albumArtSelector }) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const items = Array.from(container.querySelectorAll(itemsSelector));
  items.forEach((el, i) => {
    el.classList.toggle('active', i === currentMenuIndex);
  });
  if (albumArtSelector && tracks && tracks[currentMenuIndex]) {
    const albumObj = albums[tracks[currentMenuIndex].album] || {};
    const artImg = document.querySelector(albumArtSelector);
    if (artImg) artImg.src = albumObj.cover || "src/img/default-cover.png";
  }
}

// --- GENERIC RENDERERS ---

function renderScreen(content, direction = 'forward') {
  window.updateHighlightedSong = null;

  const oldContent = vpodScreen.querySelector('.screen-content');
  if (oldContent) {
    oldContent.classList.remove('screen-active');
    oldContent.classList.add(direction === 'forward' ? 'screen-fade-out' : 'screen-fade-in');
    setTimeout(() => oldContent.remove(), 350);
  }

  const div = document.createElement('div');
  div.className = 'screen-content screen-active screen-fade-in';
  div.innerHTML = content;
  vpodScreen.appendChild(div);

  if (!content.includes('album-carousel')) {
    resetMenuIndex();
  }

  updateHotBarTime();
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
    document.querySelector(`#${id} li[data-idx="${idx}"]`).onclick = () => {
      currentMenuIndex = idx;
      masterHighlight({
        containerSelector: `#${id}`,
        itemsSelector: 'li'
      });
      onItemClick(idx, item);
    };
    // After rendering all items:
    window.updateHighlightedSong = () => masterHighlight({
      containerSelector: `#${id}`,
      itemsSelector: 'li'
    });
  });
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
    div.innerHTML = `
      <div class="carousel-cover-reflect">
        <img src="${albumObj.cover}" class="carousel-cover" alt="Album Cover">
        <img src="${albumObj.cover}" class="reflection" alt="Reflection">
      </div>
    `;
    div.onclick = () => {
      currentMenuIndex = idx;
      onAlbumClick(album, currentMenuIndex);
    };
    carousel.appendChild(div);
  });
  setCarouselAlbum(selectedIdx, albumsList);

  if (showDone && onDone) {
    document.getElementById('donePlaylistBtn').onclick = onDone;
  }
  // Set currentMenuIndex for scroll wheel navigation
  setCarouselAlbum(selectedIdx, albumsList);
  currentMenuIndex = selectedIdx;
}

function renderSongList({ songs, onSongClick, selectedTracks = [], showBack, onBack, selectMode = false, albumCover }, direction = 'forward') {
  renderScreen(
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
    div.onclick = () => {
      currentMenuIndex = idx;
      window.updateHighlightedSong();
      onSongClick(track, idx);
    };
    songsList.appendChild(div);
  });

  window.updateHighlightedSong = () => masterHighlight({
    containerSelector: '#songsList',
    itemsSelector: '.menu-list-song',
    tracks: songs,
    albumArtSelector: '.album-list-right img.album-cover'
  });
}

// --- MAIN MENU ---

function isRecapWindow() {
  if (typeof DEBUG_RECAP_ALWAYS_ON !== 'undefined' && DEBUG_RECAP_ALWAYS_ON) return true;
  const now = new Date();
  return now.getDay() === 1 && now.getHours() >= 8 && now.getHours() < 20;
}

function renderMainMenu(direction = 'forward') {
  navStack = [{ fn: renderMainMenu, args: [direction] }];
  const hotBar = document.getElementById('hotBar');
  if (hotBar && hotBar.style.display === 'none') {
    hotBar.style.display = '';
  }
  currentMenuIndex = 0;

  const menuItems = [
    { label: "Load Music", action: renderLoadMusic },
    { label: "Now Playing", action: renderNowPlayingScreen },
    { label: "Playlists", action: renderPlaylistsMenu }, 
    { label: "Artists", action: renderArtistsMenu },
    { label: "Albums", action: renderAlbumsMenu },
    { label: "All Songs", action: renderAllSongsMenu },
    { label: "Suggested", action: renderSuggestedMenu },
    { label: "Settings", action: renderSettingsMenu }
  ];

  if (isRecapWindow()) {
    menuItems.splice(1, 0, { label: "Weekly Recap", action: renderWeeklyRecapMenu });
  }

  renderMenuList({
    items: menuItems,
    onItemClick: (idx, item) => {
      currentMenuIndex = idx;
      if (item.action === renderAlbumsMenu) {
        goTo(renderAlbumsMenu, 0);
      } else {
        goTo(item.action);
      }
    },
  }, direction);

  masterHighlight({
    containerSelector: '#menuList',
    itemsSelector: 'li'
  });

  updateHotBarTime();
}

// --- LOAD MUSIC ---

function renderLoadMusic(direction = 'forward') {
  renderScreen(
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

function goToLoadingScreen(direction = 'forward') {
  renderLoadingScreen("Loading your music...", 0, 0);
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

function renderSaveMetadataPrompt() {
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.1em;color:#0074d9;font-weight:bold;margin-bottom:12px;">Music loaded!</div>
      <div style="font-size:1em;color:#444;text-align:center;margin-bottom:16px;">
        Save your music metadata for faster loading next time.<br>
        <span style="color:#0074d9;">Please save <b>tracks-meta.json</b> in your music folder.</span>
      </div>
      <button id="saveMetaBtn" style="margin-bottom:10px;padding:10px 28px;border-radius:8px;border:none;background:#0074d9;color:#fff;font-size:1em;">Save Metadata</button>
      <button id="skipMetaBtn" style="padding:10px 28px;border-radius:8px;border:none;background:#eee;color:#444;font-size:1em;">Skip</button>
    </div>
  `, 'forward');

  document.getElementById('saveMetaBtn').onclick = () => {
    exportMetadata();
    renderMainMenu('forward');
    navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  };
  document.getElementById('skipMetaBtn').onclick = () => {
    renderMainMenu('forward');
    navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  };
}

function exportMetadata() {
  const metaTracks = tracks.map(t => ({
    ...t,
    fileName: t.file?.name || ''
  }));
  const meta = { tracks: metaTracks, albums };
  const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tracks-meta.json';
  a.click();
  URL.revokeObjectURL(url);
}

// --- ALBUMS MENU ---

function renderAlbumsMenu(direction = 'forward', selectedIdx = 0) {
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  if (albumNames.length === 0) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">No music loaded</div>
        <div style="font-size:1em;color:#444;text-align:center;">
          Please load your music to browse albums.
        </div>
      </div>`,
      direction
    );
    return;
  }
  currentMenuIndex = selectedIdx;
  renderAlbumCarousel({
    albumsList: albumNames,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album, idx); },
    selectedIdx: currentMenuIndex
  }, direction);
}

function renderAlbumSongsMenu(direction = 'forward', album, albumIdx = 0, artist = null) {
  const albumObj = albums[album];
  currentMenuIndex = 0; // Ensure first song is highlighted
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

  // Highlight first song
  masterHighlight({
    containerSelector: '#songsList',
    itemsSelector: '.menu-list-song',
    tracks: albumObj.songs,
    albumArtSelector: '.album-list-right img.album-cover'
  });
}

// -- Album Carousel --

function setCarouselAlbum(idx, albumNames) {
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  const visibleRange = 5; // Show center ± 5 albums

  Array.from(carousel.children).forEach((el, i) => {
    const offset = i - idx;
    el.className = 'carousel-album';
    el.style.zIndex = '';
    el.style.opacity = '';
    el.style.filter = '';
    el.style.transform = '';

    if (offset === 0) {
      el.classList.add('carousel-album-center');
      el.style.transform = `translate(-50%, -50%) scale(1.25) rotateY(0deg)`;
      el.style.zIndex = 10;
      el.style.opacity = 1;
      el.style.filter = 'brightness(1) blur(0px)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else if (offset < 0 && Math.abs(offset) <= visibleRange) {
      el.classList.add('carousel-album-left');
      const spacing = 80 * Math.abs(offset);
      el.style.transform = `translate(calc(-50% - ${spacing}px), -50%) scale(${1 - 0.1 * Math.abs(offset)}) rotateY(55deg)`;
      el.style.zIndex = 5 - Math.abs(offset);
      el.style.opacity = 0.7 - 0.1 * Math.abs(offset);
      el.style.filter = 'brightness(0.85) blur(0.5px)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else if (offset > 0 && Math.abs(offset) <= visibleRange) {
      el.classList.add('carousel-album-right');
      const spacing = 80 * Math.abs(offset);
      el.style.transform = `translate(calc(-50% + ${spacing}px), -50%) scale(${1 - 0.1 * Math.abs(offset)}) rotateY(-55deg)`;
      el.style.zIndex = 5 - Math.abs(offset);
      el.style.opacity = 0.7 - 0.1 * Math.abs(offset);
      el.style.filter = 'brightness(0.85) blur(0.5px)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else {
      // Hide albums outside the visible range
      el.style.opacity = 0;
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.style.transform = 'translate(-50%, -50%) scale(0.7) rotateY(0deg)';
    }
  });
  title.textContent = albumNames[idx] || '';
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
  // Group artists by lowercase name
  const artistMap = {};
  tracks.forEach(t => {
    const raw = t.artist || 'Unknown Artist';
    const key = raw.trim().toLowerCase();
    if (!artistMap[key]) artistMap[key] = raw;
  });
  // Prepare display names (capitalize each word)
  const artistNames = Object.entries(artistMap)
    .map(([key, name]) => ({
      label: name.replace(/\b\w/g, c => c.toUpperCase()),
      key
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (artistNames.length === 0 || tracks.length === 0) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">No music loaded</div>
        <div style="font-size:1em;color:#444;text-align:center;">
          Please load your music to browse artists.
        </div>
      </div>`,
      direction
    );
    return;
  }
  currentMenuIndex = 0;
  renderMenuList({
    title: "Artists",
    items: artistNames,
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(renderArtistAlbumsMenu, item.key); },
    onBack: goBack,
    id: "artistsList"
  }, direction);

  // Highlight first artist
  masterHighlight({
    containerSelector: '#artistsList',
    itemsSelector: 'li'
  });
}

function renderArtistAlbumsMenu(direction = 'forward', artistKey, selectedIdx = 0) {
  // Find all albums where the normalized artist matches
  const artistAlbums = Object.keys(albums)
    .filter(albumName => (albums[albumName].artist || 'Unknown Artist').trim().toLowerCase() === artistKey);

  // Find display name for UI
  const displayName = tracks.find(t => (t.artist || 'Unknown Artist').trim().toLowerCase() === artistKey)?.artist || artistKey;

  renderAlbumCarousel({
    albumsList: artistAlbums,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album, idx, displayName, artistKey); },
    title: displayName,
    selectedIdx
  }, direction);
}

// --- All SONGS MENU ---

function renderAllSongsMenu(direction = 'forward') {
  if (!tracks.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">No music loaded</div>
        <div style="font-size:1em;color:#444;text-align:center;">
          Please load your music to view all songs.
        </div>
      </div>`,
      direction
    );
    return;
  }
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
    `<div style="display:flex;flex-direction:column;height:90%;">
      <div style="position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:4px;height:38px;">
        <span style="font-size:1.1em;font-weight:bold;display:block;margin:0 auto;">All Songs</span>
        <button id="sortSongsBtn" title="Sort Songs"
          style="position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:1.3em;background:none;border:none;color:#0074d9;cursor:pointer;">
          <i class="fa-solid fa-arrow-down-a-z"></i>
        </button>
      </div>
      <div style="margin-bottom:2px;">
        <input id="songSearchInput" type="text" placeholder="Search songs..." style="width:92%;max-width:320px;margin-left:8px;padding:4px 10px;border-radius:8px;border:1px solid #ccc;font-size:0.95em;">
      </div>
      <div class="album-list" style="height:90%;">
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
        window.updateHighlightedSong();
      };
      songsList.appendChild(div);
    });

    window.updateHighlightedSong = () => masterHighlight({
      containerSelector: '#allSongsList',
      itemsSelector: '.menu-list-song',
      tracks: filteredTracks,
      albumArtSelector: '#allSongsArt'
    });
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

function attachNowPlayingButtonListeners() {
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');

  if (likeBtn) {
    likeBtn.onclick = () => {
      if (!currentTrack) return;
      const trackId = `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}`;
      songRatings[trackId] = songRatings[trackId] === 'like' ? null : 'like';
      localStorage.setItem('songRatings', JSON.stringify(songRatings));
      if (window.setTrackRating) window.setTrackRating(currentTrack, 'like');
      // Update button color directly instead of re-rendering
      likeBtn.style.color = songRatings[trackId] === 'like' ? '#0074d9' : '#888';
      dislikeBtn.style.color = songRatings[trackId] === 'dislike' ? '#d90429' : '#888';
    };
  }
  if (dislikeBtn) {
    dislikeBtn.onclick = () => {
      if (!currentTrack) return;
      const trackId = `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}`;
      songRatings[trackId] = songRatings[trackId] === 'dislike' ? null : 'dislike';
      localStorage.setItem('songRatings', JSON.stringify(songRatings));
      if (window.setTrackRating) window.setTrackRating(currentTrack, 'dislike');
      // Update button color directly instead of re-rendering
      likeBtn.style.color = songRatings[trackId] === 'like' ? '#0074d9' : '#888';
      dislikeBtn.style.color = songRatings[trackId] === 'dislike' ? '#d90429' : '#888';
    };
  }
  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      toggleShuffle();
      shuffleBtn.classList.toggle('shuffle-on', isShuffleOn);
    };
  }
}

window.attachNowPlayingButtonListeners = attachNowPlayingButtonListeners;

function renderNowPlayingScreen(direction = 'forward') {
  const trackId = currentTrack ? `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}` : '';
  const rating = songRatings[trackId];
  renderScreen(
    `<div class="nowplaying-container">
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

  if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
    navigator.mediaSession.setPositionState({
      duration: duration,
      playbackRate: audioPlayer.playbackRate,
      position: current
    });
  }
}

// --- SETTINGS MENU ---

function renderSettingsMenu(direction = 'forward') {
  renderMenuList({
    title: "Settings",
    items: [
      { label: "Equalizer", action: renderEqualizerMenu },
      { label: "Date and Time", action: renderDateTimeMenu },
      { label: "iPod Colour", action: renderColourMenu },
      { label: "User Stats", action: renderUserStatsMenu },
      { label: "About", action: renderAboutMenu }
      // Add more settings here 
    ],
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(item.action); },
    onBack: goBack,
    id: "settingsList",
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
  let selectedIdx = parseInt(localStorage.getItem('vpodColourIdx'), 10);
  if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= colours.length) selectedIdx = 0;
  currentMenuIndex = selectedIdx;

  renderScreen(
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

  // Disk control support
  let gridBtns = Array.from(document.querySelectorAll('.colour-btn'));

  function highlightColour(idx) {
    gridBtns.forEach((btn, i) => btn.classList.toggle('active', i === idx));
    gridBtns.forEach((btn, i) => btn.style.borderColor = i === idx ? '#0074d9' : '#ccc');
    gridBtns.forEach((btn, i) => btn.innerHTML = i === idx ? '<i class="fa-solid fa-check" style="color:#0074d9;font-size:1.5em;"></i>' : '');
  }
  highlightColour(currentMenuIndex);

  gridBtns.forEach((btn, idx) => {
    btn.onclick = () => {
      currentMenuIndex = idx;
      localStorage.setItem('vpodColourIdx', idx);
      highlightColour(idx);
      // Only update colour, do NOT leave the menu
      localStorage.setItem('vpodColour', colours[idx].value);
      document.querySelector('.vpod-container').style.background = colours[idx].value;
    };
  });

  window.onColourMenuConfirm = () => {
    localStorage.setItem('vpodColour', colours[currentMenuIndex].value);
    localStorage.setItem('vpodColourIdx', currentMenuIndex);
    document.querySelector('.vpod-container').style.background = colours[currentMenuIndex].value;
    // Stay on the colour menu, do NOT call renderMainMenu
    highlightColour(currentMenuIndex);
  };

  window.onColourMenuScroll = (direction) => {
    currentMenuIndex += direction;
    if (currentMenuIndex < 0) currentMenuIndex = gridBtns.length - 1;
    if (currentMenuIndex >= gridBtns.length) currentMenuIndex = 0;
    localStorage.setItem('vpodColourIdx', currentMenuIndex);
    highlightColour(currentMenuIndex);
  };

  // Set colour on load
  const savedColour = localStorage.getItem('vpodColour');
  if (savedColour) document.querySelector('.vpod-container').style.background = savedColour;
}

// UPDATE VERSION HERE
function renderAboutMenu(direction = 'forward') {
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.3em;font-weight:bold;margin-bottom:18px;">About vRetro Player</div>
      <div style="font-size:1em;color:#444;text-align:center;max-width:320px;margin-bottom:18px;">
        vRetro Player is a web-based local music player inspired by the ipod classic with some modern features.<br>
        <br>        
        Version: <b>1.9</b><br>
        Developed by: <b>vCore</b><br>
        <br>
        Enjoy your music with a retro touch!
      </div>
    </div>`,
    direction
  );
}

function renderUserStatsMenu(direction = 'forward') {
  // Gather stats from suggestions.js
  const habits = JSON.parse(localStorage.getItem('userHabits')) || {};
  const totalLifetimePlays = Object.values(habits).reduce((sum, h) => sum + (h.plays || 0), 0);
  const totalLifetimeSkips = Object.values(habits).reduce((sum, h) => sum + (h.skips || 0), 0);
  const totalLifetimeLikes = Object.values(habits).reduce((sum, h) => sum + (h.likeCount || 0), 0);
  const totalLifetimeDislikes = Object.values(habits).reduce((sum, h) => sum + (h.dislikeCount || 0), 0);

  const uniquePlayed = Object.values(habits).filter(h => h.plays > 0).length;
  const uniqueLiked = Object.values(habits).filter(h => h.likeCount > 0).length;
  const uniqueDisliked = Object.values(habits).filter(h => h.dislikeCount > 0).length;
  const uniqueSkipped = Object.values(habits).filter(h => h.skips > 0).length;

  const mostPlayed = Object.entries(habits)
    .sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = Object.entries(habits)
    .sort((a, b) => (b[1].likeCount || 0) - (a[1].likeCount || 0))[0];
  const mostSkipped = Object.entries(habits)
    .sort((a, b) => (b[1].skips || 0) - (a[1].skips || 0))[0];
  const mostDisliked = Object.entries(habits)
    .sort((a, b) => (b[1].dislikeCount || 0) - (a[1].dislikeCount || 0))[0];

  renderScreen(
    `<div style="padding:56px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;position:relative;">
      <button id="wipeStatsBtn" title="Wipe All User Stats" style="
        position:absolute;top:12px;right:18px;z-index:10;
        background:none;border:none;cursor:pointer;font-size:1.5em;color:#d90429;">
        <i class="fa-solid fa-trash"></i>
      </button>
      <div style="font-size:1.1em;font-weight:bold;margin-bottom:6px;margin-top:18px;">User Info</div>
      <div style="padding:10px 18px;">
        <div style="font-size:1em;color:#222;">
          Name: <b>iPod User</b><br>
          Model: <b>vPod Classic</b><br>
          Serial: <b>#${(localStorage.getItem('vpodSerial') || (Math.floor(Math.random()*1e8).toString(16)) )}</b><br>
          <hr style="margin:6px 0;">
          <b>Lifetime Stats</b><br>
          Total Songs Played: <b>${totalLifetimePlays}</b><br>
          Total Songs Skipped: <b>${totalLifetimeSkips}</b><br>
          Total Songs Liked: <b>${totalLifetimeLikes}</b><br>
          Total Songs Disliked: <b>${totalLifetimeDislikes}</b><br>
          Unique Songs Played: <b>${uniquePlayed}</b><br>
          Unique Songs Liked: <b>${uniqueLiked}</b><br>
          Unique Songs Disliked: <b>${uniqueDisliked}</b><br>
          Unique Songs Skipped: <b>${uniqueSkipped}</b><br>
          ${mostPlayed && mostPlayed[1].plays > 0 ? `Most Played Song: <b>${mostPlayed[0].split('|')[0]}</b> (${mostPlayed[1].plays} plays)<br>` : ''}
          ${mostLiked && mostLiked[1].likeCount > 0 ? `Most Liked Song: <b>${mostLiked[0].split('|')[0]}</b> (${mostLiked[1].likeCount} likes)<br>` : ''}
          ${mostSkipped && mostSkipped[1].skips > 0 ? `Most Skipped Song: <b>${mostSkipped[0].split('|')[0]}</b> (${mostSkipped[1].skips} skips)<br>` : ''}
          ${mostDisliked && mostDisliked[1].dislikeCount > 0 ? `Most Disliked Song: <b>${mostDisliked[0].split('|')[0]}</b> (${mostDisliked[1].dislikeCount} dislikes)<br>` : ''}
        </div>
      </div>
    </div>`,
    direction
  );

  // Trash button handler
  document.getElementById('wipeStatsBtn').onclick = () => {
    if (confirm("Are you sure you want to wipe all user stats? This cannot be undone.")) {
      localStorage.removeItem('userHabits');
      localStorage.removeItem('lastWeekStats');
      localStorage.removeItem('userStatsLastReset');
      // Do NOT remove playlists!
      renderUserStatsMenu('forward');
    }
  };

  // Save serial if not set
  if (!localStorage.getItem('vpodSerial')) {
    const serial = Math.floor(Math.random() * 1e8).toString(16);
    localStorage.setItem('vpodSerial', serial);
  }
}

// --- WEEKLY RECAP MENU ---

function renderWeeklyRecapMenu(direction = 'forward') {
  const lastWeek = JSON.parse(localStorage.getItem('lastWeekStats') || '{}');
  const totalPlays = Object.values(lastWeek).reduce((sum, h) => sum + (h.plays || 0), 0);
  const totalSkips = Object.values(lastWeek).reduce((sum, h) => sum + (h.skips || 0), 0);
  const totalLikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyLikes || 0), 0);
  const totalDislikes = Object.values(lastWeek).reduce((sum, h) => sum + (h.weeklyDislikes || 0), 0);
  const mostPlayed = Object.entries(lastWeek)
    .sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0))[0];
  const mostLiked = Object.entries(lastWeek)
    .sort((a, b) => (b[1].weeklyLikes || 0) - (a[1].weeklyLikes || 0))[0];

  // Slides to show
  const slides = [
    { title: "Total Songs Played", value: totalPlays, icon: "fa-music" },
    { title: "Total Likes", value: totalLikes, icon: "fa-thumbs-up" },
    { title: "Total Skips", value: totalSkips, icon: "fa-forward-step" },
    { title: "Total Dislikes", value: totalDislikes, icon: "fa-thumbs-down" },
    {
    title: "Most Played",
    value: mostPlayed && mostPlayed[1].plays > 0
      ? `${mostPlayed[0].split('|')[0]} (${mostPlayed[1].plays} plays)`
      : "No data for last week",
    icon: "fa-star"
  },
  {
    title: "Most Liked",
    value: mostLiked && mostLiked[1].weeklyLikes > 0
      ? `${mostLiked[0].split('|')[0]} (${mostLiked[1].weeklyLikes} likes)`
      : "No data for last week",
    icon: "fa-heart"
  }
  ].filter(Boolean);

  let slideIdx = 0;

  function renderSlide(idx) {
  const slide = slides[idx];
  renderScreen(
    `<div id="recapSlideShow" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-size:1.3em;font-weight:bold;margin-bottom:18px;color:#0074d9;text-shadow:0 2px 8px #4fc3f7;">Your Weekly Recap</div>
      <div class="recap-slide" style="width:100%;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform 0.4s cubic-bezier(.4,1.3,.6,1);">
        <div style="font-size:2.5em;color:#0074d9;margin-bottom:18px;">
          <i class="fa-solid ${slide.icon}"></i>
        </div>
        <div style="font-size:1.2em;font-weight:bold;color:#222;text-align:center;margin-bottom:12px;">
          ${slide.title}
        </div>
        <div style="font-size:2em;color:#0074d9;font-weight:bold;text-align:center;">
          ${slide.value}
        </div>
      </div>
      <div style="margin-top:22px;text-align:center;font-size:1em;color:#0074d9;">
        <i class="fa-solid fa-arrow-left"></i> Use disk wheel to scroll <i class="fa-solid fa-arrow-right"></i>
      </div>
    </div>`,
    direction
  );
}

  renderSlide(slideIdx);

  // Disk scroll and mouse wheel logic
  window.onRecapScroll = function(direction) {
    const oldIdx = slideIdx;
    slideIdx += direction;
    if (slideIdx < 0) slideIdx = 0;
    if (slideIdx >= slides.length) slideIdx = slides.length - 1;
    if (slideIdx !== oldIdx) {
      // Animate slide out/in
      const recapDiv = document.getElementById('recapSlideShow');
      if (recapDiv) {
        recapDiv.querySelector('.recap-slide').style.transform = `translateX(${direction > 0 ? '-100%' : '100%'})`;
        setTimeout(() => {
          renderSlide(slideIdx);
        }, 350);
      } else {
        renderSlide(slideIdx);
      }
    }
  };

  // Mouse wheel support
  const recapDiv = document.getElementById('recapSlideShow');
  if (recapDiv) {
    recapDiv.onwheel = (e) => {
      if (e.deltaY > 0) window.onRecapScroll(1);
      else if (e.deltaY < 0) window.onRecapScroll(-1);
      e.preventDefault();
    };
  }
}

// Observe Now Playing screen for changes and attach listeners
const observer = new MutationObserver(() => {
  const nowPlaying = document.querySelector('.nowplaying-container');
  if (nowPlaying) {
    attachNowPlayingButtonListeners();
  }
});
observer.observe(document.getElementById('vpodScreen'), { childList: true, subtree: true });