import fs = require('fs');
import yaml = require('js-yaml');
import cp = require('child_process');
import path = require('path');

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
    
        /*if(resolved == null) {
            console.error('clic: Unknown command: ' + cmdName);
            process.exit(-1)
        }*/
    
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

/*function deleteAlias(aliases : object, cmdToDelete : Command) : boolean {
    var dirty = false;

    for(var alias of Object.keys(aliases)) {
        if(
            // delete "cmd"
            (cmdToDelete.version == undefined && alias == cmdToDelete.name) || 
            // delete "cmd@vers"
            aliases[alias] == cmdToDelete.toString()) {

            delete aliases[alias]
            console.log(`✓ Unpinned alias '${alias}'`)
            dirty = true;
        }
    }

    return dirty;
}*/

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

/*function loadData() : IData {
    var data = yaml.safeLoad(fs.readFileSync(__dirname + '/data.yaml', 'utf8'))
    return data;
}*/

/*
function writeData(data : IData) {
    fs.writeFileSync(__dirname + '/data.yaml', yaml.safeDump(data))
}*/

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

/*
function resolveCommand(cmdName : string) : IResolvedCommand {
    var data = loadData()

    var resolved : IResolvedCommand = 
        data.commands[data.aliases[cmdName]] || data.commands[cmdName];

    if(resolved == null) {
        console.error('clic: Unknown command: ' + cmdName);
        process.exit(-1)
    }

    return resolved;
}*/

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

function run(explain : boolean, args) {
    var cmdName = args[0];
    args = args.slice(1);
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
    runCmd = createCmdLine(img, volumes, workdir, resolved.entrypoint, args, env)

    if(explain) {
        if(buildCmd > '') { console.info(buildCmd) }
        if(runCmd > '') { console.info(runCmd) }
    } else {
        if(buildCmd > '') { exec(buildCmd, false)}
        if(runCmd > '') { exec(runCmd, true)}
    }
}

function link(linkName : string) {
    //resolveCommand(linkName)
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

function unlink(linkName : string) {
    var link = path.join(getClicBin(), linkName)
    if(fs.existsSync(link)) {
        fs.unlinkSync(link)
        console.info(`✓ Deleted symlink ${link}`)
    } else {
        console.info(`✓ Symlink ${link} already removed`)
    }
}

/*function pin(aliasName : string, cmd : Command) { 
    var data = loadData();

    data.aliases[aliasName] = cmd.toString()
    writeData(data)

    console.log(`✓ Pinned alias '${aliasName}' -> ${cmd.toString()}`)
}

function unpin(cmd : Command) {
    var data = loadData();
    
    let dirty = deleteAlias(data.aliases, cmd)

    if(dirty) {
        writeData(data)
    }
}*/

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

function install(cmdName : string) {
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
            link(highest.toString())
            data.installCommand(highest, repoCmd)
        }
    }
}

function uninstall(text : string) {
    var data = new Data()
    var cmd = new Command(text)

    let addUnlink = data.aliases[cmd.name];

    data.unpin(cmd)
    data.uninstallCommand(cmd)
    unlink(text)

    if(addUnlink) {
        unlink(addUnlink)
    }
}

var args = process.argv.slice(2)
var command = args[0];
args = args.slice(1)

switch(command) {
    case 'install':
        install(args[0])
        break;

    case 'uninstall':
        uninstall(args[0])
        break;

    case 'link':
        link(args[0])
        break;

    case 'unlink':
        unlink(args[0])
        break;

    case 'run':
        run(false, args)
        break;
    
    case 'explain':
        run(true, args)
        break;

    default:
        console.log("Usage: ")
        console.log("  clic run <cmd@...> <args>")
        console.log("")
        console.log("  clic install")
        console.log("  clic install cmd<@...>")
}