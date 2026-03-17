const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "15122004",
    database: "sport_booking"
});

db.connect(err => {
    if (err) {
        console.log("DB Error:", err);
    } else {
        console.log("MySQL Connected");
    }
});

module.exports = db;