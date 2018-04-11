/**
 * Created by danzhang on 2017/5/5.
 */

var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler')

var _MESSGE_COLLECTION_NAME = "messages";

router.all('/unread', function(req, res) {
    api("unread", req, res)
});

router.all('/history', function(req, res) {
    api("history", req, res)
});

function api(action, req, res) {


    if (mongo.isConnected()) {
        console.log("db exist");
        mongo.setCollection(_MESSGE_COLLECTION_NAME);
        exeApi(action, req, res);
    } else {
        console.log("db not existed");
        mongo.connect(CONFIG.mongodburl)
            .then(function (result) {
                if (result) {
                    mongo.setCollection(_MESSGE_COLLECTION_NAME);
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
        case 'unread':
            getUnreadMessage(req, res);
            break;
        case 'history':
            getHistoryMessageOfConv(req, res);
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
function getUnreadMessage(req, res){
    var clientid = http.getRequest(req, 'clientid');
    var convidListStr = http.getRequest(req, 'convidlist');
    var fromAdmin = http.getRequest(req, 'admin');

    var convidList = new Array();
    try{
        convidList = JSON.parse(convidListStr);
    }catch(err){
        console.log( 'json parse error: ' + err);
        res.json({
            result: "FAIL",
            errMsg: "convidlist参数不是合法的JSON字符串"
        });
        return;
    }

    var where = {
        '_id': {$in: convidList}
    };

    var list = new Array();

    mongo.find(where)
        .then(function(response){
            if(response){
                for(var i=0; i<response.length; i++){
                    list[i] = getUnreadMessageOfConv(response[i], clientid, fromAdmin);
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

function getUnreadMessageOfConv(conv, clientid, fromAdmin){
    var ret = {};
    ret.lastMsgTime = conv.time;
    ret.unread = new Array();
    ret.convid = conv._id;

    var msgList = conv.msg;
    var lastIndex = msgList.length - 1;

    if(fromAdmin){
        //为客服返回未读留言，只返回最后一条
        if( msgList[lastIndex].extra.admin!=1 && msgList[lastIndex].read.length==0 ){
            ret.unread.push(msgList[lastIndex]);
        }
    }else{
        //为客户返回未读留言，最多5条
        for( var i=lastIndex; i>=0; i-- ){
            if( msgList[i].from!=clientid && msgList[i].read.length==0 ){
                ret.unread.push(msgList[i]);
                if(ret.unread.length>=5)
                    break;
            }
        }
    }

    return ret;
}

function getHistoryMessageOfConv(req, res){

    var convid = http.getRequest(req, 'convid');
    var offsetid = http.getRequest(req, 'offset');
    var limit = http.getRequest(req, 'limit');

    limit = limit?parseInt(limit):10;

    var where = {
        '_id': convid
    };

    mongo.find(where)
        .then(function(response){
            if(response){

                var list = new Array();

                if(response.length){

                    var msgList = response[0].msg;
                    var len = msgList.length;

                    if(offsetid==null){
                        var offsetFound = true;
                    }else{
                        var offsetFound = false;
                    }

                    for(var i=(len-1); i>=0; i--){

                        if(msgList[i].tmpindex==offsetid){
                            offsetFound = true;
                        }else{
                            if(offsetFound){
                                list.push(msgList[i]);
                                if(list.length>=limit)
                                    break;
                            }
                        }
                    }
                }

                res.json({
                    'result': 'SUCCESS',
                    'list': list
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