var mysql = require('mysql');
var experss = require('express');
var CONFIG = require('../config.json');
var baiduMap = require('baidumap');
var bdmap = baiduMap.create({ 'ak': 'nQG3uwNP9Fmj281pmpgd24oOrLeCFjHk' });
var router = experss.Router();
var PK = Math.PI;
var DEF_PI = Math.PI; // PI
var DEF_2PI = 2 * Math.PI; // 2*PI
var DEF_PI180 = Math.PI / 180.0; // PI/180.0
var DEF_R = 6370693.5; // radius of earth
var handleIndex = 0;
var handleBoolean = true;
var id_of_setinterval;

var mysqlPool = mysql.createPool({
    connectionLimit: CONFIG.OrgszgjjMysqlConLimit,
    host: CONFIG.szgjjMysqlHost,
    user: CONFIG.szgjjMysqlUser,
    password: CONFIG.szgjjMysqlPassword,
    database: CONFIG.szgjjMysqlDatabase
});

// 接口跨域
function crossDomain(res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
}

//处理错误的公司到网点的距离数据
router.all('/handlefsdis', function (req, res, next) {
    if (req.method == "OPTIONS") res.send(200);

    var sql = 'SELECT _index,flng,flat,slng,slat FROM original_data'
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            res.json({
                "result": "FAIL",
                "errMsg": "获取数据库连接失败"
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
                    for(let i=0;i<rows.length;i++){
                     let tfsdis=handleDistance(rows[i].flng, rows[i].flat, rows[i].slng, rows[i].slat)
                     updatefsdis(rows[i]._index,tfsdis)                                                            
                    }
                     res.json({
                        "result": "SUCCESS",
                        "msg": "处理错误的距离数据成功"
                    });
                  
                }
            });
        }
    });

})

function updatefsdis(index,fsdis) {
    let sql = 'UPDATE original_data SET f_s_dis='+fsdis + ' WHERE _index=' + index
    updateSqlData(sql)
}



router.all('/handleData', function (req, res, next) {
    if (req.method == "OPTIONS") res.send(200);
    // var sql =' SELECT _index,firm_adds,station_adds FROM original_data WHERE ist is NULL '
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            res.json({
                "result": "FAIL",
                "errMsg": "获取数据库连接失败"
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
                    handleData(rows)
                }
            });
        }
    });

})

//群内点到业务量最小点的距离 群内点的业务量占比
router.all('/dealgroup', function(req, res, next) {
    var sql = 'SELECT MAX(lable) AS lableL FROM bankdata';
    if (req.method == "OPTIONS") res.send(200);
    mysqlPool.getConnection(function (err, conn) {
        if(err) {
            res.json({
                "result": "FAIL",
                "errMsg": "获取数据库连接失败"
            });
            throw err;
        }else {
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
                        for(let i = 0; i <= rows[0].lableL; i++) {
                            var tmpSql = 'SELECT _index,lng,lat,bsum,lable FROM bankdata WHERE lable='+i;
                            getSqlData(tmpSql);
                        }
                    }
                });
        }
    })
})

function getSqlData(sql) {
    mysqlPool.getConnection(function (err, conn) {
        if (err) {
            throw err;
        } else {
            conn.query(sql, function (err, rows, fields) {
                conn.release();
                if (err) {
                    throw err;
                } else {
                    dealGroupData(rows);
                }
            });
        }
    });
}

function dealGroupData(data) {
    if(data.length) {
        let min = data[0];
        let groupBsum = 0;
        for(let i = 0; i < data.length; i++) {
           if(data[i].bsum < min.bsum) {
               min = data[i];
           }
           groupBsum += data[i].bsum;
        }
        // 处理距离
        for(let j = 0; j < data.length; j++) {
           let dist = handleDistance(min.lng,min.lat,data[j].lng,data[j].lat)
           let ratio;
           if(groupBsum>0){
            ratio = (data[j].bsum/groupBsum).toFixed(4);
           }else {
            ratio = 0;
           }
           let tmpSql = 'UPDATE bankdata SET bratio=' + ratio + ',lg_to_min=' + dist +' WHERE _index=' + data[j]._index;
           updateSqlData(tmpSql);
        }        
    }
}

//处理数据
function handleData(originData) {
    let totalLenght = originData.length;

    id_of_setinterval = setInterval(function () {
        if (handleIndex >= totalLenght) {
            clearInterval(id_of_setinterval)
        }
        if (handleBoolean) {
            handleBoolean = false;
            if (originData[handleIndex]) {
                handleLanLat(originData[handleIndex])
            }
        }

    }, 200)


}
//获取一条数据两个经纬度
function handleLanLat(addressData) {

    if (addressData.firm_adds && addressData.station_adds) {
        let p1 = new Promise((resolve, reject) => {
            let p1Option = { 'address': addressData.firm_adds, 'city': '深圳市' };
            bdmap.geocoder(p1Option, function (err, result) {
                if (err) {

                    resolve(JSON.stringify({
                        "result": "FAIL",
                        "errMsg": "访问接口失败"
                    }))
                }
                else {
                    resolve(result)
                }
            });

        });
        let p2 = new Promise((resolve, reject) => {
            let p2Option = { 'address': addressData.station_adds, 'city': '深圳市' };
            bdmap.geocoder(p2Option, function (err, result) {
                if (err) {
                    resolve(JSON.stringify({
                        "result": "FAIL",
                        "errMsg": "访问接口失败"
                    }))
                }
                else {
                    resolve(result)
                }
            });

        });

        Promise.all([p1, p2]).then(values => {
            let sql;
            let fData = JSON.parse(values[0])
            let sData = JSON.parse(values[1])
            if (fData.status == 0 && sData.status == 0) {
                let flnglat = fData.result.location;
                let slnglat = sData.result.location
                if (judgelnglat(flnglat) && judgelnglat(flnglat)) {
                    let distance = handleDistance(flnglat.lng, flnglat.lat, slnglat.lng, slnglat.lat)
                    sql = 'UPDATE original_data SET ist =1' + ',flng=' + flnglat.lng
                        + ',flat=' + flnglat.lat + ',slng=' + slnglat.lng
                        + ',slat=' + slnglat.lat + ',f_s_dis=' + distance + ' WHERE _index=' + addressData._index
                    //  console.log(sql)
                    updateSqlData(sql)
                    handleIndex++;
                    handleBoolean = true;
                } else {
                    lnglatDataError(addressData._index)
                    handleIndex++;
                    handleBoolean = true;
                }

            } else {
                lnglatDataError(addressData._index)
                handleIndex++;
                handleBoolean = true;

            }


        });

    } else {
        lnglatDataError(addressData._index)
        handleIndex++;
        handleBoolean = true;

    }


}
function judgelnglat(location) {
    if (location.lng && location.lat) {
        if (location.lng > 113 && location.lng < 115 && location.lat > 22 && location.lat < 23) {
            return true
        } else {
            return false
        }

    } else {
        return false
    }



}

function lnglatDataError(index) {
    let sql = 'UPDATE original_data SET ist =0' + ' WHERE _index=' + index
    updateSqlData(sql)

}
//计算距离
function handleDistance(lon1, lat1, lon2, lat2) {

    let ew1, ns1, ew2, ns2;
    let dx, dy, dew;
    let distance;
    // 角度转换为弧度
    ew1 = lon1 * DEF_PI180;
    ns1 = lat1 * DEF_PI180;
    ew2 = lon2 * DEF_PI180;
    ns2 = lat2 * DEF_PI180;
    // 经度差
    dew = ew1 - ew2;
    // 若跨东经和西经180 度，进行调整
    if (dew > DEF_PI)
        dew = DEF_2PI - dew;
    else if (dew < -DEF_PI)
        dew = DEF_2PI + dew;
    dx = DEF_R * Math.cos(ns1) * dew; // 东西方向长度(在纬度圈上的投影长度)
    dy = DEF_R * (ns1 - ns2); // 南北方向长度(在经度圈上的投影长度)
    // 勾股定理求斜边长
    distance = Math.sqrt(dx * dx + dy * dy);
    return distance

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

module.exports = router;