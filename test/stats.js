/**
 * Created by JParreir on 02-10-2015.
 */

"use strict";

describe("enFsPatch-Stats", function() {
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
