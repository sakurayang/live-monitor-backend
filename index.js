const server = require('./server').app;

server.listen(process.env.PORT || 3000);

const service = require('./service');
service.start();