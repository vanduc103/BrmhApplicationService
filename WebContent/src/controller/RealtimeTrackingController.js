var datavisual = angular.module('brmh', ['ui.bootstrap', 'ngAnimate', 'ajoslin.promise-tracker', 'cgBusy']);

datavisual.controller('RealtimeTrackingController', function($scope, $http, $interval) {
	var BASE_URL = "http://localhost:9000/";
	//var BASE_URL = "http://147.47.206.15:19000/";
	$scope.message = 'Please Wait...';
	$scope.backdrop = true;
	$scope.promise = null;
	
	var mapSectionName = 
		{"1": "출입구","2":"복도", "3":"환자대기실","4":"복도 및 출입구","5":"경증환자실","6":"복도 및 중증환자실","7":"중증환자실"};
	
	//make from time and to time
	var curDate = new Date();
	
	//to time = current date and time
	var toTime = curDate.getTime();
	//fromTime = toTime - 15 minutes
	//var fromTime = toTime - 15*60*1000;
	var fromTime = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()-10, 0, 0, 0).getTime();
	
	//init variable
	var width = 624,
    height = 527,
    centered;

	var svg = d3.select("#brmh").append("svg")
	    .attr("width", width)
	    .attr("height", height)
		.call(d3.behavior.zoom().on("zoom", function () {
	        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
	      }))
		.append("g");
	var g = svg.append("g");
	var centerJson = [];
	//function init
	var init = function() {
		//draw polygon
		var lineFunction = d3.svg.line()
		                        .x(function(d) { return d.x; })
		                        .y(function(d) { return d.y; })
		                        .interpolate("linear");
	
		d3.json("../json/polygon_data.json", function(error, polygon) {
			if(error) {
				alert(error);
			}
			// Define the div for the tooltip
			var div = d3.select("body").append("div")	
			    .attr("class", "tooltip")				
			    .style("opacity", 0);
			//data from polygonData is push to lineFunction to draw line
			var polygonText = polygon.text;
			g.append("g")
					.selectAll("path")
					.data(polygon.section)
					.enter()
					.append("path")
					.attr("d", lineFunction)
					.attr("stroke", "blue")
			        .attr("stroke-width", 2)
			        .attr("fill", "white")
					.on("click", clicked)
					.on("mouseover", function(d, i) {
						div.transition()
			                .duration(200)
			                .style("opacity", .9);
						div.html(polygonText[i][0].text)
							.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY - 28) + "px")
					})
					.on("mouseout", function(d) {
						div.transition()
		                	.duration(500)
		                	.style("opacity", 0);
					});
		
			var text = g.append("g").selectAll("text")
									.data(polygon.text)
									.enter()
									.append("text")
									.on("click", clicked);
			//for rotate -> not set x, y but set translate in transform attr.
			var textLabels = text
								.text(function(d) {return d[0].text})
								.attr("font-family", "sans-serif")
								.attr("font-size", function(d) {return d[0].fontSize})
								.attr("transform", function(d) {return "translate (" + d[0].x + "," + d[0].y + ") rotate("+d[0].transform+")"} )
								.attr("fill", "black")
								.style("opacity", 0.5);
			centerJson = polygon.center;
		});
	
		function cal_centroid(data) {
			var sumx = 0, sumy = 0, count = 0;
			for(var i in data) {
				sumx += data[i].x;
				sumy += data[i].y;
				count++;
			}
			if(count === 0) {
				count = 1;
			}
			return [sumx/count, sumy/count];
		}
	
		function clicked(d) {
			var x, y, k;
	
		  if (d && centered !== d) {
		    var centroid = cal_centroid(d);
		    x = centroid[0];
		    y = centroid[1];
		    k = 2;
		    centered = d;
		  } else {
		    x = width / 2;
		    y = height / 2;
		    k = 1;
		    centered = null;
		  }
		  g.selectAll("path")
		      .classed("selected", centered && function(d) { return d === centered; });
	
		  svg.transition()
		      .duration(750)
		      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
		      .style("stroke-width", 1.5 / k + "px");
		}
		
		
	};
	function mouseovered(active, i) {
		g.selectAll("path")
	      .classed("active", function(d) { return d === active; });
		
	};
	
	function mouseouted(out) {
		g.selectAll("path")
	      .classed("none", function(d) { return d === out; });
	};
	
	$scope.realTimeTracking = function() {
		var peopleInSection = {};
		var sectionArr = [];
		//remove old elements
		d3.selectAll(".myCircleText").remove();
		//create new elements
		var url = BASE_URL + 'countPeople?fromTime=' + fromTime + '&toTime=' + toTime;
		$http.get(url).then(function(response) {
			var data = response.data;
			for(var i in data) {
				var peopleCount = data[i].peopleCount;
				var sectionId = data[i].sectionId;
				sectionArr.push(sectionId);
				peopleInSection[sectionId] = peopleCount;
			}
			//display on map
			var imageWidth = 40, imageHeight = 40;
			var circleRadius = 10;
			var fontSize = 12;
			for(var i in sectionArr) {
				var sectionId = sectionArr[i];
				var center = [];
				center.push(centerJson[sectionId - 1]);
				var peopleCount = peopleInSection[sectionId];
				if(peopleCount < 2) {
					imageWidth = imageHeight = 30;
					circleRadius = 8;
					fontSize = 12;
				}
				else {
					imageWidth = imageHeight = 40;
					circleRadius = 10;
					fontSize = 13;
				}
				
				var elem = svg.selectAll("g myCircleText")
					.data(center);
				var elemEnter = elem.enter()
			    	.append("g")
			    	.attr("class", "myCircleText")
			    	.attr("transform", function(d){return "translate("+d.cx+","+d.cy+")"});
				//add image
				var image = elemEnter
	                .append("svg:image")
	                .attr("xlink:href", "../images/people_icon.png")
	                .attr("x", function(d){return - imageWidth/2;})
	                .attr("y", function(d){return - imageHeight/2;})
	                .attr("width", imageWidth)
	                .attr("height", imageHeight)
	                .on("click", viewDetail);
				//add circle
				var circleX = circleY = circleRadius*1.5;
				var circle = elemEnter
					.append("circle")
	                .attr("cx", function(d){return circleX})
	                .attr("cy", function(d){return circleY})
	                .attr("r", circleRadius)
	                .style("fill", "orange");
				//add text on circle
				var text = elemEnter
					.append("text")
					.attr("x", function(d){return circleX})
					.attr("y", function(d){return circleY + 5})
					.text(""+peopleCount)
					.attr("font-family", "sans-serif")
					.attr("font-size", fontSize+"px")
					.style("font-weight", "bold")
					.attr("text-anchor", "middle")
					.attr("fill", "black");
			}
		});
	};
	
	function paddingZero(numberValue) {
		if(numberValue < 10) {
			return '0' + numberValue;
		}
		return numberValue;
	}
	
	function dateFormat(dateValue, format) {
		var d = new Date(dateValue);
		//format hh:mm:ss
		if(format === 'hh:mm:ss') {
			return paddingZero(d.getHours()) + ':' 
					+ paddingZero(d.getMinutes()) + ':' 
					+ paddingZero(d.getSeconds());
		}
	}
	
	$scope.realTimeTrackingDetail = function(sectionId, x, y) {
		var url = BASE_URL + 'getPeopleDetail?sectionId='+sectionId
							+'&fromTime=' + fromTime + '&toTime=' + toTime;
		$http.get(url).then(function(response) {
			var data = response.data;
			//content to show on popup
			var content = '';
			content += '<h3>' + mapSectionName[sectionId] + '</h3>';
			content += '<table class="table table-bordered" style="width:100%">';
			content += '<thead>';
			content += '<tr>';
			content += '<th style="width:10px">#</th>';
			content += '<th>MAC address</th>';
			//content += '<th>From</th>';
			//content += '<th>Period</th>';
			content += '</tr>';
			content += '</thead>';
			content += '<tbody>';
			//process data
			for(var i in data) {
				var macAddress = data[i].macAddress;
				var encodedMac = window.btoa(macAddress);
				/*var firstTime = data[i].firstTime;
				var periodOfTime = data[i].periodOfTime;
				var second = periodOfTime / 1000; //second
				var minute = Math.round(second/60);
				var hour = Math.round(minute/60);
				var periodOfTimeFormatted = (hour>0) ? hour + ' hour(s)'
											: (minute>0) ? minute + ' minute(s)'
													: second + ' seconds';*/
				content += '<tr>';
				content += '<td>' + (parseInt(i)+1) + '</td>';
				content += '<td><a class="a inspectMac" id="mac_'+macAddress+'">' + macAddress + '</a></td>';
				//content += '<td>' + dateFormat(firstTime,'hh:mm:ss') + '</td>';
				//content += '<td>' + periodOfTimeFormatted + '</td>';
				content += '</tr>';
			}
			content += '</tbody>';
			content += '</table>';
			//show the popup
			$('#section-popup').html(content);
			$('#section-popup').css('top', y);
			$('#section-popup').css('left', x);
			$('#section-popup').fadeIn('fast');
		});
	};
	
	$(document).on('click', 'td a.a.inspectMac', function(e) {
    	var id = e.target.id;
    	var inspectMac = id.slice(id.indexOf('_') + 1);
    	//call inspect patient page
    	sessionStorage.setItem("inspectMac", inspectMac);
    	document.location.href = 'patient_tracking.html';
    });
	
	$('html').click(function() {
		//Hide the popup
		$('#section-popup').fadeOut('fast');
	});
	
	function viewDetail(d) {
		var sectionId = d.sectionId;
		$scope.realTimeTrackingDetail(sectionId, d3.event.pageX, d3.event.pageY);
	};
	
	//init
	init();
	$scope.realTimeTracking();
	//cycle
	$interval($scope.realTimeTracking, 3 * 10 * 1000);
});