const express = require('express');
const router = express.Router();


const {candidateUser, getCandidateList} = require('../../controllers/candidateManagement/candidateControllers');

router.get('/candidatesManagement', candidateUser);
router.post('/getCandidate', getCandidateList);


module.exports = router;
