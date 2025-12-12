// --- PLAYLISTS MENU & CREATION ---

function renderPlaylistsMenu(direction = 'forward') {
  const allPlaylists = app.state.playlists;

  app.state.currentMenuIndex = 0;

  renderScreen(
    `<div style="display:flex;flex-direction:column;height:100%;">
      <div style="position:relative;display:flex;align-items:center;justify-content:center;height:38px;">
        <button id="addPlaylistBtn"
          style="position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:1.5em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">
          ＋
        </button>
        <span style="font-size:1.2em;font-weight:bold;display:block;margin:0 auto;">Playlists</span>
      </div>
      <ul class="menu-list" id="playlistsList" style="margin-top:18px;">
        <li data-liked="true" style="color:#0074d9;font-weight:bold;"><i class="fa-solid fa-heart"></i> Liked Songs</li>
        ${allPlaylists.length === 0 ? '' : allPlaylists.map((pl, idx) =>
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

  document.querySelector('#playlistsList li[data-liked="true"]').onclick = () => {
    app.state.currentMenuIndex = 0;
    goTo(renderPlaylistSongsMenu, 'liked');
  };

  // User playlists click
  allPlaylists.forEach((pl, idx) => {
    const li = document.querySelector(`#playlistsList li[data-idx="${idx}"]`);
    if (!li) return;
    li.onclick = () => {
      app.state.currentMenuIndex = idx + 1; // keep highlight aligned
      goTo(renderPlaylistSongsMenu, idx);
    };
  });

  masterHighlight({
    containerSelector: '#playlistsList',
    itemsSelector: 'li'
  });
}

function getLikedTracks() {
  const allTracks = app.state.tracks;
  return allTracks.filter(track => {
    const trackId = getTrackId(track);
    const habit = userHabits[trackId];
    return habit && habit.likeCount > 0;
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
    const allPlaylists = app.state.playlists;
    allPlaylists.push({ name, tracks: [] });
    app.state.playlists = allPlaylists;
    savePlaylists();
    window.creatingPlaylist = allPlaylists[allPlaylists.length - 1];
    goTo(renderAlbumSelectionForPlaylist);
  };

  input.onkeydown = (e) => {
    if (e.key === "Enter") document.getElementById('playlistNameConfirm').click();
    if (e.key === "Escape") closeModal();
  };
}

function renderAlbumSelectionForPlaylist(direction = 'forward', selectedIdx = 0) {
  const allAlbums = app.state.albums;
  const albumNames = Object.keys(allAlbums).sort((a, b) => a.localeCompare(b));

  renderScreen(`
    <div class="album-carousel-container">
      <div style="position:absolute;bottom:8px;right:16px;z-index:20;">
        <button id="donePlaylistBtn" title="Finish Playlist" style="
          background:none;
          border-radius:100%;
          border:none;
          box-shadow:none;
          font-size:1em;
          color:#0074d9;
          cursor:pointer;
          padding:3.5px;
        ">
          <i class="fa-solid fa-check"></i>
        </button>
      </div>
      <div class="album-carousel" id="albumCarousel"></div>
      <div class="album-title" id="albumTitle"></div>
      <div style="text-align:center;margin-top:6px;">
        <span style="font-size:1em;color:#0074d9;">Select an album to add songs</span>
      </div>
    </div>
  `, direction);

  const carousel = document.getElementById('albumCarousel');
  carousel.innerHTML = '';
  albumNames.forEach((album, idx) => {
    const albumObj = allAlbums[album];
    const div = document.createElement('div');
    div.className = 'carousel-album';
    div.innerHTML = `
      <div class="carousel-cover-reflect">
        <img src="${albumObj.cover}" class="carousel-cover" alt="Album Cover">
        <img src="${albumObj.cover}" class="reflection" alt="Reflection">
      </div>
    `;
    div.onclick = () => {
      window.creatingPlaylist.selectedAlbum = album;
      goTo(renderSongSelectionForPlaylist, album, idx);
    };
    carousel.appendChild(div);
  });
  
  setCarouselAlbum(selectedIdx, albumNames);

  document.getElementById('donePlaylistBtn').onclick = () => {
    if (!window.creatingPlaylist.tracks.length) {
      alert("Please add at least one song to your playlist.");
      return;
    }
    savePlaylists();
    delete window.creatingPlaylist;
    goBack();
  };

  app.state.currentMenuIndex = selectedIdx;

  window.onPlaylistAlbumMenuDone = () => {
    document.getElementById('donePlaylistBtn').click();
  };
}

function renderSongSelectionForPlaylist(direction = 'forward', album, albumIdx = 0) {
  window.onPlaylistAlbumMenuDone = null;
  const allAlbums = app.state.albums;
  const albumObj = allAlbums[album];

  renderScreen(
    `<div class="album-list">
      <div class="album-list-left" id="playlistSongsSelectContainer" data-playlist-select="true">
        <div id="playlistSongsSelectList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumObj.cover || 'src/img/default-cover.png'}" class="album-cover" alt="Album Cover">
      </div>
    </div>
    <div style="text-align:center;margin-top:8px;"><span style="font-size:1em;color:#0074d9;">Tap songs to add/remove from playlist</span></div>
  `, direction);

  const songsList = document.getElementById('playlistSongsSelectList');
  songsList.innerHTML = '';
  const currentTrack = app.state.currentTrack;
  const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;

  albumObj.songs.forEach((track, idx) => {
    const isSelected = window.creatingPlaylist.tracks.some(t =>
      (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
      (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
    );

    const isNowPlaying =
      currentTrackId && getTrackId(track) === currentTrackId;

    const nowPlayingLabel = isNowPlaying
      ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
      : '';

    const selectedIcon = isSelected
      ? `<i class="fa-solid fa-check" style="color:#0074d9;margin-right:4px;"></i>`
      : '';

    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.innerHTML = `
      ${nowPlayingLabel}
      <span style="padding-left:6px;">
        ${selectedIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}
      </span>
    `;

    div.onclick = () => {
      toggleTrackInCreatingPlaylist(track);
      const isNowSelected = window.creatingPlaylist.tracks.some(t =>
        (t.relativePath && t.relativePath === (track.file?.webkitRelativePath || '')) ||
        (t.fileName === track.file?.name && t.album === track.album && t.artist === track.artist)
      );

      const updatedSelectedIcon = isNowSelected
        ? `<i class="fa-solid fa-check" style="color:#0074d9;margin-right:4px;"></i>`
        : '';

      div.innerHTML = `
        ${nowPlayingLabel}
        <span style="padding-left:6px;">
          ${updatedSelectedIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}
        </span>
      `;
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
  const allPlaylists = app.state.playlists;

  let playlist, tracksToShow;
  if (playlistIdx === 'liked') {
    playlist = { name: "Liked Songs", tracks: getLikedTracks() };
    tracksToShow = playlist.tracks;
  } else {
    playlist = allPlaylists[playlistIdx];
    tracksToShow = playlist.tracks;
  }

  app.state.currentMenuIndex = 0;

  renderScreen(
    `<div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        ${playlistIdx !== 'liked'
          ? `<button id="editPlaylistBtn" title="Add Songs" style="font-size:1.5em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">＋</button>`
          : '<span></span>'}
        <span style="font-size:1.2em;font-weight:bold;margin:auto;">${playlist.name}</span>
        ${playlistIdx !== 'liked'
          ? `<button id="deletePlaylistBtn" title="Delete Playlist" style="font-size:1.3em;font-weight:bold;background:none;border:none;color:#d90429;cursor:pointer;">🗑️</button>`
          : '<span></span>'}
      </div>
      <div id="playlistSongsList" style="margin-top:18px;"></div>
    </div>
  `, direction);

  // Build rows
  const listContainer = document.getElementById('playlistSongsList');
  listContainer.innerHTML = '';
  const allTracks = app.state.tracks;
  const currentTrack = app.state.currentTrack;
  const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;

  tracksToShow.forEach((plTrack, idx) => {
    // Resolve to full track object if needed (for now-playing comparison)
    const track =
      allTracks.find(t =>
        (t.file?.webkitRelativePath && t.file.webkitRelativePath === plTrack.relativePath) ||
        (t.file?.name === plTrack.fileName &&
         t.album === plTrack.album &&
         t.artist === plTrack.artist) ||
        (t.title === plTrack.title &&
         t.artist === plTrack.artist &&
         t.album === plTrack.album)
      ) || plTrack;

    const isNowPlaying =
      currentTrackId && getTrackId(track) === currentTrackId;

    const nowPlayingLabel = isNowPlaying
      ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
      : '';

    const displayTitle = track.title || track.fileName || '';
    const displayArtist = track.artist || '';

    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.dataset.idx = idx;
    div.innerHTML = `
      ${nowPlayingLabel}
      <span style="padding-left:6px;">
        ${displayTitle}${displayArtist ? ` - ${displayArtist}` : ''}
      </span>
    `;
    div.onclick = () => {
      playPlaylistTrack({ tracks: tracksToShow }, idx);
    };
    listContainer.appendChild(div);
  });

  // Initial highlight + scroll to current index
  const applyHighlight = () => masterHighlight({
    containerSelector: '#playlistSongsList',
    itemsSelector: '.menu-list-song'
  });
  applyHighlight();
  const items = listContainer.querySelectorAll('.menu-list-song');
  if (items[app.state.currentMenuIndex]) {
    items[app.state.currentMenuIndex].scrollIntoView({ block: 'nearest' });
  }

  // Keep helper for disk scroll confirm paths
  window.updateHighlightedSong = applyHighlight;

  // "+" button: edit/add songs (only for user playlists)
  if (playlistIdx !== 'liked') {
    document.getElementById('editPlaylistBtn').onclick = () => {
      window.creatingPlaylist = playlist;
      goTo(renderAlbumSelectionForPlaylist);
    };

    document.getElementById('deletePlaylistBtn').onclick = () => {
      if (confirm(`Delete playlist "${playlist.name}"?`)) {
        allPlaylists.splice(playlistIdx, 1);
        app.state.playlists = allPlaylists;
        savePlaylists();
        renderPlaylistsMenu('back');
      }
    };
  }
}

function playPlaylistTrack(playlist, idx) {
  const allTracks = app.state.tracks;
  const trackData = playlist.tracks[idx];

  const match = allTracks.find(t =>
    (t.file?.webkitRelativePath && t.file.webkitRelativePath === trackData.relativePath) ||
    (t.file?.name === trackData.fileName &&
     t.album === trackData.album &&
     t.artist === trackData.artist) ||
    (t.title === trackData.title &&
     t.artist === trackData.artist &&
     t.album === trackData.album)
  );

  if (match) {
    const mapped = playlist.tracks.map(plTrack =>
      allTracks.find(t =>
        (t.file?.webkitRelativePath && t.file.webkitRelativePath === plTrack.relativePath) ||
        (t.file?.name === plTrack.fileName &&
         t.album === plTrack.album &&
         t.artist === plTrack.artist) ||
        (t.title === plTrack.title &&
         t.artist === plTrack.artist &&
         t.album === plTrack.album)
      )
    ).filter(Boolean);

    app.state.currentAlbumSongs = mapped;
    app.state.currentSongIndex = app.state.currentAlbumSongs.findIndex(t =>
      (t.file?.webkitRelativePath && t.file.webkitRelativePath === trackData.relativePath) ||
      (t.file?.name === trackData.fileName &&
       t.album === trackData.album &&
       t.artist === trackData.artist) ||
      (t.title === trackData.title &&
       t.artist === trackData.artist &&
       t.album === trackData.album)
    );

    playTrackFromAlbum(match, app.state.currentAlbumSongs);
  } else {
    alert("This song is not loaded.");
  }
}

// --- PLAYLIST STORAGE ---

function savePlaylists() {
  const playlists = app.state.playlists;
  localStorage.setItem('playlists', JSON.stringify(playlists));
}