#!/usr/bin/env node

fs = require('fs'),
    child = require('child_process'),
    c = require('chalk'),
    pb = require('pretty-bytes'),
    async = require('async'),
    _ = require('underscore'),
    ora = require('ora');

if(process.argv[2] == '-q')
	var quietMode=true;
else
	var quietMode=false;

if(!quietMode)
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


if(!quietMode)
    fileSpinner.succeed('Loaded ' + filesystems.length + ' filesystems..');

if(!quietMode)
    var countSpinner = ora('Summing Snapshot usage..').start();
    var loaded = 0;
    var totalUsage = 0;
    async.mapSeries(filesystems, function(fs, _cb) {
if(!quietMode)
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
if(!quietMode)
        countSpinner.succeed('Summed ' + loaded + ' filesystems to total of ' + pb(totalUsage));
if(!quietMode)
	console.log(totals.slice(0,5));
if(quietMode)
	console.log(totalUsage);
    });
});
