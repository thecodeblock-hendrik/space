/** Space Invaders - vanilla canvas game. */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const ui = {
  score: document.getElementById("score"),
  level: document.getElementById("level"),
  lives: document.getElementById("lives"),
  overlay: document.getElementById("overlay"),
  title: document.getElementById("title"),
  message: document.getElementById("message"),
};

const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_W = 36;
const ALIEN_H = 24;
const ALIEN_GAP = 10;
const PIXEL = 3;

const SPRITES = {
  squid: ["00011000", "00111100", "01111110", "11011011", "11111111", "00100100", "01011010", "10100101"],
  crab: ["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"],
  octo: ["000011110000", "011111111110", "111111111111", "111001100111", "111111111111", "000110011000", "001101101100", "110000000011"],
};

const ROW_TYPES = [
  { sprite: "squid", color: "#ff5dd6", points: 30 },
  { sprite: "crab", color: "#5dd6ff", points: 20 },
  { sprite: "crab", color: "#5dd6ff", points: 20 },
  { sprite: "octo", color: "#ffd65d", points: 10 },
  { sprite: "octo", color: "#ffd65d", points: 10 },
];

const keys = new Set();
let state;

/** Create a fresh game state. */
function newGame() {
  state = { score: 0, level: 1, lives: 3, mode: "ready" };
  startLevel();
}

/** Reset the board for the current level. */
function startLevel() {
  state.player = { x: W / 2 - 20, y: H - 50, w: 40, h: 16, cooldown: 0 };
  state.bullets = [];
  state.bombs = [];
  state.aliens = createAliens();
  state.shields = createShields();
  state.alienDir = 1;
  state.alienSpeed = 20 + state.level * 8;
  state.bombChance = 0.6 + state.level * 0.25;
  updateHud();
}

/** Build the grid of aliens. */
function createAliens() {
  const aliens = [];
  const startX = (W - ALIEN_COLS * (ALIEN_W + ALIEN_GAP)) / 2;
  const startY = 60 + Math.min(state.level - 1, 5) * 12;
  for (let r = 0; r < ALIEN_ROWS; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      aliens.push({
        x: startX + c * (ALIEN_W + ALIEN_GAP),
        y: startY + r * (ALIEN_H + ALIEN_GAP),
        w: ALIEN_W,
        h: ALIEN_H,
        ...ROW_TYPES[r],
      });
    }
  }
  return aliens;
}

/** Build four shields made of small destructible blocks. */
function createShields() {
  const blocks = [];
  const size = 6;
  for (let s = 0; s < 4; s++) {
    const baseX = (W - 3 * 135 - 10 * size) / 2 + s * 135;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) {
        const archCut = r > 3 && c > 2 && c < 7;
        if (!archCut) {
          blocks.push({ x: baseX + c * size, y: H - 130 + r * size, w: size, h: size });
        }
      }
    }
  }
  return blocks;
}

/** Axis-aligned rectangle overlap test. */
function hits(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updateHud() {
  ui.score.textContent = state.score;
  ui.level.textContent = state.level;
  ui.lives.textContent = state.lives;
}

function showOverlay(title, message) {
  ui.title.textContent = title;
  ui.message.textContent = message;
  ui.overlay.classList.remove("hidden");
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

/** Move the player and fire bullets. */
function updatePlayer(dt) {
  const p = state.player;
  const speed = 300;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) p.x -= speed * dt;
  if (keys.has("ArrowRight") || keys.has("KeyD")) p.x += speed * dt;
  p.x = Math.max(0, Math.min(W - p.w, p.x));

  p.cooldown -= dt;
  if (keys.has("Space") && p.cooldown <= 0 && state.bullets.length < 2) {
    state.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 10, w: 4, h: 10 });
    p.cooldown = 0.35;
  }
}

/** March the alien grid and drop bombs. */
function updateAliens(dt) {
  const speedUp = 1 + (1 - state.aliens.length / (ALIEN_ROWS * ALIEN_COLS)) * 3;
  const dx = state.alienDir * state.alienSpeed * speedUp * dt;
  state.aliens.forEach((a) => (a.x += dx));

  const atEdge = state.aliens.some((a) => a.x < 5 || a.x + a.w > W - 5);
  if (atEdge) {
    state.alienDir *= -1;
    state.aliens.forEach((a) => {
      a.x -= dx;
      a.y += 16;
    });
  }

  if (Math.random() < state.bombChance * dt) dropBomb();
}

/** Drop a bomb from a random bottom-most alien. */
function dropBomb() {
  const bottoms = new Map();
  state.aliens.forEach((a) => {
    const col = Math.round(a.x);
    const current = bottoms.get(col);
    if (!current || a.y > current.y) bottoms.set(col, a);
  });
  const shooters = [...bottoms.values()];
  const a = shooters[Math.floor(Math.random() * shooters.length)];
  state.bombs.push({ x: a.x + a.w / 2 - 2, y: a.y + a.h, w: 4, h: 12 });
}

/** Move projectiles and resolve collisions. */
function updateProjectiles(dt) {
  state.bullets.forEach((b) => (b.y -= 480 * dt));
  state.bombs.forEach((b) => (b.y += (180 + state.level * 15) * dt));

  for (const b of state.bullets) {
    const alien = state.aliens.find((a) => hits(b, a));
    if (alien) {
      b.dead = true;
      alien.dead = true;
      state.score += alien.points;
      updateHud();
    }
  }

  [...state.bullets, ...state.bombs].forEach((p) => {
    const block = state.shields.find((s) => !s.dead && hits(p, s));
    if (block) {
      block.dead = true;
      p.dead = true;
    }
  });

  if (state.bombs.some((b) => !b.dead && hits(b, state.player))) loseLife();

  state.bullets = state.bullets.filter((b) => !b.dead && b.y > -20);
  state.bombs = state.bombs.filter((b) => !b.dead && b.y < H);
  state.aliens = state.aliens.filter((a) => !a.dead);
  state.shields = state.shields.filter((s) => !s.dead);
}

/** Aliens erode shields they touch. */
function updateShieldContact() {
  state.shields.forEach((s) => {
    if (state.aliens.some((a) => hits(a, s))) s.dead = true;
  });
}

function loseLife() {
  state.lives -= 1;
  state.bombs = [];
  updateHud();
  if (state.lives <= 0) gameOver();
}

function gameOver() {
  state.mode = "over";
  showOverlay("GAME OVER", `Score ${state.score} - press Enter to play again`);
}

/** Check win/lose conditions for the level. */
function checkLevelEnd() {
  if (state.aliens.length === 0) {
    state.level += 1;
    startLevel();
    return;
  }
  const landed = state.aliens.some((a) => a.y + a.h >= state.player.y);
  if (landed) {
    state.lives = 0;
    updateHud();
    gameOver();
  }
}

function update(dt) {
  updatePlayer(dt);
  updateAliens(dt);
  updateShieldContact();
  updateProjectiles(dt);
  if (state.mode === "playing") checkLevelEnd();
}

/** Draw a bitmap sprite scaled to fit a rectangle. */
function drawSprite(rows, x, y, color) {
  const offsetX = x + (ALIEN_W - rows[0].length * PIXEL) / 2;
  ctx.fillStyle = color;
  rows.forEach((row, ry) => {
    [...row].forEach((bit, rx) => {
      if (bit === "1") ctx.fillRect(offsetX + rx * PIXEL, y + ry * PIXEL, PIXEL, PIXEL);
    });
  });
}

function drawPlayer() {
  const p = state.player;
  ctx.fillStyle = "#5dff7a";
  ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
  ctx.fillRect(p.x + p.w / 2 - 4, p.y, 8, 8);
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  state.aliens.forEach((a) => drawSprite(SPRITES[a.sprite], a.x, a.y, a.color));

  ctx.fillStyle = "#3fbf5a";
  state.shields.forEach((s) => ctx.fillRect(s.x, s.y, s.w, s.h));

  drawPlayer();

  ctx.fillStyle = "#fff";
  state.bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));
  ctx.fillStyle = "#ff6b5d";
  state.bombs.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

  ctx.fillStyle = "#3fbf5a";
  ctx.fillRect(0, H - 20, W, 2);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state.mode === "playing") update(dt);
  draw();
  requestAnimationFrame(loop);
}

function handleKeyDown(e) {
  if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  keys.add(e.code);

  if (e.code === "Enter" && state.mode !== "playing") {
    if (state.mode === "over") newGame();
    state.mode = "playing";
    hideOverlay();
  }
  if (e.code === "KeyP" && state.mode === "playing") {
    state.mode = "paused";
    showOverlay("PAUSED", "Press Enter to resume");
  }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", (e) => keys.delete(e.code));

newGame();
requestAnimationFrame(loop);
