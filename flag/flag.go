package flag

import (
	f "flag"
)

var (
	Dir  string
	Port int
)

func Init() {
	f.StringVar(&Dir, "d", ".", "Directory to store the configuration files")
	f.IntVar(&Port, "p", 1323, "Port to run the server on")
	f.Parse()
}
