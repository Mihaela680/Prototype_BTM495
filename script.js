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
window.addEventListener('DOMContentLoaded',()=>{ draw(); initApp(); });
window.addEventListener('resize',()=>{ clearTimeout(resizeTimer); resizeTimer = setTimeout(draw,80); });

// ----------------- Application logic -----------------
// In-memory demo users and appointments
const demoUsers = {
  'client1': { password: 'pass', role: 'client', name: 'Client One', id: 'client1' },
  'emp1': { password: 'pass', role: 'employee', name: 'Employee One', id: 'emp1' },
  'emp2': { password: 'pass', role: 'employee', name: 'Employee Two', id: 'emp2' }
};

// appointments stored as objects: {id, date(YYYY-MM-DD), time(HH:MM), clientId, employeeId}
let appointments = [];
let currentUser = null;

function initApp(){
  // wire up login controls
  document.getElementById('login-btn').addEventListener('click',()=>{
    showLogin();
  });
  document.getElementById('login-cancel').addEventListener('click',()=>{
    hideLogin();
  });
  document.getElementById('login-submit').addEventListener('click',()=>{ attemptLogin(); });
  document.getElementById('logout-btn').addEventListener('click',()=>{ logout(); });

  // client controls
  const clientEmployee = document.getElementById('client-employee');
  populateEmployeeSelect();
  document.getElementById('client-date').addEventListener('change',renderTimeSlots);

  // week controls
  document.getElementById('week-prev').addEventListener('click',()=>changeWeek(-1));
  document.getElementById('week-next').addEventListener('click',()=>changeWeek(1));
  document.getElementById('week-date').addEventListener('change',()=>renderWeek());

  // show login by default
  showLogin();
}

function showLogin(){
  document.getElementById('login-modal').hidden = false;
  document.getElementById('login-username').focus();
}
function hideLogin(){
  document.getElementById('login-modal').hidden = true;
  clearLoginForm();
}
function clearLoginForm(){
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').hidden = true;
}

function attemptLogin(){
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  if(!u || !p){ errorEl.textContent = 'Enter username and password'; errorEl.hidden = false; return; }
  const user = demoUsers[u];
  if(!user || user.password !== p){ errorEl.textContent = 'Invalid credentials'; errorEl.hidden = false; return; }
  currentUser = { ...user };
  hideLogin();
  onLogin();
}

function logout(){
  currentUser = null;
  document.getElementById('user-greeting').hidden = true;
  document.getElementById('logout-btn').hidden = true;
  document.getElementById('login-btn').hidden = false;
  // hide app views
  document.getElementById('client-view').hidden = true;
  document.getElementById('employee-view').hidden = true;
  // show login again
  showLogin();
}

function onLogin(){
  document.getElementById('user-greeting').textContent = `Hello, ${currentUser.name}`;
  document.getElementById('user-greeting').hidden = false;
  document.getElementById('logout-btn').hidden = false;
  document.getElementById('login-btn').hidden = true;

  if(currentUser.role === 'client'){
    showClientView();
  } else if(currentUser.role === 'employee'){
    showEmployeeView();
  }
}

function populateEmployeeSelect(){
  const sel = document.getElementById('client-employee');
  sel.innerHTML = '';
  Object.values(demoUsers).filter(u=>u.role==='employee').forEach(emp=>{
    const opt = document.createElement('option'); opt.value = emp.id; opt.textContent = emp.name; sel.appendChild(opt);
  });
}

// ---------------- Client booking ----------------
function showClientView(){
  document.getElementById('client-view').hidden = false;
  document.getElementById('employee-view').hidden = true;
  // default date = today
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('client-date').value = today;
  renderTimeSlots();
}

function renderTimeSlots(){
  const date = document.getElementById('client-date').value;
  const employeeId = document.getElementById('client-employee').value;
  const container = document.getElementById('time-slots');
  container.innerHTML = '';
  if(!date || !employeeId) return;
  const slots = generateSlots();
  slots.forEach(time=>{
    const booked = appointments.some(a=>a.date===date && a.time===time && a.employeeId===employeeId);
    const btn = document.createElement('button');
    btn.className = 'time-slot' + (booked? ' booked':'');
    btn.textContent = time + (booked? ' (booked)':'');
    if(!booked){
      btn.addEventListener('click',()=>{ bookAppointment(date,time,employeeId); });
    }
    container.appendChild(btn);
  });
}

function generateSlots(){
  // simple slots from 09:00 to 16:00 every 30 minutes
  const arr = [];
  for(let h=9; h<17; h++){
    arr.push(pad(h)+':00');
    arr.push(pad(h)+':30');
  }
  return arr;
}
function pad(n){return n.toString().padStart(2,'0');}

function bookAppointment(date,time,employeeId){
  if(!currentUser || currentUser.role!=='client') return;
  // check double booking for client or employee
  if(appointments.some(a=>a.date===date && a.time===time && (a.employeeId===employeeId || a.clientId===currentUser.id))){
    showClientMessage('Cannot book: time slot already taken.');
    return;
  }
  const appt = { id: 'a'+(appointments.length+1), date, time, clientId: currentUser.id, employeeId };
  appointments.push(appt);
  showClientMessage(`Booked ${date} ${time} with ${getUserName(employeeId)}.`);
  renderTimeSlots();
}

function showClientMessage(msg){
  const el = document.getElementById('client-message'); el.textContent = msg; el.hidden = false;
  setTimeout(()=>{ el.hidden = true; }, 4000);
}

function getUserName(id){ return demoUsers[id] ? demoUsers[id].name : id; }

// ---------------- Employee week view ----------------
let currentWeekStart = startOfWeek(new Date());

function showEmployeeView(){
  document.getElementById('client-view').hidden = true;
  document.getElementById('employee-view').hidden = false;
  // set week date input to monday
  document.getElementById('week-date').value = formatDate(currentWeekStart);
  renderWeek();
}

function renderWeek(){
  const dateStr = document.getElementById('week-date').value;
  const base = dateStr ? new Date(dateStr) : currentWeekStart;
  currentWeekStart = startOfWeek(base);
  document.getElementById('week-date').value = formatDate(currentWeekStart);

  const grid = document.getElementById('week-grid'); grid.innerHTML = '';
  for(let i=0;i<7;i++){
    const d = new Date(currentWeekStart); d.setDate(d.getDate()+i);
    const ds = formatDate(d);
    const col = document.createElement('div'); col.className='day-column';
    const h = document.createElement('h4'); h.textContent = d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
    col.appendChild(h);
    // list appointments for this employee
    const myAppts = appointments.filter(a=>a.date===ds && a.employeeId===currentUser.id).sort((a,b)=>a.time.localeCompare(b.time));
    if(myAppts.length===0){ const p = document.createElement('div'); p.className='app-item'; p.textContent='(no appointments)'; col.appendChild(p); }
    myAppts.forEach(a=>{
      const item = document.createElement('div'); item.className='app-item'; item.textContent = `${a.time} — ${getUserName(a.clientId)}`;
      col.appendChild(item);
    });
    grid.appendChild(col);
  }
}

function changeWeek(delta){ const d = new Date(currentWeekStart); d.setDate(d.getDate() + delta*7); currentWeekStart = startOfWeek(d); document.getElementById('week-date').value = formatDate(currentWeekStart); renderWeek(); }

function startOfWeek(date){ const d = new Date(date); const day = d.getDay(); const diff = (day+6)%7; d.setDate(d.getDate()-diff); d.setHours(0,0,0,0); return d; }
function formatDate(date){ return date.toISOString().slice(0,10); }

// ---------------- Utility ----------------
// ensure employee select remains up to date if users change (static here)
// end of script
