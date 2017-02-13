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

"use strict";

describe("enfspatch > readdir", function() {
    let fs, readdir;
    function deleteRequireCache(){
        delete require.cache[require.resolve("fs")];
        delete require.cache[require.resolve("../lib/enfsPatch")];
        delete require.cache[require.resolve("../lib/fs")];
        delete require.cache[require.resolve("../index")];
    }
    before(function() {
        //need to clean all the cache before running this test
        deleteRequireCache();

        fs = require("fs");
        readdir = fs.readdir;
        fs.readdir = function(path, callback) {
            process.nextTick(function() {
                callback(null, ["c", "x", "b"]);
            });
        };
    });
    after(function() {
        //need to clean all the cache after running this test
        deleteRequireCache();
        fs.readdir = readdir;
    });
    it("should test readdir reorder", function(done) {
        let enfs = require("../");
        enfs.readdir("anything", function(err, files) {
            (err === null).should.be.equal(true);
            files.should.be.eql(["b", "c", "x"]);
            done();
        });
    });
});
