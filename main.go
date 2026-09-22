package main

import (
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"
)

func main() {
	port := flag.Int("port", 47321, "local port")
	open := flag.Bool("open", true, "open a browser window")
	flag.Parse()

	ln, actual, err := listenLocal(*port)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", actual)
	fmt.Printf("本地请求调试已启动：%s\n", url)
	if *open {
		go func() {
			time.Sleep(200 * time.Millisecond)
			openBrowser(url)
		}()
	}
	if err := http.Serve(ln, newMux()); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
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
