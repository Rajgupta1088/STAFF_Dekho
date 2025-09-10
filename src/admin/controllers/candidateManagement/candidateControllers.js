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

module.exports = {
    candidateUser,
    getCandidateList
}