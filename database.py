import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

DATA_FILE = 'bookings.json'
DB_FILE = 'west_island_windows.db'


# Demo users and employees (seeded into DB on startup)
DEMO_USERS = {
    'emp1': {'password': 'pass', 'role': 'employee', 'name': 'Employee One', 'id': 'emp1', 'birthdate': '1985-05-15', 'sin': '123-456-789'},
    'emp2': {'password': 'pass', 'role': 'employee', 'name': 'Employee Two', 'id': 'emp2', 'birthdate': '1990-10-20', 'sin': '987-654-321'},
    'emp3': {'password': 'pass', 'role': 'employee', 'name': 'Employee Three', 'id': 'emp3', 'birthdate': '1995-03-10', 'sin': '555-666-777'},
    'mgr1': {'password': 'pass', 'role': 'manager', 'name': 'Manager One', 'id': 'mgr1', 'birthdate': '1980-01-01', 'sin': '111-222-333'}
}


def utcnow():
    """Return current UTC time as ISO string (timezone-aware, deprecation-safe)."""
    return datetime.now(timezone.utc).isoformat()


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
                employee_id TEXT,
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

        cols = conn.execute("PRAGMA table_info(appointments)").fetchall()
        emp_col = next((c for c in cols if c['name'] == 'employee_id'), None)
        if emp_col and int(emp_col['notnull']) == 1:
            conn.executescript(
                '''
                ALTER TABLE appointments RENAME TO appointments_old;
                CREATE TABLE appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT,
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
                INSERT INTO appointments
                (id, employee_id, client_id, client_name, date, time, duration, status, email, phone, street, city, province, country, postal, notes, canceled_at, cancel_reason, created_at, updated_at)
                SELECT id, employee_id, client_id, client_name, date, time, duration, status, email, phone, street, city, province, country, postal, notes, canceled_at, cancel_reason, created_at, updated_at
                FROM appointments_old;
                DROP TABLE appointments_old;
                '''
            )

        appt_events_fk = conn.execute("PRAGMA foreign_key_list(appointment_events)").fetchall()
        bad_fk = any(row['table'] == 'appointments_old' for row in appt_events_fk)
        if bad_fk:
            conn.executescript(
                '''
                CREATE TABLE IF NOT EXISTS appointment_events_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    appointment_id INTEGER,
                    event_type TEXT NOT NULL,
                    event_time TEXT NOT NULL,
                    actor_role TEXT,
                    actor_id TEXT,
                    details_json TEXT,
                    FOREIGN KEY(appointment_id) REFERENCES appointments(id)
                );
                INSERT OR IGNORE INTO appointment_events_new
                    (id, appointment_id, event_type, event_time, actor_role, actor_id, details_json)
                SELECT id, appointment_id, event_type, event_time, actor_role, actor_id, details_json
                FROM appointment_events;
                DROP TABLE appointment_events;
                ALTER TABLE appointment_events_new RENAME TO appointment_events;
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


def reset_all_clients_data():
    with get_db() as conn:
        conn.execute('DELETE FROM appointment_events WHERE actor_role = ?', ('client',))
        conn.execute('DELETE FROM appointment_events WHERE actor_id IN (SELECT id FROM clients)')
        conn.execute('DELETE FROM appointments WHERE client_id IN (SELECT id FROM clients)')
        conn.execute("DELETE FROM users WHERE role='client'")
        conn.execute('DELETE FROM clients')


def seed_demo_unassigned_booking():
    now = utcnow()
    base_date = datetime.now().date() + timedelta(days=1)
    demo_jobs = [
        {
            'client_name': 'Demo Unassigned Client',
            'date': base_date.isoformat(),
            'time': '10:00',
            'duration': 60,
            'email': 'demo.unassigned@example.com',
            'phone': '(438) 000-0000',
            'street': '100 Demo Street',
            'city': 'Montreal',
            'province': 'Quebec',
            'country': 'Canada',
            'postal': 'H1A 1A1',
            'notes': 'Demo unassigned booking for manager assignment.'
        },
        {
            'client_name': 'Demo Condo Client',
            'date': (base_date + timedelta(days=1)).isoformat(),
            'time': '11:30',
            'duration': 90,
            'email': 'demo.condo@example.com',
            'phone': '(514) 111-2233',
            'street': '250 Lakeshore Road',
            'city': 'Dorval',
            'province': 'Quebec',
            'country': 'Canada',
            'postal': 'H9S 2B4',
            'notes': 'Condo window cleaning estimate awaiting manager assignment.'
        },
        {
            'client_name': 'Demo Storefront Client',
            'date': (base_date + timedelta(days=2)).isoformat(),
            'time': '14:00',
            'duration': 120,
            'email': 'demo.storefront@example.com',
            'phone': '(450) 222-3344',
            'street': '75 Market Avenue',
            'city': 'Pointe-Claire',
            'province': 'Quebec',
            'country': 'Canada',
            'postal': 'H9R 4S8',
            'notes': 'Storefront cleaning job pending employee assignment.'
        }
    ]

    with get_db() as conn:
        for job in demo_jobs:
            existing = conn.execute(
                '''
                SELECT id FROM appointments
                WHERE status='booked' AND employee_id IS NULL AND client_name=? AND date=? AND time=?
                LIMIT 1
                ''',
                (job['client_name'], job['date'], job['time'])
            ).fetchone()
            if existing:
                continue

            cur = conn.execute(
                '''
                INSERT INTO appointments
                (employee_id, client_id, client_name, date, time, duration, status, email, phone, street, city, province, country, postal, notes, created_at, updated_at)
                VALUES (NULL, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    None,
                    job['client_name'],
                    job['date'],
                    job['time'],
                    job['duration'],
                    job['email'],
                    job['phone'],
                    job['street'],
                    job['city'],
                    job['province'],
                    job['country'],
                    job['postal'],
                    job['notes'],
                    now,
                    now,
                )
            )
            appt_id = cur.lastrowid
            try:
                conn.execute(
                    '''
                    INSERT INTO appointment_events (appointment_id, event_type, event_time, actor_role, actor_id, details_json)
                    VALUES (?, 'created', ?, 'system', 'seed', ?)
                    ''',
                    (appt_id, now, json.dumps({'source': 'seed_demo_unassigned_booking'}))
                )
            except sqlite3.IntegrityError:
                pass

