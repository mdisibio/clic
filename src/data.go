package main

import (
	"io/ioutil"
	"os"
	"sort"
	"strings"

	"gopkg.in/yaml.v2"
)

// Data The contents of the data file
type Data struct {
	Commands map[string]RepoCommand
}

func loadData() (Data, error) {
	var d Data

	f, err := getDataPath()
	if err != nil {
		return d, err
	}

	data, err := ioutil.ReadFile(f)
	if err != nil {
		if os.IsNotExist(err) {
			d.Commands = make(map[string]RepoCommand)
			return d, nil
		}
		return d, err
	}

	err = yaml.Unmarshal(data, &d)
	if err != nil {
		return d, err
	}

	return d, nil
}

func (d *Data) save() error {
	f, err := getDataPath()
	if err != nil {
		return err
	}

	data, err := yaml.Marshal(*d)
	if err != nil {
		return err
	}

	return ioutil.WriteFile(f, data, 0600)
}

func (d *Data) resolve(cmd CommandVersion) *RepoCommand {

	if cmd.hasVersion == false {
		return d.resolveLatest(cmd)
	}

	cmdStr := cmd.toString()

	v, ok := d.Commands[cmdStr]
	if ok {
		return &v
	}

	return nil
}

func (d Data) resolveLatest(cmd CommandVersion) *RepoCommand {
	var matches []string

	for k := range d.Commands {
		if strings.HasPrefix(k, cmd.command) {
			matches = append(matches, k)
		}
	}

	if len(matches) <= 0 {
		return nil
	}

	sort.Strings(matches)
	match := d.Commands[matches[len(matches)-1]]
	return &match
}

func (d *Data) installCommand(cmd RepoCommand) error {
	d.Commands[cmd.Name] = cmd
	return d.save()
}

func (d *Data) uninstallCommand(cmd CommandVersion) error {
	delete(d.Commands, cmd.toString())
	return d.save()
}

func (d *Data) sortedCommands() []string {
	var keys []string
	for k := range d.Commands {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func (d *Data) sortedHighestCommands() []RepoCommand {
	var highest map[string]RepoCommand
	highest = make(map[string]RepoCommand)

	for k := range d.Commands {
		vers := parseCommand(k)
		if val, ok := highest[vers.command]; ok == false || k > val.Name {
			highest[vers.command] = d.Commands[k]
		}
	}

	var sorted []string
	for k := range highest {
		sorted = append(sorted, k)
	}
	sort.Strings(sorted)

	var sortedCommands []RepoCommand
	for _, k := range sorted {
		sortedCommands = append(sortedCommands, highest[k])
	}

	return sortedCommands
}
