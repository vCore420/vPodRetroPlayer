// --- MAIN MENU ---

function isRecapWindow() {
  if (typeof DEBUG_RECAP_ALWAYS_ON !== 'undefined' && DEBUG_RECAP_ALWAYS_ON) return true;
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();

  const now = new Date();
  if (now.getDay() !== 1) return false;

  const hour = now.getHours();
  return hour >= 8 && hour < 20;
}

function getMainMenuItems() {
  const items = [
    {
      key: 'load-music',
      label: 'Load Music',
      action: renderLoadMusic,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-folder',
        title: 'Load Music',
        subtitle: 'Import your library',
        theme: 'load'
      }
    },
    {
      key: 'now-playing',
      label: 'Now Playing',
      action: renderNowPlayingScreen,
      preview: {
        type: 'cover'
      }
    },
    {
      key: 'playlists',
      label: 'Playlists',
      action: renderPlaylistsMenu,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-list-ul',
        title: 'Playlists',
        subtitle: 'Saved collections',
        theme: 'playlists'
      }
    },
    {
      key: 'artists',
      label: 'Artists',
      action: renderArtistsMenu,
      preview: {
        type: 'artist-collage'
      }
    },
    {
      key: 'albums',
      label: 'Albums',
      action: renderAlbumsMenu,
      preview: {
        type: 'album-random'
      }
    },
    {
      key: 'all-songs',
      label: 'All Songs',
      action: renderAllSongsMenu,
      preview: {
        type: 'icon-count',
        icon: 'fa-solid fa-music',
        title: 'All Songs',
        theme: 'songs'
      }
    },
    {
      key: 'suggested',
      label: 'Suggested',
      action: renderSuggestedMenu,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-star',
        title: 'Suggested',
        subtitle: 'Recommendations',
        theme: 'suggested'
      }
    },
    {
      key: 'smart-mix',
      label: 'Smart Mix',
      action: renderSmartMixMenu,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-shuffle',
        title: 'Smart Mix',
        subtitle: 'Adaptive shuffle',
        theme: 'smartmix',
        accentIcon: 'fa-solid fa-wand-magic-sparkles'
      }
    },
    {
      key: 'games',
      label: 'Games',
      action: renderGamesMenu,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-gamepad',
        title: 'Games',
        subtitle: 'Mini classics',
        theme: 'games'
      }
    },
    {
      key: 'settings',
      label: 'Settings',
      action: renderSettingsMenu,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-gear',
        title: 'Settings',
        subtitle: 'EQ, themes and backup',
        theme: 'settings'
      }
    }
  ];

  if (isRecapWindow()) {
    items.splice(1, 0, {
      key: 'weekly-recap',
      label: 'Weekly Recap',
      action: renderWeeklyRecapMenu,
      preview: {
        type: 'icon',
        icon: 'fa-solid fa-chart-column',
        title: 'Weekly Recap',
        subtitle: 'Your week in music',
        theme: 'recap'
      }
    });
  }

  return items;
}

function pickRandom(items = []) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function shuffledCopy(items = []) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDefaultMenuCover() {
  return 'src/img/default-cover.png';
}

function getCurrentTrackCover() {
  const track = app.state.currentTrack;
  if (!track) return getDefaultMenuCover();

  const albumObj = (app.state.albums || {})[track.albumKey || track.album] || {};
  return albumObj.cover || getDefaultMenuCover();
}

function getRandomLoadedAlbumCover() {
  const albums = Object.values(app.state.albums || {}).filter(album => album.cover);
  return pickRandom(albums)?.cover || getDefaultMenuCover();
}

function getArtistPreviewData() {
  const albums = Object.values(app.state.albums || {})
    .filter(album => album.cover && album.artist);

  if (!albums.length) {
    return {
      artist: 'Artists',
      covers: [getDefaultMenuCover()]
    };
  }

  const byArtist = new Map();

  albums.forEach(album => {
    const artistKey = (album.artist || 'Unknown Artist').trim();
    if (!byArtist.has(artistKey)) byArtist.set(artistKey, []);
    byArtist.get(artistKey).push(album.cover);
  });

  const artistEntries = Array.from(byArtist.entries())
    .filter(([, covers]) => covers.length > 0);

  if (!artistEntries.length) {
    return {
      artist: 'Artists',
      covers: [getDefaultMenuCover()]
    };
  }

  const [artist, covers] = pickRandom(artistEntries);
  return {
    artist,
    covers: shuffledCopy(covers).slice(0, 4)
  };
}

function getMainMenuPreviewHtml(item) {
  const preview = item.preview || {};
  const trackCount = (app.state.tracks || []).length;
  const albumCount = Object.keys(app.state.albums || {}).length;

  const overlay = (title, subtitle = '', extra = '') => `
    <div class="main-menu-preview-overlay">
      <div class="main-menu-preview-title">${title}</div>
      ${subtitle ? `<div class="main-menu-preview-subtitle">${subtitle}</div>` : ''}
      ${extra}
    </div>
  `;

  if (preview.type === 'cover') {
    return `
      <div class="main-menu-preview-fill">
        <img src="${getCurrentTrackCover()}" class="main-menu-preview-image main-menu-preview-image--fill" alt="Now Playing">
        ${overlay(
          'Now Playing',
          app.state.currentTrack ? (app.state.currentTrack.title || 'Current track') : 'Nothing playing'
        )}
      </div>
    `;
  }

  if (preview.type === 'artist-collage') {
    const artistPreview = getArtistPreviewData();
    return `
      <div class="main-menu-preview-fill">
        <div class="main-menu-preview-collage main-menu-preview-collage--fill">
          ${artistPreview.covers.map(src => `<img src="${src}" alt="Artist Album Cover">`).join('')}
        </div>
        ${overlay('Artists', artistPreview.artist)}
      </div>
    `;
  }

  if (preview.type === 'album-random') {
    return `
      <div class="main-menu-preview-fill">
        <img src="${getRandomLoadedAlbumCover()}" class="main-menu-preview-image main-menu-preview-image--fill" alt="Albums">
        ${overlay('Albums', `${albumCount} loaded`)}
      </div>
    `;
  }

  if (preview.type === 'icon-count') {
    return `
      <div class="main-menu-preview-fill">
        <div class="main-menu-preview-glyph main-menu-preview-glyph--fill main-menu-preview-glyph--${preview.theme}">
          <i class="${preview.icon}"></i>
        </div>
        ${overlay(
          preview.title,
          '',
          `<div class="main-menu-preview-count">${trackCount}</div>`
        )}
      </div>
    `;
  }

  return `
    <div class="main-menu-preview-fill">
      <div class="main-menu-preview-glyph main-menu-preview-glyph--fill main-menu-preview-glyph--${preview.theme || 'default'}">
        <i class="${preview.icon || 'fa-solid fa-circle'}"></i>
        ${preview.accentIcon ? `<span class="main-menu-preview-accent"><i class="${preview.accentIcon}"></i></span>` : ''}
      </div>
      ${overlay(preview.title || item.label, preview.subtitle || '')}
    </div>
  `;
}

function updateMainMenuHighlight(menuItems) {
  const list = document.getElementById('menuList');
  if (!list) return;

  const idx = app.state.currentMenuIndex;

  setActiveIndexedItem(list, 'li', idx, { scrollIntoView: true });

  const preview = document.getElementById('mainMenuPreview');
  if (preview) {
    preview.innerHTML = getMainMenuPreviewHtml(menuItems[idx] || menuItems[0]);
  }
}

function openMainMenuItem(item) {
  if (item.action === renderAlbumsMenu) {
    goTo(renderAlbumsMenu, 0);
    return;
  }

  goTo(item.action);
}

function renderMainMenu(direction = 'forward') {
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();

  const hotBar = document.getElementById('hotBar');
  if (hotBar && hotBar.style.display === 'none') {
    hotBar.style.display = '';
  }

  app.state.currentMenuIndex = 0;

  const menuItems = getMainMenuItems();

  const { reused } = renderScreen(() => `
    <div class="classic-main-menu">
      <div class="classic-main-list">
        <ul class="menu-list" id="menuList">
          ${menuItems.map((item, idx) => `
            <li data-idx="${idx}">
              <span class="main-menu-label">${item.label}</span>
              <span class="main-menu-arrow"><i class="fa-solid fa-chevron-right"></i></span>
            </li>
          `).join('')}
        </ul>
      </div>
      <div class="classic-main-preview" id="mainMenuPreview"></div>
    </div>
  `, direction, { screenKey: 'main-menu', reuseCached: true });

  const list = document.getElementById('menuList');
  if (!list) return;
  list.dataset.itemCount = String(menuItems.length);

  if (!reused || !list.dataset.boundClick) {
    list.onclick = (event) => {
      const row = event.target.closest('li[data-idx]');
      if (!row || !list.contains(row)) return;

      const idx = Number(row.dataset.idx || 0);
      const item = menuItems[idx];
      app.state.currentMenuIndex = idx;
      updateMainMenuHighlight(menuItems);
      openMainMenuItem(item);
    };
    list.dataset.boundClick = 'true';
  }

  window.updateHighlightedSong = () => updateMainMenuHighlight(menuItems);

  updateMainMenuHighlight(menuItems);
  updateHotBarTime();
}