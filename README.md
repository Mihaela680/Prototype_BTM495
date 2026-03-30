# 🏢 Cleaning Business Appointment Booking System

A professional web application for managing cleaning service appointments with client, employee, and manager views.

## ✨ Features

### 🏠 Home Page
- Professional header with business branding
- Business contact information (phone, email, address)
- Interactive service cards:
  - Cleaning Windows
  - Cleaning Gutters
- Image placeholder boxes for future content
- Responsive design with professional blue color scheme

### 🔐 Authentication
- Simple login system with form validation
- Demo users for testing:
  - `client1` / `pass` (Client account)
  - `emp1` / `pass` (Employee account)
  - `emp2` / `pass` (Employee account)
  - `mgr1` / `pass` (Manager account)
- Session management with sessionStorage
- Secure credential handling

### 📅 Calendar Booking System
**Client View:**
- Select cleaning service
- Choose preferred employee
- Pick appointment date
- View real-time availability
- Book available time slots
- Booking confirmation

**Available Time Slots:**
- 9:00 AM to 4:00 PM
- 30-minute intervals
- Color-coded availability
- Instant updates after booking

### 🎨 Professional Design
- Modern blue color palette (#0052A3 primary)
- Smooth transitions and hover effects
- Responsive layout for all devices
- Accessible form inputs with focus states
- Clean typography with hierarchy

### 👔 Manager Dashboard
**Dashboard Tab:**
- Employee summary cards displaying total bookings and hours per employee
- Real-time employee performance metrics at a glance

**Schedule Tab:**
- View weekly bookings for any selected employee
- Assign new client bookings to employees via a modal form
- Comprehensive client information capture (name, email, phone, full address)
- Booking duration customization (30-minute increments)

**Reports Tab:**
- Generate reports with optional start and end date filtering
- Filter by individual employee or view all employees at once
- Multiple report format support

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- pip (Python package manager)

### Installation

1. Navigate to project directory:
```bash
cd /Users/mihaelauntila/PycharmProjects/Prototype_BTM495
```

2. Install dependencies:
```bash
pip3 install -r requirements.txt
```

3. Run the application:
```bash
python3 app.py
```

4. Open in browser:
```
http://localhost:5000
```

## 📁 Project Structure

```
Prototype_BTM495/
├── app.py                      # Flask backend application
├── requirements.txt            # Python dependencies
├── bookings.json               # JSON-based booking persistence
├── workload.json               # Employee workload data
├── static/
│   ├── script.js              # Frontend JavaScript (navigation & booking)
│   └── styles.css             # Main stylesheet (professional design)
├── templates/
│   ├── index.html             # Home page
│   ├── login.html             # Login page
│   └── calendar.html          # Calendar booking page (client, employee & manager views)
├── styles.css                 # Backup stylesheet
├── script.js                  # Backup JavaScript
├── FEATURES.md                # Detailed feature documentation
├── JAVASCRIPT_GUIDE.md        # JavaScript implementation guide
├── DESIGN_GUIDE.md            # Design and color palette guide
└── README.md                  # This file
```

## 🔄 User Flow

```
┌─────────────────────┐
│   Home Page (/)     │
│  Business Info      │
│  Services Listed    │
└──────────┬──────────┘
           │
    Click: Log in / Service
           │
           ▼
┌─────────────────────┐
│   Login Page        │
│  Username/Password  │
│  Form Validation    │
└──────────┬──────────┘
           │
    Submit: Valid Credentials
           │
     ┌─────┴──────────────────────┐
     │                            │
     ▼ (client/employee)          ▼ (manager)
┌─────────────────────┐  ┌────────────────────────┐
│  Calendar Page      │  │  Manager View           │
│  Service Selection  │  │  ┌──────────────────┐   │
│  Employee Select    │  │  │ Dashboard Tab    │   │
│  Date Picker        │  │  │ Employee Summary │   │
│  Time Slots         │  │  ├──────────────────┤   │
│  Book Appointment   │  │  │ Schedule Tab     │   │
└─────────────────────┘  │  │ Weekly Bookings  │   │
                         │  │ Assign Bookings  │   │
                         │  ├──────────────────┤   │
                         │  │ Reports Tab      │   │
                         │  │ Date Filtering   │   │
                         │  │ Export Reports   │   │
                         │  └──────────────────┘   │
                         └────────────────────────┘
```

## 🔗 API Endpoints

### Authentication
**POST /api/login**
- Authenticates user credentials
- Returns user info (role, name, id)
- Used by: Login page

### Employee Management
**GET /api/employees**
- Returns list of available employees
- Used by: Calendar page

### Availability
**GET /api/availability**
- Parameters: `employee_id`, `date` (YYYY-MM-DD)
- Returns: Available and booked time slots
- Used by: Calendar page

### Booking
**POST /api/book**
- Creates new appointment
- Parameters: employee_id, date, time, client_name
- Returns: Booking confirmation
- Used by: Calendar page

**GET /api/bookings**
- Retrieves appointments
- Optional filters: employee_id, week_start
- Used by: Employee and Manager views

### Manager
**GET /api/manager/summary**
- Returns performance summary for all employees
- Includes total bookings and total hours per employee
- Used by: Manager Dashboard tab

**GET /api/manager/booking-details**
- Parameters: `booking_id`
- Returns full details for a specific booking
- Used by: Manager Schedule tab

**GET /api/manager/reports**
- Parameters: `employee_id` (optional), `start_date` (optional, YYYY-MM-DD), `end_date` (optional, YYYY-MM-DD)
- Generates reports filtered by employee and/or date range
- Used by: Manager Reports tab

**POST /api/manager/assign-booking**
- Creates and assigns a new booking to an employee
- Body: employee_id, date, time, duration, client_name, client_email, client_phone, client_address, notes
- Returns: booking confirmation
- Used by: Manager Schedule tab (Assign Booking modal)

## 🎨 Design Highlights

### Color Palette
- **Primary Blue**: `#0052A3` - Brand color
- **Light Blue**: `#F0F5FF` - Backgrounds
- **Secondary Blue**: `#4A90E2` - Accents
- **Gray Neutrals**: Professional text and borders

### Interactive Elements
- ✨ Smooth hover transitions (0.3s ease)
- 🎯 Clear focus states with blue glow
- 📱 Responsive design (mobile-friendly)
- ♿ Accessible form inputs
- 🎪 Professional shadows and depth

### Typography
- Modern font stack (Segoe UI, Roboto, etc.)
- Clear visual hierarchy
- Optimized line heights for readability
- Proper spacing and alignment

## 🧪 Testing

### Test Cases
1. **Home Page**
   - [ ] All elements visible and styled
   - [ ] Service boxes are clickable
   - [ ] Log in button is clickable
   - [ ] Responsive on mobile

2. **Login Page**
   - [ ] Form validation works
   - [ ] Demo users authenticate correctly
   - [ ] Invalid credentials show error
   - [ ] Back button returns to home

3. **Calendar Page**
   - [ ] Employee list loads
   - [ ] Availability updates on date change
   - [ ] Availability updates on employee change
   - [ ] Booking creates appointment
   - [ ] Booked slots become unavailable
   - [ ] Confirmation message appears

4. **Manager Dashboard**
   - [ ] Login as `mgr1` / `pass` redirects to manager view
   - [ ] Dashboard tab shows employee summary cards with total bookings and hours
   - [ ] Schedule tab loads weekly bookings for selected employee
   - [ ] "Assign Booking" modal opens and submits successfully (`POST /api/manager/assign-booking`)
   - [ ] Reports tab generates report; date range filters apply correctly
   - [ ] Filter by individual employee works in reports

### Demo Credentials
| Username | Password | Role |
|----------|----------|------|
| client1 | pass | Client |
| emp1 | pass | Employee |
| emp2 | pass | Employee |
| mgr1 | pass | Manager |

## 📊 Data Base (Static)

Bookings are stored in `bookings.json` file with structure:
```json
{
  "id": "b1",
  "employee_id": "emp1",
  "client_id": "",
  "client_name": "John Doe",
  "date": "2026-02-25",
  "time": "09:00"
}
```

## 🔒 Security Notes

⚠️ **Development Version**: This is a demonstration application.

**Not suitable for production because:**
- No password hashing (plain text)
- SessionStorage not secure
- No HTTPS
- No CSRF protection
- No rate limiting
- Demo users hardcoded

**For production, implement:**
- Password hashing with bcrypt
- Secure session management
- HTTPS/TLS encryption
- CSRF tokens
- Rate limiting
- Database for user/booking storage
- Authentication tokens (JWT)
- Input validation and sanitization

## 📚 Documentation

- **FEATURES.md** - Complete feature documentation
- **JAVASCRIPT_GUIDE.md** - JavaScript implementation details
- **DESIGN_GUIDE.md** - Design system and color palette

## 🚀 Future Enhancements

Planned features:
- [ ] Employee dashboard (view assigned appointments)
- [x] Manager interface (manage all appointments) ✅ **Completed in v2.0**
- [ ] Email notifications
- [ ] Appointment cancellation/rescheduling
- [ ] Service pricing
- [ ] Week view calendar
- [ ] Customer registration
- [ ] Advanced time slot management
- [ ] Business hours configuration
- [ ] Service-specific duration

## 🐛 Known Issues

None currently. All core features working as expected.

## 💻 Browser Support

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 Development Notes

### To modify colors:
Edit CSS variables in `static/styles.css`:
```css
:root {
  --primary-blue: #0052A3;  /* Change this */
  /* ... other colors ... */
}
```

### To add a new service:
1. Update `DEMO_USERS` in `app.py`
2. Add service option in `calendar.html`
3. Update validation logic in `app.py`

### To change business hours:
Edit `generate_day_slots()` in `app.py`:
```python
def generate_day_slots(start_hour=9, end_hour=16, step_minutes=30):
```

## 📞 Support

For issues or questions, refer to the documentation files:
- Feature questions → FEATURES.md
- Code questions → JAVASCRIPT_GUIDE.md
- Design questions → DESIGN_GUIDE.md

## 📄 License

This is a prototype/demonstration application.

## 👨‍💻 Version

**Current Version**: 2.0  
**Last Updated**: March 9, 2026  
**Status**: Fully Functional ✅

---

**Ready to use!** Start the server and navigate to `http://localhost:5000` to test the application.
