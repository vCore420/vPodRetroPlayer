// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

function updateLoadingCounter(loaded, total) {
  const counter = document.getElementById('loadingCounter');
  if (counter) counter.textContent = `Loaded ${loaded} of ${total} songs`;
}

function migrateHabitsToStableIds(tracks = []) {
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  if (!tracks.length || !Object.keys(habits).length) return;

  // Build lookup maps for robust matching
  const norm = (s) => (s || '').toString().trim().toLowerCase();
  const stripExt = (s) => norm(s).replace(/\.(mp3|flac)$/i, '');

  const byTriple = new Map();      // title|artist|album (normalized, ext stripped)
  const byFileTriple = new Map();  // fileName|artist|album (normalized, ext stripped)
  const byFileOnly = new Map();    // fileName (normalized, ext stripped) when unique

  tracks.forEach(t => {
    const titleK = stripExt(t.title || t.fileName || '');
    const artistK = norm(t.artist || 'unknown_artist');
    const albumK = norm(t.album || 'unknown_album');
    const fileK = stripExt((t.file && t.file.name) || t.fileName || '');

    const tripleKey = `${titleK}|${artistK}|${albumK}`;
    const fileTripleKey = `${fileK}|${artistK}|${albumK}`;

    if (!byTriple.has(tripleKey)) byTriple.set(tripleKey, t);
    if (fileK && !byFileTriple.has(fileTripleKey)) byFileTriple.set(fileTripleKey, t);

    if (fileK) {
      if (!byFileOnly.has(fileK)) {
        byFileOnly.set(fileK, t);
      } else {
        // not unique, mark as ambiguous
        byFileOnly.set(fileK, null);
      }
    }
  });

  let moved = 0;
  let skipped = 0;

  Object.keys(habits).forEach(oldId => {
    // If already a new stable ID that matches a loaded track, keep it
    const existingTrack = tracks.find(t => getTrackId(t) === oldId);
    if (existingTrack) return;

    const parts = oldId.split('|');
    const titlePart = stripExt(parts[0] || '');
    const artistPart = norm(parts[1] || '');
    const albumPart = norm(parts[2] || '');

    let target = null;

    // 1) exact title/artist/album match (normalized)
    const tripleKey = `${titlePart}|${artistPart}|${albumPart}`;
    if (byTriple.has(tripleKey)) {
      target = byTriple.get(tripleKey);
    }

    // 2) fileName/artist/album match
    if (!target) {
      const fileTripleKey = `${titlePart}|${artistPart}|${albumPart}`;
      if (byFileTriple.has(fileTripleKey)) {
        target = byFileTriple.get(fileTripleKey);
      }
    }

    // 3) unique filename-only match
    if (!target && byFileOnly.has(titlePart) && byFileOnly.get(titlePart)) {
      target = byFileOnly.get(titlePart);
    }

    if (target) {
      const newId = getTrackId(target);
      if (!habits[newId]) {
        habits[newId] = habits[oldId];
        moved++;
      } else {
        // merge counts if both exist
        const hOld = habits[oldId];
        const hNew = habits[newId];
        hNew.plays = (hNew.plays || 0) + (hOld.plays || 0);
        hNew.skips = (hNew.skips || 0) + (hOld.skips || 0);
        hNew.likeCount = (hNew.likeCount || 0) + (hOld.likeCount || 0);
        hNew.dislikeCount = (hNew.dislikeCount || 0) + (hOld.dislikeCount || 0);
        hNew.weeklyLikes = (hNew.weeklyLikes || 0) + (hOld.weeklyLikes || 0);
        hNew.weeklyDislikes = (hNew.weeklyDislikes || 0) + (hOld.weeklyDislikes || 0);
        if (hOld.lastLiked) {
          hNew.lastLiked = Math.max(hNew.lastLiked || 0, hOld.lastLiked);
        }
        moved++;
      }
      delete habits[oldId];
    } else {
      skipped++;
    }
  });

  localStorage.setItem('userHabits', JSON.stringify(habits));
  if (typeof userHabits !== 'undefined') userHabits = habits; // refresh in-memory

  if (moved > 0) {
    console.log(`Migrated ${moved} habit entries to stable IDs${skipped ? `; ${skipped} skipped` : ''}`);
  } else {
    console.log('No habit entries migrated; none matched loaded tracks.');
  }
}

function parseTrackNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
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
  function parseCue(text, audioFiles, fallbackFile = null) {
    console.log("Parsing CUE file:", fallbackFile ? fallbackFile.name : "No FLAC fallback");

    const albumMatch = text.match(/^\s*TITLE\s+"([^"]+)"/m);
    const albumTitle = albumMatch ? albumMatch[1] : 'Unidentified Album';

    const performerMatch = text.match(/^\s*PERFORMER\s+"([^"]+)"/m);
    const albumArtist = performerMatch ? performerMatch[1] : 'Unknown Artist';

    const genreMatch = text.match(/REM\s+GENRE\s+"?([^"\r\n]+)"?/i);
    const dateMatch = text.match(/REM\s+DATE\s+"?([^"\r\n]+)"?/i);
    const genre = genreMatch ? genreMatch[1] : undefined;
    const year = dateMatch ? dateMatch[1] : undefined;

    const fileBlocks = [...text.matchAll(/FILE\s+"([^"]+)"\s+\w+\s+([\s\S]*?)(?=FILE\s+"|$)/gi)];
    const cueTracks = [];

    fileBlocks.forEach(([, fileName, block]) => {
      const file = (audioFiles || []).find(f => f.name === fileName) || fallbackFile || null;

      const trackBlocks = [...block.matchAll(/TRACK\s+(\d+)\s+AUDIO([\s\S]*?)(?=TRACK\s+\d+\s+AUDIO|$)/gi)];
      trackBlocks.forEach(([, numStr, tBlock]) => {
        const tn = parseInt(numStr, 10);
        const titleMatch = tBlock.match(/TITLE\s+"([^"]+)"/i);
        const performerTrack = tBlock.match(/PERFORMER\s+"([^"]+)"/i);

        cueTracks.push({
          file,
          title: titleMatch ? titleMatch[1] : (file ? file.name : 'Unknown Track'),
          artist: performerTrack ? performerTrack[1] : albumArtist,
          album: albumTitle,
          trackNumber: Number.isFinite(tn) ? tn : cueTracks.length + 1,
          ...(genre ? { genre } : {}),
          ...(year ? { year } : {})
        });
      });
    });

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
          cueTracks = cueTracks.concat(parseCue(cueText, audioFiles, flacFile));
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

  // Process audio files
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
          const { title, artist, album, genre, track } = tag.tags;
          const trackNumber = parseTrackNumber(track);
          console.log("Read tags for:", file.name, tag.tags);
          if (!stateTracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            stateTracks.push({
              file,
              title: title || file.name.replace(/\.(mp3|flac)$/i, ''),
              artist: artist || 'Unknown Artist',
              album: album || 'Unidentified Album',
              genre: genre || 'Unknown Genre',
              trackNumber
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

function makeAlbumKey(track) {
  const artist = (track.artist || 'Unknown Artist').trim().toLowerCase();
  const album  = (track.album  || 'Unknown Album').trim().toLowerCase();
  return `${artist}|${album}`;
}

function groupTracksByAlbum(skipPrompt = false, folderCovers = {}) {
  console.log("Grouping tracks by album...");

  const allTracks = app.state.tracks;

  app.state.albums = {};
  const allAlbums = app.state.albums;

  allTracks.forEach(track => {
    const albumTitle  = track.album || 'Unknown Album';
    const albumArtist = track.artist || 'Unknown Artist';
    const albumKey    = makeAlbumKey(track);
    track.albumKey    = albumKey; // store on track for lookups

    if (!allAlbums[albumKey]) {
      const trackFolder = track.file ? getFolderPath(track.file) : '';
      const coverUrl = folderCovers[trackFolder] || track.cover || 'src/img/default-cover.png';

      allAlbums[albumKey] = {
        key: albumKey,
        title: albumTitle,
        artist: albumArtist,
        cover: coverUrl,
        songs: []
      };
    }
    allAlbums[albumKey].songs.push(track);
  });

  Object.values(allAlbums).forEach(album => {
    album.songs.sort((a, b) => {
      const ta = Number.isFinite(a.trackNumber) ? a.trackNumber : null;
      const tb = Number.isFinite(b.trackNumber) ? b.trackNumber : null;
      if (ta != null && tb != null && ta !== tb) return ta - tb;
      if (ta != null && tb == null) return -1;
      if (ta == null && tb != null) return 1;
      return (a.title || '').localeCompare(b.title || '');
    });
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