/*************************************************************************
 * 
 * WEEMO INC.
 * 
 *  Weemo.js - v 2.0
 *  [2013] Weemo Inc.
 *  All Rights Reserved.
 * 
 * NOTICE:  All information contained herein is, and remains
 * the property of Weemo Inc..
 * The intellectual and technical concepts contained
 * herein are proprietary to Weemo Inc.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Weemo Inc.
 */

Weemo = function() {
	// Private properties
	var version = "2.0";
	var state = "NOT_CONNECTED";
	var browser = '';
	var browserVersion = '';
	var protocol = "weemodriver-protocol";
	var wsUri = "wss://localhost:34679";
	var longpollUri = "https://localhost:34679?callback=?";
	var openedWebSockets = 0;
	var self = this;
	var myId = null;
	var uid = '';
	var apikey = '';
	var mode = '';
	var platform = 'p1.weemo.com';
	var domain = 'weemo-poc.com';
	var pwd = '';
	var displayname = '';
	var downloadTimeout = null;
	var downloadTimeoutValue = 15000;
	var pollingTimeout = 16000;
	var messageTimeout = 5000;
	var environment = 'production';
	var downloadUrl = '';
	var websock;
	
	//  Public methods
	this.setUid = function(value) { uid = value; };
	this.setApikey = function(value) { apikey = value; };
	this.setMode = function(value) { mode = value; };
	this.setPlatform = function(value) { platform = value; };
	this.setDomain = function(value) { domain = value; };
	this.setPwd = function(value) { pwd = value; };
	this.setDisplayname = function(value) { displayname = value; sm('setDisplayname'); };
	this.setEnvironment = function(value) { environment = value; };	
	this.getDisplayname = function() { return displayname; };
	this.getUid = function() { return uid; };
	this.connectToWeemoDriver = function() { sm('connect');  };
	this.connectToTheCloud = function() { sm('connect');  };
	this.createCall = function(uidToCall, type, displaynameToCall) { 
		var obj = new Object(); 
		obj.uidToCall = uidToCall; 
		obj.type = type;
		obj.displaynameToCall = displaynameToCall;
		sm('createCall', obj);
	};





	var sm = function(action, params) {
		debug("STATE >>>>> " + state);
		debug("ACTION >>>>> " + action);
		switch(state) {
			case "NOT_CONNECTED":
				if(action != "") {
					switch(action) {
						case 'connect':
							if(downloadTimeout == null) {
							downloadTimeout = setTimeout(function() { 
								switch(environment) {
									case 'production':
										downloadUrl = 'https://download.weemo.com/poc.php?apikey='+apikey+'&domain_name='+domain;
									break;
									
									case 'staging': 
										downloadUrl = 'https://download-ppr.weemo.com/poc.php?apikey='+apikey+'&domain_name='+domain;
									break;
									
									case 'testing':
										downloadUrl = 'https://download-qual.weemo.com/poc.php?apikey='+apikey+'&domain_name='+domain;
									break;
									
									case 'development':
										downloadUrl = 'https://download-dev.weemo.com/poc.php?apikey='+apikey+'&domain_name='+domain;
									break;
									
									default: 
										downloadUrl = 'https://download.weemo.com/poc.php?apikey='+apikey+'&domain_name='+domain;
									
								}
								debug('BROWSER >>>>> WeemoDriver not started');
								if(typeof(self.onWeemoDriverNotStarted) != undefined && typeof(self.onWeemoDriverNotStarted) == 'function') self.onWeemoDriverNotStarted(downloadUrl); }, downloadTimeoutValue);
							}
							createConnection();
						break;
						
						case 'close':
						case 'not_connected':
							createConnection();
						break;
						
						case 'connected':
							state = 'CONNECTED_WEEMO_DRIVER';
							clearTimeout(downloadTimeout);
							if(typeof(self.connectedToWeemoDriver) != undefined && typeof(self.connectedToWeemoDriver) == 'function') self.connectedToWeemoDriver();
						break;
					}
				}
			break;
			
			case "CONNECTED_WEEMO_DRIVER":
				if(action != "") {
					switch(action) {
						case 'connect':
							connect();
						break;
						
						case 'close':
							connect();
						break;
						
						case 'onVerifiedUserNok':
							debug('UNABLE TO CONNECT');
						break;
						
						case 'onReadyforauthentication':
							controlUser();
						break;
						
						case 'disconnect':
							disconnect();
						break;
						
						case 'sipOk':
							state = 'CONNECTED';
							if(displayname != undefined && displayname != '' && displayname != null) sendDisplayname();
							//if(typeof(self.onSipOk) != undefined && typeof(self.onSipOk) == 'function') self.onSipOk();
							if(typeof(self.onDefaultHandler) != undefined && typeof(self.onDefaultHandler) == 'function') self.onDefaultHandler(action);
						break;
						
						case 'not_connected':
							state = 'NOT_CONNECTED';
							sm('connect');
						break;
						
						case 'xmppNok': 
						case 'xmppOk':
						case 'sipNok':
						case 'onVerifiedUserOk':
						case 'onConnect': 
						case 'audioOk':
						case 'audioNok':
							if(typeof(self.onDefaultHandler) != undefined && typeof(self.onDefaultHandler) == 'function') self.onDefaultHandler(action);
						break;
						
						default:	
					}
				}
			break;
			
			case "CONNECTED":
				if(action != "") {
					switch(action) {
						case 'createCall':
							if(params.uidToCall != undefined && params.type != undefined && params.displaynameToCall != undefined) {
								createCallInternal(params.uidToCall, params.type, params.displaynameToCall);
							}
						break;
						
						case 'close':
							close();
						break;
						
						case 'disconnect':
							disconnect();
						break;
						
						case 'not_connected':
							state = 'NOT_CONNECTED';
							sm('connect');
						break;
						
						case 'setDisplayname':
							sendDisplayname();
						break;
						
						case 'audioOk':
						case 'audioNok':
							if(typeof(self.onDefaultHandler) != undefined && typeof(self.onDefaultHandler) == 'function') self.onDefaultHandler(action);
						break;
						
						case 'onCallCreated':
							controlCall(params.createdCallId, 'call', 'start');
						break;
						
						case 'onCallStatusReceived':
							debug(params.status);
							if(typeof(self.onCallHandler) != undefined && typeof(self.onCallHandler) == 'function') self.onCallHandler(params.status);
						break;
					}
				}
			break;
			
			default: 
				
		}
		
		// Error
		if(action == 'error') {
			debug('Error id : ' + params.message);
			switch(params.message) {
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '8':
				case '9':
				case '10':
				case '11':
				case '12':
				case '13':
				case '14':
				case '15':
				case '16':
				case '17':
					debug('Error message : Verify user error');
				break;
					
				case '6':
					debug('Error message : Bad authentication');
				break;
					
				case '7':
					debug('Error message : Bad Apikey');
				break;
				
				case '18':
					debug('Error message : No network or proxy error');
				break;
					
				case '19':
					debug('Error message : Generic error');
				break;
				
				case '20':
					debug('Error message : Have to send a poll before');
				break;
				
				case '21':
					debug('Error message : Internal error');
				break;
					
				case '22':
					debug('Error message : Weemo Driver disconnected');
				break;
				
				case '23':
					debug('Error message : Bad xml or bad command');
				break;
				
				case '24':
					debug('Error message : Weemo Driver not authenticated');
				break;
					
				default:
					debug("Error message : General error. Please contact support.");
			}
			if(typeof(self.onErrorHandler) != undefined && typeof(self.onErrorHandler) == 'function') self.onErrorHandler(params.message);
		}
	};
	
	//  Private methods
	var createConnection = function() {
		if(browser == 'Explorer' && browserVersion < 10) {
			if(myId == null) myId = uniqid();
			polling();
		} else {
			if(openedWebSockets == 0) {
			try {
				
	    		if(typeof MozWebSocket == 'function') WebSocket = MozWebSocket;
	    		websock = new WebSocket(wsUri, protocol);
	    		openedWebSockets+=1;
	    		websock.onopen = function(evt) { debug('OPENED WEBSOCKETS >>>>> ' + openedWebSockets); sm('connected'); debug('BROWSER >>>>> WEBSOCKET OPEN'); };
	    		websock.onclose = function(evt) { openedWebSockets-=1; sm('not_connected'); };
	    		websock.onmessage = function(evt) { handleData(evt.data); };
	    		websock.onerror = function(evt) { debug('BROWSER >>>>> WEBSOCKET ERROR '); sm('not_connected'); };
	    	} catch(exception) {
	    		debug('BROWSER >>>>> WEBSOCKET EXCEPTION');
	    		debug(exception);
	    	}
			}
		}
	};
	var setBrowserInfo = function() {
		if (navigator.userAgent.search("MSIE") >= 0){
		    browser = 'Explorer';
		    var position = navigator.userAgent.search("MSIE") + 5;
		    var end = navigator.userAgent.search("; Windows");
		    browserVersion = parseInt(navigator.userAgent.substring(position,end));
		}
		else if (navigator.userAgent.search("Chrome") >= 0){
			browser = 'Chrome';// For some reason in the browser identification Chrome contains the word "Safari" so when detecting for Safari you need to include Not Chrome
		    var position = navigator.userAgent.search("Chrome") + 7;
		    var end = navigator.userAgent.search(" Safari");
		    browserVersion = parseInt(navigator.userAgent.substring(position,end));
		}
		else if (navigator.userAgent.search("Firefox") >= 0){
			browser = 'Firefox';
		    var position = navigator.userAgent.search("Firefox") + 8;
		    browserVersion = parseInt(navigator.userAgent.substring(position));
		}
		else if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0){//<< Here
			browser = 'Safari';
		    var position = navigator.userAgent.search("Version") + 8;
		    var end = navigator.userAgent.search(" Safari");
		    browserVersion = parseInt(navigator.userAgent.substring(position,end));
		}
		else if (navigator.userAgent.search("Opera") >= 0){
			browser = 'Opera';
		    var position = navigator.userAgent.search("Version") + 8;
		    browserVersion = parseInt(navigator.userAgent.substring(position));
		}
		else{
			browser = 'Other';
		}
	};
	var debug = function(txt) { if(window.console && mode == 'debug') console.log(txt); };
	var uniqid = function() { var newDate = new Date; return (newDate.getTime()%(2147483648-1)); };
	var connect = function() { if(platform == undefined || platform == null || platform == '') { platform = 'p1.weemo.com'; } sendMessage('<connect techdomain="'+platform+'"></connect>'); };
	var getVersion = function() { sendMessage('<getversion/>'); };
	var showWindow = function(winid) { sendMessage('<showwindow window="'+winid+'"></showwindow>'); };
	var disconnect = function() { sendMessage('<disconnect></disconnect>'); };
	var reset = function() { sendMessage('<reset></reset>'); };
	var controlUser = function() { sendMessage('<verifyuser uid="'+uid+'" apikey="'+apikey+'" token="'+pwd+'" provdomain="'+domain+'"></verifyuser>'); };
	var controlCall = function(id, item, action) {	 sendMessage('<controlcall id="'+id+'"><'+item+'>'+action+'</'+item+'></controlcall>'); };
	var sendDisplayname = function(){ sendMessage('<set displayname="'+displayname+'"></set>'); };
	var getDisplaynameInternal = function(){ sendMessage('<get type="displayname"></get>'); };
	var createCallInternal = function(uidToCall, type, displaynameToCall) { sendMessage('<createcall uid="'+uidToCall+'" apikey="'+apikey+'" displayname="'+displaynameToCall+'" type="'+type+'"></createcall>'); };
	var strpos = function(haystack, needle, offset) { var i = (haystack + '').indexOf(needle, (offset || 0)); return i === -1 ? false : i; };
	var trim = function(str, charlist) {
		i = 0;
		str += '';

		if (!charlist) { // default list
		whitespace = " \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";
		} else {
		// preg_quote custom list
		charlist += ''; whitespace = charlist.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
		}

		l = str.length;
		for (i = 0; i < l; i++) { if (whitespace.indexOf(str.charAt(i)) === -1) {
		str = str.substring(i);
		break;
		}
		}
		l = str.length;
		for (i = l - 1; i >= 0; i--) {
		if (whitespace.indexOf(str.charAt(i)) === -1) {
		str = str.substring(0, i + 1); break;
		}
		}

		return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
	};
	var sendMessage = function(val, type) {
		var message = new String();
		if(val != "" && val != undefined) { message = val; }
		
		if(browser == 'Explorer' && browserVersion < 10) {
			jqXHR = jQuery.ajax(longpollUri, {
				timeout: messageTimeout,
				beforeSend: function() { },
				data: { command:myId+':'+message },
				dataType: "jsonp",
				success: function(data) {
					debug('BROWSER TO WEEMODRIVER >>>>>> '+message);
					data = trim(data.x);
					var pos = strpos(data, ":");
					if(pos !== false) { data = data.substring(pos+1); }
					
		            if(data != "" && data != undefined) {
		        		try { handleData(data); }
		        		catch(err) { debug(err); }
		            }
				},
				error: function (data) { debug(data); }
			});
		} else {
			if(websock != undefined && websock != null) {
				websock.send(message); 
    			debug('BROWSER TO WEEMODRIVER >>>>>> '+message);
    		}
		}
	};
	var handleData = function(data) {
		var action = "";
	    var params = new Object();
	    
		debug('WEEMODRIVER TO BROWSER >>>>>> ' + data);
		xmlDoc = jQuery.parseXML(data);
		$xml = jQuery( xmlDoc );
		
		// Connected Node
	    $connectedNode = $xml.find("connected");
	    $connectedStatus = $connectedNode.text();
	    $connectedType = $connectedNode.attr('type');
	    
	 	// Disconnected Node
	    $disconnectedNode = $xml.find("disconnected");
	    $disconnectNode = $xml.find("disconnect");
	 	
		// Readyforauthentication Node
	    $readyforauthenticationNode = $xml.find("readyforauthentication");
		
	 	// verifieduser Node
	    $verifieduserNode = $xml.find("verifieduser");
	    $uid = $verifieduserNode.attr('uid');
	    $apikey = $verifieduserNode.attr('apikey');
	    $provdomain = $verifieduserNode.attr('provdomain');
	    $statusVerified = $verifieduserNode.text(); 
		
		//Status Node
	    $status = $xml.find("status");
	    $xmpp = $status.find('xmpp');
	    $sip = $status.find('sip');
	    $audio = $status.find('audio');
	    
	    
	    // CreatedCall Node 
	    $createdcall = $xml.find("createdcall");
	    $idCreated = $createdcall.attr('id');
	    //$jid = $createdcall.attr('jid');
	    $direction = $createdcall.attr('direction');
	    $displayname = $createdcall.attr('displayname');
	    
	 	// version Node
	    $setversionNode = $xml.find("setversion");
	    $version = $setversionNode.text(); 			    
	    
	    // statuscall Node
	    $statuscall = $xml.find("statuscall");
	    $call = $statuscall.find("call");
	    $id = $statuscall.attr('id');
	    $video_local = $statuscall.find('video_local');
	    $video_remote = $statuscall.find('video_remote');
	    $share_local = $statuscall.find('share_local');
	    $share_remote = $statuscall.find('share_remote');
	    $sound = $statuscall.find('sound');
	    
	    // Error Node
	    $error = $xml.find("error");
	    
	    // Closing Node
	    $closing = $xml.find("closing");
	    
	    if($video_local.length > 0) { $status = $video_local.find("status"); }
	    if($video_remote.length > 0) { $status = $video_remote.find("status"); }
	    if($share_local.length > 0) { $status = $share_local.find("status"); }
	    if($share_remote.length > 0) { $status = $share_remote.find("status"); }
	    if($sound.length > 0) { $status = $sound.find("status"); }
	    if($error.length > 0) { action = "error"; params.message = $error.text();} 

		if($connectedNode.length > 0) { action = "onConnect"; }
		if($readyforauthenticationNode.length > 0) { action = "onReadyforauthentication"; }
		if($statusVerified == "ko") { action = "onVerifiedUserNok"; }
		if($statusVerified == "ok") { action = "onVerifiedUserOk"; }
		
		if($xmpp.length > 0 && $xmpp.text() == "ok") { action = "xmppOk"; }
		if($xmpp.length > 0 && $xmpp.text() == "ko") { action = "xmppNok"; }
	    if($sip.length > 0 && $sip.text() == "ok") { action = "sipOk"; }
	    if($sip.length > 0 && $sip.text() == "ko") { action = "sipNok"; }
	    if($audio.length > 0 && $audio.text() == "ko") { action = "audioNok"; }
	    if($audio.length > 0 && $audio.text() == "ok") { action = "audioOk"; }
	    
	    if($disconnectedNode.length > 0 || $disconnectNode.length > 0) { action = "close"; }
	    
	    if($closing.length > 0) { action = "closing"; }
	    
		if($createdcall.length > 0 && $idCreated.length > 0 && $direction == 'out') { 
			params.createdCallId = $idCreated;
			action = "onCallCreated";
		}
		
		if($call.length > 0) { 
			 action = "onCallStatusReceived"; 
			 params.status = $call.text();
		}
		
		if(action != '') sm(action, params);
	};
	
	var polling = function() {
		jQuery.ajax(longpollUri, {
			data: {command:myId+":<poll></poll>"},
			dataType: "jsonp",
			timeout: pollingTimeout,
			beforeSend: function() { },
			success: function(data) {
				sm('connected');
				
				if(data != "" && data != undefined) {
					var pos = strpos(data.x, ":");
    		        if(pos !== false) { data.x = data.x.substring(pos+1); }
    				handleData(data.x);
    				polling();
				}
			},
			error: function (data, textStatus, errorThrown) { 
				sm('not_connected');
			}
		});
	};
	
	// Set browser vars
	setBrowserInfo();
	debug(version);
};
