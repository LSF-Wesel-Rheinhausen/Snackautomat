import tkinter as tk
from threading import Thread
from worker import run  # Importieren der Ausführungslogik aus `worker`

# Globaler Zustand, um zu verfolgen, welche Reihen bereits ausgewählt wurden
selected_rows = {f"Row {i}": False for i in range(1, 13)}  # 12 Reihen


def handle_button_click(row):
    """
    Verarbeitet den Button-Klick für die ausgewählte Reihe.
    Startet einen neuen Thread, um den Worker `run` auszuführen.
    """
    if not selected_rows[row]:  # Ausführen, wenn die Reihe noch nicht verarbeitet wurde
        status_label.config(text=f"Processing {row}...")  # Status aktualisieren
        selected_rows[row] = True  # Markiere die Reihe als ausgewählt

        # Den Worker in einem separaten Thread ausführen
        worker_thread = Thread(target=worker_run_wrapper, args=(row,))
        worker_thread.start()


def worker_run_wrapper(row):
    """
    Wrapper für die Worker-Funktion.
    Aktualisiert die UI, nachdem die Aufgabe beendet wurde.
    """
    try:
        run(row)  # Aufrufen der Worker-Funktion
    except Exception as e:
        print(f"Error processing {row}: {e}")
    finally:
        # Sicheres Aktualisieren der GUI-Elemente nach der Bearbeitung (mit `after`)
        root.after(0, lambda: status_label.config(text=f"{row} has been processed successfully."))


def create_interface():
    """
    Erstellt die GUI mit tkinter, arrangiert die Buttons horizontal und startet im Vollbildmodus.
    """
    global root, status_label

    # Tkinter-Hauptfenster erstellen
    root = tk.Tk()
    root.title("Snack Row Controller")

    # Fenster in Vollbildmodus setzen
    root.attributes("-fullscreen", True)

    # Header-Label
    header = tk.Label(root, text="Snack Row Controller", font=("Arial", 16))
    header.pack(pady=20)

    # Frame für die horizontale Anordnung der Buttons
    button_frame = tk.Frame(root)
    button_frame.pack(pady=20)

    # Buttons für die 12 Reihen erstellen und horizontal anordnen
    for i in range(1, 13):
        row_name = f"Row {i}"
        button = tk.Button(
            button_frame,
            text=f"{row_name}",
            font=("Arial", 14),
            bg="lightblue",
            command=lambda row=row_name: handle_button_click(row),
            width=10,  # Breite des Buttons anpassen
        )
        button.pack(side="left", padx=5)  # Horizontal nebeneinander anordnen

    # Exit-Button (zum Beenden der Anwendung)
    exit_button = tk.Button(root, text="Exit", font=("Arial", 14), bg="lightgray", command=root.quit)
    exit_button.pack(pady=20)

    # Status-Label
    status_label = tk.Label(root, text="Select a row to activate.", font=("Arial", 12))
    status_label.pack(pady=20)

    # Tkinter-Hauptschleife starten
    root.mainloop()
