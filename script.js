// Simple script: draw SVG lines between box centers based on a static connections list
const connections = [
  ['user','address'],
  ['client','user'],
  ['employee','user'],
  ['manager','employee'],
  ['client','appointment'],
  ['employee','appointment'],
  ['appointment','schedule'],
  ['schedule','employee'],
  ['system','appointment'],
  ['system','notification'],
  ['notification','user'],
  ['address','client']
];

function getCenter(el){
  const r = el.getBoundingClientRect();
  // convert to canvas-local coordinates
  const canvas = document.getElementById('canvas');
  const canvasR = canvas.getBoundingClientRect();
  const x = r.left + r.width/2 - canvasR.left;
  const y = r.top + r.height/2 - canvasR.top;
  return {x,y};
}

function draw(){
  const svg = document.getElementById('svg-overlay');
  // reset size
  const canvas = document.getElementById('canvas');
  svg.setAttribute('width', canvas.clientWidth);
  svg.setAttribute('height', canvas.clientHeight);
  // clear existing
  while(svg.firstChild) svg.removeChild(svg.firstChild);

  connections.forEach(pair=>{
    const [fromId,toId] = pair;
    const from = document.getElementById(fromId);
    const to = document.getElementById(toId);
    if(!from || !to) return;
    const a = getCenter(from);
    const b = getCenter(to);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',a.x);
    line.setAttribute('y1',a.y);
    line.setAttribute('x2',b.x);
    line.setAttribute('y2',b.y);
    line.setAttribute('stroke','#2b6cb0');
    line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);
  });
}

let resizeTimer = null;
window.addEventListener('DOMContentLoaded',()=>{ draw(); });
window.addEventListener('resize',()=>{ clearTimeout(resizeTimer); resizeTimer = setTimeout(draw,80); });

