package main

import (
	"flag"
	"fmt"
)

func doUnlink(args []string) error {
	parser := flag.NewFlagSet("unlink", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic unlink COMMAND[@VERS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	cmd := parseCommand(parser.Arg(0))

	return unlink(cmd)
}
