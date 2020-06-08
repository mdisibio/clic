# clic
[![Go Report Card](https://goreportcard.com/badge/github.com/mdisibio/clic)](https://goreportcard.com/report/github.com/mdisibio/clic)

Clic is like apt but all command line applications are pre-containerized.  This makes it easy to add and remove applications, avoiding
common issues with operating system or other library dependencies.  Basic docker is all that is required.  Additionally it is possible
to install versions side by side without conflict.  For optimal user experience, installed apps look and function like native commands
via symlinks in the $PATH.

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

Other commands:
* fetch - Fetch latest command definitions from this repository
* ls  - Show installed commands and aliases
* run - Run a command manually instead of through symlink and without installing
* upgrade - Upgrade an installed command to the latest available version

### Build 
Cross-compile for all supported operating systems by running:
```
docker-compose run build
```
Output binaries are placed in the ./bin/ folder.

### Test
The full test suite can be run natively with npm. Beware, these tests alter the test machine
including uninstalling all commands.  This method requires Node.js, npm, and docker to be installed on the test machine, as well 
as the clic executable to be in the $PATH.
```
cd test
npm run test
```

Tests can instead be run containerized with the exception of a few volume mount tests. This method does not alter the test machine, and only requires docker to be installed.  Build must be done first.
```
docker-compose run build
docker-compose run test
```

# Repository
The repository of known commands is maintained in this repo.  Entries are manually curated for trustworthiness and functionality.  Please submit merge requests for additional entries.

# Future enhancements:
* Windows support
* Ability pin a folder to a specific version of a tool, i.e. `clic pin terraform@0.11.13`. The correct command version is chosen based on $PWD
* Support for custom repositories, or custom command definitions.
* Search and list the repository

# Remaining work
* Linux user/group permissions?
