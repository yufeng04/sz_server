'use strict';

/**
 * Created by danzhang on 2017/3/6.
 */

/**
 * Created by danzhang on 2017/2/27.
 */

var fetch = require('node-fetch');

require('isomorphic-fetch');
fetch.Promise = require('bluebird');

/**********************
 *
 * @param question 提问内容
 *
 * 返回结构:
 * {
 *    result: 'SUCCESS',
 *    answer:{
 *          'action': 'answer/ask/url/app',
 *          'text': '',
 *          'url': '',
 *          'app': '',
 *          'sid': 3432432432
 *    }
 * }
 *
 *
 */

var qaUrl = "http://121.42.191.196:8085/qamulti";
var sidList = {};

var proc = [[{
    answer: {
        type: "ask",
        text: "请问你已经注册微信账号了吗？"
    },
    next: [{ "a": "已注册", "to": 1 }, { "a": "未注册", "to": 2 }]
}, {
    answer: {
        type: "ask",
        text: "请问你的微信账户是否绑定了银行卡？"
    },
    next: [{ "a": "已绑定", "to": 3 }, { "a": "未绑定", "to": 4 }]
}, {
    answer: {
        type: "answer",
        text: "请按照下面的步骤注册一个微信账号。回答注册成功或注册失败",
        url: "http://jingyan.baidu.com/article/14bd256e739a43bb6d2612a5.html"
    },
    next: [{ "a": "已注册", "to": 1 }, { "a": "未注册", "to": 2 }]
}, {
    answer: {
        type: "answer",
        text: "请您按照下面的步骤发红包",
        url: "http://jingyan.baidu.com/article/215817f797eec91eda142390.html"
    }
}, {
    answer: {
        type: "answer",
        text: "进入微信轻触【我】->【钱包】->【银行卡】->添加银行卡->填写银行卡信息->输入验证码绑定，添加银行卡。回答绑定成功或绑定失败",
        url: "http://jingyan.baidu.com/article/455a9950885fcca1662778dd.html"
    },
    next: [{ "a": "已绑定", "to": 3 }, { "a": "未绑定", "to": 4 }]
}], [{
    answer: {
        type: "ask",
        text: "请问你已经注册微信账号了吗？"
    },
    next: [{ "a": "已注册", "to": 1 }, { "a": "未注册", "to": 2 }]
}, {
    answer: {
        type: "ask",
        text: "请点击微信APP下方的‘发现’按钮，然后进入‘朋友圈’页面。请回答已进入或未进入"
    },
    next: [{ "a": "已进入", "to": 3 }, { "a": "未进入", "to": 1 }]
}, {
    answer: {
        type: "answer",
        text: "请按照下面的步骤注册一个微信账号。请问注册成功了吗？",
        url: "http://jingyan.baidu.com/article/14bd256e739a43bb6d2612a5.html"
    },
    next: [{ "a": "已注册", "to": 1 }, { "a": "未注册", "to": 2 }]
}, {
    answer: {
        type: "ask",
        text: "朋友圈有三种内容形式，图片、文字或者视频。请问您想发什么内容？"
    },
    next: [{ "a": "图片", "to": 4 }, { "a": "文字", "to": 6 }, { "a": "视频", "to": 5 }]
}, {
    answer: {
        type: "answer",
        text: "点击右上角的照相机按钮，在屏幕下方选择'手机相册'。选择您要发的图片，点击完成，配上文字就可以发送啦！"
    }
}, {
    answer: {
        type: "answer",
        text: "点击右上角的照相机按钮，在屏幕下方选择'拍摄'。按住拍摄快门按钮，拍摄一段视频。点击完成，配上文字就可以发送啦！"
    }
}, {
    answer: {
        type: "ask",
        text: "按住右上角的照相机按钮3秒以上，会弹出一个输入界面。在这里录入文字就可以发送纯文字的朋友圈啦！"
    }
}]];

//从大到小排序
function sortAnswer(a, b) {
    return b.confidence - a.confidence;
}

function answer(appid, question, sid, response) {

    //查询演示问答库
    getAnswer(question, sid, appid).then(function (res) {
        if (res.result == 'SUCCESS' && res.data && res.data.length) {

            if (typeof sidList[sid] == 'undefined') sidList[sid] = {};

            var answers = res.data.sort(sortAnswer);

            var intent = answers[0].answer.intent;
            console.log(intent);
            switch (intent) {
                case '发微信红包':
                    sidList[sid].lastProc = 0;
                    stateChain(0, sid, intent, response);
                    break;
                case '发微信朋友圈':
                    sidList[sid].lastProc = 1;
                    stateChain(1, sid, intent, response);
                    break;
                default:
                    if (typeof sidList[sid].lastProc != "undefined") {
                        stateChain(sidList[sid].lastProc, sid, intent, response);
                    } else {
                        gotoUnknow(response);
                    }
                    break;
            }

            return;
        }

        //得不到答案的情况下，查询普通问答库
        getNormalAnswer("agriculture", question).then(function (res) {
            if (res.result == 'SUCCESS') {

                if (res.data.length) {
                    var answers = res.data.sort(sortAnswer);

                    response.json({
                        result: 'SUCCESS',
                        answer: {
                            action: 'answer',
                            text: decodeURIComponent(answers[0].answer)
                        }
                    });

                    return;
                } else {
                    gotoUnknow(response);
                    return;
                }
            }
        });
    });
}

function getAnswer(q, sid, appid) {

    return fetch(qaUrl, {
        method: 'POST',
        body: 'qa=' + q + '&appid=demo'
    }).then(function (result) {
        return result.json();
    }).catch(function (err) {
        console.log(err.message);
    });
}

function getNormalAnswer(appid, q) {

    return fetch(qaUrl, {
        method: 'POST',
        body: 'qa=' + q + '&appid=' + appid
    }).then(function (result) {
        return result.json();
    }).catch(function (err) {
        console.log(err.message);
    });
}

function stateChain(procIndex, sid, intent, res) {
    console.log(sidList[sid].lastStep);
    if (typeof sidList[sid].lastStep == 'undefined') {
        //第一次进入
        gotoStep(procIndex, sid, res, 0);
    } else {
        var expectList = proc[procIndex][sidList[sid].lastStep].next;
        expectList = expectList ? expectList : [];

        if (expectList.length == 0) {
            //走到了最后一步
            reachBottom(procIndex, sid, intent, res);
        }

        for (var i = 0; i < expectList.length; i++) {
            if (expectList[i].a == intent) {
                gotoStep(procIndex, sid, res, expectList[i].to);
                break;
            }
        }
        if (i == expectList.length && i > 0) {
            //默认路径
            //gotoStep(procIndex, sid, res, expectList[0].to);
            repeatStep(procIndex, sid, res);
        }
    }
}

function gotoStep(procIndex, sid, res, index) {
    res.json({
        "result": "SUCCESS",
        "answer": proc[procIndex][index].answer
    });
    sidList[sid].lastStep = index;
}

function repeatStep(procIndex, sid, res) {
    var lastStepAnswer = proc[procIndex][sidList[sid].lastStep].answer;

    res.json({
        "result": "SUCCESS",
        "answer": {
            "action": "ask",
            "text": "抱歉，没有听清您的回答。" + lastStepAnswer.text
        }
    });
}

function gotoUnknow(res) {

    res.json({
        result: "SUCCESS",
        answer: {
            action: "answer",
            text: "抱歉，没有听清您的问题，或者该问题超出了我的知识范围"
        }
    });
    return;
}

function reachBottom(procIndex, sid, intent, res) {

    delete sidList[sid].lastStep;

    switch (intent) {
        case '发微信红包':
            sidList[sid].lastProc = 0;
            gotoStep(0, sid, res, 0);
            break;
        case '发微信朋友圈':
            sidList[sid].lastProc = 1;
            gotoStep(1, sid, res, 0);
            break;
        default:
            delete sidList[sid].lastProc;
            res.json({
                result: "SUCCESS",
                answer: {
                    action: "answer",
                    text: "这个知识点已经讲完啦。你可以问新的问题，或者再问一遍这个知识点。"
                }
            });
            break;
    }

    return;
}

module.exports = {
    answer: answer
};