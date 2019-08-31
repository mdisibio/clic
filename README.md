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


# Example commands:

`cc install git`

`cc install terraform`

`cc install terraform@0.12`

`cc uninstall terraform`

`cc upgrade terraform`

`cc ls`   <--- list installed

`cc search terraform*` <--- search registry

`terraform <args>`     <-- runs in docker

`terraform@0.12 <args>`   <-- runs in docker

`which terraform` ->  `/usr/local/bin/cc/terraform/0.12/entrypoint.sh`   (or something)

`cc pin terraform@0.12`   <-- creates .ccprefs file and now "terraform" in this folder always points to 0.12
