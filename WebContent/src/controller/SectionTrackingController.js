var datavisual = angular.module('brmh', ['ui.bootstrap', 'ngAnimate', 'ajoslin.promise-tracker', 'cgBusy']);

datavisual.controller('SectionTrackingController', function($scope, $http, $interval) {
	var BASE_URL = "http://localhost:9000/";
	//var BASE_URL = "http://147.47.206.15:19000/";
	$scope.message = 'Please Wait...';
	$scope.backdrop = true;
	$scope.promise = null;
	$scope.loading = 'No data found !';
	$scope.searchSectionName = "";
	$scope.inspectList = [];
	$scope.numberOfPeople = "";
	var sectionId = 0; //default
	var mapSectionName = 
	{"1": "출입구","2":"복도", "3":"환자대기실","4":"복도 및 출입구","5":"경증환자실","6":"복도 및 중증환자실","7":"중증환자실"};
	
	//init variable
	var width = 525,
    height = 427,
    centered;
	
	var xScale = d3.scale.linear()
    				.domain([0,624])
					.range([0,width]);
	var yScale = d3.scale.linear()
    			.domain([0,527])
				.range([0,height]);
	var scaleWidth = xScale.range()[1] - xScale.range()[0];
    var scaleHeight = yScale.range()[1] - yScale.range()[0];

	var svg = d3.select("#brmh").append("svg")
	    .attr("width", scaleWidth)
	    .attr("height", scaleHeight)
		.append("g");
	var g = svg.append("g");
	var centerJson = [];
	var circleSelection;
	//function init
	var init = function() {
		//draw polygon
		var lineFunction = d3.svg.line()
		                        .x(function(d) { return xScale(d.x); })
		                        .y(function(d) { return yScale(d.y); })
		                        .interpolate("linear");
	
		d3.json("../json/polygon_data.json", function(error, polygon) {
			if(error) {
				alert(error);
			}
			//data from polygonData is push to lineFunction to draw line
			g.append("g")
					.selectAll("path")
					.data(polygon.section)
					.enter()
					.append("path")
					.attr("d", lineFunction)
					.attr("stroke", "blue")
			        .attr("stroke-width", 2)
			        .attr("fill", "white")
			        .on("click", clicked);
		
			var text = g.append("g").selectAll("text")
									.data(polygon.text)
									.enter()
									.append("text");
			//for rotate -> not set x, y but set translate in transform attr.
			var textLabels = text
								.text(function(d) {return d[0].text})
								.attr("font-family", "sans-serif")
								.attr("font-size", function(d) {return d[0].fontSize})
								.attr("transform", function(d) {return "translate (" + xScale(d[0].x) + "," + yScale(d[0].y) + ") rotate("+d[0].transform+")"} )
								.attr("fill", "black")
								.style("opacity", 0.5);
		});
		
		function clicked(d_selected, i) {
			var x, y, k;
			//selected
			g.selectAll("path")
		      .classed("selected", function(d) { return d === d_selected; });
			//set sectionId
			sectionId = i + 1;
			//set sectionName
			$scope.searchSectionName = mapSectionName[sectionId];
		}
	};
	
	$scope.doInspect = function() {
		//get time
		var fromTime = $("#datetimepicker1").data("DateTimePicker").date();
		if(fromTime === null) {
			alert('You must input Date Time !');
			return false;
		}
		fromTime = fromTime.unix() * 1000;
		var toTime = $("#datetimepicker2").data("DateTimePicker").date();
		if(toTime === null) {
			toTime = new Date().getTime();
		}
		if(sectionId === 0) {
			alert('You must choose a section by click on the left map !');
			return false;
		}
		//search data
		$scope.inspectList = [];
		$scope.loading = 'Searching...';
		$scope.numberOfPeople = 'Calculating...';
		var url = BASE_URL + 'inspectSection?fromTime=' + fromTime + '&toTime=' + toTime
						+ '&sectionId=' + sectionId;
		$http.get(url).then(function(response) {
			var data = response.data;
			for(var i in data) {
				data[i].index = parseInt(i)+1;
				data[i].sectionName = mapSectionName[data[i].sectionId];
				var macAddress = data[i].macAddress;
				var encodedMac = window.btoa(macAddress);
				data[i].encodedMac = macAddress;
				//process period of time
				var periodOfTime = data[i].periodOfTime;
				var second = periodOfTime / 1000; //second
				var minute = Math.round(second/60);
				var hour = Math.round(minute/60);
				var periodOfTimeFormatted = (hour>0) ? hour + ' hour(s)'
											: (minute>0) ? minute + ' minute(s)'
													: second + ' seconds';
				data[i].periodOfTime = periodOfTimeFormatted;
			}
			$scope.inspectList = data;
			if($scope.inspectList.length <= 0) {
				$scope.loading = 'No data found !';
			}
			$scope.numberOfPeople = $scope.inspectList.length;
		});
	};
	
	$scope.inspectMac = function(macAddress) {
		//call inspect patient page
    	sessionStorage.setItem("inspectMac", macAddress);
    	document.location.href = 'patient_tracking.html';
	}
	
	//init
	init();
	$('#datetimepicker1, #datetimepicker2').datetimepicker({
		format: 'YYYY-MM-DD HH:mm:ss'
	});
});


