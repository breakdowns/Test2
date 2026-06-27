const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const playlistContainer = document.getElementById('playlist');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const trackCover = document.getElementById('trackCover');

let tracks = [];
let currentIndex = 0;
let isShuffle = false;
let isRepeat = false;

// Ambil data playlist dari package.json
fetch('package.json')
    .then(res => {
        if (!res.ok) throw new Error('Gagal fetch package.json');
        return res.json();
    })
    .then(data => {
        if (data.playlist && data.playlist.length > 0) {
            tracks = data.playlist;
            loadTrack(currentIndex);
            renderPlaylist();
        } else {
            trackTitle.textContent = "Playlist Kosong";
        }
    })
    .catch(err => {
        console.error(err);
        trackTitle.textContent = "JSON Load Error";
    });

function loadTrack(index) {
    if (!tracks[index]) return;
    const track = tracks[index];
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    audio.src = track.src;
    
    // Update active style di playlist UI
    const items = document.querySelectorAll('.track-item');
    items.forEach((item, idx) => {
        if (idx === index) item.classList.add('active');
        else item.classList.remove('active');
    });
}

function togglePlay() {
    if (audio.paused) {
        audio.play()
            .then(() => playIcon.textContent = 'pause')
            .catch(err => {
                alert("File tidak ditemukan! Cek kembali penulisan nama file .mp3 / .jpg kamu di package.json.");
                console.error(err);
            });
    } else {
        audio.pause();
        playIcon.textContent = 'play_arrow';
    }
}

function nextTrack() {
    if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
    }
    if (isShuffle) {
        currentIndex = Math.floor(Math.random() * tracks.length);
    } else {
        currentIndex = (currentIndex + 1) % tracks.length;
    }
    loadTrack(currentIndex);
    audio.play().then(() => playIcon.textContent = 'pause').catch(() => {});
}

function prevTrack() {
    if (isShuffle) {
        currentIndex = Math.floor(Math.random() * tracks.length);
    } else {
        currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    }
    loadTrack(currentIndex);
    audio.play().then(() => playIcon.textContent = 'pause').catch(() => {});
}

function renderPlaylist() {
    playlistContainer.innerHTML = '';
    tracks.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = `track-item ${index === currentIndex ? 'active' : ''}`;
        item.innerHTML = `
            <img src="${track.cover}" onerror="this.src='https://via.placeholder.com/150'">
            <div class="track-meta">
                <h4>${track.title}</h4>
                <p>${track.artist}</p>
            </div>
        `;
        item.addEventListener('click', () => {
            currentIndex = index;
            loadTrack(currentIndex);
            audio.play().then(() => playIcon.textContent = 'pause').catch(() => {});
        });
        playlistContainer.appendChild(item);
    });
}

function formatTime(time) {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Event Listeners
playBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
});

audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (duration) {
        progressBar.style.width = `${(currentTime / duration) * 100}%`;
        durationEl.textContent = formatTime(duration);
    }
    currentTimeEl.textContent = formatTime(currentTime);
});

audio.addEventListener('ended', nextTrack);

progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    if (audio.duration) {
        audio.currentTime = (clickX / width) * audio.duration;
    }
});

volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});
