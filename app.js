// ==========================================
// STATE MANAGEMENT & KONFIGURASI
// ==========================================
let playlist = [];
let currentIndex = 0;
let isShuffle = false;
let repeatMode = 0; // 0: Off, 1: Repeat All, 2: Repeat One
let isPlaying = false;

// Audio Context untuk Visualizer
let audioCtx;
let analyser;
let source;
let canvasCtx;
let dataArray;
let isAudioCtxInitialized = false;

// ==========================================
// DOM ELEMENTS
// ==========================================
const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const playlistContainer = document.getElementById('playlist');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const trackCover = document.getElementById('trackCover');
const bgBlur = document.getElementById('bgBlur');
const visualizerCanvas = document.getElementById('visualizer');

window.addEventListener('DOMContentLoaded', fetchPlaylist);

// ==========================================
// INISIALISASI & FETCH DATA
// ==========================================
async function fetchPlaylist() {
    try {
        const res = await fetch('playlist.json');
        playlist = await res.json();
        renderPlaylist(playlist);
        if (playlist.length > 0) loadTrack(0);
    } catch (err) {
        console.error("Gagal memuat playlist.json", err);
    }
}

function renderPlaylist(tracks) {
    playlistContainer.innerHTML = '';
    tracks.forEach((track) => {
        const currentTrack = playlist[currentIndex];
        const isActive = currentTrack ? currentTrack.id === track.id : false;
        const item = document.createElement('div');
        item.className = `track-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <img src="${track.cover}" alt="Cover">
            <div class="item-meta">
                <h4>${track.title}</h4>
                <p>${track.artist}</p>
            </div>
        `;
        item.addEventListener('click', () => {
            const realIndex = playlist.findIndex(t => t.id === track.id);
            loadTrack(realIndex);
            playTrack();
        });
        playlistContainer.appendChild(item);
    });
}

// ==========================================
// KONTROL PLAYER & AUDIO
// ==========================================
function loadTrack(index) {
    currentIndex = index;
    const track = playlist[index];
    if (!track) return;
    
    audio.src = track.src;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    trackCover.onerror = () => { trackCover.src = 'placeholder.jpg'; };
    bgBlur.style.backgroundImage = `url('${track.cover}')`;
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    
    // WARNA CARD ADAPTIF
    trackCover.onload = () => {
        updateCardColor(trackCover);
    };
    
    renderPlaylist(playlist);
}

function updateCardColor(imgElement) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 10;
        canvas.height = 10;
        
        ctx.drawImage(imgElement, 0, 0, 10, 10);
        const imgData = ctx.getImageData(0, 0, 10, 10).data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imgData.length; i += 4) {
            r += imgData[i];
            g += imgData[i+1];
            b += imgData[i+2];
            count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        const darkR = Math.floor(r * 0.15);
        const darkG = Math.floor(g * 0.22);
        const darkB = Math.floor(b * 0.18);
        
        document.documentElement.style.setProperty(
            '--card-gradient', 
            `linear-gradient(135deg, rgb(${darkR + 10}, ${darkG + 15}, ${darkB + 12}) 0%, #0d1013 100%)`
        );
    } catch (e) {
        document.documentElement.style.setProperty('--card-gradient', 'linear-gradient(135deg, #18221c 0%, #0d1013 100%)');
    }
}

function playTrack() {
    if (!isAudioCtxInitialized) initAudioVisualizer();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    
    audio.play().then(() => {
        isPlaying = true;
        playIcon.textContent = 'pause';
        playBtn.classList.add('playing-state');
    }).catch(err => console.log("Playback tertunda:", err));
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    playIcon.textContent = 'play_arrow';
    playBtn.classList.remove('playing-state');
    
    if (canvasCtx && visualizerCanvas) {
        canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
}

function changeTrack(direction) {
    if (playlist.length === 0) return;
    if (isShuffle) {
        currentIndex = Math.floor(Math.random() * playlist.length);
    } else {
        currentIndex = (currentIndex + direction + playlist.length) % playlist.length;
    }
    loadTrack(currentIndex);
    playTrack();
}

// ==========================================
// EVENT LISTENERS
// ==========================================
playBtn.addEventListener('click', () => { isPlaying ? pauseTrack() : playTrack(); });
nextBtn.addEventListener('click', () => changeTrack(1));
prevBtn.addEventListener('click', () => changeTrack(-1));

audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
    if (repeatMode === 2) { audio.currentTime = 0; playTrack(); }
    else if (repeatMode === 1 || currentIndex < playlist.length - 1 || isShuffle) changeTrack(1);
    else pauseTrack();
});

function formatTime(t) {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

progressContainer.addEventListener('click', (e) => {
    if (audio.duration) {
        audio.currentTime = (e.offsetX / progressContainer.clientWidth) * audio.duration;
    }
});

volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });
shuffleBtn.addEventListener('click', () => { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); });
repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    const icon = repeatBtn.querySelector('.material-icons');
    repeatBtn.classList.toggle('active', repeatMode > 0);
    icon.textContent = repeatMode === 2 ? 'repeat_one' : 'repeat';
});

// ==========================================
// AUDIO VISUALIZER
// ==========================================
function initAudioVisualizer() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    canvasCtx = visualizerCanvas.getContext('2d');
    isAudioCtxInitialized = true;
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!isPlaying) return;
    
    analyser.getByteFrequencyData(dataArray);
    visualizerCanvas.width = visualizerCanvas.offsetWidth;
    visualizerCanvas.height = visualizerCanvas.offsetHeight;
    
    const w = visualizerCanvas.width;
    const h = visualizerCanvas.height;
    const barWidth = (w / dataArray.length) * 1.5;
    let x = 0;
    
    canvasCtx.clearRect(0, 0, w, h);
    for (let i = 0; i < dataArray.length; i++) {
        let barHeight = (dataArray[i] / 255) * h;
        canvasCtx.fillStyle = `rgba(29, ${114 + barHeight}, 254, 0.7)`;
        canvasCtx.fillRect(x, h - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}
