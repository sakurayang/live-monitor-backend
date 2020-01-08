const fs = require('fs');
const db = require('./db');

const koa = require('koa');
const _ = require('koa-route');
const service = require('./service');
const app = new koa();

app.use(_.get('/', ctx => {
    ctx.status = 200;
    ctx.header = "Content-Type: application/json";
    ctx.body = {
        code: 0,
        msg: 'please input id'
    }
}));

app.use(_.get('/:id', async (ctx, id) => {
    ctx.status = 200;
    ctx.header = { "Content-Type": "application/json" };
    let count;
    try {
        count = await db.getCount(id);
    } catch (error) {
        ctx.body = {
            code: 1,
            msg: String(error)
        }
        return error;
    }
    let counter = (await db.SELECTALL(id, [`count >= 0`], 1, count - 1)).count;
    if (ctx.query.init) {
        let init_data = await db.SELECTALL(id, { count: counter });
        console.log(init_data);
        ctx.body = {
            code: 0,
            msg: "init",
            result: init_data.result
        }
    }
    let data = await db.SELECTALL(id, { count: counter }, 1, count - 1);
    ctx.body = {
        code: 0,
        msg: "ok",
        result: data.result
    }
}));

app.use(_.get('/add/:id', async (ctx, id) => {
    ctx.status = 200;
    ctx.header = { "Content-Type": "application/json" };
    let data = await fs.readFileSync('./list.json', { encoding: 'utf-8' });
    data = JSON.parse(data);
    data.list.push({ id, enable: 1 });
    fs.writeFile('./list.json', JSON.stringify(data), { encoding: 'utf-8' }, err => console.log(err));
    service.add(id);
}))

module.exports = { app }