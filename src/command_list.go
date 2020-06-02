package main

import (
	"flag"
	"fmt"
)

func doList(args []string) error {
	parser := flag.NewFlagSet("ls", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic ls COMMAND[@VERS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp {
		parser.Usage()
		return nil
	}

	d, err := loadData()
	if err != nil {
		return err
	}

	fmt.Println("")
	fmt.Println("Installed commands:")
	for _, c := range d.sortedCommands() {
		fmt.Printf(" %s\n", c)
	}

	fmt.Println("")
	fmt.Println("Aliases:")
	for _, c := range d.sortedHighestCommands() {
		fmt.Printf(" %s -> %s\n", parseCommand(c.Name).command, c.Name)
	}

	fmt.Println()

	return nil
}
