const audio = document.getElementById('mainAudio'), 
      playBtn = document.getElementById('playBtn'), 
      playIcon = document.getElementById('playIcon'), 
      nextBtn = document.getElementById('nextBtn'), 
      prevBtn = document.getElementById('prevBtn'),
      progressBar = document.getElementById('progressBar'), 
      currentTimeEl = document.getElementById('currentTime'), 
      durationEl = document.getElementById('duration'), 
      volumeSlider = document.getElementById('volumeSlider'), 
      playlistContainer = document.getElementById('playlist');

let tracks = [], currentIndex = 0;

// Set crossOrigin sekali saja di awal
audio.crossOrigin = "anonymous";

// Load Playlist
fetch('playlist.json')
    .then(res => res.json())
    .then(data => { 
        tracks = data.playlist; 
        const savedIndex = parseInt(localStorage.getItem('currentIndex')) || 0; 
        loadTrack(savedIndex >= 0 && savedIndex < tracks.length ? savedIndex : 0); 
    });

function loadTrack(index, autoPlay = false) {
    currentIndex = index;
    localStorage.setItem('currentIndex', index);
    const track = tracks[index];
    
    // Perintah loading paling ringan biar Poco lu gak hang
    audio.src = track.src;
    audio.load(); 
    
    // Update UI tanpa animasi berat
    document.getElementById('trackTitle').textContent = track.title || "Unknown";
    document.getElementById('trackArtist').textContent = track.artist || "Unknown";
    
    if (autoPlay) {
        // Langsung mainkan setelah set src
        playAudio();
    }
}

function playAudio() {
    audio.play().catch(e => console.log("Play tertunda:", e));
    playIcon.textContent = 'pause';
}

function pauseAudio() {
    audio.pause();
    playIcon.textContent = 'play_arrow';
}

// Event handler utama untuk ganti lagu otomatis saat habis
audio.addEventListener('ended', () => {
    let n = currentIndex + 1;
    if (n >= tracks.length) n = 0;
    loadTrack(n, true);
});

// Event biar durasi dan UI tetap update
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progressBar.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
});

function formatTime(s) { 
    if (isNaN(s)) return '0:00'; 
    const m = Math.floor(s / 60), sec = Math.floor(s % 60); 
    return `${m}:${sec < 10 ? '0' : ''}${sec}`; 
}

playBtn.addEventListener('click', () => { audio.paused ? playAudio() : pauseAudio(); });
nextBtn.addEventListener('click', () => { 
    let n = currentIndex + 1; 
    if (n >= tracks.length) n = 0;
    loadTrack(n, true); 
});
prevBtn.addEventListener('click', () => { 
    let n = currentIndex - 1; 
    if (n < 0) n = tracks.length - 1;
    loadTrack(n, true); 
});

volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; localStorage.setItem('volume', e.target.value); });
      
