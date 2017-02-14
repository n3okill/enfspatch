/**
 * @project enfspatch
 * @filename enfspatch.js
 * @description Redefines open and close methods of fs module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.1.1
 */

"use strict";


const enFs = require("fs");
const polyfills = require("./polyfills");
const enfsaddins = require("enfsaddins");
const platform = process.env.ENFS_FS_PLATFORM || process.platform;

let Queue = [], cwd = null;


process.cwd = ((function (cwdFn) {
    return function () {
        if (!cwd) {
            cwd = cwdFn.call(process);
        }
        return cwd;
    };
})(process.cwd));

try {
    process.cwd();
} catch (er) {
    //Intentionally left blank
}


process.chdir = ((function (chdir) {
    return function (dir) {
        cwd = null;
        chdir.call(process, dir);
    };
})(process.chdir));


function addQueue(elem) {
    Queue.push(elem);
}

function processQueue() {
    let elem;
    elem = Queue.shift();
    if (elem) {
        elem[0].apply(null, elem[1]);
    }
}

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
enFs.close = ((function (close) {
    return function (fd, callback) {
        callback = callback || function () {
            };
        return close.call(enFs, fd, function (err) {
            if (!err) {
                processQueue();
            }
            //if (typeof callback === "function") {
            callback.apply(this, arguments);
            //}
        });
    };
})(enFs.close));

enFs.closeSync = ((function (closeSync) {
    return function () {
        try {
            return closeSync.apply(enFs, arguments);
        } finally {
            processQueue();
        }
    }
})(enFs.closeSync));


function patch(fs) {
    // Everything that references the open() function needs to be in here

    polyfills(fs);
    enfsaddins(fs);
    fs.mockEnfs = patch;

    //This time is used in rename async and can be changed if needed (default: 1000ms)
    fs.renamingTime = 1000;

    // on Windows, A/V software can lock the directory, causing this
    // to fail with an EACCES or EPERM if the directory contains newly
    // created files.  Try again on failure, for up to 1 second.
    if (platform === "win32") {
        /*fs.rename = ((function(rename) {
         return function(from, to, callback) {
         let stop = Date.now()+1000;

         function fsR(from, to, callback) {
         return rename(from, to, function(err) {
         if (err && (err.code === "EACCES" || err.code === "EPERM") && (Date.now() < stop)) {
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
         };
         })(fs.rename));*/
        fs.rename = ((function (rename) {
            return function (from, to, callback) {
                callback = callback || function () {
                    };
                let stopTime = Date.now() + fs.renamingTime;
                let callAgainIn = 0;

                function cb(err) {
                    if (err && (err.code === "EACCES" || err.code === "EPERM") && (Date.now() < stopTime)) {
                        if (callAgainIn < 100) {
                            callAgainIn += 10;
                        }
                        setTimeout(function () {
                            fs.stat(to, function (statErr) {
                                if (statErr && statErr.code === "ENOENT") {
                                    rename(from, to, cb);
                                } else {
                                    callback(err);
                                }
                            });
                        }, callAgainIn);
                    } else {
                        callback(err);
                    }
                }

                rename(from, to, cb);
            };
        })(fs.rename));

        fs.renameSync = ((function (rename) {
            return function (from, to) {
                let stopTime = Date.now() + 1000;

                function running() {
                    try {
                        return rename(from, to);
                    } catch (err) {
                        if ((err.code === "EACCESS" || err.code === "EPERM") && (Date.now() < stopTime)) {
                            try {
                                fs.statSync(to);
                            } catch (errStat) {
                                if (errStat.code === "ENOENT") {
                                    return running();
                                }
                            }
                        }
                        throw err;
                    }
                }
                running();
            };
        })(fs.renameSync));
    }

    // if read() returns EAGAIN, then just try it again.
    fs.read = ((function (read) {
        return function (fd, buffer, offset, length, position, callback) {
            callback = callback || function () {
                };
            let counter = 10;

            function fsR(fd, buffer, offset, length, position, callback) {
                return read(fd, buffer, offset, position, function (err) {
                    if (err && err.code === "EAGAIN" && --counter > 0) {
                        addQueue([fsR, [fs, buffer, offset, length, position, callback]]);
                    } else {
                        //if (typeof callback === "function") {
                        callback.apply(this, arguments);
                        //}
                        processQueue();
                    }
                });
            }

            return fsR(fd, buffer, offset, length, position, callback);
        };
    })(fs.read));

    fs.readSync = ((function (readSync) {
        return function (fd, buffer, offset, length, position) {
            let counter = 10;
            function running(){
                try {
                    return readSync(fd,buffer,offset,length,position);
                }catch(err){
                    if(err.code==="EAGAIN" && --counter>0) {
                        return running();
                    }
                    throw err;
                }
            }
            running();
        };
    })(fs.readSync));

    fs.readFile = ((function (readFile) {
        return function (path, options, callback) {
            callback = callback || function () {
                };
            if (typeof options === "function") {
                callback = options;
                options = null;
            }

            function fsRF(path, options, callback) {
                return readFile(path, options, function (err) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsRF, [path, options, callback]]);
                    } else {
                        //if (typeof callback === "function") {
                        callback.apply(this, arguments);
                        //}
                        processQueue();
                    }
                });
            }

            return fsRF(path, options, callback);
        };
    })(fs.readFile));

    fs.writeFile = ((function (writeFile) {
        return function (path, data, options, callback) {
            callback = callback || function () {
                };
            if (typeof options === "function") {
                callback = options;
                options = null;
            }

            function fsWF(path, data, options, callback) {
                return writeFile(path, data, options, function (err) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsWF, [path, data, options, callback]]);
                    } else {
                        //if (typeof callback === "function") {
                        callback.apply(this, arguments);
                        //}
                        processQueue();
                    }
                });
            }

            return fsWF(path, data, options, callback);
        };
    })(fs.writeFile));

    fs.appendFile = ((function (appendFile) {
        return function (path, data, options, callback) {
            callback = callback || function () {
                };
            if (typeof options === "function") {
                callback = options;
                options = null;
            }

            function fsAF(path, data, options, callback) {
                return appendFile(path, data, options, function (err) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsAF, [path, data, options, callback]]);
                    } else {
                        //if (typeof callback === "function") {
                        callback.apply(this, arguments);
                        //}
                        processQueue();
                    }
                });
            }

            return fsAF(path, data, options, callback);
        };
    })(fs.appendFile));

    fs.readdir = ((function (readdir) {
        return function (path, callback) {
            callback = callback || function () {
                };

            function fsRd(path, callback) {
                return readdir(path, function (err, files) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsRd, [path, callback]]);
                    } else {
                        if (files && files.sort) {
                            //noinspection JSUnusedAssignment
                            files = files.sort();
                        }
                        callback.apply(this, arguments);
                        processQueue();
                    }
                });
            }

            return fsRd(path, callback);
        };
    })(fs.readdir));
    fs.readDir = fs.readdir;


    fs.open = ((function (open) {
        return function (path, flags, mode, callback) {
            callback = callback || function () {
                };
            if (typeof mode === "function") {
                callback = mode;
                mode = null;
            }

            function fsO(path, flags, mode, callback) {
                return open(path, flags, mode, function (err, fd) {
                    if (err && (err.code === "EMFILE" || err.code === "ENFILE")) {
                        addQueue([fsO, [path, flags, mode, callback]]);
                    } else {
                        //if (typeof callback === "function") {
                        callback.apply(this, arguments);
                        //}
                        processQueue();
                    }
                });
            }

            return fsO(path, flags, mode, callback);
        };
    })(fs.open));


    let OldReadStream = fs.ReadStream;

    function ReadStream() {
        if (this instanceof ReadStream) {
            return OldReadStream.apply(this, arguments);
        }
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }

    ReadStream.prototype = Object.create(OldReadStream.prototype);
    ReadStream.prototype.open = function () {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                if (this.autoClose) {
                    this.destroy();
                }
                this.emit("error", err);
            } else {
                this.fd = fd;
                this.emit("open", this.fd);
                this.read();
            }
        });
    };
    function createReadStream(path, options) {
        return new ReadStream(path, options);
    }

    fs.createReadStream = createReadStream;
    fs.FileReadStream = ReadStream;
    fs.ReadStream = ReadStream;

    let OldWriteStream = fs.WriteStream;

    function WriteStream() {
        if (this instanceof WriteStream) {
            return OldWriteStream.apply(this, arguments);
        }
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }

    WriteStream.prototype = Object.create(OldWriteStream.prototype);
    WriteStream.prototype.open = function () {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                this.destroy();
                this.emit("error", err);
            } else {
                this.fd = fd;
                this.emit("open", this.fd);
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


module.exports = patch(require("./fs"));
module.exports.enfsPatching = patch;