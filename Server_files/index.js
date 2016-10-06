//Badruddin Kamal
var express = require('express');//get expressJs
var app = express();

app.set('port', (process.env.PORT || 5000));//Set port

//Route to Public directory
app.use('/',express.static('public'));
app.use('/upload',express.static('public'));
app.use('/history',express.static('public'));
app.use('/*',express.static('public'));


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port')); //Log port
});