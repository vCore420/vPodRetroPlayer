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

function renderSongList({ songs, onSongClick, selectedTracks = [], showBack, onBack, selectMode = false }, direction = 'forward') {
  renderScreen(`
    <div class="album-list">
      <div class="album-list-left" id="songsListContainer" ${selectMode ? 'data-playlist-select="true"' : ''}>
        <div id="songsList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumCover || albums[songs[0]?.album]?.cover || 'default-cover.png'}" class="album-cover" alt="Album Cover">
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

// --- SPLASH & APP START ---

function fadeOutSplashAndStart() {
  const splash = document.getElementById('splashScreen');
  splash.classList.add('hide');
  setTimeout(() => {
    splash.style.display = 'none';
    startApp();
  }, 2000);
}

function startApp() {
  renderMainMenu();
  navStack = [{ fn: renderMainMenu, args: [] }];
}

// --- MAIN MENU ---

function renderMainMenu(direction = 'forward') {
  renderMenuList({
    items: [
      { label: "Load Music", action: renderLoadMusic },
      { label: "Albums", action: renderAlbumsMenu },
      { label: "Artists", action: renderArtistsMenu },
      { label: "Playlists", action: renderPlaylistsMenu },
      { label: "Now Playing", action: renderNowPlayingScreen }
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

// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

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

// --- PLAYLISTS MENU & CREATION ---

function renderPlaylistsMenu(direction = 'forward') {
  renderScreen(`
    <div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button id="addPlaylistBtn" style="font-size:1.5em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">＋</button>
        <span style="font-size:1.2em;font-weight:bold;margin:auto;">Playlists</span>
      </div>
      <ul class="menu-list" id="playlistsList" style="margin-top:18px;">
        ${playlists.length === 0 ? '<li>No playlists yet.</li>' : playlists.map((pl, idx) =>
          `<li data-idx="${idx}">${pl.name}</li>`
        ).join('')}
      </ul>
      <div id="playlistNameModal" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;z-index:10000;">
        <div style="background:#fff;padding:24px 18px;border-radius:16px;box-shadow:0 2px 12px #0003;display:flex;flex-direction:column;align-items:center;">
          <label for="playlistNameInput" style="font-size:1.1em;color:#222;margin-bottom:8px;">Playlist Name</label>
          <input id="playlistNameInput" type="text" maxlength="32" style="font-size:1.1em;padding:6px 12px;border-radius:8px;border:1px solid #ccc;width:180px;margin-bottom:12px;">
          <div style="display:flex;gap:12px;">
            <button id="playlistNameCancel" style="padding:6px 18px;border-radius:8px;border:none;background:#eee;color:#444;font-size:1em;">Cancel</button>
            <button id="playlistNameConfirm" style="padding:6px 18px;border-radius:8px;border:none;background:#0074d9;color:#fff;font-size:1em;">OK</button>
          </div>
        </div>
      </div>
    </div>
  `, direction);

  document.getElementById('addPlaylistBtn').onclick = () => showPlaylistNameModal();

  playlists.forEach((pl, idx) => {
    document.querySelector(`#playlistsList li[data-idx="${idx}"]`).onclick = () => renderPlaylistSongsMenu('forward', idx);
  });
}

function showPlaylistNameModal() {
  const modal = document.getElementById('playlistNameModal');
  const input = document.getElementById('playlistNameInput');
  modal.style.display = 'flex';
  input.value = '';
  input.focus();

  function closeModal() {
    modal.style.display = 'none';
    document.getElementById('playlistNameCancel').onclick = null;
    document.getElementById('playlistNameConfirm').onclick = null;
    input.onkeydown = null;
  }

  document.getElementById('playlistNameCancel').onclick = closeModal;

  document.getElementById('playlistNameConfirm').onclick = () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    closeModal();
    playlists.push({ name, tracks: [] });
    savePlaylists();
    window.creatingPlaylist = playlists[playlists.length - 1];
    goTo(renderAlbumSelectionForPlaylist);
  };

  input.onkeydown = (e) => {
    if (e.key === "Enter") document.getElementById('playlistNameConfirm').click();
    if (e.key === "Escape") closeModal();
  };
}

function startPlaylistCreation(playlistName) {
  window.creatingPlaylist = { name: playlistName, tracks: [] };
  renderAlbumSelectionForPlaylist();
}

function renderAlbumSelectionForPlaylist(direction = 'forward') {
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  renderScreen(`
    <div class="album-carousel-container">
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle"></div>
      <div style="text-align:center;margin-top:12px;">
        <span style="font-size:1em;color:#0074d9;">Select an album to add songs</span>
      </div>
      <button id="donePlaylistBtn" style="margin-top:12px;font-size:1em;">Done</button>
    </div>
  `, direction);

  const carousel = document.getElementById('albumCarousel');
  carousel.innerHTML = '';
  albumNames.forEach((album, idx) => {
    const albumObj = albums[album];
    const div = document.createElement('div');
    div.className = 'carousel-album';
    div.innerHTML = `<img src="${albumObj.cover}" class="carousel-cover" alt="Album Cover">`;
    div.onclick = () => {
      window.creatingPlaylist.selectedAlbum = album;
      goTo(renderSongSelectionForPlaylist, album);
    };
    carousel.appendChild(div);
  });
  setCarouselAlbum(currentMenuIndex, albumNames);

  document.getElementById('donePlaylistBtn').onclick = () => {
    if (!window.creatingPlaylist.tracks.length) {
      alert("Please add at least one song to your playlist.");
      return;
    }
    savePlaylists();
    delete window.creatingPlaylist;
    goBack();
  };
}

function renderSongSelectionForPlaylist(direction = 'forward', album) {
  const albumObj = albums[album];
  renderScreen(`
    <div class="album-list">
      <div class="album-list-left" id="playlistSongsSelectContainer" data-playlist-select="true">
        <div id="playlistSongsSelectList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumObj.cover || 'default-cover.png'}" class="album-cover" alt="Album Cover">
      </div>
    </div>
    <div style="text-align:center;margin-top:8px;"><span style="font-size:1em;color:#0074d9;">Tap songs to add/remove from playlist</span></div>
  `, direction);

  const songsList = document.getElementById('playlistSongsSelectList');
  songsList.innerHTML = '';
  albumObj.songs.forEach((track, idx) => {
    const isSelected = window.creatingPlaylist.tracks.some(t =>
      (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
      (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
    );
    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.innerHTML = `<span>${isSelected ? '✅ ' : ''}${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
    div.onclick = () => {
      toggleTrackInCreatingPlaylist(track);
      // Update tick in-place
      const isNowSelected = window.creatingPlaylist.tracks.some(t =>
        (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
        (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
      );
      div.innerHTML = `<span>${isNowSelected ? '✅ ' : ''}${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
    };
    songsList.appendChild(div);
  });
}

function toggleTrackInCreatingPlaylist(track) {
  const pl = window.creatingPlaylist;
  const idx = pl.tracks.findIndex(t =>
    (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
    (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
  );
  if (idx >= 0) {
    pl.tracks.splice(idx, 1);
  } else {
    pl.tracks.push({
      fileName: track.file?.name,
      album: track.album,
      artist: track.artist,
      relativePath: track.file?.webkitRelativePath || '',
      title: track.title
    });
  }
}

function renderPlaylistSongsMenu(direction = 'forward', playlistIdx) {
  const playlist = playlists[playlistIdx];
  renderScreen(`
    <div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button id="editPlaylistBtn" title="Add Songs" style="font-size:1.5em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">＋</button>
        <span style="font-size:1.2em;font-weight:bold;margin:auto;">${playlist.name}</span>
        <button id="deletePlaylistBtn" title="Delete Playlist" style="font-size:1.3em;font-weight:bold;background:none;border:none;color:#d90429;cursor:pointer;">🗑️</button>
      </div>
      <ul class="menu-list" id="playlistSongsList" style="margin-top:18px;">
        ${playlist.tracks.map((track, idx) =>
          `<li data-idx="${idx}">${track.title || track.fileName} - ${track.artist || ''}</li>`
        ).join('')}
      </ul>
    </div>
  `, direction);

  // "+" button: edit/add songs
  document.getElementById('editPlaylistBtn').onclick = () => {
    window.creatingPlaylist = playlist;
    goTo(renderAlbumSelectionForPlaylist);
  };

  // Trash can: delete playlist
  document.getElementById('deletePlaylistBtn').onclick = () => {
    if (confirm(`Delete playlist "${playlist.name}"?`)) {
      playlists.splice(playlistIdx, 1);
      savePlaylists();
      renderPlaylistsMenu('back');
    }
  };

  // Song click: play song
  playlist.tracks.forEach((track, idx) => {
    document.querySelector(`#playlistSongsList li[data-idx="${idx}"]`).onclick = () => {
      playPlaylistTrack(playlist, idx);
    };
  });
}

function playPlaylistTrack(playlist, idx) {
  const trackData = playlist.tracks[idx];
  const match = tracks.find(t =>
    (t.file?.webkitRelativePath && t.file.webkitRelativePath === trackData.relativePath) ||
    (t.file?.name === trackData.fileName &&
     t.album === trackData.album &&
     t.artist === trackData.artist)
  );
  if (match) {
    currentAlbumSongs = playlist.tracks.map(plTrack =>
      tracks.find(t =>
        (t.file?.webkitRelativePath && t.file.webkitRelativePath === plTrack.relativePath) ||
        (t.file?.name === plTrack.fileName &&
         t.album === plTrack.album &&
         t.artist === plTrack.artist)
      )
    ).filter(Boolean);
    currentSongIndex = currentAlbumSongs.findIndex(t =>
      (t.file?.webkitRelativePath && t.file.webkitRelativePath === trackData.relativePath) ||
      (t.file?.name === trackData.fileName &&
       t.album === trackData.album &&
       t.artist === trackData.artist)
    );
    playTrackFromAlbum(match, currentAlbumSongs);
  } else {
    alert("This song is not loaded.");
  }
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

// --- AUDIO PLAYBACK ---

audioPlayer.addEventListener('timeupdate', updateNowPlayingProgress);
audioPlayer.addEventListener('loadedmetadata', updateNowPlayingProgress);
audioPlayer.addEventListener('play', updateNowPlayingProgress);
audioPlayer.addEventListener('pause', updateNowPlayingProgress);

function playTrackFromAlbum(track, albumSongs) {
  currentAlbumSongs = albumSongs || [track];
  currentSongIndex = currentAlbumSongs.findIndex(t => t.file === track.file);
  currentTrack = track;
  currentMenuIndex = currentSongIndex;

  const url = URL.createObjectURL(track.file);
  audioPlayer.src = url;
  audioPlayer.play();
  playPauseBtn.textContent = "⏸";
  setScrollingSong(currentMenuIndex);

  const activeScreen = document.querySelector('.screen-content.screen-active');
  if (activeScreen && activeScreen.querySelector('.nowplaying-container')) {
    renderNowPlayingScreen('forward');
  }
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
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

// --- PLAYLIST STORAGE ---

function savePlaylists() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

// --- APP STARTUP ---

window.onload = () => {
  fadeOutSplashAndStart();
};

// -- Service Worker --

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
  console.log("Service worker registered");
}