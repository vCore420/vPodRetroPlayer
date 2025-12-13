// --- LOAD MUSIC ---

function renderLoadMusic(direction = 'forward') {
  renderScreen(
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <input type="file" id="fileInput" accept=".mp3,.flac,.cue" multiple webkitdirectory directory style="display:none;">
      <button id="loadMusicBtn" class="load-music-btn">
        <span class="btn-icon">
          <i class="fa-solid fa-music"></i>
        </span>
        <span class="btn-text">Load Music</span>
      </button>
    </div>
  `, direction);

  const fileInput = document.getElementById('fileInput');
  document.getElementById('loadMusicBtn').onclick = () => fileInput.click();
  fileInput.onchange = handleFiles;
}

function goToLoadingScreen(direction = 'forward') {
  renderLoadingScreen("Loading your music...", 0, 0);
}

function renderLoadingScreen(message = "Loading your music...", loaded = 0, total = 0) {
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div class="loader" style="margin-bottom:18px;">
        <div style="width:48px;height:48px;border:5px solid #e0eaff;border-top:5px solid #0074d9;border-radius:50%;animation:spin 1s linear infinite;"></div>
      </div>
      <div style="font-size:1.15em;color:#0074d9;font-weight:bold;margin-bottom:8px;">${message}</div>
      <div id="loadingCounter" style="font-size:1em;color:#555;margin-bottom:4px;">
        ${total > 0 ? `Loaded ${loaded} of ${total} songs` : ''}
      </div>
      <div style="font-size:0.95em;color:#555;">Please wait while your music is loaded.</div>
    </div>
  `, 'forward');
}

function renderSaveMetadataPrompt() {
  renderScreen(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div style="font-size:1.1em;color:#0074d9;font-weight:bold;margin-bottom:12px;">Music loaded!</div>
      <div style="font-size:1em;color:#444;text-align:center;margin-bottom:16px;">
        Save your music metadata for faster loading next time.<br>
        <span style="color:#0074d9;">Please save <b>tracks-meta.json</b> in your music folder.</span>
      </div>
      <button id="saveMetaBtn" style="margin-bottom:10px;padding:10px 28px;border-radius:8px;border:none;background:#0074d9;color:#fff;font-size:1em;">Save Metadata</button>
      <button id="skipMetaBtn" style="padding:10px 28px;border-radius:8px;border:none;background:#eee;color:#444;font-size:1em;">Skip</button>
    </div>
  `, 'forward');

  document.getElementById('saveMetaBtn').onclick = () => {
    exportMetadata();
    renderMainMenu('forward');
    app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  };
  document.getElementById('skipMetaBtn').onclick = () => {
    renderMainMenu('forward');
    app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
  };
}