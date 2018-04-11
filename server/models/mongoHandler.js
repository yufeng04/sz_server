/**
 * Created by danzhang on 2017/2/17.
 */

var mongodb = require('mongodb').MongoClient;

var Promise = require('bluebird');

Promise.promisifyAll(mongodb);

var dbObj = null;
var collection = null;
var connected = false;

var getDb = function(){
    return dbObj;
}
var getCollection = function(){
    return collection;
}

var connect = function(url, database){

    return mongodb.connect(url)
        .then(function(db){

            if(database)
                dbObj = db.db(database);
            else
                dbObj = db;


                connected = true;

                db.on("close", function(){
                    console.log("mongodb connection was interrupted");
                    connected = false;
                })

                return true;
            }).catch(function(err){
                console.log(err.message);
                return false;
            })
}

var setCollection = function(colName){

    if(colName){
        collection = dbObj.collection(colName);
    }else{
        collection = null;
    }

    return;
}

var isConnected = function(){
    return connected;
}

var close = function(){
    dbObj.close();
    return;
}

var find = function(where, except, sortOption, limit, offset){

    if(collection==null)
        return null;

    var result = collection.find(where, except);

    if(sortOption!=null)
    {
        result = result.sort(sortOption);
    }

    if( limit )
        result = result.limit(parseInt(limit)).skip(parseInt(offset));

    result = result.toArray();

    return result.then(function(docs){
        return docs;
    }).catch(function(err){
        console.log(err.message);
        return null;
    })
}

var count = function(where, except){

    if(collection==null)
        return null;

    var result = collection.count(where, except);

    //result = result.toArray();

    return result.then(function(docs){
        return docs;
    }).catch(function(err){
        console.log(err.message);
        return null;
    })
}

var insert = function(data){

    if(collection==null)
        return null;

    for(var i=0; i<data.length; i++){
        data[i].create_gmt = Math.floor(new Date().getTime()/1000);
        data[i].update_gmt = data[i].create_gmt;
    }

    return collection.insert(data)
        .then(function(result){
            x = result.insertedIds;
            y = [];
            for(var i=1; i<x.length; i++){
                y.push( x[i].toHexString() );
            }
            return y;
        })
}

var remove = function(select){

    if(collection==null)
        return null;

    return collection.remove(select)
        .then(function(result){
            return result.result.n;     //被删除的条数
        })
}


var update = function(selector, document){

    if(collection==null)
        return null;

    document.update_gmt = Math.floor(new Date().getTime()/1000);

    return collection.update(selector, {$set: document}, {upsert : true})
        .then(function(result){
            return result.result.nModified;     //被更新的条数
        })
}

var updateX = function(selector, document){

    if(collection==null)
        return null;

    return collection.update(selector, document, {upsert : true})
        .then(function(result){
            return result.result.nModified;     //被更新的条数
        })
}



module.exports = {
    getDb: getDb,
    isConnected: isConnected,
    getCollection: getCollection,
    connect: connect,
    setCollection: setCollection,
    close: close,
    find: find,
    insert: insert,
    remove: remove,
    update: update,
    updateX: updateX,
    count:count
}