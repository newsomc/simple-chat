(function(){
	'use strict';

	/* ChatBox */

	var ChatBox = function(socket, user, count, me, render_cb){
		this.active = new Date().getTime();
		this.socket = socket;
		this.user = user;
		this.count = count-1;
		this.has_focus = false;
		this.is_focusing = false;
		this.is_focusing_timer = 20;
		this.me = me;
		this.keep_notifying = false;
		this.title_change_timer = 1000;
		this.last_active = new Date();
		this.initialize();
		this.notification_message = '';
		this.cb = render_cb;
	};

	ChatBox.prototype.set_notification = function(data){
		this.notification_message = String(data.displayName + ' says ' + data.message).slice(0,30);
	};

	ChatBox.prototype.render_message = function(data){
		this.$messages.append( Handlebars.templates.message({
			displayName: data.displayName,
			message: data.message
		}) );
		this.set_notification({
			displayName: data.displayName,
			message: data.message
		});
		this.scroll_to_bottom();

		if(!this.has_focus){
			this.keep_notifying = true;
			this.notify();
		}
	};

	ChatBox.prototype.notify = function(){
		if(this.keep_notifying){
			this.$el.addClass('notify');
			setTimeout($.proxy(function(){
				document.title = this.notification_message;

				setTimeout($.proxy(function(){
					document.title = 'Chat';
					this.notify();
				}, this), this.title_change_timer);


			}, this), this.title_change_timer);
		}
	};

	ChatBox.prototype.unnotify = function(){
		this.$el.removeClass('notify');
		this.keep_notifying = false;
	};

	ChatBox.prototype.submit = function(e){
		e.preventDefault();
		//
		var $textarea = this.$el.find('textarea');
		var message = $textarea.val();
		this.render_message({
			displayName: 'me',
			message: message
		});
		this.socket.emit('message', {
			message: message,
			from: this.me._id,
			fromDisplayName: this.me.displayName,
			to: this.user,
			chat: this.chat
		});
		this.scroll_to_bottom();
		$textarea.val('');
	};

	ChatBox.prototype.is_active = function(){
		this.active = new Date().getTime();
	};

	ChatBox.prototype.keypress = function(e){
		this.is_active();
		if(e.which === 13 && !e.shiftKey){
			this.submit(e);
		}
		if(e.which === 27){
			$(document).trigger('close-chat-box', { user: this.user });
		}
	};

	ChatBox.prototype.close = function(){
		this.$el.off();
		this.$el.remove();
	};

	ChatBox.prototype.focus = function(){
		if(!this.is_focusing){
			this.is_active();
			this.unnotify();
			this.has_focus = true;
			this.is_focusing = true;

			setTimeout($.proxy(function(){

				this.is_focusing = false;

			}, this), this.is_focusing_timer);
		}
	};

	ChatBox.prototype.blur = function(){
		this.has_focus = false;
	};

	ChatBox.prototype.listeners = function(){
		this.$el.on('submit', 'form', $.proxy(this.submit, this));
		this.$el.on('keydown', $.proxy(this.keypress, this));
		this.$el.on('focus click', 'form', $.proxy(this.focus, this));
		this.$el.on('blur', 'form', $.proxy(this.blur, this));
	};

	ChatBox.prototype.scroll_to_bottom = function(){
		this.$messages_div.scrollTop(this.$messages_div[0].scrollHeight);
	};

	ChatBox.prototype.shift = function(count){
		this.count = count;
		this.$el.css('right', (this.count*300)+10);
	};

	ChatBox.prototype.render = function(data){
		this.chat = data;
		data.count = this.count;
		this.$el = $(Handlebars.templates['chat-box'](data));
		$('body').append( this.$el );
		this.shift(this.count);
		this.$messages_div = this.$el.find('.messages');
		this.$messages = this.$el.find('.messages ul');
		this.scroll_to_bottom();
		this.listeners();
		this.$el.find('textarea').focus();
		if(this.cb){ this.cb(); }
	};

	ChatBox.prototype.initialize = function(){
		$.ajax({
			url: '/find-chat/'+this.user+'.json',
			success: $.proxy(this.render, this)
		});
	};


	/* ChatList */

	var ChatList = function(socket, me){
		this.socket = socket;
		this.me = me;
		this.list_template = Handlebars.compile()
		this.initialize();
		this.loading = false;
		this.open_chats = {};
		this.open_chat_count = 0;
	};

	ChatList.prototype.render = function(data){
		this.$el.html( Handlebars.templates['chat-list']({
			me: this.me,
			users: data
		}) );
	};

	ChatList.prototype.close_earliest_active_chat = function(){
		this.close(_.sortBy(this.open_chats, function(chat){ 
			return chat.obj.sort; 
		})[0].obj.user);
	};

	ChatList.prototype.open_chat_box = function(user, cb, data){
		if(this.open_chats[user]){
			if(cb){ cb(); }
			return;
		}

		this.open_chat_count++;
		if(this.open_chat_count > 5){
			this.close_earliest_active_chat();
		}
		this.open_chats[user] = {
			obj: new ChatBox(this.socket, user, this.open_chat_count, this.me, $.proxy(function(){
				this.open_chats[user].obj.set_notification(data);
				this.open_chats[user].obj.keep_notifying = true;
				this.open_chats[user].obj.notify();
			}, this)),
			sort: this.open_chat_count
		};
	};

	ChatList.prototype.open_chat_box_e = function(e){
		e.preventDefault();
		//
		this.open_chat_box($(e.currentTarget).data('user'));
	};

	ChatList.prototype.load = function(){
		if(!this.loading){
			this.loading = true;

			setTimeout($.proxy(function(){
				this.loading = false;

				$.ajax({
					url: '/online-users.json',
					success: $.proxy(this.render, this)
				});

			}, this), 150);
		}
	};

	ChatList.prototype.message = function(data){
		this.open_chat_box(data.from, $.proxy(function(){
			this.open_chats[data.from].obj.render_message(data);
		}, this), data);
	};

	ChatList.prototype.close = function(user){
		var i=0;

		this.open_chats[user].obj.close();
		delete this.open_chats[user];
		this.open_chat_count--;
		
		_.each(_.sortBy(this.open_chats, function(chat){ 
			return chat.sort; 
		}), function(chat){
			chat.obj.shift(i);
			i++;
		});
	};

	ChatList.prototype.close_chat_box = function(e){
		e.preventDefault();
		this.close($(e.currentTarget).data('other-user'));
	};

	ChatList.prototype.listeners = function(){
		$('body').on('click', '.close-chat-box', $.proxy(this.close_chat_box, this));

		$(document).on('close-chat-box', $.proxy(function(e, data){
			this.close(data.user);
		}, this));
	};

	ChatList.prototype.initialize = function(){
		$(document).ready($.proxy(function(){
			this.$el = $('.users');
			this.$el.on('click', 'a', $.proxy(this.open_chat_box_e, this));
		}, this));
		this.socket.on('message', $.proxy(this.message, this));
		this.socket.on('connect', $.proxy(this.load, this));
		this.socket.on('disconnect', $.proxy(this.load, this));
		this.listeners();
		this.load();
	};



	/* App */

	var App = function(){
		this.socket;
		this.initialize();
	};

	App.prototype.render = function(data){
		this.me = data;
		this.socket = io.connect();
		this.socket.emit('hook', 'users');
		this.chat_list = new ChatList(this.socket, this.me);
	};

	App.prototype.initialize = function(){
		$.ajax({
			url: '/me.json',
			success: $.proxy(this.render, this)
		});
	};
	var app = new App();
}());