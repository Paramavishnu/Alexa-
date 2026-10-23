# Alexa TrustLayer

A local hackathon simulation of an Alexa+ enhancement focused on verified actions, safe recovery, and user-approved persistent memory.

> This is an independent concept simulation. It is not an official Amazon product and does not connect to an Echo device or Alexa+.

## Features

- **Verified action:** The backend checks the simulated light's final state before reporting success.
- **Safe recovery:** In the default scenario, the first attempt fails and the idempotent ON command is retried once.
- **Failure honesty:** The unrecoverable scenario reports failure after two unsuccessful attempts.
- **Persistent, user-approved memory:** Preferences are saved in `data/memory.json` and survive refreshes/restarts.
- **Activity log:** The frontend displays backend-generated verification and recovery events.
- **No API key required:** Deterministic simulation makes the demo reliable and repeatable.

## Requirements

- Windows 10/11
- Python 3.10 or later
- A modern browser

## Run on Windows

Open PowerShell in the project folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

If PowerShell blocks activation, use this alternative without activating the environment:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Open http://127.0.0.1:5000 in your browser. Keep the terminal open while using the app. Press `Ctrl+C` in the terminal to stop it.

## Demo walkthrough

1. Open the app. The default scenario is **Failure → successful retry**.
2. Click **Run failure demo** or enter `Alexa, turn on the living room lights.`
3. Show the timeline: intent received → command sent → attempt 1 fails → safe retry → attempt 2 verified.
4. Switch to **Failure → retry also fails** and repeat. The app should honestly report that the light remains off.
5. Switch to **Normal success** and repeat.
6. In Saved memory, save `Instrumental music while studying`.
7. Ask `What music do I prefer while studying?` to retrieve the saved preference.
8. Refresh the page and repeat the memory query to demonstrate persistence.
9. Clear the preference and show that it is removed.

## Project structure

```text
alexa-trustlayer/
├── app.py
├── requirements.txt
├── README.md
├── data/
│   └── memory.json       # Created automatically after memory is saved
├── templates/
│   └── index.html
└── static/
    ├── app.js
    └── style.css
```

## Design notes

- The simulator uses deterministic outcomes so judges can reproduce the same behavior.
- Memory is stored locally in a JSON file. Do not store sensitive personal information in this demo.
- The memory toggle disables memory retrieval and editing in the UI. It does not delete stored preferences; use **Clear all** to delete them.
- The recovery action is limited to one retry. A real product should use device-specific status APIs, timeouts, permissions, and safety policies.
- This project demonstrates the *proposed behavior*, not a live Alexa+ integration or Amazon's internal architecture.

## Troubleshooting

- **`py` is not recognized:** Install Python from https://www.python.org/downloads/windows/ and enable the option to add Python to PATH, then reopen PowerShell.
- **Flask is missing:** Activate `.venv` and run `pip install -r requirements.txt`.
- **Port 5000 is in use:** Close the other application using it or change the port in the last line of `app.py`.
- **PowerShell activation blocked:** Use the no-activation commands above.
