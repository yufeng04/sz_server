'use strict';

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

var qaUrl = "http://121.42.191.196:8080/qamulit";
var actionUrl = "http://121.42.191.196:8084/qa";

//从大到小排序
function sortAnswer(a, b) {
    return b.confidence - a.confidence;
}

function answer(appid, question, response) {

    var result1 = null;
    var result2 = null;

    getAnswer(appid, question).then(function (res) {
        if (res.result == 'SUCCESS') {

            if (res.data.length) {
                var answers = res.data.sort(sortAnswer);

                result1 = {
                    text: decodeURIComponent(answers[0].answer),
                    confidence: answers[0].confidence
                };
            } else {
                result1 = {
                    text: "抱歉，暂时无法回答您的问题",
                    confidence: 0
                };
            }
        } else {
            result1 = {
                text: "抱歉，暂时无法回答您的问题",
                confidence: 0
            };
        }

        compareResult(result1, result2, response);
    });

    getStructure(appid, question).then(function (res) {
        result2 = res;
        compareResult(result1, result2, response);
    });
}

function compareResult(r1, r2, response) {
    if (r1 && r2) {
        if (r1.confidence > r2.confidence || r2.status.code == 506) {
            response.json({
                result: 'SUCCESS',
                answer: {
                    action: 'answer',
                    text: r1.text
                }
            });
        } else {
            switch (r2.intent_name) {
                case '买肥料':
                    var params = r2.parameter_recognize;
                    for (var i = 0; i < params.length; i++) {
                        if (params[i].type == '肥料') {
                            console.log(params[i].text);
                            replyAboutHuafei(params[i].text, response);
                        }
                    }
                    break;
                case '打开新闻':
                    var params = r2.parameter_recognize;
                    for (var i = 0; i < params.length; i++) {
                        if (params[i].type == '新闻类型') {
                            console.log(params[i].text);
                            replyAboutXinwen(params[i].text, response);
                            break;
                        }
                    }
                    if (i == params.length) {
                        replyAboutXinwen("新闻", response);
                    }
                    break;
                default:
                    break;
            }
        }
    } else {
        return;
    }
}

function getAnswer(appid, q) {

    return fetch(qaUrl, {
        method: 'POST',
        body: 'qa=' + q + '&appid=' + appid
    }).then(function (result) {
        return result.json();
    }).catch(function (err) {
        console.log(err.message);
    });
}

function replyAboutXinwen(q, res) {
    var urlList = ["http://www.yn12316.net/yinong/infopubmore?laa_id=42924&lpait_id=1", "http://news.cctv.com/china", "http://news.cctv.com/world/", "http://sports.cctv.com/", "http://news.cctv.com/law/", "http://military.cctv.com/"];

    var reply = "请问您想看哪一类的新闻？";
    var action = "ask";
    var index = -1;

    switch (q) {
        case '军事新闻':
            index++;
        case '法制新闻':
            index++;
        case '体育新闻':
            index++;
        case '国际新闻':
            index++;
        case '国内新闻':
            index++;
        case '农业新闻':
            index++;
            reply = "正在为您打开" + q;
            action = "url";
            break;
        default:
            break;
    }

    res.json({
        result: 'SUCCESS',
        answer: {
            action: action,
            text: reply,
            url: index < 0 ? "" : urlList[index]
        }
    });

    return;
}

function replyAboutHuafei(q, res) {

    var urlList = ["https://search.jd.com/Search?keyword=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&enc=utf-8&wq=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&pvid=fe0e744840564749a33e38ab9b6b82ab", "https://search.jd.com/Search?keyword=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&enc=utf-8&wq=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&pvid=fe0e744840564749a33e38ab9b6b82ab", "https://search.jd.com/Search?keyword=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&enc=utf-8&wq=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&pvid=fe0e744840564749a33e38ab9b6b82ab", "https://search.jd.com/Search?keyword=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&enc=utf-8&wq=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&pvid=fe0e744840564749a33e38ab9b6b82ab", "https://search.jd.com/Search?keyword=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&enc=utf-8&wq=%E5%86%9C%E8%B5%84%20%E6%B0%AE%E8%82%A5&pvid=fe0e744840564749a33e38ab9b6b82ab"];

    var reply = "请问您想买哪种肥料？";
    var action = "ask";
    var index = -1;

    switch (q) {
        case '氮肥':
            index++;
        case '磷肥':
            index++;
        case '钾肥':
            index++;
        case '复合肥':
            index++;
        case '有机肥':
            index++;
            reply = "您可以到下面的电子商务网站购买" + q;
            action = "url";
            break;
        default:
            break;
    }

    res.json({
        result: 'SUCCESS',
        answer: {
            action: action,
            text: reply,
            url: index < 0 ? "" : urlList[index]
        }
    });

    return;
}

function getStructure(appid, q) {

    return fetch(actionUrl, {
        method: 'POST',
        body: 'qa=' + q + '&appid=' + appid
    }).then(function (result) {
        return result.json();
    }).catch(function (err) {
        console.log(err.message);
    });
}

function clearBuffer() {
    questions = [];
}

module.exports = {
    answer: answer
};