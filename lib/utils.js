
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

/**
 * designed peer capacity per worker
 */
const workerPeerCapacity=31

class utils{

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
    static workerLoadMap_addPeer(k, amt=1){
        // var currentAmt = workerLoadMap.has(k) ? workerLoadMap.get(k).peerCnt:0
        // workerLoadMap.set(k, currentAmt+amt)
        var current = workerLoadMap.get(k)
        workerLoadMap.set(k, {roomReqCnt:current.roomReqCnt, rooms: current.rooms,
            peerCnt: current.peerCnt+amt})
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @returns 
     */
     static workerLoadMap_addRoomReq(k, room, amt=1){
        var current = workerLoadMap.get(k)
        if (!current.rooms.has(room)){
            workerLoadMap.set(k, {peerCnt: current.peerCnt, 
                rooms: current.rooms.set(room._roomId, amt),
                roomReqCnt:current.roomReqCnt+amt})
        }else{
            workerLoadMap.set(k, {peerCnt: current.peerCnt, rooms: current.rooms,
                roomReqCnt:current.roomReqCnt+amt})
        }
    }

	static getLeastLoadedWorkerIdx(mediasoupWorkers){
        var workerPids= new Map()
		for (var worker of mediasoupWorkers){
			workerPids.set(worker._pid, true)
            logger.info("workerPids: ",worker._pid)
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
            //try select by peerCnt -- peerCnt should always be smaller than roomReqCnt
            for (var [k,v] of workerLoadMap.entries()){
                if(!workerPids.has(k)) {continue}
                if (v.peerCnt < minCnt){
                    minCnt=v.peerCnt
                    leastLoadedWorkerPid=k
                }
            }
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
