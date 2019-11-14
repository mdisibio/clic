import fs = require('fs');
import yaml = require('js-yaml');
import cp = require('child_process');
import path = require('path');


interface IData {
    aliases: object
    commands: object
}
interface IResolvedCommand {
    workdir : string
    image : string
    dockerfile: string
    entrypoint : string
    volumes: string[]
    fixttydims: boolean
}

function deleteAlias(aliases : object, cmdToDelete : Command) : boolean {
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
        return this.name + this.version ? `@${this.version}` : ''
    }
}

function loadData() : IData {
    var data = yaml.safeLoad(fs.readFileSync(__dirname + '/data.yaml', 'utf8'))
    return data;
}

function writeData(data : IData) {
    fs.writeFileSync(__dirname + '/data.yaml', yaml.safeDump(data))
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

function resolveCommand(cmdName : string) : IResolvedCommand {
    var data = loadData()

    var resolved : IResolvedCommand = 
        data.commands[data.aliases[cmdName]] || data.commands[cmdName];

    if(resolved == null) {
        console.error('clic: Unknown command: ' + cmdName);
        process.exit(-1)
    }

    return resolved;
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

function run(explain : boolean, args) {
    var cmdName = args[0];
    args = args.slice(1);
    var resolved = resolveCommand(cmdName)

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
    resolveCommand(linkName)

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

function pin(unversioned : string, versioned : string) { 
    var data = loadData();

    data.aliases[unversioned] = versioned
    writeData(data)

    console.log(`✓ Pinned alias '${unversioned}' -> ${versioned}`)
}

function unpin(cmd : Command) {
    var data = loadData();
    
    let dirty = deleteAlias(data.aliases, cmd)

    if(dirty) {
        writeData(data)
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

function install(cmdName : string) {
    if(cmdName == 'clic' || cmdName == '' || cmdName == undefined) {
        installClic()
    } else {
        var data = loadData()

        var cmd = new Command(cmdName)
        if(cmd.version) {
            // clic install cmd@ver
            var currentAlias = data.aliases[cmd.name]
            if(currentAlias > '') {
                let aliasParts = currentAlias.split('@')
                if(aliasParts.length == 2) {
                    if(cmd.version >= aliasParts[1]) {
                        console.log(`Updating previously pinned version ${aliasParts[1]} to ${cmd.version}`)
                        pin(cmd.name, cmdName)
                        link(cmd.name)
                    } else {
                        console.log(`Command '${cmd.name}' already aliased to a higher version ${aliasParts[1]}. Not changing alias`)
                    }
                }
            } else {
                pin(cmd.name, cmdName)
                link(cmd.name)
            }

            link(cmdName)
        } else {
            // clic install cmd
            // Find highest version
            
            var max = Object.keys(data.commands)
                .filter(c => c.startsWith(cmd.name + "@"))
                .sort((a, b) => a > b ? -1 : 1)
                [0];

            console.log(`Installing latest version: ${max}`)

            pin(cmd.name, max)
            link(cmd.name)
            link(max)
        }
    }
}

function uninstall(text : string) {
    var data = loadData()
    var cmd = new Command(text)

    let addUnlink = data.aliases[cmd.name];

    unpin(cmd)
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