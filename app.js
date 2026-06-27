const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn'), playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn'), nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn'), repeatBtn = document.getElementById('repeatBtn');
const trackTitle = document.getElementById('trackTitle'), trackArtist = document.getElementById('trackArtist'), trackCover = document.getElementById('trackCover');
const canvas = document.getElementById('visualizer'), ctx = canvas.getContext('2d');
const lyricsWrapper = document.getElementById('lyricsWrapper'), lyricsContainer = document.getElementById('lyricsContainer');
const progressContainer = document.getElementById('progressContainer'), progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime'), durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');

let tracks = [], parsedLyrics = [], audioCtx, analyser, dataArray, currentIndex = 0;
let isShuffle = false, isRepeat = false;

// Memuat data dari playlist.json
fetch('playlist.json')
    .then(res => res.json())
    .then(data => { 
        tracks = data.playlist; 
        if(tracks.length > 0) loadTrack(0); 
    });

function loadTrack(index) {
    const track = tracks[index];
    currentIndex = index;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    audio.src = track.src;
    parsedLyrics = [];
    lyricsWrapper.innerHTML = '';
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = '0:00';

    if (track.lyricsSrc) {
        fetch(track.lyricsSrc)
            .then(res => res.text())
            .then(text => {
                parsedLyrics = parseLRC(text);
                if (parsedLyrics.length > 0) { 
                    renderLyrics(); 
                    lyricsContainer.style.display = "block"; 
                } else { 
                    renderStaticLyrics(text); 
                    lyricsContainer.style.display = "block"; 
                }
            })
            .catch(() => lyricsContainer.style.display = "none");
    } else {
        lyricsContainer.style.display = "none";
    }
}

function parseLRC(lrcText) {
    const result = [];
    lrcText.split('\n').forEach(line => {
        const matches = [...line.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\]/g)];
        matches.forEach(m => {
            const time = parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseInt(m[3])/100 : 0);
            const text = line.replace(/\[.*?\]/g, '').trim();
            if (text) result.push({ time, text });
        });
    });
    return result.sort((a, b) => a.time - b.time);
}

function renderLyrics() {
    parsedLyrics.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.id = `line-${index}`;
        p.textContent = line.text;
        p.style.cursor = 'pointer';
        p.onclick = () => { audio.currentTime = line.time; }; // CLICK TO SEEK WORK
        lyricsWrapper.appendChild(p);
    });
}

function renderStaticLyrics(text) {
    text.split('\n').forEach(line => {
        const clean = line.replace(/\[.*?\]/g, '').trim();
        if (clean) {
            const p = document.createElement('p');
            p.className = 'lyric-line active';
            p.textContent = clean;
            lyricsWrapper.appendChild(p);
        }
    });
    lyricsWrapper.style.transform = 'none';
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
    ctx.shadowBlur = 6; ctx.shadowColor = '#1ed760';
    
    const barWidth = (canvas.width / dataArray.length) * 1.4;
    dataArray.forEach((val, i) => {
        const h = val / 3.5;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - h);
        grad.addColorStop(0, '#1ed760'); grad.addColorStop(1, '#66ff99');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(i * (barWidth + 3), canvas.height - h, barWidth, h, [5, 5, 0, 0]); // ROUNDED CORNER
        ctx.fill();
    });
}

// Play & Pause Event
playBtn.addEventListener('click', () => {
    initVisualizer();
    if (audio.paused) {
        audio.play().then(() => playIcon.textContent = 'pause').catch(err => console.log(err));
    } else {
        audio.pause();
        playIcon.textContent = 'play_arrow';
    }
});

// Next Track
nextBtn.addEventListener('click', () => {
    let nextIndex = currentIndex + 1;
    if (isShuffle) nextIndex = Math.floor(Math.random() * tracks.length);
    else if (nextIndex >= tracks.length) nextIndex = 0;
    loadTrack(nextIndex);
    audio.play().then(() => playIcon.textContent = 'pause');
});

// Previous Track
prevBtn.addEventListener('click', () => {
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
    loadTrack(prevIndex);
    audio.play().then(() => playIcon.textContent = 'pause');
});

// Toggle Fitur Shuffle & Repeat
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
});

// Mengatur Volume Audio
volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

// Helper Mengubah Detik ke Format Menit:Detik
function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Durasi Total Lagu Dimuat
audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
});

// Pembaruan Progress Bar & Auto Scroll Lirik
audio.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatTime(audio.currentTime);
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    if (parsedLyrics.length > 0) {
        const active = parsedLyrics.findLastIndex(l => audio.currentTime >= l.time);
        document.querySelectorAll('.lyric-line').forEach((el, i) => {
            el.classList.toggle('active', i === active);
            if (i === active) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
});

// Lompat Waktu dengan Mengetuk Progress Bar
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    if(duration) {
        audio.currentTime = (clickX / width) * duration;
    }
});

// Mengatur Perpindahan Lagu Saat Durasi Habis
audio.addEventListener('ended', () => {
    if (isRepeat) {
        audio.play();
    } else {
        nextBtn.click();
    }
});
        
