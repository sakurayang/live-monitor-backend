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
async function getRoomData(id, init = false) {
    let offset;
    try {
        offset = await db.getCount(id) - 1;
    } catch (error) {
        return {
            code: 1,
            msg: String(error)
        };
    }
    let counter = (await db.SELECTALL(id, [`count >= 0`], 1, offset - 1)).result[0].count;
    //console.log(count, counter);
    let msg = "ok";
    let result;
    if (init) {
        let init_data = await db.SELECTALL(id, { count: counter });
        console.log(init_data);
        msg = "init";
        result = init_data.result
    } else {
        let data = (await db.SELECTALL(id, { count: counter })).result;
        result = data[data.length - 1];
    }
    return {
        code: 0,
        msg,
        result: Array.isArray(result) ? result : [result]
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
    data.list.push({ id, enable: 1 });
    fs.writeFile('./list.json', JSON.stringify(data), { encoding: 'utf-8' }, err => console.log(err));
    service.add(id);
}))

module.exports = { app }