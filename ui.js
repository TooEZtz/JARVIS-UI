
document.addEventListener('DOMContentLoaded', () => {
  // Initialize state
  const state = {
      themeColor: '#00DCFF',
      shapeType: 'circle',
      rippleSpeed: 10,
      showSettings: false,
      ripples: [],
      audioContext: null,
      isInitialized: false,
      particles: [],
      dataStreams: [],
      scanAngle: 0,
      revealStep: 0,
      jarvisTextChars: 0,
      hudTextChars: 0,
      animatedPanels: {},
      panelRevealTimes: {},
      panelTextChars: {},
      panelTypingStarted: {},
      loadingProgress: 0,
      loadingComplete: false,
      circuitPaths: [],
      regenerateCircuits: false,
      circuitPathsCreatedTime: null,
      hexGridInitialized: false,
      hexGridStartTime: null,
      hexGrid: []
  };
  
  // DOM elements
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettings = document.getElementById('close-settings');
  const colorPicker = document.getElementById('color-picker');
  const colorValue = document.getElementById('color-value');
  const shapeSelect = document.getElementById('shape-select');
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  
  // Resize canvas to full window
  function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
  }
  
  // Initialize audio context on first interaction
  function initializeAudio() {
      if (!state.isInitialized) {
          state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          state.isInitialized = true;
      }
  }
  
  // Play futuristic sound effect
  function playSound() {
      if (!state.audioContext) return;
      
      const context = state.audioContext;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(220, context.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
  }
  
  // Handle interaction (click or touch)
  function handleInteraction(e) {
      // Don't create ripples if clicking on settings panel
      if (e.target.closest('.settings-panel')) {
          return;
      }
      
      initializeAudio();
      playSound();
      
      let x, y;
      
      if (e.touches) {
          x = e.touches[0].clientX;
          y = e.touches[0].clientY;
      } else {
          x = e.clientX;
          y = e.clientY;
      }
      
      const maxSize = Math.max(window.innerWidth, window.innerHeight) * 0.8;
      state.ripples.push({ x, y, size: 0, opacity: 1, maxSize });
      
      // Visual ripple effect
      createRippleEffect(x, y);
  }
  
  // Create visual ripple effect
  function createRippleEffect(x, y) {
      const ripple = document.createElement('div');
      ripple.className = 'ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.border = `1px solid ${state.themeColor}`;
      document.body.appendChild(ripple);
      
      setTimeout(() => {
          ripple.remove();
      }, 1000);
  }
  
  // Toggle settings panel
  function toggleSettings() {
      state.showSettings = !state.showSettings;
      if (state.showSettings) {
          settingsPanel.classList.remove('hidden');
      } else {
          settingsPanel.classList.add('hidden');
      }
  }
  
  // Handle color change
  function handleColorChange(e) {
      state.themeColor = e.target.value;
      colorValue.textContent = state.themeColor;
      updateGlowEffect();
      saveSettings();
  }
  
  // Handle shape change
  function handleShapeChange(e) {
      state.shapeType = e.target.value;
      saveSettings();
  }
  
  // Handle speed change
  function handleSpeedChange(e) {
      state.rippleSpeed = parseInt(e.target.value);
      speedValue.textContent = state.rippleSpeed;
      saveSettings();
  }
  
  // Update glow effect color
  function updateGlowEffect() {
      const glowElements = document.querySelectorAll('.glow-effect');
      glowElements.forEach(el => {
          el.style.color = state.themeColor;
          el.style.textShadow = `0 0 10px ${state.themeColor}`;
      });
      
      // Update settings panel border and buttons
      settingsPanel.style.borderColor = state.themeColor;
      settingsToggle.querySelector('svg').style.stroke = state.themeColor;
      closeSettings.querySelector('svg').style.stroke = state.themeColor;
      
      // Update slider thumb color
      speedSlider.style.color = state.themeColor;
  }
  
  // Save settings to localStorage
  function saveSettings() {
      localStorage.setItem('jarvisSettings', JSON.stringify({
          themeColor: state.themeColor,
          shapeType: state.shapeType,
          rippleSpeed: state.rippleSpeed
      }));
  }
  
  // Load settings from localStorage
  function loadSettings() {
      const savedSettings = localStorage.getItem('jarvisSettings');
      if (savedSettings) {
          try {
              const settings = JSON.parse(savedSettings);
              state.themeColor = settings.themeColor || state.themeColor;
              state.shapeType = settings.shapeType || state.shapeType;
              state.rippleSpeed = settings.rippleSpeed || state.rippleSpeed;
              
              // Update UI to match loaded settings
              colorPicker.value = state.themeColor;
              colorValue.textContent = state.themeColor;
              shapeSelect.value = state.shapeType;
              speedSlider.value = state.rippleSpeed;
              speedValue.textContent = state.rippleSpeed;
              updateGlowEffect();
          } catch (e) {
              console.error('Error loading settings:', e);
          }
      }
  }
  
  // Convert hex to RGB
  function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
      } : { r: 0, g: 220, b: 255 };
  }
  
  // Draw different shapes
  function drawShape(x, y, size, color) {
      switch (state.shapeType) {
          case 'square':
              ctx.fillStyle = color;
              ctx.fillRect(x - size / 2, y - size / 2, size, size);
              break;
          case 'diamond':
              ctx.beginPath();
              ctx.moveTo(x, y - size / 2);
              ctx.lineTo(x + size / 2, y);
              ctx.lineTo(x, y + size / 2);
              ctx.lineTo(x - size / 2, y);
              ctx.closePath();
              ctx.fillStyle = color;
              ctx.fill();
              break;
          case 'triangle':
              ctx.beginPath();
              ctx.moveTo(x, y - size / 2);
              ctx.lineTo(x + size / 2, y + size / 2);
              ctx.lineTo(x - size / 2, y + size / 2);
              ctx.closePath();
              ctx.fillStyle = color;
              ctx.fill();
              break;
          case 'circle':
          default:
              ctx.beginPath();
              ctx.arc(x, y, size / 2, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.fill();
              break;
      }
  }
  
  // Draw halftone wave background
  function drawHalftoneWave(time) {
      const gridSize = 20;
      const rows = Math.ceil(canvas.height / gridSize);
      const cols = Math.ceil(canvas.width / gridSize);
      const rgb = hexToRgb(state.themeColor);
      
      for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
              const centerX = x * gridSize;
              const centerY = y * gridSize;
              const distanceFromCenter = Math.sqrt(
                  Math.pow(centerX - canvas.width / 2, 2) + 
                  Math.pow(centerY - canvas.height / 2, 2)
              );
              const maxDistance = Math.sqrt(
                  Math.pow(canvas.width / 2, 2) + 
                  Math.pow(canvas.height / 2, 2)
              );
              const normalizedDistance = distanceFromCenter / maxDistance;
              
              // Base wave effect
              let waveOffset = Math.sin(normalizedDistance * 10 - time) * 0.5 + 0.5;
              
              // Apply ripple effects
              state.ripples.forEach(ripple => {
                  const distanceFromRipple = Math.sqrt(
                      Math.pow(centerX - ripple.x, 2) + 
                      Math.pow(centerY - ripple.y, 2)
                  );
                  
                  const rippleEffect = 
                      Math.sin(distanceFromRipple / 30 - ripple.size / 100) * 
                      0.5 * 
                      (1 - distanceFromRipple / ripple.maxSize) * 
                      ripple.opacity;
                  
                  if (distanceFromRipple < ripple.size) {
                      waveOffset += rippleEffect;
                  }
              });
              
              waveOffset = Math.max(0, Math.min(1, waveOffset));
              const size = gridSize * waveOffset * 0.8;
              const color = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${waveOffset * 0.5})`;
              
              drawShape(centerX, centerY, size, color);
          }
      }
  }
  
  // Draw JARVIS text with terminal style
  function drawJarvisText(time) {
      ctx.save();
      
      const rgb = hexToRgb(state.themeColor);
      
      // Draw semi-transparent dark backdrop
      const boxWidth = 440;
      const boxHeight = 140;
      const boxX = canvas.width / 2 - boxWidth / 2;
      const boxY = canvas.height / 2 - boxHeight / 2;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#000';
      ctx.filter = 'blur(2px)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      
      // Strong black shadow for contrast
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 16;
      
      // Terminal-style text with monospace font
      ctx.font = 'bold 76px "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Solid color with colored glow
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      
      // Draw text with slight animation
      const offsetY = Math.sin(time * 1.5) * 2;
      ctx.fillText("J.A.R.V.I.S.", canvas.width / 2, canvas.height / 2 + offsetY);
      
      // Add colored glow on top
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
      ctx.shadowBlur = 32;
      ctx.globalAlpha = 0.85;
      ctx.fillText("J.A.R.V.I.S.", canvas.width / 2, canvas.height / 2 + offsetY);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
      // Add terminal-style underline
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 180, canvas.height / 2 + 50 + offsetY);
      ctx.lineTo(canvas.width / 2 + 180, canvas.height / 2 + 50 + offsetY);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 + Math.sin(time * 2) * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Add terminal-style box around text
      ctx.beginPath();
      ctx.rect(canvas.width / 2 - 200, canvas.height / 2 - 60, 400, 120);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 + Math.sin(time * 3) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Add blinking cursor
      if (Math.sin(time * 8) > 0) {
          ctx.fillRect(canvas.width / 2 + 190, canvas.height / 2, 10, 3);
      }
      
      ctx.restore();
  }
  
  // Draw HUD elements
  function drawHUD(time) {
      ctx.save();
      
      const rgb = hexToRgb(state.themeColor);
      
      // Enhanced top-right corner elements
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
      ctx.textAlign = "right";
      
      const date = new Date();
      const timeString = date.toLocaleTimeString();
      ctx.fillText(`SYSTEM TIME: ${timeString}`, canvas.width - 20, 30);
      ctx.fillText("SYSTEM STATUS: ONLINE", canvas.width - 20, 50);
      ctx.fillText("SECURITY LEVEL: MAXIMUM", canvas.width - 20, 70);
      
      // Add hexagonal radar
      const centerX = 100;
      const centerY = canvas.height - 100;
      const radius = 50;
      
      // Draw radar sweep
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, state.scanAngle, state.scanAngle + Math.PI / 3);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      ctx.fill();
      
      // Draw radar circles
      for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * i / 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
          ctx.stroke();
      }
      
      state.scanAngle += 0.03;
      if (state.scanAngle > Math.PI * 2) state.scanAngle = 0;

      // Add system metrics
      const metrics = [
          "CPU LOAD: " + Math.floor(50 + Math.sin(time) * 20) + "%",
          "MEMORY: " + Math.floor(70 + Math.sin(time * 1.5) * 15) + "%",
          "NETWORK: " + Math.floor(90 + Math.sin(time * 0.8) * 10) + "%"
      ];

      metrics.forEach((metric, i) => {
          ctx.fillText(metric, canvas.width - 20, 100 + i * 20);
      });
      
      ctx.restore();
  }
  
  // Update ripple animations
  function updateRipples() {
      state.ripples = state.ripples
          .map(ripple => ({
              ...ripple,
              size: ripple.size + state.rippleSpeed,
              opacity: ripple.opacity - 0.01
          }))
          .filter(ripple => ripple.opacity > 0);
  }
  
  // Add new function for particle system
  function createParticle() {
      // Function disabled
      return;
  }

  // Draw floating data streams on the canvas
  function drawDataStreams(time) {
      // Function disabled
      return;
  }
  
  // Draw animated hexagonal grid overlay with proper fade-in
  function drawHexGrid(time) {
      const hexSize = 48;
      const hexHeight = Math.sqrt(3) * hexSize;
      const hexWidth = 2 * hexSize;
      const vertDist = hexHeight;
      const horizDist = 1.5 * hexSize;
      const rgb = hexToRgb(state.themeColor);
      
      // Initialize hexagon fade timers if needed
      if (!state.hexGridInitialized) {
          state.hexGridInitialized = true;
          state.hexGridStartTime = time;
          
          // Create a grid of hexagon data with individual fade delays
          state.hexGrid = [];
          
          // Calculate number of hexagons needed
          const cols = Math.ceil(canvas.width / horizDist) + 2;
          const rows = Math.ceil(canvas.height / vertDist) + 2;
          
          // Create staggered fade-in pattern from center outward
          const centerCol = Math.floor(cols / 2);
          const centerRow = Math.floor(rows / 2);
          
          for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                  // Calculate distance from center (for staggered fade)
                  const distFromCenter = Math.sqrt(
                      Math.pow(col - centerCol, 2) + 
                      Math.pow(row - centerRow, 2)
                  );
                  
                  // Delay based on distance from center (0-2.5s)
                  const fadeDelay = distFromCenter * 0.2;
                  
                  // Calculate actual position
                  const xOffset = ((row % 2) * 0.5) * horizDist;
                  const x = (col - 1) * horizDist + xOffset;
                  const y = (row - 1) * vertDist;
                  
                  state.hexGrid.push({
                      x: x,
                      y: y,
                      fadeDelay: fadeDelay,
                      fadeProgress: 0,
                      size: hexSize
                  });
              }
          }
      }
      
      // Calculate overall grid opacity from global transition
      const globalOpacity = Math.min(1, elementTransitions.hexGrid * 2);
      
      // Update fade progress for each hexagon
      const hexFadeDuration = 0.5; // duration in seconds for each hex to fade in
      for (let i = 0; i < state.hexGrid.length; i++) {
          const hex = state.hexGrid[i];
          const elapsed = time - state.hexGridStartTime - hex.fadeDelay;
          
          if (elapsed > 0) {
              // Fade in over hexFadeDuration seconds
              hex.fadeProgress = Math.min(1, elapsed / hexFadeDuration);
          }
      }
      
      // Draw hexagons with individual fade-in
      ctx.save();
      
      // Animate grid offset for movement
      const offsetX = (Math.sin(time * 0.2) * 30) % horizDist;
      const offsetY = (Math.cos(time * 0.2) * 30) % vertDist;
      
      for (let i = 0; i < state.hexGrid.length; i++) {
          const hex = state.hexGrid[i];
          
          // Skip if not yet started fading in
          if (hex.fadeProgress <= 0) continue;
          
          // Calculate combined opacity
          const opacity = hex.fadeProgress * globalOpacity * 0.32;
          
          // Only draw if visible enough
          if (opacity > 0.01) {
              ctx.globalAlpha = opacity;
              ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
              ctx.lineWidth = 1.5;
              
              // Draw hexagon with current position + animation offset
              drawHexagon(
                  hex.x + offsetX, 
                  hex.y + offsetY, 
                  // Scale size based on fade progress for a "grow" effect
                  hex.size * (0.7 + 0.3 * hex.fadeProgress)
              );
          }
      }
      
      ctx.restore();
  }

  function drawHexagon(x, y, size) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i;
          const px = x + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
  }
  
  // Draw animated circuit lines
  function drawCircuitLines(time) {
      const rgb = hexToRgb(state.themeColor);
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const numLines = 16;
      const margin = 5;
      const pulseRadius = 4.5;
      
      // Add a timestamp for when lines were first created (for fade-in animation)
      if (!state.circuitPathsCreatedTime) {
          state.circuitPathsCreatedTime = time;
      }
      
      // Calculate fade-in progress (0 to 1 over 3 seconds)
      const fadeInDuration = 3; // seconds for full fade-in
      const fadeInProgress = Math.min(1, (time - state.circuitPathsCreatedTime) / fadeInDuration);
      
      // Force regeneration of circuit paths for this session
      if (!state.circuitPaths || state.circuitPaths.length === 0 || state.regenerateCircuits) {
          state.regenerateCircuits = false;
          state.circuitPathsCreatedTime = time; // Reset the creation time
          console.log("Generating circuit paths");
          
          // Initialize circuit paths
          state.circuitPaths = [];
          for (let i = 0; i < numLines; i++) {
              // Determine which edge to start from (0: top, 1: right, 2: bottom, 3: left)
              // Distribute evenly across all edges
              const edge = i % 4;
              
              // Calculate starting point precisely on the edge
              let x = 0, y = 0;
              
              // Distribute points evenly along the edge
              const fraction = (Math.floor(i / 4) + Math.random() * 0.8 + 0.1) / Math.ceil(numLines / 4);
              
              if (edge === 0) { // top
                  x = fraction * canvas.width;
                  y = margin;
              } else if (edge === 1) { // right
                  x = canvas.width - margin;
                  y = fraction * canvas.height;
              } else if (edge === 2) { // bottom
                  x = (1 - fraction) * canvas.width; // Reverse direction for variety
                  y = canvas.height - margin;
              } else { // left
                  x = margin;
                  y = (1 - fraction) * canvas.height; // Reverse direction for variety
              }
              
              // Create a path with 3-6 segments (2-5 bends)
              const numSegments = 3 + Math.floor(Math.random() * 4);
              let path = [{x, y}];
              
              // Start direction perpendicular to the edge
              let lastDir = edge % 2 === 0 ? 'v' : 'h';
              
              // Track current position
              let px = x, py = y;
              
              // Add intermediate points with bends
              for (let s = 0; s < numSegments - 1; s++) {
                  let nx = px, ny = py;
                  
                  // Calculate next segment length
                  // Shorter segments for early bends, longer for later ones
                  const segmentRatio = (s + 1) / numSegments;
                  const maxDist = Math.min(canvas.width, canvas.height) * (0.2 + segmentRatio * 0.3);
                  
                  if (lastDir === 'h') {
                      // vertical move
                      const moveDir = Math.random() > 0.5 ? 1 : -1; // Up or down
                      const moveAmount = (0.3 + Math.random() * 0.7) * maxDist * moveDir;
                      
                      // Ensure we stay on screen with some margin
                      ny = py + moveAmount;
                      ny = Math.max(margin * 2, Math.min(canvas.height - margin * 2, ny));
                      
                      lastDir = 'v';
                  } else {
                      // horizontal move
                      const moveDir = Math.random() > 0.5 ? 1 : -1; // Left or right
                      const moveAmount = (0.3 + Math.random() * 0.7) * maxDist * moveDir;
                      
                      // Ensure we stay on screen with some margin
                      nx = px + moveAmount;
                      nx = Math.max(margin * 2, Math.min(canvas.width - margin * 2, nx));
                      
                      lastDir = 'h';
                  }
                  
                  // For the last segment or second-to-last segment, target toward center area
                  if (s === numSegments - 2) {
                      const targetArea = {
                          minX: centerX - canvas.width * 0.3,
                          maxX: centerX + canvas.width * 0.3,
                          minY: centerY - canvas.height * 0.3,
                          maxY: centerY + canvas.height * 0.3
                      };
                      
                      if (lastDir === 'h') {
                          nx = Math.random() * (targetArea.maxX - targetArea.minX) + targetArea.minX;
                      } else {
                          ny = Math.random() * (targetArea.maxY - targetArea.minY) + targetArea.minY;
                      }
                  }
                  
                  path.push({x: nx, y: ny});
                  px = nx; py = ny;
              }
              
              // Calculate segment lengths for the path
              let segLens = [];
              let totalLen = 0;
              for (let p = 1; p < path.length; p++) {
                  const len = Math.hypot(path[p].x - path[p-1].x, path[p].y - path[p-1].y);
                  segLens.push(len);
                  totalLen += len;
              }
              
              // Add animation properties for each circuit
              state.circuitPaths.push({
                  path,
                  segLens,
                  totalLen,
                  offset: Math.random(),
                  // Add individual fade-in delay for each line (0-1.5 seconds)
                  fadeDelay: Math.random() * 1.5,
                  // Add fade-in progress tracking
                  fadeProgress: 0
              });
          }
      }
      
      // Debug check
      if (!state.circuitPaths || state.circuitPaths.length === 0) {
          console.error("Circuit paths not initialized properly");
          return;
      }
      
      // Update fade progress for each line
      for (let i = 0; i < state.circuitPaths.length; i++) {
          const circuit = state.circuitPaths[i];
          const elapsed = time - state.circuitPathsCreatedTime - circuit.fadeDelay;
          
          // Calculate line-specific fade-in progress (wait for delay, then fade over 1 second)
          if (elapsed > 0) {
              circuit.fadeProgress = Math.min(1, elapsed / 1);
          } else {
              circuit.fadeProgress = 0;
          }
      }
      
      // Sort paths by fade progress to draw non-faded lines on top
      state.circuitPaths.sort((a, b) => a.fadeProgress - b.fadeProgress);
      
      // Draw and animate each circuit path
      for (let i = 0; i < state.circuitPaths.length; i++) {
          const circuit = state.circuitPaths[i];
          
          // Skip if not started fading in yet
          if (circuit.fadeProgress <= 0) continue;
          
          // Apply fade-in effect for line
          const fadedOpacity = circuit.fadeProgress * 0.9; // Max opacity 0.9
          
          // Draw the path with animated fade-in
          ctx.save();
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fadedOpacity})`;
          
          // Draw line with gradual reveal from start to end
          const revealProgress = Math.min(circuit.fadeProgress * 2, 1); // Reveal faster than opacity
          const totalPathLength = circuit.totalLen;
          const visibleLength = totalPathLength * revealProgress;
          
          // Calculate visible portion of the path
          let drawnLength = 0;
          let lastPointIndex = 0;
          let lastPoint = circuit.path[0];
          
          // Determine last fully visible point
          for (let p = 1; p < circuit.path.length; p++) {
              const segLength = circuit.segLens[p-1];
              if (drawnLength + segLength <= visibleLength) {
                  drawnLength += segLength;
                  lastPointIndex = p;
                  lastPoint = circuit.path[p];
              } else {
                  // This segment is partially visible
                  const segmentFraction = (visibleLength - drawnLength) / segLength;
                  const partialX = circuit.path[p-1].x + segmentFraction * (circuit.path[p].x - circuit.path[p-1].x);
                  const partialY = circuit.path[p-1].y + segmentFraction * (circuit.path[p].y - circuit.path[p-1].y);
                  lastPoint = {x: partialX, y: partialY};
                  break;
              }
          }
          
          // Draw the visible portion of the path
          ctx.beginPath();
          ctx.moveTo(circuit.path[0].x, circuit.path[0].y);
          
          // Draw full segments
          for (let p = 1; p <= lastPointIndex; p++) {
              ctx.lineTo(circuit.path[p].x, circuit.path[p].y);
          }
          
          // Draw partial segment if needed
          if (lastPointIndex < circuit.path.length - 1 && drawnLength < visibleLength) {
              ctx.lineTo(lastPoint.x, lastPoint.y);
          }
          
          ctx.stroke();
          ctx.restore();
          
          // Only show pulse animation once the line is fully revealed
          if (circuit.fadeProgress >= 0.5) {
              // Animate glowing pulse along the path
              const pulseOpacity = Math.min(1, (circuit.fadeProgress - 0.5) * 2); // Fade in pulse after line appears
              
              // Slow down pulse timing for new lines
              let t = (time * 0.05 + circuit.offset) % 1;
              let pulseDist = t * circuit.totalLen;
              let px2 = circuit.path[0].x, py2 = circuit.path[0].y;
              
              // Find position along the path
              for (let p = 1; p < circuit.path.length; p++) {
                  if (pulseDist > circuit.segLens[p-1]) {
                      pulseDist -= circuit.segLens[p-1];
                      px2 = circuit.path[p].x;
                      py2 = circuit.path[p].y;
                  } else {
                      const frac = pulseDist / circuit.segLens[p-1];
                      px2 = circuit.path[p-1].x + (circuit.path[p].x - circuit.path[p-1].x) * frac;
                      py2 = circuit.path[p-1].y + (circuit.path[p].y - circuit.path[p-1].y) * frac;
                      break;
                  }
              }
              
              // Draw a pulse with fade-in
              ctx.save();
              ctx.globalAlpha = pulseOpacity;
              
              // Draw outer glow
              const outerGlow = pulseRadius * 3;
              const gradient = ctx.createRadialGradient(px2, py2, pulseRadius / 2, px2, py2, outerGlow);
              gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`);
              gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
              gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
              
              ctx.beginPath();
              ctx.arc(px2, py2, outerGlow, 0, Math.PI * 2);
              ctx.fillStyle = gradient;
              ctx.fill();
              
              // Draw core
              ctx.beginPath();
              ctx.arc(px2, py2, pulseRadius, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`;
              ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`;
              ctx.shadowBlur = 15;
              ctx.fill();
              ctx.restore();
          }
      }
      ctx.restore();
  }

  // Draw scanline overlay - now disabled
  function drawScanlines() {
      // Function disabled to remove scanline visualization
      return;
  }
  
  // Update staged reveal sequence with precise timing
  function startRevealSequence() {
      let step = 0;
      const totalPanels = hudPanels.length;
      const totalSteps = 7 + totalPanels + 2; // 7 base + N panels + 1 log + 1 JARVIS
      
      // Calculate timing to ensure all elements appear within the 22 seconds
      const totalTime = 22000; // 22 seconds in ms
      const timePerStep = totalTime / (totalSteps + 1); // Reserve last step for JARVIS
      
      function nextStep() {
          step++;
          state.revealStep = step;
          
          if (step === 5) { // Start HUD typing
              state.hudTextChars = 0;
              hudTyping();
          }
          
          if (step < totalSteps) {
              // Schedule next step, ensuring even pacing
              setTimeout(nextStep, timePerStep);
          }
      }
      
      // Start the first step after a short delay
      setTimeout(nextStep, 200);
  }

  function hudTyping() {
      const hudFull = getHudText();
      if (state.hudTextChars < hudFull.length) {
          // Play time sound effect when starting to type the first character
          if (state.hudTextChars === 0) {
              const timeSound = new Audio('audio/time.mp3');
              timeSound.play();
          }
          
          // Play key sound for each character
          const keySound = document.getElementById('key-sfx');
          if (keySound) {
              const keyClone = keySound.cloneNode();
              keyClone.volume = 0.3;
              keyClone.play();
              keyClone.onended = () => keyClone.remove();
          }
          
          state.hudTextChars++;
          setTimeout(hudTyping, 50); // Type faster, every 50ms
      }
  }
  function jarvisTyping() {
      const jarvisFull = 'J.A.R.V.I.S.';
      
      // If we haven't finished typing all characters
      if (state.jarvisTextChars < jarvisFull.length) {
          // Play key sound for each character
          const keySound = document.getElementById('key-sfx');
          if (keySound) {
              // Clone the audio element to allow overlapping sounds
              const keyClone = keySound.cloneNode();
              keyClone.volume = 0.6;
              keyClone.play();
              keyClone.onended = () => keyClone.remove();
          }
          
          // Increment character count
          state.jarvisTextChars++;
          
          // Schedule next character with consistent timing
          setTimeout(jarvisTyping, 150); // Slower typing for emphasis
      }
  }

  // Helper for HUD typing
  function getHudText() {
      const date = new Date();
      const timeString = date.toLocaleTimeString();
      return `SYSTEM TIME: ${timeString}\nSYSTEM STATUS: ONLINE\nSECURITY LEVEL: MAXIMUM`;
  }
  
  // Main animation loop
  let lastTimestamp = performance.now();
  let time = 0;
  let jarvisIntroPlayed = false;
  // Add transition timers for each element
  let elementTransitions = {
      background: 0,
      hexGrid: 0,
      ripples: 0,
      lines: 0
  };

  function animate(now) {
      const delta = (now - lastTimestamp) / 1000; // seconds
      lastTimestamp = now;
      time += delta;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate timing information for animations
      const startTime = window.animationStartTime || Date.now();
      const elapsedTime = (Date.now() - startTime) / 1000; // seconds since start
      
      // 1. Background with fade-in
      if (state.revealStep >= 1) {
          // Update background transition with smoother animation
          const bgDuration = 2.5; // seconds for full fade-in
          elementTransitions.background = Math.min(elementTransitions.background + delta * 0.7, 1);
          
          // Apply background color with fade-in
          const bgOpacity = Math.min(1, elapsedTime / bgDuration);
          ctx.globalAlpha = bgOpacity;
      ctx.fillStyle = "rgb(0, 0, 20)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
          // Hex grid with fade-in
          if (state.revealStep >= 2) {
              // Staggered start for hex grid (0.5 seconds after background)
              const hexStartDelay = 0.5;
              const hexFadeDuration = 3.0; // seconds (extended for proper fade)
              const hexElapsed = elapsedTime - hexStartDelay;
              
              if (hexElapsed > 0) {
                  // Calculate hex grid opacity - more gradual increase
                  const hexOpacity = Math.min(1, hexElapsed / hexFadeDuration);
                  // Allow time to update hexagon fade-in
                  elementTransitions.hexGrid = Math.min(elementTransitions.hexGrid + delta * 0.3, hexOpacity);
                  
                  // Draw with calculated opacity - drawHexGrid handles individual hex fading
                  drawHexGrid(time);
              }
          }
          
          // Halftone wave with fade-in
          ctx.globalAlpha = elementTransitions.background;
      drawHalftoneWave(time);
          ctx.globalAlpha = 1;
      }
      
      // 2. Ripples with fade-in
      if (state.revealStep >= 2) {
          // Calculate ripple fade-in progress
          const rippleStartDelay = 1.2; // seconds
          const rippleFadeDuration = 2.0; // seconds
          const rippleElapsed = elapsedTime - rippleStartDelay;
          
          if (rippleElapsed > 0) {
              const rippleOpacity = Math.min(1, rippleElapsed / rippleFadeDuration);
              elementTransitions.ripples = Math.min(elementTransitions.ripples + delta * 0.6, rippleOpacity);
              
              ctx.globalAlpha = elementTransitions.ripples;
      updateRipples();
              ctx.globalAlpha = 1;
          }
      }
      
      // 3. Circuit lines with fade-in
      if (state.revealStep >= 3) {
          // Staggered start for circuit lines
          const linesStartDelay = 2.0; // seconds
          const linesFadeDuration = 3.0; // seconds (longer fade for dramatic effect)
          const linesElapsed = elapsedTime - linesStartDelay;
          
          if (linesElapsed > 0) {
              const linesOpacity = Math.min(1, linesElapsed / linesFadeDuration);
              elementTransitions.lines = Math.min(elementTransitions.lines + delta * 0.5, linesOpacity);
              
              // Apply opacity to circuit lines
              ctx.globalAlpha = elementTransitions.lines * 0.8; // Adjust for desired opacity
              drawCircuitLines(time);
              ctx.globalAlpha = 1;
          }
      }
      
      // 4. Scanning line with fade-in
      if (state.revealStep >= 4) {
          const scanStartDelay = 3.0; // seconds
          const scanFadeDuration = 1.5; // seconds
          const scanElapsed = elapsedTime - scanStartDelay;
          
          if (scanElapsed > 0) {
              const scanOpacity = Math.min(1, scanElapsed / scanFadeDuration);
              ctx.globalAlpha = 0.7 * scanOpacity + 0.3 * Math.min((state.revealStep - 3), 1);
              drawScanlines();
              ctx.globalAlpha = 1;
          }
      }
      
      // 5. HUD with typing (already has animation)
      if (state.revealStep >= 5) {
          drawHUDTyping(time);
      }
      
      // 6. Radar/scan
      if (state.revealStep >= 6) {
          drawHUDRadar(time, 1);
      }
      
      // 7. Settings button
      if (state.revealStep >= 7) {
          document.getElementById('settings-toggle').style.opacity = '1';
      } else {
          document.getElementById('settings-toggle').style.opacity = '0';
      }
      
      // 8+ steps: floating HUD panels, one by one
      for (let i = 0; i < hudPanels.length; i++) {
          // Define which step reveals this panel
          const revealStep = 8 + i;
          
          // Check if this panel should be visible
          if (state.revealStep >= revealStep) {
              // Only flag as newly revealed the first time we hit this step
              const isNewlyRevealed = (state.revealStep === revealStep);
              drawSingleHUDPanel(time, hudPanels[i], isNewlyRevealed);
          }
      }
      
      // System log after all panels
      if (state.revealStep >= 8 + hudPanels.length) {
          drawSystemLog(time, true);
      }
      
      // Loading bar from the beginning until JARVIS
      if (state.revealStep >= 1 && !state.loadingComplete) {
          const loadingElapsed = (Date.now() - window.loadingStartTime) / 1000; // seconds
          const totalLoadingTime = 22; // 22 seconds total loading time
          
          // Calculate progress based on elapsed time
          state.loadingProgress = Math.min(loadingElapsed / totalLoadingTime, 1);
          
          // Draw loading bar
          drawLoadingBar(time);
          
          // Check if loading is complete
          if (state.loadingProgress >= 1 && !state.loadingComplete) {
              state.loadingComplete = true;
              // Schedule JARVIS to appear at exactly 23 seconds
              const timeUntilJarvis = Math.max(0, 23000 - (Date.now() - window.loadingStartTime));
              setTimeout(() => {
                  state.revealStep = 8 + hudPanels.length + 1;
                  state.jarvisTextChars = 0;
                  jarvisTyping();
              }, timeUntilJarvis);
          }
      }
      
      // JARVIS box/text at the very end (only after loading is complete)
      if (state.revealStep >= 8 + hudPanels.length + 1) {
          // Add fade out animation for loading bar
          const fadeOutDuration = 500; // 0.5 second fade out
          const fadeOutStart = window.loadingStartTime + 22000; // 22 seconds after start
          const fadeOutProgress = Math.min((Date.now() - fadeOutStart) / fadeOutDuration, 1);
          
          // Draw loading bar with fade out if still in fade out period
          if (fadeOutProgress < 1) {
              ctx.save();
              ctx.globalAlpha = 1 - fadeOutProgress;
              drawLoadingBar(time);
              ctx.restore();
          }
          
          // Draw JARVIS with fade in
          ctx.save();
          ctx.globalAlpha = Math.min(1, fadeOutProgress * 2); // Faster fade in for smoother transition
          drawJarvisTextTyping(time);
          ctx.restore();
          
          // Start sound effects when JARVIS is fully visible
          if (!jarvisIntroPlayed && window.playJarvisIntro && fadeOutProgress >= 0.5) {
              jarvisIntroPlayed = true;
              // Play JARVIS appearance sound first
              const jarvisSound = new Audio('audio/jarvis.mp3');
              jarvisSound.addEventListener('ended', () => {
                  // Play the intro voice after the sound effect ends
                  window.playJarvisIntro();
              });
              jarvisSound.play();
          }
      }
      
      // Removed particle and data stream calls

      requestAnimationFrame(animate);
  }
  
  // Draw HUD with typing animation (improved visibility)
  function drawHUDTyping(time) {
      // Draw backdrop
      ctx.save();
      const rgb = hexToRgb(state.themeColor);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(canvas.width - 350, 18, 340, 100, 16);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Draw text
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      ctx.textAlign = "right";
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
      ctx.shadowBlur = 12;
      
      const hudFull = getHudText();
      const hudTyped = hudFull.slice(0, state.hudTextChars);
      const lines = hudTyped.split('\n');
      
      // Draw typed text
      for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], canvas.width - 30, 45 + i * 26);
      }
      
      // Add blinking cursor if still typing
      if (state.hudTextChars < hudFull.length && Math.sin(time * 8) > 0) {
          const lastLine = lines[lines.length - 1] || '';
          const cursorX = canvas.width - 30 - ctx.measureText('_').width;
          const cursorY = 45 + (lines.length - 1) * 26;
          ctx.fillRect(cursorX, cursorY - 3, 10, 2);
      }
      
      ctx.shadowBlur = 0;
      ctx.restore();
  }
  // Draw radar/scan only (improved visibility) - now disabled
  function drawHUDRadar(time, opacity) {
      // Function disabled to remove radar visualization
      return;
  }
  // Draw JARVIS text with typing animation
  function drawJarvisTextTyping(time) {
      ctx.save();
      const rgb = hexToRgb(state.themeColor);
      // Draw semi-transparent dark backdrop
      const boxWidth = 440;
      const boxHeight = 140;
      const boxX = canvas.width / 2 - boxWidth / 2;
      const boxY = canvas.height / 2 - boxHeight / 2;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#000';
      ctx.filter = 'blur(2px)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      // Strong black shadow for contrast
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 16;
      ctx.font = 'bold 76px "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      const jarvisFull = 'J.A.R.V.I.S.';
      let displayText = jarvisFull.slice(0, state.jarvisTextChars);
      if (state.jarvisTextChars < jarvisFull.length && Math.floor(time * 2) % 2 === 0) displayText += '_';
      const offsetY = Math.sin(time * 1.5) * 2;
      
      // Check if JARVIS is speaking
      if (window.jarvisSpeaking) {
          // Apply pulsating effect directly
          const pulseIntensity = Math.sin(time * 8) * 0.05 + 1; // Creates a pulsating scale between 0.95 and 1.05
          const glowIntensity = Math.sin(time * 8) * 10 + 36; // Creates a pulsating glow
          
          ctx.save();
          // Enhanced glow for speaking effect
          ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`;
          ctx.shadowBlur = glowIntensity;
          
          // Draw slightly larger text while speaking
          ctx.font = 'bold 78px "Courier New", monospace';
          ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 + offsetY);
          
          // Draw an additional glowing line beneath the text when speaking
          ctx.lineWidth = 3;
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 + Math.sin(time * 12) * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2 - 220, canvas.height / 2 + 50 + offsetY);
          ctx.lineTo(canvas.width / 2 + 220, canvas.height / 2 + 50 + offsetY);
          ctx.stroke();
          
          // Removed voice visualizer equalizer bars
          
          ctx.restore();
      } else {
          // Normal non-speaking display
          ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 + offsetY);
          ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
          ctx.shadowBlur = 32;
          ctx.globalAlpha = 0.85;
          ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 + offsetY);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          
          // Underline, box, cursor, etc. as before
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2 - 180, canvas.height / 2 + 50 + offsetY);
          ctx.lineTo(canvas.width / 2 + 180, canvas.height / 2 + 50 + offsetY);
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 + Math.sin(time * 2) * 0.2})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
      }
      
      // Box around text is shown in both states
      ctx.beginPath();
      ctx.rect(canvas.width / 2 - 200, canvas.height / 2 - 60, 400, 120);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 + Math.sin(time * 3) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Blinking cursor
      if (!window.jarvisSpeaking && Math.sin(time * 8) > 0) {
          ctx.fillRect(canvas.width / 2 + 190, canvas.height / 2, 10, 3);
      }
      
      ctx.restore();
  }

  // Add loading bar animation function
  function drawLoadingBar(time) {
      ctx.save();
      const rgb = hexToRgb(state.themeColor);
      
      // Draw semi-transparent dark backdrop
      const boxWidth = 440;
      const boxHeight = 140;
      const boxX = canvas.width / 2 - boxWidth / 2;
      const boxY = canvas.height / 2 - boxHeight / 2;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#000';
      ctx.filter = 'blur(2px)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      // Draw "INITIALIZING JARVIS" text
      ctx.font = 'bold 24px "Orbitron", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
      ctx.shadowBlur = 12;
      ctx.fillText("INITIALIZING J.A.R.V.I.S.", canvas.width / 2, canvas.height / 2 - 30);

      // Draw loading bar background
      const barWidth = 300;
      const barHeight = 4;
      const barX = canvas.width / 2 - barWidth / 2;
      const barY = canvas.height / 2 + 10;
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 2);
      ctx.fill();

      // Draw loading bar progress
      const progress = state.loadingProgress;
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * progress, barHeight, 2);
      ctx.fill();

      // Draw percentage text
      ctx.font = 'bold 16px "Orbitron", monospace';
      ctx.fillText(Math.floor(progress * 100) + "%", canvas.width / 2, barY + 20);

      // Draw scanning effect
      const scanWidth = 40;
      const scanX = barX + (barWidth * progress) - scanWidth/2;
      const gradient = ctx.createLinearGradient(scanX, 0, scanX + scanWidth, 0);
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(scanX, barY - 2, scanWidth, barHeight + 4);

      // Draw glowing dots at intervals
      const numDots = 10;
      for (let i = 0; i <= numDots; i++) {
          const dotX = barX + (barWidth * (i/numDots));
          if (dotX <= barX + (barWidth * progress)) {
              ctx.beginPath();
              ctx.arc(dotX, barY + barHeight/2, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 + 0.5 * Math.sin(time * 5 + i)})`;
              ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
              ctx.shadowBlur = 8;
              ctx.fill();
          }
      }

      // Draw status text
      const statusTexts = [
          "LOADING CORE SYSTEMS",
          "INITIALIZING NEURAL NETWORKS",
          "CALIBRATING RESPONSE ALGORITHMS",
          "SYNCHRONIZING DATABASES",
          "ESTABLISHING SECURE CONNECTIONS"
      ];
      const currentStatus = statusTexts[Math.min(
          Math.floor(progress * statusTexts.length),
          statusTexts.length - 1
      )];
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
      ctx.fillText(currentStatus, canvas.width / 2, barY + 45);

      ctx.restore();
  }
  
  // Event listeners
  settingsToggle.addEventListener('click', toggleSettings);
  closeSettings.addEventListener('click', toggleSettings);
  colorPicker.addEventListener('input', handleColorChange);
  shapeSelect.addEventListener('change', handleShapeChange);
  speedSlider.addEventListener('input', handleSpeedChange);
  canvas.addEventListener('click', handleInteraction);
  canvas.addEventListener('touchstart', handleInteraction);
  window.addEventListener('resize', resizeCanvas);
  
  // Initial setup
  resizeCanvas();
  loadSettings();
  updateGlowEffect();
  
  // Create audio visualizer bars with varying heights for more visual interest
  function createVisualizerUI() {
      const visualizerContainer = document.getElementById('top-visualizer-container');
      if (!visualizerContainer) return;
      
      // Clear any existing children
      visualizerContainer.innerHTML = '';
      
      // Create visualizer bars with varying base heights for more interesting idle state
      const barCount = 40; // Increased number of bars for more detail
      for (let i = 0; i < barCount; i++) {
          const bar = document.createElement('div');
          bar.className = 'visualizer-bar';
          
          // Create varied initial heights for more visual interest
          const baseScale = 0.1 + Math.random() * 0.1; // Random base height between 0.1-0.2
          bar.style.transform = `scaleY(${baseScale})`;
          
          // Vary animation speeds slightly for more organic movement
          const speed = 0.8 + Math.random() * 0.8; // 0.8-1.6s
          bar.style.animationDuration = `${speed}s`;
          
          visualizerContainer.appendChild(bar);
      }
      
      // Initial inactive state
      visualizerContainer.parentElement.classList.remove('speaking-active');
  }
  
  // Create the visualizer UI
  createVisualizerUI();
  
  requestAnimationFrame(animate);

  // ElevenLabs TTS integration


  // --- Futuristic Canvas Overlay Animation ---
  const overlay = document.getElementById('jarvis-launch-overlay');
  const launchBtn = document.getElementById('launch-jarvis-btn');
  const appMain = document.getElementById('app');

  // Launch logic
  if (launchBtn && overlay && appMain) {
      // Remove typing effect for the launch button text since we're using an icon now
      
      launchBtn.addEventListener('click', () => {
          // Play button click sound effect
          const buttonSfx = document.getElementById('button-sfx');
          if (buttonSfx) {
              buttonSfx.play();
          }
          
          // Delay the transition slightly to let the button sound play
          setTimeout(() => {
              // Play loading sound effect
              const loadingSfx = document.getElementById('loading-sfx');
              if (loadingSfx) {
                  loadingSfx.play();
              }
              
              // Add pulse animation to the power button when clicked
              launchBtn.classList.add('power-on');
              
              // Fade out overlay
              overlay.style.opacity = '0';
              
              // Record when the button was pressed
              window.animationStartTime = Date.now();
              window.loadingStartTime = Date.now();
              
              setTimeout(() => {
                  overlay.style.display = 'none';
                  // Fade/scale in main UI
                  appMain.style.opacity = '1';
                  appMain.style.scale = '1';
                  
                  // Start the reveal sequence with precise timing
                  startRevealSequence();
              }, 700);
          }, 200);
      });
  }

  // Example data for panels
  const hudPanels = [
      // Left side, below center
      { key: 'uptime', label: 'UPTIME', getValue: () => getUptime(), x: 60, y: 380, w: 300, h: 48 },
      { key: 'user', label: 'USER', getValue: () => 'OPERATOR', x: 60, y: 440, w: 300, h: 48 },
      { key: 'location', label: 'LOCATION', getValue: () => 'HQ-ALPHA', x: 60, y: 500, w: 300, h: 48 },
      // Bottom left, middle - moved higher up
      { key: 'battery', label: 'BATTERY', getValue: () => '98%', x: 60, y: canvas.height - 480, w: 220, h: 64, bar: true }, // Moved up
      { key: 'temp', label: 'TEMP', getValue: () => `${Math.floor(32 + Math.sin(time * 0.7) * 2)}°C`, x: 60, y: canvas.height - 405, w: 220, h: 48 }, // Moved up
      // Bottom right, middle
      { key: 'cpu', label: 'CPU', getValue: () => `${Math.floor(40 + Math.sin(time * 1.2) * 30)}%`, x: canvas.width - 280, y: canvas.height - 340, w: 220, h: 64, bar: true },
      { key: 'mem', label: 'MEMORY', getValue: () => `${Math.floor(60 + Math.cos(time * 1.1) * 20)}%`, x: canvas.width - 280, y: canvas.height - 265, w: 220, h: 64, bar: true },
      { key: 'net', label: 'NETWORK', getValue: () => `${Math.floor(80 + Math.sin(time * 0.9) * 10)}%`, x: canvas.width - 280, y: canvas.height - 190, w: 220, h: 64, bar: true },
  ];
  let systemStart = Date.now();
  function getUptime() {
      const s = Math.floor((Date.now() - systemStart) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // System log (scrolling/flickering) - enhanced to be more like a real console
  const logLines = [
      '>> SYSTEM BOOT SEQUENCE INITIATED',
      '>> LOADING MODULES...',
      '>> NETWORK INTERFACE ONLINE',
      '>> SECURITY PROTOCOLS ENGAGED',
      '>> ALL SYSTEMS NOMINAL',
      '>> JARVIS READY',
  ];
  
  // Store our console messages
  const consoleMessages = [];
  const MAX_CONSOLE_HISTORY = 100; // Maximum number of messages to keep
  
  // Override console methods to capture logs
  function setupConsoleCapture() {
      const originalConsole = {
          log: console.log,
          warn: console.warn,
          error: console.error,
          info: console.info
      };
      
      // Helper to format and store console messages
      function captureConsole(type, args) {
          const timestamp = new Date().toLocaleTimeString();
          let message = `[${timestamp}] `;
          
          // Add prefix based on type
          if (type === 'error') message += '[ERROR] ';
          else if (type === 'warn') message += '[WARN] ';
          else if (type === 'info') message += '[INFO] ';
          
          // Convert args to string
          try {
              message += Array.from(args).map(arg => {
                  if (typeof arg === 'object') {
                      try {
                          return JSON.stringify(arg);
                      } catch (e) {
                          return String(arg);
                      }
                  }
                  return String(arg);
              }).join(' ');
          } catch (e) {
              message += String(args);
          }
          
          // Trim message if too long
          if (message.length > 120) {
              message = message.substring(0, 117) + '...';
          }
          
          // Add to console history
          consoleMessages.push(message);
          
          // Limit history size
          if (consoleMessages.length > MAX_CONSOLE_HISTORY) {
              consoleMessages.shift();
          }
          
          // Call original console method
          return message;
      }
      
      // Override console methods
      console.log = function() {
          const message = captureConsole('log', arguments);
          originalConsole.log.apply(console, arguments);
          return message;
      };
      
      console.warn = function() {
          const message = captureConsole('warn', arguments);
          originalConsole.warn.apply(console, arguments);
          return message;
      };
      
      console.error = function() {
          const message = captureConsole('error', arguments);
          originalConsole.error.apply(console, arguments);
          return message;
      };
      
      console.info = function() {
          const message = captureConsole('info', arguments);
          originalConsole.info.apply(console, arguments);
          return message;
      };
      
      // Add initial message
      console.log('Console initialized');
  }
  
  // Call setup function to initialize console capture
  setupConsoleCapture();
  
  function drawSystemLog(time, reveal) {
      if (!reveal) return;
      
      const rgb = hexToRgb(state.themeColor);
      ctx.save();
      
      // Draw larger console window - same dimensions
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(canvas.width/2 - 380, canvas.height - 250, 760, 200, 16);
      ctx.fill();
      
      // Draw console header
      ctx.globalAlpha = 1;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      ctx.textAlign = "left";
      ctx.fillText("SYSTEM CONSOLE", canvas.width/2 - 370, canvas.height - 230);
      
      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(canvas.width/2 - 370, canvas.height - 220);
      ctx.lineTo(canvas.width/2 + 370, canvas.height - 220);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Combine initial logs and captured console messages
      let displayLines = [];
      
      // If system is just starting, show boot sequence messages
      const startTime = window.animationStartTime || Date.now();
      const bootSequenceTime = 12000; // 12 seconds for boot sequence
      if (Date.now() - startTime < bootSequenceTime) {
          // Calculate which boot messages to show based on elapsed time
          const progress = (Date.now() - startTime) / bootSequenceTime;
          const numBootMessages = Math.ceil(progress * logLines.length);
          
          // Add available boot messages
          for (let i = 0; i < numBootMessages && i < logLines.length; i++) {
              displayLines.push(logLines[i]);
          }
      } else {
          // System booted, show last boot message and console messages
          displayLines.push(logLines[logLines.length - 1]); // "JARVIS READY"
          
          // Add console messages
          const recentMessages = consoleMessages.slice(-12);
          displayLines = displayLines.concat(recentMessages);
      }
      
      // Limit to last 12 lines maximum
      if (displayLines.length > 12) {
          displayLines = displayLines.slice(-12);
      }
      
      // Calculate maximum text width that fits inside the console
      const maxTextWidth = 740; // 760px console width - 20px padding

      // Draw console lines with subtle animation
      ctx.font = '14px "Courier New", monospace'; // Slightly smaller font for more text
      let lineY = canvas.height - 210;
      for (let i = 0; i < displayLines.length; i++) {
          let text = displayLines[i];
          
          // Truncate text if it exceeds the maximum width
          if (ctx.measureText(text).width > maxTextWidth) {
              // Keep truncating until it fits
              while (ctx.measureText(text + "...").width > maxTextWidth && text.length > 0) {
                  text = text.slice(0, -1);
              }
              text += "...";
          }
          
          // Add blinking cursor to last line
          if (i === displayLines.length - 1 && Math.sin(time * 4) > 0) {
              text += '█';
          }
          
          // Line appearance animation
          const lineOpacity = 0.7 + 0.3 * Math.sin(time * 1.5 + i * 0.2);
          ctx.globalAlpha = lineOpacity;
          
          // Determine color based on message type
          if (text.includes('[ERROR]')) {
              ctx.fillStyle = '#ff5555';
          } else if (text.includes('[WARN]')) {
              ctx.fillStyle = '#ffaa00';
          } else if (text.includes('[INFO]')) {
              ctx.fillStyle = '#5555ff';
          } else {
              ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
          }
          
          ctx.fillText(text, canvas.width/2 - 370, lineY + i * 16);
      }
      
      // Draw console clip mask indication
      ctx.beginPath();
      ctx.rect(canvas.width/2 - 380, canvas.height - 220, 760, 170);
      ctx.clip();
      
      ctx.restore();
  }

  // Add drawSingleHUDPanel for animated entry
  function drawSingleHUDPanel(time, p, isNewlyRevealed) {
      ctx.save();
      const rgb = hexToRgb(state.themeColor);
      
      // Check if this panel has already been animated
      const panelKey = p.key;
      
      // If it's newly revealed, store the reveal timestamp and initialize typing
      if (isNewlyRevealed) {
          state.panelRevealTimes[panelKey] = performance.now();
          state.animatedPanels[panelKey] = true;
          state.panelTextChars[panelKey] = 0;
          state.panelTypingStarted[panelKey] = false;
      }
      
      // Determine if we're still in animation period
      let slide = 0;
      const revealTime = state.panelRevealTimes[panelKey];
      
      if (revealTime) {
          // Calculate elapsed time since panel reveal (in ms)
          const animDuration = 700; // Animation duration in ms
          const elapsed = performance.now() - revealTime;
          
          if (elapsed < animDuration) {
              // Still in animation period, calculate progress (1 → 0)
              slide = Math.max(0, 1 - elapsed / animDuration);
          } else if (!state.panelTypingStarted[panelKey]) {
              // Start typing after slide animation
              state.panelTypingStarted[panelKey] = true;
              startPanelTyping(panelKey);
          }
      }
      
      let x = p.x;
      if (x < canvas.width / 2) x -= 60 * slide; // Slide from left
      else x += 60 * slide; // Slide from right
      
      ctx.globalAlpha = 0.93 * (1 - slide);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(x, p.y, p.w, p.h, 14);
      ctx.fill();
      
      ctx.globalAlpha = 1 * (1 - slide);
      ctx.font = 'bold 18px "Orbitron", "Courier New", monospace';
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.98)`;
      ctx.textAlign = "left";
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
      ctx.shadowBlur = 8;
      
      // Get the full text
      const labelText = p.label + ": ";
      const valueText = p.getValue();
      const fullText = labelText + valueText;
      
      // Get the current typed text
      const typedChars = state.panelTextChars[panelKey] || 0;
      const displayText = fullText.slice(0, typedChars);
      
      // Draw the typed text - position higher for panels with bars
      const textY = p.bar ? p.y + 24 : p.y + 34;
      ctx.fillText(displayText, x + 18, textY);
      
      // Add blinking cursor if still typing
      if (typedChars < fullText.length && Math.sin(time * 8) > 0) {
          const cursorX = ctx.measureText(displayText).width + x + 18;
          const cursorY = p.bar ? p.y + 14 : p.y + 24;
          ctx.fillRect(cursorX, cursorY, 10, 2);
      }
      
      ctx.shadowBlur = 0;
      
      // Animated bar for CPU/mem/net/battery
      if (p.bar && typedChars >= fullText.length) {
          let val = parseInt(valueText);
          
          // Position the bar lower in the panel for more spacing
          const barY = p.y + p.h - 22; // Increased spacing from text
          const barHeight = 12; // Slightly taller bar
          
          ctx.save();
          // Background bar
          ctx.beginPath();
          ctx.roundRect(x + 18, barY, p.w - 36, barHeight, 6);
          ctx.fillStyle = 'rgba(0,220,255,0.18)';
          ctx.fill();
          
          // Progress bar
          ctx.beginPath();
          ctx.roundRect(x + 18, barY, (p.w - 36) * (val/100), barHeight, 6);
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
          ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
      }
      ctx.restore();
  }

  // Add function to handle panel typing animation
  function startPanelTyping(panelKey) {
      const panel = hudPanels.find(p => p.key === panelKey);
      if (!panel) return;
      
      const fullText = panel.label + ": " + panel.getValue();
      const typeNextChar = () => {
          if (state.panelTextChars[panelKey] < fullText.length) {
              // Play key sound for each character
              const keySound = document.getElementById('key-sfx');
              if (keySound) {
                  const keyClone = keySound.cloneNode();
                  keyClone.volume = 0.3;
                  keyClone.play();
                  keyClone.onended = () => keyClone.remove();
              }
              
              state.panelTextChars[panelKey]++;
              setTimeout(typeNextChar, 50); // Type each character with a 50ms delay
          }
      };
      typeNextChar();
  }
});