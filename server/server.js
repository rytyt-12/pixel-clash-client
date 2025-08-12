// Pixel Clash.io server (rooms + simple matchmaking + persistent highscores + admin)
// Uses Express for simple HTTP endpoints (scores) + WebSocket for real-time gameplay.

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const ARENA_DEFAULT = { w: 1600, h: 900 };

let rooms = {}; // roomName -> {players, bullets, powerups, arena}
const SCORES_FILE = path.join(__dirname, 'scores.json');
let highscores = [];

// load highscores
try { if(fs.existsSync(SCORES_FILE)){ highscores = JSON.parse(fs.readFileSync(SCORES_FILE)); } } catch(e){ console.warn('scores load err', e); highscores = []; }

function saveScores(){ try{ fs.writeFileSync(SCORES_FILE, JSON.stringify(highscores,null,2)); }catch(e){console.warn('save scores err', e);} }

function getRoom(name){
  if(!rooms[name]) {
    rooms[name] = { players:{}, bullets:[], powerups:[], arena: {...ARENA_DEFAULT} , lastPowerup: Date.now() };
    console.log('Created room', name);
  }
  return rooms[name];
}

function rand(min,max){return Math.random()*(max-min)+min}

wss.on('connection', (ws, req)=>{
  // parse room from query
  const url = req.url || '/';
  const qpos = url.indexOf('?');
  const params = new URLSearchParams(qpos>-1 ? url.slice(qpos) : '');
  const roomName = params.get('room') || 'global';
  const room = getRoom(roomName);

  const id = uuidv4();
  const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
  const player = {id, x: rand(50,room.arena.w-50), y: rand(50,room.arena.h-50), r: 14, color, score:0, hp:100, vx:0, vy:0};
  room.players[id] = player;
  ws.send(JSON.stringify({type:'init', id, color, room: roomName}));

  console.log('connect', {id, room: roomName, ip: req.socket.remoteAddress});

  ws.on('message', raw=>{
    try{
      const msg = JSON.parse(raw);
      if(msg.type==='input'){
        const p = room.players[id]; if(!p) return;
        const speed = 2 + Math.min(2, Math.sqrt(p.score)/5);
        let dx=0,dy=0; if(msg.input.left) dx=-1;if(msg.input.right) dx=1;if(msg.input.up) dy=-1;if(msg.input.down) dy=1;
        const mag = Math.hypot(dx,dy) || 1; p.x = Math.max(10, Math.min(room.arena.w-10, p.x + dx/mag*speed)); p.y = Math.max(10, Math.min(room.arena.h-10, p.y + dy/mag*speed));
        if(msg.input.fire){
          if(!p.lastShot || Date.now()-p.lastShot>300){
            p.lastShot = Date.now();
            const angle = Math.atan2(msg.input.my - p.y, msg.input.mx - p.x);
            room.bullets.push({id:uuidv4(), x:p.x+Math.cos(angle)*(p.r+6), y:p.y+Math.sin(angle)*(p.r+6), vx:Math.cos(angle)*6, vy:Math.sin(angle)*6, owner:id});
          }
        }
      }
    }catch(e){ console.warn('msg parse err', e); }
  });

  ws.on('close', ()=>{
    // record final score into highscores when player disconnects
    const p = room.players[id];
    if(p && p.score>5){
      highscores.push({id: p.id, score: Math.floor(p.score), color: p.color, time: Date.now()});
      highscores = highscores.sort((a,b)=>b.score-a.score).slice(0,200); // keep top 200
      saveScores();
    }
    delete room.players[id];
    console.log('disconnect', id, 'from', roomName);
  });

  ws.send(JSON.stringify({type:'state', state: {players: room.players, bullets: room.bullets, powerups: room.powerups, arena: room.arena}}));
});

// Powerup spawning & game loop per room
setInterval(()=>{
  Object.keys(rooms).forEach(name=>{
    const room = rooms[name];
    if(Date.now() - room.lastPowerup > 5000 && room.powerups.length < 6){
      room.powerups.push({id:uuidv4(), x: rand(50,room.arena.w-50), y: rand(50,room.arena.h-50), kind: Math.random()<0.5?'heal':'boost'});
      room.lastPowerup = Date.now();
    }

    // update bullets
    room.bullets.forEach(b=>{ b.x += b.vx; b.y += b.vy; });
    room.bullets = room.bullets.filter(b=> b.x>0 && b.x<room.arena.w && b.y>0 && b.y<room.arena.h);

    // bullet collisions
    room.bullets.forEach((b,i)=>{
      Object.values(room.players).forEach(p=>{
        if(p.id !== b.owner){
          const dx=p.x-b.x, dy=p.y-b.y; if(dx*dx+dy*dy < (p.r+4)*(p.r+4)){
            p.hp -= 30; const owner = room.players[b.owner]; if(owner) owner.score += 5; room.bullets.splice(i,1);
          }
        }
      });
    });

    // player death / respawn
    Object.values(room.players).forEach(p=>{
      if(p.hp <= 0){
        room.powerups.push({id:uuidv4(), x:p.x, y:p.y, kind:'heal'});
        p.hp = 100; p.score = Math.max(0, p.score - 10); p.x = rand(50,room.arena.w-50); p.y = rand(50,room.arena.h-50);
      }
    });

    // pickup powerups
    room.powerups = room.powerups.filter(u=>{
      let taken=false;
      Object.values(room.players).forEach(p=>{ const dx=p.x-u.x, dy=p.y-u.y; if(dx*dx+dy*dy < (p.r+10)*(p.r+10)){ taken=true; if(u.kind==='heal') p.hp = Math.min(100,p.hp+40); else p.score += 15; } });
      return !taken;
    });

    // passive score
    Object.values(room.players).forEach(p=> p.score += 0.02);

    // prepare state and broadcast
    const state = {players: room.players, bullets: room.bullets, powerups: room.powerups, arena: room.arena};
    const top10 = Object.values(room.players).sort((a,b)=>b.score-a.score).slice(0,10).map(p=>({color:p.color,score:Math.floor(p.score)}));
    const payload = JSON.stringify({type:'state', state, top10});
    wss.clients.forEach(c=>{ if(c.readyState===WebSocket.OPEN) c.send(payload); });
  });
},1000/20);

// HTTP endpoints for highscores + admin
app.get('/highscores', (req, res) => {
  res.json(highscores.slice(0,50));
});

// Admin endpoint to view server info (protected by ADMIN_TOKEN env var)
app.get('/admin/info', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if(token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN){
    const roomsInfo = Object.keys(rooms).map(name=>({name, players: Object.keys(rooms[name].players).length}));
    return res.json({rooms: roomsInfo, highscoresCount: highscores.length});
  }
  res.status(403).json({error:'forbidden'});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('Server running on port', PORT));
