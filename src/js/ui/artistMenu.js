// --- ARTISTS MENU ---

function renderArtistsMenu(direction = 'forward') {
  const allTracks = app.state.tracks;

  const artistMap = {};
  allTracks.forEach(t => {
    const raw = t.artist || 'Unknown Artist';
    const key = raw.trim().toLowerCase();
    if (!artistMap[key]) artistMap[key] = raw;
  });

  const artistNames = Object.entries(artistMap)
    .map(([key, name]) => ({
      label: name.replace(/\b\w/g, c => c.toUpperCase()),
      key
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (artistNames.length === 0 || allTracks.length === 0) {
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
  
  app.state.currentMenuIndex = 0;

  renderMenuList({
    title: "Artists",
    items: artistNames,
    onItemClick: (idx, item) => {
      app.state.currentMenuIndex = idx;
      goTo(renderArtistAlbumsMenu, item.key);
    },
    onBack: goBack,
    id: "artistsList"
  }, direction);

  masterHighlight({
    containerSelector: '#artistsList',
    itemsSelector: 'li'
  });
}

function renderArtistAlbumsMenu(direction = 'forward', artistKey, selectedIdx = 0) {
  const allAlbums = app.state.albums;
  const allTracks = app.state.tracks;

  const artistAlbums = Object.keys(allAlbums)
    .filter(albumName =>
      (allAlbums[albumName].artist || 'Unknown Artist')
        .trim()
        .toLowerCase() === artistKey
    );

  const displayName =
    allTracks.find(
      t =>
        (t.artist || 'Unknown Artist').trim().toLowerCase() === artistKey
    )?.artist || artistKey;

  renderAlbumCarousel({
    albumsList: artistAlbums,
    onAlbumClick: (album, idx) => {
      app.state.currentMenuIndex = idx;
      goTo(renderAlbumSongsMenu, album, idx, displayName, artistKey);
    },
    title: displayName,
    selectedIdx
  }, direction);
}