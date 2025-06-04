GOOS := linux
GOARCH := amd64
TARGET := mosdash
BUILD_DIR := build

all: build

build:
	mkdir -p $(BUILD_DIR)
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -o $(BUILD_DIR)/$(TARGET) main.go

clean:
	rm -rf $(BUILD_DIR)
