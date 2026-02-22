# JavaScript Navigation Implementation - Quick Reference

## 🎯 What Was Implemented

### File: `/static/script.js`

#### 1. **Homepage Navigation** (Lines 10-22)
```javascript
// Login button click -> /login
el('login-btn').addEventListener('click', ()=>{ window.location.href = '/login'; });

// Service boxes click -> /login
const serviceWindows = el('service-windows');
const serviceGutters = el('service-gutters');
if(serviceWindows) serviceWindows.addEventListener('click', ()=>{ window.location.href = '/login'; });
if(serviceGutters) serviceGutters.addEventListener('click', ()=>{ window.location.href = '/login'; });

// Visual feedback: cursor changes to pointer
if(serviceWindows) serviceWindows.style.cursor = 'pointer';
if(serviceGutters) serviceGutters.style.cursor = 'pointer';
```

**What happens:**
- Single click on "Log in" button → goes to login page
- Single click on any service box → goes to login page
- Cursor shows as pointer on hover (visual feedback)

---

#### 2. **Login Page Functionality** (Lines 24-44)
```javascript
// Back button -> /
const back = el('back-home'); 
if(back) back.addEventListener('click', ()=>{ window.location.href = '/'; });

// Form submission
const submit = el('login-submit');
if(submit){
  submit.addEventListener('click', async ()=>{
    // Get values
    const u = el('login-username').value.trim();
    const p = el('login-password').value;
    
    // Validate inputs
    if(!u || !p){ 
      showError('Enter username and password'); 
      return; 
    }
    
    // Send to server
    const res = await fetch('/api/login', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({username:u,password:p}) 
    });
    
    // Handle response
    if(res.status !== 200){ 
      showError('Login failed'); 
      return; 
    }
    
    // Save user info and redirect
    const j = await res.json();
    sessionStorage.setItem('user', JSON.stringify(j));
    window.location.href = '/calendar';
  });
}
```

**What happens:**
1. User enters username and password
2. Clicks "Sign in" button
3. JavaScript sends credentials to server via `/api/login`
4. If valid: saves user info in sessionStorage and goes to calendar
5. If invalid: shows error message and stays on login page
6. "Home" button takes user back to home page

---

#### 3. **Calendar Page Functionality** (Lines 46-111)
```javascript
// Load employees on page load
async function loadEmployees(){
  const res = await fetch('/api/employees');
  const list = await res.json();
  // Populate employee dropdown
}

// Load availability when date/employee changes
async function loadAvailability(){
  const emp = empSelect.value; 
  const date = dateInput.value;
  // Fetch slots from /api/availability
  // Render time slot buttons
}

// Show available time slots
function renderSlots(slots, emp, date){
  avail.innerHTML = '';
  slots.forEach(s=>{
    const b = document.createElement('button');
    b.className = 'time-slot' + (s.available? '':' booked');
    b.textContent = s.time + (s.available? '':' (booked)');
    if(s.available){
      b.addEventListener('click', ()=>{ openBooking(emp, date, s.time); });
    }
    avail.appendChild(b);
  });
}

// Handle booking
async function bookSlot(emp,date,time,name){
  const res = await fetch('/api/book', { 
    method:'POST', 
    headers:{'Content-Type':'application/json'}, 
    body: JSON.stringify({ 
      employee_id: emp, 
      date: date, 
      time: time, 
      client_name: name 
    }) 
  });
  // Reload availability after booking
}
```

**What happens:**
1. Calendar page loads and fetches employee list
2. Displays default date (today) and first employee
3. Shows available time slots:
   - Green for available
   - Red/booked for taken
4. User selects service, employee, and date
5. Available slots update automatically
6. Click a time slot to book
7. Enter name in prompt dialog
8. Booking sent to server
9. Slots refresh to show updated availability

---

## 📊 Page Flow Diagram

```
START: http://localhost:5000/
│
├─ HOME PAGE (/)
│  ├─ Header: Logo + "Log in" button
│  ├─ Services: "Cleaning Windows", "Cleaning Gutters"
│  └─ Placeholders: Image boxes
│
├─ Click "Log in" OR Click Service Box
│  ↓
├─ LOGIN PAGE (/login)
│  ├─ Username field
│  ├─ Password field
│  ├─ "Sign in" button
│  └─ "Home" button (returns to /)
│
├─ Valid credentials (client1/pass, emp1/pass, emp2/pass)
│  ↓
├─ CALENDAR PAGE (/calendar)
│  ├─ Service selector
│  ├─ Employee selector
│  ├─ Date picker
│  ├─ Time slots (updated dynamically)
│  └─ "Home" button (returns to /)
│
└─ Click "Home" anywhere → Back to HOME PAGE
```

---

## 🔗 API Endpoints Used

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/login` | POST | Authenticate user | `{username, password}` | `{success, role, name, id}` |
| `/api/employees` | GET | Get employee list | - | `[{id, name}, ...]` |
| `/api/availability` | GET | Get available slots | `?employee_id=X&date=Y` | `{slots: [{time, available}, ...]}` |
| `/api/book` | POST | Create booking | `{employee_id, date, time, client_name}` | `{success, booking_id}` |

---

## 🎨 CSS Enhancements

All buttons and interactive elements have:
- **Hover effects**: Color change and lift animation
- **Smooth transitions**: 0.3s ease on all changes
- **Focus states**: Blue glow on form inputs
- **Professional colors**: Blue theme throughout

```css
/* Service boxes get lift effect on hover */
.service-box:hover { 
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,82,163,0.15);
}

/* Time slots change color on hover */
.time-slot:hover { 
  background: var(--secondary-blue);
  color: #FFFFFF;
}

/* Form inputs get blue focus glow */
input:focus { 
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--tertiary-blue);
}
```

---

## ✅ Testing Checklist

- [x] Home page loads with all elements
- [x] Clicking "Log in" button goes to login page
- [x] Clicking service boxes goes to login page
- [x] Service boxes show hover effect
- [x] Login form validates empty fields
- [x] Login with `client1/pass` works
- [x] Login shows error on invalid credentials
- [x] Successful login redirects to calendar
- [x] Calendar loads employee list
- [x] Calendar shows available slots
- [x] Selecting date updates slots
- [x] Selecting employee updates slots
- [x] Clicking available slot opens booking
- [x] Booking saves successfully
- [x] Booked slots show as unavailable
- [x] Home button works on all pages

---

## 🚀 How to Add More Features

### Add new page:
1. Create HTML template in `/templates/newpage.html`
2. Add route in `app.py`: `@app.route('/newpage')`
3. Add navigation in `script.js`: `window.location.href = '/newpage'`

### Add new button:
```javascript
el('my-button').addEventListener('click', ()=>{
  // Your action here
});
```

### Add new API call:
```javascript
const res = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({...data})
});
const result = await res.json();
```

---

**Created**: February 22, 2026  
**Status**: Fully Functional ✅

