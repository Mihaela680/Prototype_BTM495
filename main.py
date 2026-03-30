from app import app
from database import (
    init_db,
    migrate_bookings_json_once,
    reset_all_clients_data,
    seed_demo_data,
    seed_demo_unassigned_booking,
)


def bootstrap():
    init_db()
    seed_demo_data()
    migrate_bookings_json_once()
    reset_all_clients_data()
    seed_demo_unassigned_booking()


if __name__ == '__main__':
    bootstrap()
    app.run(debug=True, port=5001)
