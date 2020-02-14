# clic
Clic is a apt-like platform for command line applications in pre-containerized form.  This makes commands easy to install and remove leaving little trace.  Additionally it is trivial to install multiple versions side by side.   Installed apps run seamlessly in docker via symlinks in a folder added to $PATH.

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

See what is happening behind the scenes by `explain`ing any command:
```
$ clic explain terraform apply
docker run -i --rm -t -v ~:/root -w /root/... hashicorp/terraform:0.12.8 apply
```

Other commands:
* ls  - Show installed commands and aliases
* run - Run a command manually instead of through symlink

`clic install git`

`clic install terraform`

`clic install terraform@0.12`

`clic uninstall terraform`

`clic upgrade terraform`

`clic ls`   <--- list installed

`clic search terraform*` <--- search registry

# Repository
The repository contains a list of curated entries maintained in this repo.  Containers are chosen based on trust or official releases. 

# Ideas:
* wrap command line tools in docker and run them seamlessly
* commands work identical to regular versions but are aliases to running them in docker
* Have a registry of curated packages 
* Curated packages contain default settings like:
  * folders that are automounted, like the current folder, or $HOME/cache/ or something
  * which existing container or Dockerfile to use

* Install multiple versions side by side, and they are differentiated with command@v1.2.3 or something
* Be able to pin a certain version of a tool in a folder, which can be different than the main version

* Automatically setup and delete aliases when installing/uninstalling packages
* Things should be sane, and for troubleshooting you should be able to run `which command` and
  have it show you something that makes sense
  
* Ability to install and run custom containers, i.e. VIM container with a bunch of plugins


# Example commands:

`clic install git`

`clic install terraform`

`clic install terraform@0.12`

`clic uninstall terraform`

`clic upgrade terraform`

`clic ls`   <--- list installed

`clic search terraform*` <--- search registry

`terraform <args>`     <-- runs in docker

`terraform@0.12 <args>`   <-- runs in docker

`clic run terraform <args>` <-- runs in docker

`which terraform` ->  `/usr/local/bin/cc/terraform/0.12/entrypoint.sh`   (or something)

`clic pin terraform@0.12`   <-- creates .ccprefs file and now "terraform" in this folder always points to 0.12

# Cool commands that would benefit from this
* kubectl
* kubeadm
* vim (with plugins)
* terraform
* awslogs
* aws cli
* anisble
* go
* python@someVer
