var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');
const { body,validationResult } = require('express-validator');
const { sanitizeBody } = require('express-validator');
const validator = require('express-validator');
var async = require('async');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {

    BookInstance.find()
      .populate('book')
      .exec(function (err, list_bookinstances) {
        if (err) { return next(err); }
        // Successful, so render
        res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
      });
}  

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {

    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Book copy not found');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_detail', { title: 'Copy: '+bookinstance.book.title, bookinstance:  bookinstance});
    })

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {       

    Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books});
    });
    
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    // Validate fields.
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                   // Successful - redirect to new record.
                   res.redirect(bookinstance.url);
                });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = (req, res, next) => {
	BookInstance.findById(req.params.id)
				.populate('book')
				.exec((err, bookinstance) => {
		if(err)
			return next(err);

		if(bookinstance == null)
			res.redirect('/catalog/bookinstances');

		/* Success */
		res.render('bookinstance_delete', { title: 'Delete BookInstance',
											bookinstance: bookinstance });
	});
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = (req, res, next) => {
	BookInstance.findByIdAndRemove(req.body.bookinstanceid, (err) => {
		if(err)
			return next(err);

		/* Success */
		res.redirect('/catalog/bookinstances');
	});
};

/* Display BookInstance update form on GET */
exports.bookinstance_update_get = (req, res, next) => {
	/* Get BookInstance and Books for form */
	async.parallel({
		book: (callback) => {
			Book.find({}, 'title').exec(callback);
		},
		bookinstance: (callback) => {
			BookInstance.findById(req.params.id).populate('book').exec(callback);
		}
	}, (err, results) => {
		if(err)
			return next(err);

		if(results.bookinstance == null){
			let err = new Error('BookInstance not found');
			err.status = 404;
			return next(err);
		}

		/* Success */
		res.render('bookinstance_form', { title: 'Update BookInstance',
										  book_list: results.book,
										  bookinstance: results.bookinstance });
	});
};

/* Handle BookInstance update on POST */
exports.bookinstance_update_post = [
	/* Validate and Sanitize (escape) fields */
	validator.body('book', 'Book must be specified').trim().isLength({ min: 1 }),
	validator.body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
	validator.body('status').trim().escape(),
	validator.body('due_back', 'Invalid date')
			 .optional({ checkFalsy: true })
			 .isISO8601()
			 .toDate(),
	/* Process request after validation */
	(req, res, next) => {
		/* Extract the validation errors from a request */
		const errors = validationResult(req);
		/* Create BookInstance with escaped and trimmed data */
		let bookinstance = new BookInstance({
			book: req.body.book,
			imprint: req.body.imprint,
			status: req.body.status,
			due_back: req.body.due_back,
			_id: req.params.id /* Required or a new ID will be assigned! */
		});

		if(!errors.isEmpty()){
			/* There are errors. Render form again with sanitized
			 * values/errors messages. */
			async.parallel({
				book: (callback) => {
					Book.find({}, 'title').exec(callback);
				},
				bookinstance: (callback) => {
					BookInstance.findById(req.params.id).populate('book').exec(callback);
				}
			}, (err, results) => {
				if(err)
					return next(err);

				/* Success */
				res.render('bookinstance_form', { title: 'Update BookInstance',
												  book_list: results.book,
												  bookinstance: results.bookinstance });
			});
			return;
		}else{
			/* Data is valid */
			BookInstance.findByIdAndUpdate(req.params.id,
										   bookinstance,
										   {},
										   (err, theBookInstance) => {
				if(err)
					return next(err);

				/* Success */
				res.redirect(theBookInstance.url);
			});
		}
	}
];