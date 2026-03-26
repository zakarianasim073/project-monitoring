const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    contractValue: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Planning', 'In Progress', 'Completed', 'On Hold'],
        default: 'Planning'
    },
    location: {
        type: String,
        required: true
    },
    manager: {
        type: String,
        required: true
    },
    client: {
        type: String,
        required: true
    },
    contractor: {
        type: String,
        required: true
    },
    milestones: [{
        milestone: String,
        dueDate: Date,
        status: String
    }],
    boq: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BOQ'
    },
    dpr: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DPR'
    },
    bills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    }],
    liabilities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Liability'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);