const express = require('express');
const router = express.Router();

const { createCandidateProfile } = require('../controllers/candidateProfile.controller');

router.post('/createCandidateProfile', createCandidateProfile);

module.exports = router;