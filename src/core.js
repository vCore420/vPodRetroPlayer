let storageAccessWarningShown = false;

function warnStorageAccess(action, key, error) {
  if (storageAccessWarningShown) return;
  storageAccessWarningShown = true;
  console.warn(`Local storage unavailable during ${action}${key ? ` for ${key}` : ''}`, error);
}

function getLocalStorageSafe() {
  try {
    return window.localStorage;
  } catch (error) {
    warnStorageAccess('initialization', '', error);
    return null;
  }
}

function getLocalStorageValue(key, fallback = null) {
  const storage = getLocalStorageSafe();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw == null ? fallback : raw;
  } catch (error) {
    warnStorageAccess('read', key, error);
    return fallback;
  }
}

function setLocalStorageValue(key, value) {
  const storage = getLocalStorageSafe();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    warnStorageAccess('write', key, error);
    return false;
  }
}

function removeLocalStorageValue(key) {
  const storage = getLocalStorageSafe();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    warnStorageAccess('remove', key, error);
    return false;
  }
}

function readLocalJson(key, fallback) {
  const raw = getLocalStorageValue(key, null);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to parse ${key}`, error);
    return fallback;
  }
}

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

const app = {
  dom: {
    vpodScreen: document.getElementById('vpodScreen'),
    audioPlayer: document.getElementById('audioPlayer'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
  },
  state: {
    tracks: [],
    albums: {},
    playlists: readLocalJson('playlists', []),
    navStack: [],
    currentTrack: null,
    currentMenuIndex: 0,
    currentAlbumSongs: [],
    currentSongIndex: -1,
    queueSignature: null,
    smartMixPlaybackHistory: [],
    smartMixHistoryCursor: -1,
    albumCoverURLs: [],
    isShuffleOn: false,
    originalAlbumSongs: null,
    originalSongIndex: -1,
    songRatings: readLocalJson('songRatings', {}),
    derivedData: {
      sortedAlbumKeys: [],
      artistMenuItems: []
    },
    screenCache: new Map(),
    trackIdCache: new WeakMap(),
  },
  config: {
    savedEqPreset: getLocalStorageValue('eqPreset', 'Flat'),
    debugLogging: getLocalStorageValue('debugLogging', '0') === '1',
  }
};

function isDebugLoggingEnabled() {
  return !!app.config.debugLogging;
}

function setDebugLogging(enabled) {
  const nextValue = !!enabled;
  app.config.debugLogging = nextValue;
  setLocalStorageValue('debugLogging', nextValue ? '1' : '0');
  return nextValue;
}

function debugLog(...args) {
  if (!isDebugLoggingEnabled()) return;
  console.log(...args);
}

function debugTrace(...args) {
  if (!isDebugLoggingEnabled()) return;
  console.debug(...args);
}

function resetDerivedData() {
  app.state.derivedData = {
    sortedAlbumKeys: [],
    artistMenuItems: []
  };
  app.state.screenCache = new Map();
  app.state.trackIdCache = new WeakMap();
}

window.isDebugLoggingEnabled = isDebugLoggingEnabled;
window.setDebugLogging = setDebugLogging;
window.debugLog = debugLog;
window.debugTrace = debugTrace;
window.resetDerivedData = resetDerivedData;
window.getLocalStorageSafe = getLocalStorageSafe;
window.getLocalStorageValue = getLocalStorageValue;
window.setLocalStorageValue = setLocalStorageValue;
window.removeLocalStorageValue = removeLocalStorageValue;
