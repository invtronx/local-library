const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
	first_name: { type: String, required: true, max: 100 },
	family_name: { type: String, required: true, max: 100 },
	date_of_birth: { type: Date },
	date_of_death: { type: Date }
});

// virtual for author's full name
AuthorSchema.virtual('name').get(function() {
	let fullname = '';
	if (this.first_name && this.family_name) {
		fullname = `${this.first_name} ${this.family_name}`;
	}
	else {
		fullname = '';
	}
	return fullname;
});

// virtual for author's URL
AuthorSchema.virtual('url').get(function() {
	return `/catalog/author/${this._id}`;
});

// virtual for date of birth formatted
AuthorSchema.virtual('date_of_birth_formatted').get(function() {
	return this.date_of_birth ? moment(this.date_of_birth).format('MMMM Do, YYYY') : 'unknown';
});

// virtual for date of death formatted
AuthorSchema.virtual('date_of_death_formatted').get(function() {
	return this.date_of_death ? moment(this.date_of_death).format('MMMM Do, YYYY') : 'unknown';
});

// virtual for lifespan
AuthorSchema.virtual('lifespan').get(function() {
	return this.date_of_birth_formatted + ' - ' + this.date_of_death_formatted;
});

// virtual for date of birth form formatted
AuthorSchema.virtual('date_of_birth_ffmt').get(function() {
	return this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD') : '';
});

// virtual for date of death form formatted
AuthorSchema.virtual('date_of_death_ffmt').get(function() {
	return this.date_of_death ? moment(this.date_of_death).format('YYYY-MM-DD') : '';
});

// export model
module.exports = mongoose.model('Author', AuthorSchema);




















