const mongoose = require('mongoose');

const boqItemSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    unit: {
        type: String,
        enum: ['CUM', 'SQM', 'NOS', 'KG', 'RMT', 'CFT', 'LTR', 'TON'],
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    plannedQty: {
        type: Number,
        required: true
    },
    executedQty: {
        type: Number,
        default: 0
    },
    plannedUnitCost: {
        type: Number,
        required: true
    },
    plannedBreakdown: {
        type: Object,
        required: true
    },
    actualUnitCost: {
        type: Number,
        required: true
    },
    actualBreakdown: {
        type: Object,
        required: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('BOQItem', boqItemSchema);