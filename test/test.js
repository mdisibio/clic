var fs = require('fs')
var assert = require('assert')
var cp = require('child_process')
var path = require('path')

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function getClicHome() {
    return getUserHome() + path.sep + '.clic'
}

function getBin(cmdName) {
    return getClicHome() + path.sep + 'bin' + path.sep + cmdName
}

function assertBinExists(cmdName) {
    assert(fs.existsSync(getBin(cmdName)))
}

function assertBinDoesNotExist(cmdName) {
    assert(fs.existsSync(getBin(cmdName)) == false)
}

function exec(cmd, check = true) {
    try {
        //console.error("     " + cmd)
        var stdout = cp.execSync(cmd).toString()
        return {
            stdout: stdout, 
            exitCode: 0
        }
    } catch(error) {
        if(check) {
            assert.fail(`Command '${cmd}' exited with code ${error.status}`)
        } else {
            return {
                stdout: error.stdout.toString(),
                exitCode: error.status
            }
        }
    }
}

describe('clic install', function() {
    this.timeout(10000)

    it('can install', () => {
        exec('clic install')
    })

    it('can install clic', function() {
        exec('clic install clic')
    })

    it('can install cmd', () => {
        exec('clic install terraform')
        let {stdout} = exec(getBin('terraform') + ' --version')
        assert(stdout.match(/Terraform v0.12.8/gi))
    })

    it('can install cmd@vers', () => {
        exec('clic install terraform@0.11.13')
        let {stdout} = exec(getBin('terraform@0.11.13') + ' --version')
        assert(stdout.match(/Terraform v0.11.13/gi))
    })

    it('can uninstall cmd', () => {
        exec('clic uninstall terraform')
        assertBinDoesNotExist('terraform')
        assertBinDoesNotExist('terraform@0.12.8')
    })

    it('can uninstall cmd@vers', () => {
        exec('clic uninstall terraform@0.11.13')
        assertBinDoesNotExist('terraform@0.11.13')
    })

    it('can uninstall --all', () => {
        exec('clic install terraform')
        assertBinExists('terraform')
        exec('clic uninstall --all')
        assertBinDoesNotExist('terraform')

        let {stdout} = exec('clic ls')
        assert.equal(stdout.match(/terraform/gi), null)
    })

    it('can run installed command', () => {
        exec('clic install hello-world')
        exec('hello-world')
    })

    it('automatically aliases when there isnt one', () => {
        exec('clic uninstall terraform')
        exec('clic uninstall terraform@0.11.13')

        exec('clic install terraform')
        assertBinExists('terraform')
    })

    it('upgrades alias when installing a higher version', () => {
        exec('clic uninstall terraform')
        exec('clic uninstall terraform@0.11.13')

        exec('clic install terraform@0.11.13')
        exec('clic install terraform')

        let {stdout} = exec(getBin('terraform') + ' --version')
        assert(stdout.match(/Terraform v0.12.8/gi))
    })
})

describe('clic link', function() {
    this.timeout(10000)
    
    it('can unlink', () => {
        exec('clic unlink hello-world')
        assertBinDoesNotExist('hello-world')
    })

    it('can link', () => {
        exec('clic link hello-world')
        assertBinExists('hello-world')
    })

    it('doesn\'t link unknown command', () => {
        let {exitCode} = exec('clic link asdf', false)
        assert.equal(exitCode, 255)
    })
})

describe('clic run', function() {
    this.timeout(10000)

    it('captures stdout', () => {
        exec('clic install hello-world')
        let {stdout} = exec('clic run hello-world')
        assert(stdout.match(/Hello from Docker/gi))
    })

    it('captures stdin', () => {
        exec('clic install alpine')
        let {stdout} = exec('echo "hello world" | clic run alpine cat /dev/stdin')
        assert(stdout.match(/hello world/gi))
    })

    it('captures exit code', () => {
        exec('clic install alpine')
        let {exitCode} = exec('clic run alpine false', false)
        assert.equal(exitCode, 1)
    })

    it('can run specific versions', () => {
        let {stdout} = exec('clic run alpine@3.10.0 cat /etc/alpine-release')
        assert.equal(stdout, "3.10.0\n")
    })

    it('can run without a version', () => {
        exec('clic install alpine')
        exec('clic run alpine')
    })

    it('mounts the current folder', () => {
        let {stdout} = exec('clic run alpine ls test.js')
        assert(stdout.match(/test.js/gi))
    })

    it('mounts the parent folder', () => {
        let {stdout} = exec('clic run alpine ls ..')
        assert(stdout.match(/test/gi))
    })

    it('runs tool with dockerfile', () => {
        exec('clic install nsnake')
        let {stdout} = exec('clic run nsnake --version')
        assert(stdout.match(/nsnake v3/gi))
    })

})

describe('clic ls', function() {
    this.timeout(10000)

    it('can ls', () => {
        exec('clic uninstall --all')
        exec('clic install alpine@3.10.0')
        let {stdout} = exec('clic ls')
        assert.equal(stdout,
            "\nInstalled commands:\n alpine@3.10.0\n\nAliases:\n alpine -> alpine@3.10.0\n\n")
    })
})

describe('clic help', function() {
    
    let commands = [
        'explain',
        'install',
        'ls',
        'link',
        'run',
        'uninstall',
        'unlink'
    ]

    commands.forEach((cmd) => {
        it(`it can ${cmd} --help`, () => {
            let {stdout} = exec(`clic ${cmd} --help`)
            let r = new RegExp(`Usage:  clic ${cmd}`, "g");
            assert(stdout.match(r))
        });
    })
})