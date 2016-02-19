/*global describe,it, __filename */
/**
 * Created by JParreir on 02-10-2015.
 */

"use strict";

describe("enFsPatch-Open", function() {
    var fs = require("../");
    it("should open an existing file sync", function() {
        var fd;
        (function() {
            fd = fs.openSync(__filename, "r");
        }).should.not.throw();
        (function() {
            fs.closeSync(fd);
        }).should.not.throw();
    });
    it("should open an existing file async", function(done) {
        fs.open(__filename, "r", function(err, fd) {
            (err === null).should.be.equal(true);
            (fd === undefined).should.be.equal(false);
            fs.close(fd, function(err) {
                (err === null).should.be.equal(true);
                done();
            });
        });
    });
    it("should fail to open non-existing file sync", function() {
        (function() {
            fs.openSync("invalid file path", "r");
        }).should.throw(Error, {code: "ENOENT", message: /no such file/});
    });
    it("should fail to open non-existing file async", function(done) {
        fs.open("invalid file path async", "r", function(err, fd) {
            (fd === undefined).should.be.equal(true);
            err.should.be.instanceOf(Error);
            err.code.should.be.equal("ENOENT");
            //err.message.should.containEql("no such file");
            done();
        });
    });
});
