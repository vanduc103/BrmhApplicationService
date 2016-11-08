var datavisual = angular.module('brmh', ['ui.bootstrap', 'ngAnimate', 
                                         'ajoslin.promise-tracker', 'cgBusy', 'angularUtils.directives.dirPagination']);

datavisual.controller('PatientTrackingController', function($scope, $http, $interval) {
	var BASE_URL = "http://localhost:9000/";
//	var BASE_URL = "http://147.47.206.15:19000/";
//	var BASE_URL = "http://147.47.206.15:29001/";
	$scope.message = 'Please Wait...';
	$scope.backdrop = true;
	$scope.promise = null;
	$scope.loading = 'No data found !';
	var timeFormat = 'MM/DD/YYYY HH:mm:ss';
	var sectionList = [];
	var sectionAnimationList = [];
	$scope.inspectList = [];
	$scope.pageno = 1;
	$scope.total_count = 0;
	$scope.itemsPerPage = 10;
	$scope.encodedMac = "";
	var inspectMacAddress = "";
	var inspectFromTime = 0;
	var inspectToTime = 0;
	var mapSectionName = 
	{"1": "출입구","2":"복도", "3":"환자대기실","4":"복도 및 출입구","5":"경증환자실","6":"복도 및 중증환자실","7":"중증환자실"};
	
	//get inspect mac from another page
	var otherPageInspectMac = sessionStorage.getItem("inspectMac");
	if(otherPageInspectMac !== undefined && otherPageInspectMac !== '') {
		$("#searchMac").val(otherPageInspectMac);
	}
	
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
			        .on("mouseover", mouseovered);
		
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
					
			centerJson = polygon.center;
		});
		
		function mouseovered(active, i) {
			
		};
	};
	
	$scope.doInspect = function(pageno) {
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
		var macAddress = $("#searchMac").val();
		if(macAddress.trim() === '') {
			alert('You must input MAC address !');
			return false;
		}
		inspectFromTime = fromTime;
		inspectToTime = toTime;
		inspectMacAddress = macAddress;
		//encode mac address
		$scope.encodedMac = macAddress;//window.btoa(macAddress);
		//search data
		$scope.inspectList = [];
		$scope.total_count = 0;
		$scope.loading = 'Searching...';
		//clear highlight
		d3.select("#animationPerson").remove();
		//search condition
		var url = BASE_URL + 'inspectMac?fromTime=' + fromTime + '&toTime=' + toTime
						+ '&macAddress=' + macAddress
						+ '&pageIndex=' + pageno + '&pageSize=' + $scope.itemsPerPage;
		$http.get(url).then(function(response) {
			var data = response.data;
			sectionList = []; //reset
			for(var i in data) {
				data[i].index = parseInt(i) + 1 + (pageno - 1) * $scope.itemsPerPage;
				data[i].sectionName = mapSectionName[data[i].sectionId];
				sectionList = data[i].sectionList;
				data[i].peopleContacted = 'Calculating...';
				$scope.total_count = data[i].totalResult;
			}
			$scope.inspectList = data;
			if($scope.inspectList.length <= 0) {
				$scope.loading = 'No data found !';
				return;
			}
			//show hightlight
			g.selectAll("path").classed("selected", false);
			//highlight section
			g.selectAll("path")
		      .classed("selected", function(d, i) {a = sectionList.indexOf(parseInt(i+1)) > -1;return a;});
			//get section animation list by loop inspectList inverse
			sectionAnimationList = []; //reset
			var inspectListLength = data.length;
			for(var i = inspectListLength-1; i >= 0; i--) {
				sectionAnimationList.push({'sectionId':data[i].sectionId, 'fromTime':data[i].fromTime});
				if(i === 0) {
					//add the to time with the last section
					sectionAnimationList.push({'sectionId':data[i].sectionId, 'fromTime':data[i].toTime});
				}
			}
			//get patient contacted in each section and each period of time
			var inspectList = $scope.inspectList;
			var paramList = ""; //create paramList to request server
			for(var i in inspectList) {
				paramList += inspectList[i].fromTime + ","
							+ inspectList[i].toTime + ","
							+ inspectList[i].sectionId + ",";
			}
			//remove last separate char
			paramList = paramList.slice(0, paramList.length - 1);
			if(paramList.length === 0) return;
			//request server
			$http({
			    method: 'POST',
			    url: BASE_URL + 'countPeopleContacted',
			    data: "paramList=" + paramList,
			    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).then(function(response) {
				var data = response.data;
				//add to inspectList
				for(var i in inspectList) {
					inspectList[i].peopleContacted = data[i].peopleContacted;
				}
			});
		});
	};
	
	//define basic paths on map
	var basicPaths = [[2,1],[2,4],[2,3,5],[2,6,7]];
	//draw animation
	$scope.doAnimate = function() {
		var length = sectionAnimationList.length;
		if(length === 0) return;
		//set first position
		var sectionId = sectionAnimationList[0].sectionId;
		var fromTime = sectionAnimationList[0].fromTime;
		var fromTimeFormated = dateFormat(fromTime, timeFormat);
		var cx = xScale(centerJson[sectionId - 1].cx);
		var cy = yScale(centerJson[sectionId - 1].cy);
		
		d3.select("#animationPerson").remove();
		circleSelection = g
			.append("g")
			.attr("id", "animationPerson")
			.attr("transform", function(d) {return "translate("+cx+","+cy+")"});
		circleSelection
			.append("circle")
	        .attr("r", 10)
	        .style("fill", "red");
		var textSelection = circleSelection
    		.append("text")
    		.attr("id", "animationText")
			.attr("x", 0)
			.attr("y", -10)
			.text(""+fromTimeFormated)
			.attr("font-family", "sans-serif")
			.attr("font-size", "12px")
			.style("font-weight", "normal")
			.attr("text-anchor", "middle")
			.attr("fill", "black");
		//loop for sectionList to make animation
		var preSection = sectionId;
		for(var i = 1;i < length; i++) {
			var sectionId = sectionAnimationList[i].sectionId;
			var fromTime = sectionAnimationList[i].fromTime;
			var fromTimeFormated = dateFormat(fromTime, timeFormat);
			//calculate all paths from preSection to current sectionId
			//based on basic paths
			var path1 = '', path2 = '';
			for(var j in basicPaths) {
				var index1 = basicPaths[j].indexOf(preSection);
				var index2 = basicPaths[j].indexOf(sectionId);
				//case: preSection and sectionId both in 1 basic path
				if(index1 > -1 && index2 > -1) {
					for(k=index1; (index1<=index2) ? k <= index2 : k>=index2; 
									(index1<=index2) ? k++ : k--) {
						path1 += basicPaths[j][k] + ',';
						path2 = '';
					}
					break;
				}
				//case: preSection and sectionId in 2 basic paths
				//get the path for each through section 2
				else {
					if(index1 > -1) {
						//reverse the basic path
						for(var k=index1; k >= 0; k--) {
							path1 += basicPaths[j][k] + ',';
						}
					}
					else if(index2 > -1) {
						//follow the basic path (not count first section)
						for(var k=1; k <= index2; k++) {
							path2 += basicPaths[j][k] + ',';
						}
					}
				}
			}
			var path = path1 + path2;
			path = path.slice(0, path.length - 1);
			var sectionsOnPath = path.split(',');
			
			for(var k in sectionsOnPath) {
				var sectionId = sectionsOnPath[k];
				var cx = xScale(centerJson[sectionId - 1].cx);
				var cy = yScale(centerJson[sectionId - 1].cy);
				
				circleSelection = circleSelection
									.transition().duration(2000)
									.attr("transform", function(d) {return "translate("+cx+","+cy+")"});
				textSelection = textSelection
								.transition().duration(2000)
								.text("" + fromTimeFormated);
			}
			//update preSection
			preSection = parseInt(sectionId);
		}
	};
	
	$(document).on('click', 'td a.a.inspectMac', function(e) {
    	var id = e.target.id;
    	var macAddress = id.slice(id.indexOf('_') + 1);
    	//inspect
    	$("#searchMac").val(macAddress);
    	$scope.doInspect();
    });
	
	$scope.showContactedDetail = function(event, peopleContacted, fromTime, toTime, sectionId) {
		if(peopleContacted === 0) {
			return;
		}
		var url = BASE_URL + 'getListPeople?fromTime=' + fromTime + '&toTime=' + toTime
							+ '&sectionId=' + sectionId;
		$http.get(url).then(function(response) {
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
			var data = response.data;
			var index = 0;
			for(var i in data) {
				index++;
				var macAddress = data[i].macAddress;
				if(macAddress === inspectMacAddress) {
					index -= 1;
					continue;
				}
				var encodedMac = window.btoa(macAddress);
				var showedMac = (macAddress.length > 20) ? (macAddress.slice(0, 20) + "...") : macAddress;
				content += '<tr>';
				content += '<td>' + (parseInt(index)) + '</td>';
				content += '<td><a class="a inspectMac" title="Inspect this people" id="mac_'+macAddress+'">' + showedMac + '</a></td>';
				content += '</tr>';
			}
			content += '</tbody>';
			content += '</table>';
			//show the popup
			$('#detail-popup').html(content);
			$('#detail-popup').css('top', event.pageY);
			$('#detail-popup').css('left', screen.width/2);
			$('#detail-popup').fadeIn('fast');
		});
	};
	
	$('html').click(function() {
		//Hide the detail popup
		$('#detail-popup').fadeOut('fast');
	});

	$('#graph-popup').click(function(event){
		//stop propagation
	    event.stopPropagation();
	});
	
	function dateFormat(dateValue, format) {
		var d = moment(dateValue);
		return d.format(format);
	};
	
	$scope.exportPeopleContacted = function(level) {
		//prepare the param
		var inspectList = $scope.inspectList;
		var paramList = ""; //create paramList to request server
		for(var i in inspectList) {
			paramList += inspectList[i].fromTime + ","
						+ inspectList[i].toTime + ","
						+ inspectList[i].sectionId + ",";
		}
		//remove last separate char
		paramList = paramList.slice(0, paramList.length - 1);
		if(paramList.length === 0) return;
		//set form attribute to submit
		var form = document.getElementById("frmExportPeopleContacted");
		form.action = BASE_URL + "exportPeopleContacted";
		$("#paramList").val(paramList);
		$("#inspectMac").val(inspectMacAddress);
		$("#level").val(level);
		$("#hiddenFromTime").val(inspectFromTime);
		$("#hiddenToTime").val(inspectToTime);
		//submit form
		form.submit();
	}
	
	$scope.showGraphPeopleContacted = function(level) {
		//prepare the param
		var inspectList = $scope.inspectList;
		var paramList = ""; //create paramList to request server
		for(var i in inspectList) {
			paramList += inspectList[i].fromTime + ","
						+ inspectList[i].toTime + ","
						+ inspectList[i].sectionId + ",";
		}
		//remove last separate char
		paramList = paramList.slice(0, paramList.length - 1);
		if(paramList.length === 0) return;
		//set param
		var param = "paramList=" + paramList 
					+ "&inspectMac=" + inspectMacAddress
					+ "&level=" + level
					+ "&fromTime=" + inspectFromTime
					+ "&toTime=" + inspectToTime
					+ "&isExport=0";
		//show popup
		var width = 700,
	    height = 500;
		$('#graph-popup').css('top', '50px');
		$('#graph-popup').css('left', screen.width/5);
		$('#graph-popup').css('width', width*1.1);
		$('#graph-popup').css('height', height*1.2);
		$('#graph-popup').fadeIn('fast');
		
		d3.select("#popupSvg").remove();
		var svg = d3.select("#svg").append("svg")
			.attr("id", "popupSvg")
		    .attr("width", width)
		    .attr("height", height)
		    .append("g")
		    .call(d3.behavior.zoom().on("zoom", function () {
		        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
		    }))
		    .append("g");
		var image = svg
	        .append("svg:image")
	        .attr("id", "loadingImg")
	        .attr("xlink:href", "../images/loading.gif")
	        .attr("x", width/3+50)
	        .attr("y", height/3)
	        .attr("width", 100)
	        .attr("height", 100);
		//data
		var nodes = [];
		var links = [];
		//post request
		$http({
		    method: 'POST',
		    url: BASE_URL + 'exportPeopleContacted',
		    data: param,
		    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).then(function(response) {
			var data = response.data;
			//add to nodes and links
			nodes.push({"name":inspectMacAddress, "level":0, "fromTime":0, "toTime":0});
			var mapMacLevel1 = {};
			for(var i in data) {
				nodes.push({"name": data[i].contactedMac, "level": data[i].level,"fromTime":data[i].fromTime, "toTime": data[i].toTime});
				var level = data[i].level;
				var contactedMac = data[i].contactedMac;
				var inspectMac = data[i].inspectMac;
				if(level === 1) {
					links.push({"source":0,"target":parseInt(i) + 1,"level":level,"fromTime":data[i].fromTime});
					mapMacLevel1[contactedMac] = parseInt(i) + 1;
				}
				else {
					links.push({"source":mapMacLevel1[inspectMac],"target":parseInt(i) + 1, "level":level});
				}
			}
			//show graph
			d3.select("#loadingImg").remove();
			var force = d3.layout.force()
			    .charge(-120)
			    .linkDistance(width/3)
			    .size([width, height]);
			force
		      .nodes(nodes)
		      .links(links)
		      .start();
			var link = svg.selectAll(".link")
		      .data(links).enter()
		      .append("g")
		      .attr("class", "link")
		      .append("line")
		      .style("stroke-width", function(d) { 
		    	  if(d.level === 1) return 2
		    	  else return 1;
	    	   });
			var linkText = svg.selectAll(".link");
			if(level === 1) {
				// Append text to Link edges
				linkText = linkText
				    .append("text")
				    .attr("font-family", "Arial, Helvetica, sans-serif")
				    .attr("x", function(d) {
				        if (d.target.x > d.source.x) {
				            return (d.source.x + (d.target.x - d.source.x)/2); }
				        else {
				            return (d.target.x + (d.source.x - d.target.x)/2); }
				    })
				    .attr("y", function(d) {
				        if (d.target.y > d.source.y) {
				            return (d.source.y + (d.target.y - d.source.y)/2); }
				        else {
				            return (d.target.y + (d.source.y - d.target.y)/2); }
				    })
				    .attr("fill", "black")
				    .style("font", "normal 12px Arial")
				    .attr("dy", ".35em")
				    .attr("text-anchor", "middle")
				    .text(function(d) { return dateFormat(d.fromTime, "MM/DD"); });
			}
			var node = svg.selectAll(".node")
		      .data(nodes)
		      .enter().append("circle")
		      .attr("class", "node")
		      .attr("r", function(d) {
		    	  if(d.level === 0) return 15
		    	  else if(d.level === 1) return 10
		    	  else return 5;
		      })
		      .style("fill", function(d) { 
		    	  if(d.level === 0) return "red"
		    	  else if(d.level === 1) return "orange"
		    	  else return "blue";
	    	  })
		      .call(force.drag);
			
			node.append("title")
		      .text(function(d) { 
		    	  if(d.name === inspectMacAddress) {
		    		  return "Inspect MAC: " + d.name;
    		  	  }
		    	  else {
		    		  var content = "MAC address: " + d.name;
		    		  content += "\nContact Time:";
		    		  content += "\nFrom: " + dateFormat(d.fromTime, timeFormat);
		    		  content += "\nTo       : " + dateFormat(d.toTime, timeFormat);
		    		  return content;
		    	  }
	    	  });
			
			force.on("tick", function() {
			    link.attr("x1", function(d) { return d.source.x; })
			        .attr("y1", function(d) { return d.source.y; })
			        .attr("x2", function(d) { return d.target.x; })
			        .attr("y2", function(d) { return d.target.y; });

			    node.attr("cx", function(d) { return d.x; })
			        .attr("cy", function(d) { return d.y; });
			    if(level === 1) {
				    linkText
				        .attr("x", function(d) {
				            return ((d.source.x + d.target.x)/2);
				        })
				        .attr("y", function(d) {
				            return ((d.source.y + d.target.y)/2);
				        });
			    }
			});
			
		});
	}
	
	$scope.closePopup = function() {
		$('#graph-popup').fadeOut('fast');
	}
	
	//init
	init();
	$('#datetimepicker1, #datetimepicker2').datetimepicker({
		format: 'YYYY-MM-DD HH:mm:ss'
	});
});


