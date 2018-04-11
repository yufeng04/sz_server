var mysql = require('mysql');
var experss = require('express');
var CONFIG = require('../config.json');
var router = experss.Router();

var mysqlPool = mysql.createPool({
    connectionLimit: CONFIG.szgjjMysqlConLimit,
    host: CONFIG.OrgszgjjMysqlHost,
    user: CONFIG.OrgszgjjMysqlUser,
    password: CONFIG.OrgszgjjMysqlPassword,
    database: CONFIG.OrgszgjjMysqlDatabase
});

function crossDomain(res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
}

var i = 1200;
router.all('/task', function (req, res, next) {
    crossDomain(res);
    if (req.method == "OPTIONS") res.send(200);
    // else
    // next();
    var sql = 'SELECT gjj_id FROM task_seq'
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            res.json({
                "result": "FAIL",
                "errMsg": "数据库操作失败"
            });
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
                    res.json({
                        "result": "SUCCESS",
                        "data": "正在处理数据"
                    });
                    // for(let i = 0; i < rows.length; i++) {
                    //     let taskSql = "SELECT task1 FROM original_temp WHERE gjj_num=" + rows[i].gjj_id;
                    //     getTask(taskSql,rows[i].gjj_id);
                    // }
                    var tmpI;
                    var timer = setInterval(function(){
                        if(i>rows.length) {
                            console.log('结束');
                            clearInterval(timer);
                            return;
                        }
                        if(tmpI < i || !tmpI) {
                            tmpI = i;
                            let taskSql = "SELECT task1 FROM original_temp WHERE gjj_num=" + rows[i].gjj_id;
                            getTask(taskSql,rows[i].gjj_id);
                        }
                    },100);
                }
            });
        }
    });
});

function getTask(sql,id) {
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            throw err;
        } else {
            conn.query(sql, function (err, rows, fields) {
                conn.release();
                if (err) {
                    throw err;
                } else {
                    let sql = 'UPDATE task_seq SET'
                    for(let i = 0; i < rows.length; i++) {
                         sql += ' t_' + (i+1) + '=' + rows[i].task1 + ',';
                    }
                    sql = sql.slice(0,-1)
                    sql = sql + ' WHERE gjj_id=' + id;
                    updateSqlData(sql);
                }
            });
        }
    });
}

function updateSqlData(sql) {
    console.log(sql);
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            throw err;
        } else {
            conn.query(sql, function (err, rows, fields) {
                conn.release();
                if (err) {
                    console.log('ssssssSS')
                } else {
                    i++;
                }
            });
        }
    });
}

module.exports = router;