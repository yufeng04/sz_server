'use strict';

/**
 * Created by danzhang on 2017/2/15.
 */

var mysql = require('mysql');
var CONFIG = require('../config.json');
var express = require('express');
var xlsx = require('node-xlsx');
//var fs = require('fs');
var http = require('./../models/httpHandler');

var router = express.Router();

router.all("/export", function (req, res) {
    exportData(req, res);
});

var metaData; //字段数据
var pureData; //表格数据

function exportData(req, res) {
    var teamid = http.getRequest(req, 'teamid');
    var module = http.getRequest(req, 'module');
    var filters = http.getRequest(req, 'filters');
    var operator = http.getRequest(req, 'operator');
    var email = http.getRequest(req, 'email');
    var password = http.getRequest(req, 'password');

    authenticate(email, password).then(function (response) {
        if (typeof response == 'undefined') {
            res.json({
                result: 'FAIL',
                errMsg: '无法验证用户名和密码'
            });
            return;
        }

        if (response.result == 'FAIL') {
            res.json({
                result: 'FAIL',
                errMsg: '用户密码验证失败'
            });
            return;
        } else if (response.result == 'SUCCESS') {
            //获取字段
            fetchMetaData(req, teamid, module).then(function (response) {
                if (typeof response == 'undefined') {
                    res.json({
                        result: 'FAIL',
                        errMsg: '无法获取数据'
                    });
                    return;
                }

                if (response.result == 'FAIL') {
                    res.json(response);
                    return;
                }

                //res.json(response);
                //return;

                metaData = response.list;
                enumList = response.rangevalue;

                //获取数据
                fetchData(teamid, module, filters, operator).then(function (response) {

                    if (response.result == 'FAIL') {
                        res.json(response);
                        return;
                    }

                    pureData = response.list;
                    var exportData = [];

                    //字段排序
                    metaData.sort(function (a, b) {
                        return parseInt(a.seq) - parseInt(b.seq);
                    });

                    //第一行数据：表头
                    var tHeader = new Array();
                    for (var j = 0; j < metaData.length; j++) {
                        tHeader.push(metaData[j].description);
                    }

                    exportData.push(tHeader);

                    for (var i = 0; i < pureData.length; i++) {
                        var tRow = new Array();
                        for (var j = 0; j < metaData.length; j++) {

                            switch (metaData[j].type) {
                                case 'foreign_key':
                                    if (pureData[i][metaData[j]._index]) tRow.push(pureData[i][metaData[j]._index].desc);else tRow.push(null);
                                    break;
                                case 'datetime':
                                    if (pureData[i][metaData[j]._index]) tRow.push(ts2str(pureData[i][metaData[j]._index]));else tRow.push(null);
                                    break;
                                case 'enum':
                                    var rangeValueList = enumList[metaData[j]._index];
                                    if (rangeValueList) {
                                        for (var k = 0; k < rangeValueList.length; k++) {
                                            if (pureData[i][metaData[j]._index] == rangeValueList[k]._index) {
                                                tRow.push(rangeValueList[k].value);
                                                break;
                                            }
                                        }
                                    }

                                    if (k == rangeValueList.length) tRow.push(null);

                                    break;
                                default:
                                    if (pureData[i][metaData[j]._index]) tRow.push(pureData[i][metaData[j]._index]);else tRow.push(null);
                                    break;
                            }
                        }
                        exportData.push(tRow);
                    }

                    var buffer = xlsx.build([{ name: "通讯录", data: exportData }]);

                    var fileName = ts2str() + ".xlsx";

                    res.setHeader('Content-Type', 'application/vnd.openxmlformats');
                    res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
                    res.end(buffer, 'binary');

                    //存为本地文件
                    //fs.writeFileSync('export.xlsx', buffer, 'binary');
                });
            });
        }
    });
}

function fetchMetaData(req, teamid, module) {

    var url = 'http://' + req.headers.host + '/propertySeq/get';

    var params = {
        teamid: teamid,
        module: module
    };

    return http.post(url, params);
}

function fetchData(teamid, module, filters, filter_operator) {

    var url = CONFIG.tomcaturl + '/crm/data/query';

    if (filters == '' || filters == null) filters = '[]';

    if (filters == '' || filters == null) filter_operator = 'and';

    var params = {
        teamid: teamid,
        module: module,
        filters: JSON.parse(filters),
        filter_operater: filter_operator,
        limit: 9999,
        offset: 0
    };
    return http.post(url, params);
}

function authenticate(email, password) {
    var url = CONFIG.baseUrl + 'index.php/Account/authenticate';
    var params = {
        email: email,
        password: password
    };
    return http.post(url, params);
}

function ts2str(ts) {

    if (ts) {
        ts = parseInt(ts);
        var date = new Date(ts * 1000);
    } else {
        var date = new Date();
    }

    var time = date.getFullYear() + "-" + (date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + "-" + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate());

    return time;
}

module.exports = router;