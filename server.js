// Setup empty JS object to act as endpoint for all routes
projectData = {};

// Require Express to run server and routes
const express = require('express');
// Start up an instance of app
const app = express();
/* Middleware*/
const bodyParser = require('body-parser');
//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Cors for cross origin allowance
const cors = require('cors');
app.use(cors());
// Initialize the main project folder
app.use(express.static('website'));


// Setup Server
const port = 5000;
const server = app.listen(port, listening);

//debug
function listening() {
    console.log('Server is running');
    console.log(`The Server is running in port :${port}`)
}
//get route
app.get('/all', sendData);

function sendData(req, res) {
    res.send(projectData);
    projectData = {};
}
// post route
app.post('/add', addData);

function addData(req, res) {
    newEntery = {
        date: req.body.date,
        temp: req.body.temp,
        content: req.body.content
    }
    projectData = newEntery;
}