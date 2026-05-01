// --- All SONGS MENU ---

function renderAllSongsMenu(direction = 'forward') {
  const allTracks = app.state.tracks;

  if (!allTracks.length) {
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

  app.state.currentMenuIndex = 0;

  const sortOrder = localStorage.getItem('allSongsSortOrder') || 'title';
  let currentSortOrder = sortOrder;
  let sortedTracks = allTracks.slice();

  function getAllSongsQueueSignature() {
    const searchValue = (document.getElementById('songSearchInput')?.value || '').trim().toLowerCase();
    return `all-songs:${currentSortOrder}:${searchValue}`;
  }

  function sortTracks(order) {
    currentSortOrder = order;
    localStorage.setItem('allSongsSortOrder', order);
    sortedTracks = allTracks.slice();
    if (order === 'title') {
      sortedTracks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (order === 'artist') {
      sortedTracks.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    } else if (order === 'album') {
      sortedTracks.sort((a, b) => {
        const albumCmp = (a.album || '').localeCompare(b.album || '');
        if (albumCmp !== 0) return albumCmp;
        const ta = Number.isFinite(a.trackNumber) ? a.trackNumber : null;
        const tb = Number.isFinite(b.trackNumber) ? b.trackNumber : null;
        if (ta != null && tb != null && ta !== tb) return ta - tb;
        if (ta != null && tb == null) return -1;
        if (ta == null && tb != null) return 1;
        return (a.title || '').localeCompare(b.title || '');
      });
    }
    app.state.currentMenuIndex = 0;    
    renderList(sortedTracks);
    if (typeof window.updateHighlightedSong === 'function') window.updateHighlightedSong();
  }

  renderScreen(
    `<div class="album-list all-songs-layout">
        <div class="album-list-left all-songs-pane" id="allSongsListContainer" data-scroll-container="true">
          <div class="all-songs-pane-header">
            <div class="all-songs-toolbar">
              <span class="all-songs-title">All Songs</span>
              <button id="sortSongsBtn" class="all-songs-sort-btn" title="Sort Songs">
                <i class="fa-solid fa-arrow-down-a-z"></i>
              </button>
            </div>
            <div class="all-songs-search-wrap">
              <input id="songSearchInput" class="songSearchInput" type="text" placeholder="Search songs...">
            </div>
          </div>
          <div id="allSongsList"></div>
        </div>
        <div class="album-list-right" id="allSongsArtContainer">
          <img id="allSongsArt" src="src/img/default-cover.png" class="album-cover" alt="Album Cover">
        </div>
    </div>`,
    direction
  );

  // Render song list
  function renderList(filteredTracks) {
    // keep the currently displayed list for nav.js art updates
    window.allSongsCurrentList = filteredTracks;

    const songsList = document.getElementById('allSongsList');
    songsList.innerHTML = '';

    const currentTrack = app.state.currentTrack;
    const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;

    filteredTracks.forEach((track, idx) => {
      const isNowPlaying =
        currentTrackId && getTrackId(track) === currentTrackId;

      const nowPlayingLabel = isNowPlaying
        ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
        : '';

      const div = document.createElement('div');
      div.className = 'menu-list-song';
      div.dataset.idx = idx;
      div.dataset.trackId = getTrackId(track);
      div.innerHTML = `
        ${nowPlayingLabel}
        <span style="padding-left:6px;">
          ${track.title}${track.artist ? ` - ${track.artist}` : ''}
        </span>
      `;
      div.onclick = () => {
        app.state.currentMenuIndex = idx;
        playTrackFromAlbum(track, filteredTracks, { queueSignature: getAllSongsQueueSignature() });
        window.updateHighlightedSong();
      };
      songsList.appendChild(div);
    });

    songsList.dataset.itemCount = String(filteredTracks.length);

    window.updateHighlightedSong = () =>
      masterHighlight({
        containerSelector: '#allSongsList',
        itemsSelector: '.menu-list-song',
        tracks: filteredTracks,
        albumArtSelector: '#allSongsArt'
      });

    // initial highlight
    if (filteredTracks.length) {
      window.updateHighlightedSong();
      setActiveIndexedItem(songsList, '.menu-list-song', app.state.currentMenuIndex, { scrollIntoView: true });
    }
  }

  renderList(sortedTracks);

  document.getElementById('songSearchInput').oninput = (e) => {
    const q = (e.target.value || '').toLowerCase();
    const filtered = sortedTracks.filter(track => {
      const t = (track.title || '').toLowerCase();
      const ar = (track.artist || '').toLowerCase();
      const al = (track.album || '').toLowerCase();
      return t.includes(q) || ar.includes(q) || al.includes(q);
    });
    app.state.currentMenuIndex = 0;
    renderList(filtered);
  };

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