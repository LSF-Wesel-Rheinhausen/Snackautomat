import logging
import tkinter as tk
from threading import Thread


from api_caller import get_user_by_rfid  # Import the API caller method
import api_caller
from worker import run  # Import the worker logic
import traceback

# Global state to track selected rows
selected_rows = {f"Row {i}": False for i in range(1, 13)}  # 12 rows

def handle_button_click(row):
    if not selected_rows[row]:  # Execute if the row has not been processed
        status_label.config(text=f"Processing {row}...")  # Update status
        selected_rows[row] = True  # Mark the row as selected

        # Execute the worker in a separate thread
        worker_thread = Thread(target=worker_run_wrapper, args=(row,))
        worker_thread.start()

def worker_run_wrapper(row):
    try:
        run(row)  # Call the worker function
    except Exception as e:
        print(f"Error processing {row}: {e}")
    finally:
        # Safely update the GUI elements after processing (with `after`)
        root.after(0, lambda: status_label.config(text=f"{row} has been processed successfully."))

def create_interface(firstname, lastname):
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

    # Status label
    status_label = tk.Label(root, text="Select a row to activate.", font=("Arial", 12))
    status_label.pack(pady=20)

    # Start the Tkinter main loop
    root.mainloop()
def exit_to_login():
    root.destroy()  # Destroy the main window
    login()  # Open the login window again

def login():
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