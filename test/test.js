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

describe('clic install', function() {
    this.timeout(10000)

    it('can install', () => {
        cp.execSync('clic install')
    })

    it('can install cmd', () => {
        cp.execSync('clic install terraform')
        var stdout = cp.execSync(getBin('terraform') + ' --version').toString()
        assert(stdout.match(/Terraform v0.12.8/gi))
    })

    it('can install cmd@vers', () => {
        cp.execSync('clic install terraform@0.11.13')
        var stdout = cp.execSync(getBin('terraform@0.11.13') + ' --version').toString()
        assert(stdout.match(/Terraform v0.11.13/gi))
    })

    it('can uninstall cmd', () => {
        cp.execSync('clic uninstall terraform')
        assertBinDoesNotExist('terraform')
        assertBinDoesNotExist('terraform@0.12.8')
    })

    it('can uninstall cmd@vers', () => {
        cp.execSync('clic uninstall terraform@0.11.13')
        assertBinDoesNotExist('terraform@0.11.13')
    })

    it('automatically aliases when there isnt one', () => {
        cp.execSync('clic uninstall terraform')
        cp.execSync('clic uninstall terraform@0.11.13')

        cp.execSync('clic install terraform')
        assertBinExists('terraform')
    })

    it('upgrades alias when installing a higher version', () => {
        cp.execSync('clic uninstall terraform')
        cp.execSync('clic uninstall terraform@0.11.13')

        cp.execSync('clic install terraform@0.11.13')
        cp.execSync('clic install terraform')

        var stdout = cp.execSync(getBin('terraform') + ' --version').toString()
        assert(stdout.match(/Terraform v0.12.8/gi))
    })
})

describe('clic link', function() {
    this.timeout(5000)
    
    it('can unlink', () => {
        cp.execSync('clic unlink test-hello-world')
        assertBinDoesNotExist('test-hello-world')
    })

    it('can link', () => {
        cp.execSync('clic link test-hello-world')
        assertBinExists('test-hello-world')
    })

    it('doesn\'t link unknown command', () => {
        try {
            cp.execSync('clic link asdf')
            assert(false, 'should not get here')
        } catch(error) {
            assert.equal(error.status, 255)
        }
    })

    it('can run linked command', () => {
        cp.execSync('test-hello-world')
    })
})

describe('clic run', function() {
    this.timeout(5000)

    it('captures stdout', () => {
        var stdout = cp.execSync('clic run test-hello-world').toString()
        assert(stdout.match(/Hello from Docker/gi))
    })

    it('captures stdin', () => {
        var stdout = cp.execSync('echo "hello world" | clic run test cat /dev/stdin').toString()
        assert(stdout.match(/hello world/gi))
    })

    it('captures exit code', () => {
        try {
            cp.execSync('clic run test-exit-code')
            assert(false, 'should not get here')
        } catch(error) {
            assert.equal(error.status, 1)
        }
    })

    it('can run specific versions', () => {
        var stdout = cp.execSync('clic run test@3.10.0 cat /etc/alpine-release').toString()
        assert.equal(stdout, "3.10.0\n")
    })

    it('can run without a version', () => {
        cp.execSync('clic run test')
    })

    it('mounts the current folder', () => {
        var stdout = cp.execSync('clic run test ls test.js').toString()
        assert(stdout.match(/test.js/gi))
    })

    it('mounts the parent folder', () => {
        var stdout = cp.execSync('clic run test ls ..').toString()
        assert(stdout.match(/test/gi))
    })

    it('runs tool with dockerfile', () => {
        var stdout = cp.execSync('clic run nsnake --version').toString()
        assert(stdout.match(/nsnake v3/gi))
    })

});