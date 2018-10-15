/*jslint node:true nomen:true*/
'use strict';
var self, globalcache, send_queue,
    net = require('net'),
    dgram = require('dgram'),
    util = require('util'),
    async = require('async'),
    events = require('events'),
    globalcache = require('./GlobalCache.json'),
    config = { port: 60128, reconnect: true, reconnect_sleep: 5, modelsets: [], send_delay: 500, verify_commands: true };

module.exports = self = new events.EventEmitter();

self.is_connected = false;


function build_globalcache_cmd(device, command, type) {
    /*
      Sets up IR sender information if GC Format
    */
    var header, data, cidx, didx;

cidx = 1;
didx = 1;
//area to build gc message

	header = globalcache.devices[1].header
	data = header + globalcache.devices[didx].Commands[cidx].GCValues.P1 + globalcache.devices[didx].Commands[cidx].GCValues.P2

	self.emit('debug', util.format("DEBUG (built command) device: %s, command: %s, packet: %s, device, command, data));
    return data
}


self.connect = function (options) {
    /*
      options.host            - Hostname/IP
      options.port            - Port (default: 60128)
      options.send_delay      - Delay in milliseconds between each command sent to receiver (default: 500)
      options.model           - Should be discovered automatically but if you want to override it you can
      options.reconnect       - Try to reconnect if connection is lost (default: false)
      options.reconnect_sleep - Time in seconds to sleep between reconnection attempts (default: 5)
      options.verify_commands - Whether the reject commands not found for the current model
    */
    var connection_properties;

    options = options || {};
	config.host = options.host || config.host;
	config.port = options.port || config.port;
	config.model = options.model || config.model;
	config.reconnect = (options.reconnect === undefined) ? config.reconnect : options.reconnect;
	config.reconnect_sleep = options.reconnect_sleep || config.reconnect_sleep;
	config.verify_commands = (options.verify_commands === undefined) ? config.verify_commands : options.verify_commands;

    connection_properties = {
        host: config.host,
        port: config.port
    };

    self.emit('debug', util.format("INFO (connecting) Connecting to %s:%s (model: %s)", config.host, config.port, config.model));

	// Reconnect if we have previously connected
    if (typeof globalcache !== 'undefined') {
		globalcache.connect(connection_properties);
		return;
    }

	// Connecting the first time
	globalcache = net.connect(connection_properties);

	globalcache.
	on('connect', function () {

		self.is_connected = true;
		self.emit('debug', util.format("INFO (connected) Connected to %s:%s (model: %s)", config.host, config.port, config.model));
		self.emit('connect', config.host, config.port, config.model);
	}).

	on('close', function () {

		self.is_connected = false;
		self.emit('debug', util.format("INFO (disconnected) Disconnected from %s:%s", config.host, config.port));
		self.emit('close', config.host, config.port);

		if (config.reconnect) {

			setTimeout(self.connect, config.reconnect_sleep * 1000);
		}
	}).

	on('error', function (err) {

		self.emit('error', util.format("ERROR (server_error) Server error on %s:%s - %s", config.host, config.port, err));
		globalcache.destroy();
	}).

	on('data', function (data) {

		self.emit('debug', util.format("DEBUG (received_data) Received data from %s:%s - %j", config.host, config.port, data));
		self.emit('data', iscp_message);

	});
};

self.close = self.disconnect = function () {

    if (self.is_connected) {
        globalcache.destroy();
    }
};

send_queue = async.queue(function (data, callback) {
    /*
      Syncronous queue which sends commands to device
	  callback(bool error, string error_message)
    */
    if (self.is_connected) {

        self.emit('debug', util.format("DEBUG (sent_command) Sent command to %s:%s - %s", config.host, config.port, data));

        globalcache.write(data);

        setTimeout(callback, config.send_delay, false);
        return;
    }

    self.emit('error', util.format("ERROR (send_not_connected) Not connected, can't send data: %j", data));
    callback('Send command, while not connected', null);

}, 1);

self.raw = function (data, callback) {

    if (typeof data !== 'undefined' && data !== '') {

        send_queue.push(data, function (err) {

            if (typeof callback === 'function') {

                callback(err, null);
            }
        });

    } else if (typeof callback === 'function') {

        callback(true, 'No data provided.');
    }
};

self.command = function (data, callback) {
    /*
      Send a high level command like system-power=query
      callback only tells you that the command was sent but not that it succsessfully did what you asked
    */

    self.raw(build_globalcache_cmd(data), callback);
};

self.HBcommand = function (data, callback) {
// define a list of commands that pretty much all AV devices will use - make standard interface from Hard Harmony Buttons
	select (data){
		
		case Home,
			break;
		case Rev,
			break;
		case Fwd,
			break;
		case Play,
    			self.rawcommand('MVLUP', callback);
		case Select,
			break;
		case Left,
			break;
		case Right,
			break;
		case Down,
			break;
		case Up,
			break;
		case InstantReplay,
			break;
		case Back,
			break;
		case Info,
			break;
		case Backspace,
			break;
		case Search,
			break;
		case FindRemote,
			break;
		case Enter,
			break;
		otherwise,
			break;
		}

};
