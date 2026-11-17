# -*- coding: utf-8 -*-
"""TO YY · 月亮小站 专用服务器
由 启动小站.bat 自动调用，不用手动运行。
作用：本地起一个小服务，并禁止浏览器缓存页面，
保证你每次打开看到的都是最新版本。"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8642


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        with Server(("127.0.0.1", PORT), Handler) as httpd:
            print("Moon site: http://127.0.0.1:%d/index.html" % PORT)
            print("(close this window to stop the site)")
            httpd.serve_forever()
    except OSError:
        print("[X] Port %d is busy. Close the old server window and try again." % PORT)
        input("press Enter to close...")
