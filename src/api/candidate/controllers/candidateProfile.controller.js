const Candidate = require('../modals/candidateProfile.model');


// Save candidate data step by step
const createCandidateProfile = async (req, res) => {
  try {
    const { step } = req.body; // step will come from frontend (1, 2, 3, 4)
    let candidate;

    // Step 1: Personal Details
    if (step === 1) {
      candidate = await Candidate.create({
        personalDetails: {
          name: req.body.name,
          email: req.body.email,
          dob: req.body.dob,
        },
        step: 1,
      });
    }

    // Step 2: Educational Details
    else if (step === 2) {
      candidate = await Candidate.findByIdAndUpdate(
        req.body.candidateId, // pass candidateId from frontend
        {
          educationalDetails: req.body.educationalDetails,
          step: 2,
        },
        { new: true }
      );
    }

    // Step 3: Basic Details
    else if (step === 3) {
      candidate = await Candidate.findByIdAndUpdate(
        req.body.candidateId,
        {
          basicDetails: {
            workStatus: req.body.workStatus,
          },
          step: 3,
        },
        { new: true }
      );
    }

    // Step 4: Work Experience
    else if (step === 4) {
      candidate = await Candidate.findByIdAndUpdate(
        req.body.candidateId,
        {
          workExperience: {
            institutionName: req.body.institutionName,
            subjectSpecialization: req.body.subjectSpecialization,
            role: req.body.role,
            duration: {
              fromDate: req.body.fromDate,
              toDate: req.body.toDate,
            },
            gradesTaught: req.body.gradesTaught,
            jobType: req.body.jobType,
            areYouWorking: req.body.areYouWorking,
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