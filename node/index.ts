import fs = require('fs');
import yaml = require('js-yaml');
import cp = require('child_process');
import path = require('path');

interface IData {
    aliases: Map<string, string>
    commands: Map<string, IResolvedCommand>
}
interface IResolvedCommand {
    workdir: string
    image: string
}

function loadData() : IData {
    var data = yaml.safeLoad(fs.readFileSync(__dirname + '/data.yaml', 'utf8'))
    return data;
}

function createCmdLine(
    image: string, 
    volumes: any[], 
    workdir: string, 
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

    commandLine += " " + image

    args.forEach(a => {
        commandLine += " " + a
    })

    return commandLine
}

function exec(cmdLine : string) {
    var proc = cp.exec(cmdLine)
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    process.stdin.pipe(proc.stdin);

    proc.on('close', (code) => {
        process.exit(code)
    });
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
    var volumes = []
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
    let {volumes, workdir} = determineVolumes(resolved)
    var cmdLine = createCmdLine(resolved.image, volumes, workdir, args)

    if(explain) {
        console.info(cmdLine);
    } else {
        exec(cmdLine);
    }
}

var args = process.argv.slice(2)
var command = args[0];
args = args.slice(1)

switch(command) {
    case 'run':
        run(false, args)
        break;
    
    case 'explain':
        run(true, args)
        break;

    default:
        console.log("Usage: clic run <file.yaml>")
}

