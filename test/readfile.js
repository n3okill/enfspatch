/*global describe,it, before, process */
/**
 * Created by JParreir on 02-10-2015.
 */

"use strict";

var nodePath = require("path"),
    nodeOs = require("os"),
    rimraf = require("rimraf"),
    enFs = require("../"),
    cwd = process.cwd();

describe("enFsPatch-readfile", function() {
    var tmpPath, num, paths;
    before(function() {
        tmpPath = nodePath.join(nodeOs.tmpdir(), "enfspatchreadfile");
        num = 4097;
        paths = new Array(num);
        enFs.mkdirSync(tmpPath);
        process.chdir(tmpPath);
    });
    after(function() {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    describe("a lot of files", function() {
        it("should write files", function(done) {
            var filesNum;
            filesNum = (num - 1);
            this.timeout(5000);
            for (var i = 0; i < num; i++) {
                paths[i] = "file-" + i.toString();
                enFs.writeFile(paths[i], "data", "utf8", function(errWrite) {
                    (errWrite === null).should.be.equal(true);
                    if (--filesNum === 0) {
                        return done();
                    }
                });
            }
        });
        it("should read files", function(done) {
            var filesNum;
            filesNum = (num - 1);
            this.timeout(5000);
            for (var i = 0; i < num; i++) {
                enFs.readFile(paths[i], "utf8", function(err, contents) {
                    (err === null).should.be.equal(true);
                    contents.should.be.equal("data");
                    if (--filesNum === 0) {
                        return done();
                    }
                });
            }
        });
        it("should clean the files", function(done) {
            this.timeout(5000);
            rimraf(tmpPath + nodePath.sep + "*", function(err) {
                (err === null).should.be.equal(true);
                enFs.readdir(tmpPath, function(errRead, files) {
                    (errRead === null).should.be.equal(true);
                    files.length.should.be.equal(0);
                    done();
                });
            });
        });
    });
});

