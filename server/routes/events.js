/**
 * Created by danzhang on 2017/2/23.
 */

var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler')

var _EVENT_COLLECTION_NAME = "event";

router.all('/track', function(req, res) {
    api('track', req, res)
});

router.all('/check', function(req, res) {
    api('check', req, res)
});

router.all('/add', function(req, res) {
    api('add', req, res)
});

router.all('/update', function(req, res) {
    api('update', req, res)
});


function api(action, req, res){

    if (mongo.isConnected()) {
        console.log("db exist");
        mongo.setCollection(_EVENT_COLLECTION_NAME);
        exeApi(action, req, res);
    } else {
        console.log("db not existed");
        mongo.connect(CONFIG.mongodburl)
            .then(function (result) {
                if (result) {
                    mongo.setCollection(_EVENT_COLLECTION_NAME);
                    exeApi(action, req, res);
                } else {
                    http.echoError(res, 'CONNECT_DB_FAIL');
                    mongo.close();
                }
            });
    }
}

function exeApi(action, req, res){
    switch(action){
        case 'track':
            getEventTimeLine(req, res);
            break;
        case 'check':
            clientExist(req, res);
            break;
        case 'add':
            addClient(req, res);
            break;
        case 'update':
            updateClient(req, res);
            break;
        default:
            break;
    }
}

function getEventTimeLine (req, res){
    var clientid = http.getRequest(req, 'clientid');
    var appid = http.getRequest(req, 'appid');
    var limit = http.getRequest(req, 'limit');
    var offset = http.getRequest(req, 'offset');

    if( typeof(appid)=='undefined' || appid===null
        || typeof(clientid)=='undefined' || clientid===null ){
        http.echoError(res, 'INVALID_INPUTS');
        return;
    }

    limit = limit?parseInt(limit):10;
    offset = offset?parseInt(offset):0;

    var where = {
        '_id': clientid
    }
    mongo.find(where)
        .then(function(response){

            var eventList = [];
            if(response && response.length){
                eventList = response[0][appid].splice( (-1)*limit );
            }

            http.echoSuccess(res, {list: eventList});

        }).catch(function(err){
            http.echoError(res, 'DB_NOT_READABLE', err.message);
        })


}

/**********************
 * 检查数据库中是否存在某个clientid的记录，不存在的话则添加
 * @param req.clientid    用户id
 * @param req.insert      如果不存在是否要插入一条
 * @param res
 */
function clientExist(req, res){
    var clientid = http.getRequest(req, 'clientid');
    var insertIfNoExist = http.getRequest(req, 'insert');

    if(clientid==null){
        http.echoError(res, 'INVALID_INPUTS');
        return;
    }

    var where  = {
        "_id": clientid
    };

    mongo.find(where)
        .then(function(response){
            if(response){
                if( insertIfNoExist && response.length==0 )
                {
                    var raw = {
                        _id: clientid,
                        appids: []
                    }
                    mongo.insert(raw)
                        .then(function(res2){
                            if(res2){
                                http.echoSuccess(res, {counter: 1});
                            }else{
                                http.echoError(res, 'DB_NOT_WRITABLE');
                            }
                        })

                }else{
                    http.echoSuccess(res, {counter: response.length});
                }
            }else{
                http.echoError(res, 'DB_NOT_READABLE');
            }

            return;
        })

}

function addClient(req, res){

}


/**********************
 * 检查数据库中是否存在某个clientid的记录，不存在的话则添加
 * @param req.clientid    用户id
 * @param req.appid       appid
 * @param res.event       event对象， json字符串
 */

function updateClient(req, res){

    var clientid = http.getRequest(req, 'clientid');
    var appid = http.getRequest(req, 'appid');
    var eventStr = http.getRequest(req, 'event');

    try{
        var event = JSON.parse(eventStr);
    }catch(e){
        http.echoError(res, 'JSON_PARSE_ERROR');
        return;
    }

    var where = {
        _id: clientid
    };


    var eventObj = {};
    eventObj[appid] = event;

    var action = {
        $addToSet: {'appids': appid},
        $push: eventObj,
        $set: {'update_gmt': Math.floor(new Date().getTime()/1000)}
    };

    mongo.updateX(where, action)
        .then(function(n){
            http.echoSuccess(res, {count: n});
        }).catch(function(err){
            http.echoError(res, 'DB_NOT_UPDATABLE', err.message);
        })
}

module.exports = router;