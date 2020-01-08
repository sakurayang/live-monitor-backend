const { Room } = require('./live');

const list = require("./list.json").list;
let enable_list = {};
const start = () => {
    for (const room of list) {
        if (room.enable) {
            add(room.id);
        } else {
            console.log(`${room.id} not enable...skip`);
            continue;
        }
    }
}
const add = (id) => {
    if (id in enable_list) {
        return {
            code: 1,
            msg: "id already in list"
        }
    }
    let socket = new Room(id);
    enable_list[id] = socket;
    console.log(`${id} has been add`);
}
module.exports = {
    enable_list,
    start,
    add
}