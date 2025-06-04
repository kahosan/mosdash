package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"mosdash/flag"
	"mosdash/routes"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	slogecho "github.com/samber/slog-echo"
)

//go:embed app
var ef embed.FS

func getFileSystem() http.FileSystem {
	fsys, err := fs.Sub(ef, "app")
	if err != nil {
		panic(err)
	}

	return http.FS(fsys)
}
func main() {
	flag.Init()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	assetHandler := http.FileServer(getFileSystem())

	e := echo.New()
	e.Use(slogecho.New(logger))
	e.Use(middleware.Recover())

	e.GET("/", echo.WrapHandler(assetHandler))
	e.GET("/assets/*", echo.WrapHandler(assetHandler))

	routes.SetupRoutes(e)

	e.Logger.Fatal(e.Start(fmt.Sprintf(":%d", flag.Port)))
}
