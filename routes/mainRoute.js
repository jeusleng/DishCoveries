const express = require('express');
const router = express.Router();
const controller = require('../controllers/mainController'); 
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({ storage: storage });

const islogin = (req, res, next) => {
    if(!req.session.user){
      res.redirect("/");
    }
    else{
      next();
    }
  }

router.get("/logout", (req, res)=>{
    req.session.destroy();
    res.redirect("/");
});


router.get('/', controller.getHome);
router.post('/register', controller.registerUser);
router.post('/login', controller.loginUser);
router.get('/viewerHomepage',  islogin, controller.viewerHomepage);
router.get('/contributorHomepage',  islogin, controller.contributorHomepage);
router.get('/adminHomepage', islogin, controller.adminHomepage);

router.get('/addRecipePage', islogin, controller.getAddRecipe);
router.post('/createRecipe', islogin, upload.single('recipeImage'), controller.createRecipe); 

router.get('/myRecipes', islogin, controller.getMyRecipes);

router.get('/recipeRequests', islogin, controller.getRecipeRequests);
router.get('/userManagement', islogin, controller.userManagement);
router.get('/myProfile', islogin, controller.getMyProfile); 
router.post('/updateProfile',islogin, controller.updateProfile);
router.post('/updateUserStatus', islogin, controller.updateStatus);
router.get('/myBrowser',islogin, controller.browseRecipes);

module.exports = router;
