const Movie = require('./models/Movie');
const movie = new Movie({"title": "Inception", "year": 2010, "director": "Christopher Nolan", "rating": 8.8, "actors": ["Leonardo DiCaprio","Joseph Gordon-Levitt", "Elliot Page","Tom Hardy"]});
await movie.save();
await Movie.create(movie);
await Movie.insertMany([]);
