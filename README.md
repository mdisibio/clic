# clic
Clic is a apt-like platform for command line applications in pre-containerized form.  This makes commands simple to add and remove leaving minimum alterations to the underlying system.  Additionally it is possible to install multiple versions side by side without conflict.   Installed apps appear as native commands via symlinks in a folder added to $PATH.

### Usage
Install latest version of a command:
```
$ clic install terraform
$ terraform ...
```

Install a specific version of a command, which is runnable afterwards via command@version
```
$ clic install terraform@0.11.13
$ terraform@0.11.13 ...
```

Uninstall:
```
$ clic uninstall terraform
```

See what is happening behind the scenes by explaining a command:
```
$ clic explain terraform apply
docker run -i --rm -t -v ~:/root -w /root/... hashicorp/terraform:0.12.8 apply
```

All commands:
* ls  - Show installed commands and aliases
* run - Run a command manually instead of through symlink and without installing

# Repository
The repository of known commands is maintained in this repo.  Entries are manually curated for trustworthiness and functionality.  Please submit merge requests for additional   

# Future ideas:
* Ability pin a folder to a specific version of a tool, i.e. `clic pin terraform@0.11.13`
* Support for custom repositories
* Search and list the repository
