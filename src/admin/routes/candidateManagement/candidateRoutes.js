const express = require('express');
const router = express.Router();


const {candidateUser, getCandidateList, deleteCandidate, updateCandidateStatus} = require('../../controllers/candidateManagement/candidateControllers');

router.get('/candidatesManagement', candidateUser);
router.post('/getCandidate', getCandidateList);
router.patch('/deleteCandidate/:id', deleteCandidate);
router.patch('/updateCandidateStatus/:id', updateCandidateStatus);

module.exports = router;
