// Front-end script for homepage, login and calendar pages
// Behavior summary:
// - On homepage, click or double-click #login-btn or service boxes to navigate to /login
// - On /login, submit sends credentials to /api/login and redirects to /calendar on success
// - On /calendar, load employees, show availability for chosen date/employee, and allow booking
// - If logged-in user is an employee, show weekly view of their assigned bookings instead of booking UI

function el(id){return document.getElementById(id)}

// Helper to read current user from sessionStorage
function currentUser(){ try{ return JSON.parse(sessionStorage.getItem('user')||'null'); }catch(e){ return null; } }

// ============= HOMEPAGE BEHAVIOUR =============
if(el('login-btn') && window.location.pathname === '/'){
  // login button: click to go to /login
  el('login-btn').addEventListener('click', ()=>{ window.location.href = '/login'; });
}

// ============= LOGIN PAGE =============
if(window.location.pathname === '/login'){
  let selectedUserType = null;

  // back button(s)
  const back = el('back-home'); if(back) back.addEventListener('click', ()=>{ window.location.href = '/'; });
  const back2 = el('back-home-2'); if(back2) back2.addEventListener('click', ()=>{ window.location.href = '/'; });

  // User type selection buttons
  const customerBtn = el('customer-btn');
  const employeeBtn = el('employee-btn');
  const userTypeView = el('user-type-view');
  const loginFormView = el('login-form-view');
  const backToTypeBtn = el('back-to-type');
  const signupPrompt = el('signup-prompt');
  const signupLink = el('signup-link');

  if(customerBtn){
    customerBtn.addEventListener('click', ()=>{
      selectedUserType = 'customer';
      userTypeView.hidden = true;
      loginFormView.hidden = false;
      signupPrompt.hidden = false;
      el('demo-hint').hidden = false;
    });
  }

  if(employeeBtn){
    employeeBtn.addEventListener('click', ()=>{
      selectedUserType = 'employee';
      userTypeView.hidden = true;
      loginFormView.hidden = false;
      signupPrompt.hidden = true;
      el('demo-hint').hidden = false;
    });
  }

  if(backToTypeBtn){
    backToTypeBtn.addEventListener('click', ()=>{
      selectedUserType = null;
      userTypeView.hidden = false;
      loginFormView.hidden = true;
      el('login-username').value = '';
      el('login-password').value = '';
      el('login-error').hidden = true;
    });
  }

  // Signup link
  if(signupLink){
    signupLink.addEventListener('click', ()=>{
      loginFormView.hidden = true;
      el('signup-form-view').hidden = false;
    });
  }

  const backToLoginBtn = el('back-to-login');
  if(backToLoginBtn){
    backToLoginBtn.addEventListener('click', ()=>{
      el('signup-form-view').hidden = true;
      loginFormView.hidden = false;
      el('signup-username').value = '';
      el('signup-email').value = '';
      el('signup-password').value = '';
      el('signup-password-confirm').value = '';
      el('signup-error').hidden = true;
    });
  }

  // Signup submit
  const signupSubmitBtn = el('signup-submit');
  if(signupSubmitBtn){
    signupSubmitBtn.addEventListener('click', ()=>{
      const username = el('signup-username').value.trim();
      const email = el('signup-email').value.trim();
      const password = el('signup-password').value;
      const confirmPassword = el('signup-password-confirm').value;
      const signupError = el('signup-error');
      signupError.hidden = true;

      if(!username || !email || !password || !confirmPassword){
        signupError.textContent = 'All fields are required';
        signupError.hidden = false;
        return;
      }

      if(password !== confirmPassword){
        signupError.textContent = 'Passwords do not match';
        signupError.hidden = false;
        return;
      }

      if(password.length < 6){
        signupError.textContent = 'Password must be at least 6 characters';
        signupError.hidden = false;
        return;
      }

      // In a real app, send to backend. For now, just show success and redirect to login
      sessionStorage.setItem('user', JSON.stringify({success: true, role: 'client', name: username, id: username}));
      window.location.href = '/calendar';
    });
  }

  const signupCancelBtn = el('signup-cancel');
  if(signupCancelBtn){
    signupCancelBtn.addEventListener('click', ()=>{
      el('signup-form-view').hidden = true;
      loginFormView.hidden = false;
      el('signup-username').value = '';
      el('signup-email').value = '';
      el('signup-password').value = '';
      el('signup-password-confirm').value = '';
      el('signup-error').hidden = true;
    });
  }

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

// ============= CALENDAR PAGE =============
if(window.location.pathname === '/calendar'){
  const back = el('back-home'); if(back) back.addEventListener('click', ()=>{ window.location.href = '/'; });
  const empSelect = el('employee-select');
  const dateInput = el('book-date');
  const avail = el('availability');
  const msg = el('book-msg');
  const weekly = el('weekly-bookings');
  const weekStartInput = el('week-start');
  const clientView = document.querySelector('.client-view');
  const employeeView = document.querySelector('.employee-view');

  function showMsg(m){ msg.textContent = m; msg.hidden = false; setTimeout(()=>{ msg.hidden = true; }, 3500); }

  async function loadEmployees(selectedId){
    try{
      const res = await fetch('/api/employees');
      const list = await res.json();
      if(!empSelect) return;
      empSelect.innerHTML = '';
      list.forEach(e=>{ const o = document.createElement('option'); o.value = e.id; o.textContent = e.name; empSelect.appendChild(o); });
      if(selectedId) empSelect.value = selectedId;
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
    if(!avail) return;
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
    // Show the booking form modal instead of prompt
    const modal = el('booking-form-modal');
    if(!modal) return;

    // Store the booking details for submission
    modal.dataset.emp = emp;
    modal.dataset.date = date;
    modal.dataset.time = time;

    // Clear form
    const form = el('booking-form');
    if(form) form.reset();

    // Show modal
    modal.hidden = false;
  }

  // Handle booking form submission
  const bookingForm = el('booking-form');
  if(bookingForm){
    bookingForm.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const modal = el('booking-form-modal');
      const name = el('client-full-name').value.trim();
      const email = el('client-email').value.trim();
      const phone = el('client-phone').value.trim();
      const street = el('client-street').value.trim();
      const city = el('client-city').value.trim();
      const province = el('client-province').value.trim();
      const country = el('client-country').value.trim();
      const postal = el('client-postal').value.trim();
      const notes = el('client-notes').value.trim();

      if(!name || !email || !phone || !street || !city || !province || !country || !postal){
        alert('Please fill in all required fields');
        return;
      }

      const emp = modal.dataset.emp;
      const date = modal.dataset.date;
      const time = modal.dataset.time;

      await bookSlot(emp, date, time, name);
      modal.hidden = true;
    });
  }

  // Handle booking cancel button
  const cancelBtn = el('booking-cancel-btn');
  if(cancelBtn){
    cancelBtn.addEventListener('click', ()=>{
      el('booking-form-modal').hidden = true;
      // Reload availability to show time slots again
      loadAvailability();
    });
  }

  async function bookSlot(emp,date,time,name){
    try{
      const res = await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employee_id: emp, date: date, time: time, client_name: name }) });
      const j = await res.json();
      if(!j.success){ showMsg(j.error || 'Booking failed'); return; }

      // Show confirmation popup
      alert('Confirmation sent to your e-mail!');

      // Reload availability to show updated time slots
      loadAvailability();
    }catch(e){ showMsg('Network error'); }
  }

  // Employee weekly view
  async function loadWeeklyBookings(empId, weekStart){
    if(!empId || !weekStart) return;
    try{
      const res = await fetch(`/api/bookings?employee_id=${encodeURIComponent(empId)}&week_start=${encodeURIComponent(weekStart)}`);
      if(res.status !== 200){ weekly.innerHTML = '<div class="error">Failed to load bookings</div>'; return; }
      const list = await res.json();
      renderWeekly(list, weekStart);
    }catch(e){ weekly.innerHTML = '<div class="error">Network error loading bookings</div>'; }
  }

  function renderWeekly(list, weekStart){
    // produce a 7-day grid view
    const ws = new Date(weekStart);
    const days = [];
    for(let i=0;i<7;i++){
      const d = new Date(ws); d.setDate(ws.getDate()+i);
      const key = d.toISOString().slice(0,10);
      const dayName = d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
      days.push({key, label: dayName, items: []});
    }
    list.forEach(b=>{
      const day = days.find(d=>d.key===b.date);
      if(day) day.items.push(b);
    });
    // render grid
    weekly.innerHTML = '';
    days.forEach(d=>{
      const cell = document.createElement('div');
      cell.className = 'day-cell';

      const h = document.createElement('h4');
      h.textContent = d.label;
      cell.appendChild(h);

      if(d.items.length===0){
        const p = document.createElement('div');
        p.className='no-bookings';
        p.textContent = 'No bookings';
        cell.appendChild(p);
      }
      else{
        d.items.forEach(it=>{
          const p = document.createElement('div');
          p.className = 'booking-item';
          const timeSpan = document.createElement('span');
          timeSpan.className = 'time';
          timeSpan.textContent = it.time;
          const nameSpan = document.createElement('span');
          nameSpan.className = 'name';
          nameSpan.textContent = it.client_name + (it.client_id ? ` (${it.client_id})` : '');
          p.appendChild(timeSpan);
          p.appendChild(nameSpan);
          cell.appendChild(p);
        });
      }
      weekly.appendChild(cell);
    });
  }

  // wire events
  if(empSelect) empSelect.addEventListener('change', ()=>{ if(employeeView.hidden) loadAvailability(); else loadWeeklyBookings(empSelect.value, weekStartInput.value); });
  if(dateInput) dateInput.addEventListener('change', loadAvailability);
  if(weekStartInput) weekStartInput.addEventListener('change', ()=>{ if(!employeeView.hidden) loadWeeklyBookings(empSelect.value, weekStartInput.value); });

  // initialize view depending on user role
  (async ()=>{
    const user = currentUser();
    let selectedEmp = null;
    if(user){
      const greet = el('user-greeting'); if(greet){ greet.textContent = `Hello, ${user.name}`; greet.hidden = false; }
      // if employee, show employee view only and set employee select to their id
      if(user.role === 'employee'){
        clientView.hidden = true;
        employeeView.hidden = false;
        // ensure employee select exists so we can set it
        await loadEmployees(user.id);
        selectedEmp = user.id;
        // set week start to this week's Monday by default
        const today = new Date(); const day = today.getDay(); const diff = (day + 6) % 7; // days since monday
        const monday = new Date(today); monday.setDate(today.getDate() - diff);
        const mondayStr = monday.toISOString().slice(0,10);
        if(weekStartInput) weekStartInput.value = mondayStr;
        await loadWeeklyBookings(selectedEmp, mondayStr);
        return;
      }
    }
    // default client view
    clientView.hidden = false; employeeView.hidden = true;
    await loadEmployees();
    if(!dateInput.value){ dateInput.value = new Date().toISOString().slice(0,10); }
    await loadAvailability();
  })();
}
