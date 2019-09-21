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
    args: string[]) 
{
    var commandLine = "docker run -i";

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

    commandLine += " " + image

    args.forEach(a => {
        commandLine += " " + a
    })

    return commandLine
}

function exec(cmdLine : string, exit : boolean) {
    var proc = cp.exec(cmdLine)
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    process.stdin.pipe(proc.stdin);

    if(exit) {
        proc.on('close', (code) => {
            process.exit(code)
        });
    }
}

function resolveCommand(cmdName : string) : IResolvedCommand {
    var data = loadData()

    var resolved : IResolvedCommand = 
        data.commands[data.aliases[cmdName]] || data.commands[cmdName];

    if(resolved == null) {
        console.error('Unknown command: ' + cmdName);
        process.exit(-1)
    }

    return resolved;
}

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
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

function run(explain : boolean, args) {
    var cmdName = args[0];
    args = args.slice(1);
    var resolved = resolveCommand(cmdName)

    var buildCmd;
    var runCmd;

    if(resolved.dockerfile > '') {
        var dockerFullPath = path.resolve(__dirname, resolved.dockerfile)
        buildCmd = `docker build -t ${cmdName} - < ${dockerFullPath}`

        let {volumes, workdir} = determineVolumes(resolved)
        runCmd = createCmdLine(cmdName, volumes, workdir, resolved.entrypoint, args)

    } else if(resolved.image > '') {

        let {volumes, workdir} = determineVolumes(resolved)
        runCmd = createCmdLine(resolved.image, volumes, workdir, resolved.entrypoint, args)

    } else {
        console.error(`Command ${cmdName} is invalid`)
        return;
    }

    if(explain) {
        if(buildCmd > '') { console.info(buildCmd) }
        if(runCmd > '') { console.info(runCmd) }
    } else {
        if(buildCmd > '') { exec(buildCmd, false)}
        exec(runCmd, true);
    }
}

function link(linkName : string) {
    var clic = path.join(__dirname, 'clic.sh')
    var link = path.join('/usr/local/bin', linkName)

    if(fs.existsSync(link)) {
        fs.unlinkSync(link)
    }
    fs.symlinkSync(clic, link)

    console.info(`Command ${linkName} linked as ${link}`)
}

function unlink(linkName : string) {
    var link = path.join('/usr/local/bin', linkName)
    if(fs.existsSync(link)) {
        fs.unlinkSync(link)
        console.info(`${link} unlinked`)
    } else {
        console.info(`Command ${linkName} not linked`)
    }
}

function install(cmdName : string) {
    if(cmdName == 'clic') {
        link('clic')
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
