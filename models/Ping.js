const mongoose = require("mongoose");

const pingSchema = new mongoose.Schema({
    timestamp: {type: Number},
});

module.exports = mongoose.model("Ping", pingSchema);
