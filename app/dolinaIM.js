/**
 * Created by danzhang on 2017/3/16.
 */

var mqtt  = require('mqtt');
var Promise = require('bluebird');

Promise.promisifyAll(mqtt);

var client = null;
var mqtt_server = null;
var mqtt_options = null;
var isConnected = false;

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

var connect = function(mqttServer, options, topic, onConnected, onMessageCallback){

    if(mqtt_server==null)
        mqtt_server = mqttServer;

    if(mqtt_options==null)
        mqtt_options = options;

    client  = mqtt.connect(mqtt_server, mqtt_options);

    client.on('close', function(){
            console.log("robot lost connection");
            isConnected = false;
        });

    client.on('connect', function(){
            console.log('mqtt server connected');
            isConnected = true;

        onConnected();

        client.subscribe(topic);

        client.on('message', function(topic, message){

            try{
                var recStr = ab2str(message);
                var realMsg = JSON.parse(recStr);

                onMessageCallback(topic, realMsg);

            }catch(e){
                console.log("JSON error: " + e.message);
            }
        })
    });
}

var subscribe = function(topic){
    if(client && isConnected){
        client.subscribe(topic);
    }
}

var sendNewsMessage = function(topic, clientid, sessionid, convid, title, content){

    var message = new Object;

    message.type = "news";
    message.from = clientid;
    message.session = sessionid;
    message.convid = convid;
    message.tmpindex = getTmpMsgIndex();
    message.time = Math.round((new Date()).getTime() / 1000);
    message.content = {};
    message.content.content = {
        title: title,
        desc: content
    };

    message.extra = {
        headimgurl: null,
        nickname: null,
        admin: 0
    };

    sendToMqttServer(topic, JSON.stringify(message));

}

var sendToMqttServer = function (topic, message, options) {

    if (client==null || isConnected==false)
    {
        console.log("mqtt not connected!");
        return;
    }

    if(options==null){
        options = {
            qos: 0,
            retain: false
        }
    }

    return client.publish(topic, message, options);
}

var getTmpMsgIndex = function()
{
    return ((new Date()).getTime()).toString() + randomString(3);
}

var randomString = function(len) {
    len = len || 32;
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    var maxPos = $chars.length;
    var pwd = '';
    for (i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}

module.exports = {
    connect: connect,
    subscribe: subscribe,
    sendNewsMessage: sendNewsMessage
}