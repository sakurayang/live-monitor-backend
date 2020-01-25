let zlib = require("zlib");

function parsePacket(packet) {
    if (!Buffer.isBuffer(packet)) return { code: -1, msg: "not a buffer" };
    packet = Buffer.from(packet);
    let operation = packet.readInt8(11);
    let protocol = packet.readInt8(7);
    let data_length = packet.readInt32BE(0);
    //console.log(data_length, packet.length);
    if (data_length < 16 || data_length > 0x100000 || data_length > packet.length) {
        //length error DROP IT!!!!
        return { code: -2, msg: "packet length error" };
    } else if (data_length < packet.length) {
        //give the body to another parser then do again
        parseBody(operation, protocol, Buffer.from(packet).slice(16, data_length));
        return parsePacket(Buffer.from(packet).slice(data_length));
    } else if (data_length == packet.length) {
        //got it
        return parseBody(operation, protocol, Buffer.from(packet).slice(16));
    } else {
        return { code: -10086, msg: "unknown error" };
    }
}

function parseBody(operation, protocol, body) {
    /* operation type:
     * 2  客户端  null     心跳
     * 7  客户端  JSON     进房
     * -------------------------------------------------------------
     * 3  服务器  Int32BE  心跳回应    Body 内容为房间人气值
     * 5  服务器  JSON 	   通知       弹幕、广播等全部信息
     * 8  服务器  null 	   进房回应	
     * ==============================================================
     * protocol type:
     * 0    JSON       JSON纯文本，可以直接通过 JSON.parse 解析
     * 1    Int32BE    Body 内容为房间人气值
     * 2    Buffer     压缩过的 Buffer，Body 内容需要用zlib.inflate解压出一个新的
     *                 数据包，然后从数据包格式那一步重新操作一遍
     */
    if (!Buffer.isBuffer(body)) return { error: "not a buffer" };
    body = Buffer.from(body);
    if (protocol == 2) return parsePacket(zlib.inflateSync(body));

    let msg;
    switch (operation) {
        case 2: {
            msg = {
                code: -1,
                type: "heart",
                msg: "a heart beat packet (It should not receive from server)",
                data: null
            }
            break;
        }
        case 3: {
            //console.log("人气：" + body.readInt32BE(0));
            msg = {
                code: 0,
                type: "view",
                msg: null,
                data: {
                    time: Date.now(),
                    view: body.readInt32BE(0)
                }
            };
            break;
        }
        case 5: {
            try {
                let parsed_body = JSON.parse(body.toString());
                return parseNotify(parsed_body);
            } catch (error) {
                msg = {
                    code: -2,
                    type: "notify",
                    msg: "parsed error",
                    data: body
                }
            }
            break;
        }
        case 8: {
            //console.log(_data);
            let code = protocol == 0 ? JSON.parse(body.toString()).code : false;
            //JSON-> parse  nonJSON-> DROP IT
            msg = {
                code: 0,
                type: "answer",
                msg: code == 1 ? "" : `enter room error: [code:${code}]`,
                data: body
            }
            break;
        }
        default: {
            msg = {
                code: -10086,
                type: "unknow",
                msg: "unknow",
                data: body
            }
            //unknown data
            break;
        }
    }
    return msg;
}
function parseNotify(body) {
    let cmd = String(body.cmd);
    /* cmd stand for
     * SEND_GIFT 
     * {
     *  "giftName": String,
     *  "num": Number,
     *  "timestamp": Date,
     *  "giftId": Number,
     *  "giftType": Number,
     *  "price": Number,
     *  "coin_type": String, <gold|sliver>
     *  "total_coin": Number,
     * }
     * ====================================================================
     * DANMU_MSG
     * |  type     | index  |   desc  |   example
     * | Message   |  [1]   | String  | hello
     * | User info |  [2]   | [uid, username, isAdmin, isVip, unknow, unknow, unknow] | [24247316, "Gerardyang", 0, 0, 0, 10000, 1, ""]
     * | Suffix    |  [3]   | [level, text, owner, owner_room_id, unknow, unknow, unknow] | [1, "奶猫粮", "夜霧Yogiri", 21618129, 6406234, "", 0]
     * | User Level|  [4]   | [level, unknow, next_level, rank] | [35, 0, 10512625, ">50000"]
     * ===================================================================
     * GUARD_BUY
     * {
     *   data:{
     *     uid: Number,
     *     username: String,
     *     guard_level: Number,  3:舰长 2:提督 1:总督
     *   }
     * }
     * coin: 3: 190000 2:2000000 1:20000000 (gold)
     * ====================================================================
     * SUPER_CHAT_MESSAGE_JPN
     * {
     *  "id": "55599",
     *  "uid": "4556743",
     *  "price": 30,
     *  "rate": 1000,
     *  "message": "众筹NS（2/70）wwwww",
     *  "message_jpn": "衆チップNS(2/70)wwww",
     *  "background_image": "http://i0.hdslb.com/bfs/live/1aee2d5e9e8f03eed462a7b4bbfd0a7128bbc8b1.png",
     *  "background_color": "#EDF5FF",
     *  "background_icon": "",
     *  "background_price_color": "#7497CD",
     *  "background_bottom_color": "#2A60B2",
     *  "ts": 1578489869,
     *  "token": "7F6182C",
     *  "medal_info": {
     *      "icon_id": 0,
     *      "target_id": 427061218,
     *      "special": "",
     *      "anchor_uname": "夜霧Yogiri",
     *      "anchor_roomid": 21618129,
     *      "medal_level": 15,
     *      "medal_name": "奶猫粮",
     *      "medal_color": "#ff86b2"
     *  },
     *  "user_info": {
     *      "uname": "香久矢圓香",
     *      "face": "http://i0.hdslb.com/bfs/face/2913f466f6023496557f8ebde9a8ca5091ed7c46.jpg",
     *      "face_frame": "http://i0.hdslb.com/bfs/live/78e8a800e97403f1137c0c1b5029648c390be390.png",
     *      "guard_level": 3,
     *      "user_level": 31,
     *      "level_color": "#a068f1",
     *      "is_vip": 0,
     *      "is_svip": 0,
     *      "is_main_vip": 1,
     *      "title": "title-88-1",
     *      "manager": 0
     *  },
     *  "time": 59,
     *  "start_time": 1578489868,
     *  "end_time": 1578489928,
     *  "gift": {
     *      "num": 1,
     *      "gift_id": 12000,
     *      "gift_name": "醒目留言"
     * }
     * 
     */
    if (cmd.startsWith("DANMU_MSG")) {
        return {
            code: 0,
            msg: "",
            type: "danmu",
            data: {
                message: String(body.info[1]),
                user: {
                    id: Number(body.info[2][0]),
                    name: String(body.info[2][1]),
                    isAdmin: Boolean(body.info[2][2]),
                    isVip: Boolean(body.info[2][3])
                },
                suffix: {
                    level: body.info[3].length ? String(body.info[3][0]) : 0,
                    name: body.info[3].length ? String(body.info[3][1]) : "",
                    owner: body.info[3].length ? String(body.info[3][2]) : "",
                }
            }
        }
    } else if (cmd.startsWith("SEND_GIFT")) {
        let data = body.data;
        return {
            code: 0,
            msg: "",
            type: "gift",
            data: {
                name: String(data.giftName),
                num: Number(data.num),
                timestamp: Number(data.timestamp) * 1000,
                giftId: Number(data.giftId),
                giftType: Number(data.giftType),
                price: Number(data.price),
                coin_type: String(data.coin_type),
                total_coin: Number(data.total_coin),
            }
        }
    } else if (cmd.startsWith("GUARD_BUY")) {
        let data = body.data;
        return {
            code: 0,
            msg: "",
            type: "guard_buy",
            data: {
                time: Date.now(),
                level: Number(data.guard_level),
                giftname: data.guard_level == 3 ? "舰长" :
                    data.guard_level == 2 ? "提督" :
                        data.guard_level == 1 ? "总督" : "",
                user: {
                    uid: Number(data.uid),
                    uname: String(data.username)
                },
                coin_type: "gold",
                total_coin: data.guard_level == 3 ? 190000 :
                    data.guard_level == 2 ? 2000000 :
                        data.guard_level == 1 ? 20000000 : 0,
                num: data.num
            }
        }
    } else if (cmd.startsWith("SUPER_CHAT_MESSAGE")) {
        let data = body.data;
        return {
            code: 0,
            msg: "",
            type: "super_chat",
            data: {
                uid: Number(data.uid),
                price: Number(data.price),
                rate: Number(data.rate),
                message: String(data.message),
                color: String(data.background_bottom_color),
                user_info: {
                    uname: String(data.user_info.uname),
                    face: String(data.user_info.face),
                    guard_level: Number(data.user_info.guard_level),
                    is_vip: Boolean(data.user_info.is_vip),
                    is_svip: Boolean(data.user_info.is_svip),
                    is_main_vip: Boolean(data.user_info.is_main_vip),
                    manager: Number(data.user_info.manager)
                },
                time: Number(data.time),
                start_time: Number(data.start_time) * 1000,
                end_time: Number(data.end_time) * 1000,
                gift: {
                    num: Number(data.gift.num),
                    id: Number(data.gift.gitf_id),
                    name: String(data.gift.gift_name)
                }
            }
        }
    } else {
        return {
            code: 0,
            msg: "",
            type: "other",
            data: body
        }
    }
}

module.exports = {
    packet: parsePacket
}