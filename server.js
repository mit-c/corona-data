// npm start to run
// node is weird smh

const http = require('http');
const express = require('express');
const path = require('path');
const app = express();


var data = [{x:[0,1,2], y:[3,2,1], type: 'bar'}];
var layout = {fileopt : "overwrite", filename : "simple-node-example"};


app.use(express.json());
app.use(express.static(__dirname));
// default URL for website
app.use('/', function(req,res){
    res.sendFile(path.join(__dirname+'/user-data/data.html'));

    //__dirname : It will resolve to your project folder.
    console.log(__dirname)
  });
const server = http.createServer(app);
const port = 3000;
server.listen(port);
console.debug('Server listening on port ' + port);