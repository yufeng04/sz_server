/**
 * Created by jimzhou on 2017/2/5.
 */
var mysql = require('mysql');
var CONFIG = require('../config.json');
var express = require('express');
var fetch = require('node-fetch');

var router = express.Router();

require('isomorphic-fetch');
fetch.Promise = require('bluebird');

var mysqlPool = mysql.createPool({
    host: CONFIG.mysqlurl,
    user: CONFIG.mysqlusername,
    password: CONFIG.mysqlpwd,
    database: CONFIG.mysqldb
});


function getMetaData(teamid, module) {
    return fetch(CONFIG.tomcaturl + '/crm/metadata/query', {
        method: 'POST',
        body: JSON.stringify({
            teamid: teamid,
            module: module
        }),
        headers: {'Content-Type': 'application/json'}
    }).then(
        function(res){
            return res.json();
        }
    );
}


router.all('/get', function (req, res) {
    var teamid = req.body.teamid;
    var module = req.body.module;
    if (typeof (teamid) == 'undefined' || teamid == null || typeof (module) == 'undefined' || module == null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });
        return;
    };
    getMetaData(teamid, module).then(function (metaData) {
        var metaDataOrigin = metaData.list;
        var sql = 'select * from crm_property_seq  where teamid = ' + teamid + ' and module = ' + module;
        mysqlPool.getConnection(function (err, conn) {
            if (err) {
                throw err;
            } else {
                conn.query(sql, function (err, rows, fields) {
                    conn.release();
                    if (err) {
                        res.json({
                            "result": "FAIL",
                            "errMsg": "数据库操作失败"
                        });
                    } else {
                        if (rows.length > 0 && metaDataOrigin) {
                            var seqList = JSON.parse(rows[0].sequence);
                            metaDataOrigin.forEach(function (value, index, array) {
                                for (var i = 0, l = seqList.length; i < l; i++) {
                                    if (seqList[i]._index === value._index) {
                                        value.seq = seqList[i].seq;
                                        return;
                                    }
                                }
                            });

                        } else if (metaDataOrigin) {
                            metaDataOrigin.forEach(function (value, index, array) {
                                value.seq = index;
                            });
                        }
                        metaData.list = metaDataOrigin;
                        res.json(metaData);
                    }
                });
            }
        });
    });
});

router.all('/save', function (req, res) {
    var teamid = req.body.teamid;
    var module = req.body.module;
    var sequence = JSON.stringify(req.body.sequence);
    if (typeof (teamid) == 'undefined' || teamid == null || typeof (module) == 'undefined' || module == null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });
        return;
    }
    ;
    var querySql = 'select * from crm_property_seq  where teamid = ' + teamid + ' and module = ' + module;

    var updateSql = 'update  crm_property_seq set sequence =  ' + sequence + '  where teamid =  ' + teamid + '  and module =  ' + module;

    var insertSql = 'insert into  crm_property_seq (sequence,teamid,module) values ( ' + sequence + '  , ' + teamid + '  , ' + module + ' )';


    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            throw err;
        } else {
            conn.query(querySql, function (err, rows, fields) {
                if (rows.length > 0) {
                    conn.query(updateSql, function (err, rows, fields) {
                        if (err) {
                            res.json({
                                "result": "FAIL",
                                "errMsg": err
                            });
                        } else {
                            res.json({
                                "result": "SUCCESS",
                            })
                        }
                    });
                } else {
                    conn.query(insertSql, function (err, rows, fields) {
                        if (err) {
                            res.json({
                                "result": "FAIL",
                                "errMsg": err
                            });
                        } else {
                            res.json({
                                "result": "SUCCESS",
                            })
                        }
                    });
                }
                conn.release();
            });
        }
    });

});


module.exports = router;
