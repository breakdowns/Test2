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

/* FITUR: Mengambil Memori Setelan Terakhir Pengguna (LocalStorage) */
let currentIndex = parseInt(localStorage.getItem('brkdown_index')) || 0;
let isShuffle = localStorage.getItem('brkdown_shuffle') === 'true';
let isRepeat = localStorage.getItem('brkdown_repeat') === 'true';
let savedVolume = localStorage.getItem('brkdown_volume') !== null ? parseFloat(localStorage.getItem('brkdown_volume')) : 1;

// Sinkronisasi awal visual tombol utility & volume
shuffleBtn.classList.toggle('active', isShuffle);
repeatBtn.classList.toggle('active', isRepeat);
volumeSlider.value = savedVolume;
audio.volume = savedVolume;

fetch('playlist.json')
    .then(res => {
        if (!res.ok) throw new Error('Gagal fetch playlist.json');
        return res.json();
    })
    .then(data => {
        if (data.playlist && data.playlist.length > 0) {
            tracks = data.playlist;
            // Amankan index jika data json berkurang/berubah
            if (currentIndex >= tracks.length) currentIndex = 0;
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
    currentIndex = index;
    
    // Simpan posisi lagu saat ini ke memori browser
    localStorage.setItem('brkdown_index', currentIndex);
    
    trackTitle.classList.remove('marquee');
    trackTitle.style.transform = 'translateX(0)';
    
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    audio.src = track.src;
    
    // Hitung otomatis panjang teks untuk efek marquee
    setTimeout(() => {
        const containerWidth = trackTitle.parentElement.getBoundingClientRect().width;
        const textWidth = trackTitle.getBoundingClientRect().width;
        
        if (textWidth > containerWidth) {
            const scrollDistance = textWidth - containerWidth + 30; 
            trackTitle.style.setProperty('--scroll-dist', `-${scrollDistance}px`);
            trackTitle.classList.add('marquee');
        }
    }, 300);
    
    // FITUR: Media Session API (Kontrol Musik Via Lock Screen / Notifikasi HP)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'Breakdowns Music Player',
            artwork: [
                { src: track.cover, sizes: '300x300', type: 'image/jpeg' },
                { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
        setupMediaSessionActions();
    }
    
    updatePlaylistUI();
}

function setupMediaSessionActions() {
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
}

function togglePlay() {
    if (audio.paused) {
        audio.play()
            .then(() => playIcon.textContent = 'pause')
            .catch(err => console.error("Putar gagal:", err));
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
        item.className = `track-item-selector track-item ${index === currentIndex ? 'active' : ''}`;
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

function updatePlaylistUI() {
    const items = document.querySelectorAll('.track-item-selector');
    items.forEach((item, idx) => {
        if (idx === currentIndex) item.classList.add('active');
        else item.classList.remove('active');
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
    localStorage.setItem('brkdown_shuffle', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
    localStorage.setItem('brkdown_repeat', isRepeat);
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
    localStorage.setItem('brkdown_volume', e.target.value);
});
        
