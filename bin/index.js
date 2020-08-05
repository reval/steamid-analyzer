#!/usr/bin/env node

const dateArithmetic = require("date-arithmetic");
const yargs = require("yargs");
const axios = require("axios");
const fs = require("fs");
const clipboardy = require("clipboardy");
const pad = require("pad");
const SteamID = require("steamid");
const parseString = require("xml2js").parseString;
const Tail = require('tail').Tail;

const options = yargs
	.usage("Usage: Copy Steam2 IDs to clipboard and run.")
	.option("i", { alias: "info", describe: "Display all known cheaters." })
	.option("t", { alias: "tail", describe: "Tail log file for live scanning." })
	.argv;

const PROFILES_URL = 'http://steamcommunity.com/profiles/';
const XML_FLAG = '/?xml=1';
const CHEATERS_JSON_PATH = 'data/cheaters.json';
const STEAMID_TO_DATES_JSON_PATH = 'data/dates.json';
const CSGO_LOG_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\csgo\\conlog.log'; // file in same dir for dev.

var cheaterSteamIDs = [];
var steamIDDates = {};
var inputSteamIDs = '';
var foundSteam2IDs = [];
var foundCheaterSteam2IDs = [];
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
var privateAndNewAccountCount = 0;
var cheatersFoundCount = 0;

let cheatersRawData = fs.readFileSync(CHEATERS_JSON_PATH);
cheaterSteamIDs = JSON.parse(cheatersRawData);

let datesRawData = fs.readFileSync(STEAMID_TO_DATES_JSON_PATH);
steamIDDates = JSON.parse(datesRawData);

console.log(`Loaded ${cheaterSteamIDs.length} cheaters from ${CHEATERS_JSON_PATH}`);
console.log(`Loaded ${Object.keys(steamIDDates).length} dates for private account date checking from ${STEAMID_TO_DATES_JSON_PATH}`);
console.log("\n");
if (options.i) {
	for (let steamID of cheaterSteamIDs)
		displayAccountInfo(steamID);
} else if (options.t) {
	console.log('Tailing log file located at: '+CSGO_LOG_PATH);
	tailLogFile();
} else {
	inputSteamIDs = clipboardy.readSync();
	filterAndDisplayInputSteamIDs();
}

function tailLogFile () {
	tail = new Tail(CSGO_LOG_PATH);
 
	tail.on("line", function(data) {
		console.log(data);
		filterAndDisplayKnownCheaterSteam2IDs(data);
	});
 
	tail.on("error", function(error) {
  		console.log('Tail ERROR: ', error);
	});
}

function filterAndDisplayKnownCheaterSteam2IDs (data) {
	var steam2IDRegex = /STEAM_[0-5]:[0-1]:([0-9]+)/g; // Same pattern as in SteamID
	let foundSteam2IDsFromLogLine = data.match(steam2IDRegex);

	// Collect Steam2IDs into foundSteam2IDs and trigger cheater check when #end is seen.
	if (foundSteam2IDsFromLogLine) {
		foundSteam2IDs.push(...foundSteam2IDsFromLogLine);
	}

	let logEndFlagRegex = /^#end$/;
	let foundEndFlag = data.match(logEndFlagRegex);

	// Can add some other checks to trigger once per game. Currently triggers every 'status', which is every tab press.
	if (foundEndFlag) {
		console.log(foundSteam2IDs);
		for (let foundSteam2ID of foundSteam2IDs) {
			if (cheaterSteamIDs.includes(foundSteam2ID)) {
				foundCheaterSteam2IDs.push(foundSteam2ID);
			}
		}

		if (foundCheaterSteam2IDs.length > 0) {a
			console.log('\n'+`${foundCheaterSteam2IDs.length} cheater(s) found in your game.`)
			for (let steam2ID of foundCheaterSteam2IDs)
	 			displayAccountInfo(steam2ID);
		} else {
			foundSteam2IDs = []; // Didn't find any cheaters this this turn, proceed to clear cache and prepare for next collection.
		}
	}
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
		'2-3: '+twoToThreeExclusive+'    '+'PRIV & NEW: '+privateAndNewAccountCount+'\n'+
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

					if (accountAge < 1 && isPrivate)
						privateAndNewAccountCount++;
				
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

			if (!options.t) { // only when not using log tailing (-t)
				// Display the stats in the end when showing all cheaters (-i) or when processing of all accounts has finished (clipboard, -g).
				if (((requestCount == cheaterSteamIDs.length) && options.i) || (requestCount == foundSteam2IDs.length)) {
					console.log('\n');
					displayStats();
				}
			}

			// Empty Steam2ID cache storage and requestCount used in -t mode to prepare for next fetch.
			if (options.t && (requestCount == foundCheaterSteam2IDs.length)) {
				foundSteam2IDs = [];
				foundCheaterSteam2IDs = [];
				requestCount = 0;
			}
		}
	);
}