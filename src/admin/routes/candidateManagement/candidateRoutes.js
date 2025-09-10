const express = require('express');
const router = express.Router();


const {candidateUser, getCandidateList, deleteCandidate} = require('../../controllers/candidateManagement/candidateControllers');

router.get('/candidatesManagement', candidateUser);
router.post('/getCandidate', getCandidateList);
router.patch('/deleteCandidate/:id', deleteCandidate);

module.exports = router;
