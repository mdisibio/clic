package main

import (
	"io/ioutil"
	"sort"
	"strings"

	"gopkg.in/yaml.v2"
)

// RepoCommand is an entry in the repo file
type RepoCommand struct {
	Name       string
	Image      string
	Dockerfile string
	Workdir    string
	Entrypoint string
	Fixttydims bool
	Volumes    []string
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
