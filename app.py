from flask import Flask, jsonify, request, render_template, send_from_directory
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_FILE = 'bookings.json'

# Demo users and employees
DEMO_USERS = {
    'client1': {'password': 'pass', 'role': 'client', 'name': 'Client One', 'id': 'client1'},
    'emp1': {'password': 'pass', 'role': 'employee', 'name': 'Employee One', 'id': 'emp1'},
    'emp2': {'password': 'pass', 'role': 'employee', 'name': 'Employee Two', 'id': 'emp2'},
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

# Helpers
def generate_day_slots(start_hour=9, end_hour=16, step_minutes=30):
    slots = []
    t = datetime(2000,1,1,start_hour,0)
    end = datetime(2000,1,1,end_hour,0)
    while t <= end:
        slots.append(t.strftime('%H:%M'))
        t += timedelta(minutes=step_minutes)
    return slots

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
    # find booked times for that employee/date
    taken = {b['time'] for b in bookings if b['employee_id']==employee_id and b['date']==date}
    slots = [{'time':t, 'available': (t not in taken)} for t in day_slots]
    return jsonify({'employee_id': employee_id, 'date': date, 'slots': slots})

@app.route('/api/book', methods=['POST'])
def api_book():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    date = data.get('date')
    time = data.get('time')
    client_id = data.get('client_id')
    client_name = data.get('client_name')
    if not all([employee_id, date, time, client_name]):
        return jsonify({'success': False, 'error': 'missing fields'}), 400
    # validate date/time format
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except Exception:
        return jsonify({'success': False, 'error': 'invalid date format'}), 400
    # check if slot taken for employee
    for b in bookings:
        if b['employee_id']==employee_id and b['date']==date and b['time']==time:
            return jsonify({'success': False, 'error': 'slot already taken'}), 409
    # create booking id
    booking_id = 'b' + str(len(bookings)+1)
    booking = {
        'id': booking_id,
        'employee_id': employee_id,
        'client_id': client_id or '',
        'client_name': client_name,
        'date': date,
        'time': time
    }
    bookings.append(booking)
    save_bookings(bookings)
    return jsonify({'success': True, 'booking_id': booking_id})

@app.route('/api/bookings', methods=['GET'])
def api_bookings():
    # optional filters: employee_id, week_start (YYYY-MM-DD)
    employee_id = request.args.get('employee_id')
    week_start = request.args.get('week_start')
    results = bookings
    if employee_id:
        results = [b for b in results if b['employee_id']==employee_id]
    if week_start:
        try:
            ws = datetime.strptime(week_start, '%Y-%m-%d')
        except Exception:
            return jsonify({'error':'invalid week_start format'}), 400
        week_end = ws + timedelta(days=7)
        results = [b for b in results if ws.date() <= datetime.strptime(b['date'],'%Y-%m-%d').date() < week_end.date()]
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

