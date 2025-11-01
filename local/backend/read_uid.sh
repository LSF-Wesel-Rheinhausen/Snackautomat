#!/bin/bash
nfc-poll | awk '/UID/ {print $3$4$5$6$7$8$9; exit}'