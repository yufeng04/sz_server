/**
 * Created by dan_z on 2016/5/16.
 */

var settingData = require('./setting.json');
var objectid = require('objectid');
var  mongodb = require('mongodb');
var  dbserver  = new mongodb.Server(settingData.mongodburl, settingData.mongodbport, {auto_reconnect:true});
var  db = new mongodb.Db(settingData.mongodbname, dbserver, {safe:true});
var mysql = require('mysql');

var mqtt  = require('./dolinaIM');


var robot_id = settingData.robot_goal_id;

var mysqlPool  = mysql.createPool({
    host     : settingData.mysqlurl,
    user     : settingData.mysqlusername,
    password : settingData.mysqlpwd,
    database : 'dolina'
});


db.open(function (err, db) {
    if (!err) {
        db.authenticate(settingData.mongodbusername, settingData.mongodbpwd, function (err, res) {
            if (!err) {
                connectToServer();
            }
        });
    }else{
        console.log(err);
    }
});

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function connectToServer(){

    var options = {
        keepalive : 10 ,
        reconnectPeriod : 3000,
        clientId  : robot_id,
        username  : settingData.username,
        password  : settingData.password
    };

    var msghandler = msgHandler.createNew();

    mqtt.connect(settingData.mqttserver, options, '/engyne_signaling', onConnected, onMessage);

    function onConnected(){
        console.log(robot_id + " connected");
    }

    function onMessage(topic, message){

        msghandler.handle(topic, message);

    }

}

msgHandler = {
    createNew: function () {
        var self = {};
        self.msgObj = {};
        self.convid = null;
        self.clientid = null;
        self.topic = null;
        self.systemid = robot_id;

        self.handle = function(topic, object)
        {
            self.msgObj = object;
            self.convid = object.convid;

            if(object.from == self.systemid || object.offline)
                return;

            switch(object.type)
            {
                case 'signaling':
                    self.getSignaling();
                default:
                    break;
            }
        }

        self.getTimeStamp = function()
        {
            return Math.round((new Date()).getTime() / 1000);
        }

        //收到信令消息
        self.getSignaling = function()
        {
            var signal = self.msgObj.content.signaling;
            self.topic = self.msgObj.topic;
            self.clientid = self.msgObj.from;
            self.sessionid = self.msgObj.session;
            self.convid = self.msgObj.convid;

            switch(signal.type)
            {
                case 'event':
                    var tempIndex  = signal.data.template;
                    var clientId = self.msgObj.from;

                    if( signal.event=='dolina_msg_clicked' )
                    {
                        if(!tempIndex)
                            return;

                        var msgIndex  = signal.data.msgindex;

                        var sql = "update rule_template_log set clicked = clicked + 1 " +
                                    "where template_index = " + tempIndex
                                    + " and clientid = '" + clientId
                                    + "' and msgindex = '" + msgIndex
                                    + "'";

                        mysqlPool.getConnection(function(err, mysqlConnection){

                            if(err){
                                console.log(err);
                                return;
                            }

                            mysqlConnection.query(sql, function(err, results,fields){
                                if(err){
                                    console.log(err);
                                }
                                //release connection
                                mysqlConnection.release();

                                console.log( "tempIndex: " + tempIndex + "; tmpindex: " + msgIndex + "; clientid: " + clientId);
                            })
                        })

                    }else{
                        //收到其他信令，首先查看是否存在对应的goal
                        //查看该clientid是否达到了goal
                        var sql = "select * from view_rule_goal_event where clientid='" + clientId
                                    + "' and event_name='" + signal.event + "' group by rule_index";

                        mysqlPool.getConnection(function(err, mysqlConnection) {

                            if (err) {
                                console.log(err);
                                return;
                            }

                            mysqlConnection.query(sql, function(err, results,fields){
                                if(err){
                                    console.log(err);
                                    mysqlConnection.release();
                                    return;
                                }

                                for(var i in results){
                                    //存在匹配的goal
                                    var hitGoal = results[i];
                                    var satisfied = false;
                                    if(!hitGoal.operator){
                                        //没有operator，说明触发即达标
                                        satisfied = true;
                                    }else{
                                        switch(hitGoal.operator) {
                                            case 'range':
                                                if (hitGoal.begin && hitGoal.end == null && hitGoal.event_counter > hitGoal.begin) {
                                                    satisfied = true;
                                                }
                                                if (hitGoal.begin == null && hitGoal.end && hitGoal.event_counter < hitGoal.end) {
                                                    satisfied = true;
                                                }
                                                if (hitGoal.begin && hitGoal.end && hitGoal.event_counter > hitGoal.begin && hitGoal.event_counter < hitGoal.end){
                                                    satisfied = true;
                                                }
                                                break;
                                            case 'value':
                                                if( hitGoal.value == hitGoal.event_counter ){
                                                    satisfied = true;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }

                                    if(satisfied){
                                        //满足目标条件，记录该规则对该clientid达到了目标（不论是否点击）
                                        var rule_index = hitGoal.rule_index;
                                        var goal_index = hitGoal.goal_index;
                                        var clientid = hitGoal.clientid;
                                        var sql = "update rule_template_log set rule_goal_index = " + goal_index
                                                    + " where rule_index = '" + rule_index
                                                    + "' and clientid = '" + clientid + "'";

                                        mysqlConnection.query(sql, function(err){
                                            if(err){
                                                console.log(err);
                                            }else{
                                                console.log("goal " + goal_index + " achieved!");
                                            }
                                            mysqlConnection.release();
                                        })
                                    }

                                }
                            })
                        })

                    }
                    break;
                case 'input':
                    handleInput(signal, self.topic);
                    break;
                default:
                    break;
            }
        }

        function handleInput(signal, topic){
            var content = signal.result;
            var tmpIndex = signal.template;
            //var content = "test";
            //var tmpIndex = 9;

            mysqlPool.getConnection(function(err, mysqlConnection) {

                    if (err) {
                        console.log(err);
                        return;
                    }

                    var sql = "select * from template where _index = " + tmpIndex;

                    mysqlConnection.query(sql, function(err, rows, results){

                        var desc  = rows[0].desc;
                        var title  = rows[0].title;

                        desc += "<input type='text' disabled value='" + content + "'/>";
                        mqtt.sendNewsMessage(topic, self.clientid, self.sessionid, self.convid, title, desc);

                        mysqlConnection.release();
                    })
            })

        }

        return self;
    }
}

