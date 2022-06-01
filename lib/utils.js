
const EventEmitter = require('events').EventEmitter;
const protoo = require('protoo-server');
const throttle = require('@sitespeed.io/throttle');
const Logger = require('./Logger');
const config = require('../config');
const Bot = require('./Bot');
const jwt = require('jsonwebtoken');

const logger = new Logger('utils');

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
var _workerLoadMan = new Map() //TODO: maintenance job for zombie rooms necessary?

var _peerIdCache = new Map() //TODO: either drop peer tracking or add ttl to keys to avoid potential memory leak

var _roomReqRegister = new Map() //TODO: add expiry


/**
 * stores roomId:req for room init
 * 
 */
class roomReqRegister{
    static get(k,v){
        return _roomReqRegister
    }    
    static set(k,v){
        _roomReqRegister.set(k,v)
    }
}

/**
 * tracks worker loads
 * 
 */
class workerLoadMan{
    /**
     * _workerLoadMan.set(k,v)
     * @param {*} k (string) worker._pid
     * @param {*} v (int) user count
     */
    static set(k,v){
        _workerLoadMan.set(k,v)
    }
    /**
     * _workerLoadMan.get(k)
     * @param {*} k (string) worker._pid
     */
    static get(k){
        return _workerLoadMan.get(k)
    }
    /**
     * returns _workerLoadMan
     */
    static get(){
        return _workerLoadMan
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static addPeer(k, amt=1, peerId=null, roomId="???"){
        if (peerId){
            if (amt==1){
                if(_peerIdCache.has(peerId)){
                    logger.warn("---_workerLoadMan_addPeer---peerId <%v> already added for roomId <%v>", peerId, _peerIdCache.get(peerId))
                    return
                }
            }else if(amt==-1){
                if (!_peerIdCache.has(peerId)){
                    logger.warn("---_workerLoadMan_addPeer---peerId <%v> not found in peerIdCache", peerId)
                    return
                }
            }
        }
        var sel = _workerLoadMan.get(k)
        _workerLoadMan.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms,
            peerCnt: sel.peerCnt+amt})
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static addRoomReq(k, roomId, amt=9999999){
        //roomReqCnt
        var sel = _workerLoadMan.get(k)
        sel.roomReqCnt += amt
       
        //rooms
        if (!_workerLoadMan.get(k).rooms.has(roomId)){
            sel.rooms.set(roomId, amt)
            logger.info("sel: ", sel)
        }else{
            var newAmt = sel.rooms.get(roomId) + amt
            sel.rooms.set(roomId, newAmt)
        }
    }

    static removeRoom(k, roomId){
        logger.info("_workerLoadMan_removeRoom: ", k, roomId)
        //udpate roomReqCnt    
        var sel = _workerLoadMan.get(k)
        sel.roomReqCnt -= sel.rooms.get(roomId)

        //remove roomId in rooms
        sel.rooms.delete(roomId)
    }

	static getLeastLoadedWorkerIdx(mediasoupWorkers){

        var minCnt_room = Number.MAX_VALUE
        var minCnt_peer = Number.MAX_VALUE
        var minWorkerIdx_room = -1
        var minWorkerIdx_peer = -1

        //TODO?? -- after "roomReq" feature's implemeneted (hubs?/ret?/orch?) -- drop _peer because _room should always be greater than _peer 
        for (var [k,v] of _workerLoadMan.entries()){
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
        logger.info("minCnt_room: %s, minWorkerIdx_room: %s", minCnt_room, minWorkerIdx_room)
        logger.info("minCnt_peer: %s, minWorkerIdx_peer: %s", minCnt_peer, minWorkerIdx_peer)        

        return minCnt_room>minCnt_peer?[minWorkerIdx_room, minCnt_room]:[minWorkerIdx_peer, minCnt_peer]
	}

    static sum_roomReq(){
        var r=0
        for (var [k,v] of _workerLoadMan.entries()){
            r += v.roomReqCnt
            logger.info("pid %s -- roomReqCnt: %s ... r: ", k, v.roomReqCnt, r)
        }
        return r
    }
}


module.exports = {
    maxPerCoreCCU: maxPerCoreCCU,
    workerLoadMan : workerLoadMan,
    roomReqRegister : roomReqRegister
}

