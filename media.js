// ==========================================
// MEDIA.JS - UPDATE LOCKSCREEN NOTIFIKASI HP
// ==========================================
function updateMediaSession() {
    if ('mediaSession' in navigator && tracks[currentIndex]) {
        const t = tracks[currentIndex];
        // Memaksa cover menggunakan URL absolut agar bisa didownload oleh OS HP
        const absImg = new URL(t.cover, window.location.href).href;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title,
            artist: t.artist,
            album: 'Breakdowns Music',
            artwork: [
                { src: absImg, sizes: '256x256', type: 'image/jpeg' },
                { src: absImg, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        // Handler tombol di Media Control HP - diarahkan ke fungsi pengaman fade-out
        navigator.mediaSession.setActionHandler('play', () => { 
            if (typeof playAudioDirectly === 'function') {
                playAudioDirectly();
            } else {
                audio.play(); 
                if(playIcon) playIcon.textContent = 'pause';
            }
        });
        
        navigator.mediaSession.setActionHandler('pause', () => { 
            if (typeof pauseAudioDirectly === 'function') {
                pauseAudioDirectly();
            } else {
                audio.pause(); 
                if(playIcon) playIcon.textContent = 'play_arrow';
            }
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => { 
            if(prevBtn) prevBtn.click(); 
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => { 
            if(nextBtn) nextBtn.click(); 
        });
    }
}
