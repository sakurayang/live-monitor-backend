const request = require("request-promise-native");
const ws = require('ws');
const fs = require('fs');
const zlib = require('zlib');
class Room {
    /**
     * @param {Number} id
     * @returns {this} 
     */
    constructor(id) {
        if (isNaN(id)) return new Error("error ID");
        this.id = id;

        return this;
    }
    async init() {
        this.danmu = await this._setDanmuURL();
        this.gift_conf = await this._setgiftConf();
        this.room_info = await this.getRoomInfo();
        return this;
    }
    /**
     * @returns {
        {
            ok: false,
            error: Error
        }|{
            ok:true,
            room: {
                title: String,
                cover: String,
                start_time: Number,
                rank: String,
                area_rank: String
            },
            area:{
                id: Number,
                name: String,
                parent: {
                    id: Number,
                    name: String
                }
            },
            anchor: {
                anchor_name: String,
                level: Number
            }
        }
    }*/
    async getRoomInfo() {
        let info = await request.get(`https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${this.id}`);
        info = JSON.parse(info);
        if (info.code != 0) return { ok: false, error: info.message };
        let data = info.data;
        let room_info = data.room_info;
        if (!room_info.live_status) return { ok: false, error: "未开播" };

        let title = room_info.title;
        let cover = room_info.cover;
        let start_time = room_info.live_start_time;
        let area = {
            id: room_info.area_id,
            name: room_info.area_name,
            parent: {
                id: room_info.parent_area_id,
                name: room_info.parent_area_name
            }
        };

        let anchor_info = data.anchor_info;
        let anchor_name = anchor_info.base_info.uname;
        let level = anchor_info.live_info.level;

        let rankdb_info = data.rankdb_info;
        let rank = rankdb_info.rank_desc;

        let area_rank = data.area_rank_info.areaRank.rank;

        return {
            ok: true,
            room: {
                title,
                cover,
                start_time,
                rank,
                area_rank
            },
            area,
            anchor: {
                anchor_name,
                level
            }
        };
    }

    async getGiftList() {
        let list = await request.get(`https://api.live.bilibili.com/gift/v3/live/room_gift_list?roomid=${this.id}`);
        list = JSON.parse(list);
        if (list.code != 0) return { ok: false, error: list.message };
        return { list: list.data.list, sliver_list: list.data.sliver_list };
    }

    async _setgiftConf() {
        let conf = await request.get(`https://api.live.bilibili.com/gift/v4/Live/giftConfig?roomid=${this.id}`);
        conf = JSON.parse(conf);
        if (conf.code != 0) return require("./gift.json");
        return conf;
    }
    /**
     * @returns {{ok:false,error:String}|{
        port: Number,
        host: String,
        fastest: {
            port: Number,
            host: String,
            ws_port: Number
        },
        second: {
            port: Number,
            host: String,
            ws_port: Number
        },
        token: String
    }}
     */
    async _setDanmuURL() {
        let info = await request.get(`https://api.live.bilibili.com/room/v1/Danmu/getConf?room_id=${this.id}`);
        info = JSON.parse(info);
        if (info.code != 0 && info.msg != "ok") return { ok: false, error: info.message };
        return {
            port: info.data.port,
            host: info.data.host,
            fastest: {
                port: info.data.host_server_list[0].port,
                host: info.data.host_server_list[0].host,
                ws_port: info.data.host_server_list[0].ws_port
            },
            second: {
                port: info.data.host_server_list[1].port,
                host: info.data.host_server_list[1].host,
                ws_port: info.data.host_server_list[1].ws_port
            },
            token: info.data.token
        }
    }

    /**
     * @param {"hello"|"heart"} type
     */
    packet(type) {
        /* 
         * 0000 00[body length + head length(16)] 00[head lenght(16)] 00[protocol type] 00[operation type] 01
         * 
         * protocol type refer: [value/body format/content]
         * 00 JSON   message
         * 01 Int32  body is views
         * 02 Buffer compossed buffer, after decompossed need to parse again as a new packet
         * 
         * operation type refer: [value/sender/body format/type/content]
         * 02 client null  heart_beat              once per 30s
         * 03 server Int32 heart_beat_response     body is views
         * 05 server JSON  boardcasting            danmu and boardcast
         * 07 client JSON  enter (first_handshark) first pack when connect, need id
         * 08 server Int32 enter_response          null
         */
        type = type.toLowerCase();
        let head, body;
        switch (type) {
            case 'hello':
                let data = JSON.stringify({
                    "uid": this._randUid(),
                    "roomid": this.id,
                    "protover": 1,
                    "platform": "web",
                    "clientver": "1.9.3",
                    "type": 2,
                    "key": this.danmu.token
                });
                console.log(data);
                body = Buffer.from(data);
                let length = body.length + 16
                head = Buffer.from([0, 0, 0, length, 0, 16, 0, 1, 0, 0, 0, 7, 0, 0, 0, 1]);
                //console.log(Buffer.concat([head, body]))
                return Buffer.concat([head, body]);
                break;
            case 'heart':
                head = Buffer.from([0, 0, 0, 31, 0, 16, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1]);
                body = Buffer.from("[object Object]");
                return Buffer.concat([head, body]);
                break;
            default:
                return new Error("error type");
                break;
        }
    }
    _randUid() {
        return 1E15 + Math.floor(2E15 * Math.random())
    }
    ping() {
        let date = Date.now();
        while (true) {
            if (Date.now - date == 1000) this.socket.send(this.packet('heart'));
            continue;
        }
    }
    onMessage(data) {
        fs.writeFile('./log', JSON.stringify(Buffer.from(data)) + '\n', { flag: 'a+' }, err => { });
        let operation = data.readInt8(11);
        switch (operation) {
            case 8:
                console.log('加入房间');
                break;
            case 3:
                console.log("人气：" + data.readInt32BE(16));
                break;
            case 2:
                this.socket.send(this.packet('heart'));
                break;
            case 5:
                //let _data = JSON.parse(data.toString('utf-8', 16));
                //console.log(_data);
                break;
            default:
                console.log(data);
                break;
        }
    }
    async connectSocket() {
        'danmu' in this ? true : this._setDanmuURL();
        this.socket = new ws(`wss://broadcastlv.chat.bilibili.com/sub`);
        this.socket.on('open', () => {
            this.socket.send(this.packet('hello'));
            this.socket.send(this.packet('heart'));
        });
        setInterval(() => { this.socket.send(this.packet('heart')) }, 1000);
        this.socket.on('ping', () => {
            this.socket.send(this.packet('heart'));
        });
        this.socket.on('pong', data => {
            fs.writeFile('./log', JSON.stringify(Buffer.from(data)) + '\n', { flag: 'a+' }, err => { });
        });
        this.socket.on('message', data => this.onMessage(data));
    }

}

module.exports = {
    Room
}