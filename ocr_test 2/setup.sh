#!/bin/bash
# One-time setup: creates a self-contained Python virtual environment
# with everything needed to run ocr_test.ipynb.
#
# Prereq (not pip-installable): the tesseract binary itself.
#   Mac:    brew install tesseract
#   Linux:  sudo apt install tesseract-ocr
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh

set -e

python3 -m venv ocr_env
source ocr_env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python3 -m ipykernel install --user --name=ocr_env --display-name "Python (ocr_env)"

echo ""
echo "Setup complete. To run the notebook:"
echo "  source ocr_env/bin/activate"
echo "  jupyter notebook ocr_test.ipynb"
echo ""
echo "In Jupyter, select the 'Python (ocr_env)' kernel if it's not already selected."
