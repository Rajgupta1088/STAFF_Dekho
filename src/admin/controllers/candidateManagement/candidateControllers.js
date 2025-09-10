const Candidate = require('../../../api/candidate/modals/candidateProfileModel');

const candidateUser = (req, res) => {
  res.render('pages/candidateManagement/candidate');
}

const getCandidateList = async (req, res) => {
  try {
    const { start, length, search, order } = req.body;
    const searchValue = search?.value || "";
    let query = {};
    let sort = {};

    // Custom search params (coming from frontend inputs)
    const nameSearch = req.body.name;
    const emailSearch = req.body.email;
    const genderSearch = req.body.gender;
    const educationSearch = req.body.education;
    const workStatusSearch = req.body.work_status;

    // 🔍 Global search (DataTables search box)
    if (searchValue) {
      query.$or = [
        { "personalDetails.name": new RegExp(searchValue, "i") },
        { "personalDetails.email": new RegExp(searchValue, "i") },
        { "personalDetails.gender": new RegExp(searchValue, "i") },
        { "educationalDetails.education": new RegExp(searchValue, "i") },
        { "basicDetails.workStatus": new RegExp(searchValue, "i") }
      ];
    } else {
      // 🔍 Individual field search
      if (nameSearch) query["personalDetails.name"] = new RegExp(nameSearch, "i");
      if (emailSearch) query["personalDetails.email"] = new RegExp(emailSearch, "i");
      if (genderSearch) query["personalDetails.gender"] = genderSearch;
      if (educationSearch) query["educationalDetails.education"] = educationSearch;
      if (workStatusSearch) query["basicDetails.workStatus"] = workStatusSearch;
    }

    // 📌 Sorting
    if (order && order.length > 0) {
      const columnIndex = order[0].column;
      const sortDirection = order[0].dir === "asc" ? 1 : -1;

      switch (parseInt(columnIndex)) {
        case 1: // Name
          sort["personalDetails.name"] = sortDirection;
          break;
        case 2: // Email
          sort["personalDetails.email"] = sortDirection;
          break;
        case 3: // Gender
          sort["personalDetails.gender"] = sortDirection;
          break;
        case 4: // Education
          sort["educationalDetails.education"] = sortDirection;
          break;
        case 5: // Work Status
          sort["basicDetails.workStatus"] = sortDirection;
          break;
        default:
          sort.createdAt = -1;
          break;
      }
    } else {
      sort.createdAt = -1;
    }
    query.status = { $ne: 3 }; // Exclude deleted candidates

    // 📊 Fetch candidates with pagination
    const candidates = await Candidate.find(query)
      .skip(Number(start))
      .limit(Number(length))
      .sort(sort);

    const totalRecords = await Candidate.countDocuments();
    const filteredRecords = await Candidate.countDocuments(query);

    res.json({
      draw: req.body.draw,
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data: candidates
    });
  } catch (err) {
    console.error("Error fetching candidates:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const getCandidateById = async (req, res) => {
  try {
    const candidateId = req.params.id;
    if (!candidateId) {
      return res.status(400).json({ success: false, message: "candidateId parameter is required" });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    res.json({
      success: true,
      candidate,
    });
  } catch (err) {
    console.error("Error Fetching candidate:", err);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};


const deleteCandidate = async (req, res) => {
  console.log('params', req.params);
  try {
    const candidateId = req.params.id;
    console.log('candidateId', candidateId);
    if (!candidateId) {
      return res.status(400).json({ success: false, message: "candidateIds parameter is required" });
    }
    const isCandidate = await Candidate.findOne({ _id: candidateId });
    if (!isCandidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }
    if (isCandidate.status === 3) {
      return res.status(400).json({ success: false, message: "Candidate already deleted" });
    }
    await Candidate.updateOne({ _id: candidateId }, { status: 3 });
    res.status(200).json({ success: true, message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("Error deleting candidates:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const updateCandidateStatus = async (req, res) => {
  try {
    const candidateId = req.params.id;
    const { status } = req.body;
    if (!candidateId || !status) {
      return res.status(400).json({ success: false, message: "candidateIds parameter is required" });
    }

    const isCandidate = await Candidate.findOne({ _id: candidateId });
    if (!isCandidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    await Candidate.updateOne({ _id: candidateId }, { status: status });
    res.status(200).json({ success: true, message: "Candidate deleted successfully" });

  } catch (err) {
    console.error("Error deleting candidates:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

module.exports = {
  candidateUser,
  getCandidateList,
  getCandidateById,
  deleteCandidate,
  updateCandidateStatus
}