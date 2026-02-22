UML Diagram - Simple Static Site

Files:
- index.html : single-page layout with absolutely positioned boxes
- styles.css : styling and fixed desktop positions
- script.js : draws SVG lines between elements' centers

How to view:
1. Open `index.html` in a web browser (double-click or:)
   - macOS: open index.html
2. The diagram is static but the JS redraws connections on resize.

Notes:
- This is intentionally minimal for an assignment. You can add hover tooltips or make boxes draggable if needed.

## Run the demo Flask app

1. Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Start the server:

```bash
python app.py
```

3. Open `http://127.0.0.1:5000/` in your browser.

Demo credentials:
- client1 / pass (client)
- emp1 / pass (employee)
- emp2 / pass (employee)

Notes:
- Bookings are stored in `bookings.json` in the project root (simple JSON persistence).
- The homepage shows business contact details and service boxes; double-click the "Log in" button to go to the login page.
