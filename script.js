/* ================================================================
   Particle Network Canvas — full-page floating particle swarm
   with connection lines and mouse interaction
   ================================================================ */
(function particleNetwork() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // Use fewer particles on mobile for performance
  const PARTICLE_COUNT = isTouchDevice ? 100 : 200;
  const CONNECT_DIST = 150;
  const MOUSE_DIST = 200;
  const MOUSE_FORCE = 0.02;

  let particles = [];
  let width, height;
  let mouse = { x: -1000, y: -1000, active: false };
  let animationId;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2.4 + 1.5,
        baseVx: 0,
        baseVy: 0,
      });
    }
  }

  function update() {
    for (const p of particles) {
      // Gentle random drift
      p.vx += (Math.random() - 0.5) * 0.04;
      p.vy += (Math.random() - 0.5) * 0.04;

      // Damping
      p.vx *= 0.998;
      p.vy *= 0.998;

      // Mouse attraction
      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST && dist > 0) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST * MOUSE_FORCE;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.15;
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      ctx.fillStyle = 'rgba(37, 99, 235, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animate() {
    update();
    draw();
    animationId = requestAnimationFrame(animate);
  }

  // Mouse tracking
  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  document.addEventListener('mouseleave', function () {
    mouse.active = false;
  });

  // Touch: gentle particle disturbance on tap
  document.addEventListener('touchmove', function (e) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.active = true;
  }, { passive: true });

  document.addEventListener('touchend', function () {
    mouse.active = false;
  });

  window.addEventListener('resize', function () {
    resize();
    createParticles();
  });

  resize();
  createParticles();
  animate();
})();


/* ================================================================
   Custom Reticle Cursor — crosshair-style with smooth follow
   ================================================================ */
(function customCursor() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) return;

  const reticle = document.querySelector('.cursor-reticle');
  if (!reticle) return;

  const INTERACTIVE_SELECTOR = 'a, button, input, textarea, .btn, .skill-tags span, .contact-item';
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let scrollTimeout;
  let rafId;

  document.body.classList.add('cursor-active');

  document.addEventListener('mousemove', function (e) {
    targetX = e.clientX;
    targetY = e.clientY;

    // Check if hovering over interactive element
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.closest(INTERACTIVE_SELECTOR)) {
      reticle.classList.add('on-link');
    } else {
      reticle.classList.remove('on-link');
    }
  });

  // Click pulse effect
  document.addEventListener('mousedown', function () {
    reticle.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%) scale(0.8)`;
  });
  document.addEventListener('mouseup', function () {
    reticle.style.transform = '';
  });

  // Hide cursor during scroll
  window.addEventListener('scroll', function () {
    reticle.classList.add('is-scrolling');
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function () {
      reticle.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });

  function follow() {
    // Smooth lerp
    const speed = 0.28;
    currentX += (targetX - currentX) * speed;
    currentY += (targetY - currentY) * speed;

    reticle.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;

    rafId = requestAnimationFrame(follow);
  }

  follow();
})();


/* ================================================================
   Mobile nav toggle
   ================================================================ */
(function mobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
    });
  });
})();


/* ================================================================
   Typewriter effect on hero subtitle
   ================================================================ */
(function typewriter() {
  const el = document.querySelector('.hero-subtitle');
  if (!el) return;
  const text = el.getAttribute('data-text') || el.textContent;
  el.textContent = '';
  el.classList.remove('typing-done');

  let i = 0;
  const speed = 65;

  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed + Math.random() * 45);
    } else {
      el.classList.add('typing-done');
    }
  }

  setTimeout(type, 500);
})();


/* ================================================================
   Timeline draw-on-scroll
   ================================================================ */
(function timelineDraw() {
  const timelines = document.querySelectorAll('.timeline');
  if (!timelines.length) return;

  const obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('drawn');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  timelines.forEach(function (t) { obs.observe(t); });
})();


/* ================================================================
   Scroll-triggered fade-in
   ================================================================ */
(function fadeIn() {
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.fade-in').forEach(function (el) {
    observer.observe(el);
  });

  document.querySelectorAll('section > *').forEach(function (el) {
    // Skip decorative / aria-hidden elements
    if (el.hasAttribute('aria-hidden')) return;
    el.classList.add('fade-in');
    observer.observe(el);
  });
})();


/* ================================================================
   Wave re-trigger on pageshow
   ================================================================ */
(function waveRetrigger() {
  var wave = document.querySelector('.hero-wave path');
  if (!wave) return;

  window.addEventListener('pageshow', function () {
    wave.style.animation = 'none';
    wave.offsetHeight;
    wave.style.animation = '';
  });
})();


/* ================================================================
   Navbar scroll-aware background
   ================================================================ */
(function navbarScroll() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // Set initial state
  if (window.scrollY > 10) {
    navbar.classList.add('scrolled');
  }
})();
