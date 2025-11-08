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

function renderAlbumSelectionForPlaylist(direction = 'forward', selectedIdx = 0) {
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
  currentMenuIndex = selectedIdx;
}

function renderSongSelectionForPlaylist(direction = 'forward', album, albumIdx = 0) {
  const albumObj = albums[album];
  renderScreen(`
    <div class="album-list">
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

  // When going back, pass the albumIdx
  window.onPlaylistSongSelectionBack = () => goTo(renderAlbumSelectionForPlaylist, 'back', albumIdx);
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

// --- PLAYLIST STORAGE ---

function savePlaylists() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}