const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
    {
        personalDetails: {
            name: {
                type: String,
                required: true,
            },
            email: {
                type: String,
                required: true,
                unique: true,
            },
            dob: {
                type: Date,
                required: true,
            }
        },
        educationalDetails: {
            education:{
                type: String,
                enum: ['Class X', 'Class XII', 'Graduation', 'Post Graduation', 'Doctorate', 'Other'],
            },
            institutionName:{
                type: String
            },
            educationField : {
                type: String
            },
            subjectSpecialization : {
                type: String
            },
            passingYear : {
                type: Date
            }
        },
        basicDetails: {
            workStatus: {
                type: String,
                enum: ['Fresher', 'Experienced'],
            },
            experience:{
                year:{type:Date},
                month:{type:Date}
            },
            currentLocation:{
                type: String
            },
            currentSalary:{
                type: Number
            },
            avialableToJoin:{
                type: String,
                enum:['Immediately', 'In 15 days', 'In 1 month', 'In 2 months', 'In 3 months']
            }
        },
        workExperience: {
            institutionName: {
                type: String,
            },
            subjectSpecialization: {
                type: String,
            },
            role: {
                type: String,
            },
            duration: {
                fromDate: {
                    type: Date,
                },
                toDate: {
                    type: Date,
                }
            },
            gradesTaught: {
                type: String
            },
            jobType: {
                type: String,
                enum: ['Full-Time', 'Internship']
            },
            areYouWorking: {
                type: Boolean,
                default: false
            }
        },
        status: { 
            type: Number, 
            enum: [1, 2, 3],  // 1 = Active, 2 = Inactive , 3 => Delete
            default: 1 
        },
        isOnline: { 
            type: Number, 
            enum: [0, 1],  // 1 = Online, 2 = Offline
            default: 0 
        },
        step: { 
            type: Number, 
            enum: [1, 2, 3, 4] // 1 = Screen 1, 2 = Screen 2 , 3 => Screen 3, 4 => Screen 4
        }, 
        deviceType: {
            type: Number, enum: [1, 2, 3] // 1 = Android, 2 = Ios , 3 => Website
        },
        deviceToken: {
            type: String,
            default: ''
        },
        deviceId: {
            type: String,
            default: ''
        },
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model('Candidate', candidateSchema);