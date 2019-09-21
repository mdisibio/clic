var fs = require('fs')
var assert = require('assert')
var cp = require('child_process')

describe('clic', () => {

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

    it('mounts the current folder', () => {
        var stdout = cp.execSync('clic run test ls test.js').toString()
        assert(stdout.match(/test.js/gi))
    })

    it('mounts the parent folder', () => {
        var stdout = cp.execSync('clic run test ls ..').toString()
        assert(stdout.match(/test/gi))
    })

});