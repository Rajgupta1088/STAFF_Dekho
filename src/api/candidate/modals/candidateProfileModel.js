// models/Candidate.js
const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
    {
        personalDetails: {
            name: { type: String, required: true },
            email: { type: String, unique: true, sparse: true }, // sparse avoids duplicate null
            dob: { type: Date, required: true },
            gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
            countryCode: { type: String },
            mobile: { type: String, unique: true, sparse: true },
        },
        educationalDetails: {
            education: {
                type: String,
                enum: ["Class X", "Class XII", "Graduation", "Post Graduation", "Doctorate", "Other"],
            },
            institutionName: { type: String },
            degreeName: { type: String },
            subjectSpecialization: { type: String },
            yearOfPassout: { type: String },
        },
        basicDetails: {
            workStatus: { type: String, enum: ["Fresher", "Experienced"] },
            experience: {
                year: { type: String },
                month: { type: String },
            },
            currentLocation: { type: String },
            currentSalary: { type: String },
            availableToJoin: { type: String },
        },
        workExperience: {
            institutionName: { type: String },
            subjectSpecialization: { type: String },
            designation: { type: String },
            joiningDate: { type: Date },
            leavingDate: { type: Date },
            gradesTaught: { type: String },
            jobType: { type: String, enum: ["Full-Time", "Internship"] },
            areYouWorking: { type: String, enum: ["Yes", "No"], default: "No" },
        },
        status: { type: Number, enum: [1, 2, 3], default: 1 }, // 1=Active, 2=Inactive, 3=Deleted
        step: { type: Number, enum: [1, 2, 3, 4, 5] }, // include step 5
        deviceType: { type: Number, enum: [1, 2, 3] }, // 1=Android, 2=iOS, 3=Website
        deviceToken: { type: String, default: "" },
        deviceId: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CandidateProfile", candidateSchema);
