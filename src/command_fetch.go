package main

import (
	"flag"
	"fmt"
	"os"
	"path"
)

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
