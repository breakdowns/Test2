// ==========================================
// STATE MANAGEMENT & KONFIGURASI
// ==========================================
let playlist = [];
let filteredPlaylist = [];
let currentIndex = 0;
let isShuffle = false;
let repeatMode = 0; // 0: Off, 1: Repeat All, 2: Repeat One
let isPlaying = false;

// Audio Context untuk Visualizer Gelombang
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
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');

const searchBar = document.getElementById('searchBar');
const sortAZBtn = document.getElementById('sortAZ');
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

// Jalankan fungsi saat DOM selesai dimuat
window.addEventListener('DOMContentLoaded', fetchPlaylist);

// ==========================================
// INISIALISASI & FETCH DATA
// ==========================================
async function fetchPlaylist() {
    try {
        const res = await fetch('playlist.json');
        playlist = await res.json();
        filteredPlaylist = [...playlist];
        renderPlaylist(filteredPlaylist);
        
        if (playlist.length > 0) {
            loadTrack(0);
        }
    } catch (err) {
        console.error("Gagal memuat playlist.json", err);
    }
}

function renderPlaylist(tracks) {
    playlistContainer.innerHTML = '';
    
    tracks.forEach((track) => {
        // PENGAMAN: Mencegah error crash jika playlist belum sepenuhnya termuat
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
    
    // PENGAMAN: Jika file gambar di playlist.json typo/rusak, ganti ke placeholder biar gak pecah
    trackCover.onerror = () => {
        trackCover.src = 'placeholder.jpg';
    };
    
    bgBlur.style.backgroundImage = `url('${track.cover}')`;
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    renderPlaylist(filteredPlaylist);
}

function playTrack() {
    if (!isAudioCtxInitialized) {
        initAudioVisualizer();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    audio.play()
        .then(() => {
            isPlaying = true;
            playBtn.innerHTML = '<span class="material-icons">pause</span>';
            playBtn.classList.add('playing-state');
        })
        .catch(err => console.log("Playback tertunda:", err));
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    playBtn.classList.remove('playing-state');
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
// EVENT LISTENERS UTAMA
// ==========================================
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
});

nextBtn.addEventListener('click', () => {
    changeTrack(1);
});

prevBtn.addEventListener('click', () => {
    changeTrack(-1);
});

// ==========================================
// TIMELINE PROGRESS & DURASI
// ==========================================
audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
    if (repeatMode === 2) {
        audio.currentTime = 0;
        playTrack();
    } else if (repeatMode === 1 || currentIndex < playlist.length - 1 || isShuffle) {
        changeTrack(1);
    } else {
        pauseTrack();
    }
});

function formatTime(t) {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

progressContainer.addEventListener('click', (e) => {
    if (audio.duration) {
        const clickPositionX = e.offsetX;
        const containerWidth = progressContainer.clientWidth;
        audio.currentTime = (clickPositionX / containerWidth) * audio.duration;
    }
});

// ==========================================
// UTILITAS (VOLUME, SHUFFLE, REPEAT)
// ==========================================
volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    const icon = repeatBtn.querySelector('.material-icons');
    
    repeatBtn.classList.toggle('active', repeatMode > 0);
    
    if (repeatMode === 2) {
        icon.textContent = 'repeat_one';
    } else {
        icon.textContent = 'repeat';
    }
});

// ==========================================
// FITUR PENCARIAN & SORTIR
// ==========================================
searchBar.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    
    filteredPlaylist = playlist.filter(t => 
        t.title.toLowerCase().includes(term) || 
        t.artist.toLowerCase().includes(term)
    );
    
    renderPlaylist(filteredPlaylist);
});

let isAZ = false;
sortAZBtn.addEventListener('click', () => {
    isAZ = !isAZ;
    
    filteredPlaylist.sort((a, b) => {
        return isAZ 
            ? a.title.localeCompare(b.title) 
            : b.title.localeCompare(a.title);
    });
    
    renderPlaylist(filteredPlaylist);
});

// ==========================================
// AUDIO VISUALIZER MANAGEMENT
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
    
