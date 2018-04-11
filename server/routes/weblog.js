/**
 * Created by danzhang on 2017/3/5.
 */


var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler')

router.all('/get', function(req, res) {
    api('get', req, res)
});


function api(action, req, res){

    mongo.connect(CONFIG.mongodburl, null)
        .then(function(result){

            if(result){

                mongo.setCollection("loginfo");

                switch(action){
                    case 'get':
                        getData(req, res);
                        break;
                    default:
                        break;
                }
            }else{
                res.json({
                    'result': 'FAIL',
                    'errMsg': '无法连接数据库'
                })
            }
        })
}

function getData(req, res){
    var appid = http.getRequest(req, 'appid');
    var limit = http.getRequest(req, 'limit');
    var offset = http.getRequest(req, 'offset');
    var startPage = http.getRequest(req, 'start');
    var endPage = http.getRequest(req, 'end');

    if( typeof(appid)=='undefined' || appid == null ){
        res.json({
            "result": "FAIL",
            "errMsg": "Invalid inputs"
        })
        return;
    }

    limit = limit?parseInt(limit):1;
    offset = offset?parseInt(offset):0;

    var where = {
        "log.appid": appid,
        "log.1": {$exists: true}
    }

    if(startPage && endPage)
    {
        where["log.pageid"] = { $all: [startPage, endPage]};
    }

    mongo.find(where, {}, null, limit, offset)
        .then(function(result){
            if(result){
                res.json({
                    "result": "SUCCESS",
                    "list": result
                });
            }else{
                res.json({
                    "result": "FAIL",
                    "errMsg": "Mongo Error"
                })
            }

            mongo.close();

        })
}

module.exports = router;
