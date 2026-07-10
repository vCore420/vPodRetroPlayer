// --- IDENTIFY: MusicBrainz-backed metadata lookup & manual linking --------
//
// Last-resort helper for tracks/albums/artists that local tag reading (and
// the folder-name inference in handler.js) couldn't identify. Mirrors what
// a Jellyfin-style metadata provider does: search a public music database
// and let the user confirm a match, or paste in a known MusicBrainz ID
// directly. Everything here is entirely opt-in and user-triggered - nothing
// in this file ever runs automatically during a normal library load, and
// nothing here touches track identity (getTrackId), so habits/playlists/
// Smart Mix are unaffected by anything done here.
//
// UI lives in src/js/ui/identifyMenu.js. This file is just the MusicBrainz
// client + the logic for applying a chosen match back onto track objects.

const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const MBID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// MusicBrainz asks that a client never exceed one request per second, and
// will 503/blocklist an IP that does. Every call is serialized through this
// single queue (with a safety margin above 1s) so a user tapping quickly
// through search results can't trip that limit.
let mbQueueTail = Promise.resolve();
function queueMusicBrainzRequest(fn) {
  const run = mbQueueTail.then(async () => {
    const result = await fn();
    await new Promise(resolve => setTimeout(resolve, 1100));
    return result;
  });
  // Keep the queue itself always resolving, even if this particular request
  // fails, so one bad request doesn't jam up everything queued behind it.
  // The caller still sees the real rejection via `run`.
  mbQueueTail = run.catch(() => {});
  return run;
}

async function musicBrainzFetch(path) {
  const url = `${MUSICBRAINZ_API_BASE}${path}${path.includes('?') ? '&' : '?'}fmt=json`;

  return queueMusicBrainzRequest(async () => {
    let response;
    try {
      response = await fetch(url, { mode: 'cors' });
    } catch (error) {
      throw new Error('Could not reach MusicBrainz. Check your internet connection.');
    }

    if (response.status === 503) {
      throw new Error('MusicBrainz is rate-limiting requests right now - wait a moment and try again.');
    }
    if (!response.ok) {
      throw new Error(`MusicBrainz returned an error (${response.status}).`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('MusicBrainz returned a response that could not be read.');
    }
  });
}

// Escapes characters that have special meaning in MusicBrainz's Lucene-style
// search syntax, so a title/artist containing e.g. a colon or parentheses
// doesn't break the query.
function luceneEscape(value) {
  return String(value || '').replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
}

function joinArtistCredit(artistCredit) {
  return (artistCredit || []).map(c => c.name).join(', ') || null;
}

function firstArtistMbid(artistCredit) {
  return artistCredit?.[0]?.artist?.id || null;
}

async function searchMusicBrainzRecordings(title, artist, album) {
  const clauses = [];
  if (title) clauses.push(`recording:"${luceneEscape(title)}"`);
  if (artist) clauses.push(`artist:"${luceneEscape(artist)}"`);
  if (album) clauses.push(`release:"${luceneEscape(album)}"`);
  if (!clauses.length) return [];

  const query = encodeURIComponent(clauses.join(' AND '));
  const data = await musicBrainzFetch(`/recording?query=${query}&limit=10`);
  const recordings = data?.recordings || [];

  return recordings.map(rec => {
    const release = (rec.releases || [])[0] || null;
    return {
      type: 'recording',
      mbid: rec.id,
      title: rec.title,
      artist: joinArtistCredit(rec['artist-credit']) || 'Unknown Artist',
      artistMbid: firstArtistMbid(rec['artist-credit']),
      album: release ? release.title : null,
      albumMbid: release ? release.id : null,
      releaseGroupMbid: release?.['release-group']?.id || null,
      year: release?.date ? release.date.slice(0, 4) : null,
      score: Number(rec.score || 0)
    };
  }).sort((a, b) => b.score - a.score);
}

async function searchMusicBrainzReleaseGroups(album, artist) {
  const clauses = [];
  if (album) clauses.push(`releasegroup:"${luceneEscape(album)}"`);
  if (artist) clauses.push(`artist:"${luceneEscape(artist)}"`);
  if (!clauses.length) return [];

  const query = encodeURIComponent(clauses.join(' AND '));
  const data = await musicBrainzFetch(`/release-group?query=${query}&limit=10`);
  const groups = data?.['release-groups'] || [];

  return groups.map(rg => ({
    type: 'release-group',
    mbid: rg.id,
    album: rg.title,
    artist: joinArtistCredit(rg['artist-credit']) || 'Unknown Artist',
    artistMbid: firstArtistMbid(rg['artist-credit']),
    year: rg['first-release-date'] ? rg['first-release-date'].slice(0, 4) : null,
    primaryType: rg['primary-type'] || null,
    score: Number(rg.score || 0)
  })).sort((a, b) => b.score - a.score);
}

async function searchMusicBrainzArtists(name) {
  if (!name) return [];
  const query = encodeURIComponent(`artist:"${luceneEscape(name)}"`);
  const data = await musicBrainzFetch(`/artist?query=${query}&limit=10`);
  const artists = data?.artists || [];

  return artists.map(a => ({
    type: 'artist',
    mbid: a.id,
    artist: a.name,
    disambiguation: a.disambiguation || null,
    country: a.country || null,
    score: Number(a.score || 0)
  })).sort((a, b) => b.score - a.score);
}

function isValidMbid(value) {
  return MBID_PATTERN.test(String(value || '').trim());
}

async function lookupMusicBrainzMbid(entityType, mbid) {
  if (!isValidMbid(mbid)) {
    throw new Error("That doesn't look like a valid MusicBrainz ID (expected a UUID, e.g. f27ec8db-af05-4dee-8b13-b04e10ca9ce1).");
  }

  const trimmed = mbid.trim();

  if (entityType === 'recording') {
    const data = await musicBrainzFetch(`/recording/${trimmed}?inc=releases+artist-credits`);
    const release = (data.releases || [])[0] || null;
    return {
      type: 'recording',
      mbid: data.id,
      title: data.title,
      artist: joinArtistCredit(data['artist-credit']) || 'Unknown Artist',
      artistMbid: firstArtistMbid(data['artist-credit']),
      album: release ? release.title : null,
      albumMbid: release ? release.id : null,
      releaseGroupMbid: release?.['release-group']?.id || null,
      year: release?.date ? release.date.slice(0, 4) : null
    };
  }

  if (entityType === 'release-group') {
    const data = await musicBrainzFetch(`/release-group/${trimmed}?inc=artist-credits`);
    return {
      type: 'release-group',
      mbid: data.id,
      album: data.title,
      artist: joinArtistCredit(data['artist-credit']) || 'Unknown Artist',
      artistMbid: firstArtistMbid(data['artist-credit']),
      year: data['first-release-date'] ? data['first-release-date'].slice(0, 4) : null,
      primaryType: data['primary-type'] || null
    };
  }

  if (entityType === 'artist') {
    const data = await musicBrainzFetch(`/artist/${trimmed}`);
    return {
      type: 'artist',
      mbid: data.id,
      artist: data.name,
      disambiguation: data.disambiguation || null,
      country: data.country || null
    };
  }

  throw new Error('Unknown MusicBrainz entity type.');
}

// --- Applying a chosen match back onto the library ------------------------

function getUnidentifiedTracks() {
  return (app.state.tracks || []).filter(track => track.needsIdentification);
}

// Tracks whose CURRENT artist+album exactly match the given track's, used to
// find "siblings" worth fixing together (e.g. every track from the same
// unidentified album folder) without needing a separate concept of
// "unidentified albums" as distinct entities.
function findAlbumSiblings(track) {
  if (!track) return [];
  const artist = (track.artist || '').toLowerCase();
  const album = (track.album || '').toLowerCase();
  return (app.state.tracks || []).filter(t =>
    t !== track &&
    (t.artist || '').toLowerCase() === artist &&
    (t.album || '').toLowerCase() === album
  );
}

function findArtistSiblings(artistName) {
  const artist = (artistName || '').toLowerCase();
  if (!artist) return [];
  return (app.state.tracks || []).filter(t => (t.artist || '').toLowerCase() === artist);
}

// Applies a recording (track-level) match to a single track. `cascadeAlbum`
// also applies the artist/album/year (never the title) to every other track
// currently sharing that track's old artist+album, so a whole "Unidentified
// Album" batch can be fixed in one go.
async function applyRecordingMatchToTrack(track, match, { cascadeAlbum = false } = {}) {
  if (!track || !match) return { updated: 0 };

  const siblings = cascadeAlbum ? findAlbumSiblings(track) : [];

  track.title = match.title || track.title;
  if (match.artist) track.artist = match.artist;
  if (match.album) track.album = match.album;
  if (match.year) track.year = match.year;
  track.needsIdentification = false;
  track.musicBrainzRecordingId = match.mbid || track.musicBrainzRecordingId || null;
  if (match.releaseGroupMbid) track.musicBrainzReleaseGroupId = match.releaseGroupMbid;
  if (match.artistMbid) track.musicBrainzArtistId = match.artistMbid;

  if (window.persistTrackMetadataOverride) await window.persistTrackMetadataOverride(track);

  siblings.forEach(sibling => {
    if (match.artist) sibling.artist = match.artist;
    if (match.album) sibling.album = match.album;
    if (match.year) sibling.year = match.year;
    sibling.needsIdentification = false;
    if (match.releaseGroupMbid) sibling.musicBrainzReleaseGroupId = match.releaseGroupMbid;
    if (match.artistMbid) sibling.musicBrainzArtistId = match.artistMbid;
    if (window.persistTrackMetadataOverride) window.persistTrackMetadataOverride(sibling);
  });

  if (window.regroupLibrary) window.regroupLibrary();

  return { updated: 1 + siblings.length };
}

// Applies an album (release-group) match to every track currently grouped
// under the given album key. Never touches track titles.
async function applyReleaseGroupMatchToAlbum(albumKey, match) {
  if (!albumKey || !match) return { updated: 0 };

  const allAlbums = app.state.albums || {};
  const albumEntry = allAlbums[albumKey];
  const tracks = albumEntry ? albumEntry.songs : [];
  if (!tracks || !tracks.length) return { updated: 0 };

  for (const track of tracks) {
    if (match.album) track.album = match.album;
    if (match.artist) track.artist = match.artist;
    if (match.year) track.year = match.year;
    track.needsIdentification = false;
    track.musicBrainzReleaseGroupId = match.mbid || track.musicBrainzReleaseGroupId || null;
    if (match.artistMbid) track.musicBrainzArtistId = match.artistMbid;
    if (window.persistTrackMetadataOverride) await window.persistTrackMetadataOverride(track);
  }

  if (window.regroupLibrary) window.regroupLibrary();

  return { updated: tracks.length };
}

// Applies an artist match to every track currently credited to `artistName`
// (case-insensitive exact match). Never touches title/album.
async function applyArtistMatchToTracks(artistName, match) {
  if (!artistName || !match) return { updated: 0 };

  const tracks = findArtistSiblings(artistName);
  for (const track of tracks) {
    track.artist = match.artist || track.artist;
    track.musicBrainzArtistId = match.mbid || track.musicBrainzArtistId || null;
    if (track.artist && track.album && track.album !== 'Unidentified Album') {
      track.needsIdentification = false;
    }
    if (window.persistTrackMetadataOverride) await window.persistTrackMetadataOverride(track);
  }

  if (window.regroupLibrary) window.regroupLibrary();

  return { updated: tracks.length };
}

window.MusicBrainzClient = {
  isValidMbid,
  searchRecordings: searchMusicBrainzRecordings,
  searchReleaseGroups: searchMusicBrainzReleaseGroups,
  searchArtists: searchMusicBrainzArtists,
  lookupByMbid: lookupMusicBrainzMbid
};

window.IdentifyTools = {
  getUnidentifiedTracks,
  findAlbumSiblings,
  findArtistSiblings,
  applyRecordingMatchToTrack,
  applyReleaseGroupMatchToAlbum,
  applyArtistMatchToTracks
};
