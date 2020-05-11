const mongoose = require('mongoose');
const validator = require('express-validator');
const async = require('async');

const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');

module.exports = {
	bookinstance_list(req, res) {
		BookInstance.find()
			.populate('book')
			.exec(function(err, list_bookinstances) {
				if (err) { return next(err); }
				res.render('bookinstance_list', {
					title: 'Book Instance List',
					bookinstance_list: list_bookinstances
				});
			});
	},
	bookinstance_detail(req, res) {
		const id = mongoose.Types.ObjectId(req.params.id);
		BookInstance.findById(id)
			.populate('book')
			.exec(function(err, bookinstance) {
				if (err) { return next(err); }
				if (bookinstance === null) {
					let err = new Error('Book Copy Not Found');
					err.status = 404;
					return next(err);
				}
				res.render('bookinstance_detail', {
					title: 'Copy: ' + bookinstance.book.title,
					bookinstance: bookinstance
				});
			});
	},
	bookinstance_create_get(req, res, next) {
		Book.find({}, 'title')
			.exec(function(err, books) {
				if (err) { return next(err); }
				res.render('bookinstance_form', {
					title: 'Create Book Instance',
					book_list: books
				});
			});
	},
	bookinstance_create_post: [
		// validate and sanitize form fields
		validator.body('book')
			.trim()
			.isLength({ min: 1 }).withMessage('Specify Book')
			.escape(),
		validator.body('imprint')
			.trim()
			.isLength({ min: 1 }).withMessage('Specify Imprint')
			.escape(),
		validator.body('due_back')
			.optional({ checkFalsy: true })
			.isISO8601()
			.toDate(),
		validator.body('status')
			.trim()
			.escape(),
		// process request after passing validation and sanitization
		(req, res, next) => {
			const errors = validator.validationResult(req);
			const bookinstance = new BookInstance({
				book: req.body.book,
				imprint: req.body.imprint,
				status: req.body.status,
				due_back: req.body.due_back
			});
			
			if (!errors.isEmpty()) {
				Book.find({}, 'title')
					.exec(function(err, books) {
						if (err) { return next(err); }
						res.render('bookinstance_form', {
							title: 'Create Book Instance',
							book_list: books,
							selected_book: bookinstance.book._id,
							errors: errors.array(),
							bookinstance: bookinstance
						});
					});
				return;
			}
			else {
				// Data is valid => save and redirect
				bookinstance.save(function(err) {
					if (err) { return next(err); }
					res.redirect(bookinstance.url);
				});
			}
		}
	],
	bookinstance_delete_get(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			bookinstance: function(callback) {
				BookInstance.findById(id)
					.populate('book')
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.bookinstance === null) {
				res.redirect('/catalog/bookinstances');
			}
			res.render('bookinstance_delete', {
				title: 'Delete Book Instance',
				bookinstance: results.bookinstance
			});
		});
	},
	bookinstance_delete_post(req, res) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			bookinstance: function(callback) {
				BookInstance.findById(id)
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			BookInstance.findByIdAndRemove(id, function(err) {
				if (err) { return next(err); }
				res.redirect('/catalog/bookinstances');
			});
		});
	},
	bookinstance_update_get(req, res, next) {
		const id = mongoose.Types.ObjectId(req.params.id);
		async.parallel({
			bookinstance: function(callback) {
				BookInstance.findById(id)
					.populate('book')
					.exec(callback);
			}, 
			book_list: function(callback) {
				Book.find({})
					.exec(callback);
			}
		}, function(err, results) {
			if (err) { return next(err); }
			if (results.bookinstance === null) {
				let error = new Error('Book Instance Not Found');
				error.status = 404;
				return next(error);
			}
			res.render('bookinstance_form', {
				title: 'Update Book Instance',
				book_list: results.book_list,
				bookinstance: results.bookinstance
			});
		});
	},
	bookinstance_update_post: [
		// validate and sanitize neccessary fields
		validator.body('imprint', 'Specify Imprint')
			.trim()
			.isLength({ min: 1})
			.escape(),
		(req, res, next) => {
			const id = mongoose.Types.ObjectId(req.params.id);
			const errors = validator.validationResult(req);
			const bookinstance = new BookInstance({
				book: req.body.book,
				imprint: req.body.imprint,
				status: req.body.status,
				due_back: req.body.due_back, 
				_id: id
			});
			if (!errors.isEmpty()) {
				async.parallel({
					bookinstance: function(callback) {
						BookInstance.findById(id)
							.populate('book')
							.exec(callback);
					}, 
					book_list: function(callback) {
						Book.find({})
							.exec(callback);
					}
				}, function(err, results) {
					if (err) { return next(err); }
					if (results.bookinstance === null) {
						let error = new Error('Book Instance Not Found');
						error.status = 404;
						return next(error);
					}
					res.render('bookinstance_form', {
						title: 'Update Book Instance',
						book_list: results.book_list,
						bookinstance: results.bookinstance
					});
				});
				return;
			}
			else {
				BookInstance.findByIdAndUpdate(id, bookinstance, {}, function(err, insBook) {
					if (err) { return next(err); }
					res.redirect(insBook.url);
				});
			}
		}
	]
};

























