// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

function updateLoadingCounter(loaded, total) {
  const counter = document.getElementById('loadingCounter');
  if (counter) counter.textContent = `Loaded ${loaded} of ${total} songs`;
}

function migrateHabitsToStableIds(tracks = []) {
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  let moved = 0;

  tracks.forEach(track => {
    const newId = getTrackId(track);
    if (habits[newId]) return;

    const legacyId = `${(track.title || track.fileName || 'unknown_title')}|${(track.artist || 'unknown_artist')}|${(track.album || 'unknown_album')}`.toLowerCase();
    if (habits[legacyId]) {
      habits[newId] = habits[legacyId];
      delete habits[legacyId];
      moved++;
    }
  });

  if (moved > 0) {
    localStorage.setItem('userHabits', JSON.stringify(habits));
    if (typeof userHabits !== 'undefined') userHabits = habits; // refresh in-memory cache
    console.log(`Migrated ${moved} habit entries to stable IDs`);
  }
}

function handleFiles(e) {
  console.log("Handling files:", e.target.files);

  // Reset all global state
  app.state.tracks = [];
  app.state.albums = {};
  app.state.currentTrack = null;
  app.state.currentAlbumSongs = [];
  app.state.currentSongIndex = -1;

  currentAlbumSongs = app.state.currentAlbumSongs;
  currentSongIndex = app.state.currentSongIndex;

  app.state.albumCoverURLs.forEach(url => URL.revokeObjectURL(url));
  app.state.albumCoverURLs = [];

  // Check for tracks-meta.json first
  const files = Array.from(e.target.files);
  const metaFile = files.find(f => f.name === 'tracks-meta.json');
  const audioFiles = files.filter(f => f.name.match(/\.(mp3|flac)$/i));
  const imageFiles = files.filter(f => f.name.match(/\.(jpg|jpeg)$/i));
  const cueFiles = files.filter(f => f.name.match(/\.cue$/i));
  
  window.imageFiles = window.imageFiles ? window.imageFiles.concat(imageFiles) : imageFiles;

  // NEW: build folder -> cover URL map
  const folderCovers = {};
  imageFiles.forEach(imgFile => {
    const folder = getFolderPath(imgFile);
    if (!folderCovers[folder]) {
      const url = URL.createObjectURL(imgFile);
      app.state.albumCoverURLs.push(url);
      folderCovers[folder] = url;
    }
  });

  if (metaFile) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const meta = JSON.parse(ev.target.result);

      app.state.tracks = [];
      const stateTracks = app.state.tracks;

      const total = meta.tracks.length || 0;
      let loaded = 0;

      meta.tracks.forEach(metaTrack => {
        const file = audioFiles.find(f => f.name === metaTrack.fileName);
        if (file) {
          stateTracks.push({ ...metaTrack, file });
        }
        loaded++;
        updateLoadingCounter(loaded, total);
      });

      if (stateTracks.length === 0) {
        alert("No matching audio files found for metadata. Please upload your music files along with tracks-meta.json.");
        renderMainMenu('forward');
        app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
        return;
      }

      // Build albums (no nav here)
      groupTracksByAlbum(true, folderCovers);
      migrateHabitsToStableIds(app.state.tracks);

      renderMainMenu('forward');
      app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
    };
    reader.readAsText(metaFile);
    return;
  }
  
  // Show loading screen
  goTo(goToLoadingScreen);

  console.log("Audio files:", audioFiles);
  console.log("Cue files:", cueFiles);
  console.log("Image files:", imageFiles);

  let processed = 0;

  // Helper to parse CUE files
  function parseCue(text, flacFile) {
    console.log("Parsing CUE file:", flacFile ? flacFile.name : "No FLAC");
    const albumMatch = text.match(/^\s*TITLE\s+"([^"]+)"/m);
    const album = albumMatch ? albumMatch[1] : 'Unidentified Album';
    const artistMatch = text.match(/^\s*PERFORMER\s+"([^"]+)"/m);
    const artist = artistMatch ? artistMatch[1] : 'Unknown Artist';
    const trackRegex = /TRACK\s+\d+\s+AUDIO([\s\S]*?)(?=TRACK|\Z)/g;
    let match;
    let cueTracks = [];
    while ((match = trackRegex.exec(text))) {
      const trackBlock = match[1];
      const titleMatch = trackBlock.match(/TITLE\s+"([^"]+)"/);
      const performerMatch = trackBlock.match(/PERFORMER\s+"([^"]+)"/);
      cueTracks.push({
        file: flacFile,
        title: titleMatch ? titleMatch[1] : flacFile ? flacFile.name : 'Unknown Track',
        artist: performerMatch ? performerMatch[1] : artist,
        album
      });
    }
    console.log("Parsed cue tracks:", cueTracks);
    return cueTracks;
  }

  // Process CUE files first
  let cueTracks = [];
  if (cueFiles.length && audioFiles.length) {
    cueFiles.forEach(cueFile => {
      const reader = new FileReader();
      reader.onload = function(ev) {
        const cueText = ev.target.result;
        const fileMatch = cueText.match(/FILE\s+"([^"]+\.flac)"/i);
        let flacFile = null;
        if (fileMatch) {
          flacFile = audioFiles.find(f => f.name === fileMatch[1]);
        }
        if (flacFile) {
          cueTracks = cueTracks.concat(parseCue(cueText, flacFile));
        }
        if (++processed === cueFiles.length) {
          processAudioFiles();
        }
      };
      reader.readAsText(cueFile);
    });
  } else {
    processAudioFiles();
  }

  // Now process audio files
  function processAudioFiles() {
    console.log("Processing audio files...");
    let total = audioFiles.length;
    let done = 0;
    const stateTracks = app.state.tracks;

    if (total === 0) {
      console.log("No audio files, only cue tracks:", cueTracks);
      cueTracks.forEach(ct => {
        if (!stateTracks.some(t =>
          t.file.name === ct.file.name &&
          t.file.size === ct.file.size
        )) {
          stateTracks.push(ct);
        }
      });
      groupTracksByAlbum(false, folderCovers);
      return;
    }

    audioFiles.forEach(file => {
      window.jsmediatags.read(file, {
        onSuccess: tag => {
          const { title, artist, album, genre } = tag.tags;
          console.log("Read tags for:", file.name, tag.tags);
          if (!stateTracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            stateTracks.push({
              file,
              title: title || file.name.replace(/\.(mp3|flac)$/i, ''),
              artist: artist || 'Unknown Artist',
              album: album || 'Unidentified Album',
              genre: genre || 'Unknown Genre'
            });
          }
          done++;
          updateLoadingCounter(done, total);
          if (done === total) {
            cueTracks.forEach(ct => {
              if (!stateTracks.some(t =>
                t.file.name === ct.file.name &&
                t.file.size === ct.file.size
              )) {
                stateTracks.push(ct);
              }
            });
            groupTracksByAlbum(false, folderCovers);
            migrateHabitsToStableIds(app.state.tracks);
          }
        },
        onError: () => {
          console.log("Error reading tags for:", file.name);
          if (!stateTracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            stateTracks.push({
              file,
              title: file.name.replace(/\.(mp3|flac)$/i, ''),
              artist: 'Unknown Artist',
              album: 'Unidentified Album'
            });
          }
          done++;
          updateLoadingCounter(done, total);
          if (done === total) {
            cueTracks.forEach(ct => {
              if (!stateTracks.some(t =>
                t.file.name === ct.file.name &&
                t.file.size === ct.file.size
              )) {
                stateTracks.push(ct);
              }
            });
            groupTracksByAlbum(false, folderCovers);
          }
        }
      });
    });
  }
}

function getFolderPath(file) {
  if (!file.webkitRelativePath) return '';
  const parts = file.webkitRelativePath.split('/');
  parts.pop(); 
  const folder = parts.join('/');
  console.log("Got folder path for file:", file.name, folder);
  return folder;
}

function groupTracksByAlbum(skipPrompt = false, folderCovers = {}) {
  console.log("Grouping tracks by album...");

  const allTracks = app.state.tracks;

  app.state.albums = {};
  const allAlbums = app.state.albums;

  allTracks.forEach(track => {
    const albumName = track.album || 'Unknown Album';
    if (!allAlbums[albumName]) {
      const trackFolder = track.file ? getFolderPath(track.file) : '';
      const coverUrl = folderCovers[trackFolder] || track.cover || 'src/img/default-cover.png';

      allAlbums[albumName] = {
        name: albumName,
        artist: track.artist || 'Unknown Artist',
        cover: coverUrl,
        songs: []
      };
    }
    allAlbums[albumName].songs.push(track);
  });

  console.log("Albums grouped:", allAlbums);

  if (!skipPrompt) {
    goTo(renderSaveMetadataPrompt);
  }
}

function exportMetadata() {
  const allTracks = app.state.tracks;
  const data = {
    tracks: allTracks.map(t => ({
      fileName: t.file?.name,
      title: t.title,
      artist: t.artist,
      album: t.album,
      trackNumber: t.trackNumber,
      duration: t.duration
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'tracks-meta.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}