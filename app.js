const audio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const progressBar = document.getElementById('progressBar');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const trackCover = document.getElementById('trackCover');

const tracks = [
    { title: "Dialogue", artist: "Blood The Face", src: "dialogue.mp3", cover: "cover1.jpg" },
    { title: "Where My Dreams Are Made Of Gold", artist: "A Reason To Breathe", src: "gold.mp3", cover: "cover2.jpg" }
];

let currentIndex = 0;

function loadTrack(index) {
    trackTitle.textContent = tracks[index].title;
    trackArtist.textContent = tracks[index].artist;
    trackCover.src = tracks[index].cover;
    audio.src = tracks[index].src;
}

playBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play().then(() => { playIcon.textContent = 'pause'; }).catch(e => alert("File audio tidak ditemukan!"));
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
