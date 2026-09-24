//go:build windows

package main

import (
	"fmt"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

func detachOwnConsole() {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	getList := kernel32.NewProc("GetConsoleProcessList")
	pids := make([]uint32, 16)
	n, _, _ := getList.Call(uintptr(unsafe.Pointer(&pids[0])), uintptr(len(pids)))
	// 从已有的 cmd / PowerShell 启动时，控制台里还有别的进程，保留窗口。
	// 双击打开时只有自己，脱离后关掉那个命令窗口不会结束页面。
	if n != 1 {
		return
	}
	hwnd, _, _ := kernel32.NewProc("GetConsoleWindow").Call()
	if hwnd != 0 {
		user32 := syscall.NewLazyDLL("user32.dll")
		user32.NewProc("ShowWindow").Call(hwnd, 0)
	}
	kernel32.NewProc("FreeConsole").Call()
}

func openAppWindow(url string) error {
	enableHighDPI()
	width, height := defaultWindowSize()
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title:  "请求",
			Width:  width,
			Height: height,
			IconId: 1,
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

func defaultWindowSize() (uint, uint) {
	var area struct {
		Left, Top, Right, Bottom int32
	}
	user32 := syscall.NewLazyDLL("user32.dll")
	spi := user32.NewProc("SystemParametersInfoW")
	const spiGetWorkArea = 0x0030
	r, _, _ := spi.Call(spiGetWorkArea, 0, uintptr(unsafe.Pointer(&area)), 0)
	if r == 0 || area.Right <= area.Left || area.Bottom <= area.Top {
		return 1440, 900
	}
	workW := int(area.Right - area.Left)
	workH := int(area.Bottom - area.Top)
	width := workW * 9 / 10
	height := workH * 9 / 10
	if width > workW-48 {
		width = workW - 48
	}
	if height > workH-48 {
		height = workH - 48
	}
	if width < 960 {
		width = workW
	}
	if height < 640 {
		height = workH
	}
	return uint(width), uint(height)
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
