var assert = require('assert');
var cp = require('child_process')

describe('clic', function() {

    it('captures stdout', function() {
        var stdout = cp.execSync('clic run test-hello-world').toString()
        assert(stdout.match(/Hello from Docker/gi))
    })

    it('captures exit code', function() {
        try {
            cp.execSync('clic run test-exit-code')
            assert(false, 'should not get here')
        } catch(error) {
            assert.equal(error.status, 1)
        }
    })

    it('can unlink', function() {
        cp.execSync('clic unlink terraform')
    })

    it('can link', function() {
        cp.execSync('clic link terraform')
    })

    it('can run specific versions', function() {
        var stdout = cp.execSync('clic run test@3.10.0 cat /etc/alpine-release').toString()
        assert.equal(stdout, "3.10.0\n")
    })

});