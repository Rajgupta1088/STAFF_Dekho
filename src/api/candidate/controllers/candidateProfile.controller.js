const Candidate = require('../modals/candidateProfile.model');


// Save candidate data step by step
const createCandidateProfile = async (req, res) => {
    try {
        const { step } = req.body; // step will come from frontend (1, 2, 3, 4)
        let candidate;

        // Step 1: Personal Details
        if (step === 1) {
            const [name, email, dob, deviceType, deviceToken, deviceId] = req.body;
            if (name === undefined || email === undefined || dob === undefined || deviceType === undefined || deviceToken === undefined || deviceId === undefined) {
                return res.status(200).json({
                    success: false,
                    message: "Please provide all required fields"
                });
            }
            candidate = await Candidate.create({
                personalDetails: {
                    name,
                    email,
                    dob,
                },
                deviceType,
                deviceToken,
                deviceId,
                step: 1,
            });
        }

        // Step 2: Educational Details
        else if (step === 2) {
            const { educationalDetails, candidateId } = req.body;
            if (!educationalDetails || !candidateId) {
                return res.status(200).json({
                    success: false,
                    message: "Please provide all required fields"
                });
            }
            candidate = await Candidate.findByIdAndUpdate(
                candidateId, // pass candidateId from frontend
                {
                    educationalDetails,
                    step: 2,
                },
                { new: true }
            );
        }

        // Step 3: Basic Details
        else if (step === 3) {
            const { workStatus, candidateId } = req.body;
            if (!workStatus || !candidateId) {
                return res.status(200).json({
                    success: false,
                    message: "Please provide all required fields"
                });
            }
            candidate = await Candidate.findByIdAndUpdate(
                candidateId,
                {
                    basicDetails: {
                        workStatus,
                    },
                    step: 3,
                },
                { new: true }
            );
        }

        // Step 4: Work Experience
        else if (step === 4) {
            const { institutionName, subjectSpecialization, role, fromDate, toDate, gradesTaught, jobType, areYouWorking, candidateId } = req.body;
            if (!institutionName || !subjectSpecialization || !role || !fromDate || !toDate || !gradesTaught || !jobType || areYouWorking === undefined || !candidateId) {
                return res.status(200).json({
                    success: false,
                    message: "Please provide all required fields"
                });
            } 
            candidate = await Candidate.findByIdAndUpdate(
                candidateId,
                {
                    workExperience: {
                        institutionName,
                        subjectSpecialization,
                        role,
                        duration: {
                            fromDate,
                            toDate,
                        },
                        gradesTaught,
                        jobType,
                        areYouWorking,
                    },
                    step: 4,
                },
                { new: true }
            );
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



module.exports = {
    createCandidateProfile
}