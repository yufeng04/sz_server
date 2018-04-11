'use strict';

/**
 * Created by danzhang on 2017/2/14.
 */

var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler');
var qaRobot = require('./qaRobotDemo');

router.all('/get', function (req, res) {
    api('get', req, res);
});
router.all('/del', function (req, res) {
    api('del', req, res);
});
router.all('/update', function (req, res) {
    api('update', req, res);
});
router.all('/add', function (req, res) {
    api('add', req, res);
});
router.all('/answer', function (req, res) {

    var question = http.getRequest(req, 'q');
    var appid = http.getRequest(req, 'appid');
    var sid = http.getRequest(req, 'sid');

    if (typeof question == 'undefined' || typeof appid == 'undefined') res.json({
        result: "FAIL",
        errMsg: "invalid inputs"
    });

    qaRobot.answer(appid, question, sid, res);
});

function api(action, req, res) {

    if (mongo.isConnected()) {
        console.log("db exist");
        exeApi(action, req, res);
    } else {
        console.log("db not existed");
        mongo.connect(CONFIG.qa_db_url, CONFIG.qa_db_db).then(function (result) {

            if (result) {
                mongo.setCollection(CONFIG.qa_db_col);

                exeApi(action, req, res);
            } else {
                res.json({
                    'result': 'FAIL',
                    'errMsg': '无法连接数据库'
                });

                mongo.close();
            }
        });
    }
}

function exeApi(action, req, res) {
    switch (action) {
        case 'get':
            getData(req, res);
            break;
        case 'add':
            addData(req, res);
            break;
        case 'del':
            delData(req, res);
            break;
        case 'update':
            updateData(req, res);
            break;
        default:
            break;
    }
}

function getData(req, res) {

    var appid = http.getRequest(req, 'appid');
    var limit = http.getRequest(req, 'limit');
    var offset = http.getRequest(req, 'offset');
    var query_q = http.getRequest(req, 'q');
    var query_a = http.getRequest(req, 'a');

    if (typeof appid == 'undefined' || appid == null || typeof limit == 'undefined' || limit == null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        //mongo.close();
        return;
    }

    if (typeof offset == 'undefined' || offset == null) {
        offset = 0;
    }

    //查询条件
    var where = { "appid": appid };
    if (query_a) {
        where["text"] = { "$regex": query_a };
    }
    if (query_q) {
        where["in_response_to.text"] = { "$regex": query_q };
    }

    var sortOption = { "update_gmt": -1 };

    mongo.find(where, {}, sortOption, limit, offset).then(function (results) {
        if (results) {

            var rets = [];
            for (var j = 0; j < results.length; j++) {
                var result = results[j];
                var ret = {};
                ret.id = result._id;
                ret.type = result.type;
                ret.a = result.text;
                ret.q = [];
                for (var i = 0; i < result.in_response_to.length; i++) {
                    ret.q.push(result.in_response_to[i].text);
                }
                rets.push(ret);
            }

            res.json({
                'result': 'SUCCESS',
                'list': rets
            });
        } else {
            res.json({
                'result': 'FAIL',
                'list': '无法读取数据'
            });
        }

        //mongo.close();
    });
}

var addData = function addData(req, res) {
    var appid = http.getRequest(req, 'appid');
    var corpusType = http.getRequest(req, 'type');
    var data = http.getRequest(req, 'data');

    if (typeof appid == 'undefined' || appid === null || typeof data == 'undefined' || data === null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        return;
    }

    corpusType = corpusType ? parseInt(corpusType) : 1;

    var corpus = [];
    try {
        corpus = JSON.parse(data);
        if (!(corpus instanceof Array)) {
            res.json({
                result: "FAIL",
                errMsg: "data参数格式错误"
            });
            return;
        }
    } catch (err) {
        console.log('json parse error: ' + err);
        res.json({
            result: "FAIL",
            errMsg: "data参数不是合法的JSON字符串"
        });
        return;
    }

    //检查是否有重复
    var answerList = [];
    for (var i = 0; i < corpus.length; i++) {
        if (corpus[i].a) answerList.push(corpus[i].a);
    }
    mongo.find({ "text": { $in: answerList }, "appid": appid }, {}, 0, 0).then(function (results) {
        if (results) {

            if (results.length) {
                res.json({
                    'result': 'FAIL',
                    'errMsg': '语料已存在',
                    'list': results
                });

                //mongo.close();
            } else {
                var inputs = [];

                for (var i = 0; i < corpus.length; i++) {
                    var input = {};
                    if (corpusType == 1) {
                        input.text = corpus[i].a;
                    } else {
                        try {
                            input.text = JSON.parse(corpus[i].a);
                        } catch (e) {
                            res.json({
                                'result': 'FAIL',
                                'errMsg': 'JSON解析错误',
                                'list': results
                            });

                            //mongo.close();
                            return;
                        }
                    }

                    input.appid = appid;
                    input.type = corpusType ? corpusType : 1;
                    input.in_response_to = [];
                    for (var j = 0; j < corpus[i].q.length; j++) {
                        input.in_response_to.push({
                            "text": corpus[i].q[j]
                        });
                    }
                    inputs.push(input);
                }
                mongo.insert(inputs).then(function (ret) {

                    res.json({
                        'result': 'SUCCESS',
                        'list': ret
                    });

                    //mongo.close();
                }).catch(function (err) {

                    res.json({
                        'result': 'FAIL',
                        'errMsg': err.message
                    });

                    //mongo.close();
                });
            }
        } else {
            res.json({
                'result': 'FAIL',
                'list': '无法读取数据'
            });

            //mongo.close();
        }
    });
};

var delData = function delData(req, res) {
    var appid = http.getRequest(req, 'appid');
    var ids = http.getRequest(req, 'ids');

    if (typeof appid == 'undefined' || appid === null || typeof ids == 'undefined' || ids === null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        return;
    }

    var delList = [];
    try {
        delList = JSON.parse(ids);
        if (!(delList instanceof Array)) {
            res.json({
                result: "FAIL",
                errMsg: "ids参数格式错误"
            });
            return;
        }
    } catch (err) {
        console.log('json parse error: ' + err);
        res.json({
            result: "FAIL",
            errMsg: "ids参数不是合法的JSON字符串"
        });
        return;
    }

    for (var i = 0; i < delList.length; i++) {
        delList[i] = new ObjectID(delList[i]);
    }

    //删除
    mongo.remove({ "_id": { $in: delList } }).then(function (n) {
        res.json({
            result: 'SUCCESS',
            count: n
        });

        //();
    }).catch(function (err) {
        console.log(err);
        res.json({
            result: 'FAIL',
            errMsg: err.message
        });

        //mongo.close();
    });
};

function updateData(req, res) {
    var appid = http.getRequest(req, 'appid');
    var id = http.getRequest(req, 'id');
    var data = http.getRequest(req, 'data');

    if (typeof appid == 'undefined' || appid === null || typeof id == 'undefined' || id === null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        return;
    }

    var updateData = {};
    try {
        updateData = JSON.parse(data);
    } catch (err) {
        console.log('json parse error: ' + err);
        res.json({
            result: "FAIL",
            errMsg: "data参数不是合法的JSON字符串"
        });
        return;
    }

    var oid = new ObjectID(id);

    var input = {};
    input.text = updateData.a;
    input.appid = appid;
    input.type = updateData.type;
    input.in_response_to = [];
    for (var j = 0; j < updateData.q.length; j++) {
        input.in_response_to.push({
            "text": updateData.q[j]
        });
    }

    mongo.update({ "_id": oid }, input).then(function (n) {

        res.json({
            result: 'SUCCESS',
            count: n
        });
        //mongo.close();
    }).catch(function (err) {
        res.json({
            result: 'FAIL',
            errMsg: err.message
        });

        //mongo.close();
    });
}

module.exports = router;