const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    ConfirmationId: {type: Number},
    amount: {type: Number},
    sender: {type: String},
    body: {type: String},
    username: {type: String},
    errorText: {type: String},
    status: {type: Number},
    timestamp: {type: Number},
});

module.exports = mongoose.model("Message", messageSchema);
