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