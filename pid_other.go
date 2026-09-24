//go:build !windows

package main

import (
	"os"
	"strconv"
	"strings"
	"syscall"
)

func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = proc.Signal(syscall.Signal(0))
	return err == nil
}

func processBaseName(pid int) string {
	target, err := os.Readlink("/proc/" + strconv.Itoa(pid) + "/exe")
	if err != nil {
		return ""
	}
	return target
}

func listenerPID(port int) int {
	data, err := os.ReadFile("/proc/net/tcp")
	if err != nil {
		return 0
	}
	inode := ""
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 10 {
			continue
		}
		local, foundInode := fields[1], fields[9]
		host, portHex, ok := strings.Cut(local, ":")
		if !ok || host != "0100007F" {
			continue
		}
		parsed, err := strconv.ParseUint(portHex, 16, 16)
		if err != nil || int(parsed) != port {
			continue
		}
		inode = foundInode
		break
	}
	if inode == "" || inode == "0" {
		return 0
	}
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return 0
	}
	needle := "socket:[" + inode + "]"
	for _, entry := range entries {
		pid, err := strconv.Atoi(entry.Name())
		if err != nil {
			continue
		}
		fds, err := os.ReadDir("/proc/" + entry.Name() + "/fd")
		if err != nil {
			continue
		}
		for _, fd := range fds {
			target, err := os.Readlink("/proc/" + entry.Name() + "/fd/" + fd.Name())
			if err == nil && target == needle {
				return pid
			}
		}
	}
	return 0
}
