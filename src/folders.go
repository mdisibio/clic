package main

import (
	"os"
	"path/filepath"
)

var userHomeDir string

func getUserHome() (string, error) {
	if userHomeDir == "" {
		userHomeDir, err := os.UserHomeDir()
		return userHomeDir, err
	}
	return userHomeDir, nil
}

func getClicHome() (string, error) {
	user, err := getUserHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(user, ".clic"), nil
}

func getClicItself() (string, error) {
	/*clic, err := getClicHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(clic, "clic"), nil*/
	return os.Executable()
}

func getClicBinPath(file string) (string, error) {
	clic, err := getClicHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(clic, "bin", file), nil
}

func getRepoPath() (string, error) {
	clic, err := getClicHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(clic, "repo", "repo.yaml"), nil
}

func getDataPath() (string, error) {
	clic, err := getClicHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(clic, "data.yaml"), nil
}

func getDockerfilePath(dockerfile string) (string, error) {
	clic, err := getClicHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(clic, "repo", dockerfile), nil
}

func mkdir(f string) (bool, error) {
	if _, err := os.Stat(f); err != nil {
		if os.IsNotExist(err) {
			err := os.Mkdir(f, 0600)
			if err != nil {
				return false, err
			}
			// Folder was created
			return true, err
		}
		return false, err
	}
	return false, nil
}
