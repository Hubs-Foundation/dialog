
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
     * @param {*} k 
     * @param {*} v 
     */
    workerLoadMap_set(k,v){
        workerLoadMap.set(k,v)
    }
    /**
     * workerLoadMap.get(k)
     * @param {*} k 
     */
    workerLoadMap_get(k){
        return workerLoadMap.get(k)
    }

    

	static async getLeastLoadedWorkerIdx(mediasoupWorkers){
        var workerPids= new Map()
		for (var worker of mediasoupWorkers){
			workerPids.set(worker._pid, true)
		}

        var minCnt = Number.MAX_VALUE
        var pid = ""
        logger.info("workerLoadMap: ", workerLoadMap)
        for (var [k,v] of workerLoadMap.entries()){
            if(!workerPids.has(k)) {continue}
            if (v < minCnt){
                minCnt=v
                pid=k
            }
        }
		for (var i=0;i<mediasoupWorkers.length; i++){
			if (mediasoupWorkers[i]._pid == leastLoadedWorkerPid){
				return i
			}
		}
        // this should never happen:
		logger.error(" ### getLeastLoadedWorkerIdx -> NOT FOUND: leastLoadedWorkerPid (",leastLoadedWorkerPid,") in mediasoupWorkers")
		return Math.floor(Math.random() * mediasoupWorkers.length)  //better than crash right away i guess
	}
}
module.exports = utils;
