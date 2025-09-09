const express = require('express');
const router = express.Router();

const { createCandidateProfile } = require('../controllers/candidateProfileController');

router.post('/createCandidateProfile', createCandidateProfile);

module.exports = router;