/**
 * @project enfspach
 * @filename polyfills.js
 * @description patch fs module based on Gracefull-fs module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */

/*global require, global, process, module*/

"use strict";


var fs = require('./fs.js'),
    nodeConstants = require('constants');

var defer;

defer = global.setImmediate || process.nextTick;
function noop() {
}


module.exports = patch;


function patch(fs) {
    // (re-)implement some things that are known busted or missing.

    // lchmod, broken prior to 0.6.2
    // back-port the fix here.
    if (nodeConstants.hasOwnProperty('O_SYMLINK') && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
    }
    // lutimes implementation, or no-op
    if (!fs.lutimes) {
        patchLutimes(fs);
    }

    // https://github.com/isaacs/node-graceful-fs/issues/4
    // Chown should not fail on einval or eperm if non-root.
    // It should not fail on enosys ever, as this just indicates
    // that a fs doesn't support the intended operation.

    fs.chown = chownFix(fs.chown);
    fs.fchown = chownFix(fs.fchown);
    fs.lchown = chownFix(fs.lchown);

    fs.chmod = chownFix(fs.chmod);
    fs.fchmod = chownFix(fs.fchmod);
    fs.lchmod = chownFix(fs.lchmod);

    fs.chownSync = chownFixSync(fs.chownSync);
    fs.fchownSync = chownFixSync(fs.fchownSync);
    fs.lchownSync = chownFixSync(fs.lchownSync);

    fs.chmodSync = chownFix(fs.chmodSync);
    fs.fchmodSync = chownFix(fs.fchmodSync);
    fs.lchmodSync = chownFix(fs.lchmodSync);


    // if lchmod/lchown do not exist, then make them no-ops
    if (!fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
            defer(cb);
        };
        fs.lchmodSync = noop;
    }
    if (!fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
            defer(cb);
        };
        fs.lchownSync = noop;
    }
}

function patchLchmod(fs) {
    fs.lchmod = function(path, mode, callback) {
        callback = callback || noop;
        fs.open(path, nodeConstants.O_WRONLY | nodeConstants.O_SYMLINK, mode, function(err, fd) {
            if (err) {
                return callback(err);
            }
            // prefer to return the chmod error, if one occurs,
            // but still try to close, and report closing errors if they occur.
            fs.fchmod(fd, mode, function(err) {
                fs.close(fd, function(err2) {
                    callback(err || err2);
                });
            });
        });
    };

    fs.lchmodSync = function(path, mode) {
        var fd, threw, ret;
        fd = fs.openSync(path, nodeConstants.O_WRONLY | nodeConstants.O_SYMLINK, mode);

        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        threw = true;
        try {
            ret = fs.fchmodSync(fd, mode);
            threw = false;
        } finally {
            if (threw) {
                try {
                    fs.closeSync(fd);
                } catch (er) {
                }
            } else {
                fs.closeSync(fd);
            }
        }
        return ret;
    }
}

function patchLutimes(fs) {
    if (nodeConstants.hasOwnProperty("O_SYMLINK")) {
        fs.lutimes = function(path, at, mt, cb) {
            fs.open(path, nodeConstants.O_SYMLINK, function(er, fd) {
                cb = cb || noop;
                if (er) {
                    return cb(er)
                }
                fs.futimes(fd, at, mt, function(er) {
                    fs.close(fd, function(er2) {
                        return cb(er || er2);
                    });
                });
            });
        };

        fs.lutimesSync = function(path, at, mt) {
            var fd, ret, threw;
            fd = fs.openSync(path, nodeConstants.O_SYMLINK);

            threw = true;
            try {
                ret = fs.futimesSync(fd, at, mt);
                threw = false;
            } finally {
                if (threw) {
                    try {
                        fs.closeSync(fd);
                    } catch (er) {
                    }
                } else {
                    fs.closeSync(fd);
                }
            }
            return ret;
        }
    } else {
        fs.lutimes = function(_a, _b, _c, cb) {
            defer(cb);
        };
        fs.lutimesSync = noop;
    }
}

function chownFix(orig) {
    if (!orig) {
        return orig;
    }
    return function(target, uid, gid, cb) {
        return orig.call(fs, target, uid, gid, function(err, res) {
            if (chownErOk(err)) {
                err = null;
            }
            cb(err, res);
        })
    }
}

function chownFixSync(orig) {
    if (!orig) {
        return orig;
    }
    return function(target, uid, gid) {
        try {
            return orig.call(fs, target, uid, gid);
        } catch (err) {
            if (!chownErOk(err)) {
                throw err;
            }
        }
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
    if (!err) {
        return true;
    }

    if (err.code === "ENOSYS") {
        return true;
    }

    var nonroot = !process.getuid || process.getuid() !== 0;
    if (nonroot) {
        if (err.code === "EINVAL" || err.code === "EPERM") {
            return true;
        }
    }
    return false;
}
