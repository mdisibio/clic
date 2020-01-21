import fs = require('fs');
import yaml = require('js-yaml');
import cp = require('child_process');
import path = require('path');
import parseArgs = require('minimist')

interface IResolvedCommand {
    workdir : string
    image : string
    dockerfile: string
    entrypoint : string
    volumes: string[]
    fixttydims: boolean
}

class Repo {
    data : any;

    load() {
        if(this.data == undefined) {
            this.data = yaml.safeLoad(fs.readFileSync(__dirname + '/repo.yaml', 'utf8'))
        }
    }
    
    resolveCommand(cmd : Command) : IResolvedCommand {
        this.load();
        return this.data.commands[cmd.toString()];
    }

    getHighest(cmd : Command) : Command {
        this.load();

        var maxStr = Object.keys(this.data.commands)
            .filter(c => c.startsWith(cmd.name + "@") || c == cmd.name)
            .sort((a, b) => a > b ? -1 : 1)
            [0];
    
        if(maxStr == undefined) {
            return undefined
        }

        return new Command(maxStr)
    }
}

class Data {
    data : any

    constructor() {
        this.load();
    }

    get aliases() {
        return this.data.aliases
    }

    get commands() {
        return this.data.commands
    }

    load() {
        if(this.data == undefined) {
            this.data = yaml.safeLoad(fs.readFileSync(__dirname + '/data.yaml', 'utf8'))

            if(this.data.aliases == undefined || this.data.aliases == null) 
                this.data.aliases = {}
            if(this.data.commands == undefined || this.data.commands == null)
                this.data.commands = {}
        }
    }

    save() {
        if(this.data != undefined) {
            fs.writeFileSync(__dirname + '/data.yaml', yaml.safeDump(this.data, {
                sortKeys: true
            }))
        }
    }

    deleteAlias(cmdToDelete : Command) : boolean {
        var dirty = false;

        this.load()

        for(var alias of Object.keys(this.data.aliases)) {
            if(
                // delete "cmd"
                (cmdToDelete.version == undefined && alias == cmdToDelete.name) || 
                // delete "cmd@vers"
                this.data.aliases[alias] == cmdToDelete.toString()) {

                delete this.data.aliases[alias]
                console.log(`✓ Unpinned alias '${alias}'`)
                dirty = true;
            }
        }

        return dirty;
    }

    resolveCommand(cmdName : string) : IResolvedCommand {
        this.load()
    
        var resolved : IResolvedCommand = 
            this.data.commands[this.data.aliases[cmdName]] || this.data.commands[cmdName];
    
        return resolved;
    }

    pin(aliasName : string, cmd : Command) { 
        this.load()
    
        this.data.aliases[aliasName] = cmd.toString()
        this.save()
    
        console.log(`✓ Pinned alias '${aliasName}' -> ${cmd.toString()}`)
    }
    
    unpin(cmd : Command) {
        this.load()
        
        let dirty = this.deleteAlias(cmd)
    
        if(dirty) {
            this.save()
        }
    }

    installCommand(version: Command, cmd: IResolvedCommand) {
        this.data.commands[version.toString()] = cmd;
        this.save();
    }

    uninstallCommand(version: Command) {
        let s = version.toString()

        if(this.data.commands[s]) {
            delete this.data.commands[s]
            this.save()
        }
    }
}

class Command {
    name : string
    version? : string

    constructor(s : string) {
        var parts = s.split("@");
        this.name = parts[0]
        if(parts.length > 1) {
            this.version = parts[1]
        }
    }

    toString() : string {
        return this.name + (this.version ? `@${this.version}` : '')
    }
}

function createCmdLine(
    image: string, 
    volumes: any[], 
    workdir: string, 
    entrypoint: string,
    args: string[],
    env: Map<string,string>) 
{
    var commandLine = "docker run -i";

    if(process.stdin.isTTY || process.stdout.isTTY) {
        commandLine += "t"
    }

    volumes = volumes || []
    volumes.forEach(v => {
        commandLine += " -v " + v
    })

    if(workdir > '') {
        commandLine += " -w " + workdir
    }

    if(entrypoint > '') {
        commandLine += " --entrypoint " + entrypoint
    }

    env.forEach((v,k) => {
        commandLine += ` -e ${k}="${v}"`
    })

    commandLine += " " + image

    args.forEach(a => {
        commandLine += " " + a
    })

    return commandLine
}

function exec(cmdLine : string, exit : boolean) {
    var code = 0;

    try {
        cp.execSync(cmdLine, {
            stdio: "inherit"
        })
    } catch(error) {
        code = error.status
    }

    if(exit) {
        process.exit(code)
    }
}

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function getClicHome() {
    return getUserHome() + path.sep + '.clic'
}

function getClic() {
    return __dirname + '/clic.sh'
}

function getClicBin() {
    return getClicHome() + path.sep + 'bin'
}

function determineVolumes(command : IResolvedCommand) {
    var volumes = command.volumes || []
    var finalWorkDir = ''

    if(command.workdir > '') {
        var home = getUserHome()
        var p = path.relative(home, process.cwd())
        volumes.push(home + ":" + command.workdir)
        finalWorkDir = path.join(command.workdir, p)
    }

    return {
        volumes: volumes,
        workdir: finalWorkDir 
    }
}

function determineEnv(command : IResolvedCommand) : Map<string,string> {
    var env = new Map<string,string>()

    if(command.fixttydims) {
        env.set('COLUMNS', '`tput cols`')
        env.set('LINES', '`tput lines`')
    }

    return env;
}

function imageExists(img : string) : boolean {
    var s = cp.execSync(`docker images -q ${img}`)
    return s.length > 0;
}

function run(args) {
    if(args.help) {
        if(args.explain) {
            console.log()
            console.log("Usage:  clic explain <command>[@version] ARGS")
            console.log()
            console.log("Show statements that will be executed when running a command.")
        } else {
            console.log()
            console.log("Usage:  clic run <command>[@version] ARGS")
            console.log()
            console.log("Run a command explicitly instead of through shell alias.")
        }
        return;
    }

    let cmdName = args._[0];
    let cmdArgs = args._.slice(1);
    let data = new Data()
    var resolved = data.resolveCommand(cmdName)

    if(resolved == null) {
        console.error('clic: Unknown command: ' + cmdName);
        process.exit(-1)
    }

    var buildCmd;
    var runCmd;
    var img;

    if(resolved.dockerfile > '') {
        img = `${cmdName}:latest`
        if(!imageExists(img)) {
            var dockerFullPath = path.resolve(__dirname, resolved.dockerfile)
            buildCmd = `docker build -t ${img} - < ${dockerFullPath}`
        }
    } else if(resolved.image > '') {
        img = resolved.image;
    } else {
        console.error(`Command ${cmdName} is invalid`)
        return;
    }

    let {volumes, workdir} = determineVolumes(resolved)
    let env = determineEnv(resolved)
    runCmd = createCmdLine(img, volumes, workdir, resolved.entrypoint, cmdArgs, env)

    if(args.explain) {
        if(buildCmd > '') { console.info(buildCmd) }
        if(runCmd > '') { console.info(runCmd) }
    } else {
        if(buildCmd > '') { exec(buildCmd, false)}
        if(runCmd > '') { exec(runCmd, true)}
    }
}

function linkCommand(args) {
    if(args.help) {
        console.log()
        console.log("Usage:  clic link command<@version>")
        console.log()
        console.log("Create symbolic links for shell alias")
        return;
    }

    link(args._[0])
}

function link(linkName : string) {

    let cmd = new Command(linkName)
    let repo = new Repo()
    let resolved = repo.resolveCommand(cmd) || repo.getHighest(cmd)
    if(resolved == null) {
        console.error('clic: Unknown command: ' + linkName);
        process.exit(-1)
    }

    var clic = getClic();
    var link = path.join(getClicBin(), linkName)

    if(fs.existsSync(link)) {
        fs.unlinkSync(link)
    }
    fs.symlinkSync(clic, link)

    console.info(`✓ Created symlink: ${link}`)
}

function unlinkCommand(args) {
    if(args.help) {
        console.log()
        console.log("Usage:  clic unlink command<@version>")
        console.log()
        console.log("Delete symbolic links for given command")
        return;
    }

    unlink(args._[0])
}

function unlink(linkName : string) {
    var link = path.join(getClicBin(), linkName)
    if(fs.existsSync(link)) {
        fs.unlinkSync(link)
        console.info(`✓ Deleted symlink ${link}`)
    } else {
        console.info(`✓ Symlink ${link} already removed`)
    }
}

function installClic() {
    var home = getClicHome()
    if(!fs.existsSync(home)) {
        fs.mkdirSync(home)
        console.info(`...Created ${home}`)
    }
    console.log(`✓ clic home created: ${home}`)

    var bin = getClicBin()
    if(!fs.existsSync(bin)) {
        fs.mkdirSync(bin)
    }
    console.log(`✓ clic bin created: ${bin}`)

    // Add folders to the path
    let bash_profile = getUserHome() + path.sep + '.bash_profile'
    if(fs.existsSync(bash_profile)) {
        var content = fs.readFileSync(bash_profile, 'utf-8');
        if(content.search(bin) == -1) {
            let line = `export PATH="$PATH:${bin}"\n`
            fs.appendFileSync(bash_profile, line);
        }
        console.log(`✓ clic bin added to ${bash_profile}`)
    }
}

function install(args) {
    if(args.help) {
        console.log()
        console.log("Usage:  clic install <command>[@version]")
        console.log()
        console.log("Install a command.  Installs latest version by default")
        return;
    }

    let cmdName = args._[0]

    if(cmdName == 'clic' || cmdName == '' || cmdName == undefined) {
        installClic()
    } else {
        var data = new Data();
        var repo = new Repo();

        var cmd = new Command(cmdName)
        if(cmd.version) {
            // clic install cmd@ver
            
            let repoCmd = repo.resolveCommand(cmd)
            if(repoCmd == undefined) {
                throw new Error(`Unknown command ${cmdName}`)
            }

            var currentAlias = data.aliases[cmd.name]
            if(currentAlias > '') {
                let alias = new Command(currentAlias)
                if(alias.version > '') {
                    if(cmd.version >= alias.version) {
                        console.log(`Updating previously pinned version ${alias.version} to ${cmd.version}`)
                        data.pin(cmd.name, cmd)
                        link(cmd.name)
                    } else {
                        console.log(`Command '${cmd.name}' already aliased to a higher version ${alias.version}. Not changing alias`)
                    }
                }
            } else {
                // Not aliased already, so just pin it.
                data.pin(cmd.name, cmd)
                link(cmd.name)
            }

            link(cmdName)
            data.installCommand(cmd, repoCmd)
        } else {
            // clic install cmd
            // Find highest version
            
            let highest = repo.getHighest(cmd);

            if(highest == undefined) {
                throw new Error(`Unknown command ${cmdName}`)
            }

            let repoCmd = repo.resolveCommand(highest)

            console.log(`Installing latest version: ${highest.toString()}`)

            data.pin(cmd.name, highest)
            link(cmd.name)
            if(cmd.name != highest.toString()) {
                link(highest.toString())
            }
            data.installCommand(highest, repoCmd)
        }
    }
}

function uninstallCommand(text : string) {
    var data = new Data()
    var cmd = new Command(text)

    if(cmd.version) {
        // Uninstall specific version
        console.info(`Uninstalling: ${cmd.toString()}`)

        // Uninstall main command
        data.uninstallCommand(cmd)
        unlink(cmd.toString())

        // Delete alias if a match
        let alias = data.aliases[cmd.name]
        if(alias == cmd.toString()) {
            data.unpin(cmd)
            unlink(cmd.name)
        }

        data.save()
    } else {
        // Uninstall unversioned
        // Determine version from the alias
        let alias = data.aliases[cmd.name]
        if(alias > '') {
            console.info(`Uninstalling: ${text} and ${alias}`)
            data.unpin(cmd)
            data.uninstallCommand(alias)
            unlink(cmd.name)
            if(alias != cmd.name) {
                unlink(alias)
            }
            data.save()
        } else {
            // No alias, look for orphaned command
            var orphanedCommand = data.commands[cmd.toString()]
            if(orphanedCommand != null) {
                console.info(`Uninstalling: ${cmd.toString()}`)
                data.uninstallCommand(cmd)
                unlink(cmd.toString())
                data.save()
            } else {
                console.info(`Not installed: ${text}`)
            }
        }
    }
}

function uninstallAll() {
    var data = new Data()

    for(var command in data.commands) {
        uninstallCommand(command)
    }

    data = new Data()
    for(var alias in data.aliases) {
        data.unpin(new Command(alias))
    }

    data.save()
}

function uninstall(args) {
    if(args.help) {
        console.log()
        console.log("Usage:  clic uninstall <command>[@version]")
        console.log()
        console.log("Uninstall a command")
        return;
    }

    if(args.all) {
        uninstallAll()
    } else {
        uninstallCommand(args._[0])
    }
}

function list(args) {
    if(args.help) {
        console.log()
        console.log("Usage:  clic ls")
        console.log()
        console.log("List installed commands and aliases")
        return;
    }

    var data = new Data()

    console.info("")
    console.info("Installed commands:")
    for(var command in data.commands) {
        console.info(" " + command)
    }

    console.info("")
    console.info("Aliases:")
    for(var alias in data.aliases) {
        console.info(` ${alias} -> ${data.aliases[alias]}`)
    }

    console.info("")
}

let command = process.argv[2]
var args = parseArgs(process.argv.slice(3), {stopEarly: true})

switch(command) {
    case 'install':
        install(args)
        break;

    case 'uninstall':
        uninstall(args)
        break;

    case 'ls':
        list(args)
        break;

    case 'link':
        linkCommand(args)
        break;

    case 'unlink':
        unlinkCommand(args)
        break;

    case 'run':
        run(args)
        break;
    
    case 'explain':
        args.explain = true
        run(args)
        break;

    default:
        console.log()
        console.log("Usage: clic COMMAND [ARGS] ")
        console.log()
        console.log("Commands:")
        console.log("  explain    Show statements that will be executed when running a command")
        console.log("  install    Install command or clic itself")
        console.log("  link       Create a shell alias")
        console.log("  ls         List installed commands")
        console.log("  run        Run a command explicitly without a shell alias")
        console.log("  uninstall  Uninstall command")
        console.log("  unlink     Delete a shell alias")
        console.log()
        console.log("Run 'clic COMMAND --help' for more information on a command.")
}