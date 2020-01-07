const Jobs = require("node-schedule").scheduledJobs;

/**
 * 
 * @param {Number} id 
 * @param {String} type 
 * @param {String} mode 
 */
async function checkID(DB, id, type = "video", mode = "add") {
    try {
        checkType(type);
    } catch (error) {
        return new Error(error);
    }
    mode = mode.toLowerCase();
    if (!id || !(/[0-9]/.test(id))) {
        //if id not defind or id is not number
        return new Error(`Error params with id=${id}`);
    } else if ((mode == "add" || mode == "show") && id in Jobs) {
        //if mode is add or show
        //then check job is in schedule or not
        //if in then return error
        if (!(await DB.SELECT(type, id))) {
            //check is job in database
            return new Error(`Job<${id}> is in schedule but not in database, please restart`);
        }
        return new Error(`Job<${id}> has been create`);
    } else if ((mode == "update" || mode == "remove") && !(id in Jobs)) {
        //if mode is update or remove
        //then check job is in schedule or not
        //if not then return error
        if (await DB.SELECT(type, id)) {
            //check job is not in database
            return new Error(`Job<${id}> is not in schedule but in database, please restart`);
        }
        return new Error(`Job<${id}> haven't been create`);
    }
    return true;
}

/**
 *  
 * @param {String} time 
 */
function checkTime(time) {
    if (typeof(time) != "string" || !(/\*\/*[0-9]* \* \*\/*[0-9]* \* \*/ig).test(time)) {
        return new Error(`Error params with time=${time}`);
    }
    return true;

}

/**
 * 
 * @param {String} type 
 */
function checkType(type) {
    type = type.toLowerCase();
    if (typeof(type) != "string" || !(/video|rank/.test("rank"))) {
        return new Error(`Error params with type=${type}`);
    }
    return true;
}

module.exports = {
    id: checkID,
    time: checkTime,
    type: checkType
}