
var states = [
    [
        {
            answer:{
                type: "ask",
                text: "请问你已经注册微信账号了吗？回答：已注册或没有注册"
            },
            skip: {
                by: "wx_registered",
                to: 1
            },
            next:[
                {"a": "已注册", "to": 1, "knowledge": "wx_registered"},
                {"a": "未注册", "to": 2}
            ]
        },
        {
            answer:{
                type: "ask",
                text: "请问你的微信账户是否绑定了银行卡？回答：已绑定或未绑定"
            },
            skip: {
                by: "wx_card_binded",
                to: 3
            },
            next:[
                {"a": "已绑定", "to": 3, "knowledge": "wx_card_binded"},
                {"a": "未绑定", "to": 4}
            ]
        },
        {
            answer:{
                type: "answer",
                text: "请按照下面的步骤注册一个微信账号。回答注册成功或注册失败",
                url: "http://121.42.253.43/2017/03/13/%E6%B3%A8%E5%86%8C%E5%BE%AE%E4%BF%A1/"
            },
            next:[
                {"a": "已注册", "to": 1, "knowledge": "wx_registered"},
                {"a": "未注册", "to": 2}
            ]
        },
        {
            answer:{
                type: "answer",
                text: "请您按照下面的步骤发红包",
                url: "http://jingyan.baidu.com/article/215817f797eec91eda142390.html"
            }
        },
        {
            answer:{
                type: "answer",
                text: "进入微信轻触【我】->【钱包】->【银行卡】->添加银行卡->填写银行卡信息->输入验证码绑定，添加银行卡。回答绑定成功或绑定失败",
                url: "http://jingyan.baidu.com/article/455a9950885fcca1662778dd.html"
            },
            next:[
                {"a": "已绑定", "to": 3, "knowledge": "wx_card_binded"},
                {"a": "未绑定", "to": 4}
            ]
        }
    ],
    [
        {
            answer:{
                type: "ask",
                text: "请问你已经注册微信账号了吗？回答：已注册或没有注册"
            },
            skip: {
                by: "wx_registered",
                to: 1
            },
            next:[
                {"a": "已注册", "to": 1, "knowledge": "wx_registered"},
                {"a": "未注册", "to": 2}
            ]
        },
        {
            answer:{
                type: "ask",
                text: "请点击微信APP下方的‘发现’按钮，然后进入‘朋友圈’页面。请回答已进入或未进入"
            },
            next:[
                {"a": "已进入", "to": 3},
                {"a": "未进入", "to": 1}
            ]
        },
        {
            answer:{
                type: "answer",
                text: "请按照下面的步骤注册一个微信账号。回答注册成功或注册失败",
                url: "http://jingyan.baidu.com/article/14bd256e739a43bb6d2612a5.html"
            },
            next:[
                {"a": "已注册", "to": 1, "knowledge": "wx_registered"},
                {"a": "未注册", "to": 2}
            ]
        },
        {
            answer:{
                type: "ask",
                text: "请问您想发什么内容？请回答：图片、文字或者视频"
            },
            next:[
                {"a": "图片", "to": 4},
                {"a": "文字", "to": 6},
                {"a": "视频", "to": 5}
            ]
        },
        {
            answer:{
                type: "answer",
                text: "点击右上角的照相机按钮，在屏幕下方选择'手机相册'。选择您要发的图片，点击完成，配上文字就可以发送啦！"
            }
        },
        {
            answer:{
                type: "answer",
                text: "点击右上角的照相机按钮，在屏幕下方选择'拍摄'。按住拍摄快门按钮，拍摄一段视频。点击完成，配上文字就可以发送啦！"
            }
        },
        {
            answer:{
                type: "ask",
                text: "按住右上角的照相机按钮3秒以上，会弹出一个输入界面。在这里录入文字就可以发送纯文字的朋友圈啦！"
            }
        }
    ],
    [
        {
            answer:{
                type: "ask",
                text: "您现在位于{{param1}}，山药种植需要沙质土壤，与您周边的土地类型有差异。如果希望学习种植技术，请回答‘学习’",
                params: ["location"]
            },
            next: [
                {"a": "学习", "to": 1}
            ]
        },
        {
            answer:{
                type: "answer",
                text: "有关山药的种植技术，请阅读下文",
                url: "http://app.ngonline.cn/?from=groupmessage&isappinstalled=0"
            }
        }
    ],
    [
        {
            answer:{
                type: "ask",
                text: "您现在位于{{param1}}，该地区当前属于玉米螟高发期。如果希望向本地植保站报告虫害，请回答'上传'；希望确定是何种害虫，请回答'查询害虫'；希望购买农药，请回答'买农药'",
                params: ["location"]
            },
            next: [
                {"a": "上传", "to": 1},
                {"a": "查询害虫", "to": 2},
                {"a": "买农药", "to": 3}
            ]
        },
        {
            answer:{
                type: "ask",
                text: "您的报告已经上传，谢谢"
            },
            action: "sms",
            next: [
                {"a": "查询害虫", "to": 2},
                {"a": "买农药", "to": 3}
            ]
        },
        {
            answer:{
                type: "ask",
                text: "请对照下面的图片，判断您遇到的病虫害类型",
                url: "http://baike.baidu.com/link?url=FXXfbr9CJyiXc69y__XjE8n6ESkUW7ovBnVyGbiW9erqF9_-7gNwHrfJCbquZtmOIkPnETcnexsKN55NvEyLZbbeHGHmh0okBGvg5kBGPUJ11rcY8rl3T8zNeSy2TldJ"
            },
            next: [
                {"a": "买农药", "to": 3}
            ]
        },
        {
            answer:{
                type: "answer",
                text: "您可以在这个商城里购买玉米螟的农药",
                url: "http://www.jd.com"
            }
        }

    ],
    [
        {
            answer:{
                type: "answer",
                text: "请观看下面的视频，学习如何使用智能手机",
                url: "http://www.ngonline.cn/nysp/zdzyjy_nysp/201606/t20160627_188245.html"
            }
        }
    ],
    [
        {
            answer:{
                type: "answer",
                text: "请观看下面的视频，学习农业技术",
                url: "http://app.ngonline.cn/?from=groupmessage&isappinstalled=0"
            }
        }
    ],
    [
        {
            answer:{
                type: "answer",
                text: "请在下面的网站中下载达人接力的应用",
                url: "http://mobilengx.net.cn"
            }
        }
    ]
]

function getStates(){
    return states;
}

module.exports = {
    getStates: getStates
};

