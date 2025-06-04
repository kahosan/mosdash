package routes

import (
	"mosdash/routes/config"
	"mosdash/routes/log"
	"mosdash/routes/rules"
	"os/exec"

	"github.com/labstack/echo/v4"
)

func SetupRoutes(e *echo.Echo) {
	config.SetupConfigRoutes(e)
	rules.SetupRulesRoutes(e)
	log.SetupLogRoutes(e)

	e.GET("/restart", func(c echo.Context) error {
		return execCmd(c, "systemctl", "restart", "mosdns")
	})
	e.GET("/stop", func(c echo.Context) error {
		return execCmd(c, "systemctl", "stop", "mosdns")
	})
	e.GET("/start", func(c echo.Context) error {
		return execCmd(c, "systemctl", "start", "mosdns")
	})
}

func execCmd(c echo.Context, cmd ...string) error {
	err := exec.Command(cmd[0], cmd[1:]...).Run()
	if err != nil {
		return c.String(500, "Failed to execute command: "+err.Error())
	}
	return c.String(200, "Command executed successfully")
}
