const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
    amount: {type: Number},
    sender: {type: String},
    body: {type: String},
    username: {type: String},
    errorText: {type: String},
    location: {type: String},
    timestamp: {type: Number},
});

module.exports = mongoose.model("ErrorLog", errorLogSchema);
