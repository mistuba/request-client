//go:build !windows

package main

import "fmt"

func detachOwnConsole() {}

func openAppWindow(string) error {
	return fmt.Errorf("自己的窗口目前只提供 Windows 程序。在 Windows 上双击 request-window.exe，或运行 request.exe -window")
}
