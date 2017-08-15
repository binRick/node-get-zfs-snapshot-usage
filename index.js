#!/usr/bin/env node

fs = require('fs'),
    tree = require('pretty-tree'),
    child = require('child_process'),
    c = require('chalk'),
    pb = require('pretty-bytes'),
    async = require('async'),
    _ = require('underscore'),
    ora = require('ora'),
reportLimit = 5;

if (process.argv[2] == '-q')
    var quietMode = true;
else
    var quietMode = false;

if (!quietMode)
    var fileSpinner = ora('Listing ZFS Filesystems...').start();
var fsChild = child.spawn('zfs', ['list', '-oname', '-susedbysnapshots', '-pHoname']);
var zfsListOut = '';
fsChild.stdout.on('data', function(data) {
    zfsListOut += data.toString();
});
fsChild.stderr.on('data', function(data) {

});
fsChild.on('exit', function(code) {
    if (code != 0) throw "zfs list failed";
    var filesystems = zfsListOut.split('\n').filter(function(l) {
        return l;
    });


    if (!quietMode)
        fileSpinner.succeed('Loaded ' + filesystems.length + ' filesystems..');

    if (!quietMode)
        var countSpinner = ora('Summing Snapshot usage..').start();
    var loaded = 0;
    var totalUsage = 0;
    async.mapSeries(filesystems, function(fs, _cb) {
        if (!quietMode)
            countSpinner.text = '  Queried Snapshot usage on ' + loaded + '/' + filesystems.length + ' filesystems. Total usage: ' + totalUsage;
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
        totals = _.sortBy(totals, 'snapUsage');
        var report = totals.slice(totals.length - reportLimit+1, totals.length - 1).reverse();
        var leaf = {};
        _.each(report, function(r) {
            leaf[r.fs] = pb(r.snapUsage);
        });
        var treeReport = tree({
            label: 'Snapshot Usage Report',
            nodes: [{
                label: 'Top Filesystems:',
                leaf: leaf,
            }]
        });
        if (!quietMode)
            countSpinner.succeed('Summed ' + loaded + ' filesystems to total of ' + pb(totalUsage));
        if (!quietMode)
            console.log(treeReport);
        if (quietMode)
            console.log(totalUsage);
    });
});
