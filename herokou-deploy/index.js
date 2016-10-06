//Badruddin Kamal
var express = require('express');//get expressJs
var app = express();

app.set('port', (process.env.PORT || 5000));//Set port

app.use(express.static('public'));//Public directory


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port')); //Log port
});