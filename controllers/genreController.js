const mongoose = require('mongoose');
const async = require('async');
const validator = require('express-validator');

const Genre = require('../models/genre');
const Book = require('../models/book');

mongoose.set('useFindAndModify', false);

module.exports = {
	genre_list(req, res) {
		Genre.find()
			.sort([['name', 'ascending']])
			.exec(function(err, list_genres) {
				if (err) { return next(err); }
				res.render('genre_list', {
					title: 'Genre List',
					genre_list: list_genres
				});
			});
	},
	genre_detail(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
		genre: function(callback) {
				Genre.findById(id)
					.exec(callback);
			},
			genre_books: function(callback) {
				Book.find({ 'genre': id })
					.exec(callback);
			}, 
		}, function(err, results) {
				if (err) { return next(err); }
				if (results.genre === null) {
					let err = new Error('Genre Not Found.');
					err.status = 404;
					return next(err);
				}
				res.render('genre_detail', {
					title: 'Genre Detail',
					genre: results.genre,
					genre_books: results.genre_books
				});
		});
	},
	genre_create_get(req, res, next) {
		res.render('genre_form', { title: 'Create Genre' });
	},
	genre_create_post: [
		validator.body('name', 'Genre Name Required')
			.trim()
			.isLength({ min: 1 }),
		validator.body('name').escape(),
		(req, res, next) => {
			const errors = validator.validationResult(req);
			const genre = new Genre({ name: req.body.name });
			if (!errors.isEmpty()) {
				res.render('genre_form', {
					title: 'Create Genre',
					genre: genre,
					errors: errors.array()
				});
				return;
			}
			else {
				Genre.findOne({ 'name': req.body.name })
					.exec(function(err, found_genre) {
						if (err) { return next(err); }
						if (found_genre) {
							res.redirect(found_genre.url);
						}
						else {
							genre.save(function(err) {
								if (err) { return next(err); }
								res.redirect(genre.url);
							});
						}
					});
			}
		}
	],
	genre_delete_get(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			genre: function(callback) {
				Genre.findById(id)
					.exec(callback);
			},
			genre_books: function(callback) {
				Book.find({ 'genre': id })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.genre === null) {
				res.redirect('/catalog/genres');
			}
			res.render('genre_delete', {
				title: 'Delete Genre',
				genre: results.genre,
				genre_books: results.genre_books
			});
		});
	},
	genre_delete_post(req, res, next) {
		async.parallel({
			genre: function(callback) {
				Genre.findById(req.body.genreid)
					.exec(callback);
			},
			genre_books: function(callback) {
				Book.find({ 'author': req.body.genreid })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.genre_books.length > 0) {
				res.render('author_delete', {
					title: 'Delete Genre',
					genre: results.genre,
					genre_books: results.genre_books
				});
				return;
			}
			else {
				Genre.findByIdAndRemove(req.body.genreid, function(err) {
					if (err) { return next(err); }
					res.redirect('/catalog/genres');
				});
			}
		});
	},
	genre_update_get(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			genre: function(callback) {
				Genre.findById(id)
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.genre === null) {
				let err = new Error('Genre Not Found');
				err.status(404);
				return next(err);
			}
			res.render('genre_form', {
				title: 'Update Genre',
				genre: results.genre
			});
		});
	},
	genre_update_post: [
		// validate and sanitize form field
		validator.body('name', 'Specify Genre Name')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		// process request after validation and sanitization
		(req, res, next) => {
			const id = mongoose.Types.ObjectId(req.params.id);
			const errors = validator.validationResult(req);
			const genre = new Genre({
				name: req.body.name,
				_id: id
			});
			if (!errors.isEmpty()) {
				async.parallel({
					genre: function(callback) {
						Genre.findById(id)
							.exec(callback);
					}
				}, function(err, results) {
					if (err) { return next(err); }
					res.render('genre_form', {
						title: 'Update Genre',
						genre: results.genre
					});
				});
				return;
			}
			else {
				Genre.findByIdAndUpdate(id, genre, {}, function(err, gen) {
					if (err) { return next(err); }
					res.redirect(gen.url);
				});
			}
		}
	]
};





















