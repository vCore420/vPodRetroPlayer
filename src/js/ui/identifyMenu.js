// --- IDENTIFY TRACK / ALBUM / ARTIST -------------------------------------
//
// UI for the last-resort MusicBrainz lookup + manual-ID linking tools (see
// src/js/identify.js for the actual client/apply logic). Two entry points:
//   1. A small button on the Now Playing screen, scoped to the current track.
//   2. A "Identify Music" screen under Settings, for reviewing everything
//      the loader couldn't figure out, plus fixing any album/artist by name.
// Nothing here runs automatically - every lookup is triggered by the user
// tapping Search or Apply.

function closeIdentifyModal(overlay) {
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

function identifyResultRowHtml(match, idx) {
  const bits = [];
  if (match.type === 'recording') {
    bits.push(`<div style="font-weight:bold;">${match.title || 'Untitled'}</div>`);
    bits.push(`<div style="font-size:0.85em;color:#666;">${match.artist || 'Unknown Artist'}${match.album ? ` • ${match.album}` : ''}${match.year ? ` • ${match.year}` : ''}</div>`);
  } else if (match.type === 'release-group') {
    bits.push(`<div style="font-weight:bold;">${match.album || 'Untitled'}</div>`);
    bits.push(`<div style="font-size:0.85em;color:#666;">${match.artist || 'Unknown Artist'}${match.year ? ` • ${match.year}` : ''}${match.primaryType ? ` • ${match.primaryType}` : ''}</div>`);
  } else {
    bits.push(`<div style="font-weight:bold;">${match.artist || 'Untitled'}</div>`);
    bits.push(`<div style="font-size:0.85em;color:#666;">${match.disambiguation || match.country || 'Artist'}</div>`);
  }

  return `<button data-result-idx="${idx}" style="width:100%;text-align:left;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;background:#f8f8f8;cursor:pointer;margin:4px 0;">
    ${bits.join('')}
  </button>`;
}

// context: { kind: 'track'|'album'|'artist', track?, albumKey?, artistName?, onApplied? }
function openIdentifyModal(context) {
  const overlay = document.createElement('div');
  overlay.style = `
    position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  const box = document.createElement('div');
  box.style = `
    background:#fff;padding:18px 16px;border-radius:14px;box-shadow:0 2px 12px #0003;
    width:320px;max-width:92vw;max-height:86vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px;
  `;

  let heading = 'Identify';
  let currentLine = '';
  let defaultTitle = '';
  let defaultArtist = '';
  let defaultAlbum = '';
  let siblingCount = 0;

  if (context.kind === 'track') {
    const track = context.track;
    heading = 'Identify Track';
    currentLine = `${track.title || 'Untitled'}<br><span style="color:#666;font-size:0.85em;">${track.artist || 'Unknown Artist'}${track.album ? ` • ${track.album}` : ''}</span>`;
    defaultTitle = track.title || '';
    defaultArtist = (track.artist && track.artist !== 'Unknown Artist') ? track.artist : '';
    siblingCount = (window.IdentifyTools?.findAlbumSiblings(track) || []).length;
  } else if (context.kind === 'album') {
    const albumEntry = (app.state.albums || {})[context.albumKey] || {};
    heading = 'Identify Album';
    currentLine = `${albumEntry.title || 'Untitled Album'}<br><span style="color:#666;font-size:0.85em;">${albumEntry.artist || 'Unknown Artist'}</span>`;
    defaultAlbum = (albumEntry.title && albumEntry.title !== 'Unidentified Album') ? albumEntry.title : '';
    defaultArtist = (albumEntry.artist && albumEntry.artist !== 'Unknown Artist') ? albumEntry.artist : '';
  } else {
    heading = 'Identify Artist';
    currentLine = context.artistName || 'Unknown Artist';
    defaultArtist = (context.artistName && context.artistName !== 'Unknown Artist') ? context.artistName : '';
  }

  box.innerHTML = `
    <div style="font-weight:bold;font-size:1.05em;text-align:center;">${heading}</div>
    <div style="text-align:center;font-size:0.95em;">${currentLine}</div>

    <div style="display:flex;gap:6px;">
      <button id="idTabSearch" style="flex:1;padding:7px 0;border:none;border-radius:8px;background:#0074d9;color:#fff;cursor:pointer;">Search</button>
      <button id="idTabManual" style="flex:1;padding:7px 0;border:none;border-radius:8px;background:#eee;color:#444;cursor:pointer;">Enter ID</button>
    </div>

    <div id="idSearchPane">
      ${context.kind === 'track' ? `
        <input id="idFieldTitle" placeholder="Track title" value="${defaultTitle.replace(/"/g, '&quot;')}"
          style="width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;box-sizing:border-box;">
      ` : ''}
      ${context.kind !== 'artist' ? `
        <input id="idFieldAlbum" placeholder="Album name" value="${defaultAlbum.replace(/"/g, '&quot;')}"
          style="width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;box-sizing:border-box;">
      ` : ''}
      <input id="idFieldArtist" placeholder="Artist name" value="${defaultArtist.replace(/"/g, '&quot;')}"
        style="width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;box-sizing:border-box;">
      <button id="idSearchBtn" style="width:100%;padding:8px 0;border:none;border-radius:8px;background:#0074d9;color:#fff;cursor:pointer;">Search MusicBrainz</button>
      <div id="idSearchStatus" style="font-size:0.85em;color:#666;text-align:center;margin-top:6px;"></div>
      <div id="idResultsList" style="max-height:200px;overflow-y:auto;margin-top:6px;"></div>
    </div>

    <div id="idManualPane" style="display:none;">
      <div style="font-size:0.85em;color:#666;margin-bottom:6px;">
        Paste a MusicBrainz ${context.kind === 'track' ? 'Recording' : context.kind === 'album' ? 'Release Group' : 'Artist'} ID (found on musicbrainz.org).
      </div>
      <input id="idManualMbid" placeholder="e.g. f27ec8db-af05-4dee-8b13-b04e10ca9ce1"
        style="width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px;box-sizing:border-box;">
      <button id="idManualLookupBtn" style="width:100%;padding:8px 0;border:none;border-radius:8px;background:#0074d9;color:#fff;cursor:pointer;">Look Up</button>
      <div id="idManualStatus" style="font-size:0.85em;color:#666;text-align:center;margin-top:6px;"></div>
      <div id="idManualPreview" style="margin-top:6px;"></div>
    </div>

    ${context.kind === 'track' && siblingCount > 0 ? `
      <label style="display:flex;align-items:center;gap:6px;font-size:0.85em;color:#444;">
        <input type="checkbox" id="idCascadeAlbum"> Also apply to the other ${siblingCount} track${siblingCount === 1 ? '' : 's'} in this album
      </label>
    ` : ''}

    <button id="idCancelBtn" style="padding:8px 0;border:none;background:#eee;color:#444;border-radius:8px;cursor:pointer;">Close</button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const searchPane = box.querySelector('#idSearchPane');
  const manualPane = box.querySelector('#idManualPane');
  const tabSearch = box.querySelector('#idTabSearch');
  const tabManual = box.querySelector('#idTabManual');

  tabSearch.onclick = () => {
    searchPane.style.display = '';
    manualPane.style.display = 'none';
    tabSearch.style.background = '#0074d9';
    tabSearch.style.color = '#fff';
    tabManual.style.background = '#eee';
    tabManual.style.color = '#444';
  };
  tabManual.onclick = () => {
    searchPane.style.display = 'none';
    manualPane.style.display = '';
    tabManual.style.background = '#0074d9';
    tabManual.style.color = '#fff';
    tabSearch.style.background = '#eee';
    tabSearch.style.color = '#444';
  };

  box.querySelector('#idCancelBtn').onclick = () => closeIdentifyModal(overlay);

  async function applyMatch(match) {
    const cascade = !!box.querySelector('#idCascadeAlbum')?.checked;
    let result = { updated: 0 };

    try {
      if (context.kind === 'track' && match.type === 'recording') {
        result = await window.IdentifyTools.applyRecordingMatchToTrack(context.track, match, { cascadeAlbum: cascade });
      } else if (context.kind === 'album' && match.type === 'release-group') {
        result = await window.IdentifyTools.applyReleaseGroupMatchToAlbum(context.albumKey, match);
      } else if (context.kind === 'artist' && match.type === 'artist') {
        result = await window.IdentifyTools.applyArtistMatchToTracks(context.artistName, match);
      } else {
        throw new Error('That result type doesn\'t match what you\'re identifying.');
      }
    } catch (error) {
      if (typeof showHotBarMessage === 'function') showHotBarMessage('Could not apply that match', 2000);
      return;
    }

    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage(result.updated > 1 ? `Updated ${result.updated} tracks` : 'Track updated', 2000);
    }
    closeIdentifyModal(overlay);
    if (typeof context.onApplied === 'function') context.onApplied();
  }

  box.querySelector('#idSearchBtn').onclick = async () => {
    const status = box.querySelector('#idSearchStatus');
    const resultsList = box.querySelector('#idResultsList');
    const titleVal = box.querySelector('#idFieldTitle')?.value.trim() || '';
    const albumVal = box.querySelector('#idFieldAlbum')?.value.trim() || '';
    const artistVal = box.querySelector('#idFieldArtist')?.value.trim() || '';

    status.textContent = 'Searching MusicBrainz…';
    resultsList.innerHTML = '';

    try {
      let results = [];
      if (context.kind === 'track') {
        results = await window.MusicBrainzClient.searchRecordings(titleVal, artistVal, albumVal);
      } else if (context.kind === 'album') {
        results = await window.MusicBrainzClient.searchReleaseGroups(albumVal, artistVal);
      } else {
        results = await window.MusicBrainzClient.searchArtists(artistVal);
      }

      if (!results.length) {
        status.textContent = 'No matches found. Try fewer or different words.';
        return;
      }

      status.textContent = `${results.length} match${results.length === 1 ? '' : 'es'} - tap one to apply it.`;
      resultsList.innerHTML = results.map(identifyResultRowHtml).join('');
      resultsList.querySelectorAll('button[data-result-idx]').forEach(btn => {
        btn.onclick = () => applyMatch(results[Number(btn.dataset.resultIdx)]);
      });
    } catch (error) {
      status.textContent = error.message || 'Something went wrong searching MusicBrainz.';
    }
  };

  box.querySelector('#idManualLookupBtn').onclick = async () => {
    const status = box.querySelector('#idManualStatus');
    const preview = box.querySelector('#idManualPreview');
    const mbid = box.querySelector('#idManualMbid')?.value.trim() || '';
    const entityType = context.kind === 'track' ? 'recording' : context.kind === 'album' ? 'release-group' : 'artist';

    status.textContent = 'Looking up…';
    preview.innerHTML = '';

    try {
      const match = await window.MusicBrainzClient.lookupByMbid(entityType, mbid);
      status.textContent = 'Found it - confirm and apply:';
      preview.innerHTML = identifyResultRowHtml(match, 0).replace('data-result-idx="0"', 'id="idManualApplyRow"');
      preview.querySelector('#idManualApplyRow').onclick = () => applyMatch(match);
    } catch (error) {
      status.textContent = error.message || 'Could not look that ID up.';
    }
  };
}

window.openIdentifyModal = openIdentifyModal;

// --- Settings hub ----------------------------------------------------------

function renderIdentifyMenu(direction = 'forward') {
  const unidentifiedCount = (window.IdentifyTools?.getUnidentifiedTracks() || []).length;

  renderMenuList({
    title: 'Identify Music',
    before: `<div style="font-size:0.85em;color:#666;text-align:center;margin:-4px 0 10px;padding:0 8px;">
      Last resort for tracks tags/folders couldn't identify. Search MusicBrainz or paste in a known ID.
    </div>`,
    items: [
      { label: `Needs Identification${unidentifiedCount ? ` (${unidentifiedCount})` : ''}`, action: 'unidentified' },
      { label: 'Fix an Album', action: 'albums' },
      { label: 'Fix an Artist', action: 'artists' }
    ],
    onItemClick: (idx, item) => {
      app.state.currentMenuIndex = idx;
      if (item.action === 'unidentified') goTo(renderUnidentifiedTracksMenu);
      else if (item.action === 'albums') goTo(renderIdentifyAlbumsMenu);
      else goTo(renderIdentifyArtistsMenu);
    },
    id: 'identifyMenuList'
  }, direction);

  masterHighlight({ containerSelector: '#identifyMenuList', itemsSelector: 'li' });
}
window.renderIdentifyMenu = renderIdentifyMenu;

function renderUnidentifiedTracksMenu(direction = 'forward') {
  const tracks = window.IdentifyTools?.getUnidentifiedTracks() || [];

  if (!tracks.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:0 18px;text-align:center;">
        <div style="font-size:1.15em;color:#0074d9;font-weight:bold;margin-bottom:10px;">All caught up</div>
        <div style="font-size:0.95em;color:#444;">Nothing in your library currently needs identification.</div>
      </div>`,
      direction
    );
    return;
  }

  renderMenuList({
    title: 'Needs Identification',
    items: tracks.map(track => ({
      label: `${track.title || track.fileName || 'Untitled'}<br><span style="font-size:0.8em;color:#888;">${track.relativePath || track.fileName || ''}</span>`
    })),
    onItemClick: (idx) => {
      openIdentifyModal({
        kind: 'track',
        track: tracks[idx],
        onApplied: () => goTo(renderUnidentifiedTracksMenu)
      });
    },
    id: 'unidentifiedTracksList'
  }, direction);

  masterHighlight({ containerSelector: '#unidentifiedTracksList', itemsSelector: 'li' });
}
window.renderUnidentifiedTracksMenu = renderUnidentifiedTracksMenu;

function renderIdentifySearchableMenu({ title, id, getRows, onRowClick, emptyLabel }, direction = 'forward') {
  const rows = getRows();

  const { root } = renderScreen(`
    <div>
      <div class="menu-title" style="font-weight:bold;font-size:1.2em;text-align:center;margin-bottom:10px;">${title}</div>
      <input id="${id}Search" placeholder="Type to filter…"
        style="width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;box-sizing:border-box;">
      <ul class="menu-list" id="${id}">
        ${rows.length ? rows.map((row, idx) => `<li data-idx="${idx}">${row.label}</li>`).join('')
          : `<li style="color:#888;">${emptyLabel}</li>`}
      </ul>
    </div>
  `, direction);

  const list = root.querySelector(`#${id}`);
  const searchInput = root.querySelector(`#${id}Search`);

  list.onclick = event => {
    const li = event.target.closest('li[data-idx]');
    if (!li) return;
    onRowClick(rows[Number(li.dataset.idx)]);
  };

  searchInput.oninput = () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q ? rows.filter(row => row.searchText.includes(q)) : rows;
    list.innerHTML = filtered.length
      ? filtered.map(row => `<li data-idx="${rows.indexOf(row)}">${row.label}</li>`).join('')
      : `<li style="color:#888;">No matches</li>`;
  };
}

function renderIdentifyAlbumsMenu(direction = 'forward') {
  const allAlbums = app.state.albums || {};
  const rows = Object.keys(allAlbums).map(albumKey => {
    const albumEntry = allAlbums[albumKey];
    return {
      albumKey,
      label: `${albumEntry.title || 'Untitled Album'}<br><span style="font-size:0.8em;color:#888;">${albumEntry.artist || 'Unknown Artist'} • ${(albumEntry.songs || []).length} tracks</span>`,
      searchText: `${albumEntry.title || ''} ${albumEntry.artist || ''}`.toLowerCase()
    };
  }).sort((a, b) => a.label.localeCompare(b.label));

  renderIdentifySearchableMenu({
    title: 'Fix an Album',
    id: 'identifyAlbumsList',
    getRows: () => rows,
    emptyLabel: 'No albums loaded',
    onRowClick: row => {
      openIdentifyModal({
        kind: 'album',
        albumKey: row.albumKey,
        onApplied: () => goTo(renderIdentifyAlbumsMenu)
      });
    }
  }, direction);
}
window.renderIdentifyAlbumsMenu = renderIdentifyAlbumsMenu;

function renderIdentifyArtistsMenu(direction = 'forward') {
  const seen = new Set();
  const artistNames = [];
  (app.state.tracks || []).forEach(track => {
    const name = track.artist || 'Unknown Artist';
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      artistNames.push(name);
    }
  });

  const rows = artistNames.sort((a, b) => a.localeCompare(b)).map(name => ({
    label: name,
    searchText: name.toLowerCase()
  }));

  renderIdentifySearchableMenu({
    title: 'Fix an Artist',
    id: 'identifyArtistsList',
    getRows: () => rows,
    emptyLabel: 'No artists loaded',
    onRowClick: row => {
      openIdentifyModal({
        kind: 'artist',
        artistName: row.label,
        onApplied: () => goTo(renderIdentifyArtistsMenu)
      });
    }
  }, direction);
}
window.renderIdentifyArtistsMenu = renderIdentifyArtistsMenu;
