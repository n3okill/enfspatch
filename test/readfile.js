/**
 * @project enfspatch
 * @filename readfile.js
 * @description tests for enfspatch
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */

/* global describe, require, process, it, __filename */

"use strict";

const nodePath = require("path");
const nodeOs = require("os");
const rimraf = require("rimraf");
const enFs = require("../");
const cwd = process.cwd();

describe("enfspatch > readfile", function() {
    let tmpPath, num, paths;
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
            let filesNum;
            filesNum = (num - 1);
            this.timeout(20000);
            function writeFile(path) {
                enFs.writeFile(path, "data", "utf8", function (errWrite) {
                    (errWrite === null).should.be.equal(true);
                    if (--filesNum === 0) {
                        return done();
                    }
                });
            }
            for (let i = 0; i < num; i++) {
                paths[i] = "file-" + i.toString();
                writeFile(paths[i]);
            }
        });
        it("should read files", function(done) {
            let filesNum;
            filesNum = (num - 1);
            this.timeout(10000);
            function readFile(path){
                enFs.readFile(path,"utf8",function(err,contents){
                    (err===null).should.be.equal(true);
                    contents.should.be.equal("data");
                    if(--filesNum===0) {
                        return done();
                    }
                });
            }
            for (let i = 0; i < num; i++) {
                readFile(paths[i]);
            }
        });
        it("should clean the files", function(done) {
            this.timeout(10000);
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

