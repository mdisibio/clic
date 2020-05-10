package main

import (
	"io/ioutil"
	"sort"
	"strings"

	"gopkg.in/yaml.v2"
)

// MountOption What folders to mount
type MountOption string

const (
	// MountAuto StandardAutomatically mount home folder with relative path or pwd
	MountAuto MountOption = "auto"

	// MountPwd Mount the pwd only
	MountPwd MountOption = "pwd"
)

// StdInOption How to handle stdin
type StdInOption string

const (
	// StdInEmpty Default handling for stdin, when not specified in the repo yaml
	StdInEmpty StdInOption = ""

	// StdInFalse Disable stdin for the spawned process
	StdInFalse StdInOption = "false"
)

// RepoCommand is an entry in the repo file
type RepoCommand struct {
	Name       string
	Image      string
	Dockerfile string
	Workdir    string
	Entrypoint string
	Volumes    []string

	// Options
	Fixttydims bool
	Mount      MountOption
	Stdin      StdInOption
}

// Repo is the repository of all known commands
type Repo struct {
	Commands map[string]RepoCommand
}

func loadRepo() (Repo, error) {
	var repo Repo

	f, err := getRepoPath()
	if err != nil {
		return repo, err
	}

	data, err := ioutil.ReadFile(f)
	if err != nil {
		return repo, err
	}

	err = yaml.Unmarshal(data, &repo)
	if err != nil {
		return repo, err
	}

	for k, v := range repo.Commands {
		v.Name = k
		repo.Commands[k] = v
	}

	return repo, nil
}

func (r Repo) resolve(cmd CommandVersion) *RepoCommand {
	if cmd.hasVersion == false {
		return r.resolveLatest(cmd)
	}

	cmdStr := cmd.toString()

	for k, v := range r.Commands {
		if k == cmdStr {
			return &v
		}
	}

	return nil
}

func (r Repo) resolveLatest(cmd CommandVersion) *RepoCommand {
	var matches []string

	for k := range r.Commands {
		if strings.HasPrefix(k, cmd.command) {
			matches = append(matches, k)
		}
	}

	if len(matches) <= 0 {
		return nil
	}

	sort.Strings(matches)
	match := r.Commands[matches[len(matches)-1]]
	return &match
}
