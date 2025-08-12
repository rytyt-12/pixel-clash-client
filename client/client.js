// Pixel Clash.io - client (version améliorée: rooms + analytics placeholder)
// The client can join a room by adding ?room=ROOMNAME to the URL.
// Example: index.html?room=arena1

function qs(name, fallback) {
  const params = new URLSearchParams(location.search);
  return params.get(name) || fallback;
}

const ROOM = qs('room', 'global');
// Remplace SERVER_URL_BASE par l'URL de ton serveur Render
const SERVER_URL_BASE = "wss://pixel-clash-client.onrender.com";
const useCustomServer = SERVER_URL_BASE !== '';
const SERVER_URL = useCustomServer ? SERVER_URL_BASE : (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'ws://localhost:3000' : (location.protocol === 'https:' ? 'wss://' + location.host : 'ws://' + location.host) );
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W=canvas.width=innerWidth, H=canvas.height=innerHeight;
window.addEventListener('resize',()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight});
const keys={}; window.addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let mouse={x:0,y:0,down:false};
canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
canvas.addEventListener('mousedown',e=>mouse.down=true);canvas.addEventListener('mouseup',e=>mouse.down=false);

const wsUrl = (SERVER_URL).replace('ws://','ws://') + '?room=' + encodeURIComponent(ROOM);
const ws = new WebSocket(wsUrl);
let id=null; let state={players:{},bullets:[],powerups:[]}, me={x:0,y:0,r:12,color:'#0f0',score:0};
ws.onopen=()=>{console.log('ws open to', ROOM); __PC_ANALYTICS__('connect', ROOM);}
ws.onmessage=ev=>{const msg=JSON.parse(ev.data);
  if(msg.type==='init'){id=msg.id;me.color=msg.color; document.title = 'Pixel Clash - ' + ROOM;}
  else if(msg.type==='state'){state=msg.state; if(state.players[id]){me = state.players[id]; document.getElementById('score').innerText = 'Score: '+Math.floor(me.score||0);} document.getElementById('ranking').innerText = 'Top: '+(msg.top10||'-');}
  else if(msg.type==='showAd'){ showAd(); }
};

setInterval(()=>{
  if(ws.readyState===1){
    const input={
      up: keys['w']||keys['z']||keys['arrowup'],
      down: keys['s']||keys['arrowdown'],
      left: keys['a']||keys['q']||keys['arrowleft'],
      right: keys['d']||keys['arrowright'],
      mx: mouse.x, my: mouse.y, fire: mouse.down
    };
    ws.send(JSON.stringify({type:'input', input}));
  }
},1000/20);

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0,0,W,H);
  state.powerups.forEach(p=>{
    ctx.fillStyle = (p.kind==='heal' ? '#ff6' : '#6f6'); ctx.fillRect(p.x-8,p.y-8,16,16);
  });
  Object.values(state.players).forEach(p=>{
    ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font='12px Arial'; ctx.textAlign='center'; ctx.fillText(Math.floor(p.score||0), p.x, p.y- (p.r+10));
    // health bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x-20, p.y+p.r+6, 40, 6);
    ctx.fillStyle = '#f55'; ctx.fillRect(p.x-20, p.y+p.r+6, 40*(p.hp/100), 6);
  });
  state.bullets.forEach(b=>{ctx.fillStyle='#fff';ctx.fillRect(b.x-3,b.y-3,6,6)});
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

window.showAd = ()=>{alert('Ad placeholder - replace with AdInPlay/your provider integration');};
