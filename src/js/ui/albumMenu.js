// --- ALBUMS MENU ---

function renderAlbumsMenu(direction = 'forward', selectedIdx = 0) {
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b));
  if (albumNames.length === 0) {
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
  currentMenuIndex = selectedIdx;
  renderAlbumCarousel({
    albumsList: albumNames,
    onAlbumClick: (album, idx) => { currentMenuIndex = idx; goTo(renderAlbumSongsMenu, album, idx); },
    selectedIdx: currentMenuIndex
  }, direction);
}

function renderAlbumSongsMenu(direction = 'forward', album, albumIdx = 0, artist = null) {
  const albumObj = albums[album];
  currentMenuIndex = 0; // Ensure first song is highlighted
  renderSongList({
    songs: albumObj.songs,
    albumCover: albumObj.cover, 
    onSongClick: (track, idx) => { currentMenuIndex = idx; playTrackFromAlbum(track, albumObj.songs); },
    showBack: true,
    onBack: () => {
      if (artist) {
        goTo(renderArtistAlbumsMenu, 'back', artist, albumIdx);
      } else {
        goTo(renderAlbumsMenu, 'back', albumIdx);
      }
    }
  }, direction);

  // Highlight first song
  masterHighlight({
    containerSelector: '#songsList',
    itemsSelector: '.menu-list-song',
    tracks: albumObj.songs,
    albumArtSelector: '.album-list-right img.album-cover'
  });
}

// -- Album Carousel --

function setCarouselAlbum(idx, albumNames) {
  const carousel = document.getElementById('albumCarousel');
  const title = document.getElementById('albumTitle');
  const visibleRange = 5; // Show center ± 5 albums

  Array.from(carousel.children).forEach((el, i) => {
    const offset = i - idx;
    el.className = 'carousel-album';
    el.style.zIndex = '';
    el.style.opacity = '';
    el.style.filter = '';
    el.style.transform = '';

    if (offset === 0) {
      el.classList.add('carousel-album-center');
      el.style.transform = `translate(-50%, -50%) scale(1.25) rotateY(0deg)`;
      el.style.zIndex = 10;
      el.style.opacity = 1;
      el.style.filter = 'brightness(1) blur(0px)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else if (offset < 0 && Math.abs(offset) <= visibleRange) {
      el.classList.add('carousel-album-left');
      const spacing = 80 * Math.abs(offset);
      el.style.transform = `translate(calc(-50% - ${spacing}px), -50%) scale(${1 - 0.1 * Math.abs(offset)}) rotateY(55deg)`;
      el.style.zIndex = 5 - Math.abs(offset);
      el.style.opacity = 0.7 - 0.1 * Math.abs(offset);
      el.style.filter = 'brightness(0.85) blur(0.5px)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else if (offset > 0 && Math.abs(offset) <= visibleRange) {
      el.classList.add('carousel-album-right');
      const spacing = 80 * Math.abs(offset);
      el.style.transform = `translate(calc(-50% + ${spacing}px), -50%) scale(${1 - 0.1 * Math.abs(offset)}) rotateY(-55deg)`;
      el.style.zIndex = 5 - Math.abs(offset);
      el.style.opacity = 0.7 - 0.1 * Math.abs(offset);
      el.style.filter = 'brightness(0.85) blur(0.5px)';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    } else {
      // Hide albums outside the visible range
      el.style.opacity = 0;
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.style.transform = 'translate(-50%, -50%) scale(0.7) rotateY(0deg)';
    }
  });
  title.textContent = albumNames[idx] || '';
}