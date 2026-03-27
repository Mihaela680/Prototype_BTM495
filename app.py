from flask import Flask, jsonify, request, render_template, send_from_directory
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_FILE = 'bookings.json'
DB_FILE = 'west_island_windows.db'


def utcnow():
    """Return current UTC time as ISO string (timezone-aware, deprecation-safe)."""
    return datetime.now(timezone.utc).isoformat()

# Demo users and employees (seeded into DB on startup)
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
    'emp3': {'password': 'pass', 'role': 'employee', 'name': 'Employee Three', 'id': 'emp3', 'birthdate': '1995-03-10', 'sin': '555-666-777'},
    'mgr1': {'password': 'pass', 'role': 'manager', 'name': 'Manager One', 'id': 'mgr1', 'birthdate': '1980-01-01', 'sin': '111-222-333'}
}

def openBooking():
    pass


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript(
            '''
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('client','employee','manager')),
                display_name TEXT NOT NULL,
                ref_id TEXT
            );

            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('employee','manager')),
                birthdate TEXT,
                sin TEXT,
                workload_hours INTEGER DEFAULT 40,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                street TEXT,
                city TEXT,
                province TEXT,
                country TEXT,
                postal_code TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT NOT NULL,
                client_id TEXT,
                client_name TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                duration INTEGER NOT NULL DEFAULT 60,
                status TEXT NOT NULL DEFAULT 'booked' CHECK(status IN ('booked','canceled','completed')),
                email TEXT,
                phone TEXT,
                street TEXT,
                city TEXT,
                province TEXT,
                country TEXT,
                postal TEXT,
                notes TEXT,
                canceled_at TEXT,
                cancel_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(employee_id) REFERENCES employees(id)
            );

            CREATE TABLE IF NOT EXISTS appointment_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER,
                event_type TEXT NOT NULL,
                event_time TEXT NOT NULL,
                actor_role TEXT,
                actor_id TEXT,
                details_json TEXT,
                FOREIGN KEY(appointment_id) REFERENCES appointments(id)
            );

            CREATE TABLE IF NOT EXISTS employee_availability (
                employee_id TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                PRIMARY KEY(employee_id, date, time),
                FOREIGN KEY(employee_id) REFERENCES employees(id)
            );
            '''
        )


def seed_demo_data():
    now = utcnow()
    with get_db() as conn:
        for username, user in DEMO_USERS.items():
            conn.execute(
                '''
                INSERT INTO users (username, password, role, display_name, ref_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(username) DO UPDATE SET
                    password=excluded.password,
                    role=excluded.role,
                    display_name=excluded.display_name,
                    ref_id=excluded.ref_id
                ''',
                (username, user['password'], user['role'], user.get('name', username), user.get('id'))
            )

            if user['role'] in ('employee', 'manager'):
                conn.execute(
                    '''
                    INSERT INTO employees (id, name, role, birthdate, sin, workload_hours, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name=excluded.name,
                        role=excluded.role,
                        birthdate=excluded.birthdate,
                        sin=excluded.sin,
                        updated_at=excluded.updated_at
                    ''',
                    (user['id'], user.get('name', user['id']), user['role'], user.get('birthdate'), user.get('sin'), 40, now, now)
                )

            if user['role'] == 'client':
                conn.execute(
                    '''
                    INSERT INTO clients (id, full_name, email, phone, street, city, province, country, postal_code, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        full_name=excluded.full_name,
                        email=excluded.email,
                        phone=excluded.phone,
                        street=excluded.street,
                        city=excluded.city,
                        province=excluded.province,
                        country=excluded.country,
                        postal_code=excluded.postal_code,
                        updated_at=excluded.updated_at
                    ''',
                    (
                        user['id'], user.get('name', user['id']), user.get('email', ''), user.get('phone', ''),
                        user.get('street', ''), user.get('city', ''), user.get('province', ''), user.get('country', ''),
                        user.get('postal', ''), now, now
                    )
                )


def migrate_bookings_json_once():
    if not os.path.exists(DATA_FILE):
        return
    with get_db() as conn:
        marker = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").fetchone()
        if not marker:
            conn.execute('CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
        done = conn.execute("SELECT value FROM migration_meta WHERE key='bookings_json_migrated'").fetchone()
        if done and done['value'] == '1':
            return

        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                legacy = json.load(f)
        except Exception:
            legacy = []

        for b in legacy:
            employee_id = b.get('employee_id')
            if not employee_id:
                continue
            emp = conn.execute('SELECT id FROM employees WHERE id=?', (employee_id,)).fetchone()
            if not emp:
                continue

            now = utcnow()
            client_id = b.get('client_id') or None
            client_name = b.get('client_name') or 'Client'
            if client_id:
                conn.execute(
                    '''
                    INSERT OR IGNORE INTO clients (id, full_name, email, phone, street, city, province, country, postal_code, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        client_id, client_name, b.get('email', ''), b.get('phone', ''), b.get('street', ''), b.get('city', ''),
                        b.get('province', ''), b.get('country', ''), b.get('postal', ''), now, now
                    )
                )

            exists = conn.execute(
                '''
                SELECT id FROM appointments
                WHERE employee_id=? AND date=? AND time=? AND client_name=?
                ''',
                (employee_id, b.get('date'), b.get('time'), client_name)
            ).fetchone()
            if exists:
                continue

            cur = conn.execute(
                '''
                INSERT INTO appointments
                (employee_id, client_id, client_name, date, time, duration, status, email, phone, street, city, province, country, postal, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    employee_id, client_id, client_name, b.get('date'), b.get('time'), int(b.get('duration', 60)),
                    b.get('email', ''), b.get('phone', ''), b.get('street', ''), b.get('city', ''), b.get('province', ''),
                    b.get('country', ''), b.get('postal', ''), b.get('notes', ''), now, now
                )
            )
            appt_id = cur.lastrowid
            conn.execute(
                '''
                INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
                VALUES (?, 'created', ?, 'migration', 'system', ?)
                ''',
                (appt_id, now, json.dumps({'source': 'bookings.json', 'legacy_id': b.get('id', '')}))
            )

        conn.execute(
            "INSERT INTO migration_meta (key, value) VALUES ('bookings_json_migrated', '1') ON CONFLICT(key) DO UPDATE SET value='1'"
        )


def generate_day_slots(start_hour=9, end_hour=16, step_minutes=30):
    slots = []
    t = datetime(2000, 1, 1, start_hour, 0)
    end = datetime(2000, 1, 1, end_hour, 0)
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


def _conflict_exists(conn, employee_id, date, time, duration, ignore_id=None):
    start_time = datetime.strptime(time, '%H:%M')
    end_time = start_time + timedelta(minutes=int(duration))
    rows = conn.execute(
        '''
        SELECT id, time, duration FROM appointments
        WHERE employee_id=? AND date=? AND status='booked'
        ''',
        (employee_id, date)
    ).fetchall()
    for r in rows:
        if ignore_id and int(r['id']) == int(ignore_id):
            continue
        booking_start = datetime.strptime(r['time'], '%H:%M')
        booking_end = booking_start + timedelta(minutes=int(r['duration'] or 60))
        if start_time < booking_end and end_time > booking_start:
            return True
    return False


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


@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)


def _is_manager(actor_id):
    """Check whether a given employee id has manager role in the DB."""
    with get_db() as conn:
        row = conn.execute("SELECT role FROM employees WHERE id=?", (actor_id,)).fetchone()
    return bool(row and row['role'] == 'manager')


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    with get_db() as conn:
        user = conn.execute(
            'SELECT username, password, role, display_name, ref_id FROM users WHERE username=?',
            (username,)
        ).fetchone()
    if not user or user['password'] != password:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

    db_role = user['role']
    # Expose only two actor types to the frontend: 'client' and 'employee'.
    # Manager is a special employee — signal it via is_manager flag.
    is_manager = db_role == 'manager'
    response_role = 'client' if db_role == 'client' else 'employee'

    return jsonify({
        'success': True,
        'role': response_role,
        'is_manager': is_manager,
        'name': user['display_name'],
        'id': user['ref_id'] or user['username']
    })


@app.route('/api/employees', methods=['GET'])
def api_employees():
    with get_db() as conn:
        rows = conn.execute("SELECT id, name FROM employees WHERE is_active=1 ORDER BY id").fetchall()
    return jsonify([{'id': r['id'], 'name': r['name']} for r in rows])


@app.route('/api/availability', methods=['GET'])
def api_availability():
    employee_id = request.args.get('employee_id')
    date = request.args.get('date')
    if not employee_id or not date:
        return jsonify({'error': 'employee_id and date required'}), 400
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except Exception:
        return jsonify({'error': 'invalid date format, use YYYY-MM-DD'}), 400

    day_slots = generate_day_slots()
    with get_db() as conn:
        custom = conn.execute(
            'SELECT time FROM employee_availability WHERE employee_id=? AND date=? ORDER BY time',
            (employee_id, date)
        ).fetchall()
        available_times = set([r['time'] for r in custom]) if custom else set(day_slots)

        taken_slots = set()
        rows = conn.execute(
            "SELECT time, duration FROM appointments WHERE employee_id=? AND date=? AND status='booked'",
            (employee_id, date)
        ).fetchall()
        for r in rows:
            booking_start = datetime.strptime(r['time'], '%H:%M')
            booking_end = booking_start + timedelta(minutes=int(r['duration'] or 60))
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
    duration = data.get('duration', 60)

    if not all([employee_id, date, time, client_name]):
        return jsonify({'success': False, 'error': 'missing fields'}), 400
    try:
        datetime.strptime(date, '%Y-%m-%d')
        datetime.strptime(time, '%H:%M')
        duration = int(duration)
    except Exception:
        return jsonify({'success': False, 'error': 'invalid date/time/duration format'}), 400

    now = utcnow()
    with get_db() as conn:
        if _conflict_exists(conn, employee_id, date, time, duration):
            return jsonify({'success': False, 'error': 'time slot conflict'}), 409

        if client_id:
            conn.execute(
                '''
                INSERT INTO clients (id, full_name, email, phone, street, city, province, country, postal_code, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    full_name=excluded.full_name,
                    email=excluded.email,
                    phone=excluded.phone,
                    street=excluded.street,
                    city=excluded.city,
                    province=excluded.province,
                    country=excluded.country,
                    postal_code=excluded.postal_code,
                    updated_at=excluded.updated_at
                ''',
                (
                    client_id, client_name, data.get('email', ''), data.get('phone', ''), data.get('street', ''),
                    data.get('city', ''), data.get('province', ''), data.get('country', ''), data.get('postal', ''), now, now
                )
            )

        cur = conn.execute(
            '''
            INSERT INTO appointments
            (employee_id, client_id, client_name, date, time, duration, status, email, phone, street, city, province, country, postal, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                employee_id, client_id, client_name, date, time, duration, data.get('email', ''), data.get('phone', ''),
                data.get('street', ''), data.get('city', ''), data.get('province', ''), data.get('country', ''),
                data.get('postal', ''), data.get('notes', ''), now, now
            )
        )
        appt_id = cur.lastrowid
        conn.execute(
            '''
            INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
            VALUES (?, 'created', ?, ?, ?, ?)
            ''',
            (appt_id, now, data.get('actor_role', 'client'), data.get('actor_id', client_id or ''), json.dumps({'source': 'api_book'}))
        )

    return jsonify({'success': True, 'booking_id': f'b{appt_id}'})


@app.route('/api/bookings', methods=['GET'])
def api_bookings():
    employee_id = request.args.get('employee_id')
    week_start = request.args.get('week_start')
    client_id = request.args.get('client_id')

    query = "SELECT * FROM appointments WHERE status='booked'"
    params = []
    if employee_id:
        query += ' AND employee_id=?'
        params.append(employee_id)
    if client_id:
        query += ' AND client_id=?'
        params.append(client_id)

    with get_db() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()

    results = [dict(r) for r in rows]
    for r in results:
        r['id'] = f"b{r['id']}"

    if week_start:
        try:
            ws = datetime.strptime(week_start, '%Y-%m-%d')
        except Exception:
            return jsonify({'error': 'invalid week_start format'}), 400
        week_end = ws + timedelta(days=7)
        results = [b for b in results if ws.date() <= datetime.strptime(b['date'], '%Y-%m-%d').date() < week_end.date()]

    return jsonify(results)


@app.route('/api/client-profile', methods=['GET'])
def api_client_profile():
    client_id = request.args.get('client_id')
    if not client_id:
        return jsonify({'error': 'client_id required'}), 400

    with get_db() as conn:
        client = conn.execute('SELECT * FROM clients WHERE id=?', (client_id,)).fetchone()
        if not client:
            return jsonify({'error': 'client not found'}), 404

        rows = conn.execute(
            "SELECT * FROM appointments WHERE client_id=? AND status='booked' ORDER BY date, time",
            (client_id,)
        ).fetchall()

    bookings = [dict(r) for r in rows]
    for b in bookings:
        b['id'] = f"b{b['id']}"

    return jsonify({
        'success': True,
        'profile': {
            'name': client['full_name'],
            'email': client['email'],
            'phone': client['phone'],
            'street': client['street'],
            'city': client['city'],
            'province': client['province'],
            'country': client['country'],
            'postal': client['postal_code']
        },
        'bookings': bookings
    })


@app.route('/api/cancel-booking', methods=['POST'])
def api_cancel_booking():
    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    if not booking_id:
        return jsonify({'success': False, 'error': 'booking_id required'}), 400

    db_id = int(str(booking_id).replace('b', '')) if str(booking_id).startswith('b') else int(booking_id)
    now = utcnow()
    with get_db() as conn:
        row = conn.execute('SELECT id FROM appointments WHERE id=?', (db_id,)).fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'booking not found'}), 404

        conn.execute(
            "UPDATE appointments SET status='canceled', canceled_at=?, cancel_reason=?, updated_at=? WHERE id=?",
            (now, data.get('reason', ''), now, db_id)
        )
        conn.execute(
            '''
            INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
            VALUES (?, 'canceled', ?, ?, ?, ?)
            ''',
            (db_id, now, data.get('actor_role', 'client'), data.get('actor_id', ''), json.dumps({'reason': data.get('reason', '')}))
        )

    return jsonify({'success': True, 'message': 'booking cancelled'})


@app.route('/api/update-booking', methods=['POST'])
def api_update_booking():
    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    new_date = data.get('date')
    new_time = data.get('time')

    if not booking_id or not new_date or not new_time:
        return jsonify({'success': False, 'error': 'booking_id, date, time required'}), 400

    try:
        datetime.strptime(new_date, '%Y-%m-%d')
        datetime.strptime(new_time, '%H:%M')
    except Exception:
        return jsonify({'success': False, 'error': 'invalid date/time format'}), 400

    db_id = int(str(booking_id).replace('b', '')) if str(booking_id).startswith('b') else int(booking_id)
    now = utcnow()

    with get_db() as conn:
        booking = conn.execute('SELECT * FROM appointments WHERE id=?', (db_id,)).fetchone()
        if not booking:
            return jsonify({'success': False, 'error': 'booking not found'}), 404

        if _conflict_exists(conn, booking['employee_id'], new_date, new_time, booking['duration'], ignore_id=db_id):
            return jsonify({'success': False, 'error': 'time slot conflict'}), 409

        conn.execute(
            'UPDATE appointments SET date=?, time=?, updated_at=? WHERE id=?',
            (new_date, new_time, now, db_id)
        )
        conn.execute(
            '''
            INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
            VALUES (?, 'updated', ?, ?, ?, ?)
            ''',
            (db_id, now, data.get('actor_role', 'client'), data.get('actor_id', ''), json.dumps({'date': new_date, 'time': new_time}))
        )

    return jsonify({'success': True, 'message': 'booking updated'})


@app.route('/api/employee-profile', methods=['GET'])
def api_employee_profile():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id required'}), 400

    with get_db() as conn:
        user = conn.execute('SELECT * FROM employees WHERE id=?', (employee_id,)).fetchone()
    if not user:
        return jsonify({'error': 'employee not found'}), 404

    return jsonify({
        'success': True,
        'profile': {
            'id': user['id'],
            'name': user['name'],
            'role': user['role'],
            'birthdate': user['birthdate'],
            'sin': user['sin']
        }
    })


@app.route('/api/get-availability', methods=['GET'])
def api_get_availability():
    employee_id = request.args.get('employee_id')
    date = request.args.get('date')
    if not employee_id or not date:
        return jsonify({'error': 'employee_id and date required'}), 400

    with get_db() as conn:
        rows = conn.execute(
            'SELECT time FROM employee_availability WHERE employee_id=? AND date=? ORDER BY time',
            (employee_id, date)
        ).fetchall()
    times = [r['time'] for r in rows]
    return jsonify({'employee_id': employee_id, 'date': date, 'times': times})


@app.route('/api/set-availability', methods=['POST'])
def api_set_availability():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    date = data.get('date')
    times = data.get('times', [])
    if not employee_id or not date:
        return jsonify({'success': False, 'error': 'employee_id and date required'}), 400

    with get_db() as conn:
        conn.execute('DELETE FROM employee_availability WHERE employee_id=? AND date=?', (employee_id, date))
        for t in times:
            conn.execute(
                'INSERT OR IGNORE INTO employee_availability (employee_id, date, time) VALUES (?, ?, ?)',
                (employee_id, date, t)
            )
    return jsonify({'success': True})


@app.route('/api/get-workload', methods=['GET'])
def api_get_workload():
    employee_id = request.args.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id required'}), 400

    with get_db() as conn:
        row = conn.execute('SELECT workload_hours FROM employees WHERE id=?', (employee_id,)).fetchone()
    hours = row['workload_hours'] if row else 40
    return jsonify({'employee_id': employee_id, 'hours': hours})


@app.route('/api/set-workload', methods=['POST'])
def api_set_workload():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    hours = data.get('hours')
    if not employee_id or hours is None:
        return jsonify({'success': False, 'error': 'employee_id and hours required'}), 400

    with get_db() as conn:
        conn.execute('UPDATE employees SET workload_hours=?, updated_at=? WHERE id=?', (int(hours), utcnow(), employee_id))
    return jsonify({'success': True})


@app.route('/api/select-schedule', methods=['POST'])
def api_select_schedule():
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    template = data.get('template')
    if not employee_id or not template:
        return jsonify({'success': False, 'error': 'employee_id and template required'}), 400

    from datetime import date
    today = date.today()
    with get_db() as conn:
        for i in range(7):
            d = (today + timedelta(days=i)).isoformat()
            if template == 'standard':
                times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
            elif template == 'part-time':
                times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']
            elif template == 'weekend':
                if (today + timedelta(days=i)).weekday() >= 5:
                    times = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30']
                else:
                    times = []
            else:
                times = []

            conn.execute('DELETE FROM employee_availability WHERE employee_id=? AND date=?', (employee_id, d))
            for t in times:
                conn.execute(
                    'INSERT OR IGNORE INTO employee_availability (employee_id, date, time) VALUES (?, ?, ?)',
                    (employee_id, d, t)
                )
    return jsonify({'success': True})


@app.route('/api/manager/summary', methods=['GET'])
def api_manager_summary():
    summary = {}
    with get_db() as conn:
        employees = conn.execute("SELECT id, name FROM employees WHERE is_active=1 ORDER BY id").fetchall()
        for emp in employees:
            rows = conn.execute(
                "SELECT duration, id, client_name, date, time, employee_id FROM appointments WHERE employee_id=? AND status='booked'",
                (emp['id'],)
            ).fetchall()
            emp_bookings = [dict(r) for r in rows]
            for b in emp_bookings:
                b['id'] = f"b{b['id']}"
            total_minutes = sum(int(b.get('duration', 60)) for b in emp_bookings)
            summary[emp['id']] = {
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

    db_id = int(str(booking_id).replace('b', '')) if str(booking_id).startswith('b') else int(booking_id)
    with get_db() as conn:
        booking = conn.execute('SELECT * FROM appointments WHERE id=?', (db_id,)).fetchone()
    if not booking:
        return jsonify({'error': 'booking not found'}), 404

    out = dict(booking)
    out['id'] = f"b{out['id']}"
    return jsonify({'success': True, 'booking': out})


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

    with get_db() as conn:
        rows = conn.execute("SELECT * FROM appointments WHERE status='booked'").fetchall()
    bookings = [dict(r) for r in rows]
    for b in bookings:
        b['id'] = f"b{b['id']}"

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

    try:
        datetime.strptime(date, '%Y-%m-%d')
        datetime.strptime(time, '%H:%M')
        duration = int(duration)
    except Exception:
        return jsonify({'success': False, 'error': 'invalid time/duration format'}), 400

    now = utcnow()
    with get_db() as conn:
        if _conflict_exists(conn, employee_id, date, time, duration):
            return jsonify({'success': False, 'error': 'time slot conflict'}), 409

        cur = conn.execute(
            '''
            INSERT INTO appointments
            (employee_id, client_id, client_name, date, time, duration, status, email, phone, street, city, province, country, postal, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                employee_id, data.get('client_id') or None, client_name, date, time, duration,
                data.get('email', ''), data.get('phone', ''), data.get('street', ''), data.get('city', ''),
                data.get('province', ''), data.get('country', ''), data.get('postal', ''), data.get('notes', ''),
                now, now
            )
        )
        appt_id = cur.lastrowid
        conn.execute(
            '''
            INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
            VALUES (?, 'assigned', ?, 'manager', ?, ?)
            ''',
            (appt_id, now, data.get('actor_id', ''), json.dumps({'source': 'manager_assign'}))
        )

    return jsonify({'success': True, 'booking_id': f'b{appt_id}'})


@app.route('/api/manager/create-employee', methods=['POST'])
def api_manager_create_employee():
    data = request.get_json() or {}
    actor_id = data.get('actor_id', '')

    # Only a manager may create employee profiles
    if not _is_manager(actor_id):
        return jsonify({'success': False, 'error': 'Unauthorized: only managers can create employee profiles'}), 403

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    employee_id = data.get('employee_id', '').strip()
    name = data.get('name', '').strip()
    birthdate = data.get('birthdate', '').strip()
    sin = data.get('sin', '').strip()
    workload_hours = int(data.get('workload_hours', 40))

    if not all([username, password, employee_id, name]):
        return jsonify({'success': False, 'error': 'username, password, employee_id and name are required'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400

    now = utcnow()
    with get_db() as conn:
        existing_user = conn.execute('SELECT username FROM users WHERE username=?', (username,)).fetchone()
        if existing_user:
            return jsonify({'success': False, 'error': 'Username already exists'}), 409

        existing_emp = conn.execute('SELECT id FROM employees WHERE id=?', (employee_id,)).fetchone()
        if existing_emp:
            return jsonify({'success': False, 'error': 'Employee ID already exists'}), 409

        conn.execute(
            '''
            INSERT INTO employees (id, name, role, birthdate, sin, workload_hours, is_active, created_at, updated_at)
            VALUES (?, ?, 'employee', ?, ?, ?, 1, ?, ?)
            ''',
            (employee_id, name, birthdate or None, sin or None, workload_hours, now, now)
        )
        conn.execute(
            '''
            INSERT INTO users (username, password, role, display_name, ref_id)
            VALUES (?, ?, 'employee', ?, ?)
            ''',
            (username, password, name, employee_id)
        )
        conn.execute(
            '''
            INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
            VALUES (NULL, 'employee_created', ?, 'manager', ?, ?)
            ''',
            (now, actor_id, json.dumps({'employee_id': employee_id, 'name': name, 'username': username}))
        )

    return jsonify({
        'success': True,
        'message': f'Employee profile created. Login credentials: {username} / {password}',
        'employee_id': employee_id,
        'username': username
    })


@app.route('/api/manager/list-employees', methods=['GET'])
def api_manager_list_employees():
    actor_id = request.args.get('actor_id', '')
    if not _is_manager(actor_id):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    with get_db() as conn:
        rows = conn.execute(
            "SELECT e.id, e.name, e.role, e.birthdate, e.sin, e.workload_hours, e.is_active, u.username FROM employees e LEFT JOIN users u ON u.ref_id=e.id ORDER BY e.id"
        ).fetchall()

    employees = []
    for r in rows:
        employees.append({
            'id': r['id'],
            'name': r['name'],
            'role': r['role'],
            'birthdate': r['birthdate'],
            'sin': r['sin'],
            'workload_hours': r['workload_hours'],
            'is_active': bool(r['is_active']),
            'username': r['username']
        })
    return jsonify({'success': True, 'employees': employees})


init_db()
seed_demo_data()
migrate_bookings_json_once()

if __name__ == '__main__':
    app.run(debug=True, port=5000)

