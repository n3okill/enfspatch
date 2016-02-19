/**
 * @project enfspatch
 * @filename addins.js
 * @description tests for enfspatch
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */

/* global describe, require, it, __filename */

"use strict";


describe("enFsPatch-addins", function() {
    var fs = require("../");
    describe("> existStat", function() {
        describe("> async", function() {
            it("should test true for async __filename", function(done) {
                fs.existStat(__filename, function(err, result) {
                    result.should.be.equal(true);
                    done();
                });
            });
            it("should test false for async non-existent file", function(done) {
                fs.existStat("/not/existent/file", function(err, result) {
                    result.should.be.equal(false);
                    done();
                });
            });
        });
        describe("> sync", function() {
            it("should test true for sync __filename", function(done) {
                fs.existStatSync(__filename).should.be.equal(true);
                done();
            });
            it("should test false for sync non-existent file", function(done) {
                fs.existStatSync("/not/existent/file").should.be.equal(false);
                done();
            });
        });
    });
    describe("> existAccess", function() {
        describe("> async", function() {
            it("should test true for async __filename", function(done) {
                fs.existAccess(__filename, function(err, result) {
                    result.should.be.equal(true);
                    done();
                });
            });
            it("should test false for async non-existent file", function(done) {
                fs.existAccess("/not/existent/file", function(err, result) {
                    result.should.be.equal(false);
                    done();
                });
            });
        });
        describe("> sync", function() {
            it("should test true for sync __filename", function(done) {
                fs.existAccessSync(__filename).should.be.equal(true);
                done();
            });
            it("should test false for sync non-existent file", function(done) {
                fs.existAccessSync("/not/existent/file").should.be.equal(false);
                done();
            });
        });
    });
});
