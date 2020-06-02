package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func doHelp(_ []string) error {
	fmt.Println()
	fmt.Println("Usage: clic COMMAND [ARGS] ")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  explain    Show statements that will be executed when running a command")
	fmt.Println("  install    Install command or clic itself")
	fmt.Println("  fetch      Fetch latest command listing")
	fmt.Println("  link       Create a shell alias")
	fmt.Println("  ls         List installed commands")
	fmt.Println("  run        Run a command explicitly without a shell alias")
	fmt.Println("  uninstall  Uninstall command")
	fmt.Println("  unlink     Delete a shell alias")
	fmt.Println("  upgrade    Upgrade installed command to the latest version")
	fmt.Println()
	fmt.Println("Run 'clic COMMAND --help' for more information on a command.")

	return nil
}

func main() {

	sym, err := isExecutedViaSymlink()
	if err != nil {
		fmt.Println(err)
		os.Exit(255)
	}

	if sym {
		// Being called via symlink.  Use the incoming
		// process name as the command to run.
		processName := filepath.Base(os.Args[0])
		runArgs := []string{processName}
		runArgs = append(runArgs, os.Args[1:]...)
		err := doRun(runArgs)
		if err != nil {
			fmt.Println(err)
		}
		return
	}

	if len(os.Args) == 1 {
		doHelp(nil)
		return
	}

	var f func([]string) error

	switch strings.ToLower(os.Args[1]) {
	case "explain":
		f = doExplain
	case "fetch":
		f = doFetch
	case "install":
		f = doInstall
	case "link":
		f = doLink
	case "ls":
		f = doList
	case "run":
		f = doRun
	case "uninstall":
		f = doUninstall
	case "unlink":
		f = doUnlink
	case "upgrade":
		f = doUpgrade
	default:
		f = doHelp
	}

	if f != nil {
		err := f(os.Args[2:])
		if err != nil {
			fmt.Println(err)
			os.Exit(255)
		}
	}
}

func isExecutedViaSymlink() (bool, error) {
	e, err := os.Executable()
	if err != nil {
		return false, err
	}

	i, err := os.Lstat(e)
	if err != nil {
		return false, err
	}

	return i.Mode()&os.ModeSymlink != 0, nil
}
