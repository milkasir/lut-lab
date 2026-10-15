"""Start the private, local LUT LAB preview. Requires Python 3 only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 8765), partial(SimpleHTTPRequestHandler, directory=str(root)))
    except OSError:
        raise SystemExit('Port 8765 is in use. Close the earlier preview and try again.')
    url = 'http://127.0.0.1:8765/'
    print('LUT LAB preview: ' + url)
    print('Keep this window open. Press Ctrl+C to stop.')
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
