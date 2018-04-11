var mysql = require('mysql');
var experss = require('express');
var CONFIG = require('../config.json');
var router = experss.Router();

var mysqlPool = mysql.createPool({
    connectionLimit: CONFIG.szgjjMysqlConLimit,
    host: CONFIG.szgjjMysqlHost,
    user: CONFIG.szgjjMysqlUser,
    password: CONFIG.szgjjMysqlPassword,
    database: CONFIG.szgjjMysqlDatabase
});

function crossDomain(res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
}

router.all('/lanLatData', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method == "OPTIONS") res.send(200);
    // else
    // next();
    var sql = 'SELECT lng,lat,area FROM biz_bld'
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
                        "data": rows
                    });

                }
            });
        }
    });
});

router.all('/xqLngLat', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method == "OPTIONS") res.send(200);
    // else
    // next();
    var sql = 'SELECT lng,lat,total_house FROM fdd_xq'
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
                        "data": rows
                    });

                }
            });
        }
    });
});

//网点数据分析
router.all('/netanalysis', function (req, res, next) {
    crossDomain(res);
    if (req.method == "OPTIONS") res.send(200);
    var sql = 'SELECT _index,name,lng,lat,bsum,lable,bratio,lg_to_min,bankname,region,cover_r FROM bankdata ORDER BY lable'
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            res.json({
                "result": "FAIL",
                "errMsg": "数据库连接失败"
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
                    let s={};
                    for(let i=0;i<rows.length;i++){
                        if(s[rows[i].lable]) {
                            s[rows[i].lable].push(rows[i]);
                        }else {
                            s[rows[i].lable]=[];
                            s[rows[i].lable].push(rows[i]);
                        }
                    }
                    res.json({
                        "result": "SUCCESS",
                        "data": s
                    });

                }
            });
        }
    });
});

// 计算组内平均半径
router.all('/avgradius', function (req, res, next) {
    crossDomain(res);
    if (req.method == "OPTIONS") res.send(200);
    let m = 1;
    setInterval(function(){
        if (m<36) {
            // var sql = 'SELECT avg(bsum) AS avg_bsum,avg(cover_r) AS avg_r,avg(bank_index) AS avg_bank,lat,lng,name FROM bankdata WHERE lable='+m;
            var sql = 'SELECT lat,lng,pre_r FROM pre_r WHERE _index='+m;
            mysqlPool.getConnection(function (err, conn) {
                if (err) {
                    res.json({
                        "result": "FAIL",
                        "errMsg": "数据库连接失败"
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
                            // res.json({
                            //     "result": "SUCCESS",
                            //     "msg": "查询数据成功,正在处理"
                            // });
                            // let tmpSql = 'UPDATE bankdata SET avg_bsum=' + rows[0].avg_bsum + ',avg_r=' + rows[0].avg_r + ',avg_bank=' + rows[0].avg_bank + ' WHERE lable=' + m;
                            // console.log(tmpSql);
                            // updateSqlData(tmpSql); 
                            getAvgrData(rows[0].lat,rows[0].lng,rows[0].pre_r,m,'');  
                            m++;
                        }
                    });
                }
            });
        }
    },500)
});

//获取平均半径内的 网点数 公司数量
function getAvgrData(lat,lng,avgr,m,name) {
    let tmp = getNewLatLng(lat,lng,avgr);
    console.log(tmp);
    let netSql = 'SELECT COUNT(name) AS data from bankdata WHERE lat >' + tmp.minLat + ' AND lat <' + tmp.maxLat + ' AND lng >' + tmp.minLng + ' AND lng <' + tmp.maxLng;
    let p1 = getHouseArea(netSql);
    let firmSql = 'SELECT SUM(person_num) AS data from firm_info WHERE flat >' + tmp.minLat + ' AND flat <' + tmp.maxLat + ' AND flng >' + tmp.minLng + ' AND flng <' + tmp.maxLng;
    let p2 = getHouseArea(firmSql);  
    let xqSql = 'SELECT SUM(total_house) AS data from fdd_xq WHERE lat >' + tmp.minLat + ' AND lat <' + tmp.maxLat + ' AND lng >' + tmp.minLng + ' AND lng <' + tmp.maxLng;                         
    let p3=getHouseArea(xqSql);
    Promise.all([p1, p2, p3]).then(values => {
        nearNode = values[0];
        firmb_in_r = values[1];
        house_in_r = values[2];
        // let sql = 'UPDATE bankdata SET node_in_avgr=' + nearNode + ',firm_in_avgr=' + firmb_in_r + ',house_in_avgr=' + house_in_r + ' WHERE lable=' + m + ' AND name=' + "'" + name + "'"; 
        let sql = 'UPDATE pre_r SET node_in_prer=' + nearNode + ',firm_in_prer=' + firmb_in_r + ',house_in_prer=' + house_in_r + ' WHERE _index=' + m;
        console.log(sql);
        updateSqlData(sql) 
    })
}

//更新数据
function updateSqlData(sql) {
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            throw err;
        } else {
            conn.query(sql, function (err, rows, fields) {
                conn.release();
                if (err) {
                } else {

                }
            });
        }
    });
}

//网点预测 计算网点业务半径
router.all('/coverradius', function (req, res, next) {
    crossDomain(res);
    if (req.method == "OPTIONS") res.send(200);
    var sql = 'SELECT name FROM bankdata'
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            res.json({
                "result": "FAIL",
                "errMsg": "数据库连接失败"
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
                        "msg": "查询数据成功,正在处理"
                    });

                    for(let i=0;i<rows.length;i++){
                       let tmpSql = 'SELECT f_s_dis,flng,flat,slng,slat FROM original_data WHERE station_name=' + "'" + rows[i].name + "'";
                       getRadiusData(tmpSql,rows[i].name);
                    }

                }
            });
        }
    });
});

function getRadiusData(sql,name) {
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            throw err;
        } else {
            conn.query(sql, function (err, rows, fields) {
                conn.release();
                if (err) {
                    throw err;
                } else {
                    let nodeRadius;
                    let xqHouse;
                    let xzlArea;
                    rows.sort((a,b) => {
                        return a.f_s_dis - b.f_s_dis
                    });
                    if(rows.length) {
                        nodeRadius = rows[Math.floor(rows.length*0.2)].f_s_dis;
                        let tmp = rows[Math.floor(rows.length*0.2)];
                        // let minLat = tmp.slat - Math.abs(tmp.slat - tmp.flat);
                        // let maxLat = tmp.slat + Math.abs(tmp.slat - tmp.flat);
                        // let minLng = tmp.slng - Math.abs(tmp.slng - tmp.flng);
                        // let maxLng = tmp.slng + Math.abs(tmp.slng - tmp.flng);
                        let k = getNewLatLng(tmp.slat,tmp.slng,nodeRadius);
                        let xqSql = 'SELECT SUM(total_house) AS data from fdd_xq WHERE lat >' + k.minLat + ' AND lat <' + k.maxLat + ' AND lng >' + k.minLng + ' AND lng <' + k.maxLng;                         
                        let p1=getHouseArea(xqSql);
                        let xzlSql = 'SELECT SUM(area) AS data from biz_bld WHERE lat >' + k.minLat + ' AND lat <' + k.maxLat + ' AND lng >' + k.minLng + ' AND lng <' + k.maxLng;
                        let p2 = getHouseArea(xzlSql);
                        let netSql = 'SELECT COUNT(name) AS data from bankdata WHERE lat >' + k.minLat + ' AND lat <' + k.maxLat + ' AND lng >' + k.minLng + ' AND lng <' + k.maxLng;
                        let p3 = getHouseArea(netSql);
                        let firmSql = 'SELECT SUM(person_num) AS data from firm_info WHERE flat >' + k.minLat + ' AND flat <' + k.maxLat + ' AND flng >' + k.minLng + ' AND flng <' + k.maxLng;
                        if(name == '招行梅龙支行') {
                            console.log(firmSql);
                            console.log(tmp.slat);
                            console.log(tmp.slng);
                        };
                        let p4 = getHouseArea(firmSql);
    
                        Promise.all([p1, p2, p3,p4]).then(values => {
                            xqHouse = values[0];
                            xzlArea = values[1];
                            nearNode = values[2];
                            firmb_in_r = values[3];
                            let sql = 'UPDATE bankdata SET cover_r =' + nodeRadius + ',xq_house=' + xqHouse + ',xzl_area=' + xzlArea + ',near_node=' + nearNode + ',firmb_in_r=' + firmb_in_r + ' WHERE name=' + "'" + name + "'"; 
                            // console.log(sql);
                            updateSqlData(sql) 
                        })
                    }else{
                        nodeRadius = 0;
                    }     
                }
            });
        }
    });
}

function getHouseArea(sql) {
  return   new Promise((resolve, reject) => {
        mysqlPool.getConnection(function (err, conn) {
            if (err) {
                throw err;
            } else {
                conn.query(sql, function (err, rows, fields) {
                    conn.release();
                    if (err) {
                        throw err;
                    } else {
                        // console.log(rows);
                        resolve(rows[0].data)

                    }
                });
            }
        });
    });   
}

// 获取 转换经纬度 小区户数 写字楼面积 
router.all('/predata',function (req,res,next) {
    crossDomain(res);
    var param = req.query||req.params;
    var adds;
    var region;
    var bank;
    
    if(req.method=='POST'){
        adds = req.body.adds;
        region = req.body.region;
        bank = req.body.bank;
    }else {
        adds = param.adds;
        region = param.region;
        bank = param.bank;
    }
    if(typeof (adds) =='undefined'||adds== null || typeof (region) =='undefined' ||region ==null){
        res.json({
            result :"FAIL",
            errMsg :"invalid inputs "
        });
        return
    }

});

function getNewLatLng(lat,lng,radius) {
    let degree = (24901*1609)/360;
    let dpmLat = 1/degree;
    let rLat = dpmLat*radius;
    let minLat = lat - rLat;
    let maxLat = lat + rLat;

    let mpdLng = degree*Math.cos(lat*(Math.PI/180));
    let dpmLng = 1/mpdLng;
    let rLng = dpmLng*radius;
    let minLng = lng - rLng;
    let maxLng = lng + rLng;
    return {'minLat':minLat,'maxLat':maxLat,'minLng':minLng,'maxLng':maxLng};
}

//以originaldata中的数据为准 更新bankdata中的经纬度
router.all('/updateBankdata', function (req, res, next) {
    crossDomain(res);
    if (req.method == "OPTIONS") res.send(200);
    var sql = 'SELECT station_name,slat,slng FROM original_data GROUP BY station_name'
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            res.json({
                "result": "FAIL",
                "errMsg": "数据库连接失败"
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
                        "msg": "查询数据成功,正在处理"
                    });
                    for(let i = 0; i < rows.length; i++) {
                        let tmpSql = 'UPDATE bankdata SET lng=' + rows[i].slng + ',lat=' + rows[i].slat + ' WHERE name=' +"'" + rows[i].station_name+"'";
                        console.log(i);
                        updateSqlData(tmpSql);
                    }
                }
            });
        }
    });
});



module.exports = router;