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
  // Fetch all recipes from the database
  const sql = 'SELECT * FROM recipes WHERE status = "approved"';

  pool.query(sql, (err, recipes) => {
    if (err) {
      console.error('Error fetching recipes:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Render the template with the fetched recipes
    res.render('index', { recipes: recipes });
  });
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

        // if (userType === 'contributor') {
        //   res.redirect('/contributorHomepage');
        // } else if (userType === 'viewer') {
        //   res.redirect('/viewerHomepage');
        // } else if (userType === 'admin') {
        //   res.redirect('/adminHomepage');
        // } else {
        //   res.redirect('/');
        // }
        res.redirect('/');
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
    // Fetch recipe status counts
    pool.query('SELECT COUNT(*) AS pendingCount FROM recipes WHERE status = "pending"', (err, pendingResult) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      pool.query('SELECT COUNT(*) AS approvedCount FROM recipes WHERE status = "approved"', (err, approvedResult) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Internal Server Error');
        }

        // Fetch user type counts
        pool.query('SELECT COUNT(*) AS contributorCount FROM users WHERE userType = "contributor"', (err, contributorResult) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
          }

          pool.query('SELECT COUNT(*) AS viewerCount FROM users WHERE userType = "viewer"', (err, viewerResult) => {
            if (err) {
              console.error(err);
              return res.status(500).send('Internal Server Error');
            }

            const pendingCount = pendingResult[0].pendingCount;
            const approvedCount = approvedResult[0].approvedCount;
            const contributorCount = contributorResult[0].contributorCount;
            const viewerCount = viewerResult[0].viewerCount;

            // Render the view with variables
            res.render('adminHomepage', {
              user,
              pendingCount,
              approvedCount,
              contributorCount,
              viewerCount
            });
          });
        });
      });
    });
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
  const user = req.session.user;

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

    res.render('myBrowser', { user, recipes });
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
  const successMessage = req.flash('success');
  const query = 'SELECT * FROM users WHERE id = ?';

  pool.query(query, [user.id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    const userProfile = results[0]; // Assuming there is only one user with the given ID

    res.render('myProfile', { user: userProfile, successMessage });
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


    req.flash('success', 'Profile updated successfully');
    res.redirect('/myProfile');
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
      req.flash('success', 'Recipe has been approved!');
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
    const rejectReason = req.body.rejectReason;
    console.log('Reject Reason:', rejectReason);
    const updateQuery = 'UPDATE recipes SET status = ?, rejectReason = ? WHERE id = ?';

    // Set the status to 'rejected' and include the reject reason
    pool.query(updateQuery, ['rejected', rejectReason, recipeId], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    
      console.log('Update Results:', results); // Log the results to check if the update was successful
    
      req.flash('success', 'Recipe has been rejected.');
      res.redirect('/recipeRequests');
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.searchRecipes = (req, res) => {
  const searchQuery = req.query.query;

  if (!searchQuery) {
    return res.redirect('/myRecipes');
  }

  const query = `
    SELECT recipes.*, users.firstName AS contributorName, users.lastName
    FROM recipes 
    JOIN users ON recipes.userID = users.id
    WHERE recipes.status = 'approved'
      AND (recipes.recipeName LIKE ? OR recipes.cuisine LIKE ? OR recipes.category LIKE ?)
  `;

  const searchParam = `%${searchQuery}%`;

  pool.query(query, [searchParam, searchParam, searchParam], (error, results) => {
    if (error) {
      console.error('Database query error:', error);
      return res.status(500).send('Internal Server Error');
    }

    const recipes = results;

    res.render('myRecipes', { recipes, searchQuery });
  });
};

exports.getMyBookmarks = (req, res) => {
  const user = req.session.user;

  // Query to retrieve bookmarked recipes for the current user
  const query = `
    SELECT recipes.*, users.firstName, users.lastName
    FROM recipes
    JOIN users ON recipes.userID = users.id
    JOIN bookmarks ON recipes.id = bookmarks.recipeID
    WHERE bookmarks.userID = ?
  `;

  pool.query(query, [user.id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
    }

    const recipes = results;

    // Render the page for viewing bookmarked recipes
    res.render('bookmarkedRecipes', { user, recipes });
  });
};

exports.addbookMarkRecipe = (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { recipeName } = req.body;
console.log('Recipe Name:', recipeName);

  const selectQuery = 'SELECT id FROM recipes WHERE recipeName = ?';

  pool.query(selectQuery, [recipeName], (selectError, selectResults) => {

    if (selectError) {
      console.error('Error selecting recipe ID:', selectError);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }

    if (selectResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    const recipeID = selectResults[0].id;

    const userID = user.id;
    const insertQuery = 'INSERT INTO bookmarks (userID, recipeID) VALUES (?, ?)';

    pool.query(insertQuery, [userID, recipeID], (insertError, insertResults) => {
      if (insertError) {
        console.error('Error adding bookmark:', insertError);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }

      res.json({ success: true });
    });
  });
};

exports.addbookMarkRecipe = (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { recipeName } = req.body;
  
  const checkBookmarkQuery = `
    SELECT bookmarks.id
    FROM bookmarks
    JOIN recipes ON bookmarks.recipeID = recipes.id
    WHERE bookmarks.userID = ? AND recipes.recipeName = ?
  `;

  pool.query(checkBookmarkQuery, [user.id, recipeName], (checkError, checkResults) => {
    if (checkError) {
      console.error('Error checking bookmark:', checkError);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({ success: false, error: 'Recipe already bookmarked' });
    }

    const selectQuery = 'SELECT id FROM recipes WHERE recipeName = ?';

    pool.query(selectQuery, [recipeName], (selectError, selectResults) => {
      if (selectError) {
        console.error('Error selecting recipe ID:', selectError);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
      }

      if (selectResults.length === 0) {
        return res.status(404).json({ success: false, error: 'Recipe not found' });
      }

      const recipeID = selectResults[0].id;

      const userID = user.id;
      const insertQuery = 'INSERT INTO bookmarks (userID, recipeID) VALUES (?, ?)';

      pool.query(insertQuery, [userID, recipeID], (insertError, insertResults) => {
        if (insertError) {
          console.error('Error adding bookmark:', insertError);
          return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }

        res.json({ success: true });
      });
    });
  });
};

exports.removeRecipeBookmark = (req, res) => {
  const userID = req.session.userID;

  const { recipeID } = req.body;

  const query = 'DELETE FROM bookmarks WHERE recipeID = ? ';
  pool.query(query, [recipeID, userID], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to remove bookmark from database' });
    } else {
      res.json({ success: true, message: 'Bookmark removed successfully' });
    }
  });
};



