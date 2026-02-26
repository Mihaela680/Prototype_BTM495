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
      cell.dataset.date = d.key;
      cell.style.cursor = 'pointer';

      const h = document.createElement('h4');
      h.textContent = d.label;
      cell.appendChild(h);

      if(d.items.length===0){
        const p = document.createElement('div');
        p.className='no-bookings';
        p.textContent = 'No bookings - Click to add';
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

      // Make day cell clickable to add booking
      cell.addEventListener('click', ()=>{
        openEmployeeBookingWithTime(empSelect.value, d.key);
      });

      weekly.appendChild(cell);
    });
  }

  function openEmployeeBookingWithTime(empId, date){
    const timeStr = prompt('Enter time (HH:MM) - e.g., 14:00:');
    if(!timeStr) return;
    // simple validation
    if(!/^\d{2}:\d{2}$/.test(timeStr)){
      alert('Invalid time format. Use HH:MM');
      return;
    }

    // Show modal only after valid time entry
    const modal = el('employee-booking-modal');
    if(!modal) return;

    modal.dataset.empId = empId;
    modal.dataset.date = date;

    // Pre-fill date field
    const dateField = el('emp-booking-date');
    if(dateField) dateField.value = date;

    // Pre-fill time field
    const timeField = el('emp-booking-time');
    if(timeField) timeField.value = timeStr;

    // Clear other form fields
    el('emp-client-full-name').value = '';
    el('emp-client-email').value = '';
    el('emp-client-phone').value = '';
    el('emp-client-street').value = '';
    el('emp-client-city').value = '';
    el('emp-client-province').value = '';
    el('emp-client-country').value = '';
    el('emp-client-postal').value = '';
    el('emp-client-duration').value = '60';
    el('emp-client-notes').value = '';

    modal.hidden = false;
  }

  // Handle employee booking form submission
  const empBookingForm = el('employee-booking-form');
  if(empBookingForm){
    empBookingForm.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const modal = el('employee-booking-modal');
      const name = el('emp-client-full-name').value.trim();
      const email = el('emp-client-email').value.trim();
      const phone = el('emp-client-phone').value.trim();
      const street = el('emp-client-street').value.trim();
      const city = el('emp-client-city').value.trim();
      const province = el('emp-client-province').value.trim();
      const country = el('emp-client-country').value.trim();
      const postal = el('emp-client-postal').value.trim();
      const time = el('emp-booking-time').value.trim();
      const duration = parseInt(el('emp-client-duration').value) || 60;
      const notes = el('emp-client-notes').value.trim();

      // Validate time format
      if(!/^\d{2}:\d{2}$/.test(time)){
        alert('Invalid time format. Please use HH:MM (e.g., 14:00)');
        return;
      }

      if(!name || !email || !phone || !street || !city || !province || !country || !postal){
        alert('Please fill in all required fields');
        return;
      }

      const empId = modal.dataset.empId;
      const date = modal.dataset.date;

      await bookSlotAsEmployee(empId, date, time, name, duration);
      modal.hidden = true;
    });
  }

  // Handle employee booking cancel button
  const empCancelBtn = el('emp-booking-cancel-btn');
  if(empCancelBtn){
    empCancelBtn.addEventListener('click', ()=>{
      el('employee-booking-modal').hidden = true;
    });
  }

  async function bookSlotAsEmployee(empId, date, time, clientName, duration){
    try{
      const res = await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employee_id: empId, date: date, time: time, client_name: clientName, duration: duration }) });
      const j = await res.json();
      if(!j.success){ showMsg(j.error || 'Booking failed'); return; }

      alert('Booking created successfully!');

      // Reload weekly bookings
      if(!employeeView.hidden && weekStartInput.value){
        loadWeeklyBookings(empSelect.value, weekStartInput.value);
      }
    }catch(e){ showMsg('Network error'); }
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

      // Client view - load profile and bookings
      if(user.role === 'client'){
        clientView.hidden = false;
        employeeView.hidden = true;

        // Load client profile and bookings
        try{
          const res = await fetch(`/api/client-profile?client_id=${encodeURIComponent(user.id)}`);
          if(res.ok){
            const data = await res.json();
            if(data.success){
              // Show booking view if has profile, else new user view
              const bookingView = el('client-booking-view');
              const newUserView = el('client-new-user-view');

              if(data.profile.email){
                // Existing user with profile
                bookingView.style.display = '';
                newUserView.style.display = 'none';

                // Display profile
                const profileInfo = el('client-profile-info');
                profileInfo.innerHTML = `
                  <div class="profile-field">
                    <div class="profile-label">Full Name</div>
                    <div class="profile-value">${data.profile.name}</div>
                  </div>
                  <div class="profile-field">
                    <div class="profile-label">Email</div>
                    <div class="profile-value">${data.profile.email}</div>
                  </div>
                  <div class="profile-field">
                    <div class="profile-label">Phone</div>
                    <div class="profile-value">${data.profile.phone}</div>
                  </div>
                  <div class="profile-field">
                    <div class="profile-label">Address</div>
                    <div class="profile-value">${data.profile.street}<br>${data.profile.city}, ${data.profile.province} ${data.profile.postal}<br>${data.profile.country}</div>
                  </div>
                `;

                // Display bookings
                const bookingsList = el('client-bookings-list');
                if(data.bookings && data.bookings.length > 0){
                  bookingsList.innerHTML = data.bookings.map(b => `
                    <div class="client-booking-card">
                      <div class="booking-info">
                        <div class="booking-time">${b.time}</div>
                        <div class="booking-date">${b.date}</div>
                        <div class="booking-employee">Employee: ${b.employee_id}</div>
                      </div>
                      <div class="booking-actions">
                        <button class="modify-btn" onclick="modifyBooking('${b.id}')">Modify</button>
                        <button class="cancel-btn" onclick="cancelBooking('${b.id}')">Cancel</button>
                      </div>
                    </div>
                  `).join('');
                } else {
                  bookingsList.innerHTML = '<div class="no-bookings-msg">No bookings yet</div>';
                }
              } else {
                // New user without profile
                bookingView.style.display = 'none';
                newUserView.style.display = '';
              }
            }
          }

          await loadEmployees();
          if(!dateInput.value){ dateInput.value = new Date().toISOString().slice(0,10); }
          await loadAvailability();
        }catch(e){
          console.error('Failed to load client profile:', e);
          // Show new user view on error
          el('client-booking-view').style.display = 'none';
          el('client-new-user-view').style.display = '';
          await loadEmployees();
          if(!dateInput.value){ dateInput.value = new Date().toISOString().slice(0,10); }
          await loadAvailability();
        }
        return;
      }
    }

    // default client view (not logged in)
    clientView.hidden = false;
    employeeView.hidden = true;
    el('client-booking-view').style.display = 'none';
    el('client-new-user-view').style.display = '';
    await loadEmployees();
    if(!dateInput.value){ dateInput.value = new Date().toISOString().slice(0,10); }
    await loadAvailability();
  })();

  // Modify booking function
  window.modifyBooking = function(bookingId){
    alert('Modify booking feature coming soon: ' + bookingId);
  };

  // Cancel booking function
  window.cancelBooking = async function(bookingId){
    if(!confirm('Are you sure you want to cancel this booking?')) return;

    try{
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({booking_id: bookingId})
      });
      const data = await res.json();
      if(data.success){
        alert('Booking cancelled successfully');
        location.reload();
      } else {
        alert('Error: ' + (data.error || 'Failed to cancel booking'));
      }
    }catch(e){
      alert('Network error: ' + e.message);
    }
  };
}
