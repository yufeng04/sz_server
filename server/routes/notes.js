var express = require('express');
var router = express.Router();
var CONFIG = require('../config.json');

var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

router.all('/get', function(req, res) {
  api("get", req, res)
});
router.all('/del', function(req, res) {
  api("del", req, res)
});
router.all('/update', function(req, res) {
  api("update", req, res)
});
router.all('/add', function(req, res) {
  api("add", req, res)
});

function api(action, req, res){
    var teamid = req.body.teamid
    var module = req.body.module
    var oid = req.body.oid
    var content = req.body.content
    var creator = req.body.creator
    var createTime = req.body.ts
    var limit = req.body.limit
    var offset = req.body.offset

  if( typeof(teamid)=='undefined' || teamid==null || typeof(module)=='undefined' || module==null ){
   res.json({
      result: "FAIL",
      errMsg: "invalid inputs"
    });
    return;
  }

  if( !oid || !ObjectID.isValid(oid) ){
    res.json(
        {
          result: "FAIL",
          errMsg: "invalid objectid"
        }
    );
    return;
  }

  mongodb.connect(CONFIG.mongodburl, function(err, db){

    if(err)
    {
        console.log(err)
        db.close();
        return;
    }

    var collectionName = "crm_" + module + "_" + teamid;
    var collection = db.collection(collectionName);

    switch(action){
        case 'add':
          var newNote = {
            content: content,
            time: (new Date()).getTime(),
            creator: creator
          }
          collection.updateOne({_id:ObjectID(oid)},
              {$addToSet: {"notes": newNote}},
              {upsert: false},
              function(err, r) {
                if(r.result.ok){
                    if(r.modifiedCount){
                        //写入成功
                        res.json(
                            {
                                "result" : "SUCCESS"
                            }
                        )
                    }
                }else{
                    res.json(
                        {
                            "result" : "FAIL",
                            "errMsg" : "cannot insert new note"
                        }
                    )
                }
              })
        break;
      case 'del':
          collection.updateOne({_id:ObjectID(oid)},
              {$pull: {notes: {
                  content: content,
                  creator: creator,
                  time: parseInt(createTime)
              }}},
                function(err, r){
                    if(err){
                        res.json({
                            "result" : "FAIL",
                            "errMsg" : err
                        });
                    }else{
                        if(r.modifiedCount){
                            res.json({
                                "result" : "SUCCESS"
                            })
                        }else{
                            res.json({
                                "result" : "FAIL",
                                "errMsg" : "cannot find target note"
                            })
                        }

                    }
                })
        break;
      case 'get':
          collection.find({_id:ObjectID(oid)}).toArray(function(err, docs){
             if(err)
             {
                 res.json({
                     "result" : "FAIL",
                     "errMsg" : err
                 });
             }else{
                 res.json({
                     "result" : "SUCCESS",
                     "list"   : docs.length?docs[0].notes:null
                 })
             }
          });
        break;
      default:
        break;
    }

    db.close();
  })
}

module.exports = router;
