const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const progressBar = document.getElementById('progressBar');
const trackTitle = document.getElementById('trackTitle');

// PENTING: Ganti 'music.mp3' dan 'cover.jpg' sesuai nama file asli Anda
const tracks = [
    { title: "Judul Lagu 1", artist: "Artis 1", src: "music.mp3", cover: "cover.jpg" }
];

function loadTrack(index) {
    trackTitle.textContent = tracks[index].title;
    document.getElementById('trackArtist').textContent = tracks[index].artist;
    document.getElementById('trackCover').src = tracks[index].cover;
    audio.src = tracks[index].src;
}

playBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play().then(() => playIcon.textContent = 'pause');
    } else {
        audio.pause();
        playIcon.textContent = 'play_arrow';
    }
});

audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percent + '%';
});

loadTrack(0);
