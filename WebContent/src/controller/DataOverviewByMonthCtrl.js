var datavisual = angular.module('datavisual', ['ui.bootstrap', 'ngAnimate', 'ajoslin.promise-tracker', 'cgBusy']);

datavisual.controller('DataOverviewByMonthCtrl', function($scope, $http) {
	var BASE_URL = "http://147.47.206.15:8680/";
	$scope.fromYear = sessionStorage.dataOverviewFromYear;
	$scope.toYear = sessionStorage.dataOverviewToYear;
	//clean data
	if($scope.fromYear === undefined || $scope.fromYear === null) {
		$scope.fromYear = 2000;
	}
	if($scope.toYear === undefined || $scope.toYear === null) {
		$scope.toYear = 2000;
	}
	$scope.delay = 0;
	$scope.minDuration = 0;
	$scope.message = 'Please Wait...';
	$scope.backdrop = true;
	$scope.promise = null;
	
	$scope.selectedSector = sessionStorage.dataOverviewSelectedSector;
	$scope.selectedCompareSector = sessionStorage.dataOverviewSelectedCompareSector;
	$scope.mapSelectedCompareSector = {};
	$scope.mapSelectedCompareSector[$scope.selectedCompareSector] = 1;
	
	$scope.mapSectorKorEng = {};
	$http.get(BASE_URL + 'getSectorList').then(function(response) {
		var data = response.data;
		$scope.sectors = data;
		var length = data.length;
		for(var i = 0; i < length; i++) {
			$scope.mapSectorKorEng[data[i].nameInEnglish] = data[i].nameInKorean;
		}
	});
	
	$scope.updateCompareData2 = function () {
		var isExisted = $scope.mapSelectedCompareSector[$scope.selectedCompareSector];
		if(isExisted === 1) {
			return;
		}
		else {
			$scope.mapSelectedCompareSector[$scope.selectedCompareSector] = 1;
		}
		if($scope.selectedCompareSector === $scope.selectedSector) {
			return;
		}
		$scope.seriesCompareData2 = [];
		var url= BASE_URL + 'getSectorData?sectorName=' 
			+ $scope.selectedCompareSector + '&fromYear=' + $scope.fromYear + '&toYear=' + $scope.toYear
			+ '&fromMonth=1&toMonth=12';
		$scope.promise = $http.get(url)
			.then(function(response) {
				var data = response.data;
				var length = data.length;
				for (var i = 0; i < length; i++) {
					var value = data[i].value;
					$scope.seriesCompareData2.push(value);
				}
				//update chart data
				//$scope.updateChartData2();
				if($scope.seriesCompareData2.length > 0) {
					chart.addSeries({
						name : $scope.mapSectorKorEng[$scope.selectedCompareSector],
						data : $scope.seriesCompareData2
					});
				}
			});
	};
	
	var chart;
	$scope.updateChartData2 = function () {
		$scope.selectedCompareSector = "";
		$scope.mapSelectedCompareSector = {};
		$scope.monthList = [];
		$scope.seriesData2 = [];
		var url = BASE_URL + 'getCountryData?fromYear=' + $scope.fromYear + '&toYear=' + $scope.toYear
					+ '&fromMonth=1&toMonth=12';
		if($scope.selectedSector !== '') {
			url= BASE_URL + 'getSectorData?sectorName=' 
				+ $scope.selectedSector + '&fromYear=' + $scope.fromYear + '&toYear=' + $scope.toYear
				+ '&fromMonth=1&toMonth=12';
		}
		$scope.promise = $http.get(url)
			.then(function(response) {
				var data = response.data;
				var length = data.length;
				for (var i = 0; i < length; i++) {
					var month = data[i].month;
					var value = data[i].value;
					$scope.seriesData2.push(value);
					$scope.monthList.push(month + ' 월');
				}

				$('#containerChart2').highcharts({
					chart : {
						type : 'column'
					},
					title : {
						text : '한국 - ' + ($scope.selectedSector === '' ? '모든' : $scope.mapSectorKorEng[$scope.selectedSector])
					},
					subtitle : {
						text : 'From 1/' + $scope.fromYear + ' to 12/' + $scope.toYear,
						style: {
							fontWeight: 'bold'
						}
					},
					xAxis : {
						categories : $scope.monthList,
						crosshair : true
					},
					yAxis : {
						min : 0,
						title : {
							text : 'Number of companies'
						}
					},
					tooltip : {
						enabled : false
					},
					plotOptions : {
						column : {
							pointPadding : 0.2,
							borderWidth : 0
						},
						series : {
							dataLabels : {
								enabled : true
							},
							point : {
								
							}
						}
					}
				});
				chart = $('#containerChart2').highcharts();
				if($scope.seriesData2.length > 0) {
					chart.addSeries({
						name : ($scope.selectedSector === '' ? '모든' : $scope.mapSectorKorEng[$scope.selectedSector]),
						data : $scope.seriesData2
					});
				}
			});
	};
	
	$scope.updateChartData2();
});