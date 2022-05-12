const EventEmitter = require('events').EventEmitter;
const protoo = require('protoo-server');
const throttle = require('@sitespeed.io/throttle');
const Logger = require('./Logger');
const config = require('../config');
const Bot = require('./Bot');
const jwt = require('jsonwebtoken');

const logger = new Logger('Room');
const index = require('../index')


class utils{

	/**
	 * finds the index of least used medaisoup worker in an array
	 * @param {*} mediasoupWorkers array
	 * @returns index of the least used one
	 */
	 static async getLeastLoadedWorkerIdx(mediasoupWorkers){
		// let minCpuCost=Number.MAX_VALUE
		// var _leastLoadedWorkerIdx = 0;

		// for (var i=0;i<mediasoupWorkers.length; i++)
		// {			
		// 	const worker = mediasoupWorkers[i]
		// 	const ru = await worker.getResourceUsage()
		// 	const cpuCost = ru.ru_utime + ru.ru_stime	// user cpu time + sys cpu time
		// 	logger.info("pid:", worker._pid, ", cpuCost:", cpuCost)
		// 	if (cpuCost < minCpuCost) {
		// 		minCpuCost = cpuCost
		// 		_leastLoadedWorkerIdx=i
		// 	}
		// }
		// logger.info("minCpuCost:", minCpuCost)
		// return _leastLoadedWorkerIdx
		//######################################################
		// var workerPids={}
		// for (var worker of mediasoupWorkers){
		// 	workerPids.set(worker._pid, true)
		// }
		// var workerLoad={}
		// for (var room of index.rooms){
		// 	for (var peer of room._protooRoom.peers){
		// 		peerWorkerPid = peer.data.workerPid
		// 		if(!workerPids.has(peerWorkerPid)) {continue}

		// 		if (workerLoad.has(peerWorkerPid)){
		// 			workerLoad.set(peerWorkerPid, workerLoad.get(peerWorkerPid)+1)
		// 		}else{
		// 			workerLoad.set(peerWorkerPid, 1)
		// 		}
		// 	}
		// }
		// var leastLoadedWorkerPid=""
		// var peerCount = Number.MAX_VALUE
		// for (var [pid, cnt] of workerLoad){
		// 	if (peerCount < cnt){
		// 		leastLoadedWorkerPid = pid
		// 	}
		// }
		// for (var i=0;i<mediasoupWorkers.length; i++){
		// 	if (mediasoupWorkers[i]._pid == leastLoadedWorkerPid){
		// 		return i
		// 	}
		// }		
		// logger.error(" ### getLeastLoadedWorkerIdx -> NOT FOUND: leastLoadedWorkerPid (",leastLoadedWorkerPid,") in mediasoupWorkers")
		// return Math.floor(Math.random() * mediasoupWorkers.length)  //better than crash right away i guess
		//######################################################
        var workerPids= new Map()
		for (var worker of mediasoupWorkers){
			workerPids.set(worker._pid, true)
		}
        var minCnt = Number.MAX_VALUE
        var pid = ""
        for (var [k,v] of index.workerLoadMap){
            if(!workerPids.has(peerWorkerPid)) {continue}
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

