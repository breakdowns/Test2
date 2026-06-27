// State Managemenet & Configurations
let playlist = [];
let filteredPlaylist = [];
let favorites = JSON.parse(localStorage.getItem('vibe_favorites')) || [];
let history = JSON.parse(localStorage.getItem('vibe_history')) || [];

let currentIndex = 0;
let isShuffle = false;
let repeatMode = 'off'; // 'off' | 'one' | 'all'
let audioCtx, analyser, dataArray, canvasCtx;

// DOM Elements
const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const favBtn = document.getElementById('favBtn');
const searchBar = document.getElementById('searchBar');
const playlistContainer = document.getElementById('playlist');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const trackCover = document.getElementById('trackCover');
const bgBlur = document.getElementById('bgBlur');
const startModal = document.getElementById('startModal');
const volumeSlider = document.getElementById('volumeSlider');
const speedSelect = document.getElementById('speedSelect');

// Init App setelah interaksi pertama pengguna (Kebijakan Browser Audio)
document.getElementById('startAppBtn').addEventListener('click', () => {
    startModal.classList.add('hidden');
    initAudioVisualizer();
    fetchPlaylist();
});

// Fetch Playlist Data
async function fetchPlaylist() {
    try {
        const response = await fetch('playlist.json');
        playlist = await response.json();
        filteredPlaylist = [...playlist];
        renderPlaylist(filteredPlaylist);
        if (playlist.length > 0) loadTrack(0);
    } catch (err) {
        console.error("Gagal memuat file playlist.json:", err);
    }
}

// Render UI Playlist
function renderPlaylist(tracks) {
    playlistContainer.innerHTML = '';
    tracks.forEach((track, index) => {
        const isFav = favorites.includes(track.id);
        const item = document.createElement('div');
        item.className = `track-item ${index === currentIndex ? 'active' : ''}`;
        item.innerHTML = `
            <img src="${track.cover}" alt="Cover">
            <div class="item-meta">
                <h4>${track.title}</h4>
                <p>${track.artist}</p>
            </div>
            <span class="material-icons" style="color: ${isFav ? '#ff3b30' : 'transparent'}">favorite</span>
        `;
        item.addEventListener('click', () => {
            currentIndex = playlist.findIndex(t => t.id === track.id);
            loadTrack(currentIndex);
            playTrack();
        });
        playlistContainer.appendChild(item);
    });
}

// Load track to Player
function loadTrack(index) {
    currentIndex = index;
    const track = playlist[index];
    if (!track) return;

    audio.src = track.src;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    bgBlur.style.backgroundImage = `url('${track.cover}')`;

    // Reset Progress & Setup Media Session
    progressBar.style.width = '0%';
    updateFavoriteUI(track.id);
    setupMediaSession(track);
    
    // Highlight track aktif di playlist
    document.querySelectorAll('.track-item').forEach((item, i) => {
        item.classList.toggle('active', playlist[i]?.id === track.id);
    });

    // Masuk ke Riwayat
    addToHistory(track.id);
}

// Play & Pause logic
function playTrack() {
    audio.play();
    playBtn.innerHTML = '<span class="material-icons">pause</span>';
    trackCover.classList.add('playing');
}

function pauseTrack() {
    audio.pause();
    playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    trackCover.classList.remove('playing');
}

playBtn.addEventListener('click', () => {
    if (audio.paused) playTrack(); else pauseTrack();
});

// Navigation
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

// Auto Next Handler (Mengikuti Aturan Repeat)
audio.addEventListener('ended', () => {
    if (repeatMode === 'one') {
        audio.currentTime = 0;
        playTrack();
    } else if (repeatMode === 'all' || currentIndex < playlist.length - 1 || isShuffle) {
        nextTrack();
    } else {
        pauseTrack();
    }
});

// Progress Bar & Duration Updates
audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (isNaN(duration)) return;
    
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Format Waktu
    currentTimeEl.textContent = formatTime(currentTime);
    durationEl.textContent = formatTime(duration);

    // Update Lirik jika ada
    updateLyrics(currentTime);
});

function formatTime(time) {
    const min = Math.floor(time / 60).toString().padStart(2, '0');
    const sec = Math.floor(time % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

// Seek Functionality
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    if (!isNaN(duration)) {
        audio.currentTime = (clickX / width) * duration;
    }
});

// Shuffle & Repeat Toggles
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    if (repeatMode === 'off') {
        repeatMode = 'all';
        repeatBtn.innerHTML = '<span class="material-icons">repeat</span>';
        repeatBtn.classList.add('active');
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        repeatBtn.innerHTML = '<span class="material-icons">repeat_one</span>';
        repeatBtn.classList.add('active');
    } else {
        repeatMode = 'off';
        repeatBtn.innerHTML = '<span class="material-icons">repeat</span>';
        repeatBtn.classList.remove('active');
    }
});

// Search & Sort Feature
searchBar.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();
    filteredPlaylist = playlist.filter(track => 
        track.title.toLowerCase().includes(value) || 
        track.artist.toLowerCase().includes(value)
    );
    renderPlaylist(filteredPlaylist);
});

document.getElementById('sortAZ').addEventListener('click', () => {
    playlist.sort((a, b) => a.title.localeCompare(b.title));
    renderPlaylist(playlist);
});

document.getElementById('sortNew').addEventListener('click', () => {
    playlist.reverse(); // Mengasumsikan urutan JSON asli adalah kronologis
    renderPlaylist(playlist);
});

// Favorite Management
favBtn.addEventListener('click', () => {
    const currentTrack = playlist[currentIndex];
    if (!currentTrack) return;
    
    if (favorites.includes(currentTrack.id)) {
        favorites = favorites.filter(id => id !== currentTrack.id);
    } else {
        favorites.push(currentTrack.id);
    }
    localStorage.setItem('vibe_favorites', JSON.stringify(favorites));
    updateFavoriteUI(currentTrack.id);
    renderPlaylist(playlist);
});

function updateFavoriteUI(trackId) {
    if (favorites.includes(trackId)) {
        favBtn.innerHTML = '<span class="material-icons">favorite</span>';
        favBtn.classList.add('active');
    } else {
        favBtn.innerHTML = '<span class="material-icons">favorite_border</span>';
        favBtn.classList.remove('active');
    }
}

// Extra Controls Handler
volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

speedSelect.addEventListener('change', (e) => {
    audio.playbackRate = parseFloat(e.target.value);
});

// Audio Visualizer Implementation
function initAudioVisualizer() {
    const canvas = document.getElementById('visualizer');
    canvasCtx = canvas.getContext('2d');
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.0)';
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;
        
        for(let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 4;
            canvasCtx.fillStyle = `rgba(0, 255, 136, ${barHeight / 60})`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
        }
    }
    draw();
}

// Sync System Media Session (Lock Screen Kontrol)
function setupMediaSession(track) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            artwork: [{ src: track.cover, sizes: '300x300', type: 'image/jpeg' }]
        });
        
        navigator.mediaSession.setActionHandler('play', playTrack);
        navigator.mediaSession.setActionHandler('pause', pauseTrack);
        navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    }
}

// Simple LRC Lyrics Parser
function updateLyrics(time) {
    const currentTrack = playlist[currentIndex];
    const lyricsBox = document.getElementById('lyricsBox');
    if (!currentTrack.lyrics) {
        lyricsBox.innerHTML = '<p class="lyric-line">Lirik tidak tersedia</p>';
        return;
    }
    // Implementasi logika pencarian timestamps sederhana bisa disematkan di sini.
}

function addToHistory(trackId) {
    history = history.filter(id => id !== trackId);
    history.unshift(trackId);
    if(history.length > 20) history.pop();
    localStorage.setItem('vibe_history', JSON.stringify(history));
}

// Keyboard Shortcuts Support
window.addEventListener('keydown', (e) => {
    if(document.activeElement.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); audio.paused ? playTrack() : pauseTrack(); }
    if (e.code === 'ArrowRight') nextTrack();
    if (e.code === 'ArrowLeft') prevTrack();
});
  
