/**
 * Created by danzhang on 2017/3/7.
 */

var exec = require('child_process').exec;
var http = require('../server/models/httpHandler');
var _CONFIG = require('./config.json');

var cmdList = [
    "ps -ef | grep 'java' | grep 'mqttprotocol'",
    "ps -ef | grep 'java' | grep 'mqttrouter'",
    "ps -ef | grep 'java' | grep 'mqttserver'",
    "ps -ef | grep 'java' | grep 'mqttsignal'",
    "ps -ef | grep 'java' | grep 'mqttstatus'",
    "ps -ef | grep 'java' | grep 'mqttqa'",
    "/opt/emqttd/bin/emqttd ping",
    "ps -ef | grep tomcat | grep catalina",
    "sudo service mongod status"
]

var checkList = [
    "mqttprotocol.jar",
    "mqttrouter.jar",
    "mqttserver.jar",
    "mqttsignal.jar",
    "mqttstatus.jar",
    "mqttqa.jar",
    "pong",
    "tomcat",
    "mongod start"
]

var moduleList = [
    "mqttprotocol",
    "mqttrouter",
    "mqttserver",
    "mqttsignal",
    "mqttstatus",
    "mqttqa",
    "emqttd",
    "tomcat",
    "mongod"
]

var errorList = new Array(checkList.length);
startLoop();

function startLoop(){

    for(var i=0; i<cmdList.length; i++){
        checkApplication(i);
    }
    setTimeout(startLoop, _CONFIG.checkInterval);
}

function checkApplication(index){
    exec(cmdList[index], function(err,stdout,stderr){
            if( err || stdout.indexOf(checkList[index])<0 ){
                //failed
                var now = (new Date()).getTime();
                var nowStr = (new Date()).toLocaleString();
                console.log( nowStr + ": " + checkList[index] + " stopped");
                if( typeof(errorList[index])=='undefined' || errorList[index]==null ){
                    errorList[index] = {
                        start: now,
                        end: now,
                        notify: now
                    }
                    notify(moduleList[index]);
                }else{
                    errorList[index].end = now;
                }

                if( (now-errorList[index].notify) > _CONFIG.notifyInterval ){
                    notify(moduleList[index]);
                    errorList[index].notify = now;
                }
            }else{
                //success
                errorList[index] = null;
            }
    });
}

function notify(module){

    var url = "http://api.sendcloud.net/apiv2/mail/send";
    var params = {
	apiUser: "engyne_mailer",
        apiKey: "m0kt4Vio7rSbAiET",
        from: "engyne@xmail.engyne.net",
        fromName: "Engyne运维中心",
        to: "dzhang@engyne.net;qmzhang@engyne.net",
        subject: _CONFIG.serverName + module + "进程中断",
        plain: _CONFIG.serverName + module + "进程中断"
    }

    http.postx(url, params)
        .then(function(res){
            //console.log(res);
        })
}
