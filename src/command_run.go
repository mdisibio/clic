package main

import (
	"flag"
	"fmt"
)

func doRun(args []string) error {
	parser := flag.NewFlagSet("run", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic run COMMAND[@VERS] [ARGS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	commandName := parser.Args()[0]
	commandArgs := parser.Args()[1:]
	cmdVers := parseCommand(commandName)

	err := checkOneTimeSetup()
	if err != nil {
		return err
	}

	// Try data then repo
	data, err := loadData()
	if err != nil {
		return err
	}
	cmd := data.resolve(cmdVers)
	if cmd == nil {
		repo, err := loadRepo()
		if err != nil {
			return err
		}
		cmd = repo.resolve(cmdVers)
	}

	if cmd == nil {
		return fmt.Errorf("Unknown command: %s", commandName)
	}

	cmds := BuildCommands(*cmd, commandArgs)
	run(cmds)
	return nil
}
