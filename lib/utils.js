
const Logger = require('./Logger');

const logger = new Logger('utils');

const rooms = new Map();

/**
 * ccu threshold for creating new router
 */
const ccuThreshold=50



var workerLoadMan = (function() {
    /**
     * pid : {
     *   peerCnt: int,
     *   roomReqCnt: int,
     *   rooms: 
     *     { roomId: roomSize}
     * }
     */
    var _workerLoadMap = new Map(); //TODO: maintenance job for zombie rooms necessary?   

    function resetWorkerLoadMap(){
        for (var [k, v] of _workerLoadMap.entries()){
            v.peerCnt=0
            v.roomReqCnt=0
            v.rooms=new Map()
        }
    }      
    
    return {
        set: function(k,v){
            _workerLoadMap.set(k,v)
        },
        /**
         * _workerLoadMap.get(k)
         * @param {*} k (string) worker._pid
         */
        get: function(k){
            return _workerLoadMap.get(k)
        },
        /**
         * returns _workerLoadMap
         */
        get: function(){
            return _workerLoadMap
        },
        /**
         * 
         * @param {*} k (string) worker._pid
         * @param {*} amt (int) amount to add, default=1
         * @param {*} peerId 
         * @param {*} roomId 
         */
        addPeer: function(k, amt=1, peerId=null, roomId="???"){
            var sel = _workerLoadMap.get(k)
            _workerLoadMap.set(k, {roomReqCnt:sel.roomReqCnt, rooms: sel.rooms,
                peerCnt: sel.peerCnt+amt})
        },
        /**
         * 
         * @param {*} k (string) worker._pid
         * @param {*} amt (int) amount to add, default=1
         * @returns 
         */
        addRoomReq: function(k, roomId, amt=9999999){
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
        },

        removeRoom: function(k, roomId){
            // logger.info("this._workerLoadMap_removeRoom: ", k, roomId)
            //udpate roomReqCnt    
            var sel = _workerLoadMap.get(k)
            sel.roomReqCnt -= sel.rooms.get(roomId)

            //remove roomId in rooms
            sel.rooms.delete(roomId)
        },

        getLeastLoadedWorkerIdx: function(mediasoupWorkers, roomId, roomReq){
            var minCnt_room = Number.MAX_VALUE
            var minCnt_peer = Number.MAX_VALUE
            var minWorkerIdx_room = -1
            var minWorkerIdx_peer = -1

            for (var [k,v] of _workerLoadMap.entries()){
                var idx = mediasoupWorkers.map(function(w){return w._pid}).indexOf(k)
                if (idx==-1){continue}            
                roomReqCnt = v.rooms.has(roomId)?v.roomReqCnt-roomReq:v.roomReqCnt  //ignore the amount reserved for requesting room
                logger.info("v.rooms: %s; roomId: %s; has?: %s, roomReqCnt: %s", v.rooms, roomId, v.rooms.has(roomId), roomReqCnt)

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
        },
        sum: function(){
            var r=0
            for (var [k,v] of _workerLoadMap.entries()){
                r += v.roomReqCnt>v.peerCnt?v.roomReqCnt:v.peerCnt
            }
            return r
        },
        runSurvey: function(){
            resetWorkerLoadMap()
            for (var [id, room] of rooms.entries()){       
                for (var peer of room.getPeers()){
                    this.addPeer(peer.data.workerPid)
                }
                for (var [worker, routerId] of room._inuseMediasoupWorkers){
                    this.addRoomReq(worker._pid, room._roomId, room._roomReq)
                }
            }
            // logger.info("runSurvey -- this._workerLoadMap: %s", JSON.stringify(this._workerLoadMap, jsonStringifyReplacer, 2))
        },
    };
    })();

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

