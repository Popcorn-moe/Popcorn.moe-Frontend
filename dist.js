const express = require('express');

const app = express();

app.use(express.static(__dirname + '/dist2'));

app.listen(3001, () => console.log('Listenning on 3001'));
