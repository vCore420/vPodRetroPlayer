// --- FILE HANDLING, ALBUM GROUPING, ETC. ---

function updateLoadingCounter(loaded, total) {
  const counter = document.getElementById('loadingCounter');
  if (counter) counter.textContent = `Loaded ${loaded} of ${total} songs`;
}

function handleFiles(e) {
  console.log("Handling files:", e.target.files);

  // Reset all global state
  tracks = [];
  albums = {};
  currentTrack = null;
  currentAlbumSongs = [];
  currentSongIndex = -1;
  albumCoverURLs.forEach(url => URL.revokeObjectURL(url));
  albumCoverURLs = [];

  // Check for tracks-meta.json first
  const files = Array.from(e.target.files);
  const metaFile = files.find(f => f.name === 'tracks-meta.json');
  const audioFiles = files.filter(f => f.name.match(/\.(mp3|flac)$/i));
  
  if (metaFile) {
  const reader = new FileReader();
  reader.onload = function(ev) {
    const meta = JSON.parse(ev.target.result);
    tracks = [];
    meta.tracks.forEach(metaTrack => {
      const file = audioFiles.find(f => f.name === metaTrack.fileName);
      if (file) {
        tracks.push({
          ...metaTrack,
          file
        });
      }
    });
    if (tracks.length === 0) {
      alert("No matching audio files found for metadata. Please upload your music files along with tracks-meta.json.");
      return;
    }
    groupTracksByAlbum(true);
  };
  reader.readAsText(metaFile);
  return;
}

  // No meta file, proceed with normal handling
  const cueFiles = files.filter(f => f.name.match(/\.cue$/i));
  const imageFiles = files.filter(f => f.name.match(/\.(jpg|jpeg)$/i));
  window.imageFiles = window.imageFiles ? window.imageFiles.concat(imageFiles) : imageFiles;

  // Show loading screen
  renderLoadingScreen("Loading your music...");

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
    if (total === 0) {
      console.log("No audio files, only cue tracks:", cueTracks);
      cueTracks.forEach(ct => {
        if (!tracks.some(t =>
          t.file.name === ct.file.name &&
          t.file.size === ct.file.size
        )) {
          tracks.push(ct);
        }
      });
      groupTracksByAlbum();
      return;
    }
    audioFiles.forEach(file => {
      window.jsmediatags.read(file, {
        onSuccess: tag => {
          const { title, artist, album, genre } = tag.tags;
          console.log("Read tags for:", file.name, tag.tags);
          if (!tracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            tracks.push({
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
              if (!tracks.some(t =>
                t.file.name === ct.file.name &&
                t.file.size === ct.file.size
              )) {
                tracks.push(ct);
              }
            });
            groupTracksByAlbum();
          }
        },
        onError: () => {
          console.log("Error reading tags for:", file.name);
          if (!tracks.some(t => t.file.name === file.name && t.file.size === file.size)) {
            tracks.push({
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
              if (!tracks.some(t =>
                t.file.name === ct.file.name &&
                t.file.size === ct.file.size
              )) {
                tracks.push(ct);
              }
            });
            groupTracksByAlbum();
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

function groupTracksByAlbum(skipPrompt = false) {
  console.log("Grouping tracks by album...");
  albums = {};

  const folderImages = {};
  if (window.imageFiles && window.imageFiles.length) {
    window.imageFiles.forEach(img => {
      const folder = getFolderPath(img);
      if (!folderImages[folder]) folderImages[folder] = img;
    });
    console.log("Folder images map:", folderImages);
  }

  tracks.forEach(track => {
    const album = track.album || 'Unidentified Album';
    if (!albums[album]) {
      albums[album] = { artist: track.artist, cover: null, songs: [], folder: getFolderPath(track.file) };
    }
    albums[album].songs.push(track);
  });

  Object.keys(albums).forEach(albumName => {
    const albumObj = albums[albumName];
    const folder = albumObj.folder;
    let coverFile = null;

    if (folderImages[folder]) {
      coverFile = folderImages[folder];
    }

    if (albumObj.cover && albumObj.cover.startsWith("blob:")) {
      URL.revokeObjectURL(albumObj.cover);
    }

    albumObj.cover = coverFile
      ? (() => {
          const url = URL.createObjectURL(coverFile);
          albumCoverURLs.push(url); // Track this URL
          return url;
        })()
      : "src/img/default-cover.png";
    console.log(`Album "${albumName}" assigned cover:`, albumObj.cover);
  });
  
  if (skipPrompt) {
    goBack();
  } else {
    renderSaveMetadataPrompt();
  }

  console.log("Albums grouped:", albums);
}