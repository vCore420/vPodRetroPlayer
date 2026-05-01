// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

const LOAD_DEBUG_ENABLED = false;
const LOAD_DEBUG_WATCHDOG_MS = 5000;
const TRACK_METADATA_CACHE_DB = 'vretro-player-cache';
const TRACK_METADATA_CACHE_STORE = 'trackMetadata';
const TRACK_METADATA_FILE_CACHE_STORE = 'trackMetadataFiles';
const TRACK_METADATA_CACHE_VERSION = 3;

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

function flushImportTimings(label, timings) {
  if (!isDebugLoggingEnabled() || !timings) return;

  const totalMs = Number(timings.totalMs || 0);
  const breakdown = Object.fromEntries(
    Object.entries(timings)
      .filter(([key]) => key !== 'totalMs')
      .map(([key, value]) => [key, Math.round(Number(value || 0))])
  );

  const summary = {
    label,
    totalMs: Math.round(totalMs),
    breakdown,
    message: `T${Math.round(totalMs / 1000)} F${Math.round((breakdown.filePartitionMs || 0) / 1000)} L${Math.round((breakdown.lookupBuildMs || 0) / 1000)} C${Math.round((breakdown.folderCoverBuildMs || 0) / 1000)}`
  };

  window.lastImportTimings = summary;
  debugLog(`[import-timings] ${label}`, summary);
}

function readBlobAsText(blob) {
  if (blob && typeof blob.text === 'function') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as text'));
    reader.readAsText(blob);
  });
}

async function hydrateMetadataTracksInBackground(tracks, audioFiles, folderCovers, importToken, onProgress = null) {
  if (!Array.isArray(tracks) || !tracks.length || !Array.isArray(audioFiles) || !audioFiles.length) {
    return false;
  }

  const byRelativePath = new Map();
  const byName = new Map();
  const totalUnits = audioFiles.length + tracks.length;
  let completedUnits = 0;

  if (typeof onProgress === 'function') {
    onProgress(completedUnits, totalUnits);
  }

  if (app.state.importHydrationToken !== importToken) return false;

  audioFiles.forEach(file => {
    const relativePath = normalizePath(file.webkitRelativePath || '');
    const relativePathKey = relativePath.toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const entry = {
      file,
      relativePath,
      relativePathKey,
      folderPath: getFolderPathFromRelativePath(relativePath),
      size: Number(file.size || 0),
      lastModified: Number(file.lastModified || 0)
    };

    if (relativePathKey) {
      byRelativePath.set(relativePathKey, entry);
    }

    if (!byName.has(fileName)) {
      byName.set(fileName, []);
    }
    byName.get(fileName).push(entry);
  });

  completedUnits += audioFiles.length;
  if (typeof onProgress === 'function') {
    onProgress(completedUnits, totalUnits);
  }

  let hydratedAny = false;

  if (app.state.importHydrationToken !== importToken) return false;

  tracks.forEach(track => {
    if (track?.file instanceof Blob) return;

    const relativePath = normalizePath(track.relativePath || '');
    const relativePathKey = relativePath.toLowerCase();
    const fileName = (track.fileName || '').toLowerCase();
    const size = Number(track.size || 0);

    let resolved = relativePathKey ? byRelativePath.get(relativePathKey) : null;
    if (!resolved && fileName) {
      const candidates = byName.get(fileName) || [];
      if (candidates.length === 1) {
        resolved = candidates[0];
      } else if (candidates.length > 1 && size) {
        resolved = candidates.find(entry => entry.size === size) || null;
      }
    }

    if (!resolved) return;

    hydratedAny = true;
    track.file = resolved.file;
    track.relativePath = relativePath || resolved.relativePath;
    track.folderPath = resolved.folderPath || getFolderPathFromRelativePath(track.relativePath || '');
    if (!track.size) track.size = resolved.size;
    if (!track.lastModified) track.lastModified = resolved.lastModified;

    const normalizedRelativePath = normalizePath(track.relativePath || '').toLowerCase();
    track.signature = normalizedRelativePath
      ? `rel:${normalizedRelativePath}`
      : `file:${(track.fileName || '').toLowerCase()}|${track.size || ''}`;
  });

  completedUnits += tracks.length;
  if (typeof onProgress === 'function') {
    onProgress(completedUnits, totalUnits);
  }

  return hydratedAny;
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
  const isAndroid = /android/i.test(navigator.userAgent || '');
  const byRelativePath = new Map();
  const byName = new Map();
  const byNameAndSize = new Map();

  files.forEach(file => {
    const lowerName = (file.name || '').toLowerCase();

    if (!isAndroid) {
      const relativePath = normalizePath(file.webkitRelativePath || '');
      if (relativePath) {
        byRelativePath.set(relativePath.toLowerCase(), file);
      }

      const size = Number(file.size || 0);
      if (lowerName && Number.isFinite(size)) {
        byNameAndSize.set(`${lowerName}|${size}`, file);
      }
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
  if (candidates.length === 1) return candidates[0];

  if (Number.isFinite(metaTrack.size)) {
    const sizeMatch = candidates.find(file => Number(file.size || 0) === metaTrack.size);
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

function makeMetadataFileCacheKey(file) {
  if (!file) return '';

  const relativePath = normalizePath(file.webkitRelativePath || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const size = Number(file.size || 0);
  const lastModified = Number(file.lastModified || 0);
  const pathPart = relativePath || name;

  return `meta:${pathPart}|${size}|${lastModified}`;
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
      if (!db.objectStoreNames.contains(TRACK_METADATA_CACHE_STORE)) {
        db.createObjectStore(TRACK_METADATA_CACHE_STORE, { keyPath: 'baseKey' });
      }
      if (!db.objectStoreNames.contains(TRACK_METADATA_FILE_CACHE_STORE)) {
        db.createObjectStore(TRACK_METADATA_FILE_CACHE_STORE, { keyPath: 'cacheKey' });
      }
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

async function getMetadataFileCacheEntry(file, cacheSession) {
  const cacheKey = makeMetadataFileCacheKey(file);
  if (!cacheKey || !cacheSession?.db) return null;

  return new Promise(resolve => {
    const tx = cacheSession.db.transaction(TRACK_METADATA_FILE_CACHE_STORE, 'readonly');
    const store = tx.objectStore(TRACK_METADATA_FILE_CACHE_STORE);
    const request = store.get(cacheKey);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function persistMetadataFileCacheEntry(file, meta, cacheSession) {
  const cacheKey = makeMetadataFileCacheKey(file);
  const db = cacheSession?.db || await openTrackMetadataDb();
  if (!cacheKey || !db || !meta?.tracks?.length) return;

  return new Promise(resolve => {
    const tx = db.transaction(TRACK_METADATA_FILE_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TRACK_METADATA_FILE_CACHE_STORE);
    store.put({
      cacheKey,
      name: file.name || 'tracks-meta.json',
      size: Number(file.size || 0),
      lastModified: Number(file.lastModified || 0),
      meta
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
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
  const importStartTime = performance.now();
  const importHydrationToken = Number(app.state.importHydrationToken || 0) + 1;
  app.state.importHydrationToken = importHydrationToken;

  // Reset all global state
  app.state.tracks = [];
  app.state.albums = {};
  app.state.importAudioFiles = [];
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
  const filePartitionEndTime = performance.now();
  const audioFileLookups = metaFile ? null : buildAudioFileLookupMaps(audioFiles);
  const lookupBuildEndTime = performance.now();

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
  const folderCoverBuildEndTime = performance.now();

  if (metaFile) {
    goTo(goToLoadingScreen);
    stopLoadingDebugTracker(loadDebug, 'Debug: metadata import mode');
    (async () => {
      const metadataCacheSession = await metadataCacheSessionPromise;
      app.state.importAudioFiles = audioFiles;
      const metadataTimings = {
        filePartitionMs: filePartitionEndTime - importStartTime,
        lookupBuildMs: lookupBuildEndTime - filePartitionEndTime,
        folderCoverBuildMs: folderCoverBuildEndTime - lookupBuildEndTime,
        metadataCacheHitMs: 0,
        fileReadMs: 0,
        jsonParseMs: 0,
        matchLoopMs: 0,
        groupAlbumsMs: 0,
        migrateHabitsMs: 0,
        finalUiMs: 0,
        totalMs: 0
      };
      let meta;
      const cachedMetaEntry = await getMetadataFileCacheEntry(metaFile, metadataCacheSession);

      if (cachedMetaEntry?.meta?.tracks?.length) {
        metadataTimings.metadataCacheHitMs = 1;
        meta = cachedMetaEntry.meta;
      } else {
        const fileReadStartTime = performance.now();
        let metaText;

        try {
          metaText = await readBlobAsText(metaFile);
        } catch (error) {
          metadataTimings.totalMs = performance.now() - importStartTime;
          flushImportTimings('metadata-import-read-error', metadataTimings);
          stopLoadingDebugTracker(loadDebug, 'Debug: metadata import read failed');
          console.warn('Failed to read tracks-meta.json', error);
          alert('Failed to read tracks-meta.json. Please try importing again.');
          return;
        }

        metadataTimings.fileReadMs = performance.now() - fileReadStartTime;
        const parseStartTime = performance.now();
        meta = JSON.parse(metaText);
        metadataTimings.jsonParseMs = performance.now() - parseStartTime;
        await persistMetadataFileCacheEntry(metaFile, meta, metadataCacheSession);
      }

      app.state.tracks = [];
      const stateTracks = app.state.tracks;

      const total = meta.tracks.length || 0;
      let loaded = 0;
      const loadedSignatures = new Set();
      const matchLoopStartTime = performance.now();

      for (let index = 0; index < total; index++) {
        const metaTrack = meta.tracks[index];
        const relativePath = normalizePath(metaTrack.relativePath || '');
        const lowerRelativePath = relativePath.toLowerCase();
        const fileName = metaTrack.fileName || '';
        const size = Number(metaTrack.size || 0) || 0;
        const track = {
          ...metaTrack,
          fileName,
          relativePath,
          folderPath: getFolderPathFromRelativePath(relativePath),
          size,
          lastModified: Number(metaTrack.lastModified || 0) || 0
        };
        track.signature = lowerRelativePath
          ? `rel:${lowerRelativePath}`
          : `file:${fileName.toLowerCase()}|${size}`;
        pushUniqueTrack(stateTracks, track, loadedSignatures);

        loaded++;
      }

      metadataTimings.matchLoopMs = performance.now() - matchLoopStartTime;
      updateLoadingCounter(loaded, total);

      if (stateTracks.length === 0) {
        metadataTimings.totalMs = performance.now() - importStartTime;
        flushImportTimings('metadata-import-no-matches', metadataTimings);
        stopLoadingDebugTracker(loadDebug, 'Debug: metadata import found no matches');
        alert("No matching audio files found for metadata. Please upload your music files along with tracks-meta.json.");
        renderMainMenu('forward');
        app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
        return;
      }

      renderLoadingScreen('Restoring artwork and song data...', 0, total + audioFiles.length);
      const hydrationStartTime = performance.now();
      const hydratedAny = await hydrateMetadataTracksInBackground(
        stateTracks,
        audioFiles,
        folderCovers,
        importHydrationToken,
        (completed, hydrationTotal) => updateLoadingCounter(completed, hydrationTotal)
      );

      const groupAlbumsStartTime = performance.now();
      app.state.trackIdCache = new WeakMap();
      groupTracksByAlbum(true, folderCovers);
      metadataTimings.groupAlbumsMs = performance.now() - groupAlbumsStartTime;

      const migrateHabitsStartTime = performance.now();
      migrateHabitsToStableIds(app.state.tracks);
      metadataTimings.migrateHabitsMs = performance.now() - migrateHabitsStartTime;
      if (hydratedAny) {
        metadataTimings.finalUiMs += performance.now() - hydrationStartTime;
      }

      const finalUiStartTime = performance.now();
      stopLoadingDebugTracker(loadDebug, 'Debug: metadata import complete');

      renderMainMenu('forward');
      app.state.navStack = [{ fn: renderMainMenu, args: ['forward'] }];
      metadataTimings.finalUiMs += performance.now() - finalUiStartTime;
      metadataTimings.totalMs = performance.now() - importStartTime;
      flushImportTimings('metadata-import', metadataTimings);
      if (isDebugLoggingEnabled() && typeof showHotBarMessage === 'function' && window.lastImportTimings?.message) {
        showHotBarMessage(window.lastImportTimings.message, 7000);
      }

      hydrateMetadataTracksInBackground(stateTracks, audioFiles, folderCovers, importHydrationToken);
    })();
    return;
  }
  
  // Show loading screen
  goTo(goToLoadingScreen);

  debugLog('Audio files:', audioFiles);
  debugLog('Cue files:', cueFiles);
  debugLog('Image files:', imageFiles);

  app.state.importAudioFiles = audioFiles;

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
      const trackFolder = (track.file ? getFolderPath(track.file) : '') ||
        track.folderPath ||
        (track.relativePath ? getFolderPathFromRelativePath(track.relativePath) : '');
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