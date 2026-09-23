//go:build windows

package main

import (
	"fmt"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

func openAppWindow(url string) error {
	enableHighDPI()
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title:  "请求",
			Width:  1200,
			Height: 800,
			Center: true,
		},
	})
	if w == nil {
		err := fmt.Errorf("打不开应用窗口。请安装 Microsoft Edge WebView2 运行库后再试：https://developer.microsoft.com/microsoft-edge/webview2/")
		showWindowError(err.Error())
		return err
	}
	defer w.Destroy()
	w.Navigate(url)
	w.Run()
	return nil
}

func enableHighDPI() {
	user32 := syscall.NewLazyDLL("user32.dll")
	setCtx := user32.NewProc("SetProcessDpiAwarenessContext")
	if err := setCtx.Find(); err == nil {
		// DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
		if r, _, _ := setCtx.Call(^uintptr(3)); r != 0 {
			return
		}
	}
	shcore := syscall.NewLazyDLL("shcore.dll")
	setAwareness := shcore.NewProc("SetProcessDpiAwareness")
	if err := setAwareness.Find(); err == nil {
		// PROCESS_PER_MONITOR_DPI_AWARE = 2, S_OK = 0
		if r, _, _ := setAwareness.Call(2); r == 0 {
			return
		}
	}
	user32.NewProc("SetProcessDPIAware").Call()
}

func showWindowError(text string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	title, err := syscall.UTF16PtrFromString("请求")
	if err != nil {
		return
	}
	body, err := syscall.UTF16PtrFromString(text)
	if err != nil {
		return
	}
	proc.Call(0, uintptr(unsafe.Pointer(body)), uintptr(unsafe.Pointer(title)), 0x10)
}
