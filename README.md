# Request

本地接口调试程序。打开后是一张请求页：方法、地址、参数、请求头、请求体，点「发送」看响应。右上角可以在中文和英文之间切换，默认是中文。

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

有两种打开方式，页面是同一个：

- 浏览器：在系统浏览器里打开 `http://127.0.0.1:47321`
- 窗口：程序自己的窗口。目前只有 Windows 能用

页面已经打进可执行文件里。拿到文件的电脑不需要这份代码，也不需要安装 Go。程序只监听本机，别的电脑上的浏览器打不开这个地址。

### macOS、Linux

在这个目录执行：

```bash
go build -o request .
./request
```

浏览器会打开。不想自动打开时：

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

### 在 Windows 里编译

用 PowerShell 或命令提示符，进入这个目录：

```powershell
go build -o request.exe .
go build -ldflags "-H windowsgui" -o request-window.exe .
```

当前目录会得到两个文件，双击哪个就是哪种：

- `request.exe`：用浏览器打开
- `request-window.exe`：用自己的窗口打开。关掉窗口后程序退出

也可以只编译 `request.exe`，再用参数开窗口：

```powershell
.\request.exe -window
```

Windows 10/11 一般已经带了显示窗口用的 WebView2。窗口打不开时，安装 [WebView2 运行库](https://developer.microsoft.com/microsoft-edge/webview2/)。

下载依赖超时的话，先换国内代理，再重新编译：

```powershell
go env -w GOPROXY=https://goproxy.cn,direct
```

### 在 macOS、Linux 里编译 Windows 文件

本机是 macOS 或 Linux 时，也可以直接编出 Windows 用的文件，再拷到 Windows 上双击：

```bash
GOOS=windows GOARCH=amd64 go build -o request.exe .
GOOS=windows GOARCH=amd64 go build -ldflags "-H windowsgui" -o request-window.exe .
```

这两个 `.exe` 在 macOS、Linux 上不能运行。下载依赖超时同样先执行 `go env -w GOPROXY=https://goproxy.cn,direct`。
