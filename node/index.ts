import fs = require('fs');
import yaml = require('js-yaml');
import cp = require('child_process');
import path = require('path');


interface IData {
    aliases: Map<string, string>
    commands: Map<string, IResolvedCommand>
}
interface IResolvedCommand {
    workdir : string
    image : string
    dockerfile: string
    entrypoint : string
    volumes: string[]
    fixttydims: boolean
}

function loadData() : IData {
    var data = yaml.safeLoad(fs.readFileSync(__dirname + '/data.yaml', 'utf8'))
    return data;
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

    console.info(`Command ${linkName} linked as ${link}`)
}

function unlink(linkName : string) {
    var link = path.join(getClicBin(), linkName)
    if(fs.existsSync(link)) {
        fs.unlinkSync(link)
        console.info(`${link} unlinked`)
    } else {
        console.info(`Command ${linkName} not linked`)
    }
}

function installClic() {
    console.info('Setting up clic home folder')
    var home = getClicHome()
    if(!fs.existsSync(home)) {
        fs.mkdirSync(home)
        console.info(`...Created ${home}`)
    } else {
        console.info(`...Already exists`)
    }

    console.info('Setting up clic bin folder')
    var bin = getClicBin()
    if(!fs.existsSync(bin)) {
        fs.mkdirSync(bin)
        console.info(`...Created ${bin}`)
    } else {
        console.info(`...Already exists`)
    }

    // Add folders to the path
    let bash_profile = getUserHome() + path.sep + '.bash_profile'
    if(fs.existsSync(bash_profile)) {
        var content = fs.readFileSync(bash_profile, 'utf-8');
        if(content.search(bin) == -1) {
            console.info(`Adding clic bin path to ${bash_profile}`)
            let line = `export PATH="$PATH:${bin}"\n`
            fs.appendFileSync(bash_profile, line);
        } else {
            console.info(`Clic bin path already present in ${bash_profile}`)
        }
    }
}

function install(cmdName : string) {
    if(cmdName == 'clic' || cmdName == '' || cmdName == undefined) {
        installClic()
    } else {
        console.warn(`Unsupported install for command: ${cmdName}`)
    }
}

var args = process.argv.slice(2)
var command = args[0];
args = args.slice(1)

switch(command) {
    case 'install':
        install(args[0])
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
        console.log("Usage: clic run <cmd@...> <args>")
}