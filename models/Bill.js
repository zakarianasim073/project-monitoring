'use strict';

const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    billNumber: { type: String, required: true },
    billDate: { type: Date, required: true },
    entityName: { type: String, required: true },
    amount: { type: Number, required: true },
    billType: { type: String, required: true },
    description: { type: String, required: false },
    status: { type: String, required: true },
    projectId: { type: String, required: true },
    items: [{
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
    }],
    attachments: [{ type: String }],
    approvedBy: { type: String, required: false },
    approvalDate: { type: Date, required: false },
});

module.exports = mongoose.model('Bill', billSchema);
