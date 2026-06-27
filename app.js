// --- Inisialisasi Elemen ---
const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const playlistContainer = document.getElementById('playlist');

// --- Data Lagu ---
const tracks = [
    { title: "Dialogue", artist: "Blood The Face", src: "lagu1.mp3", cover: "1002506600.jpg" },
    { title: "Where My Dreams Are Made Of Gold", artist: "A Reason To Breathe", src: "lagu2.mp3", cover: "1002506601.jpg" }
];

let currentTrackIndex = 0;

// --- Fungsi Utama ---
function loadTrack(index) {
    const track = tracks[index];
    audio.src = track.src;
    document.getElementById('trackTitle').textContent = track.title;
    document.getElementById('trackArtist').textContent = track.artist;
    document.getElementById('trackCover').src = track.cover;
    audio.load();
}

function togglePlay() {
    if (audio.paused) {
        audio.play().catch(e => console.log("Play failed:", e));
        playIcon.textContent = 'pause';
    } else {
        audio.pause();
        playIcon.textContent = 'play_arrow';
    }
}

// --- Event Listeners ---
playBtn.addEventListener('click', togglePlay);

audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    progressBar.style.width = `${(currentTime / duration) * 100}%`;
    
    // Update Waktu
    const formatTime = (time) => {
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    currentTimeEl.textContent = formatTime(currentTime);
    durationEl.textContent = duration ? formatTime(duration) : "0:00";
});

progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    audio.currentTime = (e.offsetX / width) * audio.duration;
});

volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

// --- Generate Playlist ---
tracks.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = 'track-item';
    item.innerHTML = `
        <img src="${track.cover}">
        <div class="item-meta">
            <h4>${track.title}</h4>
            <p>${track.artist}</p>
        </div>
    `;
    item.onclick = () => {
        currentTrackIndex = index;
        loadTrack(index);
        audio.play();
        playIcon.textContent = 'pause';
    };
    playlistContainer.appendChild(item);
});

// Load lagu pertama
loadTrack(0);
