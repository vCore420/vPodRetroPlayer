// --- MAIN MENU ---

function isRecapWindow() {
  if (typeof DEBUG_RECAP_ALWAYS_ON !== 'undefined' && DEBUG_RECAP_ALWAYS_ON) return true;
  const now = new Date();
  return now.getDay() === 1 && now.getHours() >= 8 && now.getHours() < 20;
}

function renderMainMenu(direction = 'forward') {
  const hotBar = document.getElementById('hotBar');
  if (hotBar && hotBar.style.display === 'none') {
    hotBar.style.display = '';
  }
  
  app.state.currentMenuIndex = 0;

  const menuItems = [
    { label: "Load Music", action: renderLoadMusic },
    { label: "Now Playing", action: renderNowPlayingScreen },
    { label: "Playlists", action: renderPlaylistsMenu }, 
    { label: "Artists", action: renderArtistsMenu },
    { label: "Albums", action: renderAlbumsMenu },
    { label: "All Songs", action: renderAllSongsMenu },
    { label: "Suggested", action: renderSuggestedMenu },
    { label: "Smart Mix", action: renderSmartMixMenu },
    { label: "Games", action: renderGamesMenu },
    { label: "Settings", action: renderSettingsMenu }
  ];

  if (isRecapWindow()) {
    menuItems.splice(1, 0, { label: "Weekly Recap", action: renderWeeklyRecapMenu });
  }

  renderMenuList({
    items: menuItems,
    onItemClick: (idx, item) => {
      app.state.currentMenuIndex = idx;
      if (item.action === renderAlbumsMenu) {
        goTo(renderAlbumsMenu, 0);
      } else {
        goTo(item.action);
      }
    },
  }, direction);

  masterHighlight({
    containerSelector: '#menuList',
    itemsSelector: 'li'
  });

  updateHotBarTime();
}