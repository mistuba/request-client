#!/bin/sh
cd "$(dirname "$0")" || exit 1
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags "-H windowsgui" -o request.exe .
