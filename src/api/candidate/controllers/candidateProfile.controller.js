const Candidate = require('../modals/candidateProfile.model');

// Utility: Check required fields
function checkRequiredFields(fields, step) {
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null || value === "") {
            return `${key} is required in Step ${step}`;
        }
    }
    return null; // all good
}

// Save candidate data step by step
const createCandidateProfile = async (req, res) => {
    try {
        const { step } = req.body;
        if (!step) {
            return res.status(400).json({ success: false, message: "Step is required" });
        }

        let candidate;
        const { candidateId } = req.body;

        switch (step) {
            // Step 1: Personal Details (Strict Required)
            case 1: {
                const { name, email, dob, deviceType, deviceToken, deviceId } = req.body;
                const error = checkRequiredFields({ name, email, dob, deviceType, deviceToken, deviceId }, step);
                if (error) return res.status(400).json({ success: false, message: error });

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
                break;
            }

            // Step 2: Educational Details
            case 2: {
                if (!candidateId) {
                    return res.status(400).json({ success: false, message: "CandidateId is required" });
                }

                const { education, institutionName, educationField, subjectSpecialization, passingYear } = req.body;
                const updateData = { step: 2 };

                if (education || institutionName || educationField || subjectSpecialization || passingYear) {
                    const error = checkRequiredFields({ education, institutionName, educationField, subjectSpecialization, passingYear }, step);
                    if (error) return res.status(400).json({ success: false, message: error });

                    updateData.educationalDetails = { education, institutionName, educationField, subjectSpecialization, passingYear };
                }

                candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true });
                break;
            }

            // Step 3: Basic Details
            case 3: {
                if (!candidateId) {
                    return res.status(400).json({ success: false, message: "CandidateId is required" });
                }

                const { workStatus, experience, currentLocation, currentSalary, avialableToJoin } = req.body;
                const updateData = { step: 3 };

                if (workStatus || experience || currentLocation || currentSalary || avialableToJoin) {
                    const error = checkRequiredFields({ workStatus, experience, currentLocation, currentSalary, avialableToJoin }, step);
                    if (error) return res.status(400).json({ success: false, message: error });

                    updateData.basicDetails = { workStatus, experience, currentLocation, currentSalary, avialableToJoin };
                }

                candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true });
                break;
            }

            // Step 4: Work Experience
            case 4: {
                if (!candidateId) {
                    return res.status(400).json({ success: false, message: "CandidateId is required" });
                }

                const { institutionName, subjectSpecialization, role, fromDate, toDate, gradesTaught, jobType, areYouWorking } = req.body;
                const updateData = { step: 4 };

                if (institutionName || subjectSpecialization || role || fromDate || toDate || gradesTaught || jobType || areYouWorking !== undefined) {
                    const error = checkRequiredFields({ institutionName, subjectSpecialization, role, fromDate, toDate, gradesTaught, jobType, areYouWorking }, step);
                    if (error) return res.status(400).json({ success: false, message: error });

                    updateData.workExperience = {
                        institutionName,
                        subjectSpecialization,
                        role,
                        duration: { fromDate, toDate },
                        gradesTaught,
                        jobType,
                        areYouWorking,
                    };
                }

                candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true });
                break;
            }

            default:
                return res.status(400).json({ success: false, message: "Invalid step number" });
        }

        return res.status(200).json({
            success: true,
            message: `Step ${step} data saved successfully`,
            data: candidate,
        });

    } catch (error) {
        console.error("Error saving candidate step:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message,
        });
    }
};

module.exports = { createCandidateProfile };
