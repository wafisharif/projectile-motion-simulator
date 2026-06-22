// ============================================================
// PROJECTILE MOTION SIMULATOR — physics is computed entirely
// in real SI units (meters, seconds, m/s). Pixels only appear
// at the final drawing step, controlled by `pixelsPerMeter`.
// ============================================================

const g = 9.8; // m/s^2

let pixelsPerMeter = 15;
let groundYPixels; // pixel row representing y = 0 m
let launchXPixels = 50; // pixel column representing x = 0 m

// Simulation state: "idle" | "running" | "paused" | "landed"
let simState = "idle";

let realTime = false;
let zoomFactor = 1.0;

// --- Projectile data (each is an object so 1 & 2 share one code path) ---
let proj1, proj2;

// --- UI elements ---
let velocitySlider, angleSlider, velocity2Slider, angle2Slider, scaleSlider;
let resetButton, toggleRealTimeButton, zoomInButton, zoomOutButton, resetZoomButton;
let stateLabel, zoomDisplay;

function makeProjectile(v0, angleDeg, colorMain, colorTrail) {
  const rad = radians(angleDeg);
  return {
    v0, angleDeg,
    vx: v0 * cos(rad),
    vy: -v0 * sin(rad), // negative = upward in math convention; flipped to screen Y when drawing
    x: 0, y: 0,         // current position in METERS (y measured upward from ground)
    t: 0,
    trail: [],
    landed: false,
    stats: calculateStats(v0, angleDeg),
    colorMain, colorTrail
  };
}

// Pure physics — analytic formulas for total flight (assumes launch & landing at y=0)
function calculateStats(v0, angleDeg) {
  const rad = radians(angleDeg);
  const time = (2 * v0 * sin(rad)) / g;
  const range = (v0 * v0 * sin(2 * rad)) / g;
  const maxHeight = (v0 * v0 * sin(rad) * sin(rad)) / (2 * g);
  return { time, range, maxHeight };
}

function setup() {
  createCanvas(800, 600);
  textSize(16);
  textAlign(LEFT, TOP);
  groundYPixels = height - 50;

  velocitySlider = document.getElementById('velocitySlider');
  angleSlider = document.getElementById('angleSlider');
  velocity2Slider = document.getElementById('velocity2Slider');
  angle2Slider = document.getElementById('angle2Slider');
  scaleSlider = document.getElementById('scaleSlider');

  resetButton = document.getElementById('resetButton');
  zoomInButton = document.getElementById('zoomInButton');
  zoomOutButton = document.getElementById('zoomOutButton');
  resetZoomButton = document.getElementById('resetZoomButton');
  toggleRealTimeButton = document.getElementById('toggleRealTimeButton');

  stateLabel = document.getElementById('stateLabel');
  zoomDisplay = document.getElementById('zoomDisplay');

  toggleRealTimeButton.textContent = "Real Time: ON";
  realTime = true;

  velocitySlider.addEventListener('input', () => {
    document.getElementById('velocityValue').textContent = velocitySlider.value;
    if (simState === "idle") resetSimulation();
  });
  angleSlider.addEventListener('input', () => {
    document.getElementById('angleValue').textContent = angleSlider.value;
    if (simState === "idle") resetSimulation();
  });
  velocity2Slider.addEventListener('input', () => {
    document.getElementById('velocity2Value').textContent = velocity2Slider.value;
    if (simState === "idle") resetSimulation();
  });
  angle2Slider.addEventListener('input', () => {
    document.getElementById('angle2Value').textContent = angle2Slider.value;
    if (simState === "idle") resetSimulation();
  });
  scaleSlider.addEventListener('input', () => {
    pixelsPerMeter = parseFloat(scaleSlider.value);
    document.getElementById('scaleValue').textContent = scaleSlider.value;
  });

  resetButton.addEventListener('click', () => {
    resetSimulation();
    resetButton.blur();
  });
  zoomInButton.addEventListener('click', () => {
    zoomFactor *= 1.1;
    updateZoomDisplay();
    zoomInButton.blur();
  });
  zoomOutButton.addEventListener('click', () => {
    zoomFactor /= 1.1;
    updateZoomDisplay();
    zoomOutButton.blur();
  });
  resetZoomButton.addEventListener('click', () => {
    zoomFactor = 1.0;
    updateZoomDisplay();
    resetZoomButton.blur();
  });
  toggleRealTimeButton.addEventListener('click', () => {
    realTime = !realTime;
    toggleRealTimeButton.textContent = `Real Time: ${realTime ? "ON" : "OFF"}`;
    toggleRealTimeButton.blur();
  });

  // Prevent the page from scrolling when SPACE is pressed, and avoid
  // accidentally re-triggering a focused button with SPACE.
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      document.activeElement.blur();
    }
  });

  updateZoomDisplay();
  resetSimulation();
}

function updateZoomDisplay() {
  zoomDisplay.textContent = `Camera Zoom: ${zoomFactor.toFixed(2)}×`;
}

function resetSimulation() {
  const v0_1 = parseFloat(velocitySlider.value);
  const angle1 = parseFloat(angleSlider.value);
  const v0_2 = parseFloat(velocity2Slider.value);
  const angle2 = parseFloat(angle2Slider.value);

  proj1 = makeProjectile(v0_1, angle1, color(255, 80, 80), color(0, 120, 255));
  proj2 = makeProjectile(v0_2, angle2, color(80, 255, 140), color(0, 255, 180));

  simState = "idle";
  stateLabel.textContent = "Press SPACE to launch";
}

// Converts a position in meters (x right, y up, origin at launch point)
// into pixel coordinates for drawing.
function toPixels(xMeters, yMeters) {
  return {
    px: launchXPixels + xMeters * pixelsPerMeter,
    py: groundYPixels - yMeters * pixelsPerMeter
  };
}

function stepProjectile(p, dt) {
  if (p.landed) return;

  p.t += dt;
  p.x = p.v0 * cos(radians(p.angleDeg)) * p.t;
  p.y = p.v0 * sin(radians(p.angleDeg)) * p.t - 0.5 * g * p.t * p.t;

  if (p.y <= 0 && p.t > 0) {
    p.y = 0;
    p.landed = true;
  }

  const pos = toPixels(p.x, p.y);
  p.trail.push(pos);
}

function draw() {
  background(18);
  stroke(100);
  line(0, groundYPixels, width, groundYPixels);

  // --- advance physics, only while running ---
  if (simState === "running") {
    const dt = realTime ? (deltaTime / 1000) : (2 * deltaTime / 1000);
    stepProjectile(proj1, dt);
    stepProjectile(proj2, dt);

    if (proj1.landed && proj2.landed) {
      simState = "landed";
      stateLabel.textContent = "Landed — press SPACE to reset";
    }
  }

  // --- draw world (affected by camera zoom) ---
  push();
  translate(width / 2 * (1 - zoomFactor), height / 2 * (1 - zoomFactor));
  scale(zoomFactor);

  drawTrail(proj1.trail, proj1.colorTrail);
  drawTrail(proj2.trail, proj2.colorTrail);

  drawProjectile(proj1);
  drawProjectile(proj2);

  pop();

  drawHUD();
}

function drawTrail(trail, col) {
  noFill();
  stroke(col);
  beginShape();
  for (const pos of trail) vertex(pos.px, pos.py);
  endShape();
}

function drawProjectile(p) {
  const pos = toPixels(p.x, p.y);

  noStroke();
  fill(p.colorMain);
  ellipse(pos.px, pos.py, 16 / zoomFactor);

  // Only draw motion vectors once the projectile has actually started moving.
  if (simState === "idle") return;

  const vyCurrent = p.v0 * sin(radians(p.angleDeg)) - g * p.t;
  const velVec = createVector(p.vx, -vyCurrent); // screen-space: y flips
  const accVec = createVector(0, g);

  drawVectorArrow(pos, velVec, 6, p.colorMain, "Velocity");
  drawVectorArrow(pos, accVec, 10, color(255, 165, 0), "Acceleration");
}

// length/scale tuned so vectors stay readable in pixel-space regardless
// of the meter scale chosen by the user
function drawVectorArrow(originPx, vec, lengthScale, col, label) {
  const v = vec.copy();
  if (v.mag() === 0) return;
  v.setMag(v.mag() * lengthScale * 0.4 / zoomFactor + 12 / zoomFactor);

  push();
  stroke(col);
  fill(col);
  translate(originPx.px, originPx.py);
  line(0, 0, v.x, v.y);

  const arrowSize = 8 / zoomFactor;
  rotate(v.heading());
  translate(v.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();

  push();
  noStroke();
  fill(col);
  textSize(11 / zoomFactor);
  textAlign(LEFT, CENTER);
  const tip = p5.Vector.add(createVector(originPx.px, originPx.py), v);
  text(label, tip.x + 6 / zoomFactor, tip.y);
  pop();
}

function drawHUD() {
  fill(200);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);

  text(`Scale: 1 m = ${pixelsPerMeter} px`, 10, 10);
  text(`Time: ${Math.max(proj1.t, proj2.t).toFixed(2)} s`, 10, 30);

  text(`Projectile 1 — height: ${proj1.y.toFixed(2)} m, distance: ${proj1.x.toFixed(2)} m`, 10, 55);
  text(`Projectile 2 — height: ${proj2.y.toFixed(2)} m, distance: ${proj2.x.toFixed(2)} m`, 10, 75);

  let statY = 105;

  text(`--- Projectile 1: predicted full flight ---`, 10, statY);
  text(`Time of flight: ${proj1.stats.time.toFixed(2)} s   Range: ${proj1.stats.range.toFixed(2)} m   Max height: ${proj1.stats.maxHeight.toFixed(2)} m`, 10, statY + 20);

  statY += 50;
  text(`--- Projectile 2: predicted full flight ---`, 10, statY);
  text(`Time of flight: ${proj2.stats.time.toFixed(2)} s   Range: ${proj2.stats.range.toFixed(2)} m   Max height: ${proj2.stats.maxHeight.toFixed(2)} m`, 10, statY + 20);
}

function keyPressed() {
  if (key !== ' ') return;

  if (simState === "idle") {
    simState = "running";
    stateLabel.textContent = "Running — press SPACE to pause";
  } else if (simState === "running") {
    simState = "paused";
    stateLabel.textContent = "Paused — press SPACE to resume";
  } else if (simState === "paused") {
    simState = "running";
    stateLabel.textContent = "Running — press SPACE to pause";
  } else if (simState === "landed") {
    resetSimulation();
  }
}
