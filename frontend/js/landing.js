// ============================================
// Synapse AI — Landing Page Logic
// ============================================

// ── Page Transition Helper ──
function landingNavigateTo(url) {
  const overlay = document.getElementById('page-overlay');
  if (overlay) {
    overlay.classList.add('active');
    setTimeout(() => { window.location.href = url; }, 300);
  } else {
    window.location.href = url;
  }
}

// Wire up all navigation links for smooth transitions
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="/"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // If link points to login, auto-navigate if already signed in, otherwise show modal
      if (href === '/login.html') {
        e.preventDefault();
        if (typeof auth !== 'undefined' && auth.currentUser) {
          landingNavigateTo('/chat.html');
        } else {
          openAuthModal();
        }
        return;
      }
      if (href && !href.startsWith('#')) {
        e.preventDefault();
        landingNavigateTo(href);
      }
    });
  });

  // Fade in on load — start fully opaque then fade to transparent
  const overlay = document.getElementById('page-overlay');
  if (overlay) {
    overlay.style.opacity = '1';
    overlay.style.transition = 'none';
    // Double rAF ensures the browser paints the black frame before fading out
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.35s ease';
        overlay.style.opacity = '0';
      });
    });
  }

  // ── Auth Modal Logic ──
  const authModal = document.getElementById('auth-modal');
  const authModalContent = document.getElementById('auth-modal-content');
  const closeAuthModalBtn = document.getElementById('close-auth-modal');

  window.openAuthModal = function() {
    if (!authModal) return;
    authModal.style.display = 'flex';
    // slight delay for transition paint
    requestAnimationFrame(() => {
      authModal.style.opacity = '1';
      authModalContent.style.transform = 'scale(1)';
    });
    // Auto focus email field inside modal
    setTimeout(() => {
      const emailEl = document.getElementById('email');
      if (emailEl) emailEl.focus();
    }, 300);
  };

  window.closeAuthModal = function() {
    if (!authModal) return;
    authModal.style.opacity = '0';
    authModalContent.style.transform = 'scale(0.95)';
    setTimeout(() => {
      authModal.style.display = 'none';
    }, 300);
  };

  if (closeAuthModalBtn) {
    closeAuthModalBtn.addEventListener('click', window.closeAuthModal);
  }

  // Close on backdrop click
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        window.closeAuthModal();
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal && authModal.style.display !== 'none') {
      window.closeAuthModal();
    }
  });

  // ── Typewriter Effect ──
  const target = document.getElementById('typewriter-target');
  if (target) {
    const words = ['Synapse', 'Intelligence', 'Aura', 'Future'];
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeWriter() {
      const word = words[wordIndex];
      if (!deleting) {
        target.textContent = word.substring(0, charIndex + 1);
        charIndex++;
        if (charIndex === word.length) {
          deleting = true;
          setTimeout(typeWriter, 1800);
          return;
        }
      } else {
        target.textContent = word.substring(0, charIndex - 1);
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
        }
      }
      setTimeout(typeWriter, deleting ? 60 : 100);
    }
    // Start after reveal animation
    setTimeout(typeWriter, 1000);
  }

  // ── Scroll Indicator ──
  const scrollIndicator = document.getElementById('scroll-indicator');
  if (scrollIndicator) {
    let isScrolling = false;
    // ⚡ Bolt: Throttled scroll indicator updates to prevent layout thrashing
    // Impact: Limits DOM writes to exactly once per frame during active scrolling
    window.addEventListener('scroll', () => {
      if (!isScrolling) {
        window.requestAnimationFrame(() => {
          scrollIndicator.style.opacity = window.scrollY > 80 ? '0' : '1';
          isScrolling = false;
        });
        isScrolling = true;
      }
    }, { passive: true });
  }

  // ── Scroll Reveal Animations ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

// ── Parallax Orb on Mouse Move ──
// ⚡ Bolt: Throttled mousemove with requestAnimationFrame to prevent main thread blocking
// Impact: Reduces layout thrashing and ensures transform updates align with display refresh rate.
let isMouseMoving = false;
let lastMouseX = 0;
let lastMouseY = 0;
document.addEventListener('mousemove', (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  if (!isMouseMoving) {
    window.requestAnimationFrame(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        isMouseMoving = false;
        return;
      }
      const orbContainer = document.querySelector('.aura-orb-container');
      if (orbContainer) {
        const mouseX = lastMouseX / window.innerWidth - 0.5;
        const mouseY = lastMouseY / window.innerHeight - 0.5;
        orbContainer.style.transform = `translate(${mouseX * 30}px, ${mouseY * 30}px)`;
      }
      isMouseMoving = false;
    });
    isMouseMoving = true;
  }
});

console.log('Synapse AI Landing Page Online.');

// ── (#14) Mobile Hamburger Menu ──
(function() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('mobile-nav-overlay');
  const closeBtn = document.getElementById('mobile-nav-close');
  
  if (!menuBtn || !overlay) return;
  
  menuBtn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
  });
  
  function closeMenu() {
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }
  
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  
  // Close on link click
  overlay.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
  });
})();
