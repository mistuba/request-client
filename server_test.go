package main

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func postSend(t *testing.T, in sendInput) (int, apiResponse) {
	t.Helper()
	b, err := json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/send", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	handleSend(rec, req)
	var out apiResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("status %d body %s err %v", rec.Code, rec.Body.String(), err)
	}
	return rec.Code, out
}

func TestForwardGetQueryAndHeader(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("method %s", r.Method)
		}
		if r.URL.Query().Get("page") != "2" || r.URL.Query().Get("q") != "a b" {
			t.Errorf("query %s", r.URL.RawQuery)
		}
		if r.Header.Get("X-Debug") != "yes" {
			t.Errorf("header %q", r.Header.Get("X-Debug"))
		}
		if r.Header.Get("User-Agent") != "Request/1.0" {
			t.Errorf("ua %q", r.Header.Get("User-Agent"))
		}
		w.Header().Add("Set-Cookie", "a=1")
		w.Header().Add("Set-Cookie", "b=2")
		w.Header().Set("X-Reply", "ok")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"ok":true,"html":"<b>"}`))
	}))
	defer up.Close()

	code, out := postSend(t, sendInput{
		Method: "GET",
		URL:    up.URL + "/items?page=2&q=a+b",
		Headers: []field{
			{Key: "X-Debug", Value: "yes"},
			{Key: "", Value: "skip"},
		},
	})
	if code != http.StatusOK || out.Error != "" {
		t.Fatalf("code %d err %s", code, out.Error)
	}
	if out.Status != http.StatusCreated || out.StatusText != "201 Created" {
		t.Fatalf("status %+v", out)
	}
	if !strings.Contains(out.Body, `"ok":true`) || !strings.Contains(out.Body, "<b>") {
		t.Fatalf("body %s", out.Body)
	}
	var cookies int
	for _, h := range out.Headers {
		if h.Key == "Set-Cookie" {
			cookies++
		}
	}
	if cookies != 2 {
		t.Fatalf("cookies %+v", out.Headers)
	}
	if out.Size != len(out.Body) || out.TimeMs < 0 {
		t.Fatalf("size %d time %d", out.Size, out.TimeMs)
	}
}

func TestPostRawJSONAndContentTypeOverride(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Type") != "text/plain" {
			t.Errorf("ct %q", r.Header.Get("Content-Type"))
		}
		if r.Header.Get("User-Agent") != "custom" {
			t.Errorf("ua %q", r.Header.Get("User-Agent"))
		}
		if r.Host != "example.test" {
			t.Errorf("host %q", r.Host)
		}
		body, _ := io.ReadAll(r.Body)
		if string(body) != `{"name":"ada"}` {
			t.Errorf("body %s", body)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer up.Close()

	code, out := postSend(t, sendInput{
		Method:   "POST",
		URL:      up.URL + "/users",
		BodyMode: "raw",
		RawType:  "json",
		Raw:      `{"name":"ada"}`,
		Headers: []field{
			{Key: "Content-Type", Value: "text/plain"},
			{Key: "User-Agent", Value: "custom"},
			{Key: "Host", Value: "example.test"},
			{Key: "Content-Length", Value: "1"},
		},
	})
	if code != http.StatusOK || out.Error != "" {
		t.Fatal(out.Error)
	}
	if out.Status != http.StatusNoContent {
		t.Fatalf("status %d", out.Status)
	}
}

func TestURLEncodedAndFormData(t *testing.T) {
	var gotForm string
	var gotName string
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
			if err := r.ParseMultipartForm(1 << 20); err != nil {
				t.Error(err)
			}
			gotName = r.FormValue("name")
			_, _ = io.WriteString(w, "form")
			return
		}
		_ = r.ParseForm()
		gotForm = r.Form.Get("q")
		if r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			t.Errorf("ct %s", r.Header.Get("Content-Type"))
		}
		_, _ = io.WriteString(w, "url")
	}))
	defer up.Close()

	_, out := postSend(t, sendInput{
		Method:   "POST",
		URL:      up.URL,
		BodyMode: "urlencoded",
		Fields:   []field{{Key: "q", Value: "a&b"}, {Key: " ", Value: "skip"}},
	})
	if out.Body != "url" || gotForm != "a&b" {
		t.Fatalf("urlencoded body %q form %q err %s", out.Body, gotForm, out.Error)
	}

	_, out = postSend(t, sendInput{
		Method:   "POST",
		URL:      up.URL,
		BodyMode: "formdata",
		Fields:   []field{{Key: "name", Value: "ada"}},
	})
	if out.Body != "form" || gotName != "ada" {
		t.Fatalf("form body %q name %q err %s", out.Body, gotName, out.Error)
	}
}

func TestSchemePrefixRedirectAndRefusals(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/start" {
			http.Redirect(w, r, "/end", http.StatusFound)
			return
		}
		_, _ = io.WriteString(w, "done")
	}))
	defer up.Close()

	host := strings.TrimPrefix(up.URL, "http://")
	_, out := postSend(t, sendInput{Method: "GET", URL: host + "/start"})
	if out.Status != http.StatusOK || out.Body != "done" || !out.Redirected || !strings.HasSuffix(out.FinalURL, "/end") {
		t.Fatalf("%+v", out)
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := ln.Addr().String()
	ln.Close()
	_, out = postSend(t, sendInput{Method: "GET", URL: "http://" + addr + "/x"})
	if !strings.Contains(out.Error, "refused") {
		t.Fatalf("err %q", out.Error)
	}

	code, out := postSend(t, sendInput{Method: "GET", URL: ""})
	if code != http.StatusBadRequest || out.Error == "" {
		t.Fatalf("empty url %+v", out)
	}
	code, out = postSend(t, sendInput{Method: "TRACE", URL: up.URL})
	if code != http.StatusBadRequest {
		t.Fatal(out)
	}
	code, out = postSend(t, sendInput{Method: "GET", URL: "ftp://example.com"})
	if code != http.StatusBadRequest {
		t.Fatal(out)
	}
	code, out = postSend(t, sendInput{
		Method:  "GET",
		URL:     up.URL,
		Headers: []field{{Key: "X-Bad", Value: "a\r\nHost: evil"}},
	})
	if code != http.StatusBadRequest {
		t.Fatal(out)
	}
}

func TestTLSToggleAndBinary(t *testing.T) {
	img := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		t.Fatal(err)
	}
	up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/pic" {
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write(pngBuf.Bytes())
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		_, _ = w.Write([]byte{0, 1, 2, 3})
	}))
	defer up.Close()

	_, out := postSend(t, sendInput{Method: "GET", URL: up.URL + "/pic"})
	if out.Error == "" || !strings.Contains(strings.ToLower(out.Error), "certificate") {
		t.Fatalf("expected tls error, got %q", out.Error)
	}
	_, out = postSend(t, sendInput{Method: "GET", URL: up.URL + "/pic", Insecure: true})
	if out.Error != "" || out.Status != 200 || !out.Binary || out.BodyBase64 == "" {
		t.Fatalf("%+v", out)
	}
	_, out = postSend(t, sendInput{Method: "GET", URL: up.URL + "/bin", Insecure: true})
	if !out.Binary || out.BodyBase64 != "" || out.Size != 4 {
		t.Fatalf("%+v", out)
	}
}

func TestWindowByFileName(t *testing.T) {
	if !windowByFileName(`C:\app\request-window.exe`) || !windowByFileName("/tmp/request-window") {
		t.Fatal("window binary")
	}
	if windowByFileName(`C:\app\request.exe`) || windowByFileName("./request") {
		t.Fatal("browser binary")
	}
}

func TestTruncationAndUI(t *testing.T) {
	prev := maxResponseBytes
	maxResponseBytes = 4
	t.Cleanup(func() { maxResponseBytes = prev })

	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "abcdefghij")
	}))
	defer up.Close()
	_, out := postSend(t, sendInput{Method: "GET", URL: up.URL})
	if !out.Truncated || out.Body != "abcd" || out.Size != 4 {
		t.Fatalf("%+v", out)
	}

	srv := httptest.NewServer(newMux())
	defer srv.Close()
	res, err := http.Get(srv.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	page, _ := io.ReadAll(res.Body)
	html := string(page)
	if strings.Contains(html, "未命名请求") || !strings.Contains(html, "发送") || !strings.Contains(html, "参数") || !strings.Contains(html, `data-lang="en"`) {
		t.Fatalf("page missing request ui: %s", page)
	}
	if res.Header.Get("Cache-Control") != "no-store" {
		t.Fatal(res.Header.Get("Cache-Control"))
	}
}
