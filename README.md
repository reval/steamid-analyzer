# steamid-analyzer
Detect CS:GO cheaters using lists of Steam2IDs.
Exposes private account age with ~1-3 month accuracy.

## Usage:
Run with 'sid'

## Arguments:
1. No arguemnts: will look for Steam2IDs from clipboard.
2. -i: Display all known cheaters.
3. -t: Tail log file for live scanning.  Modify CSGO_LOG_PATH for correct log file path. Sound notification when cheater detected.

##### Additional Setup Requirements for -t Mode:
1. MPlayer (command line audio player): Required to play sound notifications on Windows.
HOWTO: https://thisdavej.com/node-js-playing-sounds-to-provide-notifications/

2. Enable CS:GO console logging.
In "...\Program Files\Steam\userdata[your Steam ID]\730\local\cfg\autoexec.cfg" add:
con_logfile "conlog.log"

3. Point CSGO_LOG_PATH here:
"...\steamapps\common\Counter-Strike Global Offensive\csgo\conlog.log"
