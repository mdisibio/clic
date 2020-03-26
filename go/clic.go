package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"
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

	// Try data then repo
	data, err := loadData()
	if err != nil {
		return err
	}
	cmd := data.resolve(cmdVers)
	if cmd == nil {

		err := fetchIfNeeded()
		if err != nil {
			return err
		}

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
	Run(cmds)
	return nil
}

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

	err := fetchIfNeeded()
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

func doInstallClic() error {
	fmt.Println("Installing clic...")

	// Create home folder if needed
	home, err := getClicHome()
	if err != nil {
		return err
	}

	created, err := mkdir(home)
	if created {
		fmt.Println("✓ clic home created:", home)
	}
	if err != nil {
		return err
	}

	// Create bin folder if needed
	bin, err := getClicBinPath("")
	if err != nil {
		return err
	}
	created, err = mkdir(bin)
	if created {
		fmt.Println("✓ clic bin created:", bin)
	}
	if err != nil {
		return err
	}

	// Copy executable if needed
	expected, err := getClicBinPath("clic")
	current, err := os.Executable()
	if current != expected {
		input, err := ioutil.ReadFile(current)
		if err != nil {
			return err
		}

		err = ioutil.WriteFile(expected, input, 0644)
		if err != nil {
			return err
		}
	}

	// Add folders to the path
	/*let bash_profile = getUserHome() + path.sep + '.bash_profile'
	  if(fs.existsSync(bash_profile)) {
	      var content = fs.readFileSync(bash_profile, 'utf-8');
	      if(content.search(bin) == -1) {
	          let line = `export PATH="$PATH:${bin}"\n`
	          fs.appendFileSync(bash_profile, line);
	      }
	      console.log(`✓ clic bin added to ${bash_profile}`)
	  }*/

	return nil
}

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

	if commandVers.command == "clic" {
		return doInstallClic()
	}

	err := fetchIfNeeded()
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
		fmt.Println(err)
	}

	resolvedVersion := parseCommand(cmd.Name)
	err = link(resolvedVersion)
	if err != nil {
		return err
	}

	if resolvedVersion.toString() != commandVers.toString() {
		err = link(commandVers)
		if err != nil {
			return err
		}
	}

	return nil
}

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

	for _, c := range toUninstall {
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
	}

	return nil
}

func doLink(args []string) error {
	parser := flag.NewFlagSet("link", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic link COMMAND[@VERS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	commandVers := parseCommand(parser.Args()[0])

	repo, err := loadRepo()
	if err != nil {
		return err
	}

	cmd := repo.resolve(commandVers)
	if cmd == nil {
		return fmt.Errorf("Unknown command: %s", commandVers.toString())
	}

	err = link(commandVers)
	if err != nil {
		return err
	}

	return nil
}

func doUnlink(args []string) error {
	parser := flag.NewFlagSet("unlink", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic unlink COMMAND[@VERS]")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp || len(args) < 1 {
		parser.Usage()
		return nil
	}

	cmd := parseCommand(parser.Arg(0))

	return unlink(cmd)
}

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
	fmt.Println()
	fmt.Println("Run 'clic COMMAND --help' for more information on a command.")

	return nil
}

func fetchIfNeeded() error {

	r, err := getRepoPath()
	if err != nil {
		return err
	}

	_, err = os.Stat(r)
	if err == nil || !os.IsNotExist(err) {
		return err
	}

	return fetch()
}

func fetch() error {
	dst, err := getClicHome()
	if err != nil {
		return nil
	}

	err = os.MkdirAll(path.Join(dst, "repo"), 0777)
	if err != nil {
		return err
	}

	err = downloadGithub("mdisibio/clic", "repo", dst)

	return err
}

func doFetch(args []string) error {
	parser := flag.NewFlagSet("fetch", flag.ExitOnError)
	parser.Usage = func() {
		fmt.Println("Usage:  clic fetch")
		parser.PrintDefaults()
	}
	if err := parser.Parse(args); err == flag.ErrHelp {
		parser.Usage()
		return nil
	}

	return fetch()
}

func main() {

	processName := filepath.Base(os.Args[0])
	if processName != "clic" {
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
