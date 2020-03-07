package main

import (
	"io/ioutil"
	"os"

	"gopkg.in/yaml.v2"
)

// Data The contents of the data file
type Data struct {
	Aliases  map[string]string
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
			d.Aliases = make(map[string]string)
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

func (d *Data) installCommand(cmd RepoCommand) error {
	d.Commands[cmd.Name] = cmd
	return d.save()
}

/*func (d *Data) setAlias(alias string, cmd CommandVersion) error {

}*/
