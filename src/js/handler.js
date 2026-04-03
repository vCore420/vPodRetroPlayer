// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

function updateLoadingCounter(loaded, total) {
  const counter = document.getElementById('loadingCounter');
  if (counter) counter.textContent = `Loaded ${loaded} of ${total} songs`;
}

function migrateHabitsToStableIds(tracks = []) {
  let habits;
  try {
    habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  } catch (error) {
    console.warn('Failed to parse userHabits during migration', error);
    habits = {};
  }

  if (!tracks.length || !Object.keys(habits).length) return;

  const norm = (s) => (s || '').toString().trim().toLowerCase();
  const stripExt = (s) => norm(s).replace(/\.(mp3|flac)$/i, '');

  const normalizeHabit = (habit = {}) => {
    if (typeof syncHabitShape === 'function') {
      return syncHabitShape(habit);
    }

    return {
      lifetimePlays: Number(habit.lifetimePlays ?? 0),
      lifetimeSkips: Number(habit.lifetimeSkips ?? 0),
      likeCount: Number(habit.likeCount ?? habit.lifetimeLikes ?? 0),
      dislikeCount: Number(habit.dislikeCount ?? habit.lifetimeDislikes ?? 0),

      weeklyPlays: Number(habit.weeklyPlays ?? habit.plays ?? 0),
      weeklySkips: Number(habit.weeklySkips ?? habit.skips ?? 0),
      weeklyLikes: Number(habit.weeklyLikes ?? 0),
      weeklyDislikes: Number(habit.weeklyDislikes ?? 0),

      likedThisWeek: Boolean(habit.likedThisWeek ?? habit.liked ?? false),
      dislikedThisWeek: Boolean(habit.dislikedThisWeek ?? habit.disliked ?? false),

      lastPlayedAt: Number(habit.lastPlayedAt ?? habit.lastPlayed ?? 0),
      lastLikedAt: Number(habit.lastLikedAt ?? habit.lastLiked ?? 0),
      lastDislikedAt: Number(habit.lastDislikedAt ?? habit.lastDisliked ?? 0),

      plays: Number(habit.weeklyPlays ?? habit.plays ?? 0),
      skips: Number(habit.weeklySkips ?? habit.skips ?? 0),
      liked: Boolean(habit.likedThisWeek ?? habit.liked ?? false),
      disliked: Boolean(habit.dislikedThisWeek ?? habit.disliked ?? false),
      lastPlayed: Number(habit.lastPlayedAt ?? habit.lastPlayed ?? 0),
      lastLiked: Number(habit.lastLikedAt ?? habit.lastLiked ?? 0),
      lastDisliked: Number(habit.lastDislikedAt ?? habit.lastDisliked ?? 0),
      lifetimeLikes: Number(habit.likeCount ?? habit.lifetimeLikes ?? 0),
      lifetimeDislikes: Number(habit.dislikeCount ?? habit.lifetimeDislikes ?? 0)
    };
  };

  const mergeHabits = (targetHabit, sourceHabit) => {
    const target = normalizeHabit(targetHabit);
    const source = normalizeHabit(sourceHabit);

    const merged = normalizeHabit({
      lifetimePlays: target.lifetimePlays + source.lifetimePlays,
      lifetimeSkips: target.lifetimeSkips + source.lifetimeSkips,
      likeCount: target.likeCount + source.likeCount,
      dislikeCount: target.dislikeCount + source.dislikeCount,

      weeklyPlays: target.weeklyPlays + source.weeklyPlays,
      weeklySkips: target.weeklySkips + source.weeklySkips,
      weeklyLikes: target.weeklyLikes + source.weeklyLikes,
      weeklyDislikes: target.weeklyDislikes + source.weeklyDislikes,

      likedThisWeek: target.likedThisWeek || source.likedThisWeek,
      dislikedThisWeek: target.dislikedThisWeek || source.dislikedThisWeek,

      lastPlayedAt: Math.max(target.lastPlayedAt || 0, source.lastPlayedAt || 0),
      lastLikedAt: Math.max(target.lastLikedAt || 0, source.lastLikedAt || 0),
      lastDislikedAt: Math.max(target.lastDislikedAt || 0, source.lastDislikedAt || 0)
    });

    return merged;
  };

  const byTriple = new Map();
  const byFileTriple = new Map();
  const byFileOnly = new Map();

  tracks.forEach(track => {
    const titleKey = stripExt(track.title || track.fileName || '');
    const artistKey = norm(track.artist || 'unknown_artist');
    const albumKey = norm(track.album || 'unknown_album');
    const fileKey = stripExt((track.file && track.file.name) || track.fileName || '');

    const tripleKey = `${titleKey}|${artistKey}|${albumKey}`;
    const fileTripleKey = `${fileKey}|${artistKey}|${albumKey}`;

    if (!byTriple.has(tripleKey)) byTriple.set(tripleKey, track);
    if (fileKey && !byFileTriple.has(fileTripleKey)) byFileTriple.set(fileTripleKey, track);

    if (fileKey) {
      if (!byFileOnly.has(fileKey)) {
        byFileOnly.set(fileKey, track);
      } else {
        byFileOnly.set(fileKey, null);
      }
    }
  });

  let moved = 0;
  let skipped = 0;

  Object.keys(habits).forEach(oldId => {
    const existingTrack = tracks.find(track => getTrackId(track) === oldId);
    if (existingTrack) {
      habits[oldId] = normalizeHabit(habits[oldId]);
      return;
    }

    const parts = oldId.split('|');
    const titlePart = stripExt(parts[0] || '');
    const artistPart = norm(parts[1] || '');
    const albumPart = norm(parts[2] || '');

    let target = null;

    const tripleKey = `${titlePart}|${artistPart}|${albumPart}`;
    if (byTriple.has(tripleKey)) {
      target = byTriple.get(tripleKey);
    }

    if (!target) {
      const fileTripleKey = `${titlePart}|${artistPart}|${albumPart}`;
      if (byFileTriple.has(fileTripleKey)) {
        target = byFileTriple.get(fileTripleKey);
      }
    }

    if (!target && byFileOnly.has(titlePart) && byFileOnly.get(titlePart)) {
      target = byFileOnly.get(titlePart);
    }

    if (!target) {
      skipped++;
      return;
    }

    const newId = getTrackId(target);
    const oldHabit = normalizeHabit(habits[oldId]);

    if (!habits[newId]) {
      habits[newId] = oldHabit;
      moved++;
    } else if (newId !== oldId) {
      habits[newId] = mergeHabits(habits[newId], oldHabit);
      moved++;
    }

    if (newId !== oldId) {
      delete habits[oldId];
    }
  });

  Object.keys(habits).forEach(id => {
    habits[id] = normalizeHabit(habits[id]);
  });

  localStorage.setItem('userHabits', JSON.stringify(habits));

  if (typeof loadUserHabits === 'function') {
    loadUserHabits();
  } else {
    window.userHabits = habits;
    if (typeof userHabits !== 'undefined') userHabits = habits;
  }

  if (moved > 0) {
    console.log(`Migrated ${moved} habit entries to stable IDs${skipped ? `; ${skipped} skipped` : ''}`);
  } else {
    console.log('No habit entries migrated; none matched loaded tracks.');
  }
}

function normalizePath(p = '') {
  const dec = decodeURIComponent(p);
  return dec.replace(/^tree\/[^/]+:music\/document\//i, '');
}
window.normalizePath = normalizePath;

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
        const file = audioFiles.find(f =>
          (metaTrack.relativePath && f.webkitRelativePath === metaTrack.relativePath) ||
          f.name === metaTrack.fileName
        );
        if (file) {
          stateTracks.push({
            ...metaTrack,
            file,
            fileName: metaTrack.fileName || file.name,
            relativePath: normalizePath(metaTrack.relativePath || file.webkitRelativePath || ''),
            size: metaTrack.size || file.size,
            lastModified: metaTrack.lastModified || file.lastModified
          });
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
          ...(year ? { year } : {}),
          ...(file ? {
            fileName: file.name,
            relativePath: normalizePath(file ? file.webkitRelativePath || '' : ''),
            size: file.size,
            lastModified: file.lastModified
          } : {})
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
              fileName: file.name,
              relativePath: normalizePath(file ? file.webkitRelativePath || '' : ''),
              size: file.size,
              lastModified: file.lastModified,
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
              fileName: file.name,
              relativePath: normalizePath(file.webkitRelativePath || ''),
              size: file.size,
              lastModified: file.lastModified,
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
            migrateHabitsToStableIds(app.state.tracks);
          }
        }
      });
    });
  }
}

function getFolderPath(file) {
  const rel = normalizePath(file.webkitRelativePath || '');
  if (!rel) return '';
  const parts = rel.split('/');
  parts.pop();
  return parts.join('/');
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
      fileName: t.fileName || t.file?.name,
      relativePath: normalizePath(t.relativePath || t.file?.webkitRelativePath || ''),
      size: t.size || t.file?.size,
      lastModified: t.lastModified || t.file?.lastModified,
      title: t.title,
      artist: t.artist,
      album: t.album,
      genre: t.genre,
      year: t.year,
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