export function createNoiseController(canvas) {
  const ctx = canvas.getContext('2d');
  let animId = null;
  let imageData = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    imageData = ctx.createImageData(canvas.width, canvas.height);
  }

  function drawNoise() {
    if (!imageData) resize();
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 204) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 195;
    }
    ctx.putImageData(imageData, 0, 0);
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
