const mysql = require('mysql');
const bcrypt = require('bcrypt');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dishcoveries',
  connectionLimit: 10,
});

exports.getHome = (req, res) => {
  res.render('index');
};


exports.registerUser = async (req, res) => {
  const { firstName, lastName, gender, bdate, address, userType, password, email, specialty } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Updated query to include the 'status' column with a default value of 'Active'
    const query = 'INSERT INTO users (firstName, lastName, gender, bdate, address, userType, password, email, specialty, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "Active")';
    
    pool.query(query, [firstName, lastName, gender, bdate, address, userType, hashedPassword, email, specialty], (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect('/register');
      }

      const queryUser = 'SELECT * FROM users WHERE email = ?';
      pool.query(queryUser, [email], (errorUser, resultsUser) => {
        if (errorUser) {
          console.error(errorUser);
          return res.redirect('/register');
        }

        const user = resultsUser[0];

        req.session.user = user;

        if (userType === 'contributor') {
          res.redirect('/contributorHomepage');
        } else if (userType === 'viewer') {
          res.redirect('/viewerHomepage');
        } else if (userType === 'admin') {
          res.redirect('/adminHomepage');
        } else {
          res.redirect('/');
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.redirect('/register');
  }
};


exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ?';
  pool.query(query, [email], async (error, results) => {
    if (error) {
      console.error(error);
      return res.redirect('/');
    }

    if (results.length > 0) {
      const user = results[0];

      // Check if the user is active
      if (user.status === 'Active') {
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
          req.session.user = user;

          if (user.userType === 'contributor') {
            res.redirect('/contributorHomepage');
          } else if (user.userType === 'viewer') {
            res.redirect('/viewerHomepage');
          } else if (user.userType === 'admin') {
            res.redirect('/adminHomepage');
          } else {
            res.redirect('/');
          }
        } else {
          res.redirect('/');
        }
      } else {
        // User is inactive, display a flash message and redirect
        req.flash('error', 'Your account is inactive. Please contact support.');
        res.redirect('/');
      }
    } else {
      res.redirect('/');
    }
  });
};



exports.viewerHomepage = (req, res) => {
  const userType = req.session.user ? req.session.user.userType : null;
  const user = req.session.user;

  if (user && user.userType === 'viewer') {
    res.render('viewerHomepage', { user });
  } else {
    res.redirect('/');
  }
};


exports.contributorHomepage = (req, res) => {
  const userType = req.session.user ? req.session.user.userType : null;
  const user = req.session.user;

  if (user && user.userType === 'contributor') {
    res.render('contributorHomepage', { user });
  } else {
    res.redirect('/');
  }

};

exports.adminHomepage = (req, res) => {
  const userType = req.session.user ? req.session.user.userType : null;
  const user = req.session.user;

  if (user && user.userType === 'admin') {
    res.render('adminHomepage', { user });
  } else {
    res.redirect('/');
  }
};

exports.getAddRecipe = (req, res) => {
  const user = req.session.user;

  if (user && user.userType === 'contributor') {
    res.render('addRecipePage', { user });
  } else {
    res.redirect('/');
  }
}

exports.createRecipe = (req, res) => {
  const user = req.session.user;

  if (user && user.userType === 'contributor') {
    const { recipeName, cuisine, recipeDescription, ingredients, instructions, prepTime, cookTime, servings, difficulty, category } = req.body;

    const ingredientsString = ingredients.join(', ');
    const instructionsString = instructions.join(', ');

    const recipeImage = req.file ? req.file.filename : null;

    const query = 'INSERT INTO recipes (recipeName, cuisine, recipeDescription, ingredients, instructions, prepTime, cookTime, servings, difficulty, category, recipeImage, status, userID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", ?)';

    pool.query(
      query,
      [recipeName, cuisine, recipeDescription, ingredientsString, instructionsString, prepTime, cookTime, servings, difficulty, category, recipeImage, user.id], // Assuming user ID is stored in the session
      (error, results) => {
        if (error) {
          console.error(error);
          return res.redirect('/addRecipePage');
        }

        res.redirect('/myRecipes');
      }
    );
  } else {
    res.redirect('/');
  }
};





exports.getRecipeRequests = (req, res) => {
  const user = req.session.user;
  const query = 'SELECT recipes.*, users.firstName, users.lastName FROM recipes JOIN users ON recipes.userID = users.id';

  pool.query(query, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    const recipes = results;

    res.render('recipeRequests', { user, recipes, successMessages: req.flash('success') });
  });
};




exports.userManagement = (req, res) => {

  const user = req.session.user;
  const query = 'SELECT * FROM users';

  pool.query(query, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    const users = results.filter(user => user.userType !== 'admin');


    res.render('userManagement', { user, users, successMessages: req.flash('success') });
  });
};

exports.getMyRecipes = (req, res) => {
  const user = req.session.user;

  // Check if the user is logged in
  if (!user) {
    return res.redirect('/');
  }

  // Query to retrieve recipes created by the logged-in user
  const query = 'SELECT * FROM recipes WHERE userID = ?';

  pool.query(query, [user.id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    const recipes = results;

    res.render('myRecipes', { user, recipes });
  });
};
exports.browseRecipes = (req, res) => {
  const query = `
    SELECT recipes.*, users.firstName AS contributorName, users.lastName
    FROM recipes 
    JOIN users ON recipes.userID = users.id
    WHERE recipes.status = 'approved'
  `;

  pool.query(query, [], (error, results) => {
    if (error) {
      console.error('Database query error:', error);
      return res.status(500).send('Internal Server Error');
    }

    const recipes = results;

    res.render('myBrowser', { recipes });
  });
};
exports.updateStatus = (req, res) => {
  const id = req.body.id;
  const status = req.body.status;

  // Update the user status in the database
  const query = `UPDATE users SET status = ? WHERE id = ?`;

  pool.query(query, [status, id], (error, results) => {
    if (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      req.flash('success', 'User Status Updated Successfully');
      res.redirect('/userManagement');
    }
  });
};

exports.getMyProfile = (req, res) => {
  const user = req.session.user;

  // Check if the user is logged in
  if (!user) {
    return res.redirect('/');
  }

  // Query to retrieve user details
  const query = 'SELECT * FROM users WHERE id = ?';

  pool.query(query, [user.id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    const userProfile = results[0]; // Assuming there is only one user with the given ID

    res.render('myProfile', { user: userProfile });
  });
};
exports.updateProfile = (req, res) => {
  const user = req.session.user;

  // Check if the user is logged in
  if (!user) {
    return res.redirect('/');
  }

  const updatedProfile = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    gender: req.body.gender,
    email: req.body.email,
    address: req.body.address,
    specialty: req.body.specialty,
  };

  const userId = user.id;
  const updateQuery = 'UPDATE users SET ? WHERE id = ?';

  pool.query(updateQuery, [updatedProfile, userId], (error, result) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

  
    res.json({ user: updatedProfile });
  });
};
exports.approveRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const updateQuery = 'UPDATE recipes SET status = ? WHERE id = ?';

    // Set the status to 'approved'
    pool.query(updateQuery, ['approved', recipeId], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // res.status(200).json({ message: 'Recipe approved successfully' });
      req.flash('success', 'Recipe has been Approved!');
      res.redirect('/recipeRequests');
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.rejectRecipe = async (req, res) => {
  try {
    const recipeId = req.params.id;
    const updateQuery = 'UPDATE recipes SET status = ? WHERE id = ?';

    // Set the status to 'rejected'
    pool.query(updateQuery, ['rejected', recipeId], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      req.flash('success', 'Recipe has been Rejected!');
      res.redirect('/recipeRequests');
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// exports.updateProfile = (req, res)=>{
//   let firstName = req.body.firstName
//   let lastName = req.body.lastName
//   let gender = req.body.gender
//   let email = req.body.email
//   let  address = req.body.address
//   let  specialty = req.body.specialty

//   sql = "UPDATE `users` SET `firstName`='?',`lastName`='?',`gender`='?',`address`='?',`specialty`='?' WHERE id = ?"
//   pool.query(sql, [firstName, lastName, gender, email, address, specialty, id], (err,result)=>{

//   })
// }

