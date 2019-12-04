#!/usr/bin/env node

const dateArithmetic = require("date-arithmetic");
const yargs = require("yargs");
const axios = require("axios");
const fs = require("fs");
const clipboardy = require("clipboardy");
const pad = require("pad");
const SteamID = require("steamid");
const parseString = require("xml2js").parseString;

const options = yargs
	.usage("Usage: Copy Steam2 IDs to clipboard and run.")
	.option("g", { alias: "game", describe: "Check Steam2 IDs from game.txt file." })
	.option("i", { alias: "info", describe: "Read and display Steam2 IDs cheaters.txt" })
	.option("s", { alias: "steamids", describe: "Display relevant info about a Steam2 ID(s)", type: "string"})
	.argv;

const PROFILES_URL = 'http://steamcommunity.com/profiles/';
const XML_FLAG = '/?xml=1';
const CHEATERS_JSON_URL = 'https://api.myjson.com/bins/ka6z8?pretty=1';
const STEAMID_TO_DATES_JSON_URL = 'https://api.myjson.com/bins/sm9g4?pretty=1';

var cheaterSteamIDs = [];
var steamIDDates = {};
var inputSteamIDs = '';
var foundSteam2IDs = [];
var requestCount = 0;

// Stats collecting
var lessThanOne = 0;
var oneToTwoExclusive = 0;
var twoToThreeExclusive = 0;
var threeToFourExclusive = 0;
var fourToFiveExclusive = 0;
var fiveToTenExclusive = 0;
var moreThanTen = 0;
var vacBannedCount = 0;
var privateAccountCount = 0;
var cheatersFoundCount = 0;

function getCheaterJSONURL() {
	return axios.get(CHEATERS_JSON_URL);
}
   
function getSteamIDToDatesJSONURL() {
	return axios.get(STEAMID_TO_DATES_JSON_URL);
}

( async () => {
	
	axios.all([getCheaterJSONURL(), getSteamIDToDatesJSONURL()])
		.then(axios.spread(function (cheaters, steamIDsToDates) {
			cheaterSteamIDs = cheaters.data;
			steamIDDates = steamIDsToDates.data;

			console.log(`Loaded ${cheaterSteamIDs.length} cheaters from ${CHEATERS_JSON_URL}`);
			console.log(`Loaded ${Object.keys(steamIDDates).length} dates for private account date checking from ${STEAMID_TO_DATES_JSON_URL}`);
			console.log("\n");
			if (options.g) {
				readGameTXT();
				filterAndDisplayInputSteamIDs();
			} else if (options.i) {
				for (let steamID of cheaterSteamIDs)
					displayAccountInfo(steamID);
			} else if (options.s) {
				inputSteamIDs = options.steamids;
				console.log(inputSteamIDs);
				filterAndDisplayInputSteamIDs();
			} else {
				inputSteamIDs = clipboardy.readSync();
				filterAndDisplayInputSteamIDs();
			}
		}))
		.catch(function (error) {
			console.log(`Initial data load failed: ${error}`);
		});
})()

function readGameTXT () {
	var data = fs.readFileSync('game.txt', 'utf-8')
	inputSteamIDs = data;
}

function filterAndDisplayInputSteamIDs () {
	var steam2IDRegex = /STEAM_[0-5]:[0-1]:([0-9]+)/g; // Same pattern as in SteamID
	foundSteam2IDs = inputSteamIDs.match(steam2IDRegex);
	
	if (foundSteam2IDs) {
		for (let steam2ID of foundSteam2IDs)
			displayAccountInfo(steam2ID);
	} else {
		console.log('No Steam2 IDs found.')
	}
}

function displayStats () {
	console.log(
		'Known Cheaters: '+cheaterSteamIDs.length+'\n'+
		'Cheaters Found: '+cheatersFoundCount+'\n'+
		'Accounts Processed: '+requestCount+'\n'+
		'0-1: '+lessThanOne+'    '+'VAC: '+vacBannedCount+'\n'+
		'1-2: '+oneToTwoExclusive+'    '+'PRIV: '+privateAccountCount+'\n'+
		'2-3: '+twoToThreeExclusive+'\n'+
		'3-4: '+threeToFourExclusive+'\n'+
		'4-5: '+fourToFiveExclusive+'\n'+
		'5-10: '+fiveToTenExclusive+'\n'+
		'10+: '+moreThanTen
	);
}

function findClosestDate (sid) {
	var unknownSteamID64Cut = parseInt(sid.getSteamID64().substr(7), 10);
	var lowestSteamIDDiff = undefined;
	var lowestSteamID = undefined;
	var knownSteamIDs = Object.keys(steamIDDates);

	for (let knownSteamID of knownSteamIDs) {
		var currentSteamID64Cut = parseInt(knownSteamID.substr(7), 10);
		var currentSteamIDDiff = Math.abs(currentSteamID64Cut - unknownSteamID64Cut);
		
		// Init first run vars
		if (lowestSteamIDDiff == undefined && lowestSteamID == undefined) {
			lowestSteamIDDiff = currentSteamIDDiff;
			lowestSteamID = knownSteamID;
		}
		
		if (currentSteamIDDiff < lowestSteamIDDiff) {
			lowestSteamIDDiff = currentSteamIDDiff;
			lowestSteamID = knownSteamID;
		}
	}
	
	return steamIDDates[lowestSteamID];
}

function isYearPresentInDateString(dateString) {
	let yearRegex = /\d{4}$/;
	let foundYear = dateString.match(yearRegex);

	if (foundYear)
		return true;
	else
		return false;
}

function addYearToDateIfMissing (dateString) {
	if (!isYearPresentInDateString(dateString)) {
		let currentDate = new Date();
		dateString = dateString + ', ' + currentDate.getFullYear();
	}

	return dateString;
}

function calculateAccountAgeInYears(memberSince) {
	var currentDate = new Date();
	var accountDate = new Date(memberSince);
	
	if (!isYearPresentInDateString(memberSince))
		accountDate.setFullYear(currentDate.getFullYear());
	
	var accountAge = dateArithmetic.diff(accountDate, currentDate, "year", 1);

	return accountAge.toFixed(2);
}

function recordAccountAgeStats(accountAge) {
	if (accountAge < 1) {
		lessThanOne++;
	}
	else if (accountAge >= 1 && accountAge < 2) {
		oneToTwoExclusive++;
	}
	else if (accountAge >= 2 && accountAge < 3) {
		twoToThreeExclusive++;
	}
	else if (accountAge >= 3 && accountAge < 4) {
		threeToFourExclusive++;
	}
	else if (accountAge >= 4 && accountAge < 5) {
		fourToFiveExclusive++;
	}
	else if (accountAge >= 5 && accountAge < 10) {
		fiveToTenExclusive++;
	}
	else if (accountAge >= 10) {
		moreThanTen++;
	}
}

function displayAccountInfo (steam2ID) {
	var sid = new SteamID(steam2ID);
	var sidURL = PROFILES_URL+sid.getSteamID64();
	var sidURLXML = sidURL+XML_FLAG;
	
	axios.get(sidURLXML)
		.then(res => {
			parseString(res.data, function (err, result) {
				if (err) {
					console.log(`Error parsing XML from ${sidURLXML}. Error: ${err}`);
				} else {
					var vacBanned = parseInt(result.profile.vacBanned[0], 10);
					var steamNickname = result.profile.steamID[0].trim();
					
					var memberSince = undefined;
					var accountAge = undefined;
					var isPrivate = '';
					
					if (result.profile.memberSince) {
						memberSince = addYearToDateIfMissing(result.profile.memberSince[0]);
					}
					else {
						memberSince = findClosestDate(sid);
						isPrivate = 'PRIV';
						privateAccountCount++;
					}
					
					var vacBannedString = '';
					if (vacBanned) {
						vacBannedString = 'VAC';
						vacBannedCount++;
					}

					accountAge = calculateAccountAgeInYears(memberSince);
					recordAccountAgeStats(accountAge);

					var isNew = '';
					if (accountAge < 1)
						isNew = 'NEW';
					
					var isCheater = '';
					if (cheaterSteamIDs.includes(steam2ID)) {
						isCheater = 'CHEATER';
						cheatersFoundCount++;
					}
					console.log(pad(vacBannedString, 3)+' || '+pad(isPrivate, 4)+' || '+pad(isNew, 3)+' || ' + pad(steamNickname.trim().substr(0, 19), 25) + pad(steam2ID, 20) + ' || ' + pad(accountAge, 5) + ' / '+ pad(memberSince, 20) + ' || ' + sidURL + ' || ' + isCheater);
				}
			});
		})
		.catch(function (error) {
			//Sometimes errors because URL with steamID4/?xml=1 doesnt work. CustomURL/?xml=1 works.
			console.log('ERROR: '+steam2ID + ' || ' + sidURLXML);
			console.log(error);
		})
		.finally(function () {
			requestCount++;

			// Display the stats in the end when showing all cheaters (-i) or when processing of all accounts has finished (clipboard, -g).
			if (((requestCount == cheaterSteamIDs.length) && options.i) || (requestCount == foundSteam2IDs.length)) {
				console.log('\n');
				displayStats();
			} 
		}
	);
}