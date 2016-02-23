/**
 * @project enfspatch
 * @filename stats.js
 * @description tests for enfspatch
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */

/* global describe, require, it, __filename */

"use strict";

describe("enfspatch > Stats", function() {
    it("enfs should use the same stats constructor as fs module", function(done) {
        var fs, enfs;
        fs = require("fs");
        enfs = require("../");
        enfs.Stats.should.be.equal(fs.Stats);
        fs.stat(__filename, function(err, statFs) {
            (err === null).should.be.equal(true);
            statFs.should.be.instanceof(fs.Stats);
            enfs.stat(__filename, function(errEsnofs, statEsnofs) {
                (errEsnofs === null).should.be.equal(true);
                statEsnofs.should.be.instanceof(enfs.Stats);
                statEsnofs.should.be.instanceof(fs.Stats);
                statEsnofs.should.be.eql(statFs);
                done();
            });
        });
    });
});
