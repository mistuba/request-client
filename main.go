package main

import (
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func main() {
	port := flag.Int("port", 47321, "local port")
	open := flag.Bool("open", true, "open a browser window")
	window := flag.Bool("window", windowByFileName(os.Args[0]), "open in an application window")
	flag.Parse()

	ln, actual, err := listenLocal(*port)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", actual)
	fmt.Printf("本地请求调试已启动：%s\n", url)
	mux := newMux()
	if *window {
		go serve(ln, mux)
		if err := waitReady(ln.Addr().String()); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		if err := openAppWindow(url); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if *open {
		go func() {
			time.Sleep(200 * time.Millisecond)
			openBrowser(url)
		}()
	}
	serve(ln, mux)
}

func serve(ln net.Listener, handler http.Handler) {
	if err := http.Serve(ln, handler); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func waitReady(addr string) error {
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 100*time.Millisecond)
		if err == nil {
			conn.Close()
			return nil
		}
		time.Sleep(20 * time.Millisecond)
	}
	return fmt.Errorf("本地页面没有启动")
}

func windowByFileName(name string) bool {
	base := strings.ToLower(filepath.Base(name))
	base = strings.TrimSuffix(base, ".exe")
	return strings.Contains(base, "window")
}

func listenLocal(port int) (net.Listener, int, error) {
	if port < 0 || port > 65535 {
		return nil, 0, fmt.Errorf("invalid port %d", port)
	}
	if port == 0 {
		ln, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return nil, 0, err
		}
		return ln, ln.Addr().(*net.TCPAddr).Port, nil
	}
	var last error
	for p := port; p < port+20 && p <= 65535; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p))
		if err == nil {
			return ln, p, nil
		}
		last = err
	}
	return nil, 0, fmt.Errorf("no free port near %d: %w", port, last)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}
