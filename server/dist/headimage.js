'use strict';

var express = require('express');
var querystring = require('querystring');
var fs = require('fs');
var httpHandler = require('../models/httpHandler');
var router = express.Router();
var CONFIG = require('../config.json');
//保存图片函数
var saveImg = function saveImg(res, img, name) {
    //过滤data:URL
    var base64Data = img.replace(/^data:image\/\w+;base64,/, "");
    var dataBuffer = new Buffer(base64Data, 'base64');
    //windows "./node-core/server/public/images/avatar/"
    //linux ./public/images/avatar/
    fs.writeFile("./node-core/server/public/images/avatar/" + name + ".png", dataBuffer, function (err) {
        if (err) {
            res.json({
                result: "FAIL",
                errMsg: err
            });
        } else {
            res.json({
                result: "SUCCESS"
            });
        }
    });
};
//获取网页的数据保存图片
router.all('/createImg', function (req, rest, next) {
    var param = req.query || req.params;
    var imgName;
    var imgSize;
    if (req.method == 'POST') {
        imgName = req.body.imgName;
        imgSize = req.body.imgSize;
    } else {
        imgName = param.imgName;
        imgSize = param.imgSize;
    }
    if (typeof imgName == 'undefined' || imgName == null || typeof imgSize == 'undefined' || imgSize == null) {
        rest.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });
        return;
    }
    fetchCreateImgData(imgName, imgSize).then(function (response) {
        if (typeof response.result == 'undefined') {
            rest.json({
                result: 'FAIL',
                errMsg: '无法获取数据'
            });
            return;
        } else {
            if (response.result == 'SUCCESS') {
                saveImg(rest, response.base64, imgName);
            }
        }
    }).catch(function (err) {
        rest.json({
            result: 'FAIL',
            errMsg: 'CREATEIMGPORT:' + err.message
        });
    });
});
router.all('/saveHeadImg', function (req, res, next) {
    var param = req.query || req.params;
    var fileName;
    var imgData;
    if (req.method == 'POST') {
        fileName = req.body.nickname;
        imgData = req.body.imgData;
    } else {
        fileName = param.fileName;
        imgData = param.imgData;
    }
    if (typeof fileName == 'undefined' || fileName == null || typeof imgData == 'undefined' || imgData == null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs "
        });
        return;
    }
    saveImg(res, imgData, fileName);
});

function fetchCreateImgData(imgName, imgSize) {

    var url = CONFIG.imgserver;
    var params = {
        userName: imgName,
        imgsize: imgSize
    };

    return httpHandler.post(url, params);
}

module.exports = router;