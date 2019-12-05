# steamid-analyzer
 Detect CS:GO cheaters using Steam2IDs.

 Usage:
 Run with 'sid'

Arguments:
1. No arguemnts: will look for Steam2IDs from clipboard.
2. -i: Display all known cheaters.
3. -t: Tail log file for live scanning.  Modify CSGO_LOG_PATH for correct log file path. Sound notification when cheater detected.

Additional Setup:
1. MPlayer (command line audio player): Required to play sound notifications on Windows. Used in -t mode.
HOWTO: https://thisdavej.com/node-js-playing-sounds-to-provide-notifications/

2. Enable CS:GO console logging. Used in -t mode.
In your autoexec.cfg add:
con_logfile "conlog.log"

Log will be written here. Point CSGO_LOG_PATH here:
"...\steamapps\common\Counter-Strike Global Offensive\csgo\conlog.log"
