package config

import (
	"io"
	"mosdash/flag"
	"os"
	"path"
	"path/filepath"

	"github.com/labstack/echo/v4"
)

func SetupConfigRoutes(e *echo.Echo) {
	e.POST("/config/:file", updateFile)

	e.GET("/config", walkDir)
	e.GET("/config/:file", func(c echo.Context) error {
		filename := c.Param("file")
		c.Response().Header().Set("Content-Type", "application/yaml")
		return c.File(path.Join(flag.Dir, filename))
	})

}

func walkDir(c echo.Context) error {
	entries, err := os.ReadDir(flag.Dir)
	if err != nil {
		return c.String(500, "Failed to read plugins directory: "+err.Error())
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".yaml" {
			files = append(files, entry.Name())
		}
	}

	return c.JSON(200, files)
}

func updateFile(c echo.Context) error {
	filename := c.Param("file")
	filepath := path.Join(flag.Dir, filename)

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
