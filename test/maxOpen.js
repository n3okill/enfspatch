/*global describe, it, process, __filename*/
/**
 * Created by JParreir on 02-10-2015.
 */


"use strict";

describe("enFsPatch-max open", function() {
    var fs = require("../");
    it("should test open a lot of stuff", function(done) {
        var n, opens, fds, going, closing, doneCalled, exitCalled;
        // How many parallel open()'s to do
        n = 1024;
        opens = 0;
        fds = [];
        going = true;
        closing = false;
        doneCalled = 0;
        exitCalled = false;
        // Get around EBADF from libuv by making sure that stderr is opened
        // Otherwise Darwin will refuse to give us a FD for stderr!
        process.stderr.write('');


        function openFile() {
            opens++;
            fs.open(__filename, "r", function(err, fd) {
                (err === null).should.be.equal(true);
                fds.push(fd);
                if (going) {
                    openFile();
                }
            });
        }

        for (var i = 0; i < n; i++) {
            openFile();
        }


        function stop() {
            if (closing) {
                return;
            }
            doneCalled++;
            if (fds.length === 0) {
                // First because of the timeout
                // Then to close the fd's opened afterwards
                // Then this time, to complete.
                // Might take multiple passes, depending on CPU speed
                // and ulimit, but at least 3 in every case.
                doneCalled.should.be.aboveOrEqual(2);
                if (!exitCalled) {
                    exitCalled = true;
                    done();
                }
            }
            closing = true;

            setTimeout(function() {
                closing = false;
                stop();
            }, 100);

            var closes = fds.slice(0);
            fds.length = 0;
            closes.forEach(function(fd) {
                fs.close(fd, function(err) {
                    (err === null).should.be.equal(true);
                });
            });
        }

        // should hit ulimit pretty fast
        setTimeout(function() {
            going = false;
            (opens - fds.length).should.be.equal(n);
            stop();
        }, 100);
    });
});
