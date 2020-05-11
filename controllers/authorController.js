const mongoose = require('mongoose');
const async = require('async');
const validator = require('express-validator');

const Author = require('../models/author');
const Book = require('../models/book');

mongoose.set('useFindAndModify', false);

module.exports = {
	author_list(req, res) {
		Author.find()
			.sort([['family_name', 'ascending']])
			.exec(function(err, list_authors) {
				if (err) { return next(err); }
				res.render('author_list', {
					title: 'Author List',
					author_list: list_authors
				});
			});
	},
	author_detail(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			author: function(callback) {
				Author.findById(id)
					.exec(callback);
			},
			author_books: function(callback) {
				Book.find({ 'author': id }, 'title summary')
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.author === null) {
				let err = new Error('Author Not Found');
				err.status = 404;
				return next(err);
			}
			res.render('author_detail', {
				title: 'Author Detail',
				author: results.author,
				author_books: results.author_books
			});
		});
	},
	author_create_get(req, res) {
		res.render('author_form', { title: 'Create Author' });
	},
	author_create_post: [
		// Validation and Sanitization of Form fields
		validator.body('first_name')
			.isLength({ min: 1 })
			.trim().withMessage('First Name Must Be Specified')
			.isAlphanumeric().withMessage('First Name has non-alphanumeric characters')
			.escape(),
		validator.body('family_name')
			.isLength({ min: 1 })
			.trim().withMessage('Family Name Must Be Specified')
			.isAlphanumeric().withMessage('Family Name has non-alphanumeric characters')
			.escape(),
		validator.body('date_of_birth')
			.optional({ checkFalsy: true })
			.isISO8601().withMessage('Invalid Date Of Birth')
			.toDate(),
		validator.body('date_of_death')
			.optional({ checkFalsy: true })
			.isISO8601().withMessage('Invalid Date Of Death')
			.toDate(),
		// process request after passing validation and sanitization
		(req, res, next) => {
			const errors = validator.validationResult(req);
			if (!errors.isEmpty()) {
				res.render('author_form', { 
					title: 'Create Author',
					author: req.body,
					errors: errors.array()
				});
				return;
			}
			else {
				const author = new Author({
					first_name: req.body.first_name,
					family_name: req.body.family_name,
					date_of_birth: req.body.date_of_birth,
					date_of_death: req.body.date_of_death
				});
				author.save(function(err) {
					if (err) { return next(err); }
					res.redirect(author.url);
				});
			}
		}
	],
	author_delete_get(req, res, next) {
		async.parallel({
			author: function(callback) {
				Author.findById(req.params.id)
					.exec(callback);
			},
			author_books: function(callback) {
				Book.find({ 'author': req.params.id })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.author === null) {
				// author doesn't exist so redirect to list of authors
				res.redirect('/catalog/authors');
			}
			res.render('author_delete', { 
				title: 'Delete Author',
				author: results.author,
				author_books: results.author_books
			});
		});
	},
	author_delete_post(req, res, next) {
		async.parallel({
			author: function(callback) {
				Author.findById(req.body.authorid)
					.exec(callback);
			},
			author_books: function(callback) {
				Book.find({ 'author': req.body.authorid })
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			// re-render when author has books linked
			if (results.author_books.length > 0) {
				res.render('author_delete', {
					title: 'Delete Author',
					author: results.author,
					author_books: results.author_books
				});
				return;
			}
			else {
				// author currently has no books, so proceed to delete
				Author.findByIdAndRemove(req.body.authorid, function(err) {
					if (err) { return next(err); }
					res.redirect('/catalog/authors');
				});
			}
		});
	},
	author_update_get(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			author: function(callback) {
				Author.findById(id)
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.author === null) {
				let err = new Error('Author Not Found');
				err.status = 404;
				return next(err);
			}
			res.render('author_form', {
				title: 'Update Author',
				author: results.author
			});
		});
	},
	author_update_post: [
		// validate and sanitize form fields
		validator.body('first_name')
			.isLength({ min: 1 })
			.trim().withMessage('First Name Must Be Specified')
			.isAlphanumeric().withMessage('First Name has non-alphanumeric characters').escape(),
		validator.body('family_name')
			.isLength({ min: 1 })
			.trim().withMessage('Family Name Must Be Specified')
			.isAlphanumeric().withMessage('Family Name has non-alphanumeric characters').escape(),
		validator.body('date_of_birth')
			.optional({ checkFalsy: true })
			.isISO8601().withMessage('Invalid Date Of Birth')
			.toDate(),
		validator.body('date_of_death')
			.optional({ checkFalsy: true })
			.isISO8601().withMessage('Invalid Date Of Death')
			.toDate(),
		(req, res, next) => {
			const id = mongoose.Types.ObjectId(req.params.id);
			const errors = validator.validationResult(req);
			const author = new Author({
				first_name: req.body.first_name,
				family_name: req.body.family_name,
				date_of_birth: req.body.date_of_birth,
				date_of_death: req.body.date_of_death,
				_id: id
			});
			if (!errors.isEmpty()) {
				async.parallel({
					author: function(callback) {
						Author.findById(id)
							.exec(callback);
					}
				}, function(err, results) {
					if (err) { return next(err); }
					if (results.author === null) {
						let err = new Error('Author Not Found');
						err.status = 404;
						return next(err);
					}
					res.render('author_form', {
						title: 'Update Author',
						author: results.author
					});
				});
				return;
			}
			else {
				Author.findByIdAndUpdate(id, author, {}, function(err, aut) {
					if (err) { return next(err); }
					res.redirect(aut.url);
				});
			}
		}
	]
};






















