const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
    SELECT *
    FROM users
    WHERE email = $1
    `, [email.toLowerCase()])
    .then(result => result.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`
    SELECT *
    FROM users
    WHERE id = $1
    `, [id])
    .then(result => result.rows[0])
    .catch((err) => {
      console.log(err.message);
  });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {

  const valName = user.name;
  const valEmail = user.email;
  const valPassword = user.password;

  const values = [ valName, valEmail, valPassword ];
  
  return pool
    .query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *
    `, values)
    .then(result => result.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
    SELECT reservations.*, properties.*, AVG(rating) AS average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id 
    WHERE reservations.guest_id = $1 AND end_date < now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY start_date DESC
    LIMIT $2
    `, [guest_id, limit])
    .then(result => result.rows)
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {

  let queryParams = [];

  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
      if (queryParams.length >= 2) {
        queryString += `AND owner_id = $${queryParams.length} `;
    } else {
        queryString += `WHERE owner_id = $${queryParams.length} `;
    }
  }

  // minimum price per night is multiplied by 100 to convert for database
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
      if (queryParams.length >= 2) {
        queryString += `AND cost_per_night >= $${queryParams.length} `;
      } else {
        queryString += `WHERE cost_per_night >= $${queryParams.length} `;
    }
  }

  // maximum price per night is multiplied by 100 to convert for database
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
      if (queryParams.length >= 2) {
        queryString += `AND cost_per_night <= $${queryParams.length} `;
      } else {
        queryString += `WHERE cost_per_night <= $${queryParams.length} `;
    }
  }

  queryString += `GROUP BY properties.id `

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating)
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams)
    .then(result => result.rows)
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  let queryParams = [];

  for (let key in property) {
    if (key === "cost_per_night") {
      const costPerNightConversion = Number(property[key]) * 100;
      const costPerNightInString = String(costPerNightConversion);
      
      queryParams.push(costPerNightInString);
    } else {
      queryParams.push(property[key]);
    }
  }

  return pool
    .query(`
    INSERT INTO properties (title, description, number_of_bedrooms, number_of_bathrooms, parking_spaces, cost_per_night, thumbnail_photo_url, cover_photo_url, street, country, city, province, post_code, owner_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
    `, queryParams)
    .then(result => result.rows)
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addProperty = addProperty;
