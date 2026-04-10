// --- PLAYLISTS MENU & CREATION ---
const normPath = (p = '') => (typeof normalizePath === 'function' ? normalizePath(p) : p);

function renderPlaylistsMenu(direction = 'forward') {
  const allPlaylists = app.state.playlists;

  app.state.currentMenuIndex = 0;

  renderScreen(
    `<div style="display:flex;flex-direction:column;height:100%;">
      <div style="position:relative;display:flex;align-items:center;justify-content:center;height:38px;">
        <button id="addPlaylistBtn"
          style="position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:1.2em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">
          <i class="fa-solid fa-plus"></i>
        </button>
        <span style="font-size:1.2em;font-weight:bold;display:block;margin:0 auto;">Playlists</span>
      </div>
      <ul class="menu-list" id="playlistsList" style="margin-top:18px;">
        <li data-liked="true" data-idx="0" class="liked-playlist-row"><i class="fa-solid fa-heart"></i> Liked Songs</li>
        ${allPlaylists.length === 0 ? '' : allPlaylists.map((pl, idx) =>
          `<li data-idx="${idx + 1}">${pl.name}</li>`
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
    const li = document.querySelector(`#playlistsList li[data-idx="${idx + 1}"]`);
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
  if (typeof ensureCurrentWeekFlags === 'function') {
    ensureCurrentWeekFlags();
  }

  const habits = typeof loadUserHabits === 'function'
    ? loadUserHabits()
    : (window.userHabits || {});

  const allTracks = app.state.tracks || [];
  return allTracks.filter(track => {
    const trackId = getTrackId(track);
    const habit = habits[trackId];
    return habit && Number(habit.likeCount || 0) > 0;
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
  const albumKeys = app.state.derivedData.sortedAlbumKeys || [];

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
  carousel.dataset.itemCount = String(albumKeys.length);
  albumKeys.forEach((albumKey, idx) => {
    const albumObj = allAlbums[albumKey];
    const cover = albumObj.cover || 'src/img/default-cover.png';

    const div = document.createElement('div');
    div.className = 'carousel-album';
    div.dataset.idx = String(idx);

    div.innerHTML = `
      <div class="carousel-cover-reflect">
        <img
          src="${cover}"
          class="carousel-cover"
          alt="Album Cover"
          decoding="async"
          draggable="false"
        >
        <img
          src="${cover}"
          class="reflection"
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
        >
      </div>
    `;

    const coverImg = div.querySelector('.carousel-cover');
    const onLoaded = () => div.classList.add('carousel-album-loaded');
    coverImg.addEventListener('load', onLoaded, { once: true });
    if (coverImg.complete) onLoaded();

    div.onclick = () => {
      window.creatingPlaylist.selectedAlbum = albumKey;
      goTo(renderSongSelectionForPlaylist, albumKey, idx);
    };

    carousel.appendChild(div);
  });
  
  setCarouselAlbum(selectedIdx, albumKeys);

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

function renderSongSelectionForPlaylist(direction = 'forward', albumKey, albumIdx = 0) {
  window.onPlaylistAlbumMenuDone = null;
  const allAlbums = app.state.albums;
  const albumObj = allAlbums[albumKey];

  app.state.currentMenuIndex = 0;

  const isSamePlaylistTrack = (playlistTrack, track) => {
    const playlistPath = normPath(playlistTrack.relativePath || '');
    const trackPath = normPath(track.file?.webkitRelativePath || track.relativePath || '');

    return (
      (playlistPath && playlistPath === trackPath) ||
      (
        playlistTrack.fileName === (track.file?.name || track.fileName) &&
        playlistTrack.album === track.album &&
        playlistTrack.artist === track.artist
      )
    );
  };

  renderScreen(
    `<div class="album-list">
      <div class="album-list-left" id="playlistSongsSelectContainer" data-playlist-select="true" data-scroll-container="true">
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
    const isSelected = window.creatingPlaylist.tracks.some(playlistTrack =>
      isSamePlaylistTrack(playlistTrack, track)
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
    div.dataset.idx = String(idx);
    div.innerHTML = `
      ${nowPlayingLabel}
      <span style="padding-left:6px;">
        ${selectedIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}
      </span>
    `;

    div.onclick = () => {
      toggleTrackInCreatingPlaylist(track);

      const isNowSelected = window.creatingPlaylist.tracks.some(playlistTrack =>
        isSamePlaylistTrack(playlistTrack, track)
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

  songsList.dataset.itemCount = String(albumObj.songs.length);

  const items = songsList.querySelectorAll('.menu-list-song');
  if (items.length) {
    setActiveIndexedItem(songsList, '.menu-list-song', app.state.currentMenuIndex, { scrollIntoView: true });
  }
}

function toggleTrackInCreatingPlaylist(track) {
  const playlist = window.creatingPlaylist;
  if (!playlist || !Array.isArray(playlist.tracks)) return;

  const isSamePlaylistTrack = (playlistTrack, currentTrack) => {
    const playlistPath = normPath(playlistTrack.relativePath || '');
    const trackPath = normPath(currentTrack.file?.webkitRelativePath || currentTrack.relativePath || '');

    return (
      (playlistPath && playlistPath === trackPath) ||
      (
        playlistTrack.fileName === (currentTrack.file?.name || currentTrack.fileName) &&
        playlistTrack.album === currentTrack.album &&
        playlistTrack.artist === currentTrack.artist
      )
    );
  };

  const idx = playlist.tracks.findIndex(playlistTrack =>
    isSamePlaylistTrack(playlistTrack, track)
  );

  if (idx >= 0) {
    playlist.tracks.splice(idx, 1);
  } else {
    playlist.tracks.push({
      fileName: track.file?.name || track.fileName,
      album: track.album,
      artist: track.artist,
      relativePath: normPath(track.file?.webkitRelativePath || track.relativePath || ''),
      title: track.title
    });
  }
}

function rebuildPlaylistSongsList({ listEl, tracksToShow, currentTrackId, isEditable, editOn, playlistIdx }) {
  listEl.innerHTML = '';
  const allTracks = app.state.tracks || [];

  const isSameLoadedTrack = (loadedTrack, candidateTrack) => {
    const loadedPath = normPath(loadedTrack.file?.webkitRelativePath || loadedTrack.relativePath || '');
    const candidatePath = normPath(candidateTrack.relativePath || '');

    return (
      (loadedPath && candidatePath && loadedPath === candidatePath) ||
      (
        (loadedTrack.file?.name || loadedTrack.fileName) === candidateTrack.fileName &&
        loadedTrack.album === candidateTrack.album &&
        loadedTrack.artist === candidateTrack.artist
      ) ||
      (
        loadedTrack.title === candidateTrack.title &&
        loadedTrack.artist === candidateTrack.artist &&
        loadedTrack.album === candidateTrack.album
      )
    );
  };

  tracksToShow.forEach((playlistTrack, idx) => {
    const track =
      allTracks.find(loadedTrack => isSameLoadedTrack(loadedTrack, playlistTrack)) ||
      playlistTrack;

    const isNowPlaying = currentTrackId && getTrackId(track) === currentTrackId;
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
        ${editOn ? ' <span style="color:#0074d9;font-size:0.9em;">(edit)</span>' : ''}
      </span>
    `;

    div.onclick = () => {
      if (isEditable && editOn) {
        showPlaylistTrackActions(playlistIdx, idx);
      } else {
        playPlaylistTrack({ tracks: tracksToShow }, idx);
      }
    };

    listEl.appendChild(div);
  });

  window.updateHighlightedSong = () =>
    masterHighlight({ containerSelector: '#playlistSongsList', itemsSelector: '.menu-list-song' });

  if (typeof window.updateHighlightedSong === 'function') {
    window.updateHighlightedSong();
  }

  listEl.dataset.itemCount = String(tracksToShow.length);
  setActiveIndexedItem(listEl, '.menu-list-song', app.state.currentMenuIndex, { scrollIntoView: true });
}

function renderPlaylistSongsMenu(direction = 'forward', playlistIdx, selectedIdx = 0) {
  const allPlaylists = app.state.playlists;

  let playlist, tracksToShow;
  if (playlistIdx === 'liked') {
    playlist = { name: "Liked Songs", tracks: getLikedTracks() };
    tracksToShow = playlist.tracks;
  } else {
    playlist = allPlaylists[playlistIdx];
    tracksToShow = playlist.tracks;
  }

  if (!playlist || !tracksToShow) {
    renderPlaylistsMenu('back');
    return;
  }

  app.state.currentMenuIndex = selectedIdx || 0;
  const isEditable = playlistIdx !== 'liked';
  const editOn = !!app.state.playlistEditMode;

  renderScreen(
    `<div style="display:flex;flex-direction:column;height:100%;">
      <div style="position:relative;display:flex;align-items:center;min-height:38px;">
         ${isEditable
           ? `<button id="editPlaylistBtn" title="Add Songs" style="position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:1.2em;font-weight:bold;background:none;border:none;color:#0074d9;cursor:pointer;">
                <i class="fa-solid fa-plus"></i>
              </button>`
           : ''}
        <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:1.2em;font-weight:bold;text-align:center;width:70%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${playlist.name}
        </span>
         ${isEditable
           ? `<div style="position:absolute;right:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:8px;">
                 <button id="reorderPlaylistBtn" title="Toggle Reorder Mode" style="font-size:1.1em;background:none;border:none;color:${editOn ? '#0074d9' : '#888'};cursor:pointer;">
                   <i class="fa-solid fa-pen-to-square"></i>
                 </button>
                 <button id="deletePlaylistBtn" title="Delete Playlist" style="font-size:1.1em;font-weight:bold;background:none;border:none;color:#d90429;cursor:pointer;">
                   <i class="fa-solid fa-trash"></i>
                 </button>
               </div>`
            : ''}
       </div>
      <div id="playlistSongsList" style="margin-top:18px;"></div>
    </div>
  `, direction);

  // Build rows
  const listContainer = document.getElementById('playlistSongsList');
  const currentTrack = app.state.currentTrack;
  const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;

  rebuildPlaylistSongsList({
    listEl: listContainer,
    tracksToShow,
    currentTrackId,
    isEditable,
    editOn,
    playlistIdx
  });

  // "+" button: edit/add songs (only for user playlists)
  if (isEditable) {
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

    const reorderBtn = document.getElementById('reorderPlaylistBtn');
    if (reorderBtn) {
      reorderBtn.onclick = () => {
        app.state.playlistEditMode = !app.state.playlistEditMode;
        const idx = app.state.currentMenuIndex || 0;
        const editState = !!app.state.playlistEditMode;
        app.state.currentMenuIndex = idx;
        rebuildPlaylistSongsList({
          listEl: document.getElementById('playlistSongsList'),
          tracksToShow,
          currentTrackId,
          isEditable,
          editOn: editState,
          playlistIdx
        });
        reorderBtn.style.color = editState ? '#0074d9' : '#888';
      };
    }
  }
}

function showPlaylistTrackActions(playlistIdx, trackIdx) {
  const overlay = document.createElement('div');
  overlay.style = `
    position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);
    display:flex;align-items:center;justify-content:center;
  `;
  const box = document.createElement('div');
  box.style = `
    background:#fff;padding:18px 16px;border-radius:14px;box-shadow:0 2px 12px #0003;
    width:260px;max-width:90vw;display:flex;flex-direction:column;gap:8px;
  `;
  box.innerHTML = `
    <div style="font-weight:bold;font-size:1.05em;text-align:center;">Edit Track</div>
    <button id="ptaUp" style="padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;background:#f8f8f8;cursor:pointer;text-align:left;">
      <i class="fa-solid fa-arrow-up"></i> Move Up
    </button>
    <button id="ptaDown" style="padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;background:#f8f8f8;cursor:pointer;text-align:left;">
      <i class="fa-solid fa-arrow-down"></i> Move Down
    </button>
    <button id="ptaRemove" style="padding:8px 10px;border:1px solid #f3c3c3;border-radius:8px;background:#ffecec;cursor:pointer;text-align:left;color:#b00020;">
      <i class="fa-solid fa-trash"></i> Remove
    </button>
    <button id="ptaCancel" style="padding:7px 10px;border:none;background:#eee;color:#444;border-radius:8px;cursor:pointer;">Cancel</button>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);

  const playlists = app.state.playlists;
  const playlist = playlists[playlistIdx];
  if (!playlist) return close();

  function rerender(newIdx) {
    savePlaylists();
    app.state.currentMenuIndex = newIdx;
    rebuildPlaylistSongsList({
      listEl: document.getElementById('playlistSongsList'),
      tracksToShow: playlist.tracks,
      currentTrackId: (app.state.currentTrack ? getTrackId(app.state.currentTrack) : null),
      isEditable: true,
      editOn: !!app.state.playlistEditMode,
      playlistIdx
    });
    close();
  }

  document.getElementById('ptaUp').onclick = () => {
    if (trackIdx > 0) {
      const arr = playlist.tracks;
      [arr[trackIdx - 1], arr[trackIdx]] = [arr[trackIdx], arr[trackIdx - 1]];
      rerender(trackIdx - 1);
    } else {
      close();
    }
  };
  document.getElementById('ptaDown').onclick = () => {
    const arr = playlist.tracks;
    if (trackIdx < arr.length - 1) {
      [arr[trackIdx + 1], arr[trackIdx]] = [arr[trackIdx], arr[trackIdx + 1]];
      rerender(trackIdx + 1);
    } else {
      close();
    }
  };
  document.getElementById('ptaRemove').onclick = () => {
    const arr = playlist.tracks;
    arr.splice(trackIdx, 1);
    rerender(Math.max(0, trackIdx - 1));
  };
  document.getElementById('ptaCancel').onclick = close;
}

window.showPlaylistTrackActions = showPlaylistTrackActions;

function playPlaylistTrack(playlist, idx) {
  const allTracks = app.state.tracks || [];
  const playlistTrack = playlist.tracks[idx];
  if (!playlistTrack) return;

  const isSameLoadedTrack = (loadedTrack, candidateTrack) => {
    const loadedPath = normPath(loadedTrack.file?.webkitRelativePath || loadedTrack.relativePath || '');
    const candidatePath = normPath(candidateTrack.relativePath || '');

    return (
      (loadedPath && candidatePath && loadedPath === candidatePath) ||
      (
        (loadedTrack.file?.name || loadedTrack.fileName) === candidateTrack.fileName &&
        loadedTrack.album === candidateTrack.album &&
        loadedTrack.artist === candidateTrack.artist
      ) ||
      (
        loadedTrack.title === candidateTrack.title &&
        loadedTrack.artist === candidateTrack.artist &&
        loadedTrack.album === candidateTrack.album
      )
    );
  };

  const match = allTracks.find(track => isSameLoadedTrack(track, playlistTrack));

  if (match) {
    const mapped = playlist.tracks
      .map(candidateTrack => allTracks.find(track => isSameLoadedTrack(track, candidateTrack)))
      .filter(Boolean);

    const playlistSignature = playlist.name === 'Liked Songs'
      ? 'playlist:liked'
      : `playlist:${playlist.name}`;

    app.state.currentAlbumSongs = mapped;
    app.state.currentSongIndex = app.state.currentAlbumSongs.findIndex(track =>
      isSameLoadedTrack(track, playlistTrack)
    );

    playTrackFromAlbum(match, app.state.currentAlbumSongs, { queueSignature: playlistSignature });
  } else {
    alert("This song is not loaded.");
  }
}

// --- Add to playlist from Now Playing Menu --- 

function trackAlreadyInPlaylist(track, pl) {
  const trackPath = normPath(track.file?.webkitRelativePath || track.relativePath || '');

  return pl.tracks.some(playlistTrack => {
    const playlistPath = normPath(playlistTrack.relativePath || '');

    return (
      (playlistPath && playlistPath === trackPath) ||
      (
        playlistTrack.fileName === (track.file?.name || track.fileName) &&
        playlistTrack.album === track.album &&
        playlistTrack.artist === track.artist
      ) ||
      (
        playlistTrack.title === track.title &&
        playlistTrack.artist === track.artist &&
        playlistTrack.album === track.album
      )
    );
  });
}

function addTrackToPlaylist(track, pl) {
  if (trackAlreadyInPlaylist(track, pl)) return false;
  pl.tracks.push({
    fileName: track.file?.name || track.fileName,
    album: track.album,
    artist: track.artist,
    relativePath: normPath(track.file?.webkitRelativePath || track.relativePath || ''),
    title: track.title
  });
  return true;
}

// Quick add-from-Now-Playing modal
function showAddToPlaylistModal(track) {
  const playlists = app.state.playlists || [];
  const overlay = document.createElement('div');
  overlay.style = `
    position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);
    display:flex;align-items:center;justify-content:center;
  `;
  const box = document.createElement('div');
  box.style = `
    background:#fff;padding:18px 16px;border-radius:14px;box-shadow:0 2px 12px #0003;
    width:280px;max-width:90vw;display:flex;flex-direction:column;gap:10px;
  `;
  box.innerHTML = `
    <div style="font-weight:bold;font-size:1.05em;text-align:center;">Add to Playlist</div>
    <div id="atpList" style="max-height:220px;overflow-y:auto;">
      ${playlists.length === 0 ? `<div style="color:#666;text-align:center;margin:8px 0;">No playlists yet</div>` : ''}
      ${playlists.map((pl, i) =>
        `<button data-idx="${i}" style="width:100%;text-align:left;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;background:#f8f8f8;cursor:pointer;margin:4px 0;">${pl.name}</button>`
      ).join('')}
    </div>
    <button id="atpNew" style="padding:8px 10px;border:none;background:#0074d9;color:#fff;border-radius:8px;cursor:pointer;">New Playlist</button>
    <button id="atpCancel" style="padding:6px 10px;border:none;background:#eee;color:#444;border-radius:8px;cursor:pointer;">Cancel</button>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() { document.body.removeChild(overlay); }

  box.querySelectorAll('#atpList button[data-idx]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const pl = playlists[idx];
      const added = addTrackToPlaylist(track, pl);
      if (added) {
        savePlaylists();
        if (typeof showHotBarMessage === 'function') showHotBarMessage(`Added to ${pl.name}`, 1800);
      } else {
        if (typeof showHotBarMessage === 'function') showHotBarMessage(`Already in ${pl.name}`, 1800);
      }
      close();
    };
  });

  box.querySelector('#atpNew').onclick = () => {
    const name = prompt("Playlist name:");
    if (!name) return;
    const pl = { name: name.trim(), tracks: [] };
    if (!pl.name) return;
    app.state.playlists.push(pl);
    addTrackToPlaylist(track, pl);
    savePlaylists();
    if (typeof showHotBarMessage === 'function') showHotBarMessage(`Added to ${pl.name}`, 1800);
    close();
  };

  box.querySelector('#atpCancel').onclick = close;
}

window.showAddToPlaylistModal = showAddToPlaylistModal;


// --- PLAYLIST STORAGE ---

function savePlaylists() {
  const playlists = app.state.playlists;
  localStorage.setItem('playlists', JSON.stringify(playlists));
}