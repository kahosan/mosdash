package rules

import (
	"io"
	"mosdash/flag"
	"os"
	"path"

	"github.com/labstack/echo/v4"
)

func SetupRulesRoutes(e *echo.Echo) {
	e.GET("/rule", walkRules)
	e.GET("/rule/:file", func(c echo.Context) error {
		filename := c.Param("file")
		return c.File(path.Join(flag.Dir, "rule", filename))
	})

	e.POST("/rule/:file", updateFile)
}

func walkRules(c echo.Context) error {
	entries, err := os.ReadDir(path.Join(flag.Dir, "rule"))
	if err != nil {
		return c.String(500, "Failed to read plugins directory: "+err.Error())
	}

	var files []string
	for _, entry := range entries {
		files = append(files, entry.Name())
	}

	return c.JSON(200, files)
}

func updateFile(c echo.Context) error {
	filename := c.Param("file")
	filepath := path.Join(flag.Dir, "rule", filename)

	body := c.Request().Body
	if body == nil {
		return c.String(400, "No content provided")
	}

	bodyBytes, err := io.ReadAll(body)
	if err != nil {
		return c.String(500, "Failed to read request body: "+err.Error())
	}

	err = os.WriteFile(filepath, bodyBytes, 0644)
	if err != nil {
		return c.String(500, "Failed to write config file: "+err.Error())
	}
	return c.String(200, "Plugin updated successfully")
}
