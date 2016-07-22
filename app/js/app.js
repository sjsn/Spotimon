"use strict";

// Initiates an angular app
var app = angular.module("Spotimon", ["ngAnimate","ngTouch", "ui.router"]);

// Creates unique URLs for different parts of the app
app.config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {

	$stateProvider
	// Redirects to the home page
	.state("home", {
		url: "/home",
		templateUrl: "partials/home.html",
		controller: "HomeCtrl"
	})
	// Redirects to the game page
	.state("game", {
		url: "/game/",
		templateUrl: "partials/game.html",
		controller: "GameCtrl"
	});

	// Forces the app to default to the homepage
	$urlRouterProvider.otherwise("/home");

}]);

// Player service that stores their username, which track they've caught, which are left to catch,
// how many tracks they've missed, and how many moves are attack moves they have left 
app.service("player", function() {

	var data = {name: null, caught: [], uncaught: [], missed: [], moves: 0};

	return {
		name: function() {
			return data.name;
		},
		caught: function() {
			return data.caught;
		},
		uncaught: function() {
			return data.uncaught;
		},
		missed: function() {
			return data.missed;
		},
		moves: function() {
			return data.moves;
		},
		addName: function(name) {
			data.name = name;
		},
		addCaught: function(track) {
			data.caught.push(track);
		},
		addUncaught: function(tracks) {
			data.uncaught = tracks;
		},
		addMissed: function(track) {
			data.missed.push(track);
		},
		setMoves: function(num) {
			data.moves = num;
		},
		clear: function() {
			data = {name: null, caught: [], uncaught: [], missed: [], moves: 0};
		}
	};

});

// Controller for the homepage
app.controller("HomeCtrl", ["$scope", "$interval", "$animate", "player", function($scope, $interval, $animate, player, $stateParams) {

	// Causes a single cloud to pass when the page first loads for style
	$scope.cloudRight = true;
	$scope.startTop = {"top": Math.floor((Math.random() * 60) + 1) + "%"}; // Picks a random cloud start position
	var track = _TRACKS[(Math.floor(Math.random() * 200)) + 1]; // Picks a random song title
	// Only applies song title to cloud if length of song title fits in cloud border
	if (track.length < 20) {		
		$scope.randArtist = track;
	}

	// Creates the "drifting clouds" effect randomly every 1 second
	$interval(function() {
		var rand = Math.floor((Math.random() * 22) + 1);
		var track = _TRACKS[(Math.floor(Math.random() * 200)) + 1];
		if (track.length < 20) {		
			$scope.randArtist = track;
		}
		if (rand  % 11 == 0) {
			if (rand == 22) {
				$scope.flipped = true;
			} else {
				$scope.flipped = false;
			}
			$scope.cloudRight = true;
			$scope.cloudLeft = false;
		} else if (rand % 10 == 0) {
			if (rand == 20) {
				$scope.flipped = true;
			} else {
				$scope.flipped = false;
			}
			$scope.cloudLeft = true;
			$scope.cloudRight = false;
		} else {
			$scope.cloudRight = false;
			$scope.cloudLeft = false;
		}
		$scope.startTop = {"top": Math.floor((Math.random() * 60) + 1) + "%"};
	}, 1000);

	// Creates a user for the game when
	$scope.makeUser = function() {
		player.clear();
		player.addName($scope.userName);
		$interval.cancel();
		// Tracks available for the game to pull data from.
		// Need this since accessing Spotify playlists/popular tracks requires OAuth.
		var allTracks = _.shuffle(_TRACKS);
		var tracks = [];
		for (var i = 0; i < 20; i++) {
			tracks.push(allTracks.pop());
		}
		player.addUncaught(tracks);
	};

	// Toggles the "Information" blurb on and off
	$scope.showInfo = false;
	$scope.toggleInfo = function() {
		$scope.showInfo = !$scope.showInfo;
	};

}]);

// Controller for the game
app.controller("GameCtrl", ["$scope", "$http", "player", "$stateParams", "$timeout", function($scope, $http, player, $stateParams, $timeout) {

	// "Attack" options the user has
	$scope.attacks = [{name: "Artist"}, {name: "Album"}, {name: "Catch"}, {name: "-----"}];
	// "Stats" menu options the user has
	$scope.options = ["Attack", "Catch", "Run", "Journal"];
	// Array of currently uncaught Pokemon which was generated when the player account was created
	var uncaught = player.uncaught();
	// Default opponent object
	$scope.opponent = {name: "", album: {name: "", guessed: false}, artists: [], health: 0, answers: 1};
	// Sets the curent health and progress bars to a default value
	$scope.curHealth = {"width": "100%"};
	$scope.curProgress = {"width": "0%"}
	// Sets the total number of "Spotimon" caught to a default value
	$scope.totalCaught = player.caught().length;
	$scope.totalUncaught = 20;

	// Creates an "opponent" (a track to catch) to be used for current game instance
	$scope.loadNext = function() {
		if (uncaught.length > 0) {
			player.setMoves(5);
			$scope.canGuess = true;
			$scope.movesLeft = 5;
			$scope.opponent.name = uncaught.pop();
			// Gets song and album data from Spotify Web API
			$http.get("https://api.spotify.com/v1/search?type=track&q=" + $scope.opponent.name).then(function(response) {
				var data = response.data;
				var curOpponent = data.tracks.items[0];
				if (curOpponent.album.images[0] == null || curOpponent.album.images[0] == "") {
					$scope.noImage = true;
				} else {
					$scope.noImage = false;
					$scope.opponent.img = curOpponent.album.images[0].url;
				}
				$scope.opponent.album = {name: curOpponent.album.name, guessed: false};
				$scope.opponent.answers = 1;
				$scope.opponent.artists = [{}];
				for (var i = 0; i < curOpponent.artists.length; i++) {
					$scope.opponent.artists.push({name: curOpponent.artists[i].name, guessed: false, num: i});
					$scope.opponent.answers++;
				}
				$scope.opponent.health = $scope.opponent.answers;
				$scope.curHealth = {"width": (($scope.opponent.health / $scope.opponent.answers) * 100) + "%"};
			});
		} else {
			$scope.win = true;
		}
	};	

	$scope.journal = false; // Sets the journals default toggle to off
	// Handles "Menu" clicks, taking in the menu item the user chose
	$scope.toggleMenu = function(choice) {
		if (choice == "Attack" || choice == "Back") {
			$scope.menu = !$scope.menu;
			$scope.attackToggle = false;
			$scope.toggleIncorrect = false;
		} else if (choice == "Run") {
			player.addMissed($scope.opponent);
			$scope.loadNext();
		} else if (choice == "Journal") {
			$scope.journal = !$scope.journal;
			$scope.tracks = player.caught();
		} else if (choice == "Catch") {
			$scope.attemptCatch();
		}
	};

	$scope.attackToggle = false; // Sets the attacks default toggle to off
	$scope.attack = "";
	// Handles "Attack" options and clicks, taking in the type of attack
	$scope.toggleAttack = function(attack) {
		$scope.attackToggle = true;
		var track = $scope.opponent;
		$scope.attackType = attack;
		$scope.guess = "";
		if (attack == "Artist") {
			$scope.buttonText = "Name an artist that contributed to \"" + track.name +"\"";
		} else if (attack == "Album") {
			$scope.buttonText = "Name the album \"" + track.name + "\" was in";
		} else if (attack == "Catch") {
			$scope.attemptCatch();
		}
	};

	// Handles attacks, taking in the type of attack and the guess that the user made
	$scope.attack = function(type, guess) {
		guess = guess.toLowerCase();
		// Check if the guessed artist is the correct answer and if they've been guessed already
		// If pass, decrements the health  and makes the answer unguessable
		if (type == "Artist") {
			var index = -1;
			// Checks if the artist the user guessed is a possible answer (case insensitive)
			for (var i = 1; i < $scope.opponent.artists.length; i++) {
				var artist = $scope.opponent.artists[i].name;
				artist = artist.toLowerCase();
				if (artist == guess) {
					index = i;
				}
			}
			// Answer was correct
			if (index != -1 && !$scope.opponent.artists[index].guessed) {
				$scope.opponent.health--;
				$scope.opponent.artists[index].guessed = true;
				$scope.toggleIncorrect = false;
				$scope.toggleCorrect = true;
				// Turns off statement after 1.5 seconds
				$timeout(function() {
					$scope.toggleCorrect = false;
				}, 1500);
			// Answer was wrong
			} else {
				$scope.toggleIncorrect = true;
				// Turns off statement after 1.5 seconds
				$timeout(function() {
					$scope.toggleIncorrect = false;
				}, 1500);
				$scope.toggleCorrect = false;
			}
		// Check if the guessed album is the correct answer and if it's been guessed already
		// If pass, decrements the health and makes the answer unguessable
		} else if (type == "Album"
			&& $scope.opponent.album.name.toLowerCase() == guess
			&& !$scope.opponent.album.guessed) {

			$scope.opponent.health--;
			$scope.opponent.album.guessed = true;
			$scope.toggleIncorrect = false;
			$scope.toggleCorrect = true;
			// Turns off statement after 1.5 seconds
			$timeout(function() {
				$scope.toggleCorrect = false;
			}, 1500);

		// Answer was wrong
		} else {
			$scope.toggleIncorrect = true;
			// Turns off statement after 1.5 seconds
			$timeout(function() {
				$scope.toggleIncorrect = false;
			}, 1500);
			$scope.toggleCorrect = false;
		}
		player.setMoves(player.moves() - 1);
		$scope.movesLeft = player.moves();
		if (player.moves() == 0) {
			$scope.canGuess = false;
		}
		$scope.guess = ""; // Resets the guess text field to blank
		$scope.curHealth = {"width": (($scope.opponent.health / $scope.opponent.answers) * 100) + "%"};
	};

	// Decides whether the user caught the Spotimon or if it got away
	$scope.attemptCatch = function() {
		// Automatic catch if the health is 0
		if ($scope.opponent.health == 0) {
			$scope.captureSuccess = 1; // Successful capture
			$scope.capture();
		} else {
			// 50% chance to catch initially, gets higher with each answer guessed
			var odds = Math.random() * ($scope.opponent.health / $scope.opponent.answers);
			if (odds <= 0.5) {
				$scope.captureSuccess = 1;
				$scope.capture();
			} else {
				$scope.captureSuccess = 2; // Failed capture
				$scope.loadNext();
			}
		}
		// Displays neutral message after 2 seconds
		$timeout(function() {
			$scope.captureSuccess = 0; // Neutral capture message
		}, 2000);
	};

	// Handles "catch" events, adding track to caught list and bringing up next opponent
	$scope.capture = function() {
		player.addCaught($scope.opponent);
		$scope.totalCaught = player.caught().length;
		$scope.curProgress = {"width": (($scope.totalCaught / $scope.totalUncaught) * 100) + "%"};
		$scope.opponent = {};
		$scope.loadNext();
	};

}]);
