/**
 * @project enfspach
 * @filename polyfills.js
 * @description patch fs module based on Gracefull-fs module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.2
 */

/*global require, global, process, module*/

"use strict";

const nodeConstants = require("constants");

function noop() {
}


function patchLutimes(fs) {
    if (nodeConstants.hasOwnProperty("O_SYMLINK")) {
        fs.lutimes = function (path, at, mt, cb) {
            fs.open(path, nodeConstants.O_SYMLINK, function (er, fd) {
                cb = cb || noop;
                if (er) {
                    return cb(er);
                }
                fs.futimes(fd, at, mt, function (er) {
                    fs.close(fd, function (er2) {
                        return cb(er || er2);
                    });
                });
            });
        };

        fs.lutimesSync = function (path, at, mt) {
            let ret;
            let fd = fs.openSync(path, nodeConstants.O_SYMLINK);

            let threw = true;
            try {
                ret = fs.futimesSync(fd, at, mt);
                threw = false;
            } finally {
                if (threw) {
                    try {
                        fs.closeSync(fd);
                    } catch (er) {
                        //this is intentional, we don't care if close throws an error because fd pointer
                        //may not exist at all
                    }
                } else {
                    fs.closeSync(fd);
                }
            }
            return ret;
        };
    } else {
        fs.lutimes = function (_a, _b, _c, cb) {
            process.nextTick(cb);
        };
        fs.lutimesSync = noop;
    }
}


// ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.
function chownErOk(err) {
    if(!err || err && err.code === "ENOSYS") {
        return true;
    }
    return processUidErr(err);
    /*if (!process.getuid || process.getuid() !== 0) {
        if (err.code === "EINVAL" || err.code === "EPERM") {
            return true;
        }
    }
    return false;*/
}

function processUidErr(err) {
    return (!process.getuid || process.getuid() !== 0) && (err.code === "EINVAL" || err.code === "EPERM");
}

function chownFix(fs, orig) {
    if (!orig) {
        return orig;
    }
    return function (target, uid, gid, cb) {
        return orig.call(fs, target, uid, gid, function (err, res) {
            if (chownErOk(err)) {
                err = null;
            }
            cb(err, res);
        });
    };
}

function chownFixSync(fs, orig) {
    if (!orig) {
        return orig;
    }
    return function (target, uid, gid) {
        try {
            return orig.call(fs, target, uid, gid);
        } catch (err) {
            if (!chownErOk(err)) {
                throw err;
            }
        }
    };
}

function statFix(fs, orig) {
    if (!orig) {
        return orig;
    }
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, callback) {
        callback = callback || function(){};
        return orig.call(fs, target, function (er, stats) {
            if(stats) {
                if (stats.uid < 0) {
                    stats.uid += 0x100000000;
                }
                if (stats.gid < 0) {
                    stats.gid += 0x100000000;
                }
            }
            callback.apply(this, arguments);
        });
    };
}

function statFixSync(fs, orig) {
    if (!orig) {
        return orig;
    }
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target) {
        let stats = orig.call(fs, target);
        if (stats.uid < 0) {
            stats.uid += 0x100000000;
        }
        if (stats.gid < 0) {
            stats.gid += 0x100000000;
        }
        return stats;
    };
}


module.exports = function patch(fs) {
    // (re-)implement some things that are known busted or missing.

    // lutimes implementation, or no-op
    if (!fs.lutimes) {
        patchLutimes(fs);
    }

    // https://github.com/isaacs/node-graceful-fs/issues/4
    // Chown should not fail on einval or eperm if non-root.
    // It should not fail on enosys ever, as this just indicates
    // that a fs doesn't support the intended operation.

    fs.chown = chownFix(fs, fs.chown);
    fs.fchown = chownFix(fs, fs.fchown);
    fs.lchown = chownFix(fs, fs.lchown);

    fs.chmod = chownFix(fs, fs.chmod);
    fs.fchmod = chownFix(fs, fs.fchmod);
    fs.lchmod = chownFix(fs, fs.lchmod);

    fs.chownSync = chownFixSync(fs, fs.chownSync);
    fs.fchownSync = chownFixSync(fs, fs.fchownSync);
    fs.lchownSync = chownFixSync(fs, fs.lchownSync);

    fs.chmodSync = chownFix(fs, fs.chmodSync);
    fs.fchmodSync = chownFix(fs, fs.fchmodSync);
    fs.lchmodSync = chownFix(fs, fs.lchmodSync);

    fs.stat = statFix(fs, fs.stat);
    fs.fstat = statFix(fs, fs.fstat);
    fs.lstat = statFix(fs, fs.lstat);

    fs.statSync = statFixSync(fs, fs.statSync);
    fs.fstatSync = statFixSync(fs, fs.fstatSync);
    fs.lstatSync = statFixSync(fs, fs.lstatSync);

    // if lchmod/lchown do not exist, then make them no-ops
    if (!fs.lchmod) {
        fs.lchmod = function (path, mode, cb) {
            process.nextTick(cb);
        };
        fs.lchmodSync = noop;
    }
    if (!fs.lchown) {
        fs.lchown = function (path, uid, gid, cb) {
            process.nextTick(cb);
        };
        fs.lchownSync = noop;
    }
};