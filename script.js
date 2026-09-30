// Dynamic theme paint helper function
function getCanvasThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return [
    styles.getPropertyValue('--bg-pink').trim(),
    styles.getPropertyValue('--bg-blue').trim(),
    styles.getPropertyValue('--bg-yellow').trim()
  ];
}

function getStrokeColor() {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue('--stroke-color').trim();
}

// Repaint Hero HTML5 Canvas with active CSS variables
function repaintCanvasWithTheme() {
  const canvas = document.getElementById('paint');
  if (!canvas) return;

  // Resize canvas to parent container dimensions
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const ctx = canvas.getContext('2d');
  const paintColors = getCanvasThemeColors();
  const strokeColor = getStrokeColor();

  // Clear existing canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Paint horizontal background bands
  const bandHeight = canvas.height / 3;
  paintColors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, index * bandHeight, canvas.width, bandHeight);
  });

  // Render hatch stroke texture matching current mode
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;
  for (let y = 0; y < canvas.height; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() * 2 - 1));
    ctx.lineTo(canvas.width, y + (Math.random() * 2 - 1));
    ctx.stroke();
  }
}

// Centralized Theme Manager
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  // Swap hero arch image (Daytime vs Nighttime)
  const heroArch = document.getElementById('hero-arch');
  if (heroArch) {
    heroArch.src = (theme === 'dark') ? 'arch_dark_ver.jpg' : 'arch_light_ver.jpg';
  }

  // Repaint canvas with newly active theme variables
  repaintCanvasWithTheme();
}

// Interactive Paint Mouse/Touch listener
function setupPaintInteractions() {
  const canvas = document.getElementById('paint');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let isPainting = false;

  function draw(e) {
    if (!isPainting) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    const strokeColor = getStrokeColor();
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  canvas.addEventListener('mousedown', () => isPainting = true);
  canvas.addEventListener('mouseup', () => isPainting = false);
  canvas.addEventListener('mousemove', draw);

  canvas.addEventListener('touchstart', () => isPainting = true);
  canvas.addEventListener('touchend', () => isPainting = false);
  canvas.addEventListener('touchmove', draw);
}

// Main DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Read saved theme or default to light
  const initialTheme = localStorage.getItem('theme') || 'light';
  applyTheme(initialTheme);

  // Theme toggle button click event
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const nextTheme = (currentTheme === 'dark') ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }

  // "Start over" reset button listener
  const startOverBtn = document.getElementById('start-over');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      repaintCanvasWithTheme();
    });
  }

  // Setup interactive wet paint drawing listeners
  setupPaintInteractions();

  // Handle browser window resize
  window.addEventListener('resize', () => {
    repaintCanvasWithTheme();
  });
});
