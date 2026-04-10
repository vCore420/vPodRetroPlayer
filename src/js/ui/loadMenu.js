// --- LOAD MUSIC ---

function renderLoadMusic(direction = 'forward') {
  app.state.currentMenuIndex = 0;

  const canChooseFolder = (() => {
    const input = document.createElement('input');
    return 'webkitdirectory' in input || 'directory' in input;
  })();

  const loadActions = canChooseFolder
    ? `
        <li data-idx="0">Choose Folder</li>
        <li data-idx="1">Choose Files</li>
      `
    : `
        <li data-idx="0">Choose Files</li>
      `;

  const loadCopy = canChooseFolder
    ? 'Import a full music folder with nested artist, album and disc subfolders. If folder access is blocked on your device, use Choose Files instead.'
    : 'Choose your music files directly. Folder import is not available on this device, but songs, JSON metadata, CUE files and artwork can still be loaded.';

  const { root } = renderScreen(`
    <div class="ipod-utility-screen load-music-screen load-music-screen--import">
      <input type="file" id="folderInput" accept=".mp3,.flac,.cue,.json,.jpg,.jpeg,audio/*,application/json,image/jpeg" multiple webkitdirectory directory style="display:none;">
      <input type="file" id="filesInput" accept=".mp3,.flac,.cue,.json,.jpg,.jpeg,audio/*,application/json,image/jpeg" multiple style="display:none;">

      <div class="ipod-utility-header">
        <div class="ipod-utility-kicker">Music</div>
        <div class="ipod-utility-title">Load Music</div>
      </div>

      <div class="ipod-utility-body">
        <div class="ipod-utility-glyph">
          <i class="fa-solid fa-compact-disc"></i>
        </div>

        <div class="ipod-utility-copy">
          ${loadCopy}
        </div>

        <ul class="menu-list load-music-actions" id="loadMusicActions">
          ${loadActions}
        </ul>
      </div>
    </div>
  `, direction);

  const folderInput = root.querySelector('#folderInput');
  const filesInput = root.querySelector('#filesInput');
  const actions = root.querySelector('#loadMusicActions');
  const rows = Array.from(actions?.querySelectorAll('li[data-idx]') || []);

  if (actions) {
    actions.dataset.itemCount = String(rows.length);
  }

  const openPicker = (input) => {
    if (!input) return;
    input.value = '';
    input.click();
  };

  rows.forEach((row, idx) => {
    row.classList.toggle('active', idx === app.state.currentMenuIndex);
    row.onclick = () => {
      if (canChooseFolder && idx === 0) {
        openPicker(folderInput);
        return;
      }
      openPicker(filesInput);
    };
  });

  if (folderInput) folderInput.onchange = handleFiles;
  if (filesInput) filesInput.onchange = handleFiles;
  window.updateHighlightedSong = () => {
    rows.forEach((row, idx) => row.classList.toggle('active', idx === app.state.currentMenuIndex));
  };
}

function goToLoadingScreen(direction = 'forward') {
  renderLoadingScreen("Loading your music...", 0, 0);
}

function renderLoadingScreen(message = "Loading your music...", loaded = 0, total = 0) {
  renderScreen(`
    <div class="ipod-utility-screen load-music-screen load-music-screen--loading">
      <div class="ipod-utility-header">
        <div class="ipod-utility-kicker">Music</div>
        <div class="ipod-utility-title">Loading Library</div>
      </div>

      <div class="ipod-utility-body">
        <div class="ipod-utility-glyph ipod-utility-glyph--loading" aria-hidden="true">
          <span class="load-music-spinner"></span>
        </div>

        <div class="ipod-utility-copy load-music-status-copy">
          ${message}
        </div>

        <div class="load-music-status-card">
          <div id="loadingCounter" class="load-music-counter">
            ${total > 0 ? `Loaded ${loaded} of ${total} songs` : 'Preparing your library...'}
          </div>
          <div class="load-music-status-note">Please wait while your songs, folders and artwork are indexed.</div>
        </div>
      </div>
    </div>
  `, 'forward');
}

function renderSaveMetadataPrompt() {
  app.state.currentMenuIndex = 0;

  const { root } = renderScreen(`
    <div class="ipod-utility-screen load-music-screen load-music-screen--meta">
      <div class="ipod-utility-header">
        <div class="ipod-utility-kicker">Import Complete</div>
        <div class="ipod-utility-title">Save Metadata?</div>
      </div>

      <div class="ipod-utility-body">
        <div class="ipod-utility-glyph ipod-utility-glyph--success">
          <i class="fa-solid fa-file-arrow-down"></i>
        </div>

        <div class="ipod-utility-copy">
          Save tracks-meta.json for faster loading next time.
          Keep it in the same root music folder.
        </div>

        <ul class="menu-list load-music-actions" id="loadMusicActions">
          <li data-idx="0">Save Metadata</li>
          <li data-idx="1">Skip for Now</li>
        </ul>
      </div>
    </div>
  `, 'forward');

  const actions = root.querySelector('#loadMusicActions');
  const rows = Array.from(actions?.querySelectorAll('li') || []);

  if (rows.length < 2) return;

  actions.dataset.itemCount = String(rows.length);

  rows[0].onclick = () => {
    exportMetadata();
    renderMainMenu('forward');
    app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  };

  rows[1].onclick = () => {
    renderMainMenu('forward');
    app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  };

  rows.forEach((row, idx) => row.classList.toggle('active', idx === app.state.currentMenuIndex));
  window.updateHighlightedSong = () => {
    rows.forEach((row, idx) => row.classList.toggle('active', idx === app.state.currentMenuIndex));
  };
}