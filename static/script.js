// Front-end script for homepage, login and calendar pages
// Behavior summary:
// - On homepage, double-click #login-btn navigates to /login
// - On /login, submit sends credentials to /api/login and redirects to /calendar on success
// - On /calendar, load employees, show availability for chosen date/employee, and allow booking

function el(id){return document.getElementById(id)}

// Detect page by presence of key elements
if(el('login-btn') && window.location.pathname === '/'){
  // homepage behaviour: dblclick login to go to /login
  el('login-btn').addEventListener('dblclick', ()=>{ window.location.href = '/login'; });
}

if(window.location.pathname === '/login'){
  // back button
  const back = el('back-home'); if(back) back.addEventListener('click', ()=>{ window.location.href = '/'; });
  const submit = el('login-submit');
  if(submit){
    submit.addEventListener('click', async ()=>{
      const u = el('login-username').value.trim();
      const p = el('login-password').value;
      const err = el('login-error'); err.hidden = true;
      if(!u || !p){ err.textContent = 'Enter username and password'; err.hidden = false; return; }
      try{
        const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p}) });
        if(res.status !== 200){ const j = await res.json(); err.textContent = j.error || 'Login failed'; err.hidden = false; return; }
        const j = await res.json();
        // save user in sessionStorage (not secure, demo only)
        sessionStorage.setItem('user', JSON.stringify(j));
        window.location.href = '/calendar';
      }catch(e){ err.textContent = 'Network error'; err.hidden = false; }
    });
  }
}

if(window.location.pathname === '/calendar'){
  const back = el('back-home'); if(back) back.addEventListener('click', ()=>{ window.location.href = '/'; });
  const empSelect = el('employee-select');
  const dateInput = el('book-date');
  const avail = el('availability');
  const msg = el('book-msg');

  function showMsg(m){ msg.textContent = m; msg.hidden = false; setTimeout(()=>{ msg.hidden = true; }, 3500); }

  async function loadEmployees(){
    try{
      const res = await fetch('/api/employees');
      const list = await res.json();
      empSelect.innerHTML = '';
      list.forEach(e=>{ const o = document.createElement('option'); o.value = e.id; o.textContent = e.name; empSelect.appendChild(o); });
    }catch(e){ showMsg('Failed to load employees'); }
  }

  async function loadAvailability(){
    const emp = empSelect.value; const date = dateInput.value;
    if(!emp || !date) return;
    try{
      const res = await fetch(`/api/availability?employee_id=${encodeURIComponent(emp)}&date=${encodeURIComponent(date)}`);
      if(res.status !== 200){ showMsg('Failed to load availability'); return; }
      const j = await res.json();
      renderSlots(j.slots, emp, date);
    }catch(e){ showMsg('Network error'); }
  }

  function renderSlots(slots, emp, date){
    avail.innerHTML = '';
    slots.forEach(s=>{
      const b = document.createElement('button'); b.className = 'time-slot' + (s.available? '':' booked');
      b.textContent = s.time + (s.available? '':' (booked)');
      if(s.available){
        b.addEventListener('click', ()=>{ openBooking(emp, date, s.time); });
      }
      avail.appendChild(b);
    });
  }

  function openBooking(emp, date, time){
    const name = prompt(`Enter your name to book ${date} ${time}:`);
    if(!name) return; // cancelled
    bookSlot(emp,date,time,name);
  }

  async function bookSlot(emp,date,time,name){
    try{
      const res = await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employee_id: emp, date: date, time: time, client_name: name }) });
      const j = await res.json();
      if(!j.success){ showMsg(j.error || 'Booking failed'); return; }
      showMsg('Booking confirmed');
      loadAvailability();
    }catch(e){ showMsg('Network error'); }
  }

  empSelect.addEventListener('change', loadAvailability);
  dateInput.addEventListener('change', loadAvailability);

  // initialize
  (async ()=>{ await loadEmployees(); if(!dateInput.value){ dateInput.value = new Date().toISOString().slice(0,10); } await loadAvailability(); })();
}

