/**
 * Created by danzhang on 2017/5/11.
 */

var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');

var http = require('./../models/httpHandler');

router.all('/saveinfo', function(req, res) {
    api("saveinfo", req, res)
});

router.all('/ip', function(req, res) {
    api("ip", req, res)
});

function api(action, req, res) {
    switch (action) {
        case 'saveinfo':
            saveClientInfo(req, res);
            break;
        case 'ip':
            parseIp(req, res);
            break;
        default:
            break;
    }
};

/**************************
 * 保存用户信息
 * @param clientid:   用户的id
 * @param convidList: 会话列表
 * @param fromAdmin:  用户身份
 * @param res
 */
function saveClientInfo(req, res){

    var params = req.body

    var url = "http://sdk.engyne.net/core/Clientinfo/save";

    http.post(url, params);

    res.json({
        result: "SUCCESS"
    });

    return;

}

module.exports = router;