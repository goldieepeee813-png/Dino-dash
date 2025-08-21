// Canvas setup
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');

function fit() {
  const w = Math.min(window.innerWidth*0.96, 980);
  const h = Math.min(window.innerHeight*0.70, 520);
  cvs.width  = Math.max(560, Math.floor(w));
  cvs.height = Math.max(300, Math.floor(h));
}
fit(); addEventListener('resize', fit);

// DOM
const startBtn = document.getElementById('startBtn');
const scoreEl  = document.getElementById('score');
const highEl   = document.getElementById('high');
const muteBtn  = document.getElementById('muteBtn');

// Sounds (bundled WAVs)
const music  = new Audio('assets/music.wav'); music.loop = true; music.volume = 0.35;
const sJump  = new Audio('assets/jump.wav');
const sCrash = new Audio('assets/crash.wav');
let muted = false;
function setMute(m){
  muted = m; [music,sJump,sCrash].forEach(a=>a.muted=muted);
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', muted?'true':'false');
}
muteBtn.addEventListener('click', ()=>setMute(!muted));

// Game state
let dino, groundY, obs, stars, gameSpeed, distance, score, highScore = +localStorage.getItem('dd_high')||0, running=false;

function reset(){
  groundY = cvs.height - Math.floor(cvs.height*0.18);
  dino = { x: Math.floor(cvs.width*0.06), y: groundY-42, w: 40, h: 40, vy: 0, onGround: true };
  obs = [];
  stars = Array.from({length:120}, ()=>({x:Math.random()*cvs.width, y:Math.random()*groundY*0.9, s: Math.random()*1.2+0.4}));
  gameSpeed = Math.max(4, Math.floor(cvs.width/240));
  distance = 0; score = 0; updateHUD();
}

function updateHUD(){
  scoreEl.textContent = 'Score: ' + score;
  highEl.textContent  = 'High: '  + highScore;
}

function spawnObstacle(){
  const size = 28 + Math.floor(Math.random()*22);
  obs.push({ x: cvs.width + 10, y: (groundY - size), w: size, h: size });
}

let spawnTimer = 0;
function tick(dt){
  // stars drift
  for(const st of stars){
    st.x -= st.s * 0.5;
    if(st.x < 0) { st.x = cvs.width; st.y = Math.random()*groundY*0.9; }
  }

  // gravity
  if(!dino.onGround){
    dino.vy += 0.9;
    dino.y  += dino.vy;
    if(dino.y >= groundY-42){ dino.y = groundY-42; dino.vy = 0; dino.onGround = true; }
  }
  // obstacles
  spawnTimer -= dt;
  if(spawnTimer <= 0){ spawnObstacle(); spawnTimer = 800 + Math.random()*900; }
  for(let i=obs.length-1;i>=0;i--){
    const o = obs[i];
    o.x -= gameSpeed;
    if(o.x + o.w < 0) obs.splice(i,1);
    // AABB collision
    if(dino.x < o.x+o.w && dino.x+dino.w > o.x && dino.y < o.y+o.h && dino.y+dino.h > o.y){
      try{ if(!muted){ sCrash.currentTime = 0; sCrash.play(); } }catch(e){}
      running = false;
      if(score > highScore){ highScore = score; localStorage.setItem('dd_high', highScore); }
      updateHUD();
      startBtn.textContent = '↻ Restart';
      return;
    }
  }

  // scoring
  distance += gameSpeed;
  if(distance >= 50){ score += 1; distance = 0; updateHUD(); }
  // speed up slowly
  gameSpeed += 0.0008 * dt;
}

function draw(){
  ctx.clearRect(0,0,cvs.width,cvs.height);
  // star sky
  ctx.fillStyle = '#000814';
  ctx.fillRect(0,0,cvs.width,cvs.height);
  ctx.fillStyle = '#ffffff';
  for(const st of stars){ ctx.fillRect(st.x, st.y, 1, 1); }

  // ground
  ctx.fillStyle = '#2ecc40';
  ctx.fillRect(0, groundY, cvs.width, cvs.height-groundY);
  ctx.fillStyle = '#114d11';
  ctx.fillRect(0, groundY-4, cvs.width, 4);

  // dino (gold block with eye)
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
  ctx.fillStyle = '#000';
  ctx.fillRect(dino.x + dino.w-10, dino.y+8, 6, 6);

  // obstacles (brown blocks)
  ctx.fillStyle = '#8b4513';
  for(const o of obs){ ctx.fillRect(o.x, o.y, o.w, o.h); }
}

let last = 0;
function loop(ts){
  if(!running) return;
  const dt = Math.min(50, ts - last || 16);
  last = ts;
  tick(dt);
  draw();
  requestAnimationFrame(loop);
}

function jump(){
  if(!running) return;
  if(dino.onGround){
    dino.onGround = false;
    dino.vy = -16;
    try{ if(!muted){ sJump.currentTime = 0; sJump.play(); } }catch(e){}
  }
}

// controls
addEventListener('keydown', e => { if(e.code === 'Space'){ e.preventDefault(); jump(); } });
cvs.addEventListener('pointerdown', () => jump());

// start/restart
startBtn.addEventListener('click', async () => {
  reset(); running = true;
  try{ music.currentTime = 0; await music.play(); }catch(e){}
  startBtn.textContent = 'Playing…';
  requestAnimationFrame(loop);
});

// initial paint
reset(); draw();
