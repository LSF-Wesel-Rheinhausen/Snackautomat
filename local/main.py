import tkinter as tk
from threading import Thread
from worker import run  # Import the run method from worker (your worker logic)

# Global state to track selected axes
selected_axes = {"X": False, "Y": False, "Z": False, "A": False}


# TODO: Add relay to stop shields that are not wanted so we activate board X and drive Axis Y of all boards but only
#  board X has power, so we have 3^4 axis = 12 Rows of Snacks

#Cant devide by board ID since they have no serial number. Need to cut power to other boards and than drive specific axis of all boards

def handle_button_click(axis):
    """
    Handles button clicks for axis selection.
    Spawns a new thread to call the worker's `run` method.
    """
    if not selected_axes[axis]:  # Only execute if the axis hasn't been processed yet
        status_label.config(text=f"Processing {axis} axis...")  # Update status
        selected_axes[axis] = True  # Mark axis as selected

        # Run the worker in a separate thread
        worker_thread = Thread(target=worker_run_wrapper, args=(axis,))
        worker_thread.start()


def worker_run_wrapper(axis):
    """
    Wrapper for the worker `run` method.
    Updates the UI after the worker's task starts.
    """
    try:
        run(axis)  # Call the worker's `run` function (your GRBL logic)
    except Exception as e:
        # Handle any exceptions gracefully
        print(f"Error processing {axis} axis: {e}")
    finally:
        # Use `after` to safely update GUI elements from the thread
        root.after(0, lambda: status_label.config(text=f"{axis} axis has been processed successfully."))


def create_interface():
    """
    Creates the touch-based interface using tkinter.
    """
    global root, status_label

    # Create the main tkinter window
    root = tk.Tk()
    root.title("GRBL Axis Control")
    root.geometry("300x500")  # Adjust window size to accommodate the A Axis button

    # Header label
    header = tk.Label(root, text="GRBL Axis Controller", font=("Arial", 16))
    header.pack(pady=20)

    # Buttons for each axis
    x_button = tk.Button(root, text="Move X-Axis", font=("Arial", 14), bg="lightblue",
                         command=lambda: handle_button_click("X"))
    x_button.pack(pady=10, fill="x", padx=20)

    y_button = tk.Button(root, text="Move Y-Axis", font=("Arial", 14), bg="lightgreen",
                         command=lambda: handle_button_click("Y"))
    y_button.pack(pady=10, fill="x", padx=20)

    z_button = tk.Button(root, text="Move Z-Axis", font=("Arial", 14), bg="lightcoral",
                         command=lambda: handle_button_click("Z"))
    z_button.pack(pady=10, fill="x", padx=20)

    a_button = tk.Button(root, text="Move A-Axis", font=("Arial", 14), bg="lightsalmon",
                         command=lambda: handle_button_click("A"))
    a_button.pack(pady=10, fill="x", padx=20)

    # Exit button (always enabled in this case)
    exit_button = tk.Button(root, text="Exit", font=("Arial", 14), bg="lightgray", command=root.quit)
    exit_button.pack(pady=20, fill="x", padx=20)

    # Status label
    status_label = tk.Label(root, text="Select each axis to move.", font=("Arial", 12))
    status_label.pack(pady=20)

    # Start tkinter main loop
    root.mainloop()


if __name__ == "__main__":
    create_interface()
