// ==========================================
// MEDIA.JS - UPDATE LOCKSCREEN NOTIFIKASI HP
// ==========================================
let mediaSessionInitialized = false;

function updateMediaSession() {
    if ('mediaSession' in navigator && tracks[currentIndex]) {
        const t = tracks[currentIndex];
        const absImg = new URL(t.cover || "https://raw.githubusercontent.com/breakdowns/music/refs/heads/master/breakdowns.png", window.location.href).href;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title || "Unknown Title",
            artist: t.artist || "Unknown Artist",
            album: 'Breakdowns Music',
            artwork: [
                { src: absImg, sizes: '256x256', type: 'image/jpeg' },
                { src: absImg, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        // Gembok ini mencegah Android nge-freeze saat layar mati
        if (!mediaSessionInitialized) {
            navigator.mediaSession.setActionHandler('play', () => { 
                if (typeof playAudioDirectly === 'function') playAudioDirectly();
                else audio.play();
            });
            navigator.mediaSession.setActionHandler('pause', () => { 
                if (typeof pauseAudioDirectly === 'function') pauseAudioDirectly();
                else audio.pause();
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => { 
                if (prevBtn) prevBtn.click(); 
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => { 
                if (nextBtn) nextBtn.click(); 
            });
            try {
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    audio.currentTime = details.seekTime;
                    if (typeof updateMediaSessionState === 'function') updateMediaSessionState();
                });
            } catch (e) {}
            mediaSessionInitialized = true;
        }
    }
}

function updateMediaSessionState() {
    if ('mediaSession' in navigator && audio.duration && !isNaN(audio.duration)) {
        navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
        try {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
            });
        } catch (e) {}
    }
}
