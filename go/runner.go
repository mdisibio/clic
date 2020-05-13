package main

import (
	"os"
	"os/exec"
)

func run(cmds []Command) {
	for _, c := range cmds {
		runCommand(c)
	}
}

func runCommand(c Command) {
	if c.Skip {
		return
	}

	p := exec.Command(c.Name, c.Args...)
	p.Stdout = os.Stdout
	p.Stderr = os.Stderr

	if c.Stdin {
		p.Stdin = os.Stdin
	}

	if c.StdinFile > "" {
		p.Stdin, _ = os.Open(c.StdinFile)
	}

	err := p.Run()

	if c.Exit || err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			os.Exit(exitError.ExitCode())
			return
		}
		os.Exit(0)
	}
}
