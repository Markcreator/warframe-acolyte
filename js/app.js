$(function() {
	var worldStateURL = "http://content.warframe.com/dynamic/worldState.php";
	var solNodeURL = "http://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json";
	
	var nodes;
	var worldState;
	
	var acolyteNames = {
		"StrikerAcolyte": "Angst",
		"HeavyAcolyte": "Malice",
		"RogueAcolyte": "Mania",
		"AreaCasterAcolyte": "Misery",
		"ControlAcolyte": "Torment",
		"DuellistAcolyte": "Violence"
	};
	
	getJSON(solNodeURL, function(nodeJSON) {
		nodes = nodeJSON;

		acolyteUpdate();
		loopCountdownUpdate(30, acolyteUpdate);
	});
	
	function getJSON(url, callback) {
		$.getJSON('http://www.whateverorigin.org/get?url=' + encodeURIComponent(url) + '&callback=?', function(data) {
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
	
	function acolyteUpdate() {
		$("#loader").show();
		$("#counter").hide();
		
		getJSON(worldStateURL, function(worldStateJSON) {
			worldState = worldStateJSON;

			$("#acolytes").empty();
			
			var acolyteList = worldState.PersistentEnemies;
			for(var i = 0; i < acolyteList.length; i++) {
				var aco = acolyteList[i];
				
				var acoName = aco.Icon.split("/")[aco.Icon.split("/").length-1].split(".png")[0];
				var name = acolyteNames[acoName];
				var disc = aco.Discovered;
				var health = aco.HealthPercent;
				
				var output = [];
				output.push('<div class="card horizontal hoverable">');
				output.push('	<div class="card-image">');
				output.push('		<img src="img/' + acoName + '.png">');
				output.push('	</div>');
				output.push('	<div class="card-stacked">');
				output.push('		<div class="card-content flow-text">');
				output.push("			" + name.toUpperCase() + "	<a class='right' target='_blank' href='http://warframe.wikia.com/wiki/" + name + "'>Wiki page</a>");
				output.push('			<div class="progress grey"> <div class="determinate red" style="width: ' + (health * 100) + '%"></div> </div>');
				output.push("			<span class='red-text'>Health: " + (health * 100).toFixed(1) + "%</span>");
				output.push("			<br/>");
				output.push("			Location: " + (disc ? escapeHtml(nodes[aco.LastDiscoveredLocation].value) : "Unknown"));
				output.push('		</div>');
				output.push('	</div>');
				output.push('</div>');
				
				$("#acolytes").append(output.join(""));
			}
			
			if(acolyteList.length == 0) {
				var output = [];
				output.push('<div class="card hoverable">');
				output.push('	<div class="card-content flow-text">');
				output.push('		No Acolytes are currently around...');
				output.push('	</div>');
				output.push('</div>');
				
				$("#acolytes").append(output.join(""));
			}
			
			$("#loader").hide();
			$("#counter").show();
		});
	}
});