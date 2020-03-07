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

	return filepath.Join(clic, "repo.yaml"), nil
}

func getDataPath() (string, error) {
	clic, err := getClicHome()
	if err != nil {
		return "", err
	}

	return filepath.Join(clic, "data.yaml"), nil
}
