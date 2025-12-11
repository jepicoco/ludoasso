/**
 * Winter Wonder Theme - Snowfall Animation
 * Creates a beautiful multi-layer snowfall effect
 */

class Snowfall {
  constructor(options = {}) {
    this.canvas = null;
    this.ctx = null;
    this.snowflakes = [];
    this.animationId = null;
    this.isRunning = false;

    // Configuration
    this.config = {
      count: options.count || 100,
      minSize: options.minSize || 2,
      maxSize: options.maxSize || 6,
      minSpeed: options.minSpeed || 0.5,
      maxSpeed: options.maxSpeed || 2,
      wind: options.wind || 0.3,
      opacity: options.opacity || 0.8,
      colors: options.colors || ['#ffffff', '#e0f2fe', '#7dd3fc'],
      layers: options.layers || 3
    };

    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'snowfall-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9998;
    `;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    // Event listeners
    window.addEventListener('resize', () => this.resize());

    // Create snowflakes
    this.createSnowflakes();

    // Start animation
    this.start();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createSnowflakes() {
    this.snowflakes = [];

    for (let layer = 0; layer < this.config.layers; layer++) {
      const layerCount = Math.floor(this.config.count / this.config.layers);
      const layerDepth = (layer + 1) / this.config.layers;

      for (let i = 0; i < layerCount; i++) {
        this.snowflakes.push(this.createSnowflake(layerDepth));
      }
    }
  }

  createSnowflake(depth = 1) {
    const sizeRange = this.config.maxSize - this.config.minSize;
    const size = (this.config.minSize + Math.random() * sizeRange) * depth;

    const speedRange = this.config.maxSpeed - this.config.minSpeed;
    const speed = (this.config.minSpeed + Math.random() * speedRange) * depth;

    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height - this.canvas.height,
      size: size,
      speed: speed,
      depth: depth,
      opacity: this.config.opacity * depth,
      color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      wobbleAmplitude: 0.5 + Math.random() * 1
    };
  }

  update() {
    for (let flake of this.snowflakes) {
      // Update wobble
      flake.wobble += flake.wobbleSpeed;

      // Move snowflake
      flake.y += flake.speed;
      flake.x += Math.sin(flake.wobble) * flake.wobbleAmplitude + this.config.wind * flake.depth;

      // Reset if off screen
      if (flake.y > this.canvas.height + flake.size) {
        flake.y = -flake.size;
        flake.x = Math.random() * this.canvas.width;
      }

      // Wrap horizontally
      if (flake.x > this.canvas.width + flake.size) {
        flake.x = -flake.size;
      } else if (flake.x < -flake.size) {
        flake.x = this.canvas.width + flake.size;
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let flake of this.snowflakes) {
      this.ctx.beginPath();
      this.ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      this.ctx.fillStyle = flake.color;
      this.ctx.globalAlpha = flake.opacity;
      this.ctx.fill();

      // Add subtle glow for larger flakes
      if (flake.size > 4) {
        this.ctx.beginPath();
        this.ctx.arc(flake.x, flake.y, flake.size * 1.5, 0, Math.PI * 2);
        this.ctx.fillStyle = flake.color;
        this.ctx.globalAlpha = flake.opacity * 0.2;
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = 1;
  }

  animate() {
    if (!this.isRunning) return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  setWind(wind) {
    this.config.wind = wind;
  }

  setIntensity(intensity) {
    const targetCount = Math.floor(intensity * 150);

    if (targetCount > this.snowflakes.length) {
      const diff = targetCount - this.snowflakes.length;
      for (let i = 0; i < diff; i++) {
        const depth = (Math.floor(Math.random() * this.config.layers) + 1) / this.config.layers;
        this.snowflakes.push(this.createSnowflake(depth));
      }
    } else if (targetCount < this.snowflakes.length) {
      this.snowflakes.length = targetCount;
    }
  }
}

// Aurora Borealis Effect (optional)
class AuroraBorealis {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.time = 0;
    this.animationId = null;
    this.isRunning = false;

    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'aurora-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 50%;
      pointer-events: none;
      z-index: 9997;
      opacity: 0.3;
    `;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    this.start();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight * 0.5;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);

    // Animated aurora colors
    const shift = Math.sin(this.time * 0.001) * 0.5 + 0.5;

    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, `rgba(16, 185, 129, ${0.1 + shift * 0.1})`);
    gradient.addColorStop(0.5, `rgba(14, 165, 233, ${0.15 + shift * 0.1})`);
    gradient.addColorStop(0.7, `rgba(139, 92, 246, ${0.1 + shift * 0.05})`);
    gradient.addColorStop(1, 'transparent');

    // Draw wavy aurora
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);

    for (let x = 0; x <= this.canvas.width; x += 20) {
      const y = Math.sin(x * 0.003 + this.time * 0.002) * 50 +
                Math.sin(x * 0.007 + this.time * 0.001) * 30;
      this.ctx.lineTo(x, y + this.canvas.height * 0.3);
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.lineTo(0, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  animate() {
    if (!this.isRunning) return;

    this.time++;
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Initialize effects when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    // Start snowfall
    window.snowfall = new Snowfall({
      count: 80,
      minSize: 2,
      maxSize: 5,
      minSpeed: 0.3,
      maxSpeed: 1.5,
      wind: 0.2
    });

    // Optional: Start aurora (uncomment to enable)
    // window.aurora = new AuroraBorealis();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Snowfall, AuroraBorealis };
}
