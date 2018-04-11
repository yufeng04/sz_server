/**
 * Created by danzhang on 2017/2/15.
 */

var mysql = require('mysql');
var CONFIG = require('../config.json');
var express = require('express');
var xlsx = require('node-xlsx');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler')

var router = express.Router();


router.all("/export", function (req, res) {
    api("export", req, res);
})

router.all("/userinfo", function (req, res) {
    api("userinfo", req, res);
})

var metaData;       //字段数据
var pureData;       //表格数据
var _CRM_COLLECTION_NAME;

function api(action, req, res) {

    var teamid = http.getRequest(req, 'teamid');
    var module = http.getRequest(req, 'module');

    if(teamid==null){
        res.json({
            'result': 'FAIL',
            'errMsg': 'invalid inputs'
        });
        return;
    }

    if(module==null)
        module = 1;

    _CRM_COLLECTION_NAME = "crm_" + module.toString() + '_' + teamid;

    if (mongo.isConnected()) {
        console.log("db exist");
        mongo.setCollection(_CRM_COLLECTION_NAME);
        exeApi(action, req, res);
    } else {
        console.log("db not existed");
        mongo.connect(CONFIG.mongodburl)
            .then(function (result) {
                if (result) {
                    mongo.setCollection(_CRM_COLLECTION_NAME);
                    exeApi(action, req, res);
                } else {
                    res.json({
                        'result': 'FAIL',
                        'errMsg': '无法连接数据库'
                    })
                    mongo.close();
                }
            });
    }
}

function exeApi(action, req, res) {
    switch (action) {
        case 'export':
            exportData(req, res);
            break;
        case 'userinfo':
            getUserInfo(req, res);
        default:
            break;
    }
};

function exportData(req, res) {
    var teamid = http.getRequest(req, 'teamid');
    var module = http.getRequest(req, 'module');
    var filters = http.getRequest(req, 'filters');
    var operator = http.getRequest(req, 'operator');
    var email = http.getRequest(req, 'email');
    var password = http.getRequest(req, 'password');

    authenticate(email, password).then(function (response) {
        if (typeof(response) == 'undefined') {
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
            fetchMetaData(req, teamid, module)
                .then(function (response) {
                    if (typeof(response) == 'undefined') {
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
                    fetchData(teamid, module, filters, operator)
                        .then(function (response) {

                            if (response.result == 'FAIL') {
                                res.json(response);
                                return;
                            }

                            pureData = response.list;
                            var exportData = [];

                            //字段排序
                            metaData.sort(function (a, b) {
                                return ( parseInt(a.seq) - parseInt(b.seq) );
                            })

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
                                            if (pureData[i][metaData[j]._index])
                                                tRow.push(pureData[i][metaData[j]._index].desc);
                                            else
                                                tRow.push(null);
                                            break;
                                        case 'datetime':
                                            if (pureData[i][metaData[j]._index])
                                                tRow.push(ts2str(pureData[i][metaData[j]._index]));
                                            else
                                                tRow.push(null);
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

                                            if (k == rangeValueList.length)
                                                tRow.push(null);

                                            break;
                                        default:
                                            if (pureData[i][metaData[j]._index])
                                                tRow.push(pureData[i][metaData[j]._index]);
                                            else
                                                tRow.push(null);
                                            break;
                                    }
                                }
                                exportData.push(tRow);
                            }

                            var buffer = xlsx.build([{name: "通讯录", data: exportData}]);

                            var fileName = ts2str() + ".xlsx";

                            res.setHeader('Content-Type', 'application/vnd.openxmlformats');
                            res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
                            res.end(buffer, 'binary');


                            //存为本地文件
                            //fs.writeFileSync('export.xlsx', buffer, 'binary');

                        })
                })
        }
    });
}

function getUserInfo(req, res){
    var oidListStr = http.getRequest(req, "oidlist");
    var oidList = new Array();

    try{
        oidList = JSON.parse(oidListStr);
    }catch(err){
        console.log( 'json parse error: ' + err);
        res.json({
            result: "FAIL",
            errMsg: "oidlist参数不是合法的JSON字符串"
        });
        return;
    }

    for(var i=0; i<oidList.length; i++){
        if(oidList[i])
            oidList[i] = ObjectID(oidList[i]);
    };
    var where = {
        "_id": {$in: oidList}
    };

    mongo.find(where)
        .then(function(response){
            if(response){
                //去掉无关数据
                for(var i=0; i<response.length; i++)
                {
                    delete(response[i].notes)
                }
                res.json({
                    result: 'SUCCESS',
                    list: response
                })
            }else{
                res.json({
                    'result': 'FAIL',
                    'list': '无法读取数据'
                })
            }
        })
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

    if (filters == '' || filters == null)
        filters = '[]';

    if (filters == '' || filters == null)
        filter_operator = 'and';

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
    }
    return http.post(url, params);
}


function ts2str(ts) {

    if (ts) {
        ts = parseInt(ts);
        var date = new Date(ts * 1000);
    } else {
        var date = new Date();
    }

    var time = date.getFullYear() + "-"
        + (date.getMonth() < 10 ? '0' + (date.getMonth()+1) : (date.getMonth()+1)) + "-"
        + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) ;


    return time;
}

module.exports = router;
