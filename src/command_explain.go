package main

import (
	"flag"
	"fmt"
)

func doExplain(args []string) error {
	parser := flag.NewFlagSet("explain", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic explain COMMAND[@VERS] [ARGS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	commandName := parser.Args()[0]
	commandArgs := parser.Args()[1:]

	err := checkOneTimeSetup()
	if err != nil {
		return err
	}

	repo, err := loadRepo()
	if err != nil {
		return err
	}

	cmd := repo.resolve(parseCommand(commandName))
	if cmd == nil {
		return fmt.Errorf("Unknown command: %s", commandName)
	}

	cmds := BuildCommands(*cmd, commandArgs)
	for _, c := range cmds {
		c.Display()
	}

	return nil
}
