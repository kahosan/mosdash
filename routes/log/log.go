package log

import (
	"bytes"
	"mosdash/flag"
	"os"
	"path"

	"bufio"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

type LogEntry struct {
	Timestamp time.Time      `json:"timestamp"`        // 日志时间戳
	Level     string         `json:"level"`            // 日志级别，例如 INFO
	Message   string         `json:"message"`          // 主要日志消息
	Fields    map[string]any `json:"fields,omitempty"` // 从 JSON 负载中提取的附加字段
}

func SetupLogRoutes(e *echo.Echo) {
	e.GET("/log", func(c echo.Context) error {
		fp := path.Join(flag.Dir, "mosdns.log")

		ct, err := os.ReadFile(fp)
		if err != nil {
			return c.String(500, "Failed to read log file: "+err.Error())
		}

		data, err := serializeLog(ct)
		if err != nil {
			return c.String(500, err.Error())
		}

		return c.JSONBlob(200, data)
	})
}

// logLinePattern 是用于解析日志行的正则表达式。
// 它捕获以下组：
// 1. Timestamp (例如, 2025-06-03T02:00:08.738+0800)
// 2. Level (例如, INFO)
// 3. Message (例如, load config, 或 query_cn.r0   cn)
// 4. JSON payload (可选, 例如, {"file": "/etc/mosdns/exec.yaml"})
//
// 正则表达式详解:
// ^(\S+)                     // 组 1: Timestamp (行首的非空白字符)
// \s+                        // 分隔符: 一个或多个空白字符
// ([A-Z]+)                   // 组 2: Level (一个或多个大写字母)
// \s+                        // 分隔符: 一个或多个空白字符
// (.*?)                      // 组 3: Message (非贪婪匹配任何字符)
// (?:\s+(\{.*\}))?$          // 可选的非捕获组，用于匹配 JSON 或行尾:
//
//	//   \s+(\{.*\})  -> 组 4 (在非捕获组内部): 空白字符后跟 JSON 对象 {}
//	//   此处的 '?' 使整个 JSON 部分可选
var logLinePattern = regexp.MustCompile(`^(\S+)\s+([A-Z]+)\s+(.*?)(?:\s+(\{.*\}))?$`)

// timeLayout 是用于解析日志中时间戳的 Go 时间布局字符串。
// 示例时间戳: 2025-06-03T02:00:08.738+0800
const timeLayout = "2006-01-02T15:04:05.999-0700"

// parseLogLine 将单个日志行字符串解析为 LogEntry 结构体。
func parseLogLine(line string) (*LogEntry, error) {
	matches := logLinePattern.FindStringSubmatch(line)
	if matches == nil {
		return nil, fmt.Errorf("行日志与正则表达式不匹配: %q", line)
	}

	// 预期的捕获组:
	// matches[0]: 完整匹配的字符串
	// matches[1]: 时间戳字符串
	// matches[2]: 日志级别字符串
	// matches[3]: 消息字符串 (如果 JSON 存在，可能带有尾随空格)
	// matches[4]: JSON 字符串 (可选, 如果不存在则为空字符串)

	timestampStr := matches[1]
	levelStr := matches[2]
	// 对消息部分进行 TrimSpace，因为 (.*?) 可能会捕获 JSON 部分之前的空格
	messageStr := strings.TrimSpace(strings.ReplaceAll(matches[3], "\t", " "))
	jsonPayloadStr := matches[4]

	// 解析时间戳
	ts, err := time.Parse(timeLayout, timestampStr)
	if err != nil {
		// 如果不带毫秒的时间戳解析失败（尽管示例中包含毫秒），则尝试备用方案。
		// 根据示例，这可能不是必需的，但可以增加代码的健壮性。
		altTimeLayout := "2006-01-02T15:04:05-0700"
		ts, err = time.Parse(altTimeLayout, timestampStr)
		if err != nil {
			return nil, fmt.Errorf("无法解析时间戳 %q: %w", timestampStr, err)
		}
	}

	entry := &LogEntry{
		Timestamp: ts,
		Level:     levelStr,
		Message:   messageStr,
	}

	if jsonPayloadStr != "" {
		var fields map[string]any
		// JSON 负载字符串已经被捕获为 {.*}，因此它应该是有效的 JSON。
		if err := json.Unmarshal([]byte(jsonPayloadStr), &fields); err != nil {
			// 如果正则表达式正确识别了 JSON，则理想情况下不应发生此情况。
			// 如果发生，则可能表示日志中的 JSON 格式错误或正则表达式存在问题。
			return nil, fmt.Errorf("无法从行 %q 中反序列化 JSON 负载 %q: %w", line, jsonPayloadStr, err)
		}
		entry.Fields = fields
	}

	return entry, nil
}

func serializeLog(content []byte) ([]byte, error) {
	var ents []LogEntry
	var el []string // 存储解析失败的行

	scanner := bufio.NewScanner(bytes.NewReader(content))
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue // 跳过空行
		}
		entry, err := parseLogLine(line)
		if err != nil {
			el = append(el, fmt.Sprintf("第 %d 行: %s", lineNumber, line))
			continue
		}
		ents = append(ents, *entry)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("读取日志时遇到错误: %w", err)
	}

	if len(el) > 0 {
		return nil, fmt.Errorf("解析 %d 行日志时发生错误:\n%s", len(el), strings.Join(el, "\n"))
	}

	// 可选: 将解析后的条目以 JSON 格式打印出来，便于查看
	o, err := json.MarshalIndent(ents, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("无法将解析后的条目序列化为 JSON: %w", err)
	}

	return o, nil
}
