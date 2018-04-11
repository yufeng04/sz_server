/**
 * Created by danzhang on 2017/2/16.
 */


var fetch = require('node-fetch');

require('isomorphic-fetch');
fetch.Promise = require('bluebird');


var errMsgList = {
    'INVALID_INPUTS': '输入参数错误',
    'CONNECT_DB_FAIL': '无法连接数据库',
    'DB_NOT_READABLE': '无法读取数据',
    'DB_NOT_WRITABLE': '无法写入数据',
    'DB_NOT_UPDATABLE': '无法更新数据',
    'JSON_PARSE_ERROR': 'JSON字符串不合法'
}

var post = function(url, params){

    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(params),
        headers: {'Content-Type': 'application/json;charset=utf-8'}
    }).then(
        function(res){
             return res.json();
        }
    );
}


var postx = function(url, params){

    var body = "";

    for(var key in params){
        body += (key + "=" + params[key] + "&");
    }

    return fetch(url, {
        method: 'POST',
        body: body,
        headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
    }).then(function(res){
        return res.json();
    })
}

var getRequest = function(req, key){
    if(req.method=='GET'){
        return req.query[key];
    }else{
        return req.body[key];
    }

    return null;
}

var echoSuccess = function(res, data){

    data.result = 'SUCCESS';
    res.json(data);

    return;
}

var echoError = function(res, errCode, errMsg){

    var data = {};
    data.result = 'FAIL';

    if(errCode){
        data.errMsg = errMsgList[errCode];
    }else{
        data.errMsg = errMsg;
    }

    res.json(data);

    return;
}

module.exports = {
    post: post,
    postx: postx,
    getRequest : getRequest,
    echoSuccess: echoSuccess,
    echoError: echoError
}