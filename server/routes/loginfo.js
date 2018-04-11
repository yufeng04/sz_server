/**
 * Created by danzhang on 2017/5/8.
 */

/**
 * Created by danzhang on 2017/5/5.
 */

var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler')

var _LOGINFO_COLLECTION_NAME = "loginfo";

router.all('/get', function(req, res) {
    api("get", req, res)
});

function api(action, req, res) {


    if (mongo.isConnected()) {
        console.log("db exist");
        mongo.setCollection(_LOGINFO_COLLECTION_NAME);
        exeApi(action, req, res);
    } else {
        console.log("db not existed");
        mongo.connect(CONFIG.mongodburl)
            .then(function (result) {
                if (result) {
                    mongo.setCollection(_LOGINFO_COLLECTION_NAME);
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
        case 'get':
            get(req, res);
            break;
        default:
            break;
    }
};

/**************************
 * 获取未读消息
 * @param clientid:   用户的id
 * @param convidList: 会话列表
 * @param fromAdmin:  用户身份
 * @param res
 */
function get(req, res){
    var clientid = http.getRequest(req, 'clientid');
    var limit = http.getRequest(req, 'limit');

    limit = limit?parseInt(limit):10;

    var where = {
        '_id': clientid
    };

    var list = new Array();

    mongo.find(where)
        .then(function(response){
            if(response){

                if(response.length){
                    var logs = response[0].log;
                    var len = logs.length;

                    if(len>= limit){
                        list = logs.splice( (-1)*limit );
                    }else{
                        list = logs;
                    }
                }

                res.json({
                    result: 'SUCCESS',
                    list: list
                })
            }else{
                res.json({
                    'result': 'FAIL',
                    'list': '无法读取数据'
                })
            }
        })
}

module.exports = router;