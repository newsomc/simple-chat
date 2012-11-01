Handlebars.registerHelper('name', function(displayName, me, author) {
	if(me === author) return 'me';
	return displayName;
});

Handlebars.registerHelper('ifnotme', function(me, author, options){
	if(me._id !== author){
		return options.fn(this);
	};
});

Handlebars.registerHelper('ifisme', function(me, author, options){
	if(me._id === author){
		return options.fn(this);
	};
});