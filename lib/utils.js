
const Logger = require('./Logger');

const logger = new Logger('utils');

const rooms = new Map();

/**
 * ccu threshold for creating new router
 */
 const ccuThreshold=10

/**
 * tracks and report worker load info
 */
class workerLoadMan{
    /**
     * pid : {
     *   peerCnt: int,
     *   roomReqCnt: int,
     *   rooms: 
     *     { roomId: roomSize}
     * }
     */
    _workerLoadMap = new Map() //TODO: maintenance job for zombie rooms necessary?    
    /**
     * @param {*} k (string) worker._pid
     * @param {*} v (obj) {
     *   peerCnt: int,
     *   roomReqCnt: int,
     *   rooms: 
     *     { roomId: roomSize}
     * }
     */
    static set(k,v){
        this._workerLoadMap.set(k,v)
    }
    /**
     * _workerLoadMap.get(k)
     * @param {*} k (string) worker._pid
     */
    static get(k){
        return this._workerLoadMap.get(k)
    }
    /**
     * returns _workerLoadMap
     */
    static get(){
        return this._workerLoadMap
    }
    /**
     * 
     * @param {*} k (string) worker._pid
     * @param {*} amt (int) amount to add, default=1
     * @param {*} peerId 
     * @param {*} roomId 
     */
    static addPeer(k, amt=1, peerId=null, roomId="???"){
        var sel = this._workerLoadMap.get(k)
        this._workerLoadMap.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms, consumerCnt: sel.consumerCnt,
            peerCnt: sel.peerCnt+amt})
    }

    static addConsumer(k, amt=1){
        var sel = this._workerLoadMap.get(k)
        this._workerLoadMap.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms, peerCnt: sel.peerCnt,
            consumerCnt: sel.consumerCnt+amt})
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
        if(!this._workerLoadMap.has(k)){
            logger.error("addRoomReq -- unexpected worker pid: %s", k)
            this._workerLoadMap.set(k, {peerCnt:0, roomReqCnt:0, rooms:new Map()})
        }
        var sel = this._workerLoadMap.get(k)
        sel.roomReqCnt += amt
       
        //rooms
        if (!this._workerLoadMap.get(k).rooms.has(roomId)){
            sel.rooms.set(roomId, amt)
        }else{
            var newAmt = sel.rooms.get(roomId) + amt
            sel.rooms.set(roomId, newAmt)
        }
    }

    static removeRoom(k, roomId){
        // logger.info("this._workerLoadMap_removeRoom: ", k, roomId)
        //udpate roomReqCnt    
        var sel = this._workerLoadMap.get(k)
        sel.roomReqCnt -= sel.rooms.get(roomId)

        //remove roomId in rooms
        sel.rooms.delete(roomId)
    }

	static getLeastLoadedWorkerIdx(mediasoupWorkers, roomId, roomReq){
        var minCnt_room = Number.MAX_VALUE
        var minCnt_peer = Number.MAX_VALUE
        var minWorkerIdx_room = -1
        var minWorkerIdx_peer = -1

        for (var [k,v] of this._workerLoadMap.entries()){
            var idx = mediasoupWorkers.map(function(w){return w._pid}).indexOf(k)
            if (idx==-1){continue}
            roomReqCnt = v.rooms.has(roomId)?v.roomReqCnt-roomReq:v.roomReqCnt  //ignore the amount reserved for requesting room
            if (roomReqCnt < minCnt_room){
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
        for (var [k,v] of this._workerLoadMap.entries()){
            r += v.roomReqCnt
        }
        return r
    }

    static runSurvey(){
        this.resetWorkerLoadMap()
        for (var [id, room] of rooms.entries()){       
            for (var peer of room.getPeers()){
                this.addPeer(peer.data.workerPid)
                this.addConsumer(peer.data.workerPid, 1 + peer.data.consumers.size)
            }
            for (var [worker, routerId] of room._inuseMediasoupWorkers){
                this.addRoomReq(worker._pid, room._roomId, room._roomReq)
            }
        }
        // logger.info("runSurvey -- this._workerLoadMap: %s", JSON.stringify(this._workerLoadMap, jsonStringifyReplacer, 2))
    }
    static resetWorkerLoadMap(){
        for (var [k, v] of this._workerLoadMap.entries()){
            v.peerCnt=0
            v.consumerCnt=0
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
    ccuThreshold: ccuThreshold,
    workerLoadMan : workerLoadMan,
    rooms: rooms,
    jsonStringifyReplacer:jsonStringifyReplacer
}

