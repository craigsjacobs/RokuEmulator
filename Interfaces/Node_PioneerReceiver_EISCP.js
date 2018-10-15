/*jslint node:true nomen:true*/
'use strict';
var self, eiscp, send_queue,
    net = require('net'),
    dgram = require('dgram'),
    util = require('util'),
    async = require('async'),
    events = require('events'),
    config = { port: 60128, reconnect: true, reconnect_sleep: 5, modelsets: [], send_delay: 500, verify_commands: true };

module.exports = self = new events.EventEmitter();

self.is_connected = false;


function eiscp_packet(data) {
    /*
      Wraps command or iscp message in eISCP packet for communicating over Ethernet
      type is device type where 1 is receiver and x is for the discovery broadcast
      Returns complete eISCP packet as a buffer ready to be sent
    */
    var iscp_msg, header;

    // Add ISCP header if not already present
    if (data.charAt(0) !== '!') { data = '!1' + data; }
    // ISCP message
    iscp_msg = new Buffer(data + '\x0D\x0a');

    // eISCP header
    header = new Buffer([
        73, 83, 67, 80, // magic
        0, 0, 0, 16,    // header size
        0, 0, 0, 0,     // data size
        1,              // version
        0, 0, 0         // reserved
    ]);
    // write data size to eISCP header
    header.writeUInt32BE(iscp_msg.length, 8);

    return Buffer.concat([header, iscp_msg]);
}

function eiscp_packet_extract(packet) {
    /*
      Extracts message from eISCP packet
      Strip first 18 bytes and last 3 since that's only the header and end characters
    */
    return packet.toString('ascii', 18, packet.length - 3);
}






self.connect = function (options) {
    /*
      No options required if you only have one receiver on your network. We will find it and connect to it!
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
    if (typeof eiscp !== 'undefined') {
		eiscp.connect(connection_properties);
		return;
    }

	// Connecting the first time
	eiscp = net.connect(connection_properties);

	eiscp.
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
		eiscp.destroy();
	}).

	on('data', function (data) {

		var iscp_message = eiscp_packet_extract(data);

		self.emit('debug', util.format("DEBUG (received_data) Received data from %s:%s - %j", config.host, config.port, iscp_message));
		self.emit('data', iscp_message);

	});
};

self.close = self.disconnect = function () {

    if (self.is_connected) {
        eiscp.destroy();
    }
};

send_queue = async.queue(function (data, callback) {
    /*
      Syncronous queue which sends commands to device
	  callback(bool error, string error_message)
    */
    if (self.is_connected) {

        self.emit('debug', util.format("DEBUG (sent_command) Sent command to %s:%s - %s", config.host, config.port, data));

        eiscp.write(eiscp_packet(data));

        setTimeout(callback, config.send_delay, false);
        return;
    }

    self.emit('error', util.format("ERROR (send_not_connected) Not connected, can't send data: %j", data));
    callback('Send command, while not connected', null);

}, 1);

self.rawcommand = function (data, callback) {
    /*
      Send a low level command like PWR01
      callback only tells you that the command was sent but not that it succsessfully did what you asked
    */
    console.log(data);
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

	switch(data){
		// define a list of commands that pretty much all AV devices will use - make standard interface from Hard Harmony Buttons
		case "home":
			break;
		case "Rev":
			break;
		case "Fwd":
			break;
		case "Play":
    			break;
		case "Select":
			break;
		case "Left":
			break;
		case "Right":
			break;
		case "Down":
			break;
		case "Up":
			break;
		case "InstantReplay":
			break;
		case "Back":
			break;
		case "Info":
			break;
		case "Backspace":
			break;
		case "Search":
			break;
		case "FindRemote":
			break;
		case "Enter":
			break;
		//Macro Functions
		case "MainZonePower:On":
                    self.rawcommand('POW01');
                    break;
		case "MainZonePower:Off":
                    self.rawcommand('POW00');
                    break;
		case "Mute:On":
                    self.rawcommand('AMT01');
                    break;
		case "Mute:Off":
                    self.rawcommand('AMT00');
                    break;
		case "MainZoneVolume:Up":
                    self.rawcommand('MVLUP');
                    break;
		case "MainZoneVolume:Down":
                    self.rawcommand('MVLDOWN');
                    break;
                case "MainSubwoofer:TempZero":
                    set.rawcommand('SWL000');
                    break;
                case "MainSubwoofer:TempDown":
                    set.rawcommand('SWL-12');
                    break;
                case "MainCenter:TempZero":
                    set.rawcommand('CTL000');
                    break;
                case "MainCenter:TempUp":
                    set.rawcommand('CTL+12');
                    break;
                case "MainZoneInput:HDMI_GAME":
                    //set.rawcommand('SLI02');
                    break;
                case "ListeningMode:DolbyAtmos":
                    break;
                case "Display:AudioInfo":
                    set.rawcommand('DIF01');
                    break;
                case "Display:VideoInfo":
                    set.rawcommand('DIF02');
                    break;
		default:
                    break;
		}

};

