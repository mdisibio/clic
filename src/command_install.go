package main

import (
	"flag"
	"fmt"
)

func doInstall(args []string) error {
	parser := flag.NewFlagSet("install", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic install COMMAND[@VERS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	commandVers := parseCommand(parser.Args()[0])

	err := checkOneTimeSetup()
	if err != nil {
		return err
	}

	repo, err := loadRepo()
	if err != nil {
		return err
	}

	cmd := repo.resolve(commandVers)
	if cmd == nil {
		return fmt.Errorf("Unknown command: %s", commandVers.toString())
	}

	d, err := loadData()
	if err != nil {
		return err
	}

	err = d.installCommand(*cmd)
	if err != nil {
		return err
	}

	err = pullOrBuild(*cmd)
	if err != nil {
		return err
	}

	// Resolve a shorthand "command" to full "command@vers"
	// Always link the fullhand "command@vers"
	resolvedVersion := parseCommand(cmd.Name)
	err = link(resolvedVersion)
	if err != nil {
		return err
	}

	// Link the input as given, if different from the
	// fullhand linked above.
	if resolvedVersion.toString() != commandVers.toString() {
		err = link(commandVers)
		if err != nil {
			return err
		}
	}

	return nil
}

func pullOrBuild(cmd RepoCommand) error {
	if cmd.Image > "" {
		runCommand(Command{
			Name: "docker",
			Args: []string{"pull", cmd.Image},
		})
		fmt.Println("✓ Pulled:", cmd.Image)
	} else if cmd.Dockerfile > "" {

	}
	return nil
}
