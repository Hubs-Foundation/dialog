
const EventEmitter = require('events').EventEmitter;
const protoo = require('protoo-server');
const throttle = require('@sitespeed.io/throttle');
const Logger = require('./Logger');
const config = require('../config');
const jwt = require('jsonwebtoken');

const logger = new Logger('utils');



const rooms = new Map();

/**
 * designed peer capacity per worker
 */
 const maxPerCoreCCU=33

/**
 * pid : {
 *   peerCnt: int,
 *   roomReqCnt: int,
 *   rooms: 
 *     { roomId: roomSize}
 * }
 */
var _workerLoadMap = new Map() //TODO: maintenance job for zombie rooms necessary?

var _peerIdCache = new Map() //TODO: either drop peer tracking or add ttl to keys to avoid potential memory leak

// var _roomReqRegister = new Map() //TODO: add expiry


// /**
//  * stores roomId:req for room init
//  * 
//  */
// class roomReqRegister{
//     static get(k,v){
//         return _roomReqRegister
//     }    
//     static set(k,v){
//         _roomReqRegister.set(k,v)
//     }
// }

/**
 * tracks worker loads
 * 
 */
class workerLoadMan{
    /**
     * _workerLoadMap.set(k,v)
     * @param {*} k (string) worker._pid
     * @param {*} v (int) user count
     */
    static set(k,v){
        _workerLoadMap.set(k,v)
    }
    /**
     * _workerLoadMap.get(k)
     * @param {*} k (string) worker._pid
     */
    static get(k){
        return _workerLoadMap.get(k)
    }
    /**
     * returns _workerLoadMap
     */
    static get(){
        return _workerLoadMap
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static addPeer(k, isProducing=null, amt=1, peerId=null, roomId="???"){
        if (peerId){
            if (amt==1){
                if(_peerIdCache.has(peerId)){
                    logger.warn("---_workerLoadMap_addPeer---peerId <%v> already added for roomId <%v>", peerId, _peerIdCache.get(peerId))
                    return
                }
            }else if(amt==-1){
                if (!_peerIdCache.has(peerId)){
                    logger.warn("---_workerLoadMap_addPeer---peerId <%v> not found in peerIdCache", peerId)
                    return
                }
            }
        }
        var sel = _workerLoadMap.get(k)
        _workerLoadMap.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms,
            peerCnt: sel.peerCnt+amt})
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static addRoomReq(k, roomId, amt=9999999){
        // logger.info("addRoomReq, k: %s", k)
        //roomReqCnt
        if(!_workerLoadMap.has(k)){
            logger.error("addRoomReq -- unexpected worker pid: %s", k)
            _workerLoadMap.set(k, {peerCnt:0, roomReqCnt:0, rooms:new Map()})
        }
        var sel = _workerLoadMap.get(k)
        sel.roomReqCnt += amt
       
        //rooms
        if (!_workerLoadMap.get(k).rooms.has(roomId)){
            sel.rooms.set(roomId, amt)
        }else{
            var newAmt = sel.rooms.get(roomId) + amt
            sel.rooms.set(roomId, newAmt)
        }
    }

    static removeRoom(k, roomId){
        // logger.info("_workerLoadMap_removeRoom: ", k, roomId)
        //udpate roomReqCnt    
        var sel = _workerLoadMap.get(k)
        sel.roomReqCnt -= sel.rooms.get(roomId)

        //remove roomId in rooms
        sel.rooms.delete(roomId)
    }

	static getLeastLoadedWorkerIdx(mediasoupWorkers){
        var minCnt_room = Number.MAX_VALUE
        var minCnt_peer = Number.MAX_VALUE
        var minWorkerIdx_room = -1
        var minWorkerIdx_peer = -1

        for (var [k,v] of _workerLoadMap.entries()){
            var idx = mediasoupWorkers.map(function(w){return w._pid}).indexOf(k)
            if (idx==-1){continue}
            if (v.roomReqCnt < minCnt_room){
                minCnt_room=v.roomReqCnt
                minWorkerIdx_room=idx
            }
            if (v.peerCnt < minCnt_peer){
                minCnt_peer=v.peerCnt
                minWorkerIdx_peer=idx
            }
        }
        logger.info("minCnt_room: %s, workerIdx_room: %s, minCnt_peer: %s, workerIdx_peer: %s", minCnt_room, minWorkerIdx_room, minCnt_peer, minWorkerIdx_peer)
        return minCnt_room>minCnt_peer?[minWorkerIdx_room, minCnt_room]:[minWorkerIdx_peer, minCnt_peer]
	}

    static sum_roomReq(){
        var r=0
        for (var [k,v] of _workerLoadMap.entries()){
            r += v.roomReqCnt
        }
        return r
    }

    static runSurvey(){
        var tStart = process.hrtime();
        this.resetWorkerLoadMap()
        for (var [id, room] of rooms.entries()){       
            for (var peer of room.getPeers()){
                this.addPeer(peer.data.workerPid)
            }
            for (var [worker, routerId] of room._inuseMediasoupWorkers){
                this.addRoomReq(worker._pid, room._roomId, 10)
            }
        }
        logger.info("runSurvey() took: %s", process.hrtime() - tStart)
        // logger.info("runSurvey -- _workerLoadMap: %s", JSON.stringify(_workerLoadMap, jsonStringifyReplacer, 2))
    }
    static resetWorkerLoadMap(){
        for (var [k, v] of _workerLoadMap.entries()){
            v.peerCnt=0
            v.roomReqCnt=0
            v.rooms=new Map()
        }
    }
}


var jsonStringifyReplacer = (key,value) => {
    if (value instanceof Map) {
        const reducer = (obj, mapKey) => {
            obj[mapKey] = value.get(mapKey);
            return obj;
        };
        return [...value.keys()].sort().reduce(reducer, {});
    } else if (value instanceof Set) {
        return [...value].sort();
    }
    return value;}

module.exports = {
    maxPerCoreCCU: maxPerCoreCCU,
    workerLoadMan : workerLoadMan,
    // roomReqRegister : roomReqRegister,
    rooms: rooms,
    jsonStringifyReplacer:jsonStringifyReplacer
}

