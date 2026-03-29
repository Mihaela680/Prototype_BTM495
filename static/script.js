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

  // Check URL params for pre-selected role
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role');
  if (role === 'customer') {
    selectedUserType = 'customer';
  } else if (role === 'employee') {
    selectedUserType = 'employee';
  }

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

  if (selectedUserType && userTypeView && loginFormView) {
    userTypeView.hidden = true;
    loginFormView.hidden = false;
    if (selectedUserType === 'customer') {
      if (signupPrompt) signupPrompt.hidden = false;
      if (el('employee-no-signup')) el('employee-no-signup').hidden = true;
    } else {
      if (signupPrompt) signupPrompt.hidden = true;
      if (el('employee-no-signup')) el('employee-no-signup').hidden = false;
    }
    if (el('demo-hint')) el('demo-hint').hidden = false;
  }

  if(customerBtn && userTypeView && loginFormView){
    customerBtn.addEventListener('click', ()=>{
      selectedUserType = 'customer';
      userTypeView.hidden = true;
      loginFormView.hidden = false;
      if (signupPrompt) signupPrompt.hidden = false;
      if (el('employee-no-signup')) el('employee-no-signup').hidden = true;
      if (el('demo-hint')) el('demo-hint').hidden = false;
    });
  }

  if(employeeBtn && userTypeView && loginFormView){
    employeeBtn.addEventListener('click', ()=>{
      selectedUserType = 'employee';
      userTypeView.hidden = true;
      loginFormView.hidden = false;
      if (signupPrompt) signupPrompt.hidden = true;
      if (el('employee-no-signup')) el('employee-no-signup').hidden = false;
      if (el('demo-hint')) el('demo-hint').hidden = false;
    });
  }

  if(backToTypeBtn && userTypeView && loginFormView){
    backToTypeBtn.addEventListener('click', ()=>{
      selectedUserType = null;
      userTypeView.hidden = false;
      loginFormView.hidden = true;
      if (el('login-username')) el('login-username').value = '';
      if (el('login-password')) el('login-password').value = '';
      if (el('login-error')) el('login-error').hidden = true;
      if (el('employee-no-signup')) el('employee-no-signup').hidden = true;
      if (signupPrompt) signupPrompt.hidden = true;
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
        sessionStorage.setItem('user', JSON.stringify(j));
        window.location.href = '/calendar';
      }catch(e){ err.textContent = 'Network error'; err.hidden = false; }
    });
  }
}

// ============= CALENDAR PAGE =============
if(window.location.pathname === '/calendar'){
  const back = el('back-home'); if(back) back.addEventListener('click', ()=>{ window.location.href = '/'; });
  const logoutBtn = el('logout-btn');
  if(logoutBtn){
    // Hidden by default; only employee/manager should see it.
    logoutBtn.hidden = true;
    logoutBtn.addEventListener('click', ()=>{
      sessionStorage.removeItem('user');
      window.location.href = '/';
    });
  }
  const empSelect = el('employee-select');
  const dateInput = el('book-date');
  const avail = el('availability');
  const msg = el('book-msg');
  const weekly = el('weekly-bookings');
  const weekStartInput = el('week-start');
  const clientView = document.querySelector('.client-view');
  const employeeView = document.querySelector('.employee-view');
  const managerView = document.querySelector('.manager-view');

  function showMsg(m){ msg.textContent = m; msg.hidden = false; setTimeout(()=>{ msg.hidden = true; }, 3500); }

  async function loadEmployees(selectedId){
    try{
      const res = await fetch('/api/employees');
      const list = await res.json();
      if(!empSelect) return;
      empSelect.innerHTML = '';
      list.forEach(e=>{ const o = document.createElement('option'); o.value = e.id; o.textContent = e.name; empSelect.appendChild(o); });
      // Client can choose Other to create an unassigned booking for manager assignment.
      const other = document.createElement('option');
      other.value = '__other__';
      other.textContent = 'Other (Manager will assign)';
      empSelect.appendChild(other);
      if(selectedId) empSelect.value = selectedId;
    }catch(e){ showMsg('Failed to load employees'); }
  }

  async function loadAvailability(){
    const emp = empSelect.value; const date = dateInput.value;
    if(!emp || !date) return;

    // If client selects Other, skip employee availability and allow direct booking as unassigned.
    if(emp === '__other__'){
      renderSlots(generateDefaultSlots(), '__other__', date);
      return;
    }

    try{
      const res = await fetch(`/api/availability?employee_id=${encodeURIComponent(emp)}&date=${encodeURIComponent(date)}`);
      if(res.status !== 200){ showMsg('Failed to load availability'); return; }
      const j = await res.json();
      renderSlots(j.slots, emp, date);
    }catch(e){ showMsg('Network error'); }
  }

  function generateDefaultSlots(){
    const out = [];
    let h = 9;
    let m = 0;
    while(h < 17 || (h === 17 && m === 0)){
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      out.push({time: `${hh}:${mm}`, available: true});
      m += 30;
      if(m >= 60){ m = 0; h += 1; }
    }
    return out;
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
      const user = currentUser();

      await bookSlot(emp, date, time, {
        client_name: name,
        client_id: user && user.role === 'client' ? user.id : undefined,
        email,
        phone,
        street,
        city,
        province,
        country,
        postal,
        notes
      });
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

  // Wire up confirmation modal close button
  const confirmCloseBtn = el('confirmation-close-btn');
  if(confirmCloseBtn){
    confirmCloseBtn.addEventListener('click', ()=>{
      el('booking-confirmation-modal').hidden = true;
    });
  }

  // Wire up profile created modal close button
  const profileCreatedCloseBtn = el('profile-created-close-btn');
  if(profileCreatedCloseBtn){
    profileCreatedCloseBtn.addEventListener('click', ()=>{
      el('profile-created-modal').hidden = true;
    });
  }

  async function bookSlot(emp,date,time,bookingData){
    try{
      const payload = {
        employee_id: (emp && emp !== '__other__') ? emp : null,
        date,
        time,
        ...bookingData
      };
      const res = await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      let j;
      try{ j = await res.json(); } catch(parseErr){ showMsg('Server error – please try again'); return; }
      if(!j.success){ showMsg(j.error || 'Booking failed'); return; }

      // Show styled confirmation popup
      const confirmModal = el('booking-confirmation-modal');
      if(confirmModal) confirmModal.hidden = false;
      loadAvailability();
    }catch(e){
      showMsg('Could not reach the server. Please check your connection and try again.');
    }
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
      cell.style.minWidth = '0';
      cell.style.boxSizing = 'border-box';

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
            p.style.cursor = 'pointer';
            p.addEventListener('click', (e) => {
                e.stopPropagation();
            window.showBookingDetails(it.id);
            });
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

      await bookSlotAsEmployee(empId, date, {
        client_name: name,
        email,
        phone,
        street,
        city,
        province,
        country,
        postal,
        duration,
        notes,
        time
      });
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

  async function bookSlotAsEmployee(empId, date, bookingData){
    try{
      const res = await fetch('/api/book', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ employee_id: empId, date, ...bookingData })
      });
      const j = await res.json();
      if(!j.success){ showMsg(j.error || 'Booking failed'); return; }

      alert('Booking created successfully!');

      if(!employeeView.hidden && weekStartInput.value){
        loadWeeklyBookings(empSelect.value, weekStartInput.value);
      }
    }catch(e){ showMsg('Network error'); }
  }

  // Load employee profile
  async function loadEmployeeProfile(employeeId){
    try{
      const res = await fetch(`/api/employee-profile?employee_id=${encodeURIComponent(employeeId)}`);
      if(res.ok){
        const data = await res.json();
        if(data.success){
          const profileInfo = el('employee-profile-info');
          profileInfo.innerHTML = `
            <div class="profile-field">
              <div class="profile-label">Employee ID</div>
              <div class="profile-value">${data.profile.id}</div>
            </div>
            <div class="profile-field">
              <div class="profile-label">Name</div>
              <div class="profile-value">${data.profile.name}</div>
            </div>
            <div class="profile-field">
              <div class="profile-label">Role</div>
              <div class="profile-value">${data.profile.role}</div>
            </div>
            <div class="profile-field">
              <div class="profile-label">Birthdate</div>
              <div class="profile-value">${data.profile.birthdate}</div>
            </div>
            <div class="profile-field">
              <div class="profile-label">Social Insurance Number</div>
              <div class="profile-value">${data.profile.sin}</div>
            </div>
          `;
        }
      }
    }catch(e){
      console.error('Failed to load employee profile:', e);
    }

    // Load workload
    try{
      const res = await fetch(`/api/get-workload?employee_id=${encodeURIComponent(employeeId)}`);
      if(res.ok){
        const data = await res.json();
        el('workload-hours').value = data.hours;
      }
    }catch(e){
      console.error('Failed to load workload:', e);
    }
  }

  // Availability management
  let currentAvailTimes = [];
  const loadAvailBtn = el('load-avail-btn');
  if(loadAvailBtn){
    loadAvailBtn.addEventListener('click', async ()=>{
      const date = el('avail-date').value;
      const user = currentUser();
      if(!date || !user) return;
      try{
        const res = await fetch(`/api/get-availability?employee_id=${encodeURIComponent(user.id)}&date=${encodeURIComponent(date)}`);
        if(res.ok){
          const data = await res.json();
          currentAvailTimes = data.times;
          renderAvailSlots(data.times);
          el('confirm-avail-btn').disabled = false;
          el('cancel-avail-btn').disabled = false;
        }
      }catch(e){
        console.error('Failed to load availability:', e);
      }
    });
  }

  function renderAvailSlots(times){
    const availTimes = el('avail-times');
    availTimes.innerHTML = '';
    const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    allSlots.forEach(slot=>{
      const b = document.createElement('button');
      b.className = 'time-slot' + (times.includes(slot) ? ' selected' : '');
      b.textContent = slot;
      b.addEventListener('click', ()=>{
        if(times.includes(slot)){
          times.splice(times.indexOf(slot), 1);
          b.classList.remove('selected');
        }else{
          times.push(slot);
          b.classList.add('selected');
        }
      });
      availTimes.appendChild(b);
    });
  }

  const enterAvailBtn = el('enter-avail-btn');
  if(enterAvailBtn){
    enterAvailBtn.addEventListener('click', ()=>{
      const date = el('avail-date').value;
      if(!date) return;
      currentAvailTimes = [];
      renderAvailSlots([]);
      el('confirm-avail-btn').disabled = false;
      el('cancel-avail-btn').disabled = false;
    });
  }

  const editAvailBtn = el('edit-avail-btn');
  if(editAvailBtn){
    editAvailBtn.addEventListener('click', ()=>{
      // Already loaded, just enable editing
    });
  }

  const confirmAvailBtn = el('confirm-avail-btn');
  if(confirmAvailBtn){
    confirmAvailBtn.addEventListener('click', async ()=>{
      const date = el('avail-date').value;
      const user = currentUser();
      if(!date || !user) return;
      try{
        const res = await fetch('/api/set-availability', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({employee_id: user.id, date: date, times: currentAvailTimes})
        });
        if(res.ok){
          alert('Availability updated successfully!');
        }
      }catch(e){
        console.error('Failed to set availability:', e);
      }
    });
  }

  const cancelAvailBtn = el('cancel-avail-btn');
  if(cancelAvailBtn){
    cancelAvailBtn.addEventListener('click', async ()=>{
      const date = el('avail-date').value;
      const user = currentUser();
      if(!date || !user) return;
      try{
        const res = await fetch('/api/set-availability', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({employee_id: user.id, date: date, times: []})
        });
        if(res.ok){
          currentAvailTimes = [];
          renderAvailSlots([]);
          alert('Availability cancelled!');
        }
      }catch(e){
        console.error('Failed to cancel availability:', e);
      }
    });
  }

  // Update workload
  const updateWorkloadBtn = el('update-workload-btn');
  if(updateWorkloadBtn){
    updateWorkloadBtn.addEventListener('click', async ()=>{
      const hours = el('workload-hours').value;
      const user = currentUser();
      if(!user) return;
      try{
        const res = await fetch('/api/set-workload', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({employee_id: user.id, hours: hours})
        });
        if(res.ok){
          alert('Workload updated successfully!');
        }
      }catch(e){
        console.error('Failed to update workload:', e);
      }
    });
  }

  // Select schedule
  const selectScheduleBtn = el('select-schedule-btn');
  if(selectScheduleBtn){
    selectScheduleBtn.addEventListener('click', async ()=>{
      const template = el('schedule-template').value;
      const user = currentUser();
      if(!user) return;
      try{
        const res = await fetch('/api/select-schedule', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({employee_id: user.id, template: template})
        });
        if(res.ok){
          alert('Schedule selected successfully!');
        }
      }catch(e){
        console.error('Failed to select schedule:', e);
      }
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

      if(logoutBtn){
        logoutBtn.hidden = !(user.role === 'employee' || user.is_manager);
      }

      // Manager check must come FIRST — managers have role='employee' so we check is_manager flag
      if(user.is_manager){
        clientView.hidden = true;
        employeeView.hidden = true;
        managerView.hidden = false;
        return; // manager IIFE below handles all tab wiring independently
      }

      // if employee (non-manager), show employee view only and set employee select to their id
      if(user.role === 'employee'){
        clientView.hidden = true;
        employeeView.hidden = false;
        managerView.hidden = true;
        // ensure employee select exists so we can set it
        await loadEmployees(user.id);
        selectedEmp = user.id;
        // set week start to this week's Monday by default
        const today = new Date(); const day = today.getDay(); const diff = (day + 6) % 7; // days since monday
        const monday = new Date(today); monday.setDate(today.getDate() - diff);
        const mondayStr = monday.toISOString().slice(0,10);
        if(weekStartInput) weekStartInput.value = mondayStr;
        await loadWeeklyBookings(selectedEmp, mondayStr);

        // Initialize tabs
        const scheduleTab = el('schedule-tab');
        const profileTab = el('profile-tab');
        const scheduleContent = el('schedule-content');
        const profileContent = el('profile-content');

        if(scheduleTab) scheduleTab.addEventListener('click', ()=>{
          scheduleTab.classList.add('active');
          profileTab.classList.remove('active');
          scheduleContent.hidden = false;
          profileContent.hidden = true;
        });

        if(profileTab) profileTab.addEventListener('click', ()=>{
          profileTab.classList.add('active');
          scheduleTab.classList.remove('active');
          scheduleContent.hidden = true;
          profileContent.hidden = false;
          loadEmployeeProfile(user.id);
        });

        // Load profile initially if profile tab is active, but start with schedule
        return;
      }


      // Client view - direct booking flow (no profile/login required)
      if(user.role === 'client'){
        clientView.hidden = false;
        employeeView.hidden = true;
        managerView.hidden = true;
        await loadEmployees();
        if(!dateInput.value){ dateInput.value = new Date().toISOString().slice(0,10); }
        await loadAvailability();
        return;
      }
    }

    // default client view (not logged in)
    if(logoutBtn) logoutBtn.hidden = true;
    clientView.hidden = false;
    employeeView.hidden = true;
    managerView.hidden = true;
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

  // Booking details modal (for viewing details from employee/manager view)
  const closeDetailsBtn = el('close-booking-details-btn');
  if(closeDetailsBtn){
    closeDetailsBtn.addEventListener('click', ()=>{
      el('booking-details-modal').hidden = true;
    });
  }

  window.showBookingDetails = async function(bookingId){
    try{
      const res = await fetch(`/api/manager/booking-details?booking_id=${encodeURIComponent(bookingId)}`);
      if(res.ok){
        const data = await res.json();
        const booking = data.booking;
        const html = `
          <div class="profile-field">
            <div class="profile-label">Client Name</div>
            <div class="profile-value">${booking.client_name}</div>
          </div>
          <div class="profile-field">
            <div class="profile-label">Email</div>
            <div class="profile-value">${booking.email || 'N/A'}</div>
          </div>
          <div class="profile-field">
            <div class="profile-label">Phone</div>
            <div class="profile-value">${booking.phone || 'N/A'}</div>
          </div>
          <div class="profile-field">
            <div class="profile-label">Address</div>
            <div class="profile-value">${booking.street || 'N/A'}<br>${booking.city || ''}, ${booking.province || ''} ${booking.postal || ''}<br>${booking.country || ''}</div>
          </div>
          <div class="profile-field">
            <div class="profile-label">Appointment Date & Time</div>
            <div class="profile-value">${booking.date} at ${booking.time}</div>
          </div>
          <div class="profile-field">
            <div class="profile-label">Duration</div>
            <div class="profile-value">${booking.duration} minutes</div>
          </div>
          <div class="profile-field">
            <div class="profile-label">Notes</div>
            <div class="profile-value">${booking.notes || 'N/A'}</div>
          </div>
        `;
        el('booking-details-content').innerHTML = html;
        el('booking-details-modal').hidden = false;
      }
    }catch(e){
      console.error('Failed to load booking details:', e);
    }
  };

  // ============= MANAGER VIEW =============
  if(managerView){
    const managerDashboardTab = el('manager-dashboard-tab');
    const managerScheduleTab = el('manager-schedule-tab');
    const managerReportsTab = el('manager-reports-tab');
    const managerProfileCreationTab = el('manager-profile-creation-tab');
    const managerDashboardContent = el('manager-dashboard-content');
    const managerScheduleContent = el('manager-schedule-content');
    const managerReportsContent = el('manager-reports-content');
    const managerProfileCreationContent = el('manager-profile-creation-content');
    const managerEmpSelect = el('manager-emp-select');
    const managerWeeklyBookings = el('manager-weekly-bookings');
    const managerWeekStart = el('manager-week-start');

    function setManagerTab(active){
      [managerDashboardTab,managerScheduleTab,managerReportsTab,managerProfileCreationTab].forEach(t=>{ if(t) t.classList.remove('active'); });
      [managerDashboardContent,managerScheduleContent,managerReportsContent,managerProfileCreationContent].forEach(c=>{ if(c) c.hidden=true; });
      if(active.tab) active.tab.classList.add('active');
      if(active.content) active.content.hidden = false;
    }

    if(managerDashboardTab){
      managerDashboardTab.addEventListener('click', ()=>{
        setManagerTab({tab: managerDashboardTab, content: managerDashboardContent});
        loadManagerSummary();
      });
    }
    if(managerScheduleTab){
      managerScheduleTab.addEventListener('click', ()=>{
        setManagerTab({tab: managerScheduleTab, content: managerScheduleContent});
      });
    }
    if(managerReportsTab){
      managerReportsTab.addEventListener('click', ()=>{
        setManagerTab({tab: managerReportsTab, content: managerReportsContent});
      });
    }
    if(managerProfileCreationTab){
      managerProfileCreationTab.addEventListener('click', ()=>{
        setManagerTab({tab: managerProfileCreationTab, content: managerProfileCreationContent});
        loadManagerEmployeeList();
      });
    }

    async function loadManagerSummary(){
      try{
        const res = await fetch('/api/manager/summary');
        const summary = await res.json();
        let html = '<div class="manager-summary">';
        for(const empId in summary){
          const emp = summary[empId];
          html += `
            <div class="manager-summary-card">
              <h4>${emp.name}</h4>
              <div class="stat-value">${emp.total_bookings}</div>
              <div class="stat-label">Total Bookings</div>
              <div class="stat-value">${emp.total_hours}h</div>
              <div class="stat-label">Total Hours</div>
            </div>`;
        }
        html += '</div>';
        el('manager-summary').innerHTML = html;
      }catch(e){ console.error('Failed to load manager summary:', e); }
    }

    async function loadManagerEmployees(){
      try{
        const res = await fetch('/api/employees');
        const list = await res.json();
        if(managerEmpSelect){
          managerEmpSelect.innerHTML = '';
          list.forEach(e=>{
            const o = document.createElement('option');
            o.value = e.id; o.textContent = e.name;
            managerEmpSelect.appendChild(o);
          });
        }
        // Also populate report filter
        const reportEmpSelect = el('report-emp-select');
        if(reportEmpSelect){
          reportEmpSelect.innerHTML = '<option value="">All Employees</option>';
          list.forEach(e=>{
            const o = document.createElement('option');
            o.value = e.id; o.textContent = e.name;
            reportEmpSelect.appendChild(o);
          });
        }
        // Also populate legacy assign modal employee select
        const assignEmpSelect = el('manager-assign-employee');
        if(assignEmpSelect){
          assignEmpSelect.innerHTML = '';
          list.forEach(e=>{
            const o = document.createElement('option');
            o.value = e.id; o.textContent = e.name;
            assignEmpSelect.appendChild(o);
          });
        }
      }catch(e){ console.error('Failed to load employees:', e); }
    }

    async function loadManagerEmployeeList(){
      const user = currentUser();
      if(!user) return;
      try{
        const res = await fetch(`/api/manager/list-employees?actor_id=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        const container = el('manager-employees-list');
        if(!container) return;
        if(!data.success || !data.employees.length){
          container.innerHTML = '<div class="hint">No employees found.</div>'; return;
        }
        container.innerHTML = `
          <table class="report-table" style="margin-top:8px">
            <thead><tr>
              <th>ID</th><th>Name</th><th>Username</th><th>Role</th>
              <th>Birthdate</th><th>SIN</th><th>Hours/Week</th><th>Active</th>
            </tr></thead>
            <tbody>
              ${data.employees.map(e=>`
                <tr>
                  <td>${e.id}</td><td>${e.name}</td><td>${e.username||'—'}</td>
                  <td>${e.role}</td><td>${e.birthdate||'—'}</td><td>${e.sin||'—'}</td>
                  <td>${e.workload_hours}</td><td>${e.is_active?'✅':'❌'}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }catch(e){ console.error('Failed to load employee list:', e); }
    }

    // Create Employee form
    const createEmpForm = el('create-employee-form');
    if(createEmpForm){
      createEmpForm.addEventListener('submit', async (evt)=>{
        evt.preventDefault();
        const user = currentUser();
        const errDiv = el('create-emp-error');
        const okDiv = el('create-emp-success');
        errDiv.hidden = true; okDiv.hidden = true;
        const payload = {
          actor_id: user ? user.id : '',
          employee_id: el('new-emp-id').value.trim(),
          name: el('new-emp-name').value.trim(),
          username: el('new-emp-username').value.trim(),
          password: el('new-emp-password').value.trim(),
          birthdate: el('new-emp-birthdate').value || '',
          sin: el('new-emp-sin').value.trim(),
          workload_hours: parseInt(el('new-emp-workload').value) || 40
        };
        try{
          const res = await fetch('/api/manager/create-employee', {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.success){
            okDiv.hidden = true;
            createEmpForm.reset();
            loadManagerEmployeeList();
            loadManagerEmployees();
            const profileModal = el('profile-created-modal');
            if(profileModal) profileModal.hidden = false;
          } else {
            errDiv.textContent = data.error || 'Failed to create employee';
            errDiv.hidden = false;
          }
        }catch(e){
          errDiv.textContent = 'Network error';
          errDiv.hidden = false;
        }
      });
    }

    async function loadManagerWeekly(empId, weekStart){
      if(!empId || !weekStart) return;
      try{
        const res = await fetch(`/api/bookings?employee_id=${encodeURIComponent(empId)}&week_start=${encodeURIComponent(weekStart)}`);
        if(res.ok){
          const list = await res.json();
          renderManagerWeekly(list, weekStart);
        }
      }catch(e){ console.error('Failed to load manager weekly:', e); }
    }

    function renderManagerWeekly(list, weekStart){
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
      managerWeeklyBookings.innerHTML = '';
      managerWeeklyBookings.style.display = 'grid';
      managerWeeklyBookings.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
      managerWeeklyBookings.style.gap = '8px';
      days.forEach(d=>{
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.dataset.date = d.key;
        cell.style.cursor = 'pointer';
        cell.style.minWidth = '0';
        cell.style.boxSizing = 'border-box';
        const h = document.createElement('h4');
        h.textContent = d.label;
        cell.appendChild(h);
        if(d.items.length===0){
          const p = document.createElement('div');
          p.className='no-bookings';
          p.textContent = 'No bookings - Click to add';
          cell.appendChild(p);
        } else {
          d.items.forEach(it=>{
            const p = document.createElement('div');
            p.className = 'booking-item';
            p.style.cursor = 'pointer';
            const timeSpan = document.createElement('span'); timeSpan.className='time'; timeSpan.textContent = it.time;
            const nameSpan = document.createElement('span'); nameSpan.className='name'; nameSpan.textContent = it.client_name;
            p.appendChild(timeSpan); p.appendChild(nameSpan);
            p.addEventListener('click', ()=>{ window.showBookingDetails(it.id); });
            cell.appendChild(p);
          });
        }
        cell.addEventListener('click', ()=>{ openManagerAssignBooking(managerEmpSelect.value, d.key); });
        managerWeeklyBookings.appendChild(cell);
      });
    }

    function openManagerAssignBooking(empId, date){
      const timeStr = prompt('Enter time (HH:MM) - e.g., 14:00:');
      if(!timeStr) return;
      if(!/^\d{2}:\d{2}$/.test(timeStr)){ alert('Invalid time format. Use HH:MM'); return; }
      const modal = el('manager-assign-booking-modal');
      if(!modal) return;
      modal.dataset.empId = empId; modal.dataset.date = date;
      el('manager-assign-date').value = date;
      el('manager-assign-time').value = timeStr;
      el('manager-assign-employee').value = empId;
      el('manager-assign-name').value = '';
      el('manager-assign-email').value = '';
      el('manager-assign-phone').value = '';
      el('manager-assign-street').value = '';
      el('manager-assign-city').value = '';
      el('manager-assign-province').value = '';
      el('manager-assign-country').value = '';
      el('manager-assign-postal').value = '';
      el('manager-assign-duration').value = '60';
      el('manager-assign-notes').value = '';
      modal.hidden = false;
    }

    const managerAssignForm = el('manager-assign-form');
    if(managerAssignForm){
      managerAssignForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const modal = el('manager-assign-booking-modal');
        const empId = el('manager-assign-employee').value;
        const date = el('manager-assign-date').value;
        const time = el('manager-assign-time').value;
        const name = el('manager-assign-name').value.trim();
        const email = el('manager-assign-email').value.trim();
        const phone = el('manager-assign-phone').value.trim();
        const street = el('manager-assign-street').value.trim();
        const city = el('manager-assign-city').value.trim();
        const province = el('manager-assign-province').value.trim();
        const country = el('manager-assign-country').value.trim();
        const postal = el('manager-assign-postal').value.trim();
        const duration = parseInt(el('manager-assign-duration').value) || 60;
        const notes = el('manager-assign-notes').value.trim();
        if(!name||!email||!phone||!street||!city||!province||!country||!postal){ alert('Please fill in all required fields'); return; }
        try{
          const res = await fetch('/api/manager/assign-booking', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({employee_id:empId, date, time, client_name:name, email, phone, street, city, province, country, postal, duration, notes})
          });
          const data = await res.json();
          if(data.success){
            modal.hidden = true;
            loadManagerWeekly(empId, managerWeekStart.value);
          } else {
            alert('Error: ' + (data.error || 'Failed to assign booking'));
          }
        }catch(e){ console.error('Failed to assign booking:', e); }
      });
    }

    const managerAssignCancel = el('manager-assign-cancel');
    if(managerAssignCancel){
      managerAssignCancel.addEventListener('click', ()=>{ el('manager-assign-booking-modal').hidden = true; });
    }

    // ---- WIREFLOW: Unassigned Jobs + Assign Employee Modal ----

    // State for the assignment flow
    let _assigningJob = null;      // { id, client_name, date, time, duration, notes, ... }
    let _selectedEmpId = null;
    let _selectedEmpName = null;

    async function loadUnassignedJobs(){
      const listEl = el('manager-unassigned-list');
      if(!listEl) return;
      try{
        const res = await fetch('/api/manager/unassigned-bookings');
        const data = await res.json();
        if(!data.success){ listEl.innerHTML = '<p class="hint">Failed to load.</p>'; return; }
        const jobs = data.bookings || [];
        if(!jobs.length){ listEl.innerHTML = '<p class="hint">No unassigned jobs at this time.</p>'; return; }
        listEl.innerHTML = '';
        jobs.forEach(job=>{
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee;gap:8px';
          const info = document.createElement('div');
          info.style.fontSize = '13px';
          info.innerHTML = `<strong>${job.id}</strong> &ndash; ${job.notes || 'Window Cleaning'}<br>
            <span style="color:#555">${job.date} &bull; ${job.time} &bull; ${job.client_name}</span>`;
          const btn = document.createElement('button');
          btn.textContent = 'Assign';
          btn.className = 'btn-primary';
          btn.style.cssText = 'font-size:12px;padding:5px 12px;white-space:nowrap';
          btn.addEventListener('click', ()=>{ openAssignEmployeeModal(job); });
          row.appendChild(info);
          row.appendChild(btn);
          listEl.appendChild(row);
        });
      }catch(e){ listEl.innerHTML = '<p class="hint">Network error.</p>'; }
    }

    async function openAssignEmployeeModal(job){
      _assigningJob = job;
      _selectedEmpId = null;
      _selectedEmpName = null;
      // Reset confirm button
      el('assign-emp-confirm-btn').disabled = true;

      // Show job summary
      el('assign-job-summary').innerHTML =
        `<strong>${job.id}</strong> &ndash; ${job.notes || 'Window Cleaning'}<br>
         <span style="color:#555">📅 ${job.date} &nbsp;⏰ ${job.time} &nbsp;👤 ${job.client_name}</span>`;

      // Load employees with workload
      const listEl = el('assign-employee-list');
      listEl.innerHTML = '<p class="hint">Loading employees…</p>';
      el('assign-employee-modal').hidden = false;

      try{
        const dur = job.duration || 60;
        const ws = managerWeekStart.value || '';
        const res = await fetch(`/api/manager/employees-workload?job_duration=${dur}&week_start=${encodeURIComponent(ws)}`);
        const data = await res.json();
        if(!data.success){ listEl.innerHTML = '<p class="hint">Failed to load employees.</p>'; return; }
        listEl.innerHTML = '';
        data.employees.forEach(emp=>{
          const pct = Math.min(100, Math.round((emp.booked_hours / emp.cap_hours) * 100));
          const barColor = emp.would_exceed ? '#f44336' : (pct >= 80 ? '#FF9800' : '#4CAF50');
          const card = document.createElement('div');
          card.style.cssText = `border:2px solid ${emp.would_exceed ? '#ffcdd2' : '#e3eaf5'};border-radius:8px;
            padding:12px 14px;cursor:${emp.would_exceed?'not-allowed':'pointer'};
            opacity:${emp.would_exceed?'0.5':'1'};transition:border-color .15s,background .15s`;
          card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:600;font-size:14px">${emp.name}</span>
              <span style="font-size:13px;color:#555">${emp.booked_hours}/${emp.cap_hours} hrs
                ${emp.would_exceed ? '<span style="color:#f44336;font-weight:600">&nbsp;— Over cap</span>' : ''}
              </span>
            </div>
            <div style="background:#e0e0e0;border-radius:4px;height:8px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${barColor};transition:width .3s"></div>
            </div>`;

          if(!emp.would_exceed){
            card.addEventListener('click', ()=>{
              // Deselect all, select this one
              listEl.querySelectorAll('div[data-emp-id]').forEach(c=>{
                c.style.borderColor = '#e3eaf5';
                c.style.background = '';
              });
              card.style.borderColor = 'var(--primary-blue)';
              card.style.background = '#f0f4ff';
              _selectedEmpId = emp.id;
              _selectedEmpName = emp.name;
              el('assign-emp-confirm-btn').disabled = false;
            });
          }
          card.dataset.empId = emp.id;
          listEl.appendChild(card);
        });
      }catch(e){ listEl.innerHTML = '<p class="hint">Network error loading employees.</p>'; }
    }

    // Confirm assignment button
    const assignEmpConfirmBtn = el('assign-emp-confirm-btn');
    if(assignEmpConfirmBtn){
      assignEmpConfirmBtn.addEventListener('click', async ()=>{
        if(!_selectedEmpId || !_assigningJob) return;
        assignEmpConfirmBtn.disabled = true;
        assignEmpConfirmBtn.textContent = 'Assigning…';
        try{
          const user = currentUser();
          const res = await fetch('/api/manager/assign-booking', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              booking_id: _assigningJob.id,
              employee_id: _selectedEmpId,
              actor_id: user ? user.id : ''
            })
          });
          const data = await res.json();
          if(data.success){
            // Close modal
            el('assign-employee-modal').hidden = false;
            el('assign-employee-modal').hidden = true;
            // Step 4: show success banner
            const jobLabel = _assigningJob.id;
            const empLabel = _selectedEmpName;
            const banner = el('assign-success-banner');
            const bannerText = el('assign-success-text');
            bannerText.textContent = `Job ${jobLabel} assigned to ${empLabel}. Notification sent.`;
            banner.hidden = false;
            // Auto-hide after 5 seconds
            setTimeout(()=>{ banner.hidden = true; }, 5000);
            // Refresh unassigned list and weekly calendar
            await loadUnassignedJobs();
            await loadManagerWeekly(_selectedEmpId, managerWeekStart.value);
          } else {
            alert('Error: ' + (data.error || 'Assignment failed'));
          }
        }catch(e){
          alert('Network error. Please try again.');
        }
        assignEmpConfirmBtn.disabled = false;
        assignEmpConfirmBtn.textContent = 'Confirm Assignment';
      });
    }

    // Cancel button on assign employee modal
    const assignEmpCancelBtn = el('assign-emp-cancel-btn');
    if(assignEmpCancelBtn){
      assignEmpCancelBtn.addEventListener('click', ()=>{
        el('assign-employee-modal').hidden = true;
        _assigningJob = null; _selectedEmpId = null; _selectedEmpName = null;
      });
    }

    if(managerEmpSelect){
      managerEmpSelect.addEventListener('change', ()=>{
        loadManagerWeekly(managerEmpSelect.value, managerWeekStart.value);
      });
    }
    if(managerWeekStart){
      managerWeekStart.addEventListener('change', ()=>{
        loadManagerWeekly(managerEmpSelect.value, managerWeekStart.value);
        loadUnassignedJobs();
      });
    }

    // Initialize manager view on load
    (async ()=>{
      await loadManagerEmployees();
      const today = new Date(); const day = today.getDay(); const diff = (day+6)%7;
      const monday = new Date(today); monday.setDate(today.getDate()-diff);
      const mondayStr = monday.toISOString().slice(0,10);
      managerWeekStart.value = mondayStr;
      await loadManagerSummary();
      await loadManagerWeekly(managerEmpSelect.value, mondayStr);
      await loadUnassignedJobs();
      setManagerTab({tab: managerScheduleTab, content: managerScheduleContent});
    })();
  }
}
