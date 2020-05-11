const async = require('async');
const mongoose = require('mongoose');
const validator = require('express-validator');

const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

mongoose.set('useFindAndModify', false);

module.exports = {
	index(req, res) {
		async.parallel({
			book_count: function(callback) {
				Book.countDocuments({}, callback);
			},
			book_instance_count: function(callback) {
				BookInstance.countDocuments({}, callback);
			},
			book_instance_available_count: function(callback) {
				BookInstance.countDocuments({status: 'Available'}, callback);
			}, 
			author_count: function(callback) {
				Author.countDocuments({}, callback);
			},
			genre_count: function(callback) {
				Genre.countDocuments({}, callback);
			}
		}, function(err, results) {
			res.render('index', { 
				title: 'Local Library Home',
				error: err,
				data: results
			});
		});
	},
	book_list(req, res, next) {
		Book.find({}, 'title author')
			.populate('author')
			.exec(function(err, list_books) {
				if (err) { return next(err); }
				res.render('book_list', {
					title: 'Book List',
					book_list: list_books
				});
			});
	},
	book_detail(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			book: function(callback) {
				Book.findById(id)
					.populate('author')
					.populate('genre')
					.exec(callback);
			},
			book_instance: function(callback) {
				BookInstance.find({ 'book': id })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.book === null) {
				let err = new Error('Book Not Found');
				err.status = 404;
				return next(err);
			}
			res.render('book_detail', {
				title: results.book.title,
				book: results.book,
				book_instances: results.book_instance
			});
		});
	},
	book_create_get(req, res) {
		async.parallel({
			authors: function(callback) {
				Author.find(callback);
			},
			genres: function(callback) {
				Genre.find(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			res.render('book_form', {
				title: 'Create Book',
				authors: results.authors,
				genres: results.genres
			});
		});
	},
	book_create_post: [
		// convert Genre field into an array
		(req, res, next) => {
			if (!(req.body.genre instanceof Array)) {
				if (typeof req.body.genre === 'undefined') 
					req.body.genre = [];
				else
					req.body.genre = new Array(req.body.genre);
			}
			next();
		},
		// validate and sanitize form fields
		validator.body('title', 'Specify Book Title')
			.trim()
			.isLength({ min: 1 }),
		validator.body('author', 'Specify Author Name')
			.trim()
			.isLength({ min: 1 }),
		validator.body('summary', 'Specify Book Summary')
			.trim()
			.isLength({ min: 1 }),
		validator.body('isbn', 'Specify Book ISBN')
			.trim()
			.isLength({ min: 1 }),
		validator.body('*').escape(),
		// process request after passing sanitization and validation
		(req, res, next) => {
			const errors = validator.validationResult(req);
			const book = new Book({
				title: req.body.title,
				summary: req.body.summary,
				author: req.body.author,
				isbn: req.body.isbn,
				genre: req.body.genre
			});
			if (!errors.isEmpty()) {
				// fetch authors and forms for re-rendering on error
				async.parallel({
					authors: function(callback) {
						Author.find(callback);
					},
					genres: function(callback) {
						Genre.find(callback);
					}
				}, function(err, results) {
					if (err) { return next(err); }
					// Mark selected genres as checked previously
					for (let i = 0; i < results.genres.length; i++) {
						if (book.genres.indexOf(results.genres[i]._id) > -1) {
							results.genres[i].checked = 'true';
						}
					}
					res.render('book_form', {
						title: 'Create Book',
						authors: results.authors,
						genres: results.genres,
						book: book,
						errors: errors.array()
					});
			});
		}
			else {
				// form data is hereby valid, so save book
				book.save(function(err) {
					if (err) { return next(err); }
					res.redirect(book.url);
				});
			}
		}
	],
	book_delete_get(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			book: function(callback) {
				Book.findById(id)
					.populate('author')
					.exec(callback);
			}, 
			bookinstances: function(callback) {
				BookInstance.find({ 'book': id })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.book === null) {
				res.redirect('/catalog/books');
			}
			res.render('book_delete', {
				title: 'Delete Book',
				book: results.book,
				bookinstances: results.bookinstances
			});
		});
	},
	book_delete_post(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			book: function(callback) {
				Book.findById(id)
					.populate('author')
					.exec(callback);
			},
			bookinstances: function(callback) {
				BookInstance.find({ 'book': id })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.bookinstances.length > 0) {
				res.render('book_delete', {
					title: 'Delete Book',
					book: results.book,
					bookinstances: results.bookinstances
				});
				return;
			}
			else {
				Book.findByIdAndRemove(id, function(err) {
					if (err) { return next(err); }
					res.redirect('/catalog/books');
				});
			}
		});
	},
	book_update_get(req, res, next) {
		async.parallel({
			book: function(callback) {
				Book.findById(req.params.id)
					.populate('author')
					.populate('genre')
					.exec(callback);
			},
			authors: function(callback) {
				Author.find(callback);
			},
			genres: function(callback) {
				Genre.find(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			// handle case where there are no books with specified url id
			if (results.book === null) {
				let err = new Error('Book Not Found');
				err.status = 404;
				return next(err);
			}
			// marking previously selected genres as checked
			for (let allG = 0; allG < results.genres.length; allG++) {
				for (let bG = 0; bG < results.book.genre.length; bG++) {
					if (results.genres[allG]._id.toString() === results.book.genre[bG]._id.toString()) {
						results.genres[allG].checked = 'true';
					}
				}
			}
			res.render('book_form', {
				title: 'Update Book',
				authors: results.authors,
				genres: results.genres,
				book: results.book
			});
		});
	},
	book_update_post: [
		// convert Genre field into an array
		(req, res, next) => {
			if (!(req.body.genre instanceof Array)) {
				if (typeof req.body.genre === 'undefined') 
					req.body.genre = [];
				else
					req.body.genre = new Array(req.body.genre);
			}
			next();
		},
		// validate and sanitize form fields
		validator.body('title', 'Specify Book Title')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		validator.body('author', 'Specify Author Name')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		validator.body('summary', 'Specify Book Summary')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		validator.body('isbn', 'Specify Book ISBN')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		validator.body('genre.*').escape(),
		// process request after passing sanitization and validation
		(req, res, next) => {
			// extract validation errors from request
			const errors = validator.validationResult(req);
			// create new book with sanitized data and the old id
			const book = new Book({
				title: req.body.title,
				summary: req.body.summary,
				author: req.body.author,
				isbn: req.body.isbn,
				genre: req.body.genre,
				_id: req.params.id 
			});
			if (!errors.isEmpty()) {
				// fetch authors and forms for re-rendering on error
				async.parallel({
					authors: function(callback) {
						Author.find(callback);
					},
					genres: function(callback) {
						Genre.find(callback);
					}
				}, function(err, results) {
					if (err) { return next(err); }
					// Mark selected genres as checked previously
					for (let i = 0; i < results.genres.length; i++) {
						if (book.genres.indexOf(results.genres[i]._id) > -1) {
							results.genres[i].checked = 'true';
						}
					}
					res.render('book_form', {
						title: 'Update Book',
						authors: results.authors,
						genres: results.genres,
						book: book,
						errors: errors.array()
					});
				});
			}
			else {
				// form data is hereby valid, so update book
				Book.findByIdAndUpdate(req.params.id, book, {},
					function(err, theBook) {
						if (err) { return next(err); }
						res.redirect(theBook.url);
					}
				);
			}
		}
	]
};




















