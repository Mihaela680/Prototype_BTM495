from flask import Flask, jsonify, request, render_template, send_from_directory
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_FILE = 'bookings.json'
AVAILABILITY_FILE = 'availability.json'
WORKLOAD_FILE = 'workload.json'

# Demo users and employees
DEMO_USERS = {
    'client1': {
        'password': 'pass',
        'role': 'client',
        'name': 'John Doe',
        'id': 'client1',
        'email': 'john.doe@example.com',
        'phone': '(438) 123-4567',
        'street': '123 Main Street',
        'city': 'Montreal',
        'province': 'Quebec',
        'country': 'Canada',
        'postal': 'H1A 1A1'
    },
    'emp1': {'password': 'pass', 'role': 'employee', 'name': 'Employee One', 'id': 'emp1', 'birthdate': '1985-05-15', 'sin': '123-456-789'},
    'emp2': {'password': 'pass', 'role': 'employee', 'name': 'Employee Two', 'id': 'emp2', 'birthdate': '1990-10-20', 'sin': '987-654-321'},
    'mgr1': {'password': 'pass', 'role': 'manager', 'name': 'Manager One', 'id': 'mgr1'}
}

EMPLOYEES = [
    {'id': 'emp1', 'name': 'Employee One'},
    {'id': 'emp2', 'name': 'Employee Two'},
]

# bookings: list of {id, employee_id, client_id, client_name, date (YYYY-MM-DD), time (HH:MM)}
def load_bookings():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_bookings(bookings):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(bookings, f, indent=2)

bookings = load_bookings()

def load_availability():
    if not os.path.exists(AVAILABILITY_FILE):
        return {}
    with open(AVAILABILITY_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return {}

def save_availability(avail):
    with open(AVAILABILITY_FILE, 'w', encoding='utf-8') as f:
        json.dump(avail, f, indent=2)

def load_workload():
    if not os.path.exists(WORKLOAD_FILE):
        return {}
    with open(WORKLOAD_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return {}

def save_workload(wl):
    with open(WORKLOAD_FILE, 'w', encoding='utf-8') as f:
        json.dump(wl, f, indent=2)

availability = load_availability()
workload = load_workload()

# Helpers
def generate_day_slots(start_hour=9, end_hour=16, step_minutes=30):
    slots = []
    t = datetime(2000,1,1,start_hour,0)
    end = datetime(2000,1,1,end_hour,0)
    while t <= end:
        slots.append(t.strftime('%H:%M'))
        t += timedelta(minutes=step_minutes)
    return slots

def _parse_yyyy_mm_dd(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except Exception:
        return None

def _manager_report(bookings_list, employee_id=None, start_date=None, end_date=None):
    filtered = bookings_list
    if employee_id:
        filtered = [b for b in filtered if b.get('employee_id') == employee_id]
    if start_date:
        filtered = [b for b in filtered if _parse_yyyy_mm_dd(b.get('date')) and _parse_yyyy_mm_dd(b.get('date')) >= start_date]
    if end_date:
        filtered = [b for b in filtered if _parse_yyyy_mm_dd(b.get('date')) and _parse_yyyy_mm_dd(b.get('date')) <= end_date]

    by_employee = {}
    by_day = {}
    total_minutes = 0
    for b in filtered:
        emp = b.get('employee_id', 'unknown')
        day = b.get('date', 'unknown')
        by_employee[emp] = by_employee.get(emp, 0) + 1
        by_day[day] = by_day.get(day, 0) + 1
        try:
            total_minutes += int(b.get('duration', 60))
        except Exception:
            total_minutes += 60

    return {
        'total_bookings': len(filtered),
        'total_hours': round(total_minutes / 60.0, 2),
        'by_employee': by_employee,
        'by_day': by_day,
        'bookings': filtered
    }

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/calendar')
def calendar_page():
    return render_template('calendar.html')

@app.route('/manager')
def manager_dashboard_page():
    return render_template('manager_dashboard.html')

@app.route('/manager/reports')
def manager_reports_page():
    return render_template('manager_reports.html')

# Serve static (flask will do this by default, but keep explicit helper)
@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# API
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username','')
    password = data.get('password','')
    user = DEMO_USERS.get(username)
    if not user or user.get('password') != password:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    return jsonify({'success': True, 'role': user['role'], 'name': user['name'], 'id': user['id']})

@app.route('/api/employees', methods=['GET'])
def api_employees():
    return jsonify(EMPLOYEES)

@app.route('/api/availability', methods=['GET'])
def api_availability():
    # expects employee_id and date (YYYY-MM-DD)
    employee_id = request.args.get('employee_id')
    date = request.args.get('date')
    if not employee_id or not date:
        return jsonify({'error':'employee_id and date required'}), 400
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except Exception:
        return jsonify({'error':'invalid date format, use YYYY-MM-DD'}), 400
    day_slots = generate_day_slots()

    # Get employee's available times for the date
    emp_avail = availability.get(employee_id, {})
    available_times = set(emp_avail.get(date, day_slots))  # if no availability set, assume all slots

    # Find booked times for that employee/date (considering duration)
    taken_slots = set()
    for b in bookings:
        if b['employee_id'] == employee_id and b['date'] == date:
            # Mark this slot and any overlapping slots as taken
            booking_start = datetime.strptime(b['time'], '%H:%M')
            booking_duration = b.get('duration', 60)
            booking_end = booking_start + timedelta(minutes=int(booking_duration))

            # Mark all 30-min slots that overlap with this booking as taken
            for slot_time in day_slots:
                slot_start = datetime.strptime(slot_time, '%H:%M')
                slot_end = slot_start + timedelta(minutes=30)
                if slot_start < booking_end and slot_end > booking_start:
                    taken_slots.add(slot_time)

    slots = [{'time': t, 'available': (t in available_times and t not in taken_slots)} for t in day_slots]
    return jsonify({'employee_id': employee_id, 'date': date, 'slots': slots})

@app.route('/api/book', methods=['POST'])
def api_book():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    date = data.get('date')
    time = data.get('time')
    client_id = data.get('client_id')
    client_name = data.get('client_name')
    duration = data.get('duration', 60)  # default 60 minutes

    if not all([employee_id, date, time, client_name]):
        return jsonify({'success': False, 'error': 'missing fields'}), 400
    # validate date/time format
    try:
        datetime.strptime(date, '%Y-%m-%d')
        datetime.strptime(time, '%H:%M')
    except Exception:
        return jsonify({'success': False, 'error': 'invalid date/time format'}), 400

    # Convert time and duration to check for conflicts
    try:
        start_time = datetime.strptime(time, '%H:%M')
        end_time = start_time + timedelta(minutes=int(duration))
    except Exception:
        return jsonify({'success': False, 'error': 'invalid duration'}), 400

    # check if slot taken for employee (considering duration)
    for b in bookings:
        if b['employee_id'] == employee_id and b['date'] == date:
            booking_start = datetime.strptime(b['time'], '%H:%M')
            booking_duration = b.get('duration', 60)
            booking_end = booking_start + timedelta(minutes=int(booking_duration))

            # Check for time overlap
            if start_time < booking_end and end_time > booking_start:
                return jsonify({'success': False, 'error': 'time slot conflict'}), 409

    # create booking id
    booking_id = 'b' + str(len(bookings)+1)
    booking = {
        'id': booking_id,
        'employee_id': employee_id,
        'client_id': client_id or '',
        'client_name': client_name,
        'date': date,
        'time': time,
        'duration': int(duration),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'street': data.get('street', ''),
        'city': data.get('city', ''),
        'province': data.get('province', ''),
        'country': data.get('country', ''),
        'postal': data.get('postal', ''),
        'notes': data.get('notes', '')
    }
    bookings.append(booking)
    save_bookings(bookings)
    return jsonify({'success': True, 'booking_id': booking_id})

@app.route('/api/bookings', methods=['GET'])
def api_bookings():
    # optional filters: employee_id, week_start (YYYY-MM-DD), client_id
    employee_id = request.args.get('employee_id')
    week_start = request.args.get('week_start')
    client_id = request.args.get('client_id')
    results = bookings
    if employee_id:
        results = [b for b in results if b['employee_id']==employee_id]
    if client_id:
        results = [b for b in results if b['client_id']==client_id]
    if week_start:
        try:
            ws = datetime.strptime(week_start, '%Y-%m-%d')
        except Exception:
            return jsonify({'error':'invalid week_start format'}), 400
        week_end = ws + timedelta(days=7)
        results = [b for b in results if ws.date() <= datetime.strptime(b['date'],'%Y-%m-%d').date() < week_end.date()]
    return jsonify(results)

@app.route('/api/client-profile', methods=['GET'])
def api_client_profile():
    # Get client profile and their bookings
    client_id = request.args.get('client_id')
    if not client_id:
        return jsonify({'error': 'client_id required'}), 400

    user = DEMO_USERS.get(client_id)
    if not user or user.get('role') != 'client':
        return jsonify({'error': 'client not found'}), 404

    # Get client's bookings
    client_bookings = [b for b in bookings if b['client_id'] == client_id or b.get('client_id') == client_id]

    return jsonify({
        'success': True,
        'profile': {
            'name': user.get('name'),
            'email': user.get('email'),
            'phone': user.get('phone'),
            'street': user.get('street'),
            'city': user.get('city'),
            'province': user.get('province'),
            'country': user.get('country'),
            'postal': user.get('postal')
        },
        'bookings': client_bookings
    })

@app.route('/api/cancel-booking', methods=['POST'])
def api_cancel_booking():
    data = request.get_json() or {}
    booking_id = data.get('booking_id')

    global bookings
    booking = next((b for b in bookings if b['id'] == booking_id), None)
    if not booking:
        return jsonify({'success': False, 'error': 'booking not found'}), 404

    bookings = [b for b in bookings if b['id'] != booking_id]
    save_bookings(bookings)
    return jsonify({'success': True, 'message': 'booking cancelled'})

@app.route('/api/update-booking', methods=['POST'])
def api_update_booking():
    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    new_date = data.get('date')
    new_time = data.get('time')

    booking = next((b for b in bookings if b['id'] == booking_id), None)
    if not booking:
        return jsonify({'success': False, 'error': 'booking not found'}), 404

    # Validate new date/time
    try:
        datetime.strptime(new_date, '%Y-%m-%d')
        datetime.strptime(new_time, '%H:%M')
    except Exception:
        return jsonify({'success': False, 'error': 'invalid date/time format'}), 400

    # Check for conflicts with new time
    employee_id = booking['employee_id']
    booking_duration = booking.get('duration', 60)
    start_time = datetime.strptime(new_time, '%H:%M')
    end_time = start_time + timedelta(minutes=int(booking_duration))

    for b in bookings:
        if b['id'] != booking_id and b['employee_id'] == employee_id and b['date'] == new_date:
            booking_start = datetime.strptime(b['time'], '%H:%M')
            existing_duration = b.get('duration', 60)
            booking_end = booking_start + timedelta(minutes=int(existing_duration))

            if start_time < booking_end and end_time > booking_start:
                return jsonify({'success': False, 'error': 'time slot conflict'}), 409

    # Update booking
    booking['date'] = new_date
    booking['time'] = new_time
    save_bookings(bookings)
    return jsonify({'success': True, 'message': 'booking updated'})

@app.route('/api/employee-profile', methods=['GET'])
def api_employee_profile():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id required'}), 400

    user = DEMO_USERS.get(employee_id)
    if not user or user.get('role') != 'employee':
        return jsonify({'error': 'employee not found'}), 404

    return jsonify({
        'success': True,
        'profile': {
            'id': user.get('id'),
            'name': user.get('name'),
            'role': user.get('role'),
            'birthdate': user.get('birthdate'),
            'sin': user.get('sin')
        }
    })

@app.route('/api/get-availability', methods=['GET'])
def api_get_availability():
    employee_id = request.args.get('employee_id')
    date = request.args.get('date')
    if not employee_id or not date:
        return jsonify({'error': 'employee_id and date required'}), 400

    emp_avail = availability.get(employee_id, {})
    times = emp_avail.get(date, [])
    return jsonify({'employee_id': employee_id, 'date': date, 'times': times})

@app.route('/api/set-availability', methods=['POST'])
def api_set_availability():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    date = data.get('date')
    times = data.get('times', [])
    if not employee_id or not date:
        return jsonify({'success': False, 'error': 'employee_id and date required'}), 400

    if employee_id not in availability:
        availability[employee_id] = {}
    availability[employee_id][date] = times
    save_availability(availability)
    return jsonify({'success': True})

@app.route('/api/get-workload', methods=['GET'])
def api_get_workload():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id required'}), 400

    hours = workload.get(employee_id, 40)
    return jsonify({'employee_id': employee_id, 'hours': hours})

@app.route('/api/set-workload', methods=['POST'])
def api_set_workload():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    hours = data.get('hours')
    if not employee_id or hours is None:
        return jsonify({'success': False, 'error': 'employee_id and hours required'}), 400

    workload[employee_id] = int(hours)
    save_workload(workload)
    return jsonify({'success': True})

@app.route('/api/select-schedule', methods=['POST'])
def api_select_schedule():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    template = data.get('template')
    if not employee_id or not template:
        return jsonify({'success': False, 'error': 'employee_id and template required'}), 400

    # For simplicity, set availability for next 7 days based on template
    from datetime import date
    today = date.today()
    for i in range(7):
        d = (today + timedelta(days=i)).isoformat()
        if template == 'standard':
            times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
        elif template == 'part-time':
            times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']
        elif template == 'weekend':
            if (today + timedelta(days=i)).weekday() >= 5:  # Sat or Sun
                times = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30']
            else:
                times = []
        else:
            times = []

        if employee_id not in availability:
            availability[employee_id] = {}
        availability[employee_id][d] = times
    save_availability(availability)
    return jsonify({'success': True})

@app.route('/api/manager/summary', methods=['GET'])
def api_manager_summary():
    summary = {}
    for emp in EMPLOYEES:
        emp_id = emp['id']
        emp_bookings = [b for b in bookings if b['employee_id'] == emp_id]
        total_minutes = sum(int(b.get('duration', 60)) for b in emp_bookings)
        summary[emp_id] = {
            'name': emp['name'],
            'total_bookings': len(emp_bookings),
            'total_hours': round(total_minutes / 60.0, 2),
            'bookings': emp_bookings
        }
    return jsonify(summary)

@app.route('/api/manager/booking-details', methods=['GET'])
def api_manager_booking_details():
    booking_id = request.args.get('booking_id')
    if not booking_id:
        return jsonify({'error': 'booking_id required'}), 400

    booking = next((b for b in bookings if b['id'] == booking_id), None)
    if not booking:
        return jsonify({'error': 'booking not found'}), 404

    return jsonify({'success': True, 'booking': booking})

@app.route('/api/manager/reports', methods=['GET'])
def api_manager_reports():
    employee_id = request.args.get('employee_id')
    start_raw = request.args.get('start_date')
    end_raw = request.args.get('end_date')
    report_format = request.args.get('format', 'json')

    start_date = _parse_yyyy_mm_dd(start_raw)
    end_date = _parse_yyyy_mm_dd(end_raw)

    if start_raw and not start_date:
        return jsonify({'success': False, 'error': 'invalid start_date format, use YYYY-MM-DD'}), 400
    if end_raw and not end_date:
        return jsonify({'success': False, 'error': 'invalid end_date format, use YYYY-MM-DD'}), 400
    if start_date and end_date and start_date > end_date:
        return jsonify({'success': False, 'error': 'start_date must be <= end_date'}), 400

    report = _manager_report(bookings, employee_id=employee_id, start_date=start_date, end_date=end_date)
    report['success'] = True
    report['format'] = report_format
    return jsonify(report)

@app.route('/api/manager/assign-booking', methods=['POST'])
def api_manager_assign_booking():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    client_name = data.get('client_name')
    date = data.get('date')
    time = data.get('time')
    duration = data.get('duration', 60)

    if not all([employee_id, client_name, date, time]):
        return jsonify({'success': False, 'error': 'missing required fields'}), 400

    # Check for conflicts
    try:
        start_time = datetime.strptime(time, '%H:%M')
        end_time = start_time + timedelta(minutes=int(duration))
    except Exception:
        return jsonify({'success': False, 'error': 'invalid time/duration format'}), 400

    for b in bookings:
        if b['employee_id'] == employee_id and b['date'] == date:
            booking_start = datetime.strptime(b['time'], '%H:%M')
            booking_duration = b.get('duration', 60)
            booking_end = booking_start + timedelta(minutes=int(booking_duration))
            if start_time < booking_end and end_time > booking_start:
                return jsonify({'success': False, 'error': 'time slot conflict'}), 409

    booking_id = 'b' + str(len(bookings)+1)
    booking = {
        'id': booking_id,
        'employee_id': employee_id,
        'client_id': '',
        'client_name': client_name,
        'date': date,
        'time': time,
        'duration': int(duration),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'street': data.get('street', ''),
        'city': data.get('city', ''),
        'province': data.get('province', ''),
        'country': data.get('country', ''),
        'postal': data.get('postal', ''),
        'notes': data.get('notes', '')
    }
    bookings.append(booking)
    save_bookings(bookings)
    return jsonify({'success': True, 'booking_id': booking_id})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

