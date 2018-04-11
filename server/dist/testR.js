'use strict';

/**
 * Created by jimzhou on 2017/4/1.
 */
/**
 * Created by danzhang on 2017/2/15.
 */

var mysql = require('mysql');
var CONFIG = require('../config.json');
var express = require('express');
var fetch = require('node-fetch');

var router = express.Router();

var Raven = require('raven');
Raven.config('http://6256a5bf6b664c029a6d31a2dfa463c3:4e9305bc738347408b130bbba54a8123@localhost:9000/1').install();

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
        headers: { 'Content-Type': 'application/json' }
    }).then(function (res) {
        return res.json();
    });
}

router.all('/get', function (req, res) {
    var teamid = req.body.teamid;
    var module = req.body.module;
    if (typeof teamid == 'undefined' || teamid == null || typeof module == 'undefined' || module == null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });
        return;
    }

    getMetaData(teamid, module).then(function (metaData) {
        var metaDataOrigin = metaData.list;
        var sql = 'select * from crm_property_seq111  where teamid = ' + teamid + ' and module = ' + module;
        try {
            mysqlPool.getConnection(function (err, conn) {
                if (err) {
                    Raven.captureException(err);
                    throw err;
                } else {
                    conn.query(sql, function (err, rows, fields) {
                        conn.release();
                        if (err) {
                            Raven.captureException(err);
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
        } catch (e) {
            Raven.captureException(e);
        }
    });
});

router.all('/save', function (req, res) {
    var teamid = req.body.teamid;
    var module = req.body.module;
    var sequence = JSON.stringify(req.body.sequence);
    if (typeof teamid == 'undefined' || teamid == null || typeof module == 'undefined' || module == null) {
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
                                "result": "SUCCESS"
                            });
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
                                "result": "SUCCESS"
                            });
                        }
                    });
                }
                conn.release();
            });
        }
    });
});

module.exports = router;