#!/bin/bash

USAGE="$(basename $0) [-h] PROFILE_FOLDER

Create two executables files that contains the shortcut to start the extension
with the profile whose folder is PROFILE_FOLDER.
The folder can be tipically be found at '\$HOME/.mozilla/firefox/'.
The two executables files assume the availability of 'web-ext' program

 -h display this help
"

while getopts ':h' option; do
    case "$option" in
        h) echo "$USAGE" >&2
           exit
           ;;
    esac
done

shift $((OPTIND - 1))

PROFILE_FOLDER=$1

echo """
#!/bin/bash
web-ext run --firefox-profile=$PROFILE_FOLDER --keep-profile-changes
""" >> run_extension.sh
chmod +x run_extension.sh

echo """
#!/bin/bash
web-ext run --firefox-profile=$PROFILE_FOLDER
""" >> run_extension_no_persistent.sh
chmod +x run_extension_no_persistent.sh
