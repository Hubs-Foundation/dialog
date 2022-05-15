
const EventEmitter = require('events').EventEmitter;
const protoo = require('protoo-server');
const throttle = require('@sitespeed.io/throttle');
const Logger = require('./Logger');
const config = require('../config');
const Bot = require('./Bot');
const jwt = require('jsonwebtoken');

const logger = new Logger('utils');


var workerLoadMap = new Map()

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
    static workerLoadMap_add(k, amt=1){
        var currentAmt = workerLoadMap.has(k) ? workerLoadMap.get(k):0
        workerLoadMap.set(k, currentAmt+amt)
    }

	static getLeastLoadedWorkerIdx(mediasoupWorkers){
        var workerPids= new Map()
		for (var worker of mediasoupWorkers){
			workerPids.set(worker._pid, true)
            logger.info("workerPids: ",worker._pid)
		}

        var minCnt = Number.MAX_VALUE
        var leastLoadedWorkerPid = ""
        for (var [k,v] of workerLoadMap.entries()){
            if(!workerPids.has(k)) {continue}
            if (v < minCnt){
                minCnt=v
                leastLoadedWorkerPid=k
            }
        }
		for (var i=0;i<mediasoupWorkers.length; i++){
			if (mediasoupWorkers[i]._pid === leastLoadedWorkerPid){
				return [i, minCnt]
			}
		}
        // this should never happen:
		logger.error(" ### this should never happen ### getLeastLoadedWorkerIdx -> NOT FOUND: leastLoadedWorkerPid (",leastLoadedWorkerPid,") in mediasoupWorkers")
		return [Math.floor(Math.random() * mediasoupWorkers.length),-1]  //better than crash right away i guess
	}
}
module.exports = utils;
