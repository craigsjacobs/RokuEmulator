/*jslint node:true nomen:true*/
'use strict';
var self, rav88, send_queue,
    net = require('net'),
    dgram = require('dgram'),
    util = require('util'),
    async = require('async'),
    events = require('events'),
    system = require('../AutomationConfig.json'),
    config = { port: 60128, reconnect: true, reconnect_sleep: 5, modelsets: [], send_delay: 500, verify_commands: true };

module.exports = self = new events.EventEmitter();

self.is_connected = false;

self.connect = function (options) {

    var connection_properties;
	//config.host = system.devices.RAV88.IPAddress;
	//config.port = system.devices.RAV88.Port
        config.host = "192.168.1.17";
        config.port = "4001";
	config.model = "RAV88";
	config.reconnect = true;
	config.reconnect_sleep = 120;
	config.verify_commands = false;

    connection_properties = {
        host: config.host,
        port: config.port
    };

    self.emit('debug', util.format("INFO (connecting) Connecting to %s:%s (model: %s)", config.host, config.port, config.model));

	// Reconnect if we have previously connected
    if (typeof rav88 !== 'undefined') {
		rav88.connect(connection_properties);
		return;
    }

	// Connecting the first time
	rav88 = net.connect(connection_properties);

	rav88.
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
		rav88.destroy();
	}).

	on('data', function (data) {

		self.emit('debug', util.format("DEBUG (received_data) Received data from %s:%s - %j", config.host, config.port, data));
		//self.emit('data', iscp_message);

	});
};

self.close = self.disconnect = function () {

    if (self.is_connected) {
        rav88.destroy();
    }
};

send_queue = async.queue(function (data, callback) {
    /*
      Syncronous queue which sends commands to device
	  callback(bool error, string error_message)
    */
    if (self.is_connected) {

        self.emit('debug', util.format("DEBUG (sent_command) Sent command to %s:%s - %s", config.host, config.port, data));

        rav88.write(data);

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
// define a list of commands that pretty much all AV devices will use - make standard interface from Hard Harmony Buttons
		
    //Parse the command
    var parts = data.toString().split(/[\s\.=:]/).filter(function (item) { return item !== ''; });

    console.log(parts);
    switch (parts[0]){
        case "Route":
            
           // Command = system.Devices;
        
            var inputs = Object.keys(system.Devices.RAV88.InputMapping);
            var outputs = Object.keys(system.Devices.RAV88.OutputMapping);
            //console.log (inputs);
           
           for (i=0;i<inputs.length;i++){
               if (parts[1] == inputs[i]){
                var InputChannel =  i+1;
                break;}}
            for (i=0;i<outputs.length;i++){
               if (parts[2] == outputs[i]){
                var OutputChannel =  i+1;
                break;}}
                var Command = InputChannel  + "B" + OutputChannel + ".";
                console.log(Command);
        
            self.raw(Command);
            break;	
	case "Enable":
          //  Command = system.Devices.RAV88.parts[1] & "@.";
           // console.log ("Sending %s\n", Command);
           // self.raw(Command);
            break;
	case "Disable":
           // Command = system.Devices.RAV88.parts[1] & "$.";
            //console.log ("Sending %s\n", Command);
            //self.raw(Command);
            break;
	case "EDID":
            console.log ("Still Need to implement EDID Switching\n");
        break;
	default:
            console.log("Command Not Found : %s", data);
		break;

	}


};