const DB = require('better-sqlite3')(__dirname + "/live.db");

function parseObject(obj) {
    let keys = Object.keys(obj);
    let values = Object.values(obj);
    let transfrom = [];
    let isArray = Array.isArray(obj);

    for (const key in obj) {
        isArray ? transfrom[key] = obj[key] : transfrom.push(`${key}=${obj[key]}`);
    }
    return {
        keys,
        values,
        length: keys.length,
        transfrom,
        string: transfrom.toString().replace(",", " ")
    };
}

/**
 * 
 * @param {String} table 
 * @param {{
    time: Date,
    views: Number,
    gift: Number,
    silver: Number,
    gold: Number
    }} params
 */
async function select(table, params) {
    try {
        let result = await DB.prepare(`SELECT * FROM "${table}" WHERE ${parseObject(params).string}`).get();
        return result;
    } catch (error) {
        throw error
    }

}
async function getCount(table) {
    try {
        let count = await DB.prepare(`SELECT count(*) FROM "${table}"`).get()['count(*)'];
        return count;
    } catch (error) {
        throw error;
    }
}
/**
 * 
 * @param {String} table 
 * @param {Number} limit
 * @param {Number} offset
 */
async function selectAll(table, where, limit = 0, offset = 0) {
    let result = [];
    let count;
    try {
        count = await DB.prepare(`SELECT count(*) FROM "${table}"`).get()['count(*)'];
        limit = limit == 0 ? count : limit;
    } catch (error) {
        throw error;
    }
    //console.log(count);
    //console.log(limit);
    for (let i = 0; i < Math.abs(limit - offset); i++) {
        if (i > count - offset - 1) break;
        console.log(i, parseObject(where).string);
        result.push(await DB.prepare(`SELECT * FROM "${table}" WHERE ${parseObject(where).string} LIMIT 1 OFFSET ${offset + i}`).get());
    }
    return { count, result };
}

/**
 * 
 * @param {String} table 
 * @param {{
    time: Date,
    views: Number,
    gift: Number,
    silver: Number,
    gold: Number
    }} values
 */
async function insert(table, values) {
    //console.log(parseObject(values).keys.toString())
    await DB.prepare(`CREATE TABLE IF NOT EXISTS "${table}" (count int not null,time int not null,views int not null,gift int,silver int,gold int)`).run();
    await DB.prepare(`INSERT INTO "${table}" (${parseObject(values).keys.toString()}) VALUES (${parseObject(values).values.toString()})`).run();
}

/**
 * 
 * @param {String} table 
 * @param {{
    time: Date,
    views: Number,
    gift: Number,
    silver: Number,
    gold: Number
    }} params
 */
function delect(table, params) {
    try {
        DB.prepare(`DELETE FROM "${table}" WHERE ${parseObject(params).string}`).run();
    } catch (error) {
        throw error
    }

}

/**
 * 
 * @param {String} table
 * @param {{
    time: Date,
    views: Number,
    gift: Number,
    silver: Number,
    gold: Number
    }} params
 * @param {{
    time: Date,
    views: Number,
    gift: Number,
    silver: Number,
    gold: Number
    }} values 
 */
function update(table, params, values) {
    try {
        DB.prepare(`UPDATE ${table} SET ${parseObject(values).string} WHERE ${parseObject(params).string}`).run();
    } catch (error) {
        throw error
    }

}


module.exports = {
    SELECT: select,
    INSERT: insert,
    DELETE: delect,
    UPDATE: update,
    SELECTALL: selectAll,
    getCount
}