// --- ARTISTS MENU ---

function renderArtistsMenu(direction = 'forward') {
  const artistNames = app.state.derivedData.artistMenuItems || [];
  const trackCount = (app.state.tracks || []).length;

  if (artistNames.length === 0 || trackCount === 0) {
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
    id: "artistsList",
    cacheKey: 'artists-list'
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
    .filter(key =>
      (allAlbums[key].artist || 'Unknown Artist')
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
    onAlbumClick: (albumKey, idx) => {
      app.state.currentMenuIndex = idx;
      goTo(renderAlbumSongsMenu, albumKey, idx, displayName, artistKey);
    },
    title: displayName,
    selectedIdx
  }, direction);
}