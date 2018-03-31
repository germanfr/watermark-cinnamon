/*
* Watermark - Cinnamon desktop extension
* Place a watermark icon on the desktop
* Copyright (C) 2018  Germán Franco Dorca
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Settings = imports.ui.settings;
const St = imports.gi.St;

const Main = imports.ui.main;

const ERROR_ICON_NAME = 'face-sad-symbolic';

function MyExtension(meta) {
	this._init(meta);
}

MyExtension.prototype = {

	_init: function (meta) {
		this.meta = meta;
		this.watermarks = [];
	},

	enable: function() {
		this.settings = new Settings.ExtensionSettings(this, this.meta.uuid);
		this.settings.bind('icon-name', 'icon_name', this.on_settings_updated);
		this.settings.bind('icon-size', 'icon_size', this.on_settings_updated);
		this.settings.bind('position-x', 'position_x', this.on_settings_updated);
		this.settings.bind('position-y', 'position_y', this.on_settings_updated);
		this.settings.bind('icon-alpha', 'icon_alpha', this.on_settings_updated);
		this.settings.bind('icon-color', 'icon_color', this.on_settings_updated);

		// FIXME: Not firing!
		this.monitorsChangedId = global.screen.connect('monitors-changed', () => {
			this._clear_watermarks();
			this._init_watermarks();
		});

		this._init_watermarks();
		this.on_settings_updated();
	},

	_init_watermarks: function() {
		for(let i = global.screen.get_n_monitors()-1; i >= 0; i--) {
			let monitor = Main.layoutManager.monitors[i];
			this.watermarks.push(new Watermark(monitor, this));

		}
	},

	_clear_watermarks: function() {
		for(let wm of this.watermark) {
			this.watermark.destroy();
		}
		this.watermarks = [];
	},

	disable: function() {
		this.settings.unbindAll();
		this._clear_watermarks();
	},

	on_settings_updated: function() {
		for(let wm of this.watermarks)
			wm.update();
	}
};

function Watermark(monitor, manager) {
	this._init(monitor, manager);
}

Watermark.prototype = {
	_init: function(monitor, manager) {
		this.manager = manager;
		this.monitor = monitor;

		this.actor = new St.Icon({ icon_name: manager.icon_name,
		                           icon_size: manager.icon_size,
		                           icon_type: St.IconType.SYMBOLIC , x_expand: true, y_expand: true });
		this.update_style();

		global.bottom_window_group.insert_child_at_index(this.actor, 0);
		this.update_position();
	},

	update: function() {
		this.set_icon(this.manager.icon_name);
		this.actor.set_icon_size(this.manager.icon_size);
		this.update_style();
		this.update_position();
	},

	update_position: function() {
		let x = this.monitor.x + (this.monitor.width - this.actor.width) * this.manager.position_x / 100;
		let y = this.monitor.y + (this.monitor.height - this.actor.height) * this.manager.position_y / 100;

		this.actor.set_position(x, y);
	},

	update_style: function() {
		this.actor.set_opacity(this.manager.icon_alpha * 255 / 100);
		this.actor.style = 'color:' + this.manager.icon_color;
	},

	set_icon: function(icon) {
		if(GLib.file_test(icon, GLib.FileTest.EXISTS)) { // Icon path
			let file = Gio.file_new_for_path(icon);
			this.actor.set_gicon(new Gio.FileIcon({ file: file }));
		} else if(Gtk.IconTheme.get_default().has_icon(icon)) { // Icon name
			this.actor.set_icon_name(icon);
		} else {
			let xlet_icon = this.manager.meta.path + '/icons/' + icon + '-symbolic.svg';
			if(GLib.file_test(xlet_icon, GLib.FileTest.EXISTS)) {
				let file = Gio.file_new_for_path(xlet_icon);
				this.actor.set_gicon(new Gio.FileIcon({ file: file }));
			} else {
				this.actor.set_icon_name(ERROR_ICON_NAME);
			}
		}
	},

	destroy: function() {
		this.actor.destroy();
		this.actor = null;
	}
};

let extension = null;
function enable() {
	extension.enable();
}

function disable() {
	extension.disable();
	extension = null;
}

function init(metadata) {
	if(!extension) {
		extension = new MyExtension(metadata);
	}
}
