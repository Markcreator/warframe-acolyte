$(function() {

	// Register service worker for PWA support
	if("serviceWorker" in navigator) {
		navigator.serviceWorker.register("js/service-worker.js").then(function(registration){
			window.serviceWorker = registration;
		}).catch(function(error) {
			console.warn("Service worker registration failed", error);
		});
	}

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
	
	var worldStateURLs = {
		"pc": "http://content.warframe.com/dynamic/worldState.php",
		"ps4": "http://content.ps4.warframe.com/dynamic/worldState.php",
		"xbox": "http://content.xb1.warframe.com/dynamic/worldState.php"
	};
	var worldStateURL = worldStateURLs[platform];
	var solNodeURL = "https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json";
	
	//Audio feedback
	var audio = new Audio('sound/sound.mp3');
	audio.volume = 0.33;
	$("#sounds").click(function() {
		if($(this).hasClass("green")) {
			$(this).removeClass("green");
			$(this).addClass("red");
			$("#soundsIcon").text("volume_off");
			localStorage.muted = true;
		} else {
			$(this).addClass("green");
			$(this).removeClass("red");
			$("#soundsIcon").text("volume_up");
			delete localStorage.muted;
		}
	});
	if(localStorage.muted) {
		$("#sounds").click();
	}
	
	//Night mode
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
	
	//
	
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
	
	getJSON(solNodeURL, function(nodeJSON) {
		nodes = nodeJSON;

		acolyteUpdate();
		loopCountdownUpdate(30, acolyteUpdate);
	});
	
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
	
	function hiddenAcolyte(name) {
		var output = [];
		output.push('<div id="acolyte-' + name + '" class="card grey lighten-4 horizontal hoverable">');

		output.push('<div class="card-content flow-text">');
		output.push("	" + name.toUpperCase() + "	<a id='show-" + name + "' name='" + name + "' class='pointer'>(Show)</a>");
		output.push('</div>');
		
		return output.join("");
	}
	
	function render() {
		$("#acolytes").empty();
		currentAcolytes = {};
		
		var acolyteList = worldState.PersistentEnemies;
		for(var i = 0; i < acolyteList.length; i++) {
			var aco = acolyteList[i];
			
			var acoName = aco.Icon.split("/")[aco.Icon.split("/").length-1].split(".png")[0];
			var name = acolytes[acoName].name;
			var disc = aco.Discovered;
			var health = aco.HealthPercent;
			var mods = acolytes[acoName].mods;
			
			if(acolytes[acoName].disc != disc) {
				acolytes[acoName].disc = disc;
				
				if($("#sounds").hasClass("green")) {
					if(!localStorage["hide-" + name]) {
						audio.play();
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
			output.push('			<div class="progress grey darken-1"> <div class="determinate red" style="width: ' + (health * 100) + '%"></div> </div>');
			output.push("			<span class='red-text'>Health: " + (health * 100).toFixed(2) + "%</span>");
			output.push("			<br/>");
			output.push("			Location: " + (disc ? escapeHtml(nodes[aco.LastDiscoveredLocation].value + " [" + nodes[aco.LastDiscoveredLocation].type + "]") : "Unknown"));
			output.push("			<br/>");
			output.push("			<a class='dropdown-button btn grey darken-3 grey-text' data-beloworigin='true' data-activates='dropdown-" + name + "'>Drops</a>");
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
			output.push('	<div class="card-content flow-text">');
			output.push('		No Acolytes are currently around...');
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
});