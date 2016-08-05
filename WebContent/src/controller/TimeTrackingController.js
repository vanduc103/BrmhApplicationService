var datavisual = angular.module('brmh', ['ui.bootstrap', 'ngAnimate', 
                                         'ajoslin.promise-tracker', 'cgBusy','angularUtils.directives.dirPagination']);

datavisual.controller('TimeTrackingController', function($scope, $http, $interval) {
	var BASE_URL = "http://localhost:9000/";
//	var BASE_URL = "http://147.47.206.15:19000/";
//	var BASE_URL = "http://147.47.206.15:29001/";
	$scope.message = 'Please Wait...';
	$scope.backdrop = true;
	$scope.promise = null;
	$scope.loading = 'No data found !';
	$scope.inspectList = [];
	$scope.pageno = 1;
	$scope.total_count = 0;
	$scope.itemsPerPage = 10;
	$scope.fromTime = 0;
	$scope.toTime = 0;
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
			        .attr("fill", "white");
		
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
	};
	
	$scope.doInspect = function(pageno) {
		if(pageno === null || pageno === undefined) {
			pageno = 1;
		}
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
		else {
			toTime = toTime.unix() * 1000;
		}
		$scope.fromTime = fromTime; $scope.toTime = toTime;
		//search data
		$scope.inspectList = [];
		$scope.total_count = 0;
		$scope.loading = 'Searching...';
		var url = BASE_URL + 'inspectTime?fromTime=' + fromTime + '&toTime=' + toTime
							+ '&pageIndex=' + pageno + '&pageSize=' + $scope.itemsPerPage;
		$http.get(url).then(function(response) {
			var data = response.data;
			for(var i in data) {
				data[i].index = parseInt(i) + 1 + (pageno - 1) * $scope.itemsPerPage;
				data[i].sectionName = mapSectionName[data[i].sectionId];
				$scope.total_count = data[i].totalResult;
			}
			$scope.inspectList = data;
			if($scope.inspectList.length <= 0) {
				$scope.loading = 'No data found !';
			}
		});
	};
	
	$scope.viewDetail = function(event, sectionId) {
		var fromTime = $scope.fromTime;
		var toTime = $scope.toTime;
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
			content += '</tr>';
			content += '</thead>';
			content += '<tbody>';
			//process data
			for(var i in data) {
				var macAddress = data[i].macAddress;
				var encodedMac = window.btoa(macAddress);
				var showedMac = (macAddress.length > 20) ? (macAddress.slice(0, 20) + "...") : macAddress;
				content += '<tr>';
				content += '<td>' + (parseInt(i)+1) + '</td>';
				content += '<td><a class="a inspectMac" title="Inspect this Mac address" id="mac_'+macAddress+'">' + showedMac + '</a></td>';
				content += '</tr>';
			}
			content += '</tbody>';
			content += '</table>';
			//show the popup
			$('#detail-popup').html(content);
			$('#detail-popup').css('top', event.pageY);
			$('#detail-popup').css('left', event.pageX);
			$('#detail-popup').fadeIn('fast');
		});
	};
	
	$(document).on('click', 'td a.a.inspectMac', function(e) {
    	var id = e.target.id;
    	var inspectMac = id.slice(id.indexOf('_') + 1);
    	//call inspect patient page
    	sessionStorage.setItem("inspectMac", inspectMac);
    	document.location.href = 'patient_tracking.html';
    });
	
	function dateFormat(dateValue, format) {
		var d = moment(dateValue);
		return d.format(format);
	};
	
	$('html').click(function() {
		//Hide the popup
		$('#detail-popup').fadeOut('fast');
	});
	
	//init
	init();
	$('#datetimepicker1, #datetimepicker2').datetimepicker({
		format: 'YYYY-MM-DD HH:mm:ss'
	});
});


