// --- PLAYLISTS MENU & CREATION ---

function renderPlaylistsMenu(direction = 'forward') {
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
        ${playlists.length === 0 ? '' : playlists.map((pl, idx) =>
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

  // Liked playlist click
  document.querySelector('#playlistsList li[data-liked="true"]').onclick = () => renderPlaylistSongsMenu('forward', 'liked');

  // User playlists click
  playlists.forEach((pl, idx) => {
    document.querySelector(`#playlistsList li[data-idx="${idx}"]`).onclick = () => renderPlaylistSongsMenu('forward', idx);
  });

  masterHighlight({
    containerSelector: '#playlistsList',
    itemsSelector: 'li'
  });
}

function getLikedTracks() {
  return tracks.filter(track => {
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
      window.creatingPlaylist.selectedAlbum = album;
      goTo(renderSongSelectionForPlaylist, album, idx);
    };
    carousel.appendChild(div);
  });
  setCarouselAlbum(selectedIdx, albumNames);

  // Done button handler
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

  // Register menu button as done
  window.onPlaylistAlbumMenuDone = () => {
    document.getElementById('donePlaylistBtn').click();
  };

  window.onPlaylistAlbumSelectionBack = () => {
    // Find the index of the playlist being edited/created
    const playlistIdx = playlists.findIndex(pl => pl === window.creatingPlaylist);
    goTo(renderPlaylistSongsMenu, 'back', playlistIdx);
  };
}

function renderSongSelectionForPlaylist(direction = 'forward', album, albumIdx = 0) {
  window.onPlaylistAlbumMenuDone = null;
  const albumObj = albums[album];
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
  let playlist, tracksToShow;
  if (playlistIdx === 'liked') {
    playlist = { name: "Liked Songs", tracks: getLikedTracks() };
    tracksToShow = playlist.tracks;
  } else {
    playlist = playlists[playlistIdx];
    tracksToShow = playlist.tracks;
  }
  renderScreen(
    `<div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        ${playlistIdx !== 'liked' ? `<button id="editPlaylistBtn" title="Add Songs" style="font-size:1.5em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">＋</button>` : '<span></span>'}
        <span style="font-size:1.2em;font-weight:bold;margin:auto;">${playlist.name}</span>
        ${playlistIdx !== 'liked' ? `<button id="deletePlaylistBtn" title="Delete Playlist" style="font-size:1.3em;font-weight:bold;background:none;border:none;color:#d90429;cursor:pointer;">🗑️</button>` : '<span></span>'}
      </div>
      <ul class="menu-list" id="playlistSongsList" style="margin-top:18px;">
        ${tracksToShow.map((track, idx) =>
          `<li data-idx="${idx}">${track.title || track.fileName} - ${track.artist || ''}</li>`
        ).join('')}
      </ul>
    </div>
  `, direction);

  // "+" button: edit/add songs (only for user playlists)
  if (playlistIdx !== 'liked') {
    document.getElementById('editPlaylistBtn').onclick = () => {
      window.creatingPlaylist = playlist;
      goTo(renderAlbumSelectionForPlaylist);
    };

    document.getElementById('deletePlaylistBtn').onclick = () => {
      if (confirm(`Delete playlist "${playlist.name}"?`)) {
        playlists.splice(playlistIdx, 1);
        savePlaylists();
        renderPlaylistsMenu('back');
      }
    };
  }

  // Song click: play song
  tracksToShow.forEach((track, idx) => {
    document.querySelector(`#playlistSongsList li[data-idx="${idx}"]`).onclick = () => {
      playPlaylistTrack({ tracks: tracksToShow }, idx);
    };
  });

  masterHighlight({
    containerSelector: '#playlistSongsList',
    itemsSelector: 'li'
  });

  window.onPlaylistSongsMenuBack = () => {
    goTo(renderPlaylistsMenu, 'back');
  };
}

function playPlaylistTrack(playlist, idx) {
  const trackData = playlist.tracks[idx];
  // Try to find the track in the global tracks array
  const match = tracks.find(t =>
    (t.file?.webkitRelativePath && t.file.webkitRelativePath === trackData.relativePath) ||
    (t.file?.name === trackData.fileName &&
     t.album === trackData.album &&
     t.artist === trackData.artist) ||
    // Fallback: match by title, artist, album
    (t.title === trackData.title &&
     t.artist === trackData.artist &&
     t.album === trackData.album)
  );
  if (match) {
    currentAlbumSongs = playlist.tracks.map(plTrack =>
      tracks.find(t =>
        (t.file?.webkitRelativePath && t.file.webkitRelativePath === plTrack.relativePath) ||
        (t.file?.name === plTrack.fileName &&
         t.album === plTrack.album &&
         t.artist === plTrack.artist) ||
        (t.title === plTrack.title &&
         t.artist === plTrack.artist &&
         t.album === plTrack.album)
      )
    ).filter(Boolean);
    currentSongIndex = currentAlbumSongs.findIndex(t =>
      (t.file?.webkitRelativePath && t.file.webkitRelativePath === trackData.relativePath) ||
      (t.file?.name === trackData.fileName &&
       t.album === trackData.album &&
       t.artist === trackData.artist) ||
      (t.title === trackData.title &&
       t.artist === trackData.artist &&
       t.album === trackData.album)
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