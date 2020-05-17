package main

import (
	"fmt"
	"strings"
)

// CommandVersion Struct to contain a parsed command@version string
type CommandVersion struct {
	command    string
	version    string
	hasVersion bool
}

func parseCommand(s string) CommandVersion {
	var result CommandVersion

	parts := strings.Split(s, "@")
	result.command = parts[0]
	if len(parts) > 1 {
		result.version = parts[1]
		result.hasVersion = true
	}

	return result
}

func (c CommandVersion) toString() string {
	if c.hasVersion {
		return fmt.Sprintf("%s@%s", c.command, c.version)
	}

	return c.command
}
