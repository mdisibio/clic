package main

import (
	"flag"
	"fmt"
	"runtime"
)

func doVersion(args []string) error {
	parser := flag.NewFlagSet("version", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic version")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp {
		parser.Usage()
		return nil
	}

	fmt.Println("Version:    ", CompiledVersion)
	fmt.Println("Platform:   ", CompiledPlatformName)
	fmt.Println("Git commit: ", CompiledGitCommit)
	fmt.Println("Built:      ", CompiledTime)
	fmt.Println("Go version: ", runtime.Version())

	return nil
}
