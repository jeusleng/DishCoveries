const mysql = require('mysql');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dishcoveries',
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Successfully connected to database.');
});

module.exports = { connection, hashPassword };
