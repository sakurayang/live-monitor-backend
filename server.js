const fs = require('fs');
const db = require('./db');

const request = require('request-promise-native');
const koa = require('koa');
const _ = require('koa-route');
const service = require('./service');
const app = new koa();
const cors = require('@koa/cors');

app.use(cors());

app.use(_.get('/', ctx => {
    ctx.status = 200;
    ctx.header = "Content-Type: application/json";
    ctx.body = {
        code: 0,
        msg: 'please input id'
    }
}));
/**
 * @param {Number|String} id
 * @param {Boolean} init
 * @returns {{
        code: 0|1,
        msg: "ok"|"init"|Error,
        result: {
            view:[{
                count: Number,
                update_time: Number,
                time: Number,
                views: Number
            }],
            gift:[{
                count: Number,
                update_time: Number,
                time: Number,
                gift_name: String,
                gift_id: Number,
                gift_count: Number,
                silver: Number,
                gold: Number
            }]
        }
    }}
 */
async function getRoomData(id, init = false) {
    id = String(id);
    let offset;
    try {
        offset = await db.getCount(id) - 1;
    } catch (error) {
        return {
            code: 1,
            msg: String(error)
        };
    }
    let live_time_count = (await db.SELECTALL(id, [`count >= 0`], 1, offset - 1)).result[0].count;
    //console.log(count, counter);
    let view_data = await db.SELECTALL(id, { count: live_time_count });
    //console.log(view_data);
    let gift_data = await db.SELECTALL(id + "_gift", { count: live_time_count });
    return {
        code: 0,
        msg: init ? "init" : "ok",
        result: {
            view: init ? view_data.result : [view_data.result[view_data.count - 1]],
            gift: init ? gift_data.result : [gift_data.result[gift_data.count - 1]]
        }
    }
}
app.use(_.get('/:id', async (ctx, id) => {
    ctx.status = 200;
    ctx.set = ({ "Content-Type": "application/json" });
    ctx.body = await getRoomData(id, 0);
}));
app.use(_.get('/:id/init', async (ctx, id) => {
    ctx.status = 200;
    ctx.set = ({ "Content-Type": "application/json" });
    ctx.body = await getRoomData(id, 1);
}));
app.use(_.get('/:id/living', async (ctx, id) => {
    ctx.status = 200;
    ctx.set = ({ "Content-Type": "text/plain" });
    let info = await request.get(`https://api.live.bilibili.com/room/v1/Room/room_init?id=${id}`);
    info = JSON.parse(info);
    ctx.body = info.data.live_status;
}));
app.use(_.get('/:id/add/', async (ctx, id) => {
    ctx.status = 200;
    ctx.set = ({ "Content-Type": "application/json" });
    let data = await fs.readFileSync('./list.json', { encoding: 'utf-8' });
    data = JSON.parse(data);
    for (const item of data.list) {
        if (item.id == id) {
            ctx.body = "has been added";
            return;
        }
        else continue;
    }
    data.list.push({ id: Number(id), enable: 1 });
    fs.writeFile('./list.json', JSON.stringify(data), { encoding: 'utf-8' }, err => console.log(err));
    service.add(id);
}))

module.exports = { app }