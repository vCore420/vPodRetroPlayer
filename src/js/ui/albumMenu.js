// --- ALBUMS MENU ---

function renderAlbumsMenu(direction = 'forward', selectedIdx = 0) {
  const albumKeys = app.state.derivedData.sortedAlbumKeys || [];

  if (albumKeys.length === 0) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">No music loaded</div>
        <div style="font-size:1em;color:#444;text-align:center;">
          Please load your music to browse albums.
        </div>
      </div>`,
      direction
    );
    return;
  }

  app.state.currentMenuIndex = selectedIdx;

  renderAlbumCarousel({
    albumsList: albumKeys,
    onAlbumClick: (albumKey, idx) => {
      app.state.currentMenuIndex = idx;
      goTo(renderAlbumSongsMenu, albumKey, idx);
    },
    selectedIdx: app.state.currentMenuIndex
  }, direction);
}

function renderAlbumSongsMenu(direction = 'forward', albumKey, albumIdx = 0, artist = null) {
  const allAlbums = app.state.albums;
  const albumObj = allAlbums[albumKey];
  app.state.currentMenuIndex = 0;

  renderSongList({
    songs: albumObj.songs,
    albumCover: albumObj.cover,
    onSongClick: (track, idx) => {
      app.state.currentMenuIndex = idx;
      player.playTrackFromAlbum(track, albumObj.songs, { queueSignature: `album:${albumKey}` });
    },
    showBack: true,
    onBack: () => {
      if (artist) {
        goTo(renderArtistAlbumsMenu, 'back', artist, albumIdx);
      } else {
        goTo(renderAlbumsMenu, 'back', albumIdx);
      }
    }
  }, direction);

  masterHighlight({
    containerSelector: '#songsList',
    itemsSelector: '.menu-list-song',
    tracks: albumObj.songs,
    albumArtSelector: '.album-list-right img.album-cover'
  });
}

// -- Album Carousel --

let pendingCarouselFrame = null;
let pendingCarouselIdx = 0;
let pendingCarouselKeys = [];

function queueCarouselAlbum(idx, albumKeys) {
  pendingCarouselIdx = idx;
  pendingCarouselKeys = albumKeys;

  if (pendingCarouselFrame) return;

  pendingCarouselFrame = requestAnimationFrame(() => {
    pendingCarouselFrame = null;
    setCarouselAlbum(pendingCarouselIdx, pendingCarouselKeys);
    if (typeof preloadCarouselCovers === 'function') {
      preloadCarouselCovers(pendingCarouselKeys, pendingCarouselIdx);
    }
  });
}

function setCarouselAlbum(idx, albumKeys) {
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  if (!carousel || !title) return;

  const visibleRange = 5;

  Array.from(carousel.children).forEach((el, i) => {
    const offset = i - idx;

    el.classList.remove(
      'carousel-album-center',
      'carousel-album-left',
      'carousel-album-right'
    );

    if (!el.classList.contains('carousel-album')) {
      el.classList.add('carousel-album');
    }

    el.style.zIndex = '';
    el.style.opacity = '';
    el.style.filter = '';
    el.style.transform = '';
    el.style.visibility = '';
    el.style.pointerEvents = '';

    if (offset === 0) {
      el.classList.add('carousel-album-center');
      el.style.transform = 'translate(-50%, -50%) scale(1.25) rotateY(0deg)';
      el.style.zIndex = 10;
      el.style.opacity = 1;
      el.style.filter = 'brightness(1)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else if (offset < 0 && Math.abs(offset) <= visibleRange) {
      const distance = Math.abs(offset);
      const spacing = 80 * distance;
      el.classList.add('carousel-album-left');
      el.style.transform = `translate(calc(-50% - ${spacing}px), -50%) scale(${1 - 0.1 * distance}) rotateY(55deg)`;
      el.style.zIndex = 5 - distance;
      el.style.opacity = 0.7 - 0.1 * distance;
      el.style.filter = 'brightness(0.85)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else if (offset > 0 && Math.abs(offset) <= visibleRange) {
      const distance = Math.abs(offset);
      const spacing = 80 * distance;
      el.classList.add('carousel-album-right');
      el.style.transform = `translate(calc(-50% + ${spacing}px), -50%) scale(${1 - 0.1 * distance}) rotateY(-55deg)`;
      el.style.zIndex = 5 - distance;
      el.style.opacity = 0.7 - 0.1 * distance;
      el.style.filter = 'brightness(0.85)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = 0;
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.style.transform = 'translate(-50%, -50%) scale(0.7)';
      el.style.filter = 'brightness(0.85)';
    }
  });

  const albumObj = app.state.albums[albumKeys[idx]] || {};
  title.textContent = albumObj.title || '';
  carousel.dataset.activeIndex = String(idx);
}