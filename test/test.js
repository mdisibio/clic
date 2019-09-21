var fs = require('fs')
var assert = require('assert')
var cp = require('child_process')

describe('clic', () => {

    it('captures stdout', () => {
        var stdout = cp.execSync('clic run test-hello-world').toString()
        assert(stdout.match(/Hello from Docker/gi))
    })

    it('captures exit code', () => {
        try {
            cp.execSync('clic run test-exit-code')
            assert(false, 'should not get here')
        } catch(error) {
            assert.equal(error.status, 1)
        }
    })

    it('can unlink', () => {
        cp.execSync('clic unlink test-hello-world')
        assert(fs.existsSync('/usr/local/bin/test-hello-world') == false)
    })

    it('can link', () => {
        cp.execSync('clic link test-hello-world')
        assert(fs.existsSync('/usr/local/bin/test-hello-world'))
    })

    it('can run specific versions', () => {
        var stdout = cp.execSync('clic run test@3.10.0 cat /etc/alpine-release').toString()
        assert.equal(stdout, "3.10.0\n")
    })

    it('can run without a version', () => {
        cp.execSync('clic run test')
    })

});