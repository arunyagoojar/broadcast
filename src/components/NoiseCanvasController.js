export function createNoiseController(canvas) {
  const ctx = canvas.getContext('2d');
  let animId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawNoise() {
    const w = canvas.width, h = canvas.height;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 195;
    }
    ctx.putImageData(img, 0, 0);
  }

  function loop() {
    drawNoise();
    animId = requestAnimationFrame(loop);
  }

  return {
    start() {
      canvas.classList.remove('hidden');
      if (!animId) loop();
    },
    stop() {
      canvas.classList.add('hidden');
      cancelAnimationFrame(animId);
      animId = null;
    },
    init() {
      window.addEventListener('resize', resize);
      resize();
      loop();
    },
    destroy() {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
      animId = null;
    },
  };
}
