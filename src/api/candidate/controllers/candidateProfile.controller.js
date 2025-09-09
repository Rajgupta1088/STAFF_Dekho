const Candidate = require('../modals/candidateProfile.model');

async function isRequiredField(obj) {
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined || value === null || value === "") {
            return key; // return the missing field
        }
    }
    return true; // all good
}

// Save candidate data step by step
const createCandidateProfile = async (req, res) => {
    try {
        const { step } = req.body;
        let candidate;

        // Step 1: Personal Details (Strict Required)
        if (step === 1) {
            const { name, email, dob, deviceType, deviceToken, deviceId } = req.body;

            const requiredCheck = await isRequiredField({ name, email, dob, deviceType, deviceToken, deviceId });
            if (requiredCheck !== true) {
                return res.status(200).json({
                    success: false,
                    message: `${requiredCheck} is required in Step 1`
                });
            }


            const isCandidate = await Candidate.findOne({ email });
            if (isCandidate) {
                return res.status(400).json({
                    success: false,
                    message: "Candidate with this email already exists"
                });
            }

            candidate = await Candidate.create({
                personalDetails: { name, email, dob },
                deviceType,
                deviceToken,
                deviceId,
                step: 1,
            });
        }

        // Step 2: Educational Details (Optional fields, only candidateId required)
        else if (step === 2) {
            const { candidateId, education, institutionName, educationField, subjectSpecialization, passingYear } = req.body;

            if (!candidateId) {
                return res.status(400).json({
                    success: false,
                    message: "CandidateId is required"
                });
            }

            const updateData = {};
            if (education || institutionName || educationField || subjectSpecialization || passingYear) {
                const requiredCheck = await isRequiredField({ education, institutionName, educationField, subjectSpecialization, passingYear });
                if (requiredCheck !== true) {
                    return res.status(400).json({
                        success: false,
                        message: `${requiredCheck} is required in Step 1`
                    });
                }
                updateData.educationalDetails = {
                    ...(education && { education }),
                    ...(institutionName && { institutionName }),
                    ...(educationField && { educationField }),
                    ...(subjectSpecialization && { subjectSpecialization }),
                    ...(passingYear && { passingYear }),
                };
            }
            updateData.step = 2;

            candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true });
        }

        // Step 3: Basic Details (Optional fields, only candidateId required)
        else if (step === 3) {
            const { candidateId, workStatus, experience, currentLocation, currentSalary, avialableToJoin } = req.body;

            if (!candidateId) {
                return res.status(400).json({
                    success: false,
                    message: "CandidateId is required"
                });
            }

            const updateData = {};
            if (workStatus || experience || currentLocation || currentSalary || avialableToJoin) {
                const requiredCheck = await isRequiredField({ workStatus, experience, currentLocation, currentSalary, avialableToJoin });
                if (requiredCheck !== true) {
                    return res.status(400).json({
                        success: false,
                        message: `${requiredCheck} is required in Step 1`
                    });
                }
                updateData.basicDetails = {
                    ...(workStatus && { workStatus }),
                    ...(experience && { experience }),
                    ...(currentLocation && { currentLocation }),
                    ...(currentSalary && { currentSalary }),
                    ...(avialableToJoin && { avialableToJoin }),
                };
            }
            updateData.step = 3;

            candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true });
        }

        // Step 4: Work Experience (Optional fields, only candidateId required)
        else if (step === 4) {
            const { candidateId, institutionName, subjectSpecialization, role, fromDate, toDate, gradesTaught, jobType, areYouWorking } = req.body;

            if (!candidateId) {
                return res.status(400).json({
                    success: false,
                    message: "CandidateId is required"
                });
            }

            const updateData = {};
            if (institutionName || subjectSpecialization || role || fromDate || toDate || gradesTaught || jobType || areYouWorking !== undefined) {
                const requiredCheck = await isRequiredField({ institutionName, subjectSpecialization, role, fromDate, toDate, gradesTaught, jobType, areYouWorking });
                if (requiredCheck !== true) {
                    return res.status(400).json({
                        success: false,
                        message: `${requiredCheck} is required in Step 1`
                    });
                }
                updateData.workExperience = {
                    ...(institutionName && { institutionName }),
                    ...(subjectSpecialization && { subjectSpecialization }),
                    ...(role && { role }),
                    duration: {
                        ...(fromDate && { fromDate }),
                        ...(toDate && { toDate }),
                    },
                    ...(gradesTaught && { gradesTaught }),
                    ...(jobType && { jobType }),
                    ...(areYouWorking !== undefined && { areYouWorking }),
                };
            }
            updateData.step = 4;

            candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true });
        }

        res.status(200).json({
            success: true,
            message: `Step ${step} data saved successfully`,
            data: candidate,
        });

    } catch (error) {
        console.error('Error saving candidate step:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong',
            error: error.message,
        });
    }
};

module.exports = { createCandidateProfile };
