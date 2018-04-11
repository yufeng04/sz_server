'use strict';

/**
 * Created by danzhang on 2017/2/23.
 */

var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');
var ObjectID = require('mongodb').ObjectID;

var http = require('./../models/httpHandler');
var mongo = require('../models/mongoHandler');

var _EVENT_COLLECTION_NAME = "event";

router.all('/track', function (req, res) {
    api('track', req, res);
});

function api(action, req, res) {

    mongo.connect(CONFIG.mongodburl, null).then(function (result) {

        if (result) {

            mongo.setCollection(_EVENT_COLLECTION_NAME);

            switch (action) {
                case 'track':
                    getEventTimeLine(req, res);
                    break;
                default:
                    break;
            }
        } else {
            res.json({
                'result': 'FAIL',
                'errMsg': '无法连接数据库'
            });
        }
    });
}

var getEventTimeLine = function getEventTimeLine(req, res) {
    var appid = http.getRequest(req, 'appid');
    var clientid = http.getRequest(req, 'clientid');
    var limit = http.getRequest(req, 'limit');
    var offset = http.getRequest(req, 'offset');

    if (typeof appid == 'undefined' || appid === null || typeof limit == 'undefined' || limit === null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        return;
    }

    limit = limit ? parseInt(limit) : 50;
    offset = offset ? parseInt(offset) : 0;

    var where = {
        '_id': new ObjectID(clientid)
    };
    mongo.find({});
};

module.exports = router;