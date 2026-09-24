package main

import (
	"net"
	"os"
	"os/exec"
	"testing"
	"time"
)

func TestListenerPID(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := ln.Addr().(*net.TCPAddr).Port
	if got := listenerPID(port); got != os.Getpid() {
		t.Fatalf("listener pid %d, want %d", got, os.Getpid())
	}
}

func TestStopKillsBrowserAndLeavesWindow(t *testing.T) {
	root := t.TempDir()
	instanceRoot = root
	stopScanPort = 0
	t.Cleanup(func() {
		instanceRoot = ""
		stopScanPort = 47321
	})

	browser := exec.Command("sleep", "30")
	if err := browser.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = browser.Process.Kill() })
	window := exec.Command("sleep", "30")
	if err := window.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = window.Process.Kill() })

	writeWindowPIDFile(window.Process.Pid)
	if err := os.WriteFile(instancePath(), []byte(`{"pid":`+itoa(browser.Process.Pid)+`,"port":0}`), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := stopRunning(); err != nil {
		t.Fatal(err)
	}
	done := make(chan struct{})
	go func() {
		_, _ = browser.Process.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("browser process still running")
	}
	if !processAlive(window.Process.Pid) {
		t.Fatal("window process was stopped")
	}
}

func writeWindowPIDFile(pid int) {
	path := windowPIDPath(pid)
	_ = os.MkdirAll(instanceDir(), 0o755)
	_ = os.WriteFile(path, []byte(`{"pid":`+itoa(pid)+`}`), 0o644)
}

func itoa(n int) string {
	return strconvItoa(n)
}

func strconvItoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func TestStopDoesNothingWhenOnlyWindowRuns(t *testing.T) {
	root := t.TempDir()
	instanceRoot = root
	stopScanPort = 0
	t.Cleanup(func() {
		instanceRoot = ""
		stopScanPort = 47321
	})
	window := exec.Command("sleep", "30")
	if err := window.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = window.Process.Kill() })
	if err := os.MkdirAll(instanceDir(), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(instancePath(), []byte(`{"pid":`+itoa(window.Process.Pid)+`,"port":0}`), 0o644); err != nil {
		t.Fatal(err)
	}
	writeWindowPIDFile(window.Process.Pid)
	time.Sleep(20 * time.Millisecond)
	if err := stopRunning(); err == nil {
		t.Fatal("expected no background server")
	}
	if !processAlive(window.Process.Pid) {
		t.Fatal("window process was stopped")
	}
}
