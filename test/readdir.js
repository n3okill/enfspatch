/**
 * @project enfspatch
 * @filename readdir.js
 * @description tests for enfspatch
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */

/* global describe, require, before, after, it, __filename */


const fs = require("fs");

describe("enfspatch > readdir", function () {
    const readdir = fs.readdir;
    let enfspatch = require("../");
    before(function () {
        fs.readdir = function readdir(path, callback) {
            process.nextTick(function () {
                callback(null, ["c", "x", "b"]);
            });
        };
        enfspatch = enfspatch.mockEnfs(fs);
    });
    after(function () {
        fs.readdir = readdir;
    });
    it("should test readdir reorder", function(done) {
        enfspatch.readdir("anything", function(err, files) {
            (err === null).should.be.equal(true);
            files.should.be.eql(["b", "c", "x"]);
            done();
        });
    });
});
