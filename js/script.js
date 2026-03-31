/* =============================================
   WEDDING CARD ONLINE — SCRIPT.JS (STATIC VERSION)
   Handles interactions for the static HTML invitation.
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
    initInteractions();
});

// =============================================
// INTERACTIONS
// =============================================
function initInteractions() {

    // --- COUNTDOWN ---
    const countdownEl = document.getElementById('countdown-timer');
    const dateISO = countdownEl?.dataset.target || '2026-04-25T06:09:00+07:00';
    const weddingDate = new Date(dateISO).getTime();

    function updateCountdown() {
        const now = Date.now();
        const distance = weddingDate - now;
        
        const setId = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        if (distance < 0) {
            setId('days', '000'); setId('hours', '00');
            setId('minutes', '00'); setId('seconds', '00');
            return;
        }
        setId('days', String(Math.floor(distance / 86400000)).padStart(3, '0'));
        setId('hours', String(Math.floor((distance % 86400000) / 3600000)).padStart(2, '0'));
        setId('minutes', String(Math.floor((distance % 3600000) / 60000)).padStart(2, '0'));
        setId('seconds', String(Math.floor((distance % 60000) / 1000)).padStart(2, '0'));
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // --- MUSIC PLAYER ---
    const bgMusic = document.getElementById('bg-music');
    const musicToggle = document.getElementById('music-toggle');
    let isPlaying = false;

    function setPlayingUI() {
        isPlaying = true;
        if (musicToggle) {
            musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
            musicToggle.classList.add('playing');
        }
    }

    function setPausedUI() {
        isPlaying = false;
        if (musicToggle) {
            musicToggle.innerHTML = '<i class="fas fa-music"></i>';
            musicToggle.classList.remove('playing');
        }
    }

    function toggleMusic() {
        if (!bgMusic) return;
        if (isPlaying) {
            bgMusic.pause();
            setPausedUI();
        } else {
            bgMusic.play().then(setPlayingUI).catch(() => {});
        }
    }
    if (musicToggle) musicToggle.addEventListener('click', toggleMusic);

    // Autoplay handling
    function tryAutoplay() {
        if (!bgMusic || isPlaying) return;
        bgMusic.volume = 0.6;
        bgMusic.play().then(() => {
            setPlayingUI();
            removeAutoplayListeners();
        }).catch(() => {});
    }

    function autoplayOnInteraction() {
        if (isPlaying) return;
        tryAutoplay();
    }

    function removeAutoplayListeners() {
        document.removeEventListener('click', autoplayOnInteraction, true);
        document.removeEventListener('scroll', autoplayOnInteraction, true);
        document.removeEventListener('touchstart', autoplayOnInteraction, true);
        document.removeEventListener('keydown', autoplayOnInteraction, true);
    }

    document.addEventListener('click', autoplayOnInteraction, true);
    document.addEventListener('scroll', autoplayOnInteraction, true);
    document.addEventListener('touchstart', autoplayOnInteraction, true);
    document.addEventListener('keydown', autoplayOnInteraction, true);

    tryAutoplay();

    // --- SPLASH SCREEN ---
    const splash = document.getElementById('splash-welcome');
    const btnOpen = document.getElementById('btn-open-invitation');
    if (splash && btnOpen) {
        document.body.style.overflow = 'hidden';
        btnOpen.addEventListener('click', () => {
            if (bgMusic) {
                bgMusic.play().then(setPlayingUI).catch(e => console.log("Autoplay blocked:", e));
            }
            splash.classList.add('fade-out');
            document.body.style.overflow = '';
            setTimeout(() => {
                splash.style.display = 'none';
                const heroReveals = document.querySelectorAll('#hero .reveal, #hero .fade-in-up');
                heroReveals.forEach(el => el.classList.add('active'));
            }, 800);
        });
    }

    // --- SCROLL REVEAL ---
    const allRevealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-zoom');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    allRevealElements.forEach(el => revealObserver.observe(el));

    // --- GALLERY LIGHTBOX ---
    const galleryImages = [];
    const galleryItems = document.querySelectorAll('.gallery-item[data-index]');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    let currentImageIndex = 0;

    galleryItems.forEach(item => {
        const img = item.querySelector('img');
        if (img) galleryImages.push(img.src);
    });

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            if (!img) return;
            currentImageIndex = galleryImages.indexOf(img.src);
            if (currentImageIndex === -1) currentImageIndex = 0;
            lightboxImg.src = galleryImages[currentImageIndex];
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

    document.getElementById('lightbox-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        lightboxImg.src = galleryImages[currentImageIndex];
    });

    document.getElementById('lightbox-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        lightboxImg.src = galleryImages[currentImageIndex];
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox?.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') document.getElementById('lightbox-prev')?.click();
        if (e.key === 'ArrowRight') document.getElementById('lightbox-next')?.click();
    });

    // --- STAGGER ANIMATIONS ---
    document.querySelectorAll('.schedule-item').forEach((item, i) => {
        item.style.transitionDelay = `${i * 0.2}s`;
    });
    document.querySelectorAll('.countdown-item').forEach((item, i) => {
        item.style.animationDelay = `${i * 0.15}s`;
    });
    document.querySelectorAll('.gallery-item').forEach((item, i) => {
        item.style.transitionDelay = `${i * 0.05}s`;
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
