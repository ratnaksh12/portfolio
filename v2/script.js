/* Ratnaksh Tyagi — portfolio interactions
   Kept deliberately small: scroll reveals, mobile nav, copy email. */

document.documentElement.classList.add('js');

const REVEAL_THRESHOLD = 0.12;
const COPY_RESET_DELAY_MS = 1600;

const HERO_STAGGER_MS = 140;
const TILT_MAX_DEG = 5;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initHeroSequence();
initReveals();
initMobileNav();
initCopyEmail();
initFigTilt();
initYear();

/* Hero elements play a staggered entrance instead of waiting for scroll. */
function initHeroSequence() {
    const heroEls = document.querySelectorAll('.hero .reveal');

    heroEls.forEach((el, index) => {
        if (!prefersReducedMotion) {
            el.style.transitionDelay = `${index * HERO_STAGGER_MS}ms`;
            el.addEventListener(
                'transitionend',
                () => { el.style.transitionDelay = ''; },
                { once: true }
            );
        }
        el.classList.add('is-in');
    });
}

function initReveals() {
    const revealEls = document.querySelectorAll('.reveal:not(.is-in)');

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        revealEls.forEach((el) => el.classList.add('is-in'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: REVEAL_THRESHOLD, rootMargin: '0px 0px -5% 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
}

/* Subtle 3D tilt on the portrait, following the pointer. */
function initFigTilt() {
    const fig = document.querySelector('.hero-fig');
    const frame = document.querySelector('.fig-frame');
    if (!fig || !frame || prefersReducedMotion) return;

    fig.addEventListener('pointermove', (event) => {
        const rect = frame.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        frame.style.transform =
            `perspective(800px) rotateY(${x * TILT_MAX_DEG}deg) rotateX(${-y * TILT_MAX_DEG}deg)`;
    });

    fig.addEventListener('pointerleave', () => {
        frame.style.transform = '';
    });
}

function initMobileNav() {
    const toggle = document.getElementById('headToggle');
    const nav = document.getElementById('headNav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.addEventListener('click', (event) => {
        if (event.target instanceof HTMLAnchorElement) {
            nav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

function initCopyEmail() {
    const button = document.getElementById('copyMail');
    const link = document.querySelector('.contact-mail-link');
    if (!button || !link) return;

    button.addEventListener('click', async () => {
        const email = link.textContent.trim();
        try {
            await navigator.clipboard.writeText(email);
            button.textContent = 'copied ✓';
        } catch {
            button.textContent = 'copy failed';
        }
        setTimeout(() => {
            button.textContent = 'copy';
        }, COPY_RESET_DELAY_MS);
    });
}

function initYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }
}
