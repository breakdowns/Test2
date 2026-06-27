// State Management & Configurations
let playlist = [];
let filteredPlaylist = [];
let favorites = JSON.parse(localStorage.getItem('vibe_favorites')) || [];
let history = JSON.parse(localStorage.getItem('vibe_history')) || [];

let currentIndex = 0;
let isShuffle = false;
let repeatMode = 'off'; // 'off' | 'one' | 'all'
let audioCtx, analyser, dataArray, canvasCtx;
let isAudioCtxInitialized = false;

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
const volumeSlider = document.getElementById('volumeSlider');

window.addEventListener('DOMContentLoaded', () => {
    fetchPlaylist();
});

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
            <span class="material-icons" style="color: ${isFav ? '#1db954' : 'transparent'}">favorite</span>
        `;
        item.addEventListener('click', () => {
            currentIndex = playlist.findIndex(t => t.id === track.id);
            loadTrack(currentIndex);
            playTrack();
        });
        playlistContainer.appendChild(item);
    });
}

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
    updateFavoriteUI(track.id);
    setupMediaSession(track);
    
    document.querySelectorAll('.track-item').forEach((item, i) => {
        item.classList.toggle('active', playlist[i]?.id === track.id);
    });
}

// Play & Pause logic (Menggunakan Vektor Material Icons Murni)
function playTrack() {
    if (!isAudioCtxInitialized) {
        initAudioVisualizer();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    audio.play().then(() => {
        // Mengubah isi tombol menjadi icon vektor 'pause'
        playBtn.innerHTML = '<span class="material-icons">pause</span>';
        playBtn.classList.add('glow-active');
        trackCover.classList.add('playing');
    }).catch(err => {
        console.log("Playback tertunda:", err);
    });
}

function pauseTrack() {
    audio.pause();
    // Mengubah isi tombol menjadi icon vektor 'play_arrow'
    playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    playBtn.classList.remove('glow-active');
    trackCover.classList.remove('playing');
}

playBtn.addEventListener('click', () => {
    if (audio.paused) {
        playTrack();
    } else {
        pauseTrack();
    }
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

audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (isNaN(duration)) return;
    
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    currentTimeEl.textContent = formatTime(currentTime);
    durationEl.textContent = formatTime(duration);
});

function formatTime(time) {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    constNormally I can help with things like this, but I don't seem to have access to that content. You can try again or ask me for something else.
        
