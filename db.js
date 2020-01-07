const DB = require('better-sqlite3')(__dirname + "./schedule.db");
const check = require("./checkParams");
/**
 * 
 * @param {String} table 
 * @param {Number|String} id 
 */
async function select(table, id) {
    if (!table || !id ||
        !(/[0-9]/.test(id)) ||
        typeof (table) != "string")
        throw new Error("Error Paramas");
    let result = await DB.prepare(`SELECT * FROM ${table} WHERE id=${id}`).get();
    return result;
}

/**
 * 
 * @param {String} table 
 * @param {Number} limit
 * @param {Number} offset
 */
async function selectAll(table, limit = 0, offset = 0) {
    if (!table ||
        typeof (table) != "string")
        throw new Error("Error Paramas");
    let result = [];
    let count = await DB.prepare(`SELECT count(*) FROM ${table}`).get()['count(*)'];
    //console.log(count);
    limit = limit == 0 ? count : limit;
    for (let i = 0; i < Math.abs(limit - offset); i++) {
        if (i > count - offset - 1) break;
        result.push(await DB.prepare(`SELECT * FROM ${table} LIMIT 1 OFFSET ${offset + i}`).get());
    }
    return result;
}

/**
 * 
 * @param {String} table 
 * @param {JSON} value
 * @param {Number} value.id
 * @param {String} value.time 
 */
function insert(table, value) {
    if (!table || !value ||
        !(/[0-9]/ig.test(value.id)) ||
        !(/\*\/*[0-9]* \* \*\/*[0-9]* \* \*/ig).test(value.time) ||
        typeof (table) != "string")
        throw new Error("Error Paramas");
    DB.prepare(`INSERT INTO ${table} VALUES ("${value.id}","${value.time}")`).run();
}

/**
 * 
 * @param {String} table 
 * @param {Number|String} id 
 */
function delect(table, id) {
    if (!table || !id ||
        !(/[0-9]/.test(id)) ||
        typeof (table) != "string")
        throw new Error("Error Paramas");
    DB.prepare(`DELETE FROM ${table} WHERE id=${id}`).run();
}

/**
 * 
 * @param {String} table 
 * @param {Number|String} id 
 * @param {JSON} value
 * @param {Number} value.id
 * @param {String} value.time 
 */
function update(table, id, value) {
    if (!table || !value || !id ||
        !(/[0-9]/ig.test(id)) ||
        !(/\*\/*[0-9]* \* \*\/*[0-9]* \* \*/ig).test(value.time) ||
        typeof (table) != "string")
        throw new Error("Error Paramas");
    DB.prepare(`UPDATE ${table} SET time="${value.time}" WHERE id=${id}`).run();
}


module.exports = {
    SELECT: select,
    INSERT: insert,
    DELETE: delect,
    UPDATE: update,
    SELECTALL: selectAll
}