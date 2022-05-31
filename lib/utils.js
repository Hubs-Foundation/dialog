
const EventEmitter = require('events').EventEmitter;
const protoo = require('protoo-server');
const throttle = require('@sitespeed.io/throttle');
const Logger = require('./Logger');
const config = require('../config');
const Bot = require('./Bot');
const jwt = require('jsonwebtoken');

const logger = new Logger('utils');

/**
 * pid : {
 *   peerCnt: int,
 *   roomReqCnt: int,
 *   rooms: 
 *     { roomId: roomSize}
 * }
 */
var workerLoadMap = new Map()

var peerIdCache = new Map()
/**
 * designed peer capacity per worker
 */
const maxPerCoreCCU=33

class utils{
    static workerCapacity(){
        return maxPerCoreCCU
    }

    /**
     * workerLoadMap.set(k,v)
     * @param {*} k (string) worker._pid
     * @param {*} v (int) user count
     */
    static workerLoadMap_set(k,v){
        workerLoadMap.set(k,v)
    }
    /**
     * workerLoadMap.get(k)
     * @param {*} k (string) worker._pid
     */
    static workerLoadMap_get(k){
        return workerLoadMap.get(k)
    }
    /**
     * returns workerLoadMap
     */
    static workerLoadMap_get(){
        return workerLoadMap
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static workerLoadMap_addPeer(k, amt=1, peerId=null, roomId="???"){
        if (peerId){
            if (amt==1){
                if(peerIdCache.has(peerId)){
                    logger.warn("---workerLoadMap_addPeer---peerId <%v> already added for roomId <%v>", peerId, peerIdCache.get(peerId))
                    return
                }                
            }else if(amt==-1){
                if (!tmpPeerIdCache.has(peerId)){
                    logger.warn("---workerLoadMap_addPeer---peerId <%v> not found in peerIdCache", peerId)
                    return
                }
            }
        }
        var sel = workerLoadMap.get(k)
        workerLoadMap.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms,
            peerCnt: sel.peerCnt+amt})
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static workerLoadMap_addRoomReq(k, roomId, amt=9999999){
        //roomReqCnt
        var sel = workerLoadMap.get(k)
        sel.roomReqCnt += amt
       
        //rooms
        if (!workerLoadMap.get(k).rooms.has(roomId)){
            sel.rooms.set(roomId, amt)
            logger.info("sel: ", sel)
        }else{
            var newAmt = sel.rooms.get(roomId) + amt
            sel.rooms.set(roomId, newAmt)
        }
    }

    static workerLoadMap_removeRoom(k, roomId){
        logger.info("workerLoadMap_removeRoom: ", k, roomId)
        //udpate roomReqCnt    
        var sel = workerLoadMap.get(k)
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
        for (var [k,v] of workerLoadMap.entries()){
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
}
module.exports = utils;
