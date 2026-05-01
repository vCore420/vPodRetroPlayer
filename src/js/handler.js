// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

const LOAD_DEBUG_ENABLED = false;
const LOAD_DEBUG_WATCHDOG_MS = 5000;
const TRACK_METADATA_CACHE_DB = 'vretro-player-cache';
const TRACK_METADATA_CACHE_STORE = 'trackMetadata';
const TRACK_METADATA_CACHE_VERSION = 2;

let trackMetadataDbPromise = null;

function updateLoadingCounter(loaded, total) {
  const counter = document.getElementById('loadingCounter');
  if (counter) counter.textContent = `Loaded ${loaded} of ${total} songs`;
}

function updateLoadingDebug(message = '') {
  const debugEl = document.getElementById('loadingDebug');
  if (debugEl) debugEl.textContent = message;
}

function getLoadingDebugLabel(file) {
  if (!file) return 'Unknown file';
  return file.webkitRelativePath || file.name || 'Unknown file';
}

function refreshLoadingDebug(loadDebug) {
  if (!LOAD_DEBUG_ENABLED || !loadDebug) return;

  const pendingEntries = Array.from(loadDebug.pending.values())
    .sort((a, b) => a.startedAt - b.startedAt);
  const oldestPending = pendingEntries[0];
  const pendingCount = pendingEntries.length;

  const parts = [`Pending: ${pendingCount}`];
  if (loadDebug.lastStarted) parts.push(`Last start: ${loadDebug.lastStarted}`);
  if (oldestPending) parts.push(`Oldest: ${oldestPending.label}`);

  updateLoadingDebug(parts.join(' | '));
}

function createLoadingDebugTracker() {
  if (!LOAD_DEBUG_ENABLED) return null;

  const loadDebug = {
    pending: new Map(),
    lastStarted: '',
    watchdogId: null
  };

  loadDebug.watchdogId = setInterval(() => {
    const pendingEntries = Array.from(loadDebug.pending.values())
      .sort((a, b) => a.startedAt - b.startedAt);
    const oldestPending = pendingEntries[0];

    debugTrace('[load-debug] Watchdog', {
      pendingCount: pendingEntries.length,
      lastStarted: loadDebug.lastStarted || null,
      oldestPending: oldestPending ? {
        label: oldestPending.label,
        phase: oldestPending.phase,
        ageMs: Date.now() - oldestPending.startedAt
      } : null,
      pendingFiles: pendingEntries.map(entry => ({
        label: entry.label,
        phase: entry.phase,
        ageMs: Date.now() - entry.startedAt
      }))
    });

    refreshLoadingDebug(loadDebug);
  }, LOAD_DEBUG_WATCHDOG_MS);

  refreshLoadingDebug(loadDebug);
  return loadDebug;
}

function stopLoadingDebugTracker(loadDebug, finalMessage = '') {
  if (!LOAD_DEBUG_ENABLED || !loadDebug) return;
  if (loadDebug.watchdogId) {
    clearInterval(loadDebug.watchdogId);
    loadDebug.watchdogId = null;
  }
  updateLoadingDebug(finalMessage);
}

function beginLoadingDebug(loadDebug, file, phase) {
  if (!LOAD_DEBUG_ENABLED || !loadDebug) return null;

  const label = getLoadingDebugLabel(file);
  const key = `${phase}:${label}`;
  const entry = {
    key,
    label,
    phase,
    startedAt: Date.now()
  };

  loadDebug.lastStarted = label;
  loadDebug.pending.set(key, entry);
  debugTrace(`[load-debug] START ${phase}`, {
    label,
    size: file?.size ?? null,
    lastModified: file?.lastModified ?? null
  });
  refreshLoadingDebug(loadDebug);
  return key;
}

function endLoadingDebug(loadDebug, key, status) {
  if (!LOAD_DEBUG_ENABLED || !loadDebug || !key) return;

  const entry = loadDebug.pending.get(key);
  if (!entry) return;

  loadDebug.pending.delete(key);
  debugTrace(`[load-debug] ${status} ${entry.phase}`, {
    label: entry.label,
    ageMs: Date.now() - entry.startedAt
  });
  refreshLoadingDebug(loadDebug);
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
  const existingTrackIds = new Set();

  tracks.forEach(track => {
    existingTrackIds.add(getTrackId(track));

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
    if (existingTrackIds.has(oldId)) {
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
    debugLog(`Migrated ${moved} habit entries to stable IDs${skipped ? `; ${skipped} skipped` : ''}`);
  } else {
    debugLog('No habit entries migrated; none matched loaded tracks.');
  }
}

function refreshDerivedData() {
  const allAlbums = app.state.albums || {};
  const allTracks = app.state.tracks || [];

  app.state.derivedData.sortedAlbumKeys = Object.keys(allAlbums).sort((a, b) =>
    (allAlbums[a].title || '').localeCompare(allAlbums[b].title || '') ||
    (allAlbums[a].artist || '').localeCompare(allAlbums[b].artist || '')
  );

  const artistMap = new Map();
  allTracks.forEach(track => {
    const rawArtist = track.artist || 'Unknown Artist';
    const key = rawArtist.trim().toLowerCase();
    if (!artistMap.has(key)) {
      artistMap.set(key, rawArtist.replace(/\b\w/g, char => char.toUpperCase()));
    }
  });

  app.state.derivedData.artistMenuItems = Array.from(artistMap.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

window.refreshDerivedData = refreshDerivedData;

function normalizePath(p = '') {
  const dec = decodeURIComponent(p);
  return dec.replace(/^tree\/[^/]+:music\/document\//i, '');
}
window.normalizePath = normalizePath;

function getFolderPathFromRelativePath(relativePath = '') {
  if (!relativePath) return '';
  const parts = relativePath.split('/');
  parts.pop();
  return parts.join('/');
}

function parseTrackNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function buildAudioFileLookupMaps(files = []) {
  const byRelativePath = new Map();
  const byName = new Map();
  const byNameAndSize = new Map();

  files.forEach(file => {
    const relativePath = normalizePath(file.webkitRelativePath || '');
    const lowerName = (file.name || '').toLowerCase();
    const size = Number(file.size || 0);

    if (relativePath) {
      byRelativePath.set(relativePath.toLowerCase(), file);
    }

    if (lowerName && Number.isFinite(size)) {
      byNameAndSize.set(`${lowerName}|${size}`, file);
    }

    if (!byName.has(lowerName)) {
      byName.set(lowerName, []);
    }
    byName.get(lowerName).push(file);
  });

  return { byRelativePath, byName, byNameAndSize };
}

function findAudioFileForMetadata(metaTrack, lookupMaps) {
  const relativePath = normalizePath(metaTrack.relativePath || '').toLowerCase();
  if (relativePath && lookupMaps.byRelativePath.has(relativePath)) {
    return lookupMaps.byRelativePath.get(relativePath);
  }

  const lowerName = (metaTrack.fileName || '').toLowerCase();

  if (Number.isFinite(metaTrack.size)) {
    const exactMatch = lookupMaps.byNameAndSize.get(`${lowerName}|${metaTrack.size}`);
    if (exactMatch) return exactMatch;
  }

  const candidates = lookupMaps.byName.get(lowerName) || [];
  if (!candidates.length) return null;

  if (Number.isFinite(metaTrack.size)) {
    const sizeMatch = candidates.find(file => file.size === metaTrack.size);
    if (sizeMatch) return sizeMatch;
  }

  return candidates[0] || null;
}

function makeLoadedTrackSignature(source = {}) {
  if (typeof source.signature === 'string' && source.signature) {
    return source.signature;
  }

  const relativePath = normalizePath(
    source.relativePath || source.webkitRelativePath || source.file?.webkitRelativePath || ''
  ).toLowerCase();
  if (relativePath) return `rel:${relativePath}`;

  const fileName = (source.fileName || source.name || source.file?.name || '').toLowerCase();
  const size = source.size ?? source.file?.size ?? '';
  return `file:${fileName}|${size}`;
}

function pushUniqueTrack(stateTracks, track, signatures) {
  const signature = makeLoadedTrackSignature(track);
  if (signatures.has(signature)) return false;

  signatures.add(signature);
  stateTracks.push(track);
  return true;
}

function makeTrackMetadataBaseKey(source = {}) {
  const relativePath = normalizePath(
    source.relativePath || source.webkitRelativePath || source.file?.webkitRelativePath || ''
  ).toLowerCase();
  const fileName = (source.fileName || source.name || source.file?.name || '').toLowerCase();
  const size = Number(source.size ?? source.file?.size ?? 0) || 0;
  const prefix = relativePath
    ? `rel:${relativePath}`
    : `file:${fileName}`;

  return `${prefix}|${size}`;
}

function createTrackMetadataCacheEntry(file, metadata = {}) {
  return {
    baseKey: makeTrackMetadataBaseKey({
      ...metadata,
      file,
      fileName: metadata.fileName || file.name,
      relativePath: metadata.relativePath || file.webkitRelativePath || '',
      size: metadata.size || file.size
    }),
    fileName: metadata.fileName || file.name,
    relativePath: normalizePath(metadata.relativePath || file.webkitRelativePath || ''),
    size: Number(metadata.size || file.size || 0),
    lastModified: Number(metadata.lastModified || file.lastModified || 0),
    title: metadata.title || file.name.replace(/\.(mp3|flac)$/i, ''),
    artist: metadata.artist || 'Unknown Artist',
    album: metadata.album || 'Unidentified Album',
    genre: metadata.genre || 'Unknown Genre',
    year: metadata.year,
    trackNumber: parseTrackNumber(metadata.trackNumber),
    duration: Number(metadata.duration || 0) || undefined
  };
}

function buildTrackFromCachedMetadata(file, metadata = {}) {
  const cached = createTrackMetadataCacheEntry(file, metadata);
  return {
    file,
    fileName: cached.fileName,
    relativePath: cached.relativePath,
    size: cached.size,
    lastModified: cached.lastModified,
    title: cached.title,
    artist: cached.artist,
    album: cached.album,
    genre: cached.genre,
    year: cached.year,
    trackNumber: cached.trackNumber,
    duration: cached.duration
  };
}

function openTrackMetadataDb() {
  if (!('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (trackMetadataDbPromise) return trackMetadataDbPromise;

  trackMetadataDbPromise = new Promise(resolve => {
    const request = indexedDB.open(TRACK_METADATA_CACHE_DB, TRACK_METADATA_CACHE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(TRACK_METADATA_CACHE_STORE)) {
        db.deleteObjectStore(TRACK_METADATA_CACHE_STORE);
      }
      db.createObjectStore(TRACK_METADATA_CACHE_STORE, { keyPath: 'baseKey' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  return trackMetadataDbPromise;
}

async function createTrackMetadataCacheSession() {
  const db = await openTrackMetadataDb();
  return {
    db,
    entries: new Map()
  };
}

async function getTrackMetadataCacheEntry(file, cacheSession) {
  const baseKey = makeTrackMetadataBaseKey(file);
  if (!baseKey) return null;

  if (cacheSession?.entries.has(baseKey)) {
    return cacheSession.entries.get(baseKey);
  }

  if (!cacheSession?.db) {
    return null;
  }

  return new Promise(resolve => {
    const tx = cacheSession.db.transaction(TRACK_METADATA_CACHE_STORE, 'readonly');
    const store = tx.objectStore(TRACK_METADATA_CACHE_STORE);
    const request = store.get(baseKey);

    request.onsuccess = () => {
      const entry = request.result || null;
      cacheSession.entries.set(baseKey, entry);
      resolve(entry);
    };

    request.onerror = () => {
      cacheSession.entries.set(baseKey, null);
      resolve(null);
    };
  });
}

async function persistTrackMetadataCache(entries = []) {
  if (!entries.length) return;

  const db = await openTrackMetadataDb();
  if (!db) return;

  const uniqueEntries = new Map();
  entries.forEach(entry => {
    if (entry?.baseKey) uniqueEntries.set(entry.baseKey, entry);
  });

  if (!uniqueEntries.size) return;

  return new Promise(resolve => {
    const tx = db.transaction(TRACK_METADATA_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TRACK_METADATA_CACHE_STORE);

    uniqueEntries.forEach(entry => {
      store.put(entry);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

function handleFiles(e) {
  debugLog('Handling files:', e.target.files);
  const loadDebug = createLoadingDebugTracker();
  const metadataCacheSessionPromise = createTrackMetadataCacheSession();

  // Reset all global state
  app.state.tracks = [];
  app.state.albums = {};
  resetDerivedData();
  app.state.currentTrack = null;
  app.state.currentAlbumSongs = [];
  app.state.currentSongIndex = -1;

  currentAlbumSongs = app.state.currentAlbumSongs;
  currentSongIndex = app.state.currentSongIndex;

  app.state.albumCoverURLs.forEach(url => URL.revokeObjectURL(url));
  app.state.albumCoverURLs = [];

  // Check for tracks-meta.json first
  const files = Array.from(e.target.files);
  if (!files.length) {
    stopLoadingDebugTracker(loadDebug, 'Debug: no files selected');
    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage('No files selected', 1800);
    }
    return;
  }

  const metaFile = files.find(f => f.name === 'tracks-meta.json');
  const audioFiles = files.filter(f => f.name.match(/\.(mp3|flac)$/i));
  const imageFiles = files.filter(f => f.name.match(/\.(jpg|jpeg)$/i));
  const cueFiles = files.filter(f => f.name.match(/\.cue$/i));
  const audioFileLookups = buildAudioFileLookupMaps(audioFiles);

  if (!audioFiles.length && !cueFiles.length && !metaFile) {
    stopLoadingDebugTracker(loadDebug, 'Debug: unsupported selection');
    alert('No supported music files were selected. Choose MP3, FLAC, CUE, artwork, and optional tracks-meta.json files.');
    return;
  }
  
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
    stopLoadingDebugTracker(loadDebug, 'Debug: metadata import mode');
    const reader = new FileReader();
    reader.onload = async function(ev) {
      const meta = JSON.parse(ev.target.result);

      app.state.tracks = [];
      const stateTracks = app.state.tracks;

      const total = meta.tracks.length || 0;
      let loaded = 0;
      const loadedSignatures = new Set();
      const shouldYieldDuringMetadataImport = /android/i.test(navigator.userAgent || '');
      const metadataImportYieldEvery = 200;

      for (let index = 0; index < total; index++) {
        const metaTrack = meta.tracks[index];
        const file = findAudioFileForMetadata(metaTrack, audioFileLookups);
        if (file) {
          const relativePath = normalizePath(metaTrack.relativePath || file.webkitRelativePath || '');
          const lowerRelativePath = relativePath.toLowerCase();
          const fileName = metaTrack.fileName || file.name;
          const size = metaTrack.size || file.size;
          const track = {
            ...metaTrack,
            file,
            fileName,
            relativePath,
            folderPath: getFolderPathFromRelativePath(relativePath),
            size,
            lastModified: metaTrack.lastModified || file.lastModified
          };
          track.signature = lowerRelativePath
            ? `rel:${lowerRelativePath}`
            : `file:${fileName.toLowerCase()}|${size}`;
          pushUniqueTrack(stateTracks, track, loadedSignatures);
        }

        loaded++;

        if (shouldYieldDuringMetadataImport && loaded % metadataImportYieldEvery === 0) {
          updateLoadingCounter(loaded, total);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      updateLoadingCounter(loaded, total);

      if (stateTracks.length === 0) {
        stopLoadingDebugTracker(loadDebug, 'Debug: metadata import found no matches');
        alert("No matching audio files found for metadata. Please upload your music files along with tracks-meta.json.");
        renderMainMenu('forward');
        app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
        return;
      }

      // Build albums (no nav here)
      groupTracksByAlbum(true, folderCovers);
      migrateHabitsToStableIds(app.state.tracks);
      stopLoadingDebugTracker(loadDebug, 'Debug: metadata import complete');

      renderMainMenu('forward');
      app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
    };
    reader.readAsText(metaFile);
    return;
  }
  
  // Show loading screen
  goTo(goToLoadingScreen);

  debugLog('Audio files:', audioFiles);
  debugLog('Cue files:', cueFiles);
  debugLog('Image files:', imageFiles);

  let processed = 0;

  // Helper to parse CUE files
  function parseCue(text, audioFiles, fallbackFile = null) {
    debugLog('Parsing CUE file:', fallbackFile ? fallbackFile.name : 'No FLAC fallback');

    const albumMatch = text.match(/^\s*TITLE\s+"([^"]+)"/m);
    const albumTitle = albumMatch ? albumMatch[1] : 'Unidentified Album';

    const performerMatch = text.match(/^\s*PERFORMER\s+"([^"]+)"/m);
    const albumArtist = performerMatch ? performerMatch[1] : 'Unknown Artist';

    const genreMatch = text.match(/REM\s+GENRE\s+"?([^"\r\n]+)"?/i);
    const dateMatch = text.match(/REM\s+DATE\s+"?([^"\r\n]+)"?/i);
    const genre = genreMatch ? genreMatch[1] : undefined;
    const year = dateMatch ? dateMatch[1] : undefined;

    const fileBlocks = [...text.matchAll(/FILE\s+"([^"]+)"\s+\w+\s+([\s\S]*?)(?=FILE\s+"|$)/gi)];
    const parsedCueTracks = [];

    fileBlocks.forEach(([, fileName, block]) => {
      const fileCandidates = audioFileLookups.byName.get((fileName || '').toLowerCase()) || [];
      const file = fileCandidates[0] || fallbackFile || null;
      const trackBlocks = [...block.matchAll(/TRACK\s+(\d+)\s+AUDIO([\s\S]*?)(?=TRACK\s+\d+\s+AUDIO|$)/gi)];

      trackBlocks.forEach(([, numStr, tBlock]) => {
        const trackNumber = parseInt(numStr, 10);
        const titleMatch = tBlock.match(/TITLE\s+"([^"]+)"/i);
        const performerTrack = tBlock.match(/PERFORMER\s+"([^"]+)"/i);

        parsedCueTracks.push({
          file,
          fileName: file ? file.name : fileName,
          relativePath: normalizePath(file ? file.webkitRelativePath || '' : ''),
          size: file ? file.size : 0,
          lastModified: file ? file.lastModified : 0,
          title: titleMatch ? titleMatch[1] : (file ? file.name.replace(/\.(mp3|flac)$/i, '') : 'Unknown Track'),
          artist: performerTrack ? performerTrack[1] : albumArtist,
          album: albumTitle,
          genre: genre || 'Unknown Genre',
          year,
          trackNumber
        });
      });
    });

    debugLog('Parsed cue tracks:', parsedCueTracks);
    return parsedCueTracks;
  }

  // Process CUE files first
  let cueTracks = [];
  if (cueFiles.length === 0) {
    processAudioFiles();
    return;
  }

  cueFiles.forEach(cueFile => {
    const cueReader = new FileReader();
    cueReader.onload = function(ev) {
      const cueText = ev.target.result;
      const cueBaseName = cueFile.name.replace(/\.cue$/i, '');
      const fallbackCandidates = audioFileLookups.byName.get(cueBaseName.toLowerCase()) || [];
      const fallbackFile = fallbackCandidates.find(file => /\.flac$/i.test(file.name)) || fallbackCandidates[0] || null;
      cueTracks = cueTracks.concat(parseCue(cueText, audioFiles, fallbackFile));
      endLoadingDebug(loadDebug, cueFile.name, 'CUE');
      if (++processed === cueFiles.length) {
        processAudioFiles();
      }
    };
    cueReader.onerror = function() {
      endLoadingDebug(loadDebug, cueFile.name, 'CUEERR');
      if (++processed === cueFiles.length) {
        processAudioFiles();
      }
    };
    beginLoadingDebug(loadDebug, cueFile, 'cue');
    cueReader.readAsText(cueFile);
  });

  // Process audio files
  async function processAudioFiles() {
    debugLog('Processing audio files...');
    const total = audioFiles.length;
    let done = 0;
    const stateTracks = app.state.tracks;
    const loadedSignatures = new Set(stateTracks.map(track => makeLoadedTrackSignature(track)));
    const metadataCacheSession = await metadataCacheSessionPromise;
    const cacheWrites = [];
    let finalized = false;

    const finalizeAudioLoad = async () => {
      if (finalized || done !== total) return;
      finalized = true;

      cueTracks.forEach(ct => {
        pushUniqueTrack(stateTracks, ct, loadedSignatures);
      });

      await persistTrackMetadataCache(cacheWrites);
      stopLoadingDebugTracker(loadDebug, 'Debug: audio import complete');
      groupTracksByAlbum(false, folderCovers);
      migrateHabitsToStableIds(app.state.tracks);
    };

    if (total === 0) {
      cueTracks.forEach(ct => {
        pushUniqueTrack(stateTracks, ct, loadedSignatures);
      });
      stopLoadingDebugTracker(loadDebug, 'Debug: cue-only import complete');
      groupTracksByAlbum(false, folderCovers);
      migrateHabitsToStableIds(app.state.tracks);
      return;
    }

    audioFiles.forEach(async file => {
      const debugKey = beginLoadingDebug(loadDebug, file, 'audio');
      const cachedMetadata = await getTrackMetadataCacheEntry(file, metadataCacheSession);

      if (cachedMetadata) {
        pushUniqueTrack(stateTracks, buildTrackFromCachedMetadata(file, cachedMetadata), loadedSignatures);
        endLoadingDebug(loadDebug, debugKey, 'CACHE');
        done++;
        updateLoadingCounter(done, total);
        finalizeAudioLoad();
        return;
      }

      window.jsmediatags.read(file, {
        onSuccess: tag => {
          const { title, artist, album, genre, track } = tag.tags;
          const trackNumber = parseTrackNumber(track);
          debugLog('Read tags for:', file.name, tag.tags);

          const trackData = {
            file,
            fileName: file.name,
            relativePath: normalizePath(file.webkitRelativePath || ''),
            size: file.size,
            lastModified: file.lastModified,
            title: title || file.name.replace(/\.(mp3|flac)$/i, ''),
            artist: artist || 'Unknown Artist',
            album: album || 'Unidentified Album',
            genre: genre || 'Unknown Genre',
            trackNumber
          };

          pushUniqueTrack(stateTracks, trackData, loadedSignatures);
          cacheWrites.push(createTrackMetadataCacheEntry(file, trackData));
          endLoadingDebug(loadDebug, debugKey, 'OK');
          done++;
          updateLoadingCounter(done, total);
          finalizeAudioLoad();
        },
        onError: () => {
          debugLog('Error reading tags for:', file.name);

          const trackData = {
            file,
            fileName: file.name,
            relativePath: normalizePath(file.webkitRelativePath || ''),
            size: file.size,
            lastModified: file.lastModified,
            title: file.name.replace(/\.(mp3|flac)$/i, ''),
            artist: 'Unknown Artist',
            album: 'Unidentified Album'
          };

          pushUniqueTrack(stateTracks, trackData, loadedSignatures);
          cacheWrites.push(createTrackMetadataCacheEntry(file, trackData));
          endLoadingDebug(loadDebug, debugKey, 'ERR');
          done++;
          updateLoadingCounter(done, total);
          finalizeAudioLoad();
        }
      });
    });
  }
}

function getFolderPath(file) {
  const rel = normalizePath(file.webkitRelativePath || '');
  return getFolderPathFromRelativePath(rel);
}

function makeAlbumKey(track) {
  const artist = (track.artist || 'Unknown Artist').trim().toLowerCase();
  const album  = (track.album  || 'Unknown Album').trim().toLowerCase();
  return `${artist}|${album}`;
}

function groupTracksByAlbum(skipPrompt = false, folderCovers = {}) {
  debugLog('Grouping tracks by album...');

  const allTracks = app.state.tracks;

  app.state.albums = {};
  const allAlbums = app.state.albums;

  allTracks.forEach(track => {
    const albumTitle  = track.album || 'Unknown Album';
    const albumArtist = track.artist || 'Unknown Artist';
    const albumKey    = makeAlbumKey(track);
    track.albumKey    = albumKey; // store on track for lookups

    if (!allAlbums[albumKey]) {
      const trackFolder = (track.folderPath || track.relativePath)
        ? getFolderPathFromRelativePath(track.folderPath || track.relativePath || '')
        : (track.file ? getFolderPath(track.file) : '');
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

  refreshDerivedData();
  debugLog('Albums grouped:', allAlbums);

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