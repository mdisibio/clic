package main

import (
	"errors"
	"flag"
	"fmt"
)

func doUpgrade(args []string) error {
	parser := flag.NewFlagSet("upgrade", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic upgrade COMMAND")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	cmdVers := parseCommand(parser.Arg(0))
	if cmdVers.hasVersion {
		return errors.New("Cannot specify version on upgrade. Try upgrading only ")
	}

	repo, err := loadRepo()
	if err != nil {
		return err
	}

	highestKnown := repo.resolveLatest(cmdVers)
	if highestKnown == nil {
		return fmt.Errorf("Unknown command: %s", parser.Arg(0))
	}
	highestKnownParsed := parseCommand(highestKnown.Name)

	data, err := loadData()
	if err != nil {
		return err
	}

	highestInstalled := data.resolveLatest(cmdVers)
	if highestInstalled != nil && highestInstalled.Name == highestKnown.Name {
		return fmt.Errorf("Latest version %s already installed", highestInstalled.Name)
	}

	// Install highest
	err = data.installCommand(*highestKnown)
	if err != nil {
		return err
	}

	err = link(highestKnownParsed)
	if err != nil {
		return err
	}

	// Uninstall older
	cmds := data.sortedCommands()
	for _, c := range cmds {
		x := parseCommand(c)
		if x.command == highestKnownParsed.command && x.version < highestKnownParsed.version {
			err = data.uninstallCommand(x)
			if err != nil {
				return err
			}

			err = unlink(x)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
