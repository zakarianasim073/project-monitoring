const mongoose = require('mongoose');

const DPRSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    activity: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    laborCount: {
        type: Number,
        required: true
    },
    remarks: {
        type: String,
        required: false
    },
    workDoneQty: {
        type: Number,
        required: true
    },
    linkedBoqId: {
        type: String,
        required: true
    },
    subContractorName: {
        type: String,
        required: false
    },
    materials: {
        type: [String],
        required: false
    },
    projectId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'In Progress', 'Completed']
    }
});

module.exports = mongoose.model('DPR', DPRSchema);