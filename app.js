const audio = document.getElementById('mainAudio'), 
      playBtn = document.getElementById('playBtn'), 
      playIcon = document.getElementById('playIcon'), 
      prevBtn = document.getElementById('prevBtn'), 
      nextBtn = document.getElementById('nextBtn'), 
      shuffleBtn = document.getElementById('shuffleBtn'), 
      repeatBtn = document.getElementById('repeatBtn');

const trackTitle = document.getElementById('trackTitle'), 
      trackArtist = document.getElementById('trackArtist'), 
      trackCover = document.getElementById('trackCover'), 
      lyricsWrapper = document.getElementById('lyricsWrapper'), 
      lyricsContainer = document.getElementById('lyricsContainer'), 
      progressContainer = document.getElementById('progressContainer'), 
      progressBar = document.getElementById('progressBar'), 
      currentTimeEl = document.getElementById('currentTime'), 
      durationEl = document.getElementById('duration'), 
      volumeSlider = document.getElementById('volumeSlider'), 
      playlistContainer = document.getElementById('playlist'), 
      searchBar = document.getElementById('searchBar');

let tracks = [], currentTracksDisplay = [], parsedLyrics = [];
let currentIndex = 0, isShuffle = false, isRepeat = false;

let isChangingTrack = false;
let lastKnownDurationText = '0:00';

const savedVolume = localStorage.getItem('volume') || 1; 
audio.volume = savedVolume; 
volumeSlider.value = savedVolume; 
volumeSlider.style.background = `linear-gradient(to right, var(--spotify-green) ${savedVolume * 100}%, #4f4f4f ${savedVolume * 100}%)`;

function formatTime(s) { 
    if (isNaN(s)) return '0:00'; 
    const m = Math.floor(s / 60), sec = Math.floor(s % 60); 
    return `${m}:${sec < 10 ? '0' : ''}${sec}`; 
}

function updateMediaSession() {
    if ('mediaSession' in navigator) {
        const track = tracks[currentIndex];
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'Breakdowns Music',
            artwork: [
                { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            playAudioWithFade();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            pauseAudioWithFade();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            let p = currentIndex - 1; if (p < 0) p = tracks.length - 1;
            loadTrack(p); 
            playAudioWithFade();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            playNextTrack();
        });

        try {
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.fastSeek && 'fastSeek' in audio) {
                    audio.fastSeek(details.seekTime);
                } else {
                    audio.currentTime = details.seekTime;
                }
                updateMediaSessionState();
            });
        } catch (e) {}
    }
}

function updateMediaSessionState() {
    if ('mediaSession' in navigator && audio.duration && !isNaN(audio.duration)) {
        navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
        try {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
            });
        } catch (e) {}
    }
}

// Trik peredam suara 'tet' instan tanpa Web Audio API
function playAudioWithFade() {
    const targetVol = parseFloat(localStorage.getItem('volume') || 1);
    audio.volume = 0;
    audio.play().then(() => {
        playIcon.textContent = 'pause';
        // Fade in sangat cepat menggunakan interval bawaan (aman & enteng)
        let v = 0;
        const fIn = setInterval(() => {
            v += 0.2;
            if (v >= targetVol) {
                audio.volume = targetVol;
                clearInterval(fIn);
            } else {
                audio.volume = v;
            }
        }, 10);
    });
}

function pauseAudioWithFade() {
    const startVol = audio.volume;
    let v = startVol;
    // Turunkan volume ke 0 dengan cepat dalam waktu ~40ms sebelum klik pause dieksekusi
    const fOut = setInterval(() => {
        v -= 0.2;
        if (v <= 0) {
            audio.volume = 0;
            clearInterval(fOut);
            audio.pause();
            playIcon.textContent = 'play_arrow';
            audio.volume = startVol; // Kembalikan nilai aslinya setelah pause
        } else {
            audio.volume = v;
        }
    }, 10);
}

function updateDynamicBackground(src) {
    const img = new Image(); 
    img.crossOrigin = "Anonymous"; 
    img.src = src;
    img.onload = () => { 
        try { 
            const cH = document.createElement('canvas'), ctxH = cH.getContext('2d'); 
            cH.width = 1; cH.height = 1; 
            ctxH.drawImage(img, 0, 0, 1, 1); 
            const [r, g, b] = ctxH.getImageData(0, 0, 1, 1).data; 
            document.body.style.setProperty('--dynamic-r', Math.max(12, Math.min(r, 45))); 
            document.body.style.setProperty('--dynamic-g', Math.max(12, Math.min(g, 45))); 
            document.body.style.setProperty('--dynamic-b', Math.max(12, Math.min(b, 45))); 
        } catch (e) {} 
    };
}

function parseLRC(text) { 
    const res = []; 
    text.split('\n').forEach(l => { 
        const matches = [...l.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\]/g)]; 
        matches.forEach(m => { 
            const t = parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseInt(m[3]) / 100 : 0), 
                  txt = l.replace(/\[.*?\]/g, '').trim(); 
            if (txt) res.push({ time: t, text: txt }); 
        }); 
    }); 
    return res.sort((a, b) => a.time - b.time); 
}

function renderLyrics() { 
    parsedLyrics.forEach((line, i) => { 
        const p = document.createElement('p'); 
        p.className = 'lyric-line'; 
        p.id = `line-${i}`; 
        p.textContent = line.text; 
        p.onclick = () => { audio.currentTime = line.time; }; 
        lyricsWrapper.appendChild(p); 
    }); 
}

function renderStaticLyrics(text) { 
    text.split('\n').forEach(l => { 
        const c = l.replace(/\[.*?\]/g, '').trim(); 
        if (c) { 
            const p = document.createElement('p'); 
            p.className = 'lyric-line active'; 
            p.textContent = c; 
            lyricsWrapper.appendChild(p); 
        } 
    }); 
}

function renderPlaylist(arr) {
    playlistContainer.innerHTML = ''; 
    arr.forEach((track) => {
        const oIdx = tracks.findIndex(t => t.src === track.src), 
              item = document.createElement('div');
        item.className = `track-item ${oIdx === currentIndex ? 'active' : ''}`;
        item.innerHTML = `<img src="${track.cover}"><div><strong>${track.title}</strong><br><small style="color:var(--text-muted);font-size:0.8rem;">${track.artist}</small></div>`;
        item.addEventListener('click', () => { 
            loadTrack(oIdx); 
            playAudioWithFade();
        }); 
        playlistContainer.appendChild(item);
    });
}

function loadTrack(index) {
    isChangingTrack = true;
    parsedLyrics = [];
    
    trackTitle.classList.add('shimmer-loading');
    trackArtist.classList.add('shimmer-loading');
    trackCover.classList.add('shimmer-loading');
    
    audio.pause();
    audio.src = "";
    audio.load();

    currentIndex = index; 
    localStorage.setItem('currentIndex', index); 
    const track = tracks[index];
    
    trackTitle.textContent = track.title; 
    trackArtist.textContent = track.artist; 
    trackCover.src = track.cover; 
    
    progressBar.style.width = '0%'; 
    currentTimeEl.textContent = '0:00'; 
    durationEl.textContent = lastKnownDurationText;

    lyricsContainer.style.opacity = '0';
    lyricsWrapper.style.transition = 'none';
    lyricsWrapper.style.transform = 'translateY(0px)';
    lyricsWrapper.innerHTML = ''; 
    
    audio.crossOrigin = "anonymous";
    audio.src = track.src;
    
    const currentTrackSrc = track.src;
    if (track.lyricsSrc) {
        fetch(track.lyricsSrc)
            .then(res => res.text())
            .then(text => { 
                if (tracks[currentIndex].src !== currentTrackSrc) return;
                
                parsedLyrics = parseLRC(text); 
                lyricsWrapper.innerHTML = ''; 
                parsedLyrics.length > 0 ? renderLyrics() : renderStaticLyrics(text); 
                
                lyricsContainer.style.display = "block"; 
                void lyricsWrapper.offsetWidth; 
                lyricsContainer.style.opacity = '1';
                lyricsWrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                isChangingTrack = false;
            })
            .catch(() => {
                if (tracks[currentIndex].src === currentTrackSrc) {
                    lyricsWrapper.innerHTML = '';
                    lyricsContainer.style.display = "none";
                    isChangingTrack = false;
                }
            });
    } else { 
        parsedLyrics = [];
        lyricsWrapper.innerHTML = '';
        lyricsContainer.style.display = "none";
        isChangingTrack = false;
    }
    
    renderPlaylist(currentTracksDisplay); 
    updateDynamicBackground(track.cover);
    updateMediaSession();

    setTimeout(() => {
        const trackTitleEl = document.getElementById('trackTitle');
        const trackInfoEl = document.querySelector('.track-info');
        if (trackTitleEl && trackInfoEl) {
            const parentWidth = trackInfoEl.clientWidth;
            const textWidth = trackTitleEl.scrollWidth;
            
            if (textWidth > parentWidth) {
                const jarakGeser = parentWidth - textWidth - 25; 
                trackTitleEl.style.setProperty('--marquee-jarak', `${jarakGeser}px`);
                trackTitleEl.style.animation = 'marqueeDinamis 8s linear infinite alternate';
                trackTitleEl.style.paddingRight = '25px';
            } else {
                trackTitleEl.style.animation = 'none';
                trackTitleEl.style.paddingRight = '0px';
            }
        }
    }, 100);
}

function playNextTrack() {
    let n = currentIndex + 1; 
    if (isShuffle) n = Math.floor(Math.random() * tracks.length); 
    else if (n >= tracks.length) n = 0; 
    loadTrack(n); 
    playAudioWithFade();
}

fetch('playlist.json')
    .then(res => res.json())
    .then(data => { 
        tracks = data.playlist; 
        currentTracksDisplay = tracks; 
        const savedIndex = parseInt(localStorage.getItem('currentIndex')) || 0; 
        if (tracks.length > 0) loadTrack(savedIndex >= 0 && savedIndex < tracks.length ? savedIndex : 0); 
    });

audio.addEventListener('canplay', () => {
    if (audio.duration && !isNaN(audio.duration)) {
        lastKnownDurationText = formatTime(audio.duration);
        durationEl.textContent = lastKnownDurationText;
    }
    trackTitle.classList.remove('shimmer-loading');
    trackArtist.classList.remove('shimmer-loading');
    trackCover.classList.remove('shimmer-loading');
});

audio.addEventListener('playing', () => {
    if (audio.duration && !isNaN(audio.duration)) {
        lastKnownDurationText = formatTime(audio.duration);
        durationEl.textContent = lastKnownDurationText;
    }
    updateMediaSessionState();
});

audio.addEventListener('pause', () => {
    updateMediaSessionState();
});

audio.addEventListener('loadedmetadata', () => { 
    if (audio.duration && !isNaN(audio.duration)) {
        lastKnownDurationText = formatTime(audio.duration);
        durationEl.textContent = lastKnownDurationText; 
    }
});

searchBar.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase(); 
    currentTracksDisplay = tracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)); 
    renderPlaylist(currentTracksDisplay); 
});

audio.addEventListener('error', () => {
    durationEl.textContent = lastKnownDurationText;
    trackTitle.classList.remove('shimmer-loading');
    trackArtist.classList.remove('shimmer-loading');
    trackCover.classList.remove('shimmer-loading');
});

playBtn.addEventListener('click', () => { 
    audio.paused ? playAudioWithFade() : pauseAudioWithFade();
});

nextBtn.addEventListener('click', () => {
    playNextTrack();
});

prevBtn.addEventListener('click', () => { 
    let p = currentIndex - 1; 
    if (p < 0) p = tracks.length - 1; 
    loadTrack(p); 
    playAudioWithFade();
});

shuffleBtn.addEventListener('click', () => { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); });
repeatBtn.addEventListener('click', () => { isRepeat = !isRepeat; repeatBtn.classList.toggle('active', isRepeat); });

volumeSlider.addEventListener('input', (e) => { 
    const v = e.target.value; 
    audio.volume = v; 
    localStorage.setItem('volume', v); 
    volumeSlider.style.background = `linear-gradient(to right, var(--spotify-green) ${v * 100}%, #4f4f4f ${v * 100}%)`; 
});

audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return; 
    progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    
    if (!document.hidden) {
        currentTimeEl.textContent = formatTime(audio.currentTime); 
    }

    if (isChangingTrack || parsedLyrics.length === 0) return;
    if (document.hidden) return;

    if (parsedLyrics.length > 0) {
        const activeIndex = parsedLyrics.findLastIndex(l => audio.currentTime >= l.time);
        const lines = document.querySelectorAll('.lyric-line');
        lines.forEach((el, i) => { el.classList.toggle('active', i === activeIndex); });
        if (activeIndex !== -1 && lines[activeIndex]) {
            const activeLine = lines[activeIndex], containerHeight = lyricsContainer.clientHeight, offsetTop = activeLine.offsetTop, lineHeight = activeLine.clientHeight;
            const scrollAmount = offsetTop - (containerHeight / 2) + (lineHeight / 2);
            lyricsWrapper.style.transform = `translateY(${-scrollAmount}px)`;
        }
    }
});

progressContainer.addEventListener('click', (e) => {
    if (audio.duration) {
        const clickX = e.offsetX;
        const totalWidth = progressContainer.clientWidth;
        audio.currentTime = (clickX / totalWidth) * audio.duration;
        updateMediaSessionState();
    }
});

audio.addEventListener('ended', () => { 
    isRepeat ? audio.play() : playNextTrack(); 
});
