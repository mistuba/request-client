package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime/multipart"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

//go:embed static
var staticFiles embed.FS

var maxResponseBytes int64 = 8 << 20

var schemeRE = regexp.MustCompile(`(?i)^[a-z][a-z0-9+.-]*://`)

func newMux() http.Handler {
	sub, err := fs.Sub(staticFiles, "static")
	if err != nil {
		panic(err)
	}
	files := http.FileServer(http.FS(sub))
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/send", handleSend)
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Request-App", "request-client")
		files.ServeHTTP(w, r)
	}))
	return mux
}

type sendInput struct {
	Method   string  `json:"method"`
	URL      string  `json:"url"`
	Headers  []field `json:"headers"`
	BodyMode string  `json:"bodyMode"`
	RawType  string  `json:"rawType"`
	Raw      string  `json:"raw"`
	Fields   []field `json:"fields"`
	Insecure bool    `json:"insecure"`
}

type field struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type headerPair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type apiResponse struct {
	Status      int          `json:"status"`
	StatusText  string       `json:"statusText,omitempty"`
	TimeMs      int64        `json:"timeMs"`
	Size        int          `json:"size"`
	Headers     []headerPair `json:"headers,omitempty"`
	Body        string       `json:"body,omitempty"`
	BodyBase64  string       `json:"bodyBase64,omitempty"`
	ContentType string       `json:"contentType,omitempty"`
	Binary      bool         `json:"binary"`
	Truncated   bool         `json:"truncated"`
	Redirected  bool         `json:"redirected"`
	FinalURL    string       `json:"finalUrl,omitempty"`
	Error       string       `json:"error,omitempty"`
}

func handleSend(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 32<<20)
	var in sendInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, apiResponse{Error: "Could not read the request"})
		return
	}
	out, code := perform(r.Context(), in)
	writeJSON(w, code, out)
}

func perform(ctx context.Context, in sendInput) (apiResponse, int) {
	target, err := normalizeURL(in.URL)
	if err != nil {
		return apiResponse{Error: err.Error()}, http.StatusBadRequest
	}
	method := strings.ToUpper(strings.TrimSpace(in.Method))
	if method == "" {
		method = http.MethodGet
	}
	if !allowedMethod(method) {
		return apiResponse{Error: "Unsupported method"}, http.StatusBadRequest
	}

	body, contentType, err := buildBody(in)
	if err != nil {
		return apiResponse{Error: err.Error()}, http.StatusBadRequest
	}

	req, err := http.NewRequestWithContext(ctx, method, target, body)
	if err != nil {
		return apiResponse{Error: "Enter an http or https URL"}, http.StatusBadRequest
	}

	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	for _, h := range in.Headers {
		key, value, err := cleanHeader(h.Key, h.Value)
		if err != nil {
			return apiResponse{Error: err.Error()}, http.StatusBadRequest
		}
		if key == "" {
			continue
		}
		if strings.EqualFold(key, "Host") {
			req.Host = value
			continue
		}
		if hopByHop(key) {
			continue
		}
		req.Header.Set(key, value)
	}
	if req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", "Request/1.0")
	}

	redirects := 0
	client := &http.Client{
		Timeout:   60 * time.Second,
		Transport: newTransport(in.Insecure),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("stopped after 10 redirects")
			}
			if req.URL.Scheme != "http" && req.URL.Scheme != "https" {
				return errors.New("redirect to a non-http URL")
			}
			redirects = len(via)
			return nil
		},
	}

	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return apiResponse{Error: friendly(err), TimeMs: time.Since(start).Milliseconds()}, http.StatusOK
	}
	defer resp.Body.Close()

	buf, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return apiResponse{Error: friendly(err), TimeMs: elapsed}, http.StatusOK
	}
	truncated := int64(len(buf)) > maxResponseBytes
	if truncated {
		buf = buf[:maxResponseBytes]
	}

	ct := resp.Header.Get("Content-Type")
	out := apiResponse{
		Status:      resp.StatusCode,
		StatusText:  resp.Status,
		TimeMs:      elapsed,
		Size:        len(buf),
		Headers:     flattenHeaders(resp.Header),
		ContentType: ct,
		Truncated:   truncated,
		Redirected:  redirects > 0,
	}
	if resp.Request != nil && resp.Request.URL != nil {
		out.FinalURL = resp.Request.URL.String()
	}
	if textual(ct, buf) {
		out.Body = string(buf)
	} else {
		out.Binary = true
		if isImage(ct) {
			out.BodyBase64 = base64.StdEncoding.EncodeToString(buf)
		}
	}
	return out, http.StatusOK
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func normalizeURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("Enter a request URL")
	}
	if !schemeRE.MatchString(raw) {
		if strings.HasPrefix(raw, "//") {
			raw = "http:" + raw
		} else {
			raw = "http://" + raw
		}
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", errors.New("Enter an http or https URL")
	}
	return raw, nil
}

func allowedMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodHead, http.MethodOptions:
		return true
	default:
		return false
	}
}

func buildBody(in sendInput) (io.Reader, string, error) {
	switch in.BodyMode {
	case "", "none":
		return nil, "", nil
	case "raw":
		return strings.NewReader(in.Raw), rawContentType(in.RawType), nil
	case "urlencoded":
		v := url.Values{}
		for _, f := range in.Fields {
			if strings.TrimSpace(f.Key) == "" {
				continue
			}
			v.Add(f.Key, f.Value)
		}
		return strings.NewReader(v.Encode()), "application/x-www-form-urlencoded", nil
	case "formdata":
		var buf bytes.Buffer
		w := multipart.NewWriter(&buf)
		for _, f := range in.Fields {
			if strings.TrimSpace(f.Key) == "" {
				continue
			}
			if err := w.WriteField(f.Key, f.Value); err != nil {
				return nil, "", err
			}
		}
		if err := w.Close(); err != nil {
			return nil, "", err
		}
		return &buf, w.FormDataContentType(), nil
	default:
		return nil, "", errors.New("Unknown body type")
	}
}

func rawContentType(kind string) string {
	switch strings.ToLower(kind) {
	case "json", "":
		return "application/json"
	case "text":
		return "text/plain"
	case "javascript":
		return "application/javascript"
	case "html":
		return "text/html"
	case "xml":
		return "application/xml"
	default:
		return "text/plain"
	}
}

func cleanHeader(key, value string) (string, string, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return "", "", nil
	}
	if strings.ContainsAny(key, "\r\n") || strings.ContainsAny(value, "\r\n") {
		return "", "", fmt.Errorf("Invalid header %s", key)
	}
	if !validToken(key) {
		return "", "", fmt.Errorf("Invalid header name %s", key)
	}
	return key, value, nil
}

func validToken(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c <= ' ' || c >= 127 || strings.ContainsRune("()<>@,;:\\\"/[]?={}", c) {
			return false
		}
	}
	return true
}

func hopByHop(key string) bool {
	switch strings.ToLower(key) {
	case "content-length", "transfer-encoding", "connection", "keep-alive", "upgrade", "trailer", "te", "proxy-connection":
		return true
	default:
		return false
	}
}

func newTransport(insecure bool) *http.Transport {
	base, ok := http.DefaultTransport.(*http.Transport)
	var tr *http.Transport
	if ok {
		tr = base.Clone()
	} else {
		tr = &http.Transport{}
	}
	tr.Proxy = nil
	if insecure {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}
	return tr
}

func flattenHeaders(h http.Header) []headerPair {
	out := make([]headerPair, 0, len(h))
	for key, vals := range h {
		for _, v := range vals {
			out = append(out, headerPair{Key: key, Value: v})
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Key == out[j].Key {
			return out[i].Value < out[j].Value
		}
		return out[i].Key < out[j].Key
	})
	return out
}

func textual(contentType string, body []byte) bool {
	if bytes.IndexByte(body, 0) >= 0 {
		return false
	}
	ct := strings.ToLower(contentType)
	switch {
	case strings.HasPrefix(ct, "image/"), strings.HasPrefix(ct, "audio/"), strings.HasPrefix(ct, "video/"):
		return false
	case strings.Contains(ct, "octet-stream"), strings.Contains(ct, "pdf"), strings.Contains(ct, "zip"), strings.Contains(ct, "gzip"):
		return false
	default:
		return utf8.Valid(body)
	}
}

func isImage(contentType string) bool {
	ct := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	switch ct {
	case "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml":
		return true
	default:
		return false
	}
}

func friendly(err error) string {
	if err == nil {
		return ""
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "The request timed out"
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "connection refused"):
		return "Could not connect: the server refused the connection"
	case strings.Contains(msg, "no such host"):
		return "Could not resolve the host"
	case strings.Contains(msg, "i/o timeout"), strings.Contains(msg, "TLS handshake timeout"), strings.Contains(msg, "Client.Timeout"):
		return "The request timed out"
	case strings.Contains(msg, "certificate"):
		return "TLS certificate error. Turn off SSL verify if you trust this host. " + msg
	default:
		return msg
	}
}
