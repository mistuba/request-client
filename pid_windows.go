//go:build windows

package main

import (
	"encoding/binary"
	"path/filepath"
	"syscall"
	"unsafe"
)

func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	const processQueryLimitedInformation = 0x1000
	handle, _, _ := kernel32.NewProc("OpenProcess").Call(processQueryLimitedInformation, 0, uintptr(pid))
	if handle == 0 {
		return false
	}
	kernel32.NewProc("CloseHandle").Call(handle)
	return true
}

func processBaseName(pid int) string {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	const processQueryLimitedInformation = 0x1000
	handle, _, _ := kernel32.NewProc("OpenProcess").Call(processQueryLimitedInformation, 0, uintptr(pid))
	if handle == 0 {
		return ""
	}
	defer kernel32.NewProc("CloseHandle").Call(handle)
	buf := make([]uint16, 1024)
	size := uint32(len(buf))
	r, _, _ := kernel32.NewProc("QueryFullProcessImageNameW").Call(handle, 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size)))
	if r == 0 {
		return ""
	}
	return filepath.Base(syscall.UTF16ToString(buf[:size]))
}

func listenerPID(port int) int {
	iphlpapi := syscall.NewLazyDLL("iphlpapi.dll")
	proc := iphlpapi.NewProc("GetExtendedTcpTable")
	var size uint32
	const afInet = 2
	const tcpTableOwnerPidListener = 3
	proc.Call(0, uintptr(unsafe.Pointer(&size)), 1, afInet, tcpTableOwnerPidListener, 0)
	if size == 0 {
		return 0
	}
	buf := make([]byte, size)
	r, _, _ := proc.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&size)), 1, afInet, tcpTableOwnerPidListener, 0)
	if r != 0 || len(buf) < 4 {
		return 0
	}
	count := binary.LittleEndian.Uint32(buf[:4])
	const rowSize = 24
	for i := uint32(0); i < count; i++ {
		off := 4 + int(i)*rowSize
		if off+rowSize > len(buf) {
			break
		}
		addr := binary.LittleEndian.Uint32(buf[off+4 : off+8])
		localPort := int(binary.BigEndian.Uint16(buf[off+8 : off+10]))
		pid := binary.LittleEndian.Uint32(buf[off+20 : off+24])
		if addr == 0x0100007f && localPort == port {
			return int(pid)
		}
	}
	return 0
}
