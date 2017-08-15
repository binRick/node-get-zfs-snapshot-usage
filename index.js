#!/usr/bin/env node

fs = require('fs'),
    child = require('child_process'),
    c = require('chalk'),
    pb = require('pretty-bytes'),
    async = require('async'),
    _ = require('underscore'),
    ora = require('ora');

var fileSpinner = ora('Listing ZFS Filesystems...').start();
var filesystems = child.execSync('zfs list -o name -pHo name').toString().split('\n').filter(function(l) {
    return l;
});
fileSpinner.succeed('Loaded ' + filesystems.length + ' filesystems..');

var countSpinner = ora('Summing Snapshot usage..').start();
var loaded = 0;
var totalUsage = 0;
async.mapSeries(filesystems, function(fs, _cb) {
    countSpinner.text = '  Queries Snapshot usage on ' + loaded + ' filesystems. Total usage: ' + totalUsage;
    loaded++;
    var snapUsage = 0;
    var snapChild = child.spawn('zfs', ['get', 'usedbysnapshots', fs, '-pHovalue']);
    snapChild.on('exit', function(code) {
        if (code != 0)
            throw "command failed: " + usageCmd.join(' ');
        var fsData = {
            fs: fs,
            snapUsage: snapUsage
        };
        _cb(null, fsData);
    });
    snapChild.stdout.on('data', function(data) {
        snapUsage = parseInt(data.toString());
        totalUsage += snapUsage;
    });
    snapChild.stderr.on('data', function(data) {});
}, function(errs, totals) {
    if (errs) throw errs;
    countSpinner.succeed('Summed ' + loaded + ' filesystems to total of ' + pb(totalUsage));
});
