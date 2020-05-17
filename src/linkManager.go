package main

import (
	"fmt"
	"os"
)

func link(cmd CommandVersion) error {
	linkPath, err := getClicBinPath(cmd.toString())
	if err != nil {
		return err
	}

	clic, err := getClicItself()
	if err != nil {
		return err
	}

	// Only remove existing if it's a symlink
	existing, _ := os.Lstat(linkPath)
	if existing != nil {
		err = os.Remove(linkPath)
		if err != nil {
			return err
		}
	}

	err = os.Symlink(clic, linkPath)

	if err == nil {
		fmt.Println("✓ Created symlink:", linkPath)
	}

	return err
}

func unlink(cmd CommandVersion) error {
	linkPath, err := getClicBinPath(cmd.toString())
	if err != nil {
		return err
	}

	// Only remove existing if it's a symlink
	existing, _ := os.Lstat(linkPath)
	if existing != nil {
		err = os.Remove(linkPath)
		if err != nil {
			return err
		}
		fmt.Println("✓ Removed symlink:", linkPath)
	}

	return nil
}
