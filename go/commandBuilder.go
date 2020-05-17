package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Command Command line to be executed
type Command struct {
	Name      string
	Args      []string
	Exit      bool
	StdinFile string
	Stdin     bool
	Skip      bool
}

// Display Prints the command to the console in a straight forward way where it
// can be copied and pasted and executed directly
func (c *Command) Display() {
	skipped := ""
	if c.Skip {
		skipped = "[SKIPPED] "
	}

	stdIn := ""
	if c.StdinFile > "" {
		stdIn = " < " + c.StdinFile
	}
	fmt.Println(skipped + c.Name + " " + strings.Join(c.Args, " ") + stdIn)
}

// BuildCommands Turn given repo command and args into the raw command lines to be executed
func BuildCommands(cmd RepoCommand, args []string) []Command {
	var cmds []Command

	img := cmd.Image

	if cmd.Dockerfile > "" {
		img = cmd.Name + ":latest"
		df, err := getDockerfilePath(cmd.Dockerfile)
		if err != nil {
			return cmds
		}

		buildCmd := Command{}
		buildCmd.Skip = imageExists(img)
		buildCmd.Name = "docker"
		buildCmd.Args = []string{"build", "-t", img, "-"}
		buildCmd.StdinFile = df
		buildCmd.Exit = false
		cmds = append(cmds, buildCmd)
	}

	volumes, workdir := determineVolumes(cmd)
	envs := determinEnvVars(cmd)

	stdin := determineStdInEnabled(cmd)

	runCmd := createDockerRunCmdLine(img, volumes, workdir, cmd.Entrypoint, args, stdin, envs)
	cmds = append(cmds, Command{
		Name:  runCmd[0],
		Args:  runCmd[1:],
		Exit:  true,
		Stdin: stdin})

	return cmds
}

func imageExists(img string) bool {
	out, _ := exec.Command("docker", "images", "-q", img).Output()
	return len(out) > 0
}

func determineStdInEnabled(cmd RepoCommand) bool {
	return cmd.Stdin != StdInFalse
}

func determineVolumesMountAuto(cmd RepoCommand) (string, string, error) {
	home, err := getUserHome()
	if err != nil {
		return "", "", err
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", "", err
	}

	p, err := filepath.Rel(home, cwd)
	if err != nil {
		return "", "", err
	}
	if !strings.HasPrefix(p, ".") {
		// Cwd is under home,
		// so mount relatively
		volume := home + ":" + cmd.Workdir
		finalWorkDir := filepath.Join(cmd.Workdir, p)
		return volume, finalWorkDir, nil
	}

	// Can't determine a smart relative path,
	// so fallback to mounting cwd
	volume := cwd + ":" + cmd.Workdir
	finalWorkDir := cmd.Workdir
	return volume, finalWorkDir, nil
}

func determineVolumes(cmd RepoCommand) ([]string, string) {
	volumes := cmd.Volumes
	finalWorkDir := cmd.Workdir

	if len(cmd.Workdir) > 0 {
		if cmd.Mount == MountAuto {
			addlVolumes, newWorkDir, err := determineVolumesMountAuto(cmd)
			if err == nil {
				volumes = append(volumes, addlVolumes)
				finalWorkDir = newWorkDir
			}
		} else if cmd.Mount == MountPwd {
			if cwd, err := os.Getwd(); err == nil {
				volumes = append(volumes, cwd+":"+cmd.Workdir)
			}
		}
	}

	return volumes, finalWorkDir
}

func determinEnvVars(cmd RepoCommand) map[string]string {
	envs := make(map[string]string)

	if cmd.Fixttydims {
		cols, lines, err := getTermDim()
		if err == nil {
			envs["COLUMNS"] = fmt.Sprint(cols)
			envs["LINES"] = fmt.Sprint(lines)
		}
	}

	return envs
}

func getTermDim() (width, height int, err error) {
	cmd := exec.Command("stty", "size")
	cmd.Stdin = os.Stdin
	var termDim []byte
	if termDim, err = cmd.Output(); err != nil {
		return
	}
	fmt.Sscan(string(termDim), &height, &width)
	return
}

func createDockerRunCmdLine(
	image string,
	volumes []string,
	workdir string,
	entrypoint string,
	args []string,
	stdinEnable bool,
	env map[string]string) []string {
	var s []string

	s = append(s, "docker", "run", "--rm")

	if stdinEnable {
		s = append(s, "-i")
	}

	// Detect tty mode
	stdin, _ := os.Stdin.Stat()
	stdout, _ := os.Stdout.Stat()

	if (stdin.Mode()&os.ModeCharDevice) == 0 || (stdout.Mode()&os.ModeCharDevice) == 0 {
		// Is a pipe
	} else {
		// Is a tty
		s = append(s, "-t")
	}

	for _, v := range volumes {
		s = append(s, "-v", v)
	}

	if workdir > "" {
		s = append(s, "-w", workdir)
	}

	if entrypoint > "" {
		s = append(s, "--entrypoint", entrypoint)
	}

	for k, v := range env {
		s = append(s, "-e", fmt.Sprintf("%s=%s", k, v))
	}

	s = append(s, image)

	for _, a := range args {
		s = append(s, a)
	}

	return s
}
