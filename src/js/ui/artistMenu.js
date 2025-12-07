// --- ARTISTS MENU ---

function renderArtistsMenu(direction = 'forward') {
  // Group artists by lowercase name
  const artistMap = {};
  tracks.forEach(t => {
    const raw = t.artist || 'Unknown Artist';
    const key = raw.trim().toLowerCase();
    if (!artistMap[key]) artistMap[key] = raw;
  });
  // Prepare display names (capitalize each word)
  const artistNames = Object.entries(artistMap)
    .map(([key, name]) => ({
      label: name.replace(/\b\w/g, c => c.toUpperCase()),
      key
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (artistNames.length === 0 || tracks.length === 0) {
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
  currentMenuIndex = 0;
  renderMenuList({
    title: "Artists",
    items: artistNames,
    onItemClick: (idx, item) => { currentMenuIndex = idx; goTo(renderArtistAlbumsMenu, item.key); },
    onBack: goBack,
    id: "artistsList"
  }, direction);

  // Highlight first artist
  masterHighlight({
    containerSelector: '#artistsList',
    itemsSelector: 'li'
  });
}

function renderArtistAlbumsMenu(direction = 'forward', artistKey, selectedIdx = 0) {
  // Find all albums where the normalized artist matches
  const artistAlbums = Object.keys(albums)
    .filter(albumName => (albums[albumName].artist || 'Unknown Artist').trim().toLowerCase() === artistKey);

  // Find display name for UI
  const displayName = tracks.find(t => (t.artist || 'Unknown Artist').trim().toLowerCase() === artistKey)?.artist || artistKey;

  renderAlbumCarousel({
    albumsList: artistAlbums,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album, idx, displayName, artistKey); },
    title: displayName,
    selectedIdx
  }, direction);
}