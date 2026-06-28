// ========================================================
// APP.JS - BREAKDOWNS MUSIC (RACE CONDITION & AUTO-LOAD FIX)
// ========================================================

const audio = document.getElementById('mainAudio'), 
      playBtn = document.getElementById('playBtn'), 
      playIcon = document.getElementById('playIcon'), 
      prevBtn = document.getElementById('prevBtn'), 
      nextBtn = document.getElementById('nextBtn'), 
      shuffleBtn = document.getElementById('shuffleBtn'), 
      repeatBtn = document.getElementById('repeatBtn'), 
      favoriteBtn = document.getElementById('favoriteBtn');

const trackTitle = document.getElementById('trackTitle'), 
      trackArtist = document.getElementById('trackArtist'), 
      trackCover = document.getElementById('trackCover'), 
      canvas = document.getElementById('visualizer'), 
      ctx = canvas.getContext('2d'), 
      lyricsWrapper = document.getElementById('lyricsWrapper'), 
      lyricsContainer = document.getElementById('lyricsContainer'), 
      progressContainer = document.getElementById('progressContainer'), 
      progressBar = document.getElementById('progressBar'), 
      currentTimeEl = document.getElementById('currentTime'), 
      durationEl = document.getElementById('duration'), 
      volumeSlider = document.getElementById('volumeSlider'), 
      playlistContainer = document.getElementById('playlist'), 
      searchBar = document.getElementById('searchBar');

let tracks = [], currentTracksDisplay = [], parsedLyrics = [], audioCtx, analyser, dataArray;
let currentIndex = 0, isShuffle = false, isRepeat = false;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

let isChangingTrack = false; 
let currentLyricIndex = -1; 
let temporaryTextStorage = ""; 
let isLyricsFetched = false; // FLAG BARU: Mengawasi apakah lirik sudah beres di-download

const savedVolume = localStorage.getItem('volume') || 1; 
audio.volume = savedVolume; 
volumeSlider.value = savedVolume; 
volumeSlider.style.background = `linear-gradient(to right, var(--spotify-green) ${savedVolume * 100}%, #4f4f4f ${savedVolume * 100}%)`;

fetch('playlist.json')
    .then(res => res.json())
    .then(data => { 
        tracks = data.playlist; 
        currentTracksDisplay = tracks; 
        const savedIndex = parseInt(localStorage.getItem('currentIndex')) || 0; 
        if (tracks.length > 0) loadTrack(savedIndex >= 0 && savedIndex < tracks.length ? savedIndex : 0); 
    });

function loadTrack(index) {
    isChangingTrack = true; 
    currentLyricIndex = -1; 
    parsedLyrics = []; 
    temporaryTextStorage = "";
    isLyricsFetched = false; // Reset status lirik tiap ganti lagu

    currentIndex = index; 
    localStorage.setItem('currentIndex', index); 
    const track = tracks[index];
    
    trackTitle.textContent = track.title; 
    trackArtist.textContent = track.artist; 
    trackCover.src = track.cover; 
    
    audio.crossOrigin = "anonymous"; 
    audio.src = track.src;
    
    progressBar.style.width = '0%'; 
    currentTimeEl.textContent = '0:00'; 
    durationEl.textContent = '0:00';

    // Munculkan Spinner Loading
    lyricsContainer.style.opacity = '1';
    lyricsContainer.scrollTop = 0;
    lyricsWrapper.innerHTML = `
        <div class="lyrics-loader">
            <div class="spinner"></div>
            <p>Memuat musik...</p>
        </div>
    `;

    const currentTrackSrc = track.src;
    if (track.lyricsSrc) {
        fetch(track.lyricsSrc)
            .then(res => res.text())
            .then(text => { 
                if (tracks[currentIndex].src !== currentTrackSrc) return;
                
                parsedLyrics = parseLRC(text); 
                temporaryTextStorage = text;
                isLyricsFetched = true; // Tandai lirik sudah di tangan
                lyricsContainer.style.display = "block";
                
                // ANTI-BALAPAN: Jika lagu ternyata sudah siap LEBIH DULU dari lirik, langsung eksekusi!
                if (audio.readyState >= 3) {
                    finalizeLyrics();
                }
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
    
    const isFav = favorites.includes(track.src);
    favoriteBtn.classList.toggle('active', isFav); 
    favoriteBtn.querySelector('.material-icons').textContent = isFav ? 'favorite' : 'favorite_border';
    
    renderPlaylist(currentTracksDisplay); 
    updateDynamicBackground(track.cover);

    setTimeout(() => {
        const marqueeContainer = document.querySelector('.marquee-container');
        const trackTitleEl = document.getElementById('trackTitle');
        const trackInfoEl = document.querySelector('.track-info');
        if (marqueeContainer && trackTitleEl && trackInfoEl) {
            const parentWidth = trackInfoEl.clientWidth;
            const textWidth = trackTitleEl.scrollWidth;
            if (textWidth > parentWidth) {
                trackTitleEl.style.animation = 'marqueeSpotify 12s linear infinite';
                trackTitleEl.style.paddingRight = '50px';
            } else {
                trackTitleEl.style.animation = 'none';
                trackTitleEl.style.paddingRight = '0px';
            }
        }
    }, 50);
}

// ==========================================
// FUNGSI EKSEKUTOR (MENGHANCURKAN SPINNER)
// ==========================================

// Gunakan 'canplay' bukan 'playing'. Ini akan me-render lirik walau lagu posisi pause (saat baru buka web)
audio.addEventListener('canplay', () => {
    // ANTI-BALAPAN: Pastikan lirik sudah selesai di-fetch sebelum spinner dihancurkan
    if (isChangingTrack && isLyricsFetched) {
        finalizeLyrics();
    }
});

function finalizeLyrics() {
    if (!isChangingTrack) return; 
    isChangingTrack = false; // Buka kunci pergeseran scroll lirik
    
    lyricsWrapper.innerHTML = ''; // Hancurkan icon loading spinner
    
    if (parsedLyrics.length > 0) {
        renderLyrics();
        
        // Pemanis: Warnai baris pertama sesaat setelah dirender agar tidak pucat
        const lines = document.querySelectorAll('.lyric-line');
        if(lines.length > 0 && audio.currentTime === 0) {
             lines[0].classList.add('active');
        }
    } else if (temporaryTextStorage) {
        renderStaticLyrics(temporaryTextStorage);
    }
}

// ==========================================
// SISA LOGIKA MUSIC PLAYER
// ==========================================

audio.addEventListener('loadedmetadata', () => { 
    durationEl.textContent = formatTime(audio.duration); 
    if (typeof updateMediaSession === 'function') updateMediaSession(); 
});

function renderPlaylist(arr) {
    playlistContainer.innerHTML = ''; 
    arr.forEach((track) => {
        const oIdx = tracks.findIndex(t => t.src === track.src), 
              item = document.createElement('div');
        item.className = `track-item ${oIdx === currentIndex ? 'active' : ''}`;
        item.innerHTML = `<img src="${track.cover}"><div><strong>${track.title}</strong><br><small style="color:var(--text-muted);font-size:0.8rem;">${track.artist}</small></div>`;
        item.addEventListener('click', () => { 
            initVisualizer(); 
            loadTrack(oIdx); 
            audio.play().then(() => playIcon.textContent = 'pause'); 
        }); 
        playlistContainer.appendChild(item);
    });
}

searchBar.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase(); 
    currentTracksDisplay = tracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)); 
    renderPlaylist(currentTracksDisplay); 
});

favoriteBtn.addEventListener('click', () => { 
    const src = tracks[currentIndex].src; 
    if (favorites.includes(src)) { favorites = favorites.filter(f => f !== src); } else { favorites.push(src); } 
    const isFav = favorites.includes(src);
    favoriteBtn.classList.toggle('active', isFav); 
    favoriteBtn.querySelector('.material-icons').textContent = isFav ? 'favorite' : 'favorite_border'; 
    localStorage.setItem('favorites', JSON.stringify(favorites)); 
});

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

function initVisualizer() { 
    if (audioCtx) return; 
    audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
    analyser = audioCtx.createAnalyser(); 
    audioCtx.createMediaElementSource(audio).connect(analyser); 
    analyser.connect(audioCtx.destination); 
    analyser.fftSize = 64; 
    dataArray = new Uint8Array(analyser.frequencyBinCount); 
    drawVisualizer(); 
}

function drawVisualizer() { 
    requestAnimationFrame(drawVisualizer); 
    if (!analyser) return; 
    if (canvas.width !== canvas.clientWidth) { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; } 
    analyser.getByteFrequencyData(dataArray); 
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    const w = (canvas.width / dataArray.length) * 1.4; 
    dataArray.forEach((val, i) => { 
        const h = val / 3.5, grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - h); 
        grad.addColorStop(0, 'rgba(30, 215, 96, 0.9)'); 
        grad.addColorStop(1, 'rgba(102, 255, 153, 0.4)'); 
        ctx.fillStyle = grad; 
        ctx.beginPath(); 
        ctx.roundRect(i * (w + 3), canvas.height - h, w, h, [4, 4, 0, 0]); 
        ctx.fill(); 
    }); 
}

playBtn.addEventListener('click', () => { 
    initVisualizer(); 
    audio.paused ? audio.play().then(() => playIcon.textContent = 'pause') : (audio.pause(), playIcon.textContent = 'play_arrow'); 
    if (typeof updateMediaSession === 'function') updateMediaSession();
});

function playNextTrack() {
    let n = currentIndex + 1; 
    if (isShuffle) n = Math.floor(Math.random() * tracks.length); else if (n >= tracks.length) n = 0; 
    loadTrack(n); 
    audio.play().then(() => playIcon.textContent = 'pause'); 
}

nextBtn.addEventListener('click', playNextTrack);
prevBtn.addEventListener('click', () => { 
    let p = currentIndex - 1; 
    if (p < 0) p = tracks.length - 1; 
    loadTrack(p); 
    audio.play().then(() => playIcon.textContent = 'pause'); 
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
    currentTimeEl.textContent = formatTime(audio.currentTime); 
    progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    
    if (isChangingTrack || parsedLyrics.length === 0) return;

    const newIndex = parsedLyrics.findLastIndex(l => audio.currentTime >= l.time);

    if (newIndex !== -1 && newIndex !== currentLyricIndex) {
        currentLyricIndex = newIndex; 
        const lines = lyricsWrapper.children; 
        
        if (lines[newIndex]) {
            for (let i = 0; i < lines.length; i++) {
                lines[i].className = 'lyric-line';
            }
            lines[newIndex].className = 'lyric-line active';
            
            const activeLine = lines[newIndex], 
                  containerHeight = lyricsContainer.clientHeight, 
                  offsetTop = activeLine.offsetTop, 
                  lineHeight = activeLine.clientHeight;
                  
            const scrollAmount = offsetTop - (containerHeight / 2) + (lineHeight / 2);
            
            lyricsContainer.scrollTo({
                top: scrollAmount,
                behavior: 'smooth'
            });
        }
    }
});

progressContainer.addEventListener('click', (e) => {
    if (audio.duration) {
        const clickX = e.offsetX;
        const totalWidth = progressContainer.clientWidth;
        audio.currentTime = (clickX / totalWidth) * audio.duration;
    }
});

audio.addEventListener('ended', () => { isRepeat ? audio.play() : playNextTrack(); });

function formatTime(s) { 
    if (isNaN(s)) return '0:00'; 
    const m = Math.floor(s / 60), sec = Math.floor(s % 60); 
    return `${m}:${sec < 10 ? '0' : ''}${sec}`; 
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
