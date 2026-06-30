const playBtn = document.getElementById('playBtn'), 
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
let isPreloaded = false;
let isUserScrollingLyrics = false;
let lyricScrollTimeout = null;
let isSeeking = false;

// ===================================================
// AUDIO MANAGEMENT - MULTI CHANNEL HARDWARE ISOLATION
// ===================================================
let audioCtx = null;
let currentChannel = null; // Menyimpan channel yang aktif saat ini

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Objek pembuat channel audio terisolasi
function createAudioChannel(srcURL) {
    initAudioContext();
    
    const el = document.createElement('audio');
    el.crossOrigin = "anonymous";
    el.src = srcURL;
    
    const node = audioCtx.createMediaElementSource(el);
    const gain = audioCtx.createGain();
    
    node.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Default volume awal disenyapkan untuk fade-in smooth
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    return { audio: el, gainNode: gain, sourceNode: node };
}

document.addEventListener('click', () => { initAudioContext(); }, { once: true });
document.addEventListener('touchstart', () => { initAudioContext(); }, { once: true });

const savedVolume = localStorage.getItem('volume') !== null ? parseFloat(localStorage.getItem('volume')) : 0.5; 
volumeSlider.value = savedVolume; 
volumeSlider.style.background = `linear-gradient(to right, #1ed760 ${savedVolume * 100}%, #4f4f4f ${savedVolume * 100}%)`;
progressBar.style.background = `linear-gradient(to right, #ffffff 0%, #4f4f4f 0%)`;

function applyVolume(volValue) {
    if (currentChannel && audioCtx) {
        currentChannel.gainNode.gain.setValueAtTime(volValue, audioCtx.currentTime);
    }
}

function formatTime(s) { 
    if (isNaN(s)) return '0:00'; 
    const m = Math.floor(s / 60), sec = Math.floor(s % 60); 
    return `${m}:${sec < 10 ? '0' : ''}${sec}`; 
}

// Helper getter untuk menjamin kompatibilitas script luar yang ngebaca dom #mainAudio
Object.defineProperty(window, 'audio', {
    get: function() { return currentChannel ? currentChannel.audio : document.getElementById('mainAudio'); }
});

function updateMediaSessionState() {
    if ('mediaSession' in navigator && currentChannel && currentChannel.audio.duration && !isNaN(currentChannel.audio.duration)) {
        navigator.mediaSession.playbackState = currentChannel.audio.paused ? 'paused' : 'playing';
        try {
            navigator.mediaSession.setPositionState({
                duration: currentChannel.audio.duration,
                playbackRate: currentChannel.audio.playbackRate,
                position: currentChannel.audio.currentTime
            });
        } catch (e) {}
    }
}

function playAudioDirectly() {
    if (!currentChannel) return;
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
    }
    
    const targetVol = parseFloat(volumeSlider.value);
    const now = audioCtx.currentTime;
    
    currentChannel.gainNode.gain.cancelScheduledValues(now);
    currentChannel.gainNode.gain.setValueAtTime(0, now);
    currentChannel.gainNode.gain.setTargetAtTime(targetVol, now, 0.02); // Fade in micro-seconds

    currentChannel.audio.play().then(() => {
        playIcon.textContent = 'pause';
        updateMediaSessionState();
    }).catch(e => {
        console.error("Playback error:", e);
        playIcon.textContent = 'play_arrow';
    });
}

function pauseAudioDirectly() {
    if (!currentChannel || currentChannel.audio.paused) return;

    const now = audioCtx.currentTime;
    currentChannel.gainNode.gain.cancelScheduledValues(now);
    currentChannel.gainNode.gain.setValueAtTime(currentChannel.gainNode.gain.value, now);
    currentChannel.gainNode.gain.setTargetAtTime(0, now, 0.02); // Fade out lembut

    const activeAudio = currentChannel.audio;
    setTimeout(() => {
        if (currentChannel && currentChannel.audio === activeAudio) {
            currentChannel.audio.pause();
            playIcon.textContent = 'play_arrow';
            updateMediaSessionState();
        }
    }, 100);
}

function updateDynamicBackground(src) {
    if (document.hidden) return; 
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
        p.onclick = () => { 
            if(currentChannel) currentChannel.audio.currentTime = line.time; 
            isUserScrollingLyrics = false;
        }; 
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
        
        const displayTitle = track.title || "Unknown Title";
        const displayArtist = track.artist || "Unknown Artist";
        const displayCover = track.cover || "https://raw.githubusercontent.com/breakdowns/music/refs/heads/master/breakdowns.png";
        
        item.innerHTML = `<img src="${displayCover}" onerror="this.src='https://raw.githubusercontent.com/breakdowns/music/refs/heads/master/breakdowns.png'"><div><strong>${displayTitle}</strong><br><small style="color:var(--text-muted);font-size:0.8rem;">${displayArtist}</small></div>`;
        item.addEventListener('click', () => { 
            loadTrack(oIdx, true); 
        }); 
        playlistContainer.appendChild(item);
    });
}

function loadTrack(index, autoPlay = false) {
    initAudioContext();
    
    const oldChannel = currentChannel;
    const track = tracks[index];
    
    // 1. Buat kanal hardware BARU khusus untuk lagu selanjutnya (Isolasi Mutlak)
    const newChannel = createAudioChannel(track.src);
    currentChannel = newChannel; // Alihkan pointer utama ke kanal baru
    
    // Bind event listeners bawaan ke elemen audio yang baru aktif
    attachAudioEvents(newChannel.audio);

    if (oldChannel && !oldChannel.audio.paused) {
        const now = audioCtx.currentTime;
        oldChannel.gainNode.gain.cancelScheduledValues(now);
        oldChannel.gainNode.gain.setValueAtTime(oldChannel.gainNode.gain.value, now);
        oldChannel.gainNode.gain.setTargetAtTime(0, now, 0.02); // Fade out kanal lama

        // Jalankan lagu baru di background secara paralel tanpa nunggu kanal lama tabrakan
        executeTrackLoading(index);
        if (autoPlay) playAudioDirectly();

        setTimeout(() => {
            oldChannel.audio.pause();
            oldChannel.sourceNode.disconnect();
            oldChannel.gainNode.disconnect();
            oldChannel.audio.remove(); // Hancurkan wadah lama dari memori browser
        }, 120);
    } else {
        if (oldChannel) {
            oldChannel.audio.pause();
            oldChannel.audio.remove();
        }
        executeTrackLoading(index);
        if (autoPlay) playAudioDirectly();
    }
}

function executeTrackLoading(index) {
    isChangingTrack = true;
    isUserScrollingLyrics = false;
    isPreloaded = false; 
    
    if (!document.hidden) {
        trackTitle.classList.add('shimmer-loading');
        trackArtist.classList.add('shimmer-loading');
        trackCover.classList.add('shimmer-loading');
    }

    currentIndex = index; 
    localStorage.setItem('currentIndex', index); 
    const track = tracks[index];
    
    trackTitle.textContent = track.title || "Unknown Title"; 
    trackArtist.textContent = track.artist || "Unknown Artist"; 
    trackCover.src = track.cover || "https://raw.githubusercontent.com/breakdowns/music/refs/heads/master/breakdowns.png"; 
    
    progressBar.value = 0;
    progressBar.style.background = `linear-gradient(to right, #ffffff 0%, #4f4f4f 0%)`;
    currentTimeEl.textContent = '0:00'; 
    durationEl.textContent = lastKnownDurationText;

    lyricsContainer.style.opacity = '0';
    
    if (typeof updateMediaSession === 'function') {
        updateMediaSession(); 
    }

    const currentTrackSrc = track.src;
    const fadeOutAnim = new Promise(resolve => setTimeout(resolve, 300));

    if (track.lyricsSrc) {
        Promise.all([
            fetch(track.lyricsSrc, { cache: "force-cache" }).then(res => {
                if (!res.ok) throw new Error("Network");
                return res.text();
            }),
            fadeOutAnim
        ])
        .then(([text]) => { 
            if (tracks[currentIndex].src !== currentTrackSrc) return;
            
            parsedLyrics = parseLRC(text); 
            lyricsContainer.scrollTop = 0;
            lyricsWrapper.innerHTML = ''; 
            parsedLyrics.length > 0 ? renderLyrics() : renderStaticLyrics(text); 
            
            lyricsContainer.style.display = "block"; 
            void lyricsWrapper.offsetWidth; 
            lyricsContainer.style.opacity = '1';
            isChangingTrack = false;
        })
        .catch(() => {
            fadeOutAnim.then(() => {
                if (tracks[currentIndex].src === currentTrackSrc) {
                    parsedLyrics = [];
                    lyricsContainer.scrollTop = 0;
                    lyricsWrapper.innerHTML = '';
                    lyricsContainer.style.display = "none";
                    isChangingTrack = false;
                }
            });
        });
    } else { 
        fadeOutAnim.then(() => {
            if (tracks[currentIndex].src !== currentTrackSrc) return;
            parsedLyrics = [];
            lyricsContainer.scrollTop = 0;
            lyricsWrapper.innerHTML = '';
            lyricsContainer.style.display = "none";
            isChangingTrack = false;
        });
    }
    
    renderPlaylist(currentTracksDisplay); 
    updateDynamicBackground(track.cover || "https://raw.githubusercontent.com/breakdowns/music/refs/heads/master/breakdowns.png");

    if (currentChannel) {
        applyVolume(parseFloat(volumeSlider.value));
    }

    if (!document.hidden) {
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
}

function playNextTrack() {
    let n = currentIndex + 1; 
    if (isShuffle) n = Math.floor(Math.random() * tracks.length); 
    else if (n >= tracks.length) n = 0; 
    
    loadTrack(n, true); 
}

function playPrevTrack() {
    let n;
    if (isShuffle) {
        n = Math.floor(Math.random() * tracks.length);
    } else {
        n = currentIndex - 1; if (n < 0) n = tracks.length - 1; 
    }
    loadTrack(n, true); 
}

fetch('playlist.json')
    .then(res => res.json())
    .then(data => { 
        tracks = data.playlist; 
        currentTracksDisplay = tracks; 
        const savedIndex = parseInt(localStorage.getItem('currentIndex')) || 0; 
        if (tracks.length > 0) loadTrack(savedIndex >= 0 && savedIndex < tracks.length ? savedIndex : 0); 
    });

// ==========================================
// DYNAMIC EVENT BINDING FOR ACTIVE AUDIO TAG
// ==========================================
function attachAudioEvents(targetAudio) {
    targetAudio.addEventListener('canplay', () => {
        if (targetAudio.duration && !isNaN(targetAudio.duration)) {
            lastKnownDurationText = formatTime(targetAudio.duration);
            durationEl.textContent = lastKnownDurationText;
        }
        trackTitle.classList.remove('shimmer-loading');
        trackArtist.classList.remove('shimmer-loading');
        trackCover.classList.remove('shimmer-loading');
    });

    targetAudio.addEventListener('waiting', () => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
    });

    targetAudio.addEventListener('playing', () => {
        if (targetAudio.duration && !isNaN(targetAudio.duration)) {
            lastKnownDurationText = formatTime(targetAudio.duration);
            durationEl.textContent = lastKnownDurationText;
        }
        updateMediaSessionState();
    });

    targetAudio.addEventListener('pause', () => { updateMediaSessionState(); });

    targetAudio.addEventListener('loadedmetadata', () => { 
        if (targetAudio.duration && !isNaN(targetAudio.duration)) {
            lastKnownDurationText = formatTime(targetAudio.duration);
            durationEl.textContent = lastKnownDurationText; 
        }
    });

    targetAudio.addEventListener('error', () => {
        durationEl.textContent = lastKnownDurationText;
        trackTitle.classList.remove('shimmer-loading');
        trackArtist.classList.remove('shimmer-loading');
        trackCover.classList.remove('shimmer-loading');
    });

    targetAudio.addEventListener('timeupdate', () => {
        if (!targetAudio.duration) return; 
        
        const currentPercentage = (targetAudio.currentTime / targetAudio.duration) * 100;
        if (!isSeeking) {
            progressBar.value = currentPercentage;
            progressBar.style.background = `linear-gradient(to right, #1ed760 ${currentPercentage}%, #4f4f4f ${currentPercentage}%)`;
            currentTimeEl.textContent = formatTime(targetAudio.currentTime); 
        }
        
        if (targetAudio.duration - targetAudio.currentTime <= 20 && !isPreloaded && !isRepeat) {
            isPreloaded = true;
            let nextIdx = currentIndex + 1;
            if (isShuffle) nextIdx = Math.floor(Math.random() * tracks.length);
            else if (nextIdx >= tracks.length) nextIdx = 0;
            
            if (tracks[nextIdx] && tracks[nextIdx].lyricsSrc) {
                fetch(tracks[nextIdx].lyricsSrc, { cache: "force-cache" }).catch(() => {});
            }
        }

        if (document.hidden) return;
        if (isChangingTrack || parsedLyrics.length === 0) return;

        if (parsedLyrics.length > 0) {
            const activeIndex = parsedLyrics.findLastIndex(l => targetAudio.currentTime >= l.time);
            const lines = document.querySelectorAll('.lyric-line');
            lines.forEach((el, i) => { el.classList.toggle('active', i === activeIndex); });
            
            if (!isUserScrollingLyrics && activeIndex !== -1 && lines[activeIndex]) {
                const activeLine = lines[activeIndex];
                const containerHeight = lyricsContainer.clientHeight;
                const scrollAmount = activeLine.offsetTop - (containerHeight / 2) + (activeLine.clientHeight / 2);
                lyricsContainer.scrollTop = scrollAmount;
            }
        }
    });

    targetAudio.addEventListener('ended', () => { 
        if (isRepeat) {
            targetAudio.play();
        } else {
            playNextTrack();
        }
    });
}

searchBar.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim(); 
    currentTracksDisplay = tracks.filter(t => (t.title && t.title.toLowerCase().includes(q)) || (t.artist && t.artist.toLowerCase().includes(q))); 
    renderPlaylist(currentTracksDisplay); 
});

trackCover.addEventListener('error', () => {
    trackCover.src = "https://raw.githubusercontent.com/breakdowns/music/refs/heads/master/breakdowns.png";
});

playBtn.addEventListener('click', () => { 
    initAudioContext();
    if (currentChannel) {
        currentChannel.audio.paused ? playAudioDirectly() : pauseAudioDirectly(); 
    }
});

nextBtn.addEventListener('click', () => { initAudioContext(); playNextTrack(); });
prevBtn.addEventListener('click', () => { initAudioContext(); playPrevTrack(); });

shuffleBtn.addEventListener('click', () => { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); });
repeatBtn.addEventListener('click', () => { isRepeat = !isRepeat; repeatBtn.classList.toggle('active', isRepeat); });

volumeSlider.addEventListener('input', (e) => { 
    const v = e.target.value; 
    applyVolume(v);
    localStorage.setItem('volume', v); 
    volumeSlider.style.background = `linear-gradient(to right, #1ed760 ${v * 100}%, #4f4f4f ${v * 100}%)`; 
});

const triggerUserScroll = () => {
    isUserScrollingLyrics = true;
    if (lyricScrollTimeout) clearTimeout(lyricScrollTimeout);
    lyricScrollTimeout = setTimeout(() => {
        isUserScrollingLyrics = false;
    }, 2000);
};

lyricsContainer.addEventListener('touchstart', triggerUserScroll, {passive: true});
lyricsContainer.addEventListener('mousedown', triggerUserSc
