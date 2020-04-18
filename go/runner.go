package main

import (
	"os"
	"os/exec"
)

func run(cmds []Command) {
	runNative(cmds)
}

func runNative(cmds []Command) {
	for _, c := range cmds {
		if c.Skip {
			continue
		}

		p := exec.Command(c.Name, c.Args...)
		p.Stdin = os.Stdin
		p.Stdout = os.Stdout
		p.Stderr = os.Stderr

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
}

// Run Run the series of commands and exit with code appropriately
/*func RunBash(cmds []Command) {

	for _, c := range cmds {
		if c.Skip {
			continue
		}

		bashArgs := []string{c.Name}
		bashArgs = append(bashArgs, c.Args...)

		args := []string{"-c", strings.Join(bashArgs, " ")}
		//args = append(args, c.Args...)
		p := exec.Command("sh", args...)
		p.Stdin = os.Stdin
		p.Stderr = os.Stderr
		p.Stdout = os.Stdout

		if c.StdinFile > "" {
			p.Stdin, _ = os.Open(c.StdinFile)
		}

		//fmt.Println("Executing:", p)
		err := p.Run()

		if c.Exit || err != nil {
			if exitError, ok := err.(*exec.ExitError); ok {
				os.Exit(exitError.ExitCode())
				return
			}
			os.Exit(0)
		}
	}
}*/
