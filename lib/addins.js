/**
 * @project enfspatch
 * @filename addins.js
 * @description Add functions to the fs module
 * @author Joao Parreira <joaofrparreira@gmail.com>
 * @copyright Copyright(c) 2016 Joao Parreira <joaofrparreira@gmail.com>
 * @licence Creative Commons Attribution 4.0 International License
 * @createdAt Created at 18-02-2016.
 * @version 0.0.1
 */


function addins(fs) {
    fs.existStat = function (path, callback) {
        fs.stat(path, function (err) {
            if (err) {
                return callback(null, false);
            }
            return callback(null, true);
        });
    };
    fs.existLStat = function (path, callback) {
        fs.lstat(path, function (err) {
            if (err) {
                return callback(null, false);
            }
            callback(null, true);
        });
    };
    fs.existFStat = function (fd, callback) {
        fs.fstat(fd, function (err) {
            if (err) {
                return callback(null, false);
            }
            callback(null, true);
        });
    };
    fs.existStatSync = function (path) {
        try {
            fs.statSync(path);
            return true;
        } catch (err) {
            return false;
        }
    };
    fs.existLStatSync = function(path) {
        try {
            fs.lstatSync(path);
            return true;
        } catch(err) {
            return false;
        }
    };
    fs.existSStatSync = function(fd) {
        try {
            fs.fstatSync(fd);
            return true;
        }catch(err) {
            return false;
        }
    };
    fs.existAccess = function (path, mode, callback) {
        if (typeof mode === "function") {
            callback = mode;
            mode = null;
        }
        fs.access(path, mode, function (err) {
            if (err) {
                return callback(null, false);
            }
            callback(null, true);
        });
    };
    fs.existAccessSync = function (path, mode) {
        try {
            fs.accessSync(path, mode);
            return true;
        } catch (err) {
            return false;
        }
    };
    fs.exists = (function (exists) {
        return function (path, callback) {
            if (exists) {
                exists(path, function (e) {
                    callback(null, e);
                });
            } else {
                fs.existStat(path, callback);
            }
        }
    })(fs.exists);

    fs.existsSync = fs.existsSync || fs.existStatSync;
}


module.exports = addins;
