const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require("express-flash");
const routes = require('./routes/mainRoute');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: "abc",
  resave: false,
  saveUninitialized: true
}));

app.use(flash());
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
