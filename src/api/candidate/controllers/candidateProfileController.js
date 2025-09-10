// controllers/candidateController.js
const multiparty = require("multiparty");
const jwt = require("jsonwebtoken");
const Candidate = require("../modals/candidateProfileModel");

const secretKey = process.env.JWT_SECRET || "yoursecret";

// Save candidate data step by step
const createCandidateProfile = async (req, res) => {
  const form = new multiparty.Form();
  form.maxFilesSize = 10 * 1024 * 1024;

  form.parse(req, async (err, fields) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ success: false, message: "Failed to parse form data." });
    }

    const getField = (field) => fields[field]?.[0] || "";
    const step = parseInt(getField("step"), 10);
    const candidateId = req.header("candidateid");
    const isEmailLogin = parseInt(getField("isEmailLogin"), 10);

    let update = {};
    let candidate = null;

    try {
      // Candidate existence check for step > 1
      if (step > 1) {
        if (!candidateId) {
          return res.status(200).json({ success: false, message: "candidateId is required for next step" });
        }
        candidate = await Candidate.findById(candidateId);
        if (!candidate) {
          return res.status(200).json({ success: false, message: "Candidate not found." });
        }

        if (step > candidate.step + 1) {
          return res.status(400).json({ success: false, message: `Please complete step ${candidate.step + 1} first.` });
        }
      }

      switch (step) {
        case 1: {


          const email = getField("email");
          const mobile = getField("mobile");

          if (email) {
            const existingEmail = await Candidate.findOne({ "personalDetails.email": email });
            if (existingEmail) {
              return res.status(200).json({ success: false, message: "Email already registered" });
            }
          }

          if (mobile) {
            const existingMobile = await Candidate.findOne({ "personalDetails.mobile": mobile });
            if (existingMobile) {
              return res.status(200).json({ success: false, message: "Mobile already registered" });
            }
          }

          const requiredFields =
            isEmailLogin === 0
              ? ["name", "dob", "gender", "countryCode", "mobile"]
              : ["name", "email", "dob", "gender"];

          for (const field of requiredFields) {
            if (!getField(field)) {
              return res.status(200).json({ success: false, message: `${field} is required.` });
            }
          }


          update.personalDetails = {
            name: getField("name"),
            email,
            dob: new Date(getField("dob")),
            gender: getField("gender"),
            countryCode: getField("countryCode"),
            mobile,
          };

          update.status = 1;
          update.step = 1;
          update.deviceType = req.header("devicetype");
          update.deviceToken = req.header("devicetoken");
          update.deviceId = req.header("deviceid");

          candidate = new Candidate(update);
          await candidate.save();

          const token = jwt.sign(
            { candidateId: candidate._id, mobile: candidate.personalDetails?.mobile },
            secretKey,
            { expiresIn: "30d" }
          );
          candidate = candidate.toObject();
          candidate.token = token;

          return res.status(201).json({
            success: true,
            message: "Step 1 completed",
            data: { ...candidate, candidateId: candidate._id },
          });
        }

        case 2: {
          if (!getField("education")) {
            return res.status(200).json({ success: false, message: "education is required." });
          }
          update.educationalDetails = {
            education: getField("education"),
            institutionName: getField("institutionName"),
            degreeName: getField("degreeName"),
            subjectSpecialization: getField("subjectSpecialization"),
            yearOfPassout: getField("yearOfPassout"),
          };
          if (candidate.step < 2) update.step = 2;
          break;
        }

        case 3: {
          if (!getField("workStatus")) {
            return res.status(200).json({ success: false, message: "workStatus is required." });
          }
          update.basicDetails = {
            workStatus: getField("workStatus"),
            experience: {
              year: getField("experienceYear"),
              month: getField("experienceMonth"),
            },
            currentLocation: getField("currentLocation"),
            currentSalary: getField("currentSalary"),
            availableToJoin: getField("availableToJoin"),
          };
          if (candidate.step < 3) update.step = 3;
          break;
        }

        case 4: {
          const requiredFields = [
            "institutionName",
            "subjectSpecialization",
            "designation",
            "joiningDate",
            "leavingDate",
            "gradesTaught",
            "jobType",
            "areYouWorking",
          ];
          for (const field of requiredFields) {
            if (!getField(field)) {
              return res.status(200).json({ success: false, message: `${field} is required.` });
            }
          }
          update.workExperience = {
            institutionName: getField("institutionName"),
            subjectSpecialization: getField("subjectSpecialization"),
            designation: getField("designation"),
            gradesTaught: getField("gradesTaught"),
            jobType: getField("jobType"),
            areYouWorking: getField("areYouWorking"),
            joiningDate: new Date(getField("joiningDate")),
            leavingDate: new Date(getField("leavingDate")),
          };
          if (candidate.step < 4) update.step = 4;
          break;
        }

        default:
          return res.status(200).json({ success: false, message: "Invalid step value." });
      }

      if (step > 1) {
        candidate = await Candidate.findByIdAndUpdate(candidateId, { $set: update }, { new: true }).lean();

        return res.status(200).json({
          success: true,
          message: `Step ${step} completed`,
          data: { ...candidate, candidateId: candidate._id },
        });
      }
    } catch (error) {
      console.error("Error in createCandidateProfile:", error);
      return res.status(500).json({ success: false, message: "Internal server error", details: error.message });
    }
  });
};



module.exports = { 
  createCandidateProfile
};
