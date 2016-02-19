/*global describe,it, __filename */
/**
 * Created by JParreir on 02-10-2015.
 */

"use strict";

describe("enFsPatch-readdir", function() {
    var fs, readdir;
    before(function() {
        //need to clean all the cache before running this test
        delete require.cache[require.resolve("fs")];
        delete require.cache[require.resolve("../lib/enfsPatch")];
        delete require.cache[require.resolve("../lib/fs")];
        delete require.cache[require.resolve("../index")];

        fs = require("fs");
        readdir = fs.readdir;
        fs.readdir = function(path, callback) {
            process.nextTick(function() {
                callback(null, ["c", "x", "b"]);
            });
        };
    });
    after(function() {
        //need to clean all the cache before running this test
        delete require.cache[require.resolve("fs")];
        delete require.cache[require.resolve("../lib/enfsPatch")];
        delete require.cache[require.resolve("../lib/fs")];
        delete require.cache[require.resolve("../index")];
        fs.readdir = readdir;
    });
    it("should test readdir reorder", function(done) {
        var enfs;
        enfs = require("../");
        enfs.readdir("anything", function(err, files) {
            (err === null).should.be.equal(true);
            files.should.be.eql(["b", "c", "x"]);
            done();
        });
    });
});
