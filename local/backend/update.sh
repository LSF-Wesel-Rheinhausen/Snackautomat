#!/bin/bash
cd /home/js/Snackautomat
git pull
source venv/bin/activate
cd local/backend
python local_api.py &
