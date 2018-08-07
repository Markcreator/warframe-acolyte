var useTestData = false;

// HTTPS upgrade
if(window.location.toString().startsWith("http://")) {
	window.location = "https://" + window.location.toString().split("//")[1];
}

$(function() {

	// Load tooltips
	$('.tooltipped').tooltip();

	// Register service worker for PWA support
	if("serviceWorker" in navigator) {
		navigator.serviceWorker.register("js/service-worker.js").then(function(registration){
			window.serviceWorker = registration;
		}).catch(function(error) {
			console.warn("Service worker registration failed", error);
		});
	}
	
	// Get which platform
	var url_string = window.location.href;
	var url = new URL(url_string);
	var platform;
	try {
		platform = url.searchParams.get("platform");
	} catch(err) {
	}
	if(platform == null) {
		platform = "pc";
	}
	$("#" + platform).addClass("indigo-text");
	
	// URLs
	var worldStateURLs = {
		"pc": "http://content.warframe.com/dynamic/worldState.php",
		"ps4": "http://content.ps4.warframe.com/dynamic/worldState.php",
		"xbox": "http://content.xb1.warframe.com/dynamic/worldState.php"
	};
	var worldStateURL = worldStateURLs[platform];
	var solNodeURL = "https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json";
	
	// Audio feedback
	var audio = new Audio('sound/sound.mp3');
	audio.volume = localStorage.sound || 0;
	function loadSoundButton(volume) {
		if(!volume) {
			$("#sounds").addClass("red");
			$("#sounds").removeClass("green");
			$("#soundsIcon").text("volume_off");
		
		} else if(volume == 0.33) {
			$("#sounds").addClass("green");
			$("#sounds").removeClass("red");
			$("#soundsIcon").text("volume_down");
			
		} else {
			$("#sounds").addClass("green");
			$("#sounds").removeClass("red");
			$("#soundsIcon").text("volume_up");
		}
	}
	$("#sounds").click(function() {
		if(!localStorage.sound) {
			localStorage.sound = 0.33;
		} else if(localStorage.sound == 0.33) {
			localStorage.sound = 1.0;
		} else {
			delete localStorage.sound;
		}
		
		loadSoundButton(localStorage.sound);
		
		audio.volume = localStorage.sound || 0;
		if(audio.volume != 0) {
			audio.pause();
			audio.currentTime = 0;
			audio.play();
		}
	});
	loadSoundButton(localStorage.sound);
	
	// Night mode
	$("#night").click(function() {
		if($(this).hasClass("amber")) {
			$(this).removeClass("amber");
			$(this).addClass("blue darken-3");
			$("#nightIcon").text("brightness_3");
			localStorage.night = true;
			
			$("body, .nav-wrapper, .card, a").not(".btn, .brand-logo").addClass("darken-4").not("li a").addClass("grey-text");
			$("img").addClass("darkImg");
			
		} else {
			$(this).addClass("amber");
			$(this).removeClass("blue darken-3");
			$("#nightIcon").text("brightness_5");
			delete localStorage.night;
			
			$("body, .nav-wrapper, .card, a").not(".btn, .brand-logo").removeClass("darken-4").not("li a").removeClass("grey-text");
			$("img").removeClass("darkImg");
		}
	});
	if(localStorage.night) {
		$("#night").click();
	}
	
	// Notifications
	$("#notifications").click(function() {
		if($(this).hasClass("red")) {
			Notification.requestPermission().then(function(result) {
				if(result === "granted") {
					$("#notifications").removeClass("red");
					$("#notifications").addClass("green");
					localStorage.notifications = true;
				}
			});

		} else {
			$(this).addClass("red");
			$(this).removeClass("green");
			delete localStorage.notifications;
		}
	});
	if(localStorage.notifications) {
		$("#notifications").click();
	}
	
	// Data
	
	var nodes;
	var worldState;
	var currentAcolytes = {};
	
	var acolytes = {
		"StrikerAcolyte": {
			"name": "Angst",
			disc: false,
			"mods": [
				"Body Count (51.52%)",
				"Repeater Clip (22.22%)",
				"Spring-Loaded Chamber (22.22%)",
				"Pressurized Magazine (4.04%)"
			]
		},
		"HeavyAcolyte": {
			"name": "Malice",
			disc: false,
			"mods": [
				"Focused Defense (51.52%)",
				"Guided Ordnance (22.22%)",
				"Targeting Subsystem (22.22%)",
				"Narrow Barrel (4.04%)"
			]
		},
		"RogueAcolyte": {
			"name": "Mania",
			disc: false,
			"mods": [
				"Catalyzer Link (51.52%)",
				"Embedded Catalyzer (22.22%)",
				"Weeping Wounds (22.22%)",
				"Nano-Applicator (4.04%)"
			]
		},
		"AreaCasterAcolyte": {
			"name": "Misery",
			disc: false,
			"mods": [
				"Focused Defense (25.38%)",
				"Body Count (8.57%)",
				"Catalyzer Link (8.57%)",
				"Hydraulic Crosshairs (8.57%)",
				"Shrapnel Shot (8.57%)",
				"Bladed Rounds (3.70%)",
				"Blood Rush (3.70%)",
				"Embedded Catalyzer (3.70%)",
				"Guided Ordnance (3.70%)",
				"Laser Sight (3.70%)",
				"Repeater Clip (3.70%)",
				"Sharpened Bullets (3.70%)",
				"Spring-Loaded Chamber (3.70%)",
				"Targeting Subsystem (3.70%)",
				"Weeping Wounds (3.70%)",
				"Argon Scope (0.67%)",
				"Maiming Strike (0.67%)",
				"Nano-Applicator (0.67%)",
				"Narrow Barrel (0.67%)",
				"Pressurized Magazine (0.67%)"
			]
		},
		"ControlAcolyte": {
			"name": "Torment",
			disc: false,
			"mods": [
				"Hydraulic Crosshairs (51.52%)",
				"Blood Rush (22.22%)",
				"Laser Sight (22.22%)",
				"Argon Scope (4.04%)"
			]
		},
		"DuellistAcolyte": {
			"name": "Violence",
			disc: false,
			"mods": [
				"Shrapnel Shot (51.52%)",
				"Bladed Rounds (22.22%)",
				"Sharpened Bullets (22.22%)",
				"Maiming Strike (4.04%)"
			]
		}
	};
	var acolyteOrder = [
		"Angst",
		"Malice",
		"Mania",
		"Misery",
		"Torment",
		"Violence"
	];
	
	// Fetch data from URLs and start update loop	
	getJSON(solNodeURL, function(nodeJSON) {
		nodes = nodeJSON;

		acolyteUpdate();
		loopCountdownUpdate(30, acolyteUpdate);
	});
	
	// Functions
	
	function getJSON(url, callback) {
		$.getJSON('https://whateverorigin.herokuapp.com/get?url=' + encodeURIComponent(url) + '&callback=?', function(data) {
			callback(JSON.parse(data.contents));
		});
	}
	
	function escapeHtml(unsafe) {
		return unsafe
			 .replace(/&/g, "&amp;")
			 .replace(/</g, "&lt;")
			 .replace(/>/g, "&gt;")
			 .replace(/"/g, "&quot;")
			 .replace(/'/g, "&#039;");
	}
	
	// Update countdown function
	function loopCountdownUpdate(seconds, callback, timesLeft) {
		if(typeof(timesLeft) == 'undefined') {
			timesLeft = seconds;
		}
		$("#counter").text(timesLeft != 0 ? ('Updating in: ' + timesLeft + 's') : "");
		
		if(timesLeft == 0) {
			callback();
			loopCountdownUpdate(seconds, callback);
			
		} else {
			setTimeout(function() { loopCountdownUpdate(seconds, callback, timesLeft-1); }, 1000);
		}		
	}
	
	// Hidden Acolyte card builder
	function hiddenAcolyte(name) {
		var output = [];
		output.push('<div id="acolyte-' + name + '" class="card grey lighten-4 horizontal hoverable">');

		output.push('<div class="card-content flow-text">');
		output.push("	" + name.toUpperCase() + "	<a id='show-" + name + "' name='" + name + "' class='pointer'>(Show)</a>");
		output.push('</div>');
		
		return output.join("");
	}
	
	// Function to render all Acolyte cards
	function render() {
		$("#acolytes").empty();
		currentAcolytes = {};
		
		var acolyteList = worldState.PersistentEnemies;
		// Test data
		if(useTestData) {
			acolyteList = [{
				Icon: "/DuellistAcolyte.png",
				Discovered: Math.random() >= 0.5,
				HealthPercent: 0.789,
				LastDiscoveredLocation: "SolNode23"
			},
			{
				Icon: "/HeavyAcolyte.png",
				Discovered: Math.random() >= 0.5,
				HealthPercent: 0.123,
				LastDiscoveredLocation: "SolNode24"
			}];
		}
		for(var i = 0; i < acolyteList.length; i++) {
			var aco = acolyteList[i];
			
			var acoName = aco.Icon.split("/")[aco.Icon.split("/").length-1].split(".png")[0];
			var name = acolytes[acoName].name;
			var disc = aco.Discovered;
			var health = aco.HealthPercent;
			var mods = acolytes[acoName].mods;
			var location = disc ? escapeHtml(nodes[aco.LastDiscoveredLocation].value + " [" + nodes[aco.LastDiscoveredLocation].type + "]") : "Unknown";
			
			if(acolytes[acoName].disc != disc) {
				acolytes[acoName].disc = disc;
				
				if($("#sounds").hasClass("green")) {
					if(!localStorage["hide-" + name]) {
						audio.play();
					}
				}
				if($("#notifications").hasClass("green")) {
					if(!localStorage["hide-" + name]) {
						notifyAcolyte(acoName, name, disc, location);
					}
				}
			}
				
			var output = [];
			output.push('<div id="acolyte-' + name + '" class="card grey lighten-4 horizontal hoverable">');
			output.push('	<div class="card-image">');
			output.push('		<img src="img/' + acoName + '.png">');
			output.push('	</div>');
			output.push('	<div class="card-stacked">');
			output.push('		<div class="card-content flow-text">');
			output.push("			" + name.toUpperCase() + "	<a id='hide-" + name + "' name='" + name + "' class='pointer'>(Hide)</a>	<a class='right' target='_blank' href='http://warframe.wikia.com/wiki/" + name + "'>Wiki page</a>");
			output.push('			<div class="progress grey darken-2"> <div class="determinate health" style="width: ' + (health * 100) + '%"></div> </div>');
			output.push("			<span class='red-text'>Health: " + (health * 100).toFixed(2) + "%</span>");
			output.push("			<br/>");
			output.push("			Location: " + location);
			output.push("			<br/>");
			output.push("			<a class='dropdown-button btn waves-effect waves-light grey darken-3 grey-text' data-beloworigin='true' data-activates='dropdown-" + name + "'>Drops</a>");
			output.push("			<ul id='dropdown-" + name + "' class='dropdown-content'>");
			var x = 0;
			for(var x = 0; x < mods.length; x++) {
			output.push("				<li><a target='_blank' href='http://warframe.wikia.com/wiki/" + mods[x].split(" (")[0].replace(" ", "_") + "' class='grey lighten-4 grey-text text-darken-1'>" + mods[x] + "</a></li>");
			}
			output.push("			</ul");
			output.push('		</div>');
			output.push('	</div>');
			output.push('</div>');
			
			currentAcolytes[name] = output.join("");
		}
		
		if(acolyteList.length == 0) {
			var output = [];
			output.push('<div class="card grey lighten-4 hoverable">');
			output.push('	<div class="card-content flow-text red-text">');
			output.push('		No Acolytes are around yet. Soon™');
			output.push('	</div>');
			output.push('</div>');
			
			$("#acolytes").append(output.join(""));
			
		} else {
			function show() {
				var name = $(this).attr("name");
							
				delete localStorage["hide-" + name];
				render();
			}
			
			function hide() {
				var name = $(this).attr("name");
							
				localStorage["hide-" + name] = true;
				render();
			}
			
			for(var x = 0; x < acolyteOrder.length; x++) {
				var name = acolyteOrder[x];
				
				if(typeof(currentAcolytes[name]) != 'undefined') {
					if(!localStorage["hide-" + name]) {
						$("#acolytes").append(currentAcolytes[name]);
					
						$("#hide-" + name).click(hide);
						
					} else {
						$("#acolytes").append(hiddenAcolyte(name));
						
						$("#show-" + name).click(show);
					}
				}
			}
		}
		
		$('.dropdown-button').dropdown({
			constrainWidth: false
		});
		
		//Night mode
		if($("#night").hasClass("blue")) {
			$(".card, a").not(".btn, .brand-logo").addClass("darken-4").not("li a").addClass("grey-text");
			$("img").addClass("darkImg");
		}
	}
	
	// UI refreshing behaviour
	function acolyteUpdate() {
		$("#loader").show();
		$("#counter").hide();
		
		getJSON(worldStateURL, function(worldStateJSON) {
			worldState = worldStateJSON;

			render();
			
			$("#loader").hide();
			$("#counter").show();
		});
	}
	
	// Notification behaviour
	function notifyAcolyte(acoName, name, disc, location) {
		var title = "Acolyte Tracker";
		var options = {
			icon: 'img/' + acoName + '.png',
			body: name.toUpperCase() + "'s location is now:\n" + location
		};
		
		if (!("Notification" in window)) {
			return;
		
		} else if (Notification.permission === "granted") {
			var notification = new Notification(title, options);
		
		} else if (Notification.permission !== 'denied') {
			Notification.requestPermission(function (permission) {
				if (permission === "granted") {
					var notification = new Notification(title, options);
				}
			});
		}
		
		// Else no notifications
	}
});