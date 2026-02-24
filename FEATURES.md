# Website Features & Implementation Guide

## ✅ Completed Features

### 1. **Professional Blue Color Scheme**
A complete professional color palette has been implemented using CSS variables:
- **Primary Blue**: `#0052A3` - Main brand color
- **Primary Blue Light**: `#0066CC` - Interactive states
- **Primary Blue Dark**: `#003D7A` - Headers and emphasis
- **Secondary Blue**: `#4A90E2` - Accents
- **Tertiary Blue**: `#E8F1FF` - Background highlights
- **Light Blue**: `#F0F5FF` - Soft backgrounds

Files updated:
- `/static/styles.css` - Main stylesheet with professional colors
- `/styles.css` - Backup stylesheet with same color scheme

### 2. **Home Page**
The home page includes:
- **Header**: Professional navigation bar with "My Cleaning Business" branding and Log in button
- **Contact Information**: Business phone, email, and address displayed prominently
- **Services Section**: Two interactive service boxes:
  - Cleaning Windows
  - Cleaning Gutters
- **Picture Placeholders**: Three boxes where images can be added later

**Interactive Features**:
- Service boxes are clickable and navigate to login page
- Log in button navigates to login page on single click
- Hover effects with smooth transitions and visual feedback
- All elements styled with professional gradients and shadows

### 3. **Login Page**
The login page provides:
- **Form Fields**:
  - Username input with autocomplete
  - Password input with secure input type
- **Validation**:
  - Checks that both fields are filled
  - Shows error messages in red
- **Demo Users** (for testing):
  - `client1` / `pass` (Client role)
  - `emp1` / `pass` (Employee role)
  - `emp2` / `pass` (Employee role)
- **Navigation**:
  - "Home" button to return to homepage
  - Submit button to authenticate and navigate to calendar

**Flow**:
1. User clicks Log in button or service box on home page
2. Navigates to login page
3. Enters credentials
4. On successful authentication, redirected to calendar page
5. User info stored in sessionStorage for the session

### 4. **Calendar Page**
The calendar booking interface includes:
- **Service Selection**: Dropdown to choose between available services
- **Employee Selection**: Dropdown populated from the server with available employees
- **Date Picker**: Calendar input to select appointment date
- **Time Slots**: Available time slots displayed as buttons (9 AM to 4 PM, 30-min intervals)
- **Availability Tracking**:
  - Green slots for available times
  - Red "booked" status for unavailable times
  - Interactive selection with smooth transitions
- **Booking**: Click a time slot to enter your name and confirm booking
- **Confirmation Messages**: Success/error feedback displayed to user

### 5. **Navigation Flow**
```
Home Page (/)
    ↓ (Click Log in button or Service box)
Login Page (/login)
    ↓ (Enter credentials and submit)
Calendar Page (/calendar)
    ↓ (Back button)
Home Page (/)
```

## 📝 JavaScript Implementation

### `/static/script.js`
The main script handles navigation and interaction:

**Homepage Behavior**:
- Login button click → Navigate to `/login`
- Service box click → Navigate to `/login`
- Cursor changes to pointer on hover for better UX

**Login Page Behavior**:
- Form validation on submit
- POST request to `/api/login` with credentials
- Error handling with user-friendly messages
- Session storage of user info
- Navigation to `/calendar` on successful login
- Back button returns to home

**Calendar Page Behavior**:
- Loads available employees from `/api/employees`
- Fetches availability slots from `/api/availability`
- Renders time slots with availability status
- Handles booking requests via `/api/book` endpoint
- Dynamic slot updates after each action
- Responsive time slot display with proper styling

## 🎨 CSS Styling Features

### Professional Design Elements
1. **Gradients**: Subtle gradient backgrounds for depth
2. **Shadows**: Layered shadows for elevation and hierarchy
3. **Transitions**: Smooth hover effects on all interactive elements
4. **Typography**: Modern font stack with proper hierarchy
5. **Spacing**: Consistent padding and margins throughout
6. **Border Radius**: Modern rounded corners (6-10px)
7. **Focus States**: Blue glow effect on form inputs for accessibility

### Responsive Design
- Mobile-friendly layouts with flexbox wrapping
- Scales down gracefully on smaller screens (720px breakpoint)
- Touch-friendly button sizes
- Proper viewport settings

## 🔗 Backend API Endpoints

### `/api/login` (POST)
Authenticates user credentials
- **Request**: `{username: string, password: string}`
- **Response**: `{success: boolean, role: string, name: string, id: string}`
- **Error codes**: 401 for invalid credentials

### `/api/employees` (GET)
Returns list of available employees
- **Response**: `[{id: string, name: string}, ...]`

### `/api/availability` (GET)
Returns available time slots for an employee on a date
- **Params**: `employee_id`, `date` (YYYY-MM-DD format)
- **Response**: `{employee_id, date, slots: [{time, available: boolean}, ...]}`

### `/api/book` (POST)
Creates a new booking
- **Request**: `{employee_id, date, time, client_name}`
- **Response**: `{success: boolean, booking_id: string}`
- **Error codes**: 409 if slot already taken

### `/api/bookings` (GET)
Retrieves bookings with optional filters
- **Params**: `employee_id` (optional), `week_start` (optional)
- **Response**: List of booking objects

## 📋 Testing Instructions

### Running the Application
```bash
cd /Users/mihaelauntila/PycharmProjects/Prototype_BTM495
pip3 install -r requirements.txt
python3 app.py
```
Then navigate to `http://localhost:5000` in your browser.

### Testing the Flow
1. **Home Page**: 
   - View contact info and services
   - Hover over service boxes (notice interactive effect)
   - Click Log in button → should go to login page

2. **Login Page**:
   - Try logging in with demo credentials: `client1` / `pass`
   - Try invalid credentials to see error handling
   - Click Home button to return

3. **Calendar Page**:
   - Select different services and employees
   - Pick different dates
   - See availability update in real-time
   - Click a time slot to book (enter your name)
   - Confirm booking message appears

## 🎯 User Experience Improvements

1. **Visual Feedback**: Every interactive element has hover/focus states
2. **Error Messages**: Clear, readable error messages in red
3. **Loading States**: Smooth transitions between page loads
4. **Form Validation**: Client-side validation before submission
5. **Session Persistence**: User stays logged in during the session
6. **Time Zone**: Dates and times are in local timezone
7. **Accessibility**: Proper semantic HTML, focus indicators, color contrast

## 📱 Browser Compatibility

Tested and working on:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🔐 Security Notes (Demo Only)

⚠️ **This is a demonstration application**:
- Passwords stored in plain text (demo only)
- SessionStorage used (not production-safe)
- No HTTPS (use HTTPS in production)
- No CSRF protection implemented (add in production)
- No rate limiting on login attempts (add in production)

## 🚀 Future Enhancements

Potential features to add:
1. Employee dashboard to view assigned appointments
2. Manager view to manage all appointments and employees
3. Email notifications for bookings
4. Service-specific pricing
5. Calendar views (week/month views)
6. Appointment cancellation
7. Rescheduling functionality
8. Customer authentication/profile management
9. Service duration configuration
10. Business hours configuration

---

**Version**: 1.0  
**Last Updated**: February 22, 2026

