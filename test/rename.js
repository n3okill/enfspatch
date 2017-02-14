/**
 * @project enf
 * @filename rename.js
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2017 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 13-02-2017
 * @version 0.1.1
 * @description
 */

/* global describe, it, before, after*/

"use strict";

const nodePath = require("path");
const nodeOs = require("os");
const rimraf = require("rimraf");
const cwd = process.cwd();
const enFs = require("../");

describe("enfsPatch > rename", function () {
    const tmpPath = nodePath.join(nodeOs.tmpdir(), "enfspatchrenamefile");
    before(function () {
        try {
            enFs.mkdirSync(tmpPath);
        } catch (err) {
            if (err.code === "EXIST") {
                rimraf.sync(tmpPath);
                enFs.mkdirSync(tmpPath);
            }
        }
        process.chdir(tmpPath);
    });
    after(function () {
        process.chdir(cwd);
        rimraf.sync(tmpPath);
    });
    describe("> async", function () {
        describe("try one file", function () {
            let fileALock;
            let fileA, fileB, fileARenamed, fileBRenamed, fsRename;
            before(function () {
                fsRename = enFs.rename;
                enFs.rename = ((function (rename) {
                    return function (from, to, callback) {
                        if (fileALock === from) {
                            let err = new Error("File Locked by system.");
                            err.code = "EPERM";
                            return callback(err);
                        }
                        rename(from, to, callback);
                    };
                })(enFs.rename));
                fileA = nodePath.join(tmpPath, "a.txt");
                fileARenamed = nodePath.join(tmpPath, "aRename.txt");
                fileB = nodePath.join(tmpPath, "b.txt");
                fileBRenamed = nodePath.join(tmpPath, "bRenamed.txt");
            });
            after(function () {
                enFs.rename = fsRename;
            });
            it("should write files and lock fileA", function (done) {
                enFs.writeFile(fileA, "data", "utf8", (errWriteA) => {
                    (errWriteA === null).should.be.equal(true);
                    fileALock = fileA;
                    enFs.writeFile(fileB, "data", "utf8", (errWriteB) => {
                        (errWriteB === null).should.be.equal(true);
                        done();
                    });
                });
            });
            it("should rename fileB and fail on fileA", function (done) {
                enFs.rename(fileB, fileBRenamed, (err) => {
                    (err === null).should.be.equal(true);
                    enFs.stat(fileBRenamed, (errStat, stat) => {
                        (errStat === null).should.be.equal(true);
                        stat.isFile().should.be.equal(true);
                        enFs.rename(fileA, fileARenamed, (errFileA) => {
                            (errFileA === null).should.be.equal(false);
                            errFileA.code.should.be.equal("EPERM");
                            done();
                        });
                    });
                });
            });
            it("should rename fileA only after unlocked", function (done) {
                enFs.rename(fileA, fileARenamed, (err) => {
                    (err === null).should.be.equal(false);
                    err.code.should.be.equal("EPERM");
                    fileALock = null;
                    enFs.rename(fileA, fileARenamed, (errRen2) => {
                        (errRen2 === null).should.be.equal(true);
                        enFs.stat(fileARenamed, (errStat, stat) => {
                            (errStat === null).should.be.equal(true);
                            stat.isFile().should.be.equal(true);
                            done();
                        });
                    });
                });
            });
        });
        describe("a lot of files", function () {
            const locks = [];
            let fsRename = enFs.rename;
            let num, paths;
            before(function () {
                num = 500;
                paths = new Array(num);
                fsRename = enFs.rename;
                enFs.rename = ((function (rename) {
                    return function (from, to, callback) {
                        if (locks.indexOf(from) !== -1) {
                            let err = new Error("File Locked by system.");
                            err.code = "EPERM";
                            return callback(err);
                        }
                        rename(from, to, callback);
                    };
                })(enFs.rename));
            });
            after(function () {
                enFs.rename = fsRename;
            });

            function randomIntInc(low, high) {
                return Math.floor(Math.random() * (high - low + 1) + low);
            }

            function getRandomArray(low, high, size) {
                let numbers = [];
                for (let i = 0; i < size; i++) {
                    numbers.push(randomIntInc(low, high));
                }
                return numbers.filter((v, i, a) => a.indexOf(v) === i);
            }


            it("should write files and lock some", function (done) {
                let filesNum;
                filesNum = num;
                this.timeout(10000);
                function writeFile(path) {
                    enFs.writeFile(path, "data", "utf8", function (errWrite) {
                        (errWrite === null).should.be.equal(true);
                        if (--filesNum === 0) {
                            let numbers = getRandomArray(0, num, randomIntInc(1, num));
                            while (numbers.length) {
                                locks.push(paths[numbers.shift()]);
                            }
                            return done();
                        }
                    });
                }

                for (let i = 0; i <= num; i++) {
                    paths[i] = "file-" + i.toString();
                    writeFile(paths[i]);
                }
            });
            it("should rename not locked files", function (done) {
                let filesNum = num;
                let renamed = 0, notRenamed = 0;
                let locked = locks.length;
                paths.forEach((path) => {
                    enFs.rename(path, path + ".renamed", (err) => {
                        if (err) {
                            err.code.should.be.equal("EPERM");
                            notRenamed++;
                        } else {
                            renamed++;
                        }
                        if (--filesNum === 0) {
                            notRenamed.should.be.equal(locked);
                            renamed.should.be.equal(num - locked);
                            return done();
                        }
                    });
                });
            });
            it("should rename locked files after unlock", function (done) {
                let locked = locks.length;
                let filesNum = locked;
                let filesNum2 = locked;
                let renamed = 0;
                let tmpLocks = [];
                for (let i = 0; i < locked; i++) {
                    tmpLocks[i] = locks[i];
                }
                locks.forEach((path) => {
                    enFs.rename(path, path + ".renamed", (errFirst) => {
                        errFirst.code.should.be.equal("EPERM");
                        if (--filesNum === 0) {
                            while (locks.length) {
                                locks.shift();
                            }
                            tmpLocks.forEach((path) => {
                                enFs.rename(path, path + ".renamed", (err) => {
                                    (err === null).should.be.equal(true);
                                    renamed++;
                                    if (--filesNum2 === 0) {
                                        renamed.should.be.equal(locked);
                                        done();
                                    }
                                });
                            });
                        }
                    });
                });
            });
        });
    });
    describe("> sync", function () {
        describe("try one file", function () {
            let fileALock;
            let fileA, fileB, fileARenamed, fileBRenamed, fsRename;
            before(function () {
                fsRename = enFs.renameSync;
                enFs.renameSync = ((function (rename) {
                    return function (from, to) {
                        if (fileALock === from) {
                            let err = new Error("File Locked by system.");
                            err.code = "EPERM";
                            throw err;
                        }
                        rename(from, to);
                    };
                })(enFs.renameSync));
                fileA = nodePath.join(tmpPath, "aSync.txt");
                fileARenamed = nodePath.join(tmpPath, "aSyncRename.txt");
                fileB = nodePath.join(tmpPath, "bSync.txt");
                fileBRenamed = nodePath.join(tmpPath, "bSyncRenamed.txt");
            });
            after(function () {
                enFs.renameSync = fsRename;
            });
            it("should write files and lock fileA", function () {
                (function(){
                    enFs.writeFileSync(fileA,"data","utf8");
                    fileALock = fileA;
                }).should.not.throw();
                (function(){
                    enFs.writeFileSync(fileB,"data","utf8");
                }).should.not.throw();
            });
            it("should rename fileB and fail on fileA", function () {
                (function(){
                    enFs.renameSync(fileB,fileBRenamed);
                    let stat = enFs.statSync(fileBRenamed);
                    stat.isFile().should.be.equal(true);
                }).should.not.throw();
                (function(){
                    enFs.renameSync(fileA,fileARenamed);
                }).should.throw(Error,{code:"EPERM"});
            });
            it("should rename fileA only after unlocked", function () {
                (function(){
                    enFs.renameSync(fileA,fileARenamed);
                }).should.throw(Error,{code:"EPERM"});
                (function(){
                    fileALock=null;
                    enFs.renameSync(fileA,fileARenamed);
                    let stat = enFs.statSync(fileARenamed);
                    stat.isFile().should.be.equal(true);
                }).should.not.throw();
            });
        });
        describe("a lot of files", function () {
            const locks = [];
            let fsRename = enFs.renameSync;
            let num, paths;
            before(function () {
                num = 500;
                paths = new Array(num);
                fsRename = enFs.renameSync;
                enFs.renameSync = ((function (rename) {
                    return function (from, to) {
                        if (locks.indexOf(from) !== -1) {
                            let err = new Error("File Locked by system.");
                            err.code = "EPERM";
                            throw err;
                        }
                        rename(from, to);
                    };
                })(enFs.renameSync));
            });
            after(function () {
                enFs.renameSync = fsRename;
            });

            function randomIntInc(low, high) {
                return Math.floor(Math.random() * (high - low + 1) + low);
            }

            function getRandomArray(low, high, size) {
                let numbers = [];
                for (let i = 0; i < size; i++) {
                    numbers.push(randomIntInc(low, high));
                }
                return numbers.filter((v, i, a) => a.indexOf(v) === i);
            }


            it("should write files and lock some", function () {
                this.timeout(10000);
                for (let i = 0; i <= num; i++) {
                    paths[i] = "fileSync-" + i.toString();
                    enFs.writeFileSync(paths[i],"data","utf8");
                }
                let numbers = getRandomArray(0,num,randomIntInc(1,num));
                while(numbers.length) {
                    locks.push(paths[numbers.shift()]);
                }
            });
            it("should rename not locked files", function () {
                let renamed = 0, notRenamed = 0;
                let locked = locks.length;
                for(let i=0;i<paths.length;i++) {
                    try {
                        enFs.renameSync(paths[i],paths[i]+".renamed");
                        renamed++;
                    }catch(err) {
                        err.code.should.be.equal("EPERM");
                        notRenamed++;
                    }
                }
                notRenamed.should.be.equal(locked);
                renamed.should.be.equal(paths.length-locked);
            });
            it("should rename locked files after unlock", function () {
                let locked = locks.length, renamed = 0, tmpLocks =  Array.from(new Set(locks));
                for(let i=0;i<tmpLocks.length;i++) {
                    try {
                        enFs.renameSync(tmpLocks[i],tmpLocks[i]+".renamed");
                    }catch(err) {
                        err.code.should.be.equal("EPERM");
                    }
                }
                while(locks.length) {
                    locks.shift();
                }
                for(let i=0;i<tmpLocks.length;i++) {
                    enFs.renameSync(tmpLocks[i], tmpLocks[i] + ".renamed");
                    renamed++;
                }
                renamed.should.be.equal(locked);
            });
        });
    });
});
