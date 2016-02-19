/**
 * @project enfspatch
 * @filename enfspatch.js
 * @description Redefines open and close methods of fs module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */


"use strict";


var enFs = require("fs"),
    polyfills = require("./polyfills"),
    addins = require("./addins");
var Queue = [], cwd = null;


module.exports = patch(require("./fs"));


process.cwd = (function(cwdFn) {
    return function() {
        if (!cwd) {
            cwd = cwdFn.call(process);
        }
        return cwd;
    }
})(process.cwd);

try {
    process.cwd();
} catch (er) {
}

process.chdir = (function(chdir) {
    return function(dir) {
        cwd = null;
        chdir.call(process, dir);
    }
})(process.chdir);

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
enFs.close = (function(close) {
    return function(fd, callback) {
        return close.call(enFs, fd, function(err) {
            if (!err) {
                processQueue();
            }
            if (typeof callback === "function") {
                callback.apply(this, arguments);
            }
        });
    }
})(enFs.close);

enFs.closeSync = (function(closeSync) {
    return function(fd) {
        try {
            return closeSync.apply(enFs, arguments);
        } finally {
            processQueue();
        }
    }
})(enFs.closeSync);


function patch(fs) {
    // Everything that references the open() function needs to be in here

    polyfills(fs);
    addins(fs);

    // on Windows, A/V software can lock the directory, causing this
    // to fail with an EACCES or EPERM if the directory contains newly
    // created files.  Try again on failure, for up to 1 second.
    if (process.platform === "win32") {
        fs.rename = (function(rename) {
            return function(from, to, callback) {
                var start = Date.now();

                function fsR(from, to, callback) {
                    return rename(from, to, function(err) {
                        if (err && (err.code === "EACCESS" || err.code === "EPERM") && Date.now() - start < 1000) {
                            addQueue([fsR, [from, to, callback]]);
                        } else {
                            if (typeof callback === "function") {
                                callback.apply(this, arguments);
                            }
                            processQueue();
                        }
                    });
                }
                return fsR(from, to, callback);
            }
        })(fs.rename);
    }

    // if read() returns EAGAIN, then just try it again.
    fs.read = (function(read) {
        return function(fd, buffer, offset, length, position, callback) {
            var counter = 0;

            function fsR(fd, buffer, offset, length, position, callback) {
                return read(fd, buffer, offset, position, function(err) {
                    if (err && err.code === "EAGAIN" && counter < 10) {
                        counter++;
                        addQueue([fsR, [fs, buffer, offset, length, position, callback]]);
                    } else {
                        if (typeof callback === "function") {
                            callback.apply(this, arguments);
                        }
                        processQueue();
                    }
                });
            }

            return fsR(fd, buffer, offset, length, position, callback);
        }
    })(fs.read);

    fs.readSync = (function(readSync) {
        return function(fd, buffer, offset, length, position) {
            var counter = 0;
            while (true) {
                try {
                    return readSync.call(fs, fd, buffer, offset, length, position);
                } catch (err) {
                    if (err.code === "EAGAIN" && counter < 10) {
                        counter++;
                        continue;
                    }
                    throw err;
                }
            }
        }
    })(fs.readSync);

    fs.readFile = (function(readFile) {
        return function(path, options, callback) {
            if (typeof options === "function") {
                callback = options;
                options = null;
            }

            function fsRF(path, options, callback) {
                return readFile(path, options, function(err) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsRF, [path, options, callback]]);
                    } else {
                        if (typeof callback === "function") {
                            callback.apply(this, arguments);
                        }
                        processQueue();
                    }
                });
            }

            return fsRF(path, options, callback);
        }
    })(fs.readFile);

    fs.writeFile = (function(writeFile) {
        return function(path, data, options, callback) {
            if (typeof options === "function") {
                callback = options;
                options = null;
            }

            function fsWF(path, data, options, callback) {
                return writeFile(path, data, options, function(err) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsWF, [path, data, options, callback]]);
                    } else {
                        if (typeof callback === "function") {
                            callback.apply(this, arguments);
                        }
                        processQueue();
                    }
                });
            }

            return fsWF(path, data, options, callback);
        }
    })(fs.writeFile);

    fs.appendFile = (function(appendFile) {
        return function(path, data, options, callback) {
            if (typeof options === "function") {
                callback = options;
                options = null;
            }

            function fsAF(path, data, options, callback) {
                return appendFile(path, data, options, function(err) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsAF, [path, data, options, callback]]);
                    } else {
                        if (typeof callback === "function") {
                            callback.apply(this, arguments);
                        }
                        processQueue();
                    }
                });
            }

            return fsAF(path, data, options, callback);
        }
    })(fs.appendFile);

    fs.readdir = (function(readdir) {
        return function(path, callback) {

            function fsRd(path, callback) {
                return readdir(path, function(err, files) {
                    if (files && files.sort) {
                        files = files.sort();
                    }
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsRd, [path, callback]]);
                    } else {
                        if (typeof callback === "function") {
                            callback.apply(this, arguments);
                        }
                        processQueue();
                    }
                });
            }

            return fsRd(path, callback);
        }
    })(fs.readdir);


    fs.open = (function(open) {
        return function(path, flags, mode, callback) {
            if (typeof mode === "function") {
                callback = mode;
                mode = null;
            }

            function fsO(path, flags, mode, callback) {
                return open(path, flags, mode, function(err, fd) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsO, [path, flags, mode, callback]]);
                    } else {
                        if (typeof callback === "function") {
                            callback.apply(this, arguments);
                        }
                        processQueue();
                    }
                });
            }

            return fsO(path, flags, mode, callback);
        }
    })(fs.open);


    var oldReadStream = fs.ReadStream;

    function ReadStream(path, options) {
        if (this instanceof ReadStream) {
            return oldReadStream.apply(this, arguments);
        }
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }

    ReadStream.prototype = Object.create(oldReadStream.prototype);
    ReadStream.prototype.open = function() {
        var self = this;
        fs.open(self.path, self.flags, self.mode, function(err, fd) {
            if (err) {
                if (self.autoClose) {
                    self.destroy();
                }
                self.emit("error", err);
            } else {
                self.fd = fd;
                self.emit("open", fd);
                self.read();
            }
        });
    };
    function createReadStream(path, options) {
        return new ReadStream(path, options);
    }

    fs.createReadStream = createReadStream;
    fs.FileReadStream = ReadStream;
    fs.ReadStream = ReadStream;

    var oldWriteStream = fs.WriteStream;

    function WriteStream(path, options) {
        if (this instanceof WriteStream) {
            return oldWriteStream.apply(this, arguments);
        }
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }

    WriteStream.prototype = Object.create(oldWriteStream.prototype);
    WriteStream.prototype.open = function() {
        var self = this;
        fs.open(self.path, self.flags, self.mode, function(err, fd) {
            if (err) {
                self.destroy();
                self.emit("error", err);
            } else {
                self.fd = fd;
                self.emit("open", fd);
            }
        });
    };
    function createWriteStream(path, options) {
        return new WriteStream(path, options);
    }

    fs.createWriteStream = createWriteStream;
    fs.WriteStream = WriteStream;
    fs.FileWriteStream = WriteStream;


    return fs;

}


function addQueue(elem) {
    Queue.push(elem);
}

function processQueue() {
    var elem;
    elem = Queue.shift();
    if (elem) {
        elem[0].apply(null, elem[1]);
    }
}
