const mongoose = require('mongoose');
mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises

// Connect to our Database and handle any bad connections
mongoose.connect(process.env.DATABASE);
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`);
});

// READY?! Let's go!


// import all models
require('./models/Recipe');
require('./models/User');
require('./models/Review');


// Start our app!
const app = require('./app');
app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
