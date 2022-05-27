
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

var tmpPeerIdCache = new Map()
/**
 * designed peer capacity per worker
 */
const workerPeerCapacity=31

class utils{
    static workerCapacity(){
        return workerPeerCapacity
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
    static workerLoadMap_addPeer(k, amt=1, peerId=null){
        // var selAmt = workerLoadMap.has(k) ? workerLoadMap.get(k).peerCnt:0
        // workerLoadMap.set(k, selAmt+amt)
        var sel = workerLoadMap.get(k)
        workerLoadMap.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms,
            peerCnt: sel.peerCnt+amt})
        
        if (peerId){
            if (amt==1){
                tmpPeerIdCache.set(peerId, "+")
            }else if(amt==-1){
                if (tmpPeerIdCache.get(peerId)!="+"){
                    var err = new Error();
                    logger.error("unexpected tmpPeerIdCache.v (%s) stack: %s", tmpPeerIdCache.get(peerId), err.stack)
                }
            }            
        }
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
    static workerLoadMap_addRoomReq(k, roomId, amt=1){
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
        var workerPids= new Map()
		for (var worker of mediasoupWorkers){
			workerPids.set(worker._pid, true)
		}
        var minCnt = Number.MAX_VALUE
        var leastLoadedWorkerPid = ""
        //try with roomReqCnt first
        for (var [k,v] of workerLoadMap.entries()){
            if(!workerPids.has(k)) {continue}
            if (v.roomReqCnt < minCnt){
                minCnt=v.roomReqCnt
                leastLoadedWorkerPid=k
            }
        }

        if (minCnt > workerPeerCapacity) {
            logger.info("all workers are maxed out on rooms (minCnt: %s on workerPid: %s)", minCnt, leastLoadedWorkerPid)
            //try select by peerCnt -- peerCnt should always be smaller than roomReqCnt
            for (var [k,v] of workerLoadMap.entries()){
                if(!workerPids.has(k)) {continue}
                if (v.peerCnt < minCnt){
                    minCnt=v.peerCnt
                    leastLoadedWorkerPid=k
                }
            }
            logger.info("fallback to worker with least peerCnt (minCnt: %s on workerPid: %s)", minCnt, leastLoadedWorkerPid)
        }

		for (var i=0;i<mediasoupWorkers.length; i++){
			if (mediasoupWorkers[i]._pid === leastLoadedWorkerPid){
				return [i, minCnt]
			}
		}
        // this should never happen:
		logger.error(" ### this should never happen ### getLeastLoadedWorkerIdx -> NOT FOUND: leastLoadedWorkerPid (",leastLoadedWorkerPid,") in mediasoupWorkers")
		return [Math.floor(Math.random() * mediasoupWorkers.length), -1]  //better than crash right away i guess
	}
}
module.exports = utils;
