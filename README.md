# Request

本地接口调试程序。打开后是一张请求页：方法、地址、参数、请求头、请求体，点 Send 看响应。

请求由这个程序发出，不经过浏览器，因此没有跨域限制，也不需要联网。

## 安装 Go

需要 [Go](https://go.dev/dl/) 1.22 或更高版本。

先检查系统里有没有 Go。

macOS、Linux：

```bash
go version
```

Windows（PowerShell 或命令提示符）：

```powershell
go version
```

已经安装时会看到类似 `go version go1.22.0 darwin/arm64`，版本号需要是 1.22 或更高。如果提示找不到 `go` 命令，按对应系统安装。装完后关掉并重新打开终端，再执行一次 `go version`。

### macOS、Linux

macOS：打开 https://go.dev/dl/ ，Apple 芯片下载 `darwin-arm64.pkg`，Intel 芯片下载 `darwin-amd64.pkg`，双击安装。也可以用 Homebrew：

```bash
brew install go
```

Linux：在同一页面下载压缩包，常见 64 位是 `linux-amd64.tar.gz`，其他架构也在该页选择。先删掉旧安装，再解压到 `/usr/local`，并把 `go` 加进 `PATH`。文件名换成实际下载的包：

```bash
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.27.1.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
source ~/.profile
```

不要往已经存在的 `/usr/local/go` 里面解压，否则安装会不完整。

### Windows

打开 https://go.dev/dl/ ，下载 `windows-amd64.msi`（32 位系统用 `windows-386.msi`），双击按提示安装。安装程序会把 Go 写进 `PATH`。也可以用 winget：

```powershell
winget install GoLang.Go
```

## 运行

在这个目录执行：

```bash
go build -o request .
./request
```

浏览器会打开 `http://127.0.0.1:47321`。不想自动打开时：

```bash
./request -open=false
```

换端口：

```bash
./request -port 8088
```

开发时也可以不先编译：

```bash
go run . -open=false
```

Windows 可执行文件：

```bash
GOOS=windows GOARCH=amd64 go build -o request.exe .
```
