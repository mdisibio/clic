package main

import (
	"flag"
	"fmt"
)

func doUninstall(args []string) error {
	parser := flag.NewFlagSet("uninstall", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic uninstall [ARGS] [COMMANDS]")
		parser.PrintDefaults()
	}
	var all = parser.Bool("all", false, "uninstall all commands")
	if err := parser.Parse(args); err == flag.ErrHelp {
		parser.Usage()
		return nil
	}

	d, err := loadData()
	if err != nil {
		return err
	}

	r, err := loadRepo()
	if err != nil {
		return err
	}

	var toUninstall []CommandVersion

	if *all {
		fmt.Println("Uninstalling all commands:")
		for _, v := range d.Commands {
			toUninstall = append(toUninstall, parseCommand(v.Name))
		}
	} else {
		toUninstall = append(toUninstall, parseCommand(parser.Args()[0]))
	}

	uninstalled := 0

	for _, c := range toUninstall {
		actual := d.resolve(c)
		if actual == nil {
			continue
		}

		if err = unlink(c); err != nil {
			return err
		}
		if err = d.uninstallCommand(c); err != nil {
			return err
		}

		// If command being uninstalled has a matching alias,
		// then unlink both
		latest := r.resolveLatest(c)
		match := r.resolve(c)
		if latest != nil && match != nil && latest.Name == match.Name {
			if c.hasVersion {
				unlink(parseCommand(parseCommand(match.Name).command))
			} else {
				unlink(parseCommand(latest.Name))
			}
		}

		uninstalled++
	}

	if uninstalled == 0 {
		fmt.Println("No commands were uninstalled. Try specifying exact version.")
	}

	return nil
}
