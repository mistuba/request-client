# Request

本地接口调试程序。打开后是一张请求页：方法、地址、参数、请求头、请求体，点 Send 看响应。

请求由这个程序发出，不经过浏览器，因此没有跨域限制，也不需要联网。

## 运行

需要安装 Go。在这个目录执行：

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
