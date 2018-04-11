/**
 * Created by danzhang on 2016/12/18.
 */

var gulp = require('gulp');
var sftp = require('gulp-sftp');
var shell = require('gulp-shell');
var args = require('yargs').argv;
var $ = require('gulp-load-plugins')({lazy: true});

gulp.task('help', $.taskListing);
gulp.task('default', ['help']);

var localServer = {
    host: '192.168.1.166',
    auth: 'localServerKey'
};

var devServer = {
    host: 'dev.100000q.com',
    auth: 'devServerKey'
};

var distServer = {
    host: '139.129.203.38',
    auth: 'distServerKey'
}

var awsServer = {
    host: 'ec2-54-153-105-58.us-west-1.compute.amazonaws.com',
    auth: 'awsServerKey'
};

gulp.task('upload', function() {

    switch( args.env ){
        case 'local':
            console.log('uploading to local server...');
            var server = localServer;
            server.remotePath = '/opt/dolina/core/';
            break;
        case 'dev':
            console.log('uploading to developing server...');
            var server = devServer;
            server.remotePath = '/opt/node-core/';
            break;
        case 'dist':
            console.log('uploading to production server...');
            var server = distServer;
            server.remotePath = '/var/www/html/SDK/js/';
            break;
        case 'aws':
            console.log('uploading to aws server...');
            var server = awsServer;
            server.remotePath = '/var/www/html/SDK/js/';
            break;
    }

    gulp.src(['./**/*', '!.ftpass', '!gulpfile.js', '!server/config.json', '!app/setting.json', '!app/node_modules/**/*', '!server/node_modules/**/*'])
        .pipe(sftp(server));

})