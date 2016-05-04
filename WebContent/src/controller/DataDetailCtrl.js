var datavisual = angular.module('datavisual', ['ui.bootstrap', 'ngAnimate', 'ajoslin.promise-tracker', 'cgBusy']);

datavisual.controller('DataDetailCtrl', function($scope, $http) {
	var BASE_URL = "http://147.47.206.15:8680/";
	//local variants
	$scope.radioTime = "Month";
	$scope.year = 2014; //default
	$scope.month = 1; //default
	$scope.selectedProvince = "";
	$scope.selectedSector = "";
	$scope.colZoom = "col-md-6";
	$scope.colZoomState = 0; //no zoom
	
	$(".slider").slider({
		max : 2014,
		min : 2000,
		range : false,
		value : $scope.year
	}).slider("pips", {
		rest : "label"
	})
	.on("slidechange", function(e,ui) {
        $scope.year = ui.value;
        
        //update chart data
        $scope.updateChartData();
        $scope.updateGeoMap();
        $scope.selectedProvince = "";
    });
	
	var monthInKorean = ["1 월", "2 월", "3 월", "4 월", "5 월", "6 월", "7 월", "8 월", "9 월", "10 월", "11 월", "12 월"];
	$(".sliderMonth").slider({
		max : 12,
		min : 1,
		range : false,
		value : $scope.month
	}).slider("pips", {
		rest : "label",
		labels: monthInKorean
	})
	.on("slidechange", function(e,ui) {
        $scope.month = ui.value;
        
        //update chart data
        $scope.updateChartData();
        $scope.updateGeoMap();
        $scope.selectedProvince = "";
    });
	
	$scope.changeTime = function () {
		var time = $scope.radioTime;
		if(time === 'Year') {
			$scope.month = 0; //clear month
		}
		else {
			$scope.month = 1; //default month
		}
		//update chart and map
		$scope.updateChartData();
		$scope.updateGeoMap();
		$scope.selectedProvince = "";
	};
	
	$scope.changeColZoom = function () {
		if($scope.colZoomState === 0) {
			//zoom full screen
			$scope.colZoom = "col-md-12";
			$scope.colZoomState = 1;
			$("#iconChangeZoom").attr('class', "glyphicon glyphicon-resize-small");
		}
		else if($scope.colZoomState === 1) {
			//come back to default zoom
			$scope.colZoom = "col-md-6";
			$scope.colZoomState = 0;
			$("#iconChangeZoom").attr('class', "glyphicon glyphicon-resize-full");
		}
		//resize map
		setTimeout(function() {
			google.maps.event.trigger(map, 'resize');
			map.setCenter({lat: 35.863331, lng: 128.052592});
		}, 100);
		if($scope.colZoomState === 0) {
			//reset map zoom in default size
			map.setZoom(7);
		}
		//update chart
		$scope.updateChartData();
	};
	
	$scope.delay = 0;
	$scope.minDuration = 0;
	$scope.message = 'Please Wait...';
	$scope.backdrop = true;
	$scope.promise1 = null;
	$scope.promise2 = null;
	
	$scope.selectAllSector = function () {
		$scope.selectedSector = "";
		$scope.updateGeoMap();
	}
	
	$scope.updateChartData = function () {
		var pieData = [];
		var sectorList = [];
		var seriesData = [];
		var url = BASE_URL + 'getAllSectorData?year=' + $scope.year + '&month=' + $scope.month;
		//get sector list
		$http.get(BASE_URL + 'getSectorList').then(function(response) {
			var data = response.data;
			var mapSector = {};
			var length = data.length;
			for(var i = 0; i < length; i++) {
				mapSector[data[i].nameInEnglish] = data[i].nameInKorean;
			}
			$scope.promise1 = $http.get(url).then(function(response) {
				var data = response.data;
				var length = data.length;
				for (var i = 0; i < length; i++) {
					var nameInEnglish = data[i].sectorName;
					//get sector Name in Korean
					var nameInKorean = mapSector[nameInEnglish];
					var y = data[i].value;
					pieData.push({"name": nameInKorean, "y": y});
					sectorList.push(nameInKorean);
					seriesData.push(y);
				}

				$('#containerPieChart').highcharts({
		            chart: {
		                plotBackgroundColor: null,
		                plotBorderWidth: null,
		                plotShadow: false,
		                type: 'pie'
		            },
		            title: {
		                text: ''
		            },
		            tooltip: {
		                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
		            },
		            plotOptions: {
		                pie: {
		                    allowPointSelect: true,
		                    cursor: 'pointer',
		                    dataLabels: {
		                        enabled: true,
								format: '<b>{point.name}</b>: {point.percentage:.1f} %',
								style: {
									color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
								}
		                    },
		                    showInLegend: true,
		                    point: {
				                events: {
				                    legendItemClick: function () {
				                    	$scope.selectedSector = this.name;
				                    	$scope.updateGeoMap();
				                        return false; // <== returning false will cancel the default action
				                    },
				                    click: function () {
				                    	$scope.selectedSector = this.name;
				                    	$scope.updateGeoMap();
				                        return false; // <== returning false will cancel the default action
				                    },
				                }
				            }
		                }
		            },
		            series: [{
		                name: 'Percent',
		                colorByPoint: true,
		                data: pieData
		            }]
		        });
				
				$('#containerBarChart').highcharts({
					chart: {
						type: 'column'
					},
					title: {
						text: ''
					},
					xAxis: {
						categories: sectorList,
						crosshair: true
					},
					yAxis: {
						min: 0,
						title: {
							text: 'Number of companies'
						}
					},
					tooltip: {
						enabled: false,
						headerFormat: '<span style="font-size:14px"><b>{point.key}</b></span><table>',
						pointFormat: '<tr><td style="color:{series.color};padding:0; font-size: 12px">{series.name}: </td>' +
							'<td style="padding:0; font-size:12px"><b>{point.y:0f}</b></td></tr>',
						footerFormat: '</table>',
						shared: true,
						useHTML: true
					},
					plotOptions: {
						column: {
							pointPadding: 0.2,
							borderWidth: 0
						},
						series: {
							dataLabels: {
								enabled: true
							}
						}
					},
					series: [{
						name: 'Sector',
						data: seriesData
					}]
				});
			});
		});
		
	};
	
	var map;
	//initialize Map
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 7,
	    center: {lat: 35.863331, lng: 128.052592},
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		disableDefaultUI: true
	});
	//by province
	var arrayPolygonByProvince = [];
	var arrayCircleByProvince = [];
	var arrayLabelMapByProvince = [];
	var mapCircleByProvince = {};
	var mapLabelByProvince = {};
	var mapPolygonLatLonByProvince = {};
	//by city
	var arrayPolygonByCity = [];
	var arrayCircleByCity = [];
	var arrayLabelMapByCity = [];
	//draw data of all provinces on map
	$scope.updateGeoMap = function () {
		//remove all old draw
		removeAllOnMap(arrayPolygonByProvince);
		removeAllOnMap(arrayCircleByProvince);
		removeAllOnMap(arrayLabelMapByProvince);
		mapCircleByProvince = {};
		mapLabelByProvince = {};
		mapPolygonLatLonByProvince = {};
		//remove all draw by city on map
		removeAllOnMap(arrayPolygonByCity);
		removeAllOnMap(arrayCircleByCity);
		removeAllOnMap(arrayLabelMapByCity);
		//get province list
		$http.get(BASE_URL + 'getProvinceList').then(function(response) {
			var data = response.data;
			$scope.provinceList = data;
			var provinceList = $scope.provinceList;
			//get data by all provinces
			var url = BASE_URL + 'getAllSectorDataByProvince?year=' + $scope.year + '&month=' + $scope.month;
			$http.get(url).then(function(response) {
				var data = response.data;
				$scope.dataByProvice = data;
				//get google map coordinates by all provinces
				var url = BASE_URL + 'getGeoDataByProvince';
				$scope.promise2 = $http.get(url).then(function(response) {
					var data = response.data;
					var geoDataLength = data.length;
					//loop by each province in provinceList
					var totalByProvinceArray = [];
					var centerLatLonArray = [];
					var dataByProvinceSeek = 0; //searching position in dataByProvince array
					var geoDataSeek = 0; //searching position in geoData array
					for (var provinceIdx = 0; provinceIdx < provinceList.length; provinceIdx++) {
						var provinceName = provinceList[provinceIdx].provinceNameKor;
						//content to show on circle
						var content = "<b>" + provinceName + "</b>";
						
						//get total data by each province
						var totalByProvince = 0;
						var dataByProvince = $scope.dataByProvice;
						var dataByProvinceLen = dataByProvince.length;
						var isFound = false;
						for(var dataIdx = dataByProvinceSeek; dataIdx < dataByProvinceLen; dataIdx++) {
							dataProvinceName = dataByProvince[dataIdx].provinceName;
							if(provinceName === dataProvinceName) {
								dataByProvinceSeek++; //increase searching position
								isFound = true;
								var value = dataByProvince[dataIdx].value;
								var sectorName = dataByProvince[dataIdx].sectorName;
								//if existed selectedSector -> calculate for selectedSector
								if($scope.selectedSector !== "") {
									if(sectorName === $scope.selectedSector) {
										totalByProvince += value;
										content += "<br>" + sectorName + " : " + value;
									}
								}
								//not existed selectedSector -> calculate all
								else {
									totalByProvince += value;
									content += "<br>" + sectorName + " : " + value;
								}
							}
							else if(isFound) {
								//break the loop because we found all data of this province
								break;
							}
						}
						totalByProvinceArray.push(totalByProvince);
						content += "<br><b>Total: " + totalByProvince + '</b>';
						
						//get polygon coordinate by each province
						var centerLatLon = {};
						var polygonArray = []; //array of polygons
						var polygonLatLon = []; //a polygon
						
						isFound = false;
						for (var i = geoDataSeek; i < geoDataLength; i++) {
							//check with this provinceName only
							var name = data[i].provinceName;
							if(name !== provinceName && isFound) {
								//break the loop because we found all geo data of this province
								break;
							}
							geoDataSeek++; //increase searching position
							isFound = true;
							var lat = data[i].lat;
							var lon = data[i].lon;
							var pointOrder = data[i].pointOrder;
							var subPolygonId = data[i].subPolygonId;
							//get polygon stored in array of polygons
							polygonLatLon = polygonArray[subPolygonId];
							if(polygonLatLon === undefined || polygonLatLon === null) {
								polygonLatLon = []; //initialize the first time
							}
							//add more coordinates
							polygonLatLon.push({"lat": lat, "lng": lon});
							//store again to array of polygons
							polygonArray[subPolygonId] = polygonLatLon;
						}
						//find the longest (with most paths) polygon
						var maxPaths = 0; //number of paths of the longest polygon
						var longestPolygonLatLon = []; //the longest polygon
						var polygonsCount = polygonArray.length;
						for (var polygonArrIdx = 0; polygonArrIdx < polygonsCount; polygonArrIdx++) {
							var polygonLatLon = polygonArray[polygonArrIdx];
							if(polygonLatLon !== undefined) {
								var polygonLen = polygonLatLon.length;
								if(polygonLen >= maxPaths) {
									longestPolygonLatLon = polygonLatLon;
									maxPaths = polygonLen;
								}
							}
						}
						//save longest polygon to an map by provinceName
						mapPolygonLatLonByProvince[provinceName] = longestPolygonLatLon;
						// Construct the polygon
						var polygonsCount = polygonArray.length;
						for (var i = 0; i < polygonsCount; i++) {
							polygonLatLon = polygonArray[i];
							if(polygonLatLon !== undefined && polygonLatLon !== null) {
								var polygon = new google.maps.Polygon({
								    paths: polygonLatLon,
								    strokeColor: '#000000',//'#FF0000',
								    strokeOpacity: 0.0, //0.8
								    strokeWeight: 1.5,
								    fillColor: '#FF0000',
								    fillOpacity: 0.0
								});
								polygon.setMap(map);
								arrayPolygonByProvince.push(polygon);
								addProvinceToPolygon(polygon, provinceName);
							}
						}
						//calculate the center coordinate
						var count = 0;
						var sumLat = 0;
						var sumLon = 0;
						for (var polygonArrIdx = 0; polygonArrIdx < polygonsCount; polygonArrIdx++) {
							polygonLatLon = polygonArray[polygonArrIdx];
							if(polygonLatLon !== undefined) {
								var polygonLen = polygonLatLon.length;
								for (var polygonIdx = 0; polygonIdx < polygonLen; polygonIdx++) {
									sumLat += polygonLatLon[polygonIdx].lat;
									sumLon += polygonLatLon[polygonIdx].lng;
									count++;
								}
							}
						}
						if(count > 0) {
							var centerLatLon = {"lat": sumLat / count, "lng": sumLon / count};
							centerLatLonArray.push(centerLatLon);
						}
						
						//draw a circle
						var radius = Math.sqrt(totalByProvince) * 50;
						if(radius > 10000) radius = 10000; //normalize radius
						var dataCircle = new google.maps.Circle({
						      strokeColor: '#FF0000',
						      strokeOpacity: 0.8,
						      strokeWeight: 2,
						      fillColor: '#FF0000',
						      fillOpacity: 0.35,
						      map: map,
						      center: centerLatLon,
						      radius: radius
					    });
						arrayCircleByProvince.push(dataCircle);
						mapCircleByProvince[provinceName] = dataCircle;
						//add information window to circle
						addInfoToCircle(dataCircle, content);
						//draw text on circle
						var mapLabel = new MapLabel({
							map: map,
							position: new google.maps.LatLng(centerLatLon),
							text: '' + totalByProvince,
							fontSize: 13,
							fontColor: '#FFFFFF',
							strokeColor: '#000000',
							maxZoom: 20,
							minZoom: 6
						});
						arrayLabelMapByProvince.push(mapLabel);
						mapLabelByProvince[provinceName] = mapLabel;
					}
					
				});
			});
		});
	};
	
	addInfoToCircle = function(dataCircle, content) {
		var infoWindow = new google.maps.InfoWindow({
			content: content
		});
		dataCircle.addListener('click', function(event) {
			infoWindow.setPosition(event.latLng);
			infoWindow.open(dataCircle.get('map'));
		});
	};
	
	addProvinceToPolygon = function(polygon, provinceName) {
		polygon.addListener('click', function(event) {
			//zoom to this polygon
			map.fitBounds(this.getBounds());
			//call function to draw on map
			$scope.selectedProvince = provinceName;
			$scope.updateGeoMapByCity(provinceName);
		});
	};
	
	//show data on map by cities (belong to a province)
	$scope.updateGeoMapByCity = function (provinceName) {
		//remove all draw by city on map
		removeAllOnMap(arrayPolygonByCity);
		removeAllOnMap(arrayCircleByCity);
		removeAllOnMap(arrayLabelMapByCity);
		//get province list
		if(provinceName === undefined) {
			provinceName = $scope.selectedProvince;
			if(provinceName === "") {
				//update by province
				$scope.updateGeoMap();
				return;
			}
		}
		//show data circle and data label of all provinces
		var circleByProvinceLength = arrayCircleByProvince.length;
		for(var i = 0; i < circleByProvinceLength; i++) {
			var dataCircle = arrayCircleByProvince[i];
			if(dataCircle !== undefined)
				dataCircle.setMap(map);
		}
		var labelMapByProvinceLength = arrayLabelMapByProvince.length;
		for(var i = 0; i < labelMapByProvinceLength; i++) {
			var labelMap = arrayLabelMapByProvince[i];
			if(labelMap !== undefined)
				labelMap.setMap(map);
		}
		//hide data circle and data label of this province
		var dataCircle = mapCircleByProvince[provinceName];
		if(dataCircle !== undefined) {
			dataCircle.setMap(null);
		}
		var labelMap = mapLabelByProvince[provinceName];
		if(labelMap !== undefined) {
			labelMap.setMap(null);
		}
		//move map to selectedProvince, by binding map to longest polygon
		var longestPolygonLatLon = mapPolygonLatLonByProvince[provinceName];
		if(longestPolygonLatLon !== undefined) {
			//construct the polygon
			var polygon = new google.maps.Polygon({
			    paths: longestPolygonLatLon,
			    strokeColor: '#000000',//'#FF0000',
			    strokeOpacity: 0.0, //0.8
			    strokeWeight: 1.5,
			    fillColor: '#FF0000',
			    fillOpacity: 0.0
			});
			arrayPolygonByCity.push(polygon);
			map.fitBounds(polygon.getBounds());
		}
		
		//get city list
		$http.get(BASE_URL + 'getCityList?provinceName=' + provinceName).then(function(response) {
			var data = response.data;
			var cityList = data;
			//get data by all cities
			var url = BASE_URL + 'getAllSectorDataByCity?'
				 + 'provinceName=' + provinceName + '&year=' + $scope.year + '&month=' + $scope.month;
			$http.get(url).then(function(response) {
				var data = response.data;
				$scope.dataByCity = data;
				//get google map coordinates by all cities
				var url = BASE_URL + 'getGeoDataByCity?provinceName=' + provinceName;
				$scope.promise2 = $http.get(url)
					.then(function(response) {
						var data = response.data;
						var geoDataLength = data.length;
						//loop by each city in cityList
						var totalByCityArray = [];
						var centerLatLonArray = [];
						var dataByCitySeek = 0; //searching position in dataByCity array
						var geoDataSeek = 0; //searching position in geoData array
						for (var cityIdx = 0; cityIdx < cityList.length; cityIdx++) {
							var cityName = cityList[cityIdx].cityNameKor;
							//content to show on circle
							var content = "<b>" + cityName + "</b>";
							
							//get total data by each city
							var totalByCity = 0;
							var dataByCity = $scope.dataByCity;
							var dataByCityLen = dataByCity.length;
							var isFound = false;
							for(var dataIdx = dataByCitySeek; dataIdx < dataByCityLen; dataIdx++) {
								dataCityName = dataByCity[dataIdx].cityName;
								if(cityName === dataCityName) {
									dataByCitySeek++; //increase searching position
									isFound = true;
									var value = dataByCity[dataIdx].value;
									var sectorName = dataByCity[dataIdx].sectorName;
									//if existed selectedSector -> calculate for selectedSector
									if($scope.selectedSector !== "") {
										if(sectorName === $scope.selectedSector) {
											totalByCity += value;
											content += "<br>" + sectorName + " : " + value;
										}
									}
									//not existed selectedSector -> calculate all
									else {
										totalByCity += value;
										content += "<br>" + sectorName + " : " + value;
									}
								}
								else if(isFound) {
									//break the loop because we found all data of this city
									break;
								}
							}
							totalByCityArray.push(totalByCity);
							content += "<br><b>Total: " + totalByCity + '</b>';
							
							//get polygon coordinate by each city
							var centerLatLon = {};
							var polygonArray = []; //array of polygons
							var polygonLatLon = []; //a polygon
							
							isFound = false;
							for (var i = geoDataSeek; i < geoDataLength; i++) {
								//check with this cityName only
								var name = data[i].cityName;
								if(name !== cityName && isFound) {
									//break the loop because we found all geo data of this province
									break;
								}
								geoDataSeek++; //increase searching position
								isFound = true;
								var lat = data[i].lat;
								var lon = data[i].lon;
								var pointOrder = data[i].pointOrder;
								var subPolygonId = data[i].subPolygonId;
								//get polygon stored in array of polygons
								polygonLatLon = polygonArray[subPolygonId];
								if(polygonLatLon === undefined || polygonLatLon === null) {
									polygonLatLon = []; //initialize the first time
								}
								//add more coordinates
								polygonLatLon.push({"lat": lat, "lng": lon});
								//store again to array of polygons
								polygonArray[subPolygonId] = polygonLatLon;
							}
							// Construct the polygon
							var polygonsCount = polygonArray.length;
							for (var i = 0; i < polygonsCount; i++) {
								polygonLatLon = polygonArray[i];
								if(polygonLatLon !== undefined && polygonLatLon !== null) {
									var polygon = new google.maps.Polygon({
									    paths: polygonLatLon,
									    strokeColor: '#000000',//'#FF0000',
									    strokeOpacity: 0.8,
									    strokeWeight: 1.5,
									    fillColor: '#FF0000',
									    fillOpacity: 0.0
									});
									polygon.setMap(map);
									arrayPolygonByCity.push(polygon);
								}
							}
							//calculate the center coordinate
							var count = 0;
							var sumLat = 0;
							var sumLon = 0;
							var polygonsCount = polygonArray.length;
							for (var polygonArrIdx = 0; polygonArrIdx < polygonsCount; polygonArrIdx++) {
								polygonLatLon = polygonArray[polygonArrIdx];
								if(polygonLatLon !== undefined) {
									var polygonLen = polygonLatLon.length;
									for (var polygonIdx = 0; polygonIdx < polygonLen; polygonIdx++) {
										sumLat += polygonLatLon[polygonIdx].lat;
										sumLon += polygonLatLon[polygonIdx].lng;
										count++;
									}
								}
							}
							if(count > 0) {
								var centerLatLon = {"lat": sumLat / count, "lng": sumLon / count};
								centerLatLonArray.push(centerLatLon);
							}
							
							//draw a circle
							var radius = Math.sqrt(totalByCity) * 10;
							if(radius > 1000) radius = 1000;
							var dataCircle = new google.maps.Circle({
							      strokeColor: '#FF0000',
							      strokeOpacity: 0.8,
							      strokeWeight: 2,
							      fillColor: '#FF0000',
							      fillOpacity: 0.35,
							      map: map,
							      center: centerLatLon,
							      radius: radius
						    });
							arrayCircleByCity.push(dataCircle);
							//add information window to circle
							addInfoToCircle(dataCircle, content);
							//draw text on circle
							var mapLabel = new MapLabel({
								map: map,
								position: new google.maps.LatLng(centerLatLon),
								text: '' + totalByCity,
								fontSize: 11,
								fontColor: '#000000',
								strokeWeight: 1,
								strokeColor: '#000000',
								maxZoom: 20,
								minZoom: 6
							});
							arrayLabelMapByCity.push(mapLabel);
						}
						
					});
				});
		});
	};
	
	function removeAllOnMap(arrayObjectsOnMap) {
		var length = arrayObjectsOnMap.length;
		for(var i = 0; i < length; i++) {
			if(arrayObjectsOnMap[i] !== undefined) {
				arrayObjectsOnMap[i].setMap(null);
			}
		}
		arrayObjectsOnMap.length = 0; //clear
	}
	
	//run
	$scope.updateChartData();
	$scope.updateGeoMap();
});