(function () {
  const stage = document.querySelector(".spidey-stage");
  const slinger = document.getElementById("spidey-slinger");
  const webActive = document.getElementById("web-active");
  const webGhost = document.getElementById("web-ghost");
  const webBg = document.querySelector(".web-bg");

  if (!stage || !slinger || !webActive || !webGhost) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    stage.classList.add("is-reduced");
    return;
  }

  let ticking = false;
  let lastScrollY = 0;
  let velocity = 0;
  let time = 0;
  let rafId = null;

  function maxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateSpidey(now) {
    time = now * 0.001;
    const scrollY = window.scrollY;
    const progress = scrollY / maxScroll();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    velocity = lerp(velocity, scrollY - lastScrollY, 0.18);
    lastScrollY = scrollY;

    const swingCycles = 10;
    const phase = progress * Math.PI * swingCycles + time * 1.6;
    const segment = Math.floor(progress * swingCycles);
    const anchorRight = segment % 2 === 1;

    const anchorX = anchorRight ? vw * 0.88 : vw * 0.12;
    const anchorY = 48 + (scrollY % 600) * 0.06;
    const ropeBase = Math.min(vh * 0.52, 380);
    const swingAmp = ropeBase * (0.72 + Math.sin(time * 2.2) * 0.06);
    const swing = Math.sin(phase);

    const spideyX = anchorX + swing * swingAmp * (anchorRight ? -1 : 1);
    const spideyY = anchorY + Math.abs(Math.cos(phase * 0.85)) * swingAmp * 0.82 + vh * 0.12;
    const travelY = progress * vh * 0.35;
    const finalY = spideyY + travelY;

    const dx = spideyX - anchorX;
    const dy = finalY - anchorY - 18;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const tilt = swing * 22 + velocity * 0.08;
    const scale = clamp(0.78 + Math.abs(swing) * 0.14, 0.75, 0.95);

    const handOffsetX = anchorRight ? -28 : 28;
    const handX = spideyX + handOffsetX;
    const handY = finalY - 42;

    slinger.style.transform =
      "translate3d(" +
      (spideyX - 45) +
      "px, " +
      (finalY - 55) +
      "px, 0) rotate(" +
      (angle + tilt) +
      "deg) scale(" +
      scale +
      ")";

    webActive.setAttribute("x1", String(anchorX));
    webActive.setAttribute("y1", String(anchorY));
    webActive.setAttribute("x2", String(handX));
    webActive.setAttribute("y2", String(handY));

    const ghostAnchorX = anchorRight ? vw * 0.12 : vw * 0.88;
    const ghostPhase = phase + Math.PI * 0.5;
    const ghostSwing = Math.sin(ghostPhase);
    const ghostX = ghostAnchorX + ghostSwing * swingAmp * 0.5 * (anchorRight ? 1 : -1);
    const ghostY = anchorY + Math.abs(Math.cos(ghostPhase * 0.85)) * swingAmp * 0.4 + vh * 0.08 + travelY * 0.6;

    webGhost.setAttribute("x1", String(ghostAnchorX));
    webGhost.setAttribute("y1", String(anchorY + 20));
    webGhost.setAttribute("x2", String(ghostX));
    webGhost.setAttribute("y2", String(ghostY));

    if (webBg) {
      const parallaxX = progress * 40 + swing * 12;
      const parallaxY = scrollY * 0.08;
      webBg.style.transform =
        "translate3d(" + parallaxX + "px, " + parallaxY + "px, 0) rotate(" + swing * 2 + "deg)";
    }

    stage.classList.toggle("is-swinging", Math.abs(velocity) > 1.5);
    slinger.classList.toggle("is-fast", Math.abs(velocity) > 8);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      rafId = window.requestAnimationFrame(function (now) {
        updateSpidey(now);
        ticking = false;
      });
    }
  }

  function onResize() {
    updateSpidey(performance.now());
  }

  function animateIdle(now) {
    if (!ticking) {
      updateSpidey(now);
    }
    rafId = window.requestAnimationFrame(animateIdle);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  updateSpidey(performance.now());
  rafId = window.requestAnimationFrame(animateIdle);

  window.addEventListener("beforeunload", function () {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
  });
})();
