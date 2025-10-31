import serial
from serial.tools import list_ports
#import RPi.gpio
from concurrent.futures import ThreadPoolExecutor

def relay(row):
    print(row)


def check_port_for_grbl(port, axis):
    """Attempt to connect to a specific port and check for GRBL response."""
    print(f"Checking port: {port.device}")
    try:
        with serial.Serial(port.device, baudrate=115200, timeout=2) as ser:
            # Read response from GRBL
            response = ser.readlines()
            if any(b"Grbl" in line for line in response):
                print(f"Connected to GRBL on port: {port.device}")
                try:
                    match axis:
                        case "1":
                            relay(1)
                            ser.write(b"$J=G21G91X0.8F60\r\n")
                        case "2":
                            relay(1)
                            ser.write(b"$J=G21G91Y0.8F60\r\n")
                        case "3":
                            relay(1)
                            ser.write(b"$J=G21G91Z0.8F60\r\n")
                        case "4":
                            relay(1)
                            ser.write(b"$J=G21G91A0.8F60\r\n")
                        case "5":
                            relay(2)
                            ser.write(b"$J=G21G91X0.8F60\r\n")
                        case "6":
                            relay(2)
                            ser.write(b"$J=G21G91Y0.8F60\r\n")
                        case "7":
                            relay(2)
                            ser.write(b"$J=G21G91Z0.8F60\r\n")
                        case "8":
                            relay(2)
                            ser.write(b"$J=G21G91A0.8F60\r\n")
                        case "9":
                            relay(3)
                            ser.write(b"$J=G21G91X0.8F60\r\n")
                        case "10":
                            relay(3)
                            ser.write(b"$J=G21G91Y0.8F60\r\n")
                        case "11":
                            relay(3)
                            ser.write(b"$J=G21G91Z0.8F60\r\n")
                        case "12":
                            relay(3)
                            ser.write(b"$J=G21G91A0.8F60\r\n")
                    if ser.readline() == b"ok\r\n":
                        print("Turned successfully")
                        ser.close()
                    else:
                        print("Failed to get response")
                        ser.close()
                        raise ConnectionError("Failed to get response from Arduino")
                except Exception as e:
                    print(e)
                return port.device  # Return the port if GRBL is detected
            else:
                print(f"Not a GRBL device: {port.device}")
                return None
    except Exception as e:
        print(f"Could not connect to {port.device}: {e}")
    return None


def find_and_connect_to_grbl(axis):
    """
    Finds and connects to a GRBL-compatible device on available COM ports
    and executes commands for the specified axis. Only ports containing
    'USB' or 'COM' in their name are checked.

    :param axis: The axis to send commands for (e.g., 'X', 'Y', etc.).
    :return: The first port where a GRBL device is found, or None if none are found.
    """
    # List all available COM ports
    ports = list_ports.comports()
    if not ports:
        print("No COM ports found.")
        return None

    # Filter ports to include only those containing 'USB' or 'COM'
    relevant_ports = [port for port in ports if "usb" in port.device.lower() or "com" in port.device.lower()]
    if not relevant_ports:
        print("No USB or COM ports found.")
        return None

    print(f"Found {len(relevant_ports)} relevant ports. Checking them in parallel for axis {axis}...")

    # Use ThreadPoolExecutor to check relevant ports in parallel
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(check_port_for_grbl, port, axis) for port in relevant_ports]

        # Wait for all tasks to complete and check results
        for future in futures:
            result = future.result()  # Blocks until the current thread finishes
            if result:
                print(f"GRBL device found on port: {result}")
                return result  # Return the first port with a GRBL device

    print("No GRBL device found.")
    return None
def run(axis):
    # Attempt to find and connect to GRBL
    print(f"Turning every {axis} Axis")
    grbl_port = find_and_connect_to_grbl(axis)
    if grbl_port:
        print("Connection successful!")
    else:
        print("Make sure the GRBL device is connected and powered on.")
