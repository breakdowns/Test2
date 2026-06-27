// ==========================================
// STATE MANAGEMENT & KONFIGURASI
// ==========================================
let playlist = [];
let filteredPlaylist = [];
let favorites = JSON.parse(localStorage.getItem('breakdowns_favs')) || [];
let currentIndex = 0;
let isShuffle = false;
let repeatMode = 0; // 0: Off, 1: Repeat All, 2: Repeat One
let isPlaying = false;

// Audio Context untuk Visualizer Bawah Cover
let audioCtx, analyser, source, canvasCtx, dataArray;
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
const favBtn = document.getElementById('favBtn');

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

// ==========================================
// INISIALISASI & FETCH DATA
// ==========================================
async function fetchPlaylist() {
    try {
        const response = await fetch('playlist.json');
        playlist = await response.json();
        filteredPlaylist = [...playlist];
        renderPlaylist(filteredPlaylist);
        if (playlist.length > 0) loadTrack(0);
    } catch (err) {
        console.error("Gagal memuat playlist.json.", err);
        // Fallback jika tidak ada JSON atau test lokal
        playlist = [
            { id: 1, title: "Lagu Belum Dimuat", artist: "Pastikan ada playlist.json", src: "", cover: "placeholder.jpg" }
        ];
        filteredPlaylist = [...playlist];
        renderPlaylist(filteredPlaylist);
    }
}

function renderPlaylist(tracks) {
    playlistContainer.innerHTML = '';
    tracks.forEach((track) => {
        const isFav = favorites.includes(track.id);
        const isActive = playlist[currentIndex] && playlist[currentIndex].id === track.id;
        
        const item = document.createElement('div');
        item.className = `track-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <img src="${track.cover}" alt="Cover">
            <div class="item-meta">
                <h4>${track.title}</h4>
                <p>${track.artist}</p>
            </div>
            <span class="material-icons" style="color: ${isFav ? '#1db954' : 'transparent'}; margin-left: auto; font-size: 1.2rem;">
                favorite
            </span>
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
    bgBlur.style.backgroundImage = `url('${track.cover}')`;

    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    
    updateFavoriteUI(track.id);
    renderPlaylist(filteredPlaylist); // Update UI list bawah (highlight lagu aktif)
}

function playTrack() {
    // Inisialisasi visualizer saat interaksi pertama
    if (!isAudioCtxInitialized) initAudioVisualizer();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    audio.play().then(() => {
        isPlaying = true;
        // Ganti ke icon Pause dan aktifkan warna orange (sesuai fix gambar referensi)
        playBtn.innerHTML = '<span class="material-icons">pause</span>';
        playBtn.classList.add('playing-state');
    }).catch(err => console.log("Playback tertunda:", err));
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    // Kembalikan ke icon Play putih
    playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    playBtn.classList.remove('playing-state');
}

// Event Listeners Utama
playBtn.addEventListener('click', () => {
    if (isPlaying) pauseTrack();
    else playTrack();
});

function nextTrack() {
    if (isShuffle) {
        currentIndex = Math.floor(Math.random() * playlist.length);
    } else {
        currentIndex = (currentIndex + 1) % playlist.length;
    }
    loadTrack(currentIndex);
    playTrack();
}

function prevTrack() {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentIndex);
    playTrack();
}

nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// ==========================================
// PROGRESS BAR & WAKTU
// ==========================================
audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (isNaN(duration)) return;
    
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    currentTimeEl.textContent = formatTime(currentTime);
    durationEl.textContent = formatTime(duration);
});

audio.addEventListener('ended', () => {
    if (repeatMode === 2) { // Repeat One
        audio.currentTime = 0;
        playTrack();
    } else if (repeatMode === 1 || currentIndex < playlist.length - 1 || isShuffle) { 
        nextTrack(); // Repeat All / Lanjut
    } else {
        pauseTrack(); // Berhenti jika lagu habis
    }
});

function formatTime(time) {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

// Seek lagu saat Progress bar diklik
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    if (duration) {
        audio.currentTime = (clickX / width) * duration;
    }
});

// ==========================================
// UTILITY (VOLUME, SHUFFLE, REPEAT, FAVORITE)
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
    
    if (repeatMode === 0) { // Off
        repeatBtn.classList.remove('active');
        icon.textContent = 'repeat';
    } else if (repeatMode === 1) { // Repeat All
        repeatBtn.classList.add('active');
        icon.textContent = 'repeat';
    } else if (repeatMode === 2) { // Repeat One
        repeatBtn.classList.add('active');
        icon.textContent = 'repeat_one';
    }
});

function updateFavoriteUI(id) {
    const isFav = favorites.includes(id);
    const icon = favBtn.querySelector('.material-icons');
    if (isFav) {
        icon.textContent = 'favorite';
        favBtn.style.color = '#1db954';
    } else {
        icon.textContent = 'favorite_border';
        favBtn.style.color = '#ffffff';
    }
}

favBtn.addEventListener('click', () => {
    const trackId = playlist[currentIndex]?.id;
    if (!trackId) return;

    if (favorites.includes(trackId)) {
        favorites = favorites.filter(id => id !== trackId); // Remove
    } else {
        favorites.push(trackId); // Add
    }
    
    localStorage.setItem('breakdowns_favs', JSON.stringify(favorites));
    updateFavoriteUI(trackId);
    renderPlaylist(filteredPlaylist);
});

// ==========================================
// PENCARIAN & SORTING
// ==========================================
searchBar.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredPlaylist = playlist.filter(track => 
        track.title.toLowerCase().includes(term) || 
        track.artist.toLowerCase().includes(term)
    );
    renderPlaylist(filteredPlaylist);
});

let isSortedAsc = false;
sortAZBtn.addEventListener('click', () => {
    isSortedAsc = !isSortedAsc;
    filteredPlaylist.sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return isSortedAsc ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
    });
    renderPlaylist(filteredPlaylist);
});

// ==========================================
// VISUALIZER AUDIO (EFEK GELOMBANG BAWAH COVER)
// ==========================================
function initAudioVisualizer() {
    if (!visualizerCanvas) return;
    
    // Setup Context Audio
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // Resolusi gelombang
    
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
    
    // Responsive Canvas
    visualizerCanvas.width = visualizerCanvas.offsetWidth;
    visualizerCanvas.height = visualizerCanvas.offsetHeight;
    
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    const barWidth = (width / dataArray.length) * 1.5;
    let barHeight;
    let x = 0;
    
    canvasCtx.clearRect(0, 0, width, height);
    
    // Draw batang gelombang
    for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * height;
        
        const r = 29;
        const g = 114 + (barHeight * 2); 
        const b = 254; // Base warna timeline-blue
        
        canvasCtx.fillStyle = `rgba(${r},${g},${b}, 0.8)`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 2;
    }
    }
                    
