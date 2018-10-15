/**
 * Rokuapi.js
 * 
 * @version 1.0
 * Author Craig Jacobs
 */

var http      = require('http');
var express   = require('express');
var util      = require('util');
var sclx502   = require('./Interfaces/Node_PioneerReceiver_EISCP');
var rav88     = require('./Interfaces/Node_RAV88Matrix');
var SystemStatus = require('./AutomationConfig.json');


var ACTIVITIES = SystemStatus.ActivityMacros;
var DEVICES = SystemStatus.Devices;
var HUBS = SystemStatus.HUBS;
var MACROS = SystemStatus.SpecialMacros;

var app       = express();

//Setup the SSDP Server

var ssdp = require("peer-ssdp");
var peer = ssdp.createPeer();
var interval;
/**
 * handle peer ready event. This event will be emitted after `peer.start()` is called.
 */
/*peer.on("ready",function(){
	// handle ready event
	// send ssdp:alive messages every 1s
	// {{networkInterfaceAddress}} will be replaced before
	// sending the SSDP message with the actual IP Address of the corresponding
	// Network interface. This is helpful for example in UPnP for LOCATION value
	interval = setInterval(function(){
		peer.alive({
			ST: "upnp:rootdevice",
			SERVER: "...",
			ST: headers.ST,
			USN: "...",
			LOCATION: "http://{{networkInterfaceAddress}}/device-desc.xml",
		});
	}, 1000);
	// shutdown peer after 10 s and send a ssdp:byebye message before
	setTimeout(function(){
		clearInterval(interval);
		// Close peer. Afer peer is closed the `close` event will be emitted.
		peer.close();
	}, 10000);
});*/



// handle SSDP M-SEARCH messages. 
// param headers is JSON object containing the headers of the SSDP M-SEARCH message as key-value-pair. 
// param address is the socket address of the sender
peer.on("search",function(headers, address){

        console.log("Replying to: " + address.address + " for root device");
	peer.reply({
		ST: "upnp:rootdevice",
		USN: "uuid:29680013-180d-10cf-8019-d83a6b122ddc:upnp:rootdevice",
                EXT: "",
		Server: "Roku uPnP/1.0 Roku/8.1.0/",
		LOCATION: "192.168.1.23:8060",
                WAKEUP: "MAC=c8:3a:6b:14:3e:ee; Timeout=10"
	},address);
        
        console.log("Replying to: " + address.address + " for ECP Message");
	peer.reply({
		ST: "roku:ecp",
		USN: "uuid:roku:ecp:YJ00AE469652",
                EXT: "",
		Server: "Roku uPnP/1.0 Roku/8.1.0/",
		LOCATION: "192.168.1.23:8060",
                WAKEUP: "MAC=c8:3a:6b:14:3e:ee; Timeout=10"
	},address);
        
        console.log("Replying to: " + address.address + " for dial-multiscreen");
	peer.reply({
		ST: "urn:dial-multiscreen-org:service:dial",
		USN: "uuid:29680013-180d-10cf-8019-d83a6b122ddc:urn:dial-multiscreen-org:service:dial:1",
                EXT: "",
		Server: "Roku uPnP/1.0 Roku/8.1.0/",
		LOCATION: "192.168.1.23:8060",
                WAKEUP: "MAC=c8:3a:6b:14:3e:ee; Timeout=10"
	},address);
        
});



// Start peer. Afer peer is ready the `ready` event will be emitted.
peer.start();




// ------------------------------------------------------------------------
// configure Express to serve index.html and any other static pages stored 
// in the home directory
//app.use(express.static(__dirname));
app.use(express.static(__dirname + '/'));

//Connect to devices
sclx502.connect({host: "192.168.1.20", model: "SC-LX502"});
rav88.connect({host:"192.168.1.17", model:"RAV88"});




app.get('/query/apps', function (req, res){
    
    var activities = Object.keys(ACTIVITIES),
    macros = Object.keys(MACROS);
    
    console.log('Generating xml');
    console.log('.........................................');

    for(i=0;i<activities.length;i++){
        console.log("< %s: %s,%s",activities[i], ACTIVITIES[activities[i]].ActivityName, ACTIVITIES[activities[i]].ActivityNumber);
        }

    for(i=0;i<macros.length;i++){
        console.log("< %s: %s,%s",macros[i], MACROS[macros[i]].ActivityName, MACROS[macros[i]].ActivityNumber);
    }
    
    //res.status(200).send(launch);
    }); //app.get 

app.post('/launch/:id', function (req, res) { // Express route for launch commands to Roku
  // send an object as a JSON string
    var activities = Object.keys(ACTIVITIES),
    macros = Object.keys(MACROS);
                                              
    console.log('id = ' + req.params.id);
    SendingHub = DetermineSender(req.ip);
                                              
    if(req.params.id < 5200) {
        for(i=0;i<activities.length;i++){
            if(ACTIVITIES[activities[i]].index == req.params.id){
                
                var commandlist = Object.keys(ACTIVITIES[activities[i]].CommandList);
                console.log("activity: " + ACTIVITIES[activities[i]].index + "commands" + commandlist.length);
                for (j=0;j<commandlist.length;j++){
                    SendDeviceCommand(ACTIVITIES[activities[i]].CommandList[commandlist[j]].Device, ACTIVITIES[activities[i]].CommandList[commandlist[j]].Command);
                    }
                
            }
        }
    }
    else{
        for(i=0;i<macros.length;i++){
            if (MACROS[macros[i]].index == req.params.id){
                console.log("macros: " + MACROS[macros[i]].index);
                var commandlist = Object.keys(MACROS[macros[i]].CommandList);
                for (j=0;j<commandlist.length;j++){
                    SendDeviceCommand(MACROS[macros[i]].CommandList[commandlist[j]].Device, MACROS[macros[i]].CommandList[commandlist[j]].Command);
                    }
            }
        }
    }
                                                  
                                              
 
  
}); // apt.post()

app.post('/keypress/:id', function (req, res) {  //express route for keypress commands to Roku
    console.log('key = ' + req.params.id);
    SendingHub = DetermineSender(req.ip);
  
}); // apt.post()

// Express route for any other unrecognised incoming requests
app.get('*', function (req, res) {
  res.status(404).send('Unrecognized API call');
});

// Express route to handle errors
app.use(function (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!');
  } else {
    next(err);
  }
}); // apt.use()

// ------------------------------------------------------------------------
// Start Express App Server
//
app.listen(8060);
console.log('App Server is listening on port 8060');
function SendDeviceCommand(device, command){
    //console.log("Sending Command: %s to Device %s", command, device);
    switch (device){
        case "SC-LX502":
            sclx502.command(command);
            break;
        case "RAV88":
            rav88.command(command);
        //console.log("Command Not Implmented %s, %s", device, command);
            break;
        case "PiHub":
            switch(command){
                case "Delay":
        		    console.log("Delay timer");
		case "Build:OSD":
		    string = "POPX----<popup title=\"Test\" align=\"center\" type=\"custom\" time=\"5\" uri=\"resource:///popup\" /> ";
                    //string = string + "<label title=\"Home Theatre System Status\" align=\"\" total=\"1\" uri=\"resource:///popup/label:0\" /> \". \"";
		    //string = string + "<line text=\"Activity Name: xBox One S\" align=\"left\" uri=\"resource:///popup/buttongroup:0/button:0\" /> \". \"";
		    //string = string + "<line text=\"Light Status: 35%\" align=\"left\" uri=\"resource:///popup/buttongroup:0/button:0\" />";
		    string = string + "</popup>";
                    console.log(string);
                    sclx502.rawcommand(string);
                    break;
                default:
                        console.log("PiHub command not written");
                        break;
            }
            break;
        default:
            console.log("Command Not Recognized %s, %s",device, command);
            break;
        }
    
    }
function DetermineSender(ipAddr){                                       
    var parts = ipAddr.toLowerCase().split(/[\s\.=:]/).filter(function (item) { return item !== ''; });                           
    switch (parts[4]){
        case "24":
            SendingHub = "iPad";
            break;
        case "6":
            SendingHub = "Macbook";
            break;
        default:
            SendingHub = "Unknown";
            break;
        }                         
        console.log("Control Command from : %s", SendingHub);
        
        return SendingHub
    }