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

// BARU: Deklarasi Element Tambahan Fitur Baru
const searchBar = document.getElementById('searchBar');
const lyricsContainer = document.getElementById('lyricsContainer');
const lyricsWrapper = document.getElementById('lyricsWrapper');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

let tracks = [];
let parsedLyrics = [];
let audioCtx = null;
let analyser = null;
let dataArray = null;
let source = null;

// LocalStorage data state
let currentIndex = parseInt(localStorage.getItem('brkdown_index')) || 0;
let isShuffle = localStorage.getItem('brkdown_shuffle') === 'true';
let isRepeat = localStorage.getItem('brkdown_repeat') === 'true';
let savedVolume = localStorage.getItem('brkdown_volume') !== null ? parseFloat(localStorage.getItem('brkdown_volume')) : 1;

// Sinkronisasi awal volume & utility
shuffleBtn.classList.toggle('active', isShuffle);
repeatBtn.classList.toggle('active', isRepeat);
volumeSlider.value = savedVolume;
audio.volume = savedVolume;

// Beri ijin CORS Gambar agar canvas bisa membaca warna dominan tanpa blokir keamanan
trackCover.crossOrigin = "anonymous";

fetch('playlist.json')
    .then(res => {
        if (!res.ok) throw new Error('Gagal fetch playlist.json');
        return res.json();
    })
    .then(data => {
        if (data.playlist && data.playlist.length > 0) {
            tracks = data.playlist;
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
    localStorage.setItem('brkdown_index', currentIndex);
    
    // Reset visual animasi teks judul
    trackTitle.classList.remove('marquee');
    trackTitle.style.transform = 'translateX(0)';
    
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackCover.src = track.cover;
    audio.src = track.src;
    
    // 1. FITUR BARU: Ambil Warna Dominan Cover (Dynamic Background)
    trackCover.onload = function() {
        try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = 1;
            tempCanvas.height = 1;
            tempCtx.drawImage(trackCover, 0, 0, 1, 1);
            const data = tempCtx.getImageData(0, 0, 1, 1).data;
            // Suntik variabel CSS global ke root body
            document.body.style.setProperty('--dynamic-r', data[0]);
            document.body.style.setProperty('--dynamic-g', data[1]);
            document.body.style.setProperty('--dynamic-b', data[2]);
        } catch (e) {
            // Fallback jika terjadi error cross-origin lokal
            document.body.style.setProperty('--dynamic-r', '18');
            document.body.style.setProperty('--dynamic-g', '18');
            document.body.style.setProperty('--dynamic-b', '18');
        }
    };

    // 2. FITUR BARU: Loader Lirik Berjalan (.lrc) dengan Mekanisme Auto-Hide
    parsedLyrics = [];
    lyricsWrapper.innerHTML = '';
    
    if (track.lyricsSrc) {
        fetch(track.lyricsSrc)
            .then(res => {
                if (!res.ok) throw new Error("File lirik tidak ditemukan");
                return res.text();
            })
            .then(text => {
                parsedLyrics = parseLRC(text);
                if (parsedLyrics.length > 0) {
                    renderLyrics();
                    lyricsContainer.style.display = "block"; // Tampilkan jika lirik ada
                } else {
                    lyricsContainer.style.display = "none"; // Sembunyikan jika kosong
                }
            })
            .catch(() => {
                lyricsContainer.style.display = "none"; // Sembunyikan otomatis jika gagal load
            });
    } else {
        lyricsContainer.style.display = "none"; // FITUR REQ: Auto-hide jika tidak didefinisikan di JSON
    }

    // Hitung ulang pergeseran Marquee teks
    setTimeout(() => {
        const containerWidth = trackTitle.parentElement.getBoundingClientRect().width;
        const textWidth = trackTitle.getBoundingClientRect().width;
        if (textWidth > containerWidth) {
            const scrollDistance = textWidth - containerWidth + 30; 
            trackTitle.style.setProperty('--scroll-dist', `-${scrollDistance}px`);
            trackTitle.classList.add('marquee');
        }
    }, 300);
    
    // Media Session API (Lock Screen HP)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'Breakdowns Player',
            artwork: [
                { src: track.cover, sizes: '300x300', type: 'image/jpeg' },
                { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    }
    
    updatePlaylistHighlight();
}

// Mesin Pemecah Struktur File .lrc ke bentuk Detek & Teks
function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    const timeReg = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
    
    lines.forEach(line => {
        const matches = line.match(timeReg);
        if (matches) {
            const text = line.replace(timeReg, '').trim();
            matches.forEach(match => {
                const minMax = /\[(\d+):(\d+)(?:\.(\d+))?\]/.exec(match);
                const min = parseInt(minMax[1]);
                const sec = parseInt(minMax[2]);
                const ms = minMax[3] ? parseInt(minMax[3]) : 0;
                // Ubah format menit ke total detik murni
                const totalSec = min * 60 + sec + (ms / (minMax[3].length === 2 ? 100 : 1000));
                if (text) result.push({ time: totalSec, text: text });
            });
        }
    });
    return result.sort((a, b) => a.time - b.time);
}

function renderLyrics() {
    lyricsWrapper.innerHTML = '';
    parsedLyrics.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.id = `lyric-line-${index}`;
        p.textContent = line.text;
        lyricsWrapper.appendChild(p);
    });
}

// 3. FITUR BARU: Audio Visualizer (Membaca Frekuensi Audio Asli Lewat Browser)
function initVisualizer() {
    if (audioCtx) return; // Mencegah duplikasi inisialisasi
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audio);
    
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 64; // Menentukan kehalusan bar gelombang suara
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser) return;
    
    const bufferLength = analyser.frequencyBinCount;
    analyser.getByteFrequencyData(dataArray);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 1.4;
    let barHeight;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 4.5; // Batasi tinggi agar rapi di kotak card
        
        // Atur warna bar visualizer agar seragam dengan Hijau Spotify
        ctx.fillStyle = '#1ed760';
        // Gambar bar secara simetris atas bawah membentuk wave gelombang
        ctx.fillRect(x, (canvas.height / 2) - (barHeight / 2), barWidth, barHeight);
        
        x += barWidth + 3;
    }
}

function togglePlay() {
    // Hidupkan AudioContext saat tombol play di klik pertama kali (syarat kebijakan browser)
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    } else {
        initVisualizer();
    }

    if (audio.paused) {
        audio.play()
            .then(() => playIcon.textContent = 'pause')
            .catch(err => console.error(err));
    } else {
        audio.pause();
        playIcon.textContent = 'play_arrow';
    }
}

function nextTrack() {
    if (isRepeat) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    currentIndex = isShuffle ? Math.floor(Math.random() * tracks.length) : (currentIndex + 1) % tracks.length;
    loadTrack(currentIndex);
    audio.play().then(() => playIcon.textContent = 'pause').catch(() => {});
}

function prevTrack() {
    currentIndex = isShuffle ? Math.floor(Math.random() * tracks.length) : (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentIndex);
    audio.play().then(() => playIcon.textContent = 'pause').catch(() => {});
}

// 4. FITUR BARU: Render Playlist Mendukung Pencarian (Search Filter)
function renderPlaylist(query = '') {
    playlistContainer.innerHTML = '';
    const filteredQuery = query.toLowerCase().trim();
    
    tracks.forEach((track, index) => {
        // Cek filter kecocokan judul atau nama artist
        if (track.title.toLowerCase().includes(filteredQuery) || track.artist.toLowerCase().includes(filteredQuery)) {
            const item = document.createElement('div');
            item.className = `track-item track-item-selector ${index === currentIndex ? 'active' : ''}`;
            item.setAttribute('data-absolute-index', index); // Amankan index asli lagu
            
            item.innerHTML = `
                <img src="${track.cover}" onerror="this.src='https://via.placeholder.com/150'">
                <div class="track-meta">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                </div>
            `;
            
            item.addEventListener('click', () => {
                const targetIndex = parseInt(item.getAttribute('data-absolute-index'));
                loadTrack(targetIndex);
                if (audioCtx) audioCtx.resume(); else initVisualizer();
                audio.play().then(() => playIcon.textContent = 'pause').catch(() => {});
            });
            
            playlistContainer.appendChild(item);
        }
    });
}

function updatePlaylistHighlight() {
    const items = document.querySelectorAll('.track-item-selector');
    items.forEach(item => {
        const absIdx = parseInt(item.getAttribute('data-absolute-index'));
        if (absIdx === currentIndex) item.classList.add('active');
        else item.classList.remove('active');
    });
}

function formatTime(time) {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Event Listener untuk Kolom Input Pencarian Lagu
searchBar.addEventListener('input', (e) => {
    renderPlaylist(e.target.value);
});

// Sinkronisasi Detik Lagu & Pergeseran Teks Lirik Berjalan
audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (duration) {
        progressBar.style.width = `${(currentTime / duration) * 100}%`;
        durationEl.textContent = formatTime(duration);
    }
    currentTimeEl.textContent = formatTime(currentTime);

    // Algoritma Penyelaras Baris Lirik
    if (parsedLyrics.length > 0) {
        let activeIndex = -1;
        for (let i = 0; i < parsedLyrics.length; i++) {
            if (currentTime >= parsedLyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
        
        if (activeIndex !== -1) {
            const allLines = document.querySelectorAll('.lyric-line');
            allLines.forEach(line => line.classList.remove('active'));
            
            const activeLineElement = document.getElementById(`lyric-line-${activeIndex}`);
            if (activeLineElement) {
                activeLineElement.classList.add('active');
                
                // Geser wrapper lirik naik secara otomatis agar posisi baris aktif selalu di tengah kotak
                const containerHeight = lyricsContainer.clientHeight;
                const lineOffsetTop = activeLineElement.offsetTop;
                const lineHeight = activeLineElement.clientHeight;
                const targetScroll = -(lineOffsetTop - (containerHeight / 2) + (lineHeight / 2));
                
                lyricsWrapper.style.transform = `translateY(${targetScroll}px)`;
            }
        }
    }
});

// Event Controls bawaan
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
            
