const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn'), playIcon = document.getElementById('playIcon');
const trackTitle = document.getElementById('trackTitle'), trackArtist = document.getElementById('trackArtist'), trackCover = document.getElementById('trackCover');
const canvas = document.getElementById('visualizer'), ctx = canvas.getContext('2d');
const lyricsWrapper = document.getElementById('lyricsWrapper'), lyricsContainer = document.getElementById('lyricsContainer');

let tracks = [], parsedLyrics = [], audioCtx, analyser, dataArray, currentIndex = 0;

fetch('playlist.json').then(res => res.json()).then(data => { tracks = data.playlist; loadTrack(0); });

function loadTrack(index) {
    const track = tracks[index];
    currentIndex = index;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    audio.src = track.src;
    parsedLyrics = [];
    lyricsWrapper.innerHTML = '';

    if (track.lyricsSrc) {
        fetch(track.lyricsSrc).then(res => res.text()).then(text => {
            parsedLyrics = parseLRC(text);
            if (parsedLyrics.length > 0) { renderLyrics(); lyricsContainer.style.display = "block"; } 
            else { renderStaticLyrics(text); lyricsContainer.style.display = "block"; }
        }).catch(() => lyricsContainer.style.display = "none");
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
        p.onclick = () => { audio.currentTime = line.time; }; // CLICK TO SEEK
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
        ctx.roundRect(i * (barWidth + 3), canvas.height - h, barWidth, h, [5, 5, 0, 0]);
        ctx.fill();
    });
}

playBtn.addEventListener('click', () => {
    initVisualizer();
    audio.paused ? (audio.play(), playIcon.textContent = 'pause') : (audio.pause(), playIcon.textContent = 'play_arrow');
});

audio.addEventListener('timeupdate', () => {
    // Logic auto-scroll lirik ada di sini (bisa ditambah dari versi sebelumnya)
    if (parsedLyrics.length > 0) {
        const active = parsedLyrics.findLastIndex(l => audio.currentTime >= l.time);
        document.querySelectorAll('.lyric-line').forEach((el, i) => {
            el.classList.toggle('active', i === active);
            if(i === active) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
});
