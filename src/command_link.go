package main

import (
	"flag"
	"fmt"
)

func doLink(args []string) error {
	parser := flag.NewFlagSet("link", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic link COMMAND[@VERS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	commandVers := parseCommand(parser.Args()[0])

	repo, err := loadRepo()
	if err != nil {
		return err
	}

	cmd := repo.resolve(commandVers)
	if cmd == nil {
		return fmt.Errorf("Unknown command: %s", commandVers.toString())
	}

	err = link(commandVers)
	if err != nil {
		return err
	}

	return nil
}
