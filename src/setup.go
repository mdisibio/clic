package main

import (
	"fmt"
	"os"
)

func checkOneTimeSetup() error {
	// Check home folder
	home, err := getClicHome()
	if err != nil {
		return err
	}
	created, err := mkdir(home)
	if err != nil {
		return err
	}
	if created {
		fmt.Println("✓ clic home created:", home)
	}

	// Check /bin/ folder
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

	// Fetch latest if needed
	r, err := getRepoPath()
	if err != nil {
		return err
	}

	_, err = os.Stat(r)
	if err == nil || !os.IsNotExist(err) {
		// File exists or some error occurred
		return err
	}

	return fetch()
}
