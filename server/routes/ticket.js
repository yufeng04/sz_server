/**
 * Created by jimzhou on 2017/3/1.
 */
var experss = require('express');
var router = experss.Router();

var fetch = require('node-fetch');

require('isomorphic-fetch');
fetch.Promise = require('bluebird');

var CONFIG = require('../config.json');

var http = require('../models/httpHandler');

var mongo = require('../models/mongoHandler')

var ObjectID = require('mongodb').ObjectID;

var operationStatus = {
    "new": "1",
    "sure": "2",
    "complete": "3",
    "giveup": "4",
    "assign": "0"
}

router.all('/get', function (req, res) {
    api("get", req, res)
});
router.all('/new', function (req, res) {
    api("add", req, res)
});
router.all('/edit', function (req, res) {
    api("edit", req, res)
});
router.all('/assign', function (req, res) {
    api("assign", req, res)
});
router.all('/comment', function (req, res) {
    api("comment", req, res)
});
router.all('/mark', function (req, res) {
    api("mark", req, res)
});

function api(action, req, res) {

    if (mongo.isConnected()) {
        console.log("db exist");
        mongo.setCollection(CONFIG.ticket_db_col);
        exeApi(action, req, res);
    } else {
        console.log("db not existed");
        mongo.connect(CONFIG.mongodburl)
            .then(function (result) {
                if (result) {
                    mongo.setCollection(CONFIG.ticket_db_col);
                    exeApi(action, req, res);
                } else {
                    res.json({
                        'result': 'FAIL',
                        'errMsg': '无法连接数据库'
                    })
                    mongo.close();
                }
            });
    }
}

function exeApi(action, req, res) {
    switch (action) {
        case 'get':
            getData(req, res);
            break;
        case 'add':
            addData(req, res);
            break;
        case 'edit':
            editData(req, res);
            break;
        case 'assign':
            assignData(req, res);
            break;
        case 'comment':
            commentData(req, res);
            break;
        case 'mark':
            markData(req, res);
            break;
        default:
            break;
    }
};

function getData(req, res) {
    let teamid = http.getRequest(req, "teamid");
    let ownername = http.getRequest(req, "owner");
    let worker = http.getRequest(req, "worker");
    let ticketType = http.getRequest(req, "ticketType");
    let filterType = http.getRequest(req, "filterType");
    let module = http.getRequest(req, "module");
    let status = http.getRequest(req, "status");
    let dueto = http.getRequest(req, "dueto");
    var clientid = http.getRequest(req, "clientid");
    var limit = http.getRequest(req, "limit");
    var offset = http.getRequest(req, "offset");
    var sortOption = {"update_gmt": -1};
    let total = 0;

    var queryCondition = {};

    if (typeof(teamid) == 'undefined' || teamid === null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        return;
    }

    if (filterType == "or") {
        let queryList = [];
        if (ownername) {
            queryList.push({"teamid": teamid, 'owner': ownername});
        }
        if (worker) {
            queryList.push({"teamid": teamid, 'worker.email': worker});
        }
        if (ticketType) {
            queryList.push({"teamid": teamid, 'type': ticketType});
        }
        if (status) {
            queryList.push({
                "teamid": teamid, 'status': {
                    $in: str_array(status)
                }
            });
        }
        if (clientid) {
            queryList.push({"teamid": teamid, 'clientid': clientid});
        }
        if (dueto) {
            queryList.push({"teamid": teamid, 'dueto': dueto});
        }
        queryCondition = {$or: queryList};
    } else {
        queryCondition["teamid"] = teamid;
        if (ownername) {
            queryCondition["owner"] = ownername;
        }
        if (worker) {
            queryCondition["worker.email"] = worker;
        }
        if (ticketType) {
            queryCondition["type"] = ticketType;
        }
        if (status) {
            queryCondition["status"] = {$in: str_array(status)}
        }
        if (dueto) {
            queryCondition["dueto"] = dueto;
        }
        if (clientid) {
            queryCondition["clientid"] = clientid;
        }
    }

    mongo.count(queryCondition).then(function (result) {
        total = result ? result : 0;
    })

    mongo.find(queryCondition, {}, sortOption, limit ? limit : "", offset ? offset : 0).then(function (result) {
        if (result) {
            var resResult = [];
            let len = result.length;
            if (len > 0) {
                result.forEach(function (ticket) {
                    let clientid = ticket.clientid;
                    let filterCondition = [];
                    if (clientid && clientid.length > 0) {
                        clientid.forEach(function (clientdata) {
                            filterCondition.push({
                                "filter_type": "value",
                                "filter_key": "_id",
                                "filter_value": clientdata
                            });
                        })
                    }
                    Promise.all([fetchData(teamid, module, filterCondition, "or"), fetchMetaData(teamid, module)]).then(function (resultList) {
                        if (resultList instanceof Array && resultList.length > 1) {
                            let customerData = resultList[0];
                            let metaResult = resultList[1];
                            let clientInforList = [];
                            if (customerData.result == 'SUCCESS' && metaResult.result == 'SUCCESS') {
                                let customerList = customerData.list;
                                let metaList = metaResult.list;
                                customerList.forEach(function (customerInfor) {
                                    let tempData = {};
                                    for (var customerProperty in customerInfor) {
                                        metaList.forEach(function (meta) {
                                            if (meta._index == customerProperty) {
                                                if (meta.type == 'string' || meta.type == 'number') {
                                                    tempData[meta.description] = customerInfor[meta._index];
                                                } else if (meta.type == 'foreign_key') {
                                                    tempData[meta.description] = customerInfor[meta._index].desc;
                                                }
                                            }
                                        })
                                    }
                                    clientInforList.push(tempData);
                                });
                                ticket.clientInforList = clientInforList;
                            }
                        }
                    }).then(function () {
                        resResult.push(ticket);
                        len--;
                    }, function () {
                        len--;
                        resResult.push(ticket);
                    }).then(function () {
                        if (len < 1) {
                            res.json({
                                'result': 'SUCCESS',
                                'list': resResult,
                                'total':total
                            });
                        }
                    });
                });
            } else {
                res.json({
                    'result': 'SUCCESS',
                    'list': [],
                    'total':total
                });
            }
        } else {
            res.json({
                'result': 'FAIL',
                'list': '无法读取数据',
            })
        }
    }).catch(function (err) {
        res.json({
            result: 'FAIL',
            errMsg: err.message
        })
    });
}

function addData(req, res) {
    var teamid = http.getRequest(req, 'teamid');
    var ownername = http.getRequest(req, 'owner');
    var dept = http.getRequest(req, 'dept');
    var worker = http.getRequest(req, 'worker');
    var ticketType = http.getRequest(req, 'ticketType');
    var dueto = http.getRequest(req, 'dueto');
    var desc = http.getRequest(req, 'desc');
    var clientid = http.getRequest(req, 'clientid');
    var priority = http.getRequest(req, 'priority');
    var extra = http.getRequest(req, 'extra');
    var notes = http.getRequest(req, 'notes');

    if (typeof(teamid) == 'undefined' || teamid === null
        || typeof(ownername) == 'undefined' || ownername === null) {
        res.json({
            result: "FAIL",
            errMsg: "invalid inputs"
        });

        return;
    }

    Promise.all([getUserInfor(teamid, ownername), getUserInfor(teamid, worker)]).then(function (result) {
            if ((result instanceof Array) && result.length > 1) {
                let owner, worker;
                if (result[0].list instanceof Array) {
                    owner = (result[0].list)[0];
                    worker = (result[1].list)[0];
                }
                var ticketInfor = {
                    teamid: teamid,
                    owner: ownername,
                    owner_info: {
                        name: owner ? owner.nickname : "",
                        dept: owner ? owner.dept : "",
                        phone: owner ? owner.phonenumber : "",
                        email: owner ? owner.email : ""
                    },
                    dept: dept,
                    worker: {
                        name: worker ? worker.nickname : "",
                        phone: worker ? worker.phonenumber : "",
                        email: worker ? worker.email : ""
                    },
                    type: ticketType,
                    status: operationStatus["new"],
                    dueto: dueto,
                    priority: priority,
                    desc: desc,
                    clientid: clientid ? [str_array(clientid)] : "",
                    extra: extra,
                    history: [],
                    notes: notes ? [str_array(notes)] : ""
                }
                mongo.insert([ticketInfor]).then(function (ret) {
                    res.json({
                        'result': 'SUCCESS',
                        'list': ret
                    });
                    mongo.close();
                }).catch(function (err) {
                    res.json({
                        result: 'FAIL',
                        errMsg: err.message
                    });
                });
            }
        }
    ).catch(function (err) {
        console.log(err);
    });
}

function editData(req, res) {
    var teamid = http.getRequest(req, "teamid");
    var oid = http.getRequest(req, "oid");
    var desc = http.getRequest(req, "desc");
    var worker = http.getRequest(req, "worker");
    var clientid = http.getRequest(req, "clientid");
    var extra = http.getRequest(req, "extra");
    var priority = http.getRequest(req, "priority");
    var dueto = http.getRequest(req, "dueto");
    var ticketType = http.getRequest(req, "ticketType");
    var dept = http.getRequest(req, "dept");
    if (!oid || !ObjectID.isValid(oid)) {
        res.json(
            {
                result: "FAIL",
                errMsg: "invalid objectid"
            }
        );
        return;
    }
    getTicketById(oid).then(function (result) {
            let ticket = result;
            if (ticket) {
                let historyInfor =
                    {
                        "dept": ticket["dept"],
                        "worker": ticket["worker"],
                        "type": ticket["type"],
                        "status": ticket["status"],
                        "dueto": ticket["dueto"],
                        "priority": ticket["priority"],
                        "desc": ticket["desc"],
                        "clientid": ticket["clientid"],
                        "extra": ticket["extra"],
                        "update_gmt": Math.floor(new Date().getTime() / 1000)
                    }
                if (ticket.history instanceof Array) {
                    ticket.history.push(historyInfor);
                } else {
                    ticket.history = [historyInfor];
                }

            }

            getUserInfor(teamid, worker).then(function (userResult) {
                let worker;
                if (userResult.list && (userResult.list instanceof Array)) {
                    worker = (userResult.list)[0];
                    ticket["worker"] = {
                        name: worker ? worker.nickname : "",
                        phone: worker ? worker.phonenumber : "",
                        email: worker ? worker.email : ""
                    };
                }

            }).then(function () {
                if (desc) ticket["desc"] = desc;
                if (extra) ticket["extra"] = extra;
                if (clientid) ticket["clientid"] = clientid;
                if (priority) ticket["priority"] = priority;
                if (dueto) ticket["dueto"] = dueto;
                if (ticketType) ticket["ticketType"] = ticketType;
                mongo.update({"_id": ObjectID(oid)}, ticket).then(function (n) {
                    res.json({
                        result: 'SUCCESS',
                        count: n
                    })
                    mongo.close();
                }).catch(function (err) {
                    res.json({
                        result: 'FAIL',
                        errMsg: err.message
                    })
                });
            });
        }
    ).catch(function (err) {
        console.log(err);
    });
}

function assignData(req, res) {
    var oid = http.getRequest(req, "oid");
    var worker = http.getRequest(req, "worker");
    var teamid = http.getRequest(req, "teamid");
    if (!oid || !ObjectID.isValid(oid)) {
        res.json(
            {
                result: "FAIL",
                errMsg: "invalid objectid"
            }
        );
        return;
    }

    //分配任务至工单负责人
    if (worker) {
        getUserInfor(teamid, worker).then(function (result) {
            let worker;
            if (result.list && (result.list instanceof Array)) {
                worker = (result.list)[0]
            }
            mongo.update({"_id": ObjectID(oid)}, {
                "worker": {
                    name: worker ? worker.nickname : "",
                    phone: worker ? worker.phonenumber : "",
                    email: worker ? worker.email : ""
                },
                "status": operationStatus["new"]
            }).then(function (n) {
                res.json({
                    result: 'SUCCESS',
                    count: n
                })
                mongo.close();
            }).catch(function (err) {
                res.json({
                    result: 'FAIL',
                    errMsg: err.message
                })
            });
        }).catch(function (err) {
            console.log(err);
        });
    }
}

//对工单添加备注
function commentData(req, res) {
    var oid = http.getRequest(req, "oid");
    var content = http.getRequest(req, "content");
    var worker = http.getRequest(req, "worker");
    let action = http.getRequest(req, "action");
    var creatTime = http.getRequest(req, "creatTime");
    if (!oid || !ObjectID.isValid(oid)) {
        res.json(
            {
                result: "FAIL",
                errMsg: "invalid objectid"
            }
        );
        return;
    }

    getTicketById(oid).then(function (result) {
        if (action == 'new') {
            let note = {
                "status": result.status,
                "content": content,
                "creator": worker,
                "create_gmt": Date.parse(new Date()),
                "update_gmt": Date.parse(new Date())
            };
            if (result.notes instanceof Array) {
                result.notes.push(note);
            } else {
                result.notes = [note];
            }
            ;
        } else if (action == 'del' && creatTime) {
            var newReulst = [];
            if (result.notes instanceof Array) {
                result.notes.forEach(function (value, index, arr) {
                    if (value["create_gmt"] != creatTime) {
                        newReulst.push(value);
                    }
                    ;
                });
                result.notes = newReulst;
            }
        }

        mongo.update({"_id": ObjectID(oid)}, result).then(function (n) {
            res.json({
                result: 'SUCCESS',
                count: n
            })
            mongo.close();
        }).catch(function (err) {
            res.json({
                result: 'FAIL',
                errMsg: err.message
            })
        });
    }, function (err) {
        console.log(err);
    });
}

//标记工单状态 —— 用于标记工单状态为确认，已完成，放弃
function markData(req, res) {
    var oid = http.getRequest(req, "oid");
    var operation = http.getRequest(req, "operation");

    if (!oid || !ObjectID.isValid(oid)) {
        res.json(
            {
                result: "FAIL",
                errMsg: "invalid objectid"
            }
        );
        return;
    }

    //修改工单状态 "1"———待确认 "2"———已确认 "3"————已完成 "4"————已放弃
    mongo.update({"_id": ObjectID(oid)}, {"status": operationStatus[operation]}).then(function (n) {
        res.json({
            result: 'SUCCESS',
            count: n
        })
        mongo.close();
    }).catch(function (err) {
        res.json({
            result: 'FAIL',
            errMsg: err.message
        })
    });
}

function getUserInfor(teamid, userName) {
    return new Promise(function (resolve, reject) {
        fetch(CONFIG.baseUrl + "index.php/Account/api/get", {
                method: 'POST',
                body: JSON.stringify({
                    'teamid': teamid,
                    "username": userName
                }),
                headers: {'Content-Type': 'application/json'}
            }
        ).then(function (result) {
            resolve(result.json());
        }, function (err) {
            reject(err);
        });
    })
}

function getTicketById(oid) {
    return new Promise(function (resolve, reject) {
        mongo.find({"_id": ObjectID(oid)}).then(function (result) {
            if (result instanceof Array) {
                resolve(result[0])
            }
        }, function (err) {
            reject(err);
        })
    })
}

function fetchData(teamid, module, filters, filter_operator) {

    if (filters == '' || filters == null)
        filters = '[]';

    if (filters == '' || filters == null)
        filter_operator = 'or';

    return new Promise(function (resolve, reject) {
        fetch(CONFIG.tomcaturl + '/crm/data/query', {
                method: 'POST',
                body: JSON.stringify({
                    teamid: teamid,
                    module: module,
                    filters: filters,
                    filter_operater: filter_operator,
                    limit: 9999,
                    offset: 0
                }),
                headers: {'Content-Type': 'application/json'}
            }
        ).then(function (result) {
            resolve(result.json());
        }, function (err) {
            reject(err);
        });
    });
}

function fetchMetaData(teamid, module) {

    return new Promise(function (resolve, reject) {
        fetch(CONFIG.tomcaturl + '/crm/metadata/query', {
                method: 'POST',
                body: JSON.stringify({
                    teamid: teamid,
                    module: module
                }),
                headers: {'Content-Type': 'application/json'}
            }
        ).then(function (result) {
            resolve(result.json());
        }, function (err) {
            reject(err);
        });
    });
}

function str_array(str) {
    if (str.length > 2) {
        console.log(str.substr(1, str.length - 2));
        return JSON.parse(str.substr(1, str.length - 2));
    } else {
        return {};
    }

}

function strToJson(str) {
    var json = (new Function("return " + str))();
    return json;
}

module.exports = router;