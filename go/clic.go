package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func doRun(args []string) {
	parser := flag.NewFlagSet("run", flag.ExitOnError)
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		fmt.Println("run help:")
		return
	}

	commandName := parser.Args()[0]
	commandArgs := parser.Args()[1:]

	repo, err := loadRepo()
	if err != nil {
		fmt.Println(err)
		return
	}

	cmd := repo.resolve(parseCommand(commandName))
	if cmd == nil {
		fmt.Println("Unknown command: ", commandName)
		return
	}

	cmds := BuildCommands(*cmd, commandArgs)
	Run(cmds)
}

func doExplain(args []string) {
	parser := flag.NewFlagSet("explain", flag.ExitOnError)
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		fmt.Println("explain help:")
		return
	}

	commandName := parser.Args()[0]
	commandArgs := parser.Args()[1:]

	repo, err := loadRepo()
	if err != nil {
		fmt.Println(err)
		return
	}

	cmd := repo.resolve(parseCommand(commandName))
	if cmd == nil {
		fmt.Println("Unknown command: ", commandName)
		return
	}

	cmds := BuildCommands(*cmd, commandArgs)
	for _, c := range cmds {
		c.Display()
	}
}

func doInstallClic() {

}

func doInstall(args []string) {
	parser := flag.NewFlagSet("install", flag.ExitOnError)
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		fmt.Println("install help:")
		return
	}

	commandVers := parseCommand(parser.Args()[0])

	if commandVers.command == "clic" {
		doInstallClic()
		return
	}

	repo, err := loadRepo()
	if err != nil {
		fmt.Println(err)
		return
	}

	cmd := repo.resolve(commandVers)
	if cmd == nil {
		fmt.Println("Unknown command:", commandVers.toString())
		return
	}

	d, err := loadData()
	if err != nil {
		fmt.Println(err)
		return
	}

	err = d.installCommand(*cmd)
	if err != nil {
		fmt.Println(err)
	}

	err = link(commandVers)
	if err != nil {
		fmt.Println(err)
		return
	}
}

func doLink(args []string) {
	parser := flag.NewFlagSet("install", flag.ExitOnError)
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		fmt.Println("install help:")
		return
	}

	commandVers := parseCommand(parser.Args()[0])

	repo, err := loadRepo()
	if err != nil {
		fmt.Println(err)
		return
	}

	cmd := repo.resolve(commandVers)
	if cmd == nil {
		fmt.Println("Unknown command:", commandVers.toString())
		return
	}

	err = link(commandVers)
	if err != nil {
		fmt.Println(err)
	}
}

func doHelp() {
	fmt.Println()
	fmt.Println("Usage: clic COMMAND [ARGS] ")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  explain    Show statements that will be executed when running a command")
	fmt.Println("  install    Install command or clic itself")
	fmt.Println("  link       Create a shell alias")
	fmt.Println("  ls         List installed commands")
	fmt.Println("  run        Run a command explicitly without a shell alias")
	fmt.Println("  uninstall  Uninstall command")
	fmt.Println("  unlink     Delete a shell alias")
	fmt.Println()
	fmt.Println("Run 'clic COMMAND --help' for more information on a command.")
}

func main() {

	processName := filepath.Base(os.Args[0])
	if processName != "clic" {
		runArgs := []string{processName}
		runArgs = append(runArgs, os.Args[1:]...)
		doRun(runArgs)
		return
	}

	if len(os.Args) == 1 {
		doHelp()
		return
	}

	switch strings.ToLower(os.Args[1]) {
	case "explain":
		doExplain(os.Args[2:])
	case "install":
		doInstall(os.Args[2:])
	case "link":
		doLink(os.Args[2:])
	case "run":
		doRun(os.Args[2:])
	default:
		doHelp()
	}

}
