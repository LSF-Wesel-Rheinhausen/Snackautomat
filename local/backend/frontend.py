import logging
import tkinter as tk
from tkinter import filedialog, messagebox
from threading import Thread
from datetime import datetime


from api_caller import get_user_by_rfid  # Import the API caller method
from local.backend import api_caller
from worker import run  # Import the worker logic
import traceback

# Global state to track selected rows
selected_rows = {f"Row {i}": False for i in range(1, 13)}  # 12 rows

def handle_button_click(row):
    """Handle row selection and dispatch worker execution in background."""
    if not selected_rows[row]:  # Execute if the row has not been processed
        status_label.config(text=f"Processing {row}...")  # Update status
        selected_rows[row] = True  # Mark the row as selected

        # Execute the worker in a separate thread
        worker_thread = Thread(target=worker_run_wrapper, args=(row,))
        worker_thread.start()

def worker_run_wrapper(row):
    """Execute worker action and update UI status safely afterwards."""
    try:
        run(row)  # Call the worker function
    except Exception as e:
        print(f"Error processing {row}: {e}")
    finally:
        # Safely update the GUI elements after processing (with `after`)
        root.after(0, lambda: status_label.config(text=f"{row} has been processed successfully."))

def create_interface(firstname, lastname):
    """Render fullscreen vending UI for authenticated user."""
    global root, status_label

    # Create the main Tkinter window
    root = tk.Tk()
    root.title("Snack Row Controller")
    # Set the window to fullscreen mode
    root.attributes("-fullscreen", True)
    # Header label
    header = tk.Label(root, text="Snack Row Controller", font=("Arial", 16))
    header.pack(pady=20)
    header = tk.Label(root, text=f'Welcome {firstname} {lastname}', font=("Arial", 16))
    header.pack(pady=20)

    # Frame for horizontal button arrangement
    button_frame = tk.Frame(root)
    button_frame.pack(pady=20)

    # Create buttons for the 12 rows and arrange them horizontally
    for i in range(1, 13):
        try:
            product = api_caller.get_product(str(i))
            product = product.json()
            row_name = product['articleid']
        except Exception as e:
            logging.debug(f"Error getting product for row {i}: {e}")
            row_name = f"Placeholder Row {i}"
        button = tk.Button(
            button_frame,
            text=f"{row_name}",
            font=("Arial", 14),
            bg="lightblue",
            command=lambda row=row_name: handle_button_click(row),
            width=10,  # Adjust button width
        )
        button.pack(side="left", padx=5)  # Arrange horizontally

    # Exit button (to quit the application)
    exit_button = tk.Button(root, text="Exit", font=("Arial", 14), bg="lightgray", command=exit_to_login)
    exit_button.pack(pady=20)

    admin_button = tk.Button(root, text="Admin", font=("Arial", 14), bg="lightyellow", command=open_admin_window)
    admin_button.pack(pady=10)

    # Status label
    status_label = tk.Label(root, text="Select a row to activate.", font=("Arial", 12))
    status_label.pack(pady=20)

    # Start the Tkinter main loop
    root.mainloop()
def exit_to_login():
    """Close current interface and return to login screen."""
    root.destroy()  # Destroy the main window
    login()  # Open the login window again


def open_admin_window():
    """Open admin controls for backend mode switching and order export."""
    admin_window = tk.Toplevel(root)
    admin_window.title("Admin")
    admin_window.geometry("700x400")

    mode_var = tk.StringVar(value="Unbekannt")

    def refresh_mode():
        try:
            mode_response = api_caller.get_sales_backend_mode()
            mode_var.set(mode_response.get("mode", "Unbekannt"))
        except Exception as exc:
            mode_var.set("Fehler")
            messagebox.showerror("Fehler", f"Modus konnte nicht geladen werden: {exc}")

    def set_mode(mode: str):
        try:
            api_caller.set_sales_backend_mode(mode)
            refresh_mode()
            messagebox.showinfo("Erfolg", f"Modus wurde auf '{mode}' gesetzt.")
        except Exception as exc:
            messagebox.showerror("Fehler", f"Modus konnte nicht gesetzt werden: {exc}")

    def export_orders(output_format: str):
        from_date = from_entry.get().strip() or None
        to_date = to_entry.get().strip() or None
        memberid = memberid_entry.get().strip() or None
        now_stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = "csv" if output_format == "csv" else "json"
        file_path = filedialog.asksaveasfilename(
            title="Bestellungen exportieren",
            defaultextension=f".{ext}",
            filetypes=[(ext.upper(), f"*.{ext}"), ("All files", "*.*")],
            initialfile=f"orders_export_{now_stamp}.{ext}",
        )
        if not file_path:
            return
        try:
            response = api_caller.export_orders(
                output_format=output_format,
                from_date=from_date,
                to_date=to_date,
                memberid=memberid,
            )
            with open(file_path, "wb") as export_file:
                export_file.write(response.content)
            messagebox.showinfo("Erfolg", f"Export gespeichert: {file_path}")
        except Exception as exc:
            messagebox.showerror("Fehler", f"Export fehlgeschlagen: {exc}")

    tk.Label(admin_window, text="Sales Backend Modus", font=("Arial", 14, "bold")).pack(pady=10)
    tk.Label(admin_window, textvariable=mode_var, font=("Arial", 13)).pack(pady=5)

    mode_button_frame = tk.Frame(admin_window)
    mode_button_frame.pack(pady=8)
    tk.Button(mode_button_frame, text="Vereinsflieger", command=lambda: set_mode("vereinsflieger"), width=16).pack(side="left", padx=6)
    tk.Button(mode_button_frame, text="Local DB", command=lambda: set_mode("local_db"), width=16).pack(side="left", padx=6)
    tk.Button(mode_button_frame, text="Aktualisieren", command=refresh_mode, width=16).pack(side="left", padx=6)

    tk.Label(admin_window, text="Order Export Filter", font=("Arial", 14, "bold")).pack(pady=12)
    filter_frame = tk.Frame(admin_window)
    filter_frame.pack(pady=6)
    tk.Label(filter_frame, text="Von (YYYY-MM-DD)").grid(row=0, column=0, sticky="w")
    from_entry = tk.Entry(filter_frame, width=20)
    from_entry.grid(row=0, column=1, padx=5)
    tk.Label(filter_frame, text="Bis (YYYY-MM-DD)").grid(row=1, column=0, sticky="w")
    to_entry = tk.Entry(filter_frame, width=20)
    to_entry.grid(row=1, column=1, padx=5)
    tk.Label(filter_frame, text="Member ID").grid(row=2, column=0, sticky="w")
    memberid_entry = tk.Entry(filter_frame, width=20)
    memberid_entry.grid(row=2, column=1, padx=5)

    export_button_frame = tk.Frame(admin_window)
    export_button_frame.pack(pady=12)
    tk.Button(export_button_frame, text="Export JSON", width=16, command=lambda: export_orders("json")).pack(side="left", padx=8)
    tk.Button(export_button_frame, text="Export CSV", width=16, command=lambda: export_orders("csv")).pack(side="left", padx=8)

    refresh_mode()

def login():
    """Render login screen and start RFID-based authentication flow."""
    def attempt_login():
        rfid = rfid_entry.get()
        rfid = str(rfid)
        try:
            user_info = get_user_by_rfid(rfid)
            first_name = user_info.get("firstname")
            last_name = user_info.get("lastname")
            if first_name and last_name:
                login_window.destroy()
                create_interface(first_name,last_name)  # Proceed to the main interface
            else:
                login_status.config(text="Invalid RFID token. Please try again.")
        except:
            traceback.print_exc()

    login_window = tk.Tk()
    login_window.title("Login")
    login_window.attributes("-fullscreen", True)

    tk.Label(login_window, text="Enter RFID Token:", font=("Arial", 14)).pack(pady=10)
    rfid_entry = tk.Entry(login_window, font=("Arial", 14))
    rfid_entry.pack(pady=10)

    tk.Button(login_window, text="Login", font=("Arial", 14), command=attempt_login).pack(pady=10)
    login_status = tk.Label(login_window, text="", font=("Arial", 12))
    login_status.pack(pady=10)

    login_window.mainloop()

if __name__ == "__main__":
    login()
